#!/usr/bin/env node
// 나크샤트라 결정판 AI 심화 상담 — 프롬프트·결제 라우트 계약 검증 하네스
//
// (A) 프롬프트 라이브러리(worker/lib/nakshatra-ai-prompt.js) 런타임 검증: 2덱(숙요5+베다6=11섹션)·
//     페르소나·근거 컨텍스트(실제 codex)·섹션 프롬프트 빌더·파서·머지. esbuild로 CJS 번들 후 node 실행.
// (B) 결제 라우트(worker/routes/nakshatra-ai.js) esbuild 파싱(구문 무결) — 임포트 미해석(경량).
// (C) 라우트·모델 정적 계약: 동기 생성(생성 경로 waitUntil 부재)·결제/환불 헬퍼 존재·pass-first·모델 export.
//   실행: node scripts/verify-nakshatra-ai-flow.mjs

import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let failures = 0;
function ok(cond, label) {
  if (cond) console.log(`  ✓ ${label}`);
  else { failures += 1; console.error(`  ✗ ${label}`); }
}
function section(t) { console.log(`\n▶ ${t}`); }

// ── (A) 프롬프트 라이브러리 런타임 검증 ────────────────────────────────────────
const entry = [
  `export { NAKSHATRA_PERSONA, SUKUYO_SECTIONS, VEDIC_SECTIONS, NAKSHATRA_SECTIONS, buildFactContext, buildSectionPrompt, parseSectionResponse, mergeConsultationSections, hasForbiddenResultText, extractJsonObject } from ${JSON.stringify(path.join(repoRoot, "worker/lib/nakshatra-ai-prompt.js"))};`,
  `export { assembleNatalCodex } from ${JSON.stringify(path.join(repoRoot, "worker/lib/nakshatra-codex.js"))};`,
].join("\n");

const bundled = await build({
  stdin: { contents: entry, resolveDir: repoRoot, sourcefile: "nakshatra-ai-verify-entry.js" },
  bundle: true, format: "cjs", platform: "node", write: false, logLevel: "silent",
});
const tmpFile = path.join(tmpdir(), `nakshatra-ai-bundle-${process.pid}.cjs`);
writeFileSync(tmpFile, bundled.outputFiles[0].text);
const m = require(tmpFile);
const {
  NAKSHATRA_PERSONA, SUKUYO_SECTIONS, VEDIC_SECTIONS, NAKSHATRA_SECTIONS,
  buildFactContext, buildSectionPrompt, parseSectionResponse, mergeConsultationSections, hasForbiddenResultText, extractJsonObject,
  assembleNatalCodex,
} = m;

section("2덱 섹션 레지스트리(숙요5 + 베다6 = 11)");
ok(SUKUYO_SECTIONS.length === 5, "숙요 덱 5섹션");
ok(VEDIC_SECTIONS.length === 6, "베다 덱 6섹션");
ok(NAKSHATRA_SECTIONS.length === 11, "통합 11섹션");
{
  let shapeOk = true; const ids = new Set();
  for (const s of NAKSHATRA_SECTIONS) {
    if (!s.id || !s.title || !s.scope || !Array.isArray(s.rules) || !Number.isInteger(s.minChars)) shapeOk = false;
    if (s.deck !== "sukuyo" && s.deck !== "vedic") shapeOk = false;
    ids.add(s.id);
  }
  ok(shapeOk, "각 섹션 {id,deck,title,minChars,scope,rules[]} 완비");
  ok(ids.size === 11, "섹션 id 11개 유일");
  ok(SUKUYO_SECTIONS.every((s) => s.deck === "sukuyo") && VEDIC_SECTIONS.every((s) => s.deck === "vedic"), "덱 배속 일관");
}

section("페르소나(권위+따뜻함, 덱별 구분)");
ok(typeof NAKSHATRA_PERSONA.sukuyo === "string" && NAKSHATRA_PERSONA.sukuyo.length > 40, "숙요 페르소나 존재");
ok(typeof NAKSHATRA_PERSONA.vedic === "string" && NAKSHATRA_PERSONA.vedic.length > 40, "베다 페르소나 존재");
ok(NAKSHATRA_PERSONA.sukuyo !== NAKSHATRA_PERSONA.vedic, "두 페르소나 구분됨");
ok(NAKSHATRA_PERSONA.sukuyo.includes("숙요") && NAKSHATRA_PERSONA.vedic.includes("베다"), "각 페르소나가 전통 명시");

