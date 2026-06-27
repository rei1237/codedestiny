import { getSwissVedicPlanets, getSwissWesternChart } from "../lib/swiss-ephemeris.js";
import { cookieValue, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { verifyPremiumAccessToken } from "../lib/premium-access-token.js";
import { ASTRO_PREMIUM_FEATURE_KEY } from "../lib/astro-premium-chapters.js";
import {
  ASTRO_PDF_CONFIG,
  buildAstroLocalChartJson,
  hasUsableSwissAstroChart,
  normalizeAstroPremiumBirthInput,
  validateAstroPayloadForApi,
} from "../lib/astro-premium-generator.js";
import { generateAstrologyPremiumPdfV2 } from "../lib/pdf-v2/astrology/create-astrology-premium-pdf-job.js";
import { astrologyPremiumPublicChapters } from "../lib/pdf-v2/astrology/astrology-premium.chapter-plan.js";
import { logAstrologyPdfEvent } from "../lib/pdf-v2/astrology/astrology-premium.types.js";
import { VEDIC_PREMIUM_CHAPTERS, VEDIC_PREMIUM_FEATURE_KEY } from "../lib/vedic-premium-chapters.js";
import {
  VEDIC_PDF_CONFIG,
  buildVedicAstrologyFacts,
  buildVedicLocalChartJson,
  normalizeVedicError,
  normalizeVedicPremiumBirthInput,
  validateVedicPremiumChartSourceQuality,
  validateVedicBirthInput,
} from "../lib/vedic-premium-generator.js";
import { callGeminiText } from "../lib/gemini.js";
import { generateVedicPremiumPdfV2 } from "../lib/pdf-v2/vedic/create-vedic-premium-pdf-job.js";
import { vedicPremiumChapterPlanV2 } from "../lib/pdf-v2/vedic/vedic-premium.chapter-plan.js";
import {
  VEDIC_PDF_CHAPTERS,
  VEDIC_PDF_REPORT_TYPE,
  VEDIC_PDF_SERVICE_KEY,
  VEDIC_PDF_SERVICE_TYPE,
  buildVedicArchiveUrls,
  buildVedicMockArchiveChapters,
  buildVedicMockPdfHtml,
  buildVedicPdfAccess,
  buildVedicPdfContext,
  buildVedicPdfJob,
  buildVedicPdfResultPayload,
  buildVedicPdfStatusPayload,
  calculateVedicPdfProgress,
  generateVedicPdfChapterContent,
  normalizeVedicPdfInput,
  validateVedicPdfInput,
} from "../lib/pdf-v2/vedic/vedic-mock-pipeline.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import {
  buildPremiumExecutionContext,
  completePremiumPdfExecution,
  failPremiumPdfExecution,
  startPremiumPdfExecution,
} from "../lib/premium-pdf-execution.js";
import { connectDb } from "../lib/db.js";
import { ServiceExecutionTransaction } from "../lib/models.js";

const ASTRO_PREMIUM_LOCK_TTL_MS = 15 * 60 * 1000;
const ASTRO_STATUS_RETRY_AFTER_MS = 4000;
const astroPremiumGenerationLocks = new Map();
const ASTRO_PREMIUM_CHAPTERS = astrologyPremiumPublicChapters;
const ASTROLOGY_MOCK_STATUS_RETRY_AFTER_MS = 1200;
const astrologyMockGenerationLocks = new Map();
const ASTROLOGY_PDF_CHAPTERS = Object.freeze([
  { id: "intro", order: 1, title: "점성술 리딩의 전체 흐름" },
  { id: "natal-chart-summary", order: 2, title: "출생 차트와 기본 성향" },
  { id: "sun-moon-ascendant", order: 3, title: "태양·달·상승궁의 핵심 의미" },
  { id: "houses-life-areas", order: 4, title: "하우스가 보여주는 인생 영역" },
  { id: "planetary-patterns", order: 5, title: "행성 배치와 내면의 힘" },
  { id: "aspects", order: 6, title: "주요 애스펙트와 인생 패턴" },
  { id: "love-relationship", order: 7, title: "연애운과 인간관계" },
  { id: "career-money", order: 8, title: "직업운과 재물운" },
  { id: "health-mind", order: 9, title: "건강운과 마음의 균형" },
  { id: "yearly-transits", order: 10, title: "올해의 트랜짓 흐름" },
  { id: "monthly-guide", order: 11, title: "월별 흐름과 주의점" },
  { id: "action-guide", order: 12, title: "실천 조언과 성장 방향" },
]);
const ASTROLOGY_MOCK_ACTIVE_STATUSES = new Set(["created", "access_verifying", "access_verified", "queued", "generating", "chapter_generating", "rendering", "saving"]);
const VEDIC_PREMIUM_LOCK_TTL_MS = 10 * 60 * 1000;
const VEDIC_STATUS_RETRY_AFTER_MS = 4000;
const vedicPremiumGenerationLocks = new Map();
const VEDIC_ACTIVE_STATUSES = new Set(["pending", "validating", "generating", "rendering", "running"]);
const VEDIC_PREMIUM_STATUS_CHAPTERS = vedicPremiumChapterPlanV2.chapters;
const BASIC_ZODIAC_SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const BASIC_SIGN_ELEMENTS = ["Fire", "Earth", "Air", "Water", "Fire", "Earth", "Air", "Water", "Fire", "Earth", "Air", "Water"];
const BASIC_SIGN_MODES = ["Cardinal", "Fixed", "Mutable", "Cardinal", "Fixed", "Mutable", "Cardinal", "Fixed", "Mutable", "Cardinal", "Fixed", "Mutable"];

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeChartInput(body = {}) {
  return {
    year: toNumber(body.year, NaN),
    month: toNumber(body.month, NaN),
    day: toNumber(body.day, NaN),
    hour: toNumber(body.hour, 12),
    minute: toNumber(body.minute, 0),
    timezone: toNumber(body.timezone, 9),
    lat: toNumber(body.lat, 37.5665),
    lon: toNumber(body.lon ?? body.lng, 126.978),
  };
}

function toBasicNumber(value, fallback = NaN) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseDateInput(value) {
  const raw = clean(String(value || "")).trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return {
      year: toBasicNumber(isoMatch[1], NaN),
      month: toBasicNumber(isoMatch[2], NaN),
      day: toBasicNumber(isoMatch[3], NaN),
    };
  }

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    return {
      year: toBasicNumber(slashMatch[3], NaN),
      month: toBasicNumber(slashMatch[1], NaN),
      day: toBasicNumber(slashMatch[2], NaN),
    };
  }

  return null;
}

function parseTimeInput(value) {
  const raw = clean(String(value || "")).trim();
  if (!raw) return null;

  const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;

  return {
    hour: toBasicNumber(match[1], NaN),
    minute: toBasicNumber(match[2], 0),
  };
}

function parseTimezoneOffsetHours(value) {
  const raw = clean(String(value || "")).trim();
  if (!raw) return 9;

  const directTimezone = toBasicNumber(raw, NaN);
  if (Number.isFinite(directTimezone)) {
    return directTimezone;
  }

  const lower = raw.toLowerCase();
  if (["asia/seoul", "korea standard time", "korean standard time", "kst", "asia/jeju"].includes(lower)) return 9;
  if (["utc", "gmt", "z", "zulu"].includes(lower)) return 0;
  if (["asia/tokyo", "jst", "japan standard time"].includes(lower)) return 9;
  if (["america/new_york", "est"].includes(lower)) return -5;
  if (["america/los_angeles", "pst", "america/los angeles"].includes(lower)) return -8;

  const offsetMatch = raw.match(/^([+-])(\d{1,2})(?::(\d{2}))?$/);
  if (offsetMatch) {
    const sign = offsetMatch[1] === "-" ? -1 : 1;
    const hour = toBasicNumber(offsetMatch[2], NaN);
    const minute = toBasicNumber(offsetMatch[3], 0);
    if (Number.isFinite(hour) && Number.isFinite(minute)) {
      return sign * (hour + minute / 60);
    }
  }

  return NaN;
}

function toDateString(year, month, day) {
  const y = Number.isFinite(year) ? Math.trunc(year) : NaN;
  const m = Number.isFinite(month) ? Math.trunc(month) : NaN;
  const d = Number.isFinite(day) ? Math.trunc(day) : NaN;
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return "";
  const mm = String(Math.max(1, Math.min(12, m))).padStart(2, "0");
  const dd = String(Math.max(1, Math.min(31, d))).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

function toTimeString(hour, minute) {
  const hh = Number.isFinite(hour) ? Math.max(0, Math.min(23, Math.trunc(hour))).toString().padStart(2, "0") : "00";
  const mm = Number.isFinite(minute) ? Math.max(0, Math.min(59, Math.trunc(minute))).toString().padStart(2, "0") : "00";
  return `${hh}:${mm}`;
}

function toJulianDayFromUtcDate(utcDate) {
  const year = utcDate.getUTCFullYear();
  const month = utcDate.getUTCMonth() + 1;
  const day = utcDate.getUTCDate();
  const decimalHour = utcDate.getUTCHours() + utcDate.getUTCMinutes() / 60 + utcDate.getUTCSeconds() / 3600 + utcDate.getUTCMilliseconds() / 3600000;

  const a = Math.floor((14 - month) / 12);
  const y = year - a;
  const m = month + 12 * a - 3;
  const jdn = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  return jdn + decimalHour / 24;
}

function normalizeBasicAstrologyInput(body = {}) {
  const source = body && typeof body === "object" ? body : {};
  const dateFromString = parseDateInput(source.date || source.birthDate || source.birth?.date || "");
  const timeFromString = parseTimeInput(source.time || source.birthTime || source.birth?.time || "");
  const parsedTimezoneHours = parseTimezoneOffsetHours(source.timezone || source.timezoneOffset || source.tz || 9);

  const year = Number.isFinite(dateFromString?.year) ? dateFromString.year : toBasicNumber(source.year, NaN);
  const month = Number.isFinite(dateFromString?.month) ? dateFromString.month : toBasicNumber(source.month, NaN);
  const day = Number.isFinite(dateFromString?.day) ? dateFromString.day : toBasicNumber(source.day, NaN);
  const hour = Number.isFinite(timeFromString?.hour) ? timeFromString.hour : toBasicNumber(source.hour, 12);
  const minute = Number.isFinite(timeFromString?.minute) ? timeFromString.minute : toBasicNumber(source.minute, 0);
  const timezone = Number.isFinite(parsedTimezoneHours) ? parsedTimezoneHours : NaN;
  const lat = toBasicNumber(source.latitude ?? source.lat, NaN);
  const lon = toBasicNumber(source.longitude ?? source.lon ?? source.lng, NaN);
  const timezoneLabel = clean(String(source.timezone || source.timezoneOffset || source.tz || "9")).trim();

  const missing = [];
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) missing.push("date");
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) missing.push("time");
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) missing.push("location");
  if (!Number.isFinite(timezone)) missing.push("timezone");

  if (missing.length > 0) {
    return {
      ok: false,
      status: 400,
      code: "ASTRO_INVALID_BIRTH_INPUT",
      missing,
      message: `Missing or invalid birth fields: ${missing.join(", ")}`,
    };
  }

  const utcMillis = Date.UTC(Math.trunc(year), Math.trunc(month) - 1, Math.trunc(day), 0, 0, 0, 0) + ((hour + minute / 60 - timezone) * 3600000);
  if (!Number.isFinite(utcMillis)) {
    return {
      ok: false,
      status: 400,
      code: "ASTRO_INVALID_BIRTH_INPUT",
      missing: ["time", "timezone"],
      message: "Invalid date/time conversion.",
    };
  }
  const utcDate = new Date(utcMillis);
  const julianDayUt = toJulianDayFromUtcDate(utcDate);

  return {
    ok: true,
    value: {
      year: Math.trunc(year),
      month: Math.trunc(month),
      day: Math.trunc(day),
      hour: Math.max(0, Math.min(23, Math.trunc(hour))),
      minute: Math.max(0, Math.min(59, Math.trunc(minute))),
      timezone,
      timezoneLabel: timezoneLabel || String(timezone),
      lat,
      lon,
      date: toDateString(year, month, day),
      time: toTimeString(hour, minute),
      utcDate,
      utcIso: utcDate.toISOString(),
      julianDayUt,
    },
  };
}

function zodiacNameByIndex(sign) {
  const idx = Number.isFinite(sign) ? ((Math.trunc(sign) % 12) + 12) % 12 : 0;
  return BASIC_ZODIAC_SIGNS[idx] || "Unknown";
}

function zodiacElementByIndex(sign) {
  const idx = Number.isFinite(sign) ? ((Math.trunc(sign) % 12) + 12) % 12 : 0;
  return BASIC_SIGN_ELEMENTS[idx] || "Unknown";
}

function zodiacModeByIndex(sign) {
  const idx = Number.isFinite(sign) ? ((Math.trunc(sign) % 12) + 12) % 12 : 0;
  return BASIC_SIGN_MODES[idx] || "Unknown";
}

function pickTopValues(stats = {}) {
  return Object.entries(stats)
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .map(([name]) => name);
}

function normalizeSwissPlanets(chart) {
  const planets = [];
  const rawPlanets = chart?.planets || {};
  for (const name of Object.keys(rawPlanets)) {
    const data = rawPlanets[name] || {};
    const longitude = Number(data.longitude);
    if (!Number.isFinite(longitude)) continue;
    planets.push({
      name,
      longitude: Math.round(longitude * 1000000) / 1000000,
      sign: zodiacNameByIndex(data.sign),
      house: Number.isFinite(data.house) ? data.house : null,
      speedLongitude: Number.isFinite(Number(data.speedLongitude)) ? Number(data.speedLongitude) : null,
      retrograde: data.retrograde === true,
      element: zodiacElementByIndex(data.sign),
      mode: zodiacModeByIndex(data.sign),
    });
  }
  return planets;
}

function normalizeBasicHouses(chart) {
  const houseCusps = Array.isArray(chart?.houseCusps) ? chart.houseCusps : [];
  return houseCusps
    .map((longitude, index) => {
      const c = Number(longitude);
      if (!Number.isFinite(c)) return null;
      return {
        house: index + 1,
        longitude: Math.round(c * 1000000) / 1000000,
        sign: zodiacNameByIndex(c / 30),
        element: zodiacElementByIndex(c / 30),
        mode: zodiacModeByIndex(c / 30),
      };
    })
    .filter(Boolean);
}

function normalizeBasicPoint(point, fallbackName = "") {
  if (!point || !Number.isFinite(Number(point.longitude))) return null;
  const signIndex = Number.isFinite(Number(point.sign)) ? Number(point.sign) : 0;
  return {
    name: fallbackName,
    longitude: Math.round(Number(point.longitude) * 1000000) / 1000000,
    sign: zodiacNameByIndex(signIndex),
    house: Number.isFinite(point.house) ? point.house : null,
    element: zodiacElementByIndex(signIndex),
    mode: zodiacModeByIndex(signIndex),
  };
}

function deriveBasicSummary(chart) {
  const planets = normalizeSwissPlanets(chart);
  const elementStats = Object.create(null);
  const modeStats = Object.create(null);
  for (const planet of planets) {
    if (planet.element) {
      elementStats[planet.element] = (elementStats[planet.element] || 0) + 1;
    }
    if (planet.mode) {
      modeStats[planet.mode] = (modeStats[planet.mode] || 0) + 1;
    }
  }

  const sun = chart?.planets?.Sun || {};
  const moon = chart?.planets?.Moon || {};
  const asc = chart?.ascendant || {};

  return {
    sunSign: zodiacNameByIndex(sun.sign),
    moonSign: zodiacNameByIndex(moon.sign),
    risingSign: zodiacNameByIndex(asc.sign),
    dominantElements: pickTopValues(elementStats),
    dominantModes: pickTopValues(modeStats),
  };
}

function inferSwissMode(source = "") {
  const raw = clean(source || "").toLowerCase();
  if (raw.includes("swiss-wasm")) return "sweph";
  if (raw.includes("astronomy-engine")) return "moshier";
  return "unknown";
}

function buildBasicAstrologyResponse(chart, normalizedInput) {
  const sunMoonAsc = deriveBasicSummary(chart);
  const ascendant = normalizeBasicPoint(chart?.ascendant, "Ascendant");
  const midheaven = normalizeBasicPoint(chart?.midheaven, "Midheaven");
  const planets = normalizeSwissPlanets(chart);
  const houses = normalizeBasicHouses(chart);

  return {
    ok: true,
    engine: {
      name: "Swiss Ephemeris",
      mode: inferSwissMode(chart?.source || ""),
      version: undefined,
      ephemerisLoaded: Array.isArray(chart?.houseCusps) && chart.houseCusps.length === 12,
    },
    birth: {
      date: normalizedInput.date,
      time: normalizedInput.time,
      timezone: normalizedInput.timezoneLabel,
      latitude: Number(normalizedInput.lat),
      longitude: Number(normalizedInput.lon),
      utcIso: normalizedInput.utcIso,
      julianDayUt: normalizedInput.julianDayUt,
    },
    angles: {
      ascendant,
      midheaven,
    },
    planets,
    houses,
    aspects: Array.isArray(chart?.aspects) ? chart.aspects : [],
    summary: sunMoonAsc,
  };
}

async function handleAstrologyBasic(request, env) {
  const body = await readJson(request);
  const normalized = normalizeBasicAstrologyInput(body);
  if (!normalized.ok) {
    return json({
      ok: false,
      code: normalized.code || "ASTRO_INVALID_BIRTH_INPUT",
      message: normalized.message || "Invalid birth input.",
      missing: normalized.missing || [],
      debug: {
        stage: "birth-input-validation",
      },
    }, { status: normalized.status || 400 });
  }

  const strictOnlyEnv = {
    ...(env || {}),
    ASTRO_SWISS_STRICT_ONLY: "1",
    SWISS_API_FORCE_EXTERNAL: "0",
    SWISS_API_BASE_URL: "",
    ASTRO_SWISS_BASE_URL: "",
    SWISS_API_BASE: "",
    SWISS_API_KEY: "",
    SWISS_API_TOKEN: "",
    SWISS_API_WESTERN_PATH: "",
  };

  try {
    const chart = await getSwissWesternChart(strictOnlyEnv, normalizeChartInput(normalized.value), { requestUrl: request.url });
    return json(buildBasicAstrologyResponse(chart, normalized.value));
  } catch (error) {
    const message = String(error?.message || error || "Swiss astrology calculation failed.");
    const status = Number(error?.status) || 500;
    let code = "ASTRO_SWISS_CALC_FAILED";
    if (error?.code === "ASTRO_INVALID_BIRTH_INPUT") code = "ASTRO_INVALID_BIRTH_INPUT";
    else if (/timezone/i.test(message)) code = "ASTRO_TIMEZONE_CONVERSION_FAILED";
    else if (/wasm/i.test(message) || /ephemer/i.test(message)) code = "ASTRO_SWISS_INIT_FAILED";
    else if (/path/i.test(message) && /swiss/i.test(message)) code = "ASTRO_SWISS_EPHE_PATH_INVALID";

    return json({
      ok: false,
      code,
      message,
      debug: {
        stage: "chart-calculation",
        cause: String(error?.cause || message),
      },
    }, { status });
  }
}

async function handleAstroWesternChart(request, env) {
  const body = await readJson(request);
  const chart = await getSwissWesternChart(env, normalizeChartInput(body), { requestUrl: request.url });
  const localAstroChartJson = buildAstroLocalChartJson(
    normalizeAstroPremiumBirthInput(body),
    chart,
    null,
    { strictPremium: false },
  );
  return json({ ok: true, ...chart, insights: localAstroChartJson.insights, localAstroChartJson });
}

async function handleVedicPlanets(request, env) {
  const body = await readJson(request);
  const result = await getSwissVedicPlanets(env, normalizeChartInput(body), { requestUrl: request.url });
  const localVedicChartJson = buildVedicLocalChartJson({
    ...body,
    chart: result,
  }, { strictPremium: false });
  return json({ ok: true, ...result, insights: localVedicChartJson.insights, localVedicChartJson });
}

export async function handleAstrologyRoutes(request, env) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/astrology");

    if (method === "POST" && path === "/basic") {
      return await handleAstrologyBasic(request, env);
    }

    if (!["GET", "POST"].includes(method)) return methodNotAllowed();

    if (typeof handleAstroRoutes === "function") {
      const mappedUrl = new URL(request.url);
      mappedUrl.pathname = mappedUrl.pathname.replace(/^\/api\/astrology(\/|$)/, "/api/astro$1");
      const mappedRequest = new Request(mappedUrl.toString(), request);
      return await handleAstroRoutes(mappedRequest, env);
    }

    return methodNotAllowed();
  } catch (error) {
    return handleRouteError(error, { request });
  }
}

function readPremiumAccessToken(request, body = {}) {
  const headerToken = String(request.headers.get("x-premium-access-token") || "").trim();
  if (headerToken) return headerToken;
  return String(body?.premiumAccessToken || body?._premiumAccessToken || cookieValue(request, "cd_premium_access") || "").trim();
}

function buildAIConsultationAuthFromPremiumToken(tokenPayload = {}) {
  const userId = clean(tokenPayload.userId || tokenPayload.sub);
  if (!userId) return null;
  return {
    userId,
    email: clean(tokenPayload.email),
    role: clean(tokenPayload.role) || "user",
    name: clean(tokenPayload.name),
    image: "",
    birthDate: "",
    birthTime: "",
    gender: "OTHER",
    points: 0,
    joinedAt: null,
  };
}

async function resolveAIConsultationAuth(request, env, body = {}, reportType = "") {
  try {
    const auth = await requireAuth(request, env);
    return { ok: true, auth, authSource: "login", tokenVerified: false };
  } catch (error) {
    if (Number(error?.status) !== 401) throw error;
  }

  const premiumAccessToken = readPremiumAccessToken(request, body);
  if (!premiumAccessToken) {
    return {
      ok: false,
      status: 401,
      code: "AUTH_REQUIRED",
      message: "AI 상담을 위해 먼저 로그인해 주세요.",
    };
  }

  const verified = await verifyPremiumAccessToken(premiumAccessToken, env, { reportType });
  if (!verified?.ok) {
    const expired = clean(verified?.code) === "PREMIUM_ACCESS_TOKEN_EXPIRED";
    return {
      ok: false,
      status: 402,
      code: expired ? "AI_CONSULTATION_SESSION_TOKEN_EXPIRED" : "AI_CONSULTATION_SESSION_TOKEN_INVALID",
      message: expired
        ? "결제된 AI 상담 세션이 만료되었습니다. 결제 후 다시 이어가 주세요."
        : "결제된 AI 상담 세션을 확인하지 못했습니다. 결제 후 다시 이어가 주세요.",
    };
  }

  const auth = buildAIConsultationAuthFromPremiumToken(verified.payload);
  if (!auth) {
    return {
      ok: false,
      status: 402,
      code: "AI_CONSULTATION_SESSION_TOKEN_INVALID",
      message: "결제된 AI 상담 세션을 확인하지 못했습니다. 결제 후 다시 이어가 주세요.",
    };
  }

  return {
    ok: true,
    auth,
    authSource: "premiumAccessToken",
    tokenVerified: true,
    tokenPayload: verified.payload || {},
  };
}

function toSafeBirthLog(input = {}, chapterCount = 0) {
  return {
    hasBirthDate: Boolean(String(input.birthDate || "").trim()),
    hasBirthTime: Number.isFinite(Number(input.birthHour)),
    birthHour: Number.isFinite(Number(input.birthHour)) ? Number(input.birthHour) : null,
    hasTimezone: Boolean(String(input.timezone || "").trim()),
    hasLocation: Boolean(String(input.birthPlace || "").trim()) || (Number.isFinite(Number(input.latitude)) && Number.isFinite(Number(input.longitude))),
    houseSystemUsed: true,
    chapterCount: Number(chapterCount || 0),
  };
}

function toAstroErrorMeta(error) {
  return {
    code: String(error?.code || "").trim() || null,
    status: Number(error?.status || 0) || null,
    message: String(error?.message || error || "unknown").trim(),
  };
}

function toAstroFailureTrace(error, body = {}, birthInput = {}) {
  const details = error?.details && typeof error.details === "object" ? error.details : {};
  const providedSwissChart = body?.swissChart || body?.chart;
  const providedAstroBase = body?.astroBase || body?.payload?.localAstroChartJson?.chart || body?.payload?.localAstroChartJson;
  return {
    stage: clean(error?.stage || details?.stage || "premium-generation") || "premium-generation",
    code: clean(error?.code) || null,
    message: clean(error?.message || "unknown"),
    hasBirthInput: Boolean(clean(birthInput?.birthDate)),
    hasProvidedSwissChart: Boolean(providedSwissChart),
    hasProvidedAstroBase: Boolean(providedAstroBase),
    hasUsableChart: hasUsableSwissAstroChart(providedSwissChart || providedAstroBase),
    hasPlanets: Boolean(details?.hasPlanets || details?.hasCorePlanets || details?.premiumSignal?.planets),
    hasHouses: Boolean(details?.hasHouses || details?.premiumSignal?.houses),
    hasAspects: Boolean(details?.hasAspects || details?.premiumSignal?.aspects),
    source: clean(details?.source || details?.calculationMode || body?.source || ""),
  };
}

function clean(value) {
  return String(value || "").trim();
}

function asPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function getAstroBirthInputSource(body = {}) {
  const root = asPlainObject(body);
  const nestedBirthInput = asPlainObject(root.birthInput);
  if (Object.keys(nestedBirthInput).length === 0) return root;
  return {
    ...root,
    ...nestedBirthInput,
    profile: nestedBirthInput.profile || root.profile,
    location: nestedBirthInput.location || root.location,
    user: nestedBirthInput.user || root.user,
  };
}

