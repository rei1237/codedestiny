import SwissEPH from "sweph-wasm";
import createSweWasmModule from "sweph-wasm/wasm/swisseph";
import * as Astronomy from "astronomy-engine";
import { getEnv } from "./env.js";
import { createHttpError } from "./http.js";

const SIGN_KO = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];
const SIGN_EMOJI = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];
const WESTERN_PLANETS = [
  ["Sun", "SE_SUN"],
  ["Moon", "SE_MOON"],
  ["Mercury", "SE_MERCURY"],
  ["Venus", "SE_VENUS"],
  ["Mars", "SE_MARS"],
  ["Jupiter", "SE_JUPITER"],
  ["Saturn", "SE_SATURN"],
  ["Uranus", "SE_URANUS"],
  ["Neptune", "SE_NEPTUNE"],
  ["Pluto", "SE_PLUTO"],
];
const VEDIC_PLANETS = [
  ["Sun", "SE_SUN"],
  ["Moon", "SE_MOON"],
  ["Mercury", "SE_MERCURY"],
  ["Venus", "SE_VENUS"],
  ["Mars", "SE_MARS"],
  ["Jupiter", "SE_JUPITER"],
  ["Saturn", "SE_SATURN"],
];
const EPHE_FILES = ["seas_18.se1", "sepl_18.se1", "semo_18.se1", "sefstars.txt"];
const DEFAULT_SWISS_WASM_PATH = "/js/vendor/sweph-wasm/wasm/swisseph.wasm";
const FALLBACK_SWISS_WASM_URL = "https://cdn.jsdelivr.net/npm/sweph-wasm/dist/wasm/swisseph.wasm";
const FALLBACK_SWISS_EPHE_BASE_URL = "https://cdn.jsdelivr.net/npm/sweph-wasm/dist/ephe/";

let swissPromise = null;
let sweWasmModulePromise = null;

// 이 파일은 두 번들러가 공유한다: worker/index.js(wrangler/esbuild, Node API 없는 순수 워커)와
// app/api/*.ts(Next webpack, 실제 Node 런타임). swisseph.wasm은 Emscripten 산출물이라 내부
// import 네임스페이스가 축약형("a")이라 webpack의 네이티브 WebAssembly 실험이 이를 실제 JS
// 모듈처럼 자동 해석하려다 깨진다(esbuild는 그렇게 하지 않아 워커 쪽만 정상 동작했었다).
// 그래서 Node fs로 직접 읽어 컴파일하는 경로를 우선 시도하고(app/api/* 등 실제 Node 런타임),
// node:fs를 못 쓰는 순수 워커에서만 빌드타임 import로 폴백한다 — webpackIgnore로 그 폴백
// import를 Next의 webpack이 아예 건드리지 않게 해 두 번들러의 요구사항 충돌을 피한다.
async function loadSweWasmModule() {
  sweWasmModulePromise ??= (async () => {
    try {
      const { readFile } = await import("node:fs/promises");
      const wasmUrl = new URL("../../public/js/vendor/sweph-wasm/wasm/swisseph.wasm", import.meta.url);
      const bytes = await readFile(wasmUrl);
      return await WebAssembly.compile(bytes);
    } catch {
      const mod = await import(/* webpackIgnore: true */ "../../public/js/vendor/sweph-wasm/wasm/swisseph.wasm");
      return mod.default ?? mod;
    }
  })();
  return sweWasmModulePromise;
}

function clean(value) {
  return String(value || "").trim();
}

function sanitizeUrlLikeEnvValue(value) {
  let raw = clean(value);
  if (!raw) return "";

  const lowered = raw.toLowerCase();
  if (lowered === "undefined" || lowered === "null" || lowered === "about:blank") return "";

  // Strip wrapping quotes often introduced by TOML/CI env serialization.
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith("`") && raw.endsWith("`"))) {
    raw = raw.slice(1, -1).trim();
  }

  // Some env injectors leave a trailing semicolon/comma for URL-like values.
  raw = raw.replace(/[;,]+\s*$/, "").trim();
  return raw;
}

function resolveOriginLike(value) {
  const normalized = sanitizeUrlLikeEnvValue(value);
  if (!normalized) return "";
  try {
    const withProtocol = /^https?:\/\//i.test(normalized) ? normalized : `https://${normalized}`;
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.origin;
  } catch (e) {
    return "";
  }
}

function resolveHttpUrl(value) {
  const normalized = sanitizeUrlLikeEnvValue(value);
  if (!normalized) return "";
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.toString();
  } catch (e) {
    return "";
  }
  return "";
}

function resolveRequestOrigin(requestUrl) {
  const raw = clean(requestUrl);
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.origin;
  } catch (e) {
    return "";
  }
  return "";
}

function resolveSwissAssetOrigin(env, options = {}) {
  return resolveOriginLike(
    getEnv(env, "PUBLIC_SITE_ORIGIN")
    || getEnv(env, "NEXT_PUBLIC_SITE_URL")
    || getEnv(env, "SITE_BASE_URL")
    || getEnv(env, "SITE_URL")
    || getEnv(env, "AUTH_FRONTEND_BASE_URL")
    || getEnv(env, "CF_PAGES_URL")
    || getEnv(env, "WORKER_ORIGIN")
    || getEnv(env, "ASTRO_SWISS_BASE_URL")
    || getEnv(env, "ASTRO_API_BASE_URL")
    || options.origin
    || options.baseUrl,
  );
}

