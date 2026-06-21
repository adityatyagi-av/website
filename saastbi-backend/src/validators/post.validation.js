import Joi from "joi";

export const PostValidation = {
  generateUploadUrl: {
    body: Joi.object({
      fileName: Joi.string().max(200).required(),
      fileType: Joi.string().required(),
      mediaType: Joi.string().valid("IMAGE", "VIDEO", "DOCUMENT").required(),
    }),
  },

  createPost: {
    body: Joi.object({
      content: Joi.string().max(5000).allow("", null),
      postType: Joi.string()
        .valid("TEXT", "IMAGE", "VIDEO", "DOCUMENT", "POLL", "ARTICLE", "LINK")
        .default("TEXT"),

      media: Joi.array()
        .items(
          Joi.object({
            url: Joi.string().uri().required(),
            mediaType: Joi.string()
              .valid("IMAGE", "VIDEO", "DOCUMENT")
              .required(),
            mime: Joi.string().required(),
            fileName: Joi.string().required(),
            extension: Joi.string().required(),
          })
        )
        .max(10)
        .default([]),

      visibility: Joi.string()
        .valid("PUBLIC", "CONNECTIONS_ONLY", "PRIVATE")
        .default("PUBLIC"),

      pageId: Joi.string().allow(null),

      pollData: Joi.object({
        question: Joi.string().required().max(500),
        options: Joi.array()
          .items(Joi.string().max(200))
          .min(2)
          .max(10)
          .required(),
        expiresAt: Joi.date().iso().greater("now").allow(null),
        isMultiple: Joi.boolean().default(false),
      }).allow(null),

      linkPreview: Joi.object({
        url: Joi.string().uri().required(),
        title: Joi.string().max(200),
        description: Joi.string().max(500),
        image: Joi.string().uri(),
        siteName: Joi.string().max(100),
      }).allow(null),
    }).custom((value, helpers) => {
      const { postType, media = [], pollData, linkPreview, content } = value;

      if (!content && media.length === 0 && !pollData && !linkPreview) {
        return helpers.error("any.invalid", {
          message: "Post must have content, media, poll, or link preview",
        });
      }

      if (postType === "IMAGE") {
        const images = media.filter((m) => m.mediaType === "IMAGE");
        if (images.length < 1 || images.length > 10) {
          return helpers.error("any.invalid", {
            message: "IMAGE posts must have 1-10 images",
          });
        }
        if (media.length !== images.length) {
          return helpers.error("any.invalid", {
            message: "IMAGE posts can only contain images",
          });
        }
      }

      if (postType === "VIDEO") {
        const videos = media.filter((m) => m.mediaType === "VIDEO");
        if (videos.length !== 1) {
          return helpers.error("any.invalid", {
            message: "VIDEO posts must have exactly 1 video",
          });
        }
        if (media.length !== 1) {
          return helpers.error("any.invalid", {
            message: "VIDEO posts can only contain one video",
          });
        }
      }

      if (postType === "DOCUMENT") {
        const docs = media.filter((m) => m.mediaType === "DOCUMENT");
        if (docs.length !== 1) {
          return helpers.error("any.invalid", {
            message: "DOCUMENT posts must have exactly 1 document",
          });
        }
        if (media.length !== 1) {
          return helpers.error("any.invalid", {
            message: "DOCUMENT posts can only contain one document",
          });
        }
      }

      if (postType === "POLL") {
        if (media.length > 0) {
          return helpers.error("any.invalid", {
            message: "POLL posts cannot contain media",
          });
        }
        if (!pollData) {
          return helpers.error("any.invalid", {
            message: "POLL posts must have poll data",
          });
        }
      }

      if (postType === "LINK") {
        if (!linkPreview) {
          return helpers.error("any.invalid", {
            message: "LINK posts must have link preview",
          });
        }
      }

      const bucketDomain = process.env.AWS_BUCKET_NAME;
      const region = process.env.AWS_REGION;

      for (const m of media) {
        const expectedPrefix = `https://${bucketDomain}.s3.${region}.amazonaws.com/`;
        if (!m.url.startsWith(expectedPrefix)) {
          return helpers.error("any.invalid", {
            message: `Media URL must be from allowed storage: ${m.url}`,
          });
        }
      }

      return value;
    }),
  },

  updatePost: {
    params: Joi.object({
      postId: Joi.string().required(),
    }),
    body: Joi.object({
      content: Joi.string().max(5000).allow(""),
      visibility: Joi.string().valid("PUBLIC", "CONNECTIONS_ONLY", "PRIVATE"),
    }).min(1),
  },

  getPostById: {
    params: Joi.object({
      postId: Joi.string().required(),
    }),
  },

  getFeed: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
      sortBy: Joi.string()
        .valid("createdAt", "likeCount", "commentCount")
        .default("createdAt"),
      order: Joi.string().valid("asc", "desc").default("desc"),
    }),
  },

  getPostsByUser: {
    params: Joi.object({
      userId: Joi.string().required(),
    }),
  },

  getPostsByHashtag: {
    params: Joi.object({
      hashtag: Joi.string()
        .regex(/^[\w]+$/)
        .required(),
    }),
  },

  deletePost: {
    params: Joi.object({
      postId: Joi.string().required(),
    }),
  },

  likePost: {
    params: Joi.object({
      postId: Joi.string().required(),
    }),
    query: Joi.object({
      sourceType: Joi.string().valid("post", "communityPost"),
    }),
    body: Joi.object({
      pageId: Joi.string().allow(null),
    }),
  },

  unlikePost: {
    params: Joi.object({
      postId: Joi.string().required(),
    }),
    query: Joi.object({
      sourceType: Joi.string().valid("post", "communityPost"),
      pageId: Joi.string().allow(null),
    }),
    body: Joi.object({
      pageId: Joi.string().allow(null),
    }),
  },

  getPostLikes: {
    params: Joi.object({
      postId: Joi.string().required(),
    }),
    query: Joi.object({
      sourceType: Joi.string().valid("post", "communityPost"),
      page: Joi.number().integer().min(1),
      limit: Joi.number().integer().min(1).max(50),
    }),
  },

  bookmarkPost: {
    params: Joi.object({
      postId: Joi.string().required(),
    }),
    query: Joi.object({
      sourceType: Joi.string().valid("post", "communityPost"),
    }),
    body: Joi.object({
      pageId: Joi.string().allow(null),
    }),
  },

  unbookmarkPost: {
    params: Joi.object({
      postId: Joi.string().required(),
    }),
    query: Joi.object({
      sourceType: Joi.string().valid("post", "communityPost"),
      pageId: Joi.string().allow(null),
    }),
  },

  addComment: {
    params: Joi.object({
      postId: Joi.string().required(),
    }),
    body: Joi.object({
      content: Joi.string().required().max(2000).trim(),
      parentId: Joi.string().allow(null),
      sourceType: Joi.string().valid("post", "communityPost"),
      pageId: Joi.string().allow(null),
    }),
  },

  updateComment: {
    params: Joi.object({
      commentId: Joi.string().required(),
    }),
    body: Joi.object({
      content: Joi.string().required().max(2000).trim(),
      sourceType: Joi.string().valid("post", "communityPost"),
      pageId: Joi.string().allow(null),
    }),
  },

  deleteComment: {
    params: Joi.object({
      commentId: Joi.string().required(),
    }),
    query: Joi.object({
      sourceType: Joi.string().valid("post", "communityPost"),
      pageId: Joi.string().allow(null),
    }),
  },

  getComments: {
    params: Joi.object({
      postId: Joi.string().required(),
    }),
    query: Joi.object({
      sourceType: Joi.string().valid("post", "communityPost"),
      page: Joi.number().integer().min(1),
      limit: Joi.number().integer().min(1).max(50),
      order: Joi.string().valid("asc", "desc"),
      viewerType: Joi.string().valid("user", "page"),
      pageId: Joi.string().allow(null),
    }),
  },

  getReplies: {
    params: Joi.object({
      commentId: Joi.string().required(),
    }),
    query: Joi.object({
      sourceType: Joi.string().valid("post", "communityPost"),
      page: Joi.number().integer().min(1),
      limit: Joi.number().integer().min(1).max(50),
      viewerType: Joi.string().valid("user", "page"),
      pageId: Joi.string().allow(null),
    }),
  },

  likeComment: {
    params: Joi.object({
      commentId: Joi.string().required(),
    }),
    query: Joi.object({
      sourceType: Joi.string().valid("post", "communityPost"),
    }),
    body: Joi.object({
      pageId: Joi.string().allow(null),
    }),
  },

  unlikeComment: {
    params: Joi.object({
      commentId: Joi.string().required(),
    }),
    query: Joi.object({
      sourceType: Joi.string().valid("post", "communityPost"),
      pageId: Joi.string().allow(null),
    }),
  },

  sharePost: {
    params: Joi.object({
      postId: Joi.string().required(),
    }),
    body: Joi.object({
      comment: Joi.string().max(500).allow("", null),
      sourceType: Joi.string().valid("post", "communityPost"),
      pageId: Joi.string().allow(null),
    }),
  },

  votePoll: {
    params: Joi.object({
      pollId: Joi.string().required(),
    }),
    body: Joi.object({
      optionId: Joi.string().required(),
    }),
  },

  pinPost: {
    params: Joi.object({
      postId: Joi.string().required(),
    }),
  },

  getPostAsEntity: {
    params: Joi.object({
      postId: Joi.string().required(),
    }),
    query: Joi.object({
      viewerType: Joi.string().valid("user", "page").required(),
      pageId: Joi.string().when("viewerType", {
        is: "page",
        then: Joi.required(),
        otherwise: Joi.forbidden(),
      }),
    }),
  },
};

export const validate = (schema) => {
  return (req, res, next) => {
    const toValidate = {};

    if (schema.params) toValidate.params = req.params;
    if (schema.query) toValidate.query = req.query;
    if (schema.body) toValidate.body = req.body;

    const { error, value } = Joi.object(schema).validate(toValidate, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    if (value.params) Object.assign(req.params, value.params);
    if (value.query) {
      for (const key of Object.keys(value.query)) {
        req.query[key] = value.query[key];
      }
    }
    if (value.body) req.body = value.body;

    next();
  };
};
