import jwt from "jsonwebtoken";
import db from "../db/db.js";

const ACCESS_SECRET = process.env.ACCESS_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

export function generateTokens(user) {
  const payload = { id: user.id, email: user.email };
  if (user.role) payload.role = user.role;

  const accessToken = jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });

  return { accessToken, refreshToken };
}

export async function createSession(userId, refreshToken, { userAgent, ipAddress } = {}) {
  await db.userSession.create({
    data: {
      userId,
      token: refreshToken,
      deviceInfo: userAgent || "Unknown Device",
      ipAddress: ipAddress || "Unknown IP",
      userAgent: userAgent || "Unknown Agent",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
}

export async function validateSession(userId, token) {
  const session = await db.userSession.findFirst({
    where: { userId, token, expiresAt: { gt: new Date() } },
  });
  return !!session;
}

export async function rotateSession(userId, oldToken, newToken, { userAgent, ipAddress } = {}) {
  await db.userSession.deleteMany({ where: { userId, token: oldToken } });
  await db.userSession.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });
  await db.userSession.create({
    data: {
      userId,
      token: newToken,
      deviceInfo: userAgent || "Unknown Device",
      ipAddress: ipAddress || "Unknown IP",
      userAgent: userAgent || "Unknown Agent",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
}

export async function revokeSession(userId, token) {
  if (token) {
    await db.userSession.deleteMany({ where: { userId, token } });
  } else {
    await db.userSession.deleteMany({ where: { userId } });
  }
}

export async function revokeAllSessions(userId) {
  await db.userSession.deleteMany({ where: { userId } });
}
