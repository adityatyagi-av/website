import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { buildQueryOptions } from "../../../utils/queryHelper.js";
import { getEventWithAuth } from "../../../utils/eventHelpers.js";

export const EventManagementService = {
  addOrganizer: async (userId, eventId, data) => {
    await getEventWithAuth(eventId, userId);

    const user = await db.user.findUnique({
      where: { id: data.userId },
      select: { id: true },
    });
    if (!user) throw new ApiError(404, "User not found");

    const existing = await db.eventOrganizer.findUnique({
      where: { eventId_userId: { eventId, userId: data.userId } },
    });
    if (existing) throw new ApiError(409, "User is already an organizer");

    return db.eventOrganizer.create({
      data: { eventId, userId: data.userId, role: data.role || "organizer" },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
            username: true,
          },
        },
      },
    });
  },

  removeOrganizer: async (userId, eventId, organizerId) => {
    await getEventWithAuth(eventId, userId);

    const organizer = await db.eventOrganizer.findUnique({
      where: { id: organizerId },
    });
    if (!organizer || organizer.eventId !== eventId)
      throw new ApiError(404, "Organizer not found");
    if (organizer.role === "host")
      throw new ApiError(400, "Cannot remove the host organizer");

    await db.eventOrganizer.delete({ where: { id: organizerId } });
    return { message: "Organizer removed" };
  },

  updateOrganizer: async (userId, eventId, organizerId, data) => {
    await getEventWithAuth(eventId, userId);

    const organizer = await db.eventOrganizer.findUnique({
      where: { id: organizerId },
    });
    if (!organizer || organizer.eventId !== eventId)
      throw new ApiError(404, "Organizer not found");

    return db.eventOrganizer.update({
      where: { id: organizerId },
      data: { role: data.role },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
      },
    });
  },

  addSpeaker: async (userId, eventId, data) => {
    await getEventWithAuth(eventId, userId);

    return db.eventSpeaker.create({
      data: {
        eventId,
        userId: data.userId || null,
        name: data.name,
        title: data.title,
        company: data.company,
        bio: data.bio,
        photo: data.photo,
        topic: data.topic,
        order: data.order || 0,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
      },
    });
  },

  updateSpeaker: async (userId, eventId, speakerId, data) => {
    await getEventWithAuth(eventId, userId);

    const speaker = await db.eventSpeaker.findUnique({
      where: { id: speakerId },
    });
    if (!speaker || speaker.eventId !== eventId)
      throw new ApiError(404, "Speaker not found");

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.company !== undefined) updateData.company = data.company;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.photo !== undefined) updateData.photo = data.photo;
    if (data.topic !== undefined) updateData.topic = data.topic;
    if (data.order !== undefined) updateData.order = data.order;

    return db.eventSpeaker.update({
      where: { id: speakerId },
      data: updateData,
    });
  },

  removeSpeaker: async (userId, eventId, speakerId) => {
    await getEventWithAuth(eventId, userId);

    const speaker = await db.eventSpeaker.findUnique({
      where: { id: speakerId },
    });
    if (!speaker || speaker.eventId !== eventId)
      throw new ApiError(404, "Speaker not found");

    await db.eventSpeaker.delete({ where: { id: speakerId } });
    return { message: "Speaker removed" };
  },

  addSponsor: async (userId, eventId, data) => {
    await getEventWithAuth(eventId, userId);

    return db.eventSponsor.create({
      data: {
        eventId,
        name: data.name,
        logo: data.logo,
        website: data.website,
        tier: data.tier || "SILVER",
        order: data.order || 0,
      },
    });
  },

  updateSponsor: async (userId, eventId, sponsorId, data) => {
    await getEventWithAuth(eventId, userId);

    const sponsor = await db.eventSponsor.findUnique({
      where: { id: sponsorId },
    });
    if (!sponsor || sponsor.eventId !== eventId)
      throw new ApiError(404, "Sponsor not found");

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.logo !== undefined) updateData.logo = data.logo;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.tier !== undefined) updateData.tier = data.tier;
    if (data.order !== undefined) updateData.order = data.order;

    return db.eventSponsor.update({
      where: { id: sponsorId },
      data: updateData,
    });
  },

  removeSponsor: async (userId, eventId, sponsorId) => {
    await getEventWithAuth(eventId, userId);

    const sponsor = await db.eventSponsor.findUnique({
      where: { id: sponsorId },
    });
    if (!sponsor || sponsor.eventId !== eventId)
      throw new ApiError(404, "Sponsor not found");

    await db.eventSponsor.delete({ where: { id: sponsorId } });
    return { message: "Sponsor removed" };
  },

  addTimelineItem: async (userId, eventId, data) => {
    await getEventWithAuth(eventId, userId);

    return db.eventTimeline.create({
      data: {
        eventId,
        title: data.title,
        description: data.description,
        startTime: new Date(data.startTime),
        endTime: data.endTime ? new Date(data.endTime) : null,
        location: data.location,
        speakerIds: data.speakerIds || [],
        order: data.order || 0,
      },
    });
  },

  updateTimelineItem: async (userId, eventId, timelineId, data) => {
    await getEventWithAuth(eventId, userId);

    const item = await db.eventTimeline.findUnique({
      where: { id: timelineId },
    });
    if (!item || item.eventId !== eventId)
      throw new ApiError(404, "Timeline item not found");

    const updateData = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.startTime !== undefined)
      updateData.startTime = new Date(data.startTime);
    if (data.endTime !== undefined)
      updateData.endTime = data.endTime ? new Date(data.endTime) : null;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.speakerIds !== undefined) updateData.speakerIds = data.speakerIds;
    if (data.order !== undefined) updateData.order = data.order;

    return db.eventTimeline.update({
      where: { id: timelineId },
      data: updateData,
    });
  },

  removeTimelineItem: async (userId, eventId, timelineId) => {
    await getEventWithAuth(eventId, userId);

    const item = await db.eventTimeline.findUnique({
      where: { id: timelineId },
    });
    if (!item || item.eventId !== eventId)
      throw new ApiError(404, "Timeline item not found");

    await db.eventTimeline.delete({ where: { id: timelineId } });
    return { message: "Timeline item removed" };
  },

  addMedia: async (userId, eventId, data) => {
    await getEventWithAuth(eventId, userId);

    return db.eventMedia.create({
      data: {
        eventId,
        url: data.url,
        mediaType: data.mediaType || "IMAGE",
        caption: data.caption,
        order: data.order || 0,
      },
    });
  },

  removeMedia: async (userId, eventId, mediaId) => {
    await getEventWithAuth(eventId, userId);

    const media = await db.eventMedia.findUnique({ where: { id: mediaId } });
    if (!media || media.eventId !== eventId)
      throw new ApiError(404, "Media not found");

    await db.eventMedia.delete({ where: { id: mediaId } });
    return { message: "Media removed" };
  },

  sendEventUpdate: async (userId, eventId, data) => {
    const update = await db.eventUpdate.create({
      data: {
        eventId,
        title: data.title,
        content: data.content,
        notifyRegistrants:
          data.notifyRegistrants !== undefined ? data.notifyRegistrants : true,
      },
    });

    if (data.notifyRegistrants !== false) {
      const registrants = await db.eventRegistration.findMany({
        where: { eventId, status: { in: ["CONFIRMED", "REGISTERED"] } },
        select: {
          user: { select: { id: true, email: true, firstName: true } },
        },
      });

      const event = await db.event.findUnique({
        where: { id: eventId },
        select: { title: true, slug: true },
      });

      if (registrants.length > 0) {
        const { NotificationService } = await import("../../common/notification.service.js");
        NotificationService.sendBulk({
          recipientIds: registrants.map((r) => r.user.id),
          type: "EVENT_UPDATE",
          category: "EVENT",
          title: data.title,
          message: `Update for "${event?.title}": ${data.content.substring(0, 100)}`,
          actionUrl: `/events/${event?.slug || eventId}`,
          entityType: "Event",
          entityId: eventId,
        }).catch(() => {});

        const sendMail = (await import("../../../config/sendMail.js")).default;
        const path = await import("path");
        for (const reg of registrants) {
          sendMail(
            reg.user.email,
            `Event Update: ${data.title}`,
            path.resolve("src/mails/event-update.ejs"),
            {
              userName: reg.user.firstName || "Attendee",
              eventTitle: event?.title,
              updateTitle: data.title,
              updateContent: data.content,
              eventUrl: `/events/${event?.slug || eventId}`,
            },
          ).catch(() => {});
        }
      }
    }

    return update;
  },

  getEventUpdates: async (eventId, query) => {
    const { skip, take } = buildQueryOptions({
      page: query.page,
      limit: query.limit,
    });

    const [updates, total] = await Promise.all([
      db.eventUpdate.findMany({
        where: { eventId },
        skip,
        take,
        orderBy: { sentAt: "desc" },
      }),
      db.eventUpdate.count({ where: { eventId } }),
    ]);

    return {
      data: updates,
      pagination: {
        total,
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 10,
        totalPages: Math.ceil(total / (Number(query.limit) || 10)),
      },
    };
  },

  getEventAnalytics: async (userId, eventId) => {
    await getEventWithAuth(eventId, userId);

    const event = await db.event.findUnique({
      where: { slug: eventId },
      select: {
        viewCount: true,
        registrationCount: true,
        bookmarkCount: true,
        capacity: true,
        isPaid: true,
      },
    });

    const statusCounts = await db.eventRegistration.groupBy({
      by: ["status"],
      where: { eventId },
      _count: { id: true },
    });

    const ticketBreakdown = await db.eventRegistration.groupBy({
      by: ["ticketName"],
      where: { eventId, ticketName: { not: null } },
      _count: { id: true },
    });

    let revenue = null;
    if (event.isPaid) {
      const payments = await db.eventPayment.aggregate({
        where: { eventId, status: "COMPLETED" },
        _sum: { amount: true },
        _count: { id: true },
      });
      const refunds = await db.eventPayment.aggregate({
        where: { eventId, status: "REFUNDED" },
        _sum: { refundAmount: true },
      });
      revenue = {
        totalRevenue: payments._sum.amount || 0,
        totalPayments: payments._count.id,
        totalRefunded: refunds._sum.refundAmount || 0,
        netRevenue:
          (payments._sum.amount || 0) - (refunds._sum.refundAmount || 0),
      };
    }

    const feedbackStats = await db.eventFeedback.aggregate({
      where: { eventId },
      _avg: { rating: true },
      _count: { id: true },
    });

    const dailyRegistrations = await db.eventRegistration.groupBy({
      by: ["createdAt"],
      where: { eventId },
      _count: { id: true },
      orderBy: { createdAt: "asc" },
    });

    return {
      views: event.viewCount,
      registrations: event.registrationCount,
      bookmarks: event.bookmarkCount,
      capacity: event.capacity,
      conversionRate:
        event.viewCount > 0
          ? ((event.registrationCount / event.viewCount) * 100).toFixed(2)
          : 0,
      statusBreakdown: Object.fromEntries(
        statusCounts.map((s) => [s.status, s._count.id]),
      ),
      ticketBreakdown: ticketBreakdown.map((t) => ({
        ticket: t.ticketName,
        count: t._count.id,
      })),
      revenue,
      feedback: {
        averageRating: feedbackStats._avg.rating
          ? Number(feedbackStats._avg.rating.toFixed(1))
          : null,
        totalReviews: feedbackStats._count.id,
      },
      dailyRegistrations: dailyRegistrations.map((d) => ({
        date: d.createdAt,
        count: d._count.id,
      })),
    };
  },
};
