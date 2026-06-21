import {
  getRedis,
  setRedis,
  deleteRedis,
  redisClient,
} from "../../../config/redisClient.js";
import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { recordEntityVisit } from "../../../utils/helperFunctions.js";
import {
  computePostScore,
  computeTrendingScore,
  computeDiscoverScore,
} from "./feed.scoring.js";
import {
  fetchCommunityFeedItems,
  fetchEventFeedItems,
  fetchJobSuggestions,
  fetchRepostFeedItems,
  addSocialProof,
} from "./feed-helpers.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const FEED_SESSION_TTL = 30 * 60;
const SOCIAL_GRAPH_CACHE_TTL = 5 * 60;
const PREFERENCES_CACHE_TTL = 60 * 60;
const TRENDING_CACHE_TTL = 10 * 60;
const DISCOVER_CACHE_TTL = 15 * 60;

const MAX_FEED_SESSION_SIZE = 500;
const MAX_PAGE_SIZE = 50;

// ============================================================================
// MAIN SERVICE
// ============================================================================

export const FeedService = {
  // ==========================================================================
  // PERSONALIZED FEED
  // ==========================================================================
  search: async (viewerId, query) => {
    const {
      q,
      page = 1,
      limit = 10,
    } = query;
  
    if (!q?.trim()) {
      throw new ApiError(400, "Search query is required");
    }
  
    const search = q.trim();
  
    const currentPage = Math.max(Number(page) || 1, 1);
    const take = Math.min(Math.max(Number(limit) || 10, 1), 50);
    const skip = (currentPage - 1) * take;
  
    const userWhere = {
      isActive: true,
      ...(viewerId && {
        id: {
          not: viewerId,
        },
      }),
      OR: [
        {
          firstName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          lastName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          username: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          headline: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          bio: {
            contains: search,
            mode: "insensitive",
          },
        },
      ],
    };
  
    const pageWhere = {
      isActive: true,
      OR: [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          slug: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: search,
            mode: "insensitive",
          },
        },
      ],
    };
  
    const [users, pages, totalUsers, totalPages] = await Promise.all([
      db.user.findMany({
        where: userWhere,
        skip,
        take,
        orderBy: [
          {
            followers: {
              _count: "desc",
            },
          },
          {
            createdAt: "desc",
          },
        ],
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          profilePhoto: true,
          headline: true,
  
          _count: {
            select: {
              followers: true,
            },
          },
        },
      }),
  
      db.page.findMany({
        where: pageWhere,
        skip,
        take,
        orderBy: [
          {
            followerCount: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          type: true,
          description: true,
  
          _count: {
            select: {
              followers: true,
            },
          },
        },
      }),
  
      db.user.count({
        where: userWhere,
      }),
  
      db.page.count({
        where: pageWhere,
      }),
    ]);
  
    return {
      users,
      pages,
  
      pagination: {
        page: currentPage,
        limit: take,
  
        users: {
          total: totalUsers,
          totalPages: Math.ceil(totalUsers / take),
        },
  
        pages: {
          total: totalPages,
          totalPages: Math.ceil(totalPages / take),
        },
      },
    };
  },
  getPersonalizedFeed: async ({
    userId,
    cursor,
    limit = 20,
    filter,
    ipAddress,
    userAgent,
  }) => {
    try {
      const take = Math.min(Number(limit) || 20, MAX_PAGE_SIZE);
      const { sessionId, offset } = parseFeedCursor(cursor);
     console.log("SESSION ID IS ",sessionId, "and offset Id is",offset)
      // ── Serve from existing session ─────────────────────────────────
      if (sessionId) {
        const sessionData = await getRedis(`feed:session:${sessionId}`);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          return await serveFeedPage(session, offset, take, userId);
        }
        // Session expired — rebuild below
      }

      // ── Build new session ───────────────────────────────────────────
      const socialGraph = userId
        ? await getCachedSocialGraph(userId)
        : getGuestSocialGraph();

      const preferences = userId
        ? await getCachedFeedPreferences(userId)
        : null;

      const whereClause = buildFeedWhereClause({
        userId,
        socialGraph,
        preferences,
        filter,
      });

      const hiddenPostIds = userId ? await getHiddenPosts(userId) : [];
      if (hiddenPostIds.length > 0) {
        whereClause.id = { notIn: hiddenPostIds };
      }

      const candidateLimit = userId
        ? MAX_FEED_SESSION_SIZE
        : Math.min(take * 3, 100);

      const posts = await db.post.findMany({
        where: whereClause,
        take: candidateLimit,
        orderBy: { createdAt: "desc" },
        include: getPostInclude(userId),
      });

      // Fetch supplementary content
      const userRole = userId ? await getUserPrimaryRole(userId) : null;

      const [communityPosts, eventItems, jobItems, repostItems] =
        await Promise.all([
          userId ? fetchCommunityFeedItems(userId, 30) : [],
          userId ? fetchEventFeedItems(userId, socialGraph, 15) : [],
          userId ? fetchJobSuggestions(userId, socialGraph, 10, userRole) : [],
          userId ? fetchRepostFeedItems(userId, socialGraph, 30) : [],
        ]);

      console.log(
        `[Feed] userId=${userId || "guest"} posts=${posts.length} community=${communityPosts.length} events=${eventItems.length} jobs=${jobItems.length} reposts=${repostItems.length} role=${userRole}`,
      );

      if (
        posts.length === 0 &&
        communityPosts.length === 0 &&
        repostItems.length === 0
      ) {
        return { data: [], nextCursor: null, hasMore: false };
      }

      // Score posts
      const userInteractions = userId
        ? await getUserInteractionHistory(userId)
        : null;

      const scoredPosts = posts.map((post) => ({
        id: post.id,
        feedItemType: "post",
        authorId: post.authorId,
        pageId: post.pageId,
        _score: computePostScore({
          post,
          context: {
            isFollowed: socialGraph.followedUserIds.includes(post.authorId),
            isConnected: socialGraph.connectedUserIds.includes(post.authorId),
            userInteractions,
            preferences,
            socialGraph,
          },
        }),
      }));

      // Score community posts
      const scoredCommunityPosts = communityPosts.map((item) => {
        const post = item.data;
        const baseScore = computePostScore({
          post: {
            ...post,
            media: [],
            hashtags: [],
            mentions: [],
            author: post.author ? { ...post.author, roles: [] } : null,
          },
          context: {
            isFollowed: socialGraph.followedUserIds.includes(post.authorId),
            isConnected: socialGraph.connectedUserIds.includes(post.authorId),
            userInteractions,
            preferences,
            socialGraph,
          },
        });
        return {
          id: post.id,
          feedItemType: "communityPost",
          authorId: post.authorId,
          pageId: null,
          _score: baseScore * 0.9,
        };
      });

      // Score reposts WITH dedup — no repeated content
      const mainPostIds = new Set(scoredPosts.map((p) => p.id));
      const seenOriginalPostIds = new Set();

      const scoredReposts = repostItems
        .map((item) => {
          const originalPost = item.data.originalPost;
          const sharerIsFollowed = socialGraph.followedUserIds.includes(item.authorId);
          const sharerIsConnected = socialGraph.connectedUserIds.includes(item.authorId);
          let score = 20;
          if (sharerIsFollowed) score += 25;
          if (sharerIsConnected) score += 15;
          score += Math.log10((originalPost?.likeCount || 0) + 1) * 5;
          return {
            id: item.data.shareId || originalPost?.id,
            feedItemType: "repost",
            authorId: item.authorId,
            pageId: null,
            originalPostId: originalPost?.id || null,
            _score: score,
          };
        })
        .sort((a, b) => b._score - a._score)
        .filter((rp) => {
          if (!rp.originalPostId) return true;
          if (mainPostIds.has(rp.originalPostId)) return false;
          if (seenOriginalPostIds.has(rp.originalPostId)) return false;
          seenOriginalPostIds.add(rp.originalPostId);
          return true;
        });

      // Merge, sort, diversify
      const allScored = [...scoredPosts, ...scoredCommunityPosts, ...scoredReposts];
      allScored.sort((a, b) => b._score - a._score);
      const diversified = applyDiversityRules(allScored, allScored.length);

      // Build manifest
      const feedManifest = diversified.map((item) => ({
        id: item.id,
        type: item.feedItemType,
      }));

      // Create session
      const newSessionId = generateSessionId();
      const session = {
        sessionId: newSessionId,
        userId: userId || "guest",
        filter: filter || "all",
        manifest: feedManifest,
        createdAt: Date.now(),
      };

      await setRedis(
        `feed:session:${newSessionId}`,
        JSON.stringify(session),
        FEED_SESSION_TTL,
      );

      // Cache hydrated data for page 2+
      await cacheHydratedData(newSessionId, {
        posts,
        communityPosts,
        repostItems,
        eventItems,
        jobItems,
      });

      // Build lookup maps for page 1
      const postMap = new Map(posts.map((p) => [p.id, p]));
      const communityPostMap = new Map(communityPosts.map((cp) => [cp.data.id, cp]));
      const repostMap = new Map(
        repostItems.map((r) => [r.data.shareId || r.data.originalPost?.id, r]),
      );

      // Serve page 1
      return await serveFeedPageFromMaps({
        session,
        offset: 0,
        take,
        userId,
        postMap,
        communityPostMap,
        repostMap,
        eventItems,
        jobItems,
        socialGraph,
      });
    } catch (error) {
      console.error("Get personalized feed error:", error);
      throw new ApiError(500, `Failed to fetch feed: ${error.message}`);
    }
  },

  // ==========================================================================
  // FOLLOWING FEED
  // ==========================================================================
  getFollowingFeed: async ({ userId, cursor, limit = 20, filter }) => {
    try {
      const take = Math.min(Number(limit) || 20, MAX_PAGE_SIZE);

      const follows = await db.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      const followedUserIds = follows.map((f) => f.followingId);

      if (followedUserIds.length === 0) {
        return {
          data: [],
          nextCursor: null,
          hasMore: false,
          message: "You're not following anyone yet. Explore users to follow!",
        };
      }

      let whereClause = {
        authorId: { in: followedUserIds },
        isArchived: false,
        visibility: { in: ["PUBLIC", "CONNECTIONS_ONLY"] },
      };

      if (cursor) {
        const cursorData = decodeChronoCursor(cursor);
        if (cursorData) {
          whereClause.OR = [
            { createdAt: { lt: cursorData.createdAt } },
            { createdAt: cursorData.createdAt, id: { lt: cursorData.id } },
          ];
        }
      }

      if (filter && filter !== "all") {
        const postType = getPostTypeFromFilter(filter);
        if (postType) whereClause.postType = postType;
      }

      const posts = await db.post.findMany({
        where: whereClause,
        take: take + 1,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: getPostInclude(userId),
      });

      const hasMore = posts.length > take;
      const pageData = hasMore ? posts.slice(0, take) : posts;
      const postsWithContext = await addViewerContext(pageData, userId);

      const lastPost = pageData[pageData.length - 1];
      const nextCursor =
        hasMore && lastPost
          ? encodeChronoCursor(lastPost.createdAt, lastPost.id)
          : null;

      return { data: postsWithContext, nextCursor, hasMore };
    } catch (error) {
      console.error("Get following feed error:", error);
      throw new ApiError(500, `Failed to fetch following feed: ${error.message}`);
    }
  },

  // ==========================================================================
  // TRENDING FEED
  // ==========================================================================
  getTrendingFeed: async ({ userId, cursor, limit = 20, timeRange = "24h" }) => {
    try {
      const take = Math.min(Number(limit) || 20, MAX_PAGE_SIZE);
      const { sessionId, offset } = parseFeedCursor(cursor);

      if (sessionId) {
        const sessionData = await getRedis(`feed:session:${sessionId}`);
        if (sessionData) {
          return await serveSimplePage(JSON.parse(sessionData), offset, take, userId);
        }
      }

      const hoursAgo = getHoursFromTimeRange(timeRange);
      const timeThreshold = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

      const posts = await db.post.findMany({
        where: {
          isArchived: false,
          visibility: "PUBLIC",
          createdAt: { gte: timeThreshold },
          OR: [
            { likeCount: { gte: 5 } },
            { commentCount: { gte: 3 } },
            { shareCount: { gte: 2 } },
            { viewCount: { gte: 100 } },
          ],
        },
        take: MAX_FEED_SESSION_SIZE,
        orderBy: [{ likeCount: "desc" }, { commentCount: "desc" }, { createdAt: "desc" }],
        include: getTrendingPostInclude(),
      });

      const scoredPosts = posts
        .map((post) => ({ ...post, _trendingScore: computeTrendingScore(post, hoursAgo) }))
        .sort((a, b) => b._trendingScore - a._trendingScore);

      const newSessionId = generateSessionId();
      const manifest = scoredPosts.map((p) => p.id);
      const session = { sessionId: newSessionId, timeRange, manifest, createdAt: Date.now() };

      await setRedis(`feed:session:${newSessionId}`, JSON.stringify(session), TRENDING_CACHE_TTL);
      await cachePostMap(newSessionId, new Map(scoredPosts.map(({ _trendingScore, ...p }) => [p.id, p])));

      const pageIds = manifest.slice(0, take);
      const pageData = pageIds.map((id) => scoredPosts.find((p) => p.id === id)).filter(Boolean)
        .map(({ _trendingScore, ...p }) => p);
      const postsWithContext = userId ? await addViewerContext(pageData, userId) : pageData;

      return {
        data: postsWithContext,
        nextCursor: manifest.length > take ? encodeFeedCursor(newSessionId, take) : null,
        hasMore: manifest.length > take,
        meta: { timeRange, threshold: timeThreshold.toISOString() },
      };
    } catch (error) {
      console.error("Get trending feed error:", error);
      throw new ApiError(500, `Failed to fetch trending feed: ${error.message}`);
    }
  },

  // ==========================================================================
  // DISCOVER FEED
  // ==========================================================================
  getDiscoverFeed: async ({ userId, cursor, limit = 20 }) => {
    try {
      const take = Math.min(Number(limit) || 20, MAX_PAGE_SIZE);
      const { sessionId, offset } = parseFeedCursor(cursor);

      if (sessionId) {
        const sessionData = await getRedis(`feed:session:${sessionId}`);
        if (sessionData) {
          return await serveSimplePage(JSON.parse(sessionData), offset, take, userId);
        }
      }

      let excludedUserIds = [];
      if (userId) {
        const [follows, blocks, mutes] = await Promise.all([
          db.follow.findMany({ where: { followerId: userId }, select: { followingId: true } }),
          db.userBlock.findMany({ where: { blockerId: userId }, select: { blockedId: true } }),
          db.mutedUser.findMany({ where: { userId }, select: { mutedId: true } }),
        ]);
        excludedUserIds = [
          userId,
          ...follows.map((f) => f.followingId),
          ...blocks.map((b) => b.blockedId),
          ...mutes.map((m) => m.mutedId),
        ];
      }

      const posts = await db.post.findMany({
        where: {
          isArchived: false,
          visibility: "PUBLIC",
          ...(excludedUserIds.length > 0 && { authorId: { notIn: excludedUserIds } }),
          OR: [
            { likeCount: { gte: 3 } },
            { commentCount: { gte: 2 } },
            { viewCount: { gte: 50 } },
            { author: { roles: { some: { roleType: { in: ["FOUNDER", "INVESTOR", "MENTOR", "VC_PARTNER"] } } } } },
            { page: { type: { in: ["STARTUP", "VC_FIRM", "INSTITUTION"] } } },
          ],
        },
        take: MAX_FEED_SESSION_SIZE,
        orderBy: [{ createdAt: "desc" }],
        include: getDiscoverPostInclude(),
      });

      const scoredPosts = posts
        .map((post) => ({ ...post, _discoverScore: computeDiscoverScore(post) }))
        .sort((a, b) => b._discoverScore - a._discoverScore);

      const newSessionId = generateSessionId();
      const manifest = scoredPosts.map((p) => p.id);
      const session = { sessionId: newSessionId, manifest, createdAt: Date.now() };

      await setRedis(`feed:session:${newSessionId}`, JSON.stringify(session), DISCOVER_CACHE_TTL);
      await cachePostMap(newSessionId, new Map(scoredPosts.map(({ _discoverScore, ...p }) => [p.id, p])));

      const pageData = manifest.slice(0, take)
        .map((id) => scoredPosts.find((p) => p.id === id)).filter(Boolean)
        .map(({ _discoverScore, ...p }) => p);
      const postsWithContext = userId ? await addViewerContext(pageData, userId) : pageData;

      return {
        data: postsWithContext,
        nextCursor: manifest.length > take ? encodeFeedCursor(newSessionId, take) : null,
        hasMore: manifest.length > take,
      };
    } catch (error) {
      console.error("Get discover feed error:", error);
      throw new ApiError(500, `Failed to fetch discover feed: ${error.message}`);
    }
  },

  // ==========================================================================
  // TOPIC FEED
  // ==========================================================================
  getTopicFeed: async ({ userId, topic, cursor, limit = 20 }) => {
    try {
      const take = Math.min(Number(limit) || 20, MAX_PAGE_SIZE);

      const hashtag = await db.hashtag.findUnique({ where: { name: topic.toLowerCase() } });
      if (!hashtag) {
        return { data: [], nextCursor: null, hasMore: false, message: `No posts found for topic: ${topic}` };
      }

      let whereClause = {
        isArchived: false,
        visibility: "PUBLIC",
        hashtags: { some: { hashtagId: hashtag.id } },
      };

      if (cursor) {
        const cursorData = decodeChronoCursor(cursor);
        if (cursorData) {
          whereClause.OR = [
            { createdAt: { lt: cursorData.createdAt } },
            { createdAt: cursorData.createdAt, id: { lt: cursorData.id } },
          ];
        }
      }

      const posts = await db.post.findMany({
        where: whereClause,
        take: take + 1,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: getTopicPostInclude(),
      });

      const hasMore = posts.length > take;
      const pageData = hasMore ? posts.slice(0, take) : posts;
      const postsWithContext = userId ? await addViewerContext(pageData, userId) : pageData;

      const lastPost = pageData[pageData.length - 1];
      return {
        data: postsWithContext,
        nextCursor: hasMore && lastPost ? encodeChronoCursor(lastPost.createdAt, lastPost.id) : null,
        hasMore,
        meta: { topic, hashtagPostCount: hashtag.postCount },
      };
    } catch (error) {
      console.error("Get topic feed error:", error);
      throw new ApiError(500, `Failed to fetch topic feed: ${error.message}`);
    }
  },

  // ==========================================================================
  // CONNECTIONS FEED
  // ==========================================================================
  getConnectionsFeed: async ({ userId, cursor, limit = 20, filter }) => {
    try {
      const take = Math.min(Number(limit) || 20, MAX_PAGE_SIZE);

      const connections = await db.connection.findMany({
        where: { status: "ACCEPTED", OR: [{ senderId: userId }, { receiverId: userId }] },
        select: { senderId: true, receiverId: true },
      });

      const connectedUserIds = connections.map((c) =>
        c.senderId === userId ? c.receiverId : c.senderId,
      );

      if (connectedUserIds.length === 0) {
        return { data: [], nextCursor: null, hasMore: false, message: "You don't have any connections yet. Start connecting!" };
      }

      let whereClause = {
        authorId: { in: connectedUserIds },
        isArchived: false,
        visibility: { in: ["PUBLIC", "CONNECTIONS_ONLY"] },
      };

      if (cursor) {
        const cursorData = decodeChronoCursor(cursor);
        if (cursorData) {
          whereClause.OR = [
            { createdAt: { lt: cursorData.createdAt } },
            { createdAt: cursorData.createdAt, id: { lt: cursorData.id } },
          ];
        }
      }

      if (filter && filter !== "all") {
        const postType = getPostTypeFromFilter(filter);
        if (postType) whereClause.postType = postType;
      }

      const posts = await db.post.findMany({
        where: whereClause,
        take: take + 1,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: getPostInclude(userId),
      });

      const hasMore = posts.length > take;
      const pageData = hasMore ? posts.slice(0, take) : posts;
      const postsWithContext = await addViewerContext(pageData, userId);

      const lastPost = pageData[pageData.length - 1];
      return {
        data: postsWithContext,
        nextCursor: hasMore && lastPost ? encodeChronoCursor(lastPost.createdAt, lastPost.id) : null,
        hasMore,
      };
    } catch (error) {
      console.error("Get connections feed error:", error);
      throw new ApiError(500, `Failed to fetch connections feed: ${error.message}`);
    }
  },

  // ==========================================================================
  // ECOSYSTEM FEED
  // ==========================================================================
  getEcosystemFeed: async ({ userId, cursor, limit = 20, sector, stage }) => {
    try {
      const take = Math.min(Number(limit) || 20, MAX_PAGE_SIZE);
      const { sessionId, offset } = parseFeedCursor(cursor);

      if (sessionId) {
        const sessionData = await getRedis(`feed:session:${sessionId}`);
        if (sessionData) {
          return await serveSimplePage(JSON.parse(sessionData), offset, take, userId);
        }
      }

      const pageFilter = {};
      if (sector) pageFilter.sector = { equals: sector, mode: "insensitive" };
      if (stage) pageFilter.stage = { equals: stage, mode: "insensitive" };
      const hasPageFilter = Object.keys(pageFilter).length > 0;

      let excludedUserIds = [];
      if (userId) {
        const blocks = await db.userBlock.findMany({ where: { blockerId: userId }, select: { blockedId: true } });
        excludedUserIds = [userId, ...blocks.map((b) => b.blockedId)];
      }

      const posts = await db.post.findMany({
        where: {
          isArchived: false,
          visibility: "PUBLIC",
          ...(excludedUserIds.length > 0 && { authorId: { notIn: excludedUserIds } }),
          ...(hasPageFilter
            ? { page: { isNot: null, ...pageFilter } }
            : {
                OR: [
                  { page: { type: { in: ["STARTUP", "VC_FIRM", "INSTITUTION"] } } },
                  { author: { roles: { some: { roleType: { in: ["FOUNDER", "INVESTOR", "VC_PARTNER"] } } } } },
                ],
              }),
        },
        take: MAX_FEED_SESSION_SIZE,
        orderBy: [{ createdAt: "desc" }],
        include: getDiscoverPostInclude(),
      });

      const scoredPosts = posts
        .map((post) => ({ ...post, _discoverScore: computeDiscoverScore(post) }))
        .sort((a, b) => b._discoverScore - a._discoverScore);

      const newSessionId = generateSessionId();
      const manifest = scoredPosts.map((p) => p.id);
      const session = { sessionId: newSessionId, manifest, createdAt: Date.now() };

      await setRedis(`feed:session:${newSessionId}`, JSON.stringify(session), DISCOVER_CACHE_TTL);
      await cachePostMap(newSessionId, new Map(scoredPosts.map(({ _discoverScore, ...p }) => [p.id, p])));

      const pageData = manifest.slice(0, take)
        .map((id) => scoredPosts.find((p) => p.id === id)).filter(Boolean)
        .map(({ _discoverScore, ...p }) => p);
      const postsWithContext = userId ? await addViewerContext(pageData, userId) : pageData;

      return {
        data: postsWithContext,
        nextCursor: manifest.length > take ? encodeFeedCursor(newSessionId, take) : null,
        hasMore: manifest.length > take,
        meta: { ...(sector && { sector }), ...(stage && { stage }) },
      };
    } catch (error) {
      console.error("Get ecosystem feed error:", error);
      throw new ApiError(500, `Failed to fetch ecosystem feed: ${error.message}`);
    }
  },

  // ==========================================================================
  // ENGAGEMENT TRACKING
  // ==========================================================================
  recordPostView: async ({ postId, viewerId, ipAddress, userAgent }) => {
    try {
      await Promise.all([
        recordEntityVisit({ entityType: "POST", entityId: postId, viewerId, ipAddress, userAgent }),
        db.post.update({ where: { id: postId }, data: { viewCount: { increment: 1 } } }),
      ]);
    } catch (error) {
      console.error("Record post view error:", error);
    }
  },

  recordEngagement: async ({ postId, viewerId, dwellTime, scrollDepth, clickedLink, viewedMedia }) => {
    try {
      await db.postEngagement.create({
        data: { postId, userId: viewerId, dwellTime, scrollDepth, clickedLink: clickedLink || false, viewedMedia: viewedMedia || false },
      });
    } catch (error) {
      console.error("Record engagement error:", error);
    }
  },

  // ==========================================================================
  // MODERATION
  // ==========================================================================
  hidePost: async ({ userId, postId, reason }) => {
    try {
      await db.feedHiddenPost.upsert({
        where: { userId_postId: { userId, postId } },
        create: { userId, postId, reason: reason || "not_interested" },
        update: { reason: reason || "not_interested" },
      });
      await clearUserFeedSessions(userId);
    } catch (error) {
      console.error("Hide post error:", error);
      throw new ApiError(500, `Failed to hide post: ${error.message}`);
    }
  },

  reportPost: async ({ reporterId, postId, reason, description }) => {
    try {
      const post = await db.post.findUnique({ where: { id: postId }, select: { id: true, authorId: true } });
      if (!post) throw new ApiError(404, "Post not found");
      return await db.report.create({
        data: { reporterId, reportedUserId: post.authorId, contentType: "POST", contentId: postId, reason, description, status: "PENDING" },
        include: { reporter: { select: { id: true, username: true, firstName: true, lastName: true } } },
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error("Report post error:", error);
      throw new ApiError(500, `Failed to report post: ${error.message}`);
    }
  },

  // ==========================================================================
  // PREFERENCES
  // ==========================================================================
  getFeedPreferences: async (userId) => {
    try {
      let prefs = await db.feedPreferences.findUnique({ where: { userId } });
      if (!prefs) {
        prefs = await db.feedPreferences.create({
          data: { userId, showConnectionsOnly: false, showFollowingOnly: false, interests: [], mutedKeywords: [], preferredContentTypes: [] },
        });
      }
      return prefs;
    } catch (error) {
      console.error("Get feed preferences error:", error);
      throw new ApiError(500, `Failed to fetch preferences: ${error.message}`);
    }
  },

  updateFeedPreferences: async (userId, updates) => {
    try {
      const prefs = await db.feedPreferences.upsert({ where: { userId }, update: updates, create: { userId, ...updates } });
      await deleteRedis(`user:preferences:${userId}`);
      await clearUserFeedSessions(userId);
      return prefs;
    } catch (error) {
      console.error("Update feed preferences error:", error);
      throw new ApiError(500, `Failed to update preferences: ${error.message}`);
    }
  },

  clearFeedCache: async (userId) => {
    if (userId) {
      await clearUserFeedSessions(userId);
    } else {
      await scanAndDelete("feed:session:*");
    }
  },
};

// ============================================================================
// CURSOR HELPERS
// ============================================================================

function parseFeedCursor(cursor) {
  if (!cursor) return { sessionId: null, offset: 0 };
  const parts = cursor.split(":");
  if (parts.length === 2 && !isNaN(Number(parts[1]))) {
    return { sessionId: parts[0], offset: Number(parts[1]) };
  }
  return { sessionId: null, offset: 0 };
}

function encodeFeedCursor(sessionId, offset) {
  return `${sessionId}:${offset}`;
}

function encodeChronoCursor(createdAt, id) {
  const ts = createdAt instanceof Date ? createdAt.toISOString() : createdAt;
  return Buffer.from(`${ts}|${id}`).toString("base64url");
}

function decodeChronoCursor(cursor) {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf-8");
    const [timestamp, id] = decoded.split("|");
    if (!timestamp || !id) return null;
    return { createdAt: new Date(timestamp), id };
  } catch {
    return null;
  }
}

