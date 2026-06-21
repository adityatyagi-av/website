import { Router } from "express";
import { UserController } from "../../../controllers/incubation/portal/user.controller.js";
import { authenticatePortal } from "../../../middlewares/portal.auth.middleware.js";
import { authenticate } from "../../../middlewares/auth.middleware.js";
import { requireAccess } from "../../../middlewares/access.middleware.js";
import { MODULE_KEYS, ACTIONS } from "../../../config/modules.registry.js";

const UserRouter = Router();

UserRouter.post("/check-tenant", UserController.checkTenant);
UserRouter.post("/check-email", UserController.checkEmail);
UserRouter.get("/user/by-email",authenticatePortal,UserController.getUserByEmail);
UserRouter.post("/sign-up", UserController.signup);
UserRouter.post("/resend-otp", UserController.resendOtp);
UserRouter.post("/verify-otp", UserController.verifySignupOtp);
UserRouter.post("/login", UserController.login);
UserRouter.post("/select-tenant", UserController.selectTenant);
UserRouter.get("/refresh", UserController.refresh);
UserRouter.post("/forgot-password", UserController.forgotPassword);
UserRouter.post("/verify-forgot-otp", UserController.verifyForgotPasswordOtp);
UserRouter.post("/reset-password", UserController.resetPassword);

UserRouter.get("/logout", authenticate, UserController.logout);
UserRouter.get("/profile", authenticate, UserController.getProfile);
UserRouter.post("/update-profile", authenticate, UserController.updateProfile);

UserRouter.post(
  "/create-tenant-page",
  authenticatePortal,
  requireAccess({ module: MODULE_KEYS.TENANT_SETTINGS, action: ACTIONS.C }),
  UserController.createTenantPage
);

UserRouter.post(
  "/user/create-user-with-roles",
  authenticatePortal,
  requireAccess({ module: MODULE_KEYS.USER_MANAGEMENT, action: ACTIONS.C }),
  UserController.createUserWithRole
);
UserRouter.get(
  "/user/users-dropdown",
  authenticatePortal,
  requireAccess({ module: MODULE_KEYS.USER_MANAGEMENT, action: ACTIONS.R }),
  UserController.getUsersDropdown
);
UserRouter.get(
  "/user/get-users",
  authenticatePortal,
  requireAccess({ module: MODULE_KEYS.USER_MANAGEMENT, action: ACTIONS.R }),
  UserController.getUsers
);
UserRouter.get(
  "/user/team-members",
  authenticatePortal,
  requireAccess({ module: MODULE_KEYS.USER_MANAGEMENT, action: ACTIONS.R }),
  UserController.getIncubationTeamMembers
);

UserRouter.get(
  "/user/:incubationUserId/details",
  authenticatePortal,
  requireAccess({module: MODULE_KEYS.USER_MANAGEMENT,action: ACTIONS.R }),
  UserController.getUserDetails
);

UserRouter.put(
  "/user/:incubationUserId",
  authenticatePortal,
  requireAccess({module: MODULE_KEYS.USER_MANAGEMENT,action: ACTIONS.U }),
  UserController.updateUser
);

export default UserRouter;
