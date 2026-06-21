import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";
import { IncubationMentorService } from "../../../services/incubation/portal/mentor.service.js";
import { resolveTenantId } from "../../../utils/tenantResolver.js";

export const IncubationMentorController = {
  discoverMentors: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    console.log("TENANT IS IS ", tenantId);
    const result = await IncubationMentorService.discoverMentors(
      tenantId,
      req.query,
    );
    return apiResponse.sendSuccess(res, result);
  }),

  getAssociatedMentors: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const result = await IncubationMentorService.getAssociatedMentors(
      tenantId,
      req.query,
    );
    return apiResponse.sendSuccess(res, result);
  }),

  getMentorProfile: asyncHandler(async (req, res) => {
    const { mentorId } = req.params;
    const tenantId = await resolveTenantId(req);
    const profile = await IncubationMentorService.getMentorProfile(
      tenantId,
      mentorId,
    );
    return apiResponse.sendSuccess(res, profile);
  }),

  inviteMentor: asyncHandler(async (req, res) => {
    const { mentorId } = req.params;
    const tenantId = await resolveTenantId(req);
    const association = await IncubationMentorService.inviteMentor(
      req.incubationUser.id,
      tenantId,
      mentorId,
      req.body,
    );
    return apiResponse.sendSuccess(res, association, "Invitation sent", 201);
  }),

  approveApplication: asyncHandler(async (req, res) => {
    const { associationId } = req.params;
    const tenantId = await resolveTenantId(req);
    const association = await IncubationMentorService.approveApplication(
      req.incubationUser.id,
      tenantId,
      associationId,
      req.body,
    );
    return apiResponse.sendSuccess(res, association, "Application approved");
  }),

  rejectApplication: asyncHandler(async (req, res) => {
    const { associationId } = req.params;
    const tenantId = await resolveTenantId(req);
    const { reason } = req.body;
    const association = await IncubationMentorService.rejectApplication(
      req.incubationUser.id,
      tenantId,
      associationId,
      reason,
    );
    return apiResponse.sendSuccess(res, association, "Application rejected");
  }),

  updateAssociation: asyncHandler(async (req, res) => {
    const { associationId } = req.params;
    const tenantId = await resolveTenantId(req);
    const association = await IncubationMentorService.updateAssociation(
      req.incubationUser.id,
      tenantId,
      associationId,
      req.body,
    );
    return apiResponse.sendSuccess(res, association, "Association updated");
  }),

  endAssociation: asyncHandler(async (req, res) => {
    const { associationId } = req.params;
    const { reason } = req.body;
    const tenantId = await resolveTenantId(req);
    const association = await IncubationMentorService.endAssociation(
      req.incubationUser.id,
      tenantId,
      associationId,
      reason,
    );
    return apiResponse.sendSuccess(res, association, "Association ended");
  }),

  getAssociationDetails: asyncHandler(async (req, res) => {
    const { associationId } = req.params;
    const tenantId = await resolveTenantId(req);
    const association = await IncubationMentorService.getAssociationDetails(
      tenantId,
      associationId,
    );
    return apiResponse.sendSuccess(res, association);
  }),

  getMentorUsage: asyncHandler(async (req, res) => {
    const { associationId } = req.params;
    const { month, year } = req.query;
    const tenantId = await resolveTenantId(req);
    const usage = await IncubationMentorService.getMentorUsage(
      tenantId,
      associationId,
      month,
      year,
    );
    return apiResponse.sendSuccess(res, usage);
  }),

  getPendingApplications: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const applications = await IncubationMentorService.getPendingApplications(
      tenantId,
      req.query,
    );
    return apiResponse.sendSuccess(res, applications);
  }),

  getAllSessions: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const result = await IncubationMentorService.getAllSessions(
      tenantId,
      req.query,
    );
    return apiResponse.sendSuccess(res, result);
  }),

  getSessionDetails: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const tenantId = await resolveTenantId(req);
    const session = await IncubationMentorService.getSessionDetails(
      tenantId,
      sessionId,
    );
    return apiResponse.sendSuccess(res, session);
  }),

  getMentorAnalytics: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const analytics = await IncubationMentorService.getMentorAnalytics(
      tenantId,
      req.query,
    );
    return apiResponse.sendSuccess(res, analytics);
  }),

  getMentorSpending: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const spending = await IncubationMentorService.getMentorSpending(
      tenantId,
      req.query,
    );
    return apiResponse.sendSuccess(res, spending);
  }),

  getStartupMentorUsage: asyncHandler(async (req, res) => {
    const { startupId } = req.params;
    const tenantId = await resolveTenantId(req);
    const usage = await IncubationMentorService.getStartupMentorUsage(
      tenantId,
      startupId,
      req.query,
    );
    return apiResponse.sendSuccess(res, usage);
  }),
};
