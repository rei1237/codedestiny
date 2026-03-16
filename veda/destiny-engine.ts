// ============================================================
// src/analysis/destiny-engine.ts
// Phase 3: 7대 운명 분석 모듈 (The 7 Destiny Categories)
//
// BirthChartData를 입력받아 7가지 카테고리의 분석 결과를
// 구조화된 JSON으로 반환합니다.
// ============================================================

import {
  BirthChartData,
  PlanetName,
  SignName,
  NakshatraName,
  Element,
  ChakraName,
  ChakraStatus,
  PersonalityResult,
  WealthResult,
  CareerResult,
  ChakraResult,
  RomanceResult,
  CompatibilityResult,
  AshtakootItem,
  YogaResult,
  YogaPractice,
  DestinyReport,
  FullCompatibilityReport,
  NakshatraInfo,
  RasiChart,
} from "../types";

import { ChartBuilder } from "../core/charts";
import { SIGN_NAMES, signFromLongitude } from "../core/ephemeris";

import {
  SIGN_TRAITS,
  NAKSHATRA_TRAITS,
  PLANET_SIGNIFICATIONS,
  CHAKRA_PLANET_MAP,
  CHAKRA_INFO,
  YOGA_PRACTICES,
  NAKSHATRA_VARNA,
  NAKSHATRA_GANA,
  NAKSHATRA_YONI,
  YONI_COMPATIBILITY,
  NAKSHATRA_NADI,
  PLANET_FRIENDSHIP,
} from "../data/knowledge-base";

// ─── 공통 헬퍼 ───────────────────────────────────────────

/**
 * 행성 강도 점수를 계산합니다 (0–100).
 * Exalted=90, Own=75, Neutral=50, Debilitated=15, Retrograde=-10
 */
function getPlanetStrength(
  chart: BirthChartData,
  planet: PlanetName
): number {
  const pos = chart.rasi.planets[planet];
  let score = 50;
  if (pos.dignity === "Exalted")     score = 90;
  else if (pos.dignity === "Own")    score = 75;
  else if (pos.dignity === "Debilitated") score = 15;
  if (pos.isRetrograde) score = Math.max(0, score - 10);
  return score;
}

/**
 * 하우스 강도를 평가합니다 (텍스트).
 */
function evalHouseStrength(
  chart: BirthChartData,
  houseNumber: number
): string {
  const house = chart.rasi.houses[houseNumber - 1];
  const lord = house.lord;
  const lordPos = chart.rasi.planets[lord];
  const planetsInHouse = house.planets;

  if (lordPos.dignity === "Exalted" && planetsInHouse.length > 0) return "매우 강함";
  if (lordPos.dignity === "Exalted" || lordPos.dignity === "Own") return "강함";
  if (lordPos.dignity === "Debilitated" && planetsInHouse.length === 0) return "매우 약함";
  if (lordPos.dignity === "Debilitated") return "약함";
  if (planetsInHouse.includes("Jupiter")) return "강함 (목성 축복)";
  return "보통";
}

// ─── Module 1: 타고난 성향 ────────────────────────────────

/**
 * 1. 타고난 성향 분석 (Innate Personality)
 *
 * Lagna 별자리 + 지배 행성 + 달의 낙샤트라를 결합하여
 * 사용자의 외적 자아(Lagna)와 내적 자아(Moon Nakshatra)를 분석합니다.
 */
export function analyzePersonality(
  chart: BirthChartData
): PersonalityResult {
  const lagnaSign = chart.rasi.ascendantSign;
  const lagnaSignIdx = signFromLongitude(chart.rasi.ascendant);
  const lagnaLord = chart.rasi.houses[0].lord;
  const lagnaLordPos = chart.rasi.planets[lagnaLord];
  const lagnaTraits = SIGN_TRAITS[lagnaSign];

  const moonNakshatra = chart.nakshatra.name;
  const moonNakshatraLord = chart.nakshatra.lord;
  const nakshatraData = NAKSHATRA_TRAITS[moonNakshatra];

  // 4원소 분포 계산
  const elementBalance: Record<Element, number> = {
    Fire: 0, Earth: 0, Air: 0, Water: 0,
  };
  const modalityBalance: Record<"Cardinal" | "Fixed" | "Mutable", number> = {
    Cardinal: 0, Fixed: 0, Mutable: 0,
  };

  const keyPlanets: PlanetName[] = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
  for (const p of keyPlanets) {
    const pSign = chart.rasi.planets[p].signName;
    const traits = SIGN_TRAITS[pSign];
    elementBalance[traits.element]++;
    modalityBalance[traits.modality]++;
  }

  // 핵심 특성 조합 (Lagna + Nakshatra)
  const coreTraits = [
    ...lagnaTraits.traits.slice(0, 2),
    ...(nakshatraData?.traits.slice(0, 2) ?? []),
  ];

  // 무의식 (달의 낙샤트라 그림자 특성)
  const subconscious = nakshatraData?.shadow ?? ["내면 탐구 필요"];

  // Lagna 지배 행성 위치 설명
  const lagnaLordHouse = ChartBuilder.getPlanetHouse(chart.rasi, lagnaLord);
  const lagnaLordPosition = `${lagnaLord} in ${lagnaLordPos.signName} (${lagnaLordHouse}하우스, ${lagnaLordPos.dignity})`;

  // 삶의 주제 (Lagna 별자리 키워드 + 낙샤트라 목적)
  const lifeTheme = `${lagnaTraits.keywords.join(" · ")} / ${nakshatraData?.purpose ?? "성장"}`;

  return {
    lagnaSign,
    lagnaLord,
    lagnaLordPosition,
    moonNakshatra,
    moonNakshatraLord,
    coreTraits,
    subconscious,
    lifeTheme,
    elementBalance,
    modalityBalance,
  };
}

