import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/responseUtils.js";
import { ChatSearchService } from "../../services/common/chat-search.service.js";
import { resolveUserPermissions } from "../../services/common/access.service.js";
import db from "../../db/db.js";

export const ChatSearchController = {
  /**
   * User search — search for chat-able entities from ecosystem portal.
   * GET /api/ecosystem/chat/search?q=&filter=USER|PAGE|STARTUP|INCUBATION&page=1&limit=20
   */
  searchForUser: asyncHandler(async (req, res) => {
    console.log("SEARCH QUERY IS ",req.query)
    const result = await ChatSearchService.searchForUser(req.user.id, req.query);
    return apiResponse.sendSuccess(res, result);
  }),

  /**
   * Startup search — search for chat-able entities from startup portal.
   * GET /api/startup-portal/chat/search?q=&filter=TENANT|PAGE|STARTUP|MENTOR&page=1&limit=20
   *
   * Requires startupId from the authenticated user's startup membership.
   */
  searchForStartup: asyncHandler(async (req, res) => {
    const { startupId } = req.query;

    if (!startupId) {
      return apiResponse.sendBadRequest(res, "startupId is required");
    }

    // Verify user is a member of this startup
    const membership = await db.startupMember.findUnique({
      where: {
        startupId_userId: {
          startupId,
          userId: req.user.id,
        },
      },
    });

    if (!membership || !membership.isActive) {
      return apiResponse.sendForbidden(res, "Not a member of this startup");
    }

    const result = await ChatSearchService.searchForStartup(
      req.user.id,
      startupId,
      req.query
    );
    return apiResponse.sendSuccess(res, result);
  }),

  /**
   * Tenant search — search for chat-able entities from incubation portal.
   * GET /api/incubation-portal/chat/search?q=&filter=TENANT|PAGE|STARTUP|MENTOR&page=1&limit=20
   *
   * Accessible by any tenant member with CHAT permission.
   */
  searchForTenant: asyncHandler(async (req, res) => {
    const tenantKey = req.headers["tenantkey"];
    if (!tenantKey) {
      return apiResponse.sendBadRequest(res, "tenantKey header is required");
    }

    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) {
      return apiResponse.sendNotFound(res, "Tenant not found");
    }

    const incubationUser = await db.incubationUser.findFirst({
      where: { userId: req.user.id, isActive: true },
    });
    if (!incubationUser) {
      return apiResponse.sendForbidden(res, "Incubation user not found");
    }

    const membership = await db.incubationUserTenant.findUnique({
      where: {
        incubationUserId_tenantId: {
          incubationUserId: incubationUser.id,
          tenantId: tenant.id,
        },
      },
    });

    if (!membership || !membership.isActive) {
      return apiResponse.sendForbidden(res, "Not a member of this tenant");
    }

    if (!membership.isAdmin) {
      const userAccess = await resolveUserPermissions(tenant.id, incubationUser.id);
      const chatActions = userAccess.permissions["CHAT"] || [];
      if (!chatActions.includes("R") && !chatActions.includes("F")) {
        return apiResponse.sendForbidden(res, "Insufficient permission for chat");
      }
    }

    const result = await ChatSearchService.searchForTenant(
      tenant.id,
      req.user.id,
      req.query
    );
    return apiResponse.sendSuccess(res, result);
  }),
};
