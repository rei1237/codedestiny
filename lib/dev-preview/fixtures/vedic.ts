import type { DevPreviewState } from "@/lib/dev-preview/core";

const READING_SUCCESS = {
  scores: { dharma: 78, artha: 72, kama: 66, moksha: 60, overall: 70 },
  sections: {
    karma_origin: { title: "카르마의 기원", body: "게자리 라그나에 목성이 자리해 넓은 시야와 낙관적인 태도를 타고났습니다. 달의 나크샤트라 푸르바팔구니 2파다는 창의성과 관계 지향을 되풀이되는 기질로 드러냅니다." },
    dharma_artha: { title: "물질적 성취와 다르마", body: "10번째 바바에 태양이 자리해 사회적 성취와 명예에 대한 열망이 뚜렷합니다. 11번째 바바의 흐름은 네트워크를 통해 결실이 들어오는 방식을 보여 줍니다." },
    relationship_soul: { title: "인연과 영혼의 파트너", body: "D1에서 금성은 황소자리에 있으나 D9(나바암샤)에서는 다른 결로 옮겨 갑니다. 드러난 관계 방식과 내면이 원하는 결이 어긋나는 지점이 이번 생 파트너십의 과제입니다." },
    dasha_upaya: { title: "현재의 다샤 흐름과 우파야", body: "토성 마하다샤 구간(2035-01-01까지)은 인내와 성실함이 결실로 이어지는 시기입니다. 새로운 시도보다 기존의 것을 다지고, 토성에 연결된 규칙적인 생활 리듬을 지키는 편이 유리합니다." },
  },
};

function toTruncatedContent(): string {
  const clone = JSON.parse(JSON.stringify(READING_SUCCESS));
  clone.sections.dasha_upaya.body = "토성 마하다샤 구간은 인내와 성실함이 결실로 이어지는 시기입";
  const serialized = JSON.stringify(clone);
  const cutIndex = serialized.lastIndexOf("이어지는 시기입") + "이어지는 시기입".length;
  return serialized.slice(0, cutIndex);
}

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
const SIGNS_KO = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];
const GRAHA_KO: Record<string, string> = { Sun: "태양", Moon: "달", Mars: "화성", Mercury: "수성", Jupiter: "목성", Venus: "금성", Saturn: "토성", Rahu: "라후", Ketu: "케투" };

// 라그나(상승궁) = 게자리(index 3) 고정 — houseFromReference와 동일한 공식으로
// 9그라하를 12바바에 배치한다(실제 calculateVedicAiChart()의 whole-sign 방식과 동일).
const REFERENCE_SIGN = 3;
const houseFromSign = (signIndex: number) => (((signIndex - REFERENCE_SIGN + 12) % 12) + 1);

const PLANET_PLACEMENTS: Array<{ name: string; signIndex: number; degree: number; nakshatra: string; pada: number; retrograde?: boolean }> = [
  { name: "Sun", signIndex: 0, degree: 21.4, nakshatra: "아슈비니", pada: 3 },
  { name: "Moon", signIndex: 3, degree: 8.2, nakshatra: "푸르바팔구니", pada: 2 },
  { name: "Mars", signIndex: 9, degree: 27.8, nakshatra: "다니쉬타", pada: 4 },
  { name: "Mercury", signIndex: 11, degree: 15.0, nakshatra: "우타라바드라파다", pada: 1 },
  { name: "Jupiter", signIndex: 4, degree: 12.1, nakshatra: "푸르바팔구니", pada: 1 },
  { name: "Venus", signIndex: 1, degree: 3.5, nakshatra: "크리티카", pada: 2 },
  { name: "Saturn", signIndex: 10, degree: 19.6, nakshatra: "샤타비샤", pada: 3 },
  { name: "Rahu", signIndex: 1, degree: 25.0, nakshatra: "로히니", pada: 4 },
  { name: "Ketu", signIndex: 7, degree: 26.3, nakshatra: "아누라다", pada: 2 },
];

