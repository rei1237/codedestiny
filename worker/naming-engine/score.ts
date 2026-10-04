// 항목 점수 + 근거 키(설계서 §7). 각 항목은 0~1, 총점은 가중합 0~100.
// 탐색(candidates.ts)은 여기 함수로 만든 표를 미리 계산해 쓰고, 최종 후보는 scoreCandidate 로 처음부터 다시 계산한다 —
// 두 경로가 같은 값을 내는지는 테스트가 본다.

import { CONFIDENCE, DIST_BONUS, GRADE_VALUE, NATURALNESS, PRACTICAL, SAJU_PARTS, WEIGHTS } from "./config/weights";
import type { SoundMapping, StrokeMethod } from "./config/school-presets";
import type { BlacklistEntry, HanjaEntry, HanjaReading, NamingData } from "./data";
import type { SajuNeeds } from "./saju-input";
import { hasBatchim, initialOf, soundFlow } from "./sound";
import { charStrokes } from "./strokes";
import {
  fiveGrids, fourGrids, gridGrades, samjaeOf, strokeYinYang, suriScore, yinYangScore,
  type FourGrids, type GridName, GRID_NAMES,
} from "./suri";
import type { Element, Grade, Relation, YinYang } from "./types";
import type { ResolvedSurname } from "./strokes";

export type ScoreKey = "saju" | "suri" | "samjae" | "sound" | "yinyang" | "practical";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/** 자원오행 적중 가중: 신뢰도 full(0.7) 이상 1, 그 아래는 비례. 미분류 0. */
export function jawonWeight(entry: Pick<HanjaEntry, "jawon" | "confidence">): number {
  if (!entry.jawon) return 0;
  return Math.min(1, (entry.confidence ?? 0) / CONFIDENCE.full);
}

/**
 * 글자 하나의 사주 보완 몫. 글자 하나가 받을 수 있는 최대(용신 적중 + 기피 회피 = 25)로 나눠
 * 용신 1 · 보조 0.6 · 중립 0.2 · 기피 −0.2(신뢰도 full 기준). 이름 글자들의 평균에 분포 보정을 더해 saju 점수가 된다.
 */
export function unitSaju(entry: Pick<HanjaEntry, "jawon" | "confidence">, needs: SajuNeeds): number {
  const total = SAJU_PARTS.useful + SAJU_PARTS.avoid;
  const element = entry.jawon;
  const weight = jawonWeight(entry);
  const useful = element && needs.useful.includes(element) ? weight : 0;
  const support = element && needs.support.includes(element) ? weight : 0;
  const caution = element && needs.caution.includes(element) ? weight : 0;
  return (SAJU_PARTS.useful * useful + SAJU_PARTS.support * support + SAJU_PARTS.avoid * (1 - 2 * caution)) / total;
}

/** 원국에 없던 오행(기피 제외)을 이름 자원오행이 채운 개수 × 0.05, 최대 0.1. */
export function distBonus(needs: SajuNeeds, elements: (Element | null)[]): number {
  const filled = new Set<Element>();
  for (const element of elements) {
    if (element && needs.natalCounts[element] === 0 && !needs.caution.includes(element)) filled.add(element);
  }
  return Math.min(DIST_BONUS.max, filled.size * DIST_BONUS.perElement);
}

export function sajuScore(entries: Pick<HanjaEntry, "jawon" | "confidence">[], needs: SajuNeeds): number {
  const mean = entries.reduce((acc, entry) => acc + unitSaju(entry, needs), 0) / entries.length;
  return clamp01(mean + distBonus(needs, entries.map((entry) => entry.jawon)));
}

/** 이름 사용 횟수 → 드묾 0~1(0회 1, full 회 이상 0, 로그 포화). */
export function rarity(use: number, full: number): number {
  return 1 - Math.min(1, Math.log1p(use) / Math.log1p(full));
}

/** 글자 하나의 실용 감점(불용 관행·확장 영역·기초한자 밖·이 음으로 이름에 드묾). */
export function unitPenalty(entry: Pick<HanjaEntry, "tags" | "buryongLineages">, reading: Pick<HanjaReading, "nameUse">): number {
  let penalty = 0;
  if (entry.buryongLineages >= 2) penalty += PRACTICAL.buryongMultiLineage;
  else if (entry.buryongLineages === 1) penalty += PRACTICAL.buryongSingleLineage;
  if (entry.tags.includes("ext-a")) penalty += PRACTICAL.extA;
  if (entry.tags.includes("ext-b") || entry.tags.includes("ext-c-plus")) penalty += PRACTICAL.extBPlus;
  if (!entry.tags.includes("basic-edu")) penalty += PRACTICAL.nonBasicEdu;
  penalty += PRACTICAL.rareHanja * rarity(reading.nameUse, NATURALNESS.hanjaFull);
  return penalty;
}

/** 음절 하나의 자리별 감점 [첫째 자리, 둘째 자리, 외자]. 외자는 두 자리 사용을 합쳐 본다. */
export function syllablePenalties(hangul: string, syllableUse: NamingData["syllableUse"]): [number, number, number] {
  const [first, second] = syllableUse.get(hangul) ?? [0, 0];
  const of = (use: number) => PRACTICAL.rareSyllable * rarity(use, NATURALNESS.syllableFull);
  return [of(first), of(second), of(first + second)];
}

