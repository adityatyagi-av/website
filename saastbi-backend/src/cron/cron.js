import cron from "node-cron";
import db from "../db/db.js";
import { toMinutes } from "../utils/helperFunctions.js";
import { JobAlertService } from "../services/ecosystem/job/job-alert.service.js";
import { NotificationService } from "../services/common/notification.service.js";
import sendMail from "../config/sendMail.js";
import path from "path";
import "./office.cron.js";

cron.schedule("*/5 * * * *", async () => {
  const now = new Date();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

  // 1. Mark old-date bookings as completed
  await db.facilityBooking.updateMany({
    where: {
      status: "APPROVED",
      date: { lt: today }
    },
    data: { status: "COMPLETED" }
  });

  // 2. Mark today's bookings whose endMinutes < nowMinutes as completed
  await db.facilityBooking.updateMany({
    where: {
      status: "APPROVED",
      date: today,
      endMinutes: { lt: nowMinutes }
    },
    data: { status: "COMPLETED" }
  });
});

cron.schedule("0 * * * *", async () => {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

  await db.facilityBooking.updateMany({
    where: {
      status: "PENDING",
      createdAt: { lt: cutoff }
    },
    data: { status: "REJECTED", comment: "Auto-rejected due to inactivity" }
  });
});


cron.schedule("*/15 * * * *", async () => {
  try {
    const now = new Date();
    await db.event.updateMany({
      where: {
        status: "PUBLISHED",
        endDate: { lt: now },
      },
      data: { status: "COMPLETED" },
    });
  } catch (err) {
    console.error("Event auto-complete cron error:", err.message);
  }
});

cron.schedule("*/10 * * * *", async () => {
  try {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    const stalePayments = await db.eventPayment.findMany({
      where: { status: "PENDING", createdAt: { lt: cutoff } },
      select: { id: true, registrationId: true, registration: { select: { ticketTypeId: true } } },
    });

    for (const payment of stalePayments) {
      await db.$transaction(async (tx) => {
        await tx.eventPayment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
        await tx.eventRegistration.update({ where: { id: payment.registrationId }, data: { status: "CANCELLED", cancelReason: "Payment timeout" } });
        if (payment.registration?.ticketTypeId) {
          await tx.eventTicketType.update({
            where: { id: payment.registration.ticketTypeId },
            data: { quantitySold: { decrement: 1 } },
          });
        }
      });
    }
  } catch (err) {
    console.error("Stale payment cleanup cron error:", err.message);
  }
});

cron.schedule("*/5 * * * *", async () => {
  try {
    const events = await db.event.findMany({
      where: {
        status: "PUBLISHED",
        allowWaitlist: true,
        capacity: { not: null },
      },
      select: { id: true, capacity: true, registrationCount: true, requiresApproval: true },
    });

    for (const event of events) {
      if (event.registrationCount >= event.capacity) continue;

      const slotsAvailable = event.capacity - event.registrationCount;
      const waitlisted = await db.eventRegistration.findMany({
        where: { eventId: event.id, status: "WAITLISTED" },
        orderBy: { createdAt: "asc" },
        take: slotsAvailable,
      });

      for (const reg of waitlisted) {
        const newStatus = event.requiresApproval ? "REGISTERED" : "CONFIRMED";
        await db.eventRegistration.update({ where: { id: reg.id }, data: { status: newStatus } });
        if (newStatus === "CONFIRMED") {
          await db.event.update({ where: { id: event.id }, data: { registrationCount: { increment: 1 } } });
        }
      }
    }
  } catch (err) {
    console.error("Waitlist promotion cron error:", err.message);
  }
});