function generateSessionId() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

// ============================================================================
// PAGE SERVING — PERSONALIZED FEED (page 2+ from cache)
// ============================================================================

async function serveFeedPage(session, offset, take, userId) {
  const { manifest, sessionId } = session;
  const pageManifest = manifest.slice(offset, offset + take);

  if (pageManifest.length === 0) {
    return { data: [], nextCursor: null, hasMore: false };
  }

  const cached = await getRedis(`feed:data:${sessionId}`);
  if (!cached) {
    return { data: [], nextCursor: null, hasMore: false, expired: true };
  }

  const hydratedData = JSON.parse(cached);
  const postMap = new Map(hydratedData.posts.map((p) => [p.id, p]));
  const communityPostMap = new Map(hydratedData.communityPosts.map((cp) => [cp.data.id, cp]));
  const repostMap = new Map(
    hydratedData.repostItems.map((r) => [r.data.shareId || r.data.originalPost?.id, r]),
  );

  const pageItems = hydrateManifest(pageManifest, postMap, communityPostMap, repostMap);
  const withContext = userId ? await addViewerContextToMixed(pageItems, userId) : pageItems;

  // Inject events & jobs for this page
  const pageNumber = Math.floor(offset / take);
  const withInjections = injectIntoPage(withContext, hydratedData.eventItems, hydratedData.jobItems, pageNumber);

  const socialGraph = userId ? await getCachedSocialGraph(userId) : null;
  const finalItems = userId && socialGraph
    ? await addSocialProof(withInjections, userId, socialGraph)
    : withInjections;

  const nextOffset = offset + take;
  const hasMore = manifest.length > nextOffset;

  return {
    data: finalItems,
    nextCursor: hasMore ? encodeFeedCursor(sessionId, nextOffset) : null,
    hasMore,
    meta: { sessionId, page: pageNumber + 1, totalItems: manifest.length, eventsAvailable: hydratedData.eventItems?.length || 0, jobsAvailable: hydratedData.jobItems?.length || 0 },
  };
}

