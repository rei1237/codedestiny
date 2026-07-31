/**
 * 결제창 '이용권으로 구매' 카드 회귀 가드 (jsdom 실행 검증).
 *
 * 2026-08 정책 전환으로 이용권 검사 지점이 **진입 선검사 → 결제창**으로 옮겨졌다. 문자열 단언만으로는
 * "카드가 있다"까지밖에 못 보므로, 여기서는 독립 정적 렌더러를 실제로 띄우고 카드를 눌러
 * 두 갈래가 정말 갈라지는지 확인한다.
 *
 * 고정하는 성질:
 *   ① 결제창에 이용권/단건/월정석 3옵션이 모두 렌더된다.
 *   ② 이용권이 커버하면 결제 없이 'pass' 로 닫힌다(= 호출부가 무료로 연다). 이동하지 않는다.
 *   ③ 커버하지 않으면 /points 로 인계하되 plan 프리셋과 cdco=1 이 붙고, 복귀 지점이 저장된다.
 *   ④ 🔴 앱 런타임에서는 절대 /points 로 이동하지 않고 __cdOpenChargeModal(= /app/store/) 을 탄다.
 *      앱 번들에는 /points 가 없고 app-payment-guard 는 앵커 클릭만 가로채므로 이동하면 빈 화면이다.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RUNTIME_FILES = ["js/core/pass-verdict.js", "js/core/checkout-entry.js", "js/destiny-profile.js"];

function bootRuntime({ appRuntime = false } = {}) {
  const storeUrls = [];
  const telemetry = [];

  // jsdom 은 실제 내비게이션을 구현하지 않고 window.location 도 재정의할 수 없다. 대신 이동 직전에
  // 목적지를 만드는 공용 모듈(js/core/checkout-entry.js)의 buildPassStoreUrl 을 감싸 목적지를 기록한다.
  // 반환값은 그대로 흘려보내므로 분기·인자는 실제 코드 그대로다.
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", () => { /* 미구현 내비게이션 경고는 이 가드의 관심사가 아니다 */ });

  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
    url: "https://code-destiny.com/celestial-harmony.html?spread=3",
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole,
  });
  const { window } = dom;

  // 네트워크는 전부 막는다 — 이 가드가 보는 것은 분기이지 서버 응답이 아니다.
  // 계측(퍼널 이벤트)은 따로 모아 content-type·본문을 검사한다.
  window.fetch = async (url, init) => {
    if (String(url || "").includes("/api/billing/funnel-event")) telemetry.push({ url, init: init || {} });
    return { ok: false, status: 503, json: async () => ({}), text: async () => "" };
  };

  if (appRuntime) window.__cdAppPaymentGuard = { installed: true };

  for (const file of RUNTIME_FILES) {
    window.eval(fs.readFileSync(path.join(ROOT, file), "utf8"));
  }
  assert.equal(typeof window._cdChooseServicePaymentMode, "function", "독립 정적 결제창 렌더러가 설치되어야 한다");

  const realBuildPassStoreUrl = window.__cdCheckoutEntry.buildPassStoreUrl;
  window.__cdCheckoutEntry.buildPassStoreUrl = (options) => {
    const url = realBuildPassStoreUrl(options);
    storeUrls.push(url);
    return url;
  };
  return { window, storeUrls, telemetry };
}

function openChoice(window, options = {}) {
  return window._cdChooseServicePaymentMode(Object.assign({
    title: "심층 사주 리포트",
    featureKey: "saju-deep",
    coinPrice: 50,
    amountKrw: 5000,
    membershipCreditCost: 500,
  }, options));
}

function findCard(window, mode) {
  return window.document.querySelector(`[data-mode="${mode}"]`);
}

// 상점 인계는 finish() 로 프로미스를 먼저 resolve 한 뒤 이동한다(호출부 계약). 그래서 choice 를 await 한
// 시점에는 아직 location.assign 이 불리지 않았을 수 있다 — 이동까지 흘려보낸 뒤 관찰한다.
function flush() {
  return new Promise((resolve) => { setTimeout(resolve, 0); });
}

