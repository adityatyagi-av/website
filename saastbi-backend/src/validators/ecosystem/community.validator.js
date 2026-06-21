import Joi from "joi";

const COMMUNITY_CATEGORIES = [
  "TECHNOLOGY", "STARTUP", "DESIGN", "MARKETING", "FINANCE",
  "HEALTHCARE", "EDUCATION", "AI_ML", "BLOCKCHAIN", "SUSTAINABILITY",
  "CAREER", "GENERAL",
];
const COMMUNITY_VISIBILITIES = ["PUBLIC", "PRIVATE", "HIDDEN"];
const COMMUNITY_ROLES = ["OWNER", "ADMIN", "MODERATOR", "MEMBER"];
const POST_TYPES = ["TEXT", "IMAGE", "VIDEO", "POLL", "LINK", "ARTICLE", "QUESTION", "ANNOUNCEMENT"];
const NOTIFICATION_PREFS = ["ALL", "MENTIONS_ONLY", "NONE"];
const REPORT_REASONS = [
  "SPAM", "HARASSMENT", "INAPPROPRIATE_CONTENT", "MISINFORMATION",
  "IMPERSONATION", "INTELLECTUAL_PROPERTY", "OTHER",
];
const BAN_ACTIONS = ["BAN", "UNBAN", "MUTE", "UNMUTE", "WARN"];

