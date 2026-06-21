import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { RazorpayService } from "../../common/razorpay.service.js";
import { computePaymentStatus } from "../../../utils/billingHelpers.js";
import crypto from "crypto";

export const PortalBillingService = {
  getBillingDashboard: async (tenantId) => {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, organizationName: true, status: true, planId: true },
    });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const subscription = await db.subscription.findFirst({
      where: { tenantId, status: "ACTIVE" },
      include: {
        plan: {
          include: { planModules: { include: { module: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!subscription) {
      return {
        tenant: { id: tenant.id, organizationName: tenant.organizationName, status: tenant.status },
        subscription: null,
        plan: null,
        billing: null,
        recentPayments: [],
      };
    }

    let razorpayDetails = null;
    if (subscription.razorpaySubscriptionId) {
      try {
        razorpayDetails = await RazorpayService.getSubscriptionById(
          subscription.razorpaySubscriptionId
        );
      } catch (error) {
        console.error("Error fetching Razorpay details:", error);
      }
    }

    const now = new Date();
    const nextBillingDate = subscription.endDate;
    const daysUntilNextBilling = nextBillingDate
      ? Math.max(0, Math.ceil((new Date(nextBillingDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : null;

    const [recentPayments, paymentStatus] = await Promise.all([
      db.billingHistory.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          invoice: { select: { id: true, invoiceNumber: true, status: true, paidDate: true } },
        },
      }),
      computePaymentStatus({
        tenantId,
        planPrice: subscription.plan.price,
        planType: subscription.plan.type,
        daysUntilNextBilling,
        razorpayDetails,
      }),
    ]);

    return {
      tenant: { id: tenant.id, organizationName: tenant.organizationName, status: tenant.status },
      subscription: {
        id: subscription.id,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        razorpaySubscriptionId: subscription.razorpaySubscriptionId,
      },
      plan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
        price: subscription.plan.price,
        type: subscription.plan.type,
        features: subscription.plan.features,
        modules: subscription.plan.planModules.map((pm) => ({
          id: pm.module.id,
          name: pm.module.name,
        })),
      },
      billing: {
        nextBillingDate,
        daysUntilNextBilling,
        currentCycleStart: subscription.startDate,
        currentCycleEnd: subscription.endDate,
        remainingCount: razorpayDetails?.remaining_count ?? null,
        paidCount: razorpayDetails?.paid_count ?? null,
        totalCount: razorpayDetails?.total_count ?? null,
        isPaymentDue: paymentStatus.isPaymentDue,
        pendingAmount: paymentStatus.pendingAmount,
        paymentDueReason: paymentStatus.paymentDueReason,
        isRenewalApproaching: paymentStatus.isRenewalApproaching,
        renewalReminderText: paymentStatus.renewalReminderText,
      },
      recentPayments,
    };
  },

  createPaymentOrder: async (tenantId) => {
    const subscription = await db.subscription.findFirst({
      where: { tenantId, status: "ACTIVE" },
      include: { plan: true },
    });

    if (!subscription) {
      throw new ApiError(404, "No active subscription found");
    }

    const order = await RazorpayService.createOrder({
      amount: subscription.plan.price,
      currency: "INR",
      receipt: `${tenantId}_${Date.now()}`,
      notes: {
        tenantId,
        subscriptionId: subscription.id,
        planName: subscription.plan.name,
        type: "subscription_payment",
      },
    });

    return {
      orderId: order.id,
      amount: subscription.plan.price,
      currency: order.currency,
      planName: subscription.plan.name,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    };
  },

  verifyAndRecordPayment: async ({ tenantId, razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
    const isValid = RazorpayService.verifyOrderPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValid) {
      throw new ApiError(400, "Invalid payment signature");
    }

    const subscription = await db.subscription.findFirst({
      where: { tenantId, status: "ACTIVE" },
      include: { plan: true },
    });

    if (!subscription) {
      throw new ApiError(404, "No active subscription found");
    }

    const now = new Date();
    const currentEndDate = subscription.endDate ? new Date(subscription.endDate) : null;
    const baseDate = currentEndDate && currentEndDate > now ? currentEndDate : now;
    let newEndDate = new Date(baseDate);
    if (subscription.plan.type === "MONTHLY") {
      newEndDate.setMonth(newEndDate.getMonth() + 1);
    } else if (subscription.plan.type === "YEARLY") {
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);
    } else if (subscription.plan.type === "WEEKLY") {
      newEndDate.setDate(newEndDate.getDate() + 7);
    }

    const newStartDate = currentEndDate && currentEndDate > now ? currentEndDate : now;

    await db.subscription.update({
      where: { id: subscription.id },
      data: {
        startDate: newStartDate,
        endDate: newEndDate,
      },
    });

    const invoiceNumber = `INV-${now.getFullYear()}-${crypto.randomUUID().split("-")[0].toUpperCase()}`;
    const invoice = await db.invoice.create({
      data: {
        tenantId,
        invoiceNumber,
        amount: subscription.plan.price,
        issuedDate: now,
        paidDate: now,
        status: "PAID",
      },
    });

    const billingRecord = await db.billingHistory.create({
      data: {
        tenantId,
        amount: subscription.plan.price,
        description: `Manual payment for ${subscription.plan.name} [${razorpayPaymentId}]`,
        paymentMethod: "Razorpay",
        status: "SUCCESS",
        invoiceId: invoice.id,
      },
    });

    return {
      invoice,
      billingRecord,
      subscription: {
        id: subscription.id,
        startDate: newStartDate,
        endDate: newEndDate,
      },
    };
  },
};
