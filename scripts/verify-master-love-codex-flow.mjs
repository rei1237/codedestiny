#!/usr/bin/env node
/**
 * 마스터 인연의 서 (MASTER_LOVE_CODEX) 회귀 가드.
 *
 * 확인 항목
 *  1. 가격 정본: 500코인 = 50,000원, 회당 결제(per_use)로 분류될 것
 *  2. 영구 해금으로 새지 않을 것(회당 결제인데 unlock 목록에 들어가면 재구매 불가)
 *  3. 이용권 선검사(canUseByPass) 후에만 402 를 주고, paymentMode 를 하드코딩하지 않을 것
 *  4. 프론트가 공용 게이트(billing-client)만 쓰고 coin-gate 를 직접 부르지 않을 것
 *  5. 20챕터·5만자 계약과 배치 생성(엣지 100초 컷 회피) 유지
 *  6. 라우트 등록(worker/index.js)·몰입형 크롬 제외·사이트맵 등재
 */

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(file) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) {
    failures.push(`missing file: ${file}`);
    return "";
  }
  return fs.readFileSync(full, "utf8").replace(/\r\n/g, "\n");
}
function assert(condition, message) {
  if (!condition) failures.push(message);
}
function assertIncludes(file, text, marker) {
  assert(text.includes(marker), `${file} missing marker: ${marker}`);
}

const FEATURE_KEY = "master-love-codex";

// ── 1~2. 가격/과금 유형 ──────────────────────────────────────────────────────
const { FEATURE_KEY_PRICE_TABLE, getPaidFeatureBillingType, PAID_FEATURE_BILLING_TYPES, FRONTEND_PAID_FEATURE_KEYS } =
  await import("../worker/lib/paid-feature-registry.js");

const pricing = FEATURE_KEY_PRICE_TABLE[FEATURE_KEY];
assert(Boolean(pricing), `paid-feature-registry: '${FEATURE_KEY}' 가격이 등록되어 있어야 합니다`);
assert(pricing?.cost === 500, `paid-feature-registry: '${FEATURE_KEY}' cost 는 500코인이어야 합니다 (현재 ${pricing?.cost})`);
assert(pricing?.amountKRW === 50000, `paid-feature-registry: '${FEATURE_KEY}' amountKRW 는 50000이어야 합니다 (현재 ${pricing?.amountKRW})`);
assert(
  getPaidFeatureBillingType(FEATURE_KEY) === PAID_FEATURE_BILLING_TYPES.PER_USE,
  `paid-feature-registry: '${FEATURE_KEY}' 는 회당 결제(per_use)여야 합니다. unlock 목록에 넣으면 재구매가 막힙니다`,
);
assert(
  FRONTEND_PAID_FEATURE_KEYS.includes(FEATURE_KEY),
  `paid-feature-registry: '${FEATURE_KEY}' 를 INTERNAL_FRONTEND_FEATURE_KEYS 에 등록해야 프론트가 서버 가격을 조회합니다`,
);

const fortuneSource = read("worker/routes/fortune.js");
assert(
  !fortuneSource.includes(`"${FEATURE_KEY}"`),
  `worker/routes/fortune.js: 회당 결제 키 '${FEATURE_KEY}' 가 영구 해금(PERSISTENT_UNLOCK_KEY_SET) 쪽에 들어가면 안 됩니다`,
);

