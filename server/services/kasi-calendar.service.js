const KASI_BASE_URL = String(
  process.env.KASI_API_BASE_URL ||
  "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService",
).replace(/\/+$/, "");

const KASI_SERVICE_KEY = String(process.env.KASI_SERVICE_KEY || "").trim();
const CACHE_TTL_MS = Math.max(30, Number(process.env.KASI_CACHE_TTL_SECONDS || 60 * 60 * 24)) * 1000;
const FETCH_TIMEOUT_MS = Math.max(1000, Number(process.env.KASI_PROXY_TIMEOUT_MS || 3000));

const ALLOWED_METHODS = new Set(["getLunCalInfo", "getSolCalInfo", "get24DivisionsInfo"]);

const memoryCache = new Map();
const inflightCache = new Map();

let redisCreateClient = null;
try {
  ({ createClient: redisCreateClient } = require("redis"));
} catch (e) {
  redisCreateClient = null;
}

let redisClientPromise = null;

function decodeServiceKeyCandidate(rawKey) {
  if (!rawKey) return "";
  const key = String(rawKey).trim();
  if (!key) return "";
  try {
    return decodeURIComponent(key);
  } catch (e) {
    return key;
  }
}

const PRIMARY_DECODED_SERVICE_KEY = decodeServiceKeyCandidate(KASI_SERVICE_KEY);
const KASI_SERVICE_KEY_CANDIDATES = Array.from(
  new Set([PRIMARY_DECODED_SERVICE_KEY, KASI_SERVICE_KEY].filter(Boolean)),
);

async function getRedisClient() {
  if (!process.env.REDIS_URL || !redisCreateClient) return null;
  if (redisClientPromise) return redisClientPromise;

  redisClientPromise = (async () => {
    const client = redisCreateClient({ url: process.env.REDIS_URL });
    client.on("error", (err) => {
      console.error("[KASI][Redis] error:", err?.message || err);
    });
    await client.connect();
    return client;
  })().catch((err) => {
    console.error("[KASI][Redis] connect failed, memory cache only:", err?.message || err);
    redisClientPromise = null;
    return null;
  });

  return redisClientPromise;
}

function assertServiceKey() {
  if (!KASI_SERVICE_KEY_CANDIDATES.length) {
    const err = new Error("KASI_SERVICE_KEY 환경변수가 필요합니다.");
    err.status = 500;
    throw err;
  }
}

function normalizeMethod(method) {
  const m = String(method || "").trim();
  if (!ALLOWED_METHODS.has(m)) {
    const err = new Error("지원하지 않는 KASI 메서드입니다.");
    err.status = 400;
    throw err;
  }
  return m;
}

function stableSortObject(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  const out = {};
  Object.keys(obj)
    .sort()
    .forEach((k) => {
      out[k] = stableSortObject(obj[k]);
    });
  return out;
}

function buildCacheKey(method, params) {
  return `kasi:v1:${method}:${JSON.stringify(stableSortObject(params || {}))}`;
}

function getMemoryCache(key) {
  const hit = memoryCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.savedAt > CACHE_TTL_MS) {
    memoryCache.delete(key);
    return null;
  }
  return hit.payload;
}

function setMemoryCache(key, payload) {
  memoryCache.set(key, { savedAt: Date.now(), payload });
}

