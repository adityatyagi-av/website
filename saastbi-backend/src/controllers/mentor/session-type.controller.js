import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/responseUtils.js";
import { SessionTypeService } from "../../services/mentor/session-type.service.js";

export const SessionTypeController = {
  create: asyncHandler(async (req, res) => {
    const sessionType = await SessionTypeService.create(req.user.id, req.body);
    return apiResponse.sendSuccess(res, sessionType, "Session type created", 201);
  }),

  getOwn: asyncHandler(async (req, res) => {
    const sessionTypes = await SessionTypeService.getOwn(req.user.id);
    return apiResponse.sendSuccess(res, sessionTypes);
  }),

  getByMentor: asyncHandler(async (req, res) => {
    const { mentorId } = req.params;
    const result = await SessionTypeService.getByMentor(mentorId);
    return apiResponse.sendSuccess(res, result);
  }),

  update: asyncHandler(async (req, res) => {
    const { sessionTypeId } = req.params;
    const sessionType = await SessionTypeService.update(req.user.id, sessionTypeId, req.body);
    return apiResponse.sendSuccess(res, sessionType, "Session type updated");
  }),

  delete: asyncHandler(async (req, res) => {
    const { sessionTypeId } = req.params;
    await SessionTypeService.delete(req.user.id, sessionTypeId);
    return apiResponse.sendSuccess(res, null, "Session type deleted");
  }),

  toggle: asyncHandler(async (req, res) => {
    const { sessionTypeId } = req.params;
    const sessionType = await SessionTypeService.toggle(req.user.id, sessionTypeId);
    return apiResponse.sendSuccess(res, sessionType, `Session type ${sessionType.isActive ? "activated" : "deactivated"}`);
  }),
};
