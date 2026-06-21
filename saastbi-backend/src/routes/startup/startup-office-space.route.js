import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { startupOfficeController } from "../../controllers/startup/startup-office-space.controller.js";

const StartupOfficeRouter = Router();
StartupOfficeRouter.use(authenticate);
StartupOfficeRouter.post(
  "/office-space/request",
  startupOfficeController.requestOffice
);
StartupOfficeRouter.get(
  "/office-space/my",
  startupOfficeController.getMyRequests
);

StartupOfficeRouter.get(
  "/office-space/startup/my",
  startupOfficeController.getMyOffice
);
StartupOfficeRouter.get(
  "/office-space/startup/history",
  startupOfficeController.getMyOfficeHistory
);

export { StartupOfficeRouter };
