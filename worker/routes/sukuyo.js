import { primeCmsRecords } from "../lib/cms-records.js";
import { Solar } from "lunar-javascript";
import { cookieValue, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { getOptionalUserFromRequest, requireAuth, resolvePaidRouteAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { buildCanonicalSukuyoCompatibility, buildSukuyoFromLunar } from "../lib/sukuyo-premium.js";
import { judgeDayFortune } from "../lib/sukuyo-relation-core.js";
import { connectDb, withMongoRetry } from "../lib/db.js";
import {
  CONTENT_ENTITLEMENT_SOURCES,
  Payment,
  PointHistory,
  ProfileCard,
  ServiceExecutionTransaction,
  User,
} from "../lib/models.js";
import { findActivePaidContentUnlockByServiceKeys, upsertPaidContentUnlock } from "../lib/content-unlocks.js";
const SUKUYO_SESSION_LOCK_TTL_MS = 20 * 60 * 1000;
const SUKUYO_EXECUTION_STALE_MS = 25 * 60 * 1000;
const SUKYO_COMPAT_TOKEN_MIN_COINS = 300;
const SUKYO_COMPAT_AI_TITLE = "숙요점 궁합 전문가 상담";
const SUKYO_COMPAT_AI_ROUTE = "/api/sukuyo/compatibility-ai-consultation";
const SUKYO_COMPAT_AI_AMOUNT_KRW = 30000;
const SUKYO_COMPAT_AI_PRICE_COINS = 300;
const SUKYO_YEARLY_FORTUNE_PRICE_KRW = 10000;
const SUKYO_YEARLY_FORTUNE_PRICE_COINS = 100;
const SUKYO_YEARLY_FORTUNE_PRODUCT_KEY = "sukyo_yearly_fortune_unlock";
const SUKYO_YEARLY_FORTUNE_SERVICE_KEY = "sukuyo";
const sukuyoPdfGenerationLocks = new Map();
function sukuyoCompatibilityAiMovedResponse() {
  return json({
    ok: false,
    code: "SUKUYO_COMPATIBILITY_AI_ROUTE_MOVED",
    message: "숙요점 궁합 전문가 상담은 새 상담 전용 API를 사용합니다.",
    next: "/api/sukuyo-compatibility-ai/start",
  }, { status: 410 });
}
const SUKUYO_CALENDAR_TIMEZONE = "Asia/Seoul";
const SUKUYO_CALENDAR_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const SUKYO_COMPAT_AI_CATEGORY_LABELS = Object.freeze({
  flirting: "썸",
  crush: "짝사랑",
  dating: "연애 중",
  reunion: "이별 후 재회",
  contact: "연락 타이밍",
  burnout: "권태기",
  marriage: "결혼/장기 관계",
  secret: "비밀스러운 관계",
  distant: "멀어진 관계",
  new_connection: "새로 알게 된 인연",
  ending: "나쁜 관계 정리",
  general: "종합 궁합",
});
const SUKYO_COMPAT_AI_SYSTEM_PROMPT = [
  "너는 숙요점 27숙 궁합을 깊이 이해한 연애 상담가다.",
  "사용자와 상대방의 본명숙, 숙요 관계 유형, 거리감, 기존 엔진의 궁합 데이터를 바탕으로 답한다.",
  "관계 유형은 반드시 제공된 계산 결과만 사용하고 임의로 지어내지 않는다.",
  "근거리/중거리/원거리 정보가 비어 있으면 거리감 명칭을 새로 만들지 않는다.",
  "상대방 마음을 확정하지 않는다.",
  "사용자의 질문에 직접 답하되, 조작·집착·스토킹·압박을 유도하지 않는다.",
  "상대방의 거절과 경계는 존중해야 한다.",
  "무조건적인 재회 확정, 이별 확정, 결혼 확정 같은 단정 표현을 피한다.",
  "결과는 한국어로 작성한다.",
  "숙요점 용어는 사용하되 일반 사용자도 이해할 수 있게 풀어쓴다.",
  "사용자가 실제로 선택하고 행동할 수 있는 관계 전략을 제안한다.",
  "PDF, 챕터, 다운로드, 리포트 렌더링 같은 표현은 쓰지 않는다.",
].join("\n");
const SUKYO_COMPAT_AI_FORBIDDEN_PATTERNS = [
  /이\s*기능은/,
  /이\s*결과는/,
  /분석\s*결과는/,
  /PDF/i,
  /챕터/,
  /다운로드/,
  /렌더링/,
  /mock/i,
  /프롬프트/,
  /내부\s*지시문/,
];

function clean(value) {
  return String(value == null ? "" : value).trim();
}

function withSukuyoTimeout(promise, timeoutMs = 2500, fallback = null) {
  let timer = null;
  return Promise.race([
    promise,
    new Promise((resolve) => {
      timer = setTimeout(() => resolve(fallback), Math.max(1, Number(timeoutMs) || 2500));
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function toNumber(value, fallback = NaN) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function padSukuyoCalendar2(value) {
  return String(Number(value)).padStart(2, "0");
}

function formatSukuyoCalendarDateKey(year, month, day) {
  return `${String(Number(year)).padStart(4, "0")}-${padSukuyoCalendar2(month)}-${padSukuyoCalendar2(day)}`;
}

function readSukuyoCalendarKstDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SUKUYO_CALENDAR_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
  };
}

function getSukuyoCalendarTodayKey(date = new Date()) {
  const today = readSukuyoCalendarKstDateParts(date);
  return formatSukuyoCalendarDateKey(today.year, today.month, today.day);
}

function normalizeSukuyoCalendarYearMonth(yearInput, monthInput) {
  const year = Number(yearInput);
  const month = Number(monthInput);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    throw new Error("연도는 1900년부터 2100년 사이로 입력해주세요.");
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("월은 1월부터 12월 사이로 입력해주세요.");
  }
  return { year, month };
}

function getSukuyoCalendarDaysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0, 0, 0, 0)).getUTCDate();
}

function getSukuyoCalendarWeekdayIndex(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0)).getUTCDay();
}

function formatSukuyoCalendarMansionName(sukuyo = {}) {
  const name = clean(sukuyo.nameKo || sukuyo.name || "");
  if (!name) return "미산출";
  return /[수숙]$/.test(name) ? name : `${name}수`;
}

function buildSukuyoCalendarKeywords(sukuyo = {}) {
  const values = []
    .concat(Array.isArray(sukuyo.keywords) ? sukuyo.keywords : [])
    .concat(Array.isArray(sukuyo.strengths) ? sukuyo.strengths : []);
  return Array.from(new Set(values.map(clean).filter(Boolean))).slice(0, 4);
}

function buildSukuyoCalendarInterpretation(sukuyo = {}) {
  const name = formatSukuyoCalendarMansionName(sukuyo);
  const keywords = buildSukuyoCalendarKeywords(sukuyo);
  const keyword = keywords[0] || "달빛 리듬";
  const strength = clean(Array.isArray(sukuyo.strengths) ? sukuyo.strengths[0] : "") || keyword;
  const shadow = clean(Array.isArray(sukuyo.shadows) ? sukuyo.shadows[0] : "") || "마음의 과속";
  const archetype = clean(sukuyo.archetypeTitle) || `${name}의 달빛`;
  return {
    keywords,
    core: `${archetype}이 떠오르는 날입니다. ${keyword}의 기운이 강하게 드러나며, 마음이 향해야 할 방향을 조용히 가리킵니다.`,
    usagePoint: `${strength}을 살릴 때 흐름이 부드럽게 열립니다. 약속, 선택, 정리할 일을 한 가지 기준으로 묶어 보세요.`,
    caution: `${shadow}으로 기울면 말과 판단이 급해질 수 있습니다. 잠시 숨을 고르고 사실과 감정을 나누어 보세요.`,
    love: `관계에서는 ${keyword}의 결이 먼저 비춥니다. 다가갈 때는 온도를 낮추고, 물러설 때도 마음의 예의를 남기는 편이 좋습니다.`,
    workMoney: `일과 금전은 ${strength}을 중심으로 흐릅니다. 새로 벌리기보다 오늘 잡히는 기준을 숫자와 일정으로 남기세요.`,
    advice: `${name}의 달빛은 ${keyword}을 가리킵니다. 오늘은 크게 흔들기보다 한 가지 선택을 곱게 매듭지으세요.`,
  };
}

function buildSukuyoCalendarDay(year, month, day, todayKey, myMansionIndex = null) {
  const solar = Solar.fromYmdHms(year, month, day, 12, 0, 0);
  const lunar = solar.getLunar();
  const lunarMonthRaw = Number(lunar.getMonth());
  const lunarMonth = Math.abs(lunarMonthRaw);
  const lunarDay = Number(lunar.getDay());
  const sukuyo = buildSukuyoFromLunar(lunarMonth, lunarDay, {
    isLeapMonth: lunarMonthRaw < 0,
    source: "lunar-javascript",
  });
  const mansionIndex = Number(sukuyo?.index);
  if (!Number.isInteger(mansionIndex) || mansionIndex < 0 || mansionIndex > 26) {
    throw new Error("숙요 계산값을 달력 표기로 연결하지 못했습니다.");
  }
  const date = formatSukuyoCalendarDateKey(year, month, day);
  const weekdayIndex = getSukuyoCalendarWeekdayIndex(year, month, day);
  const reading = buildSukuyoCalendarInterpretation(sukuyo);
  return {
    date,
    day,
    weekday: SUKUYO_CALENDAR_WEEKDAYS[weekdayIndex],
    weekdayIndex,
    mansionIndex,
    mansionKey: `sukuyo-${String(mansionIndex + 1).padStart(2, "0")}`,
    koreanName: formatSukuyoCalendarMansionName(sukuyo),
    hanjaName: `${clean(sukuyo.nameHan || "")}宿`,
    japaneseName: clean(sukuyo.nameJp || ""),
    keywords: reading.keywords,
    isToday: date === todayKey,
    lunarDate: {
      year: Number.isFinite(Number(lunar.getYear())) ? Number(lunar.getYear()) : null,
      month: lunarMonth,
      day: lunarDay,
      isLeapMonth: lunarMonthRaw < 0,
    },
    core: reading.core,
    usagePoint: reading.usagePoint,
    caution: reading.caution,
    love: reading.love,
    workMoney: reading.workMoney,
    advice: reading.advice,
    // 본명수(로그인+프로필)가 있을 때만 그날의 개인화 길흉을 붙인다. 없으면 null.
    dayFortune: Number.isInteger(myMansionIndex) ? judgeDayFortune(myMansionIndex, mansionIndex) : null,
  };
}

function buildSukuyoCalendarMonth(yearInput, monthInput, myMansionIndex = null) {
  const { year, month } = normalizeSukuyoCalendarYearMonth(yearInput, monthInput);
  const today = getSukuyoCalendarTodayKey();
  const daysInMonth = getSukuyoCalendarDaysInMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, index) =>
    buildSukuyoCalendarDay(year, month, index + 1, today, myMansionIndex)
  );
  return {
    year,
    month,
    timezone: SUKUYO_CALENDAR_TIMEZONE,
    monthKey: `${String(year).padStart(4, "0")}-${padSukuyoCalendar2(month)}`,
    today,
    firstWeekdayIndex: getSukuyoCalendarWeekdayIndex(year, month, 1),
    daysInMonth,
    viewerHasMansion: Number.isInteger(myMansionIndex),
    days,
  };
}

// 로그인 + 프로필 생년월일이 있으면 본명수(27수) 인덱스를 도출. 익명이거나 DB 블립이면 null.
// 달력은 공개 화면이므로 인증/DB 실패로 절대 깨지지 않게 전부 삼킨다.
async function resolveSukuyoViewerMansionIndex(request, env) {
  try {
    // 인증 조회에 projection 을 주면 이 화면이 필요로 하는 유일한 필드를 그때 함께 읽어 온다 —
    // 공개 달력 한 번에 users 를 두 번 읽던 것이 한 번이 된다.
    const auth = await getOptionalUserFromRequest(request, env, { userProjection: { destinyProfilesCurrentId: 1 } });
    if (!auth?.userId) return null;
    // 선행 connectDb 없이 withMongoRetry 한 번으로 묶는다. raw read 는 타임아웃 래퍼가 없어 죽은 소켓에서
    // socketTimeout(20s)까지 매달렸다 — 감싸면 상한이 11.5s 로 잡히고 일시 블립도 흡수된다.
    // 바깥 try/catch 의 삼킴은 그대로다(달력은 공개 화면이라 개인화 실패 시 조용히 비개인화로 떨어진다).
    const profile = await withMongoRetry(env, async () => {
      const user = auth.authUserDoc || await User.findById(auth.userId).select("destinyProfilesCurrentId").lean();
      const profileId = clean(user?.destinyProfilesCurrentId);
      return profileId
        ? await ProfileCard.findOne({ userId: auth.userId, profileId }).lean()
        : await ProfileCard.findOne({ userId: auth.userId }).sort({ updatedAt: -1, createdAt: -1 }).lean();
    });
    const lunar = resolveSukuyoLunarFromProfile(profile);
    if (!lunar) return null;
    const natal = buildSukuyoFromLunar(lunar.month, lunar.day, { isLeapMonth: lunar.isLeap, source: "profile-canonical" });
    const index = Number(natal?.index);
    return Number.isInteger(index) && index >= 0 && index <= 26 ? index : null;
  } catch (error) {
    console.warn("[sukuyo-calendar-personalize-skip]", error?.message || error);
    return null;
  }
}

async function handleSukuyoCalendar(request, env) {
  // 해설 표 오버라이드를 조립 전에 채운다(동기 접근자가 읽기 때문).
  // 실패해도 내부에서 삼키고 코드 기본값으로 진행한다.
  await primeCmsRecords(env);

  try {
    const url = new URL(request.url);
    const myMansionIndex = await resolveSukuyoViewerMansionIndex(request, env);
    const calendar = buildSukuyoCalendarMonth(url.searchParams.get("year"), url.searchParams.get("month"), myMansionIndex);
    return json({
      ok: true,
      ...calendar,
    });
  } catch (error) {
    console.error("[sukuyo-calendar-error]", error);
    return json({
      ok: false,
      code: "SUKUYO_CALENDAR_FAILED",
      // 내부 에러 원문은 로그로만 남기고 사용자에게는 안내문만 노출한다.
      error: "숙요 달력을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    }, { status: 400 });
  }
}

function normalizeSukuyoError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === "object" && error !== null) {
    try {
      return JSON.parse(JSON.stringify(error));
    } catch {
      return {
        message: String(error),
      };
    }
  }

  return {
    message: String(error),
  };
}

