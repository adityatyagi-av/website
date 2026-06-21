import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { RazorpayService } from "../../common/razorpay.service.js";
import {
  calculateRefundAmount,
  calculatePlatformFee,
} from "../../../utils/mentor/calculations.js";
import {
  generateJitsiToken,
  generateMeetingUrl,
} from "../../../utils/mentor/jitsi.js";
import {
  USER_BRIEF_SELECT,
  verifyStartupAccess,
  buildPagination,
} from "./helpers.js";

export const SessionService = {
  bookSession: async (userId, mentorId, data) => {
    const { sessionTypeId, scheduledAt, notes, startupId } = data;

    let startup = null;
    let incubatorAssociation = null;

    if (startupId) {
      startup = await verifyStartupAccess(userId, startupId);
    }

    const mentor = await db.mentorProfile.findFirst({
      where: { id: mentorId, isAccepting: true },
    });

    if (!mentor) {
      throw new ApiError(404, "Mentor not found or not accepting sessions");
    }

    const sessionType = await db.sessionType.findFirst({
      where: { id: sessionTypeId, mentorId, isActive: true },
    });

    if (!sessionType) {
      throw new ApiError(404, "Session type not found");
    }

    const mentee = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!mentee) {
      throw new ApiError(404, "User not found");
    }

    const startTime = new Date(scheduledAt);
    if (startTime <= new Date()) {
      throw new ApiError(400, "Cannot book sessions in the past");
    }

    const existingSession = await db.mentorSession.findFirst({
      where: {
        mentorId,
        startTime,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    });

    if (existingSession) {
      throw new ApiError(409, "This time slot is no longer available");
    }

    let bookingContext = "DIRECT";
    let paidBy = "MENTEE";
    let incubatorShare = null;
    let startupShare = null;
    let finalPayableAmount = sessionType.price;

    const tenantId = startup?.tenantAssociations?.[0]?.tenantId;

    if (tenantId) {
      incubatorAssociation = await db.incubatorMentorAssociation.findFirst({
        where: {
          mentorProfileId: mentorId,
          tenantId,
          status: "ACTIVE",
        },
      });

      if (incubatorAssociation) {
        bookingContext = "INCUBATOR";

        if (incubatorAssociation.paymentModel === "INCUBATOR_PAYS") {
          paidBy = "INCUBATOR";
          incubatorShare = sessionType.price;
          startupShare = 0;
          finalPayableAmount = 0;
        } else if (
          incubatorAssociation.paymentModel === "SUBSIDIZED" &&
          incubatorAssociation.incubatorSharePercent > 0
        ) {
          paidBy = "SPLIT";
          incubatorShare =
            (sessionType.price * incubatorAssociation.incubatorSharePercent) /
            100;
          startupShare = sessionType.price - incubatorShare;
          finalPayableAmount = startupShare;
        } else if (incubatorAssociation.paymentModel === "FREE") {
          paidBy = "FREE";
          incubatorShare = 0;
          startupShare = 0;
          finalPayableAmount = 0;
        }
      }
    }

    const { feePercent, feeAmount, netAmount } = calculatePlatformFee(
      sessionType.price,
      bookingContext === "INCUBATOR" ? "INCUBATOR" : "DIRECT"
    );

    let order = null;
    if (finalPayableAmount > 0) {
      order = await RazorpayService.createOrder({
        amount: finalPayableAmount,
        receipt: `session_${Date.now()}`,
        notes: {
          type: "mentor_session",
          mentorId,
          userId,
          ...(startupId && { startupId }),
          sessionTypeId,
        },
      });
    }

    const menteeName = `${mentee.firstName} ${mentee.lastName}`.trim();

    const session = await db.mentorSession.create({
      data: {
        mentorId,
        menteeType: startupId ? "STARTUP" : "USER",
        menteeId: startupId || userId,
        userId,
        ...(startupId && { startupId }),
        sessionTypeId,
        startTime,
        endTime: new Date(startTime.getTime() + sessionType.duration * 60000),
        duration: sessionType.duration,
        price: sessionType.price,
        grossAmount: sessionType.price,
        platformFee: feeAmount,
        platformFeePercent: feePercent,
        mentorPayout: netAmount,
        bookingContext,
        paidBy,
        ...(incubatorShare !== null && { incubatorShare }),
        ...(startupShare !== null && { startupShare }),
        ...(incubatorAssociation && {
          incubatorAssociationId: incubatorAssociation.id,
        }),
        status: finalPayableAmount > 0 ? "PENDING" : "CONFIRMED",
        paymentStatus:
          finalPayableAmount > 0
            ? "PENDING"
            : paidBy === "INCUBATOR"
              ? "INCUBATOR_BILLED"
              : "WAIVED",
        paymentId: order?.id || null,
        notes,
        earning: {
          create: {
            mentorId,
            menteeId: startupId || userId,
            menteeName,
            sessionType: sessionType.name,
            grossAmount: sessionType.price,
            platformFee: feeAmount,
            netAmount,
            currency: sessionType.currency || "INR",
            status: "PENDING",
            razorpayOrderId: order?.id || null,
            source: bookingContext === "INCUBATOR" ? "INCUBATOR" : "DIRECT",
            ...(incubatorAssociation && {
              incubatorAssociationId: incubatorAssociation.id,
            }),
          },
        },
      },
      include: { sessionType: true },
    });

    if (finalPayableAmount === 0) {
      return {
        session,
        message: startupId
          ? "Session booked - covered by incubator"
          : "Session booked",
      };
    }

    return {
      session,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
    };
  },

  confirmSessionPayment: async (userId, sessionId, paymentData) => {
    const { razorpayPaymentId, razorpaySignature } = paymentData;

    const session = await db.mentorSession.findFirst({
      where: { id: sessionId, status: "PENDING" },
      include: { earning: true },
    });

    if (!session) {
      throw new ApiError(404, "Session not found or already processed");
    }

    if (session.startupId) {
      await verifyStartupAccess(userId, session.startupId);
    } else if (session.userId !== userId) {
      throw new ApiError(403, "Access denied");
    }

    const orderId = session.earning?.razorpayOrderId || session.paymentId;
    if (!orderId) {
      throw new ApiError(400, "Payment order not found for this session");
    }

    const isValid = RazorpayService.verifyOrderPaymentSignature({
      razorpayOrderId: orderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValid) {
      throw new ApiError(400, "Invalid payment signature");
    }

    const updatedSession = await db.mentorSession.update({
      where: { id: sessionId },
      data: {
        status: "CONFIRMED",
        paymentStatus: "PAID",
        paymentId: razorpayPaymentId,
        earning: {
          update: {
            status: "COMPLETED",
            razorpayPaymentId,
            razorpaySignature,
            paidAt: new Date(),
          },
        },
      },
      include: { sessionType: true },
    });

    return updatedSession;
  },

  getSessions: async (userId, query) => {
    const { status, upcoming, past, startupId, page = 1, limit = 10 } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let where;
    if (startupId) {
      await verifyStartupAccess(userId, startupId);
      where = { startupId };
    } else {
      where = { userId };
    }

    if (status) {
      where.status = status;
    }

    if (upcoming === "true") {
      where.startTime = { gte: new Date() };
      where.status = { in: ["PENDING", "CONFIRMED"] };
    }

    if (past === "true") {
      where.OR = [
        { startTime: { lt: new Date() } },
        { status: { in: ["COMPLETED", "CANCELLED", "NO_SHOW"] } },
      ];
    }

    const [sessions, total] = await Promise.all([
      db.mentorSession.findMany({
        where,
        include: {
          mentor: {
            include: { user: { select: USER_BRIEF_SELECT } },
          },
          menteeUser: { select: USER_BRIEF_SELECT },
          sessionType: true,
        },
        orderBy: { startTime: "desc" },
        skip,
        take: parseInt(limit),
      }),
      db.mentorSession.count({ where }),
    ]);

    return {
      sessions,
      pagination: buildPagination(page, limit, total),
    };
  },

  getSessionById: async (userId, sessionId) => {
    const session = await db.mentorSession.findUnique({
      where: { id: sessionId },
      include: {
        mentor: {
          include: { user: { select: USER_BRIEF_SELECT } },
        },
        menteeUser: { select: USER_BRIEF_SELECT },
        menteeStartup: { select: { id: true, name: true } },
        sessionType: true,
      },
    });

    if (!session) {
      throw new ApiError(404, "Session not found");
    }

    if (session.startupId) {
      await verifyStartupAccess(userId, session.startupId);
    } else if (session.userId !== userId) {
      throw new ApiError(403, "Access denied");
    }

    return session;
  },

  cancelSession: async (userId, sessionId, reason) => {
    const session = await db.mentorSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new ApiError(404, "Session not found");
    }

    if (session.startupId) {
      await verifyStartupAccess(userId, session.startupId);
    } else if (session.userId !== userId) {
      throw new ApiError(403, "Access denied");
    }

    if (!["PENDING", "CONFIRMED"].includes(session.status)) {
      throw new ApiError(400, "Session cannot be cancelled");
    }

    const hoursUntilSession =
      (new Date(session.startTime) - new Date()) / (1000 * 60 * 60);

    let refundableAmount = session.price;
    if (session.startupShare !== null && session.startupShare !== undefined) {
      refundableAmount = session.startupShare;
    } else if (session.paidBy === "INCUBATOR" || session.paidBy === "FREE") {
      refundableAmount = 0;
    }

    const { refundAmount } = calculateRefundAmount(
      refundableAmount,
      hoursUntilSession
    );

    let refundId = null;
    if (refundAmount > 0 && session.paymentId) {
      const refund = await RazorpayService.createRefund({
        paymentId: session.paymentId,
        amount: refundAmount,
        notes: { reason, sessionId },
      });
      refundId = refund.id;
    }

    const updatedSession = await db.mentorSession.update({
      where: { id: sessionId },
      data: {
        status: "CANCELLED",
        cancelledBy: userId,
        cancelledByRole: session.startupId ? "STARTUP" : "MENTEE",
        cancelReason: reason,
        cancelledAt: new Date(),
        ...(refundAmount > 0 && {
          refundAmount,
          refundStatus: "PROCESSING",
          refundId,
        }),
      },
    });

    return updatedSession;
  },

  rescheduleSession: async (userId, sessionId, data) => {
    const { newScheduledAt, reason } = data;

    const session = await db.mentorSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new ApiError(404, "Session not found");
    }

    if (session.startupId) {
      await verifyStartupAccess(userId, session.startupId);
    } else if (session.userId !== userId) {
      throw new ApiError(403, "Access denied");
    }

    if (!["PENDING", "CONFIRMED"].includes(session.status)) {
      throw new ApiError(400, "Session cannot be rescheduled");
    }

    const newTime = new Date(newScheduledAt);
    if (newTime <= new Date()) {
      throw new ApiError(400, "Cannot reschedule to a past time");
    }

    const conflict = await db.mentorSession.findFirst({
      where: {
        mentorId: session.mentorId,
        startTime: newTime,
        status: { in: ["PENDING", "CONFIRMED"] },
        id: { not: sessionId },
      },
    });

    if (conflict) {
      throw new ApiError(409, "This time slot is not available");
    }

    const updatedSession = await db.mentorSession.update({
      where: { id: sessionId },
      data: {
        startTime: newTime,
        endTime: new Date(newTime.getTime() + session.duration * 60000),
        status: "CONFIRMED",
      },
    });

    return updatedSession;
  },

  submitReview: async (userId, sessionId, data) => {
    const { rating, comment } = data;

    const session = await db.mentorSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new ApiError(404, "Session not found");
    }

    if (session.startupId) {
      await verifyStartupAccess(userId, session.startupId);
    } else if (session.userId !== userId) {
      throw new ApiError(403, "Access denied");
    }

    if (session.status !== "COMPLETED") {
      throw new ApiError(400, "Can only review completed sessions");
    }

    if (session.reviewSubmitted) {
      throw new ApiError(409, "Review already submitted for this session");
    }

    const review = await db.mentorReview.create({
      data: {
        mentorId: session.mentorId,
        reviewerId: userId,
        sessionId,
        rating,
        review: comment || null,
      },
    });

    const allReviews = await db.mentorReview.findMany({
      where: { mentorId: session.mentorId },
      select: { rating: true },
    });

    const avgRating =
      allReviews.reduce((acc, r) => acc + r.rating, 0) / allReviews.length;

    await Promise.all([
      db.mentorProfile.update({
        where: { id: session.mentorId },
        data: { rating: avgRating, reviewCount: allReviews.length },
      }),
      db.mentorSession.update({
        where: { id: sessionId },
        data: { reviewSubmitted: true, reviewSubmittedAt: new Date() },
      }),
    ]);

    return review;
  },

  getVideoJoinInfo: async (userId, sessionId) => {
    const session = await db.mentorSession.findUnique({
      where: { id: sessionId },
      include: {
        mentor: {
          include: { user: { select: USER_BRIEF_SELECT } },
        },
      },
    });

    if (!session) {
      throw new ApiError(404, "Session not found");
    }

    if (session.startupId) {
      await verifyStartupAccess(userId, session.startupId);
    } else if (session.userId !== userId) {
      throw new ApiError(403, "Access denied");
    }

    if (session.status !== "CONFIRMED") {
      throw new ApiError(400, "Session is not confirmed");
    }

    const minutesUntilSession =
      (new Date(session.startTime) - new Date()) / (1000 * 60);

    if (minutesUntilSession > 10) {
      throw new ApiError(
        400,
        "You can only join 10 minutes before the session"
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    const displayName = `${user.firstName} ${user.lastName}`.trim();
    const roomName =
      session.meetingRoomId || `mentor_session_${sessionId}`;
    const token = generateJitsiToken(
      userId,
      displayName,
      roomName,
      user.email
    );
    const meetingUrl = generateMeetingUrl(roomName);

    return {
      roomName,
      token,
      meetingUrl,
      session: {
        id: session.id,
        startTime: session.startTime,
        duration: session.duration,
        mentor: session.mentor,
      },
    };
  },
};
