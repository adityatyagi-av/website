import { startOfDay, subDays } from "date-fns";
import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { buildQueryOptions } from "../../../utils/queryHelper.js";
import { ensureUserHasRole } from "../../common/role-guard.service.js";

export const EcosystemProfileService = {
  getProfile: async (userId) => {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        roles: true,
        location: true,
        socialLinks: true,
        skills: {
          include: {
            skill: true,
          },
        },

        experiences: true,
        educations: true,
        certifications: true,
        projects: true,
        followers: {
          select: {
            id: true,
            follower: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                profilePhoto: true,
              },
            },
          },
        },
        following: {
          select: {
            id: true,
            following: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                profilePhoto: true,
              },
            },
          },
        },
        connectionsSent: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            receiver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                profilePhoto: true,
              },
            },
          },
        },
      },
    });
    if (!user) throw new ApiError(404, "User not found");

    const connectionCount = await db.connection.count({
      where: {
        status: "ACCEPTED",
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
      },
    });

    delete user.passwordHash;
    return {
      ...user,
      followersCount: user.followers.length,
      followingCount: user.following.length,
      connectionsSentCount: user.connectionsSent.length,
      connectionCount
    };
  },
  // to update profile
  updateBasicDetails: async ({
    userId,
    firstName,
    lastName,
    headline,
    bio,
    dateOfBirth,
    gender,
    profilePhoto,
    coverImage,
    location,
    socialLinks,
  }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, profileCurrentStage: true },
    });

    if (!user) throw new ApiError(404, "User not found");

    if (user.profileCurrentStage < 3) {
      throw new ApiError(400, "Please select your primary role first");
    }

    const userUpdateData = {};

    if (firstName !== undefined) userUpdateData.firstName = firstName;
    if (lastName !== undefined) userUpdateData.lastName = lastName;
    if (headline !== undefined) userUpdateData.headline = headline;
    if (bio !== undefined) userUpdateData.bio = bio;
    if (dateOfBirth !== undefined) {
      const parsed = new Date(dateOfBirth);
      if (isNaN(parsed.getTime())) {
        throw new ApiError(400, "Invalid dateOfBirth format. Use YYYY-MM-DD");
      }
      userUpdateData.dateOfBirth = parsed;
    }
    if (gender !== undefined) userUpdateData.gender = gender;
    if (profilePhoto !== undefined) userUpdateData.profilePhoto = profilePhoto;
    if (coverImage !== undefined) userUpdateData.coverImage = coverImage;

    userUpdateData.profileCurrentStage = Math.max(user.profileCurrentStage, 4);

    const hasUserFields = Object.keys(userUpdateData).length > 1;

    let locationUpsertData = null;
    if (location && typeof location === "object") {
      const locData = {};
      const {
        city,
        state,
        country,
        zipCode,
        latitude,
        longitude,
        timezone,
        isRemote,
      } = location;

      if (city !== undefined) locData.city = city;
      if (state !== undefined) locData.state = state;
      if (country !== undefined) locData.country = country;
      if (zipCode !== undefined) locData.zipCode = zipCode;
      if (latitude !== undefined) locData.latitude = latitude;
      if (longitude !== undefined) locData.longitude = longitude;
      if (timezone !== undefined) locData.timezone = timezone;
      if (isRemote !== undefined) locData.isRemote = isRemote;

      if (Object.keys(locData).length > 0) {
        locationUpsertData = locData;
      }
    }
    let socialUpsertData = null;
    if (socialLinks && typeof socialLinks === "object") {
      const socData = {};
      const {
        linkedin,
        github,
        twitter,
        website,
        instagram,
        youtube,
        facebook,
        medium,
        behance,
        dribbble,
      } = socialLinks;

      if (linkedin !== undefined) socData.linkedin = linkedin;
      if (github !== undefined) socData.github = github;
      if (twitter !== undefined) socData.twitter = twitter;
      if (website !== undefined) socData.website = website;
      if (facebook !== undefined) socData.facebook = facebook;
      if (instagram !== undefined) socData.instagram = instagram;
      if (youtube !== undefined) socData.youtube = youtube;
      if (medium !== undefined) socData.medium = medium;
      if (behance !== undefined) socData.behance = behance;
      if (dribbble !== undefined) socData.dribbble = dribbble;
      if (Object.keys(socData).length > 0) {
        socialUpsertData = socData;
      }
    }

    if (!hasUserFields && !locationUpsertData && !socialUpsertData) {
      throw new ApiError(400, "No fields provided to update");
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        ...userUpdateData,
        ...(locationUpsertData && {
          location: {
            upsert: {
              create: { ...locationUpsertData },
              update: { ...locationUpsertData },
            },
          },
        }),
        ...(socialUpsertData && {
          socialLinks: {
            upsert: {
              create: { ...socialUpsertData },
              update: { ...socialUpsertData },
            },
          },
        }),
      },
      include: {
        location: true,
        socialLinks: true,
      },
    });
    delete updatedUser.passwordHash;
    return updatedUser;
  },

  //skill api's

  searchSkills: async ({ search, page = 1, limit = 10 }) => {
    const { skip, take, where, orderBy } = buildQueryOptions({
      page,
      limit,
      search,
      defaultFields: ["name", "category"],
      sortBy: "name",
      order: "asc",
    });

    const skills = await db.skill.findMany({
      where,
      skip,
      take,
      orderBy,
      select: {
        id: true,
        name: true,
        category: true,
      },
    });

    return skills;
  },

  getSkillCategories: async () => {
    const categories = await db.skill.findMany({
      where: { category: { not: null } },
      distinct: ["category"],
      select: { category: true },
    });

    return categories.map((c) => c.category);
  },

  addSkill: async ({
    userId,
    name,
    category,
    proficiency,
    yearsUsed,
    isLearning,
  }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!name) throw new ApiError(400, "Skill name is required");

    const normalized = name.trim().toLowerCase();

    const skill = await db.skill.upsert({
      where: { name: normalized },
      create: {
        name: normalized,
        category: category ?? null,
      },
      update: {},
    });

    try {
      return await db.userSkill.create({
        data: {
          userId,
          skillId: skill.id,
          proficiency: proficiency ?? null,
          yearsUsed: yearsUsed ?? null,
          isLearning: isLearning ?? false,
        },
        include: {
          skill: {
            select: { id: true, name: true, category: true },
          },
        },
      });
    } catch (err) {
      if (err.code === "P2002") {
        throw new ApiError(409, "Skill already added");
      }
      throw err;
    }
  },

  updateSkill: async ({
    userId,
    skillId,
    proficiency,
    yearsUsed,
    isLearning,
  }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!skillId) throw new ApiError(400, "Skill id is required");

    const skill = await db.userSkill.findFirst({
      where: { id: skillId, userId },
    });
    if (!skill) throw new ApiError(404, "Skill not found");

    const updateData = {};

    if (proficiency !== undefined) updateData.proficiency = proficiency;
    if (yearsUsed !== undefined) updateData.yearsUsed = yearsUsed;
    if (isLearning !== undefined) updateData.isLearning = isLearning;

    if (Object.keys(updateData).length === 0) {
      throw new ApiError(400, "No fields provided to update");
    }

    return db.userSkill.update({
      where: { id: skillId },
      data: updateData,
      include: {
        skill: {
          select: { id: true, name: true, category: true },
        },
      },
    });
  },
  deleteSkill: async ({ userId, skillId }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!skillId) throw new ApiError(400, "Skill id is required");

    const skill = await db.userSkill.findFirst({
      where: { id: skillId, userId },
      select: { id: true },
    });
    if (!skill) throw new ApiError(404, "Skill not found");

    await db.userSkill.delete({
      where: { id: skillId },
    });

    return { message: "Skill removed successfully" };
  },

  //education api's
  searchInstitutionPages: async ({ search, page = 1, limit = 10 }) => {
    if (!search) throw new ApiError(400, "Search query is required");

    const { skip, take, where, orderBy } = buildQueryOptions({
      page,
      limit,
      search,
      defaultFields: ["name", "slug"],
      sortBy: "name",
      order: "asc",
    });

    const pages = await db.page.findMany({
      where: {
        ...where,
        type: { in: ["UNIVERSITY", "COLLEGE", "SCHOOL", "INSTITUTION"] },
      },
      skip,
      take,
      orderBy,
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        verificationStatus: true,
      },
    });
    return pages;
  },
  addEducation: async ({
    userId,
    institution,
    degree,
    fieldOfStudy,
    startDate,
    endDate,
    isCurrent,
    grade,
    activities,
    description,
    pageId,
  }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!degree || !fieldOfStudy || !startDate) {
      throw new ApiError(
        400,
        "Degree, fieldOfStudy and startDate are required",
      );
    }

    let finalInstitution = institution?.trim();

    if (pageId) {
      const page = await db.page.findUnique({
        where: { id: pageId },
        select: { id: true, name: true, type: true },
      });
      if (!page) throw new ApiError(404, "Institution page not found");

      finalInstitution = page.name;
    }

    if (!finalInstitution) {
      throw new ApiError(400, "Institution name is required");
    }

    const parsedStart = new Date(startDate);
    if (isNaN(parsedStart.getTime())) {
      throw new ApiError(400, "Invalid startDate format");
    }

    let parsedEnd = null;
    if (endDate !== undefined && endDate !== null) {
      parsedEnd = new Date(endDate);
      if (isNaN(parsedEnd.getTime())) {
        throw new ApiError(400, "Invalid endDate format");
      }
    }

    if (parsedEnd && parsedEnd < parsedStart) {
      throw new ApiError(400, "endDate cannot be before startDate");
    }

    const education = await db.userEducation.create({
      data: {
        userId,
        institution: finalInstitution,
        degree: degree.trim(),
        fieldOfStudy: fieldOfStudy.trim(),
        startDate: parsedStart,
        endDate: parsedEnd,
        isCurrent: isCurrent ?? false,
        grade: grade ?? null,
        activities: activities ?? null,
        description: description ?? null,
        pageId: pageId ?? null,
      },
    });

    return education;
  },
  updateEducation: async ({
    userId,
    educationId,
    institution,
    degree,
    fieldOfStudy,
    startDate,
    endDate,
    isCurrent,
    grade,
    activities,
    description,
    pageId,
  }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!educationId) throw new ApiError(400, "Education id is required");

    const education = await db.userEducation.findFirst({
      where: { id: educationId, userId },
    });
    if (!education) throw new ApiError(404, "Education not found");

    const updateData = {};

    if (pageId !== undefined) {
      if (pageId === null) {
        updateData.pageId = null;
        if (institution !== undefined) {
          updateData.institution = institution.trim();
        }
      } else {
        const page = await db.page.findUnique({
          where: { id: pageId },
          select: { name: true },
        });
        if (!page) throw new ApiError(404, "Institution page not found");

        updateData.pageId = pageId;
        updateData.institution = page.name;
      }
    } else if (institution !== undefined) {
      updateData.institution = institution.trim();
    }

    if (degree !== undefined) updateData.degree = degree.trim();
    if (fieldOfStudy !== undefined)
      updateData.fieldOfStudy = fieldOfStudy.trim();
    if (isCurrent !== undefined) updateData.isCurrent = isCurrent;
    if (grade !== undefined) updateData.grade = grade;
    if (activities !== undefined) updateData.activities = activities;
    if (description !== undefined) updateData.description = description;

    if (startDate !== undefined) {
      const parsed = new Date(startDate);
      if (isNaN(parsed.getTime())) throw new ApiError(400, "Invalid startDate");
      updateData.startDate = parsed;
    }

    if (endDate !== undefined) {
      if (endDate === null) updateData.endDate = null;
      else {
        const parsed = new Date(endDate);
        if (isNaN(parsed.getTime())) throw new ApiError(400, "Invalid endDate");
        updateData.endDate = parsed;
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new ApiError(400, "No fields provided to update");
    }

    const updated = await db.userEducation.update({
      where: { id: educationId },
      data: updateData,
    });

    return updated;
  },
  deleteEducation: async ({ userId, educationId }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!educationId) throw new ApiError(400, "Education id is required");

    const education = await db.userEducation.findFirst({
      where: { id: educationId, userId },
      select: { id: true },
    });

    if (!education) throw new ApiError(404, "Education not found");

    await db.userEducation.delete({
      where: { id: educationId },
    });

    return { message: "Education deleted successfully" };
  },

  //experience api's

  searchCompanyPages: async ({ search = "", page = 1, limit = 10 }) => {
    const { skip, take, where, orderBy } = buildQueryOptions({
      page,
      limit,
      search,
      defaultFields: ["name", "slug"],
      sortBy: "name",
      order: "asc",
    });

    const pages = await db.page.findMany({
      where: {
        ...where,
        type: "COMPANY",
      },
      skip,
      take,
      orderBy,
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        verificationStatus: true,
      },
    });

    return pages;
  },
  addExperience: async ({
    userId,
    pageId,
    companyName,
    title,
    employmentType,
    location,
    startDate,
    endDate,
    isCurrent,
    description,
  }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!title || !startDate) {
      throw new ApiError(400, "Title and startDate are required");
    }

    let finalCompany = companyName?.trim();

    if (pageId) {
      const page = await db.page.findUnique({
        where: { id: pageId },
        select: { name: true },
      });
      if (!page) throw new ApiError(404, "Company page not found");
      finalCompany = page.name;
    }

    if (!finalCompany) {
      throw new ApiError(400, "Company name is required");
    }

    const parsedStart = new Date(startDate);
    if (isNaN(parsedStart.getTime())) {
      throw new ApiError(400, "Invalid startDate format");
    }

    let parsedEnd = null;
    if (endDate !== undefined && endDate !== null) {
      parsedEnd = new Date(endDate);
      if (isNaN(parsedEnd.getTime())) {
        throw new ApiError(400, "Invalid endDate format");
      }
    }

    if (parsedEnd && parsedEnd < parsedStart) {
      throw new ApiError(400, "endDate cannot be before startDate");
    }

    const exp = await db.userExperience.create({
      data: {
        userId,
        pageId: pageId ?? null,
        companyName: finalCompany,
        title: title.trim(),
        employmentType: employmentType ?? null,
        location: location ?? null,
        startDate: parsedStart,
        endDate: parsedEnd,
        isCurrent: isCurrent ?? false,
        description: description ?? null,
      },
    });

    return exp;
  },
  updateExperience: async ({
    userId,
    experienceId,
    pageId,
    companyName,
    title,
    employmentType,
    location,
    startDate,
    endDate,
    isCurrent,
    description,
  }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!experienceId) throw new ApiError(400, "Experience id is required");

    const exp = await db.userExperience.findFirst({
      where: { id: experienceId, userId },
    });
    if (!exp) throw new ApiError(404, "Experience not found");

    const updateData = {};

    if (pageId !== undefined) {
      if (pageId === null) {
        updateData.pageId = null;
        if (companyName !== undefined) {
          updateData.companyName = companyName.trim();
        }
      } else {
        const page = await db.page.findUnique({
          where: { id: pageId },
          select: { name: true },
        });
        if (!page) throw new ApiError(404, "Company page not found");

        updateData.pageId = pageId;
        updateData.companyName = page.name;
      }
    } else if (companyName !== undefined) {
      updateData.companyName = companyName.trim();
    }

    if (title !== undefined) updateData.title = title.trim();
    if (employmentType !== undefined)
      updateData.employmentType = employmentType;
    if (location !== undefined) updateData.location = location;
    if (isCurrent !== undefined) updateData.isCurrent = isCurrent;
    if (description !== undefined) updateData.description = description;

    if (startDate !== undefined) {
      const parsed = new Date(startDate);
      if (isNaN(parsed.getTime())) throw new ApiError(400, "Invalid startDate");
      updateData.startDate = parsed;
    }

    if (endDate !== undefined) {
      if (endDate === null) updateData.endDate = null;
      else {
        const parsed = new Date(endDate);
        if (isNaN(parsed.getTime())) throw new ApiError(400, "Invalid endDate");
        updateData.endDate = parsed;
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new ApiError(400, "No fields provided to update");
    }

    const updated = await db.userExperience.update({
      where: { id: experienceId },
      data: updateData,
    });

    return updated;
  },
  deleteExperience: async ({ userId, experienceId }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!experienceId) throw new ApiError(400, "Experience id is required");

    const exp = await db.userExperience.findFirst({
      where: { id: experienceId, userId },
      select: { id: true },
    });
    if (!exp) throw new ApiError(404, "Experience not found");

    await db.userExperience.delete({
      where: { id: experienceId },
    });

    return { message: "Experience deleted successfully" };
  },

  //certification api's

  searchCertificationPages: async ({ search = "", page = 1, limit = 10 }) => {
    const { skip, take, where, orderBy } = buildQueryOptions({
      page,
      limit,
      search,
      defaultFields: ["name", "slug"],
      sortBy: "name",
      order: "asc",
    });

    const pages = await db.page.findMany({
      where: {
        ...where,
      },
      skip,
      take,
      orderBy,
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        verificationStatus: true,
      },
    });

    return pages;
  },

  addCertification: async ({
    userId,
    pageId,
    name,
    issuingOrgName,
    issueDate,
    expirationDate,
    credentialId,
    credentialUrl,
  }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!name || !issueDate) {
      throw new ApiError(400, "Certification name and issueDate are required");
    }

    let finalOrg = issuingOrgName?.trim();

    if (pageId) {
      const page = await db.page.findUnique({
        where: { id: pageId },
        select: { name: true },
      });
      if (!page) throw new ApiError(404, "Issuing organization page not found");
      finalOrg = page.name;
    }

    if (!finalOrg) {
      throw new ApiError(400, "Issuing organization name is required");
    }

    const parsedIssue = new Date(issueDate);
    if (isNaN(parsedIssue.getTime())) {
      throw new ApiError(400, "Invalid issueDate format");
    }

    let parsedExpire = null;
    if (expirationDate !== undefined && expirationDate !== null) {
      parsedExpire = new Date(expirationDate);
      if (isNaN(parsedExpire.getTime())) {
        throw new ApiError(400, "Invalid expirationDate format");
      }
      if (parsedExpire < parsedIssue) {
        throw new ApiError(400, "Expiration date cannot be before issue date");
      }
    }

    const cert = await db.userCertification.create({
      data: {
        userId,
        pageId: pageId ?? null,
        name: name.trim(),
        issuingOrgName: finalOrg,
        issueDate: parsedIssue,
        expirationDate: parsedExpire,
        credentialId: credentialId ?? null,
        credentialUrl: credentialUrl ?? null,
      },
    });

    return cert;
  },
  updateCertification: async ({
    userId,
    certificationId,
    pageId,
    name,
    issuingOrgName,
    issueDate,
    expirationDate,
    credentialId,
    credentialUrl,
  }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!certificationId)
      throw new ApiError(400, "Certification id is required");

    const cert = await db.userCertification.findFirst({
      where: { id: certificationId, userId },
    });
    if (!cert) throw new ApiError(404, "Certification not found");

    const updateData = {};

    if (pageId !== undefined) {
      if (pageId === null) {
        updateData.pageId = null;
        if (issuingOrgName !== undefined) {
          updateData.issuingOrgName = issuingOrgName.trim();
        }
      } else {
        const page = await db.page.findUnique({
          where: { id: pageId },
          select: { name: true },
        });
        if (!page)
          throw new ApiError(404, "Issuing organization page not found");

        updateData.pageId = pageId;
        updateData.issuingOrgName = page.name;
      }
    } else if (issuingOrgName !== undefined) {
      updateData.issuingOrgName = issuingOrgName.trim();
    }

    if (name !== undefined) updateData.name = name.trim();
    if (credentialId !== undefined) updateData.credentialId = credentialId;
    if (credentialUrl !== undefined) updateData.credentialUrl = credentialUrl;

    if (issueDate !== undefined) {
      const parsed = new Date(issueDate);
      if (isNaN(parsed.getTime())) throw new ApiError(400, "Invalid issueDate");
      updateData.issueDate = parsed;
    }

    if (expirationDate !== undefined) {
      if (expirationDate === null) updateData.expirationDate = null;
      else {
        const parsed = new Date(expirationDate);
        if (isNaN(parsed.getTime()))
          throw new ApiError(400, "Invalid expirationDate");
        updateData.expirationDate = parsed;
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new ApiError(400, "No fields provided to update");
    }

    const updated = await db.userCertification.update({
      where: { id: certificationId },
      data: updateData,
    });

    return updated;
  },
  deleteCertification: async ({ userId, certificationId }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!certificationId)
      throw new ApiError(400, "Certification id is required");

    const cert = await db.userCertification.findFirst({
      where: { id: certificationId, userId },
      select: { id: true },
    });
    if (!cert) throw new ApiError(404, "Certification not found");

    await db.userCertification.delete({
      where: { id: certificationId },
    });

    return { message: "Certification deleted successfully" };
  },

  //project api's
  addProject: async ({
    userId,
    title,
    description,
    url,
    imageUrl,
    technologies,
    startDate,
    endDate,
    isCurrent,
  }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!title) throw new ApiError(400, "Project title is required");

    let parsedStart = null;
    if (startDate !== undefined && startDate !== null) {
      parsedStart = new Date(startDate);
      if (isNaN(parsedStart.getTime())) {
        throw new ApiError(400, "Invalid startDate format");
      }
    }

    let parsedEnd = null;
    if (endDate !== undefined && endDate !== null) {
      parsedEnd = new Date(endDate);
      if (isNaN(parsedEnd.getTime())) {
        throw new ApiError(400, "Invalid endDate format");
      }
    }

    if (parsedStart && parsedEnd && parsedEnd < parsedStart) {
      throw new ApiError(400, "endDate cannot be before startDate");
    }

    const project = await db.userProject.create({
      data: {
        userId,
        title: title.trim(),
        description: description ?? null,
        url: url ?? null,
        imageUrl: imageUrl ?? null,
        technologies: Array.isArray(technologies) ? technologies : [],
        startDate: parsedStart,
        endDate: parsedEnd,
        isCurrent: isCurrent ?? false,
      },
    });

    return project;
  },

  updateProject: async ({
    userId,
    projectId,
    title,
    description,
    url,
    imageUrl,
    technologies,
    startDate,
    endDate,
    isCurrent,
  }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!projectId) throw new ApiError(400, "Project id is required");

    const project = await db.userProject.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) throw new ApiError(404, "Project not found");

    const updateData = {};

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description;
    if (url !== undefined) updateData.url = url;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (technologies !== undefined) {
      if (!Array.isArray(technologies)) {
        throw new ApiError(400, "Technologies must be an array of strings");
      }
      updateData.technologies = technologies;
    }
    if (isCurrent !== undefined) updateData.isCurrent = isCurrent;

    if (startDate !== undefined) {
      if (startDate === null) updateData.startDate = null;
      else {
        const parsed = new Date(startDate);
        if (isNaN(parsed.getTime()))
          throw new ApiError(400, "Invalid startDate format");
        updateData.startDate = parsed;
      }
    }

    if (endDate !== undefined) {
      if (endDate === null) updateData.endDate = null;
      else {
        const parsed = new Date(endDate);
        if (isNaN(parsed.getTime()))
          throw new ApiError(400, "Invalid endDate format");
        updateData.endDate = parsed;
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new ApiError(400, "No fields provided to update");
    }

    const updated = await db.userProject.update({
      where: { id: projectId },
      data: updateData,
    });

    return updated;
  },
  deleteProject: async ({ userId, projectId }) => {
    if (!userId) throw new ApiError(401, "Unauthorized");
    if (!projectId) throw new ApiError(400, "Project id is required");

    const project = await db.userProject.findFirst({
      where: { id: projectId, userId },
      select: { id: true },
    });
    if (!project) throw new ApiError(404, "Project not found");

    await db.userProject.delete({
      where: { id: projectId },
    });

    return { message: "Project deleted successfully" };
  },

  upsertStudentProfile: async ({
    userId,
    isLookingForIntern,
    internshipInterests,
    careerGoals,
    preferredIndustries,
  }) => {
    await ensureUserHasRole(userId, "STUDENT");

    const data = {};
    if (isLookingForIntern !== undefined)
      data.isLookingForIntern = isLookingForIntern;

    if (internshipInterests !== undefined) {
      if (!Array.isArray(internshipInterests))
        throw new ApiError(400, "internshipInterests must be an array");
      data.internshipInterests = internshipInterests;
    }

    if (careerGoals !== undefined) data.careerGoals = careerGoals;

    if (preferredIndustries !== undefined) {
      if (!Array.isArray(preferredIndustries))
        throw new ApiError(400, "preferredIndustries must be an array");
      data.preferredIndustries = preferredIndustries;
    }

    if (Object.keys(data).length === 0) {
      throw new ApiError(400, "No fields provided to update");
    }

    return db.studentProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  },
  upsertProfessionalProfile: async ({
    userId,
    openToOpportunities,
    lookingFor,
    preferredRoles,
    preferredLocations,
    salaryExpectation,
    currency,
    noticePeriod,
    willingToRelocate,
    remotePreference,
  }) => {
    await ensureUserHasRole(userId, "PROFESSIONAL");

    const data = {};

    if (openToOpportunities !== undefined)
      data.openToOpportunities = openToOpportunities;

    if (lookingFor !== undefined) {
      if (!Array.isArray(lookingFor))
        throw new ApiError(400, "lookingFor must be an array");
      data.lookingFor = lookingFor;
    }

    if (preferredRoles !== undefined) {
      if (!Array.isArray(preferredRoles))
        throw new ApiError(400, "preferredRoles must be an array");
      data.preferredRoles = preferredRoles;
    }

    if (preferredLocations !== undefined) {
      if (!Array.isArray(preferredLocations))
        throw new ApiError(400, "preferredLocations must be an array");
      data.preferredLocations = preferredLocations;
    }

    if (salaryExpectation !== undefined)
      data.salaryExpectation = salaryExpectation;

    if (currency !== undefined) data.currency = currency;
    if (noticePeriod !== undefined) data.noticePeriod = noticePeriod;
    if (willingToRelocate !== undefined)
      data.willingToRelocate = willingToRelocate;
    if (remotePreference !== undefined)
      data.remotePreference = remotePreference;

    if (Object.keys(data).length === 0) {
      throw new ApiError(400, "No fields provided to update");
    }

    return db.professionalProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  },

  getMyProfileVisitors: async ({ userId, page = 1, limit = 10 }) => {
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const { skip, take } = buildQueryOptions({
      page,
      limit,
      sortBy: "visitedAt",
      order: "desc",
    });

    const visits = await db.entityVisit.findMany({
      where: {
        entityType: "USER_PROFILE",
        entityId: userId,
      },
      orderBy: { visitedAt: "desc" },
      distinct: ["viewerId", "ipAddress"],
      skip,
      take,
      include: {
        viewer: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
          },
        },
      },
    });

    return visits.map((v) => ({
      visitedAt: v.visitedAt,
      isAnonymous: !v.viewerId,
      viewer: v.viewer
        ? {
            id: v.viewer.id,
            username: v.viewer.username,
            name: `${v.viewer.firstName} ${v.viewer.lastName}`,
            profilePhoto: v.viewer.profilePhoto,
          }
        : null,
    }));
  },
  profileInsights: async ({ userId }) => {
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    const today = startOfDay(new Date());
    const last30Days = subDays(today, 30);

    const [totalVisits, todayVisits, visitsLast30Days, dailyTrend] =
      await Promise.all([
        db.entityVisit.count({
          where: {
            entityType: "USER_PROFILE",
            entityId: userId,
          },
        }),

        db.entityVisit.count({
          where: {
            entityType: "USER_PROFILE",
            entityId: userId,
            visitedAt: { gte: today },
          },
        }),

        db.entityVisit.findMany({
          where: {
            entityType: "USER_PROFILE",
            entityId: userId,
            visitedAt: { gte: last30Days },
          },
          distinct: ["viewerId", "ipAddress"],
          select: {
            viewerId: true,
            ipAddress: true,
          },
        }),

        db.entityVisit.groupBy({
          by: ["visitDate"],
          where: {
            entityType: "USER_PROFILE",
            entityId: userId,
            visitedAt: { gte: last30Days },
          },
          _count: { _all: true },
          orderBy: { visitDate: "asc" },
        }),
      ]);

    return {
      totals: {
        totalVisits,
        todayVisits,
        uniqueLast30Days: visitsLast30Days.length,
      },
      trend: dailyTrend.map((d) => ({
        date: d.visitDate,
        visits: d._count._all,
      })),
    };
  },

  updateRoleVisibility: async ({ userId, roleType, isPublic }) => {
    if (!userId) {
      throw new ApiError(401, "Unauthorized");
    }

    if (typeof isPublic !== "boolean") {
      throw new ApiError(400, "isPublic must be boolean");
    }

    const role = await db.userRole.findUnique({
      where: {
        userId_roleType: {
          userId,
          roleType,
        },
      },
    });

    if (!role) {
      throw new ApiError(404, "Role not found");
    }

    if (role.isPrimary && !isPublic) {
      throw new ApiError(400, "Primary role cannot be hidden");
    }

    if (!isPublic) {
      const publicRoles = await db.userRole.count({
        where: {
          userId,
          isPublic: true,
        },
      });

      if (publicRoles <= 1) {
        throw new ApiError(400, "At least one role must remain public");
      }
    }

    return await db.userRole.update({
      where: {
        id: role.id,
      },
      data: {
        isPublic,
      },
    });
  },
};
