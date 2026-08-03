import { createHash } from "node:crypto";
import { getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getAccessTokenSecret, getJwtAudience, getJwtIssuer, getOptionalUserFromRequest, isAuthDbInfraError, peekAccessTokenUserId } from "../lib/auth.js";
import { signJwt, verifyJwt } from "../lib/jwt.js";
import { clampSyncLlmTimeoutMs } from "../lib/sync-llm-timeout.js";
import { connectDb, isTransientMongoError, mongoose, withMongoRetry } from "../lib/db.js";
import {
  AstrologyAiConsultation,
  MonthlyCreditLedger,
  PaidExecutionRecord,
  Payment,
  PointHistory,
  User,
} from "../lib/models.js";
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { calculateMembershipCreditCost } from "../lib/billing-policy.js";
import { canAccessPaidFeature, PAID_FEATURE_ACCESS_USER_PROJECTION } from "../lib/paid-feature-access.js";
import { canUseByPass, normalizeHoneyPassEntitlement } from "../lib/profile-limits.js";
import { callGeminiText } from "../lib/gemini.js";
import { cmsPromptText } from "../lib/cms-prompts.js";
import { hasRenderableLlmText } from "../lib/llm-result-delivery.js";
import { createLlmCacheStore } from "../lib/llm-cache-store.js";
import { getSwissWesternChart } from "../lib/swiss-ephemeris.js";
import { basisGroup, basisItem, basisStage, buildAnalysisBasisPayload } from "../lib/analysis-basis-contract.js";
import { buildEvidenceRuleLines, getReasoningSectionSpec } from "../lib/fortune-reasoning-contract.js";
import {
  completeServiceExecution,
  failServiceExecution,
  startServiceExecution,
} from "../lib/service-execution-task.js";

const SERVICE_KEY = "astrology-ai";
const FEATURE_KEY = "astrology-ai-consultation";
const ACCESS_TOKEN_TYPE = "astrology-ai-access";
const ACCESS_TOKEN_TTL = "45m";
const TITLE = "점성술 전문가 상담";
const LOGIN_REQUIRED_MESSAGE = "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.";
const PAYMENT_VERIFY_FAILED_MESSAGE = "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.";
const INVALID_INPUT_MESSAGE = "생년월일, 출생시간, 출생지 정보를 다시 확인해 주세요.";
const PLACE_ERROR_MESSAGE = "출생지 정보를 확인하지 못했습니다. 도시와 국가를 다시 입력해 주세요.";
const CALCULATION_ERROR_MESSAGE = "점성술 차트 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.";
const SERVER_ERROR_MESSAGE = "상담을 준비하는 중 문제가 발생했습니다. 결제 금액은 차감되지 않았습니다.";
const LLM_ERROR_MESSAGE = "전문가 상담 답변을 생성하지 못했습니다. 이용권 또는 결제 권한은 보존되었으니 다시 시도해 주세요.";
const RESULT_NOT_FOUND_MESSAGE = "저장된 점성술 상담 결과를 찾지 못했습니다. 로그인 상태와 결과 링크를 다시 확인해 주세요.";
const ASTROLOGY_AI_MIN_RESULT_CHARS = 10000;
const ASTROLOGY_AI_MAX_RESULT_CHARS = 20000;
const ASTROLOGY_AI_MIN_FOLLOWUP_CHARS = 80;
const ASTROLOGY_AI_SANITIZE_MAX_CHARS = 70000;
const ASTROLOGY_AI_MIN_EXPERT_PARTS = 5;

const TOPICS = new Set([
  "전체 차트 해석",
  "타고난 성향",
  "인생의 방향성",
  "직업/사업운",
  "재물운",
  "연애/결혼운",
  "인간관계",
  "가족/부모운",
  "건강/멘탈",
  "올해 운세",
  "현재 트랜짓 흐름",
  "이직/창업",
  "인생 전환기",
  "현재 고민 상담",
]);

const SIGN_NAMES = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const SIGN_KO = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];
const SIGN_META = {
  Aries: { element: "fire", modality: "cardinal", ruler: "Mars" },
  Taurus: { element: "earth", modality: "fixed", ruler: "Venus" },
  Gemini: { element: "air", modality: "mutable", ruler: "Mercury" },
  Cancer: { element: "water", modality: "cardinal", ruler: "Moon" },
  Leo: { element: "fire", modality: "fixed", ruler: "Sun" },
  Virgo: { element: "earth", modality: "mutable", ruler: "Mercury" },
  Libra: { element: "air", modality: "cardinal", ruler: "Venus" },
  Scorpio: { element: "water", modality: "fixed", ruler: "Pluto" },
  Sagittarius: { element: "fire", modality: "mutable", ruler: "Jupiter" },
  Capricorn: { element: "earth", modality: "cardinal", ruler: "Saturn" },
  Aquarius: { element: "air", modality: "fixed", ruler: "Uranus" },
  Pisces: { element: "water", modality: "mutable", ruler: "Neptune" },
};
const PLANET_LABELS = {
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
  "North Node": "북노드",
  "South Node": "남노드",
};
const MAJOR_PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
const TIMING_TRANSIT_PLANETS = ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
const TRANSIT_TARGETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
const FORBIDDEN_RESULT_PATTERNS = [/\bPDF\b/gi, /챕터|chapter/gi, /\bjob\b/gi, /\bprogress\b/gi, /\bprompt\b/gi, /프롬프트/g, /시스템/g, /\bAI\b/g, /이 기능은|이 결과는|분석 결과는/g];
const BROKEN_RESULT_TEXT_PATTERN = /\uFFFD|\\uFFFD|Ã|Â|ì|í|ê|ë|ð/;
const ASTROLOGY_EXPERT_PARTS = [
  { id: "core_identity", label: "태양·달·상승궁의 중심축", pattern: /(태양[\s\S]{0,1400}달|달[\s\S]{0,1400}태양|상승궁|Ascendant|출생시간 미상)/ },
  { id: "personal_planets", label: "수성·금성·화성의 생활 패턴", pattern: /(수성|Mercury)[\s\S]{0,1800}(금성|Venus)|(금성|Venus)[\s\S]{0,1800}(화성|Mars)|(수성|Mercury)[\s\S]{0,1800}(화성|Mars)/ },
  { id: "growth_planets", label: "목성·토성의 성장 과제", pattern: /(목성|Jupiter|토성|Saturn)/ },
  { id: "aspects_balance", label: "주요 각도와 원소·모드 균형", pattern: /(각도|어스펙트|Aspect|원소|element|모드|modality|균형)/i },
  { id: "houses_timing", label: "하우스 또는 현재 트랜짓의 시기감", pattern: /(하우스|House|트랜짓|Transit|현재 시기|이번 달|타이밍|출생시간 미상)/i },
  { id: "topic_practice", label: "상담 주제별 선택 기준과 실천 루틴", pattern: /(선택 기준|실천|루틴|점검|2주|30일|90일|이번 달)/ },
];

const PLACE_PRESETS = [
  ["서울", "대한민국", 37.5665, 126.978, "Asia/Seoul", ["seoul", "서울", "south korea", "korea"]],
  ["부산", "대한민국", 35.1796, 129.0756, "Asia/Seoul", ["busan", "부산"]],
  ["대구", "대한민국", 35.8714, 128.6014, "Asia/Seoul", ["daegu", "대구"]],
  ["인천", "대한민국", 37.4563, 126.7052, "Asia/Seoul", ["incheon", "인천"]],
  ["광주", "대한민국", 35.1595, 126.8526, "Asia/Seoul", ["gwangju", "광주"]],
  ["대전", "대한민국", 36.3504, 127.3845, "Asia/Seoul", ["daejeon", "대전"]],
  ["제주", "대한민국", 33.4996, 126.5312, "Asia/Seoul", ["jeju", "제주"]],
  ["도쿄", "일본", 35.6762, 139.6503, "Asia/Tokyo", ["tokyo", "도쿄", "japan"]],
  ["오사카", "일본", 34.6937, 135.5023, "Asia/Tokyo", ["osaka", "오사카"]],
  ["베이징", "중국", 39.9042, 116.4074, "Asia/Shanghai", ["beijing", "베이징"]],
  ["상하이", "중국", 31.2304, 121.4737, "Asia/Shanghai", ["shanghai", "상하이"]],
  ["타이베이", "대만", 25.033, 121.5654, "Asia/Taipei", ["taipei", "타이베이"]],
  ["홍콩", "홍콩", 22.3193, 114.1694, "Asia/Hong_Kong", ["hong kong", "hongkong", "홍콩"]],
  ["싱가포르", "싱가포르", 1.3521, 103.8198, "Asia/Singapore", ["singapore", "싱가포르"]],
  ["뉴욕", "미국", 40.7128, -74.006, "America/New_York", ["new york", "nyc", "뉴욕"]],
  ["로스앤젤레스", "미국", 34.0522, -118.2437, "America/Los_Angeles", ["los angeles", "la", "로스앤젤레스"]],
  ["런던", "영국", 51.5072, -0.1276, "Europe/London", ["london", "런던"]],
  ["파리", "프랑스", 48.8566, 2.3522, "Europe/Paris", ["paris", "파리"]],
  ["시드니", "호주", -33.8688, 151.2093, "Australia/Sydney", ["sydney", "시드니"]],
];

function clean(value, maxLength = 0) {
  const text = String(value ?? "").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sha256(value) {
  return createHash("sha256").update(String(value || "")).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function readIdempotencyKey(request, body = {}) {
  return clean(
    body?.idempotencyKey
      || request.headers.get("idempotency-key")
      || request.headers.get("x-idempotency-key"),
    180,
  );
}

function isValidDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseDateParts(value) {
  const [year, month, day] = clean(value).split("-").map((part) => Number(part));
  return { year, month, day };
}

function parseTime(value, unknown) {
  if (unknown) return { hour: 12, minute: 0, birthTime: "" };
  const text = clean(value, 5);
  const match = text.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]), birthTime: text };
}

function normalizeGender(value) {
  const text = clean(value, 40).toLowerCase();
  if (["male", "m", "man", "남", "남성"].includes(text)) return "male";
  if (["female", "f", "woman", "여", "여성"].includes(text)) return "female";
  if (["other", "unknown", "none", "기타", "미입력"].includes(text)) return "other";
  return text || "";
}

function parseTimezoneOffsetLiteral(value) {
  if (value === 0) return 0;
  const raw = clean(value);
  if (!raw) return NaN;
  const direct = Number(raw);
  if (Number.isFinite(direct)) return direct;
  const lowered = raw.toLowerCase();
  const aliases = {
    "asia/seoul": 9,
    "asia/tokyo": 9,
    "asia/shanghai": 8,
    "asia/taipei": 8,
    "asia/hong_kong": 8,
    "asia/singapore": 8,
    kst: 9,
    jst: 9,
    utc: 0,
    gmt: 0,
  };
  if (Object.prototype.hasOwnProperty.call(aliases, lowered)) return aliases[lowered];
  const match = raw.match(/^(?:utc|gmt)?\s*([+-])(\d{1,2})(?::?(\d{2}))?$/i);
  if (!match) return NaN;
  const hour = Number(match[2]);
  const minute = Number(match[3] || 0);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return NaN;
  return (match[1] === "-" ? -1 : 1) * (hour + minute / 60);
}

function resolveIanaTimezoneOffsetHours(timezone, parts) {
  const raw = clean(timezone);
  if (!raw || !raw.includes("/")) return NaN;
  try {
    const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour || 0, parts.minute || 0));
    const token = new Intl.DateTimeFormat("en-US", {
      timeZone: raw,
      timeZoneName: "shortOffset",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date).find((part) => part.type === "timeZoneName")?.value;
    return parseTimezoneOffsetLiteral(token);
  } catch (_) {
    return NaN;
  }
}

function timezoneOffsetHours(timezone, parts) {
  const fixed = parseTimezoneOffsetLiteral(timezone);
  if (Number.isFinite(fixed)) return fixed;
  return resolveIanaTimezoneOffsetHours(timezone, parts);
}