function nd(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return ((n % 360) + 360) % 360;
}

function parseNumber(value, fallback = NaN) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toFiniteNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toStatusError(status, message) {
  return createHttpError(status, message, { ok: false, error: message });
}

function toBool(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function requiresStrictSwissWestern(env, options = {}) {
  return options?.strictSwiss === true
    || options?.allowFallback === false
    || options?.premium === true
    || toBool(getEnv(env, "ASTRO_SWISS_STRICT_ONLY"));
}

function createSwissWesternUnavailableError(error) {
  const wrapped = new Error("Swiss ephemeris engine is required for premium astrology PDF generation.");
  wrapped.code = "ASTRO_SWISS_ENGINE_UNAVAILABLE";
  wrapped.status = 503;
  wrapped.cause = error;
  return wrapped;
}

function summarizeChartInput(input) {
  return {
    year: Number(input?.year),
    month: Number(input?.month),
    day: Number(input?.day),
    hour: Number(input?.hour),
    minute: Number(input?.minute),
    timezone: Number(input?.timezone),
    lat: Number(input?.lat),
    lon: Number(input?.lon),
  };
}

function parsePlanetLongitude(value) {
  const n = Number(value);
  return Number.isFinite(n) ? nd(n) : NaN;
}

function normalizeExternalVedicPayload(payload = {}) {
  const rawPlanets = payload?.planets && typeof payload.planets === "object" ? payload.planets : {};
  const planets = {};
  for (const [name] of VEDIC_PLANETS) {
    planets[name] = parsePlanetLongitude(rawPlanets[name]);
  }
  planets.Rahu = parsePlanetLongitude(rawPlanets.Rahu);
  planets.Ketu = parsePlanetLongitude(rawPlanets.Ketu);

  const requiredPlanetNames = [...VEDIC_PLANETS.map(([name]) => name), "Rahu", "Ketu"];
  const missingPlanets = requiredPlanetNames.filter((name) => !Number.isFinite(planets[name]));
  if (missingPlanets.length > 0) {
    return null;
  }

  const ayanamsa = Number(payload?.ayanamsa);
  if (!Number.isFinite(ayanamsa)) {
    return null;
  }

  const ascendantSidereal = Number(payload?.ascendantSidereal);
  const retrogradeRaw = payload?.retrograde && typeof payload.retrograde === "object" ? payload.retrograde : {};
  const retrograde = {};
  for (const [name] of VEDIC_PLANETS) {
    retrograde[name] = Boolean(retrogradeRaw[name]);
  }

  return {
    planets,
    retrograde,
    ayanamsa,
    ascendantSidereal: Number.isFinite(ascendantSidereal) ? ascendantSidereal : null,
    source: String(payload?.source || "external-vedic-api"),
  };
}

function normalizeExternalWesternPayload(payload = {}) {
  const rawPlanets = payload?.planets && typeof payload.planets === "object" ? payload.planets : {};
  const rawHouseCusps = Array.isArray(payload?.houseCusps) ? payload.houseCusps : [];
  const houseCusps = rawHouseCusps
    .map((value) => nd(value))
    .filter((value) => Number.isFinite(value))
    .slice(0, 12);

  const ascLon = parsePlanetLongitude(payload?.ascendant?.longitude ?? payload?.ascendant?.lon ?? payload?.ascendant);
  const mcLon = parsePlanetLongitude(payload?.midheaven?.longitude ?? payload?.midheaven?.lon ?? payload?.midheaven);

  if (!Number.isFinite(ascLon) || !Number.isFinite(mcLon) || houseCusps.length !== 12) {
    return null;
  }

  const planets = {};
  for (const [name] of WESTERN_PLANETS) {
    const raw = rawPlanets[name] || rawPlanets[name.toLowerCase()] || null;
    const lon = parsePlanetLongitude(raw?.longitude ?? raw?.lon ?? raw?.lambda ?? raw);
    if (!Number.isFinite(lon)) return null;

    const speedLongitude = Number(raw?.speedLongitude ?? raw?.speed ?? raw?.spd);
    planets[name] = {
      ...signInfo(lon, ascLon),
      house: Number.isFinite(Number(raw?.house)) ? Number(raw.house) : locateHouseByCusps(lon, houseCusps),
      speedLongitude: Number.isFinite(speedLongitude) ? Math.round(speedLongitude * 1000000) / 1000000 : null,
      retrograde: typeof raw?.retrograde === "boolean"
        ? raw.retrograde
        : (Number.isFinite(speedLongitude) ? speedLongitude < 0 : null),
    };
  }

  const northNodeLon = parsePlanetLongitude(
    payload?.northNode?.longitude
      ?? payload?.northNode?.lon
      ?? payload?.trueNode
      ?? payload?.trueNodeLon,
  );

  const aspects = Array.isArray(payload?.aspects)
    ? payload.aspects
      .map((aspect) => ({
        p1: String(aspect?.p1 || aspect?.planetA || "").trim(),
        p2: String(aspect?.p2 || aspect?.planetB || "").trim(),
        type: String(aspect?.type || "").trim(),
        orb: Number(aspect?.orb),
      }))
      .filter((aspect) => aspect.p1 && aspect.p2 && aspect.type && Number.isFinite(aspect.orb))
    : [];

  return {
    planets,
    ascendant: { ...signInfo(ascLon, ascLon), house: 1 },
    midheaven: { ...signInfo(mcLon, ascLon), house: locateHouseByCusps(mcLon, houseCusps) },
    northNode: Number.isFinite(northNodeLon)
      ? { ...signInfo(northNodeLon, ascLon), house: locateHouseByCusps(northNodeLon, houseCusps) }
      : undefined,
    southNode: Number.isFinite(northNodeLon)
      ? { ...signInfo(northNodeLon + 180, ascLon), house: locateHouseByCusps(northNodeLon + 180, houseCusps) }
      : undefined,
    houseCusps,
    houseSystem: "placidus",
    aspects: aspects.length ? aspects : calcAspects(planets),
    source: String(payload?.source || "external-swiss-api"),
    engineQuality: "swiss",
    fallbackUsed: false,
  };
}

async function getExternalVedicPlanets(env, input) {
  const baseUrl = clean(getEnv(env, "VEDIC_API_BASE_URL") || getEnv(env, "VEDIC_API_BASE"));
  const apiKey = clean(getEnv(env, "VEDIC_API_KEY") || getEnv(env, "VEDIC_API_TOKEN"));
  const apiPath = clean(getEnv(env, "VEDIC_API_PATH") || "/api/vedic/planets");
  const forceExternal = toBool(getEnv(env, "VEDIC_API_FORCE_EXTERNAL"));

  const hasBaseUrl = Boolean(baseUrl);
  const hasApiKey = Boolean(apiKey);

  try {
    console.info("[vedic-api-config]", JSON.stringify({
      hasBaseUrl,
      hasApiKey,
      forceExternal,
      request: summarizeChartInput(input),
    }));
  } catch (e) {
    // ignore logging failure
  }

  if (!hasBaseUrl && !hasApiKey) {
    if (forceExternal) {
      throw toStatusError(503, "External Vedic API is required but VEDIC_API_BASE_URL/KEY are not configured.");
    }
    return null;
  }

  if (!hasBaseUrl || !hasApiKey) {
    throw toStatusError(503, "External Vedic API configuration is incomplete. Set both VEDIC_API_BASE_URL and VEDIC_API_KEY.");
  }

  let endpoint = "";
  try {
    endpoint = new URL(apiPath.startsWith("/") ? apiPath : `/${apiPath}`, baseUrl).toString();
  } catch (e) {
    throw toStatusError(503, "VEDIC_API_BASE_URL is invalid.");
  }

  const timeoutMs = Math.max(2000, Number(getEnv(env, "VEDIC_API_TIMEOUT_MS") || 15000));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);
    const normalized = normalizeExternalVedicPayload(data || {});

    try {
      console.info("[vedic-api-result]", JSON.stringify({
        status: response.status,
        ok: response.ok,
        hasPayload: Boolean(normalized),
      }));
    } catch (e) {
      // ignore logging failure
    }

    if (!response.ok) {
      throw toStatusError(503, `External Vedic API request failed with status ${response.status}.`);
    }
    if (!normalized) {
      throw toStatusError(503, "External Vedic API returned invalid payload.");
    }

    return normalized;
  } catch (error) {
    if (error?.status) throw error;
    throw toStatusError(503, `External Vedic API request failed: ${error?.message || error}`);
  } finally {
    clearTimeout(timer);
  }
}

