import { readFileSync } from "node:fs";
import { handleAuthRoutes } from "../worker/routes/auth.js";

function decodeJwtPayload(token) {
  const payload = String(token || "").split(".")[1] || "";
  if (!payload) throw new Error("missing_jwt_payload");
  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = `${normalized}${"=".repeat((4 - (normalized.length % 4)) % 4)}`;
  return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
}

function readStateFromLocation(location) {
  const url = new URL(location);
  const state = url.searchParams.get("state");
  if (!state) throw new Error(`missing_state:${location}`);
  return decodeJwtPayload(state);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

async function assertOAuthStartFrontendBase({ requestUrl, headers, env, expectedFrontendBase, label }) {
  const response = await handleAuthRoutes(new Request(requestUrl, { headers }), env);
  const location = response.headers.get("location") || "";
  assertEqual(response.status, 302, `${label}.status`);
  const state = readStateFromLocation(location);
  assertEqual(state.frontendBase, expectedFrontendBase, `${label}.frontendBase`);
}

function getSetCookieHeaders(response) {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }
  const value = response.headers.get("set-cookie");
  return value ? [value] : [];
}

function assertHasCookie(setCookies, cookieName, label) {
  if (!setCookies.some((cookie) => String(cookie || "").startsWith(`${cookieName}=`))) {
    throw new Error(`${label}.${cookieName}_missing`);
  }
}

async function assertLocalDevRefreshFlow(env) {
  const loginResponse = await handleAuthRoutes(new Request("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "localhost:3000",
    },
    body: JSON.stringify({
      email: "local-login-test@example.com",
      password: "LocalTest!2026",
      nextPath: "/",
    }),
  }), env);
  assertEqual(loginResponse.status, 200, "local_refresh.login_status");
  const loginCookies = getSetCookieHeaders(loginResponse);
  assertHasCookie(loginCookies, "fortune_auth_token", "local_refresh.login_cookie");
  assertHasCookie(loginCookies, "fortune_auth_refresh", "local_refresh.login_cookie");

  const cookieHeader = loginCookies.map((cookie) => String(cookie).split(";")[0]).join("; ");
  const meResponse = await handleAuthRoutes(new Request("http://localhost:3000/api/auth/me", {
    method: "GET",
    headers: {
      cookie: cookieHeader,
      host: "localhost:3000",
    },
  }), env);
  assertEqual(meResponse.status, 200, "local_refresh.me_status");
  const mePayload = await meResponse.json();
  assertEqual(mePayload.authenticated, true, "local_refresh.me_authenticated");

  const refreshResponse = await handleAuthRoutes(new Request("http://localhost:3000/api/auth/refresh", {
    method: "POST",
    headers: {
      cookie: cookieHeader,
      host: "localhost:3000",
    },
  }), env);
  assertEqual(refreshResponse.status, 200, "local_refresh.refresh_status");
  const refreshCookies = getSetCookieHeaders(refreshResponse);
  assertHasCookie(refreshCookies, "fortune_auth_token", "local_refresh.refresh_cookie");
  assertHasCookie(refreshCookies, "fortune_auth_refresh", "local_refresh.refresh_cookie");
}

const baseEnv = {
  NODE_ENV: "production",
  JWT_SECRET: "verify-jwt-secret",
  JWT_ACCESS_SECRET: "verify-access-secret",
  JWT_REFRESH_SECRET: "verify-refresh-secret",
  MONGO_URI: "mongodb://127.0.0.1:27017/code_destiny_verify",
  ACCESS_TOKEN_EXPIRES_IN: "30m",
  REFRESH_TOKEN_EXPIRES_IN: "14d",
  GOOGLE_OAUTH_CLIENT_ID: "verify-google-client-id",
  GOOGLE_OAUTH_CLIENT_SECRET: "verify-google-client-secret",
  GOOGLE_OAUTH_CALLBACK: "https://code-destiny.com/api/auth/oauth/google/callback",
};

await assertOAuthStartFrontendBase({
  label: "local",
  requestUrl: "http://127.0.0.1:8790/api/auth/oauth/google/start?flow=login&next=%2F",
  headers: {
    host: "127.0.0.1:8790",
    referer: "http://localhost:3000/login/",
  },
  env: {
    ...baseEnv,
    NODE_ENV: "development",
    AUTH_FRONTEND_BASE_URL: "https://code-destiny.com",
    SITE_BASE_URL: "https://code-destiny.com",
    AUTH_API_BASE_URL: "http://127.0.0.1:8790",
  },
  expectedFrontendBase: "http://localhost:3000",
});

await assertLocalDevRefreshFlow({
  ...baseEnv,
  NODE_ENV: "development",
  LOCAL_DEV_AUTH_ENABLED: "true",
  AUTH_FRONTEND_BASE_URL: "http://localhost:3000",
  SITE_BASE_URL: "http://localhost:3000",
  AUTH_API_BASE_URL: "http://127.0.0.1:8790",
});

await assertOAuthStartFrontendBase({
  label: "production",
  requestUrl: "https://api.code-destiny.com/api/auth/oauth/google/start?flow=login&next=%2F",
  headers: {
    host: "api.code-destiny.com",
    referer: "https://code-destiny.com/login/",
  },
  env: {
    ...baseEnv,
    AUTH_FRONTEND_BASE_URL: "https://code-destiny.com",
    SITE_BASE_URL: "https://code-destiny.com",
    AUTH_API_BASE_URL: "https://code-destiny.com",
    AUTH_URL: "https://code-destiny.com",
    NEXTAUTH_URL: "https://code-destiny.com",
  },
  expectedFrontendBase: "https://code-destiny.com",
});

const apiConfig = readFileSync("app/_lib/api-config.ts", "utf8");
if (!apiConfig.includes("if (isLocalDev) {\n      return sameOriginBase;\n    }")) {
  throw new Error("api-config.local_same_origin_guard_missing");
}
if (!apiConfig.includes("!isLocalBaseUrl(configuredBase)") || !apiConfig.includes("!isLocalBaseUrl(configuredAuthBase)")) {
  throw new Error("api-config.production_localhost_guard_missing");
}

const httpClient = readFileSync("app/_lib/http-client.ts", "utf8");
if (!httpClient.includes("isLocalApiOrigin(normalizedBase)") || !httpClient.includes('normalizedPath.startsWith("/api/")')) {
  throw new Error("http-client.local_api_same_origin_guard_missing");
}

console.log("VERIFY_OK auth public origin");
