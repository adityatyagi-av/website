import { asyncHandler } from "../../../utils/asyncHandler.js";
import { ApiError } from "../../../utils/ApiError.js";
import { panelService } from "../../../services/incubation/portal/panel.service.js";
import { apiResponse } from "../../../utils/responseUtils.js";
import db from "../../../db/db.js";

export const PanelController = {
  // Invite/create panel member
  invitePanelMember: asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    const tenantKey = req.headers["tenantkey"] || req.body.tenantKey;
    const addedById = req.user.incubationUserId;

    if (!tenantKey) throw new ApiError(400, "tenantKey is required");
    if (!name || !email || !password) throw new ApiError(400, "name, email, and password are required");

    const result = await panelService.invitePanelMember({
      tenantKey,
      name,
      email,
      password,
      addedById,
    });

    return apiResponse.sendSuccess(res, result, "Panel member invited successfully");
  }),

  // Get all panel members for tenant
  getPanelMembers: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"] || req.query.tenantKey;
    if (!tenantKey) throw new ApiError(400, "tenantKey is required");

    const members = await panelService.getPanelMembers({ tenantKey });
    return apiResponse.sendSuccess(res, members, "Panel members fetched successfully");
  }),

  // Assign panel members to program
  assignPanelMembers: asyncHandler(async (req, res) => {
    const { programId } = req.params;
    const { userIds, batchId } = req.body;
    const assignedById = req.user.incubationUserId;
    const tenantKey = req.headers["tenantkey"];

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      throw new ApiError(400, "userIds array is required");
    }

    let tenantId = null;
    if (tenantKey) {
      const tenant = await db.tenant.findUnique({ where: { tenantKey } });
      if (tenant) tenantId = tenant.id;
    }

    const result = await panelService.assignPanelMembers({
      programId,
      batchId: batchId || null,
      userIds,
      assignedById,
      tenantId,
    });

    return apiResponse.sendSuccess(res, result, "Panel members assigned successfully");
  }),

  // Remove panel member from program
  removePanelMember: asyncHandler(async (req, res) => {
    const { programId, panelMemberId } = req.params;
    const { batchId } = req.query;

    await panelService.removePanelMember({ programId, panelMemberId, batchId });
    return apiResponse.sendSuccess(res, null, "Panel member removed from program");
  }),
  // Get panel members for a program
  getProgramPanelMembers: asyncHandler(async (req, res) => {
    const { programId } = req.params;

    const members = await panelService.getProgramPanelMembers({ programId });
    return apiResponse.sendSuccess(res, members, "Program panel members fetched successfully");
  }),

  // Get applications pending evaluation for panel member / program manager / admin
  getPendingEvaluations: asyncHandler(async (req, res) => {
    const panelMemberId = req.user.incubationUserId;
    const incubationUserId = req.user.incubationUserId;
    const { programId, batchId } = req.query;

    const applications = await panelService.getPendingEvaluations({
      panelMemberId,
      incubationUserId,
      programId,
      batchId,
      isAdmin: req.user.isAdmin,
      tenantId: req.user.tenantId,
    });
    return apiResponse.sendSuccess(res, applications, "Pending evaluations fetched successfully");
  }),

  // Get evaluation form for application
  getEvaluationForm: asyncHandler(async (req, res) => {
    const { applicationId } = req.params;

    const form = await panelService.getEvaluationForm({ applicationId });
    return apiResponse.sendSuccess(res, form, "Evaluation form fetched successfully");
  }),

  // Submit evaluation
  submitEvaluation: asyncHandler(async (req, res) => {
    const { applicationId } = req.params;
    const { answers, remarks } = req.body;
    const evaluatorId = req.user.incubationUserId;

    if (!answers || !Array.isArray(answers)) {
      throw new ApiError(400, "answers array is required");
    }

    const result = await panelService.submitEvaluation({
      applicationId,
      evaluatorId,
      answers,
      remarks,
      isAdmin: req.user.isAdmin,
    });

    return apiResponse.sendSuccess(res, result, "Evaluation submitted successfully");
  }),

  // Get all evaluations for application
  getEvaluations: asyncHandler(async (req, res) => {
    const { applicationId } = req.params;

    const evaluations = await panelService.getEvaluations({ applicationId });
    return apiResponse.sendSuccess(res, evaluations, "Evaluations fetched successfully");
  }),

  // Get evaluation summary
  getEvaluationSummary: asyncHandler(async (req, res) => {
    const { applicationId } = req.params;

    const summary = await panelService.getEvaluationSummary({ applicationId });
    return apiResponse.sendSuccess(res, summary, "Evaluation summary fetched successfully");
  }),
};
