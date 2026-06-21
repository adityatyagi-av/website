import { apiResponse } from "../../../utils/responseUtils.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { ApiError } from "../../../utils/ApiError.js";
import { resolveTenantId } from "../../../utils/tenantResolver.js";
import { OfficeSubscriptionService } from "../../../services/common/office-subscription.service.js";
import {
  cancelSubscriptionSchema,
  subscriptionListFiltersSchema,
} from "../../../validators/incubation/office-subscription.validator.js";

export const OfficeSubscriptionProviderController = {
  list: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const filters = subscriptionListFiltersSchema.parse(req.query);

    const result = await OfficeSubscriptionService.listSubscriptions({
      tenantId,
      filters,
    });
    return apiResponse.sendSuccess(res, result, "Subscriptions fetched");
  }),

  getById: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { bookingId } = req.params;

    const result = await OfficeSubscriptionService.getSubscription({
      bookingId,
      tenantId,
    });
    return apiResponse.sendSuccess(res, result, "Subscription fetched");
  }),

  pause: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { bookingId } = req.params;

    const result = await OfficeSubscriptionService.pauseSubscription({
      bookingId,
      tenantId,
    });
    return apiResponse.sendUpdated(res, result, "Subscription paused");
  }),

  resume: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { bookingId } = req.params;

    const result = await OfficeSubscriptionService.resumeSubscription({
      bookingId,
      tenantId,
    });
    return apiResponse.sendUpdated(res, result, "Subscription resumed");
  }),

  cancel: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { bookingId } = req.params;
    const parsed = cancelSubscriptionSchema.safeParse(req.body || {});
    if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

    const result = await OfficeSubscriptionService.cancelSubscription({
      bookingId,
      tenantId,
      cancelAtCycleEnd: parsed.data.cancelAtCycleEnd,
    });
    return apiResponse.sendUpdated(res, result, "Subscription cancelled");
  }),
};
