import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";

const jobListingInclude = {
  page: {
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      type: true,
      teamSize: true,
      sector: true,
    },
  },
  category: { select: { id: true, name: true, slug: true } },
  _count: {
    select: {
      applications: true,
      bookmarks: true,
    },
  },
};

function anonymizeApplicantCount(count) {
  if (count === 0) return "No applicants yet";
  if (count <= 10) return "1-10";
  if (count <= 50) return "10-50";
  if (count <= 100) return "50-100";
  if (count <= 200) return "100-200";
  return "200+";
}

function computeMatchScore(userProfile, job) {
  let score = 0;
  const breakdown = {};

  const userSkillNames = (userProfile.skills || []).map((s) =>
    (s.skill?.name || s.name || "").toLowerCase(),
  );
  const requiredSkills = (job.requiredSkills || job.skills || []).map((s) =>
    s.toLowerCase(),
  );
  const niceToHaveSkills = (job.niceToHaveSkills || []).map((s) =>
    s.toLowerCase(),
  );

  if (requiredSkills.length > 0) {
    const matched = requiredSkills.filter((s) => userSkillNames.includes(s));
    const skillScore = (matched.length / requiredSkills.length) * 40;
    score += skillScore;
    breakdown.skills = {
      score: Math.round(skillScore),
      matched: matched.length,
      total: requiredSkills.length,
    };
  } else {
    score += 20;
    breakdown.skills = {
      score: 20,
      matched: 0,
      total: 0,
      note: "No specific skills required",
    };
  }

  if (niceToHaveSkills.length > 0) {
    const matched = niceToHaveSkills.filter((s) => userSkillNames.includes(s));
    const bonusScore = (matched.length / niceToHaveSkills.length) * 10;
    score += bonusScore;
    breakdown.bonusSkills = {
      score: Math.round(bonusScore),
      matched: matched.length,
      total: niceToHaveSkills.length,
    };
  }

  const expLevelMap = {
    ENTRY: 0,
    JUNIOR: 1,
    MID: 2,
    SENIOR: 3,
    LEAD: 4,
    EXECUTIVE: 5,
  };
  const userExperiences = userProfile.experiences || [];
  let userLevel = "ENTRY";
  if (userExperiences.length > 0) {
    const totalYears = userExperiences.reduce((sum, exp) => {
      const start = new Date(exp.startDate);
      const end = exp.endDate ? new Date(exp.endDate) : new Date();
      return sum + (end - start) / (1000 * 60 * 60 * 24 * 365);
    }, 0);
    if (totalYears >= 10) userLevel = "EXECUTIVE";
    else if (totalYears >= 7) userLevel = "LEAD";
    else if (totalYears >= 4) userLevel = "SENIOR";
    else if (totalYears >= 2) userLevel = "MID";
    else if (totalYears >= 1) userLevel = "JUNIOR";
  }

  const diff = Math.abs(
    (expLevelMap[userLevel] || 0) - (expLevelMap[job.experienceLevel] || 0),
  );
  let expScore = 0;
  if (diff === 0) expScore = 20;
  else if (diff === 1) expScore = 12;
  else if (diff === 2) expScore = 5;
  score += expScore;
  breakdown.experience = {
    score: expScore,
    userLevel,
    requiredLevel: job.experienceLevel,
  };

  const userLocation = userProfile.location;
  if (job.isRemote || job.workMode === "REMOTE") {
    score += 10;
    breakdown.workMode = { score: 10, note: "Remote job" };
  } else if (userLocation?.city && job.location) {
    const locationMatch =
      job.location.toLowerCase().includes(userLocation.city.toLowerCase()) ||
      (userLocation.country &&
        job.location
          .toLowerCase()
          .includes(userLocation.country.toLowerCase()));
    const locScore = locationMatch ? 10 : 2;
    score += locScore;
    breakdown.workMode = {
      score: locScore,
      userLocation: userLocation.city,
      jobLocation: job.location,
    };
  } else {
    score += 5;
    breakdown.workMode = { score: 5, note: "Location unknown" };
  }

  const userEdu = userProfile.educations || [];
  if (userEdu.length > 0 && job.educationLevel) {
    score += 10;
    breakdown.education = { score: 10, note: "Education meets requirements" };
  } else if (userEdu.length > 0) {
    score += 7;
    breakdown.education = { score: 7, note: "Has education background" };
  } else {
    score += 3;
    breakdown.education = { score: 3 };
  }

  const totalScore = Math.min(Math.round(score), 100);
  return { totalScore, breakdown };
}

