/**
 * Office Receiver Routes (Startup Portal)
 * Base: /api/startup-portal/office
 */

import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { OfficeReceiverController } from "../../controllers/startup/office-receiver.controller.js";

const OfficeReceiverRouter = Router();

// Apply authentication to all routes
OfficeReceiverRouter.use(authenticate);

// ==================== BROWSE OFFICES ====================
OfficeReceiverRouter.get("/office/browse", OfficeReceiverController.browseOffices);
OfficeReceiverRouter.get("/office/browse/:officeId", OfficeReceiverController.getOfficeDetails);
OfficeReceiverRouter.get("/office/browse/:officeId/availability", OfficeReceiverController.getOfficeAvailability);
OfficeReceiverRouter.get("/office/browse/:officeId/calendar", OfficeReceiverController.getOfficeCalendar);
OfficeReceiverRouter.get("/office/browse/:officeId/pricing", OfficeReceiverController.getOfficePricing);

// ==================== REQUESTS ====================
OfficeReceiverRouter.post("/office/requests", OfficeReceiverController.createRequest);
OfficeReceiverRouter.get("/office/requests", OfficeReceiverController.getMyRequests);
OfficeReceiverRouter.get("/office/requests/:requestId", OfficeReceiverController.getRequestDetails);
OfficeReceiverRouter.post("/office/requests/:requestId/cancel", OfficeReceiverController.cancelRequest);

// ==================== BOOKINGS ====================
OfficeReceiverRouter.post("/office/bookings/direct", OfficeReceiverController.createDirectBooking);
OfficeReceiverRouter.get("/office/bookings", OfficeReceiverController.getMyBookings);
OfficeReceiverRouter.get("/office/bookings/:bookingId", OfficeReceiverController.getBookingDetails);
OfficeReceiverRouter.post("/office/bookings/:bookingId/cancel", OfficeReceiverController.cancelBooking);

// ==================== PAYMENTS ====================
OfficeReceiverRouter.post("/office/payments/initiate", OfficeReceiverController.initiatePayment);
OfficeReceiverRouter.post("/office/payments/verify", OfficeReceiverController.verifyPayment);
OfficeReceiverRouter.get("/office/payments", OfficeReceiverController.getMyPayments);
OfficeReceiverRouter.get("/office/payments/:paymentId", OfficeReceiverController.getPaymentDetails);
OfficeReceiverRouter.get("/office/payments/:paymentId/invoice", OfficeReceiverController.getInvoice);

// ==================== MY OFFICES ====================
OfficeReceiverRouter.get("/office/my/current", OfficeReceiverController.getMyCurrentOffices);
OfficeReceiverRouter.get("/office/my/history", OfficeReceiverController.getMyOfficeHistory);

// ==================== DASHBOARD ====================
OfficeReceiverRouter.get("/office/dashboard", OfficeReceiverController.getDashboard);

export { OfficeReceiverRouter };

