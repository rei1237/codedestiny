// 소리오행(설계서 §6.5). 초성 기준, 쌍자음은 평음, 모음 초성은 ㅇ. 표기 발음(두음 적용형) 그대로 읽는다.
// modern(운해본·실무설): ㅇㅎ=土 · ㅁㅂㅍ=水 / hunminjeongeum(해례 제자해): 후음 ㅇㅎ=水 · 순음 ㅁㅂㅍ=土.
// ㄹ 은 두 배속 모두 설음(火)에 붙인다. v1 정본 worker/lib/naming-sound-elements.js 의 실무설과 같은 표다.

import type { SoundMapping } from "./config/school-presets";
import { SOUND } from "./config/weights";
import { relationOf, type Element, type Relation } from "./types";

const INITIALS = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const TENSE_TO_PLAIN: Readonly<Record<string, string>> = { ㄲ: "ㄱ", ㄸ: "ㄷ", ㅃ: "ㅂ", ㅆ: "ㅅ", ㅉ: "ㅈ" };

const COMMON: Readonly<Record<string, Element>> = {
  ㄱ: "wood", ㅋ: "wood", ㄴ: "fire", ㄷ: "fire", ㄹ: "fire", ㅌ: "fire", ㅅ: "metal", ㅈ: "metal", ㅊ: "metal",
};
export const SOUND_MAPPINGS: Readonly<Record<SoundMapping, Readonly<Record<string, Element>>>> = {
  modern: { ...COMMON, ㅇ: "earth", ㅎ: "earth", ㅁ: "water", ㅂ: "water", ㅍ: "water" },
  hunminjeongeum: { ...COMMON, ㅇ: "water", ㅎ: "water", ㅁ: "earth", ㅂ: "earth", ㅍ: "earth" },
};

const BASE = 0xac00;
const LAST = 0xd7a3;

export function isHangulSyllable(ch: string): boolean {
  const code = ch.charCodeAt(0);
  return ch.length === 1 && code >= BASE && code <= LAST;
}

export function initialOf(syllable: string): string {
  if (!isHangulSyllable(syllable)) return "";
  return INITIALS[Math.floor((syllable.charCodeAt(0) - BASE) / 588)];
}

export function hasBatchim(syllable: string): boolean {
  return isHangulSyllable(syllable) && (syllable.charCodeAt(0) - BASE) % 28 !== 0;
}

export function soundElement(syllable: string, mapping: SoundMapping): Element | null {
  const initial = initialOf(syllable);
  if (!initial) return null;
  return SOUND_MAPPINGS[mapping][TENSE_TO_PLAIN[initial] || initial] || null;
}

export interface SoundFlow { elements: Element[]; relations: Relation[]; score: number }

/** 인접 쌍 평균(상생 1 · 비화 0.5 · 상극 0) − 같은 오행 3연속 감점. 상극은 감점만 하고 거부하지 않는다. */
export function soundFlowOfElements(elements: Element[]): SoundFlow {
  const relations: Relation[] = [];
  for (let k = 1; k < elements.length; k++) relations.push(relationOf(elements[k - 1], elements[k]));
  if (!relations.length) return { elements, relations, score: 0.5 };
  let score = relations.reduce((acc, relation) => acc + SOUND[relation], 0) / relations.length;
  for (let k = 2; k < elements.length; k++) {
    if (elements[k] === elements[k - 1] && elements[k] === elements[k - 2]) {
      score -= SOUND.tripleSamePenalty;
      break;
    }
  }
  return { elements, relations, score: Math.max(0, Math.min(1, score)) };
}

export function soundFlow(syllables: string[], mapping: SoundMapping): SoundFlow {
  const elements = syllables.map((s) => soundElement(s, mapping));
  if (elements.some((e) => !e)) return { elements: [], relations: [], score: 0 };
  return soundFlowOfElements(elements as Element[]);
}
