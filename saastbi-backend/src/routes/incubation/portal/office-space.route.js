import { Router } from "express";
import { authenticatePortal } from "../../../middlewares/portal.auth.middleware.js";
import { requireAccessByMethod } from "../../../middlewares/access.middleware.js";
import { MODULE_KEYS } from "../../../config/modules.registry.js";
import { OfficeController } from "../../../controllers/incubation/portal/office-space.controller.js";

const OfficeRouter = Router();

OfficeRouter.use(authenticatePortal, requireAccessByMethod(MODULE_KEYS.OFFICE_SPACE));

// ==================== OFFICE SPACE CRUD ====================
OfficeRouter.post("/office-spaces", OfficeController.createOfficeSpace);
OfficeRouter.get("/office-spaces", OfficeController.getOfficeSpaces);
OfficeRouter.get("/office-spaces/:officeId", OfficeController.getOfficeSpace);
OfficeRouter.put("/office-spaces/:officeId", OfficeController.updateOfficeSpace);
OfficeRouter.delete("/office-spaces/:officeId", OfficeController.deleteOfficeSpace);

// ==================== PRICING MANAGEMENT ====================
OfficeRouter.get("/office-spaces/:officeId/pricing", OfficeController.getPricing);
OfficeRouter.post("/office-spaces/:officeId/pricing", OfficeController.addPricing);
OfficeRouter.put("/office-spaces/:officeId/pricing/:pricingId", OfficeController.updatePricing);
OfficeRouter.delete("/office-spaces/:officeId/pricing/:pricingId", OfficeController.deletePricing);

// ==================== OFFICE REQUESTS ====================
OfficeRouter.get("/office-spaces-request/requests", OfficeController.getAllRequests);
OfficeRouter.get("/office-spaces-request/requests/:requestId", OfficeController.getRequestDetails);
OfficeRouter.post("/office-spaces-request/requests/:requestId/approve", OfficeController.approveRequest);
OfficeRouter.post("/office-spaces-request/requests/:requestId/reject", OfficeController.rejectRequest);

// ==================== OFFICE ALLOCATIONS ====================
OfficeRouter.post("/office-spaces-allocation/allocations/allocate-office", OfficeController.allocateOffice);
OfficeRouter.post("/office-spaces-allocation/allocations/:allocationId/end", OfficeController.endAllocation);
OfficeRouter.get("/office-spaces-allocation/allocations", OfficeController.getAllocations);
OfficeRouter.get("/office-spaces-allocation/allocations/:allocationId", OfficeController.getAllocationDetails);

// ==================== AVAILABILITY ====================
OfficeRouter.get("/office-spaces-availability/availability/:officeId", OfficeController.getOfficeAvailability);

// ==================== DASHBOARD ====================
OfficeRouter.get("/office-spaces-dashboard/stats", OfficeController.getDashboardStats);

export { OfficeRouter };