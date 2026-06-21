import Joi from "joi";

export const EcosystemMentorValidation = {
  discoverMentors: {
    query: Joi.object({
      search: Joi.string().max(100),
      expertise: Joi.alternatives().try(
        Joi.string(),
        Joi.array().items(Joi.string())
      ),
      industries: Joi.alternatives().try(
        Joi.string(),
        Joi.array().items(Joi.string())
      ),
      languages: Joi.alternatives().try(
        Joi.string(),
        Joi.array().items(Joi.string())
      ),
      minPrice: Joi.number().min(0),
      maxPrice: Joi.number().min(0),
      minRating: Joi.number().min(0).max(5),
      availability: Joi.string().valid("today", "this_week", "this_month"),
      sortBy: Joi.string().valid(
        "rating",
        "sessions",
        "price_low",
        "price_high",
        "newest"
      ),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(12),
    }),
  },

  getMentorById: {
    params: Joi.object({
      mentorId: Joi.string().required(),
    }),
  },

  getMentorAvailability: {
    params: Joi.object({
      mentorId: Joi.string().required(),
    }),
    query: Joi.object({
      date: Joi.date().iso().required(),
      sessionTypeId: Joi.string(),
    }),
  },

  getMentorReviews: {
    params: Joi.object({
      mentorId: Joi.string().required(),
    }),
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
    }),
  },

  bookSession: {
    params: Joi.object({
      mentorId: Joi.string().required(),
    }),
    body: Joi.object({
      sessionTypeId: Joi.string().required(),
      scheduledAt: Joi.date().iso().greater("now").required(),
      notes: Joi.string().max(1000),
      startupId: Joi.string(),
    }),
  },

  confirmPayment: {
    params: Joi.object({
      sessionId: Joi.string().required(),
    }),
    body: Joi.object({
      razorpayPaymentId: Joi.string().required(),
      razorpaySignature: Joi.string().required(),
    }),
  },

  listSessions: {
    query: Joi.object({
      status: Joi.string().valid(
        "PENDING",
        "CONFIRMED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED",
        "NO_SHOW",
        "RESCHEDULED"
      ),
      upcoming: Joi.string().valid("true", "false"),
      past: Joi.string().valid("true", "false"),
      startupId: Joi.string(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
    }),
  },

  getSessionById: {
    params: Joi.object({
      sessionId: Joi.string().required(),
    }),
  },

  cancelSession: {
    params: Joi.object({
      sessionId: Joi.string().required(),
    }),
    body: Joi.object({
      reason: Joi.string().max(500).required(),
    }),
  },

  rescheduleSession: {
    params: Joi.object({
      sessionId: Joi.string().required(),
    }),
    body: Joi.object({
      newScheduledAt: Joi.date().iso().greater("now").required(),
      reason: Joi.string().max(500),
    }),
  },

  submitReview: {
    params: Joi.object({
      sessionId: Joi.string().required(),
    }),
    body: Joi.object({
      rating: Joi.number().integer().min(1).max(5).required(),
      comment: Joi.string().max(2000),
    }),
  },

  subscribeToPackage: {
    params: Joi.object({
      packageId: Joi.string().required(),
    }),
    body: Joi.object({
      startupId: Joi.string(),
    }),
  },

  confirmPackagePayment: {
    params: Joi.object({
      subscriptionId: Joi.string().required(),
    }),
    body: Joi.object({
      razorpayPaymentId: Joi.string().required(),
      razorpaySignature: Joi.string().required(),
    }),
  },

  listPackages: {
    query: Joi.object({
      status: Joi.string().valid(
        "ACTIVE",
        "PAUSED",
        "EXPIRED",
        "CANCELLED",
        "COMPLETED",
        "PAYMENT_PENDING"
      ),
      startupId: Joi.string(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
    }),
  },

  requestMentorship: {
    params: Joi.object({
      mentorId: Joi.string().required(),
    }),
    body: Joi.object({
      goals: Joi.array().items(Joi.string().max(200)).max(10),
      message: Joi.string().max(2000),
      startupId: Joi.string(),
    }),
  },

  listMentorships: {
    query: Joi.object({
      status: Joi.string().valid(
        "PENDING",
        "ACTIVE",
        "PAUSED",
        "COMPLETED",
        "ENDED"
      ),
      startupId: Joi.string(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
    }),
  },

  getMentorshipById: {
    params: Joi.object({
      mentorshipId: Joi.string().required(),
    }),
  },

  endMentorship: {
    params: Joi.object({
      mentorshipId: Joi.string().required(),
    }),
    body: Joi.object({
      reason: Joi.string().max(500),
    }),
  },

  saveMentor: {
    params: Joi.object({
      mentorId: Joi.string().required(),
    }),
  },
};

export const validate = (schema) => {
  return (req, res, next) => {
    const validations = [];

    if (schema.params) {
      validations.push(
        schema.params.validateAsync(req.params, { abortEarly: false })
      );
    }
    if (schema.query) {
      validations.push(
        schema.query.validateAsync(req.query, { abortEarly: false })
      );
    }
    if (schema.body) {
      validations.push(
        schema.body.validateAsync(req.body, { abortEarly: false })
      );
    }

    Promise.all(validations)
      .then(() => next())
      .catch((error) => {
        const errors = error.details?.map((detail) => detail.message) || [
          error.message,
        ];
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors,
        });
      });
  };
};
