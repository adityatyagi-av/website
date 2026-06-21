/**
 * Office Receiver Controller (Startup Portal)
 * 
 * Handles all office browsing, requesting, and booking operations for startups
 */

import { apiResponse } from "../../utils/responseUtils.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import db from "../../db/db.js";
import { OfficeCoreService } from "../../services/office.core.service.js";
import {
  createRequestSchema,
  directBookingSchema,
  initiatePaymentSchema,
  verifyPaymentSchema,
  cancelBookingSchema,
  browseFiltersSchema,
  requestFiltersSchema,
  bookingFiltersSchema,
  paymentFiltersSchema,
  availabilitySchema,
  calendarSchema
} from "../../validators/office.validator.js";

// Helper to get startup context - checks body, query, token, then DB
const getStartupContext = async (req) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "User not authenticated");
  
  // Priority: body > query > token > DB lookup
  let startupId = req.body?.startupId || req.query?.startupId || req.user?.startupId;
  // If not found anywhere, query the database for active membership
  if (!startupId) {
    const membership = await db.startupMember.findFirst({
      where: { userId, isActive: true },
      select: { startupId: true }
    });
    
    if (!membership) {
      throw new ApiError(400, "User is not associated with any startup. Please provide startupId.");
    }
    startupId = membership.startupId;
  }
  
  return { userId, startupId };
};

// Helper to get tenant association for visibility filtering
const getTenantId = async (req) => {
  // Check if in token first
  if (req.user?.incubatedTenantId) {
    return req.user.incubatedTenantId;
  }
  
  // Otherwise query the database
  const { startupId } = await getStartupContext(req);
  const association = await db.startupTenantAssociation.findFirst({
    where: { startupId, isActive: true },
    select: { tenantId: true }
  });
  
  return association?.tenantId || null;
};

