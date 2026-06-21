import { Router } from "express";
import { RazorpayWebhookController } from "../../controllers/common/razorpay-webhook.controller.js";

const RazorpayWebhookRouter = Router();

RazorpayWebhookRouter.post("/webhooks/razorpay/account", RazorpayWebhookController.account);
RazorpayWebhookRouter.post("/webhooks/razorpay/office", RazorpayWebhookController.office);

export { RazorpayWebhookRouter };
