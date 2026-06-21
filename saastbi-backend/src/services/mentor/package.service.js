import db from "../../db/db.js";
import { ApiError } from "../../utils/ApiError.js";
import { buildQueryOptions } from "../../utils/queryHelper.js";

export const PackageService = {
  create: async (userId, data) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const existingCount = await db.mentorPackage.count({
      where: { mentorProfileId: profile.id },
    });

    if (existingCount >= 5) {
      throw new ApiError(400, "Maximum 5 packages allowed");
    }

    const package_ = await db.mentorPackage.create({
      data: {
        mentorProfileId: profile.id,
        ...data,
      },
    });

    return package_;
  },

  getOwn: async (userId) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const packages = await db.mentorPackage.findMany({
      where: { mentorProfileId: profile.id },
      orderBy: { displayOrder: "asc" },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    return packages;
  },

  getByMentor: async (mentorId) => {
    const packages = await db.mentorPackage.findMany({
      where: { mentorProfileId: mentorId, isActive: true },
      orderBy: { displayOrder: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        packageType: true,
        sessionsIncluded: true,
        sessionDuration: true,
        validityDays: true,
        price: true,
        originalPrice: true,
        currency: true,
        discountPercent: true,
        features: true,
        includesChat: true,
        includesPriorityBooking: true,
      },
    });

    return packages;
  },

  update: async (userId, packageId, data) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const package_ = await db.mentorPackage.findUnique({
      where: { id: packageId },
    });

    if (!package_ || package_.mentorProfileId !== profile.id) {
      throw new ApiError(404, "Package not found");
    }

    const updated = await db.mentorPackage.update({
      where: { id: packageId },
      data,
    });

    return updated;
  },

  delete: async (userId, packageId) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const package_ = await db.mentorPackage.findUnique({
      where: { id: packageId },
    });

    if (!package_ || package_.mentorProfileId !== profile.id) {
      throw new ApiError(404, "Package not found");
    }

    const activeSubscriptions = await db.packageSubscription.count({
      where: { packageId, status: "ACTIVE" },
    });

    if (activeSubscriptions > 0) {
      throw new ApiError(400, "Cannot delete package with active subscriptions");
    }

    await db.mentorPackage.delete({
      where: { id: packageId },
    });

    return { success: true };
  },

  subscribe: async (userId, mentorId, packageId, data) => {
    const package_ = await db.mentorPackage.findUnique({
      where: { id: packageId },
      include: { mentor: true },
    });

    if (!package_ || !package_.isActive) {
      throw new ApiError(404, "Package not found or inactive");
    }

    if (package_.mentorProfileId !== mentorId) {
      throw new ApiError(400, "Package does not belong to this mentor");
    }

    let subscriberId = userId;
    let userIdVal = userId;
    let startupIdVal = null;

    if (data.subscriberType === "STARTUP") {
      if (!data.startupId) {
        throw new ApiError(400, "Startup ID required");
      }

      const membership = await db.startupMember.findFirst({
        where: { startupId: data.startupId, userId, isActive: true },
      });

      if (!membership) {
        throw new ApiError(403, "You are not a member of this startup");
      }

      subscriberId = data.startupId;
      userIdVal = null;
      startupIdVal = data.startupId;
    }

    const existingActive = await db.packageSubscription.findFirst({
      where: {
        packageId,
        subscriberId,
        status: "ACTIVE",
      },
    });

    if (existingActive) {
      throw new ApiError(409, "Already have an active subscription to this package");
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + package_.validityDays);

    const subscription = await db.packageSubscription.create({
      data: {
        packageId,
        subscriberType: data.subscriberType || "USER",
        subscriberId,
        userId: userIdVal,
        startupId: startupIdVal,
        expiresAt,
        amountPaid: package_.price,
        currency: package_.currency,
        sessionsTotal: package_.sessionsIncluded,
        sessionsRemaining: package_.sessionsIncluded,
        status: "ACTIVE",
        paymentStatus: "PENDING",
      },
      include: {
        package: {
          select: {
            name: true,
            sessionsIncluded: true,
            validityDays: true,
          },
        },
      },
    });

    return subscription;
  },

  getSubscriptions: async (userId, query, startupId = null) => {
    const { skip, take } = buildQueryOptions({
      page: query.page,
      limit: query.limit,
    });

    const where = startupId
      ? { startupId, subscriberType: "STARTUP" }
      : { userId, subscriberType: "USER" };

    if (query.status) {
      where.status = query.status;
    }

    const [subscriptions, total] = await Promise.all([
      db.packageSubscription.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          package: {
            select: {
              id: true,
              name: true,
              description: true,
              sessionsIncluded: true,
              validityDays: true,
              features: true,
              mentor: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                      profilePhoto: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      db.packageSubscription.count({ where }),
    ]);

    return {
      data: subscriptions,
      pagination: {
        total,
        page: Number(query.page) || 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  },

  getSubscriptionById: async (userId, subscriptionId) => {
    const subscription = await db.packageSubscription.findUnique({
      where: { id: subscriptionId },
      include: {
        package: {
          include: {
            mentor: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    profilePhoto: true,
                    headline: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!subscription) {
      throw new ApiError(404, "Subscription not found");
    }

    const isOwner =
      subscription.userId === userId ||
      (subscription.startupId &&
        (await db.startupMember.findFirst({
          where: { startupId: subscription.startupId, userId, isActive: true },
        })));

    if (!isOwner) {
      throw new ApiError(403, "Not authorized");
    }

    return subscription;
  },

  getPackageSubscribers: async (userId, packageId, query) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const package_ = await db.mentorPackage.findUnique({
      where: { id: packageId },
    });

    if (!package_ || package_.mentorProfileId !== profile.id) {
      throw new ApiError(404, "Package not found");
    }

    const { skip, take } = buildQueryOptions({
      page: query.page,
      limit: query.limit,
    });

    const [subscribers, total] = await Promise.all([
      db.packageSubscription.findMany({
        where: { packageId },
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
            },
          },
          startup: {
            select: {
              id: true,
              name: true,
              logo: true,
            },
          },
        },
      }),
      db.packageSubscription.count({ where: { packageId } }),
    ]);

    return {
      data: subscribers,
      pagination: {
        total,
        page: Number(query.page) || 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  },
};
