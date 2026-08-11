import bcrypt from "bcryptjs";

const HMAC_PREFIX = "hmac-sha256-v1";
const PBKDF2_PREFIX = "pbkdf2-sha256";
const PBKDF2_LEGACY_PREFIX = "pbkdf2$sha256";
const PBKDF2_SALT_BYTES = 16;
const PBKDF2_KEY_BYTES = 32;
// 🔴 Cloudflare Workers 의 WebCrypto 는 PBKDF2 반복수를 100,000 으로 **하드 제한**한다.
// 초과하면 crypto.subtle.deriveBits 가 그 자리에서 throw 한다:
//   `Pbkdf2 failed: iteration counts above 100000 are not supported (requested 600000).`
// 이 값을 올리지 말 것. 2026-07 에 OWASP 권고치(600,000)로 넣었다가 이메일 회원가입이
// 500(unknown_error)으로 죽었고, jest 는 Node 에서 돌아 상한이 없으니 아무도 못 잡았다.
// (bcrypt 로 되돌리는 것도 금지 — 아래 hashPassword 주석의 1102 사유 참고.)
export const PBKDF2_MAX_ITERATIONS = 100000;
const PBKDF2_ITERATIONS = PBKDF2_MAX_ITERATIONS;

function toBase64Url(uint8Array) {
  if (typeof btoa !== "function" && typeof Buffer !== "undefined") {
    return Buffer.from(uint8Array).toString("base64url");
  }

  let binary = "";
  for (const byte of uint8Array) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(raw) {
  const value = String(raw || "").replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (value.length % 4)) % 4;
  const padded = value + "=".repeat(padLength);

  if (typeof atob !== "function" && typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(padded, "base64"));
  }

  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function timingSafeEqual(a, b) {
  if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array)) return false;
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= (a[i] ^ b[i]);
  }

  return diff === 0;
}

async function derivePbkdf2Key(password, salt, iterations) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(String(password || "")),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations,
    },
    keyMaterial,
    PBKDF2_KEY_BYTES * 8,
  );

  return new Uint8Array(bits);
}

async function signPasswordHmac(password, salt) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    salt,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(String(password || "")));
  return new Uint8Array(signature);
}

export async function hashPassword(password) {
  // 🔴 신규 해시는 PBKDF2 다. bcryptjs(순수 JS, rounds 12)로 돌아가지 말 것 —
  // 이 워커에서 cost 12 검증이 ~270ms CPU 를 먹어 로그인이 간헐적으로
  // `error code: 1102`(Worker exceeded resource limits)로 죽었다(worker/routes/admin.js:51-56).
  // PBKDF2 는 crypto.subtle 네이티브라 같은 자리에서 훨씬 싸다(실측: 100k≈18ms).
  // 반복수 상한 사유는 PBKDF2_MAX_ITERATIONS 주석 참고.
  const startedAt = Date.now();
  const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_BYTES));
  const derived = await derivePbkdf2Key(password, salt, PBKDF2_ITERATIONS);
  const hash = `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(derived)}`;
  console.log(`[password] pbkdf2 hash iterations=${PBKDF2_ITERATIONS} elapsedMs=${Date.now() - startedAt}`);
  return hash;
}

// 저장된 해시가 레거시 bcrypt 포맷이면 true — 로그인 성공 시 PBKDF2 로 갈아끼우는 신호다.
// (PBKDF2/HMAC 는 이미 목표 포맷이므로 false. verifyPassword 는 세 포맷을 모두 계속 받는다.)
export function needsPasswordRehash(encodedHash) {
  const hash = String(encodedHash || "").trim();
  return hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$");
}

async function verifyHmac(password, encodedHash) {
  try {
    const parts = String(encodedHash || "").split("$");
    if (parts.length !== 3 || parts[0] !== HMAC_PREFIX) return false;

    const salt = fromBase64Url(parts[1]);
    const expected = fromBase64Url(parts[2]);
    const actual = await signPasswordHmac(password, salt);
    return timingSafeEqual(expected, actual);
  } catch (e) {
    return false;
  }
}

async function verifyPbkdf2(password, encodedHash) {
  try {
    const parts = String(encodedHash || "").split("$");
    let iterationsRaw = "";
    let saltRaw = "";
    let hashRaw = "";

    if (parts.length === 4 && parts[0] === PBKDF2_PREFIX) {
      [, iterationsRaw, saltRaw, hashRaw] = parts;
    } else if (parts.length === 5 && `${parts[0]}$${parts[1]}` === PBKDF2_LEGACY_PREFIX) {
      [, , iterationsRaw, saltRaw, hashRaw] = parts;
    } else {
      return false;
    }

    const iterations = Number(iterationsRaw);
    if (!Number.isFinite(iterations) || iterations <= 0) {
      return false;
    }

    const salt = fromBase64Url(saltRaw);
    const expected = fromBase64Url(hashRaw);
    const actual = await derivePbkdf2Key(password, salt, iterations);
    return timingSafeEqual(expected, actual);
  } catch (e) {
    return false;
  }
}

export async function verifyPassword(password, encodedHash) {
  try {
    const hash = String(encodedHash || "").trim();
    if (!hash) return false;

    if (hash.startsWith(`${HMAC_PREFIX}$`)) {
      return verifyHmac(password, hash);
    }

    if (hash.startsWith(`${PBKDF2_PREFIX}$`) || hash.startsWith(`${PBKDF2_LEGACY_PREFIX}$`)) {
      return verifyPbkdf2(password, hash);
    }

    if (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")) {
      const startedAt = Date.now();
      const ok = await bcrypt.compare(password, hash);
      console.log(`[password] bcrypt compare elapsedMs=${Date.now() - startedAt}`);
      return ok;
    }

    return false;
  } catch (e) {
    return false;
  }
}
