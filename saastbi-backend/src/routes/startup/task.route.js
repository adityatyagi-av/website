import { Router } from "express";
import { StartupTaskController } from "../../controllers/startup/task.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.post("/startup/:startupId/task", StartupTaskController.createTask);
router.get("/startup/:startupId/tasks", StartupTaskController.getTasks);
router.get("/startup/:startupId/tasks/my-tasks", StartupTaskController.getMyTasks);
router.get("/startup/:startupId/tasks/created-by-me", StartupTaskController.getCreatedByMe);
router.get("/startup/:startupId/tasks/overdue", StartupTaskController.getOverdueTasks);
router.get("/startup/:startupId/tasks/stats", StartupTaskController.getTaskStats);
router.get("/startup/:startupId/tasks/team-members", StartupTaskController.getTeamMembers);
router.get("/startup/:startupId/task/:taskId", StartupTaskController.getTaskById);
router.put("/startup/:startupId/task/:taskId", StartupTaskController.updateTask);
router.patch("/startup/:startupId/task/:taskId/status", StartupTaskController.updateTaskStatus);
router.patch("/startup/:startupId/task/:taskId/assign", StartupTaskController.assignTask);
router.delete("/startup/:startupId/task/:taskId", StartupTaskController.archiveTask);

router.post("/startup/:startupId/task/:taskId/subtask", StartupTaskController.addSubtask);
router.put("/startup/:startupId/task/:taskId/subtask/:subtaskId", StartupTaskController.updateSubtask);
router.patch("/startup/:startupId/task/:taskId/subtask/:subtaskId/toggle", StartupTaskController.toggleSubtask);
router.delete("/startup/:startupId/task/:taskId/subtask/:subtaskId", StartupTaskController.removeSubtask);
router.patch("/startup/:startupId/task/:taskId/subtasks/reorder", StartupTaskController.reorderSubtasks);

router.post("/startup/:startupId/task/:taskId/attachment", StartupTaskController.addAttachment);
router.delete("/startup/:startupId/task/:taskId/attachment/:attachmentId", StartupTaskController.removeAttachment);

router.post("/startup/:startupId/task/:taskId/comment", StartupTaskController.addComment);
router.put("/startup/:startupId/task/:taskId/comment/:commentId", StartupTaskController.updateComment);
router.delete("/startup/:startupId/task/:taskId/comment/:commentId", StartupTaskController.deleteComment);

export const StartupTaskRouter = router;
