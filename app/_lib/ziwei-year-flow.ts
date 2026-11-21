// 심화 자미두수 유년(流年) 이론 — 기본 자미두수 셸(js/saju-engine.js 의 zwYearFlowTheory)을 TS 로 옮긴 순수 함수다.
// 명반 계산(calculateZiweiChart)은 건드리지 않고, 완성된 ZiweiDeepChart 위에 "해마다 바뀌는 천간 사화"를 겹친다.
// 🔴 셸 쪽 이론을 고치면 여기도 같이 고친다. __tests__/ui/ziwei-deep-year-flow.test.mjs 가 둘이 같은 값을 내는지 검사한다.
//
// 약속(셸과 같다)
// - 지지 인덱스는 子=0. 유년 명궁 = 태세(太歲) 지지가 앉은 궁.
// - 유년 12궁 역할 = FLOW_PALACE_ORDER[(유년 명궁 − 궁 지지) mod 12].
// - 사화 낙점 = 그 해 천간의 사화 4성이 앉은 본명 궁(calculateFourTransformations 재사용).
// - 대한 궁의 천간은 오호둔(五虎遁)으로 구한다 — 차트에 궁간이 없다.
// - 나이 = 해 − 양력 출생연도 + 1(세는나이).
import { calculateFourTransformations, transformationTypeToLabel } from "./ziwei-advanced-normalization";
import type { ZiweiDeepChart, ZiweiPalace } from "./ziwei-types";

export const FLOW_TYPES = ["화록", "화권", "화과", "화기"] as const;
export type FlowType = (typeof FLOW_TYPES)[number];
export type FlowTone = "expand" | "guard" | "mixed" | "calm";
export type FlowDecadeRel = "same" | "opposite" | "triad" | "other" | "";

export const FLOW_PALACE_ORDER = [
  "명궁", "형제궁", "부부궁", "자녀궁", "재백궁", "질액궁", "천이궁", "노복궁", "관록궁", "전택궁", "복덕궁", "부모궁",
] as const;

const GAN_KO = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const ZHI_KO = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
const GAN_HANJA = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const ZHI_HANJA = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

export interface FlowMark {
  type: FlowType;
  star: string;
  /** 본명 궁 지지 인덱스(子=0). 명반에 별이 없으면 -1. */
  idx: number;
  /** 본명 궁 이름(노복궁 표기). */
  palace: string;
  /** 유년 12궁 기준 역할. */
  flowPalace: string;
  inTriad: boolean;
  chongIdx: number;
  chongPalace: string;
}

export interface FlowStackItem {
  type: "화록" | "화기";
  with: "본명" | "대한";
}

export interface YearFlowTheory {
  year: number;
  ganKo: string;
  zhiKo: string;
  /** 한자 간지(丙午). */
  ganji: string;
  mingIdx: number;
  mingPalace: string;
  marks: Record<FlowType, FlowMark>;
  decade: { idx: number; palace: string; startAge: number; endAge: number } | null;
  decadeRel: FlowDecadeRel;
  stack: FlowStackItem[];
  crossed: boolean;
  expandHits: number;
  guardHits: number;
  tone: FlowTone;
  score: number;
  age: number;
}

export function mod12(n: number): number {
  return ((Number(n) % 12) + 12) % 12;
}

/** 엔진 표기(교우궁)를 셸·표 표기(노복궁)에 맞춘다. */
export function flowPalaceKey(name: string): string {
  return name === "교우궁" ? "노복궁" : name;
}

export function yearGanjiOf(year: number): { ganIdx: number; zhiIdx: number; ganKo: string; zhiKo: string; ganji: string } {
  const o = Number(year) - 4;
  const ganIdx = ((o % 10) + 10) % 10;
  const zhiIdx = ((o % 12) + 12) % 12;
  return { ganIdx, zhiIdx, ganKo: GAN_KO[ganIdx], zhiKo: ZHI_KO[zhiIdx], ganji: GAN_HANJA[ganIdx] + ZHI_HANJA[zhiIdx] };
}

/** 오호둔 — 해 천간(0~9)과 지지 인덱스로 그 지지 궁(월)의 천간 인덱스를 구한다. 인(寅)=2 가 시작. */
export function branchStemIdx(yearGanIdx: number, branchIdx: number): number {
  const start = [2, 4, 6, 8, 0][((yearGanIdx % 5) + 5) % 5];
  return (start + mod12(branchIdx - 2)) % 10;
}

/** 월간 — 정월(인월)부터 오호둔. lunarMonth 1~12. */
export function monthStemIdx(yearGanIdx: number, lunarMonth: number): number {
  const start = [2, 4, 6, 8, 0][((yearGanIdx % 5) + 5) % 5];
  return (start + Number(lunarMonth) - 1) % 10;
}

export function triadHas(mingIdx: number, idx: number): boolean {
  const d = mod12(idx - mingIdx);
  return d === 0 || d === 4 || d === 6 || d === 8;
}

function branchIdxOf(p: Pick<ZiweiPalace, "branch" | "earthlyBranch">): number {
  return ZHI_KO.indexOf(String(p.branch || p.earthlyBranch || ""));
}

/** 지지 인덱스 → 그 지지에 앉은 궁. */
export function palaceByBranch(chart: ZiweiDeepChart): Array<ZiweiPalace | null> {
  const out: Array<ZiweiPalace | null> = new Array(12).fill(null);
  for (const p of chart.palaces) {
    const i = branchIdxOf(p);
    if (i >= 0) out[i] = p;
  }
  return out;
}

