import db from "../../db/db.js";

/**
 * Resolve entity details by type and id.
 * Returns a normalized { id, name, avatar, email?, type, linkedPageId? } object.
 */
export async function resolveEntity(entityType, entityId) {
  switch (entityType) {
    case "USER": {
      const user = await db.user.findUnique({
        where: { id: entityId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePhoto: true,
          email: true,
        },
      });
      return user
        ? {
            id: user.id,
            name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
            avatar: user.profilePhoto,
            email: user.email,
            type: "USER",
          }
        : { id: entityId, name: "Deleted User", avatar: null, type: "USER" };
    }

    case "STARTUP": {
      const startup = await db.startup.findUnique({
        where: { id: entityId },
        select: {
          id: true,
          name: true,
          logoUrl: true,
          contactEmail: true,
          pageId: true,
          page: { select: { id: true, name: true, logo: true } },
        },
      });

      if (startup) {
        const displayName = startup.page?.name || startup.name;
        const displayAvatar = startup.page?.logo || startup.logoUrl;
        return {
          id: startup.id,
          name: displayName,
          avatar: displayAvatar,
          email: startup.contactEmail,
          type: "STARTUP",
          linkedPageId: startup.pageId,
        };
      }

      const tenant = await db.tenant.findFirst({
        where: { OR: [{ id: entityId }, { tenantKey: entityId }] },
        select: { id: true, organizationName: true, tenantLogo: true },
      });

      if (tenant) {
        db.conversation
          .updateMany({
            where: { participant1Id: entityId, participant1Type: "STARTUP" },
            data: { participant1Type: "TENANT" },
          })
          .catch(() => {});
        db.conversation
          .updateMany({
            where: { participant2Id: entityId, participant2Type: "STARTUP" },
            data: { participant2Type: "TENANT" },
          })
          .catch(() => {});

        return {
          id: tenant.id,
          name: tenant.organizationName,
          avatar: tenant.tenantLogo,
          type: "TENANT",
        };
      }

      return { id: entityId, name: "Deleted Startup", avatar: null, type: "STARTUP" };
    }

    case "PAGE": {
      const page = await db.page.findUnique({
        where: { id: entityId },
        select: {
          id: true,
          name: true,
          logo: true,
          type: true,
          email: true,
        },
      });
      return page
        ? {
            id: page.id,
            name: page.name,
            avatar: page.logo,
            email: page.email,
            pageType: page.type,
            type: "PAGE",
          }
        : { id: entityId, name: "Deleted Page", avatar: null, type: "PAGE" };
    }

    case "TENANT": {
      const tenant = await db.tenant.findFirst({
        where: { OR: [{ id: entityId }, { tenantKey: entityId }] },
        select: {
          id: true,
          organizationName: true,
          tenantLogo: true,
          pageId: true,
          page: { select: { id: true, name: true, logo: true } },
        },
      });
      if (tenant) {
        const displayName = tenant.page?.name || tenant.organizationName;
        const displayAvatar = tenant.page?.logo || tenant.tenantLogo;
        return {
          id: tenant.id,
          name: displayName,
          avatar: displayAvatar,
          type: "TENANT",
          linkedPageId: tenant.pageId,
        };
      }
      return { id: entityId, name: "Deleted Tenant", avatar: null, type: "TENANT" };
    }

    case "INCUBATION_USER": {
      const incUser = await db.incubationUser.findUnique({
        where: { id: entityId },
        select: { id: true, name: true, email: true, imageUrl: true, userId: true },
      });
      if (incUser) {
        let avatar = incUser.imageUrl;
        if (!avatar && incUser.userId) {
          const user = await db.user.findUnique({
            where: { id: incUser.userId },
            select: { profilePhoto: true },
          });
          avatar = user?.profilePhoto || null;
        }
        return {
          id: incUser.id,
          name: incUser.name,
          avatar,
          email: incUser.email,
          type: "INCUBATION_USER",
        };
      }
      return { id: entityId, name: "Deleted User", avatar: null, type: "INCUBATION_USER" };
    }

    default:
      return { id: entityId, name: "Unknown", avatar: null, type: entityType };
  }
}
