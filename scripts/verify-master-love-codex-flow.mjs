#!/usr/bin/env node
/**
 * 마스터 인연의 서 (MASTER_LOVE_CODEX) 회귀 가드.
 *
 * 확인 항목
 *  1. 가격 정본: 500코인 = 50,000원, 회당 결제(per_use)로 분류될 것
 *  2. 영구 해금으로 새지 않을 것(회당 결제인데 unlock 목록에 들어가면 재구매 불가)
 *  3. 이용권 선검사(canUseByPass) 후에만 402 를 주고, paymentMode 를 하드코딩하지 않을 것
 *  4. 프론트가 공용 게이트(billing-client)만 쓰고 coin-gate 를 직접 부르지 않을 것
 *  4-2. 결제 CTA 는 "결과 보기" 하나이며, 그 위에 사주×자미두수 가치·5막·정직한 한계가 함께 있을 것
 *  4-3. 프롤로그가 두 체계를 겹쳐 본다는 장점을 질문 씬 앞에서 말할 것(+ seen 키 v2)
 *  5. 20챕터·5만자 계약과 배치 생성(엣지 100초 컷 회피) 유지
 *  6. 라우트 등록(worker/index.js)·몰입형 크롬 제외·사이트맵 등재
 *  7. PDF 캡처 계약: 캡처 대상이 문서 div 안에 있고, 데이터 값이 @keyframes 가 아니며,
 *     애니메이션 컴포넌트가 forceVisible/skip 을 받을 것(결제 산출물이 백지·0% 로 나가는 것 방지)
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
const COMPAT_FEATURE_KEY = "master-love-codex-compat";

// ── 1~2. 가격/과금 유형 ──────────────────────────────────────────────────────
const { FEATURE_KEY_PRICE_TABLE, getPaidFeatureBillingType, PAID_FEATURE_BILLING_TYPES, FRONTEND_PAID_FEATURE_KEYS } =
  await import("../worker/lib/paid-feature-registry.js");

// 개인판(solo) / 궁합판(compat) 두 SKU. 궁합은 상대 명식·명반까지 4장을 근거로 삼아 상위 가격이다.
const SKUS = [
  { key: FEATURE_KEY, cost: 200, amountKRW: 20000, label: "개인판" },
  { key: COMPAT_FEATURE_KEY, cost: 300, amountKRW: 30000, label: "궁합판" },
];

for (const sku of SKUS) {
  const pricing = FEATURE_KEY_PRICE_TABLE[sku.key];
  assert(Boolean(pricing), `paid-feature-registry: '${sku.key}' 가격이 등록되어 있어야 합니다`);
  assert(pricing?.cost === sku.cost, `paid-feature-registry: '${sku.key}'(${sku.label}) cost 는 ${sku.cost}코인이어야 합니다 (현재 ${pricing?.cost})`);
  assert(
    pricing?.amountKRW === sku.amountKRW,
    `paid-feature-registry: '${sku.key}'(${sku.label}) amountKRW 는 ${sku.amountKRW}이어야 합니다 (현재 ${pricing?.amountKRW})`,
  );
  assert(
    getPaidFeatureBillingType(sku.key) === PAID_FEATURE_BILLING_TYPES.PER_USE,
    `paid-feature-registry: '${sku.key}' 는 회당 결제(per_use)여야 합니다. unlock 목록에 넣으면 재구매가 막힙니다`,
  );
  assert(
    FRONTEND_PAID_FEATURE_KEYS.includes(sku.key),
    `paid-feature-registry: '${sku.key}' 를 INTERNAL_FRONTEND_FEATURE_KEYS 에 등록해야 프론트가 서버 가격을 조회합니다`,
  );
}

// 궁합이 개인판보다 싸지면 상대 정보를 넣는 쪽이 이득이 되어 가격 체계가 뒤집힌다.
assert(
  FEATURE_KEY_PRICE_TABLE[COMPAT_FEATURE_KEY]?.cost > FEATURE_KEY_PRICE_TABLE[FEATURE_KEY]?.cost,
  "paid-feature-registry: 궁합판 가격은 개인판보다 높아야 합니다",
);

const fortuneSource = read("worker/routes/fortune.js");
for (const sku of SKUS) {
  assert(
    !fortuneSource.includes(`"${sku.key}"`),
    `worker/routes/fortune.js: 회당 결제 키 '${sku.key}' 가 영구 해금(PERSISTENT_UNLOCK_KEY_SET) 쪽에 들어가면 안 됩니다`,
  );
}

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

// 🔴 결제 증빙 조회는 이 요청의 모드 featureKey 로 해야 한다. 상수(개인판)로 박으면 궁합판
//    (300코인) 결제가 `master-love-codex-compat` 로 기록되는데 개인판 키로 찾게 되어,
//    결제를 마친 사용자가 /start 에서 402 를 받는다(돈만 나간다).
assert(
  /findBillingEvidence\([\s\S]{0,260}?featureKey:\s*resolveMode\(normalized\.mode\)\.featureKey/.test(routeSource),
  `${routeFile}: findBillingEvidence 에 resolveMode(normalized.mode).featureKey 를 넘겨야 궁합판 결제 증빙을 찾습니다`,
);
assert(
  !/featureKey:\s*FEATURE_KEY,\s*\n\s*kind:\s*"deduct"/.test(routeSource),
  `${routeFile}: 결제 증빙 조회에 개인판 FEATURE_KEY 를 상수로 박으면 궁합판 결제를 못 찾습니다`,
);

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
// 결제 성공 후 /start 가 실패했을 때 idempotencyKey 를 버리면 재시도가 이중 결제된다
// (ensure-access 는 결제 이력을 보지 않으므로 새 키에 다시 402 를 준다).
assertIncludes(pageFile, pageSource, "chargedRef.current = true");
assert(
  /if \(!chargedRef\.current\) idempotencyRef\.current = ""/.test(pageSource),
  `${pageFile}: idempotencyRef 초기화는 chargedRef 가드 안에 있어야 합니다(결제 후 새 키로 재시도하면 이중 결제)`,
);
assert(
  !/^\s*idempotencyRef\.current = "";/m.test(pageSource),
  `${pageFile}: 가드 없는 idempotencyRef.current = "" 가 남아 있으면 결제 후 재시도가 이중 결제됩니다`,
);

// 생년 프리필은 입력 컴포넌트가 담당한다(공용 훅 재사용 — 조회 로직 중복 구현 금지).
const birthGateFile = "src/features/master-love-codex/components/CodexBirthGate.tsx";
const birthGateSource = read(birthGateFile);
assertIncludes(birthGateFile, birthGateSource, "useAiProfileSeed");

// ── 4-2. 결제 직전 화면: 무엇을 받는지 + 정직한 한계가 버튼 위에 함께 있을 것 ──
// 결제가 붙은 CTA 는 프롤로그 스토리텔링 뒤의 "결과 보기" 하나다.
assertIncludes(birthGateFile, birthGateSource, "결과 보기");
assert(
  !birthGateSource.includes("비책 펼치기"),
  `${birthGateFile}: 결제 CTA 문구는 "결과 보기" 하나여야 합니다(구 문구 "비책 펼치기" 잔존)`,
);
for (const marker of ["CODEX_VALUE_AXES", "CODEX_HONEST_LIMITS", "CODEX_ACTS"]) {
  assertIncludes(birthGateFile, birthGateSource, marker);
}
// 가격은 서버 조회(PriceBadge)만 쓴다 — 리터럴을 박으면 가격 변경 시 화면이 거짓말을 한다.
assert(
  !/5\s*만\s*원|50,?000\s*원/.test(birthGateSource),
  `${birthGateFile}: 가격을 리터럴로 적지 말고 priceSlot(PriceBadge)만 쓰세요`,
);
// 오버레이 안에서 콘텐츠가 100svh 를 넘기면 justify-center 는 위쪽을 잘라 CTA 에 못 닿는다.
assert(
  !/min-h-\[100svh\][^"]*justify-center/.test(birthGateSource),
  `${birthGateFile}: 가치 블록이 붙은 화면은 justify-start 여야 합니다(justify-center 는 결제 버튼을 화면 밖으로 밀어냅니다)`,
);

// ── 4-4. 궁합 전환은 명시 선택 + 상대 칸은 프로필 시드 미주입 ─────────────────
// 금액이 30,000 → 50,000원으로 바뀌므로 사용자가 모르는 채 비싼 SKU 로 넘어가면 안 된다.
assertIncludes(birthGateFile, birthGateSource, "EMPTY_CODEX_PARTNER");
assertIncludes(birthGateFile, birthGateSource, "togglePartner");
assert(
  /aria-expanded=\{Boolean\(partner\)\}/.test(birthGateSource),
  `${birthGateFile}: 궁합 섹션 토글에 aria-expanded 가 있어야 합니다`,
);
// 🔴 프로필 카드는 본인 명식이다. 상대 칸에 시드를 주입하면 남의 명식이 상대로 들어간다.
assert(
  !/patchPartner\([^)]*seed/.test(birthGateSource),
  `${birthGateFile}: 상대 칸에 useAiProfileSeed 값을 주입하면 안 됩니다(프로필 카드는 본인 명식입니다)`,
);
// 결제 금액 배지는 모드에 따라 서버 가격을 다시 읽어야 한다(리터럴 금지).
assert(
  /featureKey=\{activeBilling\.featureKey\}/.test(pageSource),
  `${pageFile}: PriceBadge 의 featureKey 가 모드에 따라 바뀌어야 상대 정보 입력 시 금액이 갱신됩니다`,
);
assert(
  /masterLoveCodexBilling\(partner \? "compat" : "solo"\)/.test(pageSource),
  `${pageFile}: 게이트 결제 식별자는 제출 시점의 상대 유무로 확정해야 합니다(렌더 시점 값에 의존하면 어긋납니다)`,
);
assertIncludes(pageFile, pageSource, "partnerInfo");

// ── 4-3. 프롤로그: 사주×자미두수 다각도 스토리텔링이 질문 씬 앞에 있을 것 ────
const prologueFile = "src/features/master-love-codex/data/prologue.ts";
const prologueSource = read(prologueFile);
const stageOrder = ["narratorEnter", "sajuChart", "ziweiChart", "crossCheck", "question", "bookOpen"];
let previousIndex = -1;
for (const stage of stageOrder) {
  const index = prologueSource.indexOf(`stage: "${stage}"`);
  assert(index > 0, `${prologueFile}: 씬 '${stage}' 가 없습니다`);
  assert(index > previousIndex, `${prologueFile}: 씬 순서가 ${stageOrder.join(" → ")} 여야 합니다 ('${stage}' 위치 이상)`);
  previousIndex = index;
}
for (const marker of ["일간", "자미두수", "부부궁", "겹쳐"]) {
  assert(
    prologueSource.includes(marker),
    `${prologueFile}: 프롤로그가 두 체계를 겹쳐 본다는 장점을 말해야 합니다 (누락: ${marker})`,
  );
}
// 프롤로그가 바뀌었으면 seen 키를 올려야 기존 사용자도 새 스토리를 한 번은 본다.
assertIncludes(
  "src/features/master-love-codex/constants.ts",
  read("src/features/master-love-codex/constants.ts"),
  "masterLoveCodexPrologueSeen:v2",
);

// ── 5. 챕터 계약 ─────────────────────────────────────────────────────────────
const {
  MASTER_LOVE_CODEX_CHAPTERS, MASTER_LOVE_CODEX_META, GENERIC_PHRASE_BLOCKLIST,
  buildMasterLoveCodexSystemGuide, getMasterLoveCodexPlan,
} = await import("../worker/lib/master-love-codex-prompt.mjs");
const {
  MASTER_LOVE_CODEX_COMPAT_CHAPTERS, MASTER_LOVE_CODEX_COMPAT_META, LOVE_DNA_COMPAT_METRICS,
  buildMasterLoveCodexCompatSystemGuide, getMasterLoveCodexCompatPlan,
} = await import("../worker/lib/master-love-codex-compat-prompt.mjs");

const CHAPTER_SETS = [
  { label: "개인판", chapters: MASTER_LOVE_CODEX_CHAPTERS, meta: MASTER_LOVE_CODEX_META, plan: getMasterLoveCodexPlan(), costCoins: 200 },
  { label: "궁합판", chapters: MASTER_LOVE_CODEX_COMPAT_CHAPTERS, meta: MASTER_LOVE_CODEX_COMPAT_META, plan: getMasterLoveCodexCompatPlan(), costCoins: 300 },
];

for (const set of CHAPTER_SETS) {
  assert(set.chapters.length === 20, `${set.label} 챕터는 20장이어야 합니다 (현재 ${set.chapters.length})`);
  assert(set.meta.costCoins === set.costCoins, `${set.label} META.costCoins 는 ${set.costCoins}이어야 합니다 (현재 ${set.meta.costCoins})`);
  assert(
    set.plan.minTotalChars >= set.meta.minTotalChars,
    `${set.label} 챕터 minChars 합(${set.plan.minTotalChars})이 목표 하한(${set.meta.minTotalChars})보다 작습니다`,
  );
  const ids = new Set(set.chapters.map((chapter) => chapter.id));
  assert(ids.size === set.chapters.length, `${set.label} 챕터 id 가 중복됩니다`);
  assert(
    set.chapters.filter((chapter) => chapter.jsonMode).length === 1,
    `${set.label} DNA(JSON) 챕터는 정확히 1개여야 합니다`,
  );

  // 🔴 네거티브 스코프 — 20장이 한 주제를 다루므로 중복이 이 상품의 최대 품질 리스크다.
  // avoid 가 없으면 장들이 서로의 내용을 되풀이해 5만자가 물이 된다.
  for (const chapter of set.chapters) {
    assert(
      Array.isArray(chapter.avoid) && chapter.avoid.length > 0,
      `${set.label} ${chapter.order}장(${chapter.id}): avoid(이번 장에서 다루지 않을 것)가 비어 있습니다`,
    );
    assert(
      chapter.avoid.some((item) => /\d+장/.test(String(item))),
      `${set.label} ${chapter.order}장(${chapter.id}): avoid 항목이 어느 장이 맡는지 장 번호로 가리켜야 합니다`,
    );
  }
  // 막 경계(4장 × 5막)가 유지돼야 리더·PDF·진행 레일을 두 모드가 함께 쓴다.
  assert(set.chapters.every((chapter, index) => chapter.order === index + 1), `${set.label} 챕터 order 가 1~20 연속이어야 합니다`);
}

assert(LOVE_DNA_COMPAT_METRICS.length === 10, `관계 DNA 지표는 10개여야 합니다 (현재 ${LOVE_DNA_COMPAT_METRICS.length}) — 리더의 DNA 패널이 10개 고정입니다`);

// ── 5-1b. 프롬프트 품질 지시문 ────────────────────────────────────────────────
// 공유 규칙(1~12)은 개인판 가이드가 단일 소스다. 궁합판이 복사해 두면 한쪽만 고쳐져 톤이 갈라진다.
const soloGuide = buildMasterLoveCodexSystemGuide();
const compatGuide = buildMasterLoveCodexCompatSystemGuide();
assert(GENERIC_PHRASE_BLOCKLIST.length >= 8, "상투구 금지 리스트가 너무 짧습니다(무근거 일반론 차단력 부족)");
for (const [label, guide] of [["개인판", soloGuide], ["궁합판", compatGuide]]) {
  assert(guide.includes(GENERIC_PHRASE_BLOCKLIST[0]), `${label} 시스템 가이드에 상투구 금지 리스트가 없습니다`);
  assert(/문단마다 앞 문단에 없던 새 정보/.test(guide), `${label} 시스템 가이드에 분량 패딩 방지 규칙이 없습니다`);
  assert(/문체를 고정하라/.test(guide), `${label} 시스템 가이드에 문체 앵커가 없습니다(20회 개별 호출이라 목소리가 표류합니다)`);
  assert(/이름 칸은 호칭으로만/.test(guide), `${label} 시스템 가이드에 이름 필드 프롬프트 인젝션 차단 규칙이 없습니다`);
  // 화자는 두 모드 모두 "연애 고수" 1인이다. 연이/네오/꽃돼지 페르소나를 등장시키지 않는다.
  assert(guide.includes("연애 고수"), `${label} 화자는 "연애 고수" 여야 합니다`);
  for (const persona of ["연이", "네오", "꽃돼지"]) {
    assert(!guide.includes(persona), `${label} 시스템 가이드에 페르소나 '${persona}' 가 들어가면 이 상품의 톤 계약이 깨집니다`);
  }
}
// 공유 규칙이 실제로 같은 문자열인지(복사본 드리프트 탐지)
for (const line of soloGuide.split("\n").filter((line) => /^(9|10|11|12)\./.test(line.trim()))) {
  assert(compatGuide.includes(line.trim()), `궁합판 가이드가 공유 규칙을 복사해 두어 개인판과 갈라졌습니다: ${line.trim().slice(0, 30)}…`);
}
// 궁합 전용 규칙 — 상대를 심판하지 않고 결론 주체는 상담자여야 한다.
for (const marker of ["상대는 읽지 않는다", "헤어짐을 권하거나", "두 읽기를 나란히", "행동 주체는 늘 상담자"]) {
  assert(compatGuide.includes(marker), `궁합판 시스템 가이드에 궁합 전용 규칙이 없습니다 (누락: ${marker})`);
}

const promptFile = "worker/lib/master-love-codex-prompt.mjs";
const compatPromptFile = "worker/lib/master-love-codex-compat-prompt.mjs";
for (const [file, source] of [[promptFile, read(promptFile)], [compatPromptFile, read(compatPromptFile)]]) {
  assertIncludes(file, source, "[이번 장에서 다루지 않을 것");
  assertIncludes(file, source, "서로 다른 근거를 최소 4개");
  assertIncludes(file, source, "할 수 있는 행동");
}
// 궁합판은 명식·명반 직렬화와 공유 가이드를 개인판에서 import 해 재사용한다(중복 구현 금지).
const compatPromptSource = read(compatPromptFile);
assertIncludes(compatPromptFile, compatPromptSource, "from \"./master-love-codex-prompt.mjs\"");
assertIncludes(compatPromptFile, compatPromptSource, "buildMasterLoveCodexSystemGuide");
assert(
  !/export function formatSajuForPrompt/.test(compatPromptSource),
  `${compatPromptFile}: 명식 직렬화를 다시 구현하지 말고 개인판 정본을 import 하세요`,
);

// ── 5-1c. 모드 분기 · 액세스 토큰 교차 사용 차단 ──────────────────────────────
assertIncludes(routeFile, routeSource, "master-love-codex-compat-prompt.mjs");
assertIncludes(routeFile, routeSource, "buildMasterLoveCodexCompatibility");
assertIncludes(routeFile, routeSource, "tokenMatchesMode");
assert(
  /partnerInfo\s*\|\|\s*body\.partner/.test(routeSource),
  `${routeFile}: 상대 정보(partnerInfo)를 선택 입력으로 받아 궁합 모드로 전환해야 합니다`,
);
// 🔴 개인판(30,000원) 토큰으로 궁합판(50,000원)을 생성할 수 있으면 안 된다.
assert(
  /featureKey:\s*modeDef\.featureKey/.test(routeSource),
  `${routeFile}: 액세스 토큰의 featureKey 를 상수로 박으면 개인판 결제로 궁합을 받을 수 있습니다`,
);
assert(
  routeSource.includes("tokenMatchesMode(payload, normalized.mode)"),
  `${routeFile}: /start 는 토큰이 이 요청의 모드용인지 확인해야 합니다`,
);
assert(
  routeSource.includes("tokenMatchesMode(tokenPayload, modeDef.mode)"),
  `${routeFile}: /generate 는 세션의 모드와 토큰의 모드가 같은지 확인해야 합니다`,
);
// 상대 정보가 없으면 언제나 개인판(가격이 낮은 쪽)으로 떨어져야 한다.
const { normalizeInput: routeNormalizeInput } = (await import("../worker/routes/master-love-codex.js")).__masterLoveCodexTestUtils;
const soloInput = routeNormalizeInput({ birthInfo: { gender: "female", birthDate: "1993-05-14", birthTime: "07:20" } });
const compatInput = routeNormalizeInput({
  birthInfo: { gender: "female", birthDate: "1993-05-14", birthTime: "07:20" },
  partnerInfo: { birthDate: "1990-11-02" },
});
assert(soloInput.mode === "solo", "상대 정보가 없으면 mode 는 solo 여야 합니다");
assert(compatInput.mode === "compat", "상대 생년월일이 있으면 mode 는 compat 여야 합니다");
assert(soloInput.inputHash !== compatInput.inputHash, "개인판과 궁합판의 inputHash 가 갈라져야 합니다(토큰 재사용 방지)");
// 개인판 해시는 기존 문자열을 문자 단위로 보존해야 진행 중 세션의 토큰 검증이 깨지지 않는다.
const { createHash } = await import("node:crypto");
assert(
  soloInput.inputHash === createHash("sha256").update(["1993-05-14", "07:20", false, "solar", false, "female"].join("|")).digest("hex"),
  "개인판 inputHash 계산식이 바뀌었습니다 — 진행 중 세션의 액세스 토큰 검증이 전부 실패합니다",
);
// 궁합 모드에서만 상대 차트 4장 + 궁합 판정이 만들어져야 한다.
const { buildCharts: routeBuildCharts } = (await import("../worker/routes/master-love-codex.js")).__masterLoveCodexTestUtils;
const soloCharts = routeBuildCharts(soloInput);
const compatCharts = routeBuildCharts(compatInput);
assert(!soloCharts.partnerSaju && !soloCharts.compatibility, "개인판에서 상대 차트/궁합 판정이 만들어지면 안 됩니다");
assert(
  Boolean(compatCharts.partnerSaju && compatCharts.partnerZiweiChart && compatCharts.compatibility?.signature),
  "궁합판은 상대 명식·명반과 궁합 판정을 함께 만들어야 합니다",
);
// 배치 생성이 빠지면 20장 동기 생성이 되어 엣지 100초 컷에 걸린다.
assertIncludes(routeFile, routeSource, "CHAPTER_BATCH_SIZE");
assertIncludes(routeFile, routeSource, "acquireBatchLock");

// ── 5-1d. 배치 시간 예산 (엣지 컷 방어) ──────────────────────────────────────
// 🔴 CHAPTER_TIMEOUT_MS 는 Gemini fetch 하나만 묶는다. 그 뒤 Workers AI 폴백 체인에는
//    타임아웃이 아예 없어서(lib/llm-client.ts callCloudflareWorkersAI), 예산이 없으면 배치가
//    엣지 100초 컷에 잘리고 클라이언트는 JSON 대신 게이트웨이 HTML 을 받는다 —
//    그게 "생성이 되다가 갑자기 실패"의 정체였다.
assertIncludes(routeFile, routeSource, "EDGE_RESPONSE_DEADLINE_MS");
assertIncludes(routeFile, routeSource, "BATCH_BUDGET_MS");
assert(
  /deadlineAt,?\n/.test(routeSource) && /generateChapter\(env, \{/.test(routeSource),
  `${routeFile}: /generate 는 배치 예산(deadlineAt)을 generateChapter 에 넘겨야 합니다`,
);
assert(
  routeSource.includes("planBatchCommit"),
  `${routeFile}: 예산 초과로 못 쓴 장은 저장하지 말고 앞쪽 연속분만 커밋해야 합니다(planBatchCommit)`,
);
assert(
  routeSource.includes("GENERATION_BUDGET_EXCEEDED"),
  `${routeFile}: 한 장도 못 쓴 배치는 retryable 503 으로 돌려야 클라가 백오프 재시도합니다`,
);
// 일시적 DB 블립이 하드 500 으로 굳으면 "생성 실패"가 확정돼 재시도 경로가 사라진다.
assert(
  routeSource.includes("DB_DEGRADED") && routeSource.includes("isTransientMongoError"),
  `${routeFile}: 디스패처 catch 는 transient Mongo/인증DB 오류를 retryable 503(DB_DEGRADED)로 내려야 합니다`,
);

// 🔴 락 TTL 은 배치 예산과 한 세트다. 예전 390초는 엣지 컷(100초)의 4배라, 엣지가 요청을
//    끊어 락 해제 코드가 돌지 못하면 세션이 6분 반 동안 409 만 뱉어 재시도가 통째로 막혔다.
//    리터럴을 핀으로 박는 대신 불변식(예산 < 락 TTL ≤ 150초)을 강제한다.
{
  const budgetMs = Number(
    (routeSource.match(/EDGE_RESPONSE_DEADLINE_MS\s*-\s*([\d_]+)/) || [])[1]?.replace(/_/g, ""),
  );
  const lockTtlMs = Number((routeSource.match(/BATCH_LOCK_TTL_MS\s*=\s*([\d_]+)/) || [])[1]?.replace(/_/g, ""));
  const edgeDeadlineMs = 100_000; // worker/lib/sync-llm-timeout.js EDGE_RESPONSE_DEADLINE_MS
  assert(Number.isFinite(budgetMs) && budgetMs > 0, `${routeFile}: BATCH_BUDGET_MS 를 EDGE_RESPONSE_DEADLINE_MS 기준으로 잡아야 합니다`);
  assert(Number.isFinite(lockTtlMs) && lockTtlMs > 0, `${routeFile}: BATCH_LOCK_TTL_MS 를 읽지 못했습니다`);
  assert(
    edgeDeadlineMs - budgetMs < edgeDeadlineMs && edgeDeadlineMs - budgetMs >= 15_000,
    `${routeFile}: 배치 예산은 엣지 컷보다 최소 15초 짧아야 합니다(인증·DB·병합 몫)`,
  );
  assert(
    lockTtlMs > edgeDeadlineMs - budgetMs && lockTtlMs <= 150_000,
    `${routeFile}: 배치 락 TTL 은 배치 예산보다 크고 150초 이하여야 합니다 (현재 ${lockTtlMs}ms) — 길면 엣지 컷 뒤 재시도가 그만큼 막힙니다`,
  );
}

// ── 5-1e. 클라이언트: 일시적 실패를 하드 종료로 굳히지 않을 것 ────────────────
// 다른 유료 화면 10곳이 쓰는 공용 판정을 이 화면만 안 써서, 503·retryable 이 전부
// "생성 실패"로 확정되고 있었다.
assertIncludes(pageFile, pageSource, "isRetriableResultPollFailure");
// 🔴 생성 단계 실패를 공용 결제 게이트로 띄우면 "확인 실패"라는 거짓 제목이 뜬다
//    (게이트는 /start 직전에 이미 release 된 뒤라, 이 호출이 모달을 되살린 것이었다).
assert(
  /generationStartedRef\.current\)\s*\{[\s\S]{0,200}?setGenerationError/.test(pageSource),
  `${pageFile}: 생성 단계 실패는 failPaidFeatureGateCheck 가 아니라 기능 화면(setGenerationError)이 처리해야 합니다`,
);
// 미완성인 채로 결과 페이지로 밀어 넣으면 사용자는 20장을 받은 줄 안다.
assert(
  /throw new Error\(ERROR_TEXT\.GENERATION_BUDGET_EXCEEDED\)/.test(pageSource),
  `${pageFile}: 배치 루프가 미완성으로 끝나면 실패로 표면화해야 합니다(GENERATION_BUDGET_EXCEEDED)`,
);
assert(
  !/catch \(caught\)[\s\S]{0,900}?router\.replace/.test(pageSource),
  `${pageFile}: 실패 catch 에서 결과 페이지로 자동 이동하면 미완성 책이 완성본처럼 열립니다(재시도 수단도 사라집니다)`,
);
// 🔴 2026-07-30 판단 반전 — Workers AI 폴백을 켠 상태로 유지한다.
//  이전 가드는 "장문이 잘린다"며 폴백을 금지했다. 그 판단은 폐기된 8B 모델
//  (@cf/meta/llama-3.1-8b-instruct, 2026-05-30 폐기) 기준이었고, 지금 기본 폴백은
//  llama-3.3-70b-instruct-fp8-fast 다. 무엇보다 비교 대상이 잘못됐다 — 폴백을 끄면
//  Gemini 장애 시 독자가 받는 건 짧은 장이 아니라 fallbackChapterBody() 사과 문구다.
//  (실제로 Gemini 크레딧 소진 429 상황에서 결제한 책 20장이 전부 사과문으로 나갔다.)
assert(
  !/fallbackToWorkersAI\s*:\s*false/.test(routeSource),
  `${routeFile}: Workers AI 폴백을 끄면 Gemini 장애 시 결제한 책 20장이 전부 사과 문구로 나갑니다`,
);
// Workers AI(env.AI.run)는 responseMimeType 을 받지 않아 JSON 앞뒤에 잡음이 섞인다.
// JSON.parse 를 그대로 쓰면 DNA 챕터가 폴백 문구로 떨어진다.
assertIncludes(routeFile, routeSource, "parseChapterJson");
assert(
  !/JSON\.parse\(clean\(ai\?\.text/.test(routeSource),
  `${routeFile}: DNA 챕터 JSON 은 parseChapterJson 으로 관대하게 파싱해야 합니다(Workers AI 는 코드펜스를 섞어 보냅니다)`,
);
assert(
  !/PREMIUM_GEMINI_TIMEOUT_MS/.test(routeSource),
  `${routeFile}: env.PREMIUM_GEMINI_TIMEOUT_MS 를 || 체인에 넣으면 45초로 단락됩니다`,
);

// ── 5-2. 몰입 리더 계약 ──────────────────────────────────────────────────────
const readerFile = "src/features/master-love-codex/components/CodexReader.tsx";
const readerSource = read(readerFile);
// reveal 이 opacity 0 인 채로 html2canvas 가 돌면 아직 안 본 장이 백지로 저장된다.
assertIncludes(readerFile, readerSource, "isExporting");
assertIncludes(readerFile, readerSource, "forceVisible");
assertIncludes(readerFile, readerSource, "data-codex-pdf-page");
assert(
  /setIsExporting\(true\)[\s\S]{0,400}requestAnimationFrame/.test(readerSource),
  `${readerFile}: PDF 캡처 전에 reveal 을 강제 노출하고 레이아웃 반영을 기다려야 합니다(백지 페이지 방지)`,
);

const revealFile = "src/features/master-love-codex/components/CodexReveal.tsx";
const revealSource = read(revealFile);
assert(
  /forceVisible\s*\|\|\s*prefersReducedMotion/.test(revealSource),
  `${revealFile}: forceVisible 과 리듀스드모션은 같은 즉시-노출 경로를 타야 합니다`,
);

// LazyMotion(strict) 아래에서는 m.* 만 쓴다. motion.* 는 feature 번들 분리를 깨뜨린다.
for (const file of [readerFile, revealFile]) {
  const source = read(file);
  assert(
    !/\bmotion\.[a-z]/.test(source),
    `${file}: framer-motion 은 m.* 만 사용해야 합니다(motion.* 는 LazyMotion 청크 분리를 무력화)`,
  );
}

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

// 읽기 라우트는 사이트맵에 넣지 않는다 — 넣는 순간 서버 렌더 1,800자 하한이 걸려
// 코덱스 아래에 설명 블록을 다시 붙여야 하고 몰입이 깨진다.
for (const file of ["lib/seo-site-urls.ts", "scripts/generate-sitemap.mjs"]) {
  assert(
    !read(file).includes("/master-love-codex/result"),
    `${file}: /master-love-codex/result 는 사이트맵에 넣지 않는다(1,800자 게이트 대상이 되어 몰입이 깨진다)`,
  );
}

// 입장 라우트는 반대로 설명 섹션이 반드시 남아 있어야 배포 게이트를 통과한다.
// (ssr:false 클라이언트라 이게 없으면 서버 렌더 텍스트가 152자로 떨어진다)
const entryPage = read("app/master-love-codex/page.tsx");
assertIncludes("app/master-love-codex/page.tsx", entryPage, "ServiceIntroSection");

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
  assertIncludes(shell, source, "cd-sig-card--master");
  assert(
    source.includes("html.neo-mode body .cd-sig-card__title"),
    `${shell}: 네오 모드 텍스트 오버라이드가 빠지면 배경만 바뀌고 글자가 안 보입니다(반쪽 오버라이드 금지)`,
  );
  // 대표 상담은 4장(마스터 인연의 서·운명의 찻집·나크샤트라 결정판·팩폭 전략소)이다.
  // 나침반·섬은 VVIP 서고로 이관했다. 개수를 고정하는 이유는 미관이 아니라 중복 노출 방지 —
  // 다른 컬렉션으로 옮긴 카드가 슬그머니 되돌아오는 것을 막는다(2026-08-01: 3 → 4).
  const section = source.slice(source.indexOf('id="cdSignatureConsult"'));
  const sectionEnd = section.indexOf("</section>");
  const sectionHtml = sectionEnd > 0 ? section.slice(0, sectionEnd) : section;
  assert(
    (sectionHtml.match(/<a class="cd-sig-card/g) || []).length === 4,
    `${shell}: 대표 운명 상담 카드는 4장이어야 합니다 (현재 ${(sectionHtml.match(/<a class="cd-sig-card/g) || []).length}장)`,
  );
  for (const moved of ["/destiny-compass", "/destiny-island.html"]) {
    assert(!sectionHtml.includes(`href="${moved}"`), `${shell}: ${moved} 는 VVIP 서고로 이관했으므로 대표 상담에 남아 있으면 중복 노출입니다`);
  }
  assertIncludes(shell, source, "destiny-compass-vvip-card-v20260729");
  assertIncludes(shell, source, "ziwei-island-vvip-card-v20260723");
}

// ── 7. PDF 캡처 계약 ────────────────────────────────────────────────────────
// 결제한 사용자가 받는 최종 산출물이 PDF 다. html2canvas 는 ① 문서 div 안 +
// data-codex-pdf-page 인 것만 찍고 ② 클론에서 @keyframes 를 0프레임부터 다시 돌린다.
// 수동 확인은 잊히므로 계약을 코드로 강제한다.
{
  const readerFile = "src/features/master-love-codex/components/CodexReader.tsx";
  const readerSource = read(readerFile);

  // 7-1. 캡처 대상 두 개가 문서 div 여는 태그와 닫는 태그 '사이'에 있을 것.
  //      밖으로 나가면 경고 없이 PDF 에서 통째로 사라진다.
  const documentOpen = readerSource.indexOf('id="master-love-codex-document"');
  const documentClose = readerSource.indexOf("{/* 소장 */}");
  assert(documentOpen > 0, `${readerFile}: #master-love-codex-document 를 찾지 못했습니다`);
  assert(documentClose > documentOpen, `${readerFile}: 문서 div 끝(소장 블록)을 찾지 못했습니다`);
  for (const marker of ["<CodexScoreOverview", "<CodexReportOutro"]) {
    const at = readerSource.indexOf(marker);
    assert(
      at > documentOpen && at < documentClose,
      `${readerFile}: ${marker} 는 #master-love-codex-document 안에 있어야 PDF 에 들어갑니다`,
    );
  }
  // 표지 표식도 캡처 대상(header) 안이어야 한다.
  assert(
    readerSource.indexOf("<CodexReportStamp") > documentOpen,
    `${readerFile}: CodexReportStamp 는 표지 header 안(문서 div 내부)에 있어야 합니다`,
  );

  // 7-2. 애니메이션이 붙는 컴포넌트는 forceVisible 로 캡처 모드를 받는다.
  for (const marker of ["<CodexScoreOverview", "<CodexLoveDnaPanel", "<CodexReportOutro"]) {
    const at = readerSource.indexOf(marker);
    const tagEnd = readerSource.indexOf("/>", at);
    assert(
      at > 0 && tagEnd > at && readerSource.slice(at, tagEnd).includes("forceVisible={isExporting}"),
      `${readerFile}: ${marker} 에 forceVisible={isExporting} 이 없으면 PDF 에 애니메이션 도중 상태가 찍힙니다`,
    );
  }

  // 7-3. 캡처 중 모션 전역 정지 안전망.
  assertIncludes(readerFile, readerSource, "data-codex-exporting");

  const cssFile = "src/features/master-love-codex/styles/codex.module.css";
  const cssSource = read(cssFile);
  assertIncludes(cssFile, cssSource, 'data-codex-exporting="true"');

  // 7-4. 데이터를 담은 값을 @keyframes 로 그리지 말 것(클론에서 0프레임으로 리셋된다).
  for (const [block] of cssSource.matchAll(/@keyframes[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g)) {
    assert(
      !/(^|[\s;{])(width|stroke-dashoffset)\s*:/.test(block),
      `${cssFile}: width/stroke-dashoffset 을 @keyframes 로 그리면 PDF 에 0% 로 찍힙니다 — 인라인 최종값 + transition 을 쓰세요`,
    );
  }

  // 7-4-2. 하단 고정 CTA 는 전역 모바일 네비 자리를 비켜서야 한다.
  // 🔴 실사고: bottom:0 으로 붙였더니 .cd-mnav(z-index 960)가 CTA 를 통째로 덮어
  //    가격도 안 보이고 탭도 먹혔다(배포본 elementFromPoint 가 네비를 반환). 네비가
  //    내놓은 공용 토큰 --cd-mnav-offset 을 쓰지 않으면 같은 실수가 반복된다.
  const floatingBlock = (cssSource.match(/\.floatingBar\s*\{[^}]*\}/) || [""])[0];
  assert(
    floatingBlock.includes("var(--cd-mnav-offset"),
    `${cssFile}: .floatingBar 는 bottom 에 --cd-mnav-offset 을 써야 합니다(전역 모바일 네비가 CTA 를 덮습니다)`,
  );
  assert(
    !/bottom:\s*0(px)?\s*;/.test(floatingBlock),
    `${cssFile}: .floatingBar 를 bottom:0 으로 붙이면 .cd-mnav(z-index 960)에 가려집니다`,
  );

  // 7-5. 카운트업은 공용 훅으로만 돌리고 skip 을 반드시 넘긴다.
  for (const file of [
    "src/features/master-love-codex/components/CodexScoreOverview.tsx",
    "src/features/master-love-codex/components/CodexLoveDna.tsx",
  ]) {
    const source = read(file);
    assertIncludes(file, source, "useCodexCountUp");
    for (const [, args] of source.matchAll(/useCodexCountUp\(([^)]*)\)/g)) {
      assert(
        /skip:\s*forceVisible/.test(args),
        `${file}: useCodexCountUp 에 skip: forceVisible 을 넘기지 않으면 PDF 에 중간 숫자가 찍힙니다`,
      );
    }
  }
}

// 8. New structured chapters are optional in persisted data but must be
//    normalized by the Worker and rendered without trusting HTML.
{
  const routeSource = read("worker/routes/master-love-codex.js");
  assertIncludes("worker/routes/master-love-codex.js", routeSource, "normalizeChapterContent");
  assertIncludes("worker/routes/master-love-codex.js", routeSource, "content, chars, ok");
  const chapterSource = read("src/features/master-love-codex/components/CodexChapter.tsx");
  for (const marker of ["narration", "evidence", "actions", "visualization", "AiResultProse"]) {
    assertIncludes("src/features/master-love-codex/components/CodexChapter.tsx", chapterSource, marker);
  }
  const readerSource = read("src/features/master-love-codex/components/CodexReader.tsx");
  assertIncludes("src/features/master-love-codex/components/CodexReader.tsx", readerSource, "masterLoveCodexReading:");
  assertIncludes("src/features/master-love-codex/components/CodexReader.tsx", readerSource, "이어서 읽기");
}

if (failures.length) {
  console.error("[verify-master-love-codex-flow] FAILED");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log("[verify-master-love-codex-flow] OK");