function withPdfArchiveFormat(url, format) {
  const value = clean(url);
  const targetFormat = clean(format) || "pdf";
  if (!value || !/\/api\/premium\/pdf-archive\//.test(value)) return value;
  if (/[?&]format=/.test(value)) {
    return value.replace(/([?&]format=)[^&]+/i, `$1${encodeURIComponent(targetFormat)}`);
  }
  return `${value}${value.includes("?") ? "&" : "?"}format=${encodeURIComponent(targetFormat)}`;
}

function readAstrologyMockBool(env, key, fallback = false) {
  const raw = env?.[key];
  if (raw == null || raw === "") return fallback;
  return /^(1|true|yes|on)$/i.test(String(raw).trim());
}

function readAstrologyMockNumber(env, key, fallback = 0) {
  const n = Number(env?.[key]);
  return Number.isFinite(n) ? n : fallback;
}

function isAstrologyMockProductionEnv(env) {
  const value = clean(env?.NODE_ENV || env?.APP_ENV || env?.ENVIRONMENT || env?.CF_PAGES_BRANCH || "production").toLowerCase();
  return value === "production" || value === "prod" || value === "main";
}

function isAstrologyMockDebugAccessAllowed(env) {
  return readAstrologyMockBool(env, "PDF_DEBUG_MODE", false) && !isAstrologyMockProductionEnv(env);
}

function shouldBlockAstrologyRealLlm(env) {
  const provider = clean(env?.PDF_LLM_PROVIDER || "").toLowerCase();
  return provider === "mock"
    || readAstrologyMockBool(env, "LLM_DRY_RUN", false)
    || readAstrologyMockNumber(env, "PDF_LLM_MAX_CALLS_PER_JOB", 1) <= 0;
}

function normalizeAstrologyMockGender(value) {
  const raw = clean(value).toLowerCase();
  if (["m", "male", "남", "남성"].includes(raw)) return "male";
  if (["f", "female", "여", "여성"].includes(raw)) return "female";
  if (raw) return "other";
  return undefined;
}

function stableAstrologyMockStringify(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableAstrologyMockStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableAstrologyMockStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

function hashAstrologyMockInput(value) {
  const text = stableAstrologyMockStringify(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `astro_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function normalizeAstrologyPdfInput(body = {}) {
  const source = getAstroBirthInputSource(body);
  const birthInput = normalizeAstroPremiumBirthInput(source);
  const rawBirthTime = clean(source.birthTime || birthInput.birthTime);
  const birthTimeUnknown = source.birthTimeUnknown === true || source.isTimeUnknown === true || birthInput.isTimeUnknown === true;
  const birthTime = birthTimeUnknown
    ? undefined
    : rawBirthTime || (Number.isFinite(Number(birthInput.birthHour))
      ? `${String(Number(birthInput.birthHour)).padStart(2, "0")}:${String(Number(birthInput.birthMinute || 0)).padStart(2, "0")}`
      : undefined);
  return {
    name: clean(source.name || source.userName || source.profile?.name || body?.profile?.name) || undefined,
    gender: normalizeAstrologyMockGender(source.gender || source.profile?.gender),
    birthDate: clean(source.birthDate || birthInput.birthDate),
    birthTime,
    birthTimeUnknown,
    calendarType: clean(source.calendarType || "solar") === "lunar" ? "lunar" : "solar",
    isLeapMonth: source.isLeapMonth === true,
    birthPlace: clean(source.birthPlace || birthInput.birthPlace),
    timezone: clean(source.timezone || birthInput.timezone) || undefined,
    latitude: Number.isFinite(Number(source.latitude ?? birthInput.latitude)) ? Number(source.latitude ?? birthInput.latitude) : undefined,
    longitude: Number.isFinite(Number(source.longitude ?? source.lng ?? birthInput.longitude)) ? Number(source.longitude ?? source.lng ?? birthInput.longitude) : undefined,
    targetYear: Number.isFinite(Number(source.targetYear || body.targetYear)) ? Number(source.targetYear || body.targetYear) : new Date().getFullYear(),
    readingType: clean(source.readingType || body.readingType || "natal") || "natal",
    houseSystem: clean(source.houseSystem || body.houseSystem || "placidus") || "placidus",
    zodiacType: clean(source.zodiacType || body.zodiacType || "tropical") || "tropical",
    memo: clean(source.memo || body.memo) || undefined,
  };
}

function validateAstrologyPdfInput(input = {}) {
  if (!clean(input.birthDate)) {
    return { ok: false, status: 422, code: "ASTROLOGY_PDF_INPUT_INVALID", message: "점성술 PDF 생성을 위해 생년월일이 필요합니다." };
  }
  return { ok: true };
}

function extractAstrologyMockContext(body = {}, input = {}) {
  const chart = asPlainObject(body.localAstroChartJson || body.astrologyChart || body.astroBase?.chart || body.astroBase || body.chart);
  const context = {
    sunSign: clean(chart.sunSign || chart.sun?.signKo || chart.sun?.signName || chart.planets?.sun?.signKo || chart.planets?.sun?.signName) || "mock 또는 미계산",
    moonSign: clean(chart.moonSign || chart.moon?.signKo || chart.moon?.signName || chart.planets?.moon?.signKo || chart.planets?.moon?.signName) || "mock 또는 미계산",
    ascendant: clean(chart.ascendant || chart.ascSign || chart.ascendantSign || chart.angles?.ascendant?.signKo || chart.angles?.ascendant?.signName) || (input.birthTimeUnknown ? "출생시간 모름으로 제한" : "mock 또는 미계산"),
    mc: clean(chart.mc || chart.midheaven || chart.angles?.mc?.signKo || chart.angles?.mc?.signName) || (input.birthTimeUnknown ? "출생시간 모름으로 제한" : "mock 또는 미계산"),
    houses: chart.houses || null,
    planets: chart.planets || null,
    aspects: chart.aspects || null,
    dominantElement: clean(chart.dominantElement || chart.element) || undefined,
    dominantMode: clean(chart.dominantMode || chart.mode) || undefined,
    natalChart: chart.natalChart || chart || null,
    transitChart: chart.transitChart || null,
    progressedChart: chart.progressedChart || null,
    solarReturnChart: chart.solarReturnChart || null,
    majorTransits: Array.isArray(chart.majorTransits) ? chart.majorTransits.slice(0, 8).map(clean).filter(Boolean) : ["mock 트랜짓"],
    yearlyThemes: Array.isArray(chart.yearlyThemes) ? chart.yearlyThemes.slice(0, 8).map(clean).filter(Boolean) : ["mock 연간 흐름"],
    calculatedAt: new Date().toISOString(),
    source: Object.keys(chart).length ? "existing_engine" : "mock_context",
  };
  if (input.birthTimeUnknown) {
    context.yearlyThemes = [
      ...context.yearlyThemes,
      "출생시간 모름이 선택되어 상승궁, 하우스, MC 기반 해석은 제한적으로 다룹니다.",
    ];
  }
  return context;
}

function astrologyMockAccessMethod(access = {}) {
  const type = clean(access.accessType || access.method).toLowerCase();
  if (type === "debug_mock") return "debug_mock";
  if (/pass|unlock|entitlement|already/.test(type)) return "pass";
  return "payment";
}

async function resolveAstrologyMockAccess(request, env, auth, body = {}) {
  if (isAstrologyMockDebugAccessAllowed(env) && body.debugMockAccess !== false) {
    return {
      ok: true,
      method: "debug_mock",
      access: {
        ok: true,
        accessType: "debug_mock",
        reportType: "westernAstrologyPremium",
        featureKey: ASTRO_PREMIUM_FEATURE_KEY,
        chargedCoins: 0,
      },
    };
  }
  const access = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "westernAstrologyPremium", {
    ...body,
    reportType: "westernAstrologyPremium",
    featureKey: clean(body.featureKey || ASTRO_PREMIUM_FEATURE_KEY) || ASTRO_PREMIUM_FEATURE_KEY,
    premiumAccessToken: readPremiumAccessToken(request, body) || undefined,
    _accessRoute: "/api/astro/premium/verify-access",
  });
  if (!access?.ok) {
    return {
      ok: false,
      status: Number(access?.status || 402),
      code: clean(access?.code || "PAYMENT_REQUIRED") || "PAYMENT_REQUIRED",
      message: clean(access?.message || "점성술 PDF 생성 권한이 확인되지 않았습니다."),
      access,
    };
  }
  return {
    ok: true,
    method: astrologyMockAccessMethod(access),
    access,
  };
}

function buildAstrologyMockAccessSnapshot(resolved = {}, body = {}) {
  const access = resolved.access || {};
  return {
    verified: true,
    method: resolved.method || astrologyMockAccessMethod(access),
    paymentId: clean(body.paymentId || body.payment?.paymentId || body.payment?.merchantUid || body.payment?.impUid || body.transactionId || access.matchedTransactionId) || undefined,
    passId: resolved.method === "pass" ? clean(access.entitlementId || access.passTier || access.featureKey) || undefined : undefined,
    verifiedAt: new Date().toISOString(),
  };
}

function buildAstrologyPendingChapters() {
  return ASTROLOGY_PDF_CHAPTERS.map((chapter) => ({
    ...chapter,
    status: "pending",
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
  }));
}

function computeAstrologyMockProgress(status, completedChapters, totalChapters) {
  const completed = Math.max(0, Math.min(Number(totalChapters || 0), Math.trunc(Number(completedChapters || 0))));
  const total = Math.max(1, Math.trunc(Number(totalChapters || ASTROLOGY_PDF_CHAPTERS.length)));
  if (status === "access_verifying") return 5;
  if (status === "access_verified" || status === "queued" || status === "created") return 10;
  if (status === "generating" || status === "chapter_generating") return 10 + Math.floor((completed / total) * 70);
  if (status === "rendering") return 85;
  if (status === "saving") return 95;
  if (status === "completed") return 100;
  if (status === "failed" || status === "cancelled") return Math.max(10, 10 + Math.floor((completed / total) * 70));
  return 0;
}

function resolveAstrologyMockOrigin(request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function buildAstrologyMockPdfLinks(request, jobId) {
  const origin = resolveAstrologyMockOrigin(request);
  const base = `${origin}/api/premium/pdf-archive/${encodeURIComponent(jobId)}`;
  return {
    pdfUrl: `${base}?format=pdf`,
    htmlUrl: `${base}?format=html`,
    downloadUrl: `${base}?format=pdf`,
  };
}

function escapeAstrologyMockHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderAstrologyMockMarkdown(content = "") {
  const lines = String(content || "").replace(/\r/g, "").split("\n");
  let html = "";
  let listOpen = false;
  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    if (!line) {
      if (listOpen) {
        html += "</ul>";
        listOpen = false;
      }
      continue;
    }
    if (/^- /.test(line)) {
      if (!listOpen) {
        html += "<ul>";
        listOpen = true;
      }
      html += `<li>${escapeAstrologyMockHtml(line.replace(/^- /, ""))}</li>`;
      continue;
    }
    if (listOpen) {
      html += "</ul>";
      listOpen = false;
    }
    if (/^# /.test(line)) {
      html += `<h2>${escapeAstrologyMockHtml(line.replace(/^# /, ""))}</h2>`;
    } else if (/^## /.test(line)) {
      html += `<h3>${escapeAstrologyMockHtml(line.replace(/^## /, ""))}</h3>`;
    } else {
      html += `<p>${escapeAstrologyMockHtml(line)}</p>`;
    }
  }
  if (listOpen) html += "</ul>";
  return html;
}

function buildAstrologyMockPdfHtml(job = {}) {
  const input = job.inputSnapshot || {};
  const context = job.contextSnapshot || {};
  const chapters = Array.isArray(job.chapters) ? job.chapters : [];
  const toc = chapters
    .map((chapter) => `<li>${chapter.order}장 ${escapeAstrologyMockHtml(chapter.title)}</li>`)
    .join("");
  const chapterHtml = chapters
    .map((chapter) => `
      <article data-chapter-id="${escapeAstrologyMockHtml(chapter.id)}" class="chapter">
        ${renderAstrologyMockMarkdown(chapter.content || `# ${chapter.order}. ${chapter.title}\n\nmock 콘텐츠가 아직 저장되지 않았습니다.`)}
      </article>
    `)
    .join("");
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>점성술 PDF Mock 리포트</title>
  <style>
    body{font-family:Arial,"Noto Sans KR",sans-serif;margin:0;color:#241b35;background:#fbf8ff;line-height:1.72}
    .cover{padding:56px 48px 34px;background:#2f2350;color:#fff}
    .cover h1{margin:0 0 12px;font-size:32px}
    .cover p{margin:4px 0;color:#e8ddff}
    main{padding:36px 48px}
    h2{margin:34px 0 12px;font-size:24px;color:#3b2870}
    h3{margin:22px 0 8px;font-size:17px;color:#5b438a}
    p{margin:8px 0}
    ul{margin:8px 0 16px 20px;padding:0}
    li{margin:5px 0}
    .meta,.toc{padding:20px;border:1px solid #dfd4f2;background:#fff;border-radius:10px;margin:22px 0}
    .chapter{page-break-before:always;padding-top:12px}
  </style>
</head>
<body>
  <section class="cover">
    <h1>점성술 PDF Mock 리포트</h1>
    <p>Job ID: ${escapeAstrologyMockHtml(job.id)}</p>
    <p>Provider: mock · 실제 LLM 호출 없음 · tokensUsed 0 · cost 0</p>
  </section>
  <main>
    <section class="meta">
      <h2>입력 정보</h2>
      <p>이름: ${escapeAstrologyMockHtml(input.name || "미입력")}</p>
      <p>생년월일: ${escapeAstrologyMockHtml(input.birthDate || "미입력")}</p>
      <p>출생시간: ${escapeAstrologyMockHtml(input.birthTimeUnknown ? "출생시간 모름" : input.birthTime || "미입력")}</p>
      <p>출생지: ${escapeAstrologyMockHtml(input.birthPlace || "미입력")}</p>
      <p>태양 별자리: ${escapeAstrologyMockHtml(context.sunSign || "mock 또는 미계산")} · 달 별자리: ${escapeAstrologyMockHtml(context.moonSign || "mock 또는 미계산")} · 상승궁: ${escapeAstrologyMockHtml(context.ascendant || "mock 또는 미계산")}</p>
    </section>
    <section class="toc">
      <h2>목차</h2>
      <ol>${toc}</ol>
    </section>
    ${chapterHtml}
  </main>
</body>
</html>`;
}

function generateMockAstrologyChapterContent(params = {}) {
  const input = params.input || {};
  const context = params.context || {};
  return `
# ${params.chapterOrder}. ${params.chapterTitle}

이 챕터는 점성술 PDF 생성 파이프라인을 검증하기 위한 mock 콘텐츠입니다.

## 생성 정보

- PDF 서비스: 점성술 PDF
- Job ID: ${params.jobId}
- Chapter ID: ${params.chapterId}
- 챕터 순서: ${params.chapterOrder} / ${params.totalChapters}
- Provider: mock
- 실제 LLM 호출 여부: 아니오
- 사용 토큰: 0
- 예상 비용: 0원

## 사용자 입력 요약

- 이름: ${input.name ?? "미입력"}
- 성별: ${input.gender ?? "미입력"}
- 생년월일: ${input.birthDate ?? "미입력"}
- 출생시간: ${input.birthTimeUnknown ? "출생시간 모름" : input.birthTime ?? "미입력"}
- 출생지: ${input.birthPlace ?? "미입력"}
- 시간대: ${input.timezone ?? "미입력"}
- 기준 연도: ${input.targetYear ?? "미입력"}
- 리딩 유형: ${input.readingType ?? "미입력"}
- 하우스 시스템: ${input.houseSystem ?? "기본값 또는 미입력"}
- 조디악 기준: ${input.zodiacType ?? "기본값 또는 미입력"}

## 점성술 Context 요약

- 태양 별자리: ${context.sunSign ?? "mock 또는 미계산"}
- 달 별자리: ${context.moonSign ?? "mock 또는 미계산"}
- 상승궁: ${context.ascendant ?? "mock 또는 미계산"}
- MC: ${context.mc ?? "mock 또는 미계산"}
- 우세 원소: ${context.dominantElement ?? "mock 또는 미계산"}
- 우세 모드: ${context.dominantMode ?? "mock 또는 미계산"}
- 주요 트랜짓: ${Array.isArray(context.majorTransits) && context.majorTransits.length ? context.majorTransits.join(", ") : "mock 또는 미계산"}
- 계산 소스: ${context.source ?? "mock_context"}

## 테스트 본문

이 문단은 실제 LLM 결과를 대신하여 점성술 PDF의 챕터별 생성, 상태 저장, 진행률 반영, PDF 렌더링, 다운로드 URL 생성이 정상적으로 작동하는지 확인하기 위한 내용입니다.

점성술 PDF는 각 챕터가 순서대로 생성되어야 하며, 한 챕터가 완료될 때마다 completedChapters 값과 progressPercent 값이 갱신되어야 합니다. 프론트 화면에서는 현재 생성 중인 챕터 제목과 전체 진행률을 정확히 표시해야 합니다.

이 mock 콘텐츠는 실제 점성술 해석 품질을 검증하기 위한 것이 아닙니다. 이 작업의 목적은 오직 PDF 생성 파이프라인의 안정성을 검증하는 것입니다.

## 점성술 PDF 검증 포인트

- 태양, 달, 상승궁 context가 누락되어도 PDF가 끝까지 생성되는가
- 출생시간 모름 상태에서도 파이프라인이 멈추지 않는가
- 하우스와 MC 계산값이 없어도 오류 없이 mock PDF가 생성되는가
- 챕터 제목이 PDF 목차와 본문에 표시되는가
- 한글이 깨지지 않는가
- 챕터 순서가 유지되는가
- 현재 챕터 상태가 generating에서 completed로 바뀌는가
- 진행률 UI가 실제 상태와 일치하는가
- 전체 챕터 완료 후 PDF 렌더링 단계로 넘어가는가

## 결론

이 챕터는 실제 Gemini, Workers AI, OpenAI, Claude를 호출하지 않고 생성되었습니다.
따라서 개발 중 이 PDF 생성 테스트에서는 LLM 비용이 발생하지 않아야 합니다.
`.trim();
}

async function generateAstrologyPdfChapterContent(params = {}) {
  return generateMockAstrologyChapterContent(params);
}

function buildAstrologyMockPublicJob(job = {}, { includeContent = false } = {}) {
  const chapters = Array.isArray(job.chapters) ? job.chapters : [];
  const currentChapter = chapters.find((chapter) => chapter.id === job.currentChapterId) || null;
  return {
    jobId: clean(job.id),
    id: clean(job.id),
    serviceType: "astrology_pdf",
    status: clean(job.status || "created"),
    progressPercent: Number(job.progressPercent || 0),
    totalChapters: Number(job.totalChapters || ASTROLOGY_PDF_CHAPTERS.length),
    completedChapters: Number(job.completedChapters || 0),
    currentChapterId: clean(job.currentChapterId),
    currentChapterTitle: clean(job.currentChapterTitle),
    currentChapterOrder: Number(currentChapter?.order || 0),
    chapters: chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      order: chapter.order,
      status: chapter.status,
      provider: "mock",
      tokensUsed: 0,
      cost: 0,
      isMock: true,
      startedAt: chapter.startedAt,
      completedAt: chapter.completedAt,
      errorMessage: chapter.errorMessage,
      ...(includeContent ? { content: chapter.content } : {}),
    })),
    pdfUrl: clean(job.pdfUrl) || null,
    htmlUrl: clean(job.htmlUrl) || null,
    downloadUrl: clean(job.downloadUrl || job.pdfUrl) || null,
    errorMessage: clean(job.errorMessage) || null,
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
    inputHash: clean(job.inputHash),
    inputSnapshot: job.inputSnapshot || null,
    contextSnapshot: job.contextSnapshot || null,
    access: job.access || null,
    createdAt: clean(job.createdAt),
    updatedAt: clean(job.updatedAt),
    completedAt: clean(job.completedAt),
    retryAfterMs: ASTROLOGY_MOCK_ACTIVE_STATUSES.has(clean(job.status)) ? ASTROLOGY_MOCK_STATUS_RETRY_AFTER_MS : undefined,
  };
}

function buildAstrologyMockResult(job = {}) {
  const publicJob = buildAstrologyMockPublicJob(job, { includeContent: true });
  return {
    ok: true,
    success: true,
    serviceKey: "astro-premium",
    serviceType: "astrology_pdf",
    featureKey: ASTRO_PREMIUM_FEATURE_KEY,
    reportType: "westernAstrologyPremium",
    status: "completed",
    serverStatus: "completed",
    jobId: publicJob.jobId,
    reportId: publicJob.jobId,
    sessionId: clean(job.sessionId || job.id),
    chapterCount: publicJob.totalChapters,
    expectedChapterCount: publicJob.totalChapters,
    chapters: publicJob.chapters,
    payload: {
      user: {
        name: job.inputSnapshot?.name || "",
        birthDate: job.inputSnapshot?.birthDate || "",
      },
      input: job.inputSnapshot || {},
      context: job.contextSnapshot || {},
    },
    pdfReady: {
      ok: true,
      status: "completed",
      reportId: publicJob.jobId,
      pdfUrl: publicJob.pdfUrl,
      htmlUrl: publicJob.htmlUrl,
      downloadUrl: publicJob.downloadUrl,
      reportUrl: publicJob.downloadUrl,
      html: job.pdfHtml || "",
      renderFormat: "pdf-archive",
      chapterCount: publicJob.totalChapters,
      provider: "mock",
      tokensUsed: 0,
      cost: 0,
      isMock: true,
      generatedAt: job.completedAt || job.updatedAt,
    },
    pdfUrl: publicJob.pdfUrl,
    htmlUrl: publicJob.htmlUrl,
    downloadUrl: publicJob.downloadUrl,
    canReopen: true,
    canDownload: true,
    provider: "mock",
    modelName: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
    llmAssembly: {
      enabled: true,
      provider: "mock",
      source: "astrology-pdf-mock",
      externalGeneration: false,
      externalCallsAllowed: false,
      fallbackUsed: false,
      chapterCount: publicJob.totalChapters,
      expectedChapterCount: publicJob.totalChapters,
    },
    llmAssemblyOnly: true,
    externalCallsAllowed: false,
    completedAt: job.completedAt,
    progress: {
      stateKey: "completed",
      progress: 100,
      progressPercent: 100,
      currentChapterNo: publicJob.totalChapters,
      totalChapters: publicJob.totalChapters,
      currentChapterTitle: "점성술 PDF가 완성되었습니다.",
    },
  };
}

function buildAstrologyMockArchive(job = {}) {
  const result = job.status === "completed" ? buildAstrologyMockResult(job) : null;
  return {
    reportId: job.id,
    sessionId: clean(job.sessionId || job.id),
    reportType: "western_astrology_book",
    archiveReportType: "astrology_pdf_mock",
    serviceType: "astrology_pdf",
    mode: "mock",
    title: "점성술 PDF Mock 리포트",
    displayName: "점성술 PDF Mock 리포트",
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt,
    chapterCount: job.totalChapters,
    chapters: (job.chapters || []).map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      order: chapter.order,
      status: chapter.status,
      content: chapter.content || "",
      finalText: chapter.content || "",
      provider: "mock",
      tokensUsed: 0,
      cost: 0,
      isMock: true,
    })),
    payload: result?.payload || { input: job.inputSnapshot || {}, context: job.contextSnapshot || {} },
    pdfReady: result?.pdfReady || {
      ok: false,
      status: job.status,
      reportId: job.id,
      html: job.pdfHtml || "",
      renderFormat: "pdf-archive",
      provider: "mock",
      tokensUsed: 0,
      cost: 0,
      isMock: true,
    },
    pdfUrl: job.pdfUrl || "",
    htmlUrl: job.htmlUrl || "",
    downloadUrl: job.downloadUrl || "",
    canDownload: job.status === "completed" && Boolean(job.downloadUrl || job.pdfUrl),
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
    astrologyPdfJob: job,
    result,
  };
}

async function persistAstrologyMockJob(env, auth, job = {}) {
  const now = new Date();
  const dbEnv = withPdfFastDbEnv(env);
  await connectDb(dbEnv);
  const archive = buildAstrologyMockArchive(job);
  const success = job.status === "completed";
  const failed = job.status === "failed" || job.status === "cancelled";
  const doc = await ServiceExecutionTransaction.findOneAndUpdate(
    {
      userId: auth.userId,
      executionKey: `astrology_pdf_mock:${auth.userId}:${job.id}`,
    },
    {
      $set: {
        reportType: "westernAstrologyPremium",
        reportId: job.id,
        sessionId: clean(job.sessionId || job.id),
        featureKey: ASTRO_PREMIUM_FEATURE_KEY,
        cost: Number(job.access?.method === "debug_mock" ? 0 : 390),
        coinAmount: Number(job.access?.method === "debug_mock" ? 0 : 390),
        status: success ? "success" : failed ? "failed" : "pending",
        premiumStatus: success ? "completed" : failed ? "failed" : job.status === "queued" ? "paid" : "generating",
        reasonCode: failed ? clean(job.errorCode || "ASTROLOGY_PDF_MOCK_FAILED") : "",
        reasonMessage: failed ? clean(job.errorMessage || "점성술 PDF 생성 중 문제가 발생했습니다.") : "",
        timeoutAt: new Date(now.getTime() + 30 * 60 * 1000),
        nextRetryAt: now,
        heartbeatAt: now,
        generationStartedAt: job.startedAt ? new Date(job.startedAt) : now,
        generationCompletedAt: success ? new Date(job.completedAt || job.updatedAt || now) : null,
        generationFailedAt: failed ? new Date(job.updatedAt || now) : null,
        completedAt: success ? new Date(job.completedAt || now) : null,
        failureStage: failed ? clean(job.failureStage || "mock-generation") : "",
        failureReason: failed ? clean(job.errorMessage || "점성술 PDF 생성 중 문제가 발생했습니다.") : "",
        metadata: {
          reportId: job.id,
          sessionId: clean(job.sessionId || job.id),
          reportType: "westernAstrologyPremium",
          serviceKey: "astro-premium",
          serviceType: "astrology_pdf",
          featureKey: ASTRO_PREMIUM_FEATURE_KEY,
          archive,
        },
        retentionUntil: new Date(now.getTime() + 14 * 86400000),
      },
      $setOnInsert: {
        executionKey: `astrology_pdf_mock:${auth.userId}:${job.id}`,
        userId: auth.userId,
        maxRetries: 1,
        idempotencyKey: `astrology_pdf_mock:${auth.userId}:${job.id}`,
      },
    },
    { upsert: true, returnDocument: "after" },
  ).lean();
  return doc;
}

async function findAstrologyMockJob(env, auth, jobId) {
  const id = clean(jobId);
  if (!id) return null;
  await connectDb(withPdfFastDbEnv(env));
  const doc = await ServiceExecutionTransaction.findOne({
    userId: auth.userId,
    reportId: id,
    reportType: "westernAstrologyPremium",
    "metadata.serviceType": "astrology_pdf",
  }).lean();
  return doc?.metadata?.archive?.astrologyPdfJob || null;
}

async function failAstrologyMockJob(env, auth, job = {}, error, chapterId = "") {
  const message = clean(error?.message || error || "점성술 PDF 생성 중 문제가 발생했습니다. 결제 내역은 보존됩니다. 다시 시도하거나 고객센터에 문의해주세요.");
  const now = new Date().toISOString();
  const next = {
    ...job,
    status: "failed",
    errorCode: clean(error?.code || "ASTROLOGY_PDF_MOCK_FAILED"),
    errorMessage: message,
    failureStage: clean(error?.stage || "mock-generation"),
    updatedAt: now,
  };
  if (chapterId) {
    next.chapters = (job.chapters || []).map((chapter) => chapter.id === chapterId ? {
      ...chapter,
      status: "failed",
      errorMessage: message,
      completedAt: now,
    } : chapter);
  }
  next.progressPercent = computeAstrologyMockProgress(next.status, next.completedChapters, next.totalChapters);
  await persistAstrologyMockJob(env, auth, next);
  console.error("[AstrologyPdfMock][failed]", {
    jobId: clean(job.id),
    chapterId: clean(chapterId),
    code: next.errorCode,
    message,
    stack: clean(error?.stack || ""),
  });
  return next;
}

async function handleAstrologyMockVerifyAccess(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const input = normalizeAstrologyPdfInput(body);
  const validation = validateAstrologyPdfInput(input);
  if (!validation.ok) {
    return json({ ok: false, ...validation }, { status: validation.status });
  }
  const resolved = await resolveAstrologyMockAccess(request, env, auth, body);
  if (!resolved.ok) {
    return json({
      ok: false,
      accessGranted: false,
      code: resolved.code,
      message: resolved.message,
      status: "access_verifying",
    }, { status: resolved.status });
  }
  return json({
    ok: true,
    accessGranted: true,
    serviceType: "astrology_pdf",
    status: "access_verified",
    access: buildAstrologyMockAccessSnapshot(resolved, body),
    chapters: ASTROLOGY_PDF_CHAPTERS,
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
  });
}

