import Joi from "joi";

export const SessionValidation = {
  book: {
    params: Joi.object({
      mentorId: Joi.string().required(),
    }),
    body: Joi.object({
      sessionTypeId: Joi.string().required(),
      startTime: Joi.date().iso().required(),
      agenda: Joi.string().max(1000),
      preSessionNotes: Joi.string().max(2000),
      packageSubscriptionId: Joi.string(),
      menteeType: Joi.string().valid("USER", "STARTUP").default("USER"),
      startupId: Joi.string().when("menteeType", {
        is: "STARTUP",
        then: Joi.required(),
        otherwise: Joi.forbidden(),
      }),
    }),
  },

  confirm: {
    params: Joi.object({
      sessionId: Joi.string().required(),
    }),
    body: Joi.object({
      notes: Joi.string().max(500),
    }),
  },

  decline: {
    params: Joi.object({
      sessionId: Joi.string().required(),
    }),
    body: Joi.object({
      reason: Joi.string().max(500).required(),
    }),
  },

  cancel: {
    params: Joi.object({
      sessionId: Joi.string().required(),
    }),
    body: Joi.object({
      reason: Joi.string().max(500).required(),
    }),
  },

  reschedule: {
    params: Joi.object({
      sessionId: Joi.string().required(),
    }),
    body: Joi.object({
      newStartTime: Joi.date().iso().required(),
      reason: Joi.string().max(500),
    }),
  },

  updateNotes: {
    params: Joi.object({
      sessionId: Joi.string().required(),
    }),
    body: Joi.object({
      sessionNotes: Joi.string().max(5000),
      actionItems: Joi.array().items(
        Joi.object({
          title: Joi.string().max(200).required(),
          description: Joi.string().max(500),
          dueDate: Joi.date().iso(),
          assignedTo: Joi.string().valid("MENTOR", "MENTEE"),
          isCompleted: Joi.boolean().default(false),
        })
      ),
    }).min(1),
  },

  complete: {
    params: Joi.object({
      sessionId: Joi.string().required(),
    }),
    body: Joi.object({
      sessionNotes: Joi.string().max(5000),
      actionItems: Joi.array().items(
        Joi.object({
          title: Joi.string().max(200).required(),
          description: Joi.string().max(500),
          dueDate: Joi.date().iso(),
          assignedTo: Joi.string().valid("MENTOR", "MENTEE"),
        })
      ),
    }),
  },

  extend: {
    params: Joi.object({
      sessionId: Joi.string().required(),
    }),
    body: Joi.object({
      extensionMinutes: Joi.number().integer().min(5).max(30).required(),
      isFree: Joi.boolean().default(true),
    }),
  },

  getById: {
    params: Joi.object({
      sessionId: Joi.string().required(),
    }),
  },

  list: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
      status: Joi.alternatives().try(
        Joi.array().items(
          Joi.string().valid(
            "PENDING",
            "CONFIRMED",
            "IN_PROGRESS",
            "COMPLETED",
            "CANCELLED",
            "NO_SHOW",
            "RESCHEDULED"
          )
        ),
        Joi.string().valid(
          "PENDING",
          "CONFIRMED",
          "IN_PROGRESS",
          "COMPLETED",
          "CANCELLED",
          "NO_SHOW",
          "RESCHEDULED"
        )
      ),
      timeframe: Joi.string().valid("upcoming", "past", "all").default("all"),
      startDate: Joi.date().iso(),
      endDate: Joi.date().iso(),
      sortBy: Joi.string().valid("startTime", "createdAt").default("startTime"),
      order: Joi.string().valid("asc", "desc").default("asc"),
    }),
  },

  review: {
    params: Joi.object({
      sessionId: Joi.string().required(),
    }),
    body: Joi.object({
      rating: Joi.number().integer().min(1).max(5).required(),
      review: Joi.string().max(1000),
      isPublic: Joi.boolean().default(true),
    }),
  },

  markNoShow: {
    params: Joi.object({
      sessionId: Joi.string().required(),
    }),
  },
};
