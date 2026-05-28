import { createHttpError, getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";

const PRIMARY_KASI_BASE_URL = "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService";
const SECONDARY_KASI_BASE_URL = "https://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService";
const ALLOWED_METHODS = new Set(["getLunCalInfo", "getSolCalInfo", "get24DivisionsInfo"]);
const LEGACY_CACHE_TTL_MS = 1000 * 60 * 30;
const CALENDAR_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const BREAKER_FAILURE_THRESHOLD = 3;
const BREAKER_COOLDOWN_MS = 1000 * 60 * 10;
const MAX_RETRIES = 1;

const LEGACY_METHOD_CACHE = new Map();
const LEGACY_METHOD_INFLIGHT = new Map();
const CALENDAR_RESULT_CACHE = new Map();
const CALENDAR_RESULT_INFLIGHT = new Map();

const breakerState = {
  consecutiveFailures: 0,
  openUntil: 0,
  lastReason: null,
};

const APPROX_SOLAR_TERMS = [
  ["소한", 1, 6],
  ["대한", 1, 20],
  ["입춘", 2, 4],
  ["우수", 2, 19],
  ["경칩", 3, 6],
  ["춘분", 3, 21],
  ["청명", 4, 5],
  ["곡우", 4, 20],
  ["입하", 5, 6],
  ["소만", 5, 21],
  ["망종", 6, 6],
  ["하지", 6, 21],
  ["소서", 7, 7],
  ["대서", 7, 23],
  ["입추", 8, 8],
  ["처서", 8, 23],
  ["백로", 9, 8],
  ["추분", 9, 23],
  ["한로", 10, 8],
  ["상강", 10, 23],
  ["입동", 11, 7],
  ["소설", 11, 22],
  ["대설", 12, 7],
  ["동지", 12, 22],
];

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

function normalizeMethod(method) {
  const value = String(method || "").trim();
  if (!ALLOWED_METHODS.has(value)) {
    throw createHttpError(400, "지원하지 않는 KASI 메서드입니다.", { code: "KASI_INVALID_METHOD" });
  }
  return value;
}

function normalizeRows(payload) {
  const body = payload?.response?.body || {};
  const item = body?.items?.item;
  if (Array.isArray(item)) return item;
  if (item && typeof item === "object") return [item];
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function toInt(value, fallback = null) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function normalizeCalendarType(value) {
  const raw = String(value || "solar").trim().toLowerCase();
  if (raw === "lunar" || raw === "음력") return "lunar";
  if (raw === "lunar_leap" || raw === "윤달" || raw === "음력윤달" || raw === "leap") return "lunar_leap";
  return "solar";
}

function buildLegacyRequestKey(method, params) {
  const entries = Object.entries((params && typeof params === "object") ? params : {})
    .map(([k, v]) => [String(k), String(v ?? "")])
    .sort(([a], [b]) => a.localeCompare(b));
  const serialized = entries.map(([k, v]) => `${k}=${v}`).join("&");
  return `${method}|${serialized}`;
}

function buildCalendarDateKey(input) {
  return [
    "calendar",
    input.calendarType,
    String(input.year),
    pad2(input.month),
    pad2(input.day),
  ].join(":");
}

function readCache(map, key) {
  const hit = map.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    map.delete(key);
    return null;
  }
  return hit.value;
}

function writeCache(map, key, value, ttlMs) {
  map.set(key, {
    expiresAt: Date.now() + Math.max(1000, Number(ttlMs) || 1000),
    value,
  });
}

function isCircuitOpen() {
  return Date.now() < breakerState.openUntil;
}

function noteKasiSuccess() {
  breakerState.consecutiveFailures = 0;
  breakerState.lastReason = null;
}

function noteKasiFailure(reason) {
  breakerState.consecutiveFailures += 1;
  breakerState.lastReason = reason || null;
  if (breakerState.consecutiveFailures >= BREAKER_FAILURE_THRESHOLD) {
    breakerState.openUntil = Date.now() + BREAKER_COOLDOWN_MS;
  }
}

function buildApproxSolarTerms(year) {
  const safeYear = toInt(year, new Date().getUTCFullYear());
  return APPROX_SOLAR_TERMS.map(([name, month, day], idx) => ({
    name,
    date: `${safeYear}-${pad2(month)}-${pad2(day)}`,
    julianDay: idx + 1,
  }));
}

function buildApproxSolarTermRows(year) {
  const safeYear = toInt(year, new Date().getUTCFullYear());
  return APPROX_SOLAR_TERMS.map(([name, month, day]) => ({
    dateName: name,
    solYear: String(safeYear),
    solMonth: pad2(month),
    solDay: pad2(day),
    time: "00:00",
  }));
}

function normalizeSolarTermRows(rows = [], fallbackYear = null) {
  if (!Array.isArray(rows) || !rows.length) {
    return buildApproxSolarTerms(fallbackYear);
  }

  const normalized = rows
    .map((row, idx) => {
      const name = String(
        row?.dateName
        || row?.termName
        || row?.solTermName
        || row?.name
        || "",
      ).trim();

      const year = toInt(row?.solYear ?? row?.year, fallbackYear);
      const month = toInt(row?.solMonth ?? row?.month, null);
      const day = toInt(row?.solDay ?? row?.day, null);
      if (!name || !year || !month || !day) return null;

      return {
        name,
        date: `${year}-${pad2(month)}-${pad2(day)}`,
        julianDay: idx + 1,
      };
    })
    .filter(Boolean);

  return normalized.length ? normalized : buildApproxSolarTerms(fallbackYear);
}

function buildLegacyLocalFallback(method, params, warningCode = "KASI_FALLBACK_USED") {
  const yearCandidate = toInt(params?.solYear ?? params?.year, new Date().getUTCFullYear());
  const rows = method === "get24DivisionsInfo" ? buildApproxSolarTermRows(yearCandidate) : [];
  return {
    ok: true,
    method,
    rows,
    cache: "miss",
    source: "local",
    maintenance: false,
    fallbackRecommended: false,
    warnings: [warningCode],
  };
}

function normalizeCalendarInput(body) {
  const year = toInt(body?.year, null);
  const month = toInt(body?.month, null);
  const day = toInt(body?.day, null);
  if (!year || !month || !day) {
    throw createHttpError(400, "year/month/day 입력이 필요합니다.", {
      code: "KASI_BAD_REQUEST",
    });
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw createHttpError(400, "유효하지 않은 날짜입니다.", {
      code: "KASI_BAD_REQUEST",
    });
  }

  return {
    year,
    month,
    day,
    hour: toInt(body?.hour, 12),
    minute: toInt(body?.minute, 0),
    calendarType: normalizeCalendarType(body?.calendarType),
  };
}

function calculateCalendarLocally(input, warningCode = null) {
  const result = {
    ok: true,
    source: "local",
    dateKey: buildCalendarDateKey(input),
    solar: {
      year: input.year,
      month: input.month,
      day: input.day,
    },
    solarTerms: buildApproxSolarTerms(input.year),
    warnings: [],
  };

  if (input.calendarType !== "solar") {
    result.lunar = {
      year: input.year,
      month: input.month,
      day: input.day,
      isLeapMonth: input.calendarType === "lunar_leap",
    };
    result.warnings.push("LOCAL_LUNAR_APPROX_USED");
  }

  if (warningCode) {
    result.warnings.push(warningCode);
  }

  return result;
}

function buildBaseUrlCandidates(env) {
  const configured = String(env.KASI_API_BASE_URL || "").trim();
  return Array.from(new Set([
    configured,
    PRIMARY_KASI_BASE_URL,
    SECONDARY_KASI_BASE_URL,
  ].map((value) => String(value || "").trim().replace(/\/+$/, "")).filter(Boolean)));
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
  } catch (e) {
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

function toUpstreamStatus(error) {
  const payloadStatus = Number(error?.payload?.upstreamStatus || 0);
  const embeddedStatus = Number(error?.upstreamStatus || 0);
  const status = Number(error?.status || 0);
  return payloadStatus || embeddedStatus || status || 0;
}

function isAuthLikeUpstreamError(error) {
  const status = toUpstreamStatus(error);
  return status === 401 || status === 403;
}

function choosePreferredError(current, candidate) {
  if (!candidate) return current;
  if (!current) return candidate;

  if (isAuthLikeUpstreamError(candidate) && !isAuthLikeUpstreamError(current)) return candidate;
  if (isAuthLikeUpstreamError(current) && !isAuthLikeUpstreamError(candidate)) return current;

  const curStatus = toUpstreamStatus(current);
  const nextStatus = toUpstreamStatus(candidate);

  const curIs404 = curStatus === 404;
  const nextIs404 = nextStatus === 404;
  if (curIs404 && !nextIs404) return candidate;
  if (!curIs404 && nextIs404) return current;

  return candidate;
}

async function fetchKasiUpstream(env, method, params) {
  if (isCircuitOpen()) {
    throw createHttpError(503, "KASI circuit is open", { code: "KASI_CIRCUIT_OPEN" });
  }

  const kasiBaseUrls = buildBaseUrlCandidates(env);
  const timeoutMs = Math.max(1000, Number(env.KASI_PROXY_TIMEOUT_MS || 4500));

  const decoded = decodeServiceKeyCandidate(env.KASI_SERVICE_KEY);
  const candidates = Array.from(new Set([decoded, String(env.KASI_SERVICE_KEY || "").trim()].filter(Boolean)));
  if (!candidates.length) {
    throw createHttpError(503, "KASI_SERVICE_KEY 환경변수가 필요합니다.", { code: "KASI_KEY_MISSING" });
  }

  let lastError = null;

  for (const kasiBaseUrl of kasiBaseUrls) {
    for (const serviceKey of candidates) {
      const query = new URLSearchParams({
        ...params,
        serviceKey,
        _type: "json",
      });

      const url = `${kasiBaseUrl}/${method}?${query.toString()}`;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
        const controller = typeof AbortController === "function" ? new AbortController() : null;
        const timer = setTimeout(() => {
          if (controller) {
            try {
              controller.abort();
            } catch (_) {}
          }
        }, timeoutMs);

        try {
          const response = await fetch(url, {
            method: "GET",
            headers: { Accept: "application/json" },
            signal: controller ? controller.signal : undefined,
          });

          const rawText = await response.text();
          const parsed = normalizePayloadFromRaw(rawText);
          const payload = parsed.payload;
          if (!payload && String(rawText || "").trim()) {
            throw createHttpError(503, "KASI 응답 파싱 실패(JSON/XML 아님)", {
              code: "KASI_PARSE_ERROR",
              upstreamStatus: response.status,
              upstreamBase: kasiBaseUrl,
            });
          }

          if (!response.ok || !payload) {
            throw createHttpError(503, `KASI 응답 오류: HTTP ${response.status}`, {
              code: "KASI_UPSTREAM_ERROR",
              upstreamStatus: response.status,
              upstreamBase: kasiBaseUrl,
            });
          }

          const resultCode = String(payload?.response?.header?.resultCode || "");
          if (resultCode && resultCode !== "00") {
            throw createHttpError(503, payload?.response?.header?.resultMsg || "KASI API 오류", {
              code: "KASI_UPSTREAM_ERROR",
              resultCode,
              upstreamStatus: response.status,
              upstreamBase: kasiBaseUrl,
            });
          }

          noteKasiSuccess();
          return {
            rows: normalizeRows(payload),
            cache: "miss",
          };
        } catch (error) {
          if (error?.name === "AbortError") {
            lastError = choosePreferredError(lastError, createHttpError(503, "KASI API 타임아웃", {
              code: "KASI_TIMEOUT",
              upstreamBase: kasiBaseUrl,
            }));
          } else {
            lastError = choosePreferredError(lastError, error);
          }

          if (isAuthLikeUpstreamError(lastError)) {
            noteKasiFailure(lastError?.code || "KASI_KEY_FORBIDDEN");
            throw lastError;
          }

          const canRetry = attempt < MAX_RETRIES;
          if (!canRetry) {
            noteKasiFailure(lastError?.code || "KASI_UPSTREAM_ERROR");
          }
          if (!canRetry) break;
        } finally {
          clearTimeout(timer);
        }
      }
    }
  }

  throw lastError || createHttpError(503, "KASI API 요청 실패", { code: "KASI_REQUEST_FAILED" });
}

async function requestLegacyMethod(env, methodRaw, paramsRaw) {
  const method = normalizeMethod(methodRaw);
  const params = (paramsRaw && typeof paramsRaw === "object") ? paramsRaw : {};
  const key = buildLegacyRequestKey(method, params);
  const cached = readCache(LEGACY_METHOD_CACHE, key);
  if (cached) {
    return {
      ...cached,
      cache: "hit",
      source: "cache",
    };
  }

  const inflight = LEGACY_METHOD_INFLIGHT.get(key);
  if (inflight) return inflight;

  const task = (async () => {
    if (isCircuitOpen()) {
      const fallback = buildLegacyLocalFallback(method, params, "KASI_CIRCUIT_OPEN");
      writeCache(LEGACY_METHOD_CACHE, key, fallback, LEGACY_CACHE_TTL_MS);
      return fallback;
    }

    try {
      const result = await fetchKasiUpstream(env, method, params);
      const payload = {
        ok: true,
        method,
        rows: result?.rows || [],
        cache: result?.cache || "miss",
        source: "kasi",
        maintenance: false,
        fallbackRecommended: false,
        warnings: [],
      };
      writeCache(LEGACY_METHOD_CACHE, key, payload, LEGACY_CACHE_TTL_MS);
      return payload;
    } catch (error) {
      const fallbackCode = error?.code || "KASI_FALLBACK_USED";
      const fallback = buildLegacyLocalFallback(method, params, fallbackCode === "KASI_CIRCUIT_OPEN" ? fallbackCode : "KASI_FALLBACK_USED");
      writeCache(LEGACY_METHOD_CACHE, key, fallback, LEGACY_CACHE_TTL_MS);
      return fallback;
    }
  })();

  LEGACY_METHOD_INFLIGHT.set(key, task);
  return task.finally(() => {
    LEGACY_METHOD_INFLIGHT.delete(key);
  });
}

async function requestCalendarSummary(env, inputRaw) {
  const input = normalizeCalendarInput(inputRaw);
  const dateKey = buildCalendarDateKey(input);

  const cached = readCache(CALENDAR_RESULT_CACHE, dateKey);
  if (cached) {
    return {
      ...cached,
      source: "cache",
    };
  }

  const inflight = CALENDAR_RESULT_INFLIGHT.get(dateKey);
  if (inflight) return inflight;

  const task = (async () => {
    const local = calculateCalendarLocally(input);

    if (isCircuitOpen()) {
      const fromCircuit = {
        ...local,
        warnings: Array.from(new Set([...(local.warnings || []), "KASI_CIRCUIT_OPEN"])),
      };
      writeCache(CALENDAR_RESULT_CACHE, dateKey, fromCircuit, CALENDAR_CACHE_TTL_MS);
      return fromCircuit;
    }

    try {
      const upstream = await fetchKasiUpstream(env, "get24DivisionsInfo", {
        solYear: String(input.year),
        numOfRows: "30",
      });

      const solarTerms = normalizeSolarTermRows(upstream?.rows || [], input.year);
      const merged = {
        ...local,
        source: "kasi",
        solarTerms,
      };

      writeCache(CALENDAR_RESULT_CACHE, dateKey, merged, CALENDAR_CACHE_TTL_MS);
      return merged;
    } catch (_) {
      const fallback = {
        ...local,
        warnings: Array.from(new Set([...(local.warnings || []), "KASI_FALLBACK_USED"])),
      };
      writeCache(CALENDAR_RESULT_CACHE, dateKey, fallback, CALENDAR_CACHE_TTL_MS);
      return fallback;
    }
  })();

  CALENDAR_RESULT_INFLIGHT.set(dateKey, task);
  return task.finally(() => {
    CALENDAR_RESULT_INFLIGHT.delete(dateKey);
  });
}

export async function handleKasiRoutes(request, env = {}) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/kasi");

    if (path === "/methods") {
      if (method !== "GET") return methodNotAllowed();
      return json({ ok: true, methods: Array.from(ALLOWED_METHODS) });
    }

    if (path !== "/calendar") {
      if (["GET", "POST"].includes(method)) return notFound();
      return methodNotAllowed();
    }

    if (method !== "POST") {
      if (["GET", "POST"].includes(method)) return notFound();
      return methodNotAllowed();
    }

    const body = await readJson(request);

    if (body && typeof body === "object" && body.method) {
      const legacy = await requestLegacyMethod(env, body?.method, body?.params || {});
      return json(legacy);
    }

    const calendar = await requestCalendarSummary(env, body || {});
    return json(calendar);
  } catch (error) {
    if (Number(error?.status) === 400) {
      return json({
        ok: false,
        maintenance: false,
        fallbackRecommended: false,
        message: error?.message || "KASI 요청 파라미터를 확인해 주세요.",
        detail: error?.message || null,
      }, { status: 400 });
    }

    const now = new Date();
    const emergencyInput = {
      year: toInt(now.getUTCFullYear(), now.getUTCFullYear()),
      month: toInt(now.getUTCMonth() + 1, 1),
      day: toInt(now.getUTCDate(), 1),
      hour: 12,
      minute: 0,
      calendarType: "solar",
    };

    const emergency = calculateCalendarLocally(emergencyInput, "LOCAL_EMERGENCY_FALLBACK_USED");
    return json(emergency);
  }
}