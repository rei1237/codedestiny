#!/usr/bin/env node
/**
 * 휴먼 디자인 프리미엄 리포트 검증 — 🔴 LLM 실호출 0회.
 *
 * 정본 하네스는 scripts/verify-human-design-ai.mjs 다. 같은 방식으로 Gemini 키를 지우고
 * 순수 함수만 돌린다. 여기서 확인하는 것은 세 가지다.
 *
 *   ① 계약   — 18유닛·분량 예산·폴백 문턱·시간 예산이 서로 모순되지 않는가
 *   ② 프롬프트 — 출생 데이터가 안 실리는가, 확정값이 전부 실리는가, 접두사가 캐싱에 맞는가
 *   ③ 검증   — 가짜 출력을 먹였을 때 모순을 실제로 잡아내는가, 정상 출력을 오탐하지 않는가
 *   ④ 라우트  — 결제·락·환불 배선이 소스에 실제로 있는가
 *
 * 🔴 여기서 못 보는 것: 실제 분량이 25,000자가 나오는지, 18유닛이 서로 반복하지 않는지,
 *    웨이브 실측 시간. 그건 유료 실호출이 필요하고 사용자 허락 1회 한정이다(CLAUDE.md 절대규칙 1).
 *
 * 실행: node scripts/verify-human-design-report.mjs
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 🔴 실호출 차단 — 키가 없으면 어떤 경로도 네트워크를 타지 않는다.
for (const key of ["GEMINIF_API_KEY", "GEMINI_API_KEY", "GOOGLE_GEMINI_API_KEY"]) delete process.env[key];

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const failures = [];
function check(label, ok, detail = "") {
  if (ok) {
    console.log(`✅ ${label}`);
    return;
  }
  failures.push(detail ? `${label} — ${detail}` : label);
  console.log(`❌ ${label}${detail ? ` — ${detail}` : ""}`);
}

function readRepoFile(relativePath) {
  try {
    return readFileSync(path.join(repoRoot, relativePath), "utf8");
  } catch {
    return "";
  }
}

/** 주석에 적힌 "…하지 않는다" 서술이 금지 패턴으로 걸리지 않도록 코드 줄만 본다. */
function codeLines(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith("//") && !trimmed.startsWith("*") && !trimmed.startsWith("/*");
    })
    .join("\n");
}

const contract = await import(new URL("../worker/lib/human-design-report-contract.js", import.meta.url).href);
const promptModule = await import(new URL("../worker/lib/human-design-report-prompt.js", import.meta.url).href);
const registry = await import(new URL("../worker/lib/paid-feature-registry.js", import.meta.url).href);
const { assembleChart } = await import(new URL("../lib/human-design/chart.js", import.meta.url).href);
const budget = await import(new URL("../worker/lib/llm-budget.js", import.meta.url).href);
const syncTimeout = await import(new URL("../worker/lib/sync-llm-timeout.js", import.meta.url).href);

// ── ① 계약 ───────────────────────────────────────────────────────────────────

console.log("\n── ① 계약 ──");

const SECTIONS = contract.HD_REPORT_SECTIONS;
check("18유닛이 선언돼 있다", SECTIONS.length === 18, String(SECTIONS.length));
check("유닛 key 가 중복되지 않는다", new Set(SECTIONS.map((s) => s.key)).size === SECTIONS.length);
check("order 가 1..18 로 빠짐없이 이어진다",
  SECTIONS.map((s) => s.order).sort((a, b) => a - b).join(",") === Array.from({ length: 18 }, (_, i) => i + 1).join(","));

const minSum = SECTIONS.reduce((sum, s) => sum + s.minChars, 0);
const maxSum = SECTIONS.reduce((sum, s) => sum + s.maxChars, 0);
check(`섹션 minChars 합이 광고 분량 이상이다 (${minSum} ≥ ${contract.HD_REPORT_TARGET_CHARS})`,
  minSum >= contract.HD_REPORT_TARGET_CHARS);
