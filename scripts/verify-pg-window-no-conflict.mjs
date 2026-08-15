/**
 * 독립 정적 단건 결제 코어(js/destiny-profile.js)의 "결제창이 안 뜬다" 회귀 가드 — jsdom 실행 검증.
 *
 * 🔴 왜 이 코어인가: **App Router 의 유료 기능 전체가 이 코어를 탄다.** React 는 결제창을 직접 몰지
 * 않고 window._cdRunDirectKrwCheckout 에 위임하는데(app/_lib/billing-client.ts), 셸이 없는 페이지에서
 * 그 함수를 까는 것이 이 파일이다. 그래서 셸(index.html)만 고친 수정은 이 경로에 도달하지 않았고,
 * 같은 증상이 반복됐다(#467·#471·#497).
 *
 * 문자열 단언으로는 "코드가 있다"까지밖에 못 본다. 여기서는 코어를 실제로 돌려 **결제창 호출까지
 * 도달하는지**와 그 앞의 실패·재시도 갈래가 정말 갈라지는지를 확인한다.
 *
 * 고정하는 성질:
 *   ① 실패 직후 1.8초 안에 다시 눌러도 **새 checkout 요청이 나간다**(옛 거절 프로미스 재생 금지).
 *   ② checkout 과 PortOne SDK 로드를 **동시에** 발사한다(SDK 가 임계경로에 얹히지 않는다).
 *   ③ requestPayment 가 실패해도 __cdSuppressPaymentUnloadBlock 이 true 로 남지 않는다.
 *   ④ 중복 paymentId → confirm 422 → **새 키로 1회** 재시도한다(셸과 같은 계약).
 *   ⑤ 409 IDEMPOTENCY_CONFLICT → 새 키로 1회 재시도하고 결제창까지 간다.
 *   ⑥ 결제창에서 단건을 고르면 세 카드가 모두 disabled 가 된다.
 *   ⑦ **결정적 requestId 만 주면 시도마다 다른 멱등키가 나간다**(2026-08-16).
 *   ⑧ 셸(index.html)의 게이트도 같은 성질을 갖는다 — 스코프를 재제안 루프 **바깥**에서 뽑는다.
 *
 * 🔴 mock 응답은 반드시 setTimeout 경유로 resolve 한다. 즉시(동일 마이크로태스크) resolve 는
 * in-flight/단일비행 창을 0폭으로 만들어, 실제로 존재하는 경쟁·데드락을 가린 채 통과시킨다
 * (scripts/verify-checkout-auth-recovery.mjs 머리주석, PR #470 데드락).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";
import { sliceFunction, stripComments } from "./lib/js-source-slice.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// 순서는 실제 독립 정적 페이지의 로드 순서다(__tests__/ui/payment-service.static.test.js 가 강제).
// payment-service.js 가 빠지면 게이트가 결제 경계 대신 폴백으로 새어 이 가드가 헛돈다.
const RUNTIME_FILES = [
  "js/core/payment-service.js",
  "js/core/pass-verdict.js",
  "js/core/checkout-entry.js",
  "js/destiny-profile.js",
];

const ORDER = {
  merchantUid: "cd0123456789abcdef0123456789abcdef012345",
  paymentAmount: 5000,
  amountKRW: 5000,
  coinPrice: 50,
  storeId: "store-test-1",
  channelKey: "channel-test-1",
  currency: "CURRENCY_KRW",
  customer: { fullName: "테스터", email: "buyer@example.com", phoneNumber: "01012345678" },
};

/** 🔴 정본 규율: 어떤 mock 도 즉시 resolve 하지 않는다. */
function later(value, ms = 5) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/* 🔴 진짜 Response 를 쓴다. 손으로 만든 봉투는 dp 의 fetch 래퍼(_dpFetchJsonWithFallback)가
   요구하는 표면을 다 갖추지 못해 **모든 응답이 "네트워크 오류"로 접히고**, 그러면 이 가드가
   409·422 분기를 한 번도 밟지 않은 채 통과한다(실제로 처음 작성했을 때 그랬다). */
