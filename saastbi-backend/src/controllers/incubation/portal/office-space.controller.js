import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";
import { ApiError } from "../../../utils/ApiError.js";
import {
  officeSpaceSchema,
  updateOfficeSpaceSchema,
  addPricingSchema,
  updatePricingSchema,
  allocateOfficeSchema,
  approveRequestSchema,
  rejectRequestSchema
} from "../../../validator/office-space.validator.js";
import { officeSpaceService } from "../../../services/incubation/portal/office-space.service.js";
import { resolveTenantId } from "../../../utils/tenantResolver.js";

export const OfficeController = {
  // ==================== OFFICE SPACE CRUD ====================

  createOfficeSpace: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);

    const parse = officeSpaceSchema.safeParse(req.body);
    if (!parse.success) {
      throw new ApiError(400, parse.error.errors[0].message);
    }

    const result = await officeSpaceService.createOfficeSpace({
      tenantId,
      data: parse.data
    });

    return apiResponse.sendCreated(res, result, "Office space created");
  }),

  getOfficeSpaces: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);

    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
      search = ""
    } = req.query;

    const result = await officeSpaceService.getOfficeSpaces({
      tenantId,
      page: Number(page),
      limit: Number(limit),
      sortBy,
      order,
      search
    });

    return apiResponse.sendSuccess(res, result, "Office spaces fetched");
  }),

  getOfficeSpace: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { officeId } = req.params;

    const result = await officeSpaceService.getOfficeSpaceById({
      tenantId,
      officeId
    });

    return apiResponse.sendSuccess(res, result, "Office space details fetched");
  }),

  updateOfficeSpace: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { officeId } = req.params;

    console.log("REQ BODY ",req.body)

    const parse = updateOfficeSpaceSchema.safeParse(req.body);
    if (!parse.success) {
      throw new ApiError(400, parse.error.errors[0].message);
    }

    const result = await officeSpaceService.updateOfficeSpace({
      tenantId,
      officeId,
      data: parse.data
    });

    return apiResponse.sendUpdated(res, result, "Office space updated");
  }),

  deleteOfficeSpace: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { officeId } = req.params;

    const result = await officeSpaceService.deleteOfficeSpace({
      tenantId,
      officeId
    });

    return apiResponse.sendSuccess(res, result, "Office space archived");
  }),

  // ==================== PRICING MANAGEMENT ====================

  getPricing: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { officeId } = req.params;

    const result = await officeSpaceService.getPricing({
      tenantId,
      officeId
    });

    return apiResponse.sendSuccess(res, result, "Pricing options fetched");
  }),

  addPricing: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { officeId } = req.params;

    const parse = addPricingSchema.safeParse(req.body);
    if (!parse.success) {
      throw new ApiError(400, parse.error.errors[0].message);
    }

    const result = await officeSpaceService.addPricing({
      tenantId,
      officeId,
      data: parse.data
    });

    return apiResponse.sendCreated(res, result, "Pricing added");
  }),

  updatePricing: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { officeId, pricingId } = req.params;

    const parse = updatePricingSchema.safeParse(req.body);
    if (!parse.success) {
      throw new ApiError(400, parse.error.errors[0].message);
    }

    const result = await officeSpaceService.updatePricing({
      tenantId,
      officeId,
      pricingId,
      data: parse.data
    });

    return apiResponse.sendUpdated(res, result, "Pricing updated");
  }),

  deletePricing: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { officeId, pricingId } = req.params;

    await officeSpaceService.deletePricing({
      tenantId,
      officeId,
      pricingId
    });

    return apiResponse.sendDeleted(res, null, "Pricing deleted");
  }),

  // ==================== REQUEST MANAGEMENT ====================

  getAllRequests: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { page = 1, limit = 10, status, search = "" } = req.query;

    const result = await officeSpaceService.getAllRequests({
      tenantId,
      page: Number(page),
      limit: Number(limit),
      status,
      search
    });

    return apiResponse.sendSuccess(res, result, "All requests fetched");
  }),

  getRequestDetails: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { requestId } = req.params;

    const result = await officeSpaceService.getRequestDetails({
      tenantId,
      requestId
    });

    return apiResponse.sendSuccess(res, result, "Request details fetched");
  }),

  approveRequest: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const incubationUserId = req.user.incubationUserId;
    const { requestId } = req.params;

    const parse = approveRequestSchema.safeParse(req.body);
    if (!parse.success) {
      throw new ApiError(400, parse.error.errors[0].message);
    }

    const result = await officeSpaceService.approveRequest({
      requestId,
      tenantId,
      incubationUserId,
      officeId: parse.data.officeId,
      startDate: parse.data.startDate,
      endDate: parse.data.endDate
    });

    return apiResponse.sendSuccess(res, result, "Request approved & office allocated");
  }),

  rejectRequest: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { requestId } = req.params;

    const parse = rejectRequestSchema.safeParse(req.body);
    if (!parse.success) {
      throw new ApiError(400, parse.error.errors[0].message);
    }

    const result = await officeSpaceService.rejectRequest({
      requestId,
      tenantId,
      rejectionReason: parse.data.rejectionReason
    });

    return apiResponse.sendSuccess(res, result, "Request rejected");
  }),

  // ==================== ALLOCATION MANAGEMENT ====================

  allocateOffice: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const allocatedById = req.user.incubationUserId;

    const parse = allocateOfficeSchema.safeParse(req.body);
    if (!parse.success) {
      throw new ApiError(400, parse.error.errors[0].message);
    }

    const result = await officeSpaceService.allocateOffice({
      tenantId,
      officeId: parse.data.officeId,
      startupId: parse.data.startupId,
      allocatedById,
      startDate: parse.data.startDate,
      endDate: parse.data.endDate
    });

    return apiResponse.sendCreated(res, result, "Office allocated successfully");
  }),

  endAllocation: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { allocationId } = req.params;

    const result = await officeSpaceService.endAllocation({
      allocationId,
      tenantId
    });

    return apiResponse.sendSuccess(res, result, "Office allocation ended");
  }),

  getAllocations: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { page = 1, limit = 10, search = "", status } = req.query;

    const result = await officeSpaceService.getAllocations({
      tenantId,
      page: Number(page),
      limit: Number(limit),
      search,
      status
    });

    return apiResponse.sendSuccess(res, result, "Allocations fetched");
  }),

  getAllocationDetails: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { allocationId } = req.params;

    const result = await officeSpaceService.getAllocationDetails({
      allocationId,
      tenantId
    });

    return apiResponse.sendSuccess(res, result, "Allocation details fetched");
  }),

  getOfficeAvailability: asyncHandler(async (req, res) => {
    const { officeId } = req.params;

    const result = await officeSpaceService.getOfficeAvailability({
      officeId
    });

    return apiResponse.sendSuccess(res, result, "Availability fetched");
  }),

  // ==================== DASHBOARD ====================

  getDashboardStats: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);

    const result = await officeSpaceService.getDashboardStats({
      tenantId
    });

    return apiResponse.sendSuccess(res, result, "Dashboard stats fetched");
  })
};