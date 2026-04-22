/**
 * CSRF 토큰 유틸리티
 *
 * 방식: Double Submit Cookie 패턴
 *   1. 서버가 서명된 CSRF 토큰을 HttpOnly=false 쿠키로 발급
 *   2. 클라이언트가 해당 쿠키 값을 X-CSRF-Token 헤더에 포함
 *   3. 서버가 헤더 값을 서명 검증하여 위변조 방지
 *
 * Next.js App Router 서버리스 환경에서 세션 저장소 없이 동작합니다.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const CSRF_SECRET = process.env.CSRF_SECRET || process.env.JWT_SECRET || "dev-csrf-secret";
const CSRF_COOKIE_NAME = "cd_csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

// 토큰 유효 시간: 2시간
const TOKEN_TTL_MS = 2 * 60 * 60 * 1000;

/**
 * 서명된 CSRF 토큰 생성
 * 형식: `{timestamp}.{random}.{hmac_signature}`
 */
export function generateCsrfToken() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  const payload = `${timestamp}.${random}`;
  const sig = createHmac("sha256", CSRF_SECRET)
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

/**
 * CSRF 토큰 유효성 검증
 * @returns {{ valid: boolean, reason?: string }}
 */
export function verifyCsrfToken(token) {
  if (typeof token !== "string" || !token) {
    return { valid: false, reason: "토큰 누락" };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return { valid: false, reason: "토큰 형식 불일치" };
  }

  const [ts36, random, providedSig] = parts;

  // 시간 만료 검사
  const issuedAt = parseInt(ts36, 36);
  if (Date.now() - issuedAt > TOKEN_TTL_MS) {
    return { valid: false, reason: "토큰 만료" };
  }

  // 서명 검증 (timing-safe 비교)
  const payload = `${ts36}.${random}`;
  const expectedSig = createHmac("sha256", CSRF_SECRET)
    .update(payload)
    .digest("hex");

  const expected = Buffer.from(expectedSig, "hex");
  const provided = Buffer.from(providedSig.padEnd(expectedSig.length, "0"), "hex");

  if (expected.length !== provided.length) {
    return { valid: false, reason: "서명 길이 불일치" };
  }

  if (!timingSafeEqual(expected, provided)) {
    return { valid: false, reason: "서명 불일치" };
  }

  return { valid: true };
}

/**
 * Request에서 CSRF 토큰을 쿠키와 헤더에서 각각 추출하여 비교 검증
 */
export function validateCsrfFromRequest(request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookieMatch = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]+)`),
  );
  const cookieToken = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) {
    return { valid: false, reason: "CSRF 토큰 누락 (쿠키 또는 헤더)" };
  }

  // 쿠키 값과 헤더 값이 같은지 먼저 확인 (double-submit 핵심)
  const cookieBuf = Buffer.from(cookieToken);
  const headerBuf = Buffer.from(headerToken);
  if (
    cookieBuf.length !== headerBuf.length ||
    !timingSafeEqual(cookieBuf, headerBuf)
  ) {
    return { valid: false, reason: "CSRF 토큰 불일치" };
  }

  // 서명 검증
  return verifyCsrfToken(cookieToken);
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
