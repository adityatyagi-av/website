import { Router } from "express";
import { authenticatePortal } from "../../../middlewares/portal.auth.middleware.js";
import { MeAccessController } from "../../../controllers/incubation/portal/me-access.controller.js";

const router = Router();

router.get("/me/access", authenticatePortal, MeAccessController.getAccess);

export default router;