function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const USER = { _id: "u1", name: "테스터", email: "buyer@example.com", phoneNumber: "01012345678" };
const DEFAULT_ROUTES = {
  "/api/auth/me": () => jsonResponse(200, { ok: true, user: USER, data: { user: USER } }),
  "/api/me/payment-phone": () => jsonResponse(200, { ok: true, data: { hasPhone: true, phoneNumber: "01012345678" } }),
};

/**
 * 라우트별 응답을 부르는 쪽에서 정한다. calls 에 순서대로 쌓이므로 "요청이 실제로 나갔는가"를
 * 개수로 단언할 수 있다 — 이 가드의 ①번이 정확히 그 질문이다.
 */
function bootRuntime({ routes = {}, portOne, checkoutDelayMs = 5 } = {}) {
  const calls = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", () => { /* 미구현 내비게이션은 관심사가 아니다 */ });

  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
    url: "https://code-destiny.com/celestial-harmony.html",
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole,
  });
  const { window } = dom;

  window.fetch = async (url, init) => {
    const href = String(url || "");
    const pathname = href.startsWith("http") ? new URL(href).pathname : href.split("?")[0];
    let body = null;
    try { body = init && init.body ? JSON.parse(String(init.body)) : null; } catch { body = null; }
    calls.push({ pathname, method: String((init && init.method) || "GET").toUpperCase(), body });
    // 이니시스 V2 는 구매자 이메일·번호를 요구한다. 그게 없으면 코어가 결제창 직전에 던져서
    // 이 가드가 재시도 갈래를 밟고도 "실패"로 읽힌다 — 정상 로그인 사용자와 같은 상태를 만든다.
    const handler = routes[pathname] || DEFAULT_ROUTES[pathname];
    const delay = pathname === "/api/billing/checkout" ? checkoutDelayMs : 5;
    if (typeof handler !== "function") return later(jsonResponse(503, { ok: false, code: "NOT_STUBBED" }), delay);
    const response = await later(handler(body, calls), delay);
    if (pathname === "/api/billing/checkout" && !timeline.checkoutResolvedAt) timeline.checkoutResolvedAt = Date.now();
    return response;
  };

  // SDK 스크립트 태그는 jsdom 이 실제로 받아오지 않는다. 로더가 삽입한 태그에 load 를 쏴 주고,
  // 그 시점을 기록해 checkout 과의 **동시성**을 관측한다(②번).
  const timeline = { sdkAppendedAt: 0, checkoutResolvedAt: 0 };
  const realAppendChild = window.document.head.appendChild.bind(window.document.head);
  window.document.head.appendChild = (node) => {
    const result = realAppendChild(node);
    if (node && node.id === "portone-v2-sdk") {
      if (!timeline.sdkAppendedAt) timeline.sdkAppendedAt = Date.now();
      setTimeout(() => {
        window.PortOne = portOne || { requestPayment: async () => later({ paymentId: ORDER.merchantUid }, 5) };
        try { node.dispatchEvent(new window.Event("load")); } catch { /* 무해 */ }
      }, 5);
    }
    return result;
  };

  for (const file of RUNTIME_FILES) {
    window.eval(fs.readFileSync(path.join(ROOT, file), "utf8"));
  }
  return { window, calls, timeline };
}

function runCheckout(window, overrides = {}) {
  return window._cdRunDirectKrwCheckout(Object.assign({
    featureKey: "saju-deep",
    title: "심층 사주 리포트",
    coinPrice: 50,
    cost: 50,
    amountKrw: 5000,
    requestId: "req-fixed-1",
    idempotencyKey: "req-fixed-1:a0",
    skipPassProbe: true,
    forceDirectPayment: true,
    internalMainGate: true,
    __cdPaymentGateAuthorized: true,
    __cdDirectPaymentChoiceConfirmed: true,
    checkoutPayload: { phoneNumber: "01012345678" },
  }, overrides));
}

const checkoutCalls = (calls) => calls.filter((c) => c.pathname === "/api/billing/checkout");
const flush = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms));