section("근거 컨텍스트(실제 codex → buildFactContext)");
{
  const codex = assembleNatalCodex({
    moonLon: 181.42, birthUtc: new Date(Date.UTC(1990, 0, 1, 5, 0, 0)),
    lunar: { month: 1, day: 17, isLeap: false }, timeUnknown: false, now: new Date(Date.UTC(2026, 6, 16, 0, 0, 0)),
  });
  const fc = buildFactContext(codex, "올해 이직을 고민 중이에요.");
  ok(typeof fc.summaryText === "string" && fc.summaryText.includes("숙요") && fc.summaryText.includes("베다"), "근거 요약에 숙요·베다 두 계통 포함");
  ok(Array.isArray(fc.evidenceTokens) && fc.evidenceTokens.length >= 4, "인용 토큰 4개 이상 추출");
  ok(fc.summaryText.includes(codex.india.nameEn) || fc.summaryText.includes(codex.india.nameKo), "근거에 나크샤트라 이름 인용");
}

section("섹션 프롬프트 빌더(페르소나·근거·질문·JSON 스키마)");
{
  const ctx = { summaryText: "【숙요 계산 근거】\n- 본명수: 각수(角)", question: "제 기질에 맞는 방향이 궁금해요." };
  const pS = buildSectionPrompt(SUKUYO_SECTIONS[0], ctx);
  const pV = buildSectionPrompt(VEDIC_SECTIONS[0], ctx);
  ok(pS.includes(NAKSHATRA_PERSONA.sukuyo) && pV.includes(NAKSHATRA_PERSONA.vedic), "덱별 페르소나 주입");
  ok(pS.includes("[근거]") && pS.includes(ctx.summaryText), "근거 블록 포함");
  ok(pS.includes(ctx.question), "사용자 질문 포함");
  ok(pS.includes('"body"'), "출력 JSON 스키마(body) 지시 포함");
  const pFree = buildSectionPrompt(SUKUYO_SECTIONS[0], { summaryText: "x", question: "" });
  ok(pFree.includes("자유 상담"), "질문 없으면 자유 상담 안내");
}

section("파서 · 머지");
{
  ok(parseSectionResponse('{"body":"안녕하세요, 상담입니다."}').body === "안녕하세요, 상담입니다.", "정상 JSON 파싱");
  ok(parseSectionResponse('```json\n{"body":"코드펜스 안"}\n```').body === "코드펜스 안", "코드펜스 감싼 JSON 파싱");
  ok(parseSectionResponse("깨진 텍스트").body === "", "파싱 실패 → 빈 body");
  ok(Object.keys(extractJsonObject("noise")).length === 0, "extractJsonObject 비JSON → {}");
  const merged = mergeConsultationSections([
    { id: "sukuyoOpening", body: "숙요 개시" },
    { id: "vedicOpening", body: "베다 개시" },
    { id: "sukuyoNature", body: "" }, // 빈 body는 제외돼야 함
    { id: "vedicNature", body: "베다 기질" },
  ]);
  ok(Array.isArray(merged.sukuyo) && Array.isArray(merged.vedic), "머지 결과 2덱 배열");
  ok(merged.sukuyo.length === 1 && merged.sukuyo[0].title, "빈 body 제외 + title 부여(숙요)");
  ok(merged.vedic.length === 2, "베다 덱 2섹션 병합");
  ok(merged.sukuyo[0].id === "sukuyoOpening" && merged.vedic[0].id === "vedicOpening", "섹션 순서 유지");
}

section("금지어 필터(hasForbiddenResultText)");
ok(hasForbiddenResultText({ body: "따뜻한 상담문입니다." }) === false, "정상 상담문 통과");
ok(hasForbiddenResultText({ body: "이건 mock 응답" }) === true, "내부 구현어(mock) 차단");
ok(hasForbiddenResultText({ body: "system prompt 유출" }) === true, "system prompt 유출 차단");

