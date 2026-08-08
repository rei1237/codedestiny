/**
 * 결제창 '이용권으로 구매' 이용권 확인의 degraded-503 재시도 가드 (jsdom 실행 검증).
 *
 * 배경: coin-gate 가 워커-DB 일시 장애로 503(PASS_STATUS_TEMPORARILY_UNAVAILABLE 등)을 내면
 * 예전에는 결제창이 그대로 "이용권 상태를 확인하지 못했습니다. 잠시 후 다시 눌러 주세요."로 끝나
 * 이용권 보유자가 직접 다시 눌러야 했다. 이 확인은 과금이 아니므로(MEMBERSHIP_PASS, 커버는 무료)
 * degraded 일 때만 동일 requestId 로 1회 재요청한다.
 *
 * 고정하는 성질:
 *   ① degraded-503 뒤 재시도가 성공하면 사용자는 무료 통과(pass_applied)를 받는다.
 *   ② 재시도는 **정확히 1회**다(무한 루프·과다 재시도 금지).
 *   ③ 재시도는 **같은 requestId** 를 쓴다 — 서버 멱등 마커가 중복 소비를 막는 근거다.
 *   ④ 402(미커버)는 확정 응답이라 재시도하지 않는다 — 상점 인계가 늦어지면 안 된다.
 *   ⑤ 429(레이트리밋)는 재시도하지 않는다 — 다시 물어도 같은 답이고 상한만 더 태운다.
 *   ⑥ 🔴 월정석/단건 등 **과금이 일어나는** coin-gate POST 는 재시도하지 않는다.
 *
 * 실제 모델·결제·서버 호출은 없다. fetchJsonWithAuth 를 통째로 mock 한다.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RUNTIME_FILES = ["js/core/pass-verdict.js", "js/core/checkout-entry.js", "js/destiny-profile.js"];

const GRANTED = { ok: true, status: 200, payload: { data: { freeBySubscription: true, consume: { accessType: "membership_pass" } } } };
const DEGRADED_503 = { ok: false, status: 503, payload: { code: "PASS_STATUS_TEMPORARILY_UNAVAILABLE", degraded: true } };
const EVIDENCE_503 = { ok: false, status: 503, payload: { code: "PAID_ACCESS_VERIFY_RETRYABLE", retryable: true } };
const NOT_COVERED_402 = { ok: false, status: 402, payload: { code: "MEMBERSHIP_PASS_NOT_COVERED" } };
const RATE_LIMITED_429 = { ok: false, status: 429, payload: { code: "RATE_LIMITED" } };

/**
 * @param {Array<object>} coinGateResponses 순서대로 돌려줄 coin-gate 응답들. 소진되면 마지막 값을 반복한다.
 */
function bootRuntime(coinGateResponses) {
  const coinGateCalls = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", () => { /* 미구현 내비게이션 경고는 이 가드의 관심사가 아니다 */ });

  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
    url: "https://code-destiny.com/fusion-fortune",
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole,
  });
  const { window } = dom;

  // 로그인 흔적. _dpPrepareMembershipPassAuth 가 이 힌트로 통과해야 coin-gate 까지 도달한다.
  window.document.cookie = "fortune_auth_role=user";

  // 유일한 네트워크 표면. 실제 서버·결제·모델 호출은 일어나지 않는다.
  window.fetchJsonWithAuth = async (pathname, init) => {
    const url = String(pathname || "");
    if (url.indexOf("/api/billing/coin-gate") === 0) {
      let body = {};
      try { body = JSON.parse(String(init?.body || "{}")); } catch (_) { body = {}; }
      coinGateCalls.push({ requestId: body.requestId, paymentMode: body.paymentMode });
      const next = coinGateResponses[Math.min(coinGateCalls.length - 1, coinGateResponses.length - 1)];
      return next;
    }
    // 인증 확인 등 나머지는 "확인됨"으로 답해 게이트가 coin-gate 까지 흐르게 한다.
    return { ok: true, status: 200, payload: { ok: true, isLoggedIn: true, user: { id: "u1" } } };
  };

  for (const file of RUNTIME_FILES) {
    window.eval(fs.readFileSync(path.join(ROOT, file), "utf8"));
  }
  assert.equal(typeof window.__cdApplyMembershipPassBeforePayment, "function", "이용권 확인 런타임이 설치되어야 한다");
  return { window, coinGateCalls };
}

