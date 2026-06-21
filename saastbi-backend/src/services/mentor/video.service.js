import db from "../../db/db.js";
import { ApiError } from "../../utils/ApiError.js";
import {
  generateJitsiToken,
  generateMeetingUrl,
  getMeetingConfig,
} from "../../utils/mentor/jitsi.js";

export const VideoService = {
  getJoinInfo: async (userId, sessionId) => {
    const session = await db.mentorSession.findUnique({
      where: { id: sessionId },
      include: {
        mentor: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        menteeUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        menteeStartup: {
          select: { id: true, name: true },
        },
      },
    });

    if (!session) {
      throw new ApiError(404, "Session not found");
    }

    const isMentor = session.mentor.userId === userId;
    const isMentee =
      session.userId === userId ||
      (session.startupId &&
        (await db.startupMember.findFirst({
          where: { startupId: session.startupId, userId, isActive: true },
        })));

    if (!isMentor && !isMentee) {
      throw new ApiError(403, "Not authorized to join this session");
    }

    if (!["CONFIRMED", "IN_PROGRESS"].includes(session.status)) {
      throw new ApiError(400, `Cannot join session with status ${session.status}`);
    }

    const now = new Date();
    const sessionStart = new Date(session.startTime);
    const sessionEnd = new Date(session.endTime);
    const joinWindowStart = new Date(sessionStart.getTime() - 10 * 60 * 1000);

    if (now < joinWindowStart) {
      throw new ApiError(400, "Session is not ready to join yet. You can join 10 minutes before the scheduled time.");
    }

    if (now > sessionEnd && session.status !== "IN_PROGRESS") {
      throw new ApiError(400, "Session has ended");
    }

    let participant;
    let role;

    if (isMentor) {
      participant = session.mentor.user;
      role = "MENTOR";
    } else {
      participant = session.menteeUser || { id: userId, firstName: "Startup", lastName: "Member" };
      role = "MENTEE";
    }

    const config = getMeetingConfig(sessionId);
    const token = generateJitsiToken({
      sessionId,
      roomId: session.meetingRoomId || config.roomId,
      userId: participant.id,
      userName: `${participant.firstName} ${participant.lastName}`,
      userEmail: participant.email,
      role,
      duration: session.duration + 30,
    });

    const meetingUrl = token
      ? generateMeetingUrl(session.meetingRoomId || config.roomId, token)
      : generateMeetingUrl(session.meetingRoomId || config.roomId);

    return {
      sessionId,
      meetingRoomId: session.meetingRoomId || config.roomId,
      meetingUrl,
      jitsiConfig: {
        domain: config.domain,
        roomName: session.meetingRoomId || config.roomId,
        jwt: token,
        userInfo: {
          displayName: `${participant.firstName} ${participant.lastName}`,
          email: participant.email,
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          prejoinPageEnabled: true,
          disableDeepLinking: true,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [
            "microphone",
            "camera",
            "desktop",
            "chat",
            "raisehand",
            "participants-pane",
            "tileview",
            "hangup",
            ...(role === "MENTOR" ? ["recording"] : []),
          ],
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
        },
      },
      role,
      session: {
        title: session.title,
        duration: session.duration,
        startTime: session.startTime,
        endTime: session.endTime,
        agenda: session.agenda,
      },
    };
  },

  startSession: async (userId, sessionId) => {
    const session = await db.mentorSession.findUnique({
      where: { id: sessionId },
      include: { mentor: true },
    });

    if (!session) {
      throw new ApiError(404, "Session not found");
    }

    if (session.mentor.userId !== userId) {
      throw new ApiError(403, "Only the mentor can start the session");
    }

    if (session.status === "IN_PROGRESS") {
      return session;
    }

    if (session.status !== "CONFIRMED") {
      throw new ApiError(400, `Cannot start session with status ${session.status}`);
    }

    const updated = await db.mentorSession.update({
      where: { id: sessionId },
      data: {
        status: "IN_PROGRESS",
        actualStartTime: new Date(),
      },
    });

    return updated;
  },

  endSession: async (userId, sessionId) => {
    const session = await db.mentorSession.findUnique({
      where: { id: sessionId },
      include: { mentor: true },
    });

    if (!session) {
      throw new ApiError(404, "Session not found");
    }

    if (session.mentor.userId !== userId) {
      throw new ApiError(403, "Only the mentor can end the session");
    }

    if (session.status !== "IN_PROGRESS") {
      throw new ApiError(400, `Cannot end session with status ${session.status}`);
    }

    const actualEndTime = new Date();
    const actualStartTime = session.actualStartTime || session.startTime;
    const actualDuration = Math.round((actualEndTime - actualStartTime) / (1000 * 60));

    const updated = await db.mentorSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        actualEndTime,
        actualDuration,
      },
    });

    return updated;
  },

  startRecording: async (userId, sessionId) => {
    const session = await db.mentorSession.findUnique({
      where: { id: sessionId },
      include: { mentor: true },
    });

    if (!session) {
      throw new ApiError(404, "Session not found");
    }

    if (session.mentor.userId !== userId) {
      throw new ApiError(403, "Only the mentor can start recording");
    }

    if (session.status !== "IN_PROGRESS") {
      throw new ApiError(400, "Can only record sessions that are in progress");
    }

    return {
      success: true,
      message: "Recording started. This is handled by Jitsi/Jibri.",
      sessionId,
    };
  },

  stopRecording: async (userId, sessionId) => {
    const session = await db.mentorSession.findUnique({
      where: { id: sessionId },
      include: { mentor: true },
    });

    if (!session) {
      throw new ApiError(404, "Session not found");
    }

    if (session.mentor.userId !== userId) {
      throw new ApiError(403, "Only the mentor can stop recording");
    }

    return {
      success: true,
      message: "Recording stopped",
      sessionId,
    };
  },

  getRecordings: async (userId, sessionId) => {
    const session = await db.mentorSession.findUnique({
      where: { id: sessionId },
      include: { mentor: true },
    });

    if (!session) {
      throw new ApiError(404, "Session not found");
    }

    const isMentor = session.mentor.userId === userId;
    const isMentee =
      session.userId === userId ||
      (session.startupId &&
        (await db.startupMember.findFirst({
          where: { startupId: session.startupId, userId, isActive: true },
        })));

    if (!isMentor && !isMentee) {
      throw new ApiError(403, "Not authorized");
    }

    const recordings = await db.sessionRecording.findMany({
      where: { sessionId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        recordingUrl: true,
        duration: true,
        fileSize: true,
        format: true,
        status: true,
        isPremiumRecording: true,
        createdAt: true,
      },
    });

    return recordings;
  },

  saveRecording: async (sessionId, recordingData) => {
    const session = await db.mentorSession.findUnique({
      where: { id: sessionId },
      include: { mentor: true },
    });

    if (!session) {
      throw new ApiError(404, "Session not found");
    }

    const recording = await db.sessionRecording.create({
      data: {
        sessionId,
        recordingUrl: recordingData.url,
        duration: recordingData.duration,
        fileSize: recordingData.fileSize,
        format: recordingData.format || "webm",
        recordedBy: session.mentor.userId,
        status: "READY",
        isPremiumRecording: true,
      },
    });

    return recording;
  },
};