// ── (B) 결제 라우트 esbuild 파싱(구문 무결) ──────────────────────────────────
section("결제 라우트 esbuild 파싱(구문 무결)");
const routePath = path.join(repoRoot, "worker/routes/nakshatra-ai.js");
try {
  await build({ entryPoints: [routePath], bundle: false, format: "esm", platform: "node", write: false, logLevel: "silent" });
  ok(true, "worker/routes/nakshatra-ai.js 구문 파싱 성공");
} catch (error) {
  ok(false, `구문 파싱 실패 — ${String(error?.message || error).slice(0, 200)}`);
}

// ── (C) 라우트·모델 정적 계약 ────────────────────────────────────────────────
section("결제 라우트 정적 계약(동기 생성·결제/환불 헬퍼·pass-first)");
const routeSrc = readFileSync(routePath, "utf8");
// ⚠ 동기 생성 불변식: waitUntil '호출'(.waitUntil()가 없어야 한다(비동기 전환은 Workers I/O 격리와 충돌).
// 설명 주석의 단어 언급은 허용하고 실제 호출 패턴만 검사한다.
ok(!/\.\s*waitUntil\s*\(/.test(routeSrc), "생성 경로 동기(waitUntil 호출 부재)");
ok(/FEATURE_KEY\s*=\s*"nakshatra-ai-consultation"/.test(routeSrc), "FEATURE_KEY=nakshatra-ai-consultation");
ok(/SERVICE_KEY\s*=\s*"nakshatra-ai"/.test(routeSrc), "SERVICE_KEY=nakshatra-ai");
for (const fn of ["resolveEnsureAccess", "resolveStartAccess", "applyUsageOnce", "recordSuccessfulUsage", "startRefundableExecution", "completeRefundableExecution", "failRefundableExecution"]) {
  ok(routeSrc.includes(`function ${fn}`), `결제/과금 헬퍼 존재: ${fn}`);
}
ok(routeSrc.includes("canAccessPaidFeature"), "pass-first: canAccessPaidFeature 선검사");
ok(/allowedPaymentModes:\s*\["direct",\s*"monthly",\s*"pass"\]/.test(routeSrc), "결제창 단건·월정석·이용권 동등 노출(allowedPaymentModes)");
ok(routeSrc.includes("consumeMonthlyCreditLots"), "월정석 lot FIFO 차감 경유");
ok(routeSrc.includes("generateConsultation") && routeSrc.includes("computeNatalFacts"), "생성/계산 함수 존재");
ok(routeSrc.includes("mergeConsultationSections") && routeSrc.includes("buildSectionPrompt"), "프롬프트 라이브러리 사용");
// 결과 생성 실패 시에도 결제 권한 보존(환불 강제) — forceRefundOnClose
ok(/forceRefundOnClose:\s*true/.test(routeSrc), "생성 실패 시 환불 강제(forceRefundOnClose)");

section("모델 계약(NakshatraAiConsultation)");
const modelsSrc = readFileSync(path.join(repoRoot, "worker/lib/models.js"), "utf8");
ok(/export const NakshatraAiConsultation\b/.test(modelsSrc), "NakshatraAiConsultation export");
ok(/nakshatraAiConsultationSchema/.test(modelsSrc), "nakshatraAiConsultationSchema 정의");
ok(/nakshatraAiConsultationSchema\.index\(\{\s*userId:\s*1,\s*idempotencyKey:\s*1\s*\},\s*\{\s*unique:\s*true\s*\}\)/.test(modelsSrc), "멱등 unique(userId, idempotencyKey) 인덱스");
ok(/decks:\s*\{\s*type:\s*mongoose\.Schema\.Types\.Mixed/.test(modelsSrc), "decks(Mixed) 필드 존재");

section("디스패치(worker/index.js)");
const indexSrc = readFileSync(path.join(repoRoot, "worker/index.js"), "utf8");
ok(indexSrc.includes("handleNakshatraAiRoutes"), "handleNakshatraAiRoutes 등록/라우팅");
ok(/\/api\/nakshatra-ai/.test(indexSrc), "/api/nakshatra-ai 경로 배선");
// AI(유료·인증) 블록이 무료 블록보다 먼저 검사되는지(정규식으로 위치 비교)
ok(indexSrc.indexOf("/api/nakshatra-ai") < indexSrc.indexOf('url.pathname === "/api/nakshatra"'), "AI 라우팅이 무료 라우팅보다 먼저");

console.log(`\n${failures === 0 ? "✅ 모든 검증 통과" : `❌ ${failures}건 실패`}`);
process.exit(failures === 0 ? 0 : 1);
