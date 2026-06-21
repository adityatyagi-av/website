import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { SuperAdminAddonRequestController } from "../../controllers/superadmin/addon-request.controller.js";

const superAdminAddonRequestRouter = Router();

superAdminAddonRequestRouter.get("/addon-requests", authenticate, SuperAdminAddonRequestController.getAllAddonRequests);
superAdminAddonRequestRouter.get("/addon-requests/:requestId", authenticate, SuperAdminAddonRequestController.getAddonRequestDetails);
superAdminAddonRequestRouter.patch("/addon-requests/update-status", authenticate, SuperAdminAddonRequestController.updateAddonRequestStatus);

export { superAdminAddonRequestRouter };
