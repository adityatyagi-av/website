import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import {
  generateTokens,
  createSession,
} from "../../../utils/token.js";

const USER_SELECT_FIELDS = {
  id: true,
  username: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  profilePhoto: true,
  coverImage: true,
  headline: true,
  bio: true,
  dateOfBirth: true,
  gender: true,
  emailVerified: true,
  phoneVerified: true,
  profileCurrentStage: true,
  isActive: true,
  isPremium: true,
  provider: true,
};

async function generateUniqueUsername(firstName, lastName) {
  const base = `${firstName}${lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const seed = base || "user";
  let username = seed;
  let isUnique = false;

  while (!isUnique) {
    const exists = await db.user.findUnique({ where: { username } });
    if (!exists) {
      isUnique = true;
    } else {
      username = `${seed}${Math.floor(1000 + Math.random() * 9000)}`;
    }
  }

  return username;
}

export const OAuthService = {
  handleOAuthLogin: async ({
    provider,
    providerAccountId,
    email,
    firstName,
    lastName,
    profilePhoto,
    rawProfile,
  }) => {
    const linked = await db.linkedAccount.findUnique({
      where: {
        provider_providerAccountId: { provider, providerAccountId },
      },
      include: {
        user: { select: USER_SELECT_FIELDS },
      },
    });

    if (linked) {
      if (!linked.user.isActive) {
        throw new ApiError(403, "Your account has been deactivated");
      }

      await db.user.update({
        where: { id: linked.user.id },
        data: { lastLogin: new Date() },
      });

      await db.loginHistory.create({
        data: {
          userId: linked.user.id,
          status: "success",
          deviceInfo: `oauth:${provider}`,
        },
      });

      const { accessToken, refreshToken } = generateTokens(linked.user);
      await createSession(linked.user.id, refreshToken, {});

      return {
        accessToken,
        refreshToken,
        user: linked.user,
        isNewUser: false,
      };
    }

    if (email) {
      const existingUser = await db.user.findUnique({
        where: { email },
        select: { ...USER_SELECT_FIELDS, linkedAccounts: { select: { provider: true } } },
      });

      if (existingUser) {
        if (!existingUser.isActive) {
          throw new ApiError(403, "Your account has been deactivated");
        }

        await db.linkedAccount.create({
          data: {
            userId: existingUser.id,
            provider,
            providerAccountId,
            email,
            displayName: `${firstName} ${lastName}`.trim() || null,
            profilePhoto,
            rawProfile: rawProfile || undefined,
          },
        });

        const updatedUser = await db.user.update({
          where: { id: existingUser.id },
          data: {
            lastLogin: new Date(),
            profilePhoto: existingUser.profilePhoto || profilePhoto,
          },
          select: USER_SELECT_FIELDS,
        });

        await db.loginHistory.create({
          data: {
            userId: existingUser.id,
            status: "success",
            deviceInfo: `oauth:${provider}:linked`,
          },
        });

        const { accessToken, refreshToken } = generateTokens(updatedUser);
        await createSession(updatedUser.id, refreshToken, {});

        return {
          accessToken,
          refreshToken,
          user: updatedUser,
          isNewUser: false,
        };
      }
    }

    const username = await generateUniqueUsername(firstName, lastName);

    const result = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username,
          email,
          passwordHash: null,
          firstName: firstName || "",
          lastName: lastName || "",
          provider,
          profilePhoto,
          emailVerified: true,
          profileCurrentStage: 1,
          isActive: true,
          lastLogin: new Date(),
        },
        select: USER_SELECT_FIELDS,
      });

      await tx.linkedAccount.create({
        data: {
          userId: newUser.id,
          provider,
          providerAccountId,
          email,
          displayName: `${firstName} ${lastName}`.trim() || null,
          profilePhoto,
          rawProfile: rawProfile || undefined,
        },
      });

      await tx.loginHistory.create({
        data: {
          userId: newUser.id,
          status: "success",
          deviceInfo: `oauth:${provider}:new`,
        },
      });

      return newUser;
    });

    const { accessToken, refreshToken } = generateTokens(result);
    await createSession(result.id, refreshToken, {});

    return {
      accessToken,
      refreshToken,
      user: result,
      isNewUser: true,
    };
  },

  getLinkedAccounts: async (userId) => {
    const accounts = await db.linkedAccount.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        email: true,
        displayName: true,
        profilePhoto: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return accounts;
  },

  unlinkAccount: async ({ userId, provider }) => {
    const normalizedProvider = provider.toLowerCase();

    const account = await db.linkedAccount.findUnique({
      where: {
        userId_provider: { userId, provider: normalizedProvider },
      },
    });

    if (!account) {
      throw new ApiError(404, "This provider is not linked to your account");
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        passwordHash: true,
        _count: { select: { linkedAccounts: true } },
      },
    });

    const hasPassword = !!user.passwordHash;
    const linkedCount = user._count.linkedAccounts;

    if (!hasPassword && linkedCount <= 1) {
      throw new ApiError(
        400,
        "Cannot unlink your only sign-in method. Set a password first.",
      );
    }

    await db.linkedAccount.delete({
      where: { id: account.id },
    });

    return { message: `${normalizedProvider} account unlinked successfully` };
  },

  linkAccount: async ({
    userId,
    provider,
    providerAccountId,
    email,
    profilePhoto,
    rawProfile,
    displayName,
  }) => {
    const normalizedProvider = provider.toLowerCase();

    const existingForUser = await db.linkedAccount.findUnique({
      where: {
        userId_provider: { userId, provider: normalizedProvider },
      },
    });

    if (existingForUser) {
      throw new ApiError(
        409,
        `Your account already has ${normalizedProvider} linked`,
      );
    }

    const existingForProvider = await db.linkedAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: normalizedProvider,
          providerAccountId,
        },
      },
    });

    if (existingForProvider) {
      throw new ApiError(
        409,
        `This ${normalizedProvider} account is already linked to another user`,
      );
    }

    const linked = await db.linkedAccount.create({
      data: {
        userId,
        provider: normalizedProvider,
        providerAccountId,
        email,
        displayName: displayName || null,
        profilePhoto,
        rawProfile: rawProfile || undefined,
      },
      select: {
        id: true,
        provider: true,
        email: true,
        displayName: true,
        createdAt: true,
      },
    });

    return linked;
  },
};
