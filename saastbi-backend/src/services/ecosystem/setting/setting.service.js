import sendMail from "../../../config/sendMail.js";
import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import {
  hashPassword,
  verifyPassword,
} from "../../../utils/helperFunctions.js";
import { revokeAllSessions } from "../../../utils/token.js";
import path from "path";

export const EcosystemSettingService = {
  changePassword: async ({ userId, currentPassword, newPassword }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");

    if (!currentPassword || !newPassword) {
      throw new ApiError(400, "Current password and new password are required");
    }

    if (newPassword.length < 8) {
      throw new ApiError(400, "Password must be at least 8 characters");
    }

    if (currentPassword === newPassword) {
      throw new ApiError(
        400,
        "New password cannot be the same as current password"
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
        firstName: true,
        email: true,
      },
    });

    if (!user) throw new ApiError(404, "User not found");

    const isValid = await verifyPassword(user.passwordHash, currentPassword);

    if (!isValid) {
      throw new ApiError(401, "Current password is incorrect");
    }

    const hashedPassword = await hashPassword(newPassword);

    await db.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    await revokeAllSessions(userId);

    const templateData = {
      firstName: user.firstName,
      portalName: "ECOSYSTEM",
      supportEmail: "mail.agilegrowthtech@gmail.com",
    };

    const templatePath = path.resolve(
      "./src/mails/password-changed-success.ejs"
    );

    await sendMail(
      user.email,
      "ECOSYSTEM: Password Changed Successfully",
      templatePath,
      templateData
    );

    return {
      message: "Password changed successfully.",
    };
  },

  updateAppearInSearch: async ({
    userId,
    appearInSearch,
  }) => {
  
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }
  
    const settings = await db.userSettings.upsert({
        where: {
          userId,
        },
  
        update: {
          appearInSearch,
        },
  
        create: {
          userId,
          appearInSearch,
        },
      });
  
    return settings;
  },

  connectionRequest: async ({ userId, allowConnectionRequest }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const settings = await db.userSettings.upsert({
      where: { userId },
      update: {
        allowConnectionRequests: allowConnectionRequest,
      },
      create: {
        userId,
        allowConnectionRequests: allowConnectionRequest,
      },
    });

    return settings;
  },

  messagePermission: async ({ userId, allowMessagesFrom }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const settings = await db.userSettings.upsert({
      where: { userId },
      update: {
        allowMessagesFrom: allowMessagesFrom,
      },
      create: {
        userId,
        allowMessagesFrom: allowMessagesFrom,
      },
    });
    return settings;
  },

  showOnlineStatus: async ({ userId, showOnlineStatus }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const settings = await db.userSettings.upsert({
      where: { userId },
      update: {
        showOnlineStatus,
      },
      create: {
        userId,
        showOnlineStatus,
      },
    });

    return settings;
  },

  loginNotifications: async ({ userId, loginNotifications }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const settings = await db.userSettings.upsert({
      where: { userId },
      update: {
        loginNotifications,
      },
      create: {
        userId,
        loginNotifications,
      },
    });

    return settings;
  },

  profileVisibility: async ({ userId, profileVisibility }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const settings = await db.userSettings.upsert({
      where: { userId },
      update: {
        profileVisibility,
      },
      create: {
        userId,
        profileVisibility,
      },
    });

    return settings;
  },

  showOnlineStatus: async ({ userId, showOnlineStatus }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const settings = await db.userSettings.upsert({
      where: { userId },
      update: {
        showOnlineStatus,
      },
      create: {
        userId,
        showOnlineStatus,
      },
    });

    return settings;
  },

  showLastSeen: async ({ userId, showLastSeen }) => {
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }
  
    return db.userSettings.upsert({
      where: { userId },
      update: {
        showLastSeen,
      },
      create: {
        userId,
        showLastSeen,
      },
    });
  },

  getContactInfo: async (userId) => {
    const user = await db.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    });
  
    if (!user) {
      throw new ApiError(404, "User not found");
    }
  
    return user;
  },

  updateContactInfo: async ({ userId, email, phone }) => {
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }
  
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
      },
    });
  
    if (!user) {
      throw new ApiError(404, "User not found");
    }
  
    if (!email && !phone) {
      throw new ApiError(
        400,
        "At least one field (email or phone) is required"
      );
    }
  
    if (email && email !== user.email) {
      const existingEmail = await db.user.findUnique({
        where: { email },
        select: { id: true },
      });
  
      if (existingEmail) {
        throw new ApiError(409, "Email already exists");
      }
    }
  
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        ...(email && {
          email,
          emailVerified: false,
        }),
  
        ...(phone && {
          phone,
          phoneVerified: false,
        }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        emailVerified: true,
        phoneVerified: true,
      },
    });
  
    return updatedUser;
  },

  deleteAccount: async ({ userId }) => {

    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }
  
    const user = await db.user.findUnique({
      where: {
        id: userId,
      },
  
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
      },
    });
  
    if (!user) {
      throw new ApiError(404, "User not found");
    }
  
    await db.userSession.deleteMany({
      where: {
        userId,
      },
    });
  
    await db.refreshToken.deleteMany({
      where: {
        userId,
      },
    });
  
    await db.notification.deleteMany({
      where: {
        userId,
      },
    });
  
    await db.notificationPreference.deleteMany({
      where: {
        userId,
      },
    });
  
    await db.loginHistory.deleteMany({
      where: {
        userId,
      },
    });
  
    await db.follow.deleteMany({
      where: {
        OR: [
          { followerId: userId },
          { followingId: userId },
        ],
      },
    });
  
    await db.connection.deleteMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
      },
    });
  
    await db.bookmark.deleteMany({
      where: {
        userId,
      },
    });
  
   
    await db.like.deleteMany({
      where: {
        userId,
      },
    });
  
  
    await db.comment.deleteMany({
      where: {
        userId,
      },
    });
  

    await db.share.deleteMany({
      where: {
        userId,
      },
    });
  
    await db.message.deleteMany({
      where: {
        senderId: userId,
      },
    });
  

    await db.conversation.deleteMany({
      where: {
        OR: [
          { participant1Id: userId },
          { participant2Id: userId },
        ],
      },
    });
  
    await db.user.delete({
      where: {
        id: userId,
      },
    });
  
    return {
      success: true,
    };
  },

  getSessions: async (userId) => {

    const sessions = await db.userSession.findMany({
      where: {
        userId,
      },
  
      orderBy: {
        lastActiveAt: "desc",
      },
  
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        userAgent: true,
        lastActiveAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  
    return sessions;
  },

  logoutSession: async ({
    userId,
    sessionId,
  }) => {
  
    const session = await db.userSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });
  
    if (!session) {
      throw new ApiError(404, "Session not found");
    }
  
    await db.userSession.update({
      where: {
        id: sessionId,
      },
      data: {
        isActive: false,
      },
    });
  
    return {
      success: true,
    };
  },

  logoutAllOtherSessions: async ({
    userId,
    currentRefreshToken,
  }) => {
  
    await db.userSession.updateMany({
      where: {
        userId,
  
        refreshToken: {
          not: currentRefreshToken,
        },
      },
  
      data: {
        isActive: false,
      },
    });
  
    return {
      success: true,
    };
  },
};
