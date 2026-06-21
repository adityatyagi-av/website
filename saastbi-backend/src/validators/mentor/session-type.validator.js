import Joi from "joi";

export const SessionTypeValidation = {
  create: {
    body: Joi.object({
      name: Joi.string().max(100).required(),
      description: Joi.string().max(500),
      duration: Joi.number().integer().min(15).max(180).required(),
      price: Joi.number().min(0).required(),
      currency: Joi.string().length(3).default("INR"),
      isActive: Joi.boolean().default(true),
    }),
  },

  update: {
    params: Joi.object({
      sessionTypeId: Joi.string().required(),
    }),
    body: Joi.object({
      name: Joi.string().max(100),
      description: Joi.string().max(500),
      duration: Joi.number().integer().min(15).max(180),
      price: Joi.number().min(0),
      currency: Joi.string().length(3),
      isActive: Joi.boolean(),
    }).min(1),
  },

  delete: {
    params: Joi.object({
      sessionTypeId: Joi.string().required(),
    }),
  },

  toggle: {
    params: Joi.object({
      sessionTypeId: Joi.string().required(),
    }),
  },

  getByMentor: {
    params: Joi.object({
      mentorId: Joi.string().required(),
    }),
  },
};
