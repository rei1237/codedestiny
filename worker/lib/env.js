const ENV_KEY_ALIASES = {
  emailapi: ["EMAILAPI_KEY", "RESEND_API_KEY"],
  EMAILAPI_KEY: ["emailapi", "RESEND_API_KEY"],
  RESEND_API_KEY: ["emailapi", "EMAILAPI_KEY"],
  AUTH_SECRET: ["NEXTAUTH_SECRET"],
  JWT_SECRET: ["NEXTAUTH_SECRET", "AUTH_SECRET"],
  AUTH_URL: ["NEXTAUTH_URL"],
  AUTH_TRUST_HOST: ["NEXTAUTH_TRUST_HOST"],
  AUTH_FRONTEND_BASE_URL: ["SITE_BASE_URL", "NEXTAUTH_URL"],
  AUTH_API_BASE_URL: ["AUTH_URL", "NEXTAUTH_URL", "NEXT_PUBLIC_AUTH_API_BASE_URL"],
  GOOGLE_OAUTH_CLIENT_ID: ["GOOGLE_CLIENT_ID"],
  GOOGLE_OAUTH_CLIENT_SECRET: ["GOOGLE_CLIENT_SECRET"],
  MONGO_URI: ["MONGODB_URI", "MONGO_URL", "DATABASE_URL"],
  MONGODB_URI: ["MONGO_URI", "MONGO_URL", "DATABASE_URL"],
  MONGO_URL: ["MONGO_URI", "MONGODB_URI", "DATABASE_URL"],
  DATABASE_URL: ["MONGO_URI", "MONGODB_URI", "MONGO_URL"],
  // 🔴 normalizeEnvKey 는 대소문자만 지운다 — THREAD 와 THREADS 는 서로 다른 키로 남는다.
  // .env.local 의 Thread_access_token 이 THREAD_ACCESS_TOKEN 으로 올라오므로 별칭이 필요하다.
  THREADS_ACCESS_TOKEN: ["THREAD_ACCESS_TOKEN"],
};

function normalizeEnvKey(raw) {
  return String(raw || "")
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

function readEnvValue(source, key) {
  const direct = source?.[key];
  if (direct !== undefined && direct !== null) {
    const trimmed = String(direct).trim();
    if (trimmed) return trimmed;
  }

  const normalizedTarget = normalizeEnvKey(key);
  if (!normalizedTarget) return "";

  for (const [candidateKey, candidateValue] of Object.entries(source || {})) {
    if (normalizeEnvKey(candidateKey) !== normalizedTarget) continue;
    const trimmed = String(candidateValue ?? "").trim();
    if (trimmed) return trimmed;
  }

  return "";
}

export function getEnv(env, key, fallback = "") {
  const keys = [key, ...(ENV_KEY_ALIASES[key] || [])];

  for (const candidate of keys) {
    const value = readEnvValue(env, candidate);
    if (value) return value;

    if (typeof globalThis?.process !== "undefined") {
      const fromProcess = readEnvValue(globalThis.process?.env || {}, candidate);
      if (fromProcess) return fromProcess;
    }
  }

  return fallback;
}

export function installProcessEnv(env = {}) {
  if (typeof globalThis.process === "undefined") {
    globalThis.process = { env: {} };
  }

  if (!globalThis.process.env) {
    globalThis.process.env = {};
  }

  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string" && globalThis.process.env[key] === undefined) {
      globalThis.process.env[key] = value;
    }
  }

  return globalThis.process.env;
}

export function isProduction(env = {}) {
  return getEnv(env, "NODE_ENV") === "production";
}
