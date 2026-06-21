import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/responseUtils.js";
import {
  RazorpayWebhookService,
  verifyAndParseWebhook,
} from "../../services/common/razorpay-webhook.service.js";

function getRawBody(req) {
  return req.rawBody || (Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {})));
}

export const RazorpayWebhookController = {
  account: asyncHandler(async (req, res) => {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = getRawBody(req);
    const secret = process.env.RAZORPAY_ACCOUNT_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET;
    let parsed;
    try {
      parsed = verifyAndParseWebhook(rawBody, signature, secret);
    } catch (err) {
      return apiResponse.sendUnauthorized(res, err.message);
    }
    const event = parsed.event;
    const eventId = parsed.id || req.headers["x-razorpay-event-id"];
    await RazorpayWebhookService.handleAccountEvent({
      event,
      payload: parsed.payload,
      eventId,
    });
    return apiResponse.sendSuccess(res, { received: true }, "Account webhook processed");
  }),

  office: asyncHandler(async (req, res) => {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = getRawBody(req);
    const secret = process.env.RAZORPAY_OFFICE_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET;
    let parsed;
    try {
      parsed = verifyAndParseWebhook(rawBody, signature, secret);
    } catch (err) {
      return apiResponse.sendUnauthorized(res, err.message);
    }
    const event = parsed.event;
    const eventId = parsed.id || req.headers["x-razorpay-event-id"];
    await RazorpayWebhookService.handleOfficeEvent({
      event,
      payload: parsed.payload,
      eventId,
    });
    return apiResponse.sendSuccess(res, { received: true }, "Office webhook processed");
  }),
};
