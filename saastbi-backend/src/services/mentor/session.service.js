import db from "../../db/db.js";
import { ApiError } from "../../utils/ApiError.js";
import { buildQueryOptions } from "../../utils/queryHelper.js";
import {
  calculateRefundAmount,
  calculatePlatformFee,
  calculateSessionPrice,
  getHoursUntilSession,
  calculateExtensionPrice,
} from "../../utils/mentor/calculations.js";
import { isSlotAvailable } from "../../utils/mentor/availability.js";
import { generateMeetingRoomId, generateMeetingUrl } from "../../utils/mentor/jitsi.js";
import { addMinutes } from "date-fns";
import { NotificationService } from "../common/notification.service.js";

export const SessionService = {
  book: async (menteeUserId, mentorId, data) => {
    const mentor = await db.mentorProfile.findUnique({
      where: { id: mentorId },
      select: {
        id: true,
        userId: true,
        isAccepting: true,
        autoConfirm: true,
        minBookingNotice: true,
        bufferBetweenSessions: true,
        maxBookingsPerDay: true,
      },
    });

    if (!mentor) {
      throw new ApiError(404, "Mentor not found");
    }

    if (!mentor.isAccepting) {
      throw new ApiError(400, "Mentor is not accepting bookings");
    }

    const sessionType = await db.sessionType.findUnique({
      where: { id: data.sessionTypeId },
    });

    if (!sessionType || !sessionType.isActive) {
      throw new ApiError(404, "Session type not found or inactive");
    }

    if (sessionType.mentorId !== mentorId) {
      throw new ApiError(400, "Session type does not belong to this mentor");
    }

    const startTime = new Date(data.startTime);
    const endTime = addMinutes(startTime, sessionType.duration);
    const hoursUntilSession = getHoursUntilSession(startTime);

    if (hoursUntilSession < mentor.minBookingNotice) {
      throw new ApiError(
        400,
        `Bookings require at least ${mentor.minBookingNotice} hours notice`
      );
    }

    const availability = await db.mentorAvailability.findMany({
      where: { mentorId, isActive: true },
    });

    const existingSessions = await db.mentorSession.findMany({
      where: {
        mentorId,
        status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
        startTime: {
          gte: new Date(startTime.toDateString()),
          lt: new Date(new Date(startTime).setDate(startTime.getDate() + 1)),
        },
      },
      select: { startTime: true, endTime: true },
    });

    const slotAvailable = isSlotAvailable({
      slotStart: startTime,
      slotEnd: endTime,
      availabilitySlots: availability,
      existingSessions,
      bufferMinutes: mentor.bufferBetweenSessions,
    });

    if (!slotAvailable) {
      throw new ApiError(400, "Selected time slot is not available");
    }

    if (mentor.maxBookingsPerDay) {
      if (existingSessions.length >= mentor.maxBookingsPerDay) {
        throw new ApiError(400, "Mentor has reached maximum bookings for this day");
      }
    }

    let menteeId = menteeUserId;
    let userId = menteeUserId;
    let startupId = null;
    let bookingContext = "DIRECT";
    let pricingDetails = {
      menteePayment: sessionType.price,
      incubatorPayment: 0,
      source: "DIRECT",
    };
    let packageSubscription = null;
    let incubatorAssociation = null;

    if (data.menteeType === "STARTUP") {
      if (!data.startupId) {
        throw new ApiError(400, "Startup ID required for startup bookings");
      }

      const membership = await db.startupMember.findFirst({
        where: {
          startupId: data.startupId,
          userId: menteeUserId,
          isActive: true,
        },
      });

      if (!membership) {
        throw new ApiError(403, "You are not a member of this startup");
      }

      menteeId = data.startupId;
      startupId = data.startupId;

      const startupIncubator = await db.tenantStartupAssociation.findFirst({
        where: { startupId: data.startupId, isActive: true },
        select: { tenantId: true },
      });

      if (startupIncubator) {
        incubatorAssociation = await db.incubatorMentorAssociation.findFirst({
          where: {
            mentorProfileId: mentorId,
            tenantId: startupIncubator.tenantId,
            status: "ACTIVE",
          },
        });

        if (incubatorAssociation) {
          bookingContext = "INCUBATOR";
          pricingDetails = calculateSessionPrice({
            basePrice: incubatorAssociation.agreedRate || sessionType.price,
            paymentModel: incubatorAssociation.paymentModel,
            incubatorSharePercent: incubatorAssociation.incubatorSharePercent,
          });
        }
      }
    }

    if (data.packageSubscriptionId) {
      packageSubscription = await db.packageSubscription.findUnique({
        where: { id: data.packageSubscriptionId },
        include: { package: true },
      });

      if (!packageSubscription) {
        throw new ApiError(404, "Package subscription not found");
      }

      if (packageSubscription.status !== "ACTIVE") {
        throw new ApiError(400, "Package subscription is not active");
      }

      if (packageSubscription.sessionsRemaining <= 0) {
        throw new ApiError(400, "No sessions remaining in package");
      }

      if (new Date() > packageSubscription.expiresAt) {
        throw new ApiError(400, "Package subscription has expired");
      }

      const isCorrectSubscriber =
        (data.menteeType === "USER" && packageSubscription.userId === menteeUserId) ||
        (data.menteeType === "STARTUP" && packageSubscription.startupId === data.startupId);

      if (!isCorrectSubscriber) {
        throw new ApiError(403, "This package subscription does not belong to you");
      }

      bookingContext = "PACKAGE";
      pricingDetails = { menteePayment: 0, incubatorPayment: 0, source: "PACKAGE" };
    }

    const meetingRoomId = generateMeetingRoomId(`${mentorId}-${Date.now()}`);

    const session = await db.$transaction(async (tx) => {
      const newSession = await tx.mentorSession.create({
        data: {
          mentorId,
          sessionTypeId: data.sessionTypeId,
          menteeType: data.menteeType || "USER",
          menteeId,
          userId: data.menteeType === "STARTUP" ? null : userId,
          startupId,
          title: sessionType.name,
          description: sessionType.description,
          startTime,
          endTime,
          duration: sessionType.duration,
          timezone: "Asia/Kolkata",
          agenda: data.agenda,
          preSessionNotes: data.preSessionNotes,
          status: mentor.autoConfirm ? "CONFIRMED" : "PENDING",
          price: pricingDetails.menteePayment,
          currency: sessionType.currency,
          bookingContext,
          incubatorAssociationId: incubatorAssociation?.id,
          meetingRoomId,
          meetingUrl: generateMeetingUrl(meetingRoomId),
        },
        include: {
          mentor: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  profilePhoto: true,
                },
              },
            },
          },
          sessionType: true,
        },
      });

      if (packageSubscription) {
        await tx.packageSubscription.update({
          where: { id: packageSubscription.id },
          data: {
            sessionsUsed: { increment: 1 },
            sessionsRemaining: { decrement: 1 },
          },
        });
      }

      return newSession;
    });

    NotificationService.send({
      recipientId: mentor.userId,
      type: "SESSION_BOOKED",
      category: "MENTORSHIP",
      priority: "HIGH",
      title: "New Session Booking",
      message: `You have a new ${mentor.autoConfirm ? "confirmed" : "pending"} session booking`,
      actionUrl: `/mentor/sessions/${session.id}`,
      actorId: menteeUserId,
      entityType: "MentorSession",
      entityId: session.id,
    }).catch(() => {});

    return session;
  },

  confirm: async (userId, sessionId, notes) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const session = await db.mentorSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new ApiError(404, "Session not found");
    }

    if (session.mentorId !== profile.id) {
      throw new ApiError(403, "Not authorized");
    }

    if (session.status !== "PENDING") {
      throw new ApiError(400, `Session is ${session.status}, cannot confirm`);
    }

    const updated = await db.mentorSession.update({
      where: { id: sessionId },
      data: {
        status: "CONFIRMED",
        notes,
      },
    });

    const menteeUserId = session.userId || (await getMenteeUserId(session));
    if (menteeUserId) {
      NotificationService.send({
        recipientId: menteeUserId,
        type: "SESSION_CONFIRMED",
        category: "MENTORSHIP",
        priority: "HIGH",
        title: "Session Confirmed",
        message: "Your mentoring session has been confirmed",
        actionUrl: `/sessions/${sessionId}`,
        actorId: userId,
        entityType: "MentorSession",
        entityId: sessionId,
      }).catch(() => {});
    }

    return updated;
  },

  decline: async (userId, sessionId, reason) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const session = await db.mentorSession.findUnique({
      where: { id: sessionId },
      include: { sessionType: true },
    });

    if (!session) {
      throw new ApiError(404, "Session not found");
    }

    if (session.mentorId !== profile.id) {
      throw new ApiError(403, "Not authorized");
    }

    if (session.status !== "PENDING") {
      throw new ApiError(400, `Session is ${session.status}, cannot decline`);
    }

    const updated = await db.$transaction(async (tx) => {
      const declined = await tx.mentorSession.update({
        where: { id: sessionId },
        data: {
          status: "CANCELLED",
          cancelledBy: userId,
          cancelledAt: new Date(),
          cancellationReason: reason,
        },
      });

      if (session.bookingContext === "PACKAGE") {
        const subscription = await tx.packageSubscription.findFirst({
          where: {
            OR: [
              { userId: session.userId },
              { startupId: session.startupId },
            ],
            status: "ACTIVE",
          },
        });

        if (subscription) {
          await tx.packageSubscription.update({
            where: { id: subscription.id },
            data: {
              sessionsUsed: { decrement: 1 },
              sessionsRemaining: { increment: 1 },
            },
          });
        }
      }

      return declined;
    });

    const menteeUserId = session.userId || (await getMenteeUserId(session));
    if (menteeUserId) {
      NotificationService.send({
        recipientId: menteeUserId,
        type: "SESSION_DECLINED",
        category: "MENTORSHIP",
        priority: "MEDIUM",
        title: "Session Declined",
        message: `Your session request was declined: ${reason}`,
        actionUrl: `/sessions`,
        actorId: userId,
        entityType: "MentorSession",
        entityId: sessionId,
      }).catch(() => {});
    }

    return updated;
  },

  cancel: async (userId, sessionId, reason, isMentor = false) => {
    let session;
    let cancelledByMentor = false;

    if (isMentor) {
      const profile = await db.mentorProfile.findUnique({
        where: { userId },
        select: { id: true },
      });

      session = await db.mentorSession.findUnique({
        where: { id: sessionId },
      });

      if (session?.mentorId === profile?.id) {
        cancelledByMentor = true;
      }
    } else {
      session = await db.mentorSession.findUnique({
        where: { id: sessionId },
      });

      if (session) {
        const isOwner =
          session.userId === userId ||
          (session.startupId &&
            (await db.startupMember.findFirst({
              where: { startupId: session.startupId, userId, isActive: true },
            })));

        if (!isOwner) {
          throw new ApiError(403, "Not authorized to cancel this session");
        }
      }
    }

    if (!session) {
      throw new ApiError(404, "Session not found");
    }

    if (!["PENDING", "CONFIRMED"].includes(session.status)) {
      throw new ApiError(400, `Cannot cancel session with status ${session.status}`);
    }

    const hoursUntilSession = getHoursUntilSession(session.startTime);
    let refundAmount = 0;

    if (session.price > 0 && session.paymentStatus === "PAID") {
      if (cancelledByMentor) {
        refundAmount = session.price;
      } else {
        refundAmount = calculateRefundAmount(session.price, hoursUntilSession);
      }
    }

    const updated = await db.$transaction(async (tx) => {
      const cancelled = await tx.mentorSession.update({
        where: { id: sessionId },
        data: {
          status: "CANCELLED",
          cancelledBy: userId,
          cancelledAt: new Date(),
          cancellationReason: reason,
          refundAmount,
          refundStatus: refundAmount > 0 ? "PENDING" : null,
        },
      });

      if (session.bookingContext === "PACKAGE") {
        const subscription = await tx.packageSubscription.findFirst({
          where: {
            OR: [
              { userId: session.userId },
              { startupId: session.startupId },
            ],
            status: "ACTIVE",
          },
        });

        if (subscription) {
          await tx.packageSubscription.update({
            where: { id: subscription.id },
            data: {
              sessionsUsed: { decrement: 1 },
              sessionsRemaining: { increment: 1 },
            },
          });
        }
      }

      return cancelled;
    });

    return {
      ...updated,
      refundAmount,
      refundPercentage: session.price > 0 ? Math.round((refundAmount / session.price) * 100) : 0,
    };
  },

  reschedule: async (userId, sessionId, newStartTime, reason) => {
    const session = await db.mentorSession.findUnique({
      where: { id: sessionId },
      include: { sessionType: true, mentor: true },
    });

    if (!session) {
      throw new ApiError(404, "Session not found");
    }

    const isMentor = await db.mentorProfile.findFirst({
      where: { userId, id: session.mentorId },
    });

    const isMentee =
      session.userId === userId ||
      (session.startupId &&
        (await db.startupMember.findFirst({
          where: { startupId: session.startupId, userId, isActive: true },
        })));

    if (!isMentor && !isMentee) {
      throw new ApiError(403, "Not authorized");
    }

    if (!["PENDING", "CONFIRMED"].includes(session.status)) {
      throw new ApiError(400, `Cannot reschedule session with status ${session.status}`);
    }

    const startTime = new Date(newStartTime);
    const endTime = addMinutes(startTime, session.duration);

    const availability = await db.mentorAvailability.findMany({
      where: { mentorId: session.mentorId, isActive: true },
    });

    const existingSessions = await db.mentorSession.findMany({
      where: {
        mentorId: session.mentorId,
        id: { not: sessionId },
        status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
        startTime: {
          gte: new Date(startTime.toDateString()),
          lt: new Date(new Date(startTime).setDate(startTime.getDate() + 1)),
        },
      },
      select: { startTime: true, endTime: true },
    });

    const slotAvailable = isSlotAvailable({
      slotStart: startTime,
      slotEnd: endTime,
      availabilitySlots: availability,
      existingSessions,
      bufferMinutes: session.mentor.bufferBetweenSessions,
    });

    if (!slotAvailable) {
      throw new ApiError(400, "New time slot is not available");
    }

    const updated = await db.mentorSession.update({
      where: { id: sessionId },
      data: {
        startTime,
        endTime,
        status: "RESCHEDULED",
        notes: reason ? `Rescheduled: ${reason}` : undefined,
      },
    });

    return updated;
  },

  updateNotes: async (userId, sessionId, data) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const session = await db.mentorSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.mentorId !== profile.id) {
      throw new ApiError(403, "Not authorized");
    }

    const updated = await db.mentorSession.update({
      where: { id: sessionId },
      data: {
        sessionNotes: data.sessionNotes,
        actionItems: data.actionItems,
      },
    });

    return updated;
  },

  complete: async (userId, sessionId, data) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const session = await db.mentorSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.mentorId !== profile.id) {
      throw new ApiError(403, "Not authorized");
    }

    if (!["CONFIRMED", "IN_PROGRESS"].includes(session.status)) {
      throw new ApiError(400, `Cannot complete session with status ${session.status}`);
    }

    const updated = await db.$transaction(async (tx) => {
      const completed = await tx.mentorSession.update({
        where: { id: sessionId },
        data: {
          status: "COMPLETED",
          actualEndTime: new Date(),
          actualDuration: data.actualDuration || session.duration,
          sessionNotes: data.sessionNotes,
          actionItems: data.actionItems,
        },
      });

      if (session.price > 0) {
        const { feePercent, feeAmount, netAmount } = calculatePlatformFee(
          session.price,
          session.bookingContext === "INCUBATOR" ? "INCUBATOR" : "DIRECT"
        );

        await tx.mentorEarning.create({
          data: {
            mentorId: session.mentorId,
            sessionId,
            menteeId: session.menteeId,
            menteeName: "Session Mentee",
            sessionType: session.title || "Session",
            grossAmount: session.price,
            platformFee: feeAmount,
            platformFeePercent: feePercent,
            netAmount,
            currency: session.currency,
            status: "PENDING",
            source: session.bookingContext === "INCUBATOR" ? "INCUBATOR" : "DIRECT",
            incubatorAssociationId: session.incubatorAssociationId,
          },
        });
      }

      await tx.mentorProfile.update({
        where: { id: session.mentorId },
        data: {
          totalSessions: { increment: 1 },
          completedSessions: { increment: 1 },
        },
      });

      return completed;
    });

    return updated;
  },

  extend: async (userId, sessionId, extensionMinutes, isFree) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const session = await db.mentorSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.mentorId !== profile.id) {
      throw new ApiError(403, "Not authorized");
    }

    if (session.status !== "IN_PROGRESS") {
      throw new ApiError(400, "Can only extend sessions that are in progress");
    }

    if (session.isExtended) {
      throw new ApiError(400, "Session has already been extended");
    }

    if (extensionMinutes > 30) {
      throw new ApiError(400, "Maximum extension is 30 minutes");
    }

    let extensionAmount = 0;
    if (!isFree && session.price > 0) {
      extensionAmount = calculateExtensionPrice(session.price, extensionMinutes, session.duration);
    }

    const newEndTime = addMinutes(session.endTime, extensionMinutes);

    const updated = await db.mentorSession.update({
      where: { id: sessionId },
      data: {
        endTime: newEndTime,
        isExtended: true,
        originalDuration: session.duration,
        extensionMinutes,
        extensionFree: isFree,
        extensionAmount: isFree ? 0 : extensionAmount,
        extensionApprovedAt: new Date(),
      },
    });

    return updated;
  },

  getById: async (userId, sessionId) => {
    const session = await db.mentorSession.findUnique({
      where: { id: sessionId },
      include: {
        mentor: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePhoto: true,
                headline: true,
              },
            },
          },
        },
        sessionType: true,
        menteeUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
        menteeStartup: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
        recordings: {
          select: {
            id: true,
            recordingUrl: true,
            duration: true,
            createdAt: true,
          },
        },
      },
    });

    if (!session) {
      throw new ApiError(404, "Session not found");
    }

    const isMentor = await db.mentorProfile.findFirst({
      where: { userId, id: session.mentorId },
    });

    const isMentee =
      session.userId === userId ||
      (session.startupId &&
        (await db.startupMember.findFirst({
          where: { startupId: session.startupId, userId, isActive: true },
        })));

    if (!isMentor && !isMentee) {
      throw new ApiError(403, "Not authorized to view this session");
    }

    return {
      ...session,
      viewerRole: isMentor ? "MENTOR" : "MENTEE",
    };
  },

  getMentorSessions: async (userId, query) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const { skip, take, orderBy } = buildQueryOptions({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy || "startTime",
      order: query.order || "asc",
    });

    const where = { mentorId: profile.id };

    if (query.status) {
      const statuses = Array.isArray(query.status) ? query.status : [query.status];
      where.status = { in: statuses };
    }

    if (query.timeframe === "upcoming") {
      where.startTime = { gte: new Date() };
      where.status = { in: ["PENDING", "CONFIRMED"] };
    } else if (query.timeframe === "past") {
      where.OR = [
        { startTime: { lt: new Date() } },
        { status: { in: ["COMPLETED", "CANCELLED", "NO_SHOW"] } },
      ];
    }

    if (query.startDate) {
      where.startTime = { ...where.startTime, gte: new Date(query.startDate) };
    }

    if (query.endDate) {
      where.startTime = { ...where.startTime, lte: new Date(query.endDate) };
    }

    const [sessions, total] = await Promise.all([
      db.mentorSession.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          sessionType: {
            select: { name: true, duration: true },
          },
          menteeUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
            },
          },
          menteeStartup: {
            select: { id: true, name: true, logoUrl: true },
          },
        },
      }),
      db.mentorSession.count({ where }),
    ]);

    return {
      data: sessions,
      pagination: {
        total,
        page: Number(query.page) || 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  },

  getMenteeSessions: async (userId, query, startupId = null) => {
    const { skip, take, orderBy } = buildQueryOptions({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy || "startTime",
      order: query.order || "asc",
    });

    const where = startupId
      ? { startupId }
      : { userId, menteeType: "USER" };

    if (query.status) {
      const statuses = Array.isArray(query.status) ? query.status : [query.status];
      where.status = { in: statuses };
    }

    if (query.timeframe === "upcoming") {
      where.startTime = { gte: new Date() };
      where.status = { in: ["PENDING", "CONFIRMED"] };
    } else if (query.timeframe === "past") {
      where.OR = [
        { startTime: { lt: new Date() } },
        { status: { in: ["COMPLETED", "CANCELLED", "NO_SHOW"] } },
      ];
    }

    const [sessions, total] = await Promise.all([
      db.mentorSession.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          mentor: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  profilePhoto: true,
                },
              },
            },
          },
          sessionType: {
            select: { name: true, duration: true },
          },
        },
      }),
      db.mentorSession.count({ where }),
    ]);

    return {
      data: sessions,
      pagination: {
        total,
        page: Number(query.page) || 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  },

  submitReview: async (userId, sessionId, data) => {
    const session = await db.mentorSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new ApiError(404, "Session not found");
    }

    if (session.status !== "COMPLETED") {
      throw new ApiError(400, "Can only review completed sessions");
    }

    const isMentee =
      session.userId === userId ||
      (session.startupId &&
        (await db.startupMember.findFirst({
          where: { startupId: session.startupId, userId, isActive: true },
        })));

    if (!isMentee) {
      throw new ApiError(403, "Only the mentee can submit a review");
    }

    const existingReview = await db.mentorReview.findFirst({
      where: { sessionId, reviewerId: userId },
    });

    if (existingReview) {
      throw new ApiError(409, "You have already reviewed this session");
    }

    const review = await db.$transaction(async (tx) => {
      const newReview = await tx.mentorReview.create({
        data: {
          mentorId: session.mentorId,
          reviewerId: userId,
          sessionId,
          rating: data.rating,
          review: data.review,
          isPublic: data.isPublic ?? true,
        },
      });

      await tx.mentorSession.update({
        where: { id: sessionId },
        data: {
          rating: data.rating,
          feedback: data.review,
        },
      });

      const reviews = await tx.mentorReview.findMany({
        where: { mentorId: session.mentorId },
        select: { rating: true },
      });

      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

      await tx.mentorProfile.update({
        where: { id: session.mentorId },
        data: {
          rating: Math.round(avgRating * 10) / 10,
          reviewCount: reviews.length,
        },
      });

      return newReview;
    });

    return review;
  },

  markNoShow: async (userId, sessionId) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const session = await db.mentorSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.mentorId !== profile.id) {
      throw new ApiError(403, "Not authorized");
    }

    if (!["CONFIRMED", "IN_PROGRESS"].includes(session.status)) {
      throw new ApiError(400, `Cannot mark session as no-show with status ${session.status}`);
    }

    const updated = await db.$transaction(async (tx) => {
      const result = await tx.mentorSession.update({
        where: { id: sessionId },
        data: {
          status: "NO_SHOW",
          completedAt: new Date(),
        },
      });

      return result;
    });

    const menteeUserId = session.userId || (await getMenteeUserId(session));
    if (menteeUserId) {
      NotificationService.send({
        recipientId: menteeUserId,
        type: "SESSION_NO_SHOW",
        category: "MENTORSHIP",
        priority: "HIGH",
        title: "Session No-Show",
        message: "The mentor marked you as a no-show for the session",
        actionUrl: `/sessions/${sessionId}`,
        actorId: userId,
        entityType: "MentorSession",
        entityId: sessionId,
      }).catch(() => {});
    }

    return updated;
  },
};

async function getMenteeUserId(session) {
  if (session.userId) return session.userId;

  if (session.startupId) {
    const admin = await db.startupMember.findFirst({
      where: { startupId: session.startupId, isAdmin: true, isActive: true },
      select: { userId: true },
    });
    return admin?.userId;
  }

  return null;
}
