import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { buildQueryOptions } from "../../../utils/queryHelper.js";
import { NotificationService } from "../../common/notification.service.js";

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

async function validatePostAccess(postId, userId) {
  const post = await db.communityPost.findUnique({
    where: { id: postId },
    select: { id: true, communityId: true, authorId: true, isApproved: true, isArchived: true },
  });
  if (!post || post.isArchived) throw new ApiError(404, "Post not found");
  if (!post.isApproved) throw new ApiError(404, "Post not found");

  const member = await db.communityMember.findUnique({
    where: { communityId_userId: { communityId: post.communityId, userId } },
    select: { id: true, role: true, isBanned: true, mutedUntil: true },
  });
  if (!member) throw new ApiError(403, "You must be a member to interact with this post");
  if (member.isBanned) throw new ApiError(403, "You are banned from this community");

  return { post, member };
}

function extractMentions(text) {
  if (!text) return [];
  const matches = text.match(/@([\w]+)/g);
  return matches ? [...new Set(matches.map((m) => m.slice(1).toLowerCase()))] : [];
}

export const CommunityEngagementService = {
  likePost: async (userId, postId) => {
    const { post } = await validatePostAccess(postId, userId);

    const existing = await db.communityPostLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existing) throw new ApiError(409, "You already liked this post");

    await db.$transaction(async (tx) => {
      await tx.communityPostLike.create({ data: { postId, userId } });
      await tx.communityPost.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } });
      await tx.communityMember.update({
        where: { communityId_userId: { communityId: post.communityId, userId } },
        data: { lastSeenAt: new Date() },
      });
    });

    if (post.authorId !== userId) {
      NotificationService.sendGrouped({
        recipientId: post.authorId,
        type: "COMMUNITY_POST",
        category: "COMMUNITY",
        title: "New like on your community post",
        message: "liked your community post",
        data: { postId, communityId: post.communityId },
        actionUrl: `/community/${post.communityId}/post/${postId}`,
        actorId: userId,
        entityType: "CommunityPost",
        entityId: postId,
        groupKey: `community-post:${postId}:like`,
      }).catch(() => {});
    }

    return { liked: true };
  },

  unlikePost: async (userId, postId) => {
    const existing = await db.communityPostLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (!existing) throw new ApiError(404, "You haven't liked this post");

    await db.$transaction(async (tx) => {
      await tx.communityPostLike.delete({ where: { postId_userId: { postId, userId } } });
      await tx.communityPost.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } });
    });

    return { unliked: true };
  },

  getPostLikes: async (postId, query) => {
    const post = await db.communityPost.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) throw new ApiError(404, "Post not found");

    const { skip, take } = buildQueryOptions({ page: query.page, limit: query.limit });

    const [likes, total] = await Promise.all([
      db.communityPostLike.findMany({
        where: { postId },
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: { user: authorSelect, createdAt: true },
      }),
      db.communityPostLike.count({ where: { postId } }),
    ]);

    return { likes, total, page: query.page || 1, limit: query.limit || 10 };
  },

  bookmarkPost: async (userId, postId) => {
    await validatePostAccess(postId, userId);

    const existing = await db.communityPostBookmark.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existing) throw new ApiError(409, "Post already bookmarked");

    await db.$transaction(async (tx) => {
      await tx.communityPostBookmark.create({ data: { postId, userId } });
      await tx.communityPost.update({ where: { id: postId }, data: { bookmarkCount: { increment: 1 } } });
    });

    return { bookmarked: true };
  },

  unbookmarkPost: async (userId, postId) => {
    const existing = await db.communityPostBookmark.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (!existing) throw new ApiError(404, "Post is not bookmarked");

    await db.$transaction(async (tx) => {
      await tx.communityPostBookmark.delete({ where: { postId_userId: { postId, userId } } });
      await tx.communityPost.update({ where: { id: postId }, data: { bookmarkCount: { decrement: 1 } } });
    });

    return { unbookmarked: true };
  },

  getBookmarkedPosts: async (userId, query) => {
    const { skip, take } = buildQueryOptions({ page: query.page, limit: query.limit });

    const [bookmarks, total] = await Promise.all([
      db.communityPostBookmark.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          createdAt: true,
          post: {
            select: {
              id: true,
              communityId: true,
              title: true,
              content: true,
              postType: true,
              mediaUrls: true,
              likeCount: true,
              commentCount: true,
              createdAt: true,
              author: authorSelect,
              community: { select: { id: true, name: true, slug: true, logo: true } },
              likes: {
                where: {
                  userId,
                },
                select: {
                  id: true,
                },
              },
            },
          },
        },
      }),
      db.communityPostBookmark.count({ where: { userId } }),
    ]);

    const result = bookmarks.map((bookmark) => ({
      ...bookmark,
      post: {
        ...bookmark.post,
        hasLiked: bookmark.post.likes.length > 0,
      },
    }));

    return { bookmarks:result, total, page: query.page || 1, limit: query.limit || 10 };
  },

  sharePost: async (userId, postId, comment) => {
    const { post } = await validatePostAccess(postId, userId);

    await db.$transaction(async (tx) => {
      await tx.communityPostShare.create({ data: { postId, userId, comment: comment || null } });
      await tx.communityPost.update({ where: { id: postId }, data: { shareCount: { increment: 1 } } });
    });

    return { shared: true };
  },

  addComment: async (userId, postId, content, parentId) => {
    const { post, member } = await validatePostAccess(postId, userId);

    if (member.mutedUntil && member.mutedUntil > new Date()) {
      throw new ApiError(403, `You are muted until ${member.mutedUntil.toISOString()}`);
    }

    if (parentId) {
      const parent = await db.communityComment.findUnique({
        where: { id: parentId },
        select: { id: true, postId: true },
      });
      if (!parent || parent.postId !== postId) throw new ApiError(404, "Parent comment not found");
    }

    const mentions = extractMentions(content);
    console.log("mentions:",mentions);

    const comment = await db.$transaction(async (tx) => {
      const created = await tx.communityComment.create({
        data: { postId, authorId: userId, content, parentId: parentId || null },
        select: {
          id: true,
          content: true,
          parentId: true,
          likeCount: true,
          isEdited: true,
          createdAt: true,
          author: authorSelect,
        },
      });

      await tx.communityPost.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } });
      await tx.communityMember.update({
        where: { communityId_userId: { communityId: post.communityId, userId } },
        data: { contributionScore: { increment: 2 }, lastSeenAt: new Date() },
      });

      return created;
    });

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
      console.log("mentioned users:", mentionedUsers);

      const recipientIds = mentionedUsers
        .map((u) => u.id)
        .filter((id) => id !== userId);

        console.log('rec ids;',recipientIds)

        if (recipientIds.length > 0) {
          await NotificationService.sendBulk({
            recipientIds,
            type: "COMMUNITY_MENTION",
            category: "COMMUNITY",
            priority: "HIGH",
            title: "You were mentioned",
            message: "Someone mentioned you in a comment",
            entityType: "CommunityComment",
            entityId: comment.id,
            actionUrl: `/community/${post.communityId}/post/${postId}`,   
            actorId: userId,
          });
        }
    }
    console.log("post author id;",post.authorId)
    console.log("user id:",userId)

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
      },
    });
    
    const commenterName =
      `${user?.firstName || ""} ${user?.lastName || ""}`.trim();

    if (post.authorId !== userId) {
      NotificationService.sendGrouped({
        recipientId: post.authorId,
        type: "COMMUNITY_COMMENT",
        category: "COMMUNITY",
        title: "New comment on your community post",
        message: `${commenterName} commented on your community post`,
        data: { postId, commentId: comment.id, communityId: post.communityId },
        actionUrl: `/community/${post.communityId}/post/${postId}`,
        actorId: userId,
        entityType: "CommunityPost",
        entityId: postId,
        groupKey: `community-post:${postId}:comment`,
      }).catch(() => {});
    }

    return comment;
  },

  updateComment: async (userId, commentId, content) => {
    const comment = await db.communityComment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true, post: { select: { communityId: true } } },
    });
    if (!comment) throw new ApiError(404, "Comment not found");

    const member = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: comment.post.communityId, userId } },
      select: { role: true },
    });
    if (comment.authorId !== userId && (!member || !["OWNER", "ADMIN", "MODERATOR"].includes(member.role))) {
      throw new ApiError(403, "You can only edit your own comments");
    }

    return db.communityComment.update({
      where: { id: commentId },
      data: { content, isEdited: true, editedAt: new Date() },
      select: {
        id: true,
        content: true,
        parentId: true,
        likeCount: true,
        isEdited: true,
        editedAt: true,
        createdAt: true,
        author: authorSelect,
      },
    });
  },

  deleteComment: async (userId, commentId) => {
    const comment = await db.communityComment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true, postId: true, post: { select: { communityId: true } } },
    });
    if (!comment) throw new ApiError(404, "Comment not found");

    const member = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: comment.post.communityId, userId } },
      select: { role: true },
    });
    if (comment.authorId !== userId && (!member || !["OWNER", "ADMIN", "MODERATOR"].includes(member.role))) {
      throw new ApiError(403, "You can only delete your own comments");
    }

    await db.$transaction(async (tx) => {
      const replyCount = await tx.communityComment.count({ where: { parentId: commentId } });
      await tx.communityCommentLike.deleteMany({ where: { comment: { parentId: commentId } } });
      await tx.communityComment.deleteMany({ where: { parentId: commentId } });
      await tx.communityCommentLike.deleteMany({ where: { commentId } });
      await tx.communityComment.delete({ where: { id: commentId } });
      await tx.communityPost.update({
        where: { id: comment.postId },
        data: { commentCount: { decrement: 1 + replyCount } },
      });
    });

    return { deleted: true };
  },

  getComments: async (postId, query) => {
    const post = await db.communityPost.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) throw new ApiError(404, "Post not found");

    const { skip, take } = buildQueryOptions({ page: query.page, limit: query.limit });

    const [comments, total] = await Promise.all([
      db.communityComment.findMany({
        where: { postId, parentId: null },
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          content: true,
          likeCount: true,
          isEdited: true,
          editedAt: true,
          createdAt: true,
          author: authorSelect,
          _count: { select: { replies: true } },
          replies: {
            take: 3,
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              content: true,
              likeCount: true,
              isEdited: true,
              createdAt: true,
              author: authorSelect,
            },
          },
        },
      }),
      db.communityComment.count({ where: { postId, parentId: null } }),
    ]);

    let viewerLikedCommentIds = new Set();
    if (query.viewerId) {
      const commentIds = comments.flatMap((c) => [c.id, ...c.replies.map((r) => r.id)]);
      const liked = await db.communityCommentLike.findMany({
        where: { commentId: { in: commentIds }, userId: query.viewerId },
        select: { commentId: true },
      });
      viewerLikedCommentIds = new Set(liked.map((l) => l.commentId));
    }

    const enrichedComments = comments.map((c) => ({
      ...c,
      hasLiked: viewerLikedCommentIds.has(c.id),
      replies: c.replies.map((r) => ({ ...r, hasLiked: viewerLikedCommentIds.has(r.id) })),
    }));

    return { comments: enrichedComments, total, page: query.page || 1, limit: query.limit || 10 };
  },

  getReplies: async (commentId, query) => {
    const comment = await db.communityComment.findUnique({
      where: { id: commentId },
      select: { id: true },
    });
    if (!comment) throw new ApiError(404, "Comment not found");

    const { skip, take } = buildQueryOptions({ page: query.page, limit: query.limit });

    const [replies, total] = await Promise.all([
      db.communityComment.findMany({
        where: { parentId: commentId },
        orderBy: { createdAt: "asc" },
        skip,
        take,
        select: {
          id: true,
          content: true,
          likeCount: true,
          isEdited: true,
          createdAt: true,
          author: authorSelect,
        },
      }),
      db.communityComment.count({ where: { parentId: commentId } }),
    ]);

    let viewerLikedReplyIds = new Set();
    if (query.viewerId) {
      const replyIds = replies.map((r) => r.id);
      if (replyIds.length > 0) {
        const liked = await db.communityCommentLike.findMany({
          where: { commentId: { in: replyIds }, userId: query.viewerId },
          select: { commentId: true },
        });
        viewerLikedReplyIds = new Set(liked.map((l) => l.commentId));
      }
    }

    const enrichedReplies = replies.map((r) => ({
      ...r,
      hasLiked: viewerLikedReplyIds.has(r.id),
    }));

    return { replies: enrichedReplies, total, page: query.page || 1, limit: query.limit || 10 };
  },

  likeComment: async (userId, commentId) => {
    const comment = await db.communityComment.findUnique({
      where: { id: commentId },
      select: { id: true, post: { select: { communityId: true } } },
    });
    if (!comment) throw new ApiError(404, "Comment not found");

    const member = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: comment.post.communityId, userId } },
      select: { isBanned: true },
    });
    if (!member) throw new ApiError(403, "You must be a member to interact");
    if (member.isBanned) throw new ApiError(403, "You are banned from this community");

    const existing = await db.communityCommentLike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });
    if (existing) throw new ApiError(409, "You already liked this comment");

    await db.$transaction(async (tx) => {
      await tx.communityCommentLike.create({ data: { commentId, userId } });
      await tx.communityComment.update({ where: { id: commentId }, data: { likeCount: { increment: 1 } } });
    });

    return { liked: true };
  },

  unlikeComment: async (userId, commentId) => {
    const existing = await db.communityCommentLike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });
    if (!existing) throw new ApiError(404, "You haven't liked this comment");

    await db.$transaction(async (tx) => {
      await tx.communityCommentLike.delete({ where: { commentId_userId: { commentId, userId } } });
      await tx.communityComment.update({ where: { id: commentId }, data: { likeCount: { decrement: 1 } } });
    });

    return { unliked: true };
  },

  votePoll: async (userId, pollId, optionId) => {
    const poll = await db.communityPoll.findUnique({
      where: { id: pollId },
      select: { id: true, isMultiple: true, expiresAt: true, post: { select: { communityId: true } } },
    });
    if (!poll) throw new ApiError(404, "Poll not found");
    if (poll.expiresAt && poll.expiresAt < new Date()) throw new ApiError(400, "This poll has expired");

    const member = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: poll.post.communityId, userId } },
      select: { isBanned: true },
    });
    if (!member) throw new ApiError(403, "You must be a member to vote");
    if (member.isBanned) throw new ApiError(403, "You are banned from this community");

    const option = await db.communityPollOption.findUnique({
      where: { id: optionId },
      select: { id: true, pollId: true },
    });
    if (!option || option.pollId !== pollId) throw new ApiError(404, "Poll option not found");

    const existingVote = await db.communityPollVote.findUnique({
      where: { pollId_userId: { pollId, userId } },
    });

    if (existingVote && !poll.isMultiple) {
      const minutesSinceVote = (Date.now() - new Date(existingVote.createdAt).getTime()) / (1000 * 60);

      if (minutesSinceVote > 5) {
        throw new ApiError(400, "You have already voted on this poll. You can only change your vote within 5 minutes.");
      }

      if (existingVote.optionId === optionId) {
        throw new ApiError(400, "You already voted for this option");
      }
    }

    await db.$transaction(async (tx) => {
      if (existingVote) {
        await tx.communityPollOption.update({
          where: { id: existingVote.optionId },
          data: { voteCount: { decrement: 1 } },
        });
        await tx.communityPollVote.delete({ where: { id: existingVote.id } });
      }

      await tx.communityPollVote.create({ data: { pollId, optionId, userId } });
      await tx.communityPollOption.update({
        where: { id: optionId },
        data: { voteCount: { increment: 1 } },
      });
    });

    const updatedPoll = await db.communityPoll.findUnique({
      where: { id: pollId },
      select: {
        id: true,
        question: true,
        isMultiple: true,
        expiresAt: true,
        options: { select: { id: true, text: true, voteCount: true, orderIndex: true }, orderBy: { orderIndex: "asc" } },
      },
    });

    const userVote = await db.communityPollVote.findUnique({
      where: { pollId_userId: { pollId, userId } },
      select: { optionId: true },
    });

    const isExpired = updatedPoll.expiresAt ? new Date() > new Date(updatedPoll.expiresAt) : false;
    const totalVotes = updatedPoll.options.reduce((sum, opt) => sum + (opt.voteCount ?? 0), 0);
    const enrichedOptions = updatedPoll.options.map((opt) => ({
      ...opt,
      percentage: totalVotes > 0 ? Math.round(((opt.voteCount ?? 0) / totalVotes) * 100) : 0,
    }));

    return {
      ...updatedPoll,
      options: enrichedOptions,
      isExpired,
      totalVotes,
      userVotedOptionId: userVote?.optionId || null,
    };
  },

  reportPost: async (userId, postId, reason, description) => {
    const post = await db.communityPost.findUnique({
      where: { id: postId },
      select: { id: true, communityId: true },
    });
    if (!post) throw new ApiError(404, "Post not found");

    const member = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: post.communityId, userId } },
      select: { isBanned: true },
    });
    if (!member) throw new ApiError(403, "You must be a member to report content");
    if (member.isBanned) throw new ApiError(403, "You are banned from this community");

    await db.communityModerationQueue.create({
      data: {
        communityId: post.communityId,
        postId,
        reporterId: userId,
        reason,
        description: description || null,
      },
    });

    return { reported: true };
  },

  reportComment: async (userId, commentId, reason, description) => {
    const comment = await db.communityComment.findUnique({
      where: { id: commentId },
      select: { id: true, post: { select: { communityId: true } } },
    });
    if (!comment) throw new ApiError(404, "Comment not found");

    const member = await db.communityMember.findUnique({
      where: { communityId_userId: { communityId: comment.post.communityId, userId } },
      select: { isBanned: true },
    });
    if (!member) throw new ApiError(403, "You must be a member to report content");
    if (member.isBanned) throw new ApiError(403, "You are banned from this community");

    await db.communityModerationQueue.create({
      data: {
        communityId: comment.post.communityId,
        commentId,
        reporterId: userId,
        reason,
        description: description || null,
      },
    });

    return { reported: true };
  },
};