export const JobDiscoveryService = {
  computeMatchScore,

  discoverJobs: async (query, userId) => {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 12, 50);
    const skip = (page - 1) * limit;

    const filters = {
      status: "OPEN",
      OR: undefined,
    };

    if (query.search) {
      filters.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
        { skills: { hasSome: [query.search] } },
        { requiredSkills: { hasSome: [query.search] } },
        { department: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const deadlineFilter = {
      OR: [{ deadline: null }, { deadline: { gt: new Date() } }],
    };

    const where = { AND: [filters, deadlineFilter] };
    console.log("USER UD IS", userId);
    if (userId) {
      const appliedJobs = await db.jobApplication.findMany({
        where: { userId },
        select: { jobId: true },
      });
      const appliedIds = appliedJobs.map((a) => a.jobId);
      if (appliedIds.length > 0) {
        where.AND.push({ id: { notIn: appliedIds } });
      }
    }

    if (query.jobType) {
      const types = Array.isArray(query.jobType)
        ? query.jobType
        : [query.jobType];
      where.AND.push({ jobType: { in: types } });
    }
    if (query.workMode) {
      const modes = Array.isArray(query.workMode)
        ? query.workMode
        : [query.workMode];
      where.AND.push({ workMode: { in: modes } });
    }
    if (query.experienceLevel) {
      const levels = Array.isArray(query.experienceLevel)
        ? query.experienceLevel
        : [query.experienceLevel];
      where.AND.push({ experienceLevel: { in: levels } });
    }
    if (query.location) {
      where.AND.push({
        location: { contains: query.location, mode: "insensitive" },
      });
    }
    if (query.isRemote === "true" || query.isRemote === true) {
      where.AND.push({ OR: [{ isRemote: true }, { workMode: "REMOTE" }] });
    }
    if (query.salaryMin) {
      where.AND.push({ salaryMax: { gte: Number(query.salaryMin) } });
    }
    if (query.salaryMax) {
      where.AND.push({ salaryMin: { lte: Number(query.salaryMax) } });
    }
    if (query.skills) {
      const skillList = Array.isArray(query.skills)
        ? query.skills
        : [query.skills];
      where.AND.push({
        OR: [
          { skills: { hasSome: skillList } },
          { requiredSkills: { hasSome: skillList } },
        ],
      });
    }
    if (query.industry) {
      where.AND.push({
        industry: { contains: query.industry, mode: "insensitive" },
      });
    }
    if (query.categoryId) {
      where.AND.push({ categoryId: query.categoryId });
    }
    if (query.pageType) {
      const pageTypes = Array.isArray(query.pageType)
        ? query.pageType
        : [query.pageType];
      where.AND.push({ page: { type: { in: pageTypes } } });
    }
    if (query.postedWithin) {
      const thresholds = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };
      const days = thresholds[query.postedWithin];
      if (days) {
        const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        where.AND.push({ createdAt: { gte: threshold } });
      }
    }

    let orderBy = { createdAt: "desc" };
    if (query.sortBy === "salary_high") orderBy = { salaryMax: "desc" };
    else if (query.sortBy === "salary_low") orderBy = { salaryMin: "asc" };
    else if (query.sortBy === "date") orderBy = { createdAt: "desc" };

    const [jobs, total] = await Promise.all([
      db.job.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: jobListingInclude,
      }),
      db.job.count({ where }),
    ]);

    let enrichedJobs = jobs.map((job) => ({
      ...job,
      applicantRange: anonymizeApplicantCount(job._count.applications),
    }));

    if (userId) {
      const bookmarkedJobIds = await db.jobBookmark.findMany({
        where: { userId, jobId: { in: jobs.map((j) => j.id) } },
        select: { jobId: true },
      });
      const bookmarkedSet = new Set(bookmarkedJobIds.map((b) => b.jobId));

      const appliedJobIds = await db.jobApplication.findMany({
        where: { userId, jobId: { in: jobs.map((j) => j.id) } },
        select: { jobId: true },
      });
      const appliedSet = new Set(appliedJobIds.map((a) => a.jobId));

      enrichedJobs = enrichedJobs.map((job) => ({
        ...job,
        isBookmarked: bookmarkedSet.has(job.id),
        hasApplied: appliedSet.has(job.id),
      }));
    }

    return { jobs: enrichedJobs, total, page, limit };
  },

  getRecommendedJobs: async (userId, query) => {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 12, 50);

    const userProfile = await db.user.findUnique({
      where: { id: userId },
      select: {
        skills: { include: { skill: true } },
        experiences: { orderBy: { startDate: "desc" } },
        educations: true,
        location: true,
        roles: true,
      },
    });

    if (!userProfile) throw new ApiError(404, "User not found");

    const userSkillNames = userProfile.skills.map((s) => s.skill.name);
    const lowerSkills = userSkillNames.map((s) => s.toLowerCase());

    const appliedJobs = await db.jobApplication.findMany({
      where: { userId },
      select: { jobId: true },
    });
    const appliedIds = appliedJobs.map((a) => a.jobId);

    const baseWhere = {
      status: "OPEN",
      OR: [{ deadline: null }, { deadline: { gt: new Date() } }],
      ...(appliedIds.length > 0 && { id: { notIn: appliedIds } }),
    };

    let jobs;

    if (lowerSkills.length > 0) {
      const allVariants = [
        ...new Set([
          ...userSkillNames,
          ...lowerSkills,
          ...userSkillNames.map(
            (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(),
          ),
        ]),
      ];

      const skillMatchedJobs = await db.job.findMany({
        where: {
          ...baseWhere,
          OR: [
            { skills: { hasSome: allVariants } },
            { requiredSkills: { hasSome: allVariants } },
            { niceToHaveSkills: { hasSome: allVariants } },
          ],
        },
        take: 100,
        orderBy: { createdAt: "desc" },
        include: {
          ...jobListingInclude,
          page: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
              type: true,
              teamSize: true,
              sector: true,
            },
          },
        },
      });

      if (skillMatchedJobs.length >= 5) {
        jobs = skillMatchedJobs;
      } else {
        const matchedIds = skillMatchedJobs.map((j) => j.id);
        const fallbackJobs = await db.job.findMany({
          where: {
            ...baseWhere,
            id: { notIn: [...new Set([...matchedIds, ...appliedIds])] },
          },

          take: 100 - skillMatchedJobs.length,
          orderBy: { createdAt: "desc" },
          include: {
            ...jobListingInclude,
            page: {
              select: {
                id: true,
                name: true,
                slug: true,
                logo: true,
                type: true,
                teamSize: true,
                sector: true,
              },
            },
          },
        });
        jobs = [...skillMatchedJobs, ...fallbackJobs];
      }
    } else {
      jobs = await db.job.findMany({
        where: baseWhere,
        take: 100,
        orderBy: { createdAt: "desc" },
        include: {
          ...jobListingInclude,
          page: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
              type: true,
              teamSize: true,
              sector: true,
            },
          },
        },
      });
    }

    const scored = jobs.map((job) => {
      const { totalScore, breakdown } = computeMatchScore(userProfile, job);
      return {
        ...job,
        matchScore: totalScore,
        matchBreakdown: breakdown,
        applicantRange: anonymizeApplicantCount(job._count.applications),
      };
    });

    scored.sort((a, b) => b.matchScore - a.matchScore);
    const paginated = scored.slice((page - 1) * limit, page * limit);

    const bookmarkedJobIds = await db.jobBookmark.findMany({
      where: { userId, jobId: { in: paginated.map((j) => j.id) } },
      select: { jobId: true },
    });
    const bookmarkedSet = new Set(bookmarkedJobIds.map((b) => b.jobId));

    const enriched = paginated.map((job) => ({
      ...job,
      isBookmarked: bookmarkedSet.has(job.id),
      hasApplied: false,
    }));

    return { jobs: enriched, total: scored.length, page, limit };
  },

  getJobBySlug: async (slug, userId, req) => {
    const job = await db.job.findUnique({
      where: { slug },
      include: {
        page: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            type: true,
            teamSize: true,
            sector: true,
            description: true,
            website: true,
            headquarters: true,
            followerCount: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            parent: { select: { id: true, name: true } },
          },
        },
        hiringManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
            headline: true,
          },
        },
        postedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
            headline: true,
          },
        },
        _count: {
          select: {
            applications: true,
            bookmarks: true,
            screeningQuestions: true,
          },
        },
      },
    });

    if (!job) throw new ApiError(404, "Job not found");
    if (job.status === "DRAFT") throw new ApiError(404, "Job not found");

    await db.job.update({
      where: { id: job.id },
      data: { viewCount: { increment: 1 } },
    });

    await db.jobView.create({
      data: {
        jobId: job.id,
        viewerId: userId || null,
        source: req?.query?.source || "direct",
      },
    });

    let userContext = {
      canApply: true,
    };
    if (userId) {
      const [application, bookmark, userProfile] = await Promise.all([
        db.jobApplication.findUnique({
          where: { jobId_userId: { jobId: job.id, userId } },
          select: { id: true, status: true },
        }),
        db.jobBookmark.findUnique({
          where: { userId_jobId: { userId, jobId: job.id } },
          select: { id: true },
        }),
        db.user.findUnique({
          where: { id: userId },
          select: {
            skills: { include: { skill: true } },
            experiences: { orderBy: { startDate: "desc" } },
            educations: true,
            location: true,
          },
        }),
      ]);

      userContext.hasApplied = !!application;
      userContext.applicationStatus = application?.status || null;
      userContext.isBookmarked = !!bookmark;

      const isPoster = job.postedBy?.id === userId;
      const isHiringManager = job.hiringManager?.id === userId;
      userContext.canApply = !(isPoster || isHiringManager);

      if (job.pageId && userContext.canApply) {
        const pageMember = await db.pageMember.findFirst({
          where: {
            pageId: job.pageId,
            userId,
          },
          select: {
            id: true,
          },
        });
      
        if (pageMember) {
          userContext.canApply = false;
        }
      }

      if (userProfile) {
        const { totalScore, breakdown } = computeMatchScore(userProfile, job);
        userContext.matchScore = totalScore;
        userContext.matchBreakdown = breakdown;
      }

      if (job.pageId) {
        const connections = await db.pageMember.findMany({
          where: { pageId: job.pageId },
          select: { userId: true },
        });
        const memberIds = connections
          .map((c) => c.userId)
          .filter((id) => id !== userId);
        if (memberIds.length > 0) {
          const mutualConnections = await db.connection.findMany({
            where: {
              status: "ACCEPTED",
              OR: [
                { senderId: userId, receiverId: { in: memberIds } },
                { receiverId: userId, senderId: { in: memberIds } },
              ],
            },
            include: {
              sender: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  profilePhoto: true,
                  headline: true,
                },
              },
              receiver: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  profilePhoto: true,
                  headline: true,
                },
              },
            },
            take: 5,
          });
          userContext.connectionsAtCompany = mutualConnections.map((c) =>
            c.senderId === userId ? c.receiver : c.sender,
          );
        }
      }
    }

    const similarJobs = await db.job.findMany({
      where: {
        status: "OPEN",
        id: { not: job.id },
        OR: [
          {
            skills: {
              hasSome: job.skills.length > 0 ? job.skills : ["_none_"],
            },
          },
          {
            requiredSkills: {
              hasSome:
                job.requiredSkills.length > 0
                  ? job.requiredSkills
                  : ["_none_"],
            },
          },
          { categoryId: job.categoryId },
          { experienceLevel: job.experienceLevel },
        ],
        AND: [{ OR: [{ deadline: null }, { deadline: { gt: new Date() } }] }],
      },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: jobListingInclude,
    });

    return {
      ...job,
      applicantRange: anonymizeApplicantCount(job._count.applications),
      screeningQuestionCount: job._count.screeningQuestions,
      ...userContext,
      similarJobs,
    };
  },

  getSimilarJobs: async (jobId, query) => {
    const limit = Math.min(Number(query?.limit) || 10, 20);
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        skills: true,
        requiredSkills: true,
        categoryId: true,
        experienceLevel: true,
      },
    });
    if (!job) throw new ApiError(404, "Job not found");

    const allSkills = [...new Set([...job.skills, ...job.requiredSkills])];

    const similar = await db.job.findMany({
      where: {
        status: "OPEN",
        id: { not: jobId },
        OR: [
          {
            skills: {
              hasSome: allSkills.length > 0 ? allSkills : ["_none_"],
            },
          },
          {
            requiredSkills: {
              hasSome: allSkills.length > 0 ? allSkills : ["_none_"],
            },
          },
          ...(job.categoryId ? [{ categoryId: job.categoryId }] : []),
          { experienceLevel: job.experienceLevel },
        ],
        AND: [{ OR: [{ deadline: null }, { deadline: { gt: new Date() } }] }],
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: jobListingInclude,
    });

    return similar;
  },

  getTrendingJobs: async (query,userId) => {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 12, 50);
    const skip = (page - 1) * limit;

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [jobs, total] = await Promise.all([
      db.job.findMany({
        where: {
          status: "OPEN",
          createdAt: { gte: weekAgo },
          OR: [{ deadline: null }, { deadline: { gt: new Date() } }],
        },
        skip,
        take: limit,
        orderBy: [{ viewCount: "desc" }, { applicationCount: "desc" }],
        include: jobListingInclude,
      }),
      db.job.count({
        where: {
          status: "OPEN",
          createdAt: { gte: weekAgo },
          OR: [{ deadline: null }, { deadline: { gt: new Date() } }],
        },
      }),
    ]);

    let bookmarkedSet = new Set();

    if (userId) {
      const bookmarkedJobs = await db.jobBookmark.findMany({
        where: {
          userId,
          jobId: {
            in: jobs.map((j) => j.id),
          },
        },
        select: {
          jobId: true,
        },
      });
      bookmarkedSet = new Set(bookmarkedJobs.map((b) => b.jobId));
    }

    return {
      jobs: jobs.map((job) => ({
        ...job,
        applicantRange: anonymizeApplicantCount(job._count.applications),
        isBookmarked: bookmarkedSet.has(job.id),
      })),
      total,
      page,
      limit,
    };
  },

  getJobsBySkillCount: async (userId) => {
    const user = await db.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        skills: {
          select: {
            skill: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
  
    if (!user) {
      throw new ApiError(404, "User not found");
    }
  
    const userSkills = user.skills.map(({ skill }) => skill.name);
  
    if (userSkills.length === 0) {
      return [];
    }
  
    const jobs = await db.job.findMany({
      where: {
        status: "OPEN",
        OR: [
          { deadline: null },
          { deadline: { gt: new Date() } },
        ],
      },
      select: {
        skills: true,
        requiredSkills: true,
        niceToHaveSkills: true,
      },
    });
  
    const normalizeSkill = (value) =>
      value
        .toLowerCase()
        .replace(/\.js$/i, "")
        .replace(/[^a-z0-9]/g, "");
  
    const result = userSkills.map((skill) => {
      const normalizedSkill = normalizeSkill(skill);
  
      const count = jobs.filter((job) => {
        const allSkills = [
          ...(job.skills || []),
          ...(job.requiredSkills || []),
          ...(job.niceToHaveSkills || []),
        ];
  
        return allSkills.some(
          (jobSkill) =>
            normalizeSkill(jobSkill) === normalizedSkill
        );
      }).length;
  
      return {
        skill,
        count,
      };
    });
  
    return result
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);
  },

  getJobsBySkill: async (skillName, query) => {
      const page = Number(query.page) || 1;
      const limit = Math.min(Number(query.limit) || 12, 50);
      const skip = (page - 1) * limit;
      const normalizedSkill = skillName.trim().toLowerCase();
    
      const where = {
        status: "OPEN",
        AND: [{ OR: [{ deadline: null }, { deadline: { gt: new Date() } }] }],
      };
  
    
      const [jobs, total] = await Promise.all([
        db.job.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, include: jobListingInclude }),
        db.job.count({ where }),
      ]);

      const filteredJobs = jobs.filter((job) => {
        const allSkills = [
          ...(job.skills || []),
          ...(job.requiredSkills || []),
          ...(job.niceToHaveSkills || []),
        ];
      
        return allSkills.some((skill) =>
          skill.toLowerCase().includes(normalizedSkill)
        );
      });
  
    
      return {
        jobs: filteredJobs.map((job) => ({
          ...job,
          applicantRange: anonymizeApplicantCount(
            job._count?.applications ?? 0
          ),
        })),
        total: filteredJobs.length,
        page,
        limit,
      };
    },

  getConnectionsAtCompany: async (userId, jobId) => {
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: { pageId: true },
    });
    if (!job) throw new ApiError(404, "Job not found");
    if (!job.pageId) return [];

    const pageMembers = await db.pageMember.findMany({
      where: { pageId: job.pageId },
      select: { userId: true, role: true },
    });

    const memberIds = pageMembers
      .map((m) => m.userId)
      .filter((id) => id !== userId);
    if (memberIds.length === 0) return [];

    const connections = await db.connection.findMany({
      where: {
        status: "ACCEPTED",
        OR: [
          { senderId: userId, receiverId: { in: memberIds } },
          { receiverId: userId, senderId: { in: memberIds } },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
            headline: true,
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhoto: true,
            headline: true,
          },
        },
      },
    });

    const memberRoleMap = {};
    for (const m of pageMembers) memberRoleMap[m.userId] = m.role;

    return connections.map((c) => {
      const person = c.senderId === userId ? c.receiver : c.sender;
      return { ...person, roleAtCompany: memberRoleMap[person.id] };
    });
  },
};