import { EcosystemSettingService } from "../../../services/ecosystem/setting/setting.service.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";

export const EcosystemSettingController = {
  changePassword: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    const result = await EcosystemSettingService.changePassword({
      userId,
      currentPassword,
      newPassword,
    });
    return apiResponse.sendSuccess(
      res,
      result,
      "Password changed  successfully."
    );
  }),

  updateAppearInSearch: asyncHandler(async (req, res) => {

    const userId = req.user.id;
  
    const { appearInSearch } = req.body;
  
    if (typeof appearInSearch !== "boolean") {
      throw new ApiError(
        400,
        "appearInSearch must be boolean"
      );
    }
  
    const result = await EcosystemSettingService.updateAppearInSearch({
        userId,
        appearInSearch,
      });
  
    return apiResponse.sendSuccess(
      res,
      result,
      "Search visibility updated successfully"
    );
  }),

  connectionRequest: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { allowConnectionRequest } = req.body;

    if (typeof allowConnectionRequest !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "allowConnectionRequest must be a boolean",
      });
    }

    const result = await EcosystemSettingService.connectionRequest({
      userId,
      allowConnectionRequest,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Allow Connection request updated"
    );
  }),

  messagePermission: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { allowMessagesFrom } = req.body;

    const allowedValues = ["EVERYONE", "CONNECTIONS", "NO_ONE"];

    if (!allowedValues.includes(allowMessagesFrom)) {
      return res.status(400).json({
        success: false,
        message:
          "allowMessagesFrom must be one of EVERYONE, CONNECTIONS, NO_ONE",
      });
    }

    const result = await EcosystemSettingService.messagePermission({
      userId,
      allowMessagesFrom,
    });

    return apiResponse.sendSuccess(res, result, "Who can message you updated");
  }),

  showOnlineStatus: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { showOnlineStatus } = req.body;

    if (typeof showOnlineStatus !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "showOnlineStatus must be a boolean",
      });
    }

    const result = await EcosystemSettingService.showOnlineStatus({
      userId,
      showOnlineStatus,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Online status visibility updated"
    );
  }),

  showLastSeen: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { showLastSeen } = req.body;
  
    if (typeof showLastSeen !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "showLastSeen must be a boolean",
      });
    }
  
    const result = await EcosystemSettingService.showLastSeen({
      userId,
      showLastSeen,
    });
  
    return apiResponse.sendSuccess(
      res,
      result,
      "Last seen visibility updated"
    );
  }),

  loginNotifications: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { loginNotifications } = req.body;

    if (typeof loginNotifications !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "loginNotifications must be a boolean",
      });
    }

    const result = await EcosystemSettingService.loginNotifications({
      userId,
      loginNotifications,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Login notification preference updated"
    );
  }),

  profileVisibility: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { profileVisibility } = req.body;

    const allowedValues = ["PUBLIC", "CONNECTIONS_ONLY", "PRIVATE"];

    if (!allowedValues.includes(profileVisibility)) {
      return res.status(400).json({
        success: false,
        message:
          "profileVisibility must be one of PUBLIC, CONNECTIONS_ONLY, PRIVATE",
      });
    }

    const result = await EcosystemSettingService.profileVisibility({
      userId,
      profileVisibility,
    });

    return apiResponse.sendSuccess(res, result, "Profile visibility updated");
  }),

  getContactInfo: asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await EcosystemSettingService.getContactInfo(userId);
    return apiResponse.sendSuccess(
      res,
      result,
      "User contact information fetched successfully"
    );
  }),

  updateContactInfo: asyncHandler(async (req, res) => {
    const userId = req.user.id;
  
    const { email, phone } = req.body;
  
    const result = await EcosystemSettingService.updateContactInfo({
      userId,
      email,
      phone,
    });
  
    return apiResponse.sendSuccess(
      res,
      result,
      "Contact information updated successfully"
    );
  }),

  deleteAccount: asyncHandler(async (req, res) => {
    const result = await EcosystemSettingService.deleteAccount({
      userId: req.user.id,
    });

  return apiResponse.sendSuccess(
    res,
    result,
    "Account deleted successfully"
  );
  }),

  getSessions: asyncHandler(async (req, res) => {
    const result = await EcosystemSettingService.getSessions(req.user.id);
  
    return apiResponse.sendSuccess(
      res,
      result,
      "Sessions fetched successfully"
    );
  }),

  logoutSession: asyncHandler(async (req, res) => {

    const { sessionId } = req.params;
  
    const result =
      await EcosystemSettingService.logoutSession({
        userId: req.user.id,
        sessionId,
      });
  
    return apiResponse.sendSuccess(
      res,
      result,
      "Session logged out successfully"
    );
  }),

  
  logoutAllOtherSessions: asyncHandler(async (req, res) => {

    const currentToken =
      req.headers.authorization?.split(" ")[1];
  
    const result =
      await EcosystemSettingService.logoutAllOtherSessions({
        userId: req.user.id,
        currentToken,
      });
  
    return apiResponse.sendSuccess(
      res,
      result,
      "All other sessions logged out successfully"
    );
  }),
};
