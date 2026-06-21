import Joi from "joi";

export const MentorshipValidation = {
  create: {
    body: Joi.object({
      mentorProfileId: Joi.string().required(),
      menteeType: Joi.string().valid("USER", "STARTUP").required(),
      startupId: Joi.string().when("menteeType", {
        is: "STARTUP",
        then: Joi.required(),
        otherwise: Joi.forbidden(),
      }),
      engagementType: Joi.string()
        .valid("AD_HOC", "ONGOING", "PROGRAM", "ADVISOR")
        .required(),
      programId: Joi.string(),
      frequency: Joi.string().valid("WEEKLY", "BIWEEKLY", "MONTHLY"),
      objectives: Joi.string().max(2000),
      goals: Joi.array().items(
        Joi.object({
          title: Joi.string().max(200).required(),
          description: Joi.string().max(500),
          targetDate: Joi.date().iso(),
        })
      ),
      isEquityBased: Joi.boolean().default(false),
      equityPercent: Joi.number().min(0).max(100).when("isEquityBased", {
        is: true,
        then: Joi.required(),
        otherwise: Joi.forbidden(),
      }),
      equityNotes: Joi.string().max(500),
    }),
  },

  accept: {
    params: Joi.object({
      mentorshipId: Joi.string().required(),
    }),
    body: Joi.object({
      mentorNotes: Joi.string().max(1000),
      suggestedFrequency: Joi.string().valid("WEEKLY", "BIWEEKLY", "MONTHLY"),
    }),
  },

  updateStatus: {
    params: Joi.object({
      mentorshipId: Joi.string().required(),
    }),
    body: Joi.object({
      status: Joi.string().valid("ACTIVE", "PAUSED", "COMPLETED", "ENDED").required(),
      reason: Joi.string().max(500),
    }),
  },

  end: {
    params: Joi.object({
      mentorshipId: Joi.string().required(),
    }),
    body: Joi.object({
      reason: Joi.string().max(500).required(),
    }),
  },

  getById: {
    params: Joi.object({
      mentorshipId: Joi.string().required(),
    }),
  },

  list: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
      status: Joi.string().valid("PENDING", "ACTIVE", "PAUSED", "COMPLETED", "ENDED"),
      engagementType: Joi.string().valid("AD_HOC", "ONGOING", "PROGRAM", "ADVISOR"),
    }),
  },

  addMilestone: {
    params: Joi.object({
      mentorshipId: Joi.string().required(),
    }),
    body: Joi.object({
      title: Joi.string().max(200).required(),
      description: Joi.string().max(1000),
      targetDate: Joi.date().iso(),
      displayOrder: Joi.number().integer().min(0).default(0),
    }),
  },

  updateMilestone: {
    params: Joi.object({
      milestoneId: Joi.string().required(),
    }),
    body: Joi.object({
      title: Joi.string().max(200),
      description: Joi.string().max(1000),
      targetDate: Joi.date().iso(),
      status: Joi.string().valid("PENDING", "IN_PROGRESS", "COMPLETED", "SKIPPED"),
      progress: Joi.number().integer().min(0).max(100),
      completionNotes: Joi.string().max(500),
      displayOrder: Joi.number().integer().min(0),
    }).min(1),
  },

  deleteMilestone: {
    params: Joi.object({
      milestoneId: Joi.string().required(),
    }),
  },
};
