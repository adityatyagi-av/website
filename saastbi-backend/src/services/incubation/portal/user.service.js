import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { buildQueryOptions } from "../../../utils/queryHelper.js";
import {
  generateOtp,
  hashPassword,
  isEmailValid,
  verifyOtp,
  verifyPassword,
} from "../../../utils/helperFunctions.js";
import {
  generateTokens,
  createSession,
  validateSession,
  rotateSession,
  revokeSession,
  revokeAllSessions,
} from "../../../utils/token.js";
import { getRedis, setRedis } from "../../../config/redisClient.js";
import jwt from "jsonwebtoken";
import path from "path";
import sendMail from "../../../config/sendMail.js";
import crypto from "crypto";
import {
  findOrCreateEcosystemUser,
  generateUniquePageSlug,
} from "../../../utils/userBridge.js";
async function resolveIncubationUserId(userId) {
  const incUser = await db.incubationUser.findFirst({
    where: { OR: [{ id: userId }, { userId: userId }] },
  });
  if (!incUser) throw new ApiError(404, "Incubation user not found");
  return incUser.id;
}
export const userService = {
  checkTenant: async ({ tenantKey }) => {
    if (!tenantKey) {
      throw new ApiError(
        400,
        "Please enter the tenant key to check whether it is available or not",
      );
    }

    const [tenant, page] = await Promise.all([
      db.tenant.findUnique({
        where: { tenantKey },
      }),
      db.page.findUnique({
        where: { slug: tenantKey },
      }),
    ]);

    if (tenant || page) {
      throw new ApiError(400, "Tenant key already exists or is reserved");
    }

    return true;
  },

  checkEmail: async ({ email }) => {
    if (!email) {
      throw new ApiError(400, "Please enter an email to check availability");
    }

    const incubationUser = await db.incubationUser.findUnique({
      where: {
        email: email.toLowerCase(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        imageUrl: true,
        isActive: true,
        createdAt: true,
      },
    });

    return {
      exists: !!incubationUser,
      user: incubationUser || null,
    };
  },

  getUserByEmail: async (email) => {
    const user = await db.incubationUser.findUnique({
      where: { email },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }
    return user;
  },

  signup: async ({
    adminName,
    email,
    organizationName,
    tenantKey,
    password,
  }) => {
    if (!email || !tenantKey || !adminName || !organizationName || !password) {
      throw new ApiError(400, " Fields are required.");
    }
    if (!isEmailValid(email)) {
      throw new ApiError(400, "Email not valid.");
    }
    const [tenant, page] = await Promise.all([
      db.tenant.findUnique({
        where: { tenantKey },
      }),
      db.page.findUnique({
        where: { slug: tenantKey },
      }),
    ]);

    if (tenant || page) {
      throw new ApiError(400, "Tenant key already exists or is reserved");
    }
    const user = await db.incubationUser.findUnique({
      where: { email },
    });

    if (user) {
      const isPasswordValid = await verifyPassword(user.password, password);
      if (!isPasswordValid) {
        throw new ApiError(
          400,
          "An account with this email already exists. Please use the existing password.",
        );
      }
    }
    // if (user) {
    //   throw new ApiError(400, "Admin already exist in db");
    // }
    const hashedPassword = await hashPassword(password);
    const otp = generateOtp();
    const data = {
      adminName,
      email,
      organizationName,
      tenantKey,
      otp,
      password: hashedPassword,
    };
    setRedis(email, JSON.stringify(data), 3600);
    const templateData = {
      otp,
      adminName,
      organizationName,
      expiryMinutes: 5,
      portalName: "OPERNOVA INCUBATION ERP",
      supportEmail: "business@opernova.com",
    };
    const templatePath = path.resolve("./src/mails/otp-mail.ejs");
    sendMail(
      email,
      "OPERNOVA TECHNOLOGIES LLP - OTP VERIFICATION",
      templatePath,
      templateData,
    );
    return email;
  },

  resendOtp: async ({ email }) => {
    if (!email) {
      throw new ApiError(400, " Email required to resend otp.");
    }
    if (!isEmailValid(email)) {
      throw new ApiError(400, "Email not valid.");
    }
    const user = await db.incubationUser.findUnique({
      where: { email },
    });
    if (user) {
      throw new ApiError(400, "User already exist");
    }
    const userData = await getRedis(email);
    if (!userData) {
      throw new ApiError(400, "User not found");
    }
    const data = JSON.parse(userData);
    const otp = generateOtp();
    data.otp = otp;
    setRedis(email, JSON.stringify(data), 3600);
    const templateData = {
      otp,
      adminName: data.adminName,
      organizationName: data.organizationName,
      expiryMinutes: 5,
      portalName: "OPERNOVA INCUBATION ERP",
      supportEmail: "business@opernova.com",
    };
    const templatePath = path.resolve("./src/mails/otp-mail.ejs");
    sendMail(
      email,
      "OPERNOVA TECHNOLOGIES LLP - OTP VERIFICATION",
      templatePath,
      templateData,
    );
    return email;
  },

  verifySignupOtp: async ({ email, otp }) => {
    if (!email || !otp) {
      throw new ApiError(400, " Email required to resend otp.");
    }
    if (!isEmailValid(email)) {
      throw new ApiError(400, "Email not valid.");
    }
    const userData = await getRedis(email);
    if (!userData) {
      throw new ApiError(400, "User not found");
    }
    const data = JSON.parse(userData);
    const isOtpVerified = verifyOtp(otp, data.otp);
    if (!isOtpVerified.success) {
      throw new ApiError(401, "OTP not verified");
    }
    const result = await db.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          organizationName: data.organizationName,
          tenantKey: data.tenantKey,
        },
      });
      const role = await tx.role.create({
        data: {
          roleName: "Admin",
          tenantId: tenant.id,
        },
      });

      const ecosystemUser = await findOrCreateEcosystemUser({
        email: data.email,
        name: data.adminName,
        passwordHash: data.password,
        tx,
      });

      const slug = await generateUniquePageSlug(data.organizationName, tx);
      const existingSlug = await tx.page.findUnique({
        where: { slug: data.tenantKey },
      });

      if (existingSlug) {
        throw new ApiError(400, "Tenant key already exists or is reserved");
      }
      const page = await tx.page.create({
        data: {
          creatorId: ecosystemUser.id,
          name: data.organizationName,
          slug: data.tenantKey,
          type: "INCUBATION",
          email: data.email,
        },
      });

      await tx.pageMember.create({
        data: {
          pageId: page.id,
          userId: ecosystemUser.id,
          role: "OWNER",
        },
      });

      await tx.tenant.update({
        where: { id: tenant.id },
        data: { pageId: page.id },
      });
      let incubationUser = await tx.incubationUser.findUnique({
        where: { email },
      });
      if (!incubationUser) {
        incubationUser = await tx.incubationUser.create({
          data: {
            name: data.adminName,
            email: data.email,
            password: data.password,
            userId: ecosystemUser.id,
          },
        });
      }

      const membership = await tx.incubationUserTenant.create({
        data: {
          incubationUserId: incubationUser.id,
          tenantId: tenant.id,
          roleId: role.id,
          isAdmin: true,
        },
        include: {
          role: true,
          tenant: { include: { page: true } },
        },
      });

      const user = {
        ...incubationUser,
        isAdmin: membership.isAdmin,
        roleId: membership.roleId,
        tenantId: membership.tenantId,
        role: membership.role,
        tenant: membership.tenant,
      };

      return { tenant, role, user, page, ecosystemUser };
    });
    const { user, ecosystemUser } = result;

    delete user.password;
    const { accessToken, refreshToken } = generateTokens({
      id: ecosystemUser.id,
      email: ecosystemUser.email,
    });
    await createSession(ecosystemUser.id, refreshToken, {});

    const templateData = {
      adminName: data.adminName,
      organizationName: data.organizationName,
      supportEmail: "business@opernova.com",
      portalName: "OPERNOVA INCUBATION ERP",
      loginUrl: "https://erp.opernova.com/login",
    };

    const templatePath = path.resolve("./src/mails/verify-mail.ejs");
    sendMail(
      email,
      "OPERNOVA INCUBATION ERP - Profile Verification",
      templatePath,
      templateData,
    );
    return { accessToken, refreshToken, user };
  },

  getUserById: async (id) => {
    return db.incubationUser.findUnique({
      where: { id },
      include: {
        tenantMemberships: {
          where: { isActive: true },
          include: {
            role: { include: { permissions: true } },
            tenant: true,
          },
        },
      },
    });
  },

  createUserWithRole: async ({
    tenantkey,
    name,
    email,
    password,
    roleId,
    isAdmin = false,
    isPanelMember = false,
    imageUrl,
    isExistingUser,
    programIds,
    assignedById,
  }) => {
    const tenant = await db.tenant.findUnique({
      where: { tenantKey: tenantkey },
    });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const result = await db.$transaction(async (tx) => {
      let incubationUser = await tx.incubationUser.findUnique({
        where: { email },
      });

      let hashedPassword;

      if (isExistingUser) {
        if (!incubationUser) {
          throw new ApiError(404, "Existing user not found with this email");
        }
        hashedPassword = incubationUser.password;
      } else {
        hashedPassword = await hashPassword(password);
      }

      const ecosystemUser = await findOrCreateEcosystemUser({
        email,
        name,
        passwordHash: hashedPassword,
        tx,
      });

      if (incubationUser) {
        const existingMembership = await tx.incubationUserTenant.findUnique({
          where: {
            incubationUserId_tenantId: {
              incubationUserId: incubationUser.id,
              tenantId: tenant.id,
            },
          },
        });
        if (existingMembership) {
          if (programIds?.length > 0) {
            await tx.incubationUserTenant.update({
              where: {
                id: existingMembership.id,
              },
              data: {
                isPanelMember: true,
              },
            });

            for (const programId of programIds) {
              const existingAssignment =
                await tx.programPanelAssignment.findFirst({
                  where: {
                    programId,
                    panelMemberId: incubationUser.id,
                    isActive: true,
                  },
                });

              if (!existingAssignment) {
                await tx.programPanelAssignment.create({
                  data: {
                    programId,
                    panelMemberId: incubationUser.id,
                    assignedById,
                  },
                });
              }
            }

            return {
              ...incubationUser,
              message: "Panel member assigned successfully",
            };
          }

          throw new ApiError(400, "User already exists in this organization");
        }
      } else {
        incubationUser = await tx.incubationUser.create({
          data: {
            name,
            email,
            password: hashedPassword,
            userId: ecosystemUser.id,
            ...(imageUrl && imageUrl.trim() !== "" ? { imageUrl } : {}),
          },
        });
      }

      const membership = await tx.incubationUserTenant.create({
        data: {
          incubationUserId: incubationUser.id,
          tenantId: tenant.id,
          roleId: roleId || null,
          isAdmin,
          isPanelMember: isPanelMember || programIds?.length > 0,
        },
        include: {
          role: { include: { permissions: true } },
        },
      });

      if (programIds.length > 0) {
        for (const programId of programIds) {
          const program = await tx.program.findUnique({
            where: { id: programId },
            select: {
              id: true,
              tenantId: true,
            },
          });

          if (!program) {
            throw new ApiError(404, `Program not found: ${programId}`);
          }

          if (program.tenantId !== tenant.id) {
            throw new ApiError(
              400,
              `Program ${programId} does not belong to this tenant`,
            );
          }

          const existingAssignment = await tx.programPanelAssignment.findFirst({
            where: {
              programId,
              panelMemberId: incubationUser.id,
              isActive: true,
            },
          });

          if (!existingAssignment) {
            await tx.programPanelAssignment.create({
              data: {
                programId,
                panelMemberId: incubationUser.id,
                assignedById,
              },
            });
          }
        }
      }

      return {
        ...incubationUser,
        isAdmin: membership.isAdmin,
        roleId: membership.roleId,
        tenantId: membership.tenantId,
        role: membership.role,
      };
    });

    return result;
  },

  updateProfile: async (userId, data) => {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError(404, "User not found");

    const {
      workingStatus,
      description,
      yearsOfExperience,
      designation,
      company,
      passoutYear,
      branch,
      currentYear,
    } = data;

    if (!workingStatus) {
      throw new ApiError(400, "Working status is required to update profile");
    }
    const updateData = {
      workingStatus,
    };

    updateData.profileStage = "COMPLETED";
    switch (workingStatus) {
      case "STUDENT":
        updateData.passoutYear = passoutYear;
        updateData.branch = branch;
        updateData.currentYear = currentYear;
        updateData.yearsOfExperience = null;
        updateData.designation = null;
        updateData.company = null;
        break;

      case "PROFESSIONAL":
        updateData.yearsOfExperience = yearsOfExperience;
        updateData.designation = designation;
        updateData.company = company;
        updateData.passoutYear = null;
        updateData.branch = null;
        updateData.currentYear = null;
        break;

      case "OTHERS":
        updateData.description = description;
        updateData.passoutYear = null;
        updateData.branch = null;
        updateData.currentYear = null;
        updateData.yearsOfExperience = null;
        updateData.designation = null;
        updateData.company = null;
        break;

      default:
        throw new ApiError(400, "Invalid working status");
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
    });

    return updatedUser;
  },

  getUsers: async ({ tenantKey, page, limit, search, sortBy, order }) => {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");
    const queryOptions = buildQueryOptions({
      page,
      limit,
      search,
      searchFields: ["name", "email"],
      defaultFields: ["name"],
      sortBy,
      order,
    });
    const membershipWhere = {
      tenantId: tenant.id,
      incubationUser: queryOptions.where,
    };

    const [memberships, total] = await Promise.all([
      db.incubationUserTenant.findMany({
        where: membershipWhere,
        skip: queryOptions.skip,
        take: queryOptions.take,
        orderBy: { incubationUser: queryOptions.orderBy },
        include: {
          incubationUser: {
            select: {
              id: true,
              name: true,
              email: true,
              imageUrl: true,
              isActive: true,
              createdAt: true,
              _count: {
                select: {
                  // counts scoped to THIS tenant's programs only
                  programsAsPanel: {
                    where: { isActive: true, program: { tenantId: tenant.id } },
                  },
                  programsManaged: {
                    where: { program: { tenantId: tenant.id } },
                  },
                },
              },
            },
          },
          role: { select: { id: true, roleName: true } },
        },
      }),
      db.incubationUserTenant.count({ where: membershipWhere }),
    ]);
    const users = memberships.map((m) => {
      const { _count, isActive: _userIsActive, ...incUser } = m.incubationUser;
      return {
        ...incUser,
        isActive: m.isActive,
        isAdmin: m.isAdmin,
        isPanelMember: m.isPanelMember,
        roleId: m.roleId,
        role: m.role,
        programCount:
          (_count?.programsAsPanel || 0) + (_count?.programsManaged || 0),
      };
    });

    return {
      data: users,
      pagination: {
        total,
        page: Number(page) || 1,
        limit: Number(limit) || 10,
        totalPages: Math.ceil(total / (Number(limit) || 10)),
      },
    };
  },

  getUsersDropdown: async ({ tenantKey }) => {
    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const memberships = await db.incubationUserTenant.findMany({
      where: { tenantId: tenant.id, isActive: true },
      include: {
        incubationUser: {
          select: { id: true, name: true, email: true, imageUrl: true },
        },
        role: { select: { roleName: true } },
      },
      orderBy: { incubationUser: { name: "asc" } },
    });

    return memberships.map((m) => ({
      ...m.incubationUser,
      isPanelMember: m.isPanelMember,
      role: m.role,
    }));
  },

  login: async ({ email, password, req }) => {
    const user = await db.incubationUser.findUnique({
      where: { email },
    });
    if (!user) throw new ApiError(401, "Invalid email or password");

    const isPasswordValid = await verifyPassword(user.password, password);
    if (!isPasswordValid) throw new ApiError(401, "Invalid email or password");

    let ecosystemUserId = user.userId;
    if (!ecosystemUserId) {
      const ecosystemUser = await findOrCreateEcosystemUser({
        email: user.email,
        name: user.name,
        passwordHash: user.password,
      });
      ecosystemUserId = ecosystemUser.id;
      await db.incubationUser.update({
        where: { id: user.id },
        data: { userId: ecosystemUserId },
      });
    }

    const memberships = await db.incubationUserTenant.findMany({
      where: { incubationUserId: user.id, isActive: true },
      include: {
        tenant: { include: { page: true } },
        role: {
          include: {
            permissions: {
              include: {
                permission: { include: { module: true } },
              },
            },
          },
        },
      },
    });

    if (memberships.length === 0) {
      throw new ApiError(403, "You are not associated with any organization");
    }

    const tenants = memberships.map((m) => ({
      tenantId: m.tenantId,
      tenantKey: m.tenant.tenantKey,
      organizationName: m.tenant.organizationName,
      tenantLogo: m.tenant.tenantLogo,
      roleName: m.role?.roleName || null,
      isAdmin: m.isAdmin,
      isPanelMember: m.isPanelMember,
      page: m.tenant.page,
    }));

    const defaultMembership = memberships[0];
    const modulesWithPermissions = {};
    if (defaultMembership.role?.permissions) {
      defaultMembership.role.permissions.forEach((rp) => {
        const moduleKey = rp.permission.module.moduleKey;
        if (!modulesWithPermissions[moduleKey]) {
          modulesWithPermissions[moduleKey] = [];
        }
        modulesWithPermissions[moduleKey].push(rp.permission.action);
      });
    }

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      imageUrl: user.imageUrl,
      userId: ecosystemUserId,
      tenant: memberships,
      modules: modulesWithPermissions,
    };
    delete userPayload.password;

    const { accessToken, refreshToken } = generateTokens({
      id: ecosystemUserId,
      email: user.email,
    });
    await createSession(ecosystemUserId, refreshToken, {
      userAgent: req?.headers?.["user-agent"],
      ipAddress: req?.ip,
    });

    return { accessToken, refreshToken, user: userPayload, tenants };
  },

  selectTenant: async ({ incubationUserId, tenantId }) => {
    if (!incubationUserId || !tenantId) {
      throw new ApiError(400, "User ID and Tenant ID are required");
    }

    const user = await db.incubationUser.findUnique({
      where: { id: incubationUserId },
    });
    if (!user) throw new ApiError(404, "User not found");

    const membership = await db.incubationUserTenant.findUnique({
      where: {
        incubationUserId_tenantId: { incubationUserId, tenantId },
      },
      include: {
        tenant: { include: { page: true } },
        role: {
          include: {
            permissions: {
              include: {
                permission: { include: { module: true } },
              },
            },
          },
        },
      },
    });

    if (!membership || !membership.isActive) {
      throw new ApiError(403, "You are not a member of this organization");
    }

    const modulesWithPermissions = {};
    if (membership.role?.permissions) {
      membership.role.permissions.forEach((rp) => {
        const moduleKey = rp.permission.module.moduleKey;
        if (!modulesWithPermissions[moduleKey]) {
          modulesWithPermissions[moduleKey] = [];
        }
        modulesWithPermissions[moduleKey].push(rp.permission.action);
      });
    }

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      imageUrl: user.imageUrl,
      userId: user.userId,
      isAdmin: membership.isAdmin,
      isPanelMember: membership.isPanelMember,
      roleId: membership.roleId,
      tenantId: membership.tenantId,
      role: membership.role
        ? { id: membership.role.id, roleName: membership.role.roleName }
        : null,
      tenant: membership.tenant,
      modules: modulesWithPermissions,
    };

    delete userPayload.password;

    return { user: userPayload };
  },

  logout: async (userId, refreshToken) => {
    await revokeSession(userId, refreshToken);
  },

  getProfile: async (userId) => {
    const resolvedUserId = await resolveIncubationUserId(userId);
    const user = await db.incubationUser.findUnique({
      where: { id: resolvedUserId },
      include: {
        tenantMemberships: {
          where: { isActive: true },
          include: {
            tenant: {
              include: {
                page: true,
              },
            },
            role: {
              include: {
                permissions: {
                  include: {
                    permission: {
                      include: { module: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }
    const memberships = user.tenantMemberships;

    if (memberships.length === 0) {
      throw new ApiError(403, "You are not associated with any organization");
    }

    const tenants = memberships.map((m) => ({
      tenantId: m.tenantId,
      tenantKey: m.tenant.tenantKey,
      organizationName: m.tenant.organizationName,
      tenantLogo: m.tenant.tenantLogo,
      roleName: m.role?.roleName || null,
      isAdmin: m.isAdmin,
      isPanelMember: m.isPanelMember,
      page: m.tenant.page,
    }));

    const defaultMembership = memberships[0];
    const modulesWithPermissions = {};

    if (defaultMembership.role?.permissions) {
      defaultMembership.role.permissions.forEach((rp) => {
        const moduleKey = rp.permission.module.moduleKey;

        if (!modulesWithPermissions[moduleKey]) {
          modulesWithPermissions[moduleKey] = [];
        }

        modulesWithPermissions[moduleKey].push(rp.permission.action);
      });
    }

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      imageUrl: user.imageUrl,
      userId: user.userId,
      tenant: memberships,
      modules: modulesWithPermissions,
    };

    return {
      user: userPayload,
      tenants,
    };
  },

  refreshTokens: async (refreshToken, req) => {
    try {
      if (!refreshToken) throw new ApiError(401, "No refresh token provided");
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
      const userId = decoded.id;
      const isValid = await validateSession(userId, refreshToken);
      if (!isValid) {
        throw new ApiError(401, "Invalid or expired refresh token");
      }
      const { accessToken, refreshToken: newRefreshToken } =
        generateTokens(decoded);

      await rotateSession(userId, refreshToken, newRefreshToken, {
        userAgent: req?.headers?.["user-agent"],
        ipAddress: req?.ip,
      });
      return { accessToken, refreshToken: newRefreshToken, user: decoded };
    } catch (err) {
      throw new ApiError(401, err.message);
    }
  },

  createTenantPage: async ({ userId, tenantId, pageData = {} }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!tenantId) throw new ApiError(400, "Tenant ID is required");

    const incubationUser = await db.incubationUser.findUnique({
      where: { id: userId },
    });
    if (!incubationUser) throw new ApiError(404, "User not found");

    const membership = await db.incubationUserTenant.findUnique({
      where: {
        incubationUserId_tenantId: { incubationUserId: userId, tenantId },
      },
      include: { tenant: true },
    });
    if (!membership || !membership.isActive) {
      throw new ApiError(403, "You are not a member of this organization");
    }
    if (!membership.isAdmin) {
      throw new ApiError(
        403,
        "Only admins can create a page for the organization",
      );
    }
    if (membership.tenant.pageId) {
      throw new ApiError(409, "Page already exists for this organization");
    }

    const result = await db.$transaction(async (tx) => {
      const ecosystemUser = await findOrCreateEcosystemUser({
        email: incubationUser.email,
        name: incubationUser.name,
        passwordHash: incubationUser.password,
        tx,
      });

      if (!incubationUser.userId) {
        await tx.incubationUser.update({
          where: { id: userId },
          data: { userId: ecosystemUser.id },
        });
      }

      const slug = await generateUniquePageSlug(
        membership.tenant.organizationName,
        tx,
      );

      const allowedFields = [
        "tagline",
        "description",
        "logo",
        "coverImage",
        "website",
        "linkedin",
        "twitter",
        "sector",
        "foundedYear",
        "headquarters",
        "teamSize",
        "phone",
      ];
      const filtered = {};
      for (const key of allowedFields) {
        if (pageData[key] !== undefined && pageData[key] !== null) {
          filtered[key] = pageData[key];
        }
      }

      const page = await tx.page.create({
        data: {
          creatorId: ecosystemUser.id,
          name: membership.tenant.organizationName,
          slug,
          type: "INCUBATION",
          email: incubationUser.email,
          ...filtered,
        },
      });

      await tx.pageMember.create({
        data: {
          pageId: page.id,
          userId: ecosystemUser.id,
          role: "OWNER",
        },
      });

      const updatedTenant = await tx.tenant.update({
        where: { id: tenantId },
        data: { pageId: page.id },
        include: { page: true },
      });

      return { page, tenant: updatedTenant };
    });

    return result;
  },

  forgotPassword: async ({ email }) => {
    if (!email) throw new ApiError(400, "Email is required");
    if (!isEmailValid(email)) throw new ApiError(400, "Invalid email format");
    const user = await db.incubationUser.findUnique({ where: { email } });
    if (!user) throw new ApiError(404, "User not found");
    const otp = generateOtp();
    await setRedis(`forgot:${email}`, JSON.stringify({ otp }), 300);
    const templateData = {
      otp,
      adminName: user.name,
      organizationName: user.tenantName || "Your Organization",
      expiryMinutes: 5,
      portalName: "OPERNOVA INCUBATION ERP",
      supportEmail: "business@opernova.com",
    };
    const templatePath = path.resolve("./src/mails/otp-mail.ejs");

    await sendMail(
      email,
      "OPERNOVA - Password Reset OTP",
      templatePath,
      templateData,
    );

    return { message: "OTP sent successfully to your email" };
  },

  verifyForgotPasswordOtp: async ({ email, otp }) => {
    if (!email || !otp) throw new ApiError(400, "Email and OTP are required");
    const data = await getRedis(`forgot:${email}`);
    if (!data) throw new ApiError(400, "OTP expired or not found");

    const { otp: storedOtp } = JSON.parse(data);
    const isValid = verifyOtp(storedOtp, otp);

    if (!isValid) throw new ApiError(400, "Invalid OTP");
    const resetToken = crypto.randomBytes(32).toString("hex");
    await setRedis(`reset:${email}`, resetToken, 900);

    return { message: "OTP verified successfully", resetToken };
  },

  resetPassword: async ({ email, newPassword, resetToken }) => {
    if (!email || !newPassword || !resetToken)
      throw new ApiError(400, "Email, password, and reset token required");

    const storedToken = await getRedis(`reset:${email}`);
    if (!storedToken) throw new ApiError(400, "Reset token expired or invalid");
    if (storedToken !== resetToken)
      throw new ApiError(400, "Invalid reset token");

    const user = await db.incubationUser.findUnique({ where: { email } });
    if (!user) throw new ApiError(404, "User not found");

    const hashedPassword = await hashPassword(newPassword);

    await db.incubationUser.update({
      where: { email },
      data: { password: hashedPassword },
    });
    if (user.userId) {
      await revokeAllSessions(user.userId);
    }
    await setRedis(`forgot:${email}`, "", 1);
    await setRedis(`reset:${email}`, "", 1);
    return { message: "Password reset successfully" };
  },

  getIncubationTeamMembers: async ({ tenantKey, userId }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!tenantKey) throw new ApiError(400, "Tenant key is required");

    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) throw new ApiError(404, "Tenant not found");

    const userMembership = await db.incubationUserTenant.findUnique({
      where: {
        incubationUserId_tenantId: {
          incubationUserId: userId,
          tenantId: tenant.id,
        },
      },
    });

    if (!userMembership || !userMembership.isActive) {
      throw new ApiError(403, "You are not a member of this organization");
    }

    const memberships = await db.incubationUserTenant.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
      },
      include: {
        incubationUser: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
            createdAt: true,
          },
        },
        role: { select: { id: true, roleName: true } },
      },
      orderBy: [{ isAdmin: "desc" }, { createdAt: "asc" }],
    });

    return memberships.map((m) => ({
      ...m.incubationUser,
      isAdmin: m.isAdmin,
      isPanelMember: m.isPanelMember,
      role: m.role,
    }));
  },

  getUserDetails: async ({ incubationUserId, tenantKey }) => {
    if (!tenantKey) {
      throw new ApiError(400, "Tenant key is required");
    }

    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) {
      throw new ApiError(404, "Tenant not found");
    }

    const user = await db.incubationUser.findUnique({
      where: { id: incubationUserId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            profilePhoto: true,
            headline: true,
            bio: true,
            location: true,
            emailVerified: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },

        // kept as-is: all memberships (for organizations array)
        tenantMemberships: {
          include: {
            tenant: {
              select: {
                id: true,
                organizationName: true,
                tenantKey: true,
                tenantLogo: true,
                domain: true,
                status: true,
              },
            },
            role: { select: { id: true, roleName: true } },
          },
        },

        // kept as-is
        programsManaged: {
          where: { program: { tenantId: tenant.id } },
          include: {
            program: {
              select: {
                id: true,
                title: true,
                description: true,
                coverImage: true,
                programLogo: true,
                objective: true,
                createdAt: true,
              },
            },
          },
        },

        // kept as-is
        programsAsPanel: {
          where: {
            isActive: true,
            program: { tenantId: tenant.id },
          },
          include: {
            program: {
              select: {
                id: true,
                title: true,
                description: true,
                coverImage: true,
                programLogo: true,
                createdAt: true,
              },
            },
            batch: { select: { id: true, batchName: true, status: true } },
          },
        },

        // kept as-is (user-level, no tenant link)
        permissions: {
          include: {
            permission: { include: { module: true } },
          },
        },

        // scoped to current organization
        facilityBookings: {
          where: { tenantId: tenant.id },
          take: 20,
          orderBy: { createdAt: "desc" },
          include: {
            facility: {
              select: { id: true, name: true, type: true, location: true },
            },
          },
        },

        // scoped to current organization
        officeAllocations: {
          where: { tenantId: tenant.id },
          take: 20,
          orderBy: { createdAt: "desc" },
        },

        // scoped to current organization (via application)
        evaluations: {
          where: { application: { tenantId: tenant.id } },
          take: 20,
          orderBy: { createdAt: "desc" },
        },

        // scoped to current organization
        addonServiceRequests: {
          where: { tenantId: tenant.id },
          take: 20,
          orderBy: { createdAt: "desc" },
        },

        // scoped to current organization
        dataCollectionRequests: {
          where: { tenantId: tenant.id },
          take: 20,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const currentMembership = user.tenantMemberships.find(
      (m) => m.tenant.id === tenant.id,
    );

    return {
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        imageUrl: user.imageUrl,
        isActive: currentMembership?.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,

        // current org membership merged in
        roleId: currentMembership?.roleId,
        roleName: currentMembership?.role?.roleName,
        isAdmin: currentMembership?.isAdmin,
        isPanelMember: currentMembership?.isPanelMember,
        membershipActive: currentMembership?.isActive,
      },

      currentOrganization: currentMembership
        ? {
            membershipId: currentMembership.id,
            tenantId: currentMembership.tenant.id,
            tenantName: currentMembership.tenant.organizationName,
            tenantKey: currentMembership.tenant.tenantKey,
            tenantLogo: currentMembership.tenant.tenantLogo,
            domain: currentMembership.tenant.domain,
            status: currentMembership.tenant.status,
            roleId: currentMembership.roleId,
            roleName: currentMembership.role?.roleName,
            isAdmin: currentMembership.isAdmin,
            isPanelMember: currentMembership.isPanelMember,
            isActive: currentMembership.isActive,
          }
        : null,

      ecosystemUser: user.user,

      organizations: user.tenantMemberships.map((membership) => ({
        tenantId: membership.tenant.id,
        tenantName: membership.tenant.organizationName,
        tenantKey: membership.tenant.tenantKey,
        roleId: membership.role?.id,
        roleName: membership.role?.roleName,
        isAdmin: membership.isAdmin,
        isPanelMember: membership.isPanelMember,
        isActive: membership.isActive,
      })),

      managedPrograms: user.programsManaged.map((p) => ({
        assignmentId: p.id,
        programId: p.program.id,
        title: p.program.title,
        description: p.program.description,
        coverImage: p.program.coverImage,
        programLogo: p.program.programLogo,
        createdAt: p.program.createdAt,
      })),

      panelPrograms: user.programsAsPanel.map((p) => ({
        assignmentId: p.id,
        programId: p.program.id,
        title: p.program.title,
        description: p.program.description,
        batchId: p.batch?.id,
        batchName: p.batch?.batchName,
        assignedAt: p.createdAt,
      })),

      permissions: user.permissions.map((p) => ({
        module: p.permission.module.moduleKey,
        action: p.permission.action,
      })),

      facilityBookings: user.facilityBookings,
      officeAllocations: user.officeAllocations,
      evaluations: user.evaluations,
      addonServiceRequests: user.addonServiceRequests,
      dataCollectionRequests: user.dataCollectionRequests,

      stats: {
        organizations: user.tenantMemberships.length,
        managedPrograms: user.programsManaged.length,
        panelPrograms: user.programsAsPanel.length,
        permissions: user.permissions.length,
        facilityBookings: user.facilityBookings.length,
        evaluations: user.evaluations.length,
      },
    };
  },

  updateUser: async ({
    incubationUserId,
    tenantKey,
    name,
    email,
    imageUrl,
    isActive,
    roleId,
    isAdmin,
    isPanelMember,
    programIds = [],
  }) => {
    if (!tenantKey) {
      throw new ApiError(400, "Tenant key is required");
    }

    const tenant = await db.tenant.findUnique({ where: { tenantKey } });
    if (!tenant) {
      throw new ApiError(404, "Tenant not found");
    }

    const user = await db.incubationUser.findUnique({
      where: { id: incubationUserId },
    });
    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return await db.$transaction(async (tx) => {
      const membership = await tx.incubationUserTenant.findUnique({
        where: {
          incubationUserId_tenantId: {
            incubationUserId,
            tenantId: tenant.id,
          },
        },
      });
      if (!membership) {
        throw new ApiError(404, "User is not a member of this organization");
      }

      if (email && email.toLowerCase() !== user.email.toLowerCase()) {
        const existing = await tx.incubationUser.findUnique({
          where: { email: email.toLowerCase() },
        });
        if (existing) {
          throw new ApiError(400, "Email already exists");
        }
      }

      const updatedUser = await tx.incubationUser.update({
        where: { id: incubationUserId },
        data: {
          ...(name !== undefined && { name }),
          ...(email !== undefined && { email: email.toLowerCase() }),
          ...(imageUrl !== undefined && { imageUrl }),
        },
      });

      const membershipData = {};
      if (isActive !== undefined) membershipData.isActive = isActive;

      let targetRoleId = roleId !== undefined ? roleId : membership.roleId;
      let roleChanged = roleId !== undefined;

      if (isAdmin === false && targetRoleId) {
        const adminRole = await tx.role.findFirst({
          where: { tenantId: tenant.id, roleName: "Admin" },
          select: { id: true },
        });
        if (adminRole && targetRoleId === adminRole.id) {
          targetRoleId = null;
          roleChanged = true;
        }
      }

      if (roleChanged) membershipData.roleId = targetRoleId;
      if (isAdmin !== undefined) membershipData.isAdmin = isAdmin;
      if (isPanelMember !== undefined)
        membershipData.isPanelMember = isPanelMember;

      if (Object.keys(membershipData).length > 0) {
        await tx.incubationUserTenant.update({
          where: { id: membership.id },
          data: membershipData,
        });
      }

      if (Array.isArray(programIds)) {
        await tx.programPanelAssignment.updateMany({
          where: { panelMemberId: incubationUserId },
          data: { isActive: false },
        });

        for (const programId of programIds) {
          const exists = await tx.programPanelAssignment.findFirst({
            where: { programId, panelMemberId: incubationUserId },
          });

          if (exists) {
            await tx.programPanelAssignment.update({
              where: { id: exists.id },
              data: { isActive: true },
            });
          } else {
            await tx.programPanelAssignment.create({
              data: { programId, panelMemberId: incubationUserId },
            });
          }
        }

        // Only auto-derive isPanelMember from programIds if it wasn't explicitly set
        if (isPanelMember === undefined) {
          await tx.incubationUserTenant.update({
            where: { id: membership.id },
            data: { isPanelMember: programIds.length > 0 },
          });
        }
      }

      return updatedUser;
    });
  },
};
