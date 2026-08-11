// 결제 POST(주문 발급 /api/billing/checkout · 확정 /api/billing/confirm)의 401 리프레시 복구 계약을
// 문자열 마커가 아니라 **실행으로** 검증한다(fetchJsonWithAuth 본문을 중괄호 균형으로 잘라 구동).
//
// 배경(2026-08-12 라이브 증상): 액세스·리프레시 세션이 모두 죽은 사용자가 단건 결제를 누르면
// checkout POST 가 401 로 즉사했다 — 401 복구(리프레시→같은 요청 1회 재전송)가 GET/HEAD 전용이라
// 결제 POST 는 복구 시도조차 없었고, 로그인 재유도도 없어 "로그인돼 보이는데 결제만 안 됨"이 됐다.
// 수정: checkout·confirm 두 경로만 화이트리스트로 복구를 열고(서버 멱등이 이중 주문을 차단),
// 복구까지 실패한 확정 401 은 로그인 모달로 종단한다. coin-gate(월정석 차감)는 제외 — 그 경로는
// POST 이전의 세션 사전검사가 복구를 담당한다(중첩 금지 원칙).
//
// 🔴 mock 응답은 반드시 setTimeout 경유로 resolve 한다. 즉시(동일 마이크로태스크) resolve 는
// in-flight/단일비행 창을 0폭으로 만들어, 실제로 존재하는 경쟁·데드락을 가린 채 통과시킨다
// (PR #470 데드락은 즉시-resolve 하네스였다면 영영 재현되지 않았다).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sliceFunction } from "./lib/js-source-slice.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(path.join(root, rel), "utf8");

const SHELL_FILES = [
  "index.html",
  "public/index.html",
  "public/en/index.html",
  "public/ja/index.html",
  "public/zh/index.html",
  "public/zh-tw/index.html",
  "public/static/index.html",
];
const DP_FILES = ["js/destiny-profile.js", "public/js/destiny-profile.js"];

// ── 1. 미러 패리티: 7셸 + dp 2부가 같은 계약을 갖는다 ─────────────────────────
for (const file of SHELL_FILES) {
  const src = read(file);
  assert.ok(
    src.includes("var isAuthRecoverableCheckoutPost = normalizedMethod === 'POST'"),
    `${file}: 401 복구 화이트리스트 변수가 없다`,
  );
  assert.ok(
    src.includes("if (response.status === 401 && (normalizedMethod === 'GET' || normalizedMethod === 'HEAD' || isAuthRecoverableCheckoutPost))"),
    `${file}: 401 복구 조건이 화이트리스트를 포함하지 않는다`,
  );
  assert.ok(
    src.includes("function _cdHandleDirectCheckoutAuthFailure(error)"),
    `${file}: 확정 401 로그인 모달 헬퍼가 없다`,
  );
  assert.ok(
    src.includes("throw _cdHandleDirectCheckoutAuthFailure(_cdDirectCheckoutError);"),
    `${file}: 단일비행 래퍼가 확정 401 을 로그인 헬퍼로 종단하지 않는다`,
  );
}
for (const file of DP_FILES) {
  const src = read(file);
  assert.ok(
    src.includes("}, { retryOn401: true, refreshOn401: true });"),
    `${file}: dp checkout 이 401 복구 옵트인을 갖지 않는다`,
  );
  assert.ok(
    src.includes("{ method: 'POST', body: dpConfirmBody }, { retryOn401: true, refreshOn401: true })"),
    `${file}: dp confirm 이 401 복구 옵트인을 갖지 않는다`,
  );
  assert.ok(
    src.includes("{ method: 'POST', body: dpResumeBody }, { retryOn401: true, refreshOn401: true })"),
    `${file}: dp 리다이렉트 복귀 confirm 이 401 복구 옵트인을 갖지 않는다`,
  );
}

// ── 2. 실행 하네스: index.html 의 fetchJsonWithAuth 를 실제로 구동 ─────────────
const indexSource = read("index.html");
const fetchSrc = sliceFunction(indexSource, "  async function fetchJsonWithAuth(path, init) {", "fetchJsonWithAuth");