async function handleAstrologyMockCreateJob(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const input = normalizeAstrologyPdfInput(body);
  const validation = validateAstrologyPdfInput(input);
  if (!validation.ok) {
    return json({ ok: false, ...validation }, { status: validation.status });
  }
  const resolved = await resolveAstrologyMockAccess(request, env, auth, body);
  if (!resolved.ok) {
    return json({
      ok: false,
      accessGranted: false,
      code: resolved.code,
      message: resolved.message,
      status: "access_verifying",
    }, { status: resolved.status });
  }
  const requestedId = clean(body.jobId || body.reportId || body.sessionId);
  const id = requestedId || `astrology_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const existingJob = await findAstrologyMockJob(env, auth, id);
  if (existingJob) {
    const statusPayload = buildAstrologyMockPublicJob(existingJob);
    return json({
      ok: true,
      deduped: true,
      jobId: id,
      job: statusPayload,
      data: statusPayload,
    }, { status: existingJob.status === "completed" ? 200 : 202 });
  }
  const now = new Date().toISOString();
  const context = extractAstrologyMockContext(body, input);
  const job = {
    id,
    sessionId: clean(body.sessionId || id),
    userId: String(auth.userId || ""),
    serviceType: "astrology_pdf",
    status: "queued",
    inputHash: hashAstrologyMockInput(input),
    inputSnapshot: input,
    contextSnapshot: context,
    access: buildAstrologyMockAccessSnapshot(resolved, body),
    totalChapters: ASTROLOGY_PDF_CHAPTERS.length,
    completedChapters: 0,
    currentChapterId: undefined,
    currentChapterTitle: undefined,
    progressPercent: computeAstrologyMockProgress("queued", 0, ASTROLOGY_PDF_CHAPTERS.length),
    chapters: buildAstrologyPendingChapters(),
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
    createdAt: now,
    updatedAt: now,
  };
  await persistAstrologyMockJob(env, auth, job);
  const statusPayload = buildAstrologyMockPublicJob(job);
  return json({
    ok: true,
    jobId: id,
    job: statusPayload,
    data: statusPayload,
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
  });
}

async function handleAstrologyMockStatus(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const jobId = clean(url.searchParams.get("jobId") || url.searchParams.get("reportId"));
  if (!jobId) {
    return json({ ok: false, code: "MISSING_JOB_ID", message: "jobId가 필요합니다." }, { status: 400 });
  }
  const job = await findAstrologyMockJob(env, auth, jobId);
  if (!job) {
    return json({ ok: false, code: "JOB_NOT_FOUND", message: "점성술 PDF Job을 찾을 수 없습니다.", jobId }, { status: 404 });
  }
  const statusPayload = buildAstrologyMockPublicJob(job);
  return json({
    ok: job.status !== "failed",
    ...statusPayload,
    data: statusPayload,
  }, { status: ASTROLOGY_MOCK_ACTIVE_STATUSES.has(job.status) ? 202 : 200 });
}

async function handleAstrologyMockResult(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const jobId = clean(url.searchParams.get("jobId") || url.searchParams.get("reportId"));
  if (!jobId) {
    return json({ ok: false, code: "MISSING_JOB_ID", message: "jobId가 필요합니다." }, { status: 400 });
  }
  const job = await findAstrologyMockJob(env, auth, jobId);
  if (!job) {
    return json({ ok: false, code: "JOB_NOT_FOUND", message: "점성술 PDF Job을 찾을 수 없습니다.", jobId }, { status: 404 });
  }
  if (job.status !== "completed") {
    return json({
      ok: true,
      jobId,
      status: job.status,
      pdfUrl: null,
      message: "아직 점성술 PDF 생성이 완료되지 않았습니다.",
      data: buildAstrologyMockPublicJob(job),
    }, { status: 202 });
  }
  const result = buildAstrologyMockResult(job);
  return json({
    ok: true,
    ...result,
    data: result,
  });
}

function delayAstrologyMock(ms) {
  const waitMs = Math.max(0, Math.min(2000, Number(ms || 0)));
  if (!waitMs) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, waitMs));
}

async function handleAstrologyMockGenerate(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const jobId = clean(body.jobId || body.reportId);
  if (!jobId) {
    return json({ ok: false, code: "MISSING_JOB_ID", message: "jobId가 필요합니다." }, { status: 400 });
  }
  let job = await findAstrologyMockJob(env, auth, jobId);
  if (!job) {
    return json({ ok: false, code: "JOB_NOT_FOUND", message: "점성술 PDF Job을 찾을 수 없습니다.", jobId }, { status: 404 });
  }
  if (job.access?.verified !== true) {
    job = await failAstrologyMockJob(env, auth, job, Object.assign(new Error("점성술 PDF 생성 권한이 확인되지 않았습니다."), { code: "ACCESS_NOT_VERIFIED" }));
    return json({ ok: false, data: buildAstrologyMockPublicJob(job), message: job.errorMessage }, { status: 403 });
  }
  if (job.status === "completed") {
    const result = buildAstrologyMockResult(job);
    return json({ ok: true, deduped: true, ...result, data: result });
  }
  if (ASTROLOGY_MOCK_ACTIVE_STATUSES.has(job.status) && astrologyMockGenerationLocks.has(jobId)) {
    const statusPayload = buildAstrologyMockPublicJob(job);
    return json({ ok: true, deduped: true, jobId, data: statusPayload, job: statusPayload }, { status: 202 });
  }
  if (["failed", "cancelled"].includes(job.status)) {
    return json({ ok: false, jobId, data: buildAstrologyMockPublicJob(job), message: job.errorMessage || "점성술 PDF Job이 실패 상태입니다." }, { status: 409 });
  }

  astrologyMockGenerationLocks.set(jobId, true);
  try {
    const delayMs = readAstrologyMockNumber(env, "PDF_MOCK_CHAPTER_DELAY_MS", 120);
    const failChapterId = clean(env?.PDF_MOCK_FAIL_CHAPTER_ID);
    const now = new Date().toISOString();
    job = {
      ...job,
      status: "generating",
      progressPercent: computeAstrologyMockProgress("generating", job.completedChapters, job.totalChapters),
      startedAt: job.startedAt || now,
      updatedAt: now,
    };
    await persistAstrologyMockJob(env, auth, job);

    for (const chapterDef of ASTROLOGY_PDF_CHAPTERS) {
      const existing = (job.chapters || []).find((chapter) => chapter.id === chapterDef.id);
      if (existing?.status === "completed" && clean(existing.content)) continue;
      const startedAt = new Date().toISOString();
      job = {
        ...job,
        status: "chapter_generating",
        currentChapterId: chapterDef.id,
        currentChapterTitle: chapterDef.title,
        progressPercent: computeAstrologyMockProgress("chapter_generating", job.completedChapters, job.totalChapters),
        updatedAt: startedAt,
        chapters: (job.chapters || []).map((chapter) => chapter.id === chapterDef.id ? {
          ...chapter,
          status: "generating",
          startedAt,
          provider: "mock",
          tokensUsed: 0,
          cost: 0,
          isMock: true,
        } : chapter),
      };
      await persistAstrologyMockJob(env, auth, job);
      await delayAstrologyMock(delayMs);

      if (failChapterId && failChapterId === chapterDef.id) {
        throw Object.assign(new Error(`PDF_MOCK_FAIL_CHAPTER_ID:${failChapterId}`), {
          code: "PDF_MOCK_FAIL_CHAPTER_ID",
          chapterId: chapterDef.id,
        });
      }

      const content = await generateAstrologyPdfChapterContent({
        jobId,
        chapterId: chapterDef.id,
        chapterTitle: chapterDef.title,
        chapterOrder: chapterDef.order,
        totalChapters: ASTROLOGY_PDF_CHAPTERS.length,
        input: job.inputSnapshot,
        context: job.contextSnapshot,
      });
      const completedAt = new Date().toISOString();
      const nextCompleted = (job.chapters || []).filter((chapter) => chapter.status === "completed").length + 1;
      job = {
        ...job,
        status: "chapter_generating",
        completedChapters: nextCompleted,
        progressPercent: computeAstrologyMockProgress("chapter_generating", nextCompleted, job.totalChapters),
        updatedAt: completedAt,
        chapters: (job.chapters || []).map((chapter) => chapter.id === chapterDef.id ? {
          ...chapter,
          status: "completed",
          content,
          completedAt,
          provider: "mock",
          tokensUsed: 0,
          cost: 0,
          isMock: true,
        } : chapter),
      };
      await persistAstrologyMockJob(env, auth, job);
    }

    const renderingAt = new Date().toISOString();
    job = {
      ...job,
      status: "rendering",
      currentChapterId: undefined,
      currentChapterTitle: "PDF 문서를 렌더링하고 있습니다.",
      completedChapters: ASTROLOGY_PDF_CHAPTERS.length,
      progressPercent: computeAstrologyMockProgress("rendering", ASTROLOGY_PDF_CHAPTERS.length, ASTROLOGY_PDF_CHAPTERS.length),
      updatedAt: renderingAt,
    };
    await persistAstrologyMockJob(env, auth, job);
    const pdfHtml = buildAstrologyMockPdfHtml(job);
    await delayAstrologyMock(Math.min(delayMs, 200));

    const savingAt = new Date().toISOString();
    const links = buildAstrologyMockPdfLinks(request, jobId);
    job = {
      ...job,
      status: "saving",
      currentChapterTitle: "PDF 파일을 저장하고 있습니다.",
      progressPercent: computeAstrologyMockProgress("saving", job.completedChapters, job.totalChapters),
      pdfHtml,
      pdfUrl: links.pdfUrl,
      htmlUrl: links.htmlUrl,
      downloadUrl: links.downloadUrl,
      updatedAt: savingAt,
    };
    await persistAstrologyMockJob(env, auth, job);
    await delayAstrologyMock(Math.min(delayMs, 200));

    const completedAt = new Date().toISOString();
    job = {
      ...job,
      status: "completed",
      currentChapterTitle: "점성술 PDF가 완성되었습니다.",
      completedChapters: ASTROLOGY_PDF_CHAPTERS.length,
      progressPercent: 100,
      updatedAt: completedAt,
      completedAt,
    };
    await persistAstrologyMockJob(env, auth, job);
    const result = buildAstrologyMockResult(job);
    return json({ ok: true, ...result, data: result });
  } catch (error) {
    job = await failAstrologyMockJob(env, auth, job, error, clean(error?.chapterId || job.currentChapterId));
    return json({
      ok: false,
      jobId,
      code: clean(error?.code || "ASTROLOGY_PDF_MOCK_FAILED"),
      message: job.errorMessage,
      data: buildAstrologyMockPublicJob(job),
    }, { status: 500 });
  } finally {
    astrologyMockGenerationLocks.delete(jobId);
  }
}

function normalizeAstroError(error) {
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

function getAstroSessionId(body = {}) {
  const fromBody = clean(body?.sessionId || body?.reportSessionId || body?.generationId);
  if (fromBody) return fromBody.slice(0, 160);
  return `astro-premium:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
}

function compactAstroPremiumLocks(now = Date.now()) {
  for (const [sessionId, state] of astroPremiumGenerationLocks.entries()) {
    const startedAtMs = Number(state?.startedAtMs || 0);
    if (!startedAtMs || now - startedAtMs > ASTRO_PREMIUM_LOCK_TTL_MS) {
      astroPremiumGenerationLocks.delete(sessionId);
    }
  }
}

function clampAstroChapterNo(value, total) {
  const n = Number(value || 0);
  const max = Math.max(1, Number(total || ASTRO_PREMIUM_CHAPTERS.length || 12));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(max, Math.trunc(n)));
}

function updateAstroSessionProgress(sessionId, progress = {}) {
  const key = clean(sessionId);
  if (!key || !astroPremiumGenerationLocks.has(key)) return;
  const lock = astroPremiumGenerationLocks.get(key) || {};
  astroPremiumGenerationLocks.set(key, {
    ...lock,
    progress: {
      ...(lock.progress || {}),
      ...progress,
      totalChapters: Number(progress.totalChapters || lock.progress?.totalChapters || ASTRO_PREMIUM_CHAPTERS.length),
      updatedAt: new Date().toISOString(),
    },
  });
}

function buildAstroProgressPatch(stage, payload = {}) {
  const totalChapters = ASTRO_PREMIUM_CHAPTERS.length;
  const chapterNo = clampAstroChapterNo(payload?.chapterNo || payload?.chapter || payload?.completed, totalChapters);
  const title = clean(payload?.title || payload?.chapterTitle);
  switch (stage) {
    case "LocalCalculationJsonPrepared":
      return { stateKey: "local_calculation", currentChapterNo: 0, totalChapters, currentChapterTitle: "출생 차트 근거 정리" };
    case "CalculationOnlyCompleted":
      return { stateKey: "llm_generation", currentChapterNo: 0, totalChapters, currentChapterTitle: "점성술 리포트 본문 생성" };
    case "ChapterCompleted":
      return { stateKey: "llm_generation", currentChapterNo: chapterNo, totalChapters, currentChapterTitle: title || "점성술 챕터 생성" };
    case "FinalManuscriptValidated":
      return { stateKey: "manuscript_validated", currentChapterNo: totalChapters, totalChapters, currentChapterTitle: "원고 검수 완료" };
    case "PdfRenderStart":
      return { stateKey: "pdf_rendering", currentChapterNo: totalChapters, totalChapters, currentChapterTitle: "PDF 편집/렌더링" };
    case "PdfRenderSuccess":
      return { stateKey: "pdf_rendered", currentChapterNo: totalChapters, totalChapters, currentChapterTitle: "PDF 렌더링 완료" };
    default:
      return null;
  }
}

function buildAstroStatusPayload(lock = {}, fallback = {}) {
  const result = lock.result && typeof lock.result === "object" ? lock.result : null;
  const progress = lock.progress && typeof lock.progress === "object" ? lock.progress : {};
  const rawStatus = clean(lock.status || fallback.status || "");
  const status = rawStatus === "done" || rawStatus === "completed"
    ? "completed"
    : rawStatus === "failed"
      ? "failed"
      : rawStatus === "not_found"
        ? "not_found"
        : rawStatus === "pending"
          ? "pending"
          : "generating";
  const isActive = !["completed", "failed", "not_found"].includes(status);
  const totalChapters = Number(progress.totalChapters || result?.chapterCount || ASTRO_PREMIUM_CHAPTERS.length);
  const currentChapterNo = clampAstroChapterNo(
    progress.currentChapterNo || (status === "completed" ? totalChapters : 0),
    totalChapters,
  );
  const progressPercent = Number.isFinite(Number(progress.progressPercent ?? progress.progress))
    ? Math.max(0, Math.min(100, Math.round(Number(progress.progressPercent ?? progress.progress))))
    : status === "completed"
      ? 100
      : status === "failed"
        ? 100
        : Math.max(0, Math.min(95, Math.round((currentChapterNo / Math.max(1, totalChapters)) * 70) + 10));
  return {
    ok: status !== "failed",
    serviceKey: "astro-premium",
    data: {
      sessionId: clean(lock.sessionId || fallback.sessionId),
      reportId: clean(lock.reportId || fallback.reportId || result?.reportId),
      status,
      startedAt: clean(lock.startedAt || fallback.startedAt),
      completedAt: clean(lock.completedAt || result?.completedAt),
      failedAt: clean(lock.failedAt || fallback.failedAt),
      progress: {
        stateKey: clean(progress.stateKey || (status === "completed" ? "completed" : status === "failed" ? "failed" : status === "not_found" ? "not_found" : status)),
        progress: progressPercent,
        progressPercent,
        currentChapterNo,
        totalChapters,
        currentChapterTitle: clean(progress.currentChapterTitle),
        manuscriptSource: clean(progress.manuscriptSource || result?.manuscriptSource),
        updatedAt: clean(progress.updatedAt),
      },
      result: status === "completed" ? result : null,
      pdfReady: result?.pdfReady || null,
      canDownload: Boolean(result?.canDownload || clean(result?.pdfUrl || result?.downloadUrl || result?.htmlUrl || result?.pdfReady?.pdfUrl || result?.pdfReady?.downloadUrl)),
      error: lock.error || fallback.error || null,
      retryAfterMs: isActive ? ASTRO_STATUS_RETRY_AFTER_MS : undefined,
    },
  };
}

function buildAstroStatusPayloadFromArchive(doc = {}, sessionId = "", reportId = "") {
  const metadata = doc?.metadata && typeof doc.metadata === "object" ? doc.metadata : {};
  const archive = metadata?.archive && typeof metadata.archive === "object" ? metadata.archive : null;
  if (!archive) return null;
  const pdfReady = archive?.pdfReady && typeof archive.pdfReady === "object" ? archive.pdfReady : {};
  const resolvedReportId = clean(archive.reportId || doc.reportId || metadata.reportId || reportId);
  const resolvedSessionId = clean(archive.sessionId || doc.sessionId || metadata.sessionId || sessionId);
  const chapters = Array.isArray(archive.chapters) ? archive.chapters : [];
  const manuscriptSource = clean(archive.manuscriptSource || pdfReady.manuscriptSource || ASTRO_PDF_CONFIG.generationMode);
  const chapterCount = Number(archive.chapterCount || chapters.length || ASTRO_PREMIUM_CHAPTERS.length);
  const llmAssembly = archive.llmAssembly || pdfReady.llmAssembly || null;
  const result = {
    ok: true,
    serviceKey: "astro-premium",
    featureKey: ASTRO_PREMIUM_FEATURE_KEY,
    status: "completed",
    sessionId: resolvedSessionId,
    reportId: resolvedReportId,
    chapterCount,
    chapters,
    chapterDrafts: Array.isArray(archive.chapterDrafts) ? archive.chapterDrafts : [],
    payload: archive.payload || archive.localAstroChartJson || null,
    localAstroChartJson: archive.localAstroChartJson || archive.payload || null,
    astroMasterJson: archive.astroMasterJson || null,
    masterJsonValidation: archive.masterJsonValidation || null,
    pdfReady,
    diagnostics: archive.diagnostics || metadata.diagnostics || null,
    pdfUrl: clean(archive.pdfUrl || pdfReady.pdfUrl || pdfReady.downloadUrl || pdfReady.htmlUrl),
    htmlUrl: clean(archive.htmlUrl || pdfReady.htmlUrl),
    downloadUrl: clean(archive.downloadUrl || pdfReady.downloadUrl || pdfReady.pdfUrl || pdfReady.htmlUrl),
    canReopen: archive.canReopen !== false,
    canDownload: Boolean(archive.canDownload || pdfReady.downloadUrl || pdfReady.pdfUrl || pdfReady.htmlUrl),
    quality: archive.quality || null,
    pdfQuality: archive.pdfQuality || null,
    pdfCompletionValidation: archive.pdfCompletionValidation || pdfReady.pdfCompletionValidation || null,
    validation: archive.validation || null,
    llmAssembly,
    llmAssemblyOnly: archive.llmAssemblyOnly === true || pdfReady.llmAssemblyOnly === true,
    externalCallsAllowed: archive.externalCallsAllowed === true || pdfReady.externalCallsAllowed === true,
    manuscriptSource,
    finalChapterCount: chapters.length,
    progress: {
      stateKey: "completed",
      currentChapterNo: chapterCount,
      totalChapters: ASTRO_PREMIUM_CHAPTERS.length,
      currentChapterTitle: "완료",
      manuscriptSource,
    },
  };

  return buildAstroStatusPayload({
    sessionId: resolvedSessionId,
    reportId: resolvedReportId,
    status: "done",
    completedAt: doc.completedAt || doc.updatedAt || archive.completedAt,
    progress: result.progress,
    result,
  }, { sessionId, reportId });
}

export function buildAstroPremiumStatusLookupQuery({ userId = "", sessionId = "", reportId = "" } = {}) {
  const identityClauses = [];
  const safeSessionId = clean(sessionId);
  const safeReportId = clean(reportId);
  if (safeSessionId) {
    identityClauses.push(
      { sessionId: safeSessionId },
      { "metadata.sessionId": safeSessionId },
      { "metadata.archive.sessionId": safeSessionId },
    );
  }
  if (safeReportId) {
    identityClauses.push(
      { reportId: safeReportId },
      { "metadata.reportId": safeReportId },
      { "metadata.archive.reportId": safeReportId },
    );
  }
  const reportTypeClauses = [
    { reportType: "westernAstrologyPremium" },
    { "metadata.reportType": "westernAstrologyPremium" },
    { "metadata.serviceKey": "astro-premium" },
    { "metadata.archive.reportType": "western_astrology_book" },
  ];
  const query = { userId };
  if (!identityClauses.length) {
    query.$or = reportTypeClauses;
    return query;
  }
  return {
    ...query,
    $and: [
      { $or: identityClauses },
      { $or: reportTypeClauses },
    ],
  };
}

async function handleAstroPremiumStatus(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const sessionId = clean(url.searchParams.get("sessionId") || url.searchParams.get("reportSessionId") || url.searchParams.get("generationId"));
  const reportId = clean(url.searchParams.get("reportId"));
  compactAstroPremiumLocks();
  const lock = sessionId
    ? astroPremiumGenerationLocks.get(sessionId)
    : Array.from(astroPremiumGenerationLocks.values()).find((state) => clean(state?.result?.reportId || state?.reportId) === reportId);
  if (!lock || (lock.userId && lock.userId !== auth.userId)) {
    if (!sessionId && !reportId) {
      return json(buildAstroStatusPayload({}, {
        sessionId,
        reportId,
        status: "not_found",
      }));
    }

    await connectDb(withPdfFastDbEnv(env));
    const query = buildAstroPremiumStatusLookupQuery({
      userId: auth.userId,
      sessionId,
      reportId,
    });
    const doc = await ServiceExecutionTransaction.findOne(query).sort({ completedAt: -1, updatedAt: -1, createdAt: -1 }).lean();

    if (!doc) {
      return json(buildAstroStatusPayload({
        sessionId,
        reportId,
        status: "failed",
        failedAt: new Date().toISOString(),
        progress: {
          stateKey: "failed",
          progress: 100,
          progressPercent: 100,
          currentChapterNo: 0,
          totalChapters: ASTRO_PREMIUM_CHAPTERS.length,
          currentChapterTitle: "PDF 생성 세션을 찾지 못했습니다",
        },
        error: {
          code: "ASTRO_PREMIUM_SESSION_NOT_FOUND",
          message: "점성술 PDF 생성 세션이 시작되지 않았습니다. 결제 상태를 확인한 뒤 다시 시도해 주세요.",
        },
      }, { sessionId, reportId }));
    }

    if (String(doc.status || "") === "success" && String(doc.premiumStatus || "") === "completed") {
      const payload = buildAstroStatusPayloadFromArchive(doc, sessionId, reportId);
      if (payload) return json(payload);
    }

    if (String(doc.status || "") === "failed" || String(doc.premiumStatus || "") === "failed") {
      return json(buildAstroStatusPayload({
        sessionId: clean(doc.sessionId || sessionId),
        reportId: clean(doc.reportId || reportId),
        status: "failed",
        failedAt: doc.generationFailedAt || doc.updatedAt,
        progress: {
          stateKey: "failed",
          currentChapterNo: 0,
          totalChapters: ASTRO_PREMIUM_CHAPTERS.length,
          currentChapterTitle: "PDF 생성에 실패했습니다",
        },
        error: {
          code: clean(doc.reasonCode || "ASTRO_PREMIUM_GENERATION_FAILED"),
          message: clean(doc.reasonMessage || "점성술 PDF 생성이 완료되지 않았습니다. 다시 시도해 주세요."),
        },
      }, { sessionId, reportId }));
    }

    return json({
      ok: true,
      serviceKey: "astro-premium",
      data: {
        sessionId: clean(doc.sessionId || sessionId),
        reportId: clean(doc.reportId || reportId),
        status: "running",
        progress: {
          stateKey: clean(doc.premiumStatus || "generating"),
          currentChapterNo: 0,
          totalChapters: ASTRO_PREMIUM_CHAPTERS.length,
          currentChapterTitle: "PDF 결과를 확인하는 중입니다",
        },
        retryAfterMs: ASTRO_STATUS_RETRY_AFTER_MS,
      },
    }, { status: 202 });
  }
  return json(buildAstroStatusPayload(lock));
}