check(`섹션 maxChars 합이 저장 상한 이하다 (${maxSum} ≤ ${contract.HD_REPORT_MAX_TOTAL_CHARS})`,
  maxSum <= contract.HD_REPORT_MAX_TOTAL_CHARS);
check("전달 하한이 광고 분량보다 낮다 (경계이지 목표가 아니다)",
  contract.HD_REPORT_DELIVER_MIN_TOTAL_CHARS < contract.HD_REPORT_TARGET_CHARS);
check("전달 하한 섹션 수가 전체보다 적다",
  contract.HD_REPORT_DELIVER_MIN_SECTIONS < SECTIONS.length);

const tightBudget = SECTIONS.filter((s) => s.maxChars - s.minChars < budget.MIN_BUDGET_HEADROOM_CHARS);
check(`유닛별 분량 여유가 ${budget.MIN_BUDGET_HEADROOM_CHARS}자 이상이다`,
  tightBudget.length === 0, tightBudget.map((s) => s.key).join(", "));

const worstChars = Math.max(...SECTIONS.map((s) => s.maxChars));
check(`출력 토큰 상한이 최장 유닛을 담는다 (${contract.HD_REPORT_SECTION_MAX_OUTPUT_TOKENS} ≥ ${budget.tokensRequiredForChars(worstChars)})`,
  contract.HD_REPORT_SECTION_MAX_OUTPUT_TOKENS >= budget.tokensRequiredForChars(worstChars));

check(`섹션 타임아웃이 동기 LLM 상한 이하다 (${contract.HD_REPORT_SECTION_TIMEOUT_MS} ≤ ${syncTimeout.SYNC_LLM_TIMEOUT_CEILING_MS})`,
  contract.HD_REPORT_SECTION_TIMEOUT_MS <= syncTimeout.SYNC_LLM_TIMEOUT_CEILING_MS);
check(`웨이브 예산이 엣지 데드라인보다 작다 (${contract.HD_REPORT_WAVE_BUDGET_MS} < ${syncTimeout.EDGE_RESPONSE_DEADLINE_MS})`,
  contract.HD_REPORT_WAVE_BUDGET_MS < syncTimeout.EDGE_RESPONSE_DEADLINE_MS);
check("락 TTL 이 섹션 타임아웃의 두 배 이상이다 (웨이브 최악을 견딘다)",
  contract.HD_REPORT_LOCK_TTL_MS >= contract.HD_REPORT_SECTION_TIMEOUT_MS * 2);
check("stale 창이 락 TTL 보다 길다 (락이 살아 있는데 좀비로 판정하면 안 된다)",
  contract.HD_REPORT_STALE_MS > contract.HD_REPORT_LOCK_TTL_MS);
check("웨이브 상한이 18유닛 ÷ 동시성 보다 넉넉하다",
  contract.HD_REPORT_MAX_WAVES >= Math.ceil(SECTIONS.length / contract.HD_REPORT_SECTION_CONCURRENCY) + 2);

const badFallback = SECTIONS.filter((s) => contract.hdReportFallbackMinChars(s) !== Math.round(s.minChars * 0.4));
check("🔴 폴백 수용 문턱이 전 유닛에서 최소 분량의 40% 다 (안 주면 8% 분량이 정상 결제 결과가 된다)",
  badFallback.length === 0, badFallback.map((s) => s.key).join(", "));

// 결제 정합성
const entry = registry.FEATURE_KEY_PRICE_TABLE["human-design-report"];
check("유료 레지스트리에 human-design-report 가 있다", Boolean(entry));
check("레지스트리 가격이 100코인 / ₩10,000 다",
  Number(entry?.cost) === 100 && Number(entry?.amountKRW) === 10000, JSON.stringify(entry || {}));
check("회당 결제로 등록돼 있다", registry.isPerUsePaidFeatureKey("human-design-report"));
check("🔴 영구 해금이 아니다 (1회 결제로 모든 출생 데이터가 열리는 것을 막는다)",
  !registry.isUnlockPaidFeatureKey("human-design-report"));
