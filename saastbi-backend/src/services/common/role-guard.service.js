import db from "../../db/db.js";

export const ensureUserHasRole = async (userId, roleType) => {
  const role = await db.userRole.findFirst({
    where: { userId, roleType },
    select: { id: true },
  });

  if (!role) {
    throw new ApiError(403, `User does not have ${roleType} role`);
  }
};
