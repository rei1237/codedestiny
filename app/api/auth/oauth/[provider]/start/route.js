import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";

export const runtime = "nodejs";

const OAUTH_PROVIDERS = ["google", "naver", "kakao"];

function getFrontendBaseUrl(request) {
  if (process.env.AUTH_FRONTEND_BASE_URL) {
    try {
      return new URL(process.env.AUTH_FRONTEND_BASE_URL).origin;
    } catch {
      // fallthrough
    }
  }
  const url = new URL(request.url);
  return url.origin;
}

function getApiBaseUrl(request) {
  if (process.env.AUTH_API_BASE_URL && !isSameOrigin(process.env.AUTH_API_BASE_URL, request)) {
    try {
      return new URL(process.env.AUTH_API_BASE_URL).origin;
    } catch {
      // fallthrough
    }
  }
  const url = new URL(request.url);
  return url.origin;
}

function isSameOrigin(base, request) {
  try {
    const a = new URL(base);
    const b = new URL(request.url);
    return a.origin === b.origin;
  } catch {
    return false;
  }
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
