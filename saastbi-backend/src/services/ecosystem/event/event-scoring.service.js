import db from "../../../db/db.js";
import { buildQueryOptions } from "../../../utils/queryHelper.js";

function calculateEngagementScore(event) {
  const raw = (event.registrationCount || 0) * 4 + (event.viewCount || 0) * 0.02 + (event.bookmarkCount || 0) * 2;
  return Math.log10(raw + 1) * 15;
}

function calculateRecencyScore(startDate) {
  const hoursUntilEvent = (new Date(startDate).getTime() - Date.now()) / (1000 * 60 * 60);

  if (hoursUntilEvent < 0) return Math.max(5 + hoursUntilEvent * 0.1, 0);
  if (hoursUntilEvent <= 24) return 50;
  if (hoursUntilEvent <= 72) return 40 - (hoursUntilEvent - 24) * 0.2;
  if (hoursUntilEvent <= 168) return 30 - (hoursUntilEvent - 72) * 0.1;
  return Math.max(20 - (hoursUntilEvent - 168) * 0.02, 2);
}

function calculateQualityScore(event, counts) {
  let score = 0;
  if (event.coverImage) score += 8;
  if (event.description && event.description.length > 200) score += 6;
  if (event.shortDesc) score += 3;
  if (event.tags && event.tags.length > 0) score += 4;
  if (counts.speakers > 0) score += 8;
  if (counts.sponsors > 0) score += 5;
  if (counts.timeline > 0) score += 6;
  if (event.venue || event.virtualUrl) score += 3;
  if (event.capacity && event.registrationCount > 0) {
    const fillRate = event.registrationCount / event.capacity;
    if (fillRate > 0.8) score += 10;
    else if (fillRate > 0.5) score += 6;
    else if (fillRate > 0.2) score += 3;
  }
  return Math.min(score, 50);
}

function calculateRelevanceScore(event, context) {
  let score = 0;

  if (context.userSkills && event.tags) {
    const skillSet = new Set(context.userSkills.map((s) => s.toLowerCase()));
    for (const tag of event.tags) {
      if (skillSet.has(tag.toLowerCase())) score += 5;
    }
  }

  if (context.userCity && event.city) {
    if (context.userCity.toLowerCase() === event.city.toLowerCase()) score += 12;
  }

  if (context.userSector && event.tags) {
    if (event.tags.some((t) => t.toLowerCase().includes(context.userSector.toLowerCase()))) score += 8;
  }

  if (context.attendedTypes && context.attendedTypes.includes(event.eventType)) {
    score += 6;
  }

  return Math.min(score, 50);
}

function calculateSocialScore(event, context) {
  let score = 0;

  if (context.connectionRegistrations) {
    const count = context.connectionRegistrations[event.id] || 0;
    score += Math.min(count * 5, 20);
  }

  if (context.followedPageIds && event.pageId) {
    if (context.followedPageIds.includes(event.pageId)) score += 15;
  }

  return Math.min(score, 35);
}

export function computeEventScore({ event, counts, context }) {
  const engagement = calculateEngagementScore(event) * 0.25;
  const recency = calculateRecencyScore(event.startDate) * 0.20;
  const quality = calculateQualityScore(event, counts) * 0.15;
  const relevance = calculateRelevanceScore(event, context) * 0.25;
  const social = calculateSocialScore(event, context) * 0.15;

  return Number((engagement + recency + quality + relevance + social).toFixed(2));
}

export const EventScoringService = {
  getRecommendedEvents: async (userId, query) => {
    const { skip, take } = buildQueryOptions({ page: query.page, limit: query.limit || 20 });
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        skills: {select: { skill: { select: { name: true } } }},
        location: { select: { city: true } },
        roles: { select: { roleType: true } },
      },
    });
 
    const attendedEvents = await db.eventRegistration.findMany({
      where: { userId, status: { in: ["CONFIRMED", "ATTENDED"] } },
      select: { event: { select: { eventType: true } } },
      take: 50,
    });
    const attendedTypes = [...new Set(attendedEvents.map((r) => r.event.eventType))];
 
    const followedPages = await db.pageFollower.findMany({
      where: { userId },
      select: { pageId: true },
    });
    const followedPageIds = followedPages.map((f) => f.pageId);
 
    const connections = await db.connection.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
        status: "ACCEPTED",
      },
      select: { senderId: true, receiverId: true },
    });
    const connectionIds = connections.map((c) => (c.senderId === userId ? c.receiverId : c.senderId));
 
    let connectionRegistrations = {};
    if (connectionIds.length > 0) {
      const connRegs = await db.eventRegistration.findMany({
        where: {
          userId: { in: connectionIds },
          status: { in: ["CONFIRMED", "ATTENDED"] },
          event: { status: "PUBLISHED", startDate: { gte: new Date() } },
        },
        select: { eventId: true },
      });
      for (const r of connRegs) {
        connectionRegistrations[r.eventId] = (connectionRegistrations[r.eventId] || 0) + 1;
      }
    }
 
    const context = {
      userSkills: user?.skills?.map((s) => s.skill?.name) || [],
      userCity: user?.location?.city || null,
      userSector: user?.roles?.[0]?.roleType || null,
      attendedTypes,
      followedPageIds,
      connectionRegistrations,
    };
 
    const events = await db.event.findMany({
      where: {
        isArchived: false,
        status: "PUBLISHED",
        startDate: { gte: new Date() },
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, profilePhoto: true,username: true, } },
        page: { select: { id: true, name: true, logo: true } },
        _count: { select: { speakers: true, sponsors: true, timeline: true, registrations: true, bookmarks: true } },
      },
      take: 100,
    });
 
    const scored = events.map((event) => ({
      ...event,
      score: computeEventScore({
        event,
        counts: { speakers: event._count.speakers, sponsors: event._count.sponsors, timeline: event._count.timeline },
        context,
      }),
    }));
 
    scored.sort((a, b) => b.score - a.score);
 
    const paginated = scored.slice(skip, skip + take);
 
    return {
      data: paginated,
      pagination: {
        total: scored.length,
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 20,
        totalPages: Math.ceil(scored.length / (Number(query.limit) || 20)),
      },
    };
  },  
};
