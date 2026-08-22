/**
 * 휴먼 디자인 천문 계층 — 출생 데이터 → Personality/Design 두 순간의 26 activation.
 *
 * 파이프라인(요구사항 28):
 *   birthDate/birthTime/timezone → (음력이면 양력 변환) → 2-pass IANA 오프셋 → UTC millis
 *     → Personality 13 천체
 *     → 출생 태양에서 정확히 88° 이전이 되는 순간을 수치 탐색
 *     → Design 13 천체
 *     → assembleChart(순수 엔진)
 *
 * 🔴 "출생일 - 88일" 로 근사하지 않는다. 88° 는 태양 **황경의 호**이고 태양 속도는 일정하지
 *    않으므로(근일점 부근 ~1.019°/일, 원일점 부근 ~0.953°/일) 일수 차감은 최대 1일 이상
 *    어긋난다 = 게이트 하나가 통째로 바뀔 수 있다.
 */

import { Lunar } from "lunar-javascript";

import {
  getSwissTropicalLongitudes,
  julianDayFromUtcMillis,
} from "./swiss-ephemeris.js";
import { wallClockToUtcMillis } from "./iana-offset.js";
import { DIRECT_PLANETS, PLANET } from "../../lib/human-design/planets.js";
import { normalizeLongitude, signedDegreeDelta } from "../../lib/human-design/mandala.js";
import { assembleChart } from "../../lib/human-design/chart.js";
import { HD_NODE_MODE } from "../../lib/human-design/version.js";

/** Design 순간을 정의하는 태양호(도). HD 정의값이며 노브가 아니다. */
export const SOLAR_ARC_DEG = 88;

/** 탐색 시드 계산용 태양 평균 각속도(도/일). 시드일 뿐 답이 아니다. */
const MEAN_SUN_DEG_PER_DAY = 360 / 365.2422;

/** 뉴턴 반복 상한. 고정 상수여야 결과가 결정론이다. */
const MAX_SEARCH_ITERATIONS = 8;

/** 조기 종료 허용오차(도). 1e-8° ≈ 태양 기준 0.9ms */
const CONVERGENCE_TOLERANCE_DEG = 1e-8;

/** 반복을 다 쓴 뒤에도 이 이상 벌어져 있으면 실패로 본다(도). 1e-6° ≈ 0.09초 */
const ACCEPTANCE_TOLERANCE_DEG = 1e-6;

const MS_PER_DAY = 86400000;

function isLunarCalendar(value) {
  const text = String(value == null ? "" : value).toLowerCase();
  return text.includes("lun") || text.includes("음");
}

function isLeapMonth(value) {
  const text = String(value == null ? "" : value).toLowerCase();
  return text.includes("leap") || String(value == null ? "" : value).includes("윤");
}

