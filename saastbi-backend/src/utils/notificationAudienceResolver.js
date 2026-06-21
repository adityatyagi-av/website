import db from "../db/db.js";

export const NotificationAudienceResolver = {
  getFollowersAndConnections: async (userId) => {
    const [followers, connections, actor] = await Promise.all([
      
      db.follow.findMany({
        where: {
          followingId: userId,
        },
        select: {
          followerId: true,
        },
      }),

     
      db.connection.findMany({
        where: {
          status: "ACCEPTED",
          OR: [
            { senderId: userId },
            { receiverId: userId },
          ],
        },
        select: {
          senderId: true,
          receiverId: true,
        },
      }),

      db.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          profilePhoto: true,
        },
      }),
    ]);

    const recipientIds = new Set();

   
    followers.forEach((f) => {
      recipientIds.add(f.followerId);
    });

 
    connections.forEach((c) => {
      recipientIds.add(
        c.senderId === userId
          ? c.receiverId
          : c.senderId
      );
    });
    recipientIds.delete(userId);
    return {recipientIds: [...recipientIds], actor}
  },
};