const failures = [];
async function check(label, fn) {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
  } catch (error) {
    failures.push(`${label}\n      ${String(error && error.message || error).split("\n")[0]}`);
    console.log(`  ✗ ${label}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message} (기대 ${JSON.stringify(expected)}, 실제 ${JSON.stringify(actual)})`);
}

console.log("[verify-pg-window-no-conflict] 독립 정적 단건 결제 코어");

/* ① 실패 직후 재클릭이 서버까지 도달한다 ─────────────────────────────────────────────
   단일비행 슬롯의 clear 는 1800ms 지연이라, 거절된 시도를 걷어내지 않으면 그 사이의 재클릭이
   서버 왕복 없이 옛 실패를 그대로 돌려받는다. 사용자에게는 "다시 눌러도 안 뜬다"로 보인다. */
await check("실패 직후 1.8초 안의 재클릭이 새 checkout 요청을 낸다", async () => {
  const { window, calls } = bootRuntime({
    routes: { "/api/billing/checkout": () => jsonResponse(503, { ok: false, code: "DB_UNAVAILABLE" }) },
  });
  await runCheckout(window).catch(() => {});
  const afterFirst = checkoutCalls(calls).length;
  assertEqual(afterFirst, 1, "첫 시도는 서버에 도달해야 한다");
  await flush(50); // 1800ms 지연 clear 안쪽 — 슬롯이 아직 살아 있는 창
  await runCheckout(window).catch(() => {});
  assertEqual(checkoutCalls(calls).length, 2, "재클릭이 새 요청을 내야 한다(옛 거절 프로미스 재생 금지)");
});

/* ①-b 게이트가 만든 시도별 키가 서버까지 간다 ────────────────────────────────────────
   🔴 이 코어는 opts.idempotencyKey 를 통째로 버리고 requestId 를 키로 썼다. requestId 는 게이트
   재제안 루프 전체에서 고정이라, 서버가 같은 주문(=같은 PortOne paymentId)을 멱등 반환하고 PortOne 이
   중복 paymentId 를 **결제창을 그리기 전에** 거절한다 — 셸은 이 순서를 고쳤는데 그 수정이 App Router
   유료 기능 전체가 타는 이 코어에는 도달하지 않았다. */
await check("게이트의 시도별 idempotencyKey 가 requestId 를 덮어 서버로 간다", async () => {
  const { window, calls } = bootRuntime({
    routes: { "/api/billing/checkout": () => jsonResponse(200, { ok: true, data: { order: ORDER } }) },
  });
  await runCheckout(window).catch(() => {});
  const sent = String((checkoutCalls(calls)[0] || {}).body?.idempotencyKey || "");
  assertEqual(sent, "req-fixed-1:a0", "시도별 키가 아니라 고정 requestId 가 나가면 매 클릭이 같은 주문이 된다");
});

/* ② SDK 를 checkout 과 동시에 받는다 ────────────────────────────────────────────────
   예전에는 checkout 응답을 기다린 뒤에야 SDK 를 로드해, 모달 열림 시점의 예열이 실패했거나
   늦으면 CDN 다운로드(상한 8초)가 통째로 클릭→결제창 구간에 얹혔다. */
await check("PortOne SDK 로드를 checkout 응답 전에 시작한다", async () => {
  // checkout 을 느리게 만들어 두 시점이 확실히 갈라지게 한다. 직렬이면 SDK 는 응답 뒤에야 시작한다.
  const { window, timeline } = bootRuntime({
    routes: {
      "/api/billing/checkout": () => jsonResponse(200, { ok: true, data: { order: ORDER } }),
      "/api/billing/confirm": () => jsonResponse(200, { ok: true, data: {} }),
    },
    checkoutDelayMs: 150,
  });
  await runCheckout(window).catch(() => {});
  if (!timeline.sdkAppendedAt) throw new Error("SDK 로더가 아예 돌지 않았다");
  if (!timeline.checkoutResolvedAt) throw new Error("checkout 응답이 관측되지 않았다");
  if (timeline.sdkAppendedAt >= timeline.checkoutResolvedAt) {
    throw new Error(`SDK 로드가 checkout 응답 뒤에 시작됐다(직렬) — sdk +${timeline.sdkAppendedAt - timeline.checkoutResolvedAt}ms`);
  }
});

