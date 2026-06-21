import Joi from "joi";

const NOTIFICATION_CATEGORIES = [
  "SOCIAL", "COMMUNITY", "MENTORSHIP", "INCUBATION", "STARTUP",
  "JOB", "EVENT", "TASK", "OFFICE", "FUNDING", "PAYMENT", "SYSTEM",
];

const NOTIFICATION_TYPES = [
  "CONNECTION_REQUEST", "CONNECTION_ACCEPTED", "MESSAGE", "MENTION",
  "LIKE", "COMMENT", "SHARE", "FOLLOW", "POST_LIKE", "POST_COMMENT",
  "POST_SHARE", "POST_MENTION", "PROFILE_VIEW",
  "EVENT_REMINDER", "EVENT_UPDATE", "EVENT_INVITATION",
  "EVENT_REGISTRATION_CONFIRMED", "EVENT_CANCELLED", "EVENT_WAITLIST_PROMOTED",
  "JOB_ALERT", "JOB_APPLICATION_UPDATE", "JOB_NEW_APPLICATION",
  "JOB_REFERRAL_RECEIVED", "JOB_REFERRAL_STATUS", "JOB_DEADLINE_APPROACHING",
  "MENTORSHIP_REQUEST", "MENTORSHIP_ACCEPTED", "MENTORSHIP_DECLINED",
  "SESSION_REMINDER", "SESSION_BOOKED", "SESSION_CONFIRMED",
  "SESSION_CANCELLED", "SESSION_DECLINED", "SESSION_COMPLETED",
  "SESSION_RESCHEDULED", "SESSION_NO_SHOW", "REVIEW_RECEIVED", "EARNING_UPDATE",
  "INCUBATOR_INVITATION", "INCUBATOR_APPLICATION_APPROVED", "INCUBATOR_APPLICATION_REJECTED",
  "APPLICATION_STATUS_CHANGED", "CHANGE_REQUEST_CREATED", "CHANGE_REQUEST_RESPONSE",
  "DOCUMENT_REQUEST_CREATED", "DOCUMENT_REQUEST_RESPONSE", "EVALUATION_COMPLETED",
  "FUNDING_REQUEST_STATUS", "FUNDING_DISBURSED", "PANEL_ASSIGNED", "PROGRAM_UPDATE",
  "TASK_ASSIGNED", "TASK_STATUS_CHANGED", "TASK_OVERDUE",
  "FACILITY_BOOKING_STATUS", "OFFICE_REQUEST_STATUS", "OFFICE_BOOKING_UPDATE",
  "ACHIEVEMENT_UNLOCKED", "SYSTEM", "ANNOUNCEMENT_PUBLISHED",
  "PAYMENT_RECEIVED", "PAYMENT_FAILED", "SUBSCRIPTION_EXPIRING",
  "COMMUNITY_INVITE", "COMMUNITY_JOIN_REQUEST", "COMMUNITY_JOIN_APPROVED",
  "COMMUNITY_POST", "COMMUNITY_MENTION", "COMMUNITY_COMMENT",
];

export const NotificationValidation = {
  getNotifications: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(20),
      category: Joi.string().valid(...NOTIFICATION_CATEGORIES).allow("", null),
      isRead: Joi.boolean().allow("", null),
      type: Joi.string().valid(...NOTIFICATION_TYPES).allow("", null),
    }),
  },

  markAllAsRead: {
    body: Joi.object({
      category: Joi.string().valid(...NOTIFICATION_CATEGORIES).allow(null),
    }),
  },

  updatePreferences: {
    body: Joi.object({
      preferences: Joi.array()
        .items(
          Joi.object({
            category: Joi.string().valid(...NOTIFICATION_CATEGORIES).required(),
            inApp: Joi.boolean().required(),
            email: Joi.boolean().required(),
            push: Joi.boolean().required(),
          })
        )
        .min(1)
        .required(),
    }),
  },
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
