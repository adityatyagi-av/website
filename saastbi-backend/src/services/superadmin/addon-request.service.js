import db from "../../db/db.js";
import { buildQueryOptions } from "../../utils/queryHelper.js";
import { ApiError } from "../../utils/ApiError.js";
import sendMail from "../../config/sendMail.js";
import path from "path";

export const SuperAdminAddonRequestService = {
  getAllAddonRequests: async ({
    page = 1,
    limit = 10,
    search = "",
    status,
    sortBy = "createdAt",
    order = "desc",
  }) => {
    const { skip, take, orderBy } = buildQueryOptions({
      page,
      limit,
      sortBy,
      order,
    });

    const where = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { addon: { name: { contains: search, mode: "insensitive" } } },
        { tenant: { organizationName: { contains: search, mode: "insensitive" } } },
        { requestedBy: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [requests, totalCount] = await Promise.all([
      db.addonServiceRequest.findMany({
        skip,
        take,
        where,
        orderBy,
        include: {
          tenant: { select: { id: true, organizationName: true, tenantLogo: true } },
          requestedBy: { select: { id: true, name: true, email: true, imageUrl: true } },
          addon: { select: { id: true, addonKey: true, name: true, type: true, price: true, icon: true } },
        },
      }),
      db.addonServiceRequest.count({ where }),
    ]);

    return {
      data: requests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  },

  getAddonRequestById: async (requestId) => {
    const request = await db.addonServiceRequest.findUnique({
      where: { id: requestId },
      include: {
        tenant: { select: { id: true, organizationName: true, tenantLogo: true, domain: true } },
        requestedBy: { select: { id: true, name: true, email: true, imageUrl: true } },
        addon: true,
      },
    });

    if (!request) {
      throw new ApiError(404, "Addon request not found");
    }

    return request;
  },

  updateAddonRequestStatus: async (requestId, newStatus, reviewerId, adminNotes) => {
    const request = await db.addonServiceRequest.findUnique({
      where: { id: requestId },
      include: {
        requestedBy: { select: { name: true, email: true } },
        addon: { select: { name: true } },
      },
    });

    if (!request) {
      throw new ApiError(404, "Addon request not found");
    }

    const updated = await db.addonServiceRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        ...(adminNotes !== undefined && { adminNotes }),
      },
      include: {
        tenant: { select: { id: true, organizationName: true } },
        requestedBy: { select: { id: true, name: true, email: true } },
        addon: { select: { id: true, name: true, type: true } },
      },
    });

    try {
      const templatePath = path.resolve("src/mails/addon-request-status-update.ejs");
      await sendMail(
        updated.requestedBy.email,
        `Add-on Request ${newStatus} - ${updated.addon.name}`,
        templatePath,
        {
          userName: updated.requestedBy.name,
          addonName: updated.addon.name,
          newStatus,
          adminNotes: adminNotes || null,
          organizationName: updated.tenant.organizationName,
        }
      );
    } catch (_) {}

    return updated;
  },
};
