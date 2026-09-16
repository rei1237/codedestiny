// 오늘 하늘 — 해·달의 시데리얼 황경과 판창가.
// today 허브(/api/fortune/today)와 Threads 베다 발행이 같은 값을 쓰도록 여기 한 곳에서만 계산한다.
// 🔴 기준 시각(12:00 KST, 서울 좌표)을 호출부마다 따로 두면 사이트와 SNS 의 나크샤트라가 어긋난다.
import { getSwissVedicPlanets } from "./swiss-ephemeris.js";
import { computePanchanga } from "./today-vedic-detail.js";

export const TODAY_SKY_MOMENT = Object.freeze({ hour: 12, minute: 0, timezone: 9, lat: 37.5665, lon: 126.978 });

// 판창가의 바라(요일). 이미 KST 로 옮긴 Y/M/D 라 UTC 로 다시 세면 된다.
export function weekdayOfDate({ year, month, day }) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/**
 * today = KST {year, month, day}. 달 황경이 없으면 null, Swiss 오류는 그대로 던진다(삼킬지는 호출부가 정한다).
 * 판창가는 니라야나(시데리얼) 황경으로 계산한다 — swiss 가 주는 값 그대로다.
 */
export async function computeTodaySky(env, today, { requestUrl } = {}) {
  const swiss = await getSwissVedicPlanets(
    env,
    { year: today.year, month: today.month, day: today.day, ...TODAY_SKY_MOMENT },
    { requestUrl },
  );
  const moonLon = Number(swiss?.planets?.Moon);
  const sunLon = Number(swiss?.planets?.Sun);
  if (!Number.isFinite(moonLon)) return null;
  const panchanga = Number.isFinite(sunLon)
    ? computePanchanga({ sunLon, moonLon, weekday: weekdayOfDate(today) })
    : null;
  return { moonLon, sunLon, panchanga };
}