/* ③ 억제 플래그가 새지 않는다 ──────────────────────────────────────────────────────
   requestPayment 가 던지면 복원 줄에 도달하지 못해 페이지 수명 내내 true 로 남고, 그 상태에서는
   PaymentProcessingContext 의 beforeunload 차단이 죽는다. */
await check("requestPayment 가 실패해도 __cdSuppressPaymentUnloadBlock 이 false 로 돌아온다", async () => {
  const { window } = bootRuntime({
    routes: { "/api/billing/checkout": () => jsonResponse(200, { ok: true, data: { order: ORDER } }) },
    portOne: { requestPayment: async () => { await later(null, 5); throw new Error("PG_WINDOW_BLOCKED"); } },
  });
  await runCheckout(window).catch(() => {});
  await flush(50);
  assertEqual(window.__cdSuppressPaymentUnloadBlock, false, "억제 플래그가 켜진 채로 남으면 안 된다");
});

/* ④ 중복 paymentId → confirm 422 → 새 키로 1회 재시도 ──────────────────────────────
   422 는 PG 가 "그 주문은 결제되지 않았다"고 확정한 것이라(worker/payments/pg.js) 돈이 나가지
   않았음이 확실하다. 이 갈래가 셸에만 있어서 독립 정적·App Router 는 자력 복구가 불가능했다. */
await check("중복 paymentId 뒤 confirm 422 이면 새 키로 1회 재시도한다", async () => {
  let confirmSeen = 0;
  const { window, calls } = bootRuntime({
    routes: {
      "/api/billing/checkout": () => jsonResponse(200, { ok: true, data: { order: ORDER } }),
      "/api/billing/confirm": () => {
        confirmSeen += 1;
        return confirmSeen === 1
          ? jsonResponse(422, { ok: false, code: "PG_PAYMENT_NOT_PAID", message: "결제되지 않은 주문입니다." })
          : jsonResponse(200, { ok: true, data: {} });
      },
    },
    portOne: {
      requestPayment: async () => later(
        confirmSeen === 0
          ? { code: "ALREADY_PAID", message: "이미 결제된 주문입니다." }
          : { paymentId: ORDER.merchantUid },
        5,
      ),
    },
  });
  await runCheckout(window).catch(() => {});
  await flush(80);
  const keys = checkoutCalls(calls).map((c) => String((c.body && c.body.idempotencyKey) || ""));
  if (keys.length < 2) throw new Error(`재시도 checkout 이 나가지 않았다(요청 ${keys.length}건)`);
  if (!/:r[0-9a-z]+$/.test(keys[1])) throw new Error(`재시도가 새 ':r' 키를 써야 한다(실제 ${keys[1]})`);
  if (keys[1] === keys[0]) throw new Error("재시도가 같은 키를 재사용했다 — 같은 주문·같은 paymentId 가 된다");
});

/* ⑤ 409 IDEMPOTENCY_CONFLICT 는 새 키 1회 재시도로 풀린다 ─────────────────────────
   서버가 이제 409 를 거의 내지 않지만(worker/payments/orders.js createPayableOrder), 세대 소진
   시의 fail-closed 경로가 남아 있으므로 이 안전망도 함께 살아 있어야 한다. */
