// AI 반려동물 사주 — 종/품종/성장단계/생활환경 오행 상수 단일 정본.
// 이 모듈에는 순수 데이터와 순수 함수만 둔다: Date.now()/Math.random()/네트워크 금지.
// (동일 입력 → 항상 동일 출력. 검증: scripts/verify-pet-saju-determinism.mjs)

export const PET_ENGINE_VERSION = "pet-v1";

export const ELEMENT_KEYS = Object.freeze(["목", "화", "토", "금", "수"]);

// 오행 상생(生): 목→화→토→금→수→목
export const ELEMENT_GENERATES = Object.freeze({ 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" });
// 오행 상극(剋): 목→토→수→화→금→목
export const ELEMENT_CONTROLS = Object.freeze({ 목: "토", 토: "수", 수: "화", 화: "금", 금: "목" });

/**
 * 종(種)의 타고난 기운 — 평생 변하지 않는 축.
 * ratio 합계는 항상 100.
 */
export const SPECIES_TABLE = Object.freeze({
  dog: {
    labelKo: "강아지",
    emoji: "🐶",
    ratio: { 화: 100 },
    keywords: ["활동성", "충성심", "사회성", "열정", "보호본능"],
    themeId: "sunset",
    themeLabel: "노을과 불꽃",
    effect: "flame",
    intro: "따뜻한 화기운을 타고났습니다. 사람과 교감하려는 욕구가 강하고 에너지가 풍부한 타입입니다.",
  },
  cat: {
    labelKo: "고양이",
    emoji: "🐱",
    ratio: { 목: 100 },
    keywords: ["성장", "독립", "호기심", "직감", "유연함"],
    themeId: "forest",
    themeLabel: "신비로운 숲",
    effect: "leaf",
    intro: "목기운은 새로운 것을 탐색하고 자신의 영역을 넓히려는 힘을 뜻합니다.",
  },
  turtle: {
    labelKo: "거북이",
    emoji: "🐢",
    ratio: { 수: 60, 토: 40 },
    keywords: ["안정", "장수", "회복", "인내"],
    themeId: "pond",
    themeLabel: "고요한 연못",
    effect: "ripple",
    intro: "천천히 성장하지만 오래도록 균형을 유지하는 기운입니다.",
  },
  fish: {
    labelKo: "물고기",
    emoji: "🐠",
    ratio: { 수: 100 },
    keywords: ["감각", "치유", "유연성", "환경 적응"],
    themeId: "ocean",
    themeLabel: "깊은 바다",
    effect: "wave",
    intro: "물처럼 주변에 스며드는 기운입니다. 환경이 곧 이 아이의 컨디션입니다.",
  },
  // 새와 앵무새는 오행(금 100)·키워드가 사실상 같아 한 종으로 묶는다.
  bird: {
    labelKo: "새 · 앵무새",
    emoji: "🦜",
    ratio: { 금: 100 },
    keywords: ["질서", "학습", "소통", "모방", "유대"],
    themeId: "sky",
    themeLabel: "높은 하늘",
    effect: "cloud",
    intro: "금기운은 규칙과 리듬을 만드는 힘입니다. 반복되는 일과에서 안정을 얻고, 보호자의 말과 리듬을 그대로 흡수합니다.",
  },
  rabbit: {
    labelKo: "토끼",
    emoji: "🐰",
    ratio: { 목: 60, 수: 40 },
    keywords: ["공감", "온순", "민감", "섬세함"],
    themeId: "meadow",
    themeLabel: "달빛 초원",
    effect: "petal",
    intro: "목과 수가 함께 흐르는 기운이라 주변 감정을 그대로 받아들입니다.",
  },
  hamster: {
    labelKo: "햄스터",
    emoji: "🐹",
    ratio: { 수: 100 },
    keywords: ["은신", "저장", "야행성", "생존", "민감함"],
    themeId: "burrow",
    themeLabel: "포근한 굴",
    effect: "seed",
    intro: "수기운이 강한 아이는 주변 환경을 세심하게 살피며 자신만의 안전한 공간을 중요하게 여깁니다.",
  },
  mouse: {
    labelKo: "쥐",
    emoji: "🐭",
    ratio: { 수: 100 },
    keywords: ["지혜", "순발력", "생존력", "탐색", "적응"],
    themeId: "burrow",
    themeLabel: "포근한 굴",
    effect: "seed",
    intro: "작은 변화도 빠르게 감지하는 민감한 기운을 가지고 있습니다.",
  },
  hedgehog: {
    labelKo: "고슴도치",
    emoji: "🦔",
    ratio: { 금: 55, 토: 45 },
    keywords: ["방어", "경계", "고요", "자기영역"],
    themeId: "dune",
    themeLabel: "달빛 언덕",
    effect: "spark",
    intro: "금과 토가 함께라 스스로를 지키는 힘이 강합니다. 신뢰가 쌓이기까지 시간이 필요합니다.",
  },
  lizard: {
    labelKo: "도마뱀",
    emoji: "🦎",
    ratio: { 화: 55, 토: 45 },
    keywords: ["체온", "정지", "응시", "일광"],
    themeId: "dune",
    themeLabel: "온기 어린 바위",
    effect: "spark",
    intro: "화와 토의 기운이라 온도와 자리가 컨디션을 좌우합니다.",
  },
});

export const SPECIES_KEYS = Object.freeze(Object.keys(SPECIES_TABLE));

/**
 * 품종 기질 보정 — 같은 종이라도 품종마다 기운이 다르다.
 * ratio 합계는 항상 100. 목록에 없는 품종은 GENERIC_BREED_KEY 로 폴백해 종 기본값을 그대로 쓴다.
 */
export const GENERIC_BREED_KEY = "generic";

export const BREED_TABLE = Object.freeze({
  dog: Object.freeze({
    generic: { labelKo: "일반 / 모름", ratio: null, note: "종의 기본 기운을 그대로 따릅니다." },
    golden_retriever: { labelKo: "골든리트리버", ratio: { 화: 60, 토: 20, 목: 20 }, note: "친화력이 높고 사람을 먼저 찾습니다." },
    shiba: { labelKo: "시바견", ratio: { 화: 45, 금: 35, 목: 20 }, note: "독립성이 강해 거리를 스스로 정합니다." },
    bichon: { labelKo: "비숑", ratio: { 화: 55, 목: 25, 토: 20 }, note: "애교가 많고 표현이 직접적입니다." },
    maltese: { labelKo: "말티즈", ratio: { 화: 50, 수: 30, 목: 20 }, note: "보호자와의 거리가 짧을수록 안정됩니다." },
    poodle: { labelKo: "푸들", ratio: { 화: 45, 목: 35, 금: 20 }, note: "학습이 빠르고 새로운 규칙을 즐깁니다." },
    jindo: { labelKo: "진돗개", ratio: { 화: 40, 금: 40, 토: 20 }, note: "영역과 신뢰의 경계가 뚜렷합니다." },
    welsh_corgi: { labelKo: "웰시코기", ratio: { 화: 55, 토: 30, 금: 15 }, note: "몰이 본능이 남아 움직임에 목적이 있습니다." },
    pomeranian: { labelKo: "포메라니안", ratio: { 화: 60, 목: 25, 금: 15 }, note: "경계심이 소리로 먼저 나옵니다." },
    chihuahua: { labelKo: "치와와", ratio: { 화: 50, 수: 35, 금: 15 }, note: "체온과 안정감에 예민합니다." },
    dachshund: { labelKo: "닥스훈트", ratio: { 화: 45, 토: 35, 목: 20 }, note: "냄새를 따라가는 탐색 욕구가 큽니다." },
    border_collie: { labelKo: "보더콜리", ratio: { 화: 40, 목: 35, 금: 25 }, note: "할 일이 있어야 마음이 놓입니다." },
    mixed: { labelKo: "믹스견", ratio: { 화: 55, 토: 25, 목: 20 }, note: "환경 적응력이 넓게 열려 있습니다." },
  }),
  cat: Object.freeze({
    generic: { labelKo: "일반 / 모름", ratio: null, note: "종의 기본 기운을 그대로 따릅니다." },
    korean_shorthair: { labelKo: "코리안숏헤어", ratio: { 목: 55, 금: 25, 수: 20 }, note: "환경 변화에 스스로 답을 찾습니다." },
    russian_blue: { labelKo: "러시안블루", ratio: { 목: 45, 금: 40, 수: 15 }, note: "차분하고 소리에 민감합니다." },
    bengal: { labelKo: "벵갈", ratio: { 화: 45, 목: 40, 금: 15 }, note: "활동량이 크고 사냥 놀이를 즐깁니다." },
    ragdoll: { labelKo: "랙돌", ratio: { 수: 45, 목: 35, 토: 20 }, note: "평온하고 안기는 것을 좋아합니다." },
    scottish_fold: { labelKo: "스코티시폴드", ratio: { 토: 40, 목: 40, 수: 20 }, note: "자리를 정하면 오래 머뭅니다." },
    persian: { labelKo: "페르시안", ratio: { 토: 45, 수: 35, 목: 20 }, note: "느린 리듬과 조용한 공간을 선호합니다." },
    siamese: { labelKo: "샴", ratio: { 화: 40, 목: 35, 금: 25 }, note: "말이 많고 보호자를 계속 부릅니다." },
    munchkin: { labelKo: "먼치킨", ratio: { 목: 50, 토: 30, 화: 20 }, note: "낮은 시야에서 세상을 탐색합니다." },
    norwegian_forest: { labelKo: "노르웨이숲", ratio: { 목: 45, 금: 30, 토: 25 }, note: "높은 곳과 넓은 시야를 원합니다." },
    mixed: { labelKo: "믹스묘", ratio: { 목: 55, 수: 25, 금: 20 }, note: "성향의 폭이 넓어 환경이 성격을 만듭니다." },
  }),
});

/** 성장 단계 — 나이(년) 경계는 종별 수명 차이를 반영한다. */
export const LIFE_STAGES = Object.freeze({
  baby: { labelKo: "새끼", ratio: { 목: 60, 화: 40 }, traitDelta: { 호기심: 40, 안정: -20 } },
  adult: { labelKo: "성체", ratio: { 목: 20, 화: 20, 토: 20, 금: 20, 수: 20 }, traitDelta: {} },
  senior: { labelKo: "노령", ratio: { 토: 45, 수: 35, 금: 20 }, traitDelta: { 휴식: 30, 체력: -25, 정서안정: 20 } },
});

/** 종별 (새끼 상한, 노령 하한) 나이 — 단위: 년 */
export const LIFE_STAGE_BOUNDS = Object.freeze({
  dog: [1, 8],
  cat: [1, 10],
  turtle: [5, 30],
  fish: [1, 4],
  bird: [2, 12],
  rabbit: [1, 6],
  hamster: [0.5, 2],
  mouse: [0.4, 1.6],
  hedgehog: [0.6, 4],
  lizard: [1, 8],
});

/** 생활환경 보정 */
export const ENVIRONMENT_TABLE = Object.freeze({
  indoor: { labelKo: "주로 실내", ratio: { 수: 60, 토: 40 } },
  outdoor: { labelKo: "야외 활동 많음", ratio: { 화: 60, 목: 40 } },
  balanced: { labelKo: "실내·야외 반반", ratio: { 목: 25, 화: 25, 토: 25, 수: 25 } },
});

export const COMPANION_TABLE = Object.freeze({
  alone: { labelKo: "혼자 지냄", ratio: { 토: 70, 수: 30 } },
  multi: { labelKo: "다른 반려동물과 함께", ratio: { 금: 70, 화: 30 } },
});

/** 활동량 — 지표 보정에만 쓰고 오행에는 개입하지 않는다. */
export const ACTIVITY_LEVELS = Object.freeze({
  low: { labelKo: "낮음", delta: -12 },
  medium: { labelKo: "보통", delta: 0 },
  high: { labelKo: "높음", delta: 14 },
});

/** 성격 체크 항목 — 8지표에 직접 가산한다. */
export const TRAIT_TABLE = Object.freeze({
  affectionate: { labelKo: "애교 많음", delta: { affection: 14, bond: 8 } },
  timid: { labelKo: "겁이 많음", delta: { stress: 12, activity: -8, bond: -4 } },
  curious: { labelKo: "호기심", delta: { play: 12, activity: 8 } },
  foodie: { labelKo: "먹보", delta: { appetite: 16, happiness: 4 } },
  napper: { labelKo: "낮잠", delta: { sleep: 16, activity: -6 } },
  walker: { labelKo: "산책", delta: { activity: 14, happiness: 6 } },
  ballPlay: { labelKo: "공놀이", delta: { play: 14, activity: 8 } },
  soloPlay: { labelKo: "혼자 놀기", delta: { play: 8, bond: -6, stress: -4 } },
  huntPlay: { labelKo: "사냥놀이", delta: { play: 12, activity: 10, stress: -4 } },
  swimmer: { labelKo: "수영", delta: { activity: 12, happiness: 6 } },
});

/** 8지표 정의 — 순서가 곧 UI 표시 순서다. */
export const METRIC_DEFS = Object.freeze([
  { key: "happiness", labelKo: "행복", emoji: "❤️" },
  { key: "appetite", labelKo: "식욕", emoji: "🍖" },
  { key: "sleep", labelKo: "수면", emoji: "😴" },
  { key: "play", labelKo: "놀이", emoji: "🎾" },
  { key: "affection", labelKo: "애교", emoji: "🧸" },
  { key: "stress", labelKo: "스트레스", emoji: "🌈", inverted: true },
  { key: "activity", labelKo: "활동성", emoji: "🏃" },
  { key: "bond", labelKo: "교감", emoji: "🤝" },
]);

/**
 * 지표별 오행 기여 가중치. 값은 "해당 오행 비율(0~100) × 가중치" 로 누적된다.
 * 합이 1에 가깝도록 맞춰 두어 지표가 0~100 범위 안에 자연스럽게 들어온다.
 */
export const METRIC_ELEMENT_WEIGHTS = Object.freeze({
  happiness: { 목: 0.9, 화: 1.1, 토: 0.9, 금: 0.7, 수: 0.8 },
  appetite: { 목: 0.8, 화: 1.2, 토: 1.1, 금: 0.6, 수: 0.7 },
  sleep: { 목: 0.5, 화: 0.4, 토: 1.2, 금: 0.8, 수: 1.4 },
  play: { 목: 1.3, 화: 1.3, 토: 0.5, 금: 0.7, 수: 0.6 },
  affection: { 목: 0.8, 화: 1.4, 토: 0.9, 금: 0.5, 수: 0.7 },
  stress: { 목: 0.9, 화: 1.0, 토: 0.4, 금: 1.1, 수: 1.2 },
  activity: { 목: 1.1, 화: 1.4, 토: 0.6, 금: 0.7, 수: 0.5 },
  bond: { 목: 0.7, 화: 1.3, 토: 1.0, 금: 1.0, 수: 0.6 },
});

/** 오늘의 운세 6종 */
export const DAILY_SLOTS = Object.freeze([
  { key: "treat", labelKo: "간식운", emoji: "🍖" },
  { key: "play", labelKo: "놀이운", emoji: "🎾" },
  { key: "nap", labelKo: "낮잠운", emoji: "😴" },
  { key: "affection", labelKo: "애교운", emoji: "❤️" },
  { key: "walk", labelKo: "바깥 활동운", emoji: "🐾" },
  { key: "rest", labelKo: "휴식운", emoji: "🌙" },
]);

/**
 * 행복 환경 후보 — 각 장소가 채워 주는 오행(supplies)과 과다할 때 눌러 주는 오행(soothes).
 * 종 제한(species)이 있으면 해당 종에만 노출한다.
 */
export const HABITAT_TABLE = Object.freeze([
  { id: "sunnyWindow", labelKo: "햇살이 드는 창가", supplies: ["화"], soothes: ["수"], category: "활력" },
  { id: "hideHouse", labelKo: "숨숨집 / 아늑한 굴", supplies: ["토"], soothes: ["목", "금"], category: "안정" },
  { id: "highPerch", labelKo: "높은 관찰 자리", supplies: ["목"], soothes: ["토"], category: "탐색", species: ["cat", "bird"] },
  { id: "quietBed", labelKo: "조용한 잠자리", supplies: ["수"], soothes: ["화"], category: "휴식" },
  { id: "waterSound", labelKo: "물소리 나는 자리", supplies: ["수"], soothes: ["화"], category: "회복" },
  { id: "windowWatch", labelKo: "창밖이 보이는 자리", supplies: ["목"], soothes: ["금"], category: "호기심" },
  { id: "warmBlanket", labelKo: "따뜻한 담요 위", supplies: ["화", "토"], soothes: ["수"], category: "체온" },
  { id: "openFloor", labelKo: "넓게 트인 바닥", supplies: ["화"], soothes: ["토"], category: "운동" },
  { id: "gardenWalk", labelKo: "풀 냄새 나는 산책로", supplies: ["목", "화"], soothes: ["금"], category: "산책", species: ["dog", "rabbit"] },
  { id: "routineCorner", labelKo: "정해진 식사·놀이 코너", supplies: ["금"], soothes: ["목"], category: "규칙" },
  { id: "shadedRock", labelKo: "그늘진 은신 바위", supplies: ["토", "금"], soothes: ["화"], category: "은신" },
]);

/** 오행별 놀이 추천 — 부족한 오행을 채우는 방향으로 제시한다. */
export const PLAY_BY_ELEMENT = Object.freeze({
  목: ["탐험 놀이", "숨바꼭질", "새 장난감 소개"],
  화: ["공놀이", "달리기", "점프 놀이"],
  토: ["편안한 휴식 루틴", "같은 시간 식사", "느린 브러싱"],
  금: ["퍼즐 장난감", "학습 놀이", "이름 부르기 훈련"],
  수: ["노즈워크", "후각 놀이", "조용한 탐색"],
});

/** 행복 코치 문구 — 부족 오행 기준 */
export const COACH_BY_ELEMENT = Object.freeze({
  목: { action: "오늘은 새 장난감을 평소 자리 근처에 살짝 두세요.", metric: "play", delta: 10 },
  화: { action: "오늘은 15분 정도 햇살 아래에서 함께 쉬어 보세요.", metric: "happiness", delta: 8 },
  토: { action: "오늘은 식사와 잠자리 시간을 어제와 똑같이 맞춰 주세요.", metric: "stress", delta: -8 },
  금: { action: "오늘은 이름을 부르고 반응하면 바로 보상해 주세요.", metric: "bond", delta: 8 },
  수: { action: "오늘은 물그릇을 새로 갈고 조용한 시간을 10분 만들어 주세요.", metric: "stress", delta: -6 },
});

/** 오행 → 나무 파츠 매핑 (운명의 나무 SVG 렌더용) */
export const TREE_PART_BY_ELEMENT = Object.freeze({
  목: "leaves",
  화: "blossoms",
  토: "trunk",
  금: "fruits",
  수: "pond",
});

export function normalizeRatio(ratio) {
  const out = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  if (!ratio || typeof ratio !== "object") return out;
  let total = 0;
  for (const key of ELEMENT_KEYS) {
    const value = Number(ratio[key]);
    if (Number.isFinite(value) && value > 0) {
      out[key] = value;
      total += value;
    }
  }
  if (total <= 0) return out;
  for (const key of ELEMENT_KEYS) out[key] = (out[key] / total) * 100;
  return out;
}

export function getSpecies(speciesKey) {
  return SPECIES_TABLE[String(speciesKey || "")] || null;
}

export function getBreed(speciesKey, breedKey) {
  const table = BREED_TABLE[String(speciesKey || "")];
  if (!table) return null;
  return table[String(breedKey || "")] || table[GENERIC_BREED_KEY] || null;
}

/** 나이(년, 소수 허용) → 성장 단계 키 */
export function resolveLifeStage(speciesKey, ageYears) {
  const bounds = LIFE_STAGE_BOUNDS[String(speciesKey || "")] || [1, 8];
  const age = Number(ageYears);
  if (!Number.isFinite(age) || age < 0) return "adult";
  if (age <= bounds[0]) return "baby";
  if (age >= bounds[1]) return "senior";
  return "adult";
}

/** 받침 유무에 따른 한국어 조사 선택 ("콩이가" vs "누리는") */
export function josa(word, withBatchim, withoutBatchim) {
  const text = String(word || "").trim();
  const last = text.charCodeAt(text.length - 1);
  if (!Number.isFinite(last) || last < 0xac00 || last > 0xd7a3) return withoutBatchim;
  return (last - 0xac00) % 28 > 0 ? withBatchim : withoutBatchim;
}

export function withJosa(word, withBatchim, withoutBatchim) {
  return `${word}${josa(word, withBatchim, withoutBatchim)}`;
}

export function elementRelation(from, to) {
  if (!from || !to) return "none";
  if (from === to) return "비화";
  if (ELEMENT_GENERATES[from] === to) return "생";
  if (ELEMENT_CONTROLS[from] === to) return "극";
  if (ELEMENT_GENERATES[to] === from) return "설기";
  if (ELEMENT_CONTROLS[to] === from) return "재";
  return "none";
}
