import { ApiError } from "../../../../utils/ApiError.js";
import { getRedis, setRedis } from "../../../../config/redisClient.js";

const FACEBOOK_GRAPH_URL = "https://graph.facebook.com";
const FETCH_TIMEOUT_MS = 5000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function getAppAccessToken() {
  const cacheKey = "fb:app_access_token";
  const cached = await getRedis(cacheKey);
  if (cached) return cached;

  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appId || !appSecret) {
    throw new ApiError(500, "Facebook OAuth is not configured");
  }

  const url = `${FACEBOOK_GRAPH_URL}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`;
  const response = await fetchWithTimeout(url);
  const data = await response.json();

  if (!data.access_token) {
    throw new ApiError(500, "Failed to obtain Facebook app access token");
  }

  await setRedis(cacheKey, data.access_token, 3600);
  return data.access_token;
}

export async function verifyFacebookToken(accessToken) {
  try {
    const appAccessToken = await getAppAccessToken();

    const debugUrl = `${FACEBOOK_GRAPH_URL}/debug_token?input_token=${accessToken}&access_token=${appAccessToken}`;
    const debugResponse = await fetchWithTimeout(debugUrl);
    const debugData = await debugResponse.json();

    if (
      !debugData.data?.is_valid ||
      debugData.data.app_id !== process.env.FACEBOOK_APP_ID
    ) {
      throw new ApiError(401, "Invalid or expired Facebook token");
    }

    const profileUrl = `${FACEBOOK_GRAPH_URL}/me?fields=id,first_name,last_name,email,picture.type(large)&access_token=${accessToken}`;
    const profileResponse = await fetchWithTimeout(profileUrl);
    const profile = await profileResponse.json();

    if (!profile.email) {
      throw new ApiError(
        400,
        "Your Facebook account does not have an email address. Please sign up with email instead.",
      );
    }

    return {
      providerAccountId: profile.id,
      email: profile.email,
      firstName: profile.first_name || "",
      lastName: profile.last_name || "",
      profilePhoto: profile.picture?.data?.url || null,
      rawProfile: profile,
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err.name === "AbortError") {
      throw new ApiError(502, "Facebook API request timed out");
    }
    throw new ApiError(401, "Failed to verify Facebook token");
  }
}
