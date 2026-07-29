// AI 반려동물 궁합 — 두 청사진 → 결정론 궁합 점수.
// 순수 함수: 시각/난수 원천은 전부 호출자(라우트)가 주입한다.
// 사람 사주 궁합(합충형파)이 아니라 오행 상생상극 + 부족/과다 보완 축으로 판정한다.

import { ELEMENT_KEYS, HABITAT_TABLE, PET_ENGINE_VERSION, elementRelation, withJosa } from "./pet-elements.js";

const DIMENSIONS = Object.freeze([
  { key: "vitality", labelKo: "활력" },
  { key: "stability", labelKo: "안정" },
  { key: "communication", labelKo: "소통" },
  { key: "territory", labelKo: "영역 갈등", inverted: true },
  { key: "recovery", labelKo: "회복" },
]);

const GRADES = Object.freeze([
  [90, "천생연분"],
  [78, "아주 좋음"],
  [64, "좋음"],
  [50, "무난함"],
  [36, "조율 필요"],
  [0, "거리 두기 권장"],
]);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function starsOf(value) {
  return clamp(Math.round(value / 20 + 0.5), 1, 5);
}

function percentMap(blueprint) {
  const out = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const item of blueprint?.elements || []) {
    if (out[item.key] !== undefined) out[item.key] = Number(item.percent) || 0;
  }
  return out;
}

function gradeOf(score) {
  for (const [threshold, label] of GRADES) {
    if (score >= threshold) return label;
  }
  return GRADES[GRADES.length - 1][1];
}

/** A가 부족한 오행을 B가 얼마나 채워 주는가 (0~100) */
function complementScore(aPercent, aUseful, bPercent) {
  const supply = bPercent[aUseful] || 0;
  // 평균 20%를 기준으로, B가 그 오행을 많이 가질수록 보완력이 커진다.
  return clamp(Math.round((supply / 40) * 100), 0, 100);
}

/** 둘 다 과다한 오행이 겹치면 증폭 위험 (0~100, 높을수록 위험) */
function amplifyRisk(aPercent, bPercent, aExcess, bExcess) {
  if (aExcess !== bExcess) return clamp(Math.round((aPercent[aExcess] + bPercent[aExcess]) / 4 - 10), 0, 100);
  const combined = (aPercent[aExcess] + bPercent[bExcess]) / 2;
  return clamp(Math.round((combined - 20) * 3), 0, 100);
}

function buildDimensions(ctx) {
  const { aPercent, bPercent, aUseful, bUseful, relationAB, relationBA, risk } = ctx;
  const complementA = complementScore(aPercent, aUseful, bPercent);
  const complementB = complementScore(bPercent, bUseful, aPercent);
  const complement = Math.round((complementA + complementB) / 2);

  const generateBonus = (relationAB === "생" ? 14 : 0) + (relationBA === "생" ? 14 : 0);
  const controlPenalty = (relationAB === "극" ? 16 : 0) + (relationBA === "극" ? 16 : 0);
  const sameBonus = relationAB === "비화" ? 8 : 0;

  const fireSum = aPercent.화 + bPercent.화;
  const waterSum = aPercent.수 + bPercent.수;
  const earthSum = aPercent.토 + bPercent.토;
  const metalSum = aPercent.금 + bPercent.금;
  const woodSum = aPercent.목 + bPercent.목;

  const values = {
    vitality: clamp(Math.round(30 + fireSum * 0.6 + woodSum * 0.3 + generateBonus - risk * 0.15), 0, 100),
    stability: clamp(Math.round(34 + earthSum * 0.7 + waterSum * 0.25 + complement * 0.2 - controlPenalty), 0, 100),
    communication: clamp(Math.round(30 + metalSum * 0.5 + fireSum * 0.35 + generateBonus + sameBonus - controlPenalty * 0.5), 0, 100),
    territory: clamp(Math.round(18 + risk * 0.5 + controlPenalty * 1.2 + metalSum * 0.25 - complement * 0.15), 0, 100),
    recovery: clamp(Math.round(30 + waterSum * 0.6 + earthSum * 0.25 + complement * 0.25 - risk * 0.2), 0, 100),
  };

  return DIMENSIONS.map((def) => ({
    key: def.key,
    labelKo: def.labelKo,
    inverted: def.inverted === true,
    value: values[def.key],
    stars: starsOf(def.inverted ? 100 - values[def.key] : values[def.key]),
  }));
}

