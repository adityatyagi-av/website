import { ApiError } from "../../../utils/ApiError.js";
import db from "../../../db/db.js";

export const announcementTargetService = {
  async addTargets(announcementId, targets) {
    if (!Array.isArray(targets) || targets.length === 0) return [];

    const validTargets = targets.filter(
      (t) => t.targetType && t.targetId && !t.isExcluded
    );

    if (validTargets.length === 0) return [];

    const data = validTargets.map((target) => ({
      announcementId,
      targetType: target.targetType,
      targetId: target.targetId,
      isExcluded: false,
    }));

    await db.announcementTarget.createMany({
      data,
      skipDuplicates: true,
    });

    return db.announcementTarget.findMany({
      where: { announcementId },
    });
  },

  async removeTargets(announcementId, targetIds) {
    if (!Array.isArray(targetIds) || targetIds.length === 0) return;

    await db.announcementTarget.deleteMany({
      where: {
        announcementId,
        id: { in: targetIds },
      },
    });
  },

  async addExclusions(announcementId, exclusions) {
    if (!Array.isArray(exclusions) || exclusions.length === 0) return [];

    const data = exclusions.map((exc) => ({
      announcementId,
      targetType: exc.targetType,
      targetId: exc.targetId,
      isExcluded: true,
    }));

    await db.announcementTarget.createMany({
      data,
      skipDuplicates: true,
    });

    return db.announcementTarget.findMany({
      where: { announcementId, isExcluded: true },
    });
  },

  async removeExclusion(announcementId, exclusionId) {
    await db.announcementTarget.delete({
      where: {
        id: exclusionId,
        announcementId,
        isExcluded: true,
      },
    });
  },

  async getTargets(announcementId) {
    return db.announcementTarget.findMany({
      where: { announcementId },
      orderBy: { createdAt: "desc" },
    });
  },

  async resolveTargetEmails(announcement, tenantId) {
    const { scope, programId, targets } = announcement;
    const emails = new Set();
    const excludedEmails = new Set();

    const exclusions = targets?.filter((t) => t.isExcluded) || [];
    for (const exc of exclusions) {
      const excEmails = await this.getEmailsForTarget(exc.targetType, exc.targetId, tenantId);
      excEmails.forEach((e) => excludedEmails.add(e));
    }

    const inclusions = targets?.filter((t) => !t.isExcluded) || [];
    if (inclusions.length > 0) {
      for (const target of inclusions) {
        const targetEmails = await this.getEmailsForTarget(target.targetType, target.targetId, tenantId);
        targetEmails.forEach((e) => emails.add(e));
      }
    } else {
      const scopeEmails = await this.getEmailsByScope(scope, programId, tenantId);
      scopeEmails.forEach((e) => emails.add(e));
    }

    excludedEmails.forEach((e) => emails.delete(e));
    return Array.from(emails);
  },

  async getEmailsForTarget(targetType, targetId, tenantId) {
    const emails = [];

    switch (targetType) {
      case "PROGRAM": {
        const program = await db.program.findUnique({
          where: { id: targetId },
          include: {
            startupAssociations: {
              include: { startup: { select: { contactEmail: true } } },
            },
          },
        });
        if (program) {
          program.startupAssociations.forEach((assoc) => {
            if (assoc.startup?.contactEmail) emails.push(assoc.startup.contactEmail);
          });
        }
        break;
      }

      case "STARTUP": {
        const startup = await db.startup.findUnique({
          where: { id: targetId },
          select: { contactEmail: true },
        });
        if (startup?.contactEmail) emails.push(startup.contactEmail);
        break;
      }

      case "MENTOR": {
        const mentorAssoc = await db.incubatorMentorAssociation.findUnique({
          where: { id: targetId },
          include: {
            mentorProfile: {
              include: { user: { select: { email: true } } },
            },
          },
        });
        if (mentorAssoc?.mentorProfile?.user?.email) {
          emails.push(mentorAssoc.mentorProfile.user.email);
        }
        break;
      }

      case "INCUBATION_USER": {
        const user = await db.incubationUser.findUnique({
          where: { id: targetId },
          select: { email: true },
        });
        if (user?.email) emails.push(user.email);
        break;
      }

      case "USER": {
        const user = await db.user.findUnique({
          where: { id: targetId },
          select: { email: true },
        });
        if (user?.email) emails.push(user.email);
        break;
      }

      case "ROLE": {
        const membershipsWithRole = await db.incubationUserTenant.findMany({
          where: { roleId: targetId, tenantId, isActive: true },
          include: { incubationUser: { select: { email: true } } },
        });
        membershipsWithRole.forEach((m) => {
          if (m.incubationUser?.email) emails.push(m.incubationUser.email);
        });
        break;
      }
    }

    return emails;
  },

  async getEmailsByScope(scope, programId, tenantId) {
    const emails = [];

    switch (scope) {
      case "TENANT_WIDE": {
        const [startups, memberships] = await Promise.all([
          db.startupTenantAssociation.findMany({
            where: { tenantId },
            include: { startup: { select: { contactEmail: true } } },
          }),
          db.incubationUserTenant.findMany({
            where: { tenantId, isActive: true },
            include: { incubationUser: { select: { email: true } } },
          }),
        ]);
        startups.forEach((s) => {
          if (s.startup?.contactEmail) emails.push(s.startup.contactEmail);
        });
        memberships.forEach((m) => {
          if (m.incubationUser?.email) emails.push(m.incubationUser.email);
        });
        break;
      }

      case "PROGRAM_SPECIFIC": {
        if (!programId) break;
        const startups = await db.startupProgramAssociation.findMany({
          where: { programId },
          include: { startup: { select: { contactEmail: true } } },
        });
        startups.forEach((s) => {
          if (s.startup?.contactEmail) emails.push(s.startup.contactEmail);
        });
        break;
      }

      case "STARTUP_SPECIFIC": {
        const startups = await db.startupTenantAssociation.findMany({
          where: { tenantId },
          include: { startup: { select: { contactEmail: true } } },
        });
        startups.forEach((s) => {
          if (s.startup?.contactEmail) emails.push(s.startup.contactEmail);
        });
        break;
      }

      case "MENTOR_SPECIFIC": {
        const mentors = await db.incubatorMentorAssociation.findMany({
          where: { incubatorId: tenantId },
          include: {
            mentorProfile: {
              include: { user: { select: { email: true } } },
            },
          },
        });
        mentors.forEach((m) => {
          if (m.mentorProfile?.user?.email) emails.push(m.mentorProfile.user.email);
        });
        break;
      }

      case "CUSTOM":
        break;
    }

    return emails;
  },

  async getTargetDetails(targets) {
    const details = await Promise.all(
      targets.map(async (target) => {
        const info = await this.getTargetInfo(target.targetType, target.targetId);
        return { ...target, info };
      })
    );
    return details;
  },

  async getTargetInfo(targetType, targetId) {
    switch (targetType) {
      case "PROGRAM": {
        const program = await db.program.findUnique({
          where: { id: targetId },
          select: { id: true, title: true },
        });
        return program;
      }

      case "STARTUP": {
        const startup = await db.startup.findUnique({
          where: { id: targetId },
          select: { id: true, name: true, contactEmail: true },
        });
        return startup;
      }

      case "MENTOR": {
        const mentor = await db.incubatorMentorAssociation.findUnique({
          where: { id: targetId },
          include: {
            mentorProfile: {
              include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
            },
          },
        });
        if (mentor?.mentorProfile?.user) {
          return {
            id: mentor.id,
            name: `${mentor.mentorProfile.user.firstName} ${mentor.mentorProfile.user.lastName}`,
            email: mentor.mentorProfile.user.email,
          };
        }
        return null;
      }

      case "INCUBATION_USER": {
        const user = await db.incubationUser.findUnique({
          where: { id: targetId },
          select: { id: true, name: true, email: true },
        });
        return user;
      }

      case "USER": {
        const user = await db.user.findUnique({
          where: { id: targetId },
          select: { id: true, firstName: true, lastName: true, email: true },
        });
        if (user) {
          return { id: user.id, name: `${user.firstName} ${user.lastName}`, email: user.email };
        }
        return null;
      }

      case "ROLE": {
        const role = await db.role.findUnique({
          where: { id: targetId },
          select: { id: true, roleName: true },
        });
        return role;
      }

      default:
        return null;
    }
  },
};
