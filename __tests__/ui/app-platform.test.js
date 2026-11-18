/**
 * 플랫폼 판별 — js/core/app-context.js getPlatform() 과 scripts/app-native-bridge.js 의 html[data-platform].
 * isApp() 의미는 그대로이고, 그 위에 android | ios | web 을 얹는다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { JSDOM } = require("jsdom");

const root = path.resolve(__dirname, "../..");
const contextSource = fs.readFileSync(path.join(root, "js/core/app-context.js"), "utf8");
const bridgeSource = fs.readFileSync(path.join(root, "scripts/app-native-bridge.js"), "utf8");

function loadContext(window) {
  const sandbox = { window, document: window.document, globalThis: {} };
  vm.runInNewContext(contextSource, sandbox);
  return sandbox.globalThis.__cdAppContext;
}

function makeWindow({ capacitor, runtimeTarget } = {}) {
  const document = { documentElement: { getAttribute: () => null } };
  return { document, Capacitor: capacitor, __CODE_DESTINY_RUNTIME_TARGET: runtimeTarget };
}

test("웹(앱 신호 없음)은 web — Capacitor JS 만 로드돼도 web", () => {
  assert.equal(loadContext(makeWindow()).getPlatform(), "web");
  const ctx = loadContext(makeWindow({ capacitor: { isNativePlatform: () => false, getPlatform: () => "web" } }));
  assert.equal(ctx.isApp(), false);
  assert.equal(ctx.getPlatform(), "web");
});

test("Capacitor 네이티브 android/ios 를 그대로 고른다", () => {
  for (const platform of ["android", "ios"]) {
    const ctx = loadContext(makeWindow({ capacitor: { isNativePlatform: () => true, getPlatform: () => platform } }));
    assert.equal(ctx.isApp(), true);
    assert.equal(ctx.getPlatform(), platform);
  }
});

test("앱인데 플랫폼을 모르면 기존 가정대로 android, 나중에 주입되면 ios 로 바뀐다(캐시 없음)", () => {
  const window = makeWindow({ runtimeTarget: "mobile-app" });
  const ctx = loadContext(window);
  assert.equal(ctx.getPlatform(), "android");
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => "ios" };
  assert.equal(ctx.getPlatform(), "ios");
});

test("SSR(window 없음)은 isApp 규칙을 따른다", () => {
  const sandbox = { globalThis: {} };
  vm.runInNewContext(contextSource, sandbox);
  assert.equal(sandbox.globalThis.__cdAppContext.getPlatform(), "web");
});

function runBridge(capacitor) {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "capacitor://localhost/", runScripts: "outside-only" });
  dom.window.fetch = async () => { throw new Error("network forbidden"); };
  if (capacitor) dom.window.Capacitor = capacitor;
  dom.window.eval(bridgeSource);
  return dom;
}

test("브릿지는 iOS/Android 에서 html[data-platform] 을 찍는다", () => {
  for (const platform of ["ios", "android"]) {
    const dom = runBridge({ isNativePlatform: () => true, getPlatform: () => platform, Plugins: {} });
    try {
      assert.equal(dom.window.document.documentElement.getAttribute("data-platform"), platform);
      assert.equal(dom.window.document.documentElement.getAttribute("data-runtime-target"), "mobile-app");
    } finally { dom.window.close(); }
  }
});

test("Capacitor 주입 전에는 추정값을 찍지 않고, load 뒤 주입되면 그때 찍는다", async () => {
  const dom = runBridge(null);
  try {
    assert.equal(dom.window.document.documentElement.hasAttribute("data-platform"), false);
    dom.window.Capacitor = { isNativePlatform: () => true, getPlatform: () => "ios", Plugins: {} };
    dom.window.dispatchEvent(new dom.window.Event("load"));
    assert.equal(dom.window.document.documentElement.getAttribute("data-platform"), "ios");
  } finally { dom.window.close(); }
});