check("🔴 VVIP 이용권 커버 한도(100코인)를 넘지 않는다",
  Number(entry?.cost) <= 100, `cost=${entry?.cost}`);

// ── ② 프롬프트 ───────────────────────────────────────────────────────────────

console.log("\n── ② 프롬프트 ──");

const snapshotDoc = JSON.parse(readRepoFile("__tests__/fixtures/human-design/ephemeris-snapshot.json") || "{}");
const row = (snapshotDoc.rows || [])[0];
check("픽스처 ephemeris 스냅샷이 있다", Boolean(row), row ? row.id : "없음");

let chart = null;
let fact = null;
let allowed = null;
if (row) {
  chart = assembleChart({
    personalityLongitudes: row.personality,
    designLongitudes: row.design,
    moments: { birthUtc: row.birthUtc, designUtc: row.designUtc, designSearch: row.designSearch },
  });
  fact = contract.buildHumanDesignFactSnapshot(chart);
  allowed = contract.buildAllowedIds(chart);
}

const promptsByLocale = {};
if (fact) {
  for (const locale of contract.HD_REPORT_LOCALES) {
    promptsByLocale[locale] = SECTIONS.map((spec) => contract && promptModule.buildHumanDesignReportSectionPrompt({
      snapshot: fact,
      spec,
      locale,
      requiredIds: contract.requiredSubsectionIds(spec, allowed),
    }));
  }
}

// 🔴 출생 데이터 미포함 — 이 계약이 깨지면 개인정보가 모델에 흘러가고, 캐시 공유도 못 하게 된다.
const BIRTH_LEAKS = [row?.birthUtc, "1991-02-20", "08:30", "Asia/Seoul", "birthDate", "birthInput"].filter(Boolean);
for (const locale of contract.HD_REPORT_LOCALES) {
  const joined = (promptsByLocale[locale] || []).map((p) => p.prompt).join("\n");
  const leaked = BIRTH_LEAKS.filter((needle) => joined.includes(needle));
  check(`🔴 ${locale} 프롬프트에 출생 데이터가 없다`, leaked.length === 0, leaked.join(", "));
}

// 확정값 전량 적재
if (fact) {
  const koJoined = (promptsByLocale.ko || []).map((p) => p.prompt).join("\n");
  const required = [fact.type, fact.strategy, fact.authority, fact.signature, fact.notSelfTheme, fact.definition, fact.profile];
  const missingFacts = required.filter((value) => value && !koJoined.includes(String(value)));
  check("확정값(타입·전략·권위·시그니처·낫셀프·정의·프로파일)이 전부 실린다",
    missingFacts.length === 0, missingFacts.join(", "));
  check("26 활성이 전부 실린다",
    fact.activations.every((a) => koJoined.includes(`${a.planet} ${a.gate}.${a.line}`)));
  check("활성 채널이 전부 실린다",
    fact.channels.every((c) => koJoined.includes(c.channelId)));
}

// 금지 규칙
for (const locale of contract.HD_REPORT_LOCALES) {
  const first = (promptsByLocale[locale] || [])[0]?.prompt || "";
  const markers = locale === "ko"
    ? ["다시 계산하지 마세요", "지어내지 마세요", "운명을 단정하지 마세요", "의료·법률·재정"]
    : ["Do not recalculate", "Never invent", "Do not state destiny", "medical, legal or financial"];
  const missing = markers.filter((marker) => !first.includes(marker));
  check(`${locale} 금지 규칙이 프롬프트에 있다`, missing.length === 0, missing.join(" / "));
}

// 🔴 암묵 캐싱은 공통 **접두사**에만 걸린다. 접두가 짧으면 18회 반복 입력이 정가로 돌아간다.
if ((promptsByLocale.ko || []).length === 18) {
  const texts = promptsByLocale.ko.map((p) => p.prompt);
  let common = texts[0].length;
  for (const text of texts.slice(1)) {
    let i = 0;
    while (i < common && i < text.length && text[i] === texts[0][i]) i += 1;
    common = Math.min(common, i);
  }
  const average = texts.reduce((sum, text) => sum + text.length, 0) / texts.length;
  const ratio = common / average;
  check(`불변 접두사가 프롬프트의 절반 이상이다 (${(ratio * 100).toFixed(1)}%)`, ratio >= 0.5,
    `공통 ${common}자 / 평균 ${Math.round(average)}자`);
}

