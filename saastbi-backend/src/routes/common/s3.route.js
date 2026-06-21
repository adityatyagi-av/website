
import { Router } from "express";
import { authenticatePortal } from "../../middlewares/portal.auth.middleware.js";
import { S3Controller } from "../../controllers/common/s3.controller.js";

const S3Router = Router();

S3Router.post("/generate-signed-url", S3Controller.generateSignedUrl);


export { S3Router };
