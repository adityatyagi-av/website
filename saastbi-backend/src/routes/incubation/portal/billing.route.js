import { Router } from "express";
import { PortalBillingController } from "../../../controllers/incubation/portal/billing.controller.js";
import { authenticatePortal } from "../../../middlewares/portal.auth.middleware.js";
import { requireAccessByMethod } from "../../../middlewares/access.middleware.js";
import { MODULE_KEYS } from "../../../config/modules.registry.js";

const router = Router();

router.use("/billing", authenticatePortal, requireAccessByMethod(MODULE_KEYS.BILLING));

router.get("/billing", PortalBillingController.getBillingDashboard);
router.post("/billing/create-order", PortalBillingController.createPaymentOrder);
router.post("/billing/verify-payment", PortalBillingController.verifyPayment);

export const PortalBillingRouter = router;