function matchPresetPlace(text) {
  const query = clean(text).toLowerCase();
  if (!query) return null;
  return PLACE_PRESETS.find(([, , , , , keys]) => keys.some((key) => query.includes(String(key).toLowerCase()))) || null;
}

function normalizeBirthPlace(body = {}, dateParts = {}, timeParts = {}) {
  const raw = body.birthPlace && typeof body.birthPlace === "object" ? body.birthPlace : {};
  const cityText = clean(raw.city || body.city || "", 80);
  const countryText = clean(raw.country || body.country || "", 80);
  const placeText = clean(raw.label || raw.name || body.birthPlaceText || body.birthPlace || body.place || [cityText, countryText].filter(Boolean).join(", "), 160);
  const preset = matchPresetPlace(`${placeText} ${cityText} ${countryText}`);
  const latitude = numberOrNull(raw.latitude ?? raw.lat ?? body.latitude ?? body.lat ?? preset?.[2]);
  const longitude = numberOrNull(raw.longitude ?? raw.lon ?? raw.lng ?? body.longitude ?? body.lon ?? body.lng ?? preset?.[3]);
  const timezone = clean(raw.timezone || raw.tz || body.timezone || preset?.[4] || "", 80);
  const offset = timezoneOffsetHours(timezone, { ...dateParts, ...timeParts });

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { ok: false, message: PLACE_ERROR_MESSAGE };
  }
  if (!Number.isFinite(offset) || offset < -14 || offset > 14) {
    return { ok: false, message: PLACE_ERROR_MESSAGE };
  }

  return {
    ok: true,
    place: {
      city: cityText || preset?.[0] || placeText,
      country: countryText || preset?.[1] || "",
      latitude: Math.round(latitude * 10000) / 10000,
      longitude: Math.round(longitude * 10000) / 10000,
      timezone,
      timezoneOffsetHours: Math.round(offset * 100) / 100,
    },
  };
}

function normalizeInput(body = {}) {
  const source = body.birthInfo && typeof body.birthInfo === "object" ? { ...body, ...body.birthInfo } : body;
  const name = clean(source.name || source.nickname, 80);
  const gender = normalizeGender(source.gender);
  const birthDate = clean(source.birthDate, 10);
  const birthTimeUnknown = source.birthTimeUnknown === true || source.birthTimeKnown === false;
  const topic = clean(source.topic || body.topic, 100);
  const userQuestion = clean(source.userQuestion || source.question || body.userQuestion || body.question, 1400);

  if (!gender) return { ok: false, message: INVALID_INPUT_MESSAGE };
  if (!isValidDateKey(birthDate)) return { ok: false, message: INVALID_INPUT_MESSAGE };
  const dateParts = parseDateParts(birthDate);
  const timeParts = parseTime(source.birthTime, birthTimeUnknown);
  if (!timeParts) return { ok: false, message: INVALID_INPUT_MESSAGE };
  const place = normalizeBirthPlace(source, dateParts, timeParts);
  if (!place.ok) return place;
  if (!TOPICS.has(topic)) return { ok: false, message: INVALID_INPUT_MESSAGE };
  if (userQuestion && userQuestion.length < 2) return { ok: false, message: INVALID_INPUT_MESSAGE };

  const input = {
    birthInfo: {
      name,
      gender,
      birthDate,
      birthTime: timeParts.birthTime,
      birthTimeUnknown,
      birthPlace: place.place,
    },
    topic,
    userQuestion,
    calculationInput: {
      ...dateParts,
      hour: timeParts.hour,
      minute: timeParts.minute,
      timezone: place.place.timezoneOffsetHours,
      lat: place.place.latitude,
      lon: place.place.longitude,
    },
  };

  return {
    ok: true,
    input,
    inputHash: sha256(stableJson({
      birthInfo: input.birthInfo,
      topic,
      userQuestion,
    })),
  };
}

function invalidInput(message = INVALID_INPUT_MESSAGE, status = 422) {
  return json({ ok: false, reason: "INVALID_INPUT", message }, { status });
}

function loginRequired() {
  return json({ ok: false, reason: "LOGIN_REQUIRED", message: LOGIN_REQUIRED_MESSAGE }, { status: 401 });
}

function paymentRequired(pricing, idempotencyKey) {
  return json({
    ok: false,
    reason: "PAYMENT_REQUIRED",
    paymentPayload: {
      featureKey: FEATURE_KEY,
      title: TITLE,
      reason: TITLE,
      orderName: TITLE,
      cost: pricing.coinPrice,
      coinPrice: pricing.coinPrice,
      amountKRW: pricing.amountKRW,
      amountKrw: pricing.amountKRW,
      currency: "KRW",
      requestId: idempotencyKey,
      idempotencyKey,
      checkoutEndpoint: "/api/billing/checkout",
      confirmEndpoint: "/api/billing/confirm",
      runtimeGate: {
        title: TITLE,
        reason: TITLE,
        featureKey: FEATURE_KEY,
        categoryKey: "premium-consultation",
        subFeatureKey: FEATURE_KEY,
        serviceKey: FEATURE_KEY,
        cost: pricing.coinPrice,
        coinPrice: pricing.coinPrice,
        amountKRW: pricing.amountKRW,
        amountKrw: pricing.amountKRW,
        membershipCreditCost: pricing.membershipCreditCost,
        requestId: idempotencyKey,
        idempotencyKey,
      },
    },
  }, { status: 402 });
}

function serverError(message = SERVER_ERROR_MESSAGE, status = 500) {
  return json({ ok: false, reason: "SERVER_ERROR", message }, { status });
}

function getPricing() {
  const result = getBillingFeaturePricing({ featureKey: FEATURE_KEY });
  const pricing = result?.pricing || null;
  const coinPrice = Number(pricing?.coinPrice || pricing?.cost || 0);
  const amountKRW = Number(pricing?.amountKRW || pricing?.paymentAmount || coinPrice * 100);
  if (!result?.ok || !Number.isInteger(coinPrice) || coinPrice <= 0 || !Number.isInteger(amountKRW) || amountKRW <= 0) {
    const error = new Error("astrology-ai price not found");
    error.code = "PRICE_NOT_FOUND";
    throw error;
  }
  return {
    pricing,
    coinPrice,
    amountKRW,
    membershipCreditCost: calculateMembershipCreditCost(coinPrice),
  };
}

async function createAccessToken(env, payload) {
  return signJwt(
    {
      typ: ACCESS_TOKEN_TYPE,
      serviceKey: SERVICE_KEY,
      featureKey: FEATURE_KEY,
      ...payload,
    },
    getAccessTokenSecret(env),
    {
      expiresIn: ACCESS_TOKEN_TTL,
      issuer: getJwtIssuer(env),
      audience: getJwtAudience(env),
    },
  );
}

async function verifyAccessToken(env, token) {
  const payload = await verifyJwt(token, getAccessTokenSecret(env), {
    issuer: getJwtIssuer(env),
    audience: getJwtAudience(env),
  });
  if (payload?.typ !== ACCESS_TOKEN_TYPE || payload?.serviceKey !== SERVICE_KEY || payload?.featureKey !== FEATURE_KEY) {
    const error = new Error("invalid access token");
    error.code = "INVALID_ACCESS_TOKEN";
    throw error;
  }
  return payload;
}

function mapAccessType(decision = {}, user = {}) {
  if (clean(user.role).toLowerCase() === "admin") return "admin";
  const source = clean(decision.accessSource).toLowerCase();
  const reason = clean(decision.reason).toLowerCase();
  const license = clean(decision.licenseType).toLowerCase();
  if (source.includes("monthly") || license.includes("monthly") || reason.includes("monthly")) return "subscription";
  if (source.includes("paid") || license.includes("single") || reason.includes("already_purchased")) return "paid";
  return "pass";
}

function hasMonthlyCreditBalance(user = {}, cost = 0) {
  const balance = Math.max(0, Math.floor(Number(user?.profileSubscription?.membershipCreditBalance || 0)));
  return cost > 0 && balance >= cost;
}

async function loadUser(userId) {
  if (!mongoose.Types.ObjectId.isValid(String(userId || ""))) return null;
  return User.findById(userId)
    .select("role profileSubscription paidFeatures unlockedFeatures licenses monthlySubscription subscription membership membershipPass pass entitlement licensePass accessGateResult plan planId productId subscriptionTier membershipTier passTier status subscriptionStatus membershipStatus isActive isSubscribed expiresAt")
    .lean();
}

async function resolveEnsureAccess(env, auth, pricing, idempotencyKey, inputHash) {
  await connectDb(env);
  // 인증 단계에서 이미 같은 User 문서를 읽었으면(authUserDoc) 재조회하지 않는다 — 이용권 확인 1회당
  // User 왕복이 3회(인증 + 여기 + canAccessPaidFeature)에서 1회로 줄어, Atlas 지연 스파이크에서
  // 체감 지연이 그만큼 짧아진다. authUserDoc는 access-token 경로에만 붙으므로 없으면 종전 조회로 폴백한다.
  // 풀 초기화(MongoPoolClearedError) 순간에도 접근 판정 read가 1회 실패로 죽지 않도록 재시도.
  const user = auth.authUserDoc || await withMongoRetry(env, () => loadUser(auth.userId));
  if (!user) return { ok: false, reason: "LOGIN_REQUIRED" };
  if (clean(user.role).toLowerCase() === "admin" || clean(auth.role).toLowerCase() === "admin") {
    return { ok: true, accessType: "admin", paymentId: "" };
  }

  const decision = await canAccessPaidFeature(auth.userId, FEATURE_KEY, { env, reason: TITLE, userDoc: user });
  if (!decision.allowed) return { ok: false, reason: "PAYMENT_REQUIRED" };

  const accessType = mapAccessType(decision, user);
  if (accessType === "subscription" && !hasMonthlyCreditBalance(user, pricing.membershipCreditCost)) {
    return { ok: false, reason: "PAYMENT_REQUIRED" };
  }
  return { ok: true, accessType, paymentId: "", inputHash, idempotencyKey };
}

function paymentIdFromBody(body = {}) {
  const payment = body.payment && typeof body.payment === "object" ? body.payment : {};
  const accessGrant = body.accessGrant && typeof body.accessGrant === "object" ? body.accessGrant : {};
  const consume = body.consume && typeof body.consume === "object" ? body.consume : {};
  return clean(
    body.paymentId
      || body.impUid
      || body.merchantUid
      || payment.paymentId
      || payment.impUid
      || payment.merchantUid
      || accessGrant.paymentId
      || accessGrant.purchaseId
      || accessGrant.transactionId
      || consume.paymentId
      || consume.purchaseId
      || consume.transactionId,
    160,
  );
}

function billingContextFromBody(body = {}) {
  const consume = body.consume && typeof body.consume === "object" ? body.consume : {};
  const accessGrant = body.accessGrant && typeof body.accessGrant === "object" ? body.accessGrant : {};
  const payment = body.payment && typeof body.payment === "object" ? body.payment : {};
  const accessType = clean(consume.accessType || accessGrant.accessType || body.accessType).toLowerCase();
  const accessMethod = clean(consume.accessMethod || accessGrant.accessMethod || body.accessMethod || body.paymentMode).toUpperCase();
  const featureKey = clean(consume.featureKey || accessGrant.featureKey || payment.featureKey || body.featureKey);
  const requestId = clean(consume.requestId || accessGrant.requestId || payment.requestId || body.requestId || body.idempotencyKey, 180);
  const transactionId = clean(consume.transactionId || accessGrant.transactionId, 160);
  const ledgerId = clean(consume.ledgerId || accessGrant.ledgerId, 160);
  return {
    consume,
    accessGrant,
    payment,
    accessType,
    accessMethod,
    featureKey,
    requestId,
    transactionId,
    ledgerId,
    paymentId: paymentIdFromBody(body),
  };
}