// ── 3. 워커 라우트: 이용권 선검사 · paymentMode 미하드코딩 ───────────────────
const routeFile = "worker/routes/master-love-codex.js";
const routeSource = read(routeFile);
assertIncludes(routeFile, routeSource, "canUseByPass");
assertIncludes(routeFile, routeSource, "normalizeHoneyPassEntitlement");
assertIncludes(routeFile, routeSource, "PAYMENT_REQUIRED");
assertIncludes(routeFile, routeSource, "handleMasterLoveCodexRoutes");
assert(
  !/paymentMode\s*:\s*["']DIRECT_KRW["']/.test(routeSource),
  `${routeFile}: runtimeGate/paymentPayload 에 paymentMode 를 하드코딩하면 이용권 선검사를 건너뛰고 월정석 옵션이 사라집니다`,
);
assert(
  routeSource.indexOf("canUseByPass") < routeSource.indexOf("return paymentRequired("),
  `${routeFile}: 결제창(402) 을 주기 전에 이용권 선검사가 먼저 실행돼야 합니다`,
);
// 회당 결제인데 과거 결제 이력만으로 통과시키면 무한 재생성이 된다 — requestId 바인딩 확인
assertIncludes(routeFile, routeSource, "collectBillingTokens");
assertIncludes(routeFile, routeSource, "metadata.requestId");

// ── 4. 프론트: 공용 게이트만 사용 ────────────────────────────────────────────
const pageFile = "src/features/master-love-codex/MasterLoveCodexPage.tsx";
const pageSource = read(pageFile);
assertIncludes(pageFile, pageSource, "beginPaidFeatureGateCheck");
assertIncludes(pageFile, pageSource, "completePaidFeatureGateCheck");
assertIncludes(pageFile, pageSource, "failPaidFeatureGateCheck");
assertIncludes(pageFile, pageSource, "runBillingCoinGate");
assertIncludes(pageFile, pageSource, "/api/master-love-codex/ensure-access");
assert(
  !pageSource.includes("/api/billing/coin-gate"),
  `${pageFile}: coin-gate 를 직접 호출하지 말고 공용 게이트(runBillingCoinGate)만 사용해야 합니다`,
);
assert(
  !/paymentMode\s*:\s*["']DIRECT_KRW["']/.test(pageSource),
  `${pageFile}: 게이트 입력에 paymentMode:"DIRECT_KRW" 를 강제하면 단건 결제로 직행합니다`,
);
// 생년 프리필은 입력 컴포넌트가 담당한다(공용 훅 재사용 — 조회 로직 중복 구현 금지).
const birthGateFile = "src/features/master-love-codex/components/CodexBirthGate.tsx";
assertIncludes(birthGateFile, read(birthGateFile), "useAiProfileSeed");

// ── 5. 챕터 계약 ─────────────────────────────────────────────────────────────
const { MASTER_LOVE_CODEX_CHAPTERS, MASTER_LOVE_CODEX_META, getMasterLoveCodexPlan } =
  await import("../worker/lib/master-love-codex-prompt.mjs");

assert(MASTER_LOVE_CODEX_CHAPTERS.length === 20, `챕터는 20장이어야 합니다 (현재 ${MASTER_LOVE_CODEX_CHAPTERS.length})`);
assert(MASTER_LOVE_CODEX_META.costCoins === 500, "META.costCoins 는 500이어야 합니다");
const plan = getMasterLoveCodexPlan();
assert(
  plan.minTotalChars >= MASTER_LOVE_CODEX_META.minTotalChars,
  `챕터 minChars 합(${plan.minTotalChars})이 목표 하한(${MASTER_LOVE_CODEX_META.minTotalChars})보다 작습니다`,
);
const chapterIds = new Set(MASTER_LOVE_CODEX_CHAPTERS.map((chapter) => chapter.id));
assert(chapterIds.size === MASTER_LOVE_CODEX_CHAPTERS.length, "챕터 id 가 중복됩니다");
assert(
  MASTER_LOVE_CODEX_CHAPTERS.filter((chapter) => chapter.jsonMode).length === 1,
  "연애 DNA(JSON) 챕터는 정확히 1개여야 합니다",
);
// 배치 생성이 빠지면 20장 동기 생성이 되어 엣지 100초 컷에 걸린다.
assertIncludes(routeFile, routeSource, "CHAPTER_BATCH_SIZE");
assertIncludes(routeFile, routeSource, "acquireBatchLock");
assert(/BATCH_LOCK_TTL_MS\s*=\s*390_?000/.test(routeSource), `${routeFile}: 배치 락 TTL 은 390초여야 합니다(중복 기동 방지)`);
assert(
  !/fallbackToWorkersAI\s*:\s*true/.test(routeSource),
  `${routeFile}: 장문 생성은 Workers AI 폴백을 켜면 안 됩니다(모델 한계로 잘림)`,
);
assert(
  !/PREMIUM_GEMINI_TIMEOUT_MS/.test(routeSource),
  `${routeFile}: env.PREMIUM_GEMINI_TIMEOUT_MS 를 || 체인에 넣으면 45초로 단락됩니다`,
);

// ── 6. 등록 ──────────────────────────────────────────────────────────────────
const workerIndex = read("worker/index.js");
assertIncludes("worker/index.js", workerIndex, "handleMasterLoveCodexRoutes");
assertIncludes("worker/index.js", workerIndex, "/api/master-love-codex");

const models = read("worker/lib/models.js");
assertIncludes("worker/lib/models.js", models, "MasterLoveCodexSession");
assertIncludes("worker/lib/models.js", models, "masterLoveCodexSessions");

const appChrome = read("app/components/AppChrome.tsx");
assertIncludes("app/components/AppChrome.tsx", appChrome, `"/master-love-codex"`);

assertIncludes("lib/seo-site-urls.ts", read("lib/seo-site-urls.ts"), "/master-love-codex");
assertIncludes("scripts/generate-sitemap.mjs", read("scripts/generate-sitemap.mjs"), "/master-love-codex");
assertIncludes("app/_lib/serviceSections.js", read("app/_lib/serviceSections.js"), "/master-love-codex");

// 메인 화면 대표 상담 카드 — 루트 셸과 5개 미러 전부
for (const shell of [
  "index.html",
  "public/index.html",
  "public/static/index.html",
  "public/en/index.html",
  "public/ja/index.html",
  "public/zh/index.html",
]) {
  const source = read(shell);
  assertIncludes(shell, source, 'href="/master-love-codex"');
  assertIncludes(shell, source, "cd-sig-hero");
  assert(
    source.includes("html.neo-mode body .cd-sig-hero__title"),
    `${shell}: 네오 모드 텍스트 오버라이드가 빠지면 배경만 바뀌고 글자가 안 보입니다(반쪽 오버라이드 금지)`,
  );
}

if (failures.length) {
  console.error("[verify-master-love-codex-flow] FAILED");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log("[verify-master-love-codex-flow] OK");
