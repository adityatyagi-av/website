import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";
import { JobReferralService } from "../../../services/ecosystem/job/job-referral.service.js";

export const JobReferralController = {
  referCandidate: asyncHandler(async (req, res) => {
    const result = await JobReferralService.referCandidate(req.user.id, req.params.jobId, req.body);
    return apiResponse.sendCreated(res, result, "Referral sent successfully");
  }),

  getMyReferrals: asyncHandler(async (req, res) => {
    const result = await JobReferralService.getMyReferrals(req.user.id, req.query);
    return apiResponse.sendSuccess(res, result);
  }),
};
