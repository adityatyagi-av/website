import { Router } from "express";
import { PublicApiController } from "../../controllers/public/repository.controller.js";
import { repositoryRateLimiter } from "../../middlewares/rateLimiter.middleware.js";

const router = Router();

router.get("/public/repository/:apiKey", repositoryRateLimiter, PublicApiController.getRepositoryData);
router.get("/public/repository/:apiKey/schema", repositoryRateLimiter, PublicApiController.getRepositorySchema);
router.get("/public/repository/:apiKey/item/:itemId", repositoryRateLimiter, PublicApiController.getRepositoryItem);

export const PublicApiRouter = router;
