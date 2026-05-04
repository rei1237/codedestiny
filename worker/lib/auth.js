import { getEnv } from "./env.js";
import { cookieValue, createHttpError } from "./http.js";
import { signJwt, verifyJwt } from "./jwt.js";

export const JWT_ISSUER = "code-destiny-api";

export function getJwtSecret(env) {
  return getEnv(env, "JWT_SECRET") || getEnv(env, "AUTH_SECRET") || "dev-secret";
}

export function getBearerToken(request) {
  const authorization = request.headers.get("Authorization") || "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  return bearer || cookieValue(request, "fortune_auth_token");
}

export async function requireAuth(request, env) {
  const token = getBearerToken(request);
  if (!token) {
    throw createHttpError(401, "Authentication is required.", { code: "UNAUTHORIZED" });
  }

  const payload = await verifyJwt(token, getJwtSecret(env), { issuer: JWT_ISSUER });
  if (!payload?.userId) {
    throw createHttpError(401, "Invalid authentication token.", { code: "UNAUTHORIZED" });
  }

  return {
    userId: String(payload.userId),
    email: payload.email ? String(payload.email) : "",
    role: payload.role ? String(payload.role) : "user",
    name: payload.name ? String(payload.name) : "",
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
      birthDate: user.birthDate,
      birthTime: user.birthTime,
      gender: user.gender,
      points: user.points,
      joinedAt: user.joinedAt,
    },
    getJwtSecret(env),
    {
      expiresIn: getEnv(env, "JWT_EXPIRES_IN", "7d"),
      issuer: JWT_ISSUER,
    },
  );
}

export function normalizeUserResponse(user) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    birthDate: user.birthDate,
    birthTime: user.birthTime,
    gender: user.gender,
    role: user.role,
    points: user.points,
    joinedAt: user.joinedAt,
  };
}
