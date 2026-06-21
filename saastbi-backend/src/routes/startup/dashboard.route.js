import { Router } from "express";
import { startupDashboardController } from "../../controllers/startup/dashboard.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const DashboardRouter = Router();

DashboardRouter.get(
  "/dashboard/metrics/:startupId",
  authenticate,
  startupDashboardController.getDashboardMetrics
);

export default DashboardRouter;