// ─── Module 2: 재물운 ─────────────────────────────────────

/**
 * 2. 재물운 분석 (Wealth)
 *
 * - D-1: 2하우스(축적), 11하우스(수익), 목성 위치
 * - D-2 Hora 차트 강도
 * - 재물 요가(Dhana Yoga) 판별
 */
export function analyzeWealth(chart: BirthChartData): WealthResult {
  const house2 = chart.rasi.houses[1];
  const house11 = chart.rasi.houses[10];
  const house2Lord = house2.lord;
  const house11Lord = house11.lord;
  const jupiter = chart.rasi.planets["Jupiter"];

  // 재물 점수 계산 기반
  let score = 50;

  // 2하우스 상태
  const h2Strength = evalHouseStrength(chart, 2);
  const h2PlanetCount = house2.planets.length;
  if (h2Strength.includes("강")) score += 10;
  if (h2Strength.includes("약")) score -= 10;
  if (h2PlanetCount > 0) score += 5;

  // 11하우스 상태
  const h11Strength = evalHouseStrength(chart, 11);
  if (h11Strength.includes("강")) score += 10;
  if (h11Strength.includes("약")) score -= 10;

  // 목성 영향
  const jupStrength = getPlanetStrength(chart, "Jupiter");
  score += Math.round((jupStrength - 50) / 5);

  // D-2 Hora 강도
  const d2Sun = chart.varga.d2.planets["Sun"].signName;
  const d2Moon = chart.varga.d2.planets["Moon"].signName;
  const horaStrength = d2Sun === "Leo" ? "태양 Hora 강함 (남성 에너지/재물 활성)" :
                       d2Moon === "Cancer" ? "달 Hora 강함 (여성 에너지/재물 활성)" :
                       "Hora 균형 상태";
  score = Math.min(100, Math.max(0, score));

  // 재물 요가 감지
  const wealthYogas: string[] = [];
  // Dhana Yoga: 2하우스/11하우스 지배 행성이 같은 하우스에 있을 때
  const h2LordHouse = ChartBuilder.getPlanetHouse(chart.rasi, house2Lord);
  const h11LordHouse = ChartBuilder.getPlanetHouse(chart.rasi, house11Lord);
  if (h2LordHouse === h11LordHouse) {
    wealthYogas.push(`Dhana Yoga: ${house2Lord}와 ${house11Lord}가 ${h2LordHouse}하우스에서 결합`);
  }
  // Lakshmi Yoga: 9하우스 지배 행성이 각 자리에 있고 금성이 강할 때
  if (chart.rasi.planets["Venus"].dignity === "Exalted" ||
      chart.rasi.planets["Venus"].dignity === "Own") {
    wealthYogas.push("Lakshmi Yoga: 금성 강세 — 예술·미·사치를 통한 재물");
  }
  // Gaja Kesari: 달과 목성이 Kendra(1,4,7,10하우스)에 있을 때
  const moonHouse = ChartBuilder.getPlanetHouse(chart.rasi, "Moon");
  const jupHouse  = ChartBuilder.getPlanetHouse(chart.rasi, "Jupiter");
  const kendras = [1, 4, 7, 10];
  if (kendras.includes(moonHouse) && kendras.includes(jupHouse)) {
    wealthYogas.push("Gaja Kesari Yoga: 달-목성 Kendra 배치 — 명성과 재물");
  }

  // 재물 주요 통로
  const h11SignTraits = SIGN_TRAITS[house11.sign];
  const primarySource = PLANET_SIGNIFICATIONS[house11Lord].careers.slice(0, 3).join(", ");

  // 절정 기간 힌트 (목성/금성 대운 시기)
  const jupMaha = chart.dashas.find(d => d.planet === "Jupiter");
  const venMaha = chart.dashas.find(d => d.planet === "Venus");
  const peakPeriods: string[] = [];
  if (jupMaha) peakPeriods.push(`목성 대운: ${jupMaha.startDate.getFullYear()}–${jupMaha.endDate.getFullYear()}`);
  if (venMaha) peakPeriods.push(`금성 대운: ${venMaha.startDate.getFullYear()}–${venMaha.endDate.getFullYear()}`);

  return {
    wealthScore: score,
    primarySource,
    house2Status: `${house2.sign} — ${house2Lord} 지배, 강도: ${h2Strength}`,
    house11Status: `${house11.sign} — ${house11Lord} 지배, 강도: ${h11Strength}`,
    jupiterInfluence: `목성 in ${jupiter.signName} (${jupiter.dignity}) — 강도 ${jupStrength}/100`,
    horaStrength,
    wealthYogas: wealthYogas.length > 0 ? wealthYogas : ["특별 재물 요가 없음 (꾸준한 노력으로 축적)"],
    peakWealthPeriods: peakPeriods,
    advice: score >= 70
      ? "재물 그릇이 크며 적극적인 투자와 확장 시도 권장"
      : score >= 50
      ? "안정적인 재물 흐름, 저축과 계획적 지출 중요"
      : "2하우스와 11하우스 강화 필요 — 기술 습득과 네트워크 확장에 집중",
  };
}

