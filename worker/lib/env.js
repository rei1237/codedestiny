export function getEnv(env, key, fallback = "") {
  const value = env?.[key];
  if (value === undefined || value === null) return fallback;
  const trimmed = String(value).trim();
  return trimmed || fallback;
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
