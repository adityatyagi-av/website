import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/responseUtils.js";
import { generateUploadURL } from "../../utils/s3util.js";

export const S3Controller = {
  generateSignedUrl: asyncHandler(async (req, res) => {
    try {
      const { folder = "common", fileType = "image/jpeg", expiresIn } = req.body;
      //const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;

      // if (!tenantKey) {
      //   throw new ApiError(400, "tenantKey is required (send in headers or body)");
      // }

      const result = await generateUploadURL({
       // tenantKey,
        folder,
        fileType,
        expiresIn: expiresIn || 900, 
      });

      return apiResponse.sendSuccess(res, result, "Signed URL generated successfully");
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(res, error.statusCode, null, error.message);
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),
};