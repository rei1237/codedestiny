// 수비학 날짜 수 — Personal Year / Month / Day 와 Universal Day 의 공유 계산.
//
// /today 수비학 탭(worker/routes/fortune-today.js)과 Threads 20:30 수비학 글(worker/lib/threads-daily-providers/numerology.js)이
// 같은 값을 내도록 한 곳에 둔다. 순수 함수이고 시간대를 모른다 — 호출부가 KST 날짜 {year, month, day} 를 넘긴다.
// (lib/tarot/numerology-tarot.mjs 의 calculatePersonalDay 는 new Date() 로컬 시각을 읽어 워커(UTC)에서 KST 00~09시에
//  전날 값이 나오고 연도를 반영하지 않는다. 타로 상담 결과를 바꾸지 않으려고 그쪽은 건드리지 않았다.)
//
// 🔴 축약 정책은 사이트의 기존 수비학(numerology-tarot.mjs reduceToSingleDigit·calculateLifePath)과 같다:
//    합을 자릿수 합으로 반복 축약하되 도중에 11·22·33 이 나오면 멈춘다(마스터 넘버 보존).
//    기존 오늘수가 "생월 + 생일 + 오늘 월 + 오늘 일" 을 원래 숫자 그대로 한 번에 더한 뒤 축약하므로,
//    여기서도 단계별로 따로 축약해 잇지 않고 누적 합을 한 번에 축약한다. 당해 연도만 먼저 한 자리로 줄인다
//    (2026 → 1). 단계별로 이으면 PY=11 이 PM 에서 2 로 먼저 줄어드는지에 따라 마스터 넘버가 달라진다.
//
//    PY = 축약(생월 + 생일 + 연도수)
//    PM = 축약(생월 + 생일 + 연도수 + 오늘 월)
//    PD = 축약(생월 + 생일 + 연도수 + 오늘 월 + 오늘 일)
//    UD = 축약(연도수 + 오늘 월 + 오늘 일)          — 생일 없이 날짜만으로 모두에게 같은 수

export const MASTER_NUMBERS = Object.freeze([11, 22, 33]);

/** 자릿수 합으로 반복 축약. allowMaster 면 11·22·33 에서 멈춘다. */
export function reduceNumber(value, allowMaster = true) {
  let num = Math.abs(Math.trunc(Number(value) || 0));
  while (num > 9) {
    if (allowMaster && MASTER_NUMBERS.includes(num)) return num;
    num = String(num).split("").reduce((sum, digit) => sum + Number(digit), 0);
  }
  return num;
}

export function isMasterNumber(value) {
  return MASTER_NUMBERS.includes(Number(value));
}

function isValidDate(year, month, day) {
  if (![year, month, day].every(Number.isInteger)) return false;
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * 오늘 날짜만으로 정해지는 수. 형식이 틀리면 null.
 * @param {{year:number, month:number, day:number}} today KST 날짜
 */
export function calculateUniversalNumbers(today) {
  const { year, month, day } = today || {};
  if (!isValidDate(year, month, day)) return null;
  const yearNumber = reduceNumber(year, false);
  return {
    universalYear: yearNumber,
    universalMonth: reduceNumber(yearNumber + month),
    universalDay: reduceNumber(yearNumber + month + day),
  };
}

/**
 * 양력 생월·생일과 오늘 날짜로 개인 수. 형식이 틀리면 null.
 * 음력 생일은 호출부가 먼저 양력으로 바꿔 넘긴다(수비학은 양력 날짜의 수를 쓴다).
 * @param {{month:number, day:number}} birth 양력 생월·생일
 * @param {{year:number, month:number, day:number}} today KST 날짜
 */
export function calculatePersonalNumbers(birth, today) {
  const universal = calculateUniversalNumbers(today);
  const month = Number(birth?.month);
  const day = Number(birth?.day);
  // 2월 29일생은 어느 해든 유효하다 — 윤년 판정에 윤년(2000)을 쓴다.
  if (!universal || !isValidDate(2000, month, day)) return null;
  const base = month + day + universal.universalYear;
  return {
    ...universal,
    personalYear: reduceNumber(base),
    personalMonth: reduceNumber(base + today.month),
    personalDay: reduceNumber(base + today.month + today.day),
  };
}