cron.schedule("0 * * * *", async () => {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const regs24h = await db.eventRegistration.findMany({
      where: {
        status: "CONFIRMED",
        reminder24hSent: false,
        event: { startDate: { gte: in24h, lt: in25h }, status: "PUBLISHED" },
      },
      select: {
        id: true,
        userId: true,
        user: { select: { firstName: true, lastName: true, email: true } },
        event: { select: { title: true, startDate: true, venue: true, meetingUrl: true, format: true } },
      },
    });

    if (regs24h.length > 0) {
      await db.eventRegistration.updateMany({
        where: { id: { in: regs24h.map((r) => r.id) } },
        data: { reminder24hSent: true },
      });

      for (const reg of regs24h) {
        if (!reg.user?.email || !reg.event) continue;
        const startDate = new Date(reg.event.startDate);
        try {
          await sendMail(
            reg.user.email,
            `Reminder: ${reg.event.title} starts in 24 hours`,
            path.resolve("src/mails/event-reminder.ejs"),
            {
              userName: `${reg.user.firstName || ""} ${reg.user.lastName || ""}`.trim() || "there",
              eventTitle: reg.event.title,
              timeUntil: "24 hours",
              eventDate: startDate.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }),
              eventTime: startDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
              venue: reg.event.venue || null,
              meetingUrl: reg.event.meetingUrl || null,
            },
          );
        } catch (_) {}

        NotificationService.send({
          recipientId: reg.userId,
          type: "EVENT_REMINDER",
          category: "EVENT",
          priority: "HIGH",
          title: "Event starting in 24 hours",
          message: `${reg.event.title} starts in 24 hours`,
          entityType: "Event",
          entityId: reg.id,
        }).catch(() => {});
      }
    }

    const in1h = new Date(now.getTime() + 60 * 60 * 1000);
    const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const regs1h = await db.eventRegistration.findMany({
      where: {
        status: "CONFIRMED",
        reminder1hSent: false,
        event: { startDate: { gte: in1h, lt: in2h }, status: "PUBLISHED" },
      },
      select: {
        id: true,
        userId: true,
        user: { select: { firstName: true, lastName: true, email: true } },
        event: { select: { title: true, startDate: true, venue: true, meetingUrl: true, format: true } },
      },
    });

    if (regs1h.length > 0) {
      await db.eventRegistration.updateMany({
        where: { id: { in: regs1h.map((r) => r.id) } },
        data: { reminder1hSent: true },
      });

      for (const reg of regs1h) {
        if (!reg.user?.email || !reg.event) continue;
        const startDate = new Date(reg.event.startDate);
        try {
          await sendMail(
            reg.user.email,
            `Reminder: ${reg.event.title} starts in 1 hour`,
            path.resolve("src/mails/event-reminder.ejs"),
            {
              userName: `${reg.user.firstName || ""} ${reg.user.lastName || ""}`.trim() || "there",
              eventTitle: reg.event.title,
              timeUntil: "1 hour",
              eventDate: startDate.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }),
              eventTime: startDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
              venue: reg.event.venue || null,
              meetingUrl: reg.event.meetingUrl || null,
            },
          );
        } catch (_) {}

        NotificationService.send({
          recipientId: reg.userId,
          type: "EVENT_REMINDER",
          category: "EVENT",
          priority: "HIGH",
          title: "Event starting in 1 hour",
          message: `${reg.event.title} starts in 1 hour`,
          entityType: "Event",
          entityId: reg.id,
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error("Event reminder cron error:", err.message);
  }
});

// ── Job Module Cron Jobs ──

// Auto-close expired jobs (every hour)
cron.schedule("0 * * * *", async () => {
  try {
    const now = new Date();
    const expiredJobs = await db.job.findMany({
      where: { status: "OPEN", deadline: { lt: now } },
      select: { id: true, pageId: true },
    });

    for (const job of expiredJobs) {
      await db.$transaction(async (tx) => {
        await tx.job.update({ where: { id: job.id }, data: { status: "CLOSED" } });

        const activeApps = await tx.jobApplication.findMany({
          where: { jobId: job.id, status: { in: ["APPLIED", "SCREENING"] } },
          select: { id: true, status: true },
        });

        for (const app of activeApps) {
          await tx.applicationTimeline.create({
            data: {
              applicationId: app.id,
              fromStatus: app.status,
              toStatus: app.status,
              changedById: app.id,
              note: "Job deadline expired",
            },
          });
        }

        if (job.pageId) {
          const openCount = await tx.job.count({ where: { pageId: job.pageId, status: "OPEN" } });
          await tx.page.update({
            where: { id: job.pageId },
            data: { openPositions: openCount, isHiring: openCount > 0 },
          });
        }
      });
    }
  } catch (err) {
    console.error("Job auto-close cron error:", err.message);
  }
});