// ─── Module 3: 천직 ───────────────────────────────────────

/**
 * 3. 천직 분석 (Vocation/Career)
 *
 * - D-1 10하우스 및 지배 행성 분석
 * - D-10 Dasamsa 10하우스 분석
 * - 직업 요가 감지
 */
export function analyzeCareer(chart: BirthChartData): CareerResult {
  const house10 = chart.rasi.houses[9];
  const house10Lord = house10.lord;
  const house10Planets = house10.planets;

  // D-10 Dasamsa 10하우스 분석
  const lagnaSignIdx = signFromLongitude(chart.rasi.ascendant);
  // D-10에서 10번째 하우스는 Lagna에서 10번째 별자리
  const d10TenthSign = (lagnaSignIdx + 9) % 12;
  const d10TenthPlanets: PlanetName[] = [];
  for (const [planet, pos] of Object.entries(chart.varga.d10.planets) as [PlanetName, { sign: number }][]) {
    if (pos.sign === d10TenthSign) {
      d10TenthPlanets.push(planet);
    }
  }

  // 직업군 도출
  const primaryCareers = PLANET_SIGNIFICATIONS[house10Lord].careers.slice(0, 3);
  const secondaryCareers: string[] = [];

  // 10하우스 내 행성들의 직업군 추가
  for (const p of house10Planets) {
    PLANET_SIGNIFICATIONS[p].careers.slice(0, 2).forEach(c => {
      if (!primaryCareers.includes(c)) secondaryCareers.push(c);
    });
  }

  // D-10 강도 평가
  const d10Strength = d10TenthPlanets.length > 0
    ? `D-10 10하우스에 ${d10TenthPlanets.join(", ")} 위치 — 강한 직업 활성화`
    : "D-10 10하우스 비어 있음 — 지배 행성의 힘이 중요";

  // 직업 요가
  const careerYogas: string[] = [];
  // Raja Yoga: 1/4/7/10하우스 지배 행성 + 5/9하우스 지배 행성이 결합
  const house1Lord = chart.rasi.houses[0].lord;
  const house5Lord = chart.rasi.houses[4].lord;
  const house9Lord = chart.rasi.houses[8].lord;
  const h1LordHouse = ChartBuilder.getPlanetHouse(chart.rasi, house1Lord);
  const h9LordHouse = ChartBuilder.getPlanetHouse(chart.rasi, house9Lord);
  if (h1LordHouse === h9LordHouse) {
    careerYogas.push(`Raja Yoga: ${house1Lord}와 ${house9Lord}의 결합 — 탁월한 리더십`);
  }
  // Sun의 강세 = 리더십 경력
  if (chart.rasi.planets["Sun"].dignity === "Exalted" ||
      chart.rasi.planets["Sun"].dignity === "Own") {
    careerYogas.push("Surya Yoga: 태양 강세 — 정부·권위·리더십 분야 성공");
  }
  // Saturn 10하우스 위치
  if (house10Planets.includes("Saturn")) {
    careerYogas.push("Shasha Yoga: 토성 10하우스 — 꾸준한 노력으로 장기 성공");
  }

  // 최적 활동 시기 (10하우스 지배 행성 대운)
  const bestMaha = chart.dashas.find(d => d.planet === house10Lord);
  const bestPeriod = bestMaha
    ? `${house10Lord} 대운: ${bestMaha.startDate.getFullYear()}–${bestMaha.endDate.getFullYear()}`
    : "현재 진행 중인 대운 분석 필요";

  return {
    primaryCareer: primaryCareers,
    secondaryCareer: secondaryCareers.slice(0, 3),
    house10Lord,
    house10Planets,
    dasamsaStrength: d10Strength,
    careerYogas: careerYogas.length > 0 ? careerYogas : ["일반 직업 구조 — 꾸준함이 성공 열쇠"],
    bestPeriod,
    advice: `${house10Lord}의 카르마(${PLANET_SIGNIFICATIONS[house10Lord].karaka.slice(0,2).join(", ")})에 맞는 직업에서 최고의 성과 달성 가능`,
  };
}

