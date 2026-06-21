import db from "../../../db/db.js";

export const DashboardService = {
  getDashboardMetrics: async (tenantId) => {
    const now = new Date();
    const [activePrograms, totalStartups,pendingApplications,activeMentors,upcomingEvents] = await Promise.all([
      
      
      db.program.count({
        where: {
          tenantId,
          batches: {
            some: {
              isActive: true,
            },
          },
        },
    }),

    
    db.startupTenantAssociation.count({
        where: { tenantId }
      }),

   
    db.startupApplication.count({
        where: {
            tenantId,
            NOT: {
              status: {
                in: ["REJECTED", "ONBOARDED"],
              },
            },
          },
      }),

   
    db.mentorProfile.count({
        where: {
          isAccepting: true,
          incubatorAssociations: {
            some: {
              tenantId: tenantId,
            },
          },
        },
      }),
     
      db.event.count({
        where: {
          startDate: {
            gte: now,
          },
          isArchived: false,
          status: "PUBLISHED",
        },
      }),
    ]);

    return {
      activePrograms,
      totalStartups,
      pendingApplications,
      activeMentors,
      upcomingEvents
    };
  },

  getApplicationsOverTime: async (tenantId) => {
    const raw = await db.$queryRaw`
      SELECT 
        EXTRACT(MONTH FROM "createdAt")::int as month,
        COUNT(*)::int as applications,
        COUNT(*) FILTER (WHERE status = 'ONBOARDED')::int as accepted
      FROM "StartupApplication"
      WHERE "tenantId" = ${tenantId}
        AND EXTRACT(YEAR FROM "createdAt") = EXTRACT(YEAR FROM NOW())
      GROUP BY EXTRACT(MONTH FROM "createdAt")
      ORDER BY month;
    `;
  
    const result = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      applications: 0,
      accepted: 0,
    }));
  
    raw.forEach((row) => {
      const m = row.month;
      result[m - 1] = {
        month: m,
        applications: row.applications,
        accepted: row.accepted,
      };
    });
  
    return result;
  },

  getStartupsByStage: async (tenantId) => {
    const raw = await db.startupTenantAssociation.groupBy({
      by: ["status"],
      where: {
        tenantId,
      },
      _count: {
        status: true,
      },
    });

    // ensure all statuses are present
    const allStatuses = [
      "ONBOARDED",
      "ACTIVE",
      "SUSPENDED",
      "OFFBOARDED",
      "GRADUATED",
      "EXITED",
    ];

    const data = allStatuses.map((status) => {
      const found = raw.find((r) => r.status === status);
      return {
        status,
        count: found?._count?.status || 0,
      };
    });

    const total = data.reduce((sum, r) => sum + r.count, 0);

    return {
      total,
      data,
    };
  },
}