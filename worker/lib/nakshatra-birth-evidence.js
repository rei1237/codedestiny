import { getSwissVedicPlanets } from "./swiss-ephemeris.js";
import { japaneseSukuyoFromDate } from "./nakshatra-japanese-calendar.js";
import { nakshatraInfo } from "./vedic-derived-calculations.js";
import { getNakshatraAttributes } from "../../constants/nakshatra-attributes.js";

export function validNakshatraBirth(input) {
  const { year, month, day, hour, minute, timezone, lat, lon } = input;
  if (![year, month, day, hour, minute, timezone, lat, lon].every(Number.isFinite)) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isInteger(year) && year >= 1900 && year <= 2100 && Number.isInteger(month) && Number.isInteger(day)
    && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    && Number.isInteger(hour) && hour >= 0 && hour <= 23 && Number.isInteger(minute) && minute >= 0 && minute <= 59
    && timezone >= -12 && timezone <= 14 && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

export async function buildNakshatraBirthEvidence(env, input, rawChart, requestUrl) {
  const birthUtc = new Date(Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute) - input.timezone * 3600000);
  // Unknown time: nominal civil birthday in JST; no invented conversion across dates.
  const calendarDate = input.timeUnknown
    ? new Date(Date.UTC(input.year, input.month - 1, input.day, 3)) : birthUtc;
  const japaneseSukuyo = japaneseSukuyoFromDate(calendarDate);
  let uncertainty = null;
  if (input.timeUnknown) {
    const endpoints = await Promise.all([0, 23].map(hour =>
      getSwissVedicPlanets(env, { ...input, hour, minute: hour === 23 ? 59 : 0 }, { requestUrl })));
    if (!endpoints.every(chart => Number.isFinite(chart?.planets?.Moon))) throw Object.assign(new Error("당일 달의 범위 계산이 지연되고 있어요. 다시 시도해 주세요."), { status: 503 });
    const first = nakshatraInfo(endpoints[0]?.planets?.Moon).index;
    const last = nakshatraInfo(endpoints[1]?.planets?.Moon).index;
    if (first == null || last == null) throw Object.assign(new Error("출생일의 달 범위를 계산하지 못했습니다. 다시 시도해 주세요."), { status: 503 });
    const indices = [first];
    for (let i = 1; i <= 3 && indices.at(-1) !== last; i++) indices.push((first + i) % 27);
    if (indices.at(-1) !== last) throw Object.assign(new Error("달 위치 범위 확인이 필요합니다."), { status: 503 });
    uncertainty = {
      timeUnknown: true, representativeHour: 12,
      possibleNakshatras: indices.map(index => getNakshatraAttributes(index).nameKo),
      note: "출생시간 미상: 베다는 출생지 정오의 참고값이며 당일 가능한 달 구간을 함께 표시합니다. 파다·상승궁·하우스·D9·정밀 다샤는 제외합니다. 숙요는 입력한 생일을 일본 시간의 날짜로 읽습니다.",
    };
  }
  return { birthUtc, japaneseSukuyo, rawChart, uncertainty };
}
