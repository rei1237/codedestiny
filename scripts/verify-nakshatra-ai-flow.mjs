#!/usr/bin/env node
// 나크샤트라 결정판 통합 상담 — 프롬프트·결제·표시 계약 검증.
// 실제 LLM·결제·DB에는 연결하지 않는다. 계산값과 LLM 응답은 모두 fixture로 검증한다.

import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failures = 0;

function ok(condition, label) {
  if (condition) console.log("  ✓ " + label);
  else {
    failures += 1;
    console.error("  ✗ " + label);
  }
}

function section(title) {
  console.log("\n▶ " + title);
}

const entry = [
  "export { NAKSHATRA_PERSONA, INTEGRATED_SECTIONS, NAKSHATRA_SECTIONS, NAKSHATRA_PHASE_CONSULTATION, NAKSHATRA_TOTAL_MIN_CHARS, buildFactContext, buildSectionPrompt, buildWrittenMemory, parseSectionResponse, mergeConsultationSections, extractTopInsights, hasForbiddenResultText, extractJsonObject } from " + JSON.stringify(path.join(repoRoot, "worker/lib/nakshatra-ai-prompt.js")) + ";",
  "export { assembleNatalCodex } from " + JSON.stringify(path.join(repoRoot, "worker/lib/nakshatra-codex.js")) + ";",
].join("\n");

const bundled = await build({
  stdin: { contents: entry, resolveDir: repoRoot, sourcefile: "nakshatra-ai-verify-entry.js" },
  bundle: true, format: "cjs", platform: "node", write: false, logLevel: "silent",
});
const tmpFile = path.join(tmpdir(), "nakshatra-ai-bundle-" + process.pid + ".cjs");
writeFileSync(tmpFile, bundled.outputFiles[0].text);
const m = require(tmpFile);

const {
  NAKSHATRA_PERSONA,
  INTEGRATED_SECTIONS,
  NAKSHATRA_SECTIONS,
  NAKSHATRA_PHASE_CONSULTATION,
  NAKSHATRA_TOTAL_MIN_CHARS,
  buildFactContext,
  buildSectionPrompt,
  buildWrittenMemory,
  parseSectionResponse,
  mergeConsultationSections,
  extractTopInsights,
  hasForbiddenResultText,
  extractJsonObject,
  assembleNatalCodex,
} = m;

section("9개 통합 상담 구조");
ok(INTEGRATED_SECTIONS.length === 9, "상담 장은 9개로 압축됨");
ok(NAKSHATRA_SECTIONS.length === 9, "생성 레지스트리는 통합 장만 사용");
ok(NAKSHATRA_PHASE_CONSULTATION.length === 9, "생성 단계는 하나의 상담 단계");
{
  const ids = new Set(NAKSHATRA_SECTIONS.map((item) => item.id));
  const topics = new Set(NAKSHATRA_SECTIONS.map((item) => item.topic));
  const required = [
    "dualStarSummary", "coreIdentity", "outerVsInner", "loveAndRelationships",
    "talentAndWork", "shadowPattern", "contrastBetweenSystems", "lifeManual", "closingMessage",
  ];
  ok(ids.size === 9 && required.every((id) => ids.has(id)), "요구한 의미 기반 schema id 9개 완비");
  ok(topics.size === 9, "각 장에 겹치지 않는 의미 주제 지정");
  ok(NAKSHATRA_SECTIONS.every((item) => item.deck === "consultation"), "숙요·베다 덱 분리 생성 제거");
  ok(NAKSHATRA_TOTAL_MIN_CHARS >= 8000, "9개 장의 최소 분량 합계가 8,000자 이상");
  ok(NAKSHATRA_SECTIONS.every((item) => Array.isArray(item.rules) && item.rules.length > 0), "각 장의 중복 방지 규칙 존재");
}