// ── Page 1 (from in-memory maps, not cache) ────────────────────────────────

async function serveFeedPageFromMaps({ session, offset, take, userId, postMap, communityPostMap, repostMap, eventItems, jobItems, socialGraph }) {
  const { manifest, sessionId } = session;
  const pageManifest = manifest.slice(offset, offset + take);

  const pageItems = hydrateManifest(pageManifest, postMap, communityPostMap, repostMap);
  const withContext = userId ? await addViewerContextToMixed(pageItems, userId) : pageItems;
  const withInjections = injectIntoPage(withContext, eventItems, jobItems, 0);

  const finalItems = userId && socialGraph
    ? await addSocialProof(withInjections, userId, socialGraph)
    : withInjections;

  const nextOffset = offset + take;
  const hasMore = manifest.length > nextOffset;

  return {
    data: finalItems,
    nextCursor: hasMore ? encodeFeedCursor(sessionId, nextOffset) : null,
    hasMore,
    meta: { sessionId, page: 1, totalItems: manifest.length, eventsAvailable: eventItems.length, jobsAvailable: jobItems.length },
  };
}

// ============================================================================
// SIMPLE PAGE SERVING — Trending, Discover, Ecosystem
// ============================================================================

async function serveSimplePage(session, offset, take, userId) {
  const { manifest, sessionId } = session;
  const pageIds = manifest.slice(offset, offset + take);

  if (pageIds.length === 0) return { data: [], nextCursor: null, hasMore: false };

  const cached = await getRedis(`feed:posts:${sessionId}`);
  if (!cached) return { data: [], nextCursor: null, hasMore: false, expired: true };

  const allPosts = JSON.parse(cached);
  const postMap = new Map(allPosts.map((p) => [p.id, p]));
  const pageData = pageIds.map((id) => postMap.get(id)).filter(Boolean);
  const postsWithContext = userId ? await addViewerContext(pageData, userId) : pageData;

  const nextOffset = offset + take;
  return {
    data: postsWithContext,
    nextCursor: manifest.length > nextOffset ? encodeFeedCursor(sessionId, nextOffset) : null,
    hasMore: manifest.length > nextOffset,
  };
}

