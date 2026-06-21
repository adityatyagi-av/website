import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { invalidateTenantCache } from "../../../config/redisClient.js";

// ─── Field Groups for Section-wise Updates ───────────────────────────────────

const PAGE_FIELDS = [
  "tagline", "description", "mission", "vision", "coverImage",
  "foundedYear", "sector", "focusSectors", "website", "linkedin",
  "twitter", "email", "phone", "logo",
];

const PROFILE_BRANDING_FIELDS = ["bannerColor"];

const PROFILE_CONTACT_FIELDS = [
  "address", "city", "state", "country", "pincode",
  "latitude", "longitude", "timezone",
];

const PROFILE_SOCIAL_FIELDS = ["facebook", "instagram", "youtube"];

const PROFILE_CLASSIFICATION_FIELDS = [
  "incubationType", "focusStages", "affiliationType",
  "parentOrganization", "registrationNumber", "incorporationType",
];

const PROFILE_INFRASTRUCTURE_FIELDS = [
  "totalAreaSqFt", "seatingCapacity", "labsAvailable", "labDetails",
  "coworkingAvailable", "meetingRooms", "eventSpaceCapacity",
  "amenities", "virtualIncubationAvailable",
];

const PROFILE_OPERATIONS_FIELDS = [
  "isAcceptingApplications", "applicationProcess", "typicalProgramDuration",
  "maxStartupsPerBatch", "selectionCriteria", "equityRequired",
  "equityRangeMin", "equityRangeMax", "stipendAvailable",
  "stipendAmount", "stipendCurrency", "servicesOffered", "supportType",
];

const PROFILE_FUNDING_FIELDS = [
  "fundingCurrency", "fundingSources", "averageFundingPerStartup",
  "hasSeedFunding", "hasFollowOnFunding",
];

const PROFILE_PARTNERSHIPS_FIELDS = [
  "industryPartners", "investorPartners", "academicPartners",
  "governmentPartners", "corporatePartners",
  "internationalPartnerships", "networkMemberships",
];

const PROFILE_METRICS_FIELDS = [
  "successfulExits", "totalJobsCreated", "totalRevenueGenerated",
  "totalIPsFiled", "successRate", "averageGraduationTime",
  "startupsWithFunding", "totalExternalFundingRaised",
];

const PROFILE_RECOGNITION_FIELDS = [
  "certifications", "awards", "rankings", "mediaFeatures",
  "isGovernmentRecognized", "governmentRecognitionId",
  "isVerified", "verifiedAt",
];

const PROFILE_SETTINGS_FIELDS = [
  "defaultCurrency", "defaultLanguage", "operatingHours",
  "holidayCalendar", "autoApproveApplications", "requireNDA",
  "ndaTemplateUrl", "brandPrimaryColor", "brandSecondaryColor",
];

const PROFILE_CONTENT_FIELDS = [
  "gallery", "introVideoUrl", "testimonials",
  "successStories", "faqContent",
];

