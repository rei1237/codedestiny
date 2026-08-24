"use client";

import { useScopedCopy, type ScopedCopyOptions } from "@/lib/i18n/scopedCopy";

/**
 * 마스터 인연의 서 — **콘텐츠 본문**(프롤로그 대사·랜딩 마케팅 문구)의 로케일화.
 *
 * 🔴 `_lib/copy.ts` 와 역할이 다르다. 저쪽은 버튼·라벨·에러 같은 **UI 크롬**을 로케일별
 * 표로 들고 있고, 여기는 `data/` 에 있는 **콘텐츠 정본**을 사전 값으로 갈아끼운다.
 * 콘텐츠의 한국어는 `data/*.ts` 가 정본이라 표로 옮기지 않는다 —
 * `scripts/verify-master-love-codex-flow.mjs` 가 `data/prologue.ts` 소스에서 한국어 마커를
 * 읽어 프롤로그가 두 체계를 겹쳐 본다고 말하는지 단언한다.
 *
 * 구현은 운명의 찻집과 같은 `useScopedCopy` 다(계약·함정은 `@/lib/i18n/scopedCopy`).
 * 사전 자리는 `masterLoveCodex.<scope>.<필드경로>` 이고, 번역 정본은
 * `i18n/authored/masterLoveCodex-*.json` 이다.
 *
 * 🔴 이 얇은 껍데기를 없애지 말 것 — 가드
 * (`__tests__/ui/master-love-codex-content-i18n.static.test.js`)가 `useCodexContentCopy(`
 * 호출을 전수 발견해 검사 대상을 정한다. 컴포넌트가 `useScopedCopy` 를 직접 부르면 그 자리가
 * 검사에서 빠진다.
 */
export type CodexContentCopyOptions = ScopedCopyOptions;

export function useCodexContentCopy<T>(scope: string, ko: T, options?: CodexContentCopyOptions): T {
  return useScopedCopy("masterLoveCodex", scope, ko, options);
}
