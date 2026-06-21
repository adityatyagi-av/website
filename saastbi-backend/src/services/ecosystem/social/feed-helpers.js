import db from "../../../db/db.js";

const authorSelect = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    username: true,
    profilePhoto: true,
    headline: true,
  },
};

export async function fetchCommunityFeedItems(userId, limit = 10) {
  if (!userId) return [];

  const memberships = await db.communityMember.findMany({
    where: { userId, isBanned: false, isApproved: true },
    select: { communityId: true },
  });

  if (memberships.length === 0) return [];

  const communityIds = memberships.map((m) => m.communityId);

  const posts = await db.communityPost.findMany({
    where: {
      communityId: { in: communityIds },
      isApproved: true,
      isArchived: false,
    },
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      content: true,
      postType: true,
      mediaUrls: true,
      linkPreview: true,
      likeCount: true,
      commentCount: true,
      shareCount: true,
      viewCount: true,
      bookmarkCount: true,
      createdAt: true,
      authorId: true,
      author: authorSelect,
      community: {
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          category: true,
          memberCount: true,
        },
      },
      poll: {
        select: {
          id: true,
          question: true,
          isMultiple: true,
          expiresAt: true,
          options: {
            select: { id: true, text: true, voteCount: true, orderIndex: true },
            orderBy: { orderIndex: "asc" },
          },
        },
      },
    },
  });

  const postIds = posts.map((p) => p.id);
  let likedSet = new Set();
  let bookmarkedSet = new Set();

  if (postIds.length > 0) {
    const [likes, bookmarks] = await Promise.all([
      db.communityPostLike.findMany({
        where: { userId, postId: { in: postIds } },
        select: { postId: true },
      }),
      db.communityPostBookmark.findMany({
        where: { userId, postId: { in: postIds } },
        select: { postId: true },
      }),
    ]);
    likedSet = new Set(likes.map((l) => l.postId));
    bookmarkedSet = new Set(bookmarks.map((b) => b.postId));
  }

  const uniqueCommunityIds = [...new Set(posts.map((p) => p.community.id))];
  const memberPreviews = await db.communityMember.findMany({
    where: {
      communityId: { in: uniqueCommunityIds },
      isBanned: false,
      isApproved: true,
    },
    orderBy: { contributionScore: "desc" },
    select: {
      communityId: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePhoto: true,
        },
      },
    },
    take: uniqueCommunityIds.length * 3,
  });

  const communityMemberPreviewMap = {};
  for (const mp of memberPreviews) {
    if (!communityMemberPreviewMap[mp.communityId]) {
      communityMemberPreviewMap[mp.communityId] = [];
    }
    if (communityMemberPreviewMap[mp.communityId].length < 3) {
      communityMemberPreviewMap[mp.communityId].push(mp.user);
    }
  }

  return posts.map((p) => {
    const pollData = p.poll ? enrichCommunityFeedPoll(p.poll) : null;

    return {
      feedItemType: "communityPost",
      data: {
        ...p,
        poll: pollData,
        community: {
          ...p.community,
          memberPreviews: communityMemberPreviewMap[p.community.id] || [],
        },
        viewerContext: {
          hasLiked: likedSet.has(p.id),
          hasBookmarked: bookmarkedSet.has(p.id),
        },
      },
      createdAt: p.createdAt,
      authorId: p.authorId,
    };
  });
}

function enrichCommunityFeedPoll(poll) {
  if (!poll) return null;
  const now = new Date();
  const isExpired = poll.expiresAt ? now > new Date(poll.expiresAt) : false;
  const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.voteCount ?? 0), 0);
  const enrichedOptions = poll.options.map((opt) => ({
    ...opt,
    percentage: totalVotes > 0 ? Math.round(((opt.voteCount ?? 0) / totalVotes) * 100) : 0,
  }));
  return { ...poll, isExpired, totalVotes, options: enrichedOptions };
}

