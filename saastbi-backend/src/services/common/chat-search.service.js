import db from "../../db/db.js";
import { deduplicateLinkedEntities, deduplicateByRealUser } from "../../utils/chat/deduplication.js";

const PROXIMITY = {
  CONNECTED: 5,
  FOLLOWING: 4,
  FOLLOWER: 3,
  MUTUAL: 2,
  HAS_CONVERSATION: 1,
  OTHER: 0,
};

export const ChatSearchService = {
  searchForUser: async (userId, query) => {
    const { q = "", type = "USER", page = 1, limit = 20 } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const searchTerm = q.trim().toLowerCase();

    switch (type) {
      case "USER":
        return searchUsers(userId, searchTerm, skip, parseInt(limit));
      case "PAGE":
        return searchPages(userId, searchTerm, skip, parseInt(limit));
      case "STARTUP":
        return searchStartups(userId, searchTerm, skip, parseInt(limit));
      case "INCUBATION":
        return searchTenants(userId, searchTerm, skip, parseInt(limit));
      default:
        return searchUsers(userId, searchTerm, skip, parseInt(limit));
    }
  },

  searchForStartup: async (userId, startupId, query) => {
    const { q = "", filter, page = 1, limit = 20 } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const searchTerm = q.trim().toLowerCase();

    const existingConvs = await db.conversation.findMany({
      where: {
        OR: [
          { participant1Type: "STARTUP", participant1Id: startupId },
          { participant2Type: "STARTUP", participant2Id: startupId },
        ],
      },
      select: {
        participant1Id: true,
        participant1Type: true,
        participant2Id: true,
        participant2Type: true,
      },
    });

    const contactedIds = new Set();
    existingConvs.forEach((c) => {
      if (c.participant1Id !== startupId) contactedIds.add(c.participant1Id);
      if (c.participant2Id !== startupId) contactedIds.add(c.participant2Id);
    });

    const applications = await db.startupApplication.findMany({
      where: { startupId },
      select: { tenantId: true },
    });
    const appliedTenantIds = new Set(applications.map((a) => a.tenantId));

    const results = [];

    if (!filter || filter === "TENANT") {
      const tenants = await db.tenant.findMany({
        where: searchTerm
          ? { organizationName: { contains: searchTerm, mode: "insensitive" } }
          : {},
        select: { id: true, organizationName: true, tenantLogo: true, pageId: true, page: { select: { name: true, logo: true } } },
        take: parseInt(limit),
      });

      tenants.forEach((t) => {
        let score = PROXIMITY.OTHER;
        let label = "Tenant";
        if (appliedTenantIds.has(t.id)) {
          score = PROXIMITY.CONNECTED;
          label = "Applied";
        } else if (contactedIds.has(t.id)) {
          score = PROXIMITY.HAS_CONVERSATION;
          label = "Previously contacted";
        }
        results.push({
          id: t.id,
          type: "TENANT",
          name: t.page?.name || t.organizationName,
          avatar: t.page?.logo || t.tenantLogo,
          proximityScore: score,
          proximityLabel: label,
          canMessage: true,
        });
      });
    }

    if (!filter || filter === "PAGE") {
      const pages = await db.page.findMany({
        where: {
          ...(searchTerm ? { name: { contains: searchTerm, mode: "insensitive" } } : {}),
          visibility: "PUBLIC",
          isActive: true,
        },
        select: { id: true, name: true, logo: true, type: true },
        take: parseInt(limit),
      });

      pages.forEach((p) => {
        const score = contactedIds.has(p.id) ? PROXIMITY.HAS_CONVERSATION : PROXIMITY.OTHER;
        results.push({
          id: p.id,
          type: "PAGE",
          name: p.name,
          avatar: p.logo,
          pageType: p.type,
          proximityScore: score,
          proximityLabel: contactedIds.has(p.id) ? "Previously contacted" : "Page",
          canMessage: true,
        });
      });
    }

    if (!filter || filter === "STARTUP") {
      const startups = await db.startup.findMany({
        where: {
          ...(searchTerm ? { name: { contains: searchTerm, mode: "insensitive" } } : {}),
          id: { not: startupId },
        },
        select: { id: true, name: true, logoUrl: true, pageId: true, page: { select: { name: true, logo: true } } },
        take: parseInt(limit),
      });

      startups.forEach((s) => {
        const score = contactedIds.has(s.id) ? PROXIMITY.HAS_CONVERSATION : PROXIMITY.OTHER;
        results.push({
          id: s.id,
          type: "STARTUP",
          name: s.page?.name || s.name,
          avatar: s.page?.logo || s.logoUrl,
          proximityScore: score,
          proximityLabel: contactedIds.has(s.id) ? "Previously contacted" : "Startup",
          canMessage: true,
        });
      });
    }

    if (!filter || filter === "MENTOR") {
      const mentors = await db.mentorProfile.findMany({
        where: {
          profileVisibility: "PUBLIC",
          ...(searchTerm
            ? {
                user: {
                  OR: [
                    { firstName: { contains: searchTerm, mode: "insensitive" } },
                    { lastName: { contains: searchTerm, mode: "insensitive" } },
                  ],
                },
              }
            : {}),
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, profilePhoto: true } },
        },
        take: parseInt(limit),
      });

      mentors.forEach((m) => {
        results.push({
          id: m.user.id,
          type: "USER",
          name: `${m.user.firstName} ${m.user.lastName}`.trim(),
          avatar: m.user.profilePhoto,
          proximityScore: PROXIMITY.OTHER,
          proximityLabel: "Mentor",
          canMessage: true,
          isMentor: true,
          mentorProfileId: m.id,
        });
      });
    }

    let deduplicated = await deduplicateLinkedEntities(results);
    deduplicated = await deduplicateByRealUser(deduplicated);
    deduplicated.sort((a, b) => b.proximityScore - a.proximityScore);

    return {
      results: deduplicated.slice(skip, skip + parseInt(limit)),
      total: deduplicated.length,
      page: parseInt(page),
      limit: parseInt(limit),
    };
  },

  searchForTenant: async (tenantId, userId, query) => {
    const { q = "", filter, page = 1, limit = 20 } = query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const searchTerm = q.trim().toLowerCase();

    const results = [];

    const mentorAssocs = await db.incubatorMentorAssociation.findMany({
      where: { tenantId, status: "ACTIVE" },
      select: { mentorProfileId: true },
    });
    const assocMentorIds = new Set(mentorAssocs.map((a) => a.mentorProfileId));

    const enrolledApps = await db.startupApplication.findMany({
      where: { tenantId },
      select: { startupId: true },
    });
    const enrolledStartupIds = new Set(enrolledApps.map((a) => a.startupId));

    if (!filter || filter === "TEAM") {
      const teamMembers = await db.incubationUserTenant.findMany({
        where: {
          tenantId,
          isActive: true,
          incubationUser: {
            isActive: true,
            ...(searchTerm ? { name: { contains: searchTerm, mode: "insensitive" } } : {}),
          },
        },
        include: { incubationUser: { include: { user: true } } },
        take: parseInt(limit),
      });

      teamMembers.forEach((tm) => {
        const u = tm.incubationUser.user;
        if (u && u.id !== userId) {
          results.push({
            id: tm.incubationUser.id,
            type: "INCUBATION_USER",
            name: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
            avatar: u.profilePhoto,
            proximityScore: PROXIMITY.CONNECTED,
            proximityLabel: "Team Member",
            canMessage: true,
            realUserId: u.id,
          });
        } else if (!u && tm.incubationUser.userId !== userId) {
          results.push({
            id: tm.incubationUser.id,
            type: "INCUBATION_USER",
            name: tm.incubationUser.name,
            avatar: tm.incubationUser.imageUrl,
            proximityScore: PROXIMITY.CONNECTED,
            proximityLabel: "Team Member",
            canMessage: true,
          });
        }
      });
    }

    if (!filter || filter === "TENANT") {
      const tenants = await db.tenant.findMany({
        where: {
          id: { not: tenantId },
          ...(searchTerm
            ? {
                OR: [
                  { organizationName: { contains: searchTerm, mode: "insensitive" } },
                  { tenantKey: { contains: searchTerm, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        select: { id: true, organizationName: true, tenantLogo: true, pageId: true, page: { select: { name: true, logo: true } } },
        take: parseInt(limit),
      });

      tenants.forEach((t) => {
        results.push({
          id: t.id,
          type: "TENANT",
          name: t.page?.name || t.organizationName,
          avatar: t.page?.logo || t.tenantLogo,
          proximityScore: PROXIMITY.OTHER,
          proximityLabel: "Tenant",
          canMessage: true,
        });
      });
    }

    if (!filter || filter === "PAGE") {
      const pages = await db.page.findMany({
        where: {
          ...(searchTerm ? { name: { contains: searchTerm, mode: "insensitive" } } : {}),
          visibility: "PUBLIC",
          isActive: true,
        },
        select: { id: true, name: true, logo: true, type: true },
        take: parseInt(limit),
      });

      pages.forEach((p) => {
        results.push({
          id: p.id,
          type: "PAGE",
          name: p.name,
          avatar: p.logo,
          pageType: p.type,
          proximityScore: PROXIMITY.OTHER,
          proximityLabel: "Page",
          canMessage: true,
        });
      });
    }

    if (!filter || filter === "MENTOR") {
      const mentors = await db.mentorProfile.findMany({
        where: {
          profileVisibility: "PUBLIC",
          user: searchTerm
            ? {
                OR: [
                  { firstName: { contains: searchTerm, mode: "insensitive" } },
                  { lastName: { contains: searchTerm, mode: "insensitive" } },
                ],
              }
            : {},
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, profilePhoto: true } },
        },
        take: parseInt(limit),
      });

      mentors.forEach((m) => {
        const isAssociated = assocMentorIds.has(m.id);
        results.push({
          id: m.user.id,
          type: "USER",
          name: `${m.user.firstName} ${m.user.lastName}`.trim(),
          avatar: m.user.profilePhoto,
          proximityScore: isAssociated ? PROXIMITY.CONNECTED : PROXIMITY.OTHER,
          proximityLabel: isAssociated ? "Associated Mentor" : "Mentor",
          canMessage: true,
          isMentor: true,
          mentorProfileId: m.id,
        });
      });
    }

    if (!filter || filter === "STARTUP") {
      const startups = await db.startup.findMany({
        where: searchTerm
          ? { name: { contains: searchTerm, mode: "insensitive" } }
          : {},
        select: { id: true, name: true, logoUrl: true, pageId: true, page: { select: { name: true, logo: true } } },
        take: parseInt(limit),
      });

      startups.forEach((s) => {
        const isEnrolled = enrolledStartupIds.has(s.id);
        results.push({
          id: s.id,
          type: "STARTUP",
          name: s.page?.name || s.name,
          avatar: s.page?.logo || s.logoUrl,
          proximityScore: isEnrolled ? PROXIMITY.CONNECTED : PROXIMITY.OTHER,
          proximityLabel: isEnrolled ? "Enrolled Startup" : "Startup",
          canMessage: true,
        });
      });
    }

    let deduplicated = await deduplicateLinkedEntities(results);
    deduplicated = await deduplicateByRealUser(deduplicated);
    deduplicated.sort((a, b) => b.proximityScore - a.proximityScore);

    return {
      results: deduplicated.slice(skip, skip + parseInt(limit)),
      total: deduplicated.length,
      page: parseInt(page),
      limit: parseInt(limit),
    };
  },
};

// ============================================================================
// PRIVATE HELPER: User search
// ============================================================================

async function searchUsers(userId, searchTerm, skip, limit) {
  const [connections, following, followers, blockedPairs] = await Promise.all([
    db.connection.findMany({
      where: { OR: [{ senderId: userId, status: "ACCEPTED" }, { receiverId: userId, status: "ACCEPTED" }] },
      select: { senderId: true, receiverId: true },
    }),
    db.follow.findMany({ where: { followerId: userId }, select: { followingId: true } }),
    db.follow.findMany({ where: { followingId: userId }, select: { followerId: true } }),
    db.userBlock.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    }),
  ]);

  const connectedIds = new Set(connections.map((c) => (c.senderId === userId ? c.receiverId : c.senderId)));
  const followingIds = new Set(following.map((f) => f.followingId));
  const followerIds = new Set(followers.map((f) => f.followerId));
  const blockedIds = new Set(blockedPairs.flatMap((b) => [b.blockerId, b.blockedId]));
  blockedIds.delete(userId);

  const existingConvs = await db.conversation.findMany({
    where: {
      OR: [
        { participant1Type: "USER", participant1Id: userId },
        { participant2Type: "USER", participant2Id: userId },
      ],
    },
    select: { participant1Id: true, participant1Type: true, participant2Id: true, participant2Type: true },
  });

  const conversedIds = new Set();
  existingConvs.forEach((c) => {
    if (c.participant1Id !== userId && c.participant1Type === "USER") conversedIds.add(c.participant1Id);
    if (c.participant2Id !== userId && c.participant2Type === "USER") conversedIds.add(c.participant2Id);
  });

  const where = {
    id: { not: userId, notIn: [...blockedIds] },
    ...(searchTerm
      ? {
          OR: [
            { firstName: { contains: searchTerm, mode: "insensitive" } },
            { lastName: { contains: searchTerm, mode: "insensitive" } },
            { email: { contains: searchTerm, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const users = await db.user.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      profilePhoto: true,
      email: true,
      settings: { select: { allowMessagesFrom: true } },
    },
    take: limit * 3,
  });

  const mutualConnectionIds = new Set();
  if (connectedIds.size > 0 && users.length > 0) {
    const mutuals = await db.connection.findMany({
      where: {
        status: "ACCEPTED",
        OR: [
          { senderId: { in: [...connectedIds] }, receiverId: { in: users.map((u) => u.id) } },
          { receiverId: { in: [...connectedIds] }, senderId: { in: users.map((u) => u.id) } },
        ],
      },
      select: { senderId: true, receiverId: true },
    });
    mutuals.forEach((m) => {
      mutualConnectionIds.add(m.senderId);
      mutualConnectionIds.add(m.receiverId);
    });
    connectedIds.forEach((id) => mutualConnectionIds.delete(id));
    mutualConnectionIds.delete(userId);
  }

  const results = users.map((u) => {
    const permission = u.settings?.allowMessagesFrom || "CONNECTIONS";
    let proximityScore = PROXIMITY.OTHER;
    let proximityLabel = "";
    let canMsg = false;

    if (connectedIds.has(u.id)) {
      proximityScore = PROXIMITY.CONNECTED;
      proximityLabel = "Connected";
      canMsg = true;
    } else if (followingIds.has(u.id)) {
      proximityScore = PROXIMITY.FOLLOWING;
      proximityLabel = "Following";
    } else if (followerIds.has(u.id)) {
      proximityScore = PROXIMITY.FOLLOWER;
      proximityLabel = "Follower";
    } else if (mutualConnectionIds.has(u.id)) {
      proximityScore = PROXIMITY.MUTUAL;
      proximityLabel = "Mutual connection";
    } else if (conversedIds.has(u.id)) {
      proximityScore = PROXIMITY.HAS_CONVERSATION;
      proximityLabel = "Previously messaged";
      canMsg = true;
    }

    if (!canMsg) {
      if (permission === "EVERYONE") canMsg = true;
      else if (permission === "CONNECTIONS") canMsg = connectedIds.has(u.id);
      else canMsg = false;
    }

    return {
      id: u.id,
      type: "USER",
      name: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
      avatar: u.profilePhoto,
      proximityScore,
      proximityLabel: proximityLabel || (canMsg ? "Open" : ""),
      canMessage: canMsg,
    };
  });

  results.sort((a, b) => b.proximityScore - a.proximityScore);

  return {
    results: results.slice(skip, skip + limit),
    total: results.length,
    page: Math.floor(skip / limit) + 1,
    limit,
  };
}

// ============================================================================
// PRIVATE HELPER: Page search
// ============================================================================

async function searchPages(userId, searchTerm, skip, limit) {
  const followedPages = await db.pageFollower.findMany({
    where: { userId },
    select: { pageId: true },
  });
  const followedPageIds = new Set(followedPages.map((f) => f.pageId));

  const memberPages = await db.pageMember.findMany({
    where: { userId },
    select: { pageId: true },
  });
  const memberPageIds = new Set(memberPages.map((m) => m.pageId));

  const pages = await db.page.findMany({
    where: {
      ...(searchTerm
        ? { OR: [{ name: { contains: searchTerm, mode: "insensitive" } }, { tagline: { contains: searchTerm, mode: "insensitive" } }] }
        : {}),
      visibility: "PUBLIC",
      isActive: true,
    },
    select: { id: true, name: true, logo: true, type: true, tagline: true, followerCount: true },
    take: limit * 3,
  });

  const results = pages.map((p) => {
    let proximityScore = PROXIMITY.OTHER;
    let proximityLabel = p.type;

    if (memberPageIds.has(p.id)) {
      proximityScore = PROXIMITY.CONNECTED;
      proximityLabel = "Your Page";
    } else if (followedPageIds.has(p.id)) {
      proximityScore = PROXIMITY.FOLLOWING;
      proximityLabel = "Following";
    }

    return {
      id: p.id,
      type: "PAGE",
      name: p.name,
      avatar: p.logo,
      pageType: p.type,
      tagline: p.tagline,
      followerCount: p.followerCount,
      proximityScore,
      proximityLabel,
      canMessage: true,
    };
  });

  results.sort((a, b) => b.proximityScore - a.proximityScore);

  const deduplicated = await deduplicateLinkedEntities(results);

  return {
    results: deduplicated.slice(skip, skip + limit),
    total: deduplicated.length,
    page: Math.floor(skip / limit) + 1,
    limit,
  };
}

// ============================================================================
// PRIVATE HELPER: Startup search (for users)
// ============================================================================

async function searchStartups(userId, searchTerm, skip, limit) {
  const myStartups = await db.startupMember.findMany({
    where: { userId, isActive: true },
    select: { startupId: true },
  });
  const myStartupIds = new Set(myStartups.map((s) => s.startupId));

  const startups = await db.startup.findMany({
    where: searchTerm ? { name: { contains: searchTerm, mode: "insensitive" } } : {},
    select: { id: true, name: true, logoUrl: true, sector: true, stage: true, pageId: true, page: { select: { name: true, logo: true } } },
    take: limit * 3,
  });

  const results = startups
    .filter((s) => !myStartupIds.has(s.id))
    .map((s) => ({
      id: s.id,
      type: "STARTUP",
      name: s.page?.name || s.name,
      avatar: s.page?.logo || s.logoUrl,
      sector: s.sector,
      stage: s.stage,
      proximityScore: PROXIMITY.OTHER,
      proximityLabel: "Startup",
      canMessage: true,
    }));

  const deduplicated = await deduplicateLinkedEntities(results);

  return {
    results: deduplicated.slice(skip, skip + limit),
    total: deduplicated.length,
    page: Math.floor(skip / limit) + 1,
    limit,
  };
}

// ============================================================================
// PRIVATE HELPER: Tenant search (for users searching incubations)
// ============================================================================

async function searchTenants(userId, searchTerm, skip, limit) {
  const tenants = await db.tenant.findMany({
    where: searchTerm
      ? { organizationName: { contains: searchTerm, mode: "insensitive" } }
      : {},
    select: { id: true, organizationName: true, tenantLogo: true, pageId: true, page: { select: { name: true, logo: true } } },
    take: limit * 3,
  });

  const results = tenants.map((t) => ({
    id: t.id,
    type: "TENANT",
    name: t.page?.name || t.organizationName,
    avatar: t.page?.logo || t.tenantLogo,
    proximityScore: PROXIMITY.OTHER,
    proximityLabel: "Incubation",
    canMessage: true,
  }));

  const deduplicated = await deduplicateLinkedEntities(results);

  return {
    results: deduplicated.slice(skip, skip + limit),
    total: deduplicated.length,
    page: Math.floor(skip / limit) + 1,
    limit,
  };
}
