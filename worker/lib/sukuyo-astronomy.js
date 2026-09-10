import { lunarToSolar, solarToLunar } from "../../lib/korean-calendar/index.js";
import { buildBirthTimeContext } from "./birth-time-context.js";
import {
  SUKUYO_ASTRONOMY_CONSTANTS,
  SUKUYO_ASTRONOMY_VERSION,
  buildSukuyoFromMoonLongitude,
} from "./sukuyo-coordinate.js";
import { getSwissMoonLongitudes } from "./swiss-ephemeris.js";
const {
  DAY_MS,
  UNIX_EPOCH_JD,
  KST_OFFSET_HOURS,
} = SUKUYO_ASTRONOMY_CONSTANTS;

export { SUKUYO_ASTRONOMY_CONSTANTS, SUKUYO_ASTRONOMY_VERSION, buildSukuyoFromMoonLongitude };

function parseTimezoneOffset(value, fallback = KST_OFFSET_HOURS) {
  if (Number.isFinite(Number(value))) return Number(value);
  const text = String(value || "").trim();
  const match = /^(?:GMT|UTC)\s*([+-])(\d{1,2})(?::?(\d{2}))?$/i.exec(text);
  if (!match) return fallback;
  const hours = Number(match[2]);
  const minutes = Number(match[3] || 0);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes > 59) return fallback;
  return (match[1] === "-" ? -1 : 1) * (hours + minutes / 60);
}

function offsetFromTimeZoneName(value) {
  const label = String(value || "").trim();
  if (/^(?:GMT|UTC)$/i.test(label)) return 0;
  const match = /^(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?$/i.exec(label);
  if (!match) return null;
  const hours = Number(match[2]);
  const minutes = Number(match[3] || 0);
  return Number.isFinite(hours) && Number.isFinite(minutes) && minutes <= 59
    ? (match[1] === "-" ? -1 : 1) * (hours + minutes / 60)
    : null;
}

function resolveIanaTimezoneOffset(moment, timezone) {
  if (typeof Intl === "undefined" || typeof Intl.DateTimeFormat !== "function") return null;
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "longOffset",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
    const localAsUtc = Date.UTC(Number(moment.year), Number(moment.month) - 1, Number(moment.day), Number(moment.hour ?? 12), Number(moment.minute ?? 0), Number(moment.second ?? 0));
    let timestamp = localAsUtc;
    for (let iteration = 0; iteration < 2; iteration += 1) {
      const zoneName = formatter.formatToParts(new Date(timestamp)).find((part) => part.type === "timeZoneName")?.value;
      const offset = offsetFromTimeZoneName(zoneName);
      if (offset == null) return null;
      timestamp = localAsUtc - offset * 3600000;
    }
    const finalZoneName = formatter.formatToParts(new Date(timestamp)).find((part) => part.type === "timeZoneName")?.value;
    return offsetFromTimeZoneName(finalZoneName);
  } catch {
    return null;
  }
}

function resolveTimezoneOffset(moment) {
  if (moment?.timezoneOffset != null && moment.timezoneOffset !== "" && Number.isFinite(Number(moment.timezoneOffset))) return Number(moment.timezoneOffset);
  if (moment?.tzOffset != null && moment.tzOffset !== "" && Number.isFinite(Number(moment.tzOffset))) return Number(moment.tzOffset);
  if (moment?.timezoneOffsetHours != null && moment.timezoneOffsetHours !== "" && Number.isFinite(Number(moment.timezoneOffsetHours))) return Number(moment.timezoneOffsetHours);
  const timezone = String(moment?.timezone || "").trim();
  return parseTimezoneOffset(timezone, resolveIanaTimezoneOffset(moment, timezone) ?? KST_OFFSET_HOURS);
}

function assertDateParts(year, month, day, hour, minute) {
  if (![year, month, day, hour, minute].every(Number.isFinite)) {
    throw new RangeError("숙요 천문 계산에는 유효한 연월일시분이 필요합니다.");
  }
  if (!Number.isInteger(year) || year < 1582 || year > 2400) throw new RangeError("숙요 천문 계산 연도 범위를 확인해 주세요.");
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new RangeError("숙요 천문 계산 월을 확인해 주세요.");
  if (!Number.isInteger(day) || day < 1 || day > 31) throw new RangeError("숙요 천문 계산 일을 확인해 주세요.");
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new RangeError("숙요 천문 계산 시를 확인해 주세요.");
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) throw new RangeError("숙요 천문 계산 분을 확인해 주세요.");

  const dayCheck = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  if (dayCheck.getUTCFullYear() !== year || dayCheck.getUTCMonth() !== month - 1 || dayCheck.getUTCDate() !== day) {
    throw new RangeError("숙요 천문 계산 날짜가 유효하지 않습니다.");
  }
}

