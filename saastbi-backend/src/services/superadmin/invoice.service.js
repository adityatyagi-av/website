import db from "../../db/db.js";

export const InvoiceService = {
  getInvoices: async ({
    page = 1,
    limit = 10,
    search = "",
    status,
    sortBy = "createdAt",
    order = "desc",
  }) => {
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { tenant: { organizationName: { contains: search, mode: "insensitive" } } },
        { tenant: { tenantKey: { contains: search, mode: "insensitive" } } },
      ];
    }

    const orderBy = { [sortBy]: order };

    const [invoices, totalCount, paidCount, unpaidCount] = await Promise.all([
      db.invoice.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          tenant: {
            select: {
              id: true,
              organizationName: true,
              tenantKey: true,
            },
          },
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
      db.invoice.count({ where: { ...where, status: "PAID" } }),
      db.invoice.count({ where: { ...where, status: "UNPAID" } }),
    ]);

    const totalPages = Math.ceil(totalCount / take);

    return {
      data: invoices,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalPages,
        totalCount,
      },
      stats: {
        totalCount,
        paidCount,
        unpaidCount,
      },
    };
  },
};
