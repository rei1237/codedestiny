// 4격(원형이정)·오격·삼재·수리오행(설계서 §6.2~6.4). 가성수 없음.
// 성이 두 글자(복성)면 두 획수를 한 단위로 묶는다 — 단성·복성이 같은 식을 쓴다.

import { GRADE_VALUE, SURI_FLOW_RANGE, SURI_GRID_WEIGHTS } from "./config/weights";
import { samjaeKey, type NamingData } from "./data";
import { relationOf, type Element, type Grade, type YinYang } from "./types";

export type GridName = "won" | "hyeong" | "i" | "jeong";
export const GRID_NAMES: readonly GridName[] = ["won", "hyeong", "i", "jeong"];

export interface FourGrids { won: number; hyeong: number; i: number; jeong: number }

/** 81 초과는 80 씩 뺀다(82 → 2). */
export function reduce81(n: number): number {
  let value = n;
  while (value > 81) value -= 80;
  return value;
}

/** 수리오행: 끝자리 1·2 木, 3·4 火, 5·6 土, 7·8 金, 9·0 水. */
export function suriElement(n: number): Element {
  const digit = n % 10;
  if (digit === 1 || digit === 2) return "wood";
  if (digit === 3 || digit === 4) return "fire";
  if (digit === 5 || digit === 6) return "earth";
  if (digit === 7 || digit === 8) return "metal";
  return "water";
}

export function strokeYinYang(n: number): YinYang {
  return n % 2 === 1 ? "yang" : "yin";
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/**
 * 원격 = 이름 합 / 형격 = 성 + 이름1 / 이격 = 성 + 이름2(외자는 성) / 정격 = 전체.
 * 외자: 원 = 名, 형 = 姓+名, 이 = 姓, 정 = 姓+名.
 */
export function fourGrids(surname: number[], name: number[]): FourGrids {
  const s = sum(surname);
  if (name.length === 1) return { won: name[0], hyeong: s + name[0], i: s, jeong: s + name[0] };
  return { won: name[0] + name[1], hyeong: s + name[0], i: s + name[1], jeong: s + name[0] + name[1] };
}

export function suriGrade(n: number, data: NamingData): Grade {
  const entry = data.suri.get(reduce81(n));
  return entry ? entry.grade : "bad";
}

export function gridGrades(grids: FourGrids, data: NamingData): Record<GridName, Grade> {
  return {
    won: suriGrade(grids.won, data),
    hyeong: suriGrade(grids.hyeong, data),
    i: suriGrade(grids.i, data),
    jeong: suriGrade(grids.jeong, data),
  };
}

/** 수리 점수 0~1: 4격 가중 평균 × (1 ± 수리오행 배열 보정). */
export function suriScore(grids: FourGrids, grades: Record<GridName, Grade>): number {
  const totalWeight = sum(Object.values(SURI_GRID_WEIGHTS));
  const base = GRID_NAMES.reduce((acc, grid) => acc + SURI_GRID_WEIGHTS[grid] * GRADE_VALUE[grades[grid]], 0) / totalWeight;
  const flow = GRID_NAMES.map((grid) => suriElement(grids[grid]));
  let balance = 0;
  for (let k = 1; k < flow.length; k++) {
    const relation = relationOf(flow[k - 1], flow[k]);
    balance += relation === "generate" ? 1 : relation === "control" ? -1 : 0;
  }
  const adjusted = base * (1 + (balance / (flow.length - 1)) * SURI_FLOW_RANGE);
  return Math.max(0, Math.min(1, adjusted));
}

export interface FiveGrids { heaven: number; human: number; earth: number; total: number; outer: number | null }

/**
 * 오격(구마사키 계통, 참고 지표): 천격 = 성(단성 +1) / 인격 = 성 끝 + 名1 / 지격 = 이름 합(외자 +1) / 총격 = 전체.
 * 외격 = 총격 − 인격 — 단성 외자는 0 이 되어 출처마다 처리가 달라(§6.4) null 로 둔다.
 */
export function fiveGrids(surname: number[], name: number[]): FiveGrids {
  const heaven = sum(surname) + (surname.length === 1 ? 1 : 0);
  const human = surname[surname.length - 1] + name[0];
  const earth = sum(name) + (name.length === 1 ? 1 : 0);
  const total = sum(surname) + sum(name);
  const outer = total - human;
  return { heaven, human, earth, total, outer: outer > 0 ? outer : null };
}

export interface SamjaeResult { combo: [Element, Element, Element]; grade: Grade; gradeRaw: string; disputed: boolean }

export function samjaeOf(five: FiveGrids, data: NamingData): SamjaeResult {
  const combo: [Element, Element, Element] = [suriElement(five.heaven), suriElement(five.human), suriElement(five.earth)];
  const entry = data.samjae.get(samjaeKey(...combo));
  return {
    combo,
    grade: entry ? entry.grade : "bad",
    gradeRaw: entry ? entry.gradeRaw : "",
    disputed: entry ? entry.flag === "disputed" : false,
  };
}

/** 획수 음양: 성·이름 모든 글자가 전부 양이거나 전부 음이면 0, 섞이면 1(§6.5b). */
export function yinYangScore(strokes: number[]): number {
  const kinds = new Set(strokes.map(strokeYinYang));
  return kinds.size > 1 ? 1 : 0;
}
