import { Router } from "express";
import { authenticatePortal } from "../../../middlewares/portal.auth.middleware.js";
import { PayoutAccountController } from "../../../controllers/incubation/portal/payout-account.controller.js";

const PayoutAccountRouter = Router();

PayoutAccountRouter.use(authenticatePortal);

PayoutAccountRouter.get("/payout-account", PayoutAccountController.getAccount);
PayoutAccountRouter.post("/payout-account", PayoutAccountController.createAccount);
PayoutAccountRouter.patch("/payout-account", PayoutAccountController.updateAccount);
PayoutAccountRouter.post("/payout-account/resubmit", PayoutAccountController.resubmit);
PayoutAccountRouter.delete("/payout-account", PayoutAccountController.deactivate);

PayoutAccountRouter.get("/payout-account/documents", PayoutAccountController.listDocuments);
PayoutAccountRouter.post("/payout-account/documents", PayoutAccountController.addDocument);

PayoutAccountRouter.get("/payout-account/status", PayoutAccountController.getStatus);

export { PayoutAccountRouter };
