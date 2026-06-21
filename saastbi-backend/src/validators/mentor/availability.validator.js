import Joi from "joi";

const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

export const AvailabilityValidation = {
  setAvailability: {
    body: Joi.object({
      slots: Joi.array()
        .items(
          Joi.object({
            dayOfWeek: Joi.string()
              .valid("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY")
              .required(),
            startTime: Joi.string().pattern(timePattern).required(),
            endTime: Joi.string().pattern(timePattern).required(),
            isActive: Joi.boolean().default(true),
          })
        )
        .min(1)
        .required(),
    }),
  },

  blockSlot: {
    body: Joi.object({
      startTime: Joi.date().iso().required(),
      endTime: Joi.date().iso().required(),
      reason: Joi.string().max(200),
    }),
  },

  removeBlock: {
    params: Joi.object({
      blockId: Joi.string().required(),
    }),
  },

  getAvailableSlots: {
    params: Joi.object({
      mentorId: Joi.string().required(),
    }),
    query: Joi.object({
      startDate: Joi.date().iso().required(),
      endDate: Joi.date().iso().required(),
      sessionTypeId: Joi.string(),
      duration: Joi.number().integer().min(15).max(180).default(60),
    }),
  },

  getCalendarAvailability: {
    params: Joi.object({
      mentorId: Joi.string().required(),
    }),
    query: Joi.object({
      month: Joi.number().integer().min(1).max(12),
      year: Joi.number().integer().min(2025).max(2030),
    }),
  },
};
