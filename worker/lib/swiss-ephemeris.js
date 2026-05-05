import { getEnv } from "./env.js";
import { createHttpError } from "./http.js";

const SIGN_KO = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];
const SIGN_EMOJI = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];
const WESTERN_PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];

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

function firstFinite(...values) {
  for (const value of values) {
    if (Number.isFinite(value)) return value;
  }
  return NaN;
}

function pickSwissBaseUrl(env) {
  return clean(
    getEnv(env, "SWISS_EPHEMERIS_API_URL")
    || getEnv(env, "SWISS_API_BASE_URL")
    || getEnv(env, "ASTRO_SWISS_API_URL")
    || getEnv(env, "SWISS_EPHEMERIS_URL")
    || getEnv(env, "SWISS_EPHEMERIS")
  );
}

function pickSwissApiKey(env) {
  return clean(
    getEnv(env, "SWISS_EPHEMERIS_API_KEY")
    || getEnv(env, "SWISS_API_KEY")
    || getEnv(env, "ASTRO_SWISS_API_KEY")
    || getEnv(env, "SWISS_EPHEMERIS_KEY")
  );
}

function pickSwissTimeoutMs(env) {
  const timeoutMs = Number(
    getEnv(env, "SWISS_EPHEMERIS_TIMEOUT_MS")
    || getEnv(env, "SWISS_API_TIMEOUT_MS")
    || getEnv(env, "SWISS_EPHEMERIS_TIMEOUT")
    || 9000,
  );
  return Number.isFinite(timeoutMs) ? Math.max(1500, timeoutMs) : 9000;
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

function extractLon(value) {
  if (typeof value === "number") return nd(value);
  if (value && typeof value === "object") {
    return nd(value.longitude ?? value.lon ?? value.elon ?? value.deg ?? value.degree);
  }
  return NaN;
}

function extractObject(root) {
  if (!root || typeof root !== "object") return {};
  return root;
}

function parsePayloadJson(raw) {
  if (raw && typeof raw === "object") return raw;
  return {};
}

function toStatusError(status, message) {
  return createHttpError(status, message, { ok: false, error: message });
}

async function fetchSwiss(env, pathname, payload) {
  const baseUrl = pickSwissBaseUrl(env);
  if (!baseUrl) {
    throw toStatusError(500, "Swiss endpoint env is missing. Set SWISS_EPHEMERIS_API_URL (or SWISS_API_BASE_URL / ASTRO_SWISS_API_URL / SWISS_EPHEMERIS_URL / SWISS_EPHEMERIS).");
  }

  const url = new URL(pathname, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  const apiKey = pickSwissApiKey(env);
  const headers = { "Content-Type": "application/json" };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
    headers["x-api-key"] = apiKey;
  }

  const timeoutMs = pickSwissTimeoutMs(env);
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeoutId = setTimeout(() => {
    if (controller) {
      try { controller.abort(); } catch (_) {}
    }
  }, timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify(payload || {}),
      signal: controller ? controller.signal : undefined,
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = clean(json?.error || json?.message) || `Swiss API 오류 (HTTP ${response.status})`;
      throw toStatusError(response.status, message);
    }

    return parsePayloadJson(json);
  } catch (error) {
    if (error?.name === "AbortError") {
      throw toStatusError(504, `Swiss API 요청이 ${timeoutMs}ms 내에 완료되지 않았습니다.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function resolvePayloadRoot(payload) {
  const root = extractObject(payload);
  if (root.data && typeof root.data === "object") return root.data;
  if (root.result && typeof root.result === "object") return root.result;
  return root;
}

function normalizeWesternChart(payload) {
  const root = resolvePayloadRoot(payload);
  const planetsSource = extractObject(root.planets);
  const pointsSource = extractObject(root.points);

  const ascLon = firstFinite(
    extractLon(root.ascendant),
    extractLon(pointsSource.ascendant),
    extractLon(pointsSource.ASC),
    extractLon(root.asc),
    extractLon(root.risingSign),
  );

  if (!Number.isFinite(ascLon)) {
    throw toStatusError(502, "Swiss API 응답에 ascendant longitude가 없습니다.");
  }

  const planets = {};
  for (const name of WESTERN_PLANETS) {
    const lon = extractLon(planetsSource[name]);
    if (!Number.isFinite(lon)) {
      throw toStatusError(502, `Swiss API 응답에 ${name} longitude가 없습니다.`);
    }
    planets[name] = signInfo(lon, ascLon);
  }

  const northNodeLon = firstFinite(
    extractLon(planetsSource.NorthNode),
    extractLon(planetsSource.Rahu),
    extractLon(pointsSource.northNode),
    extractLon(root.northNode),
  );

  const aspects = [];
  const names = Object.keys(planets);
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      const hit = aspectBetween(planets[names[i]].longitude, planets[names[j]].longitude);
      if (hit) aspects.push({ p1: names[i], p2: names[j], ...hit });
    }
  }

  const asc = signInfo(ascLon, ascLon);
  const mcLon = firstFinite(
    extractLon(root.midheaven),
    extractLon(pointsSource.midheaven),
    extractLon(pointsSource.MC),
    nd(ascLon + 90),
  );
  const nnLon = Number.isFinite(northNodeLon) ? northNodeLon : nd(ascLon + 120);

  return {
    planets,
    ascendant: asc,
    midheaven: signInfo(mcLon, ascLon),
    northNode: signInfo(nnLon, ascLon),
    southNode: signInfo(nnLon + 180, ascLon),
    aspects,
    source: "swiss-api",
  };
}

function normalizeVedicPlanets(payload) {
  const root = resolvePayloadRoot(payload);
  const planetsSource = extractObject(root.planets);
  const names = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Rahu", "Ketu"];

  const planets = {};
  for (const name of names) {
    const lon = extractLon(planetsSource[name]);
    if (!Number.isFinite(lon)) {
      throw toStatusError(502, `Swiss API 응답에 ${name} sidereal longitude가 없습니다.`);
    }
    planets[name] = lon;
  }

  const ayanamsa = parseNumber(root.ayanamsa, NaN);
  if (!Number.isFinite(ayanamsa)) {
    throw toStatusError(502, "Swiss API 응답에 ayanamsa가 없습니다.");
  }

  const ascendantSidereal = firstFinite(
    extractLon(root.ascendantSidereal),
    extractLon(root.ascendant),
    extractLon(root.lagna),
  );

  return {
    planets,
    ayanamsa,
    ascendantSidereal: Number.isFinite(ascendantSidereal) ? ascendantSidereal : null,
    source: "swiss-api",
  };
}

export async function getSwissWesternChart(env, payload) {
  const raw = await fetchSwiss(env, "western-chart", payload);
  return normalizeWesternChart(raw);
}

export async function getSwissVedicPlanets(env, payload) {
  const raw = await fetchSwiss(env, "vedic-planets", payload);
  return normalizeVedicPlanets(raw);
}
