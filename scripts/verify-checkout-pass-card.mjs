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

// ── ⑦ 대기 화면은 이용권 확인에서만 뜬다 ──────────────────────────────────
// 2026-08 신고: 유료 기능을 누르면 결제창 대신 'PAYMENT CHECK · 결제 상태 확인 중 · 단건으로 카드
// 결제를 준비 중이에요' 전체화면이 떴다. 정책은 "진행 중 표시는 이용권/월정석 결과 준비에서만"이다.
// 독립 정적 환경의 집행 지점(window._cdSetCoinGateOverlay 심)을 실제로 눌러 확인한다.
console.log("\n[7] 대기 오버레이가 이용권 확인 모드에서만 뜨는가");
{
  const { window } = bootRuntime();
  const overlayVisible = () => {
    const node = window.document.getElementById("cdStandalonePaymentOverlay");
    return Boolean(node) && node.style.display === "flex";
  };
  for (const mode of ["payment", "checkout", "card", "confirm", "subscription"]) {
    check(`'${mode}' 진행 화면은 뜨지 않는다`, () => {
      window._cdSetCoinGateOverlay(true, "테스트", mode);
      assert.equal(overlayVisible(), false, `${mode} 오버레이가 떴다`);
    });
  }
  check("'pass'(이용권 확인)는 뜬다", () => {
    window._cdSetCoinGateOverlay(true, "이용권 확인 중입니다.", "pass");
    assert.equal(overlayVisible(), true, "이용권 확인 화면이 뜨지 않았다");
  });
  window._cdSetCoinGateOverlay(false);
  for (const mode of ["pass-applied", "payment-complete", "payment-failed"]) {
    check(`'${mode}' 결과 표시는 뜬다`, () => {
      window._cdSetCoinGateOverlay(true, "결과", mode);
      assert.equal(overlayVisible(), true, `${mode} 결과 화면이 뜨지 않았다`);
      window._cdSetCoinGateOverlay(false);
    });
  }
}

// ── ⑧ 🔴 확인 '실패'를 '미커버'로 세탁하지 않는다 ──────────────────────────
// 2026-08-01 사고: 이용권 확인이 degrade/타임아웃으로 실패하면 그대로 상점으로 보냈다. 실제 보유자에게는
// "이미 가진 이용권을 또 사라"는 화면이고, 게다가 확인 전에 스냅샷을 지워 둬서 그 뒤 모든 유료 클릭의
// 낙관 즉시통과까지 죽었다. 실패는 모달을 열어 둔 채 재시도를 안내해야 한다.
console.log("\n[8] 이용권 확인이 실패하면 상점으로 보내지 않고 재시도를 안내하는가");
{
  const { window, storeUrls } = bootRuntime();
  let chargeModalCalls = 0;
  let settled = false;
  window.__cdOpenChargeModal = () => { chargeModalCalls += 1; };
  window.__cdApplyMembershipPassBeforePayment = async () => ({ status: "error", code: "PASS_STATUS_TEMPORARILY_UNAVAILABLE" });
  const choicePromise = openChoice(window).then((value) => { settled = true; return value; });
  const passCard = findCard(window, "pass-store");
  passCard.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await flush();
  check("이용권 상점으로 인계하지 않는다", () => assert.deepEqual(storeUrls, []));
  check("충전 모달도 열지 않는다", () => assert.equal(chargeModalCalls, 0));
  check("결제창이 닫히지 않는다(그 자리에서 다시 시도할 수 있어야 한다)", () => assert.equal(settled, false));
  check("재시도 안내 문구를 보여준다", () => {
    const status = window.document.querySelector("#cdStandalonePaymentChoice [data-payment-status]");
    assert.ok(status && status.textContent.trim(), "상태 문구가 비어 있다");
  });
  check("이용권 카드를 다시 누를 수 있다(비활성으로 굳지 않는다)", () => {
    assert.equal(findCard(window, "pass-store").hasAttribute("disabled"), false);
  });
  // 두 번째 클릭에서 커버가 확인되면 그대로 무료 통과한다 — 사용자가 요구한 구제 동작.
  window.__cdApplyMembershipPassBeforePayment = async () => ({ status: "pass_applied" });
  findCard(window, "pass-store").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  const retryChoice = await choicePromise;
  check("다시 누르면 이용권이 적용돼 'pass' 로 닫힌다", () => assert.equal(retryChoice, "pass"));
}

