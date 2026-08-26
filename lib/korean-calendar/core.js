/**
 * 한국 음양력 코어 — 표 위의 순수 조회·산술.
 *
 * 🔴 여기에는 천문 계산이 없다. `astronomy-engine` 을 import 하지 않는다.
 * 계산은 빌드타임에 scripts/build-korean-calendar-table.mjs 가 끝냈고, 이 파일은 그 표를 읽는다.
 * 그래서 정적 셸·앱 클라이언트 번들에 116KB 짜리 천문 라이브러리를 실을 필요가 없다.
 *
 * 🔴 표기 축을 섞지 않기 위해 **인덱스만 반환한다**(lib/ziwei-minor-limit.js 가 세운 규칙).
 * 셸은 한자('甲','寅'), 워커·앱은 한글('갑','인')을 쓴다. 문자열은 labels.js 에서만 만든다.
 */
import { LUNAR_BLOCKS, MIDNIGHT_RISKS, SOLAR_TERMS, TABLE_FINGERPRINT, TABLE_META } from "./table.generated.js";

const DAY_MS = 86400000;

/** KST 민용일 일련번호(1970-01-01 = 0). 양력 날짜 하나가 정수 하나에 대응한다. */
export function solarDayIndex(year, month, day) {
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

/** 일련번호 → 양력 날짜. */
export function solarFromDayIndex(dayIndex) {
  const d = new Date(dayIndex * DAY_MS);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

// ── 음력 달 목록 (표를 한 번만 펼친다) ──────────────────────────────────────
let monthsCache = null;

function expandMonths() {
  if (monthsCache) return monthsCache;
  const months = [];
  let blockYear = TABLE_META.firstBlockYear;

  for (const row of LUNAR_BLOCKS.split(";")) {
    const [startDayText, countText, mask, leapIndexText] = row.split(",");
    const startDay = Number(startDayText);
    const count = Number(countText);
    const leapIndex = Number(leapIndexText);
    let cursor = startDay;

    for (let i = 0; i < count; i += 1) {
      const length = mask[i] === "1" ? 30 : 29;
      // 윤달을 건너뛴 순번. 블록 안 인덱스 0 이 11월이다.
      const ordinal = i - (leapIndex >= 0 && i >= leapIndex ? 1 : 0);
      months.push({
        startDay: cursor,
        length,
        isLeap: i === leapIndex,
        monthNumber: ((11 + ordinal - 1) % 12) + 1,
        // 🔴 블록의 11·12월(ordinal 0·1)은 **앞 음력해** 소속이다.
        // 여기를 i 로 쓰면 윤11월(2033)이 다음 해로 새어 그 뒤가 전부 밀린다.
        lunarYear: ordinal <= 1 ? blockYear - 1 : blockYear,
      });
      cursor += length;
    }
    blockYear += 1;
  }

  monthsCache = months;
  return months;
}

/**
 * 지원 양력 범위의 일 인덱스 경계.
 * 🔴 표는 이보다 넓게 덮는다(양력 1900-01-01 이 음력 1899년 12월이라 앞뒤로 여유가 필요하다).
 * 그러나 **회귀 증명(verify:korean-calendar-divergence)이 덮은 것은 1900~2100 뿐**이므로
 * 그 밖의 날짜는 답하지 않는다. 검증하지 않은 구간을 조용히 답하는 것이 더 위험하다.
 */
function supportedDayBounds() {
  return {
    min: solarDayIndex(TABLE_META.supportedMinYear, 1, 1),
    max: solarDayIndex(TABLE_META.supportedMaxYear, 12, 31),
  };
}

/** 양력 → 음력. 지원 범위 밖이면 null. */
export function solarToLunar(year, month, day) {
  const target = solarDayIndex(year, month, day);
  const bounds = supportedDayBounds();
  if (target < bounds.min || target > bounds.max) return null;
  const months = expandMonths();
  if (target < months[0].startDay) return null;
  const last = months[months.length - 1];
  if (target >= last.startDay + last.length) return null;

  let lo = 0;
  let hi = months.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (months[mid].startDay <= target) { found = mid; lo = mid + 1; } else hi = mid - 1;
  }
  const entry = months[found];
  return {
    lunarYear: entry.lunarYear,
    lunarMonth: entry.monthNumber,
    lunarDay: target - entry.startDay + 1,
    isLeapMonth: entry.isLeap,
    monthLengthDays: entry.length,
  };
}

/** 음력 → 양력. 그 해에 그 윤달이 없거나 그 달에 그 일이 없으면 null. */
export function lunarToSolar(lunarYear, lunarMonth, lunarDay, isLeapMonth = false) {
  const entry = expandMonths().find(
    (m) => m.lunarYear === lunarYear && m.monthNumber === lunarMonth && m.isLeap === Boolean(isLeapMonth),
  );
  if (!entry) return null;
  if (!(lunarDay >= 1 && lunarDay <= entry.length)) return null;
  const dayIndex = entry.startDay + lunarDay - 1;
  const bounds = supportedDayBounds();
  if (dayIndex < bounds.min || dayIndex > bounds.max) return null;
  return solarFromDayIndex(dayIndex);
}

// ── 절기 ────────────────────────────────────────────────────────────────────
let termsCache = null;

function expandTerms() {
  if (termsCache) return termsCache;
  const byYear = new Map();
  for (const row of SOLAR_TERMS.split(";")) {
    const [yearText, rest] = row.split(":");
    const year = Number(yearText);
    byYear.set(
      year,
      rest.split(",").map((cell, index) => {
        const month = Number(cell.slice(0, 2));
        const day = Number(cell.slice(2, 4));
        const hour = Number(cell.slice(4, 6));
        const minute = Number(cell.slice(6, 8));
        return { index, year, month, day, hour, minute, dayIndex: solarDayIndex(year, month, day), minuteOfDay: hour * 60 + minute };
      }),
    );
  }
  termsCache = byYear;
  return termsCache;
}

/**
 * 그 해의 24절기. 인덱스 0=소한 … 23=동지. 전부 같은 양력 해 안에 닫힌다.
 * 지원 범위 밖이면 null.
 */
export function solarTerms(year) {
  const found = expandTerms().get(year);
  return found ? found.map((t) => ({ ...t })) : null;
}

/** 절(節) — 월건을 여는 12개. 짝수 인덱스다. */
export function nodeTerms(year) {
  const all = solarTerms(year);
  return all ? all.filter((t) => t.index % 2 === 0) : null;
}

/** 두 시각의 선후를 민용일+분으로 비교한다. 표가 분 절사라 초는 쓰지 않는다. */
function isAtOrAfter(dayIndex, minuteOfDay, term) {
  if (dayIndex !== term.dayIndex) return dayIndex > term.dayIndex;
  return minuteOfDay >= term.minuteOfDay;
}

/** 그 시각이 지나온 직전 절(節). 월건의 경계다. */
export function enclosingNodeTerm(year, month, day, hour, minute) {
  const dayIndex = solarDayIndex(year, month, day);
  const minuteOfDay = hour * 60 + minute;
  for (const candidateYear of [year, year - 1]) {
    const nodes = nodeTerms(candidateYear);
    if (!nodes) continue;
    for (let i = nodes.length - 1; i >= 0; i -= 1) {
      if (isAtOrAfter(dayIndex, minuteOfDay, nodes[i])) return nodes[i];
    }
  }
  return null;
}

export { TABLE_FINGERPRINT, TABLE_META, MIDNIGHT_RISKS };

/** 지원 양력 범위. 이 밖의 날짜는 전부 null 이다. */
export function supportedRange() {
  return {
    minYear: TABLE_META.supportedMinYear,
    maxYear: TABLE_META.supportedMaxYear,
  };
}
