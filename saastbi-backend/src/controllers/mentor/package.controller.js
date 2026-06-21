import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/responseUtils.js";
import { PackageService } from "../../services/mentor/package.service.js";

export const PackageController = {
  create: asyncHandler(async (req, res) => {
    const package_ = await PackageService.create(req.user.id, req.body);
    return apiResponse.sendSuccess(res, package_, "Package created", 201);
  }),

  getOwn: asyncHandler(async (req, res) => {
    const packages = await PackageService.getOwn(req.user.id);
    return apiResponse.sendSuccess(res, packages);
  }),

  getByMentor: asyncHandler(async (req, res) => {
    const { mentorId } = req.params;
    const packages = await PackageService.getByMentor(mentorId);
    return apiResponse.sendSuccess(res, packages);
  }),

  update: asyncHandler(async (req, res) => {
    const { packageId } = req.params;
    const package_ = await PackageService.update(req.user.id, packageId, req.body);
    return apiResponse.sendSuccess(res, package_, "Package updated");
  }),

  delete: asyncHandler(async (req, res) => {
    const { packageId } = req.params;
    await PackageService.delete(req.user.id, packageId);
    return apiResponse.sendSuccess(res, null, "Package deleted");
  }),

  subscribe: asyncHandler(async (req, res) => {
    const { mentorId, packageId } = req.params;
    const subscription = await PackageService.subscribe(req.user.id, mentorId, packageId, req.body);
    return apiResponse.sendSuccess(res, subscription, "Subscribed to package", 201);
  }),

  getSubscriptions: asyncHandler(async (req, res) => {
    const result = await PackageService.getSubscriptions(req.user.id, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  getStartupSubscriptions: asyncHandler(async (req, res) => {
    const { startupId } = req.params;
    const result = await PackageService.getSubscriptions(req.user.id, req.query, startupId);
    return apiResponse.sendSuccess(res, result);
  }),

  getSubscriptionById: asyncHandler(async (req, res) => {
    const { subscriptionId } = req.params;
    const subscription = await PackageService.getSubscriptionById(req.user.id, subscriptionId);
    return apiResponse.sendSuccess(res, subscription);
  }),

  getPackageSubscribers: asyncHandler(async (req, res) => {
    const { packageId } = req.params;
    const result = await PackageService.getPackageSubscribers(req.user.id, packageId, req.query);
    return apiResponse.sendSuccess(res, result);
  }),
};