function getVedicSessionId(body = {}) {
  const fromBody = clean(body?.sessionId || body?.reportSessionId || body?.generationId);
  if (fromBody) return fromBody.slice(0, 160);
  return `vedic-premium:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
}

function compactVedicPremiumLocks(now = Date.now()) {
  for (const [sessionId, state] of vedicPremiumGenerationLocks.entries()) {
    const startedAtMs = Number(state?.startedAtMs || 0);
    if (!startedAtMs || now - startedAtMs > VEDIC_PREMIUM_LOCK_TTL_MS) {
      vedicPremiumGenerationLocks.delete(sessionId);
    }
  }
}

function clampVedicChapterNo(value, total) {
  const n = Number(value || 0);
  const max = Math.max(1, Number(total || VEDIC_PREMIUM_STATUS_CHAPTERS.length || VEDIC_PREMIUM_CHAPTERS.length || 12));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(max, Math.trunc(n)));
}

function normalizeVedicRuntimeStatus(value = "") {
  const status = clean(value).toLowerCase();
  if (status === "done") return "completed";
  if (status === "running") return "generating";
  if (status === "payment_verification" || status === "local_calculation") return "validating";
  if (status === "llm_generation" || status === "writing_seed" || status === "writing_llm") return "generating";
  if (status === "pdf_rendering" || status === "pdf_rendered") return "rendering";
  if (["pending", "validating", "generating", "rendering", "completed", "failed", "not_found"].includes(status)) return status;
  return status || "pending";
}

function resolveVedicProgressPercent(status, currentChapterNo = 0, totalChapters = VEDIC_PREMIUM_STATUS_CHAPTERS.length, provided) {
  const direct = Number(provided);
  if (Number.isFinite(direct)) return Math.max(0, Math.min(100, Math.round(direct)));
  const normalized = normalizeVedicRuntimeStatus(status);
  if (normalized === "completed" || normalized === "failed") return 100;
  if (normalized === "pending") return 0;
  if (normalized === "validating") return 5;
  if (normalized === "rendering") return 90;
  if (normalized === "generating") {
    const total = Math.max(1, Number(totalChapters || VEDIC_PREMIUM_STATUS_CHAPTERS.length || 1));
    const current = clampVedicChapterNo(currentChapterNo, total);
    return Math.max(10, Math.min(80, 10 + Math.round((current / total) * 70)));
  }
  return 0;
}

function updateVedicSessionProgress(sessionId, progress = {}) {
  const key = clean(sessionId);
  if (!key || !vedicPremiumGenerationLocks.has(key)) return;
  const lock = vedicPremiumGenerationLocks.get(key) || {};
  const stateKey = clean(progress.stateKey || progress.status || progress.stage || lock.progress?.stateKey || lock.status || "pending");
  const status = normalizeVedicRuntimeStatus(progress.status || progress.stage || stateKey);
  const totalChapters = Number(progress.totalChapters || lock.progress?.totalChapters || VEDIC_PREMIUM_STATUS_CHAPTERS.length || VEDIC_PREMIUM_CHAPTERS.length);
  const currentChapterNo = clampVedicChapterNo(progress.currentChapterNo || progress.completedChapters || lock.progress?.currentChapterNo || 0, totalChapters);
  const progressPercent = resolveVedicProgressPercent(status, currentChapterNo, totalChapters, progress.progress ?? progress.progressPercent);
  vedicPremiumGenerationLocks.set(key, {
    ...lock,
    status,
    stage: status,
    progress: {
      ...(lock.progress || {}),
      ...progress,
      stateKey: status,
      progress: progressPercent,
      progressPercent,
      currentChapterNo,
      totalChapters,
      updatedAt: new Date().toISOString(),
    },
  });
}

function buildVedicProgressPatch(stage, payload = {}) {
  const totalChapters = VEDIC_PREMIUM_STATUS_CHAPTERS.length || VEDIC_PREMIUM_CHAPTERS.length;
  const chapterNo = clampVedicChapterNo(payload?.chapterNo || payload?.chapter || payload?.completed, totalChapters);
  switch (stage) {
    case "LocalCalculationJsonPrepared":
      return { stateKey: "local_calculation", currentChapterNo: 0, totalChapters, currentChapterTitle: "베다 차트 근거 정리" };
    case "LlmManuscriptReady":
      return { stateKey: "writing_seed", currentChapterNo: 0, totalChapters, currentChapterTitle: "상담 원고 신호 구성" };
    case "LlmManuscriptSuccess":
      return { stateKey: "writing_llm", currentChapterNo: totalChapters, totalChapters, currentChapterTitle: "상담 원고 조립 완료" };
    case "LlmManuscriptFailed":
      return { stateKey: "failed", currentChapterNo: chapterNo, totalChapters, currentChapterTitle: "상담 원고 작성 실패" };
    case "FinalManuscriptValidated":
      return { stateKey: "manuscript_validated", currentChapterNo: totalChapters, totalChapters, currentChapterTitle: "상담 원고 검수 완료" };
    case "PdfRenderStart":
      return { stateKey: "pdf_rendering", currentChapterNo: totalChapters, totalChapters, currentChapterTitle: "PDF 편집/렌더링" };
    case "PdfRenderSuccess":
      return { stateKey: "pdf_rendered", currentChapterNo: totalChapters, totalChapters, currentChapterTitle: "PDF 렌더링 완료" };
    default:
      return null;
  }
}

function buildVedicStatusPayload(lock = {}, fallback = {}) {
  const result = lock.result && typeof lock.result === "object" ? lock.result : null;
  const progress = lock.progress && typeof lock.progress === "object" ? lock.progress : {};
  const rawStatus = clean(lock.status || fallback.status || "");
  const status = normalizeVedicRuntimeStatus(rawStatus || progress.stateKey || "pending");
  const totalChapters = Number(progress.totalChapters || result?.expectedChapterCount || result?.chapterCount || VEDIC_PREMIUM_STATUS_CHAPTERS.length || VEDIC_PREMIUM_CHAPTERS.length);
  const currentChapterNo = clampVedicChapterNo(
    progress.currentChapterNo || (status === "completed" ? totalChapters : 0),
    totalChapters,
  );
  const progressPercent = resolveVedicProgressPercent(status, currentChapterNo, totalChapters, progress.progress ?? progress.progressPercent);
  return {
    ok: true,
    serviceKey: "vedic-premium",
    data: {
      sessionId: clean(lock.sessionId || fallback.sessionId),
      reportId: clean(lock.reportId || fallback.reportId || result?.reportId),
      status,
      startedAt: clean(lock.startedAt || fallback.startedAt),
      completedAt: clean(lock.completedAt || result?.completedAt),
      failedAt: clean(lock.failedAt || fallback.failedAt),
      progress: {
        stateKey: clean(progress.stateKey || status),
        progress: progressPercent,
        progressPercent,
        currentChapterNo,
        totalChapters,
        currentChapterTitle: clean(progress.currentChapterTitle),
        manuscriptSource: clean(progress.manuscriptSource || result?.manuscriptSource),
        updatedAt: clean(progress.updatedAt),
      },
      result: status === "completed" ? result : null,
      pdfReady: result?.pdfReady || null,
      canDownload: Boolean(result?.canDownload || clean(result?.pdfUrl || result?.downloadUrl || result?.htmlUrl || result?.pdfReady?.pdfUrl || result?.pdfReady?.downloadUrl)),
      error: lock.error || fallback.error || null,
    },
  };
}

function buildVedicStatusPayloadFromArchive(doc = {}, sessionId = "", reportId = "") {
  const metadata = doc?.metadata && typeof doc.metadata === "object" ? doc.metadata : {};
  const archive = metadata?.archive && typeof metadata.archive === "object" ? metadata.archive : null;
  if (!archive) return null;
  const pdfReady = archive?.pdfReady && typeof archive.pdfReady === "object" ? archive.pdfReady : {};
  const resolvedReportId = clean(archive.reportId || doc.reportId || metadata.reportId || reportId);
  const resolvedSessionId = clean(archive.sessionId || doc.sessionId || metadata.sessionId || sessionId);
  const chapters = Array.isArray(archive.chapters) ? archive.chapters : [];
  const manuscriptSource = clean(archive.manuscriptSource || pdfReady.manuscriptSource || VEDIC_PDF_CONFIG.generationMode);
  const llmAssembly = archive.llmAssembly || pdfReady.llmAssembly || null;
  return {
    ok: true,
    serviceKey: "vedic-premium",
    featureKey: VEDIC_PREMIUM_FEATURE_KEY,
    status: "completed",
    sessionId: resolvedSessionId,
    chapterCount: Number(archive.chapterCount || chapters.length || VEDIC_PREMIUM_STATUS_CHAPTERS.length || VEDIC_PREMIUM_CHAPTERS.length),
    llmAssembly,
    llmAssemblyOnly: archive.llmAssemblyOnly === true || pdfReady.llmAssemblyOnly === true,
    externalCallsAllowed: archive.externalCallsAllowed === true || pdfReady.externalCallsAllowed === true,
    reportId: resolvedReportId,
    chapters,
    chapterDrafts: Array.isArray(archive.chapterDrafts) ? archive.chapterDrafts : [],
    payload: archive.payload || archive.localVedicChartJson || null,
    localVedicChartJson: archive.localVedicChartJson || archive.payload || null,
    vedicMasterJson: archive.vedicMasterJson || null,
    masterJsonValidation: archive.masterJsonValidation || null,
    pdfReady,
    diagnostics: archive.diagnostics || metadata.diagnostics || null,
    pdfUrl: clean(archive.pdfUrl || pdfReady.pdfUrl || pdfReady.downloadUrl || pdfReady.htmlUrl),
    htmlUrl: clean(archive.htmlUrl || pdfReady.htmlUrl),
    downloadUrl: clean(archive.downloadUrl || pdfReady.downloadUrl || pdfReady.pdfUrl || pdfReady.htmlUrl),
    canReopen: archive.canReopen !== false,
    canDownload: Boolean(archive.canDownload || pdfReady.downloadUrl || pdfReady.pdfUrl || pdfReady.htmlUrl),
    quality: archive.quality || null,
    manuscriptSource,
    llmDraftChapterCount: Number(archive.llmDraftChapterCount || chapters.length || 0),
    finalChapterCount: chapters.length,
    progress: {
      stateKey: "completed",
      progress: 100,
      progressPercent: 100,
      currentChapterNo: Number(archive.expectedChapterCount || archive.chapterCount || VEDIC_PREMIUM_STATUS_CHAPTERS.length || VEDIC_PREMIUM_CHAPTERS.length),
      totalChapters: Number(archive.expectedChapterCount || archive.chapterCount || VEDIC_PREMIUM_STATUS_CHAPTERS.length || VEDIC_PREMIUM_CHAPTERS.length),
      currentChapterTitle: "완료",
      manuscriptSource,
    },
  };
}

export function buildVedicPremiumStatusLookupQuery({ userId = "", sessionId = "", reportId = "" } = {}) {
  const identityClauses = [];
  const safeSessionId = clean(sessionId);
  const safeReportId = clean(reportId);
  if (safeSessionId) {
    identityClauses.push(
      { sessionId: safeSessionId },
      { "metadata.sessionId": safeSessionId },
      { "metadata.archive.sessionId": safeSessionId },
    );
  }
  if (safeReportId) {
    identityClauses.push(
      { reportId: safeReportId },
      { "metadata.reportId": safeReportId },
      { "metadata.archive.reportId": safeReportId },
    );
  }
  const reportTypeClauses = [
    { reportType: "vedicPremium" },
    { "metadata.reportType": "vedicPremium" },
    { "metadata.serviceKey": "vedic-premium" },
    { "metadata.archive.reportType": "vedic_book" },
  ];
  const query = { userId };
  if (!identityClauses.length) {
    query.$or = reportTypeClauses;
    return query;
  }
  return {
    ...query,
    $and: [
      { $or: identityClauses },
      { $or: reportTypeClauses },
    ],
  };
}

function isVedicPdfProductionEnv(env = {}) {
  const nodeEnv = clean(env?.NODE_ENV || env?.ENVIRONMENT || env?.CF_PAGES_BRANCH || "").toLowerCase();
  return nodeEnv === "production" || nodeEnv === "prod" || nodeEnv === "main";
}

function isVedicPdfDebugMockAccessAllowed(env = {}) {
  const enabled = /^(1|true|yes|on)$/i.test(clean(env?.PDF_DEBUG_MODE || (typeof process !== "undefined" ? process.env?.PDF_DEBUG_MODE : "")));
  return enabled && !isVedicPdfProductionEnv(env);
}

function readVedicPdfRuntimeFlag(env = {}, key = "", fallback = "") {
  const direct = env && Object.prototype.hasOwnProperty.call(env, key) ? env[key] : undefined;
  if (direct !== undefined && direct !== null && String(direct) !== "") return String(direct);
  const processValue = typeof process !== "undefined" ? process.env?.[key] : undefined;
  if (processValue !== undefined && processValue !== null && String(processValue) !== "") return String(processValue);
  return fallback;
}

function isVedicPdfLlmDryRunForced(env = {}) {
  const provider = readVedicPdfRuntimeFlag(env, "PDF_LLM_PROVIDER", "").toLowerCase();
  const dryRun = /^(1|true|yes|on)$/i.test(readVedicPdfRuntimeFlag(env, "LLM_DRY_RUN", "false"));
  const geminiDisabled = /^(0|false|no|off)$/i.test(readVedicPdfRuntimeFlag(env, "GEMINI_CALL_ENABLED", "true"));
  const workersAiDisabled = /^(0|false|no|off)$/i.test(readVedicPdfRuntimeFlag(env, "WORKERS_AI_ENABLED", "true"));
  const maxCalls = Number(readVedicPdfRuntimeFlag(env, "PDF_LLM_MAX_CALLS_PER_JOB", "1"));
  return dryRun || provider === "mock" || geminiDisabled && workersAiDisabled || Number.isFinite(maxCalls) && maxCalls <= 0;
}

function normalizeVedicPdfAccessMethod(access = {}, fallback = "payment") {
  const value = clean(access.method || access.accessMethod || access.accessType || fallback).toLowerCase();
  if (value === "debug_mock") return "debug_mock";
  if (value.includes("pass") || value.includes("membership") || value.includes("unlock")) return "pass";
  return "payment";
}

function buildVedicPdfJobId(body = {}, inputHash = "") {
  return clean(body?.jobId || body?.reportId || body?.accessGrant?.reportId || `vedic_${inputHash || Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`);
}

function buildVedicPdfSessionId(body = {}, jobId = "") {
  return clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId || `${jobId || "vedic"}:session`);
}

async function resolveVedicPdfAccess(request, env, auth, body = {}) {
  const premiumAccessToken = readPremiumAccessToken(request, body);
  try {
    const access = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, VEDIC_PDF_REPORT_TYPE, {
      ...body,
      reportType: VEDIC_PDF_REPORT_TYPE,
      featureKey: clean(body?.featureKey || VEDIC_PREMIUM_FEATURE_KEY) || VEDIC_PREMIUM_FEATURE_KEY,
      premiumAccessToken: premiumAccessToken || undefined,
      _accessRoute: "/api/vedic/pdf/verify-access",
    });
    if (access?.ok) {
      return {
        ok: true,
        access,
        method: normalizeVedicPdfAccessMethod(access),
        premiumAccessToken,
      };
    }
    if (isVedicPdfDebugMockAccessAllowed(env)) {
      return {
        ok: true,
        method: "debug_mock",
        premiumAccessToken,
        access: {
          ok: true,
          accessType: "debug_mock",
          featureKey: clean(body?.featureKey || VEDIC_PREMIUM_FEATURE_KEY) || VEDIC_PREMIUM_FEATURE_KEY,
          reportType: VEDIC_PDF_REPORT_TYPE,
          chargedCoins: 0,
        },
      };
    }
    return {
      ok: false,
      status: Number(access?.status || 402),
      code: Number(access?.status || 402) === 401 ? "AUTH_REQUIRED" : "PAYMENT_REQUIRED",
      message: clean(access?.message || "베다점 PDF 생성 권한이 확인되지 않았습니다."),
      access,
    };
  } catch (error) {
    if (isVedicPdfDebugMockAccessAllowed(env)) {
      return {
        ok: true,
        method: "debug_mock",
        premiumAccessToken,
        access: {
          ok: true,
          accessType: "debug_mock",
          featureKey: clean(body?.featureKey || VEDIC_PREMIUM_FEATURE_KEY) || VEDIC_PREMIUM_FEATURE_KEY,
          reportType: VEDIC_PDF_REPORT_TYPE,
          chargedCoins: 0,
        },
      };
    }
    return {
      ok: false,
      status: Number(error?.status || 500),
      code: "ACCESS_VERIFICATION_FAILED",
      message: clean(error?.message || "베다점 PDF 결제 검증 중 문제가 발생했습니다."),
      error,
    };
  }
}

async function findVedicPdfJobExecution(env, userId, jobId = "", sessionId = "") {
  await connectDb(withPdfFastDbEnv(env));
  const filters = [];
  const safeJobId = clean(jobId);
  const safeSessionId = clean(sessionId);
  if (safeJobId) {
    filters.push({ reportId: safeJobId });
    filters.push({ "metadata.vedicPdfMockJob.id": safeJobId });
    filters.push({ "metadata.archive.reportId": safeJobId });
  }
  if (safeSessionId) {
    filters.push({ sessionId: safeSessionId });
    filters.push({ "metadata.sessionId": safeSessionId });
    filters.push({ "metadata.archive.sessionId": safeSessionId });
  }
  if (!filters.length) return null;
  return await ServiceExecutionTransaction.findOne({
    userId,
    reportType: VEDIC_PDF_REPORT_TYPE,
    $or: filters,
  }).sort({ updatedAt: -1, completedAt: -1, createdAt: -1 }).lean();
}

async function persistVedicPdfJob(env, userId, executionCtx = {}, job = {}, extraSet = {}) {
  if (!clean(executionCtx.executionKey)) return null;
  const now = new Date();
  await connectDb(withPdfFastDbEnv(env));
  return await ServiceExecutionTransaction.updateOne(
    { userId, executionKey: executionCtx.executionKey },
    {
      $set: {
        heartbeatAt: now,
        lastClientHeartbeatAt: now,
        reportType: VEDIC_PDF_REPORT_TYPE,
        reportId: clean(job.id),
        sessionId: clean(executionCtx.sessionId),
        "metadata.vedicPdfMockJob": job,
        "metadata.generationStatus": clean(job.status || "created"),
        "metadata.serviceType": VEDIC_PDF_SERVICE_TYPE,
        "metadata.serviceKey": VEDIC_PDF_SERVICE_KEY,
        "metadata.progress": Number(job.progressPercent || 0),
        "metadata.currentChapterId": clean(job.currentChapterId),
        "metadata.currentChapterTitle": clean(job.currentChapterTitle),
        "metadata.completedChapters": Number(job.completedChapters || 0),
        "metadata.totalChapters": Number(job.totalChapters || VEDIC_PDF_CHAPTERS.length),
        "metadata.provider": "mock",
        "metadata.tokensUsed": 0,
        "metadata.cost": 0,
        "metadata.isMock": true,
        "metadata.progressUpdatedAt": now.toISOString(),
        ...extraSet,
      },
    },
  );
}

function buildVedicPdfExecutionContextFromDoc(doc = {}) {
  return {
    executionKey: clean(doc.executionKey),
    reportType: clean(doc.reportType || VEDIC_PDF_REPORT_TYPE),
    featureKey: clean(doc.featureKey || VEDIC_PREMIUM_FEATURE_KEY),
    reportId: clean(doc.reportId),
    sessionId: clean(doc.sessionId),
    paymentSessionId: clean(doc.paymentSessionId),
    coinTransactionId: clean(doc.coinTransactionId),
    sourceTransactionId: clean(doc.sourceTransactionId),
    coinAmount: Number(doc.coinAmount || 0),
    cost: Number(doc.cost || 0),
    payment: doc.paymentRef || null,
    timeoutSeconds: Number(doc.timeoutSeconds || 1800),
    maxRetries: Number(doc.maxRetries || 6),
    idempotencyKey: clean(doc.idempotencyKey || doc.executionKey),
    metadata: doc.metadata && typeof doc.metadata === "object" ? doc.metadata : {},
  };
}

function delayVedicMockChapter(env = {}) {
  const value = Number(env?.PDF_MOCK_CHAPTER_DELAY_MS || 220);
  const ms = Number.isFinite(value) ? Math.max(0, Math.min(3000, value)) : 220;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getVedicPdfPathId(request, segment = "status") {
  const pathname = new URL(request.url).pathname;
  const match = pathname.match(new RegExp(`/api/vedic/pdf/${segment}/([^/]+)$`));
  return match ? decodeURIComponent(match[1]) : "";
}

async function handleVedicPdfVerifyAccess(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const input = normalizeVedicPdfInput(body);
  const validation = validateVedicPdfInput(input);
  if (!validation.ok) return json({ ok: false, serviceKey: VEDIC_PDF_SERVICE_KEY, ...validation }, { status: 422 });
  const accessResult = await resolveVedicPdfAccess(request, env, auth, {
    ...body,
    input,
    reportType: VEDIC_PDF_REPORT_TYPE,
    featureKey: clean(body?.featureKey || VEDIC_PREMIUM_FEATURE_KEY) || VEDIC_PREMIUM_FEATURE_KEY,
  });
  if (!accessResult.ok) {
    return json({
      ok: false,
      serviceKey: VEDIC_PDF_SERVICE_KEY,
      accessGranted: false,
      code: accessResult.code || "PAYMENT_REQUIRED",
      message: accessResult.message || "베다점 PDF 생성 권한이 확인되지 않았습니다.",
    }, { status: Number(accessResult.status || 402) });
  }
  return json({
    ok: true,
    serviceKey: VEDIC_PDF_SERVICE_KEY,
    accessGranted: true,
    method: accessResult.method,
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
    verifiedAt: new Date().toISOString(),
  });
}

async function handleVedicPdfCreateJob(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const input = normalizeVedicPdfInput(body);
  const validation = validateVedicPdfInput(input);
  if (!validation.ok) return json({ ok: false, serviceKey: VEDIC_PDF_SERVICE_KEY, ...validation }, { status: 422 });

  const accessResult = await resolveVedicPdfAccess(request, env, auth, {
    ...body,
    input,
    reportType: VEDIC_PDF_REPORT_TYPE,
    featureKey: clean(body?.featureKey || VEDIC_PREMIUM_FEATURE_KEY) || VEDIC_PREMIUM_FEATURE_KEY,
  });
  if (!accessResult.ok) {
    return json({
      ok: false,
      serviceKey: VEDIC_PDF_SERVICE_KEY,
      accessGranted: false,
      code: accessResult.code || "PAYMENT_REQUIRED",
      message: accessResult.message || "베다점 PDF 생성 권한이 확인되지 않았습니다.",
    }, { status: Number(accessResult.status || 402) });
  }

  const context = buildVedicPdfContext(body, input);
  const inputHash = `${hashCodeSafe(input.birthDate)}_${Date.now().toString(36)}`;
  const jobId = buildVedicPdfJobId(body, inputHash);
  const sessionId = buildVedicPdfSessionId(body, jobId);
  const existingDoc = await findVedicPdfJobExecution(env, auth.userId, jobId, sessionId);
  const existingJob = existingDoc?.metadata?.vedicPdfMockJob;
  if (existingJob?.id) {
    return json(buildVedicPdfStatusPayload(existingJob), { status: existingJob.status === "completed" ? 200 : 202 });
  }

  const featureKey = clean(body?.featureKey || VEDIC_PREMIUM_FEATURE_KEY) || VEDIC_PREMIUM_FEATURE_KEY;
  const job = buildVedicPdfJob({
    jobId,
    userId: auth.userId,
    input,
    context,
    access: buildVedicPdfAccess(accessResult.access, accessResult.method),
  });
  const executionCtx = buildPremiumExecutionContext({
    serviceKey: VEDIC_PDF_SERVICE_KEY,
    reportType: VEDIC_PDF_REPORT_TYPE,
    userId: auth.userId,
    featureKey,
    sessionId,
    reportId: job.id,
    access: accessResult.access,
    body: {
      ...body,
      input,
      sessionId,
      reportSessionId: sessionId,
      reportId: job.id,
      accessGrant: {
        ...(body.accessGrant || {}),
        sessionId,
        reportSessionId: sessionId,
        reportId: job.id,
      },
    },
    timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
  });
  executionCtx.metadata = {
    ...(executionCtx.metadata || {}),
    serviceType: VEDIC_PDF_SERVICE_TYPE,
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
    vedicPdfMockJob: job,
  };
  await startPremiumPdfExecution(withPdfFastDbEnv(env), auth.userId, executionCtx);
  await persistVedicPdfJob(env, auth.userId, executionCtx, job);
  return json(buildVedicPdfStatusPayload(job), { status: 201 });
}

function hashCodeSafe(value = "") {
  let hash = 0;
  const text = clean(value || Date.now());
  for (let i = 0; i < text.length; i += 1) hash = (Math.imul(31, hash) + text.charCodeAt(i)) | 0;
  return Math.abs(hash).toString(36);
}

async function handleVedicPdfGenerateMock(request, env) {
  const auth = await requireAuth(request, env);
  const body = await readJson(request);
  const jobId = clean(body?.jobId || body?.reportId);
  if (!jobId) return json({ ok: false, serviceKey: VEDIC_PDF_SERVICE_KEY, code: "MISSING_JOB_ID", message: "jobId가 필요합니다." }, { status: 422 });
  const doc = await findVedicPdfJobExecution(env, auth.userId, jobId, body?.sessionId || body?.reportSessionId);
  const initialJob = doc?.metadata?.vedicPdfMockJob;
  if (!doc || !initialJob?.id) return json({ ok: false, serviceKey: VEDIC_PDF_SERVICE_KEY, code: "JOB_NOT_FOUND", message: "베다점 PDF Job을 찾을 수 없습니다." }, { status: 404 });
  if (initialJob.access?.verified !== true) return json({ ok: false, serviceKey: VEDIC_PDF_SERVICE_KEY, code: "ACCESS_NOT_VERIFIED", message: "결제 또는 이용권 검증이 완료되지 않았습니다." }, { status: 403 });
  if (initialJob.status === "completed") return json(buildVedicPdfResultPayload(initialJob, doc.metadata));
  if (["generating", "chapter_generating", "rendering", "saving"].includes(clean(initialJob.status))) {
    return json(buildVedicPdfStatusPayload(initialJob), { status: 202 });
  }
  if (["failed", "cancelled"].includes(clean(initialJob.status))) {
    return json(buildVedicPdfStatusPayload(initialJob), { status: 409 });
  }

  const acquired = await ServiceExecutionTransaction.findOneAndUpdate(
    {
      _id: doc._id,
      userId: auth.userId,
      "metadata.vedicPdfMockJob.status": { $nin: ["generating", "chapter_generating", "rendering", "saving", "completed", "failed", "cancelled"] },
    },
    {
      $set: {
        "metadata.vedicPdfMockJob.status": "generating",
        "metadata.vedicPdfMockJob.updatedAt": new Date().toISOString(),
        "metadata.vedicPdfMockJob.progressPercent": calculateVedicPdfProgress("generating", initialJob.completedChapters, initialJob.totalChapters),
        "metadata.generationStatus": "generating",
      },
    },
    { returnDocument: "after" },
  ).lean();
  if (!acquired) {
    const freshDoc = await findVedicPdfJobExecution(env, auth.userId, jobId, body?.sessionId || body?.reportSessionId);
    return json(buildVedicPdfStatusPayload(freshDoc?.metadata?.vedicPdfMockJob || initialJob), { status: 202 });
  }

  let job = acquired.metadata.vedicPdfMockJob;
  const executionCtx = buildVedicPdfExecutionContextFromDoc(acquired);
  const persist = (nextJob, extraSet = {}) => persistVedicPdfJob(env, auth.userId, executionCtx, nextJob, extraSet);
  try {
    job = {
      ...job,
      status: "generating",
      progressPercent: calculateVedicPdfProgress("generating", job.completedChapters, job.totalChapters),
      updatedAt: new Date().toISOString(),
    };
    await persist(job);
    const total = Number(job.totalChapters || job.chapters?.length || VEDIC_PDF_CHAPTERS.length);
    for (let index = 0; index < total; index += 1) {
      const chapter = job.chapters[index];
      if (!chapter) throw Object.assign(new Error("챕터 정의가 없습니다."), { code: "CHAPTER_DEFINITION_MISSING", status: 500 });
      if (chapter.status === "completed") continue;
      const startedAt = new Date().toISOString();
      job.chapters[index] = {
        ...chapter,
        status: "generating",
        startedAt,
        provider: "mock",
        tokensUsed: 0,
        cost: 0,
        isMock: true,
      };
      job.status = "chapter_generating";
      job.currentChapterId = chapter.id;
      job.currentChapterTitle = chapter.title;
      job.progressPercent = calculateVedicPdfProgress(job.status, job.completedChapters, job.totalChapters);
      job.updatedAt = startedAt;
      await persist(job);

      const result = await generateVedicPdfChapterContent({
        jobId: job.id,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        chapterOrder: chapter.order,
        totalChapters: total,
        input: job.inputSnapshot,
        context: job.contextSnapshot,
      }, env);
      const completedAt = new Date().toISOString();
      job.chapters[index] = {
        ...job.chapters[index],
        status: "completed",
        content: result.content,
        provider: "mock",
        tokensUsed: 0,
        cost: 0,
        isMock: true,
        completedAt,
      };
      job.completedChapters = job.chapters.filter((item) => item.status === "completed").length;
      job.progressPercent = calculateVedicPdfProgress("chapter_generating", job.completedChapters, job.totalChapters);
      job.updatedAt = completedAt;
      await persist(job);
      await delayVedicMockChapter(env);
    }

    job.status = "rendering";
    job.currentChapterTitle = "PDF 문서를 렌더링하고 있습니다.";
    job.progressPercent = calculateVedicPdfProgress(job.status, job.completedChapters, job.totalChapters);
    job.updatedAt = new Date().toISOString();
    await persist(job);

    const requestOrigin = new URL(request.url).origin;
    const archiveUrls = buildVedicArchiveUrls(requestOrigin, job.id);
    const archiveChapters = buildVedicMockArchiveChapters(job);
    const html = buildVedicMockPdfHtml(job, archiveChapters);
    const pdfReady = {
      title: `${clean(job.inputSnapshot?.name) || "사용자"} 베다점 PDF Mock Report`,
      filename: `${job.id}.pdf`,
      htmlFilename: `${job.id}.html`,
      generatedAt: new Date().toISOString(),
      html,
      htmlUrl: archiveUrls.htmlUrl,
      pdfUrl: archiveUrls.pdfUrl,
      downloadUrl: archiveUrls.downloadUrl,
      directDownloadUrl: archiveUrls.downloadUrl,
      storageKey: `premium-archive:vedic-mock:${job.id}`,
      mimeType: "application/pdf",
      contentType: "application/pdf",
      renderFormat: "pdf-archive",
      chapters: archiveChapters,
      chapterCount: archiveChapters.length,
      expectedChapterCount: VEDIC_PDF_CHAPTERS.length,
      metadata: {
        provider: "mock",
        tokensUsed: 0,
        cost: 0,
        isMock: true,
        llmAssemblyOnly: true,
        externalCallsAllowed: false,
      },
      canDownload: true,
    };

    job.status = "saving";
    job.currentChapterTitle = "PDF 파일을 저장하고 있습니다.";
    job.progressPercent = calculateVedicPdfProgress(job.status, job.completedChapters, job.totalChapters);
    job.updatedAt = new Date().toISOString();
    await persist(job, { "metadata.archive.pdfReady": pdfReady });

    const storedUrl = clean(pdfReady.downloadUrl || pdfReady.pdfUrl);
    if (!storedUrl) throw Object.assign(new Error("PDF 다운로드 URL 생성에 실패했습니다."), { code: "VEDIC_PDF_URL_MISSING", status: 500 });
    const completedAt = new Date().toISOString();
    job = {
      ...job,
      status: "completed",
      progressPercent: 100,
      pdfUrl: storedUrl,
      currentChapterId: "",
      currentChapterTitle: "베다점 PDF가 완성되었습니다.",
      updatedAt: completedAt,
      completedAt,
    };
    const archivePayload = {
      reportId: job.id,
      serviceKey: VEDIC_PDF_SERVICE_KEY,
      serviceType: VEDIC_PDF_SERVICE_TYPE,
      reportType: VEDIC_PDF_REPORT_TYPE,
      status: "completed",
      chapterCount: archiveChapters.length,
      finalChapterCount: archiveChapters.length,
      chapters: archiveChapters,
      inputSnapshot: job.inputSnapshot,
      contextSnapshot: job.contextSnapshot,
      pdfReady,
      pdfUrl: storedUrl,
      htmlUrl: archiveUrls.htmlUrl,
      downloadUrl: storedUrl,
      provider: "mock",
      tokensUsed: 0,
      cost: 0,
      isMock: true,
      canReopen: true,
      canDownload: true,
    };
    const completedMetadata = {
      ...(executionCtx.metadata || {}),
      vedicPdfMockJob: job,
      serviceType: VEDIC_PDF_SERVICE_TYPE,
      provider: "mock",
      tokensUsed: 0,
      cost: 0,
      isMock: true,
      chapterCount: archiveChapters.length,
      archive: {
        reportId: job.id,
        sessionId: clean(executionCtx.sessionId),
        reportType: "vedic_book",
        archiveReportType: VEDIC_PDF_REPORT_TYPE,
        displayName: "베다점 PDF",
        title: pdfReady.title,
        mode: "personal",
        birthName: clean(job.inputSnapshot?.name),
        summary: clean(archiveChapters[0]?.text, 1000),
        pdfUrl: storedUrl,
        htmlUrl: archiveUrls.htmlUrl,
        downloadUrl: storedUrl,
        chapters: archiveChapters,
        pdfReady,
        payload: archivePayload,
        provider: "mock",
        tokensUsed: 0,
        cost: 0,
        isMock: true,
        canReopen: true,
        canDownload: true,
      },
      pdfReady,
      chapters: archiveChapters,
    };
    executionCtx.metadata = completedMetadata;
    await completePremiumPdfExecution(withPdfFastDbEnv(env), auth.userId, executionCtx, job.id, completedMetadata);
    return json(buildVedicPdfResultPayload(job, completedMetadata));
  } catch (error) {
    const failedAt = new Date().toISOString();
    const chapterIndex = Array.isArray(job.chapters) ? job.chapters.findIndex((chapter) => chapter.status === "generating") : -1;
    if (chapterIndex >= 0) {
      job.chapters[chapterIndex] = {
        ...job.chapters[chapterIndex],
        status: "failed",
        errorMessage: clean(error?.message || error),
        completedAt: failedAt,
      };
    }
    job.status = "failed";
    job.errorMessage = clean(error?.message || "베다점 PDF 생성 중 문제가 발생했습니다. 결제 내역은 보존됩니다. 다시 시도하거나 고객센터에 문의해주세요.");
    job.progressPercent = calculateVedicPdfProgress("failed", job.completedChapters, job.totalChapters, job.progressPercent);
    job.updatedAt = failedAt;
    await persist(job);
    await failPremiumPdfExecution(
      withPdfFastDbEnv(env),
      auth.userId,
      executionCtx,
      clean(error?.code || "VEDIC_MOCK_GENERATION_FAILED"),
      job.errorMessage,
      "vedic-mock-generation",
    );
    console.error("[VedicPdfMock][PipelineFailed]", {
      jobId: job.id,
      chapterId: clean(job.currentChapterId),
      errorCode: clean(error?.code || "VEDIC_MOCK_GENERATION_FAILED"),
      message: clean(error?.message || error),
      stack: error?.stack,
    });
    return json(buildVedicPdfStatusPayload(job), { status: Number(error?.status || 500) });
  }
}

async function handleVedicPdfStatus(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const jobId = clean(getVedicPdfPathId(request, "status") || url.searchParams.get("jobId") || url.searchParams.get("reportId"));
  const sessionId = clean(url.searchParams.get("sessionId") || url.searchParams.get("reportSessionId"));
  if (!jobId && !sessionId) {
    return json({ ok: false, serviceKey: VEDIC_PDF_SERVICE_KEY, code: "MISSING_STATUS_KEY", message: "jobId 또는 sessionId가 필요합니다." }, { status: 422 });
  }
  const doc = await findVedicPdfJobExecution(env, auth.userId, jobId, sessionId);
  const job = doc?.metadata?.vedicPdfMockJob;
  if (!job?.id) {
    return json({ ok: false, serviceKey: VEDIC_PDF_SERVICE_KEY, code: "JOB_NOT_FOUND", message: "베다점 PDF Job을 찾을 수 없습니다." }, { status: 404 });
  }
  return json(buildVedicPdfStatusPayload(job), { status: ["completed", "failed", "cancelled"].includes(clean(job.status)) ? 200 : 202 });
}

async function handleVedicPdfResult(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const jobId = clean(getVedicPdfPathId(request, "result") || url.searchParams.get("jobId") || url.searchParams.get("reportId"));
  const sessionId = clean(url.searchParams.get("sessionId") || url.searchParams.get("reportSessionId"));
  if (!jobId && !sessionId) {
    return json({ ok: false, serviceKey: VEDIC_PDF_SERVICE_KEY, code: "MISSING_RESULT_KEY", message: "jobId 또는 sessionId가 필요합니다." }, { status: 422 });
  }
  const doc = await findVedicPdfJobExecution(env, auth.userId, jobId, sessionId);
  const job = doc?.metadata?.vedicPdfMockJob;
  if (!job?.id) {
    return json({ ok: false, serviceKey: VEDIC_PDF_SERVICE_KEY, code: "JOB_NOT_FOUND", message: "베다점 PDF Job을 찾을 수 없습니다." }, { status: 404 });
  }
  return json(buildVedicPdfResultPayload(job, doc.metadata || {}));
}

function toSafeVedicBirthLog(input = {}, chapterCount = 0) {
  return {
    hasBirthDate: Boolean(String(input.birthDate || "").trim()),
    hasBirthTime: Boolean(String(input.birthTime || "").trim()),
    birthHour: Number.isFinite(Number(input.birthHour)) ? Number(input.birthHour) : null,
    hasTimezone: Boolean(String(input.timezone || "").trim()),
    hasLocation: Boolean(String(input.birthPlace || "").trim()) || (Number.isFinite(Number(input.latitude)) && Number.isFinite(Number(input.longitude))),
    chapterCount: Number(chapterCount || 0),
  };
}

function toSafeVedicChartLog(localVedicChartJson = {}) {
  return {
    hasAyanamsa: Boolean(String(localVedicChartJson?.settings?.ayanamsa || "").trim()),
    hasLagna: Boolean(String(localVedicChartJson?.chart?.lagnaSign || "").trim()),
    hasMoonSign: Boolean(String(localVedicChartJson?.chart?.moonSign || "").trim()),
    hasNakshatra: Boolean(String(localVedicChartJson?.chart?.nakshatra?.name || "").trim()),
  };
}

function toVedicTimezoneOffset(timezoneValue) {
  const raw = clean(timezoneValue);
  if (!raw) return 9;
  const direct = Number(raw);
  if (Number.isFinite(direct)) return direct;
  const token = raw.toLowerCase();
  if (token === "asia/seoul" || token === "asia/tokyo") return 9;
  if (token === "utc" || token === "etc/utc" || token === "gmt") return 0;
  return 9;
}

function normalizeVedicChartSourceForPdf(chartSource = {}, defaults = {}) {
  const source = clean(chartSource?.source || chartSource?.calculationSource || defaults?.source || "");
  const engineQuality = clean(chartSource?.engineQuality || defaults?.engineQuality || (/swiss/i.test(source) ? "swiss" : ""));
  return {
    planets: chartSource?.planets && typeof chartSource.planets === "object" ? chartSource.planets : {},
    retrograde: chartSource?.retrograde && typeof chartSource.retrograde === "object" ? chartSource.retrograde : {},
    ayanamsaName: clean(chartSource?.ayanamsaName || chartSource?.ayanamsaType || ""),
    ayanamsa: Number.isFinite(Number(chartSource?.ayanamsa)) ? Number(chartSource.ayanamsa) : undefined,
    ascendantSidereal: Number.isFinite(Number(chartSource?.ascendantSidereal ?? chartSource?.ascendant ?? chartSource?.lagnaLongitude))
      ? Number(chartSource?.ascendantSidereal ?? chartSource?.ascendant ?? chartSource?.lagnaLongitude)
      : null,
    source,
    engineQuality,
    fallbackUsed: chartSource?.fallbackUsed === true || defaults?.fallbackUsed === true,
  };
}

function hasUsableVedicChartSource(chartSource = {}, defaults = {}) {
  const source = normalizeVedicChartSourceForPdf(chartSource, defaults);
  return validateVedicPremiumChartSourceQuality({
    chartSource: source,
    requireTrustedSource: true,
  }).ok;
}

function allowProvidedVedicPremiumChartSource(env = {}) {
  const raw = clean(env?.VEDIC_PREMIUM_ALLOW_PROVIDED_CHART);
  return /^(1|true|yes)$/i.test(raw);
}

function extractProvidedVedicBase(rawInput = {}) {
  const candidates = [
    rawInput?.chartSource,
    rawInput?.vedicChartSource,
    rawInput?.vedicBase?.chart,
    rawInput?.vedicBase,
    rawInput?.chart,
    rawInput?.localVedicChartJson,
  ];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object") {
      if (candidate?.planets || candidate?.ascendantSidereal || candidate?.lagnaLongitude || candidate?.ascendant) {
        return candidate;
      }
    }
  }
  return null;
}

function toSwissVedicInputFromBirthInput(birthInput = {}) {
  return {
    year: Number(birthInput?.birthYear),
    month: Number(birthInput?.birthMonth),
    day: Number(birthInput?.birthDay),
    hour: Number(birthInput?.birthHour),
    minute: Number.isFinite(Number(birthInput?.birthMinute)) ? Number(birthInput.birthMinute) : 0,
    timezone: toVedicTimezoneOffset(birthInput?.timezone),
    lat: Number.isFinite(Number(birthInput?.latitude)) ? Number(birthInput.latitude) : 37.5665,
    lon: Number.isFinite(Number(birthInput?.longitude)) ? Number(birthInput.longitude) : 126.978,
  };
}

async function resolveVedicChartForPremiumPdf(rawInput, birthInput, env, requestUrl) {
  const attempts = [];
  try {
    const calculated = await getSwissVedicPlanets(env, toSwissVedicInputFromBirthInput(birthInput), { requestUrl });
    const chartSource = normalizeVedicChartSourceForPdf(calculated, {
      source: "swiss-wasm-local",
      engineQuality: "swiss",
    });
    const chartSourceQuality = validateVedicPremiumChartSourceQuality({
      chartSource,
      requireTrustedSource: true,
    });
    if (chartSourceQuality.ok) {
      return {
        source: clean(chartSource.source),
        chartSource,
        chartSourceQuality,
      };
    }
    attempts.push({
      stage: "swiss-quality",
      issues: chartSourceQuality.issues,
      source: chartSourceQuality.source,
      qualityScore: chartSourceQuality.qualityScore,
    });
    console.warn("[VedicPremiumPDF][SwissChartQualityRejected]", {
      issues: chartSourceQuality.issues,
      source: chartSourceQuality.source,
      qualityScore: chartSourceQuality.qualityScore,
    });
  } catch (error) {
    attempts.push({
      stage: "swiss-calculation",
      code: clean(error?.code || ""),
      status: Number(error?.status || 0) || null,
      message: clean(error?.message || error),
    });
    console.warn("[VedicPremiumPDF][SwissChartUnavailable]", {
      reason: clean(error?.message || error),
    });
  }

  const provided = extractProvidedVedicBase(rawInput);
  if (provided) {
    const chartSource = normalizeVedicChartSourceForPdf(provided);
    const chartSourceQuality = validateVedicPremiumChartSourceQuality({
      chartSource,
      requireTrustedSource: true,
    });
    const trustedProvided = chartSourceQuality.ok && chartSourceQuality.trustedSource === true && chartSourceQuality.fallbackUsed !== true;
    if (chartSourceQuality.ok && (trustedProvided || allowProvidedVedicPremiumChartSource(env))) {
      return {
        source: clean(chartSource.source),
        chartSource,
        chartSourceQuality,
      };
    }
    attempts.push({
      stage: "provided-quality",
      issues: chartSourceQuality.issues,
      source: chartSourceQuality.source,
      qualityScore: chartSourceQuality.qualityScore,
      trustedSource: chartSourceQuality.trustedSource,
    });
    console.warn("[VedicPremiumPDF][ProvidedChartQualityRejected]", {
      issues: chartSourceQuality.issues,
      source: chartSourceQuality.source,
      qualityScore: chartSourceQuality.qualityScore,
    });
  }

  const error = new Error("베다 차트 계산을 완료하지 못했습니다. 출생 정보와 지역 정보를 확인해 주세요.");
  error.code = "VEDIC_CHART_SOURCE_INVALID";
  error.status = 422;
  error.details = {
    attempts,
    birthInput: toSafeVedicBirthLog(birthInput, VEDIC_PREMIUM_CHAPTERS.length),
  };
  throw error;
}

const VEDIC_AI_CONSULTATION_SERVICE_TYPE = "vedic_ai_consultation";
const VEDIC_AI_CONSULTATION_MARKER = "[Vedic AI Consultation]";
const VEDIC_AI_CONSULTATION_CATEGORIES = Object.freeze({
  general: "종합 베다 리딩",
  career: "직업/커리어",
  money: "재물/사업",
  love: "연애/결혼",
  relationship: "인간관계",
  family: "가족/부모",
  health: "건강/멘탈",
  study: "공부/시험",
  business: "이직/창업",
  karma: "카르마와 삶의 방향",
  dasha: "다샤 흐름",
  yearly: "올해의 운세",
  choice: "지금의 선택",
});

function isVedicAIConsultationDryRun(env = {}) {
  return /^(1|true|yes|on)$/i.test(clean(env?.VEDIC_AI_CONSULTATION_DRY_RUN || env?.LLM_DRY_RUN || ""));
}

function hasVedicAIProviderEnv(env = {}) {
  return Boolean(clean(env?.GEMINIF_API_KEY || env?.GEMINI_API_KEY || env?.GOOGLE_GEMINI_API_KEY) || env?.AI?.run);
}

function safeVedicAIObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function logVedicAIConsultation(marker, details = {}) {
  const payload = {
    hasEnvAI: Boolean(details.hasEnvAI),
    providerName: clean(details.providerName),
    isMock: details.isMock === true,
    dryRun: details.dryRun === true,
    category: clean(details.category),
    questionLength: Number(details.questionLength || 0),
    hasBirthTime: details.hasBirthTime === true,
    hasBirthPlace: details.hasBirthPlace === true,
    timezoneResolved: details.timezoneResolved === true,
    chartCalculated: details.chartCalculated === true,
    dashaCalculated: details.dashaCalculated === true,
    hasLagna: details.hasLagna === true,
    hasNakshatra: details.hasNakshatra === true,
    llmLatencyMs: Number.isFinite(Number(details.llmLatencyMs)) ? Number(details.llmLatencyMs) : undefined,
    errorCode: clean(details.errorCode),
    authSource: clean(details.authSource),
    tokenVerified: details.tokenVerified === true,
  };
  try {
    console.info(`${VEDIC_AI_CONSULTATION_MARKER} ${marker}`, payload);
  } catch (_) {
    console.info(`${VEDIC_AI_CONSULTATION_MARKER} ${marker}`);
  }
}

function buildVedicAIError(code, message, status = 400, extra = {}) {
  return json({ ok: false, code, message, ...extra }, { status });
}

function readVedicAIRequestBirthSource(body = {}) {
  const raw = safeVedicAIObject(body?.birthInput);
  const timeUnknown = raw.birthTimeUnknown === true || raw.isTimeUnknown === true || body?.birthTimeUnknown === true || body?.isTimeUnknown === true;
  return {
    ...raw,
    isTimeUnknown: timeUnknown,
    birthTimeUnknown: timeUnknown,
  };
}

function buildVedicAIConsultationPreflightBirthInput(body = {}) {
  const birthSource = readVedicAIRequestBirthSource(body);
  const dateMatch = clean(birthSource.birthDate).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const timeMatch = clean(birthSource.birthTime).match(/^(\d{1,2}):(\d{2})$/);
  const timeUnknown = birthSource.birthTimeUnknown === true || birthSource.isTimeUnknown === true;
  return {
    ...birthSource,
    birthYear: dateMatch ? Number(dateMatch[1]) : Number(birthSource.birthYear),
    birthMonth: dateMatch ? Number(dateMatch[2]) : Number(birthSource.birthMonth),
    birthDay: dateMatch ? Number(dateMatch[3]) : Number(birthSource.birthDay),
    birthHour: timeUnknown ? null : (timeMatch ? Number(timeMatch[1]) : Number(birthSource.birthHour)),
    birthMinute: timeUnknown ? 0 : (timeMatch ? Number(timeMatch[2]) : Number(birthSource.birthMinute || 0)),
    isTimeUnknown: timeUnknown,
    birthTimeUnknown: timeUnknown,
  };
}

function normalizeVedicAIConsultationBirthInput(body = {}) {
  const birthSource = readVedicAIRequestBirthSource(body);
  const normalized = normalizeVedicPremiumBirthInput({
    ...body,
    birthInput: birthSource,
    isTimeUnknown: birthSource.isTimeUnknown === true,
    birthTimeUnknown: birthSource.birthTimeUnknown === true,
  });
  if (birthSource.birthTimeUnknown === true || birthSource.isTimeUnknown === true) {
    normalized.birthTime = "";
    normalized.birthHour = null;
    normalized.birthMinute = 0;
    normalized.isTimeUnknown = true;
  }
  return normalized;
}

function validateVedicAIConsultationInput(body = {}, birthInput = {}) {
  const question = clean(body?.question);
  const rawBirth = readVedicAIRequestBirthSource(body);
  const missing = [];
  if (!question || question.length < 5 || question.length > 1000) missing.push("question");
  if (!clean(rawBirth.birthDate || birthInput.birthDate)) missing.push("birthDate");
  const timezoneResolution = resolveVedicAITimezoneOffset(rawBirth.timezone, birthInput);
  if (!timezoneResolution.ok) missing.push("timezone");
  if (!clean(rawBirth.birthPlace || birthInput.birthPlace)) missing.push("birthPlace");
  if (!Number.isFinite(Number(rawBirth.latitude ?? birthInput.latitude))) missing.push("latitude");
  if (!Number.isFinite(Number(rawBirth.longitude ?? birthInput.longitude))) missing.push("longitude");
  const timeUnknown = rawBirth.birthTimeUnknown === true || rawBirth.isTimeUnknown === true || birthInput.isTimeUnknown === true;
  if (!timeUnknown && !Number.isFinite(Number(rawBirth.birthHour ?? birthInput.birthHour))) missing.push("birthTime");
  if (missing.length) {
    return {
      ok: false,
      missing,
      message: missing.includes("question")
      ? "질문은 5자 이상 1000자 이하로 입력해 주세요."
      : "베다점 AI 상담을 위해 생년월일, 출생시간 또는 모름 선택, 출생지, 유효한 시간대, 위도와 경도를 확인해 주세요.",
    };
  }
  return { ok: true, timezoneOffset: timezoneResolution.offset };
}

function parseVedicTimezoneOffsetToken(timezoneValue) {
  const raw = clean(timezoneValue);
  if (!raw) return null;
  const direct = Number(raw);
  if (Number.isFinite(direct) && direct >= -14 && direct <= 14) return direct;
  const token = raw.toLowerCase();
  if (token === "utc" || token === "etc/utc" || token === "gmt") return 0;
  if (token === "asia/seoul" || token === "asia/tokyo") return 9;
  const match = raw.match(/^(?:utc|gmt)\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/i);
  if (!match) return null;
  const sign = match[1] === "-" ? -1 : 1;
  const hour = Number(match[2]);
  const minute = Number(match[3] || 0);
  const offset = sign * (hour + (minute / 60));
  return offset >= -14 && offset <= 14 ? offset : null;
}

function resolveVedicAITimezoneOffset(timezoneValue, birthInput = {}) {
  const raw = clean(timezoneValue);
  const tokenOffset = parseVedicTimezoneOffsetToken(raw);
  if (Number.isFinite(tokenOffset)) return { ok: true, offset: tokenOffset };
  if (!raw) return { ok: false, offset: null };
  const year = Number(birthInput?.birthYear);
  const month = Number(birthInput?.birthMonth);
  const day = Number(birthInput?.birthDay);
  const hour = Number.isFinite(Number(birthInput?.birthHour)) ? Number(birthInput.birthHour) : 12;
  const minute = Number.isFinite(Number(birthInput?.birthMinute)) ? Number(birthInput.birthMinute) : 0;
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return { ok: false, offset: null };
  try {
    const referenceUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
    const offsetParts = new Intl.DateTimeFormat("en-US", {
      timeZone: raw,
      timeZoneName: "shortOffset",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(referenceUtc);
    const offsetName = clean(offsetParts.find((part) => part.type === "timeZoneName")?.value);
    const parsedOffset = parseVedicTimezoneOffsetToken(offsetName);
    if (Number.isFinite(parsedOffset)) return { ok: true, offset: parsedOffset };
    const parts = Object.fromEntries(offsetParts.map((part) => [part.type, part.value]));
    const localAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), 0);
    const offset = (localAsUtc - referenceUtc.getTime()) / 3600000;
    return Number.isFinite(offset) && offset >= -14 && offset <= 14
      ? { ok: true, offset }
      : { ok: false, offset: null };
  } catch (_) {
    return { ok: false, offset: null };
  }
}

function toVedicAIConsultationSwissInput(birthInput = {}, timezoneOffset = null) {
  const hasBirthTime = !birthInput?.isTimeUnknown && Number.isFinite(Number(birthInput?.birthHour));
  return {
    year: Number(birthInput?.birthYear),
    month: Number(birthInput?.birthMonth),
    day: Number(birthInput?.birthDay),
    hour: hasBirthTime ? Number(birthInput.birthHour) : 12,
    minute: hasBirthTime && Number.isFinite(Number(birthInput.birthMinute)) ? Number(birthInput.birthMinute) : 0,
    timezone: Number.isFinite(Number(timezoneOffset)) ? Number(timezoneOffset) : toVedicTimezoneOffset(birthInput?.timezone),
    lat: Number(birthInput?.latitude),
    lon: Number(birthInput?.longitude),
  };
}

function cloneJsonSafe(value) {
  try {
    return JSON.parse(JSON.stringify(value || {}));
  } catch (_) {
    return {};
  }
}

function maskVedicUnknownBirthTimeFacts(facts = {}, localChart = {}) {
  const safeFacts = cloneJsonSafe(facts);
  const safeChart = cloneJsonSafe(localChart);
  if (safeFacts.birthInfo) {
    safeFacts.birthInfo.birthTime = "";
    safeFacts.birthInfo.birthHour = null;
    safeFacts.birthInfo.birthTimeConfidence = "unknown";
  }
  if (safeFacts.calculationBasis) {
    safeFacts.calculationBasis.birthTimeConfidence = "unknown";
  }
  if (safeFacts.rashiChart) {
    safeFacts.rashiChart.ascendant = {
      note: "출생시간이 제공되지 않아 라그나와 하우스 해석은 확정하지 않습니다.",
    };
    safeFacts.rashiChart.housePlacements = [];
    safeFacts.rashiChart.grahaPositions = Array.isArray(safeFacts.rashiChart.grahaPositions)
      ? safeFacts.rashiChart.grahaPositions.map((planet) => {
        const next = { ...planet };
        delete next.house;
        return next;
      })
      : [];
  }
  safeFacts.houseThemes = [];
  safeFacts.avoidActions = [
    "출생시간이 없어 라그나와 하우스의 정확도는 제한됩니다. 달, 나크샤트라, 행성 사인 중심으로 상담합니다.",
    "다샤는 출생시간에 따라 경계가 달라질 수 있으므로 현재 계산값이 있더라도 정확도 제한을 함께 설명합니다.",
  ];
  if (safeFacts.currentDasha && typeof safeFacts.currentDasha === "object") {
    safeFacts.currentDasha.accuracyNote = "출생시간 미입력으로 현재 다샤 경계와 세부 시점은 제한적으로만 참고합니다.";
  }
  if (safeChart.chart) {
    safeChart.chart.lagnaSign = "";
    safeChart.chart.lagnaSignEn = "";
    safeChart.chart.houses = [];
    if (safeChart.chart.dashas && typeof safeChart.chart.dashas === "object") {
      safeChart.chart.dashas.accuracyNote = "출생시간 미입력으로 다샤 경계와 세부 시점은 제한적으로만 참고합니다.";
    }
    safeChart.chart.planets = Array.isArray(safeChart.chart.planets)
      ? safeChart.chart.planets.map((planet) => {
        const next = { ...planet };
        delete next.house;
        return next;
      })
      : [];
  }
  return { facts: safeFacts, localChart: safeChart };
}

function summarizeVedicAIChart(localChart = {}, facts = {}, birthInput = {}) {
  const chart = safeVedicAIObject(localChart?.chart);
  const nakshatra = safeVedicAIObject(chart?.nakshatra || facts?.nakshatra?.moonNakshatra);
  const dashas = safeVedicAIObject(chart?.dashas);
  const hasBirthTime = !birthInput?.isTimeUnknown && Number.isFinite(Number(birthInput?.birthHour));
  return {
    hasBirthTime,
    hasBirthPlace: Boolean(clean(birthInput?.birthPlace)),
    timezoneResolved: birthInput?._timezoneResolved === true,
    hasLagna: hasBirthTime && Boolean(clean(chart?.lagnaSign)),
    hasNakshatra: Boolean(clean(nakshatra?.name)),
    dashaCalculated: Boolean(clean(dashas?.currentMahaDasha) || (Array.isArray(dashas?.periods) && dashas.periods.length)),
    lagna: hasBirthTime ? clean(chart?.lagnaSign) || undefined : undefined,
    moonSign: clean(chart?.moonSign) || undefined,
    sunSign: clean(chart?.sunSign) || undefined,
    nakshatra: clean(nakshatra?.name) || undefined,
    currentMahadasha: clean(dashas?.currentMahaDasha || facts?.currentDasha?.mahadasha?.planet) || undefined,
    currentAntardasha: clean(dashas?.currentAntarDasha || facts?.currentDasha?.antardasha?.planet) || undefined,
  };
}

function compactJsonForPrompt(value, maxLength = 28000) {
  const text = JSON.stringify(value || {}, null, 2);
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n...truncated` : text;
}

function buildVedicAIConsultationSystemPrompt() {
  return [
    "너는 베다 점성술/Vedic Astrology를 깊이 이해한 상담가다.",
    "사용자의 라그나, 라시, 나크샤트라, 행성 배치, 하우스, 다샤, 고차라 데이터에 근거해서 답한다.",
    "차트 데이터는 반드시 제공된 계산 결과만 사용하고 임의로 지어내지 않는다.",
    "출생시간 또는 출생지가 부족하면 정확도 제한을 명확히 설명한다.",
    "사용자의 질문에 직접 답하되, 공포를 조장하거나 운명론적으로 단정하지 않는다.",
    "결과는 한국어로 작성한다.",
    "베다 점성술 용어는 사용하되 일반 사용자도 이해할 수 있게 풀어쓴다.",
    "사용자가 실제로 선택하고 행동할 수 있는 전략을 제안한다.",
    "건강, 법률, 재정 문제는 전문 상담을 대체한다고 말하지 않는다.",
  ].join("\n");
}

function buildVedicAIConsultationPrompt({ question, category, categoryLabel, birthInput, chartSummary, facts, localChart }) {
  return [
    "아래 계산 결과만 근거로 베다점 AI 상담 결과를 작성하라.",
    "라그나, 나크샤트라, 다샤, 행성 위치, 하우스, 요가, 도샤, 고차라를 새로 추정하지 말라.",
    "제공되지 않은 데이터는 제공되지 않았다고 말하고, 일반 조언으로 덮어쓰지 말라.",
    "출생시간을 모르는 경우 라그나와 하우스 해석을 확정하지 말라.",
    "",
    "[사용자 정보]",
    `이름: ${clean(birthInput?.name) || "사용자"}`,
    `성별: ${clean(birthInput?.gender) || "미입력"}`,
    `생년월일: ${clean(birthInput?.birthDate)}`,
    `출생시간: ${chartSummary.hasBirthTime ? clean(birthInput?.birthTime) : "모름"}`,
    `출생지: ${clean(birthInput?.birthPlace)}`,
    `시간대: ${clean(birthInput?.timezone)}`,
    `상담 카테고리: ${categoryLabel} (${category})`,
    `사용자 질문: ${question}`,
    "",
    "[계산 요약]",
    compactJsonForPrompt(chartSummary, 4000),
    "",
    "[베다 점성술 계산 데이터]",
    compactJsonForPrompt({ facts, localChart }, 32000),
    "",
    "아래 JSON 구조만 반환하라. markdown 코드블록은 쓰지 말라.",
    JSON.stringify({
      summary: "상담 요약",
      chartCore: "라그나, 문, 태양, 나크샤트라, 핵심 행성 근거",
      dashaFlow: "현재 다샤 흐름. 데이터가 없으면 제공되지 않았다고 말하기",
      topicAnswer: "선택한 상담 주제에 대한 직접 답변",
      timing: "기회와 주의할 시기. 근거가 부족하면 큰 흐름만 말하기",
      actionGuide: ["현실적인 행동 전략 1", "현실적인 행동 전략 2", "현실적인 행동 전략 3"],
      symbolicRitual: "종교 강요 없는 작은 정리 의식",
      closingMessage: "지금의 하늘이 건네는 한 문장",
      followUpQuestions: ["후속 질문 1", "후속 질문 2", "후속 질문 3"],
    }, null, 2),
  ].join("\n");
}

function extractVedicAIJsonText(text) {
  const raw = clean(text);
  if (!raw) return "";
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first >= 0 && last > first) return raw.slice(first, last + 1).trim();
  return "";
}