async function hasPaidPayment(auth, paymentId, idempotencyKey) {
  const clauses = [];
  if (paymentId) clauses.push({ impUid: paymentId }, { merchantUid: paymentId }, { requestId: paymentId }, { idempotencyKey: paymentId });
  if (idempotencyKey) clauses.push({ requestId: idempotencyKey }, { idempotencyKey });
  if (!clauses.length) return null;
  return Payment.findOne({
    userId: auth.userId,
    featureKey: FEATURE_KEY,
    paymentType: "digital_content",
    status: { $in: ["paid", "success", "fulfilled"] },
    $or: clauses,
  }).sort({ updatedAt: -1, paidAt: -1, createdAt: -1 }).lean();
}

async function hasMonthlyConsume(auth, ctx, idempotencyKey) {
  if (ctx.featureKey && ctx.featureKey !== FEATURE_KEY) return false;
  if (ctx.requestId && ctx.requestId !== idempotencyKey) return false;
  const userId = auth.userId;
  if (ctx.ledgerId && mongoose.Types.ObjectId.isValid(ctx.ledgerId)) {
    const ledger = await MonthlyCreditLedger.exists({
      _id: ctx.ledgerId,
      userId,
      type: "MONTHLY_CREDIT_SPEND",
      serviceKey: FEATURE_KEY,
    });
    if (ledger) return true;
  }
  if (ctx.transactionId && mongoose.Types.ObjectId.isValid(ctx.transactionId)) {
    const history = await PointHistory.exists({
      _id: ctx.transactionId,
      userId,
      kind: "deduct",
      featureKey: FEATURE_KEY,
      "metadata.accessType": "membership_credit",
    });
    if (history) return true;
  }
  return false;
}

async function resolveStartAccess({ request, env, auth, body, normalized, pricing, idempotencyKey }) {
  await connectDb(env);
  const token = clean(body?.accessToken || request.headers.get("x-astrology-ai-access-token"));
  if (token) {
    const payload = await verifyAccessToken(env, token);
    if (clean(payload.userId) !== clean(auth.userId) || clean(payload.idempotencyKey) !== idempotencyKey || clean(payload.inputHash) !== normalized.inputHash) {
      return { ok: false, reason: "INVALID_INPUT", message: INVALID_INPUT_MESSAGE };
    }
    return { ok: true, accessType: clean(payload.accessType), paymentId: clean(payload.paymentId, 160), source: "token" };
  }

  const ctx = billingContextFromBody(body);
  const paidPayment = await withMongoRetry(env, () => hasPaidPayment(auth, ctx.paymentId, idempotencyKey));
  if (paidPayment) {
    return {
      ok: true,
      accessType: "paid",
      paymentId: clean(paidPayment.merchantUid || paidPayment.impUid || ctx.paymentId, 160),
      source: "payment",
    };
  }

  if (ctx.accessType === "membership_credit" || ctx.accessMethod === "MONTHLY") {
    if (await withMongoRetry(env, () => hasMonthlyConsume(auth, ctx, idempotencyKey))) {
      return {
        ok: true,
        accessType: "subscription",
        paymentId: ctx.transactionId || ctx.ledgerId || idempotencyKey,
        source: "billing-gate",
        executionSourceTransactionId: ctx.transactionId,
        executionPayment: body.payment,
        billingContext: ctx,
      };
    }
  }

  if (ctx.accessType === "membership_pass" || ctx.accessType === "family" || ctx.accessMethod === "PASS") {
    if ((!ctx.featureKey || ctx.featureKey === FEATURE_KEY) && (!ctx.requestId || ctx.requestId === idempotencyKey)) {
      return {
        ok: true,
        accessType: "pass",
        paymentId: ctx.transactionId || ctx.paymentId || "",
        source: "billing-gate",
        executionSourceTransactionId: ctx.transactionId,
        executionPayment: body.payment,
        billingContext: ctx,
      };
    }
  }

  const user = await withMongoRetry(env, () => loadUser(auth.userId));
  if (!user) return { ok: false, reason: "LOGIN_REQUIRED" };
  if (clean(user.role).toLowerCase() === "admin") return { ok: true, accessType: "admin", paymentId: "", source: "server" };
  const decision = await canAccessPaidFeature(auth.userId, FEATURE_KEY, { env, reason: TITLE });
  if (decision.allowed) {
    const accessType = mapAccessType(decision, user);
    if (accessType === "subscription" && !hasMonthlyCreditBalance(user, pricing.membershipCreditCost)) return { ok: false, reason: "PAYMENT_REQUIRED" };
    return { ok: true, accessType, paymentId: "", source: "server" };
  }
  return { ok: false, reason: "PAYMENT_REQUIRED" };
}

function signName(index) {
  const i = Math.max(0, Math.min(11, Number(index) || 0));
  return SIGN_NAMES[i] || "";
}

function signKo(index) {
  const i = Math.max(0, Math.min(11, Number(index) || 0));
  return SIGN_KO[i] || "";
}

function positionFromNode(node, houseOverride) {
  if (!node || typeof node !== "object") return null;
  const sign = signName(node.sign);
  return {
    sign,
    signKo: signKo(node.sign),
    degree: numberOrNull(node.degree),
    absoluteDegree: numberOrNull(node.longitude),
    house: Number.isFinite(Number(houseOverride ?? node.house)) ? Number(houseOverride ?? node.house) : null,
  };
}

function aspectBetween(a, b) {
  const one = Number(a);
  const two = Number(b);
  if (!Number.isFinite(one) || !Number.isFinite(two)) return null;
  const raw = Math.abs((((one - two) % 360) + 360) % 360);
  const diff = raw > 180 ? 360 - raw : raw;
  for (const [degree, type] of [[0, "conjunction"], [60, "sextile"], [90, "square"], [120, "trine"], [180, "opposition"]]) {
    const orb = Math.abs(diff - degree);
    if (orb <= 6) return { type, orb: Math.round(orb * 100) / 100 };
  }
  return null;
}

function balanceCounts(planets) {
  const elementBalance = { fire: 0, earth: 0, air: 0, water: 0 };
  const modalityBalance = { cardinal: 0, fixed: 0, mutable: 0 };
  planets.forEach((planet) => {
    const meta = SIGN_META[planet.sign || ""];
    if (meta?.element) elementBalance[meta.element] += 1;
    if (meta?.modality) modalityBalance[meta.modality] += 1;
  });
  return { elementBalance, modalityBalance };
}

function findStelliums(planets) {
  const bySign = new Map();
  const byHouse = new Map();
  planets.forEach((planet) => {
    if (planet.sign) bySign.set(planet.sign, [...(bySign.get(planet.sign) || []), planet.name]);
    if (Number.isFinite(Number(planet.house))) byHouse.set(Number(planet.house), [...(byHouse.get(Number(planet.house)) || []), planet.name]);
  });
  return [
    ...Array.from(bySign.entries()).filter(([, items]) => items.length >= 3).map(([sign, items]) => ({ sign, planets: items })),
    ...Array.from(byHouse.entries()).filter(([, items]) => items.length >= 3).map(([house, items]) => ({ house, planets: items })),
  ];
}

function dominantPlanets(planets, aspects, chartRuler) {
  const scores = new Map();
  planets.forEach((planet) => scores.set(planet.name, planet.name === chartRuler ? 4 : 1));
  aspects.forEach((aspect) => {
    scores.set(aspect.planetA, (scores.get(aspect.planetA) || 0) + 1);
    scores.set(aspect.planetB, (scores.get(aspect.planetB) || 0) + 1);
  });
  return Array.from(scores.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name]) => name);
}

function keywordsFromChart(chart, topic) {
  const words = [];
  if (chart.chartRuler) words.push(`${PLANET_LABELS[chart.chartRuler] || chart.chartRuler}의 방향성`);
  const strongest = chart.dominantPlanets?.[0];
  if (strongest) words.push(`${PLANET_LABELS[strongest] || strongest} 흐름`);
  if (topic) words.push(topic);
  while (words.length < 3) words.push(["내면의 리듬", "현실 선택", "관계의 균형"][words.length]);
  return words.slice(0, 3);
}

// 트랜싯 계산을 건너뛰라는 내부 신호. 진짜 실패와 구분해 경고 로그를 남기지 않기 위한 표식이다.
class SkipTransitsSignal extends Error {}

async function calculateAstrologyChart(env, normalized, requestUrl, options = {}) {
  const { input } = normalized;
  const natalRaw = await getSwissWesternChart(env, input.calculationInput, {
    premium: true,
    strictSwiss: true,
    allowFallback: false,
    requestUrl,
  });
  const birthTimeUnknown = input.birthInfo.birthTimeUnknown === true;
  const rawPlanets = natalRaw.planets || {};
  const planets = MAJOR_PLANETS.map((name) => ({
    name,
    label: PLANET_LABELS[name] || name,
    ...positionFromNode(rawPlanets[name]),
    retrograde: rawPlanets[name]?.retrograde === true,
    aspects: [],
  })).filter((planet) => planet.sign);
  const nodes = {
    northNode: positionFromNode(natalRaw.northNode),
    southNode: positionFromNode(natalRaw.southNode),
  };
  if (nodes.northNode) planets.push({ name: "North Node", label: "북노드", ...nodes.northNode, retrograde: null, aspects: [] });
  if (nodes.southNode) planets.push({ name: "South Node", label: "남노드", ...nodes.southNode, retrograde: null, aspects: [] });

  const majorAspects = (Array.isArray(natalRaw.aspects) ? natalRaw.aspects : []).map((aspect) => ({
    planetA: clean(aspect.p1 || aspect.planetA),
    aspect: clean(aspect.type || aspect.aspect),
    planetB: clean(aspect.p2 || aspect.planetB),
    orb: numberOrNull(aspect.orb),
  })).filter((aspect) => aspect.planetA && aspect.planetB && aspect.aspect);
  planets.forEach((planet) => {
    planet.aspects = majorAspects
      .filter((aspect) => aspect.planetA === planet.name || aspect.planetB === planet.name)
      .map((aspect) => ({
        type: aspect.aspect,
        target: aspect.planetA === planet.name ? aspect.planetB : aspect.planetA,
        orb: aspect.orb,
      }));
  });

  const houses = birthTimeUnknown ? [] : (Array.isArray(natalRaw.houseCusps) ? natalRaw.houseCusps : []).slice(0, 12).map((longitude, idx) => {
    const signIndex = Math.floor((((Number(longitude) % 360) + 360) % 360) / 30);
    return {
      house: idx + 1,
      sign: signName(signIndex),
      signKo: signKo(signIndex),
      cuspDegree: Math.round((((Number(longitude) % 30) + 30) % 30) * 100) / 100,
      planets: planets.filter((planet) => Number(planet.house) === idx + 1).map((planet) => planet.name),
    };
  });
  const ascendant = birthTimeUnknown ? null : positionFromNode(natalRaw.ascendant);
  const mc = birthTimeUnknown ? null : positionFromNode(natalRaw.midheaven);
  const chartRuler = ascendant?.sign ? SIGN_META[ascendant.sign]?.ruler || "" : "";
  const { elementBalance, modalityBalance } = balanceCounts(planets.filter((planet) => MAJOR_PLANETS.includes(planet.name)));
  const partOfFortune = !birthTimeUnknown && ascendant?.absoluteDegree != null && rawPlanets.Sun?.longitude != null && rawPlanets.Moon?.longitude != null
    ? positionFromNode({ longitude: (((ascendant.absoluteDegree + rawPlanets.Moon.longitude - rawPlanets.Sun.longitude) % 360) + 360) % 360, sign: Math.floor((((ascendant.absoluteDegree + rawPlanets.Moon.longitude - rawPlanets.Sun.longitude) % 360) + 360) % 360 / 30), degree: (((ascendant.absoluteDegree + rawPlanets.Moon.longitude - rawPlanets.Sun.longitude) % 30) + 30) % 30 })
    : null;

  const now = new Date();
  let transits = null;
  // 트랜싯은 Swiss 계산을 한 번 더 돈다. 근거 미리보기(/basis)는 대기 화면을 빨리 채우는 것이 목적이라 건너뛴다.
  try {
    if (options.skipTransits) throw new SkipTransitsSignal();
    const transitRaw = await getSwissWesternChart(env, {
      year: now.getUTCFullYear(),
      month: now.getUTCMonth() + 1,
      day: now.getUTCDate(),
      hour: now.getUTCHours(),
      minute: now.getUTCMinutes(),
      timezone: 0,
      lat: input.calculationInput.lat,
      lon: input.calculationInput.lon,
    }, { premium: true, strictSwiss: true, allowFallback: false, requestUrl });
    const transitPlanets = MAJOR_PLANETS.map((name) => ({
      name,
      label: PLANET_LABELS[name] || name,
      ...positionFromNode(transitRaw.planets?.[name]),
      retrograde: transitRaw.planets?.[name]?.retrograde === true,
    })).filter((planet) => planet.sign);
    const transitAspects = [];
    for (const transit of transitPlanets.filter((planet) => TIMING_TRANSIT_PLANETS.includes(planet.name))) {
      for (const natal of planets.filter((planet) => TRANSIT_TARGETS.includes(planet.name))) {
        const hit = aspectBetween(transit.absoluteDegree, natal.absoluteDegree);
        if (hit) transitAspects.push({ transitPlanet: transit.name, aspect: hit.type, natalPlanet: natal.name, orb: hit.orb });
      }
    }
    transits = {
      calculatedAt: now.toISOString(),
      planets: transitPlanets,
      majorAspectsToNatal: transitAspects.slice(0, 12),
    };
  } catch (error) {
    if (!(error instanceof SkipTransitsSignal)) {
      console.warn("[astrology-ai] transit calculation failed", { message: clean(error?.message || error, 300) });
    }
  }

  const chart = {
    zodiacType: "tropical",
    houseSystem: birthTimeUnknown ? "time-unknown-limited" : (natalRaw.houseSystem || "placidus"),
    birthTimeUnknown,
    sun: planets.find((planet) => planet.name === "Sun") || null,
    moon: planets.find((planet) => planet.name === "Moon") || null,
    ascendant,
    mc,
    planets,
    houses,
    nodes,
    chartRuler,
    dominantPlanets: dominantPlanets(planets, majorAspects, chartRuler),
    elementBalance,
    modalityBalance,
    majorAspects,
    stelliums: findStelliums(planets),
    chiron: null,
    partOfFortune,
    transits,
    progressions: null,
    solarReturn: null,
    chartSummary: "",
    calculationMeta: {
      source: natalRaw.source,
      engineQuality: natalRaw.engineQuality,
      fallbackUsed: natalRaw.fallbackUsed === true,
    },
  };
  chart.consultationKeywords = keywordsFromChart(chart, input.topic);
  chart.chartSummary = [
    chart.sun?.sign ? `Sun ${chart.sun.sign}` : "",
    chart.moon?.sign ? `Moon ${chart.moon.sign}` : "",
    chart.ascendant?.sign ? `Ascendant ${chart.ascendant.sign}` : "birth time unknown",
    chart.chartRuler ? `Chart ruler ${chart.chartRuler}` : "",
  ].filter(Boolean).join(", ");
  return chart;
}

