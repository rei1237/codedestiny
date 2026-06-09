import { getSwissVedicPlanets, getSwissWesternChart } from "../lib/swiss-ephemeris.js";
import { cookieValue, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { ASTRO_PREMIUM_CHAPTERS, ASTRO_PREMIUM_FEATURE_KEY } from "../lib/astro-premium-chapters.js";
import {
  buildAstroLocalChartJson,
  generateAstroPremiumReport,
  hasUsableSwissAstroChart,
  normalizeAstroPremiumBirthInput,
  validateAstroPayloadForApi,
} from "../lib/astro-premium-generator.js";
import { VEDIC_PREMIUM_CHAPTERS, VEDIC_PREMIUM_FEATURE_KEY } from "../lib/vedic-premium-chapters.js";
import {
  buildVedicLocalChartJson,
  generateVedicPremiumReport,
  normalizeVedicError,
  normalizeVedicPremiumBirthInput,
  validateVedicBirthInput,
} from "../lib/vedic-premium-generator.js";
import { withPdfFastDbEnv } from "../lib/pdf-runtime.js";
import {
  buildPremiumExecutionContext,
  completePremiumPdfExecution,
  failPremiumPdfExecution,
  startPremiumPdfExecution,
} from "../lib/premium-pdf-execution.js";
import { connectDb } from "../lib/db.js";
import { ServiceExecutionTransaction } from "../lib/models.js";

const ASTRO_PREMIUM_LOCK_TTL_MS = 10 * 60 * 1000;
const astroPremiumGenerationLocks = new Map();
const VEDIC_PREMIUM_LOCK_TTL_MS = 10 * 60 * 1000;
const VEDIC_STATUS_RETRY_AFTER_MS = 4000;
const vedicPremiumGenerationLocks = new Map();
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

    if (["GET", "POST"].includes(method)) return notFound();
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
    stage: clean(error?.stage || details?.stage || "llm-generation") || "llm-generation",
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

function withPdfArchiveFormat(url, format) {
  const value = clean(url);
  const targetFormat = clean(format) || "pdf";
  if (!value || !/\/api\/premium\/pdf-archive\//.test(value)) return value;
  if (/[?&]format=/.test(value)) {
    return value.replace(/([?&]format=)[^&]+/i, `$1${encodeURIComponent(targetFormat)}`);
  }
  return `${value}${value.includes("?") ? "&" : "?"}format=${encodeURIComponent(targetFormat)}`;
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
    case "LLMSeedPrepared":
    case "LLMManuscriptBuildStart":
      return { stateKey: "writing_seed", currentChapterNo: 0, totalChapters, currentChapterTitle: "원고 작성 신호 구성" };
    case "LLMChapterBuildStart":
      return { stateKey: "writing_llm", currentChapterNo: Math.max(0, chapterNo - 1), totalChapters, currentChapterTitle: title };
    case "LLMChapterBuildSuccess":
      return { stateKey: "writing_llm", currentChapterNo: chapterNo, totalChapters, currentChapterTitle: title };
    case "LLMManuscriptFailed":
      return { stateKey: "llm_failed", totalChapters, currentChapterTitle: "원고 작성 실패" };
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
  const status = rawStatus === "done" ? "done" : rawStatus === "failed" ? "failed" : rawStatus || "running";
  const totalChapters = Number(progress.totalChapters || result?.chapterCount || ASTRO_PREMIUM_CHAPTERS.length);
  const currentChapterNo = clampAstroChapterNo(
    progress.currentChapterNo || (status === "done" ? totalChapters : 0),
    totalChapters,
  );
  return {
    ok: true,
    serviceKey: "astro-premium",
    data: {
      sessionId: clean(lock.sessionId || fallback.sessionId),
      reportId: clean(lock.reportId || fallback.reportId || result?.reportId),
      status,
      startedAt: clean(lock.startedAt || fallback.startedAt),
      completedAt: clean(lock.completedAt || result?.completedAt),
      failedAt: clean(lock.failedAt || fallback.failedAt),
      progress: {
        stateKey: clean(progress.stateKey || (status === "done" ? "completed" : status === "failed" ? "failed" : status === "not_found" ? "not_found" : "writing_seed")),
        currentChapterNo,
        totalChapters,
        currentChapterTitle: clean(progress.currentChapterTitle),
        manuscriptSource: clean(progress.manuscriptSource || result?.manuscriptSource),
        updatedAt: clean(progress.updatedAt),
      },
      result: status === "done" ? result : null,
      pdfReady: result?.pdfReady || null,
      canDownload: Boolean(result?.canDownload || clean(result?.pdfUrl || result?.downloadUrl || result?.htmlUrl || result?.pdfReady?.pdfUrl || result?.pdfReady?.downloadUrl)),
      error: lock.error || fallback.error || null,
    },
  };
}

function buildAstroPdfQualityGate(generated = {}) {
  const totalChapters = ASTRO_PREMIUM_CHAPTERS.length;
  const quality = generated?.quality && typeof generated.quality === "object" ? generated.quality : {};
  const stats = quality?.stats && typeof quality.stats === "object" ? quality.stats : {};
  const validation = generated?.validation && typeof generated.validation === "object" ? generated.validation : {};
  const llmChapterCount = Number(generated?.llmChapterCount || 0);
  const expectedLlmChapterCount = Number(generated?.expectedLlmChapterCount || generated?.diagnostics?.expectedLlmChapterCount || 0);
  const manuscriptSource = clean(generated?.manuscriptSource || quality?.manuscriptSource);
  const totalLength = Number(generated?.totalLength || 0);
  const allowedSources = new Set(["llm-only", "llm-local-hybrid", "hybrid-llm-local", "local-template", "local-rule-completed"]);
  const issues = [];
  if (!allowedSources.has(manuscriptSource)) issues.push("manuscript_source");
  if (expectedLlmChapterCount > 0 && llmChapterCount > expectedLlmChapterCount) issues.push("llm_chapter_over_limit");
  if (llmChapterCount > totalChapters) issues.push("llm_chapter_count");
  if (validation.ok !== true) issues.push("validation_failed");
  if (quality.ok !== true) issues.push("quality_failed");
  if (Number(stats.geminiChapterCount || 0) > totalChapters) issues.push("gemini_chapter_count");
  if (Number(stats.flaggedForbiddenSections || 0) > 0) issues.push("forbidden_sections");
  if (Number(stats.flaggedRiskySections || 0) > 0) issues.push("risky_sections");
  if (Number(stats.flaggedRepetitionSections || 0) > 0) issues.push("repetition_sections");
  if (totalLength < 50000) issues.push("total_length");
  return {
    ok: issues.length === 0,
    issues,
    totalChapters,
    llmChapterCount,
    expectedLlmChapterCount,
    manuscriptSource,
    totalLength,
    fallbackUsed: Boolean(generated?.fallbackUsed),
    llmFallbackReason: clean(generated?.llmFallbackReason),
    stats,
  };
}

async function handleAstroPremiumStatus(request, env) {
  const auth = await requireAuth(request, env);
  const url = new URL(request.url);
  const sessionId = clean(url.searchParams.get("sessionId") || url.searchParams.get("reportSessionId") || url.searchParams.get("generationId"));
  compactAstroPremiumLocks();
  const lock = sessionId ? astroPremiumGenerationLocks.get(sessionId) : null;
  if (!lock || (lock.userId && lock.userId !== auth.userId)) {
    return json(buildAstroStatusPayload({}, {
      sessionId,
      status: "not_found",
    }));
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

function buildVedicStatusPayloadFromArchive(doc = {}, sessionId = "", reportId = "") {
  const metadata = doc?.metadata && typeof doc.metadata === "object" ? doc.metadata : {};
  const archive = metadata?.archive && typeof metadata.archive === "object" ? metadata.archive : null;
  if (!archive) return null;
  const pdfReady = archive?.pdfReady && typeof archive.pdfReady === "object" ? archive.pdfReady : {};
  const resolvedReportId = clean(archive.reportId || doc.reportId || metadata.reportId || reportId);
  const resolvedSessionId = clean(archive.sessionId || doc.sessionId || metadata.sessionId || sessionId);
  const chapters = Array.isArray(archive.chapters) ? archive.chapters : [];
  return {
    ok: true,
    serviceKey: "vedic-premium",
    featureKey: VEDIC_PREMIUM_FEATURE_KEY,
    status: "completed",
    sessionId: resolvedSessionId,
    chapterCount: Number(archive.chapterCount || chapters.length || VEDIC_PREMIUM_CHAPTERS.length),
    fallbackUsed: Boolean(archive.fallbackUsed),
    llmChapterCount: Number(archive.llmChapterCount || 0),
    fallbackChapterCount: Number(archive.fallbackChapterCount || 0),
    llmFallbackReason: clean(archive.llmFallbackReason),
    reportId: resolvedReportId,
    chapters,
    chapterDrafts: Array.isArray(archive.chapterDrafts) ? archive.chapterDrafts : [],
    payload: archive.payload || archive.localVedicChartJson || null,
    localVedicChartJson: archive.localVedicChartJson || archive.payload || null,
    vedicMasterJson: archive.vedicMasterJson || null,
    masterJsonValidation: archive.masterJsonValidation || null,
    pdfReady,
    diagnostics: archive.diagnostics || metadata.diagnostics || null,
    llmFailureClass: clean(archive.llmFailureClass || archive?.diagnostics?.llm?.failureClass || metadata?.diagnostics?.llm?.failureClass),
    llmModel: clean(archive.llmModel || archive?.diagnostics?.llm?.model || metadata?.diagnostics?.llm?.model),
    llmAttempts: Array.isArray(archive.llmAttempts)
      ? archive.llmAttempts
      : Array.isArray(archive?.diagnostics?.llm?.attempts)
        ? archive.diagnostics.llm.attempts
        : [],
    pdfUrl: clean(archive.pdfUrl || pdfReady.pdfUrl || pdfReady.downloadUrl || pdfReady.htmlUrl),
    htmlUrl: clean(archive.htmlUrl || pdfReady.htmlUrl),
    downloadUrl: clean(archive.downloadUrl || pdfReady.downloadUrl || pdfReady.pdfUrl || pdfReady.htmlUrl),
    canReopen: archive.canReopen !== false,
    canDownload: Boolean(archive.canDownload || pdfReady.downloadUrl || pdfReady.pdfUrl || pdfReady.htmlUrl),
    quality: archive.quality || null,
    manuscriptSource: clean(archive.manuscriptSource || "llm-only"),
    localDraftChapterCount: Number(archive.localDraftChapterCount || 0),
    finalChapterCount: chapters.length,
  };
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

function normalizeVedicChartSourceForPdf(chartSource = {}) {
  return {
    planets: chartSource?.planets && typeof chartSource.planets === "object" ? chartSource.planets : {},
    retrograde: chartSource?.retrograde && typeof chartSource.retrograde === "object" ? chartSource.retrograde : {},
    ayanamsaName: clean(chartSource?.ayanamsaName || chartSource?.ayanamsaType || "Lahiri") || "Lahiri",
    ayanamsa: Number.isFinite(Number(chartSource?.ayanamsa)) ? Number(chartSource.ayanamsa) : undefined,
    ascendantSidereal: Number.isFinite(Number(chartSource?.ascendantSidereal ?? chartSource?.ascendant ?? chartSource?.lagnaLongitude))
      ? Number(chartSource?.ascendantSidereal ?? chartSource?.ascendant ?? chartSource?.lagnaLongitude)
      : null,
    source: clean(chartSource?.source || "server-local"),
  };
}

function hasUsableVedicChartSource(chartSource = {}) {
  const source = normalizeVedicChartSourceForPdf(chartSource);
  const requiredPlanets = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Rahu", "Ketu"];
  const hasAllPlanets = requiredPlanets.every((planet) => Number.isFinite(Number(source?.planets?.[planet])));
  const hasAsc = Number.isFinite(Number(source?.ascendantSidereal));
  return hasAllPlanets && hasAsc;
}

function extractProvidedVedicBase(rawInput = {}) {
  const candidates = [
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
  const provided = extractProvidedVedicBase(rawInput);
  if (provided && hasUsableVedicChartSource(provided)) {
    return {
      source: "provided",
      chartSource: normalizeVedicChartSourceForPdf(provided),
    };
  }

  try {
    const calculated = await getSwissVedicPlanets(env, toSwissVedicInputFromBirthInput(birthInput), { requestUrl });
    if (hasUsableVedicChartSource(calculated)) {
      return {
        source: "server-local",
        chartSource: normalizeVedicChartSourceForPdf(calculated),
      };
    }
  } catch (error) {
    console.warn("[VedicPremiumPDF][SwissChartUnavailable]", {
      reason: clean(error?.message || error),
    });
  }

  const error = new Error("베다 차트 계산을 완료하지 못했습니다. 출생 정보와 지역 정보를 확인해 주세요.");
  error.code = "VEDIC_CHART_SOURCE_INVALID";
  error.status = 422;
  throw error;
}

async function handleAstroPremiumPrepare(request, env) {
  let auth = null;
  let body = {};
  let sessionId = "";
  try {
    auth = await requireAuth(request, env);
    body = await readJson(request);
    sessionId = getAstroSessionId({
      ...body,
      sessionId: clean(body?.sessionId || body?.reportSessionId || body?.accessGrant?.sessionId),
      reportSessionId: clean(body?.reportSessionId || body?.accessGrant?.reportSessionId || body?.accessGrant?.sessionId),
    });
    const reportId = clean(body?.reportId || body?.accessGrant?.reportId || `astro-premium-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
    const premiumAccessToken = readPremiumAccessToken(request, body);
    const featureKey = clean(body?.featureKey || ASTRO_PREMIUM_FEATURE_KEY) || ASTRO_PREMIUM_FEATURE_KEY;
    const birthInput = normalizeAstroPremiumBirthInput(body);

    compactAstroPremiumLocks();
    const existingLock = astroPremiumGenerationLocks.get(sessionId);
    if (existingLock?.status === "running") {
      return json({
        ok: true,
        deduped: true,
        status: "running",
        sessionId,
        startedAt: existingLock.startedAt,
        progress: buildAstroStatusPayload(existingLock).data.progress,
      }, { status: 202 });
    }
    if (existingLock?.status === "done" && existingLock?.result) {
      return json({
        ...existingLock.result,
        deduped: true,
        serverStatus: "done",
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

    const validation = validateAstroPayloadForApi({ birthInput });
    if (!validation.ok) {
      const missingTime = validation.missing.includes("birthHour");
      astroPremiumGenerationLocks.set(sessionId, {
        sessionId,
        reportId,
        userId: auth.userId,
        status: "failed",
        startedAt: new Date().toISOString(),
        startedAtMs: Date.now(),
        stage: "birth-input-invalid",
        progress: {
          stateKey: "failed",
          currentChapterNo: 0,
          totalChapters: ASTRO_PREMIUM_CHAPTERS.length,
          currentChapterTitle: "출생 정보 확인 실패",
          updatedAt: new Date().toISOString(),
        },
      });
      return json({
        ok: false,
        code: "MISSING_ASTRO_DATA",
        message: missingTime
          ? "점성술 PDF는 상승궁과 하우스 계산을 위해 태어난 시간이 필요합니다. 프로필 카드에서 태어난 시간을 먼저 입력해주세요."
          : "점성술 계산 데이터가 부족합니다. 생년월일/출생정보를 먼저 확인해 주세요.",
        missing: validation.missing,
      }, { status: 422 });
    }

    console.info("[AstroPremiumPDF][BirthInputValidated]", toSafeBirthLog(birthInput, ASTRO_PREMIUM_CHAPTERS.length));
    console.info("[AstroPremiumPDF][LocalCalculationStart]", toSafeBirthLog(birthInput));

    const access = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "westernAstrologyPremium", {
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
    await startPremiumPdfExecution(env, auth.userId, executionCtx);
    updateAstroSessionProgress(sessionId, {
      stateKey: "local_calculation",
      currentChapterNo: 0,
      totalChapters: ASTRO_PREMIUM_CHAPTERS.length,
      currentChapterTitle: "출생 차트 계산",
    });

    const generated = await generateAstroPremiumReport(env, {
      ...body,
      sessionId,
      birthInput,
    }, {
      requestUrl: request.url,
      log: (stage, payload) => {
        const tag = `[AstroPremiumPDF][${stage}]`;
        const progressPatch = buildAstroProgressPatch(stage, payload || {});
        if (progressPatch) updateAstroSessionProgress(sessionId, progressPatch);
        if (stage === "LLMManuscriptFailed") {
          console.warn(tag, payload || {});
          return;
        }
        console.info(tag, payload || {});
      },
    });
    const pdfQuality = buildAstroPdfQualityGate(generated);
    if (!pdfQuality.ok) {
      const error = new Error("점성술 프리미엄 원고 작성이 완료되지 않았습니다.");
      error.code = pdfQuality.issues.includes("llm_chapter_count") || pdfQuality.issues.includes("fallback_used")
        ? "ASTRO_LLM_MANUSCRIPT_INCOMPLETE"
        : "ASTRO_PREMIUM_PDF_QUALITY_FAILED";
      error.status = 502;
      error.details = {
        llmChapterCount: Number(generated?.llmChapterCount || 0),
        fallbackUsed: Boolean(generated?.fallbackUsed),
        llmFallbackReason: clean(generated?.llmFallbackReason),
        pdfQuality,
      };
      throw error;
    }
    const requestOrigin = new URL(request.url).origin;
    const archiveUrl = `${requestOrigin}/api/premium/pdf-archive/${encodeURIComponent(reportId)}`;
    const archiveHtmlUrl = `${archiveUrl}?format=html`;
    const archivePdfUrl = `${archiveUrl}?format=pdf`;
    const pdfReady = {
      ...(generated?.pdfReady || {}),
      html: clean(generated?.pdfReady?.html || generated?.html || ""),
      filename: clean(generated?.pdfReady?.filename || `astro-premium-${reportId}.pdf`).replace(/\.html?$/i, ".pdf"),
      pdfUrl: withPdfArchiveFormat(generated?.pdfReady?.pdfUrl || generated?.pdfReady?.downloadUrl || archivePdfUrl, "pdf"),
      htmlUrl: withPdfArchiveFormat(generated?.pdfReady?.htmlUrl || archiveHtmlUrl, "html"),
      downloadUrl: withPdfArchiveFormat(generated?.pdfReady?.downloadUrl || generated?.pdfReady?.pdfUrl || archivePdfUrl, "pdf"),
      storageKey: clean(generated?.pdfReady?.storageKey || `premium-archive:astro:${reportId}`),
      mimeType: "application/pdf",
      contentType: "application/pdf",
      renderFormat: "pdf-archive",
    };
    const storedUrl = clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl || pdfReady?.htmlUrl);

    await completePremiumPdfExecution(env, auth.userId, executionCtx, reportId, {
      chapterCount: generated.chapterCount,
      manuscriptSource: generated.manuscriptSource,
      llmChapterCount: Number(generated?.llmChapterCount || 0),
      fallbackChapterCount: Number(generated?.fallbackChapterCount || 0),
      fallbackUsed: Boolean(generated?.fallbackUsed),
      llmFallbackReason: clean(generated?.llmFallbackReason),
      pdfQuality,
      archive: {
        reportId,
        reportType: "western_astrology_book",
        displayName: "점성술",
        title: `${clean(generated?.payload?.profile?.name || body?.name || "사용자")}님의 점성술 코즈믹 차트`,
        mode: clean(body?.mode || body?.reportMode || "personal"),
        birthName: clean(generated?.payload?.profile?.name || body?.name),
        summary: clean(generated?.finalManuscript?.[0]?.sections?.[0]?.body || generated?.chapters?.[0]?.categories?.[0]?.text || "", 1000),
        pdfUrl: clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl || pdfReady?.htmlUrl),
        htmlUrl: clean(pdfReady?.htmlUrl),
        downloadUrl: clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl || pdfReady?.htmlUrl),
        chapters: generated.chapters,
        chapterDrafts: generated.finalManuscript,
        manuscriptSource: clean(generated?.manuscriptSource || "llm-only"),
        llmChapterCount: Number(generated?.llmChapterCount || 0),
        expectedLlmChapterCount: Number(generated?.expectedLlmChapterCount || 0),
        enhancedChapterIds: Array.isArray(generated?.enhancedChapterIds) ? generated.enhancedChapterIds : [],
        promptVersion: clean(generated?.promptVersion),
        fallbackChapterCount: Number(generated?.fallbackChapterCount || 0),
        localDraftChapterCount: Number(generated?.localDraftChapterCount || 0),
        fallbackUsed: Boolean(generated?.fallbackUsed),
        llmFallbackReason: clean(generated?.llmFallbackReason),
        payload: generated.payload,
        localAstroChartJson: generated.localAstroChartJson,
        astroMasterJson: generated.astroMasterJson,
        masterJsonValidation: generated.masterJsonValidation,
        pdfReady,
        pdfQuality,
        diagnostics: generated.diagnostics,
        canReopen: true,
        canDownload: Boolean(storedUrl),
      },
    });

    const responsePayload = {
      ok: true,
      serviceKey: "astro-premium",
      featureKey,
      sessionId,
      status: "completed",
      chapterCount: generated.chapterCount,
      fallbackUsed: Boolean(generated?.fallbackUsed),
      llmChapterCount: Number(generated?.llmChapterCount || 0),
      expectedLlmChapterCount: Number(generated?.expectedLlmChapterCount || 0),
      enhancedChapterIds: Array.isArray(generated?.enhancedChapterIds) ? generated.enhancedChapterIds : [],
      promptVersion: clean(generated?.promptVersion),
      fallbackChapterCount: Number(generated?.fallbackChapterCount || 0),
      llmFallbackReason: clean(generated?.llmFallbackReason),
      pdfQuality,
      reportId,
      chapters: generated.chapters,
      chapterDrafts: generated.finalManuscript,
      payload: generated.payload,
      pdfReady,
      pdfUrl: clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl || pdfReady?.htmlUrl),
      htmlUrl: clean(pdfReady?.htmlUrl),
      downloadUrl: clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl || pdfReady?.htmlUrl),
      canReopen: true,
      canDownload: Boolean(storedUrl),
      localAstroChartJson: generated.localAstroChartJson,
      astroMasterJson: generated.astroMasterJson,
      masterJsonValidation: generated.masterJsonValidation,
      validation: generated.validation,
      validationWarning: Boolean(generated?.validationWarning),
      manuscriptSource: clean(generated?.manuscriptSource || "llm-only"),
      quality: generated.quality,
      finalManuscript: generated.finalManuscript,
      totalLength: generated.totalLength,
      localDraftChapterCount: Number(generated?.localDraftChapterCount || 0),
      finalChapterCount: Array.isArray(generated?.chapters) ? generated.chapters.length : 0,
      progress: {
        stateKey: "completed",
        currentChapterNo: ASTRO_PREMIUM_CHAPTERS.length,
        totalChapters: ASTRO_PREMIUM_CHAPTERS.length,
        currentChapterTitle: "완료",
        manuscriptSource: clean(generated?.manuscriptSource || "llm-only"),
      },
    };

    const previousLock = astroPremiumGenerationLocks.get(sessionId) || {};
    astroPremiumGenerationLocks.set(sessionId, {
      ...previousLock,
      sessionId,
      reportId,
      userId: auth.userId,
      status: "done",
      startedAt: previousLock.startedAt || new Date().toISOString(),
      startedAtMs: previousLock.startedAtMs || Date.now(),
      completedAt: new Date().toISOString(),
      stage: "done",
      progress: {
        ...(previousLock.progress || {}),
        ...responsePayload.progress,
        updatedAt: new Date().toISOString(),
      },
      result: responsePayload,
    });

    return json(responsePayload);
  } catch (error) {
    try {
      await failPremiumPdfExecution(
        env,
        auth?.userId,
        buildPremiumExecutionContext({
          serviceKey: "astro-premium",
          reportType: "westernAstrologyPremium",
          userId: auth?.userId,
          featureKey: String(body?.featureKey || ASTRO_PREMIUM_FEATURE_KEY),
          sessionId,
          reportId: clean(body?.reportId || body?.accessGrant?.reportId),
          access: null,
          body,
          timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
        }),
        "astro_generation_failed",
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
          currentChapterTitle: "생성 오류",
          updatedAt: new Date().toISOString(),
        },
        error: {
          code: clean(error?.code || "ASTRO_PREMIUM_GENERATION_FAILED"),
          message: clean(error?.message || "점성술 프리미엄 PDF 생성에 실패했습니다."),
        },
      });
    }
    console.error("[AstroPremiumPDF][FailureTrace]", toAstroFailureTrace(error, body, normalizeAstroPremiumBirthInput(body)));
    console.error("[AstroPremiumPDF][Error]", {
      ...toAstroErrorMeta(error),
      details: normalizeAstroError(error),
    });
    const rawMessage = clean(error?.message || "점성술 프리미엄 PDF 생성에 실패했습니다.");
    const userFacingMessage = rawMessage.includes("태어난 시간") || rawMessage.includes("birth")
      ? "점성술 PDF 생성에 필요한 출생시 정보가 부족합니다. 프로필 카드에서 태어난 시간을 확인해 주세요."
      : rawMessage.includes("원고") || rawMessage.includes("검증")
        ? "생성된 점성술 원고가 품질 기준을 통과하지 못했습니다. 잠시 후 다시 시도해 주세요."
        : rawMessage.includes("Swiss") || rawMessage.includes("차트")
          ? "점성술 차트 계산 중 일시적 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
          : "점성술 PDF 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    return json({
      ok: false,
      code: error?.code || "ASTRO_PREMIUM_GENERATION_FAILED",
      message: userFacingMessage,
      debugSafe: {
        stage: "llm-generation",
        sessionId,
        reportId: clean(body?.reportId || body?.accessGrant?.reportId),
        originalCode: error?.code || null,
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
  try {
    auth = await requireAuth(request, env);
    body = await readJson(request);
    vedicSessionId = getVedicSessionId(body);
    const premiumAccessToken = readPremiumAccessToken(request, body);
    const featureKey = String(body?.featureKey || VEDIC_PREMIUM_FEATURE_KEY);
    birthInput = normalizeVedicPremiumBirthInput(body);

    compactVedicPremiumLocks();
    const existingLock = vedicPremiumGenerationLocks.get(vedicSessionId);
    if (existingLock?.status === "running") {
      return json({
        ok: true,
        deduped: true,
        status: "running",
        sessionId: vedicSessionId,
        reportId: clean(existingLock.reportId || body?.reportId || body?.accessGrant?.reportId),
        startedAt: existingLock.startedAt,
        stage: clean(existingLock.stage || "running"),
        retryAfterMs: VEDIC_STATUS_RETRY_AFTER_MS,
      }, { status: 202 });
    }
    if (existingLock?.status === "done" && existingLock?.result) {
      return json({
        ...existingLock.result,
        deduped: true,
        status: "completed",
        sessionId: vedicSessionId,
      });
    }

    vedicPremiumGenerationLocks.set(vedicSessionId, {
      sessionId: vedicSessionId,
      reportId: clean(body?.reportId || body?.accessGrant?.reportId),
      status: "running",
      startedAt: new Date().toISOString(),
      startedAtMs: Date.now(),
      stage: "request-received",
    });

    console.info("[VedicPremiumPDF][RequestReceived]", {
      userId: auth.userId,
      featureKey,
      hasPremiumAccessToken: Boolean(premiumAccessToken),
    });

    const birthValidation = validateVedicBirthInput(birthInput);
    if (!birthValidation.ok) {
      vedicPremiumGenerationLocks.set(vedicSessionId, {
        sessionId: vedicSessionId,
        status: "failed",
        startedAt: new Date().toISOString(),
        startedAtMs: Date.now(),
        stage: "birth-input-invalid",
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

    const access = await requirePremiumReportAccess(withPdfFastDbEnv(env), auth.userId, "vedicPremium", {
      ...body,
      reportType: "vedicPremium",
      featureKey,
      premiumAccessToken: premiumAccessToken || undefined,
      _accessRoute: "/api/vedic/premium/prepare",
    });

    if (!access?.ok) {
      vedicPremiumGenerationLocks.set(vedicSessionId, {
        sessionId: vedicSessionId,
        status: "failed",
        startedAt: new Date().toISOString(),
        startedAtMs: Date.now(),
        stage: "access-denied",
        error: {
          code: clean(access?.code || "UNAUTHORIZED"),
          message: clean(access?.message || "베다점 프리미엄 PDF 접근 권한이 필요합니다."),
        },
      });
      console.error("[VedicPremiumPDF][Error]", {
        code: String(access?.code || "UNAUTHORIZED"),
        message: String(access?.message || "베다점 프리미엄 PDF 접근 권한이 필요합니다."),
        ...toSafeVedicBirthLog(birthInput, VEDIC_PREMIUM_CHAPTERS.length),
      });
      return json({
        ok: false,
        code: access?.code || "UNAUTHORIZED",
        message: access?.message || "베다점 프리미엄 PDF 접근 권한이 필요합니다.",
      }, { status: Number(access?.status) || 403 });
    }

    executionCtx = buildPremiumExecutionContext({
      serviceKey: "vedic-premium",
      reportType: "vedicPremium",
      userId: auth.userId,
      featureKey,
      sessionId: vedicSessionId,
      reportId: clean(body?.reportId || body?.accessGrant?.reportId),
      access,
      body,
      timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
    });
    await startPremiumPdfExecution(env, auth.userId, executionCtx);

    const resolved = await resolveVedicChartForPremiumPdf(body, birthInput, env, request.url);
    if (!hasUsableVedicChartSource(resolved?.chartSource)) {
      const error = new Error("베다 차트 계산을 완료하지 못했습니다. 출생 정보와 지역 정보를 확인해 주세요.");
      error.code = "VEDIC_CHART_SOURCE_INVALID";
      error.status = 422;
      throw error;
    }

    const preparedPayload = {
      ...body,
      birthInput,
      vedicBase: {
        ...(body?.vedicBase && typeof body.vedicBase === "object" ? body.vedicBase : {}),
        birthInput,
        chart: resolved.chartSource,
      },
    };

    const generated = await generateVedicPremiumReport(env, preparedPayload, {
      log: (stage, payload) => {
        const tag = `[VedicPremiumPDF][${stage}]`;
        if (stage === "LLMManuscriptFailed") {
          console.warn(tag, payload || {});
          return;
        }
        console.info(tag, payload || {});
      },
    });
    if (!generated?.diagnostics?.manuscript?.ok) {
      const error = new Error("베다점 프리미엄 원고 검증에 실패했습니다.");
      error.code = "VEDIC_MANUSCRIPT_INVALID";
      error.status = 422;
      throw error;
    }
    if (
      generated?.fallbackUsed
      || generated?.diagnostics?.llm?.failed
      || clean(generated?.manuscriptSource) !== "hybrid-llm-local"
      || Number(generated?.llmChapterCount || 0) < 1
    ) {
      console.warn("[VedicPremiumPDF][HybridFallbackUsed]", {
        manuscriptSource: clean(generated?.manuscriptSource),
        llmChapterCount: Number(generated?.llmChapterCount || 0),
        fallbackChapterCount: Number(generated?.fallbackChapterCount || 0),
        fallbackReason: clean(generated?.llmFallbackReason),
        llmFailed: Boolean(generated?.diagnostics?.llm?.failed),
      });
    }
    const reportId = clean(body?.reportId || body?.accessGrant?.reportId || `vedic-premium-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
    const requestOrigin = new URL(request.url).origin;
    const archiveUrl = `${requestOrigin}/api/premium/pdf-archive/${encodeURIComponent(reportId)}`;
    const archiveHtmlUrl = `${archiveUrl}?format=html`;
    const archivePdfUrl = `${archiveUrl}?format=pdf`;
    const pdfReady = {
      ...(generated?.pdfReady || {}),
      html: clean(generated?.pdfReady?.html || generated?.html || "") || String(generated?.pdfReady?.html || generated?.html || ""),
      filename: clean(generated?.pdfReady?.filename || `vedic-premium-${reportId}.pdf`).replace(/\.html?$/i, ".pdf") || `vedic-premium-${reportId}.pdf`,
      pdfUrl: withPdfArchiveFormat(generated?.pdfReady?.pdfUrl || generated?.pdfReady?.downloadUrl || archivePdfUrl, "pdf"),
      htmlUrl: withPdfArchiveFormat(generated?.pdfReady?.htmlUrl || archiveHtmlUrl, "html"),
      downloadUrl: withPdfArchiveFormat(generated?.pdfReady?.downloadUrl || generated?.pdfReady?.pdfUrl || archivePdfUrl, "pdf"),
      storageKey: clean(generated?.pdfReady?.storageKey || `premium-archive:vedic:${reportId}`),
      mimeType: "application/pdf",
      contentType: "application/pdf",
      renderFormat: "pdf-archive",
    };
    const storedUrl = clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl || pdfReady?.htmlUrl);

    await completePremiumPdfExecution(env, auth.userId, executionCtx, reportId, {
      chapterCount: generated.chapterCount,
      manuscriptSource: generated.manuscriptSource,
      llmChapterCount: Number(generated?.llmChapterCount || 0),
      fallbackChapterCount: Number(generated?.fallbackChapterCount || 0),
      fallbackUsed: Boolean(generated?.fallbackUsed),
      llmFallbackReason: clean(generated?.llmFallbackReason),
      archive: {
        reportId,
        reportType: "vedic_book",
        displayName: "베다점",
        title: `${clean(birthInput?.name || generated?.payload?.profile?.name || body?.name || "사용자")}님의 베다점 리포트`,
        mode: clean(body?.mode || body?.reportMode || "personal"),
        birthName: clean(birthInput?.name || generated?.payload?.profile?.name || body?.name),
        summary: clean(generated?.chapterDrafts?.[0]?.sections?.[0]?.body || generated?.chapters?.[0]?.categories?.[0]?.body || "", 1000),
        pdfUrl: clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl || pdfReady?.htmlUrl),
        htmlUrl: clean(pdfReady?.htmlUrl),
        downloadUrl: clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl || pdfReady?.htmlUrl),
        chapters: generated.chapters,
        chapterDrafts: generated.chapterDrafts,
        manuscriptSource: clean(generated?.manuscriptSource || "llm-only"),
        llmChapterCount: Number(generated?.llmChapterCount || 0),
        fallbackChapterCount: Number(generated?.fallbackChapterCount || 0),
        localDraftChapterCount: Number(generated?.localDraftChapterCount || 0),
        fallbackUsed: Boolean(generated?.fallbackUsed),
        llmFallbackReason: clean(generated?.llmFallbackReason),
        llmFailureClass: clean(generated?.diagnostics?.llm?.failureClass),
        diagnostics: generated.diagnostics,
        quality: generated.quality,
        llmModel: clean(generated?.diagnostics?.llm?.model),
        llmAttempts: Array.isArray(generated?.diagnostics?.llm?.attempts) ? generated.diagnostics.llm.attempts : [],
        payload: generated.payload,
        localVedicChartJson: generated.localVedicChartJson,
        vedicMasterJson: generated.vedicMasterJson,
        masterJsonValidation: generated.masterJsonValidation,
        pdfReady,
        canReopen: true,
        canDownload: Boolean(storedUrl),
      },
    });

    const responsePayload = {
      ok: true,
      serviceKey: "vedic-premium",
      featureKey,
      status: "completed",
      sessionId: vedicSessionId,
      chapterCount: generated.chapterCount,
      fallbackUsed: Boolean(generated?.fallbackUsed),
      llmChapterCount: Number(generated?.llmChapterCount || 0),
      fallbackChapterCount: Number(generated?.fallbackChapterCount || 0),
      llmFallbackReason: clean(generated?.llmFallbackReason),
      llmFailureClass: clean(generated?.diagnostics?.llm?.failureClass),
      reportId,
      chapters: generated.chapters,
      chapterDrafts: generated.chapterDrafts,
      payload: generated.payload,
      localVedicChartJson: generated.localVedicChartJson,
      vedicMasterJson: generated.vedicMasterJson,
      masterJsonValidation: generated.masterJsonValidation,
      pdfReady,
      diagnostics: generated.diagnostics,
      llmModel: clean(generated?.diagnostics?.llm?.model),
      llmAttempts: Array.isArray(generated?.diagnostics?.llm?.attempts) ? generated.diagnostics.llm.attempts : [],
      pdfUrl: clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl || pdfReady?.htmlUrl),
      htmlUrl: clean(pdfReady?.htmlUrl),
      downloadUrl: clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl || pdfReady?.htmlUrl),
      canReopen: true,
      canDownload: Boolean(storedUrl),
      quality: generated.quality,
      manuscriptSource: clean(generated?.manuscriptSource || "llm-only"),
      localDraftChapterCount: Number(generated?.localDraftChapterCount || 0),
      finalChapterCount: Array.isArray(generated?.chapters) ? generated.chapters.length : 0,
    };

    vedicPremiumGenerationLocks.set(vedicSessionId, {
      sessionId: vedicSessionId,
      status: "done",
      startedAt: new Date().toISOString(),
      startedAtMs: Date.now(),
      stage: "done",
      result: responsePayload,
    });

    return json(responsePayload);
  } catch (error) {
    await failPremiumPdfExecution(
      env,
      auth?.userId,
      executionCtx || buildPremiumExecutionContext({
        serviceKey: "vedic-premium",
        reportType: "vedicPremium",
        userId: auth?.userId,
        featureKey: String(body?.featureKey || VEDIC_PREMIUM_FEATURE_KEY),
        sessionId: vedicSessionId || clean(body?.sessionId || body?.reportSessionId || body?.generationId),
        reportId: clean(body?.reportId || body?.accessGrant?.reportId),
        access: null,
        body,
        timeoutSeconds: Number(env?.PREMIUM_PDF_GRACE_TIMEOUT_SECONDS || 1800),
      }),
      "vedic_generation_failed",
      clean(error?.message || "베다점 프리미엄 PDF 생성에 실패했습니다."),
      "vedic-generation",
    );
    console.error("[VedicPremiumPDF][Error]", {
      code: String(error?.code || "VEDIC_PREMIUM_GENERATION_FAILED"),
      message: String(error?.message || "베다점 프리미엄 PDF 생성에 실패했습니다."),
      status: Number(error?.status || 500),
      details: normalizeVedicError(error),
    });
    if (vedicSessionId) {
      vedicPremiumGenerationLocks.set(vedicSessionId, {
        sessionId: vedicSessionId,
        status: "failed",
        startedAt: new Date().toISOString(),
        startedAtMs: Date.now(),
        stage: "error",
        error: {
          code: clean(error?.code || "VEDIC_PREMIUM_GENERATION_FAILED"),
          reasonClass: clean(error?.reasonClass),
          details: normalizeVedicError(error),
          message: clean(error?.message || "베다점 프리미엄 PDF 생성에 실패했습니다."),
        },
      });
    }
    throw error;
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
  const lock = sessionId
    ? vedicPremiumGenerationLocks.get(sessionId)
    : Array.from(vedicPremiumGenerationLocks.values()).find((state) => clean(state?.result?.reportId) === reportId);
  if (lock?.status === "running") {
    return json({
      ok: true,
      serviceKey: "vedic-premium",
      featureKey: VEDIC_PREMIUM_FEATURE_KEY,
      status: "running",
      sessionId: clean(lock.sessionId || sessionId),
      reportId,
      startedAt: lock.startedAt,
      stage: clean(lock.stage || "running"),
      retryAfterMs: VEDIC_STATUS_RETRY_AFTER_MS,
    }, { status: 202 });
  }
  if (lock?.status === "done" && lock?.result) {
    return json({
      ...lock.result,
      deduped: true,
      status: "completed",
      sessionId: clean(lock.sessionId || lock.result.sessionId || sessionId),
    });
  }
  if (lock?.status === "failed") {
    return json({
      ok: false,
      serviceKey: "vedic-premium",
      featureKey: VEDIC_PREMIUM_FEATURE_KEY,
      status: "failed",
      sessionId: clean(lock.sessionId || sessionId),
      reportId,
      code: clean(lock?.error?.code || "VEDIC_PREMIUM_GENERATION_FAILED"),
      reasonClass: clean(lock?.error?.reasonClass),
      details: lock?.error?.details || null,
      failureStage: clean(lock.stage || "generation"),
      message: clean(lock?.error?.message || "베다점 PDF 생성이 완료되지 않았습니다. 다시 시도해 주세요."),
    });
  }

  await connectDb(env);
  const query = {
    userId: auth.userId,
    ...(sessionId ? { sessionId } : { reportId }),
    $or: [
      { reportType: "vedicPremium" },
      { "metadata.reportType": "vedicPremium" },
      { "metadata.serviceKey": "vedic-premium" },
      { "metadata.archive.reportType": "vedic_book" },
    ],
  };
  const doc = await ServiceExecutionTransaction.findOne(query).sort({ createdAt: -1 }).lean();
  if (!doc) {
    return json({
      ok: true,
      serviceKey: "vedic-premium",
      featureKey: VEDIC_PREMIUM_FEATURE_KEY,
      status: "running",
      sessionId,
      reportId,
      stage: "waiting-for-result",
      retryAfterMs: VEDIC_STATUS_RETRY_AFTER_MS,
    }, { status: 202 });
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
    retryAfterMs: VEDIC_STATUS_RETRY_AFTER_MS,
  }, { status: 202 });
}

export async function handleAstroRoutes(request, env) {
  try {
    const method = request.method.toUpperCase();
    const pathname = new URL(request.url).pathname;

    if (method === "POST") {
      await requireAuth(request, env);
    }

    if (pathname === "/api/astro" || pathname.startsWith("/api/astro/")) {
      const path = getRoutePath(request, "/api/astro");
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
      if (path === "/premium/chapters") {
        if (method !== "GET") return methodNotAllowed();
        return json({
          ok: true,
          featureKey: VEDIC_PREMIUM_FEATURE_KEY,
          chapterCount: VEDIC_PREMIUM_CHAPTERS.length,
          chapters: VEDIC_PREMIUM_CHAPTERS,
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
