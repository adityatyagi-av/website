import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { AddonController } from "../../controllers/superadmin/addon.controller.js";

const superAdminAddonRouter = Router();

superAdminAddonRouter.post("/create-addon", authenticate, AddonController.createAddon);
superAdminAddonRouter.get("/get-addons", authenticate, AddonController.getAllAddons);
superAdminAddonRouter.get("/get-addon/:addonId", authenticate, AddonController.getAddonById);
superAdminAddonRouter.put("/update-addon", authenticate, AddonController.updateAddon);
superAdminAddonRouter.patch("/toggle-addon-status", authenticate, AddonController.toggleAddonStatus);
superAdminAddonRouter.delete("/delete-addon/:addonId", authenticate, AddonController.deleteAddon);

export { superAdminAddonRouter };