/** 관리자 CMS 가 기본값을 보여줄 때 읽어 간다(worker/lib/cms-prompt-defaults.js). */
export function getDefaultSystemPrompt() {
  return buildSystemPrompt();
}

/** CMS 오버라이드가 있으면 그것을, 없거나 조회 실패면 코드 기본값을 쓴다. */
function resolveSystemPrompt(env) {
  return cmsPromptText(env, "astrology-ai", buildSystemPrompt());
}

function buildSystemPrompt() {
  return [
    "당신은 30년 경력의 서양 점성술 상담가입니다.",
    "사용자의 생년월일, 성별, 출생시간, 출생지 정보와 계산된 점성술 차트 데이터를 바탕으로 삶의 흐름을 깊고 자연스럽게 상담합니다.",
    "보고서처럼 딱딱하게 쓰지 말고, 실제 상담실에서 차트를 펼쳐 놓고 말하듯 따뜻하고 선명하게 답변합니다.",
    "Sun, Moon, Ascendant, Chart Ruler, Houses, Aspects, Element Balance, Modality Balance, Transits의 의미를 정확하게 반영합니다.",
    "행성 이름과 별자리만 나열하지 말고, 사용자의 삶에서 어떤 감정, 선택, 관계, 일의 패턴으로 드러나는지 풀어냅니다.",
    "Hard Aspect는 불행이 아니라 긴장과 성장 과제로 설명하고, Soft Aspect는 자동 성공이 아니라 자연스럽게 쓰기 쉬운 재능으로 설명합니다.",
    "트랜짓은 현재 시기의 분위기와 선택의 타이밍으로 해석하되, 절대적 사건 예언처럼 말하지 않습니다.",
    "불안감을 조장하지 않고, 건강 문제는 진단처럼 말하지 않으며, 재물운은 투자 확정 조언처럼 말하지 않습니다.",
    "사용자가 선택한 상담 주제와 자유 질문을 가장 깊게 다룹니다.",
    "출생시간을 모르는 경우 Ascendant, MC, House를 강하게 단정하지 말고 행성의 별자리와 주요 각도 중심으로 말합니다.",
    "계산 데이터 안에 없는 각도, 하우스, 트랜짓, 행성 배치를 새로 지어내지 않습니다.",
    "상담문은 질문에 대한 직접 답변, 차트 핵심 근거, 삶에서 드러나는 장면, 선택 기준, 실천 조언, 마무리 메시지의 흐름을 자연스럽게 담습니다.",
    "태양·달·상승궁, 개인 행성, 사회 행성, 세대 행성, 원소와 모드, 주요 각도, 하우스, 현재 트랜짓은 데이터가 있는 범위에서만 사용합니다.",
    "출생시간 미상이라면 상승궁과 하우스 앞에 반드시 제한적 해석임을 부드럽게 밝힙니다.",
    `첫 상담 답변은 전체 본문 기준 공백 제외 ${ASTROLOGY_AI_MIN_RESULT_CHARS.toLocaleString("ko-KR")}자 이상 ${ASTROLOGY_AI_MAX_RESULT_CHARS.toLocaleString("ko-KR")}자 이하로 완성합니다.`,
    "본문이 길어질 때는 같은 문장을 늘리지 말고, 점성술 상담가가 실제로 살피는 별도 흐름을 새롭게 열어 깊이를 더합니다.",
    "각 흐름은 짧은 운세가 아니라 사용자의 질문에 직접 닿는 상담 문장으로 충분히 펼칩니다.",
    "문체는 전문적이고 신비롭되 과장하지 않으며, 사용자의 마음을 안정시키는 상담가의 목소리를 유지합니다.",
    "도구명, 작성 지시, 내부 절차, 저장 파일 형식, 진행 상태처럼 상담의 바깥을 드러내는 표현은 쓰지 않습니다.",
    "마지막에는 사용자가 추가 질문을 할 수 있도록 자연스럽게 상담을 이어갑니다.",
    "문단 사이는 빈 줄로 구분하고, 핵심 문구는 **굵게** 표시합니다. 필요할 때만 '-' 목록을 쓰고, 그 외 마크다운(제목 #, 코드블록, 표)은 쓰지 않습니다.",
  ].join("\n");
}

/**
 * 첫 상담을 나눠 쓰는 단위.
 *
 * 🔴 한 번의 호출로 1만~2만자를 요구하면 모델이 6천자 근처에서 스스로 멈춰,
 *    초안 전체를 다시 입력에 넣고 처음부터 다시 쓰는 expand 호출이 상시 발동했다
 *    (출력이 2~3배). 섹션당 목표를 모델이 한 번에 채우는 크기로 낮추면 그 고리가 사라진다.
 *
 * minChars 합계 10,800 ≥ ASTROLOGY_AI_MIN_RESULT_CHARS(10,000),
 * maxChars 합계 17,200 ≤ ASTROLOGY_AI_MAX_RESULT_CHARS(20,000) 로 잡아
 * 조립 결과가 기존 품질 게이트를 그대로 통과하게 한다.
 * expertParts 는 ASTROLOGY_EXPERT_PARTS 를 빠짐없이 덮고(6/6),
 * reasoningKeys 는 다섯 흐름을 순서대로 나눠 갖는다.
 */
const ASTROLOGY_SECTIONS = Object.freeze([
  {
    key: "opening_core",
    label: "질문에 대한 답과 태양·달·상승궁의 중심축",
    minChars: 2600,
    maxChars: 4200,
    reasoningKeys: ["structure_core"],
    expertParts: ["core_identity"],
    guide: "사용자의 현재 질문에 첫 문단에서 바로 답한 뒤, 태양·달·상승궁이 만드는 중심축과 그 축이 삶에서 반복시키는 장면을 풀어 주세요. 출생시간 미상이면 상승궁과 하우스는 확정하지 말고 제한적 해석임을 밝히세요.",
  },
  {
    key: "personal_growth",
    label: "개인 행성의 생활 패턴과 목성·토성의 성장 과제",
    minChars: 2600,
    maxChars: 4200,
    reasoningKeys: ["influence_factors"],
    expertParts: ["personal_planets", "growth_planets"],
    guide: "수성·금성·화성이 만드는 생각·애정·추진 방식의 생활 패턴을 구체적 장면으로 보여 주고, 목성·토성이 요구하는 성장 과제와 그 과제가 지금 어떤 형태로 오는지 이어 주세요.",
  },
  {
    key: "evidence_domains",
    label: "각도·원소·모드 균형과 분야별 해석",
    minChars: 3000,
    maxChars: 4600,
    reasoningKeys: ["evidence_basis", "domain_matrix"],
    expertParts: ["aspects_balance"],
    guide: "주요 각도와 원소·모드 균형을 해석 근거로 명확히 밝히고, 그 근거 위에서 분야별 분석을 이어 주세요. 계산 데이터에 없는 각도는 지어내지 말고, 없으면 행성 배치와 원소 균형 중심으로 이어가세요.",
  },
  {
    key: "timing_action",
    label: "하우스·트랜짓의 시기감과 실천 처방",
    minChars: 2600,
    maxChars: 4200,
    reasoningKeys: ["action_plan"],
    expertParts: ["houses_timing", "topic_practice"],
    guide: "하우스 또는 현재 트랜짓이 주는 시기감을 짚고, 상담 주제에 맞는 선택 기준과 실천 루틴으로 좁혀 주세요. 마무리는 오늘 바로 해볼 수 있는 작은 행동과 2주 안에 점검할 선택 기준으로 닫아 주세요.",
  },
]);

// 사용자 입력 + 차트 데이터. 전체 프롬프트와 섹션 프롬프트가 같은 근거를 보도록 한 곳에서 만든다.
function buildSharedContextLines(input, chart) {
  return [
    "[사용자 입력]",
    `이름 또는 닉네임: ${input.birthInfo.name || "미입력"}`,
    `성별: ${input.birthInfo.gender}`,
    `생년월일: ${input.birthInfo.birthDate}`,
    `출생시간: ${input.birthInfo.birthTimeUnknown ? "모름" : input.birthInfo.birthTime}`,
    `출생지: ${input.birthInfo.birthPlace.city || ""} ${input.birthInfo.birthPlace.country || ""}`,
    `상담 주제: ${input.topic}`,
    input.userQuestion ? `현재 가장 궁금한 질문: ${input.userQuestion}` : "",
    "",
    "[계산된 차트 데이터]",
    JSON.stringify(chart),
  ];
}

