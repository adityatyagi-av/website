import { startOfDay } from "date-fns";
import { PAGE_TYPE_ALLOWED_FIELDS } from "../../../../types/roles.js";
import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import {
  isProvided,
  pickDefinedFields,
  recordEntityVisit,
} from "../../../utils/helperFunctions.js";
import { buildQueryOptions } from "../../../utils/queryHelper.js";
import { tenantService } from "../../incubation/portal/tenant.service.js";

export const EcosystemPageService = {
  createPage: async (payload) => {
    const {
      creatorId,
      name,
      slug,
      type,

      // common optional
      tagline,
      description,
      logo,
      coverImage,
      headquarters,
      foundedYear,
      teamSize,
      sector,
      website,
      linkedin,
      twitter,
      email,
      phone,

      // startup
      stage,
      mission,
      vision,
      elevatorPitch,
      targetMarket,

      // company
      revenueRange,
      keyServices,

      // vc firm
      checkSizeMin,
      checkSizeMax,
      investmentStages,
      focusSectors,
      fundVintage,
      portfolioCount,
      notableInvestments,
      investmentThesis,
      aum,

      // institution
      institutionType,
      studentCount,
      facultyCount,
      accreditations,
      researchAreas,

      // organization / others
      membershipSize,
      keyInitiatives,
      othersCategory,
    } = payload;

    if (!creatorId) throw new ApiError(401, "Unauthorized");
    if (!name || !slug || !type) {
      throw new ApiError(400, "name, slug and type are required");
    }

    if (type === "OTHERS" && !othersCategory) {
      throw new ApiError(400, "othersCategory is required for OTHERS type");
    }

    const ALL_TYPE_FIELDS = Object.values(PAGE_TYPE_ALLOWED_FIELDS).flat();

    const allowedFieldsForType = PAGE_TYPE_ALLOWED_FIELDS[type] || [];

    const invalidFields = ALL_TYPE_FIELDS.filter((field) => {
      return (
        isProvided(payload[field]) && !allowedFieldsForType.includes(field)
      );
    });

    if (invalidFields.length > 0) {
      throw new ApiError(
        400,
        `Invalid fields for page type ${type}: ${invalidFields.join(", ")}`,
      );
    }

    const pageData = pickDefinedFields({
      creatorId,
      name: name.trim(),
      slug: slug.toLowerCase(),
      type,

      tagline,
      description,
      logo,
      coverImage,
      headquarters,
      foundedYear,
      teamSize,
      sector,
      website,
      linkedin,
      twitter,
      email,
      phone,

      stage,
      mission,
      vision,
      elevatorPitch,
      targetMarket,

      revenueRange,
      keyServices,

      checkSizeMin,
      checkSizeMax,
      investmentStages,
      focusSectors,
      fundVintage,
      portfolioCount,
      notableInvestments,
      investmentThesis,
      aum,

      institutionType,
      studentCount,
      facultyCount,
      accreditations,
      researchAreas,

      membershipSize,
      keyInitiatives,
      othersCategory,
    });

    return db.$transaction(async (tx) => {
      const page = await tx.page.create({ data: pageData });

      await tx.pageMember.create({
        data: {
          pageId: page.id,
          userId: creatorId,
          role: "OWNER",
        },
      });

      let startup = null;

      if (type === "STARTUP") {
        startup = await tx.startup.create({
          data: {
            name: name.trim(),
            logoUrl:logo,
            pageId: page.id,
            stage: stage ?? null,
            sector: sector ?? null,
            foundedYear: foundedYear ?? null,
            headquarters: headquarters ?? null,
            contactEmail: email || 'N/A',
          },
        });

        await tx.userRole.upsert({
          where: {
            userId_roleType: {
              userId: creatorId,
              roleType: "FOUNDER",
            },
          },
          update: {},
          create: {
            userId: creatorId,
            roleType: "FOUNDER",
            isPrimary: false,
            isPublic: true,
            isVerified: false,
          },
        });

        await tx.startupMember.create({
          data: {
            startupId: startup.id,
            userId: creatorId,
            role: "OWNER",
            isAdmin: true,
          },
        });
      }

      return { page, startup };
    });
  },

  updatePage: async ({ pageId, userId, payload }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!pageId) throw new ApiError(400, "Page id is required");

    const page = await db.page.findUnique({
      where: { id: pageId },
      select: {
        id: true,
        type: true,
        email: true,
      },
    });

    if (!page) throw new ApiError(404, "Page not found");

    const membership = await db.pageMember.findFirst({
      where: {
        pageId,
        userId,
        role: { in: ["OWNER", "ADMIN"] },
      },
    });

    if (!membership) {
      throw new ApiError(403, "You do not have permission to update this page");
    }

    const type = page.type;

    if (isProvided(payload.type)) {
      throw new ApiError(400, "Page type cannot be changed");
    }

    if (type === "OTHERS" && !payload.othersCategory && isProvided(payload)) {
      throw new ApiError(400, "othersCategory is required for OTHERS type");
    }

    const ALL_TYPE_FIELDS = Object.values(PAGE_TYPE_ALLOWED_FIELDS).flat();
    const allowedFields = PAGE_TYPE_ALLOWED_FIELDS[type] || [];

    const invalidFields = ALL_TYPE_FIELDS.filter(
      (field) => isProvided(payload[field]) && !allowedFields.includes(field),
    );

    if (invalidFields.length > 0) {
      throw new ApiError(
        400,
        `Invalid fields for page type ${type}: ${invalidFields.join(", ")}`,
      );
    }
    const pageUpdateData = pickDefinedFields({
      name: payload.name?.trim(),
      tagline: payload.tagline,
      description: payload.description,
      logo: payload.logo,
      coverImage: payload.coverImage,
      headquarters: payload.headquarters,
      foundedYear: payload.foundedYear,
      teamSize: payload.teamSize,
      sector: payload.sector,
      website: payload.website,
      linkedin: payload.linkedin,
      twitter: payload.twitter,
      email: payload.email,
      phone: payload.phone,

      // startup
      stage: payload.stage,
      mission: payload.mission,
      vision: payload.vision,
      elevatorPitch: payload.elevatorPitch,
      targetMarket: payload.targetMarket,

      // company
      revenueRange: payload.revenueRange,
      keyServices: payload.keyServices,

      // vc firm
      checkSizeMin: payload.checkSizeMin,
      checkSizeMax: payload.checkSizeMax,
      investmentStages: payload.investmentStages,
      focusSectors: payload.focusSectors,
      fundVintage: payload.fundVintage,
      portfolioCount: payload.portfolioCount,
      notableInvestments: payload.notableInvestments,
      investmentThesis: payload.investmentThesis,
      aum: payload.aum,

      // institution
      institutionType: payload.institutionType,
      studentCount: payload.studentCount,
      facultyCount: payload.facultyCount,
      accreditations: payload.accreditations,
      researchAreas: payload.researchAreas,

      // org / others
      membershipSize: payload.membershipSize,
      keyInitiatives: payload.keyInitiatives,
      othersCategory: payload.othersCategory,
    });

    if (Object.keys(pageUpdateData).length === 0) {
      throw new ApiError(400, "No fields provided to update");
    }

    return db.$transaction(async (tx) => {
      const updatedPage = await tx.page.update({
        where: { id: pageId },
        data: pageUpdateData,
      });

      if (type === "STARTUP") {
        await tx.startup.update({
          where: { pageId },
          data: pickDefinedFields({
            stage: payload.stage,
            sector: payload.sector,
            foundedYear: payload.foundedYear,
            headquarters: payload.headquarters,
            contactEmail: payload.email ?? page.email,
          }),
        });
      }

      return updatedPage;
    });
  },

  getUserPages: async (userId) => {
    return db.pageMember.findMany({
      where: { userId },
      select: {
        role: true,
        page: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            logo: true,
            createdAt: true,
            startup: true,
          },
        },
      },
      orderBy: {
        page: { createdAt: "desc" },
      },
    });
  },

  getPageById: async ({ pageId, userId }) => {
    if (!pageId) throw new ApiError(400, "Page id is required");

    const page = await db.page.findFirst({
      where: {
        OR: [
          { id: pageId },
          { slug: pageId },
        ],
      },
      include: {
        members: {
          select: {
            role: true,
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                email: true,
                profilePhoto: true,
              },
            },
          },
        },
        _count: {
          select: {
            followers: true,
            posts: true,
            jobs: true,
          },
        },
      },
    });

    if (!page) throw new ApiError(404, "Page not found");

    if (page.visibility === "PRIVATE") {
      const isMember = await db.pageMember.findFirst({
        where: { pageId: page.id, userId },
      });

      if (!isMember) {
        throw new ApiError(403, "This page is private");
      }
    }

    const myMembership = await db.pageMember.findFirst({
      where: { pageId: page.id, userId },
      select: { role: true },
    });

    return {
      ...page,
      myRole: myMembership?.role || null,
    };
  },
  inviteMember: async ({ pageId, inviterId, userId, role }) => {
    if (!inviterId) throw new ApiError(401, "Unauthorized");
    if (!pageId) throw new ApiError(400, "Page id is required");
    if (!userId) throw new ApiError(400, "User id is required");
    if (!role) throw new ApiError(400, "Role is required");
    const page = await db.page.findUnique({
      where: { id: pageId },
      include: {
        startup: true,
      },
    });

    if (!page) throw new ApiError(404, "Page not found");
    const pageMember = await db.pageMember.findFirst({
      where: { pageId, userId: inviterId },
    });

    if (!pageMember || !["OWNER", "ADMIN"].includes(pageMember.role)) {
      throw new ApiError(403, "Not allowed to invite members");
    }

    const alreadyPageMember = await db.pageMember.findUnique({
      where: {
        pageId_userId: { pageId, userId },
      },
    });

    if (alreadyPageMember) {
      throw new ApiError(400, "User already a page member");
    }
    const validPageRoles = ["OWNER", "ADMIN", "EDITOR", "MODERATOR", "ANALYST"];
    if (!validPageRoles.includes(role)) {
      throw new ApiError(400, `Invalid page role: ${role}`);
    }
    const mapPageRoleToStartupRole = (pageRole) => {
      const roleMap = {
        OWNER: "OWNER",
        ADMIN: "ADMIN",
        EDITOR: "MEMBER",
        MODERATOR: "MEMBER",
        ANALYST: "OTHER",
      };
      return roleMap[pageRole] || "MEMBER";
    };

    return db.$transaction(async (tx) => {
      const newPageMember = await tx.pageMember.create({
        data: {
          pageId,
          userId,
          role: role || "EDITOR",
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              email: true,
              profilePhoto: true,
            },
          },
        },
      });

      let startupMember = null;

      if (page.startup) {
        const alreadyStartupMember = await tx.startupMember.findUnique({
          where: {
            startupId_userId: {
              startupId: page.startup.id,
              userId,
            },
          },
        });

        if (!alreadyStartupMember) {
          const startupRole = mapPageRoleToStartupRole(role);
          const isAdmin = ["OWNER", "ADMIN"].includes(role);

          startupMember = await tx.startupMember.create({
            data: {
              startupId: page.startup.id,
              userId,
              role: startupRole,
              isAdmin,
              isActive: true,
            },
          });
        }
      }

      return {
        pageMember: newPageMember,
        startupMember,
        message: page.startup
          ? "User added as page member and startup member"
          : "User added as page member",
      };
    });
  },

  changeMemberRole: async ({ pageId, requesterId, memberId, role }) => {
    const requester = await db.pageMember.findFirst({
      where: { pageId, userId: requesterId },
    });

    if (!requester || requester.role !== "OWNER") {
      throw new ApiError(403, "Only owner can change roles");
    }

    const member = await db.pageMember.findUnique({
      where: { pageId_userId: { pageId, userId: memberId } },
    });

    if (!member) throw new ApiError(404, "Member not found");

    if (member.role === "OWNER") {
      throw new ApiError(400, "Owner role cannot be changed");
    }

    return db.pageMember.update({
      where: { pageId_userId: { pageId, userId: memberId } },
      data: { role },
    });
  },

  removeMember: async ({ pageId, requesterId, memberId }) => {
    if (!requesterId) throw new ApiError(401, "Unauthorized");
    if (!pageId) throw new ApiError(400, "Page id is required");
    if (!memberId) throw new ApiError(400, "Member id is required");

    const page = await db.page.findUnique({
      where: { id: pageId },
      include: {
        startup: true,
      },
    });

    if (!page) throw new ApiError(404, "Page not found");

    const requester = await db.pageMember.findFirst({
      where: { pageId, userId: requesterId },
    });

    const member = await db.pageMember.findUnique({
      where: { pageId_userId: { pageId, userId: memberId } },
    });

    if (!requester || !member) {
      throw new ApiError(404, "Member not found");
    }

    if (member.role === "OWNER") {
      throw new ApiError(400, "Owner cannot be removed");
    }

    if (
      requester.role !== "OWNER" &&
      !(requester.role === "ADMIN" && member.role !== "ADMIN")
    ) {
      throw new ApiError(403, "Not allowed to remove this member");
    }

    return db.$transaction(async (tx) => {
      const deletedPageMember = await tx.pageMember.delete({
        where: { pageId_userId: { pageId, userId: memberId } },
      });

      let deletedStartupMember = null;
      if (page.startup) {
        const startupMember = await tx.startupMember.findUnique({
          where: {
            startupId_userId: {
              startupId: page.startup.id,
              userId: memberId,
            },
          },
        });

        if (startupMember && startupMember.role !== "OWNER") {
          deletedStartupMember = await tx.startupMember.delete({
            where: {
              startupId_userId: {
                startupId: page.startup.id,
                userId: memberId,
              },
            },
          });
        }
      }

      return {
        pageMember: deletedPageMember,
        startupMember: deletedStartupMember,
        message: page.startup
          ? "Member removed from page and startup"
          : "Member removed from page",
      };
    });
  },

  searchUsersToInvite: async ({
    pageId,
    userId,
    search,
    page = 1,
    limit = 10,
  }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!pageId) throw new ApiError(400, "Page id is required");

    const pageMember = await db.pageMember.findFirst({
      where: {
        pageId,
        userId,
        role: { in: ["OWNER", "ADMIN"] },
      },
    });

    if (!pageMember) {
      throw new ApiError(403, "Not allowed to search users for this page");
    }
    const existingMembers = await db.pageMember.findMany({
      where: { pageId },
      select: { userId: true },
    });

    const existingMemberIds = existingMembers.map((m) => m.userId);
    const {
      skip,
      take,
      where: searchWhere,
    } = buildQueryOptions({
      page,
      limit,
      search,
      searchFields: ["firstName", "lastName", "username"],
      defaultFields: ["firstName", "lastName", "username"],
    });

    const baseWhere = {
      AND: [
        { isActive: true },
        { id: { notIn: existingMemberIds } },
        ...(searchWhere.OR ? [{ OR: searchWhere.OR }] : []),
      ],
    };
    const connections = await db.user.findMany({
      where: {
        ...baseWhere,
        OR: [
          {
            connectionsSent: {
              some: {
                receiverId: userId,
                status: "ACCEPTED",
              },
            },
          },
          {
            connectionsReceived: {
              some: {
                senderId: userId,
                status: "ACCEPTED",
              },
            },
          },
        ],
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        profilePhoto: true,
        headline: true,
      },
      skip,
      take,
      orderBy: {
        firstName: "asc",
      },
    });
    const followers = await db.user.findMany({
      where: {
        ...baseWhere,
        OR: [
          {
            followers: {
              some: {
                followingId: userId,
              },
            },
          },
          {
            following: {
              some: {
                followerId: userId,
              },
            },
          },
        ],
        id: { notIn: [...existingMemberIds, ...connections.map((c) => c.id)] },
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        profilePhoto: true,
        headline: true,
      },
      skip: Math.max(0, skip - connections.length),
      take: Math.max(0, take - connections.length),
      orderBy: {
        firstName: "asc",
      },
    });
    const thirdDegreeConnections = await db.user.findMany({
      where: {
        ...baseWhere,
        OR: [
          {
            connectionsSent: {
              some: {
                receiver: {
                  OR: [
                    {
                      connectionsSent: {
                        some: {
                          receiverId: userId,
                          status: "ACCEPTED",
                        },
                      },
                    },
                    {
                      connectionsReceived: {
                        some: {
                          senderId: userId,
                          status: "ACCEPTED",
                        },
                      },
                    },
                  ],
                },
                status: "ACCEPTED",
              },
            },
          },
          {
            connectionsReceived: {
              some: {
                sender: {
                  OR: [
                    {
                      connectionsSent: {
                        some: {
                          receiverId: userId,
                          status: "ACCEPTED",
                        },
                      },
                    },
                    {
                      connectionsReceived: {
                        some: {
                          senderId: userId,
                          status: "ACCEPTED",
                        },
                      },
                    },
                  ],
                },
                status: "ACCEPTED",
              },
            },
          },
        ],
        id: {
          notIn: [
            ...existingMemberIds,
            ...connections.map((c) => c.id),
            ...followers.map((f) => f.id),
          ],
        },
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        profilePhoto: true,
        headline: true,
      },
      skip: Math.max(0, skip - connections.length - followers.length),
      take: Math.max(0, take - connections.length - followers.length),
      orderBy: {
        firstName: "asc",
      },
    });

    const others = await db.user.findMany({
      where: {
        ...baseWhere,
        id: {
          notIn: [
            ...existingMemberIds,
            ...connections.map((c) => c.id),
            ...followers.map((f) => f.id),
            ...thirdDegreeConnections.map((t) => t.id),
          ],
        },
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        profilePhoto: true,
        headline: true,
      },
      skip: Math.max(
        0,
        skip -
          connections.length -
          followers.length -
          thirdDegreeConnections.length,
      ),
      take: Math.max(
        0,
        take -
          connections.length -
          followers.length -
          thirdDegreeConnections.length,
      ),
      orderBy: {
        firstName: "asc",
      },
    });
    const results = [
      ...connections.map((user) => ({ ...user, connectionType: "connection" })),
      ...followers.map((user) => ({ ...user, connectionType: "follower" })),
      ...thirdDegreeConnections.map((user) => ({
        ...user,
        connectionType: "third_degree",
      })),
      ...others.map((user) => ({ ...user, connectionType: "other" })),
    ];
    const totalCount = await db.user.count({
      where: {
        ...baseWhere,
      },
    });

    return {
      users: results.slice(0, take),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  },
  updateVisibility: async ({ pageId, userId, visibility }) => {
    const member = await db.pageMember.findFirst({
      where: { pageId, userId },
    });

    if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
      throw new ApiError(403, "Not allowed to update visibility");
    }

    return db.page.update({
      where: { id: pageId },
      data: { visibility },
    });
  },
  getPageAnalytics: async (pageId) => {
    const [followers, jobs, posts] = await Promise.all([
      db.pageFollower.count({ where: { pageId } }),
      db.job.count({ where: { pageId } }),
      db.post.count({ where: { pageId } }),
    ]);

    return {
      followers,
      jobs,
      posts,
    };
  },
  getPageBySlug: async ({ slug, viewerId, ipAddress, userAgent }) => {
    if (!slug) {
      throw new ApiError(400, "slug is required");
    }

    const page = await db.page.findUnique({
      where: { slug },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
        followers: viewerId ? {where: {
              userId: viewerId,
            },
            select: {
              pageId: true,
            },
            take: 1,}: false,
        _count: {
          select: {
            followers: true,
            jobs: true,
            posts: true,
          },
        },
      },
    });

    if (!page || !page.isActive) {
      throw new ApiError(404, "Page not found");
    }

    let isFollowing = false;
    if (viewerId) {
      const follow = await db.pageFollower.findUnique({
        where: {
          pageId_userId: {
            pageId: page.id,
            userId: viewerId,
          },
        },
        select: {
          pageId: true,
        },
      });
      isFollowing = !!follow;
    }

    await recordEntityVisit({
      entityType: "PAGE",
      entityId: page.id,
      viewerId,
      ipAddress,
      userAgent,
    });

    const result = {
      ...page,
      analytics: {
        followers: page._count.followers,
        jobs: page._count.jobs,
        posts: page._count.posts,
      },
      isFollowing: viewerId ? page.followers.length > 0 : false,
    };

    // If page is INCUBATION type, attach tenant profile + computed metrics
    if (page.type === "INCUBATION") {
      const tenant = await db.tenant.findUnique({
        where: { pageId: page.id },
        include: {
          profile: true,
        },
      });

      if (tenant) {
        const computedMetrics = await tenantService.computeTenantMetrics(tenant.id);

        result.incubationData = {
          // Tenant core fields
          id: tenant.id,
          organizationName: tenant.organizationName,
          tenantKey: tenant.tenantKey,
          domain: tenant.domain,
          status: tenant.status,
          tenantLogo: tenant.tenantLogo,
          planId: tenant.planId,
          pageId: tenant.pageId,
          tenantCreatedAt: tenant.createdAt,
          tenantUpdatedAt: tenant.updatedAt,

          // TenantProfile — all 73 fields (null if profile not created yet)
          profile: tenant.profile
            ? {
                id: tenant.profile.id,
                tenantId: tenant.profile.tenantId,

                // Identity & Branding
                bannerColor: tenant.profile.bannerColor,

                // Contact & Location
                address: tenant.profile.address,
                city: tenant.profile.city,
                state: tenant.profile.state,
                country: tenant.profile.country,
                pincode: tenant.profile.pincode,
                latitude: tenant.profile.latitude,
                longitude: tenant.profile.longitude,
                timezone: tenant.profile.timezone,

                // Social Links
                facebook: tenant.profile.facebook,
                instagram: tenant.profile.instagram,
                youtube: tenant.profile.youtube,

                // Incubation Classification
                incubationType: tenant.profile.incubationType,
                focusStages: tenant.profile.focusStages,
                AffiliationType: tenant.profile.affiliationType,
                parentOrganization: tenant.profile.parentOrganization,
                registrationNumber: tenant.profile.registrationNumber,
                incorporationType: tenant.profile.incorporationType,

                // Infrastructure & Capacity
                totalAreaSqFt: tenant.profile.totalAreaSqFt,
                seatingCapacity: tenant.profile.seatingCapacity,
                labsAvailable: tenant.profile.labsAvailable,
                labDetails: tenant.profile.labDetails,
                coworkingAvailable: tenant.profile.coworkingAvailable,
                meetingRooms: tenant.profile.meetingRooms,
                eventSpaceCapacity: tenant.profile.eventSpaceCapacity,
                amenities: tenant.profile.amenities,
                virtualIncubationAvailable: tenant.profile.virtualIncubationAvailable,

                // Program & Operations
                isAcceptingApplications: tenant.profile.isAcceptingApplications,
                applicationProcess: tenant.profile.applicationProcess,
                typicalProgramDuration: tenant.profile.typicalProgramDuration,
                maxStartupsPerBatch: tenant.profile.maxStartupsPerBatch,
                selectionCriteria: tenant.profile.selectionCriteria,
                equityRequired: tenant.profile.equityRequired,
                equityRangeMin: tenant.profile.equityRangeMin,
                equityRangeMax: tenant.profile.equityRangeMax,
                stipendAvailable: tenant.profile.stipendAvailable,
                stipendAmount: tenant.profile.stipendAmount,
                stipendCurrency: tenant.profile.stipendCurrency,
                servicesOffered: tenant.profile.servicesOffered,
                supportType: tenant.profile.supportType,

                // Funding & Financial
                fundingCurrency: tenant.profile.fundingCurrency,
                fundingSources: tenant.profile.fundingSources,
                averageFundingPerStartup: tenant.profile.averageFundingPerStartup,
                hasSeedFunding: tenant.profile.hasSeedFunding,
                hasFollowOnFunding: tenant.profile.hasFollowOnFunding,

                // Network & Partnerships
                industryPartners: tenant.profile.industryPartners,
                investorPartners: tenant.profile.investorPartners,
                academicPartners: tenant.profile.academicPartners,
                governmentPartners: tenant.profile.governmentPartners,
                corporatePartners: tenant.profile.corporatePartners,
                internationalPartnerships: tenant.profile.internationalPartnerships,
                networkMemberships: tenant.profile.networkMemberships,

                // Impact & Metrics (manually maintained)
                successfulExits: tenant.profile.successfulExits,
                totalJobsCreated: tenant.profile.totalJobsCreated,
                totalRevenueGenerated: tenant.profile.totalRevenueGenerated,
                totalIPsFiled: tenant.profile.totalIPsFiled,
                successRate: tenant.profile.successRate,
                averageGraduationTime: tenant.profile.averageGraduationTime,
                startupsWithFunding: tenant.profile.startupsWithFunding,
                totalExternalFundingRaised: tenant.profile.totalExternalFundingRaised,

                // Recognition & Credibility
                certifications: tenant.profile.certifications,
                awards: tenant.profile.awards,
                rankings: tenant.profile.rankings,
                mediaFeatures: tenant.profile.mediaFeatures,
                isGovernmentRecognized: tenant.profile.isGovernmentRecognized,
                governmentRecognitionId: tenant.profile.governmentRecognitionId,
                isVerified: tenant.profile.isVerified,
                verifiedAt: tenant.profile.verifiedAt,

                // Preferences & Settings
                defaultCurrency: tenant.profile.defaultCurrency,
                defaultLanguage: tenant.profile.defaultLanguage,
                operatingHours: tenant.profile.operatingHours,
                holidayCalendar: tenant.profile.holidayCalendar,
                autoApproveApplications: tenant.profile.autoApproveApplications,
                requireNDA: tenant.profile.requireNDA,
                ndaTemplateUrl: tenant.profile.ndaTemplateUrl,
                brandPrimaryColor: tenant.profile.brandPrimaryColor,
                brandSecondaryColor: tenant.profile.brandSecondaryColor,

                // Content & Media
                gallery: tenant.profile.gallery,
                introVideoUrl: tenant.profile.introVideoUrl,
                testimonials: tenant.profile.testimonials,
                successStories: tenant.profile.successStories,
                faqContent: tenant.profile.faqContent,

                createdAt: tenant.profile.createdAt,
                updatedAt: tenant.profile.updatedAt,
              }
            : null,

          // Real-time computed metrics
          computedMetrics,
        };
      }
    }

    return result;
  },
  getMyPageVisitors: async ({ pageId, userId, page = 1, limit = 10 }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!pageId) throw new ApiError(400, "pageId is required");
    const member = await db.pageMember.findFirst({
      where: {
        pageId,
        userId,
        role: { in: ["OWNER", "ADMIN"] },
      },
      select: { id: true },
    });

    if (!member) {
      throw new ApiError(403, "You are not authorized to view page visitors");
    }

    const { skip, take, orderBy } = buildQueryOptions({
      page,
      limit,
      sortBy: "visitedAt",
      order: "desc",
    });

    const visits = await db.entityVisit.findMany({
      where: {
        entityType: "PAGE",
        entityId: pageId,
      },
      skip,
      take,
      orderBy,
      include: {
        viewer: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
            headline: true,
          },
        },
      },
    });

    return visits.map((visit) => ({
      visitedAt: visit.visitedAt,
      viewer: visit.viewer
        ? {
            id: visit.viewer.id,
            username: visit.viewer.username,
            firstName: visit.viewer.firstName,
            lastName: visit.viewer.lastName,
            profilePhoto: visit.viewer.profilePhoto,
            headline: visit.viewer.headline,
          }
        : null,
      isAnonymous: !visit.viewerId,
    }));
  },
  getPageInsights: async ({ pageId, userId }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");

    const member = await db.pageMember.findFirst({
      where: {
        pageId,
        userId,
        role: { in: ["OWNER", "ADMIN"] },
      },
    });

    if (!member) {
      throw new ApiError(403, "Not authorized to view analytics");
    }

    const today = startOfDay(new Date());
    const last30Days = new Date(today);
    last30Days.setDate(today.getDate() - 30);

    const [totalVisits, todayVisits, uniqueVisitors, dailyTrend] =
      await Promise.all([
        db.entityVisit.count({
          where: { entityType: "PAGE", entityId: pageId },
        }),

        db.entityVisit.count({
          where: {
            entityType: "PAGE",
            entityId: pageId,
            visitDate: today,
          },
        }),
        db.entityVisit.groupBy({
          by: ["viewerId", "ipAddress"],
          where: {
            entityType: "PAGE",
            entityId: pageId,
            visitedAt: { gte: last30Days },
          },
        }),

        db.entityVisit.groupBy({
          by: ["visitDate"],
          where: {
            entityType: "PAGE",
            entityId: pageId,
            visitedAt: { gte: last30Days },
          },
          _count: { id: true },
          orderBy: { visitDate: "asc" },
        }),
      ]);

    return {
      totals: {
        totalVisits,
        todayVisits,
        uniqueLast30Days: uniqueVisitors.length,
      },
      trend: dailyTrend.map((d) => ({
        date: d.visitDate,
        visits: d._count.id,
      })),
    };
  },
  myStartups: async ({ userId }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");

    const userStartups = await db.startup.findMany({
      where: {
        members: {
          some: {
            userId: userId,
            isActive: true,
          },
        },
      },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        description: true,
        website: true,
        sector: true,
        stage: true,
        headquarters: true,
        foundedYear: true,
        contactEmail: true,
        page:true,
        tenantAssociations: true,
        programAssociations: true,
      },
    });
    return { userStartups };
  },
  getStartupTeamMembers: async ({ startupId, userId }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!startupId) throw new ApiError(400, "Startup id is required");

    const userMembership = await db.startupMember.findFirst({
      where: {
        startupId,
        userId,
        isActive: true,
      },
    });

    if (!userMembership) {
      throw new ApiError(403, "You are not a member of this startup");
    }

    const teamMembers = await db.startupMember.findMany({
      where: {
        startupId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePhoto: true,
            headline: true,
          },
        },
      },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    });

    return teamMembers;
  },

  getPageTeamMembers: async ({ pageId, userId }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!pageId) throw new ApiError(400, "Page id is required");
  
    const page = await db.page.findUnique({
      where: { id: pageId },
      select: {
        id: true,
        name: true,
        type: true,
      },
    });
  
    if (!page) {
      throw new ApiError(404, "Page not found");
    }
  
    const membership = await db.pageMember.findUnique({
      where: {
        pageId_userId: {
          pageId,
          userId,
        },
      },
    });
  
    if (!membership) {
      throw new ApiError(403, "You are not a member of this page");
    }
  
    const members = await db.pageMember.findMany({
      where: {
        pageId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
            profilePhoto: true,
            headline: true,
          },
        },
      },
      orderBy: [
        { role: "asc" },
        { createdAt: "asc" },
      ],
    });
  
    return {
      page: {
        id: page.id,
        name: page.name,
        type: page.type,
      },
      members,
    };
  },

  deletePage: async ({ pageId, userId }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!pageId) throw new ApiError(400, "Page id is required");

    const page = await db.page.findUnique({
      where: { id: pageId },
      include: { startup: true },
    });

    if (!page) throw new ApiError(404, "Page not found");

    const membership = await db.pageMember.findFirst({
      where: { pageId, userId, role: "OWNER" },
    });

    if (!membership) {
      throw new ApiError(403, "Only the owner can delete a page");
    }

    return db.$transaction(async (tx) => {
      await tx.pageMember.deleteMany({ where: { pageId } });
      await tx.pageFollower.deleteMany({ where: { pageId } });

      if (page.startup) {
        await tx.startupMember.deleteMany({ where: { startupId: page.startup.id } });
        await tx.startup.delete({ where: { id: page.startup.id } });
      }

      await tx.page.delete({ where: { id: pageId } });

      return { message: "Page deleted successfully" };
    });
  },

  leavePage: async ({ pageId, userId }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!pageId) throw new ApiError(400, "Page id is required");

    const membership = await db.pageMember.findUnique({
      where: { pageId_userId: { pageId, userId } },
    });

    if (!membership) {
      throw new ApiError(404, "You are not a member of this page");
    }

    if (membership.role === "OWNER") {
      throw new ApiError(400, "Owner cannot leave the page. Transfer ownership first.");
    }

    const page = await db.page.findUnique({
      where: { id: pageId },
      include: { startup: true },
    });

    return db.$transaction(async (tx) => {
      await tx.pageMember.delete({
        where: { pageId_userId: { pageId, userId } },
      });

      if (page?.startup) {
        const startupMember = await tx.startupMember.findUnique({
          where: { startupId_userId: { startupId: page.startup.id, userId } },
        });

        if (startupMember && startupMember.role !== "OWNER") {
          await tx.startupMember.delete({
            where: { startupId_userId: { startupId: page.startup.id, userId } },
          });
        }
      }

      return { message: "You have left the page" };
    });
  },

  followPage: async ({ pageId, userId }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!pageId) throw new ApiError(400, "Page id is required");

    const page = await db.page.findUnique({
      where: { id: pageId },
      select: { id: true },
    });
    if (!page) throw new ApiError(404, "Page not found");

    const existing = await db.pageFollower.findUnique({
      where: { pageId_userId: { pageId, userId } },
    });
    if (existing) throw new ApiError(409, "Already following this page");

    return db.pageFollower.create({
      data: { pageId, userId },
    });
  },

  unfollowPage: async ({ pageId, userId }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!pageId) throw new ApiError(400, "Page id is required");

    const existing = await db.pageFollower.findUnique({
      where: { pageId_userId: { pageId, userId } },
    });
    if (!existing) throw new ApiError(404, "Not following this page");

    await db.pageFollower.delete({
      where: { pageId_userId: { pageId, userId } },
    });

    return { message: "Unfollowed successfully" };
  },

  getMyPagePosts: async ({ pageId, userId, query = {} }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!pageId) throw new ApiError(400, "Page id is required");

    const membership = await db.pageMember.findUnique({
      where: { pageId_userId: { pageId, userId } },
    });
    if (!membership) throw new ApiError(403, "You are not a member of this page");

    const { skip, take, where: searchWhere, orderBy } = buildQueryOptions({
      page: query.page,
      limit: query.limit,
      search: query.search,
      searchFields: ["content"],
      sortBy: query.sortBy || "createdAt",
      order: query.order || "desc",
    });

    const where = {
      pageId,
      isArchived: false,
      ...(searchWhere || {}),
    };

    const [posts, total] = await Promise.all([
      db.post.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
              headline: true,
            },
          },
          media: {
            select: { id: true, url: true, mediaType: true },
            orderBy: { createdAt: "asc" },
          },
          page: {
            select: { id: true, name: true, slug: true, logo: true, type: true },
          },
          poll: {
            include: {
              options: {
                include: {
                  _count: { select: { votes: true } },
                  votes: { where: { voterId: userId }, select: { id: true } },
                },
                orderBy: { order: "asc" },
              },
            },
          },
          hashtags: {
            include: { hashtag: { select: { id: true, name: true } } },
            take: 5,
          },
          mentions: {
            include: {
              user: {
                select: { id: true, username: true, firstName: true, lastName: true, profilePhoto: true },
              },
            },
          },
        },
      }),
      db.post.count({ where }),
    ]);

    const postsWithContext = await Promise.all(
      posts.map(async (post) => {
        const [hasLiked, hasBookmarked] = await Promise.all([
          db.like.findFirst({
            where: {
              postId: post.id,
              userId,
            },
          }),
        
          db.bookmark.findUnique({
            where: {
              postId_userId: {
                postId: post.id,
                userId,
              },
            },
          }),
        ]);

        const canEdit = ["OWNER", "ADMIN", "EDITOR"].includes(membership.role);

        return {
          ...post,
          viewerContext: {
            hasLiked: !!hasLiked,
            hasBookmarked: !!hasBookmarked,
            canEdit: canEdit || post.authorId === userId,
            canDelete: canEdit || post.authorId === userId,
          },
        };
      }),
    );

    return {
      data: postsWithContext,
      pagination: {
        total,
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 10,
        totalPages: Math.ceil(total / take),
      },
    };
  },

  getPagePosts: async ({ pageId, viewerId, query = {} }) => {
    if (!pageId) throw new ApiError(400, "Page id is required");

    const page = await db.page.findUnique({
      where: { id: pageId },
      select: { id: true, visibility: true, isActive: true },
    });
    if (!page || !page.isActive) throw new ApiError(404, "Page not found");

    if (page.visibility === "PRIVATE") {
      if (!viewerId) throw new ApiError(403, "This page is private");

      const isMember = await db.pageMember.findUnique({
        where: { pageId_userId: { pageId, userId: viewerId } },
      });
      const isFollower = await db.pageFollower.findUnique({
        where: { pageId_userId: { pageId, userId: viewerId } },
      });
      if (!isMember && !isFollower) {
        throw new ApiError(403, "This page is private. Follow or join to see posts.");
      }
    }

    const { skip, take, orderBy } = buildQueryOptions({
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy || "createdAt",
      order: query.order || "desc",
    });

    const where = {
      pageId,
      isArchived: false,
      visibility: "PUBLIC",
    };

    if (viewerId) {
      const membership = await db.pageMember.findUnique({
        where: { pageId_userId: { pageId, userId: viewerId } },
      });
      if (membership) {
        delete where.visibility;
      }
    }

    const [posts, total] = await Promise.all([
      db.post.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              profilePhoto: true,
              headline: true,
            },
          },
          media: {
            select: { id: true, url: true, mediaType: true },
            orderBy: { createdAt: "asc" },
          },
          page: {
            select: { id: true, name: true, slug: true, logo: true, type: true },
          },
          poll: {
            include: {
              options: {
                include: {
                  _count: { select: { votes: true } },
                  votes: viewerId
                    ? { where: { voterId: viewerId }, select: { id: true } }
                    : false,
                },
                orderBy: { order: "asc" },
              },
            },
          },
          hashtags: {
            include: { hashtag: { select: { id: true, name: true } } },
            take: 5,
          },
        },
      }),
      db.post.count({ where }),
    ]);

    let postsWithContext;

    if (viewerId) {
      postsWithContext = await Promise.all(
        posts.map(async (post) => {
          const [hasLiked, hasBookmarked] = await Promise.all([
            db.like.findFirst({
              where: {
                postId: post.id,
                userId: viewerId,
              },
            }),
            db.bookmark.findFirst({
              where: {
                postId: post.id,
                userId: viewerId,
              },
            })
          ]);

          return {
            ...post,
            viewerContext: {
              hasLiked: !!hasLiked,
              hasBookmarked: !!hasBookmarked,
              canEdit: false,
              canDelete: false,
            },
          };
        }),
      );
    } else {
      postsWithContext = posts;
    }

    return {
      data: postsWithContext,
      pagination: {
        total,
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 10,
        totalPages: Math.ceil(total / take),
      },
    };
  },
};
