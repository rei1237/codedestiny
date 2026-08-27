/**
 * 대운(大運) — 순역·기운 나이·10주기 간지.
 *
 * 🔴 **알고리즘을 새로 만들지 않았다. `lunar-javascript` 의 `EightChar.getYun(gender)` 관례를
 * 그대로 재현한 것이다.** 이 축은 유파마다 절사 관례가 갈려서, "더 정확한 계산"으로 바꾸면
 * 그 순간 기존 사용자의 대운 나이가 전부 움직인다. 그래서 옮기는 것은 **달력 하나뿐**이다 —
 * 節(절)을 중국 표준시(UTC+8)로 잡던 것을 한국 표준시로 잡는다.
 *
 * 재현한 관례(lunar-javascript 1.7.7 `getYun(gender)` 의 sect 1, 기본값):
 *
 *   순역   양년(세차 천간 짝수 인덱스) 남자 · 음년 여자 → 순행, 나머지는 역행
 *   구간   순행이면 [생시 → 다음 節], 역행이면 [직전 節 → 생시]
 *   거리   시진(2시간) 단위로 센다. 23시대는 시지 0 이 아니라 **11** 로 본다(그 관례 그대로다)
 *            hourDiff = 끝 시지 - 시작 시지
 *            dayDiff  = 끝 민용일 - 시작 민용일
 *            hourDiff < 0 이면 hourDiff += 12, dayDiff -= 1
 *            monthDiff = floor(hourDiff * 10 / 30)
 *            month = dayDiff * 4 + monthDiff          ← 3일 = 1년(=12개월)이므로 1일 = 4개월
 *            day   = hourDiff * 10 - monthDiff * 30   ← 1시진 = 10일
 *            year  = floor(month / 12);  month -= year * 12
 *   시작   생년월일 + year년 + month월 + day일 (월말 보정은 lunar-javascript 와 같다)
 *   나이   **세는 나이 정수**다. 0번 칸은 태어난 해부터 대운 시작 전년까지의 "미입운" 구간이고
 *          1번 칸부터 10년씩이다. 이 축을 0부터의 소수 나이와 섞지 말 것.
 *   간지   월주에서 순행이면 +index, 역행이면 -index
 *
 * 🔴 `daeunFromFrame` 은 **표를 안 읽는다.** 절기를 인자로 받는다 —
 * 그래야 가드가 같은 함수에 중국 표준시 절기를 먹여 lunar-javascript 와 **잔차 0** 을 증명할 수 있다.
 * 그 증명이 "이 포팅은 관례 재현이고 달라지는 것은 달력뿐" 의 유일한 근거다
 * (scripts/verify-daeun-korean-calendar.mjs 검사 ①).
 */
import { DAY_MS, nodeTerms, solarDayIndex, solarFromDayIndex } from "./core.js";
import { ganji, mod } from "./ganji.js";

/**
 * 대운이 쓰는 시지 인덱스. 🔴 23시대를 0 이 아니라 11 로 본다 —
 * lunar-javascript 의 `(end.getHour() === 23) ? 11 : getTimeZhiIndex(...)` 를 그대로 옮긴 것이다.
 * 이 한 줄이 23시대 출생의 기운 나이를 정한다.
 */
function yunBranchIndex(hour) {
  const h = Number(hour) || 0;
  if (h === 23) return 11;
  return Math.floor((h + 1) / 2) % 12;
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const isLeapYear = (year) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
const daysOfMonth = (year, month) => (month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month - 1]);

/**
 * 생일 + n년 + m월 + d일. 🔴 lunar-javascript 의 `nextYear → nextMonth → next` 순서와
 * 월말 보정을 그대로 따른다(2/29 → 2/28, 말일 넘침은 그 달 말일로 자른다).
 * 순서를 바꾸면 말일 근처에서 하루가 달라진다.
 */
function advance(birth, years, months, days) {
  let year = birth.year + years;
  let month = birth.month;
  let day = birth.day;
  if (month === 2 && day > 28 && !isLeapYear(year)) day = 28;

  const total = (year * 12 + (month - 1)) + months;
  year = Math.floor(total / 12);
  month = (total % 12) + 1;
  const maxDay = daysOfMonth(year, month);
  if (day > maxDay) day = maxDay;

  return solarFromDayIndex(solarDayIndex(year, month, day) + days);
}

/** 그 시각을 지난 첫 절(節). 표 밖이면 null. */
function nextNodeTerm(year, month, day, hour, minute) {
  const dayIndex = solarDayIndex(year, month, day);
  const minuteOfDay = hour * 60 + minute;
  for (const candidateYear of [year, year + 1]) {
    const nodes = nodeTerms(candidateYear);
    if (!nodes) continue;
    for (const node of nodes) {
      if (node.dayIndex > dayIndex || (node.dayIndex === dayIndex && node.minuteOfDay > minuteOfDay)) {
        return node;
      }
    }
  }
  return null;
}

