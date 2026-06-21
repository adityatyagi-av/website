import { Messages } from "./messageUtils.js";

function sendResponse(res, status, data = null, message = null) {
  const isSuccess = status >= 200 && status < 300;
  const response = {
    success: isSuccess,
    status,
    data,
    message,
  };
  return res.status(status).json(response);
}
export const apiResponse = {
  tenantAvailable: (res, data = null, message = Messages.tenantAvailable) =>
    sendResponse(res, 200, data, message),
  tenantNotAvailable: (res, data = null, message = Messages.tenantNotAvailable) =>
    sendResponse(res, 404, data, message),
  createdSuperAdmin: (res, data = null, message = Messages.DataSaved) =>
    sendResponse(res, 201, data, message),
  
  sendOtp: (res, data = null, message = Messages.SendOtpSuccess) =>
    sendResponse(res, 201, data, message),
  reSendOtp: (res, data = null, message = Messages.SendOtpSuccess) =>
    sendResponse(res, 200, data, message),
  verifyOtp: (res, data = null, message = Messages.OtpVerify) =>
    sendResponse(res, 200, data, message),
  profileUpdate: (res, data = null, message = Messages.UpdateProfile) =>
    sendResponse(res, 200, data, message),
  sendSuccess: (res, data = null, message = Messages.DataFetched) =>
    sendResponse(res, 200, data, message),
  sendUpdated: (res, data = null, message = Messages.DataUpdated) =>
    sendResponse(res, 200, data, message),
  sendDeleted: (res, data = null, message = Messages.DataDeleted) =>
    sendResponse(res, 200, data, message),
  sendCreated: (res, data = null, message = Messages.DataSaved) =>
    sendResponse(res, 201, data, message),
  sendBadRequest: (res, message = Messages.DataNotAvailable) =>
    sendResponse(res, 400, null, message),
  sendUnauthorized: (res, message = Messages.Unauthorized) =>
    sendResponse(res, 401, null, message),
  sendForbidden: (res, message = Messages.Forbidden) =>
    sendResponse(res, 403, null, message),
  sendNotFound: (res, message = Messages.NotFound) =>
    sendResponse(res, 404, null, message),
  sendConflict: (res, message = Messages.DataAlreadyExists) =>
    sendResponse(res, 409, null, message),
  sendValidationError: (res, data = null, message = Messages.BadResponse) =>
    sendResponse(res, 422, data, message),
  sendServerError: (res, message = Messages.InternalServerError) =>
    sendResponse(res, 500, null, message),
  sendCustomResponse: (res, status, data = null, message = null) =>
    sendResponse(res, status, data, message),
  sendSessionTimeOut: (res, message = Messages.SessionLogout) =>
    sendResponse(res, 419, null, message),
};
