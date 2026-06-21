import { z } from "zod";

// Pricing schema for inline creation
const pricingOptionSchema = z.object({
  pricingType: z.enum(["HOURLY", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().default("INR"),
  securityDeposit: z.number().nonnegative().optional(),
  minimumDuration: z.number().positive().optional(),
  discountPercentage: z.number().min(0).max(100).optional()
});

export const officeSpaceSchema = z.object({
  name: z.string().min(1, "Office name is required"),
  location: z.string().min(1, "Location is required"),
  size: z.number().min(1, "Size must be at least 1"),
  officeType: z.string().min(1, "Office type is required"),
  capacity: z.number().min(1, "Capacity must be at least 1"),
  status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE", "INACTIVE"]).optional(),
  description: z.string().optional(),
  monthlyRate: z.number().optional(),
  amenities: z.array(z.string()).optional().default([]),
  images: z.array(z.string()).optional().default([]),
  visibility: z.enum(["PUBLIC", "TENANT_ONLY", "PRIVATE"]).optional().default("TENANT_ONLY"),
  // Inline pricing creation support
  pricingOptions: z.array(pricingOptionSchema).optional()
});

export const updateOfficeSpaceSchema = z.object({
  name: z.string().min(1, "Office name cannot be empty").optional(),
  location: z.string().min(1, "Location cannot be empty").optional(),
  size: z.number().min(1, "Size must be at least 1").optional(),
  officeType: z.string().min(1, "Office type cannot be empty").optional(),
  capacity: z.number().min(1, "Capacity must be at least 1").optional(),
  status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE", "INACTIVE"]).optional(),
  description: z.string().optional(),
  monthlyRate: z.number().optional(),
  amenities: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  visibility: z.enum(["PUBLIC", "TENANT_ONLY", "PRIVATE"]).optional()
});

// Pricing management schemas
export const addPricingSchema = z.object({
  pricingType: z.enum(["HOURLY", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().default("INR"),
  securityDeposit: z.number().nonnegative().optional(),
  minimumDuration: z.number().positive().optional(),
  discountPercentage: z.number().min(0).max(100).optional()
});

export const updatePricingSchema = z.object({
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  securityDeposit: z.number().nonnegative().optional(),
  minimumDuration: z.number().positive().optional(),
  discountPercentage: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional()
});

// Allocation schemas
export const allocateOfficeSchema = z.object({
  officeId: z.string().min(1, "Office ID is required"),
  startupId: z.string().min(1, "Startup ID is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional()
});

// Request approval schema
export const approveRequestSchema = z.object({
  officeId: z.string().min(1, "Office ID is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional()
});

// Request rejection schema
export const rejectRequestSchema = z.object({
  rejectionReason: z.string().min(1, "Rejection reason is required")
});