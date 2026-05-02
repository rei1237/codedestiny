import { getEnv } from "../lib/env.js";
import { buildConfigErrorBody, buildRuntimeKeyMatrix, evaluateFeatureKeyHealth } from "../lib/key-health.js";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";

const ADMIN_ENTRY_PASSWORD_SHA256_LIST = [
  // current admin entry password: kangta!7989
  "f76a173ef47f93eec43168e10fc32dcbefb2d32200c44cbd33e4f0324437fb4e",
];

const FLOWER_TOKEN_TTL_SEC = 8 * 60 * 60;

function timingSafeEqualText(a, b) {
  const lhs = String(a || "");
  const rhs = String(b || "");
  if (lhs.length !== rhs.length) return false;

  let diff = 0;
  for (let index = 0; index < lhs.length; index += 1) {
    diff |= lhs.charCodeAt(index) ^ rhs.charCodeAt(index);
  }
  return diff === 0;
}

function base64urlEncode(text) {
  return btoa(text)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(text || "")));
  return bytesToHex(new Uint8Array(digest));
}

async function hmacSha256Hex(text, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text));
  return bytesToHex(new Uint8Array(signature));
}

async function verifyAdminEntryPassword(rawInput) {
  const input = String(rawInput || "");
  if (!input) return false;

  const inputHex = await sha256Hex(input);
  for (const expected of ADMIN_ENTRY_PASSWORD_SHA256_LIST) {
    if (timingSafeEqualText(inputHex, expected)) return true;
  }
  return false;
}

async function issueFlowerAdminToken(env) {
  const now = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({ v: 1, issued: now, exp: now + FLOWER_TOKEN_TTL_SEC });
  const payloadB64 = base64urlEncode(payload);
  const secret = getEnv(env, "FLOWER_ADMIN_SECRET");
  const signature = await hmacSha256Hex(payloadB64, secret);
  return `${payloadB64}.${signature}`;
}

function setFlowerAdminCookie(response, token, request) {
  const isHttps = new URL(request.url).protocol === "https:";
  const cookie = [
    `flower_admin_token=${encodeURIComponent(token)}`,
    "Path=/",
    `Max-Age=${FLOWER_TOKEN_TTL_SEC}`,
    "SameSite=Lax",
    "HttpOnly",
    isHttps ? "Secure" : "",
  ].filter(Boolean).join("; ");

  response.headers.append("Set-Cookie", cookie);
}

async function handleEntryPassword(request, env) {
  const gateHealth = evaluateFeatureKeyHealth(env, "admin-gate");
  if (!gateHealth.ok) {
    return json(buildConfigErrorBody("admin-gate", gateHealth), { status: 503 });
  }

  const body = await readJson(request);
  const password = String(body?.password || "");
  if (!await verifyAdminEntryPassword(password)) {
    return json({ message: "Not found" }, { status: 404 });
  }

  const adminToken = await issueFlowerAdminToken(env);
  const expectedHash = getEnv(env, "ADMIN_SECRET_HASH");
  const response = json({
    ok: true,
    adminToken,
    nextUrl: expectedHash ? `/${expectedHash}/login` : "/admin",
  }, { status: 200 });

  setFlowerAdminCookie(response, adminToken, request);
  return response;
}

function handleKeyHealth(env) {
  const matrix = buildRuntimeKeyMatrix(env);
  return json({
    ok: true,
    service: "code-destiny-api-worker",
    message: "Runtime key health matrix for feature diagnostics.",
    matrix,
  }, { status: 200 });
}

export async function handleAdminRoutes(request, env) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/admin");

  if (method === "POST" && path === "/entry/password") {
    return handleEntryPassword(request, env);
  }

  if (method === "GET" && path === "/keys") {
    return handleKeyHealth(env);
  }

  if (["GET", "POST", "PATCH", "PUT", "DELETE"].includes(method)) return notFound();
  return methodNotAllowed();
}
