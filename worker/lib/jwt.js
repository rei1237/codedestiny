const encoder = new TextEncoder();

function base64UrlEncode(value) {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function parseExpiresIn(expiresIn) {
  if (expiresIn === undefined || expiresIn === null) return null;
  if (typeof expiresIn === "number" && Number.isFinite(expiresIn)) return Math.floor(expiresIn);

  const match = String(expiresIn).trim().match(/^(\d+)([smhd])?$/i);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = (match[2] || "s").toLowerCase();
  const multiplier = unit === "d" ? 86400 : unit === "h" ? 3600 : unit === "m" ? 60 : 1;
  return amount * multiplier;
}

async function importHmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signJwt(payload, secret, options = {}) {
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: payload.iat || now,
  };

  if (options.issuer) body.iss = options.issuer;

  const ttl = parseExpiresIn(options.expiresIn);
  if (ttl) body.exp = now + ttl;

  const headerPart = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadPart = base64UrlEncode(JSON.stringify(body));
  const signingInput = `${headerPart}.${payloadPart}`;
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(signingInput));
  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function verifyJwt(token, secret, options = {}) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) {
    const error = new Error("jwt malformed");
    error.name = "JsonWebTokenError";
    throw error;
  }

  const [headerPart, payloadPart, signaturePart] = parts;
  let header;
  try {
    header = JSON.parse(new TextDecoder().decode(base64UrlDecode(headerPart)));
  } catch {
    const error = new Error("invalid token header");
    error.name = "JsonWebTokenError";
    throw error;
  }

  if (header.alg !== "HS256") {
    const error = new Error("invalid algorithm");
    error.name = "JsonWebTokenError";
    throw error;
  }

  const key = await importHmacKey(secret);
  const verified = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlDecode(signaturePart),
    encoder.encode(`${headerPart}.${payloadPart}`),
  );

  if (!verified) {
    const error = new Error("invalid signature");
    error.name = "JsonWebTokenError";
    throw error;
  }

  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadPart)));
  } catch {
    const error = new Error("invalid token payload");
    error.name = "JsonWebTokenError";
    throw error;
  }

  const now = Math.floor(Date.now() / 1000);

  if (payload.exp && Number(payload.exp) <= now) {
    const error = new Error("jwt expired");
    error.name = "TokenExpiredError";
    throw error;
  }

  if (options.issuer && payload.iss !== options.issuer) {
    const error = new Error("jwt issuer invalid");
    error.name = "JsonWebTokenError";
    throw error;
  }

  return payload;
}
