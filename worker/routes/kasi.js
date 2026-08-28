import { createHttpError, getRoutePath, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { lunarToSolar, solarToLunar, solarTerms, TERM_NAME_KO } from "../../lib/korean-calendar/index.js";

const SPCDE_INFO_BASE_URL = "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService";
const LRSR_CLD_INFO_BASE_URL = "https://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService";
const PRIMARY_KASI_BASE_URL = SPCDE_INFO_BASE_URL;
const SECONDARY_KASI_BASE_URL = LRSR_CLD_INFO_BASE_URL;
const ALLOWED_METHODS = new Set(["getLunCalInfo", "getSolCalInfo", "get24DivisionsInfo"]);

// 각 KASI 오퍼레이션이 실제로 속한 서비스 base URL.
// 음양력 변환은 LrsrCldInfoService, 24절기 등 특일정보는 SpcdeInfoService 소속이다.
// 잘못된 서비스에 먼저 붙으면 존재하지 않는 오퍼레이션이라 낭비·타임아웃이 발생하므로
// 메서드별 정답 서비스를 우선 시도한다.
const METHOD_SERVICE_BASE_URL = {
  getLunCalInfo: LRSR_CLD_INFO_BASE_URL,
  getSolCalInfo: LRSR_CLD_INFO_BASE_URL,
  get24DivisionsInfo: SPCDE_INFO_BASE_URL,
};
const LEGACY_CACHE_TTL_MS = 1000 * 60 * 30;
const CALENDAR_CACHE_TTL_MS = 1000 * 60 * 60 * 12;
const BREAKER_FAILURE_THRESHOLD = 3;
const BREAKER_COOLDOWN_MS = 1000 * 60 * 10;
const MAX_RETRIES = 1;

// 결과 캐시 상한. 키가 날짜 파생이라 요청하는 날짜 범위만큼 늘어난다(단일비행 맵 2개는
// finally 에서 스스로 지우므로 여기 대상이 아니다).
const RESULT_CACHE_MAX_ENTRIES = 512;

const LEGACY_METHOD_CACHE = new Map();
const LEGACY_METHOD_INFLIGHT = new Map();
const CALENDAR_RESULT_CACHE = new Map();
const CALENDAR_RESULT_INFLIGHT = new Map();

const breakerState = {
  consecutiveFailures: 0,
  openUntil: 0,
  lastReason: null,
};

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

// KASI 업스트림이 장애일 때 한국 음양력 코어로 음양력 변환을 로컬 계산해 서비스 연속성을 유지한다.
//
// 🔴 이 폴백은 예전에 lunar-javascript(중국 표준시 기준 중국 음력)를 썼다. 이 라우트는 레포 전체가
// "권위 있는 한국 달력"으로 삼는 지점이라, 업스트림이 죽는 동안에만 조용히 3.67% 의 날짜에서
// 하루 밀린 음력을 돌려주고 있었다(실측 2026-08-27, 1950~2035 28,896일).
// verify:korean-calendar-kasi-samples 가 `source:"local"` 응답을 정답으로 받기를 거부하는 이유가
// 바로 그것이었다 — 이제 그 폴백도 코어다.
function computeLocalCalendarFallback(method, params) {
  if (method === "getLunCalInfo") {
    const solYear = toInt(params?.solYear);
    const solMonth = toInt(params?.solMonth);
    const solDay = toInt(params?.solDay);
    if (!solYear || !solMonth || !solDay) return null;

    const lunar = solarToLunar(solYear, solMonth, solDay);
    if (!lunar) return null; // 코어 지원 범위(1900~2100) 밖 — 폴백 없이 업스트림 오류를 그대로 낸다.
    return [{
      solYear: String(solYear),
      solMonth: String(solMonth).padStart(2, "0"),
      solDay: String(solDay).padStart(2, "0"),
      lunYear: String(lunar.lunarYear),
      lunMonth: String(lunar.lunarMonth).padStart(2, "0"),
      lunDay: String(lunar.lunarDay).padStart(2, "0"),
      lunLeapmonth: lunar.isLeapMonth ? "윤" : "평",
    }];
  }

  if (method === "getSolCalInfo") {
    const lunYear = toInt(params?.lunYear);
    const lunMonth = toInt(params?.lunMonth);
    const lunDay = toInt(params?.lunDay);
    if (!lunYear || !lunMonth || !lunDay) return null;
    const isLeapMonth = String(params?.leapMonth || params?.lunLeapmonth || "").trim() === "윤"
      || String(params?.leapMonth || "").trim().toLowerCase() === "y";

    const solar = lunarToSolar(lunYear, Math.abs(lunMonth), lunDay, isLeapMonth);
    if (!solar) return null; // 없는 윤달이거나 지원 범위 밖.
    return [{
      lunYear: String(lunYear),
      lunMonth: String(lunMonth).padStart(2, "0"),
      lunDay: String(lunDay).padStart(2, "0"),
      solYear: String(solar.year),
      solMonth: String(solar.month).padStart(2, "0"),
      solDay: String(solar.day).padStart(2, "0"),
    }];
  }

  if (method === "get24DivisionsInfo") {
    return computeLocalSolarTerms(params?.solYear);
  }

  return null;
}

// KASI 24절기 업스트림 장애 시 한국 음양력 코어의 절기표로 해당 연도를 로컬 계산한다.
// 🔴 예전에는 lunar-javascript getJieQiTable 을 읽고 +1시간을 더했다. 그 라이브러리는
// 중국 표준시(UTC+8) 기준이라 애드혹 보정이 필요했던 것이고, 코어의 표는 이미 KST 다.
// 코어는 astronomy-engine 실계산의 산출물이고 KASI 와 평균 0.211분 차이다
// (verify:korean-calendar-solar-terms).
function computeLocalSolarTerms(solYearRaw) {
  const solYear = toInt(solYearRaw);
  if (!solYear) return null;

  const terms = solarTerms(solYear);
  if (!terms || !terms.length) return null;

  return terms.map((term) => ({
    dateName: TERM_NAME_KO[term.index],
    solYear: String(term.year),
    solMonth: pad2(term.month),
    solDay: pad2(term.day),
    locdate: `${term.year}${pad2(term.month)}${pad2(term.day)}`,
    kst: `${pad2(term.hour)}${pad2(term.minute)}`,
    time: `${pad2(term.hour)}:${pad2(term.minute)}`,
  }));
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
  const now = Date.now();
  map.set(key, {
    expiresAt: now + Math.max(1000, Number(ttlMs) || 1000),
    value,
  });
  // 만료 삭제가 readCache 에만 있어, 한 번 조회되고 다시 안 오는 날짜 키가 계속 쌓였다.
  for (const [cachedKey, hit] of map) {
    if (hit.expiresAt <= now) map.delete(cachedKey);
  }
  while (map.size > RESULT_CACHE_MAX_ENTRIES) {
    const oldestKey = map.keys().next().value;
    if (oldestKey === undefined) break;
    map.delete(oldestKey);
  }
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

function normalizeSolarTermRows(rows = [], fallbackYear = null) {
  if (!Array.isArray(rows) || !rows.length) {
    return [];
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

      // 실제 KASI get24DivisionsInfo(SpcdeInfoService)는 날짜를 locdate(YYYYMMDD),
      // 절입 시각을 kst(HHMM)로 반환한다. 로컬 폴백 rows는 solYear/solMonth/solDay(+locdate/kst)를
      // 함께 담으므로 두 형식을 모두 수용한다.
      let year = toInt(row?.solYear ?? row?.year, null);
      let month = toInt(row?.solMonth ?? row?.month, null);
      let day = toInt(row?.solDay ?? row?.day, null);
      const locdate = String(row?.locdate ?? "").trim();
      if ((!year || !month || !day) && /^\d{8}$/.test(locdate)) {
        year = year || toInt(locdate.slice(0, 4), null);
        month = month || toInt(locdate.slice(4, 6), null);
        day = day || toInt(locdate.slice(6, 8), null);
      }
      if (!year) year = toInt(fallbackYear, null);
      if (!name || !year || !month || !day) return null;

      const date = `${year}-${pad2(month)}-${pad2(day)}`;
      const out = {
        name,
        date,
        julianDay: idx + 1,
      };

      // 절입 시각(kst "HHMM" 또는 time "HH:MM") 보존 — 경계 근처 정밀 판정(월주/연주)용.
      const timeRaw = String(row?.kst ?? row?.time ?? "").trim();
      let hour = null;
      let minute = null;
      if (/^\d{3,4}$/.test(timeRaw)) {
        const padded = timeRaw.padStart(4, "0");
        hour = toInt(padded.slice(0, 2), null);
        minute = toInt(padded.slice(2, 4), null);
      } else {
        const hm = timeRaw.match(/^(\d{1,2}):(\d{2})/);
        if (hm) {
          hour = toInt(hm[1], null);
          minute = toInt(hm[2], null);
        }
      }
      if (hour !== null && minute !== null) {
        out.time = `${pad2(hour)}:${pad2(minute)}`;
        out.isoLocal = `${date}T${pad2(hour)}:${pad2(minute)}:00`;
      }
      return out;
    })
    .filter(Boolean);

  return normalized;
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

function buildBaseUrlCandidates(env, method) {
  const configured = String(env.KASI_API_BASE_URL || "").trim();
  // 메서드에 맞는 서비스를 우선 시도하고, 그 다음 나머지를 폴백 후보로 둔다.
  const preferred = METHOD_SERVICE_BASE_URL[String(method || "")] || PRIMARY_KASI_BASE_URL;
  // 🔴 `preferred` 가 `configured` 보다 앞이다. 예전에는 반대였고, 그래서 KASI_API_BASE_URL 이
  // 한 서비스로 고정돼 있으면 **다른 서비스 소속 오퍼레이션이 그 서비스로 먼저 나갔다.**
  // data.go.kr 은 그 조합을 403 으로 돌려주므로, 바로 아래 fetchKasiUpstream 의 403 단축과
  // 겹쳐 24절기가 업스트림에 닿아 보지도 못했다(실측 2026-08-28 · 아래 주석).
  // 오퍼레이션→서비스 대응은 KASI 가 정하는 사실이지 운영 노브가 아니다.
  return Array.from(new Set([
    preferred,
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

// data.go.kr는 서비스키 미등록/쿼터초과/서비스 오류 시 <resultCode>/<item>이 없는
// <OpenAPI_ServiceResponse><cmmMsgHeader><returnAuthMsg>...</returnAuthMsg><returnReasonCode>...
// 형태의 에러 봉투를 반환한다. 이를 구체 사유로 해석해 "파싱 실패"로 뭉개지 않도록 한다.
const KASI_UPSTREAM_REASON_CODE_MAP = {
  SERVICE_KEY_IS_NOT_REGISTERED_ERROR: "KASI_KEY_NOT_REGISTERED",
  LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR: "KASI_QUOTA_EXCEEDED",
  SERVICE_ACCESS_DENIED_ERROR: "KASI_ACCESS_DENIED",
  DEADLINE_HAS_EXPIRED_ERROR: "KASI_KEY_EXPIRED",
  UNREGISTERED_IP_ERROR: "KASI_IP_NOT_REGISTERED",
};

function extractUpstreamErrorEnvelope(rawText) {
  const text = String(rawText || "");
  if (!text.trim()) return null;

  const returnAuthMsg = extractXmlTagText(text, "returnAuthMsg");
  const returnReasonCode = extractXmlTagText(text, "returnReasonCode");
  const errMsg = extractXmlTagText(text, "errMsg");
  const hasEnvelope = /OpenAPI_ServiceResponse|cmmMsgHeader/i.test(text)
    || returnAuthMsg || returnReasonCode || errMsg;
  if (!hasEnvelope) return null;

  const authKey = String(returnAuthMsg || "").trim().toUpperCase();
  const code = KASI_UPSTREAM_REASON_CODE_MAP[authKey] || "KASI_UPSTREAM_ERROR";
  const messageParts = [errMsg, returnAuthMsg].map((v) => String(v || "").trim()).filter(Boolean);
  return {
    code,
    returnAuthMsg: returnAuthMsg || null,
    returnReasonCode: returnReasonCode || null,
    errMsg: errMsg || null,
    message: messageParts.length ? messageParts.join(": ") : "KASI 업스트림 오류 봉투",
  };
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

  const kasiBaseUrls = buildBaseUrlCandidates(env, method);
  const timeoutMs = Math.max(1000, Number(env.KASI_PROXY_TIMEOUT_MS || 6500));

  const decoded = decodeServiceKeyCandidate(env.KASI_SERVICE_KEY);
  const candidates = Array.from(new Set([decoded, String(env.KASI_SERVICE_KEY || "").trim()].filter(Boolean)));
  if (!candidates.length) {
    throw createHttpError(503, "KASI_SERVICE_KEY 환경변수가 필요합니다.", { code: "KASI_KEY_MISSING" });
  }

  let lastError = null;

  for (const kasiBaseUrl of kasiBaseUrls) {
    // 🔴 401/403 은 **이 base URL 에 대한 판정**이다. 다음 base URL 은 그대로 시도한다.
    // data.go.kr 은 그 서비스에 없는 오퍼레이션도 403 으로 돌려주므로, 예전처럼 여기서 통째로
    // 던지면 메서드에 맞는 서비스에 닿아 보지도 못한 채 로컬 폴백으로 떨어진다.
    // 실측 2026-08-28: get24DivisionsInfo 가 프로덕션·스테이징 **양쪽 모두** 403 → source:"local"
    // 이었고(같은 시각 getLunCalInfo 는 source:"kasi"), 그 한 번의 403 이 회로까지 열어
    // 정상 동작하던 음양력 조회를 10분간 함께 죽였다.
    let authBlocked = false;
    for (const serviceKey of candidates) {
      if (authBlocked) break;
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
            // data.go.kr 에러 봉투(키 미등록/쿼터초과 등)면 구체 사유로 승격한다.
            const envelope = extractUpstreamErrorEnvelope(rawText);
            const snippet = String(rawText).replace(/\s+/g, " ").trim().slice(0, 200);
            if (envelope) {
              throw createHttpError(503, `KASI 업스트림 오류: ${envelope.message}`, {
                code: envelope.code,
                returnAuthMsg: envelope.returnAuthMsg,
                returnReasonCode: envelope.returnReasonCode,
                upstreamStatus: response.status,
                upstreamBase: kasiBaseUrl,
                upstreamSnippet: snippet,
              });
            }
            throw createHttpError(503, "KASI 응답 파싱 실패(JSON/XML 아님)", {
              code: "KASI_PARSE_ERROR",
              upstreamStatus: response.status,
              upstreamBase: kasiBaseUrl,
              upstreamSnippet: snippet,
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
            // 이 base URL 에서는 키를 더 바꿔 봐야 소용없다. 다음 base URL 로 넘어간다.
            authBlocked = true;
            break;
          }

          if (attempt >= MAX_RETRIES) break;
        } finally {
          clearTimeout(timer);
        }
      }
    }
  }

  // 🔴 회로는 **요청 하나가 후보를 전부 소진했을 때** 한 번만 연다. 예전에는 base URL ×
  // 키 후보마다 실패를 셌기 때문에 한 번의 403 이 임계 3을 혼자 넘겨 회로를 열었다.
  const finalError = lastError || createHttpError(503, "KASI API 요청 실패", { code: "KASI_REQUEST_FAILED" });
  noteKasiFailure(finalError?.code || "KASI_REQUEST_FAILED");
  throw finalError;
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
      const localRows = computeLocalCalendarFallback(method, params);
      if (localRows) {
        return {
          ok: true,
          method,
          rows: localRows,
          cache: "miss",
          source: "local",
          maintenance: false,
          fallbackRecommended: true,
          warnings: ["KASI circuit이 열려 있어 로컬 계산으로 대체되었습니다."],
        };
      }
      throw createHttpError(503, "KASI circuit is open", { code: "KASI_CIRCUIT_OPEN" });
    }

    let result;
    try {
      result = await fetchKasiUpstream(env, method, params);
    } catch (error) {
      const localRows = computeLocalCalendarFallback(method, params);
      if (localRows) {
        const detail = error?.payload && typeof error.payload === "object" ? error.payload : {};
        const diag = [error?.message || "unknown error", detail.returnAuthMsg, detail.upstreamSnippet]
          .map((v) => String(v || "").trim()).filter(Boolean).join(" | ");
        return {
          ok: true,
          method,
          rows: localRows,
          cache: "miss",
          source: "local",
          maintenance: false,
          fallbackRecommended: true,
          upstreamReason: detail.code || error?.code || null,
          warnings: [`KASI 업스트림 응답 실패로 로컬 계산으로 대체되었습니다: ${diag}`],
        };
      }
      throw error;
    }

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
  })();

  LEGACY_METHOD_INFLIGHT.set(key, task);
  return task.finally(() => {
    LEGACY_METHOD_INFLIGHT.delete(key);
  });
}

export async function requestKasiLegacyCalendarMethod(env, methodRaw, paramsRaw) {
  return requestLegacyMethod(env, methodRaw, paramsRaw);
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
    const buildLocalFallback = (reason) => {
      const localRows = computeLocalSolarTerms(input.year);
      const solarTerms = normalizeSolarTermRows(localRows || [], input.year);
      if (!solarTerms.length) return null;
      return {
        ok: true,
        source: "local",
        dateKey,
        solar: { year: input.year, month: input.month, day: input.day },
        solarTerms,
        maintenance: false,
        fallbackRecommended: true,
        warnings: [`KASI 24절기 업스트림 실패로 로컬 계산으로 대체되었습니다: ${reason || "unknown error"}`],
      };
    };

    if (isCircuitOpen()) {
      const local = buildLocalFallback("KASI circuit is open");
      if (local) return local;
      throw createHttpError(503, "KASI circuit is open", { code: "KASI_CIRCUIT_OPEN" });
    }

    let solarTerms = [];
    try {
      const upstream = await fetchKasiUpstream(env, "get24DivisionsInfo", {
        solYear: String(input.year),
        numOfRows: "30",
      });
      solarTerms = normalizeSolarTermRows(upstream?.rows || [], input.year);
    } catch (error) {
      const local = buildLocalFallback(error?.message);
      if (local) return local;
      throw error;
    }

    if (!solarTerms.length) {
      const local = buildLocalFallback("KASI solar terms unavailable");
      if (local) return local;
      throw createHttpError(503, "KASI solar terms unavailable", { code: "KASI_SOLAR_TERMS_UNAVAILABLE" });
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
      warnings: [],
    };

    writeCache(CALENDAR_RESULT_CACHE, dateKey, merged, CALENDAR_CACHE_TTL_MS);
    return merged;
  })();

  CALENDAR_RESULT_INFLIGHT.set(dateKey, task);
  return task.finally(() => {
    CALENDAR_RESULT_INFLIGHT.delete(dateKey);
  });
}

// 🔴 검증 전용 표면. verify:lunar-conversion-core 가 KASI 장애 시의 로컬 폴백을 **실제로 돌려**
//    코어와 같은 음양력을 내는지 본다. 이 폴백이 어긋나면 업스트림이 죽는 동안에만 조용히 틀린다.
export const __kasiTestUtils = { computeLocalCalendarFallback };

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

    // createHttpError는 부가 정보를 error.payload에 담으므로 진단 필드를 그쪽에서 읽는다.
    const payload = (error && typeof error.payload === "object") ? error.payload : {};
    return json({
      ok: false,
      maintenance: false,
      fallbackRecommended: false,
      code: error?.code || payload.code || "KASI_UNAVAILABLE",
      message: error?.message || "KASI 기준 음양력/절기 데이터를 확인할 수 없습니다.",
      detail: error?.message || null,
      returnAuthMsg: payload.returnAuthMsg || null,
      returnReasonCode: payload.returnReasonCode || null,
      upstreamSnippet: payload.upstreamSnippet || null,
    }, { status: Number(error?.status || 503) || 503 });
  }
}
