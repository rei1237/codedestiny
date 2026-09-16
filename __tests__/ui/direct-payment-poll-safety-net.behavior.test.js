// PG 리다이렉트에 의존하지 않는 단건 결제 복귀 폴링 — jsdom 실행 검증.
//
// 배경(실측): PG 카드창 안의 간편결제(카카오페이 등)는 상위 프레임을 redirectUrl 로 돌려보내지
// 못하고 끝나는 경우가 있다. 그러면 requestPayment 의 await 가 영영 안 깨지고 쿼리 신호도 없어서,
// 결제는 승인됐는데 결제창을 연 화면이 아무 것도 하지 않는다 — 재조정 크론(최대 20분)이 유일한
// 구제였다. 그래서 결제창을 연 문서에서만 주문 상태를 직접 조회하는 안전망을 붙였다.
//
// 여기서 재는 것은 세 가지다: paid 를 보면 확정이 정확히 1회 돌 것, 승인 전에는 확정하지 않을 것,
// 앱(Capacitor) 런타임에서는 아예 돌지 않을 것.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const root = path.resolve(__dirname, "../..");
const profileJs = fs.readFileSync(path.join(root, "js/destiny-profile.js"), "utf8");
const checkoutEntryJs = fs.readFileSync(path.join(root, "js/core/checkout-entry.js"), "utf8");

const RESUME_KEY = "cd_direct_payment_resume";
const ORDER_ID = "ord_poll_1";
// 폴러의 간격(_DP_ORDER_POLL_INTERVAL_MS)보다 넉넉히 크게 잡아 최소 한 번은 돌게 한다.
const POLL_WAIT_MS = 5000;

function jsonResponse(body, status) {
  const text = JSON.stringify(body);
  const code = status || 200;
  const res = {
    ok: code >= 200 && code < 300,
    status: code,
    headers: { get: (k) => (String(k).toLowerCase() === "content-type" ? "application/json" : null) },
    json: () => Promise.resolve(JSON.parse(text)),
    text: () => Promise.resolve(text),
  };
  res.clone = () => res;
  return res;
}

/** 쿼리에 PG 신호가 하나도 없는 문서 — 리다이렉트가 오지 않은 상황 그대로다. */
function boot(options) {
  const opts = options || {};
  const dom = new JSDOM(
    '<!doctype html><html><body><main><a href="#" data-feature-key="neville-meditation">네빌 명상</a></main></body></html>',
    { url: "https://code-destiny.com/saju/basic", pretendToBeVisual: true, runScripts: "outside-only" },
  );
  const { window } = dom;
  if (typeof window.Headers === "undefined") window.Headers = Headers;
  if (typeof window.AbortController === "undefined") window.AbortController = AbortController;
  if (typeof window.CSS === "undefined") window.CSS = { escape: (s) => String(s) };

  const calls = { status: [], confirm: [], resumed: [] };
  window.alert = () => {};
  window._cdSetCoinGateOverlay = () => {};
  window.Element.prototype.scrollIntoView = function () {};
  window.CodeDestinyUserAccessCache = { refreshUserAccessAfterPayment: () => Promise.resolve() };
  window.fetch = (url, init) => {
    const target = String(url);
    if (/\/api\/payments\/orders\/[^/]+$/.test(target)) {
      calls.status.push(target);
      return Promise.resolve(jsonResponse({ ok: true, order: opts.order || { id: ORDER_ID, status: "ready" } }));
    }
    if (target.indexOf("/api/billing/confirm") >= 0) {
      calls.confirm.push(JSON.parse(String((init && init.body) || "{}")));
      if (opts.pendingOnce && calls.confirm.length === 1) return Promise.resolve(jsonResponse({ ok: true, code: 'GRANT_PENDING', recoveryRequired: true }));
      return Promise.resolve(jsonResponse({ ok: true, unlocked: true, featureKey: "neville-meditation" }));
    }
    return Promise.resolve(jsonResponse({ ok: true }));
  };

  if (opts.ticket !== null) {
    window.localStorage.setItem(RESUME_KEY, JSON.stringify({
      at: Date.now(),
      merchantUid: ORDER_ID,
      paymentMethod: "kakaopay",
      confirmBody: { featureKey: "neville-meditation", paymentMethod: "kakaopay", merchantUid: ORDER_ID },
      resume: { kind: "poll-fixture", action: "", args: {} },
    }));
  }

  window.eval(checkoutEntryJs);
  window.__cdCheckoutEntry.registerPaidResumeHandler("poll-fixture", () => { calls.resumed.push(Date.now()); return true; });
  if (typeof opts.beforeProfile === "function") opts.beforeProfile(window);
  window.eval(profileJs);
  // 리다이렉트 신호가 없으므로 부팅 시의 복귀 시도는 아무 것도 하지 않아야 한다(조용한 폴백은 60초 후).
  assert.equal(calls.confirm.length, 0, "PG 신호 없는 부팅이 곧바로 확정을 시도했다");
  return { window, calls };
}

