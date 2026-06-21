import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { buildQueryOptions } from "../../../utils/queryHelper.js";

export const officeSpaceService = {

  createOfficeSpace: async ({ tenantId, data }) => {
    const { pricingOptions, ...officeData } = data;

    return db.$transaction(async (tx) => {
      const office = await tx.officeSpace.create({
        data: {
          name: officeData.name,
          location: officeData.location,
          size: officeData.size,
          officeType: officeData.officeType,
          capacity: officeData.capacity,
          status: officeData.status || "AVAILABLE",
          description: officeData.description,
          monthlyRate: officeData.monthlyRate,
          amenities: officeData.amenities || [],
          images: officeData.images || [],
          visibility: officeData.visibility || "PUBLIC",
          ownerType: "TENANT",
          ownerId: tenantId,
          tenantId,
          isActive: true
        }
      });
      if (pricingOptions && pricingOptions.length > 0) {
        await tx.officePricing.createMany({
          data: pricingOptions.map((pricing) => ({
            officeId: office.id,
            pricingType: pricing.pricingType,
            amount: pricing.amount,
            currency: pricing.currency || "INR",
            securityDeposit: pricing.securityDeposit,
            minimumDuration: pricing.minimumDuration,
            discountPercentage: pricing.discountPercentage,
            isActive: true
          }))
        });
      }

      return tx.officeSpace.findUnique({
        where: { id: office.id },
        include: { pricingOptions: { where: { isActive: true } } }
      });
    });
  },

  getOfficeSpaces: async ({ tenantId, page, limit, search, sortBy, order }) => {
    const {
      skip,
      take,
      orderBy,
      where: searchWhere
    } = buildQueryOptions({
      page,
      limit,
      search,
      searchFields: ["name", "location", "officeType"],
      sortBy,
      order
    });

    const where = {
      tenantId,
      isActive: true,
      ...searchWhere
    };

    const [data, total] = await Promise.all([
      db.officeSpace.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          pricingOptions: { where: { isActive: true } },
          allocations: {
            where: { isActive: true },
            select: {
              id: true,
              startupId: true,
              startup: { select: { id: true, name: true, logoUrl: true } }
            }
          }
        }
      }),

      db.officeSpace.count({ where })
    ]);
    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit)
    };
  },

  getOfficeSpaceById: async ({ tenantId, officeId }) => {
    const office = await db.officeSpace.findFirst({
      where: { id: officeId, tenantId, isActive: true },
      include: {
        pricingOptions: { where: { isActive: true } },
        allocations: {
          where: { isActive: true },
          include: {
            startup: { select: { id: true, name: true, logoUrl: true, contactEmail: true } },
            allocatedBy: { select: { id: true, name: true } }
          }
        }
      }
    });

    if (!office) throw new ApiError(404, "Office space not found");
    return office;
  },

  updateOfficeSpace: async ({ tenantId, officeId, data }) => {
    await officeSpaceService.getOfficeSpaceById({ tenantId, officeId });

    return db.officeSpace.update({
      where: { id: officeId },
      data,
      include: { pricingOptions: { where: { isActive: true } } }
    });
  },

  deleteOfficeSpace: async ({ tenantId, officeId }) => {
    await officeSpaceService.getOfficeSpaceById({ tenantId, officeId });

    // Check for active allocations
    const activeAllocation = await db.officeAllocation.findFirst({
      where: { officeId, isActive: true }
    });

    if (activeAllocation) {
      throw new ApiError(400, "Cannot delete office with active allocations");
    }

    return db.officeSpace.update({
      where: { id: officeId },
      data: { isActive: false, status: "INACTIVE" }
    });
  },


  getPricing: async ({ tenantId, officeId }) => {
    await officeSpaceService.getOfficeSpaceById({ tenantId, officeId });

    return db.officePricing.findMany({
      where: { officeId, isActive: true },
      orderBy: { createdAt: "asc" }
    });
  },

  addPricing: async ({ tenantId, officeId, data }) => {
    await officeSpaceService.getOfficeSpaceById({ tenantId, officeId });

    const existing = await db.officePricing.findFirst({
      where: { officeId, pricingType: data.pricingType, isActive: true }
    });

    if (existing) {
      throw new ApiError(409, `${data.pricingType} pricing already exists for this office`);
    }

    return db.officePricing.create({
      data: {
        officeId,
        pricingType: data.pricingType,
        amount: data.amount,
        currency: data.currency || "INR",
        securityDeposit: data.securityDeposit,
        minimumDuration: data.minimumDuration,
        discountPercentage: data.discountPercentage,
        isActive: true
      }
    });
  },

  updatePricing: async ({ tenantId, officeId, pricingId, data }) => {
    await officeSpaceService.getOfficeSpaceById({ tenantId, officeId });

    const pricing = await db.officePricing.findFirst({
      where: { id: pricingId, officeId }
    });

    if (!pricing) throw new ApiError(404, "Pricing not found");

    return db.officePricing.update({
      where: { id: pricingId },
      data
    });
  },

  deletePricing: async ({ tenantId, officeId, pricingId }) => {
    await officeSpaceService.getOfficeSpaceById({ tenantId, officeId });

    const pricing = await db.officePricing.findFirst({
      where: { id: pricingId, officeId }
    });

    if (!pricing) throw new ApiError(404, "Pricing not found");
    const activeBooking = await db.officeBooking.findFirst({
      where: { pricingId, status: { in: ["PENDING_PAYMENT", "CONFIRMED", "ACTIVE"] } }
    });

    if (activeBooking) {
      throw new ApiError(409, "Cannot delete pricing with active bookings");
    }

    return db.officePricing.update({
      where: { id: pricingId },
      data: { isActive: false }
    });
  },

  getAllRequests: async ({ tenantId, page, limit, status, search }) => {
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      ...(status ? { status } : {}),
      ...(search
        ? {
            startup: {
              name: { contains: search, mode: "insensitive" }
            }
          }
        : {})
    };

    const [data, total] = await Promise.all([
      db.officeRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { requestedAt: "desc" },
        include: {
          startup: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              contactEmail: true,
              sector: true
            }
          },
          office: {
            select: {
              id: true,
              name: true,
              location: true
            }
          }
        }
      }),
      db.officeRequest.count({ where })
    ]);
