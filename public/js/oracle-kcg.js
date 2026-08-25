      
/* ==============================================================
   ═══ 12주신 황금 카드 셔플 오라클 (KCG) ═══
============================================================== */
(function() {
  // 상수
  var KCG_SYMBOLS = ['𓇳','𓁹','𓆗','𓅃','𓃣','𓁟','𓃢','𓁷','𓃠','𓁦','𓆄','𓇋'];
  var KCG_LABELS  = ['Ra','Osiris','Isis','Horus','Set','Thoth','Anubis','Hathor','Bastet','Sekhmet','Ma\'at','Amun'];
  var KCG_TOTAL   = 12;
  var KCG_PICK    = 3;

  // 상태
  var kcgPhase     = 'init';   // init | shuffled | done
  var kcgSelected  = [];       // 선택된 god 인덱스
  var kcgCards     = [];       // DOM 요소 배열
  var kcgAnimating = false;

  function _kcgGetLayout() {
    var arena = document.getElementById('kcgArena');
    var wrap = arena ? arena.parentElement : null;
    var containerW = wrap ? wrap.clientWidth : 360;
    var arenaW = Math.max(280, Math.min(340, containerW - 8));
    var scale = arenaW / 340;
    var cardW = Math.max(56, Math.round(70 * scale));
    var cardH = Math.max(80, Math.round(100 * scale));
    var gapX = Math.max(6, Math.round(10 * scale));
    var gapY = Math.max(12, Math.round(23 * scale));
    var cols = 4;
    var rows = 3;
    var gridW = cols * cardW + (cols - 1) * gapX;
    var startX = Math.max(0, Math.floor((arenaW - gridW) / 2));
    var startY = Math.max(10, Math.round(15 * scale));
    var arenaH = Math.max(300, startY + rows * cardH + (rows - 1) * gapY + Math.round(14 * scale));
    // 원형 배치는 아레나 정중앙 기준 + 카드가 아레나 밖으로 나가지 않도록 반지름 클램프
    var circleR = Math.min(
      Math.max(90, Math.round(Math.min(arenaW, arenaH) * 0.35)),
      Math.floor((arenaW - cardW) / 2) - 4,
      Math.floor((arenaH - cardH) / 2) - 4
    );
    return {
      arenaW: arenaW,
      arenaH: arenaH,
      cardW: cardW,
      cardH: cardH,
      gapX: gapX,
      gapY: gapY,
      startX: startX,
      startY: startY,
      cx: arenaW / 2 - cardW / 2,
      cy: Math.max(48, Math.round(arenaH * 0.35) - cardH / 2),
      circleCx: arenaW / 2,
      circleCy: arenaH / 2,
      circleR: circleR
    };
  }

  function _kcgApplyArenaLayout() {
    var arena = document.getElementById('kcgArena');
    if (!arena) return _kcgGetLayout();
    var layout = _kcgGetLayout();
    arena.style.width = layout.arenaW + 'px';
    arena.style.height = layout.arenaH + 'px';
    return layout;
  }

  function _kcgBindFastTap(card, idx) {
    var firedAt = 0;
    function fire(ev) {
      var now = Date.now();
      if (now - firedAt < 260) return;
      firedAt = now;
      if (ev && ev.cancelable) ev.preventDefault();
      if (ev) ev.stopPropagation();
      _kcgOnCardClick(parseInt(idx, 10));
    }
    card.addEventListener('click', fire, { passive: false });
    card.addEventListener('touchend', fire, { passive: false });
    card.addEventListener('pointerup', function(ev) {
      if (ev.pointerType && ev.pointerType !== 'touch') return;
      fire(ev);
    }, { passive: false });
  }

  /* ── 아레나 초기화 ── */
  window.kcgInitCircle = function() {
    kcgPhase = 'init';
    kcgSelected = [];
    kcgAnimating = false;
    var arena = document.getElementById('kcgArena');
    if(!arena) return;
    arena.innerHTML = '';
    kcgCards = [];

    var layout = _kcgApplyArenaLayout();
    var cx = layout.circleCx, cy = layout.circleCy, R = layout.circleR;
    for(var i = 0; i < KCG_TOTAL; i++) {
      var card = _kcgMakeCard(i);
      arena.appendChild(card);
      kcgCards.push(card);

      // 원형 배치 — 아레나 정중앙 기준, 카드 좌상단으로 환산
      var angle = (2 * Math.PI / KCG_TOTAL) * i - Math.PI / 2;
      var x = cx + R * Math.cos(angle) - layout.cardW / 2;
      var y = cy + R * Math.sin(angle) - layout.cardH / 2;
      _kcgSetPos(card, x, y, 0, 1, 0);
    }

    _kcgSetCounter('3장의 카드를 선택하세요', false);
    _kcgSetHint('✦ GOLDEN SHUFFLE 버튼을 눌러 카드를 섞으십시오');
    var btn = document.getElementById('kcgShuffleBtn');
    if(btn) { btn.textContent = '✦ GOLDEN SHUFFLE'; btn.disabled = false; }
  };

  window.kcgReset = function() {
    kcgPhase = 'init'; kcgSelected = []; kcgAnimating = false; kcgCards = [];
  };

  /* ── 카드 DOM 생성 ── */
  function _kcgMakeCard(idx) {
    var card = document.createElement('div');
    card.className = 'kcg-card';
    card.dataset.idx = idx;
    card.innerHTML =
      '<div class="kcg-card-inner">' +
        '<div class="kcg-card-back">' +
          '<div class="kcg-card-symbol">' + KCG_SYMBOLS[idx] + '</div>' +
          '<div class="kcg-card-num">' + (idx + 1).toString().padStart(2,'0') + '</div>' +
        '</div>' +
      '</div>';

    card.addEventListener('mouseenter', function() {
      if(kcgPhase !== 'shuffled') return;
      if(card.classList.contains('selected') || card.classList.contains('dissolving')) return;
      _kcgTweenCard(card, null, null, null, 1.1, 'translateY(-24px)', 180);
    });
    card.addEventListener('mouseleave', function() {
      if(kcgPhase !== 'shuffled') return;
      if(card.classList.contains('selected') || card.classList.contains('dissolving')) return;
      _kcgTweenCard(card, null, null, null, 1, '', 180);
    });
    _kcgBindFastTap(card, idx);
    return card;
  }

  /* ── 위치 세팅 (GPU 가속) ── */
  function _kcgSetPos(el, x, y, rot, scale, extra) {
    el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) rotate(' + rot + 'deg) scale(' + scale + ') ' + (extra||'');
    el.style.opacity = '1';
    el.style.zIndex = Math.round((scale-1)*100) + '';
  }

  /* ── 간단 CSS tween (requestAnimationFrame 없이 transition으로) ── */
  function _kcgTweenCard(el, x, y, rot, scale, extra, ms) {
    el.style.transition = 'transform ' + (ms||400) + 'ms cubic-bezier(.34,1.56,.64,1), opacity 300ms, box-shadow 200ms';
    var cx = x !== null ? x : _kcgGetTranslateXY(el).x;
    var cy = y !== null ? y : _kcgGetTranslateXY(el).y;
    var cr = rot !== null ? rot : _kcgGetRotate(el);
    el.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0) rotate(' + cr + 'deg) scale(' + scale + ') ' + (extra||'');
  }

  function _kcgGetTranslateXY(el) {
    var t = el.style.transform || '';
    var m = t.match(/translate3d\(([^,]+)px,\s*([^,]+)px/);
    return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x:0, y:0 };
  }
  function _kcgGetRotate(el) {
    var t = el.style.transform || '';
    var m = t.match(/rotate\(([^)]+)deg\)/);
    return m ? parseFloat(m[1]) : 0;
  }

  /* ── 셔플 ── */
  window.kcgShuffle = function() {
    if(kcgAnimating) return;
    kcgAnimating = true;
    kcgSelected = [];
    kcgPhase = 'shuffling';

    var btn = document.getElementById('kcgShuffleBtn');
    if(btn) { btn.disabled = true; btn.textContent = '✦ SHUFFLING...'; }
    _kcgSetCounter('섞는 중...', false);
    _kcgSetHint('');

    // 햅틱 — 짧은 진동 연속
    if(navigator.vibrate) navigator.vibrate([30,50,30,50,30]);

    // Phase B: 중앙으로 모음
    var layout = _kcgApplyArenaLayout();
    var cx = layout.cx, cy = layout.cy;
    kcgCards.forEach(function(card, i) {
      var offX = (Math.random() - .5) * 14;
      var offY = (Math.random() - .5) * 14;
      var rot  = (Math.random() - .5) * 30;
      card.style.transition = 'transform ' + (350 + i*20) + 'ms cubic-bezier(.4,0,.2,1), filter 300ms';
      card.style.zIndex = i + '';
      card.style.transform = 'translate3d(' + (cx + offX) + 'px,' + (cy + offY) + 'px,0) rotate(' + rot + 'deg) scale(1)';
    });

    // Phase: 셔플 모션 (더미 교차)
    setTimeout(function() {
      var shuffleCount = 0;
      var maxShuffle = 4;
      function doShuffle() {
        if(shuffleCount >= maxShuffle) { afterShuffle(); return; }
        if(navigator.vibrate) navigator.vibrate(20);
        kcgCards.forEach(function(card) {
          var px = cx + (Math.random() - .5) * 80;
          var py = cy + (Math.random() - .5) * 60;
          var rot = (Math.random() - .5) * 40;
          card.style.transition = 'transform 120ms ease, filter 120ms';
          card.style.filter = 'brightness(1.4) blur(' + (Math.random()*2) + 'px)';
          card.style.transform = 'translate3d(' + px + 'px,' + py + 'px,0) rotate(' + rot + 'deg) scale(1.05)';
        });
        shuffleCount++;
        setTimeout(doShuffle, 160);
      }
      doShuffle();
    }, 500);

    function afterShuffle() {
      // 필터 제거
      kcgCards.forEach(function(card) { card.style.filter = ''; });

      // Phase C: 그리드 배치 (4열 × 3행 — 모든 카드가 아레나 안에 표시)
      setTimeout(function() {
        kcgPhase = 'shuffled';
        var cols = 4, cardW = layout.cardW, cardH = layout.cardH, gapX = layout.gapX, gapY = layout.gapY;
        var startX = layout.startX;
        var startY = layout.startY;

        kcgCards.forEach(function(card, i) {
          var col = i % cols;
          var row = Math.floor(i / cols);
          var x = startX + col * (cardW + gapX);
          var y = startY + row * (cardH + gapY);
          card.style.transition = 'transform ' + (350 + i * 35) + 'ms cubic-bezier(.34,1.3,.64,1)';
          card.style.zIndex = i + '';
          card.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) rotate(0deg) scale(1)';
        });

        setTimeout(function() {
          kcgAnimating = false;
          if(btn) { btn.textContent = '✦ RESHUFFLE'; btn.disabled = false; }
          _kcgSetCounter('마음이 이끄는 3장을 선택하십시오 (0 / 3)', false);
          _kcgSetHint('카드를 클릭하거나 터치하여 선택하세요 — 3장 선택 시 신탁이 시작됩니다');
        }, 700);
      }, 300);
    }
  };

  /* ── 카드 클릭 ── */
  function _kcgOnCardClick(idx) {
    if(kcgPhase !== 'shuffled') return;

    var card = kcgCards[idx];
    if(!card) return;

    // 이미 선택된 카드 클릭: 선택 취소
    var selPos = kcgSelected.indexOf(idx);
    if(selPos !== -1) {
      kcgSelected.splice(selPos, 1);
      card.classList.remove('selected');
      // 원래 팬 위치로 복귀
      _kcgFanPosition(card, idx, KCG_TOTAL);
      _kcgSetCounter('마음이 이끄는 3장을 선택하십시오 (' + kcgSelected.length + ' / 3)', false);
      return;
    }

    // 3장 꽉 찬 상태면 흔들기
    if(kcgSelected.length >= KCG_PICK) {
      if(navigator.vibrate) navigator.vibrate([40,40,40]);
      card.classList.add('shaking');
      setTimeout(function() { card.classList.remove('shaking'); }, 400);
      return;
    }

    // 선택
    if(navigator.vibrate) navigator.vibrate(20);
    kcgSelected.push(idx);
    card.classList.add('selected');
    card.style.transition = 'transform 350ms cubic-bezier(.34,1.56,.64,1), box-shadow .3s';
    card.style.zIndex = '100';

    // 그리드 위치 기준에서 위로 올려 선택 강조
    var layout = _kcgGetLayout();
    var cols = 4, cardW = layout.cardW, cardH = layout.cardH, gapX = layout.gapX, gapY = layout.gapY;
    var startX = layout.startX;
    var startY = layout.startY;
    var col = idx % cols;
    var row = Math.floor(idx / cols);
    var x = startX + col * (cardW + gapX);
    var y = startY + row * (cardH + gapY) - 28; // 28px 위로 올려 선택 강조
    card.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) rotate(0deg) scale(1.06)';

    var cnt = kcgSelected.length;
    if(cnt < KCG_PICK) {
      _kcgSetCounter('마음이 이끄는 3장을 선택하십시오 (' + cnt + ' / 3)', false);
    } else {
      // 3장 완료 → dissolve + 결과
      _kcgSetCounter('✦ 신탁을 해석하는 중...', true);
      _kcgSetHint('');
      if(navigator.vibrate) navigator.vibrate([50,30,50,30,80]);
      setTimeout(_kcgDissolveAndResult, 400);
    }
  }

  function _kcgFanPosition(card, idx, total) {
    // 이름은 유지, 실제로는 그리드 복귀
    var layout = _kcgGetLayout();
    var cols = 4, cardW = layout.cardW, cardH = layout.cardH, gapX = layout.gapX, gapY = layout.gapY;
    var startX = layout.startX;
    var startY = layout.startY;
    var col = idx % cols;
    var row = Math.floor(idx / cols);
    var x = startX + col * (cardW + gapX);
    var y = startY + row * (cardH + gapY);
    card.style.transition = 'transform 350ms cubic-bezier(.4,0,.2,1)';
    card.style.zIndex = idx + '';
    card.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) rotate(0deg) scale(1)';
  }

  /* ── 비선택 카드 모래처럼 사라짐 ── */
  function _kcgDissolveAndResult() {
    kcgPhase = 'done';
    var delay = 0;
    kcgCards.forEach(function(card, i) {
      if(kcgSelected.indexOf(i) === -1) {
        setTimeout(function() {
          card.classList.add('dissolving');
        }, delay);
        delay += 60;
      }
    });

    // 결과 표시
    setTimeout(function() {
      var stage = document.getElementById('kemetCardStage');
      var qStr = (stage && stage.dataset.question) ? stage.dataset.question : '';
      showKemetSpread(qStr, kcgSelected.slice());
    }, delay + 800);
  }

  /* ── 카운터/힌트 헬퍼 ── */
  function _kcgSetCounter(text, ready) {
    var el = document.getElementById('kcgCounter');
    if(!el) return;
    el.textContent = text;
    el.classList.toggle('ready', !!ready);
  }
  function _kcgSetHint(text) {
    var el = document.getElementById('kcgHint');
    if(el) el.textContent = text;
  }
})(); // end KCG IIFE

