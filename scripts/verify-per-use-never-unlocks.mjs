#!/usr/bin/env node
/**
 * 회당 결제(per_use)는 어떤 경로로도 "영구 해금"으로 기록되지 않는다.
 *
 * 왜 있는가 — 이집트 신탁(`openKemetModal`, 3,000원 회당 결제)이 **한 번 결제하면 새로고침 전까지
 * 계속 무료**였다. 원인은 두 곳이었다:
 *   ① 클라이언트가 서버가 주지 않은 `unlockMap[featureKey]=true` 를 만들어 낙관 해금(10분)을 찍었고,
 *      그 키가 `isTileKeyUnlocked` 를 통과해 게이트가 `already_unlocked` 로 결제창을 건너뛰었다.
 *   ② 단건 KRW 확정 경로가 `billingType` 검사 없이 ContentEntitlement + User.unlockedFeatures 를
 *      쓰고, 확정 봉투에도 해금 선언을 실었다(월정석·이용권 경로에는 있던 경계가 여기만 없었다).
 *
 * 🔴 손으로 쓴 대상 목록을 쓰지 않는다(CLAUDE.md 원칙 10). 검사 대상은 전부
 * `worker/lib/paid-feature-registry.js` 의 `PER_USE_PAID_FEATURE_KEYS` 에서 **전수 발견**하고,
 * 대상이 하나도 없으면 통과가 아니라 실패다.
 *
 * 실행: node scripts/verify-per-use-never-unlocks.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const load = (rel) => import(pathToFileURL(path.join(ROOT, rel)).href);

const checks = [];
function check(name, fn) {
  checks.push({ name, fn });
}

/** 함수 본문을 중괄호 균형으로 잘라낸다 — 이름 grep 은 근거가 아니다(원칙 6). */
function sliceFunctionBody(source, signature) {
  const at = source.indexOf(signature);
  assert.ok(at >= 0, `함수를 찾지 못했다: ${signature}`);
  const open = source.indexOf("{", at + signature.length - 1);
  assert.ok(open > 0, `본문 시작을 찾지 못했다: ${signature}`);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  throw new Error(`본문 끝을 찾지 못했다: ${signature}`);
}

const registry = await load("worker/lib/paid-feature-registry.js");
const catalog = await load("worker/payments/catalog.js");
const compat = await load("worker/payments/compat.js");

const PER_USE_KEYS = [...registry.PER_USE_PAID_FEATURE_KEYS];
const UNLOCK_KEYS = [...registry.UNLOCK_PAID_FEATURE_KEYS];

// ── 0. fail-closed: 검사 대상이 비면 이 가드는 가드가 아니다 ──────────────────────
check("검사 대상이 레지스트리에서 전수 발견된다", () => {
  assert.ok(PER_USE_KEYS.length >= 50, `회당 결제 키가 너무 적다(${PER_USE_KEYS.length}) — 레지스트리 로드 실패 의심`);
  assert.ok(UNLOCK_KEYS.length >= 5, `영구 해금 키가 너무 적다(${UNLOCK_KEYS.length}) — 대조군이 없다`);
  assert.ok(PER_USE_KEYS.includes("openKemetModal"), "이집트 신탁이 회당 결제로 등록돼 있어야 한다(이 가드가 생긴 사고)");
});

// ── 1. 카탈로그 분류 전수 ──────────────────────────────────────────────────────
// 봉투·지급 분기가 전부 catalog 의 billingType 을 읽으므로, 여기서 어긋나면 아래가 전부 헛돈다.
check("회당 결제 키는 카탈로그에서도 per_use 다 (전수)", () => {
  const wrong = [];
  const missing = [];
  for (const key of PER_USE_KEYS) {
    let product = null;
    try {
      product = catalog.resolveProduct({ featureKey: key });
    } catch {
      missing.push(key); // 판매하지 않는 과거 키. 이 경우 route 는 fail-closed 로 per_use 취급한다.
      continue;
    }
    if (String(product.billingType || "") !== "per_use") wrong.push(`${key} → ${product.billingType}`);
  }
  assert.deepEqual(wrong, [], `회당 결제인데 카탈로그가 해금으로 분류한다:\n  ${wrong.join("\n  ")}`);
  assert.ok(PER_USE_KEYS.length - missing.length > 0, "카탈로그에서 해석되는 회당 결제 키가 하나도 없다");
});

