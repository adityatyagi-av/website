import { Router } from "express";
import { SuperAdminAuthController } from "../../controllers/superadmin/auth.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const superAdminAuthRouter = Router();
superAdminAuthRouter.post("/sign-up", SuperAdminAuthController.signup);
superAdminAuthRouter.post("/login", SuperAdminAuthController.login);
superAdminAuthRouter.get("/logout", authenticate, SuperAdminAuthController.logout);
superAdminAuthRouter.get("/profile", authenticate, SuperAdminAuthController.getProfile);
superAdminAuthRouter.get("/refresh", SuperAdminAuthController.refresh);

export { superAdminAuthRouter };