const failures = [];
function check(label, fn) {
  try {
    fn();
    console.log(`  ✓ ${label}`);
  } catch (error) {
    failures.push(`${label} — ${error.message}`);
    console.log(`  ✗ ${label} — ${error.message}`);
  }
}

// ── ① 3옵션이 모두 렌더된다 ────────────────────────────────────────────────
console.log("\n[1] 결제창에 이용권/단건/월정석 3옵션이 모두 보이는가");
{
  const { window } = bootRuntime();
  const choicePromise = openChoice(window);
  check("이용권 카드", () => assert.ok(findCard(window, "pass-store"), "data-mode=pass-store 없음"));
  check("단건 결제 카드", () => assert.ok(findCard(window, "direct"), "data-mode=direct 없음"));
  check("월정석 카드", () => assert.ok(findCard(window, "monthly"), "data-mode=monthly 없음"));
  check("이용권 카드 라벨이 '이용권으로 구매'", () => {
    assert.match(findCard(window, "pass-store").textContent, /이용권으로 구매/);
  });
  check("이용권 카드가 첫 옵션(추천)", () => {
    const first = window.document.querySelector(".cd-direct-payment-choice-grid [data-mode]");
    assert.equal(first?.getAttribute("data-mode"), "pass-store");
  });
  findCard(window, "cancel")?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await choicePromise;
}

// ── ② 이용권이 커버하면 결제 없이 무료로 통과한다 ──────────────────────────
console.log("\n[2] 이용권 카드 클릭 → 커버되면 결제 없이 'pass' 로 닫히는가");
{
  const { window, storeUrls } = bootRuntime();
  let probeCalls = 0;
  let chargeModalCalls = 0;
  window.__cdOpenChargeModal = () => { chargeModalCalls += 1; };
  window.__cdApplyMembershipPassBeforePayment = async () => { probeCalls += 1; return { status: "pass_applied" }; };
  const choicePromise = openChoice(window);
  findCard(window, "pass-store").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  const choice = await choicePromise;
  await flush();
  check("서버 이용권 검사를 정확히 1회 수행", () => assert.equal(probeCalls, 1));
  check("'pass' 로 resolve(호출부가 무료로 연다)", () => assert.equal(choice, "pass"));
  check("이용권 상점으로 인계하지 않음", () => assert.deepEqual(storeUrls, []));
  check("충전 모달도 열지 않음", () => assert.equal(chargeModalCalls, 0));
}

// ── ③ 미커버면 plan 프리셋 + cdco=1 로 상점에 인계하고 복귀 지점을 남긴다 ──
console.log("\n[3] 이용권 카드 클릭 → 미커버면 /points 로 인계하는가");
{
  const { window, storeUrls } = bootRuntime();
  let chargeModalCalls = 0;
  window.__cdOpenChargeModal = () => { chargeModalCalls += 1; };
  window.__cdApplyMembershipPassBeforePayment = async () => ({ status: "payment_required" });
  const choicePromise = openChoice(window);
  findCard(window, "pass-store").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await choicePromise;
  await flush();
  check("/points 로 인계", () => {
    assert.equal(storeUrls.length, 1, `인계 ${storeUrls.length}회`);
    assert.match(storeUrls[0], /^\/points\?/);
  });
  check("웹에서는 중간 충전 모달을 거치지 않는다", () => assert.equal(chargeModalCalls, 0));
  check("추천 플랜이 프리셋으로 실린다", () => assert.match(storeUrls[0], /[?&]plan=premium(&|$)/));
  check("cdco=1 이 붙어야 결제 확인 모달이 자동으로 열린다", () => assert.match(storeUrls[0], /[?&]cdco=1(&|$)/));
  check("복귀 지점 저장(결제 후 원래 화면으로 돌아간다)", () => {
    const raw = window.sessionStorage.getItem("cd_checkout_return_v1");
    assert.ok(raw, "cd_checkout_return_v1 없음");
    assert.match(JSON.parse(raw).url, /celestial-harmony\.html\?spread=3/);
  });
}

