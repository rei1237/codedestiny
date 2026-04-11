import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";

export const runtime = "nodejs";

const OAUTH_PROVIDERS = ["google", "naver", "kakao"];

function normalizeBaseUrl(rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) return "";
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function isLocalHostName(hostname) {
  const normalized = String(hostname || "").toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

function parseUrlSafe(rawValue) {
  try {
    return new URL(String(rawValue || ""));
  } catch {
    return null;
  }
}

function isEquivalentOrigin(a, b) {
  const urlA = parseUrlSafe(a);
  const urlB = parseUrlSafe(b);
  if (!urlA || !urlB) return false;

  const sameProtocol = urlA.protocol === urlB.protocol;
  const samePort = urlA.port === urlB.port;
  const sameHost = urlA.hostname === urlB.hostname;
  if (sameProtocol && samePort && sameHost) return true;

  if (!sameProtocol || !samePort) return false;
  return isLocalHostName(urlA.hostname) && isLocalHostName(urlB.hostname);
}

function getRequestOrigin(request) {
  const reqUrl = new URL(request.url);
  const forwardedHostRaw = request.headers.get("x-forwarded-host") || "";
  const forwardedProtoRaw = request.headers.get("x-forwarded-proto") || "";

  const forwardedHost = forwardedHostRaw.split(",")[0].trim();
  const forwardedProto = forwardedProtoRaw.split(",")[0].trim();

  if (forwardedHost) {
    const protocol = forwardedProto || reqUrl.protocol.replace(":", "") || "https";
    return `${protocol}://${forwardedHost}`;
  }

  return reqUrl.origin;
}

function getFrontendBaseUrl(request) {
  const fromEnv = normalizeBaseUrl(process.env.AUTH_FRONTEND_BASE_URL);
  if (fromEnv) return fromEnv;
  return getRequestOrigin(request);
}

function getApiBaseUrl(request) {
  const requestOrigin = getRequestOrigin(request);
  const fromEnv = normalizeBaseUrl(process.env.AUTH_API_BASE_URL);
  if (fromEnv && !isEquivalentOrigin(fromEnv, requestOrigin)) return fromEnv;
  return requestOrigin;
}

function sanitizeNextPath(rawNext) {
  if (!rawNext || typeof rawNext !== "string") return null;
  if (!rawNext.startsWith("/") || rawNext.startsWith("//")) return null;
  return rawNext;
}

function sanitizeAuthFlow(rawFlow) {
  const normalized = String(rawFlow || "").trim().toLowerCase();
  return normalized === "signup" ? "signup" : "login";
}

function buildProviderConfig(provider, apiBase) {
  const redirectUri = `${apiBase}/api/auth/oauth/${provider}/callback`;

  if (provider === "google") {
    return {
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      scope: "openid email profile",
      redirectUri,
    };
  }
  if (provider === "naver") {
    return {
      clientId: process.env.NAVER_OAUTH_CLIENT_ID,
      clientSecret: process.env.NAVER_OAUTH_CLIENT_SECRET,
      authorizationEndpoint: "https://nid.naver.com/oauth2.0/authorize",
      scope: "name email",
      redirectUri,
    };
  }
  if (provider === "kakao") {
    return {
      clientId: process.env.KAKAO_OAUTH_CLIENT_ID,
      clientSecret: process.env.KAKAO_OAUTH_CLIENT_SECRET,
      authorizationEndpoint: "https://kauth.kakao.com/oauth/authorize",
      scope: "profile_nickname account_email",
      redirectUri,
    };
  }
  throw new Error("unsupported_provider");
}

export async function GET(request, { params }) {
  const { provider } = await params;
  const providerKey = String(provider || "").toLowerCase();

  if (!OAUTH_PROVIDERS.includes(providerKey)) {
    return NextResponse.json({ message: "지원하지 않는 소셜 로그인입니다." }, { status: 400 });
  }

  try {
    const url = new URL(request.url);
    const apiBase = getApiBaseUrl(request);
    const cfg = buildProviderConfig(providerKey, apiBase);

    if (!cfg.clientId || ((providerKey === "google" || providerKey === "naver") && !cfg.clientSecret)) {
      return NextResponse.json({ message: "소셜 로그인 서버 설정이 누락되었습니다." }, { status: 500 });
    }

    const nextPath = sanitizeNextPath(url.searchParams.get("next")) || "/";
    const flow = sanitizeAuthFlow(url.searchParams.get("flow"));
    const frontendBase = getFrontendBaseUrl(request);

    const stateToken = jwt.sign(
      { purpose: "social-oauth-state", provider: providerKey, nextPath, frontendBase, flow, nonce: crypto.randomUUID() },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "10m", issuer: "code-destiny-api" },
    );

    const authParams = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: cfg.redirectUri,
      response_type: "code",
      scope: cfg.scope,
      state: stateToken,
    });

    const authUrl = `${cfg.authorizationEndpoint}?${authParams.toString()}`;
    return NextResponse.redirect(authUrl, { status: 302 });
  } catch (err) {
    console.error(`[oauth/${providerKey}/start]`, err?.message || err);
    return NextResponse.json({ message: "소셜 로그인 시작 중 오류가 발생했습니다." }, { status: 500 });
  }
}
