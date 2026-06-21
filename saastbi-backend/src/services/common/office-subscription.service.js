import db from "../../db/db.js";
import { ApiError } from "../../utils/ApiError.js";
import crypto from "crypto";
import { RazorpayService } from "../common/razorpay.service.js";
import { addCycles, razorpayPlanPeriod, computeBookingEndDate } from "../../utils/officeCycle.js";
import { ensurePayoutAccountActivated } from "../incubation/portal/payout-account.service.js";

function calcPricingBreakdown({ amount, pricing }) {
  const platformFeePercentage = pricing?.platformFeePercentage || 0;
  const gstPercentage = pricing?.gstApplicable ? pricing.gstPercentage || 0 : 0;
  const platformFeeAmount = Math.round((amount * platformFeePercentage) / 100 * 100) / 100;
  const gstAmount = Math.round((amount * gstPercentage) / 100 * 100) / 100;
  const netPayoutAmount = Math.max(0, amount - platformFeeAmount);
  return { platformFeePercentage, gstPercentage, platformFeeAmount, gstAmount, netPayoutAmount };
}

async function ensurePlanForPricing(pricing, officeName) {
  if (pricing.razorpayPlanId) return pricing.razorpayPlanId;
  if (pricing.paymentMode !== "SUBSCRIPTION") return null;
  if (!pricing.billingCycle) {
    throw new ApiError(400, "billingCycle is required to create a subscription plan");
  }
  if (pricing.billingCycle === "CUSTOM") {
    const days = Number(pricing.customCycleDays);
    if (!days || days < 1 || days > 365) {
      throw new ApiError(400, "customCycleDays must be between 1 and 365 for CUSTOM billing cycle");
    }
  }
  let period;
  try {
    period = razorpayPlanPeriod(pricing.billingCycle, pricing.customCycleDays);
  } catch (err) {
    throw new ApiError(400, err.message);
  }
  const plan = await RazorpayService.createPlan({
    planName: `Office: ${officeName} (${pricing.pricingType})`,
    amount: pricing.amount,
    interval: period.period,
    intervalCount: period.interval,
    currency: pricing.currency || "INR",
  });
  await db.officePricing.update({
    where: { id: pricing.id },
    data: { razorpayPlanId: plan.id },
  });
  return plan.id;
}

