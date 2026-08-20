/**
 * 결제창(체크아웃) 진입·복귀·계측 단일 정본.
 *
 * 🔴 정적 셸(index.html 인라인) · React(app/_lib/billing-client.ts) · 독립 정적 페이지
 * (js/destiny-profile.js) 세 렌더러가 같은 "이용권으로 구매" 카드를 그리고, 같은 세션 스토리지 키로
 * 복귀 지점을 주고받는다. 사본을 만들면 한쪽만 앱 분기를 놓쳐 /points 404 로 떨어지거나(아래 참고)
 * 복귀 키가 어긋나 이용권을 사고도 원래 화면으로 못 돌아온다. 새 사본을 만들지 말고 여기를 고칠 것.
 *
 * 🔴 앱(Android WebView)에서 /points 로 프로그래매틱 이동하면 404 다.
 * scripts/app-payment-guard.js 의 PRUNED_ROUTES 는 **앵커 클릭만** 가로채고(click 리스너 + 링크 스크럽),
 * location.assign 은 걸리지 않는다. 게다가 scripts/build-mobile-app.mjs 가 앱 번들에서 /points 파일을
 * 지운다. 앱에서는 반드시 window.__cdOpenChargeModal()(가드가 /app/store/ 로 고정) 을 타야 한다 —
 * shouldUseAppStoreEntry() 가 그 판정이며, 애매하면 앱 쪽으로 폴백한다(웹에서 잘못 걸리면 상점 모달이
 * 열릴 뿐이지만, 앱에서 잘못 걸리면 빈 화면이다).
 *
 * 로딩 방식(번들러 없이 3런타임 공유 — js/core/pass-verdict.js 와 같은 패턴):
 *   - 브라우저 classic script: `globalThis.__cdCheckoutEntry`
 *   - webpack/Node(require): `module.exports` (package.json type=commonjs)
 */
