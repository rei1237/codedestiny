// AI 반려동물 사주 — 프로필 + 출생 명식 → 결정론 청사진 변환.
// 순수 함수: 시각/난수 원천은 전부 호출자(라우트)가 주입한다.
// (동일 프로필 + 동일 날짜 → 항상 동일 출력)

import { fnv1a32 } from "../island/island-weights.js";
import {
  ACTIVITY_LEVELS,
  COACH_BY_ELEMENT,
  COMPANION_TABLE,
  DAILY_SLOTS,
  ELEMENT_KEYS,
  ENVIRONMENT_TABLE,
  HABITAT_TABLE,
  LIFE_STAGES,
  METRIC_DEFS,
  METRIC_ELEMENT_WEIGHTS,
  PET_ENGINE_VERSION,
  PLAY_BY_ELEMENT,
  TRAIT_TABLE,
  elementRelation,
  getBreed,
  getSpecies,
  normalizeRatio,
  resolveLifeStage,
  withJosa,
} from "./pet-elements.js";

// 오행 합성 가중치 — 합계 1.0
const BLEND_WEIGHTS = Object.freeze({
  species: 0.35,
  breed: 0.15,
  natal: 0.30,
  stage: 0.10,
  environment: 0.06,
  companion: 0.04,
});

const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const STEM_ELEMENT = ["목", "목", "화", "화", "토", "토", "금", "금", "수", "수"];

const DAILY_RELATION_DELTA = Object.freeze({ 생: 1, 비화: 0, 설기: -1, 극: -1, 재: 0, none: 0 });

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function starsOf(value) {
  // 0~100 → 1~5별 (0점도 최소 1별을 주어 UI가 비지 않게 한다)
  return clamp(Math.round(value / 20 + 0.5), 1, 5);
}