async function getExternalWesternChart(env, input, options = {}) {
  const baseUrl = clean(getEnv(env, "SWISS_API_BASE_URL") || getEnv(env, "ASTRO_SWISS_BASE_URL") || getEnv(env, "SWISS_API_BASE"));
  const apiKey = clean(getEnv(env, "SWISS_API_KEY") || getEnv(env, "SWISS_API_TOKEN"));
  const apiPath = clean(getEnv(env, "SWISS_API_WESTERN_PATH") || "/api/astro/western-chart");
  const forceExternal = toBool(getEnv(env, "SWISS_API_FORCE_EXTERNAL"));

  if (!baseUrl && !apiKey) {
    if (forceExternal) {
      throw toStatusError(503, "External Swiss API is required but SWISS_API_BASE_URL/KEY are not configured.");
    }
    return null;
  }

  if (!baseUrl || !apiKey) {
    throw toStatusError(503, "External Swiss API configuration is incomplete. Set both SWISS_API_BASE_URL and SWISS_API_KEY.");
  }

  let endpoint = "";
  try {
    endpoint = new URL(apiPath.startsWith("/") ? apiPath : `/${apiPath}`, baseUrl).toString();
  } catch (e) {
    throw toStatusError(503, "SWISS_API_BASE_URL is invalid.");
  }

  const requestUrl = clean(options.requestUrl);
  if (requestUrl) {
    try {
      const requestParsed = new URL(requestUrl);
      const endpointParsed = new URL(endpoint);
      const sameOrigin = requestParsed.origin === endpointParsed.origin;
      const sameRoute = requestParsed.pathname === endpointParsed.pathname;
      if (sameOrigin && sameRoute) {
        throw toStatusError(503, "SWISS_API_BASE_URL points to the same western-chart route and would recurse.");
      }
    } catch (error) {
      if (error?.status) throw error;
    }
  }

  const timeoutMs = Math.max(2000, Number(getEnv(env, "SWISS_API_TIMEOUT_MS") || 15000));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => null);
    const normalized = normalizeExternalWesternPayload(data || {});

    if (!response.ok) {
      throw toStatusError(503, `External Swiss API request failed with status ${response.status}.`);
    }
    if (!normalized) {
      throw toStatusError(503, "External Swiss API returned invalid western payload.");
    }

    return normalized;
  } catch (error) {
    if (error?.status) throw error;
    throw toStatusError(503, `External Swiss API request failed: ${error?.message || error}`);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 두 황경 사이의 주요 애스펙트(오브 8도). 순수 함수 — 시나스트리(neo-synastry.js)가
 * 같은 규칙을 다시 쓰기 위해 export 한다. 여기 규칙을 복제하면 네이탈과 시나스트리의
 * 오브가 조용히 갈라진다.
 */
export function aspectBetween(a, b) {
  const diff = Math.abs(nd(a) - nd(b));
  const normalized = diff > 180 ? 360 - diff : diff;
  const defs = [[0, "conjunction"], [60, "sextile"], [90, "square"], [120, "trine"], [180, "opposition"]];
  for (const [deg, type] of defs) {
    const orb = Math.abs(normalized - deg);
    if (orb <= 8) {
      return { type, orb: Math.round(orb * 100) / 100 };
    }
  }
  return null;
}

function signInfo(longitude, ascLon) {
  const normalized = nd(longitude);
  if (!Number.isFinite(normalized)) return null;
  const sign = Math.floor(normalized / 30);
  const degree = Math.round((normalized % 30) * 100) / 100;
  return {
    longitude: Math.round(normalized * 100) / 100,
    sign,
    signKo: SIGN_KO[sign],
    signEmoji: SIGN_EMOJI[sign],
    degree,
    house: Number.isFinite(ascLon) ? (Math.floor(nd(normalized - ascLon) / 30) + 1) : null,
  };
}

function extractHouseCusps(housesResult) {
  const rawCusps = Array.isArray(housesResult?.cusps)
    ? housesResult.cusps
    : (Array.isArray(housesResult?.house) ? housesResult.house : []);
  const out = [];
  for (let i = 0; i < rawCusps.length; i += 1) {
    const lon = nd(rawCusps[i]);
    if (Number.isFinite(lon)) out.push(lon);
  }
  if (out.length >= 12) return out.slice(0, 12);
  return [];
}

/** 황경이 어느 하우스에 떨어지는가. 시나스트리의 하우스 오버레이가 그대로 재사용한다. */
export function locateHouseByCusps(longitude, cusps) {
  const lon = nd(longitude);
  if (!Number.isFinite(lon) || !Array.isArray(cusps) || cusps.length !== 12) return null;
  for (let i = 0; i < 12; i += 1) {
    const start = nd(cusps[i]);
    const end = nd(cusps[(i + 1) % 12]);
    const inHouse = start <= end ? (lon >= start && lon < end) : (lon >= start || lon < end);
    if (inHouse) return i + 1;
  }
  return 1;
}

function normalizeChartInput(payload) {
  const src = payload && typeof payload === "object" ? payload : {};
  return {
    year: toFiniteNumber(src.year, NaN),
    month: toFiniteNumber(src.month, NaN),
    day: toFiniteNumber(src.day, NaN),
    hour: toFiniteNumber(src.hour, 12),
    minute: toFiniteNumber(src.minute, 0),
    timezone: toFiniteNumber(src.timezone, 9),
    lat: toFiniteNumber(src.lat, 37.5665),
    lon: toFiniteNumber(src.lon ?? src.lng, 126.978),
  };
}

function degToRad(value) {
  return (Number(value) * Math.PI) / 180;
}

function radToDeg(value) {
  return (Number(value) * 180) / Math.PI;
}

function makeUtcDateFromInput(input) {
  const utcHour = input.hour + (input.minute / 60) - input.timezone;
  const utcMillis = Date.UTC(input.year, input.month - 1, input.day, 0, 0, 0, 0) + utcHour * 3600000;
  if (!Number.isFinite(utcMillis)) {
    throw toStatusError(400, "Invalid chart input: datetime conversion failed.");
  }
  return new Date(utcMillis);
}

function calcAscMcByAstronomyEngine(input, utcDate) {
  const siderealHours = Number(Astronomy.SiderealTime(utcDate));
  const localSiderealDeg = nd((siderealHours * 15) + input.lon);
  const theta = degToRad(localSiderealDeg);
  const latitude = degToRad(input.lat);
  // Mean obliquity is adequate for asc/mc fallback when Swiss runtime is unavailable.
  const epsilon = degToRad(23.4392911);

  const mc = nd(radToDeg(Math.atan2(Math.sin(theta), Math.cos(theta) * Math.cos(epsilon))));
  const asc = nd(radToDeg(Math.atan2(
    -Math.cos(theta),
    (Math.sin(theta) * Math.cos(epsilon)) + (Math.tan(latitude) * Math.sin(epsilon)),
  )));

  const houseCusps = Array.from({ length: 12 }, (_, idx) => nd(asc + (idx * 30)));
  return { asc, mc, houseCusps };
}

function calcWesternPlanetsByAstronomyEngine(input, utcDate) {
  const epochMs = utcDate.getTime();
  const oneHourMs = 3600000;
  const prevDate = new Date(epochMs - oneHourMs);
  const nextDate = new Date(epochMs + oneHourMs);

  const out = {};
  for (const [name] of WESTERN_PLANETS) {
    const body = Astronomy.Body?.[name];
    if (!body) continue;

    const center = Astronomy.Ecliptic(Astronomy.GeoVector(body, utcDate, true));
    const prev = Astronomy.Ecliptic(Astronomy.GeoVector(body, prevDate, true));
    const next = Astronomy.Ecliptic(Astronomy.GeoVector(body, nextDate, true));

    const longitude = nd(center?.elon);
    if (!Number.isFinite(longitude)) continue;

    const delta = nd(next?.elon) - nd(prev?.elon);
    const unwrappedDelta = delta > 180 ? delta - 360 : (delta < -180 ? delta + 360 : delta);
    const speedLongitude = Number.isFinite(unwrappedDelta) ? (unwrappedDelta / 2) : null;

    out[name] = {
      longitude,
      speedLongitude: Number.isFinite(speedLongitude) ? Math.round(speedLongitude * 1000000) / 1000000 : null,
      retrograde: Number.isFinite(speedLongitude) ? speedLongitude < 0 : null,
    };
  }

  return out;
}

function buildAstronomyFallbackWesternChart(input) {
  const utcDate = makeUtcDateFromInput(input);
  const rawPlanets = calcWesternPlanetsByAstronomyEngine(input, utcDate);
  const { asc, mc, houseCusps } = calcAscMcByAstronomyEngine(input, utcDate);

  const planets = {};
  for (const [name] of WESTERN_PLANETS) {
    const raw = rawPlanets[name];
    if (!raw || !Number.isFinite(raw.longitude)) continue;
    planets[name] = {
      ...signInfo(raw.longitude, asc),
      house: locateHouseByCusps(raw.longitude, houseCusps),
      speedLongitude: raw.speedLongitude,
      retrograde: raw.retrograde,
    };
  }

  const aspects = calcAspects(planets);
  if (Object.keys(planets).length < 7 || houseCusps.length !== 12 || !Number.isFinite(asc) || !Number.isFinite(mc) || aspects.length === 0) {
    throw toStatusError(500, "Astronomy fallback chart failed to satisfy minimum chart completeness.");
  }

  return {
    planets,
    ascendant: { ...signInfo(asc, asc), house: 1 },
    midheaven: { ...signInfo(mc, asc), house: locateHouseByCusps(mc, houseCusps) },
    houseCusps,
    houseSystem: "equal",
    aspects,
    source: "astronomy-engine-fallback",
    engineQuality: "fallback",
    fallbackUsed: true,
  };
}

function validateChartInput(input) {
  if (!Number.isFinite(input.year) || !Number.isFinite(input.month) || !Number.isFinite(input.day)) {
    throw toStatusError(400, "Invalid chart input: year/month/day are required.");
  }
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lon)) {
    throw toStatusError(400, "Invalid chart input: lat/lon are required.");
  }
}

