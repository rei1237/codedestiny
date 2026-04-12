/**
 * 따뜻한 태양 행복 타로 — 4-Card Healing Rising Spread
 * API: POST /api/tarot/draw (spreadType: healing_rising_four_card)
 *      POST /api/tarot/reading (category: healing, spreadType: healing_rising_four_card, cards)
 */
(function () {
  "use strict";

  var GUIDE_LABELS = [
    "첫 번째 카드: 상황의 숨은 진실을 마주해 보세요.",
    "두 번째 카드: 내 감정을 있는 그대로 안아 주세요.",
    "세 번째 카드: 이 경험의 배움과 빛을 확인해 보세요.",
    "네 번째 카드: 앞으로의 작은 실천을 찾아보세요.",
  ];

  var state = {
    cards: [],
    revealedCount: 0,
    reading: null,
  };

  var TAROT_API_TIMEOUT_MS = 12000;

  function byId(id) {
    return document.getElementById(id);
  }

  function healingReadingSkeletonHtml() {
    return (
      '<div class="tarot-reading-skeleton tarot-reading-skeleton--healing" role="status" aria-live="polite">' +
      '<span class="tarot-skel-line tarot-skel-line--title"></span>' +
      '<span class="tarot-skel-line"></span><span class="tarot-skel-line"></span>' +
      '<span class="tarot-skel-line tarot-skel-line--short"></span>' +
      '<span class="tarot-skel-line"></span><span class="tarot-skel-line"></span>' +
      '<span class="tarot-skel-line tarot-skel-line--short"></span>' +
      '<span class="tarot-skel-line"></span>' +
      "</div>"
    );
  }

  function getHealingPanel() {
    return document.querySelector("#tarotHealingOverlay .tarot-healing-panel");
  }

  function triggerHealingSunFlash() {
    var panel = getHealingPanel();
    if (!panel) return;
    panel.classList.remove("is-sun-flash");
    // double-rAF: classList.remove 반영 후 add → 강제 reflow 없이 animation restart
    requestAnimationFrame(function () { requestAnimationFrame(function () { panel.classList.add("is-sun-flash"); }); });
    setTimeout(function () {
      try { panel.classList.remove("is-sun-flash"); } catch (e) {}
    }, 650);
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
      try {
        var custom = localStorage.getItem("fortune_api_base_url");
        if (custom) return normalizeApiBase(custom);
      } catch (e) {}
      var host = String(location.hostname || "").toLowerCase();
      // Next.js 기본 포트 3000 사용 (정적 서버 5500 등에서 열었을 때 API 연동)
      if (host === "localhost" || host === "127.0.0.1") return "http://localhost:3000";
      if (host === "api.code-destiny.com") return location.origin || "";
      if (host.endsWith(".pages.dev")) return "https://code-destiny.com";
    }
    return "https://code-destiny.com";
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

    add(getRuntimeEnvApiBase());
    add(getTarotApiBase());

    if (typeof window !== "undefined") {
      var host = String(location.hostname || "").toLowerCase();
      // 정적 서버(예: 5500)에서 열었을 때 Next.js API(3000) 먼저 시도
      if (host === "localhost" || host === "127.0.0.1") {
        add("http://localhost:3000");
        add("http://localhost:4000");
      }
      if (host !== "code-destiny.com" && host !== "www.code-destiny.com") add("https://code-destiny.com");
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

  var TAROT_LOCAL_BASES = ["/tarot-cards/", "/public/tarot-cards/", "tarot-cards/", "public/tarot-cards/"];
  var TAROT_LOCAL_BASE = TAROT_LOCAL_BASES[0];
  var TAROT_DEFAULT_FALLBACK_IMAGE = TAROT_LOCAL_BASE + "thefool.jpeg";
  function getLocalTarotImageUrl(card) {
    if (!card) return "";
    if (card.localImageUrl) return card.localImageUrl;
    var cardId = card.cardId || card.id;
    if (!cardId) return "";
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
    var fn = map[cardId];
    return fn ? TAROT_LOCAL_BASE + fn : "";
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

  function getGuaranteedTarotImageUrl(card) {
    return getLocalTarotImageUrl(card) || TAROT_DEFAULT_FALLBACK_IMAGE;
  }

  function buildGuaranteedHealingImageList(card) {
    var primary = getGuaranteedTarotImageUrl(card);
    var list = [primary, TAROT_DEFAULT_FALLBACK_IMAGE].concat(getLocalTarotImageCandidates(card));
    var out = [];
    var seen = Object.create(null);
    list.forEach(function (raw) {
      var url = String(raw || "").trim();
      if (!url) return;
      if (!seen[url]) {
        seen[url] = true;
        out.push(url);
      }
      if (/^https?:\/\//i.test(url)) return;
      var rel = url.charAt(0) === "/" ? url.slice(1) : url;
      var abs = url.charAt(0) === "/" ? url : ("/" + url);
      if (!seen[rel]) {
        seen[rel] = true;
        out.push(rel);
      }
      if (!seen[abs]) {
        seen[abs] = true;
        out.push(abs);
      }
    });
    return out;
  }

  function applyGuaranteedHealingFrontBackground(frontEl, card) {
    if (!frontEl) return;
    var candidates = buildGuaranteedHealingImageList(card);
    if (!candidates.length) return;
    frontEl.style.backgroundImage = candidates.map(function (u) { return "url('" + u + "')"; }).join(", ");
    frontEl.style.backgroundSize = "cover";
    frontEl.style.backgroundPosition = "center";
    frontEl.style.backgroundRepeat = "no-repeat";
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
      return String(base).replace(/\/+$/, "") + (raw.charAt(0) === "/" ? raw : ("/" + raw));
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
    if (!candidates.length) {
      candidates = getTarotImageCandidates(card && card.name);
    }
    candidates = candidates.filter(Boolean).filter(function (u, i, arr) { return arr.indexOf(u) === i; });
    if (!candidates.length) return;
    var idx = 0;
    imgEl.referrerPolicy = "no-referrer";
    imgEl.decoding = "async";
    function applySunPlaceholder() {
      if (frontEl) {
        frontEl.setAttribute("data-healing-placeholder", "true");
        frontEl.style.backgroundImage = "linear-gradient(165deg, #FEF3C7 0%, #FDE68A 50%, #FDBA74 100%)";
        frontEl.style.backgroundSize = "cover";
        frontEl.style.backgroundPosition = "center";
        frontEl.classList.add("tarot-healing-image-fallback");
      }
      if (imgEl) imgEl.style.display = "none";
    }
    function applyUrl(url) {
      if (!url) return;
      if (frontEl) {
        frontEl.removeAttribute("data-healing-placeholder");
        frontEl.style.backgroundImage = "url('" + url + "')";
        frontEl.style.backgroundSize = "cover";
        frontEl.style.backgroundPosition = "center";
      }
      imgEl.src = url;
    }
    imgEl.onerror = function () {
      applySunPlaceholder();
    };
    if (candidates.length) applyUrl(candidates[0]);
    function probeNext() {
      if (idx >= candidates.length) {
        applySunPlaceholder();
        return;
      }
      var url = candidates[idx++];
      var probe = new Image();
      var done = false;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        probeNext();
      }, 1800);
      probe.onload = function () {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (frontEl) frontEl.classList.remove("tarot-healing-image-fallback");
        frontEl.removeAttribute("data-healing-placeholder");
        applyUrl(url);
      };
      probe.onerror = function () {
        if (done) return;
        done = true;
        clearTimeout(timer);
        probeNext();
      };
      probe.src = url;
    }
    probeNext();
  }

  function ensureHealingFrontImage(cardEl, card) {
    if (!cardEl) return;
    var front = cardEl.querySelector(".tarot-healing-card-front");
    var img = front ? front.querySelector(".tarot-face-img") : null;
    if (!img) return;
    if (!img.getAttribute("src") || !img.complete || !img.naturalWidth) {
      applyTarotImageWithFallback(img, front, card || null);
    }
  }

  function forceHealingFrontImage(cardEl, card) {
    if (!cardEl) return;
    var front = cardEl.querySelector(".tarot-healing-card-front");
    if (!front) return;
    var imgEl = front.querySelector(".tarot-face-img");
    applyGuaranteedHealingFrontBackground(front, card);
    if (imgEl && (!imgEl.getAttribute("src") || !imgEl.complete || !imgEl.naturalWidth)) {
      imgEl.style.display = "none";
    }
  }

  function renderHealingForcedFace(cardEl, card, idx) {
    if (!cardEl) return;
    var forcedUrl = getGuaranteedTarotImageUrl(card);
    var title = (card && (card.nameKr || card.name)) || ("Tarot Card " + (idx + 1));
    if (card && card.orientation === "reversed") title += " (역)";

    cardEl.classList.add("tarot-healing-card--forced-face");
    cardEl.style.transform = "none";
    cardEl.innerHTML = "";

    var forcedFace = document.createElement("div");
    forcedFace.className = "tarot-healing-forced-face";
    forcedFace.style.backgroundImage = "url('" + forcedUrl + "')";

    var titleEl = document.createElement("span");
    titleEl.className = "tarot-healing-forced-name";
    titleEl.textContent = title;

    forcedFace.appendChild(titleEl);
    cardEl.appendChild(forcedFace);
  }

  function prefetchHealingCardImages(cards) {
    if (!Array.isArray(cards)) return;
    cards.forEach(function (card) {
      var list = [];
      getLocalTarotImageCandidates(card).forEach(function (u) { list.push(u); });
      if (card && card.proxyImageUrl) {
        var base = getTarotApiBase();
        if (base) list.push(String(base).replace(/\/+$/, "") + card.proxyImageUrl);
        list.push(card.proxyImageUrl);
      }
      if (card && Array.isArray(card.imageCandidates)) {
        list = list.concat(card.imageCandidates);
      } else if (card && card.imageUrl) {
        list.push(card.imageUrl);
      } else if (card) {
        list = list.concat(getTarotImageCandidates(card.name));
      }
      var seen = Object.create(null);
      list.forEach(function (u) {
        var url = String(u || "").trim();
        if (!url || seen[url]) return;
        seen[url] = true;
        var probe = new Image();
        probe.decoding = "async";
        probe.referrerPolicy = "no-referrer";
        probe.src = url;
      });
    });
  }

  function openTarotHealingModal() {
    try {
      var overlay = byId("tarotHealingOverlay");
      if (!overlay) return;
      overlay.style.display = "block";
      overlay.classList.add("is-open");
      if (window._perf && window._perf.lockBody) window._perf.lockBody();
      else document.body.style.overflow = "hidden";
      bindTarotHealingStaticActions();
      resetTarotHealingFlow();
    } catch (err) {
      console.error("[Tarot Healing] openTarotHealingModal error:", err);
      try {
        document.body.style.overflow = "";
        var ov = byId("tarotHealingOverlay");
        if (ov) { ov.style.display = "none"; ov.classList.remove("is-open"); }
      } catch (e2) {}
    }
  }

  function closeTarotHealingModal() {
    try {
      var overlay = byId("tarotHealingOverlay");
      if (!overlay) return;
      overlay.style.display = "none";
      overlay.classList.remove("is-open");
      if (window._perf && window._perf.unlockBody) window._perf.unlockBody();
      else document.body.style.overflow = "";
    } catch (err) {
      console.error("[Tarot Healing] closeTarotHealingModal error:", err);
      try { document.body.style.overflow = ""; } catch (e2) {}
    }
  }

  function resetTarotHealingFlow() {
    state.cards = [];
    state.revealedCount = 0;
    state.reading = null;
    healingFlipCooldownUntil = 0;

    var intro = byId("tarotHealingIntroStage");
    var draw = byId("tarotHealingDrawStage");
    var result = byId("tarotHealingResultStage");
    if (intro) intro.classList.add("is-active");
    if (draw) draw.classList.remove("is-active");
    if (result) result.classList.remove("is-active");
    var gaugeFill = byId("tarotHealingRecoveryGaugeFill");
    if (gaugeFill) gaugeFill.classList.remove("is-filled");
    var rc = byId("tarotHealingReadingContent");
    if (rc) {
      rc.innerHTML = "";
      rc.removeAttribute("aria-busy");
    }
  }

  function startTarotHealingReading() {
    var intro = byId("tarotHealingIntroStage");
    var draw = byId("tarotHealingDrawStage");
    if (!intro || !draw) return;

    var panel = document.querySelector(".tarot-healing-panel");
    if (panel) panel.classList.add("ritual-burst");
    triggerHealingSunFlash();

    callTarotApi("draw", { spreadType: "healing_rising_four_card" })
      .then(function (data) {
        if (!data.cards || data.cards.length !== 4) throw new Error("Invalid draw");
        state.cards = data.cards;
        state.revealedCount = 0;
        prefetchHealingCardImages(state.cards);
        intro.classList.remove("is-active");
        draw.classList.add("is-active");
        renderTarotHealingCards();
        updateTarotHealingGuide();
        var btn = byId("tarotHealingFinalBtn");
        if (btn) btn.disabled = true;
        if (panel) setTimeout(function () { panel.classList.remove("ritual-burst"); }, 800);
      })
      .catch(function (err) {
        console.error("Tarot Healing draw error:", err);
        if (panel) panel.classList.remove("ritual-burst");
        alert("카드를 뽑는 중에 잠깐 문제가 생겼어요. 조금 있다가 다시 시도해 주세요. ☀️");
      });
  }

  function renderTarotHealingCards() {
    var grid = byId("tarotHealingCardGrid");
    if (!grid) return;
    grid.innerHTML = "";

    state.cards.forEach(function (card, idx) {
      var slot = document.createElement("div");
      slot.className = "tarot-healing-slot";
      slot.setAttribute("data-slot-index", idx);

      var cardEl = document.createElement("div");
      cardEl.className = "tarot-healing-card";
      cardEl.setAttribute("data-action", "flipTarotHealingCard");
      cardEl.setAttribute("data-action-args", idx);
      cardEl.setAttribute("data-revealed", "0");
      cardEl.setAttribute("role", "button");
      cardEl.setAttribute("tabindex", "0");
      bindFastTap(cardEl, function () {
        flipTarotHealingCard(idx);
      });
      cardEl.addEventListener("keydown", function (e) {
        if (!e) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          flipTarotHealingCard(idx);
        }
      });

      var back = document.createElement("div");
      back.className = "tarot-healing-card-back";

      var front = document.createElement("div");
      front.className = "tarot-healing-card-front";
      front.style.display = "none";
      front.setAttribute("data-forced-image", getGuaranteedTarotImageUrl(card));
      applyGuaranteedHealingFrontBackground(front, card);

      var img = document.createElement("img");
      img.className = "tarot-face-img";
      img.alt = card.nameKr || card.name;
      // Avoid mobile decode/network burst; prefetch runs separately.
      // Raise priority only for the next reveal target.
      img.loading = "lazy";
      img.decoding = "async";
      try {
        img.fetchPriority = idx === state.revealedCount ? "high" : "low";
      } catch (e) {}
      applyTarotImageWithFallback(img, front, card);
      front.appendChild(img);

      var nameSpan = document.createElement("span");
      nameSpan.className = "tarot-healing-card-name";
      nameSpan.textContent = card.nameKr || card.name || ("Tarot Card " + (idx + 1));
      if (card.orientation === "reversed") nameSpan.textContent += " (역)";
      front.appendChild(nameSpan);

      cardEl.appendChild(back);
      cardEl.appendChild(front);
      slot.appendChild(cardEl);
      grid.appendChild(slot);
    });
  }

  function updateTarotHealingGuide() {
    var guide = byId("tarotHealingSpreadGuide");
    if (!guide) return;
    var idx = state.revealedCount;
    if (idx >= 4) {
      guide.textContent = "🌟 네 카드 모두 열었어요! 아래 버튼을 눌러 따뜻한 이야기를 만나보세요.";
    } else {
      guide.textContent = GUIDE_LABELS[idx] || "✨ 카드를 열어 보세요.";
    }

    var grid = byId("tarotHealingCardGrid");
    if (!grid) return;
    grid.querySelectorAll(".tarot-healing-slot").forEach(function (slot) {
      var slotIdx = parseInt(slot.getAttribute("data-slot-index"), 10);
      if (slotIdx === idx) slot.classList.add("guide-next");
      else slot.classList.remove("guide-next");
    });
  }

  var healingFlipCooldownUntil = 0;
  var HEALING_FLIP_DEBOUNCE_MS = 400;

  function bindTarotHealingStaticActions() {
    var invokeBtn = document.querySelector(".tarot-healing-btn--invoke");
    if (invokeBtn && !invokeBtn.__healingInvokeBound) {
      invokeBtn.__healingInvokeBound = true;
      bindFastTap(invokeBtn, function () {
        startTarotHealingReading();
      });
    }
  }

  function bindFastTap(el, handler) {
    if (!el || typeof handler !== "function") return;
    var lastAt = 0;
    function fire(e) {
      var now = Date.now();
      if (now - lastAt < 260) return;
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

  function emitRipple(cardEl) {
    if (!cardEl) return;
    var wave = document.createElement("span");
    wave.className = "ripple-wave";
    cardEl.appendChild(wave);
    setTimeout(function () {
      if (wave && wave.parentNode) wave.parentNode.removeChild(wave);
    }, 850);
  }

  function flipTarotHealingCard(idx) {
    idx = parseInt(idx, 10);
    if (isNaN(idx) || idx < 0 || idx >= 4) return;
    if (idx !== state.revealedCount) return;

    var grid = byId("tarotHealingCardGrid");
    var cardEl = grid ? grid.querySelector('.tarot-healing-slot[data-slot-index="' + idx + '"] .tarot-healing-card') : null;
    if (!cardEl || cardEl.getAttribute("data-revealed") === "1") return;

    var now = Date.now();
    if (now < healingFlipCooldownUntil) return;
    healingFlipCooldownUntil = now + HEALING_FLIP_DEBOUNCE_MS;

    emitRipple(cardEl);
    triggerHealingSunFlash();
    cardEl.setAttribute("data-revealed", "1");
    forceHealingFrontImage(cardEl, state.cards[idx]);
    ensureHealingFrontImage(cardEl, state.cards[idx]);
    var front = cardEl.querySelector(".tarot-healing-card-front");
    if (front) front.style.display = "";
    cardEl.classList.add("flipped");
    setTimeout(function () {
      renderHealingForcedFace(cardEl, state.cards[idx], idx);
    }, 1050);

    state.revealedCount += 1;
    updateTarotHealingGuide();

    if (state.revealedCount >= 4) {
      var btn = byId("tarotHealingFinalBtn");
      if (btn) btn.disabled = false;
    }
  }

  function showTarotHealingFinalReading() {
    if (state.revealedCount < 4 || !state.cards.length) return;
    var drawnForApi = state.cards.map(function (c) {
      return { cardId: c.cardId, position: c.position, orientation: c.orientation };
    });

    var draw = byId("tarotHealingDrawStage");
    var result = byId("tarotHealingResultStage");
    var rc = byId("tarotHealingReadingContent");
    if (draw) draw.classList.remove("is-active");
    if (result) result.classList.add("is-active");
    if (rc) {
      rc.innerHTML = healingReadingSkeletonHtml();
      rc.setAttribute("aria-busy", "true");
    }
    var gaugeFill = byId("tarotHealingRecoveryGaugeFill");
    if (gaugeFill) {
      gaugeFill.classList.remove("is-filled");
      requestAnimationFrame(function () { requestAnimationFrame(function () { gaugeFill.classList.add("is-filled"); }); });
    }

    callTarotApi("reading", {
      category: "healing",
      spreadType: "healing_rising_four_card",
      cards: drawnForApi,
    })
      .then(function (data) {
        if (!data.reading) throw new Error("No reading data");
        state.reading = data.reading;
        if (rc) rc.removeAttribute("aria-busy");
        showTarotHealingTapToReveal();
      })
      .catch(function (err) {
        console.error("Tarot Healing reading error:", err);
        if (draw) draw.classList.add("is-active");
        if (result) result.classList.remove("is-active");
        if (rc) {
          rc.innerHTML = "";
          rc.removeAttribute("aria-busy");
        }
        alert("해석을 불러오는 중에 잠깐 문제가 생겼어요. 조금 있다가 다시 시도해 주세요. ☀️");
      });
  }

  var TYPING_CHAR_DELAY_MS = 32;
  var TYPING_CURSOR_CLASS = "tarot-healing-typing-cursor";
  var SECTION_BREATH_PAUSE_MS = 3400;

  function addTypingCursor(el) {
    if (!el) return;
    var cursor = document.createElement("span");
    cursor.setAttribute("aria-hidden", "true");
    cursor.className = TYPING_CURSOR_CLASS;
    cursor.textContent = "|";
    el.appendChild(cursor);
  }

  function removeTypingCursor(el) {
    if (!el) return;
    var cursor = el.querySelector("." + TYPING_CURSOR_CLASS);
    if (cursor && cursor.parentNode) cursor.parentNode.removeChild(cursor);
  }

  function typeWriter(element, text, charDelayMs, callback) {
    if (!element || text == null) {
        if (typeof callback === "function") callback();
        return;
    }
    addTypingCursor(element);
    var index = 0;
    var len = String(text).length;
    function tick() {
      if (index >= len) {
        removeTypingCursor(element);
        if (typeof callback === "function") callback();
        return;
      }
      element.insertBefore(document.createTextNode(text.charAt(index)), element.lastChild);
      index += 1;
      setTimeout(tick, charDelayMs);
    }
    tick();
  }

  function runTypingQueue(queue, charDelayMs, done) {
    var i = 0;
    var prevSection = null;
    function next() {
      if (i >= queue.length) {
        if (typeof done === "function") done();
        return;
      }
      var item = queue[i];
      i += 1;
      var section = item && item.section ? String(item.section) : "";
      var needsBreath = prevSection && section && section !== prevSection;
      prevSection = section || prevSection;
      var startTyping = function () {
        typeWriter(item.el, item.text, charDelayMs, next);
      };
      if (needsBreath) {
        setTimeout(startTyping, SECTION_BREATH_PAUSE_MS);
      } else {
        startTyping();
      }
    }
    next();
  }

  function showTarotHealingTapToReveal() {
    var container = byId("tarotHealingReadingContent");
    if (!container || !state.reading) return;
    container.innerHTML = "";
    var wrap = document.createElement("button");
    wrap.type = "button";
    wrap.className = "tarot-healing-tap-to-reveal";
    wrap.setAttribute("aria-label", "탭하면 따뜻한 이야기가 열립니다");
    wrap.innerHTML =
      "<span class=\"tarot-healing-tap-to-reveal-icon\">✨</span>" +
      "<span class=\"tarot-healing-tap-to-reveal-text\">화면을 탭하면<br>당신의 따뜻한 이야기가 열려요</span>" +
      "<span class=\"tarot-healing-tap-to-reveal-hint\">아무 곳이나 눌러 주세요</span>";
    container.appendChild(wrap);
    function onReveal() {
      wrap.removeEventListener("click", onReveal);
      wrap.removeEventListener("keydown", onRevealKey);
      triggerHealingSunFlash();
      setTimeout(function () {
        renderTarotHealingResult();
      }, 120);
    }
    function onRevealKey(e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onReveal();
      }
    }
    bindFastTap(wrap, onReveal);
    wrap.addEventListener("keydown", onRevealKey);
  }

  function renderTarotHealingResult() {
    var container = byId("tarotHealingReadingContent");
    if (!container || !state.reading) return;
    var r = state.reading;
    container.innerHTML = "";
    container.removeAttribute("aria-busy");

    var sectionClass = "tarot-healing-section tarot-healing-fade-slide-up";
    var titleClass = "tarot-healing-section-title";
    var textClass = "tarot-healing-section-text";

    var queue = [];
    var currentSection = null;
    var sectionEl = null;

    function ensureSection(title) {
      if (currentSection === title && sectionEl) return sectionEl;
      currentSection = title;
      sectionEl = document.createElement("section");
      sectionEl.className = sectionClass;
      var h4 = document.createElement("h4");
      h4.className = titleClass;
      h4.textContent = title;
      sectionEl.appendChild(h4);
      container.appendChild(sectionEl);
      return sectionEl;
    }

    function addBlock(sectionTitle, text) {
      if (!text) return;
      var sec = ensureSection(sectionTitle);
      var p = document.createElement("p");
      p.className = textClass;
      sec.appendChild(p);
      queue.push({ el: p, text: text, section: sectionTitle });
    }

    if (r.opening) addBlock("☀️ 따뜻한 인사 ✨", r.opening);
    if (r.hiddenTruth) addBlock("🔮 1. 마음 깊은 곳의 이야기", r.hiddenTruth);
    if (r.embracePain) addBlock("💫 2. 괜찮아, 그 마음 품어주기", r.embracePain);
    if (r.silverLining) addBlock("🌅 3. 빛이 비치는 곳", r.silverLining);
    if (r.stepForward) addBlock("🚀 4. 한 걸음 나아가기", r.stepForward);
    if (r.integrationMessage) addBlock("☀️ 따뜻한 마무리 🌟", r.integrationMessage);

    if (Array.isArray(r.actionPlan) && r.actionPlan.length) {
      ensureSection("🌱 오늘 해볼 만한 것 ✨");
      var ul = document.createElement("ul");
      ul.className = "tarot-healing-advice-list";
      r.actionPlan.forEach(function (item) {
        var li = document.createElement("li");
        li.className = textClass;
        ul.appendChild(li);
        queue.push({ el: li, text: item, section: "🌱 오늘 해볼 만한 것 ✨" });
      });
      sectionEl.appendChild(ul);
    }

    runTypingQueue(queue, TYPING_CHAR_DELAY_MS);
  }

  function escapeHtml(s) {
    if (!s) return "";
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function shareTarotHealingResult() {
    var r = state.reading;
    if (!r) return;
    var text = "☀ 따뜻한 태양 행복 타로 ☀\n\n";
    if (r.opening) text += "☀ " + r.opening + "\n\n";
    if (r.stepForward) text += "☀ " + r.stepForward + "\n\n";
    text += "👉 무료 타로 보러가기: https://code-destiny.com";

    if (navigator.share) {
      navigator.share({
        title: "☀ 따뜻한 태양 행복 타로",
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

  window.openTarotHealingModal = openTarotHealingModal;
  window.closeTarotHealingModal = closeTarotHealingModal;
  window.resetTarotHealingFlow = resetTarotHealingFlow;
  window.startTarotHealingReading = startTarotHealingReading;
  window.flipTarotHealingCard = flipTarotHealingCard;
  window.showTarotHealingFinalReading = showTarotHealingFinalReading;
  window.shareTarotHealingResult = shareTarotHealingResult;
})();
