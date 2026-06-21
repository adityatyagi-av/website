import db from "../db/db.js";
import { ApiError } from "./ApiError.js";

export async function checkEventPermission(event, userId) {
  if (event.authorId === userId) return true;
  if (event.pageId) {
    const member = await db.pageMember.findFirst({
      where: { pageId: event.pageId, userId },
      select: { role: true },
    });
    if (member && ["OWNER", "ADMIN"].includes(member.role)) return true;
  }
  return false;
}

export async function getEventWithAuth(eventId, userId) {
  console.log("EVENT ID IS ",eventId)
  const event = await db.event.findUnique({
    where: { slug: eventId },
    select: { id: true, authorId: true, pageId: true, status: true },
  });
  if (!event) throw new ApiError(404, "Event not found");
  const hasPermission = await checkEventPermission(event, userId);
  if (!hasPermission)
    throw new ApiError(403, "Not authorized to manage this event");
  return event;
}

export async function validatePagePermission(pageId, userId) {
  if (!pageId) return;
  const page = await db.page.findUnique({
    where: { id: pageId },
    select: { id: true, isActive: true },
  });
  if (!page) throw new ApiError(404, "Page not found");
  if (!page.isActive) throw new ApiError(400, "Page is not active");
  const member = await db.pageMember.findFirst({
    where: { pageId, userId },
    select: { role: true },
  });
  if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
    throw new ApiError(
      403,
      "You don't have permission to manage events for this page",
    );
  }
}

const VALID_EVENT_TYPES = [
  "CONFERENCE",
  "WORKSHOP",
  "MEETUP",
  "WEBINAR",
  "PITCH_EVENT",
  "HACKATHON",
  "NETWORKING",
  "DEMO_DAY",
  "BOOTCAMP",
  "PANEL",
  "FIRESIDE_CHAT",
  "OTHER",
];

const VALID_EVENT_FORMATS = ["IN_PERSON", "VIRTUAL", "HYBRID"];

const VALID_SPONSOR_TIERS = ["PLATINUM", "GOLD", "SILVER", "BRONZE", "PARTNER"];

const VALID_MEDIA_TYPES = ["IMAGE", "VIDEO", "DOCUMENT"];