function toVedicAIList(value) {
  if (Array.isArray(value)) return value.map((item) => clean(item)).filter(Boolean).slice(0, 8);
  return clean(value)
    .split(/\n+|(?:^|\s)[-*]\s+/)
    .map((item) => clean(item.replace(/^\d+[.)]\s*/, "")))
    .filter(Boolean)
    .slice(0, 8);
}

function extractVedicAISection(rawText, title, nextTitles = []) {
  const raw = String(rawText || "");
  const start = raw.search(new RegExp(`${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"));
  if (start < 0) return "";
  let end = raw.length;
  nextTitles.forEach((nextTitle) => {
    const index = raw.slice(start + title.length).search(new RegExp(`${nextTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"));
    if (index >= 0) end = Math.min(end, start + title.length + index);
  });
  return clean(raw.slice(start, end).replace(new RegExp(`^\\s*\\d*[.)]?\\s*${title}\\s*[-—:：]?`, "i"), ""));
}

function normalizeVedicAIResult(aiText) {
  const rawText = clean(aiText);
  let parsed = null;
  const jsonText = extractVedicAIJsonText(rawText);
  if (jsonText) {
    try {
      parsed = JSON.parse(jsonText);
    } catch (_) {
      parsed = null;
    }
  }
  const source = safeVedicAIObject(parsed);
  const fallbackTitles = ["상담 요약", "나의 베다 차트 핵심", "현재 다샤 흐름", "질문 주제별 해석", "기회와 주의할 시기", "현실적인 행동 전략", "마음가짐과 상징적 리추얼", "마지막 조언", "후속 질문 추천"];
  const result = {
    summary: clean(source.summary) || extractVedicAISection(rawText, fallbackTitles[0], fallbackTitles.slice(1)),
    chartCore: clean(source.chartCore) || extractVedicAISection(rawText, fallbackTitles[1], fallbackTitles.slice(2)),
    dashaFlow: clean(source.dashaFlow) || extractVedicAISection(rawText, fallbackTitles[2], fallbackTitles.slice(3)),
    topicAnswer: clean(source.topicAnswer) || extractVedicAISection(rawText, fallbackTitles[3], fallbackTitles.slice(4)),
    timing: clean(source.timing) || extractVedicAISection(rawText, fallbackTitles[4], fallbackTitles.slice(5)),
    actionGuide: toVedicAIList(source.actionGuide || extractVedicAISection(rawText, fallbackTitles[5], fallbackTitles.slice(6))),
    symbolicRitual: clean(source.symbolicRitual) || extractVedicAISection(rawText, fallbackTitles[6], fallbackTitles.slice(7)),
    closingMessage: clean(source.closingMessage) || extractVedicAISection(rawText, fallbackTitles[7], fallbackTitles.slice(8)),
    followUpQuestions: toVedicAIList(source.followUpQuestions || extractVedicAISection(rawText, fallbackTitles[8], [])),
    rawText,
  };
  if (!result.summary && rawText) result.summary = rawText.slice(0, 700);
  if (!result.topicAnswer && rawText) result.topicAnswer = rawText;
  return result;
}

async function handleVedicAIConsultation(request, env) {
  const startedAt = Date.now();
  const body = await readJson(request);
  const authCheck = await resolveAIConsultationAuth(request, env, body, "vedicPremium");
  if (!authCheck.ok) {
    return buildVedicAIError(authCheck.code, authCheck.message, authCheck.status, {
      serviceType: VEDIC_AI_CONSULTATION_SERVICE_TYPE,
      authSource: authCheck.authSource || "",
      tokenVerified: false,
    });
  }
  const auth = authCheck.auth;
  const dryRun = isVedicAIConsultationDryRun(env);
  const hasEnvAI = hasVedicAIProviderEnv(env);
  const question = clean(body?.question);
  const rawCategory = clean(body?.category || "general").toLowerCase();
  const category = VEDIC_AI_CONSULTATION_CATEGORIES[rawCategory] ? rawCategory : "general";
  const categoryLabel = VEDIC_AI_CONSULTATION_CATEGORIES[category];
  const baseLog = {
    hasEnvAI,
    providerName: hasEnvAI ? "gemini-primary-workers-ai-fallback" : "",
    isMock: false,
    dryRun,
    category,
    questionLength: question.length,
  };
  logVedicAIConsultation("request received", baseLog);

  if (dryRun) {
    return buildVedicAIError("DRY_RUN_DISABLED", "베다점 AI 상담은 dry_run 상태에서 mock 결과를 반환하지 않습니다.", 409, {
      serviceType: VEDIC_AI_CONSULTATION_SERVICE_TYPE,
      dryRun: true,
      isMock: false,
    });
  }

  const preflightBirthInput = buildVedicAIConsultationPreflightBirthInput(body);
  const validation = validateVedicAIConsultationInput(body, preflightBirthInput);
  if (!validation.ok) {
    return buildVedicAIError("VEDIC_AI_INPUT_INVALID", validation.message, 422, {
      missing: validation.missing,
      serviceType: VEDIC_AI_CONSULTATION_SERVICE_TYPE,
    });
  }
  const preflightHasBirthTime = !preflightBirthInput.isTimeUnknown && Number.isFinite(Number(preflightBirthInput.birthHour));

  const featureKey = clean(body?.featureKey || VEDIC_PREMIUM_FEATURE_KEY) || VEDIC_PREMIUM_FEATURE_KEY;
  const premiumAccessToken = readPremiumAccessToken(request, body);
  const pdfDbEnv = withPdfFastDbEnv(env);
  const access = await requirePremiumReportAccess(pdfDbEnv, auth.userId, "vedicPremium", {
    ...body,
    reportType: "vedicPremium",
    featureKey,
    premiumAccessToken: premiumAccessToken || undefined,
    _accessRoute: "/api/vedic/ai-consultation",
  });
  if (!access?.ok) {
    const status = Number(access?.status || 402);
    return buildVedicAIError(access?.code || "PAYMENT_REQUIRED", status === 401 ? "로그인이 필요합니다." : "베다점 AI 상담 이용 권한이 필요합니다.", status, {
      serviceType: VEDIC_AI_CONSULTATION_SERVICE_TYPE,
      featureKey,
      amountCoins: 390,
      allowedPaymentModes: ["direct", "monthly", "membership_pass"],
    });
  }
  logVedicAIConsultation("payment verified", {
    ...baseLog,
    hasBirthTime: preflightHasBirthTime,
    hasBirthPlace: Boolean(clean(preflightBirthInput.birthPlace)),
    timezoneResolved: true,
    authSource: authCheck.authSource,
    tokenVerified: authCheck.tokenVerified === true,
  });

  const birthInput = normalizeVedicAIConsultationBirthInput(body);
  birthInput._timezoneResolved = true;
  birthInput._timezoneOffset = validation.timezoneOffset;
  const hasBirthTime = !birthInput.isTimeUnknown && Number.isFinite(Number(birthInput.birthHour));
  logVedicAIConsultation("birth profile normalized", {
    ...baseLog,
    hasBirthTime,
    hasBirthPlace: Boolean(clean(birthInput.birthPlace)),
    timezoneResolved: birthInput._timezoneResolved === true,
  });

  let localVedicChartJson = null;
  let facts = null;
  let chartSummary = null;
  try {
    const calculated = await getSwissVedicPlanets(env, toVedicAIConsultationSwissInput(birthInput, validation.timezoneOffset), { requestUrl: request.url });
    const chartSource = normalizeVedicChartSourceForPdf(calculated, {
      source: "swiss-wasm-local",
      engineQuality: "swiss",
    });
    const chartSourceQuality = validateVedicPremiumChartSourceQuality({
      chartSource,
      requireTrustedSource: true,
    });
    if (!chartSourceQuality.ok) {
      const error = new Error("베다 차트 계산 결과가 충분하지 않습니다. 출생 정보와 위치 정보를 다시 확인해 주세요.");
      error.code = "VEDIC_CHART_SOURCE_QUALITY_INVALID";
      error.status = 422;
      error.details = chartSourceQuality;
      throw error;
    }
    const chartBirthInput = hasBirthTime
      ? birthInput
      : { ...birthInput, birthTime: "12:00", birthHour: 12, birthMinute: 0, isTimeUnknown: false };
    localVedicChartJson = buildVedicLocalChartJson({
      ...body,
      birthInput: chartBirthInput,
      chart: chartSource,
    }, { strictPremium: false });
    if (!hasBirthTime) {
      localVedicChartJson.birthInput = { ...birthInput, birthTime: "", birthHour: null, birthMinute: 0, isTimeUnknown: true };
    }
    facts = buildVedicAstrologyFacts(localVedicChartJson, { ...body, birthInput });
    chartSummary = summarizeVedicAIChart(localVedicChartJson, facts, birthInput);
    logVedicAIConsultation("chart calculated", {
      ...baseLog,
      hasBirthTime,
      hasBirthPlace: true,
      timezoneResolved: true,
      chartCalculated: true,
      dashaCalculated: chartSummary.dashaCalculated,
      hasLagna: chartSummary.hasLagna,
      hasNakshatra: chartSummary.hasNakshatra,
    });
    logVedicAIConsultation("dasha calculated", {
      ...baseLog,
      hasBirthTime,
      hasBirthPlace: true,
      timezoneResolved: true,
      chartCalculated: true,
      dashaCalculated: chartSummary.dashaCalculated,
      hasLagna: chartSummary.hasLagna,
      hasNakshatra: chartSummary.hasNakshatra,
    });
  } catch (error) {
    logVedicAIConsultation("chart calculation error", {
      ...baseLog,
      hasBirthTime,
      hasBirthPlace: true,
      timezoneResolved: true,
      errorCode: clean(error?.code || "VEDIC_CHART_CALCULATION_FAILED"),
    });
    return buildVedicAIError(
      clean(error?.code || "VEDIC_CHART_CALCULATION_FAILED"),
      clean(error?.message || "베다 차트 계산 중 오류가 발생했습니다. 출생 정보와 위치 정보를 확인해 주세요."),
      Number(error?.status || 422),
      { serviceType: VEDIC_AI_CONSULTATION_SERVICE_TYPE },
    );
  }

  let promptFacts = facts;
  let promptChart = localVedicChartJson;
  if (!hasBirthTime) {
    const masked = maskVedicUnknownBirthTimeFacts(facts, localVedicChartJson);
    promptFacts = masked.facts;
    promptChart = masked.localChart;
  }
  const prompt = buildVedicAIConsultationPrompt({
    question,
    category,
    categoryLabel,
    birthInput,
    chartSummary,
    facts: promptFacts,
    localChart: promptChart,
  });
  logVedicAIConsultation("prompt built", {
    ...baseLog,
    hasBirthTime,
    hasBirthPlace: true,
    timezoneResolved: true,
    chartCalculated: true,
    dashaCalculated: chartSummary.dashaCalculated,
    hasLagna: chartSummary.hasLagna,
    hasNakshatra: chartSummary.hasNakshatra,
  });

  logVedicAIConsultation("LLM provider start", {
    ...baseLog,
    hasBirthTime,
    hasBirthPlace: true,
    timezoneResolved: true,
    chartCalculated: true,
    dashaCalculated: chartSummary.dashaCalculated,
    hasLagna: chartSummary.hasLagna,
    hasNakshatra: chartSummary.hasNakshatra,
  });
  const llmStart = Date.now();
  const ai = await callGeminiText(env, prompt, {
    systemPrompt: buildVedicAIConsultationSystemPrompt(),
    taskType: "fortune",
    temperature: 0.68,
    maxOutputTokens: 4096,
  });
  const llmLatencyMs = Date.now() - llmStart;
  if (!ai?.ok || !clean(ai?.text)) {
    logVedicAIConsultation("LLM provider error", {
      ...baseLog,
      providerName: clean(ai?.provider || "gemini-primary-workers-ai-fallback"),
      hasBirthTime,
      hasBirthPlace: true,
      timezoneResolved: true,
      chartCalculated: true,
      dashaCalculated: chartSummary.dashaCalculated,
      hasLagna: chartSummary.hasLagna,
      hasNakshatra: chartSummary.hasNakshatra,
      llmLatencyMs,
      errorCode: clean(ai?.error || "LLM_PROVIDER_FAILED"),
    });
    return buildVedicAIError("LLM_PROVIDER_FAILED", "베다점 AI 상담 생성 중 LLM 호출에 실패했습니다. 결제 권한은 보존되며 잠시 후 다시 시도할 수 있습니다.", 503, {
      serviceType: VEDIC_AI_CONSULTATION_SERVICE_TYPE,
      featureKey,
      retryable: true,
      paymentRetainedForRetry: true,
      provider: clean(ai?.provider),
      isMock: false,
      dryRun: false,
    });
  }
  const result = normalizeVedicAIResult(ai.text);
  if (clean(result.rawText).length < 240) {
    logVedicAIConsultation("LLM provider error", {
      ...baseLog,
      providerName: clean(ai?.provider),
      hasBirthTime,
      hasBirthPlace: true,
      timezoneResolved: true,
      chartCalculated: true,
      dashaCalculated: chartSummary.dashaCalculated,
      hasLagna: chartSummary.hasLagna,
      hasNakshatra: chartSummary.hasNakshatra,
      llmLatencyMs,
      errorCode: "LLM_RESULT_TOO_SHORT",
    });
    return buildVedicAIError("LLM_RESULT_TOO_SHORT", "베다점 AI 상담 결과가 충분히 생성되지 않았습니다. 잠시 후 다시 시도해 주세요.", 503, {
      serviceType: VEDIC_AI_CONSULTATION_SERVICE_TYPE,
      retryable: true,
      paymentRetainedForRetry: true,
    });
  }
  logVedicAIConsultation("LLM provider success", {
    ...baseLog,
    providerName: clean(ai?.provider),
    hasBirthTime,
    hasBirthPlace: true,
    timezoneResolved: true,
    chartCalculated: true,
    dashaCalculated: chartSummary.dashaCalculated,
    hasLagna: chartSummary.hasLagna,
    hasNakshatra: chartSummary.hasNakshatra,
    llmLatencyMs,
  });

  const consultationId = clean(body?.requestId) || `vedic-ai:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`;
  const responseBody = {
    ok: true,
    serviceType: VEDIC_AI_CONSULTATION_SERVICE_TYPE,
    featureKey,
    provider: clean(ai.provider || "unknown"),
    model: clean(ai.model) || undefined,
    isMock: false,
    dryRun: false,
    consultationId,
    category,
    chartSummary,
    result,
    billing: {
      reportType: "vedicPremium",
      amountCoins: 390,
      accessVerified: true,
    },
    elapsedMs: Date.now() - startedAt,
  };
  logVedicAIConsultation("response returned", {
    ...baseLog,
    providerName: responseBody.provider,
    hasBirthTime,
    hasBirthPlace: true,
    timezoneResolved: true,
    chartCalculated: true,
    dashaCalculated: chartSummary.dashaCalculated,
    hasLagna: chartSummary.hasLagna,
    hasNakshatra: chartSummary.hasNakshatra,
    llmLatencyMs,
  });
  return json(responseBody);
}

const ASTROLOGY_AI_CONSULTATION_SERVICE_TYPE = "astrology_ai_consultation";
const ASTROLOGY_AI_CONSULTATION_MARKER = "[Astrology AI Consultation]";
const ASTROLOGY_AI_CONSULTATION_CATEGORIES = Object.freeze({
  general: "종합 점성술 리딩",
  personality: "성격과 재능",
  career: "직업/커리어",
  money: "재물/사업",
  love: "연애/결혼",
  relationship: "인간관계",
  family: "가족/감정 패턴",
  health: "건강/멘탈",
  business: "이직/창업",
  yearly: "올해의 운세",
  transit: "현재 트랜짓 흐름",
  turning_point: "인생 전환점",
  choice: "지금의 선택",
});
const ASTROLOGY_AI_SIGN_NAMES_KO = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];
const ASTROLOGY_AI_TRANSIT_PLANETS = ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "NorthNode", "SouthNode"];

