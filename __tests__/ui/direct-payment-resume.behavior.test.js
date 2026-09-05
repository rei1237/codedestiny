// 단건 결제 리다이렉트 복귀(모바일·카카오페이 새 탭) 재개 — jsdom 실행 검증.
//
// 배경: 모바일은 모든 수단이 상위 창 리다이렉트로 돌아오고, 유일한 재개 코드가
// js/destiny-profile.js 의 _dpResumeDirectPaymentAfterRedirect 다. 2026-09-05 이전에는
//   (1) 대기 오버레이 mode 'confirm' 이 허용목록에 없어 조용히 안 떴고
//   (2) "콘텐츠를 여는 중" 문구를 띄우고는 아무것도 열지 않았고
//   (3) access-state 60초 스냅샷을 무효화하지 않아 방금 산 기능이 잠긴 채 보였고
//   (4) URL 에 PG 파라미터가 남아 새로고침마다 confirm 이 재실행됐고
//   (5) GRANT_PENDING(200+code) 을 "결제 완료"로 표시했다.
// 정적 문자열 가드는 scripts/verify-direct-confirm-pending-recovery.mjs 가 맡고, 여기서는 실제로
// 실행해 호출 횟수·저장소·URL·이벤트를 잰다.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

const root = path.resolve(__dirname, "../..");
const profileJs = fs.readFileSync(path.join(root, "js/destiny-profile.js"), "utf8");
const checkoutEntryJs = fs.readFileSync(path.join(root, "js/core/checkout-entry.js"), "utf8");

const RESUME_KEY = "cd_direct_payment_resume";

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

/**
 * dp 는 eval 시점에 resume 을 곧바로 시작하므로(__cdDirectPaymentResumeStarted) 케이스마다
 * 새 JSDOM 을 만든다. confirm 응답과 복귀 URL 만 케이스별로 바꾼다.
 */
function boot(options) {
  const opts = options || {};
  const dom = new JSDOM(
    '<!doctype html><html><body><main><a href="#" data-feature-key="neville-meditation">네빌 명상</a></main></body></html>',
    { url: opts.url, pretendToBeVisual: true, runScripts: "outside-only" },
  );
  const { window } = dom;
  // jsdom 이 비워 두는 브라우저 API 를 Node 전역으로 채운다(dp 의 fetch 폴백이 Headers 를 만든다).
  if (typeof window.Headers === "undefined") window.Headers = Headers;
  if (typeof window.AbortController === "undefined") window.AbortController = AbortController;
  if (typeof window.CSS === "undefined") window.CSS = { escape: (s) => String(s) };

  const calls = { confirm: [], report: [], alert: [], overlay: [], refresh: 0, scroll: 0, events: [] };
  window.Element.prototype.scrollIntoView = function () { calls.scroll += 1; };
  window.alert = (msg) => { calls.alert.push(String(msg)); };
  window._cdSetCoinGateOverlay = (open, message, mode) => { calls.overlay.push({ open: !!open, message: String(message || ""), mode: String(mode || "") }); };
  window.CodeDestinyUserAccessCache = {
    refreshUserAccessAfterPayment: () => { calls.refresh += 1; return Promise.resolve(); },
  };
  window.addEventListener("cd:direct-payment-resumed", (event) => { calls.events.push(event.detail); });
  window.fetch = (url, init) => {
    const target = String(url);
    if (target.indexOf("/api/billing/confirm") >= 0) {
      calls.confirm.push({ url: target, body: JSON.parse(String((init && init.body) || "{}")) });
      return Promise.resolve(opts.confirmResponse ? opts.confirmResponse() : jsonResponse({ ok: true }));
    }
    if (target.indexOf("/api/payments/report-failure") >= 0) {
      calls.report.push(JSON.parse(String((init && init.body) || "{}")));
      return Promise.resolve(jsonResponse({ ok: true }));
    }
    return Promise.resolve(jsonResponse({ ok: true }));
  };

  if (opts.ticket !== null) {
    window.localStorage.setItem(RESUME_KEY, JSON.stringify(Object.assign({
      at: Date.now(),
      merchantUid: "ord_1",
      paymentMethod: "kakaopay",
      confirmBody: { featureKey: "neville-meditation", paymentMethod: "kakaopay", merchantUid: "ord_1" },
    }, opts.ticket || {})));
  }

  window.eval(checkoutEntryJs);
  assert.ok(window.__cdCheckoutEntry, "checkout-entry 가 window.__cdCheckoutEntry 로 등록되지 않았다");
  window.eval(profileJs);
  assert.equal(window.__cdDirectPaymentResumeStarted, true, "dp 가 복귀 재개를 시작하지 않았다");
  return { window, calls };
}