/* ==============================================================
   이집트 신탁 (Kemet Oracle) - 헤르메스 트리스메기스투스 신탁 시스템
============================================================== */
const KEMET_ORACLE_COPY = {
  ko: {
    readingReason: "이집트 신탁 리딩",
    promptReady: "이 신탁과 함께 열린 AI 질문문입니다. 그대로 복사해 원하는 AI에게 건네면 됩니다.",
    gateUnavailable: "결제 확인 모듈이 아직 준비되지 않았습니다.\n잠시 후 새로고침한 뒤 다시 시도해 주세요.",
    gateError: "결제 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    copyNotReady: "복사할 프롬프트가 아직 열리지 않았습니다.",
    copied: "프롬프트가 복사되었습니다.",
    copyFailed: "복사에 실패했습니다. 문장을 직접 선택해 복사해 주세요.",
    kicker: "AI ORACLE PROMPT",
    promptTitle: "AI에게 건넬 이집트 신탁 질문문",
    promptLead: "이 신탁의 상징과 세 장의 흐름을 바탕으로, AI에게 더 깊이 물을 수 있는 문장을 함께 엽니다.",
    copyButton: "프롬프트 복사",
    openButton: "ChatGPT로 열기",
    popupBlocked: "팝업이 차단되었습니다. 팝업 허용 후 다시 시도해 주세요.",
    openedAndCopied: "ChatGPT가 새 탭에서 열렸고 프롬프트도 복사되었습니다. 붙여 넣어 실행하세요.",
    openedCopyFailed: "ChatGPT는 열렸습니다. 프롬프트 복사에 실패해 직접 복사해 주세요.",
    promptAria: "이집트 신탁 AI 질문 프롬프트",
  },
  en: {
    readingReason: "Egyptian oracle reading",
    promptReady: "Here is the AI question opened together with this oracle. Copy it as it is and bring it to the AI you prefer.",
    gateUnavailable: "The payment check module is not ready yet.\nPlease refresh and try again in a moment.",
    gateError: "An error occurred while checking payment. Please try again shortly.",
    copyNotReady: "The prompt is not open yet.",
    copied: "Prompt copied.",
    copyFailed: "Copy failed. Please select and copy the text manually.",
    kicker: "AI ORACLE PROMPT",
    promptTitle: "Egyptian oracle question for AI",
    promptLead: "Based on this oracle's symbols and three-card flow, a deeper question for AI opens together with it.",
    copyButton: "Copy prompt",
    openButton: "Open ChatGPT",
    popupBlocked: "The popup was blocked. Please allow popups and try again.",
    openedAndCopied: "ChatGPT opened in a new tab and the prompt was copied. Paste it to continue.",
    openedCopyFailed: "ChatGPT opened. Copying failed, please copy manually.",
    promptAria: "Egyptian oracle AI question prompt",
  },
  ja: {
    readingReason: "エジプト神託リーディング",
    promptReady: "この神託とともに開いたAI質問文です。このままコピーして、お好きなAIに渡してください。",
    gateUnavailable: "決済確認モジュールがまだ準備できていません。\nしばらくしてから更新し、もう一度お試しください。",
    gateError: "決済確認中にエラーが発生しました。しばらくしてからもう一度お試しください。",
    copyNotReady: "コピーするプロンプトはまだ開いていません。",
    copied: "プロンプトをコピーしました。",
    copyFailed: "コピーに失敗しました。文章を直接選択してコピーしてください。",
    kicker: "AI ORACLE PROMPT",
    promptTitle: "AIに渡すエジプト神託の質問文",
    promptLead: "この神託の象徴と三枚の流れをもとに、AIへさらに深く尋ねる文をあわせて開きます。",
    copyButton: "プロンプトをコピー",
    openButton: "ChatGPTを開く",
    popupBlocked: "ポップアップがブロックされました。許可してからもう一度お試しください。",
    openedAndCopied: "ChatGPTが新しいタブで開き、プロンプトもコピーされました。貼り付けて実行してください。",
    openedCopyFailed: "ChatGPTは開きました。コピーに失敗したため、手動でコピーしてください。",
    promptAria: "エジプト神託AI質問プロンプト",
  },
  zh: {
    readingReason: "埃及神谕解读",
    promptReady: "这是与本次神谕一同开启的 AI 提问。请直接复制并交给你想使用的 AI。",
    gateUnavailable: "支付确认模块尚未准备好。\n请稍后刷新后重试。",
    gateError: "支付确认时发生错误。请稍后再试。",
    copyNotReady: "可复制的提示尚未开启。",
    copied: "提示已复制。",
    copyFailed: "复制失败。请手动选择文字并复制。",
    kicker: "AI ORACLE PROMPT",
    promptTitle: "交给 AI 的埃及神谕提问",
    promptLead: "依据这道神谕的象征与三张牌的流向，一并开启可向 AI 深入追问的句子。",
    copyButton: "复制提示",
    openButton: "打开 ChatGPT",
    popupBlocked: "弹窗被拦截。请允许弹窗后重试。",
    openedAndCopied: "ChatGPT 已在新标签页打开，提示也已复制。粘贴后即可继续。",
    openedCopyFailed: "ChatGPT 已打开。复制失败，请手动复制。",
    promptAria: "埃及神谕 AI 提问提示",
  },
};