function julianDayFromInput(swe, input) {
  const utcHour = input.hour + (input.minute / 60) - input.timezone;
  const utcMillis = Date.UTC(input.year, input.month - 1, input.day, 0, 0, 0, 0) + utcHour * 3600000;
  if (!Number.isFinite(utcMillis)) {
    throw toStatusError(400, "Invalid chart input: datetime conversion failed.");
  }
  const utc = new Date(utcMillis);
  const decimalHour = utc.getUTCHours() + (utc.getUTCMinutes() / 60) + (utc.getUTCSeconds() / 3600) + (utc.getUTCMilliseconds() / 3600000);
  return swe.swe_julday(
    utc.getUTCFullYear(),
    utc.getUTCMonth() + 1,
    utc.getUTCDate(),
    decimalHour,
    swe.SE_GREG_CAL,
  );
}

function resolveEpheBaseUrl(env, options = {}) {
  const fromEnv = sanitizeUrlLikeEnvValue(
    getEnv(env, "SWISS_EPHEMERIS_FILES_BASE_URL")
    || getEnv(env, "SWISS_EPHE_BASE_URL")
    || getEnv(env, "PUBLIC_EPHE_BASE_URL"),
  );
  if (fromEnv) {
    try {
      const parsed = new URL(fromEnv);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return fromEnv.endsWith("/") ? fromEnv : `${fromEnv}/`;
      }
    } catch (e) {
      // Ignore malformed env URL and fallback to request origin below.
    }
  }

  const originFromEnv = resolveSwissAssetOrigin(env, options);
  if (originFromEnv) return `${originFromEnv}/ephe/`;

  const requestUrl = clean(options.requestUrl);
  if (requestUrl) {
    try {
      return new URL("/ephe/", requestUrl).toString();
    } catch (e) {
      throw toStatusError(500, "Invalid request URL context for Swiss ephemeris base resolution.");
    }
  }

  throw toStatusError(500, "Swiss ephemeris base URL is missing. Set SWISS_EPHEMERIS_FILES_BASE_URL or provide request URL context.");
}

