import { Router } from "express";
import { FundingController } from "../../../controllers/incubation/portal/funding.controller.js";
import { authenticatePortal } from "../../../middlewares/portal.auth.middleware.js";
import { requireAccessByMethod } from "../../../middlewares/access.middleware.js";
import { MODULE_KEYS } from "../../../config/modules.registry.js";

const FundingRouter = Router();

FundingRouter.use("/funding", authenticatePortal, requireAccessByMethod(MODULE_KEYS.FUNDING));

// =================== FUNDING SOURCES ===================
FundingRouter.post("/funding/sources", FundingController.createFundingSource);
FundingRouter.get("/funding/sources", FundingController.getFundingSources);
FundingRouter.get("/funding/sources/:sourceId", FundingController.getFundingSourceById);
FundingRouter.patch("/funding/sources/:sourceId", FundingController.updateFundingSource);
FundingRouter.delete("/funding/sources/:sourceId", FundingController.deleteFundingSource);

// =================== PROGRAM FUNDING ALLOCATIONS ===================
FundingRouter.post("/funding/program/:programId/allocations", FundingController.allocateFundingToProgram);
FundingRouter.get("/funding/program/:programId/allocations", FundingController.getProgramFundingAllocations);
FundingRouter.patch("/funding/program/:programId/allocations/:allocationId", FundingController.updateAllocation);
FundingRouter.delete("/funding/program/:programId/allocations/:allocationId", FundingController.removeAllocation);

// =================== DISBURSEMENTS ===================
FundingRouter.post("/funding/program/:programId/disbursements", FundingController.disburseFunding);
FundingRouter.get("/funding/program/:programId/disbursements", FundingController.getProgramDisbursements);
FundingRouter.get("/funding/disbursements/:disbursementId", FundingController.getDisbursementById);
FundingRouter.patch("/funding/disbursements/:disbursementId/status", FundingController.updateDisbursementStatus);

// =================== PORTFOLIO & OVERVIEW ===================
FundingRouter.get("/funding/program/:programId/portfolio", FundingController.getProgramFundingPortfolio);
FundingRouter.get("/funding/overview", FundingController.getFundingOverview);

// =================== AUDIT HISTORY ===================
FundingRouter.get("/funding/history", FundingController.getFundingHistory);

// =================== STARTUP FUNDING REQUESTS ===================
FundingRouter.get("/funding/requests", FundingController.getFundingRequests);
FundingRouter.get("/funding/requests/:requestId", FundingController.getFundingRequestById);
FundingRouter.patch("/funding/requests/:requestId/approve", FundingController.approveFundingRequest);
FundingRouter.patch("/funding/requests/:requestId/reject", FundingController.rejectFundingRequest);

export default FundingRouter;