/** 이름 음절(1~2개)이 그 자리에서 드문 만큼의 감점. 탐색은 글자마다 syllablePenalties 를 미리 계산해 같은 순서로 더한다. */
export function namePositionPenalty(nameSyllables: string[], syllableUse: NamingData["syllableUse"]): number {
  if (nameSyllables.length === 1) return syllablePenalties(nameSyllables[0], syllableUse)[2];
  return syllablePenalties(nameSyllables[0], syllableUse)[0] + syllablePenalties(nameSyllables[1], syllableUse)[1];
}

/** 음절 배열(성+이름) 전체에 걸린 감점: 인접 같은 소리, 모든 음절 받침, 이름 첫 음절 ㄹ. nameStart = 성 음절 수. */
export function pairPenalty(syllables: string[], nameStart: number): number {
  let penalty = 0;
  if (initialOf(syllables[nameStart]) === "ㄹ") penalty += PRACTICAL.initialRieul;
  for (let k = 1; k < syllables.length; k++) {
    if (syllables[k] === syllables[k - 1]) { penalty += PRACTICAL.repeatedSyllable; break; }
  }
  if (syllables.every(hasBatchim)) penalty += PRACTICAL.allBatchim;
  return penalty;
}

/** 동음 블랙리스트: 성+이름 전체 또는 이름만에 목록 문자열이 들어 있으면 걸린다. block 이 warn 보다 앞선다. */
export function blacklistHit(fullHangul: string, list: BlacklistEntry[]): BlacklistEntry | null {
  let warn: BlacklistEntry | null = null;
  for (const entry of list) {
    if (!fullHangul.includes(entry.text)) continue;
    if (entry.grade === "block") return entry;
    warn = warn || entry;
  }
  return warn;
}

export function practicalScore(
  unitPenalties: number[],
  syllables: string[],
  nameStart: number,
  hit: BlacklistEntry | null,
  syllableUse: NamingData["syllableUse"],
): number {
  const warn = hit && hit.grade === "warn" ? PRACTICAL.blacklistWarn : 0;
  const position = namePositionPenalty(syllables.slice(nameStart), syllableUse);
  return clamp01(1 - unitPenalties.reduce((a, b) => a + b, 0) - pairPenalty(syllables, nameStart) - position - warn);
}

/** 이름 획수 쌍마다 변하지 않는 몫(수리·삼재·음양) — 탐색이 획수 쌍 단위로 한 번만 계산한다. */
export interface StrokeBase {
  grids: FourGrids;
  grades: Record<GridName, Grade>;
  suri: number;
  samjae: ReturnType<typeof samjaeOf>;
  five: ReturnType<typeof fiveGrids>;
  yinyang: number;
  /** 25·suri + 5·samjae + 5·yinyang */
  weighted: number;
}

export function strokeBase(surnameStrokes: number[], nameStrokes: number[], data: NamingData): StrokeBase {
  const grids = fourGrids(surnameStrokes, nameStrokes);
  const grades = gridGrades(grids, data);
  const suri = suriScore(grids, grades);
  const five = fiveGrids(surnameStrokes, nameStrokes);
  const samjae = samjaeOf(five, data);
  const yinyang = yinYangScore([...surnameStrokes, ...nameStrokes]);
  const weighted = WEIGHTS.suri * suri + WEIGHTS.samjae * GRADE_VALUE[samjae.grade] + WEIGHTS.yinyang * yinyang;
  return { grids, grades, suri, samjae, five, yinyang, weighted };
}

export function weightedTotal(scores: Record<ScoreKey, number>): number {
  return (Object.keys(WEIGHTS) as ScoreKey[]).reduce((acc, key) => acc + WEIGHTS[key] * scores[key], 0);
}

export interface CandidateChar {
  ch: string;
  hangul: string;
  hun: string | null;
  readingKind: HanjaReading["kind"];
  strokes: number;
  /** 강희 부수 번호(1~214) — 화면의 부수 표기용 */
  radical: number;
  jawon: Element | null;
  confidence: number | null;
  reviewed: boolean;
  disputes: string[];
  tags: string[];
  basis: HanjaEntry["basis"];
  buryong: boolean;
}

export interface NamedCandidate {
  hangul: string;
  hanja: string[];
  chars: CandidateChar[];
  strokes: { surname: number[]; name: number[]; method: StrokeMethod };
  suri: FourGrids & { grades: Record<GridName, Grade> };
  samjae: { heaven: number; human: number; earth: number; total: number; outer: number | null; combo: Element[]; grade: Grade; gradeRaw: string; disputed: boolean };
  sound: { elements: Element[]; relations: Relation[]; mapping: SoundMapping };
  jawon: (Element | null)[];
  yinYang: YinYang[];
  scores: Record<ScoreKey, number>;
  total: number;
  reasonKeys: string[];
}

