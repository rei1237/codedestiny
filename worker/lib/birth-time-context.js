/**
 * 출생 시각의 공통 시간 컨텍스트.
 *
 * 천체 위치는 civil clock + timezone으로 얻은 실제 UTC 순간을 사용한다.
 * 진태양시는 그 순간을 다시 움직이는 보정값이 아니라, 시주·야자시 같은
 * 전통 명리 경계를 판단할 때 함께 제공하는 지역 태양시 컨텍스트다.
 */
export const BIRTH_TIME_CONTEXT_VERSION = "birth-time-context-v1";
export const DEFAULT_BIRTH_LOCATION = Object.freeze({
  name: "서울",
  latitude: 37.5665,
  longitude: 126.978,
  timezoneOffsetHours: 9,
  standardMeridian: 135,
  timezone: "Asia/Seoul",
});

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function dayOfYear(year, month, day) {
  const current = Date.UTC(year, month - 1, day);
  const start = Date.UTC(year, 0, 1);
  return Math.floor((current - start) / 86400000) + 1;
}

function offsetFromTimeZoneName(value) {
  const label = String(value || "").trim();
  if (/^(?:GMT|UTC)$/i.test(label)) return 0;
  const match = /^(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?$/i.exec(label);
  if (!match) return null;
  const hours = Number(match[2]);
  const minutes = Number(match[3] || 0);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes > 59) return null;
  return (match[1] === "-" ? -1 : 1) * (hours + minutes / 60);
}

/** 출생 순간의 현지 벽시계 오프셋에 대응하는 기준 자오선을 구한다. */
export function standardMeridianForTimezone(timezone, fallbackOffsetHours = 9, year = 2024, month = 1, day = 1, hour = 12, minute = 0) {
  const text = String(timezone || "").trim();
  const explicit = /^(?:GMT|UTC)\s*([+-])(\d{1,2})(?::?(\d{2}))?$/i.exec(text);
  if (explicit) {
    const offset = offsetFromTimeZoneName(`GMT${explicit[1]}${explicit[2]}${explicit[3] ? `:${explicit[3]}` : ""}`);
    if (offset != null) return offset * 15;
  }
  if (fallbackOffsetHours !== null && fallbackOffsetHours !== undefined && fallbackOffsetHours !== "" && Number.isFinite(Number(fallbackOffsetHours))) {
    return Number(fallbackOffsetHours) * 15;
  }
  if (typeof Intl === "undefined" || typeof Intl.DateTimeFormat !== "function") return DEFAULT_BIRTH_LOCATION.standardMeridian;
  try {
    const formatter = new Intl.DateTimeFormat("en-US", { timeZone: text, timeZoneName: "longOffset", year: "numeric", month: "2-digit", day: "2-digit" });
    const standardNameFormatter = new Intl.DateTimeFormat("en-US", { timeZone: text, timeZoneName: "long", year: "numeric", month: "2-digit", day: "2-digit" });
    const offsetAt = (sampleYear, sampleMonth, sampleDay) => {
      const localAsUtc = Date.UTC(Number(sampleYear), Number(sampleMonth) - 1, Number(sampleDay), Number(hour), Number(minute));
      let timestamp = localAsUtc;
      for (let iteration = 0; iteration < 2; iteration += 1) {
        const parts = formatter.formatToParts(new Date(timestamp));
        const zone = parts.find((part) => part.type === "timeZoneName")?.value;
        const offset = offsetFromTimeZoneName(zone);
        if (offset == null) return null;
        timestamp = localAsUtc - offset * 3600000;
      }
      const finalParts = formatter.formatToParts(new Date(timestamp));
      const offset = offsetFromTimeZoneName(finalParts.find((part) => part.type === "timeZoneName")?.value);
      const standardName = standardNameFormatter.formatToParts(new Date(timestamp)).find((part) => part.type === "timeZoneName")?.value || "";
      return offset == null ? null : { offset, isDaylight: /daylight|summer|dst/i.test(standardName) };
    };
    // IANA의 현재 오프셋은 DST일 수 있다. 일 년의 월별 표준 오프셋을 표본화해
    // 가장 자주 나타나는 법정 표준시를 기준 자오선으로 쓴다.
    const counts = new Map();
    const standardCounts = new Map();
    for (let sampleMonth = 1; sampleMonth <= 12; sampleMonth += 1) {
      const sample = offsetAt(year, sampleMonth, 15);
      if (sample == null) continue;
      counts.set(sample.offset, (counts.get(sample.offset) || 0) + 1);
      if (!sample.isDaylight) standardCounts.set(sample.offset, (standardCounts.get(sample.offset) || 0) + 1);
    }
    const candidates = standardCounts.size ? standardCounts : counts;
    const standard = [...candidates.entries()].sort((a, b) => b[1] - a[1] || Math.abs(a[0]) - Math.abs(b[0]))[0]?.[0];
    if (standard != null) return standard * 15;
  } catch {
    // 알 수 없는 IANA 식별자는 호출부가 전달한 고정 오프셋으로 안전하게 대체한다.
  }
  return DEFAULT_BIRTH_LOCATION.standardMeridian;
}

