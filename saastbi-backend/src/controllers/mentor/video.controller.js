import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/responseUtils.js";
import { VideoService } from "../../services/mentor/video.service.js";

export const VideoController = {
  getJoinInfo: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const joinInfo = await VideoService.getJoinInfo(req.user.id, sessionId);
    return apiResponse.sendSuccess(res, joinInfo);
  }),

  startSession: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const session = await VideoService.startSession(req.user.id, sessionId);
    return apiResponse.sendSuccess(res, session, "Session started");
  }),

  endSession: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const session = await VideoService.endSession(req.user.id, sessionId);
    return apiResponse.sendSuccess(res, session, "Session ended");
  }),

  startRecording: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const result = await VideoService.startRecording(req.user.id, sessionId);
    return apiResponse.sendSuccess(res, result);
  }),

  stopRecording: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const result = await VideoService.stopRecording(req.user.id, sessionId);
    return apiResponse.sendSuccess(res, result);
  }),

  getRecordings: asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const recordings = await VideoService.getRecordings(req.user.id, sessionId);
    return apiResponse.sendSuccess(res, recordings);
  }),
};
