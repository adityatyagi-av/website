import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { hashPassword } from "../../../utils/helperFunctions.js";
import { buildQueryOptions } from "../../../utils/queryHelper.js";
import { NotificationService } from "../../../services/common/notification.service.js";
import { id } from "zod/locales";
import { generateUniquePageSlug } from "../../../utils/userBridge.js";

async function resolveSchemeTypeId(tx, { schemeTypeId, schemeTypeName }) {
  if (schemeTypeId) return schemeTypeId;
  if (!schemeTypeName) return null;
  const trimmed = schemeTypeName.trim();
  if (!trimmed) return null;
  const existing = await tx.schemeType.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
  });
  if (existing) return existing.id;
  const created = await tx.schemeType.create({ data: { name: trimmed } });
  return created.id;
}

async function resolveGoverningBodyId(
  tx,
  { governingBodyId, governingBodyName },
) {
  if (governingBodyId) return governingBodyId;
  if (!governingBodyName) return null;
  const trimmed = governingBodyName.trim();
  if (!trimmed) return null;
  const existing = await tx.governingBody.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
  });
  if (existing) return existing.id;
  const created = await tx.governingBody.create({ data: { name: trimmed } });
  return created.id;
}

async function resolveIncubationUserId(userId) {
  const incUser = await db.incubationUser.findFirst({
    where: { OR: [{ id: userId }, { userId: userId }] },
  });
  if (!incUser) throw new ApiError(404, "Incubation user not found");
  return incUser.id;
}

async function generateUniqueUsername(email, txClient = db) {
  const base = email.split("@")[0].toLowerCase();
  let username = base;
  let attempts = 0;
  while (attempts < 5) {
    const exists = await txClient.user.findUnique({ where: { username } });
    if (!exists) return username;
    username = `${base}_${Math.random().toString(36).substring(2, 8)}`;
    attempts++;
  }
  return `${base}_${Date.now()}`;
}

