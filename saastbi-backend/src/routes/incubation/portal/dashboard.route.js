import { Router } from "express";
import { DashboardController } from "../../../controllers/incubation/portal/dashboard.controller.js";
import { authenticatePortal } from "../../../middlewares/portal.auth.middleware.js";

console.log("DashboardRouter initialized");
const DashboardRouter = Router();
DashboardRouter.use(authenticatePortal);

DashboardRouter.get("/dashboard/metrics", DashboardController.getDashboardMetrics);
DashboardRouter.get("/dashboard/applications-over-time",DashboardController.getApplicationsOverTime);
DashboardRouter.get("/dashboard/startups-by-stage",DashboardController.getStartupsByStage);

export default DashboardRouter;