function getKemetOracleLocale() {
  try {
    var cookieMatch = document.cookie.match(/(?:^|;\s*)(?:cd_locale|NEXT_LOCALE|lang)=([^;]+)/);
    var raw = cookieMatch ? decodeURIComponent(cookieMatch[1] || "") : "";
    if (!raw && window.localStorage) raw = localStorage.getItem("cd_locale") || localStorage.getItem("code-destiny-locale") || "";
    raw = String(raw || "").toLowerCase();
    if (raw.indexOf("ja") === 0) return "ja";
    if (raw.indexOf("zh") === 0) return "zh";
    if (raw.indexOf("en") === 0) return "en";
  } catch (_) {}
  return "ko";
}

function getKemetOracleCopy() {
  return KEMET_ORACLE_COPY[getKemetOracleLocale()] || KEMET_ORACLE_COPY.ko;
}

const KEMET_GODS = [
  {
    god: "라 (Ra)", role: "태양과 창조의 신", icon: "𓇳",
    nileOracle: "피라미드의 정점을 뚫고 솟아오르는 태양의 원반처럼, <strong>라(Ra)의 카드는 당신의 숨겨진 빛이 세상 밖으로 드러나야 할 순간</strong>임을 고합니다. 태양의 눈(Eye of Ra)은 모든 어둠을 꿰뚫습니다—지금 당신이 회피해온 진실과 마주할 용기가 필요합니다.",
    love: "<strong>이시스의 축복:</strong> 하토르 여신이 라의 눈 속에 깃들어 있듯, 당신의 열정은 상대의 마음을 환히 밝힐 만큼 강렬합니다. 그러나 태양이 너무 가까우면 대지가 타버리듯, 지나친 기대는 소중한 인연을 갈라놓을 수 있습니다. <strong>먼저 따뜻하게 빛을 비추되, 상대의 그늘까지 품어주십시오.</strong>",
    wealth: "<strong>나일강의 범람:</strong> 나일강의 태양이 대지를 살찌우듯, 당신의 재물운에 왕성한 상승 기운이 깃들어 있습니다. 지금은 새로운 시작에 적합한 시기이나, <strong>밤이 낮을 반드시 따르듯 변동에도 대비해 무리한 확장은 삼가십시오.</strong>",
    career: "<strong>세트의 시련:</strong> 라의 태양 배(Mandjet)가 하늘을 가로지르듯, 당신의 목표를 향한 항해는 이미 시작되었습니다. <strong>주변의 회의적인 시선에 흔들리지 말고, 스스로 믿는 방향으로 거침없이 나아가십시오.</strong>",
    heka: "🌅 새벽, 떠오르는 태양을 바라보며 '나는 나의 빛을 세상에 드러낼 용기가 있다'고 세 번 되뇌십시오. 오래 미뤄온 일 하나를 지금 바로 시작하십시오—라의 태양 배는 지체 없이 항해합니다.",
    papyrus: "태양은 매일 밤 저승의 심연을 통과하면서도 반드시 아침에 떠오른다—당신의 의지도 그러하다.",
    essence: "드러나는 빛",
    positional: {
      past: "지나온 시간에는 스스로 빛을 감추고 남의 그늘에 서 있던 날들이 있었습니다. <strong>그때 눌러두었던 열망이 사그라지지 않고 지금의 원동력이 되었음</strong>을 라의 원반이 증언합니다.",
      present: "지금은 태양이 정오에 이른 순간입니다—감출 수 있는 것이 아무것도 없습니다. <strong>미뤄온 결정을 이번 주 안에 매듭짓고, 당신의 이름을 걸고 나서십시오.</strong>",
      future: "머지않아 당신의 이름이 밖으로 불려 나가는 국면이 옵니다. <strong>그 빛이 부담스러워 물러서면 기회는 다른 사람의 것이 됩니다</strong>—드러날 준비를 지금부터 하십시오."
    }
  },
  {
    god: "오시리스 (Osiris)", role: "부활과 재생의 신", icon: "𓁹",
    nileOracle: "오시리스는 세트에게 조각나고 나일강에 흩뿌려졌으나, 이시스의 불굴의 사랑으로 다시 온전해졌습니다. <strong>이 카드는 당신이 지금 '죽음과 부활'의 경계선 위에 서 있음을 나타냅니다</strong>—현재의 아픔은 반드시 더 위대한 재탄생의 씨앗이 될 것입니다.",
    love: "<strong>이시스의 축복:</strong> 오시리스와 이시스처럼, 진정한 사랑은 죽음도 갈라놓지 못합니다. 지금 관계에 균열이 있다면, 이시스가 흩어진 조각을 찾아모았듯 <strong>당신도 먼저 손을 내밀어 화해의 실마리를 쥐십시오.</strong> 지속되는 사랑은 두 영혼의 서약 위에 세워집니다.",
    wealth: "<strong>나일강의 범람:</strong> 나일강의 진흙 속에서 연꽃이 피어나듯, 지금은 재물이 정체된 것처럼 보여도 땅 아래에서 뿌리가 단단히 자라고 있습니다. <strong>조급한 결정보다 장기적 안목으로 자산을 지키십시오</strong>—오시리스의 풍요는 기다리는 자에게 옵니다.",
    career: "<strong>세트의 시련:</strong> 옛 방식을 내려놓고 새로운 역할을 기꺼이 받아들일 때, <strong>당신은 오시리스처럼 더 강한 모습으로 되살아날 것입니다.</strong> 현재의 실패는 끝이 아닌, 성장을 위한 신성한 설계입니다.",
    heka: "🌿 백색 린넨 위에 당신이 버려야 할 낡은 믿음 하나를 적고, 그것을 접어 서랍 깊이 넣어두십시오. 이 작은 의식이 새로운 시작의 봉인이 됩니다—오시리스도 먼저 내려놓음으로써 부활했습니다.",
    papyrus: "오시리스는 죽어서야 비로소 진정한 왕이 되었다—가장 깊은 밤 뒤에 별이 더욱 빛난다.",
    essence: "죽음을 지나는 부활",
    positional: {
      past: "이미 한 번 무너져 본 경험이 당신의 뿌리에 있습니다. <strong>그 상실은 실패의 기록이 아니라, 다시 세워질 것의 설계도였습니다.</strong>",
      present: "지금 당신은 조각난 것을 다시 잇는 한가운데에 있습니다. <strong>서두르지 마십시오</strong>—이시스가 오시리스를 온전히 모으는 데도 긴 강을 오르내려야 했습니다.",
      future: "앞으로의 흐름은 '끝난 줄 알았던 것의 되살아남'입니다. <strong>지금 정리하고 있는 그 일이 형태를 바꿔 더 단단하게 돌아올 것이니, 문을 완전히 닫지는 마십시오.</strong>"
    }
  },
  {
    god: "이시스 (Isis)", role: "마법과 치유의 여신", icon: "𓆗",
    nileOracle: "이시스의 날개는 바람을 일으켜 죽은 자에게도 숨을 불어넣었습니다. <strong>이 카드는 당신 안에 아직 발현되지 않은 치유와 창조의 힘이 잠들어 있음을 속삭입니다.</strong> 지금 당신에게 필요한 것은 외부의 도움이 아닌, 내면의 마법을 믿는 것입니다.",
    love: "<strong>이시스의 축복:</strong> 이시스의 사랑은 세상과 죽음마저 초월했습니다. 상대방의 상처를 냉정하게 판단하기보다 따뜻하게 치유하는 역할을 맡아보십시오. <strong>지금 건네는 한마디의 위로가 영원히 기억될 사랑의 씨앗이 됩니다.</strong>",
    wealth: "<strong>나일강의 범람:</strong> 이시스는 마법의 언어 헤카(Heka)로 불운을 번창으로 바꾸었습니다. 지금 당신의 재정은 창의적 아이디어와 긴밀히 연결되어 있습니다. <strong>머리가 아닌 직관을 믿고 움직이십시오</strong>—예상치 못한 곳에서 문이 열릴 것입니다.",
    career: "<strong>세트의 시련:</strong> 이시스는 다양한 신의 비밀을 알고 있었습니다. <strong>혼자 해결하려 하지 말고 주변의 지혜를 빌리는 것이 현명합니다.</strong> 당신이 가진 지식과 네트워크를 총동원하십시오.",
    heka: "🕊️ 두 손을 가슴 위에 얹고 눈을 감으십시오. '나는 이미 치유받고 있으며, 내 안에 모든 답이 있다'고 세 번 깊이 호흡하며 읊조리십시오—이시스의 날개가 당신을 감쌉니다.",
    papyrus: "이시스는 세상 끝까지 달려가 사랑하는 이의 조각을 모았다—진심은 반드시 길을 알고 있다.",
    essence: "회복시키는 사랑의 마법",
    positional: {
      past: "지나온 시간 속에서 당신은 누군가를, 혹은 스스로를 묵묵히 치유해 왔습니다. <strong>그 돌봄의 힘이 지금 당신이 가진 가장 큰 자산으로 쌓여 있습니다.</strong>",
      present: "지금은 바깥의 해답을 찾아 헤맬 때가 아니라 <strong>내면의 힘을 믿을 때</strong>입니다. 이미 알고 있는 그 답을 오늘 실행에 옮기십시오.",
      future: "다가올 국면에서 <strong>당신의 진심과 끈기가 닫혀 있던 문을 엽니다.</strong> 포기하지 않고 찾아다니는 사람에게 길이 열린다는 것—그것이 이시스의 법칙입니다."
    }
  },
  {
    god: "호루스 (Horus)", role: "수호와 통찰의 신", icon: "𓅃",
    nileOracle: "호루스의 눈(우제트)은 전쟁에서 상처받았지만 더 강한 치유의 상징이 되었습니다. <strong>이 카드는 당신이 받은 상처가 오히려 날카로운 통찰의 눈을 키워주었음을 말합니다.</strong> 지금은 매처럼 높이 날아 전체를 조망할 때입니다.",
    love: "<strong>이시스의 축복:</strong> 호루스의 눈은 진실과 거짓을 가리지 않습니다. <strong>관계에서 보지 않으려 했던 진실과 이제는 직면해야 합니다.</strong> 그러나 판단이 앞서면 안 됩니다—진실을 본 뒤에도 사랑을 선택할 용기가 있는지 스스로에게 물어보십시오.",
    wealth: "<strong>나일강의 범람:</strong> 호루스가 세트와의 싸움에서 결국 왕권을 되찾았듯, <strong>오래 지연된 보상이나 계약이 결실을 맺을 신호가 보입니다.</strong> 포기하지 않은 당신의 인내가 정당한 보상을 불러올 것입니다.",
    career: "<strong>세트의 시련:</strong> 자잘한 문제에 발목 잡히지 말고 큰 그림을 그리십시오. <strong>당신이 옳다고 믿는다면, 물러서지 마십시오</strong>—하늘을 지배하는 매처럼 전략적 시야가 곧 승리입니다.",
    heka: "🦅 오늘 당신이 회피해온 문제 하나를 종이에 써서 내려다보십시오. 문제를 직시하는 것만으로 이미 절반은 해결됩니다—호루스의 눈은 어둠 속에서도 빛납니다.",
    papyrus: "호루스의 눈은 상처를 입었기에 오히려 더 멀리, 더 깊이 볼 수 있게 되었다.",
    essence: "상처가 벼려낸 통찰",
    positional: {
      past: "지난날의 상처와 다툼이 당신에게 남긴 것은 흉터가 아니라 시야입니다. <strong>그때 잃은 것 덕분에 지금 당신은 남들이 못 보는 것을 봅니다.</strong>",
      present: "지금은 매처럼 높이 올라 전체 판을 조망할 때입니다. <strong>눈앞의 자잘한 승부에 힘을 빼지 말고, 어디로 향하는 싸움인지부터 확인하십시오.</strong>",
      future: "오래 끌어온 다툼이나 지연된 인정이 당신 쪽으로 기우는 흐름이 보입니다. <strong>정당함을 증명할 기록과 근거를 미리 갖춰 두십시오</strong>—왕권은 준비된 호루스에게 돌아왔습니다."
    }
  },
  {
    god: "세트 (Set)", role: "혼돈과 변혁의 신", icon: "𓃣",
    nileOracle: "사막의 모래폭풍 없이는 나일강 삼각주의 비옥한 땅도 없습니다. <strong>이 카드는 당신의 삶에 찾아온 혼돈이 파괴가 아닌 변혁의 전조임을 경고합니다.</strong> 지금의 불편함을 저항하지 말고—폭풍을 타십시오.",
    love: "<strong>이시스의 축복:</strong> 세트의 에너지는 관계에서 억압된 감정들이 폭발 직전임을 나타냅니다. <strong>표면적인 평화를 위해 진심을 삼키지 마십시오.</strong> 솔직한 대화가 지금 당장은 고통스러워도, 그 뒤에 오는 진실한 고요가 훨씬 깊고 아름답습니다.",
    wealth: "<strong>나일강의 범람:</strong> 지금 당신 앞에 놓인 변동성 높은 기회는 큰 이익도 큰 손실도 줄 수 있습니다. <strong>사막을 건너는 대상(隊商)처럼, 충분한 여유 자금 없이는 모험에 나서지 마십시오.</strong>",
    career: "<strong>세트의 시련:</strong> 직장이나 프로젝트에서 예상치 못한 충돌이 나타날 수 있습니다. <strong>폭풍을 피하려 할수록 더 크게 몰아칩니다—정면 돌파 후에 새로운 질서가 도래합니다.</strong>",
    heka: "⚡ 오늘 당신을 가장 불편하게 만드는 것을 향해 '나는 이 변화를 기꺼이 받아들인다'고 말해보십시오. 세트의 폭풍은 맞서는 자에게 길을 열어줍니다.",
    papyrus: "세트의 사막이 없다면 오시리스의 부활도 없다—모든 혼돈은 새 질서의 어머니다.",
    essence: "질서를 낳는 폭풍",
    positional: {
      past: "당신이 지나온 혼란과 단절은 무의미한 파괴가 아니었습니다. <strong>그 폭풍이 낡은 것을 쓸어냈기에 지금 새로 세울 자리가 비어 있는 것입니다.</strong>",
      present: "지금 겪는 흔들림은 무너짐의 신호가 아니라 재배치의 진통입니다. <strong>폭풍의 한가운데서는 버티는 것이 아니라 방향을 트는 것이 살길입니다.</strong>",
      future: "머지않아 예상 밖의 변수가 판을 흔들 것입니다. <strong>미리 여유 자금과 두 번째 계획을 준비해 두십시오</strong>—남들에게 위기인 그 폭풍이 당신에게는 기회가 됩니다."
    }
  },
  {
    god: "토트 (Thoth)", role: "지혜와 기록의 신", icon: "𓁟",
    nileOracle: "따오기 머리의 토트 신은 신들의 회의에서 언제나 파피루스와 갈대 펜을 들고 섰습니다. <strong>이 카드는 지금 당신에게 필요한 것이 감정적 반응이 아닌 냉철한 관찰임을 일러줍니다.</strong> 진실을 글로 쓰는 순간, 그 진실은 우주에 새겨집니다.",
    love: "<strong>이시스의 축복:</strong> 토트의 펜은 거짓과 진실을 모두 기록합니다. 지금 관계에서 말하지 않은 감정들이 너무 많이 쌓여있지 않습니까? <strong>진심을 담은 편지 한 통이 수십 번의 대화보다 관계의 방향을 바꿀 수 있습니다.</strong>",
    wealth: "<strong>나일강의 범람:</strong> 지금은 새로운 수익보다 현재의 재정 상황을 정확히 파악하고 기록하는 것이 먼저입니다. <strong>숫자를 아는 자가 숫자를 지배합니다</strong>—토트의 파피루스처럼 모든 것을 기록하십시오.",
    career: "<strong>세트의 시련:</strong> 토트가 신들과 인간 사이의 중재자였듯, 지금 당신에게는 소통과 협상의 기술이 요구됩니다. <strong>당신의 전문 지식을 명확히 정리하고 표현할 준비를 하십시오—지식이 곧 가장 큰 무기입니다.</strong>",
    heka: "📝 오늘 잠들기 전 노트에 오늘의 감정, 결정, 그리고 내일의 의도를 한 문장씩 적어보십시오. 토트는 기록하는 자의 편에 서며, 기록된 의지는 반드시 현실이 됩니다.",
    papyrus: "기록되지 않은 진실은 바람에 흩어지는 사막의 모래일 뿐—생각을 글로 쓸 때 비로소 운명이 된다.",
    essence: "기록하는 지혜",
    positional: {
      past: "지나온 시간에 당신이 배우고 기록하고 삼켜온 것들이 헛되지 않았습니다. <strong>그 축적이 지금 당신 판단력의 바닥짐이 되어 있습니다.</strong>",
      present: "지금은 감정으로 반응할 때가 아니라 정확히 파악하고 적을 때입니다. <strong>상황을 종이에 옮겨 적는 순간, 뒤엉킨 문제의 절반은 이미 풀립니다.</strong>",
      future: "다가올 국면의 승부처는 말과 글, 그리고 협상입니다. <strong>당신이 아는 것을 명확한 언어로 정리해 두십시오</strong>—기록된 지혜가 결정적 순간에 당신을 변호합니다."
    }
  },
  {
    god: "아누비스 (Anubis)", role: "심판과 인도의 신", icon: "𓃢",
    nileOracle: "아누비스는 죽은 자의 심장을 마아트의 깃털과 함께 저울에 달아 영혼의 무게를 쟀습니다. <strong>이 카드가 나타난 것은 당신이 삶의 한 챕터를 닫아야 할 경계선 앞에 서 있음을 의미합니다.</strong> 무엇을 내려놓아야 다음 문이 열릴지, 솔직하게 심판하십시오.",
    love: "<strong>이시스의 축복:</strong> 아누비스의 저울에는 당신이 관계에 쏟아부은 진심의 무게가 달려 있습니다. <strong>지금 관계가 무겁게 느껴진다면, 그 무게가 사랑인지 집착인지 냉정하게 들여다보십시오.</strong> 가벼워질 용기가 때로는 가장 깊은 사랑의 표현입니다.",
    wealth: "<strong>나일강의 범람:</strong> 지금은 오래된 지출 습관, 투자, 부채를 점검해야 할 시간입니다. <strong>과거의 재정적 실수를 인정하고 하나씩 정리하십시오</strong>—청산이 곧 번영의 문을 엽니다.",
    career: "<strong>세트의 시련:</strong> 현재의 직업이나 프로젝트가 끝나가고 있다면, 그것은 더 나은 다음 단계로의 초대입니다. <strong>고대 이집트인들이 죽음을 두려워하지 않았듯, 마무리를 두려워하지 마십시오.</strong>",
    heka: "⚖️ 오늘 당신의 삶에서 '이미 끝났지만 아직 눈을 감지 못한 것' 하나를 조용히 보내주십시오. '수고했다, 이제 가도 좋다'고 마음속으로 말하십시오—아누비스가 그 영혼을 인도합니다.",
    papyrus: "아누비스는 판결하지 않는다, 다만 정직하게 달아볼 뿐이다—당신의 진심은 이미 깃털보다 가볍다.",
    essence: "정직한 마무리",
    positional: {
      past: "당신은 이미 하나의 챕터를 지나왔습니다. <strong>아직 마음이 그 문 앞을 서성인다면, 미련이 아니라 제대로 된 작별 인사를 하지 못했기 때문입니다.</strong>",
      present: "지금은 무엇을 끝내고 무엇을 데려갈지 저울에 올릴 시간입니다. <strong>정직하게 달아 보십시오</strong>—무게를 속이면 다음 문이 열리지 않습니다.",
      future: "머지않아 명확한 마무리와 새로운 시작이 함께 옵니다. <strong>끝을 두려워하지 마십시오</strong>—아누비스는 잃게 하는 신이 아니라 건너가게 하는 신입니다."
    }
  },
  {
    god: "하토르 (Hathor)", role: "사랑과 풍요의 여신", icon: "𓁷",
    nileOracle: "하토르는 황금 암소의 뿔 사이에 태양 원반을 얹고 춤을 추었습니다. <strong>이 카드는 당신에게 기쁨과 풍요가 흐를 준비가 되어 있음을 알려줍니다.</strong> 그러나 하토르는 분노하면 세크메트로 변하는 이중성이 있습니다—억누르고 있는 기쁨이 있다면 지금 풀어주십시오.",
    love: "<strong>이시스의 축복:</strong> 하토르는 이집트 최고의 사랑과 미의 여신입니다. 이 카드는 새로운 인연의 등장이나 기존 관계의 깊어짐을 강하게 암시합니다. <strong>스스로를 사랑하고 자신의 매력을 믿을 때, 하토르의 축복은 배가됩니다.</strong>",
    wealth: "<strong>나일강의 범람:</strong> 하토르는 음악, 예술, 풍요의 여신입니다. 지금 당신의 재물운은 창조적 활동과 긴밀히 연결되어 있습니다. <strong>좋아하는 일을 수익과 연결하려는 시도가 가장 큰 결실을 맺을 것입니다.</strong>",
    career: "<strong>세트의 시련:</strong> 하토르의 에너지는 딱딱한 경쟁보다 부드러운 협력과 어울립니다. <strong>사람들을 편안하게 만드는 당신의 감성이 가장 강력한 무기임을 과소평가하지 마십시오.</strong>",
    heka: "🎶 오늘 하루, 당신에게 기쁨을 주는 사소한 것 하나를 허락하십시오. 좋아하는 음악, 맛있는 음식, 가벼운 산책—하토르는 소소한 기쁨의 문을 두드리는 자에게 찾아옵니다.",
    papyrus: "하토르는 선물을 들고 매일 당신의 문 앞에 서 있다—열지 않는 것은 당신의 선택이다.",
    essence: "흘러넘치는 기쁨",
    positional: {
      past: "지나온 시간 속에 당신이 누리지 못하고 미뤄둔 기쁨들이 있습니다. <strong>그 억눌린 즐거움이 지금의 갈증으로 남아 있음</strong>을 하토르는 알고 있습니다.",
      present: "지금은 풍요가 흘러들 수 있도록 문을 여는 때입니다. <strong>스스로에게 인색하게 굴지 마십시오</strong>—기쁨을 허락하는 사람에게 사람과 기회가 모입니다.",
      future: "다가올 흐름에 새로운 인연과 결실의 기운이 실려 있습니다. <strong>다만 하토르의 선물은 문 앞까지만 옵니다—여는 것은 언제나 당신의 몫입니다.</strong>"
    }
  },
  {
    god: "바스테트 (Bastet)", role: "보호와 직관의 여신", icon: "𓃠",
    nileOracle: "고양이 머리의 바스테트는 낮에는 가정을 지키고, 밤에는 뱀 아포피스로부터 태양신 라를 수호했습니다. <strong>이 카드는 당신이 이미 예민한 직관으로 위험을 감지하고 있음을 나타냅니다.</strong> 느껴지는 불안감을 무시하지 마십시오—그것은 신이 보내는 신호입니다.",
    love: "<strong>이시스의 축복:</strong> 바스테트의 우아함처럼, 당신은 원할 때 다가오고 필요할 때 물러나는 고양이 같은 매력을 지니고 있습니다. <strong>관계에서 모든 것을 내어주기보다 당신만의 신비로운 공간을 유지하십시오</strong>—적당한 거리는 관계를 더욱 아름답게 만듭니다.",
    wealth: "<strong>나일강의 범람:</strong> 바스테트가 집과 곡물 창고를 쥐로부터 지켰듯, 지금은 재산을 늘리기보다 지키는 데 집중할 때입니다. <strong>직관이 말리는 투자나 파트너십은 보류하십시오.</strong>",
    career: "<strong>세트의 시련:</strong> 밤에 빛나는 고양이의 눈처럼, 당신은 남들이 지나치는 것을 보는 혜안이 있습니다. <strong>지금은 드러내기보다 관찰하는 시간입니다</strong>—때를 기다리는 인내가 결정적인 기회를 포착하게 합니다.",
    heka: "🐱 오늘 당신의 직감이 말하는 것 하나를 실행하십시오. 논리가 아니라 느낌을 따르는 연습이 바스테트의 수호를 깨웁니다—고양이는 결코 서두르지 않지만 언제나 정확합니다.",
    papyrus: "고양이는 결코 서두르지 않는다—그러나 반드시 필요한 순간에는 번개처럼 나타난다.",
    essence: "고요한 직관의 수호",
    positional: {
      past: "지난 시간, 당신의 직감은 여러 번 위험을 알렸고 대부분 옳았습니다. <strong>그때 무시했던 신호와 따랐던 신호를 돌아보면 지금 판단의 기준이 보입니다.</strong>",
      present: "지금은 나서기보다 지키고 관찰할 때입니다. <strong>서두르는 쪽이 지는 국면이니, 고양이처럼 조용히 지켜보다 확실한 순간에만 움직이십시오.</strong>",
      future: "머지않아 논리로는 설명되지 않는 예감이 중요한 갈림길에서 당신을 부를 것입니다. <strong>그 직감을 흘려보내지 마십시오</strong>—밤눈은 바스테트가 당신에게 준 무기입니다."
    }
  },
  {
    god: "세크메트 (Sekhmet)", role: "불꽃과 치유의 여신", icon: "𓁦",
    nileOracle: "암사자 머리의 세크메트는 인류를 멸망시킬 뻔했지만, 신들이 그녀의 갈증을 빨갛게 물든 맥주로 달랬습니다. <strong>이 카드는 당신 안에 폭발 직전의 에너지가 쌓여있음을 나타냅니다.</strong> 그 불꽃을 파괴가 아닌 창조에 쏟아부을 현명함이 지금 필요합니다.",
    love: "<strong>이시스의 축복:</strong> 세크메트의 분노는 상처받은 사랑에서 비롯됩니다. <strong>지금 상대방이 아닌 과거의 상처에 분노하고 있는 것은 아닌지 살펴보십시오.</strong> 그 뿌리를 찾아 치유하는 것이 관계 회복의 첫걸음입니다.",
    wealth: "<strong>나일강의 범람:</strong> 불꽃처럼 빠른 수익을 노리는 충동적 결정은 지금 당장 멈추십시오. <strong>감정이 안정될 때까지 중요한 금전 결정을 미루십시오</strong>—세크메트의 파괴적 에너지는 가장 먼저 재물을 삼킵니다.",
    career: "<strong>세트의 시련:</strong> 세크메트는 또한 치유의 여신이기도 합니다. 직장에서의 번아웃을 겪고 있다면, 그것은 <strong>몸과 마음이 휴식을 요청하는 신호입니다—싸우기 전에 먼저 자신을 치유하십시오.</strong>",
    heka: "🔥 타오르는 분노나 좌절감을 종이에 거침없이 쏟아내십시오. 다 쓴 뒤 그 종이를 찢어버리십시오—세크메트의 불꽃을 종이 위에서 태우고 평화로운 하토르로 돌아오십시오.",
    papyrus: "세크메트는 멸망시키러 왔다가 춤추며 돌아갔다—가장 강한 분노도 사랑 앞에 녹아든다.",
    essence: "다스려야 할 불꽃",
    positional: {
      past: "지나온 시간에 삼켜둔 분노와 소진이 아직 몸 안에 열기로 남아 있습니다. <strong>그 불은 당신이 얼마나 진심으로 임했는지의 증거이기도 합니다.</strong>",
      present: "지금 끓어오르는 에너지는 억누를 것이 아니라 겨눌 곳을 정해줘야 합니다. <strong>화가 아니라 과제 하나에 그 불을 쏟으십시오</strong>—방향 잃은 불꽃은 가장 먼저 자신을 태웁니다.",
      future: "앞으로 강한 추진력이 필요한 국면이 옵니다. <strong>그 전에 먼저 쉬고 회복하십시오</strong>—세크메트는 파괴의 여신이기 이전에 치유의 여신입니다."
    }
  },
  {
    god: "마아트 (Ma'at)", role: "진실과 우주 질서의 여신", icon: "𓆄",
    nileOracle: "마아트의 타조 깃털 하나로 모든 영혼의 심장 무게를 달았습니다. <strong>이 카드는 지금 당신의 삶에서 균형과 진실이 무엇보다 중요한 시기임을 알립니다.</strong> 우주의 저울은 속이는 법이 없습니다—당신이 뿌린 것이 무엇인지 돌아보십시오.",
    love: "<strong>이시스의 축복:</strong> 마아트의 깃털처럼 균형 잡힌 관계가 가장 오래 갑니다. <strong>지금 관계에서 한쪽이 지나치게 참거나 주고 있다면, 그 균형을 진심으로 의논하십시오</strong>—진실한 대화가 관계의 마아트를 회복합니다.",
    wealth: "<strong>나일강의 범람:</strong> 마아트는 공정하고 정직한 거래를 주관합니다. <strong>부정직한 방법을 통한 이익은 반드시 그에 상응하는 손실로 돌아옵니다</strong>—정직하고 투명한 재정 활동만이 진정한 번영을 가져다줍니다.",
    career: "<strong>세트의 시련:</strong> 마아트의 법칙은 직장에서도 통합니다. 부당함을 느낀다면, <strong>조용히 참는 것보다 정당한 채널을 통해 목소리를 높이십시오</strong>—공정하게 일하고 공정하게 인정받으십시오.",
    heka: "⚖️ 오늘 하루 단 한 가지—거짓말을 하지 않겠다고 결심하십시오. 마아트는 가장 작은 진실에서 시작하며, 우주는 그 진실한 하루를 정확히 기억합니다.",
    papyrus: "깃털 하나의 무게를 속일 수 없듯—우주는 언제나 정확하게 기억한다.",
    essence: "깃털 하나의 균형",
    positional: {
      past: "당신이 지나오며 뿌린 정직과 성실은 사라지지 않고 저울 한쪽에 고스란히 쌓여 있습니다. <strong>지금 받는 대접이 부당하게 느껴진다면, 그 무게는 반드시 되돌아옵니다.</strong>",
      present: "지금은 기울어진 균형을 바로잡을 때입니다. <strong>일과 쉼, 주는 것과 받는 것—어느 한쪽으로 쏠린 저울을 오늘 솔직하게 들여다보십시오.</strong>",
      future: "다가올 국면에서 모든 것이 제 무게대로 판가름 납니다. <strong>지름길의 유혹이 오더라도 정직한 경로를 지키십시오</strong>—마아트의 저울은 시간이 걸려도 틀리지 않습니다."
    }
  },
  {
    god: "아문 (Amun)", role: "숨겨진 자, 신들의 왕", icon: "𓇋",
    nileOracle: "아문의 이름은 '숨겨진 자'를 의미합니다. 그는 바람처럼 만물에 깃들어 있지만 눈에 보이지 않습니다. <strong>이 카드는 지금 당신 주변에서 일어나는 일들의 진짜 실체가 표면 아래 숨어있음을 경고합니다.</strong> 보이는 것만 믿지 마십시오.",
    love: "<strong>이시스의 축복:</strong> 아문처럼, 가장 깊은 사랑은 소리 높이 외치는 것이 아닌 조용히 곁에 있는 것입니다. <strong>침묵 속에 담긴 상대방의 마음을 읽어보십시오</strong>—말해지지 않은 감정들이 진짜 연결고리일 수 있습니다.",
    wealth: "<strong>나일강의 범람:</strong> 아문의 힘은 드러낼 때보다 숨겨져 있을 때 더 강합니다. <strong>당신의 재정 계획이나 투자 전략을 섣불리 공개하지 마십시오</strong>—비밀스럽게 준비한 프로젝트가 가장 크게 폭발합니다.",
    career: "<strong>세트의 시련:</strong> 은밀한 준비가 가장 완벽한 실행을 만듭니다. <strong>지금은 성과를 자랑할 때가 아니라 다음 큰 도약을 위해 조용히 실력을 쌓을 때입니다</strong>—아문-라가 그러했듯.",
    heka: "🌬️ 오늘 당신이 아무에게도 말하지 않은 가장 큰 꿈을 노트에 적으십시오. 아문에게 바치는 가장 강력한 기도는 스스로도 인정하지 않았던 욕망을 솔직하게 드러내는 것입니다.",
    papyrus: "아문은 이름이 없어도 모든 바람 속에 있다—당신의 가장 조용한 소망이 가장 강한 기도다.",
    essence: "숨겨진 힘",
    positional: {
      past: "지나온 시간, 보이지 않는 곳에서 당신을 지탱해준 힘과 조력이 있었습니다. <strong>우연처럼 보였던 도움들은 우연이 아니었습니다.</strong>",
      present: "지금은 드러내는 때가 아니라 조용히 쌓는 때입니다. <strong>계획을 섣불리 꺼내 보이지 말고, 바람처럼 소리 없이 준비를 완성하십시오.</strong>",
      future: "머지않아 표면 아래 숨어 있던 진실이 드러나며 판이 새로 읽힙니다. <strong>보이는 것만으로 결정하지 말고 한 겹 아래를 확인한 뒤 움직이십시오.</strong>"
    }
  }
];

