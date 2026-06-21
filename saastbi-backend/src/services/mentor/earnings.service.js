import db from "../../db/db.js";
import { ApiError } from "../../utils/ApiError.js";
import { buildQueryOptions } from "../../utils/queryHelper.js";

export const EarningsService = {
  getSummary: async (userId) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const [
      totalEarnings,
      pendingEarnings,
      completedEarnings,
      totalWithdrawals,
      pendingWithdrawals,
    ] = await Promise.all([
      db.mentorEarning.aggregate({
        where: { mentorId: profile.id },
        _sum: { netAmount: true },
      }),
      db.mentorEarning.aggregate({
        where: { mentorId: profile.id, status: "PENDING" },
        _sum: { netAmount: true },
      }),
      db.mentorEarning.aggregate({
        where: { mentorId: profile.id, status: "COMPLETED" },
        _sum: { netAmount: true },
      }),
      db.mentorWithdrawal.aggregate({
        where: { mentorId: profile.id, status: "COMPLETED" },
        _sum: { amount: true },
      }),
      db.mentorWithdrawal.aggregate({
        where: { mentorId: profile.id, status: { in: ["PENDING", "PROCESSING"] } },
        _sum: { amount: true },
      }),
    ]);

    const availableBalance =
      (completedEarnings._sum.netAmount || 0) -
      (totalWithdrawals._sum.amount || 0) -
      (pendingWithdrawals._sum.amount || 0);

    return {
      totalEarnings: totalEarnings._sum.netAmount || 0,
      pendingEarnings: pendingEarnings._sum.netAmount || 0,
      completedEarnings: completedEarnings._sum.netAmount || 0,
      totalWithdrawals: totalWithdrawals._sum.amount || 0,
      pendingWithdrawals: pendingWithdrawals._sum.amount || 0,
      availableBalance: Math.max(0, availableBalance),
      currency: "INR",
    };
  },

  getHistory: async (userId, query) => {
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
      sortBy: query.sortBy || "createdAt",
      order: query.order || "desc",
    });

    const where = { mentorId: profile.id };

    if (query.status) {
      where.status = query.status;
    }

    if (query.source) {
      where.source = query.source;
    }

    if (query.startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(query.startDate) };
    }

    if (query.endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(query.endDate) };
    }

    const [earnings, total] = await Promise.all([
      db.mentorEarning.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          session: {
            select: {
              id: true,
              title: true,
              startTime: true,
            },
          },
        },
      }),
      db.mentorEarning.count({ where }),
    ]);

    return {
      data: earnings,
      pagination: {
        total,
        page: Number(query.page) || 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  },

  getPending: async (userId) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const pendingEarnings = await db.mentorEarning.findMany({
      where: { mentorId: profile.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: {
        session: {
          select: {
            id: true,
            title: true,
            startTime: true,
          },
        },
      },
    });

    const total = pendingEarnings.reduce((sum, e) => sum + e.netAmount, 0);

    return {
      earnings: pendingEarnings,
      totalPending: total,
      currency: "INR",
    };
  },

  withdraw: async (userId, amount, payoutAccountId) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const payoutAccount = await db.mentorPayoutAccount.findUnique({
      where: { id: payoutAccountId },
    });

    if (!payoutAccount || payoutAccount.mentorId !== profile.id) {
      throw new ApiError(404, "Payout account not found");
    }

    if (!payoutAccount.isVerified) {
      throw new ApiError(400, "Payout account not verified");
    }

    const [completedEarnings, totalWithdrawals, pendingWithdrawals] = await Promise.all([
      db.mentorEarning.aggregate({
        where: { mentorId: profile.id, status: "COMPLETED" },
        _sum: { netAmount: true },
      }),
      db.mentorWithdrawal.aggregate({
        where: { mentorId: profile.id, status: "COMPLETED" },
        _sum: { amount: true },
      }),
      db.mentorWithdrawal.aggregate({
        where: { mentorId: profile.id, status: { in: ["PENDING", "PROCESSING"] } },
        _sum: { amount: true },
      }),
    ]);

    const availableBalance =
      (completedEarnings._sum.netAmount || 0) -
      (totalWithdrawals._sum.amount || 0) -
      (pendingWithdrawals._sum.amount || 0);

    if (amount > availableBalance) {
      throw new ApiError(400, `Insufficient balance. Available: ${availableBalance}`);
    }

    if (amount < 100) {
      throw new ApiError(400, "Minimum withdrawal amount is 100");
    }

    const withdrawal = await db.mentorWithdrawal.create({
      data: {
        mentorId: profile.id,
        amount,
        currency: "INR",
        status: "PENDING",
        withdrawalMethod: payoutAccount.accountType === "UPI" ? "UPI" : "BANK_TRANSFER",
        bankAccountNumber: payoutAccount.bankAccountNumber,
        bankIfscCode: payoutAccount.bankIfscCode,
        bankName: payoutAccount.bankName,
        accountHolderName: payoutAccount.accountHolderName,
        upiId: payoutAccount.upiId,
      },
    });

    return withdrawal;
  },

  getWithdrawals: async (userId, query) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const { skip, take } = buildQueryOptions({
      page: query.page,
      limit: query.limit,
    });

    const where = { mentorId: profile.id };

    if (query.status) {
      where.status = query.status;
    }

    const [withdrawals, total] = await Promise.all([
      db.mentorWithdrawal.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      db.mentorWithdrawal.count({ where }),
    ]);

    return {
      data: withdrawals,
      pagination: {
        total,
        page: Number(query.page) || 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  },

  addPayoutAccount: async (userId, data) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const existingCount = await db.mentorPayoutAccount.count({
      where: { mentorId: profile.id },
    });

    if (existingCount >= 3) {
      throw new ApiError(400, "Maximum 3 payout accounts allowed");
    }

    if (data.isPrimary) {
      await db.mentorPayoutAccount.updateMany({
        where: { mentorId: profile.id },
        data: { isPrimary: false },
      });
    }

    const account = await db.mentorPayoutAccount.create({
      data: {
        mentorId: profile.id,
        accountType: data.accountType,
        bankAccountNumber: data.bankAccountNumber,
        bankIfscCode: data.bankIfscCode,
        bankName: data.bankName,
        bankBranch: data.bankBranch,
        accountHolderName: data.accountHolderName,
        upiId: data.upiId,
        isPrimary: data.isPrimary || existingCount === 0,
        isVerified: false,
      },
    });

    return account;
  },

  getPayoutAccounts: async (userId) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const accounts = await db.mentorPayoutAccount.findMany({
      where: { mentorId: profile.id },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        accountType: true,
        bankAccountNumber: true,
        bankIfscCode: true,
        bankName: true,
        accountHolderName: true,
        upiId: true,
        isVerified: true,
        isPrimary: true,
        createdAt: true,
      },
    });

    return accounts.map((acc) => ({
      ...acc,
      bankAccountNumber: acc.bankAccountNumber
        ? `****${acc.bankAccountNumber.slice(-4)}`
        : null,
    }));
  },

  deletePayoutAccount: async (userId, accountId) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const account = await db.mentorPayoutAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.mentorId !== profile.id) {
      throw new ApiError(404, "Account not found");
    }

    const pendingWithdrawals = await db.mentorWithdrawal.count({
      where: {
        mentorId: profile.id,
        status: { in: ["PENDING", "PROCESSING"] },
        OR: [
          { bankAccountNumber: account.bankAccountNumber },
          { upiId: account.upiId },
        ],
      },
    });

    if (pendingWithdrawals > 0) {
      throw new ApiError(400, "Cannot delete account with pending withdrawals");
    }

    await db.mentorPayoutAccount.delete({
      where: { id: accountId },
    });

    if (account.isPrimary) {
      const otherAccount = await db.mentorPayoutAccount.findFirst({
        where: { mentorId: profile.id },
      });

      if (otherAccount) {
        await db.mentorPayoutAccount.update({
          where: { id: otherAccount.id },
          data: { isPrimary: true },
        });
      }
    }

    return { success: true };
  },

  getEarningsAnalytics: async (userId, startDate, endDate) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const earnings = await db.mentorEarning.findMany({
      where: {
        mentorId: profile.id,
        createdAt: {
          gte: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          lte: endDate ? new Date(endDate) : new Date(),
        },
      },
      select: {
        netAmount: true,
        source: true,
        createdAt: true,
      },
    });

    const bySource = earnings.reduce((acc, e) => {
      acc[e.source] = (acc[e.source] || 0) + e.netAmount;
      return acc;
    }, {});

    const byDate = earnings.reduce((acc, e) => {
      const date = e.createdAt.toISOString().split("T")[0];
      acc[date] = (acc[date] || 0) + e.netAmount;
      return acc;
    }, {});

    return {
      total: earnings.reduce((sum, e) => sum + e.netAmount, 0),
      bySource,
      byDate,
      count: earnings.length,
    };
  },
};
