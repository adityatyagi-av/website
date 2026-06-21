import { SubscriptionServices } from "../../services/incubation/subscription.service.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/responseUtils.js";


export const SubscriptionController = {
  createSubscription: asyncHandler(async (req, res) => {
    try {
      const { planId, tenantId } = req.body;
      if (!planId || !tenantId) {
        throw new ApiError(400, "Plan ID and Tenant ID are required");
      }
      const result = await SubscriptionServices.createSubscription({
        planId,
        tenantId,
      });
      return apiResponse.sendCustomResponse(
        res,
        201,
        result,
        "Subscription created successfully"
      );
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(
          res,
          error.statusCode,
          null,
          error.message
        );
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),

  verifyPayment: asyncHandler(async (req, res) => {
    try {
      const {
        razorpay_payment_id,
        razorpay_subscription_id,
        razorpay_signature,
        tenantId,
      } = req.body;

      if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature || !tenantId) {
        throw new ApiError(400, "All payment details are required");
      }
      const result = await SubscriptionServices.verifyPayment({
        razorpay_payment_id,
        razorpay_subscription_id,
        razorpay_signature,
        tenantId,
      });
      return apiResponse.sendCustomResponse(
        res,
        200,
        result,
        "Payment verified and subscription activated"
      );
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(
          res,
          error.statusCode,
          null,
          error.message
        );
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),

  getSubscriptionByTenant: asyncHandler(async (req, res) => {
    try {
      const { tenantId } = req.params;
      if (!tenantId) {
        throw new ApiError(400, "Tenant ID is required");
      }
      const subscription = await SubscriptionServices.getSubscriptionByTenant(tenantId);
      return apiResponse.sendCustomResponse(
        res,
        200,
        subscription,
        "Subscription fetched successfully"
      );
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(
          res,
          error.statusCode,
          null,
          error.message
        );
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),

  getAllSubscriptions: asyncHandler(async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        search = "",
      } = req.query;

      const result = await SubscriptionServices.getAllSubscriptions({
        page: Number(page),
        limit: Number(limit),
        status,
        search,
      });

      return apiResponse.sendCustomResponse(
        res,
        200,
        result,
        "Subscriptions fetched successfully"
      );
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(
          res,
          error.statusCode,
          null,
          error.message
        );
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),

  cancelSubscription: asyncHandler(async (req, res) => {
    try {
      const { subscriptionId } = req.params;
      const { cancelAtCycleEnd = true } = req.body;

      if (!subscriptionId) {
        throw new ApiError(400, "Subscription ID is required");
      }

      const result = await SubscriptionServices.cancelSubscription({
        subscriptionId,
        cancelAtCycleEnd,
      });

      return apiResponse.sendCustomResponse(
        res,
        200,
        result,
        "Subscription cancelled successfully"
      );
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(
          res,
          error.statusCode,
          null,
          error.message
        );
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),

  handleWebhook: asyncHandler(async (req, res) => {
    try {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      const signature = req.headers["x-razorpay-signature"];

      if (!signature) {
        throw new ApiError(400, "Missing webhook signature");
      }

      const result = await SubscriptionServices.handleWebhook({
        body: req.body,
        signature,
        webhookSecret,
      });

      return apiResponse.sendCustomResponse(
        res,
        200,
        result,
        "Webhook processed successfully"
      );
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(
          res,
          error.statusCode,
          null,
          error.message
        );
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),

  changePlan: asyncHandler(async (req, res) => {
    try {
      const { tenantId, newPlanId } = req.body;
      if (!tenantId || !newPlanId) {
        throw new ApiError(400, "Tenant ID and New Plan ID are required");
      }

      const result = await SubscriptionServices.changePlan({
        tenantId,
        newPlanId,
      });

      return apiResponse.sendCustomResponse(
        res,
        200,
        result,
        `Plan ${result.changeType} initiated successfully`
      );
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(
          res,
          error.statusCode,
          null,
          error.message
        );
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),

  getBillingInfo: asyncHandler(async (req, res) => {
    try {
      const { tenantId } = req.params;
      if (!tenantId) {
        throw new ApiError(400, "Tenant ID is required");
      }

      const result = await SubscriptionServices.getBillingInfo({ tenantId });

      return apiResponse.sendCustomResponse(
        res,
        200,
        result,
        "Billing info fetched successfully"
      );
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(
          res,
          error.statusCode,
          null,
          error.message
        );
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),

  getAvailablePlans: asyncHandler(async (req, res) => {
    try {
      const { tenantId } = req.params;
      if (!tenantId) {
        throw new ApiError(400, "Tenant ID is required");
      }

      const plans = await SubscriptionServices.getAvailablePlans({ tenantId });

      return apiResponse.sendCustomResponse(
        res,
        200,
        plans,
        "Plans fetched successfully"
      );
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(
          res,
          error.statusCode,
          null,
          error.message
        );
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),
};
