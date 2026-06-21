import db from "../../../db/db.js";
import {
  PAGE_BRIEF_SELECT,
  buildPagination,
  getUserSocialGraph,
} from "./helpers.js";
import { ScoringService } from "./scoring.service.js";

const buildStartupInclude = () => ({
  startup: {
    select: {
      id: true,
      name: true,
      description: true,
      sector: true,
      stage: true,
      foundedYear: true,
      headquarters: true,
      website: true,
      members: {
        where: { isActive: true },
        select: {
          userId: true,
          role: true,
          user: {
            select: { id: true, firstName: true, lastName: true, profilePhoto: true },
          },
        },
        take: 5,
      },
      _count: { select: { members: true, fundingRounds: true } },
    },
  },
  _count: { select: { followers: true, members: true, posts: true, jobs: true } },
});

export const StartupService = {
  discoverStartups: async (userId, query) => {
    const {
      search,
      sector,
      stage,
      location,
      isHiring,
      sortBy = "relevance",
      page = 1,
      limit = 12,
    } = query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {
      type: "STARTUP",
      isActive: true,
      visibility: "PUBLIC",
    };

    if (userId) {
      where.AND = [
        { creatorId: { not: userId } },
        { members: { none: { userId } } },
      ];
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { tagline: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { sector: { contains: search, mode: "insensitive" } },
      ];
    }

    if (sector) {
      where.sector = { contains: sector, mode: "insensitive" };
    }

    if (stage) {
      where.stage = { contains: stage, mode: "insensitive" };
    }

    if (location) {
      where.headquarters = { contains: location, mode: "insensitive" };
    }

    if (isHiring === "true") {
      where.isHiring = true;
    }

    let orderBy = { followerCount: "desc" };
    if (sortBy === "recent") {
      orderBy = { createdAt: "desc" };
    } else if (sortBy === "name") {
      orderBy = { name: "asc" };
    }

    const fetchLimit = userId && sortBy === "relevance" ? take * 3 : take;

    const [startups, total] = await Promise.all([
      db.page.findMany({
        where,
        select: {
          ...PAGE_BRIEF_SELECT,
          description: true,
          mission: true,
          elevatorPitch: true,
          targetMarket: true,
          ...buildStartupInclude(),
        },
        orderBy,
        skip: sortBy === "relevance" && userId ? 0 : skip,
        take: sortBy === "relevance" && userId ? fetchLimit : take,
      }),
      db.page.count({ where }),
    ]);

    let results = startups;

    if (userId && sortBy === "relevance") {
      const viewer = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          location: { select: { city: true, state: true, country: true } },
          skills: { select: { skill: { select: { name: true, category: true } } } },
          cofounderPreference: { select: { sectors: true } },
        },
      });

      const socialGraph = await getUserSocialGraph(userId);

      const scored = startups.map((s) => {
        const memberIds = s.startup?.members?.map((m) => m.userId) || [];
        const mutualMemberCount = memberIds.filter(
          (id) => socialGraph.connectedIds.includes(id)
        ).length;

        const { score, reasons } = ScoringService.computeStartupRelevanceScore(viewer, {
          ...s,
          _mutualMemberCount: mutualMemberCount,
        });
        return { ...s, _matchScore: score, _matchReasons: reasons, _mutualMemberCount: mutualMemberCount };
      });

      scored.sort((a, b) => b._matchScore - a._matchScore);
      results = scored.slice(skip, skip + take);
    }

    const enriched = await Promise.all(
      results.map(async (s) => {
        let isFollowing = false;
        if (userId) {
          const follow = await db.pageFollower.findUnique({
            where: { pageId_userId: { pageId: s.id, userId } },
          });
          isFollowing = !!follow;
        }

        const tags = [];
        if (s.isHiring) tags.push("Hiring");
        if (s.stage) tags.push(s.stage);
        if (s.verificationStatus === "VERIFIED") tags.push("Verified");

        return {
          ...s,
          matchScore: s._matchScore || null,
          matchReasons: s._matchReasons || [],
          tags,
          viewerContext: { isFollowing },
        };
      })
    );

    return {
      data: enriched,
      pagination: buildPagination(page, limit, total),
    };
  },

  getStartupDetail: async (userId, pageId) => {
    const startup = await db.page.findUnique({
      where: { id: pageId, type: "STARTUP", isActive: true },
      select: {
        ...PAGE_BRIEF_SELECT,
        description: true,
        mission: true,
        vision: true,
        elevatorPitch: true,
        targetMarket: true,
        website: true,
        linkedin: true,
        twitter: true,
        email: true,
        creatorId: true,
        createdAt: true,
        ...buildStartupInclude(),
        jobs: {
          where: { status: "OPEN" },
          select: { id: true, title: true, jobType: true, location: true, createdAt: true },
          take: 5,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!startup) return null;

    let isFollowing = false;
    let isMember = false;
    if (userId) {
      const [follow, member] = await Promise.all([
        db.pageFollower.findUnique({
          where: { pageId_userId: { pageId, userId } },
        }),
        db.pageMember.findUnique({
          where: { pageId_userId: { pageId, userId } },
        }),
      ]);
      isFollowing = !!follow;
      isMember = !!member;
    }

    return {
      ...startup,
      viewerContext: { isFollowing, isMember },
    };
  },
};
