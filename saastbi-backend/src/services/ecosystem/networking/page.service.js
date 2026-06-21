import db from "../../../db/db.js";
import { PAGE_BRIEF_SELECT, buildPagination } from "./helpers.js";

export const NetworkingPageService = {
  discoverPages: async (userId, query) => {
    const {
      search,
      type,
      sector,
      location,
      isHiring,
      verifiedOnly,
      sortBy = "popular",
      page = 1,
      limit = 12,
    } = query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {
      isActive: true,
      visibility: "PUBLIC",
    };

    if (userId) {
      where.AND = [
        { creatorId: { not: userId } },
        { members: { none: { userId } } },
      ];
    }

    if (type) {
      const types = Array.isArray(type) ? type : [type];
      where.type = { in: types };
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

    if (location) {
      where.headquarters = { contains: location, mode: "insensitive" };
    }

    if (isHiring === "true") {
      where.isHiring = true;
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

    const [pages, total] = await Promise.all([
      db.page.findMany({
        where,
        select: {
          ...PAGE_BRIEF_SELECT,
          description: true,
          _count: { select: { followers: true, members: true, posts: true, jobs: true } },
        },
        orderBy,
        skip,
        take,
      }),
      db.page.count({ where }),
    ]);

    const enriched = await Promise.all(
      pages.map(async (p) => {
        let isFollowing = false;
        if (userId) {
          const follow = await db.pageFollower.findUnique({
            where: { pageId_userId: { pageId: p.id, userId } },
          });
          isFollowing = !!follow;
        }

        const tags = [];
        if (p.isHiring) tags.push("Hiring");
        if (p.verificationStatus === "VERIFIED") tags.push("Verified");

        return {
          ...p,
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
};