/** 그 시각까지 지나온 마지막 절(節). 표 밖이면 null. */
function prevNodeTerm(year, month, day, hour, minute) {
  const dayIndex = solarDayIndex(year, month, day);
  const minuteOfDay = hour * 60 + minute;
  for (const candidateYear of [year, year - 1]) {
    const nodes = nodeTerms(candidateYear);
    if (!nodes) continue;
    for (let i = nodes.length - 1; i >= 0; i -= 1) {
      const node = nodes[i];
      if (node.dayIndex < dayIndex || (node.dayIndex === dayIndex && node.minuteOfDay <= minuteOfDay)) {
        return node;
      }
    }
  }
  return null;
}

const secondsOf = (moment) => Number(moment.second) || 0;

/**
 * 순수 계산. 표를 안 읽고 넘겨받은 절기만 쓴다.
 *
 * @param {object} input
 * @param {{year,month,day,hour,minute,second?}} input.birth        생시(벽시계)
 * @param {number} input.yearStemIndex                              세차 천간 인덱스(甲=0)
 * @param {{stemIndex:number,branchIndex:number}} input.monthPillar 월주
 * @param {{year,month,day,hour,minute,second?}} input.prevNode     직전 節
 * @param {{year,month,day,hour,minute,second?}} input.nextNode     다음 節
 * @param {"M"|"F"} input.gender
 * @param {number} [input.count=10]                                 대운 칸 수(0번 미입운 포함)
 */
export function daeunFromFrame({ birth, yearStemIndex, monthPillar, prevNode, nextNode, gender, count = 10 }) {
  const male = String(gender || "").toUpperCase() === "M";
  const yangYear = yearStemIndex % 2 === 0;
  const forward = (yangYear && male) || (!yangYear && !male);

  const from = forward ? birth : prevNode;
  const to = forward ? nextNode : birth;
  if (!from || !to) return null;

  let hourDiff = yunBranchIndex(to.hour) - yunBranchIndex(from.hour);
  let dayDiff = solarDayIndex(to.year, to.month, to.day) - solarDayIndex(from.year, from.month, from.day);
  if (hourDiff < 0) {
    hourDiff += 12;
    dayDiff -= 1;
  }
  const monthDiff = Math.floor((hourDiff * 10) / 30);
  let months = dayDiff * 4 + monthDiff;
  const days = hourDiff * 10 - monthDiff * 30;
  const years = Math.floor(months / 12);
  months -= years * 12;

  const startSolar = advance(birth, years, months, days);
  if (!startSolar) return null;

  const step = forward ? 1 : -1;
  const monthCycleIndex = mod(monthPillar.stemIndex - monthPillar.branchIndex, 12) * 5 + monthPillar.stemIndex;
  const cycles = [];
  for (let index = 0; index < count; index += 1) {
    if (index < 1) {
      // 🔴 0번 칸은 대운이 아니라 **미입운 구간**이다. 간지가 없다(lunar-javascript 도 '' 를 낸다).
      cycles.push({
        index: 0,
        stemIndex: null,
        branchIndex: null,
        startYear: birth.year,
        endYear: startSolar.year - 1,
        startAge: 1,
        endAge: startSolar.year - birth.year,
      });
      continue;
    }
    const startYear = startSolar.year + (index - 1) * 10;
    const startAge = startYear - birth.year + 1;
    const cycleIndex = mod(monthCycleIndex + step * index, 60);
    cycles.push({
      index,
      stemIndex: cycleIndex % 10,
      branchIndex: cycleIndex % 12,
      startYear,
      endYear: startYear + 9,
      startAge,
      endAge: startAge + 9,
    });
  }

  return {
    forward,
    start: { years, months, days },
    startSolar,
    cycles,
    meta: {
      referenceTerm: forward ? "next-node" : "prev-node",
      hourDiff,
      dayDiff,
      // 초는 관례상 안 쓴다(시진 단위로 자른다). 넘어온 값은 참고로만 남긴다.
      boundarySeconds: { from: secondsOf(from), to: secondsOf(to) },
    },
  };
}

/**
 * 한국 표준시 절기표로 대운을 낸다.
 *
 * @param {{year,month,day,hour,minute}} at  KST 벽시계
 * @param {{gender:"M"|"F", count?:number, nightZiPolicy?:string}} options
 */
export function daeun(at, options = {}) {
  const gz = ganji(at, options);
  if (!gz) return null;

  const hour = Number(at.hour) || 0;
  const minute = Number(at.minute) || 0;
  const birth = { year: at.year, month: at.month, day: at.day, hour, minute };

  const prev = prevNodeTerm(at.year, at.month, at.day, hour, minute);
  const next = nextNodeTerm(at.year, at.month, at.day, hour, minute);
  if (!prev || !next) return null;

  return daeunFromFrame({
    birth,
    yearStemIndex: gz.year.stemIndex,
    monthPillar: gz.month,
    prevNode: prev,
    nextNode: next,
    gender: options.gender,
    count: options.count,
  });
}

export const __daeunInternals = { yunBranchIndex, advance, prevNodeTerm, nextNodeTerm, DAY_MS };
