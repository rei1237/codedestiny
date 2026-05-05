const ENV_KEY_ALIASES = {
  PORTONE_API_KEY: ["PORTONE_REST_API_KEY", "PORTONE API Key", "PORTONE_APIKEY"],
  PORTONE_API_SECRET: ["PORTONE_REST_API_SECRET", "PORTONE API Secret", "PORTONE_APISECRET"],
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
