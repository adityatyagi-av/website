import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/responseUtils.js";
import { IncubatorAssociationService } from "../../services/mentor/incubator-association.service.js";

export const IncubatorAssociationController = {
  apply: asyncHandler(async (req, res) => {
    const { tenantId } = req.params;
    const association = await IncubatorAssociationService.apply(req.user.id, tenantId, req.body);
    return apiResponse.sendSuccess(res, association, "Application submitted", 201);
  }),

  respond: asyncHandler(async (req, res) => {
    const { associationId } = req.params;
    const { action, notes } = req.body;
    const association = await IncubatorAssociationService.respondToInvitation(
      req.user.id,
      associationId,
      action,
      notes
    );
    return apiResponse.sendSuccess(res, association, `Invitation ${action.toLowerCase()}ed`);
  }),

  invite: asyncHandler(async (req, res) => {
    const { mentorId } = req.params;
    const { tenantId } = req.incubationUser;
    const association = await IncubatorAssociationService.invite(
      req.incubationUser.id,
      tenantId,
      mentorId,
      req.body
    );
    return apiResponse.sendSuccess(res, association, "Invitation sent", 201);
  }),

  approve: asyncHandler(async (req, res) => {
    const { associationId } = req.params;
    const { tenantId } = req.incubationUser;
    const association = await IncubatorAssociationService.approve(
      req.incubationUser.id,
      tenantId,
      associationId,
      req.body
    );
    return apiResponse.sendSuccess(res, association, "Application approved");
  }),

  reject: asyncHandler(async (req, res) => {
    const { associationId } = req.params;
    const { tenantId } = req.incubationUser;
    const { reason } = req.body;
    const association = await IncubatorAssociationService.reject(
      req.incubationUser.id,
      tenantId,
      associationId,
      reason
    );
    return apiResponse.sendSuccess(res, association, "Application rejected");
  }),

  update: asyncHandler(async (req, res) => {
    const { associationId } = req.params;
    const { tenantId } = req.incubationUser;
    const association = await IncubatorAssociationService.update(
      req.incubationUser.id,
      tenantId,
      associationId,
      req.body
    );
    return apiResponse.sendSuccess(res, association, "Association updated");
  }),

  endAsMentor: asyncHandler(async (req, res) => {
    const { associationId } = req.params;
    const { reason } = req.body;
    const association = await IncubatorAssociationService.end(req.user.id, associationId, reason, true);
    return apiResponse.sendSuccess(res, association, "Partnership ended");
  }),

  endAsIncubator: asyncHandler(async (req, res) => {
    const { associationId } = req.params;
    const { reason } = req.body;
    const association = await IncubatorAssociationService.end(
      req.incubationUser.id,
      associationId,
      reason,
      false
    );
    return apiResponse.sendSuccess(res, association, "Partnership ended");
  }),

  getMentorAssociations: asyncHandler(async (req, res) => {
    const result = await IncubatorAssociationService.getMentorAssociations(req.user.id, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  getIncubatorMentors: asyncHandler(async (req, res) => {
    const { tenantId } = req.incubationUser;
    const result = await IncubatorAssociationService.getIncubatorMentors(tenantId, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  getUsage: asyncHandler(async (req, res) => {
    const { associationId } = req.params;
    const { month, year } = req.query;
    const usage = await IncubatorAssociationService.getUsage(associationId, month, year);
    return apiResponse.sendSuccess(res, usage);
  }),

  getAvailableIncubators: asyncHandler(async (req, res) => {
    const incubators = await IncubatorAssociationService.getAvailableIncubators(req.user.id);
    return apiResponse.sendSuccess(res, incubators);
  }),
};
