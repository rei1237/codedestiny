import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

type AuthPayload = {
  userId?: string;
  id?: string;
  typ?: string;
};

function readEnv(...keys: string[]): string {
  for (const key of keys) {
    const value = String((process.env as Record<string, string | undefined>)[key] || "").trim();
    if (value) return value;
  }
  return "";
}

function getAccessTokenSecret(): string {
  return readEnv("JWT_ACCESS_SECRET", "JWT_SECRET", "AUTH_SECRET", "NEXTAUTH_SECRET") || "dev-secret";
}

function getRefreshTokenSecret(): string {
  return readEnv("JWT_REFRESH_SECRET", "JWT_SECRET", "AUTH_SECRET", "NEXTAUTH_SECRET") || getAccessTokenSecret();
}

function getJwtIssuer(): string {
  return readEnv("JWT_ISSUER") || "code-destiny-api";
}

function getJwtAudience(): string {
  return readEnv("JWT_AUDIENCE", "AUTH_AUDIENCE") || "code-destiny-web";
}

function routeAuthStackSnippet(error: unknown): string {
  const stack = String((error as any)?.stack || "");
  if (!stack) return "";
  return stack
    .split("\n")
    .slice(0, 4)
    .map((line) => line.trim())
    .join(" | ")
    .slice(0, 600);
}

function logRouteAuthDiagnostic(req: NextRequest, error: unknown, marker: string) {
  const payload = {
    marker,
    routePath: String(req.nextUrl?.pathname || ""),
    provider: "",
    requestHost: String(req.nextUrl?.host || ""),
    errorName: String((error as any)?.name || "Error"),
    errorMessage: String((error as any)?.message || "route_auth_error").slice(0, 300),
    stackSnippet: routeAuthStackSnippet(error),
    env: {
      hasAuthSecret: Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
      hasJwtSecret: Boolean(process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET),
      hasAuthUrl: Boolean(process.env.AUTH_URL || process.env.NEXTAUTH_URL),
      hasAuthApiBaseUrl: Boolean(process.env.AUTH_API_BASE_URL),
      hasAuthTrustHost: Boolean(process.env.AUTH_TRUST_HOST || process.env.NEXTAUTH_TRUST_HOST),
      hasGoogleClientId: Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID),
      hasGoogleClientSecret: Boolean(process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET),
      hasMongoUri: Boolean(process.env.MONGO_URI || process.env.MONGODB_URI),
    },
  };

  try {
    console.error("[route-auth-diagnostic]", JSON.stringify(payload));
  } catch {
    console.error("[route-auth-diagnostic]", payload);
  }
}

function getBearerTokenFromRequest(req: NextRequest): string {
  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  return String(bearer || "").trim();
}

function getAccessCookieTokenFromRequest(req: NextRequest): string {
  return String(req.cookies.get("fortune_auth_token")?.value || "").trim();
}

function getRefreshCookieTokenFromRequest(req: NextRequest): string {
  return String(req.cookies.get("fortune_auth_refresh")?.value || "").trim();
}

function extractUserId(decoded: string | jwt.JwtPayload): string {
  if (!decoded || typeof decoded === "string") return "";
  const payload = decoded as AuthPayload;
  const userId = String(payload.userId || payload.id || "").trim();
  return /^[a-f0-9]{24}$/i.test(userId) ? userId : "";
}

function verifyAccessTokenAndExtractUserId(token: string): string {
  if (!token) return "";
  try {
    const decoded = jwt.verify(token, getAccessTokenSecret(), {
      issuer: getJwtIssuer(),
      audience: getJwtAudience(),
    });
    return extractUserId(decoded);
  } catch {
    return "";
  }
}

function verifyRefreshTokenAndExtractUserId(token: string): string {
  if (!token) return "";
  try {
    const decoded = jwt.verify(token, getRefreshTokenSecret(), {
      issuer: getJwtIssuer(),
      audience: getJwtAudience(),
    });
    if (!decoded || typeof decoded === "string") return "";
    const payload = decoded as AuthPayload;
    if (String(payload.typ || "").trim().toLowerCase() !== "refresh") return "";
    return extractUserId(decoded);
  } catch {
    return "";
  }
}

export function requireRouteAuth(req: NextRequest): { ok: true; userId: string } | { ok: false; response: NextResponse } {
  const bearerToken = getBearerTokenFromRequest(req);
  const accessCookieToken = getAccessCookieTokenFromRequest(req);
  const refreshCookieToken = getRefreshCookieTokenFromRequest(req);

  if (!bearerToken && !accessCookieToken && !refreshCookieToken) {
    logRouteAuthDiagnostic(req, new Error("missing_auth_token"), "route_auth_missing_token");
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: "LOGIN_REQUIRED",
          message: "로그인 후 이용할 수 있습니다.",
        },
        { status: 401 },
      ),
    };
  }

  const bearerUserId = verifyAccessTokenAndExtractUserId(bearerToken);
  if (bearerUserId) return { ok: true, userId: bearerUserId };

  const cookieUserId = verifyAccessTokenAndExtractUserId(accessCookieToken);
  if (cookieUserId) return { ok: true, userId: cookieUserId };

  const refreshUserId = verifyRefreshTokenAndExtractUserId(refreshCookieToken);
  if (refreshUserId) return { ok: true, userId: refreshUserId };

  try {
    throw new Error("route_auth_verify_failed");
  } catch (error) {
    logRouteAuthDiagnostic(req, error, "route_auth_verify_failed");
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: "LOGIN_REQUIRED",
          message: "로그인 후 이용할 수 있습니다.",
        },
        { status: 401 },
      ),
    };
  }
}
