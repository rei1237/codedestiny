// 운명의 섬 — Layer 2 가중치/상수 단일 정본.
// 이 모듈의 모든 함수는 순수 함수여야 한다: Date.now()/Math.random()/네트워크 금지.
// (동일 명반 + 동일 날짜 입력 → 항상 동일 출력. 검증: scripts/verify-ziwei-island-blueprint.mjs)

export const ISLAND_VERSION = "island-v1";

export const PALACE_NAMES = ["명궁", "형제궁", "부부궁", "자녀궁", "재백궁", "질액궁", "천이궁", "노복궁", "관록궁", "전택궁", "복덕궁", "부모궁"];

// 궁 강도 점수 구성 요소 (0~100 클램프)
export const BASE_SCORE = 30;
export const MAIN_STAR_SCORE = 10;
export const BRIGHTNESS_SCORE = { 묘: 8, 득: 5, 리: 2, 평: 0, 함: -6 };
export const ASSIST_SCORE_DEFAULT = 4;
export const ASSIST_SCORE_OVERRIDES = { 함지: 1, 천요: 1 }; // 도화성은 소폭만 가점
export const MALEFIC_SCORE = -7;
export const TRANSFORM_SCORE = { 화록: 12, 화권: 9, 화과: 7, 화기: -12 };

// 점수 → 건물 단계 (내림차순 우선 일치)
export const TIER_THRESHOLDS = [
  [85, 5],
  [65, 4],
  [45, 3],
  [25, 2],
  [0, 1],
];
export const TIER_LABELS = { 1: "폐허", 2: "오두막", 3: "저택", 4: "궁전", 5: "신전" };

// 바이옴 — 명궁 주성 우선 일치 체인(위에서부터 첫 일치, 상호 배타).
// 14주성 전부가 정확히 한 규칙에만 속한다.
export const BIOME_RULES = [
  { id: "volcano", label: "화산의 섬", mood: "격정과 변혁", stars: ["칠살", "파군"] },
  { id: "citadel", label: "왕좌의 고원", mood: "위엄과 포용", stars: ["자미", "천부"] },
  { id: "goldenCliff", label: "황금 절벽의 섬", mood: "풍요와 추진", stars: ["태양", "무곡"] },
  { id: "moonLake", label: "달빛 호수의 섬", mood: "고요와 정화", stars: ["태음", "천동"] },
  { id: "forest", label: "지혜의 숲", mood: "생동과 성장", stars: ["천기", "천량", "천상"] },
  { id: "mistIsle", label: "홍염 안개의 섬", mood: "내면과 비밀", stars: ["탐랑", "거문", "염정"] },
];

// 명궁 공궁(주성 없음) 폴백: 오행국 번호 → 바이옴 (2수/3목/4금/5토/6화)
export const BIOME_BY_BUREAU = { 2: "moonLake", 3: "forest", 4: "goldenCliff", 5: "citadel", 6: "volcano" };
export const FALLBACK_BIOME_ID = "forest";

// 계절: 현재 대운 인덱스 % 4 (대운 미확정 시 오행국 번호 % 4)
export const SEASONS = ["봄", "여름", "가을", "겨울"];

// 날씨 — 결정론 시드 가중 추첨 테이블(랜덤 금지, 시드=fnv1a32(userKey|KST날짜))
export const WEATHER_TABLE = [
  { id: "clear", label: "맑음", w: 28 },
  { id: "breeze", label: "미풍", w: 18 },
  { id: "starfall", label: "별비", w: 10 },
  { id: "mist", label: "안개", w: 12 },
  { id: "rain", label: "비", w: 14 },
  { id: "storm", label: "폭풍", w: 8 },
  { id: "aurora", label: "오로라", w: 10 },
];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function parseTransformLabel(entry) {
  // Layer 1 포맷 "화록:탐랑" → "화록"
  const idx = String(entry || "").indexOf(":");
  return idx > 0 ? String(entry).slice(0, idx) : String(entry || "");
}

