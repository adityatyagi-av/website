import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { buildQueryOptions } from "../../../utils/queryHelper.js";
import { deleteFromS3 } from "../../../utils/s3util.js";

const TEAM_TYPE = "INCUBATION";

const logActivity = async (tx, { taskId, actorId, action, field, oldValue, newValue, metadata }) => {
  return tx.taskActivity.create({
    data: {
      taskId,
      actorId,
      action,
      field,
      oldValue: oldValue?.toString(),
      newValue: newValue?.toString(),
      metadata,
    },
  });
};

export const incubationTaskService = {
  createTask: async ({ tenantId, creatorId, data }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!creatorId) throw new ApiError(401, "creatorId required");

    const { title, description, priority, assigneeId, dueDate, startDate, labels } = data;

    if (!title) throw new ApiError(400, "Task title is required");

    if (assigneeId) {
      const assigneeMembership = await db.incubationUserTenant.findFirst({
        where: { incubationUserId: assigneeId, tenantId, isActive: true },
      });
      if (!assigneeMembership) throw new ApiError(404, "Assignee not found in this tenant");
    }

    return db.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          title,
          description,
          priority: priority || "MEDIUM",
          status: "PENDING",
          teamType: TEAM_TYPE,
          teamId: tenantId,
          creatorId,
          assigneeId,
          dueDate: dueDate ? new Date(dueDate) : null,
          startDate: startDate ? new Date(startDate) : null,
          labels: labels || [],
        },
      });

      await logActivity(tx, {
        taskId: task.id,
        actorId: creatorId,
        action: "CREATED",
      });

      return task;
    });
  },

  getTasks: async ({ tenantId, filters = {}, pagination = {} }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");

    const {
      status,
      priority,
      assigneeId,
      label,
      search,
      fromDate,
      toDate,
      isOverdue,
    } = filters;

    const { page = 1, limit = 20, sortBy = "createdAt", order = "desc" } = pagination;

    const { skip, take, orderBy } = buildQueryOptions({
      page,
      limit,
      sortBy,
      order,
    });

    const where = {
      teamType: TEAM_TYPE,
      teamId: tenantId,
      isArchived: false,
    };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigneeId) where.assigneeId = assigneeId;
    if (label) where.labels = { has: label };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (fromDate || toDate) {
      where.dueDate = {};
      if (fromDate) where.dueDate.gte = new Date(fromDate);
      if (toDate) where.dueDate.lte = new Date(toDate);
    }

    if (isOverdue === "true") {
      where.dueDate = { lt: new Date() };
      where.status = { notIn: ["COMPLETED"] };
    }

    const [data, total] = await Promise.all([
      db.task.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          subtasks: { orderBy: { orderIndex: "asc" } },
          _count: { select: { comments: true, attachments: true } },
        },
      }),
      db.task.count({ where }),
    ]);

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  },

  getTaskById: async ({ tenantId, taskId }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!taskId) throw new ApiError(400, "taskId required");

    const task = await db.task.findUnique({
      where: { id: taskId },
      include: {
        subtasks: { orderBy: { orderIndex: "asc" } },
        attachments: { orderBy: { createdAt: "desc" } },
        comments: { orderBy: { createdAt: "desc" } },
        activities: { orderBy: { createdAt: "desc" }, take: 50 },
      },
    });

    if (!task || task.teamType !== TEAM_TYPE || task.teamId !== tenantId) {
      throw new ApiError(404, "Task not found");
    }

    return task;
  },

  updateTask: async ({ tenantId, taskId, actorId, data }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!taskId) throw new ApiError(400, "taskId required");

    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task || task.teamType !== TEAM_TYPE || task.teamId !== tenantId) {
      throw new ApiError(404, "Task not found");
    }

    const { title, description, priority, dueDate, startDate, labels } = data;

    const updateData = {};
    const changes = [];

    if (title !== undefined && title !== task.title) {
      updateData.title = title;
      changes.push({ field: "title", oldValue: task.title, newValue: title });
    }
    if (description !== undefined && description !== task.description) {
      updateData.description = description;
      changes.push({ field: "description", oldValue: task.description, newValue: description });
    }
    if (priority !== undefined && priority !== task.priority) {
      updateData.priority = priority;
      changes.push({ field: "priority", oldValue: task.priority, newValue: priority });
    }
    if (dueDate !== undefined) {
      const newDueDate = dueDate ? new Date(dueDate) : null;
      updateData.dueDate = newDueDate;
      changes.push({ field: "dueDate", oldValue: task.dueDate?.toISOString(), newValue: newDueDate?.toISOString() });
    }
    if (startDate !== undefined) {
      const newStartDate = startDate ? new Date(startDate) : null;
      updateData.startDate = newStartDate;
      changes.push({ field: "startDate", oldValue: task.startDate?.toISOString(), newValue: newStartDate?.toISOString() });
    }
    if (labels !== undefined) {
      updateData.labels = labels;
      changes.push({ field: "labels", oldValue: task.labels.join(","), newValue: labels.join(",") });
    }

    if (Object.keys(updateData).length === 0) {
      return task;
    }

    return db.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: taskId },
        data: updateData,
      });

      for (const change of changes) {
        await logActivity(tx, {
          taskId,
          actorId,
          action: "UPDATED",
          field: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
        });
      }

      return updated;
    });
  },

  updateTaskStatus: async ({ tenantId, taskId, status, actorId }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!taskId) throw new ApiError(400, "taskId required");
    if (!status) throw new ApiError(400, "status required");

    const validStatuses = ["PENDING", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "COMPLETED"];
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    }

    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task || task.teamType !== TEAM_TYPE || task.teamId !== tenantId) {
      throw new ApiError(404, "Task not found");
    }

    const oldStatus = task.status;

    return db.$transaction(async (tx) => {
      const updateData = { status };
      if (status === "COMPLETED") {
        updateData.completedAt = new Date();
      } else if (task.status === "COMPLETED" && status !== "COMPLETED") {
        updateData.completedAt = null;
      }

      const updated = await tx.task.update({
        where: { id: taskId },
        data: updateData,
      });

      await logActivity(tx, {
        taskId,
        actorId,
        action: "STATUS_CHANGED",
        field: "status",
        oldValue: oldStatus,
        newValue: status,
      });

      return updated;
    });
  },

  assignTask: async ({ tenantId, taskId, assigneeId, actorId }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!taskId) throw new ApiError(400, "taskId required");

    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task || task.teamType !== TEAM_TYPE || task.teamId !== tenantId) {
      throw new ApiError(404, "Task not found");
    }

    if (assigneeId) {
      const assigneeMembership = await db.incubationUserTenant.findFirst({
        where: { incubationUserId: assigneeId, tenantId, isActive: true },
      });
      if (!assigneeMembership) throw new ApiError(404, "Assignee not found in this tenant");
    }

    const oldAssigneeId = task.assigneeId;

    return db.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: taskId },
        data: { assigneeId: assigneeId || null },
      });

      await logActivity(tx, {
        taskId,
        actorId,
        action: "ASSIGNED",
        field: "assigneeId",
        oldValue: oldAssigneeId,
        newValue: assigneeId,
      });

      return updated;
    });
  },

  archiveTask: async ({ tenantId, taskId }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!taskId) throw new ApiError(400, "taskId required");

    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task || task.teamType !== TEAM_TYPE || task.teamId !== tenantId) {
      throw new ApiError(404, "Task not found");
    }

    return db.task.update({
      where: { id: taskId },
      data: { isArchived: true },
    });
  },

  getMyTasks: async ({ tenantId, userId, filters = {}, pagination = {} }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!userId) throw new ApiError(401, "userId required");

    return incubationTaskService.getTasks({
      tenantId,
      filters: { ...filters, assigneeId: userId },
      pagination,
    });
  },

  getCreatedByMe: async ({ tenantId, userId, filters = {}, pagination = {} }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!userId) throw new ApiError(401, "userId required");

    const { page = 1, limit = 20, sortBy = "createdAt", order = "desc" } = pagination;
    const { skip, take, orderBy } = buildQueryOptions({ page, limit, sortBy, order });

    const where = {
      teamType: TEAM_TYPE,
      teamId: tenantId,
      creatorId: userId,
      isArchived: false,
    };

    if (filters.status) where.status = filters.status;

    const [data, total] = await Promise.all([
      db.task.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          subtasks: { orderBy: { orderIndex: "asc" } },
          _count: { select: { comments: true, attachments: true } },
        },
      }),
      db.task.count({ where }),
    ]);

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  },

  getOverdueTasks: async ({ tenantId, filters = {}, pagination = {} }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");

    return incubationTaskService.getTasks({
      tenantId,
      filters: { ...filters, isOverdue: "true" },
      pagination,
    });
  },

  getTaskStats: async ({ tenantId }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");

    const baseWhere = {
      teamType: TEAM_TYPE,
      teamId: tenantId,
      isArchived: false,
    };

    const [byStatus, byPriority, overdue] = await Promise.all([
      db.task.groupBy({
        by: ["status"],
        where: baseWhere,
        _count: { _all: true },
      }),
      db.task.groupBy({
        by: ["priority"],
        where: baseWhere,
        _count: { _all: true },
      }),
      db.task.count({
        where: {
          ...baseWhere,
          dueDate: { lt: new Date() },
          status: { notIn: ["COMPLETED"] },
        },
      }),
    ]);

    return {
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count._all;
        return acc;
      }, {}),
      byPriority: byPriority.reduce((acc, item) => {
        acc[item.priority] = item._count._all;
        return acc;
      }, {}),
      overdue,
    };
  },

  addSubtask: async ({ tenantId, taskId, title, creatorId }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!taskId) throw new ApiError(400, "taskId required");
    if (!title) throw new ApiError(400, "Subtask title is required");

    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task || task.teamType !== TEAM_TYPE || task.teamId !== tenantId) {
      throw new ApiError(404, "Task not found");
    }

    return db.$transaction(async (tx) => {
      const maxOrder = await tx.subtask.aggregate({
        where: { taskId },
        _max: { orderIndex: true },
      });

      const subtask = await tx.subtask.create({
        data: {
          taskId,
          title,
          orderIndex: (maxOrder._max.orderIndex || 0) + 1,
        },
      });

      await logActivity(tx, {
        taskId,
        actorId: creatorId,
        action: "SUBTASK_ADDED",
        metadata: { subtaskId: subtask.id, subtaskTitle: title },
      });

      return subtask;
    });
  },

  updateSubtask: async ({ tenantId, taskId, subtaskId, title }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!subtaskId) throw new ApiError(400, "subtaskId required");

    const subtask = await db.subtask.findUnique({
      where: { id: subtaskId },
      include: { task: true },
    });

    if (!subtask || subtask.task.teamType !== TEAM_TYPE || subtask.task.teamId !== tenantId || subtask.taskId !== taskId) {
      throw new ApiError(404, "Subtask not found");
    }

    return db.subtask.update({
      where: { id: subtaskId },
      data: { title },
    });
  },

  toggleSubtask: async ({ tenantId, taskId, subtaskId, userId }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!subtaskId) throw new ApiError(400, "subtaskId required");

    const subtask = await db.subtask.findUnique({
      where: { id: subtaskId },
      include: { task: true },
    });

    if (!subtask || subtask.task.teamType !== TEAM_TYPE || subtask.task.teamId !== tenantId || subtask.taskId !== taskId) {
      throw new ApiError(404, "Subtask not found");
    }

    const newIsCompleted = !subtask.isCompleted;

    return db.$transaction(async (tx) => {
      const updated = await tx.subtask.update({
        where: { id: subtaskId },
        data: {
          isCompleted: newIsCompleted,
          completedAt: newIsCompleted ? new Date() : null,
          completedById: newIsCompleted ? userId : null,
        },
      });

      if (newIsCompleted) {
        await logActivity(tx, {
          taskId,
          actorId: userId,
          action: "SUBTASK_COMPLETED",
          metadata: { subtaskId, subtaskTitle: subtask.title },
        });
      }

      return updated;
    });
  },

  removeSubtask: async ({ tenantId, taskId, subtaskId }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!subtaskId) throw new ApiError(400, "subtaskId required");

    const subtask = await db.subtask.findUnique({
      where: { id: subtaskId },
      include: { task: true },
    });

    if (!subtask || subtask.task.teamType !== TEAM_TYPE || subtask.task.teamId !== tenantId || subtask.taskId !== taskId) {
      throw new ApiError(404, "Subtask not found");
    }

    await db.subtask.delete({ where: { id: subtaskId } });
    return { message: "Subtask removed" };
  },

  reorderSubtasks: async ({ tenantId, taskId, subtaskIds }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!taskId) throw new ApiError(400, "taskId required");
    if (!Array.isArray(subtaskIds)) throw new ApiError(400, "subtaskIds must be an array");

    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task || task.teamType !== TEAM_TYPE || task.teamId !== tenantId) {
      throw new ApiError(404, "Task not found");
    }

    await db.$transaction(
      subtaskIds.map((id, index) =>
        db.subtask.update({
          where: { id },
          data: { orderIndex: index },
        })
      )
    );

    return { message: "Subtasks reordered" };
  },

  addAttachment: async ({ tenantId, taskId, fileName, fileUrl, fileKey, fileType, fileSize, uploadedById }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!taskId) throw new ApiError(400, "taskId required");

    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task || task.teamType !== TEAM_TYPE || task.teamId !== tenantId) {
      throw new ApiError(404, "Task not found");
    }

    return db.$transaction(async (tx) => {
      const attachment = await tx.taskAttachment.create({
        data: {
          taskId,
          fileName,
          fileUrl,
          fileKey,
          fileType,
          fileSize,
          uploadedById,
        },
      });

      await logActivity(tx, {
        taskId,
        actorId: uploadedById,
        action: "ATTACHMENT_ADDED",
        metadata: { attachmentId: attachment.id, fileName },
      });

      return attachment;
    });
  },

  removeAttachment: async ({ tenantId, taskId, attachmentId, actorId }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!attachmentId) throw new ApiError(400, "attachmentId required");

    const attachment = await db.taskAttachment.findUnique({
      where: { id: attachmentId },
      include: { task: true },
    });

    if (!attachment || attachment.task.teamType !== TEAM_TYPE || attachment.task.teamId !== tenantId || attachment.taskId !== taskId) {
      throw new ApiError(404, "Attachment not found");
    }

    await db.$transaction(async (tx) => {
      await tx.taskAttachment.delete({ where: { id: attachmentId } });

      await logActivity(tx, {
        taskId,
        actorId,
        action: "ATTACHMENT_REMOVED",
        metadata: { attachmentId, fileName: attachment.fileName },
      });
    });

    if (attachment.fileKey) {
      try {
        await deleteFromS3(attachment.fileKey);
      } catch (e) {
        console.error("Failed to delete file from S3:", e);
      }
    }

    return { message: "Attachment removed" };
  },

  addComment: async ({ tenantId, taskId, authorId, content }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!taskId) throw new ApiError(400, "taskId required");
    if (!content) throw new ApiError(400, "Comment content is required");

    const task = await db.task.findUnique({ where: { id: taskId } });
    if (!task || task.teamType !== TEAM_TYPE || task.teamId !== tenantId) {
      throw new ApiError(404, "Task not found");
    }

    return db.$transaction(async (tx) => {
      const comment = await tx.taskComment.create({
        data: {
          taskId,
          authorId,
          content,
        },
      });

      await logActivity(tx, {
        taskId,
        actorId: authorId,
        action: "COMMENTED",
        metadata: { commentId: comment.id },
      });

      return comment;
    });
  },

  updateComment: async ({ tenantId, taskId, commentId, authorId, content }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!commentId) throw new ApiError(400, "commentId required");

    const comment = await db.taskComment.findUnique({
      where: { id: commentId },
      include: { task: true },
    });

    if (!comment || comment.task.teamType !== TEAM_TYPE || comment.task.teamId !== tenantId || comment.taskId !== taskId) {
      throw new ApiError(404, "Comment not found");
    }

    if (comment.authorId !== authorId) {
      throw new ApiError(403, "You can only edit your own comments");
    }

    return db.taskComment.update({
      where: { id: commentId },
      data: { content },
    });
  },

  deleteComment: async ({ tenantId, taskId, commentId, authorId }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");
    if (!commentId) throw new ApiError(400, "commentId required");

    const comment = await db.taskComment.findUnique({
      where: { id: commentId },
      include: { task: true },
    });

    if (!comment || comment.task.teamType !== TEAM_TYPE || comment.task.teamId !== tenantId || comment.taskId !== taskId) {
      throw new ApiError(404, "Comment not found");
    }

    if (comment.authorId !== authorId) {
      throw new ApiError(403, "You can only delete your own comments");
    }

    await db.taskComment.delete({ where: { id: commentId } });
    return { message: "Comment deleted" };
  },

  getTeamMembers: async ({ tenantId }) => {
    if (!tenantId) throw new ApiError(401, "tenantId required");

    const memberships = await db.incubationUserTenant.findMany({
      where: { tenantId, isActive: true },
      include: {
        incubationUser: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
          },
        },
        role: { select: { id: true, roleName: true } },
      },
      orderBy: { incubationUser: { name: "asc" } },
    });

    return memberships.map((m) => ({
      ...m.incubationUser,
      role: m.role,
    }));
  },
};
