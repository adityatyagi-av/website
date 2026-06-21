import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { buildQueryOptions } from "../../../utils/queryHelper.js";
import { recordEntityVisit } from "../../../utils/helperFunctions.js";
import { addDays, addWeeks, addMonths, endOfWeek } from "date-fns";
import {
  checkEventPermission,
  validatePagePermission,
  validateCreateEventData,
  validatePublishRequirements,
} from "../../../utils/eventHelpers.js";
import { EventAudienceResolver } from "./eventAudienceResolver.service.js";
import { NotificationService } from "../../common/notification.service.js";

function generateSlug(title, suffix = "") {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80);
  const rand = suffix || Math.random().toString(36).substring(2, 8);
  return `${base}-${rand}`;
}

async function ensureUniqueSlug(baseSlug) {
  let slug = baseSlug;
  let attempt = 0;
  while (await db.event.findUnique({ where: { slug }, select: { id: true } })) {
    attempt++;
    slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
    if (attempt > 10) break;
  }
  return slug;
}

function computeRecurringDates({
  recurringType,
  recurringDays,
  startDate,
  endDate,
  recurringEndDate,
}) {
  const dates = [];
  const start = new Date(startDate);
  const eventDuration = new Date(endDate).getTime() - start.getTime();
  const limit = new Date(recurringEndDate);
  const maxInstances = 52;
  let current = new Date(start);

  const dayMap = {
    SUNDAY: 0,
    MONDAY: 1,
    TUESDAY: 2,
    WEDNESDAY: 3,
    THURSDAY: 4,
    FRIDAY: 5,
    SATURDAY: 6,
  };

  if (recurringType === "DAILY") {
    current = addDays(current, 1);
    while (current <= limit && dates.length < maxInstances) {
      dates.push({
        start: new Date(current),
        end: new Date(current.getTime() + eventDuration),
      });
      current = addDays(current, 1);
    }
  } else if (recurringType === "WEEKLY" || recurringType === "BIWEEKLY") {
    const increment = recurringType === "BIWEEKLY" ? 2 : 1;
    const targetDays =
      recurringDays.length > 0
        ? recurringDays.map((d) => dayMap[d]).filter((d) => d !== undefined)
        : [start.getDay()];
    current = addWeeks(current, increment);
    while (current <= limit && dates.length < maxInstances) {
      for (const targetDay of targetDays) {
        const diff = (targetDay - current.getDay() + 7) % 7;
        const instanceDate = addDays(current, diff);
        instanceDate.setHours(
          start.getHours(),
          start.getMinutes(),
          start.getSeconds(),
        );
        if (
          instanceDate > start &&
          instanceDate <= limit &&
          dates.length < maxInstances
        ) {
          dates.push({
            start: new Date(instanceDate),
            end: new Date(instanceDate.getTime() + eventDuration),
          });
        }
      }
      current = addWeeks(current, increment);
    }
    dates.sort((a, b) => a.start - b.start);
  } else if (recurringType === "MONTHLY") {
    current = addMonths(current, 1);
    while (current <= limit && dates.length < maxInstances) {
      dates.push({
        start: new Date(current),
        end: new Date(current.getTime() + eventDuration),
      });
      current = addMonths(current, 1);
    }
  }

  return dates;
}

async function createNestedRecords(tx, eventId, data) {
  const createdSpeakers = [];
  if (
    data.speakers &&
    Array.isArray(data.speakers) &&
    data.speakers.length > 0
  ) {
    for (const s of data.speakers) {
      const speaker = await tx.eventSpeaker.create({
        data: {
          eventId,
          userId: s.userId || null,
          name: s.name,
          title: s.title,
          company: s.company,
          bio: s.bio,
          photo: s.photo,
          topic: s.topic,
          order: s.order || 0,
        },
      });
      createdSpeakers.push(speaker);
    }
  }

  if (
    data.sponsors &&
    Array.isArray(data.sponsors) &&
    data.sponsors.length > 0
  ) {
    for (const s of data.sponsors) {
      await tx.eventSponsor.create({
        data: {
          eventId,
          name: s.name,
          logo: s.logo,
          website: s.website,
          tier: s.tier || "SILVER",
          order: s.order || 0,
        },
      });
    }
  }

  if (
    data.timeline &&
    Array.isArray(data.timeline) &&
    data.timeline.length > 0
  ) {
    for (const t of data.timeline) {
      await tx.eventTimeline.create({
        data: {
          eventId,
          title: t.title,
          description: t.description,
          startTime: new Date(t.startTime),
          endTime: t.endTime ? new Date(t.endTime) : null,
          location: t.location,
          speakerIds: t.speakerIds || [],
          order: t.order || 0,
        },
      });
    }
  }

  if (
    data.ticketTypes &&
    Array.isArray(data.ticketTypes) &&
    data.ticketTypes.length > 0
  ) {
    for (const t of data.ticketTypes) {
      await tx.eventTicketType.create({
        data: {
          eventId,
          name: t.name,
          description: t.description,
          price: t.price || 0,
          currency: t.currency || "INR",
          quantity: t.quantity,
          saleStartDate: t.saleStartDate ? new Date(t.saleStartDate) : null,
          saleEndDate: t.saleEndDate ? new Date(t.saleEndDate) : null,
          isActive: t.isActive !== undefined ? t.isActive : true,
          order: t.order || 0,
        },
      });
    }
  }

  if (data.media && Array.isArray(data.media) && data.media.length > 0) {
    for (const m of data.media) {
      await tx.eventMedia.create({
        data: {
          eventId,
          url: m.url,
          mediaType: m.mediaType || "IMAGE",
          caption: m.caption,
          order: m.order || 0,
        },
      });
    }
  }

  return createdSpeakers;
}

