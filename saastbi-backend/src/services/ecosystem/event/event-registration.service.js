import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { buildQueryOptions } from "../../../utils/queryHelper.js";
import { RazorpayService } from "../../common/razorpay.service.js";
import { NotificationService } from "../../common/notification.service.js";
import { checkEventPermission } from "../../../utils/eventHelpers.js";
import sendMail from "../../../config/sendMail.js";
import path from "path";
import crypto from "crypto";

async function autoPromoteWaitlist(eventId) {
  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { capacity: true, registrationCount: true, requiresApproval: true },
  });
  if (!event || !event.capacity) return;
  if (event.registrationCount >= event.capacity) return;

  const slotsAvailable = event.capacity - event.registrationCount;
  const waitlisted = await db.eventRegistration.findMany({
    where: { eventId, status: "WAITLISTED" },
    orderBy: { createdAt: "asc" },
    take: slotsAvailable,
  });

  for (const reg of waitlisted) {
    const newStatus = event.requiresApproval ? "REGISTERED" : "CONFIRMED";
    await db.eventRegistration.update({
      where: { id: reg.id },
      data: { status: newStatus },
    });
    if (newStatus === "CONFIRMED") {
      await db.event.update({
        where: { id: eventId },
        data: { registrationCount: { increment: 1 } },
      });
    }
  }
}

