/**
 * 앱 전용 결제 가드 — Android 빌드에만 주입된다(scripts/build-mobile-app.mjs).
 * 웹 번들에는 절대 포함되지 않는다.
 *
 * 목적: Google Play 정책상 앱 안에서는 외부 결제(PortOne/이니시스)가 열려선 안 된다.
 * 정적 페이지는 js/destiny-profile.js(웹·앱 공용, 수정 금지)의 결제 런타임을 쓰므로,
 * 그 안의 단건 결제 경로만 Play Billing으로 갈아끼운다.
 *
 * 이 파일은 destiny-profile.js보다 **먼저** 실행된다. 따라서 나중에 할당될 전역 함수를
 * defineProperty 접근자로 가로챈다 — 나중에 덮어쓰는 쪽이 이기는 단순 대입으로는 막을 수 없다.
 *
 * 이용권 선검사와 월정석은 그대로 둔다(결제가 아니므로 Play Billing 대상이 아니고,
 * 이용권 우선 게이팅은 CLAUDE.md 필수 규칙이다).
 */
(function () {
  "use strict";
  if (window.__cdAppPaymentGuardInstalled) return;
  window.__cdAppPaymentGuardInstalled = true;

  var APP_STORE_BASE = "/api/app-store";

  function apiBase() {
    var base = window.CODE_DESTINY_API_BASE_URL || "";
    return String(base || "").replace(/\/+$/, "");
  }

  function authHeaders() {
    var headers = { "Content-Type": "application/json" };
    try {
      var token = localStorage.getItem("fortune_auth_token");
      if (token) headers.Authorization = "Bearer " + token;
    } catch (e) { /* noop */ }
    return headers;
  }

  async function postJson(path, body) {
    var response = await fetch(apiBase() + path, {
      method: "POST",
      headers: authHeaders(),
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify(body || {}),
    });
    var payload = await response.json().catch(function () { return {}; });
    return { ok: response.ok && payload && payload.ok !== false, status: response.status, payload: payload };
  }

  function nativeBilling() {
    return window.CodeDestinyNative || null;
  }

  function readFeatureKey(opts) {
    var o = opts || {};
    return String(o.featureKey || o.subFeatureKey || o.serviceType || o.productId || "").trim();
  }

  function failure(code, message) {
    var error = new Error(message);
    error.code = code;
    return error;
  }

  /**
   * 단건 결제를 Play Billing으로 수행한다.
   * destiny-profile.js의 원본과 동일하게 "결제 확인 응답 payload"를 반환해야
   * 이후 콘텐츠 지급 흐름이 그대로 이어진다.
   */
  async function runPlayBillingCheckout(options) {
    var opts = options || {};
    var featureKey = readFeatureKey(opts);
    var native = nativeBilling();
    if (!native || typeof native.purchase !== "function") {
      throw failure("NATIVE_BILLING_UNAVAILABLE", "앱 결제 연결이 준비되지 않았습니다. 앱을 다시 시작해 주세요.");
    }

    var requestId = String(opts.requestId || opts.idempotencyKey || "").trim();
    var intentBody = {
      featureKey: featureKey,
      categoryKey: opts.categoryKey,
      subFeatureKey: opts.subFeatureKey,
      reason: opts.reason || opts.title,
      requestId: requestId,
      idempotencyKey: requestId,
      profileId: opts.profileId || opts.selectedProfileId,
      reportId: opts.reportId,
      sessionId: opts.sessionId || opts.reportSessionId,
    };

    var intent = await postJson(APP_STORE_BASE + "/google/intent", intentBody);

    // 앱에서 무료로 여는 저가 콘텐츠는 Play 상품이 없다 — 무료 지급으로 보낸다.
    if (intent.payload && intent.payload.code === "APP_STORE_PRODUCT_FREE_IN_APP") {
      var free = await postJson(APP_STORE_BASE + "/free-grant", intentBody);
      if (!free.ok) throw failure("APP_STORE_FREE_GRANT_FAILED", String((free.payload && free.payload.message) || "콘텐츠를 열지 못했습니다."));
      return free.payload;
    }
    if (!intent.ok || !intent.payload || !intent.payload.data || !intent.payload.data.product) {
      throw failure("APP_STORE_PRODUCT_UNAVAILABLE", String((intent.payload && intent.payload.message) || "앱 결제 상품을 불러오지 못했습니다."));
    }

    var product = intent.payload.data.product;
    var purchaseResult = await native.purchase({
      featureKey: featureKey,
      productId: product.productId,
      productType: product.productType || "inapp",
      idempotencyKey: requestId,
      obfuscatedAccountId: String(intent.payload.data.obfuscatedAccountId || ""),
      obfuscatedProfileId: featureKey.slice(0, 64),
    });
    if (!purchaseResult || purchaseResult.ok === false) {
      throw failure(
        String((purchaseResult && purchaseResult.code) || "APP_STORE_PURCHASE_FAILED"),
        String((purchaseResult && purchaseResult.message) || "결제가 완료되지 않았습니다."),
      );
    }

    var verify = await postJson(APP_STORE_BASE + "/google/verify", Object.assign({}, intentBody, {
      productId: product.productId,
      productType: product.productType || "inapp",
      purchaseToken: purchaseResult.purchaseToken,
      packageName: purchaseResult.packageName,
      orderId: purchaseResult.orderId,
      purchaseState: purchaseResult.purchaseState,
      acknowledged: purchaseResult.acknowledged,
      provider: "GOOGLE_PLAY",
    }));
    if (!verify.ok) {
      throw failure("APP_STORE_VERIFY_FAILED", String((verify.payload && verify.payload.message) || "결제 검증에 실패했습니다."));
    }

    // 회당 결제는 소비해야 재구매가 열린다. 실패해도 지급은 되돌리지 않는다
    // (서버가 이미 승인해 자동 환불은 없고, 앱 재시작 시 복구 경로가 다시 소비한다).
    var appPurchase = (verify.payload.data && verify.payload.data.appPurchase) || null;
    if (appPurchase && appPurchase.shouldConsume === true && typeof native.consume === "function") {
      try {
        await native.consume({ purchaseToken: purchaseResult.purchaseToken });
      } catch (e) { /* noop */ }
    }

    return verify.payload;
  }

  // --- PortOne SDK 무력화 -------------------------------------------------
  // SDK 스크립트가 어떻게든 로드되더라도 window.PortOne에 자리잡지 못하게 한다.
  try {
    Object.defineProperty(window, "PortOne", {
      configurable: false,
      get: function () { return undefined; },
      set: function () { /* 앱에서는 외부 결제 SDK를 설치하지 않는다 */ },
    });
  } catch (e) { /* noop */ }

  // --- 단건 결제 경로 갈아끼우기 ------------------------------------------
  // destiny-profile.js가 나중에 대입하는 값을 무시하고 항상 Play Billing 구현을 돌려준다.
  function pinNativeCheckout(name) {
    try {
      Object.defineProperty(window, name, {
        configurable: false,
        get: function () { return runPlayBillingCheckout; },
        set: function () { /* 원본(PortOne) 구현을 받아들이지 않는다 */ },
      });
    } catch (e) { /* noop */ }
  }
  pinNativeCheckout("_cdRunDirectKrwCheckout");
  pinNativeCheckout("_dpRunDirectKrwCheckout");

  // --- 이용권/충전 스토어를 앱 전용 화면으로 ------------------------------
  function openAppStore() {
    window.location.assign("/app/store/");
  }
  try {
    Object.defineProperty(window, "__cdOpenChargeModal", {
      configurable: false,
      get: function () { return openAppStore; },
      set: function () { /* /points(PortOne 스토어)로 가는 모달을 열지 않는다 */ },
    });
  } catch (e) { /* noop */ }
  try {
    Object.defineProperty(window, "openChargeModal", {
      configurable: false,
      get: function () { return openAppStore; },
      set: function () { /* noop */ },
    });
  } catch (e) { /* noop */ }

  // --- /points 이탈 차단 ---------------------------------------------------
  // 정적 페이지 곳곳의 <a href="/points">는 빌드 시 제거하지만, 런타임에서 만들어지는
  // 링크·리다이렉트까지 잡으려면 클릭 단계에서 한 번 더 막아야 한다.
  document.addEventListener("click", function (event) {
    var anchor = event.target && event.target.closest ? event.target.closest("a[href]") : null;
    if (!anchor) return;
    var href = String(anchor.getAttribute("href") || "");
    if (!/^\/?points(\/|\?|#|$)/.test(href.replace(/^https?:\/\/[^/]+/, ""))) return;
    event.preventDefault();
    event.stopPropagation();
    openAppStore();
  }, true);

  window.__cdAppPaymentGuard = {
    installed: true,
    runPlayBillingCheckout: runPlayBillingCheckout,
    openAppStore: openAppStore,
  };
})();
