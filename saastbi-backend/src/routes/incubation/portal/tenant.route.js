import { Router } from "express";
import { ModuleController, TenantController } from "../../../controllers/incubation/portal/tenant.controller.js";
import { authenticatePortal } from "../../../middlewares/portal.auth.middleware.js";
import { requireAccess } from "../../../middlewares/access.middleware.js";
import { MODULE_KEYS, ACTIONS } from "../../../config/modules.registry.js";

const TenantRouter = Router();

TenantRouter.get("/tenant/get-tenant-info", TenantController.getTenantInfoDetails);

TenantRouter.get(
  "/fetch-modules-for-tenant",
  authenticatePortal,
  requireAccess({ module: MODULE_KEYS.TENANT_SETTINGS, action: ACTIONS.R }),
  ModuleController.fetchModulesByTenant
);

TenantRouter.get(
  "/tenant/profile",
  authenticatePortal,
  requireAccess({ module: MODULE_KEYS.TENANT_SETTINGS, action: ACTIONS.R }),
  TenantController.getTenantProfile
);
TenantRouter.patch(
  "/tenant/profile",
  authenticatePortal,
  requireAccess({ module: MODULE_KEYS.TENANT_SETTINGS, action: ACTIONS.U }),
  TenantController.updateTenantProfile
);

TenantRouter.patch(
  "/tenant/profile/branding",
  authenticatePortal,
  requireAccess({ module: MODULE_KEYS.TENANT_SETTINGS, action: ACTIONS.U }),
  TenantController.updateBranding
);
TenantRouter.patch(
  "/tenant/profile/contact",
  authenticatePortal,
  requireAccess({ module: MODULE_KEYS.TENANT_SETTINGS, action: ACTIONS.U }),
  TenantController.updateContact
);
TenantRouter.patch(
  "/tenant/profile/social",
  authenticatePortal,
  requireAccess({ module: MODULE_KEYS.TENANT_SETTINGS, action: ACTIONS.U }),
  TenantController.updateSocial
);
TenantRouter.patch(
  "/tenant/profile/classification",
  authenticatePortal,
  requireAccess({ module: MODULE_KEYS.TENANT_SETTINGS, action: ACTIONS.U }),
  TenantController.updateClassification
);
TenantRouter.patch(
  "/tenant/profile/infrastructure",
  authenticatePortal,
  requireAccess({ module: MODULE_KEYS.TENANT_SETTINGS, action: ACTIONS.U }),
  TenantController.updateInfrastructure
);
TenantRouter.patch(
  "/tenant/profile/operations",
  authenticatePortal,
  requireAccess({ module: MODULE_KEYS.TENANT_SETTINGS, action: ACTIONS.U }),
  TenantController.updateOperations
);
TenantRouter.patch(
  "/tenant/profile/funding",
  authenticatePortal,
  requireAccess({ module: MODULE_KEYS.TENANT_SETTINGS, action: ACTIONS.U }),
  TenantController.updateFunding
);
TenantRouter.patch(
  "/tenant/profile/partnerships",
  authenticatePortal,
  requireAccess({ module: MODULE_KEYS.TENANT_SETTINGS, action: ACTIONS.U }),
  TenantController.updatePartnerships
);
TenantRouter.patch(
  "/tenant/profile/metrics",
  authenticatePortal,
  requireAccess({ module: MODULE_KEYS.TENANT_SETTINGS, action: ACTIONS.U }),
  TenantController.updateMetrics
);
TenantRouter.patch(
  "/tenant/profile/recognition",
  authenticatePortal,
  requireAccess({ module: MODULE_KEYS.TENANT_SETTINGS, action: ACTIONS.U }),
  TenantController.updateRecognition
);
TenantRouter.patch(
  "/tenant/profile/settings",
  authenticatePortal,
  requireAccess({ module: MODULE_KEYS.TENANT_SETTINGS, action: ACTIONS.U }),
  TenantController.updateSettings
);
TenantRouter.patch(
  "/tenant/profile/content",
  authenticatePortal,
  requireAccess({ module: MODULE_KEYS.TENANT_SETTINGS, action: ACTIONS.U }),
  TenantController.updateContent
);

TenantRouter.get(
  "/tenant/computed-metrics",
  authenticatePortal,
  requireAccess({ module: MODULE_KEYS.TENANT_SETTINGS, action: ACTIONS.R }),
  TenantController.getComputedMetrics
);

export default TenantRouter;
