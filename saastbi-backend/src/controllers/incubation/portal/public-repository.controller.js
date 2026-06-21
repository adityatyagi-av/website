import { publicRepositoryService } from "../../../services/incubation/portal/public-repository.service.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";
import { resolveTenantId } from "../../../utils/tenantResolver.js";

export const PublicRepositoryController = {
  createRepository: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const creatorId = req.user.incubationUserId;
    const repository = await publicRepositoryService.createRepository({
      tenantId,
      creatorId,
      data: req.body,
    });
    return apiResponse.sendSuccess(res, repository, "Repository created", 201);
  }),

  getRepositories: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { page, limit, sortBy, order, status, search } = req.query;
    const result = await publicRepositoryService.getRepositories({
      tenantId,
      filters: { status, search },
      pagination: { page: Number(page) || 1, limit: Number(limit) || 20, sortBy, order },
    });
    return apiResponse.sendSuccess(res, result, "Repositories fetched");
  }),

  getRepositoryById: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { repositoryId } = req.params;
    const repository = await publicRepositoryService.getRepositoryById({ tenantId, repositoryId });
    return apiResponse.sendSuccess(res, repository, "Repository details");
  }),

  updateRepository: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { repositoryId } = req.params;
    const repository = await publicRepositoryService.updateRepository({
      tenantId,
      repositoryId,
      data: req.body,
    });
    return apiResponse.sendSuccess(res, repository, "Repository updated");
  }),

  deleteRepository: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { repositoryId } = req.params;
    const result = await publicRepositoryService.deleteRepository({ tenantId, repositoryId });
    return apiResponse.sendSuccess(res, result, "Repository archived");
  }),

  regenerateApiKey: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { repositoryId } = req.params;
    const repository = await publicRepositoryService.regenerateApiKey({ tenantId, repositoryId });
    return apiResponse.sendSuccess(res, repository, "API key regenerated");
  }),

  getRepositoryStats: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { repositoryId } = req.params;
    const stats = await publicRepositoryService.getRepositoryStats({ tenantId, repositoryId });
    return apiResponse.sendSuccess(res, stats, "Repository statistics");
  }),

  getAccessLogs: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { repositoryId } = req.params;
    const { page, limit, sortBy, order } = req.query;
    const result = await publicRepositoryService.getAccessLogs({
      tenantId,
      repositoryId,
      pagination: { page: Number(page) || 1, limit: Number(limit) || 50, sortBy, order },
    });
    return apiResponse.sendSuccess(res, result, "Access logs fetched");
  }),

  addItem: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const creatorId = req.user.incubationUserId;
    const { repositoryId } = req.params;
    const item = await publicRepositoryService.addItem({
      tenantId,
      repositoryId,
      creatorId,
      data: req.body,
    });
    return apiResponse.sendSuccess(res, item, "Item added", 201);
  }),

  getItems: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { repositoryId } = req.params;
    const { page, limit, sortBy, order, isActive } = req.query;
    const result = await publicRepositoryService.getItems({
      tenantId,
      repositoryId,
      filters: { isActive },
      pagination: { page: Number(page) || 1, limit: Number(limit) || 20, sortBy, order },
    });
    return apiResponse.sendSuccess(res, result, "Items fetched");
  }),

  getItemById: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { repositoryId, itemId } = req.params;
    const item = await publicRepositoryService.getItemById({ tenantId, repositoryId, itemId });
    return apiResponse.sendSuccess(res, item, "Item details");
  }),

  updateItem: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { repositoryId, itemId } = req.params;
    const item = await publicRepositoryService.updateItem({
      tenantId,
      repositoryId,
      itemId,
      data: req.body,
    });
    return apiResponse.sendSuccess(res, item, "Item updated");
  }),

  deleteItem: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { repositoryId, itemId } = req.params;
    const result = await publicRepositoryService.deleteItem({ tenantId, repositoryId, itemId });
    return apiResponse.sendSuccess(res, result, "Item deleted");
  }),

  bulkAddItems: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const creatorId = req.user.incubationUserId;
    const { repositoryId } = req.params;
    const { items } = req.body;
    const result = await publicRepositoryService.bulkAddItems({
      tenantId,
      repositoryId,
      creatorId,
      items,
    });
    return apiResponse.sendSuccess(res, result, "Items added", 201);
  }),

  bulkDeleteItems: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { repositoryId } = req.params;
    const { itemIds } = req.body;
    const result = await publicRepositoryService.bulkDeleteItems({
      tenantId,
      repositoryId,
      itemIds,
    });
    return apiResponse.sendSuccess(res, result, "Items deleted");
  }),
};
