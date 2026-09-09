// 프롬프트 허브 숙요 천문 요청기.
//
// 브라우저에서 워커 전용 Swiss Ephemeris를 직접 import하지 않고, 공개된
// /api/sukuyo/astronomy가 사용하는 공통 코어의 확정 결과만 소비한다. 요청 실패는
// 오래된 음력 룩업값으로 대체하지 않고 null로 닫는다.

export type SukuyoPromptAstronomyInput = {
  birthDate: string;
  calendarType?: string;
  leapMonth?: boolean;
  birthTime?: string;
  birthTimeUnknown?: boolean;
  birthPlace?: string;
  birthTimezone?: string;
};

export type SukuyoPromptAstronomy = {
  moonEclipticLongitude?: number;
  moonSiderealLongitude?: number;
  utcIso?: string;
  julianDate?: number;
  timezoneOffsetHours?: number;
  birthTimeContext?: {
    policy?: string;
    location?: {
      latitude?: number;
      longitude?: number;
      standardMeridian?: number;
      provided?: boolean;
    };
    trueSolar?: {
      year?: number;
      month?: number;
      day?: number;
      hour?: number;
      minute?: number;
      longitudeCorrectionMinutes?: number;
      equationOfTimeMinutes?: number;
    };
  };
};

const REQUEST_TIMEOUT_MS = 6000;

function text(value: unknown) {
  return String(value ?? "").trim();
}

function isLunarCalendar(value: string | undefined) {
  const key = text(value).toLowerCase();
  return key === "음력" || key === "lunar" || key === "lunar_leap" || key.includes("윤");
}

function normalizeCalendarType(value: string | undefined, leapMonth: boolean) {
  if (!isLunarCalendar(value)) return "solar";
  return leapMonth || text(value).toLowerCase().includes("leap") || text(value).includes("윤") ? "lunar_leap" : "lunar";
}

function parseYmd(value: string | undefined) {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text(value));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  return { year, month, day };
}

function parseHm(value: string | undefined, unknownTime: boolean) {
  if (unknownTime || !text(value)) return { hour: 12, minute: 0, known: false };
  const match = /^(\d{1,2}):(\d{2})$/.exec(text(value));
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute, known: true };
}

async function fetchJson(url: string, init?: RequestInit): Promise<Record<string, unknown> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) return null;
    const payload = await response.json();
    return payload && typeof payload === "object" ? payload as Record<string, unknown> : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveCoordinates(place: string) {
  if (!place) return null;
  const payload = await fetchJson(`/api/geocode?place=${encodeURIComponent(place)}`);
  if (!payload || payload.fallback === true) return null;
  const latitude = Number(payload.lat);
  const longitude = Number(payload.lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

/** 날짜형 입력은 계획대로 12:00 KST 대표값을 사용한다. */
export async function fetchSukuyoPromptAstronomy(
  input: SukuyoPromptAstronomyInput,
): Promise<SukuyoPromptAstronomy | null> {
  const date = parseYmd(input.birthDate);
  const time = parseHm(input.birthTime, input.birthTimeUnknown === true);
  if (!date || !time) return null;

  const coordinates = await resolveCoordinates(text(input.birthPlace));
  const payload = await fetchJson("/api/sukuyo/astronomy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      birthDate: `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`,
      calendarType: normalizeCalendarType(input.calendarType, input.leapMonth === true),
      leapMonth: input.leapMonth === true,
      birthTime: `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`,
      birthTimeUnknown: !time.known,
      birthPlace: text(input.birthPlace),
      timezone: text(input.birthTimezone) || "Asia/Seoul",
      ...(coordinates || {}),
    }),
  });
  if (!payload || payload.ok !== true || !payload.astronomy || typeof payload.astronomy !== "object") return null;
  const astronomy = payload.astronomy as SukuyoPromptAstronomy;
  return Number.isFinite(Number(astronomy.moonSiderealLongitude ?? astronomy.moonEclipticLongitude)) ? astronomy : null;
}
