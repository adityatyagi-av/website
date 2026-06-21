/**
 * Office Core Service
 * 
 * Consolidated service for all office operations used by both
 * Provider (Incubation Portal) and Receiver (Startup Portal) APIs.
 */

import db from "../db/db.js";
import { ApiError } from "../utils/ApiError.js";
import { buildQueryOptions } from "../utils/queryHelper.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import { NotificationService } from "./common/notification.service.js";
import { OfficeSubscriptionService } from "./common/office-subscription.service.js";
import { computeBookingEndDate } from "../utils/officeCycle.js";
import { ensurePayoutAccountActivated } from "./incubation/portal/payout-account.service.js";

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

function resolveBookingDuration({ pricing, requestedDuration }) {
  const fallback = pricing?.defaultDuration || pricing?.minimumDuration || 1;
  let duration = Number(requestedDuration) > 0 ? Number(requestedDuration) : fallback;
  if (pricing?.minDuration && duration < pricing.minDuration) {
    throw new ApiError(400, `Minimum duration is ${pricing.minDuration}`);
  }
  if (pricing?.maxDuration && duration > pricing.maxDuration) {
    throw new ApiError(400, `Maximum duration is ${pricing.maxDuration}`);
  }
  return duration;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if user can manage (owns) an office
 */
async function canManageOffice({ userId, officeId, tenantId }) {
  const office = await db.officeSpace.findUnique({
    where: { id: officeId },
    include: {
      ownerStartup: { select: { members: { where: { userId, isActive: true, role: { in: ["OWNER", "ADMIN"] } } } } },
      ownerPage: { select: { members: { where: { userId, role: { in: ["OWNER", "ADMIN"] } } } } },
      tenant: { select: { users: { where: { userId, isActive: true } } } }
    }
  });

  if (!office) return false;
  
  // If tenantId provided, check tenant ownership
  if (tenantId && office.tenantId === tenantId && office.ownerType === "TENANT") {
    return true;
  }

  // Check ownership based on type
  if (office.ownerType === "USER" && office.userId === userId) return true;
  if (office.ownerType === "STARTUP" && office.ownerStartup?.members?.length > 0) return true;
  if (office.ownerType === "PAGE" && office.ownerPage?.members?.length > 0) return true;
  if (office.ownerType === "TENANT" && office.tenant?.users?.length > 0) return true;

  return false;
}

/**
 * Get requester fields based on type
 */
async function getRequesterFields({ userId, requesterType, requesterId, startupId }) {
  const fields = {};
  
  if (requesterType === "USER") {
    fields.userId = userId;
  } else if (requesterType === "STARTUP") {
    const id = startupId || requesterId;
    const membership = await db.startupMember.findFirst({
      where: { userId, startupId: id, isActive: true }
    });
    if (!membership) throw new ApiError(403, "Not authorized to act for this startup");
    fields.startupId = id;
  } else if (requesterType === "PAGE") {
    const membership = await db.pageMember.findFirst({
      where: { userId, pageId: requesterId }
    });
    if (!membership) throw new ApiError(403, "Not authorized to act for this page");
    fields.pageId = requesterId;
  }
  
  return fields;
}

/**
 * Calculate pricing amount
 */
async function calculateAmount({ pricingId, startDate, endDate, pricingType }) {
  const pricing = await db.officePricing.findUnique({ where: { id: pricingId } });
  if (!pricing) throw new ApiError(404, "Pricing not found");

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;

  let duration = 1;
  if (end) {
    const diffMs = end.getTime() - start.getTime();
    const type = pricingType || pricing.pricingType;
    switch (type) {
      case "HOURLY": duration = Math.ceil(diffMs / (1000 * 60 * 60)); break;
      case "DAILY": duration = Math.ceil(diffMs / (1000 * 60 * 60 * 24)); break;
      case "WEEKLY": duration = Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 7)); break;
      case "MONTHLY": duration = Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30)); break;
      case "YEARLY": duration = Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 365)); break;
    }
  }

  if (pricing.minimumDuration && duration < pricing.minimumDuration) {
    duration = pricing.minimumDuration;
  }

  let baseAmount = pricing.amount * duration;
  let discount = 0;
  if (pricing.discountPercentage && duration > 1) {
    discount = (baseAmount * pricing.discountPercentage) / 100;
  }

  return {
    baseAmount,
    discount,
    totalAmount: baseAmount - discount,
    securityDeposit: pricing.securityDeposit || 0,
    currency: pricing.currency,
    duration,
    pricingType: pricing.pricingType
  };
}

// ============================================================================
// OFFICE SPACE CRUD (Provider)
// ============================================================================