export const CommunityValidation = {
  createCommunity: {
    body: Joi.object({
      name: Joi.string().min(2).max(100).required(),
      description: Joi.string().max(2000).allow("", null),
      about: Joi.string().max(10000).allow("", null),
      category: Joi.string().valid(...COMMUNITY_CATEGORIES).required(),
      visibility: Joi.string().valid(...COMMUNITY_VISIBILITIES).default("PUBLIC"),
      tags: Joi.array().items(Joi.string().max(50)).max(20),
      guidelines: Joi.string().max(5000).allow("", null),
      website: Joi.string().uri().allow("", null),
      location: Joi.string().max(200).allow("", null),
      industry: Joi.string().max(100).allow("", null),
      joinApproval: Joi.boolean().default(false),
      requireQuestions: Joi.boolean().default(false),
      requirePostApproval: Joi.boolean().default(false),
      maxMembers: Joi.number().integer().min(2).allow(null),
      bannerColor: Joi.string().max(20).allow("", null),
      coverImage: Joi.string().allow("", null),
      logo: Joi.string().allow("", null),
    }),
  },

  updateCommunity: {
    params: Joi.object({ communityId: Joi.string().required() }),
    body: Joi.object({
      name: Joi.string().min(2).max(100),
      description: Joi.string().max(2000).allow("", null),
      about: Joi.string().max(10000).allow("", null),
      category: Joi.string().valid(...COMMUNITY_CATEGORIES),
      visibility: Joi.string().valid(...COMMUNITY_VISIBILITIES),
      tags: Joi.array().items(Joi.string().max(50)).max(20),
      guidelines: Joi.string().max(5000).allow("", null),
      website: Joi.string().uri().allow("", null),
      location: Joi.string().max(200).allow("", null),
      industry: Joi.string().max(100).allow("", null),
      joinApproval: Joi.boolean(),
      autoApproveMembers: Joi.boolean(),
      requireQuestions: Joi.boolean(),
      requirePostApproval: Joi.boolean(),
      maxMembers: Joi.number().integer().min(2).allow(null),
      bannerColor: Joi.string().max(20).allow("", null),
      coverImage: Joi.string().allow("", null),
      logo: Joi.string().allow("", null),
    }),
  },

  createChannel: {
    params: Joi.object({ communityId: Joi.string().required() }),
    body: Joi.object({
      name: Joi.string().min(1).max(50).required(),
      description: Joi.string().max(500).allow("", null),
      isReadOnly: Joi.boolean().default(false),
    }),
  },

  updateChannel: {
    params: Joi.object({ channelId: Joi.string().required() }),
    body: Joi.object({
      name: Joi.string().min(1).max(50),
      description: Joi.string().max(500).allow("", null),
      isReadOnly: Joi.boolean(),
    }),
  },

  reorderChannels: {
    params: Joi.object({ communityId: Joi.string().required() }),
    body: Joi.object({
      orderedIds: Joi.array().items(Joi.string()).min(1).required(),
    }),
  },

  createRule: {
    params: Joi.object({ communityId: Joi.string().required() }),
    body: Joi.object({
      title: Joi.string().min(1).max(200).required(),
      description: Joi.string().min(1).max(2000).required(),
    }),
  },

  updateRule: {
    params: Joi.object({ ruleId: Joi.string().required() }),
    body: Joi.object({
      title: Joi.string().min(1).max(200),
      description: Joi.string().min(1).max(2000),
    }),
  },

  reorderRules: {
    params: Joi.object({ communityId: Joi.string().required() }),
    body: Joi.object({
      orderedIds: Joi.array().items(Joi.string()).min(1).required(),
    }),
  },

  createJoinQuestion: {
    params: Joi.object({ communityId: Joi.string().required() }),
    body: Joi.object({
      questionText: Joi.string().min(1).max(500).required(),
      isRequired: Joi.boolean().default(true),
    }),
  },

  updateJoinQuestion: {
    params: Joi.object({ questionId: Joi.string().required() }),
    body: Joi.object({
      questionText: Joi.string().min(1).max(500),
      isRequired: Joi.boolean(),
    }),
  },

  createPost: {
    params: Joi.object({ communityId: Joi.string().required() }),
    body: Joi.object({
      title: Joi.string().max(300).allow("", null),
      content: Joi.string().max(10000).required(),
      postType: Joi.string().valid(...POST_TYPES).default("TEXT"),
      channelId: Joi.string().allow(null),
      mediaUrls: Joi.array().items(Joi.string()).max(10),
      linkPreview: Joi.object().allow(null),
      poll: Joi.object({
        question: Joi.string().max(500).required(),
        options: Joi.array().items(Joi.string().max(200)).min(2).max(10).required(),
        isMultiple: Joi.boolean().default(false),
        expiresAt: Joi.date().iso().greater("now").allow(null),
      }).allow(null),
    }),
  },

  updatePost: {
    params: Joi.object({ postId: Joi.string().required() }),
    body: Joi.object({
      title: Joi.string().max(300).allow("", null),
      content: Joi.string().max(10000),
      mediaUrls: Joi.array().items(Joi.string()).max(10),
      linkPreview: Joi.object().allow(null),
    }),
  },

  createComment: {
    params: Joi.object({ postId: Joi.string().required() }),
    body: Joi.object({
      content: Joi.string().min(1).max(5000).required(),
      parentId: Joi.string().allow(null),
    }),
  },

  updateComment: {
    params: Joi.object({ commentId: Joi.string().required() }),
    body: Joi.object({
      content: Joi.string().min(1).max(5000).required(),
    }),
  },

  inviteMember: {
    params: Joi.object({ communityId: Joi.string().required() }),
    body: Joi.object({
      userId: Joi.string().allow(null),
      email: Joi.string().email().allow(null),
      message: Joi.string().max(500).allow("", null),
    }).or("userId", "email"),
  },

  changeMemberRole: {
    params: Joi.object({ memberId: Joi.string().required() }),
    body: Joi.object({
      role: Joi.string().valid(...COMMUNITY_ROLES).required(),
    }),
  },

  banMember: {
    params: Joi.object({ memberId: Joi.string().required() }),
    body: Joi.object({
      reason: Joi.string().max(1000).required(),
      duration: Joi.number().integer().min(1).allow(null),
    }),
  },

  muteMember: {
    params: Joi.object({ memberId: Joi.string().required() }),
    body: Joi.object({
      reason: Joi.string().max(1000).allow("", null),
      duration: Joi.number().integer().min(1).required(),
    }),
  },

  warnMember: {
    params: Joi.object({ memberId: Joi.string().required() }),
    body: Joi.object({
      reason: Joi.string().max(1000).required(),
    }),
  },

  reportContent: {
    body: Joi.object({
      reason: Joi.string().valid(...REPORT_REASONS).required(),
      description: Joi.string().max(2000).allow("", null),
    }),
  },

  reviewReport: {
    params: Joi.object({ reportId: Joi.string().required() }),
    body: Joi.object({
      status: Joi.string().valid("UNDER_REVIEW", "RESOLVED", "DISMISSED").required(),
      resolution: Joi.string().max(2000).allow("", null),
    }),
  },

  votePoll: {
    params: Joi.object({ pollId: Joi.string().required() }),
    body: Joi.object({
      optionId: Joi.string().required(),
    }),
  },

  discoverCommunities: {
    query: Joi.object({
      search: Joi.string().max(200),
      category: Joi.string().valid(...COMMUNITY_CATEGORIES),
      sortBy: Joi.string().valid("members", "activity", "newest").default("members"),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(12),
    }),
  },

  notificationPreference: {
    params: Joi.object({ communityId: Joi.string().required() }),
    body: Joi.object({
      preference: Joi.string().valid(...NOTIFICATION_PREFS).required(),
    }),
  },

  bulkModerate: {
    params: Joi.object({ communityId: Joi.string().required() }),
    body: Joi.object({
      itemIds: Joi.array().items(Joi.string()).min(1).max(50).required(),
      action: Joi.string().valid("approve", "reject").required(),
      type: Joi.string().valid("posts", "reports").required(),
    }),
  },

  transferOwnership: {
    params: Joi.object({ communityId: Joi.string().required() }),
    body: Joi.object({
      newOwnerId: Joi.string().required(),
    }),
  },

  updateMembershipRules: Joi.object({
    params: Joi.object({
      communityId: Joi.string().required(),
    }),
  
    body: Joi.object({
      joinApproval: Joi.boolean().optional(),
      requireQuestions: Joi.boolean().optional(),
      requirePostApproval: Joi.boolean().optional(),
      maxMembers: Joi.number()
        .integer()
        .positive()
        .allow(null)
        .optional(),
    }),
  }),
};

export const validate = (schema) => {
  return (req, res, next) => {
    const validations = [];

    if (schema.params) {
      validations.push(schema.params.validateAsync(req.params, { abortEarly: false }));
    }
    if (schema.query) {
      validations.push(schema.query.validateAsync(req.query, { abortEarly: false }));
    }
    if (schema.body) {
      validations.push(schema.body.validateAsync(req.body, { abortEarly: false }));
    }

    Promise.all(validations)
      .then(() => next())
      .catch((error) => {
        const errors = error.details?.map((detail) => detail.message) || [error.message];
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors,
        });
      });
  };
};
