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
 *   ⑤ 플랜   — 웹과 PDF 가 공유하는 플랜이 실제 픽스처에서 온전한 문서를 만드는가
 *   ⑥ PDF    — 조판이 글자를 잃지 않고 넘치지 않는가, 초융합 공개 시그니처가 그대로인가
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

  // 🔴 $setOnInsert 는 **기존 문서에 아무것도 쓰지 못한다.** generation_failed 로 닫힌 문서를
  //    그대로 두면 /generate 가 곧바로 409 GENERATION_ALREADY_FAILED 를 돌려주고, 사용자는
  //    다시 결제하고도 잠금 화면으로 되돌아온다. reportKey 가 결정적이라 영구히 반복된다.
  const reviveStart = startBody.indexOf("if (existing) {");
  const reviveEnd = startBody.indexOf("} else {", reviveStart + 1);
  const reviveBlock = reviveStart >= 0 && reviveEnd > reviveStart ? startBody.slice(reviveStart, reviveEnd) : "";
  const revivesWholeDoc = /\$set:\s*\{\s*\.\.\.doc/.test(reviveBlock);
  check("🔴 /start 가 generation_failed 문서를 되살린다 ($setOnInsert 는 기존 문서를 못 고친다)",
    /status: "generation_failed"/.test(reviveBlock) && revivesWholeDoc);
  check("🔴 부활이 waveCount·lock 을 되돌린다 (안 하면 첫 웨이브부터 상한 조건에 걸린다)",
    /waveCount: 0/.test(reviveBlock) && /lock: null/.test(reviveBlock));
  check("🔴 부활 문서의 billingRequestId 가 이번 결제의 requestId 다 (옛 값이면 새 결제가 환불되지 않는다)",
    revivesWholeDoc && /billingRequestId: requestId/.test(startBody));

  // 🔴 이 409 에 retryable 을 붙이면 postPaidBody 가 자기 재시도(5회)를 켠다. 훅의 4초 양보
  //    위에 재시도가 한 겹 더 쌓여(코딩 원칙 6) 웨이브당 요청이 5배가 되고, /start 와 공유하는
  //    분당 15회 상한을 넘겨 429 로 끝난다 — 429 에는 retryable 이 없어 곧장 에러 화면이다.
  const inProgressLine = routeCode.split("\n").find((line) => line.includes(String.raw`reason: "GENERATION_IN_PROGRESS"`));
  check("🔴 락 대기 409 에 retryable 을 붙이지 않는다 (클라이언트 재시도가 5배로 증폭된다)",
    Boolean(inProgressLine) && !/retryable/.test(inProgressLine));

  // 🔴 화면에 내보내는 섹션 집합과 과금·전달 하한이 세는 집합은 같아야 한다. 어긋나면
  //    진행률이 실제보다 적게 보고돼 클라이언트의 무진전 카운터가 멀쩡한 생성을 끊고,
  //    완성된 리포트도 결제 기준보다 적은 장수로 보인다.
  const publicStart = routeCode.indexOf("function publicReport");
  const publicEnds = ["\nfunction ", "\nasync function "]
    .map((marker) => routeCode.indexOf(marker, publicStart + 1))
    .filter((index) => index > 0);
  const publicBody = publicStart >= 0 && publicEnds.length ? routeCode.slice(publicStart, Math.min(...publicEnds)) : "";
  const deliveredLine = routeCode.split("\n").find((line) => line.includes("const delivered = all.filter")) || "";
  const acceptedStatuses = (text) => [...new Set(
    [...text.matchAll(/section\.status === "(\w+)"/g)].map((matched) => matched[1]),
  )].sort().join("+");
  const publicAccepted = acceptedStatuses(publicBody);
  const deliveredAccepted = acceptedStatuses(deliveredLine);
  check(`🔴 publicReport 가 내보내는 섹션 집합이 과금 하한과 같다 (${publicAccepted || "없음"} vs ${deliveredAccepted || "없음"})`,
    Boolean(publicAccepted) && publicAccepted === deliveredAccepted);

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

// ── ⑤ 플랜 — 웹과 PDF 의 단일 정본 ───────────────────────────────────────────
//
// 🔴 여기서는 플랜 모듈을 **실제로 실행한다.** 정규식으로 "있는 것 같다" 를 확인하는 대신
//    ko/en 픽스처로 문서를 만들어 빈 장·누락 블록·분량을 직접 잰다. 이 모듈이 순수 .js 인
//    이유가 그것이고, PR ④ 의 PDF 조판 시뮬레이션도 같은 출력을 먹는다.

console.log("\n── ⑤ 플랜 ──");

const planModule = await import(new URL("../lib/human-design/report-plan.js", import.meta.url).href);
const sectionsModule = await import(new URL("../lib/human-design/report-sections.js", import.meta.url).href);

check("장 목록이 계약의 18섹션과 순서까지 같다",
  sectionsModule.HD_REPORT_CHAPTER_ORDER.join(",") === contract.HD_REPORT_SECTION_KEYS.join(","),
  `${sectionsModule.HD_REPORT_CHAPTER_ORDER.length} vs ${contract.HD_REPORT_SECTION_KEYS.length}`);

check("블록 종류가 11종 이상 선언돼 있다",
  planModule.REPORT_BLOCK_KINDS.length >= 11, `${planModule.REPORT_BLOCK_KINDS.length}종`);

if (chart) {
  for (const locale of contract.HD_REPORT_LOCALES) {
    const fixture = JSON.parse(readRepoFile(`__tests__/fixtures/human-design/report-sample.${locale}.json`) || "{}");
    if (!fixture.sections?.length) {
      check(`[${locale}] 리포트 픽스처가 있다`, false, "sections 가 비었다");
      continue;
    }
    const plan = planModule.buildHumanDesignReportPlan(fixture, chart);

    check(`[${locale}] 18장을 전부 만든다`, plan.chapters.length === 18, `${plan.chapters.length}장`);
    check(`[${locale}] 빈 장이 없다`,
      plan.chapters.every((chapter) => chapter.blocks.length > 0),
      plan.chapters.filter((chapter) => !chapter.blocks.length).map((chapter) => chapter.key).join(",") || "-");
    check(`[${locale}] 모든 장이 제목을 갖는다`,
      plan.chapters.every((chapter) => chapter.title && chapter.title !== chapter.key));

    // 🔴 선언된 블록 종류가 전부 실제로 쓰이는지 본다. 안 쓰이는 종류가 있으면 렌더러에
    //    죽은 분기가 생기고, PDF 조판기는 그 분기를 영영 검증하지 못한 채 나간다.
    const used = new Set();
    for (const chapter of plan.chapters) for (const block of chapter.blocks) used.add(block.kind);
    const unused = planModule.REPORT_BLOCK_KINDS.filter((kind) => !used.has(kind));
    check(`[${locale}] 선언된 블록 종류가 전부 쓰인다`, unused.length === 0, unused.join(",") || "-");

    // 알 수 없는 종류가 나오면 렌더러가 본문으로 떨어뜨려 표가 문단이 된다.
    const unknown = [...used].filter((kind) => !planModule.REPORT_BLOCK_KINDS.includes(kind));
    check(`[${locale}] 선언에 없는 블록 종류를 만들지 않는다`, unknown.length === 0, unknown.join(",") || "-");

    check(`[${locale}] 도표 슬롯이 상한을 넘지 않는다`,
      plan.chartSlots.length <= planModule.REPORT_CHART_SLOT_LIMIT, `${plan.chartSlots.length}장`);
    check(`[${locale}] 도표 슬롯 id 가 중복되지 않는다`,
      new Set(plan.chartSlots.map((slot) => slot.slotId)).size === plan.chartSlots.length);
    check(`[${locale}] 도표 슬롯이 서로 다른 것을 보여 준다`,
      new Set(plan.chartSlots.map((slot) => JSON.stringify(slot.selection))).size === plan.chartSlots.length,
      "같은 선택을 여러 번 캡처하면 비용만 늘고 읽는 사람에게 주는 것이 없다");

    // 🔴 광고 분량(25,000자)의 90% 를 플랜이 실제로 담고 있어야 한다. 서버가 25,000자를
    //    만들어도 플랜이 그중 일부만 배치하면 사용자가 받는 것은 그 일부다.
    const chars = planModule.countReportChars(plan);
    check(`[${locale}] 플랜이 담은 분량이 광고 분량의 90% 이상이다`,
      chars >= contract.HD_REPORT_TARGET_CHARS * 0.9,
      `${chars.toLocaleString()}자 / ${contract.HD_REPORT_TARGET_CHARS.toLocaleString()}자`);

    check(`[${locale}] 본문 언어가 저장된 locale 을 따른다`, plan.locale === locale, plan.locale);

    // 표지 확정값은 결제 전 잠금 화면도 같은 함수로 만든다 — 값이 갈리면 안 된다.
    const coverFacts = planModule.buildReportCoverFacts(chart, locale);
    check(`[${locale}] 표지 확정값과 잠금 화면 확정값이 같은 함수에서 나온다`,
      JSON.stringify(coverFacts) === JSON.stringify(plan.cover.facts));
    check(`[${locale}] 표지에 확정값이 5개 실린다`, plan.cover.facts.length === 5, `${plan.cover.facts.length}개`);
  }

  // 🔴 출생 데이터가 플랜에 새지 않는지. 프롬프트에 안 실리는 것만으로는 부족하다 —
  //    플랜은 화면과 PDF 로 그대로 나가고 PDF 는 공유되기 쉬운 물건이다.
  const koFixture = JSON.parse(readRepoFile("__tests__/fixtures/human-design/report-sample.ko.json") || "{}");
  if (koFixture.sections?.length) {
    const plan = planModule.buildHumanDesignReportPlan(koFixture, chart);
    const coverText = JSON.stringify(plan.cover);
    const leaks = ["birthDate", "birthTime", "timezone", "birthUtc", "designUtc", "latitude", "longitude"]
      .filter((field) => coverText.includes(field));
    check("🔴 표지에 출생 데이터가 새지 않는다", leaks.length === 0, leaks.join(",") || "-");
    check("🔴 표지에 생년 숫자가 실리지 않는다", !/\b(18|19|20)\d{2}\b/.test(coverText));
  }
}

// 리더가 플랜만 소비하는지 — 자기 문장을 쓰면 그 문장은 PDF 에 없다(요구 3).
{
  const readerFiles = [
    "app/human-design/report/_components/ReportBlocks.tsx",
    "app/human-design/report/_components/ReportChapter.tsx",
  ];
  for (const file of readerFiles) {
    const source = readRepoFile(file);
    check(`${file} 를 찾았다`, source.length > 0);
    // 40자 이상 이어지는 한글 리터럴은 라벨이 아니라 본문이다.
    check(`${file} 에 리포트 본문 문장이 없다`,
      !/["'`][^"'`]*[가-힣][^"'`]{39,}["'`]/.test(codeLines(source)));
  }

  const clientSource = readRepoFile("app/human-design/report/HumanDesignReportClient.tsx");
  check("리더가 공용 플랜 함수만 쓴다",
    clientSource.includes("buildHumanDesignReportPlan")
    && !/function build[A-Z]\w*Plan/.test(clientSource),
    "화면이 자기 플랜을 따로 만들면 PDF 와 갈린다");
}


// ── ⑥ PDF 조판 — 요구 26을 기계로 ────────────────────────────────────────────
//
// 🔴 조판 품질은 눈으로 봐야 아는 것처럼 보이지만 **대부분 산술**이다. 여기서는 브라우저도
//    jsPDF 도 없이 lib/pdf/typeset-metrics.js 로 문서 전체를 실제로 조판해 보고, 글자 잘림 ·
//    페이지 넘침 · 빈 페이지 · 제목 홀로 남기 · 쪽번호를 직접 잰다.
//
// 🔴 여기서 **못 보는 것**: 실물 글리프(Paperlogy 가 라틴을 덮는가) · 실제 파일 크기 ·
//    도표 판독성. 그건 사람이 ko/en 각 1부를 열어 봐야 안다.

console.log("\n── ⑥ PDF 조판 ──");

const metrics = await import(new URL("../lib/pdf/typeset-metrics.js", import.meta.url).href);
const pdfChapters = await import(new URL("../lib/pdf/human-design-report-chapters.js", import.meta.url).href);

check("조판 상수가 A4 이고 본문 폭·하단선이 유도값이다",
  metrics.PAGE_WIDTH_MM === 210 && metrics.PAGE_HEIGHT_MM === 297
  && metrics.CONTENT_WIDTH_MM === 166 && metrics.CONTENT_BOTTOM_MM === 271,
  `${metrics.CONTENT_WIDTH_MM} / ${metrics.CONTENT_BOTTOM_MM}`);

// 🔴 추출 전 초융합 writer 의 값 그대로여야 한다. 이 숫자가 바뀌면 살아 있는 상품의 페이지
//    나눔이 조용히 달라진다(추출 시 실측 대조: 2026-08-24).
const FUSION_PINNED = { lead: [11.5, 1.8], body: [10.5, 1.78], heading: [11.5, 1.4], caption: [8.5, 1.5], bullets: [10, 1.7] };
for (const [kind, [sizePt, factor]] of Object.entries(FUSION_PINNED)) {
  const style = metrics.BLOCK_STYLE[kind];
  check(`🔴 초융합 조판 규격 유지 — ${kind}`,
    style?.sizePt === sizePt && style?.factor === factor,
    `${style?.sizePt}pt x${style?.factor}`);
}
check("🔴 heading 의 keepMm 이 추출 전 need(16) 그대로다", metrics.BLOCK_STYLE.heading.keepMm === 16,
  String(metrics.BLOCK_STYLE.heading.keepMm));

if (chart) {
  for (const locale of contract.HD_REPORT_LOCALES) {
    const fixture = JSON.parse(readRepoFile(`__tests__/fixtures/human-design/report-sample.${locale}.json`) || "{}");
    if (!fixture.sections?.length) continue;

    const plan = planModule.buildHumanDesignReportPlan(fixture, chart);
    // 캡처본이 있는 경우와 하나도 없는 경우 둘 다 조판해 본다 — 캡처는 실패할 수 있고,
    // 실패했을 때 빈 자리나 캡션만 남으면 안 된다.
    const images = new Map(plan.chartSlots.map((slot) => [slot.slotId, { dataUrl: "data:image/jpeg;base64,AA", ratio: 1000 / 540 }]));
    for (const [label, imageMap] of [["도표 있음", images], ["도표 없음", new Map()]]) {
      const chapters = pdfChapters.buildHumanDesignPdfChapters(plan, imageMap);
      const { pages, contents } = metrics.paginate(chapters);
      const tag = `[${locale}/${label}]`;

      check(`${tag} 장이 하나도 빠지지 않았다`, chapters.length === 18, `${chapters.length}장`);

      // 텍스트 잘림 — 조판 전후 글자 수가 같아야 한다.
      const before = metrics.countPlanChars(chapters);
      const after = metrics.countPaginatedChars(pages);
      check(`${tag} 조판이 글자를 잃지 않는다`, before === after, `${before} → ${after}`);

      // 페이지 넘침.
      const overflow = pages.filter((page) => page.usedMm > metrics.CONTENT_HEIGHT_MM + 0.01);
      check(`${tag} 본문이 하단선을 넘지 않는다`, overflow.length === 0, `${overflow.length}쪽`);

      // 빈 페이지 · 제목만 있는 페이지.
      check(`${tag} 빈 페이지가 없다`, pages.every((page) => page.blocks.length > 0));
      const titleOnly = pages.filter((page) => page.blocks.length === 1 && page.blocks[0].kind === "chapterHead");
      check(`${tag} 제목만 있는 페이지가 없다`, titleOnly.length === 0, `${titleOnly.length}쪽`);

      // 🔴 제목 orphan — 페이지의 **마지막** 블록이 heading 이면 소제목만 남고 본문은 다음 장이다.
      const orphan = pages.filter((page) => page.blocks[page.blocks.length - 1]?.kind === "heading");
      check(`${tag} 소제목이 페이지 바닥에 홀로 남지 않는다`, orphan.length === 0, `${orphan.length}쪽`);

      // 장은 언제나 새 페이지에서 시작한다.
      check(`${tag} 모든 장이 페이지 첫 블록으로 시작한다`,
        pages.filter((page) => page.blocks.some((block) => block.kind === "chapterHead"))
          .every((page) => page.blocks[0].kind === "chapterHead"));

      // 쪽번호 — 차례가 본문 첫 페이지(3)부터, 단조 증가, 장 수와 같다.
      check(`${tag} 차례 항목이 장 수와 같다`, contents.length === chapters.length);
      check(`${tag} 쪽번호가 3부터 시작한다`, contents[0]?.page === 3, String(contents[0]?.page));
      check(`${tag} 쪽번호가 단조 증가한다`,
        contents.every((entry, index) => index === 0 || entry.page > contents[index - 1].page));
      const lastPage = pages[pages.length - 1]?.index || 0;
      check(`${tag} 차례의 마지막 쪽번호가 실제 페이지 안이다`,
        contents[contents.length - 1].page <= lastPage, `${contents[contents.length - 1].page} / ${lastPage}`);

      // 분량 — 조판된 문서가 광고 분량의 90% 이상을 담는다.
      check(`${tag} 조판 분량이 광고 분량의 90% 이상이다`,
        after >= contract.HD_REPORT_TARGET_CHARS * 0.9,
        `${after.toLocaleString()}자`);

      // 도표.
      const imageBlocks = pages.flatMap((page) => page.blocks).filter((block) => block.kind === "image");
      if (imageMap.size) {
        check(`${tag} 도표가 슬롯 수만큼 실린다`, imageBlocks.length === plan.chartSlots.length,
          `${imageBlocks.length} / ${plan.chartSlots.length}`);
        check(`${tag} 도표 한 장이 한 페이지를 넘지 않는다`,
          imageBlocks.every((block) => block.heightMm <= metrics.CONTENT_HEIGHT_MM),
          `${Math.max(...imageBlocks.map((block) => block.heightMm)).toFixed(1)}mm`);
      } else {
        // 🔴 캡처가 전부 실패해도 문서는 만들어져야 하고, 캡션만 남은 자리가 있으면 안 된다.
        check(`${tag} 캡처 실패 시 도표 블록이 통째로 빠진다`, imageBlocks.length === 0);
        check(`${tag} 캡처 실패해도 18장이 유지된다`, chapters.length === 18);
        // 그림 없이 "정의된 센터 강조" 같은 캡션만 남으면 독자는 없는 그림을 찾게 된다.
        const captions = new Set(plan.chartSlots.map((slot) => slot.caption));
        const orphanCaption = pages
          .flatMap((page) => page.blocks)
          .filter((block) => captions.has(String(block.text || block.caption || "")));
        check(`${tag} 그림 없는 캡션이 남지 않는다`, orphanCaption.length === 0, `${orphanCaption.length}개`);
      }
    }
  }

  // 🔴 다국어 깨짐 — 이모지·이형문자는 임베드 폰트가 못 덮어 PDF 에서 두부(□)가 된다.
  //    모델이 이모지를 뱉는 경우를 여기서 잡는다.
  const forbidden = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;
  for (const locale of contract.HD_REPORT_LOCALES) {
    const fixture = JSON.parse(readRepoFile(`__tests__/fixtures/human-design/report-sample.${locale}.json`) || "{}");
    if (!fixture.sections?.length) continue;
    const plan = planModule.buildHumanDesignReportPlan(fixture, chart);
    const chapters = pdfChapters.buildHumanDesignPdfChapters(plan, new Map());
    const all = chapters.map((chapter) => chapter.title + chapters.map(() => "").join("")
      + chapter.blocks.map((block) => metrics.blockText(block)).join("\n")).join("\n");
    check(`[${locale}] 조판 대상에 임베드 폰트가 못 덮는 문자가 없다`, !forbidden.test(all));
  }
}

// ── 초융합 회귀 — 공개 시그니처가 하나도 바뀌지 않았는가 ─────────────────────
{
  const fusion = readRepoFile("lib/pdf/export-fusion-report-pdf.ts");
  check("초융합 PDF 모듈을 찾았다", fusion.length > 0);
  for (const name of [
    "FusionReportSection", "FusionReportResult", "ExportFusionReportPdfOptions",
    "FusionPdfFontError", "FusionReportBlock", "FusionReportChapter", "exportFusionReportPdf",
  ]) {
    check(`초융합 공개 export 유지 — ${name}`, new RegExp(`export (type |async function |\\{ ?)${name}\\b|export \\{[^}]*\\b${name}\\b`).test(fusion));
  }
  // 🔴 서브클래스로 만들면 FusionFortuneClient 의 `cause instanceof FusionPdfFontError` 가
  //    조용히 안 잡혀 폰트 실패 시 캡처 폴백이 사라진다. **같은 클래스**여야 한다.
  // 🔴 부정 검사는 **주석을 걷어낸 뒤** 한다. 이 파일은 "class … extends 로 만들지 말 것" 이라고
  //    주석에 적어 두었고, 주석을 그대로 보면 그 경고문 자체가 가드를 깨뜨린다.
  check("🔴 FusionPdfFontError 가 엔진의 PdfFontError 그 클래스다",
    /const FusionPdfFontError = PdfFontError;/.test(fusion)
    && !/class FusionPdfFontError\s+extends/.test(codeLines(fusion)));
  check("폰트 실패는 구분되는 에러로 던진다", fusion.includes("throw new FusionPdfFontError()"));
  check("🔴 바탕칠은 페이지를 만든 직후에만 한다", /pdf\.addPage\(\);\s*\r?\n\s*paintPaper\(pdf\);/.test(fusion));
  check("초융합은 조판 상수를 스스로 갖지 않는다(엔진에서 온다)",
    !/const (PAGE_WIDTH_MM|MARGIN_X_MM|CONTENT_BOTTOM_MM|PT_TO_MM) =/.test(fusion));

  const shared = readRepoFile("lib/pdf/export-result-pdf.ts");
  check("🔴 공용 캡처 유틸을 건드리지 않았다(15개 기능 공유)",
    shared.includes("export async function registerPdfFontsSafely")
    && shared.includes("captureTargets") && shared.includes("html2canvas"));
}

// ── 웹과 PDF 가 같은 플랜을 먹는가 ───────────────────────────────────────────
{
  const exporter = readRepoFile("lib/pdf/export-human-design-report-pdf.ts");
  const chaptersSrc = readRepoFile("lib/pdf/human-design-report-chapters.js");
  check("PDF 내보내기 모듈을 찾았다", exporter.length > 0);
  check("🔴 PDF 가 문서를 다시 구성하지 않는다(플랜 어댑터만 쓴다)",
    exporter.includes("buildHumanDesignPdfChapters")
    && !/buildHumanDesignReportPlan\s*\(/.test(exporter));
  check("🔴 어댑터는 도표만 바꾸고 순서·문장을 만들지 않는다",
    !/[ㄱ-힝][^"'`]{20,}/.test(codeLines(chaptersSrc).replace(/\/\/[^\n]*/g, "")));
  check("🔴 폰트 실패에 캡처 폴백을 만들지 않는다(본문이 접혀 있어 빈 페이지가 된다)",
    !/html2canvas/.test(exporter) && exporter.includes("PdfFontError"));
  check("🔴 표지·파일명에 출생 데이터를 싣지 않는다",
    !/birthDate|birthTime|timezone|birthUtc/.test(exporter));

  const download = readRepoFile("app/human-design/report/_components/ReportDownload.tsx");
  check("🔴 PDF 재생성이 AI 를 다시 부르지 않는다",
    download.length > 0 && !/human-design-report\/(start|generate)/.test(download));

  const capture = readRepoFile("app/human-design/report/_lib/capture-chart-slots.tsx");
  check("🔴 도표는 화면 밖 별도 인스턴스를 순차로 찍는다",
    /interactive: false/.test(capture) && /staticRender: true/.test(capture)
    && /for \(let index = 0/.test(capture));
  check("🔴 캡처 전에 레이아웃 확정을 기다린다",
    /requestAnimationFrame\(\(\) => requestAnimationFrame/.test(capture));
  const widthMatch = capture.match(/HOST_WIDTH_PX = (\d+)/);
  const scaleMatch = capture.match(/CAPTURE_SCALE = (\d+)/);
  const px = Number(widthMatch?.[1] || 0) * Number(scaleMatch?.[1] || 0);
  check("🔴 도표 캡처 해상도가 게이트 번호를 읽을 만큼 크다", px >= 1960, `${px}px`);
  check("🔴 저사양에서도 장수를 줄이지 않는다(배율만 낮춘다)",
    /LOW_MEMORY_SCALE/.test(capture) && !/slots\.slice/.test(capture));
}


// ── ⑦ 클라이언트 웨이브 루프 ─────────────────────────────────────────────────
//
// 🔴 이 절이 없어서 사고가 났다. 위의 검사들은 전부 "문자열이 있는가" 라서 **시간 예산이
//    서로 어긋난 것** 을 원리상 볼 수 없었다. 서버는 한 웨이브를 75초까지 붙들도록 만들어
//    두었는데 클라이언트 authFetch 의 기본 상한은 22초여서 정상 웨이브가 매번 abort 됐고,
//    결국 웨이브 상한(10)에 걸려 환불 + generation_failed 로 닫혔다 — 결제하고도 리포트가
//    안 나오던 실제 경로다. 그래서 여기서는 **숫자를 직접 비교한다.**

console.log("\n── ⑦ 클라이언트 웨이브 루프 ──");

const hookSource = readRepoFile("app/human-design/report/_lib/useReportGeneration.ts");
check("웨이브 훅 파일이 있다", hookSource.length > 0);
if (!hookSource) {
  check("🔴 훅을 읽지 못해 시간 예산을 확인할 수 없다", false);
} else {
  const hookCode = codeLines(hookSource);
  const constMs = (name) => {
    const matched = hookCode.match(new RegExp(`${name} = (\\d+)`));
    return matched ? Number(matched[1]) : 0;
  };
  const waveTimeoutMs = constMs("WAVE_REQUEST_TIMEOUT_MS");
  const waveBudgetMs = constMs("WAVE_REQUEST_BUDGET_MS");

  check("/generate 호출이 자기 전송 상한을 넘긴다 (authFetch 기본 22초를 대체한다)",
    /timeoutMs: WAVE_REQUEST_TIMEOUT_MS/.test(hookCode) && /budgetMs: WAVE_REQUEST_BUDGET_MS/.test(hookCode));
  check(`🔴 전송 상한이 서버 웨이브 예산보다 크다 (${waveTimeoutMs}ms > ${contract.HD_REPORT_WAVE_BUDGET_MS}ms)`,
    waveTimeoutMs > contract.HD_REPORT_WAVE_BUDGET_MS);
  check(`🔴 전송 상한이 엣지 응답 데드라인 이상이다 (${waveTimeoutMs}ms ≥ ${syncTimeout.EDGE_RESPONSE_DEADLINE_MS}ms)`,
    waveTimeoutMs >= syncTimeout.EDGE_RESPONSE_DEADLINE_MS);
  check(`🔴 총예산이 한 번의 전송 상한을 온전히 담는다 (${waveBudgetMs}ms ≥ ${waveTimeoutMs}ms)`,
    waveTimeoutMs > 0 && waveBudgetMs >= waveTimeoutMs);

  check("🔴 재열람이 generating 이면 남은 웨이브를 이어 돌린다 (빈 리포트를 그리지 않는다)",
    /data\.reused === true/.test(hookCode) && /data\.status === "generating"/.test(hookCode));
  check("🔴 훅이 자기 백오프 루프를 만들지 않는다 (postPaidBody 가 이미 재시도한다)",
    !/Math\.pow/.test(hookCode));

  const fetchSource = readRepoFile("app/nakshatra/nakshatra-fetch.ts");
  check("🔴 postPaidBody 가 timeoutMs 를 authFetch 의 signal 로 넘긴다 (안 넘기면 22초에 잘린다)",
    /timeoutMs\?: number/.test(fetchSource) && /signal: controller\.signal/.test(fetchSource));
  check("🔴 그 타이머를 finally 에서 해제한다",
    /finally \{[\s\S]{0,120}clearTimeout\(timer\)/.test(fetchSource));
}

// ── ⑧ 생성 화면 · 차트 인계 · 계측 ───────────────────────────────────────────
//
// 🔴 여기서 지키는 것은 "지어낸 진행률" 금지선이다. 생성 화면이 무엇을 '작성 중' 이라고
//    말하려면 그 근거가 **서버 계약**이어야 한다 — 경과 시간이면 안 된다.

console.log("\n── ⑧ 생성 화면 · 차트 인계 · 계측 ──");

const progressSource = readRepoFile("app/human-design/report/_components/GenerationProgress.tsx");
check("생성 화면 파일이 있다", progressSource.length > 0);
if (!progressSource) {
  check("🔴 생성 화면을 읽지 못해 진행률 계약을 확인할 수 없다", false);
} else {
  const progressCode = codeLines(progressSource);
  const writingWindow = Number((progressCode.match(/WRITING_WINDOW = (\d+)/) || [])[1] || 0);

  check(`🔴 '작성 중' 장 수가 서버 동시성과 같다 (${writingWindow} = ${contract.HD_REPORT_SECTION_CONCURRENCY})`,
    writingWindow > 0 && writingWindow === contract.HD_REPORT_SECTION_CONCURRENCY,
    "서버보다 크면 아직 시작도 안 한 장을 작성 중이라고 말하게 된다");
  check("🔴 '작성 중' 을 완료 여부에서 유도한다 (경과 시간이 아니다)",
    /completedKeys\.has\(entry\.key\)/.test(progressCode) && /\.slice\(0, WRITING_WINDOW\)/.test(progressCode));

  // 목록을 그리는 자리에 경과 시간이 얼씬하면 그게 곧 시간 기반 점등이다.
  const listStart = progressCode.indexOf("entries.map(");
  const listCode = listStart > 0 ? progressCode.slice(listStart) : "";
  check("🔴 목록이 경과 시간을 읽지 않는다 (시간으로 칠하면 지어낸 진행률이다)",
    listCode.length > 0 && !/elapsed/i.test(listCode));

  check("이미 저작된 statusWriting 카피를 쓴다 (새 번역을 만들지 않는다)",
    /"statusWriting"/.test(progressCode));
  check("🔴 배경을 다시 그리지 않고 PipelineField 를 재사용한다",
    /import \{ PipelineField \}/.test(progressCode) && /<PipelineField \/>/.test(progressCode));
}

const sceneCss = readRepoFile("app/human-design/report/_components/generation-scene.module.css");
check("생성 씬 CSS 가 있다", sceneCss.length > 0);
if (sceneCss) {
  check("🔴 씬 CSS 가 성운·별밭을 복제하지 않는다 (정본은 pipeline-scene.module.css)",
    !/\.nebula|\.stars\b|\.wireframe/.test(codeLines(sceneCss)));

  const reduced = sceneCss.slice(sceneCss.indexOf("@media (prefers-reduced-motion: reduce)"));
  check("모션 감소 블록이 있다", reduced.length > 0);
  // 🔴 animation: none 만 두면 hdGenItemIn 의 시작 프레임(opacity: 0)이 그대로 남아
  //    목록 18줄이 통째로 사라진다. 끄는 것이 아니라 최종 상태로 앉혀야 한다.
  check("🔴 모션 감소에서 목록이 최종 상태로 앉는다 (사라지지 않는다)",
    /\.item \{\s*animation: none;\s*transform: none;\s*opacity: 1;/.test(reduced));
  // 🔴 규칙 **하나하나**가 최종 opacity 를 못박아야 한다. 총합만 세면 한 규칙이 두 번 적고
  //    다른 규칙이 빠져도 통과하고, 빠진 그 요소만 투명한 채로 영원히 안 보인다.
  const settledRules = (reduced.match(/\{[^{}]*\}/g) || []).filter((rule) => /animation: none;/.test(rule));
  check(`🔴 모션 감소 규칙이 전부 opacity 를 함께 못박는다 (${settledRules.length}건)`,
    settledRules.length > 0 && settledRules.every((rule) => /opacity:/.test(rule)));
}

const handoffSource = readRepoFile("app/human-design/_lib/chart-handoff.ts");
check("차트 인계 모듈이 있다", handoffSource.length > 0);
if (handoffSource) {
  const handoffCode = codeLines(handoffSource);
  // 🔴 표시 전용 계약. 결제·이용권 상태가 여기 들어가면 클라이언트가 고칠 수 있는 값이
  //    유료 판정에 닿는다. 서버는 계속 자기 아카이브를 읽는다.
  check("🔴 인계 캐시에 결제·이용권 상태를 담지 않는다",
    !/reportId|accessType|accessSource|billing|passId|entitle/i.test(handoffCode));
  check("🔴 세션 저장소만 쓴다 (탭을 닫으면 서버에 다시 묻는다)",
    /sessionStorage/.test(handoffCode) && !/localStorage/.test(handoffCode));
  check("출생 입력이 다르면 캐시를 버린다", /sameBirth/.test(handoffCode));
}

const reportClient = readRepoFile("app/human-design/report/HumanDesignReportClient.tsx");
if (reportClient) {
  const clientCode = codeLines(reportClient);
  check("🔴 리포트 화면이 인계된 차트를 먼저 본다 (같은 차트를 두 번 계산시키지 않는다)",
    /readChartHandoff\(stored\)/.test(clientCode));
  // 🔴 locale 은 마운트 뒤 이펙트로 재확정된다. 차트 이펙트가 그것에 의존하면 ko 가 아닌
  //    사용자에게 /api/human-design/chart 가 두 번 나간다.
  check("🔴 차트 이펙트가 locale 에 의존하지 않는다 (이중 발화 금지)",
    /return \(\) => \{ cancelled = true; \};\s*\}, \[\]\);/.test(clientCode));
  check("차트 인계 키를 직접 적지 않고 공용 모듈에서 가져온다",
    /BIRTH_STORAGE_KEY/.test(clientCode) && !/"cd_hd_birth_v1"/.test(clientCode));
}

const chartRoute = readRepoFile("worker/routes/human-design.js");
const ephemeris = readRepoFile("worker/lib/human-design-ephemeris.js");
if (chartRoute && ephemeris) {
  const routeCode = codeLines(chartRoute);
  // 🔴 재지 않은 구간은 없는 구간이 아니다. 인증·아카이브 조회가 pipeline 밖에 있으면
  //    "차트가 느리다" 는 신고를 받아도 어디가 느린지 응답만 보고는 알 수 없다.
  check("🔴 스테이지 타이머가 인증보다 먼저 시작한다",
    routeCode.indexOf("createStageTimer") < routeCode.indexOf("requireAuth(request, env)"));
  check("인증 구간을 잰다", /timer\.mark\("AUTH"\)/.test(routeCode));
  check("아카이브 조회 미스 구간을 잰다", /timer\.mark\("ARCHIVE_LOOKUP"\)/.test(routeCode));
  check("계산 내부 단계를 타이머에 배선한다", /onStage: \(stage\) => timer\.mark\(stage\)/.test(routeCode));

  const ephemerisCode = codeLines(ephemeris);
  for (const stage of ["PERSONALITY", "DESIGN_SEARCH", "DESIGN"]) {
    check(`계산이 ${stage} 구간을 알린다`, new RegExp(`markStage\\("${stage}"\\)`).test(ephemerisCode));
  }
  // 🔴 계측을 위해 공용 Swiss 모듈에 워밍업 export 를 뚫지 않는다. 사주·서양점성술·베딕이
  //    같은 모듈을 쓴다. 콜드 초기화 비용은 PERSONALITY 와 DESIGN 의 차이로 읽는다.
  check("🔴 계측이 공용 Swiss 모듈을 건드리지 않는다",
    !/warmSwiss|initSwiss|swissWarm/i.test(ephemerisCode));
}

// ── 결과 ─────────────────────────────────────────────────────────────────────

if (failures.length) {
  console.error(`\n검증 실패 ${failures.length}건:`);
  failures.forEach((line) => console.error(`   - ${line}`));
  process.exit(1);
}
console.log("\n모든 휴먼 디자인 리포트 검증 통과 ✅ (LLM 실호출 0회)");
