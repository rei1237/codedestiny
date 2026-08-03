import { getEnv } from "../lib/env.js";
import { buildRuntimeKeyMatrix } from "../lib/key-health.js";
import { connectDb, mongoose, withMongoRetry } from "../lib/db.js";
import { purgeCmsCache, readCmsThroughCache } from "../lib/cms-cache.js";
import { requireAuth } from "../lib/auth.js";
import { verifyPassword } from "../lib/password.js";
import { enforceSensitiveEndpointSecurity } from "../lib/security/index.js";
import { callGeminiText } from "../lib/gemini.js";
import { ContentOverride, Insight, PointHistory, User } from "../lib/models.js";
import {
  REVIEW_BODY_MAX_LENGTH,
  REVIEW_STATUSES,
  REVIEW_STATUS_LIST,
  REVIEW_TITLE_MAX_LENGTH,
  Review,
} from "../lib/review-models.js";
import { getReviewProduct } from "../lib/review-product-catalog.js";
import { screenReviewText } from "../lib/review-moderation.js";
import {
  FEATURE_KEY_PRICE_TABLE,
  FRONTEND_PAID_FEATURE_KEYS,
  PIG_COIN_UNLOCK_PRODUCTS,
  listLegacyUnlockBaselineMismatches,
  listServerPricedFeatureKeys,
} from "../lib/paid-feature-registry.js";
import { createHttpError, getRequestMeta, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { buildFortuneQuestionPromptPackage } from "../lib/fortune-question-prompt.js";
import { buildSajuAIPromptWithDomain } from "../lib/saju-ai-prompt.js";
import { buildSukuyoAIPromptWithDomain } from "../lib/sukuyo-ai-prompt.js";
import { buildAstrologyAIPromptWithDomain } from "../lib/astrology-ai-prompt.js";
import { buildZiweiAIPromptWithDomain } from "../lib/ziwei-ai-prompt.js";
import { buildVedicAIPromptWithDomain } from "../lib/vedic-ai-prompt.js";
import { buildSajuProfile } from "../lib/destiny-bias-engine.js";
import { buildSajuQuantumDaewunRows, buildSajuQuantumElementMap, normalizeElementKeys } from "../lib/saju-quantum-myeongri.js";
import { buildCompatibilityFromIndices, buildSukuyoFromLunar } from "../lib/sukuyo-premium.js";
import { getSwissWesternChart, getSwissVedicPlanets } from "../lib/swiss-ephemeris.js";
import { buildAstroLocalChartJson, normalizeAstroPremiumBirthInput } from "../lib/astro-premium-generator.js";
import { buildVedicLocalChartJson } from "../lib/vedic-premium-generator.js";
import { requestKasiLegacyCalendarMethod } from "./kasi.js";
import { Lunar, Solar } from "lunar-javascript";

// ê´€ë¦¬ìž READ ì „ìš© Mongo ìž¬ì‹œë„ ëž˜í¼. í’€ ì´ˆê¸°í™”/ë„¤íŠ¸ì›Œí¬ íƒ€ìž„ì•„ì›ƒ ìˆœê°„ì—ë„ ì¡°íšŒê°€ ì„±ê³µí•˜ë„ë¡
// ê¸°ë³¸(1íšŒ)ë³´ë‹¤ ì—¬ìœ  ìžˆê²Œ ìž¬ì‹œë„í•œë‹¤. ì“°ê¸°ì—ëŠ” ì‚¬ìš©í•˜ì§€ ì•ŠëŠ”ë‹¤.
function adminMongoRead(env, operation) {
  return withMongoRetry(env, operation, { retries: 2 });
}

// ê´€ë¦¬ìž ì§„ìž… ë¹„ë°€ë²ˆí˜¸ëŠ” ì†ŒìŠ¤ì— ë‘ì§€ ì•ŠëŠ”ë‹¤ â€” ê³¼ê±° ì´ ìžë¦¬ì— í‰ë¬¸ ì£¼ì„ê³¼ salt ì—†ëŠ” SHA-256ì´ í•¨ê»˜
// ì»¤ë°‹ë¼ ìžˆì—ˆê³ , ë ˆí¬ê°€ ê³µê°œë¼ ëˆ„êµ¬ë‚˜ ì½ì–´ 8ì‹œê°„ ê´€ë¦¬ìž í† í°ì„ ë°›ì„ ìˆ˜ ìžˆì—ˆë‹¤.
// ì •ë³¸ì€ ì›Œì»¤ ì‹œí¬ë¦¿ ADMIN_ENTRY_PASSWORD_HASH í•˜ë‚˜ë‹¤. ë¯¸ì„¤ì •ì´ë©´ ì•„ëž˜ì—ì„œ fail-closed ë¡œ ë§‰ížŒë‹¤.
// ðŸ”´ ê°’ì€ **PBKDF2**(`pbkdf2-sha256$ë°˜ë³µìˆ˜$salt$hash`)ë¥¼ ì“´ë‹¤. bcrypt í•´ì‹œë¥¼ ë„£ì§€ ë§ ê²ƒ â€”
// ì´ ì›Œì»¤ì˜ bcryptjs ëŠ” ìˆœìˆ˜ JS ë¼ cost 12 ê²€ì¦ì´ ~270ms CPU ë¥¼ ë¨¹ê³ , ì‹¤ì œë¡œ ê´€ë¦¬ìž ë¡œê·¸ì¸ì´
// ê°„í—ì ìœ¼ë¡œ `error code: 1102`(Worker exceeded resource limits)ë¡œ ì£½ì—ˆë‹¤(2026-07-31 ì‹¤ì¸¡).
// PBKDF2 ëŠ” crypto.subtle ë„¤ì´í‹°ë¸Œë¼ ê°™ì€ ê°•ë„ì—ì„œ ~15ms ë‹¤. worker/lib/password.js ì˜
// verifyPassword ê°€ ë‘ í¬ë§·ì„ ëª¨ë‘ ë°›ìœ¼ë¯€ë¡œ bcrypt ë¥¼ ë„£ì–´ë„ "ë™ìž‘ì€ í•˜ë‹¤ê°€ ê°€ë” ì£½ëŠ”" í˜•íƒœê°€ ë˜ì–´
// ì›ì¸ì„ ì°¾ê¸° ì–´ë µë‹¤. ë ˆê±°ì‹œ server/routes/admin.routes.js ë„ PBKDF2 ë¥¼ ìš°ì„  ì²˜ë¦¬í•œë‹¤.
const ADMIN_ENTRY_PASSWORD_HASH_KEY = "ADMIN_ENTRY_PASSWORD_HASH";

const FLOWER_TOKEN_TTL_SEC = 8 * 60 * 60;
const INSIGHT_STATUS_SET = new Set(["draft", "scheduled", "published", "archived", "private", "trash"]);
const CONTENT_STATUS_SET = new Set(["draft", "scheduled", "published", "archived", "private", "trash"]);
const CONTENT_PUBLIC_STATUS = "published";
const CONTENT_FORMAT_SET = new Set(["html", "markdown", "blocks"]);
const CONTENT_TYPE_SET = new Set([
  "fortune_insight",
  "saju",
  "tarot",
  "astrology",
  "jamidusu",
  "sookyo",
  "vedic",
  "palmistry",
  "physiognomy",
  "notice",
  "landing",
  "seo_page",
  "general",
]);
const INSIGHT_ALLOWED_HTML_TAGS = new Set([
  "h1",
  "h2",
  "h3",
  "p",
  "strong",
  "b",
  "em",
  "i",
  "ul",
  "ol",
  "li",
  "blockquote",
  "hr",
  "a",
  "img",
  "br",
]);
const INSIGHT_ALLOWED_UPLOAD_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const INSIGHT_MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const ADMIN_PROMPT_SERVICE_LABELS = Object.freeze({
  saju: "ì‚¬ì£¼",
  tarot: "íƒ€ë¡œ",
  sukuyo: "ìˆ™ìš”",
  astrology: "ì ì„±ìˆ ",
  ziwei: "ìžë¯¸ë‘ìˆ˜",
  vedic: "ë² ë‹¤ì ",
});
const ADMIN_PROMPT_SERVICE_ALIASES = Object.freeze({
  saju: "saju",
  tarot: "tarot",
  sookyo: "sukuyo",
  sukuyo: "sukuyo",
  astrology: "astrology",
  jamidusu: "ziwei",
  ziwei: "ziwei",
  vedic: "vedic",
});
const ADMIN_PROMPT_DOMAIN_LABELS = Object.freeze({
  general: "ì „ì²´ íë¦„",
  love: "ì—°ì• /ê´€ê³„",
  compatibility: "ê¶í•©",
  career: "ì§ì—…/ì§„ë¡œ",
  money: "ìž¬ë¬¼/ì‚¬ì—…",
  health: "ê±´ê°•/ë¦¬ë“¬",
  life_direction: "ì¸ìƒ íë¦„",
  personality: "ê¸°ì§ˆ/ì„±í–¥",
});
const ADMIN_PROMPT_COMMON_DOMAINS = new Set([
  "general",
  "love",
  "compatibility",
  "career",
  "money",
  "health",
  "life_direction",
  "personality",
]);

function isProductionAdminEnv(env) {
  const value = String(
    getEnv(env, "NODE_ENV")
    || getEnv(env, "ENVIRONMENT")
    || getEnv(env, "CF_PAGES_BRANCH")
    || ""
  ).trim().toLowerCase();
  return value === "production" || value === "main";
}

function isPlaceholderAdminSecret(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return !normalized
    || normalized.includes("placeholder")
    || normalized.includes("change_me")
    || normalized.includes("your_")
    || normalized.includes("example");
}

function resolveFlowerAdminSecret(env) {
  const secret = String(getEnv(env, "FLOWER_ADMIN_SECRET") || "").trim();
  if (isProductionAdminEnv(env) && isPlaceholderAdminSecret(secret)) {
    throw createHttpError(503, "ê´€ë¦¬ìž ë³´ì•ˆ í‚¤ê°€ ì„¤ì •ë˜ì§€ ì•Šì•˜ìŠµë‹ˆë‹¤.", { code: "ADMIN_SECRET_NOT_CONFIGURED" });
  }
  return secret || "flower-admin-dev-secret-placeholder-000000";
}
const ADMIN_GAN = ["ç”²", "ä¹™", "ä¸™", "ä¸", "æˆŠ", "å·±", "åºš", "è¾›", "å£¬", "ç™¸"];
const ADMIN_JI = ["å­", "ä¸‘", "å¯…", "å¯", "è¾°", "å·³", "åˆ", "æœª", "ç”³", "é…‰", "æˆŒ", "äº¥"];
const ADMIN_ELEMENT_META = Object.freeze({
  wood: { ko: "ëª©", label: "ëª©(æœ¨)" },
  fire: { ko: "í™”", label: "í™”(ç«)" },
  earth: { ko: "í† ", label: "í† (åœŸ)" },
  metal: { ko: "ê¸ˆ", label: "ê¸ˆ(é‡‘)" },
  water: { ko: "ìˆ˜", label: "ìˆ˜(æ°´)" },
});
const ADMIN_ELEMENT_KEYS = ["wood", "fire", "earth", "metal", "water"];
const ADMIN_GAN_ELEMENT_KEYS = ["wood", "wood", "fire", "fire", "earth", "earth", "metal", "metal", "water", "water"];
const ADMIN_JI_ELEMENT_KEYS = ["water", "earth", "wood", "wood", "earth", "fire", "fire", "earth", "metal", "metal", "earth", "water"];
const ADMIN_WESTERN_SIGNS = ["ì–‘ìžë¦¬", "í™©ì†Œìžë¦¬", "ìŒë‘¥ì´ìžë¦¬", "ê²Œìžë¦¬", "ì‚¬ìžìžë¦¬", "ì²˜ë…€ìžë¦¬", "ì²œì¹­ìžë¦¬", "ì „ê°ˆìžë¦¬", "ì‚¬ìˆ˜ìžë¦¬", "ì—¼ì†Œìžë¦¬", "ë¬¼ë³‘ìžë¦¬", "ë¬¼ê³ ê¸°ìžë¦¬"];
const ADMIN_VEDIC_SIGNS = ["ë©”ìƒ¤", "ë¸Œë¦¬ìƒ¤ë°”", "ë¯¸íˆ¬ë‚˜", "ì¹´ë¥´ì¹´", "ì‹¬í•˜", "ì¹¸ì•¼", "íˆ´ë¼", "ë¸Œë¦¬ìŠˆì¹˜ì¹´", "ë‹¤ëˆ„", "ë§ˆì¹´ë¼", "ì¿°ë°”", "ë¯¸ë‚˜"];
const ADMIN_NAKSHATRAS = ["ì•„ìŠˆë¹„ë‹ˆ", "ë°”ë¼ë‹ˆ", "í¬ë¦¬í‹°ì¹´", "ë¡œížˆë‹ˆ", "ë¯€ë¦¬ê¸°ë¼", "ì•„ë¥´ë“œë¼", "í‘¸ë‚˜ë¥´ë°”ìˆ˜", "í‘¸ìƒ¤", "ì•„ìŠë ˆìƒ¤", "ë§ˆê°€", "í‘¸ë¥´ë°”íŒ”êµ¬ë‹ˆ", "ìš°íƒ€ë¼íŒ”êµ¬ë‹ˆ", "í•˜ìŠ¤íƒ€", "ì¹˜íŠ¸ë¼", "ìŠ¤ì™€í‹°", "ë¹„ìƒ¤ì¹´", "ì•„ëˆ„ë¼ë‹¤", "ì œìŠˆíƒ€", "ë¬¼ë¼", "í‘¸ë¥´ë°”ìƒ¤ë‹¤", "ìš°íƒ€ë¼ìƒ¤ë‹¤", "ìŠˆë¼ë°”ë‚˜", "ë‹¤ë‹ˆìŠˆíƒ€", "ìƒ¤íƒ€ë¹„ìƒ¤", "í‘¸ë¥´ë°”ë°”ë“œë¼", "ìš°íƒ€ë¼ë°”ë“œë¼", "ë ˆë°”í‹°"];
const ADMIN_SUKUYO_MANSIONS = ["ê°ìˆ™", "í•­ìˆ™", "ì €ìˆ™", "ë°©ìˆ™", "ì‹¬ìˆ™", "ë¯¸ìˆ™", "ê¸°ìˆ™", "ë‘ìˆ™", "ì—¬ìˆ™", "í—ˆìˆ™", "ìœ„ìˆ™(å±)", "ì‹¤ìˆ™", "ë²½ìˆ™", "ê·œìˆ™", "ë£¨ìˆ™", "ìœ„ìˆ™(èƒƒ)", "ë¬˜ìˆ™", "í•„ìˆ™", "ìžìˆ™", "ì‚¼ìˆ™", "ì •ìˆ™", "ê·€ìˆ™", "ë¥˜ìˆ™", "ì„±ìˆ™", "ìž¥ìˆ™", "ìµìˆ™", "ì§„ìˆ™"];
const ADMIN_TAROT_CARDS = ["ë°”ë³´", "ë§ˆë²•ì‚¬", "ì—¬ì‚¬ì œ", "ì—¬í™©ì œ", "í™©ì œ", "êµí™©", "ì—°ì¸", "ì „ì°¨", "íž˜", "ì€ë‘”ìž", "ìš´ëª…ì˜ ìˆ˜ë ˆë°”í€´", "ì •ì˜", "ë§¤ë‹¬ë¦° ì‚¬ëžŒ", "ì£½ìŒ", "ì ˆì œ", "ì•…ë§ˆ", "íƒ‘", "ë³„", "ë‹¬", "íƒœì–‘", "ì‹¬íŒ", "ì„¸ê³„"];
const ADMIN_ZIWEI_PALACES = [
  ["ming", "ëª…ê¶"],
  ["siblings", "í˜•ì œê¶"],
  ["spouse", "ë¶€ë¶€ê¶"],
  ["children", "ìžë…€ê¶"],
  ["wealth", "ìž¬ë°±ê¶"],
  ["health", "ì§ˆì•¡ê¶"],
  ["travel", "ì²œì´ê¶"],
  ["friends", "ë…¸ë³µê¶"],
  ["career", "ê´€ë¡ê¶"],
  ["property", "ì „íƒê¶"],
  ["fortune", "ë³µë•ê¶"],
  ["parents", "ë¶€ëª¨ê¶"],
];
const ADMIN_ZIWEI_STARS = ["ìžë¯¸", "ì²œê¸°", "íƒœì–‘", "ë¬´ê³¡", "ì²œë™", "ì—¼ì •", "ì²œë¶€", "íƒœìŒ", "íƒëž‘", "ê±°ë¬¸", "ì²œìƒ", "ì²œëŸ‰", "ì¹ ì‚´", "íŒŒêµ°"];

const ADMIN_GEOCODE_PRESETS = [
  { keys: ["ì„œìš¸", "seoul"], label: "ì„œìš¸", latitude: 37.5665, longitude: 126.9780, timezone: "Asia/Seoul" },
  { keys: ["ë¶€ì‚°", "busan"], label: "ë¶€ì‚°", latitude: 35.1796, longitude: 129.0756, timezone: "Asia/Seoul" },
  { keys: ["ëŒ€êµ¬", "daegu"], label: "ëŒ€êµ¬", latitude: 35.8714, longitude: 128.6014, timezone: "Asia/Seoul" },
  { keys: ["ì¸ì²œ", "incheon"], label: "ì¸ì²œ", latitude: 37.4563, longitude: 126.7052, timezone: "Asia/Seoul" },
  { keys: ["ê´‘ì£¼", "gwangju"], label: "ê´‘ì£¼", latitude: 35.1595, longitude: 126.8526, timezone: "Asia/Seoul" },
  { keys: ["ëŒ€ì „", "daejeon"], label: "ëŒ€ì „", latitude: 36.3504, longitude: 127.3845, timezone: "Asia/Seoul" },
  { keys: ["ìš¸ì‚°", "ulsan"], label: "ìš¸ì‚°", latitude: 35.5384, longitude: 129.3114, timezone: "Asia/Seoul" },
  { keys: ["ì„¸ì¢…", "sejong"], label: "ì„¸ì¢…", latitude: 36.4800, longitude: 127.2890, timezone: "Asia/Seoul" },
  { keys: ["ì œì£¼", "jeju"], label: "ì œì£¼", latitude: 33.4996, longitude: 126.5312, timezone: "Asia/Seoul" },
  { keys: ["ë„ì¿„", "tokyo"], label: "ë„ì¿„", latitude: 35.6762, longitude: 139.6503, timezone: "Asia/Tokyo" },
  { keys: ["ì˜¤ì‚¬ì¹´", "osaka"], label: "ì˜¤ì‚¬ì¹´", latitude: 34.6937, longitude: 135.5023, timezone: "Asia/Tokyo" },
  { keys: ["ë² ì´ì§•", "beijing"], label: "ë² ì´ì§•", latitude: 39.9042, longitude: 116.4074, timezone: "Asia/Shanghai" },
  { keys: ["ìƒí•˜ì´", "shanghai"], label: "ìƒí•˜ì´", latitude: 31.2304, longitude: 121.4737, timezone: "Asia/Shanghai" },
  { keys: ["íƒ€ì´ë² ì´", "taipei"], label: "íƒ€ì´ë² ì´", latitude: 25.0330, longitude: 121.5654, timezone: "Asia/Taipei" },
  { keys: ["í™ì½©", "hong kong", "hongkong"], label: "í™ì½©", latitude: 22.3193, longitude: 114.1694, timezone: "Asia/Hong_Kong" },
  { keys: ["ì‹±ê°€í¬ë¥´", "singapore"], label: "ì‹±ê°€í¬ë¥´", latitude: 1.3521, longitude: 103.8198, timezone: "Asia/Singapore" },
  { keys: ["ë‰´ìš•", "new york", "nyc"], label: "ë‰´ìš•", latitude: 40.7128, longitude: -74.0060, timezone: "America/New_York" },
  { keys: ["ë¡œìŠ¤ì•¤ì ¤ë ˆìŠ¤", "la", "los angeles"], label: "ë¡œìŠ¤ì•¤ì ¤ë ˆìŠ¤", latitude: 34.0522, longitude: -118.2437, timezone: "America/Los_Angeles" },
  { keys: ["ëŸ°ë˜", "london"], label: "ëŸ°ë˜", latitude: 51.5072, longitude: -0.1276, timezone: "Europe/London" },
  { keys: ["íŒŒë¦¬", "paris"], label: "íŒŒë¦¬", latitude: 48.8566, longitude: 2.3522, timezone: "Europe/Paris" },
  { keys: ["ì‹œë“œë‹ˆ", "sydney"], label: "ì‹œë“œë‹ˆ", latitude: -33.8688, longitude: 151.2093, timezone: "Australia/Sydney" },
];

function positiveModulo(value, size) {
  const number = Number(value) || 0;
  return ((Math.trunc(number) % size) + size) % size;
}

function normalizeAdminText(value, maxLength = 240) {
  return String(value == null ? "" : value)
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function normalizeAdminQuestion(value) {
  return String(value == null ? "" : value)
    .normalize("NFKC")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, 1200);
}

function toAdminNumber(value, fallback = null) {
  if (value === "" || value == null) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function adminTimezoneOffsetHours(value) {
  const text = normalizeAdminText(value, 64);
  if (!text) return 9;
  const direct = Number(text);
  if (Number.isFinite(direct)) return direct;
  const match = /^(?:UTC|GMT)?\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/i.exec(text);
  if (match) {
    const sign = match[1] === "-" ? -1 : 1;
    const hour = Number(match[2]);
    const minute = Number(match[3] || 0);
    if (Number.isFinite(hour) && Number.isFinite(minute)) return sign * (hour + (minute / 60));
  }
  const normalized = text.toLowerCase();
  const map = {
    "asia/seoul": 9,
    "asia/tokyo": 9,
    "asia/shanghai": 8,
    "asia/hong_kong": 8,
    "asia/taipei": 8,
    "asia/singapore": 8,
    "asia/bangkok": 7,
    "asia/kolkata": 5.5,
    "europe/london": 0,
    "europe/paris": 1,
    "america/new_york": -5,
    "america/chicago": -6,
    "america/denver": -7,
    "america/los_angeles": -8,
    "australia/sydney": 10,
  };
  return Object.prototype.hasOwnProperty.call(map, normalized) ? map[normalized] : 9;
}

function normalizeAdminTimeCorrectionPolicy(value) {
  const text = String(value || "").trim().toLowerCase();
  if (text === "clock" || text === "kst_clock_time") return "KST_CLOCK_TIME";
  if (text === "local_mean" || text === "local_mean_time") return "LOCAL_MEAN_TIME";
  return "TRUE_SOLAR_TIME";
}

function normalizeAdminDayChangePolicy(value) {
  const text = String(value || "").trim().toLowerCase();
  if (text === "late_zi_next_day") return "LATE_ZI_NEXT_DAY";
  if (text === "true_solar_zi_next_day") return "TRUE_SOLAR_ZI_NEXT_DAY";
  // ì¼ì£¼(æ—¥æŸ±)ëŠ” KST ë¯¼ìš©ì¼ ê¸°ì¤€ì´ ì •ì±… ê¸°ë³¸ê°’(ì •ì /ëª¨ë˜ ì—”ì§„ ë° ì›Œì»¤ ëŸ°íƒ€ìž„ ê¸°ë³¸ê³¼ ë™ì¼).
  // ì§„íƒœì–‘ì‹œ/ê· ì‹œì°¨ ë³´ì •ì€ ì‹œì£¼ì—ë§Œ ì ìš©í•˜ë©° ì¼ì£¼ ë‚ ì§œ ê²½ê³„ë¥¼ ìžì • ë„ˆë¨¸ë¡œ ë°€ì§€ ì•ŠëŠ”ë‹¤.
  return "MIDNIGHT";
}

function adminPromptNeedsCoordinates(service) {
  return service === "saju" || service === "astrology" || service === "vedic";
}

function adminPromptNeedsExactTime(service) {
  return service === "astrology" || service === "vedic" || service === "ziwei";
}

function adminHashText(...parts) {
  let hash = 2166136261;
  const text = parts.map((part) => String(part == null ? "" : part)).join("|");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickAdmin(list, seed, offset = 0) {
  if (!Array.isArray(list) || !list.length) return "";
  return list[positiveModulo(Number(seç}ÚÚ$z{-®éÜj×VçG2’ò7FGW46÷VçG2¢µÒ’°¢6öç7B¶W’Ò&Wf–WuFW‡B‡&÷sòåö–B“°¢–b†¶W’–â6÷VçG2’6÷VçG5¶¶W•ÒÒçVÖ&W"‡&÷sòæ6÷VçBÇÂ“°¢Ð ¢&WGW&â§6öâ‡°¢ö³¢G'VRÀ¢—FV×3¢„'&’æ—4'&’†—FV×2’ò—FV×2¢µÒ’æÖ‡FôFÖ–å&Wf–Wt—FVÒ’À¢6÷VçG2À¢v–æF–öã¢°¢vRÀ¢Æ–Ö—C¢$Ud”UuôDÔ”åôÄ•5EôÄ”Ô•BÀ¢F÷FÂÀ¢F÷FÅvW3¢ÖF‚æÖ‚ƒÂÖF‚æ6V–Â‡F÷FÂò$Ud”UuôDÔ”åôÄ•5EôÄ”Ô•B’’À¢ÒÀ¢Ò“°§Ð ¦7–æ2gVæ7F–öâ†æFÆTFÖ–å&Wf–Wt7&VFR‡&WVW7BÂVçb’°¢v—BWF†÷&—¦TFÖ–å&WVW7B‡&WVW7BÂVçb“°¢v—B6öææV7DF"†Vçb“° ¢6öç7B&öG’Òv—B&VD§6öâ‡&WVW7B“°¢6öç7BFö2Òv—B&Wf–Wræ7&VFR†v—B'V–ÆDFÖ–å6VVE&Wf–WtFö2†&öG’ÂVçb’“°¢&WGW&â§6öâ‡²ö³¢G'VRÂ—FVÓ¢FôFÖ–å&Wf–Wt—FVÒ†Fö2’ÒÂ²7FGW3¢#Ò“°§Ð ¦7–æ2gVæ7F–öâ†æFÆTFÖ–å&Wf–Wt'VÆ´7&VFR‡&WVW7BÂVçb’°¢v—BWF†÷&—¦TFÖ–å&WVW7B‡&WVW7BÂVçb“°¢v—B6öææV7DF"†Vçb“° ¢6öç7B&öG’Òv—B&VD§6öâ‡&WVW7B“°¢6öç7BVçG&–W2Ò'&’æ—4'&’†&öG“òæ—FV×2’ò&öG’æ—FV×2¢µÓ°¢–b‚VçG&–W2æÆVæwF‚’°¢F‡&÷r7&VFT‡GGW'&÷"ƒCÂ.È9ÞÈKÙZºjÎ»{«ÉxnÈ«^¸¸Ž¸ºBâ"Â²6öFS¢%dÄ”DD”ôåôU%$õ""Ò“°¢Ð¢–b†VçG&–W2æÆVæwF‚â$Ud”Uuô%TÄµôÔ‚’°¢F‡&÷r7&VFT‡GGW'&÷"ƒCÂÙYÂ»(ŽÉyËYÎ¸ÈGµ$Ud”Uuô%TÄµôÔ‡Þ«N«˜ÎÊxÈ9ÞÈKÙZÈ‰‚ÉèŽÈ«^¸¸Ž¸ºBæÂ²6öFS¢%dÄ”DD”ôåôU%$õ""Ò“°¢Ð ¢6öç7BFö72ÒµÓ°¢6öç7BW'&÷'2ÒµÓ°¢f÷"†ÆWB–æFW‚Ò²–æFW‚ÂVçG&–W2æÆVæwFƒ²–æFW‚³Ò’°¢G'’°¢Fö72çW6‚†v—B'V–ÆDFÖ–å6VVE&Wf–WtFö2†VçG&–W5¶–æFW…ÒÂVçb’“°¢Ò6F6‚†W'&÷"’°¢W'&÷'2çW6‚‡²–æFW‚ÂÖW76vS¢7G&–ær†W'&÷#òæÖW76vRÇÂ.ÉXÂÈ‰‚Éxn¸©BÉŠNºY‚"’Ò“°¢Ð¢Ð ¢–b‚Fö72æÆVæwF‚’°¢F‡&÷r7&VFT‡GGW'&÷"ƒCÂ.ÊÉêR«¸ª^ÙYÂºjÎ»{«ÉxnÈ«^¸¸Ž¸ºBâ"Â²6öFS¢%dÄ”DD”ôåôU%$õ""ÂW'&÷'2Ò“°¢Ð ¢6öç7B7&VFVBÒv—B&Wf–Wræ–ç6W'DÖç’†Fö72Â²÷&FW&VC¢fÇ6RÒ“°¢&WGW&â§6öâ‡°¢ö³¢G'VRÀ¢7&VFVD6÷VçC¢7&VFVBæÆVæwF‚À¢6¶—VD6÷VçC¢W'&÷'2æÆVæwF‚À¢W'&÷'2À¢ÒÂ²7FGW3¢#Ò“°§Ð ¦7–æ2gVæ7F–öâ†æFÆTFÖ–å&Wf–WuF6‚‡F‚Â&WVW7BÂVçb’°¢6öç7BFÖ–ä6öçFW‡BÒv—BWF†÷&—¦TFÖ–å&WVW7B‡&WVW7BÂVçb“°¢v—B6öææV7DF"†Vçb“° ¢6öç7B–BÒ'6U&Wf–Wt–Dg&öÕF‚‡F‚“°¢–b‚–B’F‡&÷r7&VFT‡GGW'&÷"ƒCBÂ$æ÷Bf÷VæBâ"Â²6öFS¢$äõEôdõTäB"Ò“° ¢6öç7B&öG’Òv—B&VD§6öâ‡&WVW7B“°¢6öç7BWFFRÒ·Ó° ¢–b†&öG“òç&F–ærÓÒVæFVf–æVB’WFFRç&F–ærÒæ÷&ÖÆ—¦TFÖ–å&Wf–Wu&F–ær†&öG’ç&F–ær“°¢–b‡G—Vöb&öG“òçF—FÆRÓÓÒ'7G&–ær"’WFFRçF—FÆRÒ&Wf–WuFW‡B†&öG’çF—FÆR’ç6Æ–6RƒÂ$Ud”UuõD•DÄUôÔ…ôÄTäuD‚“°¢–b‡G—Vöb&öG“òæ&öG’ÓÓÒ'7G&–ær"’°¢6öç7BæW‡D&öG’Ò&Wf–WuFW‡B†&öG’æ&öG’“°¢–b‚æW‡D&öG’’F‡&÷r7&VFT‡GGW'&÷"ƒCÂ.ºjÎ»{¸+NÉªžÉØBÉè^º
^Ù[BÊ;ÎÈKŽÉ©Bâ"Â²6öFS¢%dÄ”DD”ôåôU%$õ""Ò“°¢WFFRæ&öG’ÒæW‡D&öG’ç6Æ–6RƒÂ$Ud”Uuô$ôE•ôÔ…ôÄTäuD‚“°¢Ð¢–b‡G—Vöb&öG“òæWF†÷$æÖRÓÓÒ'7G&–ær"’°¢6öç7BæW‡DæÖRÒ&Wf–WuFW‡B†&öG’æWF†÷$æÖR“°¢–b‚æW‡DæÖR’F‡&÷r7&VFT‡GGW'&÷"ƒCÂ.¸¸ž¸JNÉèNÉØBÉè^º
^Ù[BÊ;ÎÈKŽÉ©Bâ"Â²6öFS¢%dÄ”DD”ôåôU%$õ""Ò“°¢WFFRæWF†÷$æÖRÒæW‡DæÖRç6Æ–6RƒÂC“°¢Ð¢–b‡G—Vöb&öG“òæWF†÷$–ÖvRÓÓÒ'7G&–ær"’WFFRæWF†÷$–ÖvRÒ&Wf–WuFW‡B†&öG’æWF†÷$–ÖvR’ç6Æ–6RƒÂS“°¢–b‡G—Vöb&öG“òæFÖ–äæ÷FRÓÓÒ'7G&–ær"’WFFRæFÖ–äæ÷FRÒ&Wf–WuFW‡B†&öG’æFÖ–äæ÷FR’ç6Æ–6RƒÂS“°¢–b†&öG“òæF—7Æ–VDBÓÒVæFVf–æVB’°¢6öç7BF—7Æ–VDBÒ'6U&Wf–WtFFR†&öG’æF—7Æ–VDB“°¢–b‚F—7Æ–VDB’F‡&÷r7&VFT‡GGW'&÷"ƒCÂ.ÉéÈK¸*ÊyÂÙ‰^È¹ÞÉÛBÉŠÎ»	Nº[NÊxÉX®È«^¸¸Ž¸ºBâ"Â²6öFS¢%dÄ”DD”ôåôU%$õ""Ò“°¢WFFRæF—7Æ–VDBÒF—7Æ–VDC°¢Ð¢–b‡G—Vöb&öG“òç&öGV7D–BÓÓÒ'7G&–ær"’°¢6öç7B&öGV7BÒvWE&Wf–Wu&öGV7B†&öG’ç&öGV7D–B“°¢–b‚&öGV7B’F‡&÷r7&VFT‡GGW'&÷"ƒCÂ.ÊNÉêÎÙYŽÊxÉX®¸©BÈ8Ù(ŽÉè^¸¸Ž¸ºBâ"Â²6öFS¢%Tä´äõtåõ$ôET5B"Ò“°¢WFFRç&öGV7D–BÒ&öGV7Bç&öGV7D–C°¢WFFRç&öGV7DæÖRÒ&öGV7BææÖS°¢Ð¢–b‡G—Vöb&öG“òæÆö6ÆRÓÓÒ'7G&–ær"’°¢6öç7BÆö6ÆU&rÒ&Wf–WuFW‡B†&öG’æÆö6ÆR’çFôÆ÷vW$66R‚“°¢–b‚$Ud”UuôÄô4ÄUõ4UBæ†2†Æö6ÆU&r’’°¢F‡&÷r7&VFT‡GGW'&÷"ƒCÂ.ÊxÉ¹ÙYŽÊxÉX®¸©BÉkŽÉkNÉè^¸¸Ž¸ºBâ"Â²6öFS¢%dÄ”DD”ôåôU%$õ""Ò“°¢Ð¢WFFRæÆö6ÆRÒÆö6ÆU&s°¢Ð ¢–b‚ö&¦V7Bæ¶W—2‡WFFR’æÆVæwF‚’°¢F‡&÷r7&VFT‡GGW'&÷"ƒCÂ.È‰ŽÊ	^ÙZÙXN¹9Î«ÉxnÈ«^¸¸Ž¸ºBâ"Â²6öFS¢%dÄ”DD”ôåôU%$õ""Ò“°¢Ð ¢òò¸+NÉªžÉÛB»	N¸Îº›BÉé¸ù’ÙXNØKº[Â¸ºNÈ¹Â¸øÎºk¸ºBà¢–b‡WFFRæ&öG’ÓÒVæFVf–æVBÇÂWFFRçF—FÆRÓÒVæFVf–æVB’°¢6öç7B7W'&VçBÒv—BFÖ–äÖöævõ&VB†VçbÂ7–æ2‚’Óà¢&Wf–Wræf–æD'”–B†–B’ç6VÆV7B‚'F—FÆR&öG’—5fW&–f–VEW&6†6R"’æÆVâ‚’“°¢–b‚7W'&VçB’F‡&÷r7&VFT‡GGW'&÷"ƒCBÂ$æ÷Bf÷VæBâ"Â²6öFS¢$äõEôdõTäB"Ò“°¢6öç7B67&VVæ–ærÒ67&VVå&Wf–WuFW‡B‡°¢F—FÆS¢WFFRçF—FÆRóò7W'&VçBçF—FÆRÀ¢&öG“¢WFFRæ&öG’óò7W'&VçBæ&öG’À¢—5fW&–f–VEW&6†6S¢&ööÆVâ†7W'&VçBæ—5fW&–f–VEW&6†6R’À¢Ò“°¢WFFRæWFôfÆu&V6öç2Ò67&VVæ–æræfÆw3°¢Ð ¢WFFRç&Wf–WvVD'’Ò7G&–ær†FÖ–ä6öçFW‡BçW6W$–BÇÂ&fÆ÷vW"ÖFÖ–â"“° ¢6öç7BFö2Òv—B&Wf–Wræf–æD'”–DæEWFFR†–BÂ²G6WC¢WFFRÒÂ²æWs¢G'VRÒ’æÆVâ‚“°¢–b‚Fö2’F‡&÷r7&VFT‡GGW'&÷"ƒCBÂ$æ÷Bf÷VæBâ"Â²6öFS¢$äõEôdõTäB"Ò“° ¢&WGW&â§6öâ‡²ö³¢G'VRÂ—FVÓ¢FôFÖ–å&Wf–Wt—FVÒ†Fö2’Ò“°§Ð ¦7–æ2gVæ7F–öâ†æFÆTFÖ–å&Wf–Wu7FGW2‡F‚Â&WVW7BÂVçb’°¢6öç7BFÖ–ä6öçFW‡BÒv—BWF†÷&—¦TFÖ–å&WVW7B‡&WVW7BÂVçb“°¢v—B6öææV7DF"†Vçb“° ¢6öç7B–BÒ'6U&Wf–Wt–Dg&öÕF‚‡F‚Â"÷7FGW2"“°¢–b‚–B’F‡&÷r7&VFT‡GGW'&÷"ƒCBÂ$æ÷Bf÷VæBâ"Â²6öFS¢$äõEôdõTäB"Ò“° ¢6öç7B&öG’Òv—B&VD§6öâ‡&WVW7B“°¢6öç7B7FGW5&rÒ&Wf–WuFW‡B†&öG“òç7FGW2’çFôÆ÷vW$66R‚“°¢–b‚$Ud”Uuõ5DEU5õ4UBæ†2‡7FGW5&r’’°¢F‡&÷r7&VFT‡GGW'&÷"ƒCÂ7FGW>¸©BGµ$Ud”Uuõ5DEU5ôÄ•5Bæ¦ö–â‚"ò"—ÒÊIÙYŽ¸)ŽÉzÎÉ[ÂÙZž¸¸Ž¸ºBæÂ²6öFS¢%dÄ”DD”ôåôU%$õ""Ò“°¢Ð ¢6öç7BWFFRÒ°¢7FGW3¢7FGW5&rÀ¢&Wf–WvVD'“¢7G&–ær†FÖ–ä6öçFW‡BçW6W$–BÇÂ&fÆ÷vW"ÖFÖ–â"’À¢&÷fVDC¢7FGW5&rÓÓÒ$Ud”Uuõ5DEU4U2ä$õdTBòæWrFFR‚’¢çVÆÂÀ¢Ó°¢–b‡G—Vöb&öG“òæFÖ–äæ÷FRÓÓÒ'7G&–ær"’WFFRæFÖ–äæ÷FRÒ&Wf–WuFW‡B†&öG’æFÖ–äæ÷FR’ç6Æ–6RƒÂS“° ¢6öç7BFö2Òv—B&Wf–Wræf–æD'”–DæEWFFR†–BÂ²G6WC¢WFFRÒÂ²æWs¢G'VRÒ’æÆVâ‚“°¢–b‚Fö2’F‡&÷r7&VFT‡GGW'&÷"ƒCBÂ$æ÷Bf÷VæBâ"Â²6öFS¢$äõEôdõTäB"Ò“° ¢&WGW&â§6öâ‡²ö³¢G'VRÂ—FVÓ¢FôFÖ–å&Wf–Wt—FVÒ†Fö2’Ò“°§Ð ¦7–æ2gVæ7F–öâ†æFÆTFÖ–å&Wf–WtFVÆWFR‡F‚Â&WVW7BÂVçb’°¢v—BWF†÷&—¦TFÖ–å&WVW7B‡&WVW7BÂVçb“°¢v—B6öææV7DF"†Vçb“° ¢6öç7B–BÒ'6U&Wf–Wt–Dg&öÕF‚‡F‚“°¢–b‚–B’F‡&÷r7&VFT‡GGW'&÷"ƒCBÂ$æ÷Bf÷VæBâ"Â²6öFS¢$äõEôdõTäB"Ò“° ¢6öç7BFö2Òv—B&Wf–Wræf–æD'”–DæDFVÆWFR†–B’æÆVâ‚“°¢–b‚Fö2’F‡&÷r7&VFT‡GGW'&÷"ƒCBÂ$æ÷Bf÷VæBâ"Â²6öFS¢$äõEôdõTäB"Ò“° ¢&WGW&â§6öâ‡²ö³¢G'VRÂ—FVÓ¢FôFÖ–å&Wf–Wt—FVÒ†Fö2’Ò“°§Ð ¦7–æ2gVæ7F–öâ†æFÆU6—FTFWÆ÷’‡&WVW7BÂVçb’°¢v—BWF†÷&—¦TFÖ–å&WVW7B‡&WVW7BÂVçb“° ¢6öç7BFö¶VâÒ7G&–ær†vWDVçb†VçbÂ$t•D…T%ôDUÄõ•õDô´Tâ"’ÇÂ""’çG&–Ò‚“°¢–b‚Fö¶Vâ’°¢F‡&÷r7&VFT‡GGW'&÷"ƒS2Â$t•D…T%ôDUÄõ•õDô´TîÉÛBÈJNÊ	^¹	ŽÊxÉX®ÉXBÈ*ÎÉÛNØ«‚»	ŽÉˆÉØBØ«ŽºjÎ«ÙZÈ‰‚ÉxnÈ«^¸¸Ž¸ºBâ"Â²6öFS¢$DUÄõ•õDô´TåôÔ•54”är"Ò“°¢Ð ¢6öç7B&WòÒ7G&–ær†vWDVçb†VçbÂ$t•D…T%ôDUÄõ•õ$Uò"’ÇÂ""’çG&–Ò‚’ÇÂ'&V“#3rö6öFVFW7F–ç’#°¢6öç7Bv÷&¶fÆ÷rÒ&6Æ÷VFfÆ&R×vW2ÖFWÆ÷’ç–ÖÂ#° ¢ÆWB&W7öç6S°¢G'’°¢&W7öç6RÒv—BfWF6‚†‡GG3¢òö’æv—F‡V"æ6öÒ÷&W÷2òG·&W÷Òö7F–öç2÷v÷&¶fÆ÷w2òG·v÷&¶fÆ÷wÒöF—7F6†W6Â°¢ÖWF†öC¢%õ5B"À¢†VFW'3¢°¢WF†÷&—¦F–öã¢&V&W"G·Fö¶VçÖÀ¢66WC¢&Æ–6F–öâ÷fæBæv—F‡V"¶§6öâ"À¢&6öçFVçB×G—R#¢&Æ–6F–öâö§6öâ"À¢'W6W"ÖvVçB#¢&6öFRÖFW7F–ç’×v÷&¶W""À¢'‚Öv—F‡V"Ö’×fW'6–öâ#¢###"ÓÓ#‚"À¢ÒÀ¢&öG“¢¥4ôâç7G&–æv–g’‡²&Vc¢&Ö–â"Ò’À¢Ò“°¢Ò6F6‚†R’°¢F‡&÷r7&VFT‡GGW'&÷"ƒS"Â$v—D‡V"»ØúÂØ«ŽºjÎ«É©NË*ÞÉyÈºNØÊŽÙhŽÈ«^¸¸Ž¸ºBâ"Â²6öFS¢$DUÄõ•ôD•5D4…ôd”ÄTB"Ò“°¢Ð ¢–b‡&W7öç6Rç7FGW2ÓÒ#B’°¢F‡&÷r7&VFT‡GGW'&÷"ƒS"Âv—D‡V"»ØúÂØ«ŽºjÎ«««»h¹	ŽÉxŽÈ«^¸¸Ž¸ºBâ‡7FGW2G·&W7öç6Rç7FGW7Ò–Â²6öFS¢$DUÄõ•ôD•5D4…ôd”ÄTB"Ò“°¢Ð ¢&WGW&â§6öâ‡²ö³¢G'VRÂ&WòÂv÷&¶fÆ÷rÂG&–vvW&VDC¢æWrFFR‚’çFô•4õ7G&–ær‚’Ò“°§Ð ¦W‡÷'B7–æ2gVæ7F–öâ†æFÆTFÖ–å&÷WFW2‡&WVW7BÂVçb’°¢G'’°¢6öç7BÖWF†öBÒ&WVW7BæÖWF†öBçFõWW$66R‚“°¢6öç7BF‚ÒvWE&÷WFUF‚‡&WVW7BÂ"ö’öFÖ–â"“° ¢–b†ÖWF†öBÓÓÒ%õ5B"bbF‚ÓÓÒ"öVçG'’÷77v÷&B"’°¢&WGW&âv—B†æFÆTVçG'•77v÷&B‡&WVW7BÂVçb“°¢Ð ¢–b†ÖWF†öBÓÓÒ$tUB"bbF‚ÓÓÒ"ö¶W—2"’°¢&WGW&âv—B†æFÆT¶W”†VÇF‚‡&WVW7BÂVçb“°¢Ð ¢–b†ÖWF†öBÓÓÒ$tUB"bbF‚ÓÓÒ"öF–r"’°¢&WGW&âv—B†æFÆTFÖ–äF–r‡&WVW7BÂVçb“°¢Ð ¢–b†ÖWF†öBÓÓÒ$tUB"bbF‚ÓÓÒ"övVÖ–æ’Ö†VÇF‚"’°¢&WGW&âv—B†æFÆTFÖ–ävVÖ–æ”†VÇF‚‡&WVW7BÂVçb“°¢Ð ¢–b†ÖWF†öBÓÓÒ$tUB"bbF‚ÓÓÒ"÷–ÖVçBÖF–væ÷7F–72"’°¢&WGW&âv—B†æFÆTFÖ–å–ÖVçDF–væ÷7F–72‡&WVW7BÂVçb“°¢Ð ¢–b‡F‚ÓÓÒ"÷&ö×BÖÆ"övVæW&FR"’°¢–b†ÖWF†öBÓÓÒ%õ5B"’&WGW&âv—B†æFÆTFÖ–å&ö×DÆ$vVæW&FR‡&WVW7BÂVçb“°¢&WGW&âÖWF†öDæ÷DÆÆ÷vVB‚“°¢Ð ¢–b‡F‚ÓÓÒ"÷&ö×BÖÆ"övVö6öFR"’°¢–b†ÖWF†öBÓÓÒ$tUB"’&WGW&âv—B†æFÆTFÖ–å&ö×DÆ$vVö6öFR‡&WVW7BÂVçb“°¢&WGW&âÖWF†öDæ÷DÆÆ÷vVB‚“°¢Ð ¢–b‡F‚ÓÓÒ"÷6—FRÖFWÆ÷’"’°¢–b†ÖWF†öBÓÓÒ%õ5B"’&WGW&âv—B†æFÆU6—FTFWÆ÷’‡&WVW7BÂVçb“°¢&WGW&âÖWF†öDæ÷DÆÆ÷vVB‚“°¢Ð ¢òòØk^ÙZ’4Õ2âÉÛŽÊiÞÉØÉzÎ«‹ÈIÂ¸Þ¸+N«:Ù[Ž¹:N¹úÎºxÂ»8N¸øBË*ÞØÂ‡&÷WFW2ö6×2æ§2žºÂÉÈNÉèNÙYÎ¸ºB(	@¢òòFÖ–âæ§2¸©BÉÛNºû‚NË)ÂÊHNÉÛB¸IŽ«:Â4Õ2¸©B«;^«	Â¹ÛÎÉ«Ø«ŽÉ˜ËÙN¹9Îº[Â«;^ÉÊÙ[NÉ[ÂÙYÎ¸ºBà¢–b‡F‚ÓÓÒ"ö6×2"ÇÂF‚ç7F'G5v—F‚‚"ö6×2ò"’’°¢6öç7BFÖ–ä6öçFW‡BÒv—BWF†÷&—¦TFÖ–å&WVW7B‡&WVW7BÂVçb“°¢6öç7B²†æFÆTFÖ–ä6×5&÷WFW2ÒÒv—B–×÷'B‚"âö6×2æ§2"“°¢&WGW&âv—B†æFÆTFÖ–ä6×5&÷WFW2‡F‚ç6Æ–6R‚"ö6×2"æÆVæwF‚’ÇÂ"ò"Â&WVW7BÂVçbÂFÖ–ä6öçFW‡B“°¢Ð ¢òòÊ;ÎºË‚ÊÙ¨Ì+~Ù™Ž»h‚âö’÷–ÖVçG2¸©BfÆ÷vW"ÖFÖ–âØjØÉØBÉÛŽÊiÞÙYŽÊxº«¾ÙYŽºøºÂ†WF‚æ§2ÉÙ€¢òò”Eõ4U%d”4UôDÔ”åôUD…õD…2ºûŽØúÎÙZ‚’«HºjÎÉé¸JNÉèNÈªNØéŽÉÛNÈªBÉXŽÉy¹KºÂ¹N¸ºBà¢–b‡F‚ÓÓÒ"ö÷&FW'2"ÇÂF‚ç7F'G5v—F‚‚"ö÷&FW'2ò"’’°¢6öç7BFÖ–ä6öçFW‡BÒv—BWF†÷&—¦TFÖ–å&WVW7B‡&WVW7BÂVçb“°¢6öç7B²†æFÆTFÖ–ä÷&FW%&÷WFW2ÒÒv—B–×÷'B‚"âöFÖ–âÖ÷&FW'2æ§2"“°¢&WGW&âv—B†æFÆTFÖ–ä÷&FW%&÷WFW2‡F‚ç6Æ–6R‚"ö÷&FW'2"æÆVæwF‚’ÇÂ"ò"Â&WVW7BÂVçbÂFÖ–ä6öçFW‡B“°¢Ð ¢òòºxŽËÈØÈRÉ¹NÊ	^ÈIÒÊx«ˆžÉØ«HºjÎÉéÉÛŽÊiÞÉØB«Ë™Â»8N¸øB¸JNÉèNÈªNØéŽÉÛNÈªNÉyÈIÎºxÂÙxŽÉªžÙYÎ¸ºBà¢–b‡F‚ÓÓÒ"öÖöçF†Ç’Ö7&VF—G2öw&çB"’°¢6öç7BFÖ–ä6öçFW‡BÒv—BWF†÷&—¦TFÖ–å&WVW7B‡&WVW7BÂVçb“°¢6öç7B²†æFÆTFÖ–äÖöçF†Ç”7&VF—E&÷WFW2ÒÒv—B–×÷'B‚"âöFÖ–âÖÖöçF†Ç’Ö7&VF—G2æ§2"“°¢&WGW&âv—B†æFÆTFÖ–äÖöçF†Ç”7&VF—E&÷WFW2‚"öw&çB"Â&WVW7BÂVçbÂFÖ–ä6öçFW‡B“°¢Ð ¢–b‡F‚ÓÓÒ"÷6—FRÖ6öçFVçBö÷fW'&–FW2"’°¢–b†ÖWF†öBÓÓÒ$tUB"’&WGW&âv—B†æFÆU6—FT6öçFVçD÷fW'&–FTÆ—7B‡&WVW7BÂVçb“°¢&WGW&âÖWF†öDæ÷DÆÆ÷vVB‚“°¢Ð ¢–b‚õåÂ÷6—FRÖ6öçFVçEÂö÷fW'&–FW5Âõ¶×¢ÕÒµÂõµâõÒµÂ÷V&Æ—6‚×7FGW2Bö’çFW7B‡F‚’’°¢–b†ÖWF†öBÓÓÒ%õ5B"’&WGW&âv—B†æFÆU6—FT6öçFVçD÷fW'&–FUV&Æ—6…7FGW2‡F‚Â&WVW7BÂVçb“°¢&WGW&âÖWF†öDæ÷DÆÆ÷vVB‚“°¢Ð ¢–b‚õåÂ÷6—FRÖ6öçFVçEÂö÷fW'&–FW5Âõ¶×¢ÕÒµÂõµâõÒ²Bö’çFW7B‡F‚’’°¢–b†ÖWF†öBÓÓÒ$tUB"’&WGW&âv—B†æFÆU6—FT6öçFVçD÷fW'&–FTvWB‡F‚Â&WVW7BÂVçb“°¢–b†ÖWF†öBÓÓÒ%UB"’&WGW&âv—B†æFÆU6—FT6öçFVçD÷fW'&–FUW6W'B‡F‚Â&WVW7BÂVçb“°¢–b†ÖWF†öBÓÓÒ$DTÄUDR"’&WGW&âv—B†æFÆU6—FT6öçFVçD÷fW'&–FTFVÆWFR‡F‚Â&WVW7BÂVçb“°¢&WGW&âÖWF†öDæ÷DÆÆ÷vVB‚“°¢Ð ¢–b‡F‚ÓÓÒ"ö6öçFVçB"’°¢–b†ÖWF†öBÓÓÒ$tUB"’&WGW&âv—B†æFÆT6öçFVçDÆ—7B‡&WVW7BÂVçb“°¢–b†ÖWF†öBÓÓÒ%õ5B"’&WGW&âv—B†æFÆT6öçFVçD7&VFR‡&WVW7BÂVçb“°¢&WGW&âÖWF†öDæ÷DÆÆ÷vVB‚“°¢Ð ¢–b‡F‚ÓÓÒ"ö6öçFVçBöF–r"’°¢–b†ÖWF†öBÓÓÒ$tUB"’&WGW&âv—B†æFÆT6öçFVçDF–r‡&WVW7BÂVçb“°¢&WGW&âÖWF†öDæ÷DÆÆ÷vVB‚“°¢Ð ¢–b‚õåÂö6öçFVçEÂö'’×6ÇVuÂõµâõÒ²Bö’çFW7B‡F‚’’°¢–b†ÖWF†öBÓÓÒ$tUB"’&WGW&âv—B†æFÆT6öçFVçDvWD'•6ÇVr‡F‚Â&WVW7BÂVçb“°¢&WGW&âÖWF†öDæ÷DÆÆ÷vVB‚“°¢Ð ¢–b‚õåÂö6öçFVçEÂõµâõÒµÂ÷V&Æ—6‚×7FGW2Bö’çFW7B‡F‚’’°¢–b†ÖWF†öBÓÓÒ$tUB"ÇÂÖWF†öBÓÓÒ%õ5B"’&WGW&âv—B†æFÆT6öçFVçEV&Æ—6…7FGW2‡F‚Â&WVW7BÂVçb“°¢&WGW&âÖWF†öDæ÷DÆÆ÷vVB‚“°¢Ð ¢–b‚õåÂö6öçFVçEÂõµâõÒµÂö66†R×W&vRBö’çFW7B‡F‚’’°¢–b†ÖWF†öBÓÓÒ%õ5B"’&WGW&âv—B†æFÆT6öçFVçD66†UW&vR‡F‚Â&WVW7BÂVçb“°¢&WGW&âÖWF†öDæ÷DÆÆ÷vVB‚“°¢Ð ¢–b‚õåÂö6öçFVçEÂõµâõÒµÂ÷&Wf—6–öç2Bö’çFW7B‡F‚’’°¢–b†ÖWF†öBÓÓÒ$tUB"’&WGW&âv—B†æFÆT6öçFVçE&Wf—6–öç2‡F‚Â&WVW7BÂVçb“°¢&WGW&âÖWF†öDæ÷DÆÆ÷vVB‚“°¢Ð ¢–b‚õåÂö6öçFVçEÂõµâõÒµÂ÷&W7F÷&RBö’çFW7B‡F‚’’°¢–b†ÖWF†öBÓÓÒ%õ5B"’&WGW&âv—B†æFÆT6öçFVçE&W7F÷&R‡F‚Â&WVW7BÂVçb“°¢&WGW&âÖWF†öDæ÷DÆÆ÷vVB‚“°¢Ð ¢–b‚õåÂö6öçFVçEÂõµâõÒ²Bö’çFW7B‡F‚’’°¢–b†ÖWF†öBÓÓÒ$tUB"’&WGW&âv—B†æFÆT6öçFVçDvWD'”–B‡F‚Â&WVW7BÂVçb“°¢–b†ÖWF†öBÓÓÒ%D4‚"’&WGW&âv—B†æFÆT6öçFVçEF6‚‡F‚Â&WVW7BÂVçb“°¢–b†ÖWF†öBÓÓÒ$DTÄUDR"’&WGW&âv—B†æFÆT6öçFVçDFVÆWFR‡F‚Â&WVW7BÂVçb“°¢&WGW&âÖWF†öDæ÷DÆÆ÷vVB‚“°¢Ð ¢–b‡F‚ÓÓÒ"ö–ç6–v‡G2"’°¢–b†ÖWF†öBÓÓÒ$tUB"’&WGW&âv—B†æFÆT–ç6–v‡G4Æ—7B‡&WVW7BÂVçb“°¢–b†ÖWF†öBÓÓÒ%õ5B"’&WGW&âv—B†æFÆT–ç6–v‡G47&VFR‡&WVW7BÂVçb“°¢&WGW&âÖWF†öDæ÷DÆÆ÷vVB‚“°¢Ð ¢–b‡F‚ÓÓÒ"ö–ç6–v‡G2÷WÆöBÖ–ÖvR"’°¢–b†ÖWF†öBÓÓÒ%õ5B"’&WGW&âv—B†æFÆT–ç6–v‡G5WÆöD–ÖvR‡&WVW7BÂVçb“°¢&WGW&âÖWF†öDæ÷DÆÆ÷vVB‚“°¢Ð ¢–b‚õåÂö–ç6–v‡G5Âõ¶ÖcÓ•×³#GÒBö’çFW7B‡F‚’’°¢–b†ÖWF†öBÓÓÒ$tUB"’&WGW&âv—B†æFÆT–ç6–v‡G4vWD'”–B‡F‚Â&WVW7BÂVçb“°¢–b†ÖWF†öBÓÓÒ%UB"’&WGW&âv—B†æFÆT–ç6–v‡G5WFFR‡F‚Â&WVW7BÂVçb“°¢–b†ÖWF†öBÓÓÒ%D4‚"’&WGW&âv—B†æFÆT–ç6–v‡G5WFFR‡F‚Â&WVW7BÂVçb“°¢–b†ÖWF†öBÓÓÒ$DTÄUDR"’&WGW&âv—B†æFÆT–ç6–v‡G4FVÆWFR‡F‚Â&WVW7BÂVçb“°¢&WGW&âÖWF†öDæ÷DÆÆ÷vVB‚“°¢Ð ¢–b‡F‚ÓÓÒ"÷&Wf–Ww2"’°¢–b†ÖWF†öBÓÓÒ$tUB"’&WGW&âv—B†æFÆTFÖ–å&Wf–WtÆ—7B‡&WVW7BÂVçb“°¢–b†ÖWF†öBÓÓÒ%õ5B"’&WGW&âv—B†æFÆTFÖ–å&Wf–Wt7&VFR‡&WVW7BÂVçb“°¢&WGW&âÖWF†öDæ÷DÆÆ÷vVB‚“°¢Ð ¢–b‡F‚ÓÓÒ"÷&Wf–Ww2ö'VÆ²"’°¢–b†ÖWF†öBÓÓÒ%õ5B"’&WGW&âv—B†æFÆTFÖ–å&Wf–Wt'VÆ´7&VFR‡&WVW7BÂVçb“°¢&WGW&âÖWF†öDæ÷DÆÆ÷vVB‚“°¢Ð ¢–b‚õåÂ÷&Wf–Ww5Âõ¶ÖcÓ•×³#GÕÂ÷7FGW2Bö’çFW7B‡F‚’’°¢–b†ÖWF†öBÓÓÒ%õ5B"’&WGW&âv—B†æFÆTFÖ–å&Wf–Wu7FGW2‡F‚Â&WVW7BÂVçb“°¢&WGW&âÖWF†öDæ÷DÆÆ÷vVB‚“°¢Ð ¢–b‚õåÂ÷&Wf–Ww5Âõ¶ÖcÓ•×³#GÒBö’çFW7B‡F‚’’°¢–b†ÖWF†öBÓÓÒ%D4‚"’&WGW&âv—B†æFÆTFÖ–å&Wf–WuF6‚‡F‚Â&WVW7BÂVçb“°¢–b†ÖWF†öBÓÓÒ$DTÄUDR"’&WGW&âv—B†æFÆTFÖ–å&Wf–WtFVÆWFR‡F‚Â&WVW7BÂVçb“°¢&WGW&âÖWF†öDæ÷DÆÆ÷vVB‚“°¢Ð ¢–b…²$tUB"Â%õ5B"Â%D4‚"Â%UB"Â$DTÄUDR%Òæ–æ6ÇVFW2†ÖWF†öB’’&WGW&âæ÷Df÷VæB‚“°¢&WGW&âÖWF†öDæ÷DÆÆ÷vVB‚“°¢Ò6F6‚†W'&÷"’°¢&WGW&â†æFÆU&÷WFTW'&÷"†W'&÷"“°¢Ð§Ð 