export async function fetchEventFeedItems(userId, socialGraph, limit = 5) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const whereConditions = [{ isFeatured: true }];

  if (socialGraph?.pageIds?.length > 0) {
    whereConditions.push({ pageId: { in: socialGraph.pageIds } });
  }

  if (socialGraph?.followedUserIds?.length > 0) {
    whereConditions.push({ authorId: { in: socialGraph.followedUserIds } });
  }

  if (socialGraph?.connectedUserIds?.length > 0) {
    whereConditions.push({ authorId: { in: socialGraph.connectedUserIds } });
  }
  whereConditions.push({ isPublic: true });

  const events = await db.event.findMany({
    where: {
      status: "PUBLISHED",
      isArchived: false,
      OR: whereConditions,
      startDate: { gte: sevenDaysAgo },
    },
    take: limit,
    orderBy: { startDate: "asc" },
    select: {
      id: true,
      title: true,
      slug: true,
      shortDesc: true,
      coverImage: true,
      startDate: true,
      endDate: true,
      format: true,
      venue: true,
      city: true,
      eventType: true,
      isPaid: true,
      price: true,
      currency: true,
      registrationCount: true,
      viewCount: true,
      tags: true,
      createdAt: true,
      authorId: true,
      page: {
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          type: true,
        },
      },
      author: authorSelect,
    },
  });

  let registeredEventIds = new Set();
  let bookmarkedEventIds = new Set();

  if (userId && events.length > 0) {
    const eventIds = events.map((e) => e.id);
    const [regs, bookmarks] = await Promise.all([
      db.eventRegistration.findMany({
        where: { userId, eventId: { in: eventIds } },
        select: { eventId: true },
      }),
      db.eventBookmark.findMany({
        where: { userId, eventId: { in: eventIds } },
        select: { eventId: true },
      }),
    ]);
    registeredEventIds = new Set(regs.map((r) => r.eventId));
    bookmarkedEventIds = new Set(bookmarks.map((b) => b.eventId));
  }

  return events.map((e) => ({
    feedItemType: "event",
    data: {
      ...e,
      viewerContext: {
        isRegistered: registeredEventIds.has(e.id),
        hasBookmarked: bookmarkedEventIds.has(e.id),
      },
    },
    createdAt: e.createdAt,
    authorId: e.authorId,
  }));
}

/**
 * FEAT-2: Improved role-aware job suggestions.
 * - STUDENT → internships & entry-level, weighted by skills match
 * - PROFESSIONAL → mid/senior, weighted by skills + industry match
 * - FOUNDER → hiring for their startups (de-prioritized, they know about these)
 * - Others → general featured + skills-based matching
 *
 * @param {string} userId
 * @param {object} socialGraph
 * @param {number} limit
 * @param {string|null} userRole - Primary role type from UserRole model
 */
export async function fetchJobSuggestions(
  userId,
  socialGraph,
  limit = 3,
  userRole = null,
) {
  if (!userId) return [];

  const userSkills = await db.userSkill.findMany({
    where: { userId },
    select: { skill: { select: { name: true } } },
  });

  const skillNames = userSkills.map((us) => us.skill.name.toLowerCase());

  const preferences = await db.feedPreferences.findUnique({
    where: { userId },
    select: { interests: true },
  });

  const interests = preferences?.interests || [];

  const orConditions = [];

  if (socialGraph?.pageIds?.length > 0) {
    orConditions.push({ pageId: { in: socialGraph.pageIds } });
  }

  orConditions.push({ isFeatured: true });

  if (skillNames.length > 0) {
    orConditions.push({ skills: { hasSome: skillNames } });
    orConditions.push({ requiredSkills: { hasSome: skillNames } });
    orConditions.push({ niceToHaveSkills: { hasSome: skillNames } });
  }

  if (interests.length > 0) {
    orConditions.push({ industry: { in: interests, mode: "insensitive" } });
  }

  // Fallback: always include recent jobs so the feed isn't empty
  // Scoring will rank personalized matches higher
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  orConditions.push({ createdAt: { gte: thirtyDaysAgo } });

  // ── Role-based experience filtering ──────────────────────────────────
  let experienceFilter = {};

  if (userRole === "STUDENT") {
    // Students: internships and entry-level only
    experienceFilter = {
      experienceLevel: { in: ["ENTRY", "JUNIOR"] },
      jobType: { in: ["INTERNSHIP", "FULL_TIME", "PART_TIME"] },
    };
  } else if (userRole === "PROFESSIONAL") {
    // Professionals: mid to senior level
    experienceFilter = {
      experienceLevel: { in: ["MID", "SENIOR", "LEAD"] },
    };
  } else if (userRole === "FREELANCER") {
    // Freelancers: contract and freelance roles
    experienceFilter = {
      jobType: { in: ["CONTRACT", "FREELANCE", "TEMPORARY"] },
    };
  }
  // FOUNDER, INVESTOR, MENTOR, VC_PARTNER → no experience filter, show all

  const jobs = await db.job.findMany({
    where: {
      status: "OPEN",
      OR: orConditions.length > 0 ? orConditions : undefined,
      ...experienceFilter,
    },
    take: limit * 3,
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      jobType: true,
      workMode: true,
      experienceLevel: true,
      location: true,
      salaryMin: true,
      salaryMax: true,
      showSalary: true,
      currency: true,
      skills: true,
      deadline: true,
      isFeatured: true,
      urgency: true,
      numberOfOpenings: true,
      createdAt: true,
      page: {
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
        },
      },
      postedBy: authorSelect,
    },
  });

  // ── Relevance scoring ────────────────────────────────────────────────
  const scored = jobs.map((job) => {
    let score = 0;
    const jobSkillsLower = (job.skills || []).map((s) => s.toLowerCase());

    // Boost for jobs from pages the user follows
    if (socialGraph?.pageIds?.includes(job.page?.id)) score += 50;

    // Skills match (strongest signal)
    if (skillNames.length > 0) {
      const matched = jobSkillsLower.filter((s) => skillNames.includes(s));
      score += matched.length * 10;

      // Bonus: if >50% of required skills match, strong fit
      if (matched.length > 0 && matched.length >= jobSkillsLower.length * 0.5) {
        score += 20;
      }
    }

    // Featured jobs get a boost
    if (job.isFeatured) score += 20;

    // Urgent jobs get a small boost
    if (job.urgency === "URGENT") score += 10;
    if (job.urgency === "CRITICAL") score += 15;

    // Role-specific bonuses
    if (userRole === "STUDENT" && job.jobType === "INTERNSHIP") {
      score += 15; // Students love internships
    }
    if (userRole === "PROFESSIONAL" && job.workMode === "REMOTE") {
      score += 5; // Professionals often prefer remote
    }

    return { ...job, _jobScore: score };
  });

  scored.sort((a, b) => b._jobScore - a._jobScore);

  const topJobs = scored.slice(0, limit);

  return topJobs.map(({ _jobScore, ...job }) => ({
    feedItemType: "job",
    data: job,
    createdAt: job.createdAt,
  }));
}