function resolveSwissWasmCandidates(env, options = {}) {
  const configuredPath = sanitizeUrlLikeEnvValue(
    getEnv(env, "SWISS_WASM_URL")
    || getEnv(env, "SWISS_WASM_PATH")
    || options.wasmUrl
    || options.wasmPath,
  );
  const rawPath = configuredPath || DEFAULT_SWISS_WASM_PATH;
  const requestOrigin = resolveRequestOrigin(options.requestUrl);
  const envOrigin = resolveSwissAssetOrigin(env, options);
  const candidates = [];
  const add = (source, value) => {
    const url = resolveHttpUrl(value);
    if (!url || candidates.some((candidate) => candidate.url === url)) return;
    candidates.push({ source, url });
  };
  const addPath = (source, value) => {
    const raw = sanitizeUrlLikeEnvValue(value);
    if (!raw) return;
    const absolute = resolveHttpUrl(raw);
    if (absolute) {
      add(source, absolute);
      return;
    }
    const normalizedPath = raw.startsWith("/") ? raw : `/${raw.replace(/^\.?\/*/, "")}`;
    if (requestOrigin) add(`${source}:request-origin`, new URL(normalizedPath, `${requestOrigin}/`).toString());
    if (envOrigin) add(`${source}:env-origin`, new URL(normalizedPath, `${envOrigin}/`).toString());
  };

  addPath(configuredPath ? "configured" : "default", rawPath);
  add("cdn-fallback", FALLBACK_SWISS_WASM_URL);
  return candidates;
}