function buildFollowUpPrompt(consultation, message) {
  const recent = Array.isArray(consultation.messages) ? consultation.messages.slice(-8) : [];
  return [
    "아래 차트와 이전 상담 흐름을 바탕으로 사용자의 추가 질문에 상담형으로 답하세요.",
    "사용자의 질문에 바로 응답하고, 이어서 필요한 차트 근거와 현실적인 선택 기준을 제시하세요.",
    "이전 답변을 반복하지 말고 추가 질문의 초점에 맞춰 더 구체적인 장면, 경계선, 실행 순서를 제안하세요.",
    "계산 데이터에 없는 배치는 새로 만들지 말고, 확인 가능한 근거의 범위 안에서만 말하세요.",
    "",
    "[상담 주제]",
    consultation.topic,
    "",
    "[차트 데이터]",
    JSON.stringify(consultation.astrologyChart || {}),
    "",
    "[최근 대화]",
    // 클립이 없으면 assistant 메시지 8개(각 1만~2만자)가 그대로 실려 한 턴에 16만자까지 간다.
    // 형제 라우트(ziwei-ai·karma-destiny-ai·sukuyo-compatibility-ai)와 같은 1,400자 상한을 쓴다.
    ...recent.map((item) => `${item.role === "assistant" ? "상담가" : "사용자"}: ${clean(item.content, 1400)}`),
    "",
    `[추가 질문]\n${message}`,
  ].join("\n");
}

function countConsultationChars(value) {
  return clean(value).replace(/\s+/g, "").length;
}

function hasForbiddenResultTerms(value) {
  return FORBIDDEN_RESULT_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(value);
  });
}

function hasRepeatedConsultationSentence(value) {
  const counts = new Map();
  const sentences = clean(value)
    .split(/[.!?。！？\n]+/)
    .map((sentence) => clean(sentence))
    .filter((sentence) => sentence.length >= 34);
  for (const sentence of sentences) {
    const next = (counts.get(sentence) || 0) + 1;
    if (next >= 3) return true;
    counts.set(sentence, next);
  }
  return false;
}

function getMissingExpertParts(value) {
  const text = clean(value);
  return ASTROLOGY_EXPERT_PARTS.filter((part) => !part.pattern.test(text));
}

function getConsultationQualityIssues(content, options = {}) {
  const text = clean(content);
  const minLength = Math.max(0, Math.floor(Number(options.minLength || 0)));
  const maxLength = Math.max(0, Math.floor(Number(options.maxLength || 0)));
  const issues = [];
  if (!text) issues.push("EMPTY_RESULT");
  const charCount = countConsultationChars(text);
  if (minLength > 0 && charCount < minLength) issues.push(`MIN_TOTAL_CHARS:${charCount}/${minLength}`);
  if (maxLength > 0 && charCount > maxLength) issues.push(`MAX_TOTAL_CHARS:${charCount}/${maxLength}`);
  BROKEN_RESULT_TEXT_PATTERN.lastIndex = 0;
  if (BROKEN_RESULT_TEXT_PATTERN.test(text)) issues.push("BROKEN_ENCODING_PATTERN");
  if (hasForbiddenResultTerms(text)) issues.push("FORBIDDEN_RESULT_TERM");
  if (hasRepeatedConsultationSentence(text)) issues.push("REPEATED_SENTENCE");
  if (options.requireExpertParts === true) {
    const missingExpertParts = getMissingExpertParts(text);
    const coveredExpertParts = ASTROLOGY_EXPERT_PARTS.length - missingExpertParts.length;
    if (coveredExpertParts < ASTROLOGY_AI_MIN_EXPERT_PARTS) {
      issues.push(`MISSING_EXPERT_PARTS:${missingExpertParts.map((part) => part.id).join("|")}`);
    }
  }
  return issues;
}

function buildConsultationExpansionPrompt(originalPrompt, draft, minChars, missingExpertParts = []) {
  return [
    "아래 점성술 상담 초안을 같은 계산 근거 안에서 더 깊고 길게 다시 완성하세요.",
    `전체 본문은 공백을 제외하고 ${minChars.toLocaleString("ko-KR")}자 이상 ${ASTROLOGY_AI_MAX_RESULT_CHARS.toLocaleString("ko-KR")}자 이하이어야 합니다.`,
    missingExpertParts.length ? `특히 새롭게 보강할 흐름: ${missingExpertParts.map((part) => part.label).join(", ")}` : "",
    "새로운 행성, 하우스, 각도, 트랜짓을 지어내지 말고 초안과 계산 데이터에 있는 근거만 사용하세요.",
    "질문에 대한 직접 답변, 차트 근거, 삶에서 드러나는 장면, 선택 기준, 실천 조언, 따뜻한 마무리를 모두 자연스럽게 확장하세요.",
    "분량만 늘리지 말고, 빠진 흐름마다 실제 상담에서 새로 짚어 줄 장면과 판단 기준을 덧붙이세요.",
    "반복 문장으로 분량을 채우지 말고, 전문적이고 신비롭되 실제 상담처럼 정돈된 한국어로만 쓰세요.",
    "도구명, 작성 지시, 내부 절차, 저장 파일 형식, 진행 상태처럼 상담의 바깥을 드러내는 표현은 쓰지 마세요.",
    "",
    "[기존 지시와 계산 근거]",
    clean(originalPrompt, 36000),
    "",
    "[초안]",
    clean(draft, 32000),
  ].filter(Boolean).join("\n");
}

function buildConsultationCondensePrompt(originalPrompt, draft, minChars, maxChars) {
  return [
    "아래 점성술 상담문이 너무 길다면 핵심을 유지해 다시 정돈하세요.",
    `전체 본문은 공백을 제외하고 ${minChars.toLocaleString("ko-KR")}자 이상 ${maxChars.toLocaleString("ko-KR")}자 이하이어야 합니다.`,
    "태양·달·상승궁의 중심축, 개인 행성, 목성·토성, 주요 각도와 원소·모드, 하우스 또는 트랜짓, 상담 주제별 실천 기준은 반드시 남기세요.",
    "같은 의미의 반복 문단만 덜어내고, 차트 근거와 사용자의 질문에 닿는 상담 흐름은 유지하세요.",
    "새로운 행성, 하우스, 각도, 트랜짓을 지어내지 말고 기존 계산 근거 안에서만 정리하세요.",
    "",
    "[기존 지시와 계산 근거]",
    clean(originalPrompt, 24000),
    "",
    "[정돈할 상담문]",
    clean(draft, 42000),
  ].join("\n");
}

function sanitizeConsultationText(text) {
  let result = clean(text, ASTROLOGY_AI_SANITIZE_MAX_CHARS);
  FORBIDDEN_RESULT_PATTERNS.forEach((pattern) => {
    result = result.replace(pattern, "");
  });
  return result.replace(/\n{3,}/g, "\n\n").trim();
}

function buildSectionPrompt(input, chart, section, repairLines = []) {
  const reasoningLines = section.reasoningKeys
    .map((key) => getReasoningSectionSpec(key))
    .filter(Boolean)
    .map((spec) => `- ${spec.title}: ${spec.guide} (최소 ${spec.minChars.toLocaleString("ko-KR")}자)`);

  return [
    "아래 사용자의 입력과 서버에서 계산된 서양 점성술 차트 데이터만 근거로, 긴 상담문 중 **지정된 한 부분만** 작성하세요.",
    "이 글은 다른 부분과 이어 붙여 하나의 상담문이 됩니다. 인사말·전체 요약·맺음말을 새로 쓰지 말고 지정된 부분의 본문만 쓰세요.",
    "행성 이름을 나열하는 대신 차트의 긴장, 재능, 반복 패턴, 현실 조언을 상담형 문장으로 풀어 주세요.",
    "",
    ...buildSharedContextLines(input, chart),
    "",
    `[이번에 쓸 부분] ${section.label}`,
    section.guide,
    `이 부분만으로 공백 제외 ${section.minChars.toLocaleString("ko-KR")}자 이상 ${section.maxChars.toLocaleString("ko-KR")}자 이하로 쓰세요.`,
    "분량을 채우려고 같은 문장을 반복하지 말고, 새로 짚을 장면과 판단 기준을 더하세요.",
    "도구명, 작성 지시, 내부 절차, 진행 상태처럼 상담의 바깥을 드러내는 표현은 쓰지 마세요.",
    reasoningLines.length ? "" : "",
    reasoningLines.length ? "[이 부분에 반드시 담을 근거 흐름 — 아래 제목을 그대로 소제목으로 써 주세요]" : "",
    ...reasoningLines,
    "",
    ...buildEvidenceRuleLines(buildAstrologyAnalysisBasis(chart)),
    ...(repairLines.length ? ["", "[보강 요청]", ...repairLines] : []),
  ].filter(Boolean).join("\n");
}

/**
 * 섹션을 나눠 병렬 생성하고 하나의 상담문으로 조립한다.
 *
 * 반환 형태는 generateConsultation 과 같다({content, provider, model, quality}) —
 * 저장·렌더 경로가 산문 한 덩어리를 기대하므로 출력 계약을 바꾸지 않는다.
 * 분량 미달은 전체 재생성이 아니라 **모자란 섹션만** 다시 쓴다.
 */
async function generateSectionedConsultation(env, input, chart, options = {}) {
  const minLength = Math.max(0, Math.floor(Number(options.minLength || 0)));
  const maxLength = Math.max(0, Math.floor(Number(options.maxLength || 0)));
  const timeoutMs = clampSyncLlmTimeoutMs(Number(env.ASTROLOGY_AI_TIMEOUT_MS));
  const sectionMaxOutputTokens = Number(options.sectionMaxOutputTokens || env.ASTROLOGY_AI_SECTION_MAX_OUTPUT_TOKENS || 9600);
  const astrologyLlmCache = {
    store: createLlmCacheStore(env),
    deterministic: true,
    ttlSeconds: 30 * 24 * 60 * 60,
    keyExtra: "astrology-ai-sectioned-v1",
  };

  const runSection = async (section, repairLines, attempt) => {
    const ai = await callGeminiText(env, buildSectionPrompt(input, chart, section, repairLines), {
      systemPrompt: await resolveSystemPrompt(env),
      taskType: "fortune",
      temperature: options.temperature ?? 0.72,
      maxOutputTokens: sectionMaxOutputTokens,
      timeoutMs,
      fallbackToWorkersAI: options.fallbackToWorkersAI,
      // 섹션 단위 문턱 — 전체 목표가 아니라 이 섹션 목표의 40%.
      fallbackMinChars: Math.round(section.minChars * 0.4),
      cache: { ...astrologyLlmCache, keyExtra: `${astrologyLlmCache.keyExtra}-${section.key}-a${attempt}` },
    });
    const provider = clean(ai?.provider || "");
    const model = clean(ai?.model || "");
    if (/mock/i.test(provider) || /mock/i.test(model) || ai?.isMock === true) {
      const error = new Error(LLM_ERROR_MESSAGE);
      error.code = "MOCK_PROVIDER_BLOCKED";
      error.status = 503;
      throw error;
    }
    return { section, ok: ai?.ok === true, text: sanitizeConsultationText(ai?.text || ""), provider, model };
  };

  // 웨이브 1 — 전 섹션 동시 생성. 벽시계는 섹션 시간의 합이 아니라 가장 느린 섹션 하나.
  let results = await Promise.all(ASTROLOGY_SECTIONS.map((section) => runSection(section, [], 0)));

  // 웨이브 2 — 모자란 섹션만 다시 쓴다(전체 재생성 금지).
  const shortfall = results.filter((row) => !row.ok || countConsultationChars(row.text) < row.section.minChars);
  if (shortfall.length) {
    const repaired = await Promise.all(shortfall.map((row) => runSection(
      row.section,
      [
        `현재 이 부분은 공백 제외 ${countConsultationChars(row.text).toLocaleString("ko-KR")}자로 목표에 못 미칩니다.`,
        `${row.section.minChars.toLocaleString("ko-KR")}자 이상이 되도록 빠진 장면과 판단 기준을 새로 더해 다시 쓰세요.`,
      ],
      1,
    ).catch(() => null)));
    for (const candidate of repaired) {
      if (!candidate?.ok || !candidate.text) continue;
      const index = results.findIndex((row) => row.section.key === candidate.section.key);
      // 더 길어졌을 때만 채택한다 — 재시도가 더 짧아지는 경우가 있다.
      if (index >= 0 && countConsultationChars(candidate.text) > countConsultationChars(results[index].text)) {
        results[index] = candidate;
      }
    }
  }

  const usable = results.filter((row) => row.text);
  const content = usable.map((row) => row.text).join("\n\n");
  const finalProvider = usable.find((row) => row.provider)?.provider || "";
  const finalModel = usable.find((row) => row.model)?.model || "";

  if (!content) {
    console.error("[AstrologyAI] sectioned generation empty result", { sections: results.length });
    const error = new Error(LLM_ERROR_MESSAGE);
    error.code = "LLM_FAILED";
    error.status = 503;
    throw error;
  }

  const qualityIssues = getConsultationQualityIssues(content, { minLength, maxLength, requireExpertParts: options.requireExpertParts === true });
  const charCount = countConsultationChars(content);
  if (qualityIssues.length) {
    console.error("[AstrologyAI] sectioned generation quality check failed", {
      provider: finalProvider,
      model: finalModel,
      charCount,
      minLength,
      maxLength,
      issues: qualityIssues,
      sectionChars: results.map((row) => `${row.section.key}:${countConsultationChars(row.text)}`),
    });
    // 경량 보장 계약 — 단일 호출 경로와 같다. 렌더 가능하면 degrade 로 전달한다.
    if (!hasRenderableLlmText(content, { minChars: 400 })) {
      const error = new Error(LLM_ERROR_MESSAGE);
      error.code = "LLM_QUALITY_CHECK_FAILED";
      error.status = 503;
      throw error;
    }
    return { content, provider: finalProvider, model: finalModel, quality: { charCount, minLength, maxLength, degraded: true } };
  }

  return { content, provider: finalProvider, model: finalModel, quality: { charCount, minLength, maxLength } };
}

