import { startupDetailService } from "../../../services/incubation/portal/startup-detail.service.js";
import { ApiError } from "../../../utils/ApiError.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";

export const StartupDetailController = {
  getStartupFunding: asyncHandler(async (req, res) => {
    const { startupId } = req.params;
    const tenantId = req.user.tenantId;

    const result = await startupDetailService.getStartupFunding({
      tenantId,
      startupId,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Startup funding details fetched successfully"
    );
  }),

  disburseToStartup: asyncHandler(async (req, res) => {
    const { startupId } = req.params;
    const tenantId = req.user.tenantId;
    const userId = req.user.incubationUserId;

    const {
      applicationId,
      programId,
      batchId,
      amount,
      currency,
      disbursementType,
      milestoneName,
      reference,
      notes,
      documents,
    } = req.body;

    if (!applicationId || !programId || !amount || !disbursementType) {
      throw new ApiError(
        400,
        "applicationId, programId, amount, and disbursementType are required"
      );
    }

    const result = await startupDetailService.disburseToStartup({
      tenantId,
      userId,
      startupId,
      applicationId,
      programId,
      batchId,
      amount,
      currency,
      disbursementType,
      milestoneName,
      reference,
      notes,
      documents,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Funds disbursed successfully",
      201
    );
  }),

  getRegistrationDetail: asyncHandler(async (req, res) => {
    const { startupId, applicationId } = req.params;
    const tenantId = req.user.tenantId;

    const result = await startupDetailService.getRegistrationDetail({
      tenantId,
      startupId,
      applicationId,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Registration details fetched successfully"
    );
  }),

  getStartupEvaluations: asyncHandler(async (req, res) => {
    const { startupId } = req.params;
    const { applicationId } = req.query;
    const tenantId = req.user.tenantId;

    const result = await startupDetailService.getStartupEvaluations({
      tenantId,
      startupId,
      applicationId,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Evaluation scores fetched successfully"
    );
  }),

  getStartupOfficeAllocations: asyncHandler(async (req, res) => {
    const { startupId } = req.params;
    const tenantId = req.user.tenantId;

    const result = await startupDetailService.getStartupOfficeAllocations({
      tenantId,
      startupId,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Office allocations fetched successfully"
    );
  }),

  getStartupFacilityBookings: asyncHandler(async (req, res) => {
    const { startupId } = req.params;
    const { page = 1, limit = 20, fromDate, toDate } = req.query;
    const tenantId = req.user.tenantId;

    const result = await startupDetailService.getStartupFacilityBookings({
      tenantId,
      startupId,
      page: Number(page),
      limit: Number(limit),
      fromDate,
      toDate,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Facility bookings fetched successfully"
    );
  }),

  getStartupMentorships: asyncHandler(async (req, res) => {
    const { startupId } = req.params;
    const tenantId = req.user.tenantId;

    const result = await startupDetailService.getStartupMentorships({
      tenantId,
      startupId,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Mentorship details fetched successfully"
    );
  }),

  getStartupAssociations: asyncHandler(async (req, res) => {
    const { startupId } = req.params;
    const tenantId = req.user.tenantId;

    const result = await startupDetailService.getStartupAssociations({
      tenantId,
      startupId,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Startup associations fetched successfully"
    );
  }),

  getStartupOverview: asyncHandler(async (req, res) => {
    const { startupId } = req.params;
    const tenantId = req.user.tenantId;

    const result = await startupDetailService.getStartupOverview({
      tenantId,
      startupId,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Startup overview fetched successfully"
    );
  }),
};
