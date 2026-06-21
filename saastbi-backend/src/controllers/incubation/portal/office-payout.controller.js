import { apiResponse } from "../../../utils/responseUtils.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { resolveTenantId } from "../../../utils/tenantResolver.js";
import { OfficePayoutService } from "../../../services/incubation/portal/office-payout.service.js";
import { payoutListFiltersSchema } from "../../../validators/incubation/office-subscription.validator.js";

export const OfficePayoutController = {
  list: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const filters = payoutListFiltersSchema.parse(req.query);

    const result = await OfficePayoutService.listPayouts({ tenantId, filters });
    return apiResponse.sendSuccess(res, result, "Payouts fetched");
  }),

  getById: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { payoutId } = req.params;

    const result = await OfficePayoutService.getPayoutById({ payoutId, tenantId });
    return apiResponse.sendSuccess(res, result, "Payout fetched");
  }),

  getSummary: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);

    const result = await OfficePayoutService.getPayoutSummary({ tenantId });
    return apiResponse.sendSuccess(res, result, "Payout summary fetched");
  }),
};
