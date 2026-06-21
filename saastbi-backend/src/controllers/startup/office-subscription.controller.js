import { apiResponse } from "../../utils/responseUtils.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import db from "../../db/db.js";
import { OfficeSubscriptionService } from "../../services/common/office-subscription.service.js";
import {
  initiateBookingPaymentSchema,
  verifySubscriptionAuthorizationSchema,
  verifyOneTimePaymentSchema,
  cancelSubscriptionSchema,
  subscriptionListFiltersSchema,
} from "../../validators/incubation/office-subscription.validator.js";

const getStartupContext = async (req) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "User not authenticated");

  let startupId = req.body?.startupId || req.query?.startupId || req.user?.startupId;
  if (!startupId) {
    const membership = await db.startupMember.findFirst({
      where: { userId, isActive: true },
      select: { startupId: true },
    });
    if (!membership) {
      throw new ApiError(400, "User is not associated with any startup. Please provide startupId.");
    }
    startupId = membership.startupId;
  }
  return { userId, startupId };
};

export const OfficeSubscriptionReceiverController = {
  initiatePayment: asyncHandler(async (req, res) => {
    const { startupId } = await getStartupContext(req);
    const parsed = initiateBookingPaymentSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

    const result = await OfficeSubscriptionService.initiateBookingPayment({
      bookingId: parsed.data.bookingId,
      startupId,
    });
    return apiResponse.sendSuccess(res, result, "Payment initiated");
  }),

  verifySubscription: asyncHandler(async (req, res) => {
    const { startupId } = await getStartupContext(req);
    const parsed = verifySubscriptionAuthorizationSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

    const sub = await db.officeSubscription.findUnique({
      where: { bookingId: parsed.data.bookingId },
    });
    if (!sub) throw new ApiError(404, "Subscription not found");
    if (sub.startupId && sub.startupId !== startupId) {
      throw new ApiError(403, "Not authorized");
    }

    const result = await OfficeSubscriptionService.verifySubscriptionAuthorization({
      bookingId: parsed.data.bookingId,
      razorpayPaymentId: parsed.data.razorpayPaymentId,
      razorpaySubscriptionId: parsed.data.razorpaySubscriptionId,
      razorpaySignature: parsed.data.razorpaySignature,
    });
    return apiResponse.sendSuccess(res, result, "Subscription authorized");
  }),

  list: asyncHandler(async (req, res) => {
    const { startupId } = await getStartupContext(req);
    const filters = subscriptionListFiltersSchema.parse(req.query);

    const result = await OfficeSubscriptionService.listSubscriptions({
      startupId,
      filters,
    });
    return apiResponse.sendSuccess(res, result, "Subscriptions fetched");
  }),

  getById: asyncHandler(async (req, res) => {
    const { startupId } = await getStartupContext(req);
    const { bookingId } = req.params;

    const result = await OfficeSubscriptionService.getSubscription({
      bookingId,
      startupId,
    });
    return apiResponse.sendSuccess(res, result, "Subscription fetched");
  }),

  cancel: asyncHandler(async (req, res) => {
    const { startupId } = await getStartupContext(req);
    const { bookingId } = req.params;
    const parsed = cancelSubscriptionSchema.safeParse(req.body || {});
    if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

    const result = await OfficeSubscriptionService.cancelSubscription({
      bookingId,
      startupId,
      cancelAtCycleEnd: parsed.data.cancelAtCycleEnd,
    });
    return apiResponse.sendUpdated(res, result, "Subscription cancelled");
  }),
};
