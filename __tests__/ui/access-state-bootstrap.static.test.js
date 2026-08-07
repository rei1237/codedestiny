const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const sessionSource = fs.readFileSync(path.join(root, "app/_lib/user-session-cache.ts"), "utf8");
const authSource = fs.readFileSync(path.join(root, "app/_lib/auth-client.ts"), "utf8");
const authStoreSource = fs.readFileSync(path.join(root, "app/_lib/auth-store.ts"), "utf8");
const shellSource = fs.readFileSync(path.join(root, "index.html"), "utf8");

test("React bootstrap requests access-state before legacy fallback endpoints", () => {
  assert.match(sessionSource, /authFetch\("\/api\/me\/access-state"/);
  assert.match(sessionSource, /accessStatus !== 404 && accessStatus !== 405/);
  assert.match(sessionSource, /applyAccessStateToGlobalStore\(accessData\)/);
  assert.match(sessionSource, /const ensureLoadInFlight = new Map<string, Promise<UserAccessSnapshot>>\(\);/);
  assert.match(sessionSource, /if \(accessSupported\) return getUserAccessSnapshot\(\);/);
  const bootstrapSource = sessionSource.slice(
    sessionSource.indexOf("async function ensureUserAccessLoadedUncached"),
    sessionSource.indexOf("export async function ensureUserAccessLoaded"),
  );
  assert.doesNotMatch(bootstrapSource, /fetch\("\/api\/auth\/me"/);
});

test("auth client deduplicates safe access GET endpoints but does not generalize POST retries", () => {
  assert.match(authSource, /"\/api\/me\/access-state"/);
  assert.match(authSource, /const authGetInFlight = new Map<string, Promise<Response>>\(\);/);
  assert.match(authSource, /if \(method !== "GET"\) return "";/);
  assert.match(authSource, /const sharedInit = init\.signal \? \{ \.\.\.init, signal: undefined \} : init;/);
  assert.match(authSource, /withCallerAbort\(pending, init\.signal \?\? undefined\)/);
});

test("post-login bootstrap hydrates the shared AccessStore instead of creating another entitlement owner", () => {
  assert.match(authStoreSource, /CodeDestinyAccessStore/);
  assert.match(authStoreSource, /applyAccessStateSnapshot\?\.\(data/);
  assert.match(authStoreSource, /reason: "post-login-bootstrap"/);
});

test("static shell bootstrap uses access-state and keeps legacy calls as compatibility fallback", () => {
  assert.match(shellSource, /var accessStateUrl = '\/api\/me\/access-state' \+ \(opts\.includeGuardian === true \? '\?include=guardian' : ''\)/);
  assert.match(shellSource, /fetch\(accessStateUrl, init\)/);
  assert.match(shellSource, /if \(!hasClientAuthHint\(\)\) return Promise\.resolve\(snapshot\)/);
  assert.match(shellSource, /accessResponse.status !== 404 && accessResponse.status !== 405/);
  const bootstrapSource = shellSource.slice(
    shellSource.indexOf("function ensureLoaded(options)"),
    shellSource.indexOf("window.fetch = fetchWithCache"),
  );
  assert.doesNotMatch(bootstrapSource, /fetch\('\/api\/auth\/me'/);
  assert.match(shellSource, /_cdIsAuthRequiredBillingError\(primary\.status, primary\.payload\)/);
  assert.match(shellSource, /String\(lastPayload\.completeness \|\| ''\)\.toLowerCase\(\) === 'full'/);
});

test("static membership command prepares auth once and never replays the same POST after 401", () => {
  const passCommand = shellSource.slice(
    shellSource.indexOf("var passApplyRequest"),
    shellSource.indexOf("var code =", shellSource.indexOf("var passApplyRequest")),
  );
  assert.match(passCommand, /fetchJsonWithAuth\('\/api\/billing\/coin-gate', passApplyRequest\)/);
  assert.equal((passCommand.match(/fetchJsonWithAuth\('\/api\/billing\/coin-gate'/g) || []).length, 1);
  assert.doesNotMatch(passCommand, /verifyAuthSessionForCoinApi/);
});

test("pass card click paints the pass wait overlay before entitlement lookup", () => {
  const passBranchStart = shellSource.indexOf("if (mode === 'pass-store' || mode === 'pass')");
  const passBranchEnd = shellSource.indexOf("if (mode === 'direct' || mode === 'monthly')", passBranchStart);
  assert.ok(passBranchStart >= 0 && passBranchEnd > passBranchStart);
  const passBranch = shellSource.slice(passBranchStart, passBranchEnd);
  assert.match(passBranch, /var passCheckingText = _cdPaymentI18n\(/);
  // 🔴 예전에는 여기서 _cdSetCoinGateOverlay(true, …, 'pass') 리터럴만 확인했다. 그런데 그 호출은
  // _cdPaymentWaitUiBlocked 의 조건 ②(결제수단 선택 모달이 떠 있는 동안 대기 화면 금지)에 걸려
  // **한 번도 그려지지 않았다** — 모달은 확인이 끝난 뒤에야 닫히기 때문이다. 그래서 이 테스트는
  // 꽃돼지 대기 UI 가 통째로 사라진 채로도 계속 통과했다. 이제 그 ②를 통과하는 유일한 통로인
  // 헬퍼를 쓰는지, 그리고 그 통로가 실제로 판정에 존재하는지까지 함께 본다.
  assert.match(passBranch, /_cdShowPassCheckWaitOverlay\(passCheckingText\)/);
  assert.match(passBranch, /await _cdWaitForPaymentOverlayPaint\(\)/);
  assert.match(passBranch, /_cdSetCoinGateOverlay\(false\)/);
});

test("the pass wait overlay is not silently blocked by the payment-choice modal check", () => {
  // 헬퍼는 플래그를 켠 채로만 오버레이를 연다(단건 gap 오버레이와 같은 패턴).
  assert.match(shellSource, /var _cdPassCheckAllowOwnOverlay = false;/);
  assert.match(
    shellSource,
    /function _cdShowPassCheckWaitOverlay\(message\) \{\s*_cdPassCheckAllowOwnOverlay = true;/,
  );
  // 판정 안에 통로가 있어야 하고, 그 통로는 ②보다 앞·④(허용목록)보다 뒤여야 한다.
  const verdictStart = shellSource.indexOf("function _cdPaymentWaitUiBlocked(mode) {");
  const verdictEnd = shellSource.indexOf("window.__cdPaymentWaitUiBlocked", verdictStart);
  assert.ok(verdictStart >= 0 && verdictEnd > verdictStart);
  const verdict = shellSource.slice(verdictStart, verdictEnd);
  const allowlistAt = verdict.indexOf("CD_WAIT_UI_ALLOWED_MODE_RE.test");
  const bypassAt = verdict.indexOf("if (_cdPassCheckAllowOwnOverlay) return _cdDirectPgWindowSuppressedMode(mode);");
  const choiceModalAt = verdict.indexOf("if (_cdPaymentChoiceModalOpen()");
  assert.ok(allowlistAt >= 0 && bypassAt >= 0 && choiceModalAt >= 0);
  assert.ok(allowlistAt < bypassAt, "allowlist (④) must still run before the pass bypass");
  assert.ok(bypassAt < choiceModalAt, "the pass bypass must run before the payment-choice-modal block (②)");
  // 🔴 통로는 PG 결제창 구간(③)까지 뚫어서는 안 된다 — 그래서 return 값이 그 판정 자체다.
  assert.match(verdict, /if \(_cdPassCheckAllowOwnOverlay\) return _cdDirectPgWindowSuppressedMode\(mode\);/);
});

test("pass-first payment modal does not start a parallel monthly balance probe", () => {
  const modalTailStart = shellSource.indexOf("window.__cdDirectPaymentChoiceActive = { modal: modal");
  const modalTailEnd = shellSource.indexOf("    });\n  }", modalTailStart);
  assert.ok(modalTailStart >= 0 && modalTailEnd > modalTailStart);
  const modalTail = shellSource.slice(modalTailStart, modalTailEnd);
  assert.match(modalTail, /if \(allowMonthlyChoice && !allowPassChoice && !monthlyBalanceFresh\)/);
  assert.match(modalTail, /refreshDirectMonthlyBalance\(\{ silent: true \}\)/);
});

test("home header renders cached identity without starting auth or subscription probes", () => {
  const headerDecisionStart = shellSource.indexOf("if (!isAdm) {\n                var recentSubscriptionStatus");
  const headerDecisionEnd = shellSource.indexOf("          window.__cdUpdateAuthState = __cdAuthState;", headerDecisionStart);
  assert.ok(headerDecisionStart >= 0 && headerDecisionEnd > headerDecisionStart);
  const headerDecision = shellSource.slice(headerDecisionStart, headerDecisionEnd);
  assert.match(headerDecision, /__cdResolveAuthCardFromCurrentUser\(p\)/);
  assert.doesNotMatch(headerDecision, /__cdSyncSubscription\(p\)/);
  assert.doesNotMatch(headerDecision, /__cdSyncAuthMe\(p\)/);
  assert.doesNotMatch(headerDecision, /__cdScheduleSubscriptionRetry\(/);
});

test("automatic balance reads reuse the access snapshot and do not append timestamps", () => {
  assert.match(shellSource, /function _cdApplyFreshAccessStoreBalances\(\)/);
  assert.doesNotMatch(shellSource, /\/api\/billing\/balance[^'\"]*[?&]_=/);
});
