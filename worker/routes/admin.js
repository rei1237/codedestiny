import { getEnv } from "../lib/env.js";
import { buildConfigErrorBody, buildRuntimeKeyMatrix } from "../lib/key-health.js";
import { connectDb, mongoose, withMongoRetry } from "../lib/db.js";
import { purgeCmsCache, readCmsThroughCache } from "../lib/cms-cache.js";
import { purgeInsightPublicCache } from "../lib/insight-public-cache.js";
import { requireAuth } from "../lib/auth.js";
import { PBKDF2_MAX_ITERATIONS, verifyPassword } from "../lib/password.js";
import { enforceSensitiveEndpointSecurity } from "../lib/security/index.js";
import { callGeminiText } from "../lib/gemini.js";
import { AdminAuditLog, ContentOverride, Insight, PointHistory, User } from "../lib/models.js";
import {
  REVIEW_BODY_MAX_LENGTH,
  REVIEW_STATUSES,
  REVIEW_STATUS_LIST,
  REVIEW_TITLE_MAX_LENGTH,
  Review,
} from "../lib/review-models.js";
import { getReviewProduct } from "../lib/review-product-catalog.js";
import { screenReviewText } from "../lib/review-moderation.js";
import { REVIEW_REWARD_AMOUNT, grantReviewApprovalReward } from "../lib/review-reward.js";
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
// 베다는 프로덕션(/api/fortune/vedic/ai-prompt)과 같은 빌더를 쓴다.
// buildVedicAIPromptWithDomain 은 래퍼가 아니라 별도 구현이라 출력이 달라진다.
import { buildVedicAIPrompt } from "../lib/vedic-ai-prompt.js";
import { calculateZiweiAiChart, describeBrightness } from "../lib/ziwei-ai-chart.js";
import { primePromptTemplateOverrides } from "../lib/cms-prompts.js";
import { buildPromptLabResult, hasPromptLabLoader } from "../lib/admin-prompt-lab-loaders.js";
import { getAdminPromptLabService, isBuiltInPromptLabService, promptLabServiceNeeds } from "../../lib/admin/prompt-lab-registry.mjs";
import { buildSajuProfile } from "../lib/destiny-bias-engine.js";
import { buildSajuQuantumDaewunRows, buildSajuQuantumElementMap, normalizeElementKeys } from "../lib/saju-quantum-myeongri.js";
import { buildCompatibilityFromIndices, buildSukuyoFromLunar } from "../lib/sukuyo-premium.js";
import { getSwissWesternChart, getSwissVedicPlanets } from "../lib/swiss-ephemeris.js";
import { buildAstroLocalChartJson, normalizeAstroPremiumBirthInput } from "../lib/astro-premium-generator.js";
import { buildVedicLocalChartJson } from "../lib/vedic-premium-generator.js";
import { requestKasiLegacyCalendarMethod } from "./kasi.js";
import { solarToLunar } from "../../lib/korean-calendar/index.js";

// 관리자 READ 전용 Mongo 재시도 래퍼. 쓰기에는 사용하지 않는다.
//
// 🔴 retryOnOperationTimeout 이 이 화면들의 "될 때도 있고 안 될 때도 있다"를 고치는 지점이다.
// db.js:1004-1007 이 실측으로 문서화한 대로, 이 옵션이 꺼져 있으면 예산에서 죽은 요청은 커넥션
// 리셋만 남기고 **그 리셋의 수혜자는 다음 요청**이 된다 → 성공↔실패가 교대로 난다. 관리자 패널은
// 트래픽이 낮아 매번 콜드 아이솔레이트를 만나므로(=시도 예산을 쿼리가 아니라 connectDb 가 쓴다)
// 이 교대 패턴이 특히 잘 보인다. 켜면 그 리셋을 자기 요청이 써서 하드 503 이 "조금 느린 성공"이 된다.
//
// retries 를 2 → 1 로 낮추는 것이 이 변경의 짝이다. 시도 상한이 8초라 retries:2 와 op-타임아웃
// 재시도를 함께 켜면 최악 3×8s ≈ 24s 가 되어 db.js:1000-1002 가 경고하는 워커 hung 감지 영역에
// 들어간다. retries:1 이면 최악 2×8s+backoff ≈ 16s 다.
//
// resetOnOperationTimeout 은 넘기지 않는다(기본 true 유지) — 리셋이 있어야 재시도가 새 커넥션에 앉는다.
function adminMongoRead(env, operation) {
  return withMongoRetry(env, operation, {
    retries: 1,
    retryOnOperationTimeout: true,
    retryAdmissionOnOverload: true,
  });
}

// 관리자 진입 비밀번호는 소스에 두지 않는다 — 과거 이 자리에 평문 주석과 salt 없는 SHA-256이 함께
// 커밋돼 있었고, 레포가 공개라 누구나 읽어 8시간 관리자 토큰을 받을 수 있었다.
// 정본은 워커 시크릿 ADMIN_ENTRY_PASSWORD_HASH 하나다. 미설정이면 아래에서 fail-closed 로 막힌다.
// 🔴 값은 **PBKDF2**(`pbkdf2-sha256$반복수$salt$hash`)를 쓴다. bcrypt 해시를 넣지 말 것 —
// 이 워커의 bcryptjs 는 순수 JS 라 cost 12 검증이 ~270ms CPU 를 먹고, 실제로 관리자 로그인이
// 간헐적으로 `error code: 1102`(Worker exceeded resource limits)로 죽었다(2026-07-31 실측).
// PBKDF2 는 crypto.subtle 네이티브라 같은 강도에서 ~15ms 다. worker/lib/password.js 의
// verifyPassword 가 두 포맷을 모두 받으므로 bcrypt 를 넣어도 "동작은 하다가 가끔 죽는" 형태가 되어
// 원인을 찾기 어렵다.
const ADMIN_ENTRY_PASSWORD_HASH_KEY = "ADMIN_ENTRY_PASSWORD_HASH";

const FLOWER_TOKEN_TTL_SEC = 8 * 60 * 60;
const INSIGHT_STATUS_SET = new Set(["draft", "scheduled", "published", "archived", "private", "trash"]);

/* 이름이 같은 body 키에서 오지 않는 파생 필드와 그 출처. update 모드의 "안 보낸 필드는 건드리지
   않는다" 규칙이 이름만 보고 지우면, 평면 SEO 만 보낸 요청에서 중첩 seo{} 가 갱신에서 빠져 낡은
   값이 살아남는다(읽을 때는 중첩이 이긴다). */
const CONTENT_DERIVED_FIELD_SOURCES = Object.freeze({
  seo: ["seo", "metaTitle", "metaDescription", "ogTitle", "ogDescription", "ogImage", "canonicalUrl"],
  excerpt: ["summary", "excerpt"],
  summary: ["summary", "excerpt"],
  author: ["author", "authorName"],
  authorName: ["authorName", "author"],
});

/* 목록에서 읽을 필드. 🔴 본문(content/contentHtml/contentJson)과 이력(revisionHistory)은 뺀다 —
   이력 스냅샷 하나하나가 본문 전체를 통째로 담고 있어서, 20건짜리 한 페이지가 게시글 본문
   수백 벌을 실어 나르고 있었다. 목록 화면은 이 필드들을 쓰지 않는다(본문은 상세 조회가,
   이력은 /:id/revisions 가 따로 가져간다). */
const CONTENT_LIST_PROJECTION = [
  "type", "title", "slug", "summary", "excerpt", "subtitle", "contentFormat",
  "revision", "thumbnailUrl", "featuredImage", "category", "tags", "status", "seo",
  "metaTitle", "metaDescription", "canonicalUrl", "ogTitle", "ogDescription", "ogImage",
  "twitterTitle", "twitterDescription", "twitterImage", "keywords",
  "authorId", "authorName", "author", "isPublished", "isFeatured", "noIndex",
  "viewCount", "readingTime", "publishedAt", "createdAt", "updatedAt",
].join(" ");
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
  saju: "사주",
  tarot: "타로",
  sukuyo: "숙요",
  astrology: "점성술",
  ziwei: "자미두수",
  vedic: "베다점",
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
  general: "전체 흐름",
  love: "연애/관계",
  compatibility: "궁합",
  career: "직업/진로",
  money: "재물/사업",
  health: "건강/리듬",
  life_direction: "인생 흐름",
  personality: "기질/성향",
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
    throw createHttpError(503, "관리자 보안 키가 설정되지 않았습니다.", { code: "ADMIN_SECRET_NOT_CONFIGURED" });
  }
  return secret || "flower-admin-dev-secret-placeholder-000000";
}
const ADMIN_GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const ADMIN_JI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const ADMIN_ELEMENT_META = Object.freeze({
  wood: { ko: "목", label: "목(木)" },
  fire: { ko: "화", label: "화(火)" },
  earth: { ko: "토", label: "토(土)" },
  metal: { ko: "금", label: "금(金)" },
  water: { ko: "수", label: "수(水)" },
});
const ADMIN_ELEMENT_KEYS = ["wood", "fire", "earth", "metal", "water"];
const ADMIN_TAROT_CARDS = ["바보", "마법사", "여사제", "여황제", "황제", "교황", "연인", "전차", "힘", "은둔자", "운명의 수레바퀴", "정의", "매달린 사람", "죽음", "절제", "악마", "탑", "별", "달", "태양", "심판", "세계"];

const ADMIN_GEOCODE_PRESETS = [
  { keys: ["서울", "seoul"], label: "서울", latitude: 37.5665, longitude: 126.9780, timezone: "Asia/Seoul" },
  { keys: ["부산", "busan"], label: "부산", latitude: 35.1796, longitude: 129.0756, timezone: "Asia/Seoul" },
  { keys: ["대구", "daegu"], label: "대구", latitude: 35.8714, longitude: 128.6014, timezone: "Asia/Seoul" },
  { keys: ["인천", "incheon"], label: "인천", latitude: 37.4563, longitude: 126.7052, timezone: "Asia/Seoul" },
  { keys: ["광주", "gwangju"], label: "광주", latitude: 35.1595, longitude: 126.8526, timezone: "Asia/Seoul" },
  { keys: ["대전", "daejeon"], label: "대전", latitude: 36.3504, longitude: 127.3845, timezone: "Asia/Seoul" },
  { keys: ["울산", "ulsan"], label: "울산", latitude: 35.5384, longitude: 129.3114, timezone: "Asia/Seoul" },
  { keys: ["세종", "sejong"], label: "세종", latitude: 36.4800, longitude: 127.2890, timezone: "Asia/Seoul" },
  { keys: ["제주", "jeju"], label: "제주", latitude: 33.4996, longitude: 126.5312, timezone: "Asia/Seoul" },
  { keys: ["도쿄", "tokyo"], label: "도쿄", latitude: 35.6762, longitude: 139.6503, timezone: "Asia/Tokyo" },
  { keys: ["오사카", "osaka"], label: "오사카", latitude: 34.6937, longitude: 135.5023, timezone: "Asia/Tokyo" },
  { keys: ["베이징", "beijing"], label: "베이징", latitude: 39.9042, longitude: 116.4074, timezone: "Asia/Shanghai" },
  { keys: ["상하이", "shanghai"], label: "상하이", latitude: 31.2304, longitude: 121.4737, timezone: "Asia/Shanghai" },
  { keys: ["타이베이", "taipei"], label: "타이베이", latitude: 25.0330, longitude: 121.5654, timezone: "Asia/Taipei" },
  { keys: ["홍콩", "hong kong", "hongkong"], label: "홍콩", latitude: 22.3193, longitude: 114.1694, timezone: "Asia/Hong_Kong" },
  { keys: ["싱가포르", "singapore"], label: "싱가포르", latitude: 1.3521, longitude: 103.8198, timezone: "Asia/Singapore" },
  { keys: ["뉴욕", "new york", "nyc"], label: "뉴욕", latitude: 40.7128, longitude: -74.0060, timezone: "America/New_York" },
  { keys: ["로스앤젤레스", "la", "los angeles"], label: "로스앤젤레스", latitude: 34.0522, longitude: -118.2437, timezone: "America/Los_Angeles" },
  { keys: ["런던", "london"], label: "런던", latitude: 51.5072, longitude: -0.1276, timezone: "Europe/London" },
  { keys: ["파리", "paris"], label: "파리", latitude: 48.8566, longitude: 2.3522, timezone: "Europe/Paris" },
  { keys: ["시드니", "sydney"], label: "시드니", latitude: -33.8688, longitude: 151.2093, timezone: "Australia/Sydney" },
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
  if (text === "true_solar" || text === "true_solar_time") return "TRUE_SOLAR_TIME";
  // 시주 시각 보정 기본값은 평균태양시(경도 보정만) — 런타임 엔진 3종의 공통 기본값과 같다.
  return "LOCAL_MEAN_TIME";
}

function normalizeAdminDayChangePolicy(value) {
  const text = String(value || "").trim().toLowerCase();
  if (text === "late_zi_next_day") return "LATE_ZI_NEXT_DAY";
  if (text === "true_solar_zi_next_day") return "TRUE_SOLAR_ZI_NEXT_DAY";
  // 일주(日柱)는 KST 민용일 기준이 정책 기본값(정적/모던 엔진 및 워커 런타임 기본과 동일).
  // 진태양시/균시차 보정은 시주에만 적용하며 일주 날짜 경계를 자정 너머로 밀지 않는다.
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
  return list[positiveModulo(Number(seed || 0) + offset, list.length)];
}

function normalizeAdminPromptService(value) {
  const key = String(value || "").trim().toLowerCase();
  if (ADMIN_PROMPT_SERVICE_ALIASES[key]) return ADMIN_PROMPT_SERVICE_ALIASES[key];
  // 6종 외의 운세는 프롬프트 랩 레지스트리가 선언한다(lib/admin/prompt-lab-registry.mjs).
  return getAdminPromptLabService(key) ? key : "";
}

function normalizeAdminPromptDomain(service, value) {
  const domain = String(value || "").trim().toLowerCase();
  if (!ADMIN_PROMPT_COMMON_DOMAINS.has(domain)) return "";
  if (service === "vedic") {
    if (domain === "compatibility") return "relationships";
    if (domain === "love") return "romance";
    if (domain === "money") return "wealth";
    if (domain === "life_direction" || domain === "personality" || domain === "general") return "spirituality";
    return domain;
  }
  if (service === "astrology") {
    if (domain === "general" || domain === "personality") return "life_direction";
    if (domain === "compatibility") return "love";
    return domain;
  }
  if (service === "saju") {
    if (domain === "general" || domain === "personality") return "life_direction";
    if (domain === "compatibility") return "love";
    return domain;
  }
  if (domain === "personality") return service === "sukuyo" ? "personality" : "general";
  if (domain === "compatibility" && service === "ziwei") return "love";
  return domain;
}

function normalizeAdminEarthStorageMode(value) {
  const key = String(value || "").trim();
  if (key === "conservative" || key === "보수적") return "conservative";
  if (key === "active" || key === "적극적") return "active";
  return "standard";
}

function normalizeAdminEarthStorageScope(value) {
  const key = String(value || "").trim();
  if (key === "natal") return "natal";
  if (key === "natal_daewoon") return "natal_daewoon";
  if (key === "natal_sewoon") return "natal_sewoon";
  if (key === "all") return "all";
  return "natal_daewoon_sewoon";
}

function buildAdminSajuPromptConfig(body) {
  const source = body && typeof body === "object" ? body : {};
  return {
    earthStorageOpening: {
      enabled: source.earthStorageOpeningEnabled !== false,
      mode: normalizeAdminEarthStorageMode(source.earthStorageOpeningMode),
      scope: normalizeAdminEarthStorageScope(source.earthStorageOpeningScope),
      relationStrength: {
        충: "veryStrong",
        형: "strong",
        파: "medium",
        해: "weak",
      },
    },
  };
}

function normalizeAdminGender(value) {
  const text = String(value || "").trim().toLowerCase();
  if (["m", "male", "man", "남", "남성"].includes(text)) return "M";
  if (["f", "female", "woman", "여", "여성"].includes(text)) return "F";
  return "";
}

function adminGenderLabel(gender) {
  if (gender === "M") return "남성";
  if (gender === "F") return "여성";
  return "미지정";
}

function normalizeAdminCalendarType(value) {
  const textRaw = String(value || "solar").trim();
  const text = textRaw.toLowerCase();
  if (text === "lunar_leap" || text === "leap" || text === "leap_lunar" || textRaw === "윤달" || textRaw === "음력윤달") {
    return "lunar_leap";
  }
  if (text === "lunar" || textRaw === "음력") return "lunar";
  return "solar";
}

