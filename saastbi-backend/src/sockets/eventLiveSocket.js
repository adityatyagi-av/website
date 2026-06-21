import jwt from "jsonwebtoken";
import db from "../db/db.js";
import { EventLiveService } from "../services/ecosystem/event/event-live.service.js";

const ACCESS_SECRET = process.env.ACCESS_SECRET;
const userSockets = new Map();

export const initializeEventLiveSocket = (io) => {
  const eventNamespace = io.of("/events");

  eventNamespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(" ")[1];
      if (!token) return next(new Error("Authentication required"));

      const decoded = jwt.verify(token, ACCESS_SECRET);
      const user = await db.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, firstName: true, lastName: true, email: true, profilePhoto: true },
      });
      if (!user) return next(new Error("User not found"));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  eventNamespace.on("connection", (socket) => {
    userSockets.set(socket.user.id, socket.id);
    socket.join(`user:${socket.user.id}`);

    socket.on("join-live", async (data) => {
      try {
        const { eventId } = data;
        const result = await EventLiveService.joinLiveSession(socket.user.id, eventId);

        socket.join(`live:${eventId}`);
        socket.eventId = eventId;

        socket.emit("joined-live", { success: true, role: result.role });

        const event = await db.event.findUnique({
          where: { id: eventId },
          select: { liveViewerCount: true },
        });

        eventNamespace.to(`live:${eventId}`).emit("viewer-count", {
          eventId,
          count: event.liveViewerCount,
        });
      } catch (err) {
        socket.emit("error", { message: err.message || "Failed to join live event" });
      }
    });

    socket.on("leave-live", async (data) => {
      try {
        const eventId = data?.eventId || socket.eventId;
        if (!eventId) return;

        await EventLiveService.leaveLiveSession(socket.user.id, eventId);
        socket.leave(`live:${eventId}`);

        const event = await db.event.findUnique({
          where: { id: eventId },
          select: { liveViewerCount: true },
        });

        eventNamespace.to(`live:${eventId}`).emit("viewer-count", {
          eventId,
          count: event?.liveViewerCount || 0,
        });
      } catch (err) {
        console.error("leave-live error:", err.message);
      }
    });

    socket.on("live-chat", (data) => {
      const { eventId, message } = data;
      if (!eventId || !message) return;

      eventNamespace.to(`live:${eventId}`).emit("live-chat-message", {
        userId: socket.user.id,
        userName: `${socket.user.firstName || ""} ${socket.user.lastName || ""}`.trim(),
        profilePhoto: socket.user.profilePhoto,
        message,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("create-poll", async (data) => {
      try {
        const { eventId, question, options } = data;
        if (!eventId || !question || !options) return;

        const event = await db.event.findUnique({
          where: { id: eventId },
          select: { authorId: true },
        });
        if (event.authorId !== socket.user.id) {
          return socket.emit("error", { message: "Only the host can create polls" });
        }

        const poll = await db.eventPoll.create({
          data: { eventId, question, options },
        });

        eventNamespace.to(`live:${eventId}`).emit("new-poll", {
          pollId: poll.id,
          question: poll.question,
          options: poll.options,
          totalVotes: 0,
        });
      } catch (err) {
        socket.emit("error", { message: err.message || "Failed to create poll" });
      }
    });

    socket.on("vote-poll", async (data) => {
      try {
        const { pollId, selectedOption } = data;
        if (!pollId || selectedOption === undefined) return;

        const poll = await db.eventPoll.findUnique({ where: { id: pollId } });
        if (!poll || !poll.isActive) return;

        const existing = await db.eventPollVote.findUnique({
          where: { pollId_userId: { pollId, userId: socket.user.id } },
        });
        if (existing) return socket.emit("error", { message: "Already voted" });

        await db.$transaction([
          db.eventPollVote.create({ data: { pollId, userId: socket.user.id, selectedOption } }),
          db.eventPoll.update({ where: { id: pollId }, data: { totalVotes: { increment: 1 } } }),
        ]);

        const votes = await db.eventPollVote.groupBy({
          by: ["selectedOption"],
          where: { pollId },
          _count: { id: true },
        });

        const updatedPoll = await db.eventPoll.findUnique({ where: { id: pollId } });

        eventNamespace.to(`live:${poll.eventId}`).emit("poll-update", {
          pollId,
          totalVotes: updatedPoll.totalVotes,
          results: votes.map((v) => ({ option: v.selectedOption, count: v._count.id })),
        });
      } catch (err) {
        socket.emit("error", { message: err.message || "Failed to vote" });
      }
    });

    socket.on("end-poll", async (data) => {
      try {
        const { pollId } = data;
        const poll = await db.eventPoll.findUnique({ where: { id: pollId } });
        if (!poll) return;

        const event = await db.event.findUnique({
          where: { id: poll.eventId },
          select: { authorId: true },
        });
        if (event.authorId !== socket.user.id) return;

        await db.eventPoll.update({
          where: { id: pollId },
          data: { isActive: false, endedAt: new Date() },
        });

        const votes = await db.eventPollVote.groupBy({
          by: ["selectedOption"],
          where: { pollId },
          _count: { id: true },
        });

        eventNamespace.to(`live:${poll.eventId}`).emit("poll-ended", {
          pollId,
          totalVotes: poll.totalVotes,
          results: votes.map((v) => ({ option: v.selectedOption, count: v._count.id })),
        });
      } catch (err) {
        socket.emit("error", { message: err.message || "Failed to end poll" });
      }
    });

    socket.on("qa-submit", async (data) => {
      try {
        const { eventId, question } = data;
        if (!eventId || !question) return;

        const q = await db.eventQuestion.create({
          data: { eventId, userId: socket.user.id, question },
        });

        eventNamespace.to(`live:${eventId}`).emit("new-question", {
          id: q.id,
          question: q.question,
          userId: socket.user.id,
          userName: `${socket.user.firstName || ""} ${socket.user.lastName || ""}`.trim(),
          profilePhoto: socket.user.profilePhoto,
          upvoteCount: 0,
          isPinned: false,
          isAnswered: false,
          timestamp: q.createdAt,
        });
      } catch (err) {
        socket.emit("error", { message: err.message || "Failed to submit question" });
      }
    });

    socket.on("qa-answer", async (data) => {
      try {
        const { questionId, answer, eventId } = data;
        if (!questionId || !answer) return;

        const event = await db.event.findUnique({
          where: { id: eventId },
          select: { authorId: true },
        });
        if (event.authorId !== socket.user.id) return;

        const q = await db.eventQuestion.update({
          where: { id: questionId },
          data: { answer, answeredById: socket.user.id, isAnswered: true },
        });

        eventNamespace.to(`live:${eventId}`).emit("question-answered", {
          id: q.id,
          answer: q.answer,
          answeredBy: `${socket.user.firstName || ""} ${socket.user.lastName || ""}`.trim(),
        });
      } catch (err) {
        socket.emit("error", { message: err.message || "Failed to answer question" });
      }
    });

    socket.on("qa-upvote", async (data) => {
      try {
        const { questionId, eventId } = data;
        const q = await db.eventQuestion.update({
          where: { id: questionId },
          data: { upvoteCount: { increment: 1 } },
        });

        eventNamespace.to(`live:${eventId}`).emit("question-upvoted", {
          id: q.id,
          upvoteCount: q.upvoteCount,
        });
      } catch (err) {
        console.error("qa-upvote error:", err.message);
      }
    });

    socket.on("disconnect", async () => {
      userSockets.delete(socket.user.id);

      if (socket.eventId) {
        try {
          await EventLiveService.leaveLiveSession(socket.user.id, socket.eventId);

          const event = await db.event.findUnique({
            where: { id: socket.eventId },
            select: { liveViewerCount: true },
          });

          if (event) {
            eventNamespace.to(`live:${socket.eventId}`).emit("viewer-count", {
              eventId: socket.eventId,
              count: event.liveViewerCount,
            });
          }
        } catch (err) {
          console.error("disconnect cleanup error:", err.message);
        }
      }
    });
  });

  return eventNamespace;
};

export const notifyEventUsers = (io, eventId, event, data) => {
  const eventNamespace = io.of("/events");
  eventNamespace.to(`live:${eventId}`).emit(event, data);
};