const MOCK_DELAY_MS = 40; // 🔴 0 금지 — 파일 상단 주석 참고

function buildHarness(routeHandler) {
  const calls = [];
  const spies = { revalidations: 0 };
  async function fetchWithTimeout(url, init, _timeoutMs) {
    const record = {
      url: String(url),
      method: String((init && init.method) || "GET").toUpperCase(),
      body: init && init.body,
      idempotencyKey: init && init.headers && typeof init.headers.get === "function"
        ? init.headers.get("Idempotency-Key")
        : null,
    };
    calls.push(record);
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
    const spec = routeHandler(record, calls);
    return {
      ok: spec.status >= 200 && spec.status < 300,
      status: spec.status,
      headers: new Headers({ "Content-Type": "application/json" }),
      json: async () => spec.payload,
      text: async () => JSON.stringify(spec.payload),
    };
  }
  const factory = new Function(
    "window",
    "fetchWithTimeout",
    "getApiBaseCandidatesForPath",
    "joinApiPathWithBase",
    "shouldApplyApiCooldown",
    "readApiCooldown",
    "markApiCooldown",
    "clearApiCooldown",
    "normalizeApiPolicyPath",
    "shouldDedupeApiGet",
    "readCachedApiResult",
    "rememberApiResult",
    "rememberSuccessfulApiBase",
    "_cdApiInFlightGetRequests",
    "readJsonOrTextPayload",
    "_cdHandleSubscriptionSnapshotServerSignal",
    "_cdScheduleSessionRevalidation",
    "__cdPersistAuthUserSnapshot",
    `return (${fetchSrc});`,
  );
  const fetchJsonWithAuth = factory(
    { location: { pathname: "/", search: "" } },
    fetchWithTimeout,
    () => [""],
    (_base, p) => p,
    () => false,
    () => 0,
    () => {},
    () => {},
    (p) => p,
    () => false,
    () => null,
    () => {},
    () => {},
    {},
    async (response) => ({ payload: await response.json(), parsed: true, text: "" }),
    () => {},
    () => { spies.revalidations += 1; },
    () => {},
  );
  return { fetchJsonWithAuth, calls, spies };
}

const countBy = (calls, url) => calls.filter((c) => c.url === url).length;

// T1 — checkout 401 → refresh 성공 → 같은 body·같은 Idempotency-Key 로 정확히 1회 재전송 → 성공
{
  const { fetchJsonWithAuth, calls } = buildHarness((record, all) => {
    if (record.url === "/api/auth/refresh") return { status: 200, payload: { ok: true } };
    if (record.url === "/api/billing/checkout") {
      const nth = all.filter((c) => c.url === record.url).length;
      return nth === 1
        ? { status: 401, payload: { code: "AUTH_REQUIRED", message: "로그인이 필요합니다." } }
        : { status: 201, payload: { ok: true, order: { merchantUid: "m-1", paymentAmount: 5000 } } };
    }
    throw new Error(`unexpected url: ${record.url}`);
  });
  const body = JSON.stringify({ featureKey: "test-feature", idempotencyKey: "key-t1" });
  const res = await fetchJsonWithAuth("/api/billing/checkout", {
    method: "POST",
    headers: { "Idempotency-Key": "key-t1" },
    body,
  });
  assert.equal(res.ok, true, "T1: 복구 후 결과는 성공이어야 한다");
  const checkoutCalls = calls.filter((c) => c.url === "/api/billing/checkout");
  assert.equal(checkoutCalls.length, 2, "T1: checkout POST 는 정확히 2회(원본+복구 1회)");
  assert.equal(countBy(calls, "/api/auth/refresh"), 1, "T1: refresh 는 정확히 1회");
  assert.equal(checkoutCalls[0].body, checkoutCalls[1].body, "T1: 재전송 body 는 원본과 동일해야 한다(멱등 근거)");
  assert.equal(checkoutCalls[0].idempotencyKey, "key-t1", "T1: 원본 Idempotency-Key");
  assert.equal(checkoutCalls[1].idempotencyKey, "key-t1", "T1: 재전송 Idempotency-Key 동일(새 주문 발급 금지)");
}