function applyPass(window, overrides = {}) {
  return window.__cdApplyMembershipPassBeforePayment(Object.assign({
    title: "초융합 운세 상담",
    featureKey: "fusion-fortune-consultation",
    coinPrice: 300,
    amountKRW: 30000,
    requestId: "fusion-fortune-consultation:verify-1",
  }, overrides));
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

// ── ① degraded-503 → 재시도 성공 시 무료 통과 ─────────────────────────────
console.log("\n[1] degraded-503 뒤 재시도가 성공하면 이용권으로 무료 통과하는가");
{
  const { window, coinGateCalls } = bootRuntime([DEGRADED_503, GRANTED]);
  const result = await applyPass(window);
  check("무료 통과(pass_applied)", () => assert.equal(result.status, "pass_applied"));
  check("coin-gate 를 2회 호출(최초 + 재시도 1회)", () => assert.equal(coinGateCalls.length, 2));
  check("재시도가 같은 requestId 를 쓴다(서버 멱등 마커 근거)", () => {
    assert.equal(coinGateCalls[0].requestId, coinGateCalls[1].requestId);
    assert.equal(coinGateCalls[0].requestId, "fusion-fortune-consultation:verify-1");
  });
  check("두 호출 모두 MEMBERSHIP_PASS(과금 없는 확인)", () => {
    for (const call of coinGateCalls) assert.equal(call.paymentMode, "MEMBERSHIP_PASS");
  });
}

// ── ② 재시도는 정확히 1회 ────────────────────────────────────────────────
console.log("\n[2] 계속 degraded 여도 재시도가 1회에서 멈추는가");
{
  const { window, coinGateCalls } = bootRuntime([DEGRADED_503]);
  const result = await applyPass(window);
  check("coin-gate 총 2회(최초 + 재시도 1회)에서 멈춘다", () => assert.equal(coinGateCalls.length, 2));
  check("결과는 error 로 남아 결제창이 그대로 유지된다", () => assert.equal(result.status, "error"));
  check("미커버(payment_required)로 세탁하지 않는다", () => assert.notEqual(result.status, "payment_required"));
}

// ── ③ PAID_ACCESS_VERIFY_RETRYABLE(family 이용권 기록 지연) 도 재시도 대상 ──
console.log("\n[3] PAID_ACCESS_VERIFY_RETRYABLE 503 도 재시도하는가");
{
  const { window, coinGateCalls } = bootRuntime([EVIDENCE_503, GRANTED]);
  const result = await applyPass(window);
  check("재시도 후 무료 통과", () => assert.equal(result.status, "pass_applied"));
  check("coin-gate 2회", () => assert.equal(coinGateCalls.length, 2));
}

// ── ④ 402 는 확정 응답 — 재시도 금지 ─────────────────────────────────────
console.log("\n[4] 402(미커버)를 재시도하지 않고 곧바로 상점 인계로 넘기는가");
{
  const { window, coinGateCalls } = bootRuntime([NOT_COVERED_402, GRANTED]);
  const result = await applyPass(window);
  check("payment_required 로 즉시 반환", () => assert.equal(result.status, "payment_required"));
  check("coin-gate 1회만 호출(재시도 없음)", () => assert.equal(coinGateCalls.length, 1));
}

// ── ⑤ 429 는 재시도 금지 ─────────────────────────────────────────────────
console.log("\n[5] 429(레이트리밋)를 재시도하지 않는가");
{
  const { window, coinGateCalls } = bootRuntime([RATE_LIMITED_429, GRANTED]);
  const result = await applyPass(window);
  check("coin-gate 1회만 호출(상한을 더 태우지 않는다)", () => assert.equal(coinGateCalls.length, 1));
  check("error 로 남는다(미커버 세탁 금지)", () => assert.equal(result.status, "error"));
}

// ── ⑥ 🔴 첫 시도가 곧바로 성공하면 재시도하지 않는다 ────────────────────
console.log("\n[6] 정상 응답에는 추가 왕복이 없는가");
{
  const { window, coinGateCalls } = bootRuntime([GRANTED]);
  const result = await applyPass(window);
  check("무료 통과", () => assert.equal(result.status, "pass_applied"));
  check("coin-gate 1회", () => assert.equal(coinGateCalls.length, 1));
}

// ── ⑦ 🔴 과금 경로에는 재시도가 번지지 않는다 ───────────────────────────
// 런타임에 노출되지 않는 함수라 클릭으로는 확인할 수 없다. 대신 함수 본문을 **중괄호 균형으로 잘라**
// 재시도 장치가 무과금 확인 함수 안에만 있는지 본다(이름 grep 만으로 판단하지 않는다 — CLAUDE.md 규칙 6).
console.log("\n[7] 재시도 장치가 과금 경로(월정석 소비)로 번지지 않았는가");
{
  const source = fs.readFileSync(path.join(ROOT, "js/destiny-profile.js"), "utf8");

  function functionBody(name) {
    const signature = `function ${name}(`;
    const start = source.indexOf(signature);
    assert.notEqual(start, -1, `${name} 을 찾지 못했다`);
    const open = source.indexOf("{", start);
    let depth = 0;
    for (let i = open; i < source.length; i += 1) {
      if (source[i] === "{") depth += 1;
      else if (source[i] === "}") {
        depth -= 1;
        if (depth === 0) return source.slice(open, i + 1);
      }
    }
    throw new Error(`${name} 의 본문이 닫히지 않았다`);
  }

  const passCheckBody = functionBody("_dpApplyMembershipPassBeforePayment");
  const monthlyBody = functionBody("_dpRunMonthlyCreditFromMainGate");

  check("무과금 이용권 확인에는 재시도가 있다", () => {
    assert.ok(passCheckBody.includes("passCheckMaxAttempts"), "재시도 상한이 없다");
    assert.ok(passCheckBody.includes("passCheckRetryable"), "재시도 판정이 없다");
  });
  check("월정석 소비(과금)에는 재시도가 없다", () => {
    assert.ok(!monthlyBody.includes("passCheckMaxAttempts"), "과금 경로에 재시도가 번졌다");
    assert.ok(!/for\s*\(|while\s*\(/.test(monthlyBody), "과금 경로에 재시도 루프가 생겼다");
  });
  check("재시도는 새 requestId 를 만들지 않는다(멱등 보존)", () => {
    const loopStart = passCheckBody.indexOf("for (var passAttempt");
    assert.notEqual(loopStart, -1, "재시도 루프를 찾지 못했다");
    const loopBody = passCheckBody.slice(loopStart);
    assert.ok(!/requestId\s*=\s*(?!requestId)/.test(loopBody), "루프 안에서 requestId 를 재생성한다");
  });
}

console.log("");
if (failures.length) {
  console.error(`이용권 확인 재시도 가드 실패 ${failures.length}건:`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log("이용권 확인 degraded-503 재시도 가드 통과.");
