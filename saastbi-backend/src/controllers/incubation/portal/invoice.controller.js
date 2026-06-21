import { PortalInvoiceService } from "../../../services/incubation/portal/invoice.service.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";
import { resolveTenantId } from "../../../utils/tenantResolver.js";
import { ApiError } from "../../../utils/ApiError.js";

export const PortalInvoiceController = {
  getInvoices: asyncHandler(async (req, res) => {
    try {
      const tenantId = await resolveTenantId(req);
      const { page, limit, status } = req.query;
      const result = await PortalInvoiceService.getInvoices(tenantId, { page, limit, status });
      return apiResponse.sendSuccess(res, result, "Invoices fetched successfully");
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(res, error.statusCode, null, error.message);
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),

  getInvoiceById: asyncHandler(async (req, res) => {
    try {
      const tenantId = await resolveTenantId(req);
      const { invoiceId } = req.params;
      console.log("THIS IS INVOICE ID",invoiceId)
      const invoice = await PortalInvoiceService.getInvoiceById(invoiceId, tenantId);
      return apiResponse.sendSuccess(res, invoice, "Invoice details fetched");
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(res, error.statusCode, null, error.message);
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),
};
