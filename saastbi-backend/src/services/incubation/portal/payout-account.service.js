import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { RazorpayService } from "../../common/razorpay.service.js";

export const PayoutAccountService = {
  async getAccount({ tenantId }) {
    const account = await db.incubationPayoutAccount.findUnique({
      where: { tenantId },
      include: { documents: true },
    });
    return account;
  },

  async getActivatedAccount({ tenantId }) {
    return db.incubationPayoutAccount.findFirst({
      where: { tenantId, kycStatus: "ACTIVATED", isActive: true },
    });
  },

  async createAccount({ tenantId, data }) {
    const existing = await db.incubationPayoutAccount.findUnique({ where: { tenantId } });
    if (existing) {
      throw new ApiError(409, "Payout account already exists for this tenant");
    }

    let linkedAccountId = null;
    let stakeholderId = null;
    let productConfigurationId = null;
    const errors = {};

    try {
      const linked = await RazorpayService.createLinkedAccount({
        email: data.contactEmail,
        phone: data.contactPhone,
        legalBusinessName: data.legalBusinessName,
        businessType: data.businessType,
        referenceId: `tenant_${tenantId}`,
        contactName: data.accountHolderName,
        profile: {
          category: "education",
          subcategory: "others",
          addresses: {
            registered: {
              street1: data.addressLine1 || "",
              street2: data.addressLine2 || "",
              city: data.city || "",
              state: data.state || "",
              postal_code: data.pincode || "",
              country: data.country || "IN",
            },
          },
        },
        legalInfo: { pan: data.panNumber, gst: data.gstNumber },
      });
      linkedAccountId = linked.id;
    } catch (err) {
      errors.linkedAccount = err.message;
    }

    if (linkedAccountId) {
      try {
        const stakeholder = await RazorpayService.createStakeholder(linkedAccountId, {
          name: data.accountHolderName,
          email: data.contactEmail,
          phone: { primary: data.contactPhone },
          kyc: data.panNumber ? { pan: data.panNumber } : undefined,
        });
        stakeholderId = stakeholder.id;
      } catch (err) {
        errors.stakeholder = err.message;
      }

      try {
        const product = await RazorpayService.requestProductConfiguration(linkedAccountId, {
          settlements: {
            account_number: data.bankAccountNumber,
            ifsc_code: data.bankIfscCode,
            beneficiary_name: data.accountHolderName,
          },
        });
        productConfigurationId = product.id;
      } catch (err) {
        errors.productConfiguration = err.message;
      }
    }

    const account = await db.incubationPayoutAccount.create({
      data: {
        tenantId,
        legalBusinessName: data.legalBusinessName,
        businessType: data.businessType,
        accountHolderName: data.accountHolderName,
        bankAccountNumber: data.bankAccountNumber,
        bankIfscCode: data.bankIfscCode,
        bankName: data.bankName,
        bankBranch: data.bankBranch,
        gstNumber: data.gstNumber,
        panNumber: data.panNumber,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        state: data.state,
        country: data.country || "IN",
        pincode: data.pincode,
        razorpayLinkedAccountId: linkedAccountId,
        razorpayStakeholderId: stakeholderId,
        razorpayProductConfigurationId: productConfigurationId,
        kycStatus: linkedAccountId ? "UNDER_REVIEW" : "PENDING",
        kycSubmittedAt: new Date(),
        isPrimary: true,
        isActive: true,
      },
    });

    return { account, razorpayErrors: Object.keys(errors).length ? errors : null };
  },

  async updateAccount({ tenantId, data }) {
    const account = await db.incubationPayoutAccount.findUnique({ where: { tenantId } });
    if (!account) throw new ApiError(404, "Payout account not found");

    if (account.kycStatus === "ACTIVATED") {
      const allowed = ["contactEmail", "contactPhone", "addressLine1", "addressLine2", "city", "state", "country", "pincode"];
      const filtered = {};
      for (const key of allowed) {
        if (data[key] !== undefined) filtered[key] = data[key];
      }
      data = filtered;
    }

    return db.incubationPayoutAccount.update({
      where: { tenantId },
      data,
    });
  },

  async resubmit({ tenantId, data }) {
    const account = await db.incubationPayoutAccount.findUnique({ where: { tenantId } });
    if (!account) throw new ApiError(404, "Payout account not found");
    if (account.kycStatus !== "NEEDS_CLARIFICATION") {
      throw new ApiError(400, "Resubmit only allowed when KYC needs clarification");
    }

    if (account.razorpayLinkedAccountId) {
      try {
        await RazorpayService.updateLinkedAccount(account.razorpayLinkedAccountId, {
          legal_business_name: data.legalBusinessName || account.legalBusinessName,
          contact_name: data.accountHolderName || account.accountHolderName,
          email: data.contactEmail || account.contactEmail,
          phone: data.contactPhone || account.contactPhone,
        });
      } catch (err) {
        console.error("Failed to update Razorpay linked account:", err.message);
      }
    }

    return db.incubationPayoutAccount.update({
      where: { tenantId },
      data: {
        ...data,
        kycStatus: "UNDER_REVIEW",
        kycSubmittedAt: new Date(),
        kycRejectionReason: null,
      },
    });
  },

  async deactivate({ tenantId }) {
    const account = await db.incubationPayoutAccount.findUnique({ where: { tenantId } });
    if (!account) throw new ApiError(404, "Payout account not found");

    const activeBookings = await db.officeBooking.count({
      where: {
        office: { tenantId },
        status: { in: ["CONFIRMED", "ACTIVE", "PENDING_PAYMENT"] },
      },
    });
    if (activeBookings > 0) {
      throw new ApiError(400, "Cannot deactivate while active bookings exist");
    }

    return db.incubationPayoutAccount.update({
      where: { tenantId },
      data: { isActive: false },
    });
  },

  async addDocument({ tenantId, data }) {
    const account = await db.incubationPayoutAccount.findUnique({ where: { tenantId } });
    if (!account) throw new ApiError(404, "Payout account not found");

    return db.incubationKycDocument.create({
      data: {
        payoutAccountId: account.id,
        documentType: data.documentType,
        s3Url: data.s3Url,
        fileName: data.fileName,
        verificationStatus: "PENDING",
      },
    });
  },

  async listDocuments({ tenantId }) {
    const account = await db.incubationPayoutAccount.findUnique({ where: { tenantId } });
    if (!account) throw new ApiError(404, "Payout account not found");

    return db.incubationKycDocument.findMany({
      where: { payoutAccountId: account.id },
      orderBy: { createdAt: "desc" },
    });
  },

  async getPayoutStatus({ tenantId }) {
    const account = await db.incubationPayoutAccount.findUnique({ where: { tenantId } });
    if (!account) {
      return {
        configured: false,
        kycStatus: null,
        canAcceptPayments: false,
        message: "Set up your payout account to publish paid offices.",
      };
    }
    const canAcceptPayments = account.kycStatus === "ACTIVATED" && account.isActive;
    return {
      configured: true,
      kycStatus: account.kycStatus,
      kycRejectionReason: account.kycRejectionReason,
      canAcceptPayments,
      activatedAt: account.activatedAt,
    };
  },
};

export async function ensurePayoutAccountActivated(tenantId) {
  const account = await db.incubationPayoutAccount.findUnique({ where: { tenantId } });
  if (!account || account.kycStatus !== "ACTIVATED" || !account.isActive) {
    throw new ApiError(
      400,
      "Payout account must be activated before accepting paid bookings. Complete KYC in Settings → Payout Account."
    );
  }
  return account;
}
