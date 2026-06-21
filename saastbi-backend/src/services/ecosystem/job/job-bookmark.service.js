import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";

export const JobBookmarkService = {
  toggleBookmark: async (userId, jobId) => {
    const job = await db.job.findUnique({ where: { id: jobId }, select: { id: true, status: true } });
    if (!job) throw new ApiError(404, "Job not found");
    if (job.status === "DRAFT") throw new ApiError(400, "Cannot bookmark a draft job");

    const existing = await db.jobBookmark.findUnique({
      where: { userId_jobId: { userId, jobId } },
      select: { id: true },
    });

    if (existing) {
      await db.jobBookmark.delete({ where: { id: existing.id } });
      return { bookmarked: false };
    }

    await db.jobBookmark.create({ data: { userId, jobId } });
    return { bookmarked: true };
  },

  getBookmarkedJobs: async (userId, query) => {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 12, 50);
    const skip = (page - 1) * limit;

    const [bookmarks, total] = await Promise.all([
      db.jobBookmark.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          job: {
            include: {
              page: {
                select: { id: true, name: true, slug: true, logo: true, type: true },
              },
              category: { select: { id: true, name: true } },
              _count: { select: { applications: true } },
            },
          },
        },
      }),
      db.jobBookmark.count({ where: { userId } }),
    ]);

    const jobs = bookmarks.map((b) => ({
      ...b.job,
      bookmarkedAt: b.createdAt,
      isAvailable: b.job.status === "OPEN" && (!b.job.deadline || new Date(b.job.deadline) > new Date()),
    }));

    return { jobs, total, page, limit };
  },
};