/** 법원 시스템에서 표준 코드가 아닌 내부(이체) 코드로만 등록된 글자 — Phase 5 화면 안내용 태그(점수 영향 없음). */
const COURT_VARIANT_BASIS = new Set<HanjaEntry["basis"]>(["adjudicated", "law-basic-edu"]);

/** 최종 후보 한 개를 처음부터 계산한다(탐색의 빠른 경로와 같은 함수). */
export function scoreCandidate(
  surname: ResolvedSurname,
  picks: { entry: HanjaEntry; reading: HanjaReading }[],
  needs: SajuNeeds,
  preset: { soundMapping: SoundMapping; strokeMethod: StrokeMethod },
  data: NamingData,
): NamedCandidate {
  const nameStrokes = picks.map((p) => charStrokes(p.entry, preset.strokeMethod));
  const base = strokeBase(surname.strokes, nameStrokes, data);
  const syllables = [...Array.from(surname.hangul), ...picks.map((p) => p.reading.hangul)];
  const flow = soundFlow(syllables, preset.soundMapping);
  const fullHangul = syllables.join("");
  const hit = blacklistHit(fullHangul, data.blacklist);
  const entries = picks.map((p) => p.entry);
  const scores: Record<ScoreKey, number> = {
    saju: sajuScore(entries, needs),
    suri: base.suri,
    samjae: GRADE_VALUE[base.samjae.grade],
    sound: flow.score,
    yinyang: base.yinyang,
    practical: practicalScore(picks.map((p) => unitPenalty(p.entry, p.reading)), syllables, surname.strokes.length, hit, data.syllableUse),
  };

  const reasonKeys: string[] = [];
  for (const grid of GRID_NAMES) reasonKeys.push(`suri.${grid}.${base.grades[grid]}`);
  reasonKeys.push(`samjae.${base.samjae.grade}${base.samjae.disputed ? ".disputed" : ""}`);
  flow.relations.forEach((relation, k) => reasonKeys.push(`sound.${k}.${relation}`));
  picks.forEach((p, k) => {
    const element = p.entry.jawon;
    if (!element) reasonKeys.push(`saju.${k}.unclassified`);
    else if (needs.useful.includes(element)) reasonKeys.push(`saju.${k}.useful.${element}`);
    else if (needs.support.includes(element)) reasonKeys.push(`saju.${k}.support.${element}`);
    else if (needs.caution.includes(element)) reasonKeys.push(`saju.${k}.caution.${element}`);
    else reasonKeys.push(`saju.${k}.neutral.${element}`);
    if (element && (p.entry.confidence ?? 0) < CONFIDENCE.full) reasonKeys.push(`char.${k}.low-confidence`);
    if (p.entry.disputes.length) reasonKeys.push(`char.${k}.disputed`);
    if (p.entry.buryongLineages > 0) reasonKeys.push(`practical.${k}.buryong`);
    if (p.reading.nameUse < NATURALNESS.rareBelow) reasonKeys.push(`practical.${k}.rare-in-names`);
    if (COURT_VARIANT_BASIS.has(p.entry.basis)) reasonKeys.push(`char.${k}.court-code-variant`);
    if (!p.reading.hun) reasonKeys.push(`char.${k}.no-hun`);
  });
  if (distBonus(needs, entries.map((e) => e.jawon)) > 0) reasonKeys.push("saju.fills-missing");
  if (base.yinyang === 0) reasonKeys.push("yinyang.uniform");
  if (initialOf(picks[0].reading.hangul) === "ㄹ") reasonKeys.push("practical.initial-rieul");
  if (hit) reasonKeys.push(`practical.blacklist-${hit.grade}`);
  const other: SoundMapping = preset.soundMapping === "modern" ? "hunminjeongeum" : "modern";
  if (soundFlow(syllables, other).elements.join() !== flow.elements.join()) reasonKeys.push("sound.school-sensitive");

  return {
    hangul: picks.map((p) => p.reading.hangul).join(""),
    hanja: picks.map((p) => p.entry.ch),
    chars: picks.map((p, k) => ({
      ch: p.entry.ch,
      hangul: p.reading.hangul,
      hun: p.reading.hun,
      readingKind: p.reading.kind,
      strokes: nameStrokes[k],
      radical: p.entry.radical,
      jawon: p.entry.jawon,
      confidence: p.entry.confidence,
      reviewed: p.entry.reviewed,
      disputes: [...p.entry.disputes],
      tags: [...p.entry.tags],
      basis: p.entry.basis,
      buryong: p.entry.buryongLineages > 0,
    })),
    strokes: { surname: [...surname.strokes], name: nameStrokes, method: preset.strokeMethod },
    suri: { ...base.grids, grades: base.grades },
    samjae: { ...base.five, combo: base.samjae.combo, grade: base.samjae.grade, gradeRaw: base.samjae.gradeRaw, disputed: base.samjae.disputed },
    sound: { elements: flow.elements, relations: flow.relations, mapping: preset.soundMapping },
    jawon: entries.map((e) => e.jawon),
    yinYang: [...surname.strokes, ...nameStrokes].map(strokeYinYang),
    scores,
    total: weightedTotal(scores),
    reasonKeys,
  };
}
