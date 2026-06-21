import { buildQueryOptions } from "../../utils/queryHelper.js";
import db from "../../db/db.js";
import { ApiError } from "../../utils/ApiError.js";
import { computeAssociationRemaining } from "../incubation/portal/funding.service.js";
import { NotificationService } from "../common/notification.service.js";

async function verifyUserStartupAccess(userId, startupId) {
  const startupMember = await db.startupMember.findFirst({
    where: {
      userId,
      startupId,
      isActive: true,
    },
    include: { startup: true },
  });

  if (!startupMember) {
    throw new ApiError(403, "You don't have access to this startup");
  }

  return startupMember;
}

function normalizeResponseFiles({ files, fileUrl }) {
  if (Array.isArray(files) && files.length) {
    return files
      .filter((f) => f && f.fileUrl)
      .map((f) => ({
        fileName: f.fileName || f.fileUrl.split("/").pop() || "file",
        fileUrl: f.fileUrl,
        fileType: f.fileType || null,
        sizeBytes: typeof f.sizeBytes === "number" ? f.sizeBytes : null,
      }));
  }
  if (fileUrl) {
    return [
      {
        fileName: fileUrl.split("/").pop() || "file",
        fileUrl,
        fileType: null,
        sizeBytes: null,
      },
    ];
  }
  return [];
}

async function submitDocumentResponse({
  userId,
  documentRequestId,
  files,
  fileUrl,
  comment,
  startupId,
  mode,
}) {
  await verifyUserStartupAccess(userId, startupId);

  const normalizedFiles = normalizeResponseFiles({ files, fileUrl });
  if (!normalizedFiles.length) {
    throw new ApiError(400, "At least one file is required");
  }

  const docReq = await db.documentRequest.findUnique({
    where: { id: documentRequestId },
    include: { application: { select: { id: true, startupId: true, status: true } } },
  });
  if (!docReq) throw new ApiError(404, "Document request not found");
  if (docReq.application.startupId !== startupId) {
    throw new ApiError(403, "Unauthorized to respond to this document request");
  }

  const allowedStatuses = mode === "RESUBMIT" ? ["REOPENED"] : ["PENDING"];
  if (!allowedStatuses.includes(docReq.status)) {
    throw new ApiError(
      400,
      mode === "RESUBMIT"
        ? "Document request is not open for resubmission"
        : "Document request is no longer open for response",
    );
  }

  return db.$transaction(async (tx) => {
    const fresh = await tx.documentRequest.findUnique({
      where: { id: documentRequestId },
      select: { status: true, applicationId: true },
    });
    if (!fresh || !allowedStatuses.includes(fresh.status)) {
      throw new ApiError(409, "Document request state changed, please retry");
    }

    const response = await tx.documentResponse.create({
      data: {
        documentRequestId,
        respondedById: userId,
        fileUrl: normalizedFiles[0].fileUrl,
        comment: comment || null,
        status: "SUBMITTED",
        files: { create: normalizedFiles },
      },
      include: { files: true },
    });

    await tx.documentRequest.update({
      where: { id: documentRequestId },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });

    const openRequests = await tx.documentRequest.count({
      where: {
        applicationId: fresh.applicationId,
        status: { in: ["PENDING", "REOPENED"] },
      },
    });

    if (openRequests === 0 && docReq.application.status !== "DOCS_RECEIVED") {
      await tx.startupApplication.update({
        where: { id: fresh.applicationId },
        data: { status: "DOCS_RECEIVED" },
      });
      await tx.applicationHistory.create({
        data: {
          applicationId: fresh.applicationId,
          changedById: userId,
          oldStatus: docReq.application.status,
          newStatus: "DOCS_RECEIVED",
          comment:
            comment ??
            (mode === "RESUBMIT"
              ? "Startup resubmitted requested documents"
              : "Startup submitted all requested documents"),
        },
      });
    }

    return response;
  });
}

async function loadAssociationOr404({ startupId, associationId }) {
  const association = await db.startupProgramAssociation.findFirst({
    where: { id: associationId, startupId },
    include: {
      program: {
        select: {
          id: true,
          title: true,
          description: true,
          programLogo: true,
          coverImage: true,
          schemeTypeRef: { select: { id: true, name: true } },
          governingBody: { select: { id: true, name: true } },
          tenant: {
            select: { id: true, organizationName: true, tenantLogo: true },
          },
          totalFundingAmount: true,
          fundingType: true,
          fundingCurrency: true,
          isFundingAvailable: true,
        },
      },
      batch: {
        select: { id: true, batchName: true, batchCode: true, status: true },
      },
    },
  });
  if (!association) throw new ApiError(404, "Association not found");
  return association;
}

async function resolveAssociationApplication(association) {
  return db.startupApplication.findFirst({
    where: {
      startupId: association.startupId,
      programId: association.programId,
      batchId: association.batchId || null,
    },
    select: { id: true, status: true, submittedAt: true, tenantId: true },
  });
}

