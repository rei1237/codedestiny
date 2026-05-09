import { getEnv } from "./env.js";
import { cookieValue, createHttpError } from "./http.js";
import { signJwt, verifyJwt } from "./jwt.js";

export const JWT_ISSUER = "code-destiny-api";
export const ACCESS_COOKIE_NAME = "fortune_auth_token";
export const REFRESH_COOKIE_NAME = "fortune_auth_refresh";

export function getJwtIssuer(env) {
  return getEnv(env, "JWT_ISSUER") || JWT_ISSUER;
}

export function getJwtAudience(env) {
  return getEnv(env, "JWT_AUDIENCE") || getEnv(env, "AUTH_AUDIENCE") || "code-destiny-web";
}

export function getAccessTokenSecret(env) {
  return (
    getEnv(env, "JWT_ACCESS_SECRET")
    || getEnv(env, "JWT_SECRET")
    || getEnv(env, "AUTH_SECRET")
    || "dev-secret"
  );
}

export function getRefreshTokenSecret(env) {
  return (
    getEnv(env, "JWT_REFRESH_SECRET")
    || getEnv(env, "JWT_SECRET")
    || getEnv(env, "AUTH_SECRET")
    || "dev-secret"
  );
}

export function getAccessTokenExpiresIn(env) {
  return getEnv(env, "ACCESS_TOKEN_EXPIRES_IN") || getEnv(env, "JWT_EXPIRES_IN", "30m");
}

export function getRefreshTokenExpiresIn(env) {
  return getEnv(env, "REFRESH_TOKEN_EXPIRES_IN", "14d");
}

export function getBearerToken(request) {
  const authorization = request.headers.get("Authorization") || "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  return bearer || cookieValue(request, ACCESS_COOKIE_NAME);
}

function extractTokenUserId(payload) {
  const userId = String(payload?.userId || payload?.id || "").trim();
  if (!/^[a-f0-9]{24}$/i.test(userId)) return "";
  return userId;
}

export async function requireAuth(request, env) {
  const token = getBearerToken(request);
  if (!token) {
    throw createHttpError(401, "Authentication is required.", { code: "UNAUTHORIZED" });
  }

  const payload = await verifyJwt(token, getAccessTokenSecret(env), {
    issuer: getJwtIssuer(env),
    audience: getJwtAudience(env),
  });
  const userId = extractTokenUserId(payload);
  if (!userId) {
    throw createHttpError(401, "Invalid authentication token.", { code: "UNAUTHORIZED" });
  }

  return {
    userId,
    email: payload.email ? String(payload.email) : "",
    role: payload.role ? String(payload.role) : "user",
    name: payload.name ? String(payload.name) : "",
    image: payload.image ? String(payload.image) : "",
    birthDate: payload.birthDate ? String(payload.birthDate) : "",
    birthTime: payload.birthTime ? String(payload.birthTime) : "",
    gender: payload.gender ? String(payload.gender) : "OTHER",
    points: Number.isFinite(Number(payload.points)) ? Number(payload.points) : 0,
    joinedAt: payload.joinedAt || null,
  };
}

export async function signAuthToken(user, env) {
  return signJwt(
    {
      userId: String(user._id),
      email: user.email,
      role: user.role,
      name: user.name,
      image: user.profileImage || user.image || "",
      birthDate: user.birthDate,
      birthTime: user.birthTime,
      gender: user.gender,
      points: user.points,
      joinedAt: user.joinedAt,
    },
    getAccessTokenSecret(env),
    {
      expiresIn: getAccessTokenExpiresIn(env),
      issuer: getJwtIssuer(env),
      audience: getJwtAudience(env),
    },
  );
}

export function normalizeUserResponse(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    image: user.profileImage || user.image || "",
    birthDate: user.birthDate,
    birthTime: user.birthTime,
    gender: user.gender,
    role: user.role,
    points: user.points,
    joinedAt: user.joinedAt,
  };
}
