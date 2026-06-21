import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";

export const OfficePayoutService = {
  async listPayouts({ tenantId, filters }) {
    const { page = 1, limit = 10, status, from, to } = filters || {};
    const where = { tenantId };
    if (status) where.status = status;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [data, total, summary] = await Promise.all([
      db.officePayout.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          payment: {
            select: {
              id: true,
              amount: true,
              currency: true,
              razorpayPaymentId: true,
              bookingId: true,
              createdAt: true,
            },
          },
          payoutAccount: {
            select: {
              id: true,
              legalBusinessName: true,
              razorpayLinkedAccountId: true,
            },
          },
        },
      }),
      db.officePayout.count({ where }),
      db.officePayout.groupBy({
        by: ["status"],
        where: { tenantId },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: summary.reduce((acc, row) => {
        acc[row.status] = {
          count: row._count._all,
          amount: row._sum.amount || 0,
        };
        return acc;
      }, {}),
    };
  },

  async getPayoutById({ payoutId, tenantId }) {
    const payout = await db.officePayout.findUnique({
      where: { id: payoutId },
      include: {
        payment: {
          include: {
            booking: {
              include: {
                office: { select: { id: true, name: true, location: true } },
                bookerStartup: { select: { id: true, name: true } },
              },
            },
          },
        },
        payoutAccount: true,
      },
    });
    if (!payout) throw new ApiError(404, "Payout not found");
    if (payout.tenantId !== tenantId) throw new ApiError(403, "Not authorized");
    return payout;
  },

  async getPayoutSummary({ tenantId }) {
    const [totals, byStatus, account] = await Promise.all([
      db.officePayout.aggregate({
        where: { tenantId },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      db.officePayout.groupBy({
        by: ["status"],
        where: { tenantId },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      db.incubationPayoutAccount.findUnique({
        where: { tenantId },
        select: {
          kycStatus: true,
          isActive: true,
          razorpayLinkedAccountId: true,
          activatedAt: true,
        },
      }),
    ]);

    return {
      totalAmount: totals._sum.amount || 0,
      totalCount: totals._count._all || 0,
      byStatus: byStatus.reduce((acc, row) => {
        acc[row.status] = {
          count: row._count._all,
          amount: row._sum.amount || 0,
        };
        return acc;
      }, {}),
      account,
    };
  },
};
