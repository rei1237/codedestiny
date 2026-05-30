/**
 * 타로로 성장하는 자존감! — 5-Card Level-Up Quest Spread
 * API: POST /api/tarot/draw (spreadType: self_esteem_levelup_five_card)
 *      POST /api/tarot/reading (category: general, spreadType: self_esteem_levelup_five_card, cards)
 */
(function () {
  "use strict";

  var POSITION_LABELS = {
    past_debuff: "내가 남의 눈치를 살피게 된 이유",
    inner_monster: "왜 나는 거절을 어려워 할까",
    current_damage: "눈치 보는 습관이 내게 주는 피해",
    mind_shield: "타인의 실망을 견뎌내는 방법",
    levelup_mastery: "내 마음을 1순위로 챙기는 방법",
  };

  var POSITION_ORDER = ["past_debuff", "inner_monster", "current_damage", "mind_shield", "levelup_mastery"];

  var GUIDE_LABELS = [
    "첫 번째 카드를 뒤집어 주세요.",
    "두 번째 카드를 뒤집어 주세요.",
    "세 번째 카드를 뒤집어 주세요.",
    "네 번째 카드를 뒤집어 주세요.",
    "다섯 번째 카드를 뒤집어 주세요.",
  ];

  /* Client-side fallback deck (78 cards) when API is unavailable */
  var FALLBACK_DECK = (function () {
    var majors = [
      ["M00", "The Fool", "바보"], ["M01", "The Magician", "마법사"], ["M02", "The High Priestess", "여사제"],
      ["M03", "The Empress", "여황제"], ["M04", "The Emperor", "황제"], ["M05", "The Hierophant", "교황"],
      ["M06", "The Lovers", "연인"], ["M07", "The Chariot", "전차"], ["M08", "Strength", "힘"],
      ["M09", "The Hermit", "은둔자"], ["M10", "Wheel of Fortune", "운명의 수레바퀴"], ["M11", "Justice", "정의"],
      ["M12", "The Hanged Man", "매달린 사람"], ["M13", "Death", "죽음"], ["M14", "Temperance", "절제"],
      ["M15", "The Devil", "악마"], ["M16", "The Tower", "탑"], ["M17", "The Star", "별"],
      ["M18", "The Moon", "달"], ["M19", "The Sun", "태양"], ["M20", "Judgement", "심판"], ["M21", "The World", "세계"],
    ];
    var suits = ["Wands", "Cups", "Swords", "Pentacles"];
    var suitPrefix = { Wands: "W", Cups: "C", Swords: "S", Pentacles: "P" };
    var ranks = ["Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Page", "Knight", "Queen", "King"];
    var rankKr = ["에이스", "2", "3", "4", "5", "6", "7", "8", "9", "10", "페이지", "기사", "퀸", "킹"];
    var suitKr = { Wands: "완드", Cups: "컵", Swords: "소드", Pentacles: "펜타클" };
    var out = majors.map(function (m) { return { id: m[0], name: m[1], nameKr: m[2] }; });
    suits.forEach(function (suit) {
      ranks.forEach(function (rank, i) {
        var id = suitPrefix[suit] + String(i + 1).padStart(2, "0");
        out.push({ id: id, name: rank + " of " + suit, nameKr: suitKr[suit] + " " + rankKr[i] });
      });
    });
    return out;
  })();

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
    var cdnCandidates = getTarotImageCandidates(card && card.name);
    cdnCandidates.forEach(function (u) {
      pushCandidateVariants(candidates, u);
    });
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
      /* img만 사용 — backgroundImage와 중복 설정 시 카드가 겹쳐 보이는 현상 방지 */
      if (frontEl) {
        frontEl.style.backgroundImage = "";
        frontEl.style.backgroundSize = "";
        frontEl.style.backgroundPosition = "";
      }
      imgEl.onerror = tryNext;
      imgEl.src = url;
    }
    tryNext();
  }

  function ensureSelfEsteemFrontImage(cardEl, card) {
    if (!cardEl) return;
    var front = cardEl.querySelector(".tarot-self-esteem-card-front");
    var img = front ? front.querySelector(".tarot-self-esteem-face-img") : null;
    if (!img) return;
    if (!img.getAttribute("src") || !img.complete || !img.naturalWidth) {
      applyTarotImageWithFallback(img, front, card || null);
    }
  }

  function prefetchCardImages(cards) {
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

  function openTarotSelfEsteemModal() {
    var overlay = byId("tarotSelfEsteemOverlay");
    if (!overlay) return;
    overlay.style.display = "block";
    overlay.classList.add("is-open");
    if (window._perf && window._perf.lockBody) window._perf.lockBody();
    else document.body.style.overflow = "hidden";
    resetTarotSelfEsteemFlow();
  }

  function closeTarotSelfEsteemModal() {
    var overlay = byId("tarotSelfEsteemOverlay");
    if (!overlay) return;
    overlay.style.display = "none";
    overlay.classList.remove("is-open");
    if (window._perf && window._perf.unlockBody) window._perf.unlockBody();
    else document.body.style.overflow = "";
  }

  function resetTarotSelfEsteemFlow() {
    state.cards = [];
    state.revealedCount = 0;
    state.reading = null;

    var intro = byId("tarotSelfEsteemIntroStage");
    var draw = byId("tarotSelfEsteemDrawStage");
    var result = byId("tarotSelfEsteemResultStage");
    var levelUpBanner = byId("tarotSelfEsteemLevelUpBanner");
    if (intro) intro.classList.add("is-active");
    if (draw) draw.classList.remove("is-active");
    if (result) result.classList.remove("is-active");
    if (levelUpBanner) levelUpBanner.classList.remove("is-visible");
    updateExpBar(0);
  }

  function updateExpBar(percent) {
    var pct = Math.min(100, Math.max(0, percent));
    var bar = byId("tarotSelfEsteemExpBar");
    if (bar) bar.style.width = pct + "%";
    var label = byId("tarotSelfEsteemExpPercent");
    if (label) label.textContent = Math.round(pct) + "%";
  }

  function triggerLevelUpConfetti() {
    var container = byId("tarotSelfEsteemConfetti");
    if (!container) return;
    var colors = ["#FFD700", "#FF8C00", "#4FC3F7", "#FF6B9D", "#B388FF"];
    for (var i = 0; i < 60; i++) {
      var p = document.createElement("span");
      p.className = "self-esteem-confetti-piece";
      p.style.left = Math.random() * 100 + "%";
      p.style.animationDelay = Math.random() * 0.5 + "s";
      p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      p.style.transform = "rotate(" + (Math.random() * 360) + "deg)";
      container.appendChild(p);
      setTimeout(function (el) {
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }, 3500, p);
    }
  }

  function drawFallbackCards() {
    var deck = FALLBACK_DECK.slice();
    for (var i = deck.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = deck[i];
      deck[i] = deck[j];
      deck[j] = t;
    }
    return POSITION_ORDER.map(function (pos, idx) {
      var c = deck[idx];
      var rev = Math.random() < 0.35;
      return {
        cardId: c.id,
        id: c.id,
        name: c.name,
        nameKr: c.nameKr,
        position: pos,
        orientation: rev ? "reversed" : "upright",
      };
    });
  }

  function applyCardsAndShowDrawStage(cards) {
    var intro = byId("tarotSelfEsteemIntroStage");
    var draw = byId("tarotSelfEsteemDrawStage");
    var panel = document.querySelector(".tarot-self-esteem-panel");
    if (!intro || !draw) return;
    state.cards = cards;
    state.revealedCount = 0;
    prefetchCardImages(state.cards);
    intro.classList.remove("is-active");
    draw.classList.add("is-active");
    renderTarotSelfEsteemCards();
    updateTarotSelfEsteemGuide();
    updateExpBar(0);
    var btn = byId("tarotSelfEsteemFinalBtn");
    if (btn) btn.disabled = true;
    if (panel) setTimeout(function () { panel.classList.remove("ritual-burst"); }, 800);
  }

  function startTarotSelfEsteemReading() {
    var intro = byId("tarotSelfEsteemIntroStage");
    var draw = byId("tarotSelfEsteemDrawStage");
    if (!intro || !draw) return;

    var panel = document.querySelector(".tarot-self-esteem-panel");
    if (panel) panel.classList.add("ritual-burst");

    callTarotApi("draw", { spreadType: "self_esteem_levelup_five_card" })
      .then(function (data) {
        if (!data.cards || data.cards.length !== 5) throw new Error("Invalid draw");
        applyCardsAndShowDrawStage(data.cards);
      })
      .catch(function (err) {
        console.warn("Tarot Self-Esteem API fallback:", err);
        if (panel) panel.classList.remove("ritual-burst");
        var fallback = drawFallbackCards();
        applyCardsAndShowDrawStage(fallback);
      });
  }

  function renderTarotSelfEsteemCards() {
    var grid = byId("tarotSelfEsteemCardGrid");
    if (!grid) return;
    grid.innerHTML = "";

    state.cards.forEach(function (card, idx) {
      var slot = document.createElement("div");
      slot.className = "tarot-self-esteem-slot";
      slot.setAttribute("data-slot-index", idx);

      var label = document.createElement("span");
      label.className = "tarot-self-esteem-slot-label";
      label.textContent = POSITION_LABELS[card.position] || ("Card " + (idx + 1));

      var cardEl = document.createElement("div");
      cardEl.className = "tarot-self-esteem-card";
      cardEl.setAttribute("data-action", "flipTarotSelfEsteemCard");
      cardEl.setAttribute("data-action-args", idx);
      cardEl.setAttribute("data-revealed", "0");
      cardEl.setAttribute("data-slot-num", String(idx + 1));

      var back = document.createElement("div");
      back.className = "tarot-self-esteem-card-back";
      back.setAttribute("data-back-num", String(idx + 1));

      var front = document.createElement("div");
      front.className = "tarot-self-esteem-card-front";
      if (card.orientation === "reversed") front.setAttribute("data-reversed", "1");

      var img = document.createElement("img");
      img.className = "tarot-self-esteem-face-img";
      img.alt = card.nameKr || card.name;
      img.loading = "lazy";
      img.decoding = "async";
      try {
        img.fetchPriority = idx === state.revealedCount ? "high" : "low";
      } catch (e) {}
      applyTarotImageWithFallback(img, front, card);
      front.appendChild(img);

      var nameSpan = document.createElement("span");
      nameSpan.className = "tarot-self-esteem-card-name";
      nameSpan.textContent = card.nameKr || card.name;
      if (card.orientation === "reversed") nameSpan.textContent += " (역)";
      front.appendChild(nameSpan);

      cardEl.appendChild(back);
      cardEl.appendChild(front);
      slot.appendChild(cardEl);
      slot.appendChild(label);
      grid.appendChild(slot);
    });
  }

  function updateTarotSelfEsteemGuide() {
    var guide = byId("tarotSelfEsteemSpreadGuide");
    if (!guide) return;
    var idx = state.revealedCount;
    if (idx >= 5) {
      guide.textContent = "모든 카드를 열었습니다! Level Up! 🎉";
    } else {
      guide.textContent = GUIDE_LABELS[idx] || "카드를 뒤집어 주세요.";
    }

    var grid = byId("tarotSelfEsteemCardGrid");
    if (!grid) return;
    grid.querySelectorAll(".tarot-self-esteem-slot").forEach(function (slot) {
      var slotIdx = parseInt(slot.getAttribute("data-slot-index"), 10);
      if (slotIdx === idx) slot.classList.add("guide-next");
      else slot.classList.remove("guide-next");
    });
  }

  function emitRipple(cardEl) {
    if (!cardEl) return;
    var wave = document.createElement("span");
    wave.className = "self-esteem-ripple-wave";
    cardEl.appendChild(wave);
    setTimeout(function () {
      if (wave && wave.parentNode) wave.parentNode.removeChild(wave);
    }, 900);
  }

  function flipTarotSelfEsteemCard(idx) {
    idx = parseInt(idx, 10);
    if (isNaN(idx) || idx < 0 || idx >= 5) return;
    if (idx !== state.revealedCount) return;

    var grid = byId("tarotSelfEsteemCardGrid");
    var cardEl = grid ? grid.querySelector('.tarot-self-esteem-slot[data-slot-index="' + idx + '"] .tarot-self-esteem-card') : null;
    if (!cardEl || cardEl.getAttribute("data-revealed") === "1") return;

    emitRipple(cardEl);
    cardEl.setAttribute("data-revealed", "1");
    cardEl.classList.add("flipped");
    cardEl.style.pointerEvents = "none";

    var slot = cardEl.closest(".tarot-self-esteem-slot");
    if (slot) slot.classList.add("has-flipped");

    ensureSelfEsteemFrontImage(cardEl, state.cards[idx]);

    state.revealedCount += 1;
    updateExpBar((state.revealedCount / 5) * 100);
    updateTarotSelfEsteemGuide();

    if (state.revealedCount >= 5) {
      var btn = byId("tarotSelfEsteemFinalBtn");
      if (btn) btn.disabled = false;
      // LEVEL UP 배너는 결과 화면에서 글을 다 읽고 스크롤 끝까지 내렸을 때 표시됨 (여기서는 표시하지 않음)
    }
  }

  function getClientInterpretation(card, orientation, category) {
    var nameKr = card.nameKr || card.name || "해당 카드";
    var placeholders = {
      upright: {
        general: nameKr + " 정방향은 흐름이 자연스럽게 열리는 시점임을 보여줍니다.",
        love: nameKr + " 정방향은 감정 표현과 신뢰 회복이 관계 개선의 열쇠임을 시사합니다.",
        money: nameKr + " 정방향은 현실적인 계획과 실행이 재정 흐름을 안정화한다고 말합니다.",
        career: nameKr + " 정방향은 역할 집중과 꾸준한 실행이 성과로 이어짐을 나타냅니다.",
      },
      reversed: {
        general: nameKr + " 역방향은 지연과 오해를 줄이기 위한 점검이 필요함을 보여줍니다.",
        love: nameKr + " 역방향은 서운함 누적을 막기 위해 소통의 방식 조정이 필요함을 시사합니다.",
        money: nameKr + " 역방향은 충동적 판단보다 리스크 관리가 우선임을 나타냅니다.",
        career: nameKr + " 역방향은 프로세스 재정비와 우선순위 조정이 먼저임을 말합니다.",
      },
    };
    var ori = orientation === "reversed" ? "reversed" : "upright";
    return (placeholders[ori] && placeholders[ori][category]) || placeholders[ori].general || placeholders.upright.general;
  }

  function buildProfessionalPositionMessage(pos, card, baseText) {
    var cardName = (card && (card.nameKr || card.name)) || "해당 카드";
    var orientation = card && card.orientation === "reversed" ? "reversed" : "upright";
    var base = String(baseText || "").trim();
    if (!base) base = getClientInterpretation({ nameKr: cardName }, orientation, "general");
    var orientationTone = orientation === "reversed"
      ? "지금은 속도를 늦추고 경계를 재정비하는 편이 좋습니다."
      : "지금 흐름을 일상 루틴에 연결하면 회복 속도가 빨라집니다.";
    // 질문에 직접 답하는 상담 톤: 이유/방법이 문맥상 매칭되도록
    var answerByPos = {
      past_debuff: "당신이 남의 눈치를 살피게 된 이유는 " + base + " 과거의 그 반응은 당신의 결함이 아니라 당시의 생존 전략이었어요. 이제는 그 전략을 존중하되, 현재의 나에게 맞는 방식으로 바꿀 수 있는 시점입니다. " + orientationTone,
      inner_monster: "거절을 어려워하게 된 이유는 " + base + " 거절 불안은 대개 관계가 끊어질까 봐의 공포와 연결돼요. 이 감정을 부정하지 않고 이름 붙이는 순간, 통제 가능한 정보로 바뀝니다. " + orientationTone,
      current_damage: "눈치 보는 습관이 지금 당신에게 주는 피해는 " + base + " 먼저 회복할 권리를 인정하는 것이 중요해요. 에너지가 돌아와야 경계 설정도 오래 유지됩니다. " + orientationTone,
      mind_shield: "타인의 실망을 견뎌내는 방법은 " + base + " 타인의 감정과 내 책임을 분리하는 연습이 필요해요. 설명은 하되, 나를 소진시키는 과잉 설득은 멈추는 것이 좋습니다. " + orientationTone,
      levelup_mastery: "내 마음을 1순위로 챙기는 방법은 " + base + " 자존감은 한 번에 완성되는 게 아니라, 작은 선택을 반복하는 습관으로 안정됩니다. " + orientationTone,
    };
    return (answerByPos[pos] || (cardName + (orientation === "reversed" ? " (역)" : "") + " 카드가 전하는 메시지: " + base + " " + orientationTone));
  }

  function buildFallbackReading() {
    var r = {
      opening: "타로로 성장하는 자존감! 5장의 카드가 당신의 내면을 단계별로 점검하고 성장의 빛을 찾아갑니다. 어두운 터널을 지나 빛을 만나는 여정처럼, 5장의 카드가 당신의 자존감 레벨업 로드맵을 그려드립니다.",
      pastDebuff: "",
      innerMonster: "",
      currentDamage: "",
      mindShield: "",
      levelupMastery: "",
      positionInsights: [],
    };
    state.cards.forEach(function (c) {
      var label = POSITION_LABELS[c.position] || "";
      var cardLabel = (c.nameKr || c.name) + (c.orientation === "reversed" ? " (역)" : "");
      var interp = getClientInterpretation(c, c.orientation || "upright", "general");
      var msg = buildProfessionalPositionMessage(c.position, c, interp);
      r.positionInsights.push({ title: label, cardLabel: cardLabel, subtitle: label, message: msg, keywords: [] });
      if (c.position === "past_debuff") r.pastDebuff = msg;
      else if (c.position === "inner_monster") r.innerMonster = msg;
      else if (c.position === "current_damage") r.currentDamage = msg;
      else if (c.position === "mind_shield") r.mindShield = msg;
      else if (c.position === "levelup_mastery") r.levelupMastery = msg;
    });
    r.levelupGuidance = "✨ Level Up! 5장의 카드를 모두 열었습니다. 당신의 자존감은 이미 한 단계 올라갔어요. 이제 이 통찰을 실천으로 옮겨, 매일 작은 레벨업을 누적해 보세요.";
    r.actionPlan = ["오늘 하루 'NO'라고 말해도 괜찮은 상황 한 가지를 찾아 실행해 보세요.", "타인의 시선 대신 '내가 진짜 원하는 것'을 한 문장으로 적어보세요.", "눈치 보느라 참았던 감정이 있다면, 안전한 사람에게 한 번 말해 보세요.", "매일 아침 거울을 보며 '나는 충분히 가치 있어'라고 3번 말해 보세요.", "이 리딩에서 가장 마음에 와닿은 카드 한 장의 메시지를 메모해 두고, 힘들 때 꺼내 읽어 보세요."];
    return r;
  }

  function normalizeSelfEsteemReadingPayload(reading, cards) {
    var src = reading || {};
    if (
      src.pastDebuff ||
      src.innerMonster ||
      src.currentDamage ||
      src.mindShield ||
      src.levelupMastery ||
      (Array.isArray(src.positionInsights) && src.positionInsights.length)
    ) {
      return src;
    }

    var byPos = Object.create(null);
    (Array.isArray(cards) ? cards : []).forEach(function (c) {
      if (c && c.position) byPos[c.position] = c;
    });

    var narratives = Array.isArray(src.cardNarratives) ? src.cardNarratives : [];
    var titleMap = {
      past_debuff: POSITION_LABELS.past_debuff,
      inner_monster: POSITION_LABELS.inner_monster,
      current_damage: POSITION_LABELS.current_damage,
      mind_shield: POSITION_LABELS.mind_shield,
      levelup_mastery: POSITION_LABELS.levelup_mastery,
    };

    var out = {
      opening: src.story || "5장의 카드가 당신의 자존감 레벨업 여정을 안내합니다.",
      pastDebuff: "",
      innerMonster: "",
      currentDamage: "",
      mindShield: "",
      levelupMastery: "",
      levelupGuidance: src.advice || "",
      positionInsights: [],
      actionPlan: [],
    };

    narratives.forEach(function (n) {
      var pos = n && n.position;
      if (!pos || !titleMap[pos]) return;
      var c = byPos[pos] || {};
      var cardLabel = (c.nameKr || c.name || n.cardId || "") + (c.orientation === "reversed" ? " (역)" : "");
      var msg = buildProfessionalPositionMessage(pos, c, String((n && n.interpretation) || "").trim());
      if (!msg) return;
      out.positionInsights.push({
        position: pos,
        title: titleMap[pos],
        subtitle: titleMap[pos],
        cardLabel: cardLabel,
        message: msg,
        keywords: [],
      });
      if (pos === "past_debuff") out.pastDebuff = msg;
      else if (pos === "inner_monster") out.innerMonster = msg;
      else if (pos === "current_damage") out.currentDamage = msg;
      else if (pos === "mind_shield") out.mindShield = msg;
      else if (pos === "levelup_mastery") out.levelupMastery = msg;
    });

    if (!out.positionInsights.length && !out.levelupGuidance && !out.opening) {
      return buildFallbackReading();
    }
    if (!out.levelupGuidance) {
      out.levelupGuidance = "카드 메시지를 한 줄씩 실천으로 옮기면 자존감이 안정적으로 성장합니다.";
    }
    if (!out.actionPlan.length) {
      out.actionPlan = ["오늘 하루 한 가지, 나를 위한 선택을 하기", "타인의 기대보다 내 감정을 먼저 확인하기"];
    }
    return out;
  }

  function showTarotSelfEsteemFinalReading() {
    if (state.revealedCount < 5 || !state.cards.length) return;
    var drawnForApi = state.cards.map(function (c) {
      return { cardId: c.cardId || c.id, position: c.position, orientation: c.orientation };
    });

    callTarotApi("reading", {
      category: "general",
      spreadType: "self_esteem_levelup_five_card",
      cards: drawnForApi,
    })
      .then(function (data) {
        if (!data.reading) throw new Error("No reading data");
        state.reading = normalizeSelfEsteemReadingPayload(data.reading, state.cards);
        var draw = byId("tarotSelfEsteemDrawStage");
        var result = byId("tarotSelfEsteemResultStage");
        if (draw) draw.classList.remove("is-active");
        if (result) result.classList.add("is-active");
        renderTarotSelfEsteemResult();
      })
      .catch(function (err) {
        console.warn("Tarot Self-Esteem reading fallback:", err);
        state.reading = buildFallbackReading();
        var draw = byId("tarotSelfEsteemDrawStage");
        var result = byId("tarotSelfEsteemResultStage");
        if (draw) draw.classList.remove("is-active");
        if (result) result.classList.add("is-active");
        renderTarotSelfEsteemResult();
      });
  }

  function escapeHtml(s) {
    if (!s) return "";
    var div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function typeWriter(el, text, options, callback) {
    if (!el || text == null) {
          if (typeof callback === "function") callback();
          return;
        }
    var speed = (options && options.speed) != null ? options.speed : 22;
    var idx = 0;
    var str = String(text);
    el.textContent = "";
    function tick() {
      if (idx >= str.length) {
        if (typeof callback === "function") callback();
        return;
      }
      idx += 1;
      el.textContent = str.slice(0, idx);
      setTimeout(tick, speed);
    }
    tick();
  }

  function runTypingSequence(container, sections, index, onComplete) {
    if (!container || !Array.isArray(sections) || index >= sections.length) {
      if (typeof onComplete === "function") onComplete();
      return;
    }
    var item = sections[index];
    var section = document.createElement("section");
    section.className = item.highlight ? "tarot-self-esteem-section tarot-self-esteem-section--highlight" : "tarot-self-esteem-section";
    var title = document.createElement("h4");
    title.className = "tarot-self-esteem-section-title";
    title.textContent = item.title;
    section.appendChild(title);
    if (item.listItems) {
      var ul = document.createElement("ul");
      ul.className = "tarot-self-esteem-advice-list";
      section.appendChild(ul);
      container.appendChild(section);
      var listIdx = 0;
      function addNextLi() {
        if (listIdx >= item.listItems.length) {
          var scrollEl = container;
          if (scrollEl && scrollEl.scrollHeight > scrollEl.clientHeight) {
            scrollEl.scrollTop = scrollEl.scrollHeight - scrollEl.clientHeight;
          }
          runTypingSequence(container, sections, index + 1, onComplete);
          return;
        }
        var li = document.createElement("li");
        li.textContent = "";
        ul.appendChild(li);
        typeWriter(li, item.listItems[listIdx], { speed: 18 }, function () {
          listIdx += 1;
          addNextLi();
        });
      }
      addNextLi();
    } else {
      var p = document.createElement("p");
      p.className = "tarot-self-esteem-section-text";
      section.appendChild(p);
      container.appendChild(section);
      var scrollEl = container;
      if (scrollEl && scrollEl.scrollHeight > scrollEl.clientHeight) {
        scrollEl.scrollTop = scrollEl.scrollHeight - scrollEl.clientHeight;
      }
      typeWriter(p, item.text, { speed: 20 }, function () {
        runTypingSequence(container, sections, index + 1, onComplete);
      });
    }
  }

  function attachLevelUpOnScroll(container) {
    var banner = byId("tarotSelfEsteemLevelUpBanner");
    var levelUpShown = false;
    var ticking = false;
    function checkScroll() {
      if (levelUpShown || !container) return;
      var st = container.scrollTop;
      var ch = container.clientHeight;
      var sh = container.scrollHeight;
      if (sh <= ch || st + ch >= sh - 40) {
        levelUpShown = true;
        if (banner) {
          banner.classList.add("is-visible");
          banner.setAttribute("aria-hidden", "false");
        }
        triggerLevelUpConfetti();
      }
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        checkScroll();
      });
    }
    container.addEventListener("scroll", onScroll, { passive: true });
    checkScroll();
  }

  function buildResultSections(r) {
    var sections = [];
    if (r.opening) {
      sections.push({ title: "✨ 오프닝 메시지", text: r.opening });
    }
    if (r.pastDebuff) sections.push({ title: "1. " + POSITION_LABELS.past_debuff, text: r.pastDebuff });
    if (r.innerMonster) sections.push({ title: "2. " + POSITION_LABELS.inner_monster, text: r.innerMonster });
    if (r.currentDamage) sections.push({ title: "3. " + POSITION_LABELS.current_damage, text: r.currentDamage });
    if (r.mindShield) sections.push({ title: "4. " + POSITION_LABELS.mind_shield, text: r.mindShield });
    if (r.levelupMastery) sections.push({ title: "5. " + POSITION_LABELS.levelup_mastery, text: r.levelupMastery });
    if (r.levelupGuidance) {
      sections.push({ title: "🎮 Level Up 가이드", text: r.levelupGuidance, highlight: true });
    }
    if (Array.isArray(r.actionPlan) && r.actionPlan.length) {
      sections.push({ title: "⚔️ 오늘의 레벨업 퀘스트", listItems: r.actionPlan });
    }
    return sections;
  }

  function renderTarotSelfEsteemResult() {
    var container = byId("tarotSelfEsteemReadingContent");
    if (!container || !state.reading) return;
    var r = state.reading;

    if (!r.opening && !r.pastDebuff && (!Array.isArray(r.positionInsights) || !r.positionInsights.length)) {
      state.reading = buildFallbackReading();
      r = state.reading;
    }

    container.innerHTML = "";

    var insightMap = Object.create(null);
    if (Array.isArray(r.positionInsights)) {
      r.positionInsights.forEach(function (item) {
        if (item && item.position) insightMap[item.position] = item;
      });
    }

    var ICONS = {
      past_debuff: "🌑",
      inner_monster: "👁",
      current_damage: "⚡",
      mind_shield: "🛡",
      levelup_mastery: "✨"
    };

    // Opening banner
    if (r.opening) {
      var openDiv = document.createElement("div");
      openDiv.className = "tse-opening";
      var openIcon = document.createElement("span");
      openIcon.className = "tse-opening-icon";
      openIcon.textContent = "✨";
      var openP = document.createElement("p");
      openP.className = "tse-opening-text";
      openP.textContent = r.opening;
      openDiv.appendChild(openIcon);
      openDiv.appendChild(openP);
      container.appendChild(openDiv);
    }

    if (r.topSummary && typeof r.topSummary === "object") {
      var ts = r.topSummary;
      var summaryCard = document.createElement("div");
      summaryCard.className = "tse-levelup-card";
      summaryCard.innerHTML =
        '<p class="tse-levelup-title">🧭 상단 요약</p>' +
        '<p class="tse-levelup-body"><strong>5장 흐름:</strong> ' + escapeHtml(String(ts.flow || "")) + '</p>' +
        '<ul class="tse-levelup-list">' +
        '  <li class="tse-levelup-item"><strong>핵심 패턴:</strong> ' + escapeHtml(String(ts.corePattern || "")) + '</li>' +
        '  <li class="tse-levelup-item"><strong>회복 키워드:</strong> ' + escapeHtml(Array.isArray(ts.recoveryKeywords) ? ts.recoveryKeywords.join(" | ") : "") + '</li>' +
        '  <li class="tse-levelup-item"><strong>주의할 자동 사고:</strong> ' + escapeHtml(String(ts.cognitiveTrap || "")) + '</li>' +
        '  <li class="tse-levelup-item"><strong>오늘의 대표 회복 액션:</strong> ' + escapeHtml(String(ts.representativeAction || "")) + '</li>' +
        '</ul>';
      container.appendChild(summaryCard);
    }

    // Per-position insight cards
    var positions = [
      { pos: "past_debuff",     num: "1", text: r.pastDebuff,     label: POSITION_LABELS.past_debuff },
      { pos: "inner_monster",   num: "2", text: r.innerMonster,   label: POSITION_LABELS.inner_monster },
      { pos: "current_damage",  num: "3", text: r.currentDamage,  label: POSITION_LABELS.current_damage },
      { pos: "mind_shield",     num: "4", text: r.mindShield,     label: POSITION_LABELS.mind_shield },
      { pos: "levelup_mastery", num: "5", text: r.levelupMastery, label: POSITION_LABELS.levelup_mastery }
    ];

    positions.forEach(function (item, idx) {
      if (!item.text) return;
      var card = null;
      (state.cards || []).forEach(function (c) { if (c.position === item.pos) card = c; });
      var cardName = card ? ((card.nameKr || card.name) + (card.orientation === "reversed" ? " (역)" : "")) : "";
      var extra = insightMap[item.pos] || {};
      var keywords = Array.isArray(extra.keywords) ? extra.keywords.slice(0, 3) : [];
      var actionStep = String(extra.actionStep || "").trim();
      var todayAction = String(extra.todayAction || actionStep || "").trim();
      var orientationText = String(extra.orientation === "reversed" ? "역방향" : (extra.orientation === "upright" ? "정방향" : "")).trim();
      var cardMeaning = String(extra.cardMeaning || item.text || "").trim();
      var patternAnalysis = String(extra.patternAnalysis || "").trim();
      var selfEsteemImpact = String(extra.selfEsteemImpact || "").trim();
      var recoveryAdvice = String(extra.recoveryAdvice || "").trim();
      var caution = String(extra.caution || "").trim();
      var question = String(extra.question || "").trim();
      var cardNameKo = String(extra.cardNameKo || cardName || "").trim();
      var cardNameEn = String(extra.cardNameEn || "").trim();

      var insightCard = document.createElement("div");
      insightCard.className = "tse-insight-card";
      insightCard.setAttribute("data-pos", item.pos);
      insightCard.style.animationDelay = (idx * 0.08) + "s";

      var header = document.createElement("div");
      header.className = "tse-card-header";

      var badge = document.createElement("span");
      badge.className = "tse-card-badge";
      badge.textContent = item.num;

      var icon = document.createElement("span");
      icon.className = "tse-card-icon";
      icon.textContent = String(extra.icon || ICONS[item.pos] || "✦");

      var meta = document.createElement("div");
      meta.className = "tse-card-meta";

      var posLabel = document.createElement("span");
      posLabel.className = "tse-card-position";
      posLabel.textContent = item.label;
      meta.appendChild(posLabel);

      if (cardName) {
        var nameEl = document.createElement("span");
        nameEl.className = "tse-card-name";
        nameEl.textContent = cardName;
        meta.appendChild(nameEl);
      }

      header.appendChild(badge);
      header.appendChild(icon);
      header.appendChild(meta);
      insightCard.appendChild(header);

      var intro = document.createElement("p");
      intro.className = "tse-card-body";
      intro.innerHTML =
        (question ? "<strong>질문:</strong> " + escapeHtml(question) + "<br>" : "") +
        ((cardNameKo || cardNameEn) ? "<strong>카드:</strong> " + escapeHtml(cardNameKo + (cardNameEn ? (" (" + cardNameEn + ")") : "")) + "<br>" : "") +
        (orientationText ? "<strong>방향:</strong> " + escapeHtml(orientationText) : "");
      if (intro.innerHTML) insightCard.appendChild(intro);

      var meaning = document.createElement("p");
      meaning.className = "tse-card-body";
      meaning.innerHTML = "<strong>카드 의미:</strong> " + escapeHtml(cardMeaning);
      insightCard.appendChild(meaning);

      [
        { label: "상처의 패턴", value: patternAnalysis },
        { label: "무너지는 지점", value: selfEsteemImpact },
        { label: "회복 처방", value: recoveryAdvice },
        { label: "자동 사고 경보", value: caution },
      ].forEach(function (field) {
        if (!field.value) return;
        var p = document.createElement("p");
        p.className = "tse-card-body";
        p.innerHTML = "<strong>" + escapeHtml(field.label) + ":</strong> " + escapeHtml(field.value);
        insightCard.appendChild(p);
      });

      if (keywords.length) {
        var keywordWrap = document.createElement("div");
        keywordWrap.className = "tse-card-keywords";
        keywords.forEach(function (kw) {
          var chip = document.createElement("span");
          chip.className = "tse-keyword";
          chip.textContent = "#" + kw;
          keywordWrap.appendChild(chip);
        });
        insightCard.appendChild(keywordWrap);
      }

      if (todayAction) {
        var action = document.createElement("p");
        action.className = "tse-card-action";
        action.textContent = "오늘의 회복 실천: " + todayAction;
        insightCard.appendChild(action);
      }

      container.appendChild(insightCard);
    });

    // Level Up Guidance
    if (r.levelupGuidance) {
      var lvCard = document.createElement("div");
      lvCard.className = "tse-levelup-card";
      var lvTitle = document.createElement("p");
      lvTitle.className = "tse-levelup-title";
      lvTitle.textContent = "🎮 Level Up 가이드";
      var lvBody = document.createElement("p");
      lvBody.className = "tse-levelup-body";
      lvBody.textContent = r.levelupGuidance;
      lvCard.appendChild(lvTitle);
      lvCard.appendChild(lvBody);

      var guide = r.levelupGuide || {};
      var guideLines = [];
      if (guide.summaryPattern) guideLines.push("반복 패턴: " + guide.summaryPattern);
      if (guide.rootCause) guideLines.push("상처의 뿌리: " + guide.rootCause);
      if (guide.drainArea) guideLines.push("소모되는 지점: " + guide.drainArea);
      if (guide.recoveryPoint) guideLines.push("핵심 회복 포인트: " + guide.recoveryPoint);
      if (guide.longTermStandard) guideLines.push("세워야 할 기준: " + guide.longTermStandard);
      if (guide.caution) guideLines.push("자동 사고 경보: " + guide.caution);
      if (guide.practice) guideLines.push("오늘의 연습 문장: " + guide.practice);
      if (Array.isArray(guide.mission) && guide.mission.length) {
        guide.mission.forEach(function (line) {
          guideLines.push(line);
        });
      }
      if (guideLines.length) {
        var guideList = document.createElement("ul");
        guideList.className = "tse-levelup-list";
        guideLines.forEach(function (line) {
          var li = document.createElement("li");
          li.className = "tse-levelup-item";
          li.textContent = line;
          guideList.appendChild(li);
        });
        lvCard.appendChild(guideList);
      }

      container.appendChild(lvCard);
    }

    // Action Quest Plan
    if (Array.isArray(r.levelupQuests) && r.levelupQuests.length) {
      var questCard = document.createElement("div");
      questCard.className = "tse-action-card";
      var questTitle = document.createElement("p");
      questTitle.className = "tse-action-title";
      questTitle.textContent = "⚔️ 오늘의 레벨업 퀘스트";
      var questUl = document.createElement("ul");
      questUl.className = "tse-quest-list";
      r.levelupQuests.slice(0, 3).forEach(function (quest, i) {
        var li = document.createElement("li");
        li.className = "tse-quest-item";
        li.innerHTML =
          '<span class="tse-quest-num">' + String(i + 1) + '</span>' +
          '<span><strong>' + escapeHtml(String(quest.title || "퀘스트")) + '</strong>' +
          '<br><small>난이도: ' + escapeHtml(String(quest.difficulty || "normal")) + '</small>' +
          '<br><small>목적: ' + escapeHtml(String(quest.purpose || "")) + '</small>' +
          '<br><small>행동: ' + escapeHtml(String(quest.action || "")) + '</small>' +
          '<br><small>완료 확인: ' + escapeHtml(String(quest.completionCheck || "")) + '</small></span>';
        questUl.appendChild(li);
      });
      questCard.appendChild(questTitle);
      questCard.appendChild(questUl);
      container.appendChild(questCard);
    } else if (Array.isArray(r.actionPlan) && r.actionPlan.length) {
      var actionCard = document.createElement("div");
      actionCard.className = "tse-action-card";
      var actionTitle = document.createElement("p");
      actionTitle.className = "tse-action-title";
      actionTitle.textContent = "⚔️ 오늘의 레벨업 퀘스트";
      var ul = document.createElement("ul");
      ul.className = "tse-quest-list";
      r.actionPlan.forEach(function (itemText, i) {
        var li = document.createElement("li");
        li.className = "tse-quest-item";
        var num = document.createElement("span");
        num.className = "tse-quest-num";
        num.textContent = String(i + 1);
        var text = document.createElement("span");
        text.textContent = itemText;
        li.appendChild(num);
        li.appendChild(text);
        ul.appendChild(li);
      });
      actionCard.appendChild(actionTitle);
      actionCard.appendChild(ul);
      container.appendChild(actionCard);
    }

    attachLevelUpOnScroll(container);
  }

  function shareTarotSelfEsteemResult() {
    var r = state.reading;
    if (!r) return;
    var text = "✨ [타로로 성장하는 자존감!] ✨\n\n";
    if (r.opening) text += "🕊️ " + r.opening + "\n\n";
    if (r.levelupMastery) text += "🎮 " + r.levelupMastery + "\n\n";
    text += "👉 무료 타로 보러가기: https://code-destiny.com";

    if (navigator.share) {
      navigator.share({
        title: "✨ 타로로 성장하는 자존감!",
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

  window.openTarotSelfEsteemModal = openTarotSelfEsteemModal;
  window.closeTarotSelfEsteemModal = closeTarotSelfEsteemModal;
  window.resetTarotSelfEsteemFlow = resetTarotSelfEsteemFlow;
  window.startTarotSelfEsteemReading = startTarotSelfEsteemReading;
  window.flipTarotSelfEsteemCard = flipTarotSelfEsteemCard;
  window.showTarotSelfEsteemFinalReading = showTarotSelfEsteemFinalReading;
  window.shareTarotSelfEsteemResult = shareTarotSelfEsteemResult;
})();
