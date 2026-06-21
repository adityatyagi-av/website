import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { SuperAdminModuleController } from "../../controllers/superadmin/modules.controller.js";
import { SuperAdminTenantController } from "../../controllers/superadmin/tenant.controller.js";
import { InvoiceController } from "../../controllers/superadmin/invoice.controller.js";
import { TenantModuleOverrideController } from "../../controllers/superadmin/tenant-module-override.controller.js";

const superAdminModuleRouter = Router();

superAdminModuleRouter.get("/get-modules", authenticate, SuperAdminModuleController.getModules);
superAdminModuleRouter.get("/module-dropdown", authenticate, SuperAdminModuleController.getModuleDropdown);
superAdminModuleRouter.get("/modules/for-plan", authenticate, SuperAdminModuleController.getModulesForPlan);

superAdminModuleRouter.post("/create-plan", authenticate, SuperAdminModuleController.createPlan);
superAdminModuleRouter.get("/get-plans", authenticate, SuperAdminModuleController.getPlans);
superAdminModuleRouter.get("/get-plans-by-type", authenticate, SuperAdminModuleController.getPlansByType);
superAdminModuleRouter.put("/update-plan-modules", authenticate, SuperAdminModuleController.updatePlanModules);
superAdminModuleRouter.put("/update-plan-details", authenticate, SuperAdminModuleController.updatePlanDetails);

superAdminModuleRouter.get("/get-tenants", authenticate, SuperAdminTenantController.getAllTenants);
superAdminModuleRouter.get("/get-tenant/:tenantId", authenticate, SuperAdminTenantController.getTenantById);
superAdminModuleRouter.get("/get-tenant/:tenantId/invoices", authenticate, SuperAdminTenantController.getTenantInvoices);
superAdminModuleRouter.get("/get-invoice", authenticate, InvoiceController.getAllInvoice);

superAdminModuleRouter.post(
  "/tenant/:tenantId/module-override",
  authenticate,
  TenantModuleOverrideController.create
);
superAdminModuleRouter.get(
  "/tenant/:tenantId/module-overrides",
  authenticate,
  TenantModuleOverrideController.list
);
superAdminModuleRouter.patch(
  "/tenant/:tenantId/module-override/:overrideId",
  authenticate,
  TenantModuleOverrideController.update
);
superAdminModuleRouter.delete(
  "/tenant/:tenantId/module-override/:overrideId",
  authenticate,
  TenantModuleOverrideController.remove
);

export { superAdminModuleRouter };