export async function fetchRepostFeedItems(userId, socialGraph, limit = 10) {
  if (!userId) return [];

  const networkUserIds = [
    ...new Set([
      ...(socialGraph?.followedUserIds || []),
      ...(socialGraph?.connectedUserIds || []),
    ]),
  ];

  if (networkUserIds.length === 0) return [];

  const shares = await db.share.findMany({
    where: {
      userId: { in: networkUserIds },
      comment: { not: null },
    },
    take: limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      comment: true,
      createdAt: true,
      userId: true,
      user: authorSelect,
      post: {
        select: {
          id: true,
          content: true,
          postType: true,
          likeCount: true,
          commentCount: true,
          shareCount: true,
          viewCount: true,
          createdAt: true,
          authorId: true,
          author: authorSelect,
          media: {
            select: { id: true, url: true, mediaType: true },
            orderBy: { order: "asc" },
            take: 4,
          },
          page: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
              type: true,
            },
          },
        },
      },
    },
  });

  return shares.map((s) => ({
    feedItemType: "repost",
    data: {
      shareId: s.id,
      sharer: s.user,
      sharerComment: s.comment,
      sharedAt: s.createdAt,
      originalPost: s.post,
    },
    createdAt: s.createdAt,
    authorId: s.userId,
  }));
}

