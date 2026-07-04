import { getSwissVedicPlanets, getSwissWesternChart } from "../lib/swiss-ephemeris.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import {
  buildAstroLocalChartJson,
  normalizeAstroPremiumBirthInput,
} from "../lib/astro-premium-generator.js";
import { buildVedicLocalChartJson } from "../lib/vedic-premium-generator.js";

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

function clean(value) {
  return String(value || "").trim();
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
      if (path === "/ai-consultation") {
        return json({ ok: false, code: "ASTROLOGY_LEGACY_CONSULTATION_REMOVED", next: "/astrology-ai" }, { status: 410 });
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
      if (path === "/ai-consultation") {
        return json({ ok: false, code: "VEDIC_LEGACY_CONSULTATION_REMOVED", next: "/vedic-ai" }, { status: 410 });
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
