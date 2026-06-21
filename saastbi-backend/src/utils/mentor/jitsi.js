import jwt from "jsonwebtoken";
import crypto from "crypto";

const JITSI_APP_ID = process.env.JITSI_APP_ID || "saastbi";
const JITSI_SECRET = process.env.JITSI_SECRET;
const JITSI_DOMAIN = process.env.JITSI_DOMAIN || "meet.jit.si";

export const generateMeetingRoomId = (sessionId) => {
  const hash = crypto.createHash("sha256").update(sessionId).digest("hex");
  return `saastbi-${hash.substring(0, 16)}`;
};

export const generateJitsiToken = ({
  sessionId,
  roomId,
  userId,
  userName,
  userEmail,
  role,
  duration = 120,
}) => {
  if (!JITSI_SECRET) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: JITSI_APP_ID,
    iss: JITSI_APP_ID,
    sub: JITSI_DOMAIN,
    room: roomId,
    exp: now + duration * 60,
    nbf: now - 60,
    context: {
      user: {
        id: userId,
        name: userName,
        email: userEmail,
        moderator: role === "MENTOR",
      },
      features: {
        livestreaming: false,
        recording: role === "MENTOR",
        transcription: false,
        "outbound-call": false,
      },
    },
  };

  return jwt.sign(payload, JITSI_SECRET, { algorithm: "HS256" });
};

export const generateMeetingUrl = (roomId, token = null) => {
  const baseUrl = `https://${JITSI_DOMAIN}/${roomId}`;
  if (token) {
    return `${baseUrl}?jwt=${token}`;
  }
  return baseUrl;
};

export const getMeetingConfig = (sessionId) => {
  const roomId = generateMeetingRoomId(sessionId);
  return {
    domain: JITSI_DOMAIN,
    roomId,
    baseUrl: `https://${JITSI_DOMAIN}`,
  };
};
