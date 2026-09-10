import { SUKUYO_MANSIONS } from "./sukuyo-premium.js";

const DAY_MS = 86400000;
const UNIX_EPOCH_JD = 2440587.5;
const KST_OFFSET_HOURS = 9;
const MANSION_COUNT = 27;
const MANSION_SPAN_DEGREES = 360 / MANSION_COUNT;
// 27숙 배열의 황도 원점. 날짜별 보정이 아니라 모든 시각에 동일한 좌표 정의다.
const SUKUYO_LONGITUDE_OFFSET = 16;
export const SUKUYO_ASTRONOMY_VERSION = "sukuyo-astronomy-v1";

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function normalizeLongitude(value) {
  const longitude = Number(value);
  if (!Number.isFinite(longitude)) return null;
  return positiveModulo(longitude, 360);
}

/** 항성 달 황경을 27숙 배열의 진행 방향으로 매핑한다. */
export function buildSukuyoFromMoonLongitude(moonLongitude, metadata = {}) {
  const longitude = normalizeLongitude(moonLongitude);
  if (longitude == null) return null;
  // 경계의 IEEE-754 표현 오차만 흡수하고 실제 황경 차이는 보존한다.
  const nakshatraIndex = Math.floor((longitude + 1e-12) / MANSION_SPAN_DEGREES);
  const mansionIdx = positiveModulo(nakshatraIndex + SUKUYO_LONGITUDE_OFFSET, MANSION_COUNT);
  const segmentStart = nakshatraIndex * MANSION_SPAN_DEGREES;
  const segmentFraction = (longitude - segmentStart) / MANSION_SPAN_DEGREES;
  const item = SUKUYO_MANSIONS[mansionIdx];
  if (!item) return null;
  return {
    index: mansionIdx,
    mansionIdx,
    ...item,
    mansion: `${item.nameKo}(${item.nameHan})`,
    mansionCh: item.nameHan,
    name: item.nameKo,
    nameKo: item.nameKo,
    nameHan: item.nameHan,
    moonEclipticLongitude: longitude,
    moonSiderealLongitude: longitude,
    nakshatraIndex,
    mansionSpanDegrees: MANSION_SPAN_DEGREES,
    segmentFraction,
    calculationBasis: "geocentric-sidereal-moon-longitude-lahiri",
    longitudeOriginOffset: SUKUYO_LONGITUDE_OFFSET,
    astronomyVersion: SUKUYO_ASTRONOMY_VERSION,
    ...metadata,
  };
}

export const SUKUYO_ASTRONOMY_CONSTANTS = Object.freeze({
  DAY_MS,
  UNIX_EPOCH_JD,
  KST_OFFSET_HOURS,
  MANSION_COUNT,
  MANSION_SPAN_DEGREES,
  SUKUYO_LONGITUDE_OFFSET,
});