// ── 9. 재진입 직후 인증 복구가 끝난 뒤 final pass POST가 한 번만 나가는지 ──────────────────
console.log("\n[9] 인증 준비 완료 뒤 이용권 최종 판정이 한 번만 실행되는가");
{
  const { window, storeUrls } = bootRuntime();
  const calls = [];
  window.fetch = async (url, init = {}) => {
    const pathname = new URL(String(url), window.location.origin).pathname;
    if (pathname === "/api/auth/me") {
      calls.push({ pathname, init });
      return new Response(JSON.stringify({ ok: true, user: { id: "pass-auth-ready-user" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (pathname === "/api/billing/coin-gate") {
      calls.push({ pathname, init });
      const request = JSON.parse(String(init.body || "{}"));
      return new Response(JSON.stringify({
        ok: true,
        data: {
          accessType: "membership_pass",
          freeBySubscription: true,
          requestId: request.requestId,
        },
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: false }), { status: 404, headers: { "Content-Type": "application/json" } });
  };

  const choicePromise = openChoice(window);
  findCard(window, "pass-store").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  const choice = await choicePromise;
  const authIndex = calls.findIndex((call) => call.pathname === "/api/auth/me");
  const finalCalls = calls.filter((call) => call.pathname === "/api/billing/coin-gate");
  check("인증 준비 GET 뒤에 final MEMBERSHIP_PASS POST", () => {
    assert.ok(authIndex >= 0, "인증 준비 GET이 실행되지 않았습니다");
    assert.equal(finalCalls.length, 1, `final pass POST ${finalCalls.length}회`);
    assert.ok(calls.indexOf(finalCalls[0]) > authIndex, "인증 준비보다 final pass POST가 먼저 실행되었습니다");
    assert.equal(JSON.parse(String(finalCalls[0].init.body || "{}")).paymentMode, "MEMBERSHIP_PASS");
  });
  check("인증 복구 후 이용권 커버면 바로 무료 통과", () => assert.equal(choice, "pass"));
  check("인증 준비는 PG 주문을 만들지 않음", () => {
    assert.equal(calls.some((call) => call.pathname === "/api/billing/checkout"), false);
    assert.deepEqual(storeUrls, []);
  });
}

// ── 10. 확정 미인증(401)은 상점 이동이 아니라 기존 모달의 재시도 상태로 남는지 ──────────────
console.log("\n[10] 확정 미인증(401)이면 결제창을 유지하고 상점으로 보내지 않는가");
{
  const { window, storeUrls } = bootRuntime();
  const calls = [];
  let settled = false;
  window.fetch = async (url) => {
    const pathname = new URL(String(url), window.location.origin).pathname;
    calls.push(pathname);
    if (pathname === "/api/auth/me" || pathname === "/api/auth/refresh") {
      return new Response(JSON.stringify({ ok: false, error: { code: "AUTH_REQUIRED" } }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: false }), { status: 404, headers: { "Content-Type": "application/json" } });
  };
  const choicePromise = openChoice(window).then((value) => { settled = true; return value; });
  findCard(window, "pass-store").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await flush();
  await flush();
  check("확정 401은 final pass POST를 보내지 않음", () => assert.equal(calls.includes("/api/billing/coin-gate"), false));
  check("확정 401은 이용권 상점으로 이동하지 않음", () => assert.deepEqual(storeUrls, []));
  check("확정 401은 결제창을 유지하고 재시도할 수 있음", () => {
    assert.equal(settled, false);
    assert.equal(findCard(window, "pass-store").hasAttribute("disabled"), false);
  });
  findCard(window, "cancel")?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await choicePromise;
}

// ── 11. 🔴 인프라 블립(503)은 "미인증"이 아니다 ────────────────────────────────────────────────
// 프로덕션 사고의 직접 회귀 테스트. 로그인 상태(세션 흔적 있음)인데 /api/auth/me 가 503 을 뱉으면,
// 예전에는 인증 예열이 그 "모름"을 미인증으로 접어 final MEMBERSHIP_PASS POST 를 **아예 보내지
// 않고** "로그인 정보를 확인하지 못했어요"만 띄웠다. 서버(requireBillingAuth)는 401 과 503 을
// 이미 정확히 구분하므로, 클라이언트는 막지 말고 물어봐야 한다.
// 위 [10] 과 짝이다 — 저기는 **401(확정)** 이라 POST 를 보내지 않는 것이 맞고, 여기는 **503(미확정)**
// 이라 보내야 맞다. 두 케이스가 갈리는지가 이 가드의 요점이다.
console.log("\n[11] 인증 503(미확정) + 세션 흔적이면 이용권 최종 판정을 서버에 보내는가");
{
  const { window, storeUrls } = bootRuntime();
  // 로그인 흔적을 남긴다(HttpOnly 쿠키만 살아 있는 실제 웹 세션과 같은 모양).
  window.document.cookie = "fortune_auth_role=user";

  const calls = [];
  window.fetch = async (url) => {
    const pathname = new URL(String(url), window.location.origin).pathname;
    calls.push(pathname);
    if (pathname === "/api/auth/me" || pathname === "/api/auth/refresh") {
      return new Response(JSON.stringify({
        ok: false,
        code: "SERVICE_UNAVAILABLE",
        message: "일시적으로 확인하지 못했습니다.",
      }), { status: 503, headers: { "Content-Type": "application/json" } });
    }
    if (pathname === "/api/billing/coin-gate") {
      // 서버가 이용권 커버를 확인해 준다 = 보유자는 무료로 열려야 한다.
      return new Response(JSON.stringify({
        ok: true,
        data: {
          accessType: "membership_pass",
          freeBySubscription: true,
          chargedCoins: 0,
        },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ ok: false }), { status: 404, headers: { "Content-Type": "application/json" } });
  };

  const choicePromise = openChoice(window);
  findCard(window, "pass-store").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await flush();
  await flush();
  await flush();

  check("503 은 final MEMBERSHIP_PASS POST 를 막지 않는다", () => {
    assert.equal(calls.includes("/api/billing/coin-gate"), true);
  });
  check("503 을 이용권 미커버로 오인해 상점으로 보내지 않는다", () => assert.deepEqual(storeUrls, []));

  const outcome = await choicePromise;
  check("서버가 커버를 확인하면 무료 통과('pass')로 닫힌다", () => {
    assert.equal(outcome, "pass");
  });
}

if (failures.length) {
  console.error(`\n[verify-checkout-pass-card] FAIL (${failures.length})`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log("\n[verify-checkout-pass-card] PASS");