export function validateCreateEventData(data) {
  const errors = [];

  if (
    !data.title ||
    typeof data.title !== "string" ||
    data.title.trim().length < 3
  ) {
    errors.push("Title is required and must be at least 3 characters");
  }
  if (
    !data.description ||
    typeof data.description !== "string" ||
    data.description.trim().length === 0
  ) {
    errors.push("Description is required");
  }
  if (!data.eventType || !VALID_EVENT_TYPES.includes(data.eventType)) {
    errors.push(
      `Event type is required and must be one of: ${VALID_EVENT_TYPES.join(", ")}`,
    );
  }
  if (!data.startDate || isNaN(new Date(data.startDate).getTime())) {
    errors.push("Valid start date is required");
  }
  if (!data.endDate || isNaN(new Date(data.endDate).getTime())) {
    errors.push("Valid end date is required");
  }
  if (
    data.startDate &&
    data.endDate &&
    new Date(data.startDate) >= new Date(data.endDate)
  ) {
    errors.push("Start date must be before end date");
  }
  if (data.format && !VALID_EVENT_FORMATS.includes(data.format)) {
    errors.push(`Format must be one of: ${VALID_EVENT_FORMATS.join(", ")}`);
  }
  if (data.isPaid) {
    const tickets = Array.isArray(data.ticketTypes) ? data.ticketTypes : [];
    if (tickets.length === 0) {
      errors.push("At least one ticket type is required for paid events");
    } else {
      const hasPaidTicket = tickets.some(
        (t) => typeof t.price === "number" && t.price > 0,
      );
      if (!hasPaidTicket) {
        errors.push(
          "At least one ticket type must have a price greater than 0",
        );
      }
    }
  }
  if (
    data.capacity !== undefined &&
    data.capacity !== null &&
    (typeof data.capacity !== "number" || data.capacity < 1)
  ) {
    errors.push("Capacity must be a positive number");
  }
  if (data.isRecurring && data.recurringType && data.recurringType !== "NONE") {
    if (!data.recurringEndDate) {
      errors.push("Recurring end date is required for recurring events");
    } else if (new Date(data.recurringEndDate) <= new Date(data.startDate)) {
      errors.push("Recurring end date must be after start date");
    }
  }

  if (data.speakers && Array.isArray(data.speakers)) {
    data.speakers.forEach((s, i) => {
      if (!s.name || typeof s.name !== "string" || s.name.trim().length === 0) {
        errors.push(`Speaker at index ${i}: name is required`);
      }
    });
  }

  if (data.sponsors && Array.isArray(data.sponsors)) {
    data.sponsors.forEach((s, i) => {
      if (!s.name || typeof s.name !== "string" || s.name.trim().length === 0) {
        errors.push(`Sponsor at index ${i}: name is required`);
      }
      if (s.tier && !VALID_SPONSOR_TIERS.includes(s.tier)) {
        errors.push(
          `Sponsor at index ${i}: tier must be one of: ${VALID_SPONSOR_TIERS.join(", ")}`,
        );
      }
    });
  }

  if (data.timeline && Array.isArray(data.timeline)) {
    data.timeline.forEach((t, i) => {
      if (
        !t.title ||
        typeof t.title !== "string" ||
        t.title.trim().length === 0
      ) {
        errors.push(`Timeline item at index ${i}: title is required`);
      }
      if (!t.startTime || isNaN(new Date(t.startTime).getTime())) {
        errors.push(
          `Timeline item at index ${i}: valid start time is required`,
        );
      }
    });
  }

  if (data.ticketTypes && Array.isArray(data.ticketTypes)) {
    data.ticketTypes.forEach((t, i) => {
      if (!t.name || typeof t.name !== "string" || t.name.trim().length === 0) {
        errors.push(`Ticket type at index ${i}: name is required`);
      }
      if (
        t.quantity === undefined ||
        t.quantity === null ||
        typeof t.quantity !== "number" ||
        t.quantity < 1
      ) {
        errors.push(
          `Ticket type at index ${i}: quantity must be a positive number`,
        );
      }
    });
  }

  if (data.organizers && Array.isArray(data.organizers)) {
    data.organizers.forEach((o, i) => {
      if (!o.userId || typeof o.userId !== "string") {
        errors.push(`Organizer at index ${i}: userId is required`);
      }
    });
  }

  if (data.media && Array.isArray(data.media)) {
    data.media.forEach((m, i) => {
      if (!m.url || typeof m.url !== "string" || m.url.trim().length === 0) {
        errors.push(`Media at index ${i}: url is required`);
      }
      if (m.mediaType && !VALID_MEDIA_TYPES.includes(m.mediaType)) {
        errors.push(
          `Media at index ${i}: mediaType must be one of: ${VALID_MEDIA_TYPES.join(", ")}`,
        );
      }
    });
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join("; "));
  }
}

export function validatePublishRequirements(event, ticketTypes = []) {
  const errors = [];

  if (!event.title) errors.push("Title is required");
  if (!event.description) errors.push("Description is required");
  if (!event.startDate) errors.push("Start date is required");
  if (!event.endDate) errors.push("End date is required");
  if (!event.eventType) errors.push("Event type is required");

  const format = event.format || "IN_PERSON";
  if (["VIRTUAL", "HYBRID"].includes(format) && !event.virtualUrl) {
    errors.push("Virtual URL is required for virtual/hybrid events");
  }
  if (
    ["IN_PERSON", "HYBRID"].includes(format) &&
    !event.venue &&
    !event.address
  ) {
    errors.push("Venue or address is required for in-person/hybrid events");
  }
  if (event.isPaid) {
    const activeTickets = ticketTypes.filter((t) => t.isActive !== false);
    if (activeTickets.length === 0) {
      errors.push(
        "At least one active ticket type is required for paid events",
      );
    }
  }

  if (errors.length > 0) {
    throw new ApiError(400, `Cannot publish: ${errors.join("; ")}`);
  }
}
