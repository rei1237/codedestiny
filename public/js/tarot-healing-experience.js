/**
 * 긍정 에너지 회복하기 (Healing & Rising) — 4-Card Spread
 * API: POST /api/tarot/draw (spreadType: healing_rising_four_card)
 *      POST /api/tarot/reading (category: healing, spreadType: healing_rising_four_card, cards)
 *
 * 무결성 원칙:
 * - 외부에서 호출되는 전역 함수 이름/동작은 그대로 유지한다.
 * - 사주/점술 로직 및 API 요청 구조는 변경하지 않는다.
 */

/* NOTE:
 * This file must run as a classic script (non-module) because it is lazy-loaded
 * via dynamic <script> injection in `public/js/core/uiBindings.js`.
 * If this file contains ESM `import`/`export`, browsers will throw:
 * "Cannot use import statement outside a module" and the whole tarot flow breaks.
 */

(function () {
  "use strict";

  var TAROT_API_TIMEOUT_MS = 12000;

  function normalizeApiBase(raw) {
    return String(raw || "").trim().replace(/\/+$/, "");
  }

  function getRuntimeEnvApiBase() {
    try {
      if (typeof process !== "undefined" && process && process.env) {
        var envBase =
          process.env.NEXT_PUBLIC_API_BASE_URL ||
          process.env.CLOUDFLARE_API_BASE_URL ||
          process.env.API_BASE_URL;
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
        fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body, cache: "no-store" }),
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
        if (error && error.name === "AbortError") throw new Error("Tarot API timeout");
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
      var requestDebug = { endpoint: endpoint, base: base || "(relative)", url: url, payload: payload || {} };
      return postJsonWithTimeout(url, body)
        .then(function (res) {
          if (!res.ok) {
            return res
              .text()
              .catch(function () {
                return "";
              })
              .then(function (rawBody) {
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
            throw createTarotApiError("Invalid API response", { endpoint: endpoint, base: base || "", url: url, responseData: data });
          }
          return data;
        })
        .catch(function (error) {
          logTarotApiError("request_failed", requestDebug, error);
          throw error;
        });
    }

    function tryNext() {
      if (index >= bases.length) throw lastError || new Error("Tarot API request failed");
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
      logTarotApiError("all_candidates_failed", { endpoint: endpoint, baseCandidates: bases }, error);
      throw error;
    });
  }

  function tarotProxyImageUrl(card) {
    var cardId = card && (card.cardId || card.id);
    if (!cardId) return "";
    // Project-linked free tarot source via proxy API (policy-compliant).
    return "/api/tarot/card-image/" + encodeURIComponent(String(cardId));
  }

  function getGuaranteedTarotImageUrl(card) {
    return tarotProxyImageUrl(card) || "/api/tarot/card-image/M00";
  }

  function buildGuaranteedHealingImageList(card) {
    var primary = getGuaranteedTarotImageUrl(card);
    var out = [];
    var seen = Object.create(null);
    [primary, "/api/tarot/card-image/M00"].forEach(function (raw) {
      var url = String(raw || "").trim();
      if (!url) return;
      if (!seen[url]) {
        seen[url] = true;
        out.push(url);
      }
    });
    return out;
  }

  function applyGuaranteedHealingFrontBackground(frontEl, card) {
    if (!frontEl) return;
    var candidates = buildGuaranteedHealingImageList(card);
    if (!candidates.length) return;
    frontEl.style.backgroundImage = candidates.map(function (u) {
      return "url('" + u + "')";
    }).join(", ");
    frontEl.style.backgroundSize = "cover";
    frontEl.style.backgroundPosition = "center";
    frontEl.style.backgroundRepeat = "no-repeat";
  }

  function applyTarotImageWithFallback(imgEl, frontEl, card) {
    if (!imgEl) return;
    var url = getGuaranteedTarotImageUrl(card);
    imgEl.referrerPolicy = "no-referrer";
    imgEl.decoding = "async";
    imgEl.onerror = function () {
      if (frontEl) {
        frontEl.setAttribute("data-healing-placeholder", "true");
        frontEl.style.backgroundImage = "linear-gradient(165deg, #FEF3C7 0%, #FDE68A 50%, #FDBA74 100%)";
        frontEl.style.backgroundSize = "cover";
        frontEl.style.backgroundPosition = "center";
        frontEl.classList.add("tarot-healing-image-fallback");
      }
      try {
        imgEl.style.display = "none";
      } catch (e) {}
    };
    if (frontEl) {
      frontEl.removeAttribute("data-healing-placeholder");
      frontEl.classList.remove("tarot-healing-image-fallback");
      frontEl.style.backgroundImage = "url('" + url + "')";
      frontEl.style.backgroundSize = "cover";
      frontEl.style.backgroundPosition = "center";
    }
    imgEl.src = url;
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

  function prefetchHealingCardImages(cards) {
    if (!Array.isArray(cards)) return;
    cards.forEach(function (card) {
      var url = getGuaranteedTarotImageUrl(card);
      if (!url) return;
      var probe = new Image();
      probe.decoding = "async";
      probe.referrerPolicy = "no-referrer";
      probe.src = url;
    });
  }

const GUIDE_LABELS = [
  "🌱 첫 번째 카드: 조금 지쳤을 수도 있겠어요. 이 카드가 그 마음을 조금씩 풀어줄 거예요.",
  "💫 두 번째 카드: 깊게 숨 쉬어 보세요. 내면의 빛이 당신을 감싸줄 거예요.",
  "🌅 세 번째 카드: 거의 다 왔어요! 이 경험이 선물한 것을 따뜻하게 받아보세요.",
  "☀️ 네 번째 카드: 마지막이에요! 햇살처럼 밝은 다음 걸음을 확인해 보세요. ✨",
];

const state = { cards: [], revealedCount: 0, reading: null };

function byId(id) {
  return document.getElementById(id);
}

let healingFlipCooldownUntil = 0;
const HEALING_FLIP_DEBOUNCE_MS = 400;

function resetTarotHealingFlow() {
  state.cards = [];
  state.revealedCount = 0;
  state.reading = null;
  healingFlipCooldownUntil = 0;

  const intro = byId("tarotHealingIntroStage");
  const draw = byId("tarotHealingDrawStage");
  const result = byId("tarotHealingResultStage");
  if (intro) intro.classList.add("is-active");
  if (draw) draw.classList.remove("is-active");
  if (result) result.classList.remove("is-active");
  const gaugeFill = byId("tarotHealingRecoveryGaugeFill");
  if (gaugeFill) gaugeFill.classList.remove("is-filled");
}

function openTarotHealingModal() {
  try {
    const overlay = byId("tarotHealingOverlay");
    if (!overlay) return;
    overlay.style.display = "block";
    overlay.classList.add("is-open");
    if (window._perf && window._perf.lockBody) window._perf.lockBody();
    else document.body.style.overflow = "hidden";
    resetTarotHealingFlow();
  } catch (err) {
    console.error("[Tarot Healing] openTarotHealingModal error:", err);
    try {
      document.body.style.overflow = "";
      const ov = byId("tarotHealingOverlay");
      if (ov) {
        ov.style.display = "none";
        ov.classList.remove("is-open");
      }
    } catch {}
  }
}

function closeTarotHealingModal() {
  try {
    const overlay = byId("tarotHealingOverlay");
    if (!overlay) return;
    overlay.style.display = "none";
    overlay.classList.remove("is-open");
    if (window._perf && window._perf.unlockBody) window._perf.unlockBody();
    else document.body.style.overflow = "";
  } catch (err) {
    console.error("[Tarot Healing] closeTarotHealingModal error:", err);
    try {
      document.body.style.overflow = "";
    } catch {}
  }
}

function startTarotHealingReading() {
  const intro = byId("tarotHealingIntroStage");
  const draw = byId("tarotHealingDrawStage");
  if (!intro || !draw) return;

  const panel = document.querySelector(".tarot-healing-panel");
  if (panel) panel.classList.add("ritual-burst");

  callTarotApi("draw", { spreadType: "healing_rising_four_card" })
    .then((data) => {
      if (!data.cards || data.cards.length !== 4) throw new Error("Invalid draw");
      state.cards = data.cards;
      state.revealedCount = 0;
      prefetchHealingCardImages(state.cards);
      intro.classList.remove("is-active");
      draw.classList.add("is-active");
      renderTarotHealingCards();
      updateTarotHealingGuide();
      const btn = byId("tarotHealingFinalBtn");
      if (btn) btn.disabled = true;
      if (panel) setTimeout(() => panel.classList.remove("ritual-burst"), 800);
    })
    .catch((err) => {
      console.error("Tarot Healing draw error:", err);
      if (panel) panel.classList.remove("ritual-burst");
      alert("카드를 뽑는 중에 잠깐 문제가 생겼어요. 조금 있다가 다시 시도해 주세요. ☀️");
    });
}

function renderTarotHealingCards() {
  const grid = byId("tarotHealingCardGrid");
  if (!grid) return;
  grid.innerHTML = "";

  state.cards.forEach((card, idx) => {
    const slot = document.createElement("div");
    slot.className = "tarot-healing-slot";
    slot.setAttribute("data-slot-index", String(idx));

    const cardEl = document.createElement("div");
    cardEl.className = "tarot-healing-card";
    cardEl.setAttribute("data-action", "flipTarotHealingCard");
    cardEl.setAttribute("data-action-args", String(idx));
    cardEl.setAttribute("data-revealed", "0");
    cardEl.setAttribute("role", "button");
    cardEl.setAttribute("tabindex", "0");
    cardEl.addEventListener("click", (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      flipTarotHealingCard(idx);
    });
    cardEl.addEventListener("keydown", (e) => {
      if (!e) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        flipTarotHealingCard(idx);
      }
    });

    const back = document.createElement("div");
    back.className = "tarot-healing-card-back";

    const front = document.createElement("div");
    front.className = "tarot-healing-card-front";
    front.style.display = "none";
    front.setAttribute("data-forced-image", getGuaranteedTarotImageUrl(card));
    applyGuaranteedHealingFrontBackground(front, card);

    const img = document.createElement("img");
    img.className = "tarot-face-img";
    img.alt = card.nameKr || card.name;
    img.loading = "lazy";
    img.decoding = "async";
    try {
      img.fetchPriority = idx === state.revealedCount ? "high" : "low";
    } catch {}
    applyTarotImageWithFallback(img, front, card);
    front.appendChild(img);

    const nameSpan = document.createElement("span");
    nameSpan.className = "tarot-healing-card-name";
    nameSpan.textContent = card.nameKr || card.name || `Tarot Card ${idx + 1}`;
    if (card.orientation === "reversed") nameSpan.textContent += " (역)";
    front.appendChild(nameSpan);

    cardEl.appendChild(back);
    cardEl.appendChild(front);
    slot.appendChild(cardEl);
    grid.appendChild(slot);
  });
}

function updateTarotHealingGuide() {
  const guide = byId("tarotHealingSpreadGuide");
  if (!guide) return;
  const idx = state.revealedCount;
  if (idx >= 4) {
    guide.textContent = "🌟 네 카드 모두 열었어요! 아래 버튼을 눌러 따뜻한 이야기를 만나보세요.";
  } else {
    guide.textContent = GUIDE_LABELS[idx] || "✨ 카드를 열어 보세요.";
  }

  const grid = byId("tarotHealingCardGrid");
  if (!grid) return;
  grid.querySelectorAll(".tarot-healing-slot").forEach((slot) => {
    const slotIdx = parseInt(slot.getAttribute("data-slot-index"), 10);
    if (slotIdx === idx) slot.classList.add("guide-next");
    else slot.classList.remove("guide-next");
  });
}

function emitRipple(cardEl) {
  if (!cardEl) return;
  const wave = document.createElement("span");
  wave.className = "ripple-wave";
  cardEl.appendChild(wave);
  setTimeout(() => {
    if (wave && wave.parentNode) wave.parentNode.removeChild(wave);
  }, 850);
}

function renderHealingForcedFace(cardEl, card, idx) {
  if (!cardEl) return;
  const forcedUrl = getGuaranteedTarotImageUrl(card);
  let title = (card && (card.nameKr || card.name)) || `Tarot Card ${idx + 1}`;
  if (card && card.orientation === "reversed") title += " (역)";

  cardEl.classList.add("tarot-healing-card--forced-face");
  cardEl.style.transform = "none";
  cardEl.innerHTML = "";

  const forcedFace = document.createElement("div");
  forcedFace.className = "tarot-healing-forced-face";
  forcedFace.style.backgroundImage = `url('${forcedUrl}')`;

  const titleEl = document.createElement("span");
  titleEl.className = "tarot-healing-forced-name";
  titleEl.textContent = title;

  forcedFace.appendChild(titleEl);
  cardEl.appendChild(forcedFace);
}

function flipTarotHealingCard(idx) {
  idx = parseInt(String(idx), 10);
  if (Number.isNaN(idx) || idx < 0 || idx >= 4) return;
  if (idx !== state.revealedCount) return;

  const grid = byId("tarotHealingCardGrid");
  const cardEl = grid
    ? grid.querySelector(`.tarot-healing-slot[data-slot-index="${idx}"] .tarot-healing-card`)
    : null;
  if (!cardEl || cardEl.getAttribute("data-revealed") === "1") return;

  const now = Date.now();
  if (now < healingFlipCooldownUntil) return;
  healingFlipCooldownUntil = now + HEALING_FLIP_DEBOUNCE_MS;

  emitRipple(cardEl);
  cardEl.setAttribute("data-revealed", "1");
  forceHealingFrontImage(cardEl, state.cards[idx]);
  ensureHealingFrontImage(cardEl, state.cards[idx]);
  const front = cardEl.querySelector(".tarot-healing-card-front");
  if (front) front.style.display = "";
  cardEl.classList.add("flipped");
  setTimeout(() => {
    renderHealingForcedFace(cardEl, state.cards[idx], idx);
  }, 1050);

  state.revealedCount += 1;
  updateTarotHealingGuide();

  if (state.revealedCount >= 4) {
    const btn = byId("tarotHealingFinalBtn");
    if (btn) btn.disabled = false;
  }
}

function showTarotHealingFinalReading() {
  if (state.revealedCount < 4 || !state.cards.length) return;
  const drawnForApi = state.cards.map((c) => ({
    cardId: c.cardId,
    position: c.position,
    orientation: c.orientation,
  }));

  callTarotApi("reading", {
    category: "healing",
    spreadType: "healing_rising_four_card",
    cards: drawnForApi,
  })
    .then((data) => {
      if (!data.reading) throw new Error("No reading data");
      state.reading = data.reading;
      const draw = byId("tarotHealingDrawStage");
      const result = byId("tarotHealingResultStage");
      if (draw) draw.classList.remove("is-active");
      if (result) result.classList.add("is-active");
      const gaugeFill = byId("tarotHealingRecoveryGaugeFill");
      if (gaugeFill) {
        gaugeFill.classList.remove("is-filled");
        // force reflow to restart animation
        gaugeFill.offsetHeight;
        gaugeFill.classList.add("is-filled");
      }
      showTarotHealingTapToReveal();
    })
    .catch((err) => {
      console.error("Tarot Healing reading error:", err);
      alert("해석을 불러오는 중에 잠깐 문제가 생겼어요. 조금 있다가 다시 시도해 주세요. ☀️");
    });
}

const TYPING_CHAR_DELAY_MS = 32;
const TYPING_CURSOR_CLASS = "tarot-healing-typing-cursor";

function addTypingCursor(el) {
  if (!el) return;
  const cursor = document.createElement("span");
  cursor.setAttribute("aria-hidden", "true");
  cursor.className = TYPING_CURSOR_CLASS;
  cursor.textContent = "|";
  el.appendChild(cursor);
}

function removeTypingCursor(el) {
  if (!el) return;
  const cursor = el.querySelector(`.${TYPING_CURSOR_CLASS}`);
  if (cursor && cursor.parentNode) cursor.parentNode.removeChild(cursor);
}

function typeWriter(element, text, charDelayMs, callback) {
  if (!element || text == null) {
    if (typeof callback === "function") callback();
    return;
  }
  addTypingCursor(element);
  let index = 0;
  const len = String(text).length;
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
  let i = 0;
  function next() {
    if (i >= queue.length) {
      if (typeof done === "function") done();
      return;
    }
    const item = queue[i];
    i += 1;
    typeWriter(item.el, item.text, charDelayMs, next);
  }
  next();
}

function showTarotHealingTapToReveal() {
  const container = byId("tarotHealingReadingContent");
  if (!container || !state.reading) return;
  container.innerHTML = "";
  const wrap = document.createElement("button");
  wrap.type = "button";
  wrap.className = "tarot-healing-tap-to-reveal";
  wrap.setAttribute("aria-label", "탭하면 따뜻한 이야기가 열립니다");
  wrap.innerHTML =
    '<span class="tarot-healing-tap-to-reveal-icon">✨</span>' +
    '<span class="tarot-healing-tap-to-reveal-text">화면을 탭하면<br>당신의 따뜻한 이야기가 열려요</span>' +
    '<span class="tarot-healing-tap-to-reveal-hint">아무 곳이나 눌러 주세요</span>';
  container.appendChild(wrap);
  function onReveal() {
    wrap.removeEventListener("click", onReveal);
    wrap.removeEventListener("keydown", onRevealKey);
    renderTarotHealingResult();
  }
  function onRevealKey(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onReveal();
    }
  }
  wrap.addEventListener("click", onReveal);
  wrap.addEventListener("keydown", onRevealKey);
}

function renderTarotHealingResult() {
  const container = byId("tarotHealingReadingContent");
  if (!container || !state.reading) return;
  const r = state.reading;
  container.innerHTML = "";

  const sectionClass = "tarot-healing-section tarot-healing-fade-slide-up";
  const titleClass = "tarot-healing-section-title";
  const textClass = "tarot-healing-section-text";

  const queue = [];
  let currentSection = null;
  let sectionEl = null;

  function ensureSection(title) {
    if (currentSection === title && sectionEl) return sectionEl;
    currentSection = title;
    sectionEl = document.createElement("section");
    sectionEl.className = sectionClass;
    const h4 = document.createElement("h4");
    h4.className = titleClass;
    h4.textContent = title;
    sectionEl.appendChild(h4);
    container.appendChild(sectionEl);
    return sectionEl;
  }

  function addBlock(sectionTitle, text) {
    if (!text) return;
    const sec = ensureSection(sectionTitle);
    const p = document.createElement("p");
    p.className = textClass;
    sec.appendChild(p);
    queue.push({ el: p, text });
  }

  if (r.opening) addBlock("☀️ 따뜻한 인사 ✨", r.opening);
  if (r.hiddenTruth) addBlock("🔮 1. 마음 깊은 곳의 이야기", r.hiddenTruth);
  if (r.embracePain) addBlock("💫 2. 괜찮아, 그 마음 품어주기", r.embracePain);
  if (r.silverLining) addBlock("🌅 3. 빛이 비치는 곳", r.silverLining);
  if (r.stepForward) addBlock("🚀 4. 한 걸음 나아가기", r.stepForward);
  if (r.integrationMessage) addBlock("☀️ 따뜻한 마무리 🌟", r.integrationMessage);

  if (Array.isArray(r.actionPlan) && r.actionPlan.length) {
    ensureSection("🌱 오늘 해볼 만한 것 ✨");
    const ul = document.createElement("ul");
    ul.className = "tarot-healing-advice-list";
    r.actionPlan.forEach((item) => {
      const li = document.createElement("li");
      li.className = textClass;
      ul.appendChild(li);
      queue.push({ el: li, text: item });
    });
    sectionEl.appendChild(ul);
  }

  runTypingQueue(queue, TYPING_CHAR_DELAY_MS);
}

function shareTarotHealingResult() {
  const r = state.reading;
  if (!r) return;
  let text = "☀ 따뜻한 태양 행복 타로 ☀\n\n";
  if (r.opening) text += `☀ ${r.opening}\n\n`;
  if (r.stepForward) text += `☀ ${r.stepForward}\n\n`;
  text += "👉 무료 타로 보러가기: https://code-destiny.com";

  if (navigator.share) {
    navigator
      .share({
        title: "☀ 따뜻한 태양 행복 타로",
        text,
        url: "https://code-destiny.com",
      })
      .catch(() => {});
    return;
  }

  const encoded = encodeURIComponent(text);
  const a = document.createElement("a");
  a.href = `kakaotalk://send?text=${encoded}`;
  a.click();
  setTimeout(() => {
    if (typeof window.copyToClipboard === "function") {
      window.copyToClipboard(text, "카카오톡 앱이 없거나 PC에서는 클립보드에 복사했어요! 💬");
    }
  }, 800);
}

// Legacy globals (must keep) for data-action bindings in index.html
window.openTarotHealingModal = openTarotHealingModal;
window.closeTarotHealingModal = closeTarotHealingModal;
window.resetTarotHealingFlow = resetTarotHealingFlow;
window.startTarotHealingReading = startTarotHealingReading;
window.flipTarotHealingCard = flipTarotHealingCard;
window.showTarotHealingFinalReading = showTarotHealingFinalReading;
window.shareTarotHealingResult = shareTarotHealingResult;

})();
