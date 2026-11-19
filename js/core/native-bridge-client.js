/**
 * 네이티브 브리지 공통 client — `window.CodeDestinyNative`(v0, docs/native-bridge-contract.md)를
 * 플랫폼과 무관한 한 가지 호출 형식으로 감싼다(iOS Phase 2 단계 3, 2026-11-19).
 *
 * - 플랫폼 판별은 js/core/app-context.js 의 getPlatform() 에 위임한다. 여기서 다시 판별하지 않는다.
 * - 웹이거나 메서드가 없으면 throw 하지 않고 `{ ok:false, error:{ code:"E_UNSUPPORTED" } }` 를 돌려준다.
 * - 응답은 계약 3절의 v1 형식 `{ok:true,result} | {ok:false,error:{code,message,retryable}}` 이다.
 *   v0 플러그인이 `{ok:false, code}` 로 답하면 계약의 대응표대로 E_* 코드로 바꾼다.
 * - 🔴 기존 호출부(app-native-bridge.js·app-payment-guard.js·native-billing.ts 등)는 아직 이 파일을 쓰지 않는다.
 *   소비자를 옮길 때 기존 래퍼의 재시도·폴백과 이중으로 감싸지 않는지 확인한다.
 *   StoreKit 구매 배선(store.*)은 Phase 6 범위다.
 *
 * 로딩 방식은 app-context.js 와 같다: classic script 는 `globalThis.__cdNativeBridgeClient`,
 * webpack/Node(require) 는 `module.exports`.
 */
(function (factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof globalThis !== "undefined") globalThis.__cdNativeBridgeClient = api;
})(function () {
  "use strict";

  // 계약 5절: v0(현재)는 0. app.getInfo 를 도입하는 빌드부터 1.
  var BRIDGE_VERSION = 0;

  function appContext() {
    if (typeof globalThis !== "undefined" && globalThis.__cdAppContext) return globalThis.__cdAppContext;
    try {
      if (typeof require === "function") return require("./app-context");
    } catch (_requireError) { /* classic script 에는 require 가 없다 */ }
    return null;
  }

  function getPlatform() {
    var ctx = appContext();
    try {
      return ctx && typeof ctx.getPlatform === "function" ? ctx.getPlatform() : "web";
    } catch (_platformError) {
      return "web";
    }
  }

  function getBridge() {
    if (getPlatform() === "web" || typeof window === "undefined") return null;
    return window.CodeDestinyNative || null;
  }

  function resolve(method) {
    var bridge = getBridge();
    var parts = String(method || "").split(".");
    var owner = null;
    var target = bridge;
    for (var i = 0; i < parts.length && target; i += 1) {
      if (!parts[i]) return null;
      owner = target;
      target = target[parts[i]];
    }
    return typeof target === "function" ? { owner: owner, fn: target } : null;
  }

  function has(method) {
    return resolve(method) !== null;
  }

  // 계약 3절 대응표: NATIVE_*_UNAVAILABLE → E_UNSUPPORTED, APP_STORE_REQUEST_TIMEOUT → E_TIMEOUT.
  function normalizeCode(code) {
    var value = String(code || "");
    if (!value) return "E_NATIVE";
    if (/^E_[A-Z_]+$/.test(value)) return value;
    if (/^NATIVE_[A-Z_]*UNAVAILABLE$/.test(value)) return "E_UNSUPPORTED";
    if (value === "APP_STORE_REQUEST_TIMEOUT") return "E_TIMEOUT";
    return value;
  }

  function failure(code, message) {
    var normalized = normalizeCode(code);
    return {
      ok: false,
      error: { code: normalized, message: String(message || normalized), retryable: normalized === "E_TIMEOUT" },
    };
  }

  function call(method, params) {
    var target = resolve(method);
    if (!target) return Promise.resolve(failure("E_UNSUPPORTED", "native method unavailable: " + method));
    var pending;
    try {
      pending = arguments.length > 1 ? target.fn.call(target.owner, params) : target.fn.call(target.owner);
    } catch (error) {
      return Promise.resolve(failure(error && error.code, error && error.message));
    }
    return Promise.resolve(pending).then(function (result) {
      if (result && typeof result === "object" && result.ok === false) {
        return failure(result.code || (result.error && result.error.code), result.message || (result.error && result.error.message));
      }
      return { ok: true, result: result };
    }, function (error) {
      return failure(error && error.code, error && error.message);
    });
  }

  function getInfo() {
    return { platform: getPlatform(), bridgeVersion: BRIDGE_VERSION, available: getBridge() !== null };
  }

  return { BRIDGE_VERSION: BRIDGE_VERSION, getPlatform: getPlatform, getBridge: getBridge, has: has, call: call, getInfo: getInfo };
});
