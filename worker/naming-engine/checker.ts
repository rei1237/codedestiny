// LLM 서술 대조기(설계서 §9). 서술이 엔진 값과 다른 한자·획수·격 수치를 쓰거나 금지 표현을 쓰면 잡아낸다.
// 거부하지 않고 교정한다 — 위반 문단은 그 후보의 계산값 문단으로 바꾸거나 빼고, 보고서 전체를 실패시키지 않는다.

import { factParagraph, type EngineCandidateView, type EngineView } from "./facts";
import { GRID_NAMES, type GridName } from "./suri";

export type ViolationKind = "cjk" | "strokes" | "su" | "grid" | "forbidden";
export interface Violation { kind: ViolationKind; detail: string }

/** 서술에 나와도 되는 한자(후보·성 한자 외). 간지·오행·수리 용어만 둔다. */
const BASE_HAN = "甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥木火土金水陰陽元亨利貞天人地格數劃吉凶用神喜忌年月日時柱";
const HAN = /\p{Script=Han}/u;
const HAN_ALL = /\p{Script=Han}/gu;

const GRID_BY_SYLLABLE: Record<string, GridName> = { 원: "won", 형: "hyeong", 이: "i", 정: "jeong" };
const STROKES_RE = /(\d{1,3})\s*획/g;
// "15수" 처럼 숫자 바로 뒤 "수". 수리·수학·수치 같은 낱말은 뺀다("15수입니다"가 흔해 수입은 빼지 않는다).
const SU_RE = /(?<![\d,.])(\d{1,2})수(?!리|학|치|량|록|준|익|출|명|요|업|술|련)/g;
const GRID_RE = /(원|형|이|정)격[^\d\n]{0,6}?(\d{1,3})(?!\d)(?!\s*수리)/g;

const FORBIDDEN: { re: RegExp; detail: string }[] = [
  { re: /(반드시|틀림없이|무조건|100%)\s*[^\s.,]{0,8}\s*(성공|부자|부귀|출세|대성|불행|실패|망하)/, detail: "fatalism" },
  { re: /운명이\s*(정해|결정)/, detail: "fatalism" },
  { re: /평생\s*(불행|가난|고생)/, detail: "fatalism" },
  { re: /죽음|사망|요절|단명|재앙|저주|횡사|객사|급사|파멸|흉사/, detail: "fear" },
  { re: /(병|질병|질환|건강)[^.\n]{0,12}(치료|완치)(해|됩|합|시켜)|(치료|완치)(를|가)?\s*(보장|약속)/, detail: "medical" },
  { re: /보장(합니다|됩니다|해\s*드립니다)|(재물|돈|수입|재산|합격|성공)[^.\n]{0,12}보장/, detail: "financial" },
  { re: /(나쁜|최악의|천한|흉한|불길한|망하는|저주받은)\s*이름/, detail: "disparaging" },
];

export interface CheckContext {
  view: EngineView;
  /** ja·zh 는 한자를 일상 표기로 쓰므로 한자 화이트리스트를 건너뛴다(숫자·금지 표현 대조는 한국어 표현에만 걸린다) */
  locale?: string;
}

function allowedHan(view: EngineView): Set<string> {
  const set = new Set(Array.from(BASE_HAN));
  for (const ch of Array.from(view.surname.hanja)) set.add(ch);
  for (const candidate of view.candidates) for (const char of candidate.chars) set.add(char.ch);
  return set;
}

const skipsHanCheck = (locale?: string) => /^(ja|zh)/i.test(String(locale || ""));

function sum(values: number[]) { return values.reduce((a, b) => a + b, 0); }

function strokeSet(view: EngineView, scope: EngineCandidateView[]): Set<number> {
  const surname = view.surname.strokes;
  const set = new Set<number>([...surname, sum(surname), 81]);
  for (const candidate of scope) {
    const name = candidate.chars.map((char) => char.strokes);
    for (const n of [...name, sum(name), sum(surname) + sum(name)]) set.add(n);
    for (const grid of GRID_NAMES) set.add(candidate.grids[grid]);
    const { heaven, human, earth, total } = candidate.samjae;
    for (const n of [heaven, human, earth, total]) set.add(n);
  }
  return set;
}

function suSet(scope: EngineCandidateView[]): Set<number> {
  const set = new Set<number>([81]);
  for (const candidate of scope) {
    for (const grid of GRID_NAMES) set.add(candidate.grids[grid]);
    const { heaven, human, earth, total } = candidate.samjae;
    for (const n of [heaven, human, earth, total]) set.add(n);
  }
  return set;
}

