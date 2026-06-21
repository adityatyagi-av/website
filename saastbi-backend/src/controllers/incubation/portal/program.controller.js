import { programService } from "../../../services/incubation/portal/program.service.js";
import { ApiError } from "../../../utils/ApiError.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";

export const ProgramController = {
  searchSchemeTypes: asyncHandler(async (req, res) => {
    const { search } = req.query;
    const results = await programService.searchSchemeTypes({ search });
    return apiResponse.sendSuccess(res, results, "Scheme types fetched successfully");
  }),

  createSchemeType: asyncHandler(async (req, res) => {
    const { name } = req.body;
    const result = await programService.createSchemeType({ name });
    return apiResponse.sendSuccess(res, result, "Scheme type created successfully");
  }),

  searchGoverningBodies: asyncHandler(async (req, res) => {
    const { search } = req.query;
    const results = await programService.searchGoverningBodies({ search });
    return apiResponse.sendSuccess(res, results, "Governing bodies fetched successfully");
  }),

  createGoverningBody: asyncHandler(async (req, res) => {
    const { name } = req.body;
    const result = await programService.createGoverningBody({ name });
    return apiResponse.sendSuccess(res, result, "Governing body created successfully");
  }),

  createProgram: asyncHandler(async (req, res) => {
    const {
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
      includeCreatorAsManager,
      batch,
    } = req.body;
    const createdBy = req.user.incubationUserId;
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;

    if (!tenantKey) {
      throw new ApiError(
        400,
        "tenantKey is required (send in headers or body)",
      );
    }
    const program = await programService.createProgram({
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
      existingQuestionIds,
      newQuestions,
      evaluationQuestions,
      managerIds,
      includeCreatorAsManager,
      batch,
    });

    return apiResponse.sendSuccess(
      res,
      program,
      "Program created successfully",
    );
  }),

  getProgramsDropdown: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;

    if (!tenantKey) {
      throw new ApiError(
        400,
        "tenantKey is required (send in headers or body)",
      );
    }
    const userId = req.user.incubationUserId;

    const programs = await programService.getProgramsDropdown({
      tenantKey,
      userId,
    });
    return apiResponse.sendSuccess(
      res,
      programs,
      "Programs dropdown fetched successfully",
    );
  }),

  getAllPrograms: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      order = "desc"
    } = req.query;

    const result = await programService.getAllPrograms({
      tenantKey,
      userId: req.user.incubationUserId,
      page:Number(page),
      limit:Number(limit),
      search,
      sortBy,
      order
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Programs fetched successfully"
    );
  }),

  getProgramById: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const program = await programService.getProgramById(id, req.user.incubationUserId);
    if (!program) throw new ApiError(404, "Program not found");

    return apiResponse.sendSuccess(
      res,
      program,
      "Program details fetched successfully",
    );
  }),
  updateProgram: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;
    if (!tenantKey) throw new ApiError(400, "tenantKey is required");

    const updatedBy = req.user.incubationUserId;

    const updatedProgram = await programService.updateProgram(id, {
      tenantKey,
      updatedBy,
      ...req.body,
    });

    return apiResponse.sendSuccess(
      res,
      updatedProgram,
      "Program updated successfully",
    );
  }),
  getProgramRegistrations: asyncHandler(async (req, res) => {
    const { programId } = req.params;
    const { page, limit, search, sortBy, order, status, batchId } = req.query;

    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;
    if (!tenantKey)
      throw new ApiError(
        400,
        "tenantKey is required (send in headers or body)",
      );

    const registrations = await programService.getProgramRegistrations({
      tenantKey,
      programId,
      batchId,
      page,
      limit,
      search,
      sortBy,
      order,
      status,
    });

    return apiResponse.sendSuccess(
      res,
      registrations,
      "Program registrations fetched successfully",
    );
  }),
  getProgramRegistrationById: asyncHandler(async (req, res) => {
    const { tenantkey } = req.headers;
    const { programId, registrationId } = req.params;

    const registration = await programService.getProgramRegistrationById({
      tenantkey,
      programId,
      registrationId,
    });

    return apiResponse.sendSuccess(
      res,
      registration,
      "Program fetched successfully",
    );
  }),
  requestChanges: asyncHandler(async (req, res) => {
    const incubationUserId = req.user.incubationUserId;
    const { applicationId, description, type, title } = req.body;

    const result = await programService.requestChanges({
      incubationUserId,
      applicationId,
      description,
      type,
      title,
    });
    return apiResponse.sendSuccess(
      res,
      result,
      "Change request created successfully",
    );
  }),
  changeApplicationStatus: asyncHandler(async (req, res) => {
    const incubationUserId = req.user.incubationUserId;
    const { applicationId } = req.params;
    const { newStatus, comment, approvedFundingAmount } = req.body;

    if (!applicationId) throw new ApiError(400, "applicationId is required");
    if (!newStatus) throw new ApiError(400, "newStatus is required");

    const result = await programService.changeApplicationStatus({
      incubationUserId,
      applicationId,
      newStatus,
      comment,
      approvedFundingAmount,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      `Application moved to ${newStatus} successfully`,
    );
  }),

  requestDocument: asyncHandler(async (req, res) => {
    const incubationUserId = req.user.incubationUserId;
    const { applicationId, description, title } = req.body;

    if (!applicationId) throw new ApiError(400, "applicationId is required");

    const result = await programService.requestDocument({
      incubationUserId,
      applicationId,
      description,
      title,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Document request created successfully",
    );
  }),

  requestStartupDocument: asyncHandler(async (req, res) => {
    const incubationUserId = req.user.incubationUserId;
    const {
      startupId,
      title,
      description,
    } = req.body;
  
    if (!startupId) {
      throw new ApiError(400, "startupId is required");
    }
  
    const result = await programService.requestStartupDocument({
      incubationUserId,
      startupId,
      title,
      description,
    });
  
    return apiResponse.sendSuccess(
      res,
      result,
      "Startup document request created successfully"
    );
  }),

  submitEvaluation: asyncHandler(async (req, res) => {
    const evaluatorId = req.user.incubationUserId;
    const { applicationId, answers = [], remarks } = req.body;

    if (!applicationId) throw new ApiError(400, "applicationId is required");
    if (!Array.isArray(answers) || answers.length === 0) {
      throw new ApiError(400, "answers must be a non-empty array");
    }

    const result = await programService.submitEvaluation({
      evaluatorId,
      applicationId,
      answers,
      remarks,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Evaluation submitted successfully",
    );
  }),
  getPendingChanges: asyncHandler(async (req, res) => {
    const { applicationId } = req.params;

    const changes = await programService.getPendingChanges({ applicationId });

    return apiResponse.sendSuccess(
      res,
      changes,
      "Pending change requests fetched successfully",
    );
  }),

  getCompletedChanges: asyncHandler(async (req, res) => {
    const { applicationId } = req.params;

    const changes = await programService.getCompletedChanges({ applicationId });

    return apiResponse.sendSuccess(
      res,
      changes,
      "Completed change requests fetched successfully",
    );
  }),

  getReceivedChanges: asyncHandler(async (req, res) => {
    const { applicationId } = req.params;

    const changes = await programService.getReceivedChanges({ applicationId });

    return apiResponse.sendSuccess(
      res,
      changes,
      "Received changes fetched successfully",
    );
  }),

  reRequestChange: asyncHandler(async (req, res) => {
    const incubationUserId = req.user.incubationUserId;
    const { applicationId, changeRequestId } = req.params;
    const { description } = req.body;

    const result = await programService.reRequestChange({
      incubationUserId,
      applicationId,
      changeRequestId,
      description,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Change re-requested successfully",
    );
  }),
  approveChange: asyncHandler(async (req, res) => {
    const incubationUserId = req.user.incubationUserId;
    const { applicationId, changeRequestId } = req.params;
    const { comment } = req.body;

    const result = await programService.approveChange({
      incubationUserId,
      applicationId,
      changeRequestId,
      comment,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Change request approved successfully",
    );
  }),

  rejectChange: asyncHandler(async (req, res) => {
    const incubationUserId = req.user.incubationUserId;
    const { applicationId, changeRequestId } = req.params;
    const { comment } = req.body;

    const result = await programService.rejectChange({
      incubationUserId,
      applicationId,
      changeRequestId,
      comment,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Change request rejected successfully",
    );
  }),

  searchStartupsForProgram: asyncHandler(async (req, res) => {
    const { query } = req.query;
    if (!query || query.trim() === "") {
      throw new ApiError(400, "query parameter is required");
    }
    const results = await programService.searchStartupsForProgram({
      query,
    });
    return apiResponse.sendSuccess(res, results, "Startups search results");
  }),
  getStartupDetailsForIncubator: asyncHandler(async (req, res) => {
    const { startupId } = req.params;
    if (!startupId) throw new ApiError(400, "startupId is required");

    const startup = await programService.getStartupDetailsForIncubator({
      startupId,
    });
    return apiResponse.sendSuccess(res, startup, "Startup details fetched");
  }),

  addExistingStartupToProgram: asyncHandler(async (req, res) => {
    const incubationUserId = req.user.incubationUserId;
    const { programId } = req.params;
    const { startupId, batchId, status = "NEW" } = req.body;

    if (!programId) throw new ApiError(400, "programId is required");
    if (!startupId) throw new ApiError(400, "startupId is required");

    const result = await programService.addExistingStartupToProgram({
      incubationUserId,
      programId,
      startupId,
      batchId,
      status,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Existing startup added to program successfully",
    );
  }),
  createStartupAndAddToProgram: asyncHandler(async (req, res) => {
    const incubationUserId = req.user.incubationUserId;
    const { programId } = req.params;
    const { startup, user, founders = [], batchId } = req.body;

    if (!programId) throw new ApiError(400, "programId is required");
    if (!startup || !user)
      throw new ApiError(400, "startup and user objects are required");

    const result = await programService.createStartupAndAddToProgram({
      incubationUserId,
      programId,
      batchId,
      startup,
      user,
      founders,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Startup created and added to program successfully",
    );
  }),
  getStartupsByProgram: asyncHandler(async (req, res) => {
    const { programId } = req.params;
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      order = "desc",
      stage,
      status,
      programStatus,
      batchId,
    } = req.query;

    if (!programId) throw new ApiError(400, "programId is required");

    const result = await programService.getStartupsByProgram({
      programId,
      batchId,
      page,
      limit,
      search,
      sortBy,
      order,
      stage,
      status,
      programStatus,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Startups fetched successfully",
    );
  }),

  removeStartupFromProgram: asyncHandler(async (req, res) => {
    const removedBy = req.user.incubationUserId;
  
    const { programId, startupId } = req.params;
  
    const result = await programService.removeStartupFromProgram({
      removedBy,
      programId,
      startupId,
    });
  
    return apiResponse.sendSuccess(
      res,
      result,
      "Startup removed from program successfully"
    );
  }),

  // Evaluation APIs
  getApplicationEvaluations: asyncHandler(async (req, res) => {
    const { applicationId } = req.params;
    if (!applicationId) throw new ApiError(400, "applicationId is required");

    const evaluations = await programService.getApplicationEvaluations({
      applicationId,
    });
    return apiResponse.sendSuccess(
      res,
      evaluations,
      "Evaluations fetched successfully",
    );
  }),

  getEvaluationById: asyncHandler(async (req, res) => {
    const { applicationId, evaluationId } = req.params;
    if (!applicationId || !evaluationId) {
      throw new ApiError(400, "applicationId and evaluationId are required");
    }

    const evaluation = await programService.getEvaluationById({
      applicationId,
      evaluationId,
    });
    return apiResponse.sendSuccess(
      res,
      evaluation,
      "Evaluation fetched successfully",
    );
  }),

  getEvaluationSummary: asyncHandler(async (req, res) => {
    const { applicationId } = req.params;
    if (!applicationId) throw new ApiError(400, "applicationId is required");

    const summary = await programService.getEvaluationSummary({
      applicationId,
    });
    return apiResponse.sendSuccess(
      res,
      summary,
      "Evaluation summary fetched successfully",
    );
  }),

  getSchemeQuestions: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"];
    if (!tenantKey) throw new ApiError(400, "tenantKey is required");

    const { search, questionType } = req.query;

    const questions = await programService.getSchemeQuestions({
      tenantKey,
      search,
      questionType,
    });

    return apiResponse.sendSuccess(res, questions, "Scheme questions fetched successfully");
  }),

  createSchemeQuestion: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;
    if (!tenantKey) throw new ApiError(400, "tenantKey is required");

    const { questionText, questionType, isRequired, options } = req.body;

    if (!questionText) throw new ApiError(400, "questionText is required");
    if (!questionType) throw new ApiError(400, "questionType is required");

    const question = await programService.createSchemeQuestion({
      tenantKey,
      questionText,
      questionType,
      isRequired,
      options,
    });

    return apiResponse.sendCreated(res, question, "Scheme question created successfully");
  }),

  updateSchemeQuestion: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;
    if (!tenantKey) throw new ApiError(400, "tenantKey is required");

    const { questionText, questionType, isRequired, options } = req.body;

    const updated = await programService.updateSchemeQuestion(id, {
      tenantKey,
      questionText,
      questionType,
      isRequired,
      options,
    });

    return apiResponse.sendSuccess(res, updated, "Scheme question updated successfully");
  }),

  deleteSchemeQuestion: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tenantKey = req.headers["tenantkey"];
    if (!tenantKey) throw new ApiError(400, "tenantKey is required");

    await programService.deleteSchemeQuestion(id, tenantKey);

    return apiResponse.sendSuccess(res, null, "Scheme question deleted successfully");
  }),

  // For Evaluations

  createEvaluationQuestion: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;
    if (!tenantKey) throw new ApiError(400, "tenantKey is required");

    const {
      programId,
      questionText,
      weightage,
      order,
      isActive,
      scoringReference,
      options,
    } = req.body;

    if (!programId) throw new ApiError(400, "programId is required");
    if (!questionText) throw new ApiError(400, "questionText is required");

    const program = await programService.createEvaluationQuestion({
      tenantKey,
      programId,
      questionText,
      weightage,
      order,
      isActive,
      scoringReference,
      options,
    });

    return apiResponse.sendSuccess(
      res,
      program,
      "Evaluation question created successfully",
      201,
    );
  }),

  getEvaluationQuestionsByProgram: asyncHandler(async (req, res) => {
    const { programId } = req.params;
    const tenantKey = req.headers["tenantkey"];
    if (!tenantKey) throw new ApiError(400, "tenantKey is required");

    const { includeInactive } = req.query;

    const programs = await programService.getEvaluationQuestionsByProgram(
      programId,
      tenantKey,
      includeInactive === "true",
    );

    return apiResponse.sendSuccess(
      res,
      programs,
      "Evaluation questions retrieved successfully",
    );
  }),

  getEvaluationQuestionById: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tenantKey = req.headers["tenantkey"];
    if (!tenantKey) throw new ApiError(400, "tenantKey is required");

    const program = await programService.getEvaluationQuestionById(id, tenantKey);

    return apiResponse.sendSuccess(
      res,
      program,
      "Evaluation question retrieved successfully",
    );
  }),

  updateEvaluationQuestion: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;
    if (!tenantKey) throw new ApiError(400, "tenantKey is required");

    const {
      questionText,
      weightage,
      order,
      isActive,
      scoringReference,
      options,
    } = req.body;

    const updatedQuestion = await programService.updateEvaluationQuestion(id, {
      tenantKey,
      questionText,
      weightage,
      order,
      isActive,
      scoringReference,
      options,
    });

    return apiResponse.sendSuccess(
      res,
      updatedQuestion,
      "Evaluation question updated successfully",
    );
  }),

  deleteEvaluationQuestion: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tenantKey = req.headers["tenantkey"];
    if (!tenantKey) throw new ApiError(400, "tenantKey is required");

    await programService.deleteEvaluationQuestion(id, tenantKey);

    return apiResponse.sendSuccess(
      res,
      null,
      "Evaluation question deleted successfully",
    );
  }),

  reorderEvaluationQuestions: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;
    if (!tenantKey) throw new ApiError(400, "tenantKey is required");

    const { programId, questionOrders } = req.body;

    if (!programId) throw new ApiError(400, "programId is required");
    if (
      !questionOrders ||
      !Array.isArray(questionOrders) ||
      questionOrders.length === 0
    ) {
      throw new ApiError(400, "questionOrders array is required");
    }

    await programService.reorderEvaluationQuestions({
      tenantKey,
      programId,
      questionOrders,
    });

    return apiResponse.sendSuccess(
      res,
      null,
      "Evaluation questions reordered successfully",
    );
  }),

  toggleActiveStatus: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const tenantKey = req.headers["tenantkey"];
    if (!tenantKey) throw new ApiError(400, "tenantKey is required");

    const updatedQuestion = await programService.toggleActiveStatus(
      id,
      tenantKey,
    );

    return apiResponse.sendSuccess(
      res,
      updatedQuestion,
      `Evaluation question ${updatedQuestion.isActive ? "activated" : "deactivated"} successfully`,
    );
  }),

  bulkRegisterStartups: asyncHandler(async (req, res) => {
    const incubationUserId = req.user.incubationUserId;
    const { programId } = req.params;
    const { batchId } = req.params;
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;
    const { startups } = req.body;

    if (!tenantKey) throw new ApiError(400, "tenantKey is required");
    if (!programId) throw new ApiError(400, "programId is required");
    if (!Array.isArray(startups) || startups.length === 0) {
      throw new ApiError(400, "startups array is required");
    }

    const result = await programService.bulkRegisterStartups({
      incubationUserId,
      tenantKey,
      programId,
      batchId: batchId || req.body.batchId || null,
      startups,
    });

    return apiResponse.sendSuccess(res, result, "Bulk registration completed");
  }),

  bulkRequestDocuments: asyncHandler(async (req, res) => {
    const incubationUserId = req.user.incubationUserId;
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;
    const { applicationIds, title, description } = req.body;

    if (!tenantKey) throw new ApiError(400, "tenantKey is required");
    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      throw new ApiError(400, "applicationIds array is required");
    }
    if (!title) throw new ApiError(400, "title is required");

    const result = await programService.bulkRequestDocuments({
      incubationUserId,
      tenantKey,
      applicationIds,
      title,
      description,
    });

    return apiResponse.sendSuccess(res, result, "Bulk document request completed");
  }),

  getDocumentRequestsByProgram: asyncHandler(async (req, res) => {
    const { programId } = req.params;
    const tenantKey = req.headers["tenantkey"];
    const { batchId, status } = req.query;

    if (!tenantKey) throw new ApiError(400, "tenantKey is required");
    if (!programId) throw new ApiError(400, "programId is required");

    const result = await programService.getDocumentRequestsByProgram({
      tenantKey,
      programId,
      batchId,
      status,
    });

    return apiResponse.sendSuccess(res, result, "Document requests fetched successfully");
  }),

  getDocumentRequestById: asyncHandler(async (req, res) => {
    const { documentRequestId } = req.params;
    const tenantKey = req.headers["tenantkey"];
    if (!tenantKey) throw new ApiError(400, "tenantKey is required");
    if (!documentRequestId) throw new ApiError(400, "documentRequestId is required");

    const result = await programService.getDocumentRequestById({
      tenantKey,
      documentRequestId,
    });
    return apiResponse.sendSuccess(res, result, "Document request fetched successfully");
  }),

  getDocumentResponseById: asyncHandler(async (req, res) => {
    const { responseId } = req.params;
    const tenantKey = req.headers["tenantkey"];
    if (!tenantKey) throw new ApiError(400, "tenantKey is required");
    if (!responseId) throw new ApiError(400, "responseId is required");

    const result = await programService.getDocumentResponseById({
      tenantKey,
      responseId,
    });
    return apiResponse.sendSuccess(res, result, "Document response fetched successfully");
  }),

  reopenDocumentRequest: asyncHandler(async (req, res) => {
    const incubationUserId = req.user.incubationUserId;
    const { documentRequestId } = req.params;
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;
    const { comment } = req.body;

    if (!tenantKey) throw new ApiError(400, "tenantKey is required");
    if (!documentRequestId) throw new ApiError(400, "documentRequestId is required");

    const result = await programService.reopenDocumentRequest({
      incubationUserId,
      tenantKey,
      documentRequestId,
      comment,
    });
    return apiResponse.sendSuccess(res, result, "Document request reopened successfully");
  }),

  createDataCollectionRequest: asyncHandler(async (req, res) => {
    const incubationUserId = req.user.incubationUserId;
    const { programId } = req.params;
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;
    const { batchId, title, description, requestType, targetType, dueDate, startupIds, questions } = req.body;

    if (!tenantKey) throw new ApiError(400, "tenantKey is required");
    if (!programId) throw new ApiError(400, "programId is required");
    if (!title) throw new ApiError(400, "title is required");

    const result = await programService.createDataCollectionRequest({
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
      questions,
    });

    return apiResponse.sendSuccess(res, result, "Data collection request created successfully");
  }),

  updateDataCollectionRequest: asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;
    const { title, description, dueDate, questions } = req.body;

    if (!tenantKey) throw new ApiError(400, "tenantKey is required");
    if (!requestId) throw new ApiError(400, "requestId is required");

    const result = await programService.updateDataCollectionRequest({
      tenantKey,
      requestId,
      title,
      description,
      dueDate,
      questions,
    });

    return apiResponse.sendSuccess(res, result, "Data collection request updated successfully");
  }),

  getDataCollectionRequests: asyncHandler(async (req, res) => {
    const { programId } = req.params;
    const tenantKey = req.headers["tenantkey"];
    const { batchId, status } = req.query;

    if (!tenantKey) throw new ApiError(400, "tenantKey is required");
    if (!programId) throw new ApiError(400, "programId is required");

    const result = await programService.getDataCollectionRequests({
      tenantKey,
      programId,
      batchId,
      status,
    });

    return apiResponse.sendSuccess(res, result, "Data collection requests fetched successfully");
  }),

  getDataCollectionRequestById: asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const tenantKey = req.headers["tenantkey"];

    if (!tenantKey) throw new ApiError(400, "tenantKey is required");
    if (!requestId) throw new ApiError(400, "requestId is required");

    const result = await programService.getDataCollectionRequestById({
      tenantKey,
      requestId,
    });

    return apiResponse.sendSuccess(res, result, "Data collection request details fetched successfully");
  }),

  reviewDataCollectionSubmission: asyncHandler(async (req, res) => {
    const incubationUserId = req.user.incubationUserId;
    const { assignmentId } = req.params;
    const tenantKey = req.headers["tenantkey"];
    const { action, reviewNote } = req.body;

    if (!tenantKey) throw new ApiError(400, "tenantKey is required");
    if (!assignmentId) throw new ApiError(400, "assignmentId is required");
    if (!["APPROVE", "REJECT", "RESUBMIT"].includes(action)) {
      throw new ApiError(400, "action must be one of: APPROVE, REJECT, RESUBMIT");
    }

    const result = await programService.reviewDataCollectionSubmission({
      tenantKey,
      incubationUserId,
      assignmentId,
      action,
      reviewNote,
    });

    return apiResponse.sendSuccess(res, result, "Submission reviewed successfully");
  }),

  closeDataCollectionRequest: asyncHandler(async (req, res) => {
    const { requestId } = req.params;
    const tenantKey = req.headers["tenantkey"];

    if (!tenantKey) throw new ApiError(400, "tenantKey is required");
    if (!requestId) throw new ApiError(400, "requestId is required");

    const result = await programService.closeDataCollectionRequest({
      tenantKey,
      requestId,
    });

    return apiResponse.sendSuccess(res, result, "Data collection request closed successfully");
  }),
};