function buildPlanets() {
  return PLANET_PLACEMENTS.map((p) => ({
    name: p.name,
    nameKo: GRAHA_KO[p.name],
    sign: SIGNS[p.signIndex],
    signKo: SIGNS_KO[p.signIndex],
    signIndex: p.signIndex,
    degree: p.degree,
    degreeInRashi: p.degree,
    longitude: Number((p.signIndex * 30 + p.degree).toFixed(4)),
    house: houseFromSign(p.signIndex),
    bhava: houseFromSign(p.signIndex),
    nakshatra: p.nakshatra,
    nakshatraLord: GRAHA_KO[p.name],
    pada: p.pada,
    dignity: "neutral",
    retrograde: Boolean(p.retrograde),
    combust: false,
    aspects: [],
  }));
}

function buildHouses(planets: ReturnType<typeof buildPlanets>) {
  return Array.from({ length: 12 }, (_, index) => {
    const signIndex = (REFERENCE_SIGN + index) % 12;
    const inHouse = planets.filter((p) => p.house === index + 1);
    return {
      label: "바바, Bhava",
      house: index + 1,
      sign: SIGNS[signIndex],
      signKo: SIGNS_KO[signIndex],
      rashi: SIGNS[signIndex],
      rashiKo: SIGNS_KO[signIndex],
      lord: GRAHA_KO.Sun,
      planets: inHouse.map((p) => p.name),
      grahas: inHouse.map((p) => p.nameKo),
      meaning: HOUSE_MEANINGS[index],
      basis: "whole-sign",
    };
  });
}

const HOUSE_MEANINGS = [
  "나 자신, 외모, 기본 기질, 삶의 출발점", "돈, 말, 가족 기반", "표현, 용기, 형제자매, 짧은 이동",
  "집, 마음의 안정, 어머니, 내면의 기반", "창조성, 연애, 자녀, 지성", "일상, 건강, 봉사, 경쟁",
  "관계, 결혼, 파트너십", "변화, 위기, 유산, 심층 심리", "믿음, 스승, 장거리 이동, 행운",
  "직업, 사회적 성취, 명예", "수입, 네트워크, 성취의 결실", "손실, 휴식, 영성, 해외",
];

function buildBhavas(houses: ReturnType<typeof buildHouses>) {
  return houses.map((house) => ({
    label: "바바, Bhava",
    house: house.house,
    rashi: house.sign,
    rashiKo: house.signKo,
    meaning: house.meaning,
    grahas: house.grahas,
    lord: house.lord,
  }));
}

function buildGrahas(planets: ReturnType<typeof buildPlanets>) {
  return planets.map((p) => ({
    label: "그라하, Graha",
    nameKo: p.nameKo,
    nameEn: p.name,
    rashi: p.sign,
    rashiKo: p.signKo,
    longitude: p.longitude,
    degreeInRashi: p.degreeInRashi,
    house: p.house,
    nakshatra: p.nakshatra,
    pada: p.pada,
    retrograde: p.retrograde,
  }));
}

const DASHA_PERIODS = [
  { lord: "Jupiter", startDate: "2000-01-01", endDate: "2016-01-01", durationYears: 16 },
  { lord: "Saturn", startDate: "2016-01-01", endDate: "2035-01-01", durationYears: 19 },
  { lord: "Mercury", startDate: "2035-01-01", endDate: "2052-01-01", durationYears: 17 },
  { lord: "Ketu", startDate: "2052-01-01", endDate: "2059-01-01", durationYears: 7 },
  { lord: "Venus", startDate: "2059-01-01", endDate: "2079-01-01", durationYears: 20 },
];
const CURRENT_MAHADASHA = DASHA_PERIODS[1];