check("영구 해금 키는 카탈로그에서 per_use 가 아니다 (대조군, 전수)", () => {
  const wrong = [];
  for (const key of UNLOCK_KEYS) {
    let product = null;
    try {
      product = catalog.resolveProduct({ featureKey: key });
    } catch {
      continue;
    }
    if (String(product.billingType || "") === "per_use") wrong.push(key);
  }
  assert.deepEqual(wrong, [], `영구 해금인데 카탈로그가 회당으로 분류한다: ${wrong.join(", ")}`);
});

// ── 2. 서버 봉투 계약 (실코드) ─────────────────────────────────────────────────
// 봉투가 unlockedFeatures/unlockMap 을 실으면 클라이언트 해금 맵에 그 키가 들어간다.
check("세 봉투 모두 unlock=false 면 해금을 선언하지 않는다", () => {
  const product = { featureKey: "openKemetModal", priceCoins: 30, priceKRW: 3000, monthlyCost: 300, pricing: null };
  const order = {
    merchantUid: "cdguard0000000000000000000000000000000",
    userId: "64b000000000000000000001",
    featureKey: "openKemetModal",
    impUid: "pg-1",
    paymentAmount: 3000,
    pricingSnapshot: {},
  };
  const envelopes = {
    confirm: compat.legacyConfirmEnvelope(order, { granted: true, unlock: false }),
    moonstone: compat.legacyMoonstoneEnvelope({ product, requestId: "r1", spend: { balance: 700, ledgerId: "l1" }, unlock: false }).data,
    pass: compat.legacyPassCheckEnvelope({ product, requestId: "r1", unlock: false, coverage: { tier: "premium" } }).data,
  };
  for (const [name, envelope] of Object.entries(envelopes)) {
    assert.equal(envelope.unlockMap, undefined, `${name} 봉투가 회당 결제에 unlockMap 을 실었다`);
    assert.equal(envelope.unlockedFeatures, undefined, `${name} 봉투가 회당 결제에 unlockedFeatures 를 실었다`);
  }
  // 접근 증빙은 남아 있어야 한다 — 없으면 "결제는 됐는데 열리지 않는다"로 반대 방향의 사고가 난다.
  assert.equal(envelopes.confirm.accessGrant.ok, true, "확정 봉투의 accessGrant 가 사라지면 결제한 사용자가 막힌다");
  assert.equal(envelopes.confirm.accessGrant.featureKey, "openKemetModal");
  assert.ok(envelopes.confirm.accessGrant.evidenceId, "accessGrant 증빙 id 가 있어야 _cdHasVerifiedServerAccess 를 통과한다");
});

check("세 봉투 모두 unlock=true 면 해금을 선언한다 (대조군)", () => {
  const product = { featureKey: "sukuyo-relationship-encyclopedia", priceCoins: 50, priceKRW: 5000, monthlyCost: 500, pricing: null };
  const order = {
    merchantUid: "cdguard0000000000000000000000000000001",
    userId: "64b000000000000000000001",
    featureKey: "sukuyo-relationship-encyclopedia",
    impUid: "pg-1",
    paymentAmount: 5000,
    pricingSnapshot: {},
  };
  const envelopes = {
    confirm: compat.legacyConfirmEnvelope(order, { granted: true, unlock: true }),
    moonstone: compat.legacyMoonstoneEnvelope({ product, requestId: "r1", spend: { balance: 700, ledgerId: "l1" }, unlock: true }).data,
    pass: compat.legacyPassCheckEnvelope({ product, requestId: "r1", unlock: true, coverage: { tier: "premium" } }).data,
  };
  for (const [name, envelope] of Object.entries(envelopes)) {
    assert.equal(envelope.unlockMap?.[product.featureKey], true, `${name} 봉투가 영구 해금을 선언하지 않는다`);
    assert.deepEqual(envelope.unlockedFeatures, [product.featureKey], `${name} 봉투의 unlockedFeatures 가 비었다`);
  }
});

