import { OAuth2Client } from "google-auth-library";
import { ApiError } from "../../../../utils/ApiError.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function verifyGoogleToken(idToken) {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload.email_verified) {
      throw new ApiError(401, "Google email is not verified");
    }

    return {
      providerAccountId: payload.sub,
      email: payload.email,
      firstName: payload.given_name || "",
      lastName: payload.family_name || "",
      profilePhoto: payload.picture || null,
      rawProfile: payload,
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, "Invalid or expired Google token");
  }
}
