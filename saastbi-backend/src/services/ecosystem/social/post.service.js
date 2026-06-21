import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { buildQueryOptions } from "../../../utils/queryHelper.js";
import { generatePostUploadUrl } from "../../../utils/s3util.js";
import { NotificationService } from "../../common/notification.service.js";

export const PostService = {
  generateUploadUrl: async ({ authorId, fileName, fileType, mediaType }) => {
    try {
      const user = await db.user.findUnique({
        where: { id: authorId },
        select: { id: true, isActive: true },
      });

      if (!user) {
        throw new ApiError(404, "User not found");
      }

      if (!user.isActive) {
        throw new ApiError(403, "User account is not active");
      }

      return await generatePostUploadUrl({
        authorId,
        fileName,
        fileType,
        mediaType,
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        500,
        `Failed to generate upload URL: ${error.message}`,
      );
    }
  },
  createPost: async ({
    authorId,
    content = null,
    postType = "TEXT",
    media = [],
    visibility = "PUBLIC",
    pageId = null,
    pollData = null,
    linkPreview = null,
  }) => {
    try {
      const user = await db.user.findUnique({
        where: { id: authorId },
        select: {
          id: true,
          isActive: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      });

      if (!user) {
        throw new ApiError(404, "User not found");
      }

      if (!user.isActive) {
        throw new ApiError(403, "User account is not active");
      }

      if (pageId) {
        const page = await db.page.findUnique({
          where: { id: pageId },
          include: {
            members: {
              where: { userId: authorId },
              select: { role: true },
            },
          },
        });

        if (!page) {
          throw new ApiError(404, "Page not found");
        }

        if (!page.isActive) {
          throw new ApiError(403, "Page is not active");
        }
        const isCreator = page.creatorId === authorId;
        const member = page.members[0];
        const canPost =
          member && ["OWNER", "ADMIN", "EDITOR"].includes(member.role);

        if (!isCreator && !canPost) {
          throw new ApiError(
            403,
            "You don't have permission to post to this page",
          );
        }
      }

      const hasContent = content && content.trim().length > 0;
      const hasMedia = media.length > 0;
      const hasPoll = pollData !== null;
      const hasLink = linkPreview !== null;

      if (!hasContent && !hasMedia && !hasPoll && !hasLink) {
        throw new ApiError(400, "Post must have content, media, poll, or link");
      }

      const hashtags = hasContent ? extractHashtags(content) : [];
      const mentions = hasContent ? extractMentions(content) : [];
      if (mentions.length > 0) {
        const mentionedUsers = await db.user.findMany({
          where: {
            username: { in: mentions },
            isActive: true,
          },
          select: { username: true },
        });

        const foundUsernames = mentionedUsers.map((u) => u.username);
        const invalidMentions = mentions.filter(
          (m) => !foundUsernames.includes(m),
        );

        if (invalidMentions.length > 0) {
          throw new ApiError(
            400,
            `Invalid mentions: @${invalidMentions.join(", @")}`,
          );
        }
      }

      return await db.$transaction(async (tx) => {
        let pollId = null;

        if (pollData && postType === "POLL") {
          const poll = await tx.poll.create({
            data: {
              question: pollData.question,
              expiresAt: pollData.expiresAt,
              isMultiple: pollData.isMultiple || false,
              options: {
                create: pollData.options.map((opt, idx) => ({
                  text: opt,
                  order: idx,
                })),
              },
            },
            include: {
              options: true,
            },
          });
          pollId = poll.id;
        }

        const post = await tx.post.create({
          data: {
            authorId,
            content: content?.trim() || null,
            postType,
            visibility,
            pageId,
            pollId,
            linkPreview: linkPreview
              ? JSON.parse(JSON.stringify(linkPreview))
              : null,
          },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                profilePhoto: true,
                headline: true,
              },
            },
            page: pageId
              ? {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    logo: true,
                    type: true,
                  },
                }
              : false,
            poll: pollId
              ? {
                  include: {
                    options: {
                      orderBy: { order: "asc" },
                    },
                  },
                }
              : false,
          },
        });

        if (media.length > 0) {
          await tx.postMedia.createMany({
            data: media.map((m) => ({
              postId: post.id,
              mediaType: m.mediaType,
              url: m.url,
              fileName: m.fileName,
              mime: m.mime,
              extension: m.extension,
              status: "READY",
            })),
          });
        }

        if (hashtags.length > 0) {
          await createHashtagAssociations(post.id, hashtags, tx);
        }

        if (mentions.length > 0) {
          await createMentionAssociations(post.id, mentions, authorId, tx);
        }

        const completePost = await tx.post.findUnique({
          where: { id: post.id },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                profilePhoto: true,
                headline: true,
              },
            },
            page: pageId
              ? {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    logo: true,
                    type: true,
                  },
                }
              : false,
            media: {
              orderBy: { createdAt: "asc" },
            },
            poll: pollId
              ? {
                  include: {
                    options: {
                      orderBy: { order: "asc" },
                    },
                  },
                }
              : false,
            hashtags: {
              include: {
                hashtag: {
                  select: { id: true, name: true },
                },
              },
              take: 10,
            },
            mentions: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    profilePhoto: true,
                  },
                },
              },
            },
          },
        });

        return completePost;
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;

      if (error.code === "P2002") {
        throw new ApiError(409, "Duplicate entry detected");
      }
      if (error.code === "P2003") {
        throw new ApiError(400, "Invalid reference - related record not found");
      }
      if (error.code === "P2025") {
        throw new ApiError(404, "Record not found");
      }

      console.error("Create post error:", error);
      throw new ApiError(500, `Failed to create post: ${error.message}`);
    }
  },

  updatePost: async ({ postId, userId, content, visibility }) => {
    try {
      const post = await db.post.findUnique({
        where: { id: postId },
        select: {
          id: true,
          authorId: true,
          pageId: true,
          isArchived: true,
          postType: true,
        },
      });

      if (!post) {
        throw new ApiError(404, "Post not found");
      }

      if (post.isArchived) {
        throw new ApiError(410, "Cannot update archived post");
      }

      if (post.authorId !== userId) {
        if (post.pageId) {
          const pageAccess = await checkPagePermission(post.pageId, userId);
          if (!pageAccess) {
            throw new ApiError(403, "Not authorized to edit this post");
          }
        } else {
          throw new ApiError(403, "Not authorized to edit this post");
        }
      }

      const hashtags = content ? extractHashtags(content) : [];
      const mentions = content ? extractMentions(content) : [];

      if (mentions.length > 0) {
        const mentionedUsers = await db.user.findMany({
          where: {
            username: { in: mentions },
            isActive: true,
          },
          select: { username: true },
        });

        const foundUsernames = mentionedUsers.map((u) => u.username);
        const invalidMentions = mentions.filter(
          (m) => !foundUsernames.includes(m),
        );

        if (invalidMentions.length > 0) {
          throw new ApiError(
            400,
            `Invalid mentions: @${invalidMentions.join(", @")}`,
          );
        }
      }

      const updatedPost = await db.$transaction(async (tx) => {
        await Promise.all([
          tx.postHashtag.deleteMany({ where: { postId } }),
          tx.postMention.deleteMany({ where: { postId } }),
        ]);

        const updated = await tx.post.update({
          where: { id: postId },
          data: {
            content: content?.trim() || null,
            visibility,
            isEdited: true,
            editedAt: new Date(),
          },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                profilePhoto: true,
                headline: true,
              },
            },
            page: post.pageId
              ? {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    logo: true,
                    type: true,
                  },
                }
              : false,
            media: {
              orderBy: { createdAt: "asc" },
            },
            poll: {
              include: {
                options: {
                  orderBy: { order: "asc" },
                },
              },
            },
            hashtags: {
              include: {
                hashtag: {
                  select: { id: true, name: true },
                },
              },
            },
            mentions: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    profilePhoto: true,
                  },
                },
              },
            },
          },
        });
        if (hashtags.length > 0) {
          await createHashtagAssociations(postId, hashtags, tx);
        }
        if (mentions.length > 0) {
          await createMentionAssociations(postId, mentions, userId, tx);
        }

        return updated;
      });

      return updatedPost;
    } catch (error) {
      if (error instanceof ApiError) throw error;

      if (error.code === "P2025") {
        throw new ApiError(404, "Post not found");
      }

      console.error("Update post error:", error);
      throw new ApiError(500, `Failed to update post: ${error.message}`);
    }
  },

  deletePost: async ({ postId, userId }) => {
    try {
      const post = await db.post.findUnique({
        where: { id: postId },
        select: {
          id: true,
          authorId: true,
          pageId: true,
          isArchived: true,
          pollId: true,
          media: {
            select: {
              id: true,
              url: true,
              mediaType: true,
            },
          },
        },
      });

      if (!post) {
        throw new ApiError(404, "Post not found");
      }

      if (post.isArchived) {
        throw new ApiError(410, "Post already deleted");
      }
      if (post.authorId !== userId) {
        if (post.pageId) {
          const pageAccess = await checkPagePermission(post.pageId, userId);
          if (!pageAccess) {
            throw new ApiError(403, "Not authorized to delete this post");
          }
        } else {
          throw new ApiError(403, "Not authorized to delete this post");
        }
      }

      const mediaDeletePromises = post.media.map(async (media) => {
        try {
          await deleteFromS3ByUrl(media.url);
          console.log(` Deleted media from S3: ${media.url}`);
        } catch (s3Error) {
          console.error(
            ` Failed to delete media from S3: ${media.url}`,
            s3Error,
          );
        }
      });

      await Promise.allSettled(mediaDeletePromises);

      await db.$transaction(async (tx) => {
        if (post.media.length > 0) {
          await tx.postMedia.deleteMany({
            where: { postId },
          });
        }

        if (post.pollId) {
          await tx.pollVote.deleteMany({
            where: {
              option: {
                pollId: post.pollId,
              },
            },
          });

          await tx.pollOption.deleteMany({
            where: { pollId: post.pollId },
          });

          await tx.poll.delete({
            where: { id: post.pollId },
          });
        }

        const postHashtags = await tx.postHashtag.findMany({
          where: { postId },
          select: { hashtagId: true },
        });

        if (postHashtags.length > 0) {
          await Promise.all(
            postHashtags.map((ph) =>
              tx.hashtag.update({
                where: { id: ph.hashtagId },
                data: { postCount: { decrement: 1 } },
              }),
            ),
          );

          await tx.postHashtag.deleteMany({ where: { postId } });
        }

        await tx.postMention.deleteMany({ where: { postId } });

        await tx.like.deleteMany({ where: { postId } });

        await tx.bookmark.deleteMany({ where: { postId } });

        await tx.share.deleteMany({ where: { postId } });

        const comments = await tx.comment.findMany({
          where: { postId },
          select: { id: true },
        });

        if (comments.length > 0) {
          await tx.commentLike.deleteMany({
            where: {
              commentId: { in: comments.map((c) => c.id) },
            },
          });
        }

        await tx.comment.deleteMany({ where: { postId } });

        await tx.post.delete({ where: { id: postId } });
      });

      return {
        success: true,
        message: "Post and all associated media deleted successfully",
        deletedMediaCount: post.media.length,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;

      if (error.code === "P2025") {
        throw new ApiError(404, "Post not found");
      }

      console.error("Delete post error:", error);
      throw new ApiError(500, `Failed to delete post: ${error.message}`);
    }
  },
  getMyPosts: async (userId, query = {}) => {
    try {
      const { skip, take, where, orderBy } = buildQueryOptions({
        page: query.page,
        limit: query.limit,
        search: query.search,
        searchFields: ["content"],
        sortBy: query.sortBy || "createdAt",
        order: query.order || "desc",
      });

      const filter = {
        authorId: userId,
        pageId: null,
        isArchived: false,
        ...(where || {}),
      };

      const [posts, shares, total] = await Promise.all([
        db.post.findMany({
          where: filter,
          skip,
          take,
          orderBy,
          include: {
            author: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                profilePhoto: true,
              },
            },
            media: {
              select: {
                id: true,
                url: true,
                mediaType: true,
              },
              orderBy: { createdAt: "asc" },
            },
            poll: {
              include: {
                options: { orderBy: { order: "asc" } },
              },
            },
            hashtags: {
              include: {
                hashtag: { select: { id: true, name: true } },
              },
            },
            mentions: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    profilePhoto: true,
                  },
                },
              },
            },
          },
        }),

        db.share.findMany({
          where: {
            userId,
            pageId: null,
          },
          include: {
            post: {
              include: {
                author: {
                  select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    profilePhoto: true,
                  },
                },
                media: {
                  select: {
                    id: true,
                    url: true,
                    mediaType: true,
                  },
                  orderBy: {
                    createdAt: "asc",
                  },
                },
                poll: {
                  include: {
                    options: {
                      orderBy: {
                        order: "asc",
                      },
                    },
                  },
                },
                hashtags: {
                  include: {
                    hashtag: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
                mentions: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                        profilePhoto: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        }),

        db.post.count({ where: filter }),
      ]);

      const repostedPosts = shares.map((share) => ({
        ...enrichPostPoll(share.post),
        isReposted: true,
        repostId: share.id,
        repostComment: share.comment,
        repostedAt: share.createdAt,
        createdAt: share.createdAt,
      }));

      const normalPosts = posts.map((post) => ({
        ...enrichPostPoll(post),
        isReposted: false,
      }));

      const mergedPosts = [
        ...normalPosts,
        ...repostedPosts,
      ];

      mergedPosts.sort(
        (a, b) =>
          new Date(b.createdAt) -
          new Date(a.createdAt)
      );

      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 10;

      const start = (page - 1) * limit;
      const end = start + limit;

      const paginatedPosts = mergedPosts.slice(
        start,
        end
      );

      return {
        data: paginatedPosts,
        pagination: {
          total: mergedPosts.length,
          page,
          limit,
          totalPages: Math.ceil(mergedPosts.length / limit),
        },
      };
    } catch (error) {
      console.error("Get my posts error:", error);
      throw new ApiError(500, `Failed to fetch posts: ${error.message}`);
    }
  },

  getPostById: async (postId, viewerId = null) => {
    const post = await db.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
            headline: true,
          },
        },
        media: {
          select: {
            id: true,
            url: true,
            mediaType: true,
          },
          orderBy: { createdAt: "asc" },
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
        poll: {
          include: {
            options: {
              include: {
                _count: {
                  select: { votes: true },
                },
                votes: viewerId
                  ? {
                      where: { voterId: viewerId },
                      select: { id: true },
                    }
                  : false,
              },
              orderBy: { order: "asc" },
            },
          },
        },
        hashtags: {
          include: {
            hashtag: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        mentions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                profilePhoto: true,
              },
            },
          },
        },
      },
    });

    if (!post || post.isArchived) {
      throw new ApiError(404, "Post not found");
    }

    if (viewerId) {
      const canView = await canViewPost(post, viewerId);
      if (!canView) {
        throw new ApiError(403, "Not authorized to view this post");
      }
    } else if (post.visibility !== "PUBLIC") {
      throw new ApiError(403, "Post is not public");
    }

    await db.post.update({
      where: { id: postId },
      data: { viewCount: { increment: 1 } },
    });

    let viewerContext = null;
    if (viewerId) {
      const [hasLiked, hasBookmarked] = await Promise.all([
        db.like.findFirst({
          where: { postId, userId: viewerId, pageId: null },
        }),
        db.bookmark.findUnique({
          where: { postId_userId: { postId, userId: viewerId } },
        }),
      ]);

      viewerContext = {
        hasLiked: !!hasLiked,
        hasBookmarked: !!hasBookmarked,
        canEdit: post.authorId === viewerId,
        canDelete: post.authorId === viewerId,
      };
    }

    return enrichPostPoll({
      ...post,
      viewerContext,
    });
  },

  getPostsByUser: async (userId, viewerId, query) => {
    const {
      skip,
      take,
      where: searchWhere,
      orderBy,
    } = buildQueryOptions({
      ...query,
      searchFields: ["content"],
      sortBy: query.sortBy || "createdAt",
      order: query.order || "desc",
    });

    let visibilityFilter = { visibility: "PUBLIC" };

    if (viewerId) {
      if (viewerId === userId) {
        visibilityFilter = {};
      } else {
        const isConnected = await db.connection.findFirst({
          where: {
            OR: [
              { senderId: viewerId, receiverId: userId, status: "ACCEPTED" },
              { senderId: userId, receiverId: viewerId, status: "ACCEPTED" },
            ],
          },
        });

        if (isConnected) {
          visibilityFilter = {
            OR: [{ visibility: "PUBLIC" }, { visibility: "CONNECTIONS_ONLY" }],
          };
        }
      }
    }

    const where = {
      authorId: userId,
      pageId:null,
      isArchived: false,
      ...visibilityFilter,
      ...searchWhere,
    };

    const [posts, shares, total] = await Promise.all([
      db.post.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
              headline: true,
            },
          },
          media: {
            select: {
              id: true,
              url: true,
              mediaType: true,
            },
            orderBy: { createdAt: "asc" },
          },
          page: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
            },
          },
          poll: {
            include: {
              options: {
                include: {
                  _count: { select: { votes: true } },
                  votes: viewerId
                    ? {
                        where: { voterId: viewerId },
                        select: { id: true },
                      }
                    : false,
                },
                orderBy: { order: "asc" },
              },
            },
          },
          hashtags: {
            include: {
              hashtag: { select: { id: true, name: true } },
            },
            
          },
        },
      }),

      db.share.findMany({
        where: {
          userId,
          pageId: null,
        },
        include: {
          post: {
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                  profilePhoto: true,
                  headline: true,
                },
              },
              media: {
                select: {
                  id: true,
                  url: true,
                  mediaType: true,
                },
                orderBy: {
                  createdAt: "asc",
                },
              },
              page: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  logo: true,
                },
              },
              poll: {
                include: {
                  options: {
                    include: {
                      _count: {
                        select: {
                          votes: true,
                        },
                      },
                      votes: viewerId
                        ? {
                            where: {
                              voterId: viewerId,
                            },
                            select: {
                              id: true,
                            },
                          }
                        : false,
                    },
                    orderBy: {
                      order: "asc",
                    },
                  },
                },
              },
              hashtags: {
                take: 5,
                include: {
                  hashtag: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      db.post.count({ where }),
    ]);

    const postsWithContext = viewerId
      ? await Promise.all(
          posts.map(async (post) => {
            const [hasLiked, hasBookmarked] = await Promise.all([
              db.like.findFirst({
                where: { postId: post.id, userId: viewerId, pageId: null },
              }),
              db.bookmark.findUnique({
                where: { postId_userId: { postId: post.id, userId: viewerId } },
              }),
            ]);

            return enrichPostPoll({
              ...post,
              viewerContext: {
                hasLiked: !!hasLiked,
                hasBookmarked: !!hasBookmarked,
                canEdit: post.authorId === viewerId,
                canDelete: post.authorId === viewerId,
              },
            });
          }),
        )
      : posts.map(enrichPostPoll);
    

    let repostedPosts = [];

    if (viewerId) {
      repostedPosts = await Promise.all(
        shares.map(async (share) => {
    
          const [hasLiked, hasBookmarked] = await Promise.all([
            db.like.findFirst({
              where: {
                postId: share.post.id,
                userId: viewerId,
                pageId: null,
              },
            }),
    
            db.bookmark.findUnique({
              where: {
                postId_userId: {
                  postId: share.post.id,
                  userId: viewerId,
                },
              },
            }),
          ]);
    
          return {
            ...enrichPostPoll({
              ...share.post,
              viewerContext: {
                hasLiked: !!hasLiked,
                hasBookmarked: !!hasBookmarked,
                canEdit: false,
                canDelete: false,
              },
            }),
            isReposted: true,
            repostId: share.id,
            repostComment: share.comment,
            repostedAt: share.createdAt,
            createdAt: share.createdAt,
          };
        })
      );
    } else {
      repostedPosts = shares.map((share) => ({
        ...enrichPostPoll(share.post),
        isReposted: true,
        repostId: share.id,
        repostComment: share.comment,
        repostedAt: share.createdAt,
        createdAt: share.createdAt,
      }));
    }

    const mergedPosts = [
      ...postsWithContext,
      ...repostedPosts,
    ];

    mergedPosts.sort(
      (a, b) =>
        new Date(b.createdAt) -
        new Date(a.createdAt)
    );

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedPosts = mergedPosts.slice(start, end);


    return {
      data: paginatedPosts,
      pagination: {
        total: mergedPosts.length,
        page,
        limit,
        totalPages: Math.ceil(mergedPosts.length / limit),
      },
    };
  },

  getPostsByHashtag: async (hashtagName, viewerId, query) => {
    const { skip, take, orderBy } = buildQueryOptions({
      ...query,
      sortBy: query.sortBy || "createdAt",
      order: query.order || "desc",
    });

    const hashtag = await db.hashtag.findUnique({
      where: { name: hashtagName.toLowerCase() },
    });

    if (!hashtag) {
      return {
        data: [],
        pagination: { total: 0, page: 1, limit: take, totalPages: 0 },
      };
    }

    const where = {
      isArchived: false,
      visibility: "PUBLIC",
      hashtags: {
        some: {
          hashtagId: hashtag.id,
        },
      },
    };

    const [posts, total] = await Promise.all([
      db.post.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
            },
          },
          hashtags: {
            include: {
              hashtag: { select: { id: true, name: true } },
            },
            take: 5,
          },
        },
      }),
      db.post.count({ where }),
    ]);

    return {
      data: posts,
      pagination: {
        total,
        page: Number(query.page) || 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  },

  likePost: async ({ postId, userId, pageId = null }) => {
    // 1. Permission check for page actors
    if (pageId) {
      const hasPermission = await checkPagePermission(pageId, userId);
      if (!hasPermission) {
        throw new ApiError(
          403,
          "You do not have permission to act as this page",
        );
      }
    }

    // 2. Fetch post and validate
    const post = await db.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        visibility: true,
        isArchived: true,
        likeCount: true,
        content: true,
        postType: true,
        media: true,
      },
    });

    if (!post || post.isArchived) {
      throw new ApiError(404, "Post not found");
    }

    const canView = await canViewPost(post, userId);
    if (!canView) {
      throw new ApiError(403, "Not authorized to like this post");
    }

    // 3. Check for existing like by this actor (user or page)
    const existingWhere = pageId
      ? { postId, pageId }
      : { postId, userId, pageId: null };

    const existing = await db.like.findFirst({ where: existingWhere });

    if (existing) {
      throw new ApiError(
        409,
        pageId
          ? "This page has already liked the post"
          : "You have already liked this post",
      );
    }

    // 4. Create like + increment count atomically
    let updatedLikeCount;

    try {
      const likeData = pageId ? { postId, userId, pageId } : { postId, userId };

      const [, updatedPost] = await db.$transaction([
        db.like.create({ data: likeData }),
        db.post.update({
          where: { id: postId },
          data: { likeCount: { increment: 1 } },
          select: { likeCount: true },
        }),
      ]);

      updatedLikeCount = updatedPost.likeCount;
    } catch (err) {
      // Race condition safety: two simultaneous requests both passed the pre-check
      if (err.code === "P2002") {
        throw new ApiError(
          409,
          pageId
            ? "This page has already liked the post"
            : "You have already liked this post",
        );
      }
      throw err;
    }

    const actor = await db.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        profilePhoto: true,
      },
    });
    
    const actorName =`${actor?.firstName ?? ""} ${actor?.lastName ?? ""}`.trim();
    const actorAvatar = actor?.profilePhoto;

    let preview = "";

    if (post.content?.trim()) {
      preview = post.content.length > 80? `${post.content.substring(0, 80)}...` : post.content;
    } else {
      switch (post.postType) {
        case "IMAGE":
          preview = "Photo";
          break;
        case "VIDEO":
          preview = "Video";
          break;
        case "DOCUMENT":
          preview = "Document";
          break;
        case "POLL":
          preview = "Poll";
          break;
        default: preview = "Post";
      }
    }
    

    // 5. Notify post author (non-blocking)
    if (post.authorId !== userId) {
      NotificationService.sendGrouped({
        recipientId: post.authorId,
        type: "POST_LIKE",
        category: "SOCIAL",
        title: "New like on your post",
        message: `liked your post: ${preview}`,
        actionUrl: `/post/${postId}`,
        actorId: userId,
        actorName,
        actorAvatar,
        actorPageId: pageId || undefined,
        entityType: "Post",
        entityId: postId,
        groupKey: `post:${postId}:like`,
      }).catch((err) =>
        console.error("Like notification failed:", err.message),
      );
    }

    return {
      postId,
      liked: true,
      likeCount: updatedLikeCount,
      actorType: pageId ? "page" : "user",
      actorId: pageId || userId,
    };
  },

  unlikePost: async ({ postId, userId, pageId = null }) => {
    if (pageId) {
      const hasPermission = await checkPagePermission(pageId, userId);
      if (!hasPermission) {
        throw new ApiError(
          403,
          "You do not have permission to act as this page",
        );
      }
      const existing = await db.like.findFirst({ where: { postId, pageId } });
      if (!existing) {
        throw new ApiError(404, "Like not found");
      }
      await db.$transaction([
        db.like.delete({ where: { id: existing.id } }),
        db.post.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
    } else {
      const existing = await db.like.findFirst({
        where: { postId, userId, pageId: null },
      });
      if (!existing) {
        throw new ApiError(404, "Like not found");
      }
      await db.$transaction([
        db.like.delete({ where: { id: existing.id } }),
        db.post.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
    }

    return { postId, liked: false };
  },

  getPostLikes: async (postId, query) => {
    const { skip, take } = buildQueryOptions(query);

    const [likes, total] = await Promise.all([
      db.like.findMany({
        where: { postId },
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
              headline: true,
            },
          },
          page: {
            select: { id: true, name: true, slug: true, logo: true },
          },
        },
      }),
      db.like.count({ where: { postId } }),
    ]);

    return {
      data: likes,
      pagination: {
        total,
        page: Number(query.page) || 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  },

  bookmarkPost: async ({ postId, userId, pageId = null }) => {
    if (pageId) {
      const hasPermission = await checkPagePermission(pageId, userId);
      if (!hasPermission) {
        throw new ApiError(
          403,
          "You do not have permission to act as this page",
        );
      }
    }

    const post = await db.post.findUnique({
      where: { id: postId },
      select: { id: true },
    });

    if (!post) {
      throw new ApiError(404, "Post not found");
    }

    if (pageId) {
      const existing = await db.bookmark.findFirst({
        where: { postId, pageId },
      });
      if (existing) {
        throw new ApiError(409, "Post already bookmarked by this page");
      }
      await db.bookmark.create({ data: { postId, userId, pageId } });
    } else {
      const existing = await db.bookmark.findUnique({
        where: { postId_userId: { postId, userId } },
      });
      if (existing) {
        throw new ApiError(409, "Post already bookmarked");
      }
      await db.bookmark.create({ data: { postId, userId } });
    }

    return { postId, bookmarked: true };
  },

  unbookmarkPost: async ({ postId, userId, pageId = null }) => {
    if (pageId) {
      const hasPermission = await checkPagePermission(pageId, userId);
      if (!hasPermission) {
        throw new ApiError(
          403,
          "You do not have permission to act as this page",
        );
      }
      const existing = await db.bookmark.findFirst({
        where: { postId, pageId },
      });
      if (!existing) {
        throw new ApiError(404, "Bookmark not found");
      }
      await db.bookmark.delete({ where: { id: existing.id } });
    } else {
      const existing = await db.bookmark.findUnique({
        where: { postId_userId: { postId, userId } },
      });
      if (!existing) {
        throw new ApiError(404, "Bookmark not found");
      }
      await db.bookmark.delete({
        where: { postId_userId: { postId, userId } },
      });
    }

    return { postId, bookmarked: false };
  },

  getBookmarkedPosts: async (userId, query, pageId = null) => {
    const { skip, take, orderBy } = buildQueryOptions({
      ...query,
      sortBy: "createdAt",
      order: "desc",
    });

    const whereClause = pageId ? { pageId } : { userId };

    const [bookmarks, total] = await Promise.all([
      db.bookmark.findMany({
        where: whereClause,
        skip,
        take,
        orderBy,
        include: {
          post: {
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                  profilePhoto: true,
                },
              },
              page: {
                select: { id: true, name: true, slug: true, logo: true },
              },
              hashtags: {
                include: {
                  hashtag: { select: { id: true, name: true } },
                },
                take: 5,
              },
              likes: {
                where: pageId
                  ? { pageId }
                  : { userId },
                select: {
                  id: true,
                },
              },
            },
          },
        },
      }),
      db.bookmark.count({ where: whereClause }),
    ]);

    return {
      data: bookmarks.map((b) => {
        const { likes, ...post } = b.post;
        return {
          ...post,
          hasLiked: likes.length > 0,
        };
      }),
      pagination: {
        total,
        page: Number(query.page) || 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  },
  addComment: async ({
    postId,
    authorId,
    content,
    parentId = null,
    pageId = null,
  }) => {
    if (!content || content.trim().length === 0) {
      throw new ApiError(400, "Comment content is required");
    }

    if (pageId) {
      const hasPermission = await checkPagePermission(pageId, authorId);
      if (!hasPermission) {
        throw new ApiError(
          403,
          "You do not have permission to act as this page",
        );
      }
    }

    const post = await db.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, visibility: true, content: true, postType: true },
    });

    if (!post) {
      throw new ApiError(404, "Post not found");
    }

    let preview = "";
    if (post.content?.trim()) {
      preview =
        post.content.length > 80
          ? `${post.content.substring(0, 80)}...`
          : post.content;
    } else {
      switch (post.postType) {
        case "IMAGE":
          preview = "Photo";
          break;
        case "VIDEO":
          preview = "Video";
          break;
        case "DOCUMENT":
          preview = "Document";
          break;
        case "POLL":
          preview = "Poll";
          break;

        default:
          preview = "Post";
      }
    }

    const canView = await canViewPost(post, authorId);
    if (!canView) {
      throw new ApiError(403, "Not authorized to comment on this post");
    }

    if (parentId) {
      const parentComment = await db.comment.findUnique({
        where: { id: parentId },
      });
      if (!parentComment || parentComment.postId !== postId) {
        throw new ApiError(404, "Parent comment not found");
      }
    }

    const commentData = { postId, authorId, content, parentId };
    if (pageId) commentData.pageId = pageId;

    const commentPreview = content.trim().length > 100
    ? `${content.trim().substring(0, 100)}...`
    : content.trim();

    const comment = await db.comment.create({
      data: commentData,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
        page: {
          select: { id: true, name: true, slug: true, logo: true },
        },
        _count: {
          select: { replies: true, likes: true },
        },
      },
    });

    let actorName;
    let actorAvatar;

    if (pageId) {
      actorName = comment.page?.name;
      actorAvatar = comment.page?.logo;
    } else {
      actorName =
        `${comment.author.firstName} ${comment.author.lastName}`.trim();
      actorAvatar = comment.author.profilePhoto;
    }
    console.log("actor name:",actorName);
    console.log("actor avatar:",actorAvatar)

    await db.post.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 } },
    });

    if (post.authorId !== authorId) {
      await NotificationService.sendGrouped({
        recipientId: post.authorId,
        type: "POST_COMMENT",
        category: "SOCIAL",
        title: "New comment on your post",
        message: `commented on your post: ${commentPreview}`,
        actionUrl: `/post/${postId}`,
        actorId: authorId,
        actorPageId: pageId || undefined,
        actorName,
        actorAvatar,
        entityType: "Post",
        entityId: postId,
        groupKey: `post:${postId}:comment`,
      });
    }

    return comment;
  },

  updateComment: async ({ commentId, userId, content, pageId = null }) => {
    const comment = await db.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new ApiError(404, "Comment not found");
    }

    if (pageId && comment.pageId === pageId) {
      const hasPermission = await checkPagePermission(pageId, userId);
      if (!hasPermission) {
        throw new ApiError(
          403,
          "You do not have permission to act as this page",
        );
      }
    } else if (comment.authorId !== userId) {
      throw new ApiError(403, "Not authorized to edit this comment");
    }

    return db.comment.update({
      where: { id: commentId },
      data: {
        content,
        isEdited: true,
        editedAt: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
        page: {
          select: { id: true, name: true, slug: true, logo: true },
        },
      },
    });
  },

  deleteComment: async ({ commentId, userId, pageId = null }) => {
    const comment = await db.comment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true, postId: true, pageId: true },
    });

    if (!comment) {
      throw new ApiError(404, "Comment not found");
    }

    if (pageId && comment.pageId === pageId) {
      const hasPermission = await checkPagePermission(pageId, userId);
      if (!hasPermission) {
        throw new ApiError(
          403,
          "You do not have permission to act as this page",
        );
      }
    } else if (comment.authorId !== userId) {
      throw new ApiError(403, "Not authorized to delete this comment");
    }

    await db.$transaction([
      db.comment.delete({
        where: { id: commentId },
      }),
      db.post.update({
        where: { id: comment.postId },
        data: { commentCount: { decrement: 1 } },
      }),
    ]);

    return { success: true };
  },

  getComments: async (postId, query, viewerId = null, viewerPageId = null) => {
    const { skip, take } = buildQueryOptions({
      ...query,
      limit: query.limit || 20,
    });

    const [comments, total] = await Promise.all([
      db.comment.findMany({
        where: { postId, parentId: null },
        skip,
        take,
        orderBy: { createdAt: query.order === "asc" ? "asc" : "desc" },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
            },
          },
          page: {
            select: { id: true, name: true, slug: true, logo: true },
          },
          replies: {
            take: 3,
            orderBy: { createdAt: "asc" },
            include: {
              author: {
                select: {
                  id: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                  profilePhoto: true,
                },
              },
              page: {
                select: { id: true, name: true, slug: true, logo: true },
              },
              _count: {
                select: { likes: true },
              },
            },
          },
          _count: {
            select: { replies: true, likes: true },
          },
        },
      }),
      db.comment.count({ where: { postId, parentId: null } }),
    ]);

    let viewerLikedCommentIds = new Set();
    const resolvedViewerId = viewerPageId || viewerId;
    if (resolvedViewerId) {
      const allCommentIds = comments.flatMap((c) => [
        c.id,
        ...c.replies.map((r) => r.id),
      ]);
      if (allCommentIds.length > 0) {
        const likeWhere = viewerPageId
          ? { commentId: { in: allCommentIds }, pageId: viewerPageId }
          : { commentId: { in: allCommentIds }, userId: viewerId };
        const liked = await db.commentLike.findMany({
          where: likeWhere,
          select: { commentId: true },
        });
        viewerLikedCommentIds = new Set(liked.map((l) => l.commentId));
      }
    }

    const enrichedComments = comments.map((c) => ({
      ...c,
      hasLiked: viewerLikedCommentIds.has(c.id),
      replies: c.replies.map((r) => ({
        ...r,
        hasLiked: viewerLikedCommentIds.has(r.id),
      })),
    }));

    return {
      data: enrichedComments,
      pagination: {
        total,
        page: Number(query.page) || 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  },

  getReplies: async (
    commentId,
    query,
    viewerId = null,
    viewerPageId = null,
  ) => {
    const { skip, take } = buildQueryOptions(query);

    const [replies, total] = await Promise.all([
      db.comment.findMany({
        where: { parentId: commentId },
        skip,
        take,
        orderBy: { createdAt: "asc" },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
            },
          },
          page: {
            select: { id: true, name: true, slug: true, logo: true },
          },
          _count: {
            select: { likes: true },
          },
        },
      }),
      db.comment.count({ where: { parentId: commentId } }),
    ]);

    let viewerLikedReplyIds = new Set();
    const resolvedViewerId = viewerPageId || viewerId;
    if (resolvedViewerId) {
      const replyIds = replies.map((r) => r.id);
      if (replyIds.length > 0) {
        const likeWhere = viewerPageId
          ? { commentId: { in: replyIds }, pageId: viewerPageId }
          : { commentId: { in: replyIds }, userId: viewerId };
        const liked = await db.commentLike.findMany({
          where: likeWhere,
          select: { commentId: true },
        });
        viewerLikedReplyIds = new Set(liked.map((l) => l.commentId));
      }
    }

    const enrichedReplies = replies.map((r) => ({
      ...r,
      hasLiked: viewerLikedReplyIds.has(r.id),
    }));

    return {
      data: enrichedReplies,
      pagination: {
        total,
        page: Number(query.page) || 1,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  },

  likeComment: async ({ commentId, userId, pageId = null }) => {
    if (pageId) {
      const hasPermission = await checkPagePermission(pageId, userId);
      if (!hasPermission) {
        throw new ApiError(
          403,
          "You do not have permission to act as this page",
        );
      }
      const existing = await db.commentLike.findFirst({
        where: { commentId, pageId },
      });
      if (existing) {
        throw new ApiError(409, "Comment already liked by this page");
      }
      await db.commentLike.create({ data: { commentId, userId, pageId } });
    } else {
      const existing = await db.commentLike.findUnique({
        where: { commentId_userId: { commentId, userId } },
      });
      if (existing) {
        throw new ApiError(409, "Comment already liked");
      }
      await db.commentLike.create({ data: { commentId, userId } });
    }

    return { commentId, liked: true };
  },

  unlikeComment: async ({ commentId, userId, pageId = null }) => {
    if (pageId) {
      const hasPermission = await checkPagePermission(pageId, userId);
      if (!hasPermission) {
        throw new ApiError(
          403,
          "You do not have permission to act as this page",
        );
      }
      const existing = await db.commentLike.findFirst({
        where: { commentId, pageId },
      });
      if (!existing) {
        throw new ApiError(404, "Like not found");
      }
      await db.commentLike.delete({ where: { id: existing.id } });
    } else {
      const existing = await db.commentLike.findUnique({
        where: { commentId_userId: { commentId, userId } },
      });
      if (!existing) {
        throw new ApiError(404, "Like not found");
      }
      await db.commentLike.delete({
        where: { commentId_userId: { commentId, userId } },
      });
    }

    return { commentId, liked: false };
  },

  sharePost: async ({ postId, userId, comment, pageId = null }) => {
    if (pageId) {
      const hasPermission = await checkPagePermission(pageId, userId);
      if (!hasPermission) {
        throw new ApiError(
          403,
          "You do not have permission to act as this page",
        );
      }
    }

    const post = await db.post.findUnique({
      where: { id: postId },
      select: { id: true, visibility: true, authorId: true, content: true, postType: true,},
    });

    if (!post) {
      throw new ApiError(404, "Post not found");
    }

    let preview = "";

    if (post.content?.trim()) {
      preview =
        post.content.length > 80
          ? `${post.content.substring(0, 80)}...`
          : post.content;
    } else {
      switch (post.postType) {
        case "IMAGE":
          preview = "Photo";
          break;
        case "VIDEO":
          preview = "Video";
          break;
        case "DOCUMENT":
          preview = "Document";
          break;
        case "POLL":
          preview = "Poll";
          break;
        default:
          preview = "Post";
      }
    }

    const canView = await canViewPost(post, userId);
    if (!canView) {
      throw new ApiError(403, "Not authorized to share this post");
    }

    const shareFilter = pageId ? { postId, pageId } : { postId, userId };
    const existingShares = await db.share.findMany({
      where: shareFilter,
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true },
    });

    if (existingShares.length >= 3) {
      throw new ApiError(400, "Maximum 3 shares per post allowed");
    }

    if (existingShares.length > 0) {
      const lastShare = existingShares[0];
      const hoursSinceLastShare =
        (Date.now() - new Date(lastShare.createdAt).getTime()) /
        (1000 * 60 * 60);

      if (hoursSinceLastShare < 24) {
        throw new ApiError(400, "You can reshare this post after 24 hours");
      }

      if (!comment || comment.trim().length === 0) {
        throw new ApiError(400, "Please add your thoughts when resharing");
      }
    }

    const shareData = { postId, userId, comment: comment?.trim() || null };
    if (pageId) shareData.pageId = pageId;

    await db.$transaction([
      db.share.create({ data: shareData }),
      db.post.update({
        where: { id: postId },
        data: { shareCount: { increment: 1 } },
      }),
    ]);

    let actorName;
    let actorAvatar;

    if (pageId) {
      const page = await db.page.findUnique({
        where: { id: pageId },
        select: {
          name: true,
          logo: true,
        },
      });

      actorName = page?.name;
      actorAvatar = page?.logo;
    } else {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          firstName: true,
          lastName: true,
          profilePhoto: true,
        },
      });

      actorName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
      actorAvatar = user?.profilePhoto;
    }

    if (post.authorId !== userId) {
      NotificationService.sendGrouped({
        recipientId: post.authorId,
        type: "POST_SHARE",
        category: "SOCIAL",
        title: "Someone shared your post",
        message: `shared your post: ${preview}`,
        actionUrl: `/post/${postId}`,
        actorId: userId,
        actorPageId: pageId || undefined,
        actorName,
        actorAvatar,
        entityType: "Post",
        entityId: postId,
        groupKey: `post:${postId}:share`,
      }).catch(() => {});
    }

    return { postId, shared: true };
  },

  votePoll: async ({ pollId, optionId, userId }) => {
    const poll = await db.poll.findUnique({
      where: { id: pollId },
      include: {
        options: true,
      },
    });

    if (!poll) {
      throw new ApiError(404, "Poll not found");
    }

    if (poll.expiresAt && new Date() > poll.expiresAt) {
      throw new ApiError(400, "Poll has expired");
    }

    const option = poll.options.find((o) => o.id === optionId);
    if (!option) {
      throw new ApiError(404, "Poll option not found");
    }

    const existingVotes = await db.pollVote.findMany({
      where: {
        voterId: userId,
        option: {
          pollId,
        },
      },
    });

    if (!poll.isMultiple && existingVotes.length > 0) {
      const existingVote = existingVotes[0];
      const minutesSinceVote =
        (Date.now() - new Date(existingVote.createdAt).getTime()) / (1000 * 60);

      if (minutesSinceVote > 5) {
        throw new ApiError(
          409,
          "Already voted on this poll. You can only change your vote within 5 minutes.",
        );
      }

      if (existingVote.optionId === optionId) {
        throw new ApiError(409, "You already voted for this option");
      }

      await db.$transaction(async (tx) => {
        await tx.pollVote.delete({ where: { id: existingVote.id } });
        await tx.pollVote.create({ data: { optionId, voterId: userId } });
      });

      const updatedPoll = await db.poll.findUnique({
        where: { id: pollId },
        include: {
          options: {
            include: {
              _count: { select: { votes: true } },
              votes: { where: { voterId: userId }, select: { id: true } },
            },
            orderBy: { order: "asc" },
          },
        },
      });

      return enrichPollData(updatedPoll);
    }

    await db.pollVote.create({
      data: {
        optionId,
        voterId: userId,
      },
    });

    const updatedPoll = await db.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          include: {
            _count: {
              select: { votes: true },
            },
            votes: {
              where: { voterId: userId },
              select: { id: true },
            },
          },
          orderBy: { order: "asc" },
        },
      },
    });

    return enrichPollData(updatedPoll);
  },

  pinPost: async ({ postId, userId }) => {
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { authorId: true, pageId: true, isPinned: true },
    });

    if (!post) throw new ApiError(404, "Post not found");
    if (post.authorId !== userId) {
      if (post.pageId) {
        const hasAccess = await checkPagePermission(post.pageId, userId);
        if (!hasAccess) throw new ApiError(403, "Not authorized");
      } else {
        throw new ApiError(403, "Not authorized");
      }
    }
    if (post.isPinned) {
      return { postId, pinned: true };
    }

    const pinScope = post.pageId
      ? { pageId: post.pageId }
      : { authorId: post.authorId };

    const pinnedCount = await db.post.count({
      where: {
        ...pinScope,
        isPinned: true,
        isArchived: false,
      },
    });

    if (pinnedCount >= 3) {
      throw new ApiError(400, "Maximum 3 pinned posts allowed");
    }

    await db.post.update({
      where: { id: postId },
      data: { isPinned: true },
    });

    return { postId, pinned: true };
  },

  unpinPost: async ({ postId, userId }) => {
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { authorId: true, pageId: true },
    });

    if (!post) throw new ApiError(404, "Post not found");

    if (post.authorId !== userId) {
      if (post.pageId) {
        const hasAccess = await checkPagePermission(post.pageId, userId);
        if (!hasAccess) throw new ApiError(403, "Not authorized");
      } else {
        throw new ApiError(403, "Not authorized");
      }
    }

    await db.post.update({
      where: { id: postId },
      data: { isPinned: false },
    });

    return { postId, pinned: false };
  },

  getStories: async (userId) => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. Get connection & following IDs in one go
    const [connections, following] = await Promise.all([
      db.connection.findMany({
        where: {
          status: "ACCEPTED",
          OR: [{ senderId: userId }, { receiverId: userId }],
        },
        select: { senderId: true, receiverId: true },
      }),
      db.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      }),
    ]);

    // Build unique user IDs set
    const userIds = new Set();
    userIds.add(userId); // Include own posts

    connections.forEach((c) => {
      if (c.senderId === userId) userIds.add(c.receiverId);
      else userIds.add(c.senderId);
    });

    following.forEach((f) => userIds.add(f.followingId));

    const authorIds = [...userIds];

    if (authorIds.length === 0) return [];

    // 2. Fetch posts from last 24hrs by these users
    const posts = await db.post.findMany({
      where: {
        authorId: { in: authorIds },
        createdAt: { gte: oneDayAgo },
        isArchived: false,
        visibility: { in: ["PUBLIC", "CONNECTIONS_ONLY"] },
      },
      select: {
        id: true,
        content: true,
        postType: true,
        createdAt: true,
        viewCount: true,
        likeCount: true,
        authorId: true,
        pageId: true,
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            profilePhoto: true,
            headline: true,
          },
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
        media: {
          select: {
            id: true,
            mediaType: true,
            url: true,
            width: true,
            height: true,
            duration: true,
          },
          orderBy: { order: "asc" },
        },
        
      },
      orderBy: { createdAt: "desc" },
    });

    // 3. Get which posts this user has already viewed + viewer context
    const postIds = posts.map((p) => p.id);
    const [viewedEngagements, likedPosts, bookmarkedPosts] = await Promise.all([
      db.postEngagement.findMany({
        where: { userId, postId: { in: postIds } },
        select: { postId: true },
      }),
      db.like.findMany({
        where: { userId, postId: { in: postIds } },
        select: { postId: true },
      }),
      db.bookmark.findMany({
        where: { userId, postId: { in: postIds } },
        select: { postId: true },
      }),
    ]);

    const viewedSet = new Set(viewedEngagements.map((e) => e.postId));
    const likedSet = new Set(likedPosts.map((l) => l.postId));
    const bookmarkedSet = new Set(bookmarkedPosts.map((b) => b.postId));

    // 4. Group by author and mark viewed status
    const authorMap = new Map();

    posts.forEach((post) => {
      const authorId = post.authorId;
      if (!authorMap.has(authorId)) {
        authorMap.set(authorId, {
          user: post.author,
          posts: [],
          hasUnviewed: false,
        });
      }

      const isViewed = viewedSet.has(post.id);
      const entry = authorMap.get(authorId);

      entry.posts.push({
        ...post,
        author: undefined,
        isViewed,
        viewerContext: {
          hasLiked: likedSet.has(post.id),
          hasBookmarked: bookmarkedSet.has(post.id),
          canDelete: post.authorId === userId,
        },
      });

      if (!isViewed) entry.hasUnviewed = true;
    });

    // 5. Sort: own stories first, then unviewed, then viewed
    const stories = [...authorMap.values()].sort((a, b) => {
      // Own posts first
      if (a.user.id === userId) return -1;
      if (b.user.id === userId) return 1;
      // Unviewed before viewed
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      // Latest first
      return new Date(b.posts[0].createdAt) - new Date(a.posts[0].createdAt);
    });

    return stories;
  },

  getPostAsEntity: async ({ postId, userId, viewerType, pageId }) => {
    if (viewerType === "page") {
      const hasPermission = await checkPagePermission(pageId, userId);
      if (!hasPermission) {
        throw new ApiError(
          403,
          "You do not have permission to act as this page",
        );
      }
    }

    const post = await db.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
            headline: true,
          },
        },
        media: {
          select: { id: true, url: true, mediaType: true },
          orderBy: { createdAt: "asc" },
        },
        page: {
          select: { id: true, name: true, slug: true, logo: true, type: true },
        },
        poll: {
          include: {
            options: {
              include: {
                _count: { select: { votes: true } },
                votes: {
                  where: { voterId: viewerType === "page" ? pageId : userId },
                  select: { id: true },
                },
              },
              orderBy: { order: "asc" },
            },
          },
        },
        hashtags: {
          include: {
            hashtag: { select: { id: true, name: true } },
          },
        },
        mentions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                profilePhoto: true,
              },
            },
          },
        },
      },
    });

    if (!post || post.isArchived) {
      throw new ApiError(404, "Post not found");
    }

    const canView = await canViewPost(post, userId);
    if (!canView) {
      throw new ApiError(403, "Not authorized to view this post");
    }

    let viewerContext;
    if (viewerType === "page") {
      const [pageLike, pageBookmark] = await Promise.all([
        db.like.findFirst({ where: { postId, pageId } }),
        db.bookmark.findFirst({ where: { postId, pageId } }),
      ]);
      viewerContext = {
        hasLiked: !!pageLike,
        hasBookmarked: !!pageBookmark,
        canEdit: post.pageId === pageId,
        canDelete: post.pageId === pageId,
      };
    } else {
      const [userLike, userBookmark] = await Promise.all([
        db.like.findFirst({ where: { postId, userId, pageId: null } }),
        db.bookmark.findUnique({
          where: { postId_userId: { postId, userId } },
        }),
      ]);
      viewerContext = {
        hasLiked: !!userLike,
        hasBookmarked: !!userBookmark,
        canEdit: post.authorId === userId,
        canDelete: post.authorId === userId,
      };
    }

    const comments = await db.comment.findMany({
      where: { postId, parentId: null },
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
        page: {
          select: { id: true, name: true, slug: true, logo: true },
        },
        replies: {
          take: 3,
          orderBy: { createdAt: "asc" },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                profilePhoto: true,
              },
            },
            page: {
              select: { id: true, name: true, slug: true, logo: true },
            },
            _count: { select: { likes: true } },
          },
        },
        _count: { select: { replies: true, likes: true } },
      },
    });

    const allCommentIds = comments.flatMap((c) => [
      c.id,
      ...c.replies.map((r) => r.id),
    ]);

    let likedCommentIds = new Set();
    if (allCommentIds.length > 0) {
      const likeWhere =
        viewerType === "page"
          ? { commentId: { in: allCommentIds }, pageId }
          : { commentId: { in: allCommentIds }, userId };
      const liked = await db.commentLike.findMany({
        where: likeWhere,
        select: { commentId: true },
      });
      likedCommentIds = new Set(liked.map((l) => l.commentId));
    }

    const enrichedComments = comments.map((c) => ({
      ...c,
      hasLiked: likedCommentIds.has(c.id),
      replies: c.replies.map((r) => ({
        ...r,
        hasLiked: likedCommentIds.has(r.id),
      })),
    }));

    let activeViewer;
    if (viewerType === "page") {
      const page = await db.page.findUnique({
        where: { id: pageId },
        select: { id: true, name: true, slug: true, logo: true, type: true },
      });
      activeViewer = { type: "page", ...page };
    } else {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          profilePhoto: true,
        },
      });
      activeViewer = { type: "user", ...user };
    }

    return enrichPostPoll({
      ...post,
      viewerContext,
      comments: enrichedComments,
      activeViewer,
    });
  },

  markViewed: async (userId, postId) => {
    if (!postId) throw new ApiError(400, "Post ID is required");

    // Upsert — don't create duplicate views
    const existing = await db.postEngagement.findFirst({
      where: { userId, postId },
    });

    if (existing) return { alreadyViewed: true };

    await db.postEngagement.create({
      data: {
        postId,
        userId,
        dwellTime: 1,
        scrollDepth: 100,
      },
    });

    // Increment view count
    await db.post.update({
      where: { id: postId },
      data: { viewCount: { increment: 1 } },
    });

    return { viewed: true };
  },
};

