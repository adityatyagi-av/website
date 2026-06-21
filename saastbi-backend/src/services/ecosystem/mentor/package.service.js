import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { RazorpayService } from "../../common/razorpay.service.js";
import { calculatePlatformFee } from "../../../utils/mentor/calculations.js";
import {
  USER_BRIEF_SELECT,
  USER_SELECT,
  verifyStartupAccess,
  buildPagination,
} from "./helpers.js";

export const PackageService = {
  subscribeToPackage: async (userId, packageId, data) => {
    const { startupId } = data || {};

    if (startupId) {
      await verifyStartupAccess(userId, startupId);
    }

    const pkg = await db.mentorPackage.findFirst({
      where: { id: packageId, isActive: true },
      include: { mentor: true },
    });

    if (!pkg) {
      throw new ApiError(404, "Package not found");
    }

    const subscriberFilter = startupId
      ? { startupId, packageId }
      : { userId, packageId };

    const existingSubscription = await db.packageSubscription.findFirst({
      where: {
        ...subscriberFilter,
        status: { in: ["ACTIVE", "PAYMENT_PENDING"] },
      },
    });

    if (existingSubscription) {
      throw new ApiError(
        409,
        "Already have an active subscription to this package"
      );
    }

    const order = await RazorpayService.createOrder({
      amount: pkg.price,
      receipt: `pkg_${Date.now()}`,
      notes: {
        type: "mentor_package",
        packageId,
        userId,
        ...(startupId && { startupId }),
        mentorId: pkg.mentorProfileId,
      },
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + pkg.validityDays);

    const subscription = await db.packageSubscription.create({
      data: {
        packageId,
        subscriberType: startupId ? "STARTUP" : "USER",
        subscriberId: startupId || userId,
        userId,
        ...(startupId && { startupId }),
        amountPaid: pkg.price,
        currency: pkg.currency || "INR",
        sessionsTotal: pkg.sessionsIncluded,
        sessionsRemaining: pkg.sessionsIncluded,
        expiresAt,
        status: "PAYMENT_PENDING",
        razorpayOrderId: order.id,
      },
    });

    return {
      subscription,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
    };
  },

  confirmPackagePayment: async (userId, subscriptionId, paymentData) => {
    const { razorpayPaymentId, razorpaySignature } = paymentData;

    const subscription = await db.packageSubscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription || subscription.status !== "PAYMENT_PENDING") {
      throw new ApiError(404, "Subscription not found or already processed");
    }

    if (subscription.startupId) {
      await verifyStartupAccess(userId, subscription.startupId);
    } else if (subscription.userId !== userId) {
      throw new ApiError(403, "Access denied");
    }

    const isValid = RazorpayService.verifyOrderPaymentSignature({
      razorpayOrderId: subscription.razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValid) {
      throw new ApiError(400, "Invalid payment signature");
    }

    const updatedSubscription = await db.packageSubscription.update({
      where: { id: subscriptionId },
      data: {
        status: "ACTIVE",
        razorpayPaymentId,
        paymentStatus: "COMPLETED",
        purchasedAt: new Date(),
      },
      include: {
        package: {
          include: {
            mentor: {
              include: { user: { select: USER_BRIEF_SELECT } },
            },
          },
        },
      },
    });

    return updatedSubscription;
  },

  getPackages: async (userId, query) => {
    const { status, startupId, page = 1, limit = 10 } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let where;
    if (startupId) {
      await verifyStartupAccess(userId, startupId);
      where = { startupId };
    } else {
      where = { userId };
    }
    if (status) where.status = status;

    const [subscriptions, total] = await Promise.all([
      db.packageSubscription.findMany({
        where,
        include: {
          package: {
            include: {
              mentor: {
                include: { user: { select: USER_BRIEF_SELECT } },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      db.packageSubscription.count({ where }),
    ]);

    return {
      subscriptions,
      pagination: buildPagination(page, limit, total),
    };
  },

  requestMentorship: async (userId, mentorId, data) => {
    const { goals, message, startupId } = data;

    if (startupId) {
      await verifyStartupAccess(userId, startupId);
    }

    const mentor = await db.mentorProfile.findFirst({
      where: { id: mentorId, isAccepting: true },
    });

    if (!mentor) {
      throw new ApiError(404, "Mentor not found");
    }

    const menteeFilter = startupId
      ? { startupId, mentorProfileId: mentorId }
      : { userId, mentorProfileId: mentorId };

    const existingMentorship = await db.mentorship.findFirst({
      where: { ...menteeFilter, status: { in: ["PENDING", "ACTIVE"] } },
    });

    if (existingMentorship) {
      throw new ApiError(
        409,
        "Already have an active or pending mentorship with this mentor"
      );
    }

    const mentorship = await db.mentorship.create({
      data: {
        mentorProfileId: mentorId,
        menteeType: startupId ? "STARTUP" : "USER",
        userId,
        ...(startupId && { startupId }),
        engagementType: "AD_HOC",
        goals: goals || null,
        objectives: message || null,
        status: "PENDING",
      },
      include: {
        mentor: {
          include: { user: { select: USER_BRIEF_SELECT } },
        },
      },
    });

    return mentorship;
  },

  getMentorships: async (userId, query) => {
    const { status, startupId, page = 1, limit = 10 } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let where;
    if (startupId) {
      await verifyStartupAccess(userId, startupId);
      where = { startupId };
    } else {
      where = { userId };
    }
    if (status) where.status = status;

    const [mentorships, total] = await Promise.all([
      db.mentorship.findMany({
        where,
        include: {
          mentor: {
            include: { user: { select: USER_BRIEF_SELECT } },
          },
          milestones: {
            orderBy: { createdAt: "desc" },
            take: 3,
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      db.mentorship.count({ where }),
    ]);

    return {
      mentorships,
      pagination: buildPagination(page, limit, total),
    };
  },

  getMentorshipById: async (userId, mentorshipId) => {
    const mentorship = await db.mentorship.findUnique({
      where: { id: mentorshipId },
      include: {
        mentor: {
          include: { user: { select: USER_SELECT } },
        },
        milestones: {
          orderBy: { targetDate: "asc" },
        },
        sessions: {
          orderBy: { startTime: "desc" },
          take: 5,
        },
      },
    });

    if (!mentorship) {
      throw new ApiError(404, "Mentorship not found");
    }

    if (mentorship.startupId) {
      await verifyStartupAccess(userId, mentorship.startupId);
    } else if (mentorship.userId !== userId) {
      throw new ApiError(403, "Access denied");
    }

    return mentorship;
  },

  endMentorship: async (userId, mentorshipId, reason) => {
    const mentorship = await db.mentorship.findUnique({
      where: { id: mentorshipId },
    });

    if (!mentorship || mentorship.status !== "ACTIVE") {
      throw new ApiError(404, "Mentorship not found or not active");
    }

    if (mentorship.startupId) {
      await verifyStartupAccess(userId, mentorship.startupId);
    } else if (mentorship.userId !== userId) {
      throw new ApiError(403, "Access denied");
    }

    const updated = await db.mentorship.update({
      where: { id: mentorshipId },
      data: {
        status: "ENDED",
        endedAt: new Date(),
        endedBy: userId,
        endReason: reason,
      },
    });

    return updated;
  },

  getMentorSpending: async (userId, startupId, query) => {
    await verifyStartupAccess(userId, startupId);

    const { startDate, endDate } = query;

    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const sessionWhere = {
      startupId,
      status: { in: ["COMPLETED", "CONFIRMED", "PENDING"] },
      paymentStatus: "PAID",
    };
    if (startDate || endDate) sessionWhere.createdAt = dateFilter;

    const [sessions, packages] = await Promise.all([
      db.mentorSession.findMany({
        where: sessionWhere,
        select: { price: true, incubatorShare: true, startupShare: true },
      }),
      db.packageSubscription.findMany({
        where: {
          startupId,
          status: { in: ["ACTIVE", "EXPIRED", "COMPLETED"] },
          paymentStatus: "COMPLETED",
          ...(startDate || endDate ? { createdAt: dateFilter } : {}),
        },
        select: { amountPaid: true },
      }),
    ]);

    const sessionSpending = sessions.reduce(
      (acc, s) => acc + (s.startupShare || s.price || 0),
      0
    );
    const packageSpending = packages.reduce(
      (acc, p) => acc + (p.amountPaid || 0),
      0
    );
    const incubatorSubsidies = sessions.reduce(
      (acc, s) => acc + (s.incubatorShare || 0),
      0
    );

    return {
      totalSpending: sessionSpending + packageSpending,
      sessionSpending,
      packageSpending,
      incubatorSubsidies,
      sessionsCount: sessions.length,
      packagesCount: packages.length,
    };
  },
};
