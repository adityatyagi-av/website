import db from "../../db/db.js";
import { ApiError } from "../../utils/ApiError.js";
import { generateAvailableSlots } from "../../utils/mentor/availability.js";
import { addDays, eachDayOfInterval, format } from "date-fns";

export const AvailabilityService = {
  getOwn: async (userId) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        minBookingNotice: true,
        maxBookingsPerDay: true,
        bufferBetweenSessions: true,
        autoConfirm: true,
      },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const availability = await db.mentorAvailability.findMany({
      where: { mentorId: profile.id },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    return {
      settings: {
        minBookingNotice: profile.minBookingNotice,
        maxBookingsPerDay: profile.maxBookingsPerDay,
        bufferBetweenSessions: profile.bufferBetweenSessions,
        autoConfirm: profile.autoConfirm,
      },
      slots: availability,
    };
  },

  setAvailability: async (userId, slots) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    for (const slot of slots) {
      const [startHour, startMin] = slot.startTime.split(":").map(Number);
      const [endHour, endMin] = slot.endTime.split(":").map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (endMinutes <= startMinutes) {
        throw new ApiError(400, `End time must be after start time for ${slot.dayOfWeek}`);
      }

      if (endMinutes - startMinutes < 30) {
        throw new ApiError(400, `Minimum 30 minute availability required for ${slot.dayOfWeek}`);
      }
    }

    await db.$transaction(async (tx) => {
      await tx.mentorAvailability.deleteMany({
        where: { mentorId: profile.id },
      });

      await tx.mentorAvailability.createMany({
        data: slots.map((slot) => ({
          mentorId: profile.id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isActive: slot.isActive ?? true,
        })),
      });
    });

    const newAvailability = await db.mentorAvailability.findMany({
      where: { mentorId: profile.id },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    return newAvailability;
  },

  getAvailableSlots: async (mentorId, query) => {
    const profile = await db.mentorProfile.findUnique({
      where: { id: mentorId },
      select: {
        id: true,
        isAccepting: true,
        minBookingNotice: true,
        bufferBetweenSessions: true,
        maxBookingsPerDay: true,
      },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor not found");
    }

    if (!profile.isAccepting) {
      return { slots: [], message: "Mentor is not accepting bookings" };
    }

    let sessionDuration = query.duration || 60;

    if (query.sessionTypeId) {
      const sessionType = await db.sessionType.findUnique({
        where: { id: query.sessionTypeId },
        select: { duration: true, isActive: true },
      });

      if (!sessionType || !sessionType.isActive) {
        throw new ApiError(404, "Session type not found or inactive");
      }

      sessionDuration = sessionType.duration;
    }

    const availability = await db.mentorAvailability.findMany({
      where: { mentorId, isActive: true },
    });

    if (availability.length === 0) {
      return { slots: [], message: "Mentor has no availability set" };
    }

    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    const maxRange = 30;
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (daysDiff > maxRange) {
      throw new ApiError(400, `Date range cannot exceed ${maxRange} days`);
    }

    const existingSessions = await db.mentorSession.findMany({
      where: {
        mentorId,
        status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
        startTime: { gte: startDate, lte: endDate },
      },
      select: { startTime: true, endTime: true },
    });

    const slots = generateAvailableSlots({
      availabilitySlots: availability,
      existingSessions,
      blockedSlots: [],
      externalEvents: [],
      startDate,
      endDate,
      sessionDuration,
      bufferMinutes: profile.bufferBetweenSessions,
      minBookingNoticeHours: profile.minBookingNotice,
    });

    const groupedSlots = slots.reduce((acc, slot) => {
      if (!acc[slot.date]) {
        acc[slot.date] = [];
      }
      acc[slot.date].push({
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
      return acc;
    }, {});

    return {
      slots: groupedSlots,
      sessionDuration,
      timezone: "Asia/Kolkata",
    };
  },

  getQuickAvailability: async (mentorId, days = 7) => {
    const profile = await db.mentorProfile.findUnique({
      where: { id: mentorId },
      select: { id: true, isAccepting: true },
    });

    if (!profile || !profile.isAccepting) {
      return { available: false, nextAvailableSlot: null };
    }

    const availability = await db.mentorAvailability.findMany({
      where: { mentorId, isActive: true },
    });

    if (availability.length === 0) {
      return { available: false, nextAvailableSlot: null };
    }

    const startDate = new Date();
    const endDate = addDays(startDate, days);

    const existingSessions = await db.mentorSession.findMany({
      where: {
        mentorId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startTime: { gte: startDate, lte: endDate },
      },
      select: { startTime: true, endTime: true },
    });

    const slots = generateAvailableSlots({
      availabilitySlots: availability,
      existingSessions,
      blockedSlots: [],
      externalEvents: [],
      startDate,
      endDate,
      sessionDuration: 60,
      bufferMinutes: 15,
      minBookingNoticeHours: 24,
    });

    return {
      available: slots.length > 0,
      nextAvailableSlot: slots[0] || null,
      totalSlotsNext7Days: slots.length,
    };
  },

  getOwnQuickAvailability: async (userId, days = 7) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    return AvailabilityService.getQuickAvailability(profile.id, days);
  },

  getCalendarAvailability: async (mentorId, month, year) => {
    const profile = await db.mentorProfile.findUnique({
      where: { id: mentorId },
      select: {
        id: true,
        isAccepting: true,
        minBookingNotice: true,
        bufferBetweenSessions: true,
      },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor not found");
    }
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const availability = await db.mentorAvailability.findMany({
      where: { mentorId, isActive: true },
    });
    const dayNames = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    if (availability.length === 0 || !profile.isAccepting) {
      return {
        month,
        year,
        days: allDays.map((date) => ({
          date: format(date, "yyyy-MM-dd"),
          dayOfWeek: dayNames[date.getDay()],
          status: "UNAVAILABLE",
          availableSlots: 0,
        })),
      };
    }

    const existingSessions = await db.mentorSession.findMany({
      where: {
        mentorId,
        status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
        startTime: { gte: startDate, lte: endDate },
      },
      select: { startTime: true, endTime: true },
    });
    const slots = generateAvailableSlots({
      availabilitySlots: availability,
      existingSessions,
      blockedSlots: [],
      externalEvents: [],
      startDate,
      endDate,
      sessionDuration: 60, // Default to 60 min for general availability
      bufferMinutes: profile.bufferBetweenSessions,
      minBookingNoticeHours: profile.minBookingNotice,
    });

    const slotsByDate = slots.reduce((acc, slot) => {
      if (!acc[slot.date]) acc[slot.date] = 0;
      acc[slot.date]++;
      return acc;
    }, {});

    const workingDays = new Set(availability.map((a) => a.dayOfWeek));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const calendar = allDays.map((date) => {
      const dateString = format(date, "yyyy-MM-dd");
      const dayOfWeek = dayNames[date.getDay()];
      const availableSlotsCount = slotsByDate[dateString] || 0;

      let status = "UNAVAILABLE";

      // If mentor has availability for this day of week
      if (workingDays.has(dayOfWeek)) {
        if (availableSlotsCount > 0) {
          status = "AVAILABLE";
        } else {
          // If no slots, check if it's because it's in the past (UNAVAILABLE)
          // or because it's fully booked (FULLY_BOOKED)
          if (date < today) {
            status = "UNAVAILABLE"; 
          } else {
             // It is a working day, in the future, but 0 slots generated.
             // This likely means all slots are taken or blocked.
             status = "FULLY_BOOKED";
          }
        }
      }

      return {
        date: dateString,
        dayOfWeek,
        status,
        availableSlots: availableSlotsCount,
      };
    });

    return {
      month,
      year,
      days: calendar,
    };
  },
};