// ============================================================================
// HYDRATION + INJECTION
// ============================================================================

function hydrateManifest(pageManifest, postMap, communityPostMap, repostMap) {
  const items = [];
  for (const entry of pageManifest) {
    if (entry.type === "post") {
      const post = postMap.get(entry.id);
      if (post) items.push({ ...post, feedItemType: "post" });
    } else if (entry.type === "communityPost") {
      const cp = communityPostMap.get(entry.id);
      if (cp) items.push(cp);
    } else if (entry.type === "repost") {
      const rp = repostMap.get(entry.id);
      if (rp) items.push(rp);
    }
  }
  return items;
}

/**
 * Splice events and jobs directly into a page. Simple and reliable.
 *
 * - Each page gets 1 event (at position 4) and 1 job (at position 8)
 * - pageNumber picks which event/job from the array (round-robin)
 * - If no events/jobs available for this page, nothing is injected
 */
function injectIntoPage(pageItems, eventItems, jobItems, pageNumber) {
  if ((!eventItems || eventItems.length === 0) && (!jobItems || jobItems.length === 0)) {
    return pageItems;
  }

  const result = [...pageItems];

  // Pick event and job for this page (round-robin through available items)
  const eventToInject = eventItems && eventItems.length > 0
    ? eventItems[pageNumber % eventItems.length]
    : null;

  const jobToInject = jobItems && jobItems.length > 0
    ? jobItems[pageNumber % jobItems.length]
    : null;

  // Insert job at position 8 first (so event insertion at 4 doesn't shift it past 8)
  if (jobToInject && result.length >= 3) {
    const jobPos = Math.min(8, result.length);
    result.splice(jobPos, 0, jobToInject);
  }

  // Insert event at position 4
  if (eventToInject && result.length >= 2) {
    const eventPos = Math.min(4, result.length);
    result.splice(eventPos, 0, eventToInject);
  }

  return result;
}

