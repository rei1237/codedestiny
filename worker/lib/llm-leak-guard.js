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

import { stripEmptyParens } from "../../lib/llm-text.js";
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

/**
 * 🔴 여기 넣는 패턴은 **그 언어의 평범한 상담 문장을 절대 건드리면 안 된다.**
 *    맨 단어("AI"·"IA"·"KI"·"job")를 그대로 두면 프랑스어 "J'ai"·베트남어 "Ai" 처럼
 *    최빈 단어가 걸린다(2026-08-20 실측, 그게 이 모듈이 생긴 이유다). 누출은 언제나
 *    **구절**로 나타나므로("en tant qu'IA", "als eine KI") 구절로만 잡는다.
 *    scripts/verify-ai-locale-pipeline.mjs (13)이 12개 로케일 평문에 실제로 돌려 본다.
 */
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
  vi: [
    /\blời nhắc hệ thống\b/i,
    /\bvới tư cách (là )?(một )?(AI|trí tuệ nhân tạo)\b/i,
    /\bhướng dẫn (nội bộ|hệ thống)\b/i,
    /\bmô hình ngôn ngữ\b/i,
  ],
  // 데바나가리는 \b(ASCII 단어 경계)가 의미 없으므로 구절 자체로 찾는다.
  hi: [/सिस्टम प्रॉम्प्ट/, /आंतरिक निर्देश/, /भाषा मॉडल/, /एआई के रूप में/],
  es: [
    /\bprompt del sistema\b/i,
    /\bcomo (una )?(IA|inteligencia artificial)\b/i,
    /\binstrucciones (internas|del sistema|anteriores)\b/i,
    /\bmodelo de lenguaje\b/i,
  ],
  fr: [
    /\bprompt (système|systeme)\b/i,
    /\ben tant qu'(IA|intelligence artificielle)\b/i,
    /\binstructions (internes|système|ci-dessus)\b/i,
    /\bmodèle de langage\b/i,
  ],
  de: [
    /\bsystem-?prompt\b/i,
    /\bals (eine )?KI\b/i,
    /\binterne Anweisungen?\b/i,
    /\bSprachmodell\b/i,
  ],
  nl: [
    /\bsysteemprompt\b/i,
    /\bals (een )?AI\b/i,
    /\binterne instructies\b/i,
    /\btaalmodel\b/i,
  ],
  ms: [
    /\bprompt sistem\b/i,
    /\bsebagai (satu |sebuah )?AI\b/i,
    /\barahan (dalaman|sistem)\b/i,
    /\bmodel bahasa\b/i,
  ],
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

/**
 * 내부 데이터 키 경로("sanFangSiZheng.lifePalace.mainStars")를 본문에서 찾는다.
 *
 * 계산 요약 객체를 그대로 프롬프트에 실으면 모델이 그 키 이름을 상담문에 인용한다.
 * 위 UNIVERSAL_LEAK_PATTERNS 는 Gemini 파라미터 이름 6개를 고정 나열한 것이라 임의 키를
 * 잡지 못하므로 별도로 둔다.
 *
 * 🔴 낙타 등(`[a-z][A-Z]` 인접)이 있는 후보만 남긴다. 이게 오탐 방지의 전부다:
 *    "code-destiny.com"(→ destiny.com) · "index.html" · "package.json" · "www.google.com"
 *    은 낙타 등이 없어 탈락하고, "3.5" · "1.2.3" 은 문자로 시작하지 않아 애초에 안 걸린다.
 *    낙타 등 없는 경로("chart.lagna")는 여기서 못 잡으므로 호출부가 실제 전송한 데이터의
 *    키 목록을 labelByToken 으로 함께 넘겨 정확히 지운다.
 *
 * @param {string} text
 * @returns {string[]} 중복 제거된 경로 목록
 */
const KEY_PATH_PATTERN = /\b[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)+/g;

export function findInternalKeyPaths(text) {
  const raw = String(text || "");
  KEY_PATH_PATTERN.lastIndex = 0;
  const found = [];
  let match = KEY_PATH_PATTERN.exec(raw);
  while (match) {
    if (/[a-z][A-Z]/.test(match[0]) && !found.includes(match[0])) found.push(match[0]);
    match = KEY_PATH_PATTERN.exec(raw);
  }
  return found;
}

// 토큰을 들어낸 자리에 남는 빈 괄호·중복 공백·고아 구분자를 정리한다.
function tidyScrubbedText(text) {
  return stripEmptyParens(text)
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+([,.!?…、。])/g, "$1")
    .replace(/([·、,])[ \t]*(?=[·、,])/g, "")
    .replace(/(^|\n)[ \t]*[·、,][ \t]*/g, "$1")
    .trim();
}

/**
 * 본문에 새어 나온 내부 키 경로를 한글 라벨로 바꾸거나 지운다.
 *
 * 🔴 폐기가 아니라 치환이다 — 유료 상담문에서 키 하나 때문에 문단을 버리지 않는다.
 * 치환 결과가 통째로 비면 원문을 그대로 돌려준다.
 *
 * @param {string} text
 * @param {Map<string,string>|Record<string,string>} [labelByToken]
 *   전체 경로 또는 마지막 세그먼트 → 한글 라벨. 없으면 토큰을 제거만 한다.
 * @returns {string}
 */
export function scrubInternalKeyPaths(text, labelByToken) {
  const raw = String(text || "");
  const paths = findInternalKeyPaths(raw);
  const extraTokens = labelByToken instanceof Map
    ? [...labelByToken.keys()]
    : Object.keys(labelByToken || {});
  // 낙타 등 없는 경로도 호출부가 알려준 키 목록에 있으면 함께 지운다.
  const targets = [...paths, ...extraTokens.filter((token) => token.includes(".") && raw.includes(token))];
  if (!targets.length) return raw;

  const labels = labelByToken instanceof Map ? labelByToken : new Map(Object.entries(labelByToken || {}));
  // 긴 경로부터 치환해야 "a.b.c"가 "a.b"로 먼저 잘리지 않는다.
  let out = raw;
  for (const path of [...new Set(targets)].sort((a, b) => b.length - a.length)) {
    const label = labels.get(path) || labels.get(path.split(".").pop()) || "";
    out = out.split(path).join(label);
  }
  const cleaned = tidyScrubbedText(out);
  return cleaned ? cleaned : raw;
}
