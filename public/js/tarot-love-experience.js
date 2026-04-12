/**
 * 우리는 무슨 사이? — 6-Card Relationship Spread Experience
 * API: POST /api/tarot/draw (spreadType: relationship_six_card)
 *      POST /api/tarot/reading (category: love, spreadType: relationship_six_card, cards)
 */
(function () {
  "use strict";

  var POSITION_LABELS = {
    position_1: "내가 보는 상대",
    position_2: "상대가 관계를 보는 것",
    position_3: "상대가 나를 보는 것",
    position_4: "연애하고픈 마음",
    position_5: "관계를 막는 것",
    position_6: "예상되는 결과",
  };
  var DISPLAY_ORDER = [0, 1, 2, 3, 4, 5];
  var GUIDE_ORDER = [0, 1, 2, 3, 4, 5];

  var refs = {};
  var state = { cards: [], revealedCount: 0, reading: null };
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

  function createLocalRelationshipReading(cards) {
    var safeCards = Array.isArray(cards) ? cards : [];
    var breakdown = safeCards.map(function (card, idx) {
      var label = POSITION_LABELS[card.position] || ("포지션 " + String(idx + 1));
      var cardName = (card.nameKr || card.name || "타로 카드") + (card.orientation === "reversed" ? " (역)" : "");
      var summary = card.orientation === "reversed"
        ? "감정이 아직 정리되지 않아 오해가 쌓이기 쉬운 흐름입니다. 지금은 결론을 서두르기보다 사실 확인과 감정 정리를 우선해야 합니다. 상대의 말 한 줄을 단정으로 해석하기보다, 반응의 맥락과 반복 패턴을 함께 보세요."
        : "서로의 진심이 비교적 선명하게 드러나는 흐름입니다. 작은 신호를 놓치지 않고 일관된 대화를 이어가면 관계는 빠르게 안정될 수 있습니다. 강한 확답보다 작은 약속의 지속성이 관계를 더 단단하게 만듭니다.";
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
      imgEl.onload = function () {};
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
    if (window._perf && window._perf.unlockBody) window._perf.unlockBody();
    else document.body.style.overflow = "";
  }

  function resetTarotLoveFlow() {
    state.cards = [];
    state.revealedCount = 0;
    state.reading = null;

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
        if (!data.cards || data.cards.length !== 6) throw new Error("Invalid draw");
        state.cards = data.cards;
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
          state.cards = fallbackCards;
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
    if (typeof window._cdCoinGatePerUse === 'function') {
      window._cdCoinGatePerUse(50, '우리는 무슨 사이? 타로 리딩', _runTarotLoveFinalReading);
      return;
    }
    _runTarotLoveFinalReading();
  }

  function _runTarotLoveFinalReading() {
    var drawnForApi = state.cards.map(function (c) {
      return {
        cardId: c.cardId,
        position: c.position,
        orientation: c.orientation,
      };
    });

    callTarotApi("reading", {
      category: "love",
      spreadType: "relationship_six_card",
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
        state.reading = createLocalRelationshipReading(state.cards);
        var draw = byId("tarotLoveDrawStage");
        var result = byId("tarotLoveResultStage");
        if (draw) draw.classList.remove("is-active");
        if (result) result.classList.add("is-active");
        renderTarotLoveResult();
      });
  }

  function renderTarotLoveResult() {
    var container = byId("tarotLoveReadingContent");
    if (!container || !state.reading) return;

    var r = state.reading;
    var overallVibe = r.overallVibe != null ? String(r.overallVibe) : "";
    var deepReading = r.deepReading != null ? String(r.deepReading) : "";
    var realityAndFuture = r.realityAndFuture != null ? String(r.realityAndFuture) : "";
    var positionBreakdown = Array.isArray(r.positionBreakdown) ? r.positionBreakdown : [];
    var adviceList = Array.isArray(r.advice) ? r.advice : [];
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
      html += '<h4 class="tarot-love-section-title">🃏 포지션별 타로 해석</h4>';
      html += '<div class="tarot-love-position-grid">';
      positionBreakdown.forEach(function (item) {
        var title = item && item.title != null ? String(item.title) : "";
        var card = item && item.card != null ? String(item.card) : "";
        var summary = item && item.summary != null ? String(item.summary) : "";
        if (!title && !summary) return;
        html += '<article class="tarot-love-position-card">';
        html += '<p class="tarot-love-position-title">' + escapeHtml(title) + "</p>";
        if (card) html += '<p class="tarot-love-position-cardname">' + escapeHtml(card) + "</p>";
        if (summary) html += '<div class="tarot-love-position-text">' + formatReadingText(summary) + "</div>";
        html += "</article>";
      });
      html += "</div>";
      html += "</section>";
    }

    if (adviceList.length && adviceList[0]) {
      html += '<section class="tarot-love-section tarot-love-focus-section">';
      html += '<h4 class="tarot-love-section-title">⚡ 지금 당장 할 1가지</h4>';
      html += '<div class="tarot-love-focus-box">';
      html += '<p class="tarot-love-focus-label">오늘의 즉시 실행 미션</p>';
      html += '<p class="tarot-love-focus-text">' + escapeHtml(String(adviceList[0])) + "</p>";
      html += "</div>";
      html += "</section>";
    }

    if (adviceList.length) {
      html += '<section class="tarot-love-section tarot-love-section--advice">';
      html += '<h4 class="tarot-love-section-title">💡 마스터의 조언</h4>';
      html += '<ul class="tarot-love-advice-list">';
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
