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
  assert.match(passBranch, /_cdSetCoinGateOverlay\(true, passCheckingText, 'pass'\)/);
  assert.match(passBranch, /await _cdWaitForPaymentOverlayPaint\(\)/);
  assert.match(passBranch, /_cdSetCoinGateOverlay\(false\)/);
});

test("pass-first payment modal does not start a parallel monthly balance probe", () => {
  const modalTailStart = shellSource.indexOf("window.__cdDirectPaymentChoiceActive = { modal: modal");
  const modalTailEnd = shellSource.indexOf("    });\n  }", modalTailStart);
  assert.ok(modalTailStart >= 0 && modalTailEnd > modalTailStart);
  const modalTail = shellSource.slice(modalTailStart, modalTailEnd);
  assert.match(modalTail, /if \(allowMonthlyChoice && !allowPassChoice && !monthlyBalanceFresh\)/);
  assert.match(modalTail, /refreshDirectMonthlyBalance\(\{ silent: true \}\)/);
});

test("automatic balance reads reuse the access snapshot and do not append timestamps", () => {
  assert.match(shellSource, /function _cdApplyFreshAccessStoreBalances\(\)/);
  assert.doesNotMatch(shellSource, /\/api\/billing\/balance[^'\"]*[?&]_=/);
});