// resume 은 fetch → 파싱 → 후처리가 여러 마이크로/매크로태스크에 걸쳐 있다. 조건이 참이 될 때까지
// 짧게 기다리되 상한을 둬서 실패가 행으로 끝나지 않게 한다.
async function waitFor(predicate, label) {
  for (let i = 0; i < 200; i += 1) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, 5));
  }
  assert.fail(`${label}: 1초 안에 조건이 참이 되지 않았다`);
}

test("성공 복귀: confirm 1회 → 티켓 회수 → access 갱신 1회 → URL 정리(해시 보존) → 완료 안내·카드 강조·이벤트", async () => {
  const { window, calls } = boot({
    url: "https://code-destiny.com/?portone_redirect=1&paymentId=ord_1&transactionType=PAYMENT&txId=tx_1&keep=1#tab",
    confirmResponse: () => jsonResponse({ ok: true, unlocked: true, featureKey: "neville-meditation" }),
  });
  try {
    await waitFor(() => calls.events.length === 1, "복귀 성공 이벤트");

    assert.equal(calls.confirm.length, 1, "confirm 은 정확히 1회");
    assert.equal(calls.confirm[0].body.merchantUid, "ord_1");
    assert.equal(calls.confirm[0].body.paymentId, "ord_1");
    assert.equal(calls.confirm[0].body.paymentMethod, "kakaopay", "티켓의 confirmBody 가 그대로 실린다");
    assert.equal(calls.refresh, 1, "access-state 60초 스냅샷 무효화는 1회");
    assert.equal(calls.alert.length, 0, "성공에 alert 없음");
    assert.equal(window.localStorage.getItem(RESUME_KEY), null, "성공 뒤 티켓은 회수된다");

    const search = window.location.search;
    assert.doesNotMatch(search, /portone_redirect|paymentId|transactionType|txId/, `PG 파라미터가 남았다: ${search}`);
    assert.match(search, /keep=1/, "무관한 쿼리는 보존한다");
    assert.equal(window.location.hash, "#tab", "해시를 보존한다");

    // 대기는 'unlock-saving'(3렌더러 공통 허용), 완료는 'payment-complete'. 둘 다 수단 이름을 끼운다.
    const modes = calls.overlay.filter((c) => c.open).map((c) => c.mode);
    assert.deepEqual(modes, ["unlock-saving", "payment-complete"], JSON.stringify(calls.overlay));
    assert.match(calls.overlay[0].message, /카카오페이/, "대기 문구에 수단 이름");
    assert.doesNotMatch(calls.overlay[0].message, /자동으로 돌아옵니다/, "복귀 단계에 '돌아옵니다' 문구 금지");
    const complete = calls.overlay.find((c) => c.mode === "payment-complete");
    assert.match(complete.message, /카카오페이 결제가 확인되었습니다/);
    assert.doesNotMatch(complete.message, /여는 중/, "아무것도 안 열면서 '여는 중' 을 말하면 거짓 안내");

    assert.equal(calls.scroll, 1, "결제한 카드로 스크롤");
    assert.equal(calls.events[0].featureKey, "neville-meditation");
    assert.equal(calls.events[0].paymentMethod, "kakaopay");
    assert.equal(calls.events[0].paymentId, "ord_1");
    assert.ok(calls.events[0].tile, "이벤트에 카드 노드가 실린다");
  } finally {
    window.close();
  }
});

