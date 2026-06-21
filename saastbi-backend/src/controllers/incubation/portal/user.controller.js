import { userService } from "../../../services/incubation/portal/user.service.js";
import { ApiError } from "../../../utils/ApiError.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";

export const UserController = {
  checkTenant: asyncHandler(async (req, res) => {
    try {
      const { tenantKey } = req.body;
      await userService.checkTenant({ tenantKey });
      return apiResponse.tenantAvailable(res);
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.tenantNotAvailable(res);
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),

  checkEmail: asyncHandler(async (req, res) => {
    try {
      const { email } = req.body;

      const result = await userService.checkEmail({
        email,
      });

      return apiResponse.sendSuccess(
        res,
        result,
        result.exists ? "Incubation user found" : "Email is available",
      );
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(
          res,
          error.statusCode,
          error.message,
        );
      }

      return apiResponse.sendServerError(res, error.message);
    }
  }),
  getUserByEmail: asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) {
      throw new ApiError(400, "Email is required");
    }
    const user = await userService.getUserByEmail(email);
    return apiResponse.sendSuccess(res, user, "User fetched successfully");
  }),
  signup: asyncHandler(async (req, res) => {
    try {
      const { adminName, email, organizationName, tenantKey, password } =
        req.body;
      await userService.signup({
        adminName,
        email,
        organizationName,
        tenantKey,
        password,
      });
      return apiResponse.sendOtp(res);
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(
          res,
          error.statusCode,
          null,
          error.message,
        );
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),
  resendOtp: asyncHandler(async (req, res) => {
    try {
      const { email } = req.body;
      await userService.resendOtp({ email });
      return apiResponse.reSendOtp(res);
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(
          res,
          error.statusCode,
          null,
          error.message,
        );
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),
  verifySignupOtp: asyncHandler(async (req, res) => {
    try {
      const { email, otp } = req.body;
      const { user, refreshToken, accessToken } =
        await userService.verifySignupOtp({
          email,
          otp,
        });
      return apiResponse.verifyOtp(res, { user, refreshToken, accessToken });
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(
          res,
          error.statusCode,
          null,
          error.message,
        );
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),
  createUserWithRole: asyncHandler(async (req, res) => {
    const tenantkey = req.headers["tenantkey"];
    const {
      name,
      email,
      password,
      roleId,
      isAdmin,
      isPanelMember,
      imageUrl,
      isExistingUser,
      programIds = [],
    } = req.body;
    const user = await userService.createUserWithRole({
      tenantkey,
      name,
      email,
      password,
      roleId,
      isAdmin,
      isPanelMember,
      imageUrl,
      isExistingUser,
      programIds,
      assignedById: req.user.incubationUserId,
    });
    return apiResponse.sendSuccess(res, user, "User created and role assigned");
  }),
  getUsers: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"];
    const { page, limit, search, sortBy, order } = req.query;
    const users = await userService.getUsers({
      tenantKey,
      page,
      limit,
      search,
      sortBy,
      order,
    });
    return apiResponse.sendSuccess(res, users, "Users fetched successfully");
  }),
  getUsersDropdown: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"];

    const users = await userService.getUsersDropdown({ tenantKey });
    return apiResponse.sendSuccess(
      res,
      users,
      "Users dropdown fetched successfully",
    );
  }),
  updateProfile: asyncHandler(async (req, res) => {
    try {
      const data = req.body;
      const userId = req.user.id;
      const updatedUser = await userService.updateProfile(userId, data);

      return apiResponse.sendCreated(
        res,
        updatedUser,
        "Profile updated successfully",
      );
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(
          res,
          error.statusCode,
          null,
          error.message,
        );
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),
  login: asyncHandler(async (req, res) => {
    try {
      const { email, password } = req.body;
      const { accessToken, refreshToken, user, tenants } =
        await userService.login({
          email,
          password,
          req,
        });

      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 15 * 60 * 1000,
        path: "/",
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      return apiResponse.sendSuccess(
        res,
        { accessToken, refreshToken, user, tenants },
        "Login successful",
      );
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(
          res,
          error.statusCode,
          null,
          error.message,
        );
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),
  selectTenant: asyncHandler(async (req, res) => {
    try {
      const { incubationUserId, tenantId } = req.body;
      const result = await userService.selectTenant({
        incubationUserId,
        tenantId,
      });

      return apiResponse.sendSuccess(
        res,
        result,
        "Tenant selected successfully",
      );
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(
          res,
          error.statusCode,
          null,
          error.message,
        );
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),
  logout: asyncHandler(async (req, res) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      await userService.logout(req.user.id, refreshToken);
      res.clearCookie("accessToken", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
      });
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
      });
      return apiResponse.sendSuccess(res, null, "Logged out successfully");
    } catch (error) {
      return apiResponse.sendServerError(res, error.message);
    }
  }),
  getProfile: asyncHandler(async (req, res) => {
    try {
      const userId = req.user.id;
      const profile = await userService.getProfile(userId);
      return apiResponse.sendSuccess(
        res,
        profile,
        "Profile fetched successfully",
      );
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(
          res,
          error.statusCode,
          null,
          error.message,
        );
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),
  refresh: async (req, res, next) => {
    try {
      const refreshToken = req.cookies?.refreshToken;

      if (!refreshToken) {
        return apiResponse.sendUnauthorized(res);
      }
      const {
        accessToken,
        refreshToken: newRefreshToken,
        user,
      } = await userService.refreshTokens(refreshToken, req);
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
  createTenantPage: asyncHandler(async (req, res) => {
    try {
      const userId = req.user.incubationUserId;
      const { tenantId, ...pageData } = req.body;
      const result = await userService.createTenantPage({
        userId,
        tenantId,
        pageData,
      });
      return apiResponse.sendCreated(
        res,
        result,
        "Page created successfully for your organization",
      );
    } catch (error) {
      if (error instanceof ApiError) {
        return apiResponse.sendCustomResponse(
          res,
          error.statusCode,
          null,
          error.message,
        );
      }
      return apiResponse.sendServerError(res, error.message);
    }
  }),
  forgotPassword: asyncHandler(async (req, res) => {
    try {
      const { email } = req.body;
      const response = await userService.forgotPassword({ email });
      return apiResponse.sendSuccess(
        res,
        response,
        "OTP sent successfully to your email",
      );
    } catch (error) {
      if (error instanceof ApiError)
        return apiResponse.sendCustomResponse(
          res,
          error.statusCode,
          null,
          error.message,
        );
      return apiResponse.sendServerError(res, error.message);
    }
  }),
  verifyForgotPasswordOtp: asyncHandler(async (req, res) => {
    try {
      const { email, otp } = req.body;
      const response = await userService.verifyForgotPasswordOtp({
        email,
        otp,
      });
      return apiResponse.sendSuccess(
        res,
        response,
        "OTP verified successfully",
      );
    } catch (error) {
      if (error instanceof ApiError)
        return apiResponse.sendCustomResponse(
          res,
          error.statusCode,
          null,
          error.message,
        );
      return apiResponse.sendServerError(res, error.message);
    }
  }),
  resetPassword: asyncHandler(async (req, res) => {
    try {
      const { email, newPassword, resetToken } = req.body;
      const response = await userService.resetPassword({
        email,
        newPassword,
        resetToken,
      });
      return apiResponse.sendSuccess(
        res,
        response,
        "Password reset successfully",
      );
    } catch (error) {
      if (error instanceof ApiError)
        return apiResponse.sendCustomResponse(
          res,
          error.statusCode,
          null,
          error.message,
        );
      return apiResponse.sendServerError(res, error.message);
    }
  }),
  getIncubationTeamMembers: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"];

    const result = await userService.getIncubationTeamMembers({
      tenantKey,
      userId: req.user.incubationUserId,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Incubation team members fetched successfully",
    );
  }),

  getUserDetails: asyncHandler(async (req, res) => {
    const { incubationUserId } = req.params;
    const tenantKey = req.headers["tenantkey"];

    const result = await userService.getUserDetails({
      incubationUserId,
      tenantKey,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "User details fetched successfully",
    );
  }),

  updateUser: asyncHandler(async (req, res) => {
    const { incubationUserId } = req.params;
    const tenantKey = req.headers["tenantkey"];

    const result = await userService.updateUser({
      ...req.body,
      incubationUserId,
      tenantKey,
    });

    return apiResponse.sendSuccess(res, result, "User updated successfully");
  }),
};
