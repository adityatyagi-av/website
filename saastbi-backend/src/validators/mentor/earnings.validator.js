import Joi from "joi";

export const EarningsValidation = {
  list: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
      status: Joi.string().valid("PENDING", "PROCESSING", "COMPLETED", "FAILED", "REFUNDED"),
      source: Joi.string().valid("DIRECT", "INCUBATOR", "PACKAGE"),
      startDate: Joi.date().iso(),
      endDate: Joi.date().iso(),
      sortBy: Joi.string().valid("createdAt", "netAmount").default("createdAt"),
      order: Joi.string().valid("asc", "desc").default("desc"),
    }),
  },

  withdraw: {
    body: Joi.object({
      amount: Joi.number().min(100).required(),
      payoutAccountId: Joi.string().required(),
    }),
  },

  addPayoutAccount: {
    body: Joi.object({
      accountType: Joi.string().valid("BANK_ACCOUNT", "UPI", "VPA").required(),
      bankAccountNumber: Joi.string().when("accountType", {
        is: "BANK_ACCOUNT",
        then: Joi.required(),
        otherwise: Joi.forbidden(),
      }),
      bankIfscCode: Joi.string().when("accountType", {
        is: "BANK_ACCOUNT",
        then: Joi.required(),
        otherwise: Joi.forbidden(),
      }),
      bankName: Joi.string().when("accountType", {
        is: "BANK_ACCOUNT",
        then: Joi.required(),
        otherwise: Joi.forbidden(),
      }),
      bankBranch: Joi.string(),
      accountHolderName: Joi.string().required(),
      upiId: Joi.string().when("accountType", {
        is: Joi.valid("UPI", "VPA"),
        then: Joi.required(),
        otherwise: Joi.forbidden(),
      }),
      isPrimary: Joi.boolean().default(false),
    }),
  },

  deletePayoutAccount: {
    params: Joi.object({
      accountId: Joi.string().required(),
    }),
  },

  withdrawalList: {
    query: Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
      status: Joi.string().valid("PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"),
    }),
  },
};
