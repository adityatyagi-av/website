import { Router } from "express";
import { PortalInvoiceController } from "../../../controllers/incubation/portal/invoice.controller.js";
import { authenticatePortal } from "../../../middlewares/portal.auth.middleware.js";
import { requireAccessByMethod } from "../../../middlewares/access.middleware.js";
import { MODULE_KEYS } from "../../../config/modules.registry.js";

const router = Router();

router.use("/invoices", authenticatePortal, requireAccessByMethod(MODULE_KEYS.INVOICE));

router.get("/invoices", PortalInvoiceController.getInvoices);
router.get("/invoices/:invoiceId", PortalInvoiceController.getInvoiceById);

export const PortalInvoiceRouter = router;
