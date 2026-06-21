import { Router } from "express";
import { AddonRequestController } from "../../../controllers/incubation/portal/addon-request.controller.js";
import { authenticatePortal } from "../../../middlewares/portal.auth.middleware.js";
import { requireAccessByMethod } from "../../../middlewares/access.middleware.js";
import { MODULE_KEYS } from "../../../config/modules.registry.js";

const router = Router();

router.use("/addons", authenticatePortal, requireAccessByMethod(MODULE_KEYS.ADDON_REQUEST));

router.get("/addons/available", AddonRequestController.getAvailableAddons);
router.post("/addons/request", AddonRequestController.submitRequest);
router.get("/addons/my-requests", AddonRequestController.getMyRequests);
router.get("/addons/request/:requestId", AddonRequestController.getRequestDetails);
router.patch("/addons/request/:requestId/cancel", AddonRequestController.cancelRequest);

export const PortalAddonRequestRouter = router;
