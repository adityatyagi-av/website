/**
 * Office-specific cron jobs
 *
 * Handles: booking expiry, pre-expiry reminders, past-due/dunning suspension,
 * pre-charge reminders, webhook retry, completion safety net.
 */

import cron from "node-cron";
import db from "../db/db.js";
import { NotificationService } from "../services/common/notification.service.js";
import { RazorpayWebhookService } from "../services/common/razorpay-webhook.service.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const SUSPEND_AFTER_DAYS = 7;
const CANCEL_AFTER_DAYS = 21;

async function notifyBookingStartup({ booking, type, title, message, data = {} }) {
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
    priority: "HIGH",
    title,
    message,
    entityType: "OfficeBooking",
    entityId: booking.id,
    data: { bookingId: booking.id, officeId: booking.officeId, ...data },
  });
}

// Every 30 mins: expire bookings whose endDate has passed
cron.schedule("*/30 * * * *", async () => {
  try {
    const now = new Date();
    const expired = await db.officeBooking.findMany({
      where: {
        status: { in: ["ACTIVE", "CONFIRMED"] },
        endDate: { lt: now, not: null },
      },
      select: { id: true, officeId: true, startupId: true },
      take: 200,
    });
    for (const booking of expired) {
      await db.$transaction(async (tx) => {
        await tx.officeBooking.update({
          where: { id: booking.id },
          data: { status: "COMPLETED" },
        });
        await tx.officeAllocation.updateMany({
          where: { bookingId: booking.id, isActive: true },
          data: { status: "ENDED", isActive: false },
        });
        const remaining = await tx.officeAllocation.count({
          where: { officeId: booking.officeId, isActive: true },
        });
        if (remaining === 0) {
          await tx.officeSpace.update({
            where: { id: booking.officeId },
            data: { status: "AVAILABLE" },
          });
        }
      });
      await notifyBookingStartup({
        booking,
        type: "OFFICE_BOOKING_UPDATE",
        title: "Office booking completed",
        message: "Your office booking has ended.",
      });
    }
  } catch (err) {
    console.error("Office expiry cron error:", err.message);
  }
});

// Daily 09:00: pre-expiry reminders (7 / 3 / 1 days out)
cron.schedule("0 9 * * *", async () => {
  try {
    const now = new Date();
    for (const days of [7, 3, 1]) {
      const dayStart = new Date(now.getTime() + days * DAY_MS);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + DAY_MS);
      const upcoming = await db.officeBooking.findMany({
        where: {
          status: { in: ["ACTIVE", "CONFIRMED"] },
          endDate: { gte: dayStart, lt: dayEnd },
        },
        select: { id: true, officeId: true, startupId: true, endDate: true },
        take: 200,
      });
      for (const booking of upcoming) {
        await notifyBookingStartup({
          booking,
          type: "OFFICE_BOOKING_UPDATE",
          title: `Office booking ends in ${days} day${days > 1 ? "s" : ""}`,
          message: `Your office booking is set to end on ${booking.endDate?.toDateString?.() || ""}.`,
          data: { daysUntilExpiry: days },
        });
      }
    }
  } catch (err) {
    console.error("Office pre-expiry reminder cron error:", err.message);
  }
});

// Daily 09:30: pre-charge reminder (subscriptions, 1 day before nextChargeAt)
cron.schedule("30 9 * * *", async () => {
  try {
    const now = new Date();
    const dayStart = new Date(now.getTime() + DAY_MS);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);
    const subs = await db.officeSubscription.findMany({
      where: {
        status: "ACTIVE",
        nextChargeAt: { gte: dayStart, lt: dayEnd },
      },
      include: {
        booking: { select: { id: true, officeId: true, startupId: true } },
        pricing: { select: { amount: true, currency: true } },
      },
      take: 200,
    });
    for (const sub of subs) {
      if (!sub.booking) continue;
      await notifyBookingStartup({
        booking: sub.booking,
        type: "OFFICE_PAYMENT_REMINDER",
        title: "Upcoming office subscription charge",
        message: `Your subscription will be charged ${sub.pricing?.currency || "INR"} ${sub.pricing?.amount || ""} tomorrow.`,
        data: { subscriptionId: sub.id, nextChargeAt: sub.nextChargeAt },
      });
    }
  } catch (err) {
    console.error("Office pre-charge reminder cron error:", err.message);
  }
});

