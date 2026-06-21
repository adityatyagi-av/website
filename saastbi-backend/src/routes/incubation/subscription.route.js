import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { SubscriptionController } from "../../controllers/incubation/subscription.controller.js";

const SubscriptionRouter = Router();
SubscriptionRouter.post("/create-subscription",authenticate, SubscriptionController.createSubscription);
SubscriptionRouter.post("/verify-payment",authenticate, SubscriptionController.verifyPayment);
SubscriptionRouter.get("/subscription/tenant/:tenantId",authenticate, SubscriptionController.getSubscriptionByTenant);
SubscriptionRouter.get("/subscriptions",authenticate, SubscriptionController.getAllSubscriptions);
SubscriptionRouter.post("/subscription/:subscriptionId/cancel",authenticate, SubscriptionController.cancelSubscription);
SubscriptionRouter.post("/subscription/change-plan", authenticate, SubscriptionController.changePlan);
SubscriptionRouter.get("/plans/:tenantId", authenticate, SubscriptionController.getAvailablePlans);
SubscriptionRouter.get("/subscription/billing-info/:tenantId", authenticate, SubscriptionController.getBillingInfo);
SubscriptionRouter.post("/webhook/razorpay", SubscriptionController.handleWebhook);

export default SubscriptionRouter;