// ─── Module 4: 차크라 에너지 ──────────────────────────────

/**
 * 4. 차크라 에너지 분석 (Chakra Energy)
 *
 * 7개 행성을 7개 차크라에 매핑하고,
 * 각 행성의 품위(dignity)와 위치를 기반으로
 * 차크라 활성화 수준을 0–100 점수로 수치화합니다.
 */
export function analyzeChakra(chart: BirthChartData): ChakraResult {
  const chakraNames: ChakraName[] = [
    "Muladhara", "Svadhisthana", "Manipura",
    "Anahata", "Vishuddha", "Ajna", "Sahasrara",
  ];

  const chakras: ChakraStatus[] = chakraNames.map((chakraName) => {
    const planet = CHAKRA_PLANET_MAP[chakraName];
    const strength = getPlanetStrength(chart, planet);
    const chakraInfo = CHAKRA_INFO[chakraName];

    let status: ChakraStatus["status"];
    if (strength >= 80) status = "Overactive";
    else if (strength >= 55) status = "Balanced";
    else if (strength >= 30) status = "Underactive";
    else status = "Blocked";

    // 행성 위치 기반 설명
    const planetPos = chart.rasi.planets[planet];
    const houseNum = ChartBuilder.getPlanetHouse(chart.rasi, planet);
    const description =
      status === "Overactive"
        ? `${chakraInfo.balancedTraits.join(", ")}이 과도하게 활성화. ${planet}(${planetPos.signName}, ${houseNum}H) 강세.`
        : status === "Blocked"
        ? `${chakraInfo.imbalancedTraits.join(", ")} 경향. ${planet}(${planetPos.signName}) 약화로 인한 차단.`
        : `${chakraInfo.balancedTraits.slice(0, 2).join(", ")} 방면에서 균형 잡힌 에너지 흐름.`;

    return {
      name: chakraName,
      planet,
      activationScore: strength,
      status,
      description,
    };
  });

  // 가장 활성화된/차단된 차크라
  const sorted = [...chakras].sort((a, b) => b.activationScore - a.activationScore);
  const dominantChakra = sorted[0].name;
  const blockedChakra = sorted[sorted.length - 1].name;

  // 전체 균형 점수
  const overallBalance = Math.round(
    chakras.reduce((sum, c) => sum + c.activationScore, 0) / chakras.length
  );

  // 치유 조언
  const healingAdvice: string[] = [
    `${blockedChakra} 차크라(${CHAKRA_INFO[blockedChakra].color}) 활성화 집중 권장`,
    `씨드 만트라 "${CHAKRA_INFO[blockedChakra].seed}" 명상 실천`,
    `${CHAKRA_PLANET_MAP[blockedChakra]}의 보석 착용: ${
      chart.rasi.planets[CHAKRA_PLANET_MAP[blockedChakra]].isRetrograde
        ? "역행 중이므로 주의하여 사용"
        : "착용 권장"
    }`,
  ];

  return { chakras, dominantChakra, blockedChakra, overallBalance, healingAdvice };
}

// ─── Module 5: 연애운 ─────────────────────────────────────

/**
 * 5. 연애운 분석 (Romance)
 *
 * - D-1 7하우스 분석 (배우자/파트너)
 * - 남성: 금성(Venus) 분석, 여성: 목성(Jupiter) 분석
 * - D-9 Navamsa 차트 분석
 */
