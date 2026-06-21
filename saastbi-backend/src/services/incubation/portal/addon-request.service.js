import db from "../../../db/db.js";
import { buildQueryOptions } from "../../../utils/queryHelper.js";
import { ApiError } from "../../../utils/ApiError.js";
import sendMail from "../../../config/sendMail.js";
import path from "path";

export const PortalAddonRequestService = {
  getAvailableAddons: async () => {
    const addons = await db.addon.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        addonKey: true,
        name: true,
        description: true,
        type: true,
        price: true,
        unit: true,
        estimatedPrice: true,
        icon: true,
      },
    });
    return addons;
  },

  submitAddonRequest: async ({ tenantId, requestedById, addonId, phone, preferredDate, preferredTime, message }) => {
    const addon = await db.addon.findUnique({ where: { id: addonId } });
    if (!addon || !addon.isActive) {
      throw new ApiError(404, "Addon not found or is not currently available");
    }

    const request = await db.addonServiceRequest.create({
      data: {
        tenantId,
        requestedById,
        addonId,
        phone,
        preferredDate: new Date(preferredDate),
        preferredTime,
        message,
      },
      include: {
        tenant: { select: { id: true, organizationName: true } },
        requestedBy: { select: { id: true, name: true, email: true } },
        addon: { select: { id: true, name: true, type: true } },
      },
    });

    try {
      const admins = await db.superAdmin.findMany({
        where: { role: { in: ["ADMIN", "RELATIONSHIP_MANAGER"] } },
        select: { email: true, name: true },
      });

      if (admins.length > 0) {
        const templatePath = path.resolve("src/mails/addon-request-submitted.ejs");
        const emailPromises = admins.map((admin) =>
          sendMail(
            admin.email,
            `New Add-on Request: ${addon.name} - ${request.tenant.organizationName}`,
            templatePath,
            {
              adminName: admin.name,
              addonName: addon.name,
              addonType: addon.type,
              requesterName: request.requestedBy.name,
              requesterEmail: request.requestedBy.email,
              phone,
              preferredDate,
              preferredTime,
              message: message || "No additional message",
              organizationName: request.tenant.organizationName,
            }
          )
        );
        await Promise.allSettled(emailPromises);
      }
    } catch (_) {}

    return request;
  },

  getMyAddonRequests: async (tenantId, { page = 1, limit = 10, status, sortBy = "createdAt", order = "desc" }) => {
    const { skip, take, orderBy } = buildQueryOptions({ page, limit, sortBy, order });

    const where = { tenantId };
    if (status) {
      where.status = status;
    }

    const [requests, totalCount] = await Promise.all([
      db.addonServiceRequest.findMany({
        skip,
        take,
        where,
        orderBy,
        include: {
          addon: { select: { id: true, addonKey: true, name: true, type: true, price: true, icon: true } },
          requestedBy: { select: { id: true, name: true, email: true } },
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

  getAddonRequestById: async (requestId, tenantId) => {
    const request = await db.addonServiceRequest.findUnique({
      where: { id: requestId },
      include: {
        addon: true,
        requestedBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!request) {
      throw new ApiError(404, "Addon request not found");
    }
    if (request.tenantId !== tenantId) {
      throw new ApiError(403, "You do not have access to this request");
    }

    return request;
  },

  cancelAddonRequest: async (requestId, tenantId) => {
    const request = await db.addonServiceRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new ApiError(404, "Addon request not found");
    }
    if (request.tenantId !== tenantId) {
      throw new ApiError(403, "You do not have access to this request");
    }
    if (request.status !== "PENDING") {
      throw new ApiError(400, "Only pending requests can be cancelled");
    }

    const updated = await db.addonServiceRequest.update({
      where: { id: requestId },
      data: { status: "CANCELLED" },
      include: {
        addon: { select: { id: true, name: true, type: true } },
      },
    });

    return updated;
  },
};