await check("checkout 409 IDEMPOTENCY_CONFLICT 는 새 키로 재시도해 결제창까지 간다", async () => {
  let seen = 0;
  let requestPaymentCalls = 0;
  const { window, calls } = bootRuntime({
    routes: {
      "/api/billing/checkout": () => {
        seen += 1;
        return seen === 1
          ? jsonResponse(409, { ok: false, code: "IDEMPOTENCY_CONFLICT" })
          : jsonResponse(200, { ok: true, data: { order: ORDER } });
      },
      "/api/billing/confirm": () => jsonResponse(200, { ok: true, data: {} }),
    },
    portOne: { requestPayment: async () => { requestPaymentCalls += 1; return later({ paymentId: ORDER.merchantUid }, 5); } },
  });
  await runCheckout(window).catch(() => {});
  await flush(80);
  const keys = checkoutCalls(calls).map((c) => String((c.body && c.body.idempotencyKey) || ""));
  if (keys.length < 2) throw new Error(`409 뒤 재시도가 없었다(요청 ${keys.length}건)`);
  if (keys[1] === keys[0]) throw new Error("409 재시도가 같은 키를 재사용했다 — 영원히 같은 409 다");
  assertEqual(requestPaymentCalls, 1, "재시도 뒤 결제창 호출까지 도달해야 한다");
});

/* ⑥ 단건을 고르면 세 카드가 잠긴다 ────────────────────────────────────────────────
   finish() 의 settled 가 중복 실행은 막지만, 반응이 없어 보이면 사용자는 다시 누른다. */
await check("결제창에서 단건을 고르면 [data-mode] 카드가 모두 disabled 가 된다", async () => {
  const { window } = bootRuntime({ routes: {} });
  if (typeof window._cdChooseServicePaymentMode !== "function") throw new Error("독립 정적 결제창 렌더러가 없다");
  const pending = window._cdChooseServicePaymentMode({
    title: "심층 사주 리포트", featureKey: "saju-deep", coinPrice: 50, amountKrw: 5000, membershipCreditCost: 500,
  });
  pending.catch(() => {});
  const deadline = Date.now() + 3000;
  while (!window.document.querySelector('[data-mode="direct"]') && Date.now() < deadline) await flush(10);
  const direct = window.document.querySelector('[data-mode="direct"]');
  if (!direct) throw new Error("단건 카드가 렌더되지 않았다");
  const cards = Array.from(window.document.querySelectorAll("[data-mode]"));
  direct.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  const locked = cards.filter((node) => node.hasAttribute("disabled"));
  assertEqual(locked.length, cards.length, "고른 순간 모든 결제수단 카드가 잠겨야 한다");
});

/* ⑦ 결정적 requestId 만 줘도 시도마다 멱등키가 갈린다 ────────────────────────────────
   requestId 는 결정적이어야 하는 값이다(연타 디듀프·서버 증빙 조회). 그런데 그것을 그대로 멱등키로
   쓰면 서버 merchantUid 가 (userId, 멱등키) 순수 파생이라 영원히 같은 주문 문서를 가리키고, 그 문서가
   pending 을 벗어난 뒤부터 createPayableOrder 가 고정 세대를 태우다 409 를 낸다 — 사용자에게는
   "409 가 떴다가 회복되는데 결제창이 늦게 뜬다"로 보인다(회복이 checkout 왕복 하나를 더 쓴다). */
await check("결정적 requestId 만 넘겨도 시도마다 다른 idempotencyKey 가 나간다", async () => {
  // 503 으로 거절해 단일비행 슬롯을 rejected 로 만든다 — 안 그러면 두 번째 클릭이 1800ms 안에
  // 첫 시도의 resolved 슬롯에 합류해 서버까지 가지 않는다(①번이 고정하는 성질과 같은 이유).
  const { window, calls } = bootRuntime({
    routes: { "/api/billing/checkout": () => jsonResponse(503, { ok: false, code: "DB_UNAVAILABLE" }) },
  });
  // 숙요점·사주 AI 상담이 실제로 넘기는 형태 — 프로필·연도 파생이라 영구 고정이다.
  const fixed = { requestId: "sukuyo-yearly:profile-1:2026", idempotencyKey: undefined };
  await runCheckout(window, fixed).catch(() => {});
  await flush(40);
  await runCheckout(window, fixed).catch(() => {});
  await flush(40);
  const keys = checkoutCalls(calls).map((c) => String((c.body && c.body.idempotencyKey) || ""));
  if (keys.length < 2) throw new Error(`두 번째 시도가 서버에 도달하지 않았다(요청 ${keys.length}건)`);
  for (const key of keys) {
    if (!key.startsWith("sukuyo-yearly:profile-1:2026")) {
      throw new Error(`requestId 를 키의 뿌리로 유지해야 한다(실제 ${key})`);
    }
  }
  if (keys[0] === keys[1]) {
    throw new Error(`고정 requestId 가 그대로 멱등키가 됐다 — 세대 소진 뒤 영구 409 다(${keys[0]})`);
  }
});

