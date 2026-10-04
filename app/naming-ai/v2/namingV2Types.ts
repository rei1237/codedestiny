// 작명 v2(결정론 엔진) 화면용 타입·헬퍼. 모양은 worker/naming-engine/facts.ts 의 EngineView 와 같다.
// 🔴 여기서는 획수·수리·오행을 새로 "계산"하지 않는다 — 엔진 값을 보여 주기만 하고,
//    식 표기(성+이름=격)는 엔진 수치와 합이 맞을 때만 그린다(gridFormula).

import { FIVE_ELEMENT_TOKENS, elementOfBranch, type FiveElement } from "@/lib/five-element-colors";

export type V2Element = "wood" | "fire" | "earth" | "metal" | "water";
export type V2Grade = "good" | "half" | "bad";
export type V2Relation = "generate" | "same" | "control";
export type V2Grid = "won" | "hyeong" | "i" | "jeong";

export const V2_ELEMENTS: V2Element[] = ["wood", "fire", "earth", "metal", "water"];
export const V2_GRIDS: V2Grid[] = ["won", "hyeong", "i", "jeong"];
export const V2_SCORE_KEYS = ["saju", "suri", "sound", "practical", "samjae", "yinyang"] as const;
export type V2ScoreKey = (typeof V2_SCORE_KEYS)[number];

export interface V2Char {
  ch: string;
  hangul: string;
  hun: string | null;
  strokes: number;
  jawon: V2Element | null;
  /** 강희 부수 번호(1~214). 2026-10-04 이전 레코드에는 없다. */
  radical?: number;
  flags: string[];
}

export interface V2Candidate {
  rank: number;
  hangul: string;
  hanja: string;
  chars: V2Char[];
  strokes: { surname: number[]; name: number[]; method: string };
  grids: Record<V2Grid, number>;
  grades: Record<V2Grid, V2Grade>;
  samjae: { heaven: number; human: number; earth: number; total: number; combo: V2Element[]; grade: V2Grade; disputed: boolean };
  sound: { elements: V2Element[]; relations: V2Relation[]; mapping: string };
  scores: Partial<Record<V2ScoreKey, number>>;
  total: number;
  reasonKeys: string[];
}

export interface V2Pillar { g?: string; j?: string; gE?: string }

export interface V2Saju {
  useful: V2Element[];
  caution: V2Element[];
  derivedSupport: V2Element[];
  timeUnknown: boolean;
  jongConditional: boolean;
  pillars?: Partial<Record<"y" | "m" | "d" | "h", V2Pillar>>;
  /** 원국 오행 개수(시간 미상이면 6자 기준) */
  counts?: Partial<Record<V2Element, number>>;
}

export interface V2Surname { hangul: string; hanja: string; strokes: number[]; compound: boolean; source: string }

export interface V2Engine {
  engineVersion: string;
  dataVersion: string;
  schoolPreset: string;
  surname: V2Surname;
  saju: V2Saju;
  notices: string[];
  candidates: V2Candidate[];
  tier?: string;
  relaxationStage?: number;
}

export interface V2NarrationName { rank: number; meaning: string; sajuSupport: string; soundFeel: string }
export interface V2Narration {
  source: "llm" | "llm-corrected" | "engine";
  names: V2NarrationName[];
  letters: { rank: number; letter: string }[];
}

/** /api/naming-prompt/basis 응답 */
export interface V2BasisResponse {
  ok?: boolean;
  engineVersion?: string;
  dataVersion?: string;
  schoolPreset?: string;
  surname?: V2Surname;
  notices?: string[];
  saju?: V2Saju;
  candidates?: V2Candidate[];
  message?: string;
  code?: string;
}

export const V2_SCHOOL_PRESETS = ["kr-modern", "kr-hunminjeongeum", "kr-pil"] as const;
export type V2SchoolPreset = (typeof V2_SCHOOL_PRESETS)[number];

