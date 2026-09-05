/**
 * 별 헤는 밤바다의 재회운 타로 — 5-Card Lighthouse Spread
 * API: POST /api/tarot/draw (spreadType: reunion_lighthouse_five_card)
 *      POST /api/tarot/reading (category: reunion, spreadType: reunion_lighthouse_five_card, cards)
 */
(function () {
  "use strict";

  // 재회운 등대 타로 UI 문자열(파일 내 하드코딩 — love 파일의 POSITION_LABELS 패턴과 동일).
  // POSITION_META/GUIDE_LABELS와 5장 스프레드 순서에 정합.
  var REUNION_TEXT = {
    positionPastBond: "남아 있는 감정의 온기",
    positionTheirNow: "상대의 지금 마음",
    positionOutsideFactor: "연락이 멈춘 배경",
    positionTheirHeart: "말 너머 상대의 속마음",
    positionOutcome: "관계 회복의 조건",
    cardLabelPrefix: "카드",
    aiPromptAria: "재회운 타로 AI 프롬프트",
    lightboxCloseAria: "닫기",
    cardImageAlt: "재회운 타로 카드 이미지",
    shareTitle: "재회운 등대 타로",
  };
  function tarotReunionText(key) {
    return Object.prototype.hasOwnProperty.call(REUNION_TEXT, key) ? REUNION_TEXT[key] : "";
  }

  var POSITION_META = [
    { key: "past_bond", label: tarotReunionText("positionPastBond"), labelPos: "bottom" },
    { key: "their_now", label: tarotReunionText("positionTheirNow"), labelPos: "top" },
    { key: "outside_factor", label: tarotReunionText("positionOutsideFactor"), labelPos: "bottom" },
    { key: "their_heart", label: tarotReunionText("positionTheirHeart"), labelPos: "top" },
    { key: "reunion_outcome", label: tarotReunionText("positionOutcome"), labelPos: "bottom" },
  ];

  var GUIDE_LABELS = [
    "첫 번째 카드: 두 사람 사이에 아직 남아 있는 감정의 온도를 차분히 확인해요.",
    "두 번째 카드: 말보다 깊은 곳에 있는 상대의 마음 결을 조심스럽게 살펴봐요.",
    "세 번째 카드: 연락이 멈춘 배경을 감정과 현실로 나눠서 이해해봐요.",
    "네 번째 카드: 다시 닿아도 괜찮은 거리와 부드러운 타이밍을 살펴봐요.",
    "다섯 번째 카드: 관계 회복에 필요한 조건과 지켜야 할 기준을 정리해요.",
  ];

  var state = {
    cards: [],
    revealedCount: 0,
    reading: null,
    consultingHighlights: [],
    engineMeta: null,
    hasAccess: false,
    paymentInFlight: false,
    soundEnabled: false,
    meditationActive: false,
    meditationPhaseTimer: null,
    meditationCycleCount: 0,
    lightbox: null,
  };
  var REUNION_COIN_COST = 50;
  var REUNION_REASON = "재회운 타로 리딩";
  var REUNION_FEATURE_KEY = "tarot-reunion-reading";
  var TAROT_API_TIMEOUT_MS = 12000;
  var REUNION_LOADING_MESSAGES = [
    "🕯️ 등대에 불을 밝히는 중…",
    "🌙 두 사람의 인연을 가만히 살펴보는 중…",
    "🌊 마음의 결을 천천히 읽어 내려가는 중…",
    "✨ 관계 회복의 실마리를 하나씩 엮는 중…",
  ];
  var REUNION_LOADING_ROTATE_MS = 2400;
  var reunionLoadingRotationId = null;
  var MEDITATION_INTRO_TEXTS = [
    "🌊 밤바다로 떠나볼까요? 괜찮아요, 지금 이 순간은 당신 마음부터 챙겨도 돼요.",
    "🌙 별이 반짝이는 밤바다예요. 천천히 숨 쉬며 마음의 떨림을 가라앉혀봐요.",
    "🕯️ 등대의 불빛을 따라와요. 불안보다 당신을 먼저 안아주는 시간이에요.",
  ];
  var MEDITATION_PHASE_TEXTS = {
    in: [
      "눈을 감고 밤바다의 파도 소리를 들어봐요. 천천히 들이쉬며 마음에 여유를 주세요.",
      "저 멀리 등대의 빛이 보여요. 그 빛을 향해, 괜찮다는 마음으로 숨을 들이쉬어요.",
      "별이 반짝이는 밤바다의 고요함을 들이마셔요. 당신은 지금 충분히 잘하고 있어요.",
    ],
    hold: [
      "별빛이 머무는 잠깐의 순간, 그리움을 탓하지 말고 가만히 품어줘요.",
      "파도가 잠잠해진 틈에 마음을 쉬게 해요. 답이 늦어도 당신의 가치가 줄어들진 않아요.",
      "등대의 불이 한 번 깜빡일 때까지, 내 감정을 안전하게 붙들고 있어봐요.",
    ],
    out: [
      "등대의 빛을 따라 천천히 내쉬어요. 걱정은 잠시 내려놓고, 당신을 먼저 위로해줘요.",
      "붙잡고 있던 생각을 파도에 살짝 보내요. 오늘의 당신은 충분히 사랑받을 자격이 있어요.",
      "별빛이 스며드는 밤바다에 마음을 맡기고 내쉬어요. 천천히, 더 편안해져도 괜찮아요.",
    ],
  };
  var MEDITATION_PHASES = [
    { key: "in", duration: 3500, circleClass: "breath-in" },
    { key: "hold", duration: 3000, circleClass: "breath-hold" },
    { key: "out", duration: 3500, circleClass: "breath-out" },
  ];
  var MEDITATION_MAX_CYCLES = 3;
  var MEDITATION_TYPING_MS = 55;
  var stateMeditationTypingId = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function reunionReadingSkeletonHtml() {
    return (
      '<div class="tarot-reading-skeleton tarot-reading-skeleton--reunion tarot-reunion-loading" role="status" aria-live="polite">' +
      '<div class="tarot-reunion-loading__beacon" aria-hidden="true">' +
      '<span class="tarot-reunion-loading__ray"></span>' +
      '<span class="tarot-reunion-loading__halo"></span>' +
      '<span class="tarot-reunion-loading__flame"></span>' +
      "</div>" +
      '<p class="tarot-reunion-loading__status" data-reunion-loading-status>' +
      REUNION_LOADING_MESSAGES[0] +
      "</p>" +
      '<div class="tarot-reunion-loading__lines">' +
      '<span class="tarot-skel-line tarot-skel-line--title"></span>' +
      '<span class="tarot-skel-line"></span><span class="tarot-skel-line"></span>' +
      '<span class="tarot-skel-line tarot-skel-line--short"></span>' +
      '<span class="tarot-skel-line"></span><span class="tarot-skel-line"></span>' +
      '<span class="tarot-skel-line"></span><span class="tarot-skel-line tarot-skel-line--short"></span>' +
      "</div>" +
      "</div>"
    );
  }

  function startReunionLoadingRotation() {
    stopReunionLoadingRotation();
    var idx = 0;
    reunionLoadingRotationId = setInterval(function () {
      var el = document.querySelector("[data-reunion-loading-status]");
      if (!el) {
        stopReunionLoadingRotation();
        return;
      }
      idx = (idx + 1) % REUNION_LOADING_MESSAGES.length;
      el.textContent = REUNION_LOADING_MESSAGES[idx];
    }, REUNION_LOADING_ROTATE_MS);
  }

  function stopReunionLoadingRotation() {
    if (reunionLoadingRotationId) {
      clearInterval(reunionLoadingRotationId);
      reunionLoadingRotationId = null;
    }
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
      // 앱(Capacitor WebView)은 출처가 https://localhost 라 아래 동일출처 비교가 항상 실패한다.
      // 빌드 주입 전역(CODE_DESTINY_API_BASE_URL)과 일치하는 base 는 안전으로 본다.
      var injectedBase = normalizeApiBase(window.CODE_DESTINY_API_BASE_URL || "");
      if (injectedBase && normalizeApiBase(parsed.origin || "") === injectedBase) return true;
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
    // "" (relative) already targets location.origin — do not add the origin again,
    // otherwise every failure is retried twice against the same URL.
    add("");
    var sameOrigin = typeof window !== "undefined" ? String(location.origin || "").replace(/\/+$/, "") : "";

    function addIfNotSameOrigin(raw) {
      var normalized = normalizeApiBase(raw);
      if (!normalized || normalized === sameOrigin) return;
      add(normalized);
    }

    var runtimeBase = getRuntimeEnvApiBase();
    if (isSafeTarotApiBase(runtimeBase)) addIfNotSameOrigin(runtimeBase);
    var computedBase = getTarotApiBase();
    if (isSafeTarotApiBase(computedBase)) addIfNotSameOrigin(computedBase);

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

  function buildTarotApiHeaders() {
    var headers = { "Content-Type": "application/json" };
    var token = getAuthToken();
    if (token) headers.Authorization = "Bearer " + token;
    return headers;
  }

  function postJsonWithTimeout(url, body) {
    var supportsAbort = typeof AbortController === "function";
    if (!supportsAbort) {
      return Promise.race([
        fetch(url, {
          method: "POST",
          headers: buildTarotApiHeaders(),
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
      headers: buildTarotApiHeaders(),
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
      // fetch()의 AbortController 타임아웃은 응답 "헤더" 단계까지만 보호하고,
      // res.json() 본문 파싱은 보호 밖이라 본문이 지연/차단되면 무한 대기한다.
      // 요청+파싱 전체에 별도 데드라인을 걸어 반드시 settle(성공/reject)되게 해
      // 결과 화면이 스켈레톤에 영구 정지되는 것을 막는다.
      var overallTimer = null;
      var overallDeadline = new Promise(function (_, reject) {
        overallTimer = setTimeout(function () {
          reject(createTarotApiError("Tarot API timeout", {
            endpoint: endpoint,
            base: base || "",
            url: url,
            phase: "overall",
          }));
        }, TAROT_API_TIMEOUT_MS + 3000);
      });
      var request = postJsonWithTimeout(url, body)
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
        });
      return Promise.race([request, overallDeadline])
        .then(function (data) {
          if (overallTimer) { clearTimeout(overallTimer); overallTimer = null; }
          return data;
        })
        .catch(function (error) {
          if (overallTimer) { clearTimeout(overallTimer); overallTimer = null; }
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
        // 401/403 is a definitive auth verdict — every candidate resolves to the
        // same origin, so retrying other bases only adds latency.
        if (error && (error.status === 401 || error.status === 403)) {
          throw error;
        }
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

  function isReunionAdminLikeUser() {
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
        window.alert("🪙 " + reason + "\n\n" + (Math.max(0, Number(cost || 0)) * 100).toLocaleString("ko-KR") + "원 단건 결제가 필요합니다.\n결제 상점을 엽니다.");
        window.__cdOpenChargeModal();
        return;
      }
    } catch (e) {}
    window.location.href = "/points";
  }

  function consumeCoinDirect(cost, reason, featureKey, resume) {
    if (isReunionAdminLikeUser()) return Promise.resolve(true);
    var requestId = "tarot-reunion:" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
    if (typeof window._cdOpenPaidServiceGate === "function") {
      return Promise.resolve(window._cdOpenPaidServiceGate({
        title: reason,
        reason: reason,
        coinPrice: cost,
        cost: cost,
        amountKrw: Math.max(0, Number(cost || 0)) * 100,
        amountKRW: Math.max(0, Number(cost || 0)) * 100,
        featureKey: featureKey,
        requestId: requestId,
        resume: resume || undefined,
      })).then(function(result) {
        rememberReunionCharge(result && result.transactionId, result && (result.payload || result));
        return !!(result && (result.status === "granted" || result.ok === true || result.payload));
      }).catch(function(error) {
        window.alert(String(error && error.message || "단건 결제를 완료하지 못했습니다. 결제 수단을 확인한 뒤 다시 시도해 주세요."));
        return false;
      }).finally(function() {
        if (typeof window._cdSetCoinGateOverlay === "function") window._cdSetCoinGateOverlay(false);
      });
    }

    window.alert("결제 게이트를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.");
    return Promise.resolve(false);
  }

  function consumeMonthlyCredit(cost, reason, featureKey, requestId) {
    return consumeCoinDirect(cost, reason, featureKey || requestId);
  }

  // 결제 게이트 승인 콜백/응답에서 실제 차감 거래 id(PointHistory ObjectId)를 추출한다.
  // 환불 시 sourceTransactionId로 넘기면 서버가 featureKey 추정 없이 _id로 정확히 매칭한다.
  function extractReunionChargeTransactionId(transactionId, payload) {
    var data = payload && typeof payload === "object" ? payload : {};
    var billing = data.data && typeof data.data === "object" ? data.data : data;
    var consume = billing && billing.consume && typeof billing.consume === "object" ? billing.consume : {};
    var candidates = [
      transactionId,
      billing.transactionId,
      billing.pointHistoryId,
      billing._id,
      consume.transactionId,
      consume.pointHistoryId,
      consume._id,
    ];
    for (var i = 0; i < candidates.length; i += 1) {
      var id = String(candidates[i] || "").trim();
      if (/^[a-f0-9]{24}$/i.test(id)) return id;
    }
    return "";
  }

  function rememberReunionCharge(transactionId, payload) {
    state.lastChargeTransactionId = extractReunionChargeTransactionId(transactionId, payload);
  }

  function rollbackCoinBestEffort(cost, reason, featureKey) {
    var token = getAuthToken();
    var rollbackHeaders = {
      "Content-Type": "application/json",
    };
    if (token) rollbackHeaders.Authorization = "Bearer " + token;
    var sourceTransactionId = String(state.lastChargeTransactionId || "").trim();
    var requestId = "tarot-reunion-refund:" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
    // 정본 환불 라우트(/api/billing/refund → /api/fortune/pig-coin/refund 위임). 과거의
    // 과거 포인트 적립 경로는 사용하지 않고 정본 환불 경로만 호출한다.
    return fetch("/api/billing/refund", {
      method: "POST",
      headers: rollbackHeaders,
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        cost: cost,
        featureKey: featureKey,
        sourceTransactionId: sourceTransactionId || undefined,
        requestId: requestId,
        reason: ("자동 복구: " + reason).slice(0, 120),
      }),
    }).then(function (res) {
      return !!res && res.ok;
    }).catch(function () {
      return false;
    });
  }

  // resume: 결제 전 화면 상태를 담은 재개 서술자(모바일 리다이렉트 복귀용). 없으면 종전과 같다.
  function requireReunionAccess(resume) {
    if (isReunionAdminLikeUser()) {
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
          REUNION_COIN_COST,
          REUNION_REASON,
          function (transactionId, payload) { rememberReunionCharge(transactionId, payload); done(true); },
          function () { done(false); },
          resume ? { resume: resume } : undefined
        );
        return;
      }

      consumeCoinDirect(REUNION_COIN_COST, REUNION_REASON, REUNION_FEATURE_KEY, resume)
        .then(function (ok) { done(ok); })
        .catch(function () { done(false); });
    });
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

  var TAROT_LOCAL_BASES = ["/tarot-cards/", "tarot-cards/"];
  var TAROT_LOCAL_BASE = TAROT_LOCAL_BASES[0];
  var TAROT_DEFAULT_FALLBACK_IMAGE = TAROT_LOCAL_BASE + "thefool.jpeg";
  var REUNION_FAST_TAP_DEBOUNCE_MS = 260;
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

  function appendLocalTarotBaseCandidates(candidates, fileName, pushCandidateVariants) {
    if (!fileName) return;
    TAROT_LOCAL_BASES.forEach(function (base) {
      pushCandidateVariants(candidates, String(base || "") + fileName);
    });
  }

  function getTarotImageCandidates(cardName) {
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

  function applyTarotImageWithFallback(imgEl, frontEl, card) {
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
    var localUrl = getLocalTarotImageUrl(card);
    if (localUrl) {
      pushCandidateVariants(candidates, localUrl);
      appendLocalTarotBaseCandidates(candidates, String(localUrl).split("/").pop(), pushCandidateVariants);
    }
    if (card && card.proxyImageUrl) {
      pushCandidateVariants(candidates, absolutizeUrl(card.proxyImageUrl));
      pushCandidateVariants(candidates, card.proxyImageUrl);
    }
    if (Array.isArray(card && card.imageCandidates) && card.imageCandidates.length) {
      card.imageCandidates.forEach(function (u) { pushCandidateVariants(candidates, u); });
    } else if (card && card.imageUrl) {
      pushCandidateVariants(candidates, card.imageUrl);
    }
    if (!candidates.length) {
      candidates = getTarotImageCandidates(card && card.name);
    }
    candidates = candidates.filter(Boolean).filter(function (u, i, arr) { return arr.indexOf(u) === i; });
    if (!candidates.length) return;
    var idx = 0;
    imgEl.referrerPolicy = "no-referrer";
    imgEl.decoding = "async";
    function tryNext() {
      if (idx >= candidates.length) {
        if (imgEl && imgEl.src !== TAROT_DEFAULT_FALLBACK_IMAGE) {
          imgEl.onerror = null;
          imgEl.src = TAROT_DEFAULT_FALLBACK_IMAGE;
        }
        return;
      }
      var url = candidates[idx++];
      if (frontEl) {
        frontEl.style.backgroundImage = "";
      }
      imgEl.onerror = tryNext;
      imgEl.src = url;
    }
    tryNext();
  }

  function ensureReunionFrontImage(cardEl, card) {
    if (!cardEl) return;
    var front = cardEl.querySelector(".tarot-reunion-card-front");
    var img = front ? front.querySelector(".tarot-reunion-face-img") : null;
    if (!img) return;
    if (!img.getAttribute("src") || !img.complete || !img.naturalWidth) {
      applyTarotImageWithFallback(img, front, card || null);
    }
  }

  function ensureMeditationPrepared() {
    bindTarotReunionStaticActions();
  }

  function clearMeditationTyping() {
    if (stateMeditationTypingId) {
      clearInterval(stateMeditationTypingId);
      stateMeditationTypingId = null;
    }
  }

  function typewriterMeditationText(el, fullText, speedMs, onComplete) {
    if (!el) return;
    clearMeditationTyping();
    el.textContent = "";
    el.classList.remove("tarot-reunion-typing-done");
    var idx = 0;
    var len = fullText.length;
    stateMeditationTypingId = setInterval(function () {
      if (idx >= len) {
        clearMeditationTyping();
        el.classList.add("tarot-reunion-typing-done");
        if (typeof onComplete === "function") onComplete();
        return;
      }
      el.textContent += fullText.charAt(idx);
      idx += 1;
    }, speedMs);
  }

  function stopMeditation() {
    clearMeditationTyping();
    if (state.meditationPhaseTimer) {
      clearTimeout(state.meditationPhaseTimer);
      state.meditationPhaseTimer = null;
    }
    state.meditationActive = false;
    state.meditationCycleCount = 0;
    var guide = byId("tarotReunionMeditationGuide");
    var btn = byId("tarotReunionMeditationBtn");
    if (guide) {
      guide.hidden = true;
      guide.classList.remove("is-visible");
    }
    if (btn) btn.textContent = "🧘 밤바다 명상 시작";
  }

  function runMeditationPhase(phaseIndex, cycleIndex) {
    var guide = byId("tarotReunionMeditationGuide");
    var breathText = byId("tarotReunionBreathText");
    var breathCount = byId("tarotReunionBreathCount");
    var circle = guide ? guide.querySelector(".tarot-reunion-breath-circle") : null;
    if (!guide || !breathText) return;

    clearMeditationTyping();
    var phase = MEDITATION_PHASES[phaseIndex];
    guide.classList.remove("breath-in", "breath-hold", "breath-out");
    guide.classList.add(phase.circleClass);
    if (circle) {
      circle.className = "tarot-reunion-breath-circle " + phase.circleClass;
    }
    breathText.textContent = "";
    breathText.classList.remove("tarot-reunion-typing-done");
    if (breathCount) {
      breathCount.textContent = cycleIndex < MEDITATION_MAX_CYCLES ? "제 " + (cycleIndex + 1) + "번째 호흡" : "마지막 호흡";
    }
    guide.hidden = false;
    guide.classList.add("is-visible");

    var phaseTexts = MEDITATION_PHASE_TEXTS[phase.key];
    var text = phaseTexts && phaseTexts[cycleIndex % phaseTexts.length] ? phaseTexts[cycleIndex % phaseTexts.length] : "";
    typewriterMeditationText(breathText, text, MEDITATION_TYPING_MS);

    var nextPhaseIndex = (phaseIndex + 1) % MEDITATION_PHASES.length;
    var nextCycle = nextPhaseIndex === 0 ? cycleIndex + 1 : cycleIndex;
    if (nextCycle >= MEDITATION_MAX_CYCLES && nextPhaseIndex === 0) {
      state.meditationPhaseTimer = setTimeout(function () {
        stopMeditation();
      }, phase.duration);
      return;
    }
    state.meditationPhaseTimer = setTimeout(function () {
      if (!state.meditationActive) return;
      runMeditationPhase(nextPhaseIndex, nextCycle);
    }, phase.duration);
  }

  function startMeditation() {
    state.meditationActive = true;
    var btn = byId("tarotReunionMeditationBtn");
    var guide = byId("tarotReunionMeditationGuide");
    var breathText = byId("tarotReunionBreathText");
    var breathCount = byId("tarotReunionBreathCount");
    var circle = guide ? guide.querySelector(".tarot-reunion-breath-circle") : null;
    if (btn) btn.textContent = "✧ 명상 종료";
    if (guide && breathText) {
      guide.hidden = false;
      guide.classList.add("is-visible");
      guide.classList.remove("breath-in", "breath-hold", "breath-out");
      if (circle) circle.className = "tarot-reunion-breath-circle";
      if (breathCount) breathCount.textContent = "";
      var introIdx = Math.floor(Math.random() * MEDITATION_INTRO_TEXTS.length);
      typewriterMeditationText(breathText, MEDITATION_INTRO_TEXTS[introIdx], 40, function () {
        setTimeout(function () {
          if (state.meditationActive) runMeditationPhase(0, 0);
        }, 800);
      });
    } else {
      runMeditationPhase(0, 0);
    }
  }

  function toggleTarotReunionMeditation() {
    if (state.meditationActive) {
      stopMeditation();
      return;
    }
    startMeditation();
  }

  function openTarotReunionModal() {
    var overlay = byId("tarotReunionOverlay");
    if (!overlay) return;
    overlay.style.display = "block";
    overlay.classList.add("is-open");
    if (window._perf && window._perf.lockBody) window._perf.lockBody();
    else document.body.style.overflow = "hidden";
    ensureMeditationPrepared();
    bindTarotReunionStaticActions();
    resetTarotReunionFlow();
  }

  function bindTarotReunionStaticActions() {
    var invokeBtn = document.querySelector(".tarot-reunion-btn--invoke");
    if (invokeBtn && !invokeBtn.__reunionInvokeBound) {
      invokeBtn.__reunionInvokeBound = true;
      bindReunionFastTap(invokeBtn, function () {
        startTarotReunionReading();
      });
    }
    var meditationBtn = byId("tarotReunionMeditationBtn");
    if (meditationBtn && !meditationBtn.__reunionMeditationBound) {
      meditationBtn.__reunionMeditationBound = true;
      meditationBtn.addEventListener("click", function (e) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        toggleTarotReunionMeditation();
      });
    }

    var closeBtn = document.querySelector("#tarotReunionOverlay .tarot-reunion-close");
    if (closeBtn && !closeBtn.__reunionCloseBound) {
      closeBtn.__reunionCloseBound = true;
      bindReunionFastTap(closeBtn, function () {
        closeTarotReunionModal();
      });
    }
  }

  function bindReunionFastTap(el, handler) {
    if (!el || typeof handler !== "function") return;
    var lastAt = 0;
    function fire(e) {
      var now = Date.now();
      if (now - lastAt < REUNION_FAST_TAP_DEBOUNCE_MS) return;
      lastAt = now;
      if (e && e.cancelable) e.preventDefault();
      if (e) e.stopPropagation();
      handler(e);
    }
    el.addEventListener("click", fire, { passive: false });
    el.addEventListener("touchend", fire, { passive: false });
    el.addEventListener("pointerup", function (e) {
      if (e.pointerType && e.pointerType !== "touch") return;
      fire(e);
    }, { passive: false });
  }

  function closeTarotReunionModal() {
    var overlay = byId("tarotReunionOverlay");
    if (state.meditationActive) stopMeditation();
    if (!overlay) return;
    overlay.style.display = "none";
    overlay.classList.remove("is-open");
    state.hasAccess = false;
    state.paymentInFlight = false;
    if (window._perf && window._perf.unlockBody) window._perf.unlockBody();
    else document.body.style.overflow = "";
  }

  function resetTarotReunionFlow() {
    state.cards = [];
    state.revealedCount = 0;
    state.reading = null;
    state.consultingHighlights = [];
    state.engineMeta = null;
    state.hasAccess = false;
    state.paymentInFlight = false;
    state.soundEnabled = false;
    if (state.meditationActive) stopMeditation();
    var btn = byId("tarotReunionMeditationBtn");
    if (btn) btn.textContent = "🧘 밤바다 명상 시작";
    var intro = byId("tarotReunionIntroStage");
    var draw = byId("tarotReunionDrawStage");
    var result = byId("tarotReunionResultStage");
    var finalBtn = byId("tarotReunionFinalBtn");
    if (intro) intro.classList.add("is-active");
    if (draw) draw.classList.remove("is-active");
    if (result) result.classList.remove("is-active");
    if (finalBtn) finalBtn.disabled = true;
    updateTarotReunionGuide();
    var rc = byId("tarotReunionReadingContent");
    if (rc) {
      rc.innerHTML = "";
      rc.removeAttribute("aria-busy");
    }
    var cardsB = byId("tarotReunionResultCards");
    if (cardsB) {
      cardsB.innerHTML = "";
      cardsB.classList.remove("tarot-reunion-result-cards--visible");
    }
  }

  function startTarotReunionReading() {
    var intro = byId("tarotReunionIntroStage");
    var draw = byId("tarotReunionDrawStage");
    if (!intro || !draw) return;
    var panel = document.querySelector(".tarot-reunion-panel");
    if (panel) panel.classList.add("ritual-burst");
    var invokeBtn = document.querySelector(".tarot-reunion-btn--invoke");
    var invokeBtnLabel = invokeBtn ? invokeBtn.textContent : "";
    if (invokeBtn) {
      if (invokeBtn.disabled) return;
      invokeBtn.disabled = true;
      invokeBtn.textContent = "🕯️ 등대의 불을 밝히는 중...";
    }
    function restoreInvokeBtn() {
      if (!invokeBtn) return;
      invokeBtn.disabled = false;
      invokeBtn.textContent = invokeBtnLabel;
    }

    callTarotApi("draw", { spreadType: "reunion_lighthouse_five_card" })
      .then(function (data) {
        if (!data.cards || data.cards.length !== 5) throw new Error("Invalid draw");
        state.cards = data.cards;
        state.revealedCount = 0;
        restoreInvokeBtn();
        intro.classList.remove("is-active");
        draw.classList.add("is-active");
        renderTarotReunionCards();
        updateTarotReunionGuide();
        if (panel) setTimeout(function () { panel.classList.remove("ritual-burst"); }, 900);
      })
      .catch(function (err) {
        console.error("Tarot Reunion draw error:", err);
        restoreInvokeBtn();
        if (panel) panel.classList.remove("ritual-burst");
        if (err && (err.status === 401 || err.status === 403)) {
          alert("로그인이 필요한 기능입니다. 로그인 후 다시 시도해 주세요.");
        } else {
          alert("카드를 뽑는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
        }
      });
  }

  function getPositionMeta(position, idx) {
    var found = POSITION_META.find(function (item) {
      return item.key === position;
    });
    return found || POSITION_META[idx] || {
      key: position || ("card_" + (idx + 1)),
      label: tarotReunionText("cardLabelPrefix") + " " + (idx + 1),
      labelPos: idx % 2 ? "top" : "bottom",
    };
  }

  function renderTarotReunionCards() {
    var grid = byId("tarotReunionCardGrid");
    if (!grid) return;
    grid.innerHTML = "";

    state.cards.forEach(function (card, idx) {
      var meta = getPositionMeta(card.position, idx);
      var slot = document.createElement("div");
      slot.className = "tarot-reunion-slot " + (meta.labelPos === "top" ? "label-top" : "label-bottom");
      slot.setAttribute("data-slot-index", idx);

      var label = document.createElement("span");
      label.className = "tarot-reunion-slot-label";
      label.textContent = meta.label;

      var cardEl = document.createElement("div");
      cardEl.className = "tarot-reunion-card";
      cardEl.setAttribute("data-action", "flipTarotReunionCard");
      cardEl.setAttribute("data-action-args", idx);
      cardEl.setAttribute("data-revealed", "0");
      cardEl.setAttribute("role", "button");
      cardEl.setAttribute("tabindex", "0");
      bindReunionFastTap(cardEl, function () {
        flipTarotReunionCard(idx);
      });
      cardEl.addEventListener("keydown", function (e) {
        if (!e) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          flipTarotReunionCard(idx);
        }
      });
      cardEl.addEventListener("mouseenter", function () {
        slot.classList.add("is-lit");
      });
      cardEl.addEventListener("mouseleave", function () {
        slot.classList.remove("is-lit");
      });

      var back = document.createElement("div");
      back.className = "tarot-reunion-card-back";

      var front = document.createElement("div");
      front.className = "tarot-reunion-card-front";
      front.style.display = "none";
      if (card.orientation === "reversed") front.setAttribute("data-reversed", "1");

      var img = document.createElement("img");
      img.className = "tarot-reunion-face-img";
      img.alt = card.nameKr || card.name || "타로 카드";
      img.loading = "lazy";
      img.decoding = "async";
      try {
        img.fetchPriority = idx === state.revealedCount ? "high" : "low";
      } catch (e) {}
      applyTarotImageWithFallback(img, front, card);
      front.appendChild(img);

      var nameSpan = document.createElement("span");
      nameSpan.className = "tarot-reunion-card-name";
      nameSpan.textContent = card.nameKr || card.name || "";
      if (card.orientation === "reversed") nameSpan.textContent += " (역)";
      front.appendChild(nameSpan);

      cardEl.appendChild(back);
      cardEl.appendChild(front);

      if (meta.labelPos === "top") {
        slot.appendChild(label);
        slot.appendChild(cardEl);
      } else {
        slot.appendChild(cardEl);
        slot.appendChild(label);
      }

      grid.appendChild(slot);
    });
  }

  function updateTarotReunionGuide() {
    var guide = byId("tarotReunionSpreadGuide");
    var idx = state.revealedCount;
    if (guide) {
      if (idx >= 5) guide.textContent = "모든 카드를 열었습니다. 등대의 메시지를 확인해 보세요.";
      else guide.textContent = GUIDE_LABELS[idx] || "카드를 뒤집어 주세요.";
    }
    var grid = byId("tarotReunionCardGrid");
    if (!grid) return;
    grid.querySelectorAll(".tarot-reunion-slot").forEach(function (slot) {
      var slotIdx = parseInt(slot.getAttribute("data-slot-index"), 10);
      if (slotIdx === idx) slot.classList.add("guide-next");
      else slot.classList.remove("guide-next");
    });
  }

  function emitRipple(cardEl) {
    if (!cardEl) return;
    var wave = document.createElement("span");
    wave.className = "reunion-ripple-wave";
    cardEl.appendChild(wave);
    setTimeout(function () {
      if (wave && wave.parentNode) wave.parentNode.removeChild(wave);
    }, 900);
  }

  function emitLighthouseBeam(slot) {
    if (!slot) return;
    slot.classList.add("is-lit");
    var beam = document.createElement("span");
    beam.className = "lighthouse-beam";
    slot.appendChild(beam);
    setTimeout(function () {
      slot.classList.remove("is-lit");
      if (beam && beam.parentNode) beam.parentNode.removeChild(beam);
    }, 1100);
  }

  function flipTarotReunionCard(idx) {
    idx = parseInt(idx, 10);
    if (isNaN(idx) || idx < 0 || idx >= 5) return;
    if (idx !== state.revealedCount) return;
    var grid = byId("tarotReunionCardGrid");
    var slot = grid ? grid.querySelector('.tarot-reunion-slot[data-slot-index="' + idx + '"]') : null;
    var cardEl = slot ? slot.querySelector(".tarot-reunion-card") : null;
    if (!cardEl || cardEl.getAttribute("data-revealed") === "1") return;

    emitRipple(cardEl);
    emitLighthouseBeam(slot);

    cardEl.setAttribute("data-revealed", "1");
    cardEl.classList.add("flipped");
    var back = cardEl.querySelector(".tarot-reunion-card-back");
    var front = cardEl.querySelector(".tarot-reunion-card-front");
    ensureReunionFrontImage(cardEl, state.cards[idx]);
    if (back) back.style.display = "none";
    if (front) front.style.display = "flex";
    setTimeout(function () {
      if (!cardEl || cardEl.getAttribute("data-revealed") !== "1") return;
      cardEl.classList.add("flipped-static");
      cardEl.classList.remove("flipped");
      if (front) front.style.opacity = "1";
    }, 1120);

    state.revealedCount += 1;
    updateTarotReunionGuide();
    if (state.revealedCount >= 5) {
      var btn = byId("tarotReunionFinalBtn");
      if (btn) btn.disabled = false;
    }
  }

  /* ── 결제 후 자동 재개(모바일 리다이렉트 복귀) ──────────────────────────────────
     🔴 모바일 PortOne 은 상위 프레임을 리다이렉트하므로 requireReunionAccess 의 await 가 페이지와
     함께 죽고, 복귀 후에는 _runTarotReunionFinalReading 이 영영 실행되지 않는다. 뽑은 5장은
     state.cards 안에만 있어 새 문서에서 재현할 수 없으므로 결제 직전에 서술자로 굳혀 둔다.
     🔴 args 에는 원시값만 살아남으므로(checkout-entry 의 sanitizePaidResumeDescriptor) 카드 배열은
     JSON 문자열 한 칸에 담는다. 정본 예시: js/saju-engine-tarot-sukuyo-quantum.js 의
     syBuildCompatResumeDescriptor ~ syRunCompatResume. */
  var REUNION_RESUME_KIND = "tarot-reunion-final";
  var REUNION_RESUME_WAIT_MS = 8000;
  var REUNION_RESUME_POLL_MS = 200;

  function reunionCheckoutEntry() {
    try { return window.__cdCheckoutEntry || null; } catch (e) { return null; }
  }

  function buildReunionResumeDescriptor() {
    if (typeof document === "undefined") return null;
    if (!state.cards || state.cards.length !== 5) return null;
    var packed = "";
    // 직렬화가 실패하면 서술자 없이 보낸다 — 복귀 처리가 '지금 열기' 카드로 떨어뜨린다.
    try { packed = JSON.stringify(state.cards); } catch (e) { return null; }
    if (!packed) return null;
    return {
      kind: REUNION_RESUME_KIND,
      // 셸의 기존 딥링크(index-inline-runtime 의 __cdLazyActionLoaders). 새 라우팅을 만들지 않는다.
      action: "openTarotReunionModal",
      args: { cards: packed },
    };
  }

  // 오버레이는 runPaidResume 의 딥링크가 연다(이 스크립트는 지연 로드라 그때 함께 불려온다).
  function waitForReunionOverlay(limitMs) {
    return new Promise(function (resolve) {
      var deadline = Date.now() + limitMs;
      (function poll() {
        var overlay = byId("tarotReunionOverlay");
        if (overlay && overlay.classList.contains("is-open")) { resolve(true); return; }
        if (Date.now() >= deadline) { resolve(false); return; }
        setTimeout(poll, REUNION_RESUME_POLL_MS);
      })();
    });
  }

  /* 🔴 여기서 모달을 다시 열지 않는다 — 표면을 여는 책임은 checkout-entry 의 runPaidResume 하나다.
     여기서 또 열면 이중 이동이 되어 재개가 통째로 날아간다. */
  function runReunionResume(descriptor) {
    var args = (descriptor && descriptor.args && typeof descriptor.args === "object") ? descriptor.args : {};
    var restored = null;
    try { restored = JSON.parse(String(args.cards || "")); } catch (e) { restored = null; }
    if (!restored || !restored.length) return false;
    return waitForReunionOverlay(REUNION_RESUME_WAIT_MS).then(function (ready) {
      // 모달이 끝내 안 열리면 false — 복귀 처리(destiny-profile)가 '지금 열기' 카드를 그린다.
      if (!ready) return false;
      // openTarotReunionModal 이 resetTarotReunionFlow 로 intro 를 켜 둔 상태다. 결과 스테이지와
      // 함께 켜지지 않도록 여기서 내린다(정상 흐름에서는 startTarotReunionReading 이 하는 일).
      var intro = byId("tarotReunionIntroStage");
      if (intro) intro.classList.remove("is-active");
      state.cards = restored;
      state.revealedCount = restored.length;
      // 🔴 결제는 이미 끝났다 — 게이트를 다시 타는 showTarotReunionFinalReading 이 아니라 코어를
      //    직접 부른다(재결제 방지).
      state.hasAccess = true;
      _runTarotReunionFinalReading();
      return true;
    });
  }

  (function registerReunionResumeHandler() {
    var entry = reunionCheckoutEntry();
    if (!entry || typeof entry.registerPaidResumeHandler !== "function") return;
    try { entry.registerPaidResumeHandler(REUNION_RESUME_KIND, runReunionResume); } catch (e) {}
  })();

  function showTarotReunionFinalReading() {
    if (state.revealedCount < 5 || !state.cards.length) return;
    // 결제 전에 뽑은 카드를 서술자로 굳혀 둔다 — 복귀 페이지는 이 값 없이는 재현할 수 없다.
    requireReunionAccess(buildReunionResumeDescriptor()).then(function (ok) {
      if (!ok) return;
      _runTarotReunionFinalReading();
    });
  }

  function _runTarotReunionFinalReading() {
    if (!state.hasAccess) {
      window.alert("결제가 확인되지 않아 결과를 표시할 수 없습니다.");
      return;
    }

    var drawnForApi = state.cards.map(function (c) {
      return { cardId: c.cardId, position: c.position, orientation: c.orientation };
    });

    var draw = byId("tarotReunionDrawStage");
    var result = byId("tarotReunionResultStage");
    var rc = byId("tarotReunionReadingContent");
    var cardsContainer = byId("tarotReunionResultCards");
    if (draw) draw.classList.remove("is-active");
    if (result) result.classList.add("is-active");
    if (rc) {
      rc.innerHTML = reunionReadingSkeletonHtml();
      rc.setAttribute("aria-busy", "true");
      startReunionLoadingRotation();
    }
    if (cardsContainer) {
      cardsContainer.innerHTML = "";
      cardsContainer.classList.remove("tarot-reunion-result-cards--visible");
    }

    // 결과가 렌더도 실패도 하지 않은 채 스켈레톤에 영구 정지되는 것을 막는 안전망.
    // 전송 데드라인(requestWithBase)이 이미 요청을 반드시 settle시키지만,
    // 어떤 경로로도 사용자가 로딩 화면에 갇히지 않도록 하드 워치독을 둔다.
    var settled = false;
    var watchdogId = setTimeout(function () {
      failTarotReunionReading(new Error("Tarot Reunion reading watchdog timeout"));
    }, TAROT_API_TIMEOUT_MS + 8000);

    function markSettled() {
      if (settled) return false;
      settled = true;
      stopReunionLoadingRotation();
      if (watchdogId) { clearTimeout(watchdogId); watchdogId = null; }
      return true;
    }

    function failTarotReunionReading(err) {
      if (!markSettled()) return;
      console.error("Tarot Reunion reading error:", err);
      if (draw) draw.classList.add("is-active");
      if (result) result.classList.remove("is-active");
      if (rc) {
        rc.innerHTML = "";
        rc.removeAttribute("aria-busy");
      }
      rollbackCoinBestEffort(REUNION_COIN_COST, REUNION_REASON, REUNION_FEATURE_KEY).then(function (rolledBack) {
        state.hasAccess = false;
        if (rolledBack) {
          alert("해석 생성이 지연되거나 오류가 발생해 결제 금액을 복구했습니다. 다시 시도해 주세요.");
        } else {
          alert("해석 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
        }
      });
    }

    callTarotApi("reading", {
      category: "reunion",
      spreadType: "reunion_lighthouse_five_card",
      cards: drawnForApi,
    })
      .then(function (data) {
        if (settled) return;
        if (!data || !data.reading) {
          failTarotReunionReading(new Error("No reading data"));
          return;
        }
        // renderTarotReunionResult가 예외를 던지면 아래 .catch가 복구 경로를 태우도록
        // markSettled()는 렌더가 성공적으로 끝난 뒤에 호출한다.
        state.reading = data.reading;
        state.consultingHighlights = Array.isArray(data.consultingHighlights) ? data.consultingHighlights : [];
        state.engineMeta = data.engineMeta && typeof data.engineMeta === "object" ? data.engineMeta : null;
        if (rc) rc.removeAttribute("aria-busy");
        renderTarotReunionResult();
        markSettled();
      })
      .catch(function (err) {
        failTarotReunionReading(err);
      });
  }

  function removeRepeatedSentences(text) {
    var sentences = String(text || "")
      .split(/(?<=[.!?。！？]|입니다\.|해요\.|세요\.|합니다\.)\s+/)
      .map(function (s) { return String(s || "").trim(); })
      .filter(Boolean);

    var seen = Object.create(null);
    var out = [];
    sentences.forEach(function (sentence) {
      var normalized = sentence
        .replace(/\s+/g, " ")
        .replace(/[“”"']/g, "")
        .replace(/읽는\s*정확함/g, "해석 정확도")
        .trim();
      if (!normalized || seen[normalized]) return;
      seen[normalized] = true;
      out.push(sentence);
    });
    return out.join(" ");
  }

  var REUNION_FORBIDDEN_PATTERNS = [
    /카드\(정방향\)/gi,
    /카드\(역방향\)/gi,
    /카드가\s*담은/gi,
    /카드가\s*보여주는/gi,
    /읽는\s*정확함/gi,
    /실전\s*읽는\s*정확함/gi,
    /포지션\s*핵심\s*의미/gi,
    /이번\s*리딩의\s*핵심은\s*재회\s*가능성\s*자체보다[^.。!?]*[.。!?]?/gi,
    /관계\s*상담\s*관점에서[^.。!?]*[.。!?]?/gi,
    /다섯\s*장의\s*카드가\s*재회의\s*실마리를[^.。!?]*[.。!?]?/gi,
    /상대방도\s*마음이\s*있을\s*수\s*있습니다\.?/gi,
    /천천히\s*기다려보세요\.?/gi,
    /상황을\s*지켜보는\s*것이\s*좋습니다\.?/gi,
    /좋은\s*흐름입니다\.?/gi,
  ];

  function cleanReunionText(input) {
    var out = String(input || "").trim();
    if (!out) return "";
    REUNION_FORBIDDEN_PATTERNS.forEach(function (pattern) {
      out = out.replace(pattern, "");
    });
    out = out
      .replace(/읽는\s*정확함/g, "해석 정확도")
      .replace(/재회\s*가능성/g, "관계 회복 신호")
      .replace(/상대방의\s*현재\s*속마음/g, "상대가 보이는 마음의 결")
      .replace(/상대방도\s*마음이\s*있을\s*수\s*있습니다\.?/g, "남은 감정의 결은 행동의 반복으로 확인하는 편이 안전합니다.")
      .replace(/먼저\s*연락\s*비추천/g, "먼저 움직이기보다 마음 정리 우선");
    out = out.replace(/낮추기이/g, "낮추기가").replace(/정리이/g, "정리가");
    out = removeRepeatedSentences(out);
    out = out.replace(/\s{2,}/g, " ").trim();
    return out;
  }

  function cardDisplayName(card) {
    return String((card && (card.nameKo || card.nameKr || card.nameEn || card.name)) || "").trim() || "이름이 확인되지 않은 카드";
  }

  function orientationLabel(value) {
    return value === "reversed" ? "역방향" : "정방향";
  }

  function normalizePositionReadingItem(item, idx, cards) {
    var src = item && typeof item === "object" ? item : {};
    var card = cards[idx] || {};
    var title = String(src.positionTitle || REUNION_POSITION_TITLES[idx] || (idx + 1) + ") 포지션").trim();
    var cardName = String(src.cardName || cardDisplayName(card)).trim() || "이름이 확인되지 않은 카드";
    var orient = String(src.orientationLabel || orientationLabel(card.orientation)).trim() || "정방향";
    var keywords = Array.isArray(src.keywords) ? src.keywords.map(cleanReunionText).filter(Boolean) : [];
    return {
      order: Number(src.order || idx + 1),
      title: cleanReunionText(src.title || title),
      question: cleanReunionText(src.question || ""),
      cardNameKo: cleanReunionText(src.cardNameKo || cardName),
      cardNameEn: cleanReunionText(src.cardNameEn || ""),
      orientation: String(src.orientation || (String(card.orientation || "") === "reversed" ? "reversed" : "upright")),
      keywords: keywords,
      cardMeaning: cleanReunionText(src.cardMeaning || ""),
      reunionInterpretation: cleanReunionText(src.reunionInterpretation || ""),
      caution: cleanReunionText(src.caution || ""),
      positionTitle: title,
      cardName: cardName,
      orientationLabel: orient,
      headline: cleanReunionText(src.headline || ""),
      directAnswer: cleanReunionText(src.directAnswer || src.summary || ""),
      detailedReading: cleanReunionText(src.detailedReading || src.detail || ""),
      reunionPoint: cleanReunionText(src.reunionPoint || src.relationshipInsight || ""),
      advice: cleanReunionText(src.advice || ""),
    };
  }

  var REUNION_POSITION_TITLES = [
    "지금 두 사람 사이의 감정 온도",
    "상대가 보이는 마음의 결",
    "연락이 멈춘 현실 신호",
    "다시 닿을 수 있는 거리",
    "관계 회복의 조건과 기준",
  ];

  function normalizeReunionResultData(reading, cards) {
    var src = reading && typeof reading === "object" ? reading : {};
    var safeCards = Array.isArray(cards) ? cards : [];

    var summarySrc = src.summary && typeof src.summary === "object" ? src.summary : {};
    var score = Number(summarySrc.reunionChanceScore);
    if (!Number.isFinite(score)) score = 50;
    score = Math.max(0, Math.min(100, Math.round(score)));
    var label = String(summarySrc.reunionChanceLabel || "").trim() || (score >= 75 ? "회복 신호 강함" : score >= 58 ? "조심스러운 회복 신호" : score >= 40 ? "관망 신호" : "거리 조절 신호");

    var summary = {
      reunionChanceLabel: label,
      reunionChanceScore: score,
      partnerState: cleanReunionText(summarySrc.partnerState || "관계를 조심스럽게 떠올리지만 확답보다 거리를 재는 흐름"),
      bestContactTiming: cleanReunionText(summarySrc.bestContactTiming || "서로의 감정이 잔잔해졌을 때 짧은 안부로 시작하기 좋은 흐름"),
      mainObstacle: cleanReunionText(summarySrc.mainObstacle || "오해와 타이밍 엇갈림"),
      oneLineAdvice: cleanReunionText(summarySrc.oneLineAdvice || "길게 설득하기보다, 부담 없는 짧은 안부로 따뜻하게 문을 열어보세요."),
      comprehensive: {
        reunionChanceVerdict: cleanReunionText(summarySrc?.comprehensive?.reunionChanceVerdict || label),
        partnerEmotionTemperature: cleanReunionText(summarySrc?.comprehensive?.partnerEmotionTemperature || summarySrc.partnerState || "조심스럽지만 감정은 남아 있는 상태"),
        contactPossibility: cleanReunionText(summarySrc?.comprehensive?.contactPossibility || "짧고 가벼운 접촉부터 확인할 수 있는 흐름"),
        shouldYouMoveFirst: cleanReunionText(summarySrc?.comprehensive?.shouldYouMoveFirst || "부담 없는 방식이라면 먼저 가볍게 다가가는 것도 가능"),
        biggestVariable: cleanReunionText(summarySrc?.comprehensive?.biggestVariable || summarySrc.mainObstacle || "같은 갈등 패턴의 반복 여부"),
        avoidNow: cleanReunionText(summarySrc?.comprehensive?.avoidNow || "답을 재촉하는 질문, 감정을 몰아붙이는 긴 메시지"),
        finalOneLineAdvice: cleanReunionText(summarySrc?.comprehensive?.finalOneLineAdvice || summarySrc.oneLineAdvice || "서두르지 말고, 짧고 따뜻한 접촉으로 신뢰를 다시 쌓아가세요."),
      },
    };

    var rawPositions = Array.isArray(src.positions) ? src.positions : [];
    if (!rawPositions.length) {
      rawPositions = [
        { positionTitle: REUNION_POSITION_TITLES[0], detailedReading: src.pastBond || "" },
        { positionTitle: REUNION_POSITION_TITLES[1], detailedReading: src.theirNow || "" },
        { positionTitle: REUNION_POSITION_TITLES[2], detailedReading: src.outsideFactor || "" },
        { positionTitle: REUNION_POSITION_TITLES[3], detailedReading: src.theirHeart || "" },
        { positionTitle: REUNION_POSITION_TITLES[4], detailedReading: src.reunionOutcome || "" },
      ];
    }
    var positions = rawPositions.slice(0, 5).map(function (item, idx) {
      return normalizePositionReadingItem(item, idx, safeCards);
    });

    var finalSrc = src.finalGuide && typeof src.finalGuide === "object" ? src.finalGuide : {};
    var finalGuide = {
      shouldContactNow: cleanReunionText(finalSrc.shouldContactNow || "지금은 감정을 길게 쏟기보다, 편안한 안부 한 줄로 거리만 확인하는 편이 좋습니다."),
      messageExample: cleanReunionText(finalSrc.messageExample || "문득 생각나서 안부만 남겨. 편할 때 짧게 답해줘도 괜찮아."),
      avoidThis: cleanReunionText(finalSrc.avoidThis || "왜 답이 없냐는 압박, 관계 결론을 서두르는 질문은 잠시 미뤄두세요."),
      nextSevenDays: cleanReunionText(finalSrc.nextSevenDays || "앞으로 7일은 감정을 정리하고, 내 생활 리듬을 안정시키며 짧은 대화 준비를 해보세요."),
    };

    var actionPlan = Array.isArray(src.actionPlan) ? src.actionPlan.map(cleanReunionText).filter(Boolean) : [];
    if (!actionPlan.length) {
      actionPlan = [summary.oneLineAdvice, finalGuide.shouldContactNow, finalGuide.nextSevenDays].filter(Boolean);
    }

    return {
      summary: summary,
      positions: positions,
      finalGuide: finalGuide,
      actionPlan: actionPlan,
      opening: cleanReunionText(src.opening || ""),
    };
  }

  function getEncouragingMessage(r) {
    var text = [r.reunionOutcome || "", r.lighthouseGuidance || "", r.opening || ""].join(" ");
    var positive = /재회|다시 만나|가능성|희망|긍정|좋은|따뜻한|다가올|인연|기회|성장|이해|용서|화해|다가오/i;
    var neutral = /시간|기다림|인내|자신|자아|성찰|마음|감정|현재|지금/i;
    var challenging = /끝|이별|새로운|다른|먼|떠나|보내|정리|마무리|헤어|해어지/i;

    if (positive.test(text)) {
      return [
        "✨ 밤바다의 별빛이 지금 당신의 길을 비추고 있어요. 천천히 가도 괜찮아요.",
        "🌊 파도는 결국 해안으로 돌아오듯, 좋은 인연도 다시 닿을 기회를 만들어요.",
        "⭐ 별이 많은 밤은 어둡지 않아요. 당신의 마음에도 이미 충분한 빛이 있어요.",
        "🕯️ 조급함보다 따뜻함이 더 멀리 닿아요. 당신의 진심은 분명 전달될 거예요.",
        "🌙 사랑은 속도가 아니라 방향이에요. 당신은 지금 좋은 방향으로 가고 있어요.",
      ];
    }
    if (challenging.test(text)) {
      return [
        "🌌 끝처럼 느껴지는 순간도, 마음을 다시 세우는 새로운 시작이 될 수 있어요.",
        "🕯️ 등대의 불은 늘 같은 자리에서 당신을 기다려요. 당신은 결코 혼자가 아니에요.",
        "✨ 잃어버린 것만 보이는 밤에도, 당신 안의 단단함은 조금씩 자라고 있어요.",
        "🌊 오늘은 버티는 것만으로도 충분히 잘한 하루예요. 스스로를 꼭 다정하게 대해주세요.",
        "⭐ 재회가 아니어도 당신의 사랑은 실패가 아니에요. 진심은 당신을 더 빛나게 해요.",
      ];
    }
    return [
      "🌊 밤바다처럼 깊은 당신의 마음 안에는 이미 답을 향한 감각이 살아 있어요.",
      "⭐ 별을 헤아리듯 천천히 걸어가요. 서두르지 않아도 인연의 시간은 다시 맞춰져요.",
      "🕯️ 등대의 불은 멀리서도 보여요. 당신의 마음도 그만큼 분명하게 빛날 수 있어요.",
      "🌙 오늘의 위로 한 줄이 내일의 용기가 됩니다. 당신은 충분히 다시 사랑할 수 있어요.",
      "✨ 결과보다 중요한 건 당신의 평온이에요. 그 평온이 결국 좋은 선택을 만들어요.",
    ];
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function typeText(el, text, speed, onComplete) {
    if (!el || text == null) {
      if (typeof onComplete === "function") onComplete();
      return;
    }
    el.textContent = "";
    el.classList.add("is-typing");
    var i = 0;
    var len = text.length;
    function tick() {
      if (i >= len) {
        el.classList.remove("is-typing");
        el.classList.add("is-typed");
        if (typeof onComplete === "function") onComplete();
        return;
      }
      var next = text.charAt(i);
      if (next === "<") {
        var close = text.indexOf(">", i);
        if (close !== -1) {
          i = close + 1;
          tick();
          return;
        }
      }
      el.textContent += next;
      i += 1;
      setTimeout(tick, speed);
    }
    tick();
  }

  function renderTarotReunionResultCards() {
    var container = byId("tarotReunionResultCards");
    if (!container || !state.cards.length) return;
    container.innerHTML = "";
    container.classList.add("tarot-reunion-result-cards--visible");

    state.cards.forEach(function (card, idx) {
      var meta = getPositionMeta(card.position, idx);
      var wrap = document.createElement("div");
      wrap.className = "tarot-reunion-result-card-wrap";

      var cardEl = document.createElement("div");
      cardEl.className = "tarot-reunion-result-card";

      var front = document.createElement("div");
      front.className = "tarot-reunion-result-card-front";
      if (card.orientation === "reversed") front.setAttribute("data-reversed", "1");

      var img = document.createElement("img");
      img.className = "tarot-reunion-face-img";
      img.alt = card.nameKr || card.name || "타로 카드";
      img.loading = "lazy";
      img.decoding = "async";
      applyTarotImageWithFallback(img, front, card);
      front.appendChild(img);

      var nameSpan = document.createElement("span");
      nameSpan.className = "tarot-reunion-result-card-name";
      nameSpan.textContent = card.nameKr || card.name || "";
      if (card.orientation === "reversed") nameSpan.textContent += " (역)";
      front.appendChild(nameSpan);

      cardEl.appendChild(front);
      wrap.appendChild(cardEl);
      container.appendChild(wrap);
    });
  }

  function renderTarotReunionResult() {
    var container = byId("tarotReunionReadingContent");
    if (!container || !state.reading) return;
    if (!state.hasAccess) {
      window.alert("결제가 확인되지 않아 결과를 표시할 수 없습니다.");
      return;
    }
    var normalized = normalizeReunionResultData(state.reading, state.cards);
    var r = normalized;
    state.reading = Object.assign({}, state.reading, normalized);
    container.removeAttribute("aria-busy");

    renderTarotReunionResultCards();
    container.innerHTML = "";

    var summarySection = document.createElement("section");
    summarySection.className = "tarot-reunion-section tarot-reunion-section--guidance tarot-reunion-summary-section";
    var comprehensive = (r.summary && r.summary.comprehensive && typeof r.summary.comprehensive === "object")
      ? r.summary.comprehensive
      : {};
    summarySection.innerHTML =
      '<h4 class="tarot-reunion-section-title">🌙 등대가 비춘 관계 회복의 현재 좌표</h4>' +
      '<div class="tarot-reunion-summary-grid">' +
      '  <article class="tarot-reunion-summary-item"><h5>🌙 회복 신호</h5><p>' + escapeHtml(r.summary.reunionChanceLabel) + '</p></article>' +
      '  <article class="tarot-reunion-summary-item"><h5>💭 상대가 보이는 마음의 결</h5><p>' + escapeHtml(r.summary.partnerState) + '</p></article>' +
      '  <article class="tarot-reunion-summary-item"><h5>⏳ 다시 닿기 좋은 거리와 때</h5><p>' + escapeHtml(r.summary.bestContactTiming) + '</p></article>' +
      '  <article class="tarot-reunion-summary-item"><h5>🚧 두 사람 사이의 현실 장벽</h5><p>' + escapeHtml(r.summary.mainObstacle) + '</p></article>' +
      '  <article class="tarot-reunion-summary-item"><h5>🕯️ 오늘 먼저 지켜야 할 기준</h5><p>' + escapeHtml(r.summary.oneLineAdvice) + '</p></article>' +
      '</div>' +
      '<div class="tarot-reunion-summary-grid" style="margin-top:10px">' +
      '  <article class="tarot-reunion-summary-item"><h5>1) 회복의 흐름</h5><p>' + escapeHtml(comprehensive.reunionChanceVerdict || r.summary.reunionChanceLabel) + '</p></article>' +
      '  <article class="tarot-reunion-summary-item"><h5>2) 마음의 온도</h5><p>' + escapeHtml(comprehensive.partnerEmotionTemperature || "중립") + '</p></article>' +
      '  <article class="tarot-reunion-summary-item"><h5>3) 지금 닿을 수 있는 거리</h5><p>' + escapeHtml(comprehensive.contactPossibility || "중간") + '</p></article>' +
      '  <article class="tarot-reunion-summary-item"><h5>4) 먼저 움직이기 전 기준</h5><p>' + escapeHtml(comprehensive.shouldYouMoveFirst || "가벼운 접촉 전 간격 확인") + '</p></article>' +
      '  <article class="tarot-reunion-summary-item"><h5>5) 흐름을 바꾸는 핵심</h5><p>' + escapeHtml(comprehensive.biggestVariable || "재발 방지 합의") + '</p></article>' +
      '  <article class="tarot-reunion-summary-item"><h5>6) 지금은 잠시 내려둘 것</h5><p>' + escapeHtml(comprehensive.avoidNow || "감정 추궁") + '</p></article>' +
      '  <article class="tarot-reunion-summary-item"><h5>7) 등대가 남기는 한 문장</h5><p>' + escapeHtml(comprehensive.finalOneLineAdvice || r.summary.oneLineAdvice) + '</p></article>' +
      '</div>';
    container.appendChild(summarySection);

    if (r.opening) {
      var opening = document.createElement("section");
      opening.className = "tarot-reunion-section tarot-reunion-section--star-sea";
      opening.innerHTML =
        '<h4 class="tarot-reunion-section-title">🌌 밤바다 프롤로그</h4>' +
        '<p class="tarot-reunion-section-text">' + escapeHtml(r.opening) + '</p>';
      container.appendChild(opening);
    }

    (r.positions || []).forEach(function (pos, idx) {
      var sec = document.createElement("section");
      sec.className = "tarot-reunion-section tarot-reunion-section--star-sea tarot-reunion-position-section";

      var head = document.createElement("div");
      head.className = "tarot-reunion-section-head";

      var title = document.createElement("h4");
      title.className = "tarot-reunion-section-title";
      title.textContent = (idx + 1) + ") " + (pos.title || pos.positionTitle || REUNION_POSITION_TITLES[idx] || "포지션");
      head.appendChild(title);

      var card = state.cards[idx] || null;
      if (card) {
        var cardMeta = document.createElement("div");
        cardMeta.className = "tarot-reunion-inline-card";
        cardMeta.setAttribute("role", "button");
        cardMeta.setAttribute("tabindex", "0");

        var thumb = document.createElement("div");
        thumb.className = "tarot-reunion-inline-card-thumb";

        var thumbFront = document.createElement("div");
        thumbFront.className = "tarot-reunion-inline-card-front";
        if (card.orientation === "reversed") thumbFront.setAttribute("data-reversed", "1");

        var thumbImg = document.createElement("img");
        thumbImg.className = "tarot-reunion-face-img";
        thumbImg.alt = cardDisplayName(card);
        thumbImg.loading = "lazy";
        thumbImg.decoding = "async";
        applyTarotImageWithFallback(thumbImg, thumbFront, card);
        thumbFront.appendChild(thumbImg);
        thumb.appendChild(thumbFront);

        var cardName = document.createElement("span");
        cardName.className = "tarot-reunion-inline-card-name";
        cardName.textContent = cardDisplayName(card);

        var orientBadge = document.createElement("span");
        orientBadge.className = "tarot-reunion-orientation-badge " + (card.orientation === "reversed" ? "is-reversed" : "is-upright");
        orientBadge.textContent = orientationLabel(card.orientation);

        cardMeta.appendChild(thumb);
        cardMeta.appendChild(cardName);
        cardMeta.appendChild(orientBadge);
        bindReunionFastTap(cardMeta, function () {
          openTarotReunionCardLightbox(card);
        });
        cardMeta.addEventListener("keydown", function (e) {
          if (!e) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            openTarotReunionCardLightbox(card);
          }
        });
        head.appendChild(cardMeta);
      }

      sec.appendChild(head);

      var body = document.createElement("div");
      body.className = "tarot-reunion-position-body";
      var keywordHtml = (Array.isArray(pos.keywords) ? pos.keywords : [])
        .slice(0, 5)
        .map(function (kw) {
          return '<span class="tarot-reunion-orientation-badge" style="margin-right:6px">' + escapeHtml(kw) + '</span>';
        })
        .join("");
      body.innerHTML =
        '<div class="tarot-reunion-field"><p class="tarot-reunion-field-title">등대 자리</p><p class="tarot-reunion-section-text">' + escapeHtml(String(pos.order || (idx + 1))) + '번 · ' + escapeHtml(pos.title || pos.positionTitle || "포지션") + '</p></div>' +
        '<div class="tarot-reunion-field"><p class="tarot-reunion-field-title">이 자리가 묻는 것</p><p class="tarot-reunion-section-text">' + escapeHtml(pos.question || "") + '</p></div>' +
        '<div class="tarot-reunion-field"><p class="tarot-reunion-field-title">카드와 방향</p><p class="tarot-reunion-section-text">' + escapeHtml((pos.cardNameKo || pos.cardName || "") + ((pos.cardNameEn || "") ? ' (' + pos.cardNameEn + ')' : '')) + ' · ' + escapeHtml(pos.orientationLabel || "") + '</p></div>' +
        '<div class="tarot-reunion-field"><p class="tarot-reunion-field-title">핵심 신호</p><p class="tarot-reunion-section-text">' + (keywordHtml || '<span>-</span>') + '</p></div>' +
        '<div class="tarot-reunion-field"><p class="tarot-reunion-field-title">카드가 비춘 장면</p><p class="tarot-reunion-section-text">' + escapeHtml(pos.cardMeaning || pos.headline || "") + '</p></div>' +
        '<div class="tarot-reunion-field"><p class="tarot-reunion-field-title">재회 흐름 해석</p><p class="tarot-reunion-section-text">' + escapeHtml(pos.reunionInterpretation || pos.detailedReading || pos.directAnswer || "") + '</p></div>' +
        '<div class="tarot-reunion-field"><p class="tarot-reunion-field-title">현실 조언</p><p class="tarot-reunion-section-text">' + escapeHtml(pos.advice || "") + '</p></div>' +
        '<div class="tarot-reunion-field"><p class="tarot-reunion-field-title">조심할 파도</p><p class="tarot-reunion-section-text">' + escapeHtml(pos.caution || pos.reunionPoint || "") + '</p></div>';
      sec.appendChild(body);
      container.appendChild(sec);
    });

    var finalGuide = document.createElement("section");
    finalGuide.className = "tarot-reunion-section tarot-reunion-section--guidance tarot-reunion-final-guide";
    finalGuide.innerHTML =
      '<h4 class="tarot-reunion-section-title">🕯️ 다시 닿기 전 준비할 말과 거리</h4>' +
      '<div class="tarot-reunion-final-grid">' +
      '  <article class="tarot-reunion-final-item"><h5>먼저 움직이기 전 기준</h5><p>' + escapeHtml(r.finalGuide.shouldContactNow || "") + '</p></article>' +
      '  <article class="tarot-reunion-final-item"><h5>부담을 낮춘 첫 문장</h5><p class="tarot-reunion-message-example">' + escapeHtml(r.finalGuide.messageExample || "") + '</p></article>' +
      '  <article class="tarot-reunion-final-item"><h5>지금은 잠시 아껴둘 표현</h5><p>' + escapeHtml(r.finalGuide.avoidThis || "") + '</p></article>' +
      '  <article class="tarot-reunion-final-item"><h5>앞으로 7일, 마음 회복 루틴</h5><p>' + escapeHtml(r.finalGuide.nextSevenDays || "") + '</p></article>' +
      '</div>';
    container.appendChild(finalGuide);

    if (Array.isArray(r.actionPlan) && r.actionPlan.length) {
      var action = document.createElement("section");
      action.className = "tarot-reunion-section tarot-reunion-section--star-sea";
      action.innerHTML = '<h4 class="tarot-reunion-section-title">✅ 7일 안에 지킬 재회 체크리스트</h4><ul class="tarot-reunion-checklist"></ul>';
      var ul = action.querySelector("ul");
      r.actionPlan.slice(0, 6).forEach(function (item) {
        var li = document.createElement("li");
        li.textContent = item;
        ul.appendChild(li);
      });
      container.appendChild(action);
    }

    if (state.engineMeta && state.engineMeta.qualityEnhanced) {
      var quality = document.createElement("p");
      quality.className = "tarot-reunion-engine-meta";
      quality.textContent = "엔진 품질 강화 적용: 재회운 구조형 해석 모드";
      container.appendChild(quality);
    }

    renderTarotReunionAiPromptPanel(container, r);
  }

  function compactReunionPromptText(value, fallback) {
    var text = cleanReunionText(value || "");
    if (!text) return String(fallback || "").trim();
    return text.replace(/\s+/g, " ").trim();
  }

  function buildTarotReunionAiPromptText(reading, cards) {
    var r = reading && typeof reading === "object" ? reading : {};
    var summary = r.summary && typeof r.summary === "object" ? r.summary : {};
    var comprehensive = summary.comprehensive && typeof summary.comprehensive === "object" ? summary.comprehensive : {};
    var finalGuide = r.finalGuide && typeof r.finalGuide === "object" ? r.finalGuide : {};
    var cardLines = (Array.isArray(cards) ? cards : []).slice(0, 5).map(function (card, idx) {
      var meta = getPositionMeta(card && card.position, idx);
      var name = cardDisplayName(card);
      var orient = orientationLabel(card && card.orientation);
      return String(idx + 1) + ". " + (meta.label || "등대 자리") + ": " + name + " · " + orient;
    }).filter(Boolean);

    return [
      "당신은 밤바다의 등대처럼 그리움과 현실의 거리를 함께 비추는 재회운 타로 리더입니다.",
      "아래 다섯 장의 등대 스프레드와 이미 드러난 흐름을 바탕으로, 다시 닿아도 괜찮은 거리와 마음의 회복 순서를 차분히 읽어 주세요.",
      "",
      "[등대 카드 흐름]",
      cardLines.join("\n"),
      "",
      "[이미 드러난 재회운의 결]",
      "회복 신호: " + compactReunionPromptText(summary.reunionChanceLabel, "관계 회복 신호를 조심스럽게 확인하는 흐름입니다."),
      "상대가 보이는 마음의 결: " + compactReunionPromptText(summary.partnerState, "상대의 마음은 확정 대신 행동의 반복으로 살피는 편이 안전합니다."),
      "다시 닿기 좋은 거리와 때: " + compactReunionPromptText(summary.bestContactTiming, "짧고 부담 없는 안부부터 거리를 확인하는 흐름입니다."),
      "현실 장벽: " + compactReunionPromptText(summary.mainObstacle, "같은 갈등이 반복되지 않도록 먼저 기준을 세워야 합니다."),
      "흐름을 바꾸는 핵심: " + compactReunionPromptText(comprehensive.biggestVariable, "재발 방지와 감정 압박을 낮추는 태도입니다."),
      "부담을 낮춘 첫 문장: " + compactReunionPromptText(finalGuide.messageExample, "문득 생각나서 안부만 남겨. 편할 때 짧게 답해줘도 괜찮아."),
      "앞으로 7일: " + compactReunionPromptText(finalGuide.nextSevenDays, "감정을 정리하고 내 생활 리듬을 안정시키는 시간이 필요합니다."),
      "",
      "[리딩 부탁]",
      "재회를 확정하거나 단정하지 말고, 카드가 비추는 남은 온기와 현실적인 거리감을 나누어 읽어 주세요.",
      "상대의 마음은 가능성과 조심해야 할 파도로 구분해 말하고, 사용자가 먼저 움직여도 되는 기준을 부드럽게 정리해 주세요.",
      "마지막에는 오늘 건네기 좋은 한 문장, 아직 아껴두어야 할 표현, 앞으로 7일 동안 마음을 회복하는 작은 루틴을 남겨 주세요.",
    ].join("\n");
  }

  function renderTarotReunionAiPromptPanel(container, reading) {
    if (!container || !state.hasAccess) return;
    var promptText = buildTarotReunionAiPromptText(reading, state.cards);
    if (!promptText.trim()) return;

    var panel = document.createElement("section");
    panel.id = "tarotReunionAiPromptPanel";
    panel.className = "tarot-reunion-section tarot-reunion-ai-prompt-panel";
    panel.setAttribute("data-marker", "tarot-reunion-ai-prompt-bottom-v20260621");
    panel.innerHTML =
      '<div class="tarot-reunion-ai-prompt-head">' +
      '<span class="tarot-reunion-ai-prompt-kicker">AI Oracle Prompt</span>' +
      '<h4 class="tarot-reunion-section-title tarot-reunion-ai-prompt-title">AI에게 건넬 재회운 질문문</h4>' +
      '<p class="tarot-reunion-ai-prompt-lead">방금 밝힌 등대 카드와 마음의 거리를 담았습니다. 필요한 AI에게 옮기면 오늘의 재회운을 더 깊게 이어 볼 수 있습니다.</p>' +
      '</div>' +
      '<textarea id="tarotReunionAiPromptOutput" class="tarot-reunion-ai-prompt-output" readonly aria-label="' + tarotReunionText("aiPromptAria") + '">' + escapeHtml(promptText) + '</textarea>' +
      '<div class="tarot-reunion-ai-prompt-actions">' +
      '<button type="button" class="tarot-reunion-ai-prompt-copy" data-action="copyTarotReunionAiPrompt" data-action-pass-self="1">프롬프트 복사</button>' +
      '<span id="tarotReunionAiPromptStatus" class="tarot-reunion-ai-prompt-status">등대 리딩에 포함된 질문문입니다.</span>' +
      '</div>';
    container.appendChild(panel);
  }

  function ensureTarotReunionLightbox() {
    if (state.lightbox && state.lightbox.overlay && state.lightbox.overlay.parentNode) return state.lightbox;

    var overlay = document.createElement("div");
    overlay.className = "tarot-reunion-lightbox";
    overlay.setAttribute("aria-hidden", "true");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "타로 카드 확대 보기");
    overlay.innerHTML =
      '<div class="tarot-reunion-lightbox-backdrop"></div>' +
      '<div class="tarot-reunion-lightbox-panel" role="document">' +
      '  <button type="button" class="tarot-reunion-lightbox-close" aria-label="' + tarotReunionText("lightboxCloseAria") + '">×</button>' +
      '  <div class="tarot-reunion-lightbox-card">' +
      '    <div class="tarot-reunion-lightbox-card-front">' +
      '      <img class="tarot-reunion-face-img" alt="' + tarotReunionText("cardImageAlt") + '">' +
      "    </div>" +
      '  </div>' +
      '  <p class="tarot-reunion-lightbox-name"></p>' +
      "</div>";

    var shell = document.querySelector(".tarot-reunion-shell");
    var host = shell || document.body;
    host.appendChild(overlay);

    var closeBtn = overlay.querySelector(".tarot-reunion-lightbox-close");
    var backdrop = overlay.querySelector(".tarot-reunion-lightbox-backdrop");

    function closeFromUi(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      closeTarotReunionCardLightbox();
    }

    if (closeBtn) closeBtn.addEventListener("click", closeFromUi, { passive: false });
    if (backdrop) backdrop.addEventListener("click", closeFromUi, { passive: false });
    overlay.addEventListener("click", function (e) {
      if (e && e.target === overlay) closeFromUi(e);
    });

    state.lightbox = { overlay: overlay };
    return state.lightbox;
  }

  function openTarotReunionCardLightbox(card) {
    if (!card) return;
    var lb = ensureTarotReunionLightbox();
    if (!lb || !lb.overlay) return;
    var overlay = lb.overlay;
    var front = overlay.querySelector(".tarot-reunion-lightbox-card-front");
    var img = overlay.querySelector(".tarot-reunion-face-img");
    var name = overlay.querySelector(".tarot-reunion-lightbox-name");
    if (!img || !front || !name) return;

    front.removeAttribute("data-reversed");
    if (card.orientation === "reversed") front.setAttribute("data-reversed", "1");
    img.alt = card.nameKr || card.name || "타로 카드";
    applyTarotImageWithFallback(img, front, card);
    name.textContent = (card.nameKr || card.name || "") + (card.orientation === "reversed" ? " (역방향)" : "");

    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
  }

  function closeTarotReunionCardLightbox() {
    if (!state.lightbox || !state.lightbox.overlay) return;
    state.lightbox.overlay.classList.remove("is-open");
    state.lightbox.overlay.setAttribute("aria-hidden", "true");
  }

  function escapeHtml(s) {
    if (!s) return "";
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function copyTarotReunionAiPrompt() {
    var output = byId("tarotReunionAiPromptOutput");
    var status = byId("tarotReunionAiPromptStatus");
    var text = output ? String(output.value || "").trim() : "";
    function setStatus(message, tone) {
      if (!status) return;
      status.textContent = message;
      status.setAttribute("data-tone", tone || "info");
    }
    if (!text) {
      setStatus("복사할 프롬프트가 아직 열리지 않았습니다.", "warn");
      return;
    }
    function fallbackCopy() {
      if (!output) return false;
      output.focus();
      output.select();
      try {
        return document.execCommand("copy");
      } catch (e) {
        return false;
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(function () { setStatus("프롬프트가 복사되었습니다.", "success"); })
        .catch(function () {
          var copied = fallbackCopy();
          setStatus(copied ? "프롬프트가 복사되었습니다." : "복사 권한이 막혀 직접 선택해 복사해 주세요.", copied ? "success" : "warn");
        });
      return;
    }
    var copied = fallbackCopy();
    setStatus(copied ? "프롬프트가 복사되었습니다." : "복사 권한이 막혀 직접 선택해 복사해 주세요.", copied ? "success" : "warn");
  }

  function shareTarotReunionResult() {
    var r = normalizeReunionResultData(state.reading, state.cards);
    if (!r) return;
    var text = "🌊 [별 헤는 밤바다 재회운 타로] 🌊\n\n";
    text += "🌙 회복 신호: " + r.summary.reunionChanceLabel + "\n";
    text += "💭 상대가 보이는 마음의 결: " + r.summary.partnerState + "\n";
    text += "⏳ 다시 닿기 좋은 거리: " + r.summary.bestContactTiming + "\n";
    text += "🚧 먼저 살필 변수: " + r.summary.mainObstacle + "\n";
    text += "🕯️ 등대가 남기는 한 문장: " + r.summary.oneLineAdvice + "\n\n";
    text += "부담을 낮춘 첫 문장: \"" + r.finalGuide.messageExample + "\"\n\n";
    text += "👉 재회운 타로 보기: https://code-destiny.com";

    if (navigator.share) {
      navigator.share({
        title: tarotReunionText("shareTitle"),
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

  window.openTarotReunionModal = openTarotReunionModal;
  window.closeTarotReunionModal = closeTarotReunionModal;
  window.resetTarotReunionFlow = resetTarotReunionFlow;
  window.startTarotReunionReading = startTarotReunionReading;
  window.flipTarotReunionCard = flipTarotReunionCard;
  window.showTarotReunionFinalReading = showTarotReunionFinalReading;
  window.shareTarotReunionResult = shareTarotReunionResult;
  window.copyTarotReunionAiPrompt = copyTarotReunionAiPrompt;
  window.toggleTarotReunionMeditation = toggleTarotReunionMeditation;
  window.openTarotReunionCardLightbox = openTarotReunionCardLightbox;
  window.closeTarotReunionCardLightbox = closeTarotReunionCardLightbox;
  function initTarotReunionBindings() {
    bindTarotReunionStaticActions();
    if (!window.__tarotReunionLightboxEscBound) {
      window.__tarotReunionLightboxEscBound = true;
      document.addEventListener("keydown", function (e) {
        if (e && e.key === "Escape") closeTarotReunionCardLightbox();
      });
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTarotReunionBindings, { once: true });
  } else {
    initTarotReunionBindings();
  }
})();
