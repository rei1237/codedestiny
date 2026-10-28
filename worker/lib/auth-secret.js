import { getEnv } from "./env.js";

// The dev secret fallback must be OPT-IN: only an explicit local-dev signal enables it.
// An unknown/unset environment (e.g. a Cloudflare deploy with empty NODE_ENV and a non-main
// CF_PAGES_BRANCH) is NOT treated as dev, so it can never silently sign tokens with "dev-secret".
export function isExplicitLocalDevEnv(env) {
  const nodeEnv = String(getEnv(env, "NODE_ENV") || "").trim().toLowerCase();
  const environment = String(getEnv(env, "ENVIRONMENT") || "").trim().toLowerCase();
  return nodeEnv === "development"
    || nodeEnv === "test"
    || environment === "development"
    || environment === "local";
}

export function isPlaceholderSecret(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return !normalized
    || normalized === "dev-secret"
    || normalized.includes("placeholder")
    || normalized.includes("change_me")
    || normalized.includes("your_")
    || normalized.includes("example");
}

export function resolveRequiredAuthSecret(env, keys, fallbackErrorMessage) {
  for (const key of keys) {
    const value = getEnv(env, key);
    // Ignore placeholder/dev values so a leftover "dev-secret"/"change_me" can't be trusted.
    if (value && !isPlaceholderSecret(value)) return value;
  }
  // Fail closed everywhere except an explicit local-dev context. This is stricter than the
  // previous "any non-production env → dev-secret", which let a mis-detected production sign
  // forgeable tokens.
  if (!isExplicitLocalDevEnv(env)) {
    throw new Error(fallbackErrorMessage);
  }
  return "dev-secret";
}
