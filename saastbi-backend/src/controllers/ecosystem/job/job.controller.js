import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";
import { JobManagementService } from "../../../services/ecosystem/job/job-management.service.js";
import { JobScreeningService } from "../../../services/ecosystem/job/job-screening.service.js";
import { ApplicationPipelineService } from "../../../services/ecosystem/job/application-pipeline.service.js";
import { JobReferralService } from "../../../services/ecosystem/job/job-referral.service.js";

export const JobController = {
  createJob: asyncHandler(async (req, res) => {
    const result = await JobManagementService.createJob(req.user.id, req.body);
    return apiResponse.sendCreated(res, result, "Job created successfully");
  }),

  updateJob: asyncHandler(async (req, res) => {
    const result = await JobManagementService.updateJob(req.user.id, req.params.jobId, req.body);
    return apiResponse.sendUpdated(res, result, "Job updated successfully");
  }),

  changeJobStatus: asyncHandler(async (req, res) => {
    const result = await JobManagementService.changeJobStatus(req.user.id, req.params.jobId, req.body.status);
    return apiResponse.sendSuccess(res, result, "Job status updated successfully");
  }),

  duplicateJob: asyncHandler(async (req, res) => {
    const result = await JobManagementService.duplicateJob(req.user.id, req.params.jobId);
    return apiResponse.sendCreated(res, result, "Job duplicated successfully");
  }),

  deleteJob: asyncHandler(async (req, res) => {
    const result = await JobManagementService.deleteJob(req.user.id, req.params.jobId);
    return apiResponse.sendSuccess(res, result, "Job closed successfully");
  }),

  getPageJobs: asyncHandler(async (req, res) => {
    const result = await JobManagementService.getPageJobs(req.user.id, req.params.pageId, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  getJobDetail: asyncHandler(async (req, res) => {
    const result = await JobManagementService.getJobDetail(req.user.id, req.params.jobId);
    return apiResponse.sendSuccess(res, result);
  }),

  getHiringDashboard: asyncHandler(async (req, res) => {
    const result = await JobManagementService.getHiringDashboard(req.user.id, req.params.pageId, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  addScreeningQuestion: asyncHandler(async (req, res) => {
    const result = await JobScreeningService.addQuestion(req.user.id, req.params.jobId, req.body);
    return apiResponse.sendCreated(res, result, "Screening question added");
  }),

  updateScreeningQuestion: asyncHandler(async (req, res) => {
    const result = await JobScreeningService.updateQuestion(req.user.id, req.params.questionId, req.body);
    return apiResponse.sendUpdated(res, result, "Screening question updated");
  }),

  reorderScreeningQuestions: asyncHandler(async (req, res) => {
    const result = await JobScreeningService.reorderQuestions(req.user.id, req.params.jobId, req.body.orderedIds);
    return apiResponse.sendSuccess(res, result);
  }),

  deleteScreeningQuestion: asyncHandler(async (req, res) => {
    const result = await JobScreeningService.deleteQuestion(req.user.id, req.params.questionId);
    return apiResponse.sendSuccess(res, result);
  }),

  getApplications: asyncHandler(async (req, res) => {
    const result = await ApplicationPipelineService.getApplications(req.user.id, req.params.jobId, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  getApplicationDetail: asyncHandler(async (req, res) => {
    const result = await ApplicationPipelineService.getApplicationDetail(req.user.id, req.params.applicationId);
    return apiResponse.sendSuccess(res, result);
  }),

  changeApplicationStatus: asyncHandler(async (req, res) => {
    const result = await ApplicationPipelineService.changeApplicationStatus(req.user.id, req.params.applicationId, req.body.status, req.body.note);
    return apiResponse.sendSuccess(res, result, "Application status updated");
  }),

  bulkStatusChange: asyncHandler(async (req, res) => {
    const result = await ApplicationPipelineService.bulkStatusChange(req.user.id, req.params.jobId, req.body.applicationIds, req.body.status, req.body.note);
    return apiResponse.sendSuccess(res, result);
  }),

  addApplicationNote: asyncHandler(async (req, res) => {
    const result = await ApplicationPipelineService.addNote(req.user.id, req.params.applicationId, req.body.content, req.body.isPrivate);
    return apiResponse.sendCreated(res, result, "Note added");
  }),

  rateApplication: asyncHandler(async (req, res) => {
    const result = await ApplicationPipelineService.rateApplication(req.user.id, req.params.applicationId, req.body.score, req.body.comment);
    return apiResponse.sendSuccess(res, result);
  }),

  getApplicantProfile: asyncHandler(async (req, res) => {
    const result = await ApplicationPipelineService.getApplicantProfile(req.user.id, req.params.applicantId);
    return apiResponse.sendSuccess(res, result);
  }),

  exportApplications: asyncHandler(async (req, res) => {
    const result = await ApplicationPipelineService.exportApplications(req.user.id, req.params.jobId, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  getReferralsForJob: asyncHandler(async (req, res) => {
    const result = await JobReferralService.getReferralsForJob(req.user.id, req.params.jobId);
    return apiResponse.sendSuccess(res, result);
  }),
};