function isAstrologyAIConsultationDryRun(env = {}) {
  return /^(1|true|yes|on)$/i.test(clean(env?.ASTROLOGY_AI_CONSULTATION_DRY_RUN || env?.ASTRO_AI_CONSULTATION_DRY_RUN || env?.LLM_DRY_RUN || ""));
}

function hasAstrologyAIProviderEnv(env = {}) {
  return Boolean(clean(env?.GEMINIF_API_KEY || env?.GEMINI_API_KEY || env?.GOOGLE_GEMINI_API_KEY) || env?.AI?.run);
}

function logAstrologyAIConsultation(marker, details = {}) {
  const payload = {
    hasEnvAI: Boolean(details.hasEnvAI),
    providerName: clean(details.providerName),
    isMock: details.isMock === true,
    dryRun: details.dryRun === true,
    category: clean(details.category),
    questionLength: Number(details.questionLength || 0),
    hasBirthTime: details.hasBirthTime === true,
    hasBirthPlace: details.hasBirthPlace === true,
    timezoneResolved: details.timezoneResolved === true,
    natalChartCalculated: details.natalChartCalculated === true,
    transitCalculated: details.transitCalculated === true,
    hasAscendant: details.hasAscendant === true,
    hasHouseData: details.hasHouseData === true,
    hasMajorAspects: details.hasMajorAspects === true,
    llmLatencyMs: Number.isFinite(Number(details.llmLatencyMs)) ? Number(details.llmLatencyMs) : undefined,
    errorCode: clean(details.errorCode),
    authSource: clean(details.authSource),
    tokenVerified: details.tokenVerified === true,
  };
  try {
    console.info(`${ASTROLOGY_AI_CONSULTATION_MARKER} ${marker}`, payload);
  } catch (_) {
    console.info(`${ASTROLOGY_AI_CONSULTATION_MARKER} ${marker}`);
  }
}

function buildAstrologyAIError(code, message, status = 400, extra = {}) {
  return json({ ok: false, code, message, ...extra }, { status });
}

function normalizeAstrologyAIConsultationBirthInput(body = {}) {
  const source = getAstroBirthInputSource(body);
  const timeUnknown = source.birthTimeUnknown === true
    || source.isTimeUnknown === true
    || body?.birthTimeUnknown === true
    || body?.isTimeUnknown === true
    || body?.birthInput?.birthTimeUnknown === true
    || body?.birthInput?.isTimeUnknown === true;
  const normalized = normalizeAstroPremiumBirthInput({
    ...body,
    birthInput: {
      ...source,
      birthTime: timeUnknown ? "unknown" : source.birthTime,
      birthTimeUnknown: timeUnknown,
      isTimeUnknown: timeUnknown,
    },
  });
  if (timeUnknown || normalized.isTimeUnknown === true) {
    normalized.birthTime = "";
    normalized.birthHour = null;
    normalized.birthMinute = 0;
    normalized.isTimeUnknown = true;
  }
  return normalized;
}

function validateAstrologyAIConsultationInput(body = {}, birthInput = {}) {
  const question = clean(body?.question);
  const missing = [];
  if (!question || question.length < 5 || question.length > 1000) missing.push("question");
  if (!clean(birthInput?.birthDate)) missing.push("birthDate");
  if (!Number.isFinite(Number(birthInput?.birthYear)) || Number(birthInput.birthYear) < 1900 || Number(birthInput.birthYear) > 2100) missing.push("birthYear");
  if (!Number.isFinite(Number(birthInput?.birthMonth)) || Number(birthInput.birthMonth) < 1 || Number(birthInput.birthMonth) > 12) missing.push("birthMonth");
  if (!Number.isFinite(Number(birthInput?.birthDay)) || Number(birthInput.birthDay) < 1 || Number(birthInput.birthDay) > 31) missing.push("birthDay");
  if (!birthInput?.isTimeUnknown && !Number.isFinite(Number(birthInput?.birthHour))) missing.push("birthTime");
  if (!clean(birthInput?.birthPlace)) missing.push("birthPlace");
  if (!Number.isFinite(Number(birthInput?.latitude)) || Number(birthInput.latitude) < -90 || Number(birthInput.latitude) > 90) missing.push("latitude");
  if (!Number.isFinite(Number(birthInput?.longitude)) || Number(birthInput.longitude) < -180 || Number(birthInput.longitude) > 180) missing.push("longitude");
  if (!Number.isFinite(Number(birthInput?.timezoneOffsetHours))) missing.push("timezone");
  if (missing.length) {
    return {
      ok: false,
      missing,
      message: missing.includes("question")
        ? "질문은 5자 이상 1000자 이하로 입력해 주세요."
        : "점성술 AI 상담을 위해 생년월일, 출생시간 또는 모름 선택, 출생지, 유효한 시간대, 위도와 경도를 확인해 주세요.",
    };
  }
  return { ok: true };
}

function toAstrologyAIConsultationSwissInput(birthInput = {}) {
  const hasBirthTime = !birthInput?.isTimeUnknown && Number.isFinite(Number(birthInput?.birthHour));
  return {
    year: Number(birthInput?.birthYear),
    month: Number(birthInput?.birthMonth),
    day: Number(birthInput?.birthDay),
    hour: hasBirthTime ? Number(birthInput.birthHour) : 12,
    minute: hasBirthTime && Number.isFinite(Number(birthInput.birthMinute)) ? Number(birthInput.birthMinute) : 0,
    timezone: Number(birthInput?.timezoneOffsetHours),
    lat: Number(birthInput?.latitude),
    lon: Number(birthInput?.longitude),
  };
}

function toAstrologyAITransitSwissInput(birthInput = {}) {
  const offset = Number.isFinite(Number(birthInput?.timezoneOffsetHours)) ? Number(birthInput.timezoneOffsetHours) : 0;
  const localNow = new Date(Date.now() + offset * 3600000);
  return {
    year: localNow.getUTCFullYear(),
    month: localNow.getUTCMonth() + 1,
    day: localNow.getUTCDate(),
    hour: localNow.getUTCHours(),
    minute: localNow.getUTCMinutes(),
    timezone: offset,
    lat: Number(birthInput?.latitude),
    lon: Number(birthInput?.longitude),
  };
}

function astrologyAISignFromLongitude(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  const normalized = ((n % 360) + 360) % 360;
  return ASTROLOGY_AI_SIGN_NAMES_KO[Math.floor(normalized / 30)] || "";
}

function astrologyAISignFromNode(node) {
  if (!node) return "";
  if (typeof node === "string") return clean(node);
  if (typeof node === "number") return ASTROLOGY_AI_SIGN_NAMES_KO[((Math.trunc(node) % 12) + 12) % 12] || "";
  if (typeof node !== "object") return "";
  const nodeName = clean(node.name);
  const direct = clean(node.signKo || node.signName || node.value);
  if (direct) return direct;
  if (nodeName && ASTROLOGY_AI_SIGN_NAMES_KO.includes(nodeName)) return nodeName;
  if (typeof node.sign === "string") return clean(node.sign);
  if (typeof node.sign === "number") return ASTROLOGY_AI_SIGN_NAMES_KO[((Math.trunc(node.sign) % 12) + 12) % 12] || "";
  if (node.sign && typeof node.sign === "object") return astrologyAISignFromNode(node.sign);
  return astrologyAISignFromLongitude(node.longitude);
}

function normalizeAstrologyAIPlanetList(planets) {
  if (Array.isArray(planets)) return planets;
  if (!planets || typeof planets !== "object") return [];
  return Object.keys(planets).map((name) => ({ name, ...(planets[name] || {}) }));
}

function formatAstrologyAIPlanet(planet = {}) {
  return {
    name: clean(planet.name || planet.planet || planet.id),
    sign: astrologyAISignFromNode(planet) || clean(planet.sign),
    degree: Number.isFinite(Number(planet.degree ?? planet.deg)) ? Math.round(Number(planet.degree ?? planet.deg) * 100) / 100 : undefined,
    longitude: Number.isFinite(Number(planet.longitude)) ? Math.round(Number(planet.longitude) * 100) / 100 : undefined,
    house: Number.isFinite(Number(planet.house)) ? Number(planet.house) : undefined,
    retrograde: planet.retrograde === true || planet.retro === true,
  };
}

function formatAstrologyAIAspect(aspect = {}) {
  const planetA = clean(aspect.planetA || aspect.p1 || aspect.a);
  const planetB = clean(aspect.planetB || aspect.p2 || aspect.b);
  const type = clean(aspect.type || aspect.aspect);
  const orb = Number.isFinite(Number(aspect.orb)) ? Math.round(Number(aspect.orb) * 10) / 10 : undefined;
  return [planetA && planetB ? `${planetA}-${planetB}` : "", type, orb !== undefined ? `orb ${orb}` : ""].filter(Boolean).join(" ");
}

function summarizeAstrologyAITransit(transitChart = {}) {
  const rawPlanets = normalizeAstrologyAIPlanetList(transitChart?.planets);
  const planets = rawPlanets
    .map(formatAstrologyAIPlanet)
    .filter((planet) => planet.name && (ASTROLOGY_AI_TRANSIT_PLANETS.includes(planet.name) || /node/i.test(planet.name)))
    .slice(0, 8);
  const highlights = planets.map((planet) => [
    planet.name,
    planet.sign || astrologyAISignFromLongitude(planet.longitude),
    planet.retrograde ? "역행" : "",
  ].filter(Boolean).join(" ")).filter(Boolean);
  return {
    calculated: highlights.length > 0,
    source: clean(transitChart?.source || transitChart?.chartSource || "western-transit-swiss"),
    engineQuality: clean(transitChart?.engineQuality),
    highlights,
    planets,
    note: highlights.length
      ? "현재 행성 위치는 SWISS 계산 결과에서 제공된 값만 사용했습니다. 네이탈 행성과의 정밀 트랜짓 애스펙트가 제공되지 않은 경우 구체 각도는 단정하지 않습니다."
      : "현재 트랜짓 데이터가 제공되지 않았다.",
  };
}

function maskAstrologyAIUnknownBirthTimeContext(localChart = {}) {
  const safe = cloneJsonSafe(localChart);
  if (safe.birthInput) {
    safe.birthInput.birthTime = "";
    safe.birthInput.birthHour = null;
    safe.birthInput.birthMinute = 0;
    safe.birthInput.isTimeUnknown = true;
  }
  if (safe.chart) {
    safe.chart.ascendantSign = "";
    safe.chart.midheavenSign = "";
    safe.chart.descendantSign = "";
    safe.chart.icSign = "";
    safe.chart.chartRuler = { note: "출생시간이 없어 차트 룰러를 확정하지 않습니다." };
    safe.chart.angles = {};
    safe.chart.houses = [];
    safe.chart.planets = Array.isArray(safe.chart.planets)
      ? safe.chart.planets.map((planet) => {
        const next = { ...planet };
        delete next.house;
        return next;
      })
      : [];
  }
  return safe;
}

function summarizeAstrologyAIChart(localChart = {}, birthInput = {}, transit = null) {
  const hasBirthTime = !birthInput?.isTimeUnknown && Number.isFinite(Number(birthInput?.birthHour));
  const chart = asPlainObject(localChart?.chart);
  const planets = normalizeAstrologyAIPlanetList(chart.planets).map(formatAstrologyAIPlanet).filter((planet) => planet.name).slice(0, 16);
  const houses = hasBirthTime && Array.isArray(chart.houses)
    ? chart.houses.map((house) => ({
      house: Number(house.house),
      sign: clean(house.sign),
      cuspDegree: Number.isFinite(Number(house.cuspDegree)) ? Number(house.cuspDegree) : undefined,
    })).filter((house) => Number.isFinite(house.house)).slice(0, 12)
    : [];
  const majorAspects = Array.isArray(chart.aspects) ? chart.aspects.map(formatAstrologyAIAspect).filter(Boolean).slice(0, 20) : [];
  return {
    birthInfo: {
      name: clean(birthInput.name) || "사용자",
      gender: clean(birthInput.gender) || "unknown",
      birthDate: clean(birthInput.birthDate),
      birthTime: hasBirthTime ? clean(birthInput.birthTime) : "모름",
      birthTimeKnown: hasBirthTime,
      birthPlace: clean(birthInput.birthPlace),
      timezone: clean(birthInput.timezone) || String(birthInput.timezoneOffsetHours),
      timezoneOffsetHours: Number(birthInput.timezoneOffsetHours),
      accuracyNote: hasBirthTime ? "" : "출생시간이 제공되지 않아 상승궁, MC, 하우스, 차트 룰러 해석은 확정하지 않습니다.",
    },
    coreSigns: {
      sunSign: clean(chart.sunSign),
      moonSign: clean(chart.moonSign),
      ascendant: hasBirthTime ? clean(chart.ascendantSign) : undefined,
      midheaven: hasBirthTime ? clean(chart.midheavenSign) : undefined,
      chartRuler: hasBirthTime ? chart.chartRuler : undefined,
    },
    planets,
    houses,
    nodes: chart.nodes || {},
    majorAspects,
    elementBalance: chart.elementBalance || {},
    modalityBalance: chart.modalityBalance || {},
    interpretationSeeds: localChart?.interpretationSeeds || {},
    insights: localChart?.insights || [],
    transit: transit || {
      calculated: false,
      highlights: [],
      note: "현재 트랜짓 데이터가 제공되지 않았다.",
    },
    calculationQuality: {
      calculationMode: clean(localChart.calculationMode),
      chartSource: clean(localChart.chartSource || localChart.calculationSource),
      engineQuality: clean(localChart.engineQuality),
      houseSystem: clean(localChart.houseSystem),
      fallbackUsed: localChart.fallbackUsed === true,
    },
  };
}

function buildAstrologyAIConsultationSystemPrompt() {
  return [
    "너는 서양 점성술/Western Astrology를 깊이 이해한 상담가다.",
    "사용자의 네이탈 차트, 태양, 달, 상승궁, 하우스, 행성 배치, 애스펙트, 트랜짓 데이터에 근거해서 답한다.",
    "차트 데이터는 반드시 제공된 계산 결과만 사용하고 임의로 지어내지 않는다.",
    "출생시간 또는 출생지가 부족하면 상승궁, 하우스, MC 해석의 정확도 제한을 명확히 설명한다.",
    "사용자의 질문에 직접 답하되, 공포를 조장하거나 운명론적으로 단정하지 않는다.",
    "결과는 한국어로 작성한다.",
    "점성술 용어는 사용하되 일반 사용자도 이해할 수 있게 풀어쓴다.",
    "사용자가 실제로 선택하고 행동할 수 있는 전략을 제안한다.",
    "건강, 법률, 재정 문제를 점성술만으로 확정 진단하지 않는다.",
  ].join("\n");
}

function buildAstrologyAIConsultationPrompt({ question, category, categoryLabel, birthInput, chartContext }) {
  return [
    "아래 계산 결과만 근거로 점성술 AI 상담 결과를 작성하라.",
    "상승궁, MC, 하우스, 행성 위치, 애스펙트, 트랜짓을 새로 추정하지 말라.",
    "제공되지 않은 데이터는 제공되지 않았다고 말하고, 일반 별자리 운세로 덮어쓰지 말라.",
    "출생시간을 모르는 경우 상승궁, MC, 하우스, 차트 룰러를 확정하지 말라.",
    "",
    "[사용자 정보]",
    `이름: ${clean(birthInput?.name) || "사용자"}`,
    `성별: ${clean(birthInput?.gender) || "미입력"}`,
    `생년월일: ${clean(birthInput?.birthDate)}`,
    `출생시간: ${birthInput?.isTimeUnknown ? "모름" : clean(birthInput?.birthTime)}`,
    `출생지: ${clean(birthInput?.birthPlace)}`,
    `시간대: ${clean(birthInput?.timezone) || birthInput?.timezoneOffsetHours}`,
    `상담 카테고리: ${categoryLabel} (${category})`,
    `사용자 질문: ${question}`,
    "",
    "[점성술 계산 데이터]",
    compactJsonForPrompt(chartContext, 36000),
    "",
    "아래 JSON 구조만 반환하라. markdown 코드블록은 쓰지 말라.",
    JSON.stringify({
      summary: "상담 요약 — 지금 질문의 핵심 답변",
      chartCore: {
        sunSign: "태양 사인",
        moonSign: "달 사인",
        ascendant: "상승궁. 출생시간 미상이면 빈 문자열",
        midheaven: "MC. 출생시간 미상이면 빈 문자열",
        coreInterpretation: "태양, 달, 상승궁/제한 사항 중심 해석",
      },
      chartPatterns: {
        dominantElements: ["강한 원소"],
        dominantModes: ["강한 모드"],
        majorAspects: ["주요 애스펙트"],
        interpretation: "하우스, 애스펙트, 원소 균형의 상담 해석",
      },
      transitFlow: {
        highlights: ["현재 흐름"],
        interpretation: "현재 트랜짓 데이터가 없으면 제공되지 않았다고 반영",
      },
      topicAnswer: "선택한 상담 주제에 대한 상세 답변",
      timing: {
        opportunities: ["기회 흐름"],
        cautions: ["주의 흐름"],
        note: "구체 날짜 근거가 없으면 큰 흐름만 설명",
      },
      actionGuide: ["현실적인 행동 전략 1", "현실적인 행동 전략 2", "현실적인 행동 전략 3"],
      closingMessage: "지금의 별이 건네는 한 문장",
      followUpQuestions: ["후속 질문 1", "후속 질문 2", "후속 질문 3"],
    }, null, 2),
  ].join("\n");
}

function extractAstrologyAIJsonText(text) {
  const raw = clean(text);
  if (!raw) return "";
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first >= 0 && last > first) return raw.slice(first, last + 1).trim();
  return "";
}

function toAstrologyAIText(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean).join("\n");
  if (value && typeof value === "object") return "";
  return clean(value);
}

function toAstrologyAIList(value) {
  if (Array.isArray(value)) return value.map((item) => clean(item)).filter(Boolean).slice(0, 8);
  return clean(value)
    .split(/\n+|(?:^|\s)[-*]\s+/)
    .map((item) => clean(item.replace(/^\d+[.)]\s*/, "")))
    .filter(Boolean)
    .slice(0, 8);
}

