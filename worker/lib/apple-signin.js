// 웹 Sign in with Apple(Services ID) 서버 측 도구.
//
// 🔴 비밀값은 env 에서만 읽는다. 네 값(팀·Services ID·키 ID·개인키) 중 하나라도 없으면
// isAppleSiwaConfigured 가 false 이고, 라우트는 닫힌 채(503)로 응답하며 로그인 화면은 버튼을 숨긴다.
// 🔴 id_token 은 반드시 Apple JWKS 로 서명을 검증하고 iss·aud·exp·nonce 를 모두 확인한다 —
// 콜백은 사이트 간 form_post 라 본문을 누구나 만들어 보낼 수 있기 때문이다.
import { getEnv } from "./env.js";

export const APPLE_ISSUER = "https://appleid.apple.com";
export const APPLE_AUTHORIZE_ENDPOINT = "https://appleid.apple.com/auth/authorize";
export const APPLE_TOKEN_ENDPOINT = "https://appleid.apple.com/auth/token";
export const APPLE_JWKS_ENDPOINT = "https://appleid.apple.com/auth/keys";
export const APPLE_PRIVATE_RELAY_DOMAIN = "privaterelay.appleid.com";

const JWKS_CACHE_TTL_MS = 60 * 60 * 1000;
const CLIENT_SECRET_TTL_SEC = 5 * 60;
const CLOCK_SKEW_SEC = 60;
const encoder = new TextEncoder();

let jwksCache = { keys: null, fetchedAt: 0 };

function base64UrlEncode(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecodeToBytes(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function decodeJsonPart(part) {
  return JSON.parse(new TextDecoder().decode(base64UrlDecodeToBytes(part)));
}

function appleError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

export function readAppleSiwaConfig(env) {
  return {
    teamId: String(getEnv(env, "APPLE_TEAM_ID") || "").trim(),
    servicesId: String(getEnv(env, "APPLE_SIWA_SERVICES_ID") || "").trim(),
    keyId: String(getEnv(env, "APPLE_SIWA_KEY_ID") || "").trim(),
    // 대시보드에 한 줄로 붙여 넣으면 줄바꿈이 "\n" 글자로 남는다. 그 경우만 되돌린다.
    privateKey: String(getEnv(env, "APPLE_SIWA_PRIVATE_KEY") || "").replace(/\\n/g, "\n").trim(),
  };
}

export function isAppleSiwaConfigured(env) {
  const config = readAppleSiwaConfig(env);
  return Boolean(config.teamId && config.servicesId && config.keyId && config.privateKey);
}

function pemToPkcs8Bytes(pem) {
  const body = String(pem || "")
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  if (!body) throw appleError("apple_private_key_invalid");
  return base64UrlDecodeToBytes(body.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""));
}

/**
 * Apple 토큰 엔드포인트용 client_secret(ES256 JWT). 매 교환마다 짧게(5분) 만들어 쓴다 —
 * 최대 6개월까지 허용되지만 오래 사는 비밀을 만들 이유가 없다.
 */
export async function buildAppleClientSecret(config, nowSec = Math.floor(Date.now() / 1000)) {
  let key;
  try {
    key = await crypto.subtle.importKey(
      "pkcs8",
      pemToPkcs8Bytes(config.privateKey),
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"],
    );
  } catch (error) {
    throw appleError("apple_private_key_invalid");
  }
  const header = base64UrlEncode(encoder.encode(JSON.stringify({ alg: "ES256", kid: config.keyId, typ: "JWT" })));
  const payload = base64UrlEncode(encoder.encode(JSON.stringify({
    iss: config.teamId,
    iat: nowSec,
    exp: nowSec + CLIENT_SECRET_TTL_SEC,
    aud: APPLE_ISSUER,
    sub: config.servicesId,
  })));
  const signingInput = `${header}.${payload}`;
  // WebCrypto ECDSA 서명은 이미 JWS 가 요구하는 r||s(64바이트) 형식이다.
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, encoder.encode(signingInput));
  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

/**
 * nonce 는 브라우저 묶음 쿠키(64 hex)에서 유도한다. state 에 따로 싣지 않아도 콜백이 같은
 * 쿠키로 다시 계산할 수 있고, 쿠키가 없는 다른 브라우저는 맞출 수 없다.
 */
export async function deriveAppleNonce(browserBinding) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(`apple-nonce:${String(browserBinding || "")}`));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function loadAppleJwks(fetchImpl, { forceRefresh = false } = {}) {
  const now = Date.now();
  if (!forceRefresh && jwksCache.keys && now - jwksCache.fetchedAt < JWKS_CACHE_TTL_MS) return jwksCache.keys;
  const response = await fetchImpl(APPLE_JWKS_ENDPOINT, { method: "GET", headers: { Accept: "application/json" } });
  if (!response || !response.ok) throw appleError("apple_jwks_unavailable");
  const body = await response.json().catch(() => null);
  const keys = Array.isArray(body?.keys) ? body.keys : null;
  if (!keys || !keys.length) throw appleError("apple_jwks_unavailable");
  jwksCache = { keys, fetchedAt: now };
  return keys;
}