async function generateConsultation(env, prompt, options = {}) {
  const minLength = Math.max(0, Math.floor(Number(options.minLength || 180)));
  const maxLength = Math.max(0, Math.floor(Number(options.maxLength || 0)));
  const maxOutputTokens = Number(options.maxOutputTokens || 7000);
  // PREMIUM_GEMINI_TIMEOUT_MS(운영 45s)를 || 체인에 넣으면 큰 기본값이 죽는다(45s 단락 함정).
  // 공백 제외 1만~2만자(≈3만 토큰, gemini-2.5-flash ~200tok/s)는 150s가 필요하다.
  // 요청 안에서 생성을 끝내는 경로 — 엣지가 끊기 전에 우리가 먼저 답해야 한다.
  const timeoutMs = clampSyncLlmTimeoutMs(Number(env.ASTROLOGY_AI_TIMEOUT_MS));
  // 장문 초기 생성은 llama 폴백이 분량을 못 채워 시간만 낭비 → 호출부에서 폴백 차단 가능.
  const fallbackToWorkersAI = options.fallbackToWorkersAI;
  // 결정적(생년월일+카테고리 기반) 점성술 상담 → LLM 응답 캐시 + in-flight dedup.
  const astrologyLlmCache = {
    store: createLlmCacheStore(env),
    deterministic: true,
    ttlSeconds: 30 * 24 * 60 * 60,
    keyExtra: "astrology-ai-v1",
  };
  const ai = await callGeminiText(env, prompt, {
    systemPrompt: await resolveSystemPrompt(env),
    taskType: "fortune",
    temperature: options.temperature ?? 0.72,
    maxOutputTokens,
    timeoutMs,
    fallbackToWorkersAI,
    cache: astrologyLlmCache,
  });
  const provider = clean(ai?.provider || "");
  const model = clean(ai?.model || "");
  console.info("[AstrologyAI] provider selected", { provider, model });
  const isMock = /mock/i.test(provider) || /mock/i.test(model) || ai?.isMock === true;
  let content = sanitizeConsultationText(ai?.text || "");
  let finalProvider = provider;
  let finalModel = model;
  if (!ai?.ok || isMock || !content) {
    console.error("[AstrologyAI] generation empty result", { provider, model, isMock, length: content.length, ok: ai?.ok === true });
    const error = new Error(LLM_ERROR_MESSAGE);
    error.code = isMock ? "MOCK_PROVIDER_BLOCKED" : "LLM_FAILED";
    error.status = 503;
    throw error;
  }

  let qualityIssues = getConsultationQualityIssues(content, { minLength, maxLength, requireExpertParts: options.requireExpertParts === true });
  // 잘림(MAX_TOKENS)은 글자수가 충분해도 문장이 끊긴 것이므로 확장/재생성 대상에 포함한다.
  const shouldExpand = ai?.truncated === true || qualityIssues.some((issue) => issue.startsWith("MIN_TOTAL_CHARS:") || issue.startsWith("MISSING_EXPERT_PARTS:"));
  if (shouldExpand) {
    const missingExpertParts = options.requireExpertParts === true ? getMissingExpertParts(content) : [];
    const repair = await callGeminiText(env, buildConsultationExpansionPrompt(prompt, content, minLength, missingExpertParts), {
      systemPrompt: await resolveSystemPrompt(env),
      taskType: "fortune",
      temperature: options.expandTemperature ?? 0.62,
      // 잘려서 재생성하는 경우 원본보다 여유 있는 토큰으로 완결시킨다.
      maxOutputTokens: Math.max(Number(options.expandMaxOutputTokens || 0), ai?.truncated ? Math.round(maxOutputTokens * 1.3) : maxOutputTokens, 14000),
      timeoutMs,
      fallbackToWorkersAI,
      cache: astrologyLlmCache,
    });
    const repairProvider = clean(repair?.provider || finalProvider);
    const repairModel = clean(repair?.model || finalModel);
    const repairIsMock = /mock/i.test(repairProvider) || /mock/i.test(repairModel) || repair?.isMock === true;
    if (repairIsMock) {
      const error = new Error(LLM_ERROR_MESSAGE);
      error.code = "MOCK_PROVIDER_BLOCKED";
      error.status = 503;
      throw error;
    }
    const expanded = sanitizeConsultationText(repair?.text || "");
    if (repair?.ok && expanded) {
      content = countConsultationChars(expanded) >= countConsultationChars(content) ? expanded : `${content}\n\n${expanded}`;
      finalProvider = repairProvider;
      finalModel = repairModel;
    }
  }

  qualityIssues = getConsultationQualityIssues(content, { minLength, maxLength, requireExpertParts: options.requireExpertParts === true });
  if (maxLength > 0 && qualityIssues.some((issue) => issue.startsWith("MAX_TOTAL_CHARS:"))) {
    const repair = await callGeminiText(env, buildConsultationCondensePrompt(prompt, content, minLength, maxLength), {
      systemPrompt: await resolveSystemPrompt(env),
      taskType: "fortune",
      temperature: options.condenseTemperature ?? 0.48,
      maxOutputTokens: Math.max(Number(options.condenseMaxOutputTokens || 0), maxOutputTokens, 12000),
      timeoutMs,
      fallbackToWorkersAI,
      cache: astrologyLlmCache,
    });
    const repairProvider = clean(repair?.provider || finalProvider);
    const repairModel = clean(repair?.model || finalModel);
    const repairIsMock = /mock/i.test(repairProvider) || /mock/i.test(repairModel) || repair?.isMock === true;
    if (repairIsMock) {
      const error = new Error(LLM_ERROR_MESSAGE);
      error.code = "MOCK_PROVIDER_BLOCKED";
      error.status = 503;
      throw error;
    }
    const condensed = sanitizeConsultationText(repair?.text || "");
    if (repair?.ok && condensed) {
      content = condensed;
      finalProvider = repairProvider;
      finalModel = repairModel;
    }
  }

  qualityIssues = getConsultationQualityIssues(content, { minLength, maxLength, requireExpertParts: options.requireExpertParts === true });
  if (qualityIssues.length) {
    console.error("[AstrologyAI] generation quality check failed", {
      provider: finalProvider,
      model: finalModel,
      charCount: countConsultationChars(content),
      minLength,
      maxLength,
      issues: qualityIssues,
    });
    // 경량 보장 계약: 분량/전문가파트 등 품질 미달이라도 렌더 가능한 상담문이 있으면 버리지 않고 degrade로 전달한다.
    if (!hasRenderableLlmText(content, { minChars: 400 })) {
      const error = new Error(LLM_ERROR_MESSAGE);
      error.code = "LLM_QUALITY_CHECK_FAILED";
      error.status = 503;
      throw error;
    }
    return {
      content,
      provider: finalProvider,
      model: finalModel,
      quality: {
        charCount: countConsultationChars(content),
        minLength,
        maxLength,
        degraded: true,
      },
    };
  }

  return {
    content,
    provider: finalProvider,
    model: finalModel,
    quality: {
      charCount: countConsultationChars(content),
      minLength,
      maxLength,
    },
  };
}

async function applyUsageOnce({ userId, sessionId, accessType, pricing, source }) {
  const existing = await AstrologyAiConsultation.findOne({ id: sessionId }).select("usageAppliedAt").lean();
  if (existing?.usageAppliedAt) return true;
  if (source !== "billing-gate" && accessType === "subscription") {
    const error = new Error("A Payment Service access grant is required for monthly usage.");
    error.code = "PAYMENT_ACCESS_GRANT_REQUIRED";
    throw error;
  }
  await AstrologyAiConsultation.updateOne({ id: sessionId, usageAppliedAt: null }, { $set: { usageAppliedAt: new Date() } });
  return true;
}

function executionAccessMethod(accessType) {
  if (accessType === "paid") return "single";
  if (accessType === "subscription") return "monthly";
  if (accessType === "admin") return "admin";
  return "pass";
}

async function recordSuccessfulUsage(auth, idempotencyKey, access, sessionId, pricing) {
  const accessMethod = executionAccessMethod(access.accessType);
  await PaidExecutionRecord.findOneAndUpdate(
    {
      userId: String(auth.userId || ""),
      featureId: FEATURE_KEY,
      profileId: "default",
      requestId: idempotencyKey,
    },
    {
      $setOnInsert: {
        executionId: `${FEATURE_KEY}:${auth.userId}:${idempotencyKey}`.slice(0, 160),
        requestId: idempotencyKey,
        userId: String(auth.userId || ""),
        featureId: FEATURE_KEY,
        profileId: "default",
        accessMode: "per_use",
        accessMethod,
        amountCoins: accessMethod === "single" ? pricing.coinPrice : 0,
        amountKRW: accessMethod === "single" ? pricing.amountKRW : 0,
        monthlyDeductedAmount: accessMethod === "monthly" ? pricing.coinPrice : 0,
        paymentId: access.paymentId || "",
        orderId: access.paymentId || idempotencyKey,
        consumedAt: new Date(),
        idempotencyKey: `${FEATURE_KEY}:${auth.userId}:${idempotencyKey}`.slice(0, 180),
      },
      $set: {
        status: "completed",
        completedAt: new Date(),
        resultId: sessionId,
      },
    },
    { upsert: true, new: true },
  );
}

async function startRefundableExecution(env, auth, access, idempotencyKey, sessionId, pricing) {
  if (access.source !== "billing-gate" || !access.executionSourceTransactionId) return null;
  const result = await startServiceExecution(env, auth.userId, {
    executionKey: `${FEATURE_KEY}:${idempotencyKey}`,
    requestId: `${FEATURE_KEY}:${idempotencyKey}`,
    featureKey: FEATURE_KEY,
    cost: pricing.coinPrice,
    sourceTransactionId: access.executionSourceTransactionId,
    sessionId,
    payment: access.executionPayment,
    idempotencyKey,
    metadata: {
      serviceKey: SERVICE_KEY,
      featureKey: FEATURE_KEY,
      billing: access.billingContext || null,
    },
  }).catch((error) => {
    console.warn("[astrology-ai] execution guard start failed", { message: clean(error?.message || error, 300) });
    return null;
  });
  return result?.execution || null;
}