function extractAstrologyAISection(rawText, title, nextTitles = []) {
  const raw = String(rawText || "");
  const start = raw.search(new RegExp(`${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"));
  if (start < 0) return "";
  let end = raw.length;
  nextTitles.forEach((nextTitle) => {
    const index = raw.slice(start + title.length).search(new RegExp(`${nextTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"));
    if (index >= 0) end = Math.min(end, start + title.length + index);
  });
  return clean(raw.slice(start, end).replace(new RegExp(`^\\s*\\d*[.)]?\\s*${title}\\s*[-—:：]?`, "i"), ""));
}

function normalizeAstrologyAIResult(aiText, chartSummary = {}) {
  const rawText = clean(aiText);
  let parsed = null;
  const jsonText = extractAstrologyAIJsonText(rawText);
  if (jsonText) {
    try {
      parsed = JSON.parse(jsonText);
    } catch (_) {
      parsed = null;
    }
  }
  const source = asPlainObject(parsed);
  const chartCore = asPlainObject(source.chartCore);
  const chartPatterns = asPlainObject(source.chartPatterns);
  const transitFlow = asPlainObject(source.transitFlow);
  const timing = asPlainObject(source.timing);
  const fallbackTitles = ["상담 요약", "나의 별 지도 핵심", "차트의 강한 패턴", "현재 트랜짓 흐름", "질문 주제별 해석", "기회와 주의할 시기", "현실적인 행동 전략", "마지막 조언", "후속 질문 추천"];
  const result = {
    summary: toAstrologyAIText(source.summary) || extractAstrologyAISection(rawText, fallbackTitles[0], fallbackTitles.slice(1)),
    chartCore: {
      sunSign: clean(chartCore.sunSign) || clean(chartSummary?.coreSigns?.sunSign) || undefined,
      moonSign: clean(chartCore.moonSign) || clean(chartSummary?.coreSigns?.moonSign) || undefined,
      ascendant: clean(chartCore.ascendant) || clean(chartSummary?.coreSigns?.ascendant) || undefined,
      midheaven: clean(chartCore.midheaven) || clean(chartSummary?.coreSigns?.midheaven) || undefined,
      coreInterpretation: toAstrologyAIText(chartCore.coreInterpretation) || toAstrologyAIText(source.chartCore) || extractAstrologyAISection(rawText, fallbackTitles[1], fallbackTitles.slice(2)),
    },
    chartPatterns: {
      dominantElements: toAstrologyAIList(chartPatterns.dominantElements),
      dominantModes: toAstrologyAIList(chartPatterns.dominantModes),
      majorAspects: toAstrologyAIList(chartPatterns.majorAspects),
      interpretation: toAstrologyAIText(chartPatterns.interpretation) || extractAstrologyAISection(rawText, fallbackTitles[2], fallbackTitles.slice(3)),
    },
    transitFlow: {
      highlights: toAstrologyAIList(transitFlow.highlights),
      interpretation: toAstrologyAIText(transitFlow.interpretation) || extractAstrologyAISection(rawText, fallbackTitles[3], fallbackTitles.slice(4)),
    },
    topicAnswer: toAstrologyAIText(source.topicAnswer) || extractAstrologyAISection(rawText, fallbackTitles[4], fallbackTitles.slice(5)),
    timing: {
      opportunities: toAstrologyAIList(timing.opportunities),
      cautions: toAstrologyAIList(timing.cautions),
      note: toAstrologyAIText(timing.note) || extractAstrologyAISection(rawText, fallbackTitles[5], fallbackTitles.slice(6)),
    },
    actionGuide: toAstrologyAIList(source.actionGuide || extractAstrologyAISection(rawText, fallbackTitles[6], fallbackTitles.slice(7))),
    closingMessage: toAstrologyAIText(source.closingMessage) || extractAstrologyAISection(rawText, fallbackTitles[7], fallbackTitles.slice(8)),
    followUpQuestions: toAstrologyAIList(source.followUpQuestions || extractAstrologyAISection(rawText, fallbackTitles[8], [])),
    rawText,
  };
  if (!result.summary && rawText) result.summary = rawText.slice(0, 700);
  if (!result.topicAnswer && rawText) result.topicAnswer = rawText;
  return result;
}

async function handleAstrologyAIConsultation(request, env) {
  const startedAt = Date.now();
  const body = await readJson(request);
  const authCheck = await resolveAIConsultationAuth(request, env, body, "westernAstrologyPremium");
  if (!authCheck.ok) {
    return buildAstrologyAIError(authCheck.code, authCheck.message, authCheck.status, {
      serviceType: ASTROLOGY_AI_CONSULTATION_SERVICE_TYPE,
      authSource: authCheck.authSource || "",
      tokenVerified: false,
    });
  }
  const auth = authCheck.auth;
  const dryRun = isAstrologyAIConsultationDryRun(env);
  const hasEnvAI = hasAstrologyAIProviderEnv(env);
  const question = clean(body?.question);
  const rawCategory = clean(body?.category || "general").toLowerCase();
  const category = ASTROLOGY_AI_CONSULTATION_CATEGORIES[rawCategory] ? rawCategory : "general";
  const categoryLabel = ASTROLOGY_AI_CONSULTATION_CATEGORIES[category];
  const baseLog = {
    hasEnvAI,
    providerName: hasEnvAI ? "gemini-primary-workers-ai-fallback" : "",
    isMock: false,
    dryRun,
    category,
    questionLength: question.length,
  };
  logAstrologyAIConsultation("request received", baseLog);

  if (dryRun) {
    return buildAstrologyAIError("DRY_RUN_DISABLED", "점성술 AI 상담은 dry_run 상태에서 mock 결과를 반환하지 않습니다.", 409, {
      serviceType: ASTROLOGY_AI_CONSULTATION_SERVICE_TYPE,
      dryRun: true,
      isMock: false,
    });
  }

  const birthInput = normalizeAstrologyAIConsultationBirthInput(body);
  const validation = validateAstrologyAIConsultationInput(body, birthInput);
  const hasBirthTime = !birthInput.isTimeUnknown && Number.isFinite(Number(birthInput.birthHour));
  if (!validation.ok) {
    return buildAstrologyAIError("ASTROLOGY_AI_INPUT_INVALID", validation.message, 422, {
      missing: validation.missing,
      serviceType: ASTROLOGY_AI_CONSULTATION_SERVICE_TYPE,
    });
  }
  logAstrologyAIConsultation("birth profile normalized", {
    ...baseLog,
    hasBirthTime,
    hasBirthPlace: Boolean(clean(birthInput.birthPlace)),
    timezoneResolved: Number.isFinite(Number(birthInput.timezoneOffsetHours)),
  });

  const featureKey = clean(body?.featureKey || ASTRO_PREMIUM_FEATURE_KEY) || ASTRO_PREMIUM_FEATURE_KEY;
  const premiumAccessToken = readPremiumAccessToken(request, body);
  const pdfDbEnv = withPdfFastDbEnv(env);
  const access = await requirePremiumReportAccess(pdfDbEnv, auth.userId, "westernAstrologyPremium", {
    ...body,
    reportType: "westernAstrologyPremium",
    featureKey,
    premiumAccessToken: premiumAccessToken || undefined,
    _accessRoute: "/api/astro/ai-consultation",
  });
  if (!access?.ok) {
    const status = Number(access?.status || 402);
    return buildAstrologyAIError(access?.code || "PAYMENT_REQUIRED", status === 401 ? "로그인이 필요합니다." : "점성술 AI 상담 이용 권한이 필요합니다.", status, {
      serviceType: ASTROLOGY_AI_CONSULTATION_SERVICE_TYPE,
      featureKey,
      amountCoins: 390,
      allowedPaymentModes: ["direct", "monthly", "membership_pass"],
    });
  }
  logAstrologyAIConsultation("payment verified", {
    ...baseLog,
    hasBirthTime,
    hasBirthPlace: true,
    timezoneResolved: true,
    authSource: authCheck.authSource,
    tokenVerified: authCheck.tokenVerified === true,
  });

  let localAstroChartJson = null;
  let chartContext = null;
  let transitSummary = null;
  try {
    const chartBirthInput = hasBirthTime
      ? birthInput
      : { ...birthInput, birthTime: "12:00", birthHour: 12, birthMinute: 0, isTimeUnknown: false };
    const swissChart = await getSwissWesternChart(env, toAstrologyAIConsultationSwissInput(chartBirthInput), {
      requestUrl: request.url,
      strictSwiss: true,
      allowFallback: false,
      premium: true,
    });
    localAstroChartJson = buildAstroLocalChartJson(chartBirthInput, swissChart, null, { strictPremium: false });
    if (!hasBirthTime) {
      localAstroChartJson.birthInput = { ...birthInput, birthTime: "", birthHour: null, birthMinute: 0, isTimeUnknown: true };
      localAstroChartJson = maskAstrologyAIUnknownBirthTimeContext(localAstroChartJson);
    }
    logAstrologyAIConsultation("natal chart calculated", {
      ...baseLog,
      hasBirthTime,
      hasBirthPlace: true,
      timezoneResolved: true,
      natalChartCalculated: true,
      hasAscendant: hasBirthTime && Boolean(clean(localAstroChartJson?.chart?.ascendantSign)),
      hasHouseData: hasBirthTime && Array.isArray(localAstroChartJson?.chart?.houses) && localAstroChartJson.chart.houses.length >= 12,
      hasMajorAspects: Array.isArray(localAstroChartJson?.chart?.aspects) && localAstroChartJson.chart.aspects.length > 0,
    });
  } catch (error) {
    logAstrologyAIConsultation("natal chart error", {
      ...baseLog,
      hasBirthTime,
      hasBirthPlace: true,
      timezoneResolved: true,
      errorCode: clean(error?.code || "ASTROLOGY_AI_NATAL_CHART_FAILED"),
    });
    return buildAstrologyAIError(
      clean(error?.code || "ASTROLOGY_AI_NATAL_CHART_FAILED"),
      clean(error?.message || "점성술 차트 계산 중 오류가 발생했습니다. 출생 정보와 위치 정보를 확인해 주세요."),
      Number(error?.status || 422),
      { serviceType: ASTROLOGY_AI_CONSULTATION_SERVICE_TYPE },
    );
  }

  try {
    const transitChart = await getSwissWesternChart(env, toAstrologyAITransitSwissInput(birthInput), {
      requestUrl: request.url,
      strictSwiss: true,
      allowFallback: false,
      premium: true,
    });
    transitSummary = summarizeAstrologyAITransit(transitChart);
  } catch (error) {
    transitSummary = {
      calculated: false,
      highlights: [],
      note: "현재 트랜짓 데이터가 제공되지 않았다.",
      errorCode: clean(error?.code || "ASTROLOGY_AI_TRANSIT_UNAVAILABLE") || "ASTROLOGY_AI_TRANSIT_UNAVAILABLE",
    };
  }
  chartContext = summarizeAstrologyAIChart(localAstroChartJson, birthInput, transitSummary);
  logAstrologyAIConsultation("transit calculated", {
    ...baseLog,
    hasBirthTime,
    hasBirthPlace: true,
    timezoneResolved: true,
    natalChartCalculated: true,
    transitCalculated: transitSummary?.calculated === true,
    hasAscendant: hasBirthTime && Boolean(clean(chartContext?.coreSigns?.ascendant)),
    hasHouseData: hasBirthTime && Array.isArray(chartContext?.houses) && chartContext.houses.length >= 12,
    hasMajorAspects: Array.isArray(chartContext?.majorAspects) && chartContext.majorAspects.length > 0,
    errorCode: transitSummary?.calculated ? "" : clean(transitSummary?.errorCode),
  });

  const prompt = buildAstrologyAIConsultationPrompt({
    question,
    category,
    categoryLabel,
    birthInput,
    chartContext,
  });
  logAstrologyAIConsultation("prompt built", {
    ...baseLog,
    hasBirthTime,
    hasBirthPlace: true,
    timezoneResolved: true,
    natalChartCalculated: true,
    transitCalculated: transitSummary?.calculated === true,
    hasAscendant: hasBirthTime && Boolean(clean(chartContext?.coreSigns?.ascendant)),
    hasHouseData: hasBirthTime && Array.isArray(chartContext?.houses) && chartContext.houses.length >= 12,
    hasMajorAspects: Array.isArray(chartContext?.majorAspects) && chartContext.majorAspects.length > 0,
  });

  logAstrologyAIConsultation("LLM provider start", {
    ...baseLog,
    hasBirthTime,
    hasBirthPlace: true,
    timezoneResolved: true,
    natalChartCalculated: true,
    transitCalculated: transitSummary?.calculated === true,
    hasAscendant: hasBirthTime && Boolean(clean(chartContext?.coreSigns?.ascendant)),
    hasHouseData: hasBirthTime && Array.isArray(chartContext?.houses) && chartContext.houses.length >= 12,
    hasMajorAspects: Array.isArray(chartContext?.majorAspects) && chartContext.majorAspects.length > 0,
  });
  const llmStart = Date.now();
  const ai = await callGeminiText(env, prompt, {
    systemPrompt: buildAstrologyAIConsultationSystemPrompt(),
    taskType: "fortune",
    temperature: 0.68,
    maxOutputTokens: 4096,
  });
  const llmLatencyMs = Date.now() - llmStart;
  if (!ai?.ok || !clean(ai?.text)) {
    logAstrologyAIConsultation("LLM provider error", {
      ...baseLog,
      providerName: clean(ai?.provider || "gemini-primary-workers-ai-fallback"),
      hasBirthTime,
      hasBirthPlace: true,
      timezoneResolved: true,
      natalChartCalculated: true,
      transitCalculated: transitSummary?.calculated === true,
      hasAscendant: hasBirthTime && Boolean(clean(chartContext?.coreSigns?.ascendant)),
      hasHouseData: hasBirthTime && Array.isArray(chartContext?.houses) && chartContext.houses.length >= 12,
      hasMajorAspects: Array.isArray(chartContext?.majorAspects) && chartContext.majorAspects.length > 0,
      llmLatencyMs,
      errorCode: clean(ai?.error || "LLM_PROVIDER_FAILED"),
    });
    return buildAstrologyAIError("LLM_PROVIDER_FAILED", "점성술 AI 상담 생성 중 LLM 호출에 실패했습니다. 결제 권한은 보존되며 잠시 후 다시 시도할 수 있습니다.", 503, {
      serviceType: ASTROLOGY_AI_CONSULTATION_SERVICE_TYPE,
      featureKey,
      retryable: true,
      paymentRetainedForRetry: true,
      provider: clean(ai?.provider),
      isMock: false,
      dryRun: false,
    });
  }
  const result = normalizeAstrologyAIResult(ai.text, chartContext);
  if (clean(result.rawText).length < 240) {
    logAstrologyAIConsultation("LLM provider error", {
      ...baseLog,
      providerName: clean(ai?.provider),
      hasBirthTime,
      hasBirthPlace: true,
      timezoneResolved: true,
      natalChartCalculated: true,
      transitCalculated: transitSummary?.calculated === true,
      hasAscendant: hasBirthTime && Boolean(clean(chartContext?.coreSigns?.ascendant)),
      hasHouseData: hasBirthTime && Array.isArray(chartContext?.houses) && chartContext.houses.length >= 12,
      hasMajorAspects: Array.isArray(chartContext?.majorAspects) && chartContext.majorAspects.length > 0,
      llmLatencyMs,
      errorCode: "LLM_RESULT_TOO_SHORT",
    });
    return buildAstrologyAIError("LLM_RESULT_TOO_SHORT", "점성술 AI 상담 결과가 충분히 생성되지 않았습니다. 잠시 후 다시 시도해 주세요.", 503, {
      serviceType: ASTROLOGY_AI_CONSULTATION_SERVICE_TYPE,
      retryable: true,
      paymentRetainedForRetry: true,
    });
  }
  logAstrologyAIConsultation("LLM provider success", {
    ...baseLog,
    providerName: clean(ai?.provider),
    hasBirthTime,
    hasBirthPlace: true,
    timezoneResolved: true,
    natalChartCalculated: true,
    transitCalculated: transitSummary?.calculated === true,
    hasAscendant: hasBirthTime && Boolean(clean(chartContext?.coreSigns?.ascendant)),
    hasHouseData: hasBirthTime && Array.isArray(chartContext?.houses) && chartContext.houses.length >= 12,
    hasMajorAspects: Array.isArray(chartContext?.majorAspects) && chartContext.majorAspects.length > 0,
    llmLatencyMs,
  });

  const consultationId = clean(body?.requestId) || `astrology-ai:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`;
  const responseBody = {
    ok: true,
    serviceType: ASTROLOGY_AI_CONSULTATION_SERVICE_TYPE,
    featureKey,
    provider: clean(ai.provider || "unknown"),
    model: clean(ai.model) || undefined,
    isMock: false,
    dryRun: false,
    consultationId,
    category,
    chartSummary: chartContext,
    result,
    billing: {
      reportType: "westernAstrologyPremium",
      amountCoins: 390,
      accessVerified: true,
    },
    elapsedMs: Date.now() - startedAt,
  };
  logAstrologyAIConsultation("response returned", {
    ...baseLog,
    providerName: responseBody.provider,
    hasBirthTime,
    hasBirthPlace: true,
    timezoneResolved: true,
    natalChartCalculated: true,
    transitCalculated: transitSummary?.calculated === true,
    hasAscendant: hasBirthTime && Boolean(clean(chartContext?.coreSigns?.ascendant)),
    hasHouseData: hasBirthTime && Array.isArray(chartContext?.houses) && chartContext.houses.length >= 12,
    hasMajorAspects: Array.isArray(chartContext?.majorAspects) && chartContext.majorAspects.length > 0,
    llmLatencyMs,
  });
  return json(responseBody);
}

async function handleAstroPremiumPrepare(request, env) {
  let auth = null;
  let body = {};
  let sessionId = "";
  let reportId = "";
  let birthInputSource = {};
  const pdfDbEnv = withPdfFastDbEnv(env);
  try {
    auth = await requireAuth(request, env);
    body = await readJson(request);
    if (shouldBlockAstrologyRealLlm(env)) {
      return json({
        ok: false,
        code: "ASTROLOGY_PDF_MOCK_CONTRACT_REQUIRED",
        message: "개발 mock 설정에서는 /api/astro/premium/verify-access → create-job → generate-mock 계약만 사용할 수 있습니다.",
        endpoints: {
          verifyAccess: "/api/astro/premium/verify-access",
          createJob: "/api/astro/premium/create-job",
          generateMock: "/api/astro/premium/generate-mock",
          status: "/api/astro/premium/status?jobId=...",
          result: "/api/astro/premium/result?jobId=...",
        },
      }, { status: 409 });
    }
    sessionId = getAstroSessionId({
      ...body,
      sessionId: clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId),
      reportSessionId: clean(body?.reportSessionId || body?.accessGrant?.reportSessionId || body?.accessGrant?.sessionId),
    });
    reportId = clean(body?.reportId || body?.accessGrant?.reportId || `astro-premium-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
    const premiumAccessToken = readPremiumAccessToken(request, body);
    const featureKey = clean(body?.featureKey || ASTRO_PREMIUM_FEATURE_KEY) || ASTRO_PREMIUM_FEATURE_KEY;
    birthInputSource = getAstroBirthInputSource(body);
    const birthInput = normalizeAstroPremiumBirthInput(birthInputSource);

    compactAstroPremiumLocks();
    const existingLock = astroPremiumGenerationLocks.get(sessionId);
    if (existingLock?.status === "running") {
      return json({
        ok: true,
        deduped: true,
        status: "generating",
        sessionId,
        startedAt: existingLock.startedAt,
        progress: buildAstroStatusPayload(existingLock).data.progress,
      }, { status: 202 });
    }
    if (existingLock?.status === "done" && existingLock?.result) {
      return json({
        ...existingLock.result,
        deduped: true,
        serverStatus: "completed",
        sessionId,
        progress: buildAstroStatusPayload(existingLock).data.progress,
      });
    }

    astroPremiumGenerationLocks.set(sessionId, {
      sessionId,
      reportId,
      userId: auth.userId,
      status: "running",
      startedAt: new Date().toISOString(),
      startedAtMs: Date.now(),
      stage: "request-received",
      progress: {
        stateKey: "payment_verification",
        progress: 0,
        progressPercent: 0,
        currentChapterNo: 0,
        totalChapters: ASTRO_PREMIUM_CHAPTERS.length,
        currentChapterTitle: "결제 및 세션 확인",
        updatedAt: new Date().toISOString(),
      },
    });

    console.info("[AstroPremiumPDF][RequestReceived]", {
      userId: auth.userId,
      featureKey,
      sessionId,
      ...toSafeBirthLog(birthInput, ASTRO_PREMIUM_CHAPTERS.length),
    });
    logAstrologyPdfEvent("ASTROLOGY_PDF_REQUEST_RECEIVED", {
      jobId: reportId,
      userId: auth.userId,
      status: "received",
    });

    const access = await requirePremiumReportAccess(pdfDbEnv, auth.userId, "westernAstrologyPremium", {
      ...body,
      reportType: "westernAstrologyPremium",
      featureKey,
      premiumAccessToken: premiumAccessToken || undefined,
      _accessRoute: "/api/astro/premium/prepare",
    });

    if (!access?.ok) {
      const status = Number(access?.status || 402);
      const hasSessionId = Boolean(clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId));
      const hasPurchaseId = Boolean(clean(body?.purchaseId || body?.accessGrant?.purchaseId || body?.payment?.purchaseId));
      const hasRequestId = Boolean(clean(body?.requestId || body?.accessGrant?.requestId || body?.payment?.requestId || body?._paymentContext?.requestId));
      const hasPaymentToken = Boolean(premiumAccessToken);
      const paymentConfirmedButMissing = status === 402 && (hasSessionId || hasPurchaseId || hasRequestId || hasPaymentToken);
      const message = status === 401
        ? "로그인 후 점성술 PDF를 생성할 수 있습니다."
        : paymentConfirmedButMissing
          ? "결제는 확인되었지만 생성 권한 연결이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요."
          : status === 402
            ? "프리미엄 PDF 생성 권한이 필요합니다."
            : "결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
      const accessError = {
        code: paymentConfirmedButMissing ? "PAYMENT_CONFIRMED_BUT_ACCESS_MISSING" : (access?.code || "PAYMENT_REQUIRED"),
        message,
        retryable: paymentConfirmedButMissing,
        compensationEligible: paymentConfirmedButMissing,
        recoveryAction: paymentConfirmedButMissing ? "retry_without_duplicate_payment" : "",
      };
      astroPremiumGenerationLocks.set(sessionId, {
        sessionId,
        reportId,
        userId: auth.userId,
        status: "failed",
        startedAt: new Date().toISOString(),
        startedAtMs: Date.now(),
        stage: "access-denied",
        progress: {
          stateKey: "failed",
          currentChapterNo: 0,
          totalChapters: ASTRO_PREMIUM_CHAPTERS.length,
          currentChapterTitle: "결제 권한 확인 실패",
          updatedAt: new Date().toISOString(),
        },
        error: accessError,
      });
      return json({
        ok: false,
        code: accessError.code,
        message,
        retryable: accessError.retryable,
        compensationEligible: accessError.compensationEligible,
        recoveryAction: accessError.recoveryAction,
        debugSafe: {
          featureKey,
          hasSessionId,
          hasPurchaseId,
          hasRequestId,
          hasPaymentToken,
        },
      }, { status });
    }

    const executionCtx = buildPremiumExecutionContext({
      serviceKey: "astro-premium",
      reportType: "westernAstrologyPremium",
      userId: auth.userId,
      featureKey,
      sessionId,
      reportId,
      access,
      body,
      timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
    });
    await startPremiumPdfExecution(pdfDbEnv, auth.userId, executionCtx);

    const validation = validateAstroPayloadForApi({ birthInput });
    const hasProvidedAstrologyChart = Boolean(body?.localAstroChartJson || body?.astrologyChart || body?.astroBase || body?.chart);
    if (!validation.ok && !hasProvidedAstrologyChart) {
      const missingTime = validation.missing.includes("birthHour");
      const missingLocation = ["birthPlace", "latitude", "longitude"].some((key) => validation.missing.includes(key));
      const missingTimezone = ["timezone", "timezoneOffsetHours"].some((key) => validation.missing.includes(key));
      const message = missingTime
        ? "점성술 PDF는 상승궁과 하우스 계산을 위해 태어난 시간이 필요합니다. 프로필 카드에서 태어난 시간을 먼저 입력해주세요."
        : missingLocation
          ? "점성술 PDF는 상승궁·하우스·천정점 계산을 위해 출생지와 좌표가 필요합니다. 프로필 카드에서 태어난 지역을 먼저 선택해주세요."
          : missingTimezone
            ? "점성술 PDF는 정확한 하우스 계산을 위해 출생지 시간대가 필요합니다. 프로필 카드에서 태어난 지역을 다시 선택해주세요."
          : "점성술 계산 데이터가 부족합니다. 생년월일/출생정보를 먼저 확인해 주세요.";
      const invalidInputError = {
        code: "MISSING_ASTRO_DATA",
        message,
        missing: validation.missing,
      };
      try {
        await failPremiumPdfExecution(
          pdfDbEnv,
          auth.userId,
          executionCtx,
          "astro_birth_input_invalid",
          message,
          "birth-input-invalid",
        );
      } catch (failErr) {
        console.error("[AstroPremiumPDF][InvalidInputFailExecution]", {
          reason: clean(failErr?.message || failErr),
        });
      }
      astroPremiumGenerationLocks.set(sessionId, {
        sessionId,
        reportId,
        userId: auth.userId,
        status: "failed",
        startedAt: new Date().toISOString(),
        startedAtMs: Date.now(),
        failedAt: new Date().toISOString(),
        stage: "birth-input-invalid",
        progress: {
          stateKey: "failed",
          progress: 100,
          progressPercent: 100,
          currentChapterNo: 0,
          totalChapters: ASTRO_PREMIUM_CHAPTERS.length,
          currentChapterTitle: "출생 정보 확인 실패",
          updatedAt: new Date().toISOString(),
        },
        error: invalidInputError,
      });
      return json({
        ok: false,
        ...invalidInputError,
      }, { status: 422 });
    }

    console.info("[AstroPremiumPDF][BirthInputValidated]", toSafeBirthLog(birthInput, ASTRO_PREMIUM_CHAPTERS.length));
    console.info("[AstroPremiumPDF][LocalCalculationStart]", toSafeBirthLog(birthInput));
    updateAstroSessionProgress(sessionId, {
      stateKey: "validating",
      progress: 5,
      progressPercent: 5,
      currentChapterNo: 0,
      totalChapters: ASTRO_PREMIUM_CHAPTERS.length,
      currentChapterTitle: "입력과 차트 데이터 검증",
    });

    const generated = await generateAstrologyPremiumPdfV2({
      userId: auth.userId,
      input: {
        ...body,
        sessionId,
        reportSessionId: sessionId,
        reportId,
        birthInput,
      },
      paymentContext: {
        ...(body?._paymentContext && typeof body._paymentContext === "object" ? body._paymentContext : {}),
        ...(body?.paymentContext && typeof body.paymentContext === "object" ? body.paymentContext : {}),
        reportId,
        sessionId,
        reportSessionId: sessionId,
        featureKey,
      },
      env,
      pdfDbEnv,
      executionContext: executionCtx,
      requestUrl: request.url,
      reportId,
      sessionId,
      onProgress: (event = {}) => {
        const chapter = event.chapter || {};
        const totalChapters = Number(event.totalChapters || ASTRO_PREMIUM_CHAPTERS.length);
        updateAstroSessionProgress(sessionId, {
          stateKey: clean(event.stateKey || event.status || "generating"),
          progress: Number.isFinite(Number(event.progress)) ? Number(event.progress) : undefined,
          progressPercent: Number.isFinite(Number(event.progress)) ? Number(event.progress) : undefined,
          currentChapterNo: Number.isFinite(Number(event.currentChapterNo)) ? Number(event.currentChapterNo) : Number(chapter.order || 0),
          totalChapters,
          currentChapterTitle: clean(event.currentChapterTitle || chapter.title || "점성술 챕터 생성"),
          updatedAt: new Date().toISOString(),
        });
      },
    });

    if (!generated?.ok || generated.status === "failed" || !clean(generated.downloadUrl || generated.pdfReady?.downloadUrl)) {
      throw Object.assign(new Error(clean(generated?.error || "ASTROLOGY_PREMIUM_GENERATION_FAILED")), {
        code: clean(generated?.code || "ASTROLOGY_PREMIUM_GENERATION_FAILED"),
        status: Number(generated?.statusCode || 500),
        details: generated?.details || null,
      });
    }

    const responseBody = {
      ok: true,
      success: true,
      serviceKey: "astro-premium",
      featureKey: ASTRO_PREMIUM_FEATURE_KEY,
      reportType: "westernAstrologyPremium",
      status: "completed",
      serverStatus: "completed",
      qualityStatus: "passed",
      sessionId,
      reportId,
      chapterCount: generated.chapterCount,
      expectedChapterCount: generated.expectedChapterCount,
      chapters: generated.chapters,
      manuscriptSource: generated.manuscriptSource,
      generationMode: generated.generationMode,
      provider: generated.provider,
      modelName: generated.modelName,
      writingPipeline: generated.writingPipeline,
      llmAssembly: generated.llmAssembly,
      llmAssemblyOnly: true,
      externalCallsAllowed: true,
      pdfCompletionValidation: generated.pdfCompletionValidation,
      archiveStatus: generated.archiveStatus,
      completedExecutionStored: generated.completedExecutionStored,
      pdfReady: generated.pdfReady,
      pdfUrl: generated.pdfUrl,
      htmlUrl: generated.htmlUrl,
      downloadUrl: generated.downloadUrl,
      canReopen: true,
      canDownload: true,
    };

    astroPremiumGenerationLocks.set(sessionId, {
      sessionId,
      reportId,
      userId: auth.userId,
      status: "done",
      startedAt: astroPremiumGenerationLocks.get(sessionId)?.startedAt || new Date().toISOString(),
      startedAtMs: astroPremiumGenerationLocks.get(sessionId)?.startedAtMs || Date.now(),
      completedAt: new Date().toISOString(),
      stage: "completed",
      progress: {
        stateKey: "completed",
        progress: 100,
        progressPercent: 100,
        currentChapterNo: Number(generated.chapterCount || ASTRO_PREMIUM_CHAPTERS.length),
        totalChapters: Number(generated.expectedChapterCount || ASTRO_PREMIUM_CHAPTERS.length),
        currentChapterTitle: "완료",
        manuscriptSource: generated.manuscriptSource,
        updatedAt: new Date().toISOString(),
      },
      result: responseBody,
    });

    return json(responseBody);
  } catch (error) {
    const originalCode = clean(error?.details?.originalCode || error?.code || "ASTRO_PREMIUM_GENERATION_FAILED");
    const failureReasonCode = originalCode
      ? originalCode.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
      : "astro_generation_failed";
    try {
      await failPremiumPdfExecution(
        pdfDbEnv,
        auth?.userId,
        buildPremiumExecutionContext({
          serviceKey: "astro-premium",
          reportType: "westernAstrologyPremium",
          userId: auth?.userId,
          featureKey: String(body?.featureKey || ASTRO_PREMIUM_FEATURE_KEY),
          sessionId,
          reportId: clean(reportId || body?.reportId || body?.accessGrant?.reportId),
          access: null,
          body,
          timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
        }),
        failureReasonCode || "astro_generation_failed",
        clean(error?.message || "점성술 프리미엄 PDF 생성에 실패했습니다."),
        "astro-generation",
      );
    } catch (failErr) {
      console.error("[AstroPremiumPDF][ErrorFailPdfExecution]", {
        reason: clean(failErr?.message || failErr),
      });
    }
    if (sessionId) {
      const previousLock = astroPremiumGenerationLocks.get(sessionId) || {};
      astroPremiumGenerationLocks.set(sessionId, {
        ...previousLock,
        sessionId,
        userId: auth?.userId,
        status: "failed",
        startedAt: previousLock.startedAt || new Date().toISOString(),
        startedAtMs: previousLock.startedAtMs || Date.now(),
        failedAt: new Date().toISOString(),
        stage: "error",
        progress: {
          ...(previousLock.progress || {}),
          stateKey: "failed",
          progress: 100,
          progressPercent: 100,
          currentChapterTitle: "생성 오류",
          updatedAt: new Date().toISOString(),
        },
        error: {
          code: clean(error?.code || "ASTRO_PREMIUM_GENERATION_FAILED"),
          message: clean(error?.message || "점성술 프리미엄 PDF 생성에 실패했습니다."),
        },
      });
    }
    console.error("[AstroPremiumPDF][FailureTrace]", toAstroFailureTrace(error, body, normalizeAstroPremiumBirthInput(birthInputSource || getAstroBirthInputSource(body))));
    console.error("[AstroPremiumPDF][Error]", {
      ...toAstroErrorMeta(error),
      details: normalizeAstroError(error),
    });
    const rawMessage = clean(error?.message || "점성술 프리미엄 PDF 생성에 실패했습니다.");
    const userFacingMessage = originalCode === "ASTRO_SWISS_ENGINE_UNAVAILABLE" || rawMessage.includes("Swiss")
      ? "점성술 차트 계산 엔진을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
      : originalCode === "ASTRO_TRANSIT_INSIGHTS_INVALID"
        ? "점성술 시기 흐름 계산이 완성되지 않았습니다. 잠시 후 다시 시도해 주세요."
        : originalCode === "ASTRO_REPORT_COMPLETION_INVALID" || originalCode === "ASTRO_PDF_COMPLETION_VALIDATION_FAILED"
          ? "점성술 PDF 완성 검증이 통과되지 않았습니다. 잠시 후 다시 시도해 주세요."
      : rawMessage.includes("태어난 시간") || rawMessage.includes("birth")
      ? "점성술 PDF 생성에 필요한 출생시 정보가 부족합니다. 프로필 카드에서 태어난 시간을 확인해 주세요."
      : rawMessage.includes("원고") || rawMessage.includes("검증")
        ? "생성된 점성술 원고가 품질 기준을 통과하지 못했습니다. 잠시 후 다시 시도해 주세요."
        : rawMessage.includes("차트")
          ? "점성술 차트 계산 중 일시적 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
          : "점성술 PDF 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    return json({
      ok: false,
      code: error?.code || "ASTRO_PREMIUM_GENERATION_FAILED",
      originalCode: originalCode || null,
      message: userFacingMessage,
      debugSafe: {
        stage: "premium-generation",
        sessionId,
        reportId: clean(reportId || body?.reportId || body?.accessGrant?.reportId),
        originalCode: originalCode || null,
      },
    }, { status: Number(error?.status || 500) });
  }
}

async function handleVedicPremiumPrepare(request, env) {
  let auth = null;
  let body = {};
  let birthInput = {};
  let executionCtx = null;
  let vedicSessionId = "";
  let reportId = "";
  const pdfDbEnv = withPdfFastDbEnv(env);
  try {
    auth = await requireAuth(request, env);
    body = await readJson(request);
    if (isVedicPdfLlmDryRunForced(env)) {
      return json({
        ok: false,
        serviceKey: VEDIC_PDF_SERVICE_KEY,
        code: "VEDIC_PREMIUM_PREPARE_DISABLED_IN_MOCK_MODE",
        message: "현재 베다점 PDF는 mock 파이프라인만 사용할 수 있습니다. /api/vedic/pdf/verify-access, create-job, generate-mock 계약을 사용해 주세요.",
        provider: "mock",
        tokensUsed: 0,
        cost: 0,
        isMock: true,
      }, { status: 409 });
    }
    vedicSessionId = getVedicSessionId(body);
    reportId = clean(body?.reportId || body?.accessGrant?.reportId || `vedic-premium-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
    const premiumAccessToken = readPremiumAccessToken(request, body);
    const featureKey = clean(body?.featureKey || VEDIC_PREMIUM_FEATURE_KEY) || VEDIC_PREMIUM_FEATURE_KEY;
    birthInput = normalizeVedicPremiumBirthInput(body);

    compactVedicPremiumLocks();
    const existingLock = vedicPremiumGenerationLocks.get(vedicSessionId);
    if (existingLock && VEDIC_ACTIVE_STATUSES.has(normalizeVedicRuntimeStatus(existingLock?.status))) {
      const payload = buildVedicStatusPayload(existingLock).data;
      return json({
        ok: true,
        deduped: true,
        status: payload.status,
        sessionId: vedicSessionId,
        reportId: clean(existingLock.reportId || reportId),
        startedAt: existingLock.startedAt,
        stage: clean(payload.status),
        progress: payload.progress,
        retryAfterMs: VEDIC_STATUS_RETRY_AFTER_MS,
      }, { status: 202 });
    }
    if (["done", "completed"].includes(clean(existingLock?.status)) && existingLock?.result) {
      return json({
        ...existingLock.result,
        deduped: true,
        status: "completed",
        sessionId: vedicSessionId,
        progress: buildVedicStatusPayload(existingLock).data.progress,
      });
    }

    vedicPremiumGenerationLocks.set(vedicSessionId, {
      sessionId: vedicSessionId,
      reportId,
      userId: auth.userId,
      status: "pending",
      startedAt: new Date().toISOString(),
      startedAtMs: Date.now(),
      stage: "pending",
      progress: {
        stateKey: "pending",
        progress: 0,
        progressPercent: 0,
        currentChapterNo: 0,
        totalChapters: VEDIC_PREMIUM_STATUS_CHAPTERS.length || VEDIC_PREMIUM_CHAPTERS.length,
        currentChapterTitle: "결제 및 세션 확인",
        updatedAt: new Date().toISOString(),
      },
    });

    console.info("[VedicPremiumPDF][RequestReceived]", {
      userId: auth.userId,
      featureKey,
      hasPremiumAccessToken: Boolean(premiumAccessToken),
    });
    console.info("[VedicPremiumPDF][VEDIC_PDF_REQUEST_RECEIVED]", {
      jobId: reportId,
      userId: auth.userId,
      status: "received",
    });

    const birthValidation = validateVedicBirthInput(birthInput);
    if (!birthValidation.ok) {
      vedicPremiumGenerationLocks.set(vedicSessionId, {
        sessionId: vedicSessionId,
        reportId,
        userId: auth.userId,
        status: "failed",
        startedAt: new Date().toISOString(),
        startedAtMs: Date.now(),
        stage: "birth-input-invalid",
        progress: {
          stateKey: "failed",
          progress: 100,
          progressPercent: 100,
          currentChapterNo: 0,
          totalChapters: VEDIC_PREMIUM_STATUS_CHAPTERS.length || VEDIC_PREMIUM_CHAPTERS.length,
          currentChapterTitle: "출생 정보 확인 실패",
          updatedAt: new Date().toISOString(),
        },
        error: {
          code: "BIRTH_INPUT_INVALID",
          message: clean(birthValidation?.message || "베다 차트 계산을 완료하지 못했습니다. 출생 정보와 지역 정보를 확인해 주세요."),
        },
      });
      console.error("[VedicPremiumPDF][Error]", {
        code: "BIRTH_INPUT_INVALID",
        message: String(birthValidation?.message || "출생 정보가 올바르지 않습니다."),
        ...toSafeVedicBirthLog(birthInput, VEDIC_PREMIUM_CHAPTERS.length),
      });
      return json({
        ok: false,
        code: "BIRTH_INPUT_INVALID",
        message: birthValidation?.message || "베다 차트 계산을 완료하지 못했습니다. 출생 정보와 지역 정보를 확인해 주세요.",
        missing: birthValidation?.hardFail || [],
      }, { status: 422 });
    }

    console.info("[VedicPremiumPDF][BirthInputValidated]", toSafeVedicBirthLog(birthInput, VEDIC_PREMIUM_CHAPTERS.length));
    updateVedicSessionProgress(vedicSessionId, {
      stateKey: "validating",
      progress: 5,
      currentChapterNo: 0,
      totalChapters: VEDIC_PREMIUM_STATUS_CHAPTERS.length || VEDIC_PREMIUM_CHAPTERS.length,
      currentChapterTitle: "결제 권한 확인",
    });

    const access = await requirePremiumReportAccess(pdfDbEnv, auth.userId, "vedicPremium", {
      ...body,
      reportType: "vedicPremium",
      featureKey,
      premiumAccessToken: premiumAccessToken || undefined,
      _accessRoute: "/api/vedic/premium/prepare",
    });

    if (!access?.ok) {
      const status = Number(access?.status || 402);
      const hasSessionId = Boolean(clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId));
      const hasPurchaseId = Boolean(clean(body?.purchaseId || body?.accessGrant?.purchaseId || body?.payment?.purchaseId));
      const hasRequestId = Boolean(clean(body?.requestId || body?.accessGrant?.requestId || body?.payment?.requestId || body?._paymentContext?.requestId));
      const hasPaymentToken = Boolean(premiumAccessToken);
      const paymentConfirmedButMissing = status === 402 && (hasSessionId || hasPurchaseId || hasRequestId || hasPaymentToken);
      const message = status === 401
        ? "로그인 후 베다점 PDF를 생성할 수 있습니다."
        : paymentConfirmedButMissing
          ? "결제는 확인되었지만 베다점 생성 권한 연결이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요."
          : status === 402
            ? "베다점 프리미엄 PDF 생성 권한이 필요합니다."
            : "결제 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
      vedicPremiumGenerationLocks.set(vedicSessionId, {
        sessionId: vedicSessionId,
        reportId,
        userId: auth.userId,
        status: "failed",
        startedAt: new Date().toISOString(),
        startedAtMs: Date.now(),
        stage: "access-denied",
        progress: {
          stateKey: "failed",
          progress: 100,
          progressPercent: 100,
          currentChapterNo: 0,
          totalChapters: VEDIC_PREMIUM_STATUS_CHAPTERS.length || VEDIC_PREMIUM_CHAPTERS.length,
          currentChapterTitle: "결제 권한 확인 실패",
          updatedAt: new Date().toISOString(),
        },
        error: {
          code: clean(paymentConfirmedButMissing ? "PAYMENT_CONFIRMED_BUT_ACCESS_MISSING" : (access?.code || "PAYMENT_REQUIRED")),
          message,
        },
      });
      console.error("[VedicPremiumPDF][Error]", {
        code: paymentConfirmedButMissing ? "PAYMENT_CONFIRMED_BUT_ACCESS_MISSING" : String(access?.code || "PAYMENT_REQUIRED"),
        message,
        ...toSafeVedicBirthLog(birthInput, VEDIC_PREMIUM_CHAPTERS.length),
      });
      return json({
        ok: false,
        code: paymentConfirmedButMissing ? "PAYMENT_CONFIRMED_BUT_ACCESS_MISSING" : (access?.code || "PAYMENT_REQUIRED"),
        message,
        debugSafe: {
          featureKey,
          hasSessionId,
          hasPurchaseId,
          hasRequestId,
          hasPaymentToken,
        },
      }, { status });
    }

    executionCtx = buildPremiumExecutionContext({
      serviceKey: "vedic-premium",
      reportType: "vedicPremium",
      userId: auth.userId,
      featureKey,
      sessionId: vedicSessionId,
      reportId,
      access,
      body,
      timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
    });
    await startPremiumPdfExecution(pdfDbEnv, auth.userId, executionCtx);
    updateVedicSessionProgress(vedicSessionId, {
      stateKey: "validating",
      progress: 5,
      currentChapterNo: 0,
      totalChapters: VEDIC_PREMIUM_STATUS_CHAPTERS.length || VEDIC_PREMIUM_CHAPTERS.length,
      currentChapterTitle: "베다 차트 계산",
    });

    const resolved = await resolveVedicChartForPremiumPdf(body, birthInput, env, request.url);
    if (!hasUsableVedicChartSource(resolved?.chartSource)) {
      const error = new Error("베다 차트 계산을 완료하지 못했습니다. 출생 정보와 지역 정보를 확인해 주세요.");
      error.code = "VEDIC_CHART_SOURCE_INVALID";
      error.status = 422;
      throw error;
    }
    if (resolved?.chartSourceQuality?.ok !== true) {
      const error = new Error("베다점 PDF에 필요한 고품질 차트 계산을 완료하지 못했습니다.");
      error.code = "VEDIC_CHART_SOURCE_QUALITY_INVALID";
      error.status = 422;
      error.details = resolved?.chartSourceQuality || null;
      throw error;
    }

    updateVedicSessionProgress(vedicSessionId, {
      stateKey: "generating",
      progress: 10,
      currentChapterNo: 0,
      totalChapters: VEDIC_PREMIUM_STATUS_CHAPTERS.length || VEDIC_PREMIUM_CHAPTERS.length,
      currentChapterTitle: "베다점 리포트 본문 생성",
    });

    const generationInput = {
      ...body,
      birthInput,
      sessionId: vedicSessionId,
      reportSessionId: vedicSessionId,
      reportId,
      chartSource: resolved.chartSource,
      chartSourceQuality: resolved.chartSourceQuality,
      vedicBase: {
        ...(body?.vedicBase && typeof body.vedicBase === "object" ? body.vedicBase : {}),
        chart: resolved.chartSource,
      },
    };

    const generated = await generateVedicPremiumPdfV2({
      userId: auth.userId,
      input: generationInput,
      paymentContext: {
        ...(body?._paymentContext && typeof body._paymentContext === "object" ? body._paymentContext : {}),
        ...(body?.paymentContext && typeof body.paymentContext === "object" ? body.paymentContext : {}),
        reportId,
        sessionId: vedicSessionId,
        reportSessionId: vedicSessionId,
        featureKey,
      },
      env,
      pdfDbEnv,
      executionContext: executionCtx,
      requestUrl: request.url,
      reportId,
      sessionId: vedicSessionId,
      onProgress: ({ stage, status, progress, chapter, completedChapters, totalChapters } = {}) => {
        const stateKey = normalizeVedicRuntimeStatus(status || stage || (chapter ? "generating" : ""));
        updateVedicSessionProgress(vedicSessionId, {
          stateKey,
          progress,
          currentChapterNo: Number(chapter?.order || completedChapters || 0),
          totalChapters: Number(totalChapters || VEDIC_PREMIUM_STATUS_CHAPTERS.length || VEDIC_PREMIUM_CHAPTERS.length),
          currentChapterTitle: clean(chapter?.title || (stateKey === "rendering" ? "PDF 편집/렌더링" : stateKey === "validating" ? "베다 차트 검증" : "베다점 챕터 생성")),
        });
      },
    });

    if (!generated?.ok || generated.status === "failed" || !clean(generated.downloadUrl || generated.pdfReady?.downloadUrl)) {
      throw Object.assign(new Error(clean(generated?.error || "VEDIC_PREMIUM_GENERATION_FAILED")), {
        code: clean(generated?.code || "VEDIC_PREMIUM_GENERATION_FAILED"),
        status: Number(generated?.statusCode || 500),
        details: generated?.details || null,
      });
    }

    const responseBody = {
      ok: true,
      success: true,
      serviceKey: "vedic-premium",
      featureKey: VEDIC_PREMIUM_FEATURE_KEY,
      reportType: "vedicPremium",
      status: "completed",
      serverStatus: "completed",
      qualityStatus: "passed",
      sessionId: vedicSessionId,
      reportId,
      chapterCount: generated.chapterCount,
      expectedChapterCount: generated.expectedChapterCount,
      chapters: generated.chapters,
      payload: generated.payload,
      localVedicChartJson: generated.localVedicChartJson,
      manuscriptSource: generated.manuscriptSource,
      generationMode: generated.generationMode,
      provider: generated.provider,
      modelName: generated.modelName,
      writingPipeline: generated.writingPipeline,
      llmAssembly: generated.llmAssembly,
      llmAssemblyOnly: true,
      externalCallsAllowed: true,
      pdfCompletionValidation: generated.pdfCompletionValidation,
      archiveStatus: generated.archiveStatus,
      completedExecutionStored: generated.completedExecutionStored,
      pdfReady: generated.pdfReady,
      pdfUrl: generated.pdfUrl,
      htmlUrl: generated.htmlUrl,
      downloadUrl: generated.downloadUrl,
      canReopen: true,
      canDownload: true,
    };

    vedicPremiumGenerationLocks.set(vedicSessionId, {
      sessionId: vedicSessionId,
      reportId,
      userId: auth.userId,
      status: "completed",
      startedAt: vedicPremiumGenerationLocks.get(vedicSessionId)?.startedAt || new Date().toISOString(),
      startedAtMs: vedicPremiumGenerationLocks.get(vedicSessionId)?.startedAtMs || Date.now(),
      completedAt: new Date().toISOString(),
      stage: "completed",
      progress: {
        stateKey: "completed",
        progress: 100,
        progressPercent: 100,
        currentChapterNo: Number(generated.expectedChapterCount || generated.chapterCount || VEDIC_PREMIUM_STATUS_CHAPTERS.length || VEDIC_PREMIUM_CHAPTERS.length),
        totalChapters: Number(generated.expectedChapterCount || generated.chapterCount || VEDIC_PREMIUM_STATUS_CHAPTERS.length || VEDIC_PREMIUM_CHAPTERS.length),
        currentChapterTitle: "완료",
        manuscriptSource: generated.manuscriptSource,
        updatedAt: new Date().toISOString(),
      },
      result: responseBody,
    });

    return json(responseBody);

  } catch (error) {
    try {
      await failPremiumPdfExecution(
        pdfDbEnv,
        auth?.userId,
        executionCtx || buildPremiumExecutionContext({
          serviceKey: "vedic-premium",
          reportType: "vedicPremium",
          userId: auth?.userId,
          featureKey: String(body?.featureKey || VEDIC_PREMIUM_FEATURE_KEY),
          sessionId: vedicSessionId || clean(body?.sessionId || body?.reportSessionId || body?.generationId),
          reportId: reportId || clean(body?.reportId || body?.accessGrant?.reportId),
          access: null,
          body,
          timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
        }),
        "vedic_generation_failed",
        clean(error?.message || "베다점 프리미엄 PDF 생성에 실패했습니다."),
        "vedic-generation",
      );
    } catch (failErr) {
      console.error("[VedicPremiumPDF][ErrorFailPdfExecution]", {
        reason: clean(failErr?.message || failErr),
      });
    }
    console.error("[VedicPremiumPDF][Error]", {
      code: String(error?.code || "VEDIC_PREMIUM_GENERATION_FAILED"),
      message: String(error?.message || "베다점 프리미엄 PDF 생성에 실패했습니다."),
      status: Number(error?.status || 500),
      details: normalizeVedicError(error),
    });
    if (vedicSessionId) {
      const previousLock = vedicPremiumGenerationLocks.get(vedicSessionId) || {};
      vedicPremiumGenerationLocks.set(vedicSessionId, {
        ...previousLock,
        sessionId: vedicSessionId,
        reportId: reportId || clean(body?.reportId || body?.accessGrant?.reportId),
        userId: auth?.userId,
        status: "failed",
        startedAt: previousLock.startedAt || new Date().toISOString(),
        startedAtMs: previousLock.startedAtMs || Date.now(),
        failedAt: new Date().toISOString(),
        stage: "error",
        progress: {
          ...(previousLock.progress || {}),
          stateKey: "failed",
          progress: 100,
          progressPercent: 100,
          currentChapterTitle: "생성 오류",
          updatedAt: new Date().toISOString(),
        },
        error: {
          code: clean(error?.code || "VEDIC_PREMIUM_GENERATION_FAILED"),
          reasonClass: clean(error?.reasonClass),
          details: normalizeVedicError(error),
          message: clean(error?.message || "베다점 프리미엄 PDF 생성에 실패했습니다."),
        },
      });
    }
    const rawMessage = clean(error?.message || "베다점 프리미엄 PDF 생성에 실패했습니다.");
    const errorCode = clean(error?.code || "");
    const normalizedError = normalizeVedicError(error);
    let userFacingMessage = errorCode === "BIRTH_INPUT_INVALID" || /BIRTH_INPUT|birth-input|birth input/i.test(rawMessage)
      ? "베다점 PDF 생성에 필요한 출생 정보가 부족합니다. 생년월일, 태어난 시간, 지역 정보를 확인해 주세요."
      : errorCode === "VEDIC_CHART_SOURCE_INVALID" || errorCode === "VEDIC_CHART_SOURCE_QUALITY_INVALID" || rawMessage.includes("차트") || rawMessage.includes("Swiss")
        ? "베다 차트 계산 중 일시적 오류가 발생했습니다. 출생 정보와 지역 정보를 확인한 뒤 다시 시도해 주세요."
        : rawMessage.includes("원고") || rawMessage.includes("검증") || rawMessage.includes("contract")
          ? "생성된 베다점 상담 원고가 품질 기준을 통과하지 못했습니다. 잠시 후 다시 시도해 주세요."
          : "베다점 PDF 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    return json({
      ok: false,
      code: error?.code || "VEDIC_PREMIUM_GENERATION_FAILED",
      message: userFacingMessage,
      debugSafe: {
        stage: "vedic-generation",
        sessionId: vedicSessionId,
        reportId: reportId || clean(body?.reportId || body?.accessGrant?.reportId),
        originalCode: errorCode || null,
        status: Number(error?.status || 500),
        details: normalizedError,
      },
    }, { status: Number(error?.status || 500) });
  }
}