async function addViewerContextToMixed(items, userId) {
  if (!items.length || !userId) return items;

  const postsOnly = items.filter((p) => p.feedItemType === "post");
  const communityPostsOnly = items.filter((p) => p.feedItemType === "communityPost");

  const postsWithContext = postsOnly.length > 0 ? await addViewerContext(postsOnly, userId) : [];
  const contextMap = new Map(postsWithContext.map((p) => [p.id, p]));

  let communityContextMap = new Map();
  if (communityPostsOnly.length > 0) {
    const cpIds = communityPostsOnly.map((p) => p.data?.id).filter(Boolean);
    if (cpIds.length > 0) {
      const [cpLikes, cpBookmarks] = await Promise.all([
        db.communityPostLike.findMany({ where: { userId, postId: { in: cpIds } }, select: { postId: true } }),
        db.communityPostBookmark.findMany({ where: { userId, postId: { in: cpIds } }, select: { postId: true } }),
      ]);
      const cpLikedSet = new Set(cpLikes.map((l) => l.postId));
      const cpBookmarkedSet = new Set(cpBookmarks.map((b) => b.postId));
      for (const cp of communityPostsOnly) {
        const cpId = cp.data?.id;
        if (cpId) {
          communityContextMap.set(cpId, {
            ...cp,
            data: {
              ...cp.data,
              viewerContext: {
                hasLiked: cpLikedSet.has(cpId),
                hasBookmarked: cpBookmarkedSet.has(cpId),
              },
            },
          });
        }
      }
    }
  }

  return items.map((item) => {
    if (item.feedItemType === "post" && contextMap.has(item.id)) {
      return contextMap.get(item.id);
    }
    if (item.feedItemType === "communityPost" && communityContextMap.has(item.data?.id)) {
      return communityContextMap.get(item.data.id);
    }
    return item;
  });
}

