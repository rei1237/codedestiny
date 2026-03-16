      
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

  /* ── 아레나 초기화 ── */
  window.kcgInitCircle = function() {
    kcgPhase = 'init';
    kcgSelected = [];
    kcgAnimating = false;
    var arena = document.getElementById('kcgArena');
    if(!arena) return;
    arena.innerHTML = '';
    kcgCards = [];

    var cx = 160, cy = 160, R = 130;
    for(var i = 0; i < KCG_TOTAL; i++) {
      var card = _kcgMakeCard(i);
      arena.appendChild(card);
      kcgCards.push(card);

      // 원형 배치
      var angle = (2 * Math.PI / KCG_TOTAL) * i - Math.PI / 2;
      var x = cx + R * Math.cos(angle) - 35;
      var y = cy + R * Math.sin(angle) - 50;
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
    card.addEventListener('click', function() {
      _kcgOnCardClick(parseInt(card.dataset.idx));
    });
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
    var cx = 145, cy = 120;
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
        var cols = 4, cardW = 70, cardH = 100, gapX = 10, gapY = 23;
        var startX = Math.floor((340 - cols * cardW - (cols - 1) * gapX) / 2); // 15
        var startY = 15;

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
    var cols = 4, cardW = 70, cardH = 100, gapX = 10, gapY = 23;
    var startX = Math.floor((340 - cols * cardW - (cols - 1) * gapX) / 2);
    var startY = 15;
    var col = idx % cols;
    var row = Math.floor(idx / cols);
    var x = startX + col * (cardW + gapX);
    var y = startY + row * (cardH + gapY) - 28; // 28px 위로 올려 선택 강조
    card.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) rotate(0deg) scale(1.08)';

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
    var cols = 4, cardW = 70, cardH = 100, gapX = 10, gapY = 23;
    var startX = Math.floor((340 - cols * cardW - (cols - 1) * gapX) / 2);
    var startY = 15;
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
const KEMET_GODS = [
  {
    god: "라 (Ra)", role: "태양과 창조의 신", icon: "𓇳",
    nileOracle: "피라미드의 정점을 뚫고 솟아오르는 태양의 원반처럼, <strong>라(Ra)의 카드는 당신의 숨겨진 빛이 세상 밖으로 드러나야 할 순간</strong>임을 고합니다. 태양의 눈(Eye of Ra)은 모든 어둠을 꿰뚫습니다—지금 당신이 회피해온 진실과 마주할 용기가 필요합니다.",
    love: "<strong>이시스의 축복:</strong> 하토르 여신이 라의 눈 속에 깃들어 있듯, 당신의 열정은 상대의 마음을 환히 밝힐 만큼 강렬합니다. 그러나 태양이 너무 가까우면 대지가 타버리듯, 지나친 기대는 소중한 인연을 갈라놓을 수 있습니다. <strong>먼저 따뜻하게 빛을 비추되, 상대의 그늘까지 품어주십시오.</strong>",
    wealth: "<strong>나일강의 범람:</strong> 나일강의 태양이 대지를 살찌우듯, 당신의 재물운에 왕성한 상승 기운이 깃들어 있습니다. 지금은 새로운 시작에 적합한 시기이나, <strong>밤이 낮을 반드시 따르듯 변동에도 대비해 무리한 확장은 삼가십시오.</strong>",
    career: "<strong>세트의 시련:</strong> 라의 태양 배(Mandjet)가 하늘을 가로지르듯, 당신의 목표를 향한 항해는 이미 시작되었습니다. <strong>주변의 회의적인 시선에 흔들리지 말고, 스스로 믿는 방향으로 거침없이 나아가십시오.</strong>",
    heka: "🌅 새벽, 떠오르는 태양을 바라보며 '나는 나의 빛을 세상에 드러낼 용기가 있다'고 세 번 되뇌십시오. 오래 미뤄온 일 하나를 지금 바로 시작하십시오—라의 태양 배는 지체 없이 항해합니다.",
    papyrus: "태양은 매일 밤 저승의 심연을 통과하면서도 반드시 아침에 떠오른다—당신의 의지도 그러하다."
  },
  {
    god: "오시리스 (Osiris)", role: "부활과 재생의 신", icon: "𓁹",
    nileOracle: "오시리스는 세트에게 조각나고 나일강에 흩뿌려졌으나, 이시스의 불굴의 사랑으로 다시 온전해졌습니다. <strong>이 카드는 당신이 지금 '죽음과 부활'의 경계선 위에 서 있음을 나타냅니다</strong>—현재의 아픔은 반드시 더 위대한 재탄생의 씨앗이 될 것입니다.",
    love: "<strong>이시스의 축복:</strong> 오시리스와 이시스처럼, 진정한 사랑은 죽음도 갈라놓지 못합니다. 지금 관계에 균열이 있다면, 이시스가 흩어진 조각을 찾아모았듯 <strong>당신도 먼저 손을 내밀어 화해의 실마리를 쥐십시오.</strong> 지속되는 사랑은 두 영혼의 서약 위에 세워집니다.",
    wealth: "<strong>나일강의 범람:</strong> 나일강의 진흙 속에서 연꽃이 피어나듯, 지금은 재물이 정체된 것처럼 보여도 땅 아래에서 뿌리가 단단히 자라고 있습니다. <strong>조급한 결정보다 장기적 안목으로 자산을 지키십시오</strong>—오시리스의 풍요는 기다리는 자에게 옵니다.",
    career: "<strong>세트의 시련:</strong> 옛 방식을 내려놓고 새로운 역할을 기꺼이 받아들일 때, <strong>당신은 오시리스처럼 더 강한 모습으로 되살아날 것입니다.</strong> 현재의 실패는 끝이 아닌, 성장을 위한 신성한 설계입니다.",
    heka: "🌿 백색 린넨 위에 당신이 버려야 할 낡은 믿음 하나를 적고, 그것을 접어 서랍 깊이 넣어두십시오. 이 작은 의식이 새로운 시작의 봉인이 됩니다—오시리스도 먼저 내려놓음으로써 부활했습니다.",
    papyrus: "오시리스는 죽어서야 비로소 진정한 왕이 되었다—가장 깊은 밤 뒤에 별이 더욱 빛난다."
  },
  {
    god: "이시스 (Isis)", role: "마법과 치유의 여신", icon: "𓆗",
    nileOracle: "이시스의 날개는 바람을 일으켜 죽은 자에게도 숨을 불어넣었습니다. <strong>이 카드는 당신 안에 아직 발현되지 않은 치유와 창조의 힘이 잠들어 있음을 속삭입니다.</strong> 지금 당신에게 필요한 것은 외부의 도움이 아닌, 내면의 마법을 믿는 것입니다.",
    love: "<strong>이시스의 축복:</strong> 이시스의 사랑은 세상과 죽음마저 초월했습니다. 상대방의 상처를 냉정하게 판단하기보다 따뜻하게 치유하는 역할을 맡아보십시오. <strong>지금 건네는 한마디의 위로가 영원히 기억될 사랑의 씨앗이 됩니다.</strong>",
    wealth: "<strong>나일강의 범람:</strong> 이시스는 마법의 언어 헤카(Heka)로 불운을 번창으로 바꾸었습니다. 지금 당신의 재정은 창의적 아이디어와 긴밀히 연결되어 있습니다. <strong>머리가 아닌 직관을 믿고 움직이십시오</strong>—예상치 못한 곳에서 문이 열릴 것입니다.",
    career: "<strong>세트의 시련:</strong> 이시스는 다양한 신의 비밀을 알고 있었습니다. <strong>혼자 해결하려 하지 말고 주변의 지혜를 빌리는 것이 현명합니다.</strong> 당신이 가진 지식과 네트워크를 총동원하십시오.",
    heka: "🕊️ 두 손을 가슴 위에 얹고 눈을 감으십시오. '나는 이미 치유받고 있으며, 내 안에 모든 답이 있다'고 세 번 깊이 호흡하며 읊조리십시오—이시스의 날개가 당신을 감쌉니다.",
    papyrus: "이시스는 세상 끝까지 달려가 사랑하는 이의 조각을 모았다—진심은 반드시 길을 알고 있다."
  },
  {
    god: "호루스 (Horus)", role: "수호와 통찰의 신", icon: "𓅃",
    nileOracle: "호루스의 눈(우제트)은 전쟁에서 상처받았지만 더 강한 치유의 상징이 되었습니다. <strong>이 카드는 당신이 받은 상처가 오히려 날카로운 통찰의 눈을 키워주었음을 말합니다.</strong> 지금은 매처럼 높이 날아 전체를 조망할 때입니다.",
    love: "<strong>이시스의 축복:</strong> 호루스의 눈은 진실과 거짓을 가리지 않습니다. <strong>관계에서 보지 않으려 했던 진실과 이제는 직면해야 합니다.</strong> 그러나 판단이 앞서면 안 됩니다—진실을 본 뒤에도 사랑을 선택할 용기가 있는지 스스로에게 물어보십시오.",
    wealth: "<strong>나일강의 범람:</strong> 호루스가 세트와의 싸움에서 결국 왕권을 되찾았듯, <strong>오래 지연된 보상이나 계약이 결실을 맺을 신호가 보입니다.</strong> 포기하지 않은 당신의 인내가 정당한 보상을 불러올 것입니다.",
    career: "<strong>세트의 시련:</strong> 자잘한 문제에 발목 잡히지 말고 큰 그림을 그리십시오. <strong>당신이 옳다고 믿는다면, 물러서지 마십시오</strong>—하늘을 지배하는 매처럼 전략적 시야가 곧 승리입니다.",
    heka: "🦅 오늘 당신이 회피해온 문제 하나를 종이에 써서 내려다보십시오. 문제를 직시하는 것만으로 이미 절반은 해결됩니다—호루스의 눈은 어둠 속에서도 빛납니다.",
    papyrus: "호루스의 눈은 상처를 입었기에 오히려 더 멀리, 더 깊이 볼 수 있게 되었다."
  },
  {
    god: "세트 (Set)", role: "혼돈과 변혁의 신", icon: "𓃣",
    nileOracle: "사막의 모래폭풍 없이는 나일강 삼각주의 비옥한 땅도 없습니다. <strong>이 카드는 당신의 삶에 찾아온 혼돈이 파괴가 아닌 변혁의 전조임을 경고합니다.</strong> 지금의 불편함을 저항하지 말고—폭풍을 타십시오.",
    love: "<strong>이시스의 축복:</strong> 세트의 에너지는 관계에서 억압된 감정들이 폭발 직전임을 나타냅니다. <strong>표면적인 평화를 위해 진심을 삼키지 마십시오.</strong> 솔직한 대화가 지금 당장은 고통스러워도, 그 뒤에 오는 진실한 고요가 훨씬 깊고 아름답습니다.",
    wealth: "<strong>나일강의 범람:</strong> 지금 당신 앞에 놓인 변동성 높은 기회는 큰 이익도 큰 손실도 줄 수 있습니다. <strong>사막을 건너는 대상(隊商)처럼, 충분한 여유 자금 없이는 모험에 나서지 마십시오.</strong>",
    career: "<strong>세트의 시련:</strong> 직장이나 프로젝트에서 예상치 못한 충돌이 나타날 수 있습니다. <strong>폭풍을 피하려 할수록 더 크게 몰아칩니다—정면 돌파 후에 새로운 질서가 도래합니다.</strong>",
    heka: "⚡ 오늘 당신을 가장 불편하게 만드는 것을 향해 '나는 이 변화를 기꺼이 받아들인다'고 말해보십시오. 세트의 폭풍은 맞서는 자에게 길을 열어줍니다.",
    papyrus: "세트의 사막이 없다면 오시리스의 부활도 없다—모든 혼돈은 새 질서의 어머니다."
  },
  {
    god: "토트 (Thoth)", role: "지혜와 기록의 신", icon: "𓁟",
    nileOracle: "따오기 머리의 토트 신은 신들의 회의에서 언제나 파피루스와 갈대 펜을 들고 섰습니다. <strong>이 카드는 지금 당신에게 필요한 것이 감정적 반응이 아닌 냉철한 관찰임을 일러줍니다.</strong> 진실을 글로 쓰는 순간, 그 진실은 우주에 새겨집니다.",
    love: "<strong>이시스의 축복:</strong> 토트의 펜은 거짓과 진실을 모두 기록합니다. 지금 관계에서 말하지 않은 감정들이 너무 많이 쌓여있지 않습니까? <strong>진심을 담은 편지 한 통이 수십 번의 대화보다 관계의 방향을 바꿀 수 있습니다.</strong>",
    wealth: "<strong>나일강의 범람:</strong> 지금은 새로운 수익보다 현재의 재정 상황을 정확히 파악하고 기록하는 것이 먼저입니다. <strong>숫자를 아는 자가 숫자를 지배합니다</strong>—토트의 파피루스처럼 모든 것을 기록하십시오.",
    career: "<strong>세트의 시련:</strong> 토트가 신들과 인간 사이의 중재자였듯, 지금 당신에게는 소통과 협상의 기술이 요구됩니다. <strong>당신의 전문 지식을 명확히 정리하고 표현할 준비를 하십시오—지식이 곧 가장 큰 무기입니다.</strong>",
    heka: "📝 오늘 잠들기 전 노트에 오늘의 감정, 결정, 그리고 내일의 의도를 한 문장씩 적어보십시오. 토트는 기록하는 자의 편에 서며, 기록된 의지는 반드시 현실이 됩니다.",
    papyrus: "기록되지 않은 진실은 바람에 흩어지는 사막의 모래일 뿐—생각을 글로 쓸 때 비로소 운명이 된다."
  },
  {
    god: "아누비스 (Anubis)", role: "심판과 인도의 신", icon: "𓃢",
    nileOracle: "아누비스는 죽은 자의 심장을 마아트의 깃털과 함께 저울에 달아 영혼의 무게를 쟀습니다. <strong>이 카드가 나타난 것은 당신이 삶의 한 챕터를 닫아야 할 경계선 앞에 서 있음을 의미합니다.</strong> 무엇을 내려놓아야 다음 문이 열릴지, 솔직하게 심판하십시오.",
    love: "<strong>이시스의 축복:</strong> 아누비스의 저울에는 당신이 관계에 쏟아부은 진심의 무게가 달려 있습니다. <strong>지금 관계가 무겁게 느껴진다면, 그 무게가 사랑인지 집착인지 냉정하게 들여다보십시오.</strong> 가벼워질 용기가 때로는 가장 깊은 사랑의 표현입니다.",
    wealth: "<strong>나일강의 범람:</strong> 지금은 오래된 지출 습관, 투자, 부채를 점검해야 할 시간입니다. <strong>과거의 재정적 실수를 인정하고 하나씩 정리하십시오</strong>—청산이 곧 번영의 문을 엽니다.",
    career: "<strong>세트의 시련:</strong> 현재의 직업이나 프로젝트가 끝나가고 있다면, 그것은 더 나은 다음 단계로의 초대입니다. <strong>고대 이집트인들이 죽음을 두려워하지 않았듯, 마무리를 두려워하지 마십시오.</strong>",
    heka: "⚖️ 오늘 당신의 삶에서 '이미 끝났지만 아직 눈을 감지 못한 것' 하나를 조용히 보내주십시오. '수고했다, 이제 가도 좋다'고 마음속으로 말하십시오—아누비스가 그 영혼을 인도합니다.",
    papyrus: "아누비스는 판결하지 않는다, 다만 정직하게 달아볼 뿐이다—당신의 진심은 이미 깃털보다 가볍다."
  },
  {
    god: "하토르 (Hathor)", role: "사랑과 풍요의 여신", icon: "𓁷",
    nileOracle: "하토르는 황금 암소의 뿔 사이에 태양 원반을 얹고 춤을 추었습니다. <strong>이 카드는 당신에게 기쁨과 풍요가 흐를 준비가 되어 있음을 알려줍니다.</strong> 그러나 하토르는 분노하면 세크메트로 변하는 이중성이 있습니다—억누르고 있는 기쁨이 있다면 지금 풀어주십시오.",
    love: "<strong>이시스의 축복:</strong> 하토르는 이집트 최고의 사랑과 미의 여신입니다. 이 카드는 새로운 인연의 등장이나 기존 관계의 깊어짐을 강하게 암시합니다. <strong>스스로를 사랑하고 자신의 매력을 믿을 때, 하토르의 축복은 배가됩니다.</strong>",
    wealth: "<strong>나일강의 범람:</strong> 하토르는 음악, 예술, 풍요의 여신입니다. 지금 당신의 재물운은 창조적 활동과 긴밀히 연결되어 있습니다. <strong>좋아하는 일을 수익과 연결하려는 시도가 가장 큰 결실을 맺을 것입니다.</strong>",
    career: "<strong>세트의 시련:</strong> 하토르의 에너지는 딱딱한 경쟁보다 부드러운 협력과 어울립니다. <strong>사람들을 편안하게 만드는 당신의 감성이 가장 강력한 무기임을 과소평가하지 마십시오.</strong>",
    heka: "🎶 오늘 하루, 당신에게 기쁨을 주는 사소한 것 하나를 허락하십시오. 좋아하는 음악, 맛있는 음식, 가벼운 산책—하토르는 소소한 기쁨의 문을 두드리는 자에게 찾아옵니다.",
    papyrus: "하토르는 선물을 들고 매일 당신의 문 앞에 서 있다—열지 않는 것은 당신의 선택이다."
  },
  {
    god: "바스테트 (Bastet)", role: "보호와 직관의 여신", icon: "𓃠",
    nileOracle: "고양이 머리의 바스테트는 낮에는 가정을 지키고, 밤에는 뱀 아포피스로부터 태양신 라를 수호했습니다. <strong>이 카드는 당신이 이미 예민한 직관으로 위험을 감지하고 있음을 나타냅니다.</strong> 느껴지는 불안감을 무시하지 마십시오—그것은 신이 보내는 신호입니다.",
    love: "<strong>이시스의 축복:</strong> 바스테트의 우아함처럼, 당신은 원할 때 다가오고 필요할 때 물러나는 고양이 같은 매력을 지니고 있습니다. <strong>관계에서 모든 것을 내어주기보다 당신만의 신비로운 공간을 유지하십시오</strong>—적당한 거리는 관계를 더욱 아름답게 만듭니다.",
    wealth: "<strong>나일강의 범람:</strong> 바스테트가 집과 곡물 창고를 쥐로부터 지켰듯, 지금은 재산을 늘리기보다 지키는 데 집중할 때입니다. <strong>직관이 말리는 투자나 파트너십은 보류하십시오.</strong>",
    career: "<strong>세트의 시련:</strong> 밤에 빛나는 고양이의 눈처럼, 당신은 남들이 지나치는 것을 보는 혜안이 있습니다. <strong>지금은 드러내기보다 관찰하는 시간입니다</strong>—때를 기다리는 인내가 결정적인 기회를 포착하게 합니다.",
    heka: "🐱 오늘 당신의 직감이 말하는 것 하나를 실행하십시오. 논리가 아니라 느낌을 따르는 연습이 바스테트의 수호를 깨웁니다—고양이는 결코 서두르지 않지만 언제나 정확합니다.",
    papyrus: "고양이는 결코 서두르지 않는다—그러나 반드시 필요한 순간에는 번개처럼 나타난다."
  },
  {
    god: "세크메트 (Sekhmet)", role: "불꽃과 치유의 여신", icon: "𓁦",
    nileOracle: "암사자 머리의 세크메트는 인류를 멸망시킬 뻔했지만, 신들이 그녀의 갈증을 빨갛게 물든 맥주로 달랬습니다. <strong>이 카드는 당신 안에 폭발 직전의 에너지가 쌓여있음을 나타냅니다.</strong> 그 불꽃을 파괴가 아닌 창조에 쏟아부을 현명함이 지금 필요합니다.",
    love: "<strong>이시스의 축복:</strong> 세크메트의 분노는 상처받은 사랑에서 비롯됩니다. <strong>지금 상대방이 아닌 과거의 상처에 분노하고 있는 것은 아닌지 살펴보십시오.</strong> 그 뿌리를 찾아 치유하는 것이 관계 회복의 첫걸음입니다.",
    wealth: "<strong>나일강의 범람:</strong> 불꽃처럼 빠른 수익을 노리는 충동적 결정은 지금 당장 멈추십시오. <strong>감정이 안정될 때까지 중요한 금전 결정을 미루십시오</strong>—세크메트의 파괴적 에너지는 가장 먼저 재물을 삼킵니다.",
    career: "<strong>세트의 시련:</strong> 세크메트는 또한 치유의 여신이기도 합니다. 직장에서의 번아웃을 겪고 있다면, 그것은 <strong>몸과 마음이 휴식을 요청하는 신호입니다—싸우기 전에 먼저 자신을 치유하십시오.</strong>",
    heka: "🔥 타오르는 분노나 좌절감을 종이에 거침없이 쏟아내십시오. 다 쓴 뒤 그 종이를 찢어버리십시오—세크메트의 불꽃을 종이 위에서 태우고 평화로운 하토르로 돌아오십시오.",
    papyrus: "세크메트는 멸망시키러 왔다가 춤추며 돌아갔다—가장 강한 분노도 사랑 앞에 녹아든다."
  },
  {
    god: "마아트 (Ma'at)", role: "진실과 우주 질서의 여신", icon: "𓆄",
    nileOracle: "마아트의 타조 깃털 하나로 모든 영혼의 심장 무게를 달았습니다. <strong>이 카드는 지금 당신의 삶에서 균형과 진실이 무엇보다 중요한 시기임을 알립니다.</strong> 우주의 저울은 속이는 법이 없습니다—당신이 뿌린 것이 무엇인지 돌아보십시오.",
    love: "<strong>이시스의 축복:</strong> 마아트의 깃털처럼 균형 잡힌 관계가 가장 오래 갑니다. <strong>지금 관계에서 한쪽이 지나치게 참거나 주고 있다면, 그 균형을 진심으로 의논하십시오</strong>—진실한 대화가 관계의 마아트를 회복합니다.",
    wealth: "<strong>나일강의 범람:</strong> 마아트는 공정하고 정직한 거래를 주관합니다. <strong>부정직한 방법을 통한 이익은 반드시 그에 상응하는 손실로 돌아옵니다</strong>—정직하고 투명한 재정 활동만이 진정한 번영을 가져다줍니다.",
    career: "<strong>세트의 시련:</strong> 마아트의 법칙은 직장에서도 통합니다. 부당함을 느낀다면, <strong>조용히 참는 것보다 정당한 채널을 통해 목소리를 높이십시오</strong>—공정하게 일하고 공정하게 인정받으십시오.",
    heka: "⚖️ 오늘 하루 단 한 가지—거짓말을 하지 않겠다고 결심하십시오. 마아트는 가장 작은 진실에서 시작하며, 우주는 그 진실한 하루를 정확히 기억합니다.",
    papyrus: "깃털 하나의 무게를 속일 수 없듯—우주는 언제나 정확하게 기억한다."
  },
  {
    god: "아문 (Amun)", role: "숨겨진 자, 신들의 왕", icon: "𓇋",
    nileOracle: "아문의 이름은 '숨겨진 자'를 의미합니다. 그는 바람처럼 만물에 깃들어 있지만 눈에 보이지 않습니다. <strong>이 카드는 지금 당신 주변에서 일어나는 일들의 진짜 실체가 표면 아래 숨어있음을 경고합니다.</strong> 보이는 것만 믿지 마십시오.",
    love: "<strong>이시스의 축복:</strong> 아문처럼, 가장 깊은 사랑은 소리 높이 외치는 것이 아닌 조용히 곁에 있는 것입니다. <strong>침묵 속에 담긴 상대방의 마음을 읽어보십시오</strong>—말해지지 않은 감정들이 진짜 연결고리일 수 있습니다.",
    wealth: "<strong>나일강의 범람:</strong> 아문의 힘은 드러낼 때보다 숨겨져 있을 때 더 강합니다. <strong>당신의 재정 계획이나 투자 전략을 섣불리 공개하지 마십시오</strong>—비밀스럽게 준비한 프로젝트가 가장 크게 폭발합니다.",
    career: "<strong>세트의 시련:</strong> 은밀한 준비가 가장 완벽한 실행을 만듭니다. <strong>지금은 성과를 자랑할 때가 아니라 다음 큰 도약을 위해 조용히 실력을 쌓을 때입니다</strong>—아문-라가 그러했듯.",
    heka: "🌬️ 오늘 당신이 아무에게도 말하지 않은 가장 큰 꿈을 노트에 적으십시오. 아문에게 바치는 가장 강력한 기도는 스스로도 인정하지 않았던 욕망을 솔직하게 드러내는 것입니다.",
    papyrus: "아문은 이름이 없어도 모든 바람 속에 있다—당신의 가장 조용한 소망이 가장 강한 기도다."
  }
];

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

  if(searchBox) searchBox.style.display = 'none';
  if(loader) loader.style.display = 'none';
  if(cardStage) {
    cardStage.style.display = 'block';
    // 질문을 카드 단계에 저장
    cardStage.dataset.question = qStr;
  }
  // 초기 원형 배치
  kcgInitCircle();
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
  if (/연애|사랑|남친|여친|남자|여자|결혼|이별|재회|짝사랑|썸|연인|관계|고백|헤어|외로/.test(q)) catKey = 'love';
  else if (/돈|재물|재산|투자|주식|사업|부자|월급|수익|경제|빚|대출|부채|카드|알바|알바비|재정/.test(q)) catKey = 'wealth';

  var catLabel = catKey === 'love' ? '사랑과 관계' : catKey === 'wealth' ? '풍요와 재물' : '성취와 갈등';
  var catSymbol = catKey === 'love' ? '이시스의 축복' : catKey === 'wealth' ? '나일강의 범람' : '세트의 시련';
  var catEmoji = catKey === 'love' ? '💞' : catKey === 'wealth' ? '🌾' : '⚔️';

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
    </style>

    <div class="km-oracle-wrap">

      <!-- 대사제 인트로 -->
      <div class="km-prologue">
        <div class="km-prologue-role">𓂀 헤르메스 트리스메기스투스의 신탁 𓂀</div>
        <p class="km-prologue-quote">
          "나일강의 상류에서 하류까지, 피라미드의 정점에서 지하 묘실까지—<br>
          <strong>50년을 신들의 언어로 운명을 읽어온 대사제가 당신의 물음,</strong><br>
          <span class="km-prologue-q">${userInput}</span><br>
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
              </div>
            </div>
          </div>
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
            "${userInput}" — <strong style="color:#d4af37;">${catEmoji} ${catLabel} (${catSymbol})</strong> 중심으로 해석되었습니다
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
