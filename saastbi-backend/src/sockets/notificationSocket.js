import jwt from "jsonwebtoken";
import db from "../db/db.js";
import { NotificationService, setSocketEmitter } from "../services/common/notification.service.js";
import { setConnectionSocketEmitter } from "../services/ecosystem/social/connection-events.js";

const connectedUsers = new Map();

export const initializeNotificationSocket = (io) => {
  const notificationNamespace = io.of("/notifications");

  notificationNamespace.use(async (socket, next) => {
    try {
      const rawToken =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization;
      const token = rawToken?.startsWith("Bearer ")
        ? rawToken.slice(7)
        : rawToken;

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.ACCESS_SECRET);

      let resolvedUserId = null;

      const ecosystemUser = await db.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, firstName: true, lastName: true },
      });

      if (ecosystemUser) {
        resolvedUserId = ecosystemUser.id;
      } else {
        const incubationUser = await db.incubationUser.findUnique({
          where: { id: decoded.id },
          select: { id: true, userId: true, name: true },
        });

        if (incubationUser?.userId) {
          resolvedUserId = incubationUser.userId;
        }
      }

      if (!resolvedUserId) {
        return next(new Error("Authentication error: User not found or not linked"));
      }

      socket.userId = resolvedUserId;
      next();
    } catch (error) {
      next(new Error("Authentication error: " + error.message));
    }
  });

  notificationNamespace.on("connection", async (socket) => {
    const userId = socket.userId;

    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }
    connectedUsers.get(userId).add(socket.id);

    socket.join(`notifications:${userId}`);

    try {
      const unreadCount = await NotificationService.getUnreadCount(userId);
      socket.emit("notification:unread-count", unreadCount);
    } catch (error) {
      console.error("Failed to send initial unread count:", error.message);
    }

    socket.on("notification:mark-read", async ({ notificationId }) => {
      try {
        await NotificationService.markAsRead(notificationId, userId);
      } catch (error) {
        socket.emit("error", { message: "Failed to mark notification as read" });
      }
    });

    socket.on("notification:mark-all-read", async ({ category } = {}) => {
      try {
        await NotificationService.markAllAsRead(userId, category || null);
      } catch (error) {
        socket.emit("error", { message: "Failed to mark all as read" });
      }
    });

    socket.on("disconnect", () => {
      const userSocketSet = connectedUsers.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        if (userSocketSet.size === 0) {
          connectedUsers.delete(userId);
        }
      }
    });
  });

  const emitToUser = (userId, event, data) => {
    notificationNamespace.to(`notifications:${userId}`).emit(event, data);
  };

  setSocketEmitter(emitToUser);
  setConnectionSocketEmitter(emitToUser);

  return notificationNamespace;
};

export const isUserOnline = (userId) => {
  return connectedUsers.has(userId) && connectedUsers.get(userId).size > 0;
};
