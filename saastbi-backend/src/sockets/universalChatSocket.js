import jwt from "jsonwebtoken";
import db from "../db/db.js";
import { UniversalChatService } from "../services/common/universal-chat.service.js";
import { canMessage } from "../utils/chat/permissions.js";
import { validateSendPermission } from "../utils/chat/send-guard.js";

const userSockets = new Map();

export const initializeUniversalChatSocket = (io) => {
  const chatNamespace = io.of("/chat");

  chatNamespace.use(async (socket, next) => {
    try {
      const rawToken =
        socket.handshake.auth.token || socket.handshake.headers.authorization;
      const token = rawToken?.startsWith("Bearer ")
        ? rawToken.slice(7)
        : rawToken;

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.ACCESS_SECRET);

      const user = await db.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePhoto: true,
          email: true,
        },
      });

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      socket.user = {
        ...user,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        avatar: user.profilePhoto,
      };
      next();
    } catch (error) {
      next(new Error("Authentication error: " + error.message));
    }
  });

  chatNamespace.on("connection", (socket) => {
    userSockets.set(socket.user.id, socket.id);
    socket.join(`user:${socket.user.id}`);

    // Join entity rooms for real-time notifications
    Promise.all([
      db.incubationUserTenant.findMany({
        where: {
          incubationUser: { userId: socket.user.id },
          isActive: true,
        },
        select: { tenantId: true, incubationUserId: true },
      }),
      db.startupMember.findMany({
        where: { userId: socket.user.id, isActive: true },
        select: { startupId: true },
      }),
      db.pageMember.findMany({
        where: { userId: socket.user.id },
        select: { pageId: true },
      }),
    ])
      .then(([tenantMemberships, startupMemberships, pageMemberships]) => {
        tenantMemberships.forEach((tm) => {
          socket.join(`user:${tm.tenantId}`);
          socket.join(`user:${tm.incubationUserId}`);
        });
        startupMemberships.forEach((sm) => socket.join(`user:${sm.startupId}`));
        pageMemberships.forEach((pm) => socket.join(`user:${pm.pageId}`));
      })
      .catch((err) => console.error("Error joining entity rooms:", err));

    socket.on("join-conversation", async (conversationId) => {
      try {
        const entityIds = [socket.user.id];

        const [startupMemberships, pageMemberships, tenantMemberships] = await Promise.all([
          db.startupMember.findMany({
            where: { userId: socket.user.id, isActive: true },
            select: { startupId: true },
          }),
          db.pageMember.findMany({
            where: { userId: socket.user.id },
            select: { pageId: true },
          }),
          db.incubationUserTenant.findMany({
            where: {
              incubationUser: { userId: socket.user.id },
              isActive: true,
            },
            select: { tenantId: true, incubationUserId: true },
          }),
        ]);

        entityIds.push(...startupMemberships.map((m) => m.startupId));
        entityIds.push(...pageMemberships.map((m) => m.pageId));
        entityIds.push(...tenantMemberships.map((m) => m.tenantId));
        entityIds.push(...tenantMemberships.map((m) => m.incubationUserId));

        const conversation = await db.conversation.findFirst({
          where: {
            id: conversationId,
            OR: [
              { participant1Id: { in: entityIds } },
              { participant2Id: { in: entityIds } },
            ],
          },
        });

        if (conversation) {
          socket.join(`conversation:${conversationId}`);
          socket.emit("joined-conversation", { conversationId });
        } else {
          socket.emit("error", { message: "Conversation not found" });
        }
      } catch (error) {
        console.error("Error joining conversation:", error);
        socket.emit("error", { message: "Failed to join conversation" });
      }
    });

    socket.on("leave-conversation", (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on("send-message", async (data) => {
      try {
        const {
          conversationId,
          content,
          attachments,
          replyToId,
          messageType,
          startupId,
          pageId,
        } = data;

        if (!content?.trim() && !attachments?.length) {
          socket.emit("error", { message: "Message content is required" });
          return;
        }

        let senderType = "USER";
        let senderId = socket.user.id;

        if (startupId) {
          const guard = await validateSendPermission(socket.user.id, startupId, "STARTUP");
          if (!guard.allowed) {
            socket.emit("error", { message: guard.reason });
            return;
          }
          senderType = "STARTUP";
          senderId = startupId;
        } else if (pageId) {
          const guard = await validateSendPermission(socket.user.id, pageId, "PAGE");
          if (!guard.allowed) {
            socket.emit("error", { message: guard.reason });
            return;
          }
          senderType = "PAGE";
          senderId = pageId;
        } else if (data.tenantId) {
          const guard = await validateSendPermission(socket.user.id, data.tenantId, "TENANT");
          if (!guard.allowed) {
            socket.emit("error", { message: guard.reason });
            return;
          }
          senderType = "TENANT";
          senderId = data.tenantId;
        } else if (data.incubationUserId) {
          const guard = await validateSendPermission(socket.user.id, data.incubationUserId, "INCUBATION_USER");
          if (!guard.allowed) {
            socket.emit("error", { message: guard.reason });
            return;
          }
          senderType = "INCUBATION_USER";
          senderId = data.incubationUserId;
        }

        const conversation = await db.conversation.findUnique({
          where: { id: conversationId },
          select: {
            participant1Id: true,
            participant1Type: true,
            participant2Id: true,
            participant2Type: true,
            contextType: true,
          },
        });

        if (!conversation) {
          socket.emit("error", { message: "Conversation not found" });
          return;
        }

        const isSenderP1 =
          conversation.participant1Id === senderId &&
          conversation.participant1Type === senderType;

        const receiverId = isSenderP1
          ? conversation.participant2Id
          : conversation.participant1Id;
        const receiverType = isSenderP1
          ? conversation.participant2Type
          : conversation.participant1Type;

        const permission = await canMessage(
          senderId,
          senderType,
          receiverId,
          receiverType,
          conversation.contextType,
        );

        if (!permission.allowed) {
          socket.emit("error", { message: permission.reason });
          return;
        }

        const metadata = {
          actualSenderName: socket.user.name,
          actualSenderAvatar: socket.user.avatar,
          actualSenderId: socket.user.id,
        };

        const result = await UniversalChatService.sendMessage(
          senderId,
          senderType,
          conversationId,
          { content, attachments, replyToId, messageType, metadata },
        );

        socket.emit("message-sent", result.message);

        chatNamespace
          .to(`conversation:${conversationId}`)
          .except(socket.id)
          .emit("new-message", result.message);

        // Notify receiver side based on entity type
        if (receiverType === "USER") {
          // Personal inbox: emit to user's personal room
          chatNamespace.to(`user:${receiverId}`).emit("conversation-updated", {
            conversationId,
            lastMessage: result.message,
          });
        } else {
          // Entity inbox: emit to entity room only (all members are joined to this room)
          // Do NOT emit to individual user rooms (would pollute personal inboxes)
          chatNamespace.to(`user:${receiverId}`).emit("conversation-updated", {
            conversationId,
            lastMessage: result.message,
          });
        }

        // Notify sender entity members (for multi-member entity inboxes)
        // Only emit to entity room, not personal user rooms
        if (senderType !== "USER") {
          chatNamespace
            .to(`user:${senderId}`)
            .except(socket.id)
            .emit("conversation-updated", {
              conversationId,
              lastMessage: result.message,
            });
        }
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", {
          message: error.message || "Failed to send message",
        });
      }
    });

    socket.on("typing", (data) => {
      const { conversationId, isTyping } = data;
      socket.to(`conversation:${conversationId}`).emit("user-typing", {
        conversationId,
        userId: socket.user.id,
        userName: socket.user.name,
        isTyping,
      });
    });

    socket.on("mark-read", async (data) => {
      try {
        const { conversationId, startupId, pageId, tenantId, incubationUserId } = data;

        let entityId, entityType;
        if (startupId) {
          entityId = startupId;
          entityType = "STARTUP";
        } else if (pageId) {
          entityId = pageId;
          entityType = "PAGE";
        } else if (tenantId) {
          entityId = tenantId;
          entityType = "TENANT";
        } else if (incubationUserId) {
          entityId = incubationUserId;
          entityType = "INCUBATION_USER";
        }

        await UniversalChatService.markAsRead(
          socket.user.id,
          conversationId,
          entityId,
          entityType,
        );

        socket.emit("messages-read", { conversationId });

        socket.to(`conversation:${conversationId}`).emit("participant-read", {
          conversationId,
          userId: socket.user.id,
          readAt: new Date(),
        });
      } catch (error) {
        console.error("Error marking as read:", error);
        socket.emit("error", { message: "Failed to mark messages as read" });
      }
    });

    socket.on("delete-message", async (data) => {
      try {
        const { messageId, conversationId, startupId, pageId, tenantId, incubationUserId } = data;

        let senderId = socket.user.id;
        if (startupId) {
          const guard = await validateSendPermission(socket.user.id, startupId, "STARTUP");
          if (!guard.allowed) { socket.emit("error", { message: guard.reason }); return; }
          senderId = startupId;
        } else if (pageId) {
          const guard = await validateSendPermission(socket.user.id, pageId, "PAGE");
          if (!guard.allowed) { socket.emit("error", { message: guard.reason }); return; }
          senderId = pageId;
        } else if (tenantId) {
          const guard = await validateSendPermission(socket.user.id, tenantId, "TENANT");
          if (!guard.allowed) { socket.emit("error", { message: guard.reason }); return; }
          senderId = tenantId;
        } else if (incubationUserId) {
          const guard = await validateSendPermission(socket.user.id, incubationUserId, "INCUBATION_USER");
          if (!guard.allowed) { socket.emit("error", { message: guard.reason }); return; }
          senderId = incubationUserId;
        }

        await UniversalChatService.deleteMessage(senderId, messageId);

        chatNamespace
          .to(`conversation:${conversationId}`)
          .emit("message-deleted", { messageId, conversationId });
      } catch (error) {
        console.error("Error deleting message:", error);
        socket.emit("error", {
          message: error.message || "Failed to delete message",
        });
      }
    });

    socket.on("edit-message", async (data) => {
      try {
        const { messageId, conversationId, content, startupId, pageId, tenantId, incubationUserId } = data;

        let senderId = socket.user.id;
        if (startupId) {
          const guard = await validateSendPermission(socket.user.id, startupId, "STARTUP");
          if (!guard.allowed) { socket.emit("error", { message: guard.reason }); return; }
          senderId = startupId;
        } else if (pageId) {
          const guard = await validateSendPermission(socket.user.id, pageId, "PAGE");
          if (!guard.allowed) { socket.emit("error", { message: guard.reason }); return; }
          senderId = pageId;
        } else if (tenantId) {
          const guard = await validateSendPermission(socket.user.id, tenantId, "TENANT");
          if (!guard.allowed) { socket.emit("error", { message: guard.reason }); return; }
          senderId = tenantId;
        } else if (incubationUserId) {
          const guard = await validateSendPermission(socket.user.id, incubationUserId, "INCUBATION_USER");
          if (!guard.allowed) { socket.emit("error", { message: guard.reason }); return; }
          senderId = incubationUserId;
        }

        const message = await UniversalChatService.editMessage(
          senderId,
          messageId,
          content,
        );

        chatNamespace
          .to(`conversation:${conversationId}`)
          .emit("message-edited", {
            messageId,
            conversationId,
            content,
            editedAt: message.editedAt,
          });
      } catch (error) {
        console.error("Error editing message:", error);
        socket.emit("error", {
          message: error.message || "Failed to edit message",
        });
      }
    });

    socket.on("disconnect", () => {
      userSockets.delete(socket.user.id);
    });
  });

  return chatNamespace;
};

export const getUserSocketId = (userId) => {
  return userSockets.get(userId);
};

export const notifyUser = (io, userId, event, data) => {
  const chatNamespace = io.of("/chat");
  chatNamespace.to(`user:${userId}`).emit(event, data);
};
