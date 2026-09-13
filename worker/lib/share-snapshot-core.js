/**
 * 공유 스냅샷 공통 코어 — 도메인 지식이 0인 부분만 모은다.
 *
 * guardian-fortune-share.js 가 먼저 갖고 있던 조각들이다. 정적 셸 결과(타로·사주)도
 * 같은 서명·정제·PII 규칙을 써야 하므로, 두 번째 사용처가 생기기 전에 여기로 뺀다.
 * 🔴 운세 필드명·CTA·토픽 같은 도메인 규칙은 여기 들어오지 않는다. 그것까지 끌어오면
 * 공통 코어가 아니라 가디언 모듈의 별칭이 된다.
 */

/** 전화번호·주민번호·이메일 등 공개 스냅샷에 굳으면 안 되는 문자열. */
export const SENSITIVE_PATTERNS = Object.freeze([
  /\b\d{6}[- ]?\d{7}\b/,
  /\b\d{2,4}[- ]?\d{3,4}[- ]?\d{4}\b/,
  /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/,
  /(?:주민번호|주민등록|계좌번호|카드번호|비밀번호|password)/i,
]);

/** 태그·제어문자를 걷어내고 공백을 정규화한 뒤 limit 로 자른다. */
export function sanitizeShareText(value, limit) {
  return String(value == null ? "" : value)
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim()
    .slice(0, limit);
}

export function hasSensitiveText(value) {
  if (typeof value !== "string") return false;
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(value));
}

export function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function stringToBase64Url(value) {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

export function base64UrlToString(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * HMAC-SHA256 서명. cryptoErrorCode 로 호출자가 자기 오류 코드를 유지한다 —
 * 라우트 쪽 오류 매핑이 모듈별 접두사에 붙어 있어서 통일하면 계약이 깨진다.
 */
export async function signShareTokenBody(body, secret, { cryptoErrorCode = "SHARE_SNAPSHOT_CRYPTO_UNAVAILABLE" } = {}) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error(cryptoErrorCode);
  const key = await subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return bytesToBase64Url(new Uint8Array(signature));
}

/** 상수 시간 비교. 길이가 다르면 즉시 false 라 길이는 새어 나가지만 서명은 새지 않는다. */
export async function signaturesMatch(expected, actual) {
  const left = String(expected || "");
  const right = String(actual || "");
  if (!left || left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export function createShareId(prefix, byteLength = 18) {
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return `${prefix}${bytesToBase64Url(bytes)}`;
}

export function toIso(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}
