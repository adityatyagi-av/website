import db from "../../db/db.js";
import { ApiError } from "../../utils/ApiError.js";
import { buildQueryOptions } from "../../utils/queryHelper.js";
import { format, startOfDay } from "date-fns";

function timeToMinutes(t) {
  const [hh, mm] = t.split(":").map(Number);
  return hh * 60 + mm;
}
function normalizeDateOnly(dateStr) {
  const d = new Date(dateStr);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
function intervalsOverlap(a1, a2, b1, b2) {
  return a1 < b2 && b1 < a2;
}
export const StartupFacilityService = {
  getStartupTenants: async ({ startupId }) => {
    const associations = await db.startupTenantAssociation.findMany({
      where: {
        startupId,
        status: "ONBOARDED",
      },
      select: {
        tenant: {
          select: {
            id: true,
            organizationName: true,
            tenantKey: true,
          },
        },
      },
      orderBy: {
        onboardedAt: "desc",
      },
    });
  
    return associations.map((a) => ({
      id: a.tenant.id,
      name: a.tenant.organizationName,
      key: a.tenant.tenantKey
    }));
  },

  getFacilities: async ({
    startupId,
    selectedTenant,
    page = 1,
    limit = 10,
    search = "",
    status,
    sortBy = "createdAt",
    order = "desc",
  }) => {
    const tenantAssociations = await db.startupTenantAssociation.findMany({
      where: {
        startupId,
        status: "ONBOARDED",
      },
      select: {
        tenantId: true,
      },
    });

    const startupTenantIds = tenantAssociations.map(
      (item) => item.tenantId
    );
  
    if (!startupTenantIds.length) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    const {
      skip,
      take,
      where: searchWhere,
      orderBy,
    } = buildQueryOptions({
      page,
      limit,
      search,
      searchFields: ["name", "type", "location"],
      defaultFields: ["name"],
      sortBy,
      order,
    });

    let tenantFilter = {};

    if (selectedTenant !== "all") {
      const isAssociatedTenant =
        startupTenantIds.includes(selectedTenant);
  
      if (!isAssociatedTenant) {
        throw new ApiError(
          403,
          "Startup is not associated with this tenant"
        );
      }
  
      tenantFilter = {
        tenantId: selectedTenant,
      };
    } else {
      tenantFilter = {
        tenantId: {
          in: startupTenantIds,
        },
      };
    }
  

    const where = {
      ...tenantFilter,
      ...(status ? { status } : {}),
      ...searchWhere,
    };
  
    const [data, total] = await Promise.all([
      db.facility.findMany({
        where,
        skip,
        take,
        orderBy,
      }),
      db.facility.count({
        where,
      }),
    ]);

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  },

  getFacilityById: async ({ tenantId, facilityId }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");

    const facility = await db.facility.findUnique({
      where: { id: facilityId },
      include: {
        timeslots: {
          orderBy: [{ dayOfWeek: "asc" }, { startMinutes: "asc" }],
        },
      },
    });

    if (!facility || facility.tenantId !== tenantId)
      throw new ApiError(404, "Facility not found");
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const dayName = today
      .toLocaleDateString("en-US", { weekday: "long" })
      .toUpperCase();
    const todaysSlots = facility.timeslots.filter(
      (slot) => slot.dayOfWeek === dayName
    );
    const todaysBookings = await db.facilityBooking.findMany({
      where: {
        facilityId,
        tenantId,
        date: today,
        status: "APPROVED",
      },
      select: {
        id: true,
        startMinutes: true,
        endMinutes: true,
      },
    });
    const overlap = (a1, a2, b1, b2) => a1 < b2 && b1 < a2;

    const timeSlotsByDay = {
      [dayName]: todaysSlots.map((slot) => ({
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        isBooked: todaysBookings.some((b) =>
          overlap(
            b.startMinutes,
            b.endMinutes,
            slot.startMinutes,
            slot.endMinutes
          )
        ),
      })),
    };

    const { timeslots, ...rest } = facility;

    return {
      ...rest,
      timeSlotsByDay,
    };
  },
  getSlotsForDate: async ({ tenantId, facilityId, date }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!facilityId) throw new ApiError(400, "facilityId required");
    if (!date) throw new ApiError(400, "date (YYYY-MM-DD) is required");
    const dateOnly = new Date(date);
    if (isNaN(dateOnly.getTime())) {
      throw new ApiError(400, `Invalid date format: ${date}`);
    }
    dateOnly.setUTCHours(0, 0, 0, 0);
    const facility = await db.facility.findUnique({
      where: { id: facilityId },
    });

    if (!facility || facility.tenantId !== tenantId)
      throw new ApiError(404, "Facility not found");
    const dayName = dateOnly
      .toLocaleDateString("en-US", { weekday: "long" })
      .toUpperCase();
    const slots = await db.facilityTimeSlot.findMany({
      where: { facilityId, dayOfWeek: dayName },
    });
    const bookings = await db.facilityBooking.findMany({
      where: {
        facilityId,
        tenantId,
        date: dateOnly,
        status: "APPROVED",
      },
      select: {
        id: true,
        startMinutes: true,
        endMinutes: true,
      },
    });
    const overlaps = (a1, a2, b1, b2) => a1 < b2 && b1 < a2;

    const formattedDate = dateOnly.toISOString().slice(0, 10);

    const timeSlotsBasedOnDate = {
      [formattedDate]: slots.map((slot) => {
        const isBooked = bookings.some((b) =>
          overlaps(
            b.startMinutes,
            b.endMinutes,
            slot.startMinutes,
            slot.endMinutes
          )
        );
        return {
          id: slot.id,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isBooked,
        };
      }),
    };
    return { timeSlotsBasedOnDate };
  },

  requestMultipleSlots: async ({
    tenantId,
    facilityId,
    timeslotIds = [],
    date,
    units = 1,
    reason,
    startupId,
    startupUserId,
  }) => {
    if (!tenantId) throw new ApiError(400, "tenantId required");
    if (!facilityId) throw new ApiError(400, "facilityId required");
    if (!Array.isArray(timeslotIds) || timeslotIds.length === 0)
      throw new ApiError(400, "timeslotIds array is required");
    if (!date) throw new ApiError(400, "date is required");

    const facility = await db.facility.findUnique({
      where: { id: facilityId },
    });
    if (!facility || facility.tenantId !== tenantId)
      throw new ApiError(404, "Facility not found");

    const dateOnly = normalizeDateOnly(date);
    const dayName = format(dateOnly, "EEEE").toUpperCase();
    const slots = await db.facilityTimeSlot.findMany({
      where: { id: { in: timeslotIds } },
    });

    if (slots.length !== timeslotIds.length) {
      const foundIds = new Set(slots.map((s) => s.id));
      const missing = timeslotIds.filter((id) => !foundIds.has(id));
      throw new ApiError(404, `Timeslot(s) not found: ${missing.join(",")}`);
    }
    for (const s of slots) {
      if (s.facilityId !== facilityId) {
        throw new ApiError(400, `Timeslot ${s.id} does not belong to facility`);
      }
      if (s.dayOfWeek !== dayName) {
        throw new ApiError(
          400,
          `Timeslot ${s.id} is for ${s.dayOfWeek}, not ${dayName}`
        );
      }
    }
    const created = await db.$transaction(async (tx) => {
      for (const s of slots) {
        const overlapping = await tx.facilityBooking.findMany({
          where: {
            facilityId,
            date: dateOnly,
            status: "APPROVED",
            AND: [
              { startMinutes: { lt: s.endMinutes } },
              { endMinutes: { gt: s.startMinutes } },
            ],
          },
          select: { unitsBooked: true },
        });
        const used = overlapping.reduce(
          (acc, b) => acc + (b.unitsBooked || 1),
          0
        );
        if (used + units > facility.totalUnits) {
          throw new ApiError(
            400,
            `Not enough units available for timeslot ${s.id} (${s.startTime}-${s.endTime})`
          );
        }
      }
      const createdBookings = [];
      for (const s of slots) {
        const b = await tx.facilityBooking.create({
          data: {
            facilityId,
            tenantId,
            startupId: startupId ?? null,
            // requestedById: startupUserId ?? null,
            date: dateOnly,
            startTime: s.startTime,
            endTime: s.endTime,
            startMinutes: s.startMinutes,
            endMinutes: s.endMinutes,
            unitsBooked: units,
            reason: reason ?? null,
            status: "PENDING",
          },
        });
        createdBookings.push(b);
      }
      return createdBookings;
    });

    return created;
  },

  getUpcomingBookings: async ({
    startupId,
    tenantId,
    page = 1,
    limit = 10,
    search = "",
    status,
    sortBy = "date",
    order = "asc",
  }) => {
    if (!startupId) throw new ApiError(401, "startupId required");
    if (!tenantId) throw new ApiError(401, "tenantId required");

    const today = startOfDay(new Date());

    const {
      skip,
      take,
      where: searchWhere,
      orderBy,
    } = buildQueryOptions({
      page,
      limit,
      search,
      searchFields: ["facility.name", "reason"],
      defaultFields: ["reason"],
      sortBy,
      order,
    });

    const where = {
      startupId,
      tenantId,
      date: { gte: today },
      ...(status ? { status } : {}),
      ...searchWhere,
    };

    const [data, total] = await Promise.all([
      db.facilityBooking.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          facility: true,
        },
      }),
      db.facilityBooking.count({ where }),
    ]);

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  },

  getFacilityRequests: async ({
    startupId,
    tenantId,
    page = 1,
    limit = 10,
    search = "",
    status,
    sortBy = "createdAt",
    order = "desc",
  }) => {
    if (!startupId) throw new ApiError(401, "startupId required");
    if (!tenantId) throw new ApiError(401, "tenantId required");

    const {
      skip,
      take,
      where: searchWhere,
      orderBy,
    } = buildQueryOptions({
      page,
      limit,
      search,
      searchFields: ["facility.name", "reason"],
      defaultFields: ["reason"],
      sortBy,
      order,
    });

    const where = {
      startupId,
      tenantId,
      ...(status ? { status } : {}),
      ...searchWhere,
    };

    const [data, total] = await Promise.all([
      db.facilityBooking.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          facility: true,
        },
      }),
      db.facilityBooking.count({ where }),
    ]);

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  },

  getPastBookings: async ({
    startupId,
    tenantId,
    page = 1,
    limit = 10,
    search = "",
    status,
    sortBy = "date",
    order = "desc",
  }) => {
    if (!startupId) throw new ApiError(401, "startupId required");
    if (!tenantId) throw new ApiError(401, "tenantId required");

    const today = startOfDay(new Date());

    const {
      skip,
      take,
      where: searchWhere,
      orderBy,
    } = buildQueryOptions({
      page,
      limit,
      search,
      searchFields: ["facility.name", "reason"],
      defaultFields: ["reason"],
      sortBy,
      order,
    });

    const where = {
      startupId,
      tenantId,
      date: { lt: today },
      ...(status ? { status } : {}),
      ...searchWhere,
    };

    const [data, total] = await Promise.all([
      db.facilityBooking.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          facility: true,
        },
      }),
      db.facilityBooking.count({ where }),
    ]);

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  },
};
