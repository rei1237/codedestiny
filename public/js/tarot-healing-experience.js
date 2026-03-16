/**
 * 긍정 에너지 회복하기 (Healing & Rising) — 4-Card Spread
 * API: POST /api/tarot/draw (spreadType: healing_rising_four_card)
 *      POST /api/tarot/reading (category: healing, spreadType: healing_rising_four_card, cards)
 */
(function () {
  "use strict";

  var POSITION_LABELS = {
    hidden_truth: "1. The Hidden Truth",
    embrace_pain: "2. Embrace the Pain",
    silver_lining: "3. The Silver Lining",
    step_forward: "4. Step Forward",
  };

  var GUIDE_LABELS = [
    "첫 번째 카드: 상황이 어긋난 진짜 이유를 마주해 보세요.",
    "두 번째 카드: 내면의 상처를 인정하며 숨을 고르세요.",
    "세 번째 카드: 이 경험이 남긴 교훈을 받아들이세요.",
    "네 번째 카드: 긍정 에너지를 회복할 다음 행동을 확인하세요.",
  ];

  var state = { cards: [], revealedCount: 0, reading: null };
  var TAROT_API_TIMEOUT_MS = 12000;

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
    function applyUrl(url) {
      if (!url) return;
      if (frontEl) {
        frontEl.style.backgroundImage = "url('" + url + "')";
        frontEl.style.backgroundSize = "cover";
        frontEl.style.backgroundPosition = "center";
      }
      imgEl.src = url;
    }
    if (candidates.length) applyUrl(candidates[0]);
    function probeNext() {
      if (idx >= candidates.length) {
        if (frontEl) frontEl.classList.add("tarot-healing-image-fallback");
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
    var overlay = byId("tarotHealingOverlay");
    if (!overlay) return;
    overlay.style.display = "block";
    overlay.classList.add("is-open");
    if (window._perf && window._perf.lockBody) window._perf.lockBody();
    else document.body.style.overflow = "hidden";
    resetTarotHealingFlow();
  }

  function closeTarotHealingModal() {
    var overlay = byId("tarotHealingOverlay");
    if (!overlay) return;
    overlay.style.display = "none";
    overlay.classList.remove("is-open");
    if (window._perf && window._perf.unlockBody) window._perf.unlockBody();
    else document.body.style.overflow = "";
  }

  function resetTarotHealingFlow() {
    state.cards = [];
    state.revealedCount = 0;
    state.reading = null;

    var intro = byId("tarotHealingIntroStage");
    var draw = byId("tarotHealingDrawStage");
    var result = byId("tarotHealingResultStage");
    if (intro) intro.classList.add("is-active");
    if (draw) draw.classList.remove("is-active");
    if (result) result.classList.remove("is-active");
  }

  function startTarotHealingReading() {
    var intro = byId("tarotHealingIntroStage");
    var draw = byId("tarotHealingDrawStage");
    if (!intro || !draw) return;

    var panel = document.querySelector(".tarot-healing-panel");
    if (panel) panel.classList.add("ritual-burst");

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
        alert("카드를 뽑는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
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

      var label = document.createElement("span");
      label.className = "tarot-healing-slot-label";
      label.textContent = POSITION_LABELS[card.position] || ("Card " + (idx + 1));

      var cardEl = document.createElement("div");
      cardEl.className = "tarot-healing-card";
      cardEl.setAttribute("data-action", "flipTarotHealingCard");
      cardEl.setAttribute("data-action-args", idx);
      cardEl.setAttribute("data-revealed", "0");
      cardEl.setAttribute("role", "button");
      cardEl.setAttribute("tabindex", "0");
      cardEl.addEventListener("click", function (e) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
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
      img.loading = "eager";
      applyTarotImageWithFallback(img, front, card);
      front.appendChild(img);

      var nameSpan = document.createElement("span");
      nameSpan.className = "tarot-healing-card-name";
      nameSpan.textContent = card.nameKr || card.name || ("Tarot Card " + (idx + 1));
      if (card.orientation === "reversed") nameSpan.textContent += " (역)";
      front.appendChild(nameSpan);

      cardEl.appendChild(back);
      cardEl.appendChild(front);
      slot.appendChild(label);
      slot.appendChild(cardEl);
      grid.appendChild(slot);
    });
  }

  function updateTarotHealingGuide() {
    var guide = byId("tarotHealingSpreadGuide");
    if (!guide) return;
    var idx = state.revealedCount;
    if (idx >= 4) {
      guide.textContent = "모든 카드를 열었습니다. 아래 버튼으로 치유 스토리를 확인하세요.";
    } else {
      guide.textContent = GUIDE_LABELS[idx] || "카드를 뒤집어 주세요.";
    }

    var grid = byId("tarotHealingCardGrid");
    if (!grid) return;
    grid.querySelectorAll(".tarot-healing-slot").forEach(function (slot) {
      var slotIdx = parseInt(slot.getAttribute("data-slot-index"), 10);
      if (slotIdx === idx) slot.classList.add("guide-next");
      else slot.classList.remove("guide-next");
    });
  }

  function emitRipple(cardEl) {
    if (!cardEl) return;
    var wave = document.createElement("span");
    wave.className = "ripple-wave";
    cardEl.appendChild(wave);
    setTimeout(function () {
      if (wave && wave.parentNode) wave.parentNode.removeChild(wave);
    }, 900);
  }

  function flipTarotHealingCard(idx) {
    idx = parseInt(idx, 10);
    if (isNaN(idx) || idx < 0 || idx >= 4) return;
    if (idx !== state.revealedCount) return;

    var grid = byId("tarotHealingCardGrid");
    var cardEl = grid ? grid.querySelector('.tarot-healing-slot[data-slot-index="' + idx + '"] .tarot-healing-card') : null;
    if (!cardEl || cardEl.getAttribute("data-revealed") === "1") return;

    emitRipple(cardEl);
    cardEl.setAttribute("data-revealed", "1");
    cardEl.classList.add("flipped");
    forceHealingFrontImage(cardEl, state.cards[idx]);
    ensureHealingFrontImage(cardEl, state.cards[idx]);
    renderHealingForcedFace(cardEl, state.cards[idx], idx);

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

    callTarotApi("reading", {
      category: "healing",
      spreadType: "healing_rising_four_card",
      cards: drawnForApi,
    })
      .then(function (data) {
        if (!data.reading) throw new Error("No reading data");
        state.reading = data.reading;
        var draw = byId("tarotHealingDrawStage");
        var result = byId("tarotHealingResultStage");
        if (draw) draw.classList.remove("is-active");
        if (result) result.classList.add("is-active");
        renderTarotHealingResult();
      })
      .catch(function (err) {
        console.error("Tarot Healing reading error:", err);
        alert("해석을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      });
  }

  function renderTarotHealingResult() {
    var container = byId("tarotHealingReadingContent");
    if (!container || !state.reading) return;
    var r = state.reading;
    var html = "";

    if (r.opening) {
      html += '<section class="tarot-healing-section"><h4 class="tarot-healing-section-title">🌅 Dawn Message</h4><p class="tarot-healing-section-text">' + escapeHtml(r.opening) + "</p></section>";
    }
    if (r.hiddenTruth) {
      html += '<section class="tarot-healing-section"><h4 class="tarot-healing-section-title">1) The Hidden Truth</h4><p class="tarot-healing-section-text">' + escapeHtml(r.hiddenTruth) + "</p></section>";
    }
    if (r.embracePain) {
      html += '<section class="tarot-healing-section"><h4 class="tarot-healing-section-title">2) Embrace the Pain</h4><p class="tarot-healing-section-text">' + escapeHtml(r.embracePain) + "</p></section>";
    }
    if (r.silverLining) {
      html += '<section class="tarot-healing-section"><h4 class="tarot-healing-section-title">3) The Silver Lining</h4><p class="tarot-healing-section-text">' + escapeHtml(r.silverLining) + "</p></section>";
    }
    if (r.stepForward) {
      html += '<section class="tarot-healing-section"><h4 class="tarot-healing-section-title">4) Step Forward</h4><p class="tarot-healing-section-text">' + escapeHtml(r.stepForward) + "</p></section>";
    }
    if (r.integrationMessage) {
      html += '<section class="tarot-healing-section"><h4 class="tarot-healing-section-title">🌤 통합 메시지</h4><p class="tarot-healing-section-text">' + escapeHtml(r.integrationMessage) + "</p></section>";
    }
    if (Array.isArray(r.positionInsights) && r.positionInsights.length) {
      html += '<section class="tarot-healing-section"><h4 class="tarot-healing-section-title">🃏 포지션별 상세 해석</h4>';
      r.positionInsights.forEach(function (item) {
        html += '<div style="margin:0 0 12px;padding:10px;border-radius:10px;background:rgba(255,255,255,0.18);">';
        html += '<div style="font-weight:700;color:#5e3865;margin-bottom:4px;">' + escapeHtml(item.title || item.position) + " - " + escapeHtml(item.cardLabel || "") + "</div>";
        html += '<div class="tarot-healing-section-text">' + escapeHtml(item.message || "") + "</div>";
        if (Array.isArray(item.keywords) && item.keywords.length) {
          html += '<div style="margin-top:6px;font-size:.85rem;color:#6f4969;">키워드: ' + escapeHtml(item.keywords.join(", ")) + "</div>";
        }
        html += "</div>";
      });
      html += "</section>";
    }
    if (Array.isArray(r.actionPlan)) {
      html += '<section class="tarot-healing-section"><h4 class="tarot-healing-section-title">✨ 오늘의 회복 행동</h4><ul class="tarot-healing-advice-list">';
      r.actionPlan.forEach(function (item) {
        html += "<li>" + escapeHtml(item) + "</li>";
      });
      html += "</ul></section>";
    }

    container.innerHTML = html;
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
    var text = "🌅 [긍정 에너지 회복 타로] 🌅\n\n";
    if (r.opening) text += "🕊️ " + r.opening + "\n\n";
    if (r.stepForward) text += "🚀 " + r.stepForward + "\n\n";
    text += "👉 무료 타로 보러가기: https://code-destiny.com";

    if (navigator.share) {
      navigator.share({
        title: "🌅 긍정 에너지 회복 타로",
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
