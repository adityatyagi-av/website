import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { buildQueryOptions } from "../../../utils/queryHelper.js";
import { NotificationService } from "../../common/notification.service.js";
function extractHashtags(text) {
  if (!text) return [];
  const matches = text.match(/#([\w]+)/g);
  return matches ? [...new Set(matches.map((m) => m.slice(1).toLowerCase()))] : [];
}

function extractMentions(text) {
  if (!text) return [];
  const matches = text.match(/@([\w]+)/g);
  return matches ? [...new Set(matches.map((m) => m.slice(1).toLowerCase()))] : [];
}

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

const postSelect = {
  id: true,
  communityId: true,
  channelId: true,
  authorId: true,
  title: true,
  content: true,
  postType: true,
  mediaUrls: true,
  linkPreview: true,
  isPinned: true,
  isApproved: true,
  isEdited: true,
  likeCount: true,
  commentCount: true,
  viewCount: true,
  shareCount: true,
  bookmarkCount: true,
  createdAt: true,
  updatedAt: true,
  author: authorSelect,
  channel: { select: { id: true, name: true, slug: true } },
  poll: {
    select: {
      id: true,
      question: true,
      isMultiple: true,
      expiresAt: true,
      options: { select: { id: true, text: true, voteCount: true, orderIndex: true }, orderBy: { orderIndex: "asc" } },
    },
  },
  _count: { select: { comments: true, likes: true, bookmarks: true } },
};

function enrichCommunityPoll(post) {
  if (!post || !post.poll) return post;
  const poll = post.poll;
  const now = new Date();
  const isExpired = poll.expiresAt ? now > new Date(poll.expiresAt) : false;
  const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.voteCount ?? 0), 0);
  const enrichedOptions = poll.options.map((opt) => ({
    ...opt,
    percentage: totalVotes > 0 ? Math.round(((opt.voteCount ?? 0) / totalVotes) * 100) : 0,
  }));
  return { ...post, poll: { ...poll, isExpired, totalVotes, options: enrichedOptions } };
}

async function validateMembership(communityId, userId) {
  const member = await db.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId } },
    select: { id: true, role: true, isBanned: true, mutedUntil: true },
  });
  if (!member) throw new ApiError(403, "You are not a member of this community");
  if (member.isBanned) throw new ApiError(403, "You are banned from this community");
  return member;
}

async function createHashtagAssociations(tx, postId, hashtags) {
  for (const tag of hashtags) {
    const hashtag = await tx.communityHashtag.upsert({
      where: { tag },
      create: { tag, postCount: 1 },
      update: { postCount: { increment: 1 } },
    });
    await tx.communityPostHashtag.create({
      data: { postId, hashtagId: hashtag.id },
    });
  }
}

async function createMentionAssociations(tx, postId, mentionUsernames) {
  for (const username of mentionUsernames) {
    const user = await tx.user.findUnique({ where: { username }, select: { id: true } });
    if (user) {
      await tx.communityPostMention.create({ data: { postId, userId: user.id } });
    }
  }
}

