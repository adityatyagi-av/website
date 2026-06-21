import db from "../../../db/db.js";

export const EventAudienceResolver = {
  resolvePublishedEventAudience: async (event) => {
    const recipientIds = new Set();

    const fullEvent = await db.event.findUnique({
      where: { id: event.id },
      include: {
        page: {
          include: {
            followers: {
              select: {
                userId: true,
              },
            },
            startup: {
              select: {
                id: true,
              },
            },
            tenant: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!fullEvent) return [];


    console.log(
      "FULL EVENT:",
      JSON.stringify(fullEvent, null, 2)
    );
    
    console.log(
      "PAGE:",
      fullEvent.page
    );
    
    console.log(
      "PAGE TYPE:",
      fullEvent.page?.type
    );
    
    console.log(
      "PAGE TENANT:",
      fullEvent.page?.tenant
    );
    
    console.log(
      "PAGE STARTUP:",
      fullEvent.page?.startup
    );
    
    console.log(
      "AUTHOR ID:",
      fullEvent.authorId
    );

    if (!fullEvent.pageId) {
      console.log("PERSONAL EVENT");
    
      const connections = await db.connection.findMany({
        where: {
          status: "ACCEPTED",
          OR: [
            { senderId: fullEvent.authorId },
            { receiverId: fullEvent.authorId },
          ],
        },
        select: {
          senderId: true,
          receiverId: true,
        },
      });
      console.log("Connections:", connections);
      connections.forEach((connection) => {
        if (connection.senderId !== fullEvent.authorId) {
          recipientIds.add(connection.senderId);
        }
        if (connection.receiverId !== fullEvent.authorId) {
          recipientIds.add(connection.receiverId);
        }
      });
    }

   // startup page event
    if (fullEvent.page?.type === "STARTUP") {
      console.log("INSIDE STARTUP PAGE BLOCK");
      if (fullEvent.page.startup?.id) {
        const startupMembers = await db.startupMember.findMany({
          where: {
            startupId: fullEvent.page.startup.id,
            isActive: true,
          },
          select: {
            userId: true,
          },
        });

        startupMembers.forEach((m) =>
          recipientIds.add(m.userId)
        );
      }

      fullEvent.page.followers.forEach((f) =>
        recipientIds.add(f.userId)
      );
    }

   // incubation page event

    else if (fullEvent.page?.type === "INCUBATION") {
      console.log("INSIDE INCUBATION PAGE BLOCK");
      if (fullEvent.page.tenant?.id) {
        // Active startup associations
        const startupAssociations =
          await db.startupTenantAssociation.findMany({
            where: {
              tenantId: fullEvent.page.tenant.id,
              isActive: true,
            },
            select: {
              startupId: true,
            },
          });

        const startupIds = startupAssociations.map(
          (s) => s.startupId
        );

        // Startup members
        if (startupIds.length > 0) {
          const startupMembers =
            await db.startupMember.findMany({
              where: {
                startupId: {
                  in: startupIds,
                },
                isActive: true,
              },
              select: {
                userId: true,
              },
            });

          startupMembers.forEach((m) =>
            recipientIds.add(m.userId)
          );
        }

        // Incubation users
        const incubationUsers =
          await db.incubationUserTenant.findMany({
            where: {
              tenantId: fullEvent.page.tenant.id,
              isActive: true,
            },
            include: {
              incubationUser: {
                select: {
                  userId: true,
                },
              },
            },
          });

        incubationUsers.forEach((u) => {
          if (u.incubationUser?.userId) {
            recipientIds.add(u.incubationUser.userId);
          }
        });
      }

      // Page followers
      fullEvent.page.followers.forEach((f) =>
        recipientIds.add(f.userId)
      );
    }

    //other pages
    else if (fullEvent.page) {
      console.log("INSIDE GENERIC PAGE BLOCK");
      fullEvent.page.followers.forEach((f) =>
        recipientIds.add(f.userId)
      );
    }

    recipientIds.delete(fullEvent.authorId);
    console.log(
      "FINAL RECIPIENT IDS:",
      [...recipientIds]
    );

    return [...recipientIds];
  },
};