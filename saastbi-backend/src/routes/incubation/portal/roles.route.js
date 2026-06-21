import { Router } from "express";
import { RoleController } from "../../../controllers/incubation/portal/role.controller.js";
import { authenticatePortal } from "../../../middlewares/portal.auth.middleware.js";
import { requireAccess } from "../../../middlewares/access.middleware.js";
import { MODULE_KEYS, ACTIONS } from "../../../config/modules.registry.js";

const RolesRouter = Router();

RolesRouter.post(
  "/roles/create-role",
  authenticatePortal,
  requireAccess({ module: MODULE_KEYS.ROLE_MANAGEMENT, action: ACTIONS.C }),
  RoleController.createRole
);
RolesRouter.put(
  "/roles/:roleId",
  authenticatePortal,
  requireAccess({ module: MODULE_KEYS.ROLE_MANAGEMENT, action: ACTIONS.U }),
  RoleController.updateRole
);
RolesRouter.get(
  "/roles/roles-dropdown",
  authenticatePortal,
  requireAccess({ module: MODULE_KEYS.ROLE_MANAGEMENT, action: ACTIONS.R }),
  RoleController.getRolesDropdown
);
RolesRouter.get(
  "/roles/get-roles",
  authenticatePortal,
  requireAccess({ module: MODULE_KEYS.ROLE_MANAGEMENT, action: ACTIONS.R }),
  RoleController.getRoles
);
RolesRouter.get(
  "/roles/available-modules",
  authenticatePortal,
  requireAccess({ module: MODULE_KEYS.ROLE_MANAGEMENT, action: ACTIONS.R }),
  RoleController.getAvailableModules
);

export default RolesRouter;
