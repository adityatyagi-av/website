import db from "../../db/db.js";

export const StartupDashboardService = {
  getMetrics: async ({userId,startupId}) => {

    const membership =
    await db.startupMember.findFirst({
      where: {
        userId,
        startupId,
        isActive: true,
      },
    });

    if (!membership) {
      throw new ApiError(
        403,
        "You are not a member of this startup"
      );
    }

    const [
      activePrograms,
      allocatedFacilities,
      tasksDue,
    ] = await Promise.all([

      db.startupProgramAssociation.count({
        where: {
          startupId,
          status: "ACTIVE",
        },
      }),

      db.officeAllocation.count({
        where: {
          startupId,
          isActive: true,
        },
      }),

      db.task.count({
        where: {
          teamType: "STARTUP",
          teamId: startupId,
          status: "PENDING",
          isArchived: false,
        },
      }),

    ]);

    return {
      activePrograms,
      allocatedFacilities,
      tasksDue,
    };
  },
};