// Process INSTANT job alerts (every 30 minutes)
cron.schedule("*/30 * * * *", async () => {
  try {
    await JobAlertService.processAlerts("INSTANT");
  } catch (err) {
    console.error("Instant job alert cron error:", err.message);
  }
});

// Process DAILY job alerts (every day at 8:00 AM)
cron.schedule("0 8 * * *", async () => {
  try {
    await JobAlertService.processAlerts("DAILY");
  } catch (err) {
    console.error("Daily job alert cron error:", err.message);
  }
});

// Process WEEKLY job alerts (every Monday at 8:00 AM)
cron.schedule("0 8 * * 1", async () => {
  try {
    await JobAlertService.processAlerts("WEEKLY");
  } catch (err) {
    console.error("Weekly job alert cron error:", err.message);
  }
});

// Job deadline reminder for employers (every day at 9:00 AM)
cron.schedule("0 9 * * *", async () => {
  try {
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const expiringJobs = await db.job.findMany({
      where: {
        status: "OPEN",
        deadline: { gte: now, lte: threeDaysLater },
      },
      include: {
        page: {
          select: {
            id: true,
            members: {
              where: { role: { in: ["OWNER", "ADMIN"] } },
              include: { user: { select: { email: true } } },
            },
          },
        },
      },
    });

    for (const job of expiringJobs) {
      const adminEmails = job.page?.members?.map((m) => m.user.email).filter(Boolean) || [];
      for (const email of adminEmails) {
        try {
          await sendMail(
            email,
            `Deadline approaching: ${job.title}`,
            path.resolve("src/mails/job-deadline-reminder.ejs"),
            {
              jobTitle: job.title,
              deadline: new Date(job.deadline).toLocaleDateString(),
              applicationCount: job.applicationCount,
              openPositions: job.numberOfOpenings,
            }
          );
        } catch (_) {}
      }
    }
  } catch (err) {
    console.error("Job deadline reminder cron error:", err.message);
  }
});

// Expire stale referrals (every day at midnight)
cron.schedule("0 0 * * *", async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await db.jobReferral.updateMany({
      where: {
        status: "PENDING",
        createdAt: { lt: thirtyDaysAgo },
      },
      data: { status: "EXPIRED" },
    });
  } catch (err) {
    console.error("Stale referral cleanup cron error:", err.message);
  }
});

// ── Community Module Cron Jobs ──

// Auto-unmute expired community mutes (every 15 minutes)
cron.schedule("*/15 * * * *", async () => {
  try {
    const now = new Date();
    await db.communityMember.updateMany({
      where: { mutedUntil: { lt: now, not: null } },
      data: { mutedUntil: null },
    });
  } catch (err) {
    console.error("Community auto-unmute cron error:", err.message);
  }
});

// Auto-unban expired temporary bans (every hour)
cron.schedule("0 * * * *", async () => {
  try {
    const now = new Date();
    const expiredBans = await db.communityBanLog.findMany({
      where: { action: "BAN", expiresAt: { lt: now, not: null } },
      select: { id: true, communityId: true, userId: true },
    });

    for (const ban of expiredBans) {
      const member = await db.communityMember.findUnique({
        where: { communityId_userId: { communityId: ban.communityId, userId: ban.userId } },
        select: { id: true, isBanned: true },
      });
      if (member?.isBanned) {
        await db.$transaction(async (tx) => {
          await tx.communityMember.update({
            where: { id: member.id },
            data: { isBanned: false, bannedAt: null, bannedReason: null, bannedBy: null },
          });
          await tx.community.update({
            where: { id: ban.communityId },
            data: { memberCount: { increment: 1 } },
          });
          await tx.communityBanLog.create({
            data: {
              communityId: ban.communityId,
              userId: ban.userId,
              action: "UNBAN",
              reason: "Automatic: ban duration expired",
              performedById: ban.userId,
            },
          });
        });
      }
    }
  } catch (err) {
    console.error("Community auto-unban cron error:", err.message);
  }
});

