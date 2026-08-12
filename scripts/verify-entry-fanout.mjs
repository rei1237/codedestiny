/**
 * 홈 진입 팬아웃 계약 가드 (2026-08-12).
 *
 * 배경: 로그인 사용자가 메인 화면에 진입하면 짧은 구간에 API 가 4~6개 나갔고, 그중 상당수가 같은
 * users 문서를 각자 다시 읽었다. 콜드 아이솔레이트에서 그 팬아웃이 겹치면 공유 admission 레인이
 * 포화되고, 넘친 요청은 MongoOperationOverloadedError — withMongoRetry 가 **재시도에서 명시적으로
 * 제외한** 예외 — 로 죽어 그대로 503 이 된다(worker/lib/db.js MONGO_MAX_IN_FLIGHT_OPS 주석).
 *
 * 그래서 진입에서 두 호출을 없앴다. 이 스크립트는 그 둘이 되살아나는 것을 막는다:
 *   1) /api/subscription/status 진입 워밍(reason:'app-entry') — 그 응답의 profileSubscription 과
 *      membershipCreditBalance(월정석 잔량)는 곧 도착하는 /api/auth/me 가 이미 싣고 오는 같은 값이다.
 *   2) POST /api/rpg/adopt — 서버 캐시 없이 Mongo 4~5 왕복. 레벨 UI 를 실제로 열 때로 미뤘다.
 *
 * 🔴 되살리려면 여기 단언들을 함께 뒤집어야 한다. 그건 정책 변경이므로 임의로 하지 말 것.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sliceFunction } from "./lib/js-source-slice.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const SHELLS = [
  "index.html",
  "public/index.html",
  "public/static/index.html",
  "public/en/index.html",
  "public/ja/index.html",
  "public/zh/index.html",
  "public/zh-tw/index.html",
].filter((rel) => fs.existsSync(path.join(ROOT, rel)));

const CLIENTS = ["js/destiny-profile.js", "public/js/destiny-profile.js"]
  .filter((rel) => fs.existsSync(path.join(ROOT, rel)));

const failures = [];
const check = (label, fn) => {
  try {
    fn();
    console.log(`  ✓ ${label}`);
  } catch (error) {
    failures.push(`${label}\n      ${String(error?.message || error).split("\n")[0]}`);
    console.log(`  ✗ ${label}`);
  }
};

console.log("=== 홈 진입 팬아웃 계약 ===");
assert.ok(SHELLS.length >= 6, `셸 미러를 6개 이상 찾아야 한다 (found ${SHELLS.length})`);
assert.ok(CLIENTS.length === 2, `destiny-profile.js 는 루트·public 두 벌이어야 한다 (found ${CLIENTS.length})`);

/* ── 1. 진입 워밍이 사라져 있는가 ─────────────────────────────────────── */
console.log("\n[1] /api/subscription/status 진입 워밍 부재 (셸 " + SHELLS.length + "종)");
for (const rel of SHELLS) {
  const source = read(rel);
  check(`${rel}: reason:'app-entry' 워밍이 없다`, () => {
    // 🔴 주석에도 같은 문자열이 있다(왜 지웠는지를 적어 둔 자리). 그래서 문자열이 아니라
    // **호출 형태**를 본다 — _cdRefreshSubscriptionSnapshotFromServer({ …, reason:'app-entry' }).
    assert.ok(
      !/_cdRefreshSubscriptionSnapshotFromServer\(\s*\{[^}]*reason:\s*['"]app-entry['"]/.test(source),
      "진입 워밍이 되살아났다. /api/auth/me 가 같은 profileSubscription 을 이미 싣고 오므로 중복이다.",
    );
  });
  check(`${rel}: idle·pointerdown 워밍은 남아 있다(폴백)`, () => {
    assert.ok(
      source.includes("_cdWarmSubscriptionSnapshotIfMissing('idle')"),
      "idle 워밍까지 지우면 스냅샷을 못 받은 사용자(게스트·degraded·auth/me 실패)의 fast-path 폴백이 사라진다.",
    );
    assert.ok(
      source.includes("_cdWarmSubscriptionSnapshotIfMissing('intent')"),
      "pointerdown 워밍이 사라졌다.",
    );
  });
}

/* ── 2. auth/me 가 이용권 스냅샷을 채우는가 ───────────────────────────── */
console.log("\n[2] /api/auth/me 응답 → 이용권 스냅샷 기록");
for (const rel of SHELLS) {
  const source = read(rel);
  const fn = sliceFunction(source, "async function verifyAuthSessionForCoinApi(", "verifyAuthSessionForCoinApi");
  check(`${rel}: _cdStoreSubscriptionSnapshot(_, 'auth-me') 호출`, () => {
    assert.ok(
      /_cdStoreSubscriptionSnapshot\(\s*authMeSub\s*,\s*['"]auth-me['"]\s*\)/.test(fn),
      "auth/me 응답으로 스냅샷을 채우지 않으면 진입 워밍을 되살릴 수밖에 없다.",
    );
  });
  check(`${rel}: degraded 응답은 스냅샷에 쓰지 않는다`, () => {
    // degraded 응답은 tier:"free" 라, 쓰는 순간 이용권 보유자가 무료로 굳어 결제창이 뜬다.
    assert.ok(
      /payload\.degraded\s*!==\s*true\s*&&\s*payload\.code\s*!==\s*['"]AUTH_ME_DEGRADED['"]/.test(fn),
      "degraded 가드(authMeTrustworthy)가 사라졌다.",
    );
    assert.ok(
      /if\s*\(\s*authMeTrustworthy\s*&&\s*authMeSub/.test(fn),
      "스냅샷 기록이 degraded 가드 밖으로 나갔다.",
    );
  });
}
for (const rel of CLIENTS) {
  const source = read(rel);
  const fn = sliceFunction(source, "function _dpVerifyLoginSession(", "_dpVerifyLoginSession");
  check(`${rel}: _dpWriteSubscriptionSnapshot(_, 'auth-me') 호출 + degraded 가드`, () => {
    assert.ok(
      /_dpWriteSubscriptionSnapshot\(\s*user\.profileSubscription\s*,\s*['"]auth-me['"]\s*\)/.test(fn),
      "셸 없는 독립 정적 페이지에서도 같은 효과가 필요하다.",
    );
    assert.ok(
      /payload\.degraded\s*!==\s*true\s*&&\s*payload\.code\s*!==\s*['"]AUTH_ME_DEGRADED['"]/.test(fn),
      "degraded 가드가 없다.",
    );
  });
}

/* ── 3. 스냅샷 하이드레이션이 실제로 쓸모 있는 판정을 만드는가 ────────── */
// 문자열 단언만으로는 "불렀다"까지만 안다. auth/me 가 싣고 오는 모양의 profileSubscription 이
// 정말로 active 스냅샷 → 커버 판정까지 가는지, 판정 정본을 실제로 실행해 확인한다.
console.log("\n[3] auth/me 모양의 profileSubscription → 커버 판정 (판정 정본 실행)");
{
  // pass-verdict 는 package.json type=commonjs 라 require 로 그대로 불러온다(새 로더를 만들지 않는다).
  // getStorage() 가 맨몸 localStorage 를 보므로 전역에 최소 구현만 심는다.
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
  };
  const require = createRequire(import.meta.url);
  const verdict = require(path.join(ROOT, "js/core/pass-verdict.js"));
  assert.ok(verdict && typeof verdict.storeStatus === "function", "pass-verdict 정본을 불러오지 못했다");

  const userId = "507f1f77bcf86cd799439011";
  const future = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();

  check("이용권 보유자: active 스냅샷이 생기고 그 가격을 커버한다", () => {
    // worker/lib/auth.js normalizeAuthProfileSubscription 이 /api/auth/me 에 싣는 모양.
    const snapshot = verdict.storeStatus(userId, {
      tier: "premium", passTier: "premium", plan: "premium",
      isActive: true, isSubscribed: true, status: "active",
      expiresAt: future, passLimit: 50, freeLimit: 50,
      monthlyStoneBalance: 3000, membershipCreditBalance: 3000,
    }, "auth-me");
    assert.equal(snapshot.state, "active");
    assert.equal(snapshot.tier, "premium");
    assert.equal(verdict.resolveVerdict(snapshot, 30).coversNow, true, "이용권 한도 안 가격이 커버되지 않았다");
  });

  check("무료 사용자: none 스냅샷이 생겨 진입 워밍 없이 미보유가 확정된다", () => {
    const freeUser = "507f1f77bcf86cd799439012";
    const snapshot = verdict.storeStatus(freeUser, {
      tier: "free", isActive: false, isSubscribed: false, status: "inactive", expiresAt: null,
    }, "auth-me");
    assert.equal(snapshot.state, "none");
    // 'none' 확정이 없으면 무료 사용자는 매 진입마다 서버 왕복을 한 번 더 한다.
    assert.equal(verdict.resolveVerdict(snapshot, 30).cannotCover, true);
  });

  check("만료된 이용권은 active 로 굳지 않는다", () => {
    const expiredUser = "507f1f77bcf86cd799439013";
    const past = new Date(Date.now() - 60 * 1000).toISOString();
    const snapshot = verdict.storeStatus(expiredUser, {
      tier: "premium", isActive: true, status: "active", expiresAt: past,
    }, "auth-me");
    assert.equal(snapshot.state, "none");
  });

  check("보유자 스냅샷은 불완전한 'none' 으로 덮이지 않는다(다운그레이드 가드)", () => {
    // degraded 가드를 뚫고 free 가 흘러들어도 판정 정본이 한 겹 더 막는지 확인한다.
    const before = verdict.readSnapshot(userId);
    assert.equal(before.state, "active");
    verdict.storeStatus(userId, { tier: "free", isActive: false, degraded: true }, "auth-me");
    assert.equal(verdict.readSnapshot(userId).state, "active", "보유자 스냅샷이 free 로 덮였다");
  });
}

/* ── 4. POST /api/rpg/adopt 가 홈 진입에서 빠져 있는가 ────────────────── */
console.log("\n[4] POST /api/rpg/adopt 홈 진입 미발화");
for (const rel of CLIENTS) {
  const source = read(rel);
  const sync = sliceFunction(source, "function _cdLevelSync(", "_cdLevelSync");
  const idle = sliceFunction(source, "function _cdLevelSyncWhenIdle(", "_cdLevelSyncWhenIdle");
  check(`${rel}: _cdLevelSync 는 opts.adopt === true 일 때만 adopt 한다`, () => {
    assert.ok(
      /opts\.adopt\s*===\s*true\s*\?\s*_cdLevelAdopt\(\)/.test(sync),
      "adopt 게이트가 사라졌다 — 홈 idle 에서 Mongo 4~5 왕복이 다시 나간다.",
    );
  });
  check(`${rel}: _cdLevelSyncWhenIdle 은 adopt 를 켜지 않는다`, () => {
    assert.ok(!/adopt\s*:\s*true/.test(idle), "홈 idle 경로가 adopt 를 다시 켰다.");
  });
  check(`${rel}: 레벨 보상 시트가 adopt 를 인계받았다`, () => {
    const sheet = sliceFunction(source, "function _dpOpenLevelRewardSheet(", "_dpOpenLevelRewardSheet");
    assert.ok(
      /_cdLevelSync\(\s*\{[^}]*adopt:\s*true/.test(sheet),
      "adopt 를 홈에서 뺐는데 어디서도 부르지 않으면 로컬 EXP 가 영영 이관되지 않는다.",
    );
  });
  check(`${rel}: adopt 성공 판정이 본문 ok 까지 본다`, () => {
    const adopt = sliceFunction(source, "function _cdLevelAdopt(", "_cdLevelAdopt");
    // res.ok 는 HTTP 상태다. 서버가 DB 장애를 200 + {ok:false} 로 돌려주므로 HTTP 만 보면
    // 이관되지 않은 EXP 에 adopted 를 찍고 영영 못 넘긴다.
    assert.ok(
      /res\.ok\s*&&\s*res\.data\s*&&\s*res\.data\.ok\s*!==\s*false/.test(adopt),
      "본문 ok 가드가 없다.",
    );
  });
}

/* ── 5. 서버 adopt 가 503 을 내지 않는가 ─────────────────────────────── */
console.log("\n[5] POST /api/rpg/adopt 는 DB 장애에 503 을 내지 않는다");
{
  const source = read("worker/routes/rpg.js");
  const fn = sliceFunction(source, "async function adoptLocalRpgProgress(", "adoptLocalRpgProgress");
  check("degraded 200 + ok:false 로 답한다", () => {
    assert.ok(fn.includes("RPG_ADOPT_DEGRADED"), "degraded 코드가 없다.");
    assert.ok(/ok:\s*false/.test(fn), "ok:false 가 없으면 클라가 adopted 를 잘못 찍는다.");
    assert.ok(/degraded:\s*true/.test(fn), "degraded 표식이 없다.");
    assert.ok(!/status:\s*503/.test(fn), "503 을 직접 내고 있다.");
  });
  check("인증 실패는 여전히 degraded 로 세탁되지 않는다", () => {
    // requireAuth 는 try 밖에 있어야 401 이 401 로 나간다.
    const authIndex = fn.indexOf("requireAuth(");
    const tryIndex = fn.indexOf("try {");
    assert.ok(authIndex >= 0 && tryIndex >= 0, "구조를 못 찾았다");
    assert.ok(authIndex < tryIndex, "requireAuth 가 degraded try 안으로 들어갔다 — 401 이 200 으로 세탁된다.");
  });
}

console.log("");
if (failures.length) {
  console.error(`[verify-entry-fanout] FAIL — ${failures.length}건\n`);
  for (const f of failures) console.error(`  · ${f}`);
  process.exit(1);
}
console.log("[verify-entry-fanout] PASS");