async function completeRefundableExecution(env, auth, idempotencyKey, sessionId) {
  await completeServiceExecution(env, auth.userId, {
    executionKey: `${FEATURE_KEY}:${idempotencyKey}`,
    requestId: `${FEATURE_KEY}:${idempotencyKey}`,
    sessionId,
    reportId: sessionId,
    metadata: { serviceKey: SERVICE_KEY, featureKey: FEATURE_KEY, sessionId },
  }).catch((error) => {
    console.warn("[astrology-ai] execution guard complete failed", { message: clean(error?.message || error, 300) });
  });
}

async function failRefundableExecution(env, auth, idempotencyKey, sessionId, error) {
  await failServiceExecution(env, auth.userId, {
    executionKey: `${FEATURE_KEY}:${idempotencyKey}`,
    requestId: `${FEATURE_KEY}:${idempotencyKey}`,
    sessionId,
    reportId: sessionId,
    reasonCode: clean(error?.code || "astrology_ai_generation_failed", 80),
    reasonMessage: clean(error?.message || LLM_ERROR_MESSAGE, 300),
    forceRefundOnClose: true,
  }).catch((refundError) => {
    console.error("[astrology-ai] execution guard refund failed", { message: clean(refundError?.message || refundError, 300) });
  });
}

const ASPECT_KO = { conjunction: "합", opposition: "충", square: "스퀘어", trine: "트라인", sextile: "섹스타일" };
const ASPECT_TONE = { trine: "positive", sextile: "positive", square: "caution", opposition: "caution", conjunction: "neutral" };

function pointText(point) {
  if (!point?.sign) return "";
  const degree = Number.isFinite(Number(point.degree)) ? ` ${Number(point.degree).toFixed(1)}°` : "";
  const house = Number.isFinite(Number(point.house)) ? ` · ${point.house}하우스` : "";
  return `${point.signKo || point.sign}${degree}${house}${point.retrograde ? " · 역행" : ""}`;
}

function balanceText(balance, labels) {
  return Object.entries(labels).map(([key, label]) => `${label} ${Number(balance?.[key] || 0)}`).join(" · ");
}

// 서버가 계산한 천궁도를 화면과 프롬프트가 함께 쓰는 근거 형태로 옮긴다.
function buildAstrologyAnalysisBasis(chart) {
  const planets = Array.isArray(chart?.planets) ? chart.planets : [];
  const byName = (name) => planets.find((planet) => planet.name === name) || null;
  const planetItem = (name) => {
    const planet = byName(name);
    return planet ? basisItem(PLANET_LABELS[name] || name, pointText(planet)) : null;
  };

  const coreItems = [
    chart?.sun ? basisItem("태양", pointText(chart.sun)) : null,
    chart?.moon ? basisItem("달", pointText(chart.moon)) : null,
    chart?.ascendant ? basisItem("상승궁", pointText(chart.ascendant)) : basisItem("상승궁", "출생시간 미상으로 확정하지 않음", { term: "상승궁", tone: "caution" }),
    chart?.mc ? basisItem("MC", pointText(chart.mc)) : null,
    chart?.chartRuler ? basisItem("차트 룰러", PLANET_LABELS[chart.chartRuler] || chart.chartRuler) : null,
  ];

  const personalItems = ["Mercury", "Venus", "Mars"].map(planetItem);
  const socialItems = ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"].map(planetItem);

  const balanceItems = [
    basisItem("원소", balanceText(chart?.elementBalance, { fire: "불", earth: "흙", air: "공기", water: "물" })),
    basisItem("양식", balanceText(chart?.modalityBalance, { cardinal: "활동", fixed: "고정", mutable: "변통" })),
    chart?.houseSystem ? basisItem("하우스 시스템", chart.birthTimeUnknown ? "출생시간 미상으로 제한" : chart.houseSystem) : null,
  ];

  const aspectItems = (Array.isArray(chart?.majorAspects) ? chart.majorAspects : []).slice(0, 8).map((aspect) => basisItem(
    `${aspect.planetA} ${ASPECT_KO[aspect.aspect] || aspect.aspect} ${aspect.planetB}`,
    Number.isFinite(Number(aspect.orb)) ? `오브 ${Number(aspect.orb).toFixed(2)}°` : "정확 각도",
    { term: "어스펙트", tone: ASPECT_TONE[aspect.aspect] || "neutral" },
  ));

  const transitItems = (chart?.transits?.majorAspectsToNatal || []).slice(0, 6).map((aspect) => basisItem(
    `T.${PLANET_LABELS[aspect.transitPlanet] || aspect.transitPlanet} ${ASPECT_KO[aspect.aspect] || aspect.aspect} N.${PLANET_LABELS[aspect.natalPlanet] || aspect.natalPlanet}`,
    Number.isFinite(Number(aspect.orb)) ? `오브 ${Number(aspect.orb).toFixed(2)}°` : "접근 중",
    { term: "트랜싯", tone: ASPECT_TONE[aspect.aspect] || "neutral" },
  ));

  return buildAnalysisBasisPayload({
    featureKey: FEATURE_KEY,
    groups: [
      basisGroup("core", "차트의 중심축", coreItems, { hint: "태양은 방향, 달은 감정의 결, 상승궁은 남에게 보이는 첫인상입니다." }),
      basisGroup("personal", "개인 행성", personalItems, { hint: "생각·애정·행동 방식이 어떤 무대에서 드러나는지 봅니다." }),
      basisGroup("social", "사회·세대 행성", socialItems, { hint: "성장 과제와 시대적 배경이 어디에 걸려 있는지 봅니다." }),
      basisGroup("balance", "기질의 균형", balanceItems, { hint: "어느 원소와 양식이 몰리고 비었는지가 기본 반응 방식을 알려 줍니다." }),
      basisGroup("aspects", "주요 각도", aspectItems, { hint: "트라인·섹스타일은 흐름을 매끄럽게, 스퀘어·충은 긴장을 만들되 성장을 밀어붙입니다." }),
      basisGroup("transit", "지금 하늘의 접촉", transitItems, { hint: "확정된 사건이 아니라 지금 활성화된 주제를 가리킵니다." }),
    ],
    stages: [
      basisStage("natal", "출생 하늘을 세우는 중", "태양·달·상승궁·MC", ["core"]),
      basisStage("planets", "행성을 배치하는 중", "개인·사회 행성과 하우스", ["personal", "social"]),
      basisStage("pattern", "기질의 균형을 재는 중", "원소와 양식 분포", ["balance"]),
      basisStage("aspects", "각도를 잇는 중", "주요 어스펙트", ["aspects"]),
      basisStage("transit", "지금 하늘을 겹치는 중", "현재 트랜싯", ["transit"]),
    ],
    uncertainty: chart?.birthTimeUnknown ? { birthTimeUnknown: true } : undefined,
  });
}

function publicSession(doc) {
  const raw = typeof doc?.toObject === "function" ? doc.toObject() : doc;
  return {
    ok: true,
    id: clean(raw?.id || raw?._id),
    sessionId: clean(raw?.id || raw?._id),
    status: clean(raw?.status),
    accessType: clean(raw?.accessType),
    birthInfo: raw?.birthInfo || null,
    topic: clean(raw?.topic),
    userQuestion: clean(raw?.userQuestion),
    astrologyChart: raw?.astrologyChart || null,
    // 차트는 예전부터 저장돼 있었으므로 이 변경 이전에 만들어진 상담도 근거 패널을 그대로 얻는다.
    analysisBasis: raw?.astrologyChart ? buildAstrologyAnalysisBasis(raw.astrologyChart) : null,
    chartHighlights: {
      sun: raw?.astrologyChart?.sun || null,
      moon: raw?.astrologyChart?.moon || null,
      ascendant: raw?.astrologyChart?.ascendant || null,
      chartRuler: raw?.astrologyChart?.chartRuler || "",
      keywords: raw?.astrologyChart?.consultationKeywords || [],
    },
    messages: Array.isArray(raw?.messages) ? raw.messages.map((message) => ({
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    })) : [],
    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt,
  };
}

async function handleEnsureAccess(request, env) {
  const body = await readJson(request);
  const normalized = normalizeInput(body);
  if (!normalized.ok) return invalidInput(normalized.message);
  const idempotencyKey = readIdempotencyKey(request, body);
  if (idempotencyKey.length < 12) return invalidInput(INVALID_INPUT_MESSAGE);
  console.info("[AstrologyAI] access check started", { route: "/api/astrology-ai/ensure-access", requestId: idempotencyKey });
  // 인증하면서 접근 판정에 필요한 필드까지 한 번에 읽어 authUserDoc로 받는다(resolveEnsureAccess의 재조회 제거).
  const auth = await getOptionalUserFromRequest(request, env, {
    surfaceDbInfraError: true,
    userProjection: PAID_FEATURE_ACCESS_USER_PROJECTION,
  });
  if (!auth) {
    console.warn("[AstrologyAI] access check failed", { route: "/api/astrology-ai/ensure-access", requestId: idempotencyKey, reason: "LOGIN_REQUIRED" });
    return loginRequired();
  }
  const pricing = getPricing();
  const access = await resolveEnsureAccess(env, auth, pricing, idempotencyKey, normalized.inputHash);
  if (access.ok) {
    console.info("[AstrologyAI] access check success", { route: "/api/astrology-ai/ensure-access", requestId: idempotencyKey, accessType: access.accessType });
    return json({
      ok: true,
      accessToken: await createAccessToken(env, {
        userId: auth.userId,
        accessType: access.accessType,
        idempotencyKey,
        inputHash: normalized.inputHash,
        paymentId: access.paymentId || "",
      }),
      accessType: access.accessType,
    });
  }
  if (access.reason === "LOGIN_REQUIRED") {
    console.warn("[AstrologyAI] access check failed", { route: "/api/astrology-ai/ensure-access", requestId: idempotencyKey, reason: "LOGIN_REQUIRED" });
    return loginRequired();
  }
  console.warn("[AstrologyAI] access check failed", { route: "/api/astrology-ai/ensure-access", requestId: idempotencyKey, reason: "PAYMENT_REQUIRED" });
  return paymentRequired(pricing, idempotencyKey);
}