test("GRANT_PENDING(200+code): 실패도 완료도 아니다 — 티켓·URL 유지, access 갱신 0회, alert 0회", async () => {
  const { window, calls } = boot({
    url: "https://code-destiny.com/?portone_redirect=1&paymentId=ord_1",
    confirmResponse: () => jsonResponse({ code: "GRANT_PENDING", recoveryRequired: true, message: "결제는 승인되었고 반영을 기다리고 있어요.", pollUrl: "/api/billing/orders/ord_1" }),
  });
  try {
    await waitFor(() => calls.overlay.filter((c) => c.open && c.mode === "unlock-saving").length >= 2, "PENDING 안내 오버레이");

    assert.equal(calls.confirm.length, 1);
    assert.equal(calls.refresh, 0, "열람 권한이 아직 없으니 access 갱신을 부르지 않는다");
    assert.equal(calls.alert.length, 0, "PENDING 은 alert 로 닫지 않는다");
    assert.equal(calls.events.length, 0, "성공 이벤트 없음");
    assert.ok(window.localStorage.getItem(RESUME_KEY), "티켓을 남겨 새로고침이 멱등 재시도가 되게 한다");
    assert.match(window.location.search, /portone_redirect=1/, "URL 도 그대로 둔다");
    const pendingNotice = calls.overlay.filter((c) => c.open && c.mode === "unlock-saving").pop();
    assert.match(pendingNotice.message, /승인되었고 반영을 기다리고/, "서버 message 를 그대로 보여 준다");
    assert.equal(calls.overlay.some((c) => c.mode === "payment-complete"), false, "완료 스킨 금지");
  } finally {
    window.close();
  }
});

test("PG 거절 복귀(code 있음): confirm 0회, 수단 이름+코드가 든 alert 1회, 티켓 회수, URL 정리, 실패 보고", async () => {
  const { window, calls } = boot({
    url: "https://code-destiny.com/?portone_redirect=1&paymentId=ord_1&code=FAILURE_TYPE_PG_PROVIDER&message=",
  });
  try {
    await waitFor(() => calls.alert.length === 1, "실패 alert");

    assert.equal(calls.confirm.length, 0, "거절 복귀는 confirm 을 부르지 않는다");
    assert.equal(calls.refresh, 0);
    assert.match(calls.alert[0], /카카오페이 결제가 완료되지 않았습니다/);
    assert.match(calls.alert[0], /FAILURE_TYPE_PG_PROVIDER/, "코드는 고객 문의의 유일한 단서다");
    assert.equal(window.localStorage.getItem(RESUME_KEY), null, "승인 안 된 복귀는 티켓을 회수한다");
    assert.doesNotMatch(window.location.search, /portone_redirect|code=/, "새로고침마다 같은 alert 가 뜨지 않게 URL 을 정리한다");
    await waitFor(() => calls.report.length === 1, "report-failure");
    assert.equal(calls.report[0].code, "FAILURE_TYPE_PG_PROVIDER");
    assert.equal(calls.report[0].stage, "pg_redirect_return");
  } finally {
    window.close();
  }
});

test("티켓 없는 새 탭 복귀: 쿼리 paymentId 만으로 confirm 하고 Generic 문구를 쓴다", async () => {
  const { window, calls } = boot({
    url: "https://code-destiny.com/?portone_redirect=1&paymentId=ord_9",
    ticket: null,
    confirmResponse: () => jsonResponse({ ok: true, unlocked: true }),
  });
  try {
    await waitFor(() => calls.events.length === 1, "복귀 성공 이벤트");
    assert.equal(calls.confirm.length, 1);
    assert.equal(calls.confirm[0].body.merchantUid, "ord_9");
    assert.equal(calls.refresh, 1);
    const complete = calls.overlay.find((c) => c.mode === "payment-complete");
    assert.match(complete.message, /^결제가 확인되었습니다/, "수단을 모르면 Generic 판");
    assert.equal(calls.scroll, 0, "featureKey 를 모르니 카드 강조는 건너뛴다");
    assert.equal(calls.events[0].paymentMethod, "");
  } finally {
    window.close();
  }
});