function resolveSwissWasmPath(env, options = {}) {
  const candidates = resolveSwissWasmCandidates(env, options);
  return candidates[0]?.url || FALLBACK_SWISS_WASM_URL;
}

function summarizeSwissInitError(error) {
  return clean(error?.message || error || "unknown").replace(/\s+/g, " ").slice(0, 180);
}

function buildSwissWasmInitError(attempts) {
  const message = "베다 차트 계산 엔진을 초기화하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  const error = toStatusError(503, message);
  error.code = "SWISS_WASM_INIT_FAILED";
  error.payload = {
    ok: false,
    error: message,
    code: "SWISS_WASM_INIT_FAILED",
    errorDetails: {
      attemptCount: attempts.length,
      lastError: attempts[attempts.length - 1]?.error || "",
    },
  };
  return error;
}

async function createSwissInstance(env, options = {}) {
  let swe = null;

  // Cloudflare Workers는 런타임에 fetch한 바이트를 WebAssembly.instantiate()로 즉석
  // 컴파일하는 것을 차단한다("Wasm code generation disallowed by embedder"). sweph-wasm의
  // 기본 SwissEPH.init(url)은 이 방식을 쓰므로 Workers에서 항상 실패한다. 대신 .wasm을
  // 빌드 타임 ES 모듈로 import해 이미 컴파일된 WebAssembly.Module을 확보하고,
  // instantiateWasm 훅으로 그 모듈을 직접 주입해 런타임 컴파일 자체를 우회한다.
  try {
    const sweWasmModule = await loadSweWasmModule();
    const rawModule = await createSweWasmModule({
      instantiateWasm(imports, successCallback) {
        WebAssembly.instantiate(sweWasmModule, imports).then((instance) => {
          successCallback(instance, sweWasmModule);
        });
        return {};
      },
    });
    swe = new SwissEPH(rawModule);
  } catch (error) {
    const attempts = [{ source: "bundled-module", error: summarizeSwissInitError(error) }];
    try {
      console.warn("[swiss-init-error]", JSON.stringify({
        code: "SWISS_WASM_INIT_FAILED",
        attempts,
      }));
    } catch (e) {
      // ignore logging failure
    }
    throw buildSwissWasmInitError(attempts);
  }

  const epheBaseUrl = resolveEpheBaseUrl(env, options);
  const epheAttempts = [epheBaseUrl];
  if (epheBaseUrl !== FALLBACK_SWISS_EPHE_BASE_URL) epheAttempts.push(FALLBACK_SWISS_EPHE_BASE_URL);

  let epheLoaded = false;
  let epheLastError = null;
  for (const candidateBaseUrl of epheAttempts) {
    try {
      await swe.swe_set_ephe_path(candidateBaseUrl, EPHE_FILES);
      epheLoaded = true;
      break;
    } catch (error) {
      epheLastError = error;
    }
  }
  if (!epheLoaded) {
    throw toStatusError(500, `Swiss ephemeris load failed from ${epheBaseUrl}: ${epheLastError?.message || epheLastError}`);
  }

  return swe;
}

async function getSwiss(env, options = {}) {
  if (!swissPromise) {
    swissPromise = createSwissInstance(env, options).catch((error) => {
      swissPromise = null;
      throw error;
    });
  }
  return swissPromise;
}

function readLongitudeFromResult(result, label) {
  const lon = nd(result?.[0]);
  if (!Number.isFinite(lon)) {
    throw toStatusError(502, `Swiss calculation returned invalid longitude for ${label}.`);
  }
  return lon;
}

function calcPlanetsByMap(swe, jd, iflag, map) {
  const out = {};
  for (const [name, constantName] of map) {
    const result = swe.swe_calc_ut(jd, swe[constantName], iflag);
    const longitude = readLongitudeFromResult(result, name);
    const speedLongitude = parseNumber(result?.[3], NaN);
    out[name] = {
      longitude,
      speedLongitude: Number.isFinite(speedLongitude) ? Math.round(speedLongitude * 1000000) / 1000000 : null,
      retrograde: Number.isFinite(speedLongitude) ? speedLongitude < 0 : null,
    };
  }
  return out;
}

function calcAscMc(swe, jd, iflag, lat, lon) {
  const houses = swe.swe_houses_ex(jd, iflag, lat, lon, "P");
  const asc = nd(houses?.ascmc?.[0]);
  const mc = nd(houses?.ascmc?.[1]);
  const houseCusps = extractHouseCusps(houses);
  if (!Number.isFinite(asc) || !Number.isFinite(mc)) {
    throw toStatusError(502, "Swiss calculation returned invalid ascendant/midheaven.");
  }
  if (houseCusps.length !== 12) {
    throw toStatusError(502, "Swiss calculation returned invalid house cusps.");
  }
  return { asc, mc, houseCusps };
}

