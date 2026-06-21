import db from "../../db/db.js";
import { buildQueryOptions } from "../../utils/queryHelper.js";
import { ApiError } from "../../utils/ApiError.js";

export const TenantService = {
  getAllTenants: async ({
    page = 1,
    limit = 10,
    search = "",
    sortBy = "createdAt",
    order = "desc",
  }) => {
    const { skip, take, where, orderBy } = buildQueryOptions({
      page,
      limit,
      search,
      searchFields: ["organizationName", "domain"],
      defaultFields: ["organizationName", "domain"],
      sortBy,
      order,
    });

    const [tenants, totalCount] = await Promise.all([
      db.tenant.findMany({
        skip,
        take,
        where,
        orderBy,
        include: {
          plan: {
            select: { id: true, name: true, price: true, type: true },
          },
          billingHistory: {
            orderBy: { createdAt: "desc" },
            take: 5,
            include: { invoice: true },
          },
          subscriptions: {
            orderBy: { createdAt: "desc" },
            include: { plan: true },
          },
          userMemberships: {
            where: { isActive: true },
            select: {
              id: true,
              isAdmin: true,
              incubationUser: {
                select: { id: true, name: true, email: true, imageUrl: true },
              },
            },
          },
          invoices: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      }),
      db.tenant.count({ where }),
    ]);

    const enrichedTenants = tenants.map((tenant) => {
      const activeSub = tenant.subscriptions.find((s) => s.status === "ACTIVE");

      let nextBillingDate = null;
      if (activeSub?.endDate) {
        nextBillingDate = new Date(activeSub.endDate);
      }

      return {
        ...tenant,
        totalUsers: tenant.userMemberships.length,
        currentSubscriptionStatus: activeSub ? activeSub.status : "INACTIVE",
        currentPlan: activeSub ? activeSub.plan : tenant.plan || null,
        nextBillingDate,
      };
    });

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: enrichedTenants,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalCount,
        totalPages,
      },
    };
  },

  getTenantById: async (tenantId) => {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      include: {
        plan: {
          include: {
            planModules: { include: { module: true } },
          },
        },
        subscriptions: {
          orderBy: { createdAt: "desc" },
          include: { plan: true },
        },
        userMemberships: {
          where: { isActive: true },
          include: {
            incubationUser: {
              select: { id: true, name: true, email: true, imageUrl: true },
            },
            role: { select: { id: true, roleName: true } },
          },
        },
        invoices: {
          orderBy: { createdAt: "desc" },
          include: { billingHistory: true },
        },
        billingHistory: {
          orderBy: { createdAt: "desc" },
          include: { invoice: true },
        },
      },
    });

    if (!tenant) {
      throw new ApiError(404, "Tenant not found");
    }

    const activeSub = tenant.subscriptions.find((s) => s.status === "ACTIVE");

    return {
      ...tenant,
      totalUsers: tenant.userMemberships.length,
      currentSubscriptionStatus: activeSub ? activeSub.status : "INACTIVE",
      currentPlan: activeSub ? activeSub.plan : tenant.plan || null,
      nextBillingDate: activeSub?.endDate ? new Date(activeSub.endDate) : null,
    };
  },

  getTenantInvoices: async (tenantId, { page = 1, limit = 10, status }) => {
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const skip = (Number(page) - 1) * Number(limit);
    const where = { tenantId };
    if (status) where.status = status;

    const [invoices, totalCount] = await Promise.all([
      db.invoice.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        include: {
          billingHistory: {
            select: {
              id: true,
              amount: true,
              billingDate: true,
              description: true,
              status: true,
              paymentMethod: true,
            },
          },
        },
      }),
      db.invoice.count({ where }),
    ]);

    return {
      data: invoices,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / Number(limit)),
      },
    };
  },
};
