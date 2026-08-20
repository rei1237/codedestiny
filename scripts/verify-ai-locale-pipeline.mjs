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
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { AI_OUTPUT_LOCALES, buildOutputLanguageDirective } from "../lib/i18n/ai-locale.js";

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

// (7) "출력이 한국어 토큰을 포함해야 통과"하는 검증기는 비-ko 에서 반드시 실패한다.
//     모델이 정상적으로 답해도 매번 반려돼 한국어 템플릿으로 되돌아가므로 언어 전환이 무력화된다.
{
  const source = read("worker/routes/destiny-compass.js");
  assert(
    /if \(\(getAmbientAiLocale\(\) \|\| "ko"\) !== "ko"\) return true;/.test(source),
    "worker/routes/destiny-compass.js: isFaithful 의 라벨·금지어 검사가 ko 전용이어야 한다 (비-ko 는 항상 UNFAITHFUL 이 된다)",
  );
}

// (8) worker 가 임포트하는 로케일 모듈은 .ts 면 안 된다.
//     이 레포 Jest 에는 TS 프리셋이 없어서(jest.config.cjs) 체인의 테스트가 전부 파싱 단계에서 깨진다.
{
  for (const relPath of ["worker/lib/ai-locale-context.js", "worker/lib/llm-leak-guard.js"]) {
    assert(
      !/from "[^"]*\.ts"/.test(read(relPath)),
      `${relPath}: worker 코드가 .ts 를 임포트하면 기존 Jest 테스트가 전부 깨진다`,
    );
  }
}

// (9) 지시문 빌더 자체가 5개 AI 출력 로케일 전부에서 올바른 모양을 낸다.
//     실제 모델(Gemini/Workers AI) 호출 없이도 검증 가능한 순수 문자열 조립 단언이다 —
//     "모델이 지시를 따르는지"는 이 스크립트로 확인할 수 없고(그건 실호출 영역), 이건
//     "지시문 자체가 깨지지 않았는지"만 본다. zh-TW 는 2026-08 에 신설된 로케일이라
//     번체 표기(繁體中文)가 깨지면 en/ja/zh-CN 은 멀쩡한데 zh-TW 만 조용히 무력화된다.
{
  assert(
    buildOutputLanguageDirective("ko") === "",
    "buildOutputLanguageDirective('ko') 는 빈 문자열이어야 한다 (기존 트래픽 100% 보존)",
  );

  const nonKoLocales = AI_OUTPUT_LOCALES.filter((locale) => locale !== "ko");
  assert(nonKoLocales.length === 4, "AI_OUTPUT_LOCALES 는 ko 외 4개(en/ja/zh-CN/zh-TW)여야 한다");

  for (const locale of nonKoLocales) {
    const directive = buildOutputLanguageDirective(locale);
    assert(
      directive.startsWith("[OUTPUT LANGUAGE — HIGHEST PRIORITY]"),
      `buildOutputLanguageDirective('${locale}') 가 HIGHEST PRIORITY 헤더로 시작해야 한다`,
    );
    assert(
      /overrides every other language instruction above/.test(directive),
      `buildOutputLanguageDirective('${locale}') 에 기존 한국어 리터럴 지시를 무효화하는 문구가 있어야 한다`,
    );
    assert(
      /한국어로 작성/.test(directive),
      `buildOutputLanguageDirective('${locale}') 가 "한국어로 작성" 리터럴을 명시적으로 겨냥해야 한다`,
    );
  }

  assert(
    /Write the ENTIRE response in English only\./.test(buildOutputLanguageDirective("en")),
    "en 지시문이 손상되었다",
  );
  assert(
    /日本語のみで書いてください/.test(buildOutputLanguageDirective("ja")),
    "ja 지시문이 손상되었다",
  );
  assert(
    /请全文只用简体中文书写/.test(buildOutputLanguageDirective("zh-CN")),
    "zh-CN 지시문이 손상되었다",
  );
  assert(
    /請全文只用繁體中文書寫/.test(buildOutputLanguageDirective("zh-TW")),
    "zh-TW 지시문이 손상되었다",
  );
}