const authorInclude = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    username: true,
    profilePhoto: true,
    headline: true,
  },
};

const pageInclude = {
  select: { id: true, name: true, slug: true, logo: true, type: true },
};

const eventCardInclude = {
  author: authorInclude,
  page: pageInclude,
  ticketTypes: {
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      price: true,
      currency: true,
      quantity: true,
      quantitySold: true,
    },
    orderBy: { order: "asc" },
  },
  registrations: {
    where: { status: { in: ["CONFIRMED", "ATTENDED"] } },
    take: 3,
    select: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePhoto: true,
        },
      },
    },
  },
  _count: { select: { registrations: true, bookmarks: true } },
};

const eventDetailInclude = {
  author: authorInclude,
  page: pageInclude,
  ticketTypes: { where: { isActive: true }, orderBy: { order: "asc" } },
  organizers: {
    include: { user: authorInclude },
    orderBy: { createdAt: "asc" },
  },
  speakers: { orderBy: { order: "asc" }, include: { user: authorInclude } },
  sponsors: { orderBy: [{ tier: "asc" }, { order: "asc" }] },
  timeline: { orderBy: [{ startTime: "asc" }, { order: "asc" }] },
  media: { orderBy: { order: "asc" } },
  _count: {
    select: {
      registrations: true,
      bookmarks: true,
      feedback: true,
      questions: true,
    },
  },
};

