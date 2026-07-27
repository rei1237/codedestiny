/**
 * 프롬프트 누출 탐지 패턴의 로케일 분기.
 *
 * 문제는 양방향이다.
 *   (a) 영어 응답에서는 `/프롬프트/` 가 절대 안 걸려 **누출 탐지가 무력화**된다.
 *   (b) 반대로 라우트별 한국어 패턴에 섞여 있는 `\bAI\b`·`chapter`·`job`·`progress` 가
 *       **영어 상담문의 정상 단어를 오탐**한다. 탐지 전용 라우트는 LLM 1회 낭비로 끝나지만,
 *       life-book-ai·sukuyo-compatibility-ai 는 `.replace(FORBIDDEN, "")` 로 본문에서
 *       그 단어를 잘라내 결과를 조용히 훼손한다.
 *
 * 🔴 ko 패턴은 여기서 재정의하지 않는다. 라우트마다 다르게 튜닝돼 있어서 한 벌로 합치면
 *    살아 있는 ko 유료 트래픽의 동작이 바뀐다. 이 모듈은 **비-ko 로케일의 패턴만** 공급하고,
 *    ko 는 호출자가 넘긴 기존 패턴을 그대로 돌려준다.
 */

import { getAmbientAiLocale } from "./ai-locale-context.js";

/** 어떤 언어의 출력에서도 진짜 누출인 신호. */
const UNIVERSAL_LEAK_PATTERNS = [
  /rawProviderDebug/i,
  /providerReason/i,
  /systemInstruction/i,
  /generationConfig/i,
  /maxOutputTokens/i,
  /thinkingBudget/i,
  /```/,
];

const LOCALE_LEAK_PATTERNS = {
  en: [
    /\bsystem prompt\b/i,
    /\bas an AI\b/i,
    /\bAI (language )?model\b/i,
    /\bthe (internal )?instructions? (above|below)\b/i,
    /\bthis feature\b/i,
  ],
  ja: [/プロンプト/, /内部指示/, /システムプロンプト/],
  "zh-CN": [/提示词/, /系统提示/, /内部指令/],
  "zh-TW": [/提示詞/, /系統提示/, /內部指令/],
};

/** 현재 요청의 AI 출력 로케일. 컨텍스트 밖(cron 등)이면 ko. */
export function currentLeakGuardLocale() {
  return getAmbientAiLocale() || "ko";
}

/**
 * @param {RegExp[]|RegExp} koPatterns 라우트가 이미 쓰던 한국어 패턴(들). ko 에서는 이게 그대로 나간다.
 * @param {string} [locale]
 * @returns {RegExp[]}
 */
export function resolveForbiddenPatterns(koPatterns, locale = currentLeakGuardLocale()) {
  const base = Array.isArray(koPatterns) ? koPatterns : [koPatterns].filter(Boolean);
  if (locale === "ko") return base;
  return [...UNIVERSAL_LEAK_PATTERNS, ...(LOCALE_LEAK_PATTERNS[locale] || [])];
}

/**
 * 본문에서 패턴을 **잘라내도 되는가**.
 *
 * ko 에서만 허용한다. 비-ko 에서 삭제형을 돌리면 "job"·"AI"·"progress" 같은 정상 단어가
 * 문장 중간에서 사라져 결과가 걸레가 된다. 탐지(재생성 트리거)는 계속 하되 삭제는 하지 않는다.
 */
export function canStripForbiddenText(locale = currentLeakGuardLocale()) {
  return locale === "ko";
}
