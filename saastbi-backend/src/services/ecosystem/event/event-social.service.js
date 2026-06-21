import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { buildQueryOptions } from "../../../utils/queryHelper.js";
import { checkEventPermission } from "../../../utils/eventHelpers.js";
import sendMail from "../../../config/sendMail.js";
import path from "path";

export const EventSocialService = {
  bookmarkEvent: async (userId, eventId) => {
    const event = await db.event.findUnique({ where: { id: eventId, isArchived: false }, select: { id: true } });
    if (!event) throw new ApiError(404, "Event not found");

    const existing = await db.eventBookmark.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    if (existing) throw new ApiError(409, "Event already bookmarked");

    await db.$transaction([
      db.eventBookmark.create({ data: { eventId, userId } }),
      db.event.update({ where: { id: eventId }, data: { bookmarkCount: { increment: 1 } } }),
    ]);

    return { bookmarked: true };
  },

  unbookmarkEvent: async (userId, eventId) => {
    const existing = await db.eventBookmark.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    if (!existing) throw new ApiError(404, "Bookmark not found");

    await db.$transaction([
      db.eventBookmark.delete({ where: { id: existing.id } }),
      db.event.update({ where: { id: eventId }, data: { bookmarkCount: { decrement: 1 } } }),
    ]);

    return { bookmarked: false };
  },

  getSavedEvents: async (userId, query) => {
    const { skip, take, where: searchWhere, } = buildQueryOptions({ page: query.page, limit: query.limit, search: query.search,
      searchFields: [
        "title",
        "description",
      ], 
    });

    const [bookmarks, total] = await Promise.all([
      db.eventBookmark.findMany({
        where: {
          userId,
          ...(searchWhere
            ? {
                event: {
                  ...searchWhere,
                },
              }
            : {}),
        },
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          event: {
            select: {
              id: true, title: true, slug: true, coverImage: true, eventType: true,
              format: true, startDate: true, endDate: true, city: true, venue: true,
              isPaid: true, price: true, currency: true, capacity: true, registrationCount: true,
              isArchived: true,
              author: { select: { id: true, firstName: true, lastName: true, profilePhoto: true } },
              page: { select: { id: true, name: true, logo: true } },
            },
          },
        },
      }),
      db.eventBookmark.count({ where: { userId,
        ...(searchWhere ? {
              event: {
                ...searchWhere,
              },
            }
          : {}), } }),
    ]);

    let bookmarkedEvents = bookmarks;

    if (userId) {
      const eventIds = bookmarks.map((b) => b.event.id);

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

      bookmarkedEvents = bookmarks.map((bookmark) => ({
        ...bookmark,
        event: {
          ...bookmark.event,
          isBookmarked: bmSet.has(bookmark.event.id),
        },
      }));
    }

    return {
      data: bookmarkedEvents.filter((b) => !b.event.isArchived),
      pagination: {
        total,
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 10,
        totalPages: Math.ceil(total / (Number(query.limit) || 10)),
      },
    };
  },

  inviteToEvent: async (userId, eventId, data) => {
    const event = await db.event.findUnique({
      where: { id: eventId, isArchived: false },
      select: { id: true, status: true },
    });
    if (!event) throw new ApiError(404, "Event not found");
    if (event.status !== "PUBLISHED") throw new ApiError(400, "Cannot invite to unpublished event");

    const invitedUser = await db.user.findUnique({ where: { id: data.invitedUserId }, select: { id: true } });
    if (!invitedUser) throw new ApiError(404, "User not found");

    const existing = await db.eventInvitation.findUnique({
      where: { eventId_invitedUserId: { eventId, invitedUserId: data.invitedUserId } },
    });
    if (existing) throw new ApiError(409, "User already invited");

    const alreadyRegistered = await db.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId: data.invitedUserId } },
    });
    if (alreadyRegistered && alreadyRegistered.status !== "CANCELLED") {
      throw new ApiError(400, "User is already registered for this event");
    }

    const invitation = await db.eventInvitation.create({
      data: {
        eventId,
        invitedById: userId,
        invitedUserId: data.invitedUserId,
        message: data.message,
      },
      include: {
        invitedUser: { select: { id: true, firstName: true, lastName: true, profilePhoto: true, email: true } },
        event: { select: { title: true, startDate: true, format: true } },
      },
    });

    const inviter = await db.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    if (invitation.invitedUser?.email && invitation.event) {
      const startDate = new Date(invitation.event.startDate);
      sendMail(
        invitation.invitedUser.email,
        `You're invited to ${invitation.event.title}`,
        path.resolve("src/mails/event-invitation.ejs"),
        {
          userName: `${invitation.invitedUser.firstName || ""} ${invitation.invitedUser.lastName || ""}`.trim() || "there",
          inviterName: `${inviter?.firstName || ""} ${inviter?.lastName || ""}`.trim() || "Someone",
          eventTitle: invitation.event.title,
          eventDate: startDate.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }),
          eventFormat: invitation.event.format || "IN_PERSON",
          message: data.message || null,
        },
      ).catch(() => {});
    }

    return invitation;
  },

  respondToInvitation: async (userId, invitationId, response) => {
    const invitation = await db.eventInvitation.findUnique({
      where: { id: invitationId },
      include: { event: { select: { id: true, status: true } } },
    });
    if (!invitation) throw new ApiError(404, "Invitation not found");
    if (invitation.invitedUserId !== userId) throw new ApiError(403, "Not your invitation");
    if (invitation.status !== "PENDING") throw new ApiError(400, "Invitation already responded to");

    const status = response === "accept" ? "ACCEPTED" : "DECLINED";

    const updated = await db.eventInvitation.update({
      where: { id: invitationId },
      data: { status },
    });

    return updated;
  },

  getMyInvitations: async (userId, query) => {
    const { skip, take } = buildQueryOptions({ page: query.page, limit: query.limit });

    const filter = { invitedUserId: userId };
    if (query.status) filter.status = query.status;

    const [invitations, total] = await Promise.all([
      db.eventInvitation.findMany({
        where: filter,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          event: {
            select: {
              id: true, title: true, slug: true, coverImage: true, startDate: true,
              eventType: true, format: true,
            },
          },
          invitedBy: { select: { id: true, firstName: true, lastName: true, profilePhoto: true } },
        },
      }),
      db.eventInvitation.count({ where: filter }),
    ]);

    return {
      data: invitations,
      pagination: {
        total,
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 10,
        totalPages: Math.ceil(total / (Number(query.limit) || 10)),
      },
    };
  },

  submitFeedback: async (userId, eventId, data) => {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, status: true },
    });
    if (!event) throw new ApiError(404, "Event not found");
    if (event.status !== "COMPLETED") throw new ApiError(400, "Feedback can only be submitted for completed events");

    const reg = await db.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    if (!reg || !["ATTENDED", "CONFIRMED"].includes(reg.status)) {
      throw new ApiError(400, "You must have attended the event to submit feedback");
    }

    if (!data.rating || data.rating < 1 || data.rating > 5) {
      throw new ApiError(400, "Rating must be between 1 and 5");
    }

    const existing = await db.eventFeedback.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    if (existing) {
      return db.eventFeedback.update({
        where: { id: existing.id },
        data: {
          rating: data.rating,
          review: data.review,
          isPublic: data.isPublic !== undefined ? data.isPublic : true,
        },
      });
    }

    return db.eventFeedback.create({
      data: {
        eventId,
        userId,
        rating: data.rating,
        review: data.review,
        isPublic: data.isPublic !== undefined ? data.isPublic : true,
      },
    });
  },

  getEventFeedback: async (eventId, query) => {
    const { skip, take } = buildQueryOptions({ page: query.page, limit: query.limit });

    const filter = { eventId, isPublic: true };

    const [feedback, total, stats] = await Promise.all([
      db.eventFeedback.findMany({
        where: filter,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, profilePhoto: true } },
        },
      }),
      db.eventFeedback.count({ where: filter }),
      db.eventFeedback.aggregate({
        where: { eventId },
        _avg: { rating: true },
        _count: { id: true },
      }),
    ]);

    return {
      data: feedback,
      averageRating: stats._avg.rating ? Number(stats._avg.rating.toFixed(1)) : null,
      totalReviews: stats._count.id,
      pagination: {
        total,
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 10,
        totalPages: Math.ceil(total / (Number(query.limit) || 10)),
      },
    };
  },

  submitQuestion: async (userId, eventId, data) => {
    const event = await db.event.findUnique({ where: { id: eventId, isArchived: false }, select: { id: true } });
    if (!event) throw new ApiError(404, "Event not found");
    if (!data.question || data.question.trim().length === 0) throw new ApiError(400, "Question is required");

    return db.eventQuestion.create({
      data: { eventId, userId, question: data.question },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, profilePhoto: true } },
      },
    });
  },

  answerQuestion: async (userId, eventId, questionId, data) => {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, authorId: true, pageId: true },
    });
    if (!event) throw new ApiError(404, "Event not found");

    const hasPermission = await checkEventPermission(event, userId);
    if (!hasPermission) throw new ApiError(403, "Not authorized");

    const question = await db.eventQuestion.findUnique({ where: { id: questionId } });
    if (!question || question.eventId !== eventId) throw new ApiError(404, "Question not found");

    return db.eventQuestion.update({
      where: { id: questionId },
      data: { answer: data.answer, answeredById: userId, isAnswered: true },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, profilePhoto: true } },
        answeredBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  },

  upvoteQuestion: async (userId, questionId) => {
    const question = await db.eventQuestion.findUnique({ where: { id: questionId } });
    if (!question) throw new ApiError(404, "Question not found");

    return db.eventQuestion.update({
      where: { id: questionId },
      data: { upvoteCount: { increment: 1 } },
    });
  },

  pinQuestion: async (userId, eventId, questionId) => {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, authorId: true, pageId: true },
    });
    if (!event) throw new ApiError(404, "Event not found");

    const hasPermission = await checkEventPermission(event, userId);
    if (!hasPermission) throw new ApiError(403, "Not authorized");

    const question = await db.eventQuestion.findUnique({ where: { id: questionId } });
    if (!question || question.eventId !== eventId) throw new ApiError(404, "Question not found");

    return db.eventQuestion.update({
      where: { id: questionId },
      data: { isPinned: !question.isPinned },
    });
  },

  getEventQuestions: async (eventId, query) => {
    const { skip, take } = buildQueryOptions({ page: query.page, limit: query.limit });

    const orderBy = query.sortBy === "upvotes" ? { upvoteCount: "desc" } : { createdAt: "desc" };

    const [questions, total] = await Promise.all([
      db.eventQuestion.findMany({
        where: { eventId },
        skip,
        take,
        orderBy: [{ isPinned: "desc" }, orderBy],
        include: {
          user: { select: { id: true, firstName: true, lastName: true, profilePhoto: true } },
          answeredBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      db.eventQuestion.count({ where: { eventId } }),
    ]);

    return {
      data: questions,
      pagination: {
        total,
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 10,
        totalPages: Math.ceil(total / (Number(query.limit) || 10)),
      },
    };
  },
};
