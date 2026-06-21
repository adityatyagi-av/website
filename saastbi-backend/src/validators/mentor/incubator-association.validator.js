import Joi from "joi";

export const IncubatorAssociationValidation = {
  apply: {
    params: Joi.object({
      tenantId: Joi.string().required(),
    }),
    body: Joi.object({
      proposedRate: Joi.number().min(0),
      notes: Joi.string().max(1000),
    }),
  },

  respond: {
    params: Joi.object({
      associationId: Joi.string().required(),
    }),
    body: Joi.object({
      action: Joi.string().valid("ACCEPT", "DECLINE").required(),
      notes: Joi.string().max(500),
    }),
  },

  invite: {
    params: Joi.object({
      mentorId: Joi.string().required(),
    }),
    body: Joi.object({
      paymentModel: Joi.string()
        .valid("INCUBATOR_PAYS", "STARTUP_PAYS", "SUBSIDIZED", "RETAINER", "FREE")
        .required(),
      agreedRate: Joi.number().min(0),
      retainerAmount: Joi.number().min(0),
      retainerHours: Joi.number().min(0),
      incubatorSharePercent: Joi.number().min(0).max(100),
      startDate: Joi.date().iso(),
      endDate: Joi.date().iso(),
      isExclusive: Joi.boolean().default(false),
      autoApproveBookings: Joi.boolean().default(false),
      notes: Joi.string().max(1000),
    }),
  },

  approve: {
    params: Joi.object({
      associationId: Joi.string().required(),
    }),
    body: Joi.object({
      paymentModel: Joi.string()
        .valid("INCUBATOR_PAYS", "STARTUP_PAYS", "SUBSIDIZED", "RETAINER", "FREE")
        .required(),
      agreedRate: Joi.number().min(0),
      retainerAmount: Joi.number().min(0),
      retainerHours: Joi.number().min(0),
      incubatorSharePercent: Joi.number().min(0).max(100),
      notes: Joi.string().max(500),
    }),
  },

  reject: {
    params: Joi.object({
      associationId: Joi.string().required(),
    }),
    body: Joi.object({
      reason: Joi.string().max(500).required(),
    }),
  },

  update: {
    params: Joi.object({
      associationId: Joi.string().required(),
    }),
    body: Joi.object({
      paymentModel: Joi.string()
        .valid("INCUBATOR_PAYS", "STARTUP_PAYS", "SUBSIDIZED", "RETAINER", "FREE"),
      agreedRate: Joi.number().min(0),
      retainerAmount: Joi.number().min(0),
      retainerHours: Joi.number().min(0),
      incubatorSharePercent: Joi.number().min(0).max(100),
      endDate: Joi.date().iso(),
      autoApproveBookings: Joi.boolean(),
      notes: Joi.string().max(1000),
    }).min(1),
  },

  end: {
    params: Joi.object({
      associationId: Joi.string().required(),
    }),
    body: Joi.object({
      reason: Joi.string().max(500).required(),
    }),
  },

  list: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
      status: Joi.string().valid("PENDING", "ACTIVE", "PAUSED", "ENDED", "REJECTED"),
    }),
  },

  getUsage: {
    params: Joi.object({
      associationId: Joi.string().required(),
    }),
    query: Joi.object({
      month: Joi.number().integer().min(1).max(12),
      year: Joi.number().integer().min(2020).max(2100),
    }),
  },
};
