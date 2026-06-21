import { incubationTaskService } from "../../../services/incubation/portal/task.service.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";
import { resolveTenantId } from "../../../utils/tenantResolver.js";

export const TaskController = {
  createTask: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const creatorId = req.user.incubationUserId;
    const task = await incubationTaskService.createTask({
      tenantId,
      creatorId,
      data: req.body,
    });
    return apiResponse.sendSuccess(res, task, "Task created", 201);
  }),

  getTasks: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { page, limit, sortBy, order, status, priority, assigneeId, label, search, fromDate, toDate, isOverdue } = req.query;
    const result = await incubationTaskService.getTasks({
      tenantId,
      filters: { status, priority, assigneeId, label, search, fromDate, toDate, isOverdue },
      pagination: { page: Number(page) || 1, limit: Number(limit) || 20, sortBy, order },
    });
    return apiResponse.sendSuccess(res, result, "Tasks fetched");
  }),

  getTaskById: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { taskId } = req.params;
    const task = await incubationTaskService.getTaskById({ tenantId, taskId });
    return apiResponse.sendSuccess(res, task, "Task details");
  }),

  updateTask: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const actorId = req.user.incubationUserId;
    const { taskId } = req.params;
    const task = await incubationTaskService.updateTask({
      tenantId,
      taskId,
      actorId,
      data: req.body,
    });
    return apiResponse.sendSuccess(res, task, "Task updated");
  }),

  updateTaskStatus: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const actorId = req.user.incubationUserId;
    const { taskId } = req.params;
    const { status } = req.body;
    const task = await incubationTaskService.updateTaskStatus({
      tenantId,
      taskId,
      status,
      actorId,
    });
    return apiResponse.sendSuccess(res, task, "Task status updated");
  }),

  assignTask: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const actorId = req.user.incubationUserId;
    const { taskId } = req.params;
    const { assigneeId } = req.body;
    const task = await incubationTaskService.assignTask({
      tenantId,
      taskId,
      assigneeId,
      actorId,
    });
    return apiResponse.sendSuccess(res, task, "Task assigned");
  }),

  archiveTask: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { taskId } = req.params;
    const task = await incubationTaskService.archiveTask({ tenantId, taskId });
    return apiResponse.sendSuccess(res, task, "Task archived");
  }),

  getMyTasks: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const userId = req.user.incubationUserId;
    const { page, limit, sortBy, order, status } = req.query;
    const result = await incubationTaskService.getMyTasks({
      tenantId,
      userId,
      filters: { status },
      pagination: { page: Number(page) || 1, limit: Number(limit) || 20, sortBy, order },
    });
    return apiResponse.sendSuccess(res, result, "My tasks fetched");
  }),

  getCreatedByMe: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const userId = req.user.incubationUserId;
    const { page, limit, sortBy, order, status } = req.query;
    const result = await incubationTaskService.getCreatedByMe({
      tenantId,
      userId,
      filters: { status },
      pagination: { page: Number(page) || 1, limit: Number(limit) || 20, sortBy, order },
    });
    return apiResponse.sendSuccess(res, result, "Created tasks fetched");
  }),

  getOverdueTasks: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { page, limit, sortBy, order } = req.query;
    const result = await incubationTaskService.getOverdueTasks({
      tenantId,
      filters: {},
      pagination: { page: Number(page) || 1, limit: Number(limit) || 20, sortBy, order },
    });
    return apiResponse.sendSuccess(res, result, "Overdue tasks fetched");
  }),

  getTaskStats: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const stats = await incubationTaskService.getTaskStats({ tenantId });
    return apiResponse.sendSuccess(res, stats, "Task statistics");
  }),

  addSubtask: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const creatorId = req.user.incubationUserId;
    const { taskId } = req.params;
    const { title } = req.body;
    const subtask = await incubationTaskService.addSubtask({
      tenantId,
      taskId,
      title,
      creatorId,
    });
    return apiResponse.sendSuccess(res, subtask, "Subtask added", 201);
  }),

  updateSubtask: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { taskId, subtaskId } = req.params;
    const { title } = req.body;
    const subtask = await incubationTaskService.updateSubtask({
      tenantId,
      taskId,
      subtaskId,
      title,
    });
    return apiResponse.sendSuccess(res, subtask, "Subtask updated");
  }),

  toggleSubtask: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const userId = req.user.incubationUserId;
    const { taskId, subtaskId } = req.params;
    const subtask = await incubationTaskService.toggleSubtask({
      tenantId,
      taskId,
      subtaskId,
      userId,
    });
    return apiResponse.sendSuccess(res, subtask, "Subtask toggled");
  }),

  removeSubtask: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { taskId, subtaskId } = req.params;
    const result = await incubationTaskService.removeSubtask({
      tenantId,
      taskId,
      subtaskId,
    });
    return apiResponse.sendSuccess(res, result, "Subtask removed");
  }),

  reorderSubtasks: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const { taskId } = req.params;
    const { subtaskIds } = req.body;
    const result = await incubationTaskService.reorderSubtasks({
      tenantId,
      taskId,
      subtaskIds,
    });
    return apiResponse.sendSuccess(res, result, "Subtasks reordered");
  }),

  addAttachment: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const uploadedById = req.user.incubationUserId;
    const { taskId } = req.params;
    const { fileName, fileUrl, fileKey, fileType, fileSize } = req.body;
    const attachment = await incubationTaskService.addAttachment({
      tenantId,
      taskId,
      fileName,
      fileUrl,
      fileKey,
      fileType,
      fileSize,
      uploadedById,
    });
    return apiResponse.sendSuccess(res, attachment, "Attachment added", 201);
  }),

  removeAttachment: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const actorId = req.user.incubationUserId;
    const { taskId, attachmentId } = req.params;
    const result = await incubationTaskService.removeAttachment({
      tenantId,
      taskId,
      attachmentId,
      actorId,
    });
    return apiResponse.sendSuccess(res, result, "Attachment removed");
  }),

  addComment: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const authorId = req.user.incubationUserId;
    const { taskId } = req.params;
    const { content } = req.body;
    const comment = await incubationTaskService.addComment({
      tenantId,
      taskId,
      authorId,
      content,
    });
    return apiResponse.sendSuccess(res, comment, "Comment added", 201);
  }),

  updateComment: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const authorId = req.user.incubationUserId;
    const { taskId, commentId } = req.params;
    const { content } = req.body;
    const comment = await incubationTaskService.updateComment({
      tenantId,
      taskId,
      commentId,
      authorId,
      content,
    });
    return apiResponse.sendSuccess(res, comment, "Comment updated");
  }),

  deleteComment: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const authorId = req.user.incubationUserId;
    const { taskId, commentId } = req.params;
    const result = await incubationTaskService.deleteComment({
      tenantId,
      taskId,
      commentId,
      authorId,
    });
    return apiResponse.sendSuccess(res, result, "Comment deleted");
  }),

  getTeamMembers: asyncHandler(async (req, res) => {
    const tenantId = await resolveTenantId(req);
    const members = await incubationTaskService.getTeamMembers({ tenantId });
    return apiResponse.sendSuccess(res, members, "Team members fetched");
  }),
};