function escapeKemetHtml(value) {
  return String(value || '').replace(/[&<>"']/g, function(ch) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
  });
}

function normalizeKemetPromptText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function stripKemetHtml(value) {
  if (typeof document === 'undefined') {
    return normalizeKemetPromptText(String(value || '').replace(/<[^>]+>/g, ' '));
  }
  var div = document.createElement('div');
  div.innerHTML = String(value || '');
  return normalizeKemetPromptText(div.textContent || div.innerText || '');
}

function buildKemetAiPrompt(data) {
  var question = normalizeKemetPromptText(data.question);
  var pastGod = data.pastGod;
  var presentGod = data.presentGod;
  var futureGod = data.futureGod;
  var catKey = data.catKey;

  return [
    '[역할]',
    '당신은 고대 이집트 케메트 신탁과 신화 상징 해석에 정통한 상담가입니다. 라, 오시리스, 이시스를 비롯한 십이 주신의 상징 체계와 헤카(주술 언어)의 전통을 깊이 이해하고 있으며, 신들의 상징을 현실의 언어로 번역해 질문자가 오늘 실제로 움직일 수 있도록 돕는 것이 당신의 일입니다.',
    '',
    '[나의 질문]',
    question,
    '',
    '[신탁 결과 — 세 장의 카드]',
    '1) 과거의 뿌리: ' + pastGod.god + ' — ' + pastGod.role,
    '   카드의 의미: ' + stripKemetHtml(pastGod.nileOracle),
    '   과거 자리 해석: ' + stripKemetHtml(pastGod.positional.past),
    '2) 현재의 흐름: ' + presentGod.god + ' — ' + presentGod.role,
    '   카드의 의미: ' + stripKemetHtml(presentGod.nileOracle),
    '   현재 자리 해석: ' + stripKemetHtml(presentGod.positional.present),
    '3) 미래의 명령: ' + futureGod.god + ' — ' + futureGod.role,
    '   카드의 의미: ' + stripKemetHtml(futureGod.nileOracle),
    '   미래 자리 해석: ' + stripKemetHtml(futureGod.positional.future),
    '',
    '[질문의 초점: ' + data.catLabel + ' (' + data.catSymbol + ')]',
    '과거(' + pastGod.god + '): ' + stripKemetHtml(pastGod[catKey]),
    '현재(' + presentGod.god + '): ' + stripKemetHtml(presentGod[catKey]),
    '미래(' + futureGod.god + '): ' + stripKemetHtml(futureGod[catKey]),
    '',
    '[오늘의 헤카(영적 처방)]',
    stripKemetHtml(pastGod.heka),
    stripKemetHtml(presentGod.heka),
    stripKemetHtml(futureGod.heka),
    '',
    '[파피루스에 남은 문장]',
    presentGod.papyrus,
    '',
    '[답변 지침]',
    '다음 순서와 원칙으로 답해 주세요.',
    '1. 첫 문단에서 내 질문에 대한 답을 결론부터 분명하게 말해 주세요. 얼버무리거나 양쪽을 다 열어두는 화법은 쓰지 마세요.',
    '2. 과거→현재→미래 세 카드를 나열하지 말고, 하나로 이어지는 이야기로 종합해 내 질문과 상황에 비추어 해석해 주세요. 위 카드 문구를 그대로 반복하지 마세요.',
    '3. 갈림길이 있다면 어느 쪽을 권하는지, 그 이유와 조심할 점을 구체적인 상황을 들어 짚어 주세요.',
    '4. 오늘 바로 실행할 수 있는 행동 한 가지를 명확하게 제시해 주세요.',
    '5. 마지막은 파피루스에 새길 만한 한 문장으로 맺어 주세요.',
    '문체: 따뜻한 존댓말로, 돌려 말하지 않는 직설적인 조언체를 쓰세요. 신비로운 분위기는 지키되 뜬구름 잡는 추상적 표현 대신 현실의 단어를 쓰세요. 분량은 800~1200자 내외.'
  ].join('\n');
}