// ── 3. 서버 지급 분기 (소스 불변식) ────────────────────────────────────────────
// grantOrderEntitlement 는 실행 경로가 PG 확정 뒤라 단위 실행이 어렵다. 대신 본문을 중괄호로 잘라
// "per_use 조기 반환이 grantEntitlement 호출보다 앞에 있는가"를 본다.
check("grantOrderEntitlement 는 회당 결제에서 지급을 건너뛴다", () => {
  const source = read("worker/payments/index.js");
  const body = sliceFunctionBody(source, "async function grantOrderEntitlement(db, order)");
  const guardAt = body.indexOf('billingType || "per_use") === "per_use"');
  const grantAt = body.indexOf("await grantEntitlement(");
  const markAt = body.indexOf("await markUserFeatureUnlocked(");
  assert.ok(guardAt > 0, "grantOrderEntitlement 에 회당 결제 분기가 없다 — 단건 카드 결제가 영구 해금을 남긴다");
  assert.ok(grantAt > 0 && markAt > 0, "지급 호출을 찾지 못했다 — 이 가드의 슬라이스가 낡았다");
  assert.ok(guardAt < grantAt, "회당 결제 분기가 grantEntitlement 뒤에 있으면 아무것도 막지 못한다");
  assert.ok(guardAt < markAt, "회당 결제 분기가 markUserFeatureUnlocked 뒤에 있으면 아무것도 막지 못한다");
});

check("월정석·이용권 게이트의 기존 경계가 그대로 있다", () => {
  const source = read("worker/payments/index.js");
  const occurrences = source.split('const unlock = billingType !== "per_use";').length - 1;
  assert.equal(occurrences, 2, `월정석·이용권 게이트의 per_use 경계가 ${occurrences}곳이다(기대 2곳)`);
});

// ── 4. 클라이언트 계약 (jsdom, 실제 모듈) ──────────────────────────────────────
// 결제 성공 이벤트를 흘렸을 때 회당 결제 키가 해금 맵에 들어가면 안 된다.
function bootClient() {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", () => {});
  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
    url: "https://code-destiny.com/",
    runScripts: "outside-only",
    virtualConsole,
  });
  const { window } = dom;
  window.fetch = async () => ({ ok: false, status: 503, json: async () => ({}), text: async () => "" });
  for (const file of ["js/core/access-store.js", "js/core/payment-service.js"]) {
    window.eval(read(file));
  }
  assert.equal(typeof window.CodeDestinyPaymentService?.reducePaymentSuccess, "function", "결제 경계 모듈이 로드되지 않았다");
  assert.equal(typeof window.CodeDestinyAccessStore?.isUnlocked, "function", "접근 스토어가 로드되지 않았다");
  return window;
}

/** 회당 결제 성공 응답의 실제 모양 — accessGrant.ok 는 true 지만 해금 선언은 없다. */
function perUseSuccessEvent(featureKey, index) {
  return {
    operationId: `evidence-${index}`,
    requestId: `req-${index}`,
    featureKey,
    profileId: "profile-1",
    method: "DIRECT_KRW",
    accessGrant: { ok: true, accessType: "single_purchase", featureKey, evidenceId: `evidence-${index}` },
    unlockMap: {},
  };
}

check("회당 결제 성공은 해금 맵에 들어가지 않는다 (전수)", () => {
  const window = bootClient();
  const leaked = [];
  PER_USE_KEYS.forEach((featureKey, index) => {
    window.CodeDestinyPaymentService.reducePaymentSuccess(perUseSuccessEvent(featureKey, index));
    if (window.CodeDestinyAccessStore.isUnlocked(featureKey) === true) leaked.push(featureKey);
  });
  assert.deepEqual(
    leaked,
    [],
    `회당 결제인데 결제 직후 해금으로 기록됐다(다음 이용이 공짜가 된다):\n  ${leaked.join("\n  ")}`,
  );
});

check("서버가 선언한 영구 해금은 그대로 즉시 반영된다 (대조군)", () => {
  const window = bootClient();
  const missed = [];
  UNLOCK_KEYS.forEach((featureKey, index) => {
    window.CodeDestinyPaymentService.reducePaymentSuccess({
      ...perUseSuccessEvent(featureKey, `u${index}`),
      unlockMap: { [featureKey]: true },
    });
    if (window.CodeDestinyAccessStore.isUnlocked(featureKey) !== true) missed.push(featureKey);
  });
  assert.deepEqual(
    missed,
    [],
    `영구 해금인데 결제 직후 잠금으로 남았다(방금 결제한 사용자가 다시 결제창을 만난다):\n  ${missed.join("\n  ")}`,
  );
});