function calcAspects(planetsBySignInfo) {
  const aspects = [];
  const names = Object.keys(planetsBySignInfo);
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      const hit = aspectBetween(planetsBySignInfo[names[i]].longitude, planetsBySignInfo[names[j]].longitude);
      if (hit) {
        aspects.push({ p1: names[i], p2: names[j], ...hit });
      }
    }
  }
  return aspects;
}

export async function getSwissWesternChart(env, payload, options = {}) {
  const input = normalizeChartInput(payload);
  validateChartInput(input);

  const external = await getExternalWesternChart(env, input, options);
  if (external) {
    return external;
  }

  try {
    const swe = await getSwiss(env, options);

    const jd = julianDayFromInput(swe, input);
    const iflag = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;

    const rawPlanets = calcPlanetsByMap(swe, jd, iflag, WESTERN_PLANETS);
    const { asc, mc, houseCusps } = calcAscMc(swe, jd, iflag, input.lat, input.lon);

    const planets = {};
    for (const [name] of WESTERN_PLANETS) {
      const raw = rawPlanets[name] || {};
      planets[name] = {
        ...signInfo(raw.longitude, asc),
        house: locateHouseByCusps(raw.longitude, houseCusps),
        speedLongitude: raw.speedLongitude,
        retrograde: raw.retrograde,
      };
    }

    const trueNodeLon = readLongitudeFromResult(swe.swe_calc_ut(jd, swe.SE_TRUE_NODE, iflag), "NorthNode");
    const aspects = calcAspects(planets);

    return {
      planets,
      ascendant: { ...signInfo(asc, asc), house: 1 },
      midheaven: { ...signInfo(mc, asc), house: locateHouseByCusps(mc, houseCusps) },
      northNode: { ...signInfo(trueNodeLon, asc), house: locateHouseByCusps(trueNodeLon, houseCusps) },
      southNode: { ...signInfo(trueNodeLon + 180, asc), house: locateHouseByCusps(trueNodeLon + 180, houseCusps) },
      houseCusps,
      houseSystem: "placidus",
      aspects,
      source: "swiss-wasm-local",
      engineQuality: "swiss",
      fallbackUsed: false,
    };
  } catch (error) {
    if (requiresStrictSwissWestern(env, options)) {
      try {
        console.error("[astro-western-strict-failed]", JSON.stringify({
          reason: summarizeSwissInitError(error),
        }));
      } catch (e) {
        // ignore logging failure
      }
      throw createSwissWesternUnavailableError(error);
    }

    try {
      console.warn("[astro-western-fallback]", JSON.stringify({
        reason: String(error?.message || error || "unknown"),
      }));
    } catch (e) {
      // ignore logging failure
    }

    return buildAstronomyFallbackWesternChart(input);
  }
}

/**
 * 여러 날짜의 달 시데리얼(라히리) 황경을 한 번에 구한다. 택일(무후르타)처럼 수십 일을
 * 스캔해야 하는 경로 전용이다.
 *
 * 🔴 getSwissVedicPlanets 를 날짜마다 부르면 안 된다 — 그쪽은 호출마다 외부 천체력
 *    엔드포인트를 먼저 때리므로(getExternalVedicPlanets) 60일 스캔이 네트워크 왕복 60회가 된다.
 *    여기서는 WASM 인스턴스를 한 번만 얻어 로컬 swe_calc_ut 만 반복한다.
 *
 * @param {object} env
 * @param {Array<{year:number, month:number, day:number, hour?:number, minute?:number, timezone?:number}>} moments
 * @param {object} options
 * @returns {Promise<number[]>} moments 와 같은 순서의 시데리얼 황경(0~360)
 */
export async function getSwissMoonLongitudes(env, moments, options = {}) {
  if (!Array.isArray(moments) || !moments.length) return [];
  const swe = await getSwiss(env, options);
  swe.swe_set_sid_mode(swe.SE_SIDM_LAHIRI, 0, 0);
  const flag = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED | swe.SEFLG_SIDEREAL;

  return moments.map((moment) => {
    const input = {
      year: Number(moment.year),
      month: Number(moment.month),
      day: Number(moment.day),
      hour: Number(moment.hour ?? 12),
      minute: Number(moment.minute ?? 0),
      timezone: Number(moment.timezone ?? 9),
    };
    const jd = julianDayFromInput(swe, input);
    return readLongitudeFromResult(swe.swe_calc_ut(jd, swe.SE_MOON, flag), "Moon");
  });
}

export async function getSwissVedicPlanets(env, payload, options = {}) {
  const input = normalizeChartInput(payload);
  validateChartInput(input);

  const external = await getExternalVedicPlanets(env, input);
  if (external) {
    return external;
  }

  const swe = await getSwiss(env, options);

  const jd = julianDayFromInput(swe, input);
  const tropicalFlag = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;
  swe.swe_set_sid_mode(swe.SE_SIDM_LAHIRI, 0, 0);
  const siderealFlag = tropicalFlag | swe.SEFLG_SIDEREAL;

  const rawPlanets = calcPlanetsByMap(swe, jd, siderealFlag, VEDIC_PLANETS);
  const planets = {};
  const retrograde = {};
  for (const [name] of VEDIC_PLANETS) {
    const raw = rawPlanets[name] || {};
    planets[name] = Number(raw.longitude);
    retrograde[name] = raw.retrograde;
  }
  const rahu = readLongitudeFromResult(swe.swe_calc_ut(jd, swe.SE_TRUE_NODE, siderealFlag), "Rahu");
  planets.Rahu = rahu;
  planets.Ketu = nd(rahu + 180);

  const ayanamsa = parseNumber(swe.swe_get_ayanamsa_ut(jd), NaN);
  if (!Number.isFinite(ayanamsa)) {
    throw toStatusError(502, "Swiss calculation returned invalid ayanamsa.");
  }

  const siderealAsc = calcAscMc(swe, jd, siderealFlag, input.lat, input.lon).asc;

  return {
    planets,
    retrograde,
    ayanamsa,
    ascendantSidereal: Number.isFinite(siderealAsc) ? siderealAsc : null,
    source: "swiss-wasm-local",
    engineQuality: "swiss",
    fallbackUsed: false,
  };
}

