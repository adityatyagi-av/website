import { Router } from "express";
import { PanelController } from "../../../controllers/incubation/portal/panel.controller.js";
import { authenticatePortal } from "../../../middlewares/portal.auth.middleware.js";
import { requireAccessByMethod } from "../../../middlewares/access.middleware.js";
import { MODULE_KEYS } from "../../../config/modules.registry.js";

const PanelRouter = Router();

PanelRouter.use(["/panel", "/program", "/application"], authenticatePortal, requireAccessByMethod(MODULE_KEYS.PANEL));

PanelRouter.post("/panel/invite", PanelController.invitePanelMember);
PanelRouter.get("/panel/members", PanelController.getPanelMembers);
PanelRouter.post("/program/:programId/panel/assign", PanelController.assignPanelMembers);
PanelRouter.delete("/program/:programId/panel/:panelMemberId", PanelController.removePanelMember);
PanelRouter.get("/program/:programId/panel/members", PanelController.getProgramPanelMembers);
PanelRouter.get("/panel/pending-evaluations", PanelController.getPendingEvaluations);
PanelRouter.get("/application/:applicationId/evaluation-form", PanelController.getEvaluationForm);
PanelRouter.post("/application/:applicationId/evaluate", PanelController.submitEvaluation);
PanelRouter.get("/application/:applicationId/evaluations", PanelController.getEvaluations);
PanelRouter.get("/application/:applicationId/evaluation-summary", PanelController.getEvaluationSummary);

export default PanelRouter;
