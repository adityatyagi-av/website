import { ApiError } from "../../utils/ApiError.js";
import db from "../../db/db.js";
import {
  hashPassword,
  isEmailValid,
  verifyPassword,
} from "../../utils/helperFunctions.js";
import { generateTokens } from "../../utils/token.js";
import { setRedis, getRedis, deleteRedis } from "../../config/redisClient.js";
import jwt from "jsonwebtoken";

export const SuperAdminAuthService = {
  signup: async ({ email, name, role, password }) => {
    if (!email || !role || !name || !password) {
      throw new ApiError(400, " Fields are required.");
    }
    if (!isEmailValid(email)) {
      throw new ApiError(400, "Email not valid.");
    }
    const existingUser = await db.superAdmin.findUnique({
      where: {
        email: email,
      },
    });
    if (existingUser) {
      throw new ApiError(400, "User already exist");
    }
    const hashedPassword = await hashPassword(password);

    const user = await db.superAdmin.create({
      data: {
        name: name,
        email: email,
        password: hashedPassword,
        role: role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role:true,
      },
    });
    return { user };
  },

  login: async ({ email, password }) => {
    const user = await db.superAdmin.findUnique({ where: { email } });
    if (!user) throw new ApiError(401, "Invalid email or password");

    const isPasswordValid = await verifyPassword(user.password, password);
    if (!isPasswordValid) throw new ApiError(401, "Invalid email or password");

    const { accessToken, refreshToken } = generateTokens(user);
    await setRedis(`refresh:superadmin:${user.id}`, refreshToken, 60 * 60 * 24 * 7);
    return { accessToken, refreshToken, user };
  },
  logout: async (userId, refreshToken) => {
    await deleteRedis(`refresh:superadmin:${userId}`);
  },
  getProfile: async (userId) => {
    const user = await db.superAdmin.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return user;
  },

  refreshTokens: async (refreshToken) => {
    try {
      if (!refreshToken) throw new ApiError(401, "No refresh token provided");
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
      const userId = decoded.id;
      const stored = await getRedis(`refresh:superadmin:${userId}`);
      if (!stored || stored !== refreshToken) {
        throw new ApiError(401, "Invalid or expired refresh token");
      }
      const { accessToken, refreshToken: newRefreshToken } =
        generateTokens(decoded);

      await setRedis(`refresh:superadmin:${userId}`, newRefreshToken, 60 * 60 * 24 * 7);
      return { accessToken, refreshToken: newRefreshToken, user: decoded };
    } catch (err) {
      throw new ApiError(401, err.message);
    }
  },
};
