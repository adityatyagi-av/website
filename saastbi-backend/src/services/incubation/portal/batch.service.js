import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { buildQueryOptions } from "../../../utils/queryHelper.js";

const VALID_STATUS_TRANSITIONS = {
  DRAFT: ["UPCOMING", "OPEN"],
  UPCOMING: ["OPEN", "DRAFT"],
  OPEN: ["CLOSED"],
  CLOSED: ["UNDER_EVALUATION", "OPEN"],
  UNDER_EVALUATION: ["COMPLETED"],
  COMPLETED: ["ARCHIVED"],
  ARCHIVED: [],
};

export const batchService = {
  async createBatch(data) {
    const {
      tenantKey,
      programId,
      batchName,
      batchCode,
      description,
      applicationStartDate,
      applicationEndDate,
      maxSlots,
      totalFundingAmount,
      fundingType,
      fundingCurrency,
      isFundingAvailable,
    } = data;

    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const program = await db.program.findUnique({ where: { id: programId } });
    if (!program) throw new ApiError(404, "Program not found");
    if (program.tenantId !== tenant.id)
      throw new ApiError(403, "You are not authorized to manage this program");

    if (batchCode) {
      const existing = await db.programBatch.findUnique({
        where: { programId_batchCode: { programId, batchCode } },
      });
      if (existing)
        throw new ApiError(400, "A batch with this code already exists for this program");
    }

    if (applicationStartDate && applicationEndDate) {
      if (new Date(applicationEndDate) <= new Date(applicationStartDate)) {
        throw new ApiError(400, "applicationEndDate must be after applicationStartDate");
      }
    }

    const batch = await db.programBatch.create({
      data: {
        programId,
        batchName,
        batchCode: batchCode || null,
        description: description || null,
        applicationStartDate: applicationStartDate ? new Date(applicationStartDate) : null,
        applicationEndDate: applicationEndDate ? new Date(applicationEndDate) : null,
        maxSlots: maxSlots || null,
        totalFundingAmount: totalFundingAmount || null,
        fundingType: fundingType || null,
        fundingCurrency: fundingCurrency || "INR",
        isFundingAvailable: isFundingAvailable ?? false,
        status: "DRAFT",
      },
    });

    return batch;
  },

  async updateBatch(batchId, data) {
    const {
      tenantKey,
      batchName,
      batchCode,
      description,
      applicationStartDate,
      applicationEndDate,
      maxSlots,
      totalFundingAmount,
      fundingType,
      fundingCurrency,
      isFundingAvailable,
    } = data;

    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const batch = await db.programBatch.findUnique({
      where: { id: batchId },
      include: { program: true },
    });
    if (!batch) throw new ApiError(404, "Batch not found");
    if (batch.program.tenantId !== tenant.id)
      throw new ApiError(403, "You are not authorized to manage this batch");

    const dateFieldsLocked = !["DRAFT", "UPCOMING"].includes(batch.status);

    const updateData = {};
    if (batchName !== undefined) updateData.batchName = batchName;
    if (description !== undefined) updateData.description = description;
    if (totalFundingAmount !== undefined) updateData.totalFundingAmount = totalFundingAmount;
    if (fundingType !== undefined) updateData.fundingType = fundingType;
    if (fundingCurrency !== undefined) updateData.fundingCurrency = fundingCurrency;
    if (isFundingAvailable !== undefined) updateData.isFundingAvailable = isFundingAvailable;

    if (!dateFieldsLocked) {
      if (applicationStartDate !== undefined)
        updateData.applicationStartDate = applicationStartDate ? new Date(applicationStartDate) : null;
      if (applicationEndDate !== undefined)
        updateData.applicationEndDate = applicationEndDate ? new Date(applicationEndDate) : null;
      if (maxSlots !== undefined) updateData.maxSlots = maxSlots;

      if (batchCode !== undefined) {
        if (batchCode && batchCode !== batch.batchCode) {
          const existing = await db.programBatch.findUnique({
            where: { programId_batchCode: { programId: batch.programId, batchCode } },
          });
          if (existing)
            throw new ApiError(400, "A batch with this code already exists for this program");
        }
        updateData.batchCode = batchCode || null;
      }
    }

    const startDate = updateData.applicationStartDate ?? batch.applicationStartDate;
    const endDate = updateData.applicationEndDate ?? batch.applicationEndDate;
    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      throw new ApiError(400, "applicationEndDate must be after applicationStartDate");
    }

    if (!Object.keys(updateData).length) {
      throw new ApiError(400, "No valid fields to update");
    }

    return db.programBatch.update({
      where: { id: batchId },
      data: updateData,
    });
  },

  async getBatchesByProgram({ programId, tenantKey, status, page = 1, limit = 10,search="" ,sortBy,order}) {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const program = await db.program.findUnique({ where: { id: programId } });
    if (!program) throw new ApiError(404, "Program not found");
    if (program.tenantId !== tenant.id)
      throw new ApiError(403, "You are not authorized to view this program's batches");

    const {
      skip,
      take,
      where: searchWhere,
      orderBy,
    } = buildQueryOptions({
      page,
      limit,
      search,
  
      searchFields: [
        "batchName",
        "batchCode",
        "description",
      ],
  
      defaultFields: ["batchName"],
      sortBy,
      order,
    });

    const where = {
      programId,
      ...(status
        ? { status }
        : {}),
      ...searchWhere,
    };

    const [batches, total] = await Promise.all([
      db.programBatch.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          _count: {
            select: {
              startupApplications: true,
              startupAssociations: true,
            },
          },
        },
      }),
      db.programBatch.count({ where }),
    ]);

    return {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / take),
      data: batches.map((b) => ({
        id: b.id,
        programId: b.programId,
        batchName: b.batchName,
        batchCode: b.batchCode,
        description: b.description,
        applicationStartDate: b.applicationStartDate,
        applicationEndDate: b.applicationEndDate,
        maxSlots: b.maxSlots,
        status: b.status,
        isActive: b.isActive,
        totalFundingAmount: b.totalFundingAmount,
        fundingType: b.fundingType,
        fundingCurrency: b.fundingCurrency,
        isFundingAvailable: b.isFundingAvailable,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        totalApplications: b._count.startupApplications,
        totalOnboarded: b._count.startupAssociations,
      })),
    };
  },

  async getBatchById(batchId, tenantKey) {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const batch = await db.programBatch.findUnique({
      where: { id: batchId },
      include: {
        program: {
          select: { id: true, title: true, tenantId: true },
        },
        _count: {
          select: {
            startupApplications: true,
            startupAssociations: true,
            panelAssignments: true,
            fundingDisbursements: true,
          },
        },
      },
    });

    if (!batch) throw new ApiError(404, "Batch not found");
    if (batch.program.tenantId !== tenant.id)
      throw new ApiError(403, "You are not authorized to view this batch");

    const statusCounts = await db.startupApplication.groupBy({
      by: ["status"],
      where: { batchId },
      _count: true,
    });

    return {
      ...batch,
      program: batch.program,
      stats: {
        totalApplications: batch._count.startupApplications,
        totalOnboarded: batch._count.startupAssociations,
        totalPanelMembers: batch._count.panelAssignments,
        totalDisbursements: batch._count.fundingDisbursements,
        applicationsByStatus: statusCounts.reduce((acc, s) => {
          acc[s.status] = s._count;
          return acc;
        }, {}),
      },
      _count: undefined,
    };
  },

  async changeBatchStatus({ batchId, newStatus, tenantKey }) {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const batch = await db.programBatch.findUnique({
      where: { id: batchId },
      include: { program: true },
    });
    if (!batch) throw new ApiError(404, "Batch not found");
    if (batch.program.tenantId !== tenant.id)
      throw new ApiError(403, "You are not authorized to manage this batch");

    const allowedTransitions = VALID_STATUS_TRANSITIONS[batch.status];
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw new ApiError(
        400,
        `Cannot transition from ${batch.status} to ${newStatus}. Allowed: ${(allowedTransitions || []).join(", ") || "none"}`,
      );
    }

    if (newStatus === "OPEN") {
      const existingOpenBatch = await db.programBatch.findFirst({
        where: {
          programId: batch.programId,
          status: "OPEN",
          id: { not: batchId },
        },
      });
      if (existingOpenBatch) {
        throw new ApiError(
          400,
          `Only one batch can accept applications at a time. Batch "${existingOpenBatch.batchName}" is already open. Close it first before opening another.`,
        );
      }
    }

    const updateData = { status: newStatus };
    if (newStatus === "ARCHIVED") updateData.isActive = false;
    if (newStatus === "OPEN") updateData.isActive = true;

    return db.programBatch.update({
      where: { id: batchId },
      data: updateData,
    });
  },

  async deleteBatch(batchId, tenantKey) {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const batch = await db.programBatch.findUnique({
      where: { id: batchId },
      include: {
        program: true,
        _count: { select: { startupApplications: true } },
      },
    });
    if (!batch) throw new ApiError(404, "Batch not found");
    if (batch.program.tenantId !== tenant.id)
      throw new ApiError(403, "You are not authorized to manage this batch");

    if (batch.status !== "DRAFT")
      throw new ApiError(400, "Only DRAFT batches can be deleted");

    if (batch._count.startupApplications > 0)
      throw new ApiError(400, "Cannot delete a batch that has applications");

    await db.programBatch.delete({ where: { id: batchId } });
    return { success: true };
  },

  async getBatchRegistrations({
    tenantKey,
    programId,
    batchId,
    page = 1,
    limit = 10,
    search = "",
    sortBy = "createdAt",
    order = "desc",
    status,
  }) {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const batch = await db.programBatch.findUnique({
      where: { id: batchId },
      include: { program: true },
    });
    if (!batch) throw new ApiError(404, "Batch not found");
    if (batch.programId !== programId)
      throw new ApiError(400, "Batch does not belong to this program");
    if (batch.program.tenantId !== tenant.id)
      throw new ApiError(403, "You are not authorized to view these registrations");

    const {
      skip,
      take,
      where: searchWhere,
      orderBy,
    } = buildQueryOptions({
      page,
      limit,
      search,
      searchFields: ["startup.name", "startup.contactEmail"],
      defaultFields: ["startup.name"],
      sortBy,
      order,
    });

    const whereClause = {
      programId,
      batchId,
      tenantId: tenant.id,
      ...(status ? { status } : {}),
      ...searchWhere,
    };

    const [registrations, total] = await Promise.all([
      db.startupApplication.findMany({
        where: whereClause,
        skip,
        take,
        orderBy,
        include: {
          startup: {
            select: {
              id: true,
              name: true,
              contactEmail: true,
              contactPhone: true,
              sector: true,
              stage: true,
              foundedYear: true,
              logoUrl: true,
            },
          },
          schemeAnswers: {
            select: {
              id: true,
              questionId: true,
              answerText: true,
              answerFileUrl: true,
            },
          },
        },
      }),
      db.startupApplication.count({ where: whereClause }),
    ]);

    return {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
      data: registrations,
    };
  },

  async getBatchStartups({
    programId,
    batchId,
    tenantKey,
    page = 1,
    limit = 10,
    search = "",
    sortBy = "createdAt",
    order = "desc",
    programStatus,
  }) {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const batch = await db.programBatch.findUnique({
      where: { id: batchId },
      include: { program: true },
    });
    if (!batch) throw new ApiError(404, "Batch not found");
    if (batch.programId !== programId)
      throw new ApiError(400, "Batch does not belong to this program");
    if (batch.program.tenantId !== tenant.id)
      throw new ApiError(403, "You are not authorized to view this batch's startups");

    const {
      skip,
      take,
      where: searchWhere,
      orderBy,
    } = buildQueryOptions({
      page,
      limit,
      search,
      searchFields: ["startup.name", "startup.contactEmail"],
      defaultFields: ["startup.name"],
      sortBy,
      order,
    });

    const whereClause = {
      programId,
      batchId,
      isActive: true,
      ...(programStatus ? { status: programStatus } : {}),
      ...searchWhere,
    };

    const [associations, total] = await Promise.all([
      db.startupProgramAssociation.findMany({
        where: whereClause,
        skip,
        take,
        orderBy,
        include: {
          startup: {
            select: {
              id: true,
              name: true,
              contactEmail: true,
              contactPhone: true,
              sector: true,
              stage: true,
              logoUrl: true,
              foundedYear: true,
              status: true,
              createdAt: true,
            },
          },
        },
      }),
      db.startupProgramAssociation.count({ where: whereClause }),
    ]);

    return {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / take),
      data: associations.map((assoc) => ({
        id: assoc.startup.id,
        name: assoc.startup.name,
        contactEmail: assoc.startup.contactEmail,
        contactPhone: assoc.startup.contactPhone,
        sector: assoc.startup.sector,
        stage: assoc.startup.stage,
        logoUrl: assoc.startup.logoUrl,
        foundedYear: assoc.startup.foundedYear,
        registrationStatus: assoc.startup.status,
        programStatus: assoc.status,
        onboardedAt: assoc.onboardedAt,
      })),
    };
  },
};
