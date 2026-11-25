// 셸 결제 게이트 브리지 재진입 — 모바일 지연 마운트가 open/update 를 감싼 뒤에도 셸 자신에게
// 되돌려 보내지 않는지 실제 함수로 잰다.
//
// 배경(2026-11-26 실측): mobile-home-lazy-mount 의 wrapMethod 가 window.__cdPaidFeatureGate.open 을
// 감싸면 `bridge.open === _cdOpenPaidFeatureGate` 동일성 검사가 깨져, 셸 update → forward → 감싼 셸
// update 로 무한 재귀했다. 412px 에서 결제 성공 직후 화면이 멈추고 탭이 죽었다. 지금은 셸 브리지
// 객체의 __cdShellPaidFeatureGate 표식으로 가린다.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const shell = fs.readFileSync(path.join(root, "index.html"), "utf8");

function extractFunction(signature) {
  const start = shell.indexOf(signature);
  assert.ok(start > 0, `index.html 에서 ${signature} 를 찾지 못했다`);
  const end = shell.indexOf("\n  }\n", start);
  assert.ok(end > start, `${signature} 의 끝을 찾지 못했다`);
  return shell.slice(start, end + "\n  }".length);
}

const forwardSrc = extractFunction("function _cdForwardPaidFeatureGateToReact(action, detail) {");
const wrapSrc = extractFunction("function wrapMethod(obj, name, ids) {");

function boot() {
  const calls = { shellUpdate: 0, shellHold: 0, reactUpdate: 0, mounts: 0 };
  const sandbox = { window: {}, calls };
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  vm.runInContext(`
    var marker = 'mobile-home-lazy-mount-test';
    function mountMany() { calls.mounts++; }
    ${forwardSrc}
    ${wrapSrc}
    function _cdOpenPaidFeatureGate() { _cdForwardPaidFeatureGateToReact('open', {}); }
    function _cdUpdatePaidFeatureGate(o) {
      calls.shellUpdate++;
      if (calls.shellUpdate > 50) throw new Error('recursion');
      if (_cdForwardPaidFeatureGateToReact('update', o)) return;
    }
    window.__cdPaidFeatureGate = {
      __cdShellPaidFeatureGate: true,
      open: _cdOpenPaidFeatureGate,
      update: _cdUpdatePaidFeatureGate,
      holdOpen: function (id, ms) {
        calls.shellHold++;
        if (calls.shellHold > 50) throw new Error('recursion');
        if (_cdForwardPaidFeatureGateToReact('hold', { requestId: id, maxMs: ms })) return;
      },
      preload: function () {}
    };
    this.forward = _cdForwardPaidFeatureGateToReact;
    this.wrapMethod = wrapMethod;
  `, sandbox);
  return sandbox;
}

test("모바일 지연 마운트가 감싼 셸 브리지로 update 해도 셸에 한 번만 들어온다", () => {
  const s = boot();
  const bridge = s.window.__cdPaidFeatureGate;
  ["open", "update", "preload"].forEach((name) => assert.equal(s.wrapMethod(bridge, name, ["sajuLoaderOverlay"]), true));
  assert.notEqual(bridge.open.name, "_cdOpenPaidFeatureGate", "감싼 뒤 동일성 검사는 더는 셸을 알아보지 못한다");
  bridge.update({ status: "savingUnlock" });
  assert.equal(s.calls.shellUpdate, 1);
  bridge.holdOpen("req-1", 1000);
  assert.equal(s.calls.shellHold, 1);
  assert.equal(s.forward("release", { requestId: "req-1" }), false);
});

test("React 브리지가 자리를 넘겨받으면 그대로 전달한다", () => {
  const s = boot();
  s.window.__cdPaidFeatureGate = { update() { s.calls.reactUpdate++; }, open() {} };
  assert.equal(s.forward("update", { status: "savingUnlock" }), true);
  assert.equal(s.calls.reactUpdate, 1);
});
