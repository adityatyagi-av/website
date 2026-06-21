/**
 * Office Provider Routes (Incubation Portal)
 * Base: /api/incubation-portal/office
 */

import { Router } from "express";
import { authenticatePortal } from "../../../middlewares/portal.auth.middleware.js";
import { requireAccessByMethod } from "../../../middlewares/access.middleware.js";
import { MODULE_KEYS } from "../../../config/modules.registry.js";
import { OfficeProviderController } from "../../../controllers/incubation/portal/office-provider.controller.js";

const OfficeProviderRouter = Router();

// Apply portal authentication + subscription/permission gate to all routes
OfficeProviderRouter.use("/office", authenticatePortal, requireAccessByMethod(MODULE_KEYS.OFFICE_SPACE));

// ==================== OFFICE SPACE CRUD ====================
OfficeProviderRouter.post("/office/spaces", OfficeProviderController.createOfficeSpace);
OfficeProviderRouter.get("/office/spaces", OfficeProviderController.getOfficeSpaces);
OfficeProviderRouter.get("/office/spaces/:officeId", OfficeProviderController.getOfficeSpace);
OfficeProviderRouter.put("/office/spaces/:officeId", OfficeProviderController.updateOfficeSpace);
OfficeProviderRouter.delete("/office/spaces/:officeId", OfficeProviderController.deleteOfficeSpace);

// ==================== PRICING ====================
OfficeProviderRouter.get("/office/spaces/:officeId/pricing", OfficeProviderController.getPricing);
OfficeProviderRouter.post("/office/spaces/:officeId/pricing", OfficeProviderController.addPricing);
OfficeProviderRouter.put("/office/spaces/:officeId/pricing/:pricingId", OfficeProviderController.updatePricing);
OfficeProviderRouter.delete("/office/spaces/:officeId/pricing/:pricingId", OfficeProviderController.deletePricing);

// ==================== AVAILABILITY ====================
OfficeProviderRouter.get("/office/spaces/:officeId/availability", OfficeProviderController.getAvailability);
OfficeProviderRouter.get("/office/spaces/:officeId/calendar", OfficeProviderController.getCalendar);

// ==================== REQUESTS ====================
OfficeProviderRouter.get("/office/requests", OfficeProviderController.getAllRequests);
OfficeProviderRouter.get("/office/requests/:requestId", OfficeProviderController.getRequestDetails);
OfficeProviderRouter.post("/office/requests/:requestId/approve", OfficeProviderController.approveRequest);
OfficeProviderRouter.post("/office/requests/:requestId/reject", OfficeProviderController.rejectRequest);

// ==================== ALLOCATIONS ====================
OfficeProviderRouter.post("/office/allocations", OfficeProviderController.allocateOffice);
OfficeProviderRouter.get("/office/allocations", OfficeProviderController.getAllocations);
OfficeProviderRouter.get("/office/allocations/:allocationId", OfficeProviderController.getAllocationDetails);
OfficeProviderRouter.post("/office/allocations/:allocationId/end", OfficeProviderController.endAllocation);
OfficeProviderRouter.post("/office/allocations/:allocationId/extend",OfficeProviderController.extendAllocation);

// ==================== BOOKINGS ====================
OfficeProviderRouter.get("/office/bookings", OfficeProviderController.getBookings);
OfficeProviderRouter.get("/office/bookings/:bookingId", OfficeProviderController.getBookingDetails);
OfficeProviderRouter.post("/office/bookings/:bookingId/confirm", OfficeProviderController.confirmBooking);
OfficeProviderRouter.post("/office/bookings/:bookingId/activate", OfficeProviderController.activateBooking);
OfficeProviderRouter.post("/office/bookings/:bookingId/complete", OfficeProviderController.completeBooking);
OfficeProviderRouter.post("/office/bookings/:bookingId/cancel", OfficeProviderController.cancelBooking);

// ==================== PAYMENTS ====================
OfficeProviderRouter.get("/office/payments", OfficeProviderController.getPayments);
OfficeProviderRouter.get("/office/payments/:paymentId", OfficeProviderController.getPaymentDetails);
OfficeProviderRouter.post("/office/payments/:paymentId/refund", OfficeProviderController.initiateRefund);
OfficeProviderRouter.get("/office/payments/:paymentId/invoice", OfficeProviderController.getInvoice);

// ==================== DASHBOARD ====================
OfficeProviderRouter.get("/office/dashboard", OfficeProviderController.getDashboard);

export { OfficeProviderRouter };
