import Joi from "joi";

const JOB_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE", "TEMPORARY", "VOLUNTEER"];
const WORK_MODES = ["REMOTE", "ONSITE", "HYBRID"];
const EXPERIENCE_LEVELS = ["ENTRY", "JUNIOR", "MID", "SENIOR", "LEAD", "EXECUTIVE"];
const SALARY_PERIODS = ["HOURLY", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"];
const JOB_STATUSES = ["DRAFT", "OPEN", "PAUSED", "CLOSED", "FILLED"];
const JOB_URGENCIES = ["NORMAL", "URGENT", "CRITICAL"];
const APPLICATION_STATUSES = ["APPLIED", "VIEWED", "SCREENING", "INTERVIEWING", "OFFERED", "HIRED", "REJECTED", "WITHDRAWN"];
const SCREENING_QUESTION_TYPES = ["TEXT", "SINGLE_CHOICE", "MULTIPLE_CHOICE", "YES_NO", "NUMERIC"];
const ALERT_FREQUENCIES = ["INSTANT", "DAILY", "WEEKLY"];
const PAGE_TYPES = ["STARTUP", "COMPANY", "VC_FIRM", "INSTITUTION", "ORGANIZATION", "INCUBATION", "COMMUNITY", "UNIVERSITY", "COLLEGE", "SCHOOL", "OTHERS"];

export const JobValidation = {
  createJob: {
    body: Joi.object({
      title: Joi.string().min(3).max(200).required(),
      description: Joi.string().required(),
      pageId: Joi.string().required(),
      jobType: Joi.string().valid(...JOB_TYPES).required(),
      workMode: Joi.string().valid(...WORK_MODES).required(),
      experienceLevel: Joi.string().valid(...EXPERIENCE_LEVELS).required(),
      requirements: Joi.string().allow("", null),
      responsibilities: Joi.string().allow("", null),
      benefits: Joi.string().allow("", null),
      location: Joi.string().allow("", null),
      salaryMin: Joi.number().min(0),
      salaryMax: Joi.number().min(Joi.ref("salaryMin")),
      currency: Joi.string().default("USD"),
      salaryPeriod: Joi.string().valid(...SALARY_PERIODS).default("YEARLY"),
      showSalary: Joi.boolean().default(true),
      skills: Joi.array().items(Joi.string()),
      requiredSkills: Joi.array().items(Joi.string()),
      niceToHaveSkills: Joi.array().items(Joi.string()),
      status: Joi.string().valid("DRAFT", "OPEN").default("DRAFT"),
      applicationUrl: Joi.string().uri().allow("", null),
      applicationEmail: Joi.string().email().allow("", null),
      deadline: Joi.date().iso().greater("now").allow(null),
      isRemote: Joi.boolean().default(false),
      isConfidential: Joi.boolean().default(false),
      department: Joi.string().allow("", null),
      industry: Joi.string().allow("", null),
      categoryId: Joi.string().allow(null),
      urgency: Joi.string().valid(...JOB_URGENCIES).default("NORMAL"),
      numberOfOpenings: Joi.number().integer().min(1).default(1),
      applicationLimit: Joi.number().integer().min(1).allow(null),
      minimumExperience: Joi.number().integer().min(0).allow(null),
      maximumExperience: Joi.number().integer().min(0).allow(null),
      educationLevel: Joi.string().allow("", null),
      hiringManagerId: Joi.string().allow(null),
      isFeatured: Joi.boolean(),
    }),
  },

  updateJob: {
    params: Joi.object({ jobId: Joi.string().required() }),
    body: Joi.object({
      title: Joi.string().min(3).max(200),
      description: Joi.string(),
      jobType: Joi.string().valid(...JOB_TYPES),
      workMode: Joi.string().valid(...WORK_MODES),
      experienceLevel: Joi.string().valid(...EXPERIENCE_LEVELS),
      requirements: Joi.string().allow("", null),
      responsibilities: Joi.string().allow("", null),
      benefits: Joi.string().allow("", null),
      location: Joi.string().allow("", null),
      salaryMin: Joi.number().min(0),
      salaryMax: Joi.number().min(0),
      currency: Joi.string(),
      salaryPeriod: Joi.string().valid(...SALARY_PERIODS),
      showSalary: Joi.boolean(),
      skills: Joi.array().items(Joi.string()),
      requiredSkills: Joi.array().items(Joi.string()),
      niceToHaveSkills: Joi.array().items(Joi.string()),
      applicationUrl: Joi.string().uri().allow("", null),
      applicationEmail: Joi.string().email().allow("", null),
      deadline: Joi.date().iso().allow(null),
      isRemote: Joi.boolean(),
      isConfidential: Joi.boolean(),
      department: Joi.string().allow("", null),
      industry: Joi.string().allow("", null),
      categoryId: Joi.string().allow(null),
      urgency: Joi.string().valid(...JOB_URGENCIES),
      numberOfOpenings: Joi.number().integer().min(1),
      applicationLimit: Joi.number().integer().min(1).allow(null),
      minimumExperience: Joi.number().integer().min(0).allow(null),
      maximumExperience: Joi.number().integer().min(0).allow(null),
      educationLevel: Joi.string().allow("", null),
      hiringManagerId: Joi.string().allow(null),
      isFeatured: Joi.boolean(),
    }),
  },

  changeJobStatus: {
    params: Joi.object({ jobId: Joi.string().required() }),
    body: Joi.object({
      status: Joi.string().valid(...JOB_STATUSES).required(),
    }),
  },

  discoverJobs: {
    query: Joi.object({
      search: Joi.string().max(200),
      jobType: Joi.alternatives().try(Joi.string().valid(...JOB_TYPES), Joi.array().items(Joi.string().valid(...JOB_TYPES))),
      workMode: Joi.alternatives().try(Joi.string().valid(...WORK_MODES), Joi.array().items(Joi.string().valid(...WORK_MODES))),
      experienceLevel: Joi.alternatives().try(Joi.string().valid(...EXPERIENCE_LEVELS), Joi.array().items(Joi.string().valid(...EXPERIENCE_LEVELS))),
      location: Joi.string(),
      salaryMin: Joi.number().min(0),
      salaryMax: Joi.number().min(0),
      skills: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())),
      industry: Joi.string(),
      categoryId: Joi.string(),
      postedWithin: Joi.string().valid("24h", "7d", "30d", "90d"),
      isRemote: Joi.boolean(),
      pageType: Joi.alternatives().try(Joi.string().valid(...PAGE_TYPES), Joi.array().items(Joi.string().valid(...PAGE_TYPES))),
      sortBy: Joi.string().valid("relevance", "date", "salary_high", "salary_low"),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(12),
    }),
  },

  applyJob: {
    params: Joi.object({ jobId: Joi.string().required() }),
    body: Joi.object({
      coverLetter: Joi.string().max(5000).allow("", null),
      resumeUrl: Joi.string().uri().allow("", null),
      portfolioUrl: Joi.string().uri().allow("", null),
      expectedSalary: Joi.number().min(0).allow(null),
      noticePeriod: Joi.string().allow("", null),
      currentlyEmployed: Joi.boolean().allow(null),
      source: Joi.string().allow("", null),
      screeningAnswers: Joi.array().items(
        Joi.object({
          questionId: Joi.string().required(),
          answer: Joi.required(),
        })
      ),
    }),
  },

  screeningQuestion: {
    params: Joi.object({ jobId: Joi.string().required() }),
    body: Joi.object({
      questionText: Joi.string().max(500).required(),
      questionType: Joi.string().valid(...SCREENING_QUESTION_TYPES).required(),
      options: Joi.when("questionType", {
        is: Joi.valid("SINGLE_CHOICE", "MULTIPLE_CHOICE"),
        then: Joi.array().items(Joi.string()).min(2).required(),
        otherwise: Joi.array().items(Joi.string()).allow(null),
      }),
      isRequired: Joi.boolean().default(false),
      isEliminatory: Joi.boolean().default(false),
      expectedAnswer: Joi.when("isEliminatory", {
        is: true,
        then: Joi.required(),
        otherwise: Joi.allow(null),
      }),
    }),
  },

  createAlert: {
    body: Joi.object({
      name: Joi.string().max(100),
      keywords: Joi.array().items(Joi.string()),
      jobTypes: Joi.array().items(Joi.string().valid(...JOB_TYPES)),
      workModes: Joi.array().items(Joi.string().valid(...WORK_MODES)),
      experienceLevels: Joi.array().items(Joi.string().valid(...EXPERIENCE_LEVELS)),
      locations: Joi.array().items(Joi.string()),
      skills: Joi.array().items(Joi.string()),
      salaryMin: Joi.number().min(0),
      salaryMax: Joi.number().min(0),
      industries: Joi.array().items(Joi.string()),
      categories: Joi.array().items(Joi.string()),
      isRemoteOnly: Joi.boolean(),
      frequency: Joi.string().valid(...ALERT_FREQUENCIES).required(),
    }),
  },

  bulkStatusChange: {
    params: Joi.object({ jobId: Joi.string().required() }),
    body: Joi.object({
      applicationIds: Joi.array().items(Joi.string()).min(1).required(),
      status: Joi.string().valid(...APPLICATION_STATUSES).required(),
      note: Joi.string().max(1000).allow("", null),
    }),
  },

  referCandidate: {
    params: Joi.object({ jobId: Joi.string().required() }),
    body: Joi.object({
      referredEmail: Joi.string().email().required(),
      note: Joi.string().max(1000).allow("", null),
    }),
  },

  rateApplication: {
    params: Joi.object({ applicationId: Joi.string().required() }),
    body: Joi.object({
      score: Joi.number().integer().min(1).max(5).required(),
      comment: Joi.string().max(1000).allow("", null),
    }),
  },

  addNote: {
    params: Joi.object({ applicationId: Joi.string().required() }),
    body: Joi.object({
      content: Joi.string().max(2000).required(),
      isPrivate: Joi.boolean().default(false),
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
