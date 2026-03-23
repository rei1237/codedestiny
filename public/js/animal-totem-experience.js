(function(global) {
  "use strict";

  var state = {
    mode: "three",
    spread: null,
    consultation: null,
    revealedOrder: [],
    canvasLoop: null,
    canvasStars: [],
    touchStart: null
  };

  var refs = {};
  var TAP_THRESHOLD = 12;
  var COMING_SOON_EMOJIS = ["🐱", "🐶", "🐰", "🦊", "🐻", "🐦", "🦋", "🦉", "🐬", "🐢", "🐿️", "🦌", "🐺", "🦅"];
  var COMING_SOON_NAMES = ["고양이", "강아지", "토끼", "여우", "곰", "파랑새", "나비", "올빼미", "돌고래", "거북이", "다람쥐", "사슴", "늑대", "독수리"];
  var DP_NS = "FORTUNE_APP_USER_PROFILES";
  var STEM_ELEMENTS = ["wood", "wood", "fire", "fire", "earth", "earth", "metal", "metal", "water", "water"];
  var BRANCH_ELEMENTS = ["water", "earth", "wood", "wood", "earth", "fire", "fire", "earth", "metal", "metal", "earth", "water"];

  function byId(id) { return document.getElementById(id); }
  var bodyLockState = {
    mode: null,
    bodyOverflow: "",
    htmlOverflow: ""
  };

  function useSoftBodyLock() {
    var mq = global.matchMedia ? global.matchMedia("(max-width: 900px)") : null;
    var coarse = global.matchMedia ? global.matchMedia("(pointer: coarse)") : null;
    return !!((mq && mq.matches) || (coarse && coarse.matches));
  }

  function lockBody() {
    if (bodyLockState.mode) return;
    /* 현재 overflow 상태 저장 (unlock 시 복원용) */
    bodyLockState.bodyOverflow = document.body.style.overflow || "";
    bodyLockState.htmlOverflow = (document.documentElement && document.documentElement.style.overflow) || "";
    /* 모바일: body overflow:hidden 시 iOS Safari에서 오버레이 내부 스크롤이 막힘. overscroll-behavior로 대체 */
    if (useSoftBodyLock()) {
      bodyLockState.mode = "soft";
      return;
    }
    if (global._perf && global._perf.lockBody) {
      bodyLockState.mode = "perf";
      global._perf.lockBody();
      return;
    }
    bodyLockState.mode = "fallback";
    document.body.style.overflow = "hidden";
  }

  function unlockBody() {
    if (!bodyLockState.mode) return;
    if (bodyLockState.mode === "soft") {
      document.body.style.overflow = bodyLockState.bodyOverflow;
      document.documentElement.style.overflow = bodyLockState.htmlOverflow;
    } else if (bodyLockState.mode === "perf") {
      if (global._perf && global._perf.unlockBody) global._perf.unlockBody();
    } else {
      document.body.style.overflow = bodyLockState.bodyOverflow;
    }
    bodyLockState.mode = null;
    bodyLockState.bodyOverflow = "";
    bodyLockState.htmlOverflow = "";
  }

  function ensureRefs() {
    refs.overlay = byId("animalTotemOverlay");
    refs.introStage = byId("animalTotemIntroStage");
    refs.modeStage = byId("animalTotemModeStage");
    refs.drawStage = byId("animalTotemDrawStage");
    refs.resultStage = byId("animalTotemResultStage");
    refs.cardRail = byId("animalTotemCardRail");
    refs.readingPanels = byId("animalTotemReadingPanels");
    refs.resultCards = byId("animalTotemResultCards");
    refs.openingText = byId("animalTotemOpeningText");
    refs.closingText = byId("animalTotemClosingText");
    refs.flowStrip = byId("animalTotemFlowStrip");
    refs.modeButtons = document.querySelectorAll(".totem-mode-btn");
    refs.canvas = byId("animalTotemStarCanvas");
    refs.runeField = byId("animalTotemRuneField");
    refs.animalFigures = byId("animalTotemAnimalFigures");
  }

  function takeSentences(text, maxSentences) {
    if (!text) return "";
    var cleaned = String(text).replace(/\s+/g, " ").trim();
    var parts = cleaned.split(/(?<=[.!?।])\s+/);
    if (parts.length <= maxSentences) return cleaned;
    return parts.slice(0, maxSentences).join(" ");
  }

  function shortenAdvice(list) {
    if (!Array.isArray(list)) return [];
    return list.slice(0, 3).map(function(v) { return takeSentences(v, 1); });
  }

  function activateStage(stageEl) {
    [refs.introStage, refs.modeStage, refs.drawStage, refs.resultStage].forEach(function(el) {
      if (el && el.classList) el.classList.remove("is-active");
    });
    if (stageEl && stageEl.classList) stageEl.classList.add("is-active");
    if (refs.overlay) {
      refs.overlay.classList.toggle("is-result-view", stageEl === refs.resultStage);
    }
  }

  function buildRuneField() {
    if (!refs.runeField || refs.runeField.dataset.ready === "1") return;
    refs.runeField.dataset.ready = "1";
    var runes = ["ᚠ", "ᚨ", "ᚱ", "ᛟ", "ᛞ", "ᚲ", "✶", "✧", "☾"];
    var count = useSoftBodyLock() ? 12 : 26;
    for (var i = 0; i < count; i += 1) {
      var el = document.createElement("span");
      el.className = "totem-rune";
      el.textContent = runes[i % runes.length];
      el.style.left = Math.floor(Math.random() * 96) + "%";
      el.style.animationDuration = (8 + Math.random() * 10).toFixed(2) + "s";
      el.style.animationDelay = (Math.random() * 6).toFixed(2) + "s";
      refs.runeField.appendChild(el);
    }
  }

  function buildAnimalFigures() {
    if (!refs.animalFigures || refs.animalFigures.dataset.ready === "1") return;
    refs.animalFigures.dataset.ready = "1";
    var animals = ["🐱", "🐶", "🐰", "🦊", "🐻", "🐦", "🦋", "🦉", "🐬", "🐢", "🐿️", "🦌", "🐺", "🦅"];
    var isMobile = useSoftBodyLock();
    var staticPositions = ["tl", "tr", "bl", "br", "mt"];
    staticPositions.forEach(function(pos, i) {
      var el = document.createElement("span");
      el.className = "totem-animal-figure totem-animal-figure--static totem-animal-figure--" + pos;
      el.textContent = animals[i % animals.length];
      el.setAttribute("aria-hidden", "true");
      refs.animalFigures.appendChild(el);
    });
    var floatCount = isMobile ? 6 : 18;
    for (var j = 0; j < floatCount; j += 1) {
      var fl = document.createElement("span");
      fl.className = "totem-animal-figure";
      fl.textContent = animals[j % animals.length];
      fl.style.left = Math.floor(Math.random() * 92) + "%";
      fl.style.animationDuration = (10 + Math.random() * 12).toFixed(2) + "s";
      fl.style.animationDelay = (Math.random() * 8).toFixed(2) + "s";
      fl.style.fontSize = (16 + Math.floor(Math.random() * 10)) + "px";
      fl.setAttribute("aria-hidden", "true");
      refs.animalFigures.appendChild(fl);
    }
  }

  function startCanvas() {
    if (!refs.canvas) return;
    var c = refs.canvas;
    var rect = c.getBoundingClientRect();
    c.width = Math.max(240, Math.floor(rect.width));
    c.height = Math.max(120, Math.floor(rect.height));
    var ctx = c.getContext("2d");
    var starCount = useSoftBodyLock() ? 20 : 48;
    state.canvasStars = Array.from({ length: starCount }, function() {
      return {
        x: Math.random() * c.width,
        y: Math.random() * c.height,
        r: 0.6 + Math.random() * 1.7,
        speed: 0.12 + Math.random() * 0.44,
        alpha: 0.15 + Math.random() * 0.75
      };
    });
    function tick() {
      ctx.clearRect(0, 0, c.width, c.height);
      for (var i = 0; i < state.canvasStars.length; i += 1) {
        var s = state.canvasStars[i];
        s.y -= s.speed;
        if (s.y < -4) {
          s.y = c.height + 3;
          s.x = Math.random() * c.width;
        }
        ctx.beginPath();
        ctx.fillStyle = "rgba(255,236,168," + s.alpha.toFixed(2) + ")";
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      state.canvasLoop = global.requestAnimationFrame(tick);
    }
    stopCanvas();
    tick();
  }

  function stopCanvas() {
    if (state.canvasLoop) {
      global.cancelAnimationFrame(state.canvasLoop);
      state.canvasLoop = null;
    }
  }

  function setMode(mode) {
    state.mode = (mode === "five" ? "five" : mode === "one" ? "one" : "three");
    refs.modeButtons.forEach(function(btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-mode") === state.mode);
    });
  }

  function slotLabel(slot) {
    var map = {
      today_guide: "오늘의 수호 메시지",
      past_wound: "과거 상처",
      present_energy: "현재 에너지",
      integration_path: "통합 방향",
      mind: "이성/사고",
      heart: "감정/욕구",
      shadow: "그림자",
      gift: "잠재 선물",
      next_action: "다음 행동"
    };
    return map[slot] || slot;
  }

  function getSlotsByMode(mode) {
    if (mode === "five") return ["mind", "heart", "shadow", "gift", "next_action"];
    if (mode === "one") return ["today_guide"];
    return ["past_wound", "present_energy", "integration_path"];
  }

  function buildPlaceholderSpread(mode) {
    var spreadMode = mode === "five" ? "five" : mode === "one" ? "one" : "three";
    var slots = getSlotsByMode(spreadMode);
    var cards = slots.map(function(slot, idx) {
      var icon = COMING_SOON_EMOJIS[(idx + Math.floor(Math.random() * COMING_SOON_EMOJIS.length)) % COMING_SOON_EMOJIS.length];
      var name = COMING_SOON_NAMES[idx % COMING_SOON_NAMES.length];
      return {
        slot: slot,
        card: {
          id: "emoji-placeholder-" + idx,
          name_ko: name,
          emoji: icon,
          category: "준비중",
          color_theme: { primary: "#f59e0b", glow: "#fcd34d", particle: "#fef3c7" }
        }
      };
    });
    return { mode: spreadMode, cards: cards, created_at: new Date().toISOString() };
  }

  function buildComingSoonConsultation(spread) {
    return {
      mode: spread.mode,
      opening_message: "AI 동물 가이드를 불러오지 못해 기본 리딩을 표시합니다.",
      cards: spread.cards.map(function(item) {
        return {
          slot: item.slot,
          animal: item.card,
          layered_reading: {
            essence: "오늘은 감정의 결을 부드럽게 정리해보세요.",
            direct_message: "가볍게 시작해도 충분히 의미 있는 하루를 만들 수 있어요.",
            daily_actions: [
              "마음에 드는 이모지 하나를 오늘의 키워드로 정해보세요.",
              "호흡을 가다듬고 지금 감정을 한 줄로 적어보세요.",
              "오늘 실천할 작은 행동 하나를 바로 시작해보세요."
            ],
            ritual: "5분 동안 조용히 호흡하며 오늘의 방향을 정리해보세요.",
            journaling: [],
            shadow_warning: "비교가 깊어지면 에너지가 빠질 수 있어요.",
            affirmation: "나는 오늘도 나를 다정하게 돌본다."
          }
        };
      }),
      closing_guidance: "기본 리딩으로 표시되었어요. 잠시 후 다시 시도해보세요."
    };
  }

  function _safeNum(v, fallback) {
    var n = parseInt(v, 10);
    return Number.isNaN(n) ? fallback : n;
  }

  function getCurrentDestinyProfile() {
    try {
      var list = JSON.parse(localStorage.getItem(DP_NS + ".list") || "[]");
      var currentId = localStorage.getItem(DP_NS + ".current") || "";
      if (!Array.isArray(list) || !list.length) return null;
      var current = null;
      for (var i = 0; i < list.length; i += 1) {
        if (list[i] && list[i].id === currentId) {
          current = list[i];
          break;
        }
      }
      return current || list[0] || null;
    } catch (_) {
      return null;
    }
  }

  function elementKo(key) {
    var map = { wood: "목", fire: "화", earth: "토", metal: "금", water: "수" };
    return map[key] || "토";
  }

  function dominantElement(weights) {
    var best = "earth";
    ["wood", "fire", "earth", "metal", "water"].forEach(function(k) {
      if ((weights[k] || 0) > (weights[best] || 0)) best = k;
    });
    return best;
  }

  function expressionByElement(el) {
    var map = {
      wood: "호기심이 가득한 장난기 있는 미소",
      fire: "활기차고 생동감 있는 밝은 미소",
      earth: "안정적이고 포근한 편안한 미소",
      metal: "또렷하고 단정한 자신감 있는 표정",
      water: "차분하고 깊이감 있는 신비로운 미소"
    };
    return map[el] || "부드러운 미소";
  }

  function backgroundByElement(el) {
    var map = {
      wood: "파스텔 숲과 새싹, 바람결",
      fire: "파스텔 노을과 빛 입자",
      earth: "파스텔 언덕과 꽃밭",
      metal: "은은한 수정과 별가루",
      water: "물결과 달빛이 비치는 하늘"
    };
    return map[el] || "파스텔 자연 배경";
  }

  function buildSajuVisualContext() {
    var profile = getCurrentDestinyProfile();
    if (!profile || !profile.birth) {
      return {
        focus: "오늘의 감정 흐름",
        saju_visual: {
          dominant_element: "earth",
          five_elements: { wood: 1, fire: 1, earth: 1, metal: 1, water: 1 },
          expression_seed: expressionByElement("earth"),
          background_seed: backgroundByElement("earth"),
          summary: "프로필 기반 사주 정보 없음"
        }
      };
    }

    var b = profile.birth || {};
    var year = _safeNum(b.year, 2000);
    var month = _safeNum(b.month, 1);
    var day = _safeNum(b.day, 1);
    var hour = _safeNum(b.hour, 12);

    var weights = { wood: 1, fire: 1, earth: 1, metal: 1, water: 1 };
    var stemIdx = ((year - 4) % 10 + 10) % 10;
    var yearBranchIdx = ((year - 4) % 12 + 12) % 12;
    var hourBranchIdx = Math.floor((((hour + 1) % 24) / 2));
    var seasonElement = (month >= 3 && month <= 5) ? "wood" :
      (month >= 6 && month <= 8) ? "fire" :
      (month >= 9 && month <= 11) ? "metal" : "water";
    var dayElement = ["wood", "fire", "earth", "metal", "water"][Math.abs(year + month + day) % 5];

    weights[STEM_ELEMENTS[stemIdx]] += 3;
    weights[BRANCH_ELEMENTS[yearBranchIdx]] += 2;
    weights[BRANCH_ELEMENTS[hourBranchIdx]] += 1;
    weights[seasonElement] += 2;
    weights[dayElement] += 2;

    var dom = dominantElement(weights);
    var summary = "사주 추정 오행 중심: " + elementKo(dom) + " / 목" + weights.wood + " 화" + weights.fire + " 토" + weights.earth + " 금" + weights.metal + " 수" + weights.water;

    return {
      focus: summary,
      profile_name: profile.name || "사용자",
      birth: { year: year, month: month, day: day, hour: hour, minute: _safeNum(b.minute, 0), calType: b.calType || "solar" },
      saju_visual: {
        dominant_element: dom,
        five_elements: weights,
        expression_seed: expressionByElement(dom),
        background_seed: backgroundByElement(dom),
        summary: summary
      }
    };
  }

  function getTouchPoint(e) {
    if (e.changedTouches && e.changedTouches.length) {
      var t = e.changedTouches[0];
      return { x: t.clientX, y: t.clientY };
    }
    if (e.touches && e.touches.length) {
      var t = e.touches[0];
      return { x: t.clientX, y: t.clientY };
    }
    if (typeof e.clientX === "number") return { x: e.clientX, y: e.clientY };
    return null;
  }

  function bindCardRailTouch() {
    if (!refs.cardRail || refs.cardRail._totemTouchBound) return;
    refs.cardRail._totemTouchBound = true;

    refs.cardRail.addEventListener("touchstart", function(ev) {
      var pt = getTouchPoint(ev);
      if (pt) state.touchStart = { x: pt.x, y: pt.y };
    }, { passive: true });

    refs.cardRail.addEventListener("touchend", function(ev) {
      if (!state.touchStart || !state.spread) return;
      var pt = getTouchPoint(ev);
      if (!pt) return;
      var dx = Math.abs(pt.x - state.touchStart.x);
      var dy = Math.abs(pt.y - state.touchStart.y);
      if (dx > TAP_THRESHOLD || dy > TAP_THRESHOLD) {
        state.touchStart = null;
        return;
      }
      var target = ev.target && ev.target.closest && ev.target.closest(".totem-draw-card");
      if (!target || target.classList.contains("is-disabled") || target.classList.contains("is-revealed")) {
        state.touchStart = null;
        return;
      }
      var idxAttr = target.getAttribute("data-action-args");
      var idx = parseInt(idxAttr, 10);
      if (idx !== state.revealedOrder.length) {
        state.touchStart = null;
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      state.touchStart = null;
      revealAnimalTotemCard(target, idx);
    }, { passive: false });
  }

  function renderDeck() {
    if (!refs.cardRail || !state.spread) return;
    refs.cardRail.innerHTML = "";
    refs.cardRail._totemTouchBound = false;
    state.revealedOrder = [];
    state.spread.cards.forEach(function(entry, idx) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "totem-draw-card totem-parallax-zone";
      btn.setAttribute("data-action", "revealAnimalTotemCard");
      btn.setAttribute("data-action-pass-self", "1");
      btn.setAttribute("data-action-args", String(idx));
      btn.setAttribute("aria-label", slotLabel(entry.slot) + " 카드 뒤집기");
      btn.innerHTML =
        '<span class="totem-draw-card-inner">' +
        '<span class="totem-card-face totem-card-face--back"><span class="totem-card-emoji">🐾</span><small class="totem-card-slot">' + slotLabel(entry.slot) + '</small><small class="totem-card-mark">TOTEM CARD</small></span>' +
        '<span class="totem-card-face totem-card-face--front">' +
        '<b class="totem-card-emoji">' + entry.card.emoji + "</b>" +
        '<span class="totem-card-name">' + entry.card.name_ko + "</span>" +
        '<small>' + entry.card.category + "</small>" +
        "</span></span>";
      refs.cardRail.appendChild(btn);
    });
    bindCardRailTouch();
  }

  function parallaxCard(btn, active) {
    if (!btn) return;
    if (!active) {
      btn.style.transform = "translate3d(0,0,0)";
      return;
    }
    var r = btn.getBoundingClientRect();
    var cx = r.left + r.width / 2;
    var cy = r.top + r.height / 2;
    btn.onmousemove = function(ev) {
      var dx = ((ev.clientX - cx) / r.width) * 14;
      var dy = ((ev.clientY - cy) / r.height) * 14;
      btn.style.transform = "translate3d(" + dx.toFixed(2) + "px," + dy.toFixed(2) + "px,0)";
    };
    btn.onmouseleave = function() { btn.style.transform = "translate3d(0,0,0)"; };
  }

  function burstAt(btn, color) {
    if (!btn) return;
    for (var i = 0; i < 14; i += 1) {
      var d = document.createElement("i");
      d.className = "totem-burst";
      d.style.background = color;
      d.style.left = "50%";
      d.style.top = "50%";
      var angle = (Math.PI * 2 * i) / 14;
      d.style.setProperty("--tx", Math.cos(angle) * (24 + Math.random() * 22) + "px");
      d.style.setProperty("--ty", Math.sin(angle) * (24 + Math.random() * 22) + "px");
      btn.appendChild(d);
      setTimeout((function(node) { return function() { if (node && node.parentNode) node.parentNode.removeChild(node); }; })(d), 700);
    }
  }

  function applyAmbientClass() {
    if (!refs.overlay || !state.spread) return;
    refs.overlay.classList.remove("env-ground", "env-air", "env-water");
    var score = { "지상": 0, "공중": 0, "물/기타": 0, "기본": 0 };
    state.spread.cards.forEach(function(it) {
      var cat = it.card.category || "기본";
      score[cat] = (score[cat] || 0) + 1;
    });
    var maxCat = "기본";
    Object.keys(score).forEach(function(k) { if (score[k] > score[maxCat]) maxCat = k; });
    if (maxCat === "지상") refs.overlay.classList.add("env-ground");
    else if (maxCat === "공중") refs.overlay.classList.add("env-air");
    else refs.overlay.classList.add("env-water");
  }

  function renderResultCards() {
    if (!refs.resultCards || !state.spread) return;
    refs.resultCards.innerHTML = "";
    refs.resultCards.className = "totem-result-cards totem-result-cards--" + state.spread.cards.length;
    state.spread.cards.forEach(function(entry, idx) {
      var card = document.createElement("div");
      card.className = "totem-result-card totem-result-card--" + (idx + 1);
      card.setAttribute("aria-label", slotLabel(entry.slot) + " — " + entry.card.name_ko);
      card.innerHTML =
        '<div class="totem-result-card-inner">' +
        '<span class="totem-result-card-emoji">' + entry.card.emoji + "</span>" +
        '<span class="totem-result-card-name">' + entry.card.name_ko + "</span>" +
        '<small class="totem-result-card-slot">' + slotLabel(entry.slot) + "</small>" +
        '</div>';
      refs.resultCards.appendChild(card);
    });
  }

  function renderConsultation() {
    if (!refs.readingPanels || !state.consultation) return;
    renderResultCards();
    refs.readingPanels.innerHTML = "";
    if (refs.openingText) refs.openingText.textContent = takeSentences(state.consultation.opening_message || "", 2);
    if (refs.closingText) refs.closingText.textContent = takeSentences(state.consultation.closing_guidance || "", 2);
    if (refs.flowStrip) {
      refs.flowStrip.innerHTML = state.consultation.cards.map(function(entry, idx) {
        var arrow = idx < state.consultation.cards.length - 1 ? '<span class="totem-flow-arrow">→</span>' : "";
        return '<div class="totem-flow-node">' +
          '<span class="totem-flow-icon">' + entry.animal.emoji + '</span>' +
          '<span class="totem-flow-label">' + slotLabel(entry.slot) + "</span>" +
          '<span class="totem-flow-name">' + entry.animal.name_ko + "</span>" +
          "</div>" + arrow;
      }).join("");
    }

    var maxSentences = state.mode === "one" ? 4 : 2;
    state.consultation.cards.forEach(function(entry, idx) {
      var p = document.createElement("article");
      p.className = "totem-guidance-card";
      p.style.animationDelay = (idx * 0.12).toFixed(2) + "s";
      var essence = takeSentences(entry.layered_reading.essence, maxSentences);
      var message = takeSentences(entry.layered_reading.direct_message, maxSentences);
      var advices = state.mode === "one" ? (entry.layered_reading.daily_actions || []).slice(0, 5).map(function(v) { return takeSentences(v, 1); }) : shortenAdvice(entry.layered_reading.daily_actions);
      var expression = entry.animal && entry.animal.facial_expression ? takeSentences(entry.animal.facial_expression, 1) : "";
      var background = entry.animal && entry.animal.background_motif ? takeSentences(entry.animal.background_motif, 1) : "";
      var styleGuide = entry.animal && entry.animal.illustration_prompt ? takeSentences(entry.animal.illustration_prompt, 2) : "";
      var styleMeta = (expression || background)
        ? ('<p><b>표정:</b> ' + (expression || "부드러운 미소") + '<br/><b>배경:</b> ' + (background || "파스텔 자연") + '</p>')
        : "";
      var styleSection = styleGuide ? ('<section class="totem-guidance-section"><h4>일러스트 가이드</h4>' + styleMeta + '<p>' + styleGuide + "</p></section>") : "";
      p.innerHTML =
        '<div class="totem-guidance-aura" style="--aura-color:' + (entry.animal.color_theme.glow || "#facc15") + ';"></div>' +
        '<div class="totem-guidance-head">' +
          '<div class="totem-guidance-animal">' + entry.animal.emoji + "</div>" +
          '<div><p class="totem-guidance-slot">' + slotLabel(entry.slot) + '</p><h3 class="totem-guidance-name">' + entry.animal.name_ko + "</h3></div>" +
        "</div>" +
        '<section class="totem-guidance-section"><h4>오늘의 수호신</h4><p>' + essence + "</p></section>" +
        '<section class="totem-guidance-section"><h4>작은 친구의 속삭임</h4><p>' + message + "</p></section>" +
        styleSection +
        '<section class="totem-guidance-section"><h4>오늘 해보면 좋을 것</h4><ul>' + advices.map(function(v) { return "<li>" + v + "</li>"; }).join("") + "</ul></section>" +
        '<details class="totem-ritual-toggle"><summary>5분 마음 정리</summary><p>' + takeSentences(entry.layered_reading.ritual, state.mode === "one" ? 3 : 2) + "</p></details>";
      refs.readingPanels.appendChild(p);
    });
  }

  function openAnimalTotemModal() {
    try {
      ensureRefs();
      if (!refs.overlay) return;
      /* 이미 열려 있으면 중복 호출 방지 (이중 핸들러/더블탭 시 화면 멈춤 방지) */
      if (refs.overlay.classList.contains("is-open")) return;
      /* 모바일: overlay가 main 내부에 있으면 transform/overflow 조상으로 viewport 전체 미덮음 → body로 이동 */
      if (refs.overlay.parentNode && refs.overlay.parentNode !== document.body) {
        document.body.appendChild(refs.overlay);
      }
      refs.overlay.classList.remove("env-ground", "env-air", "env-water");
      refs.overlay.classList.add("is-open");
      refs.overlay.scrollTop = 0;
      /* 모바일: 언어 선택 등 상단 UI가 overlay 위에 보이지 않도록 (z-index·겹침 방지) */
      document.body.classList.add("animal-totem-modal-open");
      lockBody();
      resetAnimalTotemFlow();
      /* 모바일: 애니메이션 과부하로 Main Thread 차단 방지 — 지연·분산 실행 */
      var raf = global.requestAnimationFrame || function(cb) { return setTimeout(cb, 0); };
      var isMobile = useSoftBodyLock();
      var idle = global.requestIdleCallback || function(cb, opts) { return setTimeout(cb, (opts && opts.timeout) || 50); };
      raf(function() {
        try {
          if (isMobile) {
            /* 모바일: rune·figures·canvas를 단계별로 분산 (화면 멈춤 방지) */
            buildRuneField();
            idle(function() {
              buildAnimalFigures();
              idle(function() { startCanvas(); }, { timeout: 100 });
            }, { timeout: 80 });
          } else {
            buildRuneField();
            buildAnimalFigures();
            startCanvas();
          }
        } catch (err) {
          console.error("[animal-totem] init error:", err);
        }
      });
    } catch (err) {
      console.error("[animal-totem] openAnimalTotemModal error:", err);
      try {
        if (refs.overlay) refs.overlay.classList.remove("is-open");
        document.body.classList.remove("animal-totem-modal-open");
        unlockBody();
      } catch (_) {}
    }
  }

  function closeAnimalTotemModal() {
    ensureRefs();
    if (!refs.overlay) return;
    refs.overlay.classList.remove("is-open");
    document.body.classList.remove("animal-totem-modal-open");
    unlockBody();
    stopCanvas();
    /* 모바일: body overflow 복원 보장 (다른 경로로 닫혀도 스크롤 잠금 해제) */
    try {
      if (document.body && document.body.style.overflow === "hidden" && !bodyLockState.mode) {
        document.body.style.overflow = bodyLockState.bodyOverflow || "";
      }
    } catch (_) {}
  }

  function resetAnimalTotemFlow() {
    ensureRefs();
    state.spread = null;
    state.consultation = null;
    state.revealedOrder = [];
    activateStage(refs.introStage);
    if (refs.cardRail) refs.cardRail.innerHTML = "";
    if (refs.resultCards) refs.resultCards.innerHTML = "";
    if (refs.readingPanels) refs.readingPanels.innerHTML = "";
    if (refs.openingText) refs.openingText.textContent = "";
    if (refs.closingText) refs.closingText.textContent = "";
    setMode("three");
  }

  function startAnimalTotemRitual() {
    ensureRefs();
    activateStage(refs.modeStage);
  }

  function setAnimalTotemSpreadMode(mode) {
    ensureRefs();
    setMode(mode);
  }

  function drawAnimalTotemSpread() {
    ensureRefs();
    var sajuContext = buildSajuVisualContext();
    if (refs.cardRail) refs.cardRail.innerHTML = '<div class="totem-loading">AI 동물 가이드를 불러오는 중...</div>';
    if (refs.openingText) refs.openingText.textContent = "사주 기반 동물 리딩을 준비하고 있어요. " + (sajuContext.saju_visual.summary || "");
    if (refs.closingText) refs.closingText.textContent = "";
    activateStage(refs.drawStage);

    var engine = global.AnimalTotemContentEngine;
    var fallbackSpread = buildPlaceholderSpread(state.mode);
    var fallbackConsultation = buildComingSoonConsultation(fallbackSpread);

    function applyResult(result) {
      if (result && result.spread && result.consultation) {
        state.spread = result.spread;
        state.consultation = result.consultation;
      } else {
        state.spread = fallbackSpread;
        state.consultation = fallbackConsultation;
      }
      renderDeck();
      applyAmbientClass();
      activateStage(refs.drawStage);
    }

    if (!engine || typeof engine.generateConsultation !== "function") {
      applyResult(null);
      return;
    }

    Promise.resolve(engine.generateConsultation(state.mode, sajuContext))
      .then(function(result) { applyResult(result); })
      .catch(function(err) {
        console.error("[animal-totem] generateConsultation failed:", err);
        applyResult(null);
      });
  }

  function revealAnimalTotemCard(btn, idxRaw) {
    ensureRefs();
    if (!state.spread || !state.consultation) return;
    var idx = parseInt(idxRaw, 10);
    if (Number.isNaN(idx)) return;
    if (state.revealedOrder.indexOf(idx) >= 0) return;
    if (idx !== state.revealedOrder.length) return;
    if (navigator.vibrate) navigator.vibrate(12);
    var card = refs.cardRail ? refs.cardRail.children[idx] : null;
    if (!card) return;
    card.classList.add("is-revealed");
    card.classList.remove("is-disabled");
    parallaxCard(card, true);
    var clr = state.spread.cards[idx].card.color_theme.glow || "#facc15";
    burstAt(card, clr);
    state.revealedOrder.push(idx);
    for (var i = 0; i < refs.cardRail.children.length; i += 1) {
      if (i > state.revealedOrder.length) refs.cardRail.children[i].classList.add("is-disabled");
      else refs.cardRail.children[i].classList.remove("is-disabled");
    }
    if (state.revealedOrder.length === state.spread.cards.length) {
      renderConsultation();
      setTimeout(function() { activateStage(refs.resultStage); }, 250);
    }
  }

  function shareAnimalTotemResult() {
    if (!state.consultation) return;
    var titles = state.consultation.cards.map(function(c) { return c.animal.emoji + " " + c.animal.name_ko; }).join(" · ");
    var text = "🧸 애니멀 토템 AI 리딩\n" + titles + "\n\n" + (state.consultation.opening_message || "") + "\n\n🎨 동물 스타일: 파스텔톤 귀여운 일러스트\n\n👉 무료 리딩 보러가기: https://code-destiny.com";
    var encoded = encodeURIComponent(text);
    var a = document.createElement("a");
    a.href = "kakaotalk://send?text=" + encoded;
    a.click();
    setTimeout(function() {
      if (typeof copyToClipboard === "function") {
        copyToClipboard(text, "카카오톡 앱이 없거나 PC에서는 링크를 복사했어요! 카카오톡에 붙여넣기 하세요 💬");
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() { alert("카카오톡 앱이 없거나 PC에서는 링크를 복사했어요! 카카오톡에 붙여넣기 하세요 💬"); }).catch(function() { alert(text); });
      } else {
        alert(text);
      }
    }, 800);
  }

  global.openAnimalTotemModal = openAnimalTotemModal;
  global.closeAnimalTotemModal = closeAnimalTotemModal;
  global.startAnimalTotemRitual = startAnimalTotemRitual;
  global.setAnimalTotemSpreadMode = setAnimalTotemSpreadMode;
  global.drawAnimalTotemSpread = drawAnimalTotemSpread;
  global.revealAnimalTotemCard = revealAnimalTotemCard;
  global.resetAnimalTotemFlow = resetAnimalTotemFlow;
  global.shareAnimalTotemResult = shareAnimalTotemResult;
  global.startAnimalTotemMeditation = startAnimalTotemRitual;
  global.drawAnimalTotemCard = revealAnimalTotemCard;
})(window);