export function analyzeRomance(
  chart: BirthChartData
): RomanceResult {
  const house7 = chart.rasi.houses[6];
  const house7Lord = house7.lord;
  const house7Sign = house7.sign;
  const gender = chart.input.gender;

  // 배우자 시그니피케이터: 남성=금성, 여성=목성
  const karaka: PlanetName = gender === "M" ? "Venus" : "Jupiter";
  const karakaPos = chart.rasi.planets[karaka];
  const karakaSign = karakaPos.signName;

  // 배우자 특성 (7하우스 별자리 + 배우자 카라카 별자리)
  const h7Traits = SIGN_TRAITS[house7Sign];
  const karakaTraits = SIGN_TRAITS[karakaSign];
  const partnerTraits = [
    ...h7Traits.traits.slice(0, 2),
    ...karakaTraits.traits.slice(0, 2),
    ...PLANET_SIGNIFICATIONS[house7Lord].karaka.slice(0, 1),
  ];

  // 연애 스타일
  const romanticStyle = `${h7Traits.element} 원소 에너지: ${h7Traits.keywords.join(", ")}을 통해 파트너를 끌어당김`;

  // 결혼 시기 힌트 (7하우스 지배 행성 또는 금성/목성 대운)
  const h7Maha = chart.dashas.find(d => d.planet === house7Lord);
  const karakaMaha = chart.dashas.find(d => d.planet === karaka);
  const marriageTiming =
    h7Maha
      ? `${house7Lord} 대운(${h7Maha.startDate.getFullYear()}–${h7Maha.endDate.getFullYear()}) 또는 ${karaka} 대운(${karakaMaha?.startDate.getFullYear() ?? "?"}–${karakaMaha?.endDate.getFullYear() ?? "?"}) 시기`
      : "대운 데이터 기반 계산 필요";

  // 도전 영역
  const challengeAreas: string[] = [];
  if (karakaPos.isRetrograde) {
    challengeAreas.push(`${karaka} 역행: 연애에서 과거 관계 패턴 반복 주의`);
  }
  if (karakaPos.dignity === "Debilitated") {
    challengeAreas.push(`${karaka} 약화: 이상적인 배우자 기준과 현실의 괴리`);
  }
  if (house7.planets.includes("Saturn")) {
    challengeAreas.push("토성의 7하우스 위치: 결혼 지연 또는 책임감 있는 파트너");
  }
  if (house7.planets.includes("Rahu") || house7.planets.includes("Ketu")) {
    challengeAreas.push("라후/케투의 7하우스 위치: 비전통적인 관계 패턴");
  }

  // D-9 Navamsa 통찰
  const navamsaVenusSign = chart.varga.d9.planets[karaka].signName;
  const navamsaInsight = `Navamsa에서 ${karaka} in ${navamsaVenusSign} — ${
    SIGN_TRAITS[navamsaVenusSign].traits.slice(0, 2).join(", ")
  }한 영혼적 파트너십`;

  return {
    house7Sign,
    house7Lord,
    venusOrJupiterSign: karakaSign,
    partnerTraits,
    romanticStyle,
    marriageTimingHint: marriageTiming,
    challengeAreas: challengeAreas.length > 0 ? challengeAreas : ["연애에서 큰 장애 없음"],
    navamsaInsight,
    advice: `${house7Lord}의 에너지(${SIGN_TRAITS[house7Sign].element} 원소)를 존중하는 파트너와의 관계가 영혼을 성장시킴`,
  };
}

// ─── Module 6: 궁합 ───────────────────────────────────────

/**
 * 6. 궁합 — Ashtakoot Milan (8항목, 36점 만점)
 *
 * 두 사람의 달의 낙샤트라를 비교하여 8가지 항목으로 점수를 계산합니다.
 *
 * 항목별 배점:
 * 1. Varna  (1pt)  — 정신적 수준의 호환성
 * 2. Vashya (2pt)  — 지배·통제 관계
 * 3. Tara   (3pt)  — 건강·운명의 호환성
 * 4. Yoni   (4pt)  — 성적·본능적 호환성
 * 5. Graha Maitri (5pt) — 정신적 조화
 * 6. Gana   (6pt)  — 기질 호환성
 * 7. Bhakoot(7pt)  — 사랑·재물·건강
 * 8. Nadi   (8pt)  — 유전·건강 호환성
 */
