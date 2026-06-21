import { Router } from "express";
import { superAdminAuthRouter } from "./super-admin/auth.routes.js";
import { superAdminModuleRouter } from "./super-admin/module.routes.js";
import { superAdminChatRouter } from "./super-admin/chat.routes.js";
import SubscriptionRouter from "./incubation/subscription.route.js";
import TenantRouter from "./incubation/portal/tenant.route.js";
import RolesRouter from "./incubation/portal/roles.route.js";
import UserRouter from "./incubation/portal/user.route.js";
import { S3Router } from "./common/s3.route.js";
import ProgramRouter from "./incubation/portal/program.route.js";
import StartupProgramRouter from "./startup/program.route.js";
import TenantStartupRouter from "./incubation/portal/startup.route.js";
import { OfficeReceiverRouter } from "./startup/office-receiver.route.js";
import { OfficeProviderRouter } from "./incubation/portal/office-provider.route.js";
import { PortalFacilityRouter } from "./incubation/portal/admin-facility.route.js";
import { StartupFacilityRouter } from "./startup/startup-facility.route.js";
import AnnouncementRouter from "./incubation/portal/announcement.route.js";
import EcosystemAuthRouter from "./ecosystem/auth/auth.route.js";
import EcosystemProfileRouter from "./ecosystem/profile/profile.route.js";
import EcosystemPageRouter from "./ecosystem/page/page.route.js";
import EcosystemSettingRouter from "./ecosystem/setting/setting.route.js";
import UserSocialRouter from "./ecosystem/social/user-social.route.js";
import PostRouter from "./ecosystem/social/post.route.js";
import FeedRouter from "./ecosystem/social/feed.route.js";
import MentorRouter from "./mentor/mentor.route.js";
import EcosystemMentorRouter from "./ecosystem/mentor/mentor.route.js";
import IncubationMentorRouter from "./incubation/portal/mentor.route.js";
import { UniversalChatRouter } from "./common/universal-chat.route.js";
import { ChatSearchRouter } from "./common/chat-search.route.js";
import { IncubationTaskRouter } from "./incubation/portal/task.route.js";
import { StartupTaskRouter } from "./startup/task.route.js";
import StartupAnnouncementRouter from "./startup/announcement.route.js";
import PanelRouter from "./incubation/portal/panel.route.js";
import FundingRouter from "./incubation/portal/funding.route.js";
import { PublicRepositoryRouter } from "./incubation/portal/public-repository.route.js";
import { PublicApiRouter } from "./public/repository.route.js";
import EventRouter from "./ecosystem/event/event.route.js";
import NetworkingRouter from "./ecosystem/networking/networking.route.js";
import JobRouter from "./ecosystem/job/job.route.js";
import CommunityRouter from "./ecosystem/community/community.route.js";
import EcosystemNotificationRouter from "./ecosystem/notification/notification.route.js";
import IncubationNotificationRouter from "./incubation/portal/notification.route.js";
import StartupNotificationRouter from "./startup/notification.route.js";
import { superAdminAddonRouter } from "./super-admin/addon.routes.js";
import { superAdminAddonRequestRouter } from "./super-admin/addon-request.routes.js";
import { PortalAddonRequestRouter } from "./incubation/portal/addon-request.route.js";
import { PortalInvoiceRouter } from "./incubation/portal/invoice.route.js";
import { PortalChatRouter } from "./incubation/portal/chat.route.js";
import { PortalBillingRouter } from "./incubation/portal/billing.route.js";
import MeAccessRouter from "./incubation/portal/me-access.route.js";
import DashboardRouter from "./incubation/portal/dashboard.route.js";
import StartupDashboardRouter from "./startup/dashboard.route.js"
import { PayoutAccountRouter } from "./incubation/portal/payout-account.route.js";
import { OfficeSubscriptionProviderRouter } from "./incubation/portal/office-subscription.route.js";
import { OfficePayoutRouter } from "./incubation/portal/office-payout.route.js";
import { OfficeSubscriptionReceiverRouter } from "./startup/office-subscription.route.js";
import { RazorpayWebhookRouter } from "./common/razorpay-webhook.route.js";

const router = Router();

router.use(
  "/api/super-admin",
  superAdminAuthRouter,
  superAdminModuleRouter,
  superAdminAddonRouter,
  superAdminAddonRequestRouter,
  superAdminChatRouter
);
router.use(
  "/api/incubation",
  SubscriptionRouter,
  TenantRouter
);
router.use(
  "/api/incubation-portal",
  MeAccessRouter,
  TenantRouter,
  RolesRouter,
  UserRouter,
  S3Router,
  ProgramRouter,
  TenantStartupRouter,
  OfficeProviderRouter,
  PortalFacilityRouter,
  AnnouncementRouter,
  IncubationTaskRouter,
  PanelRouter,
  IncubationMentorRouter,
  FundingRouter,
  PublicRepositoryRouter,
  IncubationNotificationRouter,
  PortalAddonRequestRouter,
  PortalInvoiceRouter,
  PortalChatRouter,
  PortalBillingRouter,
  DashboardRouter,
  PayoutAccountRouter,
  OfficeSubscriptionProviderRouter,
  OfficePayoutRouter
);
router.use(
  "/api/startup-portal",
  StartupProgramRouter,
  OfficeReceiverRouter,
  StartupFacilityRouter,
  StartupTaskRouter,
  StartupAnnouncementRouter,
  StartupNotificationRouter,
  StartupDashboardRouter,
  OfficeSubscriptionReceiverRouter
);

router.use(
  "/api/ecosystem",
  EcosystemAuthRouter,
  EcosystemProfileRouter,
  EcosystemPageRouter,
  EcosystemSettingRouter,
  UserSocialRouter,
  PostRouter,
  FeedRouter,
  EcosystemMentorRouter,
  UniversalChatRouter,
  EventRouter,
  NetworkingRouter,
  JobRouter,
  CommunityRouter,
  EcosystemNotificationRouter
);

router.use("/api", MentorRouter);
router.use("/api", ChatSearchRouter);
router.use("/api", PublicApiRouter);
router.use("/api", RazorpayWebhookRouter);

export default router;