// ============================================================================
// CACHING
// ============================================================================

async function cacheHydratedData(sessionId, data) {
  await setRedis(`feed:data:${sessionId}`, JSON.stringify({
    posts: data.posts,
    communityPosts: data.communityPosts,
    repostItems: data.repostItems,
    eventItems: data.eventItems,
    jobItems: data.jobItems,
  }), FEED_SESSION_TTL);
}

async function cachePostMap(sessionId, postMap) {
  await setRedis(`feed:posts:${sessionId}`, JSON.stringify(Array.from(postMap.values())), FEED_SESSION_TTL);
}

// ============================================================================
// SOCIAL GRAPH
// ============================================================================

async function getCachedSocialGraph(userId) {
  const cacheKey = `user:socialgraph:${userId}`;
  const cached = await getRedis(cacheKey);
  if (cached) return JSON.parse(cached);
  const graph = await getUserSocialGraph(userId);
  await setRedis(cacheKey, JSON.stringify(graph), SOCIAL_GRAPH_CACHE_TTL);
  return graph;
}

function getGuestSocialGraph() {
  return { followedUserIds: [], connectedUserIds: [], blockedUserIds: [], mutedUserIds: [], startupIds: [], pageIds: [] };
}

async function getUserSocialGraph(userId) {
  const [follows, connections, blocks, mutes, startupMembers, pageFollows] = await Promise.all([
    db.follow.findMany({ where: { followerId: userId }, select: { followingId: true } }),
    db.connection.findMany({ where: { status: "ACCEPTED", OR: [{ senderId: userId }, { receiverId: userId }] }, select: { senderId: true, receiverId: true } }),
    db.userBlock.findMany({ where: { blockerId: userId }, select: { blockedId: true } }),
    db.mutedUser.findMany({ where: { userId }, select: { mutedId: true } }),
    db.startupMember.findMany({ where: { userId, isActive: true }, select: { startupId: true } }),
    db.pageFollower.findMany({ where: { userId }, select: { pageId: true } }),
  ]);

  return {
    followedUserIds: follows.map((f) => f.followingId),
    connectedUserIds: connections.map((c) => (c.senderId === userId ? c.receiverId : c.senderId)),
    blockedUserIds: blocks.map((b) => b.blockedId),
    mutedUserIds: mutes.map((m) => m.mutedId),
    startupIds: startupMembers.map((s) => s.startupId),
    pageIds: pageFollows.map((p) => p.pageId),
  };
}

