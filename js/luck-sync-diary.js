/* ===================================================================
   Luck-Sync Diary (운구 기일 다이어리)
   기존 사주 분석 엔진(G_PILLARS, G_POWER, G_JONG)과 연동
   LocalStorage 기반 날짜별 저장
   =================================================================== */
(function () {
  'use strict';

  /* ─── 오행 메타 ─────────────────────────────────────────────── */
  var ELEM = {
    wood:  { cn: '목(木)', ko: '木', short: '목', color: '#4ade80', neon: '#22d876', badge: '🌱', lotto: '민트', bg: 'rgba(16,185,129,0.10)' },
    fire:  { cn: '화(火)', ko: '火', short: '화', color: '#f97316', neon: '#fb923c', badge: '🔥', lotto: '코랄', bg: 'rgba(249,115,22,0.10)' },
    earth: { cn: '토(土)', ko: '土', short: '토', color: '#d97706', neon: '#fbbf24', badge: '🤎', lotto: '베이지', bg: 'rgba(217,119,6,0.10)' },
    metal: { cn: '금(金)', ko: '金', short: '금', color: '#94a3b8', neon: '#cbd5e1', badge: '⚡', lotto: '실버', bg: 'rgba(148,163,184,0.10)' },
    water: { cn: '수(水)', ko: '水', short: '수', color: '#60a5fa', neon: '#7dd3fc', badge: '💧', lotto: '네이비', bg: 'rgba(96,165,250,0.10)' }
  };

  /* ─── 행운 아이템 풀 ─────────────────────────────────────────── */
  var LUCKY_ITEMS = {
    wood:  [
      { emoji: '🌱', name: '미니 화분', tip: '오늘은 초록초록한 기운! 화분 하나 들여봐~' },
      { emoji: '🪴', name: '관엽식물', tip: '집에 녹색 생명을 더하면 기운 UP!' },
      { emoji: '📗', name: '초록 다이어리', tip: '오늘의 계획을 초록 노트에 적어봐!' },
      { emoji: '🧶', name: '에코백', tip: '초록색 에코백 메고 갓생 출발~!' },
      { emoji: '🎋', name: '대나무 제품', tip: '환경도 지키고 목 기운도 충전~' },
      { emoji: '🌿', name: '허브티', tip: '민트 or 캐모마일로 힐링 타임~' }
    ],
    fire:  [
      { emoji: '🔥', name: '아메리카노', tip: '에너지 활활! 커피 한 잔으로 불꽃 ON~' },
      { emoji: '☕', name: '따뜻한 라테', tip: '따뜻한 음료로 내 안의 불씨를 살려봐!' },
      { emoji: '🕯️', name: '캔들', tip: '촛불 켜고 집중력 200% 부스팅~' },
      { emoji: '🎈', name: '레드 포인트템', tip: '빨간 악세사리 하나로 폼 폭발!!' },
      { emoji: '🌶️', name: '매운 음식', tip: '오늘은 매운 거 먹어야 기운이 나~' },
      { emoji: '💄', name: '레드 립/네일', tip: '레드 컬러로 자신감 MAX~!' }
    ],
    earth: [
      { emoji: '🤎', name: '베이지 니트', tip: '안정적인 땅의 기운. 베이지 컬러 GO~' },
      { emoji: '🏺', name: '도자기 컵', tip: '흙의 온기 담긴 도자기 컵으로 커피를~' },
      { emoji: '🧺', name: '정리 바구니', tip: '공간 정리하면 인생도 정리됨 ㄹㅇ' },
      { emoji: '🍠', name: '고구마 간식', tip: '든든한 고구마로 뱃속 채워~' },
      { emoji: '📚', name: '다이어리 정리', tip: '낡은 노트 정리하고 새 시작!' },
      { emoji: '🧴', name: '흙내음 향수', tip: '흙내음 향 제품으로 감성 충전~' }
    ],
    metal: [
      { emoji: '💍', name: '실버 링', tip: '날카로운 금속의 힘! 실버 액세서리 끼Go~' },
      { emoji: '⌚', name: '시계 확인', tip: '시간 관리의 왕이 되는 날! 일정 check~' },
      { emoji: '📱', name: '앱 정리', tip: '불필요한 앱 삭제로 디지털 다이어트~' },
      { emoji: '✂️', name: '정리 미션', tip: '오래된 물건 정리 = 새로운 기운 입장~' },
      { emoji: '🔑', name: '메탈 키링', tip: '메탈 열쇠고리로 포인트 팍팍~' },
      { emoji: '💻', name: 'To-Do 리스트', tip: '오늘 할 일 체크리스트 작성 고고~!' }
    ],
    water: [
      { emoji: '💧', name: '파란 텀블러', tip: '파란 텀블러 쓰며 수분 충전 갓생~' },
      { emoji: '🌊', name: '파도 ASMR', tip: '파도 소리 들으며 명상 5분 챌린지~!' },
      { emoji: '🎧', name: '음악 감상', tip: '이어폰 꽂고 플로우 타임~' },
      { emoji: '🧘', name: '5분 명상', tip: '유연한 물처럼~ 명상으로 리셋!' },
      { emoji: '📖', name: '독서', tip: '지식의 물이 흘러들어오는 독서 타임~' },
      { emoji: '🍵', name: '차 한 잔', tip: '따뜻한 차 한 잔으로 마음 정화~' }
    ]
  };

  /* ─── 십성 가이드 ─────────────────────────────────────────────── */
  var TENSTAR_GUIDE = {
    '비견': { guide: '나만의 길을 개척하는 날! 독립적으로 결정하고 직진해봐~', vibe: '자립 에너지', color: '#6366f1' },
    '겁재': { guide: '승부사 기질 폭발! 도전하고 싶었던 일에 과감하게 GO~', vibe: '도전 에너지', color: '#8b5cf6' },
    '식신': { guide: '맛있는 오늘! 좋아하는 음식 먹고 취미 시간을 가져봐~', vibe: '여유 에너지', color: '#22c55e' },
    '상관': { guide: '창의력 MAX 데이! 아이디어 노트에 생각 쏟아내봐~', vibe: '창의 에너지', color: '#f59e0b' },
    '편재': { guide: '대범하게 투자하는 날~ 큰 그림 그리고 기회를 잡아!', vibe: '확장 에너지', color: '#f97316' },
    '정재': { guide: '알뜰살뜰 재테크 데이! 지출 체크하고 저축 리뷰해봐~', vibe: '절약 에너지', color: '#eab308' },
    '편관': { guide: '카리스마 발동! 어려운 일 정면 돌파하는 날이야~', vibe: '극복 에너지', color: '#ef4444' },
    '정관': { guide: '모범생 모드 ON! 규칙적으로 하루를 계획해봐~', vibe: '정돈 에너지', color: '#3b82f6' },
    '편인': { guide: '영감 폭발! 혼자만의 시간으로 창의 충전~', vibe: '직관 에너지', color: '#a855f7' },
    '정인': { guide: '배움의 날! 새로운 것 배우거나 책 한 챕터 읽어봐~', vibe: '성장 에너지', color: '#06b6d4' }
  };

  /* ─── 천간/지지 오행 맵 ─────────────────────────────────────── */
  var GAN_ELEM = {
    '甲': 'wood', '乙': 'wood', '丙': 'fire', '丁': 'fire',
    '戊': 'earth', '己': 'earth', '庚': 'metal', '辛': 'metal',
    '壬': 'water', '癸': 'water'
  };
  var GAN_KO = {
    '甲': '갑목', '乙': '을목', '丙': '병화', '丁': '정화', '戊': '무토',
    '己': '기토', '庚': '경금', '辛': '신금', '壬': '임수', '癸': '계수'
  };
  var JI_ELEM = {
    '子': 'water', '丑': 'earth', '寅': 'wood', '卯': 'wood',
    '辰': 'earth', '巳': 'fire', '午': 'fire', '未': 'earth',
    '申': 'metal', '酉': 'metal', '戌': 'earth', '亥': 'water'
  };
  var GAN_LIST = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  var ZHI_LIST = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

  /* ─── 십성 계산 ─────────────────────────────────────────────── */
  var ELEM_LIST = ['wood','fire','earth','metal','water'];
  var SHENG = { wood:'water', fire:'wood', earth:'fire', metal:'earth', water:'metal' };
  var GEN   = { wood:'fire',  fire:'earth', earth:'metal', metal:'water', water:'wood' };
  var KE    = { wood:'earth', fire:'metal', earth:'water', metal:'wood', water:'fire' };

  function calcTenStar(dayGan, targetGan) {
    var dEl = GAN_ELEM[dayGan], tEl = GAN_ELEM[targetGan];
    if (!dEl || !tEl) return null;
    var yangGans = ['甲','丙','戊','庚','壬'];
    var dY = yangGans.indexOf(dayGan) >= 0;
    var tY = yangGans.indexOf(targetGan) >= 0;
    var same = dY === tY;
    if (tEl === dEl)           return same ? '비견' : '겁재';
    if (tEl === GEN[dEl])      return same ? '식신' : '상관';
    if (tEl === KE[dEl])       return same ? '편재' : '정재';
    if (tEl === KE[GEN[GEN[GEN[GEN[dEl]]]]]) {
      // controlled by target (克我): 대입법 대신 역KE
      // nothing → handled below
    }
    // 나를 극하는 오행 (克我)
    var keMe = null;
    var els =  ELEM_LIST;
    for (var i = 0; i < els.length; i++) {
      if (KE[els[i]] === dEl) { keMe = els[i]; break; }
    }
    if (tEl === keMe)          return same ? '편관' : '정관';
    if (tEl === SHENG[dEl])    return same ? '편인' : '정인';
    return null;
  }

  /* ─── 오늘 일진 계산 ─────────────────────────────────────────── */
  function getTodayGanZhi() {
    var now = new Date();
    var y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate(), h = now.getHours();
    // 1순위: 사주 엔진 내장 함수 사용
    if (typeof window.getGanZhiForDate === 'function') {
      return window.getGanZhiForDate(y, m, d, h);
    }
    // 2순위: KasiEngine.getGanji 사용
    if (window.KasiEngine && typeof window.KasiEngine.getGanji === 'function') {
      try {
        var gz = window.KasiEngine.getGanji(new Date(y, m - 1, d, h));
        var iljin = gz && (gz.iljin || gz.day);
        if (iljin && iljin.length >= 2) {
          return { g: iljin[0], j: iljin[1] };
        }
      } catch (e) {}
    }
    // 3순위: 60갑자 사이클 수동 계산
    // 기준: 2024-01-01 = 癸卯 일진 (갑자사이클 39번째, 0-indexed 39)
    var base = Date.UTC(2024, 0, 1);
    var cur  = Date.UTC(y, m - 1, d);
    var diff = Math.round((cur - base) / 86400000);
    var idx  = ((39 + diff) % 60 + 60) % 60;
    return { g: GAN_LIST[idx % 10], j: ZHI_LIST[idx % 12] };
  }

  /* ─── 갓생 5대 지수 계산 ─────────────────────────────────────── */
  function calcGodlifeScores(pillars, power, jong, todayGZ) {
    var base = { wealth: 50, love: 50, fame: 50, health: 50, study: 50 };
    if (!pillars || !pillars.d) return base;

    var dEl    = GAN_ELEM[pillars.d.g]  || 'earth';
    var yons   = (power && power.yongshin)  || [];
    var kis    = (power && power.kijishin)  || [];
    var todayEl = todayGZ ? (GAN_ELEM[todayGZ.g] || 'earth') : 'earth';

    function score(els) {
      var s = 50;
      els.forEach(function (el) {
        if (yons.indexOf(el) >= 0)          s += 18;
        if (kis.indexOf(el) >= 0)           s -= 13;
        if (el === todayEl)                 s += 10;
        if (SHENG[todayEl] === el)          s +=  5;
        if (KE[todayEl]    === el)          s -=  8;
        if (GEN[todayEl]   === el)          s +=  3;
      });
      if (power && power.isStrong)          s +=  5;
      return Math.min(95, Math.max(15, Math.round(s)));
    }

    // keMe: 나를 극하는 오행
    var keMe = 'metal';
    ELEM_LIST.forEach(function (el) { if (KE[el] === dEl) keMe = el; });

    var wealthEl = KE[dEl];   // 내가 극하는 오행 → 재물성
    var loveEl   = GEN[dEl];  // 내가 생하는 오행 → 식상 → 표현/연애
    var fameEl   = keMe;      // 나를 극하는 오행 → 관성 → 명예
    var healthEl = dEl;       // 일간 자체 → 건강
    var studyEl  = SHENG[dEl];// 나를 생하는 오행 → 인성 → 학습

    return {
      wealth: score([wealthEl]),
      love:   score([loveEl, GEN[loveEl]]),
      fame:   score([fameEl]),
      health: score([healthEl, yons[0] || 'earth']),
      study:  score([studyEl])
    };
  }

  /* ─── 행운 오행 결정 ─────────────────────────────────────────── */
  function getLuckyElement(power, jong, todayGZ) {
    if (jong && jong.isJong && jong.dominant) return jong.dominant;
    if (power && power.yongshin && power.yongshin.length > 0) return power.yongshin[0];
    if (todayGZ) return GAN_ELEM[todayGZ.g] || 'wood';
    return 'wood';
  }

  /* ─── LocalStorage 헬퍼 ──────────────────────────────────────── */
  var LS_KEY = 'luck_sync_diary_v2';

  function loadDiary() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch (e) { return {}; }
  }
  function saveDiary(data) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch (e) {}
  }
  function getTodayKey() {
    var now = new Date();
    return now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0');
  }
  function getTodayEntry(diary) {
    var key = getTodayKey();
    if (!diary[key]) {
      diary[key] = { date: key, challenges: [], lotto: null, nightLog: '', feedback: null, moodEmoji: '' };
    }
    return diary[key];
  }

  /* ─── 레이더 차트 (Canvas) ───────────────────────────────────── */
  function drawRadar(scores) {
    var canvas = document.getElementById('lsdRadarCanvas');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var cx = W / 2, cy = H / 2;
    var R = Math.min(W, H) / 2 - 36;
    var N = 5;
    var labels  = ['재물 💰', '애정 💕', '명예 👑', '건강 💚', '학습 📚'];
    var vals    = [scores.wealth, scores.love, scores.fame, scores.health, scores.study];
    var dotColors = ['#fbbf24', '#f472b6', '#a78bfa', '#4ade80', '#60a5fa'];

    function angle(i) { return (Math.PI * 2 * i / N) - Math.PI / 2; }

    ctx.clearRect(0, 0, W, H);

    // 배경 그리드
    for (var r = 1; r <= 5; r++) {
      ctx.beginPath();
      for (var i = 0; i < N; i++) {
        var a = angle(i), pr = R * r / 5;
        var x = cx + pr * Math.cos(a), y = cy + pr * Math.sin(a);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = r === 5 ? 'rgba(148,163,184,0.4)' : 'rgba(148,163,184,0.15)';
      ctx.lineWidth = r === 5 ? 1.5 : 1;
      ctx.stroke();
    }

    // 축선
    for (var i = 0; i < N; i++) {
      var a = angle(i);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a));
      ctx.strokeStyle = 'rgba(148,163,184,0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 데이터 폴리곤
    ctx.beginPath();
    for (var i = 0; i < N; i++) {
      var a = angle(i);
      var pr = R * vals[i] / 100;
      var x = cx + pr * Math.cos(a), y = cy + pr * Math.sin(a);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    grad.addColorStop(0, 'rgba(129,140,248,0.5)');
    grad.addColorStop(1, 'rgba(129,140,248,0.08)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 점 + 레이블
    for (var i = 0; i < N; i++) {
      var a = angle(i);
      var pr = R * vals[i] / 100;
      var x = cx + pr * Math.cos(a), y = cy + pr * Math.sin(a);

      // 글로우 점
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = dotColors[i];
      ctx.shadowColor = dotColors[i];
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // 레이블
      var lx = cx + (R + 22) * Math.cos(a);
      var ly = cy + (R + 22) * Math.sin(a);
      ctx.fillStyle = dotColors[i];
      ctx.font = 'bold 10px "Noto Sans KR", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[i] + ' ' + vals[i], lx, ly);
    }
  }

  /* ─── 챌린지 빌드 ─────────────────────────────────────────────── */
  var CHALLENGE_SETS = {
    wood:  ['🌱 초록 식물이나 에코 아이템 하나 챙기기', '🌿 산책 or 공원에서 자연 바라보기'],
    fire:  ['🔥 따뜻한 음료로 에너지 충전하기', '🕯️ 15분 집중 모드 (타이머 ON)'],
    earth: ['🤎 책상/방 짧게 정리정돈 하기', '🏺 흙내음 향 제품 or 차 한 잔'],
    metal: ['⚡ 스마트폰 앱 정리 or To-Do 리스트 작성', '💍 실버 or 메탈 소품 포인트'],
    water: ['💧 물 충분히 마시기 (2L 목표)', '🎧 좋아하는 음악으로 감성 충전']
  };

  function buildChallenges(luckyEl, mainTenStar) {
    var diary = loadDiary();
    var entry = getTodayEntry(diary);
    var container = document.getElementById('lsdChallenges');
    if (!container) return;

    var elemChallenges = (CHALLENGE_SETS[luckyEl] || CHALLENGE_SETS.earth);
    var allChallenges = [
      { id: 'c1', text: elemChallenges[0], type: 'element' },
      { id: 'c2', text: elemChallenges[1], type: 'element' },
      { id: 'c3', text: '📝 오늘 할 일 3가지 적기', type: 'plan' },
      { id: 'c4', text: '🚶 10분 이상 걷거나 스트레칭 하기', type: 'health' },
      { id: 'c5', text: '💧 물 한 컵 마시기', type: 'health' }
    ];
    if (mainTenStar && TENSTAR_GUIDE[mainTenStar]) {
      allChallenges.push({ id: 'c6', text: '⚡ ' + mainTenStar + '의 날 — ' + TENSTAR_GUIDE[mainTenStar].vibe + ' 한 가지 실천', type: 'tenstar' });
    }

    container.innerHTML = allChallenges.map(function (c) {
      var checked = (entry.challenges || []).indexOf(c.id) >= 0;
      return '<label class="lsd-challenge-item' + (checked ? ' is-done' : '') + '" data-challenge-id="' + c.id + '">' +
        '<span class="lsd-check-box">' + (checked ? '✔' : '') + '</span>' +
        '<span class="lsd-challenge-text">' + c.text + '</span>' +
        '</label>';
    }).join('');

    // 클릭 이벤트
    container.querySelectorAll('.lsd-challenge-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var id = item.dataset.challengeId;
        var isDone = item.classList.contains('is-done');
        var d = loadDiary();
        var e = getTodayEntry(d);
        if (!e.challenges) e.challenges = [];
        if (isDone) {
          e.challenges = e.challenges.filter(function (x) { return x !== id; });
          item.classList.remove('is-done');
          item.querySelector('.lsd-check-box').textContent = '';
        } else {
          if (e.challenges.indexOf(id) < 0) e.challenges.push(id);
          item.classList.add('is-done');
          item.querySelector('.lsd-check-box').textContent = '✔';
        }
        saveDiary(d);
      });
    });
  }

  /* ─── 기록 렌더링 ─────────────────────────────────────────────── */
  function renderHistory() {
    var diary = loadDiary();
    var list = document.getElementById('lsdHistoryList');
    if (!list) return;
    var keys = Object.keys(diary).sort().reverse();
    if (keys.length === 0) {
      list.innerHTML = '<p class="lsd-empty">아직 기록이 없어요~ 오늘부터 시작해봐!</p>';
      return;
    }
    var feedbackIcon = { matched: '🎯', partial: '🤔', missed: '🌀' };
    list.innerHTML = keys.slice(0, 30).map(function (k) {
      var e = diary[k];
      var fi = feedbackIcon[e.feedback] || '';
      var mood = e.moodEmoji || '';
      var lotto = e.lotto ? (e.lotto.emoji + ' ' + e.lotto.name) : '';
      var doneCount = (e.challenges || []).length;
      return '<div class="lsd-history-item">' +
        '<div class="lsd-history-date">' + k + ' ' + mood + '</div>' +
        '<div class="lsd-history-meta">' +
          (fi  ? '<span class="lsd-history-tag">' + fi + '  매칭도</span>' : '') +
          (lotto ? '<span class="lsd-history-tag">🎱 ' + lotto + '</span>' : '') +
          (doneCount > 0 ? '<span class="lsd-history-tag">✅ 미션 ' + doneCount + '완</span>' : '') +
        '</div>' +
        (e.nightLog ? '<div class="lsd-history-log">"' + escHtml(e.nightLog) + '"</div>' : '') +
      '</div>';
    }).join('');
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ─── 탭 전환 ─────────────────────────────────────────────────── */
  function switchTab(tabName) {
    document.querySelectorAll('.lsd-tab').forEach(function (t) {
      var active = t.dataset.tab === tabName;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    var panelMap = {
      dashboard: 'lsdPanelDashboard',
      lotto:     'lsdPanelLotto',
      challenge: 'lsdPanelChallenge',
      night:     'lsdPanelNight',
      history:   'lsdPanelHistory'
    };
    Object.keys(panelMap).forEach(function (k) {
      var el = document.getElementById(panelMap[k]);
      if (el) el.style.display = (k === tabName) ? 'block' : 'none';
    });
    if (tabName === 'history') renderHistory();
  }

  /* ─── 가챠 로또 ───────────────────────────────────────────────── */
  var _luckyEl = 'wood';
  var _gachaRunning = false;

  function startLotto() {
    if (_gachaRunning) return;
    _gachaRunning = true;
    var globe   = document.getElementById('lsdGlobeInner');
    var result  = document.getElementById('lsdLottoResult');
    var btn     = document.getElementById('lsdLottoBtn');
    if (!globe || !btn) { _gachaRunning = false; return; }

    btn.disabled = true;
    result.style.display = 'none';
    globe.classList.add('is-spinning');

    setTimeout(function () {
      globe.classList.remove('is-spinning');
      btn.disabled = false;
      _gachaRunning = false;

      var pool = LUCKY_ITEMS[_luckyEl] || LUCKY_ITEMS.wood;
      var item = pool[Math.floor(Math.random() * pool.length)];
      var e    = ELEM[_luckyEl] || ELEM.earth;

      var ballEl  = document.getElementById('lsdResultBall');
      var emojiEl = document.getElementById('lsdResultEmoji');
      var nameEl  = document.getElementById('lsdResultName');
      var tipEl   = document.getElementById('lsdResultTip');

      if (ballEl)  {
        ballEl.textContent = e.short;
        ballEl.style.background = 'radial-gradient(circle at 35% 35%, ' + e.neon + ', ' + e.color + ')';
        ballEl.style.boxShadow  = '0 0 30px ' + e.neon + '88, 0 0 60px ' + e.color + '44';
        ballEl.style.color = '#fff';
      }
      if (emojiEl) emojiEl.textContent = item.emoji;
      if (nameEl)  nameEl.textContent  = item.name;
      if (tipEl)   tipEl.textContent   = item.tip;

      result.style.display = 'block';
      result.classList.add('lsd-result--pop');
      setTimeout(function () { result.classList.remove('lsd-result--pop'); }, 400);

      // 저장
      var d = loadDiary();
      getTodayEntry(d).lotto = { element: _luckyEl, emoji: item.emoji, name: item.name };
      saveDiary(d);
    }, 1800);
  }

  /* ─── 모달 HTML 생성 ─────────────────────────────────────────── */
  function buildModal() {
    if (document.getElementById('luckSyncDiaryModal')) return;

    var modal = document.createElement('div');
    modal.id = 'luckSyncDiaryModal';
    modal.className = 'lsd-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Luck-Sync 갓생 다이어리');
    modal.style.display = 'none';

    modal.innerHTML = [
      '<div class="lsd-shell">',
        '<button class="lsd-close" data-action="closeLuckSyncDiary" aria-label="닫기">✕</button>',

        /* HEADER */
        '<header class="lsd-header">',
          '<div class="lsd-header-glow" aria-hidden="true"></div>',
          '<div class="lsd-header-img-wrap" aria-hidden="true">',
            '<img src="/fuctionassets/godlife.webp" alt="" class="lsd-header-img" width="80" height="80" loading="lazy" decoding="async">',
          '</div>',
          '<div class="lsd-kicker">✦ Luck-Sync Diary ✦</div>',
          '<h2 class="lsd-title">갓생 운구기일 다이어리</h2>',
          '<p class="lsd-sub" id="lsdTodayDate"></p>',
        '</header>',

        /* TABS */
        '<nav class="lsd-tabs" role="tablist" aria-label="다이어리 탭">',
          '<button class="lsd-tab is-active" role="tab" data-tab="dashboard" aria-selected="true">📊 대시보드</button>',
          '<button class="lsd-tab" role="tab" data-tab="lotto"     aria-selected="false">🎰 럭키뽑기</button>',
          '<button class="lsd-tab" role="tab" data-tab="challenge" aria-selected="false">✅ 오운완</button>',
          '<button class="lsd-tab" role="tab" data-tab="night"     aria-selected="false">🌙 야간회고</button>',
          '<button class="lsd-tab" role="tab" data-tab="history"   aria-selected="false">📅 기록</button>',
        '</nav>',

        /* ── PANEL: DASHBOARD ── */
        '<section class="lsd-panel" id="lsdPanelDashboard" role="tabpanel">',

          /* 사주 원국 미니 위젯 */
          '<div class="lsd-saju-widget" id="lsdSajuWidget">',
            '<div class="lsd-widget-label">✦ 나의 일간(日干) 오행</div>',
            '<div class="lsd-daymaster" id="lsdDayMaster">—</div>',
            '<div class="lsd-widget-badges" id="lsdElemBadges"></div>',
          '</div>',

          /* 오늘의 에너지 카드 */
          '<div class="lsd-energy-card" id="lsdEnergyCard">',
            '<div class="lsd-energy-top">',
              '<div class="lsd-energy-iljin" id="lsdEnergyIljin">오늘의 일진 로딩 중...</div>',
              '<div class="lsd-energy-star" id="lsdEnergyStar">십성: —</div>',
            '</div>',
            '<div class="lsd-energy-guide" id="lsdEnergyGuide">사주를 먼저 분석하면 정확한 에너지 가이드를 받을 수 있어요!</div>',
          '</div>',

          /* 갓생 지수 레이더 */
          '<div class="lsd-radar-wrap">',
            '<h3 class="lsd-section-title">💫 오늘의 갓생 지수</h3>',
            '<div class="lsd-radar-container">',
              '<canvas id="lsdRadarCanvas" width="300" height="300" class="lsd-radar" aria-label="갓생 5대 지수 레이더 차트"></canvas>',
            '</div>',
            '<div class="lsd-luck-elem-row" id="lsdLuckElemRow"></div>',
          '</div>',

        '</section>',

        /* ── PANEL: LOTTO ── */
        '<section class="lsd-panel" id="lsdPanelLotto" role="tabpanel" style="display:none">',
          '<h3 class="lsd-section-title">🎰 럭키 비키 가챠 뽑기</h3>',
          '<p class="lsd-section-sub">오늘의 행운 오행 기반으로 LUCKY ITEM을 뽑아봐~!</p>',

          '<div class="lsd-machine" id="lsdLottoMachine" aria-live="polite">',
            '<div class="lsd-machine-globe">',
              '<div class="lsd-globe-inner" id="lsdGlobeInner" aria-hidden="true">',
                '<span class="lsd-ball lsd-ball--wood">木</span>',
                '<span class="lsd-ball lsd-ball--fire">火</span>',
                '<span class="lsd-ball lsd-ball--earth">土</span>',
                '<span class="lsd-ball lsd-ball--metal">金</span>',
                '<span class="lsd-ball lsd-ball--water">水</span>',
              '</div>',
              '<div class="lsd-machine-shine" aria-hidden="true"></div>',
            '</div>',
            '<div class="lsd-lucky-elem-hint" id="lsdLuckyElemHint"></div>',
            '<button class="lsd-lotto-btn" id="lsdLottoBtn" type="button">',
              '🎱 오늘의 럭키 비키 뽑기',
            '</button>',
          '</div>',

          '<div class="lsd-lotto-result" id="lsdLottoResult" style="display:none">',
            '<div class="lsd-result-ball" id="lsdResultBall"></div>',
            '<div class="lsd-result-emoji" id="lsdResultEmoji"></div>',
            '<div class="lsd-result-name"  id="lsdResultName"></div>',
            '<div class="lsd-result-tip"   id="lsdResultTip"></div>',
            '<button class="lsd-lotto-redraw" type="button" id="lsdRedrawBtn">🔄 다시 뽑기</button>',
          '</div>',
        '</section>',

        /* ── PANEL: CHALLENGE ── */
        '<section class="lsd-panel" id="lsdPanelChallenge" role="tabpanel" style="display:none">',
          '<h3 class="lsd-section-title">✅ 오운완 챌린지</h3>',
          '<p class="lsd-section-sub">오늘의 갓생 미션을 완료하고 기운을 쌓아봐~!</p>',
          '<div class="lsd-challenges" id="lsdChallenges"></div>',

          '<div class="lsd-mood-row">',
            '<p class="lsd-mood-label">지금 나의 기분은?</p>',
            '<div class="lsd-mood-emojis" id="lsdMoodEmojis">',
              '<button type="button" class="lsd-mood-btn" data-emoji="🔥">🔥</button>',
              '<button type="button" class="lsd-mood-btn" data-emoji="😊">😊</button>',
              '<button type="button" class="lsd-mood-btn" data-emoji="😌">😌</button>',
              '<button type="button" class="lsd-mood-btn" data-emoji="😐">😐</button>',
              '<button type="button" class="lsd-mood-btn" data-emoji="😔">😔</button>',
              '<button type="button" class="lsd-mood-btn" data-emoji="🥱">🥱</button>',
            '</div>',
          '</div>',
        '</section>',

        /* ── PANEL: NIGHT LOG ── */
        '<section class="lsd-panel" id="lsdPanelNight" role="tabpanel" style="display:none">',
          '<h3 class="lsd-section-title">🌙 사주 야간 회고</h3>',
          '<p class="lsd-section-sub">오늘 하루 사주 에너지와 얼마나 맞았나요?</p>',

          '<div class="lsd-night-match">',
            '<p class="lsd-night-label">오늘 운세와의 매칭도</p>',
            '<div class="lsd-match-btns">',
              '<button type="button" class="lsd-match-btn" data-feedback="matched">🎯 딱 맞았어!</button>',
              '<button type="button" class="lsd-match-btn" data-feedback="partial">🤔 반반이었어</button>',
              '<button type="button" class="lsd-match-btn" data-feedback="missed">🌀 전혀 달랐어</button>',
            '</div>',
          '</div>',

          '<label class="lsd-diary-label" for="lsdNightInput">✍️ 오늘의 한 줄 사주 일기</label>',
          '<textarea id="lsdNightInput" class="lsd-diary-textarea" maxlength="300"',
            'placeholder="예: 정재의 날이라더니 진짜 지출 체크했더니 3만원 절약했다ㅋㅋ"></textarea>',
          '<div class="lsd-char-count"><span id="lsdCharCount">0</span>/300</div>',
          '<button class="lsd-save-btn" type="button" id="lsdSaveNightBtn">💾 저장하기</button>',
          '<div class="lsd-save-feedback" id="lsdSaveFeedback" style="display:none">✅ 저장됐어~!</div>',
        '</section>',

        /* ── PANEL: HISTORY ── */
        '<section class="lsd-panel" id="lsdPanelHistory" role="tabpanel" style="display:none">',
          '<h3 class="lsd-section-title">📅 나의 운구 기일 기록</h3>',
          '<p class="lsd-section-sub">날짜별로 저장된 다이어리 기록이에요~</p>',
          '<div class="lsd-history-list" id="lsdHistoryList"></div>',
          '<button class="lsd-clear-btn" type="button" id="lsdClearBtn">🗑️ 전체 기록 삭제</button>',
        '</section>',

      '</div>' /* /lsd-shell */
    ].join('');

    document.body.appendChild(modal);
  }

  /* ─── 모달 오픈 ──────────────────────────────────────────────── */
  function openDiary() {
    buildModal();
    var modal = document.getElementById('luckSyncDiaryModal');
    if (!modal) return;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    /* 오늘 날짜 */
    var now  = new Date();
    var days = ['일','월','화','수','목','금','토'];
    var dateEl = document.getElementById('lsdTodayDate');
    if (dateEl) {
      dateEl.textContent = now.getFullYear() + '년 ' + (now.getMonth()+1) + '월 ' + now.getDate() + '일 (' + days[now.getDay()] + ')';
    }

    /* 사주 엔진 데이터 */
    var pillars = window.G_PILLARS || null;
    var power   = window.G_POWER   || null;
    var jong    = window.G_JONG    || null;

    /* 일간 위젯 */
    var dayMasterEl = document.getElementById('lsdDayMaster');
    if (pillars && pillars.d && pillars.d.g) {
      var dg = pillars.d.g;
      var dEl = GAN_ELEM[dg] || 'earth';
      var eInfo = ELEM[dEl];
      dayMasterEl.innerHTML = '<span style="color:' + eInfo.neon + ';font-size:2rem">' + dg + '</span>' +
        ' <small style="color:' + eInfo.color + '">' + (GAN_KO[dg] || dg) + ' · ' + eInfo.cn + '</small>';
    } else {
      dayMasterEl.textContent = '사주 분석 후 표시됩니다';
      dayMasterEl.style.opacity = '0.5';
    }

    /* 오행 비율 배지 */
    var badgesEl = document.getElementById('lsdElemBadges');
    if (badgesEl && pillars) {
      var cnt = { wood:0, fire:0, earth:0, metal:0, water:0 };
      var chars = [
        pillars.y && pillars.y.g, pillars.y && pillars.y.j,
        pillars.m && pillars.m.g, pillars.m && pillars.m.j,
        pillars.d && pillars.d.g, pillars.d && pillars.d.j,
        pillars.h && pillars.h.g, pillars.h && pillars.h.j
      ].filter(Boolean);
      chars.forEach(function (c) {
        var el = GAN_ELEM[c] || JI_ELEM[c];
        if (el && el in cnt) cnt[el]++;
      });
      var yons = (power && power.yongshin) || [];
      badgesEl.innerHTML = Object.keys(cnt).map(function (el) {
        if (cnt[el] === 0) return '';
        var ei = ELEM[el];
        var isYong = yons.indexOf(el) >= 0;
        var isKi   = power && power.kijishin && power.kijishin.indexOf(el) >= 0;
        return '<span class="lsd-elem-badge' + (isYong ? ' is-yong' : '') + (isKi ? ' is-ki' : '') + '" ' +
          'style="background:' + ei.bg + ';border-color:' + ei.color + ';color:' + ei.neon + '">' +
          ei.badge + ei.short + ' <b>' + cnt[el] + '</b>' +
          (isYong ? '<span class="lsd-badge-tag">용신</span>' : '') +
          (isKi   ? '<span class="lsd-badge-tag lsd-badge-tag--ki">기신</span>' : '') +
          '</span>';
      }).join('');
    }

    /* 오늘 일진 */
    var todayGZ = getTodayGanZhi();
    var energyIljinEl = document.getElementById('lsdEnergyIljin');
    var tEl = todayGZ ? (GAN_ELEM[todayGZ.g] || 'earth') : 'earth';
    var tInfo = ELEM[tEl];
    if (energyIljinEl && todayGZ) {
      energyIljinEl.innerHTML = '오늘 일진 <b style="color:' + tInfo.neon + ';font-size:1.3em">' +
        todayGZ.g + todayGZ.j + '</b><span class="lsd-iljin-elem"> ' + tInfo.badge + ' ' + tInfo.cn + ' 에너지</span>';
    }

    /* 십성 계산 */
    var mainTenStar = null;
    if (pillars && pillars.d && pillars.d.g && todayGZ) {
      mainTenStar = calcTenStar(pillars.d.g, todayGZ.g);
    }
    var starEl  = document.getElementById('lsdEnergyStar');
    var guideEl = document.getElementById('lsdEnergyGuide');
    var energyCard = document.getElementById('lsdEnergyCard');
    if (mainTenStar) {
      var tsInfo = TENSTAR_GUIDE[mainTenStar] || {};
      var tsEmoji = (window.TS_DB && window.TS_DB[mainTenStar]) ? window.TS_DB[mainTenStar].emoji : '✨';
      if (starEl)  starEl.innerHTML  = '오늘의 십성 <b style="color:' + (tsInfo.color||'#a78bfa') + '">' + mainTenStar + '</b> ' + tsEmoji;
      if (guideEl) guideEl.textContent = tsInfo.guide || '오늘의 에너지를 최대한 활용해봐~!';
      if (energyCard) energyCard.style.borderColor = tsInfo.color || '#6366f1';
    } else if (guideEl) {
      guideEl.textContent = '사주를 먼저 분석하면 더 정확한 에너지 가이드를 받을 수 있어요!';
    }

    /* 갓생 지수 레이더 */
    var scores = calcGodlifeScores(pillars, power, jong, todayGZ);
    setTimeout(function () { drawRadar(scores); }, 50);

    /* 행운 오행 */
    _luckyEl = getLuckyElement(power, jong, todayGZ);
    var luckRow = document.getElementById('lsdLuckElemRow');
    if (luckRow) {
      var ei = ELEM[_luckyEl] || ELEM.earth;
      luckRow.innerHTML = '오늘의 행운 오행: <span style="color:' + ei.neon + ';font-weight:700">' +
        ei.badge + ' ' + ei.cn + ' (' + ei.lotto + ')</span>';
    }
    var hintEl = document.getElementById('lsdLuckyElemHint');
    if (hintEl) {
      var ei2 = ELEM[_luckyEl] || ELEM.earth;
      hintEl.innerHTML = '🎯 오늘의 행운 오행: <b style="color:' + ei2.neon + '">' + ei2.badge + ' ' + ei2.cn + '</b>';
    }

    /* 챌린지 빌드 */
    buildChallenges(_luckyEl, mainTenStar);

    /* 야간 회고 로드 */
    var diary = loadDiary();
    var entry = getTodayEntry(diary);
    var nightInput = document.getElementById('lsdNightInput');
    var cc = document.getElementById('lsdCharCount');
    if (nightInput) {
      nightInput.value = entry.nightLog || '';
      if (cc) cc.textContent = nightInput.value.length;
      nightInput.addEventListener('input', function () { if (cc) cc.textContent = nightInput.value.length; });
    }

    /* feedback 복원 */
    document.querySelectorAll('.lsd-match-btn').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.feedback === entry.feedback);
    });

    /* 이벤트 바인딩 (각 오픈마다 재바인딩 방지: once) */
    bindModalEvents(modal);
  }

  /* ─── 모달 이벤트 바인딩 ─────────────────────────────────────── */
  function bindModalEvents(modal) {
    /* 탭 */
    modal.querySelectorAll('.lsd-tab').forEach(function (tab) {
      tab.onclick = function () { switchTab(tab.dataset.tab); };
    });

    /* 매칭 버튼 */
    modal.querySelectorAll('.lsd-match-btn').forEach(function (btn) {
      btn.onclick = function () {
        modal.querySelectorAll('.lsd-match-btn').forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        var d = loadDiary();
        getTodayEntry(d).feedback = btn.dataset.feedback;
        saveDiary(d);
      };
    });

    /* 기분 이모지 */
    var moodBtns = modal.querySelectorAll('.lsd-mood-btn');
    var diary0 = loadDiary();
    var entry0 = getTodayEntry(diary0);
    moodBtns.forEach(function (btn) {
      if (btn.dataset.emoji === entry0.moodEmoji) btn.classList.add('is-active');
      btn.onclick = function () {
        moodBtns.forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        var d = loadDiary();
        getTodayEntry(d).moodEmoji = btn.dataset.emoji;
        saveDiary(d);
      };
    });

    /* 가챠 버튼 */
    var lottoBtn  = document.getElementById('lsdLottoBtn');
    var redrawBtn = document.getElementById('lsdRedrawBtn');
    if (lottoBtn)  lottoBtn.onclick  = startLotto;
    if (redrawBtn) redrawBtn.onclick = function () {
      document.getElementById('lsdLottoResult').style.display = 'none';
      startLotto();
    };

    /* 저장 버튼 */
    var saveBtn = document.getElementById('lsdSaveNightBtn');
    if (saveBtn) saveBtn.onclick = function () {
      var inp = document.getElementById('lsdNightInput');
      var d = loadDiary();
      getTodayEntry(d).nightLog = inp ? inp.value : '';
      saveDiary(d);
      var fb = document.getElementById('lsdSaveFeedback');
      if (fb) { fb.style.display = 'block'; setTimeout(function () { fb.style.display = 'none'; }, 2000); }
    };

    /* 전체 삭제 버튼 */
    var clearBtn = document.getElementById('lsdClearBtn');
    if (clearBtn) clearBtn.onclick = function () {
      if (window.confirm('모든 운구 기일 기록을 삭제할까요? 되돌릴 수 없어요!')) {
        localStorage.removeItem(LS_KEY);
        renderHistory();
      }
    };
  }

  /* ─── 닫기 ───────────────────────────────────────────────────── */
  function closeDiary() {
    var modal = document.getElementById('luckSyncDiaryModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  /* ─── 전역 data-action 이벤트 위임 ─────────────────────────── */
  var LSD_ACTIONS = ['openLuckSyncDiary', 'closeLuckSyncDiary'];

  document.addEventListener('click', function (e) {
    var el = e.target ? e.target.closest('[data-action]') : null;
    if (!el) return;
    var action = el.getAttribute('data-action');
    if (!action) return;
    if (action === 'openLuckSyncDiary')  { e.preventDefault(); openDiary(); }
    if (action === 'closeLuckSyncDiary') { e.preventDefault(); closeDiary(); }
  }, false);

  /* 배경 클릭 닫기 */
  document.addEventListener('click', function (e) {
    var modal = document.getElementById('luckSyncDiaryModal');
    if (modal && modal.style.display !== 'none' && e.target === modal) closeDiary();
  }, false);

  /* ESC 닫기 */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var modal = document.getElementById('luckSyncDiaryModal');
      if (modal && modal.style.display !== 'none') closeDiary();
    }
  });

  /* 공개 API */
  window.LuckSyncDiary = { open: openDiary, close: closeDiary };

})();
