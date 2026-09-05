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

  // intent/verify/free-grant 왕복 상한. 셸(index.html resolveTimeoutMs)의 /api/billing/checkout·confirm
  // 과 같은 25s — 같은 워커 스택(인증 + 보안가드 + Mongo 쓰기)을 타므로 콜드 시 ~25s 까지 걸린다.
  // 상한이 없으면 망 전환 등으로 응답이 영영 안 올 때 아래 inFlight 가 풀리지 않아 재시도 버튼도
  // 먹지 않고 앱을 재시작해야 했다(2026-09-03 전수 조사). 테스트는 window.__cdAppStoreFetchTimeoutMs 로 줄인다.
  var APP_STORE_FETCH_TIMEOUT_MS = 25000;

  function fetchTimeoutMs() {
    var override = Number(window.__cdAppStoreFetchTimeoutMs);
    return override > 0 ? override : APP_STORE_FETCH_TIMEOUT_MS;
  }

  async function postJson(path, body) {
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timedOut = false;
    var timer = setTimeout(function () {
      timedOut = true;
      if (controller) controller.abort();
    }, fetchTimeoutMs());
    var response;
    var payload;
    try {
      response = await fetch(apiBase() + path, {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify(body || {}),
        signal: controller ? controller.signal : undefined,
      });
      // 본문 읽기도 같은 상한 안에 둔다 — 헤더만 오고 본문이 안 오는 연결도 같은 무한 대기다.
      payload = await response.json().catch(function (e) {
        if (timedOut) throw e;
        return {};
      });
    } catch (e) {
      if (timedOut) throw failure("APP_STORE_REQUEST_TIMEOUT", "결제 서버 응답이 늦어지고 있습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.");
      throw e;
    } finally {
      clearTimeout(timer);
    }
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
  async function runPlayBillingCheckoutCore(options) {
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

    // 웹 구현(_cdRunDirectKrwCheckout)은 결제 확정 뒤 access 스냅샷을 강제 갱신하는데, 이 가드가 그
    // 함수를 통째로 대체하므로 같은 일을 여기서 한다. 안 하면 60초 스냅샷 동안 방금 산 콘텐츠가
    // 잠긴 것처럼 보인다. 독립 정적 페이지에는 캐시 블록이 없어 조용히 no-op 이다.
    try {
      var accessCache = window.CodeDestinyUserAccessCache;
      if (accessCache && typeof accessCache.refreshUserAccessAfterPayment === "function") {
        Promise.resolve(accessCache.refreshUserAccessAfterPayment()).catch(function () {});
      }
    } catch (e) { /* noop */ }

    return verify.payload;
  }

  // 중복 실행 방지.
  //
  // destiny-profile.js는 자기 _cdRunDirectKrwCheckout를 single-flight 래퍼로 감싸는데
  // (`__cdSinglePaymentGuard`), 아래에서 이 전역을 접근자로 고정해 버리므로 그 래퍼가
  // 붙지 못한다. 그래서 같은 보호를 여기서 직접 한다 — 버튼 연타로 intent가 두 번
  // 나가고 결제 시트가 두 번 뜨는 것을 막는다.
  var inFlight = null;

  function runPlayBillingCheckout(options) {
    if (inFlight) return inFlight;
    inFlight = Promise.resolve()
      .then(function () { return runPlayBillingCheckoutCore(options); })
      .finally(function () { inFlight = null; });
    return inFlight;
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
  // 상점으로 떠나기 전에 복귀 지점을 남긴다 — 앱에서 상점으로 가는 모든 경로(셸·독립 정적·React
  // 결제창의 [이용권으로 구매], 402 분기)가 __cdOpenChargeModal 로 이 함수에 모이므로 여기 한 곳이
  // 관문이다. /app/store/ 는 구매 성공 뒤 이 티켓을 소비해 원래 콘텐츠로 돌려보낸다(웹 /points 와
  // 같은 계약: js/core/checkout-entry.js rememberCheckoutReturn / consumeCheckoutReturn).
  function rememberAppStoreReturn() {
    try {
      var entry = window.__cdCheckoutEntry;
      if (!entry || typeof entry.rememberCheckoutReturn !== "function") return;
      var pathname = String(window.location.pathname || "/");
      // 앱 탭 화면(/app/**)에서 온 진입은 저장하지 않는다 — 상점→상점 루프와 탭 화면 복귀를 막는다.
      if (pathname === "/app" || pathname.indexOf("/app/") === 0) return;
      entry.rememberCheckoutReturn({
        url: pathname + String(window.location.search || "") + String(window.location.hash || ""),
        label: String(document.title || ""),
      });
    } catch (e) { /* 복귀 지점 저장 실패는 상점 진입을 막지 않는다 */ }
  }
  function openAppStore() {
    rememberAppStoreReturn();
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

  // --- 외부 결제 언급 문구 차단 -------------------------------------------
  // destiny-profile.js는 402 안내에 '포트원 V2 KG이니시스 결제로 진행됩니다.' 같은 문장을
  // alert로 덧붙인다(js/destiny-profile.js:3398). 그 파일은 웹·앱 공용이라 수정할 수 없으므로,
  // 앱에서는 표시 직전에 그 문장만 걷어낸다. 실제 결제는 Play Billing으로 이뤄지므로
  // 외부 PG를 안내하면 사실과 다르고 Play 정책에도 걸린다.
  var EXTERNAL_PAYMENT_SENTENCE = /\n*[^\n]*(포트원|PortOne|이니시스|KG이니시스)[^\n]*\n?/gi;
  var nativeAlert = window.alert ? window.alert.bind(window) : null;
  if (nativeAlert) {
    window.alert = function (message) {
      var text = String(message == null ? "" : message);
      return nativeAlert(text.replace(EXTERNAL_PAYMENT_SENTENCE, "\n").replace(/\n{3,}/g, "\n\n").trim());
    };
  }

  // --- 앱에 없는 라우트 처리 ------------------------------------------------
  //
  // scripts/build-mobile-app.mjs가 이 라우트들의 파일을 앱 번들에서 지운다.
  // 링크가 남아 있으면 그대로 404이므로 여기서 걷어낸다(양쪽이 짝을 이룬다).
  //
  //   redirect 있음 : 앱에 대체 화면이 있다 → 클릭을 그쪽으로 돌린다.
  //   redirect 없음 : 대체 화면이 없다(SEO 전용 문서) → 링크 자체를 제거한다.
  var PRUNED_ROUTES = [
    { pattern: /^\/points(\/|\?|#|$)/, redirect: "/app/store/" },
    { pattern: /^\/premium-unlock(\/|\?|#|$)/, redirect: "/app/store/" },
    { pattern: /^\/insights(\/|\?|#|$)/, redirect: null },
    { pattern: /^\/famous-saju(\/|\?|#|$)/, redirect: null },
  ];

  function toPath(href) {
    return String(href || "").replace(/^https?:\/\/[^/]+/, "");
  }

  // 로케일 접두사(/en, /ja, /zh, /zh-tw, /en-us …)를 벗기고 나서 판정한다.
  // 라우트 파일은 build-mobile-app.mjs의 LOCALE_PREFIXES × REMOVED_ROUTE_DIRS 조합으로
  // 지워지는데, 여기서 접두사를 안 벗기면 /en/insights 같은 링크가 그대로 남아
  // 지워진 경로로 향한다(RouteProcessor가 홈으로 튕긴다). 2026-08-29 실측: dist에
  // /en·/ja·/zh·/zh-tw insights 링크가 로케일당 9개 파일에 살아 있었다.
  var LOCALE_PREFIX_RE = /^\/[a-z]{2}(?:-[a-z]{2})?(?=\/)/;

  function matchPrunedRoute(href) {
    var path = toPath(href);
    if (!path || path.charAt(0) !== "/") return null;
    var routePath = path.replace(LOCALE_PREFIX_RE, "");
    for (var i = 0; i < PRUNED_ROUTES.length; i += 1) {
      if (PRUNED_ROUTES[i].pattern.test(routePath)) return PRUNED_ROUTES[i];
    }
    return null;
  }

  // 홈의 SEO 섹션은 앵커만 지우면 제목만 남은 빈 껍데기가 된다 — 섹션째 걷어낸다.
  // body의 부모가 곧 섹션 카드 컨테이너다(index.html: 토글 헤더 + 본문을 감싼 div).
  var PRUNED_SECTION_BODY_IDS = ["cd-insights-body", "cd-famous-body"];

  function removePrunedSections() {
    for (var i = 0; i < PRUNED_SECTION_BODY_IDS.length; i += 1) {
      var body = document.getElementById(PRUNED_SECTION_BODY_IDS[i]);
      if (!body) continue;
      var section = body.parentElement;
      // 부모가 없거나 body/html까지 올라갔으면 구조가 바뀐 것 — 본문만 지우고 만다.
      if (!section || section === document.body || section === document.documentElement) {
        body.remove();
        continue;
      }
      section.remove();
    }
  }

  function scrubPrunedLinks(root) {
    if (!root || !root.querySelectorAll) return;
    var anchors = root.querySelectorAll("a[href]");
    for (var i = 0; i < anchors.length; i += 1) {
      var route = matchPrunedRoute(anchors[i].getAttribute("href"));
      // 대체 화면이 있는 링크(/points)는 남겨두고 클릭만 돌린다 — 사용자가 이용권을
      // 사려다 버튼이 사라지면 그게 더 나쁘다.
      if (!route || route.redirect) continue;
      anchors[i].remove();
    }
  }

  function applyPrunedRouteCleanup() {
    removePrunedSections();
    scrubPrunedLinks(document);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyPrunedRouteCleanup);
  } else {
    applyPrunedRouteCleanup();
  }

  // 나중에 JS가 붙이는 링크(예: index.html의 유명인 카드 그리드)도 같은 규칙으로 걷어낸다.
  //
  // 성능: 이 관찰자는 문서 전체를 subtree로 보며 추가된 노드마다 querySelectorAll을 돌린다.
  // 타로 그리드·카드 목록처럼 DOM을 많이 만드는 화면에서는 이 비용이 계속 쌓인다.
  // 프루닝 링크는 초기 렌더에서 거의 다 정리되고, 그 뒤에 나타나는 것은 아래 클릭 백스톱이
  // 확실히 막는다(진짜 최종 안전망은 그쪽이다). 그래서 초기 구간만 관찰하고 끊는다.
  var PRUNE_OBSERVER_WINDOW_MS = 12000;
  try {
    var pruneObserver = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i += 1) {
        var added = mutations[i].addedNodes;
        for (var j = 0; j < added.length; j += 1) {
          if (added[j].nodeType !== 1) continue;
          scrubPrunedLinks(added[j]);
          if (added[j].matches && added[j].matches("a[href]")) {
            var route = matchPrunedRoute(added[j].getAttribute("href"));
            if (route && !route.redirect) added[j].remove();
          }
        }
      }
    });
    pruneObserver.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(function () {
      try {
        pruneObserver.disconnect();
      } catch (e) { /* noop */ }
    }, PRUNE_OBSERVER_WINDOW_MS);
  } catch (e) { /* noop */ }

  // 백스톱 — 위를 다 뚫고 나온 클릭(동적 href 변경 등)은 여기서 막는다.
  document.addEventListener("click", function (event) {
    var anchor = event.target && event.target.closest ? event.target.closest("a[href]") : null;
    if (!anchor) return;
    var route = matchPrunedRoute(anchor.getAttribute("href"));
    if (!route) return;
    event.preventDefault();
    event.stopPropagation();
    if (route.redirect) window.location.assign(route.redirect);
  }, true);

  window.__cdAppPaymentGuard = {
    installed: true,
    runPlayBillingCheckout: runPlayBillingCheckout,
    openAppStore: openAppStore,
    prunedRoutes: PRUNED_ROUTES,
    applyPrunedRouteCleanup: applyPrunedRouteCleanup,
  };
})();