/** 두 아이의 부족 오행을 동시에 채워 주는 장소 상위 3곳 */
function buildSharedPlaces(aSpecies, bSpecies, aUseful, bUseful, aExcess, bExcess) {
  const scored = HABITAT_TABLE
    .filter((item) => !item.species || (item.species.includes(aSpecies) && item.species.includes(bSpecies)))
    .map((item) => {
      let score = 45;
      for (const element of item.supplies) {
        if (element === aUseful) score += 22;
        if (element === bUseful) score += 22;
      }
      for (const element of item.soothes) {
        if (element === aExcess) score += 14;
        if (element === bExcess) score += 14;
      }
      return { ...item, score: clamp(Math.round(score), 0, 100) };
    })
    .sort((x, y) => (y.score - x.score) || x.id.localeCompare(y.id));

  return scored.slice(0, 3).map((item) => ({
    id: item.id,
    labelKo: item.labelKo,
    category: item.category,
    score: item.score,
    stars: starsOf(item.score),
  }));
}

function buildNotes(ctx, a, b) {
  const { relationAB, relationBA, risk, aUseful, bUseful, aExcess, bExcess } = ctx;
  const nameA = a.name || "첫째";
  const nameB = b.name || "둘째";
  const notes = [];

  if (relationAB === "생" || relationBA === "생") {
    const leader = relationAB === "생" ? nameA : nameB;
    notes.push(`한쪽의 기운이 다른 쪽을 밀어 주는 상생 구조입니다. ${withJosa(leader, "이", "가")} 먼저 분위기를 만들면 나머지가 자연스럽게 따라옵니다.`);
  }
  if (relationAB === "극" || relationBA === "극") {
    notes.push(`서로의 기운이 눌리는 상극 지점이 있습니다. 밥그릇·잠자리·화장실을 각자 따로 두면 마찰이 크게 줄어듭니다.`);
  }
  if (relationAB === "비화") {
    notes.push(`두 아이의 중심 기운이 같습니다. 취향이 잘 맞는 대신 같은 자원을 동시에 원할 수 있습니다.`);
  }
  if (risk >= 55) {
    notes.push(`둘 다 ${aExcess === bExcess ? aExcess : `${aExcess}·${bExcess}`}기운이 강해 함께 있으면 서로를 증폭시킵니다. 활동 뒤에는 반드시 각자의 휴식 시간을 만들어 주세요.`);
  }
  notes.push(`${nameA}에게는 ${aUseful}, ${nameB}에게는 ${withJosa(bUseful, "이", "가")} 부족합니다. 두 기운을 함께 채워 주는 환경이 이 관계의 핵심입니다.`);
  return notes;
}

/**
 * @param {object} blueprintA buildPetBlueprint() 결과 (읽기 전용)
 * @param {object} blueprintB buildPetBlueprint() 결과 (읽기 전용)
 */
export function buildPetCompat(blueprintA, blueprintB) {
  if (!blueprintA?.elements?.length || !blueprintB?.elements?.length) {
    const error = new Error("EMPTY_BLUEPRINT");
    error.code = "INVALID_INPUT";
    throw error;
  }

  const aPercent = percentMap(blueprintA);
  const bPercent = percentMap(blueprintB);
  const aUseful = blueprintA.balance.usefulElement;
  const bUseful = blueprintB.balance.usefulElement;
  const aExcess = blueprintA.balance.excessElement;
  const bExcess = blueprintB.balance.excessElement;

  const relationAB = elementRelation(aExcess, bExcess);
  const relationBA = elementRelation(bExcess, aExcess);
  const risk = amplifyRisk(aPercent, bPercent, aExcess, bExcess);
  const complement = Math.round(
    (complementScore(aPercent, aUseful, bPercent) + complementScore(bPercent, bUseful, aPercent)) / 2,
  );

  const ctx = { aPercent, bPercent, aUseful, bUseful, aExcess, bExcess, relationAB, relationBA, risk };
  const dimensions = buildDimensions(ctx);

  let score = 0;
  for (const dim of dimensions) score += dim.inverted ? 100 - dim.value : dim.value;
  score = clamp(Math.round(score / dimensions.length), 0, 100);

  return {
    version: PET_ENGINE_VERSION,
    score,
    grade: gradeOf(score),
    dimensions,
    complement,
    amplifyRisk: risk,
    elementRelation: { aToB: relationAB, bToA: relationBA },
    pets: [
      { name: blueprintA.name || "", species: blueprintA.species, usefulElement: aUseful, excessElement: aExcess },
      { name: blueprintB.name || "", species: blueprintB.species, usefulElement: bUseful, excessElement: bExcess },
    ],
    sharedPlaces: buildSharedPlaces(blueprintA.species.key, blueprintB.species.key, aUseful, bUseful, aExcess, bExcess),
    notes: buildNotes(ctx, blueprintA, blueprintB),
    elementTotals: ELEMENT_KEYS.map((key) => ({ key, a: aPercent[key], b: bPercent[key] })),
  };
}
