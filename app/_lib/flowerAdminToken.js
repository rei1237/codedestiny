/**
 * 꽃 버튼 관리자 세션 토큰 유틸리티
 *
 * 비밀번호 게이트 통과 후 발급되는 단기 관리자 세션 토큰.
 * HMAC-SHA256 서명 + 만료 시간 검증으로 위·변조 방지.
 * 환경변수 FLOWER_ADMIN_SECRET 을 반드시 Cloudflare Pages/Worker에 설정해야 한다.
 *
 * ★ 구현 방침 (CF Workers Error 1101 방지):
 *   - node:crypto 정적/동적 import 금지
 *     → OpenNext/esbuild 번들 + CF Workers 환경에서 Worker 초기화 실패 유발
 *       (커밋 103faa0 에서 제거해 1101 해소한 이력 있음)
 *   - Web Crypto (globalThis.crypto.subtle) 만 사용
 *     CF Workers + Node.js 18+: globalThis.crypto.subtle 항상 가용
 */

const FLOWER_TOKEN_TTL_SEC = 8 * 60 * 60; // 8시간

function getSecret() {
  return String(process.env.FLOWER_ADMIN_SECRET || "flower-admin-dev-secret-placeholder-000000");
}

/** Web Crypto subtle — CF Workers + Node.js 18+ 양쪽 모두 가용 */
function _getSubtle() {
  if (globalThis?.crypto?.subtle) return globalThis.crypto.subtle;
  if (typeof crypto !== "undefined" && crypto?.subtle) return crypto.subtle;
  return null;
}

/**
 * base64url 인코더/디코더 (Buffer-free — CF Workers + Node 18+ 모두 btoa/atob 지원)
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
 * HMAC-SHA256 hex — Web Crypto only
 * node:crypto import 금지 (CF Error 1101 방지)
 */
async function hmacSha256Hex(data, secretStr) {
  const subtle = _getSubtle();
  if (!subtle) throw new Error("HMAC 서명 불가 — crypto.subtle 사용 불가 환경입니다. (CF Workers 또는 Node.js 18+ 필요)");
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
  } catch (e) {
    // crypto 초기화 실패·parse 오류 등 → 미인증 처리 (500 방지)
    return false;
  }
}

/**
 * Request 헤더에서 토큰 추출
 * Authorization: Bearer <token>, x-admin-token: <token>, 또는 flower_admin_token 쿠키 / fortune_auth_token(레거시) 쿠키
 * @param {Request} request
 * @returns {string}
 */
export function extractAdminTokenFromRequest(request) {
  const FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;

  const xat = request.headers.get("x-admin-token") || "";
  if (xat && FLOWER_ADMIN_TOKEN_RE.test(String(xat).trim())) return String(xat).trim();

  // Authorization: Bearer <token>
  // 주의: 일반 JWT Bearer를 관리자 토큰으로 먼저 소모하면
  // x-admin-token/cookie 관리자 세션 판별이 막히므로, x-admin-token 이후에만 확인한다.
  const auth = request.headers.get("authorization") || "";
  if (auth.startsWith("Bearer ")) {
    const bearerToken = auth.slice(7).trim();
    if (bearerToken && FLOWER_ADMIN_TOKEN_RE.test(String(bearerToken))) return bearerToken;
    // 빈 Bearer → 쿠키에서 시도
  }

  // 쿠키 폴백: flower_admin_token (현행) → fortune_auth_token (레거시) 순서로 탐색
  const cookieHeader = request.headers.get("cookie") || "";
  const flowerMatch = cookieHeader.match(/(?:^|;\s*)flower_admin_token=([^;]+)/);
  if (flowerMatch) {
    try {
      const decoded = decodeURIComponent(flowerMatch[1]);
      return FLOWER_ADMIN_TOKEN_RE.test(decoded) ? decoded : "";
    } catch (e) {
      return FLOWER_ADMIN_TOKEN_RE.test(flowerMatch[1]) ? flowerMatch[1] : "";
    }
  }
  const legacyMatch = cookieHeader.match(/(?:^|;\s*)fortune_auth_token=([^;]+)/);
  if (legacyMatch) {
    try {
      const decoded = decodeURIComponent(legacyMatch[1]);
      return FLOWER_ADMIN_TOKEN_RE.test(decoded) ? decoded : "";
    } catch (e) {
      return FLOWER_ADMIN_TOKEN_RE.test(legacyMatch[1]) ? legacyMatch[1] : "";
    }
  }

  return "";
}
