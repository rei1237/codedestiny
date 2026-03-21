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
      p.innerHTML =
        '<div class="totem-guidance-aura" style="--aura-color:' + (entry.animal.color_theme.glow || "#facc15") + ';"></div>' +
        '<div class="totem-guidance-head">' +
          '<div class="totem-guidance-animal">' + entry.animal.emoji + "</div>" +
          '<div><p class="totem-guidance-slot">' + slotLabel(entry.slot) + '</p><h3 class="totem-guidance-name">' + entry.animal.name_ko + "</h3></div>" +
        "</div>" +
        '<section class="totem-guidance-section"><h4>오늘의 수호신</h4><p>' + essence + "</p></section>" +
        '<section class="totem-guidance-section"><h4>작은 친구의 속삭임</h4><p>' + message + "</p></section>" +
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
    try {
      console.log("[animal-totem] Ritual started");
      ensureRefs();
      
      /* 버튼 피드백 — 로딩 상태 표시 */
      var btn = document.querySelector('[data-action="startAnimalTotemRitual"]');
      if (btn) {
        btn.disabled = true;
        btn.textContent = '✨ 소환 중...';
        btn.classList.add('is-loading');
      }
      
      /* 모드 선택 화면으로 전환 */
      activateStage(refs.modeStage);
      
      /* 피드백 복원 (500ms 후) */
      setTimeout(function() {
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'INVOKE MY GUIDE';
          btn.classList.remove('is-loading');
        }
      }, 500);
    } catch (err) {
      console.error("[animal-totem] startAnimalTotemRitual failed:", err);
      alert('애니멀 토템을 소환할 수 없습니다. 페이지를 새로고침하고 다시 시도해주세요.');
    }
  }

  function setAnimalTotemSpreadMode(mode) {
    ensureRefs();
    setMode(mode);
  }

  function drawAnimalTotemSpread() {
    try {
      console.log("[animal-totem] Drawing spread, mode:", state.mode);
      
      ensureRefs();
      
      /* 엔진 확인 */
      if (!global.AnimalTotemContentEngine) {
        console.error("[animal-totem] ContentEngine not loaded - loading now...");
        /* Fallback: 엔진이 로드되지 않았으면 동적 로드 시도 */
        if (typeof __loadScriptOnce === 'function') {
          __loadScriptOnce('/js/services/animal-totem-content-engine.js').then(function() {
            console.log("[animal-totem] ContentEngine loaded via fallback");
            drawAnimalTotemSpread(); /* 재귀 호출 */
          }).catch(function(err) {
            console.error("[animal-totem] Failed to load ContentEngine:", err);
            alert('애니멀 토템 데이터를 불러올 수 없습니다. 페이지를 새로고침해주세요.');
          });
          return;
        }
        throw new Error('AnimalTotemContentEngine not available');
      }
      
      /* 로딩 표시 */
      var spreadBtn = document.querySelector('[data-action="drawAnimalTotemSpread"]');
      if (spreadBtn) {
        spreadBtn.disabled = true;
        spreadBtn.textContent = '🔮 펼치는 중...';
      }
      
      try {
        state.spread = global.AnimalTotemContentEngine.getRandomSpread(state.mode);
        state.consultation = global.AnimalTotemContentEngine.composeConsultation(state.spread, {});
        
        if (!state.spread || !state.consultation) {
          throw new Error('Spread composition failed');
        }
      } finally {
        if (spreadBtn) {
          spreadBtn.disabled = false;
          spreadBtn.textContent = '🃏 카드 펼치기';
        }
      }
      
      renderDeck();
      applyAmbientClass();
      activateStage(refs.drawStage);
      
      console.log("[animal-totem] Spread drawn successfully:", state.spread.cards.length, "cards");
    } catch (err) {
      console.error("[animal-totem] drawAnimalTotemSpread error:", err);
      alert('카드를 펼칠 수 없습니다: ' + (err.message || '알 수 없는 오류'));
      /* 오류 발생 시 이전 단계로 (ritual) */
      activateStage(refs.modeStage);
    }
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
    if (state.revealedOrder.length === state.mode) {
      /* 모든 카드 오픈 완료 → 결과 표시 */
      setTimeout(function() {
        activateStage(refs.resultStage);
      }, 300);
    }
  }

  function shareAnimalTotemResult() {
    if (!state.consultation) return;
    var titles = state.consultation.cards.map(function(c) { return c.animal.emoji + " " + c.animal.name_ko; }).join(" · ");
    var text = "🧸 애니멀 토템 심층 리딩\n" + titles + "\n\n" + (state.consultation.opening_message || "") + "\n\n👉 무료 리딩 보러가기: https://code-destiny.com";
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

  /* ============================================ 
   * Global Exports
   * ============================================ */
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

})(typeof window !== 'undefined' ? window : global);
})(window);
