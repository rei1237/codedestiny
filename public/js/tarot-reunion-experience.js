/**
 * 별 헤는 밤바다의 재회운 타로 — 5-Card Lighthouse Spread
 * API: POST /api/tarot/draw (spreadType: reunion_lighthouse_five_card)
 *      POST /api/tarot/reading (category: reunion, spreadType: reunion_lighthouse_five_card, cards)
 */
(function () {
  "use strict";

  var POSITION_META = [
    { key: "past_bond", label: "1. 우리는 과거에 어떤 모습이었을지 (과거의 인연)", labelPos: "bottom" },
    { key: "their_now", label: "2. 그 사람은 지금 뭐하고 지낼지 (상대방의 현재 근황)", labelPos: "top" },
    { key: "outside_factor", label: "3. 그 사람 주변에 다른 이성이 있을지 (주변의 방해물 또는 상황)", labelPos: "bottom" },
    { key: "their_heart", label: "4. 지금 나한테 어떤 감정을 가지고 있을지 (나를 향한 속마음)", labelPos: "top" },
    { key: "reunion_outcome", label: "5. 그 사람이 나랑 다시 만나고 싶어 할지 (재회의 가능성과 결과)", labelPos: "bottom" },
  ];

  var GUIDE_LABELS = [
    "첫 번째 카드: 과거의 인연을 천천히 마주해 보세요.",
    "두 번째 카드: 그 사람의 현재 리듬을 살펴보세요.",
    "세 번째 카드: 관계 주변의 상황과 방해 요소를 확인하세요.",
    "네 번째 카드: 그 사람의 속마음을 조심스럽게 열어보세요.",
    "다섯 번째 카드: 재회의 가능성과 결과를 받아들여 보세요.",
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
  var MEDITATION_INTRO_TEXTS = [
    "🌊 밤바다로 떠나볼까요? 준비되면 호흡을 따라가 주세요.",
    "🌙 별이 반짝이는 밤바다. 천천히 호흡을 따라가 주세요.",
    "🕯️ 등대의 불빛을 따라, 마음을 잡아 주세요.",
  ];
  var MEDITATION_PHASE_TEXTS = {
    in: [
      "눈을 감고... 밤바다의 파도에 귀 기울여 보세요. 숨을 천천히 들이쉬세요.",
      "저 멀리 등대의 빛이 보이나요? 그 빛을 향해 숨을 들이쉬세요.",
      "별이 반짝이는 밤바다... 그 고요함을 들이마시세요.",
    ],
    hold: [
      "별빛이 고요히 머무는 동안 잠시 참으세요. 그리움도 이 순간만은 잔잔합니다.",
      "파도가 잠잠해진 순간. 그 침묵을 온몸으로 느껴 보세요.",
      "등대의 불이 한 번 깜빡일 때까지... 숨을 가만히 유지하세요.",
    ],
    out: [
      "등대의 빛처럼 마음을 비우며 천천히 내쉬세요. 파도가 당신을 위로할 거예요.",
      "모든 생각을 파도에 실어 보내세요. 바닷바람이 당신을 감쌀 거예요.",
      "별빛이 스며드는 밤바다... 천천히 내쉬며 마음을 비워 보세요.",
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
      '<div class="tarot-reading-skeleton tarot-reading-skeleton--reunion" role="status" aria-live="polite">' +
      '<span class="tarot-skel-line tarot-skel-line--title"></span>' +
      '<span class="tarot-skel-line"></span><span class="tarot-skel-line"></span>' +
      '<span class="tarot-skel-line tarot-skel-line--short"></span>' +
      '<span class="tarot-skel-line"></span><span class="tarot-skel-line"></span>' +
      '<span class="tarot-skel-line"></span><span class="tarot-skel-line tarot-skel-line--short"></span>' +
      '<span class="tarot-skel-line"></span><span class="tarot-skel-line"></span>' +
      "</div>"
    );
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
    if (isReunionAdminLikeUser()) return Promise.resolve(true);
    var token = getAuthToken();
    var consumeHeaders = {
      "Content-Type": "application/json",
    };
    if (token) consumeHeaders.Authorization = "Bearer " + token;
    if (typeof window._cdSetCoinGateOverlay === 'function') window._cdSetCoinGateOverlay(true, '결제를 확인 중입니다...');
    return fetch("/api/fortune/pig-coin/consume", {
      method: "POST",
      headers: consumeHeaders,
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({
        cost: cost,
        reason: reason,
        featureKey: featureKey,
        forceDeduct: true,
        requestId: "tarot-reunion:" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9),
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

  function requireReunionAccess() {
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
          function () { done(true); },
          function () { done(false); }
        );
        return;
      }

      consumeCoinDirect(REUNION_COIN_COST, REUNION_REASON, REUNION_FEATURE_KEY)
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

  var TAROT_LOCAL_BASES = ["/tarot-cards/", "/public/tarot-cards/", "tarot-cards/", "public/tarot-cards/"];
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

    callTarotApi("draw", { spreadType: "reunion_lighthouse_five_card" })
      .then(function (data) {
        if (!data.cards || data.cards.length !== 5) throw new Error("Invalid draw");
        state.cards = data.cards;
        state.revealedCount = 0;
        intro.classList.remove("is-active");
        draw.classList.add("is-active");
        renderTarotReunionCards();
        updateTarotReunionGuide();
        if (panel) setTimeout(function () { panel.classList.remove("ritual-burst"); }, 900);
      })
      .catch(function (err) {
        console.error("Tarot Reunion draw error:", err);
        if (panel) panel.classList.remove("ritual-burst");
        alert("카드를 뽑는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      });
  }

  function getPositionMeta(position, idx) {
    var found = POSITION_META.find(function (item) {
      return item.key === position;
    });
    return found || POSITION_META[idx] || {
      key: position || ("card_" + (idx + 1)),
      label: "카드 " + (idx + 1),
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

  function showTarotReunionFinalReading() {
    if (state.revealedCount < 5 || !state.cards.length) return;
    requireReunionAccess().then(function (ok) {
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
    }
    if (cardsContainer) {
      cardsContainer.innerHTML = "";
      cardsContainer.classList.remove("tarot-reunion-result-cards--visible");
    }

    callTarotApi("reading", {
      category: "reunion",
      spreadType: "reunion_lighthouse_five_card",
      cards: drawnForApi,
    })
      .then(function (data) {
        if (!data.reading) throw new Error("No reading data");
        state.reading = data.reading;
        state.consultingHighlights = Array.isArray(data.consultingHighlights) ? data.consultingHighlights : [];
        state.engineMeta = data.engineMeta && typeof data.engineMeta === "object" ? data.engineMeta : null;
        if (rc) rc.removeAttribute("aria-busy");
        renderTarotReunionResult();
      })
      .catch(function (err) {
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
            alert("해석 생성 오류가 발생해 결제 코인을 복구했습니다. 다시 시도해 주세요.");
          } else {
            alert("해석 생성 중 오류가 발생했습니다. 결과 페이지 진입이 차단되었습니다. 잠시 후 다시 시도해 주세요.");
          }
        });
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
  ];

  function cleanReunionText(input) {
    var out = String(input || "").trim();
    if (!out) return "";
    REUNION_FORBIDDEN_PATTERNS.forEach(function (pattern) {
      out = out.replace(pattern, "");
    });
    out = out.replace(/읽는\s*정확함/g, "해석 정확도");
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
    return {
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
    "과거의 인연",
    "상대의 현재 근황",
    "주변의 방해물 또는 상황",
    "나를 향한 속마음",
    "재회의 가능성과 결과",
  ];

  function normalizeReunionResultData(reading, cards) {
    var src = reading && typeof reading === "object" ? reading : {};
    var safeCards = Array.isArray(cards) ? cards : [];

    var summarySrc = src.summary && typeof src.summary === "object" ? src.summary : {};
    var score = Number(summarySrc.reunionChanceScore);
    if (!Number.isFinite(score)) score = 50;
    score = Math.max(0, Math.min(100, Math.round(score)));
    var label = String(summarySrc.reunionChanceLabel || "").trim() || (score >= 75 ? "높음" : score >= 58 ? "조건부 높음" : score >= 40 ? "보통" : "낮음");

    var summary = {
      reunionChanceLabel: label,
      reunionChanceScore: score,
      partnerState: cleanReunionText(summarySrc.partnerState || "관망 중"),
      bestContactTiming: cleanReunionText(summarySrc.bestContactTiming || "자연스러운 계기 필요"),
      mainObstacle: cleanReunionText(summarySrc.mainObstacle || "오해"),
      oneLineAdvice: cleanReunionText(summarySrc.oneLineAdvice || "긴 고백보다 짧은 안부 메시지가 유리합니다."),
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
      shouldContactNow: cleanReunionText(finalSrc.shouldContactNow || "지금은 긴 감정 고백보다 짧은 안부가 적합합니다."),
      messageExample: cleanReunionText(finalSrc.messageExample || "요즘 문득 생각나서 짧게 안부 전하고 싶었어. 부담 갖지 않아도 괜찮아."),
      avoidThis: cleanReunionText(finalSrc.avoidThis || "답을 강요하는 질문은 피하고, 상대의 반응 속도를 존중하세요."),
      nextSevenDays: cleanReunionText(finalSrc.nextSevenDays || "앞으로 7일은 예전 갈등을 한 문장으로 정리하고 대화 준비를 하세요."),
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
        "✨ 밤바다의 별들이 당신의 길을 비추고 있어요. 그 빛을 따라 걸어가세요.",
        "🌊 파도는 언제나 해안으로 돌아옵니다. 당신의 인연도 그렇게 흐를 거예요.",
        "⭐ 별이 많은 밤은 어둡지 않아요. 당신의 마음에도 그 빛이 있답니다.",
      ];
    }
    if (challenging.test(text)) {
      return [
        "🌌 끝은 새로운 시작의 문이에요. 당신의 마음이 준비된 순간, 아름다운 새 아침이 올 거예요.",
        "🕯️ 등대의 불은 언제나 당신을 기다리고 있어요. 어떤 길을 선택하든, 당신은 혼자가 아니에요.",
        "✨ 별 바다 위에서 잃어버린 것처럼 느껴져도, 그 안에서 더 나은 자신을 찾을 수 있어요.",
      ];
    }
    return [
      "🌊 밤바다처럼 깊은 당신의 마음. 그 안에 답이 있고, 당신은 이미 그걸 알고 있답니다.",
      "⭐ 별을 헤아리듯 천천히 걸어가세요. 모든 것이 제자리를 찾을 때가 올 거예요.",
      "🕯️ 등대의 불은 멀리서도 보여요. 당신의 마음에도 그런 빛이 있으니, 믿고 나아가세요.",
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
    summarySection.innerHTML =
      '<h4 class="tarot-reunion-section-title">🌙 재회운 핵심 요약</h4>' +
      '<div class="tarot-reunion-summary-grid">' +
      '  <article class="tarot-reunion-summary-item"><h5>🌙 재회 가능성</h5><p>' + escapeHtml(r.summary.reunionChanceLabel + ' ' + r.summary.reunionChanceScore + '%') + '</p></article>' +
      '  <article class="tarot-reunion-summary-item"><h5>💭 상대의 상태</h5><p>' + escapeHtml(r.summary.partnerState) + '</p></article>' +
      '  <article class="tarot-reunion-summary-item"><h5>⏳ 연락 타이밍</h5><p>' + escapeHtml(r.summary.bestContactTiming) + '</p></article>' +
      '  <article class="tarot-reunion-summary-item"><h5>🚧 핵심 장애물</h5><p>' + escapeHtml(r.summary.mainObstacle) + '</p></article>' +
      '  <article class="tarot-reunion-summary-item"><h5>🕯️ 지금 할 일</h5><p>' + escapeHtml(r.summary.oneLineAdvice) + '</p></article>' +
      '</div>';
    container.appendChild(summarySection);

    if (r.opening) {
      var opening = document.createElement("section");
      opening.className = "tarot-reunion-section tarot-reunion-section--star-sea";
      opening.innerHTML =
        '<h4 class="tarot-reunion-section-title">🌌 짧은 서문</h4>' +
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
      title.textContent = (idx + 1) + ") " + (pos.positionTitle || REUNION_POSITION_TITLES[idx] || "포지션");
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
      body.innerHTML =
        '<div class="tarot-reunion-field"><p class="tarot-reunion-field-title">한 줄 핵심</p><p class="tarot-reunion-section-text">' + escapeHtml(pos.headline || "") + '</p></div>' +
        '<div class="tarot-reunion-field"><p class="tarot-reunion-field-title">직관 해석</p><p class="tarot-reunion-section-text">' + escapeHtml(pos.directAnswer || "") + '</p></div>' +
        '<div class="tarot-reunion-field"><p class="tarot-reunion-field-title">상세 해석</p><p class="tarot-reunion-section-text">' + escapeHtml(pos.detailedReading || "") + '</p></div>' +
        '<div class="tarot-reunion-field"><p class="tarot-reunion-field-title">재회 포인트</p><p class="tarot-reunion-section-text">' + escapeHtml(pos.reunionPoint || "") + '</p></div>' +
        '<div class="tarot-reunion-field"><p class="tarot-reunion-field-title">조언</p><p class="tarot-reunion-section-text">' + escapeHtml(pos.advice || "") + '</p></div>';
      sec.appendChild(body);
      container.appendChild(sec);
    });

    var finalGuide = document.createElement("section");
    finalGuide.className = "tarot-reunion-section tarot-reunion-section--guidance tarot-reunion-final-guide";
    finalGuide.innerHTML =
      '<h4 class="tarot-reunion-section-title">🕯️ 재회운 최종 가이드</h4>' +
      '<div class="tarot-reunion-final-grid">' +
      '  <article class="tarot-reunion-final-item"><h5>지금 연락해도 될까?</h5><p>' + escapeHtml(r.finalGuide.shouldContactNow || "") + '</p></article>' +
      '  <article class="tarot-reunion-final-item"><h5>추천 메시지</h5><p class="tarot-reunion-message-example">' + escapeHtml(r.finalGuide.messageExample || "") + '</p></article>' +
      '  <article class="tarot-reunion-final-item"><h5>피해야 할 말</h5><p>' + escapeHtml(r.finalGuide.avoidThis || "") + '</p></article>' +
      '  <article class="tarot-reunion-final-item"><h5>앞으로 7일</h5><p>' + escapeHtml(r.finalGuide.nextSevenDays || "") + '</p></article>' +
      '</div>';
    container.appendChild(finalGuide);

    if (Array.isArray(r.actionPlan) && r.actionPlan.length) {
      var action = document.createElement("section");
      action.className = "tarot-reunion-section tarot-reunion-section--star-sea";
      action.innerHTML = '<h4 class="tarot-reunion-section-title">✅ 실전 체크리스트</h4><ul class="tarot-reunion-checklist"></ul>';
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
      '  <button type="button" class="tarot-reunion-lightbox-close" aria-label="확대 보기 닫기">×</button>' +
      '  <div class="tarot-reunion-lightbox-card">' +
      '    <div class="tarot-reunion-lightbox-card-front">' +
      '      <img class="tarot-reunion-face-img" alt="타로 카드 이미지">' +
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

  function shareTarotReunionResult() {
    var r = normalizeReunionResultData(state.reading, state.cards);
    if (!r) return;
    var text = "🌊 [별 헤는 밤바다 재회운 타로] 🌊\n\n";
    text += "🌙 재회 가능성: " + r.summary.reunionChanceLabel + " " + r.summary.reunionChanceScore + "%\n";
    text += "💭 상대의 상태: " + r.summary.partnerState + "\n";
    text += "⏳ 연락 타이밍: " + r.summary.bestContactTiming + "\n";
    text += "🚧 핵심 장애물: " + r.summary.mainObstacle + "\n";
    text += "🕯️ 지금 할 일: " + r.summary.oneLineAdvice + "\n\n";
    text += "추천 메시지: \"" + r.finalGuide.messageExample + "\"\n\n";
    text += "👉 무료 재회운 타로 보기: https://code-destiny.com";

    if (navigator.share) {
      navigator.share({
        title: "🌊 별 헤는 밤바다 재회운 타로",
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