function parseAdminBirthDate(value) {
  const text = normalizeAdminText(value, 20);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) {
    throw createHttpError(400, "생년월일은 YYYY-MM-DD 형식으로 입력해 주세요.", { code: "INVALID_BIRTH_DATE" });
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() + 1 !== month
    || date.getUTCDate() !== day
  ) {
    throw createHttpError(400, "생년월일 값이 올바르지 않습니다.", { code: "INVALID_BIRTH_DATE" });
  }

  return {
    year,
    month,
    day,
    text: `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
}

function parseAdminBirthTime(value, unknown) {
  const text = normalizeAdminText(value, 20);
  if (unknown === true || !text) {
    return { hour: 12, minute: 0, text: "12:00", timeUnknown: true };
  }

  const match = /^(\d{1,2}):(\d{2})$/.exec(text);
  if (!match) {
    throw createHttpError(400, "출생시간은 HH:mm 형식으로 입력해 주세요.", { code: "INVALID_BIRTH_TIME" });
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw createHttpError(400, "출생시간 값이 올바르지 않습니다.", { code: "INVALID_BIRTH_TIME" });
  }

  return {
    hour,
    minute,
    text: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    timeUnknown: false,
  };
}

function assertAdminCalendarBirthDate(birthDate, calendarType) {
  if (calendarType === "solar") return;

  if (birthDate.month < 1 || birthDate.month > 12 || birthDate.day < 1 || birthDate.day > 30) {
    throw createHttpError(400, "\uc74c\ub825 \uc0dd\ub144\uc6d4\uc77c \uac12\uc774 \uc62c\ubc14\ub974\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.", { code: "INVALID_LUNAR_DATE" });
  }
}

export function buildAdminPromptProfile(body) {
  const birthDate = parseAdminBirthDate(body?.birthDate || body?.birth_date);
  const birthTime = parseAdminBirthTime(body?.birthTime || body?.birth_time, body?.birthTimeUnknown === true);
  const gender = normalizeAdminGender(body?.gender);
  const timezone = normalizeAdminText(body?.timezone || "Asia/Seoul", 64) || "Asia/Seoul";
  const birthPlace = normalizeAdminText(body?.birthPlace || body?.place || "", 120);
  const latitude = toAdminNumber(body?.latitude, null);
  const longitude = toAdminNumber(body?.longitude, null);
  const name = normalizeAdminText(body?.name || "", 80) || "관리자 대상";
  const calendarType = normalizeAdminCalendarType(body?.calendarType || body?.calType || body?.birth?.calendarType || body?.birth?.calType);
  assertAdminCalendarBirthDate(birthDate, calendarType);
  const timezoneOffsetHours = adminTimezoneOffsetHours(timezone);
  const timeCorrectionPolicy = normalizeAdminTimeCorrectionPolicy(body?.timeCorrectionPolicy || body?.hourPillarTimePolicy);
  const dayChangePolicy = normalizeAdminDayChangePolicy(body?.dayChangePolicy);
  const seed = adminHashText(
    birthDate.text,
    calendarType,
    birthTime.text,
    gender,
    timezone,
    birthPlace,
    latitude,
    longitude,
  );

  return {
    name,
    gender,
    genderLabel: adminGenderLabel(gender),
    year: birthDate.year,
    month: birthDate.month,
    day: birthDate.day,
    hour: birthTime.hour,
    minute: birthTime.minute,
    calendarType,
    birthDateText: birthDate.text,
    birthTimeText: birthTime.text,
    timeUnknown: birthTime.timeUnknown,
    timezone,
    timezoneOffsetHours,
    birthPlace,
    latitude,
    longitude,
    timeCorrectionPolicy,
    dayChangePolicy,
    seed,
  };
}

// 숙요 궁합용 상대 프로필. 생년월일이 없으면 null 이고, 그러면 궁합 데이터 없이 개인 해석만 나간다.
// 숙요는 날짜만 쓰므로 생시는 받지 않는다(라이브 lunarForPerson 도 생시 없으면 12:00 로 본다).
export function buildAdminPartnerProfile(body) {
  const birthDate = normalizeAdminText(body?.partnerBirthDate || "", 20);
  if (!birthDate) return null;

  return buildAdminPromptProfile({
    name: body?.partnerName || "상대",
    gender: body?.partnerGender,
    birthDate,
    birthTimeUnknown: true,
    calendarType: body?.partnerCalendarType,
    timezone: body?.timezone,
  });
}

function buildAdminBirthObject(profile) {
  const promptCalendarType = profile.promptCalendarType || profile.inputCalendarType || profile.calendarType;
  return {
    year: profile.year,
    month: profile.month,
    day: profile.day,
    hour: profile.hour,
    minute: profile.minute,
    gender: profile.gender,
    calType: promptCalendarType,
    calendarType: promptCalendarType,
    isLeapMonth: promptCalendarType === "lunar_leap",
    timeUnknown: profile.timeUnknown,
    timezone: profile.timezone,
    lat: profile.latitude,
    lon: profile.longitude,
  };
}

function formatAdminDateText(year, month, day) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseAdminKasiSolarRow(row) {
  const year = toAdminNumber(row?.solYear ?? row?.year ?? row?.solarYear, null);
  const month = toAdminNumber(row?.solMonth ?? row?.month ?? row?.solarMonth, null);
  const day = toAdminNumber(row?.solDay ?? row?.day ?? row?.solarDay, null);
  if (!year || !month || !day) return null;
  return {
    year: Math.trunc(year),
    month: Math.trunc(month),
    day: Math.trunc(day),
    raw: row,
  };
}

export function buildAdminSajuEngineProfileFromKasiSolar(profile, solar, source = "kasi") {
  const year = Math.trunc(Number(solar?.year || 0));
  const month = Math.trunc(Number(solar?.month || 0));
  const day = Math.trunc(Number(solar?.day || 0));
  if (!year || !month || !day) {
    throw createHttpError(400, "KASI lunar conversion returned an invalid solar date.", { code: "KASI_LUNAR_CONVERSION_INVALID" });
  }

  const inputCalendarType = profile.inputCalendarType || profile.calendarType;
  const inputBirthDateText = profile.inputBirthDateText || profile.birthDateText;
  const resolvedSolarDateText = formatAdminDateText(year, month, day);
  return {
    ...profile,
    year,
    month,
    day,
    birthDateText: resolvedSolarDateText,
    calendarType: "solar",
    inputCalendarType,
    promptCalendarType: inputCalendarType,
    inputBirthDateText,
    resolvedSolarDateText,
    kasiCalendarContext: {
      source,
      inputCalendarType,
      inputBirthDateText,
      lunar: {
        year: profile.year,
        month: profile.month,
        day: profile.day,
        isLeap: inputCalendarType === "lunar_leap",
      },
      solar: {
        year,
        month,
        day,
        date: resolvedSolarDateText,
      },
    },
  };
}

export async function resolveAdminSajuEngineProfile(profile, env) {
  if (profile.calendarType === "solar") {
    return {
      ...profile,
      inputCalendarType: "solar",
      promptCalendarType: "solar",
      inputBirthDateText: profile.birthDateText,
      resolvedSolarDateText: profile.birthDateText,
      kasiCalendarContext: {
        source: "input-solar",
        inputCalendarType: "solar",
        inputBirthDateText: profile.birthDateText,
        solar: {
          year: profile.year,
          month: profile.month,
          day: profile.day,
          date: profile.birthDateText,
        },
      },
    };
  }

  const response = await requestKasiLegacyCalendarMethod(env, "getSolCalInfo", {
    lunYear: String(profile.year),
    lunMonth: String(profile.month).padStart(2, "0"),
    lunDay: String(profile.day).padStart(2, "0"),
    lunLeapmonth: profile.calendarType === "lunar_leap" ? "\uc724" : "\ud3c9",
  });
  const solar = (Array.isArray(response?.rows) ? response.rows : [])
    .map(parseAdminKasiSolarRow)
    .find(Boolean);
  if (!solar) {
    throw createHttpError(400, "KASI could not resolve the lunar birth date.", { code: "KASI_LUNAR_CONVERSION_EMPTY" });
  }
  return buildAdminSajuEngineProfileFromKasiSolar(profile, solar, response?.source || "kasi");
}

function assertAdminPromptProfileReady(service, profile, { domain, partnerProfile } = {}) {
  if (adminPromptNeedsExactTime(service) && profile.timeUnknown) {
    throw createHttpError(400, "선택한 기능은 정확한 생시가 필요합니다.", { code: "BIRTH_TIME_REQUIRED" });
  }
  if (adminPromptNeedsCoordinates(service) && (!Number.isFinite(profile.latitude) || !Number.isFinite(profile.longitude))) {
    throw createHttpError(400, "선택한 기능은 출생지 위도와 경도가 필요합니다.", { code: "BIRTH_COORDINATES_REQUIRED" });
  }
  // 숙요 궁합 템플릿은 상대 데이터가 없으면 빌더가 MISSING_COMPATIBILITY_RESULT 로 죽는다.
  // 서버에서 먼저 한국어로 안내한다.
  if (service === "sukuyo" && domain === "compatibility" && !partnerProfile) {
    throw createHttpError(400, "숙요 궁합은 상대 생년월일이 필요합니다.", { code: "PARTNER_BIRTH_REQUIRED" });
  }
}

function normalizeAdminGeocodeKey(value) {
  return normalizeAdminText(value, 120).toLowerCase();
}

function findAdminGeocodePreset(query) {
  const key = normalizeAdminGeocodeKey(query);
  if (!key) return null;
  return ADMIN_GEOCODE_PRESETS.find((preset) => (
    preset.keys.some((item) => key === normalizeAdminGeocodeKey(item) || key.includes(normalizeAdminGeocodeKey(item)))
  )) || null;
}

async function handleAdminPromptLabGeocode(request, env) {
  await authorizeAdminRequest(request, env);
  const url = new URL(request.url);
  const query = normalizeAdminText(url.searchParams.get("q") || "", 120);
  if (!query) {
    throw createHttpError(400, "지역명을 입력해 주세요.", { code: "GEOCODE_QUERY_REQUIRED" });
  }

  const preset = findAdminGeocodePreset(query);
  if (preset) {
    return json({
      ok: true,
      source: "admin-preset",
      query,
      label: preset.label,
      latitude: preset.latitude,
      longitude: preset.longitude,
      timezone: preset.timezone,
    });
  }

  const geocodeUrl = new URL("https://nominatim.openstreetmap.org/search");
  geocodeUrl.searchParams.set("format", "jsonv2");
  geocodeUrl.searchParams.set("limit", "1");
  geocodeUrl.searchParams.set("accept-language", "ko,en");
  geocodeUrl.searchParams.set("q", query);

  const res = await fetch(geocodeUrl.toString(), {
    headers: {
      "User-Agent": "CodeDestinyAdminPromptLab/1.0",
      "Accept": "application/json",
    },
  });
  const rows = await res.json().catch(() => []);
  const first = Array.isArray(rows) ? rows[0] : null;
  const latitude = Number(first?.lat);
  const longitude = Number(first?.lon);
  if (!res.ok || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw createHttpError(404, "지역 좌표를 찾지 못했습니다.", { code: "GEOCODE_NOT_FOUND" });
  }

  return json({
    ok: true,
    source: "nominatim",
    query,
    label: normalizeAdminText(first?.display_name || query, 120),
    latitude,
    longitude,
    timezone: "Asia/Seoul",
  });
}

function buildAdminLocationObject(profile) {
  return {
    label: profile.birthPlace || "미지정",
    lat: profile.latitude,
    lon: profile.longitude,
    tz: profile.timezone,
  };
}

function rankAdminElements(counts, direction = "desc") {
  return ADMIN_ELEMENT_KEYS
    .slice()
    .sort((a, b) => {
      const diff = Number(counts[b] || 0) - Number(counts[a] || 0);
      return direction === "asc" ? -diff : diff;
    });
}

function adminElementLabel(key) {
  return ADMIN_ELEMENT_META[key]?.label || key || "";
}

function adminElementKo(key) {
  return ADMIN_ELEMENT_META[key]?.ko || key || "";
}

function buildAdminSajuPillarFromEngine(pillar) {
  const p = pillar && typeof pillar === "object" ? pillar : {};
  return {
    g: String(p.stem || ""),
    j: String(p.branch || ""),
    gE: adminElementKo(p.stemElement),
    jE: adminElementKo(p.branchElement),
    gEKey: String(p.stemElement || ""),
    jEKey: String(p.branchElement || ""),
  };
}

function toAdminElementList(value) {
  const items = Array.isArray(value) ? value : [value];
  return items.map((item) => adminElementLabel(item)).filter(Boolean).join(", ") || "-";
}

function buildAdminElementKeyList(value, fallback = []) {
  return normalizeElementKeys(value, fallback);
}

function buildAdminSajuJohuProfile(pillars) {
  const seasonMap = { 寅: "봄", 卯: "봄", 辰: "봄", 巳: "여름", 午: "여름", 未: "여름", 申: "가을", 酉: "가을", 戌: "가을", 亥: "겨울", 子: "겨울", 丑: "겨울" };
  const monthBranch = pillars?.m?.j || "";
  const season = seasonMap[monthBranch] || "봄";
  let score = 0;
  if (season === "여름") score += 4;
  else if (season === "봄") score += 2;
  else if (season === "가을") score -= 2;
  else score -= 4;

  let fireCount = 0;
  let waterCount = 0;
  let woodCount = 0;
  let metalCount = 0;
  let moistCount = 0;
  let dryCount = 0;
  [pillars?.y, pillars?.m, pillars?.d, pillars?.h].forEach((pillar) => {
    if (!pillar) return;
    [pillar.gEKey, pillar.jEKey].forEach((element) => {
      if (element === "fire") {
        score += 1.5;
        fireCount += 1;
        dryCount += 1;
      } else if (element === "water") {
        score -= 1.5;
        waterCount += 1;
        moistCount += 1;
      } else if (element === "wood") {
        score += 0.5;
        woodCount += 1;
        moistCount += 1;
      } else if (element === "metal") {
        score -= 0.5;
        metalCount += 1;
        dryCount += 1;
      }
    });
    if (["辰", "丑"].includes(pillar.j)) moistCount += 1;
    if (["戌", "未"].includes(pillar.j)) dryCount += 1;
  });

  let type = "neutral";
  let badgeTxt = "🌤️ 시원한 사주";
  if (score >= 5) {
    type = "hot";
    badgeTxt = "🔥 뜨거운 사주";
  } else if (score >= 2) {
    type = "warm";
    badgeTxt = "🌞 따뜻한 사주";
  } else if (score < -5) {
    type = "cold";
    badgeTxt = "❄️ 차가운 사주";
  } else if (score < -2) {
    type = "cool";
    badgeTxt = "🍃 서늘한 사주";
  }

  const moistDiff = moistCount - dryCount;
  const moistType = moistDiff >= 3 ? "wet" : (moistDiff <= -3 ? "dry" : "balanced");
  return {
    type,
    score,
    badgeTxt,
    season,
    fc: fireCount,
    wc: waterCount,
    wdc: woodCount,
    mc: metalCount,
    moistType,
    moistCnt: moistCount,
    dryCnt: dryCount,
  };
}

function buildAdminSajuHiddenStemDigest(enginePillars) {
  return ["year", "month", "day", "hour"].map((key) => {
    const pillar = enginePillars?.[key] || {};
    const ganji = String(pillar.ganji || `${pillar.stem || ""}${pillar.branch || ""}`);
    const hidden = Array.isArray(pillar.hiddenStems) ? pillar.hiddenStems.filter(Boolean).join("/") : "";
    return ganji ? `${key}:${ganji}${hidden ? `(${hidden})` : ""}` : "";
  }).filter(Boolean).join(", ");
}

function buildAdminSajuTenGodDigest(tenGods) {
  const ranked = Array.isArray(tenGods?.ranked) ? tenGods.ranked : [];
  return ranked
    .filter((item) => item && item.name)
    .slice(0, 5)
    .map((item) => `${item.name} ${Number(item.score || 0).toFixed(1)}`)
    .join(", ");
}

function buildAdminSajuAnnualFlowDigest(pillars) {
  const currentYear = new Date().getUTCFullYear();
  const yearStem = ADMIN_GAN[positiveModulo(currentYear - 4, ADMIN_GAN.length)];
  const yearBranch = ADMIN_JI[positiveModulo(currentYear - 4, ADMIN_JI.length)];
  const dayStem = pillars?.d?.g || "";
  const branchSet = [pillars?.y?.j, pillars?.m?.j, pillars?.d?.j, pillars?.h?.j].filter(Boolean);
  const branchEcho = branchSet.includes(yearBranch) ? "원국의 지지 하나를 다시 울립니다" : "원국 밖에서 새 기운을 비춥니다";
  return `${currentYear}년 ${yearStem}${yearBranch} 세운은 일간 ${dayStem || "-"} 위로 들어오며, ${branchEcho}.`;
}

function buildAdminSajuConsultationDigest(profile, question, domain) {
  const domainLabel = ADMIN_PROMPT_DOMAIN_LABELS[domain] || ADMIN_PROMPT_DOMAIN_LABELS.general;
  const questionText = normalizeAdminText(question, 180);
  const birthTime = profile.timeUnknown ? "생시 미상" : profile.birthTimeText;
  const place = profile.birthPlace || "출생지 미지정";
  return `${domainLabel} 질문의 문이 ${profile.birthDateText} ${birthTime}, ${place} 명식 위에 놓입니다. 상담자는 "${questionText || "내담자의 질문"}"을 첫 등불로 삼고 원국, 조후, 용신과 기신, 대운, 세운 중 먼저 열릴 문을 가립니다.`;
}

export function buildAdminSajuResultFromEngine(profile, options = {}) {
  const engineProfile = buildSajuProfile({
    name: profile.name,
    gender: profile.gender,
    birth: {
      year: profile.year,
      month: profile.month,
      day: profile.day,
      hour: profile.hour,
      minute: profile.minute,
      calendarType: profile.calendarType,
      isLeapMonth: profile.calendarType === "lunar_leap",
      unknownTime: profile.timeUnknown,
      timezone: profile.timezone,
      birthPlace: profile.birthPlace,
      latitude: profile.latitude,
      longitude: profile.longitude,
    },
    location: {
      name: profile.birthPlace,
      latitude: profile.latitude,
      longitude: profile.longitude,
      timezone: profile.timezone,
    },
    hourPillarTimePolicy: profile.timeCorrectionPolicy,
    dayChangePolicy: profile.dayChangePolicy,
  });

  const enginePillars = engineProfile?.pillars || {};
  const pillars = {
    y: buildAdminSajuPillarFromEngine(enginePillars.year),
    m: buildAdminSajuPillarFromEngine(enginePillars.month),
    d: buildAdminSajuPillarFromEngine(enginePillars.day),
    h: profile.timeUnknown ? { g: "", j: "", gE: "", jE: "", gEKey: "", jEKey: "" } : buildAdminSajuPillarFromEngine(enginePillars.hour),
  };
  const scores = engineProfile?.fiveElements?.scores && typeof engineProfile.fiveElements.scores === "object"
    ? engineProfile.fiveElements.scores
    : {};
  const counts = ADMIN_ELEMENT_KEYS.reduce((acc, key) => {
    acc[key] = Number(scores[key] || 0);
    return acc;
  }, {});
  const dominantKey = rankAdminElements(counts)[0];
  const weakKeys = Array.isArray(engineProfile?.fiveElements?.lacking) && engineProfile.fiveElements.lacking.length
    ? engineProfile.fiveElements.lacking.slice(0, 2)
    : rankAdminElements(counts, "asc").slice(0, 2);
  const strongKeys = Array.isArray(engineProfile?.fiveElements?.strong) && engineProfile.fiveElements.strong.length
    ? engineProfile.fiveElements.strong.slice(0, 2)
    : rankAdminElements(counts).slice(0, 2);
  const useful = engineProfile?.usefulGods && typeof engineProfile.usefulGods === "object" ? engineProfile.usefulGods : {};
  const yongshinKeys = buildAdminElementKeyList(useful.yong, weakKeys);
  const kijishinKeys = buildAdminElementKeyList(useful.gi, strongKeys);
  const strengthLabel = typeof useful.strength === "string"
    ? useful.strength
    : String(useful.strength?.level || "");
  const johuProfile = buildAdminSajuJohuProfile(pillars);
  const quantumContext = {
    pillars,
    power: {
      yongshin: yongshinKeys,
      kijishin: kijishinKeys,
    },
    jong: {
      isJong: false,
      name: "일반격",
    },
    johu: johuProfile,
  };
  const quantumElementMap = buildSajuQuantumElementMap(quantumContext).map((item) => ({
    ...item,
    score: counts[item.element] || 0,
  }));
  const daewoon = Array.isArray(engineProfile?.daewoon) ? engineProfile.daewoon : [];
  const quantumDaewunRows = buildSajuQuantumDaewunRows(daewoon.slice(0, 8), quantumContext);
  const age = Math.max(0, new Date().getUTCFullYear() - profile.year);
  const hiddenStemDigest = buildAdminSajuHiddenStemDigest(enginePillars);
  const tenGodDigest = buildAdminSajuTenGodDigest(engineProfile?.tenGods);
  const currentDaewoon = daewoon.find((row) => {
    const start = Number(row?.startAge || row?.startAgeYears || row?.startAgeDecimal || 0);
    const end = Number(row?.endAge || row?.endAgeYears || row?.endAgeDecimal || start + 9);
    return Number.isFinite(start) && Number.isFinite(end) && age >= start && age <= end;
  }) || daewoon[0] || null;
  const consultationDigest = buildAdminSajuConsultationDigest(profile, options.question, options.domain);
  const annualFlowDigest = buildAdminSajuAnnualFlowDigest(pillars);
  const baziSnapshot = {
    daewunBridge: engineProfile?.sajuCoreResult?.daewoon || engineProfile?.daewoon || null,
    yearGan: pillars.y.g,
    yearZhi: pillars.y.j,
    monthGan: pillars.m.g,
    monthZhi: pillars.m.j,
    dayGan: pillars.d.g,
    dayZhi: pillars.d.j,
    timeGan: pillars.h.g,
    timeZhi: pillars.h.j,
  };

  // 마스킹하지 않는다 — 실험실의 목적이 "실제 발송되는 프롬프트"를 그대로 검수하는 것이라,
  // 이름·생년월일·생시를 가리면 검수 대상과 실물이 달라진다. 입력은 관리자가 직접 넣은 테스트 값이다.
  return {
    profile: {
      name: profile.name,
      gender: profile.gender,
      birth: buildAdminBirthObject(profile),
      location: buildAdminLocationObject(profile),
    },
    analysisProfile: {
      name: profile.name,
      gender: profile.gender,
      birth: buildAdminBirthObject(profile),
      location: buildAdminLocationObject(profile),
    },
    snapshot: {
      updatedAt: new Date().toISOString(),
      reason: "admin-prompt-lab",
      name: profile.name,
      gender: profile.gender,
      birth: buildAdminBirthObject(profile),
      elementWeights: counts,
      dayStem: pillars.d.g,
      dayStemElement: pillars.d.gE,
      analysis: {
        elementWeights: counts,
        dayStem: pillars.d.g,
        dayStemElement: adminElementLabel(engineProfile?.dayMaster?.element || dominantKey),
      },
    },
    pillars,
    natal: {
      counts,
      dominant: adminElementLabel(dominantKey),
    },
    johu: {
      ...johuProfile,
      solarTerm: String(engineProfile?.solarTerms?.monthBoundaryTerm?.name || engineProfile?.solarTerms?.previousMajorTerm?.name || ""),
    },
    power: {
      isStrong: strengthLabel.toLowerCase().includes("strong"),
      yongshin: yongshinKeys.map(adminElementLabel),
      kijishin: kijishinKeys.map(adminElementLabel),
    },
    jong: {
      isJong: false,
      name: "일반격",
    },
    bazi: baziSnapshot,
    engineContext: {
      marker: "saju-ai-question-prompt-context-v20260617",
      promptConfig: options.promptConfig || null,
      sourceLayers: [
        "pillars",
        "natal-elements",
        "johu",
        "power-yongshin-kijishin",
        "jong-pattern",
        "quantum-element-map",
        "daewun-quantum-flow",
        "analysis-card-digests",
      ],
      bazi: baziSnapshot,
      quantumMyeongli: {
        dayStem: pillars.d.g,
        monthBranch: pillars.m.j,
        currentAge: age,
        timeCorrection: engineProfile?.timeCorrection || null,
        kasiCalendarContext: profile.kasiCalendarContext || null,
        policies: {
          hourPillarTimePolicy: profile.timeCorrectionPolicy,
          dayChangePolicy: profile.dayChangePolicy,
        },
        elementMap: quantumElementMap,
        daewun: quantumDaewunRows,
      },
      renderedFeatureDigests: [
        {
          id: "custom-consultation-context",
          label: "질문 맞춤 상담",
          text: consultationDigest,
        },
        {
          id: "hidden-stems",
          label: "지장간의 속결",
          text: hiddenStemDigest || "겉으로 드러난 천간 아래의 지장간을 함께 붙잡고 말문을 엽니다.",
        },
        {
          id: "ten-god-field",
          label: "십신의 중심 기류",
          text: tenGodDigest ? `강하게 떠오르는 십신은 ${tenGodDigest} 순서로 고개를 듭니다.` : "비겁, 식상, 재성, 관성, 인성의 기류를 원국 안에서 다시 헤아립니다.",
        },
        {
          id: "useful-god-current",
          label: "용신과 기신의 문턱",
          text: `용신 ${toAdminElementList(yongshinKeys)}, 기신 ${toAdminElementList(kijishinKeys)} 사이에서 질문의 길흉이 갈라집니다.`,
        },
        {
          id: "daewoon-current-bridge",
          label: "대운의 현재 다리",
          text: currentDaewoon ? `현재 나이는 ${age}세이며 ${currentDaewoon.ganji || currentDaewoon.pillar || ""} 대운의 물결 위에 머무릅니다.` : `현재 나이 ${age}세의 운로를 대운의 문턱과 함께 비춥니다.`,
        },
        {
          id: "annual-flow-lens",
          label: "세운의 올해 문",
          text: annualFlowDigest,
        },
      ],
    },
    sajuCoreResult: engineProfile?.sajuCoreResult || null,
  };
}

// 라이브 숙요 궁합(worker/routes/sukuyo-compatibility-ai.js lunarForPerson)과 같은 규칙:
// 음력 입력은 그 값을 그대로 음력으로 쓰고, 양력 입력만 변환한다.
function resolveAdminSukuyoStar(person) {
  if (person.calendarType === "lunar" || person.calendarType === "lunar_leap") {
    const isLeapMonth = person.calendarType === "lunar_leap";
    const lunarMonth = Math.abs(person.month);
    return {
      lunarMonth,
      lunarDay: person.day,
      sukuyo: buildSukuyoFromLunar(lunarMonth, person.day, {
        isLeapMonth,
        source: "admin-prompt-lab-user-lunar",
      }),
    };
  }

  // 🔴 음력은 한국 음양력 코어(KST 삭 기준)가 낸다. 중국 음력(lunar-javascript)은 삭이 CST 23시대에
  //    들면 그 달 전체가 하루 밀려 27수 본명숙이 옆 칸으로 간다(실측 2026-08-27 3.67%).
  //    생시는 음력일을 바꾸지 않으므로 코어는 날짜만 받는다.
  const lunar = solarToLunar(person.year, person.month, person.day);
  const lunarMonth = Math.max(1, lunar ? lunar.lunarMonth : Math.abs(person.month));
  const lunarDay = Math.max(1, lunar ? lunar.lunarDay : person.day);
  return {
    lunarMonth,
    lunarDay,
    sukuyo: buildSukuyoFromLunar(lunarMonth, lunarDay, {
      isLeapMonth: Boolean(lunar?.isLeapMonth),
      source: "admin-prompt-lab-lunar",
    }),
  };
}

function buildAdminSukuyoCompatibilityResult(selfStar, partnerProfile) {
  if (!partnerProfile) return null;

  const partnerStar = resolveAdminSukuyoStar(partnerProfile);
  const myIdx = Number(selfStar.sukuyo?.index);
  const partnerIdx = Number(partnerStar.sukuyo?.index);
  if (!Number.isFinite(myIdx) || !Number.isFinite(partnerIdx)) return null;

  // 관계 지표 정본. 값이 안 나오면 지어내지 않고 그대로 빈 값을 남긴다.
  const compatibility = buildCompatibilityFromIndices(myIdx, partnerIdx);
  if (!compatibility) return null;

  const partnerMansion = partnerStar.sukuyo?.nameKo ? `${partnerStar.sukuyo.nameKo}숙` : "";
  const roleGuide = compatibility.roleActionGuide || {};
  const strengthShadow = compatibility.strengthShadowMap || {};

  return {
    myIdx,
    partnerIdx,
    partnerDisplayIndex: partnerIdx + 1,
    partnerMansion,
    partnerName: partnerProfile.name,
    partnerGender: partnerProfile.genderLabel,
    relationType: compatibility.relationType,
    relationTypeHan: compatibility.relationTypeHan,
    distanceLabel: compatibility.distanceLabel,
    shortestDistance: compatibility.shortestDistance,
    myRole: compatibility.aRole,
    partnerRole: compatibility.bRole,
    directionFromAToB: compatibility.directionFromAToB,
    directionFromBToA: compatibility.directionFromBToA,
    score: compatibility.compatibilityIndex,
    temperature: compatibility.chemistryScore,
    magnetism: compatibility.growthScore,
    communicationScore: compatibility.communicationScore,
    stabilityScore: compatibility.stabilityScore,
    growthScore: compatibility.growthScore,
    conflictScore: compatibility.conflictScore,
    summary: compatibility.summary,
    // 정본은 객체로 주고 프롬프트는 문자열로 읽는다 — 여기서 한 번 평문화한다.
    roleGuideText: [roleGuide.meAction, roleGuide.otherAction, roleGuide.resetLine].filter(Boolean).join(" "),
    elementHarmonyText: compatibility.elementHarmony?.summary || "",
    strengthShadowText: [
      strengthShadow.a ? `본인 강점 ${strengthShadow.a.strength} / 그림자 ${strengthShadow.a.shadow}` : "",
      strengthShadow.b ? `상대 강점 ${strengthShadow.b.strength} / 그림자 ${strengthShadow.b.shadow}` : "",
      strengthShadow.complementSummary || "",
    ].filter(Boolean).join(" "),
    stamp: "관리자 숙요 계산 컨텍스트",
    partnerTraits: {
      core: partnerStar.sukuyo?.archetypeTitle || "",
      hidden: (partnerStar.sukuyo?.shadows || []).join("·"),
      love: (partnerStar.sukuyo?.strengths || []).join("·"),
      moonTone: partnerStar.sukuyo?.element || "",
    },
  };
}

export function buildAdminSukuyoContext(profile, partnerProfile) {
  const selfStar = resolveAdminSukuyoStar(profile);
  const { sukuyo, lunarMonth, lunarDay } = selfStar;
  const mansionIdx = Number(sukuyo?.index);
  const mansion = sukuyo?.nameKo ? `${sukuyo.nameKo}숙` : "";
  const strengths = Array.isArray(sukuyo?.strengths) ? sukuyo.strengths : [];
  const shadows = Array.isArray(sukuyo?.shadows) ? sukuyo.shadows : [];
  const keywords = Array.isArray(sukuyo?.keywords) ? sukuyo.keywords : [];

  return {
    basicResult: {
      mansion,
      mansionIdx,
      displayIndex: mansionIdx + 1,
      icon: "moon",
      talent: Math.max(35, Math.min(96, 62 + strengths.length * 6 - shadows.length * 2)),
      traits: {
        core: `${mansion}의 원형에는 ${keywords.join("·") || "달의 감응"} 기운이 먼저 드러납니다.`,
        hidden: shadows.length ? `${shadows.join("·")}의 그림자가 강해질 때 거리를 조율해야 합니다.` : "감정의 물결이 빨라질수록 거리를 두고 관찰할 때 중심이 살아납니다.",
        love: strengths.length ? `${strengths.join("·")}의 강점으로 마음의 문이 열립니다.` : "정서적 안전감과 오래 쌓이는 신뢰에 마음이 열립니다.",
        work: `${sukuyo?.archetypeTitle || "달의 원형"}이 일과 역할의 리듬에 스며듭니다.`,
        wealth: `${sukuyo?.element || "달"} 속성이 축적과 순환의 방식을 비춥니다.`,
        karma: `${sukuyo?.direction || "달의 자리"}에서 반복되는 인연의 매듭이 떠오릅니다.`,
        mantra: "서두르지 않고 달빛이 차오르는 속도에 맞춥니다.",
      },
      daily: {
        moon: { label: "차오르는 달" },
        moonLabel: "차오르는 달",
        insight: `${mansion}의 달빛이 관계의 거리와 마음의 밀도를 함께 비춥니다.`,
      },
      summaryTone: sukuyo?.archetypeTitle || "차분한 집중과 회복의 리듬",
      lunarBasis: {
        lunarMonth,
        lunarDay,
        isLeapMonth: Boolean(sukuyo?.isLeapMonth),
        source: sukuyo?.source || "admin-prompt-lab-lunar",
      },
    },
    compatibilityResult: buildAdminSukuyoCompatibilityResult(selfStar, partnerProfile),
  };
}

const ADMIN_ASTRO_SIGN_ELEMENTS = {
  "양자리": "fire",
  "황소자리": "earth",
  "쌍둥이자리": "air",
  "게자리": "water",
  "사자자리": "fire",
  "처녀자리": "earth",
  "천칭자리": "air",
  "전갈자리": "water",
  "사수자리": "fire",
  "염소자리": "earth",
  "물병자리": "air",
  "물고기자리": "water",
};
const ADMIN_ASTRO_SIGN_MODES = {
  "양자리": "cardinal",
  "황소자리": "fixed",
  "쌍둥이자리": "mutable",
  "게자리": "cardinal",
  "사자자리": "fixed",
  "처녀자리": "mutable",
  "천칭자리": "cardinal",
  "전갈자리": "fixed",
  "사수자리": "mutable",
  "염소자리": "cardinal",
  "물병자리": "fixed",
  "물고기자리": "mutable",
};
const ADMIN_ASTRO_PLANET_LABELS = {
  Sun: "태양",
  Moon: "달",
  Mercury: "수성",
  Venus: "금성",
  Mars: "화성",
  Jupiter: "목성",
  Saturn: "토성",
  Uranus: "천왕성",
  Neptune: "해왕성",
  Pluto: "명왕성",
};

function buildAdminChartInput(profile) {
  return {
    year: profile.year,
    month: profile.month,
    day: profile.day,
    hour: profile.hour,
    minute: profile.minute,
    timezone: profile.timezoneOffsetHours,
    lat: profile.latitude,
    lon: profile.longitude,
  };
}

function buildAdminPremiumBirthInput(profile) {
  return {
    name: profile.name,
    gender: profile.gender,
    birthDate: profile.birthDateText,
    birthTime: profile.birthTimeText,
    birthYear: profile.year,
    birthMonth: profile.month,
    birthDay: profile.day,
    birthHour: profile.hour,
    birthMinute: profile.minute,
    timezone: profile.timezone,
    birthPlace: profile.birthPlace,
    latitude: profile.latitude,
    longitude: profile.longitude,
    isTimeUnknown: profile.timeUnknown,
  };
}

function topAdminCountKey(counts) {
  return Object.keys(counts).sort((a, b) => Number(counts[b] || 0) - Number(counts[a] || 0))[0] || "";
}

function buildAdminAstroDistribution(planets, lookup, keys) {
  const counts = keys.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});
  planets.forEach((planet) => {
    const key = lookup[String(planet?.sign || "").trim()];
    if (key && Object.prototype.hasOwnProperty.call(counts, key)) counts[key] += 1;
  });
  const total = Math.max(1, planets.length);
  return {
    dominant: topAdminCountKey(counts),
    weakest: keys.slice().sort((a, b) => Number(counts[a] || 0) - Number(counts[b] || 0))[0] || "",
    counts,
    percentages: keys.reduce((acc, key) => {
      acc[key] = Math.round((Number(counts[key] || 0) / total) * 100);
      return acc;
    }, {}),
  };
}

async function buildAdminAstrologyContextFromEngine(profile, env, requestUrl) {
  const chartInput = buildAdminChartInput(profile);
  const swissChart = await getSwissWesternChart(env, chartInput, { requestUrl });
  const localChart = buildAstroLocalChartJson(
    normalizeAstroPremiumBirthInput(buildAdminPremiumBirthInput(profile)),
    swissChart,
    null,
    { strictPremium: false },
  );
  const chart = localChart?.chart || {};
  const planets = Array.isArray(chart.planets) ? chart.planets : [];
  const aspects = Array.isArray(chart.aspects) ? chart.aspects : [];
  const sun = planets.find((planet) => planet.name === "Sun") || {};
  const moon = planets.find((planet) => planet.name === "Moon") || {};
  const jupiter = planets.find((planet) => planet.name === "Jupiter") || {};
  const houseCounts = planets.reduce((acc, planet) => {
    const house = Number(planet?.house);
    if (Number.isFinite(house)) acc[house] = Number(acc[house] || 0) + 1;
    return acc;
  }, {});
  const topHouse = Number(topAdminCountKey(houseCounts)) || null;

  return {
    astrologyResult: {
      birth: {
        year: profile.year,
        month: profile.month,
        day: profile.day,
        hour: profile.hour,
        minute: profile.minute,
        timezone: profile.timezone,
        latitude: profile.latitude,
        longitude: profile.longitude,
      },
      coreSigns: {
        sun: chart.sunSign || sun.sign || "",
        moon: chart.moonSign || moon.sign || "",
        asc: chart.ascendantSign || "",
        mc: chart.midheavenSign || "",
        desc: chart.descendantSign || "",
      },
      elements: buildAdminAstroDistribution(planets, ADMIN_ASTRO_SIGN_ELEMENTS, ["fire", "earth", "air", "water"]),
      modalities: {
        ...buildAdminAstroDistribution(planets, ADMIN_ASTRO_SIGN_MODES, ["cardinal", "fixed", "mutable"]),
        advice: "가장 강하게 모인 양식을 먼저 붙잡고, 부족한 양식은 실행 리듬으로 보완합니다.",
      },
      focus: {
        topHouse: topHouse ? `${topHouse}하우스` : "",
        topHouseTopic: topHouse ? `${topHouse}하우스 집중` : "",
        focusCount: topHouse ? Number(houseCounts[topHouse] || 0) : 0,
      },
      transits: {
        jupiterTransit: jupiter.sign ? `목성 ${jupiter.sign}` : "",
        jupiterIndex: Number(jupiter.house || 0),
        message: "현재 질문은 네이탈 차트의 핵심 배치 위에서 먼저 열립니다.",
      },
      timelord: {
        firdaria: { main: sun.sign || "태양", sub: moon.sign || "달", yearsLeft: 0 },
        profection: {
          house: topHouse ? `${topHouse}하우스` : "",
          sign: chart.ascendantSign || "",
          ruler: chart.chartRuler?.label || "",
          theme: "연령과 하우스의 문턱",
        },
      },
      placements: planets.slice(0, 12).map((planet) => ({
        planet: ADMIN_ASTRO_PLANET_LABELS[planet.name] || planet.name,
        sign: planet.sign,
        house: Number.isFinite(Number(planet.house)) ? `${planet.house}하우스` : "",
        degree: Number.isFinite(Number(planet.degree)) ? Number(planet.degree).toFixed(2) : "",
      })),
      majorAspects: aspects.slice(0, 12).map((aspect) => ({
        pair: `${ADMIN_ASTRO_PLANET_LABELS[aspect.planetA] || aspect.planetA}-${ADMIN_ASTRO_PLANET_LABELS[aspect.planetB] || aspect.planetB}`,
        aspect: aspect.type,
        orb: Number.isFinite(Number(aspect.orb)) ? Number(aspect.orb).toFixed(2) : "",
      })),
      calculationSource: localChart?.calculationSource || swissChart?.source || "swiss",
      localAstroChartJson: localChart,
    },
  };
}

function buildAdminTarotPrompt({ question, profile, domain }) {
  const spread = [
    { position: "문 앞의 기운", card: pickAdmin(ADMIN_TAROT_CARDS, profile.seed, 1) },
    { position: "숨은 동기", card: pickAdmin(ADMIN_TAROT_CARDS, profile.seed, 5) },
    { position: "현실의 관문", card: pickAdmin(ADMIN_TAROT_CARDS, profile.seed, 9) },
    { position: "피해야 할 그림자", card: pickAdmin(ADMIN_TAROT_CARDS, profile.seed, 13) },
    { position: "열리는 선택", card: pickAdmin(ADMIN_TAROT_CARDS, profile.seed, 17) },
  ];
  const domainLabel = ADMIN_PROMPT_DOMAIN_LABELS[domain] || ADMIN_PROMPT_DOMAIN_LABELS.general;
  const spreadLines = spread.map((row) => `- ${row.position}: ${row.card}`);
  const customPrompt = [
    "당신은 최고 수준의 타로 리더입니다.",
    "",
    "[상담 결속값]",
    `이름/성별: ${profile.name} / ${profile.genderLabel}`,
    `생년월일/시간: ${profile.birthDateText} ${profile.timeUnknown ? "출생시간 미상" : profile.birthTimeText}`,
    `질문 성격: ${domainLabel}`,
    `사용자 질문: ${question}`,
    `생년월일 시드: ${profile.seed}`,
    "",
    "[스프레드]",
    ...spreadLines,
    "",
    "[리딩 지시]",
    "첫 문단은 질문자가 이미 감지하고 있는 불안을 짚고, 가장 강하게 떠오르는 카드 한 장으로 핵심 결을 잡습니다.",
    "두 번째 문단은 문 앞의 기운과 숨은 동기를 함께 엮어 질문의 진짜 갈망을 비춥니다.",
    "세 번째 문단은 현실의 관문과 피해야 할 그림자를 나란히 두고, 지금 피해야 할 선택과 붙잡을 선택을 분리합니다.",
    "네 번째 문단은 열리는 선택 카드로 7일, 30일, 90일의 행동 리듬을 제시합니다.",
    "모든 조언은 카드 이름을 직접 근거로 삼고, 같은 질문이라도 다른 생년월일 시드에는 그대로 옮기지 못하게 카드 배열과 결속값을 다시 언급합니다.",
    "문장은 신비롭되 모호하지 않게, 질문자가 오늘 바로 붙잡을 수 있는 말로 내립니다.",
    "법률, 의료, 투자 확정 판단은 피하고 상징과 선택의 언어로 머무릅니다.",
    "",
    "[출력 형식]",
    "1. 지금 가장 강하게 떠오르는 카드",
    "2. 질문 뒤에 숨은 마음",
    "3. 문이 열리는 자리와 닫히는 자리",
    "4. 7일/30일/90일 리듬",
    "5. 마지막 한 문장",
    "",
    "이 스프레드는 위 생년월일 시드와 질문 성격에 묶여 있으며, 다른 사람에게는 카드를 다시 뽑아야 합니다.",
  ].join("\n");

  return buildFortuneQuestionPromptPackage({
    fortuneType: "tarot",
    fortuneLabel: "타로",
    expertLabel: "최고 수준의 타로 리더",
    userQuestion: question,
    analysisResult: {
      profileSeed: profile.seed,
      domain,
      spread,
      birth: {
        date: profile.birthDateText,
        time: profile.birthTimeText,
        timeUnknown: profile.timeUnknown,
      },
    },
    profile: {
      name: profile.name,
      gender: profile.genderLabel,
      birthDate: profile.birthDateText,
      birthTime: profile.birthTimeText,
      timezone: profile.timezone,
    },
    mode: domain,
    questionTypeLabel: domainLabel,
    analysisAngles: [
      "카드 포지션별 질문 관문",
      "생년월일 시드와 카드 배열 결속",
      "질문 성격에 따른 행동 리듬",
      "재사용 방지용 스프레드 근거",
    ],
    recommendedFollowUpQuestions: [
      "이 카드 배열에서 30일 안에 가장 먼저 움직일 선택은 무엇인가요?",
      "관계나 일의 흐름에서 피해야 할 그림자 카드는 어떻게 드러나나요?",
      "같은 질문을 한 달 뒤 다시 뽑으면 무엇을 비교해야 하나요?",
    ],
    caution: "타로는 상징과 선택의 언어이며 법률/의료/투자 확정 판단을 대신하지 않습니다.",
    domainDataLines: [
      `질문 성격: ${domainLabel}`,
      `스프레드: ${spreadLines.join(" | ")}`,
      `결속값: ${profile.birthDateText}/${profile.birthTimeText}/${profile.seed}`,
    ],
    customPrompt,
    minPromptLength: 1200,
  });
}

// 엔진(worker/lib/ziwei-ai-chart.js)이 내보내는 한글 궁 이름 -> 프롬프트 계약의 궁 id.
// 엔진의 PALACE_NAMES 와 순서·표기가 같아야 한다(노복궁 표기 포함).
const ADMIN_ZIWEI_ENGINE_PALACE_IDS = Object.freeze({
  "명궁": "ming",
  "형제궁": "siblings",
  "부부궁": "spouse",
  "자녀궁": "children",
  "재백궁": "wealth",
  "질액궁": "health",
  "천이궁": "travel",
  "노복궁": "friends",
  "관록궁": "career",
  "전택궁": "property",
  "복덕궁": "fortune",
  "부모궁": "parents",
});

// 엔진의 밝기 등급(묘/득/리/평/함)을 프롬프트가 읽는 strengthSymbol 로 옮긴다.
// 표에 없는 별은 심볼을 붙이지 않는다 — 없는 강약 근거를 지어내지 않기 위함.
function toAdminZiweiStars(names, brightness) {
  if (!Array.isArray(names)) return [];
  return names
    .filter(Boolean)
    .map((name) => {
      const symbol = describeBrightness(brightness?.[name])?.symbol || "";
      return symbol ? { name, strengthSymbol: symbol } : { name };
    });
}

export function buildAdminZiweiChartFromEngine(profile) {
  // 엔진은 gender 를 소문자화한 뒤 "male" 만 남성으로 인정한다(applyMajorLuck).
  // "M" 을 그대로 넘기면 대운 방향이 조용히 뒤집히므로 라이브(ziwei-ai.js)와 같은 표기로 넘긴다.
  const gender = profile.gender === "M" ? "male" : profile.gender === "F" ? "female" : "";
  // 자미두수 엔진은 음력 변환을 스스로 하므로 사주처럼 KASI 로 미리 양력화하지 않는다.
  const calendarType = profile.calendarType === "solar" ? "solar" : "lunar";
  const chart = calculateZiweiAiChart({
    birthInfo: {
      gender,
      birthDate: profile.birthDateText,
      birthTime: profile.birthTimeText,
      birthTimeUnknown: profile.timeUnknown,
      calendarType,
      isLeapMonth: profile.calendarType === "lunar_leap",
    },
  }, { year: new Date().getUTCFullYear() });

  const palaces = (Array.isArray(chart.palaces) ? chart.palaces : []).map((palace, index) => ({
    id: ADMIN_ZIWEI_ENGINE_PALACE_IDS[palace?.name] || "",
    name: palace?.name || "",
    branch: palace?.earthlyBranch || "",
    index,
    mainStars: toAdminZiweiStars(palace?.mainStars, palace?.brightness),
    auxiliaryStars: toAdminZiweiStars(palace?.assistantStars, palace?.brightness),
    strengthSummary: {
      weakStars: toAdminZiweiStars(palace?.maleficStars, palace?.brightness),
    },
  }));

  const strongestPalaces = Array.isArray(chart?.keyFeatures?.strongestPalaces) ? chart.keyFeatures.strongestPalaces : [];
  const strongestName = strongestPalaces[0]?.palace || "";
  // keyFeatures.strongestPalaces 는 상위 3개만 담기므로 그 마지막을 "가장 약한 궁"으로 쓰면 라벨과 내용이 어긋난다.
  // 엔진과 같은 점수식(주성*3 + 보조성 - 살성)을 12궁 전체에 적용해 실제 최약궁을 고른다.
  const scoredPalaces = (Array.isArray(chart.palaces) ? chart.palaces : []).map((palace) => ({
    name: palace?.name || "",
    score: (palace?.mainStars?.length || 0) * 3 + (palace?.assistantStars?.length || 0) - (palace?.maleficStars?.length || 0),
  }));
  const weakestName = scoredPalaces.length
    ? scoredPalaces.slice().sort((a, b) => a.score - b.score)[0].name
    : "";
  const sihua = chart.fourTransformations && typeof chart.fourTransformations === "object" ? chart.fourTransformations : {};

  return {
    user: {
      gender: profile.gender,
      calendarType,
      isLeapMonth: profile.calendarType === "lunar_leap",
      birthYear: profile.year,
      birthMonth: profile.month,
      birthDay: profile.day,
      birthHour: profile.hour,
      birthMinute: profile.minute,
      unknownHour: profile.timeUnknown,
      birthPlace: profile.birthPlace || "미지정",
      timezone: profile.timezone,
    },
    birthYearStem: chart?.lunar?.yearStem || "",
    yearGan: chart?.lunar?.yearStem || "",
    yearZhi: chart?.lunar?.yearBranch || "",
    mingGong: chart.lifePalace || "",
    shenGong: chart.bodyPalace || "",
    palaces,
    summary: {
      strongestPalaceId: ADMIN_ZIWEI_ENGINE_PALACE_IDS[strongestName] || "",
      weakestPalaceId: ADMIN_ZIWEI_ENGINE_PALACE_IDS[weakestName] || "",
      direction: chart.chartSummary || "",
      strengths: strongestPalaces.map((row) => row?.palace).filter(Boolean),
      weaknesses: [],
    },
    // 엔진은 huaLu/huaQuan/huaKe/huaJi(카멜) 로 내보내고 프롬프트는 hualu/huaquan/huake/huaji(소문자)로 읽는다.
    sihua: {
      hualu: sihua.huaLu || "",
      huaquan: sihua.huaQuan || "",
      huake: sihua.huaKe || "",
      huaji: sihua.huaJi || "",
    },
    majorPeriods: (Array.isArray(chart.majorLuck) ? chart.majorLuck : []).map((period) => ({
      palaceId: ADMIN_ZIWEI_ENGINE_PALACE_IDS[period?.palaceName] || "",
      palaceName: period?.palaceName || "",
      range: period?.range || "",
    })),
    // 엔진의 yearlyLuck 은 keyPalaces 배열을 갖지 않는다. 유년 궁 하나가 실제 근거이므로
    // 그것만 넘기고 나머지 궁을 지어내지 않는다.
    annualFlow: {
      yearLabel: chart?.yearlyLuck?.year ? `${chart.yearlyLuck.year} 세운` : "",
      keyPalaces: [ADMIN_ZIWEI_ENGINE_PALACE_IDS[chart?.yearlyLuck?.palaceName] || ""].filter(Boolean),
    },
    juInfo: chart?.bureau?.name || "",
    sanFangSiZheng: chart.sanFangSiZheng || null,
    uncertainty: chart.uncertainty || null,
  };
}

async function buildAdminVedicContextFromEngine(profile, env, requestUrl) {
  const chartInput = buildAdminChartInput(profile);
  const swissVedic = await getSwissVedicPlanets(env, chartInput, { requestUrl });
  const localVedic = buildVedicLocalChartJson({
    ...buildAdminPremiumBirthInput(profile),
    chart: swissVedic,
  }, { strictPremium: false });
  const chart = localVedic?.chart || {};
  const planets = Array.isArray(chart.planets) ? chart.planets : [];
  const houses = Array.isArray(chart.houses) ? chart.houses : [];
  const dashas = chart.dashas && typeof chart.dashas === "object" ? chart.dashas : {};
  const dashaPeriods = Array.isArray(dashas.periods) ? dashas.periods : [];

  return {
    vedicResult: {
      profile: {
        name: profile.name,
        birth: {
          year: profile.year,
          month: profile.month,
          day: profile.day,
          hour: profile.hour,
          minute: profile.minute,
          gender: profile.gender,
          timezone: profile.timezone,
          lat: profile.latitude,
          lon: profile.longitude,
          timeUnknown: profile.timeUnknown,
        },
      },
      lagna: {
        signKo: chart.lagnaSign || "",
        sign: chart.lagnaSignEn || chart.lagnaSign || "",
        degree: Number.isFinite(Number(swissVedic?.ascendantSidereal)) ? Number((Number(swissVedic.ascendantSidereal) % 30).toFixed(2)) : null,
        lord: chart.chartRuler?.label || "",
      },
      moonNakshatra: {
        name: chart.nakshatra?.name || "",
        pada: Number(chart.nakshatra?.pada || 0) || null,
        lord: chart.nakshatra?.lord || "",
        deity: chart.nakshatra?.deity || "",
        motive: chart.nakshatra?.motive || "",
      },
      karakas: {
        atmakaraka: chart.karakas?.atmakaraka || chart.atmakaraka || "",
        amatyakaraka: chart.karakas?.amatyakaraka || "",
        darakaraka: chart.karakas?.darakaraka || "",
      },
      yogas: Array.isArray(localVedic?.insights)
        ? localVedic.insights.map((item) => item?.title || item?.label || "").filter(Boolean).slice(0, 8)
        : [],
      planets: planets.map((planet) => ({
        grahaKo: planet.nameKo || planet.name,
        graha: planet.name,
        rashiKo: planet.sign || "",
        rashi: planet.signEn || planet.sign || "",
        bhava: Number(planet.house || 0) || null,
        nakshatra: planet.nakshatra || "",
        pada: Number(planet.pada || 0) || null,
        dignity: planet.dignity || "",
        retrograde: Boolean(planet.retrograde),
      })),
      bhavas: houses.map((house) => ({
        number: Number(house.house || house.number || 0) || null,
        rashiKo: house.sign || house.rashi || "",
        rashi: house.signEn || house.sign || house.rashi || "",
        lord: house.lord || "",
        planets: Array.isArray(house.planets) ? house.planets : [],
      })),
      dasha: dashaPeriods.slice(0, 12).map((row, index) => ({
        planet: row.lord || row.planet || row.name || "",
        start: row.start || row.startYear || "",
        end: row.end || row.endYear || "",
        years: Number(row.years || row.duration || 0) || null,
        active: Boolean(row.active) || row.lord === dashas.currentMahaDasha || index === 0,
      })),
      romance: { primary: [chart.lagnaSign, chart.moonSign].filter(Boolean), best: chart.nakshatra?.name || "" },
      career: { primary: houses.filter((house) => Number(house.house || house.number) === 10).map((house) => house.sign).filter(Boolean), best: dashas.currentMahaDasha || "" },
      wealth: { primary: houses.filter((house) => [2, 11].includes(Number(house.house || house.number))).map((house) => house.sign).filter(Boolean), best: chart.lagnaSign || "" },
      calculationSource: localVedic?.chartSource || swissVedic?.source || "swiss-vedic",
      localVedicChartJson: localVedic,
    },
  };
}

async function buildAdminPromptByService({ service, question, profile, partnerProfile, domain, promptConfig, env, requestUrl, variant, extraBody }) {
  if (service === "saju") {
    return buildSajuAIPromptWithDomain({
      question,
      sajuResult: buildAdminSajuResultFromEngine(profile, { question, domain, promptConfig }),
      domain,
    });
  }

  if (service === "tarot") {
    return buildAdminTarotPrompt({ question, profile, domain });
  }

  if (service === "sukuyo") {
    const context = buildAdminSukuyoContext(profile, partnerProfile);
    return buildSukuyoAIPromptWithDomain({
      question,
      basicResult: context.basicResult,
      compatibilityResult: context.compatibilityResult,
      domain,
    });
  }

  if (service === "astrology") {
    const context = await buildAdminAstrologyContextFromEngine(profile, env, requestUrl);
    return buildAstrologyAIPromptWithDomain({
      question,
      astrologyResult: context.astrologyResult,
      compatibilityResult: context.compatibilityResult,
      domain,
    });
  }

  if (service === "ziwei") {
    return buildZiweiAIPromptWithDomain({
      question,
      chartResult: buildAdminZiweiChartFromEngine(profile),
      domain,
    });
  }

  if (service === "vedic") {
    const context = await buildAdminVedicContextFromEngine(profile, env, requestUrl);
    // 프로덕션(fortune.js handleVedicAIPrompt)과 동일하게 domain 없는 빌더를 쓴다.
    // 이 빌더는 질문에서 주제를 스스로 분류하므로 domain 인자를 받지 않는다.
    return buildVedicAIPrompt({
      question,
      vedicResult: context.vedicResult,
      compatibilityResult: context.compatibilityResult,
    });
  }

  // 위 6종은 이 파일이 직접 조립한다(검증된 경로라 그대로 둔다).
  // 나머지 운세는 각 라우트/라이브러리가 노출한 buildAdminLabPrompt 를 레지스트리로 찾아 부른다.
  if (hasPromptLabLoader(service)) {
    return buildPromptLabResult(
      service,
      { ...(extraBody || {}), ...buildAdminLabBody(profile, question) },
      { env, variant: variant || "" },
    );
  }

  throw createHttpError(400, "지원하지 않는 점술입니다.", { code: "INVALID_PROMPT_SERVICE" });
}

/* 관리자 폼의 프로필을 각 라우트의 요청 본문 모양으로 옮긴다.
   라우트마다 normalize* 가 여러 별칭(birthInfo.* / 최상위 *)을 받아 주므로 둘 다 실어 보낸다. */
function buildAdminLabBody(profile = {}, question = "") {
  const birthPlace = {
    name: profile.birthPlace || "",
    latitude: profile.latitude ?? null,
    longitude: profile.longitude ?? null,
    timezone: profile.timezone || "",
  };

  return {
    name: profile.name || "",
    userName: profile.name || "",
    gender: profile.gender || "",
    birthDate: profile.birthDateText || "",
    birthTime: profile.timeUnknown ? "" : (profile.birthTimeText || ""),
    birthTimeUnknown: Boolean(profile.timeUnknown),
    calendarType: profile.calendarType || "solar",
    birthPlace,
    timezone: profile.timezone || "",
    latitude: profile.latitude ?? null,
    longitude: profile.longitude ?? null,
    question: question || "",
    birthInfo: {
      name: profile.name || "",
      gender: profile.gender || "",
      birthDate: profile.birthDateText || "",
      birthTime: profile.timeUnknown ? "" : (profile.birthTimeText || ""),
      birthTimeUnknown: Boolean(profile.timeUnknown),
      calendarType: profile.calendarType || "solar",
      birthPlace,
    },
  };
}

function normalizeAdminPromptLabResult({ built, service, domain, profile, partnerProfile, question, adminContext, requestId }) {
  const prompt = String(built?.prompt || built?.generatedPrompt || "").trim();
  const systemPrompt = String(built?.systemPrompt || "").trim();
  const variants = Array.isArray(built?.variants) ? built.variants : [];
  // 사용자 프롬프트가 계산 결과를 필요로 해서 못 만드는 운세도 있다(partial). 그때는 시스템
  // 프롬프트나 변형 목록만이라도 보여 주는 것이 목적이므로, 셋 다 비었을 때만 실패로 본다.
  if (!prompt && !systemPrompt && !variants.length) {
    throw createHttpError(500, "프롬프트 본문을 만들지 못했습니다.", { code: "PROMPT_BODY_EMPTY" });
  }

  const labService = getAdminPromptLabService(service);

  return {
    ok: true,
    requestId,
    adminAuth: true,
    adminUserId: adminContext?.userId || null,
    adminFreeExecution: true,
    service,
    serviceLabel: ADMIN_PROMPT_SERVICE_LABELS[service] || labService?.label || service,
    domain: built?.domain || domain || "general",
    domainLabel: built?.domainLabel || ADMIN_PROMPT_DOMAIN_LABELS[domain] || ADMIN_PROMPT_DOMAIN_LABELS.general,
    title: built?.title || `${ADMIN_PROMPT_SERVICE_LABELS[service] || labService?.label || service} 프롬프트`,
    prompt,
    generatedPrompt: prompt,
    systemPrompt,
    partial: Boolean(built?.partial),
    partialReason: String(built?.partialReason || ""),
    variantKey: String(built?.variantKey || ""),
    variants,
    notes: Array.isArray(built?.notes) ? built.notes : [],
    // 내장 6종은 질문을 프롬프트 본문에 직접 박아 넣으므로 항상 반영된다.
    questionUsed: built?.questionUsed !== undefined
      ? Boolean(built.questionUsed)
      : Boolean(question && prompt.includes(question)),
    summaryIntent: built?.summaryIntent || "",
    analysisAngles: Array.isArray(built?.analysisAngles) ? built.analysisAngles : [],
    recommendedFollowUpQuestions: Array.isArray(built?.recommendedFollowUpQuestions) ? built.recommendedFollowUpQuestions : [],
    caution: built?.caution || "",
    engineContextSummary: built?.engineContextSummary || null,
    advancedFactors: service === "saju" ? (built?.advancedFactors || null) : null,
    questionDigest: built?.questionDigest || built?.digest || "",
    inputProfile: {
      name: profile.name,
      gender: profile.gender,
      genderLabel: profile.genderLabel,
      birthDate: profile.inputBirthDateText || profile.birthDateText,
      calendarType: profile.inputCalendarType || profile.calendarType,
      resolvedSolarBirthDate: profile.resolvedSolarDateText || profile.birthDateText,
      calendarSource: profile.kasiCalendarContext?.source || (profile.calendarType === "solar" ? "input-solar" : ""),
      birthTime: profile.birthTimeText,
      birthTimeUnknown: profile.timeUnknown,
      birthPlace: profile.birthPlace || "",
      timezone: profile.timezone,
      latitude: profile.latitude,
      longitude: profile.longitude,
      seed: profile.seed,
    },
    partnerProfile: partnerProfile
      ? {
        name: partnerProfile.name,
        genderLabel: partnerProfile.genderLabel,
        birthDate: partnerProfile.birthDateText,
        calendarType: partnerProfile.calendarType,
      }
      : null,
    question,
    generatedAt: new Date().toISOString(),
  };
}

async function handleAdminPromptLabGenerate(request, env) {
  const requestId = crypto.randomUUID();
  const adminContext = await authorizeAdminRequest(request, env);
  const body = await readJson(request);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw createHttpError(400, "Request body must be an object.", { code: "VALIDATION_ERROR" });
  }

  const service = normalizeAdminPromptService(body.service);
  if (!service) {
    throw createHttpError(400, "점술 종류를 선택해 주세요.", { code: "INVALID_PROMPT_SERVICE" });
  }

  /* 질문은 이제 모든 운세가 받는다(레지스트리 inputs 참고). 다만 "받는 것"과 "없으면 거절하는 것"은
     다르다 — 꿈해몽·반려동물 사주처럼 프로덕션 프롬프트에 질문 슬롯이 없는 기능까지 강제하면
     프롬프트를 아예 못 뽑는다. 그래서 빈 질문으로도 조립이 되지 않는 6종(질문을 프롬프트 본문에
     직접 박아 넣는 기존 경로)만 예전처럼 요구한다. */
  const question = normalizeAdminQuestion(body.question);
  if (isBuiltInPromptLabService(service) && question.length < 5) {
    throw createHttpError(400, "질문을 조금 더 구체적으로 입력해 주세요.", { code: "INVALID_PROMPT_QUESTION" });
  }

  const profile = buildAdminPromptProfile(body);
  const domain = normalizeAdminPromptDomain(service, body.domain) || "";
  const partnerProfile = service === "sukuyo" ? buildAdminPartnerProfile(body) : null;
  // 생년 정보를 쓰지 않는 운세는 생시·좌표 검사를 걸 이유가 없다.
  if (promptLabServiceNeeds(service, "profile")) {
    assertAdminPromptProfileReady(service, profile, { domain, partnerProfile });
  }
  const promptConfig = service === "saju" ? buildAdminSajuPromptConfig(body) : null;
  const engineProfile = service === "saju"
    ? await resolveAdminSajuEngineProfile(profile, env)
    : profile;
  // 분야별 템플릿 오버라이드는 빌더 안쪽의 동기 접근자가 읽으므로 빌드 전에 채워 둔다.
  // 라이브 사주 경로(fortune.js handleSajuAIPrompt)와 같은 처리이며, 실패해도 내부에서 삼키고
  // 코드 기본 템플릿으로 진행한다.
  await primePromptTemplateOverrides(env);
  const built = await buildAdminPromptByService({
    service,
    question,
    profile: engineProfile,
    partnerProfile,
    domain,
    promptConfig,
    env,
    requestUrl: request.url,
    variant: normalizeAdminText(body.variant, 120),
    // 기능 고유 입력(꿈 내용·반려동물·대상 연도 등)은 라우트의 normalize* 가 직접 읽는다.
    extraBody: body,
  });

  return json(normalizeAdminPromptLabResult({
    built,
    service,
    domain,
    profile: engineProfile,
    partnerProfile,
    question,
    adminContext,
    requestId,
  }));
}

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

function normalizeText(value, maxLen = 5000) {
  return String(value || "").trim().slice(0, maxLen);
}

function firstRuntimeValue(env, keys = []) {
  for (const key of keys) {
    const value = String(env?.[key] || "").trim();
    if (value) return value;
  }
  return "";
}

function normalizeStringArray(values, maxItemLen = 120, maxItems = 50) {
  if (!Array.isArray(values)) return [];

  const out = [];
  const seen = new Set();
  for (let i = 0; i < values.length; i += 1) {
    if (out.length >= maxItems) break;
    const value = normalizeText(values[i], maxItemLen);
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function slugify(value) {
  const normalized = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized;
}

function normalizeType(value, fallback = "general") {
  const type = String(value || fallback).trim().toLowerCase();
  return CONTENT_TYPE_SET.has(type) ? type : fallback;
}

function normalizeContentFormat(value, fallback = "html") {
  const contentFormat = String(value || fallback).trim().toLowerCase();
  return CONTENT_FORMAT_SET.has(contentFormat) ? contentFormat : fallback;
}

function sanitizeHttpUrl(value, maxLen = 2000) {
  const url = normalizeText(value, maxLen);
  if (!url) return "";
  if (url.startsWith("/")) return url;

  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch (e) {
    return "";
  }

  return "";
}

function normalizeContentStatus(value, fallback = "draft") {
  const status = String(value || fallback).trim().toLowerCase();
  return CONTENT_STATUS_SET.has(status) ? status : fallback;
}

function isObjectLike(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function buildFeaturedImage(value) {
  const source = isObjectLike(value) ? value : {};
  return {
    url: normalizeText(source.url, 1000),
    alt: normalizeText(source.alt, 300),
    width: Math.max(0, Number(source.width || 0) || 0),
    height: Math.max(0, Number(source.height || 0) || 0),
  };
}

function escapeHtmlAttr(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function extractHtmlAttr(attrs, name) {
  const pattern = new RegExp(`\\s${name}\\s*=\\s*(\"([^\"]*)\"|'([^']*)'|([^\\s>]+))`, "i");
  const matched = String(attrs || "").match(pattern);
  if (!matched) return "";
  return String(matched[2] || matched[3] || matched[4] || "").trim();
}

function sanitizeHref(rawHref) {
  const href = String(rawHref || "").trim();
  if (!href) return "";

  const lowered = href.toLowerCase().replace(/[\u0000-\u001f\u007f\s]+/g, "");
  if (lowered.startsWith("javascript:") || lowered.startsWith("vbscript:") || lowered.startsWith("data:")) {
    return "";
  }

  if (
    lowered.startsWith("http://")
    || lowered.startsWith("https://")
    || lowered.startsWith("mailto:")
    || lowered.startsWith("tel:")
    || lowered.startsWith("/")
    || lowered.startsWith("#")
    || lowered.startsWith("?")
  ) {
    return href;
  }

  return "";
}

function sanitizeSrc(rawSrc) {
  const src = String(rawSrc || "").trim();
  if (!src) return "";

  const lowered = src.toLowerCase().replace(/[\u0000-\u001f\u007f\s]+/g, "");
  if (lowered.startsWith("javascript:") || lowered.startsWith("vbscript:") || lowered.startsWith("data:")) {
    return "";
  }

  if (lowered.startsWith("http://") || lowered.startsWith("https://") || lowered.startsWith("/")) {
    return src;
  }

  return "";
}

function sanitizeNumericDimension(rawValue) {
  const value = Number(String(rawValue || "").trim());
  if (!Number.isFinite(value)) return "";
  const normalized = Math.max(1, Math.min(8192, Math.floor(value)));
  return String(normalized);
}

function sanitizeInsightHtml(rawHtml) {
  let html = String(rawHtml || "");

  html = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*(script|style|iframe|object|embed|meta|link|base|form|input|button|textarea|select)[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|meta|link|base|form|input|button|textarea|select)\b[^>]*\/?>/gi, "");

  html = html.replace(/<\/?([a-z0-9-]+)([^>]*)>/gi, (fullTag, rawName, rawAttrs = "") => {
    const tagName = String(rawName || "").toLowerCase();
    if (!INSIGHT_ALLOWED_HTML_TAGS.has(tagName)) return "";

    if (fullTag.startsWith("</")) {
      return `</${tagName}>`;
    }

    if (tagName === "a") {
      const href = sanitizeHref(extractHtmlAttr(rawAttrs, "href"));
      if (!href) return "<a>";
      return `<a href="${escapeHtmlAttr(href)}" rel="noopener noreferrer nofollow" target="_blank">`;
    }

    if (tagName === "img") {
      const src = sanitizeSrc(extractHtmlAttr(rawAttrs, "src"));
      if (!src) return "";

      const alt = escapeHtmlAttr(extractHtmlAttr(rawAttrs, "alt") || "");
      const width = sanitizeNumericDimension(extractHtmlAttr(rawAttrs, "width"));
      const height = sanitizeNumericDimension(extractHtmlAttr(rawAttrs, "height"));
      const loading = String(extractHtmlAttr(rawAttrs, "loading") || "").toLowerCase() === "eager" ? "eager" : "lazy";

      const attrs = [
        `src="${escapeHtmlAttr(src)}"`,
        `alt="${alt}"`,
        `loading="${loading}"`,
      ];

      if (width) attrs.push(`width="${width}"`);
      if (height) attrs.push(`height="${height}"`);

      return `<img ${attrs.join(" ")}>`;
    }

    return `<${tagName}>`;
  });

  return html.trim();
}

