/**
 * 네이티브 브리지 공통 client — js/core/native-bridge-client.js.
 * 플랫폼은 app-context 위임, 응답은 계약 v1 형식, 웹·미구현은 throw 없이 E_UNSUPPORTED.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const contextSource = fs.readFileSync(path.join(root, "js/core/app-context.js"), "utf8");
const clientSource = fs.readFileSync(path.join(root, "js/core/native-bridge-client.js"), "utf8");

// classic script 처럼 module·require 없이 실행한다(브라우저와 같은 조건).
function load(window) {
  const sandbox = { window, document: window.document, globalThis: {} };
  vm.runInNewContext(contextSource, sandbox);
  vm.runInNewContext(clientSource, sandbox);
  return sandbox.globalThis.__cdNativeBridgeClient;
}

function makeWindow({ platform, native } = {}) {
  const document = { documentElement: { getAttribute: () => null } };
  const window = { document };
  if (platform) window.Capacitor = { isNativePlatform: () => true, getPlatform: () => platform };
  if (native) window.CodeDestinyNative = native;
  return window;
}

test("웹은 브리지가 있어도 쓰지 않고 E_UNSUPPORTED", async () => {
  const client = load(makeWindow({ native: { restore: async () => ({ purchases: [] }) } }));
  assert.equal(client.getPlatform(), "web");
  assert.equal(client.getBridge(), null);
  assert.equal(client.has("restore"), false);
  const res = await client.call("restore");
  assert.equal(res.ok, false);
  assert.equal(res.error.code, "E_UNSUPPORTED");
  assert.deepEqual({ ...client.getInfo() }, { platform: "web", bridgeVersion: 0, available: false });
});

test("android/ios 모두 같은 v0 메서드를 v1 형식으로 감싼다", async () => {
  for (const platform of ["android", "ios"]) {
    let seen;
    const native = { queryProducts: async (input) => { seen = input; return { products: [{ productId: "x" }] }; } };
    const client = load(makeWindow({ platform, native }));
    assert.equal(client.getPlatform(), platform);
    assert.equal(client.has("queryProducts"), true);
    const res = await client.call("queryProducts", { productIds: ["x"] });
    assert.deepEqual(seen, { productIds: ["x"] });
    assert.equal(res.ok, true);
    assert.equal(res.result.products[0].productId, "x");
    assert.equal(client.getInfo().available, true);
  }
});

test("점 경로는 소유 객체를 this 로 부르고, 인자를 안 주면 인자 없이 부른다", async () => {
  const credentials = { calls: [], clear() { this.calls.push(arguments.length); return { ok: true }; } };
  const client = load(makeWindow({ platform: "android", native: { credentials } }));
  assert.equal(client.has("credentials.clear"), true);
  assert.equal(client.has("credentials.missing"), false);
  assert.equal(client.has("credentials..clear"), false);
  const res = await client.call("credentials.clear");
  assert.equal(res.ok, true);
  assert.deepEqual(credentials.calls, [0]);
});

test("없는 메서드는 E_UNSUPPORTED (iOS 에서 Android 전용 플러그인 등)", async () => {
  const client = load(makeWindow({ platform: "ios", native: {} }));
  const res = await client.call("purchase", { productId: "x" });
  assert.equal(res.error.code, "E_UNSUPPORTED");
  assert.equal(res.error.retryable, false);
});

test("v0 오류 코드를 계약 대응표대로 바꾸고 reject·throw 도 삼킨다", async () => {
  const native = {
    restore: async () => ({ ok: false, code: "NATIVE_BILLING_UNAVAILABLE" }),
    purchase: async () => { const e = new Error("slow"); e.code = "APP_STORE_REQUEST_TIMEOUT"; throw e; },
    consume: () => { throw new Error("boom"); },
    openAuth: async () => ({ ok: false, code: "OAUTH_PROVIDER_UNSUPPORTED" }),
  };
  const client = load(makeWindow({ platform: "android", native }));
  assert.equal((await client.call("restore")).error.code, "E_UNSUPPORTED");
  const timeout = await client.call("purchase", {});
  assert.equal(timeout.error.code, "E_TIMEOUT");
  assert.equal(timeout.error.retryable, true);
  const thrown = await client.call("consume", {});
  assert.equal(thrown.error.code, "E_NATIVE");
  assert.equal(thrown.error.message, "boom");
  assert.equal((await client.call("openAuth", {})).error.code, "OAUTH_PROVIDER_UNSUPPORTED");
});

test("Capacitor 주입 전 앱 신호만 있으면 app-context 기존 가정(android)을 따른다", () => {
  const window = makeWindow();
  window.__CODE_DESTINY_RUNTIME_TARGET = "mobile-app";
  const client = load(window);
  assert.equal(client.getPlatform(), "android");
  assert.equal(client.getBridge(), null);
});

test("require 경로(webpack/Node)에서도 app-context 를 찾아 웹으로 판정한다", () => {
  const client = require(path.join(root, "js/core/native-bridge-client.js"));
  assert.equal(client.getPlatform(), "web");
  assert.equal(typeof client.call, "function");
});
