import db from "../../db/db.js";
import crypto from "crypto";
import { RazorpayService } from "../common/razorpay.service.js";
import { NotificationService } from "../common/notification.service.js";
import { addCycles } from "../../utils/officeCycle.js";

async function recordEvent({ provider, eventId, eventType, payload }) {
  if (!eventId) return { skip: true };
  try {
    await db.webhookEventLog.create({
      data: { provider, eventId, eventType, payload, status: "PROCESSING", attempts: 1 },
    });
    return { skip: false, isNew: true };
  } catch (err) {
    const existing = await db.webhookEventLog.findUnique({ where: { eventId } });
    if (existing && existing.status === "PROCESSED") {
      return { skip: true };
    }
    if (existing) {
      await db.webhookEventLog.update({
        where: { eventId },
        data: { attempts: existing.attempts + 1, status: "PROCESSING" },
      });
      return { skip: false, isNew: false };
    }
    return { skip: false, isNew: true };
  }
}

async function markProcessed(eventId) {
  if (!eventId) return;
  await db.webhookEventLog
    .update({
      where: { eventId },
      data: { status: "PROCESSED", processedAt: new Date(), error: null },
    })
    .catch(() => {});
}

async function markFailed(eventId, message) {
  if (!eventId) return;
  await db.webhookEventLog
    .update({ where: { eventId }, data: { status: "FAILED", error: message } })
    .catch(() => {});
}

async function notifyStartupForBooking({ bookingId, type, title, message, priority = "MEDIUM", data = {} }) {
  if (!bookingId) return;
  const booking = await db.officeBooking.findUnique({
    where: { id: bookingId },
    select: { id: true, officeId: true, startupId: true },
  });
  if (!booking?.startupId) return;
  const members = await db.startupMember.findMany({
    where: { startupId: booking.startupId, isActive: true },
    select: { userId: true },
  });
  const recipientIds = [...new Set(members.map((m) => m.userId))].filter(Boolean);
  if (!recipientIds.length) return;
  await NotificationService.sendBulk({
    recipientIds,
    type,
    category: "OFFICE",
    priority,
    title,
    message,
    entityType: "OfficeBooking",
    entityId: booking.id,
    data: { bookingId: booking.id, officeId: booking.officeId, ...data },
  });
}

async function notifyTenantPayoutAccount({ tenantId, type, title, message, priority = "MEDIUM", data = {} }) {
  if (!tenantId) return;
  const memberships = await db.incubationUserTenant.findMany({
    where: { tenantId, isActive: true },
    select: { incubationUserId: true },
  });
  const recipientIds = [...new Set(memberships.map((m) => m.incubationUserId))].filter(Boolean);
  if (!recipientIds.length) return;
  await NotificationService.sendBulk({
    recipientIds,
    type,
    category: "OFFICE",
    priority,
    title,
    message,
    entityType: "IncubationPayoutAccount",
    entityId: tenantId,
    data,
  });
}

