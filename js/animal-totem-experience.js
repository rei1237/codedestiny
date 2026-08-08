(function(global) {
  "use strict";

  var state = {
    mode: "three",
    spread: null,
    consultation: null,
    revealedOrder: [],
    canvasLoop: null,
    canvasStars: [],
    touchStart: null,
    lastFocusedElement: null,
    isFlowBusy: false
  };

  var refs = {};
  var TAP_THRESHOLD = 12;
  var ANIMAL_TOTEM_TEXT_TRANSLATIONS = {
    ko: {
      billing: {
        reasonBasic: "애니멀 토템 리딩",
        reasonDeep: "애니멀 토템 심화 리딩",
        oneLabel: "달빛 한 장",
        threeLabel: "숲의 세 길",
        fiveLabel: "별자리 다섯 동물"
      },
      overlay: {
        checkingTitle: "결제를 확인 중입니다...",
        checkingStatus: "잠시만 기다려 주세요.",
        processing: "결제를 진행 중입니다.",
        checkingPayment: "결제를 확인 중입니다..."
      },
      auth: {
        requiredReason: "로그인 후 이용할 수 있는 기능입니다.",
        confirm: "로그인이 필요합니다. 로그인 페이지로 이동할까요?"
      },
      payment: {
        retryAfterPayment: "단건 결제가 필요합니다. 결제 후 다시 시도해 주세요.",
        krwFailed: "원화 결제 확인에 실패했습니다.",
        processError: "결제 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        gateLoadFailed: "결제 게이트를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요."
      },
      slots: {
        today_guide: "오늘의 수호 메시지",
        past_wound: "과거 상처",
        present_energy: "현재 에너지",
        integration_path: "통합 방향",
        mind: "이성/사고",
        heart: "감정/욕구",
        shadow: "그림자",
        gift: "잠재 선물",
        next_action: "다음 행동"
      },
      cardFlip: "{slot} 카드 뒤집기",
      guidance: {
        essence: "수호의 본질",
        whisper: "오늘의 속삭임",
        action: "작은 실천",
        ritual: "짧은 치유 리추얼"
      },
      errors: {
        engineMissing: "애니멀 토템 엔진을 불러오지 못했습니다. 페이지를 새로고침해 주세요.",
        drawFailed: "카드 소환 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
      },
      share: {
        title: "🧸 애니멀 토템 심층 리딩",
        cta: "👉 무료 리딩 보러가기: https://code-destiny.com",
        copied: "카카오톡 앱이 없거나 PC에서는 링크를 복사했어요! 카카오톡에 붙여넣기 하세요 💬"
      }
    },
    en: {
      billing: {
        reasonBasic: "Animal Totem Reading",
        reasonDeep: "Deep Animal Totem Reading",
        oneLabel: "One Moonlit Card",
        threeLabel: "Three Paths in the Forest",
        fiveLabel: "Five Constellation Animals"
      },
      overlay: {
        checkingTitle: "Checking your payment...",
        checkingStatus: "Please wait a moment.",
        processing: "Processing your payment.",
        checkingPayment: "Checking your payment..."
      },
      auth: {
        requiredReason: "Please log in to use this feature.",
        confirm: "Login is required. Go to the login page?"
      },
      payment: {
        retryAfterPayment: "A one-time payment is needed. Please pay and try again.",
        krwFailed: "We could not confirm the KRW payment.",
        processError: "An error occurred while processing payment. Please try again shortly.",
        gateLoadFailed: "Could not load the payment gate. Refresh the page and try again."
      },
      slots: {
        today_guide: "Today's Guardian Message",
        past_wound: "Past Wound",
        present_energy: "Present Energy",
        integration_path: "Path of Integration",
        mind: "Mind / Thought",
        heart: "Heart / Desire",
        shadow: "Shadow",
        gift: "Hidden Gift",
        next_action: "Next Action"
      },
      cardFlip: "Flip the {slot} card",
      guidance: {
        essence: "Essence of Protection",
        whisper: "Today's Whisper",
        action: "Small Practice",
        ritual: "Short Healing Ritual"
      },
      errors: {
        engineMissing: "The Animal Totem engine could not be loaded. Please refresh the page.",
        drawFailed: "An error occurred while summoning the cards. Please try again shortly."
      },
      share: {
        title: "🧸 Deep Animal Totem Reading",
        cta: "👉 Try a free reading: https://code-destiny.com",
        copied: "KakaoTalk is not available or you are on PC, so the link was copied. Paste it into KakaoTalk 💬"
      }
    },
    ja: {
      billing: {
        reasonBasic: "アニマルトーテムリーディング",
        reasonDeep: "アニマルトーテム深層リーディング",
        oneLabel: "月明かりの一枚",
        threeLabel: "森の三つの道",
        fiveLabel: "星座の五つの動物"
      },
      overlay: {
        checkingTitle: "お支払いを確認しています...",
        checkingStatus: "少しだけお待ちください。",
        processing: "お支払いを処理しています。",
        checkingPayment: "お支払いを確認しています..."
      },
      auth: {
        requiredReason: "ログイン後に利用できる機能です。",
        confirm: "ログインが必要です。ログインページへ移動しますか？"
      },
      payment: {
        retryAfterPayment: "単回決済が必要です。お支払い後にもう一度お試しください。",
        krwFailed: "ウォン決済を確認できませんでした。",
        processError: "お支払い処理中にエラーが発生しました。しばらくしてからもう一度お試しください。",
        gateLoadFailed: "決済ゲートを読み込めませんでした。ページを再読み込みしてもう一度お試しください。"
      },
      slots: {
        today_guide: "今日の守護メッセージ",
        past_wound: "過去の傷",
        present_energy: "現在のエネルギー",
        integration_path: "統合の道",
        mind: "理性・思考",
        heart: "感情・欲求",
        shadow: "影",
        gift: "潜在する贈り物",
        next_action: "次の行動"
      },
      cardFlip: "{slot}のカードをめくる",
      guidance: {
        essence: "守護の本質",
        whisper: "今日のささやき",
        action: "小さな実践",
        ritual: "短い癒しのリチュアル"
      },
      errors: {
        engineMissing: "アニマルトーテムエンジンを読み込めませんでした。ページを再読み込みしてください。",
        drawFailed: "カード召喚中にエラーが発生しました。しばらくしてからもう一度お試しください。"
      },
      share: {
        title: "🧸 アニマルトーテム深層リーディング",
        cta: "👉 無料リーディングを見る: https://code-destiny.com",
        copied: "KakaoTalkアプリがない、またはPCのためリンクをコピーしました。KakaoTalkに貼り付けてください 💬"
      }
    }
  };

  function animalTotemLocale() {
    try {
      var stored = global.localStorage && (
        localStorage.getItem("cd_locale")
        || localStorage.getItem("codeDestinyLocale")
        || localStorage.getItem("lang")
      );
      if (stored) return normalizeAnimalTotemLocale(stored);
    } catch (_) {}
    try {
      var cookieLang = String(document.cookie || "").split(";").map(function(part) { return part.trim(); }).filter(function(part) { return part.indexOf("cd_locale=") === 0; })[0];
      if (cookieLang) return normalizeAnimalTotemLocale(decodeURIComponent(cookieLang.slice("cd_locale=".length)));
    } catch (_) {}
    var attrLang = document.documentElement && (document.documentElement.getAttribute("data-cd-lang") || document.documentElement.lang);
    return normalizeAnimalTotemLocale(attrLang);
  }

  function normalizeAnimalTotemLocale(locale) {
    var value = String(locale || "ko").trim().toLowerCase();
    if (value.indexOf("ja") === 0) return "ja";
    if (value.indexOf("en") === 0) return "en";
    return "ko";
  }

  function getAnimalTotemCopy() {
    return ANIMAL_TOTEM_TEXT_TRANSLATIONS[animalTotemLocale()] || ANIMAL_TOTEM_TEXT_TRANSLATIONS.ko;
  }

  function animalTotemText(path, vars) {
    var parts = String(path || "").split(".");
    var value = getAnimalTotemCopy();
    for (var i = 0; i < parts.length; i += 1) {
      value = value && value[parts[i]];
    }
    if (typeof value !== "string") return path;
    return Object.keys(vars || {}).reduce(function(text, key) {
      return text.replace(new RegExp("\\{" + key + "\\}", "g"), String(vars[key]));
    }, value);
  }

  var ANIMAL_TOTEM_BILLING_BY_MODE = {
    one: {
      subFeatureKey: "basic",
      featureKey: "animal-totem-basic",
      cost: 30,
      reasonKey: "billing.reasonBasic",
      labelKey: "billing.oneLabel"
    },
    three: {
      subFeatureKey: "basic",
      featureKey: "animal-totem-basic",
      cost: 30,
      reasonKey: "billing.reasonBasic",
      labelKey: "billing.threeLabel"
    },
    five: {
      subFeatureKey: "deep",
      featureKey: "animal-totem-deep",
      cost: 60,
      reasonKey: "billing.reasonDeep",
      labelKey: "billing.fiveLabel"
    }
  };

  function byId(id) { return document.getElementById(id); }
  var bodyLockState = {
    mode: null,
    bodyOverflow: "",
    htmlOverflow: ""
  };

  function getBillingSpec(mode) {
    var base = ANIMAL_TOTEM_BILLING_BY_MODE[mode] || ANIMAL_TOTEM_BILLING_BY_MODE.three;
    return Object.assign({}, base, {
      reason: animalTotemText(base.reasonKey),
      label: animalTotemText(base.labelKey)
    });
  }

  function ensureLocalPaymentOverlay() {
    if (refs.paymentOverlay && document.contains(refs.paymentOverlay)) return refs.paymentOverlay;
    ensureRefs();
    var host = refs.overlay || document.body;
    if (!host) return null;
    var overlay = document.createElement("div");
    overlay.id = "animalTotemPaymentOverlay";
    overlay.setAttribute("aria-live", "polite");
    overlay.style.cssText = [
      "position:absolute",
      "inset:0",
      "display:none",
      "align-items:center",
      "justify-content:center",
      "z-index:9999",
      "background:linear-gradient(135deg,rgba(7,10,27,.82),rgba(20,12,38,.74))",
      "backdrop-filter:blur(6px)",
      "pointer-events:auto"
    ].join(";");

    var card = document.createElement("div");
    card.style.cssText = [
      "min-width:240px",
      "max-width:86%",
      "padding:14px 16px",
      "border-radius:14px",
      "border:1px solid rgba(167,243,208,.3)",
      "background:linear-gradient(135deg,rgba(15,23,42,.8),rgba(6,78,59,.45))",
      "box-shadow:0 14px 30px rgba(2,6,23,.45)",
      "text-align:center",
      "color:#ecfeff"
    ].join(";");
    card.innerHTML = '<p style="margin:0;font-size:15px;font-weight:800">' + animalTotemText("overlay.checkingTitle") + '</p><p id="animalTotemPaymentOverlayStatus" style="margin:8px 0 0;font-size:12px;opacity:.92">' + animalTotemText("overlay.checkingStatus") + '</p>';
    overlay.appendChild(card);

    var computed = host === document.body ? null : global.getComputedStyle(host);
    if (host !== document.body && computed && computed.position === "static") {
      host.style.position = "relative";
    }
    host.appendChild(overlay);
    refs.paymentOverlay = overlay;
    refs.paymentOverlayStatus = overlay.querySelector("#animalTotemPaymentOverlayStatus");
    return overlay;
  }

  function togglePaymentOverlay(show, message) {
    var text = String(message || "").trim() || animalTotemText("overlay.processing");
    if (typeof global._cdSetCoinGateOverlay === "function") {
      global._cdSetCoinGateOverlay(!!show, text);
      return;
    }
    var overlay = ensureLocalPaymentOverlay();
    if (!overlay) return;
    if (refs.paymentOverlayStatus) refs.paymentOverlayStatus.textContent = text;
    overlay.style.display = show ? "flex" : "none";
  }

  function openAuthRequiredUi() {
    if (typeof global.__cdOpenLoginRequiredModal === "function") {
      global.__cdOpenLoginRequiredModal({
        reason: animalTotemText("auth.requiredReason"),
        redirectTo: global.location.pathname + global.location.search + global.location.hash
      });
      return;
    }
    if (global.confirm(animalTotemText("auth.confirm"))) {
      global.location.href = "/login?next=" + encodeURIComponent(global.location.pathname + global.location.search);
    }
  }

  // 402 는 공용 게이트(_cdOpenPaidServiceGate)가 결제창(이용권/단건/월정석 3옵션)을 이미 재제안한 뒤에 올라온다.
  // 여기서 코인 시대의 "충전 상점 열기"를 한 겹 더 붙이면 3옵션 결제창을 우회하는 별도 경로가 되므로,
  // 자매 기능(js/tarot-*-experience.js)과 같이 안내만 남긴다.
  function openInsufficientCoinsUi() {
    global.alert(animalTotemText("payment.retryAfterPayment"));
  }

  async function consumeAnimalTotemViaCommonGate(spec) {
    if (typeof global._cdCoinGatePerUse !== "function") return null;

    var granted = false;
    try {
      var requestId = "animal-totem:" + spec.subFeatureKey + ":" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
      var immediate = global._cdCoinGatePerUse(
        spec.cost,
        spec.reason,
        function(_transactionId, payload) {
          granted = true;
          syncUserPointsFromBilling(payload);
        },
        function() {
          granted = false;
        },
        {
          categoryKey: "animal-totem",
          subFeatureKey: spec.subFeatureKey,
          featureKey: spec.featureKey,
          serviceKey: "animal-totem",
          action: "drawAnimalTotemSpread",
          requestId: requestId,
        }
      );

      var result = immediate;
      if (result && typeof result.then === "function") {
        result = await result;
      }
      if (result == null) {
        return granted === true;
      }
      result = result || {};

      var ok = result.ok !== false;
      var code = String(result.code || (result.error && result.error.code) || "").toUpperCase();
      var status = Number(result.status || 0);

      if (!ok) {
        if (status === 401 || status === 403 || code === "AUTH_REQUIRED") {
          openAuthRequiredUi();
          return false;
        }
        if (status === 402 || code === "INSUFFICIENT_COINS") {
          openInsufficientCoinsUi();
          return false;
        }
        var errorMessage = String(result.message || (result.error && result.error.message) || animalTotemText("payment.krwFailed"));
        global.alert(errorMessage);
        return false;
      }

      syncUserPointsFromBilling(result);
      return true;
    } catch (error) {
      console.error("[animal-totem][common-coin-gate]", error);
      global.alert(animalTotemText("payment.processError"));
      return false;
    } finally {
      togglePaymentOverlay(false);
    }
  }

  function syncUserPointsFromBilling(payload) {
    try {
      var data = payload && payload.data ? payload.data : payload;
      var consume = data && data.consume ? data.consume : null;
      var user = data && data.user ? data.user : (consume && consume.user ? consume.user : null);
      var candidates = [
        data && data.balance,
        user && user.points,
        consume && consume.remainingPoints
      ];
      var remaining = NaN;
      for (var i = 0; i < candidates.length; i += 1) {
        var candidate = Number(candidates[i]);
        if (Number.isFinite(candidate)) {
          remaining = candidate;
          break;
        }
      }
      // 뱃지(__cdSetGoldenBalance)의 단위는 '월정석'이다. 위 remaining 은 data.balance 를 1순위로
      // 집는데 그건 서버가 아직 함께 내려주는 레거시 코인(user.points)이라 뱃지에 넣으면 안 된다.
      // 응답에 월정석 잔량이 실제로 있을 때만 출처를 밝혀 넘기고, 없으면 정본을 다시 받는다.
      var monthlyStoneRaw = (data && data.monthlyStoneBalance) != null
        ? data.monthlyStoneBalance
        : (data && data.membershipCreditBalance);
      var monthlyStone = Number(monthlyStoneRaw);
      if (Number.isFinite(monthlyStone) && monthlyStone >= 0) {
        if (typeof global.__cdSetGoldenBalance === "function") {
          global.__cdSetGoldenBalance(monthlyStone, { source: "coin-gate-monthly-stone" });
        }
      } else if (typeof global.__cdRefreshGoldenBalance === "function") {
        global.__cdRefreshGoldenBalance({ forceAuthProbe: true });
      }

      if (!Number.isFinite(remaining)) return;
      localStorage.setItem("fortune_user_points", String(remaining));
      var authRaw = localStorage.getItem("fortune_auth_user") || "";
      var authUser = authRaw ? JSON.parse(authRaw) : {};
      authUser.points = remaining;
      localStorage.setItem("fortune_auth_user", JSON.stringify(authUser));
    } catch (_) {}
  }

  async function consumeAnimalTotemPerUse(mode) {
    var spec = getBillingSpec(mode);
    if (!spec || !(spec.cost > 0)) return true;
    if (typeof global.__cdIsAdminLikeUser === "function" && global.__cdIsAdminLikeUser()) return true;

    var commonGateResult = await consumeAnimalTotemViaCommonGate(spec);
    if (commonGateResult !== null) return commonGateResult;
    global.alert(animalTotemText("payment.gateLoadFailed"));
    return false;
  }

  function shouldUseSoftBodyLock() {
    var mq = global.matchMedia ? global.matchMedia("(max-width: 900px)") : null;
    var coarse = global.matchMedia ? global.matchMedia("(pointer: coarse)") : null;
    return !!((mq && mq.matches) || (coarse && coarse.matches));
  }

  function lockBody() {
    if (bodyLockState.mode) return;
    /* 현재 overflow 상태 저장 (unlock 시 복원용) */
    bodyLockState.bodyOverflow = document.body.style.overflow || "";
    bodyLockState.htmlOverflow = (document.documentElement && document.documentElement.style.overflow) || "";
    /* 모바일: body overflow:hidden 시 iOS Safari에서 오버레이 내부 스크롤이 막힘. overscroll-behavior로 대체 */
    if (shouldUseSoftBodyLock()) {
      bodyLockState.mode = "soft";
      return;
    }
    if (global._perf && global._perf.lockBody) {
      bodyLockState.mode = "perf";
      global._perf.lockBody();
      return;
    }
    bodyLockState.mode = "fallback";
    document.body.style.overflow = "hidden";
  }

  function unlockBody() {
    if (!bodyLockState.mode) return;
    if (bodyLockState.mode === "soft") {
      document.body.style.overflow = bodyLockState.bodyOverflow;
      document.documentElement.style.overflow = bodyLockState.htmlOverflow;
    } else if (bodyLockState.mode === "perf") {
      if (global._perf && global._perf.unlockBody) global._perf.unlockBody();
    } else {
      document.body.style.overflow = bodyLockState.bodyOverflow;
    }
    bodyLockState.mode = null;
    bodyLockState.bodyOverflow = "";
    bodyLockState.htmlOverflow = "";
  }

  function ensureRefs() {
    refs.overlay = byId("animalTotemOverlay");
    refs.introStage = byId("animalTotemIntroStage");
    refs.modeStage = byId("animalTotemModeStage");
    refs.drawStage = byId("animalTotemDrawStage");
    refs.resultStage = byId("animalTotemResultStage");
    refs.cardRail = byId("animalTotemCardRail");
    refs.readingPanels = byId("animalTotemReadingPanels");
    refs.resultCards = byId("animalTotemResultCards");
    refs.openingText = byId("animalTotemOpeningText");
    refs.closingText = byId("animalTotemClosingText");
    refs.flowStrip = byId("animalTotemFlowStrip");
    refs.modeButtons = document.querySelectorAll(".totem-mode-btn");
    refs.canvas = byId("animalTotemStarCanvas");
    refs.runeField = byId("animalTotemRuneField");
    refs.animalFigures = byId("animalTotemAnimalFigures");
    refs.panel = refs.overlay ? refs.overlay.querySelector(".animal-totem-panel") : null;
    refs.closeButton = refs.overlay ? refs.overlay.querySelector(".animal-totem-close") : null;
    refs.stumpWrap = refs.overlay ? refs.overlay.querySelector(".totem-stump-wrap") : null;
    if (refs.stumpWrap) refs.stumpWrap.removeAttribute("aria-hidden");
  }

  function focusWithoutJump(el) {
    if (!el || typeof el.focus !== "function") return;
    try { el.focus({ preventScroll: true }); }
    catch (_) { el.focus(); }
  }

  function rememberFocusedElement() {
    var active = document.activeElement;
    if (!active || active === document.body || typeof active.focus !== "function") return;
    state.lastFocusedElement = active;
  }

  function restoreFocusToInvoker() {
    var target = state.lastFocusedElement;
    state.lastFocusedElement = null;
    if (!target) return;
    if (!document.contains(target)) return;
    if (target.hasAttribute && target.hasAttribute("disabled")) return;
    focusWithoutJump(target);
  }

  function focusModalEntryPoint() {
    ensureRefs();
    var preferred = refs.overlay && refs.overlay.querySelector('[data-action="startAnimalTotemRitual"]');
    focusWithoutJump(preferred || refs.closeButton);
  }

  function currentStageElement() {
    var stages = [refs.introStage, refs.modeStage, refs.drawStage, refs.resultStage];
    for (var i = 0; i < stages.length; i += 1) {
      if (stages[i] && stages[i].classList && stages[i].classList.contains("is-active")) return stages[i];
    }
    return null;
  }

  function syncStumpAccessibility(stageEl) {
    if (!refs.stumpWrap) return;
    var isDrawStage = stageEl === refs.drawStage;
    var shouldInert = !isDrawStage || state.isFlowBusy;
    var active = document.activeElement;
    if (shouldInert && active && refs.stumpWrap.contains(active)) {
      if (typeof active.blur === "function") active.blur();
      focusWithoutJump(refs.closeButton || refs.panel);
    }
    refs.stumpWrap.removeAttribute("aria-hidden");
    refs.stumpWrap.toggleAttribute("inert", shouldInert);
    refs.stumpWrap.setAttribute("aria-busy", state.isFlowBusy ? "true" : "false");
  }

  function updateDeckInteractivity() {
    if (!refs.cardRail) return;
    var nextIdx = state.revealedOrder.length;
    var cards = refs.cardRail.children;
    for (var i = 0; i < cards.length; i += 1) {
      var card = cards[i];
      var revealed = card.classList.contains("is-revealed");
      var enabled = !state.isFlowBusy && !revealed && i === nextIdx;
      card.classList.toggle("is-disabled", !enabled);
      card.disabled = !enabled;
      card.setAttribute("aria-disabled", enabled ? "false" : "true");
      card.tabIndex = enabled ? 0 : -1;
    }
  }

  function setFlowBusy(nextBusy) {
    state.isFlowBusy = !!nextBusy;
    if (refs.drawStage) refs.drawStage.setAttribute("aria-busy", state.isFlowBusy ? "true" : "false");
    updateDeckInteractivity();
    syncStumpAccessibility(currentStageElement());
  }

  function takeSentences(text, maxSentences) {
    if (!text) return "";
    var cleaned = String(text).replace(/\s+/g, " ").trim();
    var parts = cleaned.split(/(?<=[.!?।])\s+/);
    if (parts.length <= maxSentences) return cleaned;
    return parts.slice(0, maxSentences).join(" ");
  }

  function shortenAdvice(list) {
    if (!Array.isArray(list)) return [];
    return list.slice(0, 3).map(function(v) { return takeSentences(v, 1); });
  }

  function activateStage(stageEl) {
    [refs.introStage, refs.modeStage, refs.drawStage, refs.resultStage].forEach(function(el) {
      if (!el || !el.classList) return;
      el.classList.remove("is-active");
      el.toggleAttribute("inert", true);
      el.setAttribute("aria-hidden", "true");
    });
    if (stageEl && stageEl.classList) {
      stageEl.classList.add("is-active");
      stageEl.toggleAttribute("inert", false);
      stageEl.removeAttribute("aria-hidden");
    }
    if (refs.overlay) {
      refs.overlay.classList.toggle("is-result-view", stageEl === refs.resultStage);
    }
    if (stageEl === refs.resultStage && refs.cardRail) {
      refs.cardRail.innerHTML = "";
      refs.cardRail._totemTouchBound = false;
    }
    syncStumpAccessibility(stageEl);
  }

  function buildRuneField() {
    if (!refs.runeField || refs.runeField.dataset.ready === "1") return;
    refs.runeField.dataset.ready = "1";
    var runes = ["ᚠ", "ᚨ", "ᚱ", "ᛟ", "ᛞ", "ᚲ", "✶", "✧", "☾"];
    var count = shouldUseSoftBodyLock() ? 12 : 26;
    for (var i = 0; i < count; i += 1) {
      var el = document.createElement("span");
      el.className = "totem-rune";
      el.textContent = runes[i % runes.length];
      el.style.left = Math.floor(Math.random() * 96) + "%";
      el.style.animationDuration = (8 + Math.random() * 10).toFixed(2) + "s";
      el.style.animationDelay = (Math.random() * 6).toFixed(2) + "s";
      refs.runeField.appendChild(el);
    }
  }

  function buildAnimalFigures() {
    if (!refs.animalFigures || refs.animalFigures.dataset.ready === "1") return;
    refs.animalFigures.dataset.ready = "1";
    var animals = ["🐱", "🐶", "🐰", "🦊", "🐻", "🐦", "🦋", "🦉", "🐬", "🐢", "🐿️", "🦌", "🐺", "🦅"];
    var isMobile = shouldUseSoftBodyLock();
    var staticPositions = ["tl", "tr", "bl", "br", "mt"];
    staticPositions.forEach(function(pos, i) {
      var el = document.createElement("span");
      el.className = "totem-animal-figure totem-animal-figure--static totem-animal-figure--" + pos;
      el.textContent = animals[i % animals.length];
      el.setAttribute("aria-hidden", "true");
      refs.animalFigures.appendChild(el);
    });
    var floatCount = isMobile ? 6 : 18;
    for (var j = 0; j < floatCount; j += 1) {
      var fl = document.createElement("span");
      fl.className = "totem-animal-figure";
      fl.textContent = animals[j % animals.length];
      fl.style.left = Math.floor(Math.random() * 92) + "%";
      fl.style.animationDuration = (10 + Math.random() * 12).toFixed(2) + "s";
      fl.style.animationDelay = (Math.random() * 8).toFixed(2) + "s";
      fl.style.fontSize = (16 + Math.floor(Math.random() * 10)) + "px";
      fl.setAttribute("aria-hidden", "true");
      refs.animalFigures.appendChild(fl);
    }
  }

  function startCanvas() {
    if (!refs.canvas) return;
    var c = refs.canvas;
    var rect = c.getBoundingClientRect();
    c.width = Math.max(240, Math.floor(rect.width));
    c.height = Math.max(120, Math.floor(rect.height));
    var ctx = c.getContext("2d");
    var starCount = shouldUseSoftBodyLock() ? 20 : 48;
    state.canvasStars = Array.from({ length: starCount }, function() {
      return {
        x: Math.random() * c.width,
        y: Math.random() * c.height,
        r: 0.6 + Math.random() * 1.7,
        speed: 0.12 + Math.random() * 0.44,
        alpha: 0.15 + Math.random() * 0.75
      };
    });
    function tick() {
      ctx.clearRect(0, 0, c.width, c.height);
      for (var i = 0; i < state.canvasStars.length; i += 1) {
        var s = state.canvasStars[i];
        s.y -= s.speed;
        if (s.y < -4) {
          s.y = c.height + 3;
          s.x = Math.random() * c.width;
        }
        ctx.beginPath();
        ctx.fillStyle = "rgba(255,236,168," + s.alpha.toFixed(2) + ")";
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      /* TASK5: 탭 비활성 시 RAF 중단으로 CPU/배터리 절약 */
      if (document.hidden) {
        state.canvasLoop = null;
      } else {
        state.canvasLoop = global.requestAnimationFrame(tick);
      }
    }
    stopCanvas();
    /* TASK5: visibilitychange 리스너 — 탭 복귀 시 루프 재개 */
    if (state._visibilityHandler) {
      document.removeEventListener('visibilitychange', state._visibilityHandler);
    }
    state._visibilityHandler = function() {
      if (!document.hidden && !state.canvasLoop) tick();
    };
    document.addEventListener('visibilitychange', state._visibilityHandler);
    tick();
  }

  function stopCanvas() {
    if (state.canvasLoop) {
      global.cancelAnimationFrame(state.canvasLoop);
      state.canvasLoop = null;
    }
    if (state._visibilityHandler) {
      document.removeEventListener('visibilitychange', state._visibilityHandler);
      state._visibilityHandler = null;
    }
  }

  function setMode(mode) {
    state.mode = (mode === "five" ? "five" : mode === "one" ? "one" : "three");
    refs.modeButtons.forEach(function(btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-mode") === state.mode);
    });
  }

  function slotLabel(slot) {
    return animalTotemText("slots." + slot) || slot;
  }

  function getTouchPoint(e) {
    if (e.changedTouches && e.changedTouches.length) {
      var t = e.changedTouches[0];
      return { x: t.clientX, y: t.clientY };
    }
    if (e.touches && e.touches.length) {
      var t = e.touches[0];
      return { x: t.clientX, y: t.clientY };
    }
    if (typeof e.clientX === "number") return { x: e.clientX, y: e.clientY };
    return null;
  }

  function bindCardRailTouch() {
    if (!refs.cardRail || refs.cardRail._totemTouchBound) return;
    refs.cardRail._totemTouchBound = true;

    refs.cardRail.addEventListener("touchstart", function(ev) {
      var pt = getTouchPoint(ev);
      if (pt) state.touchStart = { x: pt.x, y: pt.y };
    }, { passive: true });

    refs.cardRail.addEventListener("touchend", function(ev) {
      if (!state.touchStart || !state.spread) return;
      var pt = getTouchPoint(ev);
      if (!pt) return;
      var dx = Math.abs(pt.x - state.touchStart.x);
      var dy = Math.abs(pt.y - state.touchStart.y);
      if (dx > TAP_THRESHOLD || dy > TAP_THRESHOLD) {
        state.touchStart = null;
        return;
      }
      var target = ev.target && ev.target.closest && ev.target.closest(".totem-draw-card");
      if (!target || target.classList.contains("is-disabled") || target.classList.contains("is-revealed")) {
        state.touchStart = null;
        return;
      }
      var idxAttr = target.getAttribute("data-action-args");
      var idx = parseInt(idxAttr, 10);
      if (idx !== state.revealedOrder.length) {
        state.touchStart = null;
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      state.touchStart = null;
      revealAnimalTotemCard(target, idx);
    }, { passive: false });
  }

  var ROMAN_NUMERALS = ["I", "II", "III", "IV", "V"];

  function renderDeck() {
    if (!refs.cardRail || !state.spread) return;
    refs.cardRail.innerHTML = "";
    refs.cardRail._totemTouchBound = false;
    state.revealedOrder = [];
    state.spread.cards.forEach(function(entry, idx) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "totem-draw-card totem-parallax-zone";
      btn.setAttribute("data-action", "revealAnimalTotemCard");
      btn.setAttribute("data-action-pass-self", "1");
      btn.setAttribute("data-action-args", String(idx));
      btn.setAttribute("aria-label", animalTotemText("cardFlip", { slot: slotLabel(entry.slot) }));
      /* 동물별 컬러 테마 CSS 변수 주입 */
      var ct = entry.card.color_theme || {};
      if (ct.glow) btn.style.setProperty("--card-glow", ct.glow);
      if (ct.primary) btn.style.setProperty("--card-primary", ct.primary);
      if (ct.particle) btn.style.setProperty("--card-particle", ct.particle);
      var roman = ROMAN_NUMERALS[idx] || String(idx + 1);
      btn.innerHTML =
        '<span class="totem-draw-card-inner">' +
        '<span class="totem-card-face totem-card-face--back">' +
        '<span class="atc-corner atc-corner--tl" aria-hidden="true">✦</span>' +
        '<span class="atc-corner atc-corner--tr" aria-hidden="true">✦</span>' +
        '<span class="atc-glyph" aria-hidden="true">🌲</span>' +
        '<small class="atc-slot">' + slotLabel(entry.slot) + "</small>" +
        '<small class="atc-roman">ARCANA ' + roman + "</small>" +
        '<span class="atc-corner atc-corner--bl" aria-hidden="true">✦</span>' +
        '<span class="atc-corner atc-corner--br" aria-hidden="true">✦</span>' +
        "</span>" +
        '<span class="totem-card-face totem-card-face--front">' +
        '<span class="atc-aura" aria-hidden="true"></span>' +
        '<b class="atc-animal">' + entry.card.emoji + "</b>" +
        '<span class="atc-name">' + entry.card.name_ko + "</span>" +
        '<small class="atc-cat">' + entry.card.category + "</small>" +
        "</span></span>";
      refs.cardRail.appendChild(btn);
    });
    bindCardRailTouch();
    updateDeckInteractivity();
  }

  function parallaxCard(btn, active) {
    if (!btn) return;
    if (!active) {
      btn.style.transform = "translate3d(0,0,0)";
      return;
    }
    var r = btn.getBoundingClientRect();
    var cx = r.left + r.width / 2;
    var cy = r.top + r.height / 2;
    btn.onmousemove = function(ev) {
      var dx = ((ev.clientX - cx) / r.width) * 14;
      var dy = ((ev.clientY - cy) / r.height) * 14;
      btn.style.transform = "translate3d(" + dx.toFixed(2) + "px," + dy.toFixed(2) + "px,0)";
    };
    btn.onmouseleave = function() { btn.style.transform = "translate3d(0,0,0)"; };
  }

  function burstAt(btn, color) {
    if (!btn) return;
    for (var i = 0; i < 14; i += 1) {
      var d = document.createElement("i");
      d.className = "totem-burst";
      d.style.background = color;
      d.style.left = "50%";
      d.style.top = "50%";
      var angle = (Math.PI * 2 * i) / 14;
      d.style.setProperty("--tx", Math.cos(angle) * (24 + Math.random() * 22) + "px");
      d.style.setProperty("--ty", Math.sin(angle) * (24 + Math.random() * 22) + "px");
      btn.appendChild(d);
      setTimeout((function(node) { return function() { if (node && node.parentNode) node.parentNode.removeChild(node); }; })(d), 700);
    }
  }

  function applyAmbientClass() {
    if (!refs.overlay || !state.spread) return;
    refs.overlay.classList.remove("env-ground", "env-air", "env-water");
    var score = { "지상": 0, "공중": 0, "물/기타": 0, "기본": 0 };
    state.spread.cards.forEach(function(it) {
      var cat = it.card.category || "기본";
      score[cat] = (score[cat] || 0) + 1;
    });
    var maxCat = "기본";
    Object.keys(score).forEach(function(k) { if (score[k] > score[maxCat]) maxCat = k; });
    if (maxCat === "지상") refs.overlay.classList.add("env-ground");
    else if (maxCat === "공중") refs.overlay.classList.add("env-air");
    else refs.overlay.classList.add("env-water");
  }

  function renderResultCards() {
    if (!refs.resultCards || !state.spread) return;
    refs.resultCards.innerHTML = "";
    refs.resultCards.className = "totem-result-cards totem-result-cards--" + state.spread.cards.length;
    state.spread.cards.forEach(function(entry, idx) {
      var card = document.createElement("div");
      card.className = "totem-result-card totem-result-card--" + (idx + 1);
      card.setAttribute("aria-label", slotLabel(entry.slot) + " — " + entry.card.name_ko);
      /* 동물별 컬러 테마 CSS 변수 주입 */
      var ct = entry.card.color_theme || {};
      if (ct.glow) card.style.setProperty("--card-glow", ct.glow);
      if (ct.primary) card.style.setProperty("--card-primary", ct.primary);
      if (ct.particle) card.style.setProperty("--card-particle", ct.particle);
      card.innerHTML =
        '<div class="totem-result-card-inner">' +
        '<span class="totem-rc-aura" aria-hidden="true"></span>' +
        '<span class="totem-result-card-emoji">' + entry.card.emoji + "</span>" +
        '<span class="totem-result-card-name">' + entry.card.name_ko + "</span>" +
        '<small class="totem-result-card-slot">' + slotLabel(entry.slot) + "</small>" +
        '</div>';
      refs.resultCards.appendChild(card);
    });
  }

  function renderConsultation() {
    if (!refs.readingPanels || !state.consultation) return;
    renderResultCards();
    refs.readingPanels.innerHTML = "";
    if (refs.openingText) refs.openingText.textContent = takeSentences(state.consultation.opening_message || "", 2);
    if (refs.closingText) refs.closingText.textContent = takeSentences(state.consultation.closing_guidance || "", 2);
    if (refs.flowStrip) {
      refs.flowStrip.innerHTML = state.consultation.cards.map(function(entry, idx) {
        var arrow = idx < state.consultation.cards.length - 1 ? '<span class="totem-flow-arrow">→</span>' : "";
        return '<div class="totem-flow-node">' +
          '<span class="totem-flow-icon">' + entry.animal.emoji + '</span>' +
          '<span class="totem-flow-label">' + slotLabel(entry.slot) + "</span>" +
          '<span class="totem-flow-name">' + entry.animal.name_ko + "</span>" +
          "</div>" + arrow;
      }).join("");
    }

    var maxSentences = state.mode === "one" ? 4 : 2;
    state.consultation.cards.forEach(function(entry, idx) {
      var p = document.createElement("article");
      p.className = "totem-guidance-card";
      p.style.animationDelay = (idx * 0.12).toFixed(2) + "s";
      var essence = takeSentences(entry.layered_reading.essence, maxSentences);
      var message = takeSentences(entry.layered_reading.direct_message, maxSentences);
      var advices = state.mode === "one" ? (entry.layered_reading.daily_actions || []).slice(0, 5).map(function(v) { return takeSentences(v, 1); }) : shortenAdvice(entry.layered_reading.daily_actions);
      p.innerHTML =
        /* 결과 카드 아래 해석은 호흡감 있는 짧은 문단으로 구성해 읽기 피로를 줄입니다. */
        '<div class="totem-guidance-aura" style="--aura-color:' + (entry.animal.color_theme.glow || "#facc15") + ';"></div>' +
        '<div class="totem-guidance-head">' +
          '<div class="totem-guidance-animal">' + entry.animal.emoji + "</div>" +
          '<div><p class="totem-guidance-slot">' + slotLabel(entry.slot) + '</p><h3 class="totem-guidance-name">' + entry.animal.name_ko + "</h3></div>" +
        "</div>" +
        '<section class="totem-guidance-section"><h4>' + animalTotemText("guidance.essence") + '</h4><p>' + essence + "</p></section>" +
        '<section class="totem-guidance-section"><h4>' + animalTotemText("guidance.whisper") + '</h4><p>' + message + "</p></section>" +
        '<section class="totem-guidance-section"><h4>' + animalTotemText("guidance.action") + '</h4><ul>' + advices.map(function(v) { return "<li>" + v + "</li>"; }).join("") + "</ul></section>" +
        '<details class="totem-ritual-toggle"><summary>' + animalTotemText("guidance.ritual") + '</summary><p>' + takeSentences(entry.layered_reading.ritual, state.mode === "one" ? 3 : 2) + "</p></details>";
      refs.readingPanels.appendChild(p);
    });
  }

  function openAnimalTotemModal() {
    try {
      ensureRefs();
      if (!refs.overlay) return;
      rememberFocusedElement();
      /* 이미 열려 있으면 중복 호출 방지 (이중 핸들러/더블탭 시 화면 멈춤 방지) */
      if (refs.overlay.classList.contains("is-open")) return;
      /* 모바일: overlay가 main 내부에 있으면 transform/overflow 조상으로 viewport 전체 미덮음 → body로 이동 */
      if (refs.overlay.parentNode && refs.overlay.parentNode !== document.body) {
        document.body.appendChild(refs.overlay);
      }
      refs.overlay.classList.remove("env-ground", "env-air", "env-water");
      refs.overlay.classList.add("is-open");
      refs.overlay.setAttribute("role", "dialog");
      refs.overlay.setAttribute("aria-modal", "true");
      refs.overlay.removeAttribute("aria-hidden");
      refs.overlay.toggleAttribute("inert", false);
      refs.overlay.scrollTop = 0;
      /* 모바일: 언어 선택 등 상단 UI가 overlay 위에 보이지 않도록 (z-index·겹침 방지) */
      document.body.classList.add("animal-totem-modal-open");
      lockBody();
      resetAnimalTotemFlow();
      focusModalEntryPoint();
      /* 모바일: 애니메이션 과부하로 Main Thread 차단 방지 — 지연·분산 실행 */
      var raf = global.requestAnimationFrame || function(cb) { return setTimeout(cb, 0); };
      var isMobile = shouldUseSoftBodyLock();
      var idle = global.requestIdleCallback || function(cb, opts) { return setTimeout(cb, (opts && opts.timeout) || 50); };
      raf(function() {
        try {
          if (isMobile) {
            /* 모바일: rune·figures·canvas를 단계별로 분산 (화면 멈춤 방지) */
            buildRuneField();
            idle(function() {
              buildAnimalFigures();
              idle(function() { startCanvas(); }, { timeout: 100 });
            }, { timeout: 80 });
          } else {
            buildRuneField();
            buildAnimalFigures();
            startCanvas();
          }
        } catch (err) {
          console.error("[animal-totem] init error:", err);
        }
      });
    } catch (err) {
      console.error("[animal-totem] openAnimalTotemModal error:", err);
      try {
        if (refs.overlay) refs.overlay.classList.remove("is-open");
        document.body.classList.remove("animal-totem-modal-open");
        unlockBody();
      } catch (_) {}
    }
  }

  function closeAnimalTotemModal() {
    ensureRefs();
    if (!refs.overlay) return;
    setFlowBusy(false);
    refs.overlay.classList.remove("is-open");
    refs.overlay.setAttribute("aria-hidden", "true");
    refs.overlay.toggleAttribute("inert", true);
    document.body.classList.remove("animal-totem-modal-open");
    unlockBody();
    stopCanvas();
    /* 모바일: body overflow 복원 보장 (다른 경로로 닫혀도 스크롤 잠금 해제) */
    try {
      if (document.body && document.body.style.overflow === "hidden" && !bodyLockState.mode) {
        document.body.style.overflow = bodyLockState.bodyOverflow || "";
      }
    } catch (_) {}
    setTimeout(restoreFocusToInvoker, 0);
  }

  function resetAnimalTotemFlow() {
    ensureRefs();
    state.spread = null;
    state.consultation = null;
    state.revealedOrder = [];
    setFlowBusy(false);
    activateStage(refs.introStage);
    if (refs.cardRail) refs.cardRail.innerHTML = "";
    if (refs.resultCards) refs.resultCards.innerHTML = "";
    if (refs.readingPanels) refs.readingPanels.innerHTML = "";
    if (refs.openingText) refs.openingText.textContent = "";
    if (refs.closingText) refs.closingText.textContent = "";
    setMode("three");
  }

  function startAnimalTotemRitual() {
    ensureRefs();
    activateStage(refs.modeStage);
  }

  function setAnimalTotemSpreadMode(mode) {
    ensureRefs();
    setMode(mode);
  }

  function drawAnimalTotemSpread() {
    ensureRefs();
    if (state.isFlowBusy) return;
    if (!global.AnimalTotemContentEngine) {
      alert(animalTotemText("errors.engineMissing"));
      return;
    }
    setFlowBusy(true);
    consumeAnimalTotemPerUse(state.mode).then(function(ok) {
      if (!ok) {
        setFlowBusy(false);
        return;
      }
      state.spread = global.AnimalTotemContentEngine.getRandomSpread(state.mode);
      state.consultation = global.AnimalTotemContentEngine.composeConsultation(state.spread, {});
      renderDeck();
      applyAmbientClass();
      activateStage(refs.drawStage);
      setFlowBusy(false);
      var firstCard = refs.cardRail && refs.cardRail.children && refs.cardRail.children[0];
      focusWithoutJump(firstCard);
    }).catch(function(error) {
      console.error("[animal-totem][draw]", error);
      setFlowBusy(false);
      alert(animalTotemText("errors.drawFailed"));
    });
  }

  function revealAnimalTotemCard(btn, idxRaw) {
    ensureRefs();
    if (!state.spread || !state.consultation) return;
    if (state.isFlowBusy) return;
    var idx = parseInt(idxRaw, 10);
    if (Number.isNaN(idx)) return;
    if (state.revealedOrder.indexOf(idx) >= 0) return;
    if (idx !== state.revealedOrder.length) return;
    if (navigator.vibrate) navigator.vibrate(12);
    var card = refs.cardRail ? refs.cardRail.children[idx] : null;
    if (!card) return;
    setFlowBusy(true);
    card.classList.add("is-revealed");
    card.classList.remove("is-disabled");
    parallaxCard(card, true);
    var clr = state.spread.cards[idx].card.color_theme.glow || "#facc15";
    burstAt(card, clr);
    state.revealedOrder.push(idx);
    updateDeckInteractivity();
    if (state.revealedOrder.length === state.spread.cards.length) {
      renderConsultation();
      setTimeout(function() {
        activateStage(refs.resultStage);
        setFlowBusy(false);
      }, 250);
      return;
    }
    setTimeout(function() {
      setFlowBusy(false);
      var next = refs.cardRail && refs.cardRail.children ? refs.cardRail.children[state.revealedOrder.length] : null;
      focusWithoutJump(next);
    }, 120);
  }

  function shareAnimalTotemResult() {
    if (!state.consultation) return;
    var titles = state.consultation.cards.map(function(c) { return c.animal.emoji + " " + c.animal.name_ko; }).join(" · ");
    var text = animalTotemText("share.title") + "\n" + titles + "\n\n" + (state.consultation.opening_message || "") + "\n\n" + animalTotemText("share.cta");
    var encoded = encodeURIComponent(text);
    var a = document.createElement("a");
    a.href = "kakaotalk://send?text=" + encoded;
    a.click();
    setTimeout(function() {
      if (typeof copyToClipboard === "function") {
        copyToClipboard(text, animalTotemText("share.copied"));
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() { alert(animalTotemText("share.copied")); }).catch(function() { alert(text); });
      } else {
        alert(text);
      }
    }, 800);
  }

  global.openAnimalTotemModal = openAnimalTotemModal;
  global.closeAnimalTotemModal = closeAnimalTotemModal;
  global.startAnimalTotemRitual = startAnimalTotemRitual;
  global.setAnimalTotemSpreadMode = setAnimalTotemSpreadMode;
  global.drawAnimalTotemSpread = drawAnimalTotemSpread;
  global.revealAnimalTotemCard = revealAnimalTotemCard;
  global.resetAnimalTotemFlow = resetAnimalTotemFlow;
  global.shareAnimalTotemResult = shareAnimalTotemResult;
  global.startAnimalTotemMeditation = startAnimalTotemRitual;
  global.drawAnimalTotemCard = revealAnimalTotemCard;
})(window);
