import { Router } from "express";
import { authenticate } from "../../../middlewares/auth.middleware.js";
import { EcosystemAuthController } from "../../../controllers/ecosystem/auth/auth.controller.js";

const EcosystemAuthRouter = Router();

EcosystemAuthRouter.post("/auth/sign-up", EcosystemAuthController.signup);
EcosystemAuthRouter.post("/auth/verify-otp", EcosystemAuthController.verifyOtp);
EcosystemAuthRouter.post("/auth/resend-otp", EcosystemAuthController.resendOtp);
EcosystemAuthRouter.post("/auth/login", EcosystemAuthController.login);
EcosystemAuthRouter.get(
  "/auth/logout",
  authenticate,
  EcosystemAuthController.logout,
);

EcosystemAuthRouter.post(
  "/auth/forgot-password",
  EcosystemAuthController.forgotPassword,
);

EcosystemAuthRouter.post(
  "/auth/verify-forgot-otp",
  EcosystemAuthController.verifyForgotOtp,
);

EcosystemAuthRouter.post(
  "/auth/reset-password",
  EcosystemAuthController.resetPassword,
);

EcosystemAuthRouter.post("/auth/google", EcosystemAuthController.googleAuth);
EcosystemAuthRouter.post("/auth/facebook", EcosystemAuthController.facebookAuth);
EcosystemAuthRouter.post("/auth/apple", EcosystemAuthController.appleAuth);

EcosystemAuthRouter.get(
  "/auth/linked-accounts",
  authenticate,
  EcosystemAuthController.getLinkedAccounts,
);
EcosystemAuthRouter.post(
  "/auth/link/:provider",
  authenticate,
  EcosystemAuthController.linkAccount,
);
EcosystemAuthRouter.delete(
  "/auth/link/:provider",
  authenticate,
  EcosystemAuthController.unlinkAccount,
);

EcosystemAuthRouter.post("/auth/refresh", EcosystemAuthController.refresh);
EcosystemAuthRouter.post(
  "/auth/check-username",
  authenticate,
  EcosystemAuthController.checkUsername,
);
EcosystemAuthRouter.put(
  "/auth/update-username",
  authenticate,
  EcosystemAuthController.updateUsername,
);
EcosystemAuthRouter.post(
  "/auth/create-primary-role",
  authenticate,
  EcosystemAuthController.createPrimaryRole,
);
EcosystemAuthRouter.put(
  "/auth/update-roles",
  authenticate,
  EcosystemAuthController.updateRoles,
);
EcosystemAuthRouter.get(
  "/auth/roles",
  authenticate,
  EcosystemAuthController.getRoles,
);
EcosystemAuthRouter.post(
  "/auth/roles",
  authenticate,
  EcosystemAuthController.addRole,
);
EcosystemAuthRouter.delete(
  "/auth/roles/:roleType",
  authenticate,
  EcosystemAuthController.removeRole,
);

export default EcosystemAuthRouter;
