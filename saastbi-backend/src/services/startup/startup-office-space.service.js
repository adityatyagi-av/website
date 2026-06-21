import db from "../../db/db.js";
import { ApiError } from "../../utils/ApiError.js";

export const startupOfficeService = {
  requestOffice: async ({ startupUserId, startupId, tenantId, data }) => {
    const association = await db.startupTenantAssociation.findFirst({
      where: {
        startupId,
        tenantId,
        isActive: true,
      },
    });

    if (!association) {
      throw new ApiError(403, "Startup is not incubated in this tenant");
    }

    const allocated = await db.officeAllocation.findFirst({
      where: { startupId, tenantId, isActive: true },
    });

    if (allocated) {
      throw new ApiError(400, "Office space already allocated to this startup");
    }

    return db.officeRequest.create({
      data: {
        tenantId,
        startupId,
        requestedById: startupUserId,
        officeType: data.officeType,
        description: data.description ?? null,
        status: "PENDING",
      },
    });
  },

  getStartupRequests: async ({ startupId }) => {
    return db.officeRequest.findMany({
      where: { startupId },
      orderBy: { createdAt: "desc" },
      include: {
        startup: true,
      },
    });
  },
  getMyOffice: async ({ startupId }) => {
    return db.officeAllocation.findFirst({
      where: { startupId, isActive: true },
      include: { office: true },
    });
  },

  getMyOfficeHistory: async ({ startupId }) => {
    return db.officeAllocation.findMany({
      where: { startupId },
      include: { office: true },
      orderBy: { createdAt: "desc" },
    });
  },

  getOfficeAvailability: async ({ officeId }) => {
    const allocations = await db.officeAllocation.findMany({
      where: { officeId },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        isActive: true,
        startup: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
      },
      orderBy: { startDate: "asc" },
    });

    return allocations;
  },
};
