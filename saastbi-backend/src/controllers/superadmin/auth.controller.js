import { SuperAdminAuthService } from "../../services/superadmin/auth.service.js";
import { ApiError } from "../../utils/ApiError.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/responseUtils.js";

export const SuperAdminAuthController = {
  signup: asyncHandler(async (req, res) => {
    try {
      const { email, name, role, password } = req.body;
      const { user } = await SuperAdminAuthService.signup({ email, name, role, password });
      return apiResponse.createdSuperAdmin(res, user, "Super admin created successfully");
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(res, error.statusCode, null, error.message);
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),

  login: asyncHandler(async (req, res) => {
    try {
      const { email, password } = req.body;
      const { accessToken, refreshToken, user } = await SuperAdminAuthService.login({
        email,
        password,
      });
      return apiResponse.sendSuccess(
        res,
        { accessToken, refreshToken, user },
        "Login successful"
      );
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(res, error.statusCode, null, error.message);
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),

  logout: asyncHandler(async (req, res) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      await SuperAdminAuthService.logout(req.user.id, refreshToken);
      res.clearCookie("accessToken", { httpOnly: true, secure: true, sameSite: "none", path: "/" });
      res.clearCookie("refreshToken", { httpOnly: true, secure: true, sameSite: "none", path: "/" });
      return apiResponse.sendSuccess(res, null, "Logged out successfully");
    } catch (error) {
      return apiResponse.sendServerError(res, error.message);
    }
  }),

  getProfile: asyncHandler(async (req, res) => {
    try {
      const userId = req.user.id;
      const profile = await SuperAdminAuthService.getProfile(userId);
      return apiResponse.sendSuccess(res, profile, "Profile fetched successfully");
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(res, error.statusCode, null, error.message);
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),

  refresh: async (req, res, _next) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        return apiResponse.sendUnauthorized(res);
      }
      const {
        accessToken,
        refreshToken: newRefreshToken,
        user,
      } = await SuperAdminAuthService.refreshTokens(refreshToken);
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 15 * 60 * 1000,
        path: "/",
      });
      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });
      return apiResponse.sendSuccess(res, {
        accessToken,
        refreshToken: newRefreshToken,
        user,
      });
    } catch (err) {
      return apiResponse.sendUnauthorized(res, err.message);
    }
  },
};