export function calculateEquationOfTimeMinutes(year, month, day) {
  const n = dayOfYear(year, month, day);
  const b = (2 * Math.PI * (n - 81)) / 364;
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

export function shiftLocalDateByDays(year, month, day, dayOffset) {
  const shifted = new Date(Date.UTC(year, month - 1, day) + dayOffset * 86400000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function resolveLocation(moment, timezoneOffsetHours) {
  const latitude = finite(moment.latitude ?? moment.lat);
  const longitude = finite(moment.longitude ?? moment.lon);
  const timezone = String(moment.timezone || DEFAULT_BIRTH_LOCATION.timezone);
  const timezoneIsNumeric = /^[-+]?\d+(?:\.\d+)?$/.test(timezone);
  const explicitOffset = moment.timezoneOffset ?? moment.tzOffset;
  const meridianFallback = timezoneIsNumeric
    ? (explicitOffset !== null && explicitOffset !== undefined && explicitOffset !== "" ? explicitOffset : timezoneOffsetHours)
    : null;
  const standardMeridian = finite(moment.standardMeridian)
    ?? standardMeridianForTimezone(timezone, meridianFallback, Number(moment.year), Number(moment.month), Number(moment.day), Number(moment.hour), Number(moment.minute));
  return {
    name: String(moment.birthPlace ?? moment.place ?? DEFAULT_BIRTH_LOCATION.name),
    latitude: latitude ?? DEFAULT_BIRTH_LOCATION.latitude,
    longitude: longitude ?? DEFAULT_BIRTH_LOCATION.longitude,
    standardMeridian,
    timezone,
    provided: latitude != null && longitude != null,
  };
}

/**
 * 실제 UTC 순간과 지역 평균/진태양시를 함께 기록한다.
 * 기본 정책은 TRUE_SOLAR_TIME으로 두되, 기존 명리 호출부가 명시한 정책은
 * 보존한다. 보정 전 UTC/JD를 천문 엔진에 전달해야 하므로 corrected*를
 * Swiss Ephemeris 입력으로 재사용하지 않는다.
 */
export function buildBirthTimeContext(moment, normalized, julianDate, options = {}) {
  const timezoneOffsetHours = Number(normalized?.timezoneOffsetHours ?? moment?.timezoneOffset ?? 9);
  const location = resolveLocation(moment, timezoneOffsetHours);
  const policy = String(
    options.timeCorrectionPolicy
    ?? moment.timeCorrectionPolicy
    ?? moment.hourPillarTimePolicy
    ?? "TRUE_SOLAR_TIME",
  ).trim().toUpperCase();
  const longitudeCorrectionMinutes = (location.longitude - location.standardMeridian) * 4;
  const equationOfTimeMinutes = calculateEquationOfTimeMinutes(normalized.year, normalized.month, normalized.day);
  const clockTotalMinutes = normalized.hour * 60 + normalized.minute;
  const correctedTotal = policy === "KST_CLOCK_TIME"
    ? clockTotalMinutes
    : policy === "LOCAL_MEAN_TIME"
      ? clockTotalMinutes + longitudeCorrectionMinutes
      : clockTotalMinutes + longitudeCorrectionMinutes + equationOfTimeMinutes;
  const roundedTotal = Math.round(correctedTotal);
  const dayOffset = Math.floor(roundedTotal / 1440);
  const minuteOfDay = ((roundedTotal % 1440) + 1440) % 1440;
  const correctedDate = shiftLocalDateByDays(normalized.year, normalized.month, normalized.day, dayOffset);

  return {
    version: BIRTH_TIME_CONTEXT_VERSION,
    policy,
    location,
    civil: {
      year: normalized.year,
      month: normalized.month,
      day: normalized.day,
      hour: normalized.hour,
      minute: normalized.minute,
      timezoneOffsetHours,
    },
    utc: { timestamp: normalized.utcTimestamp, iso: normalized.utcIso },
    julianDate,
    trueSolar: {
      longitudeCorrectionMinutes,
      equationOfTimeMinutes,
      correctedTotalMinutes: correctedTotal,
      dayOffset,
      year: correctedDate.year,
      month: correctedDate.month,
      day: correctedDate.day,
      hour: Math.floor(minuteOfDay / 60),
      minute: minuteOfDay % 60,
    },
  };
}