// ── ④ 🔴 앱에서는 /points 로 가지 않는다 ───────────────────────────────────
console.log("\n[4] 앱 런타임에서 /points 로 이동하지 않고 인앱 상점을 타는가");
{
  const { window, storeUrls } = bootRuntime({ appRuntime: true });
  let chargeModalCalls = 0;
  window.__cdOpenChargeModal = () => { chargeModalCalls += 1; };
  window.__cdApplyMembershipPassBeforePayment = async () => ({ status: "payment_required" });
  const choicePromise = openChoice(window);
  findCard(window, "pass-store").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await choicePromise;
  await flush();
  check("인앱 상점(__cdOpenChargeModal)을 호출", () => assert.equal(chargeModalCalls, 1));
  check("/points URL 을 만들지도 않음(앱 번들에 없어 빈 화면이 된다)", () => assert.deepEqual(storeUrls, []));
}

// ── ⑤ 계측이 결제 흐름을 막지 않고, 워커 보안 가드를 통과하는 형태로 나간다 ──
console.log("\n[5] 퍼널 계측이 결제 경로에 영향을 주지 않는가");
{
  const { window, telemetry } = bootRuntime();
  window.__cdApplyMembershipPassBeforePayment = async () => ({ status: "pass_applied" });
  const choicePromise = openChoice(window);
  findCard(window, "pass-store").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  const choice = await choicePromise;
  await flush();
  check("이용권 무료 통과는 그대로", () => assert.equal(choice, "pass"));
  check("계측 이벤트가 실제로 나갔다", () => assert.ok(telemetry.length > 0, "funnel-event 요청 0건"));
  // 🔴 /api/billing/* 은 requireJson 가드가 걸려 있고, 위반하면 400 일 뿐 아니라 addAbuseScore 까지
  // 올린다 — 계측이 공격 트래픽으로 집계돼 실제 사용자가 차단될 수 있다. 첫 배포에서 sendBeacon 의
  // text/plain 으로 나가 전 이벤트가 400 을 맞았던 자리다.
  check("application/json 으로 보낸다(워커 requireJson 가드)", () => {
    for (const call of telemetry) {
      assert.equal(call.init?.headers?.["Content-Type"], "application/json");
      assert.equal(call.init?.keepalive, true);
    }
  });
  check("개인식별자를 실어 보내지 않는다", () => {
    for (const call of telemetry) {
      assert.doesNotMatch(String(call.init?.body || ""), /userId|email/i);
    }
  });
}

// ── ⑥ 계측이 터져도 결제는 계속된다 ───────────────────────────────────────
console.log("\n[6] 계측이 예외를 던져도 이용권 무료 통과는 그대로인가");
{
  const { window } = bootRuntime();
  // 계측 요청만 던지게 한다. fetch 전체를 던지게 하면 월정석 잔량 조회까지 막혀
  // 이 케이스가 보려는 것(계측 실패의 격리)과 무관한 실패가 섞인다.
  const passthroughFetch = window.fetch;
  window.fetch = (url, init) => {
    if (String(url || "").includes("/api/billing/funnel-event")) throw new Error("telemetry down");
    return passthroughFetch(url, init);
  };
  window.__cdApplyMembershipPassBeforePayment = async () => ({ status: "pass_applied" });
  const choicePromise = openChoice(window);
  findCard(window, "pass-store").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  const choice = await choicePromise;
  check("계측이 터져도 'pass' 로 닫힌다", () => assert.equal(choice, "pass"));
}

if (failures.length) {
  console.error(`\n[verify-checkout-pass-card] FAIL (${failures.length})`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("\n[verify-checkout-pass-card] PASS");
