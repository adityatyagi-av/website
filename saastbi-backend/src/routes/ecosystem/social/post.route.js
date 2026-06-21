import { Router } from "express";
import {
  authenticate,
  optionalAuthenticate,
} from "../../../middlewares/auth.middleware.js";
import { PostController } from "../../../controllers/ecosystem/social/post.controller.js";
import {
  PostValidation,
  validate,
} from "../../../validators/post.validation.js";

const PostRouter = Router();

//Generate S3 upload url for post media
PostRouter.post(
  "/post/upload-url",
  authenticate,
  validate(PostValidation.generateUploadUrl),
  PostController.generateUploadUrl,
);

// Create post
PostRouter.post(
  "/post/create-post",
  authenticate,
  validate(PostValidation.createPost),
  PostController.createPost,
);

// Update post
PostRouter.put(
  "/post/update-post/:postId",
  authenticate,
  validate(PostValidation.updatePost),
  PostController.updatePost,
);

// Delete post (soft delete)
PostRouter.delete(
  "/post/delete-post/:postId",
  authenticate,
  validate(PostValidation.deletePost),
  PostController.deletePost,
);

//Get All Posts
PostRouter.get("/post/my-post", authenticate, PostController.getMyPosts);

// View post as a different entity (user or page)
PostRouter.get(
  "/post/:postId/view-as",
  authenticate,
  validate(PostValidation.getPostAsEntity),
  PostController.getPostAsEntity,
);

// Get single post by ID
PostRouter.get(
  "/post/:postId",
  optionalAuthenticate,
  validate(PostValidation.getPostById),
  PostController.getPostById,
);

// Get posts by specific user
PostRouter.get(
  "/post/user/:userId",
  optionalAuthenticate,
  validate(PostValidation.getPostsByUser),
  PostController.getPostsByUser,
);

// Get posts by hashtag
PostRouter.get(
  "/post/hashtag/:hashtag",
  optionalAuthenticate,
  validate(PostValidation.getPostsByHashtag),
  PostController.getPostsByHashtag,
);

// Like a post
PostRouter.post(
  "/post/:postId/like",
  authenticate,
  validate(PostValidation.likePost),
  PostController.likePost,
);

// Unlike a post
PostRouter.delete(
  "/post/:postId/unlike",
  authenticate,
  validate(PostValidation.unlikePost),
  PostController.unlikePost,
);

// Get list of users who liked a post
PostRouter.get(
  "/post/:postId/likes",
  optionalAuthenticate,
  validate(PostValidation.getPostLikes),
  PostController.getPostLikes,
);

// Bookmark a post
PostRouter.post(
  "/post/:postId/bookmark",
  authenticate,
  validate(PostValidation.bookmarkPost),
  PostController.bookmarkPost,
);

// Remove bookmark
PostRouter.delete(
  "/post/:postId/bookmark",
  authenticate,
  validate(PostValidation.unbookmarkPost),
  PostController.unbookmarkPost,
);

// Get user's bookmarked posts
PostRouter.get("/bookmarks", authenticate, PostController.getBookmarkedPosts);

// Add comment to post
PostRouter.post(
  "/post/:postId/comment",
  authenticate,
  validate(PostValidation.addComment),
  PostController.addComment,
);

// Update comment
PostRouter.put(
  "/post/comment/:commentId",
  authenticate,
  validate(PostValidation.updateComment),
  PostController.updateComment,
);

// Delete comment
PostRouter.delete(
  "/post/comment/:commentId",
  authenticate,
  validate(PostValidation.deleteComment),
  PostController.deleteComment,
);

// Get comments for a post
PostRouter.get(
  "/post/:postId/comments",
  optionalAuthenticate,
  validate(PostValidation.getComments),
  PostController.getComments,
);

// Get replies for a comment
PostRouter.get(
  "/comment/:commentId/replies",
  optionalAuthenticate,
  validate(PostValidation.getReplies),
  PostController.getReplies,
);

// Like a comment
PostRouter.post(
  "/comment/:commentId/like",
  authenticate,
  validate(PostValidation.likeComment),
  PostController.likeComment,
);

// Unlike a comment
PostRouter.delete(
  "/comment/:commentId/like",
  authenticate,
  validate(PostValidation.unlikeComment),
  PostController.unlikeComment,
);

// Share a post
PostRouter.post(
  "/post/:postId/share",
  authenticate,
  validate(PostValidation.sharePost),
  PostController.sharePost,
);

// Vote on a poll
PostRouter.post(
  "/poll/:pollId/vote",
  authenticate,
  validate(PostValidation.votePoll),
  PostController.votePoll,
);

// Pin a post (for profile or page)
PostRouter.post(
  "/post/:postId/pin",
  authenticate,
  validate(PostValidation.pinPost),
  PostController.pinPost,
);

// Unpin a post
PostRouter.delete(
  "/post/:postId/pin",
  authenticate,
  validate(PostValidation.pinPost),
  PostController.unpinPost,
);

PostRouter.get("/stories", authenticate, PostController.getStories);

PostRouter.post(
  "/stories/:postId/view",
  authenticate,
  PostController.markViewed,
);

export default PostRouter;
