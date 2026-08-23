"use client";

import { useMemo } from "react";
import { useTPick, type TranslatePick } from "@/lib/i18n/useT";

/**
 * 운명의 찻집 컴포넌트의 한국어 원문을 사전 값으로 갈아끼운다.
 *
 * 🔴 `useT` 가 아니라 `useTPick` 을 쓴다. 이 피처의 한국어는 소스가 정본이라
 * `ko.json` 에 `fortuneTeaHouse` 네임스페이스가 없고, `useT` 는 키가 없으면
 * "번역을 준비 중입니다"를 돌려주므로 한국어 화면이 통째로 덮인다. `useTPick` 은
 * 값이 없으면 넘긴 원문을 그대로 유지한다 — 정적 셸의 `_pvwTrKeep` 과 같은 계약이다.
 *
 * 구조는 건드리지 않고 **문자열만** 바꾼다. 스프라이트 좌표처럼 같은 객체에 섞여 있는
 * 숫자·불리언은 그대로 통과한다.
 */
function localize<T>(pick: TranslatePick, ns: string, source: T): T {
  if (typeof source === "string") return (pick(ns, source) ?? source) as unknown as T;
  if (Array.isArray(source)) return source.map((item, index) => localize(pick, `${ns}.${index}`, item)) as unknown as T;
  if (source && typeof source === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
      out[key] = localize(pick, `${ns}.${key}`, value);
    }
    return out as unknown as T;
  }
  return source;
}

/**
 * `scope` 는 사전에서 이 컴포넌트가 차지하는 자리다(`fortuneTeaHouse.<scope>.<필드경로>`).
 *
 * 🔴 `ko` 는 **모듈 최상위 상수**여야 한다. 렌더마다 새로 만든 객체를 넘기면 참조가 매번
 * 달라져 useMemo 가 매 렌더 다시 돌고, 그 결과가 자식의 props 로 내려가면 그쪽 메모까지
 * 연쇄로 깨진다.
 */
export function useTeaHouseCopy<T>(scope: string, ko: T): T {
  const pick = useTPick();
  return useMemo(() => localize(pick, `fortuneTeaHouse.${scope}`, ko), [pick, scope, ko]);
}