const KO_OF: Record<V2Element, FiveElement> = { wood: "목", fire: "화", earth: "토", metal: "금", water: "수" };

// 작명서 바탕에서 글자로 읽히게 등록 오행 색을 먹색(#3c1830)으로 섞어 짙게 한다 — 가장 어두운 바탕(한지 #fdf6f0 위 옅은 칩 배경)에서도 4.6:1 이상.
// 등록 색은 밤 바탕용 파스텔이라(금 1.4:1) 그대로는 글자·선이 사라진다. 색상(hue)은 등록 색을 따르고 새 색을 만들지 않는다. color-mix 는 PDF(html2canvas)가 못 읽어 미리 계산한다.
// 칩이 놓이는 가장 어두운 바탕(실측 2026-10-04: 카드 그라데이션 위 약 242,238,236) — 한지 #fdf6f0 보다 짙어 이것을 기준으로 한다.
const PAPER: [number, number, number] = [242, 238, 236];
const SOFT_ALPHA = 0.1;
const INK: [number, number, number] = [60, 24, 48];
const luminance = (rgb: number[]) => {
  const [r, g, b] = rgb.map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
function deepenForPaper(hex: string): [number, number, number] {
  const base = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  for (let t = 0; t <= 1; t += 0.05) {
    const mixed = base.map((v, i) => Math.round(v + (INK[i] - v) * t)) as [number, number, number];
    const chip = mixed.map((v, i) => v * SOFT_ALPHA + PAPER[i] * (1 - SOFT_ALPHA));
    if ((luminance(chip) + 0.05) / (luminance(mixed) + 0.05) >= 4.6) return mixed;
  }
  return INK;
}
const PAPER_TONES = Object.fromEntries(Object.entries(FIVE_ELEMENT_TOKENS).map(([key, token]) => {
  const rgb = deepenForPaper(token.color).join(", ");
  return [key, { color: `rgb(${rgb})`, soft: `rgba(${rgb}, ${SOFT_ALPHA})`, hanja: token.hanja }];
})) as Record<FiveElement, { color: string; soft: string; hanja: string }>;

/** 오행 색(lib/five-element-colors.ts 를 밝은 바탕용으로 짙게 보정). 색만으로 구분하지 않도록 화면은 늘 글자 라벨을 같이 둔다. */
export function elementTone(element: V2Element | null | undefined): { color: string; soft: string; hanja: string } {
  if (!element) return { color: "rgb(112, 68, 92)", soft: "rgba(112, 68, 92, 0.08)", hanja: "?" };
  return PAPER_TONES[KO_OF[element]];
}

const GENERATES: Record<V2Element, V2Element> = { wood: "fire", fire: "earth", earth: "metal", metal: "water", water: "wood" };
const CONTROLS: Record<V2Element, V2Element> = { wood: "earth", earth: "water", water: "fire", fire: "metal", metal: "wood" };

export function generatesOf(element: V2Element): V2Element { return GENERATES[element]; }
export function controlsOf(element: V2Element): V2Element { return CONTROLS[element]; }

/** worker/naming-engine/types.ts relationOf 와 같은 정의(방향 무관). */
export function relationOf(a: V2Element, b: V2Element): V2Relation {
  if (a === b) return "same";
  if (GENERATES[a] === b || GENERATES[b] === a) return "generate";
  return "control";
}

/** 수리오행 — 끝자리 1·2 木, 3·4 火, 5·6 土, 7·8 金, 9·0 水(설계서 §6.2, 출처 전원 일치). */
export function suriElement(value: number): V2Element {
  const digit = Math.abs(Math.trunc(value)) % 10;
  if (digit === 1 || digit === 2) return "wood";
  if (digit === 3 || digit === 4) return "fire";
  if (digit === 5 || digit === 6) return "earth";
  if (digit === 7 || digit === 8) return "metal";
  return "water";
}

/** 강희 부수 번호 → 통합 한자(⽔ U+2F54 → 水). 범위 밖이면 빈 문자열. */
export function radicalChar(radical: number | undefined): string {
  if (!radical || radical < 1 || radical > 214) return "";
  return String.fromCodePoint(0x2f00 + radical - 1).normalize("NFKC");
}

export interface GridFormula { parts: number[]; labels: string[] }

/**
 * 격의 식 표기. 설계서 §6.2~6.3(단성·복성·외자). 합이 엔진 값과 다르면 null — 식을 지어내지 않는다.
 * labels 는 "姓"·"名1" 같은 자리 표지다(화면에서 실제 글자로 바꾼다).
 */
export function gridFormula(candidate: V2Candidate, grid: V2Grid): GridFormula | null {
  const s = candidate.strokes.surname;
  const n = candidate.strokes.name;
  if (!s.length || !n.length) return null;
  const sSum = s.reduce((a, b) => a + b, 0);
  const sLabel = s.length > 1 ? "姓合" : "姓";
  const last = n.length - 1;
  let formula: GridFormula;
  if (grid === "won") formula = n.length > 1 ? { parts: [...n], labels: n.map((_, k) => `名${k + 1}`) } : { parts: [n[0]], labels: ["名1"] };
  else if (grid === "hyeong") formula = { parts: [sSum, n[0]], labels: [sLabel, "名1"] };
  else if (grid === "i") formula = n.length > 1 ? { parts: [sSum, n[last]], labels: [sLabel, `名${last + 1}`] } : { parts: [sSum], labels: [sLabel] };
  else formula = { parts: [sSum, ...n], labels: [sLabel, ...n.map((_, k) => `名${k + 1}`)] };
  const sum = formula.parts.reduce((a, b) => a + b, 0);
  return sum === candidate.grids[grid] ? formula : null;
}

// 엔진 기둥은 한글 간지("을","사")로 온다. 천간 신=辛 과 지지 신=申 이 다르므로 표를 나눈다.
const STEM_HANJA: Record<string, string> = { 갑: "甲", 을: "乙", 병: "丙", 정: "丁", 무: "戊", 기: "己", 경: "庚", 신: "辛", 임: "壬", 계: "癸" };
const BRANCH_HANJA: Record<string, string> = { 자: "子", 축: "丑", 인: "寅", 묘: "卯", 진: "辰", 사: "巳", 오: "午", 미: "未", 신: "申", 유: "酉", 술: "戌", 해: "亥" };

/** 기둥 한글 간지 → 한자. 모르는 값은 원문 그대로(이미 한자인 레코드 대비). */
export function stemHanja(g: string | undefined): string { return g ? STEM_HANJA[g] || g : ""; }
export function branchHanja(j: string | undefined): string { return j ? BRANCH_HANJA[j] || j : ""; }

const EN_OF: Record<FiveElement, V2Element> = { 목: "wood", 화: "fire", 토: "earth", 금: "metal", 수: "water" };
/** 지지 오행(엔진 view 는 천간 오행 gE 만 싣는다). */
export function branchElement(j: string | undefined): V2Element | null {
  const ko = j ? elementOfBranch(j) : null;
  return ko ? EN_OF[ko] : null;
}

/** 이름 글자의 자원오행 개수 — 오행 다이어그램에서 "이름이 보태는 기운" 강조용. */
export function nameElementCounts(candidate: V2Candidate | null | undefined): Partial<Record<V2Element, number>> {
  const counts: Partial<Record<V2Element, number>> = {};
  for (const char of candidate?.chars || []) if (char.jawon) counts[char.jawon] = (counts[char.jawon] || 0) + 1;
  return counts;
}

export function isV2Engine(value: unknown): value is V2Engine {
  const engine = value as V2Engine | null;
  return Boolean(engine && typeof engine === "object" && engine.surname && engine.saju && Array.isArray(engine.candidates));
}