export const OfficeReceiverController = {
  // ==================== BROWSE OFFICES ====================

  browseOffices: asyncHandler(async (req, res) => {
    const { startupId } = await getStartupContext(req);
    const tenantId = await getTenantId(req);
    const filters = browseFiltersSchema.parse(req.query);

    const result = await OfficeCoreService.browseOffices({ startupId, tenantId, filters });
    return apiResponse.sendSuccess(res, result, "Offices fetched");
  }),

  getOfficeDetails: asyncHandler(async (req, res) => {
    const { officeId } = req.params;

    const result = await OfficeCoreService.getOfficeById({ officeId });
    return apiResponse.sendSuccess(res, result, "Office details fetched");
  }),

  getOfficeAvailability: asyncHandler(async (req, res) => {
    const { officeId } = req.params;
    const parse = availabilitySchema.safeParse(req.query);
    if (!parse.success) throw new ApiError(400, parse.error.errors[0].message);

    const result = await OfficeCoreService.checkAvailability({
      officeId,
      startDate: parse.data.startDate,
      endDate: parse.data.endDate,
      pricingType: parse.data.pricingType
    });
    return apiResponse.sendSuccess(res, result, "Availability fetched");
  }),

  getOfficeCalendar: asyncHandler(async (req, res) => {
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

  getOfficePricing: asyncHandler(async (req, res) => {
    const { officeId } = req.params;

    const result = await OfficeCoreService.getPricing({ officeId });
    return apiResponse.sendSuccess(res, result, "Pricing options fetched");
  }),

  // ==================== REQUESTS ====================

  createRequest: asyncHandler(async (req, res) => {
    const { userId, startupId } = await getStartupContext(req);
    const parse = createRequestSchema.safeParse(req.body);
    if (!parse.success) throw new ApiError(400, parse.error.errors[0].message);

    const result = await OfficeCoreService.createRequest({
      userId,
      startupId,
      data: {
        ...parse.data,
        requesterType: "STARTUP",
        requesterId: startupId
      }
    });
    return apiResponse.sendCreated(res, result, "Request created");
  }),

  getMyRequests: asyncHandler(async (req, res) => {
    const { userId, startupId } = await getStartupContext(req);
    const filters = requestFiltersSchema.parse(req.query);

    const result = await OfficeCoreService.getSentRequests({ userId, startupId, filters });
    return apiResponse.sendSuccess(res, result, "Requests fetched");
  }),

  getRequestDetails: asyncHandler(async (req, res) => {
    const { startupId } = await getStartupContext(req);
    const { requestId } = req.params;

    const result = await OfficeCoreService.getRequestById({ requestId });
    
    // Verify startup owns this request
    if (result.startupId !== startupId) {
      throw new ApiError(403, "Not authorized to view this request");
    }
    
    return apiResponse.sendSuccess(res, result, "Request details fetched");
  }),

  cancelRequest: asyncHandler(async (req, res) => {
    const { userId, startupId } = await getStartupContext(req);
    const { requestId } = req.params;
    const result = await OfficeCoreService.cancelRequest({ requestId, userId, startupId });
    return apiResponse.sendSuccess(res, result, "Request cancelled");
  }),

  // ==================== BOOKINGS ====================

  createDirectBooking: asyncHandler(async (req, res) => {
    const { userId, startupId } = await getStartupContext(req);
    const parse = directBookingSchema.safeParse(req.body);
    if (!parse.success) throw new ApiError(400, parse.error.errors[0].message);

    const result = await OfficeCoreService.createDirectBooking({
      userId,
      startupId,
      data: parse.data
    });
    return apiResponse.sendCreated(res, result, "Booking created");
  }),

  getMyBookings: asyncHandler(async (req, res) => {
    const { startupId } = await getStartupContext(req);
    const filters = bookingFiltersSchema.parse(req.query);

    const result = await OfficeCoreService.getBookings({
      role: "booker",
      startupId,
      filters
    });
    return apiResponse.sendSuccess(res, result, "Bookings fetched");
  }),

  getBookingDetails: asyncHandler(async (req, res) => {
    const { startupId } = await getStartupContext(req);
    const { bookingId } = req.params;

    const result = await OfficeCoreService.getBookingById({ bookingId, startupId });
    return apiResponse.sendSuccess(res, result, "Booking details fetched");
  }),

  cancelBooking: asyncHandler(async (req, res) => {
    const { startupId } = await getStartupContext(req);
    const { bookingId } = req.params;
    const parse = cancelBookingSchema.safeParse(req.body);
    
    const result = await OfficeCoreService.cancelBooking({
      bookingId,
      startupId,
      cancellationReason: parse.success ? parse.data.cancellationReason : undefined
    });
    return apiResponse.sendSuccess(res, result, "Booking cancelled");
  }),

  // ==================== PAYMENTS ====================

  initiatePayment: asyncHandler(async (req, res) => {
    const { userId, startupId } = await getStartupContext(req);
    const parse = initiatePaymentSchema.safeParse(req.body);
    if (!parse.success) throw new ApiError(400, parse.error.errors[0].message);

    const result = await OfficeCoreService.initiatePayment({
      userId,
      startupId,
      bookingId: parse.data.bookingId,
      paymentType: parse.data.paymentType
    });
    return apiResponse.sendSuccess(res, result, "Payment initiated");
  }),

  verifyPayment: asyncHandler(async (req, res) => {
    const parse = verifyPaymentSchema.safeParse(req.body);
    if (!parse.success) throw new ApiError(400, parse.error.errors[0].message);

    const result = await OfficeCoreService.verifyPayment({
      paymentId: parse.data.paymentId,
      razorpayPaymentId: parse.data.razorpayPaymentId,
      razorpaySignature: parse.data.razorpaySignature
    });
    return apiResponse.sendSuccess(res, result, "Payment verified");
  }),

  getMyPayments: asyncHandler(async (req, res) => {
    const { startupId } = await getStartupContext(req);
    const filters = paymentFiltersSchema.parse(req.query);

    const result = await OfficeCoreService.getPayments({ startupId, filters });
    return apiResponse.sendSuccess(res, result, "Payments fetched");
  }),

  getPaymentDetails: asyncHandler(async (req, res) => {
    const { startupId } = await getStartupContext(req);
    const { paymentId } = req.params;

    const result = await OfficeCoreService.getPaymentById({ paymentId, startupId });
    return apiResponse.sendSuccess(res, result, "Payment details fetched");
  }),

  getInvoice: asyncHandler(async (req, res) => {
    const { startupId } = await getStartupContext(req);
    const { paymentId } = req.params;

    const result = await OfficeCoreService.getInvoice({ paymentId, startupId });
    return apiResponse.sendSuccess(res, result, "Invoice fetched");
  }),

  // ==================== MY OFFICES ====================

  getMyCurrentOffices: asyncHandler(async (req, res) => {
    const { startupId } = await getStartupContext(req);

    const result = await OfficeCoreService.getMyCurrentOffices({ startupId });
    return apiResponse.sendSuccess(res, result, "Current offices fetched");
  }),

  getMyOfficeHistory: asyncHandler(async (req, res) => {
    const { startupId } = await getStartupContext(req);

    const result = await OfficeCoreService.getMyOfficeHistory({ startupId });
    return apiResponse.sendSuccess(res, result, "Office history fetched");
  }),

  // ==================== DASHBOARD ====================

  getDashboard: asyncHandler(async (req, res) => {
    const { startupId } = await getStartupContext(req);

    const result = await OfficeCoreService.getReceiverDashboard({ startupId });
    return apiResponse.sendSuccess(res, result, "Dashboard fetched");
  })
};

export default OfficeReceiverController;
