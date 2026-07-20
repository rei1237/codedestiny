#!/usr/bin/env node
// naming-prompt(작명 AI) 기능 정적 검증.
// worker/routes/naming-prompt.js는 worker/lib/gemini.js -> lib/llm-client.ts -> lib/llm-cache.ts로
// 이어지는 확장자 없는 TS import 체인을 갖고 있어 plain node로 직접 import/실행할 수 없다
// (다른 8개 -ai 라우트도 같은 이유로 verify-*-ai-flow.mjs가 전부 정적 검사 방식이다).
// 대신 소스 텍스트에 기대되는 마커가 있는지/없는지로 검증한다.
// paid-feature-registry.js는 이 체인에 걸리지 않아 실제로 import해 라이브 검증한다.

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function rel(file) {
  return path.join(root, file);
}

function read(file) {
  const full = rel(file);
  if (!fs.existsSync(full)) {
    failures.push(`missing file: ${file}`);
    return "";
  }
  return fs.readFileSync(full, "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertIncludes(file, text, marker) {
  assert(text.includes(marker), `${file} missing marker: ${marker}`);
}

function assertNotIncludes(file, text, marker) {
  assert(!text.includes(marker), `${file} contains retired marker: ${marker}`);
}

// ---- 1. 죽은 컴포넌트("명운 프리미엄 작명" 잔재) 삭제 확인 ----
for (const file of [
  "app/components/HPremiumNamingSection.tsx",
  "app/components/KkulkkulManseryukMain.tsx",
]) {
  assert(!fs.existsSync(rel(file)), `retired file still exists: ${file}`);
}

// ---- 2. index.html: 구 바닐라 모달 제거 + 신규 타일 확인 (6개 미러 전체) ----
const shellFiles = [
  "index.html",
  "public/index.html",
  "public/static/index.html",
  "public/en/index.html",
  "public/ja/index.html",
  "public/zh/index.html",
];
for (const file of shellFiles) {
  const html = read(file);
  if (!html) continue;
  for (const marker of [
    "namingPromptModal",
    "naming-prompt-modal",
    "namingPromptForm",
    "gotoNamingPremium",
  ]) {
    assertNotIncludes(file, html, marker);
  }
  assertIncludes(file, html, 'href="/naming-ai"');
  assertIncludes(file, html, 'data-feature-key="premium-naming-prompt"');
}

// ---- 3. 결제 정책 등록: PER_USE_PAID_FEATURE_KEY_LIST 명시 등록 (라이브 검증) ----
const registryModule = await import("../worker/lib/paid-feature-registry.js");
assert(
  registryModule.PER_USE_PAID_FEATURE_KEYS.includes("premium-naming-prompt"),
  "premium-naming-prompt is not explicitly registered in PER_USE_PAID_FEATURE_KEY_LIST",
);
assert(
  registryModule.isPerUsePaidFeatureKey("premium-naming-prompt") === true,
  "getPaidFeatureBillingType(premium-naming-prompt) did not resolve to PER_USE",
);
const pricing = registryModule.FEATURE_KEY_PRICE_TABLE?.["premium-naming-prompt"];
assert(pricing?.cost === 300 && pricing?.amountKRW === 30000, "premium-naming-prompt pricing mismatch (expected 300 coins / 30000 KRW)");

// ---- 4. worker/routes/naming-prompt.js: LLM 직접호출 + 202/환불 배선 확인 (정적) ----
const route = read("worker/routes/naming-prompt.js");
for (const marker of [
  'import { callGeminiText } from "../lib/gemini.js";',
  'import { hasRenderableLlmText } from "../lib/llm-result-delivery.js";',
  'import { restoreMonthlyCreditLot } from "../lib/monthly-credit-store.js";',
  "async function beginNamingGeneration(",
  "async function generateNamingResult(",
  "async function markNamingGenerationFailed(",
  "async function refundNamingMonthlyCredit(",
  "async function restoreNamingAccessOnFailure(",
  "generatedResult",
  'status: "generating"',
  'status: "generation_failed"',
  "{ status: 202 }",
  "{ status: 503 }",
  // 9850c890 에서 waitUntil 백그라운드를 걷고 요청 안에서 생성을 끝내도록 되돌렸다
  // (Workers 요청 간 I/O 격리로 폴링 결과가 고착되던 문제). 실패는 503 재시도로 내려가고
  // 결과 조회는 202/503 으로 회수 가능해야 한다 — 그 계약을 단언한다.
  "async function handleGenerate(request, env, ctx",
  "clampSyncLlmTimeoutMs(",
  "retryable: true",
]) {
  assertIncludes("worker/routes/naming-prompt.js", route, marker);
}
// 45초 단락 함정: env.PREMIUM_GEMINI_TIMEOUT_MS를 timeoutMs 계산에 절대 쓰면 안 된다.
for (const marker of ["env.PREMIUM_GEMINI_TIMEOUT_MS ||", "env?.PREMIUM_GEMINI_TIMEOUT_MS ||"]) {
  assertNotIncludes("worker/routes/naming-prompt.js", route, marker);
}
// sajuEvidence는 이제 optional — 누락 시 무조건 400을 던지던 이전 동작이 남아있지 않은지 확인.
assertIncludes(
  "worker/routes/naming-prompt.js",
  route,
  "return { evidence: null, evidenceHash: \"\", baseInputHash: await buildInputHash(input) };",
);

// ---- 5. worker/index.js: AI 라우트 보안 래퍼 적용 확인 ----
const workerIndex = read("worker/index.js");
assertIncludes("worker/index.js", workerIndex, 'runAiRouteWithSecurity(request, env, "naming-prompt", handleNamingPromptRoutes, ctx)');

// ---- 6. 진입점 등록 확인 ----
assertIncludes("app/_lib/serviceSections.js", read("app/_lib/serviceSections.js"), '"/naming-ai"');
assertIncludes("app/components/HomeServiceSections.tsx", read("app/components/HomeServiceSections.tsx"), '"/naming-ai": "/naming-ai"');
assertIncludes("app/components/AppChrome.tsx", read("app/components/AppChrome.tsx"), '"/naming-ai"');

// ---- 7. app/naming-ai 프론트 파일 존재 + 핵심 계약 확인 (정적) ----
for (const file of [
  "app/naming-ai/page.tsx",
  "app/naming-ai/NamingAiRouteClient.tsx",
  "app/naming-ai/NamingAiClient.tsx",
  "app/naming-ai/namingRecommendations.ts",
  "app/naming-ai/result/page.tsx",
  "app/naming-ai/result/NamingAiResultClient.tsx",
]) {
  assert(fs.existsSync(rel(file)), `missing file: ${file}`);
}

const formClient = read("app/naming-ai/NamingAiClient.tsx");
for (const marker of [
  '"/api/naming-prompt/checkout"',
  '"/api/naming-prompt/generate"',
  "runBillingCoinGate",
  "beginPaidFeatureGateCheck",
  "/naming-ai/result?executionId=",
  'const FEATURE_KEY = "premium-naming-prompt"',
]) {
  assertIncludes("app/naming-ai/NamingAiClient.tsx", formClient, marker);
}
// sajuEvidence는 더 이상 클라이언트가 계산/전송하지 않는다 — 서버 자체 계산 폴백에 맡긴다.
// verify-payment 선검사는 제거됐다 — /generate가 접근권을 직접 검증하므로 이용권 검사는 서버 1회뿐이어야 한다.
for (const marker of ["sajuEvidence:", "buildNamingSajuEvidence", "namingSajuEvidence", '"/api/naming-prompt/verify-payment"']) {
  assertNotIncludes("app/naming-ai/NamingAiClient.tsx", formClient, marker);
}

const resultClient = read("app/naming-ai/result/NamingAiResultClient.tsx");
for (const marker of [
  "executionId",
  "generatedResult",
  "generatedPrompt",
  "PagedResultViewer",
  "exportResultPdf",
  "naming-ai-result-document",
]) {
  assertIncludes("app/naming-ai/result/NamingAiResultClient.tsx", resultClient, marker);
}

// ---- 8. 이름 카드 계약 — worker/lib/naming-result-cards.js 라이브 테스트 ----
const cardsModule = await import("../worker/lib/naming-result-cards.js");
assert(
  cardsModule.NAME_CARD_BLOCK_CONTRACT.includes("[이름카드]") && cardsModule.NAME_CARD_BLOCK_CONTRACT.includes("[/이름카드]"),
  "NAME_CARD_BLOCK_CONTRACT is missing the block open/close tags",
);
{
  const fixture = [
    "## 1. 작명가의 총평",
    "본문입니다.",
    "",
    "## 8. 이름을 올리기 전에",
    "마무리 조언.",
    "",
    "[이름카드]",
    "후보: 서준 | 한자: 徐俊 | 뜻: 펼 서, 뛰어날 준 | 보완오행: 金·水 | 소리오행: 金→金 상생 | 수리: 원21·형23·정33 길 | 총평: 곧게 뻗는 이름",
    "후보: 하윤 | 한자: 河潤 | 뜻: 물 하, 윤택할 윤 | 보완오행: 水 | 소리오행: 土→水 | 수리: 원18·형26·정31 | 총평: 부드러운 이름",
    "최종: 서준 | 이유: 이 사주에 가장 맞는 이름입니다",
    "[/이름카드]",
  ].join("\n");
  const parsed = cardsModule.parseNamingResultCards(fixture);
  assert(parsed.cards.length === 2, `card fixture parse expected 2 cards, got ${parsed.cards.length}`);
  assert(parsed.cards[0]?.name === "서준" && parsed.cards[0]?.hanja === "徐俊", "card fixture first card fields mismatch");
  assert(parsed.finalPick?.name === "서준" && Boolean(parsed.finalPick?.reason), "card fixture finalPick mismatch");
  assert(!parsed.cleanText.includes("[이름카드]"), "cleanText must strip the card block");
  assert(parsed.cleanText.includes("마무리 조언."), "cleanText must keep the prose body");

  const degraded = cardsModule.parseNamingResultCards("블록 없는 프로즈 응답");
  assert(
    degraded.cards.length === 0 && degraded.finalPick === null && degraded.cleanText === "블록 없는 프로즈 응답",
    "no-block input must degrade to prose-only",
  );
  const broken = cardsModule.parseNamingResultCards("본문\n[이름카드]\n이상한 줄만 있음");
  assert(broken.cards.length === 0 && broken.cleanText.includes("본문"), "broken block must degrade without losing prose");
}

// ---- 9. 작명첩 8장 프롬프트 계약 + 카드 블록 배선 (정적) ----
for (const marker of [
  'import { NAME_CARD_BLOCK_CONTRACT, parseNamingResultCards } from "../lib/naming-result-cards.js";',
  'const RESULT_VERSION = "naming-result-v20260712";',
  "## 1. 작명가의 총평",
  "## 4. 이름 후보 상세",
  "## 8. 이름을 올리기 전에",
  "${NAME_CARD_BLOCK_CONTRACT}",
  "parseNamingResultCards(generated.text)",
  "nameCards: parsed.cards",
  "finalPick: parsed.finalPick",
]) {
  assertIncludes("worker/routes/naming-prompt.js", route, marker);
}
// 렌더러(AiResultProse)가 표를 지원하지 않으므로 프롬프트에 마크다운 표 지시가 없어야 한다.
assertNotIncludes("worker/routes/naming-prompt.js", route, "|---|");

// ---- 10. 결과 페이지 — 이름카드/작명첩 UI + PDF 마커 캡처 (정적) ----
for (const marker of [
  "nameCards",
  "finalPick",
  "data-naming-pdf-page",
  '"#naming-ai-result-document [data-naming-pdf-page]"',
  "withCharacterBreaks(",
  "yeoniBreaks",
  // 프롬프트 <pre>는 export 중 max-h/overflow를 해제해야 PDF에서 잘리지 않는다.
  'exportExpand ? "" : "max-h-[480px] overflow-auto"',
]) {
  assertIncludes("app/naming-ai/result/NamingAiResultClient.tsx", resultClient, marker);
}
// 디자인 정본 이탈 잔재(브랜드 밖 색·번호 스캐폴딩)가 되돌아오지 않도록 고정한다.
for (const [file, text] of [
  ["app/naming-ai/NamingAiClient.tsx", formClient],
  ["app/naming-ai/result/NamingAiResultClient.tsx", resultClient],
]) {
  for (const marker of ["emerald", "#e0985f", 'padStart(2, "0")', "uppercase tracking"]) {
    assertNotIncludes(file, text, marker);
  }
  assertIncludes(file, text, "#0a0818");
  assertIncludes(file, text, "#c4b5fd");
}

if (failures.length) {
  console.error("[verify-naming-prompt-flow] FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("[verify-naming-prompt-flow] PASS");