function buildKemetSynthesis(pastGod, presentGod, futureGod, catKey) {
  var pastName = pastGod.god.split(' ')[0];
  var presentName = presentGod.god.split(' ')[0];
  var futureName = futureGod.god.split(' ')[0];
  var catClosing = {
    love: '사랑의 자리에서 이 흐름을 읽으면—과거의 매듭을 인정하는 것에서 시작해, 지금의 진심을 감추지 않을 때 다가올 인연의 문이 열립니다.',
    wealth: '재물의 자리에서 이 흐름을 읽으면—지나온 손익에서 배운 것을 기준 삼아, 지금은 큰 판보다 단단한 판을 고르십시오. 다가올 결실은 준비된 그릇만큼 담깁니다.',
    career: '성취의 자리에서 이 흐름을 읽으면—지나온 시련이 이미 당신의 자격을 증명했습니다. 지금의 선택이 방향을 정하니, 다가올 국면에서는 물러서지 말고 이름을 걸고 나서십시오.'
  }[catKey] || '';
  return '세 신이 함께 그린 지도는 이렇게 읽힙니다. 당신의 이야기는 <strong>' + pastGod.essence + '</strong>(' + pastName + ')에서 출발해, 지금 <strong>' + presentGod.essence + '</strong>(' + presentName + ')의 한가운데를 지나고 있으며, 이 강물은 <strong>' + futureGod.essence + '</strong>(' + futureName + ')을 향해 흐릅니다. 과거를 부정하지 말고 딛고 서십시오—지금의 자리가 그 위에 세워졌고, 다가올 문은 지금의 태도가 엽니다.<br><br>' + catClosing;
}

