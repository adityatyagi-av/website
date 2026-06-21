import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";
import { DiscoverService } from "../../../services/ecosystem/networking/discover.service.js";
import { PeopleService } from "../../../services/ecosystem/networking/people.service.js";
import { CofounderService } from "../../../services/ecosystem/networking/cofounder.service.js";
import { IncubatorService } from "../../../services/ecosystem/networking/incubator.service.js";
import { StartupService } from "../../../services/ecosystem/networking/startup.service.js";
import { NetworkingPageService } from "../../../services/ecosystem/networking/page.service.js";
import { SuggestionService } from "../../../services/ecosystem/networking/suggestion.service.js";

export const NetworkingController = {
  discover: asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const data = await DiscoverService.discover(userId, req.query);
    return apiResponse.sendSuccess(res, data);
  }),

  globalSearch: asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const data = await DiscoverService.globalSearch(userId, req.query);
    return apiResponse.sendSuccess(res, data);
  }),

  discoverPeople: asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const data = await PeopleService.discoverPeople(userId, req.query);
    return apiResponse.sendSuccess(res, data);
  }),

  getPersonProfile: asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const data = await PeopleService.getPersonNetworkingProfile(userId, req.params.userId);
    if (!data) return apiResponse.sendNotFound(res, "User not found");
    return apiResponse.sendSuccess(res, data);
  }),

  getCofounderMatches: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const data = await CofounderService.getCofounderMatches(userId, req.query);
    return apiResponse.sendSuccess(res, data);
  }),

  getCofounderProfile: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const data = await CofounderService.getCofounderProfile(userId, req.params.userId);
    if (!data) return apiResponse.sendNotFound(res, "Co-founder profile not found");
    return apiResponse.sendSuccess(res, data);
  }),

  getCofounderPreferences: asyncHandler(async (req, res) => {
    const data = await CofounderService.getCofounderPreferences(req.user.id);
    return apiResponse.sendSuccess(res, data);
  }),

  upsertCofounderPreferences: asyncHandler(async (req, res) => {
    const data = await CofounderService.upsertCofounderPreferences(req.user.id, req.body);
    return apiResponse.sendSuccess(res, data, "Co-founder preferences updated");
  }),

  discoverIncubators: asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const data = await IncubatorService.discoverIncubators(userId, req.query);
    return apiResponse.sendSuccess(res, data);
  }),

  getIncubatorDetail: asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const data = await IncubatorService.getIncubatorDetail(userId, req.params.pageId);
    if (!data) return apiResponse.sendNotFound(res, "Incubator not found");
    return apiResponse.sendSuccess(res, data);
  }),

  discoverIncubatorPrograms: asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const data = await IncubatorService.discoverIncubatorPrograms(userId, req.query);
    return apiResponse.sendSuccess(res, data);
  }),

  getProgramDetail: asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const data = await IncubatorService.getProgramDetail(userId, req.params.programId);
    if (!data) return apiResponse.sendNotFound(res, "Program not found");
    return apiResponse.sendSuccess(res, data);
  }),

  discoverStartups: asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const data = await StartupService.discoverStartups(userId, req.query);
    return apiResponse.sendSuccess(res, data);
  }),

  getStartupDetail: asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const data = await StartupService.getStartupDetail(userId, req.params.pageId);
    if (!data) return apiResponse.sendNotFound(res, "Startup not found");
    return apiResponse.sendSuccess(res, data);
  }),

  discoverPages: asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    const data = await NetworkingPageService.discoverPages(userId, req.query);
    return apiResponse.sendSuccess(res, data);
  }),

  getMyNetwork: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const data = await SuggestionService.getMyNetwork(userId, req.query);
    return apiResponse.sendSuccess(res, data);
  }),

  getSuggestions: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const data = await SuggestionService.getSuggestions(userId, req.query);
    return apiResponse.sendSuccess(res, data);
  }),

  saveProfile: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { matchType, targetId } = req.params;
    const data = await DiscoverService.saveProfile(userId, matchType.toUpperCase(), targetId);
    return apiResponse.sendSuccess(res, data, "Profile saved");
  }),

  unsaveProfile: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { matchType, targetId } = req.params;
    const data = await DiscoverService.unsaveProfile(userId, matchType.toUpperCase(), targetId);
    return apiResponse.sendSuccess(res, data, "Profile unsaved");
  }),

  dismissProfile: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { matchType, targetId } = req.params;
    const data = await DiscoverService.dismissProfile(userId, matchType.toUpperCase(), targetId);
    return apiResponse.sendSuccess(res, data, "Profile dismissed");
  }),

  getSavedProfiles: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const data = await DiscoverService.getSavedProfiles(userId, req.query);
    return apiResponse.sendSuccess(res, data);
  }),
};