// T2 — checkout 401 → refresh 실패 → 재전송 없이 401 확정 + 세션 재검증 예약
{
  const { fetchJsonWithAuth, calls, spies } = buildHarness((record) => {
    if (record.url === "/api/auth/refresh") return { status: 401, payload: { ok: false } };
    if (record.url === "/api/billing/checkout") return { status: 401, payload: { code: "AUTH_REQUIRED" } };
    throw new Error(`unexpected url: ${record.url}`);
  });
  const res = await fetchJsonWithAuth("/api/billing/checkout", {
    method: "POST",
    headers: { "Idempotency-Key": "key-t2" },
    body: JSON.stringify({ idempotencyKey: "key-t2" }),
  });
  assert.equal(res.ok, false, "T2: 결과는 실패");
  assert.equal(res.status, 401, "T2: 401 이 그대로 표면화");
  assert.equal(countBy(calls, "/api/billing/checkout"), 1, "T2: 리프레시 실패 시 결제 POST 맹목 재전송 금지");
  assert.equal(spies.revalidations, 1, "T2: 세션 재검증이 예약돼야 한다");
}

// T3 — 정책 부정: coin-gate 401 은 refresh 0회·재전송 0회 (화이트리스트 밖)
{
  const { fetchJsonWithAuth, calls } = buildHarness((record) => {
    if (record.url === "/api/billing/coin-gate") return { status: 401, payload: { code: "AUTH_REQUIRED" } };
    if (record.url === "/api/auth/refresh") return { status: 200, payload: { ok: true } };
    throw new Error(`unexpected url: ${record.url}`);
  });
  const res = await fetchJsonWithAuth("/api/billing/coin-gate", {
    method: "POST",
    body: JSON.stringify({ paymentMode: "MOONLIGHT_STONE" }),
  });
  assert.equal(res.status, 401, "T3: coin-gate 401 은 그대로");
  assert.equal(countBy(calls, "/api/billing/coin-gate"), 1, "T3: coin-gate 는 재전송 금지(차감 경로)");
  assert.equal(countBy(calls, "/api/auth/refresh"), 0, "T3: coin-gate 401 은 fetch 계층 리프레시 금지");
}

// T4 — confirm 401 → refresh 성공 → 같은 body 재전송 → 성공 (승인 후 지급 확정은 재시도가 의무)
{
  const { fetchJsonWithAuth, calls } = buildHarness((record, all) => {
    if (record.url === "/api/auth/refresh") return { status: 200, payload: { ok: true } };
    if (record.url === "/api/billing/confirm") {
      const nth = all.filter((c) => c.url === record.url).length;
      return nth === 1
        ? { status: 401, payload: { code: "AUTH_REQUIRED" } }
        : { status: 200, payload: { ok: true, alreadyUnlocked: false } };
    }
    throw new Error(`unexpected url: ${record.url}`);
  });
  const body = JSON.stringify({ merchantUid: "m-1", impUid: "imp-1", paymentId: "imp-1" });
  const res = await fetchJsonWithAuth("/api/billing/confirm", { method: "POST", body });
  assert.equal(res.ok, true, "T4: confirm 복구 성공");
  const confirmCalls = calls.filter((c) => c.url === "/api/billing/confirm");
  assert.equal(confirmCalls.length, 2, "T4: confirm 은 원본+복구 1회");
  assert.equal(confirmCalls[0].body, confirmCalls[1].body, "T4: confirm 재전송 body 동일(서버 멱등 전제)");
}

