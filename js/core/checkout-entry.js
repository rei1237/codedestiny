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
 *
 * 🔴 "누가 실행하는가"는 이미 다른 곳에서 정리돼 있다 — 여기서 다시 만들지 말 것.
 * 정적 셸(index.html) · 독립 정적(js/destiny-profile.js) · React(app/_lib/billing-client.ts) 셋 다
 * window._cdChooseServicePaymentMode 에 자기 렌더러를 등록하려 시도하지만, 실제로 뜨는 것은 하나뿐이다 —
 * 셸이 항상 우선하고(non-deferred 스크립트라 사실상 먼저 실행되며, 셸 등록에는 __cdReactFallback 이
 * 없다), 셸이 없으면 독립 정적이, 그마저 없으면 React 가 자기 모달을 여는 최후 폴백(fn.__cdReactFallback
 * = true 로 스스로를 표시)만 등록한다. 이 순서는 세 플래그로 지켜진다: fn.__cdSupportsPassChoice(정본
 * 자격 마크) · window.__cdChooseServicePaymentModeCanonical(지금 정본으로 뽑힌 렌더러 참조) ·
 * window.__cdRestoreCanonicalPaymentMode(독립 정적/React 가 먼저 떠도 셸이 나중에 로드되면 그 자리에서
 * 인수하는 복구 훅 — verify-payment-choice-single-instance.mjs 의 "셸이 인수한다" 테스트가 이 훅을 검증).
 * 실제 등록 코드는 index.html · js/destiny-profile.js · app/_lib/billing-client.ts
 * installReactPaymentChoiceBridge 세 곳에 각자 있다. 이 파일이 공유하는 것은 "무엇을 그리는가"(카드
 * 마크업·CSS, buildPaymentChoiceCardsHtml/PAYMENT_CHOICE_CSS_RULES)뿐이고, 세 렌더러가 동시에 뜨는 일은
 * 저 레지스트리가 이미 막는다 — DOM 부착 자체를 여기로 합치려 하지 말 것(리뷰·롤백 단위가 다른 별개
 * 트랙이다).
 */
