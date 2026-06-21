import { Router } from "express";
import { authenticatePortal } from "../../../middlewares/portal.auth.middleware.js";
import { OfficePayoutController } from "../../../controllers/incubation/portal/office-payout.controller.js";

const OfficePayoutRouter = Router();

OfficePayoutRouter.use(authenticatePortal);

OfficePayoutRouter.get("/office/payouts", OfficePayoutController.list);
OfficePayoutRouter.get("/office/payouts/summary", OfficePayoutController.getSummary);
OfficePayoutRouter.get("/office/payouts/:payoutId", OfficePayoutController.getById);

export { OfficePayoutRouter };
