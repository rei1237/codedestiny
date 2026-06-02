import { NextRequest, NextResponse } from "next/server";

const DEFAULT_KASI_BASE_URL = "https://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService";
const LEGACY_KASI_BASE_URL = "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService";
const ALLOWED_METHODS = new Set(["getLunCalInfo", "getSolCalInfo", "get24DivisionsInfo"]);

const KASI_SERVICE_KEY = String(process.env.KASI_SERVICE_KEY || "").trim();
const FETCH_TIMEOUT_MS = Math.max(1000, Number(process.env.KASI_PROXY_TIMEOUT_MS || 2500));
const LEGACY_CACHE_TTL_MS = 1000 * 60 * 30;
const CALENDAR_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const BREAKER_FAILURE_THRESHOLD = 3;
const BREAKER_COOLDOWN_MS = 1000 * 60 * 10;
const MAX_RETRIES = 1;

const LEGACY_METHOD_CACHE = new Map<string, { expiresAt: number; value: any }>();
const LEGACY_METHOD_INFLIGHT = new Map<string, Promise<any>>();
const CALENDAR_RESULT_CACHE = new Map<string, { expiresAt: number; value: any }>();
const CALENDAR_RESULT_INFLIGHT = new Map<string, Promise<any>>();

const breakerState = {
  consecutiveFailures: 0,
  openUntil: 0,
};

function pad2(value: number | string) {
  return String(value).padStart(2, "0");
}

function toInt(value: unknown, fallback: number | null = null) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function decodeServiceKeyCandidate(rawKey: string) {
  if (!rawKey) return "";
  const key = String(rawKey).trim();
  if (!key) return "";
  try {
    return decodeURIComponent(key);
  } catch (e) {
    return key;
  }
}

function normalizeMethod(method: unknown) {
  const m = String(method || "").trim();
  if (!ALLOWED_METHODS.has(m)) {
    const err = new Error("지원하지 않는 KASI 메서드입니다.") as Error & { status?: number; code?: string };
    err.status = 400;
    err.code = "KASI_INVALID_METHOD";
    throw err;
  }
  return m;
}

function normalizeRows(payload: any) {
  const body = payload?.response?.body || {};
  const item = body?.items?.item;
  if (Array.isArray(item)) return item;
  if (item && typeof item === "object") return [item];
  if (Array.isArray(payload?.rows)) return payload.rows;
  return [];
}

function normalizeCalendarType(value: unknown) {
  const raw = String(value || "solar").trim().toLowerCase();
  if (raw === "lunar" || raw === "음력") return "lunar";
  if (raw === "lunar_leap" || raw === "윤달" || raw === "음력윤달" || raw === "leap") return "lunar_leap";
  return "solar";
}

function buildBaseUrlCandidates() {
  const configured = String(process.env.KASI_API_BASE_URL || "").trim().replace(/\/+$/, "");
  return Array.from(new Set([configured, DEFAULT_KASI_BASE_URL, LEGACY_KASI_BASE_URL]
    .map((value) => String(value || "").trim().replace(/\/+$/, ""))
    .filter(Boolean)));
}

function buildLegacyRequestKey(method: string, params: Record<string, unknown>) {
  const entries = Object.entries(params || {})
    .map(([k, v]) => [String(k), String(v ?? "")])
    .sort(([a], [b]) => a.localeCompare(b));
  return `${method}|${entries.map(([k, v]) => `${k}=${v}`).join("&")}`;
}

function buildCalendarDateKey(input: { calendarType: string; year: number; month: number; day: number }) {
  return ["calendar", input.calendarType, input.year, pad2(input.month), pad2(input.day)].join(":");
}

function readCache(map: Map<string, { expiresAt: number; value: any }>, key: string) {
  const hit = map.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    map.delete(key);
    return null;
  }
  return hit.value;
}

function writeCache(map: Map<string, { expiresAt: number; value: any }>, key: string, value: any, ttlMs: number) {
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
}

function noteKasiFailure() {
  breakerState.consecutiveFailures += 1;
  if (breakerState.consecutiveFailures >= BREAKER_FAILURE_THRESHOLD) {
    breakerState.openUntil = Date.now() + BREAKER_COOLDOWN_MS;
  }
}