export const EventService = {
  createEvent: async (authorId, data) => {
    validateCreateEventData(data);

    if (data.pageId) await validatePagePermission(data.pageId, authorId);

    const baseSlug = generateSlug(data.title);
    const slug = await ensureUniqueSlug(baseSlug);

    const wantPublish = data.publish === true;
    const format = data.format || "IN_PERSON";
    const ticketTypes = data.ticketTypes || [];

    if (wantPublish) {
      validatePublishRequirements({ ...data, format }, ticketTypes);
    }

    const eventStatus = wantPublish ? "PUBLISHED" : "DRAFT";

    const event = await db.$transaction(async (tx) => {
      const newEvent = await tx.event.create({
        data: {
          title: data.title,
          slug,
          description: data.description,
          shortDesc: data.shortDesc,
          coverImage: data.coverImage,
          eventType: data.eventType,
          format,
          status: eventStatus,
          authorId,
          pageId: data.pageId || null,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          timezone: data.timezone || "Asia/Kolkata",
          venue: data.venue,
          address: data.address,
          city: data.city,
          state: data.state,
          country: data.country,
          latitude: data.latitude,
          longitude: data.longitude,
          virtualUrl: data.virtualUrl,
          capacity: data.capacity,
          isPaid: data.isPaid || false,
          price: data.price,
          currency: data.currency || "INR",
          tags: data.tags || [],
          isPublic: data.isPublic !== undefined ? data.isPublic : true,
          requiresApproval: data.requiresApproval || false,
          allowWaitlist: data.allowWaitlist || false,
          autoConfirm: data.autoConfirm !== undefined ? data.autoConfirm : true,
          registrationDeadline: data.registrationDeadline
            ? new Date(data.registrationDeadline)
            : null,
          maxLiveParticipants: data.maxLiveParticipants,
          isRecurring: data.isRecurring || false,
          recurringType: data.recurringType || "NONE",
          recurringDays: data.recurringDays || [],
          recurringEndDate: data.recurringEndDate
            ? new Date(data.recurringEndDate)
            : null,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          websiteUrl: data.websiteUrl,
          isCommentEnabled:
            data.isCommentEnabled !== undefined ? data.isCommentEnabled : true,
        },
      });

      await tx.eventOrganizer.create({
        data: { eventId: newEvent.id, userId: authorId, role: "host" },
      });

      if (
        data.organizers &&
        Array.isArray(data.organizers) &&
        data.organizers.length > 0
      ) {
        for (const o of data.organizers) {
          if (o.userId === authorId) continue;
          const user = await tx.user.findUnique({
            where: { id: o.userId },
            select: { id: true },
          });
          if (user) {
            await tx.eventOrganizer.create({
              data: {
                eventId: newEvent.id,
                userId: o.userId,
                role: o.role || "organizer",
              },
            });
          }
        }
      }

      await createNestedRecords(tx, newEvent.id, data);

      if (
        data.isRecurring &&
        data.recurringType &&
        data.recurringType !== "NONE"
      ) {
        const recurDates = computeRecurringDates({
          recurringType: data.recurringType,
          recurringDays: data.recurringDays || [],
          startDate: data.startDate,
          endDate: data.endDate,
          recurringEndDate: data.recurringEndDate,
        });

        for (let i = 0; i < recurDates.length; i++) {
          const childSlug = await ensureUniqueSlug(
            `${baseSlug}-${recurDates[i].start.toISOString().split("T")[0]}`,
          );
          const child = await tx.event.create({
            data: {
              title: data.title,
              slug: childSlug,
              description: data.description,
              shortDesc: data.shortDesc,
              coverImage: data.coverImage,
              eventType: data.eventType,
              pageId: data.pageId,
              format,
              status: eventStatus,
              authorId,
              pageId: data.pageId || null,
              startDate: recurDates[i].start,
              endDate: recurDates[i].end,
              timezone: data.timezone || "Asia/Kolkata",
              venue: data.venue,
              address: data.address,
              city: data.city,
              state: data.state,
              country: data.country,
              virtualUrl: data.virtualUrl,
              capacity: data.capacity,
              isPaid: data.isPaid || false,
              price: data.price,
              currency: data.currency || "INR",
              tags: data.tags || [],
              isPublic: data.isPublic !== undefined ? data.isPublic : true,
              requiresApproval: data.requiresApproval || false,
              allowWaitlist: data.allowWaitlist || false,
              autoConfirm:
                data.autoConfirm !== undefined ? data.autoConfirm : true,
              registrationDeadline: data.registrationDeadline
                ? new Date(data.registrationDeadline)
                : null,
              maxLiveParticipants: data.maxLiveParticipants,
              parentEventId: newEvent.id,
              contactEmail: data.contactEmail,
              contactPhone: data.contactPhone,
              websiteUrl: data.websiteUrl,
            },
          });

          await tx.eventRecurrenceInstance.create({
            data: {
              parentEventId: newEvent.id,
              childEventId: child.id,
              instanceDate: recurDates[i].start,
              instanceNumber: i + 1,
            },
          });

          await tx.eventOrganizer.create({
            data: { eventId: child.id, userId: authorId, role: "host" },
          });

          await createNestedRecords(tx, child.id, data);
        }
      }

      return tx.event.findUnique({
        where: { id: newEvent.id },
        include: eventDetailInclude,
      });
    });

    return event;
  },

  updateEvent: async (userId, eventId, data) => {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        authorId: true,
        pageId: true,
        status: true,
        registrationCount: true,
        title: true,
        description: true,
        startDate: true,
        endDate: true,
        eventType: true,
        format: true,
        virtualUrl: true,
        venue: true,
        address: true,
        isPaid: true,
      },
    });
    if (!event) throw new ApiError(404, "Event not found");

    const hasPermission = await checkEventPermission(event, userId);
    if (!hasPermission)
      throw new ApiError(403, "Not authorized to update this event");

    if (event.status === "COMPLETED" || event.status === "CANCELLED") {
      throw new ApiError(
        400,
        `Cannot update a ${event.status.toLowerCase()} event`,
      );
    }

    if (data.capacity && event.registrationCount > data.capacity) {
      throw new ApiError(
        400,
        "Cannot set capacity below current registration count",
      );
    }

    const updateData = {};
    const allowedFields = [
      "title",
      "description",
      "shortDesc",
      "coverImage",
      "eventType",
      "format",
      "startDate",
      "endDate",
      "timezone",
      "venue",
      "address",
      "city",
      "state",
      "country",
      "latitude",
      "longitude",
      "virtualUrl",
      "capacity",
      "isPaid",
      "price",
      "currency",
      "tags",
      "isPublic",
      "requiresApproval",
      "allowWaitlist",
      "autoConfirm",
      "registrationDeadline",
      "maxLiveParticipants",
      "contactEmail",
      "contactPhone",
      "websiteUrl",
      "isCommentEnabled",
      "isFeatured",
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        if (["startDate", "endDate", "registrationDeadline"].includes(field)) {
          updateData[field] = data[field] ? new Date(data[field]) : null;
        } else {
          updateData[field] = data[field];
        }
      }
    }

    if (data.title && data.title !== event.title) {
      updateData.slug = await ensureUniqueSlug(generateSlug(data.title));
    }

    if (data.publish === true) {
      if (event.status !== "DRAFT") {
        throw new ApiError(400, "Only draft events can be published");
      }

      const merged = { ...event, ...updateData };
      const ticketTypes = await db.eventTicketType.findMany({
        where: { eventId, isActive: true },
      });
      validatePublishRequirements(merged, ticketTypes);
      updateData.status = "PUBLISHED";
    }

    const updated = await db.event.update({
      where: { id: eventId },
      data: updateData,
      include: eventDetailInclude,
    });


    const importantFields = [
      "title",
      "startDate",
      "endDate",
      "venue",
      "address",
      "virtualUrl",
      "format",
      "eventType",
    ];

    const changedImportantFields = [];

    for (const field of importantFields) {

      if (updateData[field] === undefined) {
        continue;
      }

      const oldValue =
        event[field] instanceof Date
          ? new Date(event[field]).toISOString()
          : event[field];

      const newValue =
        updateData[field] instanceof Date
          ? new Date(updateData[field]).toISOString()
          : updateData[field];

      if (oldValue !== newValue) {
        changedImportantFields.push(field);
      }
    }

    const hasImportantChanges =
    changedImportantFields.length > 0;
  
  if (
    hasImportantChanges &&
    updated.status === "PUBLISHED"
  ) {
  
    const attendees =
      await db.eventRegistration.findMany({
        where: {
          eventId,
  
          status: {
            in: [
              "REGISTERED",
              "CONFIRMED",
            ],
          },
        },
  
        select: {
          userId: true,
        },
      });
  
    const recipientIds = [
      ...new Set(
        attendees.map((a) => a.userId)
      ),
    ];
    let actorId = userId;
    let actorPageId = null;
    let actorName;
    let actorAvatar;
    let actorSlug;
    console.log("Recipient IDs:", recipientIds);
console.log("Calling sendBulk...");

    if (recipientIds.length > 0) {

      if (updated.pageId) {
        const page = await db.page.findUnique({
          where: {
            id: updated.pageId,
          },
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
          },
        });

        actorPageId = page?.id;
        actorName = page?.name;
        actorAvatar = page?.logo;
        actorSlug = page?.slug;

      } else {

        const actor = await db.user.findUnique({
          where: {
            id: userId,
          },
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        });

        actorName =
          `${actor?.firstName ?? ""} ${actor?.lastName ?? ""}`.trim() ||
          actor?.username;

        actorAvatar = actor?.profilePhoto;
        actorSlug = actor?.username;
      }
      
  
      await NotificationService.sendBulk({
        recipientIds,
        type: "EVENT_UPDATE",
        category: "EVENT",
        priority: "MEDIUM",
        title: "Event Updated",
        message: `updated the event "${updated.title}".`,
        actorId,
        actorName,
        actorAvatar,
        entityType: "Event",
        entityId: updated.id,
        actionUrl:
          `/events/${updated.slug}`,
        data: {
          eventId: updated.id,
          eventTitle:
            updated.title,
          changedFields:
            changedImportantFields,
            actorSlug,
        },
      });
    }
  }
    return updated;
  },

  updateRecurringEvents: async (
    userId,
    eventId,
    data,
    updateMode = "this_only",
  ) => {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, authorId: true, pageId: true, parentEventId: true },
    });
    if (!event) throw new ApiError(404, "Event not found");

    const hasPermission = await checkEventPermission(event, userId);
    if (!hasPermission) throw new ApiError(403, "Not authorized");

    if (updateMode === "this_only") {
      return EventService.updateEvent(userId, eventId, data);
    }

    const parentId = event.parentEventId || event.id;
    const childIds = await db.eventRecurrenceInstance.findMany({
      where: { parentEventId: parentId },
      select: { childEventId: true, instanceDate: true },
    });

    const futureChildIds = childIds
      .filter((c) => new Date(c.instanceDate) > new Date())
      .map((c) => c.childEventId);

    const idsToUpdate =
      updateMode === "all_future"
        ? futureChildIds
        : [parentId, ...childIds.map((c) => c.childEventId)];

    const updateData = {};
    const fieldsToSync = [
      "title",
      "description",
      "shortDesc",
      "coverImage",
      "venue",
      "address",
      "city",
      "state",
      "country",
      "virtualUrl",
      "capacity",
      "isPaid",
      "price",
      "currency",
      "tags",
      "isPublic",
      "requiresApproval",
      "allowWaitlist",
    ];
    for (const field of fieldsToSync) {
      if (data[field] !== undefined) updateData[field] = data[field];
    }

    await db.event.updateMany({
      where: { id: { in: idsToUpdate } },
      data: updateData,
    });

    return db.event.findUnique({
      where: { id: eventId },
      include: eventDetailInclude,
    });
  },

  publishEvent: async (userId, eventId) => {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        authorId: true,
        pageId: true,
        status: true,
        title: true,
        description: true,
        startDate: true,
        endDate: true,
        eventType: true,
        format: true,
        virtualUrl: true,
        venue: true,
        address: true,
        isPaid: true,
        isRecurring: true,
      },
    });
    if (!event) throw new ApiError(404, "Event not found");
    if (event.status !== "DRAFT")
      throw new ApiError(400, "Only draft events can be published");

    const hasPermission = await checkEventPermission(event, userId);
    if (!hasPermission) throw new ApiError(403, "Not authorized");

    const ticketTypes = await db.eventTicketType.findMany({
      where: { eventId, isActive: true },
    });
    validatePublishRequirements(event, ticketTypes);

    const result= await db.$transaction(async (tx) => {
      const published = await tx.event.update({
        where: { id: eventId },
        data: { status: "PUBLISHED" },
        include: eventDetailInclude,
      });

      if (event.isRecurring) {
        const children = await tx.eventRecurrenceInstance.findMany({
          where: { parentEventId: eventId },
          select: { childEventId: true },
        });
        if (children.length > 0) {
          await tx.event.updateMany({
            where: {
              id: { in: children.map((c) => c.childEventId) },
              status: "DRAFT",
            },
            data: { status: "PUBLISHED" },
          });
        }
      }

      return published;
    });

    const recipientIds =
    await EventAudienceResolver.resolvePublishedEventAudience(
      result
    );
    console.log("EVENT:", result.id);
    console.log("RECIPIENT IDS:", recipientIds);

    let actorName;
    let actorAvatar;
    let actorSlug;

    if (result.pageId) {
      const page = await db.page.findUnique({
        where: {
          id: result.pageId,
        },
        select: {
          name: true,
          slug: true,
          logo: true,
        },
      });
      console.log("page details:",page)

      actorName = page?.name;
      actorAvatar = page?.logo;
      actorSlug = page?.slug;
      console.log("actor name of page:",actorName);
      console.log("actor avatar",actorAvatar)
    } else {
      const actor = await db.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          username: true,
          firstName: true,
          lastName: true,
          profilePhoto: true,
        },
      });

      actorName =
        `${actor?.firstName ?? ""} ${actor?.lastName ?? ""}`.trim() ||
        actor?.username;

      actorAvatar = actor?.profilePhoto;
      actorSlug = actor?.username;
    }

    if (recipientIds.length > 0) {
      await NotificationService.sendBulk({
        recipientIds,
        type: "EVENT_UPDATE",
        category: "EVENT",
        priority: "MEDIUM",
        title: "New Event Published",
        message: `published a new event: ${result.title}.`,
        actorId: result.authorId,
        actorName,
        actorAvatar,
        actionUrl: `/events/${result.slug}`,
        entityType: "EVENT",
        entityId: result.id,
        data: {
          eventId: result.id,
          eventTitle: result.title,
          eventType: result.eventType,
          actorSlug
        },
      });
    }

    return result;
    },

  cancelEvent: async (userId, eventId, reason) => {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        authorId: true,
        pageId: true,
        status: true,
        isRecurring: true,
        title: true,
        slug: true,
      },
    });
    if (!event) throw new ApiError(404, "Event not found");
    if (event.status === "CANCELLED")
      throw new ApiError(400, "Event is already cancelled");
    if (event.status === "COMPLETED")
      throw new ApiError(400, "Cannot cancel a completed event");

    const hasPermission = await checkEventPermission(event, userId);
    if (!hasPermission) throw new ApiError(403, "Not authorized");

    const cancelled = await db.$transaction(async (tx) => {
      const cancelledEvent = await tx.event.update({
        where: { id: eventId },
        data: { status: "CANCELLED" },
        include: eventDetailInclude,
      });

      await tx.eventRegistration.updateMany({
        where: {
          eventId,
          status: { in: ["REGISTERED", "CONFIRMED", "WAITLISTED"] },
        },
        data: {
          status: "CANCELLED",
          cancelReason: reason || "Event cancelled by host",
        },
      });

      if (event.isRecurring) {
        const children = await tx.eventRecurrenceInstance.findMany({
          where: { parentEventId: eventId },
          select: { childEventId: true },
        });
        if (children.length > 0) {
          const childIds = children.map((c) => c.childEventId);
          await tx.event.updateMany({
            where: {
              id: { in: childIds },
              status: { in: ["DRAFT", "PUBLISHED"] },
            },
            data: { status: "CANCELLED" },
          });
          await tx.eventRegistration.updateMany({
            where: {
              eventId: { in: childIds },
              status: { in: ["REGISTERED", "CONFIRMED", "WAITLISTED"] },
            },
            data: {
              status: "CANCELLED",
              cancelReason: reason || "Event cancelled by host",
            },
          });
        }
      }

      return cancelledEvent;
    });

    const registrants = await db.eventRegistration.findMany({
      where: {
        eventId,
        status: "CANCELLED",
        cancelReason: reason || "Event cancelled by host",
      },
      select: { user: { select: { id: true, email: true, firstName: true } } },
    });

    const actor = await db.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        username: true,
        firstName: true,
        lastName: true,
        profilePhoto: true,
      },
    });

    if (registrants.length > 0) {
      NotificationService.sendBulk({
        recipientIds: registrants.map((r) => r.user.id),
        type: "EVENT_CANCELLED",
        category: "EVENT",
        title: "Event Cancelled",
        message:
        reason
         ? `cancelled the event "${event.title}": ${reason}`
         : `cancelled the event "${event.title}".`,
        actionUrl: `/events/${event.slug || eventId}`,
        entityType: "Event",
        entityId: eventId,
        actorId: userId,
        actorName:
          `${actor?.firstName || ""} ${actor?.lastName || ""}`.trim(),
        actorAvatar: actor?.profilePhoto || null,
        data: {
          eventId,
          eventTitle: event.title,
          reason: reason || null,
          actorSlug: actor?.username,
        },
      }).catch(() => {});

      const sendMail = (await import("../../../config/sendMail.js")).default;
      const path = await import("path");
      for (const reg of registrants) {
        sendMail(
          reg.user.email,
          `Event Cancelled: ${event.title}`,
          path.resolve("src/mails/event-cancellation.ejs"),
          {
            userName: reg.user.firstName || "Attendee",
            eventTitle: event.title,
            cancellationReason: reason || "Cancelled by the host",
          },
        ).catch(() => {});
      }
    }

    return cancelled;
  },

  completeEvent: async (userId, eventId) => {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, authorId: true, pageId: true, status: true },
    });
    if (!event) throw new ApiError(404, "Event not found");
    if (event.status !== "PUBLISHED")
      throw new ApiError(400, "Only published events can be completed");

    const hasPermission = await checkEventPermission(event, userId);
    if (!hasPermission) throw new ApiError(403, "Not authorized");

    return db.event.update({
      where: { id: eventId },
      data: { status: "COMPLETED" },
      include: eventDetailInclude,
    });
  },

  deleteEvent: async (userId, eventId) => {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        authorId: true,
        pageId: true,
        status: true,
        isRecurring: true,
      },
    });
    if (!event) throw new ApiError(404, "Event not found");
    if (!["DRAFT", "CANCELLED"].includes(event.status)) {
      throw new ApiError(400, "Only draft or cancelled events can be deleted");
    }

    const hasPermission = await checkEventPermission(event, userId);
    if (!hasPermission) throw new ApiError(403, "Not authorized");

    return db.$transaction(async (tx) => {
      if (event.isRecurring) {
        const children = await tx.eventRecurrenceInstance.findMany({
          where: { parentEventId: eventId },
          select: { childEventId: true },
        });
        if (children.length > 0) {
          await tx.event.updateMany({
            where: { id: { in: children.map((c) => c.childEventId) } },
            data: { isArchived: true },
          });
        }
      }

      await tx.event.update({
        where: { id: eventId },
        data: { isArchived: true },
      });
      return { message: "Event deleted successfully" };
    });
  },

  getEventBySlug: async (slug, userId, req) => {
    const event = await db.event.findUnique({
      where: { slug, isArchived: false },
      include: eventDetailInclude,
    });
    if (!event) throw new ApiError(404, "Event not found");

    let registrationStatus = null;
    let isBookmarked = false;
    let canEdit = false;

    if (userId) {
      const reg = await db.eventRegistration.findUnique({
        where: { eventId_userId: { eventId: event.id, userId } },
        select: { status: true, ticketName: true },
      });
      registrationStatus = reg;

      const bm = await db.eventBookmark.findUnique({
        where: { eventId_userId: { eventId: event.id, userId } },
        select: { id: true },
      });
      isBookmarked = !!bm;


      if(event.authorId === userId){
        canEdit = true;
      }
      else if(event.pageId){
        const pageMember = await db.pageMember.findFirst({
          where:{
            pageId: event.pageId,
            userId,
            role: {
              in: ["OWNER", "ADMIN", "MEMBER"],
            },
          },
          select: {
            id: true,
          },
        });
        canEdit = !!pageMember;
      }
    }

    recordEntityVisit({
      entityType: "EVENT",
      entityId: event.id,
      viewerId: userId || null,
      ipAddress: req?.ip,
      userAgent: req?.headers?.["user-agent"],
    }).catch(() => {});

    db.event
      .update({
        where: { id: event.id },
        data: { viewCount: { increment: 1 } },
      })
      .catch(() => {});

    return { ...event, registrationStatus, isBookmarked, canEdit};
  },

  getEventById: async (eventId) => {
    const event = await db.event.findUnique({
      where: { slug: eventId, isArchived: false },
      include: eventDetailInclude,
    });
    if (!event) throw new ApiError(404, "Event not found");
    return event;
  },

  getAllEvents: async (query, userId) => {
    const {
      skip,
      take,
      where: searchWhere,
      orderBy,
    } = buildQueryOptions({
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ["title", "description"],
      sortBy: query.sortBy || "startDate",
      order: query.order || "asc",
    });

    const filter = {
      ...searchWhere,
      isArchived: false,
      status: "PUBLISHED",
    };

    if (query.eventType) filter.eventType = query.eventType;
    if (query.format) filter.format = query.format;
    if (query.city) filter.city = { contains: query.city, mode: "insensitive" };
    if (query.country)
      filter.country = { contains: query.country, mode: "insensitive" };
    if (query.isPaid !== undefined)
      filter.isPaid = query.isPaid === "true" || query.isPaid === true;
    if (query.isFeatured) filter.isFeatured = true;
    if (query.parentOnly) filter.parentEventId = null;

    if (query.tag) {
      filter.tags = { has: query.tag };
    }

    if (query.dateFrom || query.dateTo) {
      filter.startDate = {};
      if (query.dateFrom) filter.startDate.gte = new Date(query.dateFrom);
      if (query.dateTo) filter.startDate.lte = new Date(query.dateTo);
    }

    if (query.upcoming) {
      filter.startDate = { gte: new Date() };
    }

    if (!query.includePast && !query.dateFrom && !query.dateTo) {
      filter.AND = [
        ...(filter.AND || []),
        {
          OR: [
            {
              endDate: null,
              startDate: {
                gte: new Date(),
              },
            },
            {
              endDate: {
                gte: new Date(),
              },
            },
          ],
        },
      ];
    }

    const [events, total] = await Promise.all([
      db.event.findMany({
        where: filter,
        skip,
        take,
        orderBy,
        include: eventCardInclude,
      }),
      db.event.count({ where: filter }),
    ]);

    let eventsWithBookmark = events;
    if (userId) {
      const bookmarkedIds = await db.eventBookmark.findMany({
        where: { userId, eventId: { in: events.map((e) => e.id) } },
        select: { eventId: true },
      });
      const bmSet = new Set(bookmarkedIds.map((b) => b.eventId));
      eventsWithBookmark = events.map((e) => ({
        ...e,
        isBookmarked: bmSet.has(e.id),
      }));
    }
    return {
      data: eventsWithBookmark,
      pagination: {
        total,
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 10,
        totalPages: Math.ceil(total / (Number(query.limit) || 10)),
      },
    };
  },

  getMyEvents: async (userId, query) => {
    const { skip, take , where: searchWhere} = buildQueryOptions({
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ["title", "description"],
    });

    const regFilter = { userId };
    if (query.status) regFilter.status = query.status;

    const eventFilter = {
      isArchived: false,
      ...(searchWhere || {}),
    };
    
    if (!query.includePast) {
      eventFilter.AND = [
        ...(eventFilter.AND || []),
        {
          OR: [
            {
              endDate: null,
              startDate: {
                gte: new Date(),
              },
            },
            {
              endDate: {
                gte: new Date(),
              },
            },
          ],
        },
      ];
    }
    regFilter.event = eventFilter;

    const [registrations, total] = await Promise.all([
      db.eventRegistration.findMany({
        where: regFilter,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          event: {
            include: { author: authorInclude, page: pageInclude },
          },
        },
      }),
      db.eventRegistration.count({ where: regFilter }),
    ]);

    let registrationsWithBookmark = registrations;

    if (userId) {
      const eventIds = registrations.map((r) => r.event.id);

      const bookmarkedIds = await db.eventBookmark.findMany({
        where: {
          userId,
          eventId: { in: eventIds },
        },
        select: {
          eventId: true,
        },
      });

      const bmSet = new Set(bookmarkedIds.map((b) => b.eventId));

      registrationsWithBookmark = registrations.map((registration) => ({
        ...registration,
        event: {
          ...registration.event,
          isBookmarked: bmSet.has(registration.event.id),
        },
      }));
    }

    return {
      data: registrationsWithBookmark,
      pagination: {
        total,
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 10,
        totalPages: Math.ceil(total / (Number(query.limit) || 10)),
      },
    };
  },

  getHostingEvents: async (userId, query) => {
    const { skip, take, where: searchWhere, orderBy } = buildQueryOptions({
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ["title", "description"],
      sortBy: query.sortBy || "createdAt",
      order: query.order || "desc",
    });

    let filter;

    // If a specific pageId is requested (e.g., from startup portal), only show that page's events
    if (query.pageId) {
      filter = {
        isArchived: false,
        ...(searchWhere || {}),
        pageId: query.pageId,
        ...(searchWhere || {}),
      };
    } else {
      // Default: show all events the user hosts (personal + all their pages)
      const pageMembers = await db.pageMember.findMany({
        where: { userId, role: { in: ["OWNER", "ADMIN"] } },
        select: { pageId: true },
      });
      const pageIds = pageMembers.map((m) => m.pageId);

      filter = {
        isArchived: false,
        AND: [
          {
            OR: [
              { authorId: userId },
              ...(pageIds.length > 0
                ? [{ pageId: { in: pageIds } }]
                : []),
            ],
          },
          ...(searchWhere ? [searchWhere] : []),
        ],
      };
    }

    if (query.status) filter.status = query.status;

    const [events, total] = await Promise.all([
      db.event.findMany({
        where: filter,
        skip,
        take,
        orderBy,
        include: eventCardInclude,
      }),
      db.event.count({ where: filter }),
    ]);

    let eventsWithBookmark = events;

    if (userId) {
      const bookmarkedIds = await db.eventBookmark.findMany({
        where: {
          userId,
          eventId: {
            in: events.map((e) => e.id),
          },
        },
        select: {
          eventId: true,
        },
      });

      const bmSet = new Set(bookmarkedIds.map((b) => b.eventId));

      eventsWithBookmark = events.map((event) => ({
        ...event,
        isBookmarked: bmSet.has(event.id),
      }));
    }

    return {
      data: eventsWithBookmark,
      pagination: {
        total,
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 10,
        totalPages: Math.ceil(total / (Number(query.limit) || 10)),
      },
    };
  },

  getLiveNow: async (query) => {
    const { skip, take } = buildQueryOptions({
      page: query.page,
      limit: query.limit || 10,
    });
    const filter = {
      liveStatus: "LIVE",
      isArchived: false,
      status: "PUBLISHED",
    };

    const [events, total] = await Promise.all([
      db.event.findMany({
        where: filter,
        skip,
        take,
        orderBy: { liveViewerCount: "desc" },
        include: eventCardInclude,
      }),
      db.event.count({ where: filter }),
    ]);

    return {
      data: events,
      pagination: {
        total,
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 10,
        totalPages: Math.ceil(total / (Number(query.limit) || 10)),
      },
    };
  },

  getUpcomingThisWeek: async () => {
    const now = new Date();
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    return db.event.findMany({
      where: {
        isArchived: false,
        status: "PUBLISHED",
        startDate: { gte: now, lte: weekEnd },
      },
      take: 5,
      orderBy: { startDate: "asc" },
      include: eventCardInclude,
    });
  },

  getTrendingEvents: async (query) => {
    const { skip, take } = buildQueryOptions({
      page: query.page,
      limit: query.limit || 10,
    });

    return db.event.findMany({
      where: {
        isArchived: false,
        status: "PUBLISHED",
        startDate: { gte: new Date() },
      },
      skip,
      take,
      orderBy: [
        { registrationCount: "desc" },
        { viewCount: "desc" },
        { bookmarkCount: "desc" },
      ],
      include: eventCardInclude,
    });
  },

  getPopularCategories: async () => {
    const counts = await db.event.groupBy({
      by: ["eventType"],
      where: { isArchived: false, status: "PUBLISHED" },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    return counts.map((c) => ({ category: c.eventType, count: c._count.id }));
  },

  getEventsByPage: async (pageId, query) => {
    const { skip, take, orderBy } = buildQueryOptions({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy || "startDate",
      order: query.order || "desc",
    });

    const filter = { pageId, isArchived: false, status: "PUBLISHED" };

    const [events, total] = await Promise.all([
      db.event.findMany({
        where: filter,
        skip,
        take,
        orderBy,
        include: eventCardInclude,
      }),
      db.event.count({ where: filter }),
    ]);

    return {
      data: events,
      pagination: {
        total,
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 10,
        totalPages: Math.ceil(total / (Number(query.limit) || 10)),
      },
    };
  },

  duplicateEvent: async (userId, eventId) => {
    const source = await db.event.findUnique({
      where: { id: eventId, isArchived: false },
      include: {
        speakers: true,
        sponsors: true,
        timeline: true,
        ticketTypes: true,
        media: true,
        organizers: true,
      },
    });
    if (!source) throw new ApiError(404, "Event not found");

    const hasPermission = await checkEventPermission(source, userId);
    if (!hasPermission) throw new ApiError(403, "Not authorized");

    const slug = await ensureUniqueSlug(generateSlug(source.title));

    return db.$transaction(async (tx) => {
      const newEvent = await tx.event.create({
        data: {
          title: `${source.title} (Copy)`,
          slug,
          description: source.description,
          shortDesc: source.shortDesc,
          coverImage: source.coverImage,
          eventType: source.eventType,
          format: source.format,
          status: "DRAFT",
          authorId: userId,
          pageId: source.pageId,
          startDate: source.startDate,
          endDate: source.endDate,
          timezone: source.timezone,
          venue: source.venue,
          address: source.address,
          city: source.city,
          state: source.state,
          country: source.country,
          virtualUrl: source.virtualUrl,
          capacity: source.capacity,
          isPaid: source.isPaid,
          price: source.price,
          currency: source.currency,
          tags: source.tags,
          isPublic: source.isPublic,
          requiresApproval: source.requiresApproval,
          allowWaitlist: source.allowWaitlist,
          autoConfirm: source.autoConfirm,
          contactEmail: source.contactEmail,
          contactPhone: source.contactPhone,
          websiteUrl: source.websiteUrl,
        },
      });

      await tx.eventOrganizer.create({
        data: { eventId: newEvent.id, userId, role: "host" },
      });

      for (const org of source.organizers) {
        if (org.userId === userId) continue;
        await tx.eventOrganizer.create({
          data: {
            eventId: newEvent.id,
            userId: org.userId,
            role: org.role,
          },
        });
      }

      for (const s of source.speakers) {
        await tx.eventSpeaker.create({
          data: {
            eventId: newEvent.id,
            userId: s.userId,
            name: s.name,
            title: s.title,
            company: s.company,
            bio: s.bio,
            photo: s.photo,
            topic: s.topic,
            order: s.order,
          },
        });
      }

      for (const s of source.sponsors) {
        await tx.eventSponsor.create({
          data: {
            eventId: newEvent.id,
            name: s.name,
            logo: s.logo,
            website: s.website,
            tier: s.tier,
            order: s.order,
          },
        });
      }

      for (const t of source.timeline) {
        await tx.eventTimeline.create({
          data: {
            eventId: newEvent.id,
            title: t.title,
            description: t.description,
            startTime: t.startTime,
            endTime: t.endTime,
            location: t.location,
            speakerIds: t.speakerIds,
            order: t.order,
          },
        });
      }

      for (const t of source.ticketTypes) {
        await tx.eventTicketType.create({
          data: {
            eventId: newEvent.id,
            name: t.name,
            description: t.description,
            price: t.price,
            currency: t.currency,
            quantity: t.quantity,
            quantitySold: 0,
            saleStartDate: t.saleStartDate,
            saleEndDate: t.saleEndDate,
            isActive: t.isActive,
            order: t.order,
          },
        });
      }

      for (const m of source.media) {
        await tx.eventMedia.create({
          data: {
            eventId: newEvent.id,
            url: m.url,
            mediaType: m.mediaType,
            caption: m.caption,
            order: m.order,
          },
        });
      }

      return tx.event.findUnique({
        where: { id: newEvent.id },
        include: eventDetailInclude,
      });
    });
  },

  createTicketType: async (userId, eventId, data) => {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, authorId: true, pageId: true, status: true },
    });
    if (!event) throw new ApiError(404, "Event not found");
    if (!["DRAFT", "PUBLISHED"].includes(event.status))
      throw new ApiError(400, "Cannot add tickets to this event");

    const hasPermission = await checkEventPermission(event, userId);
    if (!hasPermission) throw new ApiError(403, "Not authorized");

    return db.eventTicketType.create({
      data: {
        eventId,
        name: data.name,
        description: data.description,
        price: data.price || 0,
        currency: data.currency || "INR",
        quantity: data.quantity,
        saleStartDate: data.saleStartDate ? new Date(data.saleStartDate) : null,
        saleEndDate: data.saleEndDate ? new Date(data.saleEndDate) : null,
        isActive: data.isActive !== undefined ? data.isActive : true,
        order: data.order || 0,
      },
    });
  },

  updateTicketType: async (userId, ticketTypeId, data) => {
    const ticket = await db.eventTicketType.findUnique({
      where: { id: ticketTypeId },
      include: { event: { select: { authorId: true, pageId: true } } },
    });
    if (!ticket) throw new ApiError(404, "Ticket type not found");

    const hasPermission = await checkEventPermission(ticket.event, userId);
    if (!hasPermission) throw new ApiError(403, "Not authorized");

    if (data.quantity !== undefined && data.quantity < ticket.quantitySold) {
      throw new ApiError(400, "Cannot set quantity below already sold count");
    }

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.saleStartDate !== undefined)
      updateData.saleStartDate = data.saleStartDate
        ? new Date(data.saleStartDate)
        : null;
    if (data.saleEndDate !== undefined)
      updateData.saleEndDate = data.saleEndDate
        ? new Date(data.saleEndDate)
        : null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.order !== undefined) updateData.order = data.order;

    return db.eventTicketType.update({
      where: { id: ticketTypeId },
      data: updateData,
    });
  },

  deleteTicketType: async (userId, ticketTypeId) => {
    const ticket = await db.eventTicketType.findUnique({
      where: { id: ticketTypeId },
      include: { event: { select: { authorId: true, pageId: true } } },
    });
    if (!ticket) throw new ApiError(404, "Ticket type not found");
    if (ticket.quantitySold > 0)
      throw new ApiError(400, "Cannot delete ticket type with existing sales");

    const hasPermission = await checkEventPermission(ticket.event, userId);
    if (!hasPermission) throw new ApiError(403, "Not authorized");

    await db.eventTicketType.delete({ where: { id: ticketTypeId } });
    return { message: "Ticket type deleted" };
  },

  getAvailableTickets: async (eventId) => {
    const tickets = await db.eventTicketType.findMany({
      where: { eventId, isActive: true },
      orderBy: { order: "asc" },
    });

    const now = new Date();
    return tickets.map((t) => {
      let saleStatus = "ACTIVE";
      if (t.quantitySold >= t.quantity) saleStatus = "SOLD_OUT";
      else if (t.saleStartDate && now < new Date(t.saleStartDate))
        saleStatus = "UPCOMING";
      else if (t.saleEndDate && now > new Date(t.saleEndDate))
        saleStatus = "EXPIRED";

      return { ...t, remaining: t.quantity - t.quantitySold, saleStatus };
    });
  },
};