export async function addSocialProof(posts, viewerId, socialGraph) {
  if (!posts.length || !viewerId) return posts;

  const postOnlyItems = posts.filter(
    (p) => p.feedItemType === "post" || p.feedItemType === "communityPost",
  );

  if (postOnlyItems.length === 0) return posts;

  const connectedIds = new Set(socialGraph?.connectedUserIds || []);

  const postIds = postOnlyItems
    .map((p) => (p.feedItemType === "post" ? p.data?.id || p.id : null))
    .filter(Boolean);

  const communityPostIds = postOnlyItems
    .map((p) => (p.feedItemType === "communityPost" ? p.data?.id : null))
    .filter(Boolean);

  const [postLikers, communityPostLikers, topComments, topCommunityComments] =
    await Promise.all([
      postIds.length > 0
        ? db.like.findMany({
            where: { postId: { in: postIds } },
            select: {
              postId: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  profilePhoto: true,
                  _count: { select: { followers: true } },
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: postIds.length * 5,
          })
        : [],
      communityPostIds.length > 0
        ? db.communityPostLike.findMany({
            where: { postId: { in: communityPostIds } },
            select: {
              postId: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  profilePhoto: true,
                  _count: { select: { followers: true } },
                },
              },
            },
            orderBy: { createdAt: "desc" },
            take: communityPostIds.length * 5,
          })
        : [],
      postIds.length > 0
        ? db.comment.findMany({
            where: { postId: { in: postIds }, parentId: null },
            select: {
              id: true,
              postId: true,
              content: true,
              authorId: true,
              author: authorSelect,
              _count: { select: { likes: true } },
            },
            orderBy: { likes: { _count: "desc" } },
            take: postIds.length * 3,
          })
        : [],
      communityPostIds.length > 0
        ? db.communityComment.findMany({
            where: { postId: { in: communityPostIds }, parentId: null },
            select: {
              id: true,
              postId: true,
              content: true,
              likeCount: true,
              authorId: true,
              author: authorSelect,
            },
            orderBy: { likeCount: "desc" },
            take: communityPostIds.length * 3,
          })
        : [],
    ]);

  const postLikerMap = {};
  for (const liker of postLikers) {
    if (!postLikerMap[liker.postId]) postLikerMap[liker.postId] = [];
    postLikerMap[liker.postId].push(liker.user);
  }

  const communityLikerMap = {};
  for (const liker of communityPostLikers) {
    if (!communityLikerMap[liker.postId])
      communityLikerMap[liker.postId] = [];
    communityLikerMap[liker.postId].push(liker.user);
  }

  const commentMap = {};
  for (const c of topComments) {
    if (!commentMap[c.postId]) commentMap[c.postId] = [];
    commentMap[c.postId].push(c);
  }

  const communityCommentMap = {};
  for (const c of topCommunityComments) {
    if (!communityCommentMap[c.postId]) communityCommentMap[c.postId] = [];
    communityCommentMap[c.postId].push(c);
  }

  function pickBestLiker(likers) {
    if (!likers || likers.length === 0) return null;
    const connectionLiker = likers.find((l) => connectedIds.has(l.id));
    if (connectionLiker) return connectionLiker;
    return likers.sort(
      (a, b) => (b._count?.followers || 0) - (a._count?.followers || 0),
    )[0];
  }

  function pickBestComment(comments) {
    if (!comments || comments.length === 0) return null;
    const connectionComment = comments.find((c) =>
      connectedIds.has(c.authorId),
    );
    if (connectionComment) return connectionComment;
    return comments[0];
  }

  function formatLiker(liker) {
    if (!liker) return null;
    return {
      id: liker.id,
      firstName: liker.firstName,
      lastName: liker.lastName,
      profilePhoto: liker.profilePhoto,
      liker:liker
    };
  }

  function formatComment(comment) {
    if (!comment) return null;
    const likeCount = comment.likeCount ?? comment._count?.likes ?? 0;
    return {
      id: comment.id,
      content:
        comment.content.length > 150
          ? comment.content.slice(0, 150) + "..."
          : comment.content,
      author: comment.author,
      likeCount,
    };
  }

  return posts.map((item) => {
    if (item.feedItemType === "post") {
      const pid = item.data?.id || item.id;
      const bestLiker = pickBestLiker(postLikerMap[pid]);
      const bestComment = pickBestComment(commentMap[pid]);
      return {
        ...item,
        socialProof: {
          topLiker: formatLiker(bestLiker),
          totalLikes: item.data?.likeCount || item.likeCount || 0,
        },
        topComment: formatComment(bestComment),
      };
    }

    if (item.feedItemType === "communityPost") {
      const pid = item.data?.id;
      const bestLiker = pickBestLiker(communityLikerMap[pid]);
      const bestComment = pickBestComment(communityCommentMap[pid]);
      return {
        ...item,
        socialProof: {
          topLiker: formatLiker(bestLiker),
          totalLikes: item.data?.likeCount || 0,
        },
        topComment: formatComment(bestComment),
      };
    }

    return item;
  });
}

export function injectContentItems(feedItems, events, jobs) {
  if (events.length === 0 && jobs.length === 0) return feedItems;

  const result = [];
  let eventIdx = 0;
  let jobIdx = 0;
  let postCount = 0;

  const eventInterval =
    feedItems.length > 0 && events.length > 0
      ? Math.max(3, Math.floor(feedItems.length / (events.length + 1)))
      : 4;
  const jobInterval =
    feedItems.length > 0 && jobs.length > 0
      ? Math.max(5, Math.floor(feedItems.length / (jobs.length + 1)))
      : 7;

  for (const item of feedItems) {
    result.push(item);
    postCount++;

    if (eventIdx < events.length && postCount % eventInterval === 0) {
      result.push(events[eventIdx]);
      eventIdx++;
    }

    if (jobIdx < jobs.length && postCount % jobInterval === 0) {
      result.push(jobs[jobIdx]);
      jobIdx++;
    }
  }

  while (eventIdx < events.length) {
    result.push(events[eventIdx]);
    eventIdx++;
  }

  while (jobIdx < jobs.length) {
    result.push(jobs[jobIdx]);
    jobIdx++;
  }

  return result;
}