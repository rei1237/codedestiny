import { getSwissVedicPlanets, getSwissWesternChart } from "../lib/swiss-ephemeris.js";
import { cookieValue, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { ASTRO_PREMIUM_CHAPTERS, ASTRO_PREMIUM_FEATURE_KEY } from "../lib/astro-premium-chapters.js";
import {
  ASTRO_PDF_CONFIG,
  buildAstroLocalChartJson,
  hasUsableSwissAstroChart,
  normalizeAstroPremiumBirthInput,
  validateAstroPdfCompletionPayload,
  validateAstroPayloadForApi,
} from "../lib/astro-premium-generator.js";
import { generateAstrologyLocalPdf } from "../pdf-v2/astrology-local-pdf.js";
import { generateVedicLocalPdf } from "../pdf-v2/vedic-local-pdf.js";
import { VEDIC_PREMIUM_CHAPTERS, VEDIC_PREMIUM_FEATURE_KEY } from "../lib/vedic-premium-chapters.js";
import {
  VEDIC_PDF_CONFIG,
  buildVedicLocalChartJson,
  generateVedicPremiumReport,
  normalizeVedicError,
  normalizeVedicPremiumBirthInput,
  validateVedicPremiumChartSourceQuality,
  validateVedicPdfCompletionPayload,
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

const ASTRO_PREMIUM_LOCK_TTL_MS = 15 * 60 * 1000;
const ASTRO_STATUS_RETRY_AFTER_MS = 4000;
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
    stage: clean(error?.stage || details?.stage || "local-assembly") || "local-assembly",
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
    case "LocalAssembledManuscriptReady":
      return { stateKey: "writing_seed", currentChapterNo: 0, totalChapters, currentChapterTitle: "원고 작성 신호 구성" };
    case "LocalAssembledManuscriptSuccess":
      return { stateKey: "writing_local", currentChapterNo: totalChapters, totalChapters, currentChapterTitle: "원고 로컬 조립 완료" };
    case "LocalAssembledManuscriptFailed":
      return { stateKey: "failed", totalChapters, currentChapterTitle: "원고 작성 실패" };
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
      retryAfterMs: status === "running" ? ASTRO_STATUS_RETRY_AFTER_MS : undefined,
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
  const localAssembly = archive.localAssembly || pdfReady.localAssembly || null;
  const chapterCount = Number(archive.chapterCount || chapters.length || ASTRO_PREMIUM_CHAPTERS.length);
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
    manuscriptSource,
    localAssembly,
    localDraftChapterCount: Number(archive.localDraftChapterCount || pdfReady.localDraftChapterCount || 0),
    finalChapterCount: chapters.length,
    progress: {
      stateKey: "completed",
      currentChapterNo: ASTRO_PREMIUM_CHAPTERS.length,
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

function buildAstroPdfQualityGate(generated = {}) {
  const totalChapters = ASTRO_PREMIUM_CHAPTERS.length;
  const quality = generated?.quality && typeof generated.quality === "object" ? generated.quality : {};
  const stats = quality?.stats && typeof quality.stats === "object" ? quality.stats : {};
  const validation = generated?.validation && typeof generated.validation === "object" ? generated.validation : {};
  const localAstroChartJson = generated?.localAstroChartJson && typeof generated.localAstroChartJson === "object" ? generated.localAstroChartJson : {};
  const chart = localAstroChartJson?.chart && typeof localAstroChartJson.chart === "object" ? localAstroChartJson.chart : {};
  const timingInsights = localAstroChartJson?.timingInsights && typeof localAstroChartJson.timingInsights === "object" ? localAstroChartJson.timingInsights : {};
  const transitValidation = generated?.transitValidation && typeof generated.transitValidation === "object" ? generated.transitValidation : {};
  const chartSource = clean(localAstroChartJson.chartSource || localAstroChartJson.calculationSource || chart.chartSource || chart.source);
  const engineQuality = clean(localAstroChartJson.engineQuality || chart.engineQuality).toLowerCase();
  const houseSystem = clean(localAstroChartJson.houseSystem || chart.houseSystem).toLowerCase();
  const fallbackUsed = localAstroChartJson.fallbackUsed === true
    || chart.fallbackUsed === true
    || engineQuality === "fallback"
    || /fallback/i.test(chartSource);
  const manuscriptSource = clean(generated?.manuscriptSource || quality?.manuscriptSource);
  const localDraftChapterCount = Number(generated?.localDraftChapterCount || 0);
  const localAssembly = generated?.localAssembly && typeof generated.localAssembly === "object" ? generated.localAssembly : {};
  const totalLength = Number(generated?.totalLength || 0);
  const issues = [];
  if (manuscriptSource !== ASTRO_PDF_CONFIG.generationMode) issues.push("manuscript_source");
  if (manuscriptSource !== ASTRO_PDF_CONFIG.generationMode) issues.push("non_local_manuscript_source");
  if (localDraftChapterCount !== totalChapters) issues.push("local_draft_chapter_count");
  if (localAssembly.enabled !== true) issues.push("local_assembly");
  if (localAssembly.externalGeneration !== false) issues.push("external_generation");
  if (Number(localAssembly.chapterCount || 0) !== totalChapters) issues.push("local_assembly_chapter_count");
  if (Number(localAssembly.expectedChapterCount || 0) !== totalChapters) issues.push("local_assembly_expected_chapter_count");
  if (clean(localAssembly.templateVersion) !== ASTRO_PDF_CONFIG.templateVersion) issues.push("local_assembly_version");
  if (validation.ok !== true) issues.push("validation_failed");
  if (quality.ok !== true) issues.push("quality_failed");
  if (Number(stats.nonLocalChapterCount || 0) > 0) issues.push("non_local_chapter_count");
  if (Number(stats.nonLocalSectionCount || 0) > 0) issues.push("non_local_section_count");
  if (Number(stats.flaggedForbiddenSections || 0) > 0) issues.push("forbidden_sections");
  if (Number(stats.flaggedRiskySections || 0) > 0) issues.push("risky_sections");
  if (Number(stats.flaggedRepetitionSections || 0) > 0) issues.push("repetition_sections");
  if (totalLength < 50000) issues.push("total_length");
  if (!["swiss-wasm-local", "external-swiss-api"].includes(chartSource)) issues.push("non_swiss_chart_source");
  if (engineQuality !== "swiss") issues.push("non_swiss_engine_quality");
  if (houseSystem !== "placidus") issues.push("non_placidus_house_system");
  if (fallbackUsed) issues.push("fallback_chart_source");
  if (clean(timingInsights.source) !== "western-transit-swiss") issues.push("non_swiss_transit_source");
  if (clean(timingInsights.engineQuality) !== "swiss-transit") issues.push("non_swiss_transit_engine");
  if (timingInsights.fallbackUsed === true) issues.push("fallback_transit_source");
  if (transitValidation.ok !== true) issues.push("transit_validation_failed");
  return {
    ok: issues.length === 0,
    issues,
    totalChapters,
    localDraftChapterCount,
    manuscriptSource,
    totalLength,
    localAssembly,
    stats,
    chartSource,
    engineQuality,
    houseSystem,
    fallbackUsed,
    transitValidation,
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
    const doc = await ServiceExecutionTransaction.findOne({
      userId: auth.userId,
      ...(sessionId ? { sessionId } : { reportId }),
      $or: [
        { reportType: "westernAstrologyPremium" },
        { "metadata.reportType": "westernAstrologyPremium" },
        { "metadata.serviceKey": "astro-premium" },
        { "metadata.archive.reportType": "western_astrology_book" },
      ],
    }).sort({ completedAt: -1, updatedAt: -1, createdAt: -1 }).lean();

    if (!doc) {
      return json(buildAstroStatusPayload({
        sessionId,
        reportId,
        status: "failed",
        failedAt: new Date().toISOString(),
        progress: {
          stateKey: "failed",
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
  const max = Math.max(1, Number(total || VEDIC_PREMIUM_CHAPTERS.length || 12));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(max, Math.trunc(n)));
}

function updateVedicSessionProgress(sessionId, progress = {}) {
  const key = clean(sessionId);
  if (!key || !vedicPremiumGenerationLocks.has(key)) return;
  const lock = vedicPremiumGenerationLocks.get(key) || {};
  vedicPremiumGenerationLocks.set(key, {
    ...lock,
    progress: {
      ...(lock.progress || {}),
      ...progress,
      totalChapters: Number(progress.totalChapters || lock.progress?.totalChapters || VEDIC_PREMIUM_CHAPTERS.length),
      updatedAt: new Date().toISOString(),
    },
  });
}

function buildVedicProgressPatch(stage, payload = {}) {
  const totalChapters = VEDIC_PREMIUM_CHAPTERS.length;
  const chapterNo = clampVedicChapterNo(payload?.chapterNo || payload?.chapter || payload?.completed, totalChapters);
  switch (stage) {
    case "LocalCalculationJsonPrepared":
      return { stateKey: "local_calculation", currentChapterNo: 0, totalChapters, currentChapterTitle: "베다 차트 근거 정리" };
    case "LocalAssembledManuscriptReady":
      return { stateKey: "writing_seed", currentChapterNo: 0, totalChapters, currentChapterTitle: "상담 원고 신호 구성" };
    case "LocalAssembledManuscriptSuccess":
      return { stateKey: "writing_local", currentChapterNo: totalChapters, totalChapters, currentChapterTitle: "상담 원고 조립 완료" };
    case "LocalAssembledManuscriptFailed":
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
  const status = rawStatus === "done" ? "done" : rawStatus === "failed" ? "failed" : rawStatus || "running";
  const totalChapters = Number(progress.totalChapters || result?.chapterCount || VEDIC_PREMIUM_CHAPTERS.length);
  const currentChapterNo = clampVedicChapterNo(
    progress.currentChapterNo || (status === "done" ? totalChapters : 0),
    totalChapters,
  );
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

function buildVedicStatusPayloadFromArchive(doc = {}, sessionId = "", reportId = "") {
  const metadata = doc?.metadata && typeof doc.metadata === "object" ? doc.metadata : {};
  const archive = metadata?.archive && typeof metadata.archive === "object" ? metadata.archive : null;
  if (!archive) return null;
  const pdfReady = archive?.pdfReady && typeof archive.pdfReady === "object" ? archive.pdfReady : {};
  const resolvedReportId = clean(archive.reportId || doc.reportId || metadata.reportId || reportId);
  const resolvedSessionId = clean(archive.sessionId || doc.sessionId || metadata.sessionId || sessionId);
  const chapters = Array.isArray(archive.chapters) ? archive.chapters : [];
  const manuscriptSource = clean(archive.manuscriptSource || pdfReady.manuscriptSource || VEDIC_PDF_CONFIG.generationMode);
  const localAssembly = archive.localAssembly || pdfReady.localAssembly || null;
  return {
    ok: true,
    serviceKey: "vedic-premium",
    featureKey: VEDIC_PREMIUM_FEATURE_KEY,
    status: "completed",
    sessionId: resolvedSessionId,
    chapterCount: Number(archive.chapterCount || chapters.length || VEDIC_PREMIUM_CHAPTERS.length),
    localAssembly,
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
    localDraftChapterCount: Number(archive.localDraftChapterCount || 0),
    finalChapterCount: chapters.length,
    progress: {
      stateKey: "completed",
      currentChapterNo: VEDIC_PREMIUM_CHAPTERS.length,
      totalChapters: VEDIC_PREMIUM_CHAPTERS.length,
      currentChapterTitle: "완료",
      manuscriptSource,
    },
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
    console.warn("[VedicPremiumPDF][SwissChartQualityRejected]", {
      issues: chartSourceQuality.issues,
      source: chartSourceQuality.source,
      qualityScore: chartSourceQuality.qualityScore,
    });
  } catch (error) {
    console.warn("[VedicPremiumPDF][SwissChartUnavailable]", {
      reason: clean(error?.message || error),
    });
  }

  const provided = extractProvidedVedicBase(rawInput);
  if (allowProvidedVedicPremiumChartSource(env) && provided) {
    const chartSource = normalizeVedicChartSourceForPdf(provided);
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
    console.warn("[VedicPremiumPDF][ProvidedChartQualityRejected]", {
      issues: chartSourceQuality.issues,
      source: chartSourceQuality.source,
      qualityScore: chartSourceQuality.qualityScore,
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
  const pdfDbEnv = withPdfFastDbEnv(env);
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
      const missingLocation = ["birthPlace", "latitude", "longitude"].some((key) => validation.missing.includes(key));
      const missingTimezone = ["timezone", "timezoneOffsetHours"].some((key) => validation.missing.includes(key));
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
          : missingLocation
            ? "점성술 PDF는 상승궁·하우스·천정점 계산을 위해 출생지와 좌표가 필요합니다. 프로필 카드에서 태어난 지역을 먼저 선택해주세요."
            : missingTimezone
              ? "점성술 PDF는 정확한 하우스 계산을 위해 출생지 시간대가 필요합니다. 프로필 카드에서 태어난 지역을 다시 선택해주세요."
          : "점성술 계산 데이터가 부족합니다. 생년월일/출생정보를 먼저 확인해 주세요.",
        missing: validation.missing,
      }, { status: 422 });
    }

    console.info("[AstroPremiumPDF][BirthInputValidated]", toSafeBirthLog(birthInput, ASTRO_PREMIUM_CHAPTERS.length));
    console.info("[AstroPremiumPDF][LocalCalculationStart]", toSafeBirthLog(birthInput));

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
    updateAstroSessionProgress(sessionId, {
      stateKey: "local_calculation",
      currentChapterNo: 0,
      totalChapters: ASTRO_PREMIUM_CHAPTERS.length,
      currentChapterTitle: "출생 차트 계산",
    });

    const generated = await generateAstrologyLocalPdf({
      ...body,
      sessionId,
      birthInput,
    }, {
      env,
      requestUrl: request.url,
      log: (stage, payload) => {
        const tag = `[AstroPremiumPDF][${stage}]`;
        const progressPatch = buildAstroProgressPatch(stage, payload || {});
        if (progressPatch) updateAstroSessionProgress(sessionId, progressPatch);
        if (stage === "LocalAssembledManuscriptFailed") {
          console.warn(tag, payload || {});
          return;
        }
        console.info(tag, payload || {});
      },
    });
    const pdfQuality = buildAstroPdfQualityGate(generated);
    if (!pdfQuality.ok) {
      const error = new Error("점성술 프리미엄 원고 작성이 완료되지 않았습니다.");
      error.code = "ASTRO_PREMIUM_PDF_QUALITY_FAILED";
      error.status = 502;
      error.details = {
        localAssembly: generated?.localAssembly || null,
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
      manuscriptSource: clean(generated?.manuscriptSource || ASTRO_PDF_CONFIG.generationMode),
      localAssembly: generated?.localAssembly || {
        enabled: true,
        source: ASTRO_PDF_CONFIG.generationMode,
        provider: ASTRO_PDF_CONFIG.provider,
        templateVersion: ASTRO_PDF_CONFIG.templateVersion,
        chapterCount: Number(generated?.chapterCount || ASTRO_PREMIUM_CHAPTERS.length),
        expectedChapterCount: ASTRO_PREMIUM_CHAPTERS.length,
        externalGeneration: false,
      },
      localDraftChapterCount: Number(generated?.localDraftChapterCount || 0),
    };
    const storedUrl = clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl || pdfReady?.htmlUrl);
    const pdfCompletionValidation = validateAstroPdfCompletionPayload({
      pdfReady,
      chapters: generated.finalManuscript,
      payload: generated.localAstroChartJson || generated.payload,
      requireDownloadUrl: true,
    });
    if (!pdfCompletionValidation.ok) {
      const error = new Error("점성술 PDF 완료 검증에 실패했습니다.");
      error.code = "ASTRO_REPORT_COMPLETION_INVALID";
      error.status = 500;
      error.issues = pdfCompletionValidation.issues;
      throw error;
    }
    pdfReady.pdfCompletionValidation = pdfCompletionValidation;

    await completePremiumPdfExecution(pdfDbEnv, auth.userId, executionCtx, reportId, {
      chapterCount: generated.chapterCount,
      manuscriptSource: generated.manuscriptSource || ASTRO_PDF_CONFIG.generationMode,
      localAssembly: generated?.localAssembly || pdfReady.localAssembly,
      pdfQuality,
      pdfCompletionValidation,
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
        manuscriptSource: clean(generated?.manuscriptSource || ASTRO_PDF_CONFIG.generationMode),
        generationMode: clean(generated?.generationMode || ASTRO_PDF_CONFIG.generationMode),
        provider: clean(generated?.provider || ASTRO_PDF_CONFIG.provider),
        writingPipeline: clean(generated?.writingPipeline || "local-calculation-to-local-assembled-pdf"),
        localAssembly: generated?.localAssembly || pdfReady.localAssembly,
        assemblyVersion: clean(generated?.assemblyVersion || ASTRO_PDF_CONFIG.templateVersion),
        localDraftChapterCount: Number(generated?.localDraftChapterCount || 0),
        payload: generated.payload,
        localAstroChartJson: generated.localAstroChartJson,
        astroMasterJson: generated.astroMasterJson,
        masterJsonValidation: generated.masterJsonValidation,
        pdfReady,
        pdfQuality,
        pdfCompletionValidation,
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
      generationMode: clean(generated?.generationMode || ASTRO_PDF_CONFIG.generationMode),
      provider: clean(generated?.provider || ASTRO_PDF_CONFIG.provider),
      writingPipeline: clean(generated?.writingPipeline || "local-calculation-to-local-assembled-pdf"),
      localAssembly: generated?.localAssembly || pdfReady.localAssembly,
      assemblyVersion: clean(generated?.assemblyVersion || ASTRO_PDF_CONFIG.templateVersion),
      pdfQuality,
      pdfCompletionValidation,
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
      manuscriptSource: clean(generated?.manuscriptSource || ASTRO_PDF_CONFIG.generationMode),
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
        manuscriptSource: clean(generated?.manuscriptSource || ASTRO_PDF_CONFIG.generationMode),
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
        pdfDbEnv,
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
    const originalCode = clean(error?.details?.originalCode || error?.code);
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
        stage: "local-assembly",
        sessionId,
        reportId: clean(body?.reportId || body?.accessGrant?.reportId),
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
    vedicSessionId = getVedicSessionId(body);
    reportId = clean(body?.reportId || body?.accessGrant?.reportId || `vedic-premium-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
    const premiumAccessToken = readPremiumAccessToken(request, body);
    const featureKey = clean(body?.featureKey || VEDIC_PREMIUM_FEATURE_KEY) || VEDIC_PREMIUM_FEATURE_KEY;
    birthInput = normalizeVedicPremiumBirthInput(body);

    compactVedicPremiumLocks();
    const existingLock = vedicPremiumGenerationLocks.get(vedicSessionId);
    if (existingLock?.status === "running") {
      return json({
        ok: true,
        deduped: true,
        status: "running",
        sessionId: vedicSessionId,
        reportId: clean(existingLock.reportId || reportId),
        startedAt: existingLock.startedAt,
        stage: clean(existingLock.stage || "running"),
        progress: buildVedicStatusPayload(existingLock).data.progress,
        retryAfterMs: VEDIC_STATUS_RETRY_AFTER_MS,
      }, { status: 202 });
    }
    if (existingLock?.status === "done" && existingLock?.result) {
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
      status: "running",
      startedAt: new Date().toISOString(),
      startedAtMs: Date.now(),
      stage: "request-received",
      progress: {
        stateKey: "payment_verification",
        currentChapterNo: 0,
        totalChapters: VEDIC_PREMIUM_CHAPTERS.length,
        currentChapterTitle: "결제 및 세션 확인",
        updatedAt: new Date().toISOString(),
      },
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
        reportId,
        userId: auth.userId,
        status: "failed",
        startedAt: new Date().toISOString(),
        startedAtMs: Date.now(),
        stage: "birth-input-invalid",
        progress: {
          stateKey: "failed",
          currentChapterNo: 0,
          totalChapters: VEDIC_PREMIUM_CHAPTERS.length,
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
          currentChapterNo: 0,
          totalChapters: VEDIC_PREMIUM_CHAPTERS.length,
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
      stateKey: "local_calculation",
      currentChapterNo: 0,
      totalChapters: VEDIC_PREMIUM_CHAPTERS.length,
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

    const preparedPayload = {
      ...body,
      birthInput,
      vedicBase: {
        ...(body?.vedicBase && typeof body.vedicBase === "object" ? body.vedicBase : {}),
        birthInput,
        chart: resolved.chartSource,
      },
      chartSourceQuality: resolved.chartSourceQuality,
    };

    const generated = await generateVedicPremiumReport(env, preparedPayload, {
      log: (stage, payload) => {
        const tag = `[VedicPremiumPDF][${stage}]`;
        const progressPatch = buildVedicProgressPatch(stage, payload || {});
        if (progressPatch) updateVedicSessionProgress(vedicSessionId, progressPatch);
        if (stage === "LocalManuscriptFailed") {
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
    if (generated?.quality?.chartSourceQualityOk !== true) {
      const error = new Error("베다점 PDF 고품질 차트 계약 검증에 실패했습니다.");
      error.code = "VEDIC_CHART_SOURCE_QUALITY_INVALID";
      error.status = 422;
      error.details = generated?.quality?.chartSourceQuality || null;
      throw error;
    }
    const vedicLocalContractOk = clean(generated?.manuscriptSource) === VEDIC_PDF_CONFIG.generationMode
      && generated?.localAssembly?.enabled === true
      && generated?.localAssembly?.externalGeneration === false
      && Number(generated?.localAssembly?.chapterCount || 0) === VEDIC_PREMIUM_CHAPTERS.length
      && Number(generated?.localAssembly?.expectedChapterCount || 0) === VEDIC_PREMIUM_CHAPTERS.length
      && clean(generated?.localAssembly?.templateVersion) === VEDIC_PDF_CONFIG.templateVersion
      && generated?.quality?.chartSourceQualityOk === true;
    if (!vedicLocalContractOk) {
      const error = new Error("Vedic premium PDF local assembly contract failed.");
      error.code = "VEDIC_LOCAL_ASSEMBLY_CONTRACT_FAILED";
      error.status = 500;
      error.details = {
        manuscriptSource: clean(generated?.manuscriptSource),
        localAssembly: generated?.localAssembly || null,
      };
      throw error;
    }
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
      manuscriptSource: clean(generated?.manuscriptSource || VEDIC_PDF_CONFIG.generationMode),
      localAssembly: generated?.localAssembly || {
        enabled: true,
        source: clean(generated?.manuscriptSource || VEDIC_PDF_CONFIG.generationMode),
        provider: clean(generated?.provider || VEDIC_PDF_CONFIG.provider),
        templateVersion: VEDIC_PDF_CONFIG.templateVersion,
        chapterCount: Number(generated?.chapterCount || VEDIC_PREMIUM_CHAPTERS.length),
        expectedChapterCount: VEDIC_PREMIUM_CHAPTERS.length,
        externalGeneration: false,
        externalCallsAllowed: false,
      },
      chartSourceQuality: generated?.quality?.chartSourceQuality || null,
    };
    const storedUrl = clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl || pdfReady?.htmlUrl);
    pdfReady.canDownload = Boolean(storedUrl);
    pdfReady.canReopen = true;
    pdfReady.writingPipeline = clean(generated?.writingPipeline || "local-calculation-to-local-assembled-pdf");
    const pdfCompletionValidation = validateVedicPdfCompletionPayload({
      pdfReady,
      chapters: generated.chapterDrafts,
      payload: generated.localVedicChartJson || generated.payload,
      requireDownloadUrl: true,
    });
    if (!pdfCompletionValidation.ok) {
      const error = new Error("베다점 PDF 완료 검증에 실패했습니다.");
      error.code = "VEDIC_REPORT_COMPLETION_INVALID";
      error.status = 500;
      error.issues = pdfCompletionValidation.issues;
      throw error;
    }
    pdfReady.pdfCompletionValidation = pdfCompletionValidation;
    const localPdfResult = await generateVedicLocalPdf({
      reportId,
      featureKey,
      sessionId: vedicSessionId,
      chapterCount: generated.chapterCount,
      manuscriptSource: generated.manuscriptSource || VEDIC_PDF_CONFIG.generationMode,
      chapters: generated.chapters,
      chapterDrafts: generated.chapterDrafts,
      localAssembly: generated?.localAssembly || pdfReady.localAssembly,
      pdfReady,
      pdfCompletionValidation,
      pdfUrl: clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl || pdfReady?.htmlUrl),
      htmlUrl: clean(pdfReady?.htmlUrl),
      downloadUrl: clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl || pdfReady?.htmlUrl),
      canDownload: Boolean(storedUrl),
      canReopen: true,
      writingPipeline: clean(generated?.writingPipeline || "local-calculation-to-local-assembled-pdf"),
    }, {
      config: VEDIC_PDF_CONFIG,
      expectedChapterCount: VEDIC_PREMIUM_CHAPTERS.length,
      buildLocalPdf: (payload) => payload,
    });

    await completePremiumPdfExecution(pdfDbEnv, auth.userId, executionCtx, reportId, {
      chapterCount: generated.chapterCount,
      manuscriptSource: generated.manuscriptSource || VEDIC_PDF_CONFIG.generationMode,
      localAssembly: generated?.localAssembly || pdfReady.localAssembly,
      pdfCompletionValidation,
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
        manuscriptSource: clean(generated?.manuscriptSource || VEDIC_PDF_CONFIG.generationMode),
        generationMode: clean(generated?.generationMode || VEDIC_PDF_CONFIG.generationMode),
        provider: clean(generated?.provider || VEDIC_PDF_CONFIG.provider),
        writingPipeline: clean(generated?.writingPipeline || "local-calculation-to-local-assembled-pdf"),
        localAssembly: generated?.localAssembly || pdfReady.localAssembly,
        localOnly: localPdfResult.localOnly,
        localContract: localPdfResult.localContract,
        diagnostics: generated.diagnostics,
        quality: generated.quality,
        chartSourceQuality: generated?.quality?.chartSourceQuality || null,
        payload: generated.payload,
        localVedicChartJson: generated.localVedicChartJson,
        vedicMasterJson: generated.vedicMasterJson,
        masterJsonValidation: generated.masterJsonValidation,
        pdfReady,
        pdfCompletionValidation,
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
      localAssembly: generated?.localAssembly || pdfReady.localAssembly,
      localOnly: localPdfResult.localOnly,
      localContract: localPdfResult.localContract,
      generationMode: clean(generated?.generationMode || VEDIC_PDF_CONFIG.generationMode),
      provider: clean(generated?.provider || VEDIC_PDF_CONFIG.provider),
      writingPipeline: clean(generated?.writingPipeline || "local-calculation-to-local-assembled-pdf"),
      reportId,
      chapters: generated.chapters,
      chapterDrafts: generated.chapterDrafts,
      payload: generated.payload,
      localVedicChartJson: generated.localVedicChartJson,
      vedicMasterJson: generated.vedicMasterJson,
      masterJsonValidation: generated.masterJsonValidation,
      pdfReady,
      pdfCompletionValidation,
      diagnostics: generated.diagnostics,
      chartSourceQuality: generated?.quality?.chartSourceQuality || null,
      pdfUrl: clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl || pdfReady?.htmlUrl),
      htmlUrl: clean(pdfReady?.htmlUrl),
      downloadUrl: clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl || pdfReady?.htmlUrl),
      canReopen: true,
      canDownload: Boolean(storedUrl),
      quality: generated.quality,
      manuscriptSource: clean(generated?.manuscriptSource || VEDIC_PDF_CONFIG.generationMode),
      finalChapterCount: Array.isArray(generated?.chapters) ? generated.chapters.length : 0,
      progress: {
        stateKey: "completed",
        currentChapterNo: VEDIC_PREMIUM_CHAPTERS.length,
        totalChapters: VEDIC_PREMIUM_CHAPTERS.length,
        currentChapterTitle: "완료",
        manuscriptSource: clean(generated?.manuscriptSource || VEDIC_PDF_CONFIG.generationMode),
      },
    };

    const previousLock = vedicPremiumGenerationLocks.get(vedicSessionId) || {};
    vedicPremiumGenerationLocks.set(vedicSessionId, {
      ...previousLock,
      sessionId: vedicSessionId,
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
    const userFacingMessage = rawMessage.includes("출생") || rawMessage.includes("birth")
      ? "베다점 PDF 생성에 필요한 출생 정보가 부족합니다. 생년월일, 태어난 시간, 지역 정보를 확인해 주세요."
      : rawMessage.includes("차트") || rawMessage.includes("Swiss")
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
        originalCode: error?.code || null,
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
  if (lock?.status === "running") {
    return json({
      ...buildVedicStatusPayload(lock, { sessionId, reportId }),
      retryAfterMs: VEDIC_STATUS_RETRY_AFTER_MS,
    }, { status: 202 });
  }
  if (lock?.status === "done" && lock?.result) {
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
        currentChapterNo: 0,
        totalChapters: VEDIC_PREMIUM_CHAPTERS.length,
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
        currentChapterNo: 0,
        totalChapters: VEDIC_PREMIUM_CHAPTERS.length,
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
      stateKey: clean(doc.premiumStatus || "generating"),
      currentChapterNo: 0,
      totalChapters: VEDIC_PREMIUM_CHAPTERS.length,
      currentChapterTitle: "PDF 결과를 확인하는 중입니다",
    },
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
