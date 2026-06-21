import { programService } from "../../services/startup/program.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/responseUtils.js";
import { ApiError } from "../../utils/ApiError.js";

export const ProgramController = {
  getAllTenants: asyncHandler(async (req, res) => {
    const tenants = await programService.getAllTenants();
    return apiResponse.sendSuccess(
      res,
      tenants,
      "Tenants fetched successfully",
    );
  }),

  getPrograms: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { selectedTenant, page, limit, search, sortBy, order, startupId } =
      req.query;

    if (!startupId) {
      throw new ApiError(400, "startupId is required");
    }

    const programs = await programService.getPrograms({
      selectedTenant,
      page,
      limit,
      search,
      sortBy,
      order,
      userId,
      startupId,
    });

    return apiResponse.sendSuccess(
      res,
      programs,
      "Programs fetched successfully",
    );
  }),

  getProgramById: asyncHandler(async (req, res) => {
    const { programId } = req.params;
    const { startupId } = req.query;
    const userId = req.user.id;

    if (!startupId) {
      throw new ApiError(400, "startupId is required");
    }
    const program = await programService.getProgramById({
      programId,
      userId,
      startupId,
    });
    return apiResponse.sendSuccess(
      res,
      program,
      "Program details fetched successfully",
    );
  }),
getProgramQuestions: asyncHandler(async (req, res) => {
  const { programId } = req.params;
  const { startupId } = req.query;
  const userId = req.user.id;

  if (!programId) throw new ApiError(400, "programId is required");
  if (!startupId) throw new ApiError(400, "startupId is required");

  const result = await programService.getProgramQuestions({
    programId,
    userId,
    startupId,
  });

  return apiResponse.sendSuccess(
    res,
    result,
    "Program questions fetched successfully"
  );
}),
  submitApplication: asyncHandler(async (req, res) => {
    const { programId } = req.params;
    const {
      schemeAnswers,
      startupId,
      batchId,
      requestedFundingAmount,
      fundingPurpose,
    } = req.body;
    const userId = req.user.id;

    if (!programId) throw new ApiError(400, "Program ID is required");
    if (!startupId) throw new ApiError(400, "Startup ID is required");
    if (!Array.isArray(schemeAnswers))
      throw new ApiError(400, "schemeAnswers must be an array");

    const application = await programService.submitApplication({
      programId,
      userId,
      startupId,
      batchId,
      schemeAnswers,
      requestedFundingAmount,
      fundingPurpose,
    });
    return apiResponse.sendSuccess(
      res,
      application,
      "Application submitted successfully",
    );
  }),

  respondChange: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { changeRequestId, responseText, fileUrl, startupId } = req.body;

    if (!startupId) throw new ApiError(400, "startupId is required");

    const result = await programService.respondChange({
      userId,
      changeRequestId,
      responseText,
      fileUrl,
      startupId,
    });
    return apiResponse.sendSuccess(
      res,
      result,
      "Change response submitted successfully",
    );
  }),

  respondDocument: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { documentRequestId, fileUrl, files, comment, startupId } = req.body;

    if (!documentRequestId)
      throw new ApiError(400, "documentRequestId is required");
    if (!startupId) throw new ApiError(400, "startupId is required");
    if (!fileUrl && !(Array.isArray(files) && files.length)) {
      throw new ApiError(400, "fileUrl or files[] is required");
    }

    const result = await programService.respondDocument({
      userId,
      documentRequestId,
      fileUrl,
      files,
      comment,
      startupId,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Document response submitted successfully",
    );
  }),

  submitDocumentResponse: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { documentRequestId } = req.params;
    const { files, fileUrl, comment, startupId } = req.body;

    if (!documentRequestId)
      throw new ApiError(400, "documentRequestId is required");
    if (!startupId) throw new ApiError(400, "startupId is required");
    if (!fileUrl && !(Array.isArray(files) && files.length)) {
      throw new ApiError(400, "files[] is required");
    }

    const result = await programService.submitDocumentResponse({
      userId,
      documentRequestId,
      files,
      fileUrl,
      comment,
      startupId,
    });
    return apiResponse.sendSuccess(
      res,
      result,
      "Document response submitted successfully",
    );
  }),

  resubmitDocumentResponse: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { documentRequestId } = req.params;
    const { files, fileUrl, comment, startupId } = req.body;

    if (!documentRequestId)
      throw new ApiError(400, "documentRequestId is required");
    if (!startupId) throw new ApiError(400, "startupId is required");
    if (!fileUrl && !(Array.isArray(files) && files.length)) {
      throw new ApiError(400, "files[] is required");
    }

    const result = await programService.resubmitDocumentResponse({
      userId,
      documentRequestId,
      files,
      fileUrl,
      comment,
      startupId,
    });
    return apiResponse.sendSuccess(
      res,
      result,
      "Document response resubmitted successfully",
    );
  }),

  withdrawDocumentResponse: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { responseId } = req.params;
    const { startupId } = req.body;

    if (!responseId) throw new ApiError(400, "responseId is required");
    if (!startupId) throw new ApiError(400, "startupId is required");

    const result = await programService.withdrawDocumentResponse({
      userId,
      startupId,
      responseId,
    });
    return apiResponse.sendSuccess(
      res,
      result,
      "Document response withdrawn successfully",
    );
  }),

  getMyDocumentResponses: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startupId, applicationId, documentRequestId } = req.query;

    if (!startupId) throw new ApiError(400, "startupId is required");

    const result = await programService.getMyDocumentResponses({
      userId,
      startupId,
      applicationId,
      documentRequestId,
    });
    return apiResponse.sendSuccess(
      res,
      result,
      "Document responses fetched successfully",
    );
  }),

  getDocumentResponseById: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { responseId } = req.params;
    const { startupId } = req.query;

    if (!responseId) throw new ApiError(400, "responseId is required");
    if (!startupId) throw new ApiError(400, "startupId is required");

    const result = await programService.getDocumentResponseById({
      userId,
      startupId,
      responseId,
    });
    return apiResponse.sendSuccess(
      res,
      result,
      "Document response fetched successfully",
    );
  }),

  getChangeRequests: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { applicationId } = req.params;
    const { startupId } = req.query;

    if (!applicationId) throw new ApiError(400, "applicationId is required");
    if (!startupId) throw new ApiError(400, "startupId is required");

    const result = await programService.getChangeRequests({
      userId,
      applicationId,
      startupId,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Change requests fetched successfully",
    );
  }),

  getChangeRequestById: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { applicationId, changeRequestId } = req.params;
    const { startupId } = req.query;

    if (!applicationId) throw new ApiError(400, "applicationId is required");
    if (!changeRequestId)
      throw new ApiError(400, "changeRequestId is required");
    if (!startupId) throw new ApiError(400, "startupId is required");

    const result = await programService.getChangeRequestById({
      userId,
      applicationId,
      changeRequestId,
      startupId,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Change request fetched successfully",
    );
  }),

  getDocumentRequests: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { applicationId } = req.params;
    const { startupId } = req.query;

    if (!applicationId) throw new ApiError(400, "applicationId is required");
    if (!startupId) throw new ApiError(400, "startupId is required");

    const result = await programService.getDocumentRequests({
      userId,
      applicationId,
      startupId,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Document requests fetched successfully",
    );
  }),

  getDocumentRequestById: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { applicationId, documentRequestId } = req.params;
    const { startupId } = req.query;

    if (!applicationId) throw new ApiError(400, "applicationId is required");
    if (!documentRequestId)
      throw new ApiError(400, "documentRequestId is required");
    if (!startupId) throw new ApiError(400, "startupId is required");

    const result = await programService.getDocumentRequestById({
      userId,
      applicationId,
      documentRequestId,
      startupId,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Document request fetched successfully",
    );
  }),

  getAllApplications: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { page, limit, search, sortBy, order, status, startupId } = req.query;

    if (!startupId) throw new ApiError(400, "startupId is required");

    console.log("startup id:",startupId);
    console.log("userid;",userId);

    const applications = await programService.getApplications({
      userId,
      page,
      limit,
      search,
      sortBy,
      order,
      status,
      startupId,
    });

    return apiResponse.sendSuccess(
      res,
      applications,
      "Applications fetched successfully",
    );
  }),

  getApplicationById: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { applicationId } = req.params;
    const { startupId } = req.query;

    console.log("APPLICATION HERE ",applicationId,"and",startupId,"userId",userId)

    if (!applicationId) throw new ApiError(400, "applicationId is required");
    if (!startupId) throw new ApiError(400, "startupId is required");

    const application = await programService.getApplicationById({
      userId,
      applicationId,
      startupId,
    });

    return apiResponse.sendSuccess(
      res,
      application,
      "Application details fetched successfully",
    );
  }),

  getApplicationSummary: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { applicationId } = req.params;
    const { startupId } = req.query;

    if (!applicationId) throw new ApiError(400, "applicationId is required");
    if (!startupId) throw new ApiError(400, "startupId is required");

    const result = await programService.getApplicationSummary({
      userId,
      applicationId,
      startupId,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Application summary fetched successfully",
    );
  }),

  getApplicationHistory: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { applicationId } = req.params;
    const { startupId, page, limit } = req.query;

    if (!applicationId) throw new ApiError(400, "applicationId is required");
    if (!startupId) throw new ApiError(400, "startupId is required");

    const result = await programService.getApplicationHistory({
      userId,
      applicationId,
      startupId,
      page,
      limit,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Application history fetched successfully",
    );
  }),

  getDisbursementHistory: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { applicationId } = req.params;
    const { startupId } = req.query;

    if (!applicationId) throw new ApiError(400, "applicationId is required");
    if (!startupId) throw new ApiError(400, "startupId is required");

    const result = await programService.getDisbursementHistory({
      userId,
      applicationId,
      startupId,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Disbursement history fetched successfully",
    );
  }),

  createFundingRequest: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { applicationId } = req.params;
    const { startupId, requestedAmount, currency, note, docUrl, docName } =
      req.body;

    if (!applicationId) throw new ApiError(400, "applicationId is required");
    if (!startupId) throw new ApiError(400, "startupId is required");
    if (!requestedAmount || requestedAmount <= 0)
      throw new ApiError(400, "requestedAmount must be a positive number");

    const result = await programService.createFundingRequest({
      userId,
      startupId,
      applicationId,
      requestedAmount,
      currency,
      note,
      docUrl,
      docName,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Funding request created successfully",
    );
  }),

  getFundingRequests: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { applicationId } = req.params;
    const { startupId } = req.query;

    if (!applicationId) throw new ApiError(400, "applicationId is required");
    if (!startupId) throw new ApiError(400, "startupId is required");

    const result = await programService.getFundingRequests({
      userId,
      startupId,
      applicationId,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Funding requests fetched successfully",
    );
  }),

  cancelFundingRequest: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { requestId } = req.params;
    const { startupId } = req.body;

    if (!requestId) throw new ApiError(400, "requestId is required");
    if (!startupId) throw new ApiError(400, "startupId is required");

    const result = await programService.cancelFundingRequest({
      userId,
      startupId,
      requestId,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Funding request cancelled successfully",
    );
  }),

  getAssociatedPrograms: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startupId, page, limit, search, sortBy, order, status } = req.query;

    if (!startupId) throw new ApiError(400, "startupId is required");

    const result = await programService.getAssociatedPrograms({
      userId,
      startupId,
      page,
      limit,
      search,
      sortBy,
      order,
      status,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Associated programs fetched successfully",
    );
  }),

  getDataCollectionRequests: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startupId, programId, applicationId, status } = req.query;

    if (!startupId) throw new ApiError(400, "startupId is required");

    const result = await programService.getDataCollectionRequests({
      userId,
      startupId,
      programId,
      applicationId,
      status,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Data collection requests fetched successfully",
    );
  }),

  getDataCollectionAssignment: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { assignmentId } = req.params;
    const { startupId } = req.query;

    if (!startupId) throw new ApiError(400, "startupId is required");
    if (!assignmentId) throw new ApiError(400, "assignmentId is required");

    const result = await programService.getDataCollectionAssignment({
      userId,
      startupId,
      assignmentId,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Data collection assignment fetched successfully",
    );
  }),

  getAssociationById: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { associationId } = req.params;
    const { startupId } = req.query;

    if (!associationId) throw new ApiError(400, "associationId is required");
    if (!startupId) throw new ApiError(400, "startupId is required");

    const result = await programService.getAssociationById({
      userId,
      startupId,
      associationId,
    });
    return apiResponse.sendSuccess(
      res,
      result,
      "Association details fetched successfully",
    );
  }),

  getAssociationDashboard: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { associationId } = req.params;
    const { startupId } = req.query;
    console.log("DASHBOARD IS calling",associationId, startupId)

    if (!associationId) throw new ApiError(400, "associationId is required");
    if (!startupId) throw new ApiError(400, "startupId is required");

    const result = await programService.getAssociationDashboard({
      userId,
      startupId,
      associationId,
    });
    return apiResponse.sendSuccess(
      res,
      result,
      "Association dashboard fetched successfully",
    );
  }),

  getAssociationDocumentRequests: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { associationId } = req.params;
    const { startupId } = req.query;

    if (!associationId) throw new ApiError(400, "associationId is required");
    if (!startupId) throw new ApiError(400, "startupId is required");

    const result = await programService.getAssociationDocumentRequests({
      userId,
      startupId,
      associationId,
    });
    return apiResponse.sendSuccess(
      res,
      result,
      "Association document requests fetched successfully",
    );
  }),

  getAssociationChangeRequests: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { associationId } = req.params;
    const { startupId } = req.query;

    if (!associationId) throw new ApiError(400, "associationId is required");
    if (!startupId) throw new ApiError(400, "startupId is required");

    const result = await programService.getAssociationChangeRequests({
      userId,
      startupId,
      associationId,
    });
    return apiResponse.sendSuccess(
      res,
      result,
      "Association change requests fetched successfully",
    );
  }),

  getAssociationFundingSummary: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { associationId } = req.params;
    const { startupId } = req.query;

    if (!associationId) throw new ApiError(400, "associationId is required");
    if (!startupId) throw new ApiError(400, "startupId is required");

    const result = await programService.getAssociationFundingSummary({
      userId,
      startupId,
      associationId,
    });
    return apiResponse.sendSuccess(
      res,
      result,
      "Association funding summary fetched successfully",
    );
  }),

  getAssociationsOverview: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startupId } = req.query;

    if (!startupId) throw new ApiError(400, "startupId is required");

    const result = await programService.getAssociationsOverview({
      userId,
      startupId,
    });
    return apiResponse.sendSuccess(
      res,
      result,
      "Associations overview fetched successfully",
    );
  }),

  submitDataCollectionResponse: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { assignmentId } = req.params;
    const { startupId, responses } = req.body;

    if (!startupId) throw new ApiError(400, "startupId is required");
    if (!assignmentId) throw new ApiError(400, "assignmentId is required");

    const result = await programService.submitDataCollectionResponse({
      userId,
      startupId,
      assignmentId,
      responses,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Response submitted successfully",
    );
  }),
};
