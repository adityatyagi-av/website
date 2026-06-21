import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { OfficeSubscriptionReceiverController } from "../../controllers/startup/office-subscription.controller.js";

const OfficeSubscriptionReceiverRouter = Router();

OfficeSubscriptionReceiverRouter.use(authenticate);

OfficeSubscriptionReceiverRouter.post(
  "/office/subscriptions/initiate",
  OfficeSubscriptionReceiverController.initiatePayment
);
OfficeSubscriptionReceiverRouter.post(
  "/office/subscriptions/verify",
  OfficeSubscriptionReceiverController.verifySubscription
);
OfficeSubscriptionReceiverRouter.get(
  "/office/subscriptions",
  OfficeSubscriptionReceiverController.list
);
OfficeSubscriptionReceiverRouter.get(
  "/office/subscriptions/:bookingId",
  OfficeSubscriptionReceiverController.getById
);
OfficeSubscriptionReceiverRouter.post(
  "/office/subscriptions/:bookingId/cancel",
  OfficeSubscriptionReceiverController.cancel
);

export { OfficeSubscriptionReceiverRouter };
