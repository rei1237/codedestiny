#!/usr/bin/env node
/**
 * 이용권 스냅샷/판정이 js/core/pass-verdict.js 한 곳에만 존재하는지 고정한다.
 *
 * 배경: 정적 셸(index.html) · React(app/_lib/billing-client.ts) · 독립 정적(js/destiny-profile.js)이
 * **같은 localStorage 키**(cd_subscription_snapshot_v2::<userId>)를 읽고 쓴다. 예전엔 같은 로직이
 * 3벌로 복제돼 있었고 active TTL 이 5분/15분으로 갈라진 채 배포돼, 한 런타임이 다른 런타임의 캐시를
 * 만료로 보고 지우는 일이 실제로 있었다. 사본이 되살아나면 여기서 막는다.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
// 🔴 등급 한도는 여기에 리터럴로 적지 않는다 — 서버 정본에서 끌어와 대조한다.
//    옛 코드는 30/50/100 을 손으로 박아 두어, 정책이 바뀔 때 이 가드가 정책이 아니라
//    옛 숫자를 지켰다(2026-08-24 상한 상향에서 실제로 여기서 걸렸다).
import { PASS_LIMITS, FAMILY_PASS_MAX_COVERED_COIN } from "../worker/lib/profile-limits.js";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

const failures = [];

function read(relPath) {
  const full = resolve(rootDir, relPath);
  if (!existsSync(full)) {
    failures.push(`파일이 없습니다: ${relPath}`);
    return "";
  }
  return readFileSync(full, "utf8");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertContains(source, needle, message) {
  assert(source.includes(needle), `${message} (찾지 못함: ${needle})`);
}

function assertNotContains(source, needle, message) {
  assert(!source.includes(needle), `${message} (발견됨: ${needle})`);
}

// ── 1. 정본 모듈이 존재하고 필요한 API 를 전부 노출한다 ────────────────────────────────
const MODULE_PATH = "js/core/pass-verdict.js";
const moduleSource = read(MODULE_PATH);
assertContains(moduleSource, "cd_subscription_snapshot_v2::", "정본 모듈이 스냅샷 키를 소유해야 한다");
assertContains(moduleSource, "globalThis.__cdPassVerdict", "정본 모듈은 브라우저 전역(__cdPassVerdict)을 노출해야 한다");
assertContains(moduleSource, "module.exports", "정본 모듈은 CommonJS(module.exports)로도 소비 가능해야 한다");
assertNotContains(moduleSource, "import ", "정본 모듈은 classic script 로도 로드되므로 ESM 구문을 쓰면 안 된다");
assertNotContains(moduleSource, "export ", "정본 모듈은 classic script 로도 로드되므로 ESM 구문을 쓰면 안 된다");

let passVerdict = null;
try {
  passVerdict = require(resolve(rootDir, MODULE_PATH));
} catch (error) {
  failures.push(`정본 모듈을 require 할 수 없습니다: ${String(error && error.message)}`);
}

if (passVerdict) {
  for (const name of [
    "readSnapshot", "writeSnapshot", "removeSnapshot", "buildSnapshotFromStatus",
    "storeStatus", "resolveVerdict", "coverageFromSnapshot", "passLimitForTier", "normalizeTier",
  ]) {
    assert(typeof passVerdict[name] === "function", `정본 모듈이 ${name}() 을 노출해야 한다`);
  }
  assert(passVerdict.NONE_TTL_MS === 60000, "미보유 스냅샷 TTL 은 60초여야 한다");
  assert(passVerdict.ACTIVE_TTL_MS === 5 * 60 * 1000, "보유 스냅샷 재검증 간격은 5분이어야 한다");
  assert(passVerdict.NONE_STALE_MAX_MS === 24 * 60 * 60 * 1000, "미보유 stale 상한은 24시간이어야 한다");
  for (const tier of ["standard", "premium", "vvip"]) {
    assert(
      passVerdict.passLimitForTier(tier) === PASS_LIMITS[tier],
      `${tier} 한도는 서버 정본 PASS_LIMITS 와 같아야 한다(정본=${PASS_LIMITS[tier]}, 클라=${passVerdict.passLimitForTier(tier)})`,
    );
  }
  assert(
    passVerdict.passLimitForTier("family") === FAMILY_PASS_MAX_COVERED_COIN,
    "family 는 건당 상한이 없어야 한다",
  );

  // 🔴 이번 변경의 핵심 성질: TTL 을 넘겼어도 이용권 만료일이 남아 있으면 커버 판정을 유지한다.
  const now = Date.now();
  const staleButValid = {
    userId: "u1",
    state: "active",
    tier: "premium",
    expiresAt: new Date(now + 20 * 24 * 60 * 60 * 1000).toISOString(),
    checkedAt: now - 10 * 60 * 1000,
    purchaseVersion: "",
    source: "guard",
    stale: true,
  };
  assert(
    passVerdict.resolveVerdict(staleButValid, 30).coversNow === true,
    "만료 전 이용권은 TTL 을 넘겨도 커버 판정을 유지해야 한다(보유자가 매 클릭 서버 왕복을 타던 회귀)",
  );
  assert(
    passVerdict.resolveVerdict({ ...staleButValid, expiresAt: null }, 30).coversNow === false,
    "만료일을 모르는 stale active 는 커버 확정을 내리면 안 된다",
  );
  assert(
    passVerdict.resolveVerdict({ ...staleButValid, tier: "standard" }, PASS_LIMITS.standard + 1).cannotCover === true,
    "가격이 등급 한도를 넘으면 미커버 확정이어야 한다",
  );
  assert(
    passVerdict.resolveVerdict({ ...staleButValid, tier: "standard" }, PASS_LIMITS.standard).cannotCover === false,
    "가격이 등급 한도와 정확히 같으면 미커버로 확정하면 안 된다",
  );
}

// ── 2. 세 런타임이 정본을 실제로 소비하고, 사본을 두지 않는다 ──────────────────────────
// 스냅샷 로직 사본을 알아보는 표식. 값만 옮겨 적어도(예: 5 * 60 * 1000) 이름이 남으면 잡힌다.
const DUPLICATE_MARKERS = [
  "cd_subscription_snapshot_v2::",
  "SNAPSHOT_NONE_TTL_MS",
  "SNAPSHOT_ACTIVE_TTL_MS",
  "SNAPSHOT_NONE_STALE_MAX_MS",
];

const shellSource = read("index.html");
assertContains(shellSource, 'src="/js/core/pass-verdict.js', "정적 셸이 정본 모듈을 로드해야 한다");
assertContains(shellSource, "window.__cdPassVerdict", "정적 셸이 정본 모듈을 소비해야 한다");
for (const marker of DUPLICATE_MARKERS) {
  assertNotContains(shellSource, marker, "정적 셸에 스냅샷 로직 사본이 되살아났다");
}
// 🔴 정본 모듈은 defer 없이 로드해야 한다 — 셸 인라인 블록이 파싱 시점에 이미 이 전역을 참조한다.
assertNotContains(
  shellSource,
  '<script defer src="/js/core/pass-verdict.js',
  "정본 모듈에 defer 를 붙이면 셸 인라인 블록보다 늦게 실행된다",
);

const billingClientSource = read("app/_lib/billing-client.ts");
assertContains(billingClientSource, 'from "@/js/core/pass-verdict.js"', "React 런타임이 정본 모듈을 import 해야 한다");
assertContains(billingClientSource, "passVerdict.readSnapshot(", "React 런타임이 정본 리더를 써야 한다");
assertContains(billingClientSource, "isAuthUserCacheVerified(authUser)", "React는 최근 검증된 인증 캐시만 스냅샷으로 승격해야 한다");
assertContains(billingClientSource, '"verified-auth-cache"', "React가 검증된 인증 캐시를 공통 스냅샷에 저장해야 한다");
for (const marker of DUPLICATE_MARKERS) {
  assertNotContains(billingClientSource, marker, "React 런타임에 스냅샷 로직 사본이 되살아났다");
}

const destinyProfileSource = read("js/destiny-profile.js");
assertContains(destinyProfileSource, "window.__cdPassVerdict", "독립 정적 런타임이 정본 모듈을 소비해야 한다");
assertContains(destinyProfileSource, "_dpHasVerifiedAuthCacheForUser(user)", "독립 정적 런타임은 검증된 인증 캐시만 사용해야 한다");
assertContains(destinyProfileSource, "api.storeStatus(_dpResolveIdScope(user), sub, 'verified-auth-cache')", "독립 정적 런타임이 모든 등급을 공통 스냅샷 판정기로 보내야 한다");
for (const marker of DUPLICATE_MARKERS) {
  assertNotContains(destinyProfileSource, marker, "독립 정적 런타임에 스냅샷 로직 사본이 되살아났다");
}

// ── 3. destiny-profile.js 를 쓰는 정적 HTML 은 그보다 **먼저** 정본 모듈을 로드해야 한다 ──
const STANDALONE_PAGES = [
  "celestial-harmony.html",
  "cosmic-soul-meditation.html",
  "fortune-teller-fish.html",
  "geomancy-oracle-v4.html",
  "ifa_oracle_v2_full.html",
  "neville-meditation.html",
  "pet-saju.html",
  "royal-tea-oracle.html",
  "tarot-ijik.html",
  "vedic-astrology.html",
  "yoga-guru.html",
  "index.html",
];

for (const page of STANDALONE_PAGES) {
  const source = read(page);
  if (!source) continue;
  const verdictAt = source.indexOf("/js/core/pass-verdict.js");
  const profileAt = source.indexOf("/js/destiny-profile.js");
  if (profileAt < 0) continue; // destiny-profile 을 안 쓰면 대상 아님
  assert(verdictAt >= 0, `${page} 가 /js/core/pass-verdict.js 를 로드하지 않는다`);
  assert(
    verdictAt >= 0 && verdictAt < profileAt,
    `${page} 는 destiny-profile.js 보다 먼저 pass-verdict.js 를 로드해야 한다`,
  );
}

// ── 4. 워커 번들에 클라이언트 전용 모듈이 섞이지 않는다 ────────────────────────────────
const workerBilling = read("worker/routes/billing.js");
assertNotContains(workerBilling, "pass-verdict", "워커는 클라이언트 전용 판정 모듈을 참조하면 안 된다");
// 클라이언트 스냅샷의 유효기간 근거를 서버가 반드시 내려줘야 한다.
assertContains(
  workerBilling,
  "expiresAt: hasActivePass ? (activeEntitlement?.expiresAt || null) : null",
  "결제 판정 응답에 이용권 만료일이 포함되어야 한다(없으면 클라이언트 스냅샷이 5분마다 폐기된다)",
);
assertContains(
  workerBilling,
  "expiresAt: subscriptionEntitlement.expiresAt || null",
  "scope=pass 응답에도 이용권 만료일이 포함되어야 한다",
);

// ── 5. 셸 30초 선검사 캐시가 이용권 보유자만 우회시키지 않는다 ─────────────────────────
const forceFreshStart = shellSource.indexOf("function _cdShouldForceFreshPaidPassCheck(");
if (forceFreshStart < 0) {
  failures.push("_cdShouldForceFreshPaidPassCheck 를 찾지 못했습니다");
} else {
  const forceFreshEnd = shellSource.indexOf("\n  }", forceFreshStart);
  const forceFreshSource = shellSource.slice(forceFreshStart, forceFreshEnd > 0 ? forceFreshEnd : forceFreshStart + 2000);
  assertNotContains(
    forceFreshSource,
    "hasActivePass === true",
    "이용권 보유자만 30초 선검사 캐시를 우회하던 성능 역전이 되살아났다",
  );
  assertContains(forceFreshSource, "item.forceRefreshMembershipCoverage === true", "명시적 재검증 요청은 계속 강제 재검사여야 한다");
  assertContains(forceFreshSource, "item.requireServerPassCheck === true", "명시적 서버 검사 요청은 계속 강제 재검사여야 한다");
}

// ── 6. stale 스냅샷이 백그라운드 갱신을 실제로 예약한다 ────────────────────────────────
assertContains(shellSource, "_cdScheduleSubscriptionSnapshotRevalidate", "셸이 stale 스냅샷의 백그라운드 재검증을 예약해야 한다");
assertContains(
  shellSource,
  "CD_SUBSCRIPTION_SNAPSHOT_REVALIDATE_MIN_INTERVAL_MS",
  "재검증에 최소 간격이 없으면 갱신 실패 시 판정↔갱신이 서로를 되먹여 타이머가 폭주한다",
);
assertContains(
  shellSource,
  "__cdSubscriptionSnapshotRefreshInFlight = true",
  "스냅샷 갱신 in-flight 플래그를 동기로 선점해야 한다(stale 상태에서 무한 재귀 방지)",
);
assertContains(billingClientSource, "warmCached.stale !== true", "React 워밍이 stale 스냅샷에서 조기 반환하면 갱신이 영영 안 돈다");
assertContains(shellSource, "window.__cdHasVerifiedAuthCache = __cdHasVerifiedAuthCache", "정적 셸이 검증된 인증 캐시 판정을 독립 런타임과 공유해야 한다");
assertContains(shellSource, "verdictApi.storeStatus(userId, sub, 'verified-auth-cache')", "정적 셸이 family 포함 모든 등급을 공통 스냅샷 판정기로 보내야 한다");
assertContains(shellSource, "tier !== 'vvip' && tier !== 'family'", "정적 셸 이용권 표시에서 family 등급을 누락하면 안 된다");

const refreshStart = shellSource.indexOf("async function _cdRefreshSubscriptionSnapshotFromServer(");
const refreshEnd = shellSource.indexOf("function _cdScheduleSubscriptionSnapshotRefresh(", refreshStart);
const refreshSource = shellSource.slice(refreshStart, refreshEnd);
assertNotContains(refreshSource, "if (opts.force) _cdClearSubscriptionSnapshotForCurrentUser();", "강제 재검증도 성공 전 마지막 정상 이용권 스냅샷을 지우면 안 된다");

const accessStoreSource = read("js/core/access-store.js");
assertContains(accessStoreSource, "var RETRY_DELAYS = [];", "AccessStore 503은 자동 재시도하지 않아야 한다");
const applyPaymentStart = accessStoreSource.indexOf("function applyPaymentPayload(");
const applyPaymentEnd = accessStoreSource.indexOf("function ensureLoaded(", applyPaymentStart);
assertNotContains(accessStoreSource.slice(applyPaymentStart, applyPaymentEnd), "startFetch(", "검증된 결제 응답 직후 unlock을 다시 조회하면 안 된다");

if (failures.length) {
  console.error("pass snapshot single-source checks FAILED:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("pass snapshot single-source checks passed");