async function getRedisCache(key) {
  const redis = await getRedisClient();
  if (!redis) return null;
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

async function setRedisCache(key, payload) {
  const redis = await getRedisClient();
  if (!redis) return;
  await redis.set(key, JSON.stringify(payload), { EX: Math.ceil(CACHE_TTL_MS / 1000) });
}

function normalizeRows(payload) {
  const body = payload?.response?.body || {};
  const item = body?.items?.item;
  if (Array.isArray(item)) return item;
  if (item && typeof item === "object") return [item];
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

function decodeXmlEntities(value) {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function extractXmlTagText(xmlText, tagName) {
  const re = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = re.exec(String(xmlText || ""));
  return match ? decodeXmlEntities(match[1]) : "";
}

function parseXmlItems(xmlText) {
  const rows = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let itemMatch;

  while ((itemMatch = itemRe.exec(xmlText))) {
    const block = itemMatch[1] || "";
    const row = {};
    const fieldRe = /<([a-zA-Z0-9_]+)>([\s\S]*?)<\/\1>/g;
    let fieldMatch;

    while ((fieldMatch = fieldRe.exec(block))) {
      const key = fieldMatch[1];
      const value = decodeXmlEntities(fieldMatch[2]);
      row[key] = value;
    }

    if (Object.keys(row).length) rows.push(row);
  }

  return rows;
}

function normalizePayloadFromRaw(rawText) {
  const text = String(rawText || "").trim();
  if (!text) return { payload: null, parsedAs: "empty" };

  try {
    return { payload: JSON.parse(text), parsedAs: "json" };
  } catch (_jsonErr) {
    const resultCode = extractXmlTagText(text, "resultCode");
    const resultMsg = extractXmlTagText(text, "resultMsg");
    const rows = parseXmlItems(text);
    if (resultCode || resultMsg || rows.length) {
      return {
        payload: {
          response: {
            header: {
              resultCode: resultCode || "00",
              resultMsg: resultMsg || "NORMAL SERVICE.",
            },
            body: {
              items: {
                item: rows,
              },
            },
          },
        },
        parsedAs: "xml",
      };
    }
  }

  return { payload: null, parsedAs: "unknown" };
}

async function fetchKasi(method, params) {
  assertServiceKey();

  let lastError = null;

  for (let idx = 0; idx < KASI_SERVICE_KEY_CANDIDATES.length; idx += 1) {
    const serviceKey = KASI_SERVICE_KEY_CANDIDATES[idx];
    const query = new URLSearchParams({
      ...(params || {}),
      serviceKey,
      _type: "json",
    });
    const url = `${KASI_BASE_URL}/${method}?${query.toString()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });

      const rawText = await response.text();
      const parsed = normalizePayloadFromRaw(rawText);
      const payload = parsed.payload;
      if (!payload && String(rawText || "").trim()) {
        const err = new Error("KASI 응답 파싱 실패(JSON/XML 아님)");
        err.status = 503;
        err.detail = "Unsupported payload format";
        err.remoteSnippet = String(rawText).slice(0, 260);
        throw err;
      }

      if (!response.ok) {
        const err = new Error(`KASI 응답 오류: HTTP ${response.status}`);
        err.status = 503;
        err.remote = payload;
        throw err;
      }

      const resultCode = String(payload?.response?.header?.resultCode || "");
      if (resultCode && resultCode !== "00") {
        const err = new Error(payload?.response?.header?.resultMsg || "KASI API 오류");
        err.status = 503;
        err.remote = payload;
        err.resultCode = resultCode;
        throw err;
      }

      if (parsed.parsedAs === "xml") {
        console.info(`[KASI] parsed XML payload method=${method}`);
      }

      return normalizeRows(payload);
    } catch (error) {
      if (error?.name === "AbortError") {
        const timeoutError = new Error("KASI API 타임아웃");
        timeoutError.status = 503;
        lastError = timeoutError;
      } else {
        lastError = error;
      }

      console.error(
        `[KASI] fetch failed method=${method} keyVariant=${idx + 1}/${KASI_SERVICE_KEY_CANDIDATES.length} params=${JSON.stringify(params || {})}`,
        lastError?.message || lastError,
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError || new Error("KASI API 호출 실패");
}

async function requestCalendar(method, params) {
  const safeMethod = normalizeMethod(method);
  const cacheKey = buildCacheKey(safeMethod, params);

  const mem = getMemoryCache(cacheKey);
  if (mem) {
    return { rows: mem, cache: { hit: true, layer: "memory" } };
  }

  const redisHit = await getRedisCache(cacheKey);
  if (redisHit) {
    setMemoryCache(cacheKey, redisHit);
    return { rows: redisHit, cache: { hit: true, layer: "redis" } };
  }

  const inflight = inflightCache.get(cacheKey);
  if (inflight) {
    const rows = await inflight;
    return { rows, cache: { hit: true, layer: "inflight" } };
  }

  const task = (async () => {
    const rows = await fetchKasi(safeMethod, params);
    setMemoryCache(cacheKey, rows);
    await setRedisCache(cacheKey, rows).catch(() => {});
    return rows;
  })();

  inflightCache.set(cacheKey, task);

  try {
    const rows = await task;
    return { rows, cache: { hit: false, layer: "network" } };
  } finally {
    inflightCache.delete(cacheKey);
  }
}

module.exports = {
  requestCalendar,
  ALLOWED_METHODS: Array.from(ALLOWED_METHODS),
};
