// 운명의 섬 — Layer 1(명반) → Layer 2(섬 청사진) 결정론 변환 오케스트레이터.
// 순수 함수: 시각/난수 원천은 전부 호출자(라우트)가 주입한다.

import {
  ISLAND_VERSION,
  SEASONS,
  scorePalace,
  tierFor,
  resolveBiome,
  pickWeather,
  fnv1a32,
  hashSignature,
} from "./island-weights.js";
import { buildResonance } from "./island-resonance.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function findLifePalace(chart) {
  return (chart.palaces || []).find((palace) => palace.name === "명궁") || null;
}

function currentMajorLuckFor(chart, age) {
  if (!Number.isFinite(age) || age <= 0) return null;
  const rows = (chart.majorLuck || [])
    .filter((row) => Number.isFinite(row?.startAge))
    .slice()
    .sort((a, b) => a.startAge - b.startAge);
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (age >= row.startAge && age <= row.endAge) {
      return { palaceName: row.palaceName, range: row.range, index: i, direction: row.direction };
    }
  }
  return null;
}

/**
 * chart: calculateZiweiAiChart() 결과 — 읽기 전용(변형 금지)
 * options:
 *   userKey: 프로필 식별 해시 문자열(생년월일시|성별|달력 기반, 라우트 산출)
 *   date: "YYYY-MM-DD" (KST, 라우트 산출 — 결정론 경계)
 *   currentYear: 유년/나이 기준 연도 (라우트 산출)
 *   birthYear: 출생 연도(양력 입력 기준)
 */
export function buildIslandBlueprint(chart, options = {}) {
  const { userKey = "", date = "", currentYear = 0, birthYear = 0 } = options;
  const palaces = Array.isArray(chart?.palaces) ? chart.palaces : [];
  if (palaces.length === 0) {
    const error = new Error("EMPTY_CHART");
    error.code = "INVALID_INPUT";
    throw error;
  }

  // 1) 궁 기본 점수
  const baseScores = {};
  const scoreDetails = {};
  for (const palace of palaces) {
    const scored = scorePalace(palace);
    baseScores[palace.name] = scored.base;
    scoreDetails[palace.name] = scored.detail;
  }

  // 2) 공명 (base 점수만 입력으로 사용 — 1-pass)
  const resonance = buildResonance(chart, baseScores);

  // 3) 바이옴 — 명궁 주성 → 오행국 → 폴백
  const lifePalace = findLifePalace(chart);
  const biome = resolveBiome(lifePalace?.mainStars || [], chart?.bureau?.number);

  // 4) 계절 — 현재 대운 인덱스 % 4 (한국식 나이: currentYear - birthYear + 1)
  const age = Number(currentYear) - Number(birthYear) + 1;
  const currentMajorLuck = currentMajorLuckFor(chart, age);
  const season = currentMajorLuck
    ? SEASONS[currentMajorLuck.index % 4]
    : SEASONS[Number(chart?.bureau?.number || 0) % 4] || SEASONS[0];

  // 5) 날씨 — 명궁 삼방사정의 사화/살성 압력이 가중치를 움직이는 결정론 추첨
  const lifeTriad = chart?.sanFangSiZheng?.byPalace?.["명궁"] || {};
  const triadNames = Array.isArray(lifeTriad.palaceNames) ? lifeTriad.palaceNames : ["명궁"];
  const triadTransforms = Array.isArray(lifeTriad.transformations) ? lifeTriad.transformations : [];
  const maleficPressure = palaces
    .filter((palace) => triadNames.includes(palace.name))
    .reduce((sum, palace) => sum + (palace.maleficStars || []).length, 0);
  const weather = pickWeather({
    seed: fnv1a32(`${userKey}|${date}`),
    jiPressure: triadTransforms.some((entry) => String(entry).startsWith("화기")),
    luBoost: triadTransforms.some((entry) => String(entry).startsWith("화록")),
    maleficPressure,
  });

  // 6) 궁 상태 조립
  const outputPalaces = palaces.map((palace) => {
    const baseScore = baseScores[palace.name];
    const resonanceBonus = resonance.bonusByPalace[palace.name] || 0;
    const score = clamp(baseScore + resonanceBonus, 0, 100);
    const tier = tierFor(score);
    return {
      name: palace.name,
      earthlyBranch: palace.earthlyBranch,
      branchIndex: palace.branchIndex,
      baseScore,
      resonanceBonus,
      score,
      tier: tier.tier,
      tierLabel: tier.label,
      mainStars: [...(palace.mainStars || [])],
      assistantStars: [...(palace.assistantStars || [])],
      maleficStars: [...(palace.maleficStars || [])],
      brightness: { ...(palace.brightness || {}) },
      transformations: [...(palace.transformations || [])],
      majorLuckRange: palace.majorLuck?.range || "",
      scoreDetail: scoreDetails[palace.name],
    };
  });

  // 7) 서명 — 명반 핵심부(게임 상태와 무관)만으로 산출
  const signature = hashSignature({
    palaces: palaces.map((palace) => ({
      name: palace.name,
      earthlyBranch: palace.earthlyBranch,
      mainStars: palace.mainStars,
      assistantStars: palace.assistantStars,
      maleficStars: palace.maleficStars,
      transformations: palace.transformations,
      brightness: palace.brightness,
    })),
    fourTransformations: chart.fourTransformations || {},
    bureau: chart.bureau || {},
    bodyPalace: chart.bodyPalace || "",
  });

  return {
    version: ISLAND_VERSION,
    signature,
    biome,
    season,
    weather,
    palaces: outputPalaces,
    edges: resonance.edges,
    markers: {
      lifePalace: "명궁",
      bodyPalace: chart.bodyPalace || "",
      currentMajorLuck: currentMajorLuck
        ? { palaceName: currentMajorLuck.palaceName, range: currentMajorLuck.range }
        : null,
      yearlyLuckPalace: chart?.yearlyLuck?.palaceName || "",
      yearlyLuckYear: chart?.yearlyLuck?.year || null,
    },
    fourTransformations: chart.fourTransformations || {},
    bureau: chart.bureau || null,
    uncertainty: chart.uncertainty || null,
    generatedFor: { date, year: Number(currentYear) || null },
  };
}