section("결정론 계산 fixture 5종과 프롬프트 차이");
const fixtures = [
  { name: "공통 신호형", moonLon: 181.42, lunar: { month: 1, day: 17, isLeap: false } },
  { name: "대조 신호형", moonLon: 13.2, lunar: { month: 2, day: 13, isLeap: false } },
  { name: "외향·내향 공존형", moonLon: 96.7, lunar: { month: 5, day: 2, isLeap: false } },
  { name: "관계 초점형", moonLon: 252.4, lunar: { month: 7, day: 21, isLeap: false } },
  { name: "일·재능 초점형", moonLon: 329.1, lunar: { month: 10, day: 8, isLeap: false } },
];
const summaries = [];
for (const fixture of fixtures) {
  const codex = assembleNatalCodex({
    moonLon: fixture.moonLon,
    birthUtc: new Date(Date.UTC(1990, 0, 1, 5, 0, 0)),
    lunar: fixture.lunar,
    timeUnknown: false,
    now: new Date(Date.UTC(2026, 6, 16, 0, 0, 0)),
  });
  const facts = buildFactContext(codex, "내 선택 기준을 알고 싶어요.");
  const prompt = buildSectionPrompt(NAKSHATRA_SECTIONS[0], {
    summaryText: facts.summaryText,
    question: "내 선택 기준을 알고 싶어요.",
  });
  summaries.push(facts.summaryText);
  ok(
    facts.summaryText.includes("숙요 27숙") && facts.summaryText.includes("베다 나크샤트라"),
    fixture.name + ": 두 결정론 계산 근거 포함",
  );
  ok(
    facts.summaryText.includes(codex.dongyang.nameKo) && facts.summaryText.includes(codex.india.nameKo),
    fixture.name + ": 본명숙과 나크샤트라 실제값 포함",
  );
  ok(
    prompt.includes("고정된 1:1 대응표도 아니다") && prompt.includes("단계별 사고 과정을 출력하지 않는다"),
    fixture.name + ": 통합 원칙과 비노출 분석 지시 포함",
  );
}
ok(new Set(summaries).size === fixtures.length, "5개 fixture가 실질적으로 다른 계산 컨텍스트를 생성");

section("중복 억제·응답 schema");
{
  const memory = buildWrittenMemory([
    { id: "coreIdentity", title: "본질", keyInsight: "내 기준이 분명한 사람입니다.", body: "첫 장의 본문입니다." },
    { id: "outerVsInner", title: "내면", keyInsight: "압박에서는 혼자 정리할 시간이 필요합니다.", body: "둘째 장의 본문입니다." },
  ]);
  const prompt = buildSectionPrompt(NAKSHATRA_SECTIONS[3], {
    summaryText: summaries[0],
    question: "연애에서 반복하는 패턴이 궁금해요.",
    writtenMemory: memory,
  });
  ok(memory.includes("내 기준이 분명한 사람입니다") && memory.includes("혼자 정리할 시간"), "이전 결론 요약 메모리 생성");
  ok(prompt.includes("바꿔 말해 반복하지 말 것") && prompt.includes("의미 주제: relationship"), "새 장의 범위와 중복 금지 주입");
  ok(prompt.includes('"vedicEvidence"') && prompt.includes('"sukuyoEvidence"'), "내부 근거 field를 포함한 JSON schema");
  const parsed = parseSectionResponse('{"keyInsight":"핵심 결론","vedicEvidence":"베다 근거","sukuyoEvidence":"숙요 근거","body":"상담 본문"}');
  ok(parsed.body === "상담 본문" && parsed.vedicEvidence === "베다 근거" && parsed.sukuyoEvidence === "숙요 근거", "통합 응답 schema 파싱");
  ok(Object.keys(extractJsonObject("broken")).length === 0, "비JSON 응답은 빈 객체로 처리");
  const merged = mergeConsultationSections([
    { id: "dualStarSummary", keyInsight: "두 별의 결론", body: "첫 상담문" },
    { id: "coreIdentity", keyInsight: "본질", body: "둘째 상담문" },
  ]);
  ok(Array.isArray(merged.consultation) && merged.consultation.length === 2, "신규 decks.consultation 결과 조립");
  const insights = extractTopInsights("본문\n### 이번 주에 지킬 세 가지\n- 하나 — 설명\n- 둘 — 설명\n- 셋 — 설명");
  ok(insights.length === 3 && insights[0].title === "하나", "사용 설명서의 행동 기준 3개 추출");
}