export function calcAshtakootMilan(
  nakshatra1: NakshatraInfo,
  nakshatra2: NakshatraInfo,
  person1Name?: string,
  person2Name?: string
): FullCompatibilityReport {
  const n1 = nakshatra1.name;
  const n2 = nakshatra2.name;
  const n1Idx = nakshatra1.index;
  const n2Idx = nakshatra2.index;

  const breakdown: AshtakootItem[] = [];

  // 1. Varna (1점)
  const v1 = NAKSHATRA_VARNA[n1];
  const v2 = NAKSHATRA_VARNA[n2];
  const varnaScore = v1 >= v2 ? 1 : 0;
  breakdown.push({
    name: "Varna (카스트 호환)",
    maxScore: 1,
    actualScore: varnaScore,
    description: varnaScore === 1
      ? "정신적 수준이 조화로움"
      : "정신적 성장 방향이 다름 (노력으로 극복 가능)",
  });

  // 2. Vashya (2점)
  const vashyaScore = calcVashya(n1Idx, n2Idx);
  breakdown.push({
    name: "Vashya (관계 역학)",
    maxScore: 2,
    actualScore: vashyaScore,
    description: vashyaScore >= 1.5
      ? "자연스러운 상호 끌림과 존중"
      : "관계에서 힘의 불균형 주의",
  });

  // 3. Tara (3점)
  const taraScore = calcTara(n1Idx, n2Idx);
  breakdown.push({
    name: "Tara (운명 호환)",
    maxScore: 3,
    actualScore: taraScore,
    description: taraScore >= 2
      ? "서로의 운명이 긍정적으로 작용"
      : "함께할 때 도전이 따를 수 있음",
  });

  // 4. Yoni (4점)
  const yoniScore = calcYoni(n1, n2);
  breakdown.push({
    name: "Yoni (본능 호환)",
    maxScore: 4,
    actualScore: yoniScore,
    description: yoniScore >= 3
      ? "깊은 본능적 연결과 친밀감"
      : "친밀감 형성에 시간과 노력 필요",
  });

  // 5. Graha Maitri (5점)
  const grahaMaitriScore = calcGrahaMaitri(n1, n2);
  breakdown.push({
    name: "Graha Maitri (정신 조화)",
    maxScore: 5,
    actualScore: grahaMaitriScore,
    description: grahaMaitriScore >= 4
      ? "자연스러운 정신적·지적 조화"
      : "서로의 관점 차이를 인정하는 노력 필요",
  });

  // 6. Gana (6점)
  const ganaScore = calcGana(n1, n2);
  breakdown.push({
    name: "Gana (기질 호환)",
    maxScore: 6,
    actualScore: ganaScore,
    description: ganaScore === 6
      ? "완벽한 기질 조화"
      : ganaScore >= 3
      ? "어느 정도의 기질 차이, 이해와 존중으로 극복"
      : "기질 차이가 크므로 의식적 노력 필요",
  });

  // 7. Bhakoot (7점)
  const bhakootScore = calcBhakoot(n1Idx, n2Idx);
  breakdown.push({
    name: "Bhakoot (관계 번영)",
    maxScore: 7,
    actualScore: bhakootScore,
    description: bhakootScore === 7
      ? "결혼 생활에 번영·건강·풍요가 따름"
      : "함께할 때 재물·건강 측면에서 주의 필요",
  });

  // 8. Nadi (8점)
  const nadiScore = calcNadi(n1, n2);
  breakdown.push({
    name: "Nadi (건강·유전 호환)",
    maxScore: 8,
    actualScore: nadiScore,
    description: nadiScore === 8
      ? "건강·유전적 호환성 우수"
      : "같은 Nadi는 건강 위험 — 의료 자문 권장",
  });

  // 총점
  const totalScore = breakdown.reduce((sum, item) => sum + item.actualScore, 0);
  const percentage = Math.round((totalScore / 36) * 100);

  // 강점 / 약점
  const strengths = breakdown
    .filter(b => b.actualScore / b.maxScore >= 0.7)
    .map(b => b.name);
  const challenges = breakdown
    .filter(b => b.actualScore / b.maxScore < 0.5)
    .map(b => b.name);

  // 종합 판정
  let verdict: string;
  if (totalScore >= 30) verdict = "최상의 궁합 ★★★★★ — 영혼의 짝";
  else if (totalScore >= 25) verdict = "매우 좋은 궁합 ★★★★ — 강력 권장";
  else if (totalScore >= 18) verdict = "좋은 궁합 ★★★ — 긍정적 관계";
  else if (totalScore >= 13) verdict = "보통 궁합 ★★ — 노력으로 성공적인 관계 가능";
  else verdict = "도전적인 궁합 ★ — 상호 이해와 헌신 필요";

  return {
    person1: { name: person1Name, moonNakshatra: n1 },
    person2: { name: person2Name, moonNakshatra: n2 },
    compatibility: {
      totalScore,
      percentage,
      verdict,
      breakdown,
      strengths,
      challenges,
      advice:
        totalScore >= 18
          ? "전반적으로 조화로운 파트너십. 약점 항목 인식만으로 충분"
          : "깊은 상호 이해와 소통 훈련이 관계의 핵심 열쇠",
    },
    generatedAt: new Date().toISOString(),
  };
}

// ─── Ashtakoot 개별 계산 함수 ─────────────────────────────

function calcVashya(n1Idx: number, n2Idx: number): number {
  // 간략 구현: 낙샤트라 인덱스 차이 기반
  const diff = Math.abs(n1Idx - n2Idx) % 27;
  if (diff === 0) return 2;
  if (diff <= 4 || diff >= 23) return 1;
  return 0.5;
}

function calcTara(n1Idx: number, n2Idx: number): number {
  // Tara: 상대 낙샤트라가 자신의 몇 번째인지 (1부터 9까지 반복)
  const tara1 = ((n2Idx - n1Idx + 27) % 27) % 9 + 1;
  const tara2 = ((n1Idx - n2Idx + 27) % 27) % 9 + 1;
  const auspicious = [1, 3, 5, 7];
  const s1 = auspicious.includes(tara1) ? 1.5 : 0;
  const s2 = auspicious.includes(tara2) ? 1.5 : 0;
  return Math.round(s1 + s2);
}

function calcYoni(n1: NakshatraName, n2: NakshatraName): number {
  const y1 = NAKSHATRA_YONI[n1];
  const y2 = NAKSHATRA_YONI[n2];
  if (y1 === y2) return 4;
  // 적대 쌍
  const hostile: [string, string][] = [
    ["Dog", "Deer"], ["Cat", "Rat"], ["Horse", "Buffalo"],
    ["Elephant", "Lion"], ["Goat", "Mongoose"], ["Cow", "Tiger"],
    ["Serpent", "Mongoose"],
  ];
  for (const [a, b] of hostile) {
    if ((y1 === a && y2 === b) || (y1 === b && y2 === a)) return 0;
  }
  return 2;
}

