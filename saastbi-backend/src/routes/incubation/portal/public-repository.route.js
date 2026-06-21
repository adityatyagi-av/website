import { Router } from "express";
import { PublicRepositoryController } from "../../../controllers/incubation/portal/public-repository.controller.js";
import { authenticatePortal } from "../../../middlewares/portal.auth.middleware.js";
import { requireAccessByMethod } from "../../../middlewares/access.middleware.js";
import { MODULE_KEYS } from "../../../config/modules.registry.js";

const router = Router();

router.use(["/repository", "/repositories"], authenticatePortal, requireAccessByMethod(MODULE_KEYS.PUBLIC_REPOSITORY));

router.post("/repository", PublicRepositoryController.createRepository);
router.get("/repositories", PublicRepositoryController.getRepositories);
router.get("/repository/:repositoryId", PublicRepositoryController.getRepositoryById);
router.put("/repository/:repositoryId", PublicRepositoryController.updateRepository);
router.delete("/repository/:repositoryId", PublicRepositoryController.deleteRepository);
router.post("/repository/:repositoryId/regenerate-key", PublicRepositoryController.regenerateApiKey);
router.get("/repository/:repositoryId/stats", PublicRepositoryController.getRepositoryStats);
router.get("/repository/:repositoryId/access-logs", PublicRepositoryController.getAccessLogs);

router.post("/repository/:repositoryId/item", PublicRepositoryController.addItem);
router.get("/repository/:repositoryId/items", PublicRepositoryController.getItems);
router.get("/repository/:repositoryId/item/:itemId", PublicRepositoryController.getItemById);
router.put("/repository/:repositoryId/item/:itemId", PublicRepositoryController.updateItem);
router.delete("/repository/:repositoryId/item/:itemId", PublicRepositoryController.deleteItem);
router.post("/repository/:repositoryId/items/bulk", PublicRepositoryController.bulkAddItems);
router.delete("/repository/:repositoryId/items/bulk", PublicRepositoryController.bulkDeleteItems);

export const PublicRepositoryRouter = router;