/* ⑧ 셸 게이트도 같은 성질을 갖는다 ────────────────────────────────────────────────
   셸(index.html)은 40k 줄 인라인이라 여기서 통째로 구동하지 않는다. 대신 게이트 본문을 중괄호 균형으로
   잘라 **스코프를 재제안 루프 바깥에서 뽑는지**를 본다 — 루프 안에서 뽑으면 회차마다 값이 달라져
   같은 시도의 더블클릭이 서로 다른 주문이 되고, 아예 없으면 게이트 재진입마다 'R:a0' 이 반복된다.
   🔴 결정적 requestId 를 넘기는 호출부는 실제로 셸 전용 번들에만 있다(js/saju-engine*.js). */
await check("셸 게이트가 멱등키 스코프를 재제안 루프 바깥에서 뽑는다", () => {
  const shell = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const gate = stripComments(sliceFunction(shell, "async function _cdOpenPaidServiceGate(options) {", "셸 게이트"));
  const scopeAt = gate.indexOf("_cdGateAttemptScope =");
  const loopAt = gate.indexOf("for (var _cdGateAttempt");
  const keyAt = gate.indexOf("_cdAttemptIdempotencyKey =");
  if (scopeAt < 0) throw new Error("게이트 진입 스코프(_cdGateAttemptScope)가 없다");
  if (loopAt < 0) throw new Error("재제안 루프를 찾지 못했다 — 마커가 바뀌었으면 이 가드를 함께 고칠 것");
  if (keyAt < 0) throw new Error("_cdAttemptIdempotencyKey 대입을 찾지 못했다");
  if (scopeAt > loopAt) throw new Error("스코프를 루프 안에서 뽑으면 같은 시도의 더블클릭이 다른 주문이 된다");
  const keyLine = gate.slice(keyAt, gate.indexOf("\n", keyAt));
  if (!keyLine.includes("_cdGateAttemptScope")) {
    throw new Error(`멱등키가 스코프를 쓰지 않는다 — 게이트 재진입마다 같은 키다(실제 ${keyLine.trim()})`);
  }
});

/* ⑨ 결제창을 거치지 않은 단건 실행은 코어가 물리적으로 거절한다 ────────────────────────
   결제 정책 4번(단건은 사용자가 결제창에서 '단건'을 고른 뒤에만 실행)을 셸은 하드 스로우로 강제하는데
   이 코어에는 없어서, 이 함수를 직접 부르면 결제창 없이 주문이 나갔다. App Router 유료 기능 전체가
   타는 코어라 그 구멍이 더 넓다. */
await check("결제창 선택 확인 없이 부르면 checkout 이 나가지 않는다", async () => {
  const { window, calls } = bootRuntime({
    routes: { "/api/billing/checkout": () => jsonResponse(200, { ok: true, data: { order: ORDER } }) },
  });
  let threw = false;
  await runCheckout(window, { __cdDirectPaymentChoiceConfirmed: false }).catch(() => { threw = true; });
  await flush(40);
  if (!threw) throw new Error("결제창 확인 없이도 통과했다");
  assertEqual(checkoutCalls(calls).length, 0, "결제창을 거치지 않았는데 주문이 나갔다");
});

if (failures.length) {
  console.error(`\n[verify-pg-window-no-conflict] 실패 ${failures.length}건`);
  for (const failure of failures) console.error(`  · ${failure}`);
  process.exit(1);
}
console.log("[verify-pg-window-no-conflict] PASS");