// fail-closed
if (chart) {
  const holes = ["type", "strategy", "authority", "profile", "definition", "activations"];
  const refused = holes.filter((field) => {
    const broken = { ...chart, [field]: field === "activations" ? [] : "" };
    try {
      contract.buildHumanDesignFactSnapshot(broken);
      return false;
    } catch {
      return true;
    }
  });
  check("🔴 계산 결손 6종에서 확정표 조립을 거부한다 (fail-closed)", refused.length === holes.length,
    `거부 ${refused.length}/${holes.length}`);
}

const promptSource = codeLines(readRepoFile("worker/lib/human-design-report-prompt.js"));
check("🔴 프롬프트 모듈이 LLM 을 직접 부르지 않는다 (조립만 한다)",
  !/callGemini|callLLM|fetch\s*\(/.test(promptSource));
const contractSource = codeLines(readRepoFile("worker/lib/human-design-report-contract.js"));
check("🔴 계약 모듈이 LLM 을 직접 부르지 않는다", !/callGemini|callLLM|fetch\s*\(/.test(contractSource));

// ── ③ 검증 함수 ──────────────────────────────────────────────────────────────

console.log("\n── ③ 검증 함수 ──");

function validate(payload, { locale = "ko", specKey = "type", seen } = {}) {
  const spec = SECTIONS.find((s) => s.key === specKey);
  return contract.validateHumanDesignReportSection(payload, {
    spec,
    snapshot: fact,
    locale,
    allowed,
    requiredIds: contract.requiredSubsectionIds(spec, allowed),
    seenSentences: seen,
  });
}

function koFiller(chars) {
  return "이 사람의 설계는 정의된 센터에서 나오는 힘을 중심으로 작동합니다. ".repeat(Math.ceil(chars / 30)).slice(0, chars);
}

if (fact && allowed) {
  const goodKo = {
    key: "type", title: "타입",
    body: `${fact.type} 유형입니다. ${koFiller(2000)}`,
    subsections: [],
    evidence: [`center:THROAT`],
  };
  const okVerdict = validate(goodKo);
  check("정상 ko 섹션은 통과한다", okVerdict.ok, okVerdict.issues.join(", "));

  const foreignProfile = { ...goodKo, body: `${goodKo.body} 당신의 프로파일은 ${fact.profile === "1/3" ? "6/2" : "1/3"} 입니다.` };
  check("🔴 다른 프로파일을 이 사람 것으로 쓰면 반려한다",
    validate(foreignProfile).issues.some((i) => i.startsWith("foreign_profile")));

  const foreignType = { ...goodKo, body: `${goodKo.body} 당신은 ${fact.type === "Projector" ? "Reflector" : "Projector"} 입니다.` };
  check("🔴 다른 타입을 이 사람 것으로 쓰면 반려한다",
    validate(foreignType).issues.some((i) => i.startsWith("foreign_type")));

  const openCenterKey = (allowed.openCenters[0] || "").slice("center:".length);
  if (openCenterKey) {
    const labels = await import(new URL("../lib/human-design/labels.js", import.meta.url).href);
    const openLabel = labels.CENTER_LABEL[openCenterKey];
    const wrongOpen = { ...goodKo, body: `${goodKo.body} ${openLabel} 센터는 정의된 상태입니다.` };
    check("🔴 열린 센터를 '정의된' 으로 쓰면 반려한다",
      validate(wrongOpen).issues.some((i) => i.startsWith("open_center_called_defined")));
  }

  const fakeChannel = { ...goodKo, body: `${goodKo.body} 채널 63-64 가 당신을 이룹니다.` };
  check("🔴 차트에 없는 채널을 지어내면 반려한다",
    validate(fakeChannel).issues.some((i) => i.startsWith("unknown_channel")));

  const straySub = { ...goodKo, subsections: [{ id: "center:NOT_A_CENTER", title: "x", body: koFiller(200) }] };
  check("허용 밖 subsection id 는 버린다",
    validate(straySub).keptSubsections.length === 0);

  const noEvidence = { ...goodKo, evidence: [] };
  check("근거가 필요한 섹션에서 evidence 누락을 잡는다",
    validate(noEvidence).issues.includes("missing_evidence"));

  const tooShort = { ...goodKo, body: koFiller(100) };
  check("분량 미달을 잡는다", validate(tooShort).issues.some((i) => i.startsWith("too_short")));

  const seen = new Set();
  contract.rememberSentences(seen, goodKo);
  check("반복 문장을 잡는다", validate(goodKo, { seen }).issues.some((i) => i.startsWith("repetition")));

  const enBody = "This design runs on the defined centers that are always on. ".repeat(40);
  const goodEn = { key: "type", title: "Type", body: `${fact.type}. ${enBody}`, subsections: [], evidence: ["center:THROAT"] };
  const enVerdict = validate(goodEn, { locale: "en" });
  // 🔴 ko 전용 패턴을 en 응답에 그대로 돌리면 정상 응답이 반려된다(life-book-ai 의 흉터).
  check("🔴 정상 en 섹션을 오탐하지 않는다", enVerdict.ok, enVerdict.issues.join(", "));
  check("ko 섹션이 영어로 오면 로케일 드리프트를 잡는다",
    validate(goodEn, { locale: "ko" }).issues.some((i) => i.startsWith("locale_drift:ko")));
  check("en 섹션이 한국어로 오면 로케일 드리프트를 잡는다",
    validate(goodKo, { locale: "en" }).issues.some((i) => i.startsWith("locale_drift:en")));

  // 개수 스케일 — 채널 0개인 리플렉터에서도 하한이 무너지지 않아야 한다.
  const channelSpec = SECTIONS.find((s) => s.key === "channels");
  check("subsection 이 0개여도 실목표가 양수다", contract.effectiveMinChars(channelSpec, 0) > 0);
  check("subsection 이 많아도 실목표가 maxChars 를 넘지 않는다",
    contract.effectiveMinChars(channelSpec, 36) <= channelSpec.maxChars - 400);
}

// ── ④ 라우트 배선 ────────────────────────────────────────────────────────────

console.log("\n── ④ 라우트 배선 ──");

const routeSource = readRepoFile("worker/routes/human-design-report.js");
check("리포트 라우트 파일이 있다", routeSource.length > 0);
if (!routeSource) {
  check("🔴 라우트를 읽지 못해 배선을 확인할 수 없다", false);
} else {
  const routeCode = codeLines(routeSource);

  check("라우트 상수가 레지스트리와 같다",
    /FEATURE_KEY = "human-design-report"/.test(routeCode)
    && /COIN_PRICE = 100\b/.test(routeCode)
    && /AMOUNT_KRW = 10000\b/.test(routeCode));

  check("세 엔드포인트가 배선돼 있다",
    /path === "\/start"/.test(routeCode) && /path === "\/generate"/.test(routeCode) && /path === "\/result"/.test(routeCode));

  const startBody = routeCode.slice(routeCode.indexOf("async function handleStart"), routeCode.indexOf("async function handleGenerate"));
  const generateBody = routeCode.slice(routeCode.indexOf("async function handleGenerate"), routeCode.indexOf("async function handleResult"));
  const resultBody = routeCode.slice(routeCode.indexOf("async function handleResult"), routeCode.indexOf("export async function handleHumanDesignReportRoutes"));

  check("/start 가 결제 증빙을 확인한다", /verifyPerUsePayment\s*\(/.test(startBody));
  check("🔴 /start 가 proven === null 을 503 으로 낸다 (402 로 세탁하면 결제자가 막힌다)",
    /proven === null/.test(startBody) && /degraded\(\)/.test(startBody));
  check("/start 가 미증빙을 402 로 낸다", /PAYMENT_REQUIRED/.test(startBody) && /status: 402/.test(startBody));
  check("🔴 /start 가 LLM 을 부르지 않는다 (결제·차트 준비만 한다)", !/callGeminiJsonWithRetry/.test(startBody));
  check("🔴 클라이언트가 보낸 차트를 믿지 않는다", !/body\??\.\s*chart/.test(routeCode));

  check("🔴 /generate 가 결제를 재검증하지 않는다 (문서 자체가 증빙)",
    !/verifyPerUsePayment/.test(generateBody));
  check("/generate 가 락을 원자적으로 잡는다",
    /claimWave\s*\(/.test(generateBody) && /GENERATION_IN_PROGRESS/.test(generateBody));
  check("락 클레임이 stale 조건과 {new:true} 를 갖는다",
    /lock\.at.*\$lt/s.test(routeCode) && /new:\s*true/.test(routeCode));
  check("락 해제가 finally 에 있다", /finally\s*\{\s*await releaseLock/.test(routeCode));
  // 🔴 웨이브 상한이 없으면 클라이언트가 /generate 를 무한히 불러 LLM 호출을 끝없이 태운다.
  //    상한 검사는 락 클레임 **조건 안**에 있어야 원자적이다.
  check("웨이브 상한이 락 클레임 조건에 들어 있다",
    /waveCount:\s*\{\s*\$lt:\s*HD_REPORT_MAX_WAVES\s*\}/.test(routeCode));
  check("웨이브를 다 쓰면 닫고 환불한다",
    /WAVE_BUDGET_EXHAUSTED/.test(routeCode) && /HD_REPORT_MAX_WAVES/.test(generateBody));

  check("🔴 /result 에 결제 게이트가 없다", !/verifyPerUsePayment|PAYMENT_REQUIRED/.test(resultBody));
  check("/result 가 좀비를 승격해 환불한다", /GENERATION_STALLED/.test(resultBody) && /refundExecution/.test(resultBody));

  check("폴백 문턱을 실제로 넘긴다", /fallbackMinChars:\s*hdReportFallbackMinChars\(spec\)/.test(routeCode));
  check("🔴 LLM 캐시에 minChars 를 준다 (안 주면 미달 응답이 30일 굳는다)",
    /minChars:\s*effectiveMinChars\(/.test(routeCode));
  check("재시도는 캐시 읽기를 우회한다", /skipRead:/.test(routeCode));

  check("환불 3층이 모두 배선돼 있다",
    /startServiceExecution\s*\(/.test(routeCode)
    && /completeServiceExecution\s*\(/.test(routeCode)
    && /failServiceExecution\s*\(/.test(routeCode));
  check("전달 하한을 넘으면 결제를 유지한다", /hasRenderableLlmText\s*\(/.test(routeCode));
  check("전달 하한 미달이면 환불한다", /REPORT_UNDELIVERABLE/.test(routeCode));

  check("🔴 ctx.waitUntil 백그라운드 생성을 쓰지 않는다", !/waitUntil/.test(routeCode));
  check("JSON 파싱이 raw 제어문자 복구를 거친다", /escapeRawControlCharsInJsonStrings\s*\(/.test(routeCode));

  const indexSource = readRepoFile("worker/index.js");
  check("워커 라우터에 /api/human-design-report 가 배선돼 있다",
    indexSource.includes("/api/human-design-report") && indexSource.includes("handleHumanDesignReportRoutes"));
  check("🔴 AI 라우트 보안 래퍼를 거친다 (레이트리밋·남용 방지)",
    /runAiRouteWithSecurity\(request, env, "human-design-report", handleHumanDesignReportRoutes/.test(indexSource));
}

// ── 결과 ─────────────────────────────────────────────────────────────────────

if (failures.length) {
  console.error(`\n검증 실패 ${failures.length}건:`);
  failures.forEach((line) => console.error(`   - ${line}`));
  process.exit(1);
}
console.log("\n모든 휴먼 디자인 리포트 검증 통과 ✅ (LLM 실호출 0회)");
