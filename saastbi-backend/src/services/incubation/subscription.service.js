import { ApiError } from "../../utils/ApiError.js";
import db from "../../db/db.js";
import { RazorpayService } from "../common/razorpay.service.js";
import { computePaymentStatus } from "../../utils/billingHelpers.js";
import { invalidateAllTenantCaches } from "../../utils/accessCache.js";
import crypto from "crypto";

export const SubscriptionServices = {
  createSubscription: async ({ planId, tenantId }) => {
    const plan = await db.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new ApiError(404, "Plan not found");

    if (!plan.razorpayPlanId) {
      throw new ApiError(400, "Plan is not configured with Razorpay");
    }

    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new ApiError(404, "Tenant not found");
    const existingSubscription = await db.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ["ACTIVE"] },
      },
    });

    if (existingSubscription) {
      throw new ApiError(400, "Tenant already has an active subscription");
    }

    let totalCount = 12;
    if (plan.type === "YEARLY") {
      totalCount = 5;
    } else if (plan.type === "WEEKLY") {
      totalCount = 52;
    }
    const razorpaySubscription = await RazorpayService.createSubscription({
      planId: plan.razorpayPlanId,
      totalCount,
      customerNotify: true,
    });
    const subscription = await db.subscription.create({
      data: {
        tenantId,
        planId,
        razorpaySubscriptionId: razorpaySubscription.id,
        status: "PENDING",
      },
      include: {
        plan: {
          include: {
            planModules: {
              include: {
                module: true,
              },
            },
          },
        },
        tenant: true,
      },
    });

    return {
      subscription,
      razorpaySubscriptionId: razorpaySubscription.id,
      shortUrl: razorpaySubscription.short_url,
    };
  },

  verifyPayment: async ({
    razorpay_payment_id,
    razorpay_subscription_id,
    razorpay_signature,
    tenantId,
  }) => {
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      throw new ApiError(400, "Invalid payment signature");
    }
    const subscription = await db.subscription.findUnique({
      where: { razorpaySubscriptionId: razorpay_subscription_id },
      include: { plan: true },
    });

    if (!subscription) {
      throw new ApiError(404, "Subscription not found");
    }

    if (subscription.tenantId !== tenantId) {
      throw new ApiError(403, "Unauthorized access to subscription");
    }
    const razorpayDetails = await RazorpayService.getSubscriptionById(
      razorpay_subscription_id
    );
    const now = new Date();
    const currentEndDate = subscription.endDate ? new Date(subscription.endDate) : null;
    const baseDate = currentEndDate && currentEndDate > now ? currentEndDate : now;
    let endDate = new Date(baseDate);

    if (subscription.plan.type === "MONTHLY") {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (subscription.plan.type === "YEARLY") {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else if (subscription.plan.type === "WEEKLY") {
      endDate.setDate(endDate.getDate() + 7);
    }

    const startDate = currentEndDate && currentEndDate > now ? currentEndDate : now;

    // If this is a plan change, cancel the old subscription now that the new one is verified
    const oldPendingCancel = await db.subscription.findFirst({
      where: {
        tenantId,
        id: { not: subscription.id },
        status: "CHANGE_PENDING",
      },
    });
    if (oldPendingCancel) {
      // Cancel old Razorpay subscription
      if (oldPendingCancel.razorpaySubscriptionId) {
        try {
          await RazorpayService.cancelSubscription(
            oldPendingCancel.razorpaySubscriptionId,
            false,
          );
        } catch (error) {
          console.error("Error cancelling old Razorpay subscription during plan change verification:", error);
        }
      }
      await db.subscription.update({
        where: { id: oldPendingCancel.id },
        data: { status: "CANCELED", endDate: now },
      });
    }

    const [updatedSubscription, updatedTenant] = await Promise.all([
      db.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "ACTIVE",
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          startDate,
          endDate,
        },
        include: {
          plan: {
            include: {
              planModules: {
                include: {
                  module: true,
                },
              },
            },
          },
          tenant: true,
        },
      }),
      db.tenant.update({
        where: { id: tenantId },
        data: {
          status: "ACTIVE",
          planId: subscription.planId,
        },
      }),
    ]);

    // Invalidate both tenant data and access module caches
    await invalidateAllTenantCaches(tenantId);

    const invoiceNumber = `INV-${new Date().getFullYear()}-${crypto.randomUUID().split("-")[0].toUpperCase()}`;
    const invoice = await db.invoice.create({
      data: {
        tenantId,
        invoiceNumber,
        amount: subscription.plan.price,
        issuedDate: new Date(),
        paidDate: new Date(),
        status: "PAID",
        pdfUrl: null,
      },
    });
    await db.billingHistory.create({
      data: {
        tenantId,
        amount: subscription.plan.price,
        description: `Subscription payment for ${subscription.plan.name}`,
        paymentMethod: "Razorpay",
        status: "SUCCESS",
        invoiceId: invoice.id,
      },
    });

    return {
      subscription: updatedSubscription,
      tenant: updatedTenant,
      invoice,
      message: "Payment verified and subscription activated",
    };
  },
  getSubscriptionByTenant: async (tenantId) => {
    const subscription = await db.subscription.findFirst({
      where: { tenantId },
      include: {
        plan: {
          include: {
            planModules: {
              include: {
                module: true,
              },
            },
          },
        },
        tenant: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!subscription) {
      return null;
    }
    if (
      subscription.status === "ACTIVE" &&
      subscription.razorpaySubscriptionId
    ) {
      try {
        const razorpayDetails = await RazorpayService.getSubscriptionById(
          subscription.razorpaySubscriptionId
        );
        return { ...subscription, razorpayDetails };
      } catch (error) {
        console.error("Error fetching Razorpay details:", error);
        return subscription;
      }
    }

    return subscription;
  },

  getAllSubscriptions: async ({
    page = 1,
    limit = 10,
    status,
    search = "",
  }) => {
    const skip = (page - 1) * limit;
    const where = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        {
          tenant: {
            organizationName: { contains: search, mode: "insensitive" },
          },
        },
        { plan: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [subscriptions, totalCount] = await Promise.all([
      db.subscription.findMany({
        where,
        skip,
        take: limit,
        include: {
          plan: true,
          tenant: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      db.subscription.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: subscriptions,
      pagination: {
        page,
        limit,
        totalPages,
        totalCount,
      },
    };
  },

  cancelSubscription: async ({ subscriptionId, cancelAtCycleEnd = true }) => {
    const subscription = await db.subscription.findUnique({
      where: { id: subscriptionId },
      include: { tenant: true, plan: true },
    });

    if (!subscription) {
      throw new ApiError(404, "Subscription not found");
    }

    if (
      subscription.status === "CANCELED" ||
      subscription.status === "EXPIRED"
    ) {
      throw new ApiError(400, "Subscription is already cancelled or expired");
    }
    if (subscription.razorpaySubscriptionId) {
      try {
        await RazorpayService.cancelSubscription(
          subscription.razorpaySubscriptionId,
          cancelAtCycleEnd
        );
      } catch (error) {
        console.error("Error cancelling Razorpay subscription:", error);
      }
    }

    const updatedSubscription = await db.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: cancelAtCycleEnd ? "CANCELED" : "EXPIRED",
        endDate: cancelAtCycleEnd ? subscription.endDate : new Date(),
      },
      include: {
        plan: true,
        tenant: true,
      },
    });
    if (!cancelAtCycleEnd) {
      await db.tenant.update({
        where: { id: subscription.tenantId },
        data: {
          status: "SUSPENDED",
          planId: null,
        },
      });
    }

    // Invalidate both tenant data and access module caches
    await invalidateAllTenantCaches(subscription.tenantId);

    return updatedSubscription;
  },

  handleWebhook: async ({ body, signature, webhookSecret }) => {
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(JSON.stringify(body))
      .digest("hex");

    if (expectedSignature !== signature) {
      throw new ApiError(400, "Invalid webhook signature");
    }

    const event = body.event;
    const payload = body.payload.subscription.entity;

    switch (event) {
      case "subscription.activated": {
        const activatedSub = await db.subscription.update({
          where: { razorpaySubscriptionId: payload.id },
          data: { status: "ACTIVE" },
        });
        if (activatedSub) {
          await invalidateAllTenantCaches(activatedSub.tenantId);
        }
        break;
      }

      case "subscription.charged": {
        const razorpayPaymentId = body.payload?.payment?.entity?.id || null;

        if (razorpayPaymentId) {
          const existingBilling = await db.billingHistory.findFirst({
            where: {
              description: { contains: razorpayPaymentId },
            },
          });
          if (existingBilling) {
            console.log(`Duplicate subscription.charged event for payment ${razorpayPaymentId}, skipping`);
            break;
          }
        }

        const subscription = await db.subscription.findUnique({
          where: { razorpaySubscriptionId: payload.id },
          include: { plan: true },
        });

        if (subscription) {
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
              status: "ACTIVE",
            },
          });

          const invoiceNumber = `INV-${now.getFullYear()}-${crypto.randomUUID().split("-")[0].toUpperCase()}`;
          const invoice = await db.invoice.create({
            data: {
              tenantId: subscription.tenantId,
              invoiceNumber,
              amount: subscription.plan.price,
              issuedDate: now,
              paidDate: now,
              status: "PAID",
            },
          });

          await db.billingHistory.create({
            data: {
              tenantId: subscription.tenantId,
              amount: subscription.plan.price,
              description: `Subscription renewal for ${subscription.plan.name}${razorpayPaymentId ? ` [${razorpayPaymentId}]` : ""}`,
              paymentMethod: "Razorpay",
              status: "SUCCESS",
              invoiceId: invoice.id,
            },
          });

          // Invalidate both caches — subscription dates/status changed
          await invalidateAllTenantCaches(subscription.tenantId);
        }
        break;
      }

      case "subscription.completed": {
        const completedSub = await db.subscription.update({
          where: { razorpaySubscriptionId: payload.id },
          data: { status: "COMPLETED" },
        });
        if (completedSub) {
          await invalidateAllTenantCaches(completedSub.tenantId);
        }
        break;
      }

      case "subscription.cancelled": {
        const cancelledSub = await db.subscription.findUnique({
          where: { razorpaySubscriptionId: payload.id },
        });

        if (cancelledSub) {
          await db.subscription.update({
            where: { razorpaySubscriptionId: payload.id },
            data: { status: "CANCELED" },
          });

          const hasPendingOrActive = await db.subscription.findFirst({
            where: {
              tenantId: cancelledSub.tenantId,
              id: { not: cancelledSub.id },
              status: { in: ["ACTIVE", "PENDING"] },
            },
          });

          if (!hasPendingOrActive) {
            await db.tenant.update({
              where: { id: cancelledSub.tenantId },
              data: { status: "SUSPENDED" },
            });

          }

          // Invalidate both tenant data and access module caches
          await invalidateAllTenantCaches(cancelledSub.tenantId);
        }
        break;
      }

      case "subscription.paused":
      case "subscription.halted":
        const pausedSub = await db.subscription.findUnique({
          where: { razorpaySubscriptionId: payload.id },
        });

        if (pausedSub) {
          await db.tenant.update({
            where: { id: pausedSub.tenantId },
            data: { status: "SUSPENDED" },
          });

          // Invalidate both tenant data and access module caches
          await invalidateAllTenantCaches(pausedSub.tenantId);
        }
        break;

      default:
        console.log(`Unhandled webhook event: ${event}`);
    }
    return { message: "Webhook processed successfully" };
  },

  changePlan: async ({ tenantId, newPlanId }) => {
    const newPlan = await db.plan.findUnique({ where: { id: newPlanId } });
    if (!newPlan) throw new ApiError(404, "New plan not found");
    if (!newPlan.razorpayPlanId) {
      throw new ApiError(400, "New plan is not configured with Razorpay");
    }

    const currentSubscription = await db.subscription.findFirst({
      where: { tenantId, status: "ACTIVE" },
      include: { plan: true },
    });

    if (!currentSubscription) {
      throw new ApiError(404, "No active subscription found for this tenant");
    }

    if (currentSubscription.planId === newPlanId) {
      throw new ApiError(400, "Tenant is already on this plan");
    }

    // Check if there's already a pending plan change
    const latestSubscription = await db.subscription.findFirst({
      where: {
        tenantId,
      },
    
      orderBy: {
        createdAt: "desc",
      },
    });
    
    if (latestSubscription && latestSubscription.id !== currentSubscription.id && ["PENDING", "CHANGE_PENDING"].includes(latestSubscription.status)
    ) {
      throw new ApiError(
        400,
        "A plan change is already in progress. Please complete or cancel it first."
      );
    }

    // Calculate proration credit
    let credit = 0;
    if (currentSubscription.startDate && currentSubscription.endDate) {
      const now = new Date();
      const startMs = new Date(currentSubscription.startDate).getTime();
      const endMs = new Date(currentSubscription.endDate).getTime();
      const totalDays = (endMs - startMs) / (1000 * 60 * 60 * 24);
      const daysUsed = Math.max(0, (now.getTime() - startMs) / (1000 * 60 * 60 * 24));
      const daysRemaining = Math.max(0, totalDays - daysUsed);

      if (totalDays > 0) {
        const dailyRate = currentSubscription.plan.price / totalDays;
        credit = Math.round(dailyRate * daysRemaining * 100) / 100;
      }
    }

    const isUpgrade = newPlan.price > currentSubscription.plan.price;
    const oldPlanName = currentSubscription.plan.name;
    const newPlanName = newPlan.name;

    // Mark old subscription as CHANGE_PENDING (keep it ACTIVE so tenant retains access).
    // It will be fully canceled in verifyPayment once the new subscription's payment is confirmed.
    await db.subscription.update({
      where: { id: currentSubscription.id },
      data: { status: "CHANGE_PENDING" },
    });

    // Record proration credit in billing history
    if (credit > 0) {
      await db.billingHistory.create({
        data: {
          tenantId,
          amount: credit,
          description: `Proration credit: ${oldPlanName} → ${newPlanName} (${isUpgrade ? "upgrade" : "downgrade"})`,
          paymentMethod: "SYSTEM_CREDIT",
          status: "SUCCESS",
        },
      });
    }

    // Create new Razorpay subscription
    let totalCount = 12;
    if (newPlan.type === "YEARLY") {
      totalCount = 5;
    } else if (newPlan.type === "WEEKLY") {
      totalCount = 52;
    }

    const razorpaySubscription = await RazorpayService.createSubscription({
      planId: newPlan.razorpayPlanId,
      totalCount,
      customerNotify: true,
      notes: {
        tenantId,
        changeType: isUpgrade ? "upgrade" : "downgrade",
        previousPlan: oldPlanName,
      },
    });

    // Create new PENDING subscription
    const newSubscription = await db.subscription.create({
      data: {
        tenantId,
        planId: newPlanId,
        razorpaySubscriptionId: razorpaySubscription.id,
        status: "PENDING",
      },
      include: {
        plan: {
          include: {
            planModules: { include: { module: true } },
          },
        },
        tenant: true,
      },
    });

    return {
      subscription: newSubscription,
      razorpaySubscriptionId: razorpaySubscription.id,
      shortUrl: razorpaySubscription.short_url,
      changeType: isUpgrade ? "upgrade" : "downgrade",
      previousPlan: oldPlanName,
      newPlan: newPlanName,
      proratedCredit: credit,
    };
  },

  getBillingInfo: async ({ tenantId }) => {
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
        billing: null,
      };
    }

    let razorpayDetails = null;
    if (subscription.razorpaySubscriptionId) {
      try {
        razorpayDetails = await RazorpayService.getSubscriptionById(
          subscription.razorpaySubscriptionId
        );
      } catch (error) {
        console.error("Error fetching Razorpay subscription details:", error);
      }
    }

    const now = new Date();
    const nextBillingDate = subscription.endDate;
    const daysUntilNextBilling = nextBillingDate
      ? Math.max(0, Math.ceil((new Date(nextBillingDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : null;

    const [recentBillingHistory, paymentStatus] = await Promise.all([
      db.billingHistory.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          invoice: { select: { id: true, invoiceNumber: true, status: true } },
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
      recentBillingHistory,
    };
  },

  getAvailablePlans: async ({ tenantId }) => {
    const [plans, tenant] = await Promise.all([
      db.plan.findMany({
        include: {
          planModules: { include: { module: true } },
        },
        orderBy: { price: "asc" },
      }),
      db.tenant.findUnique({
        where: { id: tenantId },
        select: { planId: true, status: true },
      }),
    ]);

    if (!tenant) throw new ApiError(404, "Tenant not found");

    const currentSubscription = await db.subscription.findFirst({
      where: { tenantId, status: "ACTIVE" },
      select: { id: true, planId: true, startDate: true, endDate: true, status: true },
    });

    const currentPlanPrice = currentSubscription
      ? plans.find((p) => p.id === currentSubscription.planId)?.price || 0
      : 0;

    return {
      currentPlanId: currentSubscription?.planId || null,
      plans: plans.map((plan) => {
        const isSubscribed = currentSubscription?.planId === plan.id;
        const isAlreadyPurchased = isSubscribed && currentSubscription.status === "ACTIVE";

        return {
          ...plan,
          isCurrent: plan.id === tenant.planId,
          isSubscribed,
          isAlreadyPurchased,
          subscriptionStatus: isSubscribed ? currentSubscription.status : null,
          subscriptionId: isSubscribed ? currentSubscription.id : null,
          startDate: isSubscribed ? currentSubscription.startDate : null,
          endDate: isSubscribed ? currentSubscription.endDate : null,
          nextBillingDate: isSubscribed ? currentSubscription.endDate : null,
          changeType: currentSubscription
            ? isSubscribed
              ? null
              : plan.price > currentPlanPrice
                ? "upgrade"
                : "downgrade"
            : "new",
        };
      }),
    };
  },
};
