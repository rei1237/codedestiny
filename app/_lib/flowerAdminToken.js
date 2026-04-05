/**
 * 꽃 버튼 관리자 세션 토큰 유틸리티
 *
 * 비밀번호 게이트 통과 후 발급되는 단기 관리자 세션 토큰.
 * HMAC-SHA256 서명 + 만료 시간 검증으로 위·변조 방지.
 * 환경변수 FLOWER_ADMIN_SECRET 을 반드시 Cloudflare Pages에 설정해야 한다.
 *
 * ★ node:crypto 는 Cloudflare Workers 런타임에서 nodejs_compat 플래그 없이
 *   임포트하면 Error 1101(Worker threw exception)을 유발하므로 사용 금지.
 *   Web Crypto API(globalThis.crypto.subtle)는 Cloudflare Workers / Node.js 18+
 *   모두에서 기본 제공되므로 이쪽만 사용한다.
 */

const FLOWER_TOKEN_TTL_SEC = 8 * 60 * 60; // 8시간

function getSecret() {
  return String(process.env.FLOWER_ADMIN_SECRET || "flower-admin-dev-secret-placeholder-000000");
}

/** Web Crypto subtle — Cloudflare Workers(global crypto) 및 Node.js 18+ 모두 대응 */
function getSubtle() {
  if (globalThis?.crypto?.subtle) return globalThis.crypto.subtle;
  // Bare "crypto" global — Cloudflare Workers 환경
  if (typeof crypto !== "undefined" && crypto?.subtle) return crypto.subtle;
  throw new Error("Web Crypto API(crypto.subtle)가 현재 런타임에서 사용 불가합니다.");
}

async function hmacSha256Hex(data, secretStr) {
  const subtle = getSubtle();
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
  const payloadB64 = Buffer.from(payload).toString("base64url");
  const sig = await hmacSha256Hex(payloadB64, getSecret());
  return `${payloadB64}.${sig}`;
}

/**
 * 꽃 관리자 토큰 검증
 * @param {string} token
 * @returns {Promise<boolean>}
 */
export async function verifyFlowerAdminToken(token) {
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

  try {
    const payloadStr = Buffer.from(payloadB64, "base64url").toString("utf8");
    const payload = JSON.parse(payloadStr);
    const now = Math.floor(Date.now() / 1000);
    const exp = Number(payload?.exp || 0);
    return payload && payload.v === 1 && Number.isFinite(exp) && now <= exp;
  } catch {
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