function parseYmd(text) {
  const match = String(text || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function julianDay(year, month, day) {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5;
}

/** "YYYY-MM-DD" → 그 날의 일진 간지/오행 (lock-screen-daily-fortune.ts와 동일 알고리즘) */
export function dayGanjiOf(dateText) {
  const ymd = parseYmd(dateText);
  if (!ymd) return { ganji: "", element: "" };
  const jd = julianDay(ymd.y, ymd.m, ymd.d);
  const idx = (((Math.floor(jd + 0.5) + 49) % 60) + 60) % 60;
  return { ganji: STEMS[idx % 10] + BRANCHES[idx % 12], element: STEM_ELEMENT[idx % 10] };
}

/** 두 "YYYY-MM-DD" 사이의 나이(년, 소수) */
export function ageYearsBetween(birthDate, todayDate) {
  const birth = parseYmd(birthDate);
  const today = parseYmd(todayDate);
  if (!birth || !today) return 0;
  const days = julianDay(today.y, today.m, today.d) - julianDay(birth.y, birth.m, birth.d);
  return Math.max(0, days / 365.2425);
}

function blend(parts) {
  const total = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  let weightSum = 0;
  for (const part of parts) {
    if (!part || !part.ratio || !(part.weight > 0)) continue;
    const ratio = normalizeRatio(part.ratio);
    let hasValue = false;
    for (const key of ELEMENT_KEYS) {
      if (ratio[key] > 0) hasValue = true;
    }
    if (!hasValue) continue;
    for (const key of ELEMENT_KEYS) total[key] += ratio[key] * part.weight;
    weightSum += part.weight;
  }
  if (weightSum <= 0) return { 목: 20, 화: 20, 토: 20, 금: 20, 수: 20 };
  for (const key of ELEMENT_KEYS) total[key] = total[key] / weightSum;
  return total;
}

function pickExtreme(percent, mode) {
  let best = ELEMENT_KEYS[0];
  for (const key of ELEMENT_KEYS) {
    if (mode === "max" ? percent[key] > percent[best] : percent[key] < percent[best]) best = key;
  }
  return best;
}

function buildMetrics(percent, input) {
  const activityDelta = (ACTIVITY_LEVELS[input.activityLevel] || ACTIVITY_LEVELS.medium).delta;
  const traitDelta = {};
  for (const trait of input.traits) {
    const def = TRAIT_TABLE[trait];
    if (!def) continue;
    for (const [metric, value] of Object.entries(def.delta)) {
      traitDelta[metric] = (traitDelta[metric] || 0) + value;
    }
  }

  const stageBonus = { baby: { play: 10, sleep: -6, stress: 6 }, adult: {}, senior: { sleep: 12, activity: -14, stress: -6 } };
  const stageDelta = stageBonus[input.stage] || {};

  return METRIC_DEFS.map((def) => {
    const weights = METRIC_ELEMENT_WEIGHTS[def.key] || {};
    // 균등 분포(각 20%)를 50점 기준으로 두고, 편차만 가중해 더한다.
    // 절대값을 그대로 곱하면 어떤 프로필이든 90점대로 포화된다.
    let raw = 50;
    for (const key of ELEMENT_KEYS) raw += ((percent[key] || 0) - 20) * (weights[key] || 0);
    if (def.key === "activity") raw += activityDelta;
    raw += traitDelta[def.key] || 0;
    raw += stageDelta[def.key] || 0;
    const value = clamp(Math.round(raw), 0, 100);
    return {
      key: def.key,
      labelKo: def.labelKo,
      emoji: def.emoji,
      inverted: def.inverted === true,
      value,
      stars: starsOf(value),
    };
  });
}

function buildTree(percent) {
  // 오행 비율(0~100)을 0~5단계로 환산. 20%가 평균이므로 40% 이상이면 만개다.
  const step = (value) => clamp(Math.round((value / 40) * 5), 0, 5);
  return {
    leaves: step(percent.목),
    blossoms: step(percent.화),
    trunk: step(percent.토),
    fruits: step(percent.금),
    pond: step(percent.수),
  };
}

const DAILY_COPY = Object.freeze({
  treat: [
    "익숙한 간식이 가장 반가운 날입니다.",
    "평소 먹던 것보다 조금 작게 나눠 주면 더 좋아합니다.",
    "간식 시간을 평소와 같게 지키면 만족도가 높습니다.",
    "새로운 간식을 조금만 시험해 볼 만한 날입니다.",
    "새로운 맛에 크게 반응할 가능성이 큽니다.",
  ],
  play: [
    "짧고 굵게 끝내는 놀이가 맞습니다.",
    "익숙한 장난감 하나로 충분한 날입니다.",
    "놀이 시간을 두 번으로 나누면 반응이 좋습니다.",
    "공놀이보다 탐험 놀이가 더 즐거울 수 있습니다.",
    "새로운 놀이를 제안하기 가장 좋은 날입니다.",
  ],
  nap: [
    "잠자리가 조금 불편할 수 있으니 자리를 정돈해 주세요.",
    "낮잠이 짧게 끊길 수 있습니다. 소음을 줄여 주세요.",
    "평소만큼의 휴식이면 충분합니다.",
    "길게 자고 나면 컨디션이 확 올라옵니다.",
    "푹 쉬는 시간이 오늘의 행복을 가장 크게 올려 줍니다.",
  ],
  affection: [
    "혼자 있고 싶어 할 수 있으니 먼저 다가가지 마세요.",
    "부르면 오지만 오래 머물지는 않는 날입니다.",
    "곁에 앉아 있는 것만으로 충분합니다.",
    "먼저 다가와 몸을 붙일 가능성이 큽니다.",
    "보호자에게 먼저 다가와 교감하려는 행동을 보일 가능성이 큽니다.",
  ],
  walk: [
    "짧은 코스로 바꾸는 편이 좋습니다.",
    "익숙한 길을 그대로 도는 것이 안전합니다.",
    "평소 코스에 5분만 더해 보세요.",
    "새로운 골목 하나를 더해도 잘 따라옵니다.",
    "낯선 길을 탐험하기에 가장 좋은 날입니다.",
  ],
  rest: [
    "자극이 많으면 쉽게 지칩니다. 조용한 하루로 만들어 주세요.",
    "중간중간 쉬는 시간을 끼워 주세요.",
    "평소의 리듬을 그대로 지키면 됩니다.",
    "쉬는 시간이 회복으로 잘 이어집니다.",
    "충분히 쉬게 두면 내일 컨디션이 확 좋아집니다.",
  ],
});

function buildDaily(petKey, date, usefulElement, todayElement) {
  const relation = elementRelation(todayElement, usefulElement);
  const delta = DAILY_RELATION_DELTA[relation] ?? 0;
  return DAILY_SLOTS.map((slot) => {
    const seed = fnv1a32(`${petKey}|${date}|${slot.key}`);
    const base = (seed % 5) + 1;
    const stars = clamp(base + delta, 1, 5);
    const pool = DAILY_COPY[slot.key] || [];
    return {
      key: slot.key,
      labelKo: slot.labelKo,
      emoji: slot.emoji,
      stars,
      text: pool[stars - 1] || "",
    };
  });
}

function buildHabitats(percent, speciesKey, usefulElement, excessElement, todayElement) {
  const scored = HABITAT_TABLE
    .filter((item) => !item.species || item.species.includes(speciesKey))
    .map((item) => {
      // 부족/과다가 심할수록 보정 폭이 커지도록 편차에 비례시키고, 가장 잘 맞는 기운 하나를 주점수로 삼는다.
      // 단순 합으로 두면 오행이 여러 개 붙은 장소가 정확히 들어맞는 단일 장소를 항상 이긴다.
      const supplyScores = item.supplies.map((element) => {
        const base = element === usefulElement
          ? 18 + (20 - (percent[usefulElement] || 0))
          : Math.max(0, 18 - (percent[element] || 0) * 0.5);
        return base + (element === todayElement ? 6 : 0);
      });
      const sootheScores = item.soothes.map((element) => (
        element === excessElement
          ? 8 + ((percent[excessElement] || 0) - 20) * 0.55
          : Math.max(0, (percent[element] || 0) - 20) * 0.4
      ));
      const best = (list) => (list.length ? Math.max(...list) : 0);
      const extra = (list) => list.reduce((sum, value) => sum + value, 0) - best(list);
      const score = 50
        + best(supplyScores) + best(sootheScores)
        + (extra(supplyScores) + extra(sootheScores)) * 0.25;
      return { ...item, score: clamp(Math.round(score), 0, 100) };
    })
    .sort((a, b) => (b.score - a.score) || a.id.localeCompare(b.id));

  return scored.slice(0, 5).map((item) => ({
    id: item.id,
    labelKo: item.labelKo,
    category: item.category,
    score: item.score,
    stars: starsOf(item.score),
    supplies: item.supplies,
    soothes: item.soothes,
  }));
}

function buildSummary(input, species, breed, usefulElement, excessElement, stage) {
  const name = input.name || "우리 아이";
  const stageLabel = LIFE_STAGES[stage]?.labelKo || "성체";
  const speciesElement = Object.keys(species.ratio)[0];
  const paragraphs = [
    `${withJosa(name, "은", "는")} ${species.labelKo}의 ${speciesElement}기운을 바탕으로 태어났습니다. ${species.intro}`,
    breed && breed.ratio
      ? `${breed.labelKo} 기질이 더해져 ${breed.note}`
      : `품종 보정 없이 ${species.labelKo}의 기본 기질이 그대로 드러납니다.`,
    `현재 기운은 ${withJosa(excessElement, "이", "가")} 가장 강하고 ${withJosa(usefulElement, "이", "가")} 가장 부족합니다. 부족한 ${withJosa(usefulElement, "을", "를")} 채워 주는 환경과 놀이가 컨디션을 가장 크게 끌어올립니다.`,
    `성장 단계는 ${stageLabel}이며, 이 시기에는 ${stage === "baby" ? "새로운 자극에 대한 호기심이 크고 안정감은 아직 자라는 중" : stage === "senior" ? "휴식과 정서적 안정이 활동량보다 중요" : "활동과 휴식의 균형이 가장 잘 맞는 시기"}입니다.`,
  ];
  return {
    headline: `${withJosa(excessElement, "이", "가")} 강하고 ${withJosa(usefulElement, "이", "가")} 부족한 ${species.labelKo}`,
    paragraphs,
  };
}

/**
 * @param {object} input 정규화된 프로필
 *   { name, species, breed, birthDate, birthTime, birthTimeUnknown, gender, neutered,
 *     activityLevel, traits[], environment, companion }
 * @param {object} saju calculateLifeBookAiSaju() 결과 (읽기 전용)
 * @param {object} options { date: "YYYY-MM-DD"(KST), petKey: string }
 */
export function buildPetBlueprint(input, saju, options = {}) {
  const species = getSpecies(input.species);
  if (!species) {
    const error = new Error("UNKNOWN_SPECIES");
    error.code = "INVALID_INPUT";
    throw error;
  }
  const breed = getBreed(input.species, input.breed);
  const date = String(options.date || "");
  const petKey = String(options.petKey || "");

  const ageYears = ageYearsBetween(input.birthDate, date);
  const stage = resolveLifeStage(input.species, ageYears);
  const environment = ENVIRONMENT_TABLE[input.environment] || ENVIRONMENT_TABLE.balanced;
  const companion = COMPANION_TABLE[input.companion] || COMPANION_TABLE.alone;

  const percent = blend([
    { ratio: species.ratio, weight: BLEND_WEIGHTS.species },
    { ratio: breed?.ratio, weight: BLEND_WEIGHTS.breed },
    { ratio: saju?.fiveElements, weight: BLEND_WEIGHTS.natal },
    { ratio: LIFE_STAGES[stage]?.ratio, weight: BLEND_WEIGHTS.stage },
    { ratio: environment.ratio, weight: BLEND_WEIGHTS.environment },
    { ratio: companion.ratio, weight: BLEND_WEIGHTS.companion },
  ]);

  const excessElement = pickExtreme(percent, "max");
  const usefulElement = pickExtreme(percent, "min");
  const today = dayGanjiOf(date);

  const elements = ELEMENT_KEYS.map((key) => ({
    key,
    percent: round1(percent[key]),
    stars: clamp(Math.round(percent[key] / 8), 1, 5),
  }));

  const metrics = buildMetrics(percent, { ...input, stage });
  const coach = COACH_BY_ELEMENT[usefulElement] || null;

  return {
    version: PET_ENGINE_VERSION,
    petKey,
    date,
    name: input.name || "",
    species: { key: input.species, labelKo: species.labelKo, emoji: species.emoji, themeId: species.themeId, themeLabel: species.themeLabel, effect: species.effect, keywords: species.keywords },
    breed: breed ? { key: input.breed, labelKo: breed.labelKo, note: breed.note } : null,
    stage: { key: stage, labelKo: LIFE_STAGES[stage]?.labelKo || "", ageYears: round1(ageYears) },
    environment: { key: input.environment, labelKo: environment.labelKo, companionKey: input.companion, companionLabelKo: companion.labelKo },
    natal: {
      pillars: {
        year: saju?.yearPillar || "",
        month: saju?.monthPillar || "",
        day: saju?.dayPillar || "",
        hour: saju?.hourPillar || "",
      },
      dayMaster: saju?.dayMaster || "",
      timeUnknown: input.birthTimeUnknown === true,
      fiveElements: saju?.fiveElements || null,
    },
    elements,
    balance: { excessElement, usefulElement },
    today: { date, ganji: today.ganji, element: today.element, relation: elementRelation(today.element, usefulElement) },
    metrics,
    tree: buildTree(percent),
    daily: buildDaily(petKey, date, usefulElement, today.element),
    summary: buildSummary(input, species, breed, usefulElement, excessElement, stage),
    deep: {
      habitats: buildHabitats(percent, input.species, usefulElement, excessElement, today.element),
      plays: (PLAY_BY_ELEMENT[usefulElement] || []).map((label) => ({ labelKo: label, forElement: usefulElement })),
      coach,
      care: {
        focusElement: usefulElement,
        cautionElement: excessElement,
        stageKey: stage,
      },
    },
  };
}