export function resetAppleJwksCacheForTests() {
  jwksCache = { keys: null, fetchedAt: 0 };
}

async function findAppleJwk(kid, fetchImpl) {
  let keys = await loadAppleJwks(fetchImpl);
  let jwk = keys.find((item) => item?.kid === kid);
  if (!jwk) {
    // Apple 이 키를 돌렸을 수 있다 — 한 번만 새로 받아 본다.
    keys = await loadAppleJwks(fetchImpl, { forceRefresh: true });
    jwk = keys.find((item) => item?.kid === kid);
  }
  if (!jwk) throw appleError("apple_id_token_unknown_key");
  return jwk;
}

function audienceMatches(aud, clientId) {
  if (Array.isArray(aud)) return aud.includes(clientId);
  return aud === clientId;
}

/**
 * Apple id_token(RS256) 검증. 통과하면 claims 를 돌려주고, 아니면 apple_id_token_* 오류를 던진다.
 */
export async function verifyAppleIdToken(idToken, { clientId, nonce, fetchImpl, nowSec = Math.floor(Date.now() / 1000) }) {
  const parts = String(idToken || "").split(".");
  if (parts.length !== 3) throw appleError("apple_id_token_malformed");
  let header;
  let claims;
  try {
    header = decodeJsonPart(parts[0]);
    claims = decodeJsonPart(parts[1]);
  } catch (error) {
    throw appleError("apple_id_token_malformed");
  }
  if (header?.alg !== "RS256" || !header?.kid) throw appleError("apple_id_token_malformed");

  const jwk = await findAppleJwk(header.kid, fetchImpl);
  let verified = false;
  try {
    const key = await crypto.subtle.importKey(
      "jwk",
      { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    verified = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      base64UrlDecodeToBytes(parts[2]),
      encoder.encode(`${parts[0]}.${parts[1]}`),
    );
  } catch (error) {
    verified = false;
  }
  if (!verified) throw appleError("apple_id_token_bad_signature");

  if (claims?.iss !== APPLE_ISSUER) throw appleError("apple_id_token_bad_issuer");
  if (!clientId || !audienceMatches(claims?.aud, clientId)) throw appleError("apple_id_token_bad_audience");
  const exp = Number(claims?.exp);
  if (!Number.isFinite(exp) || exp + CLOCK_SKEW_SEC < nowSec) throw appleError("apple_id_token_expired");
  if (!nonce || String(claims?.nonce || "") !== String(nonce)) throw appleError("apple_id_token_bad_nonce");
  if (!String(claims?.sub || "").trim()) throw appleError("apple_id_token_missing_subject");
  return claims;
}

/** 인가 코드를 Apple 토큰으로 바꾼다. id_token 만 쓴다(Apple 은 별도 프로필 API 가 없다). */
export async function exchangeAppleAuthorizationCode({ code, redirectUri, config, fetchImpl }) {
  const clientSecret = await buildAppleClientSecret(config);
  const response = await fetchImpl(APPLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      client_id: config.servicesId,
      client_secret: clientSecret,
      code: String(code || ""),
      grant_type: "authorization_code",
      redirect_uri: String(redirectUri || ""),
    }).toString(),
  });
  const body = await response?.json?.().catch(() => null);
  if (!response?.ok || !body?.id_token) throw appleError("apple_token_exchange_failed");
  return body;
}

function isTrueClaim(value) {
  return value === true || String(value || "").toLowerCase() === "true";
}

function buildDisplayName(userJson) {
  const first = String(userJson?.name?.firstName || "").trim();
  const last = String(userJson?.name?.lastName || "").trim();
  if (!first && !last) return "";
  // 한글 이름은 성+이름을 붙여 쓰고, 그 밖에는 이름 성 순서로 띄어 쓴다.
  if (/^[가-힣]+$/.test(`${first}${last}`)) return `${last}${first}`;
  return [first, last].filter(Boolean).join(" ");
}

/**
 * 검증된 claims(+첫 인증 때만 오는 form 의 user JSON)를 mapSocialProfile 과 같은 모양으로 바꾼다.
 * 이름은 Apple 이 **첫 인증에만** 준다.
 */
export function mapAppleProfile(claims, rawUserJson = "") {
  let userJson = null;
  try {
    userJson = rawUserJson ? JSON.parse(String(rawUserJson)) : null;
  } catch (error) {
    userJson = null;
  }
  const email = String(claims?.email || "").trim().toLowerCase();
  const isPrivateRelay = isTrueClaim(claims?.is_private_email) || email.endsWith(`@${APPLE_PRIVATE_RELAY_DOMAIN}`);
  return {
    providerId: String(claims?.sub || "").trim(),
    email,
    emailVerified: email ? isTrueClaim(claims?.email_verified) : null,
    isPrivateRelay,
    name: buildDisplayName(userJson) || "Apple user",
    image: "",
    phoneNumber: "",
  };
}
