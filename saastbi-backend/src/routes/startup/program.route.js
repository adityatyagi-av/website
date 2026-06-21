import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { ProgramController } from "../../controllers/startup/program.controller.js";

const StartupProgramRouter = Router();

StartupProgramRouter.get(
  "/programs/get-tenant-dropdown",
  ProgramController.getAllTenants
);

StartupProgramRouter.get(
  "/programs/programs",
  authenticate,
  ProgramController.getPrograms
);

StartupProgramRouter.get(
  "/programs/associated",
  authenticate,
  ProgramController.getAssociatedPrograms
);

StartupProgramRouter.get(
  "/program/:programId",
  authenticate,
  ProgramController.getProgramById
);
StartupProgramRouter.get(
  "/program/:programId/questions",
  authenticate,
  ProgramController.getProgramQuestions
);
StartupProgramRouter.post(
  "/program/:programId",
  authenticate,
  ProgramController.submitApplication
);

StartupProgramRouter.post(
  "/application/respond-change",
  authenticate,
  ProgramController.respondChange
);

StartupProgramRouter.post(
  "/application/respond-document",
  authenticate,
  ProgramController.respondDocument
);

StartupProgramRouter.get(
  "/applications",
  authenticate,
  ProgramController.getAllApplications
);

StartupProgramRouter.get(
  "/application/:applicationId",
  authenticate,
  ProgramController.getApplicationById
);

StartupProgramRouter.get(
  "/application/:applicationId/summary",
  authenticate,
  ProgramController.getApplicationSummary
);

StartupProgramRouter.get(
  "/application/:applicationId/history",
  authenticate,
  ProgramController.getApplicationHistory
);

StartupProgramRouter.get(
  "/application/:applicationId/change-requests",
  authenticate,
  ProgramController.getChangeRequests
);

StartupProgramRouter.get(
  "/application/:applicationId/change-request/:changeRequestId",
  authenticate,
  ProgramController.getChangeRequestById
);

StartupProgramRouter.get(
  "/application/:applicationId/document-requests",
  authenticate,
  ProgramController.getDocumentRequests
);

StartupProgramRouter.get(
  "/application/:applicationId/document-request/:documentRequestId",
  authenticate,
  ProgramController.getDocumentRequestById
);

StartupProgramRouter.get(
  "/application/:applicationId/disbursement-history",
  authenticate,
  ProgramController.getDisbursementHistory
);

StartupProgramRouter.post(
  "/application/:applicationId/funding-request",
  authenticate,
  ProgramController.createFundingRequest
);

StartupProgramRouter.get(
  "/application/:applicationId/funding-requests",
  authenticate,
  ProgramController.getFundingRequests
);

StartupProgramRouter.patch(
  "/funding-request/:requestId/cancel",
  authenticate,
  ProgramController.cancelFundingRequest
);

StartupProgramRouter.get(
  "/data-collection-requests",
  authenticate,
  ProgramController.getDataCollectionRequests
);

StartupProgramRouter.get(
  "/data-collection-assignment/:assignmentId",
  authenticate,
  ProgramController.getDataCollectionAssignment
);

StartupProgramRouter.post(
  "/data-collection-assignment/:assignmentId/respond",
  authenticate,
  ProgramController.submitDataCollectionResponse
);

StartupProgramRouter.post(
  "/application/:applicationId/document-request/:documentRequestId/response",
  authenticate,
  ProgramController.submitDocumentResponse
);

StartupProgramRouter.post(
  "/application/:applicationId/document-request/:documentRequestId/resubmit",
  authenticate,
  ProgramController.resubmitDocumentResponse
);

StartupProgramRouter.patch(
  "/document-response/:responseId/withdraw",
  authenticate,
  ProgramController.withdrawDocumentResponse
);

StartupProgramRouter.get(
  "/document-responses",
  authenticate,
  ProgramController.getMyDocumentResponses
);

StartupProgramRouter.get(
  "/document-response/:responseId",
  authenticate,
  ProgramController.getDocumentResponseById
);

StartupProgramRouter.get(
  "/associations/overview",
  authenticate,
  ProgramController.getAssociationsOverview
);

StartupProgramRouter.get(
  "/association/:associationId",
  authenticate,
  ProgramController.getAssociationById
);

StartupProgramRouter.get(
  "/association/:associationId/dashboard",
  authenticate,
  ProgramController.getAssociationDashboard
);

StartupProgramRouter.get(
  "/association/:associationId/document-requests",
  authenticate,
  ProgramController.getAssociationDocumentRequests
);

StartupProgramRouter.get(
  "/association/:associationId/change-requests",
  authenticate,
  ProgramController.getAssociationChangeRequests
);

StartupProgramRouter.get(
  "/association/:associationId/funding-summary",
  authenticate,
  ProgramController.getAssociationFundingSummary
);

export default StartupProgramRouter;