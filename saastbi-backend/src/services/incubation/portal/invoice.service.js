import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";

export const PortalInvoiceService = {
  getInvoices: async (tenantId, { page = 1, limit = 10, status }) => {
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where = { tenantId };
    if (status) where.status = status;

    const [invoices, totalCount, paidCount, unpaidCount] = await Promise.all([
      db.invoice.findMany({
        where,
        skip,
        take,
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
      db.invoice.count({ where: { ...where, status: "PAID" } }),
      db.invoice.count({ where: { ...where, status: "UNPAID" } }),
    ]);

    return {
      data: invoices,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / take),
      },
      stats: {
        totalCount,
        paidCount,
        unpaidCount,
      },
    };
  },

  getInvoiceById: async (invoiceId, tenantId) => {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
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
        tenant: {
          select: {
            id: true,
            organizationName: true,
            tenantKey: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new ApiError(404, "Invoice not found");
    }
    if (invoice.tenantId !== tenantId) {
      throw new ApiError(403, "You do not have access to this invoice");
    }

    return invoice;
  },
};