export const EventRegistrationService = {
  registerForEvent: async (userId, eventId, data) => {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: {
        id: true, status: true, capacity: true, registrationCount: true,
        requiresApproval: true, allowWaitlist: true, autoConfirm: true,
        registrationDeadline: true, isPaid: true, startDate: true,
      },
    });
    if (!event) throw new ApiError(404, "Event not found");
    if (event.status !== "PUBLISHED") throw new ApiError(400, "Event is not accepting registrations");
    if (event.registrationDeadline && new Date() > new Date(event.registrationDeadline)) {
      throw new ApiError(400, "Registration deadline has passed");
    }
    if (event.startDate && new Date() > new Date(event.startDate)) {
      throw new ApiError(400, "Event has already started");
    }

    const existing = await db.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    if (existing && existing.status !== "CANCELLED") {
      throw new ApiError(409, "You are already registered for this event");
    }

    let ticketInfo = { ticketTypeId: null, ticketName: null, ticketPrice: 0 };
    if (data.ticketTypeId) {
      const ticket = await db.eventTicketType.findUnique({ where: { id: data.ticketTypeId } });
      if (!ticket || ticket.eventId !== eventId) throw new ApiError(404, "Ticket type not found");
      if (!ticket.isActive) throw new ApiError(400, "Ticket type is not active");
      if (ticket.quantitySold >= ticket.quantity) throw new ApiError(400, "Ticket type is sold out");
      const now = new Date();
      if (ticket.saleStartDate && now < new Date(ticket.saleStartDate)) throw new ApiError(400, "Ticket sale has not started");
      if (ticket.saleEndDate && now > new Date(ticket.saleEndDate)) throw new ApiError(400, "Ticket sale has ended");
      ticketInfo = { ticketTypeId: ticket.id, ticketName: ticket.name, ticketPrice: ticket.price };
    }

    const isFull = event.capacity && event.registrationCount >= event.capacity;

    if (isFull && !event.allowWaitlist) {
      throw new ApiError(400, "Event is at full capacity");
    }

    let status;
    if (isFull) {
      status = "WAITLISTED";
    } else if (event.requiresApproval) {
      status = "REGISTERED";
    } else if (event.autoConfirm) {
      status = "CONFIRMED";
    } else {
      status = "REGISTERED";
    }

    const isPaidTicket = event.isPaid && ticketInfo.ticketPrice > 0;
    if (isPaidTicket && status !== "WAITLISTED") {
      status = "REGISTERED";
    }

    const registration = await db.$transaction(async (tx) => {
      let reg;
      if (existing && existing.status === "CANCELLED") {
        reg = await tx.eventRegistration.update({
          where: { id: existing.id },
          data: {
            status,
            ticketTypeId: ticketInfo.ticketTypeId,
            ticketName: ticketInfo.ticketName,
            ticketPrice: ticketInfo.ticketPrice,
            cancelReason: null,
            cancelledAt: null,
            rejectionNote: null,
          },
        });
      } else {
        reg = await tx.eventRegistration.create({
          data: {
            eventId,
            userId,
            status,
            ticketTypeId: ticketInfo.ticketTypeId,
            ticketName: ticketInfo.ticketName,
            ticketPrice: ticketInfo.ticketPrice,
          },
        });
      }

      if (status === "CONFIRMED") {
        await tx.event.update({ where: { id: eventId }, data: { registrationCount: { increment: 1 } } });
      }

      if (ticketInfo.ticketTypeId && status !== "WAITLISTED") {
        await tx.eventTicketType.update({
          where: { id: ticketInfo.ticketTypeId },
          data: { quantitySold: { increment: 1 } },
        });
      }

      if (isPaidTicket && status !== "WAITLISTED") {
        const order = await RazorpayService.createOrder({
          amount: ticketInfo.ticketPrice,
          currency: "INR",
          receipt: `event_${reg.id}`,
          notes: { eventId, registrationId: reg.id, userId },
        });

        const payment = await tx.eventPayment.create({
          data: {
            registrationId: reg.id,
            userId,
            eventId,
            amount: ticketInfo.ticketPrice,
            currency: "INR",
            razorpayOrderId: order.id,
            status: "PENDING",
          },
        });

        return { registration: reg, payment, razorpayOrder: order, requiresPayment: true };
      }

      return { registration: reg, requiresPayment: false };
    });

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true },
    });
    const eventInfo = await db.event.findUnique({
      where: { id: eventId },
      select: { title: true, slug: true, startDate: true, venue: true, format: true },
    });

    if (user?.email && eventInfo) {
      const startDate = new Date(eventInfo.startDate);
      sendMail(
        user.email,
        `Registration confirmed: ${eventInfo.title}`,
        path.resolve("src/mails/event-registration.ejs"),
        {
          userName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "there",
          eventTitle: eventInfo.title,
          eventDate: startDate.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }),
          eventTime: startDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
          venue: eventInfo.venue || null,
          ticketType: ticketInfo.ticketName || null,
          status: registration.registration?.status || status,
        },
      ).catch(() => {});

      if (registration.registration?.status === "CONFIRMED") {
        await NotificationService.send({
          recipientId: userId,
          type: "EVENT_REGISTRATION_CONFIRMED",
          category: "EVENT",
          priority: "HIGH",
          title: "Registration Confirmed",
          message: `Your registration for ${eventInfo.title} has been confirmed.`,
          actionUrl: `/events/${eventInfo.slug || eventId}`,
          entityType: "EVENT",
          entityId: eventId,
        });
      }
    }

    return registration;
  },

  verifyPayment: async (userId, eventId, data) => {
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = data;
    if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      throw new ApiError(400, "Payment verification details are required");
    }

    const payment = await db.eventPayment.findFirst({
      where: { eventId, userId, razorpayOrderId, status: "PENDING" },
      include: { registration: true },
    });
    if (!payment) throw new ApiError(404, "Payment not found");

    const isValid = RazorpayService.verifyOrderPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });
    if (!isValid) throw new ApiError(400, "Payment verification failed");

    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { requiresApproval: true },
    });

    const regStatus = event.requiresApproval ? "REGISTERED" : "CONFIRMED";

    return db.$transaction(async (tx) => {
      await tx.eventPayment.update({
        where: { id: payment.id },
        data: {
          razorpayPaymentId,
          razorpaySignature,
          status: "COMPLETED",
          paidAt: new Date(),
        },
      });

      const updated = await tx.eventRegistration.update({
        where: { id: payment.registrationId },
        data: { status: regStatus },
        include: { event: { select: { title: true } } },
      });

      if (regStatus === "CONFIRMED") {
        await tx.event.update({ where: { id: eventId }, data: { registrationCount: { increment: 1 } } });
      }

      return updated;
    });
  },

  cancelRegistration: async (userId, eventId, reason) => {
    const reg = await db.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
      include: { payment: true },
    });
    if (!reg) throw new ApiError(404, "Registration not found");
    if (reg.status === "CANCELLED") throw new ApiError(400, "Registration is already cancelled");

    return db.$transaction(async (tx) => {
      const wasConfirmed = reg.status === "CONFIRMED";

      await tx.eventRegistration.update({
        where: { id: reg.id },
        data: { status: "CANCELLED", cancelReason: reason || "Cancelled by user", cancelledAt: new Date() },
      });

      if (wasConfirmed) {
        await tx.event.update({ where: { id: eventId }, data: { registrationCount: { decrement: 1 } } });
      }

      if (reg.ticketTypeId) {
        await tx.eventTicketType.update({
          where: { id: reg.ticketTypeId },
          data: { quantitySold: { decrement: 1 } },
        });
      }

      let refundInfo = null;
      if (reg.payment && reg.payment.status === "COMPLETED" && reg.payment.razorpayPaymentId) {
        const event = await tx.event.findUnique({ where: { id: eventId }, select: { startDate: true } });
        const hoursUntilEvent = (new Date(event.startDate).getTime() - Date.now()) / (1000 * 60 * 60);

        let refundAmount = 0;
        if (hoursUntilEvent > 48) refundAmount = reg.payment.amount;
        else if (hoursUntilEvent > 24) refundAmount = reg.payment.amount * 0.5;

        if (refundAmount > 0) {
          try {
            const refund = await RazorpayService.createRefund({
              paymentId: reg.payment.razorpayPaymentId,
              amount: refundAmount,
              notes: { eventId, registrationId: reg.id, reason: "User cancelled registration" },
            });

            await tx.eventPayment.update({
              where: { id: reg.payment.id },
              data: {
                refundId: refund.id,
                refundAmount,
                refundStatus: "PROCESSING",
                status: "REFUNDED",
              },
            });
            refundInfo = { refundId: refund.id, refundAmount };
          } catch (err) {
            console.error("Refund failed:", err);
          }
        }
      }

      return { message: "Registration cancelled", refundInfo };
    });
  },

  approveRegistrations: async (userId, eventId, registrationIds) => {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, authorId: true, pageId: true, capacity: true, registrationCount: true },
    });
    if (!event) throw new ApiError(404, "Event not found");

    const hasPermission = await checkEventPermission(event, userId);
    if (!hasPermission) throw new ApiError(403, "Not authorized");

    const regs = await db.eventRegistration.findMany({
      where: { id: { in: registrationIds }, eventId, status: "REGISTERED" },
    });
    if (regs.length === 0) throw new ApiError(400, "No pending registrations found");

    const availableSlots = event.capacity ? event.capacity - event.registrationCount : regs.length;
    const toApprove = regs.slice(0, availableSlots);
    const toWaitlist = regs.slice(availableSlots);

    const result = await db.$transaction(async (tx) => {
      if (toApprove.length > 0) {
        await tx.eventRegistration.updateMany({
          where: { id: { in: toApprove.map((r) => r.id) } },
          data: { status: "CONFIRMED" },
        });
        await tx.event.update({
          where: { id: eventId },
          data: { registrationCount: { increment: toApprove.length } },
        });
      }

      if (toWaitlist.length > 0 && event.capacity) {
        await tx.eventRegistration.updateMany({
          where: { id: { in: toWaitlist.map((r) => r.id) } },
          data: { status: "WAITLISTED" },
        });
      }

      return { approved: toApprove.length, waitlisted: toWaitlist.length };
    });

    // Send EVENT_REGISTRATION_CONFIRMED to approved users
    if (toApprove.length > 0) {
      const eventInfo = await db.event.findUnique({ where: { id: eventId }, select: { title: true, slug: true } });
      NotificationService.sendBulk({
        recipientIds: toApprove.map((r) => r.userId),
        type: "EVENT_REGISTRATION_CONFIRMED",
        category: "EVENT",
        title: "Registration confirmed",
        message: `Your registration for ${eventInfo?.title || "the event"} has been confirmed`,
        actionUrl: `/events/${eventInfo?.slug || eventId}`,
        entityType: "Event",
        entityId: eventId,
      }).catch(() => {});
    }

    return result;
  },

  rejectRegistrations: async (userId, eventId, registrationIds, rejectionNote) => {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, authorId: true, pageId: true },
    });
    if (!event) throw new ApiError(404, "Event not found");

    const hasPermission = await checkEventPermission(event, userId);
    if (!hasPermission) throw new ApiError(403, "Not authorized");

    const result = await db.eventRegistration.updateMany({
      where: { id: { in: registrationIds }, eventId, status: { in: ["REGISTERED", "WAITLISTED"] } },
      data: { status: "CANCELLED", rejectionNote: rejectionNote || "Rejected by host", cancelledAt: new Date() },
    });

    return { rejected: result.count };
  },

  promoteFromWaitlist: async (userId, eventId, count = 1) => {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, authorId: true, pageId: true, capacity: true, registrationCount: true },
    });
    if (!event) throw new ApiError(404, "Event not found");

    const hasPermission = await checkEventPermission(event, userId);
    if (!hasPermission) throw new ApiError(403, "Not authorized");

    const waitlisted = await db.eventRegistration.findMany({
      where: { eventId, status: "WAITLISTED" },
      orderBy: { createdAt: "asc" },
      take: count,
    });

    if (waitlisted.length === 0) return { promoted: 0 };

    const result = await db.$transaction(async (tx) => {
      await tx.eventRegistration.updateMany({
        where: { id: { in: waitlisted.map((r) => r.id) } },
        data: { status: "CONFIRMED" },
      });
      await tx.event.update({
        where: { id: eventId },
        data: { registrationCount: { increment: waitlisted.length } },
      });
      return { promoted: waitlisted.length };
    });

    // Send EVENT_WAITLIST_PROMOTED to promoted users
    if (waitlisted.length > 0) {
      const eventInfo = await db.event.findUnique({ where: { id: eventId }, select: { title: true, slug: true } });
      NotificationService.sendBulk({
        recipientIds: waitlisted.map((r) => r.userId),
        type: "EVENT_WAITLIST_PROMOTED",
        category: "EVENT",
        title: "You're in!",
        message: `You've been promoted from the waitlist for ${eventInfo?.title || "the event"}`,
        actionUrl: `/events/${eventInfo?.slug || eventId}`,
        entityType: "Event",
        entityId: eventId,
      }).catch(() => {});
    }

    return result;
  },

  getRegistrations: async (userId, eventId, query) => {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, authorId: true, pageId: true },
    });
    if (!event) throw new ApiError(404, "Event not found");

    const hasPermission = await checkEventPermission(event, userId);
    if (!hasPermission) throw new ApiError(403, "Not authorized");

    const { skip, take, where: searchWhere } = buildQueryOptions({
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ["user.firstName", "user.lastName", "user.email"],
    });

    const filter = { eventId, ...searchWhere };
    if (query.status) filter.status = query.status;
    if (query.ticketName) filter.ticketName = query.ticketName;

    const [registrations, total] = await Promise.all([
      db.eventRegistration.findMany({
        where: filter,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true, profilePhoto: true, username: true },
          },
          ticketType: { select: { name: true, price: true } },
          payment: { select: { status: true, amount: true, paidAt: true } },
        },
      }),
      db.eventRegistration.count({ where: filter }),
    ]);

    return {
      data: registrations,
      pagination: {
        total,
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 10,
        totalPages: Math.ceil(total / (Number(query.limit) || 10)),
      },
    };
  },

  getRegistrationStatus: async (userId, eventId) => {
    const reg = await db.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
      select: { id: true, status: true, ticketName: true, ticketPrice: true, payment: { select: { status: true } } },
    });
    return reg;
  },

  checkIn: async (userId, eventId, registrationId) => {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, authorId: true, pageId: true },
    });
    if (!event) throw new ApiError(404, "Event not found");

    const hasPermission = await checkEventPermission(event, userId);
    if (!hasPermission) throw new ApiError(403, "Not authorized");

    const reg = await db.eventRegistration.findUnique({ where: { id: registrationId } });
    if (!reg || reg.eventId !== eventId) throw new ApiError(404, "Registration not found");
    if (reg.status !== "CONFIRMED") throw new ApiError(400, "Only confirmed registrations can be checked in");

    return db.eventRegistration.update({
      where: { id: registrationId },
      data: { status: "ATTENDED", attendedAt: new Date(), checkedInAt: new Date() },
    });
  },

  bulkCheckIn: async (userId, eventId, registrationIds) => {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, authorId: true, pageId: true },
    });
    if (!event) throw new ApiError(404, "Event not found");

    const hasPermission = await checkEventPermission(event, userId);
    if (!hasPermission) throw new ApiError(403, "Not authorized");

    const result = await db.eventRegistration.updateMany({
      where: { id: { in: registrationIds }, eventId, status: "CONFIRMED" },
      data: { status: "ATTENDED", attendedAt: new Date(), checkedInAt: new Date() },
    });

    return { checkedIn: result.count };
  },

  exportRegistrations: async (userId, eventId) => {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, authorId: true, pageId: true, title: true },
    });
    if (!event) throw new ApiError(404, "Event not found");

    const hasPermission = await checkEventPermission(event, userId);
    if (!hasPermission) throw new ApiError(403, "Not authorized");

    const registrations = await db.eventRegistration.findMany({
      where: { eventId },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { firstName: true, lastName: true, email: true, phone: true } },
        ticketType: { select: { name: true, price: true } },
        payment: { select: { status: true, amount: true, paidAt: true } },
      },
    });

    return {
      eventTitle: event.title,
      totalRegistrations: registrations.length,
      registrations: registrations.map((r) => ({
        name: `${r.user.firstName || ""} ${r.user.lastName || ""}`.trim(),
        email: r.user.email,
        phone: r.user.phone,
        status: r.status,
        ticketType: r.ticketType?.name || "N/A",
        ticketPrice: r.ticketType?.price || 0,
        paymentStatus: r.payment?.status || "N/A",
        registeredAt: r.createdAt,
        checkedInAt: r.checkedInAt,
      })),
    };
  },

  getRegistrationSummary: async (userId, eventId) => {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, authorId: true, pageId: true },
    });
    if (!event) throw new ApiError(404, "Event not found");

    const hasPermission = await checkEventPermission(event, userId);
    if (!hasPermission) throw new ApiError(403, "Not authorized");

    const counts = await db.eventRegistration.groupBy({
      by: ["status"],
      where: { eventId },
      _count: { id: true },
    });

    const summary = {};
    for (const c of counts) {
      summary[c.status] = c._count.id;
    }

    return {
      summary,
      canManage: hasPermission,
    };
  },

  getUserRegistrations: async (userId, query) => {
    const { skip, take } = buildQueryOptions({ page: query.page, limit: query.limit });

    const filter = { userId, status: { in: ["CONFIRMED", "REGISTERED", "WAITLISTED"] } };

    const counts = await db.eventRegistration.groupBy({
      by: ["status"],
      where: { userId },
      _count: { id: true },
    });

    const summary = { approved: 0, pending: 0, total: 0 };
    for (const c of counts) {
      if (c.status === "CONFIRMED" || c.status === "ATTENDED") summary.approved += c._count.id;
      else if (c.status === "REGISTERED" || c.status === "WAITLISTED") summary.pending += c._count.id;
      summary.total += c._count.id;
    }

    const [registrations, total] = await Promise.all([
      db.eventRegistration.findMany({
        where: filter,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          event: {
            select: { id: true, title: true, coverImage: true, startDate: true, slug: true },
          },
        },
      }),
      db.eventRegistration.count({ where: filter }),
    ]);

    return {
      summary,
      data: registrations,
      pagination: {
        total,
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 10,
        totalPages: Math.ceil(total / (Number(query.limit) || 10)),
      },
    };
  },
};
