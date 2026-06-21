import db from "../../db/db.js";
import { ApiError } from "../../utils/ApiError.js";

export const SessionTypeService = {
  create: async (userId, data) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const existingCount = await db.sessionType.count({
      where: { mentorId: profile.id },
    });

    if (existingCount >= 10) {
      throw new ApiError(400, "Maximum 10 session types allowed");
    }

    const sessionType = await db.sessionType.create({
      data: {
        mentorId: profile.id,
        ...data,
      },
    });

    return sessionType;
  },

  getOwn: async (userId) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const sessionTypes = await db.sessionType.findMany({
      where: { mentorId: profile.id },
      orderBy: { createdAt: "asc" },
    });

    return sessionTypes;
  },

  getByMentor: async (mentorId) => {
    const profile = await db.mentorProfile.findUnique({
      where: { id: mentorId },
      select: { id: true, isAccepting: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor not found");
    }

    const sessionTypes = await db.sessionType.findMany({
      where: { mentorId, isActive: true },
      orderBy: { price: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        duration: true,
        price: true,
        currency: true,
      },
    });

    return {
      sessionTypes,
      isAcceptingBookings: profile.isAccepting,
    };
  },

  update: async (userId, sessionTypeId, data) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const sessionType = await db.sessionType.findUnique({
      where: { id: sessionTypeId },
    });

    if (!sessionType) {
      throw new ApiError(404, "Session type not found");
    }

    if (sessionType.mentorId !== profile.id) {
      throw new ApiError(403, "Not authorized to update this session type");
    }

    const updated = await db.sessionType.update({
      where: { id: sessionTypeId },
      data,
    });

    return updated;
  },

  delete: async (userId, sessionTypeId) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const sessionType = await db.sessionType.findUnique({
      where: { id: sessionTypeId },
    });

    if (!sessionType) {
      throw new ApiError(404, "Session type not found");
    }

    if (sessionType.mentorId !== profile.id) {
      throw new ApiError(403, "Not authorized to delete this session type");
    }

    const upcomingSessions = await db.mentorSession.count({
      where: {
        sessionTypeId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startTime: { gte: new Date() },
      },
    });

    if (upcomingSessions > 0) {
      throw new ApiError(
        400,
        `Cannot delete session type with ${upcomingSessions} upcoming sessions`
      );
    }

    await db.sessionType.delete({
      where: { id: sessionTypeId },
    });

    return { success: true };
  },

  toggle: async (userId, sessionTypeId) => {
    const profile = await db.mentorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new ApiError(404, "Mentor profile not found");
    }

    const sessionType = await db.sessionType.findUnique({
      where: { id: sessionTypeId },
    });

    if (!sessionType) {
      throw new ApiError(404, "Session type not found");
    }

    if (sessionType.mentorId !== profile.id) {
      throw new ApiError(403, "Not authorized to modify this session type");
    }

    const updated = await db.sessionType.update({
      where: { id: sessionTypeId },
      data: { isActive: !sessionType.isActive },
    });

    return updated;
  },
};
