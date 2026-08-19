/**
 * 개인정보 필드 암호화 (AES-256-GCM) — 현재 대상은 User.phoneNumber 하나뿐이다.
 *
 * 저장 포맷: `v1:<iv_b64>:<ciphertext_b64>` — 레코드마다 12바이트 랜덤 IV.
 * 키는 Cloudflare Secret `PII_ENC_KEY`(base64 32바이트). 소스 하드코딩·`NEXT_PUBLIC_` 금지.
 *
 * 🔴 해시가 아니라 가역 암호화인 이유: PortOne/이니시스 결제창이 구매자 휴대폰 번호 **평문**을
 * 요구한다(worker/routes/payments.js buildSinglePaymentCustomer → customer.phoneNumber).
 *
 * 🔴 decrypt 는 프리픽스가 없으면 평문으로 간주해 그대로 통과시킨다(하위호환 읽기).
 * 이게 없으면 마이그레이션 전 기존 회원의 단건 결제가 전부 막힌다.
 *
 * 🔴 같은 번호끼리 비교하는 수단은 일부러 두지 않는다 — IV 가 레코드마다 랜덤이라 봉투로는
 * 비교가 안 되고, 비교용 결정적 해시를 따로 저장하면 목적 없는 식별자가 하나 더 생긴다.
 * 이 서비스는 한 번호로 계정을 여러 개 만드는 것을 허용하므로 비교할 이유 자체가 없다.
 */

const ENVELOPE_PREFIX = "v1:";
export const ENCRYPTED_PII_PATTERN = /^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/;

const IV_BYTE_LENGTH = 12;
const KEY_BYTE_LENGTH = 32;

// importKey 는 요청마다 다시 하면 낭비다(/api/auth/me 는 핫패스). 키 문자열이 같은 동안 재사용한다.
let cachedKeyMaterial = "";
let cachedKeyPromise = null;

function readKeyMaterial(env) {
  return String(env?.PII_ENC_KEY || "").trim();
}

function base64ToBytes(value) {
  const binary = atob(String(value || ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes) {
  let binary = "";
  const view = new Uint8Array(bytes);
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]);
  return btoa(binary);
}

/** 키 문자열 → 32바이트 원본. 형식이 어긋나면 암호화와 같은 이유로 던진다(fail-closed). */
function readRawKeyBytes(env) {
  const material = readKeyMaterial(env);
  if (!material) throw new Error("pii_encryption_key_missing");

  let rawKey;
  try {
    rawKey = base64ToBytes(material);
  } catch (e) {
    throw new Error("pii_encryption_key_invalid");
  }
  if (rawKey.length !== KEY_BYTE_LENGTH) throw new Error("pii_encryption_key_invalid");
  return { material, rawKey };
}

async function getEncryptionKey(env) {
  const { material, rawKey } = readRawKeyBytes(env);
  if (cachedKeyMaterial === material && cachedKeyPromise) return await cachedKeyPromise;

  cachedKeyMaterial = material;
  cachedKeyPromise = crypto.subtle.importKey("raw", rawKey, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  return await cachedKeyPromise;
}

export function isEncryptedPiiValue(value) {
  return String(value || "").startsWith(ENVELOPE_PREFIX);
}

/**
 * 한국 휴대폰 번호 정규화. worker/routes/auth.js 의 동명 함수와 같은 규칙이며,
 * 복호화 결과가 항상 이 형태이므로 하위 소비자(sanitizeCustomerPhone 등)에는 멱등이다.
 */
export function normalizeKoreanPhoneNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  const localDigits = digits.startsWith("82") && /^821\d{8,9}$/.test(digits) ? `0${digits.slice(2)}` : digits;
  if (!/^01\d{8,9}$/.test(localDigits)) return "";
  return localDigits;
}

/**
 * 평문 휴대폰 번호 → 저장용 봉투. 정규화에 실패하면 "" 를 돌려 호출자가 기존 검증에 걸리게 한다.
 * 🔴 키가 없으면 평문으로 폴백하지 않고 throw 한다(fail-closed) — "암호화해서 보관한다"는
 * 가입 화면 문구가 조용히 거짓이 되는 쪽이 가입이 막히는 쪽보다 나쁘다.
 */
export async function encryptPhoneNumber(value, env) {
  const phoneNumber = normalizeKoreanPhoneNumber(value);
  if (!phoneNumber) return "";

  const key = await getEncryptionKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTE_LENGTH));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(phoneNumber),
  );

  return `${ENVELOPE_PREFIX}${bytesToBase64(iv)}:${bytesToBase64(ciphertext)}`;
}

/**
 * 저장값 → 평문 휴대폰 번호. 봉투가 아니면 평문으로 간주해 정규화만 한다(하위호환).
 * 복호화 실패(키 부재·키 불일치·손상)는 throw 하지 않고 "" 를 돌린다 — 호출자 입장에서는
 * "번호 없음"과 같아 결제창 앞 기존 재입력 경로가 그대로 동작한다.
 */
export async function decryptPhoneNumber(value, env) {
  const stored = String(value || "").trim();
  if (!stored) return "";
  if (!isEncryptedPiiValue(stored)) return normalizeKoreanPhoneNumber(stored);

  const [, ivPart, ciphertextPart] = stored.split(":");
  if (!ivPart || !ciphertextPart) return "";

  try {
    const key = await getEncryptionKey(env);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(ivPart) },
      key,
      base64ToBytes(ciphertextPart),
    );
    return normalizeKoreanPhoneNumber(new TextDecoder().decode(plaintext));
  } catch (e) {
    return "";
  }
}

export function maskKoreanPhoneNumber(value) {
  const phoneNumber = normalizeKoreanPhoneNumber(value);
  if (!phoneNumber) return "";
  return `${phoneNumber.slice(0, 3)}-****-${phoneNumber.slice(-4)}`;
}