function getSukuyoSessionId(body = {}) {
  const raw = clean(body?.sessionId || body?.requestId || body?.reportId);
  return raw || `sukyo-session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function cleanupExpiredSukuyoLocks() {
  const now = Date.now();
  for (const [key, value] of sukuyoPdfGenerationLocks.entries()) {
    const startedAtMs = Date.parse(value?.startedAt || "") || 0;
    if (startedAtMs <= 0 || now - startedAtMs > SUKUYO_SESSION_LOCK_TTL_MS) {
      sukuyoPdfGenerationLocks.delete(key);
    }
  }
}

function parseDateParts(value) {
  const raw = clean(value);
  const match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const year = toNumber(match[1]);
  const month = toNumber(match[2]);
  const day = toNumber(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

const KOREAN_HOUR_MAP = {
  자시: 23,
  축시: 1,
  인시: 3,
  묘시: 5,
  진시: 7,
  사시: 9,
  오시: 11,
  미시: 13,
  신시: 15,
  유시: 17,
  술시: 19,
  해시: 21,
};

function parseTimeParts(value) {
  const raw = clean(value);
  const lower = raw.toLowerCase();

  if (!raw || /모름|unknown/.test(lower)) {
    return { hour: 12, minute: 0, hasTime: false, isTimeUnknown: true, normalizedTime: "" };
  }

  if (Number.isFinite(KOREAN_HOUR_MAP[raw])) {
    const hour = KOREAN_HOUR_MAP[raw];
    return { hour, minute: 0, hasTime: true, isTimeUnknown: false, normalizedTime: `${String(hour).padStart(2, "0")}:00` };
  }

  let hour = null;
  let minute = 0;

  const hhmm = lower.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (hhmm) {
    hour = Number(hhmm[1]);
    minute = Number(hhmm[2] || "0");
  }

  const korean = lower.match(/^(오전|오후)\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분?)?$/);
  if (korean) {
    const base = Number(korean[2]);
    const isPm = korean[1] === "오후";
    hour = base % 12;
    if (isPm) hour += 12;
    minute = Number(korean[3] || "0");
  }

  if (!Number.isFinite(hour) || hour < 0 || hour > 23 || !Number.isFinite(minute) || minute < 0 || minute > 59) {
    return { hour: 12, minute: 0, hasTime: false, isTimeUnknown: true, normalizedTime: "" };
  }

  return {
    hour,
    minute,
    hasTime: true,
    isTimeUnknown: false,
    normalizedTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
}

function normalizeGender(raw) {
  const token = clean(raw).toLowerCase();
  if (["m", "male", "man", "남", "남성", "남자"].includes(token)) return "male";
  if (["f", "female", "woman", "여", "여성", "여자"].includes(token)) return "female";
  return "unknown";
}

function normalizeCalendarType(raw) {
  const token = clean(raw).toLowerCase();
  if (token.includes("lunar_leap") || token.includes("lunar-leap") || token.includes("leap") || token.includes("\uc724")) return "lunar_leap";
  if (token.includes("solar") || token.includes("양")) return "solar";
  if (token.includes("lunar") || token.includes("음")) return "lunar";
  return "unknown";
}

function normalizeRequestedMode(raw) {
  const token = clean(raw).toLowerCase();
  if (["compatibility", "compat", "couple", "궁합"].some((v) => token.includes(v))) return "compatibility";
  if (["personal", "solo", "single", "개인", "나만"].some((v) => token.includes(v))) return "personal";
  return "compatibility";
}

function normalizePersonInput(raw = {}, fallbackName = "사용자") {
  const profile = raw.profile && typeof raw.profile === "object" ? raw.profile : raw;
  const birthDate = clean(
    profile.birthDate
      || profile.birthday
      || profile.solarDate
      || profile.lunarDate
      || profile.date
      || profile.partnerBirth
      || profile.partnerBirthDate
      || profile.targetBirth
      || profile.targetDate,
  );

  const date = parseDateParts(birthDate);
  const time = parseTimeParts(
    profile.birthTime
      || profile.time
      || profile.partnerTime
      || profile.hour
      || profile.birth_hour,
  );

  return {
    name: clean(profile.name || profile.label || fallbackName),
    gender: normalizeGender(profile.gender || profile.sex),
    calendarType: normalizeCalendarType(profile.calendarType || profile.calType),
    isLeapMonth: profile.isLeapMonth === true || profile.leapMonth === true || normalizeCalendarType(profile.calendarType || profile.calType) === "lunar_leap",
    birthDate,
    birthYear: date?.year ?? null,
    birthMonth: date?.month ?? null,
    birthDay: date?.day ?? null,
    birthTime: time.normalizedTime,
    birthHour: time.hasTime ? time.hour : null,
    birthMinute: time.hasTime ? time.minute : null,
    timezone: clean(profile.timezone || "Asia/Seoul") || "Asia/Seoul",
    isTimeUnknown: time.isTimeUnknown,
  };
}

function buildSukuyoGenderValidationError(input) {
  const fieldErrors = {};
  const missing = [];
  if (!["male", "female"].includes(clean(input?.self?.gender))) {
    missing.push("self.gender");
    fieldErrors.skSelfGender = "나의 성별을 남자 또는 여자로 선택해 주세요.";
  }
  if (!["male", "female"].includes(clean(input?.partner?.gender))) {
    missing.push("partner.gender");
    fieldErrors.skPartnerGender = "상대방 성별을 남자 또는 여자로 선택해 주세요.";
  }
  if (!missing.length) return null;
  return {
    ok: false,
    code: "SUKUYO_GENDER_REQUIRED",
    message: "숙요점 프리미엄 PDF는 두 사람의 성별을 남자 또는 여자로 확정해야 생성할 수 있습니다.",
    hardMissingFields: missing,
    fieldErrors,
  };
}

function toLunarBirth(person) {
  if (!Number.isFinite(person.birthYear) || !Number.isFinite(person.birthMonth) || !Number.isFinite(person.birthDay)) {
    throw Object.assign(new Error("두 사람의 생년월일을 정확히 입력해 주세요."), { status: 400, code: "SUKUYO_MISSING_BIRTH" });
  }

  if (person.calendarType === "lunar" || person.calendarType === "lunar_leap") {
    return {
      lunarYear: person.birthYear,
      lunarMonth: person.birthMonth,
      lunarDay: person.birthDay,
      isLeapMonth: person.calendarType === "lunar_leap" || person.isLeapMonth === true,
      source: "user-lunar-input",
    };
  }

  const hour = Number.isFinite(person.birthHour) ? person.birthHour : 12;
  const minute = Number.isFinite(person.birthMinute) ? person.birthMinute : 0;
  const solar = Solar.fromYmdHms(person.birthYear, person.birthMonth, person.birthDay, hour, minute, 0);
  const lunar = solar.getLunar();
  const lunarMonth = Number(lunar.getMonth());

  return {
    lunarYear: Number(lunar.getYear()),
    lunarMonth: Math.abs(lunarMonth),
    lunarDay: Number(lunar.getDay()),
    isLeapMonth: lunarMonth < 0,
    source: "lunar-javascript",
  };
}

function buildPersonSukuyo(person) {
  const lunar = toLunarBirth(person);
  const sukuyo = buildSukuyoFromLunar(lunar.lunarMonth, lunar.lunarDay, {
    isLeapMonth: lunar.isLeapMonth,
    source: lunar.source,
  });
  if (!sukuyo) {
    throw Object.assign(new Error("숙요점 27숙 계산에 실패했습니다."), { status: 422, code: "SUKUYO_CALC_FAILED" });
  }
  return { ...sukuyo, lunarYear: lunar.lunarYear };
}

function normalizeCompatibilityInput(body = {}) {
  const mode = normalizeRequestedMode(body?.mode || body?.reportMode || body?.questionType);
  const self = normalizePersonInput(body.self || body.user || body.userProfile || body.birthInput || {}, "사용자");
  const partner = normalizePersonInput(body.partner || body.partnerProfile || body.partnerInput || {}, "상대방");
  return { mode, self, partner };
}

function buildSukyoCompatibilityAIError(code, message, status = 400, extra = {}) {
  return json({
    ok: false,
    code: clean(code || "SUKYO_COMPAT_AI_FAILED"),
    message: clean(message || "숙요점 궁합 전문가 상담을 생성하지 못했습니다."),
    ...extra,
  }, { status });
}

function logSukyoCompatibilityAI(event, details = {}) {
  const marker = `[SukyoCompatibility AI Consultation] ${event}`;
  const payload = {
    hasEnvAI: details.hasEnvAI === true,
    providerName: clean(details.providerName || ""),
    isMock: details.isMock === true,
    dryRun: details.dryRun === true,
    category: clean(details.category || ""),
    questionLength: Math.max(0, Number(details.questionLength || 0)),
    personAMansionCalculated: details.personAMansionCalculated === true,
    personBMansionCalculated: details.personBMansionCalculated === true,
    relationshipType: clean(details.relationshipType || ""),
    distanceType: clean(details.distanceType || ""),
    llmLatencyMs: Number.isFinite(Number(details.llmLatencyMs)) ? Number(details.llmLatencyMs) : undefined,
    errorCode: clean(details.errorCode || ""),
    authSource: clean(details.authSource || ""),
    tokenVerified: details.tokenVerified === true,
  };
  try {
    console.info(marker, payload);
  } catch {
    console.info(marker);
  }
}

function hasSukyoAIProviderEnv(env = {}) {
  return Boolean(
    env?.AI
    || env?.GEMINIF_API_KEY
    || env?.GEMINI_API_KEY
    || env?.GOOGLE_GEMINI_API_KEY
    || env?.GOOGLE_GENERATIVE_AI_API_KEY
    || env?.GOOGLE_AI_API_KEY
    || env?.AI_GATEWAY_TOKEN
    || env?.OPENAI_API_KEY
  );
}

function normalizeSukyoAIConsultationCategory(raw) {
  const token = clean(raw).toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  const alias = {
    some: "flirting",
    flirting: "flirting",
    썸: "flirting",
    crush: "crush",
    짝사랑: "crush",
    dating: "dating",
    love: "dating",
    연애: "dating",
    "연애_중": "dating",
    reunion: "reunion",
    재회: "reunion",
    contact: "contact",
    연락: "contact",
    "연락_타이밍": "contact",
    burnout: "burnout",
    권태기: "burnout",
    marriage: "marriage",
    결혼: "marriage",
    "장기_관계": "marriage",
    secret: "secret",
    "비밀스러운_관계": "secret",
    distant: "distant",
    "멀어진_관계": "distant",
    new: "new_connection",
    new_connection: "new_connection",
    "새로운_인연": "new_connection",
    "새로_알게_된_인연": "new_connection",
    ending: "ending",
    "나쁜_관계_정리": "ending",
    general: "general",
    "종합_궁합": "general",
  };
  const mapped = alias[token] || token;
  return Object.prototype.hasOwnProperty.call(SUKYO_COMPAT_AI_CATEGORY_LABELS, mapped) ? mapped : "general";
}

function normalizeSukyoAIProfiles(body = {}) {
  const selfSource = body.self || body.personA || body.user || body.userProfile || body.birthInput || {
    name: body.name || body.userName || body.selfName,
    gender: body.gender || body.selfGender,
    birthDate: body.birthDate || body.selfBirthDate,
    birthTime: body.birthTime || body.selfBirthTime,
    calendarType: body.calendarType || body.selfCalendarType,
    isLeapMonth: body.isLeapMonth || body.selfIsLeapMonth,
  };
  const partnerSource = body.partner || body.personB || body.partnerProfile || body.partnerInput || {
    name: body.partnerName,
    gender: body.partnerGender,
    birthDate: body.partnerBirthDate,
    birthTime: body.partnerBirthTime,
    calendarType: body.partnerCalendarType,
    isLeapMonth: body.partnerIsLeapMonth,
  };
  return normalizeCompatibilityInput({
    mode: "compatibility",
    self: selfSource,
    partner: partnerSource,
  });
}

function validateSukyoAIProfiles(input = {}) {
  const missing = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean(input?.self?.birthDate))) missing.push("self.birthDate");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean(input?.partner?.birthDate))) missing.push("partner.birthDate");
  if (missing.length) {
    throw Object.assign(new Error("두 사람의 생년월일을 정확히 입력해 주세요."), {
      status: 400,
      code: "SUKYO_COMPAT_AI_MISSING_BIRTH",
      missing,
    });
  }
}

function sukyoMansionLabel(sukuyo = {}) {
  const name = clean(sukuyo.nameKo || sukuyo.name || "");
  if (!name) return "미산출";
  return /숙$/.test(name) ? name : `${name}숙`;
}

function sukyoList(values, limit = 5) {
  return (Array.isArray(values) ? values : [])
    .map((value) => clean(value))
    .filter(Boolean)
    .slice(0, limit);
}

function buildSukyoPersonContext(person = {}, sukuyo = {}) {
  const keywords = sukyoList(sukuyo.keywords);
  const strengths = sukyoList(sukuyo.strengths);
  const shadows = sukyoList(sukuyo.shadows);
  const mansion = sukyoMansionLabel(sukuyo);
  const summary = [
    clean(sukuyo.archetypeTitle),
    keywords.length ? `키워드: ${keywords.join(", ")}` : "",
    strengths.length ? `강점: ${strengths.join(", ")}` : "",
    shadows.length ? `주의점: ${shadows.join(", ")}` : "",
  ].filter(Boolean).join(" / ");
  return {
    name: clean(person.name || "") || "나",
    gender: clean(person.gender || "unknown"),
    birthDate: clean(person.birthDate),
    calendarType: clean(person.calendarType || "solar"),
    birthTimeKnown: person.isTimeUnknown !== true && Boolean(clean(person.birthTime)),
    mansion,
    mansionIndex: Number.isFinite(Number(sukuyo.index)) ? Number(sukuyo.index) : undefined,
    mansionHanja: clean(sukuyo.nameHan || ""),
    mansionJapanese: clean(sukuyo.nameJp || ""),
    keywords,
    strengths,
    shadows,
    relationshipPatternSummary: summary || `${mansion}의 기본 성향을 바탕으로 관계의 결을 살핍니다.`,
  };
}

function firstCleanValue(...values) {
  for (const value of values) {
    const text = clean(value);
    if (text) return text;
  }
  return "";
}

function buildSukyoRelationshipContext(canonical = {}) {
  const compatibility = canonical?.compatibility || {};
  const forwardDistance = Number(compatibility.forwardDistance ?? compatibility.distanceMetrics?.forwardDistance ?? 0);
  const backwardDistance = Number(compatibility.backwardDistance ?? compatibility.distanceMetrics?.backwardDistance ?? ((27 - forwardDistance) % 27));
  const relationType = normalizePastLifeRelation(compatibility.relationType || compatibility.relationshipType || "", forwardDistance);
  const distanceLabel = normalizePastLifeDistance(compatibility.distanceLabel || compatibility.distanceType || "", relationType);
  const direction = firstCleanValue(
    compatibility.direction,
    compatibility.directionLabel,
    compatibility.relationDirection,
    normalizePastLifeDirection(forwardDistance),
  );
  const compatibilityIndex = Number(compatibility.compatibilityIndex || compatibility.score || compatibility.totalScore || 0);
  return {
    name: relationType,
    relationType,
    relationTypeHan: clean(compatibility.relationTypeHan || ""),
    direction,
    forwardDistance: Number.isFinite(forwardDistance) ? forwardDistance : undefined,
    backwardDistance: Number.isFinite(backwardDistance) ? backwardDistance : undefined,
    distance: distanceLabel === "해당없음" ? "" : distanceLabel,
    distanceLabel: distanceLabel === "해당없음" ? "" : distanceLabel,
    compatibilityIndex: Number.isFinite(compatibilityIndex) && compatibilityIndex > 0 ? compatibilityIndex : undefined,
    attraction: firstCleanValue(compatibility.attraction, compatibility.attractionText, compatibility.pull, compatibility.pullText),
    stability: firstCleanValue(compatibility.stability, compatibility.stabilityText),
    conflictPotential: firstCleanValue(compatibility.conflict, compatibility.conflictText, compatibility.risk, compatibility.riskText),
    repeatPattern: firstCleanValue(compatibility.repeatPattern, compatibility.pattern, compatibility.rhythm),
    cautions: sukyoList(compatibility.cautions || compatibility.warningSigns || compatibility.risks, 6),
    summary: firstCleanValue(
      compatibility.summary,
      compatibility.oneLine,
      compatibility.shortSummary,
      `${relationType} 관계는 두 사람의 본명숙 사이에 형성된 기본 구조입니다.`,
    ),
  };
}

// [정리됨] 숙요점 PDF 궁합 전문가 상담(premium_pdf_sukyo_compat)은 폐기되어 라우트가
// sukuyoCompatibilityAiMovedResponse()로 톰스톤 처리됨. 활성 상담은 /api/sukuyo-compatibility-ai
// (worker/routes/sukuyo-compatibility-ai.js)로 이전됨. 관련 죽은 핸들러/헬퍼 제거.

function buildSukuyoSeedErrorResponse(error, fallbackMessage = "숙요점 궁합 계산에 필요한 입력값을 확인해 주세요.") {
  return {
    ok: false,
    code: clean(error?.code || "SUKUYO_SEED_BUILD_FAILED"),
    message: clean(error?.message) || fallbackMessage,
    missing: Array.isArray(error?.missing) ? error.missing : undefined,
  };
}

const SUKYO_PAST_LIFE_FEATURE_KEY = "sukuyo-past-life-reading";
const SUKYO_PAST_LIFE_REPORT_TYPE = "sukuyoPastLifeReading";
const SUKYO_PAST_LIFE_LOGIC_VERSION = "sukyo-past-life-v2";
const SUKYO_PAST_LIFE_PURPOSES = new Set(["love", "reunion", "marriage", "crush", "friend", "family", "business", "work", "general"]);

// resolvePastLifeProfile 의 프로필 폴백(destinyProfiles*)과 requirePremiumReportAccess
// (access-control.js) 의 프리미엄 판정 필드를 한 번에 커버해, handleSukuyoPastLifeReading 이
// users 를 3회가 아니라 1회만 읽게 한다(RC-13). access-control.js 의 select 필드셋과 맞춰 둔다.
const SUKYO_PAST_LIFE_USER_PROJECTION = {
  destinyProfilesCurrentId: 1,
  destinyProfilesLockedCurrentId: 1,
  unlockedFeatures: 1,
  profileSubscription: 1,
  subscription: 1,
  membership: 1,
  membershipPass: 1,
  pass: 1,
  entitlement: 1,
  licensePass: 1,
  accessGateResult: 1,
  plan: 1,
  planId: 1,
  productId: 1,
  subscriptionTier: 1,
  membershipTier: 1,
  passTier: 1,
  status: 1,
  subscriptionStatus: 1,
  membershipStatus: 1,
  isActive: 1,
  isSubscribed: 1,
  expiresAt: 1,
};

const SUKYO_PAST_LIFE_SCORE_RANGES = Object.freeze({
  "업태": { pastLifeFeeling: [85, 98], attraction: [75, 92], unfinishedTask: [80, 98], repeatPattern: [70, 90], emotionalExhaustion: [50, 75], healingPotential: [65, 85], realityPotential: [45, 70] },
  "안괴": { pastLifeFeeling: [75, 95], attraction: [85, 98], unfinishedTask: [70, 92], repeatPattern: [75, 95], emotionalExhaustion: [75, 98], healingPotential: [55, 80], realityPotential: [30, 60] },
  "명": { pastLifeFeeling: [65, 85], attraction: [60, 78], unfinishedTask: [55, 78], repeatPattern: [75, 92], emotionalExhaustion: [40, 65], healingPotential: [60, 82], realityPotential: [55, 75] },
  "영친": { pastLifeFeeling: [60, 82], attraction: [55, 78], unfinishedTask: [35, 58], repeatPattern: [45, 65], emotionalExhaustion: [20, 45], healingPotential: [75, 95], realityPotential: [75, 95] },
  "우쇠": { pastLifeFeeling: [55, 78], attraction: [55, 75], unfinishedTask: [55, 78], repeatPattern: [60, 82], emotionalExhaustion: [45, 70], healingPotential: [60, 82], realityPotential: [45, 70] },
  "성위": { pastLifeFeeling: [60, 82], attraction: [60, 80], unfinishedTask: [60, 85], repeatPattern: [60, 82], emotionalExhaustion: [50, 75], healingPotential: [65, 88], realityPotential: [50, 75] },
});

const SUKYO_PAST_LIFE_META = Object.freeze({
  "업태": {
    title: "오래된 약속처럼 남는 인연",
    subtitle: "설명하기 어려운 익숙함과 미완의 여운이 강하게 떠오릅니다.",
    theme: "미완의 약속",
    summary: "두 사람 사이에는 처음부터 오래 알고 지낸 듯한 결이 흐릅니다. 다만 그 익숙함이 곧 안정으로 이어지는 것은 아니어서, 감정의 깊이보다 현재의 태도와 약속이 더 또렷한 기준으로 떠오릅니다.",
    first: "낯설지 않은 느낌은 서로의 빈칸을 빠르게 알아보는 데서 시작됩니다. 오래된 기억처럼 마음이 반응하지만, 그 감각에 기대면 현실의 행동을 놓치기 쉽습니다.",
    story: "전생의 기억처럼 느껴질 만큼 여운이 긴 관계입니다. 끝나지 않은 문장이 다시 펼쳐지는 듯하고, 기다림과 해석이 반복되기 쉬운 흐름이 드러납니다.",
    task: "이번 생에서의 숙제는 의미보다 약속을 먼저 보는 것입니다. 말보다 실제로 시간을 내는지, 책임을 피하지 않는지가 관계의 진짜 온도를 비춥니다.",
    trigger: "상대의 애매한 태도, 늦은 답, 불분명한 관계 정의가 미완의 감정을 크게 흔들 수 있습니다.",
    lesson: "깊은 끌림을 현실의 신뢰로 바꾸는 법을 익힐 때 이 인연의 여운은 상처보다 성숙으로 남습니다.",
  },
  "안괴": {
    title: "강하게 흔들고 방향을 바꾸는 인연",
    subtitle: "끌림은 빠르게 올라오지만 경계와 약속이 함께 서야 합니다.",
    theme: "흔들림과 경계",
    summary: "이 관계는 서로의 약한 부분을 빠르게 비춥니다. 강렬한 끌림이 떠오르지만, 확인과 시험이 반복되면 감정 소모가 커지므로 경계와 동의가 중심에 놓여야 합니다.",
    first: "처음부터 시선이 오래 머물거나 마음이 과하게 반응하기 쉽습니다. 그 강도는 매력인 동시에 불안의 문을 함께 엽니다.",
    story: "전생 서사처럼 보면 서로에게 강한 흔적을 남긴 관계입니다. 다만 이번 생에서는 흔들림을 사랑의 증거로 삼기보다, 안전한 거리와 약속을 세우는 일이 먼저 드러납니다.",
    task: "미완의 숙제는 통제하지 않고 가까워지는 법입니다. 연락, 돈, 관계 정의, 개인 시간을 흐릿하게 두면 긴장이 커집니다.",
    trigger: "상대의 침묵, 질투, 비교, 갑작스러운 거리감이 자존심 싸움으로 번지기 쉽습니다.",
    lesson: "끌림의 크기보다 서로가 안전하게 느끼는 방식을 먼저 존중할 때 관계의 강한 빛이 상처로 번지지 않습니다.",
  },
  "명": {
    title: "거울처럼 닮은 영혼의 인연",
    subtitle: "빠른 이해와 반복 패턴이 동시에 비칩니다.",
    theme: "거울과 반복",
    summary: "두 사람은 서로의 감각을 빠르게 알아차리기 쉽습니다. 그러나 닮은 결은 장점만이 아니라 약점까지 비추므로, 같은 방식으로 물러서지 못하는 장면이 반복될 수 있습니다.",
    first: "낯설지 않은 이유는 상대 안에서 자신의 표정과 반응을 발견하기 때문입니다. 말하지 않아도 통하는 듯하지만, 같은 불안도 함께 떠오릅니다.",
    story: "전생 서사처럼 보면 같은 문을 여러 번 지나온 듯한 관계입니다. 이번에는 닮은 점에 기대기보다 반복되는 방식을 함께 다루는 흐름이 열립니다.",
    task: "미완의 숙제는 닮은 약점을 인정하는 것입니다. 서로를 고치려 하기보다 같은 패턴이 켜지는 순간을 함께 알아차려야 합니다.",
    trigger: "상대의 고집, 회피, 예민함이 자신의 모습처럼 느껴질 때 답답함이 커집니다.",
    lesson: "거울에 비친 모습을 탓하지 않고, 함께 정돈할 때 이 관계는 자기 이해의 문이 됩니다.",
  },
  "영친": {
    title: "익숙한 품처럼 쉬어 가는 인연",
    subtitle: "돌봄과 안정의 기운이 잔잔하게 머뭅니다.",
    theme: "보호와 회복",
    summary: "이 관계에는 편안하게 기대고 싶은 흐름이 있습니다. 함께 있을수록 생활 리듬이 맞기 쉽지만, 너무 익숙해지면 표현이 줄어들 수 있어 애정을 의식적으로 남겨야 합니다.",
    first: "처음부터 긴장을 많이 쓰지 않아도 되는 느낌이 있습니다. 상대의 존재가 마음을 부드럽게 낮추고, 일상의 온도를 안정시키는 쪽으로 흐릅니다.",
    story: "전생 서사처럼 보면 서로를 돌보거나 지켜본 듯한 보호자형 인연입니다. 강렬한 사건보다 오래 머무는 품의 기억처럼 다가옵니다.",
    task: "미완의 숙제는 편안함을 당연하게 여기지 않는 것입니다. 고마움과 애정을 말로 남겨야 관계의 온기가 오래 갑니다.",
    trigger: "표현 부족, 익숙함, 가족 같은 거리감이 설렘의 빈칸으로 느껴질 수 있습니다.",
    lesson: "안정 위에 작은 표현을 계속 쌓을 때 이 인연은 지치는 관계가 아니라 회복의 자리가 됩니다.",
  },
  "우쇠": {
    title: "다른 온도로 서로를 배우는 인연",
    subtitle: "속도 차이와 보완의 과제가 함께 드러납니다.",
    theme: "배움과 온도차",
    summary: "두 사람은 감정의 속도와 표현 방식이 다르게 느껴질 수 있습니다. 한쪽이 더 맞추는 흐름이 생기면 소모가 커지므로, 같은 방식의 사랑을 요구하지 않는 태도가 중요합니다.",
    first: "낯익음과 낯섦이 함께 옵니다. 끌리지만 상대의 속도가 다르게 느껴져, 마음의 보폭을 맞추는 시간이 필요합니다.",
    story: "전생 서사처럼 보면 서로에게 부족한 감각을 배워 온 관계입니다. 이번 생에서도 역할 차이와 표현 차이가 관계의 과제로 떠오릅니다.",
    task: "미완의 숙제는 균형입니다. 맞춰주는 사람만 계속 양보하지 않도록 부탁, 거절, 기다림의 기준을 나눠야 합니다.",
    trigger: "연락 빈도, 만남의 속도, 애정 표현 방식의 차이가 서운함으로 번지기 쉽습니다.",
    lesson: "다름을 부족함으로 보지 않을 때 이 관계는 서로의 세계를 넓히는 배움으로 남습니다.",
  },
  "성위": {
    title: "서로를 밀어 올리는 성장 계약형 인연",
    subtitle: "목표와 자극이 강하지만 감정의 안전감도 필요합니다.",
    theme: "성장과 현실 과제",
    summary: "두 사람은 편안함보다 자극과 성장의 흐름이 강하게 뜹니다. 함께 있으면 목표 의식이 살아나지만, 관계가 평가나 경쟁처럼 느껴지면 피로가 쌓일 수 있습니다.",
    first: "상대에게서 자극을 받고 더 나아지고 싶은 마음이 생깁니다. 처음부터 편안하기보다는 깨어나는 감각이 먼저 떠오릅니다.",
    story: "전생 서사처럼 보면 함께 어떤 목표를 이루기로 약속한 듯한 인연입니다. 이번 생에서는 성과보다 감정의 안전을 함께 세우는 일이 중요합니다.",
    task: "미완의 숙제는 목표와 마음을 분리하는 것입니다. 현실 성취가 관계의 가치 평가로 흐르지 않게 조심해야 합니다.",
    trigger: "비교, 평가, 인정 욕구, 역할 경쟁이 감정 피로로 이어질 수 있습니다.",
    lesson: "서로를 성장시키되 쉼까지 허락할 때 이 인연은 과제가 아니라 동행으로 깊어집니다.",
  },
});

function ymd(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return "";
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function normalizePastLifePurpose(raw) {
  const purpose = clean(raw || "general").toLowerCase();
  return SUKYO_PAST_LIFE_PURPOSES.has(purpose) ? purpose : "general";
}

function normalizePastLifeRelation(raw, forwardDistance) {
  const token = clean(raw);
  if (token.includes("업태")) return "업태";
  if (token.includes("영친")) return "영친";
  if (token.includes("우쇠")) return "우쇠";
  if (token.includes("안괴")) return "안괴";
  if (token.includes("성위") || token.includes("위성")) return "성위";
  if (token.includes("명")) return "명";
  const d = ((Math.floor(Number(forwardDistance) || 0) % 27) + 27) % 27;
  if (d === 0) return "명";
  if (d === 9 || d === 18) return "업태";
  if ([1, 8, 10, 17, 19, 26].includes(d)) return "영친";
  if ([2, 7, 11, 16, 20, 25].includes(d)) return "우쇠";
  if ([3, 6, 12, 15, 21, 24].includes(d)) return "안괴";
  return "성위";
}

function normalizePastLifeDistance(raw, relationType) {
  const token = clean(raw);
  if (relationType === "명" || relationType === "업태") return "해당없음";
  if (token.includes("근")) return "근거리";
  if (token.includes("중")) return "중거리";
  if (token.includes("원")) return "원거리";
  return "해당없음";
}

function normalizePastLifeDirection(forwardDistance) {
  const d = ((Math.floor(Number(forwardDistance) || 0) % 27) + 27) % 27;
  if (d === 0 || d === 9 || d === 18) return "상호작용";
  if ([1, 2, 3, 4, 10, 11, 12, 13, 19, 20, 21, 22].includes(d)) return "상대가 나에게 작용";
  if ([5, 6, 7, 8, 14, 15, 16, 17, 23, 24, 25, 26].includes(d)) return "내가 상대에게 작용";
  return "해당없음";
}

function hashPastLifeSeed(seed) {
  const text = clean(seed);
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function clampPastLifeScore(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function scorePastLifeField(relationType, field, seed, distance) {
  const range = (SUKYO_PAST_LIFE_SCORE_RANGES[relationType] || SUKYO_PAST_LIFE_SCORE_RANGES["명"])[field] || [45, 70];
  const base = Math.round((range[0] + range[1]) / 2);
  const driftRaw = hashPastLifeSeed(`${seed}:${field}`) % 11;
  let drift = driftRaw - 5;
  if (drift > 0 && drift < 3) drift = 3;
  if (drift < 0 && drift > -3) drift = -3;
  let distanceDelta = 0;
  if (distance === "근거리") {
    if (field === "attraction") distanceDelta = 5;
    if (field === "repeatPattern") distanceDelta = 4;
    if (field === "emotionalExhaustion") distanceDelta = 3;
  }
  if (distance === "중거리") {
    if (field === "healingPotential") distanceDelta = 4;
    if (field === "realityPotential") distanceDelta = 3;
  }
  if (distance === "원거리") {
    if (field === "pastLifeFeeling") distanceDelta = 4;
    if (field === "unfinishedTask") distanceDelta = 5;
  }
  return clampPastLifeScore(base + drift + distanceDelta);
}

function buildPastLifeScores(relationType, distance, seed) {
  const scores = {
    pastLifeFeeling: scorePastLifeField(relationType, "pastLifeFeeling", seed, distance),
    attraction: scorePastLifeField(relationType, "attraction", seed, distance),
    unfinishedTask: scorePastLifeField(relationType, "unfinishedTask", seed, distance),
    repeatPattern: scorePastLifeField(relationType, "repeatPattern", seed, distance),
    emotionalExhaustion: scorePastLifeField(relationType, "emotionalExhaustion", seed, distance),
    healingPotential: scorePastLifeField(relationType, "healingPotential", seed, distance),
    realityPotential: scorePastLifeField(relationType, "realityPotential", seed, distance),
  };
  if (relationType === "영친") {
    scores.emotionalExhaustion = Math.min(scores.emotionalExhaustion, 45);
    scores.healingPotential = Math.max(scores.healingPotential, 75);
    scores.realityPotential = Math.max(scores.realityPotential, 75);
  }
  if (relationType === "안괴") {
    scores.emotionalExhaustion = Math.max(scores.emotionalExhaustion, 75);
    scores.realityPotential = Math.min(scores.realityPotential, 60);
  }
  if (relationType === "업태") {
    scores.pastLifeFeeling = Math.max(scores.pastLifeFeeling, 85);
    scores.unfinishedTask = Math.max(scores.unfinishedTask, 80);
  }
  if (relationType === "명") scores.repeatPattern = Math.max(scores.repeatPattern, 75);
  return scores;
}

function directionPastLifeLine(direction, userName, partnerName) {
  if (direction === "내가 상대에게 작용") return `${userName}님의 반응과 선택이 ${partnerName}님의 마음에 더 오래 남는 흐름입니다. 다가가는 방식이 부드러울수록 인연의 결도 차분해집니다.`;
  if (direction === "상대가 나에게 작용") return `${partnerName}님의 존재가 ${userName}님의 기억과 감정 버튼을 더 강하게 건드립니다. 흔들림이 커질수록 현재의 동의와 경계를 먼저 보아야 합니다.`;
  if (direction === "상호작용") return "두 사람 모두에게 흔적이 남기 쉬운 관계입니다. 어느 한쪽만의 감정으로 몰아가기보다, 서로에게 반복되는 장면을 함께 살피는 일이 필요합니다.";
  return "";
}

function purposePastLifeReading(purpose, relationType, userName, partnerName) {
  if (purpose === "love") return `연애로는 끌림과 불안을 함께 다루는 흐름입니다. ${relationType}의 결이 강할수록 표현 방식과 연락 온도를 분명히 나누어야 사랑이 소모로 기울지 않습니다.`;
  if (purpose === "reunion") return "재회에서는 다시 만나는 가능성보다 같은 패턴을 반복하지 않을 조건이 먼저 떠오릅니다. 상대의 거절 의사가 명확하다면 더 밀어붙이지 않는 것이 중요합니다. 전생처럼 느껴지는 감정이 있어도 현재의 동의와 경계가 우선입니다.";
  if (purpose === "marriage") return "결혼으로 이어질 때는 전생감보다 현실 지속 가능성이 더 중요합니다. 생활 리듬, 돈, 책임 분담, 가족 경계를 구체적으로 나눌수록 오래 머물 힘이 생깁니다.";
  if (purpose === "crush") return `짝사랑에서는 ${partnerName}님의 마음을 단정하지 않는 태도가 필요합니다. ${userName}님의 감정이 오래 머문다면, 그리움보다 실제로 확인 가능한 행동 기준을 먼저 세우세요.`;
  if (purpose === "friend") return "친구로는 신뢰와 거리감이 핵심입니다. 편안함이 있어도 감정 노동이 한쪽으로 몰리지 않게 부탁과 거절의 선을 함께 두는 편이 좋습니다.";
  if (purpose === "family") return "가족으로는 반복되는 상처 버튼과 역할 고착이 드러날 수 있습니다. 화해는 감정을 덮는 일이 아니라, 같은 장면이 다시 오지 않도록 거리를 조절하는 데서 시작됩니다.";
  if (purpose === "business") return "동업에서는 감성적 여운보다 계약, 지분, 돈, 책임 범위가 먼저입니다. 신뢰가 있어도 문서와 의사결정 규칙을 세워야 인연이 현실에서 흔들리지 않습니다.";
  if (purpose === "work") return "직장 관계에서는 권한, 평가, 협업 방식이 중요합니다. 감정 해석보다 업무 기준과 피드백 방식을 분명히 할 때 피로가 줄어듭니다.";
  return "전체 흐름에서는 감성적 끌림과 현실적 기준이 함께 떠오릅니다. 오래된 인연처럼 느껴질수록 지금의 태도, 약속, 안전한 경계를 더 또렷하게 보아야 합니다.";
}

function buildPastLifeWarningSigns(purpose, relationType) {
  const base = ["감정 확인을 반복하며 상대를 시험하게 되는 흐름", "연락, 돈, 관계 정의가 흐릿한 채로 미뤄지는 장면", "나만 더 기다리거나 더 맞춘다고 느끼는 순간"];
  if (relationType === "안괴") base.unshift("질투, 통제, 비교가 사랑의 증거처럼 둔갑하는 흐름");
  if (purpose === "reunion" || purpose === "crush") {
    base.push("상대의 거절 이후에도 일방적인 연락을 이어가고 싶은 충동");
    base.push("기다림이 나를 망가뜨리는데도 인연이라는 말로 붙잡는 흐름");
  }
  return base.slice(0, 5);
}

function buildPastLifeHealingActions(purpose, relationType) {
  const actions = ["연락 빈도, 만남 간격, 혼자 있는 시간을 구체적으로 합의하세요.", "감정이 크게 올라온 날에는 결론보다 24시간의 회복 시간을 먼저 두세요.", "말보다 지켜진 약속을 기준으로 관계의 온도를 확인하세요."];
  if (relationType === "안괴") actions.unshift("경계, 돈, 관계 정의를 흐릿하게 두지 마세요.");
  if (purpose === "reunion" || purpose === "crush") actions.push("상대가 안전하게 느낄 수 있는 거리와 동의를 가장 앞에 두세요.");
  return actions.slice(0, 5);
}

function relationPastLifeReading(relationType, userName, partnerName, meta = {}) {
  const map = {
    업태: `${userName}님과 ${partnerName}님의 업태는 서로에게 남겨 둔 약속을 다시 확인하게 하는 결입니다. 마음은 빠르게 오래된 쪽으로 기울지만, 이 관계의 진짜 문은 현재의 책임과 약속에서 열립니다.`,
    안괴: `${userName}님과 ${partnerName}님의 안괴는 강한 끌림과 흔들림을 함께 품습니다. 서로의 약한 곳을 건드릴 수 있으므로, 감정의 속도보다 안전한 경계를 먼저 세울 때 인연의 힘이 맑아집니다.`,
    명: `${userName}님과 ${partnerName}님의 명은 닮은 영혼이 서로를 비추는 자리입니다. 편안함은 빠르게 오지만, 같은 방어와 같은 고집이 동시에 올라올 수 있어 각자의 회복법을 존중해야 합니다.`,
    영친: `${userName}님과 ${partnerName}님의 영친은 오래 쉬어 갈 품처럼 드러납니다. 서로를 돌보는 마음이 자연스럽지만, 익숙함에 기대어 표현을 줄이면 따뜻한 결이 흐려질 수 있습니다.`,
    우쇠: `${userName}님과 ${partnerName}님의 우쇠는 다른 온도를 배우는 인연입니다. 한쪽이 더 빠르게 다가가거나 더 오래 기다릴 수 있으니, 애정의 양보다 표현 방식의 차이를 읽어야 합니다.`,
    성위: `${userName}님과 ${partnerName}님의 성위는 서로를 밀어 올리는 성장의 계약처럼 보입니다. 목표와 자극은 강하지만, 마음이 평가받는 느낌으로 굳지 않게 부드러운 쉼을 함께 두어야 합니다.`,
  };
  return map[relationType] || `${clean(meta.theme || "두 사람의 결")}이 관계의 오래된 흐름을 비춥니다.`;
}

function distancePastLifeReading(distance, relationType) {
  if (relationType === "명") return "명 관계는 거리보다 닮음의 울림이 먼저 드러납니다. 가까워질수록 상대의 모습 안에서 내 익숙한 반응을 보게 되므로, 같은 장면이 반복될 때 잠시 멈추는 힘이 필요합니다.";
  if (relationType === "업태") return "업태는 거리보다 미완의 약속감이 크게 작용합니다. 멀리 있어도 마음이 오래 남고, 가까이 있어도 현실의 약속이 흐리면 불안이 커질 수 있습니다.";
  if (distance === "근거리") return "근거리는 체감이 빠르고 반응이 선명합니다. 좋을 때는 서로를 강하게 끌어당기지만, 감정이 오른 날에는 작은 말도 크게 남으니 속도를 낮추는 여백이 필요합니다.";
  if (distance === "중거리") return "중거리는 조율의 여지가 살아 있는 거리입니다. 서로의 차이를 이해할 시간이 있으며, 약속과 표현을 차분히 맞추면 오래 갈 힘이 생깁니다.";
  if (distance === "원거리") return "원거리는 쉽게 닿지 않는 여운을 남깁니다. 마음속에서는 오래된 인연처럼 크게 느껴질 수 있으나, 현실에서 확인되는 행동을 기준으로 삼아야 합니다.";
  return "이 관계는 거리의 이름보다 관계 유형의 결이 더 강하게 떠오릅니다. 서로에게 남는 감정의 흔적을 차분히 살피는 편이 좋습니다.";
}

function relationshipPastLifeRhythm(relationType, distance, direction) {
  const base = relationType === "안괴"
    ? "강하게 확인하고 싶을수록 한 박자 늦추는 리듬이 필요합니다."
    : relationType === "영친"
      ? "익숙해질수록 작은 표현을 일부러 남기는 리듬이 좋습니다."
      : relationType === "성위"
        ? "목표를 함께 보되, 마음의 안전을 먼저 묻는 리듬이 좋습니다."
        : relationType === "우쇠"
          ? "서로 다른 속도를 같은 언어로 번역하는 리듬이 필요합니다."
          : relationType === "업태"
            ? "오래된 의미보다 지금 지켜지는 약속을 확인하는 리듬이 좋습니다."
            : "닮은 반응이 동시에 올라올 때 각자의 시간을 인정하는 리듬이 좋습니다.";
  const distanceTail = distance === "근거리" ? " 감정이 빨리 번질 수 있으니 연락 직후 바로 결론을 내리지 마세요." : (distance === "원거리" ? " 그리움이 커질수록 확인 가능한 약속을 작게 남기세요." : " 서로의 차이를 고칠 문제로 보지 말고 맞출 기준으로 보세요.");
  const directionTail = direction === "상호작용" ? " 두 사람 모두 흔적을 남기므로 책임도 함께 나누어야 합니다." : (direction === "상대가 나에게 작용" ? " 상대의 반응에 마음이 크게 움직일수록 내 생활 리듬을 먼저 지키세요." : (direction === "내가 상대에게 작용" ? " 내가 던지는 말과 태도가 오래 남을 수 있으니 부드러운 표현이 인연을 살립니다." : ""));
  return `${base}${distanceTail}${directionTail}`;
}

function buildPastLifeConversationScript(purpose, relationType, userName, partnerName) {
  const scripts = [
    "나는 이 관계를 오래된 느낌만으로 밀어붙이고 싶지 않아요. 지금 서로가 편안하게 지킬 수 있는 약속부터 맞추고 싶어요.",
    "마음이 커질수록 확인하고 싶은 것도 많아지지만, 당신의 속도와 경계도 함께 존중하고 싶어요.",
  ];
  if (relationType === "안괴") scripts.unshift("우리 사이의 끌림이 강한 만큼, 불안할 때 서로를 시험하지 않는 기준을 먼저 정하고 싶어요.");
  if (relationType === "영친") scripts.unshift("편해질수록 당연하게 여기지 않고, 고마운 마음을 더 자주 말하고 싶어요.");
  if (relationType === "성위") scripts.unshift("서로를 더 나아지게 하는 것도 좋지만, 힘든 날에도 안전하게 돌아올 수 있는 말을 만들고 싶어요.");
  if (purpose === "reunion") scripts.push("다시 이어진다면 예전의 상처를 반복하지 않기 위해 연락 방식과 쉬어 가는 시간을 먼저 합의하고 싶어요.");
  else if (purpose === "marriage") scripts.push("함께 오래 가려면 마음뿐 아니라 생활 리듬, 돈, 책임의 기준도 차분히 맞추고 싶어요.");
  else if (purpose === "crush") scripts.push(`${partnerName}님의 마음을 단정하지 않고, 내 감정이 건강하게 머물 수 있는 거리를 지키고 싶어요.`);
  else scripts.push("서로에게 남는 감정의 크기보다, 실제로 지켜지는 배려를 기준으로 관계를 보고 싶어요.");
  return scripts.slice(0, 4);
}

function buildPastLifeFollowupPrompt(result = {}) {
  const scores = result.scores || {};
  const script = Array.isArray(result.conversationScript) ? result.conversationScript.filter(Boolean) : [];
  const purposeLabel = {
    love: "연애",
    reunion: "재회",
    marriage: "결혼",
    crush: "짝사랑",
    friend: "친구",
    family: "가족",
    business: "동업/비즈니스",
    work: "직장/상사/동료",
    general: "전체 분석",
  }[result.purpose] || "전체 분석";
  const lines = [
    "당신은 숙요점 27숙과 인연의 결을 오래 상담해 온 숙요점 전문가입니다.",
    "전생을 실제 사실로 단정하지 말고, 오래된 인연처럼 느껴지는 감정 패턴과 현실에서 지켜야 할 경계를 중심으로 이어서 읽어 주세요.",
    "",
    "[두 사람의 달빛 자리]",
    `- 나: ${result.userName || "나"} · ${result.user宿 || "본명숙 미상"}`,
    `- 상대: ${result.partnerName || "상대"} · ${result.partner宿 || "상대 숙 미상"}`,
    `- 관계: ${result.relationType || "미상"} · ${result.distance || "거리 미상"} · ${result.direction || "방향 미상"}`,
    `- 목적: ${purposeLabel}`,
    "",
    "[이미 드러난 결]",
    `- 핵심: ${result.summary || ""}`,
    `- 관계명 해석: ${result.relationNameReading || result.karmicTheme || ""}`,
    `- 거리 흐름: ${result.distanceReading || ""}`,
    `- 방향 흐름: ${result.directionReading || ""}`,
    `- 반복 패턴: ${result.repeatPattern || ""}`,
    `- 미완의 숙제: ${result.unfinishedTask || ""}`,
    `- 감정 버튼: ${result.emotionalTrigger || ""}`,
    "",
    "[지표]",
    `- 전생감 ${scores.pastLifeFeeling ?? "-"}/100, 끌림 ${scores.attraction ?? "-"}/100, 미완의 숙제 ${scores.unfinishedTask ?? "-"}/100`,
    `- 반복 패턴 ${scores.repeatPattern ?? "-"}/100, 감정 소모 ${scores.emotionalExhaustion ?? "-"}/100, 치유 가능성 ${scores.healingPotential ?? "-"}/100`,
    "",
    "[이어 듣고 싶은 것]",
    "1. 이 인연에서 지금 가장 먼저 다뤄야 할 감정의 매듭을 숙요점 상담가의 말투로 풀어 주세요.",
    "2. 상대에게 건넬 수 있는 부드러운 문장 5개를 관계 목적에 맞게 써 주세요.",
    "3. 앞으로 2주 동안 지켜야 할 경계, 연락 리듬, 회복 행동을 현실적으로 정리해 주세요.",
    "4. 이 관계를 붙잡아야 할 때와 내려놓아야 할 때의 신호를 차분히 구분해 주세요.",
    "",
    "답변은 신비롭지만 단정적이지 않게, 전문 숙요점 상담처럼 따뜻하고 자연스럽게 이어 주세요.",
  ];
  if (script.length) {
    lines.splice(lines.length - 2, 0, "[이미 준비된 말]", script.map((item, index) => `${index + 1}. ${item}`).join("\n"), "");
  }
  return lines.join("\n");
}

function buildSukuyoPastLifeResult({ body, self, partner, selfSukuyo, partnerSukuyo, canonical, userProfileId = "" } = {}) {
  const compatibility = canonical?.compatibility || {};
  const forwardDistance = Number(compatibility.forwardDistance ?? compatibility.distanceMetrics?.forwardDistance ?? 0);
  const relationType = normalizePastLifeRelation(compatibility.relationType, forwardDistance);
  const distance = normalizePastLifeDistance(compatibility.distanceLabel, relationType);
  const direction = normalizePastLifeDirection(forwardDistance);
  const purpose = normalizePastLifePurpose(body?.purpose || body?.relationshipPurpose);
  const userName = clean(self?.name || body?.userName || "나");
  const partnerName = clean(partner?.name || body?.partnerName || "상대");
  const userMansion = `${clean(selfSukuyo?.nameKo || "본명")}숙`;
  const partnerMansion = `${clean(partnerSukuyo?.nameKo || "상대")}숙`;
  const meta = SUKYO_PAST_LIFE_META[relationType] || SUKYO_PAST_LIFE_META["명"];
  const seed = [userMansion, partnerMansion, relationType, self?.birthDate || "", partner?.birthDate || "", purpose].join("|");
  const scores = buildPastLifeScores(relationType, distance, seed);
  const directionLine = directionPastLifeLine(direction, userName, partnerName);
  const conversationScript = buildPastLifeConversationScript(purpose, relationType, userName, partnerName);
  const result = {
    userProfileId: clean(userProfileId || body?.userProfileId || ""),
    userName,
    partnerName,
    user宿: userMansion,
    partner宿: partnerMansion,
    relationType,
    distance,
    direction,
    purpose,
    title: `${userName}님과 ${partnerName}님의 숙요 전생 인연 리딩`,
    subtitle: meta.subtitle,
    karmicTheme: meta.theme,
    scores,
    summary: meta.summary,
    firstImpression: meta.first,
    relationNameReading: relationPastLifeReading(relationType, userName, partnerName, meta),
    distanceReading: distancePastLifeReading(distance, relationType),
    directionReading: directionLine,
    relationshipRhythm: relationshipPastLifeRhythm(relationType, distance, direction),
    pastLifeStory: `${meta.story} ${directionLine}`.trim(),
    unfinishedTask: meta.task,
    repeatPattern: `${relationType}의 흐름에서는 비슷한 감정 장면이 다시 떠오르기 쉽습니다. 그 장면을 운명으로만 붙잡기보다, 내가 어떤 반응을 반복하는지 먼저 알아차려야 합니다.`,
    emotionalTrigger: meta.trigger,
    currentLifeLesson: meta.lesson,
    relationshipAdvice: "오래된 인연처럼 느껴질수록 지금의 태도와 안전한 경계를 더 또렷하게 보세요. 감정의 크기는 소중하지만, 관계를 지키는 힘은 약속과 존중에서 열립니다.",
    purposeReading: purposePastLifeReading(purpose, relationType, userName, partnerName),
    warningSigns: buildPastLifeWarningSigns(purpose, relationType),
    healingActions: buildPastLifeHealingActions(purpose, relationType),
    conversationScript,
    oneLine: `${relationType}의 결은 ${meta.theme}을 비추며, 이번 생에서는 감정보다 현실의 태도가 더 중요한 표식으로 떠오릅니다.`,
    disclaimer: "이 리딩은 전생을 사실로 단정하지 않습니다. 숙요점 관계 구조 위에 오래된 인연처럼 느껴지는 감정 패턴을 비춘 상담입니다.",
    generatedAt: new Date().toISOString(),
    logicVersion: SUKYO_PAST_LIFE_LOGIC_VERSION,
  };
  return {
    ...result,
    aiFollowupPrompt: buildPastLifeFollowupPrompt(result),
  };
}

function normalizeProfileCardForSukuyo(profile) {
  if (!profile) return null;
  const birth = profile.birth && typeof profile.birth === "object" ? profile.birth : {};
  const birthDate = ymd(birth.year, birth.month, birth.day);
  if (!birthDate) return null;
  const hour = Number.isFinite(Number(birth.hour)) ? Number(birth.hour) : 12;
  const minute = Number.isFinite(Number(birth.minute)) ? Number(birth.minute) : 0;
  return {
    profileId: clean(profile.profileId || ""),
    name: clean(profile.name || "나"),
    gender: normalizeGender(profile.gender),
    birthDate,
    calendarType: normalizeCalendarType(birth.calType || "solar"),
    birthTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    timezone: clean(profile.location?.tz || "Asia/Seoul") || "Asia/Seoul",
  };
}

async function resolvePastLifeProfile(env, userId, body = {}, preloadedUserDoc = null) {
  const profileId = clean(body.userProfileId || body.profileId || body.selectedProfileId);
  if (profileId) {
    const profile = await withMongoRetry(env, () => ProfileCard.findOne({ userId, profileId }).lean());
    if (!profile) throw Object.assign(new Error("대표 프로필을 찾지 못했습니다."), { status: 404, code: "PROFILE_REQUIRED" });
    return normalizeProfileCardForSukuyo(profile);
  }
  const manualBirthDate = clean(body.userBirthDate || body.birthDate);
  if (manualBirthDate) {
    return {
      profileId: "",
      name: clean(body.userName || body.name || "나"),
      gender: normalizeGender(body.userGender || body.gender),
      birthDate: manualBirthDate,
      calendarType: normalizeCalendarType(body.userCalendarType || body.calendarType || "solar"),
      birthTime: clean(body.userBirthTime || body.birthTime || "12:00"),
      timezone: clean(body.timezone || "Asia/Seoul") || "Asia/Seoul",
    };
  }
  // preloadedUserDoc(_id 일치 확인된 것)이 있으면 재조회 없이 그대로 쓴다(RC-13).
  const reusableUser = preloadedUserDoc && String(preloadedUserDoc._id || "") === String(userId || "")
    ? preloadedUserDoc
    : null;
  // User → ProfileCard 두 read 를 하나의 재시도 단위로 묶는다(왕복 2 → 1, 상한도 1회분).
  const profile = await withMongoRetry(env, async () => {
    const user = reusableUser || await User.findById(userId).select("destinyProfilesCurrentId destinyProfilesLockedCurrentId").lean();
    const currentId = clean(user?.destinyProfilesLockedCurrentId || user?.destinyProfilesCurrentId);
    return currentId
      ? await ProfileCard.findOne({ userId, profileId: currentId }).lean()
      : await ProfileCard.findOne({ userId }).sort({ updatedAt: -1, createdAt: -1 }).lean();
  });
  const normalized = normalizeProfileCardForSukuyo(profile);
  if (!normalized) throw Object.assign(new Error("대표 프로필이 필요합니다."), { status: 404, code: "PROFILE_REQUIRED" });
  return normalized;
}

function normalizePastLifePartner(body = {}) {
  return {
    name: clean(body.partnerName || body.partnerNickname || "상대"),
    gender: normalizeGender(body.partnerGender),
    birthDate: clean(body.partnerBirthDate || body.partnerDate),
    calendarType: normalizeCalendarType(body.partnerCalendarType || "solar"),
    birthTime: clean(body.partnerBirthTime || body.partnerTime || "12:00"),
    timezone: clean(body.partnerTimezone || "Asia/Seoul") || "Asia/Seoul",
  };
}

function buildPastLifeSignature(input = {}) {
  const seed = [SUKYO_PAST_LIFE_LOGIC_VERSION, input.userProfileId || "", input.userBirthDate || "", input.userCalendarType || "", input.partnerName || "", input.partnerBirthDate || "", input.partnerCalendarType || "", input.purpose || ""].join("|");
  return `spl-${hashPastLifeSeed(seed).toString(36)}`;
}

async function readSukuyoPastLifeArchive(env, userId, signature) {
  await connectDb(env);
  const doc = await ServiceExecutionTransaction.findOne({
    userId,
    reportType: SUKYO_PAST_LIFE_REPORT_TYPE,
    featureKey: SUKYO_PAST_LIFE_FEATURE_KEY,
    status: "success",
    "metadata.signature": signature,
    "metadata.logicVersion": SUKYO_PAST_LIFE_LOGIC_VERSION,
  }).sort({ completedAt: -1, updatedAt: -1, createdAt: -1 }).lean();
  return doc?.metadata?.archive?.result || null;
}

async function writeSukuyoPastLifeArchive(env, userId, signature, result, access, body = {}) {
  await connectDb(env);
  const now = new Date();
  const reportId = clean(body.reportId || `sukuyo-past-life-${signature}`);
  const sessionId = clean(body.sessionId || body.reportSessionId || body.requestId || signature);
  const executionKey = `sukuyo-past-life:${clean(userId)}:${signature}`.slice(0, 120);
  const cost = Math.max(0, Math.floor(Number(access?.chargedCoins || body?.consume?.chargedCoins || body?.cost || 100)));
  return ServiceExecutionTransaction.findOneAndUpdate(
    { userId, executionKey },
    {
      $setOnInsert: {
        userId,
        executionKey,
        featureKey: SUKYO_PAST_LIFE_FEATURE_KEY,
        timeoutAt: now,
        nextRetryAt: now,
        retentionUntil: new Date(now.getTime() + (365 * 86400000)),
      },
      $set: {
        reportType: SUKYO_PAST_LIFE_REPORT_TYPE,
        reportId,
        sessionId,
        status: "success",
        premiumStatus: "completed",
        completedAt: now,
        generationStartedAt: now,
        generationCompletedAt: now,
        coinAmount: cost,
        cost,
        coinTransactionId: clean(access?.matchedTransactionId || body?.consume?.transactionId || body?.transactionId),
        sourceTransactionId: clean(access?.matchedTransactionId || body?.consume?.transactionId || body?.transactionId),
        metadata: {
          signature,
          logicVersion: SUKYO_PAST_LIFE_LOGIC_VERSION,
          featureKey: SUKYO_PAST_LIFE_FEATURE_KEY,
          reportType: SUKYO_PAST_LIFE_REPORT_TYPE,
          accessType: clean(access?.accessType || body?.accessType || ""),
          archive: {
            reportType: SUKYO_PAST_LIFE_REPORT_TYPE,
            title: result.title,
            displayName: result.userName,
            targetName: result.partnerName,
            summary: result.summary,
            generatedAt: result.generatedAt,
            logicVersion: result.logicVersion,
            result,
            payload: result,
          },
        },
      },
    },
    { upsert: true, returnDocument: "after" },
  ).lean();
}

function pastLifeErrorResponse(code, message, status = 400) {
  return json({ ok: false, error: { code, message } }, { status });
}

async function handleSukuyoPastLifeReading(request, env) {
  // 결제 판정 프로젝션으로 한 번에 읽어 두면, 아래 resolvePastLifeProfile 의 프로필 폴백과
  // requirePremiumReportAccess 의 내부 판정이 users 를 다시 읽지 않는다(3회→1회, RC-13).
  const auth = await requireAuth(request, env, { userProjection: SUKYO_PAST_LIFE_USER_PROJECTION });
  const body = await readJson(request);
  await connectDb(env);
  const profile = await resolvePastLifeProfile(env, auth.userId, body, auth.authUserDoc || null);
  const partnerRaw = normalizePastLifePartner(body);
  if (!parseDateParts(profile.birthDate)) return pastLifeErrorResponse("INVALID_BIRTH_DATE", "내 생년월일 형식을 확인해 주세요.", 400);
  if (!parseDateParts(partnerRaw.birthDate)) return pastLifeErrorResponse("INVALID_BIRTH_DATE", "상대 생년월일 형식을 확인해 주세요.", 400);

  const self = normalizePersonInput(profile, "나");
  const partner = normalizePersonInput(partnerRaw, "상대");
  const purpose = normalizePastLifePurpose(body.purpose || body.relationshipPurpose);
  const signature = buildPastLifeSignature({
    userProfileId: profile.profileId,
    userBirthDate: self.birthDate,
    userCalendarType: self.calendarType,
    partnerName: partner.name,
    partnerBirthDate: partner.birthDate,
    partnerCalendarType: partner.calendarType,
    purpose,
  });
  const archived = await readSukuyoPastLifeArchive(env, auth.userId, signature);
  if (archived) return json({ ok: true, data: archived, source: "archive", reportId: `sukuyo-past-life-${signature}` });

  // 회당 결제 기능이라 결제 전에도 "이 조합을 이미 샀는가"를 물어본다.
  // 그 조회에서 숙요 계산·결제 증거 확인까지 돌 필요가 없으므로 여기서 끊는다.
  if (body?.archiveOnly === true) {
    return json({ ok: false, error: { code: "ARCHIVE_MISS", message: "저장된 리딩이 없습니다." } }, { status: 404 });
  }

  let selfSukuyo;
  let partnerSukuyo;
  let canonical;
  try {
    selfSukuyo = buildPersonSukuyo(self);
    partnerSukuyo = buildPersonSukuyo(partner);
    canonical = buildCanonicalSukuyoCompatibility({
      reportType: "compatibility",
      personAName: self.name,
      personBName: partner.name,
      personAInput: { year: self.birthYear, month: self.birthMonth, day: self.birthDay, hour: self.birthHour, minute: self.birthMinute },
      personBInput: { year: partner.birthYear, month: partner.birthMonth, day: partner.birthDay, hour: partner.birthHour, minute: partner.birthMinute },
      personASukuyo: selfSukuyo,
      personBSukuyo: partnerSukuyo,
      calendarSource: "lunar-javascript",
      methodVersion: SUKYO_PAST_LIFE_LOGIC_VERSION,
    });
  } catch (error) {
    return pastLifeErrorResponse(clean(error?.code || "SUKYO_CALCULATION_FAILED"), clean(error?.message || "숙요 계산에 실패했습니다."), Number(error?.status) || 422);
  }

  if (!canonical?.validation?.hasRelationType) return pastLifeErrorResponse("RELATION_MATRIX_NOT_FOUND", "숙요 관계를 찾지 못했습니다.", 422);

  const access = await requirePremiumReportAccess(env, auth.userId, SUKYO_PAST_LIFE_REPORT_TYPE, {
    ...body,
    userProfileId: profile.profileId,
    profileId: profile.profileId || body.profileId,
    selectedProfileId: profile.profileId || body.selectedProfileId,
    featureKey: SUKYO_PAST_LIFE_FEATURE_KEY,
    reportType: SUKYO_PAST_LIFE_REPORT_TYPE,
    mode: "past-life-reading",
    _userDoc: auth.authUserDoc || null,
    purpose,
    _accessRoute: "/api/sukuyo/past-life-reading",
  });
  if (!access?.ok) {
    return json({
      ok: false,
      error: {
        code: access?.code || "PAYMENT_REQUIRED",
        message: access?.message || "숙요 전생 인연 리딩 해금이 필요합니다.",
      },
      pricing: { featureKey: SUKYO_PAST_LIFE_FEATURE_KEY, coinPrice: 100, krwEquivalent: 10000 },
    }, { status: Number(access?.status) || 402 });
  }

  const result = buildSukuyoPastLifeResult({
    body: { ...body, purpose },
    self,
    partner,
    selfSukuyo,
    partnerSukuyo,
    canonical,
    userProfileId: profile.profileId,
  });
  await writeSukuyoPastLifeArchive(env, auth.userId, signature, result, access, body);
  return json({ ok: true, data: result, source: "generated", reportId: `sukuyo-past-life-${signature}` });
}

function normalizeSukuyoTargetYear(value) {
  const nowYear = new Date().getFullYear();
  const raw = clean(value);
  if (!raw) return nowYear;
  const year = Number(raw);
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    const error = new Error("숙요점 1년운은 1900년부터 2100년까지의 정수 연도만 열 수 있습니다.");
    error.status = 400;
    error.code = "INVALID_TARGET_YEAR";
    throw error;
  }
  return year;
}

function sukuyoYearlyContentKey(targetYear) {
  return `${SUKYO_YEARLY_FORTUNE_PRODUCT_KEY}:${normalizeSukuyoTargetYear(targetYear)}`;
}

function hashSukuyoYearlySeed(value) {
  const text = clean(value);
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickSukuyoYearly(list, seed, offset = 0) {
  if (!Array.isArray(list) || !list.length) return "";
  return list[(Math.abs(Number(seed || 0)) + offset) % list.length];
}

function scoreSukuyoYearly(seed, base = 62, spread = 18, offset = 0) {
  const n = (Math.abs(Number(seed || 0)) + offset * 9973) % (spread * 2 + 1);
  return Math.max(35, Math.min(96, Math.round(base - spread + n)));
}

function normalizeSukuyoGenderLabel(value) {
  const token = clean(value).toUpperCase();
  if (token === "M" || token === "MALE") return "남성";
  if (token === "F" || token === "FEMALE") return "여성";
  return "미지정";
}

function formatSukuyoBirthDate(profile) {
  const birth = profile?.birth || {};
  const y = String(Number(birth.year || 0)).padStart(4, "0");
  const m = String(Number(birth.month || 0)).padStart(2, "0");
  const d = String(Number(birth.day || 0)).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* 인증 조회를 이 필드까지 확장해 authUserDoc 로 받아, 아래 resolveSukuyoYearlyProfile 이
   현재 프로필을 알기 위해 User 를 다시 읽는 왕복을 없앤다(worker/lib/auth.js resolveActiveUserAuth). */
const SUKUYO_YEARLY_USER_PROJECTION = { destinyProfilesCurrentId: 1 };

/* 프로필 해석을 withMongoRetry 한 번으로 끝낸다.
   종전엔 User·ProfileCard 를 각각 감싸 왕복 2회였고, 각 왕복이 독립적으로 op-타임아웃(비재시도)
   위험을 져 둘 중 하나만 걸려도 요청 전체가 503이 됐다.
   게다가 요청이 profileId 를 실어 보내도(클라 정상 경로) User 를 읽고 버렸다 —
   읽을 필요가 없을 때는 아예 읽지 않는다. 인증 단계가 붙여 준 문서(authUserDoc)도 있으면 재사용한다. */
async function resolveSukuyoYearlyProfile(env, auth, profileIdRaw) {
  const requestedProfileId = clean(profileIdRaw);
  // authUserDoc 는 access-token 인증 경로에서만 붙는다(refresh/admin 경로엔 없음) → 없으면 아래에서 조회.
  const authProfileId = clean(auth?.authUserDoc?.destinyProfilesCurrentId);

  const resolved = await withMongoRetry(env, async () => {
    let profileId = requestedProfileId || authProfileId;
    if (!profileId) {
      const user = await User.findById(auth.userId).select("destinyProfilesCurrentId").lean();
      profileId = clean(user?.destinyProfilesCurrentId);
    }
    if (!profileId) return { profileId: "", profile: null };
    const profile = await ProfileCard.findOne({ userId: auth.userId, profileId }).lean();
    return { profileId, profile };
  });

  // 404/403 은 재시도해도 결과가 바뀌지 않으므로 콜백 바깥에서 던진다(재시도 대상 제외).
  if (!resolved.profileId) {
    const error = new Error("숙요점 1년운을 열 프로필을 먼저 선택해 주세요.");
    error.status = 403;
    error.code = "PROFILE_REQUIRED";
    throw error;
  }
  if (!resolved.profile) {
    const error = new Error("선택한 프로필을 찾지 못했습니다.");
    error.status = 404;
    error.code = "PROFILE_NOT_FOUND";
    throw error;
  }
  return resolved.profile;
}

/* 1년운 3개 라우트는 requireAuth 가 아니라 resolvePaidRouteAuth 를 쓴다(다른 유료 라우트 정본과 동일).
   requireAuth 는 일시적 DB 장애를 status 없는 raw 에러로 던져 handleRouteError 가 code/retryable 없는
   맨 503 + 영문 "Database is temporarily unavailable." 로 내보냈다 — 클라가 재시도할 근거가 없었다.
   resolvePaidRouteAuth 는 진짜 게스트엔 null(→ 아래에서 한국어 401), infra 장애엔
   HttpError(503, AUTH_STATUS_TEMPORARILY_UNAVAILABLE, retryable:true) 를 준다. */
function requireSukuyoYearlyAuth(auth) {
  if (auth?.userId) return auth;
  const error = new Error("숙요점 1년운을 열려면 로그인이 필요합니다.");
  error.status = 401;
  error.code = "AUTH_REQUIRED";
  throw error;
}

function resolveSukuyoLunarFromProfile(profile) {
  const birth = profile?.birth || {};
  const year = Number(birth.year);
  const month = Number(birth.month);
  const day = Number(birth.day);
  const hour = Number.isFinite(Number(birth.hour)) ? Number(birth.hour) : 12;
  const minute = Number.isFinite(Number(birth.minute)) ? Number(birth.minute) : 0;
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const calendarType = clean(birth.calType || "solar").toLowerCase();
  if (calendarType === "lunar" || calendarType === "lunar_leap") {
    return { year, month, day, isLeap: calendarType === "lunar_leap" };
  }
  const lunar = Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar();
  const lunarMonth = Number(lunar.getMonth());
  return {
    year: Number(lunar.getYear()),
    month: Math.abs(lunarMonth),
    day: Number(lunar.getDay()),
    isLeap: lunarMonth < 0,
  };
}

function relationFromSukuyoDistance(distance) {
  const d = ((Number(distance) % 27) + 27) % 27;
  if (d === 0) return { label: "명", theme: "내 안의 원형이 또렷해지는 달", opportunity: "정체성과 이름값을 새롭게 세울 기회", caution: "혼자 결정한 기준을 모두에게 적용하려는 마음" };
  if ([1, 8, 10, 17, 19, 26].includes(d)) return { label: "영친", theme: "사람과 자원이 부드럽게 이어지는 달", opportunity: "귀인, 소개, 협업, 재회 흐름", caution: "호의와 의무를 혼동하는 선택" };
  if ([2, 7, 11, 16, 20, 25].includes(d)) return { label: "우쇠", theme: "편안함 속에서 실속을 다지는 달", opportunity: "루틴 정비와 안정적인 수익 구조", caution: "익숙함 때문에 미뤄둔 결정을 방치하는 흐름" };
  if ([3, 6, 12, 15, 21, 24].includes(d)) return { label: "안괴", theme: "경계와 욕망이 동시에 떠오르는 달", opportunity: "낡은 패턴을 끊고 판을 다시 짜는 힘", caution: "감정적인 확장, 충동 계약, 날 선 말" };
  return { label: "성위", theme: "역할과 성취가 현실로 굳어지는 달", opportunity: "성과 발표, 시험, 승진, 사업 구조화", caution: "성과를 빨리 증명하려다 회복을 줄이는 선택" };
}

function buildSukuyoYearlyFortuneResult({ auth, profile, targetYear }) {
  const lunar = resolveSukuyoLunarFromProfile(profile);
  if (!lunar) {
    const error = new Error("숙요점 1년운 계산에 필요한 생년월일이 부족합니다.");
    error.status = 422;
    error.code = "INVALID_PROFILE_BIRTH";
    throw error;
  }
  const natal = buildSukuyoFromLunar(lunar.month, lunar.day, { isLeapMonth: lunar.isLeap, source: "profile-canonical" }) || {};
  const natalName = clean(natal.nameKo || natal.name || natal.label || natal.mansion || "본명숙");
  const natalIndex = Number.isFinite(Number(natal.index)) ? Number(natal.index) : 0;
  const birth = profile.birth || {};
  const seed = hashSukuyoYearlySeed([
    auth.userId,
    profile.profileId,
    birth.year,
    birth.month,
    birth.day,
    birth.hour,
    birth.minute,
    profile.gender,
    targetYear,
    SUKYO_YEARLY_FORTUNE_PRODUCT_KEY,
  ].join("|"));
  const archetypes = [
    { key: "달빛 정렬", tone: "흩어진 약속과 감정의 결을 다시 맞추는 해", action: "새로 넓히기보다 이미 가진 관계와 일을 선명하게 정리하세요." },
    { key: "인연 개화", tone: "사람을 통해 길이 열리고 오래된 문이 다시 빛나는 해", action: "소개, 협업, 재회의 신호가 오면 조건을 분명히 두고 받아들이세요." },
    { key: "기반 축성", tone: "느린 축적이 나중의 큰 흐름을 받치는 해", action: "월별 지출, 체력, 업무 루틴을 기록으로 남기세요." },
    { key: "경계 재편", tone: "끌림과 부담을 분리하며 나의 영역을 되찾는 해", action: "급한 계약과 감정적 약속은 하루를 묵힌 뒤 움직이세요." },
    { key: "성과 점등", tone: "이름, 실적, 평판이 밖으로 드러나는 해", action: "드러낼 결과물을 작게라도 완성해 사람 앞에 올리세요." },
  ];
  const themeProfile = archetypes[(seed + natalIndex) % archetypes.length];
  const totalScore = scoreSukuyoYearly(seed, 70 + (natalIndex % 5), 14, 1);
  const firstScore = scoreSukuyoYearly(seed, 66 + (natalIndex % 7), 13, 2);
  const secondScore = scoreSukuyoYearly(seed, 69 + (natalIndex % 6), 13, 3);
  const keywords = [
    themeProfile.key,
    pickSukuyoYearly(["영친의 문", "우쇠의 안정", "안괴의 재편", "성위의 결실", "명궁의 회복"], seed, 4),
    pickSukuyoYearly(["월별 속도 조절", "관계의 선명함", "돈의 기준선", "몸의 리듬", "작은 완성"], seed, 8),
  ];
  const monthTitles = ["문이 열림", "숨 고르기", "관계 조율", "기반 정리", "실행 점화", "감정 정돈", "성과 노출", "계약 검증", "회복과 재배치", "귀인 접속", "돈의 기준", "마무리와 봉인"];
  const monthlyFlow = Array.from({ length: 12 }, (_, index) => {
    const monthSukuyo = buildSukuyoFromLunar(((index + targetYear) % 12) + 1, ((natalIndex + index * 2 + targetYear) % 27) + 1, { source: "yearly-month-seed" }) || {};
    const monthIndex = Number.isFinite(Number(monthSukuyo.index)) ? Number(monthSukuyo.index) : (natalIndex + index + 1) % 27;
    const distance = (monthIndex - natalIndex + 27) % 27;
    const relation = relationFromSukuyoDistance(distance);
    const score = scoreSukuyoYearly(seed, 64 + (distance % 9), 15, index + 10);
    return {
      month: index + 1,
      title: `${monthTitles[index]} · ${relation.label}`,
      score,
      theme: `${index + 1}월에는 월숙 ${clean(monthSukuyo.nameKo || monthSukuyo.name || "월숙")}이 본명숙 ${natalName}에 ${relation.label}의 결로 닿습니다. ${relation.theme}이 강하게 떠오릅니다.`,
      opportunity: relation.opportunity,
      caution: relation.caution,
      action: score >= 74
        ? "좋은 흐름은 바로 약속으로 고정하고, 결과가 보이는 일부터 앞에 두세요."
        : score >= 60
          ? "속도를 일정하게 유지하며 관계와 돈의 조건을 한 번 더 맞추세요."
          : "새로운 확장보다 정리, 검증, 회복을 먼저 두면 손실이 줄어듭니다.",
    };
  });
  const risingMonths = monthlyFlow.filter((item) => item.score >= 74).slice(0, 3).map((item) => `${item.month}월`);
  const cautionMonths = monthlyFlow.filter((item) => item.score < 60).slice(0, 3).map((item) => `${item.month}월`);
  const profileSummary = {
    name: clean(profile.name || "사용자"),
    birthDate: formatSukuyoBirthDate(profile),
    calendarType: clean(profile.birth?.calType || "solar"),
    gender: normalizeSukuyoGenderLabel(profile.gender),
    targetYear,
    "natal宿": natalName,
  };
  return {
    profileSummary,
    yearlyTheme: {
      title: `${targetYear}년 ${natalName}의 ${themeProfile.key}`,
      keywords,
      summary: `${natalName}의 ${targetYear}년에는 ${themeProfile.tone}가 드러납니다. 상승기는 ${risingMonths.join(", ") || "상반기 중반"}에 머물고, 조심해야 할 흐름은 ${cautionMonths.join(", ") || "분기 전환기"}에 비칩니다. ${themeProfile.action}`,
    },
    totalFortune: {
      score: totalScore,
      text: `올해 총운은 본명숙 ${natalName}이 가진 ${pickSukuyoYearly(["예민한 직감", "빠른 반응성", "신중한 판단", "강한 회복력", "관계 감지력"], seed, 12)}이 현실의 선택과 만나는 해입니다. 큰 행운 하나보다 월마다 달라지는 관계의 거리, 돈의 기준, 몸의 리듬을 섬세하게 맞출 때 운이 깊어집니다. ${themeProfile.key}의 흐름은 이미 곁에 있던 기회가 이름을 얻는 모습으로 떠오릅니다.`,
    },
    firstHalf: {
      score: firstScore,
      text: `상반기는 기반을 다지는 달빛이 강합니다. ${monthlyFlow.slice(0, 6).map((item) => `${item.month}월 ${item.title}`).join(", ")}의 순서로 문이 열리며, 관계에서는 말의 속도보다 약속의 정확도가 중요하게 비칩니다.`,
      action: "새로 시작하는 일은 작게 시험하고, 지출과 일정은 숫자로 남기세요.",
    },
    secondHalf: {
      score: secondScore,
      text: `하반기는 성과와 정리의 결이 함께 흐릅니다. ${monthlyFlow.slice(6).map((item) => `${item.month}월 ${item.title}`).join(", ")}의 리듬 속에서 오래 끌던 일이 형태를 얻고, 맞지 않는 인연은 자연스럽게 거리가 잡힙니다.`,
      action: "좋은 제안도 조건표를 먼저 보고, 오래된 부담은 역할을 다시 나누세요.",
    },
    monthlyFlow,
    loveAndRelationship: {
      score: scoreSukuyoYearly(seed, 68, 16, 31),
      text: `연애와 관계에서는 ${pickSukuyoYearly(["영친처럼 다정한 연결", "우쇠처럼 편안한 안정", "안괴처럼 강한 끌림", "성위처럼 현실적인 약속"], seed, 32)}이 떠오릅니다. 마음이 빨라지는 순간일수록 말의 온도와 약속의 범위를 함께 맞춰야 합니다.`,
      advice: "호감은 자주 표현하되, 관계의 이름과 속도는 상대의 현실까지 보고 정하세요.",
    },
    workAndBusiness: {
      score: scoreSukuyoYearly(seed, 69, 15, 41),
      text: `일과 사업운은 본명숙 ${natalName}의 장점이 반복 업무보다 선택과 집중에서 빛납니다. 성과는 한 번에 터지기보다 월별로 쌓이며, 특히 ${risingMonths.join(", ") || "기회가 밝은 달"}에는 외부 제안과 협업이 강하게 떠오릅니다.`,
      advice: "작은 결과물을 먼저 공개하고, 계약은 역할·마감·정산 기준을 문서로 남기세요.",
    },
    money: {
      score: scoreSukuyoYearly(seed, 66, 15, 51),
      text: "금전운은 달마다 온도 차가 납니다. 들어오는 돈보다 새어 나가는 돈의 결을 잡을 때 전체 운이 안정됩니다. 충동 구매와 감정적 투자보다 반복 수입, 고정비 조정, 현금 흐름 정리가 복을 부릅니다.",
      advice: "큰 지출은 하루 늦추고, 월초에는 예산선, 월말에는 남은 현금을 반드시 맞추세요.",
    },
    healthAndMind: {
      score: scoreSukuyoYearly(seed, 67, 14, 61),
      text: "건강과 멘탈은 수면, 눈, 소화, 긴장성 피로 쪽으로 신호가 비칩니다. 운이 커지는 달에는 체력이 먼저 닳을 수 있으니 회복 루틴을 일정 안에 넣어야 달빛이 흐려지지 않습니다.",
      advice: "밤 시간의 화면과 과한 약속을 줄이고, 보름 전후에는 몸을 비우는 루틴을 두세요.",
    },
    noblePersonAndCaution: {
      noblePerson: `${pickSukuyoYearly(["영친", "우쇠", "성위"], seed, 71)}의 기운을 가진 사람, 약속을 숫자와 일정으로 맞춰 주는 사람`,
      cautionPerson: `${pickSukuyoYearly(["안괴", "명", "우쇠"], seed, 72)}의 그림자가 강한 사람, 감정으로 결정을 재촉하는 사람`,
      relationshipAdvice: "올해의 인연은 오래 붙드는 힘보다 서로의 경계를 존중할 때 깊어집니다.",
    },
    sukuyoMasterFocus: {
      yearlyGate: `${targetYear}년의 문은 ${pickSukuyoYearly(["관계의 이름을 다시 세우는 자리", "오래 미룬 약속이 형태를 얻는 자리", "돈과 마음의 경계를 함께 정돈하는 자리", "몸의 리듬을 지켜야 운이 열리는 자리"], seed, 81)}로 열립니다.`,
      moonPacing: `${natalName}에게 올해의 달은 ${pickSukuyoYearly(["초승에는 작게 시작하고 보름에는 약속을 확인하라", "상현에는 말을 아끼고 하현에는 지출을 정리하라", "밝은 달에는 드러내고 어두운 달에는 회복하라"], seed, 82)}고 가리킵니다.`,
      taboo: `${pickSukuyoYearly(["감정이 가장 뜨거운 날 바로 계약하는 일", "상대의 속도를 내 운의 속도로 착각하는 일", "회복되지 않은 인연을 성급히 다시 여는 일"], seed, 83)}은 올해의 숙요 금기로 떠오릅니다.`,
      repairKey: `${pickSukuyoYearly(["사흘의 침묵 뒤 한 문장의 약속", "숫자로 남긴 일정과 정산", "보름 전후의 관계 거리 조율", "월말의 현금 흐름 정리"], seed, 84)}이 복을 다시 부르는 열쇠로 머무릅니다.`,
    },
    finalPrescription: {
      oneLine: `${targetYear}년 ${natalName}에게는 달마다 오는 문을 모두 열기보다, 내 별이 편안히 숨 쉬는 문만 고르는 지혜가 필요합니다.`,
      doThis: ["월초 목표 하나를 정하기", "보름 전후 관계와 지출 점검하기", "좋은 제안은 작은 실행으로 먼저 검증하기"],
      avoidThis: ["감정이 오른 날 계약하기", "다른 프로필의 운을 내 흐름처럼 섞기", "회복 시간을 줄여 성과를 밀어붙이기"],
    },
  };
}

function buildSukuyoYearlyPreview(fullResult) {
  const totalText = clean(fullResult?.totalFortune?.text);
  return {
    profileSummary: fullResult.profileSummary,
    yearlyTheme: fullResult.yearlyTheme,
    totalFortunePreview: {
      score: fullResult.totalFortune.score,
      text: totalText.length > 120 ? `${totalText.slice(0, 120)}...` : totalText,
    },
    monthlyPreview: fullResult.monthlyFlow.slice(0, 2),
    lockedNotice: "전체 12개월 흐름, 사랑/금전/사업/건강운은 잠금 해제 후 열립니다.",
  };
}

function formatSukuyoYearlyAnchorDate(year, month) {
  return `${String(Number(year)).padStart(4, "0")}-${String(Number(month)).padStart(2, "0")}-15`;
}

function resolveSukuyoYearlyAnchor(year, month) {
  const solar = Solar.fromYmdHms(Number(year), Number(month), 15, 12, 0, 0);
  const lunar = solar.getLunar();
  const lunarMonthRaw = Number(lunar.getMonth());
  const lunarMonth = Math.abs(lunarMonthRaw);
  const lunarDay = Number(lunar.getDay());
  const monthSukuyo = buildSukuyoFromLunar(lunarMonth, lunarDay, {
    isLeapMonth: lunarMonthRaw < 0,
    source: "yearly-month-anchor",
  }) || {};
  return {
    anchorDate: formatSukuyoYearlyAnchorDate(year, month),
    lunarDate: {
      year: Number(lunar.getYear()),
      month: lunarMonth,
      day: lunarDay,
      isLeapMonth: lunarMonthRaw < 0,
    },
    monthSukuyo,
  };
}

function relationFromSukuyoYearlyDistance(distance) {
  const d = ((Number(distance) % 27) + 27) % 27;
  if (d === 0) {
    return {
      label: "명",
      theme: "내 본명숙의 원형이 그대로 되비치는 달",
      opportunity: "정체성, 이름값, 중요한 기준을 다시 세울 기회",
      caution: "혼자 정한 기준을 모두에게 요구하려는 마음",
    };
  }
  if ([1, 8, 10, 17, 19, 26].includes(d)) {
    return {
      label: "영친",
      theme: "사람과 자원이 부드럽게 이어지는 달",
      opportunity: "귀인, 소개, 협업, 재회 흐름",
      caution: "호의와 의무를 혼동하는 선택",
    };
  }
  if ([2, 7, 11, 16, 20, 25].includes(d)) {
    return {
      label: "우쇠",
      theme: "편안함 속에서 실속을 다지는 달",
      opportunity: "루틴 정비와 안정적인 수익 구조",
      caution: "익숙함 때문에 미뤄 둔 결정을 방치하는 흐름",
    };
  }
  if ([3, 6, 12, 15, 21, 24].includes(d)) {
    return {
      label: "안괴",
      theme: "경계와 욕망이 동시에 떠오르는 달",
      opportunity: "낡은 패턴을 끊고 판을 다시 짜는 힘",
      caution: "감정적인 확장, 충동 계약, 날 선 말",
    };
  }
  return {
    label: "성위",
    theme: "역할과 성취가 현실로 굳어지는 달",
    opportunity: "성과 발표, 시험, 승진, 사업 구조화",
    caution: "성과를 빨리 증명하려다 회복을 줄이는 선택",
  };
}

function sukuyoYearlyScoreBand(score) {
  const n = Number(score);
  if (n >= 82) return { label: "강한 상승", tone: "열리는 문이 분명하니, 좋은 제안은 작은 약속으로 바로 고정해도 좋습니다." };
  if (n >= 72) return { label: "안정 상승", tone: "기회가 천천히 붙습니다. 서두르기보다 조건을 맞추면 운이 길어집니다." };
  if (n >= 60) return { label: "조율 구간", tone: "무리한 확장보다 관계, 돈, 체력의 균형을 맞출수록 흐름이 안정됩니다." };
  return { label: "정비 구간", tone: "새로 벌리기보다 정리와 회복을 먼저 두면 손실이 줄어듭니다." };
}

function sukuyoMansionDisplay(mansion = {}) {
  const name = clean(mansion.nameKo || mansion.name || mansion.label || mansion.mansion || "월숙");
  const han = clean(mansion.nameHan || mansion.han || "");
  return han ? `${name}(${han})` : name;
}

function buildSukuyoYearlyDomain({ title, score, mainText, advice, evidence = [], months = [] }) {
  return {
    title,
    score,
    text: mainText,
    advice,
    evidence,
    keyMonths: months.map((item) => `${item.month}월 ${item.relation?.label || ""}`.trim()).slice(0, 3),
  };
}

function buildSukuyoYearlyFortuneResultV2({ auth, profile, targetYear }) {
  const lunar = resolveSukuyoLunarFromProfile(profile);
  if (!lunar) {
    const error = new Error("숙요점 1년운 계산에 필요한 생년월일이 부족합니다.");
    error.status = 422;
    error.code = "INVALID_PROFILE_BIRTH";
    throw error;
  }

  const natal = buildSukuyoFromLunar(lunar.month, lunar.day, { isLeapMonth: lunar.isLeap, source: "profile-canonical" }) || {};
  const natalName = clean(natal.nameKo || natal.name || natal.label || natal.mansion || "본명숙");
  const natalIndex = Number.isFinite(Number(natal.index)) ? Number(natal.index) : 0;
  const birth = profile.birth || {};
  const seed = hashSukuyoYearlySeed([
    auth.userId,
    profile.profileId,
    birth.year,
    birth.month,
    birth.day,
    birth.hour,
    birth.minute,
    profile.gender,
    targetYear,
    SUKYO_YEARLY_FORTUNE_PRODUCT_KEY,
    "v2",
  ].join("|"));
  const archetypes = [
    { key: "달빛 정렬", tone: "흩어진 약속과 감정의 결을 다시 맞추는 해", action: "이미 곁에 있는 관계와 일을 선명하게 정리할수록 복이 붙습니다." },
    { key: "인연 개화", tone: "사람을 통해 길이 열리고 오래된 문이 다시 빛나는 해", action: "소개, 협업, 재회의 신호가 오면 조건을 분명히 두고 받아들이세요." },
    { key: "기반 축성", tone: "느린 축적이 나중의 큰 흐름을 받치는 해", action: "월별 지출, 체력, 업무 루틴을 기록으로 남기면 운의 흔들림이 줄어듭니다." },
    { key: "경계 재편", tone: "끌림과 부담을 분리하며 나의 영역을 되찾는 해", action: "급한 계약과 감정적 약속은 하루를 묵힌 뒤 움직이세요." },
    { key: "성과 점등", tone: "이름, 실적, 평판이 밖으로 드러나는 해", action: "드러낼 결과물을 작게라도 완성해 사람 앞에 올리세요." },
  ];
  const themeProfile = archetypes[(seed + natalIndex) % archetypes.length];
  const totalScore = scoreSukuyoYearly(seed, 72 + (natalIndex % 5), 13, 1);
  const firstScore = scoreSukuyoYearly(seed, 68 + (natalIndex % 7), 12, 2);
  const secondScore = scoreSukuyoYearly(seed, 70 + (natalIndex % 6), 12, 3);
  const monthTitles = ["문이 열림", "숨 고르기", "관계 조율", "기반 정리", "실행 점화", "감정 정돈", "성과 노출", "계약 검증", "회복과 재배치", "귀인 접속", "돈의 기준", "마무리와 봉인"];
  const monthlyFlow = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const anchor = resolveSukuyoYearlyAnchor(targetYear, month);
    const monthSukuyo = anchor.monthSukuyo;
    const monthIndex = Number.isFinite(Number(monthSukuyo.index)) ? Number(monthSukuyo.index) : (natalIndex + index + 1) % 27;
    const distance = (monthIndex - natalIndex + 27) % 27;
    const relation = relationFromSukuyoYearlyDistance(distance);
    const score = scoreSukuyoYearly(seed, 65 + (distance % 9), 14, index + 10);
    const scoreBand = sukuyoYearlyScoreBand(score);
    const monthName = sukuyoMansionDisplay(monthSukuyo);
    return {
      month,
      anchorDate: anchor.anchorDate,
      lunarDate: anchor.lunarDate,
      monthSukuyo: {
        index: monthIndex,
        nameKo: clean(monthSukuyo.nameKo || monthSukuyo.name || "월숙"),
        nameHan: clean(monthSukuyo.nameHan || ""),
        label: monthName,
        direction: clean(monthSukuyo.direction || ""),
        element: clean(monthSukuyo.element || ""),
        keywords: Array.isArray(monthSukuyo.keywords) ? monthSukuyo.keywords.slice(0, 4) : [],
      },
      distance,
      relation,
      title: `${monthTitles[index]} · ${relation.label}`,
      score,
      scoreBand,
      theme: `${month}월에는 ${anchor.anchorDate}의 월숙 ${monthName}이 본명숙 ${natalName}에 ${relation.label}의 결로 닿습니다. ${relation.theme}이 강하게 떠오르고, ${scoreBand.tone}`,
      relationship: `${relation.label}의 달빛은 사람 사이의 거리와 약속의 온도를 먼저 비춥니다. 호의가 들어오면 바로 붙잡기보다 서로의 역할과 기대치를 맞출 때 인연이 편안히 깊어집니다.`,
      workMoney: `${monthName}의 기운은 일과 돈에서 ${relation.opportunity}을 가리킵니다. 이달의 실속은 큰 승부보다 일정, 정산, 책임 범위를 분명히 적는 데서 열립니다.`,
      healthMind: `${relation.caution}이 마음을 흔들 수 있습니다. 몸의 리듬은 월초보다 월중 이후에 반응하니, 수면과 회복 시간을 먼저 지켜야 판단이 흐려지지 않습니다.`,
      opportunity: relation.opportunity,
      action: score >= 74
        ? "좋은 흐름은 작은 약속으로 바로 고정하고, 결과가 보이는 일부터 앞에 두세요."
        : score >= 60
          ? "속도를 일정하게 유지하며 관계와 돈의 조건을 한 번 더 맞추세요."
          : "새로운 확장보다 정리, 검증, 회복을 먼저 두면 손실이 줄어듭니다.",
      caution: relation.caution,
    };
  });

  const risingMonths = monthlyFlow.filter((item) => item.score >= 74).slice(0, 3);
  const cautionMonths = monthlyFlow.filter((item) => item.score < 60).slice(0, 3);
  const relationCounts = monthlyFlow.reduce((acc, item) => {
    const key = item.relation?.label || "기타";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const dominantRelation = Object.entries(relationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "명";
  const profileSummary = {
    name: clean(profile.name || "사용자"),
    birthDate: formatSukuyoBirthDate(profile),
    calendarType: clean(profile.birth?.calType || "solar"),
    gender: normalizeSukuyoGenderLabel(profile.gender),
    targetYear,
    "natal宿": natalName,
  };
  const calculationBasis = {
    methodVersion: "sukuyo-yearly-v2",
    targetYear,
    natalSukuyo: {
      index: natalIndex,
      nameKo: natalName,
      nameHan: clean(natal.nameHan || ""),
      lunarDate: `${lunar.year}-${String(lunar.month).padStart(2, "0")}-${String(lunar.day).padStart(2, "0")}`,
      isLeapMonth: Boolean(lunar.isLeap),
      direction: clean(natal.direction || ""),
      element: clean(natal.element || ""),
      keywords: Array.isArray(natal.keywords) ? natal.keywords.slice(0, 4) : [],
    },
    monthlyAnchor: "각 월 15일 KST 정오의 양력 기준을 음력 27숙으로 환산",
    dominantRelation,
    risingMonths: risingMonths.map((item) => `${item.month}월`),
    cautionMonths: cautionMonths.map((item) => `${item.month}월`),
  };
  const keywords = [
    themeProfile.key,
    `${dominantRelation}의 문`,
    pickSukuyoYearly(["월별 속도 조절", "관계의 선명함", "돈의 기준선", "몸의 리듬", "작은 완성"], seed, 8),
  ];
  return {
    calculationBasis,
    profileSummary,
    yearlyTheme: {
      title: `${targetYear}년 ${natalName}의 ${themeProfile.key}`,
      keywords,
      evidence: [
        `본명숙 ${natalName}`,
        `연간 우세 관계 ${dominantRelation}`,
        `상승 달 ${risingMonths.map((item) => `${item.month}월`).join(", ") || "분기 전환기"}`,
        `주의 달 ${cautionMonths.map((item) => `${item.month}월`).join(", ") || "월말 정리기"}`,
      ],
      summary: `${natalName}의 ${targetYear}년에는 ${themeProfile.tone}가 드러납니다. 상승기는 ${risingMonths.map((item) => `${item.month}월`).join(", ") || "상반기 중반"}에 머물고, 조심해야 할 흐름은 ${cautionMonths.map((item) => `${item.month}월`).join(", ") || "분기 전환기"}에 비칩니다. ${themeProfile.action}`,
    },
    totalFortune: {
      score: totalScore,
      text: `올해 총운은 본명숙 ${natalName}이 가진 달의 감지력이 월별 숙의 변화와 만나는 해입니다. ${dominantRelation}의 흐름이 가장 자주 떠오르므로, 큰 행운 하나를 기다리기보다 사람, 돈, 몸의 리듬이 동시에 맞는 문을 골라 여는 지혜가 필요합니다. ${themeProfile.key}의 기운은 이미 곁에 있던 기회가 이름을 얻는 모습으로 드러납니다.`,
    },
    firstHalf: {
      score: firstScore,
      text: `상반기는 기반을 다지는 달빛이 강합니다. ${monthlyFlow.slice(0, 6).map((item) => `${item.month}월 ${item.title}`).join(", ")}의 순서로 문이 열리며, 관계에서는 말의 속도보다 약속의 정확도가 중요하게 비칩니다.`,
      action: "새로 시작하는 일은 작게 시험하고, 지출과 일정은 숫자로 남기세요.",
    },
    secondHalf: {
      score: secondScore,
      text: `하반기는 성과와 정리의 결이 함께 흐릅니다. ${monthlyFlow.slice(6).map((item) => `${item.month}월 ${item.title}`).join(", ")}의 리듬 속에서 오래 끌던 일이 형태를 얻고, 맞지 않는 인연은 자연스럽게 거리가 잡힙니다.`,
      action: "좋은 제안도 조건표를 먼저 보고, 오래된 부담은 역할을 다시 나누세요.",
    },
    monthlyFlow,
    loveAndRelationship: buildSukuyoYearlyDomain({
      title: "사랑/관계운",
      score: scoreSukuyoYearly(seed, 69, 15, 31),
      mainText: `사랑과 관계에서는 ${dominantRelation}의 결이 가장 크게 떠오릅니다. 마음이 빨라지는 순간일수록 말의 온도와 약속의 범위를 함께 맞춰야 관계가 오래 갑니다. 상승 달에는 표현을 아끼지 말고, 주의 달에는 관계의 이름보다 서로가 감당할 현실을 먼저 살피세요.`,
      advice: "호감은 자주 표현하되, 관계의 속도는 상대의 생활 리듬과 책임 범위까지 보고 정하세요.",
      evidence: [`본명숙 ${natalName}`, `우세 관계 ${dominantRelation}`],
      months: risingMonths,
    }),
    workAndBusiness: buildSukuyoYearlyDomain({
      title: "일/사업/학업운",
      score: scoreSukuyoYearly(seed, 70, 14, 41),
      mainText: `일과 사업운은 월별 숙의 변화가 성과의 속도를 나눕니다. ${risingMonths.map((item) => `${item.month}월`).join(", ") || "상승 구간"}에는 외부 제안과 발표운이 밝고, ${cautionMonths.map((item) => `${item.month}월`).join(", ") || "정비 구간"}에는 계약 조건과 마감 기준을 다시 보아야 합니다.`,
      advice: "작은 결과물을 먼저 공개하고, 역할·마감·정산 기준은 문서로 남기세요.",
      evidence: monthlyFlow.slice(0, 3).map((item) => `${item.month}월 ${item.monthSukuyo.label}`),
      months: risingMonths,
    }),
    money: buildSukuyoYearlyDomain({
      title: "금전운",
      score: scoreSukuyoYearly(seed, 67, 15, 51),
      mainText: "금전운은 한 번의 큰 수익보다 새는 돈을 막는 힘이 먼저 들어옵니다. 돈의 흐름은 관계와 함께 움직이므로, 호의로 시작한 약속도 비용과 책임을 나누어 적을 때 재물이 안정됩니다.",
      advice: "월초에는 예산을 세우고, 보름 전후에는 지출과 미수금을 확인하며, 월말에는 현금 흐름을 정리하세요.",
      evidence: [`상승 달 ${risingMonths.map((item) => `${item.month}월`).join(", ") || "없음"}`, `주의 달 ${cautionMonths.map((item) => `${item.month}월`).join(", ") || "없음"}`],
      months: cautionMonths,
    }),
    healthAndMind: buildSukuyoYearlyDomain({
      title: "건강/멘탈운",
      score: scoreSukuyoYearly(seed, 68, 14, 61),
      mainText: "건강과 멘탈은 수면, 말, 일정 과부하에서 먼저 신호가 비칩니다. 운이 밝은 달에도 회복 시간을 줄이면 감정 판단이 거칠어지니, 몸의 리듬을 지키는 일이 올해의 보호막입니다.",
      advice: "보름 전후로 수면과 약속을 줄이고, 긴장도가 높은 달에는 운동보다 회복 루틴을 우선하세요.",
      evidence: [`본명숙 ${natalName}`, `정비 달 ${cautionMonths.map((item) => `${item.month}월`).join(", ") || "월말"}`],
      months: cautionMonths,
    }),
    noblePersonAndCaution: {
      noblePerson: `${pickSukuyoYearly(["영친", "우쇠", "성위"], seed, 71)}의 기운을 가진 사람, 약속을 숫자와 일정으로 맞춰 주는 사람`,
      cautionPerson: `${pickSukuyoYearly(["안괴", "명", "우쇠"], seed, 72)}의 그림자가 강한 사람, 감정으로 결정을 재촉하는 사람`,
      relationshipAdvice: "올해의 인연은 오래 붙드는 힘보다 서로의 경계를 존중하는 태도에서 깊어집니다.",
    },
    sukuyoMasterFocus: {
      yearlyGate: `${targetYear}년의 문은 ${pickSukuyoYearly(["관계의 이름을 다시 세우는 자리", "오래 미룬 약속이 형태를 얻는 자리", "돈과 마음의 경계를 함께 정돈하는 자리", "몸의 리듬을 지켜야 운이 열리는 자리"], seed, 81)}로 열립니다.`,
      moonPacing: `${natalName}에게 올해의 달은 ${pickSukuyoYearly(["초승에는 작게 시작하고 보름에는 약속을 확인하라", "상현에는 말을 아끼고 하현에는 지출을 정리하라", "밝은 달에는 드러내고 어두운 달에는 회복하라"], seed, 82)}고 가리킵니다.`,
      taboo: `${pickSukuyoYearly(["감정이 가장 뜨거운 날 바로 계약하는 일", "상대의 속도를 내 운의 속도로 착각하는 일", "회복되지 않은 인연을 성급히 다시 여는 일"], seed, 83)}은 올해의 숙요 금기로 떠오릅니다.`,
      repairKey: `${pickSukuyoYearly(["사흘의 침묵 뒤 한 문장의 약속", "숫자로 남긴 일정과 정산", "보름 전후의 관계 거리 조율", "월말의 현금 흐름 정리"], seed, 84)}이 복을 다시 부르는 열쇠로 머무릅니다.`,
    },
    finalPrescription: {
      oneLine: `${targetYear}년 ${natalName}에게는 달마다 오는 문을 모두 열기보다, 내 별이 편안히 숨 쉬는 문만 고르는 지혜가 필요합니다.`,
      doThis: ["월초 목표 하나를 정하기", "보름 전후 관계와 지출 점검하기", "좋은 제안은 작은 실행으로 먼저 검증하기"],
      avoidThis: ["감정이 오른 날 계약하기", "다른 프로필의 운을 내 흐름처럼 섞기", "회복 시간을 줄여 성과를 밀어붙이기"],
    },
  };
}

async function findSukuyoYearlyUnlock({ userId, profileId, targetYear, env = {} }) {
  const contentKey = sukuyoYearlyContentKey(targetYear);
  return withMongoRetry(env, () => findActivePaidContentUnlockByServiceKeys({
    userId,
    profileId,
    serviceKeys: [SUKUYO_YEARLY_FORTUNE_SERVICE_KEY, "ziwei", "saju"],
    contentKey,
  }));
}

async function handleSukuyoYearlyFortune(request, env) {
  const auth = requireSukuyoYearlyAuth(await resolvePaidRouteAuth(request, env, { userProjection: SUKUYO_YEARLY_USER_PROJECTION }));
  const url = new URL(request.url);
  const targetYear = normalizeSukuyoTargetYear(url.searchParams.get("year"));
  const profile = await resolveSukuyoYearlyProfile(env, auth, url.searchParams.get("profileId"));
  const fullResult = buildSukuyoYearlyFortuneResultV2({ auth, profile, targetYear });
  const unlock = await findSukuyoYearlyUnlock({ userId: auth.userId, profileId: profile.profileId, targetYear, env });
  const unlocked = Boolean(unlock?._id);
  return json({
    ok: true,
    productKey: SUKYO_YEARLY_FORTUNE_PRODUCT_KEY,
    contentKey: sukuyoYearlyContentKey(targetYear),
    pricing: {
      amountKrw: SUKYO_YEARLY_FORTUNE_PRICE_KRW,
      coinPrice: SUKYO_YEARLY_FORTUNE_PRICE_COINS,
      currency: "KRW",
    },
    unlockScope: {
      userId: auth.userId,
      profileId: profile.profileId,
      productKey: SUKYO_YEARLY_FORTUNE_PRODUCT_KEY,
      targetYear,
    },
    unlocked,
    preview: unlocked ? null : buildSukuyoYearlyPreview(fullResult),
    result: unlocked ? fullResult : null,
  });
}

async function handleSukuyoYearlyUnlock(request, env) {
  const auth = requireSukuyoYearlyAuth(await resolvePaidRouteAuth(request, env, { userProjection: SUKUYO_YEARLY_USER_PROJECTION }));
  const body = await readJson(request);
  const targetYear = normalizeSukuyoTargetYear(body?.targetYear || body?.year);
  const profile = await resolveSukuyoYearlyProfile(env, auth, body?.profileId || body?.selectedProfileId);
  const existing = await findSukuyoYearlyUnlock({ userId: auth.userId, profileId: profile.profileId, targetYear, env });
  const contentKey = sukuyoYearlyContentKey(targetYear);
  if (existing?._id) {
    return json({
      ok: true,
      alreadyUnlocked: true,
      unlocked: true,
      productKey: SUKYO_YEARLY_FORTUNE_PRODUCT_KEY,
      contentKey,
      profileId: profile.profileId,
      targetYear,
    });
  }
  return json({
    ok: true,
    alreadyUnlocked: false,
    unlocked: false,
    productKey: SUKYO_YEARLY_FORTUNE_PRODUCT_KEY,
    contentKey,
    profileId: profile.profileId,
    targetYear,
    billing: {
      endpoint: "/api/billing/coin-gate",
      payload: {
        featureKey: SUKYO_YEARLY_FORTUNE_PRODUCT_KEY,
        contentKey,
        serviceKey: SUKYO_YEARLY_FORTUNE_SERVICE_KEY,
        profileId: profile.profileId,
        selectedProfileId: profile.profileId,
        targetYear,
        reason: "숙요점 1년운 전체 해석 잠금 해제",
        coinPrice: SUKYO_YEARLY_FORTUNE_PRICE_COINS,
        cost: SUKYO_YEARLY_FORTUNE_PRICE_COINS,
        amountKrw: SUKYO_YEARLY_FORTUNE_PRICE_KRW,
      },
    },
  });
}

function isSukuyoMongoId(value) {
  return /^[a-f0-9]{24}$/i.test(clean(value));
}

function sukuyoYearlyObject(value) {
  return value && typeof value === "object" ? value : {};
}

function collectSukuyoYearlyEvidenceIds(body = {}) {
  const access = sukuyoYearlyObject(body?.access);
  const accessPayload = sukuyoYearlyObject(access?.payload);
  const accessData = sukuyoYearlyObject(accessPayload?.data);
  const accessSource = Object.keys(accessData).length ? accessData : (Object.keys(accessPayload).length ? accessPayload : access);
  const accessGrant = {
    ...sukuyoYearlyObject(accessSource?.accessGrant),
    ...sukuyoYearlyObject(body?.accessGrant),
  };
  const consume = {
    ...sukuyoYearlyObject(accessSource?.consume),
    ...sukuyoYearlyObject(body?.consume),
  };
  const payment = {
    ...sukuyoYearlyObject(accessSource?.payment),
    ...sukuyoYearlyObject(body?.payment),
  };
  const context = sukuyoYearlyObject(body?._paymentContext);
  return Array.from(new Set([
    body?.paymentId,
    body?.impUid,
    body?.merchantUid,
    body?.merchant_uid,
    body?.transactionId,
    body?.purchaseId,
    body?.orderId,
    body?.requestId,
    access.paymentId,
    access.transactionId,
    access.purchaseId,
    access.requestId,
    accessPayload.paymentId,
    accessPayload.transactionId,
    accessPayload.purchaseId,
    accessPayload.requestId,
    accessSource.paymentId,
    accessSource.transactionId,
    accessSource.purchaseId,
    accessSource.requestId,
    accessGrant.evidenceId,
    accessGrant.paymentId,
    accessGrant.purchaseId,
    accessGrant.transactionId,
    accessGrant.requestId,
    consume.transactionId,
    consume.paymentId,
    consume.purchaseId,
    consume.requestId,
    payment._id,
    payment.id,
    payment.paymentId,
    payment.transactionId,
    payment.purchaseId,
    payment.orderId,
    payment.requestId,
    context.transactionId,
    context.purchaseId,
    context.orderId,
    context.requestId,
  ].map(clean).filter(Boolean)));
}

function buildSukuyoYearlyEvidenceOr(ids) {
  const clauses = [];
  for (const id of ids) {
    if (isSukuyoMongoId(id)) clauses.push({ _id: id });
    clauses.push(
      { paymentId: id },
      { impUid: id },
      { merchantUid: id },
      { requestId: id },
      { idempotencyKey: id },
      { "metadata.requestId": id },
      { "metadata.purchaseId": id },
      { "metadata.orderId": id },
      { "metadata.transactionId": id },
      { "metadata.paymentId": id },
      { "metadata.idempotencyKey": id },
    );
  }
  return clauses;
}

function valueMatchesAny(value, expectedValues = []) {
  const actual = clean(value);
  if (!actual) return false;
  return expectedValues.map(clean).filter(Boolean).includes(actual);
}

function isSukuyoYearlyPointEvidence(doc, { profileId, contentKey, targetYear }) {
  if (!doc) return false;
  const metadata = doc.metadata && typeof doc.metadata === "object" ? doc.metadata : {};
  const featureKey = clean(doc.featureKey || metadata.featureKey);
  if (featureKey !== SUKYO_YEARLY_FORTUNE_PRODUCT_KEY) return false;
  if (clean(doc.kind) !== "deduct") return false;
  const profileOk = valueMatchesAny(metadata.profileId, [profileId]) || valueMatchesAny(metadata.selectedProfileId, [profileId]);
  if (!profileOk) return false;
  const contentOk = valueMatchesAny(metadata.contentKey, [contentKey])
    || valueMatchesAny(metadata.contentId, [contentKey])
    || Number(metadata.targetYear) === Number(targetYear);
  if (!contentOk) return false;
  const paidCoins = Math.max(
    Math.abs(Number(doc.delta || 0)),
    Number(metadata.coinPrice || 0),
    Number(metadata.cost || 0),
    Number(metadata.chargedCoins || 0),
  );
  return paidCoins >= SUKYO_YEARLY_FORTUNE_PRICE_COINS;
}

function isSukuyoYearlyPaymentEvidence(doc, { profileId, contentKey, targetYear }) {
  if (!doc) return false;
  const pricing = doc.pricingSnapshot && typeof doc.pricingSnapshot === "object" ? doc.pricingSnapshot : {};
  const status = clean(doc.status).toLowerCase();
  const orderState = clean(doc.orderState).toUpperCase();
  const featureKey = clean(doc.featureKey || pricing.featureKey || pricing.productId || pricing.contentKey || pricing.contentId);
  if (featureKey !== SUKYO_YEARLY_FORTUNE_PRODUCT_KEY && clean(pricing.contentKey) !== contentKey && clean(pricing.contentId) !== contentKey) return false;
  if (!["paid", "success", "fulfilled", "processing"].includes(status) && !["PAID_VERIFIED", "UNLOCKED"].includes(orderState)) return false;
  const profileOk = valueMatchesAny(doc.profileId, [profileId])
    || valueMatchesAny(pricing.profileId, [profileId])
    || valueMatchesAny(pricing.selectedProfileId, [profileId]);
  if (!profileOk) return false;
  const contentOk = valueMatchesAny(pricing.contentKey, [contentKey])
    || valueMatchesAny(pricing.contentId, [contentKey])
    || Number(pricing.targetYear || doc.targetYear) === Number(targetYear);
  if (!contentOk) return false;
  const paidAmount = Math.max(Number(doc.paymentAmount || 0), Number(pricing.amountKrw || pricing.amountKRW || 0));
  const paidCoins = Math.max(Number(doc.coinPrice || 0), Number(doc.expectedChargedPoints || 0), Number(pricing.coinPrice || pricing.cost || 0));
  return paidAmount >= SUKYO_YEARLY_FORTUNE_PRICE_KRW || paidCoins >= SUKYO_YEARLY_FORTUNE_PRICE_COINS;
}

async function findSukuyoYearlyPaymentEvidence(env, auth, profile, targetYear, body) {
  const contentKey = sukuyoYearlyContentKey(targetYear);
  const ids = collectSukuyoYearlyEvidenceIds(body);
  if (!ids.length) return null;
  const evidenceOr = buildSukuyoYearlyEvidenceOr(ids);
  if (!evidenceOr.length) return null;
  // withMongoRetry 가 내부에서 connectDb 를 하므로 선행 connectDb 는 두지 않는다(resolveSukuyoYearlyProfile 과 동일).
  const pointHistory = await withMongoRetry(env, () => PointHistory.findOne({
    userId: auth.userId,
    $and: [
      { $or: [{ featureKey: SUKYO_YEARLY_FORTUNE_PRODUCT_KEY }, { "metadata.featureKey": SUKYO_YEARLY_FORTUNE_PRODUCT_KEY }] },
      { $or: evidenceOr },
    ],
  }).lean());
  if (isSukuyoYearlyPointEvidence(pointHistory, { profileId: profile.profileId, contentKey, targetYear })) {
    return {
      source: CONTENT_ENTITLEMENT_SOURCES.COIN,
      orderId: clean(pointHistory?.metadata?.purchaseId || pointHistory?.metadata?.orderId || body?.requestId || pointHistory?._id),
      paymentId: clean(pointHistory?._id),
      coinAmount: Math.abs(Number(pointHistory?.delta || 0)) || SUKYO_YEARLY_FORTUNE_PRICE_COINS,
    };
  }
  const payment = await withMongoRetry(env, () => Payment.findOne({
    userId: auth.userId,
    $or: evidenceOr,
  }).lean());
  if (isSukuyoYearlyPaymentEvidence(payment, { profileId: profile.profileId, contentKey, targetYear })) {
    return {
      source: CONTENT_ENTITLEMENT_SOURCES.PAYMENT,
      orderId: clean(payment?.merchantUid || payment?.idempotencyKey || payment?.requestId || payment?._id),
      paymentId: clean(payment?.impUid || payment?._id),
      coinAmount: Number(payment?.coinPrice || payment?.expectedChargedPoints || 0) || SUKYO_YEARLY_FORTUNE_PRICE_COINS,
    };
  }
  return null;
}

// content-unlocks.js 에는 자체 재시도가 없으므로(재시도는 호출부 규약) 여기서 감싸는 것이 정상이고 중첩이 아니다.
// upsert 는 멱등이라 재시도해도 중복 해금이 생기지 않는다.
async function upsertSukuyoYearlyUnlockFromEvidence({ env, auth, profile, targetYear, evidence }) {
  const contentKey = sukuyoYearlyContentKey(targetYear);
  return withMongoRetry(env, () => upsertPaidContentUnlock({
    userId: auth.userId,
    profileId: profile.profileId,
    featureKey: SUKYO_YEARLY_FORTUNE_PRODUCT_KEY,
    serviceKey: SUKYO_YEARLY_FORTUNE_SERVICE_KEY,
    contentKey,
    source: evidence.source,
    orderId: evidence.orderId,
    paymentId: evidence.paymentId,
    coinAmount: evidence.coinAmount,
  }));
}

export const __sukuyoYearlyTestUtils = {
  buildSukuyoYearlyFortuneResult: buildSukuyoYearlyFortuneResultV2,
  buildSukuyoYearlyPreview,
  collectSukuyoYearlyEvidenceIds,
  isSukuyoYearlyPaymentEvidence,
  isSukuyoYearlyPointEvidence,
  relationFromSukuyoYearlyDistance,
  sukuyoYearlyContentKey,
};

async function handleSukuyoYearlyVerifyPayment(request, env) {
  const auth = requireSukuyoYearlyAuth(await resolvePaidRouteAuth(request, env, { userProjection: SUKUYO_YEARLY_USER_PROJECTION }));
  const body = await readJson(request);
  const targetYear = normalizeSukuyoTargetYear(body?.targetYear || body?.year);
  const profile = await resolveSukuyoYearlyProfile(env, auth, body?.profileId || body?.selectedProfileId);
  const existing = await findSukuyoYearlyUnlock({ userId: auth.userId, profileId: profile.profileId, targetYear, env });
  if (existing?._id) {
    return json({
      ok: true,
      alreadyUnlocked: true,
      unlocked: true,
      productKey: SUKYO_YEARLY_FORTUNE_PRODUCT_KEY,
      contentKey: sukuyoYearlyContentKey(targetYear),
      profileId: profile.profileId,
      targetYear,
      unlockId: String(existing._id || ""),
    });
  }
  const evidence = await findSukuyoYearlyPaymentEvidence(env, auth, profile, targetYear, body);
  if (evidence) {
    const unlock = await upsertSukuyoYearlyUnlockFromEvidence({ env, auth, profile, targetYear, evidence });
    return json({
      ok: true,
      alreadyUnlocked: false,
      unlocked: true,
      productKey: SUKYO_YEARLY_FORTUNE_PRODUCT_KEY,
      contentKey: sukuyoYearlyContentKey(targetYear),
      profileId: profile.profileId,
      targetYear,
      unlockId: String(unlock?._id || ""),
    });
  }
  return json({
    ok: false,
    unlocked: false,
    retryable: true,
    code: "UNLOCK_NOT_CONFIRMED",
    message: "결제는 접수되었지만 숙요점 1년운 해금 기록이 아직 확인되지 않았습니다.",
  }, { status: 409 });
}

export async function handleSukuyoRoutes(request, env = {}, ctx = null) {
  let path = "";
  try {
    const method = request.method.toUpperCase();
    path = getRoutePath(request, "/api/sukuyo");

    if (path === "/calendar") {
      if (method !== "GET") return methodNotAllowed();
      return await handleSukuyoCalendar(request, env);
    }

    if (path === "/yearly-fortune") {
      if (method !== "GET") return methodNotAllowed();
      return await handleSukuyoYearlyFortune(request, env);
    }

    if (path === "/yearly-fortune/unlock") {
      if (method !== "POST") return methodNotAllowed();
      return await handleSukuyoYearlyUnlock(request, env);
    }

    if (path === "/yearly-fortune/verify-payment") {
      if (method !== "POST") return methodNotAllowed();
      return await handleSukuyoYearlyVerifyPayment(request, env);
    }

    if (path === "/past-life-reading") {
      if (method !== "POST") return methodNotAllowed();
      return await handleSukuyoPastLifeReading(request, env);
    }

    if (path === "/compatibility-ai-consultation" || path === "/ai-compatibility") {
      if (method !== "POST") return methodNotAllowed();
      return sukuyoCompatibilityAiMovedResponse();
    }

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    if (path === "/compatibility-ai-consultation" || path === "/ai-compatibility") {
      const status = Number(error?.status) || 500;
      const errorCode = clean(error?.code || "SUKYO_COMPAT_AI_ROUTE_FAILED");
      logSukyoCompatibilityAI("LLM provider error", { errorCode });
      return buildSukyoCompatibilityAIError(
        errorCode,
        clean(error?.message || "숙요점 궁합 전문가 상담 요청을 처리하지 못했습니다."),
        status >= 400 && status < 600 ? status : 500,
        {
          retryable: status >= 500,
        },
      );
    }
    console.error("[SukuyoPremiumPDF][Error]", normalizeSukuyoError(error));
    const status = Number(error?.status) || 0;
    if (status >= 400 && status < 500) {
      return json({
        ok: false,
        code: clean(error?.code) || "SUKUYO_REQUEST_FAILED",
        message: clean(error?.message) || "숙요점 PDF 요청을 처리하지 못했습니다.",
        missing: Array.isArray(error?.missing) ? error.missing : undefined,
      }, { status });
    }
    return handleRouteError(error);
  }
}
