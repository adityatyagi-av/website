import { PostService } from "../../../services/ecosystem/social/post.service.js";
import { CommunityEngagementService } from "../../../services/ecosystem/community/community-engagement.service.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";

export const PostController = {
  generateUploadUrl: asyncHandler(async (req, res) => {
    const { fileName, fileType, mediaType } = req.body;

    const result = await PostService.generateUploadUrl({
      authorId: req.user.id,
      fileName,
      fileType,
      mediaType,
    });

    return apiResponse.sendSuccess(res, result, "Upload URL generated");
  }),

  createPost: asyncHandler(async (req, res) => {
    const result = await PostService.createPost({
      authorId: req.user.id,
      ...req.body,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Post created successfully",
      201,
    );
  }),

  updatePost: asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const result = await PostService.updatePost({
      postId,
      userId: req.user.id,
      ...req.body,
    });

    return apiResponse.sendSuccess(res, result, "Post updated successfully");
  }),

  deletePost: asyncHandler(async (req, res) => {
    const { postId } = req.params;

    await PostService.deletePost({
      postId,
      userId: req.user.id,
    });

    return apiResponse.sendSuccess(res, null, "Post deleted successfully");
  }),

  getMyPosts: asyncHandler(async (req, res) => {
    const result = await PostService.getMyPosts(req.user.id, req.query);
    return apiResponse.sendSuccess(
      res,
      result,
      "My posts fetched successfully",
    );
  }),

  getPostAsEntity: asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { viewerType, pageId } = req.query;

    const result = await PostService.getPostAsEntity({
      postId,
      userId: req.user.id,
      viewerType,
      pageId,
    });