async function waitFor(predicate, label, budgetMs) {
  const deadline = Date.now() + (budgetMs || 1000);
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  assert.fail(`${label}: ${budgetMs || 1000}ms 안에 조건이 참이 되지 않았다`);
}

test("리다이렉트가 오지 않아도 주문이 paid 가 되면 그 자리에서 확정·재개가 정확히 1회 돈다", async () => {
  const { window, calls } = boot({ order: { id: ORDER_ID, status: "paid", orderState: "PAID_VERIFIED" } });
  try {
    window.__cdDirectOrderPollHook.start(ORDER_ID);
    await waitFor(() => calls.resumed.length === 1, "poll resume", POLL_WAIT_MS);
    assert.equal(calls.confirm.length, 1);
    assert.equal(calls.confirm[0].merchantUid, ORDER_ID);
    // 🔴 확정 뒤에는 폴러가 물러난다 — 안 그러면 같은 주문을 반복 확정하려 든다.
    await new Promise((r) => setTimeout(r, 4000));
    assert.equal(calls.confirm.length, 1);
    assert.equal(calls.resumed.length, 1);
  } finally { window.close(); }
});

test("주문이 아직 승인 전이면 확정하지 않고 계속 지켜본다", async () => {
  const { window, calls } = boot({ order: { id: ORDER_ID, status: "ready", orderState: "READY" } });
  try {
    window.__cdDirectOrderPollHook.start(ORDER_ID);
    await waitFor(() => calls.status.length >= 1, "poll tick", POLL_WAIT_MS);
    assert.equal(calls.confirm.length, 0, "승인 전 주문을 확정하려 들었다");
    window.__cdDirectOrderPollHook.stop();
  } finally { window.close(); }
});

test("앱(Capacitor) 런타임에서는 폴링이 시작되지 않는다 — PortOne 경로 자체가 없다", async () => {
  const { window, calls } = boot({
    order: { id: ORDER_ID, status: "paid" },
    beforeProfile(win) { win.__cdCheckoutEntry.shouldUseAppStoreEntry = () => true; },
  });
  try {
    window.__cdDirectOrderPollHook.start(ORDER_ID);
    await new Promise((r) => setTimeout(r, 4000));
    assert.deepEqual(calls.status, []);
    assert.equal(calls.confirm.length, 0);
  } finally { window.close(); }
});

test("티켓이 사라졌으면(다른 경로가 이미 확정했다) 폴링이 조용히 멈춘다", async () => {
  const { window, calls } = boot({ order: { id: ORDER_ID, status: "paid" }, ticket: null });
  try {
    window.__cdDirectOrderPollHook.start(ORDER_ID);
    await new Promise((r) => setTimeout(r, 4000));
    assert.deepEqual(calls.status, []);
    assert.equal(calls.confirm.length, 0);
  } finally { window.close(); }
});

test('paid approval followed by GRANT_PENDING keeps polling until the same order opens', async () => {
  const { window, calls } = boot({ order: { status: 'paid' }, pendingOnce: true });
  try {
    window.__cdDirectOrderPollHook.start(ORDER_ID);
    await waitFor(() => calls.resumed.length === 1, 'pending delivery resumes', 9000);
    assert.equal(calls.confirm.length, 2);
    assert.ok(calls.confirm.every(body => body.merchantUid === ORDER_ID));
    assert.equal(calls.resumed.length, 1);
  } finally { window.close(); }
});

test('bfcache, visibility and online activation recover without browser back or duplicate execution', async () => {
  const { window, calls } = boot({ order: { status: 'paid' } });
  try {
    window.dispatchEvent(new window.PageTransitionEvent('pageshow', { persisted: true }));
    window.document.dispatchEvent(new window.Event('visibilitychange'));
    window.dispatchEvent(new window.Event('online'));
    await waitFor(() => calls.resumed.length === 1, 'activation delivery', POLL_WAIT_MS);
    assert.equal(calls.confirm.length, 1);
    assert.equal(calls.resumed.length, 1);
  } finally { window.close(); }
});
