import db from "../../db/db.js";
import { ApiError } from "../../utils/ApiError.js";

export const chatService = {
  getChatHistory: async ({ tenantId, page = 1, limit = 50 }) => {
    const skip = (page - 1) * limit;

    const chat = await db.chat.findUnique({
      where: { tenantId },
      include: {
        tenant: {
          select: {
            id: true,
            organizationName: true,
            tenantKey: true,
            tenantLogo: true,
            status: true,
            page: {
              select: {
                id: true,
                name: true,
                slug: true,
                logo: true,
                type: true,
                verificationStatus: true
              },
            },
          },
        },
      },
    });

    if (!chat) {
      return {
        chat: null,
        messages: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }

    await db.$transaction([
      db.tenantMessage.updateMany({
        where: {
          chatId: chat.id,
          senderType: "TENANT_ADMIN",
          isRead: false,
        },
        data: {
          isRead: true,
        },
      }),
      db.chat.update({
        where: {
          id: chat.id,
        },
        data: {
          unreadCount: 0,
        },
      }),
    ]);

    const [messages, total] = await Promise.all([
      db.tenantMessage.findMany({
        where: { chatId: chat.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.tenantMessage.count({ where: { chatId: chat.id } }),
    ]);

    const messagesWithSender = await Promise.all(
      messages.map(async (message) => {
        let sender = null;
        if (message.senderType === "SUPER_ADMIN") {
          sender = await db.superAdmin.findUnique({
            where: { id: message.senderId },
            select: { id: true, name: true, email: true, role: true },
          });
        } else {
          sender = await db.incubationUser.findUnique({
            where: { id: message.senderId },
            select: { id: true, name: true, email: true },
          });
        }
        return { ...message, sender };
      })
    );

    return {
      chat: {
        id: chat.id,
        tenantId: chat.tenantId,
        tenant: chat.tenant,
        lastMessage: chat.lastMessage,
        lastMessageAt: chat.lastMessageAt,
        unreadCount: 0,
        tenantUnreadCount: chat.tenantUnreadCount,
      },
      messages: messagesWithSender.reverse(),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  getAllChats: async ({ page = 1, limit = 20, search = "" }) => {
    const skip = (page - 1) * limit;

    const where = search
      ? {
          tenant: {
            OR: [
              { organizationName: { contains: search, mode: "insensitive" } },
              { tenantKey: { contains: search, mode: "insensitive" } },
            ],
          },
        }
      : {};

    const [chats, total] = await Promise.all([
      db.chat.findMany({
        where,
        include: {
          tenant: {
            select: {
              id: true,
              organizationName: true,
              tenantKey: true,
              tenantLogo: true,
              status: true,
              domain: true,
              page: {
                select: {
                  id: true,
                  slug: true,
                  logo: true,
                  coverImage: true,
                  type: true,
                  followerCount: true,
                  verificationStatus: true,
                },
              },
              profile: {
                select: {
                  city: true,
                  state: true,
                  country: true,
                  isVerified: true,
                  bannerColor: true,
                },
              },
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              content: true,
              senderType: true,
              createdAt: true,
              isRead: true,
            },
          },
        },
        orderBy: { lastMessageAt: "desc" },
        skip,
        take: limit,
      }),
      db.chat.count({ where }),
    ]);

    const chatsWithDetails = chats.map((chat) => ({
      id: chat.id,
      tenantId: chat.tenantId,
      tenant: chat.tenant,
      lastMessage: chat.lastMessage,
      lastMessageAt: chat.lastMessageAt,
      unreadCount: chat.unreadCount,
      tenantUnreadCount: chat.tenantUnreadCount,
      hasMessages: chat.messages.length > 0,
    }));

    return {
      chats: chatsWithDetails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  searchTenantAdmins: async ({ search, page = 1, limit = 20 }) => {
    const skip = (page - 1) * limit;

    if (!search || search.trim().length === 0) {
      throw new ApiError(400, "Search query is required");
    }

    const where = {
      isAdmin: true,
      isActive: true,
      OR: [
        { incubationUser: { name: { contains: search, mode: "insensitive" } } },
        { incubationUser: { email: { contains: search, mode: "insensitive" } } },
        {
          tenant: {
            OR: [
              { organizationName: { contains: search, mode: "insensitive" } },
              { tenantKey: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ],
    };

    const [adminMemberships, total] = await Promise.all([
      db.incubationUserTenant.findMany({
        where,
        include: {
          incubationUser: {
            select: { id: true, name: true, email: true },
          },
          tenant: {
            select: {
              id: true,
              organizationName: true,
              tenantKey: true,
              status: true,
            },
          },
        },
        skip,
        take: limit,
      }),
      db.incubationUserTenant.count({ where }),
    ]);

    const tenantsWithChatStatus = await Promise.all(
      adminMemberships.map(async (m) => {
        const chat = await db.chat.findUnique({
          where: { tenantId: m.tenantId },
          select: {
            id: true,
            lastMessage: true,
            lastMessageAt: true,
            unreadCount: true,
            tenantUnreadCount: true,
          },
        });

        return {
          id: m.incubationUser.id,
          name: m.incubationUser.name,
          email: m.incubationUser.email,
          tenantId: m.tenantId,
          tenant: m.tenant,
          chat: chat || null,
          hasChat: !!chat,
        };
      })
    );

    return {
      tenantAdmins: tenantsWithChatStatus,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  getTenantChat: async (tenantId) => {
    const chat = await db.chat.findUnique({
      where: { tenantId },
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

    if (!chat) return null;

    return {
      id: chat.id,
      tenantId: chat.tenantId,
      tenant: chat.tenant,
      lastMessage: chat.lastMessage,
      lastMessageAt: chat.lastMessageAt,
      unreadCount: chat.unreadCount,
      tenantUnreadCount: chat.tenantUnreadCount,
    };
  },

  markTenantMessagesAsRead: async (tenantId, userId) => {
    const chat = await db.chat.findUnique({
      where: { tenantId },
    });

    if (!chat) return;

    await db.tenantMessage.updateMany({
      where: {
        chatId: chat.id,
        senderType: "SUPER_ADMIN",
        isRead: false,
      },
      data: { isRead: true },
    });

    await db.chat.update({
      where: { id: chat.id },
      data: { tenantUnreadCount: 0 },
    });
  },
};