section("안전 문체");
ok(typeof NAKSHATRA_PERSONA.integrated === "string" && NAKSHATRA_PERSONA.integrated.includes("같은 체계"), "통합 상담가가 체계 동일시 금지 원칙 명시");
ok(hasForbiddenResultText({ body: "따뜻한 상담문입니다." }) === false, "정상 상담문 통과");
ok(hasForbiddenResultText({ body: "mock 응답" }) === true, "내부 구현어 차단");
ok(hasForbiddenResultText({ body: "system prompt 유출" }) === true, "시스템 지시 유출 차단");

section("결제·재개·라우팅 정적 계약");
const routePath = path.join(repoRoot, "worker/routes/nakshatra-ai.js");
const routeSrc = readFileSync(routePath, "utf8");
try {
  await build({ entryPoints: [routePath], bundle: false, format: "esm", platform: "node", write: false, logLevel: "silent" });
  ok(true, "나크샤트라 AI 라우트 구문 파싱 성공");
} catch (error) {
  ok(false, "나크샤트라 AI 라우트 구문 파싱 실패: " + String(error?.message || error).slice(0, 180));
}
ok(!/\.\s*waitUntil\s*\(/.test(routeSrc), "생성 경로 동기 실행 유지");
ok(/FEATURE_KEY\s*=\s*"nakshatra-ai-consultation"/.test(routeSrc), "기존 3만원 feature key 유지");
ok(routeSrc.includes("canAccessPaidFeature") && routeSrc.includes("allowedPaymentModes"), "이용권·월정석·단건 결제 선택 계약 유지");
ok(routeSrc.includes("accessSource") && routeSrc.includes("idempotencyKey"), "결제 재개와 이중 차감 방지 계약 유지");
ok(routeSrc.includes("NAKSHATRA_PHASE_CONSULTATION") && !routeSrc.includes("NAKSHATRA_PHASE_DECKS"), "라우트가 단일 통합 생성 단계 사용");
ok(routeSrc.includes("decks.consultation") && routeSrc.includes("raw?.decks"), "신규 schema와 기존 저장 결과 재조회 동시 지원");

section("하나의 공개 상품과 모바일 결과 표시");
const resultSrc = readFileSync(path.join(repoRoot, "app/nakshatra/result/NakshatraResultClient.tsx"), "utf8");
const paidBlock = resultSrc.slice(resultSrc.indexOf("function paidProducts"), resultSrc.indexOf("function PaidUpsell"));
const clientSrc = readFileSync(path.join(repoRoot, "app/nakshatra/ai/NakshatraAiClient.tsx"), "utf8");
const decksSrc = readFileSync(path.join(repoRoot, "app/nakshatra/ai/AiConsultDecks.tsx"), "utf8");
const decksCss = readFileSync(path.join(repoRoot, "app/nakshatra/ai/consult-decks.module.css"), "utf8");
ok((paidBlock.match(/href:/g) || []).length === 1 && paidBlock.includes('href: "/nakshatra/ai"'), "무료 결과의 신규 유료 진입은 통합 상담 하나");
ok(clientSrc.includes("const TOTAL_SECTIONS = 9"), "클라이언트 진행률이 9개 장 기준");
ok(decksSrc.includes("consultation?: DeckSection[]") && decksSrc.includes("legacySections"), "신규 통합 결과와 기존 결과 재열람 표시 지원");
ok(decksSrc.includes("두 개의 별 프로필") && decksSrc.includes("베다의 이름은") && decksSrc.includes("keyInsight"), "상단 두 별 Hero와 핵심 결론 존재");
ok(!decksSrc.includes("<details") && decksSrc.includes("<article"), "아코디언 카드 대신 long-form editorial 장 구성");
ok(decksCss.includes("env(safe-area-inset-bottom)") && decksCss.includes("@media (max-width: 359px)"), "safe-area 및 360px 이하 모바일 보정");
ok(decksCss.includes("max-width: 66ch") && decksCss.includes("prefers-reduced-motion"), "읽기 폭과 reduced-motion 고려");

console.log("\n" + (failures === 0 ? "✅ 모든 검증 통과" : "❌ " + failures + "건 실패"));
process.exit(failures === 0 ? 0 : 1);