export const programService = {
  async searchSchemeTypes({ search }) {
    const where = {};
    if (search && search.trim()) {
      where.name = { contains: search.trim(), mode: "insensitive" };
    }
    return db.schemeType.findMany({
      where,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 20,
    });
  },

  async createSchemeType({ name }) {
    if (!name || !name.trim()) throw new ApiError(400, "name is required");
    const trimmed = name.trim();
    const existing = await db.schemeType.findFirst({
      where: { name: { equals: trimmed, mode: "insensitive" } },
    });
    if (existing) return existing;
    return db.schemeType.create({ data: { name: trimmed } });
  },

  async searchGoverningBodies({ search }) {
    const where = {};
    if (search && search.trim()) {
      where.name = { contains: search.trim(), mode: "insensitive" };
    }
    return db.governingBody.findMany({
      where,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 20,
    });
  },

  async createGoverningBody({ name }) {
    if (!name || !name.trim()) throw new ApiError(400, "name is required");
    const trimmed = name.trim();
    const existing = await db.governingBody.findFirst({
      where: { name: { equals: trimmed, mode: "insensitive" } },
    });
    if (existing) return existing;
    return db.governingBody.create({ data: { name: trimmed } });
  },

  async createProgram(data) {
    const {
      tenantKey,
      createdBy,
      title,
      description,
      objective,
      benefits,
      guidelines,
      schemeTypeId,
      schemeTypeName,
      governingBodyId,
      governingBodyName,
      eligibilityCriteria,
      nonEligibilityCriteria,
      expectedOutcome,
      externalLink,
      coverImage,
      programLogo,
      existingQuestionIds = [],
      newQuestions = [],
      evaluationQuestions = [],
      managerIds = [],
      includeCreatorAsManager = true,
      batch,
    } = data;
    const resolvedCreatedBy = await resolveIncubationUserId(createdBy);
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");
    const allManagerIds = Array.from(
      new Set([
        ...(includeCreatorAsManager ? [resolvedCreatedBy] : []),
        ...managerIds,
      ]),
    );

    const program = await db.$transaction(async (tx) => {
      const resolvedSchemeTypeId = await resolveSchemeTypeId(tx, {
        schemeTypeId,
        schemeTypeName,
      });
      const resolvedGoverningBodyId = await resolveGoverningBodyId(tx, {
        governingBodyId,
        governingBodyName,
      });

      const newProgram = await tx.program.create({
        data: {
          tenantId: tenant.id,
          title,
          description,
          objective,
          benefits,
          guidelines,
          schemeTypeId: resolvedSchemeTypeId,
          governingBodyId: resolvedGoverningBodyId,
          eligibilityCriteria,
          nonEligibilityCriteria,
          expectedOutcome,
          externalLink,
          coverImage,
          programLogo,
        },
      });
      if (allManagerIds.length > 0) {
        await tx.programManagerAssignment.createMany({
          data: allManagerIds.map((id) => ({
            programId: newProgram.id,
            managerId: id,
          })),
          skipDuplicates: true,
        });
      }

      if (existingQuestionIds.length > 0) {
        const existingQuestions = await tx.schemeQuestion.findMany({
          where: { id: { in: existingQuestionIds }, tenantId: tenant.id },
        });
        if (existingQuestions.length !== existingQuestionIds.length) {
          throw new ApiError(
            400,
            "Some existing question IDs are invalid or do not belong to this tenant",
          );
        }
        await tx.programSchemeQuestion.createMany({
          data: existingQuestionIds.map((qId) => ({
            programId: newProgram.id,
            schemeQuestionId: qId,
          })),
          skipDuplicates: true,
        });
      }

      if (newQuestions.length > 0) {
        for (const q of newQuestions) {
          const created = await tx.schemeQuestion.create({
            data: {
              tenantId: tenant.id,
              questionText: q.questionText,
              questionType: q.questionType,
              isRequired: q.isRequired ?? false,
              options: q.options ?? [],
            },
          });
          await tx.programSchemeQuestion.create({
            data: {
              programId: newProgram.id,
              schemeQuestionId: created.id,
            },
          });
        }
      }

      if (evaluationQuestions.length > 0) {
        for (const q of evaluationQuestions) {
          await tx.evaluationQuestion.create({
            data: {
              programId: newProgram.id,
              questionText: q.questionText,
              weightage: q.weightage ?? 0,
              scoringReference: q.scoringReference ?? null,
              options: {
                create: (q.options ?? []).map((opt, index) => ({
                  optionText: opt.optionText,
                  score: opt.score ?? 0,
                  order: opt.order ?? index + 1,
                })),
              },
            },
          });
        }
      }

      let createdBatch = null;
      if (batch && batch.batchName) {
        if (batch.applicationStartDate && batch.applicationEndDate) {
          if (
            new Date(batch.applicationEndDate) <=
            new Date(batch.applicationStartDate)
          ) {
            throw new ApiError(
              400,
              "Batch applicationEndDate must be after applicationStartDate",
            );
          }
        }

        const allowedBatchStatuses = [
          "DRAFT",
          "UPCOMING",
          "OPEN",
          "CLOSED",
          "UNDER_EVALUATION",
          "COMPLETED",
          "ARCHIVED",
        ];
        if (batch.status && !allowedBatchStatuses.includes(batch.status)) {
          throw new ApiError(
            400,
            `Invalid batch status. Allowed: ${allowedBatchStatuses.join(", ")}`,
          );
        }
        const batchStatus = batch.status || "DRAFT";
        if (
          batchStatus === "OPEN" &&
          (!batch.applicationStartDate || !batch.applicationEndDate)
        ) {
          throw new ApiError(
            400,
            "An OPEN batch requires both applicationStartDate and applicationEndDate",
          );
        }
        createdBatch = await tx.programBatch.create({
          data: {
            programId: newProgram.id,
            batchName: batch.batchName,
            batchCode: batch.batchCode || null,
            description: batch.description || null,
            applicationStartDate: batch.applicationStartDate
              ? new Date(batch.applicationStartDate)
              : null,
            applicationEndDate: batch.applicationEndDate
              ? new Date(batch.applicationEndDate)
              : null,
            maxSlots: batch.maxSlots || null,
            totalFundingAmount: batch.totalFundingAmount || null,
            fundingType: batch.fundingType || null,
            fundingCurrency: batch.fundingCurrency || "INR",
            isFundingAvailable: batch.isFundingAvailable ?? false,
            status: batchStatus,
          },
        });
      }

      return { ...newProgram, batch: createdBatch };
    });

    return program;
  },

  async getProgramsDropdown({ tenantKey, userId }) {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");
    const resolvedUserId = await resolveIncubationUserId(userId);
    const membership = await db.incubationUserTenant.findUnique({
      where: {
        incubationUserId_tenantId: {
          incubationUserId: resolvedUserId,
          tenantId: tenant.id,
        },
      },
      select: { isAdmin: true, isPanelMember: true, roleId: true },
    });

    if (membership?.isAdmin) {
      return db.program.findMany({
        where: { tenantId: tenant.id },
        select: { id: true, title: true },
        orderBy: { createdAt: "desc" },
      });
    }

    const [managerAssignments, panelAssignments] = await Promise.all([
      db.programManagerAssignment.findMany({
        where: {
          managerId: resolvedUserId,
          program: { tenantId: tenant.id },
        },
        select: { programId: true },
      }),
      db.programPanelAssignment.findMany({
        where: {
          panelMemberId: resolvedUserId,
          isActive: true,
          program: { tenantId: tenant.id },
        },
        select: { programId: true },
      }),
    ]);

    const programIds = [
      ...new Set([
        ...managerAssignments.map((a) => a.programId),
        ...panelAssignments.map((a) => a.programId),
      ]),
    ];

    if (programIds.length === 0) return [];

    return db.program.findMany({
      where: { tenantId: tenant.id, id: { in: programIds } },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    });
  },

  getAllPrograms: async ({
    tenantKey,
    userId,
    page = 1,
    limit = 10,
    search = "",
    sortBy = "createdAt",
    order = "desc",
  }) => {
    if (!tenantKey) {
      throw new ApiError(400, "tenantKey is required");
    }

    const {
      skip,
      take,
      where: searchWhere,
      orderBy,
    } = buildQueryOptions({
      page,
      limit,
      search,

      searchFields: ["title", "description", "objective", "benefits"],

      defaultFields: ["title"],
      sortBy,
      order,
    });

    const tenant = await db.tenant.findUnique({
      where: { tenantKey },
      select: { id: true },
    });

    if (!tenant) {
      throw new ApiError(404, "Tenant not found");
    }

    // Check if user is panel-member-only → show only assigned programs
    let panelOnlyProgramIds = null;
    if (userId) {
      const membership = await db.incubationUserTenant.findUnique({
        where: {
          incubationUserId_tenantId: {
            incubationUserId: userId,
            tenantId: tenant.id,
          },
        },
        select: { isAdmin: true, isPanelMember: true, roleId: true },
      });

      if (
        membership?.isPanelMember &&
        !membership.isAdmin &&
        !membership.roleId
      ) {
        // Panel-member-only: get assigned program IDs
        const assignments = await db.programPanelAssignment.findMany({
          where: { panelMemberId: userId, isActive: true },
          select: { programId: true },
        });
        panelOnlyProgramIds = [...new Set(assignments.map((a) => a.programId))];
      }
    }

    const whereClause = {
      tenantId: tenant.id,
      ...(panelOnlyProgramIds !== null && { id: { in: panelOnlyProgramIds } }),
      ...searchWhere,
    };

    const [programs, total] = await Promise.all([
      db.program.findMany({
        where: whereClause,
        skip,
        take,
        orderBy,
        include: {
          batches: {
            orderBy: {
              applicationStartDate: "asc",
            },
            take: 1,
          },

          startupApplications: {
            select: {
              id: true,
            },
          },

          programManagers: {
            include: {
              manager: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  imageUrl: true,
                },
              },
            },

            take: 1,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      db.program.count({
        where: whereClause,
      }),
    ]);

    const formattedPrograms = programs.map((program) => {
      const batch = program.batches[0];

      let duration = null;

      if (batch?.applicationStartDate && batch?.applicationEndDate) {
        const start = new Date(batch.applicationStartDate);

        const end = new Date(batch.applicationEndDate);

        const months =
          (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth());

        duration = `${months} Months`;
      }

      return {
        id: program.id,
        title: program.title,
        status: batch?.status || "DRAFT",
        manager: program.programManagers?.length
          ? program.programManagers[0].manager.name
          : null,
        managerImage: program.programManagers?.[0]?.manager?.imageUrl || null,
        registrations: program.startupApplications.length,
        startDate: batch?.applicationStartDate || null,
        endDate: batch?.applicationEndDate || null,
        duration,
      };
    });
    return {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
      data: formattedPrograms,
    };
  },

  async getProgramById(id, userId) {
    const program = await db.program.findUnique({
      where: { id },
      include: {
        schemeTypeRef: { select: { id: true, name: true } },
        governingBody: { select: { id: true, name: true } },
        programManagers: {
          include: {
            manager: {
              select: {
                id: true,
                name: true,
                email: true,
                imageUrl: true,
                tenantMemberships: {
                  select: {
                    role: { select: { roleName: true } },
                    tenantId: true,
                  },
                  where: { isActive: true },
                },
              },
            },
          },
        },
        programSchemeQuestions: {
          include: {
            schemeQuestion: true,
          },
        },
        evaluationQuestions: {
          include: {
            options: {
              orderBy: { order: "asc" },
            },
          },
          orderBy: { order: "asc" },
        },
        batches: {
          select: {
            id: true,
            batchName: true,
            batchCode: true,
            status: true,
            applicationStartDate: true,
            applicationEndDate: true,
            maxSlots: true,
            isActive: true,
            totalFundingAmount: true,
            fundingType: true,
            isFundingAvailable: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!program) return null;

    // If userId provided, check panel-member-only access
    if (userId) {
      const membership = await db.incubationUserTenant.findUnique({
        where: {
          incubationUserId_tenantId: {
            incubationUserId: userId,
            tenantId: program.tenantId,
          },
        },
        select: { isAdmin: true, isPanelMember: true, roleId: true },
      });

      if (
        membership?.isPanelMember &&
        !membership.isAdmin &&
        !membership.roleId
      ) {
        // Check if assigned to this program
        const assignment = await db.programPanelAssignment.findFirst({
          where: { programId: id, panelMemberId: userId, isActive: true },
        });
        if (!assignment) {
          throw new ApiError(403, "You are not assigned to this program");
        }
      }
    }

    return {
      ...program,
      schemeQuestions: program.programSchemeQuestions.map(
        (psq) => psq.schemeQuestion,
      ),
      programSchemeQuestions: undefined,
    };
  },
  async updateProgram(id, data) {
    const {
      tenantKey,
      updatedBy,
      title,
      description,
      objective,
      benefits,
      guidelines,
      schemeTypeId,
      schemeTypeName,
      governingBodyId,
      governingBodyName,
      eligibilityCriteria,
      nonEligibilityCriteria,
      expectedOutcome,
      externalLink,
      coverImage,
      programLogo,
      existingQuestionIds,
      newQuestions,
      evaluationQuestions,
      managerIds,
      includeUpdaterAsManager = true,
    } = data;

    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const program = await db.program.findUnique({
      where: { id },
      include: { tenant: true },
    });
    if (!program) throw new ApiError(404, "Program not found");

    if (program.tenantId !== tenant.id)
      throw new ApiError(403, "You are not authorized to edit this program");
    const resolvedUpdatedBy = await resolveIncubationUserId(updatedBy);

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (objective !== undefined) updateData.objective = objective;
    if (benefits !== undefined) updateData.benefits = benefits;
    if (guidelines !== undefined) updateData.guidelines = guidelines;
    if (eligibilityCriteria !== undefined)
      updateData.eligibilityCriteria = eligibilityCriteria;
    if (nonEligibilityCriteria !== undefined)
      updateData.nonEligibilityCriteria = nonEligibilityCriteria;
    if (expectedOutcome !== undefined)
      updateData.expectedOutcome = expectedOutcome;
    if (externalLink !== undefined) updateData.externalLink = externalLink;
    if (coverImage !== undefined) updateData.coverImage = coverImage;
    if (programLogo !== undefined) updateData.programLogo = programLogo;

    const updatedProgram = await db.$transaction(async (tx) => {
      if (schemeTypeId !== undefined || schemeTypeName !== undefined) {
        updateData.schemeTypeId = await resolveSchemeTypeId(tx, {
          schemeTypeId,
          schemeTypeName,
        });
      }
      if (governingBodyId !== undefined || governingBodyName !== undefined) {
        updateData.governingBodyId = await resolveGoverningBodyId(tx, {
          governingBodyId,
          governingBodyName,
        });
      }

      const programUpdate = Object.keys(updateData).length
        ? await tx.program.update({
            where: { id },
            data: updateData,
          })
        : program;
      if (managerIds !== undefined) {
        const allManagerIds = Array.from(
          new Set([
            ...(includeUpdaterAsManager ? [resolvedUpdatedBy] : []),
            ...managerIds,
          ]),
        );

        await tx.programManagerAssignment.deleteMany({
          where: { programId: id },
        });

        if (allManagerIds.length > 0) {
          await tx.programManagerAssignment.createMany({
            data: allManagerIds.map((mid) => ({
              programId: id,
              managerId: mid,
            })),
            skipDuplicates: true,
          });
        }
      }

      const schemeQuestionsUpdated =
        existingQuestionIds !== undefined || newQuestions !== undefined;
      if (schemeQuestionsUpdated) {
        await tx.programSchemeQuestion.deleteMany({ where: { programId: id } });

        const safeExistingIds = existingQuestionIds ?? [];
        const safeNewQuestions = newQuestions ?? [];

        if (safeExistingIds.length > 0) {
          const existingQuestions = await tx.schemeQuestion.findMany({
            where: { id: { in: safeExistingIds }, tenantId: tenant.id },
          });
          if (existingQuestions.length !== safeExistingIds.length) {
            throw new ApiError(
              400,
              "Some existing question IDs are invalid or do not belong to this tenant",
            );
          }
          await tx.programSchemeQuestion.createMany({
            data: safeExistingIds.map((qId) => ({
              programId: id,
              schemeQuestionId: qId,
            })),
            skipDuplicates: true,
          });
        }

        if (safeNewQuestions.length > 0) {
          for (const q of safeNewQuestions) {
            const created = await tx.schemeQuestion.create({
              data: {
                tenantId: tenant.id,
                questionText: q.questionText,
                questionType: q.questionType,
                isRequired: q.isRequired ?? false,
                options: q.options ?? [],
              },
            });
            await tx.programSchemeQuestion.create({
              data: {
                programId: id,
                schemeQuestionId: created.id,
              },
            });
          }
        }
      }

      if (evaluationQuestions !== undefined) {
        const existingQuestions = await tx.evaluationQuestion.findMany({
          where: { programId: id },
          select: { id: true },
        });

        if (existingQuestions.length > 0) {
          const answersExist = await tx.evaluationAnswer.findFirst({
            where: { questionId: { in: existingQuestions.map((q) => q.id) } },
            select: { id: true },
          });

          if (answersExist) {
            throw new ApiError(
              400,
              "Cannot replace evaluation questions because some have already been answered by panel members. Consider deactivating questions instead.",
            );
          }

          await tx.evaluationQuestion.deleteMany({ where: { programId: id } });
        }

        if (evaluationQuestions.length > 0) {
          for (let i = 0; i < evaluationQuestions.length; i++) {
            const q = evaluationQuestions[i];
            await tx.evaluationQuestion.create({
              data: {
                programId: id,
                questionText: q.questionText,
                weightage: q.weightage ?? 1.0,
                order: q.order ?? i + 1,
                scoringReference: q.scoringReference ?? null,
                options: {
                  create: (q.options ?? []).map((opt, index) => ({
                    optionText: opt.optionText,
                    score: opt.score ?? 0,
                    order: opt.order ?? index + 1,
                  })),
                },
              },
            });
          }
        }
      }

      const enrolledStartupMembers = await tx.startupMember.findMany({
        where: {
          isActive: true,
          isAdmin: true,

          startup: {
            programAssociations: {
              some: {
                programId: id,
                isActive: true,
              },
            },
          },
        },

        select: {
          userId: true,

          startup: {
            select: {
              programAssociations: {
                where: {
                  programId: id,
                  isActive: true,
                },

                select: {
                  id: true,
                },

                take: 1,
              },
            },
          },
        },
      });

      for (const member of enrolledStartupMembers) {
        const associationId = member.startup?.programAssociations?.[0]?.id;

        if (!associationId) continue;

        await NotificationService.send({
          recipientId: member.userId,
          type: "PROGRAM_UPDATE",
          category: "INCUBATION",
          priority: "MEDIUM",
          title: "Program Updated",
          message: `${program.title} is updated. Check it out now`,
          entityType: "Program",
          entityId: program.id,
          actionUrl: `/programs/associated/${associationId}`,
          actorId: updatedBy,
        });
      }

      return programUpdate;
    });

    return updatedProgram;
  },
  async getProgramRegistrations({
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

    const program = await db.program.findUnique({
      where: { id: programId },
      select: { id: true, tenantId: true },
    });
    if (!program) throw new ApiError(404, "Program not found");
    if (program.tenantId !== tenant.id)
      throw new ApiError(
        403,
        "You are not authorized to view these registrations",
      );

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
      tenantId: tenant.id,
      ...(batchId ? { batchId } : {}),
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
          batch: {
            select: {
              id: true,
              batchName: true,
              batchCode: true,
              status: true,
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
  getProgramRegistrationById: async ({
    tenantkey,
    programId,
    registrationId,
  }) => {
    const tenant = await db.tenant.findUnique({
      where: { tenantKey: tenantkey },
    });
    if (!tenant) throw new ApiError(404, "Invalid tenant");

    const registration = await db.startupApplication.findUnique({
      where: {
        id: registrationId,
        programId,
        tenantId: tenant.id,
      },
      include: {
        program: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
        batch: {
          select: {
            id: true,
            batchName: true,
            batchCode: true,
            status: true,
            applicationStartDate: true,
            applicationEndDate: true,
          },
        },
        startup: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            description: true,
            website: true,
            sector: true,
            stage: true,
            incorporationDate: true,
            registrationNumber: true,
            headquarters: true,
            contactEmail: true,
            contactPhone: true,
            linkedin: true,
            foundedYear: true,
            ideaDescription: true,
            conceptNote: true,
            aspectNote: true,
            status: true,
            createdAt: true,
            members: {
              where: { isActive: true },
              orderBy: [{ isAdmin: "desc" }, { joinedAt: "asc" }],
              select: {
                id: true,
                role: true,
                title: true,
                isAdmin: true,
                joinedAt: true,
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    profilePhoto: true,
                    headline: true,
                    bio: true,
                    location: {
                      select: { city: true, state: true, country: true },
                    },
                    socialLinks: {
                      select: { linkedin: true, twitter: true, github: true },
                    },
                  },
                },
              },
            },

            // ── Other applications by this startup (across programs / incubators) ──
            applications: {
              where: { id: { not: registrationId } },
              select: {
                id: true,
                status: true,
                submittedAt: true,
                createdAt: true,
                requestedFundingAmount: true,
                program: {
                  select: {
                    id: true,
                    title: true,
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
                  select: { id: true, batchName: true, batchCode: true },
                },
              },
              orderBy: { createdAt: "desc" },
              take: 20,
            },

            // ── Active program memberships with funding details ──
            programAssociations: {
              where: { isActive: true },
              select: {
                id: true,
                status: true,
                onboardedAt: true,
                offboardedAt: true,
                approvedFundingAmount: true,
                totalDisbursedAmount: true,
                program: {
                  select: {
                    id: true,
                    title: true,
                    fundingCurrency: true,
                    fundingType: true,
                  },
                },
                tenant: {
                  select: {
                    id: true,
                    organizationName: true,
                    tenantLogo: true,
                  },
                },
                batch: { select: { id: true, batchName: true } },
              },
              orderBy: { onboardedAt: "desc" },
            },

            // ── Active incubator (tenant) memberships ──
            tenantAssociations: {
              where: { isActive: true },
              select: {
                id: true,
                status: true,
                onboardedAt: true,
                tenant: {
                  select: {
                    id: true,
                    organizationName: true,
                    tenantLogo: true,
                  },
                },
              },
              orderBy: { onboardedAt: "desc" },
            },

            // ── All completed funding disbursements ──
            fundingDisbursements: {
              where: { status: "COMPLETED" },
              select: {
                id: true,
                amount: true,
                currency: true,
                disbursementType: true,
                trancheNumber: true,
                milestoneName: true,
                disbursedAt: true,
                program: { select: { id: true, title: true } },
                tenant: {
                  select: { id: true, organizationName: true },
                },
              },
              orderBy: { disbursedAt: "desc" },
              take: 50,
            },
          },
        },
        schemeAnswers: {
          select: {
            id: true,
            questionId: true,
            answerText: true,
            answerFileUrl: true,
            question: {
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
        documents: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            fileType: true,
            uploadedAt: true,
          },
          orderBy: { uploadedAt: "desc" },
        },
        _count: {
          select: {
            evaluations: true,
            changeRequests: true,
            documentRequests: true,
            history: true,
          },
        },
      },
    });

    if (!registration)
      throw new ApiError(
        404,
        "Registration not found or not associated with this program",
      );

    return registration;
  },

  requestChanges: async ({
    incubationUserId,
    applicationId,
    description,
    type,
    title,
  }) => {
    const resolvedId = await resolveIncubationUserId(incubationUserId);
    const application = await db.startupApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) throw new ApiError(404, "Application not found");

    const protectedStatuses = ["VERIFIED", "ONBOARDED", "REJECTED"];
    if (protectedStatuses.includes(application.status)) {
      throw new ApiError(
        400,
        `Cannot request changes when application is in ${application.status} status`,
      );
    }

    const changeRequest = await db.changeRequest.create({
      data: {
        title,
        applicationId,
        requestedById: resolvedId,
        description,
        type,
        status: "PENDING",
        tenantId: application.tenantId,
      },
    });

    await db.startupApplication.update({
      where: { id: applicationId },
      data: { status: "CHANGES_REQUESTED" },
    });
    await db.applicationHistory.create({
      data: {
        applicationId,
        changedById: resolvedId,
        oldStatus: application.status,
        newStatus: "CHANGES_REQUESTED",
        comment: "Change requested by incubation user",
      },
    });

    const startupMembers = await db.startupMember.findMany({
      where: {
        startupId: application.startupId,
        isActive: true,
      },

      select: {
        userId: true,
      },
    });

    const recipientIds = [...new Set(startupMembers.map((m) => m.userId))];

    const actor = await db.incubationUser.findUnique({
      where: {
        id: resolvedId,
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
        type: "CHANGE_REQUEST_CREATED",
        category: "INCUBATION",
        priority: "HIGH",
        title: "Changes Requested",
        message: title || "Changes have been requested for your application.",
        entityType: "StartupApplication",
        entityId: applicationId,
        actionUrl: `/application/${applicationId}/changes/${changeRequest.id}`,
        actorId: actor?.userId || null,
        actorName: actor?.name || null,
        actorAvatar: actor?.imageUrl || null,
        data: {
          changeRequestId: changeRequest.id,
          applicationId,
          type,
          status: "PENDING",
        },
      });
    }
    return changeRequest;
  },

  changeApplicationStatus: async ({
    incubationUserId,
    applicationId,
    newStatus,
    comment,
    approvedFundingAmount,
  }) => {
    const resolvedId = await resolveIncubationUserId(incubationUserId);

    const application = await db.startupApplication.findUnique({
      where: { id: applicationId },
      include: { program: { include: { tenant: true } } },
    });
    if (!application) throw new ApiError(404, "Application not found");

    const validStatuses = [
      "REVIEWED",
      "UNDER_EVALUATION",
      "EVALUATED",
      "REJECTED",
      "VERIFIED",
      "ONBOARDED",
    ];
    if (!validStatuses.includes(newStatus))
      throw new ApiError(
        400,
        `Invalid status. Allowed: ${validStatuses.join(", ")}`,
      );

    const oldStatus = application.status;

    const updated = await db.$transaction(async (tx) => {
      const updatedApp = await tx.startupApplication.update({
        where: { id: applicationId },
        data: { status: newStatus },
      });

      await tx.applicationHistory.create({
        data: {
          applicationId,
          changedById: resolvedId,
          oldStatus,
          newStatus,
          comment: comment ?? `Status changed to ${newStatus}`,
        },
      });
      if (newStatus === "REJECTED") {
        await tx.startupProgramAssociation.updateMany({
          where: {
            startupId: application.startupId,
            programId: application.programId,
            batchId: application.batchId || null,
          },
          data: { isActive: false, status: "REMOVED" },
        });
      }

      if (newStatus === "ONBOARDED") {
        const fundingAmount =
          approvedFundingAmount ?? application.requestedFundingAmount ?? null;

        await tx.startupTenantAssociation.upsert({
          where: {
            startupId_tenantId: {
              startupId: application.startupId,
              tenantId: application.program.tenant.id,
            },
          },
          update: { status: "ONBOARDED", isActive: true },
          create: {
            startupId: application.startupId,
            tenantId: application.program.tenant.id,
            status: "ONBOARDED",
            onboardedAt: new Date(),
          },
        });

        const existingAssociation =
          await tx.startupProgramAssociation.findFirst({
            where: {
              startupId: application.startupId,
              programId: application.programId,
              batchId: application.batchId || null,
            },
          });

        if (existingAssociation) {
          await tx.startupProgramAssociation.update({
            where: { id: existingAssociation.id },
            data: {
              status: "ACTIVE",
              isActive: true,
              ...(fundingAmount !== null
                ? { approvedFundingAmount: fundingAmount }
                : {}),
            },
          });
        } else {
          await tx.startupProgramAssociation.create({
            data: {
              startupId: application.startupId,
              programId: application.programId,
              tenantId: application.program.tenant.id,
              batchId: application.batchId || null,
              status: "ACTIVE",
              onboardedAt: new Date(),
              approvedFundingAmount: fundingAmount,
            },
          });
        }
      }

      let notificationMessage = `Your application status changed from ${oldStatus} to ${newStatus}`;

      if (newStatus === "ONBOARDED") {
        notificationMessage =
          "Congratulations! Your startup has been onboarded.";
      }

      if (newStatus === "REJECTED") {
        notificationMessage = "Unfortunately, your application was rejected.";
      }

      const startupMembers = await tx.startupMember.findMany({
        where: {
          startupId: application.startupId,
          isActive: true,
        },

        select: {
          userId: true,
        },
      });

      const recipientIds = [...new Set(startupMembers.map((m) => m.userId))];

      const association = await tx.startupProgramAssociation.findFirst({
        where: {
          startupId: application.startupId,
          programId: application.programId,
          batchId: application.batchId || null,
        },

        select: {
          id: true,
        },
      });

      const associationId = association?.id;

      if (recipientIds.length > 0) {
        await NotificationService.sendBulk({
          recipientIds,

          type: "APPLICATION_STATUS_CHANGED",

          category: "INCUBATION",

          priority: newStatus === "REJECTED" ? "HIGH" : "MEDIUM",

          title: "Application Status Updated",

          message: notificationMessage,

          entityType: "StartupApplication",

          entityId: applicationId,

          actionUrl: associationId
            ? `/programs/associated/${associationId}`
            : `/application/${applicationId}`,

          actorId: incubationUserId,
        });
      }
      return updatedApp;
    });

    return { applicationId, oldStatus, newStatus };
  },

  requestDocument: async ({
    incubationUserId,
    applicationId,
    description,
    title,
  }) => {
    const resolvedId = await resolveIncubationUserId(incubationUserId);

    const application = await db.startupApplication.findUnique({
      where: { id: applicationId },
    });
    if (!application) throw new ApiError(404, "Application not found");
    const protectedStatuses = ["VERIFIED", "ONBOARDED", "REJECTED"];
    if (protectedStatuses.includes(application.status)) {
      throw new ApiError(
        400,
        `Cannot request documents when application is in ${application.status} status`,
      );
    }

    const docRequest = await db.documentRequest.create({
      data: {
        applicationId,
        tenantId: application.tenantId,
        requestedById: resolvedId,
        title: title ?? "Document request",
        description: description ?? null,
        status: "PENDING",
      },
    });
    if (application.status !== "DOCS_REQUESTED") {
      await db.startupApplication.update({
        where: { id: applicationId },
        data: { status: "DOCS_REQUESTED" },
      });
    }

    await db.applicationHistory.create({
      data: {
        applicationId,
        changedById: resolvedId,
        oldStatus: application.status,
        newStatus: "DOCS_REQUESTED",
        comment: `Document requested: ${title ?? "Document request"}`,
      },
    });

    const startupMembers = await db.startupMember.findMany({
      where: {
        startupId: application.startupId,
        isActive: true,
      },

      select: {
        userId: true,
      },
    });

    const recipientIds = [...new Set(startupMembers.map((m) => m.userId))];

    const actor = await db.incubationUser.findUnique({
      where: {
        id: resolvedId,
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
        type: "DOCUMENT_REQUEST_CREATED",
        category: "INCUBATION",
        priority: "HIGH",
        title: title || "Document Request",
        message:
          description ||
          "New documents have been requested for your application.",
        entityType: "StartupApplication",
        entityId: applicationId,
        actionUrl: `/application/${applicationId}/documents/${docRequest.id}`,
        actorId: actor?.userId || null,
        actorName: actor?.name || null,
        actorAvatar: actor?.imageUrl || null,
        data: {
          documentRequestId: docRequest.id,
          applicationId,
          status: "PENDING",
          title: docRequest.title,
        },
      }).catch(() => {});
    }
    return docRequest;
  },

  requestStartupDocument: async ({
    incubationUserId,
    startupId,
    title,
    description,
  }) => {
    const resolvedId = await resolveIncubationUserId(incubationUserId);

    const startup = await db.startup.findUnique({
      where: { id: startupId },
    });

    if (!startup) {
      throw new ApiError(404, "Startup not found");
    }

    const startupTenant = await db.startupTenantAssociation.findFirst({
      where: {
        startupId,
        isActive: true,
      },
    });

    if (!startupTenant) {
      throw new ApiError(400, "Startup is not associated with any incubator");
    }

    const startupApplication = await db.startupApplication.findFirst({
      where: {
        startupId,
      },

      select: {
        id: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    if (!startupApplication) {
      throw new ApiError(400, "No startup application found for this startup");
    }

    const tenantMembership = await db.startupTenantAssociation.findFirst({
      where: {
        startupId,
      },
      select: {
        tenantId: true,
      },
    });

    if (!tenantMembership) {
      throw new ApiError(400, "Startup is not associated with any tenant");
    }

    const docRequest = await db.documentRequest.create({
      data: {
        applicationId: startupApplication.id,
        tenantId: tenantMembership.tenantId,
        requestedById: resolvedId,
        title: title || "Document Request",
        description: description || null,
        status: "PENDING",
      },
    });
    return docRequest;
  },

  submitEvaluation: async ({
    evaluatorId,
    applicationId,
    answers = [],
    remarks,
  }) => {
    const resolvedEvaluatorId = await resolveIncubationUserId(evaluatorId);

    const application = await db.startupApplication.findUnique({
      where: { id: applicationId },
      include: { program: true, startup: true },
    });
    if (!application) throw new ApiError(404, "Application not found");
    const questionsWithOptions = await db.evaluationQuestion.findMany({
      where: { programId: application.programId },
      include: { options: true },
    });
    if (!questionsWithOptions.length) {
      throw new ApiError(
        400,
        "No evaluation questions defined for this program",
      );
    }
    const questionMap = new Map(questionsWithOptions.map((q) => [q.id, q]));
    const answerData = [];
    let totalScore = 0;

    for (const ans of answers) {
      const question = questionMap.get(ans.questionId);
      if (!question) {
        throw new ApiError(400, `Invalid questionId: ${ans.questionId}`);
      }

      let computedScore = 0;
      if (ans.optionId) {
        const option = question.options.find((o) => o.id === ans.optionId);
        if (!option) {
          throw new ApiError(
            400,
            `Invalid optionId ${ans.optionId} for question ${ans.questionId}`,
          );
        }
        computedScore = option.score * (question.weightage || 1);
      } else if (typeof ans.score === "number") {
        if (ans.score < 0) {
          throw new ApiError(
            400,
            `Score cannot be negative for question ${ans.questionId}`,
          );
        }
        computedScore = ans.score * (question.weightage || 1);
      } else {
        throw new ApiError(
          400,
          `Either optionId or numeric score required for question ${ans.questionId}`,
        );
      }

      answerData.push({
        questionId: ans.questionId,
        optionId: ans.optionId ?? null,
        score: computedScore,
        comment: ans.comment ?? null,
      });
      totalScore += computedScore;
    }

    const evaluation = await db.$transaction(async (tx) => {
      const existing = await tx.evaluation.findUnique({
        where: {
          applicationId_evaluatorId: {
            applicationId,
            evaluatorId: resolvedEvaluatorId,
          },
        },
      });
      if (existing) {
        throw new ApiError(
          400,
          "You have already submitted an evaluation for this application",
        );
      }

      const newEval = await tx.evaluation.create({
        data: {
          applicationId,
          evaluatorId: resolvedEvaluatorId,
          totalScore,
          remarks: remarks ?? null,
        },
      });

      await tx.evaluationAnswer.createMany({
        data: answerData.map((a) => ({ evaluationId: newEval.id, ...a })),
      });

      return { ...newEval, totalScore };
    });
    const evalCount = await db.evaluation.count({
      where: { applicationId },
    });
    if (evalCount >= 1 && application.status !== "EVALUATED") {
      const oldStatus = application.status;
      await db.startupApplication.update({
        where: { id: applicationId },
        data: { status: "EVALUATED" },
      });
      await db.applicationHistory.create({
        data: {
          applicationId,
          changedById: resolvedEvaluatorId,
          oldStatus,
          newStatus: "EVALUATED",
          comment: "Application marked EVALUATED after evaluator submission",
        },
      });
    }

    const startupMembers = await db.startupMember.findMany({
      where: {
        startupId: application.startupId,
        isActive: true,
      },
      select: {
        userId: true,
      },
    });

    const recipientIds = [...new Set(startupMembers.map((m) => m.userId))];

    const actor = await db.incubationUser.findUnique({
      where: {
        id: resolvedEvaluatorId,
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
        type: "EVALUATION_COMPLETED",
        category: "INCUBATION",
        priority: "HIGH",
        title: "Application Evaluated",
        message: `${application.program?.title || "Your application"} has been evaluated.`,
        entityType: "Evaluation",
        entityId: evaluation.id,
        actionUrl: `/application/${applicationId}/evaluations`,
        actorId: actor?.userId || null,
        actorName: actor?.name || null,
        actorAvatar: actor?.imageUrl || null,
        data: {
          evaluationId: evaluation.id,
          applicationId,
          startupId: application.startupId,
          totalScore: evaluation.totalScore,
          status: "SUBMITTED",
        },
      }).catch(() => {});
    }
    return evaluation;
  },
  getPendingChanges: async ({ applicationId }) => {
    return db.changeRequest.findMany({
      where: {
        applicationId,
        status: "PENDING",
      },
      include: {
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
        responses: true,
      },
    });
  },

  getCompletedChanges: async ({ applicationId }) => {
    return db.changeRequest.findMany({
      where: {
        applicationId,
        status: "APPROVED",
      },
      include: {
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
        responses: true,
      },
    });
  },

  getReceivedChanges: async ({ applicationId }) => {
    return db.changeRequest.findMany({
      where: {
        applicationId,
        status: "RECEIVED",
      },
      include: {
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
        responses: {
          select: {
            id: true,
            responseText: true,
            fileUrl: true,
            respondedAt: true,
          },
        },
      },

      orderBy: {
        requestedAt: "desc",
      },
    });
  },

  reRequestChange: async ({
    incubationUserId,
    applicationId,
    changeRequestId,
    description,
  }) => {
    const resolvedId = await resolveIncubationUserId(incubationUserId);
    const existingChange = await db.changeRequest.findUnique({
      where: { id: changeRequestId },
    });

    if (!existingChange) throw new ApiError(404, "Change request not found");

    if (existingChange.status !== "RECEIVED") {
      throw new ApiError(
        400,
        "Only received changes can be re-requested for modifications",
      );
    }

    const updatedChange = await db.changeRequest.update({
      where: { id: changeRequestId },
      data: {
        description,
        status: "PENDING",
        resolvedAt: null,
      },
    });

    await db.startupApplication.update({
      where: { id: applicationId },
      data: { status: "CHANGES_REQUESTED" },
    });

    await db.applicationHistory.create({
      data: {
        applicationId,
        changedById: resolvedId,
        oldStatus: "CHANGES_RECEIVED",
        newStatus: "CHANGES_REQUESTED",
        comment: "Change re-requested by incubator",
      },
    });
    return updatedChange;
  },

  approveChange: async ({
    incubationUserId,
    applicationId,
    changeRequestId,
    comment,
  }) => {
    const resolvedId = await resolveIncubationUserId(incubationUserId);
    const changeRequest = await db.changeRequest.findUnique({
      where: { id: changeRequestId },
      include: { application: true },
    });

    if (!changeRequest) throw new ApiError(404, "Change request not found");
    if (changeRequest.status !== "RECEIVED") {
      throw new ApiError(400, "Only received changes can be approved");
    }

    const updatedChange = await db.changeRequest.update({
      where: { id: changeRequestId },
      data: {
        status: "APPROVED",
        resolvedAt: new Date(),
      },
    });

    const openPendingChanges = await db.changeRequest.count({
      where: { applicationId, status: { in: ["PENDING", "RECEIVED"] } },
    });

    const openDocRequests = await db.documentRequest.count({
      where: { applicationId, status: { in: ["PENDING", "REOPENED"] } },
    });

    if (openPendingChanges === 0 && openDocRequests === 0) {
      await db.startupApplication.update({
        where: { id: applicationId },
        data: { status: "REVIEWED" },
      });

      await db.applicationHistory.create({
        data: {
          applicationId,
          changedById: resolvedId,
          oldStatus: changeRequest.application.status,
          newStatus: "REVIEWED",
          comment: comment ?? "Change approved, application moved to REVIEWED",
        },
      });
    }

    return updatedChange;
  },

  rejectChange: async ({
    incubationUserId,
    applicationId,
    changeRequestId,
    comment,
  }) => {
    const resolvedId = await resolveIncubationUserId(incubationUserId);

    const changeRequest = await db.changeRequest.findUnique({
      where: { id: changeRequestId },
      include: { application: true },
    });

    if (!changeRequest) throw new ApiError(404, "Change request not found");
    if (
      changeRequest.status !== "RECEIVED" &&
      changeRequest.status !== "APPROVED"
    ) {
      throw new ApiError(400, "Only received/approved changes can be rejected");
    }
    const updatedChange = await db.changeRequest.update({
      where: { id: changeRequestId },
      data: {
        status: "PENDING",
        resolvedAt: null,
      },
    });
    await db.startupApplication.update({
      where: { id: applicationId },
      data: { status: "CHANGES_REQUESTED" },
    });

    await db.applicationHistory.create({
      data: {
        applicationId,
        changedById: resolvedId,
        oldStatus: changeRequest.application.status,
        newStatus: "CHANGES_REQUESTED",
        comment: comment ?? "Change rejected, moved back to pending",
      },
    });

    return updatedChange;
  },

  searchStartupsForProgram: async ({ query }) => {
    const q = query.trim();

    return db.startup.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { contactEmail: { contains: q, mode: "insensitive" } },
          {
            members: {
              some: {
                user: {
                  OR: [
                    {
                      firstName: { contains: q, mode: "insensitive" },
                    },
                    {
                      lastName: { contains: q, mode: "insensitive" },
                    },
                    { email: { contains: q, mode: "insensitive" } },
                  ],
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        contactEmail: true,
        sector: true,
        stage: true,
        foundedYear: true,
        logoUrl: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  },

  getStartupDetailsForIncubator: async ({ startupId }) => {
    const startup = await db.startup.findUnique({
      where: { id: startupId },
      include: {
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
              },
            },
          },
        },
        applications: {
          include: { program: { select: { id: true, title: true } } },
        },
      },
    });
    if (!startup) throw new ApiError(404, "Startup not found");
    return startup;
  },
  addExistingStartupToProgram: async ({
    incubationUserId,
    programId,
    startupId,
    batchId,
    status = "ONBOARDED",
  }) => {
    const resolvedId = await resolveIncubationUserId(incubationUserId);
    const program = await db.program.findUnique({
      where: { id: programId },
      include: { tenant: true },
    });
    if (!program) throw new ApiError(404, "Program not found");

    const startup = await db.startup.findUnique({ where: { id: startupId } });
    if (!startup) throw new ApiError(404, "Startup not found");

    if (batchId) {
      const batch = await db.programBatch.findUnique({
        where: { id: batchId },
      });
      if (!batch) throw new ApiError(404, "Batch not found");
      if (batch.programId !== programId)
        throw new ApiError(400, "Batch does not belong to this program");
    }

    const existingAppWhere = { startupId, programId };
    if (batchId) existingAppWhere.batchId = batchId;

    const existingApp = await db.startupApplication.findFirst({
      where: existingAppWhere,
    });
    if (existingApp) {
      throw new ApiError(
        400,
        "Startup already has an application for this program" +
          (batchId ? " batch" : ""),
      );
    }

    const result = await db.$transaction(async (tx) => {
      const app = await tx.startupApplication.create({
        data: {
          startupId,
          programId,
          tenantId: program.tenant.id,
          batchId: batchId || null,
          status,
          submittedAt: new Date(),
        },
      });
      await tx.startupTenantAssociation.upsert({
        where: {
          startupId_tenantId: { startupId, tenantId: program.tenant.id },
        },
        update: { isActive: true },
        create: {
          startupId,
          tenantId: program.tenant.id,
          status: "ACTIVE",
          onboardedAt: new Date(),
        },
      });

      const existingAssociation = await tx.startupProgramAssociation.findFirst({
        where: { startupId, programId, batchId: batchId || null },
      });
      if (existingAssociation) {
        await tx.startupProgramAssociation.update({
          where: { id: existingAssociation.id },
          data: { isActive: true },
        });
      } else {
        await tx.startupProgramAssociation.create({
          data: {
            startupId,
            programId,
            tenantId: program.tenant.id,
            batchId: batchId || null,
            status: "ACTIVE",
            onboardedAt: new Date(),
          },
        });
      }

      await tx.applicationHistory.create({
        data: {
          applicationId: app.id,
          changedById: resolvedId,
          oldStatus: null,
          newStatus: status,
          comment: "Startup manually added to program by incubator",
        },
      });

      return app;
    });

    return {
      applicationId: result.id,
      status: result.status,
    };
  },

  createStartupAndAddToProgram: async ({
    incubationUserId,
    programId,
    batchId,
    startup: startupPayload,
    user: userPayload,
    founders = [],
  }) => {
    const resolvedId = await resolveIncubationUserId(incubationUserId);

    if (!startupPayload.name) {
      throw new ApiError(400, "startup.name is required");
    }
    if (!userPayload.email || !userPayload.firstName || !userPayload.lastName) {
      throw new ApiError(
        400,
        "user.email, firstName, and lastName are required",
      );
    }
    const program = await db.program.findUnique({
      where: { id: programId },
      include: { tenant: true },
    });
    if (!program) throw new ApiError(404, "Program not found");

    const existingStartup = await db.startup.findFirst({
      where: {
        OR: [
          { contactEmail: startupPayload.contactEmail || userPayload.email },
          { name: { equals: startupPayload.name, mode: "insensitive" } },
        ],
      },
    });
    if (existingStartup) {
      throw new ApiError(
        400,
        "Startup with this name or email already exists. Use 'Add Existing Startup' instead.",
      );
    }
    const existingUser = await db.user.findUnique({
      where: { email: userPayload.email },
    });

    let username = null;
    if (!existingUser) {
      username = await generateUniqueUsername(userPayload.email);
    }

    let tempPassword = null;
    let hashedPassword = null;

    if (!existingUser) {
      tempPassword = Math.random().toString(36).slice(-8);
      hashedPassword = await hashPassword(tempPassword);
    }

    const result = await db.$transaction(async (tx) => {
      let primaryUser;

      if (existingUser) {
        primaryUser = existingUser;
      } else {
        primaryUser = await tx.user.create({
          data: {
            username,
            email: userPayload.email,
            passwordHash: hashedPassword,
            firstName: userPayload.firstName,
            lastName: userPayload.lastName,
            phone: userPayload.phone ?? null,
            emailVerified: false,
            profileCurrentStage: 0,
          },
        });
      }
      const slug = await generateUniquePageSlug(startupPayload.name, tx);

      console.log("slug =>", slug);

      const startupPage = await tx.page.create({
        data: {
          creatorId: primaryUser.id,
          name: startupPayload.name,
          slug,
          type: "STARTUP",

          tagline: startupPayload.tagline ?? null,
          description: startupPayload.description ?? null,

          headquarters: startupPayload.headquarters ?? null,
          sector: startupPayload.sector ?? null,
          stage: startupPayload.stage ?? null,

          email: startupPayload.contactEmail ?? userPayload.email,

          phone: startupPayload.contactPhone ?? null,

          website: startupPayload.website ?? null,
        },
      });

      await tx.pageMember.create({
        data: {
          pageId: startupPage.id,
          userId: primaryUser.id,
          role: "OWNER",
        },
      });

      const newStartup = await tx.startup.create({
        data: {
          name: startupPayload.name,
          pageId: startupPage.id,
          contactEmail: startupPayload.contactEmail ?? userPayload.email,
          contactPhone: startupPayload.contactPhone ?? null,
          sector: startupPayload.sector ?? null,
          stage: startupPayload.stage ?? null,
          description: startupPayload.description ?? null,
          website: startupPayload.website ?? null,
          status: "CREATED",
        },
      });

      await tx.startupMember.create({
        data: {
          startupId: newStartup.id,
          userId: primaryUser.id,
          role: "OWNER",
          isActive: true,
          isAdmin: true,
          joinedAt: new Date(),
        },
      });

      if (Array.isArray(founders) && founders.length > 0) {
        for (const founder of founders) {
          if (!founder.email) continue;

          if (founder.email.toLowerCase() === primaryUser.email.toLowerCase()) {
            continue;
          }

          let founderUser = await tx.user.findUnique({
            where: { email: founder.email },
          });
          if (!founderUser) {
            const founderUsername = await generateUniqueUsername(
              founder.email,
              tx,
            );

            const founderPassword = Math.random().toString(36).slice(-8);
            const founderHashedPassword = await hashPassword(founderPassword);

            founderUser = await tx.user.create({
              data: {
                username: founderUsername,
                email: founder.email,
                passwordHash: founderHashedPassword,
                firstName: founder.name?.split(" ")[0] || "Founder",
                lastName: founder.name?.split(" ").slice(1).join(" ") || "",
                phone: founder.phone ?? null,
                emailVerified: false,
                profileCurrentStage: 0,
              },
            });
          }
          const founderRole =
            founder.role === "FOUNDER" || founder.isFounder
              ? "OWNER"
              : founder.role || "MEMBER";

          await tx.startupMember.create({
            data: {
              startupId: newStartup.id,
              userId: founderUser.id,
              role: founderRole,
              title: founder.title ?? null,
              isActive: true,
              isAdmin: founderRole === "OWNER",
              joinedAt: new Date(),
            },
          });

          await tx.pageMember.create({
            data: {
              pageId: startupPage.id,
              userId: founderUser.id,
              role: founderRole === "OWNER" ? "ADMIN" : "MEMBER",
            },
          });
        }
      }
      await tx.startupTenantAssociation.create({
        data: {
          startupId: newStartup.id,
          tenantId: program.tenant.id,
          status: "ONBOARDED",
          onboardedAt: new Date(),
        },
      });
      await tx.startupProgramAssociation.create({
        data: {
          startupId: newStartup.id,
          programId,
          tenantId: program.tenant.id,
          batchId: batchId || null,
          status: "ACTIVE",
          onboardedAt: new Date(),
        },
      });
      const app = await tx.startupApplication.create({
        data: {
          startupId: newStartup.id,
          programId,
          tenantId: program.tenant.id,
          batchId: batchId || null,
          status: "ONBOARDED",
          submittedAt: new Date(),
        },
      });
      await tx.applicationHistory.create({
        data: {
          applicationId: app.id,
          changedById: resolvedId,
          oldStatus: null,
          newStatus: "ONBOARDED",
          comment: "Startup created and added to program by incubator",
        },
      });

      return {
        startup: newStartup,
        user: primaryUser,
        application: app,
        userExisted: !!existingUser,
        tempPassword,
      };
    });
    if (!result.userExisted) {
      await NotificationService.send({
        recipientId: result.user.id,
        type: "ADD_STARTUP_CREDENTIALS",
        category: "SYSTEM",
        priority: "HIGH",
        title: "Welcome to Ecosync",
        message: `Your startup has been onboarded to ${program.title}.`,
        data: {
          startupName: result.startup.name,
          programName: program.title,
          email: result.user.email,
          password: result.tempPassword,
        },
      });
    }

    return {
      startupId: result.startup.id,
      startupName: result.startup.name,
      userId: result.user.id,
      userEmail: result.user.email,
      applicationId: result.application.id,
      message: result.userExisted
        ? "Startup created and linked to existing user"
        : "Startup and new user created successfully. Credentials will be sent via email.",
    };
  },

  getStartupsByProgram: async ({
    programId,
    batchId,
    page = 1,
    limit = 10,
    search = "",
    sortBy = "createdAt",
    order = "desc",
    stage,
    status,
    programStatus,
  }) => {
    const program = await db.program.findUnique({
      where: { id: programId },
      include: { tenant: true },
    });

    if (!program) throw new ApiError(404, "Program not found");

    const cleanedStage = stage?.trim();
    const cleanedStatus = status?.trim();
    const cleanedProgramStatus = programStatus?.trim();

    const validProgramStatuses = [
      "ACTIVE",
      "COMPLETED",
      "OFFBOARDED",
      "REMOVED",
    ];
    if (
      cleanedProgramStatus &&
      !validProgramStatuses.includes(cleanedProgramStatus)
    ) {
      throw new ApiError(
        400,
        `Invalid programStatus. Allowed: ${validProgramStatuses.join(", ")}`,
      );
    }

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
        "startup.name",
        "startup.contactEmail",
        "startup.sector",
        "startup.stage",
      ],
      defaultFields: ["startup.name"],
      sortBy,
      order,
    });

    const whereClause = {
      programId,
      isActive: true,
      ...(batchId ? { batchId } : {}),
      ...(cleanedProgramStatus ? { status: cleanedProgramStatus } : {}),
      ...searchWhere,
      ...(cleanedStage || cleanedStatus
        ? {
            startup: {
              ...(cleanedStage
                ? { stage: { equals: cleanedStage, mode: "insensitive" } }
                : {}),
              ...(cleanedStatus ? { status: { equals: cleanedStatus } } : {}),
            },
          }
        : {}),
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
      db.startupProgramAssociation.count({ where: whereClause }),
    ]);
    const startups = associations.map((assoc) => ({
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
    }));

    return {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
      data: startups,
    };
  },

  removeStartupFromProgram: async ({ removedBy, programId, startupId }) => {
    const resolvedId = await resolveIncubationUserId(removedBy);

    const programAssociation = await db.startupProgramAssociation.findFirst({
      where: {
        startupId,
        programId,
      },
    });

    if (!programAssociation) {
      throw new ApiError(404, "Startup is not associated with this program");
    }

    await db.$transaction(async (tx) => {
      const application = await tx.startupApplication.findFirst({
        where: {
          startupId,
          programId,
        },
      });

      if (application) {
        await tx.applicationHistory.create({
          data: {
            applicationId: application.id,
            changedById: resolvedId,
            oldStatus: application.status,
            newStatus: "REMOVED",
            comment: "Startup removed from program",
          },
        });

        await tx.startupApplication.update({
          where: {
            id: application.id,
          },
          data: {
            status: "REMOVED",
          },
        });
      }

      await tx.startupProgramAssociation.delete({
        where: {
          id: programAssociation.id,
        },
      });
    });

    return {
      startupId,
      programId,
      removed: true,
    };
  },

  async getApplicationEvaluations({ applicationId }) {
    const application = await db.startupApplication.findUnique({
      where: { id: applicationId },
      select: { id: true },
    });
    if (!application) throw new ApiError(404, "Application not found");

    const evaluations = await db.evaluation.findMany({
      where: { applicationId },
      include: {
        evaluator: {
          select: { id: true, name: true, email: true, imageUrl: true },
        },
        answers: {
          include: {
            question: {
              select: { id: true, questionText: true, weightage: true },
            },
            option: { select: { id: true, optionText: true, score: true } },
          },
        },
      },
      orderBy: { evaluatedAt: "desc" },
    });

    return {
      applicationId,
      totalEvaluations: evaluations.length,
      evaluations: evaluations.map((e) => ({
        id: e.id,
        evaluatorId: e.evaluator.id,
        evaluatorName: e.evaluator.name,
        evaluatorEmail: e.evaluator.email,
        evaluatorImage: e.evaluator.imageUrl,
        totalScore: e.totalScore,
        remarks: e.remarks,
        status: e.status,
        evaluatedAt: e.evaluatedAt,
        answers: e.answers.map((a) => ({
          questionId: a.questionId,
          questionText: a.question.questionText,
          weightage: a.question.weightage,
          optionId: a.optionId,
          optionText: a.option?.optionText,
          optionScore: a.option?.score,
          score: a.score,
          comment: a.comment,
        })),
      })),
    };
  },

  async getEvaluationById({ applicationId, evaluationId }) {
    const evaluation = await db.evaluation.findFirst({
      where: { id: evaluationId, applicationId },
      include: {
        evaluator: {
          select: { id: true, name: true, email: true, imageUrl: true },
        },
        answers: {
          include: {
            question: {
              select: {
                id: true,
                questionText: true,
                weightage: true,
                scoringReference: true,
              },
            },
            option: { select: { id: true, optionText: true, score: true } },
          },
        },
      },
    });

    if (!evaluation) throw new ApiError(404, "Evaluation not found");

    return {
      id: evaluation.id,
      applicationId: evaluation.applicationId,
      evaluator: evaluation.evaluator,
      totalScore: evaluation.totalScore,
      remarks: evaluation.remarks,
      status: evaluation.status,
      evaluatedAt: evaluation.evaluatedAt,
      createdAt: evaluation.createdAt,
      answers: evaluation.answers.map((a) => ({
        questionId: a.questionId,
        questionText: a.question.questionText,
        weightage: a.question.weightage,
        scoringReference: a.question.scoringReference,
        optionId: a.optionId,
        optionText: a.option?.optionText,
        optionScore: a.option?.score,
        score: a.score,
        comment: a.comment,
      })),
    };
  },

  async getEvaluationSummary({ applicationId }) {
    const application = await db.startupApplication.findUnique({
      where: { id: applicationId },
      include: {
        startup: { select: { id: true, name: true, logoUrl: true } },
        program: { select: { id: true, title: true } },
      },
    });
    if (!application) throw new ApiError(404, "Application not found");

    const evaluations = await db.evaluation.findMany({
      where: { applicationId },
      include: {
        evaluator: { select: { id: true, name: true, imageUrl: true } },
        answers: {
          include: { question: true },
        },
      },
    });

    if (evaluations.length === 0) {
      return {
        applicationId,
        startup: application.startup,
        program: application.program,
        applicationScore: application.score,
        applicationStatus: application.status,
        averageScore: null,
        totalEvaluations: 0,
        evaluators: [],
        breakdown: [],
        stats: {
          minScore: null,
          maxScore: null,
          scoreRange: null,
        },
      };
    }

    const scores = evaluations.map((e) => e.totalScore || 0);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);

    const questionScores = {};
    for (const eval_ of evaluations) {
      for (const ans of eval_.answers) {
        if (!questionScores[ans.questionId]) {
          questionScores[ans.questionId] = {
            questionId: ans.questionId,
            questionText: ans.question.questionText,
            weightage: ans.question.weightage,
            scores: [],
          };
        }
        questionScores[ans.questionId].scores.push(ans.score || 0);
      }
    }

    const breakdown = Object.values(questionScores).map((q) => ({
      questionId: q.questionId,
      questionText: q.questionText,
      weightage: q.weightage,
      avgScore: q.scores.reduce((a, b) => a + b, 0) / q.scores.length,
      minScore: Math.min(...q.scores),
      maxScore: Math.max(...q.scores),
    }));

    return {
      applicationId,
      startup: application.startup,
      program: application.program,
      applicationScore: application.score,
      applicationStatus: application.status,
      averageScore,
      totalEvaluations: evaluations.length,
      evaluators: evaluations.map((e) => ({
        id: e.evaluator.id,
        name: e.evaluator.name,
        imageUrl: e.evaluator.imageUrl,
        score: e.totalScore,
        evaluatedAt: e.evaluatedAt,
      })),
      breakdown,
      stats: {
        minScore,
        maxScore,
        scoreRange: maxScore - minScore,
      },
    };
  },

  async getSchemeQuestions({ tenantKey, search, questionType }) {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const where = { tenantId: tenant.id };
    if (search && search.trim()) {
      where.questionText = { contains: search.trim(), mode: "insensitive" };
    }
    if (questionType) {
      where.questionType = questionType;
    }

    const questions = await db.schemeQuestion.findMany({
      where,
      include: {
        programLinks: {
          include: {
            program: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return questions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      questionType: q.questionType,
      isRequired: q.isRequired,
      options: q.options,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
      programs: q.programLinks.map((pl) => pl.program),
    }));
  },

  async createSchemeQuestion({
    tenantKey,
    questionText,
    questionType,
    isRequired,
    options,
  }) {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    if (!questionText || !questionText.trim())
      throw new ApiError(400, "questionText is required");
    if (!questionType) throw new ApiError(400, "questionType is required");

    return db.schemeQuestion.create({
      data: {
        tenantId: tenant.id,
        questionText: questionText.trim(),
        questionType,
        isRequired: isRequired ?? false,
        options: options ?? [],
      },
    });
  },

  async updateSchemeQuestion(
    id,
    { tenantKey, questionText, questionType, isRequired, options },
  ) {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const question = await db.schemeQuestion.findUnique({ where: { id } });
    if (!question) throw new ApiError(404, "Scheme question not found");
    if (question.tenantId !== tenant.id) {
      throw new ApiError(403, "You are not authorized to update this question");
    }

    const updateData = {};
    if (questionText !== undefined)
      updateData.questionText = questionText.trim();
    if (questionType !== undefined) updateData.questionType = questionType;
    if (isRequired !== undefined) updateData.isRequired = isRequired;
    if (options !== undefined) updateData.options = options;

    return db.schemeQuestion.update({
      where: { id },
      data: updateData,
    });
  },

  async deleteSchemeQuestion(id, tenantKey) {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const question = await db.schemeQuestion.findUnique({
      where: { id },
      include: { schemeAnswers: true },
    });
    if (!question) throw new ApiError(404, "Scheme question not found");
    if (question.tenantId !== tenant.id) {
      throw new ApiError(403, "You are not authorized to delete this question");
    }

    if (question.schemeAnswers.length > 0) {
      throw new ApiError(
        400,
        "Cannot delete question that has already been answered by startups",
      );
    }

    await db.$transaction(async (tx) => {
      await tx.programSchemeQuestion.deleteMany({
        where: { schemeQuestionId: id },
      });
      await tx.schemeQuestion.delete({ where: { id } });
    });

    return { success: true };
  },

  async createEvaluationQuestion(data) {
    const {
      tenantKey,
      programId,
      questionText,
      weightage = 1.0,
      order = 0,
      isActive = true,
      scoringReference = null,
      options = [],
    } = data;

    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const program = await db.program.findUnique({
      where: { id: programId },
      include: { tenant: true },
    });
    if (!program) throw new ApiError(404, "Program not found");
    if (program.tenantId !== tenant.id) {
      throw new ApiError(
        403,
        "You are not authorized to add questions to this program",
      );
    }

    let questionOrder = order;
    if (order === 0) {
      const lastQuestion = await db.evaluationQuestion.findFirst({
        where: { programId },
        orderBy: { order: "desc" },
      });
      questionOrder = lastQuestion ? lastQuestion.order + 1 : 1;
    }

    const evaluationQuestion = await db.evaluationQuestion.create({
      data: {
        programId,
        questionText,
        weightage,
        order: questionOrder,
        isActive,
        scoringReference,
        options: {
          create: options.map((option, index) => ({
            optionText: option.optionText,
            score: option.score ?? 0,
            order: option.order ?? index + 1,
          })),
        },
      },
      include: {
        options: {
          orderBy: { order: "asc" },
        },
      },
    });

    return evaluationQuestion;
  },

  async getEvaluationQuestionsByProgram(
    programId,
    tenantKey,
    includeInactive = false,
  ) {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const program = await db.program.findUnique({
      where: { id: programId },
    });
    if (!program) throw new ApiError(404, "Program not found");
    if (program.tenantId !== tenant.id) {
      throw new ApiError(
        403,
        "You are not authorized to view this program's questions",
      );
    }

    const whereClause = { programId };
    if (!includeInactive) {
      whereClause.isActive = true;
    }

    const evaluationQuestions = await db.evaluationQuestion.findMany({
      where: whereClause,
      include: {
        options: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: { order: "asc" },
    });

    return evaluationQuestions;
  },

  async getEvaluationQuestionById(id, tenantKey) {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const evaluationQuestion = await db.evaluationQuestion.findUnique({
      where: { id },
      include: {
        options: {
          orderBy: { order: "asc" },
        },
        program: {
          select: {
            id: true,
            title: true,
            tenantId: true,
          },
        },
      },
    });

    if (!evaluationQuestion) {
      throw new ApiError(404, "Evaluation question not found");
    }

    if (evaluationQuestion.program.tenantId !== tenant.id) {
      throw new ApiError(403, "You are not authorized to view this question");
    }

    return evaluationQuestion;
  },

  async updateEvaluationQuestion(id, data) {
    const {
      tenantKey,
      questionText,
      weightage,
      order,
      isActive,
      scoringReference,
      options,
    } = data;

    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const evaluationQuestion = await db.evaluationQuestion.findUnique({
      where: { id },
      include: {
        program: true,
      },
    });

    if (!evaluationQuestion) {
      throw new ApiError(404, "Evaluation question not found");
    }

    if (evaluationQuestion.program.tenantId !== tenant.id) {
      throw new ApiError(403, "You are not authorized to update this question");
    }

    const updateData = {};
    if (questionText !== undefined) updateData.questionText = questionText;
    if (weightage !== undefined) updateData.weightage = weightage;
    if (order !== undefined) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (scoringReference !== undefined)
      updateData.scoringReference = scoringReference;

    const updatedQuestion = await db.$transaction(async (tx) => {
      const questionUpdate = Object.keys(updateData).length
        ? await tx.evaluationQuestion.update({
            where: { id },
            data: updateData,
          })
        : evaluationQuestion;

      if (options !== undefined) {
        await tx.evaluationOption.deleteMany({
          where: { questionId: id },
        });

        if (options.length > 0) {
          await tx.evaluationOption.createMany({
            data: options.map((option, index) => ({
              questionId: id,
              optionText: option.optionText,
              score: option.score ?? 0,
              order: option.order ?? index + 1,
            })),
          });
        }
      }

      return await tx.evaluationQuestion.findUnique({
        where: { id },
        include: {
          options: {
            orderBy: { order: "asc" },
          },
        },
      });
    });

    return updatedQuestion;
  },

  async deleteEvaluationQuestion(id, tenantKey) {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const evaluationQuestion = await db.evaluationQuestion.findUnique({
      where: { id },
      include: {
        program: true,
        answers: true,
      },
    });

    if (!evaluationQuestion) {
      throw new ApiError(404, "Evaluation question not found");
    }

    if (evaluationQuestion.program.tenantId !== tenant.id) {
      throw new ApiError(403, "You are not authorized to delete this question");
    }

    if (evaluationQuestion.answers.length > 0) {
      throw new ApiError(
        400,
        "Cannot delete question that has already been answered. Consider deactivating it instead.",
      );
    }
    await db.evaluationQuestion.delete({
      where: { id },
    });

    return { success: true };
  },

  async reorderEvaluationQuestions(data) {
    const { tenantKey, programId, questionOrders } = data;

    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const program = await db.program.findUnique({
      where: { id: programId },
    });
    if (!program) throw new ApiError(404, "Program not found");
    if (program.tenantId !== tenant.id) {
      throw new ApiError(
        403,
        "You are not authorized to reorder this program's questions",
      );
    }

    const questionIds = questionOrders.map((q) => q.id);
    const questions = await db.evaluationQuestion.findMany({
      where: {
        id: { in: questionIds },
        programId,
      },
    });

    if (questions.length !== questionIds.length) {
      throw new ApiError(400, "Some questions do not belong to this program");
    }

    await db.$transaction(
      questionOrders.map((questionOrder) =>
        db.evaluationQuestion.update({
          where: { id: questionOrder.id },
          data: { order: questionOrder.order },
        }),
      ),
    );

    return { success: true };
  },

  async toggleActiveStatus(id, tenantKey) {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const evaluationQuestion = await db.evaluationQuestion.findUnique({
      where: { id },
      include: {
        program: true,
      },
    });

    if (!evaluationQuestion) {
      throw new ApiError(404, "Evaluation question not found");
    }

    if (evaluationQuestion.program.tenantId !== tenant.id) {
      throw new ApiError(403, "You are not authorized to update this question");
    }

    const updatedQuestion = await db.evaluationQuestion.update({
      where: { id },
      data: { isActive: !evaluationQuestion.isActive },
      include: {
        options: {
          orderBy: { order: "asc" },
        },
      },
    });

    return updatedQuestion;
  },

  bulkRegisterStartups: async ({
    incubationUserId,
    tenantKey,
    programId,
    batchId,
    startups: entries,
  }) => {
    const resolvedId = await resolveIncubationUserId(incubationUserId);

    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const program = await db.program.findUnique({
      where: { id: programId },
      include: { tenant: true },
    });
    if (!program) throw new ApiError(404, "Program not found");

    if (batchId) {
      const batch = await db.programBatch.findUnique({
        where: { id: batchId },
      });
      if (!batch) throw new ApiError(404, "Batch not found");
      if (batch.programId !== programId) {
        throw new ApiError(400, "Batch does not belong to this program");
      }
    }

    if (!Array.isArray(entries) || entries.length === 0) {
      throw new ApiError(
        400,
        "startups array is required and must not be empty",
      );
    }

    const results = { created: [], linked: [], reviewNeeded: [], errors: [] };

    const similarityScore = (a, b) => {
      const s1 = a.toLowerCase().trim();
      const s2 = b.toLowerCase().trim();
      if (s1 === s2) return 1;
      const longer = s1.length > s2.length ? s1 : s2;
      const shorter = s1.length > s2.length ? s2 : s1;
      if (longer.length === 0) return 1;
      const costs = [];
      for (let i = 0; i <= longer.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= shorter.length; j++) {
          if (i === 0) {
            costs[j] = j;
          } else if (j > 0) {
            let newValue = costs[j - 1];
            if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            }
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
        if (i > 0) costs[shorter.length] = lastValue;
      }
      return (longer.length - costs[shorter.length]) / longer.length;
    };

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const rowIndex = i + 1;

      try {
        if (!entry.founderEmail || !entry.startupName) {
          results.errors.push({
            row: rowIndex,
            data: entry,
            error: "founderEmail and startupName are required",
          });
          continue;
        }

        let ecosystemUser = await db.user.findUnique({
          where: { email: entry.founderEmail },
        });

        let userCreated = false;
        if (!ecosystemUser) {
          const username = await generateUniqueUsername(entry.founderEmail);
          const firstName =
            entry.founderFirstName || entry.startupName.split(" ")[0];
          const lastName = entry.founderLastName || "";
          const tempPassword = Math.random().toString(36).slice(-8);
          const hashedPw = await hashPassword(tempPassword);

          try {
            ecosystemUser = await db.user.create({
              data: {
                username,
                email: entry.founderEmail,
                passwordHash: hashedPw,
                firstName,
                lastName,
                phone: entry.founderPhone ?? null,
                emailVerified: false,
                profileCurrentStage: 0,
              },
            });
            userCreated = true;
          } catch (createErr) {
            if (createErr.code === "P2002") {
              ecosystemUser = await db.user.findUnique({
                where: { email: entry.founderEmail },
              });
              if (!ecosystemUser) throw createErr;
            } else {
              throw createErr;
            }
          }
        }

        const userStartups = await db.startupMember.findMany({
          where: { userId: ecosystemUser.id, isActive: true },
          include: { startup: true },
        });

        let matchedStartup = null;
        let possibleMatch = null;

        for (const sm of userStartups) {
          const score = similarityScore(sm.startup.name, entry.startupName);
          if (score === 1) {
            matchedStartup = sm.startup;
            break;
          }
          if (score >= 0.75 && !possibleMatch) {
            possibleMatch = { startup: sm.startup, score };
          }
        }

        if (!matchedStartup && !possibleMatch) {
          const globalMatch = await db.startup.findFirst({
            where: {
              OR: [
                { contactEmail: entry.founderEmail },
                { name: { equals: entry.startupName, mode: "insensitive" } },
              ],
            },
          });
          if (globalMatch) {
            const nameScore = similarityScore(
              globalMatch.name,
              entry.startupName,
            );
            if (
              nameScore === 1 ||
              globalMatch.contactEmail === entry.founderEmail
            ) {
              matchedStartup = globalMatch;
            } else if (nameScore >= 0.75) {
              possibleMatch = { startup: globalMatch, score: nameScore };
            }
          }
        }

        if (possibleMatch && !matchedStartup) {
          matchedStartup = possibleMatch.startup;
        }

        if (matchedStartup) {
          const existingApp = await db.startupApplication.findFirst({
            where: {
              startupId: matchedStartup.id,
              programId,
              ...(batchId ? { batchId } : {}),
              status: { notIn: ["REJECTED"] },
            },
          });

          if (existingApp) {
            results.linked.push({
              row: rowIndex,
              startupId: matchedStartup.id,
              startupName: matchedStartup.name,
              applicationId: existingApp.id,
              message: "Already has an application for this program/batch",
              wasAutoLinked: !!possibleMatch,
              matchScore: possibleMatch?.score,
            });
            continue;
          }

          const memberExists = await db.startupMember.findFirst({
            where: {
              startupId: matchedStartup.id,
              userId: ecosystemUser.id,
              isActive: true,
            },
          });
          if (!memberExists) {
            await db.startupMember.create({
              data: {
                startupId: matchedStartup.id,
                userId: ecosystemUser.id,
                role: "OWNER",
                isActive: true,
                isAdmin: true,
                joinedAt: new Date(),
              },
            });
          }

          const result = await db.$transaction(async (tx) => {
            const existingTenantAssoc =
              await tx.startupTenantAssociation.findFirst({
                where: { startupId: matchedStartup.id, tenantId: tenant.id },
              });
            if (!existingTenantAssoc) {
              await tx.startupTenantAssociation.create({
                data: {
                  startupId: matchedStartup.id,
                  tenantId: tenant.id,
                  status: "ONBOARDED",
                  onboardedAt: new Date(),
                },
              });
            }

            await tx.startupProgramAssociation.create({
              data: {
                startupId: matchedStartup.id,
                programId,
                tenantId: tenant.id,
                batchId: batchId || null,
                status: "ACTIVE",
                onboardedAt: new Date(),
              },
            });

            const app = await tx.startupApplication.create({
              data: {
                startupId: matchedStartup.id,
                programId,
                tenantId: tenant.id,
                batchId: batchId || null,
                status: "ONBOARDED",
                submittedAt: new Date(),
              },
            });

            await tx.applicationHistory.create({
              data: {
                applicationId: app.id,
                changedById: resolvedId,
                oldStatus: null,
                newStatus: "ONBOARDED",
                comment: "Bulk registered by incubator",
              },
            });

            return app;
          });

          results.linked.push({
            row: rowIndex,
            startupId: matchedStartup.id,
            startupName: matchedStartup.name,
            applicationId: result.id,
            userCreated,
            wasAutoLinked: !!possibleMatch,
            matchScore: possibleMatch?.score,
          });
        } else {
          const result = await db.$transaction(async (tx) => {
            const startupPage = await tx.page.create({
              data: {
                creatorId: ecosystemUser.id,
                name: entry.startupName,
                slug: await generateUniqueSlug(entry.startupName, tx),
                type: "STARTUP",

                tagline: entry.tagline ?? null,
                description: entry.description ?? null,

                headquarters: entry.headquarters ?? null,
                sector: entry.sector ?? null,
                stage: entry.stage ?? null,

                email: entry.contactEmail ?? entry.founderEmail,

                phone: entry.contactPhone ?? entry.founderPhone ?? null,

                website: entry.website ?? null,
              },
            });

            await tx.pageMember.create({
              data: {
                pageId: startupPage.id,
                userId: ecosystemUser.id,
                role: "OWNER",
              },
            });

            const newStartup = await tx.startup.create({
              data: {
                name: entry.startupName,
                pageId: startupPage.id,
                contactEmail: entry.contactEmail ?? entry.founderEmail,
                contactPhone: entry.contactPhone ?? null,
                sector: entry.sector ?? null,
                stage: entry.stage ?? null,
                description: entry.description ?? null,
                website: entry.website ?? null,
                status: "CREATED",
              },
            });

            await tx.startupMember.create({
              data: {
                startupId: newStartup.id,
                userId: ecosystemUser.id,
                role: "OWNER",
                isActive: true,
                isAdmin: true,
                joinedAt: new Date(),
              },
            });

            await tx.startupTenantAssociation.create({
              data: {
                startupId: newStartup.id,
                tenantId: tenant.id,
                status: "ONBOARDED",
                onboardedAt: new Date(),
              },
            });

            await tx.startupProgramAssociation.create({
              data: {
                startupId: newStartup.id,
                programId,
                tenantId: tenant.id,
                batchId: batchId || null,
                status: "ACTIVE",
                onboardedAt: new Date(),
              },
            });

            const app = await tx.startupApplication.create({
              data: {
                startupId: newStartup.id,
                programId,
                tenantId: tenant.id,
                batchId: batchId || null,
                status: "ONBOARDED",
                submittedAt: new Date(),
              },
            });

            await tx.applicationHistory.create({
              data: {
                applicationId: app.id,
                changedById: resolvedId,
                oldStatus: null,
                newStatus: "ONBOARDED",
                comment: "Bulk registered by incubator (new startup created)",
              },
            });

            return { startup: newStartup, page: startupPage, application: app };
          });

          results.created.push({
            row: rowIndex,
            startupId: result.startup.id,
            startupName: result.startup.name,
            pageId: result.page.id,
            pageSlug: result.page.slug,
            applicationId: result.application.id,
            userCreated,
            userId: ecosystemUser.id,
          });
        }
      } catch (err) {
        results.errors.push({
          row: rowIndex,
          data: entry,
          error: err.message,
        });
      }
    }

    return {
      summary: {
        total: entries.length,
        created: results.created.length,
        linked: results.linked.length,
        errors: results.errors.length,
      },
      ...results,
    };
  },

  bulkRequestDocuments: async ({
    incubationUserId,
    tenantKey,
    applicationIds,
    title,
    description,
  }) => {
    const resolvedId = await resolveIncubationUserId(incubationUserId);

    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      throw new ApiError(400, "applicationIds array is required");
    }
    if (!title) throw new ApiError(400, "title is required");

    const results = { success: [], errors: [] };

    for (const applicationId of applicationIds) {
      try {
        const docRequest = await db.$transaction(async (tx) => {
          const application = await tx.startupApplication.findUnique({
            where: { id: applicationId },
          });

          if (!application) {
            throw new ApiError(404, "Application not found");
          }

          if (application.tenantId !== tenant.id) {
            throw new ApiError(
              400,
              "Application does not belong to this tenant",
            );
          }

          const request = await tx.documentRequest.create({
            data: {
              applicationId,
              tenantId: tenant.id,
              requestedById: resolvedId,
              title,
              description: description || null,
              status: "PENDING",
            },
          });

          if (
            !["DOCS_REQUESTED", "DOCS_RECEIVED"].includes(application.status)
          ) {
            await tx.startupApplication.update({
              where: { id: applicationId },
              data: { status: "DOCS_REQUESTED" },
            });

            await tx.applicationHistory.create({
              data: {
                applicationId,
                changedById: resolvedId,
                oldStatus: application.status,
                newStatus: "DOCS_REQUESTED",
                comment: `Bulk document request: ${title}`,
              },
            });
          }

          return request;
        });

        results.success.push({
          applicationId,
          documentRequestId: docRequest.id,
        });
      } catch (err) {
        results.errors.push({ applicationId, error: err.message });
      }
    }

    return {
      summary: {
        total: applicationIds.length,
        success: results.success.length,
        errors: results.errors.length,
      },
      ...results,
    };
  },

  async getDocumentRequestsByProgram({
    tenantKey,
    programId,
    batchId,
    status,
  }) {
    const tenant = await db.tenant.findFirst({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const where = {
      application: {
        programId,
        program: { tenantId: tenant.id },
        ...(batchId ? { batchId } : {}),
      },
    };
    if (status) where.status = status;

    const requests = await db.documentRequest.findMany({
      where,
      include: {
        application: {
          select: {
            id: true,
            status: true,
            startup: { select: { id: true, name: true, logoUrl: true } },
            batch: { select: { id: true, batchName: true, batchCode: true } },
          },
        },
        responses: {
          select: {
            id: true,
            fileUrl: true,
            comment: true,
            status: true,
            respondedAt: true,
            files: {
              select: {
                id: true,
                fileName: true,
                fileUrl: true,
                fileType: true,
                sizeBytes: true,
              },
            },
          },
          orderBy: { respondedAt: "desc" },
        },
        requestedBy: {
          select: { id: true, name: true },
        },
      },
      orderBy: { requestedAt: "desc" },
    });

    return requests.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      status: r.status,
      requestedAt: r.requestedAt,
      resolvedAt: r.resolvedAt,
      requestedBy: r.requestedBy,
      application: r.application,
      startup: r.application.startup,
      batch: r.application.batch,
      responses: r.responses,
    }));
  },

  async getDocumentRequestById({ tenantKey, documentRequestId }) {
    const tenant = await db.tenant.findFirst({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const request = await db.documentRequest.findFirst({
      where: { id: documentRequestId, tenantId: tenant.id },
      include: {
        application: {
          select: {
            id: true,
            status: true,
            startup: { select: { id: true, name: true, logoUrl: true } },
            batch: { select: { id: true, batchName: true, batchCode: true } },
          },
        },
        requestedBy: { select: { id: true, name: true, email: true } },
        responses: {
          include: { files: true },
          orderBy: { respondedAt: "desc" },
        },
      },
    });
    if (!request) throw new ApiError(404, "Document request not found");
    return request;
  },

  async getDocumentResponseById({ tenantKey, responseId }) {
    const tenant = await db.tenant.findFirst({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const response = await db.documentResponse.findUnique({
      where: { id: responseId },
      include: {
        files: true,
        documentRequest: {
          include: {
            application: {
              select: {
                id: true,
                tenantId: true,
                startup: { select: { id: true, name: true, logoUrl: true } },
              },
            },
          },
        },
      },
    });
    if (
      !response ||
      response.documentRequest.application.tenantId !== tenant.id
    ) {
      throw new ApiError(404, "Document response not found");
    }
    return response;
  },

  async reopenDocumentRequest({
    incubationUserId,
    tenantKey,
    documentRequestId,
    comment,
  }) {
    const tenant = await db.tenant.findFirst({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const resolvedId = await resolveIncubationUserId(incubationUserId);

    const docReq = await db.documentRequest.findFirst({
      where: { id: documentRequestId, tenantId: tenant.id },
      include: { application: true },
    });
    if (!docReq) throw new ApiError(404, "Document request not found");
    if (docReq.status !== "RESOLVED") {
      throw new ApiError(
        400,
        "Only resolved document requests can be reopened",
      );
    }

    return db.$transaction(async (tx) => {
      const updated = await tx.documentRequest.update({
        where: { id: documentRequestId },
        data: { status: "REOPENED", resolvedAt: null },
      });

      if (docReq.application.status !== "DOCS_REQUESTED") {
        await tx.startupApplication.update({
          where: { id: docReq.applicationId },
          data: { status: "DOCS_REQUESTED" },
        });
        await tx.applicationHistory.create({
          data: {
            applicationId: docReq.applicationId,
            changedById: resolvedId,
            oldStatus: docReq.application.status,
            newStatus: "DOCS_REQUESTED",
            comment:
              comment ?? `Document reopened: ${docReq.title ?? "request"}`,
          },
        });
      }

      return updated;
    });
  },

  async createDataCollectionRequest({
    incubationUserId,
    tenantKey,
    programId,
    batchId,
    title,
    description,
    requestType,
    targetType,
    dueDate,
    startupIds,
    questions = [],
  }) {
    const resolvedId = await resolveIncubationUserId(incubationUserId);

    const tenant = await db.tenant.findFirst({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const program = await db.program.findUnique({ where: { id: programId } });
    if (!program || program.tenantId !== tenant.id)
      throw new ApiError(404, "Program not found");

    let targetStartups = [];

    if (startupIds && startupIds.length > 0) {
      const applications = await db.startupApplication.findMany({
        where: {
          programId,
          ...(batchId ? { batchId } : {}),
          startupId: { in: startupIds },
          status: { notIn: ["REJECTED"] },
        },
        select: { startupId: true, id: true },
      });
      const appMap = {};
      for (const app of applications) {
        appMap[app.startupId] = app.id;
      }
      targetStartups = startupIds.map((sid) => ({
        startupId: sid,
        applicationId: appMap[sid] || null,
      }));
    } else if (targetType === "ASSOCIATED") {
      const associations = await db.startupProgramAssociation.findMany({
        where: {
          programId,
          ...(batchId ? { batchId } : {}),
          isActive: true,
        },
        select: { startupId: true },
      });

      const associatedStartupIds = associations.map((a) => a.startupId);
      const applications = await db.startupApplication.findMany({
        where: {
          programId,
          ...(batchId ? { batchId } : {}),
          startupId: { in: associatedStartupIds },
          status: { notIn: ["REJECTED"] },
        },
        select: { startupId: true, id: true },
      });
      const appMap = {};
      for (const app of applications) {
        appMap[app.startupId] = app.id;
      }
      targetStartups = associations.map((a) => ({
        startupId: a.startupId,
        applicationId: appMap[a.startupId] || null,
      }));
    } else if (targetType === "APPLICANT") {
      const applications = await db.startupApplication.findMany({
        where: {
          programId,
          ...(batchId ? { batchId } : {}),
          status: { notIn: ["REJECTED", "ONBOARDED"] },
        },
        select: { startupId: true, id: true },
      });
      targetStartups = applications.map((a) => ({
        startupId: a.startupId,
        applicationId: a.id,
      }));
    }

    if (targetStartups.length === 0) {
      throw new ApiError(400, "No target startups found for this request");
    }

    const result = await db.$transaction(async (tx) => {
      const request = await tx.dataCollectionRequest.create({
        data: {
          programId,
          batchId: batchId || null,
          tenantId: tenant.id,
          requestedById: resolvedId,
          title,
          description: description || null,
          requestType: requestType || "MIXED",
          targetType: targetType || "ASSOCIATED",
          dueDate: dueDate ? new Date(dueDate) : null,
          questions:
            questions && questions.length > 0
              ? {
                  create: questions.map((q, index) => ({
                    questionText: q.questionText,
                    questionType: q.questionType || "TEXT",
                    isRequired: !!q.isRequired,
                    options: q.options || null,
                    order: q.order !== undefined ? q.order : index,
                  })),
                }
              : undefined,
        },
      });

      const uniqueStartups = [
        ...new Map(targetStartups.map((s) => [s.startupId, s])).values(),
      ];

      await tx.dataCollectionAssignment.createMany({
        data: uniqueStartups.map((s) => ({
          dataCollectionRequestId: request.id,
          startupId: s.startupId,
          applicationId: s.applicationId || null,
        })),
      });

      return {
        ...request,
        assignmentCount: uniqueStartups.length,
      };
    });

    return result;
  },

  async updateDataCollectionRequest({
    tenantKey,
    requestId,
    title,
    description,
    dueDate,
    questions,
  }) {
    const tenant = await db.tenant.findFirst({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const request = await db.dataCollectionRequest.findUnique({
      where: { id: requestId },
      include: { assignments: true },
    });

    if (!request || request.tenantId !== tenant.id) {
      throw new ApiError(404, "Data collection request not found");
    }

    if (request.status === "CLOSED") {
      throw new ApiError(400, "Cannot update a closed request");
    }

    if (questions) {
      const hasSubmissions = request.assignments.some(
        (a) => a.status !== "PENDING" && a.status !== "RESUBMIT_REQUESTED",
      );
      if (hasSubmissions) {
        throw new ApiError(
          400,
          "Cannot modify questions because some startups have already submitted responses",
        );
      }
    }

    const updated = await db.$transaction(async (tx) => {
      if (questions) {
        await tx.dataCollectionQuestion.deleteMany({
          where: { requestId },
        });
      }

      return await tx.dataCollectionRequest.update({
        where: { id: requestId },
        data: {
          title: title !== undefined ? title : undefined,
          description: description !== undefined ? description : undefined,
          dueDate:
            dueDate !== undefined
              ? dueDate
                ? new Date(dueDate)
                : null
              : undefined,
          ...(questions && {
            questions: {
              create: questions.map((q, index) => ({
                questionText: q.questionText,
                questionType: q.questionType || "TEXT",
                isRequired: !!q.isRequired,
                options: q.options || null,
                order: q.order !== undefined ? q.order : index,
              })),
            },
          }),
        },
        include: { questions: { orderBy: { order: "asc" } } },
      });
    });

    return updated;
  },

  async getDataCollectionRequests({ tenantKey, programId, batchId, status }) {
    const tenant = await db.tenant.findFirst({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const where = {
      programId,
      tenantId: tenant.id,
      ...(batchId ? { batchId } : {}),
      ...(status ? { status } : {}),
    };

    const requests = await db.dataCollectionRequest.findMany({
      where,
      include: {
        requestedBy: { select: { id: true, name: true } },
        batch: { select: { id: true, batchName: true } },
        assignments: {
          select: { id: true, status: true, startupId: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return requests.map((r) => {
      const total = r.assignments.length;
      const submitted = r.assignments.filter(
        (a) => a.status === "SUBMITTED",
      ).length;
      const approved = r.assignments.filter(
        (a) => a.status === "APPROVED",
      ).length;
      const pending = r.assignments.filter(
        (a) => a.status === "PENDING",
      ).length;

      return {
        id: r.id,
        title: r.title,
        description: r.description,
        requestType: r.requestType,
        targetType: r.targetType,
        status: r.status,
        dueDate: r.dueDate,
        createdAt: r.createdAt,
        requestedBy: r.requestedBy,
        batch: r.batch,
        stats: { total, pending, submitted, approved },
      };
    });
  },

  async getDataCollectionRequestById({ tenantKey, requestId }) {
    const tenant = await db.tenant.findFirst({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const request = await db.dataCollectionRequest.findUnique({
      where: { id: requestId },
      include: {
        requestedBy: { select: { id: true, name: true } },
        program: { select: { id: true, title: true } },
        batch: { select: { id: true, batchName: true, batchCode: true } },
        questions: { orderBy: { order: "asc" } },
        assignments: {
          include: {
            startup: { select: { id: true, name: true, logoUrl: true } },
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
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!request || request.tenantId !== tenant.id) {
      throw new ApiError(404, "Data collection request not found");
    }

    return request;
  },

  async reviewDataCollectionSubmission({
    tenantKey,
    incubationUserId,
    assignmentId,
    action,
    reviewNote,
  }) {
    const tenant = await db.tenant.findFirst({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");
    const resolvedId = await resolveIncubationUserId(incubationUserId);

    const assignment = await db.dataCollectionAssignment.findUnique({
      where: { id: assignmentId },
      include: { dataCollectionRequest: true },
    });

    if (
      !assignment ||
      assignment.dataCollectionRequest.tenantId !== tenant.id
    ) {
      throw new ApiError(404, "Assignment not found");
    }
    if (assignment.status !== "SUBMITTED") {
      throw new ApiError(
        400,
        `Cannot review an assignment with status ${assignment.status}. Only SUBMITTED assignments can be reviewed.`,
      );
    }

    const newStatus =
      action === "APPROVE"
        ? "APPROVED"
        : action === "REJECT"
          ? "REJECTED"
          : "RESUBMIT_REQUESTED";

    const updated = await db.dataCollectionAssignment.update({
      where: { id: assignmentId },
      data: {
        status: newStatus,
        reviewedAt: new Date(),
        reviewedById: resolvedId,
        reviewNote: reviewNote || null,
      },
    });

    return updated;
  },

  async closeDataCollectionRequest({ tenantKey, requestId }) {
    const tenant = await db.tenant.findFirst({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const request = await db.dataCollectionRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.tenantId !== tenant.id) {
      throw new ApiError(404, "Data collection request not found");
    }
    if (request.status === "CLOSED") {
      throw new ApiError(400, "Request is already closed");
    }

    return db.dataCollectionRequest.update({
      where: { id: requestId },
      data: { status: "CLOSED" },
    });
  },
};
