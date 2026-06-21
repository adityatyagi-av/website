import appleSignin from "apple-signin-auth";
import { ApiError } from "../../../../utils/ApiError.js";

export async function verifyAppleToken(identityToken, userData) {
  try {
    const clientId = process.env.APPLE_CLIENT_ID;

    if (!clientId) {
      throw new ApiError(500, "Apple Sign-In is not configured");
    }

    const decoded = await appleSignin.verifyIdToken(identityToken, {
      audience: clientId,
      ignoreExpiration: false,
    });

    const email = decoded.email || null;

    if (!email) {
      throw new ApiError(
        400,
        "Apple account did not provide an email address. Please allow email sharing and try again.",
      );
    }

    return {
      providerAccountId: decoded.sub,
      email,
      firstName: userData?.firstName || "",
      lastName: userData?.lastName || "",
      profilePhoto: null,
      rawProfile: decoded,
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, "Invalid or expired Apple identity token");
  }
}
