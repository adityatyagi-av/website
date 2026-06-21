import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";
import { JobDiscoveryService } from "../../../services/ecosystem/job/job-discovery.service.js";
import { JobApplicationService } from "../../../services/ecosystem/job/job-application.service.js";
import { JobBookmarkService } from "../../../services/ecosystem/job/job-bookmark.service.js";

export const JobApplicantController = {
  discoverJobs: asyncHandler(async (req, res) => {
    console.log("REQ USER IS ",req.user)
    const result = await JobDiscoveryService.discoverJobs(req.query, req.user?.id);
    return apiResponse.sendSuccess(res, result);
  }),

  getRecommendedJobs: asyncHandler(async (req, res) => {
    const result = await JobDiscoveryService.getRecommendedJobs(req.user.id, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  getTrendingJobs: asyncHandler(async (req, res) => {
    const result = await JobDiscoveryService.getTrendingJobs(req.query, req.user?.id);
    return apiResponse.sendSuccess(res, result);
  }),

  getJobBySlug: asyncHandler(async (req, res) => {
    const result = await JobDiscoveryService.getJobBySlug(req.params.slug, req.user?.id, req);
    return apiResponse.sendSuccess(res, result);
  }),

  getSimilarJobs: asyncHandler(async (req, res) => {
    const result = await JobDiscoveryService.getSimilarJobs(req.params.jobId, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  getJobsBySkillCount: asyncHandler(async (req, res) => {
    const result = await JobDiscoveryService.getJobsBySkillCount(req.user.id);
    return apiResponse.sendSuccess(res, result,);
  }),
  
  getJobsBySkill: asyncHandler(async (req, res) => {
    const result = await JobDiscoveryService.getJobsBySkill(req.params.skillName, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  getConnectionsAtCompany: asyncHandler(async (req, res) => {
    const result = await JobDiscoveryService.getConnectionsAtCompany(req.user.id, req.params.jobId);
    return apiResponse.sendSuccess(res, result);
  }),

  getSkillGapAnalysis: asyncHandler(async (req, res) => {
    const result = await JobApplicationService.getSkillGapAnalysis(req.user.id, req.params.jobId);
    return apiResponse.sendSuccess(res, result);
  }),

  applyForJob: asyncHandler(async (req, res) => {
    const result = await JobApplicationService.applyForJob(req.user.id, req.params.jobId, req.body);
    return apiResponse.sendCreated(res, result, "Application submitted successfully");
  }),

  withdrawApplication: asyncHandler(async (req, res) => {
    const result = await JobApplicationService.withdrawApplication(req.user.id, req.params.applicationId);
    return apiResponse.sendSuccess(res, result);
  }),

  getMyApplications: asyncHandler(async (req, res) => {
    const result = await JobApplicationService.getMyApplications(req.user.id, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  getApplicationDetail: asyncHandler(async (req, res) => {
    const result = await JobApplicationService.getApplicationDetail(req.user.id, req.params.applicationId);
    return apiResponse.sendSuccess(res, result);
  }),

  getApplicationInsights: asyncHandler(async (req, res) => {
    const result = await JobApplicationService.getApplicationInsights(req.user.id, req.params.applicationId);
    return apiResponse.sendSuccess(res, result);
  }),

  getJobDashboard: asyncHandler(async (req, res) => {
    const result = await JobApplicationService.getJobDashboard(req.user.id);
    return apiResponse.sendSuccess(res,result,);
  }),

  toggleBookmark: asyncHandler(async (req, res) => {
    const result = await JobBookmarkService.toggleBookmark(req.user.id, req.params.jobId);
    return apiResponse.sendSuccess(res, result);
  }),

  getBookmarkedJobs: asyncHandler(async (req, res) => {
    const result = await JobBookmarkService.getBookmarkedJobs(req.user.id, req.query);
    return apiResponse.sendSuccess(res, result);
  }),
};
