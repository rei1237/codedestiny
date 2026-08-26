/**
 * 간지(干支) — 세차·월건·일진·시주. 표기 없이 **인덱스만** 낸다.
 *
 * 🔴 공식은 새로 만들지 않았다. 레포에 이미 있는 것을 그대로 옮겼다:
 *   · 일진 `floor(Date.UTC(y,m-1,d)/86400000) + 17`
 *     — js/saju-engine.js `_cdCivilDayPillar` 와
 *       app/saju/animal-destiny/engine/localSajuCalculator.ts `getDayPillar` 가 같은 값을 쓰고,
 *       scripts/test-saju-day-pillar-civil-date.mjs 가 1900~2100 스윕으로 지키고 있다.
 *     60갑자는 연속 순환이라 음력·절기와 달리 KST/CST 문제가 없다.
 *   · 야자시(23시대 → 익일 일진), 시지 `floor((hour+1)/2) % 12`, 오자둔(五鼠遁)
 *     — 같은 두 파일에서 그대로.
 *
 * 바뀐 것은 **세차·월건의 경계를 어느 나라 시간의 절기로 가르느냐** 하나뿐이다.
 * 이제 KST 절기표를 쓴다.
 */
import { DAY_MS, enclosingNodeTerm, solarDayIndex } from "./core.js";
import { DEFAULT_NIGHT_ZI_POLICY, NIGHT_ZI_POLICY } from "./policy.js";

const mod = (value, size) => ((value % size) + size) % size;

/** 서기 연도 → 세차 천간·지지 인덱스(甲=0 / 子=0). */
export function sexagenaryYearIndexes(sexagenaryYear) {
  return { stemIndex: mod(sexagenaryYear - 4, 10), branchIndex: mod(sexagenaryYear - 4, 12) };
}

/**
 * 간지 네 기둥.
 *
 * @param {{year:number,month:number,day:number,hour:number,minute:number}} at  KST 벽시계
 * @param {{nightZiPolicy?:string}} [options]
 * @returns {null|{year:{stemIndex,branchIndex}, month:{stemIndex,branchIndex},
 *                 day:{stemIndex,branchIndex}, hour:{stemIndex,branchIndex}, meta:object}}
 */
export function ganji(at, options = {}) {
  const { year, month, day } = at;
  const hour = Number(at.hour) || 0;
  const minute = Number(at.minute) || 0;
  const nightZiPolicy = options.nightZiPolicy || DEFAULT_NIGHT_ZI_POLICY;

  const node = enclosingNodeTerm(year, month, day, hour, minute);
  if (!node) return null;

  // ── 세차 — 입춘(절 인덱스 2)이 경계다.
  // 절 인덱스 0(소한)은 입춘 전이므로 그 해 세차는 아직 전년이다.
  const sexagenaryYear = node.index >= 2 ? node.year : node.year - 1;
  const yearPillar = sexagenaryYearIndexes(sexagenaryYear);

  // ── 월건 — 절 인덱스 0(소한)=丑月(1), 2(입춘)=寅月(2), … 22(대설)=子月(0).
  const monthBranchIndex = mod(node.index / 2 + 1, 12);
  // 오호둔(五虎遁): 생년간으로 寅月의 천간을 정하고 지지만큼 순행한다.
  const yinStemStart = [2, 4, 6, 8, 0][yearPillar.stemIndex % 5];
  const monthPillar = {
    stemIndex: mod(yinStemStart + mod(monthBranchIndex - 2, 12), 10),
    branchIndex: monthBranchIndex,
  };

  // ── 일진 — 야자시 정책이 적용되는 **유일한** 축이다.
  let civil = { year, month, day };
  const nightZiApplied = nightZiPolicy === NIGHT_ZI_POLICY.SHIFT_DAY && hour >= 23;
  if (nightZiApplied) {
    const shifted = new Date(Date.UTC(year, month - 1, day) + DAY_MS);
    civil = { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
  }
  const serial = solarDayIndex(civil.year, civil.month, civil.day) + 17;
  const dayPillar = { stemIndex: mod(serial, 10), branchIndex: mod(serial, 12) };

  // ── 시주 — 시지는 자시가 23:00~00:59 로 자정을 감싸므로 날짜와 무관하다.
  const hourBranchIndex = Math.floor((hour + 1) / 2) % 12;
  const ziStemStart = [0, 2, 4, 6, 8][dayPillar.stemIndex % 5];
  const hourPillar = {
    stemIndex: mod(ziStemStart + hourBranchIndex, 10),
    branchIndex: hourBranchIndex,
  };

  return {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
    meta: {
      sexagenaryYear,
      dayPillarCivilDate: civil,
      nightZiApplied,
      nodeTermIndex: node.index,
      nodeTermYear: node.year,
    },
  };
}