export const RazorpayWebhookService = {
  async handleAccountEvent({ event, payload, eventId }) {
    const { skip } = await recordEvent({
      provider: "razorpay",
      eventId,
      eventType: event,
      payload,
    });
    if (skip) return { status: "duplicate" };

    try {
      const accountEntity = payload.account?.entity || payload.entity;
      const accountId = accountEntity?.id;
      if (!accountId) {
        await markProcessed(eventId);
        return { status: "ignored" };
      }

      const account = await db.incubationPayoutAccount.findFirst({
        where: { razorpayLinkedAccountId: accountId },
      });
      if (!account) {
        await markProcessed(eventId);
        return { status: "no_match" };
      }

      let updates = {};
      switch (event) {
        case "account.under_review":
          updates = { kycStatus: "UNDER_REVIEW" };
          break;
        case "account.needs_clarification":
          updates = {
            kycStatus: "NEEDS_CLARIFICATION",
            kycRejectionReason: accountEntity?.notes?.reason || null,
          };
          break;
        case "account.activated":
          updates = { kycStatus: "ACTIVATED", activatedAt: new Date(), kycRejectionReason: null };
          break;
        case "account.rejected":
          updates = {
            kycStatus: "REJECTED",
            kycRejectionReason: accountEntity?.notes?.reason || null,
          };
          break;
        case "account.suspended":
          updates = { kycStatus: "SUSPENDED" };
          break;
        default:
          await markProcessed(eventId);
          return { status: "ignored" };
      }

      await db.incubationPayoutAccount.update({ where: { id: account.id }, data: updates });

      const notifMap = {
        "account.under_review": { title: "Payout account under review", message: "Razorpay is reviewing your KYC submission.", priority: "MEDIUM" },
        "account.needs_clarification": { title: "Payout account needs clarification", message: updates.kycRejectionReason || "Razorpay has requested additional information.", priority: "HIGH" },
        "account.activated": { title: "Payout account activated", message: "Your payout account is now active. You can start accepting paid bookings.", priority: "HIGH" },
        "account.rejected": { title: "Payout account rejected", message: updates.kycRejectionReason || "Your KYC submission was rejected.", priority: "HIGH" },
        "account.suspended": { title: "Payout account suspended", message: "Your payout account has been suspended.", priority: "HIGH" },
      };
      const notif = notifMap[event];
      if (notif) {
        await notifyTenantPayoutAccount({
          tenantId: account.tenantId,
          type: "OFFICE_PAYOUT_ACCOUNT",
          ...notif,
          data: { kycStatus: updates.kycStatus, reason: updates.kycRejectionReason || null },
        });
      }

      await markProcessed(eventId);
      return { status: "processed" };
    } catch (err) {
      await markFailed(eventId, err.message);
      throw err;
    }
  },

  async handleOfficeEvent({ event, payload, eventId }) {
    const { skip } = await recordEvent({
      provider: "razorpay",
      eventId,
      eventType: event,
      payload,
    });
    if (skip) return { status: "duplicate" };

    try {
      switch (event) {
        case "payment.captured":
          await this.onPaymentCaptured(payload);
          break;
        case "payment.failed":
          await this.onPaymentFailed(payload);
          break;
        case "transfer.processed":
          await this.onTransferProcessed(payload);
          break;
        case "transfer.failed":
          await this.onTransferFailed(payload);
          break;
        case "subscription.authenticated":
        case "subscription.activated":
          await this.onSubscriptionActivated(payload, event);
          break;
        case "subscription.charged":
          await this.onSubscriptionCharged(payload);
          break;
        case "subscription.completed":
          await this.onSubscriptionCompleted(payload);
          break;
        case "subscription.halted":
          await this.onSubscriptionHalted(payload);
          break;
        case "subscription.cancelled":
          await this.onSubscriptionCancelled(payload);
          break;
        case "subscription.paused":
          await this.onSubscriptionPaused(payload);
          break;
        case "subscription.resumed":
          await this.onSubscriptionResumed(payload);
          break;
        case "refund.processed":
        case "refund.failed":
          await this.onRefundEvent(payload, event);
          break;
        default:
          break;
      }
      await markProcessed(eventId);
      return { status: "processed" };
    } catch (err) {
      await markFailed(eventId, err.message);
      throw err;
    }
  },

  async onPaymentCaptured(payload) {
    const entity = payload.payment?.entity;
    if (!entity) return;
    const payment = await db.officePayment.findFirst({
      where: { OR: [{ razorpayOrderId: entity.order_id }, { razorpayPaymentId: entity.id }] },
    });
    if (!payment || payment.status === "COMPLETED") return;

    await db.$transaction(async (tx) => {
      await tx.officePayment.update({
        where: { id: payment.id },
        data: {
          razorpayPaymentId: entity.id,
          status: "COMPLETED",
          paidAt: new Date(),
          invoiceNumber: payment.invoiceNumber || `INV-OFF-${Date.now()}`,
          paymentMethod: entity.method,
        },
      });
      if (payment.paymentType === "BOOKING" || payment.paymentType === "RENT") {
        await tx.officeBooking.update({
          where: { id: payment.bookingId },
          data: { status: "CONFIRMED", isPaid: true, lastBilledAt: new Date() },
        });

        const booking = await tx.officeBooking.findUnique({
          where: { id: payment.bookingId },
          select: { id: true, officeId: true, startupId: true, startDate: true, endDate: true, office: { select: { tenantId: true } } },
        });
        if (booking?.startupId && booking.office?.tenantId) {
          const existingAllocation = await tx.officeAllocation.findFirst({
            where: { bookingId: booking.id },
          });
          if (!existingAllocation) {
            await tx.officeAllocation.create({
              data: {
                tenantId: booking.office.tenantId,
                officeId: booking.officeId,
                startupId: booking.startupId,
                allocatedById: booking.office.tenantId,
                bookingId: booking.id,
                startDate: booking.startDate,
                endDate: booking.endDate,
                status: "ACTIVE",
                isActive: true,
              },
            });
            await tx.officeSpace.update({
              where: { id: booking.officeId },
              data: { status: "OCCUPIED" },
            });
          }
        }
      }
      if (payment.paymentType === "SECURITY_DEPOSIT") {
        await tx.officeBooking.update({
          where: { id: payment.bookingId },
          data: { securityDepositStatus: "COLLECTED" },
        });
      }
    });

    await notifyStartupForBooking({
      bookingId: payment.bookingId,
      type: "OFFICE_PAYMENT_SUCCESS",
      title: "Payment received",
      message: `Your office payment of ${payment.currency} ${payment.amount} was successful.`,
      priority: "HIGH",
      data: { paymentId: payment.id, amount: payment.amount },
    });
  },

  async onPaymentFailed(payload) {
    const entity = payload.payment?.entity;
    if (!entity) return;
    const payment = await db.officePayment.findFirst({
      where: { OR: [{ razorpayOrderId: entity.order_id }, { razorpayPaymentId: entity.id }] },
    });
    if (!payment) return;
    await db.officePayment.update({
      where: { id: payment.id },
      data: { status: "FAILED", failureReason: entity.error_description },
    });

    await notifyStartupForBooking({
      bookingId: payment.bookingId,
      type: "OFFICE_PAYMENT_FAILED",
      title: "Payment failed",
      message: entity.error_description || "Your office payment failed. Please retry.",
      priority: "HIGH",
      data: { paymentId: payment.id, reason: entity.error_description || null },
    });
  },

  async onTransferProcessed(payload) {
    const entity = payload.transfer?.entity;
    if (!entity) return;
    const sourcePaymentId = entity.source;
    let payment = null;
    if (sourcePaymentId) {
      payment = await db.officePayment.findFirst({
        where: { razorpayPaymentId: sourcePaymentId },
        include: { booking: { include: { office: { select: { tenantId: true } } } } },
      });
    }
    const tenantId = payment?.booking?.office?.tenantId;
    const payoutAccount = tenantId
      ? await db.incubationPayoutAccount.findUnique({ where: { tenantId } })
      : null;

    await db.officePayout.upsert({
      where: { razorpayTransferId: entity.id },
      create: {
        tenantId: tenantId || "unknown",
        payoutAccountId: payoutAccount?.id || null,
        paymentId: payment?.id || null,
        razorpayTransferId: entity.id,
        amount: (entity.amount || 0) / 100,
        currency: entity.currency || "INR",
        status: "PROCESSED",
        payoutDate: new Date(),
        metadata: entity,
      },
      update: {
        status: "PROCESSED",
        payoutDate: new Date(),
        metadata: entity,
      },
    });

    if (payment) {
      await db.officePayment.update({
        where: { id: payment.id },
        data: { razorpayTransferId: entity.id },
      });
    }
  },

  async onTransferFailed(payload) {
    const entity = payload.transfer?.entity;
    if (!entity) return;
    await db.officePayout.upsert({
      where: { razorpayTransferId: entity.id },
      create: {
        tenantId: "unknown",
        razorpayTransferId: entity.id,
        amount: (entity.amount || 0) / 100,
        currency: entity.currency || "INR",
        status: "FAILED",
        failureReason: entity.error_description || "Transfer failed",
        metadata: entity,
      },
      update: { status: "FAILED", failureReason: entity.error_description, metadata: entity },
    });
  },

  async onSubscriptionActivated(payload, event) {
    const entity = payload.subscription?.entity;
    if (!entity) return;
    const sub = await db.officeSubscription.findUnique({
      where: { razorpaySubscriptionId: entity.id },
    });
    if (!sub) return;
    await db.officeSubscription.update({
      where: { id: sub.id },
      data: {
        status: event === "subscription.authenticated" ? "AUTHENTICATED" : "ACTIVE",
        currentStart: entity.current_start ? new Date(entity.current_start * 1000) : sub.currentStart,
        currentEnd: entity.current_end ? new Date(entity.current_end * 1000) : sub.currentEnd,
        nextChargeAt: entity.charge_at ? new Date(entity.charge_at * 1000) : sub.nextChargeAt,
        endAt: entity.end_at ? new Date(entity.end_at * 1000) : sub.endAt,
      },
    });
    await db.officeBooking.update({
      where: { id: sub.bookingId },
      data: { status: "CONFIRMED", isPaid: true },
    });

    await notifyStartupForBooking({
      bookingId: sub.bookingId,
      type: "OFFICE_SUBSCRIPTION_ACTIVATED",
      title: "Subscription activated",
      message: "Your office subscription is now active.",
      priority: "HIGH",
      data: { subscriptionId: sub.id },
    });
  },

  async onSubscriptionCharged(payload) {
    const subEntity = payload.subscription?.entity;
    const paymentEntity = payload.payment?.entity;
    if (!subEntity || !paymentEntity) return;

    const sub = await db.officeSubscription.findUnique({
      where: { razorpaySubscriptionId: subEntity.id },
      include: { booking: true, pricing: true },
    });
    if (!sub) return;

    const cycleNumber = (sub.paidCount || 0) + 1;
    const periodStart = subEntity.current_start
      ? new Date(subEntity.current_start * 1000)
      : sub.currentEnd || new Date();
    const periodEnd = subEntity.current_end
      ? new Date(subEntity.current_end * 1000)
      : addCycles(periodStart, sub.billingCycle, 1, sub.customCycleDays);

    const amount = (paymentEntity.amount || 0) / 100;
    const platformFeePercentage = sub.pricing?.platformFeePercentage || 0;
    const gstPercentage = sub.pricing?.gstPercentage || 0;
    const platformFeeAmount = (amount * platformFeePercentage) / 100;
    const gstAmount = (amount * gstPercentage) / 100;
    const netPayoutAmount = amount - platformFeeAmount;

    await db.$transaction(async (tx) => {
      const existing = await tx.officePayment.findFirst({
        where: { razorpayPaymentId: paymentEntity.id },
      });
      if (!existing) {
        await tx.officePayment.create({
          data: {
            bookingId: sub.bookingId,
            officeId: sub.officeId,
            subscriptionId: sub.id,
            payerType: sub.booking.bookerType,
            payerId: sub.booking.bookerId,
            userId: sub.booking.userId,
            startupId: sub.booking.startupId,
            amount,
            currency: paymentEntity.currency || "INR",
            paymentType: "RECURRING_RENT",
            cycleNumber,
            periodStart,
            periodEnd,
            gstAmount,
            platformFeeAmount,
            netPayoutAmount,
            razorpayPaymentId: paymentEntity.id,
            razorpayOrderId: paymentEntity.order_id,
            razorpayEventId: paymentEntity.id,
            status: "COMPLETED",
            paidAt: new Date(),
            invoiceNumber: `INV-OFF-${Date.now()}-${cycleNumber}`,
            metadata: { paymentEntity, subEntity },
          },
        });
      }

      const newPaidCount = cycleNumber;
      const remaining = Math.max(0, sub.totalCount - newPaidCount);
      const nextChargeAt = subEntity.charge_at ? new Date(subEntity.charge_at * 1000) : null;

      await tx.officeSubscription.update({
        where: { id: sub.id },
        data: {
          paidCount: newPaidCount,
          remainingCount: remaining,
          currentStart: periodStart,
          currentEnd: periodEnd,
          nextChargeAt,
          status: remaining === 0 ? "COMPLETED" : "ACTIVE",
        },
      });

      await tx.officeBooking.update({
        where: { id: sub.bookingId },
        data: {
          lastBilledAt: new Date(),
          nextDueDate: nextChargeAt,
          isPaid: true,
        },
      });
    });
  },

  async onSubscriptionCompleted(payload) {
    const entity = payload.subscription?.entity;
    if (!entity) return;
    const sub = await db.officeSubscription.findUnique({
      where: { razorpaySubscriptionId: entity.id },
    });
    if (!sub) return;
    await db.$transaction(async (tx) => {
      await tx.officeSubscription.update({
        where: { id: sub.id },
        data: { status: "COMPLETED", remainingCount: 0 },
      });
      await tx.officeBooking.update({
        where: { id: sub.bookingId },
        data: { status: "COMPLETED" },
      });
      await tx.officeAllocation.updateMany({
        where: { bookingId: sub.bookingId, status: "ACTIVE" },
        data: { status: "ENDED", isActive: false, endDate: new Date() },
      });
    });
  },

  async onSubscriptionHalted(payload) {
    const entity = payload.subscription?.entity;
    if (!entity) return;
    const sub = await db.officeSubscription.findUnique({
      where: { razorpaySubscriptionId: entity.id },
    });
    if (!sub) return;
    await db.officeSubscription.update({
      where: { id: sub.id },
      data: { status: "HALTED" },
    });

    await notifyStartupForBooking({
      bookingId: sub.bookingId,
      type: "OFFICE_SUBSCRIPTION_HALTED",
      title: "Subscription payment failed",
      message: "Your subscription is halted due to a failed payment. Please retry to avoid suspension.",
      priority: "HIGH",
      data: { subscriptionId: sub.id },
    });
  },

  async onSubscriptionCancelled(payload) {
    const entity = payload.subscription?.entity;
    if (!entity) return;
    const sub = await db.officeSubscription.findUnique({
      where: { razorpaySubscriptionId: entity.id },
    });
    if (!sub) return;
    await db.$transaction(async (tx) => {
      await tx.officeSubscription.update({
        where: { id: sub.id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });
      await tx.officeBooking.update({
        where: { id: sub.bookingId },
        data: { status: "CANCELLED" },
      });
    });
  },

  async onSubscriptionPaused(payload) {
    const entity = payload.subscription?.entity;
    if (!entity) return;
    const sub = await db.officeSubscription.findUnique({
      where: { razorpaySubscriptionId: entity.id },
    });
    if (!sub) return;
    await db.officeSubscription.update({
      where: { id: sub.id },
      data: { status: "PAUSED", pausedAt: new Date() },
    });
  },

  async onSubscriptionResumed(payload) {
    const entity = payload.subscription?.entity;
    if (!entity) return;
    const sub = await db.officeSubscription.findUnique({
      where: { razorpaySubscriptionId: entity.id },
    });
    if (!sub) return;
    await db.officeSubscription.update({
      where: { id: sub.id },
      data: { status: "ACTIVE", pausedAt: null },
    });
  },

  async onRefundEvent(payload, event) {
    const refund = payload.refund?.entity;
    if (!refund) return;
    const payment = await db.officePayment.findFirst({
      where: { razorpayPaymentId: refund.payment_id },
    });
    if (!payment) return;
    if (event === "refund.processed") {
      await db.officePayment.update({
        where: { id: payment.id },
        data: {
          refundedAt: new Date(),
          refundAmount: (refund.amount || 0) / 100,
          status:
            (refund.amount || 0) / 100 >= payment.amount ? "REFUNDED" : payment.status,
        },
      });
      if (payment.razorpayTransferId) {
        await db.officePayout.updateMany({
          where: { razorpayTransferId: payment.razorpayTransferId },
          data: { status: "REVERSED" },
        });
      }
    }
  },
};

export function verifyAndParseWebhook(rawBody, signature, secret) {
  if (!secret) {
    throw new Error("Razorpay webhook secret is not configured");
  }
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  if (expected !== signature) {
    throw new Error("Invalid webhook signature");
  }
  return JSON.parse(rawBody.toString("utf8"));
}
