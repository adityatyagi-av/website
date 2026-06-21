import { z } from "zod";

export const initiateBookingPaymentSchema = z.object({
  bookingId: z.string().min(1),
});

export const verifySubscriptionAuthorizationSchema = z.object({
  bookingId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySubscriptionId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export const verifyOneTimePaymentSchema = z.object({
  paymentId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export const cancelSubscriptionSchema = z.object({
  cancelAtCycleEnd: z.boolean().optional().default(true),
});

export const subscriptionListFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  status: z
    .enum([
      "PENDING",
      "AUTHENTICATED",
      "ACTIVE",
      "PAUSED",
      "HALTED",
      "CANCELLED",
      "COMPLETED",
      "EXPIRED",
    ])
    .optional(),
});

export const payoutListFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  status: z
    .enum(["CREATED", "PENDING", "PROCESSED", "REVERSED", "FAILED"])
    .optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});
