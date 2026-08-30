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
  var ZODIAC_NAMES = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"];

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
    monthNarrativeCache: {},
    monthRequestToken: 0,
    year: new Date().getFullYear(),
    requestId: "",
    resultId: ""
  };
  var YEAR_COIN_COST = 100;
  var YEAR_REASON = "십이지신 천운 타로";
  var YEAR_FEATURE_KEY = "tarot-year-fortune";
  // 워커의 Mongo 단일 시도 상한은 최소 11.5초다(worker/lib/db.js — serverSelection 8000 + 3500).
  // 9초에 abort 하면 성공했을 요청까지 잘라내고 재시도로 부하만 더한다. 서버 예산 위로 둔다.
  var TAROT_API_TIMEOUT_MS = 15000;
  // 503/5xx·429 는 "이 주소가 틀렸다"가 아니라 "서버가 지금 바쁘다"이다. 짧은 지터 백오프로 같은
  // 엔드포인트를 다시 부르면 워커 아이솔레이트/풀이 자가복구해 대개 성공한다.
  var TAROT_API_MAX_ATTEMPTS = 3;
  var TAROT_API_BACKOFF_MS = [400, 1000];

  function waitMs(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function tarotHttpStatus(error) {
    return Number(error && error.status) || 0;
  }
  // 401/403/400/422 등 결정적 4xx(429 제외)는 재시도해도 base 를 바꿔도 고쳐지지 않는다.
  function isTarotNonRetryable(error) {
    var status = tarotHttpStatus(error);
    return status >= 400 && status < 500 && status !== 429;
  }
  // 시간축 재시도 대상 — 같은 base 를 백오프로 다시 부른다.
  function isTarotTimeRetryable(error) {
    var status = tarotHttpStatus(error);
    return status === 429 || (status >= 500 && status < 600);
  }
  function tarotBackoffDelay(attemptIndex) {
    var base = TAROT_API_BACKOFF_MS[Math.min(attemptIndex, TAROT_API_BACKOFF_MS.length - 1)];
    return base + Math.floor(Math.random() * 200);
  }

  function byId(id) {
    return document.getElementById(id);
  }

  // Local-only UI fixture: lets the Family test account inspect the premium
  // result shell without contacting a payment, LLM, or production API.
  function isLocalFamilyUiTest() {
    try {
      var host = String(location.hostname || "").toLowerCase();
      var familyTest = new URLSearchParams(location.search || "").get("familyTest");
      return (host === "localhost" || host === "127.0.0.1" || host === "::1") && String(familyTest || "").toLowerCase() === "family";
    } catch (e) {
      return false;
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
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: body,
      cache: "no-store",
      credentials: "include",
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

    // 🔴 base 후보 순회는 "이 API 주소가 틀렸다"를 위한 장치다. 그런데 프로덕션에서 후보
    // ("" 와 location.origin)는 같은 워커로 귀결되므로, 워커가 낸 JSON 503 을 base 순회로 처리하면
    // 지연 0 으로 동일 요청을 한 번 더 쏘고 즉시 포기한다 — 포화된 순간에 DB 부하만 2배로 올린다.
    // 그래서 5xx·429 는 같은 base 를 백오프로 재시도하고, base 순회는 응답 자체가 없었을 때
    // (네트워크/타임아웃) 또는 시간축 재시도가 소진됐을 때 마지막 수단으로 1회만 쓴다.
    // 같은 결론이 js/destiny-profile.js·js/tarot-love-experience.js 에 이미 적용돼 있다.
    var primaryBase = bases.length ? bases[0] : "";
    var fallbackBases = bases.slice(1);

    function attempt(n) {
      return requestWithBase(primaryBase).catch(function (error) {
        lastError = error;
        if (isTarotNonRetryable(error)) throw error;

        if (isTarotTimeRetryable(error) && n + 1 < TAROT_API_MAX_ATTEMPTS) {
          var delay = tarotBackoffDelay(n);
          console.info("[Tarot API Debug] transient_retry", {
            endpoint: endpoint,
            status: tarotHttpStatus(error),
            attempt: n + 1,
            maxAttempts: TAROT_API_MAX_ATTEMPTS,
            delayMs: delay,
          });
          return waitMs(delay).then(function () { return attempt(n + 1); });
        }

        if (fallbackBases.length) {
          return requestWithBase(fallbackBases[0]).catch(function () { throw error; });
        }
        throw error;
      });
    }

    return attempt(0).catch(function (error) {
      logTarotApiError("all_candidates_failed", {
        endpoint: endpoint,
        baseCandidates: bases,
      }, lastError || error);
      throw error;
    });
  }

  function callTarotYearResult(year, resultId) {
    var bases = buildTarotApiBaseCandidates();
    var primaryBase = bases.length ? bases[0] : "";
    var fallbackBases = bases.slice(1);
    var query = resultId
      ? "?resultId=" + encodeURIComponent(String(resultId))
      : "?year=" + encodeURIComponent(String(year || new Date().getFullYear()));

    function requestWithBase(base) {
      var url = (base ? base + "/api/tarot/year/result" : "/api/tarot/year/result") + query;
      var headers = { "Accept": "application/json" };
      var token = getAuthToken();
      if (token) headers.Authorization = "Bearer " + token;
      return fetch(url, {
        method: "GET",
        headers: headers,
        credentials: "include",
        cache: "no-store",
      }).then(function (res) {
        if (res.status === 404) return null;
        if (!res.ok) {
          var error = new Error("Stored tarot year result request failed: " + res.status);
          error.status = res.status;
          throw error;
        }
        return res.json();
      });
    }

    // callTarotApi 와 같은 규칙 — 5xx·429 는 같은 base 를 백오프로 재시도하고, base 순회는
    // 마지막 수단 1회만. 예전에는 5xx 를 지연 0 으로 base 순회만 시켜, 워커가 바쁜 순간에
    // 같은 요청을 연달아 쏘고 곧바로 포기했다.
    function attempt(n) {
      return requestWithBase(primaryBase).catch(function (error) {
        if (isTarotNonRetryable(error)) throw error;

        if (isTarotTimeRetryable(error) && n + 1 < TAROT_API_MAX_ATTEMPTS) {
          return waitMs(tarotBackoffDelay(n)).then(function () { return attempt(n + 1); });
        }

        if (fallbackBases.length) {
          return requestWithBase(fallbackBases[0]).catch(function () { throw error; });
        }
        throw error;
      });
    }
    return attempt(0);
  }

  function getAuthToken() {
    try {
      return localStorage.getItem("fortune_auth_token") || localStorage.getItem("cdToken") || "";
    } catch (e) {
      return "";
    }
  }

  function getYearStorageKey(year) {
    return "cd:tarot-year:request:" + String(year || state.year || new Date().getFullYear());
  }

  function getOrCreateYearRequestId(year) {
    var key = getYearStorageKey(year);
    try {
      var existing = String(sessionStorage.getItem(key) || "").trim();
      if (existing) return existing;
      var created = "tarot-year:" + String(year) + ":" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
      sessionStorage.setItem(key, created);
      return created;
    } catch (e) {
      return "tarot-year:" + String(year) + ":" + Date.now().toString(36);
    }
  }

  function clearYearRequestId(year) {
    try { sessionStorage.removeItem(getYearStorageKey(year)); } catch (e) {}
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
        window.alert("🪙 " + reason + "\n\n" + (Math.max(0, Number(cost || 0)) * 100).toLocaleString("ko-KR") + "원 결제가 필요합니다.\n결제 화면을 엽니다.");
        window.__cdOpenChargeModal();
        return;
      }
    } catch (e) {}
    window.location.href = "/points";
  }

  function consumeCoinDirect(cost, reason, featureKey) {
    if (isYearAdminLikeUser()) return Promise.resolve(true);
    var requestId = state.requestId || getOrCreateYearRequestId(state.year);
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
      })).then(function(result) {
        return !!(result && (result.status === "granted" || result.ok === true || result.payload));
      }).catch(function(error) {
        window.alert(String(error && error.message || "결제를 완료하지 못했습니다. 결제 수단을 확인한 뒤 다시 시도해 주세요."));
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

  function rollbackCoinBestEffort(cost, reason, featureKey) {
    // 신규 결제 실패를 레거시 포인트 지급으로 보상하지 않는다. 실제 결제 복구는
    // 서버의 멱등성·환불/월정석 보상 원장을 통해서만 처리한다.
    return Promise.resolve(false);
  }

  function requireYearAccess() {
    if (isYearAdminLikeUser()) {
      state.hasAccess = true;
      state.paymentInFlight = false;
      return Promise.resolve(true);
    }
    if (state.hasAccess) return Promise.resolve(true);
    if (state.paymentInFlight) return Promise.resolve(false);
    state.year = new Date().getFullYear();
    state.requestId = getOrCreateYearRequestId(state.year);
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

  var TAROT_LOCAL_BASES = ["/tarot-cards/", "tarot-cards/"];
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
      restoreStoredYearResult();
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
    clearYearRequestId(state.year || new Date().getFullYear());
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
    state.monthNarrativeCache = {};
    state.monthRequestToken = 0;
    state.year = new Date().getFullYear();
    state.requestId = "";
    state.resultId = "";
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

  function applyYearResultData(data) {
    var normalized = normalizeYearlyReadingPayload(data);
    if (!normalized) return false;
    state.reading = normalized;
    state.cards = Array.isArray(data && data.cards) && data.cards.length
      ? data.cards
      : (Array.isArray(normalized.monthlyReadings) ? normalized.monthlyReadings.map(function (month) {
          var card = month.mainCard || {};
          return {
            cardId: card.cardId || month.cardId,
            nameKr: card.nameKo || month.nameKr,
            name: card.nameEn || month.name,
            orientation: card.orientation || month.orientation,
            position: "month_" + month.month,
            imageUrl: card.imageUrl || month.imageUrl,
            imageCandidates: card.imageCandidates || month.imageCandidates,
            localImageUrl: card.localImageUrl || month.localImageUrl,
          };
        }) : []);
    state.year = Number(normalized.year) || state.year || new Date().getFullYear();
    state.resultId = String(data && data.resultId || normalized.resultId || "").trim();
    state.hasAccess = true;
    state.consultingHighlights = Array.isArray(data && data.consultingHighlights)
      ? data.consultingHighlights.map(function (line) { return String(line || "").trim(); }).filter(Boolean).slice(0, 4)
      : [];
    state.engineMeta = data && typeof data.engineMeta === "object" ? data.engineMeta : null;
    state.monthNarrativeCache = {};
    state.monthCategoryCache = {};
    var intro = byId("tarotYearFortuneIntroStage");
    var draw = byId("tarotYearFortuneDrawStage");
    var result = byId("tarotYearFortuneResultStage");
    if (intro) intro.classList.remove("is-active");
    if (draw) draw.classList.remove("is-active");
    if (result) result.classList.add("is-active");
    renderTarotYearResult();
    return true;
  }

  function restoreStoredYearResult() {
    var year = new Date().getFullYear();
    state.year = year;
    return callTarotYearResult(year, "").then(function (data) {
      if (!data) return false;
      return applyYearResultData(data);
    }).catch(function (error) {
      if (Number(error && error.status) !== 401 && Number(error && error.status) !== 403) {
        console.info("[Tarot Year Fortune] stored result unavailable", error);
      }
      return false;
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

    state.requestId = state.requestId || getOrCreateYearRequestId(state.year);
    callTarotApi("draw", {
      spreadType: "yearly_twelve_card",
      year: state.year,
      seed: state.requestId,
    })
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
    var fullDeck = ["M00","M01","M02","M03","M04","M05","M06","M07","M08","M09","M10","M11","M12","M13","M14","M15","M16","M17","M18","M19","M20","M21"];
    var seed = String(state.requestId || getOrCreateYearRequestId(state.year));
    var hash = 2166136261;
    for (var seedIndex = 0; seedIndex < seed.length; seedIndex += 1) {
      hash ^= seed.charCodeAt(seedIndex);
      hash = Math.imul(hash, 16777619);
    }
    var shuffled = fullDeck.slice();
    for (var shuffleIndex = shuffled.length - 1; shuffleIndex > 0; shuffleIndex -= 1) {
      hash += hash << 13; hash ^= hash >>> 7; hash += hash << 3; hash ^= hash >>> 17; hash += hash << 5;
      var swapIndex = Math.abs(hash) % (shuffleIndex + 1);
      var swap = shuffled[shuffleIndex]; shuffled[shuffleIndex] = shuffled[swapIndex]; shuffled[swapIndex] = swap;
    }
    var labels = ["month_1","month_2","month_3","month_4","month_5","month_6","month_7","month_8","month_9","month_10","month_11","month_12"];
    state.cards = shuffled.slice(0, 12).map(function(id, i){
      hash += hash << 13; hash ^= hash >>> 7; hash += hash << 3; hash ^= hash >>> 17; hash += hash << 5;
      var ori = Math.abs(hash) % 5 === 0 ? "reversed" : "upright";
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
    if (cat === "exam") return "career";
    if (cat === "relationship") return "love";
    return "general";
  }

  function getMonthlyBaseText(monthly, cat) {
    if (!monthly) return "";
    if (cat === "money") return monthly.moneyWork || monthly.money || "";
    if (cat === "love") return monthly.love || "";
    if (cat === "relationship") return monthly.relationship || monthly.love || "";
    if (cat === "health") return monthly.healthMind || "";
    if (cat === "exam") return monthly.exam || "";
    return monthly.flow || "";
  }

  function getCategoryTitle(cat) {
    if (cat === "money") return "금전·일 운세";
    if (cat === "love") return "연애운 해석";
    if (cat === "relationship") return "관계 운세";
    if (cat === "health") return "건강 운세";
    if (cat === "exam") return "합격운 해석";
    return "이달의 핵심";
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
    textEl.textContent = String(text || "").trim();
  }
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ensureMonthNarrativeList() {
  var content = byId("tarotYearMonthDetailContent");
  if (!content) return null;
  var existing = byId("tarotYearMonthNarrativeList");
  if (existing) return existing;
  var tabs = byId("tarotYearMonthCategoryTabs");
  var section = document.createElement("section");
  section.className = "ty-monthly-section";
  section.innerHTML = '<h5 class="ty-monthly-section-title">월별 상세 운세</h5><div id="tarotYearMonthNarrativeList" class="ty-monthly-list"></div>';
  if (tabs && tabs.parentNode === content) {
    content.insertBefore(section, tabs);
  } else {
    content.appendChild(section);
  }
  return byId("tarotYearMonthNarrativeList");
}

function getMonthlySectionText(monthly, key, fallback) {
  if (!monthly) return fallback || "";
  var direct = monthly[key];
  if (Array.isArray(direct)) {
    var joined = direct.map(function (line) { return String(line || "").trim(); }).filter(Boolean).join(" ");
    if (joined) return joined;
  }
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  if (direct && typeof direct === "object") {
    var objectText = [direct.title, direct.summary, direct.reading, direct.advice, direct.action]
      .map(function (line) { return String(line || "").trim(); })
      .filter(Boolean)
      .join(" ");
    if (objectText) return objectText;
  }
  return fallback || "";
}


function buildMonthNarrativeItem(title, bodyHtml, extraClass) {
  return '<article class="ty-month-item ty-month-item--open ' + (extraClass || "") + '">' +
    '<button type="button" class="ty-month-header" aria-expanded="true">' + escapeHtml(title) + '</button>' +
    '<div class="ty-month-body">' + bodyHtml + '</div>' +
    '</article>';
}

function buildMonthDetailHtml(monthly, spreadCards, triadReading, cat) {
  if (!monthly) return "";
  var mainCard = monthly.mainCard || {};
  var spreadText = [];
  if (Array.isArray(spreadCards) && spreadCards.length) {
    spreadCards.forEach(function (card, idx) {
      var label = idx === 0 ? "원인" : idx === 1 ? "전개" : "결과";
      spreadText.push('<p class="ty-month-detail-item"><strong>' + label + '</strong> ' + escapeHtml((card.nameKr || card.name || "카드") + (card.orientation === "reversed" ? " (역)" : " (정)")) + '</p>');
    });
  }
  var triadStory = triadReading && triadReading.summary ? String(triadReading.summary || "") : getMonthlySectionText(monthly, "triadReading", "");
  var triadAdvice = triadReading && triadReading.advice ? String(triadReading.advice || "") : getMonthlySectionText(monthly, "advice", "");
  var triadParts = Array.isArray(triadReading && triadReading.cardSections) ? triadReading.cardSections : [];
  var triadCardSections = triadParts.length
    ? triadParts.map(function (section) {
        return '<p class="ty-month-detail-item"><strong>' + escapeHtml(section.positionLabel || section.positionTitle || "월운") + '</strong> ' + escapeHtml((section.cardName || section.cardNameKo || "카드") + " · " + (section.orientationLabel || section.orientation || "")) + '</p>';
      }).join("")
    : spreadText.join("");

  var sections = [
    buildMonthNarrativeItem(
      "이달의 핵심 한 문장",
      '<p class="ty-month-detail-item"><strong>메인 카드</strong> ' + escapeHtml((mainCard.nameKo || monthly.monthLabel || "이달의 카드") + (mainCard.orientation === "reversed" ? " (역방향)" : " (정방향)")) + '</p>' +
        '<p class="ty-month-detail-item"><strong>핵심</strong> ' + escapeHtml(getMonthlySectionText(monthly, "overall", mainCard.questionSpecificMeaning || "")) + '</p>',
      "ty-month-item--main"
    ),
    buildMonthNarrativeItem(
      "십이지신 × 타로 결합 해석",
      '<p class="ty-month-detail-item"><strong>' + escapeHtml(monthly.zodiacSymbol + " " + monthly.zodiacAnimal) + '</strong> ' + escapeHtml(monthly.zodiacTheme || "") + '</p>' +
        '<p class="ty-month-detail-item"><strong>' + escapeHtml(monthly.zodiacTarotDynamic || "결합") + '</strong> ' + escapeHtml(getMonthlySectionText(monthly, "combinationReading", getMonthlySectionText(monthly, "zodiacReading", ""))) + '</p>',
      "ty-month-item--zodiac"
    ),
    buildMonthNarrativeItem(
      "원인 → 과정 → 결과 흐름",
      triadCardSections +
        '<p class="ty-month-detail-item"><strong>흐름 해석</strong> ' + escapeHtml(triadStory || "원인·전개·결과를 연결해 이번 달의 사건 흐름을 읽습니다.") + '</p>' +
        '<p class="ty-month-detail-item"><strong>선택 기준</strong> ' + escapeHtml(triadAdvice || getMonthlySectionText(monthly, "advice", mainCard.advice || "")) + '</p>',
      "ty-month-item--triad"
    ),
    buildMonthNarrativeItem("이달의 조언", '<p class="ty-month-detail-item">' + escapeHtml(getMonthlySectionText(monthly, "advice", mainCard.advice || "")) + '</p>', "ty-month-item--advice"),
    buildMonthNarrativeItem(
      "월별 분야 리딩",
      '<p class="ty-month-detail-item"><strong>흐름</strong> ' + escapeHtml(getMonthlySectionText(monthly, "flow", monthly.summary || "")) + '</p>' +
        '<p class="ty-month-detail-item"><strong>금전</strong> ' + escapeHtml(getMonthlySectionText(monthly, "money", "")) + '</p>' +
        '<p class="ty-month-detail-item"><strong>일·사업</strong> ' + escapeHtml(getMonthlySectionText(monthly, "work", "")) + '</p>' +
        '<p class="ty-month-detail-item"><strong>관계</strong> ' + escapeHtml(getMonthlySectionText(monthly, "relationship", monthly.love || "")) + '</p>' +
        '<p class="ty-month-detail-item"><strong>건강</strong> ' + escapeHtml(getMonthlySectionText(monthly, "health", "")) + '</p>',
      "ty-month-item--fields"
    ),
    buildMonthNarrativeItem(
      "카드의 연간 의미",
      '<p class="ty-month-detail-item"><strong>올해의 테마</strong> ' + escapeHtml(mainCard.annualTheme || "") + '</p>' +
        '<p class="ty-month-detail-item"><strong>밝은 면</strong> ' + escapeHtml((monthly.cardReading || {}).light || "") + '</p>' +
        '<p class="ty-month-detail-item"><strong>그림자 면</strong> ' + escapeHtml((monthly.cardReading || {}).shadow || "") + '</p>' +
        '<p class="ty-month-detail-item"><strong>피해야 할 태도</strong> ' + escapeHtml((monthly.cardReading || {}).avoid || "") + '</p>',
      "ty-month-item--card-reading"
    ),
    buildMonthNarrativeItem(
      "이번 달에 남길 행동",
      '<p class="ty-month-detail-item"><strong>주의</strong> ' + escapeHtml(getMonthlySectionText(monthly, "caution", "")) + '</p>' +
        '<p class="ty-month-detail-item"><strong>실천</strong> ' + escapeHtml(getMonthlySectionText(monthly, "action", mainCard.annualAdvice || "")) + '</p>',
      "ty-month-item--action"
    ),
  ];

  return sections.join("");
}


function renderMonthDetailNarrative(monthNum, cat, spreadCards, triadReading) {
  var monthly = getMonthlyReadingByMonth(state.reading, monthNum);
  var list = ensureMonthNarrativeList();
  if (!monthly || !list) return;
  var monthKey = String(monthNum);
  var html = buildMonthDetailHtml(monthly, spreadCards, triadReading, cat || state.activeCategory || "general");
  if (!html) return;
  state.monthNarrativeCache[monthKey] = html;
  list.innerHTML = html;
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
      var cachedNarrative = state.monthNarrativeCache[monthKey];
      if (cachedNarrative) {
        renderMonthDetailNarrative(monthNum, cat, cachedNarrative.spreadCards || [], cachedNarrative.triadReading || null);
      }
      return Promise.resolve();
    }

    var spreadCards = state.monthSpreadCache[monthKey] || [];
    var baseText = getMonthlyBaseText(monthly, cat);
    var fallbackByCat = {
      general: "이번 달은 차분한 점검과 작은 실행이 균형을 잡을 때 흐름이 열립니다.",
      money: "재물과 일의 흐름은 지출 기준, 일정, 역할을 분명히 할수록 안정됩니다.",
      love: "관계의 온도는 큰 고백보다 일관된 표현과 편안한 대화에서 살아납니다.",
      relationship: "인간관계는 경계를 존중하는 말과 약속의 속도를 맞출 때 안정됩니다.",
      health: "건강은 약속 수와 회복 시간을 함께 조정할 때 안정됩니다.",
      exam: "시험과 평가는 짧은 반복 루틴, 컨디션 관리, 마지막 점검의 질이 흐름을 바꿉니다."
    };
    if (!spreadCards.length) {
      var onlyBase = toReadableText(baseText, fallbackByCat[cat]);
      state.monthCategoryCache[monthKey][cat] = onlyBase;
      updateMonthCategoryPanel(onlyBase, cat);
      state.monthNarrativeCache[monthKey] = { spreadCards: [], triadReading: null };
      renderMonthDetailNarrative(monthNum, cat, [], null);
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
      state.monthNarrativeCache[monthKey] = {
        spreadCards: spreadCards,
        triadReading: res && res.reading ? res.reading : null,
      };
      renderMonthDetailNarrative(monthNum, cat, spreadCards, res && res.reading ? res.reading : null);
    }).catch(function () {
      var text = toReadableText(baseText, fallbackByCat[cat]);
      state.monthCategoryCache[monthKey][cat] = text;
      updateMonthCategoryPanel(text, cat);
      state.monthNarrativeCache[monthKey] = { spreadCards: spreadCards, triadReading: null };
      renderMonthDetailNarrative(monthNum, cat, spreadCards, null);
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

      // 월 상세 카드 및 월운 흐름 카드에 부드러운 플립 애니메이션 적용
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

    callTarotApi("reading", {
      category: "general",
      spreadType: "yearly_twelve_card",
      cards: drawnForApi,
      year: state.year,
      requestId: state.requestId || getOrCreateYearRequestId(state.year),
    })
      .then(function (data) {
        if (data && data.status === "generating") {
          // 예전에는 900ms 뒤 단 한 번만 조회했다. 그 한 번을 놓치면 돈을 낸 사용자가
          // "잠시 후 다시 시도" 안내를 받고 직접 재시도해야 했다. 늘어나는 간격으로 세 번 본다.
          var pollDelays = [900, 1800, 3000];
          var pollStored = function (i) {
            if (i >= pollDelays.length) return Promise.resolve(null);
            return waitMs(pollDelays[i])
              .then(function () { return callTarotYearResult(state.year, data.resultId || ""); })
              .catch(function () { return null; })
              .then(function (stored) { return stored || pollStored(i + 1); });
          };
          return pollStored(0).then(function (stored) {
            if (!stored) throw new Error("Stored tarot year result is not ready");
            if (!applyYearResultData(stored)) throw new Error("No stored tarot year result");
            return stored;
          });
        }
        var normalized = normalizeYearlyReadingPayload(data);
        if (!normalized) throw new Error("No reading data");
        applyYearResultData(data);
        return data;
      })
      .catch(function (err) {
        console.error("Tarot Year reading error:", err);
        if (/stored tarot year result is not ready|no stored tarot year result/i.test(String(err && err.message || ""))) {
          state.hasAccess = true;
          window.alert("결제 확인은 완료되었습니다. 결과를 정리하고 있어요. 잠시 후 결과 다시 보기를 눌러 주세요.");
          return;
        }
        if (isLocalFamilyUiTest()) {
          state.hasAccess = true;
          buildClientSideReading();
          state.reading.zodiacGuardians = state.reading.monthlyReadings.map(function (month, idx) {
            return {
              animal: month.zodiacAnimal,
              symbol: month.zodiacSymbol || ZODIAC_EMOJI[idx],
              theme: month.zodiacTheme,
            };
          });
          applyYearResultData({
            reading: state.reading,
            cards: state.cards,
            year: state.year,
            engineMeta: { mode: "local-family-ui-mock" },
          });
          return;
        }
        rollbackCoinBestEffort(YEAR_COIN_COST, YEAR_REASON, YEAR_FEATURE_KEY).then(function (rolledBack) {
          state.hasAccess = false;
          if (rolledBack) {
            window.alert("해석 생성 오류가 발생해 결제 금액을 복구했습니다. 다시 시도해 주세요.");
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
    var defHealth = "약속 수와 회복 시간을 같이 조절하면 몸의 부담이 줄고 마음의 집중도 돌아옵니다.";
    var defExam = "집중력은 한 번에 끌어올리기보다 짧은 반복 루틴과 마지막 점검의 질로 안정됩니다.";

    state.reading = {
      schemaVersion: "tarot-year-v2",
      year: state.year || new Date().getFullYear(),
      summary: "천상의 열두 수호신이 한 해의 문을 열었습니다. 1월부터 12월까지 월별 카드를 눌러 전체 기조, 재물, 관계, 일, 평가의 흐름을 확인하세요. 카드와 월운의 세 갈래 흐름이 당신의 한 해를 차분히 비춥니다.",
      finalAdvice: "올해는 매월의 신호를 곁에 두고 작은 결심을 현실로 옮길수록 선택 기준이 선명해집니다. 급하지 않게, 그러나 꾸준히 나아가면 재물, 인연, 성취의 기운이 차분히 쌓입니다.",
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
        var flowFallback = zName + "의 달에는 " + traits + "의 결이 먼저 열립니다. " + nameKr + (card.orientation === "reversed" ? "(역방향)" : "(정방향)") + "은 이달의 선택을 한곳으로 좁히며, 월초에 세운 작은 실천을 지킬수록 후반 흐름이 안정됩니다.";
        return {
          month: idx + 1,
          monthLabel: (idx + 1) + "월",
          zodiac: { name: zName, traits: traits },
          zodiacAnimal: zName,
          zodiacSymbol: ZODIAC_EMOJI[idx] || "",
          zodiacTheme: traits,
          zodiacTarotDynamic: "보완",
          mainCard: {
            cardId: id,
            nameKo: nameKr,
            orientation: card.orientation,
            advice: "이번 달 안에 실행할 일 하나와 미룰 일 하나를 나누어 적으세요."
          },
          flow: (g || flowFallback),
          money: m,
          moneyWork: m,
          love: l,
          relationship: defRelation,
          healthMind: defHealth,
          advice: "이번 달 안에 실행할 일 하나와 미룰 일 하나를 나누어 적으세요.",
          exam: c,
        };
      }),
    };
    var firstMonth = state.reading.monthlyReadings[0] || {};
    var midMonth = state.reading.monthlyReadings[5] || firstMonth;
    var lastMonth = state.reading.monthlyReadings[11] || firstMonth;
    state.reading.yearTheme = {
      mainCard: { cardId: firstMonth.mainCard.cardId, nameKo: firstMonth.mainCard.nameKo, orientation: firstMonth.mainCard.orientation },
      keyword: "기준을 세우고 흐름을 이어가기",
      summary: "올해의 운은 한 번에 폭발하기보다 매달의 작은 징조를 통해 서서히 방향을 보여줍니다.",
      light: "열두 수호신의 강점은 이미 가진 감각을 생활의 선택 기준으로 바꿀 때 살아납니다.",
      shadow: "조급함 때문에 여러 가능성을 동시에 좇으면 정작 중요한 흐름을 놓칠 수 있습니다.",
      advice: "이번 달 안에 실행할 일 하나와 미룰 일 하나를 나누어 적으세요.",
    };
    state.reading.annualOverview = {
      summary: state.reading.summary,
      overallFlow: "상반기에는 기준을 세우고, 중반에는 방향을 조정하며, 하반기에는 선택을 현실에 남기는 흐름입니다.",
      strongestEnergy: "작은 실행을 반복해 현실 기반을 만드는 힘이 강합니다.",
      recurringTheme: "기회가 보일 때마다 방향을 다시 확인하고, 하나의 기준을 끝까지 지키는 일이 반복됩니다.",
      cautionPattern: "속도가 방향보다 앞설 때 판단 피로가 커질 수 있습니다.",
      openingPattern: (midMonth.monthLabel || "중반") + "에 작은 실험을 시작하면 다음 선택의 근거가 생깁니다.",
      stance: "속도를 늦추기보다 방향을 잃지 않는 태도로 매달의 선택을 점검하세요.",
    };
    state.reading.categoryReading = {
      money: defMoney,
      career: "일과 사업에서는 잘하는 일을 반복 가능한 방식으로 정리할수록 성과가 선명해집니다. 기준과 마감일을 먼저 정하세요.",
      love: defLove,
      health: defHealth,
      family: defRelation,
      growth: defExam,
      noblePerson: "귀인은 정답을 대신 주는 사람보다 다음 행동을 선명하게 해 주는 사람의 모습으로 들어옵니다.",
      caution: "불안 때문에 한 번에 크게 뒤집는 선택은 피하고, 비용·일정·역할처럼 확인 가능한 조건부터 점검하세요.",
    };
    state.reading.turningPoints = [
      { period: "상반기 · 1~3월", meaning: firstMonth.flow || "초반에는 올해의 기준을 세우는 흐름이 강합니다.", advice: firstMonth.advice },
      { period: "방향 전환 · 6월", meaning: midMonth.flow || "중반에는 익숙한 방식과 새로운 선택을 비교하게 됩니다.", advice: midMonth.advice },
      { period: "하반기 현실화 · 10~12월", meaning: lastMonth.flow || "후반에는 앞서 세운 기준이 현실의 결과로 남습니다.", advice: lastMonth.advice },
    ];
    state.reading.luckyActions = [
      "이번 달의 선택 기준을 한 문장으로 적고 다음 달 첫 주에 다시 확인하세요.",
      "중요한 약속과 비용은 말보다 기록으로 남겨 현실의 기준을 고정하세요.",
      "한 달에 한 가지 결과를 완성해 다음 선택의 근거로 삼으세요.",
    ];
    state.reading.finalMessage = {
      oneLine: "작은 신호를 놓치지 않고 현실의 한 걸음으로 옮길 때 천운의 문이 열립니다.",
      attitude: state.reading.annualOverview.stance,
      opportunity: midMonth.advice,
      release: state.reading.annualOverview.cautionPattern,
      zodiacMessage: "열두 수호신은 올해의 방향이 매달의 선택을 이어 만든다는 메시지를 전합니다.",
      text: state.reading.finalAdvice,
    };
  }

  function renderPremiumYearSections(reading) {
    var top = byId("tarotYearPremiumTop");
    var bottom = byId("tarotYearPremiumBottom");
    if (!top || !bottom || !reading) return;
    var summary = reading.annualSummary || {};
    var theme = reading.yearTheme || {};
    var annual = reading.annualOverview || summary;
    var core = reading.mainCardReading || theme.mainCard || {};
    var guardians = Array.isArray(reading.zodiacGuardians) ? reading.zodiacGuardians : [];
    var categories = reading.categoryReadings || reading.categoryReading || {};
    var turningPoints = Array.isArray(reading.turningPoints) ? reading.turningPoints : [];
    var luckyActions = Array.isArray(reading.luckyActions) ? reading.luckyActions : [];
    var profiles = Array.isArray(reading.zodiacProfiles) ? reading.zodiacProfiles : [];
    var coreKeywords = Array.isArray(core.keywords) ? core.keywords.join(" · ") : String(core.keywords || "").trim();
    if (!coreKeywords && Array.isArray(summary.keywords)) coreKeywords = summary.keywords.join(" · ");

    function text(value, fallback) { return escapeHtml(String(value || fallback || "").trim()); }
    function prose(value, fallback) {
      return text(value, fallback).replace(/\n+/g, "<br>");
    }
    function section(title, body, className) {
      return '<section class="ty-premium-section ' + (className || "") + '"><h3 class="ty-premium-section-title">' + text(title) + '</h3>' + body + '</section>';
    }
    function paragraph(label, value, fallback) {
      return '<div class="ty-premium-copy"><strong>' + text(label) + '</strong><p>' + prose(value, fallback) + '</p></div>';
    }
    function field(value, fallback) {
      if (value && typeof value === "object") {
        return [value.reading, value.summary, value.advice, value.action].filter(Boolean).join(" ") || fallback || "";
      }
      return value || fallback || "";
    }

    var guardianHtml = guardians.slice(0, 12).map(function (guardian, idx) {
      return '<span class="ty-guardian-chip" title="' + text(guardian.theme, "월별 수호 상징") + '">' + text(guardian.symbol || ZODIAC_EMOJI[idx]) + ' ' + text(guardian.animal || (idx + 1) + "월") + '</span>';
    }).join("");
    top.innerHTML =
      '<section class="ty-premium-hero">' +
        '<div class="ty-premium-hero-mark"><img class="ty-premium-hero-card-img" alt="' + text(core.nameKo, "올해의 핵심 카드") + ' 카드 이미지" /></div>' +
        '<div class="ty-premium-hero-meta"><span>' + text(reading.year, new Date().getFullYear()) + ' YEAR READING</span><span>' + text(summary.zodiacAnimal, "12지신") + '</span></div>' +
        '<h3>' + text(summary.oneLineMessage, theme.summary || reading.summary) + '</h3>' +
        '<p>' + prose(summary.summary || annual.summary, reading.summary) + '</p>' +
        '<p class="ty-premium-keywords"><strong>핵심 키워드</strong> ' + text((summary.keywords || []).join(" · "), theme.keyword || "기준 · 실행 · 회복") + '</p>' +
        '<p class="ty-premium-core-advice"><strong>가장 중요한 조언</strong> ' + prose(summary.coreAdvice, annual.stance) + '</p>' +
        '<div class="ty-guardian-row" aria-label="12개월 수호신">' + guardianHtml + '</div>' +
      '</section>' +
      section("올해의 핵심 카드", '<div class="ty-core-card"><div class="ty-core-card-name"><span class="ty-core-card-orb">✦</span><div><strong>' + text(core.nameKo, "올해의 카드") + '</strong><small>' + text(core.orientation === "reversed" ? "역방향" : "정방향") + ' · ' + text(coreKeywords, theme.keyword || "핵심 흐름") + '</small></div></div>' + paragraph("기본 의미", core.basicMeaning || theme.summary) + paragraph("올해 나타나는 방식", core.yearAppearance || core.annualTheme) + paragraph("밝은 면", core.brightSide || core.light || theme.light) + paragraph("그림자 면", core.shadowSide || core.shadow || theme.shadow) + paragraph("금전", core.moneyMeaning || core.money) + paragraph("일·사업", core.careerMeaning || core.career) + paragraph("관계", core.relationshipMeaning || core.love) + paragraph("건강·컨디션", core.healthMeaning || core.health) + paragraph("이 카드를 잘 쓰는 방법", core.bestUse || core.advice || theme.advice) + paragraph("피해야 할 태도", core.avoidAttitude || core.avoid) + '</div>', "ty-premium-section--core") +
      section("십이지신 × 타로 조합", paragraph("조합의 제목", core.combinationReading && core.combinationReading.title) + paragraph("조합 해석", core.combinationReading && core.combinationReading.summary) + paragraph("현실 조언", core.combinationReading && core.combinationReading.advice), "ty-premium-section--combination") +
      section("1년 총운", paragraph("올해의 흐름", annual.overallFlow || reading.summary) + paragraph("전체 분위기", summary.overallMood || annual.strongestEnergy) + paragraph("반복될 주제", annual.recurringTheme) + paragraph("조심해야 할 패턴", annual.cautionPattern) + paragraph("운이 열리는 방식", annual.openingPattern) + paragraph("당신에게 필요한 태도", annual.stance), "ty-premium-section--overview") +
      section("12지신 상징 해석", '<div class="ty-zodiac-profile-grid">' + profiles.slice(0, 12).map(function (profile) { return '<article class="ty-zodiac-profile"><h4>' + text(profile.animal) + ' · ' + text(profile.symbol) + '</h4><p>' + prose(profile.annualTheme) + '</p><p><strong>강점</strong> ' + prose(profile.strength) + '</p><p><strong>주의</strong> ' + prose(profile.caution) + '</p><p><strong>행동</strong> ' + prose(profile.luckyAction) + '</p></article>'; }).join("") + '</div>', "ty-premium-section--zodiac-profiles");

    var heroCardImage = top.querySelector(".ty-premium-hero-card-img");
    if (heroCardImage) applyTarotImageToCard(heroCardImage, null, core);

    var categoryConfig = [
      ["money", "금전운", "₩"], ["career", "일·사업운", "↗"], ["love", "연애운", "♡"], ["relationship", "인간관계운", "◌"],
      ["health", "건강·컨디션", "♧"], ["family", "가족·생활운", "⌂"], ["growth", "공부·성장운", "✎"],
      ["noblePerson", "귀인운", "✦"], ["caution", "주의해야 할 선택", "!"], ["opportunity", "올해의 기회", "◇"],
      ["turningPoint", "올해의 전환점", "↻"], ["luckyAction", "올해의 행운 행동", "☼"],
    ];
    var categoryHtml = categoryConfig.map(function (item) {
      var value = categories[item[0]] || {};
      return '<article class="ty-category-card"><div class="ty-category-heading"><span>' + text(item[2]) + '</span><h4>' + text(value.title, item[1]) + '</h4></div><p class="ty-category-keyword">' + text(value.keyword) + '</p><p>' + prose(field(value.reading || value, "올해의 흐름을 작은 행동으로 확인해 보세요.")) + '</p>' + (value.caution ? '<p><strong>살필 점</strong> ' + prose(value.caution) + '</p>' : '') + (value.action ? '<p><strong>실천</strong> ' + prose(value.action) + '</p>' : '') + '</article>';
    }).join("");
    var turningHtml = turningPoints.map(function (point) {
      return '<article class="ty-turning-point"><strong>' + text(point.period) + '</strong><p>' + prose(point.meaning) + '</p><span>' + prose(point.advice) + '</span></article>';
    }).join("");
    var actionsHtml = luckyActions.map(function (action, idx) {
      return '<li><span>' + String(idx + 1) + '</span><p>' + prose(action) + '</p></li>';
    }).join("");
    bottom.innerHTML =
      section("1년의 서사", '<div class="ty-year-narrative">' + (Array.isArray(reading.yearNarrative) ? reading.yearNarrative : []).map(function (line, idx) { return '<p><strong>' + (idx + 1) + '월</strong> ' + prose(line) + '</p>'; }).join("") + '</div>', "ty-premium-section--narrative") +
      section("분야별 상세 리딩", '<div class="ty-category-grid">' + categoryHtml + '</div>', "ty-premium-section--categories") +
      section("올해의 전환점", '<div class="ty-turning-list">' + turningHtml + '</div>', "ty-premium-section--turning") +
      section("행운을 여는 행동", '<ol class="ty-lucky-actions">' + actionsHtml + '</ol>', "ty-premium-section--actions") +
      section("12지신이 전하는 마지막 메시지", paragraph("올해의 한 문장", reading.finalMessage?.oneLine || reading.finalAdvice) + paragraph("당신에게 필요한 태도", reading.finalMessage?.attitude || annual.stance) + paragraph("붙잡아야 할 기회", reading.finalMessage?.opportunity) + paragraph("버려야 할 습관", reading.finalMessage?.release) + paragraph("천운의 메시지", reading.finalMessage?.zodiacMessage || reading.finalAdvice), "ty-premium-section--final");
  }


function renderTarotYearResult() {
    var r = state.reading;
    if (!r) return;
    if (!state.hasAccess) {
      window.alert("결제가 확인되지 않아 결과를 표시할 수 없습니다.");
      return;
    }

    var annual = r.annualSummary || {};
    renderPremiumYearSections(r);

    var summaryEl = byId("tarotYearSummary");
    if (summaryEl) {
      var summaryLines = [];
      if (Array.isArray(state.consultingHighlights) && state.consultingHighlights.length) {
        summaryLines.push("🔭 올해 먼저 읽히는 천운 신호");
        summaryLines.push(state.consultingHighlights.map(function (line) { return "• " + line; }).join("\n"));
        summaryLines.push("");
      }
      if (annual.summary) summaryLines.push(annual.summary);
      if (annual.overallFlow) summaryLines.push(annual.overallFlow);
      summaryLines.push("한 해의 바탕 원소: " + (annual.dominantSuit || "메이저"));
      summaryLines.push("속도를 낮춰 살필 달: " + (typeof annual.reversedCount === "number" ? annual.reversedCount + "개월" : "0개월"));
      summaryLines.push("전환점이 드러나는 달: " + (typeof annual.majorCount === "number" ? annual.majorCount + "개월" : "0개월"));
      if (annual.bestMonth) summaryLines.push("기회가 또렷한 달: " + (annual.bestMonth.monthLabel || (annual.bestMonth.month + "월")));
      if (annual.cautionMonth) summaryLines.push("조심스럽게 건너갈 달: " + (annual.cautionMonth.monthLabel || (annual.cautionMonth.month + "월")));
      summaryEl.style.display = "block";
      summaryEl.textContent = summaryLines.join("\n\n");
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
        if (idx + 1 === new Date().getMonth() + 1) wrap.setAttribute("data-current", "1");
        wrap.setAttribute("role", "button");
        wrap.setAttribute("tabindex", "0");
        var monthly = getMonthlyReadingByMonth(r, idx + 1) || {};
        var zodiacName = monthly.zodiacAnimal || ZODIAC_NAMES[idx];
        wrap.setAttribute("aria-label", (idx + 1) + "월 " + zodiacName + " 월별 리딩 보기");
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
        monthLabel.textContent = (idx + 1) + "월";
        front.appendChild(monthLabel);
        var zodiac = document.createElement("span");
        zodiac.className = "ty-result-card-zodiac";
        zodiac.textContent = ZODIAC_EMOJI[idx] + " " + zodiacName;
        front.appendChild(zodiac);
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
    var adviceText = r.finalAdvice || annual.annualAdvice ||
      "한 달의 흐름을 확인한 뒤, 실천 가능한 한 가지 행동으로 운의 방향을 고정하세요.";
    if (annual.repeatedRanks && annual.repeatedRanks.length) {
      adviceText += "\n\n반복되는 숫자 리듬: " + annual.repeatedRanks.join(", ");
    }
    if (annual.repeatedCourts && annual.repeatedCourts.length) {
      adviceText += "\n반복되는 인물 카드: " + annual.repeatedCourts.join(", ");
    }
    adviceEl.textContent = adviceText;
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
    text += "👉 십이지신 천운 타로 보기: https://code-destiny.com";

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
    document.addEventListener("DOMContentLoaded", function () {
      bindTarotYearStaticActions();
      restoreStoredYearResult();
    });
  } else {
    bindTarotYearStaticActions();
    restoreStoredYearResult();
  }
})();
