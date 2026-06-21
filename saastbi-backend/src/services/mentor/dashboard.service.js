import db from "../../db/db.js";
import { ApiError } from "../../utils/ApiError.js";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";

export const DashboardService = {
  getOverview: async (userId) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true, rating: true, reviewCount: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

    const [
      todaySessions,
      weekSessions,
      pendingRequests,
      activeMentorships,
      upcomingSessions,
      recentEarnings,
    ] = await Promise.all([
      db.mentorSession.findMany({
        where: {
          mentorId: profile.id,
          startTime: { gte: todayStart, lte: todayEnd },
          status: { in: ["CONFIRMED", "IN_PROGRESS"] },
        },
        orderBy: { startTime: "asc" },
        include: {
          menteeUser: {
            select: { firstName: true, lastName: true, profilePhoto: true },
          },
          menteeStartup: {
            select: { name: true, logoUrl: true },
          },
          sessionType: {
            select: { name: true, duration: true },
          },
        },
      }),
      db.mentorSession.count({
        where: {
          mentorId: profile.id,
          startTime: { gte: weekStart, lte: weekEnd },
          status: "COMPLETED",
        },
      }),
      db.mentorSession.count({
        where: {
          mentorId: profile.id,
          status: "PENDING",
        },
      }),
      db.mentorship.count({
        where: {
          mentorProfileId: profile.id,
          status: "ACTIVE",
        },
      }),
      db.mentorSession.findMany({
        where: {
          mentorId: profile.id,
          startTime: { gt: today },
          status: { in: ["CONFIRMED"] },
        },
        orderBy: { startTime: "asc" },
        take: 5,
        include: {
          menteeUser: {
            select: { firstName: true, lastName: true, profilePhoto: true },
          },
          menteeStartup: {
            select: { name: true, logoUrl: true },
          },
          sessionType: {
            select: { name: true },
          },
        },
      }),
      db.mentorEarning.aggregate({
        where: {
          mentorId: profile.id,
          createdAt: { gte: subDays(today, 30) },
          status: "COMPLETED",
        },
        _sum: { netAmount: true },
      }),
    ]);

    return {
      todaySessions: {
        count: todaySessions.length,
        sessions: todaySessions,
      },
      weeklyCompletedSessions: weekSessions,
      pendingRequests,
      activeMentorships,
      upcomingSessions,
      last30DaysEarnings: recentEarnings._sum.netAmount || 0,
      rating: profile.rating,
      reviewCount: profile.reviewCount,
    };
  },

  getSessionAnalytics: async (userId, period = "month") => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const today = new Date();
    let startDate;

    switch (period) {
      case "week":
        startDate = subDays(today, 7);
        break;
      case "month":
        startDate = subDays(today, 30);
        break;
      case "quarter":
        startDate = subDays(today, 90);
        break;
      case "year":
        startDate = subDays(today, 365);
        break;
      default:
        startDate = subDays(today, 30);
    }

    const sessions = await db.mentorSession.findMany({
      where: {
        mentorId: profile.id,
        createdAt: { gte: startDate },
      },
      select: {
        id: true,
        status: true,
        startTime: true,
        duration: true,
        actualDuration: true,
        price: true,
        bookingContext: true,
      },
    });

    const statusCounts = sessions.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {});

    const contextCounts = sessions.reduce((acc, s) => {
      acc[s.bookingContext] = (acc[s.bookingContext] || 0) + 1;
      return acc;
    }, {});

    const completed = sessions.filter((s) => s.status === "COMPLETED");
    const cancelled = sessions.filter((s) => s.status === "CANCELLED");

    const totalMinutes = completed.reduce(
      (sum, s) => sum + (s.actualDuration || s.duration),
      0
    );

    const byDate = sessions.reduce((acc, s) => {
      const date = s.startTime.toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = { total: 0, completed: 0, cancelled: 0 };
      }
      acc[date].total++;
      if (s.status === "COMPLETED") acc[date].completed++;
      if (s.status === "CANCELLED") acc[date].cancelled++;
      return acc;
    }, {});

    return {
      period,
      totalSessions: sessions.length,
      byStatus: statusCounts,
      byContext: contextCounts,
      completedCount: completed.length,
      cancelledCount: cancelled.length,
      completionRate: sessions.length > 0
        ? Math.round((completed.length / sessions.length) * 100)
        : 0,
      totalHours: Math.round((totalMinutes / 60) * 100) / 100,
      averageSessionDuration: completed.length > 0
        ? Math.round(totalMinutes / completed.length)
        : 0,
      byDate,
    };
  },

  getEarningsAnalytics: async (userId, period = "month") => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const today = new Date();
    let startDate;

    switch (period) {
      case "week":
        startDate = subDays(today, 7);
        break;
      case "month":
        startDate = subDays(today, 30);
        break;
      case "quarter":
        startDate = subDays(today, 90);
        break;
      case "year":
        startDate = subDays(today, 365);
        break;
      default:
        startDate = subDays(today, 30);
    }

    const earnings = await db.mentorEarning.findMany({
      where: {
        mentorId: profile.id,
        createdAt: { gte: startDate },
      },
      select: {
        netAmount: true,
        grossAmount: true,
        platformFee: true,
        source: true,
        status: true,
        createdAt: true,
      },
    });

    const bySource = earnings.reduce((acc, e) => {
      if (!acc[e.source]) {
        acc[e.source] = { total: 0, count: 0 };
      }
      acc[e.source].total += e.netAmount;
      acc[e.source].count++;
      return acc;
    }, {});

    const byStatus = earnings.reduce((acc, e) => {
      acc[e.status] = (acc[e.status] || 0) + e.netAmount;
      return acc;
    }, {});

    const byDate = earnings.reduce((acc, e) => {
      const date = e.createdAt.toISOString().split("T")[0];
      acc[date] = (acc[date] || 0) + e.netAmount;
      return acc;
    }, {});

    const totalGross = earnings.reduce((sum, e) => sum + e.grossAmount, 0);
    const totalNet = earnings.reduce((sum, e) => sum + e.netAmount, 0);
    const totalFees = earnings.reduce((sum, e) => sum + e.platformFee, 0);

    return {
      period,
      totalGross,
      totalNet,
      totalFees,
      transactionCount: earnings.length,
      averagePerSession: earnings.length > 0
        ? Math.round(totalNet / earnings.length)
        : 0,
      bySource,
      byStatus,
      byDate,
    };
  },

  getReviewAnalytics: async (userId) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true, rating: true, reviewCount: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const reviews = await db.mentorReview.findMany({
      where: { mentorId: profile.id },
      select: {
        rating: true,
        createdAt: true,
      },
    });

    const ratingDistribution = reviews.reduce((acc, r) => {
      acc[r.rating] = (acc[r.rating] || 0) + 1;
      return acc;
    }, {});

    const recentReviews = await db.mentorReview.findMany({
      where: { mentorId: profile.id, isPublic: true },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        rating: true,
        review: true,
        createdAt: true,
      },
    });

    return {
      averageRating: profile.rating,
      totalReviews: profile.reviewCount,
      ratingDistribution: {
        5: ratingDistribution[5] || 0,
        4: ratingDistribution[4] || 0,
        3: ratingDistribution[3] || 0,
        2: ratingDistribution[2] || 0,
        1: ratingDistribution[1] || 0,
      },
      recentReviews,
    };
  },

  getMenteeAnalytics: async (userId) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true, totalMentees: true, activeMentees: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const [
      totalUniqueMentees,
      repeatMentees,
      byType,
      topMentees,
    ] = await Promise.all([
      db.mentorSession.groupBy({
        by: ["menteeId", "menteeType"],
        where: { mentorId: profile.id },
        _count: true,
      }),
      db.mentorSession.groupBy({
        by: ["menteeId"],
        where: { mentorId: profile.id },
        having: { menteeId: { _count: { gt: 1 } } },
        _count: true,
      }),
      db.mentorSession.groupBy({
        by: ["menteeType"],
        where: { mentorId: profile.id },
        _count: true,
      }),
      db.mentorSession.groupBy({
        by: ["menteeId", "menteeType"],
        where: { mentorId: profile.id, status: "COMPLETED" },
        _count: true,
        orderBy: { _count: { menteeId: "desc" } },
        take: 5,
      }),
    ]);

    const byTypeMap = byType.reduce((acc, t) => {
      acc[t.menteeType] = t._count;
      return acc;
    }, {});

    return {
      totalMentees: profile.totalMentees,
      activeMentees: profile.activeMentees,
      uniqueMentees: totalUniqueMentees.length,
      repeatMentees: repeatMentees.length,
      retentionRate: totalUniqueMentees.length > 0
        ? Math.round((repeatMentees.length / totalUniqueMentees.length) * 100)
        : 0,
      byType: {
        users: byTypeMap.USER || 0,
        startups: byTypeMap.STARTUP || 0,
      },
      topMentees: topMentees.map((m) => ({
        menteeId: m.menteeId,
        menteeType: m.menteeType,
        sessionsCount: m._count,
      })),
    };
  },
};
