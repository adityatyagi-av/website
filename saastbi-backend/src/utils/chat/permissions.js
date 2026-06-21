import db from "../../db/db.js";

/**
 * Check if sender can message receiver.
 * Returns { allowed: boolean, reason?: string }
 */
export async function canMessage(senderId, senderType, receiverId, receiverType, contextType) {
  if (contextType && contextType !== "GENERAL") {
    return { allowed: true };
  }

  if (senderType !== "USER" || receiverType !== "USER") {
    return { allowed: true };
  }

  const blocked = await db.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: senderId, blockedId: receiverId },
        { blockerId: receiverId, blockedId: senderId },
      ],
    },
  });
  if (blocked) {
    return { allowed: false, reason: "This user is blocked" };
  }

  const settings = await db.userSettings.findUnique({
    where: { userId: receiverId },
  });

  if (settings == null) {
    return { allowed: true };
  }

  const permission = settings?.allowMessagesFrom || "CONNECTIONS";

  if (permission === "NO_ONE") {
    return { allowed: false, reason: "This user does not accept messages" };
  }

  if (permission === "EVERYONE") {
    return { allowed: true };
  }

  const connection = await db.connection.findFirst({
    where: {
      OR: [
        { senderId, receiverId, status: "ACCEPTED" },
        { senderId: receiverId, receiverId: senderId, status: "ACCEPTED" },
      ],
    },
  });

  return connection
    ? { allowed: true }
    : { allowed: false, reason: "You must be connected to message this user" };
}
