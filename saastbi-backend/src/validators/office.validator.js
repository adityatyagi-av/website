import { z } from "zod";

const ownerTypes = ["TENANT", "STARTUP", "USER", "PAGE"];
const requesterTypes = ["STARTUP", "USER", "PAGE"];
const pricingTypes = ["HOURLY", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"];
const visibilityTypes = ["PUBLIC", "TENANT_ONLY", "PRIVATE"];
const paymentTypes = ["BOOKING", "RENT", "SECURITY_DEPOSIT"];
const paymentModes = ["ONE_TIME", "SUBSCRIPTION"];
const billingCycles = ["WEEKLY", "MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY", "CUSTOM"];

const pricingOptionShape = {
  pricingType: z.enum(pricingTypes),
  amount: z.number().positive(),
  currency: z.string().optional(),
  securityDeposit: z.number().nonnegative().optional(),
  minimumDuration: z.number().positive().optional(),
  discountPercentage: z.number().min(0).max(100).optional(),
  paymentMode: z.enum(paymentModes).optional(),
  billingCycle: z.enum(billingCycles).optional(),
  customCycleDays: z.number().int().positive().optional(),
  defaultDuration: z.number().int().positive().optional(),
  minDuration: z.number().int().positive().optional(),
  maxDuration: z.number().int().positive().optional(),
  gstApplicable: z.boolean().optional(),
  gstPercentage: z.number().min(0).max(100).optional(),
  tdsApplicable: z.boolean().optional(),
  tdsPercentage: z.number().min(0).max(100).optional(),
  platformFeePercentage: z.number().min(0).max(100).optional(),
  lateFeePercentage: z.number().min(0).max(100).optional(),
  gracePeriodDays: z.number().int().nonnegative().optional(),
  advancePaymentMonths: z.number().int().nonnegative().optional(),
};

export const createOfficeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  location: z.string().min(1, "Location is required"),
  size: z.number().positive("Size must be positive"),
  officeType: z.string().min(1, "Office type is required"),
  capacity: z.number().positive("Capacity must be positive"),
  description: z.string().optional(),
  monthlyRate: z.number().positive().optional(),
  amenities: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE", "INACTIVE"]).optional(),
  visibility: z.enum(visibilityTypes).optional(),
  pricingOptions: z.array(z.object(pricingOptionShape)).optional()
});

export const updateOfficeSchema = z.object({
  name: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  size: z.number().positive().optional(),
  officeType: z.string().min(1).optional(),
  capacity: z.number().positive().optional(),
  description: z.string().optional(),
  monthlyRate: z.number().positive().optional(),
  amenities: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  visibility: z.enum(visibilityTypes).optional(),
  status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE", "INACTIVE"]).optional()
});

export const addPricingSchema = z.object(pricingOptionShape).extend({
  currency: z.string().default("INR"),
});

export const updatePricingSchema = z.object({
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  securityDeposit: z.number().nonnegative().optional(),
  minimumDuration: z.number().positive().optional(),
  discountPercentage: z.number().min(0).max(100).optional(),
  paymentMode: z.enum(paymentModes).optional(),
  billingCycle: z.enum(billingCycles).optional(),
  customCycleDays: z.number().int().positive().optional(),
  defaultDuration: z.number().int().positive().optional(),
  minDuration: z.number().int().positive().optional(),
  maxDuration: z.number().int().positive().optional(),
  gstApplicable: z.boolean().optional(),
  gstPercentage: z.number().min(0).max(100).optional(),
  tdsApplicable: z.boolean().optional(),
  tdsPercentage: z.number().min(0).max(100).optional(),
  platformFeePercentage: z.number().min(0).max(100).optional(),
  lateFeePercentage: z.number().min(0).max(100).optional(),
  gracePeriodDays: z.number().int().nonnegative().optional(),
  advancePaymentMonths: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

export const createRequestSchema = z.object({
  officeId: z.string().min(1, "Office ID is required"),
  startupId: z.string().optional(), // Can pass explicitly
  tenantId: z.string().optional(),
  preferredSize: z.number().positive().optional(),
  preferredLocation: z.string().optional(),
  desiredStartDate: z.string().min(1, "Desired start date is required"),
  desiredEndDate: z.string().optional(),
  pricingType: z.enum(pricingTypes),
  purpose: z.string().optional(),
  notes: z.string().optional()
});

export const approveRequestSchema = z.object({
  officeId: z.string().min(1, "Office ID is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  pricingId: z.string().optional(),
  totalAmount: z.number().nonnegative().optional(),
  securityDeposit: z.number().nonnegative().optional(),
  isPaymentRequired: z.boolean().optional().default(true),
  duration: z.number().int().positive().optional(),
  notes: z.string().optional()
});

export const rejectRequestSchema = z.object({
  rejectionReason: z.string().min(1, "Rejection reason is required")
});

export const directBookingSchema = z.object({
  officeId: z.string().min(1, "Office ID is required"),
  pricingId: z.string().min(1, "Pricing ID is required"),
  startupId: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  duration: z.number().int().positive().optional(),
  notes: z.string().optional()
});

export const cancelBookingSchema = z.object({
  cancellationReason: z.string().min(1, "Cancellation reason is required")
});

export const initiatePaymentSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  paymentType: z.enum(paymentTypes),
  startupId: z.string().min(1, "Startup ID is required"),
});

export const verifyPaymentSchema = z.object({
  paymentId: z.string().min(1, "Payment ID is required"),
  razorpayPaymentId: z.string().min(1, "Razorpay payment ID is required"),
  razorpaySignature: z.string().min(1, "Razorpay signature is required")
});

export const refundPaymentSchema = z.object({
  amount: z.number().positive().optional(),
  reason: z.string().min(1, "Refund reason is required")
});

export const allocateOfficeSchema = z.object({
  officeId: z.string().min(1, "Office ID is required"),
  startupId: z.string().min(1, "Startup ID is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  pricingType: z.enum([
    "HOURLY",
    "DAILY",
    "WEEKLY",
    "MONTHLY",
    "YEARLY"
  ]),
});

// ============================================================================
// FILTER SCHEMAS
// ============================================================================

export const officeFiltersSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  search: z.string().optional(),
  sortBy: z.string().optional().default("createdAt"),
  order: z.enum(["asc", "desc"]).optional().default("desc")
});

export const requestFiltersSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  startupId: z.string().optional(), // Can pass explicitly in query
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]).optional(),
  search: z.string().optional()
});

export const allocationFiltersSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  status: z.enum(["ACTIVE", "ENDED", "TERMINATED"]).optional(),
  search: z.string().optional()
});

export const bookingFiltersSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  startupId: z.string().optional(), // Can pass explicitly in query
  officeId: z.string().optional(),
  status: z.enum(["PENDING_PAYMENT", "CONFIRMED", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

export const paymentFiltersSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  bookingId: z.string().optional(),
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "REFUNDED"]).optional()
});

export const browseFiltersSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  search: z.string().optional(),
  location: z.string().optional(),
  minCapacity: z.coerce.number().optional(),
  maxCapacity: z.coerce.number().optional(),
  officeType: z.string().optional(),
  amenities: z.string().optional(),
  pricingType: z.enum(["HOURLY", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  sortBy: z.string().optional().default("createdAt"),
  officeStatus:z.enum(["AVAILABLE","OCCUPIED","MAINTENANCE","INACTIVE"]).optional(),
  order: z.enum(["asc", "desc"]).optional().default("desc")
});

export const availabilitySchema = z.object({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  pricingType: z.enum([
    "DAILY",
    "WEEKLY",
    "MONTHLY",
    "YEARLY"
  ])
});

export const calendarSchema = z.object({
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020).max(2100)
});

export const verifySubscriptionSchema = z.object({
  paymentId: z.string().min(1).optional(),
  bookingId: z.string().min(1, "bookingId is required"),
  razorpayPaymentId: z.string().min(1),
  razorpaySubscriptionId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export const subscriptionFiltersSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  status: z.enum([
    "PENDING", "AUTHENTICATED", "ACTIVE", "PAUSED", "HALTED", "CANCELLED", "COMPLETED", "EXPIRED",
  ]).optional(),
});

export const payoutFiltersSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  status: z.enum(["CREATED", "PENDING", "PROCESSED", "REVERSED", "FAILED"]).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

