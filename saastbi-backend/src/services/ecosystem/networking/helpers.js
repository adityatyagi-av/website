import db from "../../../db/db.js";

export const USER_NETWORKING_SELECT = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  profilePhoto: true,
  coverImage: true,
  headline: true,
  bio: true,
  isPremium: true,
  lastActive: true,
  isActive: true,
};

export const USER_BRIEF_SELECT = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  profilePhoto: true,
  headline: true,
};

export const PAGE_BRIEF_SELECT = {
  id: true,
  name: true,
  slug: true,
  type: true,
  tagline: true,
  logo: true,
  coverImage: true,
  sector: true,
  stage: true,
  headquarters: true,
  foundedYear: true,
  teamSize: true,
  website: true,
  followerCount: true,
  isHiring: true,
  openPositions: true,
  verificationStatus: true,
  visibility: true,
  isActive: true,
};

export const buildPagination = (page, limit, total) => ({
  page: parseInt(page),
  limit: parseInt(limit),
  total,
  totalPages: Math.ceil(total / parseInt(limit)),
});

export const getBlockedUserIds = async (userId) => {
  const blocks = await db.userBlock.findMany({
    where: {
      OR: [{ blockerId: userId }, { blockedId: userId }],
    },
    select: { blockerId: true, blockedId: true },
  });

  const ids = new Set();
  blocks.forEach((b) => {
    if (b.blockerId !== userId) ids.add(b.blockerId);
    if (b.blockedId !== userId) ids.add(b.blockedId);
  });
  return [...ids];
};

export const getExcludedConnectionUserIds = async (userId) => {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const connections = await db.connection.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
      AND: [
        {
          OR: [
            { status: { in: ["ACCEPTED", "PENDING"] } },
            { status: "REJECTED", updatedAt: { gte: oneWeekAgo } },
          ],
        },
      ],
    },
    select: { senderId: true, receiverId: true },
  });

  const ids = new Set();
  connections.forEach((c) => {
    if (c.senderId !== userId) ids.add(c.senderId);
    if (c.receiverId !== userId) ids.add(c.receiverId);
  });
  return [...ids];
};

export const getUserSocialGraph = async (userId) => {
  const [following, connections, blocked] = await Promise.all([
    db.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    }),
    db.connection.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      select: { senderId: true, receiverId: true },
    }),
    getBlockedUserIds(userId),
  ]);

  const followingIds = following.map((f) => f.followingId);
  const connectedIds = connections.map((c) =>
    c.senderId === userId ? c.receiverId : c.senderId
  );

  return { followingIds, connectedIds, blockedIds: blocked };
};

export const addViewerContext = async (userId, targetUserId) => {
  if (!userId) return null;

  const [followRecord, connectionRecord] = await Promise.all([
    db.follow.findUnique({
      where: {
        followerId_followingId: { followerId: userId, followingId: targetUserId },
      },
    }),
    db.connection.findFirst({
      where: {
        OR: [
          { senderId: userId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: userId },
        ],
      },
      select: { id: true, status: true, senderId: true },
    }),
  ]);

  return {
    isFollowing: !!followRecord,
    connectionStatus: connectionRecord
      ? { connectionId: connectionRecord.id, status: connectionRecord.status, isSender: connectionRecord.senderId === userId }
      : null,
    isConnected: connectionRecord?.status === "ACCEPTED",
  };
};

export const getMutualConnectionCount = async (userId, targetUserId) => {
  if (!userId) return 0;

  const [userConns, targetConns] = await Promise.all([
    db.connection.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      select: { senderId: true, receiverId: true },
    }),
    db.connection.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ senderId: targetUserId }, { receiverId: targetUserId }],
      },
      select: { senderId: true, receiverId: true },
    }),
  ]);

  const userConnIds = new Set(
    userConns.map((c) => (c.senderId === userId ? c.receiverId : c.senderId))
  );
  const targetConnIds = new Set(
    targetConns.map((c) =>
      c.senderId === targetUserId ? c.receiverId : c.senderId
    )
  );

  let count = 0;
  userConnIds.forEach((id) => {
    if (targetConnIds.has(id)) count++;
  });
  return count;
};