function normalizeSeoInput(body = {}) {
  const seoBody = isObjectLike(body?.seo) ? body.seo : {};
  const metaTitle = normalizeText(seoBody.metaTitle ?? body.metaTitle, 240);
  const metaDescription = normalizeText(seoBody.metaDescription ?? body.metaDescription, 600);
  const ogTitle = normalizeText(seoBody.ogTitle ?? body.ogTitle, 240);
  const ogDescription = normalizeText(seoBody.ogDescription ?? body.ogDescription, 600);
  const ogImage = sanitizeHttpUrl(seoBody.ogImage ?? body.ogImage, 1000);
  const canonicalUrl = sanitizeHttpUrl(seoBody.canonicalUrl ?? body.canonicalUrl, 1000);

  return {
    metaTitle,
    metaDescription,
    ogTitle,
    ogDescription,
    ogImage,
    canonicalUrl,
  };
}

function parseContentPublishedAt(value, status, existingPublishedAt = null) {
  if (value === null) return null;
  if (value !== undefined) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (status === "published") {
    if (existingPublishedAt) return existingPublishedAt;
    return new Date();
  }
  if (status === "scheduled") return existingPublishedAt || null;
  return null;
}

/* options.list 는 목록 응답용이다. 본문·이력을 빼고 내보낸다 — 목록 화면이 그 필드를 쓰지 않는데
   응답에는 실려 나가고 있었다(본문은 상세 조회, 이력은 /:id/revisions 가 따로 가져간다).
   본문 정화(sanitizeInsightHtml)도 목록에서는 건너뛴다. 항목마다 본문 전체를 다시 훑는 비용이다. */
