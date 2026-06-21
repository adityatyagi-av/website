import { z } from "zod";

export const createPayoutAccountSchema = z.object({
  legalBusinessName: z.string().min(1),
  businessType: z
    .enum(["proprietorship", "partnership", "private_limited", "public_limited", "llp", "trust", "society", "ngo", "individual"])
    .optional(),
  accountHolderName: z.string().min(1),
  bankAccountNumber: z.string().min(6),
  bankIfscCode: z.string().min(11).max(11),
  bankName: z.string().optional(),
  bankBranch: z.string().optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(8),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  pincode: z.string().optional(),
});

export const updatePayoutAccountSchema = createPayoutAccountSchema.partial();

export const addKycDocumentSchema = z.object({
  documentType: z.enum([
    "PAN",
    "GST_CERTIFICATE",
    "CANCELLED_CHEQUE",
    "AOA",
    "INCORPORATION",
    "OWNER_AADHAAR",
    "ADDRESS_PROOF",
    "OTHER",
  ]),
  s3Url: z.string().url(),
  fileName: z.string().optional(),
});
