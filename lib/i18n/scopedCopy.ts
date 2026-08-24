"use client";

import { useMemo } from "react";
import { useTPick, type TranslatePick } from "./useT";

/**
 * 소스가 정본인 한국어 상수를 사전 값으로 갈아끼운다.
 *
 * 🔴 `useT` 가 아니라 `useTPick` 위에 있다. 이 방식을 쓰는 피처들은 한국어가 소스 정본이라
 * `ko.json` 에 해당 네임스페이스가 없고, `useT` 는 키가 없으면 "번역을 준비 중입니다"를
 * 돌려주므로 한국어 화면이 통째로 덮인다. `useTPick` 은 값이 없으면 넘긴 원문을 그대로
 * 유지한다 — 정적 셸의 `_pvwTrKeep` 과 같은 계약이다.
 *
 * 구조는 건드리지 않고 **문자열만** 바꾼다. 스프라이트 좌표처럼 같은 객체에 섞여 있는
 * 숫자·불리언은 그대로 통과한다.
 *
 * 🔴 `skipKeys` 는 **문자열인데 문구가 아닌** 필드를 위한 것이다. 컴포넌트가 직접 쓴 KO 상수는
 * 화면 문구만 담지만 `data/` 상수는 그렇지 않다 — `id: "lotus-moon"` 은 조회 키이고
 * `stage: "candle"` 은 씬 판별자라, 사전이 이걸 덮으면 조회가 어긋나거나 흐름이 죽는다.
 * 이름이 걸리면 그 필드는 하위까지 통째로 원문을 유지한다.
 */
function localize<T>(pick: TranslatePick, ns: string, source: T, skip: ReadonlySet<string>): T {
  if (typeof source === "string") return (pick(ns, source) ?? source) as unknown as T;
  if (Array.isArray(source)) {
    return source.map((item, index) => localize(pick, `${ns}.${index}`, item, skip)) as unknown as T;
  }
  if (source && typeof source === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
      out[key] = skip.has(key) ? value : localize(pick, `${ns}.${key}`, value, skip);
    }
    return out as unknown as T;
  }
  return source;
}

const NO_SKIP: ReadonlySet<string> = new Set();

export type ScopedCopyOptions = {
  /** 사전이 덮으면 안 되는 필드 이름. 🔴 모듈 최상위 상수로 두어야 참조가 안정적이다. */
  skipKeys?: readonly string[];
};

/**
 * `namespace.scope` 가 사전에서 이 상수가 차지하는 자리다(`<namespace>.<scope>.<필드경로>`).
 *
 * 🔴 `ko` 는 **모듈 최상위 상수**여야 한다. 렌더마다 새로 만든 객체를 넘기면 참조가 매번
 * 달라져 useMemo 가 매 렌더 다시 돌고, 그 결과가 자식의 props 로 내려가면 그쪽 메모까지
 * 연쇄로 깨진다. `data/` 상수를 그대로 넘기는 것도 같은 이유로 안전하다.
 */
export function useScopedCopy<T>(namespace: string, scope: string, ko: T, options?: ScopedCopyOptions): T {
  const pick = useTPick();
  const skipKeys = options?.skipKeys;
  // options 객체 자체는 인라인이어도 되지만 skipKeys 배열은 상수여야 메모가 유지된다.
  const skip = useMemo(() => (skipKeys ? new Set(skipKeys) : NO_SKIP), [skipKeys]);
  return useMemo(() => localize(pick, `${namespace}.${scope}`, ko, skip), [pick, namespace, scope, ko, skip]);
}
