import { Router } from "express";
import { ProgramController } from "../../../controllers/incubation/portal/program.controller.js";
import { BatchController } from "../../../controllers/incubation/portal/batch.controller.js";
import { authenticatePortal } from "../../../middlewares/portal.auth.middleware.js";
import { requireAccess } from "../../../middlewares/access.middleware.js";
import { MODULE_KEYS, ACTIONS } from "../../../config/modules.registry.js";

const ProgramRouter = Router();

const creation = (action) => [authenticatePortal, requireAccess({ module: MODULE_KEYS.PROGRAM_CREATION, action })];
const management = (action) => [authenticatePortal, requireAccess({ module: MODULE_KEYS.PROGRAM_MANAGEMENT, action })];

// ===== Program Creation surface =====
ProgramRouter.get("/program/scheme-types", ...creation(ACTIONS.R), ProgramController.searchSchemeTypes);
ProgramRouter.post("/program/scheme-type", ...creation(ACTIONS.C), ProgramController.createSchemeType);
ProgramRouter.get("/program/governing-bodies", ...creation(ACTIONS.R), ProgramController.searchGoverningBodies);
ProgramRouter.post("/program/governing-body", ...creation(ACTIONS.C), ProgramController.createGoverningBody);

ProgramRouter.get("/program/scheme-questions", ...creation(ACTIONS.R), ProgramController.getSchemeQuestions);
ProgramRouter.post("/program/scheme-question", ...creation(ACTIONS.C), ProgramController.createSchemeQuestion);
ProgramRouter.patch("/program/scheme-question/:id", ...creation(ACTIONS.U), ProgramController.updateSchemeQuestion);
ProgramRouter.delete("/program/scheme-question/:id", ...creation(ACTIONS.D), ProgramController.deleteSchemeQuestion);

ProgramRouter.post("/program/create-program", ...creation(ACTIONS.C), ProgramController.createProgram);
ProgramRouter.get("/program/get-program-dropdown", ...creation(ACTIONS.R), ProgramController.getProgramsDropdown);
ProgramRouter.get("/program/get-all-programs", ...creation(ACTIONS.R), ProgramController.getAllPrograms);
ProgramRouter.get("/program/get-program-detail/:id", ...creation(ACTIONS.R), ProgramController.getProgramById);
ProgramRouter.patch("/program/update-program-detail/:id", ...creation(ACTIONS.U), ProgramController.updateProgram);

ProgramRouter.post("/evaluation-question/create", ...creation(ACTIONS.C), ProgramController.createEvaluationQuestion);
ProgramRouter.patch("/evaluation-question/update/:id", ...creation(ACTIONS.U), ProgramController.updateEvaluationQuestion);
ProgramRouter.delete("/evaluation-question/delete/:id", ...creation(ACTIONS.D), ProgramController.deleteEvaluationQuestion);
ProgramRouter.patch("/evaluation-question/reorder", ...creation(ACTIONS.U), ProgramController.reorderEvaluationQuestions);
ProgramRouter.patch("/evaluation-question/toggle-active/:id", ...creation(ACTIONS.U), ProgramController.toggleActiveStatus);

// ===== Program Management surface =====
ProgramRouter.get("/program/:programId/registrations", ...management(ACTIONS.R), ProgramController.getProgramRegistrations);
ProgramRouter.get("/program/:programId/registrations/:registrationId", ...management(ACTIONS.R), ProgramController.getProgramRegistrationById);

ProgramRouter.post("/application/request-changes", ...management(ACTIONS.U), ProgramController.requestChanges);
ProgramRouter.patch("/application/:applicationId/change-status", ...management(ACTIONS.U), ProgramController.changeApplicationStatus);
ProgramRouter.post("/application/request-document", ...management(ACTIONS.U), ProgramController.requestDocument);
ProgramRouter.post("/startup/request-document",...management(ACTIONS.U),ProgramController.requestStartupDocument);
ProgramRouter.post("/application/submit-evaluation", ...management(ACTIONS.C), ProgramController.submitEvaluation);
ProgramRouter.get("/application/:applicationId/changes/pending", ...management(ACTIONS.R), ProgramController.getPendingChanges);
ProgramRouter.get("/application/:applicationId/changes/completed", ...management(ACTIONS.R), ProgramController.getCompletedChanges);
ProgramRouter.get("/application/:applicationId/changes/received", ...management(ACTIONS.R), ProgramController.getReceivedChanges);
ProgramRouter.post("/application/:applicationId/changes/:changeRequestId/rerequest", ...management(ACTIONS.U), ProgramController.reRequestChange);
ProgramRouter.post("/application/:applicationId/changes/:changeRequestId/approve", ...management(ACTIONS.U), ProgramController.approveChange);
ProgramRouter.post("/application/:applicationId/changes/:changeRequestId/reject", ...management(ACTIONS.U), ProgramController.rejectChange);

