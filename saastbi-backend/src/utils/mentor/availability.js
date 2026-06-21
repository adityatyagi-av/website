import { addDays, format, parse, isWithinInterval, addMinutes } from "date-fns";

const DAY_MAP = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

export const generateAvailableSlots = ({
  availabilitySlots,
  existingSessions,
  blockedSlots = [],
  externalEvents = [],
  startDate,
  endDate,
  sessionDuration,
  bufferMinutes = 15,
  minBookingNoticeHours = 24,
}) => {
  const slots = [];
  const now = new Date();
  const minBookingTime = addMinutes(now, minBookingNoticeHours * 60);

  let currentDate = new Date(startDate);
  const finalDate = new Date(endDate);

  while (currentDate <= finalDate) {
    const dayOfWeek = Object.keys(DAY_MAP).find(
      (key) => DAY_MAP[key] === currentDate.getDay()
    );

    const dayAvailability = availabilitySlots.filter(
      (slot) => slot.dayOfWeek === dayOfWeek && slot.isActive
    );

    for (const availability of dayAvailability) {
      const [startHour, startMin] = availability.startTime.split(":").map(Number);
      const [endHour, endMin] = availability.endTime.split(":").map(Number);

      let slotStart = new Date(currentDate);
      slotStart.setHours(startHour, startMin, 0, 0);

      const dayEnd = new Date(currentDate);
      dayEnd.setHours(endHour, endMin, 0, 0);

      while (addMinutes(slotStart, sessionDuration) <= dayEnd) {
        const slotEnd = addMinutes(slotStart, sessionDuration);

        if (slotStart < minBookingTime) {
          slotStart = addMinutes(slotStart, sessionDuration + bufferMinutes);
          continue;
        }

        const isBooked = existingSessions.some((session) => {
          const sessionStart = new Date(session.startTime);
          const sessionEnd = new Date(session.endTime);
          const bufferedStart = addMinutes(sessionStart, -bufferMinutes);
          const bufferedEnd = addMinutes(sessionEnd, bufferMinutes);
          return (
            (slotStart >= bufferedStart && slotStart < bufferedEnd) ||
            (slotEnd > bufferedStart && slotEnd <= bufferedEnd)
          );
        });

        const isBlocked = blockedSlots.some((block) => {
          const blockStart = new Date(block.startTime);
          const blockEnd = new Date(block.endTime);
          return slotStart >= blockStart && slotStart < blockEnd;
        });

        const hasExternalConflict = externalEvents.some((event) => {
          const eventStart = new Date(event.start);
          const eventEnd = new Date(event.end);
          return (
            (slotStart >= eventStart && slotStart < eventEnd) ||
            (slotEnd > eventStart && slotEnd <= eventEnd)
          );
        });

        if (!isBooked && !isBlocked && !hasExternalConflict) {
          slots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            date: format(slotStart, "yyyy-MM-dd"),
            dayOfWeek,
          });
        }

        slotStart = addMinutes(slotStart, sessionDuration + bufferMinutes);
      }
    }

    currentDate = addDays(currentDate, 1);
  }

  return slots;
};

export const isSlotAvailable = ({
  slotStart,
  slotEnd,
  availabilitySlots,
  existingSessions,
  bufferMinutes = 15,
}) => {
  const slotDate = new Date(slotStart);
  const dayOfWeek = Object.keys(DAY_MAP).find(
    (key) => DAY_MAP[key] === slotDate.getDay()
  );

  const dayAvailability = availabilitySlots.find(
    (slot) => slot.dayOfWeek === dayOfWeek && slot.isActive
  );

  if (!dayAvailability) return false;

  const [availStart] = dayAvailability.startTime.split(":").map(Number);
  const [availEnd] = dayAvailability.endTime.split(":").map(Number);
  const slotHour = slotDate.getHours();

  if (slotHour < availStart || slotHour >= availEnd) return false;

  const hasConflict = existingSessions.some((session) => {
    const sessionStart = new Date(session.startTime);
    const sessionEnd = new Date(session.endTime);
    const bufferedStart = addMinutes(sessionStart, -bufferMinutes);
    const bufferedEnd = addMinutes(sessionEnd, bufferMinutes);

    const slotStartDate = new Date(slotStart);
    const slotEndDate = new Date(slotEnd);

    return (
      (slotStartDate >= bufferedStart && slotStartDate < bufferedEnd) ||
      (slotEndDate > bufferedStart && slotEndDate <= bufferedEnd)
    );
  });

  return !hasConflict;
};