// ── 임의 UT 순간의 트로피컬(회귀) 황경 ─────────────────────────────────────────
//
// 휴먼 디자인은 Design 순간을 "출생 태양에서 정확히 88° 이전"으로 되짚어 찾기 때문에 태양
// 황경만 여러 번 필요하다.
//
// 🔴 그 반복에 getSwissWesternChart 를 쓰면 안 된다 — 호출마다 외부 천체력 엔드포인트를
//    먼저 때리고(getExternalWesternChart) 하우스·어스펙트까지 계산하므로, 뉴턴 반복이
//    네트워크 왕복 N회가 된다. 여기서는 getSwissMoonLongitudes 와 같은 규격으로
//    WASM 인스턴스를 한 번만 얻어 로컬 swe_calc_ut 만 반복한다.
//
// 🔴 SEFLG_SIDEREAL 을 주지 않는다 = 트로피컬. Rave Mandala 는 회귀황도에 고정돼 있다.

const TROPICAL_BODY_CONSTANTS = Object.freeze({
  Sun: "SE_SUN",
  Moon: "SE_MOON",
  Mercury: "SE_MERCURY",
  Venus: "SE_VENUS",
  Mars: "SE_MARS",
  Jupiter: "SE_JUPITER",
  Saturn: "SE_SATURN",
  Uranus: "SE_URANUS",
  Neptune: "SE_NEPTUNE",
  Pluto: "SE_PLUTO",
});

const UNIX_EPOCH_JULIAN_DAY = 2440587.5;

/**
 * UTC 밀리초 → 율리우스일(UT).
 * @param {number} millis
 * @returns {number}
 */
export function julianDayFromUtcMillis(millis) {
  const value = Number(millis);
  if (!Number.isFinite(value)) {
    throw new TypeError(`julianDayFromUtcMillis: 유한한 숫자가 아니다 (${millis})`);
  }
  return (value / 86400000) + UNIX_EPOCH_JULIAN_DAY;
}

/**
 * 율리우스일(UT) → UTC 밀리초.
 * @param {number} julianDay
 * @returns {number}
 */
export function utcMillisFromJulianDay(julianDay) {
  const value = Number(julianDay);
  if (!Number.isFinite(value)) {
    throw new TypeError(`utcMillisFromJulianDay: 유한한 숫자가 아니다 (${julianDay})`);
  }
  return (value - UNIX_EPOCH_JULIAN_DAY) * 86400000;
}

/**
 * 여러 율리우스일 시점의 트로피컬 황경을 한 번에 구한다.
 *
 * @param {object} env
 * @param {number[]} julianDays UT 기준 율리우스일 배열
 * @param {string[]} [bodies] TROPICAL_BODY_CONSTANTS 키 또는 "NorthNode". 생략 시 행성 10개
 * @param {object} [options] getSwiss 옵션 + { nodeMode: "true"|"mean" }
 * @returns {Promise<Array<Record<string, {longitude:number, speedLongitude:(number|null)}>>>}
 */
export async function getSwissTropicalLongitudes(env, julianDays, bodies, options = {}) {
  if (!Array.isArray(julianDays) || !julianDays.length) return [];
  const swe = await getSwiss(env, options);
  const iflag = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;
  const nodeConstant = options.nodeMode === "mean" ? "SE_MEAN_NODE" : "SE_TRUE_NODE";
  const requested = Array.isArray(bodies) && bodies.length
    ? bodies
    : Object.keys(TROPICAL_BODY_CONSTANTS);

  return julianDays.map((rawJd) => {
    const jd = Number(rawJd);
    if (!Number.isFinite(jd)) {
      throw toStatusError(400, `Swiss tropical calculation received an invalid julian day (${rawJd}).`);
    }
    const out = {};
    for (const body of requested) {
      const constantName = body === "NorthNode" ? nodeConstant : TROPICAL_BODY_CONSTANTS[body];
      if (!constantName) {
        throw toStatusError(400, `Swiss tropical calculation received an unknown body (${body}).`);
      }
      const result = swe.swe_calc_ut(jd, swe[constantName], iflag);
      const speedLongitude = parseNumber(result?.[3], NaN);
      out[body] = {
        longitude: readLongitudeFromResult(result, body),
        speedLongitude: Number.isFinite(speedLongitude) ? speedLongitude : null,
      };
    }
    return out;
  });
}

export const __swissEphemerisTestUtils = {
  sanitizeUrlLikeEnvValue,
  resolveEpheBaseUrl,
  resolveSwissWasmCandidates,
  resolveSwissWasmPath,
};
