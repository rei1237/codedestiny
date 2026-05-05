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
    house: Math.floor(nd(normalized - ascLon) / 30) + 1,
  };
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

function resolveEpheBaseUrl(env, options = {}) {
  const fromEnv = clean(
    getEnv(env, "SWISS_EPHEMERIS_FILES_BASE_URL")
    || getEnv(env, "SWISS_EPHE_BASE_URL")
    || getEnv(env, "PUBLIC_EPHE_BASE_URL"),
  );
  if (fromEnv) {
    return fromEnv.endsWith("/") ? fromEnv : `${fromEnv}/`;
  }

  const requestUrl = clean(options.requestUrl);
  if (requestUrl) {
    return new URL("/ephe/", requestUrl).toString();
  }

  throw toStatusError(500, "Swiss ephemeris base URL is missing. Set SWISS_EPHEMERIS_FILES_BASE_URL or provide request URL context.");
}

async function createSwissInstance(env, options = {}) {
  const wasmPath = clean(getEnv(env, "SWISS_WASM_PATH") || options.wasmPath);
  const swe = await SwissEPH.init(wasmPath || undefined);
  const epheBaseUrl = resolveEpheBaseUrl(env, options);

  try {
    await swe.swe_set_ephe_path(epheBaseUrl, EPHE_FILES);
  } catch (error) {
    throw toStatusError(500, `Swiss ephemeris load failed from ${epheBaseUrl}: ${error?.message || error}`);
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
    out[name] = readLongitudeFromResult(result, name);
  }
  return out;
}

function calcAscMc(swe, jd, iflag, lat, lon) {
  const houses = swe.swe_houses_ex(jd, iflag, lat, lon, "P");
  const asc = nd(houses?.ascmc?.[0]);
  const mc = nd(houses?.ascmc?.[1]);
  if (!Number.isFinite(asc) || !Number.isFinite(mc)) {
    throw toStatusError(502, "Swiss calculation returned invalid ascendant/midheaven.");
  }
  return { asc, mc };
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
  const { asc, mc } = calcAscMc(swe, jd, iflag, input.lat, input.lon);

  const planets = {};
  for (const [name] of WESTERN_PLANETS) {
    planets[name] = signInfo(rawPlanets[name], asc);
  }

  const trueNodeLon = readLongitudeFromResult(swe.swe_calc_ut(jd, swe.SE_TRUE_NODE, iflag), "NorthNode");
  const aspects = calcAspects(planets);

  return {
    planets,
    ascendant: signInfo(asc, asc),
    midheaven: signInfo(mc, asc),
    northNode: signInfo(trueNodeLon, asc),
    southNode: signInfo(trueNodeLon + 180, asc),
    aspects,
    source: "swiss-wasm-local",
  };
}

export async function getSwissVedicPlanets(env, payload, options = {}) {
  const swe = await getSwiss(env, options);
  const input = normalizeChartInput(payload);
  validateChartInput(input);

  const jd = julianDayFromInput(swe, input);
  const tropicalFlag = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;
  swe.swe_set_sid_mode(swe.SE_SIDM_LAHIRI, 0, 0);
  const siderealFlag = tropicalFlag | swe.SEFLG_SIDEREAL;

  const planets = calcPlanetsByMap(swe, jd, siderealFlag, VEDIC_PLANETS);
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
    ayanamsa,
    ascendantSidereal: Number.isFinite(siderealAsc) ? siderealAsc : null,
    source: "swiss-wasm-local",
  };
}