const ALL_PROFILE_FIELDS = [
  ...PROFILE_BRANDING_FIELDS,
  ...PROFILE_CONTACT_FIELDS,
  ...PROFILE_SOCIAL_FIELDS,
  ...PROFILE_CLASSIFICATION_FIELDS,
  ...PROFILE_INFRASTRUCTURE_FIELDS,
  ...PROFILE_OPERATIONS_FIELDS,
  ...PROFILE_FUNDING_FIELDS,
  ...PROFILE_PARTNERSHIPS_FIELDS,
  ...PROFILE_METRICS_FIELDS,
  ...PROFILE_RECOGNITION_FIELDS,
  ...PROFILE_SETTINGS_FIELDS,
  ...PROFILE_CONTENT_FIELDS,
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pickFields(source, fields) {
  const result = {};
  for (const key of fields) {
    if (source[key] !== undefined) {
      result[key] = source[key];
    }
  }
  return result;
}

async function resolveTenantId(tenantKey) {
  const tenant = await db.tenant.findUnique({
    where: { tenantKey },
    select: { id: true, pageId: true },
  });
  if (!tenant) throw new ApiError(404, "Tenant not found");
  return tenant;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const tenantService = {
  // ─── Existing Methods ───────────────────────────────────────────────────────

  getTenantBasicDetails: async (hostKey) => {
    const tenant = await db.tenant.findUnique({
      where: { tenantKey: hostKey },
      select: {
        organizationName: true,
        tenantKey: true,
        domain: true,
        status: true,
      },
    });
    if (!tenant) {
      throw new ApiError(404, "Tenant not found");
    }
    return tenant;
  },

  getModulesByTenantPlan: async (tenantKey) => {
    const tenant = await db.tenant.findUnique({
      where: { tenantKey },
      select: {
        id: true,
        organizationName: true,
        planId: true,
        plan: {
          select: {
            id: true,
            name: true,
            planModules: {
              include: {
                module: {
                  include: {
                    permissions: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!tenant) throw new ApiError(404, "Tenant not found");
    if (!tenant.planId) throw new ApiError(400, "Tenant has no plan assigned");
    const modules = tenant.plan.planModules.map((pm) => {
      const mod = pm.module;
      return {
        id: mod.id,
        moduleName: mod.moduleName,
        moduleKey: mod.moduleKey,
        description: mod.moduleDescription,
        isActive: mod.isActive,
        permissions: mod.permissions.map((p) => ({
          id: p.id,
          action: p.action,
        })),
      };
    });
    return {
      tenantId: tenant.id,
      tenantName: tenant.organizationName,
      planName: tenant.plan.name,
      modules,
    };
  },

  // ─── Get Full Profile ───────────────────────────────────────────────────────

  getTenantFullProfile: async (tenantKey) => {
    const tenant = await db.tenant.findUnique({
      where: { tenantKey },
      select: {
        id: true,
        organizationName: true,
        tenantKey: true,
        domain: true,
        status: true,
        tenantLogo: true,
        createdAt: true,
        updatedAt: true,
        page: {
          select: {
            id: true,
            name: true,
            slug: true,
            tagline: true,
            description: true,
            mission: true,
            vision: true,
            coverImage: true,
            logo: true,
            foundedYear: true,
            sector: true,
            focusSectors: true,
            website: true,
            linkedin: true,
            twitter: true,
            email: true,
            phone: true,
            headquarters: true,
            teamSize: true,
            followerCount: true,
            isActive: true,
          },
        },
        profile: true,
      },
    });

    if (!tenant) throw new ApiError(404, "Tenant not found");

    // Compute metrics from related models
    const computedMetrics = await tenantService.computeTenantMetrics(tenant.id);

    return {
      ...tenant,
      computedMetrics,
    };
  },

  // ─── Update Full Profile ────────────────────────────────────────────────────

  updateTenantProfile: async (tenantKey, data) => {
    const tenant = await resolveTenantId(tenantKey);

    // Separate page fields from profile fields
    const pageData = pickFields(data, PAGE_FIELDS);
    const profileData = pickFields(data, ALL_PROFILE_FIELDS);

    // Also handle top-level tenant fields
    const tenantData = {};
    if (data.organizationName !== undefined) tenantData.organizationName = data.organizationName;
    if (data.tenantLogo !== undefined) tenantData.tenantLogo = data.tenantLogo;
    if (data.domain !== undefined) tenantData.domain = data.domain;

    const operations = [];

    // Update tenant core fields if any
    if (Object.keys(tenantData).length > 0) {
      operations.push(
        db.tenant.update({
          where: { tenantKey },
          data: tenantData,
        })
      );
    }

    // Update Page fields if tenant has a linked page
    if (Object.keys(pageData).length > 0 && tenant.pageId) {
      operations.push(
        db.page.update({
          where: { id: tenant.pageId },
          data: pageData,
        })
      );
    }

    // Upsert TenantProfile
    if (Object.keys(profileData).length > 0) {
      operations.push(
        db.tenantProfile.upsert({
          where: { tenantId: tenant.id },
          create: { tenantId: tenant.id, ...profileData },
          update: profileData,
        })
      );
    }

    if (operations.length > 0) {
      await db.$transaction(operations);
    }

    // Invalidate Redis cache if tenant-level fields were changed
    if (Object.keys(tenantData).length > 0) {
      await invalidateTenantCache(tenant.id);
    }

    // Return updated full profile
    return tenantService.getTenantFullProfile(tenantKey);
  },

  // ─── Section-wise Update Helpers ────────────────────────────────────────────

  updateTenantSection: async (tenantKey, data, profileFields, pageFields = []) => {
    const tenant = await resolveTenantId(tenantKey);

    const pageData = pickFields(data, pageFields);
    const profileData = pickFields(data, profileFields);
    const tenantData = {};
    if (data.tenantLogo !== undefined) tenantData.tenantLogo = data.tenantLogo;

    const operations = [];

    if (Object.keys(tenantData).length > 0) {
      operations.push(
        db.tenant.update({
          where: { tenantKey },
          data: tenantData,
        })
      );
    }

    if (Object.keys(pageData).length > 0 && tenant.pageId) {
      operations.push(
        db.page.update({
          where: { id: tenant.pageId },
          data: pageData,
        })
      );
    }

    if (Object.keys(profileData).length > 0) {
      operations.push(
        db.tenantProfile.upsert({
          where: { tenantId: tenant.id },
          create: { tenantId: tenant.id, ...profileData },
          update: profileData,
        })
      );
    }

    if (operations.length > 0) {
      await db.$transaction(operations);
    }

    // Invalidate Redis cache if tenant-level fields were changed
    if (Object.keys(tenantData).length > 0) {
      await invalidateTenantCache(tenant.id);
    }

    return tenantService.getTenantFullProfile(tenantKey);
  },

  updateBranding: async (tenantKey, data) => {
    const brandingPageFields = ["coverImage", "logo", "tagline", "description", "mission", "vision"];
    return tenantService.updateTenantSection(tenantKey, data, PROFILE_BRANDING_FIELDS, brandingPageFields);
  },

  updateContact: async (tenantKey, data) => {
    const contactPageFields = ["email", "phone", "website"];
    return tenantService.updateTenantSection(tenantKey, data, PROFILE_CONTACT_FIELDS, contactPageFields);
  },

  updateSocial: async (tenantKey, data) => {
    const socialPageFields = ["linkedin", "twitter"];
    return tenantService.updateTenantSection(tenantKey, data, PROFILE_SOCIAL_FIELDS, socialPageFields);
  },

  updateClassification: async (tenantKey, data) => {
    const classificationPageFields = ["sector", "focusSectors"];
    return tenantService.updateTenantSection(tenantKey, data, PROFILE_CLASSIFICATION_FIELDS, classificationPageFields);
  },

  updateInfrastructure: async (tenantKey, data) => {
    return tenantService.updateTenantSection(tenantKey, data, PROFILE_INFRASTRUCTURE_FIELDS);
  },

  updateOperations: async (tenantKey, data) => {
    return tenantService.updateTenantSection(tenantKey, data, PROFILE_OPERATIONS_FIELDS);
  },

  updateFunding: async (tenantKey, data) => {
    return tenantService.updateTenantSection(tenantKey, data, PROFILE_FUNDING_FIELDS);
  },

  updatePartnerships: async (tenantKey, data) => {
    return tenantService.updateTenantSection(tenantKey, data, PROFILE_PARTNERSHIPS_FIELDS);
  },

  updateMetrics: async (tenantKey, data) => {
    return tenantService.updateTenantSection(tenantKey, data, PROFILE_METRICS_FIELDS);
  },

  updateRecognition: async (tenantKey, data) => {
    return tenantService.updateTenantSection(tenantKey, data, PROFILE_RECOGNITION_FIELDS);
  },

  updateSettings: async (tenantKey, data) => {
    return tenantService.updateTenantSection(tenantKey, data, PROFILE_SETTINGS_FIELDS);
  },

  updateContent: async (tenantKey, data) => {
    return tenantService.updateTenantSection(tenantKey, data, PROFILE_CONTENT_FIELDS);
  },

  // ─── Computed Metrics ───────────────────────────────────────────────────────

  computeTenantMetrics: async (tenantId) => {
    const [
      totalStartupsIncubated,
      activeStartups,
      graduatedStartups,
      mentorCount,
      fundingDisbursedResult,
      fundingSourcesResult,
      programBatchCount,
    ] = await Promise.all([
      // Total startups ever associated
      db.startupTenantAssociation.count({
        where: { tenantId },
      }),

      // Active startups
      db.startupTenantAssociation.count({
        where: { tenantId, isActive: true, status: "ONBOARDED" },
      }),

      // Graduated startups
      db.startupTenantAssociation.count({
        where: { tenantId, status: "GRADUATED" },
      }),

      // Active mentors
      db.incubatorMentorAssociation.count({
        where: { tenantId, status: "ACTIVE" },
      }),

      // Total funding disbursed (completed)
      db.fundingDisbursement.aggregate({
        where: { tenantId, status: "COMPLETED" },
        _sum: { amount: true },
      }),

      // Funding sources totals
      db.tenantFundingSource.aggregate({
        where: { tenantId, isActive: true },
        _sum: { totalAmount: true, allocatedAmount: true },
      }),

      // Batches per year (total batches from all programs)
      db.programBatch.count({
        where: {
          program: { tenantId },
        },
      }),
    ]);

    // Mentoring sessions count through associations
    let totalMentoringSessions = 0;
    try {
      totalMentoringSessions = await db.mentorSession.count({
        where: {
          incubatorAssociation: { tenantId },
        },
      });
    } catch {
      // MentorSession might not have incubatorAssociation filter directly
      totalMentoringSessions = 0;
    }

    const totalFundingDisbursed = fundingDisbursedResult._sum.amount || 0;
    const totalFundingSourceAmount = fundingSourcesResult._sum.totalAmount || 0;
    const totalAllocatedAmount = fundingSourcesResult._sum.allocatedAmount || 0;
    const totalFundingAvailable = totalFundingSourceAmount - totalAllocatedAmount;

    return {
      totalStartupsIncubated,
      activeStartups,
      graduatedStartups,
      mentorCount,
      totalMentoringSessions,
      totalFundingDisbursed,
      totalFundingAvailable,
      batchesPerYear: programBatchCount,
    };
  },
};