export const CommunityPostService = {
  createPost: async (userId, communityId, data) => {
    const member = await validateMembership(communityId, userId);
    console.log("member ",member)

    if (member.mutedUntil && member.mutedUntil > new Date()) {
      throw new ApiError(403, `You are muted until ${member.mutedUntil.toISOString()}`);
    }

    const community = await db.community.findUnique({
      where: { id: communityId },
      select: { id: true, name:true, slug: true, requirePostApproval: true, isSuspended: true },
    });
    if (community.isSuspended) throw new ApiError(400, "This community is currently suspended");

    if (data.channelId) {
      const channel = await db.communityChannel.findUnique({
        where: { id: data.channelId },
        select: { id: true, communityId: true, isReadOnly: true },
      });
      if (!channel || channel.communityId !== communityId) throw new ApiError(404, "Channel not found");
      if (channel.isReadOnly && !["OWNER", "ADMIN", "MODERATOR"].includes(member.role)) {
        throw new ApiError(403, "This channel is read-only");
      }
    }

    const isAutoApproved = !community.requirePostApproval || ["OWNER", "ADMIN", "MODERATOR"].includes(member.role);
    const hashtags = extractHashtags(data.content);
    const mentions = extractMentions(data.content);

    const post = await db.$transaction(async (tx) => {
      const created = await tx.communityPost.create({
        data: {
          communityId,
          channelId: data.channelId || null,
          authorId: userId,
          title: data.title || null,
          content: data.content,
          postType: data.postType || "TEXT",
          mediaUrls: data.mediaUrls || [],
          linkPreview: data.linkPreview || null,
          isApproved: isAutoApproved,
        },
        select: postSelect,
      });

      if (data.poll && data.postType === "POLL") {
        await tx.communityPoll.create({
          data: {
            postId: created.id,
            question: data.poll.question,
            isMultiple: data.poll.isMultiple || false,
            expiresAt: data.poll.expiresAt || null,
            options: {
              create: data.poll.options.map((text, index) => ({
                text,
                orderIndex: index,
              })),
            },
          },
        });
      }

      if (hashtags.length > 0) await createHashtagAssociations(tx, created.id, hashtags);
      if (mentions.length > 0) await createMentionAssociations(tx, created.id, mentions);

      if (isAutoApproved) {
        await tx.community.update({
          where: { id: communityId },
          data: { postCount: { increment: 1 }, lastActivityAt: new Date() },
        });
      }

      await tx.communityMember.update({
        where: { communityId_userId: { communityId, userId } },
        data: { contributionScore: { increment: 5 }, lastSeenAt: new Date() },
      });

      await tx.communityActivityLog.create({
        data: {
          communityId,
          userId,
          action: "POST_CREATED",
          targetType: "POST",
          targetId: created.id,
        },
      });

      return created;
    });

    if (data.poll && data.postType === "POLL") {
      const fullPost = await db.communityPost.findUnique({ where: { id: post.id }, select: postSelect });
      return fullPost;
    }

    const communityMembers = await db.communityMember.findMany({
      where: {
        communityId,
        isBanned: false,
        userId: {
          not: userId,
        },
      },
    
      select: {
        userId: true,
      },
    });
    console.log("community memeber",communityMembers)
    
    const recipientIds = [
      ...new Set(
        communityMembers.map((m) => m.userId)
      ),
    ];

    console.log("rec ids:",recipientIds)
    const author = await db.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        profilePhoto: true,
      },
    });
    
    const authorName =
      `${author?.firstName || ""} ${author?.lastName || ""}`.trim();
    
    if (recipientIds.length > 0) {
      let postPreview = "";

      if (data.content?.trim()) {
      postPreview =
        data.content.length > 120
          ? `${data.content.substring(0, 120)}...`
          : data.content;
      } else {
        switch (data.postType) {
          case "IMAGE":
            postPreview = "📷 Shared a photo";
            break;
          case "VIDEO":
            postPreview = "🎥 Shared a video";
            break;
          case "POLL":
            postPreview = "📊 Created a poll";
            break;
          case "DOCUMENT":
            postPreview = "📄 Shared a document";
            break;
          default:
            postPreview = "Created a new post";
        }
      }
      await NotificationService.sendBulk({
        recipientIds,
        type: "COMMUNITY_POST",
        category: "COMMUNITY",
        priority: "MEDIUM",
        title: `New post in ${community.name}`,
        message: `shared a new post in ${community.name} community.\n\n"${postPreview}"`,
        actorId: userId,
        actorName: authorName,
        actorAvatar: author.profilePhoto,
        entityType: "CommunityPost",
        entityId: post.id,
        actionUrl: `/community/${community.slug}`,
        data: {
          communityId,
          communityName: community.name,
          communitySlug: community.slug,
          postId: post.id,
          postTitle: data.title || null,
          postType: data.postType,
        },
      });
    }

    if (mentions.length > 0) {
      const mentionedUsers = await db.user.findMany({
        where: {
          username: {
            in: mentions,
          },
        },
    
        select: {
          id: true,
        },
      });
    
      const mentionRecipientIds = mentionedUsers
        .map((u) => u.id)
        .filter((id) => id !== userId);
    
      if (mentionRecipientIds.length > 0) {
        await NotificationService.sendBulk({
          recipientIds: mentionRecipientIds,
          type: "COMMUNITY_MENTION",
          category: "COMMUNITY",
          priority: "HIGH",
          title: "You were mentioned",
          message: "Someone mentioned you in a community post",
          entityType: "CommunityPost",
          entityId: post.id,
          actionUrl: `/community/post/${post.id}`,
          actorId: userId,
        });
      }
    }

    return post;
  },

  updatePost: async (userId, postId, data) => {
    const post = await db.communityPost.findUnique({
      where: { id: postId },
      select: { id: true, communityId: true, authorId: true, isArchived: true },
    });
    if (!post) throw new ApiError(404, "Post not found");
    if (post.isArchived) throw new ApiError(400, "Cannot edit an archived post");

    const member = await validateMembership(post.communityId, userId);
    if (post.authorId !== userId && !["OWNER", "ADMIN", "MODERATOR"].includes(member.role)) {
      throw new ApiError(403, "You can only edit your own posts");
    }

    const updateData = { isEdited: true, editedAt: new Date() };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.mediaUrls !== undefined) updateData.mediaUrls = data.mediaUrls;
    if (data.linkPreview !== undefined) updateData.linkPreview = data.linkPreview;

    if (data.content) {
      const hashtags = extractHashtags(data.content);

      await db.$transaction(async (tx) => {
        await tx.communityPostHashtag.deleteMany({ where: { postId } });
        await tx.communityPostMention.deleteMany({ where: { postId } });
        if (hashtags.length > 0) await createHashtagAssociations(tx, postId, hashtags);
        const mentions = extractMentions(data.content);
        if (mentions.length > 0) await createMentionAssociations(tx, postId, mentions);
      });
    }

    return db.communityPost.update({
      where: { id: postId },
      data: updateData,
      select: postSelect,
    });
  },

  deletePost: async (userId, postId) => {
    const post = await db.communityPost.findUnique({
      where: { id: postId },
      select: { id: true, communityId: true, authorId: true, isPinned: true, isApproved: true },
    });
    if (!post) throw new ApiError(404, "Post not found");

    const member = await validateMembership(post.communityId, userId);
    if (post.authorId !== userId && !["OWNER", "ADMIN", "MODERATOR"].includes(member.role)) {
      throw new ApiError(403, "You can only delete your own posts");
    }

    await db.$transaction(async (tx) => {
      await tx.communityPostHashtag.deleteMany({ where: { postId } });
      await tx.communityPostMention.deleteMany({ where: { postId } });
      await tx.communityPostBookmark.deleteMany({ where: { postId } });
      await tx.communityPostShare.deleteMany({ where: { postId } });
      await tx.communityPostLike.deleteMany({ where: { postId } });
      await tx.communityCommentLike.deleteMany({
        where: { comment: { postId } },
      });
      await tx.communityComment.deleteMany({ where: { postId } });

      const pollExists = await tx.communityPoll.findUnique({ where: { postId }, select: { id: true } });
      if (pollExists) {
        await tx.communityPollVote.deleteMany({ where: { pollId: pollExists.id } });
        await tx.communityPollOption.deleteMany({ where: { pollId: pollExists.id } });
        await tx.communityPoll.delete({ where: { postId } });
      }

      await tx.communityPost.delete({ where: { id: postId } });

      if (post.isApproved) {
        await tx.community.update({
          where: { id: post.communityId },
          data: {
            postCount: { decrement: 1 },
            ...(post.isPinned ? { pinnedPostCount: { decrement: 1 } } : {}),
          },
        });
      }

      await tx.communityActivityLog.create({
        data: {
          communityId: post.communityId,
          userId,
          action: "POST_DELETED",
          targetType: "POST",
          targetId: postId,
        },
      });
    });

    return { deleted: true };
  },

  getPost: async (postId, viewerId) => {
    const post = await db.communityPost.findUnique({
      where: { id: postId },
      select: {
        ...postSelect,
        mentions: { select: { user: authorSelect } },
        hashtags: { select: { hashtag: { select: { id: true, tag: true } } } },
      },
    });
    if (!post) throw new ApiError(404, "Post not found");
    if (!post.isApproved) {
      const member = viewerId
        ? await db.communityMember.findUnique({
            where: { communityId_userId: { communityId: post.communityId, userId: viewerId } },
            select: { role: true },
          })
        : null;
      if (post.authorId !== viewerId && (!member || !["OWNER", "ADMIN", "MODERATOR"].includes(member.role))) {
        throw new ApiError(404, "Post not found");
      }
    }

    await db.communityPost.update({ where: { id: postId }, data: { viewCount: { increment: 1 } } });

    let viewerContext = { hasLiked: false, hasBookmarked: false, canEdit: false, canDelete: false };
    if (viewerId) {
      const member = await db.communityMember.findUnique({
        where: { communityId_userId: { communityId: post.communityId, userId: viewerId } },
        select: { role: true },
      });

      const [liked, bookmarked] = await Promise.all([
        db.communityPostLike.findUnique({ where: { postId_userId: { postId, userId: viewerId } } }),
        db.communityPostBookmark.findUnique({ where: { postId_userId: { postId, userId: viewerId } } }),
      ]);

      const isAdminOrMod = member && ["OWNER", "ADMIN", "MODERATOR"].includes(member.role);
      viewerContext = {
        hasLiked: !!liked,
        hasBookmarked: !!bookmarked,
        canEdit: post.authorId === viewerId || isAdminOrMod,
        canDelete: post.authorId === viewerId || isAdminOrMod,
      };

      if (viewerId && member) {
        await db.communityMember.update({
          where: { communityId_userId: { communityId: post.communityId, userId: viewerId } },
          data: { lastSeenAt: new Date() },
        });
      }
    }

    return enrichCommunityPoll({ ...post, viewerContext });
  },

  getCommunityFeed: async (communityId, viewerId, query) => {
    const community = await db.community.findUnique({
      where: { id: communityId },
      select: { id: true, visibility: true },
    });
    if (!community) throw new ApiError(404, "Community not found");

    if (community.visibility !== "PUBLIC") {
      if (!viewerId) throw new ApiError(401, "Authentication required");
      const member = await db.communityMember.findUnique({
        where: { communityId_userId: { communityId, userId: viewerId } },
        select: { isBanned: true },
      });
      if (!member) throw new ApiError(403, "You must be a member to view this community's posts");
      if (member.isBanned) throw new ApiError(403, "You are banned from this community");
    }

    const { skip, take } = buildQueryOptions({ page: query.page, limit: query.limit });

    const where = { communityId, isApproved: true, isArchived: false };
    if (query.channelId) where.channelId = query.channelId;
    if (query.postType) where.postType = query.postType;

    let orderBy = { createdAt: "desc" };
    if (query.sortBy === "popular") orderBy = { likeCount: "desc" };
    if (query.sortBy === "views") orderBy = { viewCount: "desc" };

    const [posts, total, pinnedPosts] = await Promise.all([
      db.communityPost.findMany({
        where: { ...where, isPinned: false },
        orderBy,
        skip,
        take,
        select: postSelect,
      }),
      db.communityPost.count({ where }),
      query.page === 1 || !query.page
        ? db.communityPost.findMany({
            where: { communityId, isPinned: true, isApproved: true, isArchived: false },
            orderBy: { createdAt: "desc" },
            take: 3,
            select: postSelect,
          })
        : [],
    ]);

    let viewerLikes = [];
    let viewerBookmarks = [];
    if (viewerId) {
      const postIds = [...posts, ...pinnedPosts].map((p) => p.id);
      [viewerLikes, viewerBookmarks] = await Promise.all([
        db.communityPostLike.findMany({
          where: { postId: { in: postIds }, userId: viewerId },
          select: { postId: true },
        }),
        db.communityPostBookmark.findMany({
          where: { postId: { in: postIds }, userId: viewerId },
          select: { postId: true },
        }),
      ]);
    }

    const likedPostIds = new Set(viewerLikes.map((l) => l.postId));
    const bookmarkedPostIds = new Set(viewerBookmarks.map((b) => b.postId));

    const enrichPost = (p) => enrichCommunityPoll({
      ...p,
      viewerContext: {
        hasLiked: likedPostIds.has(p.id),
        hasBookmarked: bookmarkedPostIds.has(p.id),
      },
    });

    return {
      pinnedPosts: pinnedPosts.map(enrichPost),
      posts: posts.map(enrichPost),
      total,
      page: query.page || 1,
      limit: query.limit || 10,
    };
  },

  getChannelFeed: async (communityId, channelId, viewerId, query) => {
    const channel = await db.communityChannel.findUnique({
      where: { id: channelId },
      select: { id: true, communityId: true },
    });
    if (!channel || channel.communityId !== communityId) throw new ApiError(404, "Channel not found");

    return CommunityPostService.getCommunityFeed(communityId, viewerId, { ...query, channelId });
  },

  pinPost: async (userId, postId) => {
    const post = await db.communityPost.findUnique({
      where: { id: postId },
      select: { id: true, communityId: true, isPinned: true },
    });
    if (!post) throw new ApiError(404, "Post not found");
    if (post.isPinned) throw new ApiError(400, "Post is already pinned");

    const member = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: post.communityId, userId } },
      select: { role: true },
    });
    if (!member || !["OWNER", "ADMIN", "MODERATOR"].includes(member.role)) {
      throw new ApiError(403, "Only admins and moderators can pin posts");
    }

    const pinnedCount = await db.communityPost.count({
      where: { communityId: post.communityId, isPinned: true },
    });
    if (pinnedCount >= 3) throw new ApiError(400, "Maximum 3 pinned posts allowed");

    await db.$transaction(async (tx) => {
      await tx.communityPost.update({ where: { id: postId }, data: { isPinned: true } });
      await tx.community.update({
        where: { id: post.communityId },
        data: { pinnedPostCount: { increment: 1 } },
      });
    });

    return { pinned: true };
  },

  unpinPost: async (userId, postId) => {
    const post = await db.communityPost.findUnique({
      where: { id: postId },
      select: { id: true, communityId: true, isPinned: true },
    });
    if (!post) throw new ApiError(404, "Post not found");
    if (!post.isPinned) throw new ApiError(400, "Post is not pinned");

    const member = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: post.communityId, userId } },
      select: { role: true },
    });
    if (!member || !["OWNER", "ADMIN", "MODERATOR"].includes(member.role)) {
      throw new ApiError(403, "Only admins and moderators can unpin posts");
    }

    await db.$transaction(async (tx) => {
      await tx.communityPost.update({ where: { id: postId }, data: { isPinned: false } });
      await tx.community.update({
        where: { id: post.communityId },
        data: { pinnedPostCount: { decrement: 1 } },
      });
    });

    return { unpinned: true };
  },

  approvePost: async (userId, postId) => {
    const post = await db.communityPost.findUnique({
      where: { id: postId },
      select: { id: true, communityId: true, isApproved: true },
    });
    if (!post) throw new ApiError(404, "Post not found");
    if (post.isApproved) throw new ApiError(400, "Post is already approved");

    const member = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: post.communityId, userId } },
      select: { role: true },
    });
    if (!member || !["OWNER", "ADMIN", "MODERATOR"].includes(member.role)) {
      throw new ApiError(403, "You don't have permission to approve posts");
    }

    await db.$transaction(async (tx) => {
      await tx.communityPost.update({ where: { id: postId }, data: { isApproved: true } });
      await tx.community.update({
        where: { id: post.communityId },
        data: { postCount: { increment: 1 }, lastActivityAt: new Date() },
      });
    });

    return { approved: true };
  },

  rejectPost: async (userId, postId) => {
    const post = await db.communityPost.findUnique({
      where: { id: postId },
      select: { id: true, communityId: true, isApproved: true },
    });
    if (!post) throw new ApiError(404, "Post not found");

    const member = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: post.communityId, userId } },
      select: { role: true },
    });
    if (!member || !["OWNER", "ADMIN", "MODERATOR"].includes(member.role)) {
      throw new ApiError(403, "You don't have permission to reject posts");
    }

    await db.communityPost.update({
      where: { id: postId },
      data: { isArchived: true, isApproved: false },
    });

    return { rejected: true };
  },

  getPendingPosts: async (userId, communityId, query) => {
    const member = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId, userId } },
      select: { role: true },
    });
    if (!member || !["OWNER", "ADMIN", "MODERATOR"].includes(member.role)) {
      throw new ApiError(403, "You don't have permission to view pending posts");
    }

    const { skip, take } = buildQueryOptions({ page: query.page, limit: query.limit });

    const [posts, total] = await Promise.all([
      db.communityPost.findMany({
        where: { communityId, isApproved: false, isArchived: false },
        orderBy: { createdAt: "asc" },
        skip,
        take,
        select: postSelect,
      }),
      db.communityPost.count({ where: { communityId, isApproved: false, isArchived: false } }),
    ]);

    return { posts, total, page: query.page || 1, limit: query.limit || 10 };
  },

  searchWithinCommunity: async (communityId, viewerId, query) => {
    const community = await db.community.findUnique({
      where: { id: communityId },
      select: { id: true, visibility: true },
    });
    if (!community) throw new ApiError(404, "Community not found");

    if (community.visibility !== "PUBLIC" && viewerId) {
      const member = await db.communityMember.findUnique({
        where: { communityId_userId: { communityId, userId: viewerId } },
      });
      if (!member) throw new ApiError(403, "You must be a member to search in this community");
    }

    const { skip, take } = buildQueryOptions({ page: query.page, limit: query.limit });

    const where = {
      communityId,
      isApproved: true,
      isArchived: false,
      OR: [
        { content: { contains: query.search, mode: "insensitive" } },
        { title: { contains: query.search, mode: "insensitive" } },
      ],
    };

    const [posts, total] = await Promise.all([
      db.communityPost.findMany({ where, orderBy: { createdAt: "desc" }, skip, take, select: postSelect }),
      db.communityPost.count({ where }),
    ]);

    return { posts, total, page: query.page || 1, limit: query.limit || 10 };
  },
};