function toContentItem(item, options = {}) {
  const listMode = Boolean(options.list);
  const contentFormat = normalizeContentFormat(item?.contentFormat, "html");
  const contentHtml = listMode
    ? ""
    : sanitizeInsightHtml(String(item?.contentHtml || (contentFormat === "html" ? item?.content : "") || ""));
  const thumbnailUrl = sanitizeHttpUrl(item?.thumbnailUrl || item?.featuredImage?.url, 1000);
  const seo = {
    metaTitle: normalizeText(item?.seo?.metaTitle || item?.metaTitle, 240),
    metaDescription: normalizeText(item?.seo?.metaDescription || item?.metaDescription, 600),
    ogTitle: normalizeText(item?.seo?.ogTitle || item?.ogTitle, 240),
    ogDescription: normalizeText(item?.seo?.ogDescription || item?.ogDescription, 600),
    ogImage: sanitizeHttpUrl(item?.seo?.ogImage || item?.ogImage, 1000),
    canonicalUrl: sanitizeHttpUrl(item?.seo?.canonicalUrl || item?.canonicalUrl, 1000),
  };
  const status = normalizeContentStatus(item?.status, "draft");

  return {
    id: String(item?._id || ""),
    _id: String(item?._id || ""),
    type: normalizeType(item?.type, "fortune_insight"),
    title: normalizeText(item?.title, 240),
    slug: normalizeText(item?.slug, 240),
    summary: normalizeText(item?.summary || item?.excerpt, 2000),
    excerpt: normalizeText(item?.excerpt || item?.summary, 2000),
    ...(listMode ? {} : {
      content: String(item?.content || contentHtml || ""),
      contentHtml,
      contentJson: isObjectLike(item?.contentJson) ? item.contentJson : {},
      revisionHistory: Array.isArray(item?.revisionHistory) ? item.revisionHistory.slice(-20) : [],
    }),
    contentFormat,
    revision: Math.max(1, Number(item?.revision || 1) || 1),
    thumbnailUrl,
    featuredImage: {
      url: thumbnailUrl,
      alt: normalizeText(item?.featuredImage?.alt, 300),
      width: Math.max(0, Number(item?.featuredImage?.width || 0) || 0),
      height: Math.max(0, Number(item?.featuredImage?.height || 0) || 0),
    },
    category: normalizeText(item?.category, 120),
    tags: normalizeStringArray(item?.tags, 60, 80),
    status,
    seo,
    authorId: normalizeText(item?.authorId, 120),
    authorName: normalizeText(item?.authorName || item?.author, 120),
    publishedAt: item?.publishedAt || null,
    createdAt: item?.createdAt || null,
    updatedAt: item?.updatedAt || null,
    isPublished: status === CONTENT_PUBLIC_STATUS,
    isFeatured: Boolean(item?.isFeatured),
    noIndex: Boolean(item?.noIndex),
    viewCount: Math.max(0, Number(item?.viewCount || 0) || 0),
    readingTime: Math.max(0, Number(item?.readingTime || 0) || 0),
    keywords: normalizeStringArray(item?.keywords, 80, 80),
    metaTitle: seo.metaTitle,
    metaDescription: seo.metaDescription,
    canonicalUrl: seo.canonicalUrl,
    ogTitle: seo.ogTitle,
    ogDescription: seo.ogDescription,
    ogImage: seo.ogImage,
    twitterTitle: normalizeText(item?.twitterTitle, 240),
    twitterDescription: normalizeText(item?.twitterDescription, 600),
    twitterImage: sanitizeHttpUrl(item?.twitterImage, 1000),
  };
}

function normalizeContentPayload(body = {}, mode = "create", existing = null) {
  if (!isObjectLike(body)) {
    throw createHttpError(400, "Request body must be an object.", { code: "VALIDATION_ERROR" });
  }

  const title = normalizeText(body.title, 240);
  const providedSlugRaw = normalizeText(body.slug, 240);
  const slug = slugify(providedSlugRaw);
  if (body.slug !== undefined && providedSlugRaw && !slug) {
    throw createHttpError(400, "slug format is invalid.", { code: "VALIDATION_ERROR" });
  }

  const type = normalizeType(body.type, existing?.type || "general");
  const status = normalizeContentStatus(body.status, existing?.status || (mode === "create" ? "draft" : "draft"));
  const contentFormat = normalizeContentFormat(
    body.contentFormat,
    existing?.contentFormat || (isObjectLike(body.contentJson) ? "blocks" : "html"),
  );

  if (mode === "create" && !title) {
    throw createHttpError(400, "title is required.", { code: "VALIDATION_ERROR" });
  }

  const contentHtmlInput = body.contentHtml !== undefined
    ? body.contentHtml
    : (contentFormat === "html" ? body.content : existing?.contentHtml || "");

  const seo = normalizeSeoInput(body);
  const nextSummary = normalizeText(body.summary ?? body.excerpt, 2000);
  const thumbnailUrl = sanitizeHttpUrl(
    body.thumbnailUrl ?? body.featuredImage?.url ?? existing?.thumbnailUrl,
    1000,
  );

  const featuredImage = buildFeaturedImage({
    ...(isObjectLike(existing?.featuredImage) ? existing.featuredImage : {}),
    ...(isObjectLike(body.featuredImage) ? body.featuredImage : {}),
    url: thumbnailUrl,
  });

  const nextPublishedAt = parseContentPublishedAt(
    body.publishedAt,
    status,
    existing?.publishedAt || null,
  );
  if (status === "scheduled" && !nextPublishedAt) {
    throw createHttpError(400, "scheduled publish time is required.", { code: "SCHEDULED_AT_REQUIRED" });
  }

  const payload = {
    type,
    title,
    summary: nextSummary,
    subtitle: normalizeText(body.subtitle ?? existing?.subtitle, 240),
    slug,
    excerpt: nextSummary,
    content: String(body.content ?? existing?.content ?? ""),
    contentFormat,
    contentHtml: sanitizeInsightHtml(contentHtmlInput),
    contentJson: isObjectLike(body.contentJson) ? body.contentJson : (existing?.contentJson || {}),
    thumbnailUrl,
    featuredImage,
    category: normalizeText(body.category ?? existing?.category, 120),
    tags: normalizeStringArray(body.tags ?? existing?.tags, 60, 40),
    seo,
    metaTitle: seo.metaTitle,
    metaDescription: seo.metaDescription,
    canonicalUrl: seo.canonicalUrl,
    ogTitle: seo.ogTitle,
    ogDescription: seo.ogDescription,
    ogImage: seo.ogImage,
    twitterTitle: normalizeText(body.twitterTitle ?? existing?.twitterTitle, 240),
    twitterDescription: normalizeText(body.twitterDescription ?? existing?.twitterDescription, 600),
    twitterImage: sanitizeHttpUrl(body.twitterImage ?? existing?.twitterImage, 1000),
    keywords: normalizeStringArray(body.keywords ?? existing?.keywords, 80, 50),
    authorId: normalizeText(body.authorId ?? existing?.authorId, 120),
    authorName: normalizeText(body.authorName ?? body.author ?? existing?.authorName ?? existing?.author, 120),
    author: normalizeText(body.author ?? body.authorName ?? existing?.author ?? existing?.authorName, 120),
    status,
    isPublished: status === CONTENT_PUBLIC_STATUS,
    isFeatured: body.isFeatured !== undefined ? Boolean(body.isFeatured) : Boolean(existing?.isFeatured),
    noIndex: body.noIndex !== undefined ? Boolean(body.noIndex) : Boolean(existing?.noIndex),
    viewCount: Math.max(0, Number(body.viewCount ?? existing?.viewCount ?? 0) || 0),
    readingTime: Math.max(0, Number(body.readingTime ?? existing?.readingTime ?? 0) || 0),
    publishedAt: nextPublishedAt,
  };

  if (mode === "update") {
    Object.keys(payload).forEach((key) => {
      // 🔴 파생 필드는 같은 이름의 body 키가 없다. 이름만 보고 지우면 갱신에서 통째로 빠지는데,
      // 읽을 때는 중첩 seo 가 평면 필드를 이기므로(toContentItem) 낡은 seo 가 계속 살아남아
      // "SEO 를 고쳤는데 안 바뀐다"가 된다. 그래서 출처 키가 하나라도 오면 남긴다.
      if (CONTENT_DERIVED_FIELD_SOURCES[key]) {
        if (!CONTENT_DERIVED_FIELD_SOURCES[key].some((source) => body[source] !== undefined)) {
          delete payload[key];
        }
        return;
      }
      if (body[key] === undefined && key !== "isPublished" && key !== "publishedAt") {
        delete payload[key];
      }
    });

    if (body.slug === undefined) delete payload.slug;
    if (body.status === undefined && body.publishedAt === undefined) {
      delete payload.isPublished;
      delete payload.publishedAt;
    }
  }

  return {
    payload,
    title,
    providedSlug: providedSlugRaw,
  };
}

function logAdminContent(event, details = {}) {
  const payload = {
    scope: "admin-content",
    event,
    timestamp: new Date().toISOString(),
    ...details,
  };

  try {
    console.log("[admin-content]", JSON.stringify(payload));
  } catch (e) {
    console.log("[admin-content]", payload);
  }
}

