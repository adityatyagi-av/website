import { addDays, addMonths, addWeeks, addYears, differenceInCalendarDays } from "date-fns";

export const CYCLE_DAYS = {
  WEEKLY: 7,
  MONTHLY: 30,
  QUARTERLY: 90,
  HALF_YEARLY: 180,
  YEARLY: 365,
};

export function addCycles(start, cycle, count, customDays) {
  const date = new Date(start);
  switch (cycle) {
    case "WEEKLY":
      return addWeeks(date, count);
    case "MONTHLY":
      return addMonths(date, count);
    case "QUARTERLY":
      return addMonths(date, count * 3);
    case "HALF_YEARLY":
      return addMonths(date, count * 6);
    case "YEARLY":
      return addYears(date, count);
    case "CUSTOM":
      if (!customDays || customDays <= 0) {
        throw new Error("customCycleDays is required for CUSTOM billing cycle");
      }
      return addDays(date, count * customDays);
    default:
      throw new Error(`Unsupported billing cycle: ${cycle}`);
  }
}

export function nextCycleDate(start, cycle, customDays) {
  return addCycles(start, cycle, 1, customDays);
}

export function computeBookingEndDate({ startDate, billingCycle, totalDuration, customCycleDays }) {
  if (!startDate || !billingCycle || !totalDuration) return null;
  return addCycles(startDate, billingCycle, totalDuration, customCycleDays);
}

export function razorpayPlanPeriod(billingCycle, customCycleDays = null) {
  switch (billingCycle) {
    case "WEEKLY":
      return { period: "weekly", interval: 1 };
    case "MONTHLY":
      return { period: "monthly", interval: 1 };
    case "QUARTERLY":
      return { period: "monthly", interval: 3 };
    case "HALF_YEARLY":
      return { period: "monthly", interval: 6 };
    case "YEARLY":
      return { period: "yearly", interval: 1 };
    case "CUSTOM": {
      const days = Number(customCycleDays);
      if (!days || days < 1 || days > 365) {
        throw new Error("customCycleDays must be between 1 and 365 for CUSTOM billing cycle");
      }
      if (days % 30 === 0) {
        return { period: "monthly", interval: days / 30 };
      }
      if (days % 7 === 0) {
        return { period: "weekly", interval: days / 7 };
      }
      return { period: "daily", interval: days };
    }
    default:
      throw new Error(`Cannot map billing cycle to Razorpay plan: ${billingCycle}`);
  }
}

export function daysBetween(a, b) {
  return Math.abs(differenceInCalendarDays(new Date(a), new Date(b)));
}

export function isCycleValid(cycle) {
  return ["WEEKLY", "MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY", "CUSTOM"].includes(cycle);
}
