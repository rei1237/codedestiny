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
      if (host === "localhost" || host === "127.0.0.1") return "http://localhost:4000";
      if (host === "api.code-destiny.com") return location.origin || "";
      if (host.endsWith(".pages.dev")) return "https://api.code-destiny.com";
    }
    return "https://api.code-destiny.com";
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

    add(getRuntimeEnvApiBase());
    add(getTarotApiBase());

    if (typeof window !== "undefined") {
      var origin = String(location.origin || "").replace(/\/+$/, "");
      var host = String(location.hostname || "").toLowerCase();
      var sameOriginApiHosts = host === "localhost" || host === "127.0.0.1" || host === "api.code-destiny.com";
      if (sameOriginApiHosts) {
        add("");
        if (origin) add(origin);
      }
      if (host === "localhost" || host === "127.0.0.1") add("http://localhost:4000");
      if (host !== "api.code-destiny.com") add("https://api.code-destiny.com");
    } else {
      add("");
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
      front.style.display = "none";
      if (card.orientation === "reversed") front.setAttribute("data-reversed", "1");

      var img = document.createElement("img");
      img.className = "tarot-self-esteem-face-img";
      img.alt = card.nameKr || card.name;
      img.loading = "eager";
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

    var back = cardEl.querySelector(".tarot-self-esteem-card-back");
    var front = cardEl.querySelector(".tarot-self-esteem-card-front");
    ensureSelfEsteemFrontImage(cardEl, state.cards[idx]);
    if (back) back.style.display = "none";
    if (front) front.style.display = "flex";

    state.revealedCount += 1;
    updateExpBar((state.revealedCount / 5) * 100);
    updateTarotSelfEsteemGuide();

    if (state.revealedCount >= 5) {
      var btn = byId("tarotSelfEsteemFinalBtn");
      if (btn) btn.disabled = false;
      var banner = byId("tarotSelfEsteemLevelUpBanner");
      if (banner) banner.classList.add("is-visible");
      triggerLevelUpConfetti();
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
    var label = POSITION_LABELS[pos] || "이 포지션";
    var cardName = (card && (card.nameKr || card.name)) || "해당 카드";
    var orientation = card && card.orientation === "reversed" ? "reversed" : "upright";
    var tone = orientation === "reversed"
      ? "지금은 속도를 조금 늦추고 경계를 다시 세우는 것이 핵심입니다."
      : "지금의 흐름을 잘 활용하면 관계와 자기존중이 함께 안정됩니다.";
    var coachingByPos = {
      past_debuff: "과거의 패턴은 당신의 잘못이 아니라 생존 전략이었습니다. 이제는 같은 전략을 계속 쓸지, 새로운 전략으로 교체할지 선택할 시점입니다.",
      inner_monster: "거절이 두렵다는 감정은 '관계 단절'에 대한 불안을 숨기고 있는 경우가 많습니다. 감정을 인정하는 순간 통제권이 다시 당신에게 돌아옵니다.",
      current_damage: "지금 가장 중요한 것은 자신을 몰아붙이는 해석이 아니라, 에너지를 회복시키는 해석입니다. 회복이 먼저 되어야 변화가 오래갑니다.",
      mind_shield: "타인의 실망을 모두 책임지지 않는 연습이 필요합니다. '설명은 하되, 설득은 하지 않는다'는 기준이 당신을 지켜줍니다.",
      levelup_mastery: "자존감은 단번에 완성되는 성취가 아니라 반복 훈련으로 안정되는 근육입니다. 작은 경계 설정이 큰 전환을 만듭니다.",
    };
    var base = String(baseText || "").trim();
    if (!base) {
      base = getClientInterpretation({ nameKr: cardName }, orientation, "general");
    }
    return (
      cardName + (orientation === "reversed" ? " (역)" : "") + " 카드는 '" + label + "'에 대해 이렇게 말합니다. " +
      base + " " +
      (coachingByPos[pos] || "지금 필요한 것은 타인의 기대보다 자신의 감정 신호를 먼저 확인하는 습관입니다.") +
      " " + tone
    );
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
    var posWrappers = {
      past_debuff: { prefix: "과거에 당신이 타인의 시선에 갇혀 있던 진짜 이유를 비춥니다.", suffix: "이 카드는 '왜 나는 그렇게 행동했을까'에 대한 답을 담고 있으며, 비난이 아닌 이해의 시선으로 받아들이면 해제의 열쇠가 됩니다." },
      inner_monster: { prefix: "왜 당신이 거절을 두려워했는지, 극복해야 할 내면의 몬스터를 보여줍니다.", suffix: "이 카드는 '나를 가로막는 것'의 정체를 드러내며, 이름을 붙이는 것만으로도 그 힘이 약해짐을 알려줍니다." },
      current_damage: { prefix: "눈치 보는 습관이 깎아먹은 당신의 HP와 MP, 즉 현재 입고 있는 데미지를 말합니다.", suffix: "이 카드는 지금의 에너지 소모를 직시하라고 말하며, 무리하지 말고 회복할 시간을 갖는 것이 다음 레벨로 가는 필수 조건임을 전합니다." },
      mind_shield: { prefix: "타인의 실망을 가볍게 튕겨내는 마인드 쉴드, 새로운 방어 스킬 획득을 상징합니다!", suffix: "이 카드는 '나를 1순위로 챙기는 것'이 이기적이 아니라 건강한 선택임을 확인해 줍니다." },
      levelup_mastery: { prefix: "내 마음을 1순위로 챙기는 레벨업 마스터리, 최종 보상 및 각성을 의미합니다.", suffix: "이 카드는 5장의 여정을 마무리하며, 'Level Up!'의 축하 메시지를 전합니다. 당신은 이미 충분히 성장했고, 앞으로도 계속 성장할 준비가 되어 있습니다." },
    };
    state.cards.forEach(function (c) {
      var label = POSITION_LABELS[c.position] || "";
      var cardLabel = (c.nameKr || c.name) + (c.orientation === "reversed" ? " (역)" : "");
      var interp = getClientInterpretation(c, c.orientation || "upright", "general");
      var wrap = posWrappers[c.position];
      var msg = buildProfessionalPositionMessage(c.position, c, interp);
      if (wrap) msg = cardLabel + "는 " + wrap.prefix + " " + msg + " " + wrap.suffix;
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

  function renderTarotSelfEsteemResult() {
    var container = byId("tarotSelfEsteemReadingContent");
    if (!container || !state.reading) return;
    var r = state.reading;
    var html = "";

    if (r.opening) {
      html += '<section class="tarot-self-esteem-section"><h4 class="tarot-self-esteem-section-title">✨ 오프닝 메시지</h4><p class="tarot-self-esteem-section-text">' + escapeHtml(r.opening) + "</p></section>";
    }
    if (r.pastDebuff) {
      html += '<section class="tarot-self-esteem-section"><h4 class="tarot-self-esteem-section-title">1. ' + escapeHtml(POSITION_LABELS.past_debuff) + "</h4><p class=\"tarot-self-esteem-section-text\">" + escapeHtml(r.pastDebuff) + "</p></section>";
    }
    if (r.innerMonster) {
      html += '<section class="tarot-self-esteem-section"><h4 class="tarot-self-esteem-section-title">2. ' + escapeHtml(POSITION_LABELS.inner_monster) + "</h4><p class=\"tarot-self-esteem-section-text\">" + escapeHtml(r.innerMonster) + "</p></section>";
    }
    if (r.currentDamage) {
      html += '<section class="tarot-self-esteem-section"><h4 class="tarot-self-esteem-section-title">3. ' + escapeHtml(POSITION_LABELS.current_damage) + "</h4><p class=\"tarot-self-esteem-section-text\">" + escapeHtml(r.currentDamage) + "</p></section>";
    }
    if (r.mindShield) {
      html += '<section class="tarot-self-esteem-section"><h4 class="tarot-self-esteem-section-title">4. ' + escapeHtml(POSITION_LABELS.mind_shield) + "</h4><p class=\"tarot-self-esteem-section-text\">" + escapeHtml(r.mindShield) + "</p></section>";
    }
    if (r.levelupMastery) {
      html += '<section class="tarot-self-esteem-section"><h4 class="tarot-self-esteem-section-title">5. ' + escapeHtml(POSITION_LABELS.levelup_mastery) + "</h4><p class=\"tarot-self-esteem-section-text\">" + escapeHtml(r.levelupMastery) + "</p></section>";
    }
    if (r.levelupGuidance) {
      html += '<section class="tarot-self-esteem-section tarot-self-esteem-section--highlight"><h4 class="tarot-self-esteem-section-title">🎮 Level Up 가이드</h4><p class="tarot-self-esteem-section-text">' + escapeHtml(r.levelupGuidance) + "</p></section>";
    }
    if (Array.isArray(r.positionInsights) && r.positionInsights.length) {
      html += '<section class="tarot-self-esteem-section"><h4 class="tarot-self-esteem-section-title">🃏 포지션별 상세 해석</h4>';
      r.positionInsights.forEach(function (item) {
        html += '<div class="tarot-self-esteem-insight-card">';
        html += '<div class="tarot-self-esteem-insight-title">' + escapeHtml(item.title || item.position) + " — " + escapeHtml(item.cardLabel || "") + "</div>";
        if (item.subtitle) html += '<div class="tarot-self-esteem-insight-subtitle">' + escapeHtml(item.subtitle) + "</div>";
        html += '<div class="tarot-self-esteem-section-text">' + escapeHtml(item.message || "") + "</div>";
        if (Array.isArray(item.keywords) && item.keywords.length) {
          html += '<div class="tarot-self-esteem-keywords">키워드: ' + escapeHtml(item.keywords.join(", ")) + "</div>";
        }
        html += "</div>";
      });
      html += "</section>";
    }
    if (Array.isArray(r.actionPlan)) {
      html += '<section class="tarot-self-esteem-section"><h4 class="tarot-self-esteem-section-title">⚔️ 오늘의 레벨업 퀘스트</h4><ul class="tarot-self-esteem-advice-list">';
      r.actionPlan.forEach(function (item) {
        html += "<li>" + escapeHtml(item) + "</li>";
      });
      html += "</ul></section>";
    }

    if (!html.trim()) {
      // As a final safety net, always build a readable analysis from drawn cards.
      if (Array.isArray(state.cards) && state.cards.length) {
        state.reading = buildFallbackReading();
        r = state.reading;
        if (r.opening) {
          html += '<section class="tarot-self-esteem-section"><h4 class="tarot-self-esteem-section-title">✨ 오프닝 메시지</h4><p class="tarot-self-esteem-section-text">' + escapeHtml(r.opening) + "</p></section>";
        }
        if (r.pastDebuff) {
          html += '<section class="tarot-self-esteem-section"><h4 class="tarot-self-esteem-section-title">1. ' + escapeHtml(POSITION_LABELS.past_debuff) + "</h4><p class=\"tarot-self-esteem-section-text\">" + escapeHtml(r.pastDebuff) + "</p></section>";
        }
        if (r.innerMonster) {
          html += '<section class="tarot-self-esteem-section"><h4 class="tarot-self-esteem-section-title">2. ' + escapeHtml(POSITION_LABELS.inner_monster) + "</h4><p class=\"tarot-self-esteem-section-text\">" + escapeHtml(r.innerMonster) + "</p></section>";
        }
        if (r.currentDamage) {
          html += '<section class="tarot-self-esteem-section"><h4 class="tarot-self-esteem-section-title">3. ' + escapeHtml(POSITION_LABELS.current_damage) + "</h4><p class=\"tarot-self-esteem-section-text\">" + escapeHtml(r.currentDamage) + "</p></section>";
        }
        if (r.mindShield) {
          html += '<section class="tarot-self-esteem-section"><h4 class="tarot-self-esteem-section-title">4. ' + escapeHtml(POSITION_LABELS.mind_shield) + "</h4><p class=\"tarot-self-esteem-section-text\">" + escapeHtml(r.mindShield) + "</p></section>";
        }
        if (r.levelupMastery) {
          html += '<section class="tarot-self-esteem-section"><h4 class="tarot-self-esteem-section-title">5. ' + escapeHtml(POSITION_LABELS.levelup_mastery) + "</h4><p class=\"tarot-self-esteem-section-text\">" + escapeHtml(r.levelupMastery) + "</p></section>";
        }
      }
      if (!html.trim()) {
        html = '<section class="tarot-self-esteem-section"><p class="tarot-self-esteem-section-text">해석 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p></section>';
      }
    }
    container.innerHTML = html;
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