check("unlockGrant(permanent_unlock)로 선언해도 반영된다", () => {
  const window = bootClient();
  const featureKey = UNLOCK_KEYS[0];
  window.CodeDestinyPaymentService.reducePaymentSuccess({
    ...perUseSuccessEvent(featureKey, "g0"),
    accessGrant: {
      ok: true,
      featureKey,
      evidenceId: "evidence-g0",
      unlockGrant: { grantType: "permanent_unlock", status: "active", featureKey },
    },
  });
  assert.equal(window.CodeDestinyAccessStore.isUnlocked(featureKey), true, "unlockGrant 선언 경로가 죽었다");
});

// ── 5. 클라이언트 소스 불변식 (미러 포함) ──────────────────────────────────────
check("클라이언트가 unlockMap 을 합성하지 않는다 (셸·독립 정적)", () => {
  for (const file of ["js/destiny-profile.js", "public/js/destiny-profile.js"]) {
    const source = read(file);
    assert.doesNotMatch(
      source,
      /!Object\.keys\(unlockMap\)\.length\)\s*unlockMap\[/,
      `${file}: 서버가 주지 않은 해금을 합성하고 있다 — 회당 결제가 공짜가 된다`,
    );
  }
});

check("클라이언트가 unlockMap 을 합성하지 않는다 (React)", () => {
  // 같은 합성이 React 결제 코어에도 있었다. 회당 결제 기능 상당수가 이 경로를 탄다(타로·마인드스캔·
  // 손금 등)이므로 셸만 고치면 절반만 고친 것이 된다.
  const source = read("app/_lib/billing-client.ts");
  const body = sliceFunctionBody(
    source,
    "function emitUnifiedPaymentSuccess(",
  );
  assert.match(body, /const unlockMap = asRecord\(data\.unlockMap\) \|\| \{\};/, "React 결제 코어의 unlockMap 해석이 낡았다 — 이 가드의 슬라이스를 갱신하라");
  assert.doesNotMatch(
    body,
    /asRecord\(data\.unlockMap\)\s*\|\|\s*\(featureKey/,
    "app/_lib/billing-client.ts: 서버가 주지 않은 해금을 합성하고 있다 — 회당 결제가 공짜가 된다",
  );
});

check("낙관 해금은 accessGrant.ok 만으로 찍히지 않는다", () => {
  for (const file of ["js/core/payment-service.js", "public/js/core/payment-service.js"]) {
    const source = read(file);
    const body = sliceFunctionBody(source, "function reducePaymentSuccess(payload)");
    assert.doesNotMatch(
      body,
      /event\.accessGrant\.ok === true\s*$/m,
      `${file}: accessGrant.ok 만 보고 낙관 해금을 찍고 있다`,
    );
    assert.match(
      body,
      /declaresPermanentUnlock\(event, event\.featureKey\)/,
      `${file}: 낙관 해금이 "서버가 선언했는가" 판정을 거치지 않는다`,
    );
  }
});

// ── 5-b. 읽는 쪽: 잔존 해금이 무료로 열어주지 않는다 ─────────────────
// 쓰는 경로를 막아도 PR #1137 이전에 기록된 계정은 남아 있다. 읽는 옆이 과금 유형을
// 안 보면 그 행 하나로 **새로고침을 해도 영원히 무료**가 된다.
check("계정 배열의 회당 결제 키는 접근 근거가 되지 않는다", () => {
  const body = sliceFunctionBody(
    read("worker/lib/paid-feature-access.js"),
    "export async function canAccessPaidFeaturesBatch(userId, featureKeys, options = {})",
  );
  const grantedAt = body.indexOf("const grantedKeySet = new Set([");
  assert.ok(grantedAt > 0, "grantedKeySet 구성부를 찾지 못했다 — 이 가드의 슬라이스가 낡았다");
  const grantedBlock = body.slice(grantedAt, grantedAt + 400);
  assert.match(
    grantedBlock,
    /!isPerUsePaidFeatureKey\(key\)/,
    "paidFeatures/unlockedFeatures 에서 회당 결제 키를 걸러 내지 않는다 — 잔존분이 영구 무료를 만든다",
  );
});

check("coin-gate 의 entitlement 근거도 회당 결제를 배제한다", () => {
  // billing.js resolvePaidContentAccess 는 findActivePaidContentUnlock 결과 하나로 already_unlocked 를
  // 돌려 결제창을 아예 안 열어 준다. 형제 근거(hasUserScopedPermanentUnlock)는 이미 걸러 낸다.
  const body = sliceFunctionBody(
    read("worker/lib/content-unlocks.js"),
    "export async function findActivePaidContentUnlock(input = {})",
  );
  assert.match(
    body,
    /isPerUsePaidFeatureKey\(target\.featureKey\)/,
    "공유 entitlement 리더가 회당 결제 행을 그대로 돌려준다",
  );
});

check("해금 맵 방출구가 회당 결제 키를 실어 보내지 않는다", () => {
  // 클라이언트는 이 맵을 해금 상태로 그대로 쓴다(isTileKeyUnlocked → already_unlocked 지름길).
  const billingBody = sliceFunctionBody(
    read("worker/routes/billing.js"),
    "function normalizeUnlockedFeatureList(values = [])",
  );
  assert.match(
    billingBody,
    /isPerUsePaidFeatureKey/,
    "worker/routes/billing.js: 스냅샷 방출 시 회당 결제 키를 걸러 내지 않는다",
  );

  // 🔴 buildAccessState 는 인자가 구조분해라 중괄호 슬라이스가 본문이 아니라 파라미터를 잡는다.
  //    그래서 이 파일만은 지점을 정규식으로 못박는다 — 무필터 폴백과 ownedProductIds 두 곳이다.
  const accessState = read("worker/lib/access-state.js");
  const fallbackAt = accessState.indexOf("resolvedUnlockedFeatureIds === null");
  assert.ok(fallbackAt > 0, "worker/lib/access-state.js: 무필터 폴백 지점을 찾지 못했다 — 이 가드의 선택자가 낡았다");
  const fallbackBlock = accessState.slice(fallbackAt, fallbackAt + 900);
  const fallbackGates = fallbackBlock.split("!isPerUsePaidFeatureKey(key)").length - 1;
  assert.equal(
    fallbackGates,
    2,
    `worker/lib/access-state.js: 폴백의 unlockedFeatures/paidFeatures 두 배열 모두 걸러야 한다(현재 ${fallbackGates}곳)`,
  );
  assert.match(
    accessState,
    /const ownedProductIds = normalizeStringArray\(\[[\s\S]{0,400}?isPerUsePaidFeatureKey/,
    "worker/lib/access-state.js: ownedProductIds 가 회당 결제 키를 '보유 상품'으로 내보낸다",
  );
  const paymentsMe = read("worker/routes/payments.js");
  assert.match(
    paymentsMe,
    /unlockedFeatures = \(Array\.isArray\(safeUser\.unlockedFeatures\)[\s\S]{0,160}isPerUsePaidFeatureKey/,
    "/api/payments/me 가 회당 결제 키를 해금 맵으로 내보낸다",
  );
});

check("Google RTDN 복구가 회당 결제를 영구 해금으로 적지 않는다", () => {
  const body = sliceFunctionBody(
    read("worker/routes/app-store.js"),
    "async function updateActiveGoogleEntitlement({ payment, googlePurchase, notification })",
  );
  const gateAt = body.indexOf("isPerUsePaidFeatureKey(featureKey)");
  const writeAt = body.indexOf("unlockedFeatures: featureKey");
  assert.ok(gateAt > 0, "RTDN 경로에 회당 결제 경계가 없다 — 정리해도 다시 쌓인다");
  assert.ok(gateAt < writeAt, "경계가 쓰기보다 뒤에 있으면 아무것도 막지 못한다");
});

check("🔴 이 가드가 보는 파일은 결제 게이트 트리거에도 있다 (원칙 10)", () => {
  const workflow = read(".github/workflows/paid-flow-gates.yml");
  for (const file of ["worker/lib/paid-feature-access.js", "worker/lib/content-unlocks.js", "worker/lib/access-state.js"]) {
    assert.ok(
      workflow.includes(`"${file}"`),
      `${file} 이 paid-flow-gates.yml 트리거 paths 에 없다 — 이 파일만 고친 PR 은 결제 게이트가 깨어나지 않는다`,
    );
  }
});

// ── 5-c. 회당 결제 라우트는 "이번 요청의 결제"를 묻는다 ────────────────────────
// canAccessPaidFeature 의 Payment 조회는 회당 결제에 한해 requestId 로 좁혀진다. 라우트가 그 키를
// 안 넘기면 결제창으로 떨어지고(안전한 방향), 넘기지도 않고 자체 증빙도 없으면 **방금 카드로 결제한
// 사용자가 402** 를 받는다. 그래서 호출부를 전수로 훑어 셋 중 하나를 만족하는지 본다.
check("회당 결제 라우트가 결제 증빙을 요청 단위로 묻는다 (호출부 전수)", () => {
  const ROUTES_DIR = path.join(ROOT, "worker/routes");
  // 라우트가 스스로 이번 결제를 증명하는 방법들. 이름 목록이 아니라 **형태**로 잡는다 —
  // 새 방식이 생기면 여기 안 걸려 실패하는데, 그건 좋은 실패다(사람이 한 번 보게 된다).
  const SELF_EVIDENCE = /verify[A-Z]\w*(?:Evidence|Payment|Token)\b|already_purchased/;
  const offenders = [];
  let callSites = 0;

  for (const file of fs.readdirSync(ROUTES_DIR).filter((name) => name.endsWith(".js")).sort()) {
    const rel = `worker/routes/${file}`;
    const source = read(rel);
    // 파일이 선언한 featureKey 상수들 — 유형 판정의 재료다.
    const declaredKeys = [...source.matchAll(/(?:const|let|var)\s+[A-Z0-9_]*FEATURE_KEY[A-Z0-9_]*\s*=\s*"([^"]+)"/g)]
      .map((match) => match[1]);
    const declaresPerUse = declaredKeys.some((key) => registry.isPerUsePaidFeatureKey(key));
    const hasSelfEvidence = SELF_EVIDENCE.test(source);

    for (const match of source.matchAll(/canAccessPaidFeature(?:sBatch)?\(/g)) {
      // 주석 안의 언급은 호출부가 아니다.
      const lineStart = source.lastIndexOf("\n", match.index) + 1;
      const linePrefix = source.slice(lineStart, match.index);
      if (/^\s*(\/\/|\*|\/\*)/.test(linePrefix)) continue;
      callSites += 1;
      const tail = source.slice(match.index, match.index + 700);
      if (/requestId\s*[:,]|requestId\s*\}/.test(tail)) continue;
      if (hasSelfEvidence) continue;
      if (!declaresPerUse) continue; // 영구 해금/음악 트랙 등 — 회당 결제가 아니라 좁힐 대상이 아니다
      const line = source.slice(0, match.index).split("\n").length;
      offenders.push(`${rel}:${line}`);
    }
  }

  assert.ok(callSites >= 15, `호출부를 ${callSites}곳밖에 못 찾았다 — 이 가드의 스캔이 낡았다(fail-closed)`);
  assert.deepEqual(
    offenders,
    [],
    `회당 결제인데 requestId 도 자체 증빙도 없다 — 결제한 사용자가 402 를 받는다:\n  ${offenders.join("\n  ")}`,
  );
});

check("requestId 를 넘기기로 한 라우트가 계속 넘긴다", () => {
  // 이 다섯은 자체 증빙이 없어 requestId 가 유일한 근거다. 빠지면 조용히 결제창 무한루프가 된다.
  const REQUIRED = [
    ["worker/routes/tarot.js", "async function requireYearTarotAccess(request, env, requestId)"],
    ["worker/routes/ziwei-deep-report.js", "requestId: idempotencyKey"],
    ["worker/routes/astrology-ai.js", "requestId: idempotencyKey"],
    ["worker/routes/sukuyo-compatibility-ai.js", "requestId: idempotencyKey"],
  ];
  for (const [file, marker] of REQUIRED) {
    assert.ok(read(file).includes(marker), `${file}: "${marker}" 가 사라졌다 — 회당 결제 증빙이 요청 단위를 잃는다`);
  }
  // ziwei 는 prepare·generate 두 곳 모두여야 한다. 402 응답(paymentRequired)에도 같은 문자열이
  // 있으므로 파일 전체가 아니라 **canAccessPaidFeature 호출부**만 센다.
  const ziweiSource = read("worker/routes/ziwei-deep-report.js");
  const ziweiWired = [...ziweiSource.matchAll(/canAccessPaidFeature\([^;]*?\);/gs)]
    .filter((match) => match[0].includes("requestId: idempotencyKey")).length;
  assert.equal(ziweiWired, 2, `ziwei-deep-report 의 게이트 호출 ${ziweiWired}곳만 requestId 를 넘긴다(기대 2 = prepare + generate)`);
});

check("회당 결제의 Payment 조회는 requestId 없이는 나가지 않는다", () => {
  const body = sliceFunctionBody(
    read("worker/lib/paid-feature-access.js"),
    "export async function canAccessPaidFeaturesBatch(userId, featureKeys, options = {})",
  );
  assert.match(body, /perUseLookupCandidates\.size && requestScopeToken/, "회당 결제 조회가 requestId 를 요구하지 않는다");
  assert.match(body, /\{ requestId: requestScopeToken \}/, "요청 스코프 절이 사라졌다 — 과거 결제가 다시 영원히 통과한다");
});

// ── 6. 셸 마크업 불변식 ────────────────────────────────────────────────────────
// _cdFinalizeUnlockState(=영구 해금 확정 경로)의 진입점은 이 두 속성뿐이다. 여기에 회당 결제 키가
// 들어오면 그 경로가 회당 결제를 영구 해금으로 만든다.
check("영구 해금 마크업에 회당 결제 키가 없다 (전수)", () => {
  const perUse = new Set(PER_USE_KEYS);
  const offenders = [];
  let scanned = 0;
  for (const file of ["index.html", "public/index.html"]) {
    const source = read(file);
    for (const attribute of ["data-tile-lock-key", "data-unlock-key"]) {
      for (const match of source.matchAll(new RegExp(`${attribute}="([^"]*)"`, "g"))) {
        scanned += 1;
        if (perUse.has(match[1])) offenders.push(`${file}: ${attribute}="${match[1]}"`);
      }
    }
  }
  assert.ok(scanned > 0, "해금 마크업을 하나도 찾지 못했다 — 이 가드의 선택자가 낡았다(fail-closed)");
  assert.deepEqual(offenders, [], `회당 결제 키가 영구 해금 마크업에 있다:\n  ${offenders.join("\n  ")}`);
});

// ── 7. 이집트 신탁 호출부 ──────────────────────────────────────────────────────
check("이집트 신탁이 featureKey 를 명시해 결제 게이트를 부른다", () => {
  for (const file of ["js/oracle-kcg.js", "public/js/oracle-kcg.js"]) {
    const source = read(file);
    const body = sliceFunctionBody(source, "function consumeKemetPerUseCoin()");
    assert.match(
      body,
      /featureKey:\s*'openKemetModal'/,
      `${file}: featureKey 를 안 넘기면 비한국어 로케일에서 사유 문자열 역매핑이 실패해 빈 키가 된다`,
    );
  }
});

// ── 실행 ───────────────────────────────────────────────────────────────────────
let failed = 0;
for (const { name, fn } of checks) {
  try {
    await fn();
    console.log(`  ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`  FAIL ${name}`);
    console.error(`       ${String(error && error.message || error).split("\n").join("\n       ")}`);
  }
}

console.log(`\n회당 결제 키 ${PER_USE_KEYS.length}개 · 영구 해금 키 ${UNLOCK_KEYS.length}개 검사 · 항목 ${checks.length}개 중 ${checks.length - failed}개 통과`);
if (failed > 0) {
  console.error(`\n❌ verify:per-use-never-unlocks 실패 ${failed}건`);
  process.exit(1);
}
console.log("✅ 회당 결제는 어느 경로로도 영구 해금이 되지 않는다");
