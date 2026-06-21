import { Router } from "express";
import { authenticatePortal } from "../../../middlewares/portal.auth.middleware.js";
import { OfficeSubscriptionProviderController } from "../../../controllers/incubation/portal/office-subscription.controller.js";

const OfficeSubscriptionProviderRouter = Router();

OfficeSubscriptionProviderRouter.use(authenticatePortal);

OfficeSubscriptionProviderRouter.get(
  "/office/subscriptions",
  OfficeSubscriptionProviderController.list
);
OfficeSubscriptionProviderRouter.get(
  "/office/subscriptions/:bookingId",
  OfficeSubscriptionProviderController.getById
);
OfficeSubscriptionProviderRouter.post(
  "/office/subscriptions/:bookingId/pause",
  OfficeSubscriptionProviderController.pause
);
OfficeSubscriptionProviderRouter.post(
  "/office/subscriptions/:bookingId/resume",
  OfficeSubscriptionProviderController.resume
);
OfficeSubscriptionProviderRouter.post(
  "/office/subscriptions/:bookingId/cancel",
  OfficeSubscriptionProviderController.cancel
);

export { OfficeSubscriptionProviderRouter };
