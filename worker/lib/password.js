import bcrypt from "bcryptjs";

const HMAC_PREFIX = "hmac-sha256-v1";
const PBKDF2_PREFIX = "pbkdf2-sha256";
const PBKDF2_LEGACY_PREFIX = "pbkdf2$sha256";
const PBKDF2_SALT_BYTES = 16;
const PBKDF2_KEY_BYTES = 32;

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
  const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_BYTES));
  const hash = await signPasswordHmac(password, salt);

  return [
    HMAC_PREFIX,
    toBase64Url(salt),
    toBase64Url(hash),
  ].join("$");
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
      return bcrypt.compare(password, hash);
    }

    return false;
  } catch (e) {
    return false;
  }
}