// Daily 03:00: dunning - HALTED subscriptions with past nextChargeAt
// Reminders at day 1/4/7, suspend at 7, cancel at 21
cron.schedule("0 3 * * *", async () => {
  try {
    const now = new Date();
    const halted = await db.officeSubscription.findMany({
      where: {
        status: "HALTED",
        nextChargeAt: { lt: now },
      },
      include: {
        booking: { select: { id: true, officeId: true, startupId: true } },
      },
      take: 500,
    });

    for (const sub of halted) {
      if (!sub.nextChargeAt) continue;
      const daysOverdue = Math.floor((now.getTime() - sub.nextChargeAt.getTime()) / DAY_MS);

      if ([1, 4, 7].includes(daysOverdue) && sub.booking) {
        await notifyBookingStartup({
          booking: sub.booking,
          type: "OFFICE_PAYMENT_REMINDER",
          title: `Payment overdue (${daysOverdue} day${daysOverdue > 1 ? "s" : ""})`,
          message:
            daysOverdue >= 7
              ? "Your office access has been suspended due to non-payment."
              : "Your subscription payment is overdue. Please retry payment to avoid suspension.",
          data: { subscriptionId: sub.id, daysOverdue },
        });
      }

      if (daysOverdue >= SUSPEND_AFTER_DAYS && daysOverdue < CANCEL_AFTER_DAYS) {
        await db.officeBooking.updateMany({
          where: { id: sub.bookingId, status: { in: ["ACTIVE", "CONFIRMED"] } },
          data: { status: "SUSPENDED" },
        });
      }

      if (daysOverdue >= CANCEL_AFTER_DAYS) {
        await db.$transaction(async (tx) => {
          await tx.officeSubscription.update({
            where: { id: sub.id },
            data: { status: "CANCELLED", cancelledAt: now },
          });
          await tx.officeBooking.update({
            where: { id: sub.bookingId },
            data: { status: "CANCELLED", cancelledAt: now, cancellationReason: "Auto-cancelled after 21 days of non-payment" },
          });
          await tx.officeAllocation.updateMany({
            where: { bookingId: sub.bookingId, isActive: true },
            data: { status: "TERMINATED", isActive: false },
          });
        });
        if (sub.booking) {
          await notifyBookingStartup({
            booking: sub.booking,
            type: "OFFICE_BOOKING_UPDATE",
            title: "Office booking cancelled",
            message: "Your office booking has been auto-cancelled after 21 days of non-payment.",
            data: { subscriptionId: sub.id },
          });
        }
      }
    }
  } catch (err) {
    console.error("Office dunning cron error:", err.message);
  }
});

// Hourly: retry failed webhook events (max 5 attempts)
cron.schedule("15 * * * *", async () => {
  try {
    const stale = await db.webhookEventLog.findMany({
      where: {
        provider: "razorpay",
        status: { in: ["FAILED", "PENDING"] },
        attempts: { lt: 5 },
        updatedAt: { lt: new Date(Date.now() - 30 * 60 * 1000) },
      },
      take: 50,
    });
    for (const evt of stale) {
      try {
        const isAccount = evt.eventType?.startsWith("account.");
        const handler = isAccount
          ? RazorpayWebhookService.handleAccountEvent
          : RazorpayWebhookService.handleOfficeEvent;
        await handler.call(RazorpayWebhookService, {
          event: evt.eventType,
          payload: evt.payload,
          eventId: evt.eventId,
        });
      } catch (err) {
        await db.webhookEventLog.update({
          where: { id: evt.id },
          data: {
            attempts: { increment: 1 },
            error: err.message,
            status: "FAILED",
          },
        });
      }
    }
  } catch (err) {
    console.error("Webhook retry cron error:", err.message);
  }
});

// Daily 04:00: completion safety net for subscriptions whose totalCount is exhausted
cron.schedule("0 4 * * *", async () => {
  try {
    const subs = await db.officeSubscription.findMany({
      where: {
        status: { in: ["ACTIVE", "AUTHENTICATED"] },
        remainingCount: { lte: 0 },
      },
      take: 200,
    });
    for (const sub of subs) {
      await db.$transaction(async (tx) => {
        await tx.officeSubscription.update({
          where: { id: sub.id },
          data: { status: "COMPLETED" },
        });
        await tx.officeBooking.update({
          where: { id: sub.bookingId },
          data: { status: "COMPLETED" },
        });
      });
    }
  } catch (err) {
    console.error("Office subscription completion cron error:", err.message);
  }
});
