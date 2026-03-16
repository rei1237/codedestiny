/**
 * 베다점(조티시) API 연동 서비스
 * 사용자 출생 정보로 외부 베다점 API를 호출하고, 응답을 정제하여 반환합니다.
 * API 키는 서버 환경변수(VEDIC_ASTROLOGY_API_KEY)에만 저장합니다.
 */

const VEDIC_API_BASE = process.env.VEDIC_ASTROLOGY_API_BASE_URL || "https://json.freeastrologyapi.com";
const VEDIC_API_KEY = process.env.VEDIC_ASTROLOGY_API_KEY;

/** 우주 컨셉 에러 메시지 (사용자 노출용) */
const COSMIC_ERROR_MESSAGES = {
  delay: "우주의 흐름을 읽는 중 잠시 지연이 발생했습니다. 잠시 후 다시 시도해 주세요.",
  unavailable: "별의 메시지를 불러오는 데 실패했습니다. 잠시 후 다시 시도해 주세요.",
  invalid: "출생 정보가 올바르지 않습니다. 날짜, 시간, 위치를 확인해 주세요.",
  forbidden: "현재 이 기능을 이용할 수 없습니다. 나중에 다시 시도해 주세요.",
};

/**
 * 사용자 입력을 API 요청 형식으로 변환
 * @param {Object} input - { name, birthDate, birthTime, latitude, longitude, timezone }
 * @returns {Object} API body
 */
function toApiBirthParams(input) {
  const date = normalizeDate(input.birthDate);
  const time = normalizeTime(input.birthTime);
  const lat = Number(input.latitude);
  const lng = Number(input.longitude);
  const tz = normalizeTimezone(input.timezone);

  if (!date || !time || Number.isNaN(lat) || Number.isNaN(lng) || Number.isNaN(tz)) {
    return null;
  }

  const [year, month, day] = date.split("-").map((v) => parseInt(v, 10));
  const [hour, minute] = time.split(":").map((v) => parseInt(v, 10));

  return {
    year,
    month,
    day,
    hour,
    minute,
    // FreeAstroAPI는 도시명을 사용하지만 여기서는 기본값으로 Seoul 사용
    city: input.city || "Seoul",
    // Vedic 차트 엔드포인트에 맞게 sidereal 여부 등은 서버 기본값 사용
  };
}

function normalizeDate(v) {
  if (!v) return null;
  const s = String(v).trim();
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  const year = parseInt(y, 10);
  const month = parseInt(m, 10);
  const day = parseInt(d, 10);
  if (year < 1800 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${y}-${m}-${d}`;
}

function normalizeTime(v) {
  if (!v) return null;
  const s = String(v).trim();
  const match = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const [, h, m, sec = "0"] = match;
  const hour = parseInt(h, 10);
  const min = parseInt(m, 10);
  const second = parseInt(sec, 10);
  if (hour < 0 || hour > 23 || min < 0 || min > 59 || second < 0 || second > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function normalizeTimezone(v) {
  if (v === undefined || v === null) return 9; // 기본 KST
  const n = Number(v);
  if (!Number.isNaN(n)) return n;
  const s = String(v).trim();
  const match = s.match(/^([+-]?\d{1,2})(?::(\d{2}))?$/);
  if (!match) return 9;
  const [, h, m = "0"] = match;
  return parseInt(h, 10) + parseInt(m, 10) / 60;
}

function clamp(val, min, max) {
  const n = Number(val);
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

/**
 * 베다점 API에 출생 차트 요청
 * @param {Object} birthParams - toApiBirthParams() 결과 또는 동일 형식 객체
 * @returns {Promise<Object>} { success, data, userMessage }
 */
async function fetchBirthChart(birthParams) {
  if (!VEDIC_API_KEY || !VEDIC_API_KEY.trim()) {
    return {
      success: false,
      data: null,
      userMessage: COSMIC_ERROR_MESSAGES.unavailable,
      code: "CONFIG_MISSING",
    };
  }

  const url = `${VEDIC_API_BASE.replace(/\/+$/, "")}/api/v1/vedic/chart`;
  const headers = {
    "Content-Type": "application/json",
    "x-api-key": VEDIC_API_KEY,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(birthParams),
      signal: AbortSignal.timeout(25000),
    });

    const raw = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = raw?.message || raw?.error || res.statusText;
      const userMsg =
        res.status === 400 || res.status === 422
          ? COSMIC_ERROR_MESSAGES.invalid
          : res.status === 401 || res.status === 403
            ? COSMIC_ERROR_MESSAGES.forbidden
            : res.status === 429
              ? COSMIC_ERROR_MESSAGES.delay
              : COSMIC_ERROR_MESSAGES.delay;
      return {
        success: false,
        data: null,
        userMessage: userMsg,
        code: `API_${res.status}`,
        debug: process.env.NODE_ENV === "development" ? msg : undefined,
      };
    }

    if (raw?.status === "success" && raw?.data) {
      return {
        success: true,
        data: raw.data,
        userMessage: null,
      };
    }

    return {
      success: false,
      data: null,
      userMessage: COSMIC_ERROR_MESSAGES.unavailable,
      code: "INVALID_RESPONSE",
    };
  } catch (err) {
    const isTimeout = err?.name === "AbortError";
    const isNetwork = err?.code === "ECONNREFUSED" || err?.code === "ENOTFOUND" || err?.message?.includes("fetch");
    const userMsg = isTimeout || isNetwork ? COSMIC_ERROR_MESSAGES.delay : COSMIC_ERROR_MESSAGES.delay;

    if (process.env.NODE_ENV === "development") {
      console.error("[vedic-astrology] fetchBirthChart error:", err?.message || err);
    }

    return {
      success: false,
      data: null,
      userMessage: userMsg,
      code: isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
      debug: process.env.NODE_ENV === "development" ? err?.message : undefined,
    };
  }
}

/**
 * 사용자 입력으로 출생 차트 조회 (진입점)
 * @param {Object} input - { name?, birthDate, birthTime, latitude, longitude, timezone? }
 * @returns {Promise<Object>} { success, data, userMessage, normalizedParams }
 */
async function getBirthChartFromUserInput(input) {
  const normalizedParams = toApiBirthParams(input);
  if (!normalizedParams) {
    return {
      success: false,
      data: null,
      userMessage: COSMIC_ERROR_MESSAGES.invalid,
      normalizedParams: null,
    };
  }

  const result = await fetchBirthChart(normalizedParams);
  return {
    ...result,
    normalizedParams: result.success ? normalizedParams : null,
  };
}

module.exports = {
  toApiBirthParams,
  fetchBirthChart,
  getBirthChartFromUserInput,
  COSMIC_ERROR_MESSAGES,
};
