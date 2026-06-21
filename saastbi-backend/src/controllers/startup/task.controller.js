import { startupTaskService } from "../../services/startup/task.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/responseUtils.js";

export const StartupTaskController = {
  createTask: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startupId } = req.params;
    const task = await startupTaskService.createTask({
      startupId,
      creatorId: userId,
      data: req.body,
    });
    return apiResponse.sendSuccess(res, task, "Task created", 201);
  }),

  getTasks: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startupId } = req.params;
    const {
      page,
      limit,
      sortBy,
      order,
      status,
      priority,
      assigneeId,
      label,
      search,
      fromDate,
      toDate,
      isOverdue,
    } = req.query;
    const result = await startupTaskService.getTasks({
      startupId,
      userId,
      filters: {
        status,
        priority,
        assigneeId,
        label,
        search,
        fromDate,
        toDate,
        isOverdue,
      },
      pagination: {
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        sortBy,
        order,
      },
    });
    return apiResponse.sendSuccess(res, result, "Tasks fetched");
  }),

  getTaskById: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startupId, taskId } = req.params;
    const task = await startupTaskService.getTaskById({
      startupId,
      taskId,
      userId,
    });
    return apiResponse.sendSuccess(res, task, "Task details");
  }),

  updateTask: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startupId, taskId } = req.params;
    const task = await startupTaskService.updateTask({
      startupId,
      taskId,
      actorId: userId,
      data: req.body,
    });
    return apiResponse.sendSuccess(res, task, "Task updated");
  }),

  updateTaskStatus: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startupId, taskId } = req.params;
    const { status } = req.body;
    const task = await startupTaskService.updateTaskStatus({
      startupId,
      taskId,
      status,
      actorId: userId,
    });
    return apiResponse.sendSuccess(res, task, "Task status updated");
  }),

  assignTask: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startupId, taskId } = req.params;
    const { assigneeId } = req.body;
    const task = await startupTaskService.assignTask({
      startupId,
      taskId,
      assigneeId,
      actorId: userId,
    });
    return apiResponse.sendSuccess(res, task, "Task assigned");
  }),

  archiveTask: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startupId, taskId } = req.params;
    const task = await startupTaskService.archiveTask({
      startupId,
      taskId,
      userId,
    });
    return apiResponse.sendSuccess(res, task, "Task archived");
  }),

  getMyTasks: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startupId } = req.params;
    const { page, limit, sortBy, order, status } = req.query;
    const result = await startupTaskService.getMyTasks({
      startupId,
      userId,
      filters: { status },
      pagination: {
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        sortBy,
        order,
      },
    });
    return apiResponse.sendSuccess(res, result, "My tasks fetched");
  }),

  getCreatedByMe: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startupId } = req.params;
    const { page, limit, sortBy, order, status } = req.query;
    const result = await startupTaskService.getCreatedByMe({
      startupId,
      userId,
      filters: { status },
      pagination: {
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        sortBy,
        order,
      },
    });
    return apiResponse.sendSuccess(res, result, "Created tasks fetched");
  }),

  getOverdueTasks: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startupId } = req.params;
    const { page, limit, sortBy, order } = req.query;
    const result = await startupTaskService.getOverdueTasks({
      startupId,
      userId,
      filters: {},
      pagination: {
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        sortBy,
        order,
      },
    });
    return apiResponse.sendSuccess(res, result, "Overdue tasks fetched");
  }),

  getTaskStats: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startupId } = req.params;
    const stats = await startupTaskService.getTaskStats({ startupId, userId });
    return apiResponse.sendSuccess(res, stats, "Task statistics");
  }),

  addSubtask: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startupId, taskId } = req.params;
    const { title } = req.body;
    const subtask = await startupTaskService.addSubtask({
      startupId,
      taskId,
      title,
      creatorId: userId,
    });
    return apiResponse.sendSuccess(res, subtask, "Subtask added", 201);
  }),

  updateSubtask: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startupId, taskId, subtaskId } = req.params;
    const { title } = req.body;
    const subtask = await startupTaskService.updateSubtask({
      startupId,
      taskId,
      subtaskId,
      title,
      userId,
    });
    return apiResponse.sendSuccess(res, subtask, "Subtask updated");
  }),

  toggleSubtask: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startupId, taskId, subtaskId } = req.params;
    const subtask = await startupTaskService.toggleSubtask({
      startupId,
      taskId,
      subtaskId,
      userId,
    });
    return apiResponse.sendSuccess(res, subtask, "Subtask toggled");
  }),

  removeSubtask: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startupId, taskId, subtaskId } = req.params;
    const result = await startupTaskService.removeSubtask({
      startupId,
      taskId,
      subtaskId,
      userId,
    });
    return apiResponse.sendSuccess(res, result, "Subtask removed");
  }),

  reorderSubtasks: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startupId, taskId } = req.params;
    const { subtaskIds } = req.body;
    const result = await startupTaskService.reorderSubtasks({
      startupId,
      taskId,
      subtaskIds,
      userId,
    });
    return apiResponse.sendSuccess(res, result, "Subtasks reordered");
  }),

  addAttachment: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startupId, taskId } = req.params;
    const { fileName, fileUrl, fileKey, fileType, fileSize } = req.body;
    const attachment = await startupTaskService.addAttachment({
      startupId,
      taskId,
      fileName,
      fileUrl,
      fileKey,
      fileType,
      fileSize,
      uploadedById: userId,
    });
    return apiResponse.sendSuccess(res, attachment, "Attachment added", 201);
  }),

  removeAttachment: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startupId, taskId, attachmentId } = req.params;
    const result = await startupTaskService.removeAttachment({
      startupId,
      taskId,
      attachmentId,
      actorId: userId,
    });
    return apiResponse.sendSuccess(res, result, "Attachment removed");
  }),

  addComment: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startupId, taskId } = req.params;
    const { content } = req.body;
    const comment = await startupTaskService.addComment({
      startupId,
      taskId,
      authorId: userId,
      content,
    });
    return apiResponse.sendSuccess(res, comment, "Comment added", 201);
  }),

  updateComment: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startupId, taskId, commentId } = req.params;
    const { content } = req.body;
    const comment = await startupTaskService.updateComment({
      startupId,
      taskId,
      commentId,
      authorId: userId,
      content,
    });
    return apiResponse.sendSuccess(res, comment, "Comment updated");
  }),

  deleteComment: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startupId, taskId, commentId } = req.params;
    const result = await startupTaskService.deleteComment({
      startupId,
      taskId,
      commentId,
      authorId: userId,
    });
    return apiResponse.sendSuccess(res, result, "Comment deleted");
  }),

  getTeamMembers: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { startupId } = req.params;
    const members = await startupTaskService.getTeamMembers({
      startupId,
      userId,
    });
    return apiResponse.sendSuccess(res, members, "Team members fetched");
  }),
};