function findKemetAiPromptPanel(node) {
  return node && node.closest ? node.closest('[data-kemet-ai-prompt-card]') : null;
}

function setKemetAiPromptStatus(panel, message, tone) {
  var status = panel ? panel.querySelector('[data-kemet-ai-prompt-status]') : null;
  if (!status) return;
  status.textContent = message;
  status.setAttribute('data-tone', tone || 'info');
}

function copyKemetText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise(function(resolve, reject) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'readonly');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      var ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      ok ? resolve() : reject(new Error('copy failed'));
    } catch (err) {
      document.body.removeChild(textarea);
      reject(err);
    }
  });
}

function copyKemetAiPrompt(button) {
  var panel = findKemetAiPromptPanel(button);
  var output = panel ? panel.querySelector('[data-kemet-ai-prompt-output]') : null;
  var text = output ? output.value : '';
  var copy = getKemetOracleCopy();
  if (!text.trim()) {
    setKemetAiPromptStatus(panel, copy.copyNotReady, 'warn');
    return;
  }
  copyKemetText(text).then(function() {
    setKemetAiPromptStatus(panel, copy.copied, 'success');
  }).catch(function() {
    setKemetAiPromptStatus(panel, copy.copyFailed, 'warn');
  });
}

function openKemetAiChat(button) {
  var panel = findKemetAiPromptPanel(button);
  var output = panel ? panel.querySelector('[data-kemet-ai-prompt-output]') : null;
  var text = output ? output.value : '';
  var copy = getKemetOracleCopy();
  if (!text.trim()) {
    setKemetAiPromptStatus(panel, copy.copyNotReady, 'warn');
    return;
  }
  var url = (button && button.getAttribute && button.getAttribute('data-ai-url')) || 'https://chatgpt.com/';
  var opened = null;
  try {
    opened = window.open(url, '_blank', 'noopener,noreferrer');
  } catch (_err) {
    opened = null;
  }
  if (!opened) {
    setKemetAiPromptStatus(panel, copy.popupBlocked, 'warn');
    return;
  }
  copyKemetText(text).then(function() {
    setKemetAiPromptStatus(panel, copy.openedAndCopied, 'success');
  }).catch(function() {
    setKemetAiPromptStatus(panel, copy.openedCopyFailed, 'warn');
  });
}

function resetKemetOracle() {
  const resultDiv = document.getElementById('kemetResult');
  const worryInput = document.getElementById('kemetWorry');
  const searchBox = document.getElementById('kemetSearchBox');
  const loader = document.getElementById('kemetLoader');
  const cardStage = document.getElementById('kemetCardStage');

  if(resultDiv) { resultDiv.style.display = 'none'; resultDiv.innerHTML = ''; }
  if(worryInput) worryInput.value = '';
  if(searchBox) searchBox.style.display = 'block';
  if(loader) loader.style.display = 'none';
  if(cardStage) cardStage.style.display = 'none';
  kcgReset();
}

