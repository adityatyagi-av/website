import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { PeopleService } from "./people.service.js";
import { CofounderService } from "./cofounder.service.js";
import { IncubatorService } from "./incubator.service.js";
import { StartupService } from "./startup.service.js";
import { NetworkingPageService } from "./page.service.js";
import { SuggestionService } from "./suggestion.service.js";

const TAB_HANDLERS = {
  people: (userId, query) => PeopleService.discoverPeople(userId, query),
  cofounder: (userId, query) => CofounderService.getCofounderMatches(userId, query),
  incubator: (userId, query) => IncubatorService.discoverIncubators(userId, query),
  "incubator-programs": (userId, query) => IncubatorService.discoverIncubatorPrograms(userId, query),
  startups: (userId, query) => StartupService.discoverStartups(userId, query),
  pages: (userId, query) => NetworkingPageService.discoverPages(userId, query),
};

export const DiscoverService = {
  discover: async (userId, query) => {
    const { tab } = query;

    if (tab && TAB_HANDLERS[tab]) {
      return TAB_HANDLERS[tab](userId, query);
    }

    const previewLimit = { ...query, limit: 5, page: 1 };

    const [people, cofounders, incubators, programs, startups, pages] =
      await Promise.allSettled([
        PeopleService.discoverPeople(userId, previewLimit),
        userId ? CofounderService.getCofounderMatches(userId, previewLimit) : { data: [], pagination: { total: 0 } },
        IncubatorService.discoverIncubators(userId, previewLimit),
        IncubatorService.discoverIncubatorPrograms(userId, previewLimit),
        StartupService.discoverStartups(userId, previewLimit),
        NetworkingPageService.discoverPages(userId, previewLimit),
      ]);

    return {
      people: people.status === "fulfilled" ? people.value : { data: [], pagination: { total: 0 } },
      cofounders: cofounders.status === "fulfilled" ? cofounders.value : { data: [], pagination: { total: 0 } },
      incubators: incubators.status === "fulfilled" ? incubators.value : { data: [], pagination: { total: 0 } },
      programs: programs.status === "fulfilled" ? programs.value : { data: [], pagination: { total: 0 } },
      startups: startups.status === "fulfilled" ? startups.value : { data: [], pagination: { total: 0 } },
      pages: pages.status === "fulfilled" ? pages.value : { data: [], pagination: { total: 0 } },
    };
  },

  globalSearch: async (userId, query) => {
    const { search } = query;
    if (!search || search.trim().length < 2) {
      throw new ApiError(400, "Search query must be at least 2 characters");
    }

    const searchQuery = { ...query, limit: 5, page: 1 };

    const [people, startups, incubators, pages] = await Promise.allSettled([
      PeopleService.discoverPeople(userId, searchQuery),
      StartupService.discoverStartups(userId, searchQuery),
      IncubatorService.discoverIncubators(userId, searchQuery),
      NetworkingPageService.discoverPages(userId, searchQuery),
    ]);

    return {
      people: people.status === "fulfilled" ? people.value : { data: [], pagination: { total: 0 } },
      startups: startups.status === "fulfilled" ? startups.value : { data: [], pagination: { total: 0 } },
      incubators: incubators.status === "fulfilled" ? incubators.value : { data: [], pagination: { total: 0 } },
      pages: pages.status === "fulfilled" ? pages.value : { data: [], pagination: { total: 0 } },
    };
  },

  saveProfile: async (userId, matchType, targetId) => {
    const validTypes = ["COFOUNDER", "MENTOR", "USER", "STARTUP", "INCUBATOR", "PAGE"];
    if (!validTypes.includes(matchType)) {
      throw new ApiError(400, "Invalid match type");
    }

    await db.networkingMatch.upsert({
      where: {
        userId_targetUserId_matchType: {
          userId,
          targetUserId: targetId,
          matchType,
        },
      },
      create: {
        userId,
        targetUserId: targetId,
        matchType,
        isSaved: true,
        updatedAt: new Date(),
      },
      update: {
        isSaved: true,
        updatedAt: new Date(),
      },
    });

    return { saved: true };
  },

  unsaveProfile: async (userId, matchType, targetId) => {
    await db.networkingMatch.updateMany({
      where: { userId, targetUserId: targetId, matchType },
      data: { isSaved: false, updatedAt: new Date() },
    });

    return { saved: false };
  },

  dismissProfile: async (userId, matchType, targetId) => {
    await db.networkingMatch.upsert({
      where: {
        userId_targetUserId_matchType: {
          userId,
          targetUserId: targetId,
          matchType,
        },
      },
      create: {
        userId,
        targetUserId: targetId,
        matchType,
        isDismissed: true,
        updatedAt: new Date(),
      },
      update: {
        isDismissed: true,
        updatedAt: new Date(),
      },
    });

    return { dismissed: true };
  },

  getSavedProfiles: async (userId, query) => {
    const { matchType, page = 1, limit = 12 } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { userId, isSaved: true };
    if (matchType) {
      where.matchType = matchType;
    }

    const [matches, total] = await Promise.all([
      db.networkingMatch.findMany({
        where,
        include: {
          target: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
              headline: true,
              roles: { select: { roleType: true, isVerified: true } },
              location: { select: { city: true, country: true } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take,
      }),
      db.networkingMatch.count({ where }),
    ]);

    return {
      data: matches,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    };
  },
};
