/**
 * 꽃 버튼 관리자 세션 토큰 유틸리티
 *
 * 비밀번호 게이트 통과 후 발급되는 단기 관리자 세션 토큰.
 * HMAC-SHA256 서명 + 만료 시간 검증으로 위·변조 방지.
 * 환경변수 FLOWER_ADMIN_SECRET 을 반드시 Cloudflare Pages에 설정해야 한다.
 */

const FLOWER_TOKEN_TTL_SEC = 8 * 60 * 60; // 8시간

function getSecret() {
  return String(process.env.FLOWER_ADMIN_SECRET || "flower-admin-dev-secret-placeholder-000000");
}

async function hmacSha256Hex(data, secretStr) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secretStr),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
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
    return payload && payload.v === 1 && now <= payload.exp;
  } catch {
    return false;
  }
}

/**
 * Request 헤더에서 토큰 추출
 * Authorization: Bearer <token> 또는 x-admin-token: <token>
 * @param {Request} request
 * @returns {string}
 */
export function extractAdminTokenFromRequest(request) {
  const auth = request.headers.get("authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  return request.headers.get("x-admin-token") || "";
}
