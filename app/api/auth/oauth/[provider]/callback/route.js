import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { getUserModel } from "../../../../../_lib/models/UserModel";

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
  if (process.env.AUTH_API_BASE_URL) {
    try {
      const authBase = new URL(process.env.AUTH_API_BASE_URL);
      const reqUrl = new URL(request.url);
      if (authBase.origin !== reqUrl.origin) return authBase.origin;
    } catch { /* fallthrough */ }
  }
  const url = new URL(request.url);
  return url.origin;
}

function buildProviderConfig(provider, apiBase) {
  const redirectUri = `${apiBase}/api/auth/oauth/${provider}/callback`;

  if (provider === "google") {
    return {
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      tokenEndpoint: "https://oauth2.googleapis.com/token",
      userInfoEndpoint: "https://openidconnect.googleapis.com/v1/userinfo",
      redirectUri,
    };
  }
  if (provider === "naver") {
    return {
      clientId: process.env.NAVER_OAUTH_CLIENT_ID,
      clientSecret: process.env.NAVER_OAUTH_CLIENT_SECRET,
      tokenEndpoint: "https://nid.naver.com/oauth2.0/token",
      userInfoEndpoint: "https://openapi.naver.com/v1/nid/me",
      redirectUri,
    };
  }
  if (provider === "kakao") {
    return {
      clientId: process.env.KAKAO_OAUTH_CLIENT_ID,
      clientSecret: process.env.KAKAO_OAUTH_CLIENT_SECRET,
      tokenEndpoint: "https://kauth.kakao.com/oauth/token",
      userInfoEndpoint: "https://kapi.kakao.com/v2/user/me",
      redirectUri,
    };
  }
  throw new Error("unsupported_provider");
}

function mapSocialProfile(provider, payload) {
  if (provider === "google") {
    return {
      providerId: String(payload?.sub || ""),
      email: payload?.email ? String(payload.email).toLowerCase() : "",
      name: String(payload?.name || payload?.given_name || "Google 사용자"),
    };
  }
  if (provider === "naver") {
    const profile = payload?.response || {};
    return {
      providerId: String(profile?.id || ""),
      email: profile?.email ? String(profile.email).toLowerCase() : "",
      name: String(profile?.name || profile?.nickname || "네이버 사용자"),
    };
  }
  if (provider === "kakao") {
    const account = payload?.kakao_account || {};
    const profile = account?.profile || {};
    return {
      providerId: String(payload?.id || ""),
      email: account?.email ? String(account.email).toLowerCase() : "",
      name: String(profile?.nickname || "카카오 사용자"),
    };
  }
  return { providerId: "", email: "", name: "" };
}

async function exchangeCodeForToken(provider, code, cfg, stateRaw) {
  const tokenParams = {
    grant_type: "authorization_code",
    code,
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
  };
  if (cfg.clientSecret) tokenParams.client_secret = cfg.clientSecret;
  if (provider === "naver") tokenParams.state = stateRaw;

  const response = await fetch(cfg.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams(tokenParams),
  });

  const data = await response.json();
  if (!response.ok || !data?.access_token) {
    throw new Error(`${provider}_token_exchange_failed`);
  }
  return String(data.access_token);
}

async function fetchSocialProfile(provider, accessToken, cfg) {
  const response = await fetch(cfg.userInfoEndpoint, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${provider}_profile_fetch_failed`);

  const mapped = mapSocialProfile(provider, data);
  if (!mapped.providerId) throw new Error(`${provider}_profile_invalid`);
  return mapped;
}

async function findOrCreateSocialUser(provider, profile) {
  const User = await getUserModel();
  const socialField = `socialAccounts.${provider}.id`;

  let user = await User.findOne({ [socialField]: profile.providerId });
  if (user) return user;

  if (profile.email) {
    user = await User.findOne({ email: profile.email });
    if (user) {
      user.set(socialField, profile.providerId);
      user.set(`socialAccounts.${provider}.connectedAt`, new Date());
      await user.save();
      return user;
    }
  }

  const fallbackEmail = `${provider}_${profile.providerId}@social.code-destiny.local`;
  return User.create({
    name: profile.name || `${provider} 사용자`,
    email: profile.email || fallbackEmail,
    passwordHash: "",
    birthDate: "1900-01-01",
    birthTime: "00:00",
    gender: "OTHER",
    role: "user",
    points: 50,
    joinedAt: new Date(),
    localAuth: { enabled: false, activatedAt: null },
    socialAccounts: {
      [provider]: { id: profile.providerId, connectedAt: new Date() },
    },
  });
}

export async function GET(request, { params }) {
  const { provider } = await params;
  const providerKey = String(provider || "").toLowerCase();

  const url = new URL(request.url);
  const frontendBase = getFrontendBaseUrl(request);
  const fallbackRedirect = `${frontendBase}/login?social_error=oauth_callback_failed`;

  if (!OAUTH_PROVIDERS.includes(providerKey)) {
    return NextResponse.redirect(`${frontendBase}/login?social_error=unsupported_provider`, { status: 302 });
  }

  try {
    const stateRaw = String(url.searchParams.get("state") || "");
    const code = String(url.searchParams.get("code") || "");
    const oauthError = String(url.searchParams.get("error") || "");

    if (oauthError) {
      return NextResponse.redirect(`${frontendBase}/login?social_error=${encodeURIComponent(oauthError)}`, { status: 302 });
    }
    if (!stateRaw || !code) {
      return NextResponse.redirect(`${frontendBase}/login?social_error=invalid_callback`, { status: 302 });
    }

    let statePayload;
    try {
      statePayload = jwt.verify(stateRaw, process.env.JWT_SECRET || "dev-secret", { issuer: "code-destiny-api" });
      if (!statePayload || statePayload.purpose !== "social-oauth-state") throw new Error("invalid_state");
    } catch {
      return NextResponse.redirect(`${frontendBase}/login?social_error=invalid_state`, { status: 302 });
    }

    if (statePayload.provider !== providerKey) {
      return NextResponse.redirect(`${frontendBase}/login?social_error=provider_mismatch`, { status: 302 });
    }

    const apiBase = getApiBaseUrl(request);
    const cfg = buildProviderConfig(providerKey, apiBase);
    const accessToken = await exchangeCodeForToken(providerKey, code, cfg, stateRaw);
    const socialProfile = await fetchSocialProfile(providerKey, accessToken, cfg);
    const user = await findOrCreateSocialUser(providerKey, socialProfile);

    const flow = statePayload.flow === "signup" ? "signup" : "login";
    const redirectPath = `/${flow}`;
    const nextPath = statePayload.nextPath || "/";

    const grant = jwt.sign(
      { purpose: "social-oauth-grant", userId: String(user._id), provider: providerKey, nextPath, jti: crypto.randomUUID() },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "3m", issuer: "code-destiny-api" },
    );

    const redirectParams = new URLSearchParams({ social_grant: grant });
    if (nextPath && nextPath !== "/") redirectParams.set("next", nextPath);

    return NextResponse.redirect(`${frontendBase}${redirectPath}?${redirectParams.toString()}`, { status: 302 });
  } catch (err) {
    console.error(`[oauth/${providerKey}/callback]`, err?.message || err);
    return NextResponse.redirect(fallbackRedirect, { status: 302 });
  }
}
