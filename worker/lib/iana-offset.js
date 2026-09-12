/**
 * IANA 타임존 + 벽시계 → UTC 밀리초.
 *
 * 🔴 하드코딩 오프셋 표를 쓰지 않는다. `worker/routes/astro.js` 의 `parseTimezoneOffsetHours`
 *    는 `America/New_York → -5` 같은 고정표라 **미국·유럽의 서머타임을 전혀 반영하지 못한다**
 *    (여름 출생이면 약 15° 어긋난다). 그 함수를 재사용하지 말 것.
 *
 * 🔴 2-pass 인 이유: 오프셋은 "그 순간이 UTC 로 언제인가"에 의존하는데, 우리가 가진 것은
 *    벽시계뿐이다. 1차로 벽시계를 UTC 로 간주해 오프셋을 얻고, 그 오프셋으로 실제 UTC 를
 *    구한 뒤 **그 UTC 로 오프셋을 다시 구한다.** DST 전환 전후에서 한 시간이 어긋나는 것을
 *    막는 표준 수법이며, 구현은 worker/lib/vedic-ai-chart.js 의 검증된 방식을 따른다.
 */

const FIXED_OFFSET_RE = /^(?:UTC|GMT)?\s*([+-])(\d{1,2})(?::?(\d{2}))?$/i;

/**
 * "UTC+9" · "+09:00" · "-0530" 같은 고정 오프셋 표기를 시간 단위 숫자로.
 * IANA 이름이면 null 을 돌려준다.
 *
 * @param {string} timezone
 * @returns {number|null}
 */
export function parseFixedUtcOffsetHours(timezone) {
  const text = String(timezone == null ? "" : timezone).trim();
  if (!text) return null;
  const match = text.match(FIXED_OFFSET_RE);
  if (!match) return null;
  const sign = match[1] === "-" ? -1 : 1;
  const hour = Number(match[2]);
  const minute = Number(match[3] || 0);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return sign * (hour + (minute / 60));
}

/**
 * 특정 UTC 순간에 그 타임존이 갖는 오프셋(시간 단위).
 *
 * @param {Date} utcDate
 * @param {string} timezone IANA 이름 또는 고정 오프셋 표기
 * @returns {number}
 */
export function timezoneOffsetHoursAt(utcDate, timezone) {
  const fixed = parseFixedUtcOffsetHours(timezone);
  if (fixed != null) return fixed;

  const zone = String(timezone == null ? "" : timezone).trim();
  if (!zone) {
    throw new RangeError("timezoneOffsetHoursAt: 타임존이 비어 있다.");
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(formatter.formatToParts(utcDate).map((part) => [part.type, part.value]));
  const wallAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  if (!Number.isFinite(wallAsUtc)) {
    throw new RangeError(`timezoneOffsetHoursAt: 타임존을 해석하지 못했다 (${zone}).`);
  }
  return (wallAsUtc - utcDate.getTime()) / 3600000;
}

// 서머타임이 없는 고정 약어만 표로 둔다. 이들은 이름 자체가 오프셋이라 날짜와 무관하다.
// 🔴 IANA 지역 이름(`Asia/Seoul`·`America/New_York` 등)을 여기 넣지 말 것 — 그 오프셋은
//    날짜에 따라 달라진다. 지역 이름은 아래 resolveTimezoneOffsetHours 가 출생 순간 기준으로
//    실제 규칙을 적용해 푼다.
const FIXED_TIMEZONE_ABBREVIATIONS = Object.freeze({
  utc: 0,
  gmt: 0,
  z: 0,
  zulu: 0,
  kst: 9,
  "korea standard time": 9,
  "korean standard time": 9,
  jst: 9,
  "japan standard time": 9,
  est: -5,
  pst: -8,
});

/**
 * 날짜와 무관하게 결정되는 오프셋 표기만 해석한다(숫자 · `+09:00` · 서머타임 없는 약어).
 * IANA 지역 이름이면 NaN 을 돌려주고, 호출자가 출생 순간과 함께 다시 푼다.
 *
 * @param {string} value
 * @returns {number}
 */
export function parseFixedTimezoneOffsetHours(value) {
  const raw = String(value || "").trim();
  if (!raw) return 9;

  // 🔴 "숫자로 읽히면 시간 오프셋" 으로 두면 "-0330"(= -3:30)이 -330 시간으로 삼켜진다.
  //    시간 단위로 성립하는 모양(최대 두 자리 + 선택적 소수부, |offset| <= 14)일 때만
  //    숫자로 받고, 나머지는 아래 오프셋 표기 해석에 넘긴다.
  const directTimezone = Number(raw);
  if (Number.isFinite(directTimezone) && /^[+-]?\d{1,2}(?:\.\d+)?$/.test(raw) && Math.abs(directTimezone) <= 14) {
    return directTimezone;
  }

  const lower = raw.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(FIXED_TIMEZONE_ABBREVIATIONS, lower)) {
    return FIXED_TIMEZONE_ABBREVIATIONS[lower];
  }

  const fixedOffset = parseFixedUtcOffsetHours(raw);
  return Number.isFinite(fixedOffset) ? fixedOffset : NaN;
}

