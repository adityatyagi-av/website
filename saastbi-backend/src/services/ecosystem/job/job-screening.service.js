import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";

async function validatePageJobPermission(pageId, userId) {
  const member = await db.pageMember.findFirst({
    where: { pageId, userId },
    select: { role: true },
  });
  if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
    throw new ApiError(403, "You don't have permission to manage screening questions");
  }
}

async function getJobWithPage(jobId) {
  const job = await db.job.findUnique({
    where: { id: jobId },
    select: { id: true, pageId: true, status: true },
  });
  if (!job) throw new ApiError(404, "Job not found");
  if (!job.pageId) throw new ApiError(400, "Job is not associated with a page");
  return job;
}

export const JobScreeningService = {
  addQuestion: async (userId, jobId, data) => {
    const job = await getJobWithPage(jobId);
    await validatePageJobPermission(job.pageId, userId);

    if (
      (data.questionType === "SINGLE_CHOICE" || data.questionType === "MULTIPLE_CHOICE") &&
      (!data.options || !Array.isArray(data.options) || data.options.length < 2)
    ) {
      throw new ApiError(400, "Choice questions must have at least 2 options");
    }

    const lastQuestion = await db.jobScreeningQuestion.findFirst({
      where: { jobId },
      orderBy: { orderIndex: "desc" },
      select: { orderIndex: true },
    });

    const question = await db.jobScreeningQuestion.create({
      data: {
        jobId,
        questionText: data.questionText,
        questionType: data.questionType,
        options: data.options || null,
        isRequired: data.isRequired ?? false,
        isEliminatory: data.isEliminatory ?? false,
        expectedAnswer: data.expectedAnswer || null,
        orderIndex: (lastQuestion?.orderIndex ?? -1) + 1,
      },
    });

    return question;
  },

  updateQuestion: async (userId, questionId, data) => {
    const question = await db.jobScreeningQuestion.findUnique({
      where: { id: questionId },
      include: { job: { select: { id: true, pageId: true } } },
    });
    if (!question) throw new ApiError(404, "Screening question not found");
    if (!question.job.pageId) throw new ApiError(400, "Job is not associated with a page");
    await validatePageJobPermission(question.job.pageId, userId);

    const updateData = {};
    if (data.questionText !== undefined) updateData.questionText = data.questionText;
    if (data.questionType !== undefined) updateData.questionType = data.questionType;
    if (data.options !== undefined) updateData.options = data.options;
    if (data.isRequired !== undefined) updateData.isRequired = data.isRequired;
    if (data.isEliminatory !== undefined) updateData.isEliminatory = data.isEliminatory;
    if (data.expectedAnswer !== undefined) updateData.expectedAnswer = data.expectedAnswer;

    const updated = await db.jobScreeningQuestion.update({
      where: { id: questionId },
      data: updateData,
    });

    return updated;
  },

  reorderQuestions: async (userId, jobId, orderedIds) => {
    const job = await getJobWithPage(jobId);
    await validatePageJobPermission(job.pageId, userId);

    const existingQuestions = await db.jobScreeningQuestion.findMany({
      where: { jobId },
      select: { id: true },
    });

    const existingIds = new Set(existingQuestions.map((q) => q.id));
    for (const id of orderedIds) {
      if (!existingIds.has(id)) throw new ApiError(400, `Question ${id} does not belong to this job`);
    }

    await db.$transaction(
      orderedIds.map((id, index) =>
        db.jobScreeningQuestion.update({ where: { id }, data: { orderIndex: index } })
      )
    );

    return { message: "Questions reordered successfully" };
  },

  deleteQuestion: async (userId, questionId) => {
    const question = await db.jobScreeningQuestion.findUnique({
      where: { id: questionId },
      include: { job: { select: { id: true, pageId: true } } },
    });
    if (!question) throw new ApiError(404, "Screening question not found");
    if (!question.job.pageId) throw new ApiError(400, "Job is not associated with a page");
    await validatePageJobPermission(question.job.pageId, userId);

    await db.jobScreeningQuestion.delete({ where: { id: questionId } });

    const remaining = await db.jobScreeningQuestion.findMany({
      where: { jobId: question.jobId },
      orderBy: { orderIndex: "asc" },
      select: { id: true },
    });

    if (remaining.length > 0) {
      await db.$transaction(
        remaining.map((q, index) =>
          db.jobScreeningQuestion.update({ where: { id: q.id }, data: { orderIndex: index } })
        )
      );
    }

    return { message: "Question deleted successfully" };
  },

  getQuestions: async (userId, jobId) => {
    const job = await getJobWithPage(jobId);
    await validatePageJobPermission(job.pageId, userId);

    const questions = await db.jobScreeningQuestion.findMany({
      where: { jobId },
      orderBy: { orderIndex: "asc" },
    });

    return questions;
  },

  evaluateScreeningAnswers: async (applicationId) => {
    const application = await db.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        screeningAnswers: { include: { question: true } },
      },
    });

    if (!application || application.screeningAnswers.length === 0) return null;

    let totalQuestions = 0;
    let correctAnswers = 0;

    for (const sa of application.screeningAnswers) {
      if (!sa.question.isEliminatory || !sa.question.expectedAnswer) continue;
      totalQuestions++;
      const expected = sa.question.expectedAnswer;
      const given = sa.answer;
      if (JSON.stringify(expected) === JSON.stringify(given)) {
        correctAnswers++;
      }
    }

    const screeningScore = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : null;

    if (screeningScore !== null) {
      await db.jobApplication.update({
        where: { id: applicationId },
        data: { screeningScore },
      });
    }

    return screeningScore;
  },
};