function calcGrahaMaitri(n1: NakshatraName, n2: NakshatraName): number {
  const lord1 = NAKSHATRAS_LORD_MAP[n1];
  const lord2 = NAKSHATRAS_LORD_MAP[n2];
  const rel1 = PLANET_FRIENDSHIP[lord1]?.[lord2] ?? "Neutral";
  const rel2 = PLANET_FRIENDSHIP[lord2]?.[lord1] ?? "Neutral";
  const scores: Record<string, number> = {
    "Friend-Friend": 5,
    "Friend-Neutral": 4,
    "Neutral-Friend": 4,
    "Neutral-Neutral": 3,
    "Friend-Enemy": 1,
    "Enemy-Friend": 1,
    "Enemy-Neutral": 0.5,
    "Neutral-Enemy": 0.5,
    "Enemy-Enemy": 0,
  };
  return scores[`${rel1}-${rel2}`] ?? 3;
}

function calcGana(n1: NakshatraName, n2: NakshatraName): number {
  const g1 = NAKSHATRA_GANA[n1];
  const g2 = NAKSHATRA_GANA[n2];
  if (g1 === g2) return 6;
  if (g1 === "Deva" && g2 === "Manushya") return 5;
  if (g1 === "Manushya" && g2 === "Deva") return 5;
  if (g1 === "Deva" && g2 === "Rakshasa") return 1;
  if (g1 === "Rakshasa" && g2 === "Deva") return 0;
  return 3;
}

function calcBhakoot(n1Idx: number, n2Idx: number): number {
  const sign1 = Math.floor(n1Idx / 2.25);
  const sign2 = Math.floor(n2Idx / 2.25);
  const diff = Math.abs(sign1 - sign2);
  // 불길한 각도: 6-8, 5-9, 12-2
  if ([6, 8, 5, 9].includes(diff + 1) || [6, 8, 5, 9].includes(12 - diff)) return 0;
  return 7;
}

function calcNadi(n1: NakshatraName, n2: NakshatraName): number {
  const nadi1 = NAKSHATRA_NADI[n1];
  const nadi2 = NAKSHATRA_NADI[n2];
  return nadi1 !== nadi2 ? 8 : 0; // 같은 Nadi면 0점 (건강 위험)
}

// 낙샤트라 → 지배 행성 맵 (calcGrahaMaitri용)
const NAKSHATRAS_LORD_MAP: Record<NakshatraName, PlanetName> = {
  "Ashwini": "Ketu", "Bharani": "Venus", "Krittika": "Sun",
  "Rohini": "Moon", "Mrigashira": "Mars", "Ardra": "Rahu",
  "Punarvasu": "Jupiter", "Pushya": "Saturn", "Ashlesha": "Mercury",
  "Magha": "Ketu", "Purva Phalguni": "Venus", "Uttara Phalguni": "Sun",
  "Hasta": "Moon", "Chitra": "Mars", "Swati": "Rahu",
  "Vishakha": "Jupiter", "Anuradha": "Saturn", "Jyeshtha": "Mercury",
  "Mula": "Ketu", "Purva Ashadha": "Venus", "Uttara Ashadha": "Sun",
  "Shravana": "Moon", "Dhanishtha": "Mars", "Shatabhisha": "Rahu",
  "Purva Bhadrapada": "Jupiter", "Uttara Bhadrapada": "Saturn", "Revati": "Mercury",
};

// ─── Module 7: 요가 추천 ──────────────────────────────────

/**
 * 7. 요가 추천 (Suitable Yoga Practice)
 *
 * - 가장 발달한 원소와 억압된 원소 계산
 * - 차크라 에너지 분석 결합
 * - 보완 요가 수련법 추천
 */