// (10)(11) 비-ko 응답을 망가뜨리는 두 형태를 소스에서 전수로 잡는다.
//
// 🔴 손으로 쓴 대상 목록을 두지 않는다(원칙 10) — LLM 을 부르는 worker 파일을 git 에서
//    전수 발견하고, 새 라우트가 같은 실수를 하면 그 파일에서 실패한다.
{
  // git grep 은 0건이면 exit 1 이다. 그대로 두면 스크립트가 알 수 없는 오류로 죽어
  // '왜 실패했는지' 가 사라진다 — 빈 목록으로 받아 아래 바닥 단언이 말하게 한다.
  let aiFiles = [];
  try {
    aiFiles = execFileSync("git", ["grep", "-l", "callGeminiText\\|callLLM\\|callGeminiJson", "--", "worker/"], { cwd: root, encoding: "utf8" })
      .split("\n")
      .filter(Boolean);
  } catch (grepError) {
    aiFiles = [];
  }
  assert(
    aiFiles.length >= 20,
    `LLM 호출 파일을 ${aiFiles.length}개만 찾았다 — 이 검사가 대상 없이 통과할 뻔했다`,
  );

  // (11) ko 금지 패턴을 비-ko 응답에 그대로 돌리면 **평범한 단어가 반려된다.**
  //
  //      단어 목록으로 판정하지 않는다 — 목록은 낡는다. 12개 로케일의 평범한 상담 문장을
  //      두고 패턴을 실제로 돌려 본다. 실측(2026-08-20)으로 잡힌 것:
  //        · /\bjob\b|\bprogress\b/  → "Your job situation improves and progress comes" 반려
  //        · /\bAI\b/i               → 프랑스어 "J'ai", 베트남어 "Ai" 반려 (두 언어의 최빈 단어)
  //        · /chapter/i              → "A chapter of your life closes" 반려
  //
  //      걸리는 패턴은 worker/lib/llm-leak-guard.js 의 resolveForbiddenPatterns 를 거쳐야 한다.
  //      ko 에서는 넘긴 패턴을 그대로 돌려주므로 한국어 판정은 바뀌지 않는다.
  const ORDINARY_PROSE = [
    ["en", "Your job situation improves and steady progress comes through the year."],
    ["en", "A chapter of your life closes quietly and a calmer one opens."],
    ["fr", "J'ai confiance en votre chemin, et le travail avance doucement."],
    ["vi", "Ai cũng có lúc gặp khó khăn, nhưng công việc của bạn sẽ ổn định."],
    ["de", "Dein Job stabilisiert sich und die Verantwortung waechst langsam."],
    ["es", "Tu casa profesional se fortalece y el trabajo avanza con calma."],
    ["nl", "Je werk wordt rustiger en er komt stap voor stap vooruitgang."],
    ["ms", "Kerjaya anda menjadi lebih stabil dan rezeki datang perlahan."],
    ["hi", "इस वर्ष आपका करियर मजबूत होगा और काम में प्रगति दिखाई देगी।"],
    ["ja", "今年は仕事の流れが安定し、責任が少しずつ増えていきます。"],
    ["zh-CN", "今年事业运稳定，工作上的责任会慢慢加重。"],
    ["ko", "올해는 직장 운이 안정되고 꾸준한 성과가 따릅니다."],
  ];
  const HANGUL = /[가-힣]/;
  for (const rel of aiFiles) {
    const source = read(rel);
    const decls = [...source.matchAll(/^const ([A-Z0-9_]+) = \/(.+?)\/([gimsuy]*);$/gm)];
    for (const [, name, body, flags] of decls) {
      if (!HANGUL.test(body)) continue; // ko 전용 패턴만 대상
      if (!new RegExp(`${name}\\.test\\(`).test(source)) continue; // 응답에 안 쓰이면 무관
      // 🔴 면제는 두지 않는다. leak-guard 를 거치는 패턴은 `${name}.test(` 형태가 아예 없어
      //    위 조건에서 이미 걸러진다. '이 파일은 leak-guard 를 쓴다' 같은 파일 단위 면제를
      //    두면 안 쓰이는 헬퍼 한 줄만 남겨도 그 파일이 통째로 검사 밖으로 나간다(실측 2026-08-20).
      let pattern;
      try { pattern = new RegExp(body, flags.replace("g", "")); } catch { continue; }
      const hits = ORDINARY_PROSE.filter(([locale, text]) => locale !== "ko" && pattern.test(text));
      assert(
        hits.length === 0,
        `${rel}: ${name} 이 비-ko 의 평범한 상담 문장을 반려한다 — `
          + `${hits.map(([locale, text]) => `${locale} "${text.slice(0, 46)}…"`).join(" · ")}\n`
          + `    worker/lib/llm-leak-guard.js 의 resolveForbiddenPatterns 를 거치게 하라(ko 판정은 안 바뀐다).`,
      );
    }
  }
  // (10) 한국어 토큰이 **있어야** 통과하는 앵커 검사. 비-ko 에서는 원리적으로 통과할 수 없어
  //      정상 응답이 매번 반려되고, 재생성·repair 왕복이 헛돈다.
  //      정본 선례: destiny-compass.js isFaithful · fortune-tea-house.js koreanAnchorsApply
  const ANCHOR_GATES = [
    {
      rel: "worker/routes/fortune-tea-house.js",
      marker: "function assertTarotAnchorCoverage(joined, result, fallback) {",
      expect: /^function assertTarotAnchorCoverage\([^)]*\) \{\s*\n\s*if \(!koreanAnchorsApply\(\)\) return;/m,
      hint: "assertTarotAnchorCoverage 는 비-ko 에서 통째로 건너뛰어야 한다",
    },
    {
      rel: "worker/routes/fortune-tea-house.js",
      marker: "fallback.consultationMode === \"sajuCompatibility\"",
      expect: /if \(koreanAnchorsApply\(\) && fallback\.consultationMode === "sajuCompatibility"/,
      hint: "사주 궁합 앵커(상대 이름·일간 천간)는 ko 에서만 검사해야 한다",
    },
    {
      rel: "worker/routes/fortune-tea-house.js",
      marker: "!detailText.includes(cardName)",
      expect: /if \(koreanAnchorsApply\(\) && cardName && !detailText\.includes\(cardName\)\)/,
      hint: "카드 이름(nameKo) 앵커는 ko 에서만 검사해야 한다",
    },
    {
      rel: "worker/routes/destiny-compass.js",
      marker: "function isFaithful(",
      expect: /if \(\(getAmbientAiLocale\(\) \|\| "ko"\) !== "ko"\) return true;/,
      hint: "isFaithful 의 라벨·금지어 검사는 ko 전용이어야 한다",
    },
  ];
  for (const gate of ANCHOR_GATES) {
    const source = read(gate.rel);
    assert(source.includes(gate.marker), `${gate.rel}: 앵커 게이트 마커(${gate.marker})를 찾지 못했다 — 이 검사가 무력화됐다`);
    assert(gate.expect.test(source), `${gate.rel}: ${gate.hint}`);
  }
}

if (failures.length) {
  console.error("[verify:ai-locale-pipeline] FAILED");
  for (const message of failures) console.error(`  - ${message}`);
  process.exit(1);
}

console.log("[verify:ai-locale-pipeline] ok (11 invariants)");
