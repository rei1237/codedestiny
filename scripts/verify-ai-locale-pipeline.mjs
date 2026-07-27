#!/usr/bin/env node
/**
 * AI 출력 로케일 파이프의 불변식 가드.
 *
 * 런타임 테스트로는 잡기 어려운 것들만 소스에서 단언한다. 특히 (2)(3)은 회귀하면
 * **결제된 영어 요청이 환불되거나 본문이 훼손**되는데, 증상이 조용해서 알아채기 어렵다.
 *
 * 실행: node scripts/verify-ai-locale-pipeline.mjs
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const failures = [];

function read(relPath) {
  return readFileSync(resolve(root, relPath), "utf8");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

// (1) 언어 지시는 캐시 키 계산 **이전에** 붙어야 한다.
//     buildCacheKey 가 systemPrompt 를 해시에 포함하므로, 순서가 뒤집히면 ko 응답이
//     en 사용자에게 캐시 히트한다.
{
  const source = read("lib/llm-client.ts");
  assert(
    /const localized = applyOutputLocale\(request\);[\s\S]{0,200}withLLMCache\(localized/.test(source),
    "lib/llm-client.ts: applyOutputLocale 이 withLLMCache 앞에서 호출돼야 한다 (캐시 언어 분리)",
  );
  assert(
    /systemPrompt: \[request\.systemPrompt \|\| "", directive\]/.test(source),
    "lib/llm-client.ts: 언어 지시가 systemPrompt 에 들어가야 캐시 분리와 Workers AI 폴백이 함께 커버된다",
  );
  assert(
    /if \(!directive\) return request;/.test(source),
    "lib/llm-client.ts: ko(빈 지시문)는 request 를 그대로 돌려줘야 한다 (기존 트래픽 보존)",
  );
}

// (2) 결제 후 환불 유발 지점. pushReadableValue 가 한글 단독 조건으로 되돌아가면
//     영어 응답이 통째로 폐기돼 hasRenderableLlmText 가 false 가 된다.
{
  const source = read("lib/llm-text.js");
  assert(
    !/if \(value\.length >= 12 && \/\[가-힣\]\/\.test\(value\)\) values\.push/.test(source),
    "lib/llm-text.js: pushReadableValue 가 한글 단독 조건으로 회귀했다 — 영어 응답이 환불된다",
  );
  assert(
    /CJK_SCRIPT_PATTERN/.test(source),
    "lib/llm-text.js: CJK+라틴 판별(isReadableValue)이 있어야 한다",
  );
  assert(
    /\[\.!\?…。！？\]/.test(source),
    "lib/llm-text.js: endsWithSentence 가 전각 종결부호(。！？)를 인식해야 한다",
  );
}

// (3) 금지어 삭제형은 ko 에서만. 무조건 .replace 로 돌아가면 영어 본문에서
//     "job"·"AI"·"progress"·"chapter" 가 문장 중간에서 사라진다.
{
  const lifeBook = read("worker/routes/life-book-ai.js");
  assert(
    /canStripForbiddenText\(\)/.test(lifeBook),
    "worker/routes/life-book-ai.js: cleanForbiddenResult 가 canStripForbiddenText 가드를 써야 한다",
  );
  assert(
    !/clean\(value, LIFE_BOOK_RESULT_TEXT_MAX_CHARS\)\.replace\(FORBIDDEN_RESULT_PATTERN/.test(lifeBook),
    "worker/routes/life-book-ai.js: 무조건부 .replace(FORBIDDEN_RESULT_PATTERN) 이 되살아났다",
  );

  const sukuyo = read("worker/routes/sukuyo-compatibility-ai.js");
  assert(
    /if \(canStripForbiddenText\(\)\)/.test(sukuyo),
    "worker/routes/sukuyo-compatibility-ai.js: sanitizeConsultationText 가 canStripForbiddenText 가드를 써야 한다",
  );
}

// (4) 워커 진입점에서 로케일을 잡아야 한다. 여기가 빠지면 앰비언트가 항상 비어
//     모든 응답이 조용히 ko 로 떨어진다 — 에러도 로그도 없다.
{
  const source = read("worker/index.js");
  assert(
    /runWithAiLocale\(resolveAiLocaleFromRequest\(args\[0\]\)/.test(source),
    "worker/index.js: createLazyRouteHandler 가 runWithAiLocale 로 감싸야 한다",
  );
}

// (5) gemini 래퍼의 필드 화이트리스트에 locale 이 있어야 한다. 빠지면 중간에서 유실된다.
{
  for (const relPath of ["worker/lib/gemini.js", "worker/lib/gemini-client.js"]) {
    assert(
      /locale: clean\(options\.locale\) \|\| getAmbientAiLocale\(\)/.test(read(relPath)),
      `${relPath}: callLLM 인자에 locale 이 포함돼야 한다 (화이트리스트라 빠지면 유실)`,
    );
  }
}

// (6) 클라이언트 헤더 주입. 빠지면 워커가 쿠키/Accept-Language 로만 추측하게 된다.
{
  const source = read("app/_lib/auth-client.ts");
  assert(
    /headers\.set\(AI_LOCALE_HEADER, detectLocale\(\)\)/.test(source),
    "app/_lib/auth-client.ts: buildAuthRequest 가 AI_LOCALE_HEADER 를 실어야 한다",
  );
}

// (7) worker 가 임포트하는 로케일 모듈은 .ts 면 안 된다.
//     이 레포 Jest 에는 TS 프리셋이 없어서(jest.config.cjs) 체인의 테스트가 전부 파싱 단계에서 깨진다.
{
  for (const relPath of ["worker/lib/ai-locale-context.js", "worker/lib/llm-leak-guard.js"]) {
    assert(
      !/from "[^"]*\.ts"/.test(read(relPath)),
      `${relPath}: worker 코드가 .ts 를 임포트하면 기존 Jest 테스트가 전부 깨진다`,
    );
  }
}

if (failures.length) {
  console.error("[verify:ai-locale-pipeline] FAILED");
  for (const message of failures) console.error(`  - ${message}`);
  process.exit(1);
}

console.log("[verify:ai-locale-pipeline] ok (7 invariants)");