function buildContentRevisionSnapshot(item, adminContext, reason = "manual_save") {
  const revision = Math.max(1, Number(item?.revision || 1) || 1);
  return {
    id: `rev_${Date.now().toString(36)}_${revision}`,
    revision,
    reason,
    savedAt: new Date(),
    savedBy: String(adminContext?.userId || "admin"),
    title: String(item?.title || ""),
    slug: String(item?.slug || ""),
    summary: String(item?.summary || ""),
    subtitle: String(item?.subtitle || ""),
    excerpt: String(item?.excerpt || ""),
    content: String(item?.content || ""),
    contentFormat: String(item?.contentFormat || "html"),
    contentHtml: String(item?.contentHtml || ""),
    contentJson: isObjectLike(item?.contentJson) ? item.contentJson : {},
    category: String(item?.category || ""),
    tags: Array.isArray(item?.tags) ? item.tags.slice(0, 80) : [],
    status: String(item?.status || "draft"),
    seo: isObjectLike(item?.seo) ? item.seo : {},
    metaTitle: String(item?.metaTitle || ""),
    metaDescription: String(item?.metaDescription || ""),
    keywords: Array.isArray(item?.keywords) ? item.keywords.slice(0, 80) : [],
    canonicalUrl: String(item?.canonicalUrl || ""),
    ogTitle: String(item?.ogTitle || ""),
    ogDescription: String(item?.ogDescription || ""),
    ogImage: String(item?.ogImage || ""),
    twitterTitle: String(item?.twitterTitle || ""),
    twitterDescription: String(item?.twitterDescription || ""),
    twitterImage: String(item?.twitterImage || ""),
    featuredImage: isObjectLike(item?.featuredImage) ? item.featuredImage : {},
    thumbnailUrl: String(item?.thumbnailUrl || ""),
    isFeatured: Boolean(item?.isFeatured),
    noIndex: Boolean(item?.noIndex),
    publishedAt: item?.publishedAt || null,
  };
}

async function findDuplicateSlug(slug, excludeId = "") {
  const query = { slug };
  if (excludeId) query._id = { $ne: excludeId };
  return Insight.findOne(query).select("_id slug").lean();
}

async function buildUniqueSlug(baseInput, excludeId = "") {
  const base = slugify(baseInput) || `insight-${Date.now()}`;
  let candidate = base;
  let seq = 2;

  while (await findDuplicateSlug(candidate, excludeId)) {
    candidate = `${base}-${seq}`;
    seq += 1;
    if (seq > 500) {
      candidate = `${base}-${Date.now()}`;
      break;
    }
  }

  return candidate;
}

function parseInsightId(path) {
  const matched = path.match(/^\/insights\/([a-f0-9]{24})$/i);
  return matched ? matched[1] : "";
}

function normalizeUploadFileName(rawName) {
  const noExt = String(rawName || "image")
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return noExt || "image";
}

function inferImageMimeFromMagic(bytes) {
  if (!bytes || bytes.length < 12) return "";

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    bytes[0] === 0x52
    && bytes[1] === 0x49
    && bytes[2] === 0x46
    && bytes[3] === 0x46
    && bytes[8] === 0x57
    && bytes[9] === 0x45
    && bytes[10] === 0x42
    && bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return "";
}

function extensionFromMime(mimeType) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "";
}

function randomHex(length = 10) {
  const bytes = new Uint8Array(Math.max(4, Math.ceil(length / 2)));
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((value) => value.toString(16).padStart(2, "0")).join("").slice(0, length);
}

function buildUploadImageKey(fileName, mimeType, usage) {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const ext = extensionFromMime(mimeType) || "jpg";
  const safeName = normalizeUploadFileName(fileName);
  const usageDir = usage === "featured" ? "featured" : "body";
  return `insights/${usageDir}/${yyyy}/${mm}/${Date.now()}-${randomHex(8)}-${safeName}.${ext}`;
}

function encodePathSegments(path) {
  return String(path || "")
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function buildUploadedImageUrl(request, env, key) {
  const explicitBase = String(env?.INSIGHT_IMAGE_PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "");
  const encodedPath = encodePathSegments(key);

  if (explicitBase) return `${explicitBase}/${encodedPath}`;

  const origin = new URL(request.url).origin;
  return `${origin}/api/insights/images/${encodedPath}`;
}

function normalizeUploadDimension(rawValue) {
  return Math.max(0, Math.min(8192, Number(rawValue || 0) || 0));
}

async function handleInsightsUploadImage(request, env) {
  await authorizeAdminRequest(request, env);

  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("multipart/form-data")) {
    throw createHttpError(400, "Image upload must use multipart/form-data.", { code: "INVALID_UPLOAD_CONTENT_TYPE" });
  }

  const bucket = env?.INSIGHT_IMAGES_BUCKET;
  if (!bucket || typeof bucket.put !== "function") {
    throw createHttpError(503, "Image storage is not configured.", {
      code: "IMAGE_STORAGE_NOT_CONFIGURED",
      requiredBindings: ["INSIGHT_IMAGES_BUCKET"],
      optionalVars: ["INSIGHT_IMAGE_PUBLIC_BASE_URL"],
    });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || typeof file.arrayBuffer !== "function") {
    throw createHttpError(400, "file is required.", { code: "UPLOAD_FILE_REQUIRED" });
  }

  const rawSize = Number(file.size || 0) || 0;
  if (rawSize <= 0) {
    throw createHttpError(400, "empty file is not allowed.", { code: "UPLOAD_FILE_EMPTY" });
  }
  if (rawSize > INSIGHT_MAX_IMAGE_BYTES) {
    throw createHttpError(413, "file too large. max 6MB.", { code: "UPLOAD_FILE_TOO_LARGE" });
  }

  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const sniffedMime = inferImageMimeFromMagic(fileBytes);
  if (!sniffedMime || !INSIGHT_ALLOWED_UPLOAD_MIME.has(sniffedMime)) {
    throw createHttpError(400, "only jpg, jpeg, png, webp are allowed.", { code: "UPLOAD_FILE_TYPE_NOT_ALLOWED" });
  }

  const claimedMime = String(file.type || "").toLowerCase();
  if (claimedMime && !INSIGHT_ALLOWED_UPLOAD_MIME.has(claimedMime)) {
    throw createHttpError(400, "invalid file type.", { code: "UPLOAD_FILE_TYPE_NOT_ALLOWED" });
  }

  const usage = String(formData.get("usage") || "body").toLowerCase() === "featured" ? "featured" : "body";
  const alt = normalizeText(formData.get("alt"), 300);
  const width = normalizeUploadDimension(formData.get("width"));
  const height = normalizeUploadDimension(formData.get("height"));

  const key = buildUploadImageKey(file.name, sniffedMime, usage);

  await bucket.put(key, fileBytes, {
    httpMetadata: {
      contentType: sniffedMime,
      cacheControl: "public, max-age=31536000, immutable",
      contentDisposition: `inline; filename="${normalizeUploadFileName(file.name)}.${extensionFromMime(sniffedMime)}"`,
    },
    customMetadata: {
      usage,
      alt,
      uploadedAt: String(Date.now()),
    },
  });

  const url = buildUploadedImageUrl(request, env, key);
  return json({
    ok: true,
    item: {
      key,
      url,
      alt,
      width,
      height,
      mimeType: sniffedMime,
      size: rawSize,
      loading: "lazy",
      usage,
      storage: "r2",
    },
  }, { status: 201 });
}

function decodeCookieValue(rawValue) {
  try {
    return decodeURIComponent(String(rawValue || ""));
  } catch (e) {
    return String(rawValue || "");
  }
}

function extractFlowerAdminToken(request) {
  const headerToken = normalizeText(request.headers.get("x-admin-token"), 512);
  if (headerToken) return headerToken;

  const auth = String(request.headers.get("authorization") || "").trim();
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }

  const cookie = String(request.headers.get("cookie") || "");
  const match = cookie.match(/(?:^|;\s*)flower_admin_token=([^;]+)/i);
  if (!match) return "";
  return decodeCookieValue(match[1]);
}

function base64urlDecode(value) {
  const base64 = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (base64.length % 4)) % 4;
  return atob(base64 + "=".repeat(pad));
}

// 검증에 성공하면 페이로드를, 실패하면 null 을 돌려준다(전부 falsy 라 기존 진리값 호출부와 호환).
async function verifyFlowerAdminToken(request, env) {
  const token = extractFlowerAdminToken(request);
  if (!token) return null;

  const dotIdx = token.lastIndexOf(".");
  if (dotIdx < 1) return null;

  const payloadB64 = token.slice(0, dotIdx);
  const signatureHex = token.slice(dotIdx + 1);
  if (!/^[a-f0-9]{64}$/i.test(signatureHex)) return null;

  let expectedHex = "";
  try {
    expectedHex = await hmacSha256Hex(payloadB64, resolveFlowerAdminSecret(env));
  } catch (error) {
    return null;
  }

  if (!timingSafeEqualText(expectedHex, signatureHex.toLowerCase())) return null;

  let payload = null;
  try {
    payload = JSON.parse(base64urlDecode(payloadB64));
  } catch (e) {
    return null;
  }

  const exp = Number(payload?.exp || 0);
  const nowSec = Math.floor(Date.now() / 1000);
  if (payload?.v !== 1 || !Number.isFinite(exp) || nowSec > exp) return null;

  // 불리언 대신 페이로드를 돌려준다 — 호출부가 jti 로 감사 귀속을 남길 수 있게.
  // 호출부는 진리값으로만 쓰던 곳이라 null/객체 전환이 그대로 호환된다.
  return payload;
}

/**
 * 관리자 행위를 adminauditlogs 에 남긴다.
 *
 * 🔴 절대 throw 하지 않는다. 감사 로그 쓰기가 실패했다고 관리 작업이 막히면 안 된다
 * (Atlas 가 흔들리는 순간 관리자 화면 전체가 죽는 경로를 만들지 않는다).
 *
 * 기록 시점은 인가 직후 = **시도** 시점이다. 결과가 아니라 의도를 남긴다 — 핸들러가
 * 부분 쓰기 후 500 이 나도 기록이 남는 쪽이 1인 운영 콘솔에서는 맞다.
 */
async function writeAdminAuditLog(request, env, { actorLabel, actorUserId, mode, outcome, meta }) {
  try {
    const meta_ = getRequestMeta(request);
    const url = new URL(request.url);
    await connectDb(env);
    await AdminAuditLog.create({
      action: `${request.method.toUpperCase()} ${url.pathname}`.slice(0, 200),
      actorLabel: String(actorLabel || "").slice(0, 120),
      // ObjectId 가 아닌 행위자(flower-admin:<jti>)는 actorLabel 로만 남는다.
      actorUserId: mongoose.Types.ObjectId.isValid(actorUserId || "") ? actorUserId : null,
      mode: mode || "flower",
      outcome: outcome || "attempted",
      ip: meta_.ip,
      userAgent: meta_.userAgent,
      requestId: meta_.requestId,
      meta: meta || null,
    });
  } catch (error) {
    console.error("[admin-audit] write failed", error?.message || error);
  }
}

async function authorizeAdminRequest(request, env) {
  const authHeader = String(request.headers.get("authorization") || "").trim();
  const cookieHeader = String(request.headers.get("cookie") || "");
  // 실제 세션 쿠키 이름은 worker/lib/auth.js 의 ACCESS_COOKIE_NAME/REFRESH_COOKIE_NAME 이다.
  // cd_* 만 보던 시절에는 쿠키만 가진 role:"admin" 세션이 이 사전 게이트에서 401 로 튕겨,
  // JWT 관리자 경로가 사실상 Bearer 전용이었다. 구 이름도 함께 남겨 둔다.
  const hasSessionCookie = /(?:^|;\s*)(fortune_auth_token|fortune_auth_refresh|cd_access_token|cd_refresh_token)=/i.test(cookieHeader);
  const hasFlowerCredential = Boolean(extractFlowerAdminToken(request));
  const hasAnyCredential = Boolean(authHeader) || hasSessionCookie || hasFlowerCredential;

  if (!hasAnyCredential) {
    throw createHttpError(401, "로그인이 필요합니다.", { code: "UNAUTHORIZED" });
  }

  const flowerTokenPayload = await verifyFlowerAdminToken(request, env);

  // 꽃 토큰이 유효하면 requireAuth(Mongo 왕복)를 돌리지 않는다.
  // 아래 분기를 보면 알 수 있듯 flowerTokenPayload 가 있는 순간 결과는 어느 경로로 가든
  // "admin 허용"으로 같고, 달라지는 것은 기록용 userId 뿐이다. 관리자 요청마다 DB 왕복을
  // 하나 더 태우는 대가로는 비싸고, Atlas 가 흔들리는 순간 관리자 화면이 죽는 경로를 하나 더 만든다.
  // 트레이드오프: 실제 admin 계정으로도 로그인한 상태였다면 updatedBy 가 flower-admin 으로 남는다
  // (기존에도 비-admin + 꽃토큰 조합은 동일하게 동작했다).
  if (flowerTokenPayload) {
    // jti 를 귀속 문자열에 붙인다. adminContext.userId 는 cms.js 의 updatedBy 등 14곳 이상이
    // 그대로 저장하므로, 호출부를 하나도 건드리지 않고 세션 단위 감사 추적이 살아난다.
    const sessionId = String(flowerTokenPayload.jti || "").slice(0, 16);
    const actorId = sessionId ? `flower-admin:${sessionId}` : "flower-admin";
    // 조회(GET)는 남기지 않는다 — 관리 콘솔은 목록·상세를 계속 폴링해 로그가 조회로 덮인다.
    if (request.method.toUpperCase() !== "GET") {
      await writeAdminAuditLog(request, env, {
        actorLabel: actorId,
        actorUserId: null,
        mode: "flower",
        outcome: "granted",
      });
    }
    return {
      mode: "flower",
      auth: { userId: actorId, role: "admin", isAdmin: true },
      userId: actorId,
      isAdmin: true,
    };
  }

  let auth = null;
  let authError = null;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    authError = error;
  }

  // 여기까지 왔다면 꽃 토큰은 없다(위에서 이미 반환됨). JWT 관리자만 통과시킨다.
  if (auth) {
    const role = String(auth.role || "user").toLowerCase();
    const isAdmin = role === "admin" || auth.isAdmin === true;
    if (!isAdmin) {
      // 권한 없는 로그인 사용자가 관리자 경로를 두드린 것 — 침입 시도 신호라 GET 도 남긴다.
      await writeAdminAuditLog(request, env, {
        actorLabel: String(auth.userId || ""),
        actorUserId: String(auth.userId || ""),
        mode: "jwt",
        outcome: "denied",
        meta: { role },
      });
      throw createHttpError(403, "관리자 권한이 필요합니다.", { code: "FORBIDDEN" });
    }

    if (request.method.toUpperCase() !== "GET") {
      await writeAdminAuditLog(request, env, {
        actorLabel: String(auth.email || auth.userId || ""),
        actorUserId: String(auth.userId || ""),
        mode: "jwt",
        outcome: "granted",
      });
    }

    return {
      mode: "jwt",
      auth,
      userId: String(auth.userId || ""),
      isAdmin: true,
    };
  }

  if (authError && Number(authError?.status || 0) === 401) {
    throw createHttpError(401, "로그인이 필요합니다.", { code: "UNAUTHORIZED" });
  }

  throw createHttpError(401, "로그인이 필요합니다.", { code: "UNAUTHORIZED" });
}

function parseQuery(urlString) {
  const url = new URL(urlString);
  const q = url.searchParams;
  const status = normalizeText(q.get("status"), 24).toLowerCase();
  const includeTrash = String(q.get("includeTrash") || "") === "1";
  const search = normalizeText(q.get("q"), 120);
  const sort = normalizeText(q.get("sort"), 24).toLowerCase();
  const page = Math.max(1, Number(q.get("page") || 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(q.get("pageSize") || 20) || 20));
  return { status, includeTrash, search, sort, page, pageSize };
}

function resolveListSort(sort) {
  if (sort === "updated") return { updatedAt: -1, createdAt: -1 };
  if (sort === "views") return { viewCount: -1, updatedAt: -1, createdAt: -1 };
  return { createdAt: -1, updatedAt: -1 };
}

async function handleInsightsList(request, env) {
  await authorizeAdminRequest(request, env);
  await connectDb(env);

  const { status, includeTrash, search, sort, page, pageSize } = parseQuery(request.url);
  const query = {};

  if (INSIGHT_STATUS_SET.has(status)) {
    query.status = status;
  } else if (!includeTrash) {
    query.status = { $ne: "trash" };
  }

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { title: { $regex: escaped, $options: "i" } },
      { slug: { $regex: escaped, $options: "i" } },
    ];
  }

  const sortSpec = resolveListSort(sort);

  const [items, totalCount] = await adminMongoRead(env, async () => Promise.all([
    Insight.find(query)
      .sort(sortSpec)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Insight.countDocuments(query),
  ]));

  return json({
    ok: true,
    totalCount,
    page,
    pageSize,
    sort: sort || "latest",
    search,
    items,
  });
}

async function handleInsightsCreate(request, env) {
  await authorizeAdminRequest(request, env);
  await connectDb(env);

  const body = await readJson(request);
  // /api/admin/content 와 같은 정규화기를 쓴다. 예전에는 이 경로만 다른 함수를 써서
  // seo{} 중첩·summary·content·type 을 안 남겼고, 읽을 때는 중첩 seo 가 이겨서
  // 여기서 고친 SEO 가 글 편집 화면과 공개 메타에서 무시됐다.
  const { payload, title, providedSlug } = normalizeContentPayload(body, "create");

  if (!title) {
    throw createHttpError(400, "title is required.", { code: "VALIDATION_ERROR" });
  }

  if (providedSlug) {
    const duplicate = await findDuplicateSlug(payload.slug);
    if (duplicate) {
      throw createHttpError(409, "slug already exists.", { code: "DUPLICATE_SLUG" });
    }
  } else {
    payload.slug = await buildUniqueSlug(title);
  }

  if (!payload.slug) {
    payload.slug = await buildUniqueSlug(`insight-${Date.now()}`);
  }

  const doc = await Insight.create(payload);
  await purgeInsightPublicCache([doc.slug]);
  return json({ ok: true, item: doc.toObject() }, { status: 201 });
}

async function handleInsightsGetById(path, request, env) {
  await authorizeAdminRequest(request, env);
  await connectDb(env);

  const id = parseInsightId(path);
  if (!id) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const item = await adminMongoRead(env, async () => Insight.findById(id).lean());
  if (!item) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  return json({ ok: true, item });
}

async function handleInsightsUpdate(path, request, env) {
  await authorizeAdminRequest(request, env);
  await connectDb(env);

  const id = parseInsightId(path);
  if (!id) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const existing = await Insight.findById(id).lean();
  if (!existing) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const body = await readJson(request);
  // /api/admin/content 와 같은 정규화기. isPublished 는 여기서 항상 status 로부터 파생되므로
  // 둘이 갈리지 않는다 — 예전에는 이 경로가 isPublished 를 독립으로 받아 "관리자엔 발행됨,
  // 사이트엔 안 나옴"이 가능했다(공개 조회는 status 만 본다).
  const { payload, title, providedSlug } = normalizeContentPayload(body, "update", existing);

  if (body.title !== undefined && !title) {
    throw createHttpError(400, "title is required.", { code: "VALIDATION_ERROR" });
  }

  if (body.slug !== undefined) {
    if (!providedSlug) {
      const fallbackTitle = title || existing.title;
      payload.slug = await buildUniqueSlug(fallbackTitle, id);
    } else {
      const duplicate = await findDuplicateSlug(payload.slug, id);
      if (duplicate) {
        throw createHttpError(409, "slug already exists.", { code: "DUPLICATE_SLUG" });
      }
    }
  }

  const updated = await Insight.findByIdAndUpdate(
    id,
    { $set: payload },
    { returnDocument: "after" },
  ).lean();

  // 공개 캐시 무효화 — 슬러그가 바뀌었으면 옛 슬러그의 상세 키도 함께 지운다.
  await purgeInsightPublicCache([existing.slug, updated?.slug]);
  return json({ ok: true, item: updated });
}

async function handleInsightsDelete(path, request, env) {
  await authorizeAdminRequest(request, env);
  await connectDb(env);

  const id = parseInsightId(path);
  if (!id) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const updated = await Insight.findByIdAndUpdate(
    id,
    {
      $set: {
        status: "trash",
        isPublished: false,
      },
    },
    { returnDocument: "after" },
  ).lean();

  if (!updated) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });
  await purgeInsightPublicCache([updated.slug]);
  return json({ ok: true, item: updated });
}

function parseAdminContentId(path) {
  const matched = String(path || "").match(/^\/content\/([^/]+)$/i);
  if (!matched) return "";

  let token = "";
  try {
    token = decodeURIComponent(String(matched[1] || "").trim());
  } catch (e) {
    return "";
  }

  if (!token) return "";
  if (token.startsWith("insight:")) token = token.slice("insight:".length);
  if (!/^[a-f0-9]{24}$/i.test(token)) return "";
  return token;
}

function parseAdminContentPathIdentifier(path) {
  const matched = String(path || "").match(/^\/content\/([^/]+)$/i);
  if (!matched) return "";

  try {
    const token = decodeURIComponent(String(matched[1] || "").trim());
    if (!token) return "";
    if (token.startsWith("insight:")) return token.slice("insight:".length);
    return token;
  } catch (error) {
    return "";
  }
}

async function findContentByAdminPath(path, env) {
  const token = parseAdminContentPathIdentifier(path);
  if (!token) return null;

  const trimmed = token.trim();
  const lowered = trimmed.toLowerCase();

  if (/^[a-f0-9]{24}$/i.test(trimmed)) {
    const byId = await adminMongoRead(env, async () => Insight.findById(trimmed).lean());
    if (byId) return byId;
  }

  const slugCandidates = [...new Set([trimmed, lowered].filter(Boolean))];
  return adminMongoRead(env, async () => Insight.findOne({ slug: { $in: slugCandidates } }).lean());
}

async function resolveAdminContentId(path, env) {
  const found = await findContentByAdminPath(path, env);
  return found ? String(found?._id || "") : "";
}

function parseAdminContentSlug(path) {
  const matched = String(path || "").match(/^\/content\/by-slug\/([^/]+)$/i);
  if (!matched) return "";

  try {
    const decoded = decodeURIComponent(String(matched[1] || "")).trim().toLowerCase();
    if (!decoded || decoded.length > 240) return "";
    return decoded;
  } catch (e) {
    return "";
  }
}

function parseContentListQuery(urlString) {
  const url = new URL(urlString);
  const q = url.searchParams;

  const type = normalizeType(q.get("type"), "");
  const statusRaw = normalizeText(q.get("status"), 24).toLowerCase();
  const status = statusRaw && CONTENT_STATUS_SET.has(statusRaw) ? statusRaw : "";
  const category = normalizeText(q.get("category"), 120);
  const keyword = normalizeText(q.get("keyword") || q.get("q"), 120);
  const sort = normalizeText(q.get("sort"), 32).toLowerCase();
  const page = Math.max(1, Number(q.get("page") || 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(q.get("limit") || q.get("pageSize") || 20) || 20));

  return {
    type,
    status,
    category,
    keyword,
    sort,
    page,
    limit,
  };
}

function resolveContentSort(sort) {
  if (sort === "updated") return { updatedAt: -1, createdAt: -1 };
  if (sort === "published") return { publishedAt: -1, updatedAt: -1, createdAt: -1 };
  if (sort === "title") return { title: 1, updatedAt: -1 };
  if (sort === "views") return { viewCount: -1, updatedAt: -1 };
  return { updatedAt: -1, createdAt: -1 };
}

function buildContentListQuery(filters) {
  const query = {};

  if (filters.type) {
    if (filters.type === "fortune_insight") {
      query.$or = [{ type: "fortune_insight" }, { type: { $exists: false } }, { type: "" }];
    } else {
      query.type = filters.type;
    }
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.category) {
    query.category = filters.category;
  }

  if (filters.keyword) {
    const escaped = filters.keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$and = [
      ...(Array.isArray(query.$and) ? query.$and : []),
      {
        $or: [
          { title: { $regex: escaped, $options: "i" } },
          { slug: { $regex: escaped, $options: "i" } },
          { summary: { $regex: escaped, $options: "i" } },
          { excerpt: { $regex: escaped, $options: "i" } },
          { category: { $regex: escaped, $options: "i" } },
          { tags: { $elemMatch: { $regex: escaped, $options: "i" } } },
        ],
      },
    ];
  }

  return query;
}