// ── 3. 확정 401 종단 UX: _cdHandleDirectCheckoutAuthFailure 픽스처 ─────────────
{
  const helperSrc = sliceFunction(indexSource, "  function _cdHandleDirectCheckoutAuthFailure(error) {", "_cdHandleDirectCheckoutAuthFailure");
  const modalCalls = [];
  const windowStub = {
    __cdOpenLoginRequiredModal: (opts) => { modalCalls.push(opts); return true; },
    location: { pathname: "/saju", search: "?tab=deep" },
  };
  const helper = new Function("window", `return (${helperSrc});`)(windowStub);

  const authError = Object.assign(new Error("로그인이 필요합니다."), { status: 401, code: "AUTH_REQUIRED" });
  const returned = helper(authError);
  assert.equal(returned, authError, "종단 헬퍼는 같은 에러를 돌려준다");
  assert.equal(modalCalls.length, 1, "확정 401 은 로그인 모달을 정확히 1회 연다");
  assert.equal(modalCalls[0].reason, "direct_checkout_401", "모달 reason 은 direct_checkout_401");
  assert.equal(modalCalls[0].nextPath, "/saju?tab=deep", "로그인 후 원래 화면으로 복귀해야 한다");
  assert.ok(authError.message.includes("로그인이 만료"), "메시지가 로그인 만료 안내로 교체돼야 한다");
  assert.equal(authError.__cdLoginPromptShown, true, "1회 가드 플래그가 서야 한다");
  helper(authError);
  assert.equal(modalCalls.length, 1, "같은 에러로 두 번 열리지 않는다(재제안 루프 무한 모달 방지)");

  const serverError = Object.assign(new Error("잠시 후 다시 시도해 주세요."), { status: 503, code: "SERVICE_UNAVAILABLE" });
  helper(serverError);
  assert.equal(modalCalls.length, 1, "503 은 로그인 모달 대상이 아니다");
  assert.ok(!serverError.__cdLoginPromptShown, "503 에러는 건드리지 않는다");

  const cancelError = Object.assign(new Error("결제를 취소했습니다."), { __cdPaymentAborted: true, code: "PAYMENT_CANCELLED" });
  helper(cancelError);
  assert.equal(modalCalls.length, 1, "사용자 취소는 로그인 모달 대상이 아니다");

  const codeOnlyError = Object.assign(new Error("x"), { code: "TOKEN_EXPIRED" });
  helper(codeOnlyError);
  assert.equal(modalCalls.length, 2, "status 없이 코드만 있어도(TOKEN_EXPIRED) 모달을 연다");
}

// ── 4. 단일비행 회귀(PR #470): 합류는 유지, 내부 재시도 바이패스도 유지 ────────
{
  const sfSrc = sliceFunction(indexSource, "  function _cdJoinPaidServiceSingleFlight(slotName, key, ttlMs, producer, opts) {", "_cdJoinPaidServiceSingleFlight");
  const windowStub = { setTimeout: (fn, ms) => setTimeout(fn, ms) };
  const joinSingleFlight = new Function("window", `return (${sfSrc});`)(windowStub);

  let producerRuns = 0;
  const producer = () => new Promise((resolve) => {
    producerRuns += 1;
    setTimeout(() => resolve(`run-${producerRuns}`), 120); // 실제 in-flight 창을 만든다
  });

  const first = joinSingleFlight("__cdTestSlot", "k", 60000, producer);
  const joined = joinSingleFlight("__cdTestSlot", "k", 60000, producer);
  assert.equal(await first, await joined, "같은 키 동시 진입은 같은 promise 에 합류(더블클릭 방어)");
  assert.equal(producerRuns, 1, "합류 시 producer 는 1회만 실행");

  const retryPromise = joinSingleFlight("__cdTestSlot", "k", 60000, producer, { __cdIdempotencyConflictRetry: true });
  await retryPromise;
  assert.equal(producerRuns, 2, "내부 재시도 플래그는 자기 슬롯에 합류하지 않고 새로 실행(데드락 방지)");
}

console.log("verify-checkout-auth-recovery: OK — 미러 패리티(7셸+dp2) · 401 복구 T1-T4 · 종단 모달 픽스처 · 단일비행 회귀 모두 통과");