export function recommendYoga(
  chart: BirthChartData,
  chakraResult: ChakraResult
): YogaResult {
  const personality = analyzePersonality(chart);
  const elementBalance = personality.elementBalance;

  // 가장 강한/약한 원소
  const sortedElements = (Object.entries(elementBalance) as [Element, number][])
    .sort((a, b) => b[1] - a[1]);
  const dominantElement = sortedElements[0][0];
  const deficientElement = sortedElements[sortedElements.length - 1][0];

  // 가장 강한/약한 체제
  const sortedModality = (Object.entries(personality.modalityBalance) as ["Cardinal" | "Fixed" | "Mutable", number][])
    .sort((a, b) => b[1] - a[1]);
  const dominantModality = sortedModality[0][0];

  // 차단된 차크라를 위한 요가 선택
  const blockedChakra = chakraResult.blockedChakra;
  const blockedPlanetStrength = getPlanetStrength(chart, CHAKRA_PLANET_MAP[blockedChakra]);

  // 결핍 원소를 보완하는 요가 + 차단 차크라 치유 요가
  const suitableYogas = YOGA_PRACTICES.filter(y =>
    y.targetElement === deficientElement || y.targetChakra === blockedChakra
  );

  // 결핍 원소 보완 요가 선택
  const primaryYogaData = suitableYogas.find(y => y.targetElement === deficientElement)
    ?? YOGA_PRACTICES.find(y => y.targetElement === deficientElement)
    ?? YOGA_PRACTICES[0];

  // 차단 차크라 치유 요가 선택
  const secondaryYogaData = suitableYogas.find(
    y => y.targetChakra === blockedChakra && y !== primaryYogaData
  ) ?? YOGA_PRACTICES.find(y => y.targetChakra === blockedChakra)
    ?? YOGA_PRACTICES[1];

  // 상세 수련 목록 (3개)
  const practiceList: YogaPractice[] = [
    {
      name: primaryYogaData.name,
      type: primaryYogaData.type,
      chakraTarget: primaryYogaData.targetChakra,
      benefit: primaryYogaData.benefit,
      duration: primaryYogaData.duration,
    },
    {
      name: secondaryYogaData.name,
      type: secondaryYogaData.type,
      chakraTarget: secondaryYogaData.targetChakra,
      benefit: secondaryYogaData.benefit,
      duration: secondaryYogaData.duration,
    },
    // 호흡 수련 (Pranayama) 항상 추가
    {
      name: "Pranayama",
      type: "호흡",
      chakraTarget: "Vishuddha",
      benefit: "프라나 에너지 균형, 마음 정화",
      duration: "15분/일",
    },
  ];

  // 피해야 할 수련
  const avoidPractices: string[] = [];
  if (dominantElement === "Fire") avoidPractices.push("Bikram/Hot Yoga (열 원소 과잉 주의)");
  if (dominantElement === "Air") avoidPractices.push("과도한 Pranayama (바람 원소 과잉 주의)");
  if (blockedPlanetStrength < 30) avoidPractices.push("강도 높은 역전 자세 (약화된 에너지 보호)");

  // 최적 수련 시간 (태양 기반)
  const sunSign = chart.rasi.planets["Sun"].signName;
  const sunElement = SIGN_TRAITS[sunSign].element;
  const bestTime = sunElement === "Fire" ? "일출 직후 (브라마무후르타, 04:00–06:00)"
                 : sunElement === "Water" ? "황혼 무렵 (18:00–20:00)"
                 : sunElement === "Earth" ? "이른 아침 (06:00–08:00)"
                 : "정오 (11:00–13:00)";

  return {
    dominantElement,
    deficientElement,
    dominantModality,
    primaryYoga: primaryYogaData.name,
    secondaryYoga: secondaryYogaData.name,
    practices: practiceList,
    avoidPractices: avoidPractices.length > 0 ? avoidPractices : ["특별한 제한 없음"],
    bestPracticeTime: bestTime,
  };
}

// ─── 통합 분석 엔진 ───────────────────────────────────────

/**
 * DestinyEngine
 *
 * BirthChartData를 입력받아 7대 운명 분석 결과를
 * 단일 DestinyReport JSON으로 반환합니다.
 *
 * @example
 * ```typescript
 * const engine = new DestinyEngine();
 * const report = engine.generateReport(chartData);
 * console.log(JSON.stringify(report, null, 2));
 * ```
 */
export class DestinyEngine {
  /**
   * 7대 운명 분석 보고서를 생성합니다.
   */
  generateReport(chart: BirthChartData): DestinyReport {
    // 차크라 분석 (요가 추천에서 재사용)
    const chakraResult = analyzeChakra(chart);

    const currentMaha = chart.currentDasha.mahadasha;
    const currentAnta = chart.currentDasha.antardasha;

    return {
      meta: {
        name: chart.input.name,
        birthDatetime: chart.input.datetime.toISOString(),
        location: {
          lat: chart.input.latitude,
          lon: chart.input.longitude,
        },
        generatedAt: new Date().toISOString(),
        currentDasha: `${currentMaha.planet} MD / ${currentAnta.planet} AD (${currentAnta.startDate.toLocaleDateString("ko-KR")} ~ ${currentAnta.endDate.toLocaleDateString("ko-KR")})`,
      },
      personality: analyzePersonality(chart),
      wealth:       analyzeWealth(chart),
      career:       analyzeCareer(chart),
      chakra:       chakraResult,
      romance:      analyzeRomance(chart),
      yoga:         recommendYoga(chart, chakraResult),
    };
  }

  /**
   * 두 사람의 궁합 보고서를 생성합니다.
   */
  generateCompatibilityReport(
    chart1: BirthChartData,
    chart2: BirthChartData,
    person1Name?: string,
    person2Name?: string
  ): FullCompatibilityReport {
    return calcAshtakootMilan(
      chart1.nakshatra,
      chart2.nakshatra,
      person1Name ?? chart1.input.name,
      person2Name ?? chart2.input.name
    );
  }
}