(function (factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof globalThis !== "undefined") globalThis.__cdCheckoutEntry = api;
})(function () {
  "use strict";

  var PASS_STORE_PLAN_ORDER = ["standard", "premium", "vvip", "family"];
  var RETURN_KEY = "cd_checkout_return_v1";
  // 이용권을 사고 돌아오기까지의 현실적 상한. 이 시간을 넘긴 복귀 지점은 사용자가 이미 다른 일을
  // 하고 있다는 뜻이라 조용히 버린다(엉뚱한 화면으로 튕기는 게 안 돌아가는 것보다 나쁘다).
  var RETURN_TTL_MS = 30 * 60 * 1000;
  var FUNNEL_PATH = "/api/billing/funnel-event";
  // 서버 화이트리스트와 같은 목록. 여기서 한 번 거르면 오타 난 이벤트가 네트워크를 타지 않는다.
  var FUNNEL_EVENTS = {
    checkout_opened: true,
    checkout_option_click: true,
    pass_verified_free: true,
    pass_store_entered: true,
    checkout_dismissed: true,
    // 🔴 "PG 결제창이 느리다"를 추측 없이 판정하기 위한 단계 계측(2026-08-15).
    // 셸·dp 는 예전부터 checkout/sdk/config/customer 소요를 재고 있었지만 console.info 로만 남겨,
    // 사용자가 DevTools 를 열어 복사해 주지 않으면 아무도 볼 수 없었다 — 그래서 한 번도 측정되지
    // 않았다. 같은 값을 이미 있는 퍼널 채널로 흘려보내 프로덕션에서 저절로 모이게 한다.
    checkout_pg_opened: true,
  };

  // cdGetCurrentLanguage() 가 돌려주는 언어코드 → 숫자 표기용 BCP-47 로케일.
  // 목록에 없는 언어는 en-US 로 떨어진다(사전에 없는 언어도 한국식 표기보다는 낫다).
  var DISPLAY_LOCALE_BY_LANG = {
    ko: "ko-KR",
    en: "en-US",
    ja: "ja-JP",
    "zh-CN": "zh-CN",
    "zh-TW": "zh-TW",
    es: "es-ES",
    fr: "fr-FR",
    de: "de-DE",
    nl: "nl-NL",
    vi: "vi-VN",
    ms: "ms-MY",
    hi: "hi-IN",
  };

  function text(value) {
    return String(value === null || value === undefined ? "" : value).trim();
  }

  /**
   * 🔴 게이트 진입 1회짜리 멱등키 스코프. **requestId 와 멱등키를 떼어내는 지점이다.**
   *
   * requestId 는 결정적이어야 하는 값이다 — 연타 디듀프(js/core/payment-service.js commandKey)와
   * 서버 증빙 조회(worker/lib/nakshatra-paid-access.js findPaidPayment 의 {requestId} 절)가 그
   * 안정성에 기대고 있고, 정적 셸의 숙요점·사주 AI 상담은 실제로 영구 고정값을 넘긴다
   * (js/saju-engine-tarot-sukuyo-quantum.js 의 'sukuyo-paid:'·'sukuyo-yearly:', js/saju-engine.js 의
   * 'saju-ai-prompt:').
   *
   * 그런데 셸은 거기서 **멱등키까지** 파생했다. 서버 merchantUid 는 (userId, 멱등키)의 순수 파생이라
   * (worker/payments/orders.js deriveOrderId) 같은 사용자·같은 기능이 영원히 같은 주문 문서를 가리키고,
   * 그 문서가 pending 을 벗어나면 createPayableOrder 가 고정 세대를 태우다가 409 를 낸다. 결제·취소를
   * 세 번 겪은 사용자는 이후 **모든 결제가 409 로 시작**했다(클라가 새 키로 복구하지만 그 복구가
   * 결제창 앞 checkout 왕복 하나다 = "PG 결제창이 늦게 뜬다").
   *
   * 409 가 나지 않는 두 환경(React·독립 정적)이 정확히 이 동작이다 — 게이트에 들어올 때마다 새 값.
   * 동시·연타 클릭은 게이트 진입 **앞의** 단일비행(_cdJoinPaidServiceSingleFlight 45s)과 payment-service
   * commandKey(60s)가 이미 하나로 합치므로 스코프도 하나이고, 이중결제 방어는 그대로다.
   */
  function mintPaymentAttemptScope() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function interpolate(template, vars) {
    var source = String(template === null || template === undefined ? "" : template);
    if (!vars) return source;
    return source.replace(/\{(\w+)\}/g, function (match, name) {
      return Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match;
    });
  }

  /**
   * 결제창 문구 조회. 🔴 세 렌더러(정적 셸 · React · 독립 정적)가 **같은 키와 같은 사전**을 보게 하는
   * 지점이다. 예전에는 셸만 i18n 헬퍼를 쓰고 React·독립은 한국어 리터럴을 박아 두어, 문구가 서로
   * 어긋나도 아무도 몰랐고 비한국어 사용자에게는 한국어가 그대로 나갔다.
   *
   * 사전은 public/i18n/<lang>.json 이고 조회기는 js/cd-lang-native.js 의 cdTranslate 다.
   * ⚠ cdTranslate 는 lang==='ko' 일 때 딕셔너리를 무시하고 fallback 을 그대로 돌려준다 —
   * 즉 여기 넘기는 한국어 fallback 이 ko 정본이므로 ko.json 과 항상 같이 맞춰야 한다.
   * 조회기가 없는 환경(React 단독 페이지 등)에서도 fallback 보간으로 안전하게 동작한다.
   */
  function checkoutText(key, fallback, vars) {
    try {
      if (typeof globalThis !== "undefined" && typeof globalThis.cdTranslate === "function") {
        return globalThis.cdTranslate(key, vars || {}, fallback);
      }
    } catch (_translateError) { /* 조회 실패는 폴백으로 흡수한다 */ }
    return interpolate(fallback, vars);
  }

  /**
   * 결제창 숫자 표기에 쓸 BCP-47 로케일. 🔴 금액·잔량을 `toLocaleString("ko-KR")` 로 굳히면
   * 비한국어 사용자에게도 한국식 자릿수 표기가 나간다. 정본을 여기 한 곳에 두는 이유는
   * 세 렌더러가 이미 이 모듈을 함께 쓰기 때문이다 — 렌더러마다 사본을 만들면 다시 갈라진다.
   * 조회기가 없는 환경(React 단독 페이지 등)에서는 ko-KR 로 떨어져 기존 동작을 유지한다.
   */
  function displayLocale() {
    try {
      var win = runtimeWindow();
      var lang = win && typeof win.cdGetCurrentLanguage === "function" ? text(win.cdGetCurrentLanguage()) : "ko";
      return DISPLAY_LOCALE_BY_LANG[lang] || (lang ? "en-US" : "ko-KR");
    } catch (_localeError) {
      return "ko-KR";
    }
  }

  /**
   * PG 결제창(이니시스)의 UI 언어.
   *
   * 🔴 쓸 수 있는 값은 우리가 아니라 **PG 가 정한다.** KG이니시스는 PC 결제창에서
   *    KO_KR·EN_US·ZH_CN 을, 모바일 결제창에서 KO_KR·EN_US 만 지원한다
   *    (포트원 inicis-v2 연동 가이드, 2026-08-20 확인).
   *
   * 🔴 그래서 **두 결제창이 모두 지원하는 두 값만** 쓴다. 지원 밖 값을 보냈을 때 결제창이
   *    어떻게 되는지는 실결제 없이 확인할 수 없고, 그 최악은 '결제창이 아예 안 뜬다' 이다
   *    (PR #104 의 windowType 회귀가 정확히 그 모양이었다). zh-CN 을 PC 에서만 보내려면
   *    우리 UA 판정과 PG 의 PC/모바일 판정이 어긋나지 않는다는 근거가 먼저 필요하다.
   *
   * 지금은 언어와 무관하게 전원이 한국어 결제창을 본다 — 한국어가 아니면 EN_US 로 연다.
   */
  function pgWindowLocale() {
    try {
      var win = runtimeWindow();
      var lang = win && typeof win.cdGetCurrentLanguage === "function" ? text(win.cdGetCurrentLanguage()) : "";
      if (!lang || lang.toLowerCase().indexOf("ko") === 0) return "KO_KR";
      return "EN_US";
    } catch (_pgLocaleError) {
      return "KO_KR";
    }
  }
  /** 금액을 현재 로케일 자릿수 + 통화 문구로 그린다(정적 셸 formatWon 과 같은 계약). */
  function formatKrwAmount(value, fallbackText) {
    var amount = Math.max(0, Math.floor(Number(value) || 0)).toLocaleString(displayLocale());
    return checkoutText("payment.currency.krw", fallbackText || "{amount}원", { amount: amount });
  }

  function runtimeWindow() {
    try {
      return typeof window !== "undefined" ? window : null;
    } catch (_windowError) {
      return null;
    }
  }

  // 등급 사다리의 정본은 pass-verdict.js 하나다(PASS_LIMIT_BY_TIER). 여기서 30/50/100 을 다시 적으면
  // 한도가 바뀔 때 결제창 추천 플랜만 옛 값으로 남는다. 셸·독립은 script 순서로, React 는
  // billing-client 의 import 부수효과로 이 시점에 이미 globalThis 에 올라와 있다.
  function passVerdictApi() {
    try {
      if (typeof globalThis !== "undefined" && globalThis.__cdPassVerdict) return globalThis.__cdPassVerdict;
    } catch (_verdictError) { /* noop */ }
    return null;
  }

  /**
   * 이 금액을 덮는 가장 낮은 이용권 등급. 이미 가진 등급 이하는 후보에서 뺀다(업그레이드 유도).
   * 판정 근거를 못 구하면 빈 문자열을 돌려준다 — 상점은 그냥 하이라이트 없이 열린다.
   * (여기서 임의로 family 를 고르면 300,000원 플랜을 들이미는 셈이라 절대 폴백으로 쓰지 않는다.)
   */
  function resolveStorePlan(costCoins, currentTier) {
    var verdict = passVerdictApi();
    if (!verdict || typeof verdict.passLimitForTier !== "function") return "";
    var cost = Math.max(0, Math.floor(Number(costCoins || 0)));
    var owned = typeof verdict.normalizeTier === "function" ? verdict.normalizeTier(currentTier) : text(currentTier).toLowerCase();
    var ownedIndex = PASS_STORE_PLAN_ORDER.indexOf(owned);
    for (var i = 0; i < PASS_STORE_PLAN_ORDER.length; i += 1) {
      var tier = PASS_STORE_PLAN_ORDER[i];
      if (i <= ownedIndex) continue;
      if (cost <= Number(verdict.passLimitForTier(tier) || 0)) return tier;
    }
    return PASS_STORE_PLAN_ORDER[PASS_STORE_PLAN_ORDER.length - 1];
  }

  /**
   * 결제창에서 어느 선택지를 '추천'으로 올릴지. 🔴 세 렌더러가 같은 답을 내야 하므로 여기 하나만 둔다
   * (분기를 3벌 복제하면 어느 한쪽만 고쳐질 때 같은 사용자가 기기마다 다른 추천을 본다).
   *
   * 🔴 순수 함수다 — 서버를 부르지 않는다. 입력은 전부 렌더러가 결제창을 여는 시점에 **이미 갖고 있는**
   * 값이라 API 왕복이 늘지 않는다. 이용권 최종 판정은 여전히 카드를 눌렀을 때 서버가 한다
   * (verify-pass-recovery-path·verify-checkout-pass-card 가 그 클릭 시 1회 조회를 강제한다).
   * 여기서 나오는 것은 '표시 우선순위'일 뿐 접근 권한 판정이 아니다.
   *
   * 규칙 1 은 종전 passStoreFirst 와 같다 — 등급 미상(대다수)에게는 지금과 똑같이 이용권이 추천이라
   * 회귀 면적이 작다. 실제로 순서가 달라지는 것은 '등급은 있는데 이 가격을 못 덮고 + 월정석이 충분한'
   * 경우뿐이고, 그때 월정석을 올리는 이유는 그 사용자에게 추가 지출이 0 이기 때문이다.
   */
  function resolveCheckoutRecommendation(input) {
    var opts = input || {};
    var allowPass = opts.allowPass !== false;
    var allowDirect = opts.allowDirect !== false;
    var allowMonthly = opts.allowMonthly !== false;
    var monthlyBalance = Number(opts.monthlyBalance);
    var requiredMonthlyCredits = Number(opts.requiredMonthlyCredits);
    var monthlyCovers = opts.monthlyBalanceFresh === true
      && Number.isFinite(monthlyBalance)
      && Number.isFinite(requiredMonthlyCredits)
      && requiredMonthlyCredits > 0
      && monthlyBalance >= requiredMonthlyCredits;

    var recommended = "";
    if (allowPass && opts.hasActivePassTier !== true) recommended = "pass";
    else if (allowMonthly && monthlyCovers) recommended = "monthly";
    else if (allowDirect) recommended = "direct";
    else if (allowMonthly) recommended = "monthly";
    else if (allowPass) recommended = "pass";

    // 추천이 맨 앞, 나머지는 종전 비추천 순서(direct → monthly → pass)를 그대로 지킨다.
    var rest = [];
    if (allowDirect && recommended !== "direct") rest.push("direct");
    if (allowMonthly && recommended !== "monthly") rest.push("monthly");
    if (allowPass && recommended !== "pass") rest.push("pass");

    return {
      recommended: recommended,
      order: recommended ? [recommended].concat(rest) : rest,
      monthlyCovers: monthlyCovers,
    };
  }

  /**
   * 이용권 상점 진입 URL. cdco=1 이 붙은 진입만 /points 가 결제 확인 모달을 자동으로 연다
   * (app/points/PointsClient.tsx) — 그냥 상점 구경으로 들어온 사용자에게는 열지 않는다.
   */
  function buildPassStoreUrl(options) {
    var opts = options || {};
    var plan = text(opts.plan) || resolveStorePlan(opts.costCoins, opts.currentTier);
    var params = [];
    if (plan) params.push("plan=" + encodeURIComponent(plan));
    params.push("source=" + encodeURIComponent(text(opts.source) || "payment-choice-pass-store"));
    params.push("cdco=1");
    return "/points?" + params.join("&");
  }

  function shouldUseAppStoreEntry() {
    // 🔴 앱 판별 정본은 js/core/app-context.js 하나다. 여기서 자체 판정을 되살리지 말 것 —
    // 예전에는 "가드 설치 여부"만 봐서, 주입이 어긋나면 앱인데도 /points(앱 번들에 없음)로 갔다.
    try {
      var ctx = typeof globalThis !== "undefined" ? globalThis.__cdAppContext : null;
      if (ctx && typeof ctx.isApp === "function") return ctx.isApp();
    } catch (_ctxError) { /* noop */ }

    // 정본 미로딩 폴백. 정본과 같은 신호만 보되 Capacitor 존재 여부로 넓히지 않는다.
    var win = runtimeWindow();
    if (!win) return false;
    try {
      if (win.__cdAppPaymentGuard && win.__cdAppPaymentGuard.installed === true) return true;
      if (text(win.__CODE_DESTINY_RUNTIME_TARGET) === "mobile-app") return true;
      if (typeof document !== "undefined" && document.documentElement
        && text(document.documentElement.getAttribute("data-runtime-target")) === "mobile-app") return true;
      var capacitor = win.Capacitor;
      if (capacitor && typeof capacitor.isNativePlatform === "function" && capacitor.isNativePlatform() === true) return true;
    } catch (_appError) { /* noop */ }
    return false;
  }

  // ── 결제창 단일 인스턴스 락 ────────────────────────────────────────────────────────
  // 🔴 세 렌더러(정적 셸 · React · 독립 정적)가 각자 자기 락만 갖고 있어 서로를 못 봤다. 그래서
  // ① 셸이 12초 붙잡아 둔 handoff 모달 위에 재제안 결제창이 덧붙고(index.html _cdHoldHandoffChoiceModal)
  // ② 독립 정적은 고정 id 를 확인 없이 append 해 같은 id 오버레이가 2개 생기고
  // ③ React 가드는 DOM 결합이라 셸/독립 모달을 아예 못 봤다.
  // 셸에만 있던 싱글턴(__cdDirectPaymentChoiceActive, TTL 120초)을 여기로 올려 정본으로 삼는다.
  // 새 계층을 얹는 게 아니라 흩어진 같은 장치를 한 곳으로 모으는 것이다.
  //
  // 🔴 상태는 모듈 클로저가 아니라 window 에 둔다. 이 파일은 classic script(globalThis.__cdCheckoutEntry)
  // 와 webpack import 두 경로로 로드돼 인스턴스가 둘이므로, 클로저에 두면 React 와 셸이 서로를 못 본다.
  var CHOICE_LOCK_KEY = "__cdPaymentChoiceLock";
  var CHOICE_LOCK_TTL_MS = 120000;
  // 세 렌더러가 붙이는 결제창 노드를 모두 잡는 선택자. 새 렌더러를 만들지 말 것(정본은 셸 인라인).
  var CHOICE_MODAL_SELECTOR = ".cd-direct-payment-modal, [data-cd-react-payment-choice], #cdStandalonePaymentChoice";

  function removeNode(node) {
    try {
      if (node && node.parentNode) node.parentNode.removeChild(node);
    } catch (_removeError) { /* noop */ }
  }

  function nodeAttached(node) {
    try {
      return !!(node && typeof document !== "undefined" && document.body && document.body.contains(node));
    } catch (_attachedError) {
      return false;
    }
  }

  /** 만료됐거나 노드가 사라진 락은 스스로 비운다(형제 단일비행 가드들과 같은 계약). */
  function readChoiceLock() {
    var win = runtimeWindow();
    if (!win) return null;
    var active = win[CHOICE_LOCK_KEY];
    if (!active) return null;
    var expired = Date.now() - Number(active.startedAt || 0) > CHOICE_LOCK_TTL_MS;
    // 노드를 아직 달지 않은 락(획득 직후 ~ appendChild 사이)은 노드 부재로 버리지 않는다.
    var orphaned = active.node && !nodeAttached(active.node);
    if (expired || orphaned) {
      removeNode(active.node);
      win[CHOICE_LOCK_KEY] = null;
      return null;
    }
    return active;
  }

  /**
   * 결제창을 열 권리를 얻는다. 이미 열려 있으면 null 을 돌려주고, 호출부는 기존 모달에 포커스를 주고
   * 'cancel' 을 반환한다(셸이 이미 쓰던 계약 그대로).
   */
  function acquirePaymentChoiceLock(owner) {
    var win = runtimeWindow();
    if (!win) return null;
    if (readChoiceLock()) return null;
    var token = { owner: text(owner) || "anonymous", startedAt: Date.now(), node: null };
    win[CHOICE_LOCK_KEY] = token;
    return token;
  }

  /** 결제창 노드가 실제로 붙은 뒤 락에 연결한다. 스윕이 '살려둘 노드'로 인식하게 하는 지점. */
  function attachPaymentChoiceNode(token, node) {
    var win = runtimeWindow();
    if (!win || !token) return false;
    if (win[CHOICE_LOCK_KEY] !== token) return false;
    token.node = node || null;
    return true;
  }

  function releasePaymentChoiceLock(token) {
    var win = runtimeWindow();
    if (!win || !token) return false;
    if (win[CHOICE_LOCK_KEY] !== token) return false;
    win[CHOICE_LOCK_KEY] = null;
    return true;
  }

  function getPaymentChoiceLockNode() {
    var active = readChoiceLock();
    return active ? active.node || null : null;
  }

  /**
   * 지금 살아 있는 락이 붙든 노드와 keepNode 를 제외한 결제창 노드를 전부 걷어낸다.
   * 새 결제창을 body 에 붙이기 직전에 호출한다 — 여기가 "옛 결제창이 아래 깔려 있다"를 끝내는 자리다.
   */
  function sweepOrphanChoiceModals(keepNode) {
    if (typeof document === "undefined" || !document.body) return 0;
    var lockNode = getPaymentChoiceLockNode();
    var removed = 0;
    try {
      var nodes = document.querySelectorAll(CHOICE_MODAL_SELECTOR);
      for (var i = 0; i < nodes.length; i += 1) {
        var node = nodes[i];
        if (node === keepNode || node === lockNode) continue;
        removeNode(node);
        removed += 1;
      }
    } catch (_sweepError) { /* noop */ }
    return removed;
  }

  function hasOpenPaymentChoiceModal() {
    if (readChoiceLock()) return true;
    if (typeof document === "undefined") return false;
    try {
      return !!document.querySelector(CHOICE_MODAL_SELECTOR);
    } catch (_queryError) {
      return false;
    }
  }

  function sessionStore() {
    try {
      if (typeof sessionStorage === "undefined" || !sessionStorage) return null;
      return sessionStorage;
    } catch (_sessionError) {
      return null;
    }
  }

  /** 이용권을 사러 떠나기 직전에 남기는 복귀 지점. 이동 전에 호출한다. */
  function rememberCheckoutReturn(options) {
    var store = sessionStore();
    if (!store) return false;
    var opts = options || {};
    var url = text(opts.url);
    if (!url) return false;
    try {
      store.setItem(RETURN_KEY, JSON.stringify({
        url: url,
        label: text(opts.label),
        featureKey: text(opts.featureKey),
        savedAt: Date.now(),
      }));
      return true;
    } catch (_writeError) {
      return false;
    }
  }

  /**
   * 복귀 지점을 읽고 **즉시 지운다**. 지우고 나서 이동해야 목적지에서 같은 지점을 다시 읽어
   * 왕복하는 루프가 생기지 않는다.
   */
  function consumeCheckoutReturn() {
    var store = sessionStore();
    if (!store) return null;
    var raw = null;
    try {
      raw = store.getItem(RETURN_KEY);
      store.removeItem(RETURN_KEY);
    } catch (_readError) {
      return null;
    }
    if (!raw) return null;
    try {
      var parsed = JSON.parse(raw);
      if (!parsed || !text(parsed.url)) return null;
      var age = Date.now() - Number(parsed.savedAt || 0);
      if (!(age >= 0) || age > RETURN_TTL_MS) return null;
      return { url: text(parsed.url), label: text(parsed.label), featureKey: text(parsed.featureKey) };
    } catch (_parseError) {
      return null;
    }
  }

  function funnelEndpoint() {
    var win = runtimeWindow();
    var base = "";
    try {
      base = text(win && win.__CD_API_BASE_URL);
    } catch (_baseError) { /* noop */ }
    return (base ? base.replace(/\/+$/, "") : "") + FUNNEL_PATH;
  }

  /**
   * 결제 퍼널 계측. 개인식별자는 보내지 않는다(userId·프로필·생년 정보 없음).
   * 🔴 결제 경로에서 불리므로 어떤 실패도 밖으로 새면 안 된다 — 전 구간 try/catch, 응답도 보지 않는다.
   *
   * 🔴 반드시 application/json 으로 보낸다. /api/billing/* 은 enforceSensitiveEndpointSecurity 의
   * requireJson 가드가 걸려 있어 다른 content-type 은 400(INVALID_CONTENT_TYPE)일 뿐 아니라
   * **addAbuseScore 까지 올린다** — 즉 계측 요청이 공격 트래픽으로 집계돼 실제 사용자가 차단될 수 있다.
   * (첫 배포에서 sendBeacon 의 text/plain 으로 나가 전 이벤트가 400 을 맞았다.)
   *
   * sendBeacon 대신 keepalive fetch 를 쓴다 — 화면 전환·언로드에서 살아남는 보장은 같으면서,
   * 교차 출처(앱 런타임의 __CD_API_BASE_URL)에서 프리플라이트가 필요할 때도 정상 동작한다.
   * sendBeacon 은 프리플라이트를 못 해 그 경우 조용히 유실된다. 본문은 200바이트 남짓이라
   * keepalive 의 64KB 상한과 무관하다.
   */
  function trackCheckoutEvent(name, payload) {
    try {
      var eventName = text(name);
      if (!FUNNEL_EVENTS[eventName]) return false;
      if (typeof fetch !== "function") return false;
      var body = JSON.stringify({
        name: eventName,
        featureKey: text(payload && payload.featureKey),
        option: text(payload && payload.option),
        renderer: text(payload && payload.renderer),
        coinPrice: Math.max(0, Math.floor(Number((payload && payload.coinPrice) || 0))),
        hasPassHint: text(payload && payload.hasPassHint),
        dwellMs: Math.max(0, Math.floor(Number((payload && payload.dwellMs) || 0))),
        // 클릭→PG창 단계 소요. "checkout=812ms sdk=3ms config=0ms customer=0ms" 형태의 짧은 문자열이고
        // 개인식별자가 없다(이 채널의 계약 그대로). 총합은 dwellMs 로 따로 싣는다.
        steps: text(payload && payload.steps).slice(0, 120),
        runtime: shouldUseAppStoreEntry() ? "app" : "web",
      });
      // 같은 이벤트를 GA4 로도 흘려보낸다. 1st-party 적재(위 fetch)는 읽는 경로가 아직 없어
      // 퍼널을 눈으로 볼 수 없었다. cdTrack 은 측정 ID 가 없으면 no-op 이고 내부에서 삼킨다.
      var trackWin = runtimeWindow();
      if (trackWin && typeof trackWin.cdTrack === "function") {
        trackWin.cdTrack(eventName, {
          feature_key: text(payload && payload.featureKey),
          option: text(payload && payload.option),
          coin_price: Math.max(0, Math.floor(Number((payload && payload.coinPrice) || 0))),
        });
      }
      void fetch(funnelEndpoint(), {
        method: "POST",
        body: body,
        keepalive: true,
        credentials: "omit",
        headers: { "Content-Type": "application/json" },
      }).catch(function () { /* 계측 실패는 삼킨다 */ });
      return true;
    } catch (_trackError) {
      return false;
    }
  }

  return {
    VERSION: 1,
    RETURN_KEY: RETURN_KEY,
    RETURN_TTL_MS: RETURN_TTL_MS,
    FUNNEL_PATH: FUNNEL_PATH,
    PASS_STORE_PLAN_ORDER: PASS_STORE_PLAN_ORDER,
    CHOICE_MODAL_SELECTOR: CHOICE_MODAL_SELECTOR,
    CHOICE_LOCK_TTL_MS: CHOICE_LOCK_TTL_MS,
    acquirePaymentChoiceLock: acquirePaymentChoiceLock,
    attachPaymentChoiceNode: attachPaymentChoiceNode,
    releasePaymentChoiceLock: releasePaymentChoiceLock,
    getPaymentChoiceLockNode: getPaymentChoiceLockNode,
    sweepOrphanChoiceModals: sweepOrphanChoiceModals,
    hasOpenPaymentChoiceModal: hasOpenPaymentChoiceModal,
    text: checkoutText,
    displayLocale: displayLocale,
    pgWindowLocale: pgWindowLocale,
    formatKrwAmount: formatKrwAmount,
    mintPaymentAttemptScope: mintPaymentAttemptScope,
    resolveCheckoutRecommendation: resolveCheckoutRecommendation,
    resolveStorePlan: resolveStorePlan,
    buildPassStoreUrl: buildPassStoreUrl,
    shouldUseAppStoreEntry: shouldUseAppStoreEntry,
    rememberCheckoutReturn: rememberCheckoutReturn,
    consumeCheckoutReturn: consumeCheckoutReturn,
    trackCheckoutEvent: trackCheckoutEvent,
  };
});
