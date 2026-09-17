/**
 * PG 리다이렉트로 돌아온 새 문서는 항상 "인증 미확정(user 없음) → 저장된 계정 복원" 을 거친다.
 * 그 복원을 계정 전환으로 취급하면 결제 직후 이어받기가 스스로 취소돼 사용자가 "지금 열기" 를
 * 직접 눌러야 했다. 복원은 통과시키고, 확정 이후의 전환·로그아웃·언마운트는 계속 무효화한다.
 *
 * 훅 소스를 그대로 트랜스파일해 가짜 react·auth-store 위에서 돌린다 — 네트워크 0건.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const SOURCE = readFileSync(resolve(__dirname, "..", "..", "app/hooks/usePaidDeliveryScope.ts"), "utf8");

function mount(initial, options = { survivesAuthRestore: true }) {
  let state = { user: null, authReady: false, ...initial };
  const listeners = new Set();
  const cleanups = [];
  const react = {
    useRef: value => ({ current: value }),
    useCallback: fn => fn,
    useEffect: fn => { const cleanup = fn(); if (cleanup) cleanups.push(cleanup); },
  };
  const store = {
    getAuthState: () => state,
    subscribeAuth: listener => { listeners.add(listener); return () => listeners.delete(listener); },
  };
  const { outputText } = ts.transpileModule(SOURCE, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  const sandboxModule = { exports: {} };
  const requireStub = name => (name === "react" ? react : name === "@/app/_lib/auth-store" ? store : assert.fail(name));
  vm.runInNewContext(outputText, { module: sandboxModule, exports: sandboxModule.exports, require: requireStub, String });
  let resets = 0;
  const scope = sandboxModule.exports.usePaidDeliveryScope(() => { resets += 1; }, options);
  return {
    scope,
    resets: () => resets,
    set(partial) { state = { ...state, ...partial }; for (const listener of [...listeners]) listener(); },
    unmount() { for (const cleanup of cleanups) cleanup(); },
  };
}

test("auth restoring the saved account after a PG redirect keeps the in-flight resume current", () => {
  const page = mount();
  const isCurrent = page.scope();
  page.set({ user: { id: "buyer" }, authReady: true });
  assert.equal(isCurrent(), true);
  assert.equal(page.resets(), 0);
  assert.equal(page.scope()(), true);
});

test("after auth is resolved, switching accounts or logging out still invalidates", () => {
  const page = mount({ user: { id: "buyer" }, authReady: true });
  const isCurrent = page.scope();
  page.set({ user: { id: "other" } });
  assert.equal(isCurrent(), false);
  assert.equal(page.resets(), 1);

  const guest = mount({ authReady: true });
  const guestCurrent = guest.scope();
  guest.set({ user: { id: "buyer" } });
  assert.equal(guestCurrent(), false);
  assert.equal(guest.resets(), 1);
});

test("restored account switching away later still invalidates work captured before restore", () => {
  const page = mount();
  const isCurrent = page.scope();
  page.set({ user: { id: "buyer" }, authReady: true });
  page.set({ user: null });
  assert.equal(isCurrent(), false);
  assert.equal(page.resets(), 1);
});

test("refresh flow (user first, authReady next) is also a restore, and only the first one", () => {
  const page = mount();
  const isCurrent = page.scope();
  page.set({ user: { id: "buyer" } });
  page.set({ authReady: true });
  assert.equal(isCurrent(), true);
  assert.equal(page.resets(), 0);
});

test("screens that did not opt in keep treating the restore as an account change", () => {
  const page = mount({}, {});
  const isCurrent = page.scope();
  page.set({ user: { id: "buyer" }, authReady: true });
  assert.equal(isCurrent(), false);
  assert.equal(page.resets(), 1);
});

test("unmount invalidates", () => {
  const page = mount({ user: { id: "buyer" }, authReady: true });
  const isCurrent = page.scope();
  page.unmount();
  assert.equal(isCurrent(), false);
});