function openKemetModal() {
  const m = document.getElementById('kemetOracleOverlay');
  if(m) {
    m.style.display = 'block';
    if (window._perf && window._perf.lockBody) window._perf.lockBody();
    else document.body.style.overflow = 'hidden';
  }
}

function closeKemetModal() {
  const m = document.getElementById('kemetOracleOverlay');
  if(m) {
    m.style.display = 'none';
    if (window._perf && window._perf.unlockBody) window._perf.unlockBody();
    else document.body.style.overflow = '';
  }
  resetKemetOracle();
}

function consumeKemetPerUseCoin() {
  var COST = 30;
  var REASON = getKemetOracleCopy().readingReason;

    return new Promise(function(resolve) {
    if (typeof window._cdCoinGatePerUse !== 'function') {
      alert(getKemetOracleCopy().gateUnavailable);
      resolve(false);
      return;
    }

    try {
      // 🔴 featureKey 를 명시해서 넘긴다. 예전에는 사유 문자열(REASON)만 넘겼고, 게이트가 그걸
      // 한글 매핑('이집트 신탁 리딩' → openKemetModal, js/destiny-profile.js)으로만 되돌렸다.
      // en/ja/zh 로케일의 REASON 은 그 매핑에도, 영문 식별자 패턴(공백 불가)에도 안 걸려
      // featureKey 가 빈 문자열이 됐다 — 가격·회당결제 판정이 통째로 어긋나는 자리다.
      window._cdCoinGatePerUse(
        COST,
        REASON,
        function() { resolve(true); },
        function() { resolve(false); },
        {
          featureKey: 'openKemetModal',
          serviceKey: 'kemet-oracle',
          action: 'openKemetModal',
          requestId: 'kemet-oracle:' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9)
        }
      );
    } catch (_err) {
      alert(getKemetOracleCopy().gateError);
      resolve(false);
    }
  });
}

function startKemetOracle() {
  const inputEl = document.getElementById('kemetWorry');
  const qStr = (inputEl ? inputEl.value : '').trim();

  if(qStr.length < 2) {
    alert("아문-라의 제단에 올릴 질문을 세 글자 이상으로 적어주십시오.");
    if(inputEl) inputEl.focus();
    return;
  }

  const searchBox = document.getElementById('kemetSearchBox');
  const loader = document.getElementById('kemetLoader');
  const cardStage = document.getElementById('kemetCardStage');

  consumeKemetPerUseCoin().then(function(ok) {
    if (!ok) return;
    if(searchBox) searchBox.style.display = 'none';
    if(loader) loader.style.display = 'none';
    if(cardStage) {
      cardStage.style.display = 'block';
      // 질문을 카드 단계에 저장
      cardStage.dataset.question = qStr;
    }
    // 초기 원형 배치
    kcgInitCircle();
  });
}

