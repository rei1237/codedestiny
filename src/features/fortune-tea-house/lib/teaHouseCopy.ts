"use client";

import { useScopedCopy, type ScopedCopyOptions } from "@/lib/i18n/scopedCopy";

/**
 * 운명의 찻집 컴포넌트의 한국어 원문을 사전 값으로 갈아끼운다.
 *
 * 구현은 `@/lib/i18n/scopedCopy` 의 `useScopedCopy` 하나다 — `useTPick` 위에서 구조를 걸어
 * 다니며 문자열만 바꾸고, `skipKeys` 로 문구가 아닌 필드(조회 키·CSS 토큰)를 지킨다.
 * 계약과 함정(왜 `useT` 가 아닌지, `ko`·`skipKeys` 가 왜 모듈 최상위여야 하는지)은 그 파일에 있다.
 *
 * 🔴 이 얇은 껍데기를 없애지 말 것 — 가드
 * (`__tests__/ui/fortune-tea-house-i18n.static.test.js`)가 `useTeaHouseCopy(` 호출을 전수
 * 발견해 검사 대상을 정한다. 컴포넌트가 `useScopedCopy` 를 직접 부르면 그 자리가 검사에서 빠진다.
 */
export type TeaHouseCopyOptions = ScopedCopyOptions;

/** `scope` 는 사전에서 이 컴포넌트가 차지하는 자리다(`fortuneTeaHouse.<scope>.<필드경로>`). */
export function useTeaHouseCopy<T>(scope: string, ko: T, options?: TeaHouseCopyOptions): T {
  return useScopedCopy("fortuneTeaHouse", scope, ko, options);
}