function enrichPollData(poll) {
  if (!poll) return null;

  const now = new Date();
  const isExpired = poll.expiresAt ? now > new Date(poll.expiresAt) : false;
  const totalVotes = poll.options.reduce((sum, opt) => {
    const count = opt._count?.votes ?? opt.voteCount ?? 0;
    return sum + count;
  }, 0);

  const enrichedOptions = poll.options.map((opt) => {
    const voteCount = opt._count?.votes ?? opt.voteCount ?? 0;
    return {
      ...opt,
      voteCount,
      percentage:
        totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0,
    };
  });

  return {
    ...poll,
    isExpired,
    totalVotes,
    options: enrichedOptions,
  };
}

function enrichPostPoll(post) {
  if (!post || !post.poll) return post;
  return { ...post, poll: enrichPollData(post.poll) };
}

function extractHashtags(text) {
  if (!text) return [];
  const hashtagRegex = /#[\w]+/g;
  const matches = text.match(hashtagRegex);
  return matches
    ? [...new Set(matches.map((tag) => tag.slice(1).toLowerCase()))]
    : [];
}

function extractMentions(text) {
  if (!text) return [];
  const mentionRegex = /@[\w]+/g;
  const matches = text.match(mentionRegex);
  return matches
    ? [...new Set(matches.map((mention) => mention.slice(1).toLowerCase()))]
    : [];
}

