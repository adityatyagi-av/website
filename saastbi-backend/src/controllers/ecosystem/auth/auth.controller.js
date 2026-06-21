import { EcosystemAuthService } from "../../../services/ecosystem/auth/auth.service.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";

function setAuthCookies(res, { accessToken, refreshToken }) {
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
}

export const EcosystemAuthController = {
  signup: asyncHandler(async (req, res) => {
    const {
      firstName,
      lastName,
      email,
      password,
    } = req.body;
    const result = await EcosystemAuthService.signup({
      firstName,
      lastName,
      email,
      password,
    });
    return apiResponse.sendOtp(res, result);
  }),

  verifyOtp: asyncHandler(async (req, res) => {
    const { email, otp } = req.body;
    const result = await EcosystemAuthService.verifyOtp({ email, otp });
    return apiResponse.verifyOtp(res, result);
  }),

  resendOtp: asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await EcosystemAuthService.resendOtp({ email });
    return apiResponse.sendSuccess(res, result, "OTP resent successfully.");
  }),

  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await EcosystemAuthService.login({ email, password,req });
    return apiResponse.sendSuccess(res, result, "Login successful.");
  }),

  logout: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const refreshToken = req.cookies?.refreshToken;
    await EcosystemAuthService.logout(userId, refreshToken);
    res.clearCookie("accessToken", { httpOnly: true, secure: true, sameSite: "none", path: "/" });
    res.clearCookie("refreshToken", { httpOnly: true, secure: true, sameSite: "none", path: "/" });
    return apiResponse.sendSuccess(res, null, "Logged out successfully.");
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
      } = await EcosystemAuthService.refreshTokens(refreshToken, req);
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

  forgotPassword: asyncHandler(async (req, res) => {
    const { email } = req.body;
    const result = await EcosystemAuthService.forgotPassword({ email });
    return apiResponse.sendSuccess(res, result, "Password reset OTP sent.");
  }),
  verifyForgotOtp: asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    const result = await EcosystemAuthService.verifyForgotOtp({ email, otp });

    return apiResponse.sendSuccess(res, result, "OTP verified successfully.");
  }),

  resetPassword: asyncHandler(async (req, res) => {
    const { resetToken, newPassword } = req.body;

    const result = await EcosystemAuthService.resetPassword({
      resetToken,
      newPassword,
    });

    return apiResponse.sendSuccess(res, result, "Password reset successfully.");
  }),

  checkUsername: asyncHandler(async (req, res) => {
    const { username } = req.body;

    const result = await EcosystemAuthService.checkUsername({ username });

    return apiResponse.sendSuccess(
      res,
      result,
      result.available ? "Username is available" : "Username is already taken",
    );
  }),

  updateUsername: asyncHandler(async (req, res) => {
    const { username } = req.body;
    const userId = req.user.id;

    const result = await EcosystemAuthService.updateUsername({
      userId,
      username,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Username updated successfully.",
    );
  }),

  createPrimaryRole: asyncHandler(async (req, res) => {
    const { role } = req.body;
    const userId = req.user.id;

    const result = await EcosystemAuthService.createPrimaryRole({
      userId,
      role,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Primary role created successfully.",
    );
  }),
  updateRoles: asyncHandler(async (req, res) => {
    const { roles } = req.body;
    const userId = req.user.id;

    const result = await EcosystemAuthService.updateRoles({
      userId,
      roles,
    });

    return apiResponse.sendSuccess(res, result, "Roles updated successfully.");
  }),

  // Granular Role Management
  getRoles: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await EcosystemAuthService.getRoles(userId);
    return apiResponse.sendSuccess(res, result, "Roles fetched successfully.");
  }),

  addRole: asyncHandler(async (req, res) => {
    const { roleType } = req.body; // Expecting { roleType: "INVESTOR" }
    const userId = req.user.id;
    const result = await EcosystemAuthService.addRole({ userId, roleType });
    return apiResponse.sendSuccess(res, result, "Role added successfully.");
  }),

  removeRole: asyncHandler(async (req, res) => {
    const { roleType } = req.params;
    const userId = req.user.id;
    const result = await EcosystemAuthService.removeRole({ userId, roleType });
    return apiResponse.sendSuccess(res, result, "Role removed successfully.");
  }),

  googleAuth: asyncHandler(async (req, res) => {
    const { idToken } = req.body;
    const result = await EcosystemAuthService.googleAuth({ idToken });
    setAuthCookies(res, result);
    return apiResponse.sendSuccess(res, result, "Google authentication successful.");
  }),

  facebookAuth: asyncHandler(async (req, res) => {
    const { accessToken } = req.body;
    const result = await EcosystemAuthService.facebookAuth({ accessToken });
    setAuthCookies(res, result);
    return apiResponse.sendSuccess(res, result, "Facebook authentication successful.");
  }),

  appleAuth: asyncHandler(async (req, res) => {
    const { identityToken, user } = req.body;
    const result = await EcosystemAuthService.appleAuth({ identityToken, user });
    setAuthCookies(res, result);
    return apiResponse.sendSuccess(res, result, "Apple authentication successful.");
  }),

  getLinkedAccounts: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await EcosystemAuthService.getLinkedAccounts(userId);
    return apiResponse.sendSuccess(res, result, "Linked accounts fetched successfully.");
  }),

  linkAccount: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { provider } = req.params;
    const { token, user } = req.body;
    const result = await EcosystemAuthService.linkAccount({
      userId,
      provider,
      token,
      userData: user,
    });
    return apiResponse.sendSuccess(res, result, "Account linked successfully.");
  }),

  unlinkAccount: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { provider } = req.params;
    const result = await EcosystemAuthService.unlinkAccount({ userId, provider });
    return apiResponse.sendSuccess(res, result, "Account unlinked successfully.");
  }),
};
