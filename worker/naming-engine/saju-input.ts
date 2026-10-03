// 사주 래퍼(설계서 §6.7). 메인 사주 정본 buildSajuSnapshotFromBirth(calcPower·analyzeJohu·detectJong·
// applyRuntimeYongshinPolicy)를 import 만 하고 용신을 다시 계산하지 않는다.
// sajuAdapter.ts·calculateLocalResult·normalizeSaju.ts·KASI prefetch 는 쓰지 않는다.

import { buildSajuSnapshotFromBirth } from "../lib/saju-snapshot-from-birth.js";
import { ELEMENTS, NamingEngineError, parentOf, type Element } from "./types";

export interface NamingBirth {
  date: string; // YYYY-MM-DD
  time: string | null; // HH:MM, 모르면 null
  calendarType: "solar" | "lunar" | "lunar_leap";
}

export interface SajuNeeds {
  /** 최종 용신(power.yongshin) — 이름 자원오행이 맞으면 가점 */
  useful: Element[];
  /** 기신(power.kijishin) — 이름 자원오행이 맞으면 감점 */
  caution: Element[];
  /** 용신을 생하는 오행 중 용신·기신이 아닌 것(정본 정의의 파생, 재계산 아님) */
  support: Element[];
  /** 원국 8자(시간 미상이면 6자) 오행 개수 — 분포 보정용 */
  natalCounts: Record<Element, number>;
  timeUnknown: boolean;
  /** 종격 후보 — 결과에 "조건부" 고지 */
  jongConditional: boolean;
  basis: string;
}

const isElement = (value: unknown): value is Element => ELEMENTS.includes(value as Element);
const unique = (values: Element[]) => [...new Set(values)];

/** 정본 스냅샷 → 작명 필요/기피 오행. 순수 함수(테스트는 스냅샷 고정값으로 본다). */
export function sajuNeedsFromSnapshot(snapshot: any): SajuNeeds {
  const power = snapshot?.power;
  const useful = unique((power?.yongshin || []).filter(isElement));
  const caution = unique((power?.kijishin || []).filter(isElement)).filter((e) => !useful.includes(e));
  if (!useful.length) throw new NamingEngineError("saju-unavailable", "용신을 받지 못했다");
  const support = unique(useful.map(parentOf)).filter((e) => !useful.includes(e) && !caution.includes(e));
  const elements = snapshot?.natal?.elements || {};
  const natalCounts = Object.fromEntries(ELEMENTS.map((e) => [e, Number(elements[e]) || 0])) as Record<Element, number>;
  return {
    useful,
    caution,
    support,
    natalCounts,
    timeUnknown: snapshot?.calculationMeta?.timeUnknown === true,
    jongConditional: snapshot?.jong?.isJong === true,
    basis: String(snapshot?.analysisBasis || "") + (power?.yongshinPolicy ? ` · ${power.yongshinPolicy}` : ""),
  };
}

/** 정본 스냅샷 원본(기둥·오행 개수 포함). 라우트가 화면용 사주 요약을 같은 스냅샷에서 만든다. 계산 실패면 null. */
export function sajuSnapshotFromBirth(birth: NamingBirth, gender: "M" | "F" | "N"): any {
  const time = String(birth?.time || "").trim();
  // 정본은 isLeapMonth 를 읽지만(saju-snapshot-from-birth.js:59) JSDoc 에 빠져 있어 변수로 넘긴다 — 읽기 전용 파일이라 고치지 않는다.
  const birthInfo = {
    birthDate: String(birth?.date || "").trim(),
    birthTime: time,
    birthTimeUnknown: !time,
    calendarType: birth?.calendarType === "solar" ? "solar" : "lunar",
    isLeapMonth: birth?.calendarType === "lunar_leap",
    gender: gender === "M" ? "male" : gender === "F" ? "female" : "",
  };
  return buildSajuSnapshotFromBirth(birthInfo) || null;
}

export function sajuNeedsFromBirth(birth: NamingBirth, gender: "M" | "F" | "N"): SajuNeeds {
  const snapshot = sajuSnapshotFromBirth(birth, gender);
  if (!snapshot) throw new NamingEngineError("saju-unavailable", "생년월일로 사주를 계산하지 못했다");
  return sajuNeedsFromSnapshot(snapshot);
}