export const OfficeSubscriptionService = {
  async initiateBookingPayment({ bookingId, startupId }) {
    const booking = await db.officeBooking.findUnique({
      where: { id: bookingId },
      include: {
        office: { select: { id: true, name: true, tenantId: true } },
        pricing: true,
      },
    });
    if (!booking) throw new ApiError(404, "Booking not found");
    if (startupId && booking.startupId !== startupId) {
      throw new ApiError(403, "Not authorized to pay for this booking");
    }
    const pricing = booking.pricing;
    if (!pricing) throw new ApiError(400, "Booking has no pricing attached");
    const tenantId = booking.office.tenantId;
    if (!tenantId) throw new ApiError(400, "Booking is not associated with a tenant payout account");

    const payoutAccount = await ensurePayoutAccountActivated(tenantId);

    const paymentMode = booking.paymentMode || pricing.paymentMode || "ONE_TIME";
    if (paymentMode === "SUBSCRIPTION") {
      return this.createSubscriptionForBooking({ booking, pricing, payoutAccount });
    }
    return this.createOneTimeOrderForBooking({ booking, pricing, payoutAccount });
  },

  async createOneTimeOrderForBooking({ booking, pricing, payoutAccount }) {
    const amount = booking.totalAmount;
    if (!amount || amount <= 0) throw new ApiError(400, "Invalid booking amount");

    const breakdown = calcPricingBreakdown({ amount, pricing });
    const transfers = RazorpayService.buildTransfers({
      amount,
      linkedAccountId: payoutAccount.razorpayLinkedAccountId,
      platformFeePercentage: breakdown.platformFeePercentage,
      currency: booking.currency,
      notes: { bookingId: booking.id, tenantId: booking.office.tenantId },
    });

    const order = await RazorpayService.createOrder({
      amount,
      currency: booking.currency,
      receipt: `office_${booking.id}`,
      notes: {
        bookingId: booking.id,
        tenantId: booking.office.tenantId,
        paymentType: "BOOKING",
      },
      transfers,
    });

    const periodEnd = booking.endDate ||
      (booking.billingCycle && booking.totalDuration
        ? computeBookingEndDate({
            startDate: booking.startDate,
            billingCycle: booking.billingCycle,
            totalDuration: booking.totalDuration,
            customCycleDays: booking.customCycleDays,
          })
        : null);

    const payment = await db.officePayment.create({
      data: {
        bookingId: booking.id,
        officeId: booking.officeId,
        payerType: booking.bookerType,
        payerId: booking.bookerId,
        userId: booking.userId,
        startupId: booking.startupId,
        amount,
        currency: booking.currency,
        paymentType: "BOOKING",
        periodStart: booking.startDate,
        periodEnd,
        gstAmount: breakdown.gstAmount,
        platformFeeAmount: breakdown.platformFeeAmount,
        netPayoutAmount: breakdown.netPayoutAmount,
        razorpayOrderId: order.id,
        status: "PENDING",
        metadata: { razorpayOrder: order, transfers },
      },
    });

    return {
      mode: "ONE_TIME",
      paymentId: payment.id,
      razorpayOrderId: order.id,
      amount: Math.round(amount * 100),
      currency: booking.currency,
      bookingId: booking.id,
      key: process.env.RAZORPAY_KEY_ID,
    };
  },

  async createSubscriptionForBooking({ booking, pricing, payoutAccount }) {
    if (!booking.totalDuration || booking.totalDuration < 1) {
      throw new ApiError(400, "Booking duration is required for subscription");
    }

    const planId = await ensurePlanForPricing(pricing, booking.officeId);

    const cycleAmount = pricing.amount;
    const breakdown = calcPricingBreakdown({ amount: cycleAmount, pricing });
    const transfers = RazorpayService.buildTransfers({
      amount: cycleAmount,
      linkedAccountId: payoutAccount.razorpayLinkedAccountId,
      platformFeePercentage: breakdown.platformFeePercentage,
      currency: booking.currency,
      notes: { bookingId: booking.id, tenantId: booking.office.tenantId },
    });

    const subscription = await RazorpayService.createSubscription({
      planId,
      totalCount: booking.totalDuration,
      customerNotify: true,
      notes: {
        bookingId: booking.id,
        tenantId: booking.office.tenantId,
      },
      transfers,
    });

    const subRow = await db.officeSubscription.upsert({
      where: { bookingId: booking.id },
      create: {
        bookingId: booking.id,
        tenantId: booking.office.tenantId,
        startupId: booking.startupId,
        officeId: booking.officeId,
        pricingId: pricing.id,
        razorpayPlanId: planId,
        razorpaySubscriptionId: subscription.id,
        shortUrl: subscription.short_url,
        billingCycle: pricing.billingCycle,
        customCycleDays: pricing.customCycleDays,
        totalCount: booking.totalDuration,
        remainingCount: booking.totalDuration,
        status: "PENDING",
        endAt: subscription.end_at ? new Date(subscription.end_at * 1000) : null,
        nextChargeAt: subscription.charge_at ? new Date(subscription.charge_at * 1000) : null,
        metadata: { subscription, transfers },
      },
      update: {
        razorpaySubscriptionId: subscription.id,
        shortUrl: subscription.short_url,
        status: "PENDING",
      },
    });

    await db.officeBooking.update({
      where: { id: booking.id },
      data: {
        paymentMode: "SUBSCRIPTION",
        billingCycle: pricing.billingCycle,
        customCycleDays: pricing.customCycleDays,
        nextDueDate: subscription.charge_at ? new Date(subscription.charge_at * 1000) : null,
      },
    });

    return {
      mode: "SUBSCRIPTION",
      subscriptionId: subRow.id,
      razorpaySubscriptionId: subscription.id,
      shortUrl: subscription.short_url,
      bookingId: booking.id,
      key: process.env.RAZORPAY_KEY_ID,
      totalCount: subscription.total_count,
      planId,
    };
  },

  async verifySubscriptionAuthorization({
    bookingId,
    razorpayPaymentId,
    razorpaySubscriptionId,
    razorpaySignature,
  }) {
    const sub = await db.officeSubscription.findUnique({
      where: { bookingId },
      include: { booking: true },
    });
    if (!sub) throw new ApiError(404, "Subscription not found");
    if (sub.razorpaySubscriptionId !== razorpaySubscriptionId) {
      throw new ApiError(400, "Subscription ID mismatch");
    }

    const generated = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayPaymentId}|${razorpaySubscriptionId}`)
      .digest("hex");
    if (generated !== razorpaySignature) {
      throw new ApiError(400, "Invalid subscription signature");
    }

    return db.$transaction(async (tx) => {
      const updatedSub = await tx.officeSubscription.update({
        where: { id: sub.id },
        data: { status: "AUTHENTICATED" },
      });
      await tx.officeBooking.update({
        where: { id: sub.bookingId },
        data: { status: "CONFIRMED", isPaid: true },
      });
      return { subscription: updatedSub, bookingId: sub.bookingId };
    });
  },

  async cancelSubscription({ bookingId, tenantId, startupId, cancelAtCycleEnd = true }) {
    const sub = await this._loadAndAuthorize({ bookingId, tenantId, startupId });
    if (!sub.razorpaySubscriptionId) throw new ApiError(400, "Subscription not yet active");

    await RazorpayService.cancelSubscription(sub.razorpaySubscriptionId, cancelAtCycleEnd);
    return db.officeSubscription.update({
      where: { id: sub.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
  },

  async pauseSubscription({ bookingId, tenantId, startupId }) {
    const sub = await this._loadAndAuthorize({ bookingId, tenantId, startupId });
    if (!sub.razorpaySubscriptionId) throw new ApiError(400, "Subscription not yet active");

    await RazorpayService.pauseSubscription(sub.razorpaySubscriptionId);
    return db.officeSubscription.update({
      where: { id: sub.id },
      data: { status: "PAUSED", pausedAt: new Date() },
    });
  },

  async resumeSubscription({ bookingId, tenantId, startupId }) {
    const sub = await this._loadAndAuthorize({ bookingId, tenantId, startupId });
    if (!sub.razorpaySubscriptionId) throw new ApiError(400, "Subscription not yet active");

    await RazorpayService.resumeSubscription(sub.razorpaySubscriptionId);
    return db.officeSubscription.update({
      where: { id: sub.id },
      data: { status: "ACTIVE", pausedAt: null },
    });
  },

  async listSubscriptions({ tenantId, startupId, filters }) {
    const { page = 1, limit = 10, status } = filters || {};
    const where = {};
    if (tenantId) where.tenantId = tenantId;
    if (startupId) where.startupId = startupId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      db.officeSubscription.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          booking: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
              status: true,
              office: { select: { id: true, name: true, location: true } },
              bookerStartup: { select: { id: true, name: true } },
            },
          },
          pricing: { select: { amount: true, currency: true, pricingType: true } },
        },
      }),
      db.officeSubscription.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getSubscription({ bookingId, tenantId, startupId }) {
    const sub = await db.officeSubscription.findUnique({
      where: { bookingId },
      include: {
        booking: { include: { office: true } },
        payments: { orderBy: { createdAt: "desc" } },
        pricing: true,
      },
    });
    if (!sub) throw new ApiError(404, "Subscription not found");
    if (tenantId && sub.tenantId !== tenantId) throw new ApiError(403, "Not authorized");
    if (startupId && sub.startupId !== startupId) throw new ApiError(403, "Not authorized");
    return sub;
  },

  async _loadAndAuthorize({ bookingId, tenantId, startupId }) {
    const sub = await db.officeSubscription.findUnique({ where: { bookingId } });
    if (!sub) throw new ApiError(404, "Subscription not found");
    if (tenantId && sub.tenantId !== tenantId) throw new ApiError(403, "Not authorized");
    if (startupId && sub.startupId !== startupId) throw new ApiError(403, "Not authorized");
    return sub;
  },
};
