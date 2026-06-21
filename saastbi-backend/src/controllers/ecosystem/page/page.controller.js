import { EcosystemPageService } from "../../../services/ecosystem/page/page.service.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { apiResponse } from "../../../utils/responseUtils.js";

export const EcosystemPageController = {
  createPage: asyncHandler(async (req, res) => {
    const payload = {
      ...req.body,
      creatorId: req.user.id,
    };

    const result = await EcosystemPageService.createPage(payload);

    return apiResponse.sendSuccess(res, result, "Page created successfully");
  }),
  updatePage: asyncHandler(async (req, res) => {
    const { pageId } = req.params;

    const result = await EcosystemPageService.updatePage({
      pageId,
      userId: req.user.id,
      payload: req.body,
    });

    return apiResponse.sendSuccess(res, result, "Page updated successfully");
  }),

  getMyPages: asyncHandler(async (req, res) => {
    const result = await EcosystemPageService.getUserPages(req.user.id);

    return apiResponse.sendSuccess(
      res,
      result,
      "User pages fetched successfully"
    );
  }),

  getPageById: asyncHandler(async (req, res) => {
    const { pageId } = req.params;
    const userId = req.user.id;

    const result = await EcosystemPageService.getPageById({
      pageId,
      userId,
    });

    return apiResponse.sendSuccess(res, result, "Page fetched successfully");
  }),

  inviteMember: asyncHandler(async (req, res) => {
    const { pageId } = req.params;
    const { userId, role } = req.body;

    const result = await EcosystemPageService.inviteMember({
      pageId,
      inviterId: req.user.id,
      userId,
      role,
    });

    return apiResponse.sendSuccess(res, result, "Member invited successfully");
  }),

  changeMemberRole: asyncHandler(async (req, res) => {
    const { pageId, userId } = req.params;
    const { role } = req.body;

    const result = await EcosystemPageService.changeMemberRole({
      pageId,
      requesterId: req.user.id,
      memberId: userId,
      role,
    });

    return apiResponse.sendSuccess(res, result, "Member role updated");
  }),
  removeMember: asyncHandler(async (req, res) => {
    const { pageId, userId } = req.params;

    const result = await EcosystemPageService.removeMember({
      pageId,
      requesterId: req.user.id,
      memberId: userId,
    });

    return apiResponse.sendSuccess(res, result, "Member removed successfully");
  }),
  searchUsersToInvite: asyncHandler(async (req, res) => {
    const { pageId } = req.params;
    const { search, page, limit } = req.query;

    const result = await EcosystemPageService.searchUsersToInvite({
      pageId,
      userId: req.user.id,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Users fetched successfully"
    );
  }),
  updateVisibility: asyncHandler(async (req, res) => {
    const { pageId } = req.params;
    const { visibility } = req.body;

    const result = await EcosystemPageService.updateVisibility({
      pageId,
      userId: req.user.id,
      visibility,
    });

    return apiResponse.sendSuccess(res, result, "Page visibility updated");
  }),
  getAnalytics: asyncHandler(async (req, res) => {
    const { pageId } = req.params;

    const result = await EcosystemPageService.getPageAnalytics(pageId);

    return apiResponse.sendSuccess(res, result, "Page analytics fetched");
  }),
  getPageBySlug: asyncHandler(async (req, res) => {
    const { slug } = req.params;

    const viewerId = req.user?.id ?? null;
    const ipAddress =
      req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;

    const userAgent = req.headers["user-agent"];

    const page = await EcosystemPageService.getPageBySlug({
      slug,
      viewerId,
      ipAddress,
      userAgent,
    });

    return apiResponse.sendSuccess(res, page, "Page fetched successfully");
  }),
   getMyPageVisitors: asyncHandler(async (req, res) => {
    const { pageId } = req.params;
    const { page, limit } = req.query;

    const result = await EcosystemPageService.getMyPageVisitors({
      pageId,
      userId: req.user.id,
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    });

    return apiResponse.sendSuccess(
      res,
      result,
      "Page visitors fetched successfully"
    );
  }),
  getPageInsights: asyncHandler(async (req, res) => {
  const { pageId } = req.params;

  const result = await EcosystemPageService.getPageInsights({
    pageId,
    userId: req.user.id,
  });

  return apiResponse.sendSuccess(
    res,
    result,
    "Page analytics fetched successfully"
  );
}), 
myStartups: asyncHandler(async (req, res) => {

  const result = await EcosystemPageService.myStartups({
    
    userId: req.user.id,
  });

  return apiResponse.sendSuccess(
    res,
    result,
    "User Startups fetched successfully"
  );
}),

getStartupTeamMembers: asyncHandler(async (req, res) => {
  const { startupId } = req.params;

  const result = await EcosystemPageService.getStartupTeamMembers({
    startupId,
    userId: req.user.id,
  });

  return apiResponse.sendSuccess(
    res,
    result,
    "Startup team members fetched successfully"
  );
}),

getPageTeamMembers: asyncHandler(async (req, res) => {
  const { pageId } = req.params;

  const result = await EcosystemPageService.getPageTeamMembers({
    pageId,
    userId: req.user.id,
  });

  return apiResponse.sendSuccess(
    res,
    result,
    "Startup team members fetched successfully"
  );
}),

deletePage: asyncHandler(async (req, res) => {
  const { pageId } = req.params;

  const result = await EcosystemPageService.deletePage({
    pageId,
    userId: req.user.id,
  });

  return apiResponse.sendDeleted(res, result, "Page deleted successfully");
}),

leavePage: asyncHandler(async (req, res) => {
  const { pageId } = req.params;

  const result = await EcosystemPageService.leavePage({
    pageId,
    userId: req.user.id,
  });

  return apiResponse.sendSuccess(res, result, "Left page successfully");
}),

followPage: asyncHandler(async (req, res) => {
  const { pageId } = req.params;

  const result = await EcosystemPageService.followPage({
    pageId,
    userId: req.user.id,
  });

  return apiResponse.sendSuccess(res, result, "Page followed successfully");
}),

unfollowPage: asyncHandler(async (req, res) => {
  const { pageId } = req.params;

  const result = await EcosystemPageService.unfollowPage({
    pageId,
    userId: req.user.id,
  });

  return apiResponse.sendSuccess(res, result, "Page unfollowed successfully");
}),

getMyPagePosts: asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  const userId = req.user.id;

  const result = await EcosystemPageService.getMyPagePosts({
    pageId,
    userId,
    query: req.query,
  });

  return apiResponse.sendSuccess(res, result, "Page posts fetched successfully");
}),

getPagePosts: asyncHandler(async (req, res) => {
  const { pageId } = req.params;
  const viewerId = req.user?.id || null;

  const result = await EcosystemPageService.getPagePosts({
    pageId,
    viewerId,
    query: req.query,
  });

  return apiResponse.sendSuccess(res, result, "Page posts fetched successfully");
}),

};
