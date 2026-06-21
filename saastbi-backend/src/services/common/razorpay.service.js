import Razorpay from "razorpay";
import { ApiError } from "../../utils/ApiError.js";
import crypto from "crypto";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const RAZORPAY_HOST = "https://api.razorpay.com/v1";
const RAZORPAY_HOST_V2 = "https://api.razorpay.com/v2";

async function razorpayFetch(method, url, body) {
  const auth = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
  ).toString("base64");
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      data?.error?.description || data?.message || `Razorpay request failed (${res.status})`;
    throw new ApiError(res.status || 500, message);
  }
  return data;
}

export const RazorpayService = {
  createPlan: async ({ planName, amount, interval = "monthly", intervalCount = 1, currency = "INR" }) => {
    try {
      const validPeriods = ["daily", "weekly", "monthly", "yearly"];
      if (!validPeriods.includes(interval)) {
        throw new ApiError(400, `Invalid interval: ${interval}`);
      }
      const plan = await razorpay.plans.create({
        period: interval,
        interval: intervalCount || 1,
        item: {
          name: planName,
          amount: Math.round(amount * 100),
          currency,
        },
      });

      return plan;
    } catch (error) {
      console.error("Razorpay Plan Creation Error:", error);
      throw new ApiError(500, error.message || "Failed to create Razorpay plan");
    }
  },

  createSubscription: async ({
    planId,
    totalCount = 12,
    customerNotify = true,
    startAt,
    addons = [],
    notes = {},
    transfers,
  }) => {
    try {
      if (!planId) throw new ApiError(400, "planId is required");

      const subscriptionData = {
        plan_id: planId,
        customer_notify: customerNotify ? 1 : 0,
        total_count: totalCount,
      };

      if (startAt) subscriptionData.start_at = startAt;
      if (addons.length > 0) subscriptionData.addons = addons;
      if (Object.keys(notes).length > 0) subscriptionData.notes = notes;
      if (Array.isArray(transfers) && transfers.length > 0) {
        subscriptionData.transfers = transfers;
      }

      const subscription = await razorpay.subscriptions.create(subscriptionData);

      return subscription;
    } catch (error) {
      console.error("Razorpay Subscription Error:", error);
      throw new ApiError(500, error.message || "Failed to create Razorpay subscription");
    }
  },
  getPlanById: async (planId) => {
    try {
      const plan = await razorpay.plans.fetch(planId);
      return plan;
    } catch (error) {
      console.error("Razorpay Get Plan Error:", error);
      throw new ApiError(500, "Failed to fetch plan details from Razorpay");
    }
  },

  getSubscriptionById: async (subscriptionId) => {
    try {
      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      return subscription;
    } catch (error) {
      console.error("Razorpay Get Subscription Error:", error);
      throw new ApiError(500, "Failed to fetch subscription details from Razorpay");
    }
  },

  cancelSubscription: async (subscriptionId, cancelAtCycleEnd = true) => {
    try {
      const subscription = await razorpay.subscriptions.cancel(subscriptionId, {
        cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0,
      });
      return subscription;
    } catch (error) {
      console.error("Razorpay Cancel Subscription Error:", error);
      throw new ApiError(500, "Failed to cancel subscription on Razorpay");
    }
  },

  updateSubscription: async (subscriptionId, updateData = {}) => {
    try {
      const subscription = await razorpay.subscriptions.update(subscriptionId, updateData);
      return subscription;
    } catch (error) {
      console.error("Razorpay Update Subscription Error:", error);
      throw new ApiError(500, "Failed to update subscription on Razorpay");
    }
  },

  pauseSubscription: async (subscriptionId, pauseAt = "now") => {
    try {
      const subscription = await razorpay.subscriptions.pause(subscriptionId, {
        pause_at: pauseAt,
      });
      return subscription;
    } catch (error) {
      console.error("Razorpay Pause Subscription Error:", error);
      throw new ApiError(500, "Failed to pause subscription on Razorpay");
    }
  },

  resumeSubscription: async (subscriptionId, resumeAt = "now") => {
    try {
      const subscription = await razorpay.subscriptions.resume(subscriptionId, {
        resume_at: resumeAt,
      });
      return subscription;
    } catch (error) {
      console.error("Razorpay Resume Subscription Error:", error);
      throw new ApiError(500, "Failed to resume subscription on Razorpay");
    }
  },

  verifyPaymentSignature: ({
    razorpayPaymentId,
    razorpaySubscriptionId,
    razorpaySignature,
  }) => {
    try {
      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpayPaymentId}|${razorpaySubscriptionId}`)
        .digest("hex");

      return generatedSignature === razorpaySignature;
    } catch (error) {
      console.error("Signature Verification Error:", error);
      throw new ApiError(500, "Failed to verify payment signature");
    }
  },

  verifyWebhookSignature: (webhookBody, webhookSignature, webhookSecret) => {
    try {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(JSON.stringify(webhookBody))
        .digest("hex");

      return expectedSignature === webhookSignature;
    } catch (error) {
      console.error("Webhook Signature Verification Error:", error);
      throw new ApiError(500, "Failed to verify webhook signature");
    }
  },

  getAllPlans: async (options = {}) => {
    try {
      const plans = await razorpay.plans.all(options);
      return plans;
    } catch (error) {
      console.error("Razorpay Get All Plans Error:", error);
      throw new ApiError(500, "Failed to fetch plans from Razorpay");
    }
  },

  getAllSubscriptions: async (options = {}) => {
    try {
      const subscriptions = await razorpay.subscriptions.all(options);
      return subscriptions;
    } catch (error) {
      console.error("Razorpay Get All Subscriptions Error:", error);
      throw new ApiError(500, "Failed to fetch subscriptions from Razorpay");
    }
  },

  fetchPayment: async (paymentId) => {
    try {
      const payment = await razorpay.payments.fetch(paymentId);
      return payment;
    } catch (error) {
      console.error("Razorpay Fetch Payment Error:", error);
      throw new ApiError(500, "Failed to fetch payment details from Razorpay");
    }
  },

  createOrder: async ({ amount, currency = "INR", receipt, notes = {}, transfers }) => {
    try {
      if (!amount || amount <= 0) {
        throw new ApiError(400, "Amount must be greater than 0");
      }
      const orderData = {
        amount: Math.round(amount * 100),
        currency,
        receipt: receipt || `order_${Date.now()}`,
        notes,
      };
      if (Array.isArray(transfers) && transfers.length > 0) {
        orderData.transfers = transfers;
      }
      const order = await razorpay.orders.create(orderData);
      return order;
    } catch (error) {
      console.error("Razorpay Create Order Error:", error);
      throw new ApiError(500, error.message || "Failed to create Razorpay order");
    }
  },

  fetchOrder: async (orderId) => {
    try {
      const order = await razorpay.orders.fetch(orderId);
      return order;
    } catch (error) {
      console.error("Razorpay Fetch Order Error:", error);
      throw new ApiError(500, "Failed to fetch order details from Razorpay");
    }
  },

  verifyOrderPaymentSignature: ({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
    try {
      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");
      return generatedSignature === razorpaySignature;
    } catch (error) {
      console.error("Order Payment Signature Verification Error:", error);
      throw new ApiError(500, "Failed to verify order payment signature");
    }
  },

  capturePayment: async (paymentId, amount, currency = "INR") => {
    try {
      const payment = await razorpay.payments.capture(paymentId, Math.round(amount * 100), currency);
      return payment;
    } catch (error) {
      console.error("Razorpay Capture Payment Error:", error);
      throw new ApiError(500, error.message || "Failed to capture payment");
    }
  },

  createRefund: async ({ paymentId, amount, notes = {}, speed = "normal" }) => {
    try {
      if (!paymentId) {
        throw new ApiError(400, "Payment ID is required for refund");
      }
      const refundData = {
        speed,
        notes,
      };
      if (amount) {
        refundData.amount = Math.round(amount * 100);
      }
      const refund = await razorpay.payments.refund(paymentId, refundData);
      return refund;
    } catch (error) {
      console.error("Razorpay Refund Error:", error);
      throw new ApiError(500, error.message || "Failed to create refund");
    }
  },

  fetchRefund: async (paymentId, refundId) => {
    try {
      const refund = await razorpay.refunds.fetch(refundId);
      return refund;
    } catch (error) {
      console.error("Razorpay Fetch Refund Error:", error);
      throw new ApiError(500, "Failed to fetch refund details from Razorpay");
    }
  },

  fetchAllRefunds: async (paymentId) => {
    try {
      const refunds = await razorpay.payments.fetchMultipleRefund(paymentId);
      return refunds;
    } catch (error) {
      console.error("Razorpay Fetch All Refunds Error:", error);
      throw new ApiError(500, "Failed to fetch refunds from Razorpay");
    }
  },

  createTransfer: async ({ accountId, amount, currency = "INR", notes = {} }) => {
    try {
      if (!accountId || !amount) {
        throw new ApiError(400, "Account ID and amount are required for transfer");
      }
      const transfer = await razorpay.transfers.create({
        account: accountId,
        amount: Math.round(amount * 100),
        currency,
        notes,
      });
      return transfer;
    } catch (error) {
      console.error("Razorpay Transfer Error:", error);
      throw new ApiError(500, error.message || "Failed to create transfer");
    }
  },

  // ==================== ROUTE / LINKED ACCOUNT ====================

  createLinkedAccount: async ({
    email,
    phone,
    legalBusinessName,
    businessType = "private_limited",
    referenceId,
    profile = {},
    legalInfo = {},
    contactName,
  }) => {
    try {
      const body = {
        email,
        phone,
        type: "route",
        reference_id: referenceId,
        legal_business_name: legalBusinessName,
        business_type: businessType,
        contact_name: contactName || legalBusinessName,
        profile,
      };
      if (legalInfo && (legalInfo.pan || legalInfo.gst)) {
        body.legal_info = {};
        if (legalInfo.pan) body.legal_info.pan = legalInfo.pan;
        if (legalInfo.gst) body.legal_info.gst = legalInfo.gst;
      }
      return await razorpayFetch("POST", `${RAZORPAY_HOST_V2}/accounts`, body);
    } catch (error) {
      console.error("Razorpay Linked Account Error:", error);
      throw new ApiError(error.statusCode || 500, error.message || "Failed to create linked account");
    }
  },

  fetchLinkedAccount: async (accountId) => {
    return razorpayFetch("GET", `${RAZORPAY_HOST_V2}/accounts/${accountId}`);
  },

  updateLinkedAccount: async (accountId, body) => {
    return razorpayFetch("PATCH", `${RAZORPAY_HOST_V2}/accounts/${accountId}`, body);
  },

  createStakeholder: async (accountId, body) => {
    return razorpayFetch("POST", `${RAZORPAY_HOST_V2}/accounts/${accountId}/stakeholders`, body);
  },

  requestProductConfiguration: async (accountId, body) => {
    return razorpayFetch(
      "POST",
      `${RAZORPAY_HOST_V2}/accounts/${accountId}/products`,
      { product_name: "route", tnc_accepted: true, ...body }
    );
  },

  updateProductConfiguration: async (accountId, productId, body) => {
    return razorpayFetch(
      "PATCH",
      `${RAZORPAY_HOST_V2}/accounts/${accountId}/products/${productId}`,
      body
    );
  },

  // ==================== TRANSFERS (ROUTE SETTLEMENTS) ====================

  fetchTransfer: async (transferId) => {
    try {
      return await razorpayFetch("GET", `${RAZORPAY_HOST}/transfers/${transferId}`);
    } catch (error) {
      console.error("Razorpay Fetch Transfer Error:", error);
      throw new ApiError(error.statusCode || 500, error.message || "Failed to fetch transfer");
    }
  },

  reverseTransfer: async (transferId, amount) => {
    try {
      const body = {};
      if (amount) body.amount = Math.round(amount * 100);
      return await razorpayFetch(
        "POST",
        `${RAZORPAY_HOST}/transfers/${transferId}/reversals`,
        body
      );
    } catch (error) {
      console.error("Razorpay Reverse Transfer Error:", error);
      throw new ApiError(error.statusCode || 500, error.message || "Failed to reverse transfer");
    }
  },

  fetchOrderTransfers: async (orderId) => {
    try {
      return await razorpayFetch(
        "GET",
        `${RAZORPAY_HOST}/orders/${orderId}/transfers`
      );
    } catch (error) {
      console.error("Razorpay Fetch Order Transfers Error:", error);
      throw new ApiError(error.statusCode || 500, error.message || "Failed to fetch transfers");
    }
  },

  // ==================== TRANSFER BUILDER (used by orders + subscriptions) ====================

  buildTransfers: ({ amount, linkedAccountId, platformFeePercentage = 0, currency = "INR", notes = {} }) => {
    if (!linkedAccountId) {
      throw new ApiError(400, "Incubation linked account is not configured");
    }
    if (!amount || amount <= 0) {
      throw new ApiError(400, "Transfer amount must be greater than 0");
    }
    const platformFee = Math.round(((amount * (platformFeePercentage || 0)) / 100) * 100) / 100;
    const incubationShare = Math.max(0, amount - platformFee);
    return [
      {
        account: linkedAccountId,
        amount: Math.round(incubationShare * 100),
        currency,
        notes,
      },
    ];
  },
};