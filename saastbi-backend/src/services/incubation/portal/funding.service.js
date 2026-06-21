import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { NotificationService } from "../../common/notification.service.js";
/**
 * Helper: log a funding action to FundingHistory
 */
async function logFundingHistory(tx, { tenantId, action, entityType, entityId, performedById, oldValue, newValue, notes }) {
  await tx.fundingHistory.create({
    data: { tenantId, action, entityType, entityId, performedById, oldValue, newValue, notes },
  });
}

export const IN_FLIGHT_DISBURSEMENT_STATUSES = ["PENDING", "APPROVED", "PROCESSING"];

/**
 * Compute remaining approvable amount for an association, subtracting
 * in-flight disbursements and still-pending requests that have not yet
 * been linked to a disbursement.
 */
export async function computeAssociationRemaining(client, { association, excludeRequestId = null, excludeDisbursementId = null }) {
  const approved = association.approvedFundingAmount || 0;
  const disbursed = association.totalDisbursedAmount || 0;

  const inFlightWhere = {
    startupId: association.startupId,
    programId: association.programId,
    batchId: association.batchId || null,
    status: { in: IN_FLIGHT_DISBURSEMENT_STATUSES },
  };
  if (excludeDisbursementId) inFlightWhere.id = { not: excludeDisbursementId };
  const inFlightDisb = await client.fundingDisbursement.findMany({
    where: inFlightWhere,
    select: { amount: true },
  });
  const inFlight = inFlightDisb.reduce((s, d) => s + d.amount, 0);

  const pendingReqWhere = {
    startupId: association.startupId,
    programId: association.programId,
    batchId: association.batchId || null,
    status: "PENDING",
    disbursementId: null,
  };
  if (excludeRequestId) pendingReqWhere.id = { not: excludeRequestId };
  const pendingReqs = await client.startupFundingRequest.findMany({
    where: pendingReqWhere,
    select: { requestedAmount: true },
  });
  const pendingRequested = pendingReqs.reduce((s, r) => s + r.requestedAmount, 0);

  return {
    approved,
    disbursed,
    inFlight,
    pendingRequested,
    remaining: approved - disbursed - inFlight - pendingRequested,
  };
}

/**
 * Sum of allocated amounts available to disburse for (program, batch).
 * Does NOT subtract disbursements - allocation is the declared ceiling;
 * we compare against completed + in-flight disbursements for the scope.
 */
export async function computeAllocationHeadroom(client, { programId, batchId = null }) {
  const [allocatedAgg, programScopeAgg, batchScopeAgg] = await Promise.all([
    client.programFundingAllocation.aggregate({
      where: { programId, batchId: batchId || null },
      _sum: { allocatedAmount: true },
    }),
    // Program-level allocations (batchId NULL) apply to every disbursement
    // under this program regardless of batch; keep them as fallback when a
    // batch-level allocation is missing for that batch.
    client.programFundingAllocation.aggregate({
      where: { programId, batchId: null },
      _sum: { allocatedAmount: true },
    }),
    client.fundingDisbursement.aggregate({
      where: {
        programId,
        batchId: batchId || null,
        status: { in: [...IN_FLIGHT_DISBURSEMENT_STATUSES, "COMPLETED"] },
      },
      _sum: { amount: true },
    }),
  ]);

  const allocated = allocatedAgg._sum.allocatedAmount || 0;
  const programLevel = programScopeAgg._sum.allocatedAmount || 0;
  const used = batchScopeAgg._sum.amount || 0;
  const ceiling = allocated > 0 ? allocated : programLevel;

  return {
    allocated: ceiling,
    used,
    remaining: ceiling - used,
  };
}

