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
    soundEnabled: false,
    meditationActive: false,
    meditationPhaseTimer: null,
    meditationCycleCount: 0,
  };
  var TAROT_API_TIMEOUT_MS = 12000;
  var MEDITATION_PHASES = [
    { key: "in", duration: 4000, text: "눈을 감고... 파도 소리에 집중해 보세요. 당신의 진심이 저 멀리 닿을 수 있도록, 숨을 들이쉬세요.", circleClass: "breath-in" },
    { key: "hold", duration: 4000, text: "별빛이 고요히 머무는 동안, 잠시 참으세요. 그리움도 이 순간만은 잔잔합니다.", circleClass: "breath-hold" },
    { key: "out", duration: 4000, text: "등대의 빛처럼 마음을 비우며 천천히 내쉬세요. 파도가 당신을 위로할 거예요.", circleClass: "breath-out" },
  ];
  var MEDITATION_MAX_CYCLES = 5;
  var MEDITATION_TYPING_MS = 55;
  var stateMeditationTypingId = null;

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

  var TAROT_LOCAL_BASES = ["/tarot-cards/", "/public/tarot-cards/", "tarot-cards/", "public/tarot-cards/"];
  var TAROT_LOCAL_BASE = TAROT_LOCAL_BASES[0];
  var TAROT_DEFAULT_FALLBACK_IMAGE = TAROT_LOCAL_BASE + "thefool.jpeg";
  function getLocalTarotImageUrl(card) {
    if (!card) return "";
    if (card.localImageUrl) return card.localImageUrl;
    var cardId = String(card.cardId || card.id || "").toUpperCase();
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
        frontEl.style.backgroundImage = "url('" + url + "')";
        frontEl.style.backgroundSize = "cover";
        frontEl.style.backgroundPosition = "center";
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
    var btn = byId("tarotReunionMeditationBtn");
    if (!btn) return;
    btn.removeEventListener("click", boundToggleMeditation);
    btn.addEventListener("click", boundToggleMeditation);
  }

  function boundToggleMeditation() {
    toggleTarotReunionMeditation();
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

    typewriterMeditationText(breathText, phase.text, MEDITATION_TYPING_MS);

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
    if (btn) btn.textContent = "✧ 명상 종료";
    runMeditationPhase(0, 0);
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
      invokeBtn.addEventListener("click", function (e) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        startTarotReunionReading();
      });
    }
  }

  function closeTarotReunionModal() {
    var overlay = byId("tarotReunionOverlay");
    if (state.meditationActive) stopMeditation();
    if (!overlay) return;
    overlay.style.display = "none";
    overlay.classList.remove("is-open");
    if (window._perf && window._perf.unlockBody) window._perf.unlockBody();
    else document.body.style.overflow = "";
  }

  function resetTarotReunionFlow() {
    state.cards = [];
    state.revealedCount = 0;
    state.reading = null;
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
      cardEl.addEventListener("click", function (e) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
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
      img.loading = "eager";
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
    var drawnForApi = state.cards.map(function (c) {
      return { cardId: c.cardId, position: c.position, orientation: c.orientation };
    });

    callTarotApi("reading", {
      category: "reunion",
      spreadType: "reunion_lighthouse_five_card",
      cards: drawnForApi,
    })
      .then(function (data) {
        if (!data.reading) throw new Error("No reading data");
        state.reading = data.reading;
        var draw = byId("tarotReunionDrawStage");
        var result = byId("tarotReunionResultStage");
        if (draw) draw.classList.remove("is-active");
        if (result) result.classList.add("is-active");
        renderTarotReunionResult();
      })
      .catch(function (err) {
        console.error("Tarot Reunion reading error:", err);
        alert("해석을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      });
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
      img.loading = "eager";
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
    var cardsContainer = byId("tarotReunionResultCards");
    if (!container || !state.reading) return;
    var r = state.reading;

    renderTarotReunionResultCards();

    var sections = [];
    if (r.opening) sections.push({ title: "🌌 밤바다의 서문", text: r.opening });
    if (r.pastBond) sections.push({ title: "1) 과거의 인연", text: r.pastBond });
    if (r.theirNow) sections.push({ title: "2) 상대의 현재 근황", text: r.theirNow });
    if (r.outsideFactor) sections.push({ title: "3) 주변의 방해물 또는 상황", text: r.outsideFactor });
    if (r.theirHeart) sections.push({ title: "4) 나를 향한 속마음", text: r.theirHeart });
    if (r.reunionOutcome) sections.push({ title: "5) 재회의 가능성과 결과", text: r.reunionOutcome });
    if (r.lighthouseGuidance) sections.push({ title: "🕯️ 등대의 조언", text: r.lighthouseGuidance, isGuidance: true });

    var encouraging = pickRandom(getEncouragingMessage(r));

    container.innerHTML = "";

    var typingSpeed = 28;
    var sectionDelay = 180;

    function addSection(section, isLast, onDone) {
      var sec = document.createElement("section");
      sec.className = "tarot-reunion-section" + (section.isGuidance ? " tarot-reunion-section--guidance" : "") + " tarot-reunion-section--star-sea";
      sec.innerHTML = '<h4 class="tarot-reunion-section-title">' + escapeHtml(section.title) + '</h4><p class="tarot-reunion-section-text"><span class="tarot-reunion-typing-text"></span><span class="tarot-reunion-typing-cursor"></span></p>';
      container.appendChild(sec);

      var textEl = sec.querySelector(".tarot-reunion-typing-text");
      typeText(textEl, section.text, typingSpeed, function () {
        if (sec.querySelector(".tarot-reunion-typing-cursor")) {
          sec.querySelector(".tarot-reunion-typing-cursor").style.display = "none";
        }
        if (isLast) {
          addEncouragingMessage(encouraging, onDone);
        } else {
          setTimeout(onDone, sectionDelay);
        }
      });
    }

    function addEncouragingMessage(msg, onDone) {
      var sec = document.createElement("section");
      sec.className = "tarot-reunion-section tarot-reunion-section--encouraging tarot-reunion-section--star-sea";
      sec.innerHTML = '<h4 class="tarot-reunion-section-title">✨ 별 바다의 응원</h4><p class="tarot-reunion-section-text"><span class="tarot-reunion-typing-text"></span><span class="tarot-reunion-typing-cursor"></span></p>';
      container.appendChild(sec);

      var textEl = sec.querySelector(".tarot-reunion-typing-text");
      typeText(textEl, msg, typingSpeed + 2, function () {
        if (sec.querySelector(".tarot-reunion-typing-cursor")) {
          sec.querySelector(".tarot-reunion-typing-cursor").style.display = "none";
        }
        addActionPlan(r);
        if (typeof onDone === "function") onDone();
      });
    }

    function addActionPlan(r) {
      if (!Array.isArray(r.actionPlan) || !r.actionPlan.length) return;
      var sec = document.createElement("section");
      sec.className = "tarot-reunion-section tarot-reunion-section--star-sea";
      sec.innerHTML = '<h4 class="tarot-reunion-section-title">🧭 지금 바로 할 수 있는 행동</h4><ul class="tarot-reunion-advice-list"></ul>';
      var ul = sec.querySelector("ul");
      r.actionPlan.forEach(function (item) {
        var li = document.createElement("li");
        li.textContent = item;
        ul.appendChild(li);
      });
      container.appendChild(sec);
    }

    var idx = 0;
    function next() {
      if (idx >= sections.length) return;
      var sec = sections[idx];
      var isLast = idx === sections.length - 1;
      idx += 1;
      addSection(sec, isLast, next);
    }
    next();
  }

  function escapeHtml(s) {
    if (!s) return "";
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function shareTarotReunionResult() {
    var r = state.reading;
    if (!r) return;
    var text = "🌊 [별 헤는 밤바다 재회운 타로] 🌊\n\n";
    if (r.opening) text += "🌌 " + r.opening + "\n\n";
    if (r.lighthouseGuidance) text += "🕯️ " + r.lighthouseGuidance + "\n\n";
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
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindTarotReunionStaticActions, { once: true });
  } else {
    bindTarotReunionStaticActions();
  }
})();