function palaceNameAt(byBranch: Array<ZiweiPalace | null>, idx: number): string {
  const p = byBranch[mod12(idx)];
  return p ? flowPalaceKey(p.normalizedName || p.name) : "";
}

export function landSihua(chart: ZiweiDeepChart, ganKo: string): Record<FlowType, { star: string; idx: number; palace: string }> {
  const byBranch = palaceByBranch(chart);
  const sum = calculateFourTransformations({ yearStem: ganKo, palaces: chart.palaces });
  const out = {} as Record<FlowType, { star: string; idx: number; palace: string }>;
  for (const t of ["록", "권", "과", "기"] as const) {
    const label = transformationTypeToLabel(t);
    const hit = sum.byType[t];
    if (hit) {
      const idx = ZHI_KO.indexOf(hit.palaceBranch);
      out[label] = { star: hit.starName, idx, palace: idx >= 0 ? palaceNameAt(byBranch, idx) : "" };
    } else {
      // 명반에 그 별이 없다 — 별 이름만 남기고 자리는 -1.
      const star = Object.entries(sum.byStar).find(([, types]) => types.includes(t))?.[0] || "";
      out[label] = { star, idx: -1, palace: "" };
    }
  }
  return out;
}

/** 양력 출생연도. 입력이 음력이어도 엔진이 birthYear 를 그대로 계산에 쓰므로 같은 값을 쓴다. */
export function solarBirthYearOf(chart: ZiweiDeepChart): number {
  return Number(chart.user?.birthYear) || 0;
}

export function decadeOfAge(chart: ZiweiDeepChart, age: number): { idx: number; startAge: number; endAge: number } | null {
  if (age <= 0) return null;
  for (const p of chart.palaces) {
    const m = String(p.dahan || "").match(/^(\d+)\s*-\s*(\d+)$/);
    if (!m) continue;
    const startAge = Number(m[1]);
    const endAge = Number(m[2]);
    if (age >= startAge && age <= endAge) {
      const idx = branchIdxOf(p);
      if (idx >= 0) return { idx, startAge, endAge };
    }
  }
  return null;
}

export function yearFlowTheory(chart: ZiweiDeepChart, year: number): YearFlowTheory {
  const byBranch = palaceByBranch(chart);
  const g = yearGanjiOf(year);
  const mingIdx = g.zhiIdx;
  const landed = landSihua(chart, g.ganKo);
  const birthYear = solarBirthYearOf(chart);
  const age = birthYear > 0 ? Number(year) - birthYear + 1 : 0;

  const dec = decadeOfAge(chart, age);
  let decadeMarks: Record<FlowType, { star: string; idx: number; palace: string }> | null = null;
  let decadeRel: FlowDecadeRel = "";
  if (dec) {
    const natalGanIdx = GAN_KO.indexOf(chart.birthYearStem || chart.yearGan);
    if (natalGanIdx >= 0) decadeMarks = landSihua(chart, GAN_KO[branchStemIdx(natalGanIdx, dec.idx)]);
    const dd = mod12(mingIdx - dec.idx);
    decadeRel = dd === 0 ? "same" : dd === 6 ? "opposite" : dd === 4 || dd === 8 ? "triad" : "other";
  }

  const natal = landSihua(chart, chart.birthYearStem || chart.yearGan);
  const stack: FlowStackItem[] = [];
  for (const t of ["화록", "화기"] as const) {
    const m = landed[t];
    if (m.idx < 0) continue;
    if (natal[t].idx === m.idx) stack.push({ type: t, with: "본명" });
    if (decadeMarks && decadeMarks[t].idx === m.idx) stack.push({ type: t, with: "대한" });
  }

  let expandHits = 0;
  for (const t of ["화록", "화권"] as const) if (landed[t].idx >= 0 && triadHas(mingIdx, landed[t].idx)) expandHits += 1;
  const guardHits = landed["화기"].idx >= 0 && triadHas(mingIdx, landed["화기"].idx) ? 1 : 0;
  const tone: FlowTone = guardHits ? (expandHits ? "mixed" : "guard") : expandHits ? "expand" : "calm";
  const crossed = landed["화록"].idx >= 0 && landed["화록"].idx === landed["화기"].idx;
  let score = expandHits * 10 - guardHits * 14;
  for (const s of stack) score += s.type === "화록" ? 8 : -10;

  const marks = {} as Record<FlowType, FlowMark>;
  for (const t of FLOW_TYPES) {
    const m = landed[t];
    marks[t] = {
      type: t,
      star: m.star,
      idx: m.idx,
      palace: m.palace,
      flowPalace: m.idx >= 0 ? FLOW_PALACE_ORDER[mod12(mingIdx - m.idx)] : "",
      inTriad: m.idx >= 0 && triadHas(mingIdx, m.idx),
      chongIdx: m.idx >= 0 ? (m.idx + 6) % 12 : -1,
      chongPalace: m.idx >= 0 ? palaceNameAt(byBranch, m.idx + 6) : "",
    };
  }

  return {
    year: Number(year),
    ganKo: g.ganKo,
    zhiKo: g.zhiKo,
    ganji: g.ganji,
    mingIdx,
    mingPalace: palaceNameAt(byBranch, mingIdx),
    marks,
    decade: dec ? { idx: dec.idx, palace: palaceNameAt(byBranch, dec.idx), startAge: dec.startAge, endAge: dec.endAge } : null,
    decadeRel,
    stack,
    crossed,
    expandHits,
    guardHits,
    tone,
    score,
    age,
  };
}