/** 궁 하나의 기본 강도(0~100)와 산출 내역. Layer 1 palace 객체를 읽기 전용으로만 사용한다. */
export function scorePalace(palace) {
  const mainStars = Array.isArray(palace?.mainStars) ? palace.mainStars : [];
  const assistantStars = Array.isArray(palace?.assistantStars) ? palace.assistantStars : [];
  const maleficStars = Array.isArray(palace?.maleficStars) ? palace.maleficStars : [];
  const transformations = Array.isArray(palace?.transformations) ? palace.transformations : [];
  const brightness = palace?.brightness && typeof palace.brightness === "object" ? palace.brightness : {};

  const starScore = mainStars.length * MAIN_STAR_SCORE;
  let brightnessScore = 0;
  for (const star of mainStars) {
    const level = brightness[star];
    if (level && Object.prototype.hasOwnProperty.call(BRIGHTNESS_SCORE, level)) {
      brightnessScore += BRIGHTNESS_SCORE[level];
    }
  }
  let assistScore = 0;
  for (const star of assistantStars) {
    assistScore += Object.prototype.hasOwnProperty.call(ASSIST_SCORE_OVERRIDES, star)
      ? ASSIST_SCORE_OVERRIDES[star]
      : ASSIST_SCORE_DEFAULT;
  }
  const maleficScore = maleficStars.length * MALEFIC_SCORE;
  let sihuaScore = 0;
  for (const entry of transformations) {
    const label = parseTransformLabel(entry);
    if (Object.prototype.hasOwnProperty.call(TRANSFORM_SCORE, label)) sihuaScore += TRANSFORM_SCORE[label];
  }

  const base = clamp(BASE_SCORE + starScore + brightnessScore + assistScore + maleficScore + sihuaScore, 0, 100);
  return {
    base,
    detail: { starScore, brightnessScore, assistScore, maleficScore, sihuaScore },
  };
}

/** 점수 → {tier, label} (5단계) */
export function tierFor(score) {
  for (const [threshold, tier] of TIER_THRESHOLDS) {
    if (score >= threshold) return { tier, label: TIER_LABELS[tier] };
  }
  return { tier: 1, label: TIER_LABELS[1] };
}

/** 명궁 주성 + 오행국으로 바이옴 결정 (상호 배타, 항상 정확히 하나) */
export function resolveBiome(lifePalaceMainStars, bureauNumber) {
  const stars = Array.isArray(lifePalaceMainStars) ? lifePalaceMainStars : [];
  for (const rule of BIOME_RULES) {
    if (rule.stars.some((star) => stars.includes(star))) {
      return { id: rule.id, label: rule.label, mood: rule.mood, source: "star" };
    }
  }
  const byBureau = BIOME_BY_BUREAU[Number(bureauNumber)];
  if (byBureau) {
    const rule = BIOME_RULES.find((item) => item.id === byBureau);
    if (rule) return { id: rule.id, label: rule.label, mood: rule.mood, source: "bureau" };
  }
  const fallback = BIOME_RULES.find((item) => item.id === FALLBACK_BIOME_ID) || BIOME_RULES[0];
  return { id: fallback.id, label: fallback.label, mood: fallback.mood, source: "fallback" };
}

/**
 * 결정론 날씨 추첨.
 * seed: 32비트 정수(fnv1a32(userKey|date)).
 * jiPressure: 명궁 삼방사정에 화기 유입 여부, luBoost: 화록 유입 여부, maleficPressure: 삼방사정 살성 총수.
 */
export function pickWeather({ seed, jiPressure = false, luBoost = false, maleficPressure = 0 }) {
  const table = WEATHER_TABLE.map((item) => ({ ...item }));
  const shift = (id, delta) => {
    const row = table.find((item) => item.id === id);
    if (row) row.w = Math.max(2, row.w + delta);
  };
  if (jiPressure) {
    shift("storm", 8);
    shift("mist", 6);
    shift("clear", -8);
  }
  if (Number(maleficPressure) >= 3) {
    shift("rain", 6);
    shift("clear", -4);
  }
  if (luBoost) {
    shift("aurora", 6);
    shift("starfall", 4);
  }
  const total = table.reduce((sum, item) => sum + item.w, 0);
  let cursor = (Number(seed) >>> 0) % total;
  for (const item of table) {
    cursor -= item.w;
    if (cursor < 0) return { id: item.id, label: item.label };
  }
  return { id: table[0].id, label: table[0].label };
}

/** FNV-1a 32비트 해시 (결정론 시드/서명용) */
export function fnv1a32(text) {
  let hash = 0x811c9dc5;
  const str = String(text ?? "");
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** 키 정렬 JSON 직렬화 — 객체 키 순서와 무관하게 동일 문자열 보장 */
export function canonicalStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalStringify(item)).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalStringify(value[key])}`).join(",")}}`;
}

/** 명반 핵심부의 결정론 서명(캐시 무효화 키) */
export function hashSignature(chartCore) {
  return fnv1a32(canonicalStringify(chartCore)).toString(16).padStart(8, "0");
}
