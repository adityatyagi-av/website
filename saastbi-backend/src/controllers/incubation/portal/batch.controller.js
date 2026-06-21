import { batchService } from "../../../services/incubation/portal/batch.service.js";
import { ApiError } from "../../../utils/ApiError.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";

export const BatchController = {
  createBatch: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;
    if (!tenantKey) throw new ApiError(400, "tenantKey is required");

    const { programId } = req.params;
    if (!programId) throw new ApiError(400, "programId is required");

    const {
      batchName,
      batchCode,
      description,
      applicationStartDate,
      applicationEndDate,
      maxSlots,
      totalFundingAmount,
      fundingType,
      fundingCurrency,
      isFundingAvailable,
    } = req.body;

    if (!batchName) throw new ApiError(400, "batchName is required");

    const batch = await batchService.createBatch({
      tenantKey,
      programId,
      batchName,
      batchCode,
      description,
      applicationStartDate,
      applicationEndDate,
      maxSlots,
      totalFundingAmount,
      fundingType,
      fundingCurrency,
      isFundingAvailable,
    });

    return apiResponse.sendSuccess(res, batch, "Batch created successfully", 201);
  }),

  updateBatch: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;
    if (!tenantKey) throw new ApiError(400, "tenantKey is required");

    const { batchId } = req.params;
    if (!batchId) throw new ApiError(400, "batchId is required");

    const batch = await batchService.updateBatch(batchId, {
      tenantKey,
      ...req.body,
    });

    return apiResponse.sendSuccess(res, batch, "Batch updated successfully");
  }),

  getBatchesByProgram: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"];
    if (!tenantKey) throw new ApiError(400, "tenantKey is required");

    const { programId } = req.params;
    if (!programId) throw new ApiError(400, "programId is required");

    const { status, page = 1, limit=10, search="",sortBy = "createdAt",order = "desc" } = req.query;

    const batches = await batchService.getBatchesByProgram({
      programId,
      tenantKey,
      status,
      page:Number(page),
      limit:Number(limit),
      search,
      sortBy,
      order
    });

    return apiResponse.sendSuccess(res, batches, "Batches fetched successfully");
  }),

  getBatchById: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"];
    if (!tenantKey) throw new ApiError(400, "tenantKey is required");

    const { batchId } = req.params;
    if (!batchId) throw new ApiError(400, "batchId is required");

    const batch = await batchService.getBatchById(batchId, tenantKey);

    return apiResponse.sendSuccess(res, batch, "Batch details fetched successfully");
  }),

  changeBatchStatus: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;
    if (!tenantKey) throw new ApiError(400, "tenantKey is required");

    const { batchId } = req.params;
    if (!batchId) throw new ApiError(400, "batchId is required");

    const { newStatus } = req.body;
    if (!newStatus) throw new ApiError(400, "newStatus is required");

    const batch = await batchService.changeBatchStatus({
      batchId,
      newStatus,
      tenantKey,
    });

    return apiResponse.sendSuccess(res, batch, `Batch status changed to ${newStatus} successfully`);
  }),

  deleteBatch: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"];
    if (!tenantKey) throw new ApiError(400, "tenantKey is required");

    const { batchId } = req.params;
    if (!batchId) throw new ApiError(400, "batchId is required");

    await batchService.deleteBatch(batchId, tenantKey);

    return apiResponse.sendSuccess(res, null, "Batch deleted successfully");
  }),

  getBatchRegistrations: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"];
    if (!tenantKey) throw new ApiError(400, "tenantKey is required");

    const { programId, batchId } = req.params;
    const { page, limit, search, sortBy, order, status } = req.query;

    const registrations = await batchService.getBatchRegistrations({
      tenantKey,
      programId,
      batchId,
      page,
      limit,
      search,
      sortBy,
      order,
      status,
    });

    return apiResponse.sendSuccess(res, registrations, "Batch registrations fetched successfully");
  }),

  getBatchStartups: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"];
    if (!tenantKey) throw new ApiError(400, "tenantKey is required");

    const { programId, batchId } = req.params;
    const { page, limit, search, sortBy, order, programStatus } = req.query;

    const startups = await batchService.getBatchStartups({
      programId,
      batchId,
      tenantKey,
      page,
      limit,
      search,
      sortBy,
      order,
      programStatus,
    });

    return apiResponse.sendSuccess(res, startups, "Batch startups fetched successfully");
  }),
};