export const fundingService = {
  // =========================================================================
  // FUNDING SOURCE CRUD
  // =========================================================================

  async createFundingSource({ tenantId, userId, sourceName, sourceType, totalAmount, currency, receivedDate, expiryDate, reference, notes, documents = [] }) {
    const source = await db.$transaction(async (tx) => {
      const newSource = await tx.tenantFundingSource.create({
        data: {
          tenantId,
          sourceName,
          sourceType,
          totalAmount,
          currency: currency || "INR",
          receivedDate: receivedDate ? new Date(receivedDate) : null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          reference,
          notes,
        },
      });

      if (documents.length > 0) {
        await tx.fundingDocument.createMany({
          data: documents.map((doc) => ({
            ownerType: "SOURCE",
            fundingSourceId: newSource.id,
            fileName: doc.fileName,
            fileUrl: doc.fileUrl,
            fileType: doc.fileType || null,
            description: doc.description || null,
            uploadedById: userId,
          })),
        });
      }

      await logFundingHistory(tx, {
        tenantId,
        action: "SOURCE_CREATED",
        entityType: "TenantFundingSource",
        entityId: newSource.id,
        performedById: userId,
        newValue: { sourceName, sourceType, totalAmount, currency: currency || "INR" },
        notes: `Funding source "${sourceName}" created`,
      });

      return tx.tenantFundingSource.findUnique({
        where: { id: newSource.id },
        include: { documents: true },
      });
    });

    return source;
  },

  async getFundingSources({ tenantId }) {
    return db.tenantFundingSource.findMany({
      where: { tenantId, isActive: true },
      include: { documents: true, allocations: { include: { program: { select: { id: true, title: true } } } } },
      orderBy: { createdAt: "desc" },
    });
  },

  async getFundingSourceById({ tenantId, sourceId }) {
    const source = await db.tenantFundingSource.findUnique({
      where: { id: sourceId },
      include: {
        documents: true,
        allocations: { include: { program: { select: { id: true, title: true } } } },
      },
    });
    if (!source || source.tenantId !== tenantId) throw new ApiError(404, "Funding source not found");
    return source;
  },

  async updateFundingSource({ tenantId, userId, sourceId, data }) {
    const source = await db.tenantFundingSource.findUnique({ where: { id: sourceId } });
    if (!source || source.tenantId !== tenantId) throw new ApiError(404, "Funding source not found");

    const { documents: newDocs, ...updateFields } = data;
    const updateData = {};
    const allowedFields = ["sourceName", "sourceType", "totalAmount", "currency", "receivedDate", "expiryDate", "reference", "notes"];
    for (const field of allowedFields) {
      if (updateFields[field] !== undefined) {
        if (field === "receivedDate" || field === "expiryDate") {
          updateData[field] = updateFields[field] ? new Date(updateFields[field]) : null;
        } else {
          updateData[field] = updateFields[field];
        }
      }
    }

    // Check if reducing totalAmount below allocatedAmount
    if (updateData.totalAmount !== undefined && updateData.totalAmount < source.allocatedAmount) {
      throw new ApiError(400, `Cannot reduce total amount below already allocated amount (${source.allocatedAmount})`);
    }

    const updated = await db.$transaction(async (tx) => {
      const updatedSource = await tx.tenantFundingSource.update({
        where: { id: sourceId },
        data: updateData,
      });

      if (newDocs && newDocs.length > 0) {
        await tx.fundingDocument.createMany({
          data: newDocs.map((doc) => ({
            ownerType: "SOURCE",
            fundingSourceId: sourceId,
            fileName: doc.fileName,
            fileUrl: doc.fileUrl,
            fileType: doc.fileType || null,
            description: doc.description || null,
            uploadedById: userId,
          })),
        });
      }

      await logFundingHistory(tx, {
        tenantId,
        action: "SOURCE_UPDATED",
        entityType: "TenantFundingSource",
        entityId: sourceId,
        performedById: userId,
        oldValue: { sourceName: source.sourceName, totalAmount: source.totalAmount },
        newValue: updateData,
        notes: `Funding source updated`,
      });

      return tx.tenantFundingSource.findUnique({
        where: { id: sourceId },
        include: { documents: true },
      });
    });

    return updated;
  },

  async deleteFundingSource({ tenantId, userId, sourceId }) {
    const source = await db.tenantFundingSource.findUnique({ where: { id: sourceId } });
    if (!source || source.tenantId !== tenantId) throw new ApiError(404, "Funding source not found");

    if (source.allocatedAmount > 0) {
      throw new ApiError(400, "Cannot delete a funding source that has active allocations. Remove allocations first.");
    }

    await db.$transaction(async (tx) => {
      await tx.tenantFundingSource.update({
        where: { id: sourceId },
        data: { isActive: false },
      });

      await logFundingHistory(tx, {
        tenantId,
        action: "SOURCE_DEACTIVATED",
        entityType: "TenantFundingSource",
        entityId: sourceId,
        performedById: userId,
        notes: `Funding source "${source.sourceName}" deactivated`,
      });
    });

    return { message: "Funding source deactivated" };
  },

  // =========================================================================
  // PROGRAM FUNDING ALLOCATION
  // =========================================================================

  async allocateFundingToProgram({ tenantId, userId, programId, fundingSourceId, batchId, allocatedAmount, currency, notes }) {
    const source = await db.tenantFundingSource.findUnique({ where: { id: fundingSourceId } });
    if (!source || source.tenantId !== tenantId || !source.isActive) {
      throw new ApiError(404, "Funding source not found or inactive");
    }

    const program = await db.program.findUnique({ where: { id: programId } });
    if (!program || program.tenantId !== tenantId) {
      throw new ApiError(404, "Program not found");
    }

    const availableAmount = source.totalAmount - source.allocatedAmount;
    if (allocatedAmount > availableAmount) {
      throw new ApiError(400, `Allocation exceeds available funds. Available: ${availableAmount}, Requested: ${allocatedAmount}`);
    }

    const resolvedBatchId = batchId || null;

    const allocation = await db.$transaction(async (tx) => {
      const existing = await tx.programFundingAllocation.findFirst({
        where: { programId, fundingSourceId, batchId: resolvedBatchId },
      });

      let newAllocation;
      if (existing) {
        newAllocation = await tx.programFundingAllocation.update({
          where: { id: existing.id },
          data: { allocatedAmount: { increment: allocatedAmount }, notes },
        });
      } else {
        newAllocation = await tx.programFundingAllocation.create({
          data: {
            programId,
            fundingSourceId,
            batchId: resolvedBatchId,
            allocatedAmount,
            currency: currency || "INR",
            allocatedById: userId,
            notes,
          },
        });
      }

      await tx.tenantFundingSource.update({
        where: { id: fundingSourceId },
        data: { allocatedAmount: { increment: allocatedAmount } },
      });

      await logFundingHistory(tx, {
        tenantId,
        action: "FUNDING_ALLOCATED",
        entityType: "ProgramFundingAllocation",
        entityId: newAllocation.id,
        performedById: userId,
        newValue: { programId, fundingSourceId, allocatedAmount },
        notes: `Allocated ${allocatedAmount} to program "${program.title}" from "${source.sourceName}"`,
      });

      return newAllocation;
    });

    return allocation;
  },

  async getProgramFundingAllocations({ tenantId, programId }) {
    const program = await db.program.findUnique({ where: { id: programId } });
    if (!program || program.tenantId !== tenantId) throw new ApiError(404, "Program not found");

    return db.programFundingAllocation.findMany({
      where: { programId },
      include: {
        fundingSource: { select: { id: true, sourceName: true, sourceType: true, totalAmount: true, allocatedAmount: true, currency: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async updateAllocation({ tenantId, userId, programId, allocationId, allocatedAmount, notes }) {
    const allocation = await db.programFundingAllocation.findUnique({
      where: { id: allocationId },
      include: { fundingSource: true, program: true },
    });
    if (!allocation || allocation.program.tenantId !== tenantId) {
      throw new ApiError(404, "Allocation not found");
    }

    const diff = allocatedAmount - allocation.allocatedAmount;
    if (diff > 0) {
      const available = allocation.fundingSource.totalAmount - allocation.fundingSource.allocatedAmount;
      if (diff > available) {
        throw new ApiError(400, `Increase exceeds available funds. Available from source: ${available}`);
      }
    }

    const updated = await db.$transaction(async (tx) => {
      const updatedAllocation = await tx.programFundingAllocation.update({
        where: { id: allocationId },
        data: { allocatedAmount, notes: notes ?? allocation.notes },
      });

      await tx.tenantFundingSource.update({
        where: { id: allocation.fundingSourceId },
        data: { allocatedAmount: { increment: diff } },
      });

      await logFundingHistory(tx, {
        tenantId,
        action: "ALLOCATION_UPDATED",
        entityType: "ProgramFundingAllocation",
        entityId: allocationId,
        performedById: userId,
        oldValue: { allocatedAmount: allocation.allocatedAmount },
        newValue: { allocatedAmount },
      });

      return updatedAllocation;
    });

    return updated;
  },

  async removeAllocation({ tenantId, userId, programId, allocationId }) {
    const allocation = await db.programFundingAllocation.findUnique({
      where: { id: allocationId },
      include: { program: true },
    });
    if (!allocation || allocation.program.tenantId !== tenantId) {
      throw new ApiError(404, "Allocation not found");
    }

    await db.$transaction(async (tx) => {
      await tx.tenantFundingSource.update({
        where: { id: allocation.fundingSourceId },
        data: { allocatedAmount: { decrement: allocation.allocatedAmount } },
      });

      await tx.programFundingAllocation.delete({ where: { id: allocationId } });

      await logFundingHistory(tx, {
        tenantId,
        action: "ALLOCATION_REMOVED",
        entityType: "ProgramFundingAllocation",
        entityId: allocationId,
        performedById: userId,
        oldValue: { allocatedAmount: allocation.allocatedAmount, fundingSourceId: allocation.fundingSourceId },
        notes: `Allocation removed, ${allocation.allocatedAmount} returned to source`,
      });
    });

    return { message: "Allocation removed" };
  },

  // =========================================================================
  // FUNDING DISBURSEMENT
  // =========================================================================

  async disburseFunding({ tenantId, userId, programId, applicationId, startupId, amount, currency, disbursementType, milestoneName, reference, notes, documents = [] }) {
    // Validate the application belongs to this program and is ONBOARDED
    const application = await db.startupApplication.findUnique({
      where: { id: applicationId },
      include: { program: true },
    });
    if (!application || application.programId !== programId || application.program.tenantId !== tenantId) {
      throw new ApiError(404, "Application not found for this program");
    }
    if (application.status !== "ONBOARDED") {
      throw new ApiError(400, "Startup must be onboarded before funding can be disbursed");
    }

    const association = await db.startupProgramAssociation.findFirst({
      where: { startupId: application.startupId, programId, batchId: application.batchId || null },
    });
    if (!association) throw new ApiError(404, "Startup-Program association not found");

    if (association.approvedFundingAmount) {
      const { remaining } = await computeAssociationRemaining(db, { association });
      if (amount > remaining) {
        throw new ApiError(400, `Disbursement exceeds remaining approved amount. Remaining: ${remaining}, Requested: ${amount}`);
      }
    }

    // Enforce program/batch allocation ceiling: a program must have funds
    // allocated (at batch level or at program level as fallback) and those
    // funds must not already be exhausted by existing disbursements.
    const headroom = await computeAllocationHeadroom(db, {
      programId,
      batchId: application.batchId || null,
    });
    if (headroom.allocated <= 0) {
      throw new ApiError(400, "No funding has been allocated to this program/batch yet. Allocate from a funding source first.");
    }
    if (amount > headroom.remaining) {
      throw new ApiError(400, `Disbursement exceeds allocation headroom. Remaining allocated: ${headroom.remaining}, Requested: ${amount}`);
    }

    let trancheNumber = null;
    if (disbursementType === "TRANCHE") {
      const lastTranche = await db.fundingDisbursement.findFirst({
        where: { applicationId, disbursementType: "TRANCHE" },
        orderBy: { trancheNumber: "desc" },
      });
      trancheNumber = (lastTranche?.trancheNumber || 0) + 1;
    }

    const disbursement = await db.$transaction(async (tx) => {
      const newDisbursement = await tx.fundingDisbursement.create({
        data: {
          programId,
          applicationId,
          startupId: application.startupId,
          tenantId,
          batchId: application.batchId || null,
          amount,
          currency: currency || "INR",
          disbursementType,
          status: "PENDING",
          trancheNumber,
          milestoneName: milestoneName || null,
          reference: reference || null,
          disbursedById: userId,
          notes: notes || null,
        },
      });

      if (documents.length > 0) {
        await tx.fundingDocument.createMany({
          data: documents.map((doc) => ({
            ownerType: "DISBURSEMENT",
            disbursementId: newDisbursement.id,
            fileName: doc.fileName,
            fileUrl: doc.fileUrl,
            fileType: doc.fileType || null,
            description: doc.description || null,
            uploadedById: userId,
          })),
        });
      }

      await logFundingHistory(tx, {
        tenantId,
        action: "DISBURSEMENT_CREATED",
        entityType: "FundingDisbursement",
        entityId: newDisbursement.id,
        performedById: userId,
        newValue: { amount, disbursementType, trancheNumber, applicationId },
        notes: `Disbursement of ${amount} created for application ${applicationId}`,
      });

      return tx.fundingDisbursement.findUnique({
        where: { id: newDisbursement.id },
        include: { documents: true, startup: { select: { id: true, name: true } } },
      });
    });

    return disbursement;
  },

  async getProgramDisbursements({ tenantId, programId }) {
    const program = await db.program.findUnique({ where: { id: programId } });
    if (!program || program.tenantId !== tenantId) throw new ApiError(404, "Program not found");

    return db.fundingDisbursement.findMany({
      where: { programId },
      include: {
        documents: true,
        startup: { select: { id: true, name: true, logoUrl: true } },
        application: { select: { id: true, status: true, requestedFundingAmount: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async updateDisbursementStatus({ tenantId, userId, disbursementId, newStatus, reference, notes }) {
    const disbursement = await db.fundingDisbursement.findUnique({
      where: { id: disbursementId },
    });
    if (!disbursement || disbursement.tenantId !== tenantId) {
      throw new ApiError(404, "Disbursement not found");
    }

    const validTransitions = {
      PENDING: ["APPROVED", "CANCELLED"],
      APPROVED: ["PROCESSING", "CANCELLED"],
      PROCESSING: ["COMPLETED", "FAILED"],
      COMPLETED: ["CANCELLED"],
      FAILED: ["PROCESSING", "CANCELLED"],
    };

    const allowed = validTransitions[disbursement.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new ApiError(400, `Cannot transition from ${disbursement.status} to ${newStatus}. Allowed: ${allowed.join(", ")}`);
    }

    const actionMap = {
      APPROVED: "DISBURSEMENT_APPROVED",
      PROCESSING: "DISBURSEMENT_PROCESSING",
      COMPLETED: "DISBURSEMENT_COMPLETED",
      FAILED: "DISBURSEMENT_FAILED",
      CANCELLED: "DISBURSEMENT_CANCELLED",
    };

    const updated = await db.$transaction(async (tx) => {
      const updateData = { status: newStatus };
      if (reference) updateData.reference = reference;
      if (notes) updateData.notes = notes;
      if (newStatus === "COMPLETED") updateData.disbursedAt = new Date();

      const updatedDisbursement = await tx.fundingDisbursement.update({
        where: { id: disbursementId },
        data: updateData,
      });

      const association = await tx.startupProgramAssociation.findFirst({
        where: {
          startupId: disbursement.startupId,
          programId: disbursement.programId,
          batchId: disbursement.batchId || null,
        },
      });

      if (newStatus === "COMPLETED" && association) {
        await tx.startupProgramAssociation.update({
          where: { id: association.id },
          data: { totalDisbursedAmount: { increment: disbursement.amount } },
        });
      }

      if (disbursement.status === "COMPLETED" && newStatus === "CANCELLED" && association) {
        await tx.startupProgramAssociation.update({
          where: { id: association.id },
          data: { totalDisbursedAmount: { decrement: disbursement.amount } },
        });
      }

      await logFundingHistory(tx, {
        tenantId,
        action: actionMap[newStatus] || "DISBURSEMENT_APPROVED",
        entityType: "FundingDisbursement",
        entityId: disbursementId,
        performedById: userId,
        oldValue: { status: disbursement.status },
        newValue: { status: newStatus, reference },
        notes: notes || `Disbursement status changed to ${newStatus}`,
      });

      return tx.fundingDisbursement.findUnique({
        where: { id: disbursementId },
        include: {
          documents: true,
          startup: { select: { id: true, name: true, logoUrl: true } },
          application: { select: { id: true, status: true, requestedFundingAmount: true } },
        },
      });
    });

    return updated;
  },

  async getDisbursementById({ tenantId, disbursementId }) {
    const disbursement = await db.fundingDisbursement.findUnique({
      where: { id: disbursementId },
      include: {
        documents: true,
        startup: { select: { id: true, name: true, logoUrl: true } },
        application: { select: { id: true, status: true, requestedFundingAmount: true, batchId: true } },
        program: { select: { id: true, title: true } },
        fundingRequest: { select: { id: true, requestedAmount: true, status: true, note: true } },
      },
    });
    if (!disbursement || disbursement.tenantId !== tenantId) {
      throw new ApiError(404, "Disbursement not found");
    }
    return disbursement;
  },

  // =========================================================================
  // PORTFOLIO DASHBOARD
  // =========================================================================

  async getProgramFundingPortfolio({ tenantId, programId }) {
    const program = await db.program.findUnique({ where: { id: programId } });
    if (!program || program.tenantId !== tenantId) throw new ApiError(404, "Program not found");

    const [allocations, disbursements, associations] = await Promise.all([
      db.programFundingAllocation.findMany({
        where: { programId },
        include: { fundingSource: { select: { sourceName: true, sourceType: true } } },
      }),
      db.fundingDisbursement.findMany({
        where: { programId },
        include: {
          startup: { select: { id: true, name: true } },
          documents: true,
        },
      }),
      db.startupProgramAssociation.findMany({
        where: { programId },
        include: { startup: { select: { id: true, name: true } } },
      }),
    ]);

    const totalAllocated = allocations.reduce((sum, a) => sum + a.allocatedAmount, 0);
    const totalDisbursed = disbursements
      .filter((d) => d.status === "COMPLETED")
      .reduce((sum, d) => sum + d.amount, 0);
    const totalPending = disbursements
      .filter((d) => ["PENDING", "APPROVED", "PROCESSING"].includes(d.status))
      .reduce((sum, d) => sum + d.amount, 0);

    const perStartup = associations.map((assoc) => {
      const startupDisbursements = disbursements.filter((d) => d.startupId === assoc.startupId);
      const completed = startupDisbursements.filter((d) => d.status === "COMPLETED").reduce((s, d) => s + d.amount, 0);
      const pending = startupDisbursements.filter((d) => ["PENDING", "APPROVED", "PROCESSING"].includes(d.status)).reduce((s, d) => s + d.amount, 0);

      return {
        startupId: assoc.startupId,
        startupName: assoc.startup.name,
        approvedFundingAmount: assoc.approvedFundingAmount || 0,
        totalDisbursedAmount: assoc.totalDisbursedAmount || 0,
        pendingAmount: pending,
        completedAmount: completed,
        remainingAmount: (assoc.approvedFundingAmount || 0) - (assoc.totalDisbursedAmount || 0),
        disbursementCount: startupDisbursements.length,
      };
    });

    return {
      programId,
      programTitle: program.title,
      totalFundingAmount: program.totalFundingAmount || 0,
      fundingType: program.fundingType,
      fundingCurrency: program.fundingCurrency || "INR",
      totalAllocatedFromSources: totalAllocated,
      totalDisbursed,
      totalPending,
      remainingAllocated: totalAllocated - totalDisbursed,
      allocationSources: allocations.map((a) => ({
        sourceId: a.fundingSourceId,
        sourceName: a.fundingSource.sourceName,
        sourceType: a.fundingSource.sourceType,
        allocatedAmount: a.allocatedAmount,
      })),
      perStartupBreakdown: perStartup,
    };
  },

  // =========================================================================
  // TENANT-WIDE FUNDING OVERVIEW
  // =========================================================================

  async getFundingOverview({ tenantId }) {
    const [sources, allDisbursements] = await Promise.all([
      db.tenantFundingSource.findMany({
        where: { tenantId, isActive: true },
      }),
      db.fundingDisbursement.findMany({
        where: { tenantId },
        select: { amount: true, status: true },
      }),
    ]);

    const totalFundingSources = sources.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalAllocated = sources.reduce((sum, s) => sum + s.allocatedAmount, 0);
    const totalDisbursed = allDisbursements
      .filter((d) => d.status === "COMPLETED")
      .reduce((sum, d) => sum + d.amount, 0);
    const totalPending = allDisbursements
      .filter((d) => ["PENDING", "APPROVED", "PROCESSING"].includes(d.status))
      .reduce((sum, d) => sum + d.amount, 0);

    return {
      totalFundingSources,
      totalAllocated,
      totalUnallocated: totalFundingSources - totalAllocated,
      totalDisbursed,
      totalPending,
      remainingFromAllocated: totalAllocated - totalDisbursed,
      sourceCount: sources.length,
      sourcesByType: sources.reduce((acc, s) => {
        acc[s.sourceType] = (acc[s.sourceType] || 0) + s.totalAmount;
        return acc;
      }, {}),
    };
  },

  // =========================================================================
  // STARTUP FUNDING REQUESTS (INCUBATION REVIEW)
  // =========================================================================

  async getFundingRequests({ tenantId, programId, status, startupId, applicationId, batchId }) {
    const where = { tenantId };
    if (programId) where.programId = programId;
    if (status) where.status = status;
    if (startupId) where.startupId = startupId;
    if (applicationId) where.applicationId = applicationId;
    if (batchId) where.batchId = batchId;

    return db.startupFundingRequest.findMany({
      where,
      include: {
        startup: { select: { id: true, name: true, logoUrl: true } },
        program: { select: { id: true, title: true } },
        application: { select: { id: true, status: true, requestedFundingAmount: true } },
        disbursement: { select: { id: true, status: true, amount: true, disbursedAt: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getFundingRequestById({ tenantId, requestId }) {
    const request = await db.startupFundingRequest.findUnique({
      where: { id: requestId },
      include: {
        startup: { select: { id: true, name: true, logoUrl: true } },
        program: { select: { id: true, title: true } },
        application: { select: { id: true, status: true, requestedFundingAmount: true, batchId: true } },
        disbursement: { include: { documents: true } },
      },
    });
    if (!request || request.tenantId !== tenantId) {
      throw new ApiError(404, "Funding request not found");
    }
    return request;
  },

  async getFundingHistory({ tenantId, entityId, action, limit = 100 }) {
    const where = { tenantId };
    if (entityId) where.entityId = entityId;
    if (action) where.action = action;
    return db.fundingHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(Number(limit) || 100, 500),
    });
  },

  async approveFundingRequest({ tenantId, userId, requestId, approvedAmount, disbursementType, currency, reference, notes }) {
    const request = await db.startupFundingRequest.findUnique({
      where: { id: requestId },
      include: { application: { include: { program: true,startup: true, } } },
    });
    if (!request || request.tenantId !== tenantId) {
      throw new ApiError(404, "Funding request not found");
    }
    if (request.status !== "PENDING") {
      throw new ApiError(400, `Cannot approve a request with status ${request.status}. Only PENDING requests can be approved.`);
    }

    const amount = approvedAmount || request.requestedAmount;

    const association = await db.startupProgramAssociation.findFirst({
      where: {
        startupId: request.startupId,
        programId: request.programId,
        batchId: request.batchId || null,
      },
    });
    if (!association) throw new ApiError(404, "Startup-Program association not found");

    const { remaining } = await computeAssociationRemaining(db, { association, excludeRequestId: requestId });
    if (amount > remaining) {
      throw new ApiError(400, `Approved amount exceeds remaining balance. Remaining: ${remaining}, Requested: ${amount}`);
    }

    // Enforce program/batch allocation ceiling.
    const headroom = await computeAllocationHeadroom(db, {
      programId: request.programId,
      batchId: request.batchId || null,
    });
    if (headroom.allocated <= 0) {
      throw new ApiError(400, "No funding has been allocated to this program/batch yet. Allocate from a funding source first.");
    }
    if (amount > headroom.remaining) {
      throw new ApiError(400, `Approved amount exceeds allocation headroom. Remaining allocated: ${headroom.remaining}, Requested: ${amount}`);
    }

    // Auto-tranche numbering for TRANCHE type
    let trancheNumber = null;
    const resolvedType = disbursementType || "LUMP_SUM";
    if (resolvedType === "TRANCHE") {
      const lastTranche = await db.fundingDisbursement.findFirst({
        where: { applicationId: request.applicationId, disbursementType: "TRANCHE" },
        orderBy: { trancheNumber: "desc" },
      });
      trancheNumber = (lastTranche?.trancheNumber || 0) + 1;
    }

    const result = await db.$transaction(async (tx) => {
      // Create disbursement
      const disbursement = await tx.fundingDisbursement.create({
        data: {
          programId: request.programId,
          applicationId: request.applicationId,
          startupId: request.startupId,
          tenantId,
          batchId: request.batchId || null,
          amount,
          currency: currency || request.currency || "INR",
          disbursementType: resolvedType,
          status: "PENDING",
          trancheNumber,
          reference: reference || null,
          disbursedById: userId,
          notes: notes || `Auto-created from funding request`,
        },
      });

      // Update request
      const updatedRequest = await tx.startupFundingRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          reviewedById: userId,
          reviewNote: notes || null,
          approvedAmount: amount,
          disbursementId: disbursement.id,
        },
      });

      // Audit trail
      await logFundingHistory(tx, {
        tenantId,
        action: "REQUEST_APPROVED",
        entityType: "StartupFundingRequest",
        entityId: requestId,
        performedById: userId,
        oldValue: { requestedAmount: request.requestedAmount },
        newValue: { approvedAmount: amount, disbursementId: disbursement.id },
        notes: `Funding request approved with amount ${amount}. Disbursement created.`,
      });

      await logFundingHistory(tx, {
        tenantId,
        action: "DISBURSEMENT_CREATED",
        entityType: "FundingDisbursement",
        entityId: disbursement.id,
        performedById: userId,
        newValue: { amount, disbursementType: resolvedType, trancheNumber, applicationId: request.applicationId, fromRequestId: requestId },
        notes: `Disbursement auto-created from funding request ${requestId}`,
      });

      return {
        ...updatedRequest,
        disbursement,
      };
    });

    const startupMembers =
      await db.startupMember.findMany({
        where: {
          startupId: request.startupId,
          isActive: true,
        },
        select: {
          userId: true,
        },
      });

      const recipientIds = [
        ...new Set(
          startupMembers.map((m) => m.userId)
        ),
      ];

      const actor =
        await db.incubationUser.findUnique({
          where: {
            id: userId,
          },
          select: {
            userId: true,
            name: true,
            imageUrl: true,
          },
        });

      if (recipientIds.length > 0) {
        await NotificationService.sendBulk({
          recipientIds,
          type: "FUNDING_REQUEST_STATUS",
          category: "INCUBATION",
          priority: "HIGH",
          title: "Funding Request Approved",
          message:
            `Your funding request for ${amount} ${currency || request.currency || "INR"} has been approved.`,
          entityType: "StartupFundingRequest",
          entityId: requestId,
          actionUrl:
            `/programs/associated/${association.id}`,
          actorId:
            actor?.userId || null,
          actorName:
            actor?.name || null,
          actorAvatar:
            actor?.imageUrl || null,
          data: {
            fundingRequestId: requestId,
            disbursementId:
              result.disbursement.id,
            approvedAmount: amount,
            currency:
              currency || request.currency || "INR",
            status: "APPROVED",
          },
        }).catch(() => {});
      }
    return result;
  },

  async rejectFundingRequest({ tenantId, userId, requestId, reviewNote }) {
    const request = await db.startupFundingRequest.findUnique({
      where: { id: requestId },
    });
    if (!request || request.tenantId !== tenantId) {
      throw new ApiError(404, "Funding request not found");
    }
    if (request.status !== "PENDING") {
      throw new ApiError(400, `Cannot reject a request with status ${request.status}. Only PENDING requests can be rejected.`);
    }

    const result = await db.$transaction(async (tx) => {
      const updatedRequest = await tx.startupFundingRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          reviewedById: userId,
          reviewNote: reviewNote || null,
        },
      });

      await logFundingHistory(tx, {
        tenantId,
        action: "REQUEST_REJECTED",
        entityType: "StartupFundingRequest",
        entityId: requestId,
        performedById: userId,
        newValue: { reviewNote },
        notes: `Funding request rejected`,
      });

      return updatedRequest;
    });
    const startupMembers =
  await db.startupMember.findMany({
    where: {
      startupId: request.startupId,
      isActive: true,
    },

    select: {
      userId: true,
    },
  });

const recipientIds = [
  ...new Set(
    startupMembers.map(
      (m) => m.userId
    )
  ),
];

const actor =
  await db.incubationUser.findUnique({
    where: {
      id: userId,
    },

    select: {
      userId: true,
      name: true,
      imageUrl: true,
    },
  });

if (recipientIds.length > 0) {

  await NotificationService.sendBulk({
    recipientIds,
    type:
      "FUNDING_REQUEST_STATUS",
    category:
      "INCUBATION",
    priority:
      "HIGH",
    title:
      "Funding Request Rejected",
    message:
      `Your funding request has been rejected.`,
    entityType:
      "StartupFundingRequest",
    entityId:
      requestId,
    actionUrl:
      `/programs/associated`,
    actorId:
      actor?.userId || null,
    actorName:
      actor?.name || null,
    actorAvatar:
      actor?.imageUrl || null,
    data: {
      fundingRequestId:
        requestId,
      status:
        "REJECTED",
      reviewNote:
        reviewNote || null,
    },
  }).catch(() => {});
}s
    return result;
  },
};

