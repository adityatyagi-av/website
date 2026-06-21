import { PortalBillingService } from "../../../services/incubation/portal/billing.service.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";
import { resolveTenantId } from "../../../utils/tenantResolver.js";
import { ApiError } from "../../../utils/ApiError.js";

export const PortalBillingController = {
  getBillingDashboard: asyncHandler(async (req, res) => {
    try {
      const tenantId = await resolveTenantId(req);
      const result = await PortalBillingService.getBillingDashboard(tenantId);
      return apiResponse.sendSuccess(res, result, "Billing dashboard fetched successfully");
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(res, error.statusCode, null, error.message);
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),

  createPaymentOrder: asyncHandler(async (req, res) => {
    try {
      const tenantId = await resolveTenantId(req);
      const result = await PortalBillingService.createPaymentOrder(tenantId);
      return apiResponse.sendSuccess(res, result, "Payment order created successfully");
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(res, error.statusCode, null, error.message);
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),

  verifyPayment: asyncHandler(async (req, res) => {
    try {
      const tenantId = await resolveTenantId(req);
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        throw new ApiError(400, "All payment details are required");
      }

      const result = await PortalBillingService.verifyAndRecordPayment({
        tenantId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      });

      return apiResponse.sendSuccess(res, result, "Payment verified and recorded successfully");
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(res, error.statusCode, null, error.message);
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),
};
