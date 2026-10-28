// GA4 Data API 읽기 전용 커넥터 — 유효 참여 세션(engagedSessions) 일별 조회.
//
// 연결에 필요한 비밀값(Worker secret, [vars] 아님):
//   GA4_SERVICE_ACCOUNT_JSON  서비스 계정 키 JSON 전체(client_email·private_key)
//   GA4_PROPERTY_ID           숫자 속성 ID(예: 123456789)
// 둘 중 하나라도 없으면 "연동 대기"다. 이때 호출하지 않고 0 을 만들지도 않는다.
// 🔴 비밀값은 응답·로그·DB 어디에도 남기지 않는다. 오류 메시지는 Google 응답의 error 문구만 짧게 남긴다.

import { getEnv } from "../lib/env.js";

const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export const GA4_METRIC_DEF = Object.freeze({
  metric: "engagedSessions",
  label: "유효 참여 세션",
  definition: "GA4 engagedSessions — 10초 이상 머물렀거나, 전환 이벤트가 있었거나, 페이지를 2개 이상 본 세션",
  dimension: "date",
});

let cachedToken = null;

function clean(value) {
  return String(value || "").trim();
}

/** 연결 준비 상태. 비밀값 내용은 돌려주지 않고 있는지만 본다. */
export function ga4Readiness(env) {
  const missing = [];
  const rawJson = clean(getEnv(env, "GA4_SERVICE_ACCOUNT_JSON"));
  const propertyId = clean(getEnv(env, "GA4_PROPERTY_ID"));
  if (!rawJson) missing.push("GA4_SERVICE_ACCOUNT_JSON");
  if (!propertyId) missing.push("GA4_PROPERTY_ID");
  else if (!/^\d{4,20}$/.test(propertyId)) missing.push("GA4_PROPERTY_ID(숫자 형식 아님)");
  return { ready: missing.length === 0, missing, propertyId: missing.length ? null : propertyId };
}

function base64UrlEncode(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64url");
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemToArrayBuffer(pem) {
  const normalized = clean(pem)
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  if (typeof Buffer !== "undefined") return Buffer.from(normalized, "base64");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function connectorError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function accessToken(env) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;
  let account;
  try {
    account = JSON.parse(clean(getEnv(env, "GA4_SERVICE_ACCOUNT_JSON")));
  } catch {
    throw connectorError("GA4_CREDENTIALS_INVALID", "서비스 계정 JSON 을 읽을 수 없습니다.");
  }
  if (!account?.client_email || !account?.private_key) throw connectorError("GA4_CREDENTIALS_INVALID", "서비스 계정 JSON 에 client_email·private_key 가 없습니다.");
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64UrlEncode(JSON.stringify({ iss: account.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }));
  const signingInput = `${header}.${payload}`;
  const key = await crypto.subtle.importKey("pkcs8", pemToArrayBuffer(account.private_key), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signingInput));
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}` }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) throw connectorError("GA4_OAUTH_FAILED", clean(body.error_description || body.error || `oauth_${response.status}`).slice(0, 160));
  cachedToken = { token: body.access_token, expiresAt: Date.now() + Math.max(60, Number(body.expires_in || 3600)) * 1000 };
  return cachedToken.token;
}

/** "20261012" → "2026-10-12" */
function isoDate(value) {
  const text = String(value || "");
  return /^\d{8}$/.test(text) ? `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}` : null;
}

/** GA4 runReport 응답 → [{date, engagedSessions, sessions}] + 속성 시간대. 순수 함수. */
export function parseGa4Report(body) {
  const rows = (body?.rows || []).map((row) => ({
    date: isoDate(row.dimensionValues?.[0]?.value),
    engagedSessions: Math.max(0, Math.round(Number(row.metricValues?.[0]?.value) || 0)),
    sessions: Math.max(0, Math.round(Number(row.metricValues?.[1]?.value) || 0)),
  })).filter((row) => row.date);
  return { rows, timeZone: body?.metadata?.timeZone || null, currencyCode: body?.metadata?.currencyCode || null };
}

/** 기간의 일별 유효 참여 세션. GA4 는 속성 시간대 기준 날짜를 돌려준다(속성이 Asia/Seoul 이어야 KST 와 맞다). */
export async function fetchGa4DailyEngagement(env, { startDate, endDate }) {
  const readiness = ga4Readiness(env);
  if (!readiness.ready) throw connectorError("GA4_NOT_CONFIGURED", `연동 대기: ${readiness.missing.join(", ")}`);
  const token = await accessToken(env);
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${readiness.propertyId}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "engagedSessions" }, { name: "sessions" }],
      keepEmptyRows: true,
      limit: 400,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw connectorError("GA4_REPORT_FAILED", clean(body?.error?.message || `report_${response.status}`).slice(0, 160));
  return { propertyId: readiness.propertyId, ...parseGa4Report(body) };
}