console.log("THESE ARE REQUESTS",data)
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  },

  getRequestDetails: async ({ tenantId, requestId }) => {
    const req = await db.officeRequest.findFirst({
      where: { id: requestId, tenantId },
      include: {
        startup: {
          include: {
            members: {
              where: { isActive: true },
              include: {
                user: {
                  select: { id: true, firstName: true, lastName: true, email: true }
                }
              }
            }
          }
        },
        office: {
          include: {
            pricingOptions: { where: { isActive: true } }
          }
        }
      }
    });

    if (!req) {
      throw new ApiError(404, "Office request not found");
    }

    return req;
  },

  approveRequest: async ({
    requestId,
    tenantId,
    incubationUserId,
    officeId,
    startDate,
    endDate
  }) => {
    const parsedStartDate = startDate ? new Date(startDate) : null;
    const parsedEndDate = endDate ? new Date(endDate) : null;

    if (!parsedStartDate || isNaN(parsedStartDate.getTime())) {
      throw new ApiError(400, "Invalid start date format");
    }

    if (parsedEndDate && isNaN(parsedEndDate.getTime())) {
      throw new ApiError(400, "Invalid end date format");
    }

    const request = await db.officeRequest.findFirst({
      where: { id: requestId, tenantId }
    });

    if (!request) throw new ApiError(404, "Request not found");
    if (request.status !== "PENDING")
      throw new ApiError(400, "Request already processed");

    // Verify office belongs to tenant
    const office = await db.officeSpace.findFirst({
      where: { id: officeId, tenantId, isActive: true }
    });
    if (!office) throw new ApiError(404, "Office not found for this tenant");

    // Simple check if office has active allocation
    const activeAllocation = await db.officeAllocation.findFirst({
      where: { officeId, isActive: true }
    });

    if (activeAllocation) {
      throw new ApiError(400, "Office already has an active allocation");
    }

    return db.$transaction(async (tx) => {
      await tx.officeRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED" }
      });

      const allocation = await tx.officeAllocation.create({
        data: {
          tenantId,
          officeId,
          startupId: request.startupId,
          allocatedById: incubationUserId,
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          status: "ACTIVE",
          isActive: true
        },
        include: {
          startup: { select: { id: true, name: true, logoUrl: true } },
          office: { select: { id: true, name: true, location: true } },
          allocatedBy: { select: { id: true, name: true } }
        }
      });

      // Update office status
      await tx.officeSpace.update({
        where: { id: officeId },
        data: { status: "OCCUPIED" }
      });

      return allocation;
    });
  },

  rejectRequest: async ({ requestId, tenantId, rejectionReason }) => {
    const request = await db.officeRequest.findFirst({
      where: { id: requestId, tenantId }
    });

    if (!request) throw new ApiError(404, "Request not found");
    if (request.status !== "PENDING")
      throw new ApiError(400, "Request already processed");

    return db.officeRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        rejectionReason: rejectionReason || null
      }
    });
  },

  // ==================== ALLOCATION MANAGEMENT ====================

  allocateOffice: async ({
    tenantId,
    officeId,
    startupId,
    allocatedById,
    startDate,
    endDate
  }) => {
    console.log("THIS IS ",endDate,startDate)
const parsedStartDate = startDate ? new Date(startDate) : null;
    const parsedEndDate = endDate ? new Date(endDate) : null;

    if (!parsedStartDate || isNaN(parsedStartDate.getTime())) {
      throw new ApiError(400, "Invalid start date format");
    }

    if (parsedEndDate && isNaN(parsedEndDate.getTime())) {
      throw new ApiError(400, "Invalid end date format");
    }
    const office = await db.officeSpace.findFirst({
      where: { id: officeId, tenantId, isActive: true }
    });
    if (!office) throw new ApiError(404, "Office not found for this tenant");

    const association = await db.startupTenantAssociation.findFirst({
      where: { startupId, tenantId, isActive: true }
    });
    if (!association) {
      throw new ApiError(403, "Startup is not part of this tenant");
    }

    const existing = await db.officeAllocation.findFirst({
      where: { startupId, tenantId, isActive: true }
    });

    if (existing) {
      throw new ApiError(400, "Startup already has an active office allocation");
    }

    // Simple check if office already has active allocation
    const activeAllocation = await db.officeAllocation.findFirst({
      where: { officeId, isActive: true }
    });

    if (activeAllocation) {
      throw new ApiError(400, "Office already has an active allocation");
    }

    return db.$transaction(async (tx) => {
      const allocation = await tx.officeAllocation.create({
        data: {
          tenantId,
          officeId,
          startupId,
          allocatedById,
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          status: "ACTIVE",
          isActive: true
        },
        include: {
          startup: { select: { id: true, name: true, logoUrl: true } },
          office: { select: { id: true, name: true, location: true } },
          allocatedBy: { select: { id: true, name: true } }
        }
      });

      // Update office status
      await tx.officeSpace.update({
        where: { id: officeId },
        data: { status: "OCCUPIED" }
      });

      return allocation;
    });
  },

  endAllocation: async ({ allocationId, tenantId }) => {
    const allocation = await db.officeAllocation.findFirst({
      where: { id: allocationId, tenantId }
    });

    if (!allocation) throw new ApiError(404, "Allocation not found");
    if (!allocation.isActive) throw new ApiError(400, "Allocation already ended");

    return db.$transaction(async (tx) => {
      const updated = await tx.officeAllocation.update({
        where: { id: allocationId },
        data: {
          isActive: false,
          status: "ENDED",
          endDate: new Date()
        }
      });

      // Check if office has other active allocations
      const otherActive = await tx.officeAllocation.findFirst({
        where: { officeId: allocation.officeId, isActive: true, id: { not: allocationId } }
      });

      if (!otherActive) {
        await tx.officeSpace.update({
          where: { id: allocation.officeId },
          data: { status: "AVAILABLE" }
        });
      }

      return updated;
    });
  },

  getAllocations: async ({ tenantId, page, limit, search, status }) => {
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      ...(status ? { status } : {}),
      ...(search
        ? {
            startup: {
              name: { contains: search, mode: "insensitive" }
            }
          }
        : {})
    };

    const [data, total] = await Promise.all([
      db.officeAllocation.findMany({
        where,
        skip,
        take: limit,
        include: {
          startup: { select: { id: true, name: true, logoUrl: true } },
          office: { select: { id: true, name: true, location: true } },
          allocatedBy: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: "desc" }
      }),
      db.officeAllocation.count({ where })
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  },

  getAllocationDetails: async ({ allocationId, tenantId }) => {
    const result = await db.officeAllocation.findFirst({
      where: { id: allocationId, tenantId },
      include: {
        startup: {
          include: {
            members: {
              where: { isActive: true },
              include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true } }
              }
            },
            programAssociations: {
              where: { isActive: true },
              include: { program: { select: { id: true, title: true } } }
            }
          }
        },
        office: {
          include: { pricingOptions: { where: { isActive: true } } }
        },
        allocatedBy: { select: { id: true, name: true, email: true } }
      }
    });

    if (!result) throw new ApiError(404, "Allocation not found");

    return result;
  },

  getOfficeAvailability: async ({ officeId }) => {
    const allocations = await db.officeAllocation.findMany({
      where: { officeId },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        isActive: true,
        status: true,
        startup: {
          select: {
            id: true,
            name: true,
            logoUrl: true
          }
        }
      },
      orderBy: { startDate: "asc" }
    });

    return allocations;
  },

  // ==================== DASHBOARD STATS ====================

  getDashboardStats: async ({ tenantId }) => {
    const [
      totalOffices,
      availableOffices,
      occupiedOffices,
      totalAllocations,
      activeAllocations,
      pendingRequests
    ] = await Promise.all([
      db.officeSpace.count({ where: { tenantId, isActive: true } }),
      db.officeSpace.count({ where: { tenantId, isActive: true, status: "AVAILABLE" } }),
      db.officeSpace.count({ where: { tenantId, isActive: true, status: "OCCUPIED" } }),
      db.officeAllocation.count({ where: { tenantId } }),
      db.officeAllocation.count({ where: { tenantId, isActive: true } }),
      db.officeRequest.count({ where: { tenantId, status: "PENDING" } })
    ]);

    return {
      totalOffices,
      availableOffices,
      occupiedOffices,
      maintenanceOffices: totalOffices - availableOffices - occupiedOffices,
      totalAllocations,
      activeAllocations,
      pendingRequests,
      occupancyRate: totalOffices > 0 ? Math.round((occupiedOffices / totalOffices) * 100) : 0
    };
  },

  // ==================== STARTUP PORTAL METHODS ====================

  getMyOffice: async ({ startupId }) => {
    return db.officeAllocation.findFirst({
      where: { startupId, isActive: true },
      include: {
        office: {
          include: { pricingOptions: { where: { isActive: true } } }
        }
      }
    });
  },

  getMyOfficeHistory: async ({ startupId }) => {
    return db.officeAllocation.findMany({
      where: { startupId },
      include: { office: true },
      orderBy: { createdAt: "desc" }
    });
  }
};