async function handleVedicPremiumStatus(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const sessionId = clean(url.searchParams.get("sessionId") || url.searchParams.get("reportSessionId"));
  const reportId = clean(url.searchParams.get("reportId"));
  if (!sessionId && !reportId) {
    return json({
      ok: false,
      code: "MISSING_RESULT_KEY",
      message: "sessionId 또는 reportId가 필요합니다.",
    }, { status: 422 });
  }

  compactVedicPremiumLocks();
  let lock = sessionId
    ? vedicPremiumGenerationLocks.get(sessionId)
    : Array.from(vedicPremiumGenerationLocks.values()).find((state) => clean(state?.result?.reportId) === reportId);
  if (lock?.userId && lock.userId !== auth.userId) lock = null;
  if (lock && VEDIC_ACTIVE_STATUSES.has(normalizeVedicRuntimeStatus(lock.status))) {
    return json({
      ...buildVedicStatusPayload(lock, { sessionId, reportId }),
      retryAfterMs: VEDIC_STATUS_RETRY_AFTER_MS,
    }, { status: 202 });
  }
  if (["done", "completed"].includes(clean(lock?.status)) && lock?.result) {
    return json({
      ...lock.result,
      deduped: true,
      status: "completed",
      sessionId: clean(lock.sessionId || lock.result.sessionId || sessionId),
      progress: buildVedicStatusPayload(lock, { sessionId, reportId }).data.progress,
    });
  }
  if (lock?.status === "failed") {
    const payload = buildVedicStatusPayload(lock, { sessionId, reportId });
    return json({
      ok: false,
      serviceKey: "vedic-premium",
      featureKey: VEDIC_PREMIUM_FEATURE_KEY,
      status: "failed",
      sessionId: payload.data.sessionId,
      reportId: payload.data.reportId,
      progress: payload.data.progress,
      code: clean(lock?.error?.code || "VEDIC_PREMIUM_GENERATION_FAILED"),
      reasonClass: clean(lock?.error?.reasonClass),
      failureStage: clean(lock.stage || "generation"),
      message: clean(lock?.error?.message || "베다점 PDF 생성이 완료되지 않았습니다. 다시 시도해 주세요."),
    });
  }

  await connectDb(withPdfFastDbEnv(env));
  const query = buildVedicPremiumStatusLookupQuery({
    userId: auth.userId,
    sessionId,
    reportId,
  });
  const doc = await ServiceExecutionTransaction.findOne(query).sort({ completedAt: -1, updatedAt: -1, createdAt: -1 }).lean();
  if (!doc) {
    return json({
      ok: false,
      serviceKey: "vedic-premium",
      featureKey: VEDIC_PREMIUM_FEATURE_KEY,
      status: "not_found",
      sessionId,
      reportId,
      stage: "result-not-found",
      code: "VEDIC_RESULT_NOT_FOUND",
      message: "베다점 PDF 결과를 찾지 못했습니다. 결제 완료 후 다시 생성해 주세요.",
      progress: {
        stateKey: "not_found",
        progress: 100,
        progressPercent: 100,
        currentChapterNo: 0,
        totalChapters: VEDIC_PREMIUM_STATUS_CHAPTERS.length || VEDIC_PREMIUM_CHAPTERS.length,
        currentChapterTitle: "PDF 결과를 찾지 못했습니다",
      },
    }, { status: 404 });
  }

  if (String(doc.status || "") === "success" && String(doc.premiumStatus || "") === "completed") {
    const payload = buildVedicStatusPayloadFromArchive(doc, sessionId, reportId);
    if (payload) return json(payload);
  }

  if (String(doc.status || "") === "failed" || String(doc.premiumStatus || "") === "failed") {
    return json({
      ok: false,
      serviceKey: "vedic-premium",
      featureKey: VEDIC_PREMIUM_FEATURE_KEY,
      status: "failed",
      sessionId: clean(doc.sessionId || sessionId),
      reportId: clean(doc.reportId || reportId),
      code: clean(doc.reasonCode || "VEDIC_PREMIUM_GENERATION_FAILED"),
      failureStage: clean(doc.failureStage || doc.reasonCode || "generation"),
      progress: {
        stateKey: "failed",
        progress: 100,
        progressPercent: 100,
        currentChapterNo: 0,
        totalChapters: VEDIC_PREMIUM_STATUS_CHAPTERS.length || VEDIC_PREMIUM_CHAPTERS.length,
        currentChapterTitle: "PDF 생성에 실패했습니다",
      },
      message: clean(doc.reasonMessage || "베다점 PDF 생성이 완료되지 않았습니다. 다시 시도해 주세요."),
    });
  }

  return json({
    ok: true,
    serviceKey: "vedic-premium",
    featureKey: VEDIC_PREMIUM_FEATURE_KEY,
    status: "running",
    sessionId: clean(doc.sessionId || sessionId),
    reportId: clean(doc.reportId || reportId),
    stage: clean(doc.premiumStatus || "generating"),
    progress: {
      stateKey: normalizeVedicRuntimeStatus(doc.premiumStatus || "generating"),
      progress: resolveVedicProgressPercent(doc.premiumStatus || "generating", 0, VEDIC_PREMIUM_STATUS_CHAPTERS.length || VEDIC_PREMIUM_CHAPTERS.length),
      progressPercent: resolveVedicProgressPercent(doc.premiumStatus || "generating", 0, VEDIC_PREMIUM_STATUS_CHAPTERS.length || VEDIC_PREMIUM_CHAPTERS.length),
      currentChapterNo: 0,
      totalChapters: VEDIC_PREMIUM_STATUS_CHAPTERS.length || VEDIC_PREMIUM_CHAPTERS.length,
      currentChapterTitle: "PDF 결과를 확인하는 중입니다",
    },
    retryAfterMs: VEDIC_STATUS_RETRY_AFTER_MS,
  }, { status: 202 });
}

export async function handleAstroRoutes(request, env) {
  try {
    const method = request.method.toUpperCase();
    const pathname = new URL(request.url).pathname;
    const isAIConsultationPost = method === "POST" && (
      pathname === "/api/astro/ai-consultation"
      || pathname === "/api/vedic/ai-consultation"
    );

    if (method === "POST" && !isAIConsultationPost) {
      await requireAuth(request, env);
    }

    if (pathname === "/api/astro" || pathname.startsWith("/api/astro/")) {
      const path = getRoutePath(request, "/api/astro");
      if (path === "/premium/mock-chapters") {
        if (method !== "GET") return methodNotAllowed();
        return json({
          ok: true,
          serviceType: "astrology_pdf",
          chapterCount: ASTROLOGY_PDF_CHAPTERS.length,
          chapters: ASTROLOGY_PDF_CHAPTERS,
          provider: "mock",
          tokensUsed: 0,
          cost: 0,
          isMock: true,
        });
      }
      if (path === "/ai-consultation") {
        if (method !== "POST") return methodNotAllowed();
        return await handleAstrologyAIConsultation(request, env);
      }
      if (path === "/premium/verify-access") {
        if (method !== "POST") return methodNotAllowed();
        return await handleAstrologyMockVerifyAccess(request, env);
      }
      if (path === "/premium/create-job") {
        if (method !== "POST") return methodNotAllowed();
        return await handleAstrologyMockCreateJob(request, env);
      }
      if (path === "/premium/generate-mock") {
        if (method !== "POST") return methodNotAllowed();
        return await handleAstrologyMockGenerate(request, env);
      }
      if (path === "/premium/result") {
        if (method !== "GET") return methodNotAllowed();
        return await handleAstrologyMockResult(request, env);
      }
      if (path === "/premium/chapters") {
        if (method !== "GET") return methodNotAllowed();
        return json({
          ok: true,
          featureKey: ASTRO_PREMIUM_FEATURE_KEY,
          chapterCount: ASTRO_PREMIUM_CHAPTERS.length,
          chapters: ASTRO_PREMIUM_CHAPTERS,
        });
      }
      if (path === "/premium/prepare") {
        if (method !== "POST") return methodNotAllowed();
        return await handleAstroPremiumPrepare(request, env);
      }
      if (path === "/premium/status") {
        if (method !== "GET") return methodNotAllowed();
        const statusUrl = new URL(request.url);
        if (clean(statusUrl.searchParams.get("jobId"))) {
          return await handleAstrologyMockStatus(request, env);
        }
        return await handleAstroPremiumStatus(request, env);
      }
      if (path === "/western-chart") {
        if (method !== "POST") return methodNotAllowed();
        return await handleAstroWesternChart(request, env);
      }
      if (["GET", "POST"].includes(method)) return notFound();
      return methodNotAllowed();
    }

    if (pathname === "/api/vedic" || pathname.startsWith("/api/vedic/")) {
      const path = getRoutePath(request, "/api/vedic");
      if (path === "/pdf/chapters") {
        if (method !== "GET") return methodNotAllowed();
        return json({
          ok: true,
          serviceKey: VEDIC_PDF_SERVICE_KEY,
          serviceType: VEDIC_PDF_SERVICE_TYPE,
          chapterCount: VEDIC_PDF_CHAPTERS.length,
          chapters: VEDIC_PDF_CHAPTERS,
          provider: "mock",
          tokensUsed: 0,
          cost: 0,
          isMock: true,
        });
      }
      if (path === "/pdf/verify-access") {
        if (method !== "POST") return methodNotAllowed();
        return await handleVedicPdfVerifyAccess(request, env);
      }
      if (path === "/pdf/create-job") {
        if (method !== "POST") return methodNotAllowed();
        return await handleVedicPdfCreateJob(request, env);
      }
      if (path === "/pdf/generate-mock") {
        if (method !== "POST") return methodNotAllowed();
        return await handleVedicPdfGenerateMock(request, env);
      }
      if (path === "/pdf/status" || String(path || "").startsWith("/pdf/status/")) {
        if (method !== "GET") return methodNotAllowed();
        return await handleVedicPdfStatus(request, env);
      }
      if (path === "/pdf/result" || String(path || "").startsWith("/pdf/result/")) {
        if (method !== "GET") return methodNotAllowed();
        return await handleVedicPdfResult(request, env);
      }
      if (path === "/premium/chapters") {
        if (method !== "GET") return methodNotAllowed();
        return json({
          ok: true,
          featureKey: VEDIC_PREMIUM_FEATURE_KEY,
          chapterCount: VEDIC_PREMIUM_STATUS_CHAPTERS.length,
          chapters: VEDIC_PREMIUM_STATUS_CHAPTERS,
        });
      }
      if (path === "/premium/prepare") {
        if (method !== "POST") return methodNotAllowed();
        return await handleVedicPremiumPrepare(request, env);
      }
      if (path === "/premium/status") {
        if (method !== "GET") return methodNotAllowed();
        return await handleVedicPremiumStatus(request, env);
      }
      if (path === "/ai-consultation") {
        if (method !== "POST") return methodNotAllowed();
        return await handleVedicAIConsultation(request, env);
      }
      if (path === "/planets") {
        if (method !== "POST") return methodNotAllowed();
        return await handleVedicPlanets(request, env);
      }
      if (["GET", "POST"].includes(method)) return notFound();
      return methodNotAllowed();
    }

    return notFound();
  } catch (error) {
    return handleRouteError(error);
  }
}