export const OfficeCoreService = {
  
  // ==================== OFFICE SPACE ====================
  
  async createOffice({ tenantId, userId, data }) {
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

      if (pricingOptions?.length > 0) {
        await tx.officePricing.createMany({
          data: pricingOptions.map((p) => ({
            officeId: office.id,
            pricingType: p.pricingType,
            amount: p.amount,
            currency: p.currency || "INR",
            securityDeposit: p.securityDeposit,
            minimumDuration: p.minimumDuration,
            discountPercentage: p.discountPercentage,
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

  async getOffices({ tenantId, filters }) {
    const { page = 1, limit = 10, search, sortBy = "createdAt", order = "desc" } = filters;

    const { skip, take, orderBy, where: searchWhere } = buildQueryOptions({
      page, limit, search,
      searchFields: ["name", "location", "officeType"],
      sortBy, order
    });

    const where = { tenantId, isActive: true, ...searchWhere };

    const [data, total] = await Promise.all([
      db.officeSpace.findMany({
        where, skip, take, orderBy,
        include: {
          pricingOptions: { where: { isActive: true } },
          allocations: {
            where: { isActive: true },
            select: {
              id: true, startupId: true,
              startup: { select: { id: true, name: true, logoUrl: true } }
            }
          },
          bookings: {
            where: { status: { in: ["CONFIRMED", "ACTIVE"] } },
            select: { id: true, status: true, startDate: true, endDate: true }
          }
        }
      }),
      db.officeSpace.count({ where })
    ]);

    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  },

  async getOfficeById({ officeId, tenantId }) {
    const where = tenantId 
      ? { id: officeId, tenantId, isActive: true }
      : { id: officeId, isActive: true };
      
    const office = await db.officeSpace.findFirst({
      where,
      include: {
        pricingOptions: { where: { isActive: true } },
        allocations: {
          where: { isActive: true },
          include: {
            startup: { select: { id: true, name: true, logoUrl: true, contactEmail: true } },
            allocatedBy: { select: { id: true, name: true } }
          }
        },
        tenant: { select: { id: true, organizationName: true, tenantLogo: true } }
      }
    });

    if (!office) throw new ApiError(404, "Office space not found");
    return office;
  },

  async updateOffice({ officeId, tenantId, data }) {
    await this.getOfficeById({ officeId, tenantId });
    
    return db.officeSpace.update({
      where: { id: officeId },
      data,
      include: { pricingOptions: { where: { isActive: true } } }
    });
  },

  async deleteOffice({ officeId, tenantId }) {
    await this.getOfficeById({ officeId, tenantId });

    const activeAllocation = await db.officeAllocation.findFirst({
      where: { officeId, isActive: true }
    });
    if (activeAllocation) throw new ApiError(400, "Cannot delete office with active allocations");

    const activeBookings = await db.officeBooking.count({
      where: { officeId, status: { in: ["CONFIRMED", "ACTIVE", "PENDING_PAYMENT"] } }
    });
    if (activeBookings > 0) throw new ApiError(400, "Cannot delete office with active bookings");

    return db.officeSpace.update({
      where: { id: officeId },
      data: { isActive: false, status: "INACTIVE" }
    });
  },

  // ==================== PRICING ====================

  async getPricing({ officeId, tenantId }) {
    if (tenantId) await this.getOfficeById({ officeId, tenantId });
    return db.officePricing.findMany({
      where: { officeId, isActive: true },
      orderBy: { createdAt: "asc" }
    });
  },

  async addPricing({ officeId, tenantId, data }) {
    await this.getOfficeById({ officeId, tenantId });

    const existing = await db.officePricing.findFirst({
      where: { officeId, pricingType: data.pricingType, isActive: true }
    });
    if (existing) throw new ApiError(409, `${data.pricingType} pricing already exists`);

    if (Number(data.amount) > 0 && tenantId) {
      await ensurePayoutAccountActivated(tenantId);
    }

    if (data.paymentMode === "SUBSCRIPTION") {
      if (!data.billingCycle) {
        throw new ApiError(400, "billingCycle is required for SUBSCRIPTION pricing");
      }
      if (!data.defaultDuration || data.defaultDuration < 1) {
        throw new ApiError(400, "defaultDuration is required for SUBSCRIPTION pricing");
      }
    }
    if (data.billingCycle === "CUSTOM" && !data.customCycleDays) {
      throw new ApiError(400, "customCycleDays is required when billingCycle is CUSTOM");
    }
    if (data.billingCycle === "CUSTOM" && (data.customCycleDays < 1 || data.customCycleDays > 365)) {
      throw new ApiError(400, "customCycleDays must be between 1 and 365");
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
        paymentMode: data.paymentMode || "ONE_TIME",
        billingCycle: data.billingCycle,
        customCycleDays: data.customCycleDays,
        defaultDuration: data.defaultDuration,
        minDuration: data.minDuration,
        maxDuration: data.maxDuration,
        gstApplicable: data.gstApplicable ?? false,
        gstPercentage: data.gstPercentage,
        tdsApplicable: data.tdsApplicable ?? false,
        tdsPercentage: data.tdsPercentage,
        platformFeePercentage: data.platformFeePercentage,
        lateFeePercentage: data.lateFeePercentage,
        gracePeriodDays: data.gracePeriodDays,
        advancePaymentMonths: data.advancePaymentMonths,
        isActive: true
      }
    });
  },

  async updatePricing({ officeId, pricingId, tenantId, data }) {
    await this.getOfficeById({ officeId, tenantId });

    const pricing = await db.officePricing.findFirst({ where: { id: pricingId, officeId } });
    if (!pricing) throw new ApiError(404, "Pricing not found");

    const newAmount = data.amount !== undefined ? Number(data.amount) : pricing.amount;
    if (newAmount > 0 && tenantId) {
      await ensurePayoutAccountActivated(tenantId);
    }

    if (data.billingCycle === "CUSTOM" && data.customCycleDays === undefined && !pricing.customCycleDays) {
      throw new ApiError(400, "customCycleDays is required when billingCycle is CUSTOM");
    }
    if (data.customCycleDays !== undefined && data.customCycleDays !== null) {
      if (data.customCycleDays < 1 || data.customCycleDays > 365) {
        throw new ApiError(400, "customCycleDays must be between 1 and 365");
      }
    }

    return db.officePricing.update({ where: { id: pricingId }, data });
  },

  async deletePricing({ officeId, pricingId, tenantId }) {
    await this.getOfficeById({ officeId, tenantId });

    const pricing = await db.officePricing.findFirst({ where: { id: pricingId, officeId } });
    if (!pricing) throw new ApiError(404, "Pricing not found");

    const activeBooking = await db.officeBooking.findFirst({
      where: { pricingId, status: { in: ["PENDING_PAYMENT", "CONFIRMED", "ACTIVE"] } }
    });
    if (activeBooking) throw new ApiError(409, "Cannot delete pricing with active bookings");

    return db.officePricing.update({ where: { id: pricingId }, data: { isActive: false } });
  },

  // ==================== AVAILABILITY ====================

  async checkAvailability({ officeId, startDate, endDate,pricingType }) {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : null;

    const pricing = await db.officePricing.findFirst({
      where: {
        officeId,
        pricingType,
        isActive: true
      }
    });
    
    if (!pricing) {
      throw new ApiError(
        400,
        `No pricing found for pricing type ${pricingType}`
      );
    }

    const diffMs = end.getTime() - start.getTime();
    
    let duration = 0;

    if (pricing.minimumDuration) {

      switch (pricingType) {
    
        case "DAILY":
          duration =
            Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
          break;
    
        case "WEEKLY":
          duration =
            Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 7));
          break;
    
        case "MONTHLY":
          duration =
            (end.getFullYear() - start.getFullYear()) * 12 +
            (end.getMonth() - start.getMonth());
    
          if (end.getDate() >= start.getDate()) {
            duration += 1;
          }
    
          break;
      }
    
      if (duration < pricing.minimumDuration) {
        return {
          isAvailable: false,
          reason: "MIN_DURATION_NOT_MET",
          message: `Minimum booking duration is ${pricing.minimumDuration} ${pricing.pricingType.toLowerCase()}(s)`
        };
      }
    }

    const conflictConditions = end
      ? { OR: [{ startDate: { lte: end }, endDate: { gte: start } }, { startDate: { lte: start }, endDate: null }] }
      : { OR: [{ startDate: { lte: start }, endDate: { gte: start } }, { endDate: null }] };

    const conflictingBookings = await db.officeBooking.findMany({
      where: { officeId, status: { in: ["CONFIRMED", "ACTIVE", "PENDING_PAYMENT"] }, ...conflictConditions },
      select: { id: true, startDate: true, endDate: true, status: true }
    });

    const allocationConflicts = await db.officeAllocation.findMany({
      where: { officeId, isActive: true, ...conflictConditions },
      select: { id: true, startDate: true, endDate: true, startup: { select: { name: true } } }
    });

    const hasConflict = conflictingBookings.length > 0 || allocationConflicts.length > 0;

    let nextAvailableDate = null;
    if (hasConflict) {
      const allEndDates = [...conflictingBookings.map(b => b.endDate), ...allocationConflicts.map(a => a.endDate)].filter(Boolean);
      if (allEndDates.length > 0) {
        const latestEnd = new Date(Math.max(...allEndDates.map(d => d.getTime())));
        nextAvailableDate = new Date(latestEnd.getTime() + 24 * 60 * 60 * 1000);
      }
      return { isAvailable: !hasConflict, conflictingBookings, allocationConflicts, nextAvailableDate};
    }

    // calculate estimated amount ONLY if available
    let estimatedAmount = duration * pricing.amount;

    // apply discount if exists
    if (pricing.discountPercentage) {
      estimatedAmount =
        estimatedAmount -
        (estimatedAmount *
          pricing.discountPercentage) /
          100;
    }

    return {
      isAvailable: true,
      conflictingBookings: [],
      allocationConflicts: [],
      nextAvailableDate: null,

      pricing: {
        pricingType: pricing.pricingType,
        amountPerUnit: pricing.amount,
        minimumDuration:
          pricing.minimumDuration,
        securityDeposit:
          pricing.securityDeposit || 0,
        discountPercentage:
          pricing.discountPercentage || 0,
        estimatedAmount,
        duration,
      },
    };
  },

  async getOfficeCalendar({ officeId, month, year }) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const bookings = await db.officeBooking.findMany({
      where: {
        officeId,
        status: { in: ["CONFIRMED", "ACTIVE", "PENDING_PAYMENT"] },
        OR: [
          { startDate: { gte: startDate, lte: endDate } },
          { endDate: { gte: startDate, lte: endDate } },
          { startDate: { lte: startDate }, endDate: { gte: endDate } }
        ]
      },
      select: { id: true, startDate: true, endDate: true, status: true }
    });

    const allocations = await db.officeAllocation.findMany({
      where: {
        officeId, isActive: true,
        OR: [
          { startDate: { lte: endDate }, endDate: { gte: startDate } },
          { startDate: { lte: endDate }, endDate: null }
        ]
      },
      select: { id: true, startDate: true, endDate: true, startup: { select: { name: true } } }
    });

    return { officeId, month, year, bookings, allocations };
  },

  // ==================== REQUESTS ====================

  async createRequest({ userId, startupId, data }) {
    const requesterFields = await getRequesterFields({
      userId, requesterType: data.requesterType || "STARTUP",
      requesterId: data.requesterId, startupId
    });

    let estimatedAmount = null;
    let office = null;

    if (data.officeId) {
      office = await db.officeSpace.findUnique({
        where: { id: data.officeId },
        include: { pricingOptions: { where: { isActive: true } } }
      });
      if (!office) throw new ApiError(404, "Office not found");
      if (!office.isActive) throw new ApiError(400, "Office is not available");

      const pricing = office.pricingOptions.find(p => p.pricingType === data.pricingType);
      if (pricing && data.desiredStartDate) {
        const calculated = await calculateAmount({
          pricingId: pricing.id,
          startDate: data.desiredStartDate,
          endDate: data.desiredEndDate
        });
        estimatedAmount = calculated.totalAmount;
      }
    }

    return db.officeRequest.create({
      data: {
        officeId: data.officeId,
        requesterType: data.requesterType || "STARTUP",
        requesterId: data.requesterId || startupId,
        ...requesterFields,
        officeOwnerType: office?.ownerType,
        officeOwnerId: office?.ownerId,
        tenantId: data.tenantId || office?.tenantId,
        preferredSize: data.preferredSize,
        preferredLocation: data.preferredLocation,
        desiredStartDate: data.desiredStartDate ? new Date(data.desiredStartDate) : null,
        desiredEndDate: data.desiredEndDate ? new Date(data.desiredEndDate) : null,
        pricingType: data.pricingType,
        estimatedAmount,
        purpose: data.purpose,
        notes: data.notes,
        status: "PENDING"
      },
      include: {
        office: { include: { pricingOptions: { where: { isActive: true } } } },
        startup: { select: { id: true, name: true, logoUrl: true } }
      }
    });
  },

  async getReceivedRequests({ tenantId, filters }) {
    const { page = 1, limit = 10, status, search } = filters;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      ...(status && { status }),
      ...(search && { startup: { name: { contains: search, mode: "insensitive" } } })
    };

    const [data, total] = await Promise.all([
      db.officeRequest.findMany({
        where, skip, take: limit,
        orderBy: { requestedAt: "desc" },
        include: {
          startup: { select: { id: true, name: true, logoUrl: true, contactEmail: true, sector: true } },
          office: { select: { id: true, name: true, location: true } }
        }
      }),
      db.officeRequest.count({ where })
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getSentRequests({ userId, startupId, filters }) {
    const { page = 1, limit = 10, status } = filters;
    const skip = (page - 1) * limit;

    const where = {
      startupId,
      ...(status && { status })
    };

    const [data, total] = await Promise.all([
      db.officeRequest.findMany({
        where, skip, take: limit,
        orderBy: { requestedAt: "desc" },
        include: {
          office: {
            select: {
              id: true, name: true, location: true, images: true,
              tenant: { select: { organizationName: true, tenantLogo: true } }
            }
          },
          booking: { select: { id: true, status: true } }
        }
      }),
      db.officeRequest.count({ where })
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getRequestById({ requestId, tenantId }) {
    const where = tenantId ? { id: requestId, tenantId } : { id: requestId };
    
    const request = await db.officeRequest.findFirst({
      where,
      include: {
        startup: {
          include: {
            members: {
              where: { isActive: true },
              include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }
            }
          }
        },
        office: { include: { pricingOptions: { where: { isActive: true } } } },
        booking: true
      }
    });

    if (!request) throw new ApiError(404, "Request not found");
    return request;
  },

  async approveRequest({ requestId, tenantId, incubationUserId, data }) {
    const parsedStartDate = data.startDate ? new Date(data.startDate) : null;
    const parsedEndDate = data.endDate ? new Date(data.endDate) : null;

    if (!parsedStartDate || isNaN(parsedStartDate.getTime())) {
      throw new ApiError(400, "Invalid start date format");
    }

    const request = await db.officeRequest.findFirst({ where: { id: requestId, tenantId } });
    if (!request) throw new ApiError(404, "Request not found");
    if (request.status !== "PENDING") throw new ApiError(400, "Request already processed");

    const office = await db.officeSpace.findFirst({
      where: { id: data.officeId, tenantId, isActive: true },
      include: { pricingOptions: { where: { isActive: true } } }
    });
    if (!office) throw new ApiError(404, "Office not found for this tenant");

    // Check availability
    const availability = await this.checkAvailability({
      officeId: data.officeId,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      pricingType:
    request.pricingType || "MONTHLY",
    });
    if (!availability.isAvailable) {
      throw new ApiError(400, "Office is not available for the selected dates");
    }

    const pricing = office.pricingOptions.find(p => p.pricingType === (request.pricingType || "MONTHLY"));
    let totalAmount = 0, securityDeposit = 0;
    const paymentMode = pricing?.paymentMode || "ONE_TIME";
    const billingCycle = pricing?.billingCycle || null;
    const customCycleDays = pricing?.customCycleDays || null;
    let totalDuration = null;
    let computedEndDate = parsedEndDate;

    if (pricing) {
      totalDuration = resolveBookingDuration({ pricing, requestedDuration: data.duration });
      if (paymentMode === "SUBSCRIPTION" && billingCycle) {
        computedEndDate = computeBookingEndDate({
          startDate: parsedStartDate,
          billingCycle,
          totalDuration,
          customCycleDays,
        });
      }
    }

    if (pricing && data.isPaymentRequired !== false) {
      if (paymentMode === "SUBSCRIPTION") {
        totalAmount = pricing.amount;
      } else {
        const calculated = await calculateAmount({
          pricingId: pricing.id,
          startDate: parsedStartDate,
          endDate: computedEndDate || parsedEndDate,
        });
        totalAmount = calculated.totalAmount;
      }
      securityDeposit = pricing.securityDeposit || 0;

      if (Number(totalAmount) > 0) {
        await ensurePayoutAccountActivated(tenantId);
      }
    }

    const gracePeriodDays = pricing?.gracePeriodDays || 0;
    const gracePeriodEndsAt = gracePeriodDays > 0
      ? new Date(parsedStartDate.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000)
      : null;

    return db.$transaction(async (tx) => {
      await tx.officeRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED" }
      });

      // Create booking
      const booking = await tx.officeBooking.create({
        data: {
          officeId: data.officeId,
          requestId,
          bookerType: request.requesterType || "STARTUP",
          bookerId: request.requesterId,
          startupId: request.startupId,
          userId: request.userId,
          pageId: request.pageId,
          pricingId: pricing?.id,
          startDate: parsedStartDate,
          endDate: computedEndDate || parsedEndDate,
          pricingType: request.pricingType || "MONTHLY",
          paymentMode,
          billingCycle,
          customCycleDays,
          totalDuration,
          nextDueDate: paymentMode === "SUBSCRIPTION" ? parsedStartDate : null,
          gracePeriodEndsAt,
          baseAmount: totalAmount,
          totalAmount,
          securityDeposit,
          securityDepositStatus: securityDeposit > 0 ? "PENDING" : "NOT_REQUIRED",
          status: data.isPaymentRequired === false ? "CONFIRMED" : "PENDING_PAYMENT",
          isPaymentRequired: data.isPaymentRequired !== false,
          notes: data.notes
        }
      });

      // Create allocation if no payment required AND requester is a startup
      if (data.isPaymentRequired === false && request.startupId) {
        await tx.officeAllocation.create({
          data: {
            tenantId,
            officeId: data.officeId,
            startupId: request.startupId,
            allocatedById: incubationUserId,
            bookingId: booking.id,
            startDate: parsedStartDate,
            endDate: computedEndDate || parsedEndDate,
            status: "ACTIVE",
            isActive: true
          }
        });

        await tx.officeSpace.update({
          where: { id: data.officeId },
          data: { status: "OCCUPIED" }
        });
      } else if (data.isPaymentRequired === false) {
        // Non-startup requesters (User/Page) without payment just get office marked as occupied
        await tx.officeSpace.update({
          where: { id: data.officeId },
          data: { status: "OCCUPIED" }
        });
      }
      const actor =
    await tx.incubationUser.findUnique({
      where: {
        id: incubationUserId,
      },
      select: {
        name: true,
        imageUrl: true,
      },
    });

      if (request.startupId) {
        const startupMembers = await tx.startupMember.findMany({
          where: {
            startupId: request.startupId,
            isActive: true,
          },
          select: {
            userId: true,
          },
        });
      
        const recipientIds = [
          ...new Set(startupMembers.map((m) => m.userId)),
        ];
      
        if (recipientIds.length > 0) {
          await NotificationService.sendBulk({
            recipientIds,
            type: "OFFICE_REQUEST_STATUS",
            category: "OFFICE",
            priority: "HIGH",
            title: "Office Request Approved",
            message: `Your office request has been approved.`,
            entityType: "OfficeRequest",
            entityId: requestId,
            actionUrl: `/office-space`,
            actorId: incubationUserId,
            data: {
              requestId,
              bookingId: booking.id,
              officeId: office.id,
              officeName: office.name,
              location: office.location,
              startDate: parsedStartDate,
              endDate: computedEndDate || parsedEndDate,
              pricingType: request.pricingType,
              totalAmount,
              status: "APPROVED",
              isPaymentRequired:
                data.isPaymentRequired !== false,
            },
            actorName: actor?.name || null,
            actorAvatar: actor?.imageUrl || null,
          });
        }
      }
      

      return tx.officeBooking.findUnique({
        where: { id: booking.id },
        include: {
          office: { select: { id: true, name: true, location: true } },
          bookerStartup: { select: { id: true, name: true, logoUrl: true } }
        }
      });
    });
  },

  async rejectRequest({ requestId, tenantId,incubationUserId, rejectionReason }) {
    const request = await db.officeRequest.findFirst({ where: { id: requestId, tenantId } });
    if (!request) throw new ApiError(404, "Request not found");
    if (request.status !== "PENDING") throw new ApiError(400, "Request already processed");

    const updatedRequest =
    await db.officeRequest.update({
      where: {
        id: requestId,
      },

      data: {
        status: "REJECTED",
        rejectionReason,
      },
    });

  const actor =
    await db.incubationUser.findUnique({
      where: {
        id: incubationUserId,
      },

      select: {
        userId: true,
        name: true,
        imageUrl: true,
      },
    });

  let recipientIds = [];

  if (request.startupId) {

    const startupMembers =
      await db.startupMember.findMany({
        where: {
          startupId:
            request.startupId,

          isActive: true,
        },

        select: {
          userId: true,
        },
      });

    recipientIds = [
      ...new Set(
        startupMembers.map(
          (m) => m.userId
        )
      ),
    ];
  }

  else if (request.userId) {
    recipientIds = [
      request.userId,
    ];
  }

  if (recipientIds.length > 0) {

    await NotificationService.sendBulk({
      recipientIds,
      type:
        "OFFICE_REQUEST_STATUS",
      category:
        "OFFICE",
      priority:
        "HIGH",
      title:
        "Office Request Rejected",
      message:
        rejectionReason
          ? `Your office request was rejected: ${rejectionReason}`
          : `Your office request has been rejected.`,
      entityType:
        "OfficeRequest",
      entityId:
        requestId,
      actionUrl:
        `/office-space`,
      actorId:
        actor?.userId || null,
      actorName:
        actor?.name || null,
      actorAvatar:
        actor?.imageUrl || null,
      data: {
        requestId,
        status:
          "REJECTED",
        rejectionReason:
          rejectionReason || null,
      },
    }).catch(console.error);
  }
  
  return updatedRequest;
  },

  async cancelRequest({ requestId, userId, startupId }) {
    const request = await db.officeRequest.findFirst({ where: { id: requestId, startupId } });
    if (!request) throw new ApiError(404, "Request not found");
    if (request.status !== "PENDING") throw new ApiError(400, "Can only cancel pending requests");

    const updatedRequest = await db.officeRequest.update({
      where: { id: requestId },
      data: { status: "CANCELLED" },
    });
  
    const startupMembers = await db.startupMember.findMany({
      where: {
        startupId,
        isActive: true,
      },
      select: {
        userId: true,
      },
    });
  
    const recipientIds = [
      ...new Set(startupMembers.map((m) => m.userId)),
    ];
  
    if (recipientIds.length > 0) {
      await NotificationService.sendBulk({
        recipientIds,
        type: "OFFICE_REQUEST_STATUS",
        category: "OFFICE",
        priority: "MEDIUM",
        title: "Office Request Cancelled",
        message: "Your office request has been cancelled.",
        entityType: "OfficeRequest",
        entityId: requestId,
        actionUrl: "/office-space",
        actorId: userId,
      });
    }
    return updatedRequest;  
  },

  // ==================== ALLOCATIONS (Free/Incubation) ====================

  async allocateOffice({ tenantId, incubationUserId, data }) {
    const parsedStartDate = data.startDate ? new Date(data.startDate) : null;
    const parsedEndDate = data.endDate ? new Date(data.endDate) : null;
    const pricingType = data.pricingType;

    if (!parsedStartDate || isNaN(parsedStartDate.getTime())) {
      throw new ApiError(400, "Invalid start date format");
    }

    if(!pricingType){
      throw new ApiError(400,"Pricing type not selected");
    }

    const office = await db.officeSpace.findFirst({
      where: { id: data.officeId, tenantId, isActive: true }
    });
    if (!office) throw new ApiError(404, "Office not found for this tenant");

    const association = await db.startupTenantAssociation.findFirst({
      where: { startupId: data.startupId, tenantId, isActive: true }
    });
    if (!association) throw new ApiError(403, "Startup is not part of this tenant");

    // Check availability
    const availability = await this.checkAvailability({
      officeId: data.officeId,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      pricingType: pricingType,
    });
    if (!availability.isAvailable) {
      throw new ApiError(400, "Office is not available for the selected dates");
    }

    return db.$transaction(async (tx) => {
      const allocation = await tx.officeAllocation.create({
        data: {
          tenantId,
          officeId: data.officeId,
          startupId: data.startupId,
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

      await tx.officeSpace.update({
        where: { id: data.officeId },
        data: { status: "OCCUPIED" }
      });

      return allocation;
    });
  },

  async getAllocations({ tenantId, filters }) {
    const { page = 1, limit = 10, search, status } = filters;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      ...(status && { status }),
      ...(search && { startup: { name: { contains: search, mode: "insensitive" } } })
    };

    const [data, total] = await Promise.all([
      db.officeAllocation.findMany({
        where, skip, take: limit,
        include: {
          startup: { select: { id: true, name: true, logoUrl: true } },
          office: { select: { id: true, name: true, location: true } },
          allocatedBy: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: "desc" }
      }),
      db.officeAllocation.count({ where })
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getAllocationById({ allocationId, tenantId }) {
    const allocation = await db.officeAllocation.findFirst({
      where: { id: allocationId, tenantId },
      include: {
        startup: {
          include: {
            members: {
              where: { isActive: true },
              include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } }
            }
          }
        },
        office: { include: { pricingOptions: { where: { isActive: true } } } },
        allocatedBy: { select: { id: true, name: true, email: true } }
      }
    });

    if (!allocation) throw new ApiError(404, "Allocation not found");
    return allocation;
  },

  async endAllocation({ allocationId, tenantId }) {
    const allocation = await db.officeAllocation.findFirst({
      where: { id: allocationId, tenantId }
    });
    if (!allocation) throw new ApiError(404, "Allocation not found");
    if (!allocation.isActive) throw new ApiError(400, "Allocation already ended");

    return db.$transaction(async (tx) => {
      const updated = await tx.officeAllocation.update({
        where: { id: allocationId },
        data: { isActive: false, status: "ENDED", endDate: new Date() }
      });

      // Check for other active allocations
      const otherActive = await tx.officeAllocation.findFirst({
        where: { officeId: allocation.officeId, isActive: true, id: { not: allocationId } }
      });

      if (!otherActive) {
        const activeBookings = await tx.officeBooking.count({
          where: { officeId: allocation.officeId, status: "ACTIVE" }
        });
        
        if (activeBookings === 0) {
          await tx.officeSpace.update({
            where: { id: allocation.officeId },
            data: { status: "AVAILABLE" }
          });
        }
      }

      return updated;
    });
  },

  async extendAllocation({ tenantId, allocationId, data }) {
    const newEndDate = new Date(data.endDate);
  
    if (isNaN(newEndDate.getTime())) {
      throw new ApiError(400, "Invalid end date format");
    }
  
    const allocation = await db.officeAllocation.findFirst({
      where: { id: allocationId, tenantId }
    });
  
    if (!allocation) {
      throw new ApiError(404, "Allocation not found");
    }
  
    if (!allocation.endDate) {
      throw new ApiError(400, "Cannot extend allocation without existing end date");
    }
  
    
    if (newEndDate <= allocation.endDate) {
      throw new ApiError(400, "New end date must be greater than current end date");
    }
  
    
    const availability = await this.checkAvailability({
      officeId: allocation.officeId,
      startDate: allocation.endDate,
      endDate: newEndDate
    });
  
    if (!availability.isAvailable) {
      throw new ApiError(400, "Office not available for extended duration");
    }
  
    
    const updated = await db.officeAllocation.update({
      where: { id: allocationId },
      data: {
        endDate: newEndDate
      },
      include: {
        startup: { select: { id: true, name: true } },
        office: { select: { id: true, name: true } }
      }
    });
  
    return updated;
  },

  // ==================== BOOKINGS ====================

  async getBookings({ role, tenantId, userId, startupId, filters }) {
    const { page = 1, limit = 10, officeId, status, startDate, endDate } = filters;
    const skip = (page - 1) * limit;

    let where = {};

    if (role === "owner" && tenantId) {
      // Provider: get bookings for tenant's offices
      const offices = await db.officeSpace.findMany({
        where: { tenantId, isActive: true },
        select: { id: true }
      });
      where.officeId = officeId || { in: offices.map(o => o.id) };
    } else if (startupId) {
      // Receiver: get startup's bookings
      where.startupId = startupId;
    } else if (userId) {
      // Individual user bookings
      where.userId = userId;
    }

    if (status) where.status = status;
    if (startDate) where.startDate = { gte: new Date(startDate) };
    if (endDate) where.endDate = { lte: new Date(endDate) };

    const [data, total] = await Promise.all([
      db.officeBooking.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          office: {
            select: {
              id: true, name: true, location: true, images: true,
              tenant: { select: { organizationName: true, tenantLogo: true } }
            }
          },
          bookerStartup: { select: { id: true, name: true, logoUrl: true } },
          pricing: true,
          payments: { select: { id: true, status: true, amount: true, paymentType: true } }
        }
      }),
      db.officeBooking.count({ where })
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getBookingById({ bookingId, tenantId, startupId }) {
    let where = { id: bookingId };
    if (startupId) where.startupId = startupId;

    const booking = await db.officeBooking.findFirst({
      where,
      include: {
        office: {
          include: {
            tenant: { select: { id: true, organizationName: true, tenantLogo: true } },
            pricingOptions: { where: { isActive: true } }
          }
        },
        bookerStartup: { select: { id: true, name: true, logoUrl: true, contactEmail: true } },
        request: true,
        pricing: true,
        payments: true,
        allocation: true
      }
    });

    if (!booking) throw new ApiError(404, "Booking not found");
    
    // If tenantId provided, verify office belongs to tenant
    if (tenantId && booking.office.tenantId !== tenantId) {
      throw new ApiError(403, "Not authorized to view this booking");
    }

    return booking;
  },

  async createDirectBooking({ userId, startupId, data }) {
    const office = await db.officeSpace.findUnique({
      where: { id: data.officeId },
      include: { pricingOptions: { where: { isActive: true } } }
    });

    if (!office) throw new ApiError(404, "Office not found");
    if (!office.isActive) throw new ApiError(400, "Office is not available");

    const pricing = office.pricingOptions.find(p => p.id === data.pricingId);
    if (!pricing) throw new ApiError(404, "Pricing option not found");

    const paymentMode = pricing.paymentMode || "ONE_TIME";
    const billingCycle = pricing.billingCycle || null;
    const customCycleDays = pricing.customCycleDays || null;
    const startDate = new Date(data.startDate);

    const totalDuration = resolveBookingDuration({ pricing, requestedDuration: data.duration });

    let endDate;
    if (paymentMode === "SUBSCRIPTION" && billingCycle) {
      endDate = computeBookingEndDate({
        startDate,
        billingCycle,
        totalDuration,
        customCycleDays,
      });
    } else if (data.endDate) {
      endDate = new Date(data.endDate);
    } else if (billingCycle) {
      endDate = computeBookingEndDate({
        startDate,
        billingCycle,
        totalDuration,
        customCycleDays,
      });
    } else {
      endDate = null;
    }

    const availability = await this.checkAvailability({
      officeId: data.officeId,
      startDate,
      endDate,
      pricingType: pricing.pricingType,
    });
    if (!availability.isAvailable) {
      throw new ApiError(409, "Office is not available for the selected dates");
    }

    let totalAmount;
    let baseAmount;
    let securityDeposit = pricing.securityDeposit || 0;

    if (paymentMode === "SUBSCRIPTION") {
      baseAmount = pricing.amount;
      totalAmount = pricing.amount;
    } else {
      const calculated = await calculateAmount({
        pricingId: pricing.id,
        startDate,
        endDate,
      });
      baseAmount = calculated.baseAmount;
      totalAmount = calculated.totalAmount;
      securityDeposit = calculated.securityDeposit;
    }

    if (Number(totalAmount) > 0 && office.tenantId) {
      await ensurePayoutAccountActivated(office.tenantId);
    }

    const gracePeriodDays = pricing?.gracePeriodDays || 0;
    const gracePeriodEndsAt = gracePeriodDays > 0
      ? new Date(startDate.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000)
      : null;

    return db.officeBooking.create({
      data: {
        officeId: data.officeId,
        bookerType: "STARTUP",
        bookerId: startupId,
        startupId,
        pricingId: pricing.id,
        startDate,
        endDate,
        pricingType: pricing.pricingType,
        paymentMode,
        billingCycle,
        customCycleDays,
        totalDuration,
        nextDueDate: paymentMode === "SUBSCRIPTION" ? startDate : null,
        gracePeriodEndsAt,
        baseAmount,
        totalAmount,
        securityDeposit,
        securityDepositStatus: securityDeposit > 0 ? "PENDING" : "NOT_REQUIRED",
        status: "PENDING_PAYMENT",
        isPaymentRequired: true,
        notes: data.notes
      },
      include: {
        office: { select: { id: true, name: true, location: true } },
        pricing: true
      }
    });
  },

  async confirmBooking({ bookingId, tenantId }) {
    const booking = await this.getBookingById({ bookingId, tenantId });

    if (!["PENDING_PAYMENT", "CONFIRMED"].includes(booking.status)) {
      throw new ApiError(400, "Booking cannot be confirmed in current status");
    }

    const now = new Date();
    const newStatus = booking.startDate <= now ? "ACTIVE" : "CONFIRMED";

    const updatedBooking = await db.$transaction(async (tx) => {
      const updated = await tx.officeBooking.update({
        where: { id: bookingId },
        data: {
          status: newStatus,
          isPaid: true,
        },
      });
  
      if (booking.startupId) {
        const startupMembers =
          await tx.startupMember.findMany({
            where: {
              startupId: booking.startupId,
              isActive: true,
            },
            select: {
              userId: true,
            },
          });
  
        const recipientIds = [
          ...new Set(
            startupMembers.map((m) => m.userId)
          ),
        ];
  
        if (recipientIds.length > 0) {
          await NotificationService.sendBulk({
            recipientIds,
            type: "OFFICE_BOOKING_UPDATE",
            category: "OFFICE",
            priority: "MEDIUM",
            title: "Office Booking Confirmed",
            message:
              newStatus === "ACTIVE"
                ? "Your office booking has been activated."
                : "Your office booking has been confirmed.",
            entityType: "OfficeBooking",
            entityId: bookingId,
            actionUrl: `/office-space`,
          });
        }
      }
      return updated;
    });
    return updatedBooking;
  
  },

  async activateBooking({ bookingId, tenantId }) {
    const booking = await this.getBookingById({ bookingId, tenantId });

    if (booking.status !== "CONFIRMED") {
      throw new ApiError(400, "Only confirmed bookings can be activated");
    }

    return db.$transaction(async (tx) => {
      const updated = await tx.officeBooking.update({
        where: { id: bookingId },
        data: { status: "ACTIVE" }
      });

      await tx.officeSpace.update({
        where: { id: booking.officeId },
        data: { status: "OCCUPIED" }
      });

      if (booking.startupId) {
        const startupMembers =
          await tx.startupMember.findMany({
            where: {
              startupId: booking.startupId,
              isActive: true,
            },
            select: {
              userId: true,
            },
          });

        const recipientIds = [
          ...new Set(
            startupMembers.map((m) => m.userId)
          ),
        ];
  
        if (recipientIds.length > 0) {
          await NotificationService.sendBulk({
            recipientIds,
            type: "OFFICE_BOOKING_UPDATE",
            category: "OFFICE",
            priority: "MEDIUM",
            title: "Office Booking Activated",
            message:
              "Your office booking is now active and ready to use.",
            entityType: "OfficeBooking",
            entityId: bookingId,
            actionUrl: `/office-space`,
          });
        }
      }
  

      return updated;
    });
  },

  async completeBooking({ bookingId, tenantId }) {
    const booking = await this.getBookingById({ bookingId, tenantId });

    if (!["ACTIVE", "CONFIRMED"].includes(booking.status)) {
      throw new ApiError(400, "Booking cannot be completed in current status");
    }

    return db.$transaction(async (tx) => {
      const updated = await tx.officeBooking.update({
        where: { id: bookingId },
        data: { status: "COMPLETED", endDate: new Date() }
      });

      // Check for other active bookings
      const activeBookings = await tx.officeBooking.count({
        where: { officeId: booking.officeId, status: "ACTIVE", id: { not: bookingId } }
      });

      const activeAllocations = await tx.officeAllocation.count({
        where: { officeId: booking.officeId, isActive: true }
      });

      if (activeBookings === 0 && activeAllocations === 0) {
        await tx.officeSpace.update({
          where: { id: booking.officeId },
          data: { status: "AVAILABLE" }
        });
      }
      if (booking.startupId) {
        const startupMembers = await tx.startupMember.findMany({
          where: {
            startupId: booking.startupId,
            isActive: true,
          },
          select: {
            userId: true,
          },
        });
  
        const recipientIds = [
          ...new Set(startupMembers.map((m) => m.userId)),
        ];
  
        if (recipientIds.length > 0) {
          await NotificationService.sendBulk({
            recipientIds,
            type: "OFFICE_BOOKING_UPDATE",
            category: "OFFICE",
            priority: "MEDIUM",
            title: "Office Booking Completed",
            message:
              "Your office booking has been completed.",
            entityType: "OfficeBooking",
            entityId: bookingId,
            actionUrl: `/office-space`,
          });
        }
      }
  

      return updated;
    });
  },

  async cancelBooking({ bookingId, tenantId, startupId, cancellationReason }) {
    const booking = await this.getBookingById({ bookingId, tenantId, startupId });

    if (["COMPLETED", "CANCELLED"].includes(booking.status)) {
      throw new ApiError(400, "Booking cannot be cancelled");
    }

    return db.$transaction(async (tx) => {
      const updated = await tx.officeBooking.update({
        where: { id: bookingId },
        data: { status: "CANCELLED", cancelledAt: new Date(), cancellationReason }
      });

      if (booking.status === "ACTIVE") {
        await tx.officeAllocation.updateMany({
          where: { bookingId, isActive: true },
          data: { status: "ENDED", isActive: false, endDate: new Date() },
        });

        const activeBookings = await tx.officeBooking.count({
          where: { officeId: booking.officeId, status: "ACTIVE", id: { not: bookingId } }
        });

        const activeAllocations = await tx.officeAllocation.count({
          where: { officeId: booking.officeId, isActive: true }
        });

        if (activeBookings === 0 && activeAllocations === 0) {
          await tx.officeSpace.update({
            where: { id: booking.officeId },
            data: { status: "AVAILABLE" }
          });
        }
      }

      if (booking.startupId) {
        const startupMembers = await tx.startupMember.findMany({
          where: {
            startupId: booking.startupId,
            isActive: true,
          },
          select: {
            userId: true,
          },
        });

        const recipientIds = [
          ...new Set(startupMembers.map((m) => m.userId)),
        ];

        if (recipientIds.length > 0) {
          await NotificationService.sendBulk({
            recipientIds,
            type: "OFFICE_BOOKING_UPDATE",
            category: "OFFICE",
            priority: "HIGH",
            title: "Office Booking Cancelled",
            message: cancellationReason
              ? `Your office booking has been cancelled. Reason: ${cancellationReason}`
              : "Your office booking has been cancelled.",
            entityType: "OfficeBooking",
            entityId: bookingId,
            actionUrl: `/office-space`,
          });
        }
      }
      return updated;
    });
  },

  // ==================== PAYMENTS ====================

  async initiatePayment({ userId, startupId, bookingId, paymentType }) {
    const booking = await db.officeBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        startupId: true,
        paymentMode: true,
        securityDeposit: true,
        currency: true,
        bookerType: true,
        bookerId: true,
        userId: true,
        officeId: true,
        pricing: { select: { paymentMode: true } },
      },
    });

    if (!booking) throw new ApiError(404, "Booking not found");
    if (startupId && booking.startupId !== startupId) {
      throw new ApiError(403, "Not authorized to make payment for this booking");
    }

    const mode = booking.paymentMode || booking.pricing?.paymentMode || "ONE_TIME";

    // SECURITY_DEPOSIT is always a one-time order regardless of mode
    if (paymentType === "SECURITY_DEPOSIT") {
      const amount = booking.securityDeposit || 0;
      if (amount <= 0) throw new ApiError(400, "No security deposit due");

      const office = await db.officeSpace.findUnique({
        where: { id: booking.officeId },
        select: { tenantId: true },
      });
      const payoutAccount = office?.tenantId
        ? await db.incubationPayoutAccount.findUnique({ where: { tenantId: office.tenantId } })
        : null;

      let transfers;
      if (payoutAccount?.razorpayLinkedAccountId) {
        transfers = [
          {
            account: payoutAccount.razorpayLinkedAccountId,
            amount: Math.round(amount * 100),
            currency: booking.currency,
            notes: { bookingId, paymentType: "SECURITY_DEPOSIT", tenantId: office.tenantId },
          },
        ];
      }

      const orderData = {
        amount: Math.round(amount * 100),
        currency: booking.currency,
        receipt: `office_sd_${bookingId}`,
        notes: { bookingId, paymentType: "SECURITY_DEPOSIT", officeId: booking.officeId },
      };
      if (transfers) orderData.transfers = transfers;

      const order = await razorpay.orders.create(orderData);
      const payment = await db.officePayment.create({
        data: {
          bookingId,
          officeId: booking.officeId,
          payerType: booking.bookerType,
          payerId: booking.bookerId,
          userId: booking.userId,
          startupId: booking.startupId,
          amount,
          currency: booking.currency,
          paymentType: "SECURITY_DEPOSIT",
          razorpayOrderId: order.id,
          status: "PENDING",
          metadata: { razorpayOrder: order, transfers },
        },
      });
      return {
        mode: "ONE_TIME",
        paymentId: payment.id,
        razorpayOrderId: order.id,
        amount: Math.round(amount * 100),
        currency: booking.currency,
        bookingId,
        key: process.env.RAZORPAY_KEY_ID,
      };
    }

    return OfficeSubscriptionService.initiateBookingPayment({ bookingId, startupId });
  },

  async verifyPayment({ paymentId, razorpayPaymentId, razorpaySignature }) {
    const payment = await db.officePayment.findUnique({
      where: { id: paymentId },
      include: { booking: { include: { office: true } } }
    });

    if (!payment) throw new ApiError(404, "Payment not found");
    if (payment.status !== "PENDING") throw new ApiError(400, "Payment already processed");

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${payment.razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      await db.officePayment.update({
        where: { id: paymentId },
        data: { status: "FAILED", failureReason: "Invalid signature" }
      });
      throw new ApiError(400, "Payment verification failed");
    }

    const invoiceNumber = `INV-OFF-${Date.now()}`;

    return db.$transaction(async (tx) => {
      const updatedPayment = await tx.officePayment.update({
        where: { id: paymentId },
        data: {
          razorpayPaymentId,
          razorpaySignature,
          status: "COMPLETED",
          paidAt: new Date(),
          invoiceNumber
        }
      });

      if (payment.paymentType === "BOOKING") {
        await tx.officeBooking.update({
          where: { id: payment.bookingId },
          data: { status: "CONFIRMED", isPaid: true }
        });
      }

      if (payment.paymentType === "SECURITY_DEPOSIT") {
        await tx.officeBooking.update({
          where: { id: payment.bookingId },
          data: { securityDepositStatus: "COLLECTED" }
        });
      }

      return {
        paymentId: updatedPayment.id,
        status: updatedPayment.status,
        bookingId: payment.bookingId,
        bookingStatus: "CONFIRMED",
        invoiceNumber
      };
    });
  },

  async getPayments({ tenantId, startupId, filters }) {
    const { page = 1, limit = 10, bookingId, status } = filters;
    const skip = (page - 1) * limit;

    let where = {};
    
    if (tenantId) {
      // Provider: get payments for tenant's offices
      const offices = await db.officeSpace.findMany({
        where: { tenantId, isActive: true },
        select: { id: true }
      });
      where.officeId = { in: offices.map(o => o.id) };
    } else if (startupId) {
      where.startupId = startupId;
    }

    if (bookingId) where.bookingId = bookingId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      db.officePayment.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          booking: {
            select: {
              id: true, startDate: true, endDate: true,
              office: { select: { name: true, location: true } },
              bookerStartup: { select: { name: true } }
            }
          }
        }
      }),
      db.officePayment.count({ where })
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getPaymentById({ paymentId, tenantId, startupId }) {
    const payment = await db.officePayment.findUnique({
      where: { id: paymentId },
      include: {
        booking: {
          include: {
            office: { select: { id: true, name: true, location: true, tenantId: true } },
            bookerStartup: { select: { name: true, contactEmail: true } }
          }
        }
      }
    });

    if (!payment) throw new ApiError(404, "Payment not found");
    
    if (tenantId && payment.booking.office.tenantId !== tenantId) {
      throw new ApiError(403, "Not authorized");
    }
    if (startupId && payment.startupId !== startupId) {
      throw new ApiError(403, "Not authorized");
    }

    return payment;
  },

  async initiateRefund({ paymentId, tenantId, amount, reason }) {
    const payment = await this.getPaymentById({ paymentId, tenantId });

    if (payment.status !== "COMPLETED") throw new ApiError(400, "Can only refund completed payments");
    if (!payment.razorpayPaymentId) throw new ApiError(400, "No Razorpay payment ID found");

    const refundAmount = amount || payment.amount;
    if (refundAmount > payment.amount) throw new ApiError(400, "Refund amount cannot exceed payment amount");

    const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
      amount: Math.round(refundAmount * 100),
      notes: { paymentId, reason }
    });

    return db.officePayment.update({
      where: { id: paymentId },
      data: {
        status: refundAmount === payment.amount ? "REFUNDED" : "COMPLETED",
        refundedAt: new Date(),
        refundAmount,
        refundReason: reason,
        metadata: { ...(payment.metadata || {}), refund }
      }
    });
  },

  async getInvoice({ paymentId, tenantId, startupId }) {
    const payment = await this.getPaymentById({ paymentId, tenantId, startupId });

    if (payment.status !== "COMPLETED") throw new ApiError(400, "Invoice only available for completed payments");

    return {
      invoiceNumber: payment.invoiceNumber,
      invoiceUrl: payment.invoiceUrl,
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      paymentType: payment.paymentType,
      paidAt: payment.paidAt,
      booking: payment.booking
    };
  },

  // ==================== WEBHOOKS ====================

  async handleRazorpayWebhook() {
    throw new ApiError(410, "This endpoint is deprecated. Use /api/webhooks/razorpay/office instead.");
  },

  // ==================== DASHBOARDS ====================

  async getProviderDashboard({ tenantId }) {
    const [
      totalOffices,
      availableOffices,
      occupiedOffices,
      totalAllocations,
      activeAllocations,
      pendingRequests,
      activeBookings,
      recentPayments,
      totalRevenue
    ] = await Promise.all([
      db.officeSpace.count({ where: { tenantId, isActive: true } }),
      db.officeSpace.count({ where: { tenantId, isActive: true, status: "AVAILABLE" } }),
      db.officeSpace.count({ where: { tenantId, isActive: true, status: "OCCUPIED" } }),
      db.officeAllocation.count({ where: { tenantId } }),
      db.officeAllocation.count({ where: { tenantId, isActive: true } }),
      db.officeRequest.count({ where: { tenantId, status: "PENDING" } }),
      db.officeBooking.count({
        where: {
          office: { tenantId },
          status: { in: ["CONFIRMED", "ACTIVE"] }
        }
      }),
      db.officePayment.aggregate({
        where: {
          office: { tenantId },
          status: "COMPLETED",
          paidAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        },
        _sum: { amount: true }
      }),
      db.officePayment.aggregate({
        where: {
          office: {
            tenantId
          },
          status: "COMPLETED",
        },
  
        _sum: {
          amount: true
        }
      }),
    ]);

    return {
      totalOffices,
      availableOffices,
      occupiedOffices,
      maintenanceOffices: totalOffices - availableOffices - occupiedOffices,
      totalAllocations,
      activeAllocations,
      pendingRequests,
      activeBookings,
      occupancyRate: totalOffices > 0 ? Math.round((occupiedOffices / totalOffices) * 100) : 0,
      monthlyRevenue: recentPayments._sum.amount || 0,
      totalRevenue: totalRevenue._sum.amount || 0
    };
  },

  async getReceiverDashboard({ startupId }) {
    const [activeBookings, upcomingBookings, pendingPayments, allocations] = await Promise.all([
      db.officeBooking.count({
        where: {
          startupId,
      
          status: {
            in: ["ACTIVE", "CONFIRMED"],
          },
      
          startDate: {
            lte: new Date(),
          },
      
          OR: [
            {
              endDate: {
                gte: new Date(),
              },
            },
            {
              endDate: null,
            },
          ],
        },
      }),
      db.officeBooking.count({
        where: {
          startupId,
          status: "CONFIRMED",
      
          startDate: {
            gt: new Date(),
          },
        },
      }),
      db.officeBooking.count({
        where: {
          startupId,
          status: "PENDING_PAYMENT",
        },
      }),
      db.officeAllocation.findMany({
        where: { startupId, isActive: true },
        include: { office: { select: { name: true, location: true } } }
      })
    ]);

    const totalSpent = await db.officePayment.aggregate({
      where: { startupId, status: "COMPLETED" },
      _sum: { amount: true }
    });

    return {
      activeBookings,
      upcomingBookings,
      pendingPayments,
      allocations,
      totalSpent: totalSpent._sum.amount || 0
    };
  },

  // ==================== BROWSE (Receiver) ====================

  async browseOffices({ startupId, tenantId, filters}) {
    const {
      page = 1, limit = 10, search, location, minCapacity, maxCapacity,
      officeType, amenities, pricingType, minPrice, maxPrice, sortBy = "createdAt", order = "desc",officeStatus
    } = filters;

    const { skip, take, orderBy } = buildQueryOptions({ page, limit, sortBy, order });

    const where = {
      isActive: true,
      status: officeStatus,
      // If tenantId provided (startup's own incubator), show TENANT_ONLY offices
      // Otherwise only show PUBLIC offices
      OR: [
        { visibility: "PUBLIC" },
        ...(tenantId ? [{ visibility: "TENANT_ONLY", tenantId }] : [])
      ],
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { location: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } }
        ]
      }),
      ...(location && { location: { contains: location, mode: "insensitive" } }),
      ...(minCapacity && { capacity: { gte: Number(minCapacity) } }),
      ...(maxCapacity && { capacity: { lte: Number(maxCapacity) } }),
      ...(officeType && { officeType }),
      ...(amenities && { amenities: { hasEvery: amenities.split(",") } })
    };

    // Price filtering requires subquery on pricing
    if (pricingType || minPrice || maxPrice) {
      where.pricingOptions = {
        some: {
          isActive: true,
          ...(pricingType && { pricingType }),
          ...(minPrice && { amount: { gte: Number(minPrice) } }),
          ...(maxPrice && { amount: { lte: Number(maxPrice) } })
        }
      };
    }

    const [data, total] = await Promise.all([
      db.officeSpace.findMany({
        where, skip, take, orderBy,
        include: {
          pricingOptions: { where: { isActive: true } },
          tenant: { select: { id: true, organizationName: true, tenantLogo: true } }
        }
      }),
      db.officeSpace.count({ where })
    ]);

    return { data, total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) };
  },

  // ==================== MY OFFICES (Receiver) ====================

  async getMyCurrentOffices({ startupId }) {
    const [allocations, bookings] = await Promise.all([
      db.officeAllocation.findMany({
        where: { startupId, isActive: true },
        include: {
          office: {
            include: {
              pricingOptions: { where: { isActive: true } },
              tenant: { select: { organizationName: true, tenantLogo: true } }
            }
          }
        }
      }),
      db.officeBooking.findMany({
        where: { startupId, status: { in: ["CONFIRMED", "ACTIVE"] } },
        include: {
          office: {
            include: {
              tenant: { select: { organizationName: true, tenantLogo: true } }
            }
          },
          pricing: true
        }
      })
    ]);

    return { allocations, bookings };
  },

  async getMyOfficeHistory({ startupId }) {
    const [allocations, bookings] = await Promise.all([
      db.officeAllocation.findMany({
        where: { startupId },
        include: { office: { select: { id: true, name: true, location: true } } },
        orderBy: { createdAt: "desc" }
      }),
      db.officeBooking.findMany({
        where: { startupId },
        include: { office: { select: { id: true, name: true, location: true } }, payments: true },
        orderBy: { createdAt: "desc" }
      })
    ]);

    return { allocations, bookings };
  }
};

export default OfficeCoreService;
