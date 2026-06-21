import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import {
  computeAssociationRemaining,
  computeAllocationHeadroom,
} from "./funding.service.js";

async function verifyStartupTenant(tenantId, startupId) {
  const association = await db.startupTenantAssociation.findFirst({
    where: { tenantId, startupId, isActive: true },
  });
  if (!association) {
    throw new ApiError(404, "Startup not associated with this tenant");
  }
  return association;
}

export const startupDetailService = {
  // =========================================================================
  // FUNDING
  // =========================================================================

  async getStartupFunding({ tenantId, startupId }) {
    await verifyStartupTenant(tenantId, startupId);

    const [programAssociations, disbursements, fundingRequests, fundingRounds] =
      await Promise.all([
        db.startupProgramAssociation.findMany({
          where: { startupId, tenantId },
          include: {
            program: { select: { id: true, title: true } },
            batch: { select: { id: true, batchName: true } },
          },
        }),
        db.fundingDisbursement.findMany({
          where: { startupId, tenantId },
          include: {
            documents: true,
            program: { select: { id: true, title: true } },
            batch: { select: { id: true, batchName: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        db.startupFundingRequest.findMany({
          where: { startupId, tenantId },
          include: {
            program: { select: { id: true, title: true } },
            batch: { select: { id: true, batchName: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        db.fundingRound.findMany({
          where: { startupId },
          orderBy: { date: "desc" },
        }),
      ]);

    const fundingSummary = programAssociations.map((assoc) => ({
      programId: assoc.programId,
      programTitle: assoc.program.title,
      batchId: assoc.batchId,
      batchName: assoc.batch?.batchName || null,
      approvedFundingAmount: assoc.approvedFundingAmount || 0,
      totalDisbursedAmount: assoc.totalDisbursedAmount || 0,
      status: assoc.status,
    }));

    const totalApproved = fundingSummary.reduce(
      (sum, s) => sum + s.approvedFundingAmount,
      0
    );
    const totalDisbursed = fundingSummary.reduce(
      (sum, s) => sum + s.totalDisbursedAmount,
      0
    );

    return {
      summary: {
        totalApproved,
        totalDisbursed,
        pendingRequestsCount: fundingRequests.filter(
          (r) => r.status === "PENDING"
        ).length,
      },
      programFunding: fundingSummary,
      disbursements,
      fundingRequests,
      fundingRounds,
    };
  },

  async disburseToStartup({
    tenantId,
    userId,
    startupId,
    applicationId,
    programId,
    batchId,
    amount,
    currency,
    disbursementType,
    milestoneName,
    reference,
    notes,
    documents = [],
  }) {
    await verifyStartupTenant(tenantId, startupId);

    const application = await db.startupApplication.findUnique({
      where: { id: applicationId },
      include: { program: true },
    });
    if (
      !application ||
      application.programId !== programId ||
      application.program.tenantId !== tenantId ||
      application.startupId !== startupId
    ) {
      throw new ApiError(404, "Application not found for this startup/program");
    }
    if (application.status !== "ONBOARDED") {
      throw new ApiError(
        400,
        "Startup must be onboarded before funding can be disbursed"
      );
    }

    const association = await db.startupProgramAssociation.findFirst({
      where: {
        startupId,
        programId,
        batchId: batchId || application.batchId || null,
      },
    });
    if (!association) {
      throw new ApiError(404, "Startup-Program association not found");
    }

    if (association.approvedFundingAmount) {
      const { remaining } = await computeAssociationRemaining(db, {
        association,
      });
      if (amount > remaining) {
        throw new ApiError(
          400,
          `Disbursement exceeds remaining approved amount. Remaining: ${remaining}, Requested: ${amount}`
        );
      }
    }

    const headroom = await computeAllocationHeadroom(db, {
      programId,
      batchId: batchId || application.batchId || null,
    });
    if (headroom.allocated <= 0) {
      throw new ApiError(
        400,
        "No funding has been allocated to this program/batch yet"
      );
    }
    if (amount > headroom.remaining) {
      throw new ApiError(
        400,
        `Disbursement exceeds allocation headroom. Remaining: ${headroom.remaining}, Requested: ${amount}`
      );
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
          startupId,
          tenantId,
          batchId: batchId || application.batchId || null,
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

      await tx.fundingHistory.create({
        data: {
          tenantId,
          action: "DISBURSEMENT_CREATED",
          entityType: "FundingDisbursement",
          entityId: newDisbursement.id,
          performedById: userId,
          newValue: { amount, disbursementType, trancheNumber, applicationId },
          notes: `Disbursement of ${amount} created for startup ${startupId}`,
        },
      });

      return tx.fundingDisbursement.findUnique({
        where: { id: newDisbursement.id },
        include: {
          documents: true,
          startup: { select: { id: true, name: true } },
          program: { select: { id: true, title: true } },
        },
      });
    });

    return disbursement;
  },

  // =========================================================================
  // REGISTRATION DETAIL
  // =========================================================================

  async getRegistrationDetail({ tenantId, startupId, applicationId }) {
    await verifyStartupTenant(tenantId, startupId);

    const application = await db.startupApplication.findUnique({
      where: { id: applicationId },
      include: {
        program: { select: { id: true, title: true, tenantId: true } },
        schemeAnswers: {
          include: {
            question: {
              select: {
                id: true,
                questionText: true,
                questionType: true,
                options: true,
              },
            },
          },
        },
        documents: true,
        history: { orderBy: { changedAt: "desc" } },
      },
    });

    if (!application || application.startupId !== startupId) {
      throw new ApiError(404, "Application not found for this startup");
    }
    if (application.program.tenantId !== tenantId) {
      throw new ApiError(403, "Application does not belong to this tenant");
    }

    return {
      applicationId: application.id,
      programId: application.programId,
      programTitle: application.program.title,
      status: application.status,
      submittedAt: application.submittedAt,
      reviewedAt: application.reviewedAt,
      feedback: application.feedback,
      score: application.score,
      currentStage: application.currentStage,
      requestedFundingAmount: application.requestedFundingAmount,
      fundingPurpose: application.fundingPurpose,
      meta: application.meta,
      answers: application.schemeAnswers.map((a) => ({
        questionId: a.questionId,
        questionText: a.question.questionText,
        questionType: a.question.questionType,
        questionOptions: a.question.options,
        answerText: a.answerText,
        answerFileUrl: a.answerFileUrl,
      })),
      documents: application.documents,
      statusHistory: application.history,
    };
  },

  // =========================================================================
  // EVALUATIONS
  // =========================================================================

  async getStartupEvaluations({ tenantId, startupId, applicationId }) {
    await verifyStartupTenant(tenantId, startupId);

    const where = { application: { startupId } };
    if (applicationId) where.applicationId = applicationId;

    const evaluations = await db.evaluation.findMany({
      where,
      include: {
        evaluator: {
          select: { id: true, name: true },
        },
        application: {
          select: {
            id: true,
            status: true,
            program: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { evaluatedAt: "desc" },
    });

    const grouped = {};
    for (const evaluation of evaluations) {
      const appId = evaluation.applicationId;
      if (!grouped[appId]) {
        grouped[appId] = {
          applicationId: appId,
          programId: evaluation.application.program.id,
          programTitle: evaluation.application.program.title,
          applicationStatus: evaluation.application.status,
          evaluations: [],
          totalScoreSum: 0,
          evaluationCount: 0,
        };
      }
      grouped[appId].evaluations.push({
        id: evaluation.id,
        evaluatorId: evaluation.evaluator.id,
        evaluatorName: evaluation.evaluator.name || "",
        totalScore: evaluation.totalScore,
        remarks: evaluation.remarks,
        status: evaluation.status,
        evaluatedAt: evaluation.evaluatedAt,
      });
      if (evaluation.totalScore != null) {
        grouped[appId].totalScoreSum += evaluation.totalScore;
        grouped[appId].evaluationCount++;
      }
    }

    const results = Object.values(grouped).map((group) => ({
      applicationId: group.applicationId,
      programId: group.programId,
      programTitle: group.programTitle,
      applicationStatus: group.applicationStatus,
      averageScore:
        group.evaluationCount > 0
          ? Math.round((group.totalScoreSum / group.evaluationCount) * 100) /
            100
          : null,
      evaluations: group.evaluations,
    }));

    return results;
  },

  // =========================================================================
  // OFFICE ALLOCATIONS
  // =========================================================================

  async getStartupOfficeAllocations({ tenantId, startupId }) {
    await verifyStartupTenant(tenantId, startupId);

    const [allocations, bookings, payments] = await Promise.all([
      db.officeAllocation.findMany({
        where: { startupId, tenantId },
        include: {
          office: {
            select: {
              id: true,
              name: true,
              location: true,
              size: true,
              officeType: true,
              monthlyRate: true,
              amenities: true,
            },
          },
          allocatedBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.officeBooking.findMany({
        where: { startupId },
        include: {
          office: {
            select: { id: true, name: true, location: true, officeType: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.officePayment.findMany({
        where: { startupId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      allocations: allocations.map((a) => ({
        id: a.id,
        office: a.office,
        allocatedBy: a.allocatedBy?.name || null,
        startDate: a.startDate,
        endDate: a.endDate,
        status: a.status,
        isActive: a.isActive,
        createdAt: a.createdAt,
      })),
      bookings: bookings.map((b) => ({
        id: b.id,
        office: b.office,
        startDate: b.startDate,
        endDate: b.endDate,
        pricingType: b.pricingType,
        totalAmount: b.totalAmount,
        currency: b.currency,
        status: b.status,
        isPaid: b.isPaid,
        createdAt: b.createdAt,
      })),
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        paymentType: p.paymentType,
        status: p.status,
        paidAt: p.paidAt,
        invoiceNumber: p.invoiceNumber,
        invoiceUrl: p.invoiceUrl,
        createdAt: p.createdAt,
      })),
    };
  },

  // =========================================================================
  // FACILITY BOOKINGS
  // =========================================================================

  async getStartupFacilityBookings({
    tenantId,
    startupId,
    page = 1,
    limit = 20,
    fromDate,
    toDate,
  }) {
    await verifyStartupTenant(tenantId, startupId);

    const where = { startupId, tenantId };
    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date.gte = new Date(fromDate);
      if (toDate) where.date.lte = new Date(toDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [bookings, total] = await Promise.all([
      db.facilityBooking.findMany({
        where,
        include: {
          facility: {
            select: {
              id: true,
              name: true,
              type: true,
              category: true,
              location: true,
            },
          },
        },
        orderBy: { date: "desc" },
        skip,
        take,
      }),
      db.facilityBooking.count({ where }),
    ]);

    return {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / take),
      data: bookings.map((b) => ({
        id: b.id,
        facility: b.facility,
        date: b.date,
        startTime: b.startTime,
        endTime: b.endTime,
        unitsBooked: b.unitsBooked,
        status: b.status,
        reason: b.reason,
        comment: b.comment,
        createdAt: b.createdAt,
      })),
    };
  },

  // =========================================================================
  // MENTORSHIPS
  // =========================================================================

  async getStartupMentorships({ tenantId, startupId }) {
    await verifyStartupTenant(tenantId, startupId);

    const mentorships = await db.mentorship.findMany({
      where: { startupId },
      include: {
        mentor: {
          select: {
            id: true,
            headline: true,
            expertise: true,
            industries: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePhoto: true,
              },
            },
          },
        },
        milestones: {
          orderBy: { displayOrder: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const sessions = await db.mentorSession.findMany({
      where: { startupId },
      select: {
        mentorId: true,
        startupShare: true,
        incubatorShare: true,
        price: true,
        duration: true,
        status: true,
      },
    });

    const sessionsByMentor = {};
    for (const s of sessions) {
      if (!sessionsByMentor[s.mentorId]) {
        sessionsByMentor[s.mentorId] = {
          total: 0,
          completed: 0,
          totalHours: 0,
          totalSpending: 0,
        };
      }
      sessionsByMentor[s.mentorId].total++;
      if (s.status === "COMPLETED") {
        sessionsByMentor[s.mentorId].completed++;
        sessionsByMentor[s.mentorId].totalHours += (s.duration || 0) / 60;
        sessionsByMentor[s.mentorId].totalSpending +=
          s.startupShare || s.price || 0;
      }
    }

    return mentorships.map((m) => ({
      id: m.id,
      mentor: {
        id: m.mentor.id,
        name: `${m.mentor.user.firstName || ""} ${m.mentor.user.lastName || ""}`.trim(),
        profilePhoto: m.mentor.user.profilePhoto,
        headline: m.mentor.headline,
        expertise: m.mentor.expertise,
        industries: m.mentor.industries,
      },
      engagementType: m.engagementType,
      status: m.status,
      startDate: m.startDate,
      endDate: m.endDate,
      frequency: m.frequency,
      objectives: m.objectives,
      totalSessions: m.totalSessions,
      milestones: m.milestones.map((ms) => ({
        id: ms.id,
        title: ms.title,
        description: ms.description,
        targetDate: ms.targetDate,
        status: ms.status,
        progress: ms.progress,
      })),
      sessionStats: sessionsByMentor[m.mentorProfileId] || {
        total: 0,
        completed: 0,
        totalHours: 0,
        totalSpending: 0,
      },
    }));
  },

  // =========================================================================
  // ASSOCIATIONS (cross-incubator view)
  // =========================================================================

  async getStartupAssociations({ tenantId, startupId }) {
    await verifyStartupTenant(tenantId, startupId);

    const [tenantAssociations, programAssociations, applications] =
      await Promise.all([
        db.startupTenantAssociation.findMany({
          where: { startupId },
          include: {
            tenant: {
              select: {
                id: true,
                organizationName: true,
                tenantKey: true,
                tenantLogo: true,
              },
            },
          },
          orderBy: { onboardedAt: "desc" },
        }),
        db.startupProgramAssociation.findMany({
          where: { startupId },
          include: {
            program: {
              select: {
                id: true,
                title: true,
                schemeTypeRef: { select: { id: true, name: true } },
                governingBody: { select: { id: true, name: true } },
              },
            },
            tenant: {
              select: { id: true, organizationName: true },
            },
            batch: { select: { id: true, batchName: true } },
          },
          orderBy: { onboardedAt: "desc" },
        }),
        db.startupApplication.findMany({
          where: { startupId },
          select: {
            id: true,
            programId: true,
            status: true,
            submittedAt: true,
            score: true,
          },
        }),
      ]);

    const applicationsByProgram = {};
    for (const app of applications) {
      if (!applicationsByProgram[app.programId]) {
        applicationsByProgram[app.programId] = [];
      }
      applicationsByProgram[app.programId].push(app);
    }

    return {
      tenantAssociations: tenantAssociations.map((t) => ({
        id: t.id,
        tenant: t.tenant,
        status: t.status,
        onboardedAt: t.onboardedAt,
        offboardedAt: t.offboardedAt,
        isActive: t.isActive,
      })),
      programAssociations: programAssociations.map((p) => ({
        id: p.id,
        program: p.program,
        tenant: p.tenant,
        batch: p.batch,
        status: p.status,
        approvedFundingAmount: p.approvedFundingAmount,
        totalDisbursedAmount: p.totalDisbursedAmount,
        onboardedAt: p.onboardedAt,
        offboardedAt: p.offboardedAt,
        isActive: p.isActive,
        applications: applicationsByProgram[p.programId] || [],
      })),
      counts: {
        totalIncubators: tenantAssociations.length,
        activeIncubators: tenantAssociations.filter((t) => t.isActive).length,
        totalPrograms: programAssociations.length,
        activePrograms: programAssociations.filter((p) => p.isActive).length,
      },
    };
  },

  // =========================================================================
  // OVERVIEW / DASHBOARD SUMMARY
  // =========================================================================

  async getStartupOverview({ tenantId, startupId }) {
    await verifyStartupTenant(tenantId, startupId);

    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    const [
      startup,
      tenantAssocCount,
      programAssocCount,
      fundingSummary,
      evaluations,
      activeAllocation,
      upcomingBookingsCount,
      activeMentorships,
      sessionCount,
      members,
      milestonesCount,
      pendingDataCollections,
      tasks,
    ] = await Promise.all([
      db.startup.findUnique({
        where: { id: startupId },
        select: {
          id: true,
          name: true,
          logoUrl: true,
          sector: true,
          stage: true,
          status: true,
        },
      }),
      db.startupTenantAssociation.count({ where: { startupId } }),
      db.startupProgramAssociation.count({ where: { startupId } }),
      db.startupProgramAssociation.aggregate({
        where: { startupId, tenantId },
        _sum: {
          approvedFundingAmount: true,
          totalDisbursedAmount: true,
        },
      }),
      db.evaluation.findMany({
        where: { application: { startupId } },
        select: { totalScore: true },
      }),
      db.officeAllocation.findFirst({
        where: { startupId, tenantId, isActive: true },
        include: {
          office: { select: { id: true, name: true, location: true } },
        },
      }),
      db.facilityBooking.count({
        where: {
          startupId,
          tenantId,
          date: { gte: now, lte: thirtyDaysFromNow },
          status: { in: ["PENDING", "APPROVED"] },
        },
      }),
      db.mentorship.count({
        where: { startupId, status: "ACTIVE" },
      }),
      db.mentorSession.count({
        where: { startupId, status: "COMPLETED" },
      }),
      db.startupMember.findMany({
        where: { startupId, isActive: true },
        select: {
          id: true,
          role: true,
          title: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
            },
          },
        },
      }),
      db.startupMilestone.count({ where: { startupId } }),
      db.dataCollectionAssignment.count({
        where: { startupId, status: "PENDING" },
      }),
      db.task.findMany({
        where: { teamType: "STARTUP", teamId: startupId },
        select: { status: true },
      }),
    ]);

    const scoredEvaluations = evaluations.filter(
      (e) => e.totalScore != null
    );
    const avgScore =
      scoredEvaluations.length > 0
        ? Math.round(
            (scoredEvaluations.reduce((s, e) => s + e.totalScore, 0) /
              scoredEvaluations.length) *
              100
          ) / 100
        : null;

    const [pendingFundingRequests, recentMilestones] = await Promise.all([
      db.startupFundingRequest.count({
        where: { startupId, tenantId, status: "PENDING" },
      }),
      db.startupMilestone.findMany({
        where: { startupId },
        orderBy: { date: "desc" },
        take: 3,
      }),
    ]);

    const taskStats = {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === "PENDING").length,
      inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
      completed: tasks.filter((t) => t.status === "COMPLETED").length,
      blocked: tasks.filter((t) => t.status === "BLOCKED").length,
    };

    return {
      startup,
      associations: {
        totalIncubators: tenantAssocCount,
        totalPrograms: programAssocCount,
      },
      funding: {
        totalApproved: fundingSummary._sum.approvedFundingAmount || 0,
        totalDisbursed: fundingSummary._sum.totalDisbursedAmount || 0,
        pendingRequestsCount: pendingFundingRequests,
      },
      evaluations: {
        totalEvaluations: evaluations.length,
        averageScore: avgScore,
      },
      office: activeAllocation
        ? {
            allocated: true,
            officeName: activeAllocation.office.name,
            officeLocation: activeAllocation.office.location,
          }
        : { allocated: false },
      facilityBookings: {
        upcomingCount: upcomingBookingsCount,
      },
      mentorship: {
        activeMentorships,
        totalSessionsCompleted: sessionCount,
      },
      dataCollection: {
        pendingAssignments: pendingDataCollections,
      },
      tasks: taskStats,
      team: {
        membersCount: members.length,
        members,
      },
      milestones: {
        total: milestonesCount,
        recent: recentMilestones,
      },
    };
  },
};