// Expire stale community invites (daily at midnight)
cron.schedule("0 0 * * *", async () => {
  try {
    const now = new Date();
    await db.communityInvite.updateMany({
      where: { status: "PENDING", expiresAt: { lt: now, not: null } },
      data: { status: "EXPIRED" },
    });
  } catch (err) {
    console.error("Community invite expiry cron error:", err.message);
  }
});

// Auto-reject stale join requests older than 30 days (daily at midnight)
cron.schedule("0 0 * * *", async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await db.communityJoinRequest.updateMany({
      where: { status: "PENDING", createdAt: { lt: thirtyDaysAgo } },
      data: { status: "REJECTED", reviewedAt: new Date() },
    });
  } catch (err) {
    console.error("Community stale join request cron error:", err.message);
  }
});

// Update weekly active member counts (daily at 2 AM)
cron.schedule("0 2 * * *", async () => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const communities = await db.community.findMany({
      where: { isSuspended: false },
      select: { id: true },
    });

    for (const community of communities) {
      const activeCount = await db.communityMember.count({
        where: { communityId: community.id, isBanned: false, lastSeenAt: { gte: weekAgo } },
      });
      await db.community.update({
        where: { id: community.id },
        data: { weeklyActiveMembers: activeCount },
      });
    }
  } catch (err) {
    console.error("Community weekly active members cron error:", err.message);
  }
});

// ── Notification Module Cron Jobs ──

// Delete expired notifications (daily at 3 AM)
cron.schedule("0 3 * * *", async () => {
  try {
    const now = new Date();
    const result = await db.notification.deleteMany({
      where: { expiresAt: { lt: now, not: null } },
    });
    if (result.count > 0) {
      console.log(`Notification cleanup: removed ${result.count} expired notifications`);
    }
  } catch (err) {
    console.error("Notification expiry cron error:", err.message);
  }
});

// Auto-archive old read notifications older than 30 days (daily at 3:30 AM)
cron.schedule("30 3 * * *", async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await db.notification.updateMany({
      where: {
        isRead: true,
        isArchived: false,
        createdAt: { lt: thirtyDaysAgo },
      },
      data: { isArchived: true },
    });
    if (result.count > 0) {
      console.log(`Notification archive: archived ${result.count} old read notifications`);
    }
  } catch (err) {
    console.error("Notification auto-archive cron error:", err.message);
  }
});

// Delete archived notifications older than 90 days (daily at 4 AM)
cron.schedule("0 4 * * *", async () => {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const result = await db.notification.deleteMany({
      where: {
        isArchived: true,
        createdAt: { lt: ninetyDaysAgo },
      },
    });
    if (result.count > 0) {
      console.log(`Notification purge: deleted ${result.count} old archived notifications`);
    }
  } catch (err) {
    console.error("Notification purge cron error:", err.message);
  }
});

// ── Subscription Module Cron Jobs ──

