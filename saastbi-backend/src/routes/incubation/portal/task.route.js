import { Router } from "express";
import { TaskController } from "../../../controllers/incubation/portal/task.controller.js";
import { authenticatePortal } from "../../../middlewares/portal.auth.middleware.js";
import { requireAccessByMethod } from "../../../middlewares/access.middleware.js";
import { MODULE_KEYS } from "../../../config/modules.registry.js";

const router = Router();

router.use(["/task", "/tasks"], authenticatePortal, requireAccessByMethod(MODULE_KEYS.TASK));

router.post("/task", TaskController.createTask);
router.get("/tasks", TaskController.getTasks);
router.get("/tasks/my-tasks", TaskController.getMyTasks);
router.get("/tasks/created-by-me", TaskController.getCreatedByMe);
router.get("/tasks/overdue", TaskController.getOverdueTasks);
router.get("/tasks/stats", TaskController.getTaskStats);
router.get("/tasks/team-members", TaskController.getTeamMembers);
router.get("/task/:taskId", TaskController.getTaskById);
router.put("/task/:taskId", TaskController.updateTask);
router.patch("/task/:taskId/status", TaskController.updateTaskStatus);
router.patch("/task/:taskId/assign", TaskController.assignTask);
router.delete("/task/:taskId", TaskController.archiveTask);

router.post("/task/:taskId/subtask", TaskController.addSubtask);
router.put("/task/:taskId/subtask/:subtaskId", TaskController.updateSubtask);
router.patch("/task/:taskId/subtask/:subtaskId/toggle", TaskController.toggleSubtask);
router.delete("/task/:taskId/subtask/:subtaskId", TaskController.removeSubtask);
router.patch("/task/:taskId/subtasks/reorder", TaskController.reorderSubtasks);

router.post("/task/:taskId/attachment", TaskController.addAttachment);
router.delete("/task/:taskId/attachment/:attachmentId", TaskController.removeAttachment);

router.post("/task/:taskId/comment", TaskController.addComment);
router.put("/task/:taskId/comment/:commentId", TaskController.updateComment);
router.delete("/task/:taskId/comment/:commentId", TaskController.deleteComment);

export const IncubationTaskRouter = router;