console.log(result)

    return apiResponse.sendSuccess(res, result, "Post fetched successfully");
  }),

  getPostById: asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const viewerId = req.user?.id ?? null;

    const result = await PostService.getPostById(postId, viewerId);

    return apiResponse.sendSuccess(res, result, "Post fetched successfully");
  }),

  getPostsByUser: asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const viewerId = req.user?.id ?? null;

    const result = await PostService.getPostsByUser(
      userId,
      viewerId,
      req.query,
    );

    return apiResponse.sendSuccess(res, result, "Posts fetched successfully");
  }),

  getPostsByHashtag: asyncHandler(async (req, res) => {
    const { hashtag } = req.params;
    const viewerId = req.user?.id ?? null;

    const result = await PostService.getPostsByHashtag(
      hashtag,
      viewerId,
      req.query,
    );

    return apiResponse.sendSuccess(res, result, "Posts fetched successfully");
  }),

  likePost: asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const sourceType = req.query.sourceType || req.body.sourceType || "post";
    const { pageId } = req.body;

    if (sourceType === "communityPost") {
      const result = await CommunityEngagementService.likePost(req.user.id, postId);
      return apiResponse.sendSuccess(res, result, "Post liked");
    }

    const result = await PostService.likePost({
      postId,
      userId: req.user.id,
      pageId: pageId || null,
    });

    return apiResponse.sendSuccess(res, result, "Post liked");
  }),

  unlikePost: asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const sourceType = req.query.sourceType || "post";
    const pageId = req.query.pageId || null;

    if (sourceType === "communityPost") {
      const result = await CommunityEngagementService.unlikePost(req.user.id, postId);
      return apiResponse.sendSuccess(res, result, "Post unliked");
    }

    await PostService.unlikePost({
      postId,
      userId: req.user.id,
      pageId,
    });

    return apiResponse.sendSuccess(res, null, "Post unliked");
  }),

  getPostLikes: asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const sourceType = req.query.sourceType || "post";

    if (sourceType === "communityPost") {
      const result = await CommunityEngagementService.getPostLikes(postId, req.query);
      return apiResponse.sendSuccess(res, result, "Likes fetched successfully");
    }

    const result = await PostService.getPostLikes(postId, req.query);

    return apiResponse.sendSuccess(res, result, "Likes fetched successfully");
  }),

  bookmarkPost: asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const sourceType = req.query.sourceType || req.body.sourceType || "post";
    const { pageId } = req.body;

    if (sourceType === "communityPost") {
      const result = await CommunityEngagementService.bookmarkPost(req.user.id, postId);
      return apiResponse.sendSuccess(res, result, "Post bookmarked");
    }

    const result = await PostService.bookmarkPost({
      postId,
      userId: req.user.id,
      pageId: pageId || null,
    });

    return apiResponse.sendSuccess(res, result, "Post bookmarked");
  }),

  unbookmarkPost: asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const sourceType = req.query.sourceType || "post";
    const pageId = req.query.pageId || null;

    if (sourceType === "communityPost") {
      const result = await CommunityEngagementService.unbookmarkPost(req.user.id, postId);
      return apiResponse.sendSuccess(res, result, "Bookmark removed");
    }

    await PostService.unbookmarkPost({
      postId,
      userId: req.user.id,
      pageId,
    });

    return apiResponse.sendSuccess(res, null, "Bookmark removed");
  }),

  getBookmarkedPosts: asyncHandler(async (req, res) => {
    const pageId = req.query.pageId || null;
    const result = await PostService.getBookmarkedPosts(req.user.id, req.query, pageId);

    return apiResponse.sendSuccess(res, result, "Bookmarked posts fetched");
  }),

  addComment: asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { content, parentId, sourceType, pageId } = req.body;

    if (sourceType === "communityPost") {
      const result = await CommunityEngagementService.addComment(
        req.user.id, postId, content, parentId
      );
      return apiResponse.sendSuccess(res, result, "Comment added", 201);
    }

    const result = await PostService.addComment({
      postId,
      authorId: req.user.id,
      content,
      parentId,
      pageId: pageId || null,
    });

    return apiResponse.sendSuccess(res, result, "Comment added", 201);
  }),

  updateComment: asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content, sourceType, pageId } = req.body;

    if (sourceType === "communityPost") {
      const result = await CommunityEngagementService.updateComment(
        req.user.id, commentId, content
      );
      return apiResponse.sendSuccess(res, result, "Comment updated");
    }

    const result = await PostService.updateComment({
      commentId,
      userId: req.user.id,
      content,
      pageId: pageId || null,
    });

    return apiResponse.sendSuccess(res, result, "Comment updated");
  }),

  deleteComment: asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const sourceType = req.query.sourceType || "post";
    const pageId = req.query.pageId || null;

    if (sourceType === "communityPost") {
      const result = await CommunityEngagementService.deleteComment(
        req.user.id, commentId
      );
      return apiResponse.sendSuccess(res, result, "Comment deleted");
    }

    await PostService.deleteComment({
      commentId,
      userId: req.user.id,
      pageId,
    });

    return apiResponse.sendSuccess(res, null, "Comment deleted");
  }),

  getComments: asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const sourceType = req.query.sourceType || "post";
    const viewerId = req.user?.id ?? null;
    const viewerPageId = req.query.viewerType === "page" ? (req.query.pageId || null) : null;

    if (sourceType === "communityPost") {
      const result = await CommunityEngagementService.getComments(postId, {
        ...req.query,
        viewerId,
      });
      return apiResponse.sendSuccess(res, result, "Comments fetched");
    }

    const result = await PostService.getComments(postId, req.query, viewerId, viewerPageId);

    return apiResponse.sendSuccess(res, result, "Comments fetched");
  }),

  getReplies: asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const sourceType = req.query.sourceType || "post";
    const viewerId = req.user?.id ?? null;
    const viewerPageId = req.query.viewerType === "page" ? (req.query.pageId || null) : null;

    if (sourceType === "communityPost") {
      const result = await CommunityEngagementService.getReplies(commentId, {
        ...req.query,
        viewerId,
      });
      return apiResponse.sendSuccess(res, result, "Replies fetched");
    }

    const result = await PostService.getReplies(commentId, req.query, viewerId, viewerPageId);

    return apiResponse.sendSuccess(res, result, "Replies fetched");
  }),

  likeComment: asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const sourceType = req.query.sourceType || req.body.sourceType || "post";
    const { pageId } = req.body;

    if (sourceType === "communityPost") {
      const result = await CommunityEngagementService.likeComment(req.user.id, commentId);
      return apiResponse.sendSuccess(res, result, "Comment liked");
    }

    const result = await PostService.likeComment({
      commentId,
      userId: req.user.id,
      pageId: pageId || null,
    });

    return apiResponse.sendSuccess(res, result, "Comment liked");
  }),

  unlikeComment: asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const sourceType = req.query.sourceType || "post";
    const pageId = req.query.pageId || null;

    if (sourceType === "communityPost") {
      const result = await CommunityEngagementService.unlikeComment(req.user.id, commentId);
      return apiResponse.sendSuccess(res, result, "Comment unliked");
    }

    await PostService.unlikeComment({
      commentId,
      userId: req.user.id,
      pageId,
    });

    return apiResponse.sendSuccess(res, null, "Comment unliked");
  }),

  sharePost: asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { comment, sourceType, pageId } = req.body;

    if (sourceType === "communityPost") {
      const result = await CommunityEngagementService.sharePost(req.user.id, postId, comment);
      return apiResponse.sendSuccess(res, result, "Post shared successfully");
    }

    const result = await PostService.sharePost({
      postId,
      userId: req.user.id,
      comment,
      pageId: pageId || null,
    });

    return apiResponse.sendSuccess(res, result, "Post shared successfully");
  }),

  votePoll: asyncHandler(async (req, res) => {
    const { pollId } = req.params;
    const { optionId } = req.body;

    const result = await PostService.votePoll({
      pollId,
      optionId,
      userId: req.user.id,
    });

    return apiResponse.sendSuccess(res, result, "Vote recorded");
  }),

  pinPost: asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const result = await PostService.pinPost({
      postId,
      userId: req.user.id,
    });

    return apiResponse.sendSuccess(res, result, "Post pinned");
  }),

  unpinPost: asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const result = await PostService.unpinPost({
      postId,
      userId: req.user.id,
    });

    return apiResponse.sendSuccess(res, result, "Post unpinned");
  }),

  getStories: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await PostService.getStories(userId);
    return apiResponse.sendSuccess(
      res,
      result,
      "Stories fetched successfully.",
    );
  }),

  markViewed: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { postId } = req.params;
    const result = await PostService.markViewed(userId, postId);
    return apiResponse.sendSuccess(res, result, "Story marked as viewed.");
  }),
};
