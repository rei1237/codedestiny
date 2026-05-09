import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

type AuthPayload = {
  userId?: string;
  id?: string;
};

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

function getTokenFromRequest(req: NextRequest): string {
  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (bearer) return bearer;
  return String(req.cookies.get("fortune_auth_token")?.value || "").trim();
}

function extractUserId(decoded: string | jwt.JwtPayload): string {
  if (!decoded || typeof decoded === "string") return "";
  const payload = decoded as AuthPayload;
  const userId = String(payload.userId || payload.id || "").trim();
  return /^[a-f0-9]{24}$/i.test(userId) ? userId : "";
}

export function requireRouteAuth(req: NextRequest): { ok: true; userId: string } | { ok: false; response: NextResponse } {
  const token = getTokenFromRequest(req);
  if (!token) {
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

  try {
    const secret = process.env.JWT_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev-secret";
    const decoded = jwt.verify(token, secret);
    const userId = extractUserId(decoded);
    if (!userId) {
      logRouteAuthDiagnostic(req, new Error("invalid_auth_user_id"), "route_auth_invalid_user_id");
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
    return { ok: true, userId };
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
