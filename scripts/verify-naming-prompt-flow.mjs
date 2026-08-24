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
  assertIncludes(file, html, 'href="/naming-ai/"');
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

// ---- 4b. 로케일별 작명 문화 분기 ----
// 🔴 로케일은 프롬프트 조립에만 쓰고 inputHash 에는 절대 넣지 않는다. 넣으면
//    (a) 배포 전 결제·배포 후 생성 사용자가 해시 불일치로 막히고
//    (b) 언어만 바꿔 재요청할 때 같은 리딩에 30,000원이 다시 청구된다.
assertIncludes("worker/routes/naming-prompt.js", route, "buildGeneratedPrompt(input, sajuSnapshot, body.locale)");
for (const marker of ["locale: clean(raw.locale", "locale: raw.locale", "locale,\n    year:"]) {
  assertNotIncludes("worker/routes/naming-prompt.js", route, marker);
}
{
  // 🔴 로케일 목록은 AI 출력 정본(lib/i18n/ai-locale.js)에서 읽는다. 프로파일이 목록을 따로
  //    적으면 두 목록이 갈라져 새 로케일이 조용히 ko 작명첩을 받으므로, 승계 자체를 단언한다.
  const profileSrc = read("worker/lib/naming-locale-profile.js");
  assertIncludes(
    "worker/lib/naming-locale-profile.js",
    profileSrc,
    "export const NAMING_LOCALES = Object.freeze([...AI_OUTPUT_LOCALES]);",
  );
  // 🔴 출력 언어 지시문은 여기서 만들지도, 다시 붙이지도 않는다. 요청 스코프 파이프
  //    (worker/index.js runWithAiLocale → gemini.js → llm-client applyOutputLocale)가 이미
  //    systemPrompt 와 프롬프트 꼬리 양쪽에 넣는다. 여기서 또 넣으면 같은 지시가 세 번 간다.
  //    정본은 "지시문을 한국어로 쓰지 말 것"까지 실측 근거와 함께 적어 두었다.
  //    (호출 형태로만 본다 — 왜 부르면 안 되는지 설명하는 주석에는 이 이름이 나와야 한다.)
  assertNotIncludes("worker/lib/naming-locale-profile.js", profileSrc, "buildOutputLanguageDirective(");
  assertNotIncludes("worker/lib/naming-locale-profile.js", profileSrc, "**출력 언어:");
  assertIncludes("worker/lib/naming-locale-profile.js", profileSrc, "NAMING BOOKLET CONTRACT");
  const canonical = read("lib/i18n/ai-locale.js").match(/export const AI_OUTPUT_LOCALES = \[([\s\S]*?)\]/);
  assert(canonical, "lib/i18n/ai-locale.js: AI_OUTPUT_LOCALES 목록을 찾지 못했다");
  const locales = [...canonical[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  assert(locales.length >= 12, `ai-locale.js: 로케일이 ${locales.length}개뿐이다(12개 이상이어야 한다)`);
  const profileKeys = profileSrc.slice(profileSrc.indexOf("const PROFILES = Object.freeze({"));
  for (const locale of locales) {
    const key = /^[a-z]+$/.test(locale) ? `  ${locale}:` : `  "${locale}":`;
    assert(profileKeys.includes(key), `naming-locale-profile.js: ${locale} 프로파일이 없다 — 조용히 ko 로 떨어진다`);
  }
  // 카드 블록 라벨은 파서의 키다. 번역하지 말라는 지시가 빠지면 비-ko 이름 카드가 사라진다.
  assertIncludes("worker/lib/naming-locale-profile.js", profileSrc, "한국어 그대로 두세요");
  // 골든 스냅샷이 있어야 ko 프롬프트 회귀를 잡을 수 있다.
  assert(
    fs.existsSync(rel("__tests__/worker/__fixtures__/naming-prompt.ko.golden.txt")),
    "ko 프롬프트 골든 스냅샷이 없다 — 로케일 분기가 ko 를 바꿔도 아무도 모른다",
  );
}

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
// (무료 초안용 용신은 클라에서 계산하지만 화면 표시 전용이고 서버로 보내지 않는다.)
// verify-payment 선검사는 제거됐다 — /generate가 접근권을 직접 검증하므로 이용권 검사는 서버 1회뿐이어야 한다.
for (const marker of ["sajuEvidence:", "buildNamingSajuEvidence", "namingSajuEvidence", '"/api/naming-prompt/verify-payment"']) {
  assertNotIncludes("app/naming-ai/NamingAiClient.tsx", formClient, marker);
}
// 🔴 결제 회귀 가드: 코인게이트 성공 응답은 이용권·월정석·코인에도 최상위 transactionId를 싣는다.
// 그걸 paymentId로 세탁해 보내면 워커가 단건 분기로 들어가 Payment 문서를 못 찾고 404로 죽는다
// (월정석은 이미 차감된 뒤라 돈만 나간다). paymentId 산출식에 되돌아오지 못하게 고정한다.
assertNotIncludes(
  "app/naming-ai/NamingAiClient.tsx",
  formClient,
  "payload.paymentId || payload.transactionId",
);
for (const marker of ["accessType: access.accessType", "accessMethod: access.accessMethod", "PAYMENT_NOT_FOUND:"]) {
  assertIncludes("app/naming-ai/NamingAiClient.tsx", formClient, marker);
}
// 워커 쪽 방어 — Payment 조회 404는 즉시 던지지 말고 이용권/월정석 분기로 폴백해야 한다.
for (const marker of ["pendingPaymentMiss", "resolveNamingYongshin"]) {
  assertIncludes("worker/routes/naming-prompt.js", route, marker);
}
// 소리오행·수리 블록은 로케일 분기 도입 때 프로파일 모듈로 옮겼다. 라우트가 아니라
// 거기 있는지 보되, ko 프로파일이 여전히 두 블록을 **호출**하는지까지 확인한다.
for (const marker of ["suriPromptBlock()", "soundGuidanceForFamilyName(input.familyName)", "soundFiveElementsList()"]) {
  assertIncludes("worker/lib/naming-locale-profile.js", read("worker/lib/naming-locale-profile.js"), marker);
}
// 🔴 회당 결제 증빙은 canAccessPaidFeature 보다 **먼저** 확인해야 한다.
// canAccessPaidFeature 는 지속 엔티틀먼트(이용권·영구해금)만 판정하고 회당 결제(월정석·코인 차감)에는
// 항상 PAYMENT_REQUIRED 를 주므로, 순서가 뒤집히면 차감이 끝난 사용자가 402 로 막힌다(돈만 나감).
assertIncludes("worker/routes/naming-prompt.js", route, "verifyNamingChargeEvidence");
// 단건 결제는 PointHistory 차감 기록이 없다 — Payment 문서를 입력 해시로 찾는 경로가 있어야
// 식별자가 왕복 중 유실돼도 결제를 마친 사용자가 402 로 막히지 않는다.
assertIncludes("worker/routes/naming-prompt.js", route, "findSettledNamingPayment");
// 🔴 /generate 는 동기 생성 라우트다. authFetch 는 호출부가 signal 을 주지 않으면 22초에 끊는데
// (app/_lib/auth-client.ts AUTH_FETCH_TIMEOUT_MS), 작명은 8,000~14,000자 목표라 항상 그보다 오래
// 걸린다. 클라 상한이 엣지 예산보다 짧아지면 결과가 서버에 저장되는데도 "확인 실패"만 뜬다.
{
  const { EDGE_RESPONSE_DEADLINE_MS } = await import("../worker/lib/sync-llm-timeout.js");
  const clientTimeout = Number((formClient.match(/const GENERATE_TIMEOUT_MS = (\d+)/) || [])[1] || 0);
  assert(
    clientTimeout > EDGE_RESPONSE_DEADLINE_MS,
    `GENERATE_TIMEOUT_MS(${clientTimeout})는 엣지 한계(${EDGE_RESPONSE_DEADLINE_MS})보다 커야 한다`,
  );
  // signal 을 넘겨야 authFetch 가 자기 22초 타임아웃을 걸지 않는다.
  assertIncludes("app/naming-ai/NamingAiClient.tsx", formClient, "signal: controller.signal");
  assertIncludes("app/naming-ai/NamingAiClient.tsx", formClient, "GENERATE_TIMEOUT_MS)");
  // 재시도 예산 가드 — 2차 LLM 호출이 엣지 한계를 넘기지 않아야 실패 처리·환불 경로가 돈다.
  for (const marker of ["remainingBudgetMs", "MIN_RETRY_BUDGET_MS", "EDGE_RESPONSE_DEADLINE_MS"]) {
    assertIncludes("worker/routes/naming-prompt.js", route, marker);
  }
}
// 코인게이트가 단건 성공에서 돌려주는 식별자가 merchantUid 로 고정돼 있지 않다.
for (const marker of ["{ requestId: normalized }", "{ idempotencyKey: normalized }"]) {
  assertIncludes("worker/routes/naming-prompt.js", route, marker);
}
// 가격 상수는 서버 레지스트리 정본과 같아야 한다(어긋나면 verifyPaymentShape 이 400 으로 되돌린다).
{
  const { FEATURE_KEY_PRICE_TABLE } = await import("../worker/lib/paid-feature-registry.js");
  const row = FEATURE_KEY_PRICE_TABLE["premium-naming-prompt"] || {};
  assert(row.cost === 300 && row.amountKRW === 30000, "작명 가격 정본이 300코인/30,000원이 아니다");
  assertIncludes("worker/routes/naming-prompt.js", route, "const AMOUNT_KRW = 30000");
  assertIncludes("worker/routes/naming-prompt.js", route, "const COIN_PRICE = 300");
  assertIncludes("app/naming-ai/NamingAiClient.tsx", formClient, "const AMOUNT_KRW = 30000");
  assertIncludes("app/naming-ai/NamingAiClient.tsx", formClient, "const COIN_PRICE = 300");
  const { calculateMembershipCreditCost } = await import("../worker/lib/billing-policy.js");
  assert(
    calculateMembershipCreditCost(row.cost) === 3000,
    "작명 월정석 가격이 정책 계산값(3,000)과 다르다",
  );
  assertIncludes("app/naming-ai/NamingAiClient.tsx", formClient, "const MEMBERSHIP_CREDIT_COST = 3000");
}
{
  const chargeAt = route.indexOf("const charge = await verifyNamingChargeEvidence(");
  const gateAt = route.indexOf("const decision = await canAccessPaidFeature(");
  assert(chargeAt > 0 && gateAt > 0, "회당 결제 증빙 검사와 이용권 검사 호출부를 찾지 못했다");
  assert(
    chargeAt < gateAt,
    "verifyNamingChargeEvidence()는 canAccessPaidFeature()보다 먼저 호출되어야 한다 (회당 결제자가 402로 막힌다)",
  );
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

// ---- 7-2. 작명 계산 모듈 계약 — 라이브 import 테스트 ----
{
  const sound = await import("../worker/lib/naming-sound-elements.js");
  // 🔴 배속 정본 = 작명 실무설(土 ㅇㅎ / 水 ㅁㅂㅍ). 훈민정음 해례본 원전은 土·水가 반대이며,
  // 되돌리면 모든 추천의 소리오행 판정이 뒤집힌다.
  assert(sound.SOUND_FIVE_ELEMENTS["土"].join("") === "ㅇㅎ", "소리오행 土 배속은 ㅇㅎ(작명 실무설)이어야 한다");
  assert(sound.SOUND_FIVE_ELEMENTS["水"].join("") === "ㅁㅂㅍ", "소리오행 水 배속은 ㅁㅂㅍ(작명 실무설)이어야 한다");
  assert(sound.getInitialConsonant("김") === "ㄱ" && sound.getInitialConsonant("A") === "", "초성 분해가 어긋났다");
  assert(sound.soundElementOf("박") === "water" && sound.soundElementOf("서") === "metal", "초성→오행 매핑이 어긋났다");
  const flow = sound.analyzeSoundFlow("박준서");
  assert(flow.harmonious === true && flow.elements.join(",") === "water,metal,metal", "소리 흐름 판정이 어긋났다");
  assert(sound.analyzeSoundFlow("김서윤").clashCount === 1, "상극 카운트가 어긋났다");
  // SEO 설명 문구도 같은 배속을 말해야 한다(과거 page.tsx가 반대로 적혀 있었다).
  const namingPage = read("app/naming-ai/page.tsx");
  assertIncludes("app/naming-ai/page.tsx", namingPage, "목구멍소리 ㅇㅎ 토");
  assertIncludes("app/naming-ai/page.tsx", namingPage, "입술소리 ㅁㅂㅍ 수");

  const suri = await import("../worker/lib/naming-suri.js");
  const suriAll = [...suri.AUSPICIOUS, ...suri.HALF, ...suri.INAUSPICIOUS].sort((a, b) => a - b);
  assert(suriAll.length === 81, `81수리표는 81개여야 한다(현재 ${suriAll.length})`);
  assert(
    suriAll.join(",") === Array.from({ length: 81 }, (_, i) => i + 1).join(","),
    "81수리표에 중복이나 누락이 있다",
  );
  assert(suri.suriFortune(82) === suri.suriFortune(1), "81 초과 수는 81을 빼고 판정해야 한다");
  const suriBlock = suri.suriPromptBlock();
  for (const marker of ["원격", "형격", "이격", "정격", "강희자전", "길수(吉)", "흉수(凶)"]) {
    assert(suriBlock.includes(marker), `suriPromptBlock()에 "${marker}"가 없다`);
  }

  const { buildSajuProfile } = await import("../worker/lib/destiny-bias-engine.js");
  const { resolveNamingYongshin } = await import("../worker/lib/saju-yongshin-policy.js");
  const profile = buildSajuProfile({
    name: "테스트",
    gender: "F",
    timezone: "Asia/Seoul",
    birthPlace: "대한민국",
    hourPillarTimePolicy: "TRUE_SOLAR_TIME",
    dayChangePolicy: "MIDNIGHT",
    birth: { year: 1990, month: 7, day: 15, hour: 13, minute: 20, calendarType: "solar", timezone: "Asia/Seoul", birthPlace: "대한민국" },
  });
  const verdict = resolveNamingYongshin(profile);
  for (const key of ["eokbuYongshin", "johuYongshin", "finalYongshin", "eokbuKijishin", "johuKijishin", "finalKijishin", "lacking", "excessive", "nameElements", "avoidElements"]) {
    assert(Array.isArray(verdict[key]), `resolveNamingYongshin().${key} 는 배열이어야 한다`);
  }
  assert(verdict.johu && verdict.johu.type && verdict.johu.season, "조후 판정이 비었다");
  // 용신과 기신에 같은 오행이 동시에 들어가면 프롬프트가 모순된 지시를 받는다.
  const overlap = verdict.finalYongshin.filter((element) => verdict.finalKijishin.includes(element));
  assert(overlap.length === 0, `최종 용신과 기신이 겹친다: ${overlap.join(",")}`);
  // 여름 한낮생이면 조후용신에 水가 잡혀야 한다(조후 축이 실제로 도는지 확인).
  assert(verdict.johuYongshin.includes("water"), "여름생인데 조후용신에 水가 없다 — 조후 계산이 안 돈다");
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
  'import { parseNamingResultCards } from "../lib/naming-result-cards.js";',
  'const RESULT_VERSION = "naming-result-v20260712";',
  "## 1. 작명가의 총평",
  "## 4. 이름 후보 상세",
  "## 8. 이름을 올리기 전에",
  // 카드 계약문은 로케일마다 갈리므로 프로파일에서 온다. ko 는 기존 상수를 그대로 재수출한다.
  "${profile.cardBlockContract}",
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