async function handleStart(request, env, ctx) {
  const body = await readJson(request);
  const normalized = normalizeInput(body);
  if (!normalized.ok) return invalidInput(normalized.message);
  const idempotencyKey = readIdempotencyKey(request, body);
  if (idempotencyKey.length < 12) return invalidInput(INVALID_INPUT_MESSAGE);
  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return loginRequired();

  await connectDb(env);
  const pricing = getPricing();
  console.info("[AstrologyAI] access check started", { route: "/api/astrology-ai/start", requestId: idempotencyKey });
  const access = await resolveStartAccess({ request, env, auth, body, normalized, pricing, idempotencyKey });
  if (!access.ok) {
    console.warn("[AstrologyAI] access check failed", { route: "/api/astrology-ai/start", requestId: idempotencyKey, reason: access.reason || "PAYMENT_VERIFY_FAILED" });
    if (access.reason === "LOGIN_REQUIRED") return loginRequired();
    if (access.reason === "INVALID_INPUT") return invalidInput(access.message, 409);
    return json({ ok: false, reason: "PAYMENT_VERIFY_FAILED", message: PAYMENT_VERIFY_FAILED_MESSAGE }, { status: 402 });
  }
  console.info("[AstrologyAI] access check success", { route: "/api/astrology-ai/start", requestId: idempotencyKey, accessType: access.accessType, source: access.source });

  const existing = await AstrologyAiConsultation.findOne({ userId: auth.userId, idempotencyKey }).lean();
  if (existing && clean(existing.inputHash) !== normalized.inputHash) {
    return invalidInput("같은 요청 키로 다른 상담 정보를 사용할 수 없습니다.", 409);
  }
  if (existing?.status === "completed") return json(publicSession(existing));
  // 신선도 창은 최악 파이프라인(차트 계산 + 초기 150s + expand 150s + condense 150s) + 마진.
  // 창이 파이프라인보다 짧으면 재-POST가 진행 중 생성을 중복 기동한다(찻집 390s 락과 같은 원리).
  if (existing?.status === "generating" && Date.now() - new Date(existing.updatedAt || existing.createdAt).getTime() < 480000) {
    return json({ ok: true, sessionId: existing.id, status: "generating", message: "행성과 별자리의 흐름을 읽고 있습니다" }, { status: 202 });
  }

  const sessionId = existing?.id || `astroai_${clean(auth.userId).slice(-8)}_${Date.now().toString(36)}`;
  const now = new Date();
  const seed = {
    id: sessionId,
    userId: auth.userId,
    idempotencyKey,
    inputHash: normalized.inputHash,
    birthInfo: normalized.input.birthInfo,
    topic: normalized.input.topic,
    userQuestion: normalized.input.userQuestion,
    astrologyChart: null,
    accessType: access.accessType,
    paymentId: clean(access.paymentId, 160),
    messages: [],
    status: "generating",
    generationError: null,
  };

  if (existing) {
    await AstrologyAiConsultation.updateOne({ id: existing.id }, { $set: { ...seed, updatedAt: now } });
  } else {
    try {
      await AstrologyAiConsultation.create(seed);
    } catch (error) {
      if (error?.code === 11000) {
        const duplicate = await AstrologyAiConsultation.findOne({ userId: auth.userId, idempotencyKey }).lean();
        if (duplicate?.status === "completed") return json(publicSession(duplicate));
        return json({ ok: true, sessionId: duplicate?.id || sessionId, status: "generating", message: "행성과 별자리의 흐름을 읽고 있습니다" }, { status: 202 });
      }
      throw error;
    }
  }

  await startRefundableExecution(env, auth, access, idempotencyKey, sessionId, pricing);
  // 결제/이용권 확인·"생성중" 문서·환불예약이 끝난 이 시점에 즉시 202를 돌려주고, 생성은 백그라운드(waitUntil)에서 완주한다.
  // 클라는 /result 폴링으로 수렴한다(ziwei·찻집과 동일). 실패 시 환불·generation_failed 기록은 아래 catch가 백그라운드에서도 수행한다.
  const runGeneration = async () => {
  try {
    console.info("[AstrologyAI] generation started", { route: "/api/astrology-ai/start", requestId: idempotencyKey, sessionId });
    const chart = await calculateAstrologyChart(env, normalized, request.url);
    // 섹션 분할 생성 — 한 호출에 1만~2만자를 요구하던 구조가 expand/condense 재생성을
    // 상시 유발했다(출력 2~3배). 섹션당 목표는 모델이 한 번에 채우는 크기로 잡는다.
    // 폴백 문턱은 섹션 단위(각 섹션 목표의 40%)로 내려가 있다.
    const generated = await generateSectionedConsultation(env, normalized.input, chart, {
      minLength: ASTROLOGY_AI_MIN_RESULT_CHARS,
      maxLength: ASTROLOGY_AI_MAX_RESULT_CHARS,
      sectionMaxOutputTokens: Number(env.ASTROLOGY_AI_SECTION_MAX_OUTPUT_TOKENS || 9600),
      requireExpertParts: true,
    });
    await applyUsageOnce({ userId: auth.userId, sessionId, accessType: access.accessType, pricing, source: access.source });
    await recordSuccessfulUsage(auth, idempotencyKey, access, sessionId, pricing);
    const completed = await AstrologyAiConsultation.findOneAndUpdate(
      { id: sessionId },
      {
        $set: {
          status: "completed",
          astrologyChart: chart,
          messages: [
            { role: "user", content: normalized.input.userQuestion || normalized.input.topic, createdAt: now },
            { role: "assistant", content: generated.content, createdAt: new Date() },
          ],
          llmMeta: { provider: generated.provider, model: generated.model, completedAt: new Date().toISOString(), quality: generated.quality },
          generationError: null,
        },
      },
      { new: true },
    ).lean();
    await completeRefundableExecution(env, auth, idempotencyKey, sessionId);
    console.info("[AstrologyAI] generation success", { requestId: idempotencyKey, sessionId, provider: generated.provider, model: generated.model });
    console.info("[AstrologyAI] result saved", { requestId: idempotencyKey, resultId: sessionId });
    return json(publicSession(completed));
  } catch (error) {
    await failRefundableExecution(env, auth, idempotencyKey, sessionId, error);
    await AstrologyAiConsultation.updateOne(
      { id: sessionId },
      {
        $set: {
          status: "generation_failed",
          generationError: {
            code: clean(error?.code || "GENERATION_FAILED", 80),
            message: clean(error?.message || error, 500),
            at: new Date().toISOString(),
          },
        },
      },
    ).catch(() => {});
    const isCalculationError = clean(error?.code).startsWith("ASTRO_") || Number(error?.status) === 400;
    return json({
      ok: false,
      reason: isCalculationError ? "CALCULATION_ERROR" : "LLM_ERROR",
      message: isCalculationError ? CALCULATION_ERROR_MESSAGE : LLM_ERROR_MESSAGE,
    }, { status: isCalculationError ? 422 : 503 });
  }
  };

  // 동기 생성: 요청 안에서 완결해 완료 결과를 바로 반환한다. waitUntil 백그라운드+/result 폴링은 공유 DB 연결을
  // 여러 요청이 재사용하게 만들어 Cloudflare Workers 요청 간 I/O 격리로 결과가 고착되던 문제가 있어 쓰지 않는다(네오와 동일).
  return await runGeneration();
}

async function handleResult(request, env, pathId = "") {
  const url = new URL(request.url);
  const rawId = pathId || url.searchParams.get("id") || "";
  let resultId = "";
  try {
    resultId = clean(decodeURIComponent(rawId), 120);
  } catch (_) {
    resultId = clean(rawId, 120);
  }
  if (!resultId) return invalidInput(RESULT_NOT_FOUND_MESSAGE, 404);

  // 폴링은 이미 인가된 세션의 결과 조회다. 인증 판정에서 일시적 DB 장애가 나면 하드 503으로 끊지 말고
  // 재시도 가능하다는 신호를 실어 보내 클라가 폴링을 이어가게 한다(nakshatra/neo와 동일한 완충).
  let auth = null;
  try {
    auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  } catch (error) {
    return json({
      ok: false,
      retryable: true,
      reason: "DB_DEGRADED",
      message: "일시적인 연결 문제가 있어요. 잠시 후 다시 시도해 주세요.",
    }, { status: 503 });
  }
  if (!auth) return loginRequired();

  await connectDb(env);
  const consultation = await AstrologyAiConsultation.findOne({
    id: resultId,
    userId: auth.userId,
  }).lean();
  if (!consultation) {
    return json({ ok: false, reason: "RESULT_NOT_FOUND", message: RESULT_NOT_FOUND_MESSAGE }, { status: 404 });
  }
  // 생성 중이면 202로 알려 클라이언트 폴링이 수렴하게 한다(start의 202 바디와 동일 형태).
  if (consultation.status === "generating") {
    return json(
      { ok: true, sessionId: consultation.id, status: "generating", message: "행성과 별자리의 흐름을 읽고 있습니다" },
      { status: 202, headers: { "Retry-After": "3" } },
    );
  }
  if (consultation.status !== "completed") {
    return json({ ok: false, reason: "GENERATION_FAILED", message: LLM_ERROR_MESSAGE }, { status: 409 });
  }

  const payload = publicSession(consultation);
  const assistantContent = payload.messages.find((message) => message.role === "assistant")?.content || "";
  if (!assistantContent.trim()) {
    console.error("[AstrologyAI] generation empty result", { resultId });
    return json({ ok: false, reason: "RESULT_EMPTY", message: LLM_ERROR_MESSAGE }, { status: 409 });
  }
  return json(payload);
}

async function handleMessage(request, env) {
  const body = await readJson(request);
  const sessionId = clean(body?.sessionId || body?.consultationId, 120);
  const message = clean(body?.message || body?.question, 1400);
  if (!sessionId || message.length < 2) return invalidInput(INVALID_INPUT_MESSAGE);
  const auth = await getOptionalUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth) return loginRequired();

  await connectDb(env);
  const consultation = await AstrologyAiConsultation.findOne({
    id: sessionId,
    userId: auth.userId,
    status: "completed",
  }).lean();
  if (!consultation) return invalidInput("상담 세션을 찾지 못했습니다.", 404);

  try {
    const generated = await generateConsultation(env, buildFollowUpPrompt(consultation, message), {
      minLength: ASTROLOGY_AI_MIN_FOLLOWUP_CHARS,
      maxOutputTokens: 4500,
      temperature: 0.7,
    });
    const updated = await AstrologyAiConsultation.findOneAndUpdate(
      { id: sessionId, userId: auth.userId },
      {
        $push: {
          messages: {
            $each: [
              { role: "user", content: message, createdAt: new Date() },
              { role: "assistant", content: generated.content, createdAt: new Date() },
            ],
          },
        },
        $set: {
          llmMeta: { provider: generated.provider, model: generated.model, updatedAt: new Date().toISOString(), lastMessageQuality: generated.quality },
        },
      },
      { new: true },
    ).lean();
    return json(publicSession(updated));
  } catch (error) {
    console.error("[astrology-ai] follow-up failed", { message: clean(error?.message || error, 300) });
    return json({ ok: false, reason: "LLM_ERROR", message: LLM_ERROR_MESSAGE }, { status: 503 });
  }
}

// 계산 근거만 즉시 돌려준다 — LLM 미호출, DB 접근 없음, 과금 없음.
// 신원 확인은 로컬 JWT 검증만 써서 Mongo를 건드리지 않고, 트랜싯은 건너뛰어 대기 화면을 빨리 채운다.
async function handleBasis(request, env) {
  const userId = await peekAccessTokenUserId(request, env);
  if (!userId) return loginRequired();

  const normalized = normalizeInput(await readJson(request));
  if (!normalized.ok) return invalidInput(normalized.message || INVALID_INPUT_MESSAGE);

  try {
    const chart = await calculateAstrologyChart(env, normalized, request.url, { skipTransits: true });
    return json(buildAstrologyAnalysisBasis(chart));
  } catch (error) {
    console.warn("[astrology-ai] basis failed", { message: clean(error?.message || error, 300) });
    return json({ ok: false, reason: "CALCULATION_FAILED" }, { status: 503 });
  }
}

export async function handleAstrologyAiRoutes(request, env = {}, ctx) {
  const method = request.method.toUpperCase();
  const path = getRoutePath(request, "/api/astrology-ai");
  try {
    if (method === "GET" && path === "/result") return await handleResult(request, env);
    if (method === "GET" && path.startsWith("/result/")) return await handleResult(request, env, path.slice("/result/".length));
    if (method === "POST" && path === "/basis") return await handleBasis(request, env);
    if (method === "POST" && path === "/ensure-access") return await handleEnsureAccess(request, env);
    if (method === "POST" && path === "/start") return await handleStart(request, env, ctx);
    if (method === "POST" && path === "/message") return await handleMessage(request, env);
    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    console.error("[astrology-ai]", clean(error?.stack || error?.message || error, 1200));
    // 풀 초기화 버스트/인증 조회 중 일시 DB 장애는 재시도 신호와 함께 503으로 — 하드 500 방지.
    if (isTransientMongoError(error) || isAuthDbInfraError(error)) {
      return json({
        ok: false,
        retryable: true,
        reason: "DB_DEGRADED",
        message: "일시적인 연결 문제가 있어요. 잠시 후 다시 시도해 주세요.",
      }, { status: 503 });
    }
    return serverError();
  }
}

export const __astrologyAiTestUtils = {
  FEATURE_KEY,
  SERVICE_KEY,
  normalizeInput,
  calculateAstrologyChart,
  buildAstrologyAnalysisBasis,
  ASTROLOGY_SECTIONS,
  buildSectionPrompt,
  generateSectionedConsultation,
  sanitizeConsultationText,
  getConsultationQualityIssues,
  ASTROLOGY_AI_MIN_RESULT_CHARS,
  ASTROLOGY_AI_MAX_RESULT_CHARS,
};
