import { Router } from "express";
import { authenticate, optionalAuthenticate } from "../../../middlewares/auth.middleware.js";
import { JobController } from "../../../controllers/ecosystem/job/job.controller.js";
import { JobApplicantController } from "../../../controllers/ecosystem/job/job-applicant.controller.js";
import { JobAlertController } from "../../../controllers/ecosystem/job/job-alert.controller.js";
import { JobReferralController } from "../../../controllers/ecosystem/job/job-referral.controller.js";
import { JobValidation, validate } from "../../../validators/ecosystem/job.validator.js";

const JobRouter = Router();

// ── Applicant: Discovery (static routes first to avoid param conflicts) ──
JobRouter.get("/job/discover",optionalAuthenticate, JobApplicantController.discoverJobs);
JobRouter.get("/job/recommended", authenticate, JobApplicantController.getRecommendedJobs);
JobRouter.get("/job/trending", optionalAuthenticate, JobApplicantController.getTrendingJobs);
JobRouter.get("/job/bookmarked", authenticate, JobApplicantController.getBookmarkedJobs);
JobRouter.get("/job/by-skill-count", authenticate, JobApplicantController.getJobsBySkillCount);
JobRouter.get("/job/by-skill/:skillName", optionalAuthenticate, JobApplicantController.getJobsBySkill);

// ── Applicant: My Applications ──
JobRouter.get("/job/my-applications", authenticate, JobApplicantController.getMyApplications);
JobRouter.get("/job/my-applications/:applicationId", authenticate, JobApplicantController.getApplicationDetail);
JobRouter.get("/job/my-applications/:applicationId/insights", authenticate, JobApplicantController.getApplicationInsights);

JobRouter.get("/job/dashboard",authenticate,JobApplicantController.getJobDashboard);

// ── Referral: My Referrals ──
JobRouter.get("/job/my-referrals", authenticate, JobReferralController.getMyReferrals);

// ── Alerts ──
JobRouter.post("/job/alert", authenticate, JobAlertController.createAlert);
JobRouter.get("/job/alerts", authenticate, JobAlertController.getMyAlerts);
JobRouter.patch("/job/alert/:alertId", authenticate, JobAlertController.updateAlert);
JobRouter.delete("/job/alert/:alertId", authenticate, JobAlertController.deleteAlert);
JobRouter.patch("/job/alert/:alertId/toggle", authenticate, JobAlertController.toggleAlert);

// ── Employer: Page Jobs & Dashboard ──
JobRouter.get("/job/page/:pageId", authenticate, JobController.getPageJobs);
JobRouter.get("/job/page/:pageId/dashboard", authenticate, JobController.getHiringDashboard);

// ── Employer: Job CRUD ──
JobRouter.post("/job", authenticate, JobController.createJob);
JobRouter.patch("/job/:jobId", authenticate, JobController.updateJob);
JobRouter.patch("/job/:jobId/status", authenticate, JobController.changeJobStatus);
JobRouter.post("/job/:jobId/duplicate", authenticate, JobController.duplicateJob);
JobRouter.delete("/job/:jobId", authenticate, JobController.deleteJob);
JobRouter.get("/job/:jobId/detail", authenticate, JobController.getJobDetail);

// ── Employer: Screening Questions ──
JobRouter.post("/job/:jobId/screening-question", authenticate, JobController.addScreeningQuestion);
JobRouter.patch("/job/screening-question/:questionId", authenticate, JobController.updateScreeningQuestion);
JobRouter.patch("/job/:jobId/screening-questions/reorder", authenticate, JobController.reorderScreeningQuestions);
JobRouter.delete("/job/screening-question/:questionId", authenticate, JobController.deleteScreeningQuestion);

// ── Employer: Application Pipeline ──
JobRouter.get("/job/:jobId/applications", authenticate, JobController.getApplications);
JobRouter.get("/job/application/:applicationId", authenticate, JobController.getApplicationDetail);
JobRouter.patch("/job/application/:applicationId/status", authenticate, JobController.changeApplicationStatus);
JobRouter.post("/job/:jobId/applications/bulk-status", authenticate, validate(JobValidation.bulkStatusChange), JobController.bulkStatusChange);
JobRouter.post("/job/application/:applicationId/note", authenticate, validate(JobValidation.addNote), JobController.addApplicationNote);
JobRouter.post("/job/application/:applicationId/rate", authenticate, validate(JobValidation.rateApplication), JobController.rateApplication);
JobRouter.get("/job/applicant/:applicantId/profile", authenticate, JobController.getApplicantProfile);
JobRouter.get("/job/:jobId/applications/export", authenticate, JobController.exportApplications);

// ── Employer: Referrals ──
JobRouter.post("/job/:jobId/refer", authenticate, validate(JobValidation.referCandidate), JobController.getReferralsForJob);
JobRouter.get("/job/:jobId/referrals", authenticate, JobController.getReferralsForJob);

// ── Applicant: Referral (POST) ──
JobRouter.post("/job/:jobId/refer-candidate", authenticate, JobReferralController.referCandidate);

// ── Applicant: Job Detail (dynamic slug route - must be last) ──
JobRouter.post("/job/:jobId/apply", authenticate, JobApplicantController.applyForJob);
JobRouter.post("/job/application/:applicationId/withdraw", authenticate, JobApplicantController.withdrawApplication);
JobRouter.post("/job/:jobId/bookmark", authenticate, JobApplicantController.toggleBookmark);
JobRouter.get("/job/:jobId/similar", optionalAuthenticate, JobApplicantController.getSimilarJobs);
JobRouter.get("/job/:jobId/connections", authenticate, JobApplicantController.getConnectionsAtCompany);
JobRouter.get("/job/:jobId/skill-gap", authenticate, JobApplicantController.getSkillGapAnalysis);
JobRouter.get("/job/:slug", optionalAuthenticate, JobApplicantController.getJobBySlug);

export default JobRouter;
