/**
 * locale-normalize.js 의 타입 선언.
 *
 * 구현이 .js 인 이유는 그 파일 주석 참고(worker/Jest 가 .ts 를 못 읽는다).
 * 타입만 여기서 좁혀 준다 — RuntimeLocale 의 단일 정의도 여기다.
 */

export type RuntimeLocale =
  | "ko" | "en" | "ja" | "zh-CN" | "zh-TW" | "vi" | "hi" | "es" | "fr" | "de" | "nl" | "ms";

export declare const RUNTIME_LOCALES: readonly RuntimeLocale[];

export declare function isRuntimeLocale(value: string): value is RuntimeLocale;

export declare function normalizeLocale(value?: string | null): RuntimeLocale;