function normalizeSolarTermRows(rows: any[], fallbackYear: number) {
  if (!Array.isArray(rows) || !rows.length) return [];

  const normalized = rows
    .map((row, idx) => {
      const name = String(row?.dateName || row?.termName || row?.solTermName || row?.name || "").trim();
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

  return normalized;
}

function normalizeCalendarInput(body: any) {
  const year = toInt(body?.year, null);
  const month = toInt(body?.month, null);
  const day = toInt(body?.day, null);

  if (!year || !month || !day) {
    const err = new Error("year/month/day 입력이 필요합니다.") as Error & { status?: number; code?: string };
    err.status = 400;
    err.code = "KASI_BAD_REQUEST";
    throw err;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    const err = new Error("유효하지 않은 날짜입니다.") as Error & { status?: number; code?: string };
    err.status = 400;
    err.code = "KASI_BAD_REQUEST";
    throw err;
  }

  return {
    year,
    month,
    day,
    hour: toInt(body?.hour, 12) || 12,
    minute: toInt(body?.minute, 0) || 0,
    calendarType: normalizeCalendarType(body?.calendarType),
  };
}

async function fetchKasiUpstream(method: string, params: Record<string, string>) {
  if (isCircuitOpen()) {
    const err = new Error("KASI circuit is open") as Error & { status?: number; code?: string };
    err.status = 503;
    err.code = "KASI_CIRCUIT_OPEN";
    throw err;
  }

  const decoded = decodeServiceKeyCandidate(KASI_SERVICE_KEY);
  const candidates = Array.from(new Set([decoded, KASI_SERVICE_KEY].filter(Boolean)));
  if (!candidates.length) {
    const err = new Error("KASI_SERVICE_KEY 환경변수가 필요합니다.") as Error & { status?: number; code?: string };
    err.status = 503;
    err.code = "KASI_KEY_MISSING";
    throw err;
  }

  const baseUrls = buildBaseUrlCandidates();
  let lastError: any = null;

  for (const baseUrl of baseUrls) {
    for (const serviceKey of candidates) {
      const query = new URLSearchParams({
        ...params,
        serviceKey,
        _type: "json",
      });
      const url = `${baseUrl}/${method}?${query.toString()}`;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        try {
          const response = await fetch(url, {
            method: "GET",
            headers: { Accept: "application/json" },
            signal: controller.signal,
          });
          const payload = await response.json().catch(() => null);
          if (!response.ok || !payload) {
            const err = new Error(`KASI 응답 오류: HTTP ${response.status}`) as Error & { status?: number; code?: string };
            err.status = 503;
            err.code = "KASI_UPSTREAM_ERROR";
            throw err;
          }
          const resultCode = String(payload?.response?.header?.resultCode || "");
          if (resultCode && resultCode !== "00") {
            const err = new Error(payload?.response?.header?.resultMsg || "KASI API 오류") as Error & { status?: number; code?: string };
            err.status = 503;
            err.code = "KASI_UPSTREAM_ERROR";
            throw err;
          }

          noteKasiSuccess();
          return {
            rows: normalizeRows(payload),
            cache: "miss",
          };
        } catch (error: any) {
          if (error?.name === "AbortError") {
            const timeoutError = new Error("KASI API 타임아웃") as Error & { status?: number; code?: string };
            timeoutError.status = 503;
            timeoutError.code = "KASI_TIMEOUT";
            lastError = timeoutError;
          } else {
            lastError = error;
          }

          const status = Number(lastError?.status || 0);
          const canRetry = attempt < MAX_RETRIES;
          const retryable = !status || status === 408 || status === 429 || status >= 500;
          if (!canRetry || !retryable) {
            noteKasiFailure();
            break;
          }
        } finally {
          clearTimeout(timer);
        }
      }
    }
  }

  if (lastError) throw lastError;
  const err = new Error("KASI API 요청 실패") as Error & { status?: number; code?: string };
  err.status = 503;
  err.code = "KASI_REQUEST_FAILED";
  throw err;
}

async function requestLegacyMethod(methodRaw: unknown, paramsRaw: unknown) {
  const method = normalizeMethod(methodRaw);
  const params = (paramsRaw && typeof paramsRaw === "object") ? (paramsRaw as Record<string, unknown>) : {};
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
      const err = new Error("KASI circuit is open") as Error & { status?: number; code?: string };
      err.status = 503;
      err.code = "KASI_CIRCUIT_OPEN";
      throw err;
    }

    const result = await fetchKasiUpstream(method, params as Record<string, string>);
    const payload = {
      ok: true,
      method,
      rows: result?.rows || [],
      cache: result?.cache || "miss",
      source: "kasi",
      maintenance: false,
      fallbackRecommended: false,
      warnings: [] as string[],
    };
    writeCache(LEGACY_METHOD_CACHE, key, payload, LEGACY_CACHE_TTL_MS);
    return payload;
  })();

  LEGACY_METHOD_INFLIGHT.set(key, task);
  return task.finally(() => {
    LEGACY_METHOD_INFLIGHT.delete(key);
  });
}

async function requestCalendarSummary(inputRaw: any) {
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
    if (isCircuitOpen()) {
      const err = new Error("KASI circuit is open") as Error & { status?: number; code?: string };
      err.status = 503;
      err.code = "KASI_CIRCUIT_OPEN";
      throw err;
    }

    const upstream = await fetchKasiUpstream("get24DivisionsInfo", {
      solYear: String(input.year),
      numOfRows: "30",
    });
    const solarTerms = normalizeSolarTermRows(upstream?.rows || [], input.year);
    if (!solarTerms.length) {
      const err = new Error("KASI solar terms unavailable") as Error & { status?: number; code?: string };
      err.status = 503;
      err.code = "KASI_SOLAR_TERMS_UNAVAILABLE";
      throw err;
    }
    const merged = {
      ok: true,
      source: "kasi",
      dateKey,
      solar: {
        year: input.year,
        month: input.month,
        day: input.day,
      },
      solarTerms,
      warnings: [] as string[],
    };
    writeCache(CALENDAR_RESULT_CACHE, dateKey, merged, CALENDAR_CACHE_TTL_MS);
    return merged;
  })();

  CALENDAR_RESULT_INFLIGHT.set(dateKey, task);
  return task.finally(() => {
    CALENDAR_RESULT_INFLIGHT.delete(dateKey);
  });
}

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    if (body && typeof body === "object" && body.method) {
      const legacy = await requestLegacyMethod(body?.method, body?.params || {});
      return NextResponse.json(legacy);
    }

    const calendar = await requestCalendarSummary(body || {});
    return NextResponse.json(calendar);
  } catch (error: any) {
    const status = Number(error?.status || 0);
    if (status === 400) {
      return NextResponse.json(
        {
          ok: false,
          code: "KASI_BAD_REQUEST",
          message: error?.message || "KASI 요청 파라미터를 확인해 주세요.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        code: error?.code || "KASI_UNAVAILABLE",
        message: error?.message || "KASI 기준 음양력/절기 데이터를 확인할 수 없습니다.",
        fallbackRecommended: false,
      },
      { status: Number(error?.status || 503) || 503 }
    );
  }
}