async function handleContentList(request, env) {
  const adminContext = await authorizeAdminRequest(request, env);
  await connectDb(env);

  const filters = parseContentListQuery(request.url);
  const query = buildContentListQuery(filters);
  const sort = resolveContentSort(filters.sort);

  logAdminContent("list_start", {
    endpoint: "/api/admin/content",
    method: request.method,
    userId: adminContext.userId,
    isAdmin: adminContext.isAdmin,
    filters,
  });

  const [items, total] = await adminMongoRead(env, async () => Promise.all([
    Insight.find(query)
      .select(CONTENT_LIST_PROJECTION)
      .sort(sort)
      .skip((filters.page - 1) * filters.limit)
      .limit(filters.limit)
      .lean(),
    Insight.countDocuments(query),
  ]));

  const mappedItems = items.map((item) => toContentItem(item, { list: true }));
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));

  logAdminContent("list_success", {
    endpoint: "/api/admin/content",
    method: request.method,
    userId: adminContext.userId,
    isAdmin: adminContext.isAdmin,
    resultCount: mappedItems.length,
    total,
  });

  return json({
    ok: true,
    items: mappedItems,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages,
    },
  });
}

async function findDuplicateContentSlug(slug, excludeId = "") {
  const query = { slug };
  if (excludeId) query._id = { $ne: excludeId };
  return Insight.findOne(query).select("_id slug").lean();
}

async function buildUniqueContentSlug(baseInput, excludeId = "") {
  const base = slugify(baseInput) || `content-${Date.now()}`;
  let candidate = base;
  let seq = 2;

  while (await findDuplicateContentSlug(candidate, excludeId)) {
    candidate = `${base}-${seq}`;
    seq += 1;
    if (seq > 500) {
      candidate = `${base}-${Date.now()}`;
      break;
    }
  }

  return candidate;
}

async function handleContentCreate(request, env) {
  const adminContext = await authorizeAdminRequest(request, env);
  await connectDb(env);

  const body = await readJson(request);
  const { payload, title, providedSlug } = normalizeContentPayload(body, "create", null);

  if (!title) {
    throw createHttpError(400, "title is required.", { code: "VALIDATION_ERROR" });
  }

  if (providedSlug) {
    const duplicate = await findDuplicateContentSlug(payload.slug);
    if (duplicate) {
      throw createHttpError(409, "slug already exists.", { code: "DUPLICATE_SLUG" });
    }
  } else {
    payload.slug = await buildUniqueContentSlug(title);
  }

  if (!payload.slug) {
    payload.slug = await buildUniqueContentSlug(`content-${Date.now()}`);
  }

  const created = await Insight.create(payload);
  const item = toContentItem(created.toObject());
  await purgeInsightPublicCache([item.slug]);

  logAdminContent("create_success", {
    endpoint: "/api/admin/content",
    method: request.method,
    userId: adminContext.userId,
    isAdmin: adminContext.isAdmin,
    contentId: item.id,
    slug: item.slug,
    type: item.type,
  });

  return json({ ok: true, item }, { status: 201 });
}

async function handleContentGetById(path, request, env) {
  const adminContext = await authorizeAdminRequest(request, env);
  await connectDb(env);

  const found = await findContentByAdminPath(path, env);
  if (!found) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const item = toContentItem(found);
  logAdminContent("get_success", {
    endpoint: "/api/admin/content/:id",
    method: request.method,
    userId: adminContext.userId,
    isAdmin: adminContext.isAdmin,
    contentId: item.id,
    slug: item.slug,
  });

  return json({ ok: true, item });
}

async function handleContentGetBySlug(path, request, env) {
  const adminContext = await authorizeAdminRequest(request, env);
  await connectDb(env);

  const slug = parseAdminContentSlug(path);
  if (!slug) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const found = await adminMongoRead(env, async () => Insight.findOne({ slug }).lean());
  if (!found) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const item = toContentItem(found);
  logAdminContent("get_by_slug_success", {
    endpoint: "/api/admin/content/by-slug/:slug",
    method: request.method,
    userId: adminContext.userId,
    isAdmin: adminContext.isAdmin,
    contentId: item.id,
    slug: item.slug,
  });

  return json({ ok: true, item });
}

async function handleContentPatch(path, request, env) {
  const adminContext = await authorizeAdminRequest(request, env);
  await connectDb(env);

  const existing = await findContentByAdminPath(path, env);
  if (!existing) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });
  const id = String(existing?._id || "");
  if (!id) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const body = await readJson(request);
  const { payload, title, providedSlug } = normalizeContentPayload(body, "update", existing);

  if (body.title !== undefined && !title) {
    throw createHttpError(400, "title is required.", { code: "VALIDATION_ERROR" });
  }

  if (body.slug !== undefined) {
    if (!providedSlug) {
      payload.slug = await buildUniqueContentSlug(title || existing.title || `content-${Date.now()}`, id);
    } else {
      const duplicate = await findDuplicateContentSlug(payload.slug, id);
      if (duplicate) {
        throw createHttpError(409, "slug already exists.", { code: "DUPLICATE_SLUG" });
      }
    }
  }

  const nextRevision = Math.max(1, Number(existing?.revision || 1) || 1) + 1;
  const revisionSnapshot = buildContentRevisionSnapshot(existing, adminContext, "before_update");
  const updateResult = await Insight.updateOne(
    { _id: id },
    {
      $set: {
        ...payload,
        revision: nextRevision,
      },
      $push: {
        revisionHistory: {
          $each: [revisionSnapshot],
          $slice: -20,
        },
      },
    },
  );
  if (!Number(updateResult.matchedCount || 0)) {
    throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });
  }

  const updated = await Insight.findById(id).lean();
  const item = toContentItem(updated);
  await purgeInsightPublicCache([existing.slug, item.slug]);

  logAdminContent("patch_success", {
    endpoint: "/api/admin/content/:id",
    method: request.method,
    userId: adminContext.userId,
    isAdmin: adminContext.isAdmin,
    contentId: item.id,
    slug: item.slug,
    matchedCount: Number(updateResult.matchedCount || 0),
    modifiedCount: Number(updateResult.modifiedCount || 0),
  });

  return json({
    ok: true,
    item,
    db: {
      matchedCount: Number(updateResult.matchedCount || 0),
      modifiedCount: Number(updateResult.modifiedCount || 0),
    },
  });
}

async function handleContentDelete(path, request, env) {
  const adminContext = await authorizeAdminRequest(request, env);
  await connectDb(env);

  const existing = await findContentByAdminPath(path, env);
  const id = String(existing?._id || "");
  if (!existing || !id) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const updateResult = await Insight.updateOne(
    { _id: id },
    {
      $set: {
        status: "archived",
        isPublished: false,
      },
    },
  );

  if (!Number(updateResult.matchedCount || 0)) {
    throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });
  }

  const updated = await Insight.findById(id).lean();
  const item = toContentItem(updated);
  await purgeInsightPublicCache([existing.slug, item.slug]);

  logAdminContent("delete_soft_success", {
    endpoint: "/api/admin/content/:id",
    method: request.method,
    userId: adminContext.userId,
    isAdmin: adminContext.isAdmin,
    contentId: item.id,
    slug: item.slug,
    matchedCount: Number(updateResult.matchedCount || 0),
    modifiedCount: Number(updateResult.modifiedCount || 0),
  });

  return json({
    ok: true,
    item,
    db: {
      matchedCount: Number(updateResult.matchedCount || 0),
      modifiedCount: Number(updateResult.modifiedCount || 0),
    },
  });
}

function findContentRevision(item, body = {}) {
  const history = Array.isArray(item?.revisionHistory) ? item.revisionHistory : [];
  const revisionId = String(body?.revisionId || "").trim();
  const revisionNumber = Number(body?.revision || 0);
  if (revisionId) return history.find((entry) => String(entry?.id || "") === revisionId) || null;
  if (Number.isFinite(revisionNumber) && revisionNumber > 0) {
    return history.find((entry) => Number(entry?.revision || 0) === revisionNumber) || null;
  }
  return history[history.length - 1] || null;
}

function buildRestorePayloadFromRevision(revision) {
  return {
    title: String(revision?.title || ""),
    slug: slugify(revision?.slug || revision?.title || ""),
    summary: String(revision?.summary || ""),
    subtitle: String(revision?.subtitle || ""),
    excerpt: String(revision?.excerpt || ""),
    content: String(revision?.content || revision?.contentHtml || ""),
    contentFormat: normalizeContentFormat(revision?.contentFormat, "html"),
    contentHtml: sanitizeInsightHtml(String(revision?.contentHtml || revision?.content || "")),
    contentJson: isObjectLike(revision?.contentJson) ? revision.contentJson : {},
    category: String(revision?.category || ""),
    tags: Array.isArray(revision?.tags) ? revision.tags.slice(0, 80) : [],
    status: normalizeContentStatus(revision?.status, "draft"),
    seo: isObjectLike(revision?.seo) ? revision.seo : {},
    metaTitle: String(revision?.metaTitle || ""),
    metaDescription: String(revision?.metaDescription || ""),
    keywords: Array.isArray(revision?.keywords) ? revision.keywords.slice(0, 80) : [],
    canonicalUrl: String(revision?.canonicalUrl || ""),
    ogTitle: String(revision?.ogTitle || ""),
    ogDescription: String(revision?.ogDescription || ""),
    ogImage: String(revision?.ogImage || ""),
    twitterTitle: String(revision?.twitterTitle || ""),
    twitterDescription: String(revision?.twitterDescription || ""),
    twitterImage: String(revision?.twitterImage || ""),
    featuredImage: isObjectLike(revision?.featuredImage) ? revision.featuredImage : {},
    thumbnailUrl: String(revision?.thumbnailUrl || revision?.featuredImage?.url || ""),
    isFeatured: Boolean(revision?.isFeatured),
    noIndex: Boolean(revision?.noIndex),
    isPublished: normalizeContentStatus(revision?.status, "draft") === CONTENT_PUBLIC_STATUS,
    publishedAt: revision?.publishedAt || null,
  };
}

async function handleContentRevisions(path, request, env) {
  const adminContext = await authorizeAdminRequest(request, env);
  await connectDb(env);

  const id = await resolveAdminContentId(path.replace(/\/revisions$/i, ""), env);
  if (!id) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const found = await adminMongoRead(env, async () => Insight.findById(id).lean());
  if (!found) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const revisions = (Array.isArray(found.revisionHistory) ? found.revisionHistory : [])
    .slice()
    .reverse()
    .map((entry) => ({
      id: String(entry?.id || ""),
      revision: Math.max(1, Number(entry?.revision || 1) || 1),
      reason: String(entry?.reason || ""),
      savedAt: entry?.savedAt || null,
      savedBy: String(entry?.savedBy || ""),
      title: String(entry?.title || ""),
      status: String(entry?.status || "draft"),
    }));

  logAdminContent("revisions_list", {
    endpoint: "/api/admin/content/:id/revisions",
    method: request.method,
    userId: adminContext.userId,
    isAdmin: adminContext.isAdmin,
    contentId: id,
    count: revisions.length,
  });

  return json({
    ok: true,
    currentRevision: Math.max(1, Number(found?.revision || 1) || 1),
    revisions,
  });
}

async function handleContentRestore(path, request, env) {
  const adminContext = await authorizeAdminRequest(request, env);
  await connectDb(env);

  const id = await resolveAdminContentId(path.replace(/\/restore$/i, ""), env);
  if (!id) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const existing = await Insight.findById(id).lean();
  if (!existing) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const body = await readJson(request);
  const targetRevision = findContentRevision(existing, body);
  if (!targetRevision) throw createHttpError(404, "revision not found.", { code: "REVISION_NOT_FOUND" });

  const currentSnapshot = buildContentRevisionSnapshot(existing, adminContext, "before_restore");
  const nextRevision = Math.max(1, Number(existing?.revision || 1) || 1) + 1;
  const restorePayload = buildRestorePayloadFromRevision(targetRevision);

  const duplicate = restorePayload.slug
    ? await findDuplicateContentSlug(restorePayload.slug, id)
    : null;
  if (duplicate) {
    restorePayload.slug = await buildUniqueContentSlug(restorePayload.slug || restorePayload.title || `content-${Date.now()}`, id);
  }

  await Insight.updateOne(
    { _id: id },
    {
      $set: {
        ...restorePayload,
        revision: nextRevision,
      },
      $push: {
        revisionHistory: {
          $each: [currentSnapshot],
          $slice: -20,
        },
      },
    },
  );

  const updated = await Insight.findById(id).lean();
  const item = toContentItem(updated);
  await purgeInsightPublicCache([existing.slug, item.slug]);

  logAdminContent("restore_success", {
    endpoint: "/api/admin/content/:id/restore",
    method: request.method,
    userId: adminContext.userId,
    isAdmin: adminContext.isAdmin,
    contentId: id,
    restoredRevision: Number(targetRevision?.revision || 0),
  });

  return json({ ok: true, item, restoredRevision: targetRevision });
}

function resolvePublicOrigin(request, env) {
  const configured = firstRuntimeValue(env, [
    "SITE_BASE_URL",
    "AUTH_FRONTEND_BASE_URL",
    "PUBLIC_SITE_URL",
    "NEXT_PUBLIC_SITE_URL",
    "SITE_URL",
    "APP_URL",
    "BASE_URL",
  ]);
  if (configured) return configured.replace(/\/+$/, "");
  return new URL(request.url).origin.replace(/\/+$/, "");
}

function buildContentPublicUrls(request, env, item) {
  const origin = resolvePublicOrigin(request, env);
  const slug = String(item?.slug || "").trim();
  if (!slug) return { origin, pageUrl: "", apiUrl: "" };
  const encodedSlug = encodeURIComponent(slug);
  return {
    origin,
    pageUrl: `${origin}/insights/${encodedSlug}`,
    apiUrl: `${origin}/api/content/${encodedSlug}`,
  };
}

