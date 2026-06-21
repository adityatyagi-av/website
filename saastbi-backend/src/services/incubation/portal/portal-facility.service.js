import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { buildQueryOptions } from "../../../utils/queryHelper.js";
import { format } from "date-fns";
import { NotificationService } from "../../common/notification.service.js";
function timeToMinutes(t) {
  if (!t || typeof t !== "string") return null;
  const parts = t.split(":").map((p) => Number(p));
  if (parts.length !== 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) {
    throw new ApiError(400, `Invalid time format: ${t}`);
  }
  const [hh, mm] = parts;
  return hh * 60 + mm;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function normalizeDateOnly(dateStr) {
  const d = typeof dateStr === "string" ? new Date(dateStr) : new Date(dateStr);
  if (Number.isNaN(d.getTime())) {
    throw new ApiError(400, `Invalid date: ${dateStr}`);
  }
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

function intervalsOverlap(a1, a2, b1, b2) {
  return a1 < b2 && b1 < a2;
}

export const facilityService = {
  createFacility: async ({ tenantId, data }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!data?.name) throw new ApiError(400, "Facility name is required");

    const {
      name,
      type,
      category,
      description,
      location,
      status = "ACTIVE",
      imageUrl,
      amenities = [],
      availableDays = [],
      timeSlotsByDay = {},
    } = data;

    return await db.$transaction(async (tx) => {
      const facility = await tx.facility.create({
        data: {
          tenantId,
          name,
          type,
          category,
          description,
          location,
          status,
          imageUrl,
          amenities,
          availableDays,
        },
      });
      for (const day in timeSlotsByDay) {
        const slots = timeSlotsByDay[day];

        for (const slot of slots) {
          const startMinutes = timeToMinutes(slot.startTime);
          const endMinutes = timeToMinutes(slot.endTime);

          if (startMinutes >= endMinutes) {
            throw new ApiError(400, `Invalid time range for ${day}`);
          }
          const conflict = await tx.facilityTimeSlot.findFirst({
            where: {
              facilityId: facility.id,
              dayOfWeek: day,
              AND: [
                { startMinutes: { lt: endMinutes } },
                { endMinutes: { gt: startMinutes } },
              ],
            },
          });

          if (conflict) {
            throw new ApiError(
              400,
              `Conflicting timeslot exists for ${day}: ${slot.startTime}-${slot.endTime}`
            );
          }

          await tx.facilityTimeSlot.create({
            data: {
              facilityId: facility.id,
              dayOfWeek: day,
              startTime: slot.startTime,
              endTime: slot.endTime,
              startMinutes,
              endMinutes,
            },
          });
        }
      }
      return facility;
    });
  },

  getFacilities: async ({
    tenantId,
    page = 1,
    limit = 10,
    search = "",
    status,
    sortBy = "createdAt",
    order = "desc",
  }) => {
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
      searchFields: ["name", "type", "location"],
      defaultFields: ["name"],
      sortBy,
      order,
    });

    const where = {
      tenantId,
      ...(status ? { status } : {}),
      ...searchWhere,
    };

    const [data, total] = await Promise.all([
      db.facility.findMany({ where, skip, take, orderBy }),
      db.facility.count({ where }),
    ]);

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  },

  getFacilityById: async ({ tenantId, facilityId, lastBookings = 5 }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");

    const facility = await db.facility.findUnique({
      where: { id: facilityId },
      include: {
        timeslots: {
          orderBy: [{ dayOfWeek: "asc" }, { startMinutes: "asc" }],
        },
        bookings: {
          where: { status: "APPROVED" },
          orderBy: [{ date: "desc" }, { startMinutes: "desc" }],
          take: lastBookings,
          include: { startup: true,  incubationUser: true },
        },
      },
    });

    if (!facility || facility.tenantId !== tenantId)
      throw new ApiError(404, "Facility not found");
    const timeSlotsByDay = {};
    for (const slot of facility.timeslots) {
      if (!timeSlotsByDay[slot.dayOfWeek]) {
        timeSlotsByDay[slot.dayOfWeek] = [];
      }
      timeSlotsByDay[slot.dayOfWeek].push({
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
    }
    const { timeslots, ...rest } = facility;
    return {
      ...rest,
      timeSlotsByDay,
    };
  },

  updateFacility: async ({ tenantId, facilityId, data }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");

    const facility = await db.facility.findUnique({
      where: { id: facilityId },
    });

    if (!facility || facility.tenantId !== tenantId)
      throw new ApiError(404, "Facility not found");

    const {
      name,
      type,
      category,
      description,
      location,
      status,
      imageUrl,
      amenities,
      availableDays,

      newTimeSlots = [],
      updatedTimeSlots = [],
      deletedTimeSlotIds = [],
    } = data;
    console.log(data);
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    if (location !== undefined) updateData.location = location;
    if (status !== undefined) updateData.status = status;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (amenities !== undefined) updateData.amenities = amenities;
    if (availableDays !== undefined) updateData.availableDays = availableDays;
    const validateTimeRange = (start, end) => {
      const s = timeToMinutes(start);
      const e = timeToMinutes(end);
      if (s >= e) throw new ApiError(400, "startTime must be before endTime");
      return { startMinutes: s, endMinutes: e };
    };
    const validateDay = (day) => {
      const allowed = [
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
        "SUNDAY",
      ];
      if (!allowed.includes(day))
        throw new ApiError(400, `Invalid dayOfWeek: ${day}`);
    };

    return await db.$transaction(async (tx) => {
      if (deletedTimeSlotIds.length) {
        const slots = await tx.facilityTimeSlot.findMany({
          where: {
            id: { in: deletedTimeSlotIds },
            facilityId,
          },
        });
        if (slots.length !== deletedTimeSlotIds.length)
          throw new ApiError(
            400,
            "Some timeSlots do not belong to this facility"
          );

        await tx.facilityTimeSlot.deleteMany({
          where: { id: { in: deletedTimeSlotIds } },
        });
      }
      for (const slot of updatedTimeSlots) {
        const { id, dayOfWeek, startTime, endTime } = slot;
        if (!id) throw new ApiError(400, "Slot id is required for update");

        const existing = await tx.facilityTimeSlot.findUnique({
          where: { id },
        });

        if (!existing || existing.facilityId !== facilityId)
          throw new ApiError(404, `Timeslot ${id} not found`);

        let newDay = dayOfWeek ?? existing.dayOfWeek;
        let newStart = startTime ?? existing.startTime;
        let newEnd = endTime ?? existing.endTime;

        validateDay(newDay);
        const { startMinutes, endMinutes } = validateTimeRange(
          newStart,
          newEnd
        );
        const conflict = await tx.facilityTimeSlot.findFirst({
          where: {
            facilityId,
            dayOfWeek: newDay,
            id: { not: id },
            AND: [
              { startMinutes: { lt: endMinutes } },
              { endMinutes: { gt: startMinutes } },
            ],
          },
        });

        if (conflict)
          throw new ApiError(400, "Conflicting timeslot exists during update");

        await tx.facilityTimeSlot.update({
          where: { id },
          data: {
            dayOfWeek: newDay,
            startTime: newStart,
            endTime: newEnd,
            startMinutes,
            endMinutes,
          },
        });
      }
      for (const slot of newTimeSlots) {
        const { dayOfWeek, startTime, endTime } = slot;

        if (!dayOfWeek || !startTime || !endTime)
          throw new ApiError(400, "dayOfWeek, startTime, endTime required");

        validateDay(dayOfWeek);
        const { startMinutes, endMinutes } = validateTimeRange(
          startTime,
          endTime
        );
        const conflict = await tx.facilityTimeSlot.findFirst({
          where: {
            facilityId,
            dayOfWeek,
            AND: [
              { startMinutes: { lt: endMinutes } },
              { endMinutes: { gt: startMinutes } },
            ],
          },
        });

        if (conflict)
          throw new ApiError(400, "Conflicting timeslot exists for new slot");

        await tx.facilityTimeSlot.create({
          data: {
            facilityId,
            dayOfWeek,
            startTime,
            endTime,
            startMinutes,
            endMinutes,
          },
        });
      }
      await tx.facility.update({
        where: { id: facilityId },
        data: updateData,
      });
      const updatedFacility = await tx.facility.findUnique({
        where: { id: facilityId },
        include: {
          timeslots: {
            orderBy: [{ dayOfWeek: "asc" }, { startMinutes: "asc" }],
          },
        },
      });
      const timeSlotsByDay = {};
      for (const slot of updatedFacility.timeslots) {
        if (!timeSlotsByDay[slot.dayOfWeek])
          timeSlotsByDay[slot.dayOfWeek] = [];
        timeSlotsByDay[slot.dayOfWeek].push({
          id: slot.id,
          startTime: slot.startTime,
          endTime: slot.endTime,
        });
      }

      const { timeslots, ...rest } = updatedFacility;

      return { ...rest, timeSlotsByDay };
    });
  },

  deleteFacility: async ({ tenantId, facilityId }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");

    return db.$transaction(async (tx) => {
      const facility = await tx.facility.findUnique({
        where: { id: facilityId },
      });

      if (!facility || facility.tenantId !== tenantId) {
        throw new ApiError(404, "Facility not found");
      }
      const activeBookings = await tx.facilityBooking.count({
        where: {
          facilityId,
          status: "APPROVED",
          date: { gte: new Date() },
        },
      });

      if (activeBookings > 0) {
        throw new ApiError(
          400,
          "Cannot archive facility with active/future approved bookings"
        );
      }
      await tx.facilityBooking.updateMany({
        where: {
          facilityId,
          status: "PENDING",
          date: { gte: new Date() },
        },
        data: { status: "CANCELED" },
      });
      await tx.facilityTimeSlot.deleteMany({
        where: { facilityId },
      });
      const updated = await tx.facility.update({
        where: { id: facilityId },
        data: {
          status: "ARCHIVED",
          availableDays: [],
        },
      });

      return {
        message: "Facility archived successfully",
        facility: updated,
      };
    });
  },

  // Booking API's
  listBookings: async ({
    tenantId,
    page = 1,
    limit = 20,
    status,
    date,
    facilityId,
    startupId,
    search,
    sortBy = "date",
    order = "desc",
  }) => {
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

    const where = { tenantId, ...(status ? { status } : {}) };
    if (facilityId) where.facilityId = facilityId;
    if (startupId) where.startupId = startupId;
    if (date) where.date = normalizeDateOnly(date);
    Object.assign(where, searchWhere);

    const [data, total] = await Promise.all([
      db.facilityBooking.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          facility: true,
          startup: true,
          // requestedBy: true,
          incubationUser: true,
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

  getBooking: async ({ tenantId, bookingId }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!bookingId) throw new ApiError(400, "bookingId required");

    const booking = await db.facilityBooking.findUnique({
      where: { id: bookingId },
      include: {
        facility: true,
        startup: true,
        // requestedBy: true,
        incubationUser: true,
      },
    });

    if (!booking || booking.tenantId !== tenantId)
      throw new ApiError(404, "Booking not found");

    return booking;
  },

  approveBooking: async ({
    tenantId,
    bookingId,
    incubationUserId,
    comment,
  }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!bookingId) throw new ApiError(400, "bookingId required");
    if (!incubationUserId) throw new ApiError(401, "incubationUserId required");

    const updated = await db.$transaction(async (tx) => {
      const booking = await tx.facilityBooking.findUnique({
        where: { id: bookingId },
      });
      if (!booking || booking.tenantId !== tenantId)
        throw new ApiError(404, "Booking not found");
      if (booking.status !== "PENDING")
        throw new ApiError(400, "Only PENDING bookings can be approved");

      const dayName = format(new Date(booking.date), "EEEE").toUpperCase();
      const slots = await tx.facilityTimeSlot.findMany({
        where: { facilityId: booking.facilityId, dayOfWeek: dayName },
      });
      const suitable = slots.some(
        (s) =>
          s.startMinutes <= booking.startMinutes &&
          s.endMinutes >= booking.endMinutes
      );
      if (!suitable)
        throw new ApiError(
          400,
          "Booking no longer fits available slots for that day"
        );

      const facility = await tx.facility.findUnique({
        where: { id: booking.facilityId },
      });
      if (!facility) throw new ApiError(404, "Facility not found");

      const overlapping = await tx.facilityBooking.findMany({
        where: {
          facilityId: booking.facilityId,
          date: booking.date,
          status: "APPROVED",
          AND: [
            { startMinutes: { lt: booking.endMinutes } },
            { endMinutes: { gt: booking.startMinutes } },
          ],
        },
        select: { unitsBooked: true },
      });

      const usedUnits = overlapping.reduce(
        (acc, b) => acc + (b.unitsBooked || 1),
        0
      );
      if (usedUnits + (booking.unitsBooked || 1) > facility.totalUnits)
        throw new ApiError(
          400,
          "Not enough units available to approve booking"
        );

      const updatedBooking = await tx.facilityBooking.update({
        where: { id: bookingId },
        data: {
          status: "APPROVED",
          incubationUserId,
          comment: comment ?? null,
        },
      });

      return updatedBooking;
    });

    const startupMembers =
    await db.startupMember.findMany({
      where: {
        startupId: updated.startupId,
        isActive: true,
      },
      select: {
        userId: true,
      },
    });

 
  const facility = await db.facility.findUnique({
    where: {
      id: updated.facilityId,
    },
    select: {
      name: true,
    },
  });


  const actor =
    await db.incubationUser.findUnique({
      where: {
        id: incubationUserId,
      },
      select: {
        name: true,
        imageUrl: true,
      },
    });

  if (startupMembers.length > 0) {

    await NotificationService.sendBulk({
      recipientIds: [
        ...new Set(
          startupMembers.map((m) => m.userId)
        ),
      ],
      type: "FACILITY_BOOKING_STATUS",
      category: "INCUBATION",
      priority: "HIGH",
      title: "Facility Booking Approved",
      message:
        `Your booking for ${facility?.name || "the facility"} has been approved.`,
      actorId: incubationUserId,
      actorName: actor?.name || null,
      actorAvatar: actor?.imageUrl || null,
      entityType: "FACILITY_BOOKING",
      entityId: updated.id,
      actionUrl:
        `/facility-management?tab=Requests`,
      data: {
        bookingId: updated.id,
        facilityId: updated.facilityId,
        facilityName: facility?.name || null,
        status: updated.status,
        bookingDate: updated.date,
        startTime: updated.startMinutes,
        endTime: updated.endMinutes,
        comment: updated.comment || null,
      },
    }).catch(() => {});
  }
  return updated;
  },

  rejectBooking: async ({ tenantId, bookingId, incubationUserId,reason }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!bookingId) throw new ApiError(400, "bookingId required");
    if (!incubationUserId)
      throw new ApiError(401, "incubationUserId required");

    const booking = await db.facilityBooking.findUnique({
      where: { id: bookingId },
    });
    if (!booking || booking.tenantId !== tenantId)
      throw new ApiError(404, "Booking not found");
    if (booking.status !== "PENDING")
      throw new ApiError(400, "Only PENDING bookings can be rejected");

    const updated=await db.facilityBooking.update({
      where: { id: bookingId },
      data: { status: "REJECTED", comment: reason ?? null },
    });



  if (
    !updated ||
    updated.tenantId !== tenantId
  ) {
    throw new ApiError(404, "Booking not found");
  }

  if (updated.status !== "REJECTED") {
    throw new ApiError(
      400,
      "Booking rejection failed"
    );
  }


    const startupMembers =
    await db.startupMember.findMany({
      where: {
        startupId: updated.startupId,
        isActive: true,
      },
      select: {
        userId: true,
      },
    });

  const facility =
    await db.facility.findUnique({
      where: {
        id: updated.facilityId,
      },
      select: {
        name: true,
      },
    });


  const actor =
    await db.incubationUser.findUnique({
      where: {
        id: incubationUserId,
      },
      select: {
        name: true,
        imageUrl: true,
      },
    });


  if (startupMembers.length > 0) {

    await NotificationService.sendBulk({
      recipientIds: [
        ...new Set(
          startupMembers.map((m) => m.userId)
        ),
      ],
      type: "FACILITY_BOOKING_STATUS",
      category: "INCUBATION",
      priority: "HIGH",
      title: "Facility Booking Rejected",
      message: reason
        ? `Your booking for ${facility?.name || "the facility"} was rejected: ${reason}`
        : `Your booking for ${facility?.name || "the facility"} was rejected.`,
      actorId: incubationUserId,
      actorName: actor?.name || null,
      actorAvatar: actor?.imageUrl || null,
      entityType: "FACILITY_BOOKING",
      entityId: updated.id,
      actionUrl:
        `/facilities?tab=upcoming-facilities`,
      data: {
        bookingId: updated.id,
        facilityId: updated.facilityId,
        facilityName: facility?.name || null,
        status: updated.status,
        bookingDate: updated.date,
        startTime: updated.startTime,
        endTime: updated.endTime,
        rejectionReason: reason || null,
      },
    }).catch(() => {});
  }
  return updated
  },

  cancelBooking: async ({ tenantId, bookingId,incubationUserId }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!bookingId) throw new ApiError(400, "bookingId required");

    const booking = await db.facilityBooking.findUnique({
      where: { id: bookingId },
    });
    if (!booking || booking.tenantId !== tenantId)
      throw new ApiError(404, "Booking not found");
    if (["CANCELLED", "REJECTED"].includes(booking.status))
      throw new ApiError(400, "Booking already canceled/rejected");

    const updated =
    await db.facilityBooking.update({
      where: {
        id: bookingId,
      },
      data: {
        status: "CANCELLED",
        incubationUserId,
      },
    });

  const startupMembers =
    await db.startupMember.findMany({
      where: {
        startupId: updated.startupId,
        isActive: true,
      },
      select: {
        userId: true,
      },
    });


  const facility =
    await db.facility.findUnique({
      where: {
        id: updated.facilityId,
      },
      select: {
        name: true,
      },
    });

  const actor =
    await db.incubationUser.findUnique({
      where: {
        id: incubationUserId,
      },
      select: {
        name: true,
        imageUrl: true,
      },
    });

  if (startupMembers.length > 0) {
    await NotificationService.sendBulk({
      recipientIds: [
        ...new Set(
          startupMembers.map((m) => m.userId)
        ),
      ],
      type: "FACILITY_BOOKING_STATUS",
      category: "FACILITY",
      priority: "HIGH",
      title: "Facility Booking Cancelled",
      message:
        `Your booking for ${facility?.name || "the facility"} has been cancelled.`,
      actorId: incubationUserId,
      actorName: actor?.name || null,
      actorAvatar: actor?.imageUrl || null,
      entityType: "FACILITY_BOOKING",
      entityId: updated.id,
      actionUrl:
        `/startup/facility/requested-facilities/${tenantId}`,
      data: {
        bookingId: updated.id,
        facilityId: updated.facilityId,
        facilityName: facility?.name || null,
        status: updated.status,
        bookingDate: updated.date,
        startTime: updated.startTime,
        endTime: updated.endTime,
      },
    }).catch(() => {});
  }
  return updated;
  },

  rescheduleBooking: async ({ tenantId, bookingId, incubationUserId,date, timeslotId }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!bookingId) throw new ApiError(400, "bookingId required");
    if (!incubationUserId) {
      throw new ApiError(
        401,
        "incubationUserId required"
      );
    }
    if (!date) throw new ApiError(400, "date required");
    if (!timeslotId) throw new ApiError(400, "timeslotId is required");

    const result= db.$transaction(async (tx) => {
      const booking = await tx.facilityBooking.findUnique({
        where: { id: bookingId },
      });

      if (!booking || booking.tenantId !== tenantId)
        throw new ApiError(404, "Booking not found");

      const oldBookingData = {
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
      };

      const dateOnly = normalizeDateOnly(date);

      const slot = await tx.facilityTimeSlot.findUnique({
        where: { id: timeslotId },
      });

      if (!slot) throw new ApiError(404, "Timeslot not found");

      if (slot.facilityId !== booking.facilityId)
        throw new ApiError(400, "Timeslot does not belong to this facility");

      const dayName = format(dateOnly, "EEEE").toUpperCase();
      if (slot.dayOfWeek !== dayName)
        throw new ApiError(
          400,
          `Timeslot is for ${slot.dayOfWeek}, but date is ${dayName}`
        );

      const requestedStart = slot.startMinutes;
      const requestedEnd = slot.endMinutes;
      const overlapping = await tx.facilityBooking.findMany({
        where: {
          facilityId: booking.facilityId,
          date: dateOnly,
          status: "APPROVED",
          NOT: { id: bookingId },
          AND: [
            { startMinutes: { lt: requestedEnd } },
            { endMinutes: { gt: requestedStart } },
          ],
        },
        select: { unitsBooked: true },
      });

      const facility = await tx.facility.findUnique({
        where: { id: booking.facilityId },
      });

      if (!facility) {
        throw new ApiError(
          404,
          "Facility not found"
        );
      }

      const usedUnits = overlapping.reduce(
        (acc, b) => acc + (b.unitsBooked || 1),
        0
      );

      if (usedUnits + (booking.unitsBooked || 1) > facility.totalUnits)
        throw new ApiError(400, "Not enough units available to reschedule");
      const updatedBooking= tx.facilityBooking.update({
        where: { id: bookingId },
        data: {
          date: dateOnly,
          startTime: slot.startTime,
          endTime: slot.endTime,
          startMinutes: requestedStart,
          endMinutes: requestedEnd,
          status: "RESCHEDULED",
          updatedAt: new Date(),
        },
      });
      return {
        updatedBooking,
        oldBookingData,
      };
    });
    const updated =
    result.updatedBooking;

  const oldBookingData =
    result.oldBookingData;

  const startupMembers =
    await db.startupMember.findMany({
      where: {
        startupId: updated.startupId,
        isActive: true,
      },
      select: {
        userId: true,
      },
    });

  const facility =
    await db.facility.findUnique({
      where: {
        id: updated.facilityId,
      },
      select: {
        name: true,
      },
    });

  const actor =
    await db.incubationUser.findUnique({
      where: {
        id: incubationUserId,
      },
      select: {
        name: true,
        imageUrl: true,
      },
    });

  if (startupMembers.length > 0) {

    await NotificationService.sendBulk({
      recipientIds: [
        ...new Set(
          startupMembers.map(
            (m) => m.userId
          )
        ),
      ],
      type: "FACILITY_BOOKING_STATUS",
      category: "FACILITY",
      priority: "HIGH",
      title: "Facility Booking Rescheduled",
      message:
        `Your booking for ${
          facility?.name ||
          "the facility"
        } has been rescheduled.`,
      actorId: incubationUserId,
      actorName:
        actor?.name || null,
      actorAvatar:
        actor?.imageUrl || null,
      entityType:
        "FACILITY_BOOKING",
      entityId: updated.id,
      actionUrl:
        `/startup/facility/requested-facilities/${tenantId}`,
      data: {
        bookingId: updated.id,
        facilityId:
          updated.facilityId,
        facilityName:
          facility?.name || null,
        status: updated.status,
        oldDate:
          oldBookingData.date,
        oldStartTime:
          oldBookingData.startTime,
        oldEndTime:
          oldBookingData.endTime,
        newDate: updated.date,
        newStartTime:
          updated.startTime,
        newEndTime:
          updated.endTime,
      },
    }).catch(() => {});
  }
  return updated;
  },

  listBookingsForStartup: async ({
    tenantId,
    startupId,
    page = 1,
    limit = 20,
    search,
    status,
    sortBy = "date",
    order = "desc",
  }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!startupId) throw new ApiError(400, "startupId required");

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
      tenantId,
      startupId,
      ...(status ? { status } : {}),
      ...searchWhere,
    };

    const [data, total] = await Promise.all([
      db.facilityBooking.findMany({
        where,
        skip,
        take,
        orderBy,
        include: { facility: true },
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

  // -----------------
  // Calendar and Stats
  // -----------------
  getFacilityCalendar: async ({
    tenantId,
    facilityId,
    month,
    unitIndex = null,
    showUnits = false,
  }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!month) throw new ApiError(400, "month is required in YYYY-MM format");

    const facility = await db.facility.findUnique({
      where: { id: facilityId },
    });
    if (!facility || facility.tenantId !== tenantId)
      throw new ApiError(404, "Facility not found");

    const [yearStr, monthStr] = month.split("-");
    const year = Number(yearStr);
    const mon = Number(monthStr);
    if (!year || !mon || mon < 1 || mon > 12)
      throw new ApiError(400, "Invalid month format");

    const from = new Date(Date.UTC(year, mon - 1, 1));
    const to = new Date(Date.UTC(year, mon, 0)); // last day of month

    // fetch slots once
    const slots = await db.facilityTimeSlot.findMany({ where: { facilityId } });

    // fetch bookings for the range (only APPROVED)
    const bookings = await db.facilityBooking.findMany({
      where: { facilityId, status: "APPROVED", date: { gte: from, lte: to } },
      select: {
        id: true,
        date: true,
        startMinutes: true,
        endMinutes: true,
        unitsBooked: true,
        startupId: true,
      },
      orderBy: [{ date: "asc" }],
    });

    // group bookings by date for quick lookup
    const bookingsByDate = {};
    for (const b of bookings) {
      const key = b.date.toISOString().slice(0, 10);
      bookingsByDate[key] = bookingsByDate[key] || [];
      bookingsByDate[key].push(b);
    }

    const days = [];
    for (let d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
      const dateOnly = new Date(d);
      dateOnly.setUTCHours(0, 0, 0, 0);
      const dayName = format(dateOnly, "EEEE").toUpperCase();
      const daySlots = slots.filter((s) => s.dayOfWeek === dayName);
      const key = dateOnly.toISOString().slice(0, 10);
      const dayBookings = bookingsByDate[key] || [];

      const slotDetails = [];
      for (const s of daySlots) {
        // find bookings overlapping this timeslot
        const overlapping = dayBookings.filter((b) =>
          intervalsOverlap(
            b.startMinutes,
            b.endMinutes,
            s.startMinutes,
            s.endMinutes
          )
        );
        const bookedUnits = overlapping.reduce(
          (acc, b) => acc + (b.unitsBooked || 1),
          0
        );

        slotDetails.push({
          slotId: s.id,
          startTime: s.startTime,
          endTime: s.endTime,
          bookedUnits,
          freeUnits: Math.max(0, facility.totalUnits - bookedUnits),
          bookings: overlapping, // contains minimal fields
        });
      }

      days.push({
        date: dateOnly.toISOString().slice(0, 10),
        dayName,
        slots: slotDetails,
      });
    }

    return { facilityId, month, days };
  },

  getTenantCalendar: async ({ tenantId, from, to }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!from || !to)
      throw new ApiError(400, "from and to required (YYYY-MM-DD)");

    const fromD = normalizeDateOnly(from);
    const toD = normalizeDateOnly(to);

    const bookings = await db.facilityBooking.findMany({
      where: { tenantId, date: { gte: fromD, lte: toD }, status: "APPROVED" },
      include: { facility: true, startup: true },
      orderBy: [{ date: "asc" }, { startMinutes: "asc" }],
    });

    const map = {};
    for (const b of bookings) {
      const key = b.date.toISOString().slice(0, 10);
      map[key] = map[key] || [];
      map[key].push(b);
    }

    return {
      from: fromD.toISOString().slice(0, 10),
      to: toD.toISOString().slice(0, 10),
      bookingsByDate: map,
    };
  },

  getFacilityUsage: async ({ tenantId, facilityId, from, to }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    const fromD = from ? normalizeDateOnly(from) : new Date(0);
    const toD = to ? normalizeDateOnly(to) : new Date();

    const facility = await db.facility.findUnique({
      where: { id: facilityId },
    });
    if (!facility || facility.tenantId !== tenantId)
      throw new ApiError(404, "Facility not found");

    const bookings = await db.facilityBooking.findMany({
      where: {
        facilityId,
        tenantId,
        date: { gte: fromD, lte: toD },
        status: "APPROVED",
      },
      include: { startup: true },
    });

    const totalSlots = bookings.length;
    const totalBookedUnits = bookings.reduce(
      (acc, b) => acc + (b.unitsBooked || 1),
      0
    );

    const perStartup = {};
    for (const b of bookings) {
      const sid = b.startupId || "unknown";
      perStartup[sid] = perStartup[sid] ?? {
        startupId: sid,
        count: 0,
        units: 0,
      };
      perStartup[sid].count += 1;
      perStartup[sid].units += b.unitsBooked || 1;
    }

    const topStartups = Object.values(perStartup)
      .sort((a, b) => b.units - a.units)
      .slice(0, 10);

    return {
      facilityId,
      range: {
        from: fromD.toISOString().slice(0, 10),
        to: toD.toISOString().slice(0, 10),
      },
      totalSlots,
      totalBookedUnits,
      topStartups,
    };
  },
  getOverviewReport: async ({ tenantId }) => {

    if (!tenantId) {
      throw new ApiError(401, "tenantId is required");
    }
  
    const now = new Date();
  
    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );
  
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59
    );
  
    const [
      monthlyBookings,
      facilities
    ] = await Promise.all([
      db.facilityBooking.findMany({
        where: {
          tenantId,
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        select: {
          id: true,
          startupId: true,
          status: true,
          startMinutes: true,
          endMinutes: true,
        },
      }),
  
      db.facility.findMany({
        where: {
          tenantId,
        },
  
        include: {
          bookings: {
            where: {
              status: {
                in: [
                  "APPROVED",
                  "COMPLETED",
                ],
              },
            },
  
            select: {
              id: true,
              unitsBooked: true,
              startMinutes: true,
              endMinutes: true,
            },
          },
        },
      }),
    ]);

  
    const totalBookings = monthlyBookings.length;
  
    const approvedBookings =
      monthlyBookings.filter(
        (b) =>
          b.status === "APPROVED" ||
          b.status === "COMPLETED"
      ).length;
  
    const uniqueStartups =
      new Set(
        monthlyBookings
          .filter((b) => b.startupId)
          .map((b) => b.startupId)
      ).size;
  
    const totalMinutesBooked =
      monthlyBookings
        .filter(
          (b) =>
            b.status === "APPROVED" ||
            b.status === "COMPLETED"
        )
        .reduce(
          (sum, booking) =>
            sum +
            (
              booking.endMinutes -
              booking.startMinutes
            ),
          0
        );
  
    const hoursBooked =
      Number(
        (
          totalMinutesBooked / 60
        ).toFixed(1)
      );
  
    const confirmationRate =
      totalBookings === 0
        ? 0
        : Math.round(
            (
              approvedBookings /
              totalBookings
            ) * 100
          );

  
    const facilityUtilization =
      facilities.map((facility) => {
        const bookedUnits =
          facility.bookings.reduce(
            (sum, booking) =>
              sum + booking.unitsBooked,
            0
          );
  
        const utilizationPercentage =
          facility.totalUnits > 0
            ? Math.min(
                100,
                Math.round(
                  (
                    bookedUnits /
                    facility.totalUnits
                  ) * 100
                )
              )
            : 0;
  
        return {
          facilityId: facility.id,
          facilityName: facility.name,
          facilityType: facility.type,
          utilizationPercentage,
        };
      });

  
    const mostRequestedFacilities =
      facilities
        .map((facility) => ({
          facilityId:
            facility.id,
  
          facilityName:
            facility.name,
  
          facilityType:
            facility.type,
  
          totalRequests:
            facility.bookings.length,
  
          totalUnitsBooked:
            facility.bookings.reduce(
              (sum, booking) =>
                sum + booking.unitsBooked,
              0
            ),
        }))
        .sort((a, b) => {
          if (
            b.totalRequests !==
            a.totalRequests
          ) {
            return (
              b.totalRequests -
              a.totalRequests
            );
          }
  
          return (
            b.totalUnitsBooked -
            a.totalUnitsBooked
          );
        })
        .slice(0, 5);
  
    return {
      monthlyStatistics: {
        totalBookings,
        hoursBooked,
        uniqueStartups,
        confirmationRate,
      },
  
      facilityUtilization,
  
      mostRequestedFacilities,
    };
  },
};
