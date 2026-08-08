import { getSwissVedicPlanets } from "../worker/lib/swiss-ephemeris.js";
import {
  signIndex,
  nakshatraInfo,
  houseFromReference,
  buildVimshottariDasha,
  round,
  GRAHA_KO,
} from "../worker/lib/vedic-derived-calculations.js";
import { getNakshatraAttributes } from "../constants/nakshatra-attributes.js";

// 라시(12사인) 한글명·영문명·원소·성질 — worker/lib/vedic-derived-calculations.js의 SIGNS와 같은 순서(Aries=0..Pisces=11).
export const RASI_META = [
  { name: "메샤", en: "Aries", element: "불", quality: "활동" },
  { name: "브리샤바", en: "Taurus", element: "땅", quality: "고정" },
  { name: "미투나", en: "Gemini", element: "바람", quality: "이변" },
  { name: "카르카", en: "Cancer", element: "물", quality: "활동" },
  { name: "심하", en: "Leo", element: "불", quality: "고정" },
  { name: "칸야", en: "Virgo", element: "땅", quality: "이변" },
  { name: "툴라", en: "Libra", element: "바람", quality: "활동" },
  { name: "브리쉬치카", en: "Scorpio", element: "물", quality: "고정" },
  { name: "다누", en: "Sagittarius", element: "불", quality: "이변" },
  { name: "마카라", en: "Capricorn", element: "땅", quality: "활동" },
  { name: "쿰바", en: "Aquarius", element: "바람", quality: "고정" },
  { name: "미나", en: "Pisces", element: "물", quality: "이변" },
];

// getSwissVedicPlanets는 VEDIC_API_BASE_URL 등이 설정돼 있으면 외부 API로 새므로,
// 이 어댑터는 항상 로컬 Swiss WASM 계산을 쓰도록 명시적으로 비운다(app/api/sukuyo-basic/route.ts의
// buildSwissDirectEnv와 동일한 패턴). .se1 에페메리스 파일은 파일시스템이 아니라 origin 기반 fetch로
// 받아오므로(worker/lib/swiss-ephemeris.js의 resolveEpheBaseUrl), 사이트 origin도 함께 채운다.
function buildVedicSwissEnv(origin) {
  return {
    ...process.env,
    PUBLIC_SITE_ORIGIN: process.env.PUBLIC_SITE_ORIGIN || origin,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || origin,
    SITE_BASE_URL: process.env.SITE_BASE_URL || origin,
    VEDIC_API_BASE_URL: "",
    VEDIC_API_BASE: "",
    VEDIC_API_KEY: "",
    VEDIC_API_TOKEN: "",
    VEDIC_API_FORCE_EXTERNAL: "0",
  };
}

/**
 * /api/vedic-reading가 쓰던 저정밀 자체 수식(lib/vedicCalculator.js)을 대체하는 Swiss Ephemeris 기반
 * 어댑터. worker/lib/swiss-ephemeris.js(이미 Workers + app/api/sukuyo-basic에서 공유 중인 Swiss 브릿지)와
 * worker/lib/vedic-derived-calculations.js(런타임 비의존 라시/낙샤트라/다샤 파생 로직)를 그대로 재사용하고,
 * 기존 calculateVedicChart()가 반환하던 것과 동일한 필드 모양으로 값을 채운다(소비자 무변경 목적).
 *
 * @param {{year:number, month:number, day:number, hour:number, minute:number, tzOffset:number, latitude:number, longitude:number}} input
 * @param {{origin?: string, requestUrl?: string}} [context] - .se1 에페메리스 base URL 해석용(app/api/sukuyo-basic/route.ts와 동일하게 요청 origin을 전달).
 */
export async function computeVedicChartSwiss(input, context = {}) {
  if (input.latitude < -90 || input.latitude > 90) throw new Error("LATITUDE_OUT_OF_RANGE");
  if (input.longitude < -180 || input.longitude > 180) throw new Error("LONGITUDE_OUT_OF_RANGE");

  const swiss = await getSwissVedicPlanets(
    buildVedicSwissEnv(context.origin),
    {
      year: input.year,
      month: input.month,
      day: input.day,
      hour: input.hour,
      minute: input.minute,
      timezone: input.tzOffset,
      lat: input.latitude,
      lon: input.longitude,
    },
    { requestUrl: context.requestUrl, origin: context.origin },
  );

  const { planets, ayanamsa, ascendantSidereal } = swiss;
  if (!Number.isFinite(ascendantSidereal)) throw new Error("LAGNA_CALC_FAILED");

  const lagnaRashiIndex = signIndex(ascendantSidereal);
  const birthUtcMillis = Date.UTC(input.year, input.month - 1, input.day, 0, 0, 0, 0)
    + (input.hour + input.minute / 60 - input.tzOffset) * 3600000;
  const birthUtcDate = new Date(birthUtcMillis);

  function buildBody(longitude) {
    const idx = signIndex(longitude);
    const nak = nakshatraInfo(longitude);
    const attrs = getNakshatraAttributes(nak.index);
    const span = 360 / 27;
    const normalizedLon = ((longitude % 360) + 360) % 360;
    const progress = round((normalizedLon - nak.index * span) / span, 4);
    return {
      degree: round(longitude, 2),
      rashi: RASI_META[idx],
      nakshatra: {
        name: attrs?.nameKo || nak.name,
        lord: GRAHA_KO[nak.lord] || nak.lord,
        deity: attrs?.deity || "",
        symbol: attrs?.symbol || "",
        index: nak.index,
        pada: nak.pada,
        progress,
      },
      house: houseFromReference(idx, lagnaRashiIndex),
    };
  }

  const dashaRaw = buildVimshottariDasha(planets.Moon, birthUtcDate);

  return {
    ayanamsha: round(ayanamsa, 2),
    lagna: {
      degree: round(ascendantSidereal, 2),
      rashi: RASI_META[lagnaRashiIndex],
      rashiIndex: lagnaRashiIndex,
    },
    sun: buildBody(planets.Sun),
    moon: buildBody(planets.Moon),
    rahu: buildBody(planets.Rahu),
    ketu: buildBody(planets.Ketu),
    dasha: {
      currentLord: GRAHA_KO[dashaRaw.currentMahadasha] || dashaRaw.currentMahadasha,
      remaining: round(dashaRaw.birthDashaBalanceYears, 1),
      sequence: dashaRaw.timeline.map((period) => ({
        lord: GRAHA_KO[period.lord] || period.lord,
        years: round(period.years, 1),
        startYear: Number(period.startDate.slice(0, 4)),
        endYear: Number(period.endDate.slice(0, 4)),
      })),
    },
    rawInput: input,
  };
}