function parseDateParts(birthDate) {
  const match = String(birthDate || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new RangeError(`휴먼 디자인: birthDate 는 YYYY-MM-DD 여야 한다 (${birthDate})`);
  }
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function parseTimeParts(birthTime) {
  const match = String(birthTime || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    throw new RangeError(`휴먼 디자인: birthTime 은 HH:MM 이어야 한다 (${birthTime})`);
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new RangeError(`휴먼 디자인: birthTime 범위를 벗어났다 (${birthTime})`);
  }
  return { hour, minute };
}

/**
 * 출생 입력 → UTC 밀리초.
 *
 * @param {object} birthInput
 * @param {string} birthInput.birthDate "YYYY-MM-DD"
 * @param {string} birthInput.birthTime "HH:MM"
 * @param {string} birthInput.timezone IANA 이름 또는 고정 오프셋 표기
 * @param {string} [birthInput.calendar] "solar"(기본) | "lunar" | "lunar-leap"
 * @returns {{utcMillis:number, offsetHours:number, solarDate:{year:number,month:number,day:number}, wallClock:object}}
 */
export function resolveBirthMoment(birthInput) {
  const { year, month, day } = parseDateParts(birthInput.birthDate);
  const { hour, minute } = parseTimeParts(birthInput.birthTime);

  let solarDate = { year, month, day };
  if (isLunarCalendar(birthInput.calendar)) {
    const leap = isLeapMonth(birthInput.calendar) || birthInput.isLeapMonth === true;
    const solar = Lunar.fromYmd(year, leap ? -month : month, day).getSolar();
    solarDate = { year: solar.getYear(), month: solar.getMonth(), day: solar.getDay() };
  }

  const wallClock = { ...solarDate, hour, minute, second: 0 };
  const { utcMillis, offsetHours } = wallClockToUtcMillis(wallClock, birthInput.timezone);
  return { utcMillis, offsetHours, solarDate, wallClock };
}

async function longitudesAt(env, utcMillis, options) {
  const [row] = await getSwissTropicalLongitudes(
    env,
    [julianDayFromUtcMillis(utcMillis)],
    DIRECT_PLANETS,
    options,
  );
  const out = {};
  for (const planet of DIRECT_PLANETS) {
    out[planet] = normalizeLongitude(row[planet].longitude);
  }
  return out;
}

async function sunAt(env, utcMillis, options) {
  const [row] = await getSwissTropicalLongitudes(
    env,
    [julianDayFromUtcMillis(utcMillis)],
    [PLANET.SUN],
    options,
  );
  return row[PLANET.SUN];
}

/**
 * 출생 태양 황경에서 정확히 88° 이전이 되는 순간을 찾는다.
 *
 * 태양은 항상 순행하므로 목표 황경까지의 부호 있는 차이는 탐색 구간에서 단조롭고, 실제
 * 태양 각속도를 도함수로 쓰는 뉴턴법이 몇 번 만에 수렴한다. 반복 상한·허용오차가 상수라
 * 같은 입력은 항상 같은 timestamp 를 낸다.
 *
 * @returns {Promise<{utcMillis:number, targetLongitude:number, iterations:Array<object>, converged:boolean, finalDiffDeg:number}>}
 */
export async function findDesignMoment(env, birthUtcMillis, personalitySunLongitude, options = {}) {
  const targetLongitude = normalizeLongitude(personalitySunLongitude - SOLAR_ARC_DEG);

  // 시드: 88° 를 평균 각속도로 나눈 일수(≈89.28일). 답이 아니라 출발점일 뿐이다.
  let utcMillis = birthUtcMillis - ((SOLAR_ARC_DEG / MEAN_SUN_DEG_PER_DAY) * MS_PER_DAY);

  const iterations = [];
  let converged = false;
  let finalDiffDeg = Number.NaN;

  for (let index = 0; index < MAX_SEARCH_ITERATIONS; index += 1) {
    const sun = await sunAt(env, utcMillis, options);
    const diffDeg = signedDegreeDelta(sun.longitude - targetLongitude);
    iterations.push({
      index,
      utcMillis,
      sunLongitude: sun.longitude,
      diffDeg,
    });
    finalDiffDeg = diffDeg;

    if (Math.abs(diffDeg) <= CONVERGENCE_TOLERANCE_DEG) {
      converged = true;
      break;
    }

    // 실제 태양 각속도를 도함수로 쓴다. 값이 비정상이면 평균 속도로 후퇴한다.
    const speed = Number.isFinite(sun.speedLongitude) && sun.speedLongitude > 0.5
      ? sun.speedLongitude
      : MEAN_SUN_DEG_PER_DAY;
    utcMillis -= (diffDeg / speed) * MS_PER_DAY;
  }

  if (!converged && Math.abs(finalDiffDeg) > ACCEPTANCE_TOLERANCE_DEG) {
    throw new Error(
      `휴먼 디자인: Design 순간 탐색이 수렴하지 않았다 (잔차 ${finalDiffDeg}°, 반복 ${iterations.length}회)`,
    );
  }

  return { utcMillis, targetLongitude, iterations, converged, finalDiffDeg };
}

/**
 * 출생 입력 하나로 전체 계산 결과를 만든다.
 *
 * @param {object} env Cloudflare Worker env
 * @param {object} birthInput { birthDate, birthTime, timezone, calendar?, latitude?, longitude? }
 * @param {object} [options] { nodeMode?, calculatedAt?, requestUrl?, ...getSwiss 옵션 }
 */
export async function calculateHumanDesignChart(env, birthInput, options = {}) {
  const swissOptions = { ...options, nodeMode: options.nodeMode || HD_NODE_MODE };

  const birth = resolveBirthMoment(birthInput);
  const personalityLongitudes = await longitudesAt(env, birth.utcMillis, swissOptions);

  const design = await findDesignMoment(
    env,
    birth.utcMillis,
    personalityLongitudes[PLANET.SUN],
    swissOptions,
  );
  const designLongitudes = await longitudesAt(env, design.utcMillis, swissOptions);

  return assembleChart({
    personalityLongitudes,
    designLongitudes,
    birthInput: {
      birthDate: birthInput.birthDate,
      birthTime: birthInput.birthTime,
      timezone: birthInput.timezone,
      calendar: birthInput.calendar || "solar",
      latitude: birthInput.latitude == null ? null : Number(birthInput.latitude),
      longitude: birthInput.longitude == null ? null : Number(birthInput.longitude),
      solarDate: birth.solarDate,
      utcOffsetHours: birth.offsetHours,
    },
    moments: {
      birthUtcMillis: birth.utcMillis,
      birthUtc: new Date(birth.utcMillis).toISOString(),
      designUtcMillis: design.utcMillis,
      designUtc: new Date(design.utcMillis).toISOString(),
      solarArcDeg: SOLAR_ARC_DEG,
      designSearch: {
        targetLongitude: design.targetLongitude,
        iterationCount: design.iterations.length,
        converged: design.converged,
        finalDiffDeg: design.finalDiffDeg,
      },
    },
    calculatedAt: options.calculatedAt || null,
  });
}
