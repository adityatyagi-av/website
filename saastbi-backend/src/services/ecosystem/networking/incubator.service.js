import db from "../../../db/db.js";
import {
  PAGE_BRIEF_SELECT,
  buildPagination,
  getMutualConnectionCount,
} from "./helpers.js";
import { ScoringService } from "./scoring.service.js";

const buildIncubatorInclude = () => ({
  _count: {
    select: { followers: true, members: true, posts: true },
  },
  tenant: {
    select: {
      id: true,
      organizationName: true,
      status: true,
      _count: { select: { programs: true, startupAssociations: true } },
    },
  },
  members: {
    select: {
      userId: true,
      role: true,
      user: {
        select: { id: true, firstName: true, lastName: true, profilePhoto: true },
      },
    },
    take: 5,
  },
});

export const IncubatorService = {
  discoverIncubators: async (userId, query) => {
    const {
      search,
      sector,
      location,
      verifiedOnly,
      sortBy = "relevance",
      page = 1,
      limit = 12,
    } = query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {
      type: "INCUBATION",
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
      ];
    }

    if (sector) {
      where.OR = [
        ...(where.OR || []),
        { sector: { contains: sector, mode: "insensitive" } },
        { focusSectors: { has: sector } },
      ];
    }

    if (location) {
      where.headquarters = { contains: location, mode: "insensitive" };
    }

    if (verifiedOnly === "true") {
      where.verificationStatus = "VERIFIED";
    }

    let orderBy = { followerCount: "desc" };
    if (sortBy === "recent") {
      orderBy = { createdAt: "desc" };
    } else if (sortBy === "name") {
      orderBy = { name: "asc" };
    }

    const fetchLimit = userId && sortBy === "relevance" ? take * 3 : take;

    const [incubators, total] = await Promise.all([
      db.page.findMany({
        where,
        select: { ...PAGE_BRIEF_SELECT, description: true, focusSectors: true, ...buildIncubatorInclude() },
        orderBy,
        skip: sortBy === "relevance" && userId ? 0 : skip,
        take: sortBy === "relevance" && userId ? fetchLimit : take,
      }),
      db.page.count({ where }),
    ]);

    let results = incubators;

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

      const scored = incubators.map((inc) => {
        const { score, reasons } = ScoringService.computeIncubatorRelevanceScore(viewer, inc);
        return { ...inc, _matchScore: score, _matchReasons: reasons };
      });

      scored.sort((a, b) => b._matchScore - a._matchScore);
      results = scored.slice(skip, skip + take);
    }

    const enriched = await Promise.all(
      results.map(async (inc) => {
        let isFollowing = false;
        if (userId) {
          const follow = await db.pageFollower.findUnique({
            where: { pageId_userId: { pageId: inc.id, userId } },
          });
          isFollowing = !!follow;
        }

        return {
          ...inc,
          matchScore: inc._matchScore || null,
          matchReasons: inc._matchReasons || [],
          programCount: inc.tenant?._count?.programs || 0,
          startupCount: inc.tenant?._count?.startupAssociations || 0,
          viewerContext: { isFollowing },
        };
      })
    );

    return {
      data: enriched,
      pagination: buildPagination(page, limit, total),
    };
  },

  getIncubatorDetail: async (userId, pageId) => {
    const incubator = await db.page.findUnique({
      where: { id: pageId, type: "INCUBATION", isActive: true },
      select: {
        ...PAGE_BRIEF_SELECT,
        description: true,
        mission: true,
        vision: true,
        website: true,
        linkedin: true,
        twitter: true,
        email: true,
        phone: true,
        focusSectors: true,
        creatorId: true,
        createdAt: true,
        ...buildIncubatorInclude(),
      },
    });

    if (!incubator) return null;

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

    const programs = incubator.tenant
      ? await db.program.findMany({
          where: { tenantId: incubator.tenant.id },
          select: {
            id: true,
            title: true,
            description: true,
            coverImage: true,
            schemeType: true,
            schemeTypeRef: { select: { id: true, name: true } },
            governingBody: { select: { id: true, name: true } },
            objective: true,
          },
          take: 10,
        })
      : [];

    return {
      ...incubator,
      programs,
      viewerContext: { isFollowing, isMember },
    };
  },

  discoverIncubatorPrograms: async (userId, query) => {
    const {
      search,
      schemeType,
      sector,
      sortBy = "recent",
      page = 1,
      limit = 12,
    } = query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {
      tenant: {
        status: { in: ["ACTIVE", "INACTIVE"] },
        page: { isActive: true, visibility: "PUBLIC" },
      },
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { objective: { contains: search, mode: "insensitive" } },
      ];
    }

    if (schemeType) {
      where.OR = [
        ...(where.OR || []),
        { schemeType: { contains: schemeType, mode: "insensitive" } },
        { schemeTypeRef: { name: { contains: schemeType, mode: "insensitive" } } },
      ];
    }

    if (sector) {
      where.tenant = {
        ...where.tenant,
        page: {
          ...where.tenant.page,
          OR: [
            { sector: { contains: sector, mode: "insensitive" } },
            { focusSectors: { has: sector } },
          ],
        },
      };
    }

    let orderBy = { createdAt: "desc" };
    if (sortBy === "name") {
      orderBy = { title: "asc" };
    }

    const [programs, total] = await Promise.all([
      db.program.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          coverImage: true,
          programLogo: true,
          governingBody: { select: { id: true, name: true } },
          objective: true,
          benefits: true,
          eligibilityCriteria: true,
          createdAt: true,
          schemeTypeRef:{
            select:{
              id:true,
              name:true
            }
          },
          tenant: {
            select: {
              id: true,
              organizationName: true,
              tenantLogo: true,
              page: {
                select: { id: true, name: true, slug: true, logo: true, sector: true, headquarters: true },
              },
            },
          },
          _count: { select: { startupApplications: true, startupAssociations: true } },
        },
        orderBy,
        skip,
        take,
      }),
      db.program.count({ where }),
    ]);

    return {
      data: programs,
      pagination: buildPagination(page, limit, total),
    };
  },

  getProgramDetail: async (userId, programId) => {
    const program = await db.program.findUnique({
      where: { id: programId },
      select: {
        id: true,
        title: true,
        description: true,
        coverImage: true,
        programLogo: true,
        schemeTypeRef: { select: { id: true, name: true,programs:true } },
        governingBody: { select: { id: true, name: true } },
        objective: true,
        benefits: true,
        guidelines: true,
        eligibilityCriteria: true,
        nonEligibilityCriteria: true,
        expectedOutcome: true,
        externalLink: true,
        createdAt: true,
        tenant: {
          select: {
            id: true,
            organizationName: true,
            tenantLogo: true,
            page: {
              select: {
                id: true, name: true, slug: true, logo: true,
                sector: true, headquarters: true, website: true,
              },
            },
          },
        },
        programManagers:{
          select:{
            id:true,
            manager:{
              select:{
                name:true,
                email:true,
                imageUrl:true,
                user:{
                  select:{
                    username:true
                  }
                }
              }
            },
          }
        },
        isFundingAvailable:true,

      },
    });

    return program;
  },
};
