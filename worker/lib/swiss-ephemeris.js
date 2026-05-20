import SwissEPH from "sweph-wasm";
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

let swissPromise = null;

function clean(value) {
  return String(value || "").trim();
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
  } catch {
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
  } catch {
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
    } catch {
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

function aspectBetween(a, b) {
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

function locateHouseByCusps(longitude, cusps) {
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

function normalizeEpheBaseCandidate(rawValue) {
  const raw = clean(rawValue);
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString().endsWith("/") ? parsed.toString() : `${parsed.toString()}/`;
  } catch {
    return "";
  }
}

function resolveEpheBaseUrlCandidates(env, options = {}) {
  const candidates = [];
  const pushCandidate = (value) => {
    const normalized = normalizeEpheBaseCandidate(value);
    if (!normalized) return;
    if (!candidates.includes(normalized)) candidates.push(normalized);
  };

  const fromEnv = clean(
    getEnv(env, "SWISS_EPHEMERIS_FILES_BASE_URL")
    || getEnv(env, "SWISS_EPHE_BASE_URL")
    || getEnv(env, "PUBLIC_EPHE_BASE_URL"),
  );

  if (fromEnv) {
    pushCandidate(fromEnv);
    try {
      const envUrl = new URL(fromEnv);
      const envPathLower = String(envUrl.pathname || "").toLowerCase();
      if (!envPathLower.includes("/ephe")) {
        pushCandidate(new URL("ephe/", envUrl).toString());
      }
    } catch {
      // Ignore malformed env URL and continue with request-origin candidate.
    }
  }

  const requestUrl = clean(options.requestUrl);
  if (requestUrl) {
    try {
      const requestOrigin = new URL(requestUrl).origin;
      pushCandidate(new URL("/ephe/", requestOrigin).toString());
    } catch {
      // Ignore malformed request URL context.
    }
  }

  if (!candidates.length) {
    throw toStatusError(500, "Swiss ephemeris base URL is missing. Set SWISS_EPHEMERIS_FILES_BASE_URL or provide request URL context.");
  }

  return candidates;
}

async function createSwissInstance(env, options = {}) {
  const wasmPath = clean(getEnv(env, "SWISS_WASM_PATH") || options.wasmPath);
  const swe = await SwissEPH.init(wasmPath || undefined);
  const epheBaseCandidates = resolveEpheBaseUrlCandidates(env, options);

  let lastError = null;
  for (const epheBaseUrl of epheBaseCandidates) {
    try {
      await swe.swe_set_ephe_path(epheBaseUrl, EPHE_FILES);
      return swe;
    } catch (error) {
      lastError = error;
    }
  }

  const errorMessage = lastError?.message || lastError || "unknown error";
  throw toStatusError(
    500,
    `Swiss ephemeris load failed from all candidates (${epheBaseCandidates.join(", ")}): ${errorMessage}`,
  );
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
  const swe = await getSwiss(env, options);
  const input = normalizeChartInput(payload);
  validateChartInput(input);

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
  };
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
  };
}
