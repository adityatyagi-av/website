import db from "../../../db/db.js";
import { ApiError } from "../../../utils/ApiError.js";
import { generateMeetingRoomId, generateJitsiToken, generateMeetingUrl, getMeetingConfig } from "../../../utils/mentor/jitsi.js";
import { checkEventPermission } from "../../../utils/eventHelpers.js";

function getParticipantRole(event, userId, organizer) {
  if (event.authorId === userId) return "HOST";
  if (organizer) {
    if (organizer.role === "co_host") return "CO_HOST";
    if (organizer.role === "moderator") return "MODERATOR";
    if (organizer.role === "speaker") return "SPEAKER";
  }
  return "PARTICIPANT";
}

export const EventLiveService = {
  getJoinInfo: async (userId, eventId) => {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: {
        id: true, title: true, authorId: true, pageId: true, status: true,
        format: true, meetingRoomId: true, meetingUrl: true, liveStatus: true,
        startDate: true, endDate: true, maxLiveParticipants: true, liveViewerCount: true,
      },
    });
    if (!event) throw new ApiError(404, "Event not found");
    if (event.status !== "PUBLISHED" && event.status !== "COMPLETED") {
      throw new ApiError(400, "Event is not available for joining");
    }
    if (event.format === "IN_PERSON") throw new ApiError(400, "This is an in-person event");

    const isHost = await checkEventPermission(event, userId);

    if (!isHost) {
      const reg = await db.eventRegistration.findUnique({
        where: { eventId_userId: { eventId, userId } },
        select: { status: true },
      });
      if (!reg || !["CONFIRMED", "ATTENDED"].includes(reg.status)) {
        throw new ApiError(403, "You must be registered and confirmed to join this event");
      }
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    const organizer = await db.eventOrganizer.findFirst({
      where: { eventId, userId },
      select: { role: true },
    });

    const role = getParticipantRole(event, userId, organizer);
    const roomId = event.meetingRoomId || generateMeetingRoomId(`event-${eventId}`);
    const isModerator = ["HOST", "CO_HOST", "MODERATOR"].includes(role);

    const token = generateJitsiToken({
      sessionId: `event-${eventId}`,
      roomId,
      userId: user.id,
      userName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      userEmail: user.email,
      role: isModerator ? "MENTOR" : "MENTEE",
      duration: 360,
    });

    const meetingUrl = token ? generateMeetingUrl(roomId, token) : generateMeetingUrl(roomId);
    const config = getMeetingConfig(`event-${eventId}`);

    const baseToolbar = ["microphone", "camera", "chat", "raisehand", "participants-pane", "tileview", "hangup"];
    const moderatorToolbar = [...baseToolbar, "recording", "mute-everyone", "desktop", "security"];

    return {
      eventId,
      meetingRoomId: roomId,
      meetingUrl,
      jitsiConfig: {
        domain: config.domain,
        roomName: roomId,
        jwt: token,
        userInfo: {
          displayName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          email: user.email,
        },
        configOverwrite: {
          startWithAudioMuted: !isModerator,
          startWithVideoMuted: !isModerator,
          prejoinPageEnabled: true,
          disableDeepLinking: true,
          maxFullResolutionParticipants: 5,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: isModerator ? moderatorToolbar : baseToolbar,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
        },
      },
      role,
      isLive: event.liveStatus === "LIVE",
      viewerCount: event.liveViewerCount,
      event: { title: event.title, startDate: event.startDate, endDate: event.endDate },
    };
  },

  startLiveEvent: async (userId, eventId) => {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, authorId: true, pageId: true, status: true, liveStatus: true, format: true },
    });
    if (!event) throw new ApiError(404, "Event not found");
    if (event.status !== "PUBLISHED") throw new ApiError(400, "Event must be published to go live");
    if (event.format === "IN_PERSON") throw new ApiError(400, "In-person events cannot go live");
    if (event.liveStatus === "LIVE") throw new ApiError(400, "Event is already live");

    const hasPermission = await checkEventPermission(event, userId);
    if (!hasPermission) throw new ApiError(403, "Only the host can start a live event");

    const roomId = generateMeetingRoomId(`event-${eventId}`);
    const meetingUrl = generateMeetingUrl(roomId);

    return db.$transaction(async (tx) => {
      const liveSession = await tx.eventLiveSession.create({
        data: { eventId, startedAt: new Date() },
      });

      await tx.event.update({
        where: { id: eventId },
        data: {
          isLive: true,
          liveStatus: "LIVE",
          meetingRoomId: roomId,
          meetingUrl,
          liveViewerCount: 0,
        },
      });

      return { liveSessionId: liveSession.id, meetingRoomId: roomId, meetingUrl };
    });
  },

  endLiveEvent: async (userId, eventId) => {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, authorId: true, pageId: true, liveStatus: true },
    });
    if (!event) throw new ApiError(404, "Event not found");
    if (event.liveStatus !== "LIVE" && event.liveStatus !== "PAUSED") {
      throw new ApiError(400, "Event is not currently live");
    }

    const hasPermission = await checkEventPermission(event, userId);
    if (!hasPermission) throw new ApiError(403, "Only the host can end a live event");

    return db.$transaction(async (tx) => {
      const activeSession = await tx.eventLiveSession.findFirst({
        where: { eventId, endedAt: null },
        orderBy: { startedAt: "desc" },
      });

      if (activeSession) {
        const duration = Math.round((Date.now() - new Date(activeSession.startedAt).getTime()) / 60000);
        await tx.eventLiveSession.update({
          where: { id: activeSession.id },
          data: { endedAt: new Date(), duration },
        });
      }

      await tx.eventLiveParticipant.updateMany({
        where: { liveSessionId: activeSession?.id, leftAt: null },
        data: { leftAt: new Date() },
      });

      await tx.event.update({
        where: { id: eventId },
        data: { isLive: false, liveStatus: "ENDED", liveViewerCount: 0 },
      });

      return { message: "Live event ended" };
    });
  },

  pauseLiveEvent: async (userId, eventId) => {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, authorId: true, pageId: true, liveStatus: true },
    });
    if (!event) throw new ApiError(404, "Event not found");
    if (event.liveStatus !== "LIVE") throw new ApiError(400, "Event is not currently live");

    const hasPermission = await checkEventPermission(event, userId);
    if (!hasPermission) throw new ApiError(403, "Only the host can pause");

    await db.event.update({ where: { id: eventId }, data: { liveStatus: "PAUSED" } });
    return { message: "Live event paused" };
  },

  resumeLiveEvent: async (userId, eventId) => {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, authorId: true, pageId: true, liveStatus: true },
    });
    if (!event) throw new ApiError(404, "Event not found");
    if (event.liveStatus !== "PAUSED") throw new ApiError(400, "Event is not paused");

    const hasPermission = await checkEventPermission(event, userId);
    if (!hasPermission) throw new ApiError(403, "Only the host can resume");

    await db.event.update({ where: { id: eventId }, data: { liveStatus: "LIVE" } });
    return { message: "Live event resumed" };
  },

  joinLiveSession: async (userId, eventId) => {
    const event = await db.event.findUnique({
      where: { id: eventId },
      select: { id: true, liveStatus: true },
    });
    if (!event || event.liveStatus !== "LIVE") throw new ApiError(400, "Event is not live");

    const activeSession = await db.eventLiveSession.findFirst({
      where: { eventId, endedAt: null },
      orderBy: { startedAt: "desc" },
    });
    if (!activeSession) throw new ApiError(400, "No active live session");

    const organizer = await db.eventOrganizer.findFirst({
      where: { eventId, userId },
      select: { role: true },
    });

    let role = "PARTICIPANT";
    if (organizer) {
      const roleMap = { host: "HOST", co_host: "CO_HOST", moderator: "MODERATOR", speaker: "SPEAKER" };
      role = roleMap[organizer.role] || "PARTICIPANT";
    }

    const existingParticipant = await db.eventLiveParticipant.findFirst({
      where: { liveSessionId: activeSession.id, userId, leftAt: null },
    });

    if (!existingParticipant) {
      await db.eventLiveParticipant.create({
        data: { liveSessionId: activeSession.id, userId, role },
      });

      await db.$transaction([
        db.eventLiveSession.update({
          where: { id: activeSession.id },
          data: { totalJoins: { increment: 1 } },
        }),
        db.event.update({
          where: { id: eventId },
          data: { liveViewerCount: { increment: 1 } },
        }),
      ]);

      const updatedEvent = await db.event.findUnique({
        where: { id: eventId },
        select: { liveViewerCount: true },
      });
      if (updatedEvent.liveViewerCount > activeSession.peakViewers) {
        await db.eventLiveSession.update({
          where: { id: activeSession.id },
          data: { peakViewers: updatedEvent.liveViewerCount },
        });
      }
    }

    return { liveSessionId: activeSession.id, role };
  },

  leaveLiveSession: async (userId, eventId) => {
    const activeSession = await db.eventLiveSession.findFirst({
      where: { eventId, endedAt: null },
      orderBy: { startedAt: "desc" },
    });
    if (!activeSession) return;

    const participant = await db.eventLiveParticipant.findFirst({
      where: { liveSessionId: activeSession.id, userId, leftAt: null },
    });

    if (participant) {
      await db.eventLiveParticipant.update({
        where: { id: participant.id },
        data: { leftAt: new Date() },
      });

      await db.event.update({
        where: { id: eventId },
        data: { liveViewerCount: { decrement: 1 } },
      });
    }
  },

  getLiveSessionHistory: async (eventId) => {
    return db.eventLiveSession.findMany({
      where: { eventId },
      orderBy: { startedAt: "desc" },
      include: {
        _count: { select: { participants: true } },
      },
    });
  },
};
