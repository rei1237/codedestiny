/**
 * 꽃 버튼 관리자 세션 토큰 유틸리티
 *
 * 비밀번호 게이트 통과 후 발급되는 단기 관리자 세션 토큰.
 * HMAC-SHA256 서명 + 만료 시간 검증으로 위·변조 방지.
 * 환경변수 FLOWER_ADMIN_SECRET 을 반드시 Cloudflare Pages/Worker에 설정해야 한다.
 *
 * ★ 런타임 우선순위:
 *   1) node:crypto createHmac — 정적 import (CF Workers nodejs_compat + Node.js 18+)
 *      동적 import("node:crypto")는 OpenNext/esbuild 번들 환경에서 Worker 시작 시
 *      충돌을 일으킬 수 있으므로 dbConnect.js와 동일하게 정적 import 사용.
 *   2) Web Crypto API (globalThis.crypto.subtle) — 폴백
 */

// ★ 정적 import — 동적 import("node:crypto")는 OpenNext/esbuild 번들에서
//   비동기 require로 인라인돼 Worker 시작 충돌을 유발할 수 있음 (dbConnect.js 주석 참조)
import { createHmac as _nodeCrypto_createHmac } from "node:crypto";

const FLOWER_TOKEN_TTL_SEC = 8 * 60 * 60; // 8시간

function getSecret() {
  return String(process.env.FLOWER_ADMIN_SECRET || "flower-admin-dev-secret-placeholder-000000");
}

/** Web Crypto subtle — 폴백용 */
function _getSubtle() {
  if (globalThis?.crypto?.subtle) return globalThis.crypto.subtle;
  if (typeof crypto !== "undefined" && crypto?.subtle) return crypto.subtle;
  return null;
}

/**
 * base64url 인코더/디코더 (Buffer-free)
 */
function _b64uEncode(asciiStr) {
  return btoa(asciiStr)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function _b64uDecode(b64u) {
  const b64 = b64u.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (b64.length % 4)) % 4;
  return atob(b64 + "=".repeat(padding));
}

/**
 * HMAC-SHA256 hex — node:crypto 우선(정적 import), Web Crypto 폴백
 */
async function hmacSha256Hex(data, secretStr) {
  // 1순위: node:crypto 정적 import (nodejs_compat CF Workers + Node.js 18+)
  try {
    return _nodeCrypto_createHmac("sha256", secretStr).update(data).digest("hex");
  } catch {
    // node:crypto 사용 불가 → Web Crypto 폴백
  }
  // 2순위: Web Crypto API
  const subtle = _getSubtle();
  if (!subtle) throw new Error("HMAC 서명 불가 — node:crypto·Web Crypto 모두 사용 불가");
  const key = await subtle.importKey(
    "raw",
    new TextEncoder().encode(secretStr),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * 꽃 관리자 토큰 발급
 * @returns {Promise<string>} "payloadB64.hmacHex" 형식 토큰
 */
export async function generateFlowerAdminToken() {
  const now = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({ v: 1, issued: now, exp: now + FLOWER_TOKEN_TTL_SEC });
  const payloadB64 = _b64uEncode(payload);
  const sig = await hmacSha256Hex(payloadB64, getSecret());
  return `${payloadB64}.${sig}`;
}

/**
 * 꽃 관리자 토큰 검증
 * @param {string} token
 * @returns {Promise<boolean>}
 */
export async function verifyFlowerAdminToken(token) {
  // ★ 외부 예외를 catch해 500 전파 방지 — crypto 실패 시 false(→401) 반환
  try {
    if (!token || typeof token !== "string") return false;
    const dotIdx = token.lastIndexOf(".");
    if (dotIdx < 1) return false;

    const payloadB64 = token.slice(0, dotIdx);
    const sigFromToken = token.slice(dotIdx + 1);

    const expectedSig = await hmacSha256Hex(payloadB64, getSecret());

    // 타이밍-세이프 비교
    if (expectedSig.length !== sigFromToken.length) return false;
    let diff = 0;
    for (let i = 0; i < expectedSig.length; i++) {
      diff |= expectedSig.charCodeAt(i) ^ sigFromToken.charCodeAt(i);
    }
    if (diff !== 0) return false;

    const payloadStr = _b64uDecode(payloadB64);
    const parsed = JSON.parse(payloadStr);
    const now = Math.floor(Date.now() / 1000);
    const exp = Number(parsed?.exp || 0);
    return parsed && parsed.v === 1 && Number.isFinite(exp) && now <= exp;
  } catch {
    // crypto 초기화 실패·parse 오류 등 → 미인증 처리 (500 방지)
    return false;
  }
}

/**
 * Request 헤더에서 토큰 추출
 * Authorization: Bearer <token>, x-admin-token: <token>, 또는 fortune_auth_token 쿠키
 * @param {Request} request
 * @returns {string}
 */
export function extractAdminTokenFromRequest(request) {
  const auth = request.headers.get("authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();

  const xat = request.headers.get("x-admin-token") || "";
  if (xat) return xat.trim();

  // HTML 관리 패널 호환: fortune_auth_token 쿠키에서 토큰 추출
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/(?:^|;\s*)fortune_auth_token=([^;]+)/);
  if (match) {
    try { return decodeURIComponent(match[1]); } catch { return match[1]; }
  }

  return "";
}
