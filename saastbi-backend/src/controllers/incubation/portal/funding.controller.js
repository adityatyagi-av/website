import { fundingService } from "../../../services/incubation/portal/funding.service.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";
import { resolveTenantId } from "../../../utils/tenantResolver.js";
import { ApiError } from "../../../utils/ApiError.js";

export const FundingController = {
  // =================== FUNDING SOURCES ===================

  createFundingSource: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const userId = req.user.incubationUserId;
    const { sourceName, sourceType, totalAmount, currency, receivedDate, expiryDate, reference, notes, documents } = req.body;

    if (!sourceName) throw new ApiError(400, "sourceName is required");
    if (!sourceType) throw new ApiError(400, "sourceType is required");
    if (!totalAmount || totalAmount <= 0) throw new ApiError(400, "totalAmount must be a positive number");

    const source = await fundingService.createFundingSource({
      tenantId, userId, sourceName, sourceType, totalAmount, currency, receivedDate, expiryDate, reference, notes, documents,
    });

    return apiResponse.sendSuccess(res, source, "Funding source created successfully");
  }),

  getFundingSources: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const sources = await fundingService.getFundingSources({ tenantId });
    return apiResponse.sendSuccess(res, sources, "Funding sources fetched successfully");
  }),

  getFundingSourceById: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { sourceId } = req.params;
    if (!sourceId) throw new ApiError(400, "sourceId is required");
    const source = await fundingService.getFundingSourceById({ tenantId, sourceId });
    return apiResponse.sendSuccess(res, source, "Funding source fetched successfully");
  }),

  updateFundingSource: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const userId = req.user.incubationUserId;
    const { sourceId } = req.params;
    if (!sourceId) throw new ApiError(400, "sourceId is required");
    const updated = await fundingService.updateFundingSource({ tenantId, userId, sourceId, data: req.body });
    return apiResponse.sendSuccess(res, updated, "Funding source updated successfully");
  }),

  deleteFundingSource: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const userId = req.user.incubationUserId;
    const { sourceId } = req.params;
    if (!sourceId) throw new ApiError(400, "sourceId is required");
    const result = await fundingService.deleteFundingSource({ tenantId, userId, sourceId });
    return apiResponse.sendSuccess(res, result, "Funding source deactivated");
  }),

  // =================== PROGRAM FUNDING ALLOCATIONS ===================

  allocateFundingToProgram: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const userId = req.user.incubationUserId;
    const { programId } = req.params;
    const { fundingSourceId, batchId, allocatedAmount, currency, notes } = req.body;

    if (!programId) throw new ApiError(400, "programId is required");
    if (!fundingSourceId) throw new ApiError(400, "fundingSourceId is required");
    if (!allocatedAmount || allocatedAmount <= 0) throw new ApiError(400, "allocatedAmount must be a positive number");

    const allocation = await fundingService.allocateFundingToProgram({
      tenantId, userId, programId, fundingSourceId, batchId, allocatedAmount, currency, notes,
    });
    return apiResponse.sendSuccess(res, allocation, "Funding allocated to program successfully");
  }),

  getProgramFundingAllocations: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { programId } = req.params;
    if (!programId) throw new ApiError(400, "programId is required");
    const allocations = await fundingService.getProgramFundingAllocations({ tenantId, programId });
    return apiResponse.sendSuccess(res, allocations, "Program allocations fetched successfully");
  }),

  updateAllocation: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const userId = req.user.incubationUserId;
    const { programId, allocationId } = req.params;
    const { allocatedAmount, notes } = req.body;
    if (!allocatedAmount || allocatedAmount <= 0) throw new ApiError(400, "allocatedAmount must be a positive number");
    const updated = await fundingService.updateAllocation({ tenantId, userId, programId, allocationId, allocatedAmount, notes });
    return apiResponse.sendSuccess(res, updated, "Allocation updated successfully");
  }),

  removeAllocation: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const userId = req.user.incubationUserId;
    const { programId, allocationId } = req.params;
    const result = await fundingService.removeAllocation({ tenantId, userId, programId, allocationId });
    return apiResponse.sendSuccess(res, result, "Allocation removed successfully");
  }),

  // =================== DISBURSEMENTS ===================

  disburseFunding: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const userId = req.user.incubationUserId;
    const { programId } = req.params;
    const { applicationId, startupId, amount, currency, disbursementType, milestoneName, reference, notes, documents } = req.body;

    if (!applicationId) throw new ApiError(400, "applicationId is required");
    if (!amount || amount <= 0) throw new ApiError(400, "amount must be a positive number");
    if (!disbursementType) throw new ApiError(400, "disbursementType is required");

    const disbursement = await fundingService.disburseFunding({
      tenantId, userId, programId, applicationId, startupId, amount, currency, disbursementType, milestoneName, reference, notes, documents,
    });
    return apiResponse.sendSuccess(res, disbursement, "Disbursement created successfully");
  }),

  getProgramDisbursements: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { programId } = req.params;
    if (!programId) throw new ApiError(400, "programId is required");
    const disbursements = await fundingService.getProgramDisbursements({ tenantId, programId });
    return apiResponse.sendSuccess(res, disbursements, "Disbursements fetched successfully");
  }),

  getDisbursementById: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { disbursementId } = req.params;
    if (!disbursementId) throw new ApiError(400, "disbursementId is required");
    const disbursement = await fundingService.getDisbursementById({ tenantId, disbursementId });
    return apiResponse.sendSuccess(res, disbursement, "Disbursement fetched successfully");
  }),

  updateDisbursementStatus: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const userId = req.user.incubationUserId;
    const { disbursementId } = req.params;
    const { newStatus, reference, notes } = req.body;
    if (!newStatus) throw new ApiError(400, "newStatus is required");
    const updated = await fundingService.updateDisbursementStatus({ tenantId, userId, disbursementId, newStatus, reference, notes });
    return apiResponse.sendSuccess(res, updated, `Disbursement status updated to ${newStatus}`);
  }),

  // =================== PORTFOLIO & OVERVIEW ===================

  getProgramFundingPortfolio: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { programId } = req.params;
    if (!programId) throw new ApiError(400, "programId is required");
    const portfolio = await fundingService.getProgramFundingPortfolio({ tenantId, programId });
    return apiResponse.sendSuccess(res, portfolio, "Program funding portfolio fetched successfully");
  }),

  getFundingOverview: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const overview = await fundingService.getFundingOverview({ tenantId });
    return apiResponse.sendSuccess(res, overview, "Funding overview fetched successfully");
  }),

  // =================== STARTUP FUNDING REQUESTS ===================

  getFundingRequests: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { programId, status, startupId, applicationId, batchId } = req.query;
    const requests = await fundingService.getFundingRequests({
      tenantId, programId, status, startupId, applicationId, batchId,
    });
    return apiResponse.sendSuccess(res, requests, "Funding requests fetched successfully");
  }),

  getFundingRequestById: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { requestId } = req.params;
    if (!requestId) throw new ApiError(400, "requestId is required");
    const request = await fundingService.getFundingRequestById({ tenantId, requestId });
    return apiResponse.sendSuccess(res, request, "Funding request fetched successfully");
  }),

  getFundingHistory: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { entityId, action, limit } = req.query;
    const history = await fundingService.getFundingHistory({ tenantId, entityId, action, limit });
    return apiResponse.sendSuccess(res, history, "Funding history fetched successfully");
  }),

  approveFundingRequest: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const userId = req.user.incubationUserId;
    const { requestId } = req.params;
    const { approvedAmount, disbursementType, currency, reference, notes } = req.body;

    if (!requestId) throw new ApiError(400, "requestId is required");

    const result = await fundingService.approveFundingRequest({
      tenantId, userId, requestId, approvedAmount, disbursementType, currency, reference, notes,
    });
    return apiResponse.sendSuccess(res, result, "Funding request approved and disbursement created");
  }),

  rejectFundingRequest: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const userId = req.user.incubationUserId;
    const { requestId } = req.params;
    const { reviewNote } = req.body;

    if (!requestId) throw new ApiError(400, "requestId is required");

    const result = await fundingService.rejectFundingRequest({
      tenantId, userId, requestId, reviewNote,
    });
    return apiResponse.sendSuccess(res, result, "Funding request rejected");
  }),
};