/** 현지 벽시계 입력을 실제 발생 순간의 UTC timestamp로 바꾼다. */
export function localMomentToUtc(input = {}) {
  const year = Number(input.year);
  const month = Number(input.month);
  const day = Number(input.day);
  const hour = Number(input.hour ?? 12);
  const minute = Number(input.minute ?? 0);
  const second = Number(input.second ?? 0);
  const millisecond = Number(input.millisecond ?? 0);
  assertDateParts(year, month, day, hour, minute);
  const timezoneOffsetHours = resolveTimezoneOffset({ ...input, year, month, day, hour, minute, second });
  if (!Number.isFinite(second) || second < 0 || second >= 60 || !Number.isFinite(millisecond) || millisecond < 0 || millisecond >= 1000) {
    throw new RangeError("숙요 천문 계산 초·밀리초를 확인해 주세요.");
  }

  const utcTimestamp = Date.UTC(year, month - 1, day, hour, minute, second, millisecond)
    - timezoneOffsetHours * 3600000;
  const utc = new Date(utcTimestamp);
  if (!Number.isFinite(utcTimestamp) || Number.isNaN(utc.getTime())) {
    throw new RangeError("숙요 천문 계산 UTC 변환에 실패했습니다.");
  }
  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
    timezoneOffsetHours,
    utcTimestamp,
    utcIso: utc.toISOString(),
  };
}

export function julianDateFromUtcTimestamp(utcTimestamp) {
  const timestamp = Number(utcTimestamp);
  if (!Number.isFinite(timestamp)) throw new RangeError("유효한 UTC timestamp가 필요합니다.");
  return timestamp / DAY_MS + UNIX_EPOCH_JD;
}

function resolveSolarMoment(moment = {}) {
  const calendarType = String(moment.calendarType || moment.calendar || "solar").trim().toLowerCase();
  if (calendarType !== "lunar" && calendarType !== "lunar_leap") {
    return { ...moment, calendarType: "solar" };
  }
  const converted = lunarToSolar(Number(moment.year), Number(moment.month), Number(moment.day), calendarType === "lunar_leap");
  if (!converted) throw new RangeError("한국 음양력 코어가 음력 생년월일을 양력으로 변환하지 못했습니다.");
  return {
    ...moment,
    year: converted.year,
    month: converted.month,
    day: converted.day,
    calendarType: "solar",
  };
}

/**
 * 항성 달 황경을 27개 동일 구간으로 옮긴다.
 * 0° 항성 황경 구간을 숙요 배열의 고정 원점에 맞춘 뒤, 진행 방향으로 +1 한다.
 */
export async function calculateSukuyoForMoment(env, rawMoment = {}, options = {}) {
  const moment = resolveSolarMoment(rawMoment);
  const normalized = localMomentToUtc(moment);
  const julianDate = julianDateFromUtcTimestamp(normalized.utcTimestamp);
  const birthTimeContext = buildBirthTimeContext(moment, normalized, julianDate, options);
  const [moonLongitude] = await getSwissMoonLongitudes(env, [
    {
      year: normalized.year,
      month: normalized.month,
      day: normalized.day,
      hour: normalized.hour,
      minute: normalized.minute,
      timezone: normalized.timezoneOffsetHours,
    },
  ], options);
  const lunar = solarToLunar(normalized.year, normalized.month, normalized.day);
  const result = buildSukuyoFromMoonLongitude(moonLongitude, {
    solarYear: normalized.year,
    solarMonth: normalized.month,
    solarDay: normalized.day,
    hour: normalized.hour,
    minute: normalized.minute,
    timezoneOffsetHours: normalized.timezoneOffsetHours,
    utcTimestamp: normalized.utcTimestamp,
    utcIso: normalized.utcIso,
    julianDate,
    birthTimeContext,
    birthTimeKnown: rawMoment.birthTimeKnown !== false && rawMoment.unknownTime !== true,
    latitude: Number.isFinite(Number(rawMoment.latitude ?? rawMoment.lat)) ? Number(rawMoment.latitude ?? rawMoment.lat) : null,
    longitude: Number.isFinite(Number(rawMoment.longitude ?? rawMoment.lon)) ? Number(rawMoment.longitude ?? rawMoment.lon) : null,
    lunarYear: lunar?.lunarYear ?? null,
    lunarMonth: lunar?.lunarMonth ?? null,
    lunarDay: lunar?.lunarDay ?? null,
    isLeapMonth: Boolean(lunar?.isLeapMonth),
  });
  if (!result) throw new Error("SUKUYO_ASTRONOMY_CALCULATION_FAILED");
  return result;
}

export async function calculateSukuyoForMoments(env, moments = [], options = {}) {
  if (!Array.isArray(moments) || moments.length === 0) return [];
  const resolved = await Promise.all(moments.map((moment) => calculateSukuyoForMoment(env, moment, options)));
  return resolved;
}
