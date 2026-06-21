import db from "../../../db/db.js";

import {
  generateOtp,
  hashPassword,
  isEmailValid,
  verifyOtp,
  verifyPassword,
} from "../../../utils/helperFunctions.js";
import {
  deleteRedis,
  getRedis,
  setRedis,
} from "../../../config/redisClient.js";
import path from "path";
import sendMail from "../../../config/sendMail.js";
import {
  generateTokens,
  createSession,
  validateSession,
  rotateSession,
  revokeSession,
  revokeAllSessions,
} from "../../../utils/token.js";
import jwt from "jsonwebtoken";
import { ApiError } from "../../../utils/ApiError.js";
import crypto from "crypto";
import { allowedRoles } from "../../../../types/roles.js";
import { OAuthService } from "./oauth.service.js";
import { verifyGoogleToken } from "./providers/google.provider.js";
import { verifyFacebookToken } from "./providers/facebook.provider.js";
import { verifyAppleToken } from "./providers/apple.provider.js";
import { NotificationService } from "../../common/notification.service.js";
export const EcosystemAuthService = {
  signup: async ({
    firstName,
    lastName,
    email,
    password,
  }) => {
    if (
      !firstName ||
      !lastName ||
      !email ||
      !password
    )
      throw new ApiError(400, "All fields are required");

    if (!isEmailValid(email)) throw new ApiError(400, "Invalid email format");

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser)
      throw new ApiError(409, "User already exists with this email");
    if (password.length < 8)
      throw new ApiError(400, "Password must be at least 8 characters");

    const hashedPassword = await hashPassword(password);
    const otp = generateOtp();

    const tempData = {
      firstName,
      lastName,
      email,
      password: hashedPassword,
      // country,
      // city,
      // state,
      // zipCode: zipCode || null,
      profileCurrentStage: 0,
      otp,
    };
    await setRedis(`signup:${email}`, JSON.stringify(tempData), 3600);

    const templateData = {
      otp,
      firstName,
      lastName,

      expiryMinutes: 5,
      portalName: "ECOSYSTEM",
    };
    const templatePath = path.resolve("./src/mails/signup-otp-mail.ejs");

    await sendMail(
      email,
      "OPERNOVA - OTP Verification",
      templatePath,
      templateData,
    );

    return { email };
  },

  resendOtp: async ({ email }) => {
    if (!email) throw new ApiError(400, "Email is required");
    if (!isEmailValid(email)) throw new ApiError(400, "Invalid email format");

    const redisData = await getRedis(`signup:${email}`);
    if (!redisData)
      throw new ApiError(404, "Signup session expired, please register again");

    const data = JSON.parse(redisData);
    const otp = generateOtp();
    data.otp = otp;
    await setRedis(`signup:${email}`, JSON.stringify(data), 3600);

    const templateData = {
      otp,
      firstName: data.firstName,
      lastName: data.lastName,
      expiryMinutes: 5,
      portalName: "ECOSYSTEM",
    };

    const templatePath = path.resolve("./src/mails/resend-otp-mail.ejs");

    await sendMail(email, "OPERNOVA - OTP Resent", templatePath, templateData);
    return { email };
  },

  verifyOtp: async ({ email, otp }) => {
    if (!email || !otp) {
      throw new ApiError(400, "Email and OTP are required");
    }

    const redisData = await getRedis(`signup:${email}`);
    if (!redisData) {
      throw new ApiError(400, "OTP expired or signup session not found");
    }

    const data = JSON.parse(redisData);

    const otpResult = verifyOtp(otp, data.otp);
    if (!otpResult.success) {
      throw new ApiError(401, "Invalid OTP");
    }
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ApiError(409, "User already verified. Please login.");
    }
    const base = `${data.firstName}${data.lastName}`
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    let username = base;
    let isUnique = false;

    while (!isUnique) {
      const exists = await db.user.findUnique({ where: { username } });
      if (!exists) isUnique = true;
      else username = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const user = await db.user.create({
      data: {
        username,
        email: data.email,
        passwordHash: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        emailVerified: true,
        profileCurrentStage: 1,
        isActive: true,
        // location: {
        //   create: {
        //     country: data.country,
        //     city: data.city,
        //     state: data.state,
        //     zipCode: data.zipCode || null,
        //   },
        // },
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        profileCurrentStage: true,
      },
    });

    await deleteRedis(`signup:${email}`);

    const { accessToken, refreshToken } = generateTokens(user);
    await createSession(user.id, refreshToken, { userAgent: "signup", ipAddress: "signup" });

    return { accessToken, refreshToken, user };
  },

  login: async ({ email, password, req }) => {
    if (!email || !password)
      throw new ApiError(400, "Email and password required");

    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        username: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        phone: true,
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
      },
    });

    if (!user) throw new ApiError(401, "Invalid email or password");

    if (!user.passwordHash) {
      throw new ApiError(
        403,
        "This account was created via social login. Please use your social provider to sign in, or use 'Forgot Password' to set a password.",
      );
    }

    const isPasswordValid = await verifyPassword(user.passwordHash, password);
    if (!isPasswordValid) throw new ApiError(401, "Invalid email or password");

    const { accessToken, refreshToken } = generateTokens(user);
    await createSession(user.id, refreshToken, { userAgent: req?.headers?.["user-agent"], ipAddress: req?.ip });

    await NotificationService.send({
      recipientId: user.id,
      type: "SYSTEM",
      category: "SYSTEM",
      priority: "MEDIUM",
      title: "New Login Detected",
      message: "Your account was logged in successfully.",
      data: {
        loginTime: new Date().toLocaleString(),
        ipAddress: req?.ip || "Unknown",
        device:
          req?.headers?.["user-agent"] ||
          "Unknown Device",
      },
    });
    delete user.passwordHash;
    return { accessToken, refreshToken, user };
  },

  logout: async (userId, refreshToken) => {
    await revokeSession(userId, refreshToken);
  },

  refreshTokens: async (refreshToken, req) => {
    if (!refreshToken) throw new ApiError(401, "No refresh token provided");

    try {
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
      const userId = decoded.id;
      const isValid = await validateSession(userId, refreshToken);
      if (!isValid) throw new ApiError(401, "Invalid or expired refresh token");

      const { accessToken, refreshToken: newRefreshToken } =
        generateTokens(decoded);

      await rotateSession(userId, refreshToken, newRefreshToken, { userAgent: req?.headers?.["user-agent"], ipAddress: req?.ip });
      return { accessToken, refreshToken: newRefreshToken, user: decoded };
    } catch (err) {
      throw new ApiError(401, err.message);
    }
  },

  forgotPassword: async ({ email }) => {
    if (!email) throw new ApiError(400, "Email required");
    const user = await db.user.findUnique({ where: { email } });
    if (!user) throw new ApiError(404, "User not found");

    const otp = generateOtp();
    await setRedis(`forgot:${email}`, JSON.stringify({ otp }), 600);

    const templateData = {
      otp,
      firstName: user.firstName,
      portalName: "ECOSYSTEM",
      expiryMinutes: 10,
    };

    const templatePath = path.resolve("./src/mails/forgot-password-mail.ejs");
    await sendMail(
      email,
      "ECOSYSTEM: Password Reset OTP",
      templatePath,
      templateData,
    );

    return { email };
  },
  verifyForgotOtp: async ({ email, otp }) => {
    if (!email || !otp) {
      throw new ApiError(400, "Email and OTP are required");
    }

    const redisData = await getRedis(`forgot:${email}`);
    if (!redisData) throw new ApiError(400, "OTP expired or not found");

    const { otp: savedOtp } = JSON.parse(redisData);
    const verified = verifyOtp(otp, savedOtp);
    if (!verified.success) throw new ApiError(401, "Invalid OTP");
    const resetToken = crypto.randomBytes(32).toString("hex");

    await setRedis(
      `forgot-token:${resetToken}`,
      JSON.stringify({ email }),
      600,
    );
    await deleteRedis(`forgot:${email}`);
    return {
      resetToken,
      expiresIn: 600,
    };
  },

  resetPassword: async ({ resetToken, newPassword }) => {
    if (!resetToken || !newPassword) {
      throw new ApiError(400, "Reset token and new password are required");
    }

    if (newPassword.length < 8) {
      throw new ApiError(400, "Password must be at least 8 characters");
    }

    const redisData = await getRedis(`forgot-token:${resetToken}`);
    if (!redisData) {
      throw new ApiError(400, "Invalid or expired reset token");
    }

    const { email } = JSON.parse(redisData);

    const hashedPassword = await hashPassword(newPassword);

    const updatedUser = await db.user.update({
      where: { email },
      data: { passwordHash: hashedPassword },
      select: { id: true, firstName: true, email: true },
    });
    await revokeAllSessions(updatedUser.id);
    await deleteRedis(`forgot-token:${resetToken}`);

    const templateData = {
      firstName: updatedUser.firstName,
      portalName: "ECOSYSTEM",
    };
    const templatePath = path.resolve("./src/mails/password-reset-success.ejs");
    await sendMail(
      email,
      "ECOSYSTEM: Password Reset Successful",
      templatePath,
      templateData,
    );

    return { message: "Password reset successfully" };
  },

  // step 3 for username insertion
  checkUsername: async ({ username }) => {
    if (!username) throw new ApiError(400, "Username is required");

    const normalized = username.trim().toLowerCase();

    if (!/^[a-z0-9._]{3,20}$/.test(normalized)) {
      throw new ApiError(
        400,
        "Username must be 3-20 chars and contain only letters, numbers, dot or underscore",
      );
    }

    const existing = await db.user.findUnique({
      where: { username: normalized },
      select: { id: true },
    });

    return {
      username: normalized,
      available: !existing,
    };
  },
  updateUsername: async ({ userId, username }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!username) throw new ApiError(400, "Username is required");

    const normalized = username.trim().toLowerCase();

    if (!/^[a-z0-9._]{3,20}$/.test(normalized)) {
      throw new ApiError(
        400,
        "Username must be 3-20 chars and contain only letters, numbers, dot or underscore",
      );
    }

    const existing = await db.user.findUnique({
      where: { username: normalized },
      select: { id: true },
    });

    if (existing) throw new ApiError(409, "Username already taken");

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { profileCurrentStage: true },
    });

    if (!user) throw new ApiError(404, "User not found");

    if (user.profileCurrentStage < 1) {
      throw new ApiError(400, "Please verify email before setting username");
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        username: normalized,
        profileCurrentStage: Math.max(user.profileCurrentStage, 2),
      },
      select: {
        id: true,
        username: true,
        profileCurrentStage: true,
      },
    });

    return updatedUser;
  },

  //step 4 : create primary role and update primary role
  createPrimaryRole: async ({ userId, role }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!role) throw new ApiError(400, "Role is required");

    if (!allowedRoles.includes(role)) {
      throw new ApiError(400, "Invalid role");
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { profileCurrentStage: true },
    });
    if (!user) throw new ApiError(404, "User not found");

    if (user.profileCurrentStage < 2) {
      throw new ApiError(400, "Please set username before selecting role");
    }

    const existingRoles = await db.userRole.count({ where: { userId } });
    if (existingRoles > 0) {
      const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        profileCurrentStage: Math.max(user.profileCurrentStage, 3),
      },
      select: { profileCurrentStage: true },
    });

    return {
      role: userRole,
      profileCurrentStage: updatedUser.profileCurrentStage,
    };    }

    const userRole = await db.userRole.create({
      data: {
        userId,
        roleType: role,
        isPrimary: true,
      },
      select: {
        id: true,
        roleType: true,
        isPrimary: true,
      },
    });

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        profileCurrentStage: Math.max(user.profileCurrentStage, 3),
      },
      select: { profileCurrentStage: true },
    });

    return {
      role: userRole,
      profileCurrentStage: updatedUser.profileCurrentStage,
    };
  },

  //for update roles @vansh we can update as many as roles through this api
  updateRoles: async ({ userId, roles }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      throw new ApiError(400, "Roles are required");
    }

    const roleTypes = roles.map((r) => r.role);
    const uniqueSet = new Set(roleTypes);
    if (uniqueSet.size !== roleTypes.length) {
      throw new ApiError(400, "Duplicate roles are not allowed");
    }

    for (const r of roles) {
      if (!allowedRoles.includes(r.role)) {
        throw new ApiError(400, `Invalid role: ${r.role}`);
      }
    }

    const primaryCount = roles.filter((r) => r.isPrimary).length;
    if (primaryCount !== 1) {
      throw new ApiError(400, "Exactly one role must be primary");
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { profileCurrentStage: true },
    });
    if (!user) throw new ApiError(404, "User not found");

    if (user.profileCurrentStage < 3) {
      throw new ApiError(400, "Primary role must be created first");
    }

    const existingRoles = await db.userRole.findMany({
      where: { userId },
    });

    const existingMap = new Map(existingRoles.map((r) => [r.roleType, r]));

    for (const r of roles) {
      if (existingMap.has(r.role)) {
        await db.userRole.update({
          where: { id: existingMap.get(r.role).id },
          data: { isPrimary: r.isPrimary },
        });
      } else {
        await db.userRole.create({
          data: {
            userId,
            roleType: r.role,
            isPrimary: r.isPrimary,
          },
        });
      }
    }
    const primaryRole = roles.find((r) => r.isPrimary);
    await db.userRole.updateMany({
      where: {
        userId,
        roleType: { not: primaryRole.role },
      },
      data: { isPrimary: false },
    });

    const updated = await db.userRole.findMany({
      where: { userId },
      select: { id: true, roleType: true, isPrimary: true },
    });
    return { roles: updated };
  },

  // Granular Role Management
  getRoles: async (userId) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    const roles = await db.userRole.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, roleType: true, isPrimary: true, isVerified: true },
    });
    return roles;
  },

  addRole: async ({ userId, roleType }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!roleType) throw new ApiError(400, "Role type is required");

    // Normalize to uppercase
    const normalizedRole = roleType.toUpperCase();

    if (!allowedRoles.includes(normalizedRole)) {
      throw new ApiError(400, `Invalid role: ${roleType}`);
    }

    const existingRole = await db.userRole.findUnique({
      where: {
        userId_roleType: {
          userId,
          roleType: normalizedRole,
        },
      },
    });

    if (existingRole) {
      throw new ApiError(409, "User already has this role");
    }

    const role = await db.userRole.create({
      data: {
        userId,
        roleType: normalizedRole,
        isPrimary: false,
        isPublic: true,
        isVerified: false,
      },
    });

    return role;
  },

  removeRole: async ({ userId, roleType }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!roleType) throw new ApiError(400, "Role type is required");

    // Normalize to uppercase
    const normalizedRole = roleType.toUpperCase();

    const role = await db.userRole.findUnique({
      where: {
        userId_roleType: {
          userId,
          roleType: normalizedRole,
        },
      },
    });

    if (!role) {
      throw new ApiError(404, "Role not found for this user");
    }

    if (role.isPrimary) {
      throw new ApiError(
        400,
        "Cannot remove primary role. Please change primary role first.",
      );
    }

    if (normalizedRole === "FOUNDER") {
      const startupCount = await db.startupMember.count({
        where: {
          userId,
          isActive: true,
        },
      });
  
      if (startupCount > 0) {
        throw new ApiError(
          400,
          "You are associated with one or more startups. Please delete or leave your startups before removing the Founder role."
        );
      }
    }

    await db.userRole.delete({
      where: { id: role.id },
    });

    return { message: "Role removed successfully" };
  },

  googleAuth: async ({ idToken }) => {
    if (!idToken) throw new ApiError(400, "Google ID token is required");
    const providerData = await verifyGoogleToken(idToken);
    return OAuthService.handleOAuthLogin({ provider: "google", ...providerData });
  },

  facebookAuth: async ({ accessToken }) => {
    if (!accessToken) throw new ApiError(400, "Facebook access token is required");
    const providerData = await verifyFacebookToken(accessToken);
    return OAuthService.handleOAuthLogin({ provider: "facebook", ...providerData });
  },

  appleAuth: async ({ identityToken, user }) => {
    if (!identityToken) throw new ApiError(400, "Apple identity token is required");
    const providerData = await verifyAppleToken(identityToken, user);
    return OAuthService.handleOAuthLogin({ provider: "apple", ...providerData });
  },

  getLinkedAccounts: async (userId) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    return OAuthService.getLinkedAccounts(userId);
  },

  unlinkAccount: async ({ userId, provider }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!provider) throw new ApiError(400, "Provider is required");
    return OAuthService.unlinkAccount({ userId, provider });
  },

  linkAccount: async ({ userId, provider, token, userData }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!provider || !token) throw new ApiError(400, "Provider and token are required");

    const normalizedProvider = provider.toLowerCase();
    let providerData;

    if (normalizedProvider === "google") {
      providerData = await verifyGoogleToken(token);
    } else if (normalizedProvider === "facebook") {
      providerData = await verifyFacebookToken(token);
    } else if (normalizedProvider === "apple") {
      providerData = await verifyAppleToken(token, userData);
    } else {
      throw new ApiError(400, `Unsupported provider: ${provider}`);
    }

    return OAuthService.linkAccount({
      userId,
      provider: normalizedProvider,
      providerAccountId: providerData.providerAccountId,
      email: providerData.email,
      profilePhoto: providerData.profilePhoto,
      rawProfile: providerData.rawProfile,
      displayName: `${providerData.firstName} ${providerData.lastName}`.trim() || null,
    });
  },
};
