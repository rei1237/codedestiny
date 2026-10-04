const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

// 클래스로만 보였다 숨는 막. 그 밖의 오버레이는 인라인 display 로 열고 닫는다.
const CLASS_DRIVEN = { tarotFocusOverlay: "active" };

function makeNode(id, display, classes) {
  const set = new Set(classes || []);
  const attrs = {};
  return {
    id,
    style: { display: display || "", visibility: "", pointerEvents: "" },
    classList: {
      add: (c) => set.add(c),
      remove: (c) => set.delete(c),
      contains: (c) => set.has(c),
    },
    setAttribute: (k, v) => { attrs[k] = String(v); },
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    hasAttribute: (k) => k in attrs,
    removeAttribute: (k) => { delete attrs[k]; },
  };
}

function boot(nodes) {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const body = makeNode("body");
  const window = {
    location: { href: "https://example.test/ggulggul/" },
    history: { state: null, replaceState() {}, pushState() {} },
    addEventListener() {},
    matchMedia: () => ({ matches: true }),
    getComputedStyle(node) {
      const openClass = CLASS_DRIVEN[node.id];
      if (openClass) {
        return { display: node.style.display || "block", visibility: node.classList.contains(openClass) ? "visible" : "hidden" };
      }
      return { display: node.style.display || "none", visibility: "visible" };
    },
  };
  window.window = window;
  const context = {
    window,
    document: { readyState: "complete", body, getElementById: (id) => byId[id] || null, addEventListener() {} },
    navigator: { maxTouchPoints: 5, userAgent: "Android" },
    setInterval: () => 0,
    clearInterval() {},
    setTimeout: () => 0,
    clearTimeout() {},
  };
  vm.runInNewContext(read("js/mobile-backstack-navigation.js"), context);
  return window.__cdMobileNav;
}

test("기능을 열 때 닫혀 있던 오버레이에는 visibility·pointer-events 를 박지 않는다", () => {
  const ziwei = makeNode("ziweiModalOverlay", "none");
  const sukuyo = makeNode("sukuyoModalOverlay", "flex");
  const tarot = makeNode("tarotModalOverlay", "");
  const nav = boot([ziwei, sukuyo, tarot]);

  nav.onActionInvoke("openTarotModal", null);

  assert.equal(ziwei.style.visibility, "", "닫힌 자미두수에 visibility 가 남으면 다음 개봉이 안 보인다");
  assert.equal(ziwei.style.pointerEvents, "");
  assert.equal(ziwei.getAttribute("aria-hidden"), null, "닫힌 노드는 손대지 않는다");
  assert.equal(sukuyo.style.display, "none", "열려 있던 기능은 닫힌다");
  assert.equal(sukuyo.style.visibility, "");
  assert.equal(sukuyo.style.pointerEvents, "");
  assert.equal(tarot.getAttribute("aria-hidden"), null, "여는 중인 타로 오버레이는 스윕에서 빠진다");
});

test("타로를 닫고 다른 기능을 다시 열면 display 만 되돌려도 보인다", () => {
  const ziwei = makeNode("ziweiModalOverlay", "none");
  const tarot = makeNode("tarotModalOverlay", "block");
  const nav = boot([ziwei, tarot]);

  nav.markFeature("openTarotModal");
  nav.onActionInvoke("closeTarotModal", null);
  nav.onActionInvoke("openZiweiModal", null);
  ziwei.style.display = "flex"; // openZiweiModal 이 하는 일

  assert.equal(tarot.style.display, "none");
  assert.equal(ziwei.style.display, "flex");
  assert.equal(ziwei.style.visibility, "");
  assert.equal(ziwei.style.pointerEvents, "");
});

test("클래스로 보이는 확대 보기 막은 클래스만 빼고 display:none 을 박지 않는다", () => {
  const focus = makeNode("tarotFocusOverlay", "", ["active"]);
  const nav = boot([focus]);

  nav.onActionInvoke("openZiweiModal", null);

  assert.equal(focus.classList.contains("active"), false);
  assert.equal(focus.style.display, "", "display:none 이 남으면 다음 확대 보기가 영구히 안 뜬다");
});

test("타로 모달은 실제로 보일 때만 중복 진입을 막고, 닫힐 때 확대 보기 막을 걷는다", () => {
  const runtime = read("js/core/index-inline-runtime.js");
  const resetStart = runtime.indexOf("function _resetTarotUI()");
  const resetEnd = runtime.indexOf("function resetTarotForCategorySelection", resetStart);
  assert.ok(resetStart >= 0 && resetEnd > resetStart, "_resetTarotUI 경계를 찾지 못했습니다");
  const reset = runtime.slice(resetStart, resetEnd);
  assert.match(reset, /classList\.remove\('divine-focus'\)/);
  assert.match(reset, /getElementById\('tarotFocusOverlay'\)[\s\S]*classList\.remove\('active'\)/);

  assert.match(runtime, /if \(state\.open && overlay\.style\.display !== 'none' && getComputedStyle\(overlay\)\.display !== 'none'\) \{/);
});
