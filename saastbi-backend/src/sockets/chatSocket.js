import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import db from "../db/db.js";

let io;
const userSockets = new Map();
const superAdminSockets = new Set();

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
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
      let user;
      if (
        decoded.role &&
        typeof decoded.role === "string" &&
        ["ADMIN", "MARKETING", "MANAGER", "RELATIONSHIP_MANAGER"].includes(decoded.role)
      ) {
        user = await db.superAdmin.findUnique({
          where: { id: decoded.id },
          select: { id: true, name: true, email: true, role: true },
        });
        socket.userType = "SUPER_ADMIN";
      } else {
        const id= decoded.id ||socket.handshake.auth.id
        const incubationUser = await db.incubationUser.findUnique({
          where: { id: id },
          select: { id: true, name: true, email: true },
        });
        if (!incubationUser) {
          return next(new Error("Authentication error: User not found"));
        }

        const tenantId = decoded.tenantId ||socket.handshake.auth.tenantId;
        if (!tenantId) {
          return next(new Error("Authentication error: No tenant context"));
        }


        const membership = await db.incubationUserTenant.findUnique({
          where: {
            incubationUserId_tenantId: {
              incubationUserId: incubationUser.id,
              tenantId,
            },
          },
          include: {
            tenant: {
              select: {
                id: true,
                organizationName: true,
                tenantKey: true,
              },
            },
          },
        });
        if (!membership || !membership.isActive || !membership.isAdmin) {
          return next(
            new Error("Authentication error: Only tenant admins can chat")
          );
        }

        user = {
          id: incubationUser.id,
          name: incubationUser.name,
          email: incubationUser.email,
          isAdmin: membership.isAdmin,
          tenantId: membership.tenantId,
          tenant: membership.tenant,
        };
        socket.userType = "TENANT_ADMIN";
      }

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }
      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Authentication error: " + error.message));
    }
  });

  io.on("connection", (socket) => {
    userSockets.set(socket.user.id, socket.id);
    if (socket.userType === "SUPER_ADMIN") {
      superAdminSockets.add(socket.id);
      socket.join("super-admins");
    } else {
      socket.join(`tenant-${socket.user.tenantId}`);
    }

    socket.on("send-message", async (data) => {
      try {
        const { content, tenantId } = data;

        if (!content || !content.trim()) {
          socket.emit("error", { message: "Message content is required" });
          return;
        }

        let targetTenantId = tenantId;

        if (socket.userType === "TENANT_ADMIN") {
          targetTenantId = socket.user.tenantId;
        } else if (!tenantId) {
          socket.emit("error", { message: "Tenant ID is required for super admin" });
          return;
        }

        let chat = await db.chat.findUnique({
          where: { tenantId: targetTenantId },
          include: {
            tenant: {
              select: {
                id: true,
                organizationName: true,
                tenantKey: true,
              },
            },
          },
        });

        const isTenantSender = socket.userType === "TENANT_ADMIN";

        if (!chat) {
          chat = await db.chat.create({
            data: {
              tenantId: targetTenantId,
              lastMessage: content.substring(0, 100),
              lastMessageAt: new Date(),
              unreadCount: isTenantSender ? 1 : 0,
              tenantUnreadCount: isTenantSender ? 0 : 1,
            },
            include: {
              tenant: {
                select: {
                  id: true,
                  organizationName: true,
                  tenantKey: true,
                },
              },
            },
          });
        }

        const message = await db.tenantMessage.create({
          data: {
            chatId: chat.id,
            senderId: socket.user.id,
            senderType: isTenantSender ? "TENANT_ADMIN" : "SUPER_ADMIN",
            content: content.trim(),
          },
        });

        const updateData = {
          lastMessage: content.substring(0, 100),
          lastMessageAt: new Date(),
        };

        if (isTenantSender) {
          updateData.unreadCount = { increment: 1 };
        } else {
          updateData.tenantUnreadCount = { increment: 1 };
        }

        await db.chat.update({
          where: { id: chat.id },
          data: updateData,
        });

        const messageData = {
          ...message,
          sender: {
            id: socket.user.id,
            name: socket.user.name,
            type: socket.userType,
          },
          chat: {
            id: chat.id,
            tenantId: chat.tenantId,
            tenant: chat.tenant,
          },
        };

        socket.emit("message-sent", messageData);

        if (isTenantSender) {
          io.to("super-admins").emit("new-message", messageData);
        } else {
          io.to(`tenant-${targetTenantId}`).emit("new-message", messageData);
        }
      } catch (error) {
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    socket.on("mark-as-read", async (data) => {
      try {
        const { chatId } = data;

        if (!chatId) {
          socket.emit("error", { message: "Chat ID is required" });
          return;
        }

        if (socket.userType === "SUPER_ADMIN") {
          await db.tenantMessage.updateMany({
            where: {
              chatId,
              senderType: "TENANT_ADMIN",
              readBy: { not: { has: socket.user.id } },
            },
            data: {
              readBy: { push: socket.user.id },
            },
          });
          await db.chat.update({
            where: { id: chatId },
            data: { unreadCount: 0 },
          });
        } else {
          await db.tenantMessage.updateMany({
            where: {
              chatId,
              senderType: "SUPER_ADMIN",
              isRead: false,
            },
            data: { isRead: true },
          });
          await db.chat.update({
            where: { id: chatId },
            data: { tenantUnreadCount: 0 },
          });
        }

        socket.emit("messages-read", { chatId });
      } catch (error) {
        socket.emit("error", { message: "Failed to mark messages as read" });
      }
    });

    socket.on("typing", (data) => {
      const { tenantId, isTyping } = data;

      if (socket.userType === "TENANT_ADMIN") {
        io.to("super-admins").emit("user-typing", {
          tenantId: socket.user.tenantId,
          userName: socket.user.name,
          isTyping,
        });
      } else if (tenantId) {
        io.to(`tenant-${tenantId}`).emit("user-typing", {
          userName: socket.user.name,
          isTyping,
        });
      }
    });

    socket.on("disconnect", () => {
      userSockets.delete(socket.user.id);
      if (socket.userType === "SUPER_ADMIN") {
        superAdminSockets.delete(socket.id);
      }
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};