ProgramRouter.get("/startups/search", ...management(ACTIONS.R), ProgramController.searchStartupsForProgram);
ProgramRouter.get("/startup/:startupId", ...management(ACTIONS.R), ProgramController.getStartupDetailsForIncubator);
ProgramRouter.post("/program/:programId/add-existing-startup", ...management(ACTIONS.C), ProgramController.addExistingStartupToProgram);
ProgramRouter.post("/program/:programId/create-startup", ...management(ACTIONS.C), ProgramController.createStartupAndAddToProgram);
ProgramRouter.delete("/program/:programId/startup/:startupId", ...management(ACTIONS.C), ProgramController.removeStartupFromProgram);
ProgramRouter.get("/programs/:programId/startups", ...management(ACTIONS.R), ProgramController.getStartupsByProgram);

ProgramRouter.get("/application/:applicationId/evaluations", ...management(ACTIONS.R), ProgramController.getApplicationEvaluations);
ProgramRouter.get("/application/:applicationId/evaluation/:evaluationId", ...management(ACTIONS.R), ProgramController.getEvaluationById);
ProgramRouter.get("/application/:applicationId/evaluation-summary", ...management(ACTIONS.R), ProgramController.getEvaluationSummary);

// ===== Batches (Management) =====
ProgramRouter.post("/program/:programId/batch", ...management(ACTIONS.C), BatchController.createBatch);
ProgramRouter.get("/program/:programId/batches", ...management(ACTIONS.R), BatchController.getBatchesByProgram);
ProgramRouter.get("/program/:programId/batch/:batchId", ...management(ACTIONS.R), BatchController.getBatchById);
ProgramRouter.patch("/program/:programId/batch/:batchId", ...management(ACTIONS.U), BatchController.updateBatch);
ProgramRouter.patch("/program/:programId/batch/:batchId/status", ...management(ACTIONS.U), BatchController.changeBatchStatus);
ProgramRouter.delete("/program/:programId/batch/:batchId", ...management(ACTIONS.D), BatchController.deleteBatch);
ProgramRouter.get("/program/:programId/batch/:batchId/registrations", ...management(ACTIONS.R), BatchController.getBatchRegistrations);
ProgramRouter.get("/program/:programId/batch/:batchId/startups", ...management(ACTIONS.R), BatchController.getBatchStartups);
ProgramRouter.post("/program/:programId/batch/:batchId/bulk-register", ...management(ACTIONS.C), ProgramController.bulkRegisterStartups);
ProgramRouter.post("/program/:programId/bulk-register", ...management(ACTIONS.C), ProgramController.bulkRegisterStartups);

ProgramRouter.post("/bulk-request-documents", ...management(ACTIONS.U), ProgramController.bulkRequestDocuments);
ProgramRouter.get("/program/:programId/document-requests", ...management(ACTIONS.R), ProgramController.getDocumentRequestsByProgram);
ProgramRouter.get("/document-request/:documentRequestId", ...management(ACTIONS.R), ProgramController.getDocumentRequestById);
ProgramRouter.get("/document-response/:responseId", ...management(ACTIONS.R), ProgramController.getDocumentResponseById);
ProgramRouter.patch("/document-request/:documentRequestId/reopen", ...management(ACTIONS.U), ProgramController.reopenDocumentRequest);

ProgramRouter.post("/program/:programId/data-collection-request", ...management(ACTIONS.C), ProgramController.createDataCollectionRequest);
ProgramRouter.get("/program/:programId/data-collection-requests", ...management(ACTIONS.R), ProgramController.getDataCollectionRequests);
ProgramRouter.get("/data-collection-request/:requestId", ...management(ACTIONS.R), ProgramController.getDataCollectionRequestById);
ProgramRouter.patch("/data-collection-request/:requestId", ...management(ACTIONS.U), ProgramController.updateDataCollectionRequest);
ProgramRouter.patch("/data-collection-assignment/:assignmentId/review", ...management(ACTIONS.U), ProgramController.reviewDataCollectionSubmission);
ProgramRouter.patch("/data-collection-request/:requestId/close", ...management(ACTIONS.U), ProgramController.closeDataCollectionRequest);

export default ProgramRouter;
