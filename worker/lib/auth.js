import { getEnv } from "./env.js";
import { cookieValue, createHttpError } from "./http.js";
import { signJwt, verifyJwt } from "./jwt.js";
import { createHash } from "node:crypto";
import { connectDb, mongoose } from "./db.js";
import { RefreshTokenSession, User } from "./models.js";

export const JWT_ISSUER = "code-destiny-api";
export const ACCESS_COOKIE_NAME = "fortune_auth_token";
export const REFRESH_COOKIE_NAME = "fortune_auth_refresh";
const LEGACY_ACCESS_COOKIE_NAMES = ["cdToken"];

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
  return bearer || getAccessCookieToken(request);
}

function getHeaderBearerToken(request) {
  const authorization = request.headers.get("Authorization") || "";
  return authorization.match(/^Bearer\s+(.+)$/i)?.[1] || "";
}

function getAccessCookieToken(request) {
  const primary = cookieValue(request, ACCESS_COOKIE_NAME);
  if (primary) return primary;

  for (let i = 0; i < LEGACY_ACCESS_COOKIE_NAMES.length; i += 1) {
    const token = cookieValue(request, LEGACY_ACCESS_COOKIE_NAMES[i]);
    if (token) return token;
  }

  return "";
}

function hashRefreshToken(rawToken, env) {
  const pepper = getEnv(env, "AUTH_SECRET") || getAccessTokenSecret(env);
  return createHash("sha256").update(`${String(rawToken || "")}|${pepper}`).digest("hex");
}

function extractRefreshUserId(payload) {
  const userId = String(payload?.userId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(userId)) return "";
  if (String(payload?.typ || "") !== "refresh") return "";
  return userId;
}

function normalizeAuthResultFromPayload(payload, userId) {
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

function normalizeAuthResultFromUser(user) {
  return {
    userId: String(user?._id || ""),
    email: user?.email ? String(user.email) : "",
    role: user?.role ? String(user.role) : "user",
    name: user?.name ? String(user.name) : "",
    image: user?.profileImage ? String(user.profileImage) : (user?.image ? String(user.image) : ""),
    birthDate: user?.birthDate ? String(user.birthDate) : "",
    birthTime: user?.birthTime ? String(user.birthTime) : "",
    gender: user?.gender ? String(user.gender) : "OTHER",
    points: Number.isFinite(Number(user?.points)) ? Number(user.points) : 0,
    joinedAt: user?.joinedAt || null,
  };
}

async function verifyAccessTokenToAuth(token, env) {
  if (!token) return null;
  try {
    const payload = await verifyJwt(token, getAccessTokenSecret(env), {
      issuer: getJwtIssuer(env),
      audience: getJwtAudience(env),
    });
    const userId = extractTokenUserId(payload);
    if (!userId) return null;
    return normalizeAuthResultFromPayload(payload, userId);
  } catch {
    return null;
  }
}

async function verifyRefreshSessionToAuth(request, env) {
  const refreshToken = cookieValue(request, REFRESH_COOKIE_NAME);
  if (!refreshToken) return null;

  try {
    const payload = await verifyJwt(refreshToken, getRefreshTokenSecret(env), {
      issuer: getJwtIssuer(env),
      audience: getJwtAudience(env),
    });
    const userId = extractRefreshUserId(payload);
    if (!userId) return null;

    await connectDb(env);

    const tokenHash = hashRefreshToken(refreshToken, env);
    const session = await RefreshTokenSession.findOne({ tokenHash }).lean();
    if (!session || session.revokedAt) return null;

    const expiresAt = new Date(session.expiresAt || 0).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;

    const user = await User.collection.findOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      {
        projection: {
          _id: 1,
          name: 1,
          email: 1,
          birthDate: 1,
          birthTime: 1,
          gender: 1,
          role: 1,
          points: 1,
          joinedAt: 1,
          image: 1,
          profileImage: 1,
        },
      },
    );
    if (!user) return null;

    return normalizeAuthResultFromUser(user);
  } catch {
    return null;
  }
}

function extractTokenUserId(payload) {
  const userId = String(payload?.userId || payload?.id || "").trim();
  if (!/^[a-f0-9]{24}$/i.test(userId)) return "";
  return userId;
}

export async function requireAuth(request, env) {
  const session = await getSessionFromRequest(request, env);
  if (!session?.user?.id) {
    throw createHttpError(401, "Authentication is required.", { code: "AUTH_REQUIRED" });
  }
  return session.user;
}

export async function getSessionFromRequest(request, env) {
  const auth = await getOptionalUserFromRequest(request, env);
  const userId = String(auth?.userId || "").trim();
  if (!userId) return null;

  return {
    user: {
      id: userId,
      userId,
      email: auth?.email ? String(auth.email) : "",
      role: auth?.role ? String(auth.role) : "user",
      name: auth?.name ? String(auth.name) : "",
      image: auth?.image ? String(auth.image) : "",
      birthDate: auth?.birthDate ? String(auth.birthDate) : "",
      birthTime: auth?.birthTime ? String(auth.birthTime) : "",
      gender: auth?.gender ? String(auth.gender) : "OTHER",
      points: Number.isFinite(Number(auth?.points)) ? Number(auth.points) : 0,
      joinedAt: auth?.joinedAt || null,
    },
  };
}

export async function getOptionalUserFromRequest(request, env) {
  const bearerToken = getHeaderBearerToken(request);
  const accessCookieToken = getAccessCookieToken(request);
  const refreshCookieToken = cookieValue(request, REFRESH_COOKIE_NAME);

  const bearerAuth = await verifyAccessTokenToAuth(bearerToken, env);
  if (bearerAuth) return bearerAuth;

  if (accessCookieToken && accessCookieToken !== bearerToken) {
    const cookieAuth = await verifyAccessTokenToAuth(accessCookieToken, env);
    if (cookieAuth) return cookieAuth;
  }

  if (refreshCookieToken) {
    const refreshAuth = await verifyRefreshSessionToAuth(request, env);
    if (refreshAuth) return refreshAuth;
  }

  return null;
}

export async function requireUserFromRequest(request, env) {
  return requireAuth(request, env);
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