export const programService = {
  getAllTenants: async () => {
    const tenants = await db.tenant.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        organizationName: true,
        tenantLogo: true,
        domain: true,
        status: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!tenants.length) throw new ApiError(404, "No tenants found");

    return tenants;
  },

  getPrograms: async ({
    selectedTenant,
    page,
    limit,
    search,
    sortBy,
    order,
    userId,
    startupId,
  }) => {
    await verifyUserStartupAccess(userId, startupId);

    const queryOptions = buildQueryOptions({
      page,
      limit,
      search,
      searchFields: ["title", "description"],
      defaultFields: ["title"],
      sortBy,
      order,
    });

    const where = {
      ...(selectedTenant ? { tenantId: selectedTenant } : {}),
      batches: {
        some: {
          status: "OPEN",
          isActive: true,
        },
      },
      startupApplications: {
        none: {
          startupId,
        },
      },    
      ...queryOptions.where,
    };

    const [programs, total] = await Promise.all([
      db.program.findMany({
        where,
        skip: queryOptions.skip,
        take: queryOptions.take,
        orderBy: queryOptions.orderBy,
        include: {
          tenant: {
            select: {
              id: true,
              organizationName: true,
              tenantLogo: true,
            },
          },
          schemeTypeRef: { select: { id: true, name: true } },
          governingBody: { select: { id: true, name: true } },
          batches: {
            where: { status: { in: ["OPEN", "UPCOMING"] }, isActive: true },
            select: {
              id: true,
              batchName: true,
              batchCode: true,
              status: true,
              applicationStartDate: true,
              applicationEndDate: true,
              maxSlots: true,
            },
            orderBy: { createdAt: "desc" },
          },
          startupApplications: {
            where: { startupId },
            select: { id: true, status: true, batchId: true },
          },
        },
      }),
      db.program.count({ where }),
    ]);

    const enrichedPrograms = await Promise.all(
      programs.map(async (program) => {
        const openBatch =
          (program.batches || []).find((b) => b.status === "OPEN") || null;
        const hasOpenBatch = !!openBatch;
        const applicationDeadline = openBatch?.applicationEndDate ?? null;

        const currentBatchApplication = openBatch
          ? program.startupApplications?.find(
              (a) => a.batchId === openBatch.id,
            ) || null
          : null;
        const anyApplication = program.startupApplications?.[0] || null;

        const application = currentBatchApplication || anyApplication;

        let pendingChangeRequests = false;
        let pendingDocumentRequests = false;

        if (application) {
          const [changeCount, documentCount] = await Promise.all([
            db.changeRequest.count({
              where: {
                applicationId: application.id,
                status: "PENDING",
                visibleToAll: true,
              },
            }),
            db.documentRequest.count({
              where: {
                applicationId: application.id,
                status: "PENDING",
                visibleToAll: true,
              },
            }),
          ]);

          pendingChangeRequests = changeCount > 0;
          pendingDocumentRequests = documentCount > 0;
        }

        return {
          id: program.id,
          title: program.title,
          description: program.description,
          coverImage: program.coverImage,
          programLogo: program.programLogo,
          schemeTypeRef: program.schemeTypeRef,
          governingBody: program.governingBody,
          createdAt: program.createdAt,
          tenant: program.tenant,
          batches: program.batches || [],
          hasOpenBatch,
          applicationDeadline,
          hasAppliedToCurrentBatch: !!currentBatchApplication,
          hasApplied: !!application,
          applicationStatus: application?.status ?? null,
          applicationId: application?.id ?? null,
          applicationBatchId: application?.batchId ?? null,
          pendingChangeRequests,
          pendingDocumentRequests,
        };
      }),
    );

    return {
      data: enrichedPrograms,
      pagination: {
        total,
        page: Number(page) || 1,
        limit: Number(limit) || 10,
        totalPages: Math.ceil(total / (Number(limit) || 10)),
      },
    };
  },

  getProgramById: async ({ programId, userId, startupId }) => {
    await verifyUserStartupAccess(userId, startupId);

    const program = await db.program.findUnique({
      where: { id: programId },
      include: {
        tenant: {
          select: {
            id: true,
            organizationName: true,
            tenantLogo: true,
            domain: true,
            page: {
              select: {
                id: true,
                name: true,
                slug: true,
                logo: true,
                coverImage: true,
                tagline: true,
                sector: true,
                headquarters: true,
                website: true,
                linkedin: true,
                twitter: true,
              },
            },
            profile: {
              select: {
                incubationType: true,
                affiliationType: true,
                city: true,
                state: true,
                country: true,
                isGovernmentRecognized: true,
                isVerified: true,
                servicesOffered: true,
                amenities: true,
              },
            },
          },
        },
        schemeTypeRef: { select: { id: true, name: true } },
        governingBody: { select: { id: true, name: true } },
        programManagers: {
          select: {
            id: true,
            manager: {
              select: {
                id: true,
                name: true,
                email: true,
                imageUrl: true,
                user: {
                  select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    profilePhoto: true,
                  },
                },
              },
            },
          },
        },
        programSchemeQuestions: {
          include: {
            schemeQuestion: {
              select: {
                id: true,
                questionText: true,
                questionType: true,
                isRequired: true,
                options: true,
              },
            },
          },
        },
        batches: {
          where: { status: { in: ["OPEN", "UPCOMING"] }, isActive: true },
          select: {
            id: true,
            batchName: true,
            batchCode: true,
            description: true,
            status: true,
            applicationStartDate: true,
            applicationEndDate: true,
            maxSlots: true,
            totalFundingAmount: true,
            fundingType: true,
            fundingCurrency: true,
            isFundingAvailable: true,
          },
          orderBy: { createdAt: "desc" },
        },
        startupApplications: {
          where: { startupId },
          select: {
            id: true,
            status: true,
            submittedAt: true,
            batchId: true,
          },
        },
      },
    });

    if (!program) throw new ApiError(404, "Program not found");

    const openBatch =
      (program.batches || []).find((b) => b.status === "OPEN") || null;
    const hasOpenBatch = !!openBatch;
    const applicationDeadline = openBatch?.applicationEndDate ?? null;

    const currentBatchApplication = openBatch
      ? program.startupApplications?.find((a) => a.batchId === openBatch.id) ||
        null
      : null;
    const anyApplication = program.startupApplications?.[0] ?? null;
    const application = currentBatchApplication || anyApplication;

    return {
      id: program.id,
      title: program.title,
      description: program.description,
      objective: program.objective,
      benefits: program.benefits,
      guidelines: program.guidelines,
      eligibilityCriteria: program.eligibilityCriteria,
      nonEligibilityCriteria: program.nonEligibilityCriteria,
      expectedOutcome: program.expectedOutcome,
      externalLink: program.externalLink,
      coverImage: program.coverImage,
      programLogo: program.programLogo,
      createdAt: program.createdAt,

      schemeTypeRef: program.schemeTypeRef,
      governingBody: program.governingBody,

      totalFundingAmount: program.totalFundingAmount,
      fundingType: program.fundingType,
      fundingCurrency: program.fundingCurrency,
      isFundingAvailable: program.isFundingAvailable,

      tenant: program.tenant,

      programManagers:
        program.programManagers?.map((pm) => ({
          assignmentId: pm.id,
          id: pm.manager?.id,
          name: pm.manager?.name,
          imageUrl: pm.manager?.imageUrl,
          username: pm.manager?.user?.username ?? null,
        })) || [],

      batches: program.batches || [],

      schemeQuestions: program.programSchemeQuestions.map(
        (psq) => psq.schemeQuestion,
      ),

      hasOpenBatch,
      noBatchOpen: !hasOpenBatch,
      openBatchId: openBatch?.id ?? null,
      applicationDeadline,
      hasAppliedToCurrentBatch: !!currentBatchApplication,
      hasApplied: !!application,
      applicationId: application?.id ?? null,
      applicationStatus: application?.status ?? null,
      applicationBatchId: application?.batchId ?? null,
      submittedAt: application?.submittedAt ?? null,
    };
  },

  getProgramQuestions: async ({ programId, userId, startupId }) => {
    await verifyUserStartupAccess(userId, startupId);

    const program = await db.program.findUnique({
      where: { id: programId },
      select: {
        id: true,
        title: true,
        programSchemeQuestions: {
          orderBy: { createdAt: "asc" },
          include: {
            schemeQuestion: {
              select: {
                id: true,
                questionText: true,
                questionType: true,
                isRequired: true,
                options: true,
              },
            },
          },
        },
      },
    });

    if (!program) throw new ApiError(404, "Program not found");

    return {
      programId: program.id,
      programTitle: program.title,
      questions: program.programSchemeQuestions.map((psq) => psq.schemeQuestion),
      total: program.programSchemeQuestions.length,
    };
  },

  submitApplication: async ({
    programId,
    batchId,
    userId,
    startupId,
    schemeAnswers,
    requestedFundingAmount,
    fundingPurpose,
  }) => {
    await verifyUserStartupAccess(userId, startupId);

    const program = await db.program.findUnique({
      where: { id: programId },
      include: { tenant: true },
    });
    if (!program) throw new ApiError(404, "Program not found");

    if(!requestedFundingAmount){
       throw new ApiError(404, "Please provide requested funding amount");
    }
    let resolvedBatchId = batchId || null;

    if (batchId) {
      const batch = await db.programBatch.findUnique({
        where: { id: batchId },
      });
      if (!batch) throw new ApiError(404, "Batch not found");
      if (batch.programId !== programId)
        throw new ApiError(400, "Batch does not belong to this program");
      if (batch.status !== "OPEN")
        throw new ApiError(
          400,
          "This batch is not currently accepting applications",
        );
      if (
        batch.applicationStartDate &&
        new Date() < new Date(batch.applicationStartDate)
      )
        throw new ApiError(
          400,
          "Application window has not started yet for this batch",
        );
      if (
        batch.applicationEndDate &&
        new Date() > new Date(batch.applicationEndDate)
      )
        throw new ApiError(400, "Application window has closed for this batch");
      if (batch.maxSlots) {
        const currentCount = await db.startupApplication.count({
          where: { batchId },
        });
        if (currentCount >= batch.maxSlots)
          throw new ApiError(
            400,
            "This batch has reached its maximum application limit",
          );
      }
      resolvedBatchId = batch.id;
    } else {
      const now = new Date();
      const openBatch = await db.programBatch.findFirst({
        where: {
          programId,
          status: "OPEN",
          isActive: true,
        },
        orderBy: { createdAt: "desc" },
      });

      if (!openBatch) {
        throw new ApiError(
          400,
          "No batch is currently accepting applications for this program",
        );
      }

      if (
        openBatch.applicationStartDate &&
        now < new Date(openBatch.applicationStartDate)
      ) {
        throw new ApiError(
          400,
          "Application window has not started yet for the current batch",
        );
      }
      if (
        openBatch.applicationEndDate &&
        now > new Date(openBatch.applicationEndDate)
      ) {
        throw new ApiError(
          400,
          "Application window has closed for the current batch",
        );
      }
      if (openBatch.maxSlots) {
        const currentCount = await db.startupApplication.count({
          where: { batchId: openBatch.id },
        });
        if (currentCount >= openBatch.maxSlots) {
          throw new ApiError(
            400,
            "The current batch has reached its maximum application limit",
          );
        }
      }
      resolvedBatchId = openBatch.id;
    }

    const activeApplication = await db.startupApplication.findFirst({
      where: {
        startupId,
        programId,
        batchId: resolvedBatchId,
        status: { notIn: ["REJECTED"] },
      },
    });

    if (activeApplication) {
      throw new ApiError(
        400,
        "Startup already has an application for this batch",
      );
    }

    const application = await db.$transaction(async (tx) => {
      const newApp = await tx.startupApplication.create({
        data: {
          startupId,
          programId,
          tenantId: program.tenant.id,
          batchId: resolvedBatchId,
          status: "NEW",
          submittedAt: new Date(),
          requestedFundingAmount: requestedFundingAmount || null,
          fundingPurpose: fundingPurpose || null,
        },
      });

      await tx.schemeAnswer.createMany({
        data: schemeAnswers.map((a) => ({
          applicationId: newApp.id,
          questionId: a.questionId,
          answerText:
            a.answerText === undefined || a.answerText === null
              ? null
              : JSON.stringify(a.answerText),
          answerFileUrl: a.answerFileUrl ?? null,
        })),
      });
      return newApp;
    });
    return application;
  },

  respondChange: async ({
    userId,
    changeRequestId,
    responseText,
    fileUrl,
    startupId,
  }) => {
    await verifyUserStartupAccess(userId, startupId);

    const changeRequest = await db.changeRequest.findUnique({
      where: { id: changeRequestId },
      include: {
        application: { include: { startup: true } },
        program: {
          include: {
  
            programManagers: {
              include: {
  
                manager: {
                  select: {
                    userId: true,
                  },
                },
  
              },
            },
  
          },
        },  
      },
    });

    if (!changeRequest) throw new ApiError(404, "Change request not found");

    if (changeRequest.application.startupId !== startupId) {
      throw new ApiError(403, "Unauthorized to respond to this change request");
    }

    if (["RECEIVED", "APPROVED"].includes(changeRequest.status)) {
      throw new ApiError(400, "Change request has already been responded to or approved");
    }

    const response = await db.changeResponse.create({
      data: {
        changeRequestId,
        respondedById: userId,
        responseText,
        fileUrl,
      },
    });

    await db.changeRequest.update({
      where: { id: changeRequestId },
      data: { status: "RECEIVED", resolvedAt: new Date() },
    });

    const openRequests = await db.changeRequest.count({
      where: {
        applicationId: changeRequest.applicationId,
        status: "PENDING",
      },
    });

    if (openRequests === 0) {
      await db.startupApplication.update({
        where: { id: changeRequest.applicationId },
        data: { status: "CHANGES_RECEIVED" },
      });

      await db.applicationHistory.create({
        data: {
          applicationId: changeRequest.applicationId,
          changedById: userId,
          oldStatus: changeRequest.application.status,
          newStatus: "CHANGES_RECEIVED",
          comment: "Startup submitted all requested changes",
        },
      });
    }

    const recipientIds = [
      ...new Set(
        changeRequest.application.program.programManagers.map(
          (pm) => pm.manager.userId
        )
      ),
    ];
    
    const actor =
      await db.user.findUnique({
        where: {
          id: userId,
        },
    
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePhoto: true,
        },
      });
    
    if (recipientIds.length > 0) {
      await NotificationService.sendBulk({
        recipientIds,
        type:
          "CHANGE_REQUEST_RESPONSE",
        category:
          "INCUBATION",
        priority:
          "HIGH",
        title:
          "Requested Changes Submitted",
        message:
          responseText
            ? `${changeRequest.application.startup.name} responded to the requested changes.`
            : `${changeRequest.application.startup.name} submitted requested changes.`,
        entityType:
          "ChangeRequest",
        entityId:
          changeRequestId,
        actionUrl:
          `/programs/applications/${changeRequest.applicationId}/changes/${changeRequestId}`,
        actorId:
          actor?.id || null,
        actorName:
          `${actor?.firstName || ""} ${actor?.lastName || ""}`.trim() || null,
        actorAvatar:
          actor?.profilePhoto || null,
        data: {
          changeRequestId,
          applicationId:
            changeRequest.applicationId,
          responseId:
            response.id,
          status:
            "RECEIVED",
          startupId,
        },
      }).catch(() => {});
    }

    return response;
  },

  respondDocument: async ({
    userId,
    documentRequestId,
    fileUrl,
    files,
    comment,
    startupId,
  }) => {
    return submitDocumentResponse({
      userId,
      documentRequestId,
      fileUrl,
      files,
      comment,
      startupId,
      mode: "SUBMIT",
    });
  },

  submitDocumentResponse: async ({
    userId,
    documentRequestId,
    files,
    fileUrl,
    comment,
    startupId,
  }) => {
    return submitDocumentResponse({
      userId,
      documentRequestId,
      files,
      fileUrl,
      comment,
      startupId,
      mode: "SUBMIT",
    });
  },

  resubmitDocumentResponse: async ({
    userId,
    documentRequestId,
    files,
    fileUrl,
    comment,
    startupId,
  }) => {
    return submitDocumentResponse({
      userId,
      documentRequestId,
      files,
      fileUrl,
      comment,
      startupId,
      mode: "RESUBMIT",
    });
  },

  withdrawDocumentResponse: async ({ userId, startupId, responseId }) => {
    await verifyUserStartupAccess(userId, startupId);

    const response = await db.documentResponse.findUnique({
      where: { id: responseId },
      include: {
        documentRequest: {
          include: { application: true },
        },
      },
    });

    if (!response) throw new ApiError(404, "Document response not found");
    if (response.documentRequest.application.startupId !== startupId) {
      throw new ApiError(403, "Unauthorized to withdraw this response");
    }
    if (response.respondedById !== userId) {
      throw new ApiError(403, "You can only withdraw your own response");
    }
    if (response.status === "WITHDRAWN") {
      throw new ApiError(400, "Response already withdrawn");
    }
    if (response.documentRequest.status !== "RESOLVED") {
      throw new ApiError(
        400,
        "Only responses on resolved requests can be withdrawn",
      );
    }

    return db.$transaction(async (tx) => {
      const updated = await tx.documentResponse.update({
        where: { id: responseId },
        data: { status: "WITHDRAWN" },
      });

      const remaining = await tx.documentResponse.count({
        where: {
          documentRequestId: response.documentRequestId,
          status: "SUBMITTED",
        },
      });

      if (remaining === 0) {
        await tx.documentRequest.update({
          where: { id: response.documentRequestId },
          data: { status: "PENDING", resolvedAt: null },
        });
      }

      return updated;
    });
  },

  getMyDocumentResponses: async ({
    userId,
    startupId,
    applicationId,
    documentRequestId,
  }) => {
    await verifyUserStartupAccess(userId, startupId);

    const where = {
      respondedById: userId,
      documentRequest: {
        application: { startupId },
        ...(applicationId ? { applicationId } : {}),
      },
      ...(documentRequestId ? { documentRequestId } : {}),
    };

    return db.documentResponse.findMany({
      where,
      include: {
        files: true,
        documentRequest: {
          select: {
            id: true,
            title: true,
            status: true,
            applicationId: true,
          },
        },
      },
      orderBy: { respondedAt: "desc" },
    });
  },

  getDocumentResponseById: async ({ userId, startupId, responseId }) => {
    await verifyUserStartupAccess(userId, startupId);

    const response = await db.documentResponse.findUnique({
      where: { id: responseId },
      include: {
        files: true,
        documentRequest: {
          include: {
            application: { select: { id: true, startupId: true } },
          },
        },
      },
    });

    if (!response) throw new ApiError(404, "Document response not found");
    if (response.documentRequest.application.startupId !== startupId) {
      throw new ApiError(403, "Unauthorized to view this response");
    }

    return response;
  },

  getChangeRequests: async ({ userId, applicationId, startupId }) => {
    await verifyUserStartupAccess(userId, startupId);

    const application = await db.startupApplication.findUnique({
      where: { id: applicationId, startupId },
    });

    if (!application)
      throw new ApiError(404, "Application not found or unauthorized");

    const changeRequests = await db.changeRequest.findMany({
      where: { applicationId, visibleToAll: true },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        status: true,
        requestedAt: true,
        resolvedAt: true,
        requestedBy: {
          select: { id: true, name: true, imageUrl: true },
        },
        _count: { select: { responses: true } },
      },
      orderBy: { requestedAt: "desc" },
    });

    return changeRequests;
  },

  getChangeRequestById: async ({
    userId,
    applicationId,
    changeRequestId,
    startupId,
  }) => {
    await verifyUserStartupAccess(userId, startupId);

    const application = await db.startupApplication.findUnique({
      where: { id: applicationId, startupId },
    });
    if (!application)
      throw new ApiError(404, "Application not found or unauthorized");

    const changeRequest = await db.changeRequest.findFirst({
      where: {
        id: changeRequestId,
        applicationId,
        visibleToAll: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        status: true,
        requestedAt: true,
        resolvedAt: true,
        requestedBy: {
          select: { id: true, name: true, email: true, imageUrl: true },
        },
        responses: {
          select: {
            id: true,
            responseText: true,
            fileUrl: true,
            respondedAt: true,
            respondedById: true,
          },
          orderBy: { respondedAt: "asc" },
        },
      },
    });

    if (!changeRequest) throw new ApiError(404, "Change request not found");

    return changeRequest;
  },

  getDocumentRequests: async ({ userId, applicationId, startupId }) => {
    await verifyUserStartupAccess(userId, startupId);

    const application = await db.startupApplication.findUnique({
      where: { id: applicationId, startupId },
    });

    if (!application)
      throw new ApiError(404, "Application not found or unauthorized");

    const documentRequests = await db.documentRequest.findMany({
      where: { applicationId, visibleToAll: true },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        requestedAt: true,
        resolvedAt: true,
        requestedBy: {
          select: { id: true, name: true, imageUrl: true },
        },
        _count: { select: { responses: true } },
      },
      orderBy: { requestedAt: "desc" },
    });

    return documentRequests;
  },

  getDocumentRequestById: async ({
    userId,
    applicationId,
    documentRequestId,
    startupId,
  }) => {
    await verifyUserStartupAccess(userId, startupId);

    const application = await db.startupApplication.findUnique({
      where: { id: applicationId, startupId },
    });
    if (!application)
      throw new ApiError(404, "Application not found or unauthorized");

    const documentRequest = await db.documentRequest.findFirst({
      where: {
        id: documentRequestId,
        applicationId,
        visibleToAll: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        requestedAt: true,
        resolvedAt: true,
        requestedBy: {
          select: { id: true, name: true, email: true, imageUrl: true },
        },
        responses: {
          select: {
            id: true,
            fileUrl: true,
            respondedAt: true,
            respondedById: true,
          },
          orderBy: { respondedAt: "asc" },
        },
      },
    });

    if (!documentRequest) throw new ApiError(404, "Document request not found");

    return documentRequest;
  },

  getApplications: async ({
    userId,
    page,
    limit,
    search,
    sortBy,
    order,
    status,
    startupId,
  }) => {
    await verifyUserStartupAccess(userId, startupId);

    const queryOptions = buildQueryOptions({
      page,
      limit,
      search,
      searchFields: ["program.title", "program.description"],
      defaultFields: ["program.title"],
      sortBy: sortBy || "updatedAt",
      order: order || "desc",
    });

    const where = {
      startupId,
      ...(status ? { status } : {}),
      ...queryOptions.where,
    };

    const [applications, total,totalApplications,
      underReview,
      actionRequired,
      onboarded,] = await Promise.all([
      db.startupApplication.findMany({
        where,
        skip: queryOptions.skip,
        take: queryOptions.take,
        orderBy: queryOptions.orderBy,
        include: {
          program: {
            select: {
              id: true,
              title: true,
              description: true,
              programLogo: true,
              coverImage: true,
              schemeTypeRef: { select: { id: true, name: true } },
              governingBody: { select: { id: true, name: true } },
            },
          },
          tenant: {
            select: {
              id: true,
              organizationName: true,
            },
          },
          changeRequests: {
            where: { status: "PENDING", visibleToAll: true },
            select: { id: true },
          },
          documentRequests: {
            where: { status: "PENDING", visibleToAll: true },
            select: { id: true },
          },
          evaluations: {
            select: { totalScore: true, remarks: true },
          },
          batch: {
            select: {
              id: true,
              batchName: true,
              batchCode: true,
              status: true,
            },
          },
        },
      }),
      db.startupApplication.count({ where }),
      // Total Applications
      db.startupApplication.count({
        where: {
          startupId,
        },
      }),

      // Under Review
      db.startupApplication.count({
        where: {
          startupId,
          status: {
            in: [
              "REVIEWED",
              "UNDER_EVALUATION",
              "EVALUATED",
              "VERIFIED",
            ],
          },
        },
      }),

      // Action Required
      db.startupApplication.count({
        where: {
          startupId,
          status: {
            in: [
              "CHANGES_REQUESTED",
              "DOCS_REQUESTED",
            ],
          },
        },
      }),

      // Onboarded
      db.startupApplication.count({
        where: {
          startupId,
          status: "ONBOARDED",
        },
    }),
    ]);

    return {
      metrics: {
        totalApplications,
        underReview,
        actionRequired,
        onboarded,
      },
      data: applications.map((app) => ({
        id: app.id,
        status: app.status,
        submittedAt: app.submittedAt,
        updatedAt: app.updatedAt,
        currentStage: app.currentStage,
        program: app.program,
        tbi: app.tenant,
        batch: app.batch || null,
        pendingChangeRequests: app.changeRequests.length > 0,
        pendingDocumentRequests: app.documentRequests.length > 0,
        evaluationStatus: app.evaluations.length > 0 ? "Completed" : "Pending",
        totalScore: app.evaluations[0]?.totalScore || null,
        remarks: app.evaluations[0]?.remarks || null,
      })),
      pagination: {
        total,
        page: Number(page) || 1,
        limit: Number(limit) || 10,
        totalPages: Math.ceil(total / (Number(limit) || 10)),
      },
    };
  },

  getApplicationById: async ({ userId, applicationId, startupId }) => {
    await verifyUserStartupAccess(userId, startupId);

    const application = await db.startupApplication.findFirst({
      where: { id: applicationId, startupId },
      include: {
        program: {
          select: {
            id: true,
            title: true,
            schemeTypeRef: { select: { id: true, name: true } },
            governingBody: { select: { id: true, name: true } },
            description: true,
            programLogo: true,
            tenant: {
              select: { organizationName: true, tenantLogo: true },
            },
          },
        },
        schemeAnswers: {
          select: {
            questionId: true,
            answerText: true,
            answerFileUrl: true,
            question: {
              select: { questionText: true, questionType: true },
            },
          },
        },
        changeRequests: {
          where: { visibleToAll: true },
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            requestedAt: true,
          },
        },
        documentRequests: {
          where: { visibleToAll: true },
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            requestedAt: true,
          },
        },
        evaluations: {
          select: { totalScore: true, remarks: true },
        },
        batch: {
          select: {
            id: true,
            batchName: true,
            batchCode: true,
            status: true,
          },
        },
        history: {
          select: {
            oldStatus: true,
            newStatus: true,
            comment: true,
            changedAt: true,
          },
          orderBy: { changedAt: "desc" },
        },
      },
    });

    if (!application)
      throw new ApiError(404, "Application not found or unauthorized");

    return {
      ...application,
      pendingChangeRequests:
        application.changeRequests.filter((cr) => cr.status === "PENDING")
          .length > 0,
      pendingDocumentRequests:
        application.documentRequests.filter(
          (dr) => dr.status === "PENDING" || dr.status === "REOPENED",
        ).length > 0,
      evaluationStatus:
        application.evaluations.length > 0 ? "Completed" : "Pending",
      totalScore: application.evaluations[0]?.totalScore || null,
      remarks: application.evaluations[0]?.remarks || null,
    };
  },

  getApplicationSummary: async ({ userId, applicationId, startupId }) => {
    await verifyUserStartupAccess(userId, startupId);

    const application = await db.startupApplication.findUnique({
      where: { id: applicationId, startupId },
      select: { id: true, status: true, programId: true, batchId: true },
    });
    if (!application)
      throw new ApiError(404, "Application not found or unauthorized");

    const [
      pendingChangeRequests,
      pendingDocumentRequests,
      pendingDataCollectionAssignments,
      pendingFundingRequests,
      totalDisbursements,
      evaluationCount,
    ] = await Promise.all([
      db.changeRequest.count({
        where: {
          applicationId,
          status: "PENDING",
          visibleToAll: true,
        },
      }),
      db.documentRequest.count({
        where: {
          applicationId,
          status: "PENDING",
          visibleToAll: true,
        },
      }),
      db.dataCollectionAssignment.count({
        where: {
          applicationId,
          status: "PENDING",
          dataCollectionRequest: { status: "ACTIVE" },
        },
      }),
      db.startupFundingRequest.count({
        where: { applicationId, status: "PENDING" },
      }),
      db.fundingDisbursement.count({
        where: { applicationId, status: "COMPLETED" },
      }),
      db.evaluation.count({ where: { applicationId } }),
    ]);

    return {
      applicationId: application.id,
      status: application.status,
      pendingChangeRequests,
      pendingDocumentRequests,
      pendingDataCollectionAssignments,
      pendingFundingRequests,
      totalDisbursements,
      evaluationStatus: evaluationCount > 0 ? "Completed" : "Pending",
    };
  },

  getApplicationHistory: async ({
    userId,
    applicationId,
    startupId,
    page = 1,
    limit = 20,
  }) => {
    await verifyUserStartupAccess(userId, startupId);

    const application = await db.startupApplication.findUnique({
      where: { id: applicationId, startupId },
      select: { id: true },
    });
    if (!application)
      throw new ApiError(404, "Application not found or unauthorized");

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [history, total] = await Promise.all([
      db.applicationHistory.findMany({
        where: { applicationId },
        select: {
          id: true,
          oldStatus: true,
          newStatus: true,
          comment: true,
          changedAt: true,
          changedById: true,
        },
        orderBy: { changedAt: "desc" },
        skip,
        take,
      }),
      db.applicationHistory.count({ where: { applicationId } }),
    ]);

    return {
      data: history,
      pagination: {
        total,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        totalPages: Math.ceil(total / (Number(limit) || 20)),
      },
    };
  },

  async getDisbursementHistory({ userId, applicationId, startupId }) {
    await verifyUserStartupAccess(userId, startupId);

    const application = await db.startupApplication.findUnique({
      where: { id: applicationId },
    });
    if (!application || application.startupId !== startupId) {
      throw new ApiError(404, "Application not found");
    }

    const [disbursements, fundingRequests, association] = await Promise.all([
      db.fundingDisbursement.findMany({
        where: { applicationId },
        include: {
          documents: true,
          program: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.startupFundingRequest.findMany({
        where: { applicationId },
        include: {
          disbursement: {
            select: {
              id: true,
              status: true,
              amount: true,
              disbursedAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.startupProgramAssociation.findFirst({
        where: {
          startupId,
          programId: application.programId,
          batchId: application.batchId || null,
        },
        select: {
          approvedFundingAmount: true,
          totalDisbursedAmount: true,
        },
      }),
    ]);

    return {
      approvedFundingAmount: association?.approvedFundingAmount || 0,
      totalDisbursedAmount: association?.totalDisbursedAmount || 0,
      remainingAmount:
        (association?.approvedFundingAmount || 0) -
        (association?.totalDisbursedAmount || 0),
      disbursements,
      fundingRequests,
    };
  },

  async createFundingRequest({
    userId,
    startupId,
    applicationId,
    requestedAmount,
    currency,
    note,
    docUrl,
    docName,
  }) {
    await verifyUserStartupAccess(userId, startupId);

    const application = await db.startupApplication.findUnique({
      where: { id: applicationId },
      include: { program: true,
      startup: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      },
    },
    });
    if (!application || application.startupId !== startupId) {
      throw new ApiError(404, "Application not found");
    }
    if (application.status !== "ONBOARDED") {
      throw new ApiError(
        400,
        "You must be onboarded before requesting funding",
      );
    }

    const association = await db.startupProgramAssociation.findFirst({
      where: {
        startupId,
        programId: application.programId,
        batchId: application.batchId || null,
      },
    });
    if (!association) {
      throw new ApiError(404, "Program association not found");
    }

    const { remaining } = await computeAssociationRemaining(db, { association });
    if (requestedAmount > remaining) {
      throw new ApiError(
        400,
        `Requested amount exceeds remaining balance. Remaining: ${remaining}, Requested: ${requestedAmount}`,
      );
    }

    return db.$transaction(async (tx) => {
      const request = await tx.startupFundingRequest.create({
        data: {
          applicationId,
          startupId,
          programId: application.programId,
          tenantId: application.tenantId,
          batchId: application.batchId || null,
          requestedAmount,
          currency: currency || "INR",
          note: note || null,
          docUrl: docUrl || null,
          docName: docName || null,
        },
      });

      await tx.fundingHistory.create({
        data: {
          tenantId: application.tenantId,
          action: "REQUEST_CREATED",
          entityType: "StartupFundingRequest",
          entityId: request.id,
          performedById: userId,
          newValue: { requestedAmount, currency: currency || "INR", note },
          notes: `Funding request created by startup for ${requestedAmount}`,
        },
      });


      const actor =
        await tx.user.findUnique({
          where: {
            id: userId,
          },

          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        });

        console.log("tenant id:",application.tenantId)
        
      
        await NotificationService.sendToTenant({
          tenantId:
    application.tenantId,
          type:
            "FUNDING_REQUEST_STATUS",
          category:
            "INCUBATION",
          priority:
            "HIGH",
          title:
            "New Funding Request",
          message:
            `${application.startup?.name || "A startup"} requested funding of ${requestedAmount} ${currency || "INR"}.`,
          entityType:
            "StartupFundingRequest",
          entityId:
            request.id,
          actionUrl:
            `/programs/associated`,
          actorId:
            actor?.id || null,
          actorName:
            `${actor?.firstName || ""} ${actor?.lastName || ""}`.trim() || null,
          actorAvatar:
            actor?.profilePhoto || null,
          data: {
            fundingRequestId:
              request.id,
            applicationId,
            startupId,
            requestedAmount,
            currency:
              currency || "INR",
            status:
              "PENDING",
          },

        }).catch(() => {});
      return request;
    });
  },

  async getFundingRequests({ userId, startupId, applicationId }) {
    await verifyUserStartupAccess(userId, startupId);

    const application = await db.startupApplication.findUnique({
      where: { id: applicationId },
    });
    if (!application || application.startupId !== startupId) {
      throw new ApiError(404, "Application not found");
    }

    return db.startupFundingRequest.findMany({
      where: { applicationId },
      include: {
        disbursement: {
          select: {
            id: true,
            status: true,
            amount: true,
            disbursedAt: true,
          },
        },
        program: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async cancelFundingRequest({ userId, startupId, requestId }) {
    await verifyUserStartupAccess(userId, startupId);

    const request = await db.startupFundingRequest.findUnique({
      where: { id: requestId },
    });
    if (!request || request.startupId !== startupId) {
      throw new ApiError(404, "Funding request not found");
    }
    if (request.status !== "PENDING") {
      throw new ApiError(
        400,
        `Cannot cancel a request with status ${request.status}. Only PENDING requests can be cancelled.`,
      );
    }

    return db.$transaction(async (tx) => {
      const updated = await tx.startupFundingRequest.update({
        where: { id: requestId },
        data: { status: "CANCELLED" },
      });

      await tx.fundingHistory.create({
        data: {
          tenantId: request.tenantId,
          action: "REQUEST_CANCELLED",
          entityType: "StartupFundingRequest",
          entityId: requestId,
          performedById: userId,
          oldValue: { status: "PENDING" },
          newValue: { status: "CANCELLED" },
          notes: `Funding request cancelled by startup`,
        },
      });

      return updated;
    });
  },

  async getAssociatedPrograms({
    userId,
    startupId,
    page,
    limit,
    search,
    sortBy,
    order,
    status,
  }) {
    await verifyUserStartupAccess(userId, startupId);

    const queryOptions = buildQueryOptions({
      page,
      limit,
      search,
      searchFields: ["program.title"],
      defaultFields: ["program.title"],
      sortBy: sortBy || "onboardedAt",
      order: order || "desc",
    });

    const where = {
      startupId,
      isActive: true,
      ...(status ? { status } : {}),
    };

    const [associations, total] = await Promise.all([
      db.startupProgramAssociation.findMany({
        where,
        skip: queryOptions.skip,
        take: queryOptions.take,
        orderBy: queryOptions.orderBy,
        include: {
          program: {
            select: {
              id: true,
              title: true,
              description: true,
              programLogo: true,
              coverImage: true,
              schemeTypeRef: { select: { id: true, name: true } },
              governingBody: { select: { id: true, name: true } },
              tenant: {
                select: {
                  id: true,
                  organizationName: true,
                  tenantLogo: true,
                },
              },
            },
          },
          batch: {
            select: {
              id: true,
              batchName: true,
              batchCode: true,
              status: true,
            },
          },
        },
      }),
      db.startupProgramAssociation.count({ where }),
    ]);

    const data = associations.map((assoc) => ({
      associationId: assoc.id,
      status: assoc.status,
      onboardedAt: assoc.onboardedAt,
      approvedFundingAmount: assoc.approvedFundingAmount || 0,
      totalDisbursedAmount: assoc.totalDisbursedAmount || 0,
      remainingFunding:
        (assoc.approvedFundingAmount || 0) - (assoc.totalDisbursedAmount || 0),
      program: assoc.program,
      tenant: assoc.program.tenant,
      batch: assoc.batch || null,
    }));

    return {
      data,
      pagination: {
        total,
        page: Number(page) || 1,
        limit: Number(limit) || 10,
        totalPages: Math.ceil(total / (Number(limit) || 10)),
      },
    };
  },

  async getDataCollectionRequests({
    userId,
    startupId,
    programId,
    applicationId,
    status,
  }) {
    await verifyUserStartupAccess(userId, startupId);

    const where = {
      startupId,
      ...(applicationId ? { applicationId } : {}),
      ...(status ? { status } : {}),
      OR: [
        { dataCollectionRequest: { status: "ACTIVE" } },
        { status: { not: "PENDING" } },
      ],
      ...(programId ? { dataCollectionRequest: { programId } } : {}),
    };

    const assignments = await db.dataCollectionAssignment.findMany({
      where,
      include: {
        dataCollectionRequest: {
          select: {
            id: true,
            title: true,
            description: true,
            requestType: true,
            status: true,
            dueDate: true,
            createdAt: true,
            program: { select: { id: true, title: true } },
            batch: { select: { id: true, batchName: true } },
            questions: { orderBy: { order: "asc" } },
          },
        },
        responses: {
          select: {
            id: true,
            questionId: true,
            responseText: true,
            fileUrl: true,
            fileName: true,
            respondedAt: true,
          },
          orderBy: { respondedAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return assignments;
  },

  async getDataCollectionAssignment({ userId, startupId, assignmentId }) {
    await verifyUserStartupAccess(userId, startupId);

    const assignment = await db.dataCollectionAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        dataCollectionRequest: {
          select: {
            id: true,
            title: true,
            description: true,
            requestType: true,
            status: true,
            dueDate: true,
            program: { select: { id: true, title: true } },
            batch: { select: { id: true, batchName: true } },
            questions: { orderBy: { order: "asc" } },
          },
        },
        responses: {
          select: {
            id: true,
            questionId: true,
            responseText: true,
            fileUrl: true,
            fileName: true,
            respondedAt: true,
          },
          orderBy: { respondedAt: "desc" },
        },
      },
    });

    if (!assignment || assignment.startupId !== startupId) {
      throw new ApiError(404, "Assignment not found");
    }

    return assignment;
  },

  async submitDataCollectionResponse({
    userId,
    startupId,
    assignmentId,
    responses = [],
  }) {
    await verifyUserStartupAccess(userId, startupId);

    const assignment = await db.dataCollectionAssignment.findUnique({
      where: { id: assignmentId },
      include: { dataCollectionRequest: true },
    });

    if (!assignment || assignment.startupId !== startupId) {
      throw new ApiError(404, "Assignment not found");
    }
    if (assignment.dataCollectionRequest.status === "CLOSED") {
      throw new ApiError(400, "This data collection request has been closed");
    }
    if (assignment.status === "APPROVED") {
      throw new ApiError(400, "This assignment has already been approved");
    }

    if (!Array.isArray(responses) || responses.length === 0) {
      throw new ApiError(400, "No responses provided");
    }

    const transactionResult = await db.$transaction(async (tx) => {
      await tx.dataCollectionResponse.createMany({
        data: responses.map((r) => ({
          assignmentId,
          respondedById: userId,
          questionId: r.questionId || null,
          responseText: r.responseText || null,
          fileUrl: r.fileUrl || null,
          fileName: r.fileName || null,
        })),
      });

      await tx.dataCollectionAssignment.update({
        where: { id: assignmentId },
        data: { status: "SUBMITTED", submittedAt: new Date() },
      });

      return true;
    });

    return transactionResult;
  },

  async getAssociationById({ userId, startupId, associationId }) {
    await verifyUserStartupAccess(userId, startupId);
    const association = await loadAssociationOr404({ startupId, associationId });
    const { remaining, inFlight } = await computeAssociationRemaining(db, {
      association,
    });
    const application = await resolveAssociationApplication(association);

    return {
      associationId: association.id,
      status: association.status,
      onboardedAt: association.onboardedAt,
      offboardedAt: association.offboardedAt,
      isActive: association.isActive,
      program: association.program,
      tenant: association.program.tenant,
      batch: association.batch || null,
      application,
      funding: {
        approvedFundingAmount: association.approvedFundingAmount || 0,
        totalDisbursedAmount: association.totalDisbursedAmount || 0,
        inFlightAmount: inFlight,
        remainingAmount: remaining,
        currency: association.program.fundingCurrency || "INR",
      },
    };
  },

  async getAssociationDashboard({ userId, startupId, associationId }) {
    await verifyUserStartupAccess(userId, startupId);
    const association = await loadAssociationOr404({ startupId, associationId });
    const application = await resolveAssociationApplication(association);

    const [
      fundingSummary,
      openDocRequests,
      openChangeRequests,
      openDataCollection,
      latestDisbursement,
    ] = await Promise.all([
      computeAssociationRemaining(db, { association }),
      application
        ? db.documentRequest.count({
            where: {
              applicationId: application.id,
              status: { in: ["PENDING", "REOPENED"] },
            },
          })
        : 0,
      application
        ? db.changeRequest.count({
            where: {
              applicationId: application.id,
              status: { in: ["PENDING", "RECEIVED"] },
            },
          })
        : 0,
      db.dataCollectionAssignment.count({
        where: {
          startupId,
          status: "PENDING",
          dataCollectionRequest: {
            programId: association.programId,
            status: "ACTIVE",
          },
        },
      }),
      db.fundingDisbursement.findFirst({
        where: {
          programId: association.programId,
          batchId: association.batchId || null,
          startupId,
          status: "COMPLETED",
        },
        orderBy: { disbursedAt: "desc" },
        select: { id: true, amount: true, disbursedAt: true, status: true },
      }),
    ]);

    return {
      association: {
        id: association.id,
        status: association.status,
        onboardedAt: association.onboardedAt,
        program: association.program,
        tenant: association.program.tenant,
        batch: association.batch || null,
      },
      application,
      funding: {
        approvedFundingAmount: association.approvedFundingAmount || 0,
        totalDisbursedAmount: association.totalDisbursedAmount || 0,
        inFlightAmount: fundingSummary.inFlight,
        remainingAmount: fundingSummary.remaining,
        currency: association.program.fundingCurrency || "INR",
        latestDisbursement,
      },
      openCounts: {
        documentRequests: openDocRequests,
        changeRequests: openChangeRequests,
        dataCollection: openDataCollection,
      },
    };
  },

  async getAssociationDocumentRequests({ userId, startupId, associationId }) {
    await verifyUserStartupAccess(userId, startupId);
    const association = await loadAssociationOr404({ startupId, associationId });
    const application = await resolveAssociationApplication(association);
    if (!application) return [];

    return db.documentRequest.findMany({
      where: { applicationId: application.id, visibleToAll: true },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        requestedAt: true,
        resolvedAt: true,
        requestedBy: { select: { id: true, name: true, imageUrl: true } },
        _count: { select: { responses: true } },
      },
      orderBy: { requestedAt: "desc" },
    });
  },

  async getAssociationChangeRequests({ userId, startupId, associationId }) {
    await verifyUserStartupAccess(userId, startupId);
    const association = await loadAssociationOr404({ startupId, associationId });
    const application = await resolveAssociationApplication(association);
    if (!application) return [];

    return db.changeRequest.findMany({
      where: { applicationId: application.id, visibleToAll: true },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        status: true,
        requestedAt: true,
        resolvedAt: true,
        requestedBy: { select: { id: true, name: true, imageUrl: true } },
        _count: { select: { responses: true } },
      },
      orderBy: { requestedAt: "desc" },
    });
  },

  async getAssociationFundingSummary({ userId, startupId, associationId }) {
    await verifyUserStartupAccess(userId, startupId);
    const association = await loadAssociationOr404({ startupId, associationId });
    const { remaining, inFlight } = await computeAssociationRemaining(db, {
      association,
    });
    const latestDisbursement = await db.fundingDisbursement.findFirst({
      where: {
        programId: association.programId,
        status: "COMPLETED",
        application: { startupId },
      },
      orderBy: { disbursedAt: "desc" },
      select: { id: true, amount: true, disbursedAt: true, status: true },
    });

    return {
      approvedFundingAmount: association.approvedFundingAmount || 0,
      totalDisbursedAmount: association.totalDisbursedAmount || 0,
      inFlightAmount: inFlight,
      remainingAmount: remaining,
      currency: association.program.fundingCurrency || "INR",
      latestDisbursement,
    };
  },

  async getAssociationsOverview({ userId, startupId }) {
    await verifyUserStartupAccess(userId, startupId);

    const [byStatus, totals] = await Promise.all([
      db.startupProgramAssociation.groupBy({
        by: ["status"],
        where: { startupId, isActive: true },
        _count: { _all: true },
      }),
      db.startupProgramAssociation.aggregate({
        where: { startupId, isActive: true },
        _count: { _all: true },
        _sum: {
          approvedFundingAmount: true,
          totalDisbursedAmount: true,
        },
      }),
    ]);

    const statusCounts = byStatus.reduce((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {});

    const approved = totals._sum.approvedFundingAmount || 0;
    const disbursed = totals._sum.totalDisbursedAmount || 0;

    return {
      totalAssociations: totals._count._all,
      statusCounts,
      totalApprovedFunding: approved,
      totalDisbursedFunding: disbursed,
      totalRemainingFunding: approved - disbursed,
    };
  },
};