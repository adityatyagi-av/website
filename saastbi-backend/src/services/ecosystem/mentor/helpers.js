import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";

export const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  profilePhoto: true,
};

export const USER_BRIEF_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  profilePhoto: true,
  username: true
};

export const verifyStartupAccess = async (userId, startupId) => {
  const startup = await db.startup.findFirst({
    where: {
      id: startupId,
      members: { some: { userId, isActive: true } },
    },
    include: {
      tenantAssociations: {
        where: { isActive: true },
        include: {
          tenant: { select: { id: true, organizationName: true } },
        },
        take: 1,
      },
    },
  });

  if (!startup) {
    throw new ApiError(403, "You don't have access to this startup");
  }

  return startup;
};

export const buildPagination = (page, limit, total) => ({
  page: parseInt(page),
  limit: parseInt(limit),
  total,
  totalPages: Math.ceil(total / parseInt(limit)),
});