// Subscription renewal reminders (daily at 9:00 AM)
// WEEKLY plans: remind 2 days before
// MONTHLY plans: remind 2 days before
// YEARLY plans: remind 20 days before
cron.schedule("0 9 * * *", async () => {
  try {
    const now = new Date();

    const reminderWindows = [
      { type: "WEEKLY", daysBefore: 2 },
      { type: "MONTHLY", daysBefore: 2 },
      { type: "YEARLY", daysBefore: 20 },
    ];

    for (const window of reminderWindows) {
      const reminderDate = new Date(now);
      reminderDate.setDate(reminderDate.getDate() + window.daysBefore);

      const dayStart = new Date(reminderDate);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(reminderDate);
      dayEnd.setUTCHours(23, 59, 59, 999);

      const subscriptions = await db.subscription.findMany({
        where: {
          status: "ACTIVE",
          endDate: { gte: dayStart, lte: dayEnd },
          plan: { type: window.type },
        },
        include: {
          plan: true,
          tenant: {
            include: {
              userMemberships: {
                where: { isAdmin: true, isActive: true },
                include: {
                  incubationUser: { select: { id: true,email: true, name: true } },
                },
              },
            },
          },
        },
      });

      for (const sub of subscriptions) {
        const daysRemaining = Math.max(1, Math.ceil((new Date(sub.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

        const adminEmails = sub.tenant.userMemberships
          .map((m) => m.incubationUser?.email)
          .filter(Boolean);

        const recipientIds = sub.tenant.userMemberships
          .map((m) => m.incubationUser?.id)
          .filter(Boolean);

        for (const email of adminEmails) {
          try {
            await sendMail(
              email,
              `Subscription renewal in ${daysRemaining} day${daysRemaining > 1 ? "s" : ""} - ${sub.plan.name}`,
              path.resolve("src/mails/subscription-renewal-reminder.ejs"),
              {
                organizationName: sub.tenant.organizationName,
                planName: sub.plan.name,
                planType: sub.plan.type,
                planPrice: sub.plan.price,
                daysRemaining,
                renewalDate: new Date(sub.endDate).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }),
              }
            );
          } catch (_) {}
        }

        const notificationKey =
        `subscription-expiry-${sub.id}-${daysRemaining}`;

        const alreadySent = await db.notification.findFirst({
            where: {
              type: "SUBSCRIPTION_EXPIRING",
              entityId: sub.id,
              groupKey: notificationKey,
            },
            select: {
              id: true,
            },
          });

        if (
          recipientIds.length > 0 &&
          !alreadySent
        ) {
          await NotificationService.sendBulk({
            recipientIds,
            type: "SUBSCRIPTION_EXPIRING",
            category: "PAYMENT",
            priority: "HIGH",
            title: "Subscription Expiring Soon",
            message: `Your ${sub.plan.name} plan will expire in ${daysRemaining} day${daysRemaining > 1 ? "s" : ""}.`,
            entityType: "Subscription",
            entityId: sub.id,
            groupKey: notificationKey,
            actionUrl: "/portal/plans",
          });
        }
      }
    }
  } catch (err) {
    console.error("Subscription renewal reminder cron error:", err.message);
  }
});

// Session reminders - notify 1 hour before (every 15 minutes)
cron.schedule("*/15 * * * *", async () => {
  try {
    const now = new Date();
    const in1h = new Date(now.getTime() + 60 * 60 * 1000);
    const in75m = new Date(now.getTime() + 75 * 60 * 1000);

    const upcomingSessions = await db.mentorSession.findMany({
      where: {
        status: "CONFIRMED",
        startTime: { gte: in1h, lt: in75m },
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        mentorId: true,
        userId: true,
        startupId: true,
        mentor: {
          select: { userId: true },
        },
      },
    });

    for (const session of upcomingSessions) {
      const alreadySent = await db.notification.findFirst({
        where: {
          entityType: "MentorSession",
          entityId: session.id,
          type: "SESSION_REMINDER",
        },
        select: { id: true },
      });

      if (alreadySent) continue;

      NotificationService.send({
        recipientId: session.mentor.userId,
        type: "SESSION_REMINDER",
        category: "MENTORSHIP",
        priority: "HIGH",
        title: "Session Starting Soon",
        message: `Your session "${session.title}" starts in about 1 hour`,
        actionUrl: `/mentor/sessions/${session.id}`,
        entityType: "MentorSession",
        entityId: session.id,
      }).catch(() => {});

      if (session.userId) {
        NotificationService.send({
          recipientId: session.userId,
          type: "SESSION_REMINDER",
          category: "MENTORSHIP",
          priority: "HIGH",
          title: "Session Starting Soon",
          message: `Your session "${session.title}" starts in about 1 hour`,
          actionUrl: `/sessions/${session.id}`,
          entityType: "MentorSession",
          entityId: session.id,
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error("Session reminder cron error:", err.message);
  }
});

// Cleanup expired user sessions (daily at 4:30 AM)
cron.schedule("30 4 * * *", async () => {
  try {
    const result = await db.userSession.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (result.count > 0) {
      console.log(`Session cleanup: removed ${result.count} expired sessions`);
    }
  } catch (err) {
    console.error("Session cleanup cron error:", err.message);
  }
});

