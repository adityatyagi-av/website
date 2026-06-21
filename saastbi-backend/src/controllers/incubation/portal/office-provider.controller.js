import { apiResponse } from "../../../utils/responseUtils.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { ApiError } from "../../../utils/ApiError.js";
import { OfficeCoreService } from "../../../services/office.core.service.js";
import {
  createOfficeSchema,
  updateOfficeSchema,
  addPricingSchema,
  updatePricingSchema,
  approveRequestSchema,
  rejectRequestSchema,
  allocateOfficeSchema,
  officeFiltersSchema,
  requestFiltersSchema,
  allocationFiltersSchema,
  bookingFiltersSchema,
  paymentFiltersSchema,
  refundPaymentSchema,
  availabilitySchema,
  calendarSchema
} from "../../../validators/office.validator.js";
import { resolveTenantId } from "../../../utils/tenantResolver.js";

// Get user ID from authenticated request
const getUserId = (req) => req.user.incubationUserId;

export const OfficeProviderController = {
  // ==================== OFFICE SPACE CRUD ====================

  createOfficeSpace: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const parse = createOfficeSchema.safeParse(req.body);
    if (!parse.success) throw new ApiError(400, parse.error.errors[0].message);

    const result = await OfficeCoreService.createOffice({ tenantId, data: parse.data });
    return apiResponse.sendCreated(res, result, "Office space created");
  }),

  getOfficeSpaces: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const filters = officeFiltersSchema.parse(req.query);
    
    const result = await OfficeCoreService.getOffices({ tenantId, filters });
    return apiResponse.sendSuccess(res, result, "Office spaces fetched");
  }),

  getOfficeSpace: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { officeId } = req.params;

    const result = await OfficeCoreService.getOfficeById({ officeId, tenantId });
    return apiResponse.sendSuccess(res, result, "Office space fetched");
  }),

  updateOfficeSpace: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { officeId } = req.params;
    const parse = updateOfficeSchema.safeParse(req.body);
    if (!parse.success) throw new ApiError(400, parse.error.errors[0].message);

    const result = await OfficeCoreService.updateOffice({ officeId, tenantId, data: parse.data });
    return apiResponse.sendSuccess(res, result, "Office space updated");
  }),

  deleteOfficeSpace: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { officeId } = req.params;

    const result = await OfficeCoreService.deleteOffice({ officeId, tenantId });
    return apiResponse.sendSuccess(res, result, "Office space deleted");
  }),

  // ==================== PRICING ====================

  getPricing: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { officeId } = req.params;

    const result = await OfficeCoreService.getPricing({ officeId, tenantId });
    return apiResponse.sendSuccess(res, result, "Pricing options fetched");
  }),

  addPricing: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { officeId } = req.params;
    const parse = addPricingSchema.safeParse(req.body);
    if (!parse.success) throw new ApiError(400, parse.error.errors[0].message);

    const result = await OfficeCoreService.addPricing({ officeId, tenantId, data: parse.data });
    return apiResponse.sendCreated(res, result, "Pricing added");
  }),

  updatePricing: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { officeId, pricingId } = req.params;
    const parse = updatePricingSchema.safeParse(req.body);
    if (!parse.success) throw new ApiError(400, parse.error.errors[0].message);

    const result = await OfficeCoreService.updatePricing({ officeId, pricingId, tenantId, data: parse.data });
    return apiResponse.sendSuccess(res, result, "Pricing updated");
  }),

  deletePricing: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { officeId, pricingId } = req.params;

    const result = await OfficeCoreService.deletePricing({ officeId, pricingId, tenantId });
    return apiResponse.sendSuccess(res, result, "Pricing deleted");
  }),

  // ==================== AVAILABILITY ====================

  getAvailability: asyncHandler(async (req, res) => {
    const { officeId } = req.params;
    const parse = availabilitySchema.safeParse(req.query);
    if (!parse.success) throw new ApiError(400, parse.error.errors[0].message);

    const result = await OfficeCoreService.checkAvailability({
      officeId,
      startDate: parse.data.startDate,
      endDate: parse.data.endDate
    });
    return apiResponse.sendSuccess(res, result, "Availability fetched");
  }),

  getCalendar: asyncHandler(async (req, res) => {
    const { officeId } = req.params;
    const parse = calendarSchema.safeParse(req.query);
    if (!parse.success) throw new ApiError(400, parse.error.errors[0].message);

    const result = await OfficeCoreService.getOfficeCalendar({
      officeId,
      month: parse.data.month,
      year: parse.data.year
    });
    return apiResponse.sendSuccess(res, result, "Calendar fetched");
  }),

  // ==================== REQUESTS ====================

  getAllRequests: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const filters = requestFiltersSchema.parse(req.query);

    const result = await OfficeCoreService.getReceivedRequests({ tenantId, filters });
    return apiResponse.sendSuccess(res, result, "Requests fetched");
  }),

  getRequestDetails: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { requestId } = req.params;

    const result = await OfficeCoreService.getRequestById({ requestId, tenantId });
    return apiResponse.sendSuccess(res, result, "Request details fetched");
  }),

  approveRequest: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const incubationUserId = getUserId(req);
    const { requestId } = req.params;
    const parse = approveRequestSchema.safeParse(req.body);
    if (!parse.success) {
      throw new ApiError(
        400,
        parse.error.errors[0].message
      );
    }

    const result = await OfficeCoreService.approveRequest({
      requestId,
      tenantId,
      incubationUserId,
      data: parse.data
    });
    return apiResponse.sendSuccess(res, result, "Request approved");
  }),

  rejectRequest: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { requestId } = req.params;
    const incubationUserId= req.user.incubationUserId;
    const parse = rejectRequestSchema.safeParse(req.body);
    if (!parse.success) throw new ApiError(400, parse.error.errors[0].message);

    const result = await OfficeCoreService.rejectRequest({
      requestId,
      tenantId,
      incubationUserId,
      rejectionReason: parse.data.rejectionReason
    });
    return apiResponse.sendSuccess(res, result, "Request rejected");
  }),

  // ==================== ALLOCATIONS ====================

  allocateOffice: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const incubationUserId = getUserId(req);
    const parse = allocateOfficeSchema.safeParse(req.body);
    if (!parse.success) throw new ApiError(400, parse.error.errors[0].message);

    const result = await OfficeCoreService.allocateOffice({
      tenantId,
      incubationUserId,
      data: parse.data
    });
    return apiResponse.sendCreated(res, result, "Office allocated successfully");
  }),

  getAllocations: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const filters = allocationFiltersSchema.parse(req.query);

    const result = await OfficeCoreService.getAllocations({ tenantId, filters });
    return apiResponse.sendSuccess(res, result, "Allocations fetched");
  }),

  getAllocationDetails: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { allocationId } = req.params;

    const result = await OfficeCoreService.getAllocationById({ allocationId, tenantId });
    return apiResponse.sendSuccess(res, result, "Allocation details fetched");
  }),

  endAllocation: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { allocationId } = req.params;

    const result = await OfficeCoreService.endAllocation({ allocationId, tenantId });
    return apiResponse.sendSuccess(res, result, "Allocation ended");
  }),

  extendAllocation: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { allocationId } = req.params;
  
    const parse = extendAllocationSchema.safeParse(req.body);
  
    if (!parse.success) {
      console.log("VALIDATION ERROR:", parse.error.format());
      throw new ApiError(400, "Invalid request body");
    }
  
    const result = await OfficeCoreService.extendAllocation({
      tenantId,
      allocationId,
      data: parse.data
    });
  
    return apiResponse.sendSuccess(
      res,
      result,
      "Allocation extended successfully"
    );
  }),

  // ==================== BOOKINGS ====================

  getBookings: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const filters = bookingFiltersSchema.parse(req.query);

    const result = await OfficeCoreService.getBookings({ role: "owner", tenantId, filters });
    return apiResponse.sendSuccess(res, result, "Bookings fetched");
  }),

  getBookingDetails: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { bookingId } = req.params;

    const result = await OfficeCoreService.getBookingById({ bookingId, tenantId });
    return apiResponse.sendSuccess(res, result, "Booking details fetched");
  }),

  confirmBooking: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { bookingId } = req.params;

    const result = await OfficeCoreService.confirmBooking({ bookingId, tenantId });
    return apiResponse.sendSuccess(res, result, "Booking confirmed");
  }),

  activateBooking: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { bookingId } = req.params;

    const result = await OfficeCoreService.activateBooking({ bookingId, tenantId });
    return apiResponse.sendSuccess(res, result, "Booking activated");
  }),

  completeBooking: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { bookingId } = req.params;

    const result = await OfficeCoreService.completeBooking({ bookingId, tenantId });
    return apiResponse.sendSuccess(res, result, "Booking completed");
  }),

  cancelBooking: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { bookingId } = req.params;
    const { cancellationReason } = req.body;
    const { startupId } = req.body;

    const result = await OfficeCoreService.cancelBooking({ bookingId, tenantId,startupId, cancellationReason });
    return apiResponse.sendSuccess(res, result, "Booking cancelled");
  }),

  // ==================== PAYMENTS ====================

  getPayments: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const filters = paymentFiltersSchema.parse(req.query);

    const result = await OfficeCoreService.getPayments({ tenantId, filters });
    return apiResponse.sendSuccess(res, result, "Payments fetched");
  }),

  getPaymentDetails: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { paymentId } = req.params;

    const result = await OfficeCoreService.getPaymentById({ paymentId, tenantId });
    return apiResponse.sendSuccess(res, result, "Payment details fetched");
  }),

  initiateRefund: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { paymentId } = req.params;
    const parse = refundPaymentSchema.safeParse(req.body);
    if (!parse.success) throw new ApiError(400, parse.error.errors[0].message);

    const result = await OfficeCoreService.initiateRefund({
      paymentId,
      tenantId,
      amount: parse.data.amount,
      reason: parse.data.reason
    });
    return apiResponse.sendSuccess(res, result, "Refund initiated");
  }),

  getInvoice: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { paymentId } = req.params;

    const result = await OfficeCoreService.getInvoice({ paymentId, tenantId });
    return apiResponse.sendSuccess(res, result, "Invoice fetched");
  }),

  // ==================== DASHBOARD ====================

  getDashboard: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);

    const result = await OfficeCoreService.getProviderDashboard({ tenantId });
    return apiResponse.sendSuccess(res, result, "Dashboard stats fetched");
  })
};

export default OfficeProviderController;
