import { InvoiceService } from "../../services/superadmin/invoice.service.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/responseUtils.js";

export const InvoiceController = {
  getAllInvoice: asyncHandler(async (req, res) => {
    try {
      const { page, limit, search, status, sortBy, order } = req.query;
      const result = await InvoiceService.getInvoices({
        page, limit, search, status, sortBy, order,
      });
      return apiResponse.sendCustomResponse(res, 200, result, "Invoices fetched successfully");
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(res, error.statusCode, null, error.message);
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),
};