async function fetchContentUrlStatus(url, timeoutMs = 4500) {
  if (!url) return { ok: false, status: 0, checked: false, error: "missing_url" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Cache-Control": "no-cache" },
      signal: controller.signal,
    });
    return {
      ok: response.ok,
      status: response.status,
      checked: true,
      error: "",
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      checked: true,
      error: String(error?.message || error || "fetch_failed").slice(0, 180),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchContentUrlTextStatus(url, timeoutMs = 4500) {
  if (!url) return { ok: false, status: 0, checked: false, error: "missing_url", text: "" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Cache-Control": "no-cache" },
      signal: controller.signal,
    });
    const text = await response.text().catch(() => "");
    return {
      ok: response.ok,
      status: response.status,
      checked: true,
      error: "",
      text: text.slice(0, 350000),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      checked: true,
      error: String(error?.message || error || "fetch_failed").slice(0, 180),
      text: "",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchContentFeedHeaderStatus(url, timeoutMs = 3500) {
  if (!url) return { ok: false, status: 0, checked: false, merged: false, error: "missing_url" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: { "Cache-Control": "no-cache" },
      signal: controller.signal,
    });
    return {
      ok: response.ok,
      status: response.status,
      checked: true,
      merged: response.headers.get("X-Code-Destiny-Feed") === "merged",
      error: "",
      url,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      checked: true,
      merged: false,
      error: String(error?.message || error || "fetch_failed").slice(0, 180),
      url,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function extractHtmlTagContent(html, pattern) {
  const matched = String(html || "").match(pattern);
  return String(matched?.[1] || "").trim();
}

function buildPageMetaCheck(html, expectedUrl, item) {
  const title = extractHtmlTagContent(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = extractHtmlTagContent(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i)
    || extractHtmlTagContent(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i);
  const canonical = extractHtmlTagContent(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["'][^>]*>/i)
    || extractHtmlTagContent(html, /<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["'][^>]*>/i);
  const ogTitle = extractHtmlTagContent(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["'][^>]*>/i)
    || extractHtmlTagContent(html, /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["'][^>]*>/i);
  const ogImage = extractHtmlTagContent(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["'][^>]*>/i)
    || extractHtmlTagContent(html, /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:image["'][^>]*>/i);
  const robots = extractHtmlTagContent(html, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["'][^>]*>/i)
    || extractHtmlTagContent(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']robots["'][^>]*>/i);
  const expectedTitle = String(item?.seo?.metaTitle || item?.metaTitle || item?.title || "").trim();
  const expectedDescription = String(item?.seo?.metaDescription || item?.metaDescription || item?.summary || item?.excerpt || "").trim();

  return {
    hasTitle: Boolean(title),
    hasDescription: Boolean(description),
    hasCanonical: Boolean(canonical),
    canonicalMatches: canonical ? canonical.replace(/\/+$/, "") === String(expectedUrl || "").replace(/\/+$/, "") : false,
    hasOgTitle: Boolean(ogTitle),
    hasOgImage: Boolean(ogImage),
    noIndex: /noindex/i.test(robots),
    titleMatches: expectedTitle ? title.includes(expectedTitle.slice(0, 80)) : Boolean(title),
    descriptionMatches: expectedDescription ? description.includes(expectedDescription.slice(0, 80)) : Boolean(description),
    title: title.slice(0, 180),
    description: description.slice(0, 220),
    canonical: canonical.slice(0, 400),
    ogImage: ogImage.slice(0, 400),
    robots: robots.slice(0, 120),
  };
}

async function buildFeedCoverageCheck(origin, slug) {
  const encodedSlug = encodeURIComponent(String(slug || ""));
  const targets = [
    { key: "sitemap", url: `${origin}/sitemap.xml` },
    { key: "rss", url: `${origin}/rss.xml` },
    { key: "insightsRss", url: `${origin}/insights/rss.xml` },
  ];
  const results = {};
  for (const target of targets) {
    const status = await fetchContentUrlTextStatus(target.url, 3500);
    results[target.key] = {
      ok: status.ok,
      status: status.status,
      containsSlug: Boolean(status.text && (status.text.includes(`/insights/${encodedSlug}`) || status.text.includes(`/insights/${slug}`))),
      error: status.error || "",
      url: target.url,
    };
  }
  return results;
}

async function buildContentPublicationStatus(request, env, item) {
  const urls = buildContentPublicUrls(request, env, item);
  const status = String(item?.status || "").toLowerCase();
  const publishedAtMs = new Date(item?.publishedAt || 0).getTime();
  const isScheduledReady = status === "scheduled" && Number.isFinite(publishedAtMs) && publishedAtMs <= Date.now();
  const isPublished = status === CONTENT_PUBLIC_STATUS || isScheduledReady;
  const hasSlug = Boolean(String(item?.slug || "").trim());
  const dbReady = isPublished && hasSlug && Boolean(item?.publishedAt || item?.isPublished);
  const apiStatus = isPublished ? await fetchContentUrlStatus(urls.apiUrl) : { ok: false, status: 0, checked: false, error: "not_published" };
  const pageTextStatus = isPublished ? await fetchContentUrlTextStatus(urls.pageUrl) : { ok: false, status: 0, checked: false, error: "not_published", text: "" };
  const pageStatus = {
    ok: pageTextStatus.ok,
    status: pageTextStatus.status,
    checked: pageTextStatus.checked,
    error: pageTextStatus.error,
  };
  const pageMeta = pageTextStatus.ok ? buildPageMetaCheck(pageTextStatus.text, urls.pageUrl, item) : null;
  const feedCoverage = isPublished ? await buildFeedCoverageCheck(urls.origin, item?.slug) : null;

  return {
    ok: Boolean(dbReady && apiStatus.ok && pageStatus.ok && (!pageMeta || !pageMeta.noIndex)),
    dbReady,
    isPublished,
    slug: String(item?.slug || ""),
    publicUrl: urls.pageUrl,
    apiUrl: urls.apiUrl,
    apiStatus,
    pageStatus,
    pageMeta,
    feedCoverage,
    checkedAt: new Date().toISOString(),
  };
}

function resolveCloudflareZoneIdFromEnv(env) {
  return firstRuntimeValue(env, [
    "CLOUDFLARE_ZONE_ID",
    "CLOUDFLARE_ZONEID",
    "CF_ZONE_ID",
    "CF_ZONEID",
    "ZONE_ID",
    "ZONEID",
    "ZoneID",
  ]);
}

function resolveCloudflareApiToken(env) {
  return firstRuntimeValue(env, [
    "Edit_zone",
    "EDIT_ZONE",
    "EDIT_ZONE_TOKEN",
    "CLOUDFLARE_CACHE_PURGE_TOKEN",
    "CLOUDFLARE_API_TOKEN",
    "CF_API_TOKEN",
    "CLOUDFLARE_APITOKEN",
  ]);
}

function candidateZoneNamesFromUrl(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
    if (!hostname) return [];
    const parts = hostname.split(".").filter(Boolean);
    const candidates = [hostname];
    if (parts.length >= 2) candidates.push(parts.slice(-2).join("."));
    return Array.from(new Set(candidates));
  } catch (e) {
    return [];
  }
}

async function resolveCloudflareZoneId(env, sampleUrl, token) {
  const configured = resolveCloudflareZoneIdFromEnv(env);
  if (configured) return configured;

  const candidates = candidateZoneNamesFromUrl(sampleUrl);
  for (const zoneName of candidates) {
    try {
      const response = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(zoneName)}&status=active&per_page=1`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json().catch(() => ({}));
      const zoneId = String(payload?.result?.[0]?.id || "").trim();
      if (response.ok && zoneId) return zoneId;
    } catch (e) {
      continue;
    }
  }

  return "";
}

async function purgeCloudflareContentCache(env, urls = []) {
  const files = Array.from(new Set(urls.map((url) => String(url || "").trim()).filter(Boolean))).slice(0, 30);
  if (!files.length) return { ok: false, status: "skipped", reason: "missing_urls", files: [] };

  const token = resolveCloudflareApiToken(env);
  if (!token) {
    return {
      ok: false,
      status: "skipped",
      reason: "missing_api_token",
      files,
    };
  }

  const zoneId = await resolveCloudflareZoneId(env, files[0], token);
  if (!zoneId) {
    return {
      ok: false,
      status: "skipped",
      reason: "missing_zone_id",
      files,
    };
  }

  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(zoneId)}/purge_cache`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ files }),
    });
    const payload = await response.json().catch(() => ({}));
    return {
      ok: response.ok && payload?.success !== false,
      status: response.ok ? "requested" : "failed",
      httpStatus: response.status,
      files,
      errors: Array.isArray(payload?.errors) ? payload.errors.slice(0, 3) : [],
    };
  } catch (error) {
    return {
      ok: false,
      status: "failed",
      reason: String(error?.message || error || "purge_failed").slice(0, 180),
      files,
    };
  }
}

async function handleContentPublishStatus(path, request, env) {
  const adminContext = await authorizeAdminRequest(request, env);
  await connectDb(env);

  const found = await findContentByAdminPath(path.replace(/\/publish-status$/i, ""), env);
  if (!found) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });
  const id = String(found?._id || "");
  if (!id) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const item = toContentItem(found);
  const publication = await buildContentPublicationStatus(request, env, item);

  logAdminContent("publish_status", {
    endpoint: "/api/admin/content/:id/publish-status",
    method: request.method,
    userId: adminContext.userId,
    isAdmin: adminContext.isAdmin,
    contentId: item.id,
    slug: item.slug,
    ok: publication.ok,
  });

  return json({ ok: true, item, publication });
}

async function handleContentCachePurge(path, request, env) {
  const adminContext = await authorizeAdminRequest(request, env);
  await connectDb(env);

  const purgeRecord = await findContentByAdminPath(path.replace(/\/cache-purge$/i, ""), env);
  if (!purgeRecord) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });
  const id = String(purgeRecord?._id || "");
  if (!id) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const item = toContentItem(purgeRecord);

  const urls = buildContentPublicUrls(request, env, item);
  const purge = await purgeCloudflareContentCache(env, [
    urls.pageUrl,
    urls.apiUrl,
    `${urls.origin}/insights`,
    `${urls.origin}/api/content`,
    `${urls.origin}/sitemap.xml`,
    `${urls.origin}/rss.xml`,
    `${urls.origin}/insights/rss.xml`,
  ]);

  logAdminContent("cache_purge", {
    endpoint: "/api/admin/content/:id/cache-purge",
    method: request.method,
    userId: adminContext.userId,
    isAdmin: adminContext.isAdmin,
    contentId: item.id,
    slug: item.slug,
    status: purge.status,
    ok: purge.ok,
  });

  return json({ ok: true, item, purge });
}

async function handleContentDiag(request, env) {
  const adminContext = await authorizeAdminRequest(request, env);
  const dbConn = await connectDb(env);

  const collections = await adminMongoRead(env, async () => {
    const conn = await connectDb(env);
    return conn.db.listCollections({}, { nameOnly: true }).toArray();
  });
  const names = new Set(collections.map((item) => String(item?.name || "")));
  const origin = resolvePublicOrigin(request, env);
  const now = new Date();

  const [
    allContent,
    fortuneInsights,
    published,
    draft,
    scheduled,
    scheduledReady,
    archived,
    missingSlug,
    publishedMissingMetaDescription,
    publishedMissingFeaturedImage,
    publishedNoIndex,
    dynamicSitemap,
    dynamicRss,
    dynamicInsightsRss,
  ] = await adminMongoRead(env, async () => Promise.all([
    // 전체 건수는 메타데이터 읽기로 — countDocuments({}) 는 COLLSCAN 이다(근사값이라 대시보드에만 쓴다).
    Insight.estimatedDocumentCount(),
    Insight.countDocuments({
      $or: [{ type: "fortune_insight" }, { type: { $exists: false } }, { type: "" }],
    }),
    Insight.countDocuments({ status: "published" }),
    Insight.countDocuments({ status: "draft" }),
    Insight.countDocuments({ status: "scheduled" }),
    Insight.countDocuments({ status: "scheduled", publishedAt: { $lte: now } }),
    Insight.countDocuments({ status: { $in: ["archived", "private", "trash"] } }),
    Insight.countDocuments({ $or: [{ slug: "" }, { slug: { $exists: false } }] }),
    Insight.countDocuments({
      status: "published",
      $and: [
        { $or: [{ "seo.metaDescription": "" }, { "seo.metaDescription": { $exists: false } }] },
        { $or: [{ metaDescription: "" }, { metaDescription: { $exists: false } }] },
      ],
    }),
    Insight.countDocuments({
      status: "published",
      $and: [
        { $or: [{ "featuredImage.url": "" }, { "featuredImage.url": { $exists: false } }] },
        { $or: [{ thumbnailUrl: "" }, { thumbnailUrl: { $exists: false } }] },
      ],
    }),
    Insight.countDocuments({
      status: "published",
      $or: [
        { noIndex: true },
        { "seo.noIndex": true },
      ],
    }),
    fetchContentFeedHeaderStatus(`${origin}/sitemap.xml`),
    fetchContentFeedHeaderStatus(`${origin}/rss.xml`),
    fetchContentFeedHeaderStatus(`${origin}/insights/rss.xml`),
  ]));

  logAdminContent("diag_success", {
    endpoint: "/api/admin/content/diag",
    method: request.method,
    userId: adminContext.userId,
    isAdmin: adminContext.isAdmin,
    dbConnected: dbConn.readyState === 1,
  });

  return json({
    ok: true,
    dbConnected: dbConn.readyState === 1,
    collections: {
      content: names.has("insights") || names.has("Insights"),
      insights: names.has("insights") || names.has("Insights"),
    },
    adminAuth: true,
    counts: {
      allContent,
      fortuneInsights,
      published,
      draft,
      scheduled,
      scheduledReady,
      archived,
      missingSlug,
      publishedMissingMetaDescription,
      publishedMissingFeaturedImage,
      publishedNoIndex,
    },
    dynamicFeeds: {
      sitemap: dynamicSitemap,
      rss: dynamicRss,
      insightsRss: dynamicInsightsRss,
    },
  });
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

async function verifyAdminEntryPassword(rawInput, env) {
  const input = String(rawInput || "");
  if (!input) return false;

  // 시크릿이 없으면 통과시키지 않는다(fail-closed). 예전 하드코딩 폴백으로 되돌리지 말 것 —
  // 그 값은 공개 레포에 남아 있어 이미 유출된 것으로 취급해야 한다.
  const encodedHash = String(getEnv(env, ADMIN_ENTRY_PASSWORD_HASH_KEY) || "").trim();
  if (!encodedHash || isPlaceholderAdminSecret(encodedHash)) {
    // 비밀번호 실패(404)와 설정 누락을 클라이언트에서는 구분하지 않지만, 운영자가 원인을
    // 추적할 수 있도록 서버 로그에는 남긴다. 값 자체는 절대 찍지 않는다.
    console.warn(`[admin-entry] ${ADMIN_ENTRY_PASSWORD_HASH_KEY} is not configured — entry password is disabled.`);
    return false;
  }

  return verifyPassword(input, encodedHash);
}

// 검증 실패의 원인이 "비밀번호가 틀렸다"인지 "해시 설정이 잘못됐다"인지 가른다.
// 🔴 두 경우가 똑같이 404 로 나가던 동안 로그인 화면은 둘 다 "비밀번호가 올바르지 않습니다"로
//    표시했다. 스테이징 워커에는 정책상 ADMIN_ENTRY_PASSWORD_HASH 를 넣지 않는데
//    (scripts/lib/staging-secret-policy.mjs), 그래서 맞는 비밀번호를 넣어도 "틀렸다"는 말만
//    돌아왔고 원인을 화면에서 알 방법이 없었다(2026-08-30 실사고).
// 실패 경로에서만 도는 **사후 분류**이지 두 번째 게이트가 아니다 — 통과 판정은 위
// verifyAdminEntryPassword 하나가 그대로 갖는다(원칙 6 중첩 사전검사 아님).
function describeAdminEntryHashProblem(env) {
  const encodedHash = String(getEnv(env, ADMIN_ENTRY_PASSWORD_HASH_KEY) || "").trim();
  if (!encodedHash) {
    return { reason: "hash_missing", missingKeys: [ADMIN_ENTRY_PASSWORD_HASH_KEY], placeholderKeys: [] };
  }
  if (isPlaceholderAdminSecret(encodedHash)) {
    return { reason: "hash_placeholder", missingKeys: [], placeholderKeys: [ADMIN_ENTRY_PASSWORD_HASH_KEY] };
  }

  // PBKDF2 반복수가 Workers 상한을 넘으면 crypto.subtle.deriveBits 가 throw 하고,
  // verifyPassword 는 그 예외를 삼켜 false 를 돌려준다 — 비밀번호 오류와 구분이 안 된다.
  // Node 에서 돌린 스크립트로 만든 해시는 상한이 없어 600,000 짜리가 나올 수 있다
  // (worker/lib/password.js 의 PBKDF2_MAX_ITERATIONS 주석 · scripts/audit-legacy-pbkdf2-hashes.mjs).
  const parts = encodedHash.split("$");
  let iterationsRaw = "";
  if (parts[0] === "pbkdf2-sha256") iterationsRaw = parts[1];
  else if (`${parts[0]}$${parts[1]}` === "pbkdf2$sha256") iterationsRaw = parts[2];
  const iterations = Number(iterationsRaw);
  if (Number.isFinite(iterations) && iterations > PBKDF2_MAX_ITERATIONS) {
    // 어느 키가 비었다고는 말할 수 없으므로 목록은 비운다 — 로그인 화면은 그때
    // "관리자 키 설정이 올바르지 않습니다. Worker 비밀키를 확인해주세요."로 떨어진다.
    return { reason: "hash_iterations_over_cap", missingKeys: [], placeholderKeys: [] };
  }

  return null;
}

async function issueFlowerAdminToken(env) {
  const now = Math.floor(Date.now() / 1000);
  // jti: 발급 세션 식별자. 진입 비밀번호는 공유 자격증명이라 "누구인지"는 알 수 없지만,
  // 이것만 있어도 감사 기록에서 "어느 세션이 무엇을 바꿨는지"는 갈라낼 수 있다.
  // 예전에는 모든 관리자 행위가 'flower-admin' 한 문자열로 뭉개져 사후 추적이 불가능했다.
  const jti = bytesToHex(crypto.getRandomValues(new Uint8Array(8)));
  const payload = JSON.stringify({ v: 1, jti, issued: now, exp: now + FLOWER_TOKEN_TTL_SEC });
  const payloadB64 = base64urlEncode(payload);
  const secret = resolveFlowerAdminSecret(env);
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

// 관리자 진입은 인증 앞단이라 IP 하나로 무제한 추측이 가능했다. 이 라우트는 admin.js 안에서
// 유일하게 자격증명을 "만들어 주는" 곳이므로 무차별 대입 상한을 여기 건다.
// (원칙 6 사전검사: worker/index.js:1105 는 CORS 만 감싸고, admin.js 에는 다른 레이트리밋이 없다.)
async function enforceEntryPasswordSecurity(request, env) {
  const meta = getRequestMeta(request);
  return enforceSensitiveEndpointSecurity({
    env,
    request,
    endpoint: "admin:/entry/password",
    allowedMethods: ["POST"],
    requireJson: true,
    // 5회/10분은 실사용에서 너무 빡빡했다 — 오타 몇 번이면 관리자 본인이 잠기는데,
    // 로그인 화면은 429 를 "비밀번호가 올바르지 않습니다"로 표시해서(지금은 구분한다)
    // 잠긴 줄 모르고 계속 눌러 상한을 더 소모하는 악순환이 됐다.
    // 20회/10분이어도 무차별 대입에는 무의미한 속도이고(비밀번호 강도가 실제 방어선),
    // "상한 없음"이던 이전 상태와는 여전히 질적으로 다르다.
    rateLimit: { limit: 20, windowSeconds: 10 * 60 },
    rateLimitKey: `${meta.ip || "unknown"}:admin-entry-password`,
  });
}

async function handleEntryPassword(request, env) {
  const security = await enforceEntryPasswordSecurity(request, env);
  if (!security.ok) return security.response;

  const body = await readJson(request);
  const password = String(body?.password || "");
  if (!await verifyAdminEntryPassword(password, env)) {
    const configProblem = describeAdminEntryHashProblem(env);
    // 관리자 진입은 공유 비밀번호 하나가 전부라, 실패 시도가 가장 가치 높은 감사 기록이다.
    await writeAdminAuditLog(request, env, {
      actorLabel: "",
      actorUserId: null,
      mode: "anonymous",
      outcome: "denied",
      meta: { reason: configProblem?.reason || "bad_password" },
    });
    if (configProblem) {
      // 설정 오류는 감추지 않는다. 감춰 봐야 못 들어오는 건 관리자뿐이고, 공격자는
      // "문이 잠겨 있다"는 것 말고는 아무것도 얻지 못한다(비밀번호 오답은 그대로 404 다).
      // 이 응답 형태는 app/admin/login/page.tsx 가 이미 해석한다.
      return json(buildConfigErrorBody("adminEntry", {
        impact: "관리자 진입 비밀번호",
        requiredKeys: [ADMIN_ENTRY_PASSWORD_HASH_KEY],
        missingKeys: configProblem.missingKeys,
        placeholderKeys: configProblem.placeholderKeys,
      }), { status: 503 });
    }
    return json({ message: "Not found" }, { status: 404 });
  }

  const adminToken = await issueFlowerAdminToken(env);
  await writeAdminAuditLog(request, env, {
    actorLabel: "flower-admin",
    actorUserId: null,
    mode: "anonymous",
    outcome: "granted",
    meta: { reason: "entry_password_ok" },
  });

  const expectedHash = getEnv(env, "ADMIN_SECRET_HASH");
  const response = json({
    ok: true,
    adminToken,
    nextUrl: expectedHash ? `/${expectedHash}/login` : "/admin",
  }, { status: 200 });

  setFlowerAdminCookie(response, adminToken, request);
  return response;
}

// 이 매트릭스는 기능별로 어떤 키가 비었는지·아직 placeholder 인지를 그대로 말해 준다.
// 무인증으로 열려 있으면 공격자에게 "어느 시크릿을 먼저 노려야 하는지"를 알려주는 것과 같아
// 나머지 관리자 핸들러와 동일하게 인가를 요구한다.
async function handleKeyHealth(request, env) {
  await authorizeAdminRequest(request, env);

  const matrix = buildRuntimeKeyMatrix(env);
  return json({
    ok: true,
    service: "code-destiny-api-worker",
    message: "Runtime key health matrix for feature diagnostics.",
    matrix,
  }, { status: 200 });
}

function hasAnyRuntimeKey(env, keys = []) {
  for (let i = 0; i < keys.length; i += 1) {
    if (String(getEnv(env, keys[i]) || "").trim()) return true;
  }
  return false;
}

async function handleAdminDiag(request, env) {
  const adminContext = await authorizeAdminRequest(request, env);
  const requestId = `adiag_${Date.now().toString(36)}`;

  const bindings = {
    DB: hasAnyRuntimeKey(env, ["MONGO_URI", "MONGODB_URI"]),
    COIN_KV: hasAnyRuntimeKey(env, ["COIN_KV", "PIG_COIN_KV", "COIN_LEDGER_KV"]),
    AUTH_SECRET: hasAnyRuntimeKey(env, ["AUTH_SECRET", "JWT_SECRET", "JWT_ACCESS_SECRET"]),
    R2: hasAnyRuntimeKey(env, ["R2", "R2_BUCKET", "CONTENT_R2", "UPLOADS_R2"]),
  };

  let dbReady = false;
  try {
    await connectDb(env);
    dbReady = true;
  } catch (e) {
    dbReady = false;
  }

  const runtime = String(
    getEnv(env, "NODE_ENV")
    || getEnv(env, "APP_ENV")
    || getEnv(env, "ENV")
    || "unknown"
  ).trim();
  const version = String(
    getEnv(env, "APP_VERSION")
    || getEnv(env, "BUILD_ID")
    || getEnv(env, "COMMIT_SHA")
    || getEnv(env, "CF_PAGES_COMMIT_SHA")
    || "unknown"
  ).trim().slice(0, 120) || "unknown";

  return json({
    ok: true,
    requestId,
    adminAuth: true,
    userId: adminContext.userId,
    version,
    runtime,
    bindings,
    services: {
      auth: bindings.AUTH_SECRET ? "ok" : "degraded",
      coin: (bindings.DB && dbReady) ? "ok" : "degraded",
      subscription: (bindings.DB && dbReady) ? "ok" : "degraded",
      destinyProfiles: (bindings.DB && dbReady) ? "ok" : "degraded",
    },
  }, { status: 200 });
}

function listGeminiKeyStatus(env) {
  const status = {
    AI: typeof env?.AI?.run === "function",
  };
  return {
    enabledCount: status.AI ? 1 : 0,
    keyStatus: status,
  };
}

async function runGeminiSmoke(env, requestId) {
  const prompt = `healthcheck:${requestId}`;
  const result = await callGeminiText(env, prompt, {
    taskType: "general",
    temperature: 0,
    maxOutputTokens: 80,
    timeoutMs: 12000,
  });

  return {
    ok: Boolean(result?.ok),
    model: String(result?.model || ""),
    message: String(result?.message || ""),
    outputLength: result?.ok ? String(result?.text || "").length : 0,
  };
}

async function handleAdminGeminiHealth(request, env) {
  const adminContext = await authorizeAdminRequest(request, env);
  const requestId = `agh_${Date.now().toString(36)}`;
  const url = new URL(request.url);
  const smoke = String(url.searchParams.get("smoke") || "") === "1";
  const keyStatus = listGeminiKeyStatus(env);
  const smokeResult = smoke ? await runGeminiSmoke(env, requestId) : null;

  return json({
    ok: true,
    requestId,
    adminAuth: true,
    userId: adminContext.userId,
    gemini: {
      ...keyStatus,
      smokeRequested: smoke,
      smokeResult,
    },
  });
}

async function handleAdminPaymentDiagnostics(request, env) {
  const adminContext = await authorizeAdminRequest(request, env);
  await connectDb(env);

  const requestId = `apd_${Date.now().toString(36)}`;
  const serverFeatureKeys = listServerPricedFeatureKeys();
  const frontendFeatureKeys = Array.from(FRONTEND_PAID_FEATURE_KEYS);
  const serverKeySet = new Set(serverFeatureKeys);

  const missingInServer = frontendFeatureKeys.filter((key) => !serverKeySet.has(key));
  const frontendSeen = new Set();
  const duplicatedInFrontend = frontendFeatureKeys.filter((key) => {
    if (frontendSeen.has(key)) return true;
    frontendSeen.add(key);
    return false;
  });

  const invalidPriceRows = Object.entries(FEATURE_KEY_PRICE_TABLE)
    .filter(([, spec]) => !Number.isFinite(Number(spec?.cost)) || Number(spec?.cost) <= 0)
    .map(([featureKey]) => featureKey)
    .sort();

  const invalidUnlockRows = Object.entries(PIG_COIN_UNLOCK_PRODUCTS)
    .filter(([, spec]) => !Number.isFinite(Number(spec?.cost)) || Number(spec?.cost) <= 0)
    .map(([productId]) => productId)
    .sort();

  const legacyUnlockBaselineMismatches = listLegacyUnlockBaselineMismatches();

  const dbOrphanRaw = await PointHistory.distinct("featureKey", {
    kind: "deduct",
    featureKey: { $nin: serverFeatureKeys },
  });

  const dbOrphanFeatureKeys = Array.from(new Set(
    (Array.isArray(dbOrphanRaw) ? dbOrphanRaw : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  )).sort();

  return json({
    ok: true,
    requestId,
    adminAuth: true,
    userId: adminContext.userId,
    diagnostics: {
      serverFeatureKeyCount: serverFeatureKeys.length,
      frontendFeatureKeyCount: frontendFeatureKeys.length,
      missingInServer,
      duplicatedInFrontend,
      invalidPriceRows,
      invalidUnlockRows,
      legacyUnlockBaselineMismatches,
      dbOrphanFeatureKeys,
      serverFeatureKeys,
      frontendFeatureKeys,
    },
  });
}

// 구 오버라이드 API. 신규 편집은 /api/admin/cms/* 로 가고 여기는 유명인 사주만 남는다
// (웹소설이 라이트 노벨로 대체되며 story/chapter 편집은 폐기 — 라이트 노벨은 CmsEntry 의 light-novel).
const CONTENT_OVERRIDE_FIELD_KEYS = {
  "famous-saju": ["shortDescription", "heroCopy", "summary", "conclusion", "seoTitle", "seoDescription"],
};
const CONTENT_OVERRIDE_STATUS_SET = new Set(["draft", "published"]);
const CONTENT_OVERRIDE_MAX_CONTENT_LENGTH = 200000;
const CONTENT_OVERRIDE_MAX_FIELD_LENGTH = 4000;

function parseSiteContentOverridePath(path) {
  const matched = String(path || "").match(/^\/site-content\/overrides\/([a-z-]+)\/([^/]+)$/i);
  if (!matched) return null;

  const source = String(matched[1] || "").toLowerCase();
  if (!CONTENT_OVERRIDE_FIELD_KEYS[source]) return null;

  let key = "";
  try {
    key = decodeURIComponent(String(matched[2] || "")).trim();
  } catch (e) {
    return null;
  }
  if (!key || key.length > 240) return null;

  return { source, key };
}

function normalizeOverrideFields(source, rawFields) {
  const allowed = CONTENT_OVERRIDE_FIELD_KEYS[source] || [];
  const fields = {};
  for (const fieldKey of allowed) {
    const value = rawFields?.[fieldKey];
    if (typeof value !== "string") continue;
    const maxLength = fieldKey === "content" ? CONTENT_OVERRIDE_MAX_CONTENT_LENGTH : CONTENT_OVERRIDE_MAX_FIELD_LENGTH;
    const normalized = value.length > maxLength ? value.slice(0, maxLength) : value;
    if (!normalized.trim()) continue;
    fields[fieldKey] = normalized;
  }
  return fields;
}

function toContentOverrideItem(doc) {
  return {
    source: String(doc?.source || ""),
    key: String(doc?.key || ""),
    fields: doc?.fields && typeof doc.fields === "object" ? doc.fields : {},
    status: String(doc?.status || "draft"),
    updatedAt: doc?.updatedAt || null,
  };
}

async function handleSiteContentOverrideList(request, env) {
  await authorizeAdminRequest(request, env);

  const sourceRaw = String(new URL(request.url).searchParams.get("source") || "").toLowerCase();
  const query = CONTENT_OVERRIDE_FIELD_KEYS[sourceRaw] ? { source: sourceRaw } : {};

  // DB 블립에도 편집 화면이 비지 않도록 캐시를 앞에 둔다. 재시도는 adminMongoRead 가 이미 하므로
  // 여기서 또 걸지 않는다 — 캐시는 "재시도까지 끝난 결과"만 담는다(코딩 원칙 6).
  const { value: items, stale, cachedAt } = await readCmsThroughCache({
    key: `site-content-overrides:${sourceRaw || "all"}`,
    ttlSeconds: 30,
    load: async () => {
      await connectDb(env);
      const docs = await adminMongoRead(env, async () =>
        ContentOverride.find(query).sort({ updatedAt: -1 }).limit(500).lean());
      return docs.map((item) => toContentOverrideItem(item));
    },
  });

  return json({ ok: true, items, stale, cachedAt: cachedAt || null });
}

async function handleSiteContentOverrideGet(path, request, env) {
  await authorizeAdminRequest(request, env);
  await connectDb(env);

  const parsed = parseSiteContentOverridePath(path);
  if (!parsed) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const doc = await adminMongoRead(env, async () =>
    ContentOverride.findOne({ source: parsed.source, key: parsed.key }).lean());

  return json({ ok: true, item: doc ? toContentOverrideItem(doc) : null });
}

/** 쓰기 직후 목록 캐시를 무효화한다. 안 하면 저장해도 최대 30초간 옛 목록이 보인다. */
function purgeSiteContentOverrideCache(source) {
  return purgeCmsCache(["site-content-overrides:all", `site-content-overrides:${source}`]);
}

async function handleSiteContentOverrideUpsert(path, request, env) {
  const adminContext = await authorizeAdminRequest(request, env);
  await connectDb(env);

  const parsed = parseSiteContentOverridePath(path);
  if (!parsed) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const body = await readJson(request);
  const fields = normalizeOverrideFields(parsed.source, body?.fields);
  if (!Object.keys(fields).length) {
    throw createHttpError(400, "수정할 필드가 없습니다.", { code: "VALIDATION_ERROR" });
  }

  const update = { fields, updatedBy: String(adminContext.userId || "flower-admin") };
  const statusRaw = String(body?.status || "").toLowerCase();
  if (statusRaw) {
    if (!CONTENT_OVERRIDE_STATUS_SET.has(statusRaw)) {
      throw createHttpError(400, "status는 draft 또는 published여야 합니다.", { code: "VALIDATION_ERROR" });
    }
    update.status = statusRaw;
  }

  const doc = await ContentOverride.findOneAndUpdate(
    { source: parsed.source, key: parsed.key },
    { $set: update },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();

  await purgeSiteContentOverrideCache(parsed.source);
  return json({ ok: true, item: toContentOverrideItem(doc) });
}

async function handleSiteContentOverridePublishStatus(path, request, env) {
  await authorizeAdminRequest(request, env);
  await connectDb(env);

  const parsed = parseSiteContentOverridePath(path.replace(/\/publish-status$/i, ""));
  if (!parsed) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const body = await readJson(request);
  const statusRaw = String(body?.status || "").toLowerCase();
  if (!CONTENT_OVERRIDE_STATUS_SET.has(statusRaw)) {
    throw createHttpError(400, "status는 draft 또는 published여야 합니다.", { code: "VALIDATION_ERROR" });
  }

  const doc = await ContentOverride.findOneAndUpdate(
    { source: parsed.source, key: parsed.key },
    { $set: { status: statusRaw } },
    { new: true },
  ).lean();
  if (!doc) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  await purgeSiteContentOverrideCache(parsed.source);
  return json({ ok: true, item: toContentOverrideItem(doc) });
}

async function handleSiteContentOverrideDelete(path, request, env) {
  await authorizeAdminRequest(request, env);
  await connectDb(env);

  const parsed = parseSiteContentOverridePath(path);
  if (!parsed) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const doc = await ContentOverride.findOneAndDelete({ source: parsed.source, key: parsed.key }).lean();
  if (!doc) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  await purgeSiteContentOverrideCache(parsed.source);
  return json({ ok: true, item: toContentOverrideItem(doc) });
}

// ─────────────────────────────────────────────────────────────────────────────
// 리뷰 관리 (검수 · 수정 · 시딩)
// ─────────────────────────────────────────────────────────────────────────────

const REVIEW_ADMIN_LIST_LIMIT = 50;
const REVIEW_BULK_MAX = 100;
const REVIEW_STATUS_SET = new Set(REVIEW_STATUS_LIST);
const REVIEW_LOCALE_SET = new Set(["ko", "ja", "zh", "en"]);

function reviewText(value) {
  return String(value || "").trim();
}

// 관리자 화면에는 내부 필드(createdByAdmin·플래그·검수 메모)를 모두 노출한다.
function toAdminReviewItem(doc) {
  return {
    id: String(doc?._id || ""),
    userId: reviewText(doc?.userId),
    authorName: reviewText(doc?.authorName),
    authorImage: reviewText(doc?.authorImage),
    productId: reviewText(doc?.productId),
    productName: reviewText(doc?.productName),
    featureKey: reviewText(doc?.featureKey),
    orderId: reviewText(doc?.orderId),
    rating: Number(doc?.rating || 0),
    title: reviewText(doc?.title),
    body: reviewText(doc?.body),
    locale: reviewText(doc?.locale) || "ko",
    status: reviewText(doc?.status),
    isVerifiedPurchase: Boolean(doc?.isVerifiedPurchase),
    usageSource: reviewText(doc?.usageSource),
    createdByAdmin: Boolean(doc?.createdByAdmin),
    autoFlagReasons: Array.isArray(doc?.autoFlagReasons) ? doc.autoFlagReasons : [],
    aiReviewScore: doc?.aiReviewScore ?? null,
    aiFlagReason: reviewText(doc?.aiFlagReason),
    adminNote: reviewText(doc?.adminNote),
    reviewedBy: reviewText(doc?.reviewedBy),
    reviewReward: {
      granted: Boolean(doc?.reviewReward?.granted),
      amount: Math.max(0, Math.floor(Number(doc?.reviewReward?.amount || 0))),
      grantedAt: doc?.reviewReward?.grantedAt || null,
    },
    approvedAt: doc?.approvedAt || null,
    displayedAt: doc?.displayedAt || null,
    createdAt: doc?.createdAt || null,
    updatedAt: doc?.updatedAt || null,
  };
}

function parseReviewIdFromPath(path, suffix = "") {
  const pattern = suffix
    ? new RegExp(`^/reviews/([a-f0-9]{24})${suffix}$`, "i")
    : /^\/reviews\/([a-f0-9]{24})$/i;
  const matched = String(path || "").match(pattern);
  return matched ? matched[1] : "";
}

function parseReviewDate(value, fallback = null) {
  const text = reviewText(value);
  if (!text) return fallback;
  const parsed = new Date(text);
  return Number.isFinite(parsed.getTime()) ? parsed : fallback;
}

function normalizeAdminReviewRating(value) {
  const rating = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw createHttpError(400, "별점은 1~5 사이여야 합니다.", { code: "VALIDATION_ERROR" });
  }
  return rating;
}

// 관리자 시딩 리뷰 1건을 저장 가능한 문서로 변환한다.
// 🔴 isVerifiedPurchase는 클라이언트 입력을 받지 않는다 — 관리자 작성 리뷰는 실제 구매 기록에
// 대한 사실 진술이 될 수 없으므로 항상 false다(허위 구매 인증 표시 방지).
async function buildAdminSeedReviewDoc(entry, env) {
  const product = getReviewProduct(entry?.productId);
  if (!product) {
    throw createHttpError(400, "존재하지 않는 상품입니다.", { code: "UNKNOWN_PRODUCT" });
  }

  const body = reviewText(entry?.body);
  if (!body) throw createHttpError(400, "리뷰 내용을 입력해 주세요.", { code: "VALIDATION_ERROR" });

  const userId = reviewText(entry?.userId);
  let authorName = reviewText(entry?.authorName);
  let authorImage = reviewText(entry?.authorImage);

  if (userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw createHttpError(400, "사용자 ID 형식이 올바르지 않습니다.", { code: "VALIDATION_ERROR" });
    }
    const userDoc = await adminMongoRead(env, async () =>
      User.findById(userId).select("name profileImage").lean()).catch(() => null);
    if (!userDoc) throw createHttpError(404, "해당 사용자를 찾을 수 없습니다.", { code: "USER_NOT_FOUND" });
    if (!authorName) authorName = reviewText(userDoc?.name);
    if (!authorImage) authorImage = reviewText(userDoc?.profileImage);
  }

  if (!authorName) {
    throw createHttpError(400, "사용자 ID 또는 닉네임 중 하나는 입력해야 합니다.", { code: "VALIDATION_ERROR" });
  }

  const statusRaw = reviewText(entry?.status).toLowerCase();
  const status = REVIEW_STATUS_SET.has(statusRaw) ? statusRaw : REVIEW_STATUSES.PENDING;
  const localeRaw = reviewText(entry?.locale).toLowerCase();
  const title = reviewText(entry?.title).slice(0, REVIEW_TITLE_MAX_LENGTH);
  const screening = screenReviewText({ title, body, isVerifiedPurchase: false });

  return {
    userId,
    authorName: authorName.slice(0, 40),
    authorImage: authorImage.slice(0, 500),
    productId: product.productId,
    productName: product.name,
    featureKey: reviewText(entry?.featureKey).slice(0, 120),
    orderId: "",
    rating: normalizeAdminReviewRating(entry?.rating),
    title,
    body: body.slice(0, REVIEW_BODY_MAX_LENGTH),
    locale: REVIEW_LOCALE_SET.has(localeRaw) ? localeRaw : "ko",
    status,
    isVerifiedPurchase: false,
    createdByAdmin: true,
    autoFlagReasons: screening.flags,
    adminNote: reviewText(entry?.adminNote).slice(0, 500),
    approvedAt: status === REVIEW_STATUSES.APPROVED ? new Date() : null,
    displayedAt: parseReviewDate(entry?.displayedAt, new Date()),
  };
}

async function handleAdminReviewList(request, env) {
  await authorizeAdminRequest(request, env);
  await connectDb(env);

  const params = new URL(request.url).searchParams;
  const statusRaw = reviewText(params.get("status")).toLowerCase();
  const productId = reviewText(params.get("productId"));
  const flaggedOnly = ["1", "true", "yes"].includes(reviewText(params.get("flagged")).toLowerCase());
  const createdByAdminRaw = reviewText(params.get("createdByAdmin")).toLowerCase();
  const page = Math.max(1, Number.parseInt(reviewText(params.get("page")) || "1", 10) || 1);

  const query = {};
  if (REVIEW_STATUS_SET.has(statusRaw)) query.status = statusRaw;
  if (productId && getReviewProduct(productId)) query.productId = productId;
  if (flaggedOnly) query["autoFlagReasons.0"] = { $exists: true };
  if (createdByAdminRaw === "true") query.createdByAdmin = true;
  if (createdByAdminRaw === "false") query.createdByAdmin = false;

  const [items, total, statusCounts] = await Promise.all([
    adminMongoRead(env, async () => Review.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * REVIEW_ADMIN_LIST_LIMIT)
      .limit(REVIEW_ADMIN_LIST_LIMIT)
      .lean()),
    adminMongoRead(env, async () => Review.countDocuments(query)),
    adminMongoRead(env, async () => Review.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ])).catch(() => []),
  ]);

  const counts = { pending: 0, approved: 0, rejected: 0, hidden: 0 };
  for (const row of Array.isArray(statusCounts) ? statusCounts : []) {
    const key = reviewText(row?._id);
    if (key in counts) counts[key] = Number(row?.count || 0);
  }

  return json({
    ok: true,
    items: (Array.isArray(items) ? items : []).map(toAdminReviewItem),
    counts,
    pagination: {
      page,
      limit: REVIEW_ADMIN_LIST_LIMIT,
      total,
      totalPages: Math.max(1, Math.ceil(total / REVIEW_ADMIN_LIST_LIMIT)),
    },
  });
}

async function handleAdminReviewCreate(request, env) {
  await authorizeAdminRequest(request, env);
  await connectDb(env);

  const body = await readJson(request);
  const doc = await Review.create(await buildAdminSeedReviewDoc(body, env));
  return json({ ok: true, item: toAdminReviewItem(doc) }, { status: 201 });
}

async function handleAdminReviewBulkCreate(request, env) {
  await authorizeAdminRequest(request, env);
  await connectDb(env);

  const body = await readJson(request);
  const entries = Array.isArray(body?.items) ? body.items : [];
  if (!entries.length) {
    throw createHttpError(400, "생성할 리뷰가 없습니다.", { code: "VALIDATION_ERROR" });
  }
  if (entries.length > REVIEW_BULK_MAX) {
    throw createHttpError(400, `한 번에 최대 ${REVIEW_BULK_MAX}건까지 생성할 수 있습니다.`, { code: "VALIDATION_ERROR" });
  }

  const docs = [];
  const errors = [];
  for (let index = 0; index < entries.length; index += 1) {
    try {
      docs.push(await buildAdminSeedReviewDoc(entries[index], env));
    } catch (error) {
      errors.push({ index, message: String(error?.message || "알 수 없는 오류") });
    }
  }

  if (!docs.length) {
    throw createHttpError(400, "저장 가능한 리뷰가 없습니다.", { code: "VALIDATION_ERROR", errors });
  }

  const created = await Review.insertMany(docs, { ordered: false });
  return json({
    ok: true,
    createdCount: created.length,
    skippedCount: errors.length,
    errors,
  }, { status: 201 });
}

async function handleAdminReviewPatch(path, request, env) {
  const adminContext = await authorizeAdminRequest(request, env);
  await connectDb(env);

  const id = parseReviewIdFromPath(path);
  if (!id) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const body = await readJson(request);
  const update = {};

  if (body?.rating !== undefined) update.rating = normalizeAdminReviewRating(body.rating);
  if (typeof body?.title === "string") update.title = reviewText(body.title).slice(0, REVIEW_TITLE_MAX_LENGTH);
  if (typeof body?.body === "string") {
    const nextBody = reviewText(body.body);
    if (!nextBody) throw createHttpError(400, "리뷰 내용을 입력해 주세요.", { code: "VALIDATION_ERROR" });
    update.body = nextBody.slice(0, REVIEW_BODY_MAX_LENGTH);
  }
  if (typeof body?.authorName === "string") {
    const nextName = reviewText(body.authorName);
    if (!nextName) throw createHttpError(400, "닉네임을 입력해 주세요.", { code: "VALIDATION_ERROR" });
    update.authorName = nextName.slice(0, 40);
  }
  if (typeof body?.authorImage === "string") update.authorImage = reviewText(body.authorImage).slice(0, 500);
  if (typeof body?.adminNote === "string") update.adminNote = reviewText(body.adminNote).slice(0, 500);
  if (body?.displayedAt !== undefined) {
    const displayedAt = parseReviewDate(body.displayedAt);
    if (!displayedAt) throw createHttpError(400, "작성 날짜 형식이 올바르지 않습니다.", { code: "VALIDATION_ERROR" });
    update.displayedAt = displayedAt;
  }
  if (typeof body?.productId === "string") {
    const product = getReviewProduct(body.productId);
    if (!product) throw createHttpError(400, "존재하지 않는 상품입니다.", { code: "UNKNOWN_PRODUCT" });
    update.productId = product.productId;
    update.productName = product.name;
  }
  if (typeof body?.locale === "string") {
    const localeRaw = reviewText(body.locale).toLowerCase();
    if (!REVIEW_LOCALE_SET.has(localeRaw)) {
      throw createHttpError(400, "지원하지 않는 언어입니다.", { code: "VALIDATION_ERROR" });
    }
    update.locale = localeRaw;
  }

  if (!Object.keys(update).length) {
    throw createHttpError(400, "수정할 필드가 없습니다.", { code: "VALIDATION_ERROR" });
  }

  // 내용이 바뀌면 자동 필터를 다시 돌린다.
  if (update.body !== undefined || update.title !== undefined) {
    const current = await adminMongoRead(env, async () =>
      Review.findById(id).select("title body isVerifiedPurchase").lean());
    if (!current) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });
    const screening = screenReviewText({
      title: update.title ?? current.title,
      body: update.body ?? current.body,
      isVerifiedPurchase: Boolean(current.isVerifiedPurchase),
    });
    update.autoFlagReasons = screening.flags;
  }

  update.reviewedBy = String(adminContext.userId || "flower-admin");

  const doc = await Review.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
  if (!doc) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  return json({ ok: true, item: toAdminReviewItem(doc) });
}

async function handleAdminReviewStatus(path, request, env) {
  const adminContext = await authorizeAdminRequest(request, env);
  await connectDb(env);

  const id = parseReviewIdFromPath(path, "/status");
  if (!id) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const body = await readJson(request);
  const statusRaw = reviewText(body?.status).toLowerCase();
  if (!REVIEW_STATUS_SET.has(statusRaw)) {
    throw createHttpError(400, `status는 ${REVIEW_STATUS_LIST.join(" / ")} 중 하나여야 합니다.`, { code: "VALIDATION_ERROR" });
  }

  const update = {
    status: statusRaw,
    reviewedBy: String(adminContext.userId || "flower-admin"),
    approvedAt: statusRaw === REVIEW_STATUSES.APPROVED ? new Date() : null,
  };
  if (typeof body?.adminNote === "string") update.adminNote = reviewText(body.adminNote).slice(0, 500);

  const doc = await Review.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
  if (!doc) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  // 승인 전환이 곧 후기 보상 지급 시점이다. 반려·숨김은 지급하지 않고, 이미 지급된 건을
  // 되돌리지도 않는다(월정석은 지급 후 30일 만료로 자연 소멸하고, 회수 배관은 만들지 않는다).
  // 🔴 지급 실패가 승인을 막으면 후기가 영영 공개되지 않으므로, 실패는 응답에 실어 화면에만 알린다.
  if (statusRaw !== REVIEW_STATUSES.APPROVED) {
    return json({ ok: true, item: toAdminReviewItem(doc) });
  }

  const reward = await grantReviewApprovalReward({
    reviewDoc: doc,
    actorId: update.reviewedBy,
    env,
  });

  return json({
    ok: true,
    item: toAdminReviewItem(reward.granted
      ? {
        ...doc,
        reviewReward: {
          granted: true,
          amount: reward.amount || REVIEW_REWARD_AMOUNT,
          grantedAt: doc?.reviewReward?.grantedAt || new Date(),
        },
      }
      : doc),
    reward,
  });
}

async function handleAdminReviewDelete(path, request, env) {
  await authorizeAdminRequest(request, env);
  await connectDb(env);

  const id = parseReviewIdFromPath(path);
  if (!id) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const doc = await Review.findByIdAndDelete(id).lean();
  if (!doc) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  return json({ ok: true, item: toAdminReviewItem(doc) });
}

async function handleSiteDeploy(request, env) {
  await authorizeAdminRequest(request, env);

  const token = String(getEnv(env, "GITHUB_DEPLOY_TOKEN") || "").trim();
  if (!token) {
    throw createHttpError(503, "GITHUB_DEPLOY_TOKEN이 설정되지 않아 사이트 반영을 트리거할 수 없습니다.", { code: "DEPLOY_TOKEN_MISSING" });
  }

  const repo = String(getEnv(env, "GITHUB_DEPLOY_REPO") || "").trim() || "rei1237/codedestiny";
  const workflow = "cloudflare-pages-deploy.yml";

  let response;
  try {
    response = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
        "content-type": "application/json",
        "user-agent": "code-destiny-worker",
        "x-github-api-version": "2022-11-28",
      },
      body: JSON.stringify({ ref: "main" }),
    });
  } catch (e) {
    throw createHttpError(502, "GitHub 배포 트리거 요청에 실패했습니다.", { code: "DEPLOY_DISPATCH_FAILED" });
  }

  if (response.status !== 204) {
    throw createHttpError(502, `GitHub 배포 트리거가 거부되었습니다. (status ${response.status})`, { code: "DEPLOY_DISPATCH_FAILED" });
  }

  return json({ ok: true, repo, workflow, triggeredAt: new Date().toISOString() });
}

export async function handleAdminRoutes(request, env) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/admin");

    if (method === "POST" && path === "/entry/password") {
      return await handleEntryPassword(request, env);
    }

    if (method === "GET" && path === "/keys") {
      return await handleKeyHealth(request, env);
    }

    if (method === "GET" && path === "/diag") {
      return await handleAdminDiag(request, env);
    }

    if (method === "GET" && path === "/gemini-health") {
      return await handleAdminGeminiHealth(request, env);
    }

    if (method === "GET" && path === "/payment-diagnostics") {
      return await handleAdminPaymentDiagnostics(request, env);
    }

    if (path === "/prompt-lab/generate") {
      if (method === "POST") return await handleAdminPromptLabGenerate(request, env);
      return methodNotAllowed();
    }

    if (path === "/prompt-lab/geocode") {
      if (method === "GET") return await handleAdminPromptLabGeocode(request, env);
      return methodNotAllowed();
    }

    if (path === "/site-deploy") {
      if (method === "POST") return await handleSiteDeploy(request, env);
      return methodNotAllowed();
    }

    // 통합 CMS. 인증은 여기서 끝내고 핸들러만 별도 청크(routes/cms.js)로 위임한다 —
    // admin.js 는 이미 4천 줄이 넘고, CMS 는 공개 라우트와 코드를 공유해야 한다.
    if (path === "/cms" || path.startsWith("/cms/")) {
      const adminContext = await authorizeAdminRequest(request, env);
      const { handleAdminCmsRoutes } = await import("./cms.js");
      return await handleAdminCmsRoutes(path.slice("/cms".length) || "/", request, env, adminContext);
    }

    // 주문 조회·환불. /api/payments 는 flower-admin 토큰을 인증하지 못하므로(auth.js 의
    // PAID_SERVICE_ADMIN_AUTH_PATHS 미포함) 관리자 네임스페이스 안에 따로 둔다.
    if (path === "/orders" || path.startsWith("/orders/")) {
      const adminContext = await authorizeAdminRequest(request, env);
      const { handleAdminOrderRoutes } = await import("./admin-orders.js");
      return await handleAdminOrderRoutes(path.slice("/orders".length) || "/", request, env, adminContext);
    }

    // 마케팅 월정석 지급은 관리자 인증을 거친 별도 네임스페이스에서만 허용한다.
    if (path === "/monthly-credits/grant") {
      const adminContext = await authorizeAdminRequest(request, env);
      const { handleAdminMonthlyCreditRoutes } = await import("./admin-monthly-credits.js");
      return await handleAdminMonthlyCreditRoutes("/grant", request, env, adminContext);
    }

    // 버그 제보 조회·상태변경·확인 보상(월정석) 지급.
    if (path === "/feedback" || path.startsWith("/feedback/")) {
      const adminContext = await authorizeAdminRequest(request, env);
      const { handleAdminFeedbackRoutes } = await import("./admin-feedback.js");
      return await handleAdminFeedbackRoutes(path.slice("/feedback".length) || "/", request, env, adminContext);
    }

    if (path === "/sns-daily-post" || path.startsWith("/sns-daily-post/")) {
      await authorizeAdminRequest(request, env);
      const { handleAdminSnsRoutes } = await import("./admin-sns.js");
      return await handleAdminSnsRoutes(path.slice("/sns-daily-post".length) || "/", request, env);
    }

    if (path === "/site-content/overrides") {
      if (method === "GET") return await handleSiteContentOverrideList(request, env);
      return methodNotAllowed();
    }

    if (/^\/site-content\/overrides\/[a-z-]+\/[^/]+\/publish-status$/i.test(path)) {
      if (method === "POST") return await handleSiteContentOverridePublishStatus(path, request, env);
      return methodNotAllowed();
    }

    if (/^\/site-content\/overrides\/[a-z-]+\/[^/]+$/i.test(path)) {
      if (method === "GET") return await handleSiteContentOverrideGet(path, request, env);
      if (method === "PUT") return await handleSiteContentOverrideUpsert(path, request, env);
      if (method === "DELETE") return await handleSiteContentOverrideDelete(path, request, env);
      return methodNotAllowed();
    }

    if (path === "/content") {
      if (method === "GET") return await handleContentList(request, env);
      if (method === "POST") return await handleContentCreate(request, env);
      return methodNotAllowed();
    }

    if (path === "/content/diag") {
      if (method === "GET") return await handleContentDiag(request, env);
      return methodNotAllowed();
    }

    if (/^\/content\/by-slug\/[^/]+$/i.test(path)) {
      if (method === "GET") return await handleContentGetBySlug(path, request, env);
      return methodNotAllowed();
    }

    if (/^\/content\/[^/]+\/publish-status$/i.test(path)) {
      if (method === "GET" || method === "POST") return await handleContentPublishStatus(path, request, env);
      return methodNotAllowed();
    }

    if (/^\/content\/[^/]+\/cache-purge$/i.test(path)) {
      if (method === "POST") return await handleContentCachePurge(path, request, env);
      return methodNotAllowed();
    }

    if (/^\/content\/[^/]+\/revisions$/i.test(path)) {
      if (method === "GET") return await handleContentRevisions(path, request, env);
      return methodNotAllowed();
    }

    if (/^\/content\/[^/]+\/restore$/i.test(path)) {
      if (method === "POST") return await handleContentRestore(path, request, env);
      return methodNotAllowed();
    }

    if (/^\/content\/[^/]+$/i.test(path)) {
      if (method === "GET") return await handleContentGetById(path, request, env);
      if (method === "PATCH") return await handleContentPatch(path, request, env);
      if (method === "DELETE") return await handleContentDelete(path, request, env);
      return methodNotAllowed();
    }

    if (path === "/insights") {
      if (method === "GET") return await handleInsightsList(request, env);
      if (method === "POST") return await handleInsightsCreate(request, env);
      return methodNotAllowed();
    }

    if (path === "/insights/upload-image") {
      if (method === "POST") return await handleInsightsUploadImage(request, env);
      return methodNotAllowed();
    }

    if (/^\/insights\/[a-f0-9]{24}$/i.test(path)) {
      if (method === "GET") return await handleInsightsGetById(path, request, env);
      if (method === "PUT") return await handleInsightsUpdate(path, request, env);
      if (method === "PATCH") return await handleInsightsUpdate(path, request, env);
      if (method === "DELETE") return await handleInsightsDelete(path, request, env);
      return methodNotAllowed();
    }

    if (path === "/reviews") {
      if (method === "GET") return await handleAdminReviewList(request, env);
      if (method === "POST") return await handleAdminReviewCreate(request, env);
      return methodNotAllowed();
    }

    if (path === "/reviews/bulk") {
      if (method === "POST") return await handleAdminReviewBulkCreate(request, env);
      return methodNotAllowed();
    }

    if (/^\/reviews\/[a-f0-9]{24}\/status$/i.test(path)) {
      if (method === "POST") return await handleAdminReviewStatus(path, request, env);
      return methodNotAllowed();
    }

    if (/^\/reviews\/[a-f0-9]{24}$/i.test(path)) {
      if (method === "PATCH") return await handleAdminReviewPatch(path, request, env);
      if (method === "DELETE") return await handleAdminReviewDelete(path, request, env);
      return methodNotAllowed();
    }

    if (["GET", "POST", "PATCH", "PUT", "DELETE"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    // 🔴 context 를 반드시 넘긴다. 없으면 X-Request-ID 가 "unknown" 이고 errorDetails.route 가 빈 문자열이라,
    // 관리자 503 이 떴을 때 **어느 엔드포인트의 어떤 에러인지 로그에서 특정할 수 없다**(admin-feedback.js 는
    // 처음부터 넘겼고 그쪽만 추적이 됐다). resolveErrorStage 도 trace 를 읽어야 db-op-timeout / db-op-admission
    // 을 구분한다.
    return handleRouteError(error, {
      request,
      env,
      trace: { route: "api/admin", method: request.method, requestPath: new URL(request.url).pathname },
    });
  }
}

/* 테스트 전용 노출. 글 저장 경로는 라우터를 태우려면 DB·인증 하네스가 필요한데, 여기서 지키려는
   계약(두 경로가 같은 필드를 쓴다 / isPublished 는 status 에서 파생된다 / 목록에 본문을 싣지 않는다)은
   순수 함수 수준에서 검증할 수 있다. 다른 라우트의 __*TestUtils 와 같은 관례다. */
// 🔴 검증 전용 표면. verify:lunar-conversion-core 가 음력 축을 실제로 돌린다.
export const __adminSukuyoTestUtils = { resolveAdminSukuyoStar };

export const __adminContentTestUtils = {
  normalizeContentPayload,
  toContentItem,
  CONTENT_LIST_PROJECTION,
};

/* 진입 비밀번호 실패 분류. 라우터를 태우려면 레이트리밋(Mongo) 하네스가 필요한데, 여기서
   지키려는 계약은 "설정 오류를 비밀번호 오류로 표시하지 않는다" 하나이고 순수 함수다.
   배선(handleEntryPassword 가 실제로 이걸 쓴다)은 verify:security-hardening R1e 가 본다. */
export const __adminEntryTestUtils = { describeAdminEntryHashProblem };
