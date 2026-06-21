import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/responseUtils.js";
import { AvailabilityService } from "../../services/mentor/availability.service.js";

export const AvailabilityController = {
  getOwn: asyncHandler(async (req, res) => {
    const availability = await AvailabilityService.getOwn(req.user.id);
    return apiResponse.sendSuccess(res, availability);
  }),

  setAvailability: asyncHandler(async (req, res) => {
    const { slots } = req.body;
    const availability = await AvailabilityService.setAvailability(req.user.id, slots);
    return apiResponse.sendSuccess(res, availability, "Availability updated");
  }),

  getAvailableSlots: asyncHandler(async (req, res) => {
    const { mentorId } = req.params;
    const slots = await AvailabilityService.getAvailableSlots(mentorId, req.query);
    return apiResponse.sendSuccess(res, slots);
  }),

  getQuickAvailability: asyncHandler(async (req, res) => {
    const { mentorId } = req.params;
    const days = parseInt(req.query.days) || 7;
    const availability = await AvailabilityService.getQuickAvailability(mentorId, days);
    return apiResponse.sendSuccess(res, availability);
  }),

  getOwnQuickAvailability: asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days) || 7;
    const availability = await AvailabilityService.getOwnQuickAvailability(req.user.id, days);
    return apiResponse.sendSuccess(res, availability);
  }),

  getCalendarAvailability: asyncHandler(async (req, res) => {
    const { mentorId } = req.params;
    let { month, year } = req.query;

    const now = new Date();
    if (!month) month = now.getMonth() + 1;
    if (!year) year = now.getFullYear();

    const calendar = await AvailabilityService.getCalendarAvailability(
      mentorId,
      parseInt(month),
      parseInt(year)
    );
    return apiResponse.sendSuccess(res, calendar);
  }),
};
