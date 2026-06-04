/**
 * 우리는 무슨 사이? — 6-Card Relationship Spread Experience
 * API: POST /api/tarot/draw (spreadType: relationship_six_card)
 *      POST /api/tarot/love-reading (cards)
 */
(function () {
  "use strict";

  var POSITION_LABELS = {
    position_1: "내가 바라보는 상대",
    position_2: "상대가 관계 전체를 보는 시각",
    position_3: "상대가 나를 바라보는 마음",
    position_4: "상대의 연애 의지와 열망",
    position_5: "관계를 가로막는 핵심 요인",
    position_6: "앞으로 펼쳐질 단기적 결말",
  };
  var DISPLAY_ORDER = [0, 1, 2, 3, 4, 5];
  var GUIDE_ORDER = [0, 1, 2, 3, 4, 5];

  var refs = {};
  var state = { cards: [], revealedCount: 0, reading: null, hasAccess: false, paymentInFlight: false };
  var LOVE_COIN_COST = 50;
  var LOVE_REASON = "우리는 무슨 사이? 타로 리딩";
  var LOVE_FEATURE_KEY = "tarot-love-relationship";
  var FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;
  var TAROT_API_TIMEOUT_MS = 12000;
  var RELATIONSHIP_POSITIONS = ["position_1", "position_2", "position_3", "position_4", "position_5", "position_6"];
  var LOCAL_RELATIONSHIP_DECK = [
    { cardId: "M00", name: "The Fool", nameKr: "바보" },
    { cardId: "M01", name: "The Magician", nameKr: "마법사" },
    { cardId: "M02", name: "The High Priestess", nameKr: "여사제" },
    { cardId: "M03", name: "The Empress", nameKr: "여황제" },
    { cardId: "M04", name: "The Emperor", nameKr: "황제" },
    { cardId: "M05", name: "The Hierophant", nameKr: "교황" },
    { cardId: "M06", name: "The Lovers", nameKr: "연인" },
    { cardId: "M07", name: "The Chariot", nameKr: "전차" },
    { cardId: "M08", name: "Strength", nameKr: "힘" },
    { cardId: "M09", name: "The Hermit", nameKr: "은둔자" },
    { cardId: "M10", name: "Wheel of Fortune", nameKr: "운명의 수레바퀴" },
    { cardId: "M11", name: "Justice", nameKr: "정의" },
    { cardId: "M14", name: "Temperance", nameKr: "절제" },
    { cardId: "M17", name: "The Star", nameKr: "별" },
    { cardId: "M18", name: "The Moon", nameKr: "달" },
    { cardId: "M19", name: "The Sun", nameKr: "태양" },
  ];

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
          setTimeout(function () {
            reject(new Error("Tarot API timeout"));
          }, TAROT_API_TIMEOUT_MS);
        }),
      ]);
    }

    var controller = new AbortController();
    var timeoutId = setTimeout(function () {
      controller.abort();
    }, TAROT_API_TIMEOUT_MS);

    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body,
      cache: "no-store",
      signal: controller.signal,
    })
      .catch(function (error) {
        if (error && error.name === "AbortError") {
          throw new Error("Tarot API timeout");
        }
        throw error;
      })
      .finally(function () {
        clearTimeout(timeoutId);
      });
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

  function isLoveAdminLikeUser() {
    if (typeof window === "undefined") return false;
    try {
      if (String(sessionStorage.getItem("flower_admin_password_ok") || "") !== "1") return false;
    } catch (e) {
      return false;
    }
    try {
      var sTok = String(sessionStorage.getItem("flower_admin_token") || "");
      if (FLOWER_ADMIN_TOKEN_RE.test(sTok)) return true;
    } catch (e2) {}
    try {
      var lTok = String(localStorage.getItem("flower_admin_token") || "");
      if (FLOWER_ADMIN_TOKEN_RE.test(lTok)) return true;
    } catch (e3) {}
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
    window.location.href = "/points";
  }

  function consumeCoinDirect(cost, reason, featureKey) {
    var requestId = "tarot-love:" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
    if (typeof window._cdChooseServicePaymentMode === "function" && typeof window._cdRunDirectKrwCheckout === "function") {
      return window._cdChooseServicePaymentMode({
        title: reason,
        coinPrice: cost,
        cost: cost,
      }).then(function(choice) {
        if (choice === "direct") {
          if (typeof window._cdSetCoinGateOverlay === "function") window._cdSetCoinGateOverlay(true, "단건 결제를 준비하는 중입니다...");
          return window._cdRunDirectKrwCheckout({
            coinPrice: cost,
            cost: cost,
            title: reason,
            reason: reason,
            featureKey: featureKey,
            requestId: requestId,
            checkoutPayload: { paymentMode: "DIRECT_KRW" },
          }).then(function() { return true; });
        }
        if (choice !== "monthly") return false;
        return consumeMonthlyCredit(cost, reason, featureKey, requestId);
      }).catch(function(error) {
        window.alert(String(error && error.message || "단건 결제를 완료하지 못했습니다. 결제 수단을 확인한 뒤 다시 시도해 주세요."));
        return false;
      }).finally(function() {
        if (typeof window._cdSetCoinGateOverlay === "function") window._cdSetCoinGateOverlay(false);
      });
    }

    return consumeMonthlyCredit(cost, reason, featureKey, requestId);
  }

  function consumeMonthlyCredit(cost, reason, featureKey, requestId) {
    var token = getAuthToken();
    var consumeHeaders = {
      "Content-Type": "application/json",
    };
    if (token) consumeHeaders.Authorization = "Bearer " + token;

    if (typeof window._cdSetCoinGateOverlay === 'function') window._cdSetCoinGateOverlay(true, '결제를 확인 중입니다...');
    return fetch("/api/billing/coin-gate", {
      method: "POST",
      headers: consumeHeaders,
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        cost: cost,
        reason: reason,
        featureKey: featureKey,
        paymentMode: "MONTHLY_CREDIT",
        forceDeduct: true,
        requestId: requestId,
      }),
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          if (res.status === 401) {
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
          if (typeof window._cdHasVerifiedServerAccess === "function" && !window._cdHasVerifiedServerAccess(data, featureKey)) {
            window.alert("서버 권한 검증에 실패했습니다. 결제 내역 확인 후 다시 시도해 주세요.");
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
    var rollbackHeaders = {
      "Content-Type": "application/json",
    };
    if (token) rollbackHeaders.Authorization = "Bearer " + token;
    return fetch("/api/fortune/pig-coin/earn", {
      method: "POST",
      headers: rollbackHeaders,
      credentials: "include",
      cache: "no-store",
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

  function requireLoveAccess() {
    if (isLoveAdminLikeUser()) {
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
          LOVE_COIN_COST,
          LOVE_REASON,
          function () { done(true); },
          function () { done(false); }
        );
        return;
      }

      consumeCoinDirect(LOVE_COIN_COST, LOVE_REASON, LOVE_FEATURE_KEY)
        .then(function (ok) { done(ok); })
        .catch(function () { done(false); });
    });
  }

  function createLocalRelationshipCards() {
    var deck = LOCAL_RELATIONSHIP_DECK.slice();
    var out = [];
    for (var i = 0; i < RELATIONSHIP_POSITIONS.length; i++) {
      if (!deck.length) break;
      var pickIndex = Math.floor(Math.random() * deck.length);
      var picked = deck.splice(pickIndex, 1)[0];
      out.push({
        cardId: picked.cardId,
        name: picked.name,
        nameKr: picked.nameKr,
        position: RELATIONSHIP_POSITIONS[i],
        orientation: Math.random() < 0.5 ? "upright" : "reversed",
      });
    }
    return out;
  }

  function normalizeRelationshipCard(raw, idx) {
    var card = raw && typeof raw === "object" ? raw : {};
    var position = RELATIONSHIP_POSITIONS[idx] || card.position || "position_1";
    var orientation = card.orientation === "reversed" ? "reversed" : "upright";
    var cardId = String(card.cardId || card.id || card.code || "").trim().toUpperCase();
    var name = card.name || card.title || card.enName || "";
    var nameKr = card.nameKr || card.name_kr || card.krName || card.titleKr || card.title_kr || "";

    if (!cardId) {
      var found = LOCAL_RELATIONSHIP_DECK.find(function (item) {
        if (!item) return false;
        var itemName = String(item.name || "").toLowerCase();
        var itemNameKr = String(item.nameKr || "").toLowerCase();
        var srcName = String(name || "").toLowerCase();
        var srcNameKr = String(nameKr || "").toLowerCase();
        return (srcName && itemName === srcName) || (srcNameKr && itemNameKr === srcNameKr);
      });
      if (found) {
        cardId = String(found.cardId || "").trim().toUpperCase();
        if (!name) name = found.name;
        if (!nameKr) nameKr = found.nameKr;
      }
    }

    if (!cardId) cardId = "M00";
    if (!name) name = "이름이 확인되지 않은 카드";
    if (!nameKr) nameKr = name;

    return {
      cardId: cardId,
      position: position,
      orientation: orientation,
      name: name,
      nameKr: nameKr,
      imageUrl: card.imageUrl || "",
      imageCandidates: Array.isArray(card.imageCandidates) ? card.imageCandidates : [],
      proxyImageUrl: card.proxyImageUrl || "",
      localImageUrl: card.localImageUrl || "",
    };
  }

  function normalizeRelationshipCards(cards) {
    var arr = Array.isArray(cards) ? cards : [];
    return arr.slice(0, 6).map(function (card, idx) {
      return normalizeRelationshipCard(card, idx);
    });
  }

  function createLocalRelationshipReading(cards) {
    var safeCards = normalizeRelationshipCards(cards);
    var positionFocusMap = {
      position_1: "내가 상대를 해석하는 프레임이 관계 만족도를 좌우합니다.",
      position_2: "상대의 표현 속도와 감정의 유무를 분리해서 읽어야 정확합니다.",
      position_3: "상대가 관계에 붙인 이름보다 반복 행동이 더 중요한 신호입니다.",
      position_4: "연애 의지는 강도보다 지속성으로 검증됩니다.",
      position_5: "병목은 감정 부족보다 방식 불일치일 가능성이 큽니다.",
      position_6: "결말은 고정값이 아니라 지금의 소통 방식에 따라 바뀝니다.",
    };
    var breakdown = safeCards.map(function (card, idx) {
      var label = POSITION_LABELS[card.position] || ("포지션 " + String(idx + 1));
      var cardName = (card.nameKr || card.name || "타로 카드") + (card.orientation === "reversed" ? " (역)" : "");
      var orientSummary = card.orientation === "reversed"
        ? "역방향 카드이므로 속도를 늦추고 사실 확인 중심으로 대화해야 오해를 줄일 수 있습니다."
        : "정방향 카드이므로 작은 약속을 꾸준히 지키면 관계 온도가 빠르게 안정됩니다.";
      var summary = (positionFocusMap[card.position] || "현재 포지션의 신호를 행동으로 옮기는 것이 핵심입니다.") + " " + orientSummary;
      return { title: label, card: cardName, summary: summary };
    });

    return {
      overallVibe: "지금 두 사람의 관계는 끌림과 조심스러움이 함께 존재하는 과도기입니다. 감정의 강도 자체보다 감정을 전달하는 방식이 관계의 만족도를 크게 바꾸는 시기예요. 이 흐름은 고정된 운명이 아니라, 대화의 태도와 경계 설정에 따라 충분히 더 따뜻한 방향으로 바뀔 수 있습니다.",
      deepReading: "핵심은 확신의 부족이 아니라 표현의 타이밍입니다. 상대의 반응을 시험하기보다, 내 감정을 간결하고 구체적으로 전달할 때 긴장이 풀리고 신뢰가 쌓입니다. 불안이 올라올수록 마음속 추측을 늘리기보다 '내가 확인한 사실'을 중심으로 대화를 이어가 보세요.",
      realityAndFuture: "단기적으로는 속도 조절이 필요하지만, 중요한 포인트를 솔직하게 확인하면 관계의 방향은 분명해집니다. 불필요한 추측을 줄이고 작은 약속을 지키는 반복이 생기면 관계는 생각보다 빠르게 안정됩니다. 지금의 선택이 3개월 뒤의 관계 결을 바꾼다는 점을 기억해 주세요.",
      positionBreakdown: breakdown,
      advice: [
        "상대의 말보다 말투와 반응 속도 같은 비언어 신호를 함께 보세요.",
        "오늘 안에 결론 내리기보다 1~2번의 대화 텀을 두고 확인하세요.",
        "질문은 추궁형보다 확인형으로 바꿔 보세요. 예: '왜 그래?' 대신 '내가 이렇게 이해했는데 맞아?'",
        "불안한 날일수록 연락 빈도를 늘리기보다, 짧고 진심 있는 한 번의 대화를 목표로 하세요.",
        "관계의 결과를 붙잡기 전에 내 컨디션(수면/식사/일상 루틴)을 먼저 안정시키세요. 마음이 안정될수록 선택이 정확해집니다.",
      ],
    };
  }

  var TAROT_LOCAL_BASES = ["/tarot-cards/", "/public/tarot-cards/", "tarot-cards/", "public/tarot-cards/"];
  var TAROT_LOCAL_BASE = TAROT_LOCAL_BASES[0];
  var TAROT_CDN_BASE = "https://cdn.jsdelivr.net/gh/krates98/tarotcardapi@main/images/";
  var TAROT_DEFAULT_FALLBACK_IMAGE = TAROT_LOCAL_BASE + "thefool.jpeg";
  function getLocalTarotImageUrl(card) {
    if (!card) return "";
    var cardId = String(card.cardId || card.id || "").trim().toUpperCase();
    var map = {
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
    var fn = cardId ? map[cardId] : "";
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
  function rankToWord(rank) {
    var map = {
      A: "ace",
      "1": "ace",
      "2": "two",
      "3": "three",
      "4": "four",
      "5": "five",
      "6": "six",
      "7": "seven",
      "8": "eight",
      "9": "nine",
      "10": "ten",
      P: "page",
      N: "knight",
      Q: "queen",
      K: "king",
      Ace: "ace",
      Two: "two",
      Three: "three",
      Four: "four",
      Five: "five",
      Six: "six",
      Seven: "seven",
      Eight: "eight",
      Nine: "nine",
      Ten: "ten",
      Page: "page",
      Knight: "knight",
      Queen: "queen",
      King: "king",
    };
    return map[String(rank || "").trim()] || "";
  }

  function getTarotImageUrl(card) {
    var local = getLocalTarotImageUrl(card);
    if (local) return local;
    var raw = String(card.name || "").trim();
    var key = raw.replace(/\s/g, "").toLowerCase();
    if (key) {
      if (key === "thelovers") return TAROT_CDN_BASE + "TheLovers.jpg";
      if (key === "strength") key = "thestrength";
      return TAROT_CDN_BASE + key + ".jpeg";
    }
    var suit = String(card.suit || "").trim().toLowerCase();
    var rankWord = rankToWord(card.rank);
    if (suit && rankWord) return TAROT_CDN_BASE + rankWord + "of" + suit + ".jpeg";
    return "";
  }

  function normalizeTarotShortName(cardName) {
    var raw = String(cardName || "").trim();
    if (!raw) return "";
    var words = raw
      .replace(/[^A-Za-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    if (!words.length) return "";
    return words
      .map(function (w) {
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      })
      .join("");
  }

  function getTarotImageCandidatesByName(cardName) {
    var short = normalizeTarotShortName(cardName);
    if (!short) return [];
    var compact = short.replace(/\s+/g, "");
    var variants = [compact.toLowerCase(), short, compact];
    if (compact.toLowerCase() === "thelovers") variants = ["TheLovers", "thelovers", short, compact];
    var extPriority = compact.toLowerCase() === "thelovers"
      ? [".jpg", ".jpeg", ".png", ".webp"]
      : [".jpeg", ".jpg", ".png", ".webp"];
    var cdnBase = "https://cdn.jsdelivr.net/gh/krates98/tarotcardapi@main/images/";
    var rawBase = "https://raw.githubusercontent.com/krates98/tarotcardapi/main/images/";
    var out = [];
    var seen = Object.create(null);
    [cdnBase, rawBase].forEach(function (base) {
      variants.forEach(function (name) {
        extPriority.forEach(function (ext) {
          var url = base + name + ext;
          if (!seen[url]) {
            seen[url] = true;
            out.push(url);
          }
        });
      });
    });
    return out;
  }

  function buildTarotImageCandidates(card) {
    var list = [];
    var seen = Object.create(null);
    function add(url) {
      var normalized = String(url || "").trim();
      if (!normalized || seen[normalized]) return;
      seen[normalized] = true;
      list.push(normalized);
    }
    function addVariants(url) {
      var raw = String(url || "").trim();
      if (!raw) return;
      add(raw);
      if (/^https?:\/\//i.test(raw)) return;
      if (raw.charAt(0) === "/") add(raw.slice(1));
      else add("/" + raw);
    }
    function absolutize(url) {
      var raw = String(url || "").trim();
      if (!raw) return "";
      if (/^https?:\/\//i.test(raw)) return raw;
      var base = getTarotApiBase();
      if (!base) return raw;
      return String(base).replace(/\/+$/, "") + (raw.charAt(0) === "/" ? raw : "/" + raw);
    }

    if (card) {
      getLocalTarotImageCandidates(card).forEach(function (url) { addVariants(url); });
      addVariants(card.localImageUrl);
      if (card.proxyImageUrl) {
        addVariants(absolutize(card.proxyImageUrl));
        addVariants(card.proxyImageUrl);
      }
      if (Array.isArray(card.imageCandidates)) {
        card.imageCandidates.forEach(function (url) { addVariants(url); });
      }
      addVariants(card.imageUrl);
    }

    addVariants(getTarotImageUrl(card));
    if (card && card.name) {
      getTarotImageCandidatesByName(card.name).forEach(function (url) { add(url); });
    }
    return list;
  }

  function applyTarotImageWithFallback(imgEl, frontEl, card) {
    if (!imgEl) return;
    var candidates = buildTarotImageCandidates(card).filter(Boolean);
    if (!candidates.length) return;
    var index = 0;
    imgEl.referrerPolicy = "no-referrer";
    imgEl.decoding = "async";
    function tryNext() {
      if (index >= candidates.length) {
        imgEl.onerror = null;
        if (imgEl.src !== TAROT_DEFAULT_FALLBACK_IMAGE) {
          imgEl.src = TAROT_DEFAULT_FALLBACK_IMAGE;
        }
        return;
      }
      var url = candidates[index++];
      if (frontEl) {
        frontEl.style.backgroundImage = "url('" + url + "')";
        frontEl.style.backgroundSize = "cover";
        frontEl.style.backgroundPosition = "center";
      }
      imgEl.onload = function () {
        if (frontEl) {
          frontEl.style.backgroundImage = "none";
        }
      };
      imgEl.onerror = tryNext;
      imgEl.src = url;
    }
    tryNext();
  }

  function ensureLoveFrontImage(cardEl, card) {
    if (!cardEl) return;
    var front = cardEl.querySelector(".tarot-love-card-front");
    var img = front ? front.querySelector(".tarot-face-img") : null;
    if (!img) return;
    if (!img.getAttribute("src") || !img.complete || !img.naturalWidth) {
      applyTarotImageWithFallback(img, front, card || null);
    }
  }

  function openTarotLoveModal() {
    var overlay = byId("tarotLoveOverlay");
    if (!overlay) return;
    overlay.style.display = "block";
    overlay.classList.add("is-open");
    if (window._perf && window._perf.lockBody) window._perf.lockBody();
    else document.body.style.overflow = "hidden";
    resetTarotLoveFlow();
    triggerSubtitleTypewriter();
  }

  function triggerSubtitleTypewriter() {
    var el = byId("tarotLoveSubtitle");
    if (!el) return;
    el.style.animation = "none";
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.style.animation = "subtitleFadeIn 1.2s ease 0.3s both"; }); });
  }

  function closeTarotLoveModal() {
    var overlay = byId("tarotLoveOverlay");
    if (!overlay) return;
    overlay.style.display = "none";
    overlay.classList.remove("is-open");
    state.hasAccess = false;
    state.paymentInFlight = false;
    if (window._perf && window._perf.unlockBody) window._perf.unlockBody();
    else document.body.style.overflow = "";
  }

  function resetTarotLoveFlow() {
    state.cards = [];
    state.revealedCount = 0;
    state.reading = null;
    state.hasAccess = false;
    state.paymentInFlight = false;

    var intro = byId("tarotLoveIntroStage");
    var draw = byId("tarotLoveDrawStage");
    var result = byId("tarotLoveResultStage");
    var strip = byId("tarotLoveResultCardsStrip");
    if (intro) intro.classList.add("is-active");
    if (draw) draw.classList.remove("is-active");
    if (result) result.classList.remove("is-active");
    if (strip) strip.innerHTML = "";
  }

  function startTarotLoveReading() {
    var intro = byId("tarotLoveIntroStage");
    var draw = byId("tarotLoveDrawStage");
    if (!intro || !draw) return;

    var panel = document.querySelector(".tarot-love-panel");
    if (panel) panel.classList.add("ritual-burst");

    callTarotApi("draw", { spreadType: "relationship_six_card" })
      .then(function (data) {
        var normalizedCards = normalizeRelationshipCards(data.cards);
        if (normalizedCards.length !== 6) throw new Error("Invalid draw");
        state.cards = normalizedCards;
        state.revealedCount = 0;

        intro.classList.remove("is-active");
        draw.classList.add("is-active");
        if (panel) {
          setTimeout(function () { panel.classList.remove("ritual-burst"); }, 800);
        }

        renderTarotLoveCards();
        updateTarotLoveSpreadGuide();
        var btn = byId("tarotLoveFinalBtn");
        if (btn) btn.disabled = true;
      })
      .catch(function (err) {
        console.error("Tarot Love draw error:", err);
        var p = document.querySelector(".tarot-love-panel");
        if (p) p.classList.remove("ritual-burst");
        var fallbackCards = createLocalRelationshipCards();
        if (fallbackCards.length === 6) {
          state.cards = normalizeRelationshipCards(fallbackCards);
          state.revealedCount = 0;
          intro.classList.remove("is-active");
          draw.classList.add("is-active");
          renderTarotLoveCards();
          updateTarotLoveSpreadGuide();
          var btn = byId("tarotLoveFinalBtn");
          if (btn) btn.disabled = true;
          return;
        }
        alert("카드를 뽑는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      });
  }

  function renderTarotLoveCards() {
    var grid = byId("tarotLoveCardGrid");
    if (!grid) return;

    grid.innerHTML = "";
    (DISPLAY_ORDER || [0, 1, 2, 3, 4, 5]).forEach(function (idx) {
      var card = state.cards[idx];
      if (!card) return;
      var slot = document.createElement("div");
      slot.className = "tarot-love-slot";
      slot.setAttribute("data-slot-index", idx);

      var label = document.createElement("span");
      label.className = "tarot-love-slot-label";
      label.textContent = POSITION_LABELS[card.position] || card.position;

      var cardEl = document.createElement("div");
      cardEl.className = "tarot-love-card oracle-card-m";
      cardEl.setAttribute("data-action", "flipTarotLoveCard");
      cardEl.setAttribute("data-action-args", idx);
      cardEl.setAttribute("data-revealed", "0");

      var back = document.createElement("div");
      back.className = "tarot-love-card-back oracle-back-m";

      var front = document.createElement("div");
      front.className = "tarot-love-card-front oracle-front-m";
      if (card.orientation === "reversed") front.setAttribute("data-reversed", "1");

      var img = document.createElement("img");
      img.className = "tarot-face-img";
      img.alt = (card.nameKr || card.name || "").trim() || "타로 카드";
      img.loading = "lazy";
      img.decoding = "async";
      try {
        img.fetchPriority = idx === state.revealedCount ? "high" : "low";
      } catch (e) {}
      img.referrerPolicy = "no-referrer";
      applyTarotImageWithFallback(img, front, card);
      front.appendChild(img);

      var nameSpan = document.createElement("span");
      nameSpan.className = "tarot-love-card-name";
      nameSpan.textContent = (card.nameKr || card.name || "").trim();
      if (card.orientation === "reversed") nameSpan.textContent += " (역)";
      front.appendChild(nameSpan);

      cardEl.appendChild(back);
      cardEl.appendChild(front);
      slot.appendChild(label);
      slot.appendChild(cardEl);
      grid.appendChild(slot);
    });
  }

  function updateTarotLoveSpreadGuide() {
    var guide = byId("tarotLoveSpreadGuide");
    if (!guide) return;
    var step = state.revealedCount;
    if (step >= 6) {
      guide.textContent = "모든 카드를 확인했습니다. 아래 버튼을 눌러 최종 해석을 보세요.";
      updateGuideNextEffect();
      return;
    }
    var order = GUIDE_ORDER || [0, 1, 2, 3, 4, 5];
    var cardIdx = order[step];
    var card = state.cards[cardIdx];
    var posLabel = card ? (POSITION_LABELS[card.position] || card.position) : "";
    guide.textContent = "✦ 별빛이 가리키는 카드: " + posLabel + "를 뒤집어 주세요";
    updateGuideNextEffect();
  }

  function updateGuideNextEffect() {
    var grid = byId("tarotLoveCardGrid");
    if (!grid) return;
    var step = state.revealedCount;
    var order = GUIDE_ORDER || [0, 1, 2, 3, 4, 5];
    var nextCardIdx = step < 6 ? order[step] : -1;
    grid.querySelectorAll(".tarot-love-slot").forEach(function (slot) {
      var slotIdx = slot.getAttribute("data-slot-index");
      if (nextCardIdx >= 0 && String(slotIdx) === String(nextCardIdx)) {
        slot.classList.add("guide-next");
      } else {
        slot.classList.remove("guide-next");
      }
    });
  }

  function flipTarotLoveCard(idx) {
    idx = parseInt(idx, 10);
    if (isNaN(idx) || idx < 0 || idx >= 6) return;
    var order = GUIDE_ORDER || [0, 1, 2, 3, 4, 5];
    var expectedIdx = order[state.revealedCount];
    if (idx !== expectedIdx) return;
    var grid = byId("tarotLoveCardGrid");
    var cardEl = grid ? grid.querySelector('.tarot-love-slot[data-slot-index="' + idx + '"] .tarot-love-card') : null;
    if (!cardEl || cardEl.getAttribute("data-revealed") === "1") return;

    cardEl.setAttribute("data-revealed", "1");
    cardEl.classList.add("flipped");
    ensureLoveFrontImage(cardEl, state.cards[idx]);

    state.revealedCount++;
    updateTarotLoveSpreadGuide();

    if (state.revealedCount >= 6) {
      var btn = byId("tarotLoveFinalBtn");
      if (btn) btn.disabled = false;
    }
  }

  function showTarotLoveFinalReading() {
    if (state.revealedCount < 6 || !state.cards.length) return;
    requireLoveAccess().then(function (ok) {
      if (!ok) return;
      _runTarotLoveFinalReading();
    });
  }

  function _runTarotLoveFinalReading() {
    if (!state.hasAccess) {
      window.alert("결제가 확인되지 않아 결과를 표시할 수 없습니다.");
      return;
    }

    var normalizedCards = normalizeRelationshipCards(state.cards);
    state.cards = normalizedCards;
    var drawnForApi = normalizedCards.map(function (c) {
      return {
        cardId: c.cardId,
        position: c.position,
        orientation: c.orientation,
      };
    });

    callTarotApi("love-reading", {
      cards: drawnForApi,
    })
      .then(function (data) {
        if (!data.reading) throw new Error("No reading data");
        state.reading = data.reading;

        var draw = byId("tarotLoveDrawStage");
        var result = byId("tarotLoveResultStage");
        if (draw) draw.classList.remove("is-active");
        if (result) result.classList.add("is-active");

        renderTarotLoveResult();
      })
      .catch(function (err) {
        console.error("Tarot Love reading error:", err);
        var draw = byId("tarotLoveDrawStage");
        var result = byId("tarotLoveResultStage");
        var container = byId("tarotLoveReadingContent");
        if (draw) draw.classList.remove("is-active");
        if (result) result.classList.remove("is-active");
        if (draw) draw.classList.add("is-active");
        if (container) container.innerHTML = "";

        rollbackCoinBestEffort(LOVE_COIN_COST, LOVE_REASON, LOVE_FEATURE_KEY).then(function (rolledBack) {
          state.hasAccess = false;
          if (rolledBack) {
            window.alert("해석 생성 오류가 발생해 결제 코인을 복구했습니다. 다시 시도해 주세요.");
          } else {
            window.alert("해석 생성 중 오류가 발생했습니다. 결과 페이지 진입이 차단되었습니다. 잠시 후 다시 시도해 주세요.");
          }
        });
      });
  }

  function removeRepeatedSentencesForUi(text) {
    var sentences = String(text || "")
      .split(/(?<=[.!?。！？]|입니다\.|세요\.|합니다\.)\s+/)
      .map(function (s) { return String(s || "").trim(); })
      .filter(Boolean);

    var seen = Object.create(null);
    var result = [];
    sentences.forEach(function (sentence) {
      var normalized = sentence
        .replace(/\s+/g, " ")
        .replace(/[“”"']/g, "")
        .trim();
      if (!normalized || seen[normalized]) return;
      seen[normalized] = true;
      result.push(sentence);
    });
    return result.join(" ");
  }

  var FORBIDDEN_RESULT_PATTERNS = [
    /카드\(정방향\)의\s*포지션\s*핵심\s*의미는/gi,
    /카드\(역방향\)의\s*포지션\s*핵심\s*의미는/gi,
    /입니다\.\s*이\s*포지션의\s*메시지는/gi,
    /포지션\s*핵심\s*의미/gi,
    /카드가\s*가리키는\s*장애물/gi,
    /한\s*번에\s*한\s*가지씩\s*해결하세요/gi,
  ];

  function cleanRelationshipResultText(input) {
    var out = String(input || "").trim();
    if (!out) return "";
    FORBIDDEN_RESULT_PATTERNS.forEach(function (pattern) {
      out = out.replace(pattern, "");
    });
    out = removeRepeatedSentencesForUi(out);
    out = out.replace(/\s{2,}/g, " ").trim();
    return out;
  }

  function normalizePositionReadingItem(item, idx) {
    var src = item && typeof item === "object" ? item : {};
    var fallbackTitle = RELATIONSHIP_POSITIONS[idx] || ("position_" + String(idx + 1));
    var positionTitle = String(src.positionTitle || src.title || POSITION_LABELS[fallbackTitle] || ("포지션 " + String(idx + 1))).trim();
    var cardName = String(src.cardName || src.card || "").trim();
    var orientationLabel = String(src.orientationLabel || "").trim();

    if (!orientationLabel && /역방향|\(역\)/.test(cardName)) orientationLabel = "역방향";
    if (!orientationLabel) orientationLabel = "정방향";
    cardName = cardName.replace(/\s*[·|]\s*(정방향|역방향)$/, "").replace(/\((정|역)\)$/, "").trim();
    if (!cardName) cardName = "이름이 확인되지 않은 카드";

    return {
      positionTitle: positionTitle,
      cardName: cardName,
      orientationLabel: orientationLabel,
      headline: cleanRelationshipResultText(src.headline || src.summary || ""),
      summary: cleanRelationshipResultText(src.summary || src.headline || ""),
      detail: cleanRelationshipResultText(src.detail || src.summary || ""),
      relationshipInsight: cleanRelationshipResultText(src.relationshipInsight || ""),
      advice: cleanRelationshipResultText(src.advice || ""),
      caution: cleanRelationshipResultText(src.caution || ""),
    };
  }

  function normalizeFinalAdvice(rawFinalAdvice, adviceList) {
    var src = rawFinalAdvice && typeof rawFinalAdvice === "object" ? rawFinalAdvice : {};
    return {
      instantMission: cleanRelationshipResultText(src.instantMission || adviceList[0] || "상대의 반응을 추측하기보다 최근 행동 3가지를 정리해 보세요."),
      conversationTip: cleanRelationshipResultText(src.conversationTip || adviceList[1] || "왜 그랬어? 대신 나는 이렇게 느꼈어. 네 생각을 듣고 싶어 라고 말해 보세요."),
      relationshipBoundary: cleanRelationshipResultText(src.relationshipBoundary || adviceList[2] || "답장이 늦다는 이유만으로 관계를 단정하지 말고 반복되는 약속 회피는 기록해 두세요."),
      nextSevenDays: cleanRelationshipResultText(src.nextSevenDays || adviceList[3] || "결론 압박보다 편안한 대화 1회를 만드는 것이 다음 7일 흐름을 바꿉니다."),
    };
  }

  function sanitizeRelationshipReading(rawReading) {
    var src = rawReading && typeof rawReading === "object" ? rawReading : {};
    var adviceList = Array.isArray(src.advice)
      ? src.advice.map(function (item) { return cleanRelationshipResultText(item); }).filter(Boolean)
      : [];
    var seenAdvice = Object.create(null);
    adviceList = adviceList.filter(function (line) {
      var key = String(line || "").toLowerCase();
      if (!key || seenAdvice[key]) return false;
      seenAdvice[key] = true;
      return true;
    });
    return {
      overallVibe: cleanRelationshipResultText(src.overallVibe || ""),
      deepReading: cleanRelationshipResultText(src.deepReading || ""),
      realityAndFuture: cleanRelationshipResultText(src.realityAndFuture || ""),
      positionBreakdown: Array.isArray(src.positionBreakdown)
        ? src.positionBreakdown.map(function (item, idx) { return normalizePositionReadingItem(item, idx); })
        : [],
      finalAdvice: normalizeFinalAdvice(src.finalAdvice, adviceList),
      advice: adviceList,
    };
  }

  function renderTarotLoveResult() {
    var container = byId("tarotLoveReadingContent");
    if (!container || !state.reading) return;
    if (!state.hasAccess) {
      container.innerHTML = '<div class="tarot-love-section"><p class="tarot-love-section-text">결제가 확인되지 않아 결과를 표시할 수 없습니다.</p></div>';
      return;
    }

    var r = sanitizeRelationshipReading(state.reading);
    var overallVibe = r.overallVibe != null ? String(r.overallVibe) : "";
    var deepReading = r.deepReading != null ? String(r.deepReading) : "";
    var realityAndFuture = r.realityAndFuture != null ? String(r.realityAndFuture) : "";
    var positionBreakdown = Array.isArray(r.positionBreakdown) ? r.positionBreakdown : [];
    var adviceList = Array.isArray(r.advice) ? r.advice : [];
    var finalAdvice = r.finalAdvice && typeof r.finalAdvice === "object" ? r.finalAdvice : {};
    var html = "";

    if (overallVibe) {
      html += '<section class="tarot-love-section tarot-love-section--vibe">';
      html += '<h4 class="tarot-love-section-title">🌙 타로 마스터의 시선</h4>';
      html += '<div class="tarot-love-section-text">' + formatReadingText(overallVibe) + "</div>";
      html += "</section>";
    }

    if (deepReading) {
      html += '<section class="tarot-love-section tarot-love-section--insight">';
      html += '<h4 class="tarot-love-section-title">🔍 마음의 해부학</h4>';
      html += '<div class="tarot-love-section-text">' + formatReadingText(deepReading) + "</div>";
      html += "</section>";
    }

    if (realityAndFuture) {
      html += '<section class="tarot-love-section tarot-love-section--future">';
      html += '<h4 class="tarot-love-section-title">🚧 현실과 다가올 내일</h4>';
      html += '<div class="tarot-love-section-text">' + formatReadingText(realityAndFuture) + "</div>";
      html += "</section>";
    }

    if (positionBreakdown.length) {
      html += '<section class="tarot-love-section tarot-love-section--position">';
      html += '<h4 class="tarot-love-section-title">🃏 포지션별 관계 해석</h4>';
      html += '<div class="tarot-love-position-grid">';
      positionBreakdown.forEach(function (item) {
        var title = item && item.positionTitle != null ? String(item.positionTitle) : "";
        var cardName = item && item.cardName != null ? String(item.cardName) : "";
        var orientationLabel = item && item.orientationLabel != null ? String(item.orientationLabel) : "정방향";
        var headline = item && item.headline != null ? String(item.headline) : "";
        var detail = item && item.detail != null ? String(item.detail) : "";
        var relationshipInsight = item && item.relationshipInsight != null ? String(item.relationshipInsight) : "";
        var advice = item && item.advice != null ? String(item.advice) : "";
        var caution = item && item.caution != null ? String(item.caution) : "";
        if (!title && !headline && !detail) return;
        html += '<article class="tarot-love-position-card">';
        html += '<div class="tarot-love-position-head">';
        html += '<p class="tarot-love-position-title">' + escapeHtml(title) + "</p>";
        html += '<span class="tarot-love-orientation-badge ' + (orientationLabel === "역방향" ? "is-reversed" : "is-upright") + '">' + escapeHtml(orientationLabel) + '</span>';
        html += '</div>';
        if (cardName) html += '<p class="tarot-love-position-cardname">' + escapeHtml(cardName) + "</p>";
        if (headline) html += '<div class="tarot-love-position-keyline"><strong>한 줄 핵심:</strong> ' + escapeHtml(headline) + '</div>';
        if (detail) html += '<div class="tarot-love-position-text"><p class="tarot-love-mini-title">상세 해석</p>' + formatReadingText(detail) + '</div>';
        if (relationshipInsight) html += '<div class="tarot-love-position-text"><p class="tarot-love-mini-title">상대/관계 심리</p>' + formatReadingText(relationshipInsight) + '</div>';
        if (advice) html += '<div class="tarot-love-position-text"><p class="tarot-love-mini-title">조언</p>' + formatReadingText(advice) + '</div>';
        if (caution) html += '<div class="tarot-love-position-text"><p class="tarot-love-mini-title">주의할 점</p>' + formatReadingText(caution) + '</div>';
        html += "</article>";
      });
      html += "</div>";
      html += "</section>";
    }

    html += '<section class="tarot-love-section tarot-love-focus-section">';
    html += '<h4 class="tarot-love-section-title">🧭 마지막 조언</h4>';
    html += '<div class="tarot-love-final-advice-grid">';
    html += '<article class="tarot-love-final-advice-item"><h5>⚡ 지금 당장 할 1가지</h5><p>' + escapeHtml(String(finalAdvice.instantMission || "")) + '</p></article>';
    html += '<article class="tarot-love-final-advice-item"><h5>💬 대화 팁</h5><p>' + escapeHtml(String(finalAdvice.conversationTip || "")) + '</p></article>';
    html += '<article class="tarot-love-final-advice-item"><h5>🛡️ 내가 지킬 선</h5><p>' + escapeHtml(String(finalAdvice.relationshipBoundary || "")) + '</p></article>';
    html += '<article class="tarot-love-final-advice-item"><h5>🌙 앞으로 7일</h5><p>' + escapeHtml(String(finalAdvice.nextSevenDays || "")) + '</p></article>';
    html += '</div>';
    html += '</section>';

    if (adviceList.length) {
      html += '<section class="tarot-love-section tarot-love-section--advice">';
      html += '<h4 class="tarot-love-section-title">✅ 실전 체크리스트</h4>';
      html += '<ul class="tarot-love-checklist">';
      adviceList.forEach(function (item) {
        var text = item != null ? String(item) : "";
        if (text) html += "<li>" + escapeHtml(text) + "</li>";
      });
      html += "</ul>";
      html += "</section>";
    }

    container.innerHTML = html;

    // 결과 하단의 6장 미니 카드 스트립도 함께 렌더링
    renderTarotLoveResultCardsStrip();
  }

  function renderTarotLoveResultCardsStrip() {
    var strip = byId("tarotLoveResultCardsStrip");
    if (!strip) return;

    strip.innerHTML = "";
    if (!Array.isArray(state.cards) || !state.cards.length) return;

    (DISPLAY_ORDER || [0, 1, 2, 3, 4, 5]).forEach(function (idx) {
      var card = state.cards[idx];
      if (!card) return;

      var wrap = document.createElement("div");
      wrap.className = "tarot-love-result-card-wrap";

      var miniCard = document.createElement("div");
      miniCard.className = "tarot-love-result-mini-card";
      if (card.orientation === "reversed") miniCard.setAttribute("data-reversed", "1");

      var miniFront = document.createElement("div");
      miniFront.className = "tarot-love-result-mini-front";

      var img = document.createElement("img");
      img.className = "tarot-love-result-mini-img";
      img.alt = (card.nameKr || card.name || "").trim() || "타로 카드";
      img.loading = "lazy";
      img.decoding = "async";
      img.referrerPolicy = "no-referrer";

      applyTarotImageWithFallback(img, miniFront, card);
      miniFront.appendChild(img);
      miniCard.appendChild(miniFront);

      var label = document.createElement("span");
      label.className = "tarot-love-result-mini-label";
      label.textContent = POSITION_LABELS[card.position] || card.position || "";

      var name = document.createElement("span");
      name.className = "tarot-love-result-mini-name";
      name.textContent = (card.nameKr || card.name || "").trim();

      wrap.appendChild(miniCard);
      wrap.appendChild(label);
      wrap.appendChild(name);
      strip.appendChild(wrap);
    });
  }

  function escapeHtml(s) {
    if (s == null || s === "") return "";
    var div = document.createElement("div");
    div.textContent = String(s);
    return div.innerHTML;
  }

  function formatReadingText(input) {
    var raw = String(input || "").replace(/\s+/g, " ").trim();
    if (!raw) return "";

    var blocks = raw
      .split(/\n{2,}/)
      .map(function (line) { return String(line || "").trim(); })
      .filter(Boolean);

    if (!blocks.length) blocks = [raw];

    var out = [];
    var paragraphIndex = 0;
    blocks.forEach(function (block) {
      var sentences = block
        .split(/(?<=[.!?])\s+/)
        .map(function (s) { return String(s || "").trim(); })
        .filter(Boolean);

      if (!sentences.length) sentences = [block];

      for (var i = 0; i < sentences.length; i += 2) {
        var paragraph = sentences.slice(i, i + 2).join(" ");
        if (paragraph) {
          var className = paragraphIndex === 0 ? "tarot-love-paragraph tarot-love-paragraph--lead" : "tarot-love-paragraph";
          out.push('<p class="' + className + '">' + escapeHtml(paragraph) + "</p>");
          paragraphIndex += 1;
        }
      }
    });

    return out.join("");
  }

  function shareTarotLoveResult() {
    var r = state.reading;
    if (!r) return;

    var text = "💕 [우리는 무슨 사이?] 💕\n\n";
    if (r.overallVibe) text += "🌙 " + r.overallVibe + "\n\n";
    if (r.deepReading) text += "🔍 " + r.deepReading.substring(0, 200) + "...\n\n";
    text += "👉 무료 타로 보러가기: https://code-destiny.com";

    if (navigator.share) {
      navigator.share({
        title: "💕 우리는 무슨 사이?",
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

  document.addEventListener("DOMContentLoaded", function () {
    refs.overlay = byId("tarotLoveOverlay");
    refs.introStage = byId("tarotLoveIntroStage");
    refs.drawStage = byId("tarotLoveDrawStage");
    refs.resultStage = byId("tarotLoveResultStage");
  });

  window.openTarotLoveModal = openTarotLoveModal;
  window.closeTarotLoveModal = closeTarotLoveModal;
  window.startTarotLoveReading = startTarotLoveReading;
  window.resetTarotLoveFlow = resetTarotLoveFlow;
  window.flipTarotLoveCard = flipTarotLoveCard;
  window.showTarotLoveFinalReading = showTarotLoveFinalReading;
  window.shareTarotLoveResult = shareTarotLoveResult;
})();