/** 문단이 가리키는 후보: 한자 이름, 성+한글 이름, "한글이름(" 표기. 아무도 안 가리키면 전체 후보와 대조한다. */
export function mentionedCandidates(paragraph: string, view: EngineView): EngineCandidateView[] {
  return view.candidates.filter((candidate) =>
    (candidate.hanja && paragraph.includes(candidate.hanja))
    || paragraph.includes(`${view.surname.hangul}${candidate.hangul}`)
    || paragraph.includes(`${candidate.hangul}(`));
}

/** 괄호 안 한자 풀이에 허용 밖 글자가 섞이면 괄호째 뺀다("작명(作名)"). 위반이 아니라 교정이다. */
export function stripForeignGlosses(text: string, allowed: Set<string>): { text: string; stripped: number } {
  let stripped = 0;
  const out = text.replace(/\s?\(([\p{Script=Han}\s·,]+)\)/gu, (whole, inner: string) => {
    if (Array.from(inner).every((ch) => !HAN.test(ch) || allowed.has(ch))) return whole;
    stripped++;
    return "";
  });
  return { text: out, stripped };
}

export function findViolations(paragraph: string, ctx: CheckContext, scopeOverride?: EngineCandidateView[]): Violation[] {
  const { view } = ctx;
  const violations: Violation[] = [];
  const mentioned = scopeOverride || mentionedCandidates(paragraph, view);
  const scope = mentioned.length ? mentioned : view.candidates;

  if (!skipsHanCheck(ctx.locale)) {
    const allowed = allowedHan(view);
    const foreign = [...new Set(paragraph.match(HAN_ALL) || [])].filter((ch) => !allowed.has(ch));
    if (foreign.length) violations.push({ kind: "cjk", detail: foreign.join("") });
  }

  const strokes = strokeSet(view, scope);
  for (const match of paragraph.matchAll(STROKES_RE)) {
    if (!strokes.has(Number(match[1]))) violations.push({ kind: "strokes", detail: match[0] });
  }
  const su = suSet(scope);
  for (const match of paragraph.matchAll(SU_RE)) {
    if (!su.has(Number(match[1]))) violations.push({ kind: "su", detail: match[0] });
  }
  for (const match of paragraph.matchAll(GRID_RE)) {
    const grid = GRID_BY_SYLLABLE[match[1]];
    const value = Number(match[2]);
    if (!scope.some((candidate) => candidate.grids[grid] === value)) violations.push({ kind: "grid", detail: match[0] });
  }
  for (const rule of FORBIDDEN) {
    const match = paragraph.match(rule.re);
    if (match) violations.push({ kind: "forbidden", detail: `${rule.detail}:${match[0]}` });
  }
  return violations;
}

export interface CorrectionResult {
  text: string;
  violations: Violation[];
  /** 계산값 문단으로 바꾼 문단 수 */
  replaced: number;
  /** 뺀 문단 수 */
  dropped: number;
  /** 괄호째 뺀 한자 풀이 수 */
  stripped: number;
}

/**
 * 본문 교정. 문단(빈 줄 구분) 단위로 보고, 위반 문단이 후보 하나만 가리키면 그 후보의 계산값 문단으로
 * 한 번만 바꾸고(같은 후보 두 번째부터는 뺀다), 여러 후보나 아무도 안 가리키면 뺀다.
 */
export function correctText(text: string, ctx: CheckContext): CorrectionResult {
  const allowed = allowedHan(ctx.view);
  const source = String(text || "").normalize("NFC").replace(/\r\n?/g, "\n");
  const paragraphs = source.split(/\n{2,}/);
  const usedFacts = new Set<number>();
  const kept: string[] = [];
  const violations: Violation[] = [];
  let replaced = 0;
  let dropped = 0;
  let stripped = 0;
  for (const raw of paragraphs) {
    const cleaned = skipsHanCheck(ctx.locale) ? { text: raw, stripped: 0 } : stripForeignGlosses(raw, allowed);
    stripped += cleaned.stripped;
    const paragraph = cleaned.text;
    if (!paragraph.trim()) continue;
    const found = findViolations(paragraph, ctx);
    if (!found.length) { kept.push(paragraph); continue; }
    violations.push(...found);
    const mentioned = mentionedCandidates(paragraph, ctx.view);
    if (mentioned.length === 1 && !usedFacts.has(mentioned[0].rank)) {
      usedFacts.add(mentioned[0].rank);
      kept.push(factParagraph(ctx.view, mentioned[0]));
      replaced++;
    } else {
      dropped++;
    }
  }
  return { text: kept.join("\n\n"), violations, replaced, dropped, stripped };
}
