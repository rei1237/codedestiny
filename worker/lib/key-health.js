import { getEnv } from "./env.js";

const FEATURE_KEY_GROUPS = {
  "auth-basic": [
    ["JWT_SECRET", "AUTH_SECRET", "NEXTAUTH_SECRET"],
    ["MONGO_URI", "MONGODB_URI", "MONGO_URL", "DATABASE_URL"],
  ],
  "auth-oauth-google": [
    ["JWT_SECRET", "AUTH_SECRET", "NEXTAUTH_SECRET"],
    ["MONGO_URI", "MONGODB_URI", "MONGO_URL", "DATABASE_URL"],
    ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_CLIENT_ID"],
    ["GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET"],
  ],
  "auth-oauth-naver": [
    ["JWT_SECRET", "AUTH_SECRET", "NEXTAUTH_SECRET"],
    ["MONGO_URI", "MONGODB_URI", "MONGO_URL", "DATABASE_URL"],
    ["NAVER_OAUTH_CLIENT_ID", "NAVER_CLIENT_ID"],
    ["NAVER_OAUTH_CLIENT_SECRET", "NAVER_CLIENT_SECRET"],
  ],
  "auth-oauth-kakao": [
    ["JWT_SECRET", "AUTH_SECRET", "NEXTAUTH_SECRET"],
    ["MONGO_URI", "MONGODB_URI", "MONGO_URL", "DATABASE_URL"],
    ["KAKAO_OAUTH_CLIENT_ID", "KAKAO_CLIENT_ID"],
  ],
  "payments-core": [
    ["JWT_SECRET", "AUTH_SECRET"],
    ["MONGO_URI", "MONGODB_URI", "MONGO_URL", "DATABASE_URL"],
    ["PORTONE_API_SECRET", "PORTONE_API_Secret"],
    ["PORTONE_STORE_ID", "PORTONE_Store", "PORTONE_STORE"],
    ["PORTONE_CHANNEL_KEY", "PORTONE_channel", "PORTONE_CHANNEL"],
    ["PORTONE_WEBHOOK_URL", "PORTONE_webhook_URL"],
    ["PORTONE_WEBHOOK_SECRET", "PORTONE_webhook", "PORTONE_WEBHOOK", "PORTONE_WEBHOOK_SECRET_KEY", "PORTONE_WEBHOOK_TOKEN", "PORTONE_webhook_Secret"],
    ["MID", "INICISMID", "INIstoreId", "INI_STORE_ID", "INICIS_MID", "INICIS_STORE_ID"],
    ["INIsignkey", "INISIGNKEY", "INI_SIGNKEY", "INICIS_SIGNKEY", "INICIS_WEB_SIGNKEY"],
    ["INIAPIKEY", "INI_API_KEY", "INICIS_API_KEY"],
    ["INIAPI_IV", "INI_API_IV", "INICIS_API_IV"],
  ],
  "admin-gate": [
    ["FLOWER_ADMIN_SECRET"],
  ],
  "gemini-core": [
    ["AI"],
  ],
};

const FEATURE_IMPACT = {
  "auth-basic": "로그인/회원가입/내정보",
  "auth-oauth-google": "Google OAuth 로그인",
  "auth-oauth-naver": "Naver OAuth 로그인",
  "auth-oauth-kakao": "Kakao OAuth 로그인",
  "payments-core": "결제 준비/확인/취소/포인트",
  "admin-gate": "관리자 비밀번호 게이트",
};

function isPlaceholderValue(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return true;

  if (normalized === "dev-secret") return true;
  if (normalized.includes("placeholder")) return true;
  if (normalized.includes("change_me")) return true;
  if (normalized.includes("your_")) return true;
  if (normalized.includes("example")) return true;
  if (normalized === "flower-admin-dev-secret-placeholder-000000") return true;

  return false;
}

function firstResolvedKey(env, keyGroup = []) {
  for (const key of keyGroup) {
    const value = key.startsWith("PORTONE_") ? readExactEnv(env, key) : getEnv(env, key);
    if (value) return { key, value };
  }
  return null;
}

function readExactEnv(env, key) {
  const direct = env?.[key];
  if (direct !== undefined && direct !== null) {
    const trimmed = String(direct).trim();
    if (trimmed) return trimmed;
  }

  if (typeof globalThis?.process !== "undefined") {
    const fromProcess = globalThis.process?.env?.[key];
    if (fromProcess !== undefined && fromProcess !== null) {
      const trimmed = String(fromProcess).trim();
      if (trimmed) return trimmed;
    }
  }

  return "";
}

export function evaluateFeatureKeyHealth(env, feature) {
  const groups = FEATURE_KEY_GROUPS[feature] || [];
  const requiredKeys = groups.map((keys) => keys.join("|"));
  const missingKeys = [];
  const placeholderKeys = [];
  const resolvedKeys = [];

  for (const group of groups) {
    const resolved = firstResolvedKey(env, group);
    if (!resolved) {
      missingKeys.push(group.join("|"));
      continue;
    }

    resolvedKeys.push(resolved.key);
    if (isPlaceholderValue(resolved.value)) {
      placeholderKeys.push(resolved.key);
    }
  }

  return {
    feature,
    impact: FEATURE_IMPACT[feature] || feature,
    ok: missingKeys.length === 0 && placeholderKeys.length === 0,
    requiredKeys,
    resolvedKeys,
    missingKeys,
    placeholderKeys,
  };
}

export function buildConfigErrorBody(feature, health) {
  return {
    ok: false,
    error: "config_key_mismatch",
    feature,
    impact: health?.impact || FEATURE_IMPACT[feature] || feature,
    message: "Required configuration keys are missing or invalid for this feature.",
    requiredKeys: health?.requiredKeys || [],
    missingKeys: health?.missingKeys || [],
    placeholderKeys: health?.placeholderKeys || [],
    fixGuide: {
      workerSecrets: "Set keys in Cloudflare Worker secrets (wrangler secret put or Dashboard).",
      pagesVariables: "Set public runtime keys in Cloudflare Pages variables when needed.",
      verify: "Re-run the same API call after updating keys and redeploying Worker/Pages.",
    },
  };
}

export function buildRuntimeKeyMatrix(env) {
  return Object.keys(FEATURE_KEY_GROUPS).map((feature) => evaluateFeatureKeyHealth(env, feature));
}
