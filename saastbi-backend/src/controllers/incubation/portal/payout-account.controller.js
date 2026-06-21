import { apiResponse } from "../../../utils/responseUtils.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { ApiError } from "../../../utils/ApiError.js";
import { resolveTenantId } from "../../../utils/tenantResolver.js";
import { PayoutAccountService } from "../../../services/incubation/portal/payout-account.service.js";
import {
  createPayoutAccountSchema,
  updatePayoutAccountSchema,
  addKycDocumentSchema,
} from "../../../validators/incubation/payout-account.validator.js";

export const PayoutAccountController = {
  getAccount: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const account = await PayoutAccountService.getAccount({ tenantId });
    return apiResponse.sendSuccess(res, account, "Payout account fetched");
  }),

  createAccount: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const parsed = createPayoutAccountSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

    const result = await PayoutAccountService.createAccount({ tenantId, data: parsed.data });
    return apiResponse.sendCreated(res, result, "Payout account submitted");
  }),

  updateAccount: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const parsed = updatePayoutAccountSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

    const result = await PayoutAccountService.updateAccount({ tenantId, data: parsed.data });
    return apiResponse.sendUpdated(res, result, "Payout account updated");
  }),

  resubmit: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const parsed = updatePayoutAccountSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

    const result = await PayoutAccountService.resubmit({ tenantId, data: parsed.data });
    return apiResponse.sendUpdated(res, result, "Payout account resubmitted");
  }),

  deactivate: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const result = await PayoutAccountService.deactivate({ tenantId });
    return apiResponse.sendDeleted(res, result, "Payout account deactivated");
  }),

  addDocument: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const parsed = addKycDocumentSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

    const result = await PayoutAccountService.addDocument({ tenantId, data: parsed.data });
    return apiResponse.sendCreated(res, result, "Document uploaded");
  }),

  listDocuments: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const result = await PayoutAccountService.listDocuments({ tenantId });
    return apiResponse.sendSuccess(res, result, "Documents fetched");
  }),

  getStatus: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const result = await PayoutAccountService.getPayoutStatus({ tenantId });
    return apiResponse.sendSuccess(res, result, "Payout status fetched");
  }),
};
