/**
 * 한국 음양력 코어 — 천문 계산 층 (**빌드타임 전용**).
 *
 * 🔴 이 파일은 `index.js` 에서 절대 import 하지 않는다. `scripts/build-korean-calendar-table.mjs`
 * 와 검증 스크립트만 부른다. 그래야 `astronomy-engine`(브라우저 min 116KB)이 런타임 번들로
 * 끌려 들어오지 않는다. verify:korean-calendar-table-fresh 가 이 분리를 강제한다.
 *
 * ── 왜 astronomy-engine 인가 ────────────────────────────────────────────────
 * 이미 이 레포의 dependency 이고 워커 번들에도 들어 있다(worker/lib/swiss-ephemeris.js).
 * 실측(2026-08-27): 1900~2100 절기 4,623건을 lunar-javascript 와 순간 비교했을 때
 * 평균 |Δ| 0.21분 · 최대 1.04분 · 2분 초과 0건 — **천체력 자체는 같다.**
 * 우리가 고치는 것은 천체력이 아니라 **어느 나라 시간으로 민용일을 가르느냐**다.
 *
 * ── 🔴 이 파일의 단 하나의 규칙 ─────────────────────────────────────────────
 * 순간(ms)은 천체 사건을 **찾을 때만** 쓴다. 역법 판정은 전부 `kstDayIndex()` 정수 위에서 한다.
 * 이걸 어기면 조용히 한 달이 밀린다 — 1984년 동지가 그 케이스다:
 *   동지 1984-12-21 16:23 UTC = KST 12-22 01:23, 직전 삭 = KST 12-22.
 *   순간으로 비교하면 삭 < 동지라 앞 삭월이 11월로 잡히고, 그 뒤 모든 달이 한 칸 밀려
 *   설날 1985 가 01-21(오답)로 나온다. 민용일로 비교하면 02-20(KASI 정답)이다.
 */
import * as Astronomy from "astronomy-engine";

/** 한국 표준시. 대한민국은 1988-10-08 이후 서머타임이 없고, 이 표는 민용일만 쓴다. */
export const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 86400000;

/** 1970-01-01 (KST) = 0 인 KST 민용일 일련번호. 역법 판정은 전부 이 정수 위에서 한다. */
export function kstDayIndex(ms) {
  return Math.floor((ms + KST_OFFSET_MS) / DAY_MS);
}

/** KST 벽시계 조각. 표를 만들 때만 쓴다. */
export function kstParts(ms) {
  const d = new Date(ms + KST_OFFSET_MS);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
  };
}

/** 자정으로부터 떨어진 초. 민용일이 뒤집힐 위험이 있는 항목을 골라내는 데 쓴다. */
export function secondsFromKstMidnight(ms) {
  const withinDay = (((ms + KST_OFFSET_MS) % DAY_MS) + DAY_MS) % DAY_MS;
  return Math.min(withinDay, DAY_MS - withinDay) / 1000;
}

/**
 * 삭(新月) 순간을 순서대로 찾는다. `[fromMs, toMs]` 안의 것만 돌려준다.
 * 🔴 삭 간격은 29.27~29.83일이라 탐색 한도 40일이면 반드시 다음 것을 잡는다.
 */
export function findNewMoons(fromMs, toMs) {
  const out = [];
  let cursor = Astronomy.SearchMoonPhase(0, new Date(fromMs), 40);
  while (cursor) {
    const ms = cursor.date.getTime();
    if (ms > toMs) break;
    out.push(ms);
    cursor = Astronomy.SearchMoonPhase(0, new Date(ms + 3 * DAY_MS), 40);
  }
  return out;
}

/**
 * 태양 겉보기 황경이 `targetDegrees` 가 되는 다음 순간.
 * 🔴 탐색 시작점을 직전 사건 바로 뒤에 두어야 한다. 고정 간격으로 훑으면 시작점이 뒤로 밀려
 * 엉뚱한 해의 같은 황경을 잡는다(프로토타입에서 두 번 낸 버그다).
 */
export function findSunLongitude(targetDegrees, fromMs, limitDays = 400) {
  const hit = Astronomy.SearchSunLongitude(targetDegrees, new Date(fromMs), limitDays);
  return hit ? hit.date.getTime() : null;
}

/** 동지(태양황경 270°) 순간. */
export function winterSolstice(year) {
  return findSunLongitude(270, Date.UTC(year, 11, 1), 60);
}

/**
 * 24절기 순간 24개.
 *
 * 🔴 인덱스 0 = 소한(小寒, 황경 285°). 이 기점을 고른 이유는 **24개가 모두 같은 양력 해 안에
 * 닫히기 때문**이다(소한 1월 초 ~ 동지 12월 하순). 입춘을 0으로 잡으면 마지막 항목이 다음 해로
 * 넘어가 연도별 저장이 깨진다. 황경 = (285 + 15 × index) mod 360.
 */
export function solarTermInstants(year) {
  const out = [];
  // 소한은 1월 5~7일이다. 12월 20일부터 찾으면 반드시 그 해 소한을 잡는다.
  let cursor = Date.UTC(year - 1, 11, 20);
  for (let index = 0; index < 24; index += 1) {
    const degrees = (285 + 15 * index) % 360;
    const ms = findSunLongitude(degrees, cursor, 60);
    if (ms === null) throw new Error(`solar term not found: year=${year} index=${index} lon=${degrees}`);
    out.push({ index, ms });
    cursor = ms + DAY_MS; // 다음 절기는 14.7~15.7일 뒤다. 직전 사건 바로 뒤에서 찾는다.
  }
  return out;
}

/**
 * 중기(中氣) — 태양황경이 **30°의 배수**가 되는 12개. 무중치윤 판정에만 쓴다.
 * 인덱스가 홀수인 것이 중기다: index 1 = 300°(대한), 3 = 330°(우수), … 23 = 270°(동지).
 */
export function isMidTermIndex(index) {
  return index % 2 === 1;
}

/**
 * 절(節) — 월건(月建)을 여는 12개. 인덱스가 짝수인 것이다:
 * 0 = 285°(소한), 2 = 315°(입춘), 4 = 345°(경칩), …
 */
export function isNodeTermIndex(index) {
  return index % 2 === 0;
}
