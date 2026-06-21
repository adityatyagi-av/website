import Joi from "joi";

export const PackageValidation = {
  create: {
    body: Joi.object({
      name: Joi.string().max(100).required(),
      description: Joi.string().max(1000),
      packageType: Joi.string().valid("SESSIONS_BUNDLE", "SUBSCRIPTION").required(),
      sessionsIncluded: Joi.number().integer().min(1).max(50).required(),
      sessionDuration: Joi.number().integer().min(15).max(180),
      validityDays: Joi.number().integer().min(7).max(365).required(),
      price: Joi.number().min(0).required(),
      originalPrice: Joi.number().min(0),
      currency: Joi.string().length(3).default("INR"),
      discountPercent: Joi.number().min(0).max(100),
      features: Joi.array().items(Joi.string().max(100)).max(10).default([]),
      includesChat: Joi.boolean().default(false),
      includesPriorityBooking: Joi.boolean().default(false),
      isActive: Joi.boolean().default(true),
      displayOrder: Joi.number().integer().min(0).default(0),
    }),
  },

  update: {
    params: Joi.object({
      packageId: Joi.string().required(),
    }),
    body: Joi.object({
      name: Joi.string().max(100),
      description: Joi.string().max(1000),
      sessionsIncluded: Joi.number().integer().min(1).max(50),
      sessionDuration: Joi.number().integer().min(15).max(180),
      validityDays: Joi.number().integer().min(7).max(365),
      price: Joi.number().min(0),
      originalPrice: Joi.number().min(0),
      discountPercent: Joi.number().min(0).max(100),
      features: Joi.array().items(Joi.string().max(100)).max(10),
      includesChat: Joi.boolean(),
      includesPriorityBooking: Joi.boolean(),
      isActive: Joi.boolean(),
      displayOrder: Joi.number().integer().min(0),
    }).min(1),
  },

  delete: {
    params: Joi.object({
      packageId: Joi.string().required(),
    }),
  },

  getByMentor: {
    params: Joi.object({
      mentorId: Joi.string().required(),
    }),
  },

  subscribe: {
    params: Joi.object({
      mentorId: Joi.string().required(),
      packageId: Joi.string().required(),
    }),
    body: Joi.object({
      subscriberType: Joi.string().valid("USER", "STARTUP").default("USER"),
      startupId: Joi.string().when("subscriberType", {
        is: "STARTUP",
        then: Joi.required(),
        otherwise: Joi.forbidden(),
      }),
    }),
  },

  getSubscriptions: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
      status: Joi.string().valid("ACTIVE", "PAUSED", "EXPIRED", "CANCELLED", "COMPLETED"),
    }),
  },
};