(function (factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof globalThis !== "undefined") globalThis.__cdCheckoutEntry = api;
})(function () {
  "use strict";

  var PASS_STORE_PLAN_ORDER = ["standard", "premium", "vvip", "family"];

  // 결제 선택창(이용권/단건/월정석 카드) 공용 CSS 규칙 — 정본. 셸(index.html)·React(billing-client.ts)·
  // 독립 정적(destiny-profile.js) 세 렌더러가 각자 배열을 복붙해 유지하던 것을 여기 하나로 모았다.
  // 세 곳 모두 이 배열을 참조만 하고 각자 <style id="cdDirectPaymentStyles"> 부착은 그대로 소유한다.
  var PAYMENT_CHOICE_CSS_RULES = [
      '.cd-direct-payment-modal{position:fixed;inset:0;z-index:2147483004;display:none;align-items:center;justify-content:center;padding:max(16px,env(safe-area-inset-top,0px)) 16px max(16px,env(safe-area-inset-bottom,0px));background:rgba(10,7,20,.86);backdrop-filter:blur(14px);overflow:auto}',
      '.cd-direct-payment-modal.is-open{display:flex}',
      '.cd-direct-payment-dialog{width:min(520px,100%);max-height:calc(100dvh - 32px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px));border:1px solid rgba(232,200,138,.28);border-radius:20px;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,0) 30%),linear-gradient(160deg,#241D40,#1A1530 52%,#100C1E);color:#EDE8F5;box-shadow:0 26px 78px rgba(0,0,0,.55),inset 0 1px 0 rgba(253,242,217,.1);padding:0 20px 20px;position:relative;z-index:1;overflow:auto;overflow-x:hidden;scrollbar-width:thin;isolation:isolate}',
      '.cd-direct-payment-hairline{display:block;position:relative;height:2px;margin:0 -20px 18px;background:linear-gradient(90deg,transparent,rgba(232,200,138,.85) 50%,transparent)}',
      '.cd-direct-payment-hairline::after{content:"";position:absolute;top:50%;left:0;width:6px;height:6px;margin-top:-3px;border-radius:50%;pointer-events:none;background:radial-gradient(circle,#f4bed1 0%,rgba(244,190,209,.55) 55%,rgba(244,190,209,0) 80%);box-shadow:0 0 8px 2px rgba(244,190,209,.4);opacity:.6;animation:cdMoonlitPetalDrift 7s ease-in-out infinite}',
      '.cd-direct-payment-guide{display:flex;align-items:center;gap:14px;margin:0 0 16px}',
      '.cd-direct-payment-guide__pig{flex:0 0 auto;width:88px;height:auto;border-radius:22px;filter:drop-shadow(0 0 16px rgba(244,190,209,.38))}',
      '.cd-direct-payment-guide__copy{min-width:0}',
      '.cd-direct-payment-title{margin:0 0 5px;font-family:\'CodeDestinySerifLatin\',\'CodeDestinySerifKR\',\'Nanum Myeongjo\',\'Gowun Batang\',var(--font-body);font-size:20px;font-weight:700;letter-spacing:-.01em;line-height:1.32;color:#F6EFE0;word-break:keep-all}',
      '.cd-direct-payment-sub{margin:0;font-size:13px;line-height:1.5;color:rgba(237,232,245,.82);word-break:keep-all}',
      '.cd-direct-payment-sub--reason{margin:10px 0 0;padding:9px 11px;border-radius:10px;border:1px solid rgba(232,200,138,.22);background:#1E1836;color:#F0DFB8;font-size:12.5px}',
      '.cd-direct-payment-note{position:relative;margin:0 0 14px;padding:12px 14px;border-radius:12px;border:1px solid rgba(232,200,138,.16);background:#201A3A;color:#9B92B8;font-size:12.5px;line-height:1.5}',
      '.cd-direct-payment-note strong{display:block;margin-bottom:4px;color:#F5F1FB;font-size:15px;font-weight:700;line-height:1.32;word-break:keep-all}',
      '.cd-direct-payment-note span{display:block}',
      '.cd-direct-payment-choice-grid{display:grid;grid-template-columns:1fr;gap:9px}',
      // 2단계(결제수단) 그리드. 🔴 1단계 그리드와 클래스를 나눈다 — verify-checkout-pass-card 가
      // `.cd-direct-payment-choice-grid [data-mode]` 의 첫 요소를 이용권 카드로 단언하므로,
      // 같은 클래스를 재사용하면 2단계 버튼이 그 단언에 끼어든다.
      '.cd-direct-payment-method-grid{display:grid;grid-template-columns:1fr;gap:9px}',
      '.cd-direct-payment-method-prompt{margin:0 0 10px;font-size:13px;line-height:1.5;color:rgba(237,232,245,.82);word-break:keep-all}',
      '.cd-direct-payment-method-back{display:inline-flex;align-items:center;margin:0 0 10px;padding:6px 13px;border:1px solid rgba(232,200,138,.2);border-radius:999px;background:transparent;color:rgba(237,232,245,.82);font-size:12.5px;font-weight:700;line-height:1.35;cursor:pointer;transition:border-color 170ms ease,color 170ms ease}',
      '.cd-direct-payment-method-back:hover{border-color:rgba(232,200,138,.4);color:#EDE8F5}',
      '.cd-direct-payment-method-back:focus-visible{outline:2px solid #E8C88A;outline-offset:2px}',
      '.cd-direct-payment-option{width:100%;margin:0;padding:14px;border:1px solid rgba(232,200,138,.16);border-radius:14px;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,0) 55%),#251F45;box-shadow:inset 0 1px 0 rgba(237,232,245,.06);color:inherit;text-align:left;cursor:pointer;position:relative;overflow:hidden;transition:border-color 170ms ease,filter 170ms ease,transform 170ms ease,box-shadow 170ms ease}',
      '.cd-direct-payment-option::before{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 30%,rgba(237,232,245,.10) 46%,rgba(232,200,138,.20) 50%,rgba(237,232,245,.10) 54%,transparent 70%);transform:translateX(-120%);transition:transform 520ms ease;pointer-events:none}',
      '.cd-direct-payment-option:hover::before{transform:translateX(120%)}',
      '.cd-direct-payment-option:hover{border-color:rgba(232,200,138,.44);filter:brightness(1.04)}',
      '.cd-direct-payment-option:focus{outline:0}',
      '.cd-direct-payment-option:focus-visible{outline:2px solid #E8C88A;outline-offset:3px}',
      '.cd-direct-payment-option:active{transform:scale(.986)}',
      '.cd-direct-payment-option[data-mode="pass-store"]{border-color:rgba(232,200,138,.3)}',
      '.cd-direct-payment-option[data-mode="direct"]{border-color:rgba(232,200,138,.18)}',
      '.cd-direct-payment-option[data-mode="monthly"]{border-color:rgba(232,200,138,.18)}',
      '.cd-direct-payment-option strong{display:block;margin:0 0 4px;font-size:15px;font-weight:700;line-height:1.32;color:#F5F1FB;word-break:keep-all}',
      '.cd-direct-payment-option span{display:block;font-size:12.5px;line-height:1.45;color:#9B92B8}',
      '.cd-direct-payment-option br{display:none}',
      '.cd-direct-payment-option .cd-direct-payment-desc{display:block;font-size:12.5px;line-height:1.45;color:#9B92B8;word-break:keep-all}',
      '.cd-direct-payment-option .cd-direct-payment-cardhead{display:flex;align-items:center;gap:8px;margin:0 0 9px}',
      '.cd-direct-payment-cardhead .cd-direct-payment-badge{flex:0 0 auto;display:inline-flex;align-items:center;min-height:22px;padding:0 11px 0 15px;border-radius:6px;border:1px solid rgba(232,200,138,.32);background:#1E1836;font-size:11px;font-weight:700;letter-spacing:.01em;color:#E8C88A;clip-path:polygon(0% 50%,9% 0%,100% 0%,100% 100%,9% 100%);-webkit-clip-path:polygon(0% 50%,9% 0%,100% 0%,100% 100%,9% 100%)}',
      '.cd-direct-payment-badge .cd-direct-payment-glyph{display:inline;margin-right:5px;font-size:11.5px;line-height:1}',
      '.cd-direct-payment-cardhead .cd-direct-payment-recommend{margin-left:auto;flex:0 0 auto;display:inline-flex;align-items:center;padding:3px 10px;border-radius:999px;border:1px solid rgba(244,190,209,.55);background:linear-gradient(135deg,#FDF2D9,#E8C88A);color:#170F2A;font-size:10.5px;font-weight:800;letter-spacing:.01em;box-shadow:0 0 10px rgba(244,190,209,.35)}',
      '.cd-direct-payment-option strong .cd-direct-payment-amount{display:inline;color:#E8C88A;font-size:17px;font-weight:800;letter-spacing:.01em}',
      '.cd-direct-payment-option--recommended{padding:16px;border-color:rgba(232,200,138,.55);background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,0) 45%),linear-gradient(150deg,#2E2650,#251F45);box-shadow:0 0 34px rgba(232,200,138,.2),inset 0 1px 0 rgba(253,242,217,.12)}',
      '.cd-direct-payment-option--recommended:hover{border-color:rgba(232,200,138,.78)}',
      '.cd-direct-payment-option--recommended strong{font-size:17px}',
      '.cd-direct-payment-option--recommended strong .cd-direct-payment-amount{font-size:19px}',
      '.cd-direct-payment-option--recommended .cd-direct-payment-desc{color:rgba(237,232,245,.82)}',
      '.cd-direct-payment-go{display:flex;align-items:center;justify-content:center;margin-top:12px;padding:10px 14px;border-radius:999px;background:linear-gradient(135deg,#FDF2D9,#E8C88A);color:#170F2A;font-size:13.5px;font-weight:800;letter-spacing:.01em}',
      '.cd-direct-payment-option--secondary{padding:11px 13px}',
      '.cd-direct-payment-option--secondary .cd-direct-payment-cardhead{margin-bottom:6px}',
      '.cd-direct-payment-option--secondary strong{font-size:13.5px;margin-bottom:2px}',
      '.cd-direct-payment-option--secondary strong .cd-direct-payment-amount{font-size:14.5px}',
      '.cd-direct-payment-option--secondary .cd-direct-payment-desc{font-size:11.5px;color:rgba(155,146,184,.85);display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}',
      '.cd-direct-payment-option[disabled]{cursor:not-allowed}',
      '.cd-direct-payment-option.is-disabled{cursor:not-allowed;filter:saturate(.4) brightness(.86);border-color:rgba(232,200,138,.1)}',
      '.cd-direct-payment-option.is-disabled:hover{filter:saturate(.4) brightness(.86);border-color:rgba(232,200,138,.1);transform:none}',
      '.cd-direct-payment-option.is-loading{pointer-events:none;filter:saturate(.7)}',
      '.cd-direct-payment-balance-check{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;margin:0;padding:9px 12px;border:1px solid rgba(232,200,138,.3);border-radius:999px;background:rgba(232,200,138,.06);color:#E8C88A;font-size:12.5px;font-weight:700;line-height:1.35;cursor:pointer;transition:border-color 170ms ease,background 170ms ease}',
      '.cd-direct-payment-balance-check:hover{border-color:rgba(232,200,138,.55);background:rgba(232,200,138,.12)}',
      '.cd-direct-payment-balance-check[disabled]{opacity:.6;cursor:default}',
      '.cd-direct-payment-balance-value{display:block;margin:6px 2px 0;color:rgba(237,232,245,.86);font-size:12.5px;line-height:1.45;text-align:center;word-break:keep-all}',
      '.cd-direct-payment-balance-value.is-error{color:#FCA5A5}',
      '.cd-direct-payment-status{min-height:16px;margin:10px 0 0;color:#E8C88A;font-size:12px;line-height:1.45}',
      '.cd-direct-payment-legal{margin:12px 0 0;padding:0;color:rgba(155,146,184,.72);font-size:11px;line-height:1.5;word-break:keep-all}',
      '.cd-direct-payment-actions{display:flex;justify-content:flex-end;margin-top:12px}',
      '.cd-direct-payment-cancel{border:1px solid rgba(232,200,138,.2);border-radius:999px;background:transparent;color:rgba(237,232,245,.82);padding:9px 18px;cursor:pointer;font-size:13px;font-weight:700;transition:border-color 170ms ease,color 170ms ease}',
      '.cd-direct-payment-cancel:hover{border-color:rgba(232,200,138,.4);color:#EDE8F5}',
      '.cd-direct-payment-cancel:focus-visible{outline:2px solid #E8C88A;outline-offset:2px}',
      '.cd-direct-payment-modal.is-open::before,.cd-direct-payment-modal.is-open::after{content:"";position:absolute;width:5px;height:5px;border-radius:50%;pointer-events:none;background:radial-gradient(circle,#E8C88A 0%,rgba(232,200,138,.5) 55%,rgba(232,200,138,0) 78%);box-shadow:0 0 10px 2px rgba(232,200,138,.45);opacity:.5}',
      '.cd-direct-payment-modal.is-open::before{left:20%;top:24%;animation:cdMoonlitFireflyA 9s ease-in-out infinite}',
      '.cd-direct-payment-modal.is-open::after{right:18%;bottom:22%;animation:cdMoonlitFireflyB 12s ease-in-out infinite 1.6s}',
      '@keyframes cdMoonlitFireflyA{0%,100%{transform:translate3d(0,0,0);opacity:.32}25%{opacity:.68}50%{transform:translate3d(16px,-20px,0);opacity:.48}75%{opacity:.6}}',
      '@keyframes cdMoonlitFireflyB{0%,100%{transform:translate3d(0,0,0);opacity:.28}30%{opacity:.58}55%{transform:translate3d(-18px,16px,0);opacity:.42}80%{opacity:.55}}',
      '@keyframes cdMoonlitPetalDrift{0%{left:2%;opacity:0}10%{opacity:.6}50%{left:94%;opacity:.75}90%{opacity:.5}100%{left:2%;opacity:0}}',
      '@media(max-width:760px){.cd-direct-payment-dialog{padding:0 14px 14px}.cd-direct-payment-hairline{margin:0 -14px 14px}.cd-direct-payment-guide{gap:11px;margin-bottom:13px}.cd-direct-payment-guide__pig{width:64px}.cd-direct-payment-title{font-size:18px}.cd-direct-payment-sub{font-size:12.5px}.cd-direct-payment-note{padding:11px 12px;margin-bottom:11px}.cd-direct-payment-note strong{font-size:14px}.cd-direct-payment-choice-grid,.cd-direct-payment-method-grid{gap:8px}.cd-direct-payment-option{padding:12px}.cd-direct-payment-option--recommended{padding:14px}.cd-direct-payment-option--recommended strong{font-size:15.5px}.cd-direct-payment-option--recommended strong .cd-direct-payment-amount{font-size:17px}.cd-direct-payment-go{margin-top:10px;padding:9px 12px;font-size:13px}.cd-direct-payment-option--secondary{padding:10px 12px}.cd-direct-payment-option--secondary strong{font-size:13px}.cd-direct-payment-legal{font-size:10.5px}}',
      '@media(prefers-reduced-motion:reduce){.cd-direct-payment-option,.cd-direct-payment-option::before,.cd-direct-payment-cancel{transition:none}.cd-direct-payment-option:active{transform:none}.cd-direct-payment-modal.is-open::before,.cd-direct-payment-modal.is-open::after,.cd-direct-payment-hairline::after{animation:none!important}}'
  ];
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
   * 결제창을 띄우는 기기가 **확실한 데스크톱**인지.
   *
   * 🔴 이 판정의 유일한 용도는 pgWindowLocale() 의 중국어 분기다. 이니시스는 PC 결제창에서만
   *    중국어를 지원하므로(아래 pgWindowLocale 주석), "우리가 데스크톱이라 부르는 집합"이
   *    "포트원이 PC 결제창으로 보내는 집합"의 **부분집합**이어야 한다.
   *
   * 🔴 그래서 5개 조건을 전부 논리곱으로 걸고 **미상은 전부 false 로 떨군다.**
   *    거짓 음성(진짜 PC 를 모바일로 봄)의 결과는 EN_US = 오늘과 동일이라 회귀가 0 이다.
   *    위험한 것은 거짓 양성뿐이므로 판정을 한쪽으로만 기울인다.
   *
   * 조건 4 는 any-pointer 가 아니라 pointer(주 입력장치)다 — 마우스가 달린 Windows 터치
   * 노트북은 pointer:fine 이라 PC 로 남는다(터치를 지원한다고 모바일이 아니다).
   * 조건 5 는 iPadOS 데스크톱 모드 봉합이다 — 터치되는 Macintosh 는 존재하지 않으므로
   * Macintosh + maxTouchPoints > 0 은 정의상 위장이다.
   */
  function isDesktopPgWindow() {
    try {
      var win = runtimeWindow();
      var nav = win && win.navigator;
      if (!nav) return false;
      var ua = text(nav.userAgent);
      if (!ua) return false;
      if (/Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|BlackBerry|Opera Mini|IEMobile|webOS/i.test(ua)) return false;
      if (typeof win.matchMedia !== "function") return false;
      if (win.matchMedia("(pointer: coarse)").matches) return false;
      if (/Macintosh/i.test(ua) && Number(nav.maxTouchPoints) > 0) return false;
      return true;
    } catch (_desktopError) {
      return false;
    }
  }

  /**
   * PG 결제창(이니시스)의 UI 언어.
   *
   * 🔴 쓸 수 있는 값은 우리가 아니라 **PG 가 정한다.** KG이니시스는 PC 결제창에서
   *    한국어·영어·중국어(간체)를, 모바일 결제창에서 **한국어·영어만** 지원한다.
   *    인용 가능한 정본은 npm 배포 아티팩트다 — `@portone/browser-sdk@0.1.9` 의
   *    `dist/v2/entity/Locale.d.ts` 가 중국어 값에만 "KG이니시스 (PC)" 한정자를
   *    달아 두었다(2026-08-31 확인). 문서 사이트의 표는 리라이트로 사라진 적이 있으나
   *    배포된 npm 버전은 고정된다.
   *
   * 🔴 지원 밖 값을 보냈을 때의 동작은 **어디에도 문서화돼 있지 않다.** 가장 가까운 선례인
   *    모바일 빌링키 발급이 "해당 파라미터를 지원하지 않고 항상 한국어로 노출됩니다" 이므로,
   *    모바일에 중국어를 무조건 보내면 지금(영어)보다 나빠질 수 있다. 그래서 중국어는
   *    isDesktopPgWindow() 가 참일 때만 나간다 — 거짓 음성은 오늘과 동일한 EN_US 다.
   *
   * 🔴 zh-TW 는 데스크톱에서도 EN_US 다 — 이니시스가 지원하는 중국어는 간체이고
   *    이 레포는 간체/번체를 엄격히 분리해 왔다(번체 사용자에게 간체 결제창을 띄우지 않는다).
   *
   * 🔴 리터럴 `return "X"` 형태를 유지할 것 — 가드가 소스에서 정규식으로 전수 추출해
   *    허용 집합과 대조한다(scripts/verify-portone-single-payment-regression.mjs).
   *    룩업 테이블로 리팩터하면 그 추출이 조용히 빈 집합이 된다.
   *
   * 🔴 windowType 은 이 설계에 등장하지 않는다 — PC/모바일 결제창 선택은 PG 가 하고,
   *    우리가 지정하면 결제창이 아예 안 뜬다(PR #104 회귀).
   */
  function pgWindowLocale() {
    try {
      var win = runtimeWindow();
      var lang = win && typeof win.cdGetCurrentLanguage === "function" ? text(win.cdGetCurrentLanguage()) : "";
      if (!lang || lang.toLowerCase().indexOf("ko") === 0) return "KO_KR";
      if (lang === "zh-CN" && isDesktopPgWindow()) return "ZH_CN";
      return "EN_US";
    } catch (_pgLocaleError) {
      return "KO_KR";
    }
  }

  /**
   * 이니시스 결제창에 넘길 bypass 파라미터.
   *
   * 🔴 `global_visa3d=Y` 는 **모바일 결제창 전용** 해외카드 노출 옵션이고
   *    bypass.inicis_v2.P_RESERVED 밖에는 실을 자리가 없다. 이걸 안 보내면 해외카드
   *    특약이 승인돼도 모바일 결제창에 해외카드 탭이 안 뜰 수 있다.
   *
   * 🔴 P_RESERVED 는 배열이므로 옵션을 늘릴 때 **append** 한다 — 통째로 갈아끼우면
   *    기존 플래그가 조용히 사라진다.
   *
   * 🔴 이니시스 채널일 때만 붙인다 — 다른 PG 채널에 inicis_v2 키를 실었을 때의 동작은
   *    미문서이고, 거절이라면 결제창이 아예 안 뜬다. 그 게이팅은 호출부에 있다
   *    (셸·독립은 directPayFields.channelKeyName 이 비어 있을 때만 부착).
   */
  function portoneBypass() {
    return { inicis_v2: { P_RESERVED: ["global_visa3d=Y"] } };
  }
  /** 금액을 현재 로케일 자릿수 + 통화 문구로 그린다(정적 셸 formatWon 과 같은 계약). */
  function formatKrwAmount(value, fallbackText) {
    var amount = Math.max(0, Math.floor(Number(value) || 0)).toLocaleString(displayLocale());
    return checkoutText("payment.currency.krw", fallbackText || "{amount}원", { amount: amount });
  }

  // ── 해외카드 결제 — 참고 환산과 원화 청구 고지 ───────────────────────────────────────
  //
  // 🔴 **지원 통화는 KRW 하나다.** KG이니시스 해외카드결제 특약은 승인·정산이 모두 원화다
  //    (help.portone.io/content/inicis-international, 2026-08-28 확인). 아래 표는 화면에 괄호로
  //    개산가를 보여 주기 위한 것이고, **결제 금액 계산에 쓰지 않는다.** 환산값이
  //    totalAmount·paymentAmount·currency 로 흘러들어가면 화면 금액 ≠ 승인 금액이 되어 PG 심사에서
  //    걸린다 — 그걸 scripts/verify-overseas-payment-notice.mjs 가 막는다.
  //
  // 🔴 실시간 환율 API 를 부르지 않는다. 환율이 움직일 때마다 표시가가 바뀌면 그것만으로 가격
  //    정책이 되어 버리고, 실제 청구는 여전히 KRW 라 사용자에게 두 숫자가 어긋난다.
  //    값은 app/nakshatra/_lib/copy.ts 의 기존 표와 같은 2026-08 기준이다.
  var REFERENCE_FX_AS_OF = "2026-08";
  /** 통화 1단위당 원. 로케일에 해당 항목이 없으면 보조 표기를 아예 그리지 않는다. */
  var REFERENCE_FX_BY_LANG = {
    en: { code: "USD", symbol: "$", krwPerUnit: 1350 },
    ja: { code: "JPY", symbol: "¥", krwPerUnit: 9.2 },
    "zh-CN": { code: "CNY", symbol: "¥", krwPerUnit: 188 },
    "zh-TW": { code: "TWD", symbol: "NT$", krwPerUnit: 43 },
    de: { code: "EUR", symbol: "€", krwPerUnit: 1460 },
    fr: { code: "EUR", symbol: "€", krwPerUnit: 1460 },
    nl: { code: "EUR", symbol: "€", krwPerUnit: 1460 },
    es: { code: "EUR", symbol: "€", krwPerUnit: 1460 },
    vi: { code: "VND", symbol: "₫", krwPerUnit: 0.0551 },
    hi: { code: "INR", symbol: "₹", krwPerUnit: 16.2 },
    ms: { code: "MYR", symbol: "RM", krwPerUnit: 288 },
  };

  function currentLang() {
    try {
      var win = runtimeWindow();
      return win && typeof win.cdGetCurrentLanguage === "function" ? text(win.cdGetCurrentLanguage()) : "";
    } catch (_langError) {
      return "";
    }
  }

  /** 한국어 화면인가. 고지·보조 표기를 통째로 생략하는 유일한 조건이다. */
  function isKoreanSurface() {
    var lang = currentLang();
    return !lang || lang.toLowerCase().indexOf("ko") === 0;
  }

  /**
   * 개산가는 **유효숫자 2자리**로 자른다. 그래야 $7.41 처럼 확정가로 보이지 않고, 환율 표가
   * 조금 낡아도 표시가가 틀렸다고 읽힐 여지가 줄어든다.
   */
  function roundToTwoSignificantDigits(value) {
    var n = Number(value);
    if (!isFinite(n) || n <= 0) return 0;
    var magnitude = Math.pow(10, Math.floor(Math.log10(n)) - 1);
    return Math.round(n / magnitude) * magnitude;
  }

  /**
   * 원화 금액의 현지통화 **참고** 표기(예: "$7.4"). 한국어거나 환산표에 없는 로케일이면
   * 빈 문자열을 돌려 호출부가 보조 표기를 통째로 생략하게 한다.
   * 🔴 리턴값은 **표시 전용**이다 — 결제 요청 필드에 실으면 안 된다.
   */
  function formatReferenceAmount(krwAmount) {
    var krw = Number(krwAmount);
    if (!isFinite(krw) || krw <= 0) return "";
    if (isKoreanSurface()) return "";
    var fx = REFERENCE_FX_BY_LANG[currentLang()];
    if (!fx) return "";
    var converted = roundToTwoSignificantDigits(krw / fx.krwPerUnit);
    if (converted <= 0) return "";
    var digits = Math.max(0, 1 - Math.floor(Math.log10(converted)));
    return fx.symbol + converted.toLocaleString(displayLocale(), {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  /**
   * 결제창 하단에 붙는 원화 청구 고지 한 줄. 한국어 화면에서는 빈 문자열이다
   * (국내 사용자에게는 자명한 사실이라 결제 임계화면의 노이즈다).
   *
   * 🔴 세 렌더러(정적 셸·React·독립 정적)가 문구를 각자 적지 않고 이 하나를 부른다 — 사본을
   *    만들면 한 렌더러만 고지가 낡는다(buildDirectPayMethodStepHtml 과 같은 계약).
   * 🔴 기존 .cd-direct-payment-legal 스타일을 그대로 상속한다 — CSS 를 늘리면
   *    PAYMENT_CHOICE_CSS_RULES 가 바뀌고 verify:payment-choice-parity 가 세 곳을 다시 맞춰야 한다.
   * 🔴 data-mode 를 붙이지 않는다(세 렌더러가 "누르면 닫는" 노드로 일괄 처리한다).
   */
  function buildOverseasChargeNoticeHtml(input) {
    var opts = input || {};
    if (isKoreanSurface()) return "";
    var escape = opts.escape || function (value) { return String(value === null || value === undefined ? "" : value); };
    var approx = formatReferenceAmount(opts.amountKrw);
    var approxHtml = approx
      ? escape(checkoutText("payment.overseas.approx", "약 {amount} 상당", { amount: approx })) + " · "
      : "";
    return (
      '<p class="cd-direct-payment-legal" data-overseas-notice>'
      + approxHtml
      + escape(checkoutText(
        "payment.overseas.chargedInKrw",
        "결제는 원화(KRW)로 승인됩니다. 해외 카드(VISA · Mastercard · JCB · Diners)도 사용할 수 있으며, 환전은 카드사 환율로 이루어집니다.",
      ))
      + "</p>"
    );
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
   * 결제 선택 카드 한 장의 HTML. 🔴 세 렌더러(정적 셸·React·독립 정적)가 각자 손으로 유지하던 카드
   * 뼈대(배지·추천 리본·go 스트립·variant 클래스)를 여기 하나로 모은다. 조건 계산(무엇을 보여줄지,
   * 비활성 여부, 문구)은 옮기지 않는다 — 렌더러마다 실제 정보량이 다르기 때문이다(React 만의
   * aria-label, 셸/독립정적의 이용권 한도 문구 등). 호출부는 이미 계산·이스케이프된 조각만 넘긴다.
   *
   * spec 필드: allow(false면 빈 문자열) · dataMode · extraDataAttrs(예: ' data-monthly-option disabled
   * aria-disabled="true"') · extraClass(예: ' is-store') · ariaLabel(있으면 escape 후 부착) · glyph
   * (이모지) · badgeLabel(escape 대상) · titleHtml/descHtml(호출부가 이미 조립·이스케이프한 HTML) ·
   * descAttr(예: ' data-monthly-hint') · afterHtml(카드 형제로 붙는 조각 — <button> 중첩 금지라 월정석
   * 잔량 확인 버튼이 여기로 온다).
   */
  function buildPaymentChoiceOptionHtml(option, spec, ctx) {
    if (!spec || spec.allow === false) return "";
    var escape = ctx.escape || function (value) { return String(value === null || value === undefined ? "" : value); };
    var isRecommended = option === ctx.recommendedOption;
    var variantClass = isRecommended ? " cd-direct-payment-option--recommended" : " cd-direct-payment-option--secondary";
    var recommendHtml = isRecommended
      ? '<span class="cd-direct-payment-recommend">' + escape(ctx.recommendLabel) + "</span>"
      : "";
    var goHtml = isRecommended
      ? '<span class="cd-direct-payment-go">' + escape(ctx.goLabel) + "</span>"
      : "";
    var ariaAttr = spec.ariaLabel ? ' aria-label="' + escape(spec.ariaLabel) + '"' : "";
    return (
      '<button type="button" class="cd-direct-payment-option' + (spec.extraClass || "") + variantClass
      + '" data-mode="' + spec.dataMode + '"' + (spec.extraDataAttrs || "") + ariaAttr + ">"
      + '<span class="cd-direct-payment-cardhead"><span class="cd-direct-payment-badge"><span class="cd-direct-payment-glyph" aria-hidden="true">'
      + spec.glyph + "</span>" + escape(spec.badgeLabel) + "</span>" + recommendHtml + "</span>"
      + "<strong>" + spec.titleHtml + "</strong>"
      + '<span class="cd-direct-payment-desc"' + (spec.descAttr || "") + ">" + spec.descHtml + "</span>"
      + goHtml
      + "</button>"
    );
  }

  /**
   * 이용권/단건/월정석 카드를 checkoutRecommendation.order 순서대로 이어 붙인다. input.cards 는
   * { pass, direct, monthly } 형태로 각 값은 buildPaymentChoiceOptionHtml 의 spec 이다.
   */
  function buildPaymentChoiceCardsHtml(input) {
    var opts = input || {};
    var order = Array.isArray(opts.order) ? opts.order : [];
    var cards = opts.cards || {};
    var ctx = {
      escape: opts.escape,
      recommendedOption: opts.recommendedOption,
      recommendLabel: opts.recommendLabel,
      goLabel: opts.goLabel,
    };
    return order.map(function (option) {
      var spec = cards[option];
      var cardHtml = buildPaymentChoiceOptionHtml(option, spec, ctx);
      var afterHtml = cardHtml && spec && spec.afterHtml ? spec.afterHtml : "";
      return cardHtml + afterHtml;
    }).join("");
  }

  // ── 단건결제 결제수단(2단계) ────────────────────────────────────────────────────────
  //
  // 🔴 **PG 승인이 떨어지면 고치는 곳은 아래 enabled 한 줄뿐이다**(이미 있는 수단이라면). 이 표
  // 하나가 ① 준비중 배지 렌더 ② 선택 허용 여부 ③ 실제 요청에 실리는 payMethod 셋을 동시에 정한다.
  //
  // 🔴 결제수단은 이니시스 상점(MID)에 **수단별로 계약·등록**돼 있어야 결제창에 뜬다. 등록 전에
  // enabled 를 켜면 PG 가 결제창을 그리기 전에 거절해 "결제창이 아예 안 뜬다"가 된다(PR #104 의
  // windowType 회귀와 같은 증상). 승인 근거 없이 켜지 말 것.
  //
  // 🔴 **키는 카드 id 이고 PortOne 의 payMethod 는 항목 안에 있다**(2026-08-29). 예전에는 키가 곧
  // payMethod enum 이라 매핑이 없었는데, 상품권 3종이 같은 payMethod("GIFT_CERTIFICATE")를 공유하면서
  // 그 1:1 이 깨졌다 — PortOne V2 는 상품권에 giftCertificateType 을 **필수**로 요구하고 그 값을 창을
  // 열기 전에 정해야 하므로, 상품권은 종류 수만큼 카드가 필요하다. 카드 id 를 PG 로 보내면 안 되고
  // 반드시 resolveDirectPayFields() 를 거친다.
  var DIRECT_PAY_METHOD_ORDER = [
    "CARD",
    "TRANSFER",
    "KAKAOPAY",
    "MOBILE",
    "GIFT_CULTURELAND",
    "GIFT_BOOKNLIFE",
    "GIFT_SMART_MUNSANG",
  ];
  var DIRECT_PAY_METHODS = {
    CARD: { enabled: true, payMethod: "CARD", glyph: "💳" },
    TRANSFER: { enabled: true, payMethod: "TRANSFER", glyph: "🏦" },
    // 🔴 카카오페이만 **채널이 다르다**. 나머지 수단은 전부 이니시스 채널 하나를 공유하지만,
    // PortOne V2 는 requestPayment 호출당 채널키를 하나만 받으므로 카카오페이는 자기 채널키를
    // 써야 한다. 표에는 값이 아니라 **서버 config 의 필드 이름**을 둔다 — 값을 두려면 이 코어에
    // 서버 config 를 주입해야 하고, 그러면 resolveDirectPayFields 시그니처가 바뀐다.
    // easyPayProvider 는 넣지 않는다 — 카카오페이는 PG사 자체가 간편결제사라 채워도 무시된다
    // (PortOne V2 카카오페이 연동 문서, 2026-08-31 확인).
    // 🔴 orderMethod 는 **주문에 기록될 결제수단 코드**이지 PortOne 의 payMethod 가 아니다. EASY_PAY 를
    // 그대로 기록하거나 기본값 card_general 로 두면 결제내역·환불 화면이 카카오페이 결제를 "카드 결제"로
    // 표시한다. 값은 서버 라벨표(worker/routes/payments.js resolvePaymentMethodLabel)가 아는 코드와 맞춘다 —
    // 모르는 값을 보내면 그 화면이 코드 원문을 그대로 노출한다.
    KAKAOPAY: { enabled: true, payMethod: "EASY_PAY", channelKeyName: "kakaopayChannelKey", orderMethod: "kakaopay", glyph: "💛" },
    MOBILE: { enabled: false, payMethod: "MOBILE", glyph: "📱" },
    // 🔴 KG이니시스가 PortOne V2 로 태울 수 있는 상품권은 이 3종뿐이다. 해피머니·CULTURE_GIFT 는
    // 이니시스 상점에 등록돼 있어도 이 경로에 대응 값이 없어 넣을 수 없다.
    GIFT_CULTURELAND: { enabled: true, payMethod: "GIFT_CERTIFICATE", giftCertificateType: "CULTURELAND", glyph: "🎁" },
    GIFT_BOOKNLIFE: { enabled: true, payMethod: "GIFT_CERTIFICATE", giftCertificateType: "BOOKNLIFE", glyph: "📚" },
    GIFT_SMART_MUNSANG: { enabled: true, payMethod: "GIFT_CERTIFICATE", giftCertificateType: "SMART_MUNSANG", glyph: "🎮" },
  };
  var DEFAULT_DIRECT_PAY_METHOD = "CARD";

  /**
   * 결제수단 라벨.
   *
   * 🔴 **키와 폴백을 문자열 리터럴로 적는다.** 표에 labelKey 를 넣고 checkoutText(entry.labelKey, …)
   * 로 부르면 verify-payment-copy-dictionary / verify-payment-choice-parity 의 추출 정규식
   * (리터럴만 매칭)에 안 잡혀 **12로케일 검사를 조용히 통과**한다 — 그러면 비한국어 사용자만
   * "Translation pending" 을 보게 되고 가드는 초록이다.
   */
  function directPayMethodLabel(id) {
    if (id === "CARD") return checkoutText("payment.directModal.method.card", "신용카드 · 간편결제");
    if (id === "TRANSFER") return checkoutText("payment.directModal.method.transfer", "실시간 계좌이체");
    if (id === "KAKAOPAY") return checkoutText("payment.directModal.method.kakaopay", "카카오페이");
    if (id === "MOBILE") return checkoutText("payment.directModal.method.mobile", "휴대폰 소액결제");
    if (id === "GIFT_CULTURELAND") return checkoutText("payment.directModal.method.giftCultureland", "컬쳐랜드 문화상품권");
    if (id === "GIFT_BOOKNLIFE") return checkoutText("payment.directModal.method.giftBooknlife", "도서문화상품권");
    if (id === "GIFT_SMART_MUNSANG") return checkoutText("payment.directModal.method.giftSmartMunsang", "스마트문상");
    return "";
  }

  /** 아직 열리지 않은 수단의 상태 문구. 렌더러가 상태줄에 그대로 쓴다. */
  function directPayMethodComingSoonText() {
    return checkoutText("payment.directModal.method.comingSoon", "준비 중");
  }

  function isDirectPayMethodEnabled(id) {
    var entry = DIRECT_PAY_METHODS[text(id).toUpperCase()];
    return !!(entry && entry.enabled === true);
  }

  /**
   * 2단계(결제수단 고르기) 패널 HTML. 세 렌더러(정적 셸·React·독립 정적)가 각자 그리지 않고
   * 이 하나를 부른다 — 사본을 만들면 한 렌더러만 준비중 목록이 낡는다.
   *
   * 🔴 **data-mode 를 쓰지 않는다.** 세 렌더러 모두 [data-mode] 를 "누르면 모달을 닫는" 노드로
   * 일괄 처리하므로(index.html · billing-client.ts · destiny-profile.js 의 클릭 델리게이션),
   * 붙이는 순간 결제수단을 고르는 게 아니라 창이 닫힌다. 월정석 잔량 확인 버튼이 같은 이유로
   * data-mode 를 안 쓴다. 선택은 data-pay-method, 복귀는 data-pay-step="back" 이다.
   */
  function buildDirectPayMethodStepHtml(input) {
    var opts = input || {};
    var escape = opts.escape || function (value) { return String(value === null || value === undefined ? "" : value); };
    var comingSoon = directPayMethodComingSoonText();
    var activeHint = checkoutText("payment.directModal.directHint", "지금 보고 있는 콘텐츠 하나만 바로 열려요.");
    var cards = DIRECT_PAY_METHOD_ORDER.map(function (id) {
      var entry = DIRECT_PAY_METHODS[id];
      if (!entry) return "";
      var enabled = entry.enabled === true;
      var label = directPayMethodLabel(id);
      return (
        '<button type="button" class="cd-direct-payment-option cd-direct-payment-option--secondary'
        + (enabled ? "" : " is-disabled") + '" data-pay-method="' + id + '"'
        // 🔴 disabled 속성이 아니라 aria-disabled 다. 진짜 disabled 인 <button> 은 click 이벤트를
        // 아예 발화하지 않아 "왜 못 누르는지"를 말해 줄 수 없다.
        + (enabled ? "" : ' aria-disabled="true"')
        + ' aria-label="' + escape(enabled ? label : label + " (" + comingSoon + ")") + '">'
        + '<span class="cd-direct-payment-cardhead"><span class="cd-direct-payment-badge">'
        + '<span class="cd-direct-payment-glyph" aria-hidden="true">' + entry.glyph + "</span>"
        + (enabled ? "" : escape(comingSoon)) + "</span></span>"
        + "<strong>" + escape(label) + "</strong>"
        + '<span class="cd-direct-payment-desc">' + escape(enabled ? activeHint : comingSoon) + "</span>"
        + "</button>"
      );
    }).join("");
    return (
      '<button type="button" class="cd-direct-payment-method-back" data-pay-step="back">'
      + escape(checkoutText("payment.directModal.method.back", "뒤로")) + "</button>"
      + '<p class="cd-direct-payment-method-prompt" id="cdDirectPaymentMethodPrompt">'
      + escape(checkoutText("payment.directModal.method.prompt", "어떤 방법으로 결제할까요?")) + "</p>"
      + '<div class="cd-direct-payment-method-grid" role="group" aria-labelledby="cdDirectPaymentMethodPrompt">'
      + cards + "</div>"
    );
  }

  // ── 고른 결제수단 보관 ──────────────────────────────────────────────────────────────
  //
  // 🔴 상태는 모듈 클로저가 아니라 window 에 둔다. 이 파일은 classic script(globalThis.__cdCheckoutEntry)
  // 와 webpack import 두 경로로 로드돼 인스턴스가 둘이므로(CHOICE_LOCK_KEY 와 같은 이유), 클로저에
  // 두면 React 결제창이 고른 값을 셸의 _cdRunDirectKrwCheckout 이 못 본다.
  //
  // 🔴 여기 담기는 값은 **카드 id** 다(payMethod 가 아니다). PG 로 나가는 값은 반드시
  // resolveDirectPayFields() 를 거쳐야 한다 — 상품권 카드 id 를 그대로 보내면 PortOne 이 거절한다.
  var SELECTED_PAY_METHOD_KEY = "__cdSelectedDirectPayMethod";
  var SELECTED_PAY_METHOD_TTL_MS = 120000;

  function setSelectedDirectPayMethod(id) {
    var win = runtimeWindow();
    if (!win) return "";
    var normalized = text(id).toUpperCase();
    if (!isDirectPayMethodEnabled(normalized)) return "";
    win[SELECTED_PAY_METHOD_KEY] = { method: normalized, at: Date.now() };
    return normalized;
  }

  function clearSelectedDirectPayMethod() {
    var win = runtimeWindow();
    if (win) win[SELECTED_PAY_METHOD_KEY] = null;
  }

  /** TTL·활성 여부를 다시 확인해 돌려준다. 🔴 **소비하지 않는다** — 아래 resolve 머리주석 참고. */
  function peekSelectedDirectPayMethod() {
    var win = runtimeWindow();
    if (!win) return "";
    var picked = win[SELECTED_PAY_METHOD_KEY];
    if (!picked) return "";
    if (Date.now() - Number(picked.at || 0) > SELECTED_PAY_METHOD_TTL_MS) {
      win[SELECTED_PAY_METHOD_KEY] = null;
      return "";
    }
    if (!isDirectPayMethodEnabled(picked.method)) return "";
    return text(picked.method).toUpperCase();
  }

  /**
   * PortOne 요청에 실을 payMethod. 결제수단 요청 조립부(셸 _cdRunDirectKrwCheckout · 독립 정적
   * _dpRunDirectKrwCheckout)가 `config.payMethod || 'CARD'` 대신 이걸 부른다.
   *
   * 🔴 **읽고 지우지 않는다(take 아님).** 두 조립부는 전화번호 입력·멱등키 충돌에서 자기 자신을
   * 재귀 호출하는데, 소비형이면 재귀 진입에서 값이 사라져 사용자가 고른 수단이 조용히 CARD 로
   * 되돌아간다. 수명은 TTL 과 "결제창을 열 때 / direct 아닌 값으로 닫을 때 clear" 로 닫는다.
   */
  function resolveDirectPayMethod(configPayMethod) {
    return resolveDirectPayFields(configPayMethod).payMethod;
  }

  /**
   * PortOne 요청에 병합할 결제수단 필드 묶음. 요청 조립부(셸 _cdRunDirectKrwCheckout · 독립 정적
   * _dpRunDirectKrwCheckout)가 payMethod 하나 대신 이걸 받아 통째로 얹는다.
   *
   * 🔴 상품권은 payMethod 만으로 부족하다 — PortOne V2 가 giftCertificate.giftCertificateType 을
   * 요구하고, 없으면 **결제창을 그리기 전에** 거절해 "그 카드만 창이 안 뜬다"가 된다. 그래서 표에
   * 상품권 항목을 늘릴 때 giftCertificateType 을 빠뜨리지 못하도록 verify:checkout-pass-card ⑬ 이
   * 활성 카드를 전수 순회해 이 함수의 반환을 확인한다.
   */
  function resolveDirectPayFields(configPayMethod) {
    var picked = peekSelectedDirectPayMethod();
    var entry = picked ? DIRECT_PAY_METHODS[picked] : null;
    if (entry) {
      var fields = { payMethod: text(entry.payMethod).toUpperCase() || DEFAULT_DIRECT_PAY_METHOD };
      if (entry.giftCertificateType) fields.giftCertificate = { giftCertificateType: entry.giftCertificateType };
      // 🔴 값이 아니라 서버 config 의 **필드 이름**이다. 조립부가 config[channelKeyName] 로 꺼내고,
      // 비어 있으면 config.channelKey 로 폴백하지 말고 던져야 한다 — 폴백하면 "카카오페이를 눌렀는데
      // 이니시스 카드창"이 뜬다(giftCertificateType 누락과 같은 실패 모드).
      if (entry.channelKeyName) fields.channelKeyName = entry.channelKeyName;
      // 🔴 주문에 기록할 결제수단 코드. 선언하지 않은 카드는 조립부가 지금대로 card_general 을 쓴다 —
      // 이미 살아 있는 수단(카드·계좌이체·상품권)의 기록 값을 이 변경으로 흔들지 않기 위해서다.
      if (entry.orderMethod) fields.orderMethod = entry.orderMethod;
      return fields;
    }
    return { payMethod: text(configPayMethod).toUpperCase() || DEFAULT_DIRECT_PAY_METHOD };
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
    PAYMENT_CHOICE_CSS_RULES: PAYMENT_CHOICE_CSS_RULES,
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
    isDesktopPgWindow: isDesktopPgWindow,
    pgWindowLocale: pgWindowLocale,
    portoneBypass: portoneBypass,
    formatKrwAmount: formatKrwAmount,
    REFERENCE_FX_AS_OF: REFERENCE_FX_AS_OF,
    formatReferenceAmount: formatReferenceAmount,
    buildOverseasChargeNoticeHtml: buildOverseasChargeNoticeHtml,
    mintPaymentAttemptScope: mintPaymentAttemptScope,
    resolveCheckoutRecommendation: resolveCheckoutRecommendation,
    buildPaymentChoiceCardsHtml: buildPaymentChoiceCardsHtml,
    DIRECT_PAY_METHOD_ORDER: DIRECT_PAY_METHOD_ORDER,
    DEFAULT_DIRECT_PAY_METHOD: DEFAULT_DIRECT_PAY_METHOD,
    isDirectPayMethodEnabled: isDirectPayMethodEnabled,
    directPayMethodComingSoonText: directPayMethodComingSoonText,
    buildDirectPayMethodStepHtml: buildDirectPayMethodStepHtml,
    setSelectedDirectPayMethod: setSelectedDirectPayMethod,
    clearSelectedDirectPayMethod: clearSelectedDirectPayMethod,
    peekSelectedDirectPayMethod: peekSelectedDirectPayMethod,
    resolveDirectPayMethod: resolveDirectPayMethod,
    resolveDirectPayFields: resolveDirectPayFields,
    resolveStorePlan: resolveStorePlan,
    buildPassStoreUrl: buildPassStoreUrl,
    shouldUseAppStoreEntry: shouldUseAppStoreEntry,
    rememberCheckoutReturn: rememberCheckoutReturn,
    consumeCheckoutReturn: consumeCheckoutReturn,
    trackCheckoutEvent: trackCheckoutEvent,
  };
});