export function buildVedicPreviewPayload(state: DevPreviewState) {
  if (state === "failed") {
    return { ok: false, reason: "GENERATION_FAILED", message: "AI 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 자동으로 복구됩니다." };
  }

  const content = state === "truncated" ? toTruncatedContent() : JSON.stringify(READING_SUCCESS);
  const planets = buildPlanets();
  const houses = buildHouses(planets);
  const moonPoint = planets.find((p) => p.name === "Moon")!;
  const sunPoint = planets.find((p) => p.name === "Sun")!;

  const vedicChart = {
    calculationConfig: { zodiac: "sidereal", ayanamsa: "Lahiri", bhavaSystem: "whole-sign", source: "SWISS" },
    ayanamsa: "Lahiri",
    ayanamsaDegree: 24.13,
    calculationMeta: {
      source: "swiss-ephemeris",
      engineQuality: "high",
      fallbackUsed: false,
      birthTimeConfidence: "provided",
      interpretationMode: "lagna-chart",
      bhavaSystem: "whole-sign",
      zodiac: "sidereal",
      lagnaBhavaAvailable: true,
    },
    lagna: {
      label: "라그나, Lagna",
      sign: SIGNS[REFERENCE_SIGN],
      signKo: SIGNS_KO[REFERENCE_SIGN],
      rashi: SIGNS[REFERENCE_SIGN],
      rashiKo: SIGNS_KO[REFERENCE_SIGN],
      degree: 3.1,
      degreeInRashi: 3.1,
      longitude: REFERENCE_SIGN * 30 + 3.1,
      nakshatra: "푸르바팔구니",
      nakshatraLord: "금성",
      pada: 2,
      firstHouseRashi: SIGNS[REFERENCE_SIGN],
      firstHouseRashiKo: SIGNS_KO[REFERENCE_SIGN],
    },
    moon: { sign: moonPoint.sign, degree: moonPoint.degree, longitude: moonPoint.longitude, nakshatra: moonPoint.nakshatra, pada: moonPoint.pada, house: moonPoint.house },
    sun: { sign: sunPoint.sign, degree: sunPoint.degree, longitude: sunPoint.longitude, nakshatra: sunPoint.nakshatra, pada: sunPoint.pada, house: sunPoint.house },
    planets,
    rashis: SIGNS.map((nameEn, index) => ({ label: "라시, Rashi", index: index + 1, nameKo: SIGNS_KO[index], nameEn, startLongitude: index * 30, endLongitude: index === 11 ? 360 : (index + 1) * 30 })),
    grahas: buildGrahas(planets),
    rahuKetu: { rahu: planets.find((p) => p.name === "Rahu"), ketu: planets.find((p) => p.name === "Ketu") },
    houses,
    bhavas: buildBhavas(houses),
    moonNakshatra: { label: "나크샤트라, Nakshatra", name: moonPoint.nakshatra, pada: moonPoint.pada, lord: moonPoint.nakshatraLord, moonLongitude: moonPoint.longitude },
    divisionalCharts: null,
    yogas: [],
    dasha: { currentLord: CURRENT_MAHADASHA.lord, currentMahadasha: CURRENT_MAHADASHA.lord, periods: DASHA_PERIODS },
    vimshottariDasha: {
      label: "다샤, Dasha",
      systemLabel: "빈쇼타리 다샤, Vimshottari Dasha",
      birthNakshatra: moonPoint.nakshatra,
      firstDashaLord: "Jupiter",
      birthBalanceYears: 8.4,
      currentMahadasha: CURRENT_MAHADASHA,
      currentAntardasha: null,
      periods: DASHA_PERIODS,
    },
    transits: null,
    chartSummary: "게자리 라그나에 목성이 함께 자리해 신뢰를 주는 인상, 토성 마하다샤 시기를 지나는 중입니다.",
  };

  return {
    ok: true,
    consultation: {
      id: "dev-preview-vedic",
      status: "completed",
      birthInfo: { name: "민준", gender: "male", birthDate: "1989-04-12", birthTime: "08:30", calendarType: "solar" },
      topic: "종합 조티시 리딩",
      vedicChart,
      messages: [{ role: "assistant", content, createdAt: "2026-07-08T09:00:00.000Z" }],
    },
  };
}
