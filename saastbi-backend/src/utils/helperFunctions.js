import argon2 from "argon2";
import { startOfDay } from "date-fns";
import db from "../db/db.js";

async function recordEntityVisit({
  entityType,
  entityId,
  viewerId,
  ipAddress,
  userAgent,
}) {
  const visitDate = startOfDay(new Date());
  if (viewerId) {
    const exists = await db.entityVisit.findFirst({
      where: {
        entityType,
        entityId,
        viewerId,
        visitDate,
      },
      select: { id: true },
    });

    if (exists) return;
  }

  if (!viewerId && ipAddress) {
    const exists = await db.entityVisit.findFirst({
      where: {
        entityType,
        entityId,
        ipAddress,
        userAgent,
        visitDate,
      },
      select: { id: true },
    });

    if (exists) return;
  }

  await db.entityVisit.create({
    data: {
      entityType,
      entityId,
      viewerId: viewerId ?? null,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      visitDate,
    },
  });
}

function isEmailValid(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function verifyOtp(otp1, otp2) {
  if (!otp1 || !otp2) {
    return {
      success: false,
      message: "OTP missing",
    };
  }

  if (otp1.toString().trim() === otp2.toString().trim()) {
    return {
      success: true,
      message: "OTP verified successfully",
    };
  }

  return {
    success: false,
    message: "Invalid OTP",
  };
}

async function hashPassword(password) {
  return await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });
}

async function verifyPassword(hash, plainPassword) {
  return await argon2.verify(hash, plainPassword);
}

function toMinutes(timeString) {
  const [h, m] = timeString.split(":").map(Number);
  return h * 60 + m;
}
function pickDefinedFields(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([_, value]) => value !== undefined && value !== null
    )
  );
}

function isProvided(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

export {
  isEmailValid,
  generateOtp,
  hashPassword,
  verifyPassword,
  verifyOtp,
  toMinutes,
  pickDefinedFields,
  isProvided,
  recordEntityVisit,
};