function showKemetSpread(userInput, selectedIndices) {
  var cardStage = document.getElementById('kemetCardStage');
  var resultDiv = document.getElementById('kemetResult');
  if(!resultDiv) return;

  if(cardStage) cardStage.style.display = 'none';

  resultDiv.style.display = 'block';
  resultDiv.style.animation = 'kemetFadeIn 0.8s forwards';

  // 선택된 카드 인덱스 기반으로 신 선택
  var gods;
  if(selectedIndices && selectedIndices.length >= 3) {
    gods = selectedIndices.slice(0, 3).map(function(i) { return KEMET_GODS[i]; });
  } else {
    gods = [...KEMET_GODS].sort(() => 0.5 - Math.random()).slice(0, 3);
  }
  var pastGod = gods[0];
  var presentGod = gods[1];
  var futureGod = gods[2];

  // 질문 카테고리 감지
  var q = (userInput || '').toLowerCase();
  var catKey = 'career';
  if (/연애|사랑|남친|여친|남자|여자|결혼|이별|재회|짝사랑|썸|연인|관계|고백|헤어|외로|소개팅|권태기|배우자|남편|아내|이혼/.test(q)) catKey = 'love';
  else if (/돈|재물|재산|투자|주식|사업|부자|월급|수익|경제|빚|대출|부채|카드|알바|알바비|재정|코인|청약|적금|매매|부동산|연봉|재테크|로또|펀드|창업/.test(q)) catKey = 'wealth';

  var catLabel = catKey === 'love' ? '사랑과 관계' : catKey === 'wealth' ? '풍요와 재물' : '성취와 갈등';
  var catSymbol = catKey === 'love' ? '이시스의 축복' : catKey === 'wealth' ? '나일강의 범람' : '세트의 시련';
  var catEmoji = catKey === 'love' ? '💞' : catKey === 'wealth' ? '🌾' : '⚔️';
  var safeUserInput = escapeKemetHtml(userInput);
  var aiPromptText = buildKemetAiPrompt({
    question: userInput,
    pastGod: pastGod,
    presentGod: presentGod,
    futureGod: futureGod,
    catKey: catKey,
    catLabel: catLabel,
    catSymbol: catSymbol
  });
  var safeAiPromptText = escapeKemetHtml(aiPromptText);
  var promptCopy = getKemetOracleCopy();
  var synthesisHtml = buildKemetSynthesis(pastGod, presentGod, futureGod, catKey);

  resultDiv.innerHTML = `
    <style>
      .km-oracle-wrap { font-family: 'Noto Serif KR', 'Gowun Batang', serif; color: #f2e2c5; word-break: keep-all; line-height: 1.85; }
      .km-prologue { text-align:center; padding:24px 16px 20px; border-bottom:2px solid rgba(212,175,55,0.4); margin-bottom:28px; }
      .km-prologue-role { font-size:.78rem; letter-spacing:3px; color:rgba(212,175,55,0.6); text-transform:uppercase; margin-bottom:8px; }
      .km-prologue-quote { color:#e5c07b; font-style:italic; line-height:1.8; font-size:.98rem; }
      .km-prologue-q { display:inline-block; background:rgba(212,175,55,0.12); border:1px solid rgba(212,175,55,0.35); border-radius:6px; padding:4px 10px; color:#ffd700; font-style:normal; font-weight:700; margin:4px 2px; }

      .km-section { margin-bottom:24px; border-radius:14px; overflow:hidden; border:1px solid rgba(212,175,55,0.2); }
      .km-section-head { display:flex; align-items:center; gap:10px; padding:14px 18px; background:rgba(0,0,0,0.5); border-bottom:1px solid rgba(212,175,55,0.2); }
      .km-section-icon { font-size:1.4rem; flex-shrink:0; }
      .km-section-title { font-size:1.1rem; font-weight:900; color:#e5c07b; letter-spacing:1px; }
      .km-section-body { padding:18px; background:rgba(10,8,4,0.6); }

      .km-card-row { display:flex; flex-direction:column; gap:16px; }
      .km-card-item { display:flex; gap:14px; padding:14px; background:rgba(212,175,55,0.05); border:1px solid rgba(212,175,55,0.15); border-radius:10px; align-items:flex-start; }
      .km-card-left { flex-shrink:0; text-align:center; min-width:56px; }
      .km-card-icon { font-size:2.2rem; color:#d4af37; filter:drop-shadow(0 0 8px rgba(212,175,55,0.6)); display:block; }
      .km-card-pos { font-size:.65rem; color:rgba(212,175,55,0.55); letter-spacing:1px; margin-top:4px; white-space:nowrap; }
      .km-card-right { flex:1; min-width:0; }
      .km-card-name { font-size:1.05rem; font-weight:900; color:#ffd700; margin-bottom:4px; }
      .km-card-role { font-size:.78rem; color:rgba(212,175,55,0.6); margin-bottom:8px; letter-spacing:.5px; }
      .km-card-oracle { font-size:.9rem; color:#e2d5b8; line-height:1.8; }

      .km-cat-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }
      @media(max-width:560px){ .km-cat-grid { grid-template-columns:1fr; } }
      .km-cat-box { background:rgba(0,0,0,0.45); border:1px solid rgba(212,175,55,0.18); border-radius:10px; padding:14px; }
      .km-cat-box-head { font-size:.78rem; color:#d4af37; font-weight:900; letter-spacing:.5px; margin-bottom:8px; padding-bottom:6px; border-bottom:1px dashed rgba(212,175,55,0.2); }
      .km-cat-box-text { font-size:.85rem; color:#d4c4a0; line-height:1.75; }

      .km-heka-box { background:linear-gradient(135deg, rgba(30,15,0,0.8), rgba(50,30,5,0.7)); border:1px solid rgba(212,175,55,0.35); border-radius:12px; padding:20px; }
      .km-heka-text { font-size:.93rem; color:#e5d9b8; line-height:1.85; }

      .km-papyrus-box { background:rgba(212,175,55,0.08); border:2px solid rgba(212,175,55,0.4); border-radius:12px; padding:20px 24px; text-align:center; }
      .km-papyrus-quote { font-size:1.05rem; color:#ffd700; font-style:italic; font-weight:700; line-height:1.7; text-shadow:0 0 15px rgba(255,215,0,0.3); }

      .km-divider-line { height:1px; background:linear-gradient(90deg,transparent,rgba(212,175,55,0.35),transparent); margin:6px 0 18px; }
      .km-ai-prompt-panel { margin:24px 0 18px; padding:18px; border-radius:12px; border:1px solid rgba(212,175,55,0.28); background:linear-gradient(135deg,rgba(7,11,24,0.82),rgba(55,33,7,0.62)); box-shadow:0 18px 40px rgba(0,0,0,0.28); }
      .km-ai-prompt-head { display:flex; align-items:flex-start; gap:13px; margin-bottom:14px; }
      .km-ai-prompt-seal { display:inline-flex; align-items:center; justify-content:center; width:44px; height:44px; flex:0 0 44px; border-radius:50%; color:#facc15; background:rgba(212,175,55,0.12); border:1px solid rgba(212,175,55,0.42); font-size:1.45rem; box-shadow:0 0 24px rgba(212,175,55,0.18); }
      .km-ai-prompt-kicker { margin:0 0 4px; color:rgba(250,204,21,0.66); font-size:.72rem; font-weight:900; letter-spacing:2px; text-transform:uppercase; }
      .km-ai-prompt-title { margin:0; color:#fff2c2; font-size:1.08rem; font-weight:900; line-height:1.35; letter-spacing:0; }
      .km-ai-prompt-lead { margin:7px 0 0; color:rgba(242,226,197,0.82); font-size:.84rem; line-height:1.72; }
      .km-ai-prompt-actions { display:flex; align-items:center; gap:9px; flex-wrap:wrap; margin-top:14px; }
      .km-ai-prompt-btn { display:inline-flex; align-items:center; justify-content:center; min-height:40px; padding:0 15px; border-radius:8px; border:1px solid rgba(250,204,21,0.5); background:linear-gradient(135deg,#facc15,#d97706); color:#241407; font-size:.82rem; font-weight:900; cursor:pointer; box-shadow:0 12px 26px rgba(217,119,6,0.24); }
      .km-ai-prompt-btn:disabled { cursor:wait; opacity:.68; }
      .km-ai-prompt-btn--copy { background:rgba(15,23,42,0.82); color:#fef3c7; border-color:rgba(254,243,199,0.34); box-shadow:none; }
      .km-ai-prompt-output { width:100%; min-height:260px; margin-top:14px; padding:14px; border-radius:8px; border:1px solid rgba(250,204,21,0.24); background:rgba(0,0,0,0.42); color:#f8ecd0; font-family:'Noto Serif KR','Gowun Batang',serif; font-size:.86rem; line-height:1.78; resize:vertical; box-sizing:border-box; }
      .km-ai-prompt-status { margin:11px 0 0; color:rgba(242,226,197,0.68); font-size:.78rem; line-height:1.55; }
      .km-ai-prompt-status[data-tone="success"] { color:#bbf7d0; }
      .km-ai-prompt-status[data-tone="warn"] { color:#fde68a; }
      @media(max-width:560px){ .km-ai-prompt-panel { padding:15px 13px; } .km-ai-prompt-head { gap:10px; } .km-ai-prompt-seal { width:38px; height:38px; flex-basis:38px; font-size:1.22rem; } .km-ai-prompt-title { font-size:.98rem; } .km-ai-prompt-btn { width:100%; } }
    </style>

    <div class="km-oracle-wrap">

      <!-- 대사제 인트로 -->
      <div class="km-prologue">
        <div class="km-prologue-role">𓂀 헤르메스 트리스메기스투스의 신탁 𓂀</div>
        <p class="km-prologue-quote">
          "나일강의 상류에서 하류까지, 피라미드의 정점에서 지하 묘실까지—<br>
          <strong>50년을 신들의 언어로 운명을 읽어온 대사제가 당신의 물음,</strong><br>
          <span class="km-prologue-q">${safeUserInput}</span><br>
          에 응답하노라. 눈을 감고 나일강의 물결 소리에 귀를 기울이라."
        </p>
      </div>

      <!-- SECTION 1: 나일강의 신탁 -->
      <div class="km-section">
        <div class="km-section-head">
          <span class="km-section-icon">🏺</span>
          <span class="km-section-title">나일강의 신탁: 당신의 운명을 읽다</span>
        </div>
        <div class="km-section-body">
          <div class="km-card-row">
            <div class="km-card-item">
              <div class="km-card-left">
                <span class="km-card-icon">${pastGod.icon}</span>
                <span class="km-card-pos">過去의 뿌리</span>
              </div>
              <div class="km-card-right">
                <div class="km-card-name">${pastGod.god}</div>
                <div class="km-card-role">${pastGod.role}</div>
                <div class="km-card-oracle">${pastGod.nileOracle}</div>
                <div class="km-card-oracle" style="margin-top:10px; padding-top:10px; border-top:1px dashed rgba(212,175,55,0.25);"><strong style="color:#d4af37;">⏳ 過去의 자리에서</strong> — ${pastGod.positional.past}</div>
              </div>
            </div>
            <div class="km-card-item">
              <div class="km-card-left">
                <span class="km-card-icon">${presentGod.icon}</span>
                <span class="km-card-pos">現在의 흐름</span>
              </div>
              <div class="km-card-right">
                <div class="km-card-name">${presentGod.god}</div>
                <div class="km-card-role">${presentGod.role}</div>
                <div class="km-card-oracle">${presentGod.nileOracle}</div>
                <div class="km-card-oracle" style="margin-top:10px; padding-top:10px; border-top:1px dashed rgba(212,175,55,0.25);"><strong style="color:#d4af37;">👁️ 現在의 자리에서</strong> — ${presentGod.positional.present}</div>
              </div>
            </div>
            <div class="km-card-item">
              <div class="km-card-left">
                <span class="km-card-icon">${futureGod.icon}</span>
                <span class="km-card-pos">未來의 명령</span>
              </div>
              <div class="km-card-right">
                <div class="km-card-name">${futureGod.god}</div>
                <div class="km-card-role">${futureGod.role}</div>
                <div class="km-card-oracle">${futureGod.nileOracle}</div>
                <div class="km-card-oracle" style="margin-top:10px; padding-top:10px; border-top:1px dashed rgba(212,175,55,0.25);"><strong style="color:#d4af37;">✨ 未來의 자리에서</strong> — ${futureGod.positional.future}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SECTION: 세 신의 합 — 신탁의 종합 -->
      <div class="km-section">
        <div class="km-section-head">
          <span class="km-section-icon">𓋹</span>
          <span class="km-section-title">세 신의 합: 신탁의 종합</span>
        </div>
        <div class="km-section-body">
          <div class="km-card-oracle" style="font-size:.93rem;">${synthesisHtml}</div>
        </div>
      </div>

      <!-- SECTION 2: 카테고리별 운명의 해석 -->
      <div class="km-section">
        <div class="km-section-head">
          <span class="km-section-icon">👁️</span>
          <span class="km-section-title">카테고리별 운명의 해석</span>
        </div>
        <div class="km-section-body">
          <div style="font-size:.82rem;color:rgba(212,175,55,0.6);margin-bottom:14px;letter-spacing:1px;">
            "${safeUserInput}" — <strong style="color:#d4af37;">${catEmoji} ${catLabel} (${catSymbol})</strong> 중심으로 해석되었습니다
          </div>
          <div class="km-cat-grid">
            <div class="km-cat-box">
              <div class="km-cat-box-head">⏳ 과거 · ${pastGod.god}</div>
              <div class="km-cat-box-text">${pastGod[catKey]}</div>
            </div>
            <div class="km-cat-box">
              <div class="km-cat-box-head">👁️ 현재 · ${presentGod.god}</div>
              <div class="km-cat-box-text">${presentGod[catKey]}</div>
            </div>
            <div class="km-cat-box">
              <div class="km-cat-box-head">✨ 미래 · ${futureGod.god}</div>
              <div class="km-cat-box-text">${futureGod[catKey]}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- SECTION 3: 오늘의 영적 처방 -->
      <div class="km-section">
        <div class="km-section-head">
          <span class="km-section-icon">🕯️</span>
          <span class="km-section-title">오늘의 영적 처방 (Heka)</span>
        </div>
        <div class="km-section-body">
          <div class="km-heka-box">
            <div class="km-heka-text">
              <strong style="color:#d4af37;">첫 번째 처방 — ${pastGod.god}의 헤카</strong><br>
              ${pastGod.heka}
              <div class="km-divider-line"></div>
              <strong style="color:#d4af37;">두 번째 처방 — ${presentGod.god}의 헤카</strong><br>
              ${presentGod.heka}
              <div class="km-divider-line"></div>
              <strong style="color:#d4af37;">세 번째 처방 — ${futureGod.god}의 헤카</strong><br>
              ${futureGod.heka}
            </div>
          </div>
        </div>
      </div>

      <!-- SECTION 4: 파피루스에 새겨진 한 줄 -->
      <div class="km-section">
        <div class="km-section-head">
          <span class="km-section-icon">📜</span>
          <span class="km-section-title">파피루스에 새겨진 한 줄</span>
        </div>
        <div class="km-section-body">
          <div class="km-papyrus-box">
            <div class="km-papyrus-quote">"${presentGod.papyrus}"</div>
            <div style="margin-top:10px;font-size:.75rem;color:rgba(212,175,55,0.5);letter-spacing:2px;">— ${presentGod.god} · 헤르메스 트리스메기스투스의 신전에서</div>
          </div>
        </div>
      </div>

      <div class="km-ai-prompt-panel" data-kemet-ai-prompt-card data-marker="kemet-ai-prompt-generator-v20260619">
        <div class="km-ai-prompt-head">
          <span class="km-ai-prompt-seal" aria-hidden="true">𓂀</span>
          <div>
            <p class="km-ai-prompt-kicker">${promptCopy.kicker}</p>
            <h3 class="km-ai-prompt-title">${promptCopy.promptTitle}</h3>
            <p class="km-ai-prompt-lead">${promptCopy.promptLead}</p>
          </div>
        </div>
        <div class="km-ai-prompt-actions">
          <button class="km-ai-prompt-btn km-ai-prompt-btn--copy" type="button" data-action="copyKemetAiPrompt" data-action-pass-self="1" data-kemet-ai-prompt-copy>${promptCopy.copyButton}</button>
          <button class="km-ai-prompt-btn" type="button" data-action="openKemetAiChat" data-action-pass-self="1" data-ai-url="https://chatgpt.com/" data-kemet-ai-prompt-open>ChatGPT</button>
          <button class="km-ai-prompt-btn" type="button" data-action="openKemetAiChat" data-action-pass-self="1" data-ai-url="https://gemini.google.com/app" data-kemet-ai-prompt-open>제미나이</button>
          <button class="km-ai-prompt-btn" type="button" data-action="openKemetAiChat" data-action-pass-self="1" data-ai-url="https://claude.ai/new" data-kemet-ai-prompt-open>클로드</button>
          <button class="km-ai-prompt-btn" type="button" data-action="openKemetAiChat" data-action-pass-self="1" data-ai-url="https://grok.com/" data-kemet-ai-prompt-open>그록</button>
        </div>
        <p class="km-ai-prompt-status" data-kemet-ai-prompt-status>${promptCopy.promptReady}</p>
        <textarea class="km-ai-prompt-output" data-kemet-ai-prompt-output readonly aria-label="${promptCopy.promptAria}">${safeAiPromptText}</textarea>
      </div>

      <div style="width:100%; text-align:center; padding:10px 0 6px;">
        <button class="kemet-retry" onclick="resetKemetOracle()">↻ 새로운 신탁 묻기</button>
      </div>
    </div>
  `;

  // 결과창 상단으로 스크롤
  var overlayEl = document.getElementById('kemetOracleOverlay');
  if(overlayEl) {
    setTimeout(function() { overlayEl.scrollTo({ top: 0, behavior: 'smooth' }); }, 100);
  }
}