/**
 * 출생 순간의 실제 UTC 오프셋(시간). IANA 지역 이름이면 그 날짜의 서머타임 규칙을 적용한다.
 *
 * 🔴 2-pass 인 이유: 오프셋은 "그 순간이 UTC 로 언제인가"에 의존하는데 우리가 가진 것은
 *    벽시계뿐이다. 1차로 벽시계를 UTC 로 간주해 근사 오프셋을 얻고, 그 오프셋으로 구한
 *    실제 UTC 로 오프셋을 다시 구한다.
 *
 * @param {string} value
 * @param {{year:number, month:number, day:number, hour:number, minute:number}} wallClock
 * @returns {number} 해석 실패 시 NaN — 호출자가 안전하게 폴백해야 한다.
 */
export function resolveTimezoneOffsetHours(value, wallClock) {
  const fixed = parseFixedTimezoneOffsetHours(value);
  if (Number.isFinite(fixed)) return fixed;

  const raw = String(value || "").trim();
  if (!raw) return NaN;

  const { year, month, day, hour, minute } = wallClock;
  if (![year, month, day, hour, minute].every((part) => Number.isFinite(part))) return NaN;

  const wallAsUtc = Date.UTC(Math.trunc(year), Math.trunc(month) - 1, Math.trunc(day), Math.trunc(hour), Math.trunc(minute), 0, 0);
  if (!Number.isFinite(wallAsUtc)) return NaN;

  try {
    const firstPass = timezoneOffsetHoursAt(new Date(wallAsUtc), raw);
    return timezoneOffsetHoursAt(new Date(wallAsUtc - (firstPass * 3600000)), raw);
  } catch (error) {
    return NaN;
  }
}

/**
 * 벽시계(현지 시각) → UTC 밀리초. 2-pass 로 역사적 DST 를 반영한다.
 *
 * @param {object} wallClock
 * @param {number} wallClock.year
 * @param {number} wallClock.month 1~12
 * @param {number} wallClock.day
 * @param {number} wallClock.hour 0~23
 * @param {number} wallClock.minute 0~59
 * @param {number} [wallClock.second] 0~59
 * @param {string} timezone IANA 이름 또는 고정 오프셋 표기
 * @returns {{utcMillis:number, offsetHours:number}}
 */
export function wallClockToUtcMillis(wallClock, timezone) {
  const { year, month, day, hour, minute } = wallClock;
  const second = wallClock.second == null ? 0 : wallClock.second;
  for (const [label, value] of Object.entries({ year, month, day, hour, minute, second })) {
    if (!Number.isFinite(Number(value))) {
      throw new RangeError(`wallClockToUtcMillis: ${label} 이 숫자가 아니다 (${value})`);
    }
  }

  const wallAsUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  if (!Number.isFinite(wallAsUtc)) {
    throw new RangeError("wallClockToUtcMillis: 유효하지 않은 벽시계 값이다.");
  }

  // 1차: 벽시계를 UTC 로 간주해 근사 오프셋을 얻는다.
  const firstPass = timezoneOffsetHoursAt(new Date(wallAsUtc), timezone);
  // 2차: 근사 UTC 로 오프셋을 다시 구한다(DST 경계 보정).
  const approximateUtc = new Date(wallAsUtc - (firstPass * 3600000));
  const offsetHours = timezoneOffsetHoursAt(approximateUtc, timezone);

  return { utcMillis: wallAsUtc - (offsetHours * 3600000), offsetHours };
}