async function getCachedFeedPreferences(userId) {
  const cacheKey = `user:preferences:${userId}`;
  const cached = await getRedis(cacheKey);
  if (cached) return JSON.parse(cached);
  const prefs = await getUserFeedPreferences(userId);
  await setRedis(cacheKey, JSON.stringify(prefs), PREFERENCES_CACHE_TTL);
  return prefs;
}

async function getUserFeedPreferences(userId) {
  try {
    const p = await db.feedPreferences.findUnique({ where: { userId } });
    return p || { interests: [], mutedKeywords: [], preferredContentTypes: [], showConnectionsOnly: false, showFollowingOnly: false };
  } catch { return { interests: [], mutedKeywords: [], preferredContentTypes: [], showConnectionsOnly: false, showFollowingOnly: false }; }
}

async function getUserPrimaryRole(userId) {
  try {
    const role = await db.userRole.findFirst({ where: { userId, isPrimary: true }, select: { roleType: true } });
    return role?.roleType || null;
  } catch { return null; }
}

async function getHiddenPosts(userId) {
  try {
    return (await db.feedHiddenPost.findMany({ where: { userId }, select: { postId: true } })).map((h) => h.postId);
  } catch { return []; }
}

async function getUserInteractionHistory(userId) {
  const [likes, comments, shares, bookmarks] = await Promise.all([
    db.like.findMany({ where: { userId }, select: { postId: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 200 }),
    db.comment.findMany({ where: { authorId: userId }, select: { postId: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.share.findMany({ where: { userId }, select: { postId: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.bookmark.findMany({ where: { userId }, select: { postId: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);

  const interactedPostIds = [...new Set([...likes.map((l) => l.postId), ...comments.map((c) => c.postId)])];
  const hashtags = interactedPostIds.length > 0
    ? await db.postHashtag.findMany({ where: { postId: { in: interactedPostIds } }, include: { hashtag: { select: { name: true } } } })
    : [];

  const freq = {};
  hashtags.forEach(({ hashtag }) => { freq[hashtag.name] = (freq[hashtag.name] || 0) + 1; });

  return {
    likes, comments, shares, bookmarks,
    preferredHashtags: Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name]) => name),
  };
}

// ============================================================================
// WHERE CLAUSE BUILDER
// ============================================================================

function buildFeedWhereClause({ userId, socialGraph, preferences, filter }) {
  const whereClause = { isArchived: false };

  if (userId) {
    const excludedUsers = [...socialGraph.blockedUserIds, ...socialGraph.mutedUserIds];

    if (preferences?.showConnectionsOnly) {
      whereClause.authorId = { in: socialGraph.connectedUserIds.filter((id) => !excludedUsers.includes(id)) };
    } else if (preferences?.showFollowingOnly) {
      whereClause.authorId = { in: socialGraph.followedUserIds.filter((id) => !excludedUsers.includes(id)) };
    } else {
      if (excludedUsers.length > 0) whereClause.authorId = { notIn: excludedUsers };
      const orConditions = [
        { visibility: "PUBLIC" },
        { AND: [{ visibility: "CONNECTIONS_ONLY" }, { authorId: { in: socialGraph.connectedUserIds.filter((id) => !excludedUsers.includes(id)) } }] },
      ];
      if (socialGraph.pageIds?.length > 0) orConditions.push({ pageId: { in: socialGraph.pageIds } });
      whereClause.OR = orConditions;
    }
  } else {
    whereClause.visibility = "PUBLIC";
  }

  if (filter && filter !== "all") {
    const postType = getPostTypeFromFilter(filter);
    if (postType) whereClause.postType = postType;
  }

  if (preferences?.preferredContentTypes?.length > 0 && (!filter || filter === "all")) {
    const types = preferences.preferredContentTypes.map(getPostTypeFromFilter).filter(Boolean);
    if (types.length > 0) whereClause.postType = { in: types };
  }

  if (preferences?.mutedKeywords?.length > 0) {
    whereClause.NOT = { OR: preferences.mutedKeywords.map((kw) => ({ content: { contains: kw, mode: "insensitive" } })) };
  }

  return whereClause;
}

// ============================================================================
// DIVERSITY RULES
// ============================================================================

function applyDiversityRules(posts, maxItems) {
  const result = [];
  let lastAuthor = null;
  let lastType = null;
  let consecutiveAuthor = 0;
  let consecutiveType = 0;

  for (const post of posts) {
    if (result.length >= maxItems) break;
    const itemType = post.feedItemType || "post";
    const authorId = post.authorId;

    if (authorId && authorId === lastAuthor) {
      consecutiveAuthor++;
      if (consecutiveAuthor >= 3) continue;
    } else { lastAuthor = authorId; consecutiveAuthor = 1; }

    if (itemType !== "post" && itemType === lastType) {
      consecutiveType++;
      if (consecutiveType >= 2) continue;
    } else { consecutiveType = itemType !== "post" ? 1 : 0; }

    lastType = itemType;
    result.push(post);
  }
  return result;
}

// ============================================================================
// VIEWER CONTEXT
// ============================================================================

async function addViewerContext(posts, viewerId) {
  if (!posts.length || !viewerId) return posts;

  const postIds = posts.map((p) => p.id).filter(Boolean);
  const authorIds = [...new Set(posts.map((p) => p.authorId).filter(Boolean))];
  if (postIds.length === 0) return posts;

  const [likes, bookmarks, follows, connections] = await Promise.all([
    db.like.findMany({ where: { userId: viewerId, pageId:null, postId: { in: postIds } }, select: { postId: true } }),
    db.bookmark.findMany({ where: { userId: viewerId, postId: { in: postIds } }, select: { postId: true } }),
    db.follow.findMany({ where: { followerId: viewerId, followingId: { in: authorIds } }, select: { followingId: true } }),
    db.connection.findMany({
      where: { status: "ACCEPTED", OR: [{ senderId: viewerId, receiverId: { in: authorIds } }, { receiverId: viewerId, senderId: { in: authorIds } }] },
      select: { senderId: true, receiverId: true },
    }),
  ]);

  const likedSet = new Set(likes.map((l) => l.postId));
  const bookmarkedSet = new Set(bookmarks.map((b) => b.postId));
  const followedSet = new Set(follows.map((f) => f.followingId));
  const connectedSet = new Set(connections.map((c) => (c.senderId === viewerId ? c.receiverId : c.senderId)));

  return posts.map((post) => {
    const enriched = {
      ...post,
      viewerContext: {
        hasLiked: likedSet.has(post.id),
        hasBookmarked: bookmarkedSet.has(post.id),
        isFollowingAuthor: followedSet.has(post.authorId),
        isConnectedToAuthor: connectedSet.has(post.authorId),
        canEdit: post.authorId === viewerId,
        canDelete: post.authorId === viewerId,
      },
    };
    return enrichFeedPollData(enriched);
  });
}

// ============================================================================
// PRISMA INCLUDES
// ============================================================================

function enrichFeedPollData(post) {
  if (!post?.poll) return post;
  const poll = post.poll;
  const now = new Date();
  const isExpired = poll.expiresAt ? now > new Date(poll.expiresAt) : false;
  const totalVotes = poll.options.reduce((sum, opt) => {
    const count = opt._count?.votes ?? opt.voteCount ?? 0;
    return sum + count;
  }, 0);
  const enrichedOptions = poll.options.map((opt) => {
    const voteCount = opt._count?.votes ?? opt.voteCount ?? 0;
    return { ...opt, voteCount, percentage: totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0 };
  });
  return { ...post, poll: { ...poll, isExpired, totalVotes, options: enrichedOptions } };
}

function getPostInclude(userId) {
  return {
    author: { select: { id: true, username: true, firstName: true, lastName: true, profilePhoto: true, headline: true, roles: { select: { roleType: true, isPrimary: true } } } },
    media: { select: { id: true, url: true, mediaType: true, width: true, height: true }, orderBy: { order: "asc" } },
    page: { select: { id: true, name: true, slug: true, logo: true, type: true, sector: true, stage: true, followerCount: true } },
    poll: { include: { options: { include: { _count: { select: { votes: true } }, votes: userId ? { where: { voterId: userId }, select: { id: true } } : false }, orderBy: { order: "asc" } } } },
    hashtags: { include: { hashtag: { select: { id: true, name: true, postCount: true } } }, take: 10 },
    mentions: { include: { user: { select: { id: true, username: true, firstName: true, lastName: true, profilePhoto: true } } } },
    _count: { select: { comments: true, likes: true, shares: true } },
  };
}

function getTrendingPostInclude() {
  return {
    author: { select: { id: true, username: true, firstName: true, lastName: true, profilePhoto: true, headline: true, roles: { select: { roleType: true, isPrimary: true } } } },
    media: { select: { id: true, url: true, mediaType: true } },
    page: { select: { id: true, name: true, slug: true, logo: true, type: true, sector: true, stage: true } },
    hashtags: { include: { hashtag: { select: { id: true, name: true, postCount: true } } }, take: 10 },
  };
}

function getDiscoverPostInclude() {
  return {
    author: { select: { id: true, username: true, firstName: true, lastName: true, profilePhoto: true, headline: true, roles: { select: { roleType: true, isPrimary: true } }, _count: { select: { followers: true } } } },
    media: { select: { id: true, url: true, mediaType: true } },
    page: { select: { id: true, name: true, slug: true, logo: true, type: true, sector: true, stage: true } },
    hashtags: { include: { hashtag: { select: { id: true, name: true, postCount: true } } }, take: 10 },
  };
}

function getTopicPostInclude() {
  return {
    author: { select: { id: true, username: true, firstName: true, lastName: true, profilePhoto: true, headline: true, roles: { select: { roleType: true, isPrimary: true } } } },
    media: { select: { id: true, url: true, mediaType: true } },
    page: { select: { id: true, name: true, slug: true, logo: true, type: true } },
    hashtags: { include: { hashtag: { select: { id: true, name: true } } }, take: 10 },
  };
}

// ============================================================================
// UTILITY
// ============================================================================

function getPostTypeFromFilter(f) {
  return { images: "IMAGE", videos: "VIDEO", polls: "POLL", articles: "ARTICLE", links: "LINK", documents: "DOCUMENT" }[f] || null;
}

function getHoursFromTimeRange(t) {
  return { "1h": 1, "6h": 6, "12h": 12, "24h": 24, "48h": 48, "7d": 168, "30d": 720 }[t] || 24;
}

// ============================================================================
// CACHE CLEANUP
// ============================================================================

async function clearUserFeedSessions(userId) {
  await Promise.all([deleteRedis(`user:socialgraph:${userId}`), deleteRedis(`user:preferences:${userId}`)]);

  const sessionKeys = await scanKeys("feed:session:*");
  for (const key of sessionKeys) {
    try {
      const data = await getRedis(key);
      if (data) {
        const session = JSON.parse(data);
        if (session.userId === userId) {
          const sid = session.sessionId;
          await Promise.all([deleteRedis(key), deleteRedis(`feed:data:${sid}`), deleteRedis(`feed:posts:${sid}`)]);
        }
      }
    } catch { /* skip corrupt entries */ }
  }
}

async function scanKeys(pattern) {
  const keys = [];
  let cursor = "0";
  do {
    const [nextCursor, found] = await redisClient.scan(cursor, "MATCH", pattern, "COUNT", 100);
    cursor = nextCursor;
    keys.push(...found);
  } while (cursor !== "0");
  return keys;
}

async function scanAndDelete(pattern) {
  const keys = await scanKeys(pattern);
  for (let i = 0; i < keys.length; i += 100) {
    await Promise.all(keys.slice(i, i + 100).map((key) => deleteRedis(key)));
  }
}