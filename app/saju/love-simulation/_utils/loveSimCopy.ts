"use client";

import { useScopedCopy, type ScopedCopyOptions } from "@/lib/i18n/scopedCopy";

/**
 * 러브 시뮬레이션 — **콘텐츠 본문**(사주 해석으로 조립하는 문장)의 로케일화.
 *
 * 🔴 같은 피처 안의 `LoveSimulationEngine.tsx` 의 `LOVE_SIMULATION_COPY_TRANSLATIONS` 와
 * 역할이 다르다. 저쪽은 버튼·필드 라벨·에러 같은 **UI 크롬**을 로케일별 표로 들고 있고
 * (2026-08-25 실측: ko·en 만 실제 문구이고 나머지 10개는 en 별칭이다 — 그 축은
 * `docs/handoff/locale-service-optimization-2026-08-25.md` 소관이다), 여기는 `_utils` 의
 * 해석 엔진이 조립하는 **문장 템플릿**을 사전 값으로 갈아끼운다.
 * 마스터 인연의 서에서 `_lib/copy.ts` 와 `_lib/contentCopy.ts` 를 가른 것과 같은 경계다.
 *
 * 구현은 운명의 찻집·마스터 인연의 서와 같은 `useScopedCopy` 다(계약·함정은
 * `@/lib/i18n/scopedCopy`). 사전 자리는 `loveSimulation.<scope>.<필드경로>` 이고,
 * 번역 정본은 `i18n/authored/loveSimulation-*.json` 이다.
 *
 * 🔴 이 얇은 껍데기를 없애지 말 것 — 가드
 * (`__tests__/ui/love-simulation-content-i18n.static.test.js`)가 `useLoveSimCopy(` 호출을 전수
 * 발견해 검사 대상을 정한다. 컴포넌트가 `useScopedCopy` 를 직접 부르면 그 자리가 검사에서 빠진다.
 */
export type LoveSimCopyOptions = ScopedCopyOptions;

export function useLoveSimCopy<T>(scope: string, ko: T, options?: LoveSimCopyOptions): T {
  return useScopedCopy("loveSimulation", scope, ko, options);
}
