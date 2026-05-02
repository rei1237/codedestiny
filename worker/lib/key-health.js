import { getEnv } from "./env.js";

const FEATURE_KEY_GROUPS = {
  "auth-basic": [
    ["JWT_SECRET", "AUTH_SECRET"],
    ["MONGO_URI", "MONGODB_URI"],
  ],
  "auth-oauth-google": [
    ["JWT_SECRET", "AUTH_SECRET"],
    ["MONGO_URI", "MONGODB_URI"],
    ["GOOGLE_OAUTH_CLIENT_ID"],
    ["GOOGLE_OAUTH_CLIENT_SECRET"],
  ],
  "auth-oauth-naver": [
    ["JWT_SECRET", "AUTH_SECRET"],
    ["MONGO_URI", "MONGODB_URI"],
    ["NAVER_OAUTH_CLIENT_ID"],
    ["NAVER_OAUTH_CLIENT_SECRET"],
  ],
  "auth-oauth-kakao": [
    ["JWT_SECRET", "AUTH_SECRET"],
    ["MONGO_URI", "MONGODB_URI"],
    ["KAKAO_OAUTH_CLIENT_ID"],
    ["KAKAO_OAUTH_CLIENT_SECRET"],
  ],
  "payments-core": [
    ["JWT_SECRET", "AUTH_SECRET"],
    ["MONGO_URI", "MONGODB_URI"],
    ["PORTONE_API_KEY"],
    ["PORTONE_API_SECRET"],
  ],
  "admin-gate": [
    ["FLOWER_ADMIN_SECRET"],
  ],
  "gemini-core": [
    ["GEMINIF_API_KEY1", "GEMINIF_API_KEY2", "GEMINIF_API_KEY3", "GEMINIF_API_KEY4", "GEMINI_API_KEY", "GOOGLE_GEMINI_API_KEY", "GOOGLE_API_KEY"],
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
    const value = getEnv(env, key);
    if (value) return { key, value };
  }
  return null;
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
