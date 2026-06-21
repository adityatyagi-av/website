import { Router } from "express";
import { EcosystemSettingController } from "../../../controllers/ecosystem/setting/setting.controller.js";
import { authenticate } from "../../../middlewares/auth.middleware.js";

const EcosystemSettingRouter = Router();

EcosystemSettingRouter.patch(
  "/setting/change-password",
  authenticate,
  EcosystemSettingController.changePassword
);

EcosystemSettingRouter.patch(
  "/setting/appear-in-search",
  authenticate,
  EcosystemSettingController.updateAppearInSearch
);

EcosystemSettingRouter.patch(
  "/setting/allow-connection-request",
  authenticate,
  EcosystemSettingController.connectionRequest
);

EcosystemSettingRouter.patch(
  "/setting/message-permission",
  authenticate,
  EcosystemSettingController.messagePermission
);

EcosystemSettingRouter.patch(
  "/setting/show-online-status",
  authenticate,
  EcosystemSettingController.showOnlineStatus
);

EcosystemSettingRouter.patch(
  "/setting/show-last-seen",
  authenticate,
  EcosystemSettingController.showLastSeen
);

EcosystemSettingRouter.patch(
  "/setting/login-notifications",
  authenticate,
  EcosystemSettingController.loginNotifications
);

EcosystemSettingRouter.patch(
  "/setting/profile-visibility",
  authenticate,
  EcosystemSettingController.profileVisibility
);


EcosystemSettingRouter.get(
  "/getContactInformation",
  authenticate,
  EcosystemSettingController.getContactInfo
)

EcosystemSettingRouter.patch(
  "/update-contact-information",
  authenticate,
  EcosystemSettingController.updateContactInfo
);


EcosystemSettingRouter.delete(
  "/delete-account",
  authenticate,
  EcosystemSettingController.deleteAccount
)

EcosystemSettingRouter.get(
  "/auth/sessions",
  authenticate,
  EcosystemSettingController.getSessions
);

EcosystemSettingRouter.delete(
  "/auth/sessions/:sessionId",
  authenticate,
  EcosystemSettingController.logoutSession
);

EcosystemSettingRouter.delete(
  "/auth/sessions/logout-others",
  authenticate,
  EcosystemSettingController.logoutAllOtherSessions
);
export default EcosystemSettingRouter;
