// 소리오행(발음오행) — 한글 초성을 오행으로 읽고 이름의 소리 흐름이 상생인지 판정한다.
//
// 이 레포에는 지금까지 소리오행 "표"만 있었고(worker/routes/naming-prompt.js 의 SOUND_FIVE_ELEMENTS,
// 프롬프트에 문자열로 나열만 함) 초성 추출·역매핑·상생 판정이 전혀 없었다. 무료 초안이 소리 흐름을
// 보려면 계산이 필요해 여기로 정본을 옮긴다.
//
// 🔴 배속 정본 = 작명 실무설: 木 ㄱㅋ / 火 ㄴㄷㄹㅌ / 土 ㅇㅎ / 金 ㅅㅈㅊ / 水 ㅁㅂㅍ
//    훈민정음 해례본 원전은 순음(ㅁㅂㅍ)=土, 후음(ㅇㅎ)=水로 土·水가 반대다. 국내 작명 실무는
//    위 배속을 쓰고 기존 프롬프트도 이미 이 값이라 실무설로 통일했다. 되돌리지 말 것.

import { GENERATE_TO, CONTROL_TO, ELEMENT_LABELS_KO } from "./saju-yongshin-policy.js";

export const SOUND_FIVE_ELEMENTS = Object.freeze({
  木: ["ㄱ", "ㅋ"],
  火: ["ㄴ", "ㄷ", "ㄹ", "ㅌ"],
  土: ["ㅇ", "ㅎ"],
  金: ["ㅅ", "ㅈ", "ㅊ"],
  水: ["ㅁ", "ㅂ", "ㅍ"],
});

const HANJA_TO_ELEMENT_KEY = Object.freeze({
  木: "wood",
  火: "fire",
  土: "earth",
  金: "metal",
  水: "water",
});

/** 유니코드 한글 음절의 초성 19자 순서(U+AC00 기준). */
const INITIAL_CONSONANTS = Object.freeze([
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
]);

/** 된소리는 예사소리와 같은 오행으로 본다(ㄲ→ㄱ, ㅆ→ㅅ …). */
const TENSE_TO_PLAIN = Object.freeze({ ㄲ: "ㄱ", ㄸ: "ㄷ", ㅃ: "ㅂ", ㅆ: "ㅅ", ㅉ: "ㅈ" });

const ELEMENT_BY_CONSONANT = Object.freeze(
  Object.entries(SOUND_FIVE_ELEMENTS).reduce((acc, [hanja, consonants]) => {
    consonants.forEach((consonant) => { acc[consonant] = HANJA_TO_ELEMENT_KEY[hanja]; });
    return acc;
  }, {}),
);

const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;
const INITIAL_BLOCK = 588; // 21 중성 × 28 종성

/** 한글 음절 한 글자 → 초성. 한글이 아니면 "". */
export function getInitialConsonant(syllable) {
  const char = String(syllable || "").charAt(0);
  if (!char) return "";
  const code = char.charCodeAt(0);
  if (code < HANGUL_BASE || code > HANGUL_LAST) return "";
  return INITIAL_CONSONANTS[Math.floor((code - HANGUL_BASE) / INITIAL_BLOCK)] || "";
}

/** 한글 음절 한 글자 → 오행 키("wood"…). 판별 불가면 "". */
export function soundElementOf(syllable) {
  const initial = getInitialConsonant(syllable);
  if (!initial) return "";
  return ELEMENT_BY_CONSONANT[TENSE_TO_PLAIN[initial] || initial] || "";
}

/** 두 오행의 관계. 이름 소리 흐름 판정에 쓰는 최소 집합. */
export function elementRelation(from, to) {
  if (!from || !to) return "unknown";
  if (from === to) return "same";
  if (GENERATE_TO[from] === to) return "generates";
  if (GENERATE_TO[to] === from) return "generated_by";
  if (CONTROL_TO[from] === to) return "controls";
  if (CONTROL_TO[to] === from) return "controlled_by";
  return "unrelated";
}

/**
 * 성씨부터 이름 끝까지의 초성 오행 흐름을 본다.
 *
 * @param {string} fullName 성씨를 포함한 전체 이름(예: "김서윤")
 * @returns {{
 *   syllables: string[], elements: string[], relations: string[],
 *   harmonious: boolean, clashCount: number, label: string,
 * }}
 */
export function analyzeSoundFlow(fullName) {
  const syllables = Array.from(String(fullName || "")).filter((char) => /^[가-힣]$/.test(char));
  const elements = syllables.map(soundElementOf);
  const relations = [];
  let clashCount = 0;
  for (let index = 1; index < elements.length; index += 1) {
    const relation = elementRelation(elements[index - 1], elements[index]);
    relations.push(relation);
    if (relation === "controls" || relation === "controlled_by") clashCount += 1;
  }
  const readable = elements.every(Boolean) && elements.length > 1;
  const label = readable
    ? `${elements.map((element) => ELEMENT_LABELS_KO[element] || element).join("→")} ${
      clashCount === 0 ? "상생 흐름" : `상극 ${clashCount}곳`
    }`
    : "소리오행 판별 불가";
  return {
    syllables,
    elements,
    relations,
    harmonious: readable && clashCount === 0,
    clashCount,
    label,
  };
}

/** 프롬프트에 넣을 배속 목록. worker/routes/naming-prompt.js 가 이 함수를 쓴다. */
export function soundFiveElementsList() {
  return Object.entries(SOUND_FIVE_ELEMENTS)
    .map(([element, initials]) => `- ${element}: ${initials.join(", ")}`)
    .join("\n");
}
