import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { hashPassword } from "../../../utils/helperFunctions.js";
import { findOrCreateEcosystemUser } from "../../../utils/userBridge.js";
import { NotificationService } from "../../common/notification.service.js";
export const panelService = {
  async invitePanelMember({ tenantKey, name, email, password, addedById }) {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const existingUser = await db.incubationUser.findUnique({
      where: { email },
    });
    const hashedPassword = await hashPassword(password);

    if (existingUser) {
      const existingMembership = await db.incubationUserTenant.findUnique({
        where: {
          incubationUserId_tenantId: {
            incubationUserId: existingUser.id,
            tenantId: tenant.id,
          },
        },
      });

      if (existingMembership) {
        if (existingMembership.isPanelMember) {
          throw new ApiError(
            400,
            "User is already a panel member for this tenant",
          );
        }
        await db.incubationUserTenant.update({
          where: { id: existingMembership.id },
          data: { isPanelMember: true },
        });
        return {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          isPanelMember: true,
        };
      }

      await db.incubationUserTenant.create({
        data: {
          incubationUserId: existingUser.id,
          tenantId: tenant.id,
          isPanelMember: true,
          isAdmin: false,
        },
      });
      return {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        isPanelMember: true,
      };
    }

    const result = await db.$transaction(async (tx) => {
      const ecosystemUser = await findOrCreateEcosystemUser({
        email,
        name,
        passwordHash: hashedPassword,
        tx,
      });

      const newUser = await tx.incubationUser.create({
        data: {
          name,
          email,
          password: hashedPassword,
          userId: ecosystemUser.id,
        },
      });

      await tx.incubationUserTenant.create({
        data: {
          incubationUserId: newUser.id,
          tenantId: tenant.id,
          isPanelMember: true,
          isAdmin: false,
        },
      });

      return {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        isPanelMember: true,
      };
    });

    return result;
  },

  async getPanelMembers({ tenantKey }) {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const memberships = await db.incubationUserTenant.findMany({
      where: {
        tenantId: tenant.id,
        isPanelMember: true,
        isActive: true,
      },
      include: {
        incubationUser: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
            createdAt: true,
            programsAsPanel: {
              where: {
                isActive: true,
              },
              select: {
                programId: true,
                program: { select: { id: true, title: true } },
              },
            },
          },
        },
      },
    });

    return memberships.map((m) => m.incubationUser);
  },

  async assignPanelMembers({
    programId,
    batchId,
    userIds,
    assignedById,
    tenantId,
  }) {
    const program = await db.program.findUnique({
      where: { id: programId },
      select: { id: true, tenantId: true },
    });
    if (!program) throw new ApiError(404, "Program not found");

    const assignerMembership = await db.incubationUserTenant.findUnique({
      where: {
        incubationUserId_tenantId: {
          incubationUserId: assignedById,
          tenantId: program.tenantId,
        },
      },
      select: { id: true, isActive: true },
    });
    if (!assignerMembership || !assignerMembership.isActive) {
      throw new ApiError(
        403,
        "You are not authorized to assign panel members for this program",
      );
    }

    if (batchId) {
      const batch = await db.programBatch.findUnique({
        where: { id: batchId },
      });
      if (!batch || batch.programId !== programId) {
        throw new ApiError(400, "Invalid batch for this program");
      }
    }

    const assigned = [];
    const errors = [];

    for (const userId of userIds) {
      try {
        const user = await db.incubationUser.findUnique({
          where: { id: userId },
        });
        if (!user) {
          errors.push({ userId, error: "User not found" });
          continue;
        }

        const userMembership = await db.incubationUserTenant.findUnique({
          where: {
            incubationUserId_tenantId: {
              incubationUserId: userId,
              tenantId: program.tenantId,
            },
          },
        });
        if (!userMembership || !userMembership.isActive) {
          errors.push({
            userId,
            error: "User does not belong to this program's organization",
          });
          continue;
        }
        if (!userMembership.isPanelMember) {
          await db.incubationUserTenant.update({
            where: { id: userMembership.id },
            data: { isPanelMember: true },
          });
        }

       await db.programPanelAssignment.create({
          data: {
            programId,
            panelMemberId: userId,
            batchId: batchId || null,
            assignedById,
          },
        });

        assigned.push(userId);
        await NotificationService.send({
          recipientId: user.userId,
          type: "PANEL_ASSIGNED",
          category: "INCUBATION",
          priority: "MEDIUM",
          title: "Panel Assignment",
          message: batchId
            ? `You have been assigned as a panel member for a program batch.`
            : `You have been assigned as a panel member for a program.`,
          entityType: "Program",
          entityId: programId,
          actionUrl: `/programs/${programId}`,
          actorId: assignedById,
        });
      } catch (err) {
        if (err.code === "P2002") {
          errors.push({
            userId,
            error:
              "Already assigned to this program" + (batchId ? "/batch" : ""),
          });
        } else {
          errors.push({ userId, error: err.message });
        }
      }
    }

    return { assigned, errors };
  },

  async removePanelMember({ programId, panelMemberId, batchId }) {
    const where = { programId, panelMemberId, isActive: true };
    if (batchId) where.batchId = batchId;

    const assignment = await db.programPanelAssignment.findFirst({ where });
    if (!assignment) throw new ApiError(404, "Assignment not found");

    await db.programPanelAssignment.update({
      where: { id: assignment.id },
      data: { isActive: false },
    });

    return true;
  },

  // Get panel members for a program
  async getProgramPanelMembers({ programId }) {
    const assignments = await db.programPanelAssignment.findMany({
      where: { programId, isActive: true },
      include: {
        panelMember: {
          select: { id: true, name: true, email: true, imageUrl: true },
        },
      },
    });

    return assignments.map((a) => ({
      ...a.panelMember,
      assignedAt: a.createdAt,
    }));
  },

  // Get applications pending evaluation for admin / program manager / panel member
  async getPendingEvaluations({
    panelMemberId,
    incubationUserId,
    programId,
    batchId,
    isAdmin,
    tenantId,
  }) {
    const emptyResponse = {
      pending: [],
      evaluated: [],
      summary: { totalPending: 0, totalEvaluated: 0, programsAssigned: 0 },
    };

    const userId = incubationUserId || panelMemberId;
    let programIds = [];
    let restrictByBatch = false;
    let assignedBatchIds = [];

    if (isAdmin && tenantId) {
      const programs = await db.program.findMany({
        where: { tenantId, ...(programId ? { id: programId } : {}) },
        select: { id: true },
      });
      programIds = programs.map((p) => p.id);
    } else {
      const managedPrograms = await db.programManagerAssignment.findMany({
        where: {
          managerId: userId,
          ...(programId ? { programId } : {}),
        },
        select: { programId: true },
      });

      if (managedPrograms.length > 0) {
        programIds = [...new Set(managedPrograms.map((m) => m.programId))];
      } else {
        const assignmentQuery = { panelMemberId: userId, isActive: true };
        if (programId) assignmentQuery.programId = programId;
        if (batchId) assignmentQuery.batchId = batchId;

        const assignments = await db.programPanelAssignment.findMany({
          where: assignmentQuery,
          select: { programId: true, batchId: true },
        });

        if (assignments.length === 0) return emptyResponse;

        programIds = [...new Set(assignments.map((a) => a.programId))];
        assignedBatchIds = assignments
          .map((a) => a.batchId)
          .filter(Boolean);

        if (
          assignedBatchIds.length > 0 &&
          !assignments.some((a) => !a.batchId)
        ) {
          restrictByBatch = true;
        }
      }
    }

    if (programIds.length === 0) return emptyResponse;

    const appWhere = {
      programId: { in: programIds },
      status: { in: ["UNDER_EVALUATION", "EVALUATED", "VERIFIED", "ONBOARDED", "REJECTED"] },
    };

    if (restrictByBatch) {
      appWhere.batchId = { in: assignedBatchIds };
    } else if (batchId) {
      appWhere.batchId = batchId;
    }

    const applications = await db.startupApplication.findMany({
      where: appWhere,
      include: {
        startup: { select: { id: true, name: true, logoUrl: true } },
        program: { select: { id: true, title: true } },
        batch: {
          select: { id: true, batchName: true, batchCode: true, status: true },
        },
        evaluations: {
          select: { evaluatorId: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const pendingApplications = applications.filter(
      (app) => app.status === "UNDER_EVALUATION"
    );

    const evaluatedApplications = applications.filter((app) =>
      [
        "EVALUATED",
        "VERIFIED",
        "ONBOARDED",
        "REJECTED",
      ].includes(app.status)
    );

    return {
      pending: pendingApplications.map((app) => ({
        applicationId: app.id,
        startup: app.startup,
        program: app.program,
        batch: app.batch || null,
        status: app.status,
        totalEvaluations: app.evaluations.length,
        submittedAt: app.submittedAt,
        updatedAt: app.updatedAt,
      })),
      evaluated: evaluatedApplications.map((app) => ({
        applicationId: app.id,
        startup: app.startup,
        program: app.program,
        batch: app.batch || null,
        status: app.status,
        totalEvaluations: app.evaluations.length,
      })),
      summary: {
        totalPending: pendingApplications.length,
        totalEvaluated: evaluatedApplications.length,
        programsAssigned: programIds.length,
      },
    };
  },
  async getEvaluationForm({ applicationId }) {
    const application = await db.startupApplication.findUnique({
      where: { id: applicationId },
      include: {
        program: {
          include: {
            evaluationQuestions: {
              where: { isActive: true },
              orderBy: { order: "asc" },
              include: {
                options: { orderBy: { order: "asc" } },
              },
            },
          },
        },
        startup: { select: { id: true, name: true, logoUrl: true } },
        batch: {
          select: { id: true, batchName: true, batchCode: true, status: true },
        },
        schemeAnswers: {
          select: {
            questionId: true,
            answerText: true,
            answerFileUrl: true,
            question: { select: { questionText: true, questionType: true } },
          },
        },
      },
    });

    if (!application) throw new ApiError(404, "Application not found");

    return {
      applicationId: application.id,
      startup: application.startup,
      program: { id: application.program.id, title: application.program.title },
      batch: application.batch || null,
      questions: application.program.evaluationQuestions,
      applicationAnswers: application.schemeAnswers,
    };
  },

  // Submit evaluation
  async submitEvaluation({ applicationId, evaluatorId, answers, remarks, isAdmin }) {
    const application = await db.startupApplication.findUnique({
      where: { id: applicationId },
      include: {
        program: {
          include: {
            evaluationQuestions: {
              where: { isActive: true },
              include: { options: true },
            },
            panelAssignments: {
              where: { isActive: true },
              select: { panelMemberId: true, batchId: true },
            },
          },
        },
      },
    });

    if (!application) throw new ApiError(404, "Application not found");

    // Check if application is under evaluation
    if (
      application.status !== "UNDER_EVALUATION" &&
      application.status !== "EVALUATED"
    ) {
      throw new ApiError(400, "Application is not available for evaluation");
    }

    const isAssigned = application.program.panelAssignments.some(
      (a) =>
        a.panelMemberId === evaluatorId &&
        (!a.batchId || a.batchId === application.batchId),
    );

    if (!isAssigned && !isAdmin) {
      const isProgramManager = await db.programManagerAssignment.findFirst({
        where: { programId: application.programId, managerId: evaluatorId },
        select: { id: true },
      });

      if (!isProgramManager) {
        throw new ApiError(
          403,
          "You are not authorized to evaluate this application",
        );
      }
    }

    // Check if already evaluated
    const existingEvaluation = await db.evaluation.findUnique({
      where: { applicationId_evaluatorId: { applicationId, evaluatorId } },
    });
    if (existingEvaluation)
      throw new ApiError(400, "You have already evaluated this application");

    // Validate and calculate scores
    let totalScore = 0;
    const answerData = [];

    for (const answer of answers) {
      const question = application.program.evaluationQuestions.find(
        (q) => q.id === answer.questionId,
      );
      if (!question)
        throw new ApiError(400, `Invalid question ID: ${answer.questionId}`);

      let score = 0;
      if (answer.optionId) {
        const option = question.options.find((o) => o.id === answer.optionId);
        if (!option)
          throw new ApiError(
            400,
            `Invalid option ID: ${answer.optionId} for question ${answer.questionId}`,
          );
        score = option.score * question.weightage;
      }

      answerData.push({
        questionId: answer.questionId,
        optionId: answer.optionId || null,
        score,
        comment: answer.comment || null,
      });
      totalScore += score;
    }

    // Create evaluation with answers
    const evaluation = await db.$transaction(async (tx) => {
      const eval_ = await tx.evaluation.create({
        data: {
          applicationId,
          evaluatorId,
          totalScore,
          remarks,
          status: "SUBMITTED",
          answers: {
            create: answerData,
          },
        },
        include: { answers: true },
      });

      // Update application status to EVALUATED if first evaluation
      if (application.status === "UNDER_EVALUATION") {
        await tx.startupApplication.update({
          where: { id: applicationId },
          data: { status: "EVALUATED", score: totalScore },
        });

        // Create history record
        await tx.applicationHistory.create({
          data: {
            applicationId,
            changedById: evaluatorId,
            oldStatus: "UNDER_EVALUATION",
            newStatus: "EVALUATED",
            comment: "Evaluation submitted by panel member",
          },
        });
      } else {
        // Recalculate average score
        const allEvaluations = await tx.evaluation.findMany({
          where: { applicationId },
        });
        const avgScore =
          allEvaluations.reduce((sum, e) => sum + (e.totalScore || 0), 0) /
          allEvaluations.length;

        await tx.startupApplication.update({
          where: { id: applicationId },
          data: { score: avgScore },
        });
      }

      return eval_;
    });

    return {
      evaluationId: evaluation.id,
      totalScore,
      applicationStatus:
        application.status === "UNDER_EVALUATION"
          ? "EVALUATED"
          : application.status,
    };
  },

  // Get all evaluations for application
  async getEvaluations({ applicationId }) {
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

    return evaluations;
  },

  // Get evaluation summary
  async getEvaluationSummary({ applicationId }) {
    const application = await db.startupApplication.findUnique({
      where: { id: applicationId },
      select: { id: true, score: true, status: true },
    });
    if (!application) throw new ApiError(404, "Application not found");

    const evaluations = await db.evaluation.findMany({
      where: { applicationId },
      include: {
        evaluator: { select: { id: true, name: true } },
        answers: {
          include: { question: true },
        },
      },
    });

    if (evaluations.length === 0) {
      return {
        applicationId,
        averageScore: null,
        totalEvaluations: 0,
        evaluations: [],
        breakdown: [],
      };
    }

    const averageScore =
      evaluations.reduce((sum, e) => sum + (e.totalScore || 0), 0) /
      evaluations.length;

    // Build breakdown by question
    const questionScores = {};
    for (const eval_ of evaluations) {
      for (const ans of eval_.answers) {
        if (!questionScores[ans.questionId]) {
          questionScores[ans.questionId] = {
            questionId: ans.questionId,
            questionText: ans.question.questionText,
            scores: [],
          };
        }
        questionScores[ans.questionId].scores.push(ans.score || 0);
      }
    }

    const breakdown = Object.values(questionScores).map((q) => ({
      questionId: q.questionId,
      questionText: q.questionText,
      avgScore: q.scores.reduce((a, b) => a + b, 0) / q.scores.length,
    }));

    return {
      applicationId,
      averageScore,
      totalEvaluations: evaluations.length,
      evaluations: evaluations.map((e) => ({
        evaluatorId: e.evaluator.id,
        evaluatorName: e.evaluator.name,
        score: e.totalScore,
        evaluatedAt: e.evaluatedAt,
      })),
      breakdown,
    };
  },
};
