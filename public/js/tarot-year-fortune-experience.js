/**
 * 십이지신 천운 타로 — 12카드 월별 스프레드
 * API: POST /api/tarot/draw (spreadType: yearly_twelve_card)
 *      POST /api/tarot/reading (spreadType: yearly_twelve_card, cards)
 * 12장의 카드(1월~12월) → 월별 재물·연애·인간관계·합격운 상세
 */
(function () {
  "use strict";

  var MONTH_LABELS_CJK = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
  var ZODIAC_EMOJI = ["🐭", "🐮", "🐅", "🐇", "🐉", "🐍", "🐴", "🐐", "🐒", "🐓", "🐕", "🐷"];

  var state = {
    cards: [],
    reading: null,
    consultingHighlights: [],
    engineMeta: null,
    hasAccess: false,
    paymentInFlight: false,
    selectedMonth: null,
    activeCategory: "general",
    monthSpreadCache: {},
    monthCategoryCache: {},
    monthRequestToken: 0
  };
  var YEAR_COIN_COST = 30;
  var YEAR_REASON = "십이지신 천운 타로";
  var YEAR_FEATURE_KEY = "tarot-year-fortune";
  var TAROT_API_TIMEOUT_MS = 9000;

  function byId(id) {
    return document.getElementById(id);
  }

  function normalizeApiBase(raw) {
    return String(raw || "").trim().replace(/\/+$/, "");
  }

  function getRuntimeEnvApiBase() {
    try {
      if (typeof process !== "undefined" && process && process.env) {
        var envBase = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.CLOUDFLARE_API_BASE_URL || process.env.API_BASE_URL;
        if (envBase) return normalizeApiBase(envBase);
      }
    } catch (e) {}

    if (typeof window !== "undefined") {
      try {
        if (window.__ENV__ && window.__ENV__.NEXT_PUBLIC_API_BASE_URL) {
          return normalizeApiBase(window.__ENV__.NEXT_PUBLIC_API_BASE_URL);
        }
        if (window.__CF_PAGES_API_BASE_URL) {
          return normalizeApiBase(window.__CF_PAGES_API_BASE_URL);
        }
        var meta = document.querySelector('meta[name="code-destiny-api-base"]');
        if (meta && meta.content) return normalizeApiBase(meta.content);
      } catch (e2) {}
    }

    return "";
  }

  function createTarotApiError(message, details) {
    var err = new Error(message);
    if (details && typeof details === "object") {
      Object.keys(details).forEach(function (key) {
        err[key] = details[key];
      });
    }
    return err;
  }

  function logTarotApiError(stage, details, error) {
    var safeDetails = details || {};
    console.error("[Tarot API Debug] " + stage, safeDetails, error);
    if (error && error.responseBody) {
      console.error("[Tarot API Debug] responseBody:", error.responseBody);
    }
  }

  function getTarotApiBase() {
    var runtimeBase = getRuntimeEnvApiBase();
    if (runtimeBase) return runtimeBase;
    if (typeof getFortuneApiBaseUrl === "function") {
      var base = getFortuneApiBaseUrl();
      if (base) return normalizeApiBase(base);
    }
    if (typeof window !== "undefined") {
      if (window.CODE_DESTINY_API_BASE_URL) return normalizeApiBase(window.CODE_DESTINY_API_BASE_URL);
      var host = String(location.hostname || "").toLowerCase();
      if (host === "localhost" || host === "127.0.0.1") return "http://localhost:3000";
      return normalizeApiBase(location.origin || "");
    }
    return "";
  }

  function isSafeTarotApiBase(raw) {
    var base = normalizeApiBase(raw);
    if (!base) return false;
    try {
      var parsed = new URL(base);
      var host = String(parsed.hostname || "").toLowerCase();
      if (host === "localhost" || host === "127.0.0.1") return true;
      if (typeof window === "undefined") return false;
      var sameOrigin = normalizeApiBase(location.origin || "");
      return normalizeApiBase(parsed.origin || "") === sameOrigin;
    } catch (e) {
      return false;
    }
  }

  function buildTarotApiBaseCandidates() {
    var out = [];
    var seen = Object.create(null);
    function add(raw) {
      var normalized = String(raw || "").trim();
      if (!normalized) normalized = "";
      else normalized = normalized.replace(/\/+$/, "");
      if (seen[normalized]) return;
      seen[normalized] = true;
      out.push(normalized);
    }

    // Always try same-origin API first (Cloudflare Pages/OpenNext safe path).
    add("");
    if (typeof window !== "undefined") {
      var sameOrigin = String(location.origin || "").replace(/\/+$/, "");
      if (sameOrigin) add(sameOrigin);
    }

    var runtimeBase = getRuntimeEnvApiBase();
    if (isSafeTarotApiBase(runtimeBase)) add(runtimeBase);
    var computedBase = getTarotApiBase();
    if (isSafeTarotApiBase(computedBase)) add(computedBase);

    if (typeof window !== "undefined") {
      var host = String(location.hostname || "").toLowerCase();
      if (host === "localhost" || host === "127.0.0.1") {
        add("http://localhost:3000");
        add("http://localhost:4000");
      }
    } else {
      add("http://localhost:3000");
      add("http://localhost:4000");
    }

    return out;
  }

  function postJsonWithTimeout(url, body) {
    var supportsAbort = typeof AbortController === "function";
    if (!supportsAbort) {
      return Promise.race([
        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body,
          cache: "no-store",
        }),
        new Promise(function (_, reject) {
          setTimeout(function () { reject(new Error("Tarot API timeout")); }, TAROT_API_TIMEOUT_MS);
        }),
      ]);
    }
    var controller = new AbortController();
    var timeoutId = setTimeout(function () { controller.abort(); }, TAROT_API_TIMEOUT_MS);
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body,
      cache: "no-store",
      signal: controller.signal,
    })
      .catch(function (error) {
        if (error && error.name === "AbortError") throw new Error("Tarot API timeout");
        throw error;
      })
      .finally(function () { clearTimeout(timeoutId); });
  }

  function callTarotApi(endpoint, payload) {
    var bases = buildTarotApiBaseCandidates();
    var body = JSON.stringify(payload || {});
    var index = 0;
    var lastError = null;

    function requestWithBase(base) {
      var url = (base ? base + "/api/tarot/" : "/api/tarot/") + endpoint;
      var requestDebug = {
        endpoint: endpoint,
        base: base || "(relative)",
        url: url,
        payload: payload || {},
      };
      return postJsonWithTimeout(url, body)
        .then(function (res) {
          if (!res.ok) {
            return res.text().catch(function () { return ""; }).then(function (rawBody) {
              throw createTarotApiError("Tarot API HTTP error: " + res.status, {
                status: res.status,
                statusText: res.statusText,
                endpoint: endpoint,
                base: base || "",
                url: url,
                responseBody: String(rawBody || "").slice(0, 500),
              });
            });
          }
          return res.json().catch(function (parseError) {
            throw createTarotApiError("Tarot API JSON parse error", {
              endpoint: endpoint,
              base: base || "",
              url: url,
              parseError: parseError && parseError.message ? parseError.message : String(parseError || ""),
            });
          });
        })
        .then(function (data) {
          if (!data || data.ok === false) {
            throw createTarotApiError("Invalid API response", {
              endpoint: endpoint,
              base: base || "",
              url: url,
              responseData: data,
            });
          }
          return data;
        })
        .catch(function (error) {
          logTarotApiError("request_failed", requestDebug, error);
          throw error;
        });
    }

    function tryNext() {
      if (index >= bases.length) {
        throw lastError || new Error("Tarot API request failed");
      }
      var base = bases[index++];
      return requestWithBase(base).catch(function (error) {
        lastError = error;
        if (index < bases.length) {
          console.error("[Tarot API Debug] retry_next_base", {
            endpoint: endpoint,
            failedBase: base || "(relative)",
            nextBase: bases[index] || "(relative)",
          });
        }
        return tryNext();
      });
    }

    return tryNext().catch(function (error) {
      logTarotApiError("all_candidates_failed", {
        endpoint: endpoint,
        baseCandidates: bases,
      }, error);
      throw error;
    });
  }

  function getAuthToken() {
    try {
      return localStorage.getItem("fortune_auth_token") || localStorage.getItem("cdToken") || "";
    } catch (e) {
      return "";
    }
  }

  function isYearAdminLikeUser() {
    try {
      if (typeof window.__cdIsAdminLikeUser === "function" && window.__cdIsAdminLikeUser()) return true;
    } catch (e) {}
    try {
      if (window.__cdAdminBypass) return true;
    } catch (e2) {}
    return false;
  }

  function showCoinShortage(cost, reason) {
    try {
      if (typeof window.__cdOpenChargeModal === "function") {
        window.alert("🪙 " + reason + "\n\n" + cost + "코인이 필요합니다.\n코인 충전 창을 엽니다.");
        window.__cdOpenChargeModal();
        return;
      }
    } catch (e) {}
    if (window.confirm("🪙 " + reason + "\n\n" + cost + "코인이 필요합니다.\n충전 페이지로 이동할까요?")) {
      window.location.href = "/points";
    }
  }

  function consumeCoinDirect(cost, reason, featureKey) {
    if (isYearAdminLikeUser()) return Promise.resolve(true);
    var token = getAuthToken();
    var headers = {
      "Content-Type": "application/json",
    };
    if (token) headers.Authorization = "Bearer " + token;

    if (typeof window._cdSetCoinGateOverlay === 'function') window._cdSetCoinGateOverlay(true, '결제를 확인 중입니다...');
    return fetch("/api/fortune/pig-coin/consume", {
      method: "POST",
      credentials: "include",
      headers: headers,
      body: JSON.stringify({
        cost: cost,
        reason: reason,
        featureKey: featureKey,
        forceDeduct: true,
        requestId: "tarot-year:" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9),
      }),
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (res.status === 401 || res.status === 403) {
            if (window.confirm("🔒 로그인이 필요합니다. 로그인 페이지로 이동할까요?")) {
              var next = encodeURIComponent(location.pathname + location.search);
              window.location.href = "/login?next=" + next;
            }
            return false;
          }
          if (res.status === 402) {
            showCoinShortage(cost, reason);
            return false;
          }
          if (!res.ok || data.ok === false) {
            window.alert(String(data.message || "코인 차감에 실패했습니다."));
            return false;
          }
          return true;
        });
      })
      .catch(function () {
        window.alert("결제 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
        return false;
      })
      .finally(function () {
        if (typeof window._cdSetCoinGateOverlay === 'function') window._cdSetCoinGateOverlay(false);
      });
  }

  function rollbackCoinBestEffort(cost, reason, featureKey) {
    var token = getAuthToken();
    if (!token) return Promise.resolve(false);
    return fetch("/api/fortune/pig-coin/earn", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({
        amount: cost,
        reason: "자동 복구: " + reason,
        featureKey: featureKey + "-rollback",
      }),
    }).then(function (res) {
      return !!res && res.ok;
    }).catch(function () {
      return false;
    });
  }

  function requireYearAccess() {
    if (isYearAdminLikeUser()) {
      state.hasAccess = true;
      state.paymentInFlight = false;
      return Promise.resolve(true);
    }
    if (state.hasAccess) return Promise.resolve(true);
    if (state.paymentInFlight) return Promise.resolve(false);
    state.paymentInFlight = true;

    return new Promise(function (resolve) {
      function done(ok) {
        state.paymentInFlight = false;
        state.hasAccess = !!ok;
        resolve(!!ok);
      }

      if (typeof window._cdCoinGatePerUse === "function") {
        window._cdCoinGatePerUse(
          YEAR_COIN_COST,
          YEAR_REASON,
          function () { done(true); },
          function () { done(false); }
        );
        return;
      }

      consumeCoinDirect(YEAR_COIN_COST, YEAR_REASON, YEAR_FEATURE_KEY)
        .then(function (ok) { done(ok); })
        .catch(function () { done(false); });
    });
  }

  var TAROT_LOCAL_BASES = ["/tarot-cards/", "/public/tarot-cards/", "tarot-cards/", "public/tarot-cards/"];
  var TAROT_LOCAL_BASE = TAROT_LOCAL_BASES[0];
  var TAROT_DEFAULT_FALLBACK_IMAGE = TAROT_LOCAL_BASE + "thefool.jpeg";
  var CARD_TO_FILENAME = {
    M00: "thefool.jpeg", M01: "themagician.jpeg", M02: "thehighpriestess.jpeg", M03: "theempress.jpeg",
    M04: "theemperor.jpeg", M05: "thehierophant.jpeg", M06: "TheLovers.jpg", M07: "thechariot.jpeg",
    M08: "thestrength.jpeg", M09: "thehermit.jpeg", M10: "wheeloffortune.jpeg", M11: "justice.jpeg",
    M12: "thehangedman.jpeg", M13: "death.jpeg", M14: "temperance.jpeg", M15: "thedevil.jpeg",
    M16: "thetower.jpeg", M17: "thestar.jpeg", M18: "themoon.jpeg", M19: "thesun.jpeg",
    M20: "judgement.jpeg", M21: "theworld.jpeg",
    W01: "aceofwands.jpeg", W02: "twoofwands.jpeg", W03: "threeofwands.jpeg", W04: "fourofwands.jpeg",
    W05: "fiveofwands.jpeg", W06: "sixofwands.jpeg", W07: "sevenofwands.jpeg", W08: "eightofwands.jpeg",
    W09: "nineofwands.jpeg", W10: "tenofwands.jpeg", W11: "pageofwands.jpeg", W12: "knightofwands.jpeg",
    W13: "queenofwands.jpeg", W14: "kingofwands.jpeg",
    C01: "aceofcups.jpeg", C02: "twoofcups.jpeg", C03: "threeofcups.jpeg", C04: "fourofcups.jpeg",
    C05: "fiveofcups.jpeg", C06: "sixofcups.jpeg", C07: "sevenofcups.jpeg", C08: "eightofcups.jpeg",
    C09: "nineofcups.jpeg", C10: "tenofcups.jpeg", C11: "pageofcups.jpeg", C12: "knightofcups.jpeg",
    C13: "queenofcups.jpeg", C14: "kingofcups.jpeg",
    S01: "aceofswords.jpeg", S02: "twoofswords.jpeg", S03: "threeofswords.jpeg", S04: "fourofswords.jpeg",
    S05: "fiveofswords.jpeg", S06: "sixofswords.jpeg", S07: "sevenofswords.jpeg", S08: "eightofswords.jpeg",
    S09: "nineofswords.jpeg", S10: "tenofswords.jpeg", S11: "pageofswords.jpeg", S12: "knightofswords.jpeg",
    S13: "queenofswords.jpeg", S14: "kingofswords.jpeg",
    P01: "aceofpentacles.jpeg", P02: "twoofpentacles.jpeg", P03: "threeofpentacles.jpeg", P04: "fourofpentacles.jpeg",
    P05: "fiveofpentacles.jpeg", P06: "sixofpentacles.jpeg", P07: "sevenofpentacles.jpeg", P08: "eightofpentacles.jpeg",
    P09: "nineofpentacles.jpeg", P10: "tenofpentacles.jpeg", P11: "pageofpentacles.jpeg", P12: "knightofpentacles.jpeg",
    P13: "queenofpentacles.jpeg", P14: "kingofpentacles.jpeg",
  };

  var CARD_NAME_KR = { M00:"바보",M01:"마법사",M02:"여사제",M03:"여황제",M04:"황제",M05:"교황",M06:"연인",M07:"전차",M08:"힘",M09:"은둔자",M10:"운명의 수레바퀴",M11:"정의",M12:"매달린 사람",M13:"죽음",M14:"절제",M15:"악마",M16:"탑",M17:"별",M18:"달",M19:"태양",M20:"심판",M21:"세계" };
  var MINOR_RANK_KR = ["에이스","2","3","4","5","6","7","8","9","10","페이지","기사","퀸","킹"];
  var MINOR_SUIT_KR = { W:"완드", C:"컵", S:"소드", P:"펜타클" };
  function getCardNameKr(cardId) {
    if (CARD_NAME_KR[cardId]) return CARD_NAME_KR[cardId];
    var id = String(cardId || "").trim();
    if (!id) return id;
    var suit = MINOR_SUIT_KR[id.charAt(0)];
    var num = parseInt(id.slice(1), 10);
    if (suit && !isNaN(num) && num >= 1 && num <= 14) {
      return suit + " " + (MINOR_RANK_KR[num - 1] || String(num));
    }
    return id;
  }

  function getLocalTarotImageUrl(card) {
    if (!card) return "";
    var cardId = String(card.cardId || card.id || "").trim().toUpperCase();
    var fn = CARD_TO_FILENAME[cardId];
    if (fn) return TAROT_LOCAL_BASE + fn;
    var hinted = String(card.localImageUrl || "").trim();
    return hinted || "";
  }

  function getLocalTarotImageCandidates(card) {
    var localUrl = getLocalTarotImageUrl(card);
    if (!localUrl) return [];
    var fileName = String(localUrl).split("/").pop();
    if (!fileName) return [localUrl];
    return TAROT_LOCAL_BASES.map(function (base) {
      return String(base || "") + fileName;
    });
  }

  function applyTarotImageToCard(imgEl, frontEl, card) {
    if (!imgEl) return;
    var candidates = [];
    function pushCandidateVariants(list, url) {
      var raw = String(url || "").trim();
      if (!raw) return;
      list.push(raw);
      if (/^https?:\/\//i.test(raw)) return;
      if (raw.charAt(0) === "/") list.push(raw.slice(1));
      else list.push("/" + raw);
    }
    function absolutizeUrl(url) {
      var raw = String(url || "").trim();
      if (!raw) return "";
      if (/^https?:\/\//i.test(raw)) return raw;
      var base = getTarotApiBase();
      if (!base) return raw;
      return String(base).replace(/\/+$/, "") + (raw.charAt(0) === "/" ? raw : "/" + raw);
    }
    getLocalTarotImageCandidates(card).forEach(function (u) { pushCandidateVariants(candidates, u); });
    if (card && card.proxyImageUrl) {
      pushCandidateVariants(candidates, absolutizeUrl(card.proxyImageUrl));
      pushCandidateVariants(candidates, card.proxyImageUrl);
    }
    if (Array.isArray(card && card.imageCandidates) && card.imageCandidates.length) {
      card.imageCandidates.forEach(function (u) { pushCandidateVariants(candidates, u); });
    } else if (card && card.imageUrl) {
      pushCandidateVariants(candidates, card.imageUrl);
    }
    candidates = candidates.filter(Boolean).filter(function (u, i, arr) { return arr.indexOf(u) === i; });
    if (!candidates.length) return;
    var idx = 0;
    imgEl.referrerPolicy = "no-referrer";
    imgEl.decoding = "async";
    function tryNext() {
      if (idx >= candidates.length) {
        if (imgEl.src !== TAROT_DEFAULT_FALLBACK_IMAGE) {
          imgEl.onerror = null;
          imgEl.src = TAROT_DEFAULT_FALLBACK_IMAGE;
        }
        return;
      }
      var url = candidates[idx++];
      if (frontEl) {
        frontEl.style.backgroundImage = "url('" + url + "')";
        frontEl.style.backgroundSize = "cover";
        frontEl.style.backgroundPosition = "center";
      }
      imgEl.onerror = tryNext;
      imgEl.src = url;
    }
    tryNext();
  }

  function escapeHtml(s) {
    if (!s) return "";
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function bindTarotYearStaticActions() {
    var ctaBtn = byId("tarotYearCtaBtn");
    if (ctaBtn && !ctaBtn.__tyCtaBound) {
      ctaBtn.__tyCtaBound = true;
      ctaBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        startTarotYearFortuneReading();
      });
    }

    var closeBtn = byId("tarotYearCloseBtn");
    if (closeBtn && !closeBtn.__tyCloseBound) {
      closeBtn.__tyCloseBound = true;
      closeBtn.addEventListener("click", function (e) {
        e.preventDefault();
        closeTarotYearFortuneModal();
      });
    }

    var shareBtn = byId("tarotYearShareBtn");
    if (shareBtn && !shareBtn.__tyShareBound) {
      shareBtn.__tyShareBound = true;
      shareBtn.addEventListener("click", function (e) {
        e.preventDefault();
        shareTarotYearFortuneResult();
      });
    }

    var resetBtn = byId("tarotYearResetBtn");
    if (resetBtn && !resetBtn.__tyResetBound) {
      resetBtn.__tyResetBound = true;
      resetBtn.addEventListener("click", function (e) {
        e.preventDefault();
        resetTarotYearFortuneFlow();
      });
    }

    var homeBtn = byId("tarotYearHomeBtn");
    if (homeBtn && !homeBtn.__tyHomeBound) {
      homeBtn.__tyHomeBound = true;
      homeBtn.addEventListener("click", function (e) {
        e.preventDefault();
        closeTarotYearFortuneModal();
      });
    }
  }

  function openTarotYearFortuneModal() {
    try {
      var overlay = byId("tarotYearFortuneOverlay");
      if (!overlay) return;
      overlay.style.display = "block";
      overlay.classList.add("is-open");
      if (window._perf && window._perf.lockBody) window._perf.lockBody();
      else document.body.style.overflow = "hidden";
      resetTarotYearFortuneFlow();
      bindTarotYearStaticActions();
    } catch (err) {
      console.error("[Tarot Year Fortune] openTarotYearFortuneModal error:", err);
      try {
        document.body.style.overflow = "";
        var ov = byId("tarotYearFortuneOverlay");
        if (ov) { ov.style.display = "none"; ov.classList.remove("is-open"); }
      } catch (e2) {}
    }
  }

  function closeTarotYearFortuneModal() {
    try {
      var overlay = byId("tarotYearFortuneOverlay");
      if (!overlay) return;
      overlay.style.display = "none";
      overlay.classList.remove("is-open");
      state.hasAccess = false;
      state.paymentInFlight = false;
      if (window._perf && window._perf.unlockBody) window._perf.unlockBody();
      else document.body.style.overflow = "";
    } catch (err) {
      console.error("[Tarot Year Fortune] closeTarotYearFortuneModal error:", err);
      try { document.body.style.overflow = ""; } catch (e2) {}
    }
  }

  function resetTarotYearFortuneFlow() {
    state.cards = [];
    state.reading = null;
    state.consultingHighlights = [];
    state.engineMeta = null;
    state.hasAccess = false;
    state.paymentInFlight = false;
    state.selectedMonth = null;
    state.activeCategory = "general";
    state.monthSpreadCache = {};
    state.monthCategoryCache = {};
    state.monthRequestToken = 0;
    var intro = byId("tarotYearFortuneIntroStage");
    var draw = byId("tarotYearFortuneDrawStage");
    var result = byId("tarotYearFortuneResultStage");
    if (intro) intro.classList.add("is-active");
    if (draw) draw.classList.remove("is-active");
    if (result) result.classList.remove("is-active");
    var tabs = byId("tarotYearMonthCategoryTabs");
    if (tabs) {
      var btns = tabs.querySelectorAll(".ty-month-cat-btn");
      btns.forEach(function (btn) {
        btn.classList.toggle("is-active", btn.getAttribute("data-cat") === "general");
      });
    }
  }

  function startTarotYearFortuneReading() {
    requireYearAccess().then(function (ok) {
      if (!ok) return;
      _runTarotYearFortuneReading();
    });
  }

  function _runTarotYearFortuneReading() {
    if (!state.hasAccess) {
      window.alert("결제가 확인되지 않아 결과를 표시할 수 없습니다.");
      return;
    }

    var intro = byId("tarotYearFortuneIntroStage");
    var draw = byId("tarotYearFortuneDrawStage");
    var result = byId("tarotYearFortuneResultStage");
    var ctaBtn = byId("tarotYearCtaBtn");
    if (!intro || !result) return;

    intro.classList.remove("is-active");
    draw.classList.add("is-active");

    callTarotApi("draw", { spreadType: "yearly_twelve_card" })
      .then(function (drawData) {
        if (!drawData.cards || drawData.cards.length !== 12) throw new Error("Invalid draw");
        state.cards = drawData.cards;
        showTarotYearFinalReading();
      })
      .catch(function (err) {
        console.error("Tarot Year Fortune draw error:", err);
        tryClientSideDraw();
      });
  }

  function tryClientSideDraw() {
    var fullDeck = ["M00","M01","M02","M03","M04","M05","M06","M07","M08","M09","M10","M11","M12","M13","M14","M15","M16","M17","M18","M19","M20","M21",
      "W01","W02","W03","W04","W05","W06","W07","W08","W09","W10","W11","W12","W13","W14",
      "C01","C02","C03","C04","C05","C06","C07","C08","C09","C10","C11","C12","C13","C14",
      "S01","S02","S03","S04","S05","S06","S07","S08","S09","S10","S11","S12","S13","S14",
      "P01","P02","P03","P04","P05","P06","P07","P08","P09","P10","P11","P12","P13","P14"];
    var shuffled = fullDeck.slice().sort(function(){ return Math.random()-0.5; });
    var labels = ["month_1","month_2","month_3","month_4","month_5","month_6","month_7","month_8","month_9","month_10","month_11","month_12"];
    state.cards = shuffled.slice(0, 12).map(function(id, i){
      var ori = Math.random()<0.5?"upright":"reversed";
      var fn = CARD_TO_FILENAME[id];
      return {
        cardId:id, name:id, nameKr:getCardNameKr(id), orientation:ori, position:labels[i],
        imageUrl:"", proxyImageUrl:"", imageCandidates:[],
        localImageUrl: fn ? TAROT_LOCAL_BASE + fn : ""
      };
    });
    showTarotYearFinalReading();
  }

  function renderTarotYearDrawCards() {
    var grid = byId("tarotYearDrawCardGrid");
    if (!grid || !state.cards.length) return;
    grid.innerHTML = "";
    grid.className = "ty-draw-grid ty-draw-grid--twelve";

    state.cards.forEach(function (card, idx) {
      var slot = document.createElement("div");
      slot.className = "ty-draw-slot ty-draw-slot--month";
      slot.setAttribute("data-month", idx + 1);

      var label = document.createElement("span");
      label.className = "ty-draw-slot-label";
      label.textContent = ZODIAC_EMOJI[idx] + " " + MONTH_LABELS_CJK[idx];

      var cardEl = document.createElement("div");
      // 드로우 스테이지에서는 처음부터 앞면이 보이도록 플립 상태를 기본값으로 둔다.
      // 이렇게 하면 중간에 뒤집히는 애니메이션 없이 바로 카드 앞면만 노출된다.
      cardEl.className = "ty-draw-card ty-draw-card--month ty-draw-card--flipped";
      cardEl.setAttribute("data-month-idx", idx);
      cardEl.onclick = (function (m) {
        return function () { selectMonthDetail(m); };
      })(idx + 1);

      var inner = document.createElement("div");
      inner.className = "ty-draw-card-inner";

      var back = document.createElement("div");
      back.className = "ty-draw-card-back";

      var front = document.createElement("div");
      front.className = "ty-draw-card-front";
      if (card.orientation === "reversed") front.setAttribute("data-reversed", "1");

      var img = document.createElement("img");
      img.className = "ty-draw-card-img";
      img.alt = (card.nameKr || card.name) + (card.orientation === "reversed" ? " (역)" : "");
      img.loading = "lazy";
      img.decoding = "async";
      try {
        img.fetchPriority = idx === 0 ? "high" : "low";
      } catch (e) {}
      applyTarotImageToCard(img, front, card);
      front.appendChild(img);

      var nameSpan = document.createElement("span");
      nameSpan.className = "ty-draw-card-name";
      nameSpan.textContent = (card.nameKr || card.name) + (card.orientation === "reversed" ? " (역)" : "");
      front.appendChild(nameSpan);

      inner.appendChild(back);
      inner.appendChild(front);
      cardEl.appendChild(inner);
      slot.appendChild(label);
      slot.appendChild(cardEl);
      grid.appendChild(slot);
    });
  }

  function normalizeYearlyReadingPayload(data) {
    if (!data) return null;
    var reading = data.reading;
    if (reading && reading.reading && (reading.reading.monthlyReadings || reading.reading.summary)) {
      reading = reading.reading;
    }
    if (!reading || typeof reading !== "object") return null;

    var mr = reading.monthlyReadings;
    if (!mr) return reading;

    // Some deployments may serialize monthlyReadings as an object keyed by month / month_1...
    if (!Array.isArray(mr) && typeof mr === "object") {
      var arr = [];
      Object.keys(mr).forEach(function (k) {
        var v = mr[k];
        if (!v || typeof v !== "object") return;
        var monthNum = v.month || (function () {
          var m = String(k || "").match(/(\d{1,2})/);
          return m ? parseInt(m[1], 10) : null;
        })();
        if (monthNum && !isNaN(monthNum)) v.month = monthNum;
        arr.push(v);
      });
      reading.monthlyReadings = arr;
      mr = arr;
    }

    if (Array.isArray(mr)) {
      reading.monthlyReadings = mr
        .filter(Boolean)
        .slice()
        .sort(function (a, b) {
          return (a && a.month ? a.month : 0) - (b && b.month ? b.month : 0);
        });
    }
    return reading;
  }

  function getMonthlyReadingByMonth(reading, monthNum) {
    if (!reading || !reading.monthlyReadings) return null;
    var mr = reading.monthlyReadings;
    if (!Array.isArray(mr)) return null;
    for (var i = 0; i < mr.length; i++) {
      if (mr[i] && Number(mr[i].month) === Number(monthNum)) return mr[i];
    }
    // fallback to index if month field is missing
    return mr[monthNum - 1] || null;
  }

  function toReadableText(value, fallback) {
    var text = String(value || "").trim();
    return text || fallback;
  }

  function mapCategoryForApi(cat) {
    if (cat === "money") return "money";
    if (cat === "love") return "love";
    if (cat === "exam") return "career";
    return "general";
  }

  function getMonthlyBaseText(monthly, cat) {
    if (!monthly) return "";
    if (cat === "money") return monthly.money || "";
    if (cat === "love") return monthly.love || "";
    if (cat === "relationship") return monthly.relationship || "";
    if (cat === "exam") return monthly.exam || "";
    return monthly.flow || "";
  }

  function getCategoryTitle(cat) {
    if (cat === "money") return "재물운 해석";
    if (cat === "love") return "연애운 해석";
    if (cat === "relationship") return "인간관계운 해석";
    if (cat === "exam") return "합격운 해석";
    return "전반 운세 해석";
  }

  function fallbackThreeCardSpread() {
    var fullDeck = ["M00","M01","M02","M03","M04","M05","M06","M07","M08","M09","M10","M11","M12","M13","M14","M15","M16","M17","M18","M19","M20","M21",
      "W01","W02","W03","W04","W05","W06","W07","W08","W09","W10","W11","W12","W13","W14",
      "C01","C02","C03","C04","C05","C06","C07","C08","C09","C10","C11","C12","C13","C14",
      "S01","S02","S03","S04","S05","S06","S07","S08","S09","S10","S11","S12","S13","S14",
      "P01","P02","P03","P04","P05","P06","P07","P08","P09","P10","P11","P12","P13","P14"];
    var labels = ["cause", "process", "outcome"];
    return fullDeck.slice().sort(function(){ return Math.random()-0.5; }).slice(0, 3).map(function(id, i){
      var ori = Math.random() < 0.5 ? "upright" : "reversed";
      var fn = CARD_TO_FILENAME[id];
      return {
        cardId:id, name:id, nameKr:getCardNameKr(id), orientation:ori, position:labels[i],
        imageUrl:"", proxyImageUrl:"", imageCandidates:[],
        localImageUrl: fn ? TAROT_LOCAL_BASE + fn : ""
      };
    });
  }

  function renderMonthSpreadCards(cards) {
    var spreadEl = byId("tarotYearMonthSpreadCards");
    if (!spreadEl) return;
    spreadEl.innerHTML = "";
    (cards || []).forEach(function (card, idx) {
      var slot = document.createElement("div");
      slot.className = "ty-month-spread-card";
      var label = document.createElement("span");
      label.className = "ty-month-spread-pos";
      label.textContent = idx === 0 ? "원인" : idx === 1 ? "전개" : "결과";
      var imgWrap = document.createElement("div");
      imgWrap.className = "ty-month-spread-img-wrap";
      if (card.orientation === "reversed") imgWrap.setAttribute("data-reversed", "1");
      var img = document.createElement("img");
      img.className = "ty-month-spread-img";
      img.alt = (card.nameKr || card.name || "타로 카드") + (card.orientation === "reversed" ? " (역)" : "");
      applyTarotImageToCard(img, imgWrap, card);
      var name = document.createElement("span");
      name.className = "ty-month-spread-name";
      name.textContent = (card.nameKr || card.name || "카드") + (card.orientation === "reversed" ? " (역)" : "");
      imgWrap.appendChild(img);
      slot.appendChild(label);
      slot.appendChild(imgWrap);
      slot.appendChild(name);
      spreadEl.appendChild(slot);
    });
  }

function typewriterText(el, text, speedMs) {
  if (!el) return;
  var full = String(text || "").trim();
  if (!full) {
    el.textContent = "";
    return;
  }
  if (el.__tyTimer) {
    clearInterval(el.__tyTimer);
    el.__tyTimer = null;
  }
  var idx = 0;
  var len = full.length;
  el.textContent = "";
  el.classList.add("ty-text-typing");
  el.classList.remove("ty-text-typed");
  el.__tyTimer = setInterval(function () {
    if (idx >= len) {
      clearInterval(el.__tyTimer);
      el.__tyTimer = null;
      el.classList.remove("ty-text-typing");
      el.classList.add("ty-text-typed");
      return;
    }
    el.textContent += full.charAt(idx++);
  }, speedMs || 26);
}

function updateMonthCategoryPanel(text, cat) {
  var titleEl = byId("tarotYearMonthCategoryTitle");
  var textEl = byId("tarotYearMonthCategoryText");
  if (titleEl) titleEl.textContent = getCategoryTitle(cat);
  if (textEl) {
    typewriterText(textEl, text, 22);
  }
}

  function bindMonthCategoryTabs() {
    var tabs = byId("tarotYearMonthCategoryTabs");
    if (!tabs || tabs.__bound) return;
    tabs.__bound = true;
    tabs.addEventListener("click", function (e) {
      var btn = e.target && e.target.closest ? e.target.closest(".ty-month-cat-btn") : null;
      if (!btn) return;
      var cat = btn.getAttribute("data-cat") || "general";
      state.activeCategory = cat;
      var all = tabs.querySelectorAll(".ty-month-cat-btn");
      all.forEach(function (el) { el.classList.toggle("is-active", el === btn); });
      if (state.selectedMonth) {
        loadMonthCategoryConsultation(state.selectedMonth, cat);
      }
    });
  }

  function bindMonthTileClicks() {
    var cardsEl = byId("tarotYearResultCards");
    if (!cardsEl || cardsEl.__monthTileBound) return;
    cardsEl.__monthTileBound = true;
    cardsEl.addEventListener("click", function (e) {
      var target = e.target && e.target.closest ? e.target.closest(".ty-result-card-wrap--month") : null;
      if (!target) return;
      var month = parseInt(target.getAttribute("data-month"), 10);
      if (isNaN(month)) return;
      e.preventDefault();
      selectMonthDetail(month);
    });
  }

  function loadMonthCategoryConsultation(monthNum, cat) {
    var monthly = getMonthlyReadingByMonth(state.reading, monthNum);
    var monthKey = String(monthNum);
    if (!state.monthCategoryCache[monthKey]) state.monthCategoryCache[monthKey] = {};
    if (state.monthCategoryCache[monthKey][cat]) {
      updateMonthCategoryPanel(state.monthCategoryCache[monthKey][cat], cat);
      return Promise.resolve();
    }

    var spreadCards = state.monthSpreadCache[monthKey] || [];
    var baseText = getMonthlyBaseText(monthly, cat);
    var fallbackByCat = {
      general: "이번 달의 흐름은 차분한 점검과 실행의 균형에서 열립니다.",
      money: "지출 우선순위를 정하고 현금흐름을 안정시키는 것이 핵심입니다.",
      love: "감정을 명확히 표현하면 관계의 온도가 올라갑니다.",
      relationship: "경계를 존중하는 대화가 인간관계를 안정시킵니다.",
      exam: "짧고 반복적인 학습 루틴이 합격운을 높입니다."
    };
    if (!spreadCards.length) {
      var onlyBase = toReadableText(baseText, fallbackByCat[cat]);
      state.monthCategoryCache[monthKey][cat] = onlyBase;
      updateMonthCategoryPanel(onlyBase, cat);
      return Promise.resolve();
    }

    var apiCat = mapCategoryForApi(cat);
    return callTarotApi("reading", {
      category: apiCat,
      spreadType: "three_card_cause_process_outcome",
      cards: spreadCards.map(function (c) { return { cardId: c.cardId, position: c.position, orientation: c.orientation }; })
    }).then(function (res) {
      var story = String(res && res.reading && res.reading.story || "").trim();
      var advice = String(res && res.reading && res.reading.advice || "").trim();
      var combined = [toReadableText(baseText, ""), story, advice].filter(Boolean).join(" ");
      var text = toReadableText(combined, fallbackByCat[cat]);
      state.monthCategoryCache[monthKey][cat] = text;
      updateMonthCategoryPanel(text, cat);
    }).catch(function () {
      var text = toReadableText(baseText, fallbackByCat[cat]);
      state.monthCategoryCache[monthKey][cat] = text;
      updateMonthCategoryPanel(text, cat);
    });
  }

  function ensureMonthlyThreeCardSpread(monthNum) {
    var monthKey = String(monthNum);
    if (state.monthSpreadCache[monthKey]) return Promise.resolve(state.monthSpreadCache[monthKey]);
    return callTarotApi("draw", { spreadType: "three_card_cause_process_outcome" })
      .then(function (res) {
        var cards = Array.isArray(res && res.cards) ? res.cards.slice(0, 3) : [];
        if (cards.length !== 3) throw new Error("invalid monthly spread");
        state.monthSpreadCache[monthKey] = cards;
        return cards;
      })
      .catch(function () {
        var cards = fallbackThreeCardSpread();
        state.monthSpreadCache[monthKey] = cards;
        return cards;
      });
  }

  function selectMonthDetail(monthNum, skipScroll) {
    state.selectedMonth = monthNum;
    var panel = byId("tarotYearMonthDetailPanel");
    if (!panel) return;
    var r = state.reading;
    if (!r || !r.monthlyReadings) return;
    var m = getMonthlyReadingByMonth(r, monthNum);
    if (!m) return;
    var pickedCard = state.cards[monthNum - 1] || {};
    var token = ++state.monthRequestToken;

    panel.classList.add("is-visible");
    panel.classList.remove("ty-month-detail-panel--flip-start", "ty-month-detail-panel--flip-end");

    var placeholder = byId("tarotYearMonthDetailPlaceholder");
    var content = byId("tarotYearMonthDetailContent");
    if (placeholder) placeholder.style.display = "none";
    if (content) content.style.display = "block";

    var monthTiles = document.querySelectorAll(".ty-result-card-wrap--month");
    monthTiles.forEach(function (tile) {
      var isSelected = String(tile.getAttribute("data-month")) === String(monthNum);
      tile.classList.toggle("is-active", isSelected);
    });

    var titleEl = byId("tarotYearMonthDetailTitle");
    if (titleEl) titleEl.textContent = ZODIAC_EMOJI[monthNum - 1] + " " + MONTH_LABELS_CJK[monthNum - 1] + " 상세 운세";

    var cardWrap = byId("tarotYearMonthDetailCardWrap");
    if (cardWrap) {
      if (pickedCard.orientation === "reversed") cardWrap.classList.add("is-reversed");
      else cardWrap.classList.remove("is-reversed");
    }
    var cardImg = byId("tarotYearMonthDetailCardImg");
    if (cardImg) {
      cardImg.removeAttribute("src");
      cardImg.alt = (pickedCard.nameKr || pickedCard.name || "타로 카드") + (pickedCard.orientation === "reversed" ? " (역)" : "");
      applyTarotImageToCard(cardImg, cardWrap, pickedCard);
    }
    var cardName = byId("tarotYearMonthDetailCardName");
    if (cardName) {
      cardName.textContent = (pickedCard.nameKr || pickedCard.name || "이달의 카드") + (pickedCard.orientation === "reversed" ? " (역방향)" : " (정방향)");
    }

    bindMonthCategoryTabs();
    ensureMonthlyThreeCardSpread(monthNum).then(function (spreadCards) {
      if (token !== state.monthRequestToken) return;
      renderMonthSpreadCards(spreadCards);
      loadMonthCategoryConsultation(monthNum, state.activeCategory || "general");

      // 월 상세 카드 및 삼재 스프레드 카드에 부드러운 플립 애니메이션 적용
      if (panel) {
        panel.classList.remove("ty-month-detail-panel--flip-start", "ty-month-detail-panel--flip-end");
        // double-rAF: remove 반영 후 다음 프레임 add → 강제 reflow 없이 flip restart
        requestAnimationFrame(function () {
          panel.classList.add("ty-month-detail-panel--flip-start");
          requestAnimationFrame(function () {
            panel.classList.add("ty-month-detail-panel--flip-end");
          });
        });
      }
    });

    if (!skipScroll) panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function showTarotYearFinalReading() {
    if (!state.cards.length || !state.hasAccess) return;
    var drawnForApi = state.cards.map(function (c) {
      return { cardId: c.cardId, position: c.position, orientation: c.orientation };
    });

    function showResultStage(data) {
      var intro = byId("tarotYearFortuneIntroStage");
      var draw = byId("tarotYearFortuneDrawStage");
      var result = byId("tarotYearFortuneResultStage");
      var normalized = normalizeYearlyReadingPayload(data);
      if (!normalized) return;
      state.reading = normalized;
      state.consultingHighlights = Array.isArray(data && data.consultingHighlights)
        ? data.consultingHighlights
            .map(function (line) { return String(line || "").trim(); })
            .filter(Boolean)
            .slice(0, 4)
        : [];
      state.engineMeta = data && typeof data.engineMeta === "object" ? data.engineMeta : null;
      if (intro) intro.classList.remove("is-active");
      if (draw) draw.classList.remove("is-active");
      if (result) result.classList.add("is-active");
      renderTarotYearResult();
    }

    callTarotApi("reading", {
      category: "general",
      spreadType: "yearly_twelve_card",
      cards: drawnForApi,
    })
      .then(function (data) {
        var normalized = normalizeYearlyReadingPayload(data);
        if (!normalized) throw new Error("No reading data");
        showResultStage(data);
      })
      .catch(function (err) {
        console.error("Tarot Year reading error:", err);
        rollbackCoinBestEffort(YEAR_COIN_COST, YEAR_REASON, YEAR_FEATURE_KEY).then(function (rolledBack) {
          state.hasAccess = false;
          if (rolledBack) {
            window.alert("해석 생성 오류가 발생해 결제 코인을 복구했습니다. 다시 시도해 주세요.");
          } else {
            window.alert("해석 생성 중 오류가 발생했습니다. 결과 페이지 진입이 차단되었습니다. 잠시 후 다시 시도해 주세요.");
          }
          var intro = byId("tarotYearFortuneIntroStage");
          var draw = byId("tarotYearFortuneDrawStage");
          var result = byId("tarotYearFortuneResultStage");
          if (intro) intro.classList.remove("is-active");
          if (draw) draw.classList.add("is-active");
          if (result) result.classList.remove("is-active");
        });
      });
  }

  var CLIENT_INTERP = {
    M00: { u: { g: "새로운 출발이 열리는 시점입니다. 계산보다 신뢰가 더 큰 기회를 만듭니다.", m: "새로운 수입 경로를 실험할 수 있지만 기본 안전장치는 먼저 확보하세요.", l: "관계에서 솔직함과 가벼운 용기가 흐름을 바꿉니다.", c: "익숙한 틀을 벗어난 제안이 성장 기회로 연결됩니다." }, r: { g: "성급한 판단이 손실로 이어질 수 있으니 속도를 낮추세요.", m: "검증되지 않은 투자는 피하고 지출 통제를 먼저 하세요.", l: "감정의 즉흥성이 오해를 만들 수 있어 의도 확인이 필요합니다.", c: "준비 없는 도전보다 역량 보강 후 실행이 유리합니다." } },
    M01: { u: { g: "주도권을 쥐고 실행력이 발휘되는 시기입니다.", m: "계획과 실행이 맞물면 수익이 나옵니다.", l: "관계에서 솔직한 표현이 호감을 더합니다.", c: "역량 발휘와 새로운 도전이 성과로 이어집니다." }, r: { g: "준비가 덜 된 상태에서 무리하지 마세요.", m: "검증되지 않은 투자는 보류하세요.", l: "오해를 피하려면 의도를 분명히 전달하세요.", c: "역량 보강 후 실행이 유리합니다." } },
    M02: { u: { g: "직관과 내면의 목소리에 귀 기울이세요.", m: "숨김 없는 정보 수집이 판단에 도움이 됩니다.", l: "겉보다 속마음이 더 중요한 국면입니다.", c: "침묵과 관찰이 다음 행동을 이끕니다." }, r: { g: "이중적인 상황을 피하려면 솔직함이 필요합니다.", m: "불확실한 정보에 의존하지 마세요.", l: "비밀이 오해를 키울 수 있어 소통이 중요합니다.", c: "숨겨진 의도를 파악하는 것이 우선입니다." } },
    M03: { u: { g: "자연스럽게 성과가 자라나는 국면입니다. 돌봄과 지속성이 핵심입니다.", m: "씨앗형 투자와 장기 플랜이 수익으로 연결될 가능성이 높습니다.", l: "관계가 따뜻하게 성장하기 좋은 시기이며 안정감이 강화됩니다.", c: "팀 케어와 크리에이티브 역량이 성과를 크게 끌어올립니다." }, r: { g: "에너지 고갈이나 과몰입을 점검해야 합니다.", m: "과소비를 줄이고 현금흐름을 안정화해야 합니다.", l: "지나친 간섭이 친밀감을 약화시킬 수 있어 경계가 필요합니다.", c: "성과 압박보다 업무 구조를 재정비하는 것이 우선입니다." } },
    M04: { u: { g: "규칙과 권위가 안정을 가져옵니다. 경계를 분명히 하세요.", m: "계획적 소비와 저축이 재정을 튼튼하게 합니다.", l: "책임과 역할 분담이 관계를 안정시킵니다.", c: "리더십과 원칙이 성과를 이끕니다." }, r: { g: "경직된 태도보다 유연한 조정이 필요합니다.", m: "과한 절약보다 적정선 유지가 중요합니다.", l: "지나친 통제가 관계를 멀게 할 수 있습니다.", c: "권위적 태도보다 협동이 성과를 높입니다." } },
    M05: { u: { g: "전통과 가르침이 길을 밝혀줍니다. 멘토가 도움이 됩니다.", m: "검증된 방식으로 꾸준히 관리하세요.", l: "약속과 원칙이 관계를 지키는 기둥이 됩니다.", c: "선배나 멘토의 조언이 귀합니다." }, r: { g: "틀에 갇히지 말고 새로운 관점을 찾아보세요.", m: "과한 보수는 기회를 놓칠 수 있습니다.", l: "원칙보다 서로의 감정이 먼저입니다.", c: "규칙보다 상황에 맞는 판단이 필요합니다." } },
    M06: { u: { g: "선택과 조화의 시기입니다. 서로를 인정하는 선택이 중요합니다.", m: "협업이 더 큰 수익을 만듭니다.", l: "서로를 선택하고 맞춰가는 핵심 순간입니다.", c: "동반자 의식이 프로젝트를 성공시킵니다." }, r: { g: "갈등보다 대화로 해결을 찾으세요.", m: "혼자보다 함께가 더 유리합니다.", l: "오해를 풀기 위해 먼저 다가가세요.", c: "파트너십 재정비가 필요할 수 있습니다." } },
    M07: { u: { g: "추진력과 목표 지향이 승리로 이어집니다.", m: "실행력이 수익을 만듭니다.", l: "관계에서 방향을 정하면 진전이 빨라집니다.", c: "끝까지 밀어붙이면 성과가 나옵니다." }, r: { g: "속도보다 방향 점검이 먼저입니다.", m: "과한 추진은 리스크를 키울 수 있습니다.", l: "감정보다 방향성 합의가 필요합니다.", c: "일단 멈추고 전략을 재검토하세요." } },
    M08: { u: { g: "인내와 부드러운 힘이 상황을 극복합니다.", m: "꾸준함이 장기 수익을 만듭니다.", l: "통제보다 이해가 관계를 이끕니다.", c: "부드러운 리더십이 팀을 이끕니다." }, r: { g: "자신감 부족을 점검하고 스스로를 믿으세요.", m: "과한 소극은 기회를 놓칩니다.", l: "지나친 양보가 관계를 흐릴 수 있습니다.", c: "주도권을 갖고 나서세요." } },
    M09: { u: { g: "고독과 내면 성찰이 다음 단계를 준비합니다.", m: "신중한 검토 후 결정하세요.", l: "거리와 공간이 관계를 성숙시킵니다.", c: "숙고와 준비가 성과의 기반이 됩니다." }, r: { g: "고립보다 적절한 소통이 필요합니다.", m: "지나친 신중은 기회를 놓칠 수 있습니다.", l: "멀어짐 보다 먼저 대화를 시도하세요.", c: "혼자보다 함께 논의가 도움이 됩니다." } },
    M10: { u: { g: "운명의 수레바퀴가 돌아갑니다. 변화를 받아들이세요.", m: "흐름이 바뀌는 시기입니다. 유연하게 대응하세요.", l: "관계에서 새로운 국면이 열립니다.", c: "상황 변화에 맞춰 전략을 조정하세요." }, r: { g: "변화를 피하더라도 흐름은 옵니다. 준비하세요.", m: "하락 국면은 일시적일 수 있습니다.", l: "역경이 관계를 더 단단하게 할 수 있습니다.", c: "변화를 기회로 삼으세요." } },
    M11: { u: { g: "공정과 균형이 결과를 가져옵니다. 객관적으로 판단하세요.", m: "계약과 조건을 명확히 하세요.", l: "정의와 솔직함이 관계를 지킵니다.", c: "공정한 평가가 성과를 인정합니다." }, r: { g: "편견을 내려놓고 다시 보세요.", m: "불공정한 조건은 피하세요.", l: "한쪽만 희생하면 관계가 기울어집니다.", c: "객관적 자료로 판단하세요." } },
    M12: { u: { g: "잠시 멈추고 뒤돌아보는 시기입니다. 시련이 성장을 줍니다.", m: "지출을 줄이고 현금을 유지하세요.", l: "기다림이 관계를 더 깊게 할 수 있습니다.", c: "인내가 결국 승리로 이어집니다." }, r: { g: "희생이 과하면 본인을 돌보세요.", m: "무리한 지출을 멈추세요.", l: "한쪽만 희생하면 관계가 무너집니다.", c: "방향 전환이 필요할 수 있습니다." } },
    M13: { u: { g: "끝과 새 시작이 맞닿아 있습니다. 변화를 받아들이세요.", m: "구조 조정이 새로운 흐름을 만듭니다.", l: "관계의 전환점이 올 수 있습니다.", c: "마무리와 재시작이 동시에 옵니다." }, r: { g: "변화를 피하려 해도 흐름은 옵니다.", m: "고착된 구조를 바꿀 시기입니다.", l: "과거를 끊고 새로 시작할 용기가 필요합니다.", c: "전환을 기회로 삼으세요." } },
    M14: { u: { g: "균형과 조화가 핵심입니다. 인내와 절제가 결과를 만듭니다.", m: "수입과 지출의 균형을 맞추세요.", l: "서로의 리듬을 맞추면 관계가 진전됩니다.", c: "협업과 조율이 성과를 높입니다." }, r: { g: "균형이 깨졌다면 원인을 찾아 복구하세요.", m: "과소비나 과절약을 점검하세요.", l: "한쪽만 맞추면 관계가 기울어집니다.", c: "업무 분배를 재조정하세요." } },
    M15: { u: { g: "유혹과 집착을 의식하고 자유를 선택하세요.", m: "충동적 소비와 투자를 경계하세요.", l: "관계에서 의존보다 독립이 필요합니다.", c: "구속된 패턴에서 벗어나세요." }, r: { g: "집착에서 해방되는 시기가 올 수 있습니다.", m: "불필요한 지출을 줄이세요.", l: "의존 관계를 끊고 스스로를 세우세요.", c: "틀에 갇힌 생각을 버리세요." } },
    M16: { u: { g: "갑작스러운 변화가 올 수 있습니다. 받아들이면 새 시작이 됩니다.", m: "예상치 못한 지출에 대비하세요.", l: "충격적 사건이 관계를 시험할 수 있습니다.", c: "구조 변화가 올 수 있지만 기회가 됩니다." }, r: { g: "변화를 피하더라도 준비는 하세요.", m: "비상 자금을 확보하세요.", l: "위기에서 관계가 더 단단해질 수 있습니다.", c: "변화를 기회로 전환하세요." } },
    M17: { u: { g: "희망과 잠재력이 빛납니다. 어둠이 지나가고 있습니다.", m: "새로운 수입 경로가 열릴 수 있습니다.", l: "관계에서 희망을 품고 다가가세요.", c: "잠재력이 발휘되는 시기입니다." }, r: { g: "희망을 놓지 말고 작은 것부터 시작하세요.", m: "일시적 어려움은 지나갑니다.", l: "거리가 멀어져도 마음은 이어지세요.", c: "포기하지 말고 꾸준히 하세요." } },
    M18: { u: { g: "불확실한 그림자가 있지만 직관을 믿으세요.", m: "정보가 불명확하면 결정을 미루세요.", l: "속마음이 숨겨져 있을 수 있어 소통이 중요합니다.", c: "숨겨진 의도를 파악하는 것이 중요합니다." }, r: { g: "공포가 현실보다 클 수 있습니다. 사실을 확인하세요.", m: "불확실한 투자는 보류하세요.", l: "오해를 풀기 위해 먼저 대화하세요.", c: "의심을 풀고 협력하세요." } },
    M19: { u: { g: "활력과 성공이 빛납니다. 어둠이 지나가고 있습니다.", m: "수익과 성과가 좋은 시기입니다.", l: "관계가 따뜻하고 밝게 유지됩니다.", c: "성과가 인정받고 승진 가능성이 있습니다." }, r: { g: "일시적 어둠이 있어도 곧 밝아집니다.", m: "일시적 저조는 회복됩니다.", l: "작은 소통이 관계를 밝게 합니다.", c: "잠시 멈춰도 다시 빛날 것입니다." } },
    M20: { u: { g: "용서와 재기회가 옵니다. 과거를 정리하고 새로 시작하세요.", m: "과거의 실수가 정리되면 새 흐름이 열립니다.", l: "화해와 재회의 가능성이 있습니다.", c: "재평가와 재기회가 올 수 있습니다." }, r: { g: "자기 용서가 먼저입니다.", m: "미뤄둔 정리를 하세요.", l: "과거를 끊고 새로 시작할 용기가 필요합니다.", c: "자기 평가를 다시 하세요." } },
    M21: { u: { g: "완성과 성취의 시기입니다. 한 해의 결실을 맺습니다.", m: "장기 노력이 수익으로 연결됩니다.", l: "관계가 안정되고 깊어집니다.", c: "목표 달성과 인정을 받는 시기입니다." }, r: { g: "완성이 아직이라면 마무리 단계입니다.", m: "마지막 단계까지 꾸준히 하세요.", l: "관계가 성숙해가는 중입니다.", c: "마무리와 마무리가 중요합니다." } },
  };

  function buildClientSideReading() {
    var zodiacTraits = ["지혜, 시작, 풍요", "근면, 우직함, 안정", "용기, 변화, 리더십", "성장, 평화, 직관", "비상, 큰 성취, 열정", "지성, 매력, 비밀", "활동력, 자유, 추진력", "예술성, 온화함, 조화", "재치, 임기응변, 다재다능", "결단력, 통찰, 화려함", "충직함, 책임감, 보호", "여유, 행운, 마무리"];
    var zodiacNames = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];
    var defMoney = "꾸준한 관리와 현명한 선택이 재물 흐름을 안정시킵니다. 불필요한 지출을 줄이고 저축의 씨앗을 뿌리면 후반에 결실이 보입니다.";
    var defLove = "진심 어린 표현이 관계를 따뜻하게 만듭니다. 마음을 열고 대화할수록 인연이 깊어지는 달입니다.";
    var defRelation = "솔직한 소통과 경계 존중이 인간관계를 풍요롭게 합니다. 주변과의 조화를 위해 한 걸음 양보해 보세요.";
    var defExam = "집중력과 꾸준한 노력이 좋은 결과로 이어집니다. 짧은 시간이라도 매일 반복하는 습관이 합격운을 높입니다.";

    state.reading = {
      summary: "천상의 열두 수호신이 한 해의 문을 열었습니다. 1月부터 12月까지 각 월패를 눌러 해당 달의 전반 운세, 재물·연애·인간관계·합격운을 자세히 확인하세요. 월별 카드와 삼재 스프레드가 당신의 한 해를 안내합니다.",
      finalAdvice: "올해는 십이지신이 지키는 한 해입니다. 매월의 카드 메시지를 곁에 두고, 작은 결심 하나하나를 실천하면 운명의 수레바퀴가 유리하게 돌아갑니다. 급하지 않게, 그러나 꾸준히 나아가면 재물·인연·성취의 기운이 차분히 쌓일 것입니다.",
      monthlyReadings: state.cards.map(function (card, idx) {
        var id = card.cardId || card.id;
        var ori = card.orientation === "reversed" ? "r" : "u";
        var interp = CLIENT_INTERP[id];
        var g = interp && interp[ori] ? interp[ori].g : "";
        var m = interp && interp[ori] ? interp[ori].m : defMoney;
        var l = interp && interp[ori] ? interp[ori].l : defLove;
        var c = interp && interp[ori] ? interp[ori].c : defExam;
        var nameKr = card.nameKr || card.name || getCardNameKr(id);
        var traits = zodiacTraits[idx] || "";
        var zName = zodiacNames[idx] || "";
        var flowFallback = zName + "의 달입니다. " + traits + "의 기운이 당신을 감쌉니다. " + nameKr + (card.orientation === "reversed" ? "(역방향)" : "(정방향)") + "의 메시지가 이 달의 흐름을 이끕니다. 월초에 다짐한 일을 차분히 실천하면 후반에 열매가 보일 수 있습니다.";
        return {
          month: idx + 1,
          zodiac: { name: zName, traits: traits },
          flow: (g || flowFallback),
          money: m,
          love: l,
          relationship: defRelation,
          exam: c,
        };
      }),
    };
  }

  function renderTarotYearResult() {
    var r = state.reading;
    if (!r) return;
    if (!state.hasAccess) {
      window.alert("결제가 확인되지 않아 결과를 표시할 수 없습니다.");
      return;
    }

    var summaryEl = byId("tarotYearSummary");
    if (summaryEl) {
    var highlightsPrefix = "";
    if (Array.isArray(state.consultingHighlights) && state.consultingHighlights.length) {
      highlightsPrefix = "🔭 핵심 상담 하이라이트\n" + state.consultingHighlights.map(function (line) { return "• " + line; }).join("\n") + "\n\n";
    }
    summaryEl.style.display = "block";
    typewriterText(
      summaryEl,
      highlightsPrefix + (r.summary ||
        "천상의 열두 수호신이 한 해의 문을 열었습니다. 1月부터 12月까지 각 월패를 눌러 해당 달의 전반 운세, 재물·연애·인간관계·합격운을 천천히 따라가 보세요."),
      24
    );
    }

    var cardsEl = byId("tarotYearResultCards");
    if (cardsEl && state.cards.length) {
      cardsEl.innerHTML = "";
      cardsEl.className = "ty-result-cards ty-result-cards--twelve";
      bindMonthTileClicks();
      state.cards.forEach(function (card, idx) {
        var wrap = document.createElement("div");
        wrap.className = "ty-result-card-wrap ty-result-card-wrap--month";
        wrap.setAttribute("data-month", idx + 1);
        wrap.setAttribute("role", "button");
        wrap.setAttribute("tabindex", "0");
        wrap.onclick = (function (m) { return function () { selectMonthDetail(m); }; })(idx + 1);
        wrap.onkeydown = (function (m) {
          return function (ev) {
            if (!ev) return;
            if (ev.key === "Enter" || ev.key === " ") {
              ev.preventDefault();
              selectMonthDetail(m);
            }
          };
        })(idx + 1);
        if (card.orientation === "reversed") wrap.setAttribute("data-reversed", "1");

        var inner = document.createElement("div");
        inner.className = "ty-result-card-inner";
        var back = document.createElement("div");
        back.className = "ty-result-card-back";
        var front = document.createElement("div");
        front.className = "ty-result-card-front";
        var monthLabel = document.createElement("span");
        monthLabel.className = "ty-result-card-month";
        monthLabel.textContent = MONTH_LABELS_CJK[idx];
        front.appendChild(monthLabel);
        var zodiac = document.createElement("span");
        zodiac.className = "ty-result-card-zodiac";
        zodiac.textContent = ZODIAC_EMOJI[idx];
        front.appendChild(zodiac);
        var guide = document.createElement("span");
        guide.className = "ty-result-card-guide";
        guide.textContent = "월별 운세";
        front.appendChild(guide);
        inner.appendChild(back);
        inner.appendChild(front);
        wrap.appendChild(inner);
        cardsEl.appendChild(wrap);
      });

      cardsEl.classList.add("ty-result-cards--flip-ready");
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          var wraps = cardsEl.querySelectorAll(".ty-result-card-wrap--month");
          wraps.forEach(function (w) { w.classList.add("ty-result-card-wrap--flipped"); });
        });
      });
    }

    var adviceEl = byId("tarotYearFinalAdvice");
  if (adviceEl) {
    var adviceText = r.finalAdvice ||
      "한 달의 흐름을 확인한 뒤, 실천 가능한 한 가지 행동으로 운의 방향을 고정하세요.";
    if (state.engineMeta && state.engineMeta.qualityEnhanced) {
      adviceText += "\n\n✨ 엔진 품질 강화: 카드별 맥락 기반 고품질 상담";
    }
    typewriterText(
      adviceEl,
      adviceText,
      26
    );
  }

    var panel = byId("tarotYearMonthDetailPanel");
    var placeholder = byId("tarotYearMonthDetailPlaceholder");
    var content = byId("tarotYearMonthDetailContent");
    if (panel) panel.classList.add("is-visible");
    if (placeholder) placeholder.style.display = "block";
    if (content) content.style.display = "none";
  }

  function shareTarotYearFortuneResult() {
    if (!state.reading) return;
    var r = state.reading;
    var text = "🌟 십이지신 천운(天運) 타로\n\n";
    if (Array.isArray(state.consultingHighlights) && state.consultingHighlights.length) {
      text += "🔭 핵심 상담 하이라이트\n" + state.consultingHighlights.slice(0, 2).map(function (line) { return "• " + line; }).join("\n") + "\n\n";
    }
    if (r.summary) text += r.summary + "\n\n";
    if (r.finalAdvice) text += "💌 " + r.finalAdvice + "\n\n";
    text += "👉 무료 타로 보러가기: https://code-destiny.com";

    if (navigator.share) {
      navigator.share({
        title: "🌟 십이지신 천운 타로",
        text: text,
        url: "https://code-destiny.com",
      }).catch(function () {});
      return;
    }
    var encoded = encodeURIComponent(text);
    var a = document.createElement("a");
    a.href = "kakaotalk://send?text=" + encoded;
    a.click();
    setTimeout(function () {
      if (typeof copyToClipboard === "function") {
        copyToClipboard(text, "카카오톡 앱이 없거나 PC에서는 클립보드에 복사했어요! 💬");
      }
    }, 800);
  }

  window.openTarotYearFortuneModal = openTarotYearFortuneModal;
  window.closeTarotYearFortuneModal = closeTarotYearFortuneModal;
  window.resetTarotYearFortuneFlow = resetTarotYearFortuneFlow;
  window.startTarotYearFortuneReading = startTarotYearFortuneReading;
  window.shareTarotYearFortuneResult = shareTarotYearFortuneResult;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindTarotYearStaticActions);
  } else {
    bindTarotYearStaticActions();
  }
})();
