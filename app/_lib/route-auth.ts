import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

type AuthPayload = {
  userId?: string;
  id?: string;
  typ?: string;
};

const ROUTE_AUTH_TEXT_TRANSLATIONS = {
  ko: { loginRequired: "로그인 후 이용할 수 있습니다." },
  en: { loginRequired: "Please log in to continue." },
  ja: { loginRequired: "ログイン後にご利用いただけます。" },
  "zh-CN": { loginRequired: "登录后即可使用。" },
  "zh-TW": { loginRequired: "登入後即可使用。" },
  vi: { loginRequired: "Vui lòng đăng nhập để tiếp tục." },
  hi: { loginRequired: "जारी रखने के लिए कृपया लॉग इन करें।" },
  es: { loginRequired: "Inicia sesión para continuar." },
  fr: { loginRequired: "Connectez-vous pour continuer." },
  de: { loginRequired: "Bitte melden Sie sich an, um fortzufahren." },
  nl: { loginRequired: "Log in om verder te gaan." },
  ms: { loginRequired: "Sila log masuk untuk meneruskan." },
} as const;

/** 지원 로케일 하나로 반드시 수렴한다 — 표에 12개가 다 있으므로 조회가 빌 수 없다. */
function getRouteAuthLocale(req: NextRequest): keyof typeof ROUTE_AUTH_TEXT_TRANSLATIONS {
  const cookieLocale = String(req.cookies.get("cd_locale")?.value || req.cookies.get("NEXT_LOCALE")?.value || "").trim();
  const headerLocale = String(req.headers.get("accept-language") || "").trim();
  const locale = (cookieLocale || headerLocale).replace("_", "-").toLowerCase();
  if (locale.startsWith("zh")) {
    return locale.includes("tw") || locale.includes("hant") || locale.includes("hk") ? "zh-TW" : "zh-CN";
  }
  const short = locale.slice(0, 2) as keyof typeof ROUTE_AUTH_TEXT_TRANSLATIONS;
  return short in ROUTE_AUTH_TEXT_TRANSLATIONS ? short : "ko";
}

function getRouteAuthCopy(req: NextRequest) {
  return ROUTE_AUTH_TEXT_TRANSLATIONS[getRouteAuthLocale(req)];
}

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

function getJwtIssuer(): string {
  return readEnv("JWT_ISSUER") || "code-destiny-api";
}

function getJwtAudience(): string {
  return readEnv("JWT_AUDIENCE", "AUTH_AUDIENCE") || "code-destiny-web";
}

function buildExplicitJwtVerifyOptions(): jwt.VerifyOptions {
  const verifyOptions: jwt.VerifyOptions = {};
  const issuer = readEnv("JWT_ISSUER");
  const audience = readEnv("JWT_AUDIENCE", "AUTH_AUDIENCE");
  if (issuer) verifyOptions.issuer = issuer;
  if (audience) verifyOptions.audience = audience;
  return verifyOptions;
}

function logRouteAuthDiagnostic(req: NextRequest, error: unknown, marker: string) {
  const payload = {
    marker,
    routePath: String(req.nextUrl?.pathname || ""),
    provider: "",
    requestHost: String(req.nextUrl?.host || ""),
    errorName: String((error as any)?.name || "Error").slice(0, 80),
    errorCode: String((error as any)?.code || marker || "route_auth_error").slice(0, 100),
    env: {
      hasAuthSecret: Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
      hasJwtSecret: Boolean(process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET),
      hasJwtIssuer: Boolean(readEnv("JWT_ISSUER")),
      hasJwtAudience: Boolean(readEnv("JWT_AUDIENCE", "AUTH_AUDIENCE")),
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
  } catch (e) {
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

function extractUserId(decoded: string | jwt.JwtPayload): string {
  if (!decoded || typeof decoded === "string") return "";
  const payload = decoded as AuthPayload;
  const userId = String(payload.userId || payload.id || "").trim();
  return /^[a-f0-9]{24}$/i.test(userId) ? userId : "";
}

function getDevAuthUserId(): string {
  const userId = readEnv("DEV_AUTH_USER_ID");
  if (process.env.NODE_ENV === "production") {
    if (userId) throw new Error("DEV_AUTH_USER_ID must not be used in production");
    return "";
  }
  return /^[a-f0-9]{24}$/i.test(userId) ? userId : "";
}

function verifyAccessTokenAndExtractUserId(token: string): string {
  if (!token) return "";
  try {
    const decoded = jwt.verify(token, getAccessTokenSecret(), buildExplicitJwtVerifyOptions());
    return extractUserId(decoded);
  } catch (e) {
    return "";
  }
}

export function requireRouteAuth(req: NextRequest): { ok: true; userId: string } | { ok: false; response: NextResponse } {
  const bearerToken = getBearerTokenFromRequest(req);
  const accessCookieToken = getAccessCookieTokenFromRequest(req);
  const devUserId = getDevAuthUserId();
  if (devUserId) return { ok: true, userId: devUserId };
  const copy = getRouteAuthCopy(req);

  if (!bearerToken && !accessCookieToken) {
    logRouteAuthDiagnostic(req, new Error("missing_auth_token"), "route_auth_missing_token");
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: "LOGIN_REQUIRED",
          message: copy.loginRequired,
        },
        { status: 401 },
      ),
    };
  }

  const bearerUserId = verifyAccessTokenAndExtractUserId(bearerToken);
  if (bearerUserId) return { ok: true, userId: bearerUserId };

  const cookieUserId = verifyAccessTokenAndExtractUserId(accessCookieToken);
  if (cookieUserId) return { ok: true, userId: cookieUserId };

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
          message: copy.loginRequired,
        },
        { status: 401 },
      ),
    };
  }
}

export function getServerUser(req: NextRequest): { userId: string } | null {
  const auth = requireRouteAuth(req);
  return auth.ok ? { userId: auth.userId } : null;
}

export function getCurrentUser(req: NextRequest): { userId: string } | null {
  return getServerUser(req);
}