async function createHashtagAssociations(postId, hashtags, tx = db) {
  for (const tag of hashtags) {
    let hashtag = await tx.hashtag.findUnique({
      where: { name: tag },
    });

    if (!hashtag) {
      hashtag = await tx.hashtag.create({
        data: { name: tag, postCount: 0 },
      });
    }

    await tx.postHashtag.create({
      data: {
        postId,
        hashtagId: hashtag.id,
      },
    });

    await tx.hashtag.update({
      where: { id: hashtag.id },
      data: { postCount: { increment: 1 } },
    });
  }
}

async function createMentionAssociations(postId, mentions, authorId, tx = db) {
  const mentionedUserIds = [];

  for (const username of mentions) {
    const user = await tx.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (user) {
      await tx.postMention.create({
        data: {
          postId,
          userId: user.id,
        },
      });
      if (user.id !== authorId) {
        mentionedUserIds.push(user.id);
      }
    }
  }

  if (mentionedUserIds.length > 0) {
    NotificationService.sendBulk({
      recipientIds: mentionedUserIds,
      type: "POST_MENTION",
      category: "SOCIAL",
      title: "You were mentioned in a post",
      message: "Someone mentioned you in their post",
      actionUrl: `/post/${postId}`,
      actorId: authorId,
      entityType: "Post",
      entityId: postId,
    }).catch((err) =>
      console.error("Mention notification failed:", err.message),
    );
  }
}

async function canViewPost(post, userId) {
  if (post.visibility === "PUBLIC") return true;
  if (post.authorId === userId) return true;

  if (post.visibility === "CONNECTIONS_ONLY") {
    const connection = await db.connection.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: post.authorId, status: "ACCEPTED" },
          { senderId: post.authorId, receiverId: userId, status: "ACCEPTED" },
        ],
      },
    });
    return !!connection;
  }

  return false;
}

async function checkPagePermission(pageId, userId) {
  const member = await db.pageMember.findUnique({
    where: {
      pageId_userId: { pageId, userId },
    },
  });

  return member && ["OWNER", "ADMIN", "EDITOR"].includes(member.role);
}
