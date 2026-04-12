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

  /* ─── 날짜별 일진 계산 ─────────────────────────────────────────── */
  function getGanZhiByDate(dt) {
    var baseDate = (dt instanceof Date) ? dt : new Date();
    var y = baseDate.getFullYear(), m = baseDate.getMonth() + 1, d = baseDate.getDate(), h = baseDate.getHours();
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

  /* ─── 오늘 일진 계산 ─────────────────────────────────────────── */
  function getTodayGanZhi() {
    return getGanZhiByDate(new Date());
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
  var _lsdCtx = { dEl: 'earth', luckyEl: 'earth', todayGZ: null, scores: null, mainTenStar: null, morningMsg: '' };

  function ensureEntryShape(entry) {
    if (!entry || typeof entry !== 'object') return;
    if (!Array.isArray(entry.challenges)) entry.challenges = [];
    if (!Array.isArray(entry.emotionTags)) entry.emotionTags = [];
    if (!Array.isArray(entry.stickers)) entry.stickers = [];
    if (!Array.isArray(entry.badges)) entry.badges = [];
    if (!Array.isArray(entry.nightPractices)) entry.nightPractices = [];
    if (!Array.isArray(entry.actionPlan)) entry.actionPlan = [];
    if (!Array.isArray(entry.challengeCatalog)) entry.challengeCatalog = [];
    if (!Array.isArray(entry.tomorrowActionPlan)) entry.tomorrowActionPlan = [];
    if (!Array.isArray(entry.meditationLogs)) entry.meditationLogs = [];
    if (typeof entry.challengeTotalToday !== 'number') entry.challengeTotalToday = 0;
    if (typeof entry.tomorrowPlanTheme !== 'string') entry.tomorrowPlanTheme = '';
    if (typeof entry.reviewRate !== 'number') entry.reviewRate = 0;
    if (typeof entry.reviewNote !== 'string') entry.reviewNote = '';
    if (typeof entry.practiceNote !== 'string') entry.practiceNote = entry.reviewNote || entry.nightLog || '';
    if (typeof entry.aiLuckCoach !== 'string') entry.aiLuckCoach = '';
    if (typeof entry.aiCoachUpdatedAt !== 'string') entry.aiCoachUpdatedAt = '';
    if (typeof entry.tomorrowBlueprint !== 'string') entry.tomorrowBlueprint = '';
    if (typeof entry.revisionOriginal !== 'string') entry.revisionOriginal = '';
    if (typeof entry.revisionImagined !== 'string') entry.revisionImagined = '';
    if (typeof entry.revisionDoneCount !== 'number') entry.revisionDoneCount = 0;
    if (typeof entry.satsKeyword !== 'string') entry.satsKeyword = '';
    if (typeof entry.satsScene !== 'string') entry.satsScene = '';
    if (typeof entry.satsSceneLastIndex !== 'number') entry.satsSceneLastIndex = -1;
    if (typeof entry.satsCompleted !== 'boolean') entry.satsCompleted = false;
    if (typeof entry.iAmAffirmation !== 'string') entry.iAmAffirmation = '';
    if (typeof entry.iAmCompleted !== 'boolean') entry.iAmCompleted = false;
    if (typeof entry.meditationMinutes !== 'number') entry.meditationMinutes = 0;
    if (typeof entry.meditationPoints !== 'number') entry.meditationPoints = 0;
    if (typeof entry.memoNote !== 'string') entry.memoNote = '';
    if (typeof entry.morningFortune !== 'string') entry.morningFortune = '';
    if (typeof entry.partnerName !== 'string') entry.partnerName = '';
    if (typeof entry.partnerBirthYear !== 'string') entry.partnerBirthYear = '';
    if (typeof entry.partnerBirthDate !== 'string') entry.partnerBirthDate = '';
    if (typeof entry.partnerBirthTime !== 'string') entry.partnerBirthTime = '12:00';
    if (typeof entry.partnerBirthCity !== 'string') entry.partnerBirthCity = '서울';
    if (typeof entry.compatType !== 'string') entry.compatType = 'love';
    if (typeof entry.shareNickname !== 'string') entry.shareNickname = '';
    if (typeof entry.shareCaption !== 'string') entry.shareCaption = '';
    if (typeof entry.shareTheme !== 'string') entry.shareTheme = 'vivid';
    if (typeof entry.shareUseSticker !== 'boolean') entry.shareUseSticker = true;
    if (typeof entry.shareUseBadge !== 'boolean') entry.shareUseBadge = true;
  }

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
      diary[key] = {
        date: key,
        challenges: [],
        lotto: null,
        nightLog: '',
        feedback: null,
        moodEmoji: '',
        nightPractices: [],
        actionPlan: [],
        challengeCatalog: [],
        challengeTotalToday: 0,
        practiceNote: '',
        aiLuckCoach: '',
        aiCoachUpdatedAt: '',
        tomorrowBlueprint: '',
        tomorrowActionPlan: [],
        tomorrowPlanTheme: '',
        revisionOriginal: '',
        revisionImagined: '',
        revisionDoneCount: 0,
        satsKeyword: '',
        satsScene: '',
        satsSceneLastIndex: -1,
        satsCompleted: false,
        iAmAffirmation: '',
        iAmCompleted: false,
        meditationMinutes: 0,
        meditationPoints: 0,
        meditationLogs: []
      };
    }
    ensureEntryShape(diary[key]);
    return diary[key];
  }

  function ensureMzStyles() {
    if (document.getElementById('lsd-mz-styles')) return;
    var st = document.createElement('style');
    st.id = 'lsd-mz-styles';
    st.textContent = [
      '.lsd-mz-card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:12px 14px;box-shadow:0 1px 6px rgba(0,0,0,.05);margin-top:12px}',
      '.lsd-mz-title{margin:0 0 8px;font-size:.82rem;font-weight:900;color:#111827}',
      '.lsd-mz-sub{margin:0 0 8px;font-size:.7rem;color:#6b7280;line-height:1.45}',
      '.lsd-chip{display:inline-flex;align-items:center;gap:4px;padding:6px 10px;border-radius:999px;border:1.5px solid #e5e7eb;background:#fff;color:#4b5563;font-size:.7rem;font-weight:700;cursor:pointer;transition:all .2s;margin:0 6px 6px 0}',
      '.lsd-chip:hover{border-color:#c4b5fd;background:#faf5ff;color:#6d28d9}',
      '.lsd-chip.is-on{background:linear-gradient(135deg,#7c3aed,#4f46e5);border-color:transparent;color:#fff;box-shadow:0 4px 10px rgba(124,58,237,.25)}',
      '.lsd-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
      '.lsd-mini-box{border:1px dashed #d1d5db;border-radius:12px;padding:8px;font-size:.7rem;color:#4b5563;line-height:1.45;background:#fcfcff}',
      '.lsd-graph-wrap{background:linear-gradient(180deg,#f8fafc,#f1f5f9);border:1px solid #e2e8f0;border-radius:12px;padding:8px}',
      '.lsd-review-rate{display:flex;gap:6px;flex-wrap:wrap}',
      '.lsd-review-rate button{border:1px solid #e5e7eb;background:#fff;border-radius:999px;padding:6px 10px;font-size:.7rem;font-weight:700;color:#6b7280;cursor:pointer}',
      '.lsd-review-rate button.is-on{background:#ecfeff;border-color:#22d3ee;color:#0e7490}',
      '.lsd-note-box{width:100%;border:1px solid #e5e7eb;border-radius:12px;padding:10px;font-size:.78rem;line-height:1.55;resize:vertical;min-height:86px;box-sizing:border-box;background:#fff}',
      '.lsd-share-btn{border:none;border-radius:10px;padding:10px 12px;background:linear-gradient(135deg,#f43f5e,#ec4899);color:#fff;font-size:.74rem;font-weight:800;cursor:pointer;box-shadow:0 4px 14px rgba(236,72,153,.3)}',
      '.lsd-plain-btn{border:1.5px solid #d1d5db;border-radius:10px;padding:8px 10px;background:#fff;color:#374151;font-size:.73rem;font-weight:700;cursor:pointer}',
      '.lsd-badge{display:inline-flex;align-items:center;padding:5px 10px;border-radius:999px;background:#fef3c7;color:#92400e;font-size:.68rem;font-weight:800;margin:0 6px 6px 0}',
      '.lsd-theme-fx{transition:all .28s ease}'
    ].join('');
    document.head.appendChild(st);
  }

  function ensureMzBlocks() {
    ensureMzStyles();
    var dash = document.getElementById('lsdPanelDashboard');
    if (dash && !document.getElementById('lsdMzVisualCard')) {
      var wrap = document.createElement('div');
      wrap.id = 'lsdMzVisualCard';
      wrap.className = 'lsd-mz-card lsd-theme-fx';
      wrap.innerHTML = ''
        + '<p class="lsd-mz-title">🎨 MZ 다꾸 존</p>'
        + '<p class="lsd-mz-sub">오행 컬러 테마 + 에너지 흐름 + 만세력 스티커로 오늘 페이지를 꾸며봐!</p>'
        + '<div class="lsd-graph-wrap" id="lsdEnergyFlowGraph"></div>'
        + '<div style="margin-top:10px"><p class="lsd-mz-sub" style="margin-bottom:6px">✨ 만세력 커스텀 스티커</p><div id="lsdStickerTray"></div></div>'
        + '<div class="lsd-grid-2" style="margin-top:6px">'
        + '  <div class="lsd-mini-box" id="lsdGoldenTimeBox"></div>'
        + '  <div class="lsd-mini-box" id="lsdBoostMissionBox"></div>'
        + '</div>'
        + '<div style="margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
        + '  <button id="lsdShareCardBtn" type="button" class="lsd-share-btn">📸 오늘 운세 카드 저장</button>'
        + '  <span style="font-size:.68rem;color:#6b7280">인스타 스토리(1080x1920) 규격</span>'
        + '</div>'
        + '<div class="lsd-grid-2" style="margin-top:8px">'
        + '  <input id="lsdShareNick" type="text" placeholder="카드 닉네임 (선택)" style="border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;font-size:.73rem">'
        + '  <select id="lsdShareTheme" style="border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;font-size:.73rem">'
        + '    <option value="vivid">Vivid 팝</option>'
        + '    <option value="soft">Soft 파스텔</option>'
        + '    <option value="night">Night 글로우</option>'
        + '  </select>'
        + '</div>'
        + '<textarea id="lsdShareCaption" class="lsd-note-box" style="min-height:58px;margin-top:8px" placeholder="카드 하단 한 줄 멘트 (선택)"></textarea>'
        + '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px;font-size:.7rem;color:#4b5563">'
        + '  <label><input id="lsdShareStickerOn" type="checkbox" checked> 스티커 포함</label>'
        + '  <label><input id="lsdShareBadgeOn" type="checkbox" checked> 배지 포함</label>'
        + '</div>';
      dash.appendChild(wrap);
    }

    var challenge = document.getElementById('lsdPanelChallenge');
    if (challenge && !document.getElementById('lsdEmotionCard')) {
      var c = document.createElement('div');
      c.id = 'lsdEmotionCard';
      c.className = 'lsd-mz-card';
      c.innerHTML = ''
        + '<p class="lsd-mz-title">📝 감정 태그 & 운세 챌린지 배지</p>'
        + '<p class="lsd-mz-sub">오늘 감정을 태그하면 십성별 감정 통계를 자동으로 집계해줘.</p>'
        + '<div id="lsdEmotionTags"></div>'
        + '<div class="lsd-mini-box" id="lsdEmotionStats" style="margin-top:8px"></div>'
        + '<div style="margin-top:8px" id="lsdBadgeShelf"></div>';
      challenge.appendChild(c);
    }

    var night = document.getElementById('lsdPanelNight');
    if (night && !document.getElementById('lsdReviewCard')) {
      var n = document.createElement('div');
      n.id = 'lsdReviewCard';
      n.className = 'lsd-mz-card';
      n.innerHTML = ''
        + '<p class="lsd-mz-title">🌙 Night Action Memo</p>'
        + '<p class="lsd-mz-sub">야간 회고는 적중률 체크가 아니라, 오늘 실천한 개운 루틴을 기록하고 내일 운 설계를 만드는 공간으로 개편되었어요.</p>'
        + '<div class="lsd-mini-box">체크리스트 완료율 + 실천 메모 + AI Luck Coach를 조합하면 운의 흐름을 능동적으로 설계할 수 있어요.</div>';
      night.appendChild(n);
    }

    var history = document.getElementById('lsdPanelHistory');
    if (history && !document.getElementById('lsdMemoCard')) {
      var h = document.createElement('div');
      h.id = 'lsdMemoCard';
      h.className = 'lsd-mz-card';
      h.innerHTML = ''
        + '<p class="lsd-mz-title">🗂️ 사주 메모장 (Notion vibe)</p>'
        + '<textarea id="lsdMemoInput" class="lsd-note-box" placeholder="오늘 중요한 사건 기록: 누굴 만났는지, 어떤 결정이 있었는지, 결과는 어땠는지"></textarea>'
        + '<div style="margin-top:8px"><button id="lsdSaveMemoBtn" type="button" class="lsd-plain-btn">메모 저장</button></div>'
        + '<hr style="border:none;border-top:1px solid #eef2ff;margin:12px 0">'
        + '<p class="lsd-mz-title" style="margin-top:0">🤝 궁합 다이어리 (Full Sync)</p>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
        + '  <input id="lsdPartnerName" type="text" placeholder="상대 이름" style="flex:1;min-width:120px;border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;font-size:.75rem">'
        + '  <input id="lsdPartnerBirthDate" type="date" style="width:150px;border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;font-size:.75rem">'
        + '  <input id="lsdPartnerBirthTime" type="time" value="12:00" style="width:120px;border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;font-size:.75rem">'
        + '</div>'
        + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">'
        + '  <select id="lsdPartnerCity" style="flex:1;min-width:120px;border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;font-size:.75rem">'
        + '    <option value="서울">서울</option><option value="부산">부산</option><option value="인천">인천</option><option value="대구">대구</option><option value="광주">광주</option><option value="대전">대전</option>'
        + '  </select>'
        + '  <select id="lsdCompatType" style="width:132px;border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;font-size:.75rem">'
        + '    <option value="love">연애</option><option value="friend">친구</option><option value="business">비즈니스</option>'
        + '  </select>'
        + '  <input id="lsdPartnerYear" type="number" min="1900" max="2100" placeholder="연도(보조)" style="width:110px;border:1px solid #e5e7eb;border-radius:10px;padding:8px 10px;font-size:.75rem">'
        + '  <button id="lsdCompatBtn" type="button" class="lsd-plain-btn">궁합 연동 보기</button>'
        + '</div>'
        + '<div id="lsdCompatResult" class="lsd-mini-box" style="margin-top:8px">상대 정보를 입력하면 기존 궁합 엔진 + 다이어리 흐름을 함께 보여줄게.</div>';
      history.appendChild(h);
    }
  }

  function applyElementTheme(luckyEl) {
    var modal = document.getElementById('luckSyncDiaryModal');
    if (!modal) return;
    var e = ELEM[luckyEl] || ELEM.earth;
    var header = modal.querySelector('header');
    if (header) {
      header.style.background = 'linear-gradient(135deg,' + e.color + ',#4f46e5 65%,#0ea5e9)';
    }
    var themed = modal.querySelectorAll('.lsd-theme-fx');
    themed.forEach(function (el) {
      el.style.borderColor = e.color + '44';
      el.style.boxShadow = '0 6px 20px ' + e.color + '22';
    });
  }

  function renderEnergyFlowGraph(scores, todayEl) {
    var box = document.getElementById('lsdEnergyFlowGraph');
    if (!box) return;
    var values = [
      Number(scores && scores.health) || 50,
      Number(scores && scores.study) || 50,
      Number(scores && scores.wealth) || 50,
      Number(scores && scores.fame) || 50,
      Number(scores && scores.love) || 50
    ];
    var avg = Math.round(values.reduce(function (a, b) { return a + b; }, 0) / values.length);
    var phase = avg >= 68 ? '🚀 치고 나가기 모드' : (avg >= 52 ? '🌿 안정 성장 모드' : '🧘 존버/정비 모드');
    var w = 260, h = 86;
    var points = values.map(function (v, i) {
      var x = Math.round((w - 12) * (i / (values.length - 1)) + 6);
      var y = Math.round(h - (v / 100) * (h - 14) - 7);
      return x + ',' + y;
    }).join(' ');
    var t = ELEM[todayEl] || ELEM.earth;
    box.innerHTML = ''
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
      + '  <strong style="font-size:.73rem;color:#111827">📈 일운 에너지 그래프</strong>'
      + '  <span style="font-size:.68rem;font-weight:800;color:' + t.color + '">' + phase + '</span>'
      + '</div>'
      + '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="86" aria-label="일운 흐름 그래프">'
      + '  <polyline fill="none" stroke="#cbd5e1" stroke-width="1" points="6,70 254,70"></polyline>'
      + '  <polyline fill="none" stroke="' + t.color + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="' + points + '"></polyline>'
      + '</svg>'
      + '<p style="margin:4px 0 0;font-size:.67rem;color:#6b7280">아침 → 점심 → 오후 → 저녁 → 밤 흐름으로 읽어줘.</p>';
  }

  function _relScore(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 2;
    if (SHENG[a] === b || SHENG[b] === a) return 1;
    if (KE[a] === b || KE[b] === a) return -1;
    return 0;
  }

  function _partnerElemByYear(year) {
    var y = Number(year || 0);
    if (!isFinite(y) || y < 1) return 'earth';
    var map = ['metal', 'water', 'wood', 'fire', 'earth'];
    return map[Math.abs(y) % 5];
  }

  function renderMzSections(pillars, power, todayGZ, scores, mainTenStar, luckyEl, entry, diary) {
    ensureMzBlocks();
    applyElementTheme(luckyEl);

    var dEl = (pillars && pillars.d && pillars.d.g) ? (GAN_ELEM[pillars.d.g] || 'earth') : 'earth';
    _lsdCtx = {
      dEl: dEl,
      luckyEl: luckyEl,
      todayGZ: todayGZ,
      scores: scores,
      mainTenStar: mainTenStar,
      morningMsg: (document.getElementById('lsdEnergyGuide') || {}).textContent || ''
    };

    renderEnergyFlowGraph(scores, GAN_ELEM[(todayGZ && todayGZ.g) || '戊'] || 'earth');

    var stickerTray = document.getElementById('lsdStickerTray');
    if (stickerTray) {
      var daySticker = (pillars && pillars.d && pillars.d.g) ? ('🧿 ' + (GAN_KO[pillars.d.g] || pillars.d.g) + ' 요정') : '🧿 일간 요정';
      var tenSticker = mainTenStar ? ('⭐ ' + mainTenStar + ' 치즈냥') : '⭐ 십성 미정 고양이';
      var stickerPool = [daySticker, tenSticker, '🌈 럭키비키 하트', '🫧 오운완 반짝이', '🧋 오늘도 갓생중'];
      stickerTray.innerHTML = stickerPool.map(function (name) {
        var on = (entry.stickers || []).indexOf(name) >= 0;
        return '<button type="button" class="lsd-chip' + (on ? ' is-on' : '') + '" data-sticker="' + escHtml(name) + '">' + escHtml(name) + '</button>';
      }).join('');
    }

    var yons = (power && power.yongshin) || [];
    var kis = (power && power.kijishin) || [];
    var golden = document.getElementById('lsdGoldenTimeBox');
    if (golden) {
      var baseTime = {
        wood: ['07:30', '11:00'], fire: ['09:30', '14:00'], earth: ['13:30', '16:30'], metal: ['17:00', '20:00'], water: ['20:30', '22:40']
      }[luckyEl] || ['10:00', '15:00'];
      golden.innerHTML = '<strong>⏰ 택일 골든 타임</strong><br>'
        + '미팅/계약: <b>' + baseTime[0] + '</b><br>'
        + '데이트/소통: <b>' + baseTime[1] + '</b><br>'
        + '<span style="font-size:.65rem;color:#6b7280">오늘 행운 오행 기준 추천</span>';
    }

    var boost = document.getElementById('lsdBoostMissionBox');
    if (boost) {
      var needEl = (kis && kis[0]) || SHENG[dEl] || 'earth';
      var rec = {
        wood: '🥗 초록 음식 + 공원 산책 + 식물 보기',
        fire: '🌶 매콤한 음식 + 햇빛 받기 + 붉은 소품',
        earth: '🍠 든든한 간식 + 책상 정리 + 베이지 아이템',
        metal: '🧊 물건 정리 + 일정 정돈 + 메탈 포인트',
        water: '🍵 수분 보충 + 음악/명상 + 파랑 소품'
      };
      boost.innerHTML = '<strong>🛠️ 개운 미션</strong><br>'
        + '오늘 보충 오행: <b>' + (ELEM[needEl] ? ELEM[needEl].cn : needEl) + '</b><br>'
        + (rec[needEl] || rec.earth);
    }

    var emotionTags = document.getElementById('lsdEmotionTags');
    if (emotionTags) {
      var pool = ['기쁨', '설렘', '빡침', '우울', '차분', '불안', '몰입'];
      emotionTags.innerHTML = pool.map(function (name) {
        var on = (entry.emotionTags || []).indexOf(name) >= 0;
        return '<button type="button" class="lsd-chip' + (on ? ' is-on' : '') + '" data-emotion="' + name + '">#' + name + '</button>';
      }).join('');
    }

    var statsBox = document.getElementById('lsdEmotionStats');
    if (statsBox) {
      var tally = {};
      Object.keys(diary || {}).forEach(function (k) {
        var e = diary[k] || {};
        var ts = e.tenstar || '미기록';
        (e.emotionTags || []).forEach(function (tag) {
          var key = ts + '|' + tag;
          tally[key] = (tally[key] || 0) + 1;
        });
      });
      var top = Object.keys(tally).sort(function (a, b) { return tally[b] - tally[a]; }).slice(0, 3);
      if (!top.length) {
        statsBox.innerHTML = '아직 감정 통계가 없어. 오늘 태그 1개만 눌러도 바로 집계 시작!';
      } else {
        statsBox.innerHTML = '<strong>📊 십성 x 감정 TOP</strong><br>' + top.map(function (k) {
          var parts = k.split('|');
          return '• ' + parts[0] + ' 운에 #' + parts[1] + ' ' + tally[k] + '회';
        }).join('<br>');
      }
    }

    var challengeTotal = Number(entry.challengeTotalToday) || ((entry.challengeCatalog && entry.challengeCatalog.length) || 0);
    var doneFull = (entry.challenges || []).length >= Math.max(5, Math.floor(challengeTotal * 0.75));
    if (doneFull) {
      var badgeName = '🏅 오운완 마스터 ' + getTodayKey();
      if (entry.badges.indexOf(badgeName) < 0) {
        entry.badges.push(badgeName);
        saveDiary(diary);
      }
    }
    var badgeShelf = document.getElementById('lsdBadgeShelf');
    if (badgeShelf) {
      var badges = entry.badges || [];
      badgeShelf.innerHTML = badges.length
        ? badges.map(function (b) { return '<span class="lsd-badge">' + escHtml(b) + '</span>'; }).join('')
        : '<span style="font-size:.68rem;color:#9ca3af">아직 배지가 없어! 오늘 챌린지 성공하면 바로 지급돼.</span>';
    }

    renderNightPracticeBoard(entry);

    var memoInput = document.getElementById('lsdMemoInput');
    if (memoInput) memoInput.value = entry.memoNote || '';

    var shareNick = document.getElementById('lsdShareNick');
    var shareCaption = document.getElementById('lsdShareCaption');
    var shareTheme = document.getElementById('lsdShareTheme');
    var shareStickerOn = document.getElementById('lsdShareStickerOn');
    var shareBadgeOn = document.getElementById('lsdShareBadgeOn');
    if (shareNick) shareNick.value = entry.shareNickname || '';
    if (shareCaption) shareCaption.value = entry.shareCaption || '';
    if (shareTheme) shareTheme.value = entry.shareTheme || 'vivid';
    if (shareStickerOn) shareStickerOn.checked = entry.shareUseSticker !== false;
    if (shareBadgeOn) shareBadgeOn.checked = entry.shareUseBadge !== false;

    var partnerName = document.getElementById('lsdPartnerName');
    var partnerDate = document.getElementById('lsdPartnerBirthDate');
    var partnerTime = document.getElementById('lsdPartnerBirthTime');
    var partnerCity = document.getElementById('lsdPartnerCity');
    var compatType = document.getElementById('lsdCompatType');
    var partnerYear = document.getElementById('lsdPartnerYear');
    if (partnerName) partnerName.value = entry.partnerName || '';
    if (partnerDate) partnerDate.value = entry.partnerBirthDate || '';
    if (partnerTime) partnerTime.value = entry.partnerBirthTime || '12:00';
    if (partnerCity) partnerCity.value = entry.partnerBirthCity || '서울';
    if (compatType) compatType.value = entry.compatType || 'love';
    if (partnerYear) partnerYear.value = entry.partnerBirthYear || '';
    renderCompatResult(entry, diary);
  }

  function generateShareCard(entry) {
    var c = document.createElement('canvas');
    c.width = 1080;
    c.height = 1920;
    var ctx = c.getContext('2d');
    var e = ELEM[_lsdCtx.luckyEl] || ELEM.earth;
    var theme = (entry && entry.shareTheme) || 'vivid';
    var shareNick = (entry && entry.shareNickname) ? String(entry.shareNickname).trim() : '';
    var shareCaption = (entry && entry.shareCaption) ? String(entry.shareCaption).trim() : '';
    var useSticker = !entry || entry.shareUseSticker !== false;
    var useBadge = !entry || entry.shareUseBadge !== false;

    var g = ctx.createLinearGradient(0, 0, 1080, 1920);
    if (theme === 'soft') {
      g.addColorStop(0, '#fce7f3');
      g.addColorStop(0.55, '#ddd6fe');
      g.addColorStop(1, '#dbeafe');
    } else if (theme === 'night') {
      g.addColorStop(0, '#312e81');
      g.addColorStop(0.55, '#1e293b');
      g.addColorStop(1, '#020617');
    } else {
      g.addColorStop(0, e.color);
      g.addColorStop(0.55, '#4f46e5');
      g.addColorStop(1, '#0f172a');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.beginPath(); ctx.arc(880, 190, 210, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(220, 1720, 240, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = theme === 'soft' ? '#312e81' : '#fff';
    ctx.font = '900 66px "Noto Sans KR", sans-serif';
    ctx.fillText('오늘의 사주 다이어리', 88, 180);
    ctx.font = '700 42px "Noto Sans KR", sans-serif';
    ctx.fillText('Luck-Sync MZ Fortune Card', 88, 242);

    var iljin = _lsdCtx.todayGZ ? (_lsdCtx.todayGZ.g + _lsdCtx.todayGZ.j) : '—';
    ctx.font = '800 52px "Noto Sans KR", sans-serif';
    ctx.fillText('일진 ' + iljin + ' · ' + (e.cn || ''), 88, 350);

    ctx.font = '700 38px "Noto Sans KR", sans-serif';
    ctx.fillText('오늘 미션', 88, 470);
    ctx.font = '600 34px "Noto Sans KR", sans-serif';
    ctx.fillText('1) 핵심 1개 먼저 끝내기', 100, 540);
    ctx.fillText('2) ' + (e.badge || '✨') + ' 기운 아이템 챙기기', 100, 600);
    ctx.fillText('3) 저녁에 운세 복기 3줄 남기기', 100, 660);

    if (useSticker && entry && Array.isArray(entry.stickers) && entry.stickers.length) {
      ctx.font = '700 32px "Noto Sans KR", sans-serif';
      ctx.fillText('스티커: ' + entry.stickers.slice(0, 2).join(' · '), 88, 760);
    }
    if (useBadge && entry && Array.isArray(entry.badges) && entry.badges.length) {
      ctx.font = '700 30px "Noto Sans KR", sans-serif';
      ctx.fillText('배지: ' + entry.badges.slice(-1)[0], 88, 815);
    }
    if (shareNick) {
      ctx.font = '800 34px "Noto Sans KR", sans-serif';
      ctx.fillText('by ' + shareNick, 88, 1680);
    }

    ctx.font = '900 48px "Noto Sans KR", sans-serif';
    ctx.fillText('code-destiny', 88, 1780);
    ctx.font = '600 28px "Noto Sans KR", sans-serif';
    ctx.fillText((shareCaption || '#사주다이어리 #운세카드 #럭키비키'), 88, 1830);

    var a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = 'luck-sync-card-' + getTodayKey() + '.png';
    a.click();
  }

  function renderCompatResult(entry, diary) {
    var box = document.getElementById('lsdCompatResult');
    if (!box) return;
    var name = (entry.partnerName || '').trim();
    var by = Number(entry.partnerBirthYear || 0);
    var bdate = (entry.partnerBirthDate || '').trim();
    var btime = (entry.partnerBirthTime || '12:00').trim() || '12:00';
    var bcity = (entry.partnerBirthCity || '서울').trim() || '서울';
    var ctype = (entry.compatType || 'love').trim() || 'love';
    if (!by && bdate) {
      by = Number(String(bdate).split('-')[0] || 0);
    }
    if (!name || !isFinite(by) || by < 1900 || by > 2100) {
      box.innerHTML = '상대 이름 + 생년월일/시간을 넣어주면 기존 궁합 엔진과 연결해서 보여줄게.';
      return;
    }

    var partnerEl = _partnerElemByYear(by);
    var nativeCompatLine = '';
    var bridged = false;
    try {
      var meBirth = window.G_BIRTH || window.G_BIRTH_INFO || null;
      var pDateArr = bdate ? String(bdate).split('-') : [];
      var pTimeArr = String(btime || '12:00').split(':');
      var py = Number(pDateArr[0] || by);
      var pm = Number(pDateArr[1] || 1);
      var pd = Number(pDateArr[2] || 1);
      var ph = Number(pTimeArr[0] || 12);
      var pmin = Number(pTimeArr[1] || 0);
      var partnerBirth = { y: py, m: pm, d: pd, h: ph, min: pmin, city: bcity, type: ctype };
      if (typeof window.computeZiweiCompatLite === 'function' && meBirth) {
        var z = window.computeZiweiCompatLite(meBirth, partnerBirth);
        if (z && typeof z.score === 'number') {
          nativeCompatLine += '기존 궁합엔진(자미두수 Lite): <b>' + Math.round(z.score) + '점</b><br>';
          bridged = true;
        }
      }
      if (typeof window.computeAstroCompatLite === 'function' && meBirth) {
        var a = window.computeAstroCompatLite(meBirth, partnerBirth);
        if (a && typeof a.score === 'number') {
          nativeCompatLine += '기존 궁합엔진(점성 Lite): <b>' + Math.round(a.score) + '점</b><br>';
          bridged = true;
        }
      }

      var hasCompatForm = document.getElementById('compatBirthDate') && document.getElementById('compatBirthHour') && document.getElementById('compatBirthMinute');
      if (typeof window.runCompat === 'function' && hasCompatForm) {
        try {
          var compatName = document.getElementById('compatName');
          var compatBirthDate = document.getElementById('compatBirthDate');
          var compatBirthHour = document.getElementById('compatBirthHour');
          var compatBirthMinute = document.getElementById('compatBirthMinute');
          var compatType = document.getElementById('compatType');
          if (compatName) compatName.value = name;
          if (compatBirthDate) compatBirthDate.value = (bdate || (by + '-01-01'));
          if (compatBirthHour) compatBirthHour.value = ph;
          if (compatBirthMinute) compatBirthMinute.value = pmin;
          if (compatType) compatType.value = ctype;
          nativeCompatLine += '기존 궁합 입력폼 연동 준비 완료 (상세 리포트는 메인 궁합 섹션에서 확인 가능)<br>';
          bridged = true;
        } catch (linkErr) {}
      }
    } catch (err) {}

    var today = new Date();
    var best = null;
    for (var i = 0; i < 7; i++) {
      var d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i, 9, 0, 0, 0);
      var gz = getGanZhiByDate(d);
      var dayEl = (gz && gz.g) ? (GAN_ELEM[gz.g] || 'earth') : 'earth';
      var score = _relScore(dayEl, _lsdCtx.dEl) + _relScore(dayEl, partnerEl) + _relScore(_lsdCtx.dEl, partnerEl);
      if (!best || score > best.score) {
        best = { date: d, score: score, gz: gz, dayEl: dayEl };
      }
    }
    var dStr = best.date.getMonth() + 1 + '/' + best.date.getDate();
    var vibe = best.score >= 3 ? '찰떡합' : (best.score >= 1 ? '무난합' : '조심합');
    var relationScore = _relScore(_lsdCtx.dEl, partnerEl);
    var typeLabel = ctype === 'business' ? '비즈니스' : (ctype === 'friend' ? '친구' : '연애');
    var strengths = [];
    var cautions = [];
    var boostTips = [];

    if (relationScore >= 1) {
      strengths.push('기본 오행 궁합이 자연스럽게 맞물려 대화가 빠르게 통합니다.');
      strengths.push('의사결정 타이밍이 비슷해 함께 움직일 때 속도가 납니다.');
    } else if (relationScore === 0) {
      strengths.push('서로 역할이 달라 보완 시너지가 나기 좋은 조합입니다.');
      cautions.push('속도감 차이가 있을 수 있어 중요한 결정은 템포 합의가 필요합니다.');
    } else {
      strengths.push('관점이 달라 아이디어 폭이 넓어지는 조합입니다.');
      cautions.push('감정 반응 포인트가 달라 오해가 누적되기 쉬우니 중간 확인이 중요합니다.');
    }

    if (best.score >= 3) {
      strengths.push('향후 7일 중 추천일에 협업/데이트를 잡으면 체감 운이 상승합니다.');
    } else if (best.score <= 0) {
      cautions.push('이번 주는 즉흥 약속보다 사전 계획형 일정이 안정적입니다.');
    }

    if (ctype === 'love') {
      strengths.push('감정 표현이 부드럽게 이어질 때 친밀도가 빠르게 올라갑니다.');
      cautions.push('서운함을 참아두면 한 번에 폭발할 수 있으니 당일 대화가 좋습니다.');
      boostTips.push('저녁 산책 20분 + 감사 한 문장 공유');
      boostTips.push('연락 템포를 하루 1회만 명확히 합의');
    } else if (ctype === 'friend') {
      strengths.push('편한 대화에서 서로의 장점을 끌어내기 좋은 흐름입니다.');
      cautions.push('농담 톤이 과해지면 피로도가 올라갈 수 있어 선을 맞춰주세요.');
      boostTips.push('짧은 커피 약속으로 근황 점검 후 일정 확정');
      boostTips.push('같이 할 작은 미션 1개를 오늘 바로 시작');
    } else {
      strengths.push('역할 분담이 명확할수록 결과물이 빠르게 정리됩니다.');
      cautions.push('우선순위 기준이 다르면 일정 지연이 생길 수 있습니다.');
      boostTips.push('회의 전 목표 3줄 공유 + 종료 전 액션 아이템 확정');
      boostTips.push('피드백은 사실-대안-기한 순서로 짧게 전달');
    }

    if (!cautions.length) cautions.push('큰 이슈 전에는 시간·장소·목표를 한 번 더 확인하면 안정적입니다.');
    if (!boostTips.length) boostTips.push('추천일 저녁 시간대에 핵심 대화를 배치해 보세요.');

    function toBullets(items) {
      return items.slice(0, 3).map(function (txt) { return '• ' + escHtml(txt); }).join('<br>');
    }

    box.innerHTML = (nativeCompatLine ? nativeCompatLine : '다이어리 Lite 궁합으로 계산 중<br>')
      + (bridged ? '' : '엔진 연동 정보가 제한돼 Lite 결과를 우선 보여줘.<br>')
      + '💞 <b>' + escHtml(name) + '</b> 님과의 추천일: <b>' + dStr + '</b> (' + (best.gz ? best.gz.g + best.gz.j : '—') + ')<br>'
      + '[' + typeLabel + ' 궁합] 오늘부터 7일 중 <b>' + vibe + '</b> 흐름! 대화/데이트는 저녁 시간대가 좋아.<br>'
      + '<div style="margin-top:6px"><b>✅ 좋은 점</b><br>' + toBullets(strengths) + '</div>'
      + '<div style="margin-top:6px"><b>⚠️ 주의할 점</b><br>' + toBullets(cautions) + '</div>'
      + '<div style="margin-top:6px"><b>🍀 운 상승 포인트</b><br>' + toBullets(boostTips) + '</div>'
      + '<span style="font-size:.65rem;color:#64748b">입력 기준: ' + escHtml((bdate || (by + '-01-01')) + ' ' + btime + ' · ' + bcity + ' · ' + ctype) + '</span>';
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

  var CHALLENGE_POOL_BASE = [
    '📘 오늘 배운 점 1줄 기록하기',
    '🚶 15분 걷기 또는 가벼운 스트레칭',
    '🧹 5분 정리로 작업 공간 리셋',
    '💧 물 2잔 추가 섭취하기',
    '📵 SNS 20분 오프',
    '🎯 가장 어려운 할 일 1개 먼저 착수',
    '🫁 4-7-8 호흡 3회',
    '🧾 오늘 지출 1건 점검',
    '📬 감사 메시지 1개 보내기',
    '🛏️ 취침 30분 전 화면 끄기',
    '🗂️ 내일 핵심 우선순위 1개 예약',
    '🎧 집중 음악 10분 + 단일 작업',
    '🍎 가벼운 건강 간식으로 교체',
    '🧠 방해요소 1개 제거',
    '📝 오늘 기분 태그 1개 이상 선택'
  ];

  var CHALLENGE_POOL_BY_BRANCH = {
    '子': ['🌊 야간 생각 루프를 1줄로 끊어 적기', '🔍 직감이 온 순간을 기록하기'],
    '丑': ['🧱 미뤄둔 실무 1개 마감하기', '📦 책상 위 잡동사니 5개 정리'],
    '寅': ['🚀 미뤄둔 제안/아이디어 1개 발신하기', '🗣️ 먼저 연락 1회 시도'],
    '卯': ['🌿 창문 열고 3분 심호흡', '🤝 관계 회복 메시지 1개 보내기'],
    '辰': ['🧭 장기 목표 1줄 재정렬', '📊 진행률 숫자 1개 기록'],
    '巳': ['🔥 집중 25분 타이머 1회', '🎤 발표/말하기 연습 3분'],
    '午': ['☀️ 오전 핵심업무 먼저 완료', '💬 긍정 피드백 1회 전달'],
    '未': ['🏡 집안 작은 구역 정리 완료', '🥗 저녁 과식 대신 가벼운 식사'],
    '申': ['⚙️ 자동화/단축키 1개 적용', '📎 반복 작업 템플릿화'],
    '酉': ['✨ 외형/스타일 포인트 1개 업그레이드', '🪞 말투/표정 체크 1회'],
    '戌': ['🛡️ 경계선 필요한 관계 1개 정리', '📍 오늘 규칙 1개 끝까지 지키기'],
    '亥': ['🌙 조용한 몰입 20분 확보', '📚 통찰 문장 1개 필사']
  };

  var CHALLENGE_POOL_BY_TENSTAR = {
    '비견': ['🧍 혼자 끝낼 일 1개 단독 완수'],
    '겁재': ['⚔️ 하기 싫은 일 1개 정면 돌파'],
    '식신': ['🍱 몸을 돌보는 식사 루틴 유지'],
    '상관': ['💡 창의 아이디어 3개 메모'],
    '편재': ['📈 기회 연결 메시지 1개 보내기'],
    '정재': ['💳 지출 한도 설정 후 소비'],
    '편관': ['🏁 난도 높은 업무 1개 클리어'],
    '정관': ['🗓️ 일정/규칙 100% 준수'],
    '편인': ['🌌 혼자 사색 10분 확보'],
    '정인': ['📖 학습 20분 완수']
  };

  function _seedFromText(text) {
    var s = String(text || 'seed');
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff;
    return h || 13579;
  }

  function _shuffleBySeed(list, seed) {
    var arr = (list || []).slice();
    var x = Math.abs(seed || 1);
    for (var i = arr.length - 1; i > 0; i--) {
      x = (x * 1103515245 + 12345) & 0x7fffffff;
      var j = x % (i + 1);
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  var BLUEPRINT_THEMES = [
    { id: 'wealth', label: '재물 흐름 설계', icon: '💰' },
    { id: 'love', label: '관계 기운 정돈', icon: '💞' },
    { id: 'health', label: '회복력 강화', icon: '🫀' },
    { id: 'focus', label: '집중/성과 모드', icon: '🎯' }
  ];

  var AI_COACH_ENGINE_PROMPT = [
    'Role: AI Luck Coach based on Gaewoon principles.',
    'Input: completed actions, pending actions, reflection memo, ten-star, lucky element, tomorrow theme.',
    'Output: data-based luck design guide in Korean.',
    'Style: Avoid generic praise. Use pattern "오늘 ~를 실천하셨으니, 내일은 ~한 기운이 들어올 때 ~ 행동으로 시너지를 키우세요."',
    'Rule: Keep it practical and specific.'
  ].join(' ');

  function calcNightEffort(entry) {
    var total = Number(entry && entry.challengeTotalToday) || ((entry && entry.challengeCatalog && entry.challengeCatalog.length) || 0);
    var done = (entry && entry.challenges && entry.challenges.length) ? entry.challenges.length : 0;
    var pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { done: done, total: total, pct: pct };
  }

  function launchNightConfetti() {
    var wrap = document.createElement('div');
    wrap.className = 'lsd-confetti-wrap';
    for (var i = 0; i < 18; i++) {
      var bit = document.createElement('i');
      bit.className = 'lsd-confetti-bit';
      bit.style.left = (35 + Math.random() * 30) + 'vw';
      bit.style.background = ['#22d3ee', '#fb7185', '#a78bfa', '#fbbf24', '#34d399'][i % 5];
      bit.style.animationDelay = (Math.random() * 0.14) + 's';
      bit.style.transform = 'translate3d(0,0,0) rotate(' + Math.round(Math.random() * 320) + 'deg)';
      wrap.appendChild(bit);
    }
    document.body.appendChild(wrap);
    setTimeout(function () {
      if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
    }, 1300);
  }

  function buildAiLuckCoachAdvice(entry) {
    var doneIds = Array.isArray(entry && entry.challenges) ? entry.challenges : [];
    var catalog = Array.isArray(entry && entry.challengeCatalog) ? entry.challengeCatalog : [];
    var byId = {};
    catalog.forEach(function (c) { byId[c.id] = c.text; });
    var doneTexts = doneIds.map(function (id) { return byId[id]; }).filter(Boolean);
    var pendingTexts = catalog.filter(function (c) { return doneIds.indexOf(c.id) < 0; }).map(function (c) { return c.text; });
    var note = String((entry && entry.practiceNote) || '').trim();
    var effort = calcNightEffort(entry);
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    var tomorrowGZ = getGanZhiByDate(tomorrow);
    var tomorrowEl = (tomorrowGZ && tomorrowGZ.g) ? (GAN_ELEM[tomorrowGZ.g] || 'earth') : 'earth';
    var tomorrowInfo = ELEM[tomorrowEl] || ELEM.earth;
    var themeMap = {
      wealth: '재물 흐름',
      love: '관계 조율',
      health: '체력 회복',
      focus: '집중 성과'
    };
    var themeText = themeMap[entry && entry.tomorrowBlueprint] || '핵심 루틴';
    var tomorrowPlan = Array.isArray(entry && entry.tomorrowActionPlan) ? entry.tomorrowActionPlan : [];
    var doneHeadline = doneTexts[0] || '핵심 루틴 1개';
    var pendingHeadline = pendingTexts[0] || tomorrowPlan[0] || '자기 전 30분 정리 루틴';
    var memoSignal = note ? ('메모에서 확인된 흐름: "' + escHtml(note.slice(0, 48)) + (note.length > 48 ? '...' : '') + '".') : '오늘 메모가 짧아 체감 데이터를 더 모으면 조언 정확도가 올라갑니다.';
    var liftLine = effort.pct >= 70
      ? '실천도가 높아 내일 운의 진입 속도가 빠를 가능성이 큽니다.'
      : '실천도 ' + effort.pct + '% 구간이라 내일은 루틴 수를 줄이고 핵심 2개만 끝내는 전략이 효율적입니다.';

    return ''
      + '오늘 <b>' + escHtml(doneHeadline) + '</b>를 실천하셨으니, 내일은 <b style="color:' + tomorrowInfo.neon + '">' + tomorrowInfo.cn + '</b> 기운이 들어올 때 <b>' + escHtml(themeText) + '</b> 행동으로 시너지를 키우세요.<br>'
      + '보완 포인트는 <b>' + escHtml(pendingHeadline) + '</b>입니다. 오전/저녁 중 고정 슬롯 1개를 지정하면 운의 편차를 줄일 수 있습니다.<br>'
      + memoSignal + '<br>'
      + liftLine;
  }

  function buildTomorrowActionPlan(entry) {
    var theme = entry && entry.tomorrowBlueprint;
    var themeActions = {
      wealth: ['불필요 결제 1건 보류 후 24시간 재검토', '오전 1건은 수익/성과 직결 업무 먼저 처리', '저녁에 지출/수입 로그 1줄 기록'],
      love: ['먼저 연락 1회로 관계 온도 올리기', '오해 가능 문장은 확인 질문으로 정리', '감사/칭찬 메시지 1개 발송'],
      health: ['기상 후 물 1잔 + 스트레칭 5분', '점심 이후 카페인 1회 줄이기', '취침 40분 전 디지털 오프'],
      focus: ['가장 중요한 업무 25분 몰입 2회', '알림 끄고 단일작업 슬롯 1개 확보', '퇴근 전 내일 첫 업무 1개 예약']
    };
    var doneIds = Array.isArray(entry && entry.challenges) ? entry.challenges : [];
    var catalog = Array.isArray(entry && entry.challengeCatalog) ? entry.challengeCatalog : [];
    var carry = catalog.filter(function (c) { return doneIds.indexOf(c.id) < 0; }).slice(0, 2).map(function (c) { return c.text; });
    var head = (themeActions[theme] || themeActions.focus).slice(0, 1);
    var plan = head.concat(carry);
    while (plan.length < 3) {
      plan.push((themeActions[theme] || themeActions.focus)[plan.length % 3]);
    }
    return plan.slice(0, 3);
  }

  function renderNightPracticeBoard(entry) {
    var summaryBox = document.getElementById('lsdTomorrowFocusSummary');
    var tomorrowPlanList = document.getElementById('lsdTomorrowPlanList');
    var noteInput = document.getElementById('lsdPracticeNoteInput');
    var noteCount = document.getElementById('lsdPracticeCharCount');
    var coachCard = document.getElementById('lsdAiLuckCoach');
    var themeBox = document.getElementById('lsdTomorrowBlueprintBtns');

    var currentTheme = entry.tomorrowBlueprint || 'focus';
    if (!Array.isArray(entry.tomorrowActionPlan) || !entry.tomorrowActionPlan.length || entry.tomorrowPlanTheme !== currentTheme) {
      entry.tomorrowActionPlan = buildTomorrowActionPlan(entry);
      entry.tomorrowPlanTheme = currentTheme;
    }

    var effort = calcNightEffort(entry);
    var meditationPts = calcMeditationPoints(entry);
    if (summaryBox) {
      summaryBox.innerHTML = '<strong>🧭 내일 설계 기준</strong><br>'
        + '오늘 오운완 완료율 ' + effort.pct + '%, 명상 포인트 ' + meditationPts + 'pt를 반영해 내일 실행 3단계를 생성했습니다.';
    }
    if (tomorrowPlanList) {
      tomorrowPlanList.innerHTML = (entry.tomorrowActionPlan || []).map(function (x, idx) {
        return '<div class="lsd-night-action"><span class="lsd-night-action-check">' + (idx + 1) + '</span><span class="lsd-night-action-text">' + escHtml(x) + '</span></div>';
      }).join('');
    }

    if (noteInput) {
      noteInput.value = entry.practiceNote || entry.nightLog || '';
      if (noteCount) noteCount.textContent = noteInput.value.length;
    }

    if (coachCard) {
      if (entry.aiLuckCoach) {
        coachCard.innerHTML = entry.aiLuckCoach + (entry.aiCoachUpdatedAt ? '<div class="lsd-ai-foot">최근 생성: ' + escHtml(entry.aiCoachUpdatedAt) + '</div>' : '');
      } else {
        coachCard.innerHTML = '오운완 완료 데이터와 설계 메모를 바탕으로, 내일 운 설계 전용 가이드를 생성합니다.';
      }
    }

    if (themeBox) {
      themeBox.querySelectorAll('[data-blueprint]').forEach(function (btn) {
        btn.classList.toggle('is-on', btn.getAttribute('data-blueprint') === entry.tomorrowBlueprint);
      });
    }
  }

  var _lsdMeditationTimer = null;
  var _lsdSatsYouTubeCache = { lofi: null, theta: null };
  var _lsdSatsNowPlaying = { mode: '', videoId: '' };
  var LSD_YOUTUBE_API_KEY = String(window.LSD_YOUTUBE_API_KEY || '');
  var LSD_SATS_SOURCE_META = {
    lofi: { label: 'LoFi', query: 'copyright free lofi playlist beats to study and relax' },
    theta: { label: 'Theta', query: 'theta binaural beats no copyright meditation playlist' }
  };

  function getTomorrowLuckKeyword(entry) {
    var byTheme = {
      wealth: '재물운 상승',
      love: '귀인 상봉',
      health: '회복력 강화',
      focus: '집중 성과 실현'
    };
    if (entry && entry.tomorrowBlueprint && byTheme[entry.tomorrowBlueprint]) {
      return byTheme[entry.tomorrowBlueprint];
    }
    if (_lsdCtx.mainTenStar === '정재' || _lsdCtx.mainTenStar === '편재') return '재물운 상승';
    if (_lsdCtx.mainTenStar === '정관' || _lsdCtx.mainTenStar === '편관') return '성과와 인정';
    if (_lsdCtx.luckyEl === 'water') return '직감력 상승';
    return '귀인 상봉';
  }

  function buildSatsSceneText(keyword, entry) {
    var scenes = {
      '재물운 상승': [
        '송금 완료 알림이 뜨고 통장 잔액이 안정적으로 늘어난 화면을 보며 안도하는 장면',
        '월말 정산표에서 수입 칸이 예상보다 크게 올라 모두가 박수치는 장면',
        '필요한 계약이 무리 없이 성사되어 첫 입금 문자를 확인하는 장면',
        '오래 고민하던 지출을 현명하게 줄여 여유 자금을 확보한 장면',
        '가벼운 미소로 투자/저축 목표 달성 체크박스를 채우는 장면'
      ],
      '귀인 상봉': [
        '필요한 타이밍에 정확한 도움을 주는 사람과 웃으며 악수하는 장면',
        '막히던 문제의 해답을 아는 멘토를 만나 대화가 술술 풀리는 장면',
        '우연한 소개 자리에서 서로의 방향이 딱 맞아 대화가 길어지는 장면',
        '팀 미팅에서 나를 지지해 주는 조력자의 한마디로 분위기가 바뀌는 장면',
        '중요한 연락이 와서 다음 기회가 자연스럽게 연결되는 장면'
      ],
      '회복력 강화': [
        '가벼운 몸과 맑은 호흡으로 아침 햇빛을 받으며 상쾌하게 일어나는 장면',
        '어깨와 목의 긴장이 풀리며 깊은 숨이 편안하게 들어오는 장면',
        '짧은 산책 후 심장이 안정되고 머리가 맑아지는 장면',
        '따뜻한 물 한 잔을 마신 뒤 속이 편안해지고 집중이 살아나는 장면',
        '저녁 루틴을 지키고 숙면 후 개운하게 눈을 뜨는 장면'
      ],
      '집중 성과 실현': [
        '중요한 업무를 완성해 전송 버튼을 누른 뒤 칭찬 메시지를 받는 장면',
        '할 일 목록의 가장 큰 항목을 먼저 지우고 마음이 가벼워지는 장면',
        '몰입 타이머가 끝날 때마다 결과물이 분명하게 쌓여 있는 장면',
        '회의 자료를 깔끔하게 정리해 모두가 이해했다며 고개를 끄덕이는 장면',
        '마감 전에 핵심 과제를 끝내고 여유 있게 검토하는 장면'
      ],
      '성과와 인정': [
        '회의 종료 직후 "정확했다"는 피드백을 듣고 고개를 끄덕이는 장면',
        '프로젝트 발표 후 팀 채팅에 축하 메시지가 연달아 도착하는 장면',
        '상사가 내 준비성을 칭찬하며 다음 기회를 제안하는 장면',
        '내가 만든 기준안이 공식 문서로 채택되는 장면',
        '발표 자료 마지막 페이지에서 박수와 미소를 동시에 마주하는 장면'
      ],
      '직감력 상승': [
        '잠깐의 직감으로 올바른 선택을 하고 바로 좋은 결과를 확인하는 장면',
        '첫 느낌대로 결정했는데 예상보다 빠르게 길이 열리는 장면',
        '사소한 신호를 놓치지 않아 리스크를 미리 피하는 장면',
        '고민하던 선택지 중 하나를 직관적으로 고르고 확신이 드는 장면',
        '우선순위를 즉시 잡아 하루 흐름이 매끄럽게 이어지는 장면'
      ]
    };
    var pool = scenes[keyword] || [
      '내일 원하는 결과가 이미 완료되어 편안하게 미소 짓는 장면',
      '하루의 핵심 목표를 이룬 뒤 가볍게 스트레칭하며 안도하는 장면',
      '좋은 소식 알림을 확인하고 마음이 안정되는 장면'
    ];
    var prev = entry && typeof entry.satsSceneLastIndex === 'number' ? entry.satsSceneLastIndex : -1;
    var idx = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && idx === prev) idx = (idx + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length;
    if (entry && typeof entry === 'object') entry.satsSceneLastIndex = idx;
    return pool[idx];
  }

  function buildIamAffirmation(entry) {
    var keyword = getTomorrowLuckKeyword(entry);
    var map = {
      '재물운 상승': '나는 오늘 흐름을 읽고 부를 정확히 다루는 사람이다.',
      '귀인 상봉': '나는 오늘 좋은 인연을 자연스럽게 끌어당기는 사람이다.',
      '회복력 강화': '나는 오늘 안정된 호흡과 체력으로 중심을 지키는 사람이다.',
      '집중 성과 실현': '나는 오늘 가장 중요한 일을 끝까지 완성하는 사람이다.',
      '성과와 인정': '나는 오늘 신뢰를 증명하고 인정받는 사람이다.',
      '직감력 상승': '나는 오늘 필요한 신호를 정확히 감지하는 사람이다.'
    };
    return map[keyword] || '나는 오늘 운의 흐름을 선택하고 실천하는 사람이다.';
  }

  function calcMeditationPoints(entry) {
    var rev = Number(entry && entry.revisionDoneCount) || 0;
    var sats = entry && entry.satsCompleted ? 1 : 0;
    var iam = entry && entry.iAmCompleted ? 1 : 0;
    var mins = Number(entry && entry.meditationMinutes) || 0;
    var pts = (rev * 8) + (sats * 18) + (iam * 10) + Math.min(15, mins);
    return Math.max(0, Math.min(100, pts));
  }

  function renderMeditationTrend(diary) {
    var box = document.getElementById('lsdMeditationTrend');
    if (!box) return;
    var keys = Object.keys(diary || {}).sort().slice(-7);
    if (!keys.length) {
      box.innerHTML = '<div style="font-size:.7rem;color:#94a3b8">명상 기록이 쌓이면 최근 7일 추세가 표시됩니다.</div>';
      return;
    }
    var rows = keys.map(function (k) {
      var e = diary[k] || {};
      ensureEntryShape(e);
      var p = calcMeditationPoints(e);
      return '<div style="display:grid;grid-template-columns:68px 1fr 34px;gap:8px;align-items:center">'
        + '<span style="font-size:.66rem;color:#64748b">' + k.slice(5) + '</span>'
        + '<div style="height:7px;border-radius:999px;background:#1e293b;overflow:hidden"><div style="height:100%;width:' + p + '%;background:linear-gradient(90deg,#22d3ee,#a78bfa)"></div></div>'
        + '<span style="font-size:.66rem;color:#e2e8f0;text-align:right">' + p + '</span>'
        + '</div>';
    }).join('');
    box.innerHTML = rows;
  }

  function renderMeditationBoard(entry, diary) {
    var originalInput = document.getElementById('lsdRevisionOriginal');
    var revisedInput = document.getElementById('lsdRevisionImagined');
    var revStatus = document.getElementById('lsdRevisionStatus');
    var satsKeyword = document.getElementById('lsdSatsKeyword');
    var satsScene = document.getElementById('lsdSatsScene');
    var iAmCard = document.getElementById('lsdIamCard');
    var iAmInput = document.getElementById('lsdIamInput');
    var pts = document.getElementById('lsdMeditationPoints');

    if (!entry.revisionOriginal && entry.practiceNote) entry.revisionOriginal = entry.practiceNote;
    if (!entry.satsKeyword) entry.satsKeyword = getTomorrowLuckKeyword(entry);
    if (!entry.satsScene) entry.satsScene = buildSatsSceneText(entry.satsKeyword, entry);
    if (!entry.iAmAffirmation) entry.iAmAffirmation = buildIamAffirmation(entry);
    entry.meditationPoints = calcMeditationPoints(entry);

    if (originalInput) originalInput.value = entry.revisionOriginal || '';
    if (revisedInput) revisedInput.value = entry.revisionImagined || '';
    if (revStatus) {
      revStatus.textContent = 'Revision 완료 ' + (entry.revisionDoneCount || 0) + '회 · 누적 ' + (entry.meditationMinutes || 0) + '분';
    }
    if (satsKeyword) satsKeyword.textContent = entry.satsKeyword;
    if (satsScene) satsScene.textContent = entry.satsScene;
    if (iAmCard) iAmCard.textContent = entry.iAmAffirmation;
    if (iAmInput) iAmInput.value = entry.iAmCompleted ? entry.iAmAffirmation : '';
    if (pts) pts.textContent = String(entry.meditationPoints || 0);

    renderMeditationTrend(diary);
  }

  function stopSatsAudio() {
    var frame = document.getElementById('lsdSatsYoutubeFrame');
    var holder = document.getElementById('lsdSatsPlayerPlaceholder');
    var nowTitle = document.getElementById('lsdSatsNowPlayingTitle');
    if (frame) {
      frame.src = '';
      frame.style.display = 'none';
    }
    if (holder) holder.style.display = 'flex';
    if (nowTitle) nowTitle.textContent = '재생 중인 트랙 없음';
    _lsdSatsNowPlaying.videoId = '';
    var list = document.getElementById('lsdSatsPlaylist');
    if (list) {
      list.querySelectorAll('.lsd-sats-track').forEach(function (item) {
        item.classList.remove('is-playing');
      });
    }
  }

  function buildYouTubeSearchUrl(mode) {
    var meta = LSD_SATS_SOURCE_META[mode] || LSD_SATS_SOURCE_META.lofi;
    var q = encodeURIComponent(meta.query);
    return 'https://www.googleapis.com/youtube/v3/search'
      + '?part=snippet&type=video&videoEmbeddable=true&videoLicense=creativeCommon'
      + '&maxResults=8&safeSearch=strict&key=' + encodeURIComponent(LSD_YOUTUBE_API_KEY)
      + '&q=' + q;
  }

  function fetchSatsPlaylist(mode, force) {
    if (!force && Array.isArray(_lsdSatsYouTubeCache[mode]) && _lsdSatsYouTubeCache[mode].length) {
      return Promise.resolve(_lsdSatsYouTubeCache[mode]);
    }
    if (!LSD_YOUTUBE_API_KEY) {
      return Promise.reject(new Error('YouTube API 키가 없습니다.'));
    }
    var url = buildYouTubeSearchUrl(mode);
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('YouTube API 요청 실패 (' + res.status + ')');
        return res.json();
      })
      .then(function (json) {
        var items = ((json && json.items) || []).map(function (item) {
          var id = item && item.id && item.id.videoId;
          if (!id) return null;
          var sn = item.snippet || {};
          var thumb = (sn.thumbnails && (sn.thumbnails.medium || sn.thumbnails.default || sn.thumbnails.high)) || {};
          return {
            videoId: id,
            title: String(sn.title || '제목 없음'),
            channel: String(sn.channelTitle || 'YouTube'),
            thumb: String(thumb.url || '')
          };
        }).filter(Boolean);
        if (!items.length) throw new Error('조건에 맞는 재생 목록을 찾지 못했습니다.');
        _lsdSatsYouTubeCache[mode] = items;
        return items;
      });
  }

  function renderSatsPlaylist(mode, items, message) {
    var list = document.getElementById('lsdSatsPlaylist');
    var status = document.getElementById('lsdSatsPlaylistStatus');
    if (!list || !status) return;
    var modeMeta = LSD_SATS_SOURCE_META[mode] || LSD_SATS_SOURCE_META.lofi;
    if (!Array.isArray(items) || !items.length) {
      list.innerHTML = '<div class="lsd-sats-empty">표시할 트랙이 없습니다.</div>';
      status.textContent = message || (modeMeta.label + ' 플레이리스트를 불러오지 못했습니다.');
      return;
    }
    status.textContent = message || (modeMeta.label + ' 저작권 프리 플레이리스트 ' + items.length + '곡 준비됨');
    list.innerHTML = items.map(function (item, idx) {
      var active = _lsdSatsNowPlaying.videoId === item.videoId ? ' is-playing' : '';
      var thumbHtml = item.thumb
        ? ('<img class="lsd-sats-thumb" src="' + escHtml(item.thumb) + '" alt="썸네일" loading="lazy">')
        : '<div class="lsd-sats-thumb lsd-sats-thumb--blank">♪</div>';
      return ''
        + '<div class="lsd-sats-track' + active + '" data-sats-video="' + escHtml(item.videoId) + '">'
        + thumbHtml
        + '<div class="lsd-sats-meta">'
        + '  <p class="lsd-sats-track-title">' + escHtml(String(idx + 1) + '. ' + item.title) + '</p>'
        + '  <p class="lsd-sats-track-channel">' + escHtml(item.channel) + '</p>'
        + '</div>'
        + '<button type="button" class="lsd-sats-play-btn" data-sats-play="' + escHtml(item.videoId) + '">▶ 재생</button>'
        + '</div>';
    }).join('');
  }

  function markSatsPlaying(videoId) {
    var list = document.getElementById('lsdSatsPlaylist');
    if (!list) return;
    list.querySelectorAll('.lsd-sats-track').forEach(function (item) {
      var isOn = item.getAttribute('data-sats-video') === videoId;
      item.classList.toggle('is-playing', isOn);
    });
  }

  function playSatsVideo(mode, videoId) {
    var frame = document.getElementById('lsdSatsYoutubeFrame');
    var holder = document.getElementById('lsdSatsPlayerPlaceholder');
    var nowTitle = document.getElementById('lsdSatsNowPlayingTitle');
    var zone = document.getElementById('lsdSatsZone');
    var tracks = _lsdSatsYouTubeCache[mode] || [];
    var picked = null;
    for (var i = 0; i < tracks.length; i++) {
      if (tracks[i].videoId === videoId) { picked = tracks[i]; break; }
    }
    if (!frame || !picked) return;
    if (zone) zone.classList.add('is-dark');
    frame.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(videoId)
      + '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
    frame.style.display = 'block';
    if (holder) holder.style.display = 'none';
    if (nowTitle) nowTitle.textContent = picked.title;
    _lsdSatsNowPlaying.mode = mode;
    _lsdSatsNowPlaying.videoId = videoId;
    markSatsPlaying(videoId);

    var d = loadDiary();
    var e = getTodayEntry(d);
    e.satsCompleted = true;
    e.meditationLogs.push({ type: 'sats', ts: Date.now(), mode: mode, videoId: videoId });
    e.meditationPoints = calcMeditationPoints(e);
    saveDiary(d);
    renderMeditationBoard(e, d);
  }

  function loadSatsPlaylist(mode, force) {
    var status = document.getElementById('lsdSatsPlaylistStatus');
    var list = document.getElementById('lsdSatsPlaylist');
    if (status) status.textContent = 'YouTube에서 ' + ((LSD_SATS_SOURCE_META[mode] || LSD_SATS_SOURCE_META.lofi).label) + ' 플레이리스트를 불러오는 중...';
    if (list) list.innerHTML = '<div class="lsd-sats-empty">잠시만요, 트랙을 수집 중입니다...</div>';
    return fetchSatsPlaylist(mode, !!force)
      .then(function (items) {
        renderSatsPlaylist(mode, items);
      })
      .catch(function (err) {
        renderSatsPlaylist(mode, [], (err && err.message) ? err.message : '플레이리스트 로드 실패');
      });
  }

  function buildChallenges(luckyEl, mainTenStar, todayGZ) {
    var diary = loadDiary();
    var entry = getTodayEntry(diary);
    var container = document.getElementById('lsdChallenges');
    if (!container) return;

    var elemChallenges = (CHALLENGE_SETS[luckyEl] || CHALLENGE_SETS.earth);
    var branch = (todayGZ && todayGZ.j) ? todayGZ.j : '子';
    var branchPool = CHALLENGE_POOL_BY_BRANCH[branch] || [];
    var tenPool = (mainTenStar && CHALLENGE_POOL_BY_TENSTAR[mainTenStar]) ? CHALLENGE_POOL_BY_TENSTAR[mainTenStar] : [];
    var mergedPool = CHALLENGE_POOL_BASE.concat(elemChallenges).concat(branchPool).concat(tenPool);
    var uniquePool = [];
    var seen = {};
    mergedPool.forEach(function (txt) {
      if (!seen[txt]) {
        seen[txt] = true;
        uniquePool.push(txt);
      }
    });
    var seed = _seedFromText(getTodayKey() + '|' + (todayGZ ? (todayGZ.g + todayGZ.j) : 'na') + '|' + luckyEl + '|' + (mainTenStar || 'x'));
    var picked = _shuffleBySeed(uniquePool, seed).slice(0, 9);
    var allChallenges = picked.map(function (txt, idx) {
      return { id: 'c' + String(idx + 1), text: txt, type: 'random' };
    });

    entry.challengeCatalog = allChallenges.map(function (c) { return { id: c.id, text: c.text }; });
    entry.challengeTotalToday = allChallenges.length;
    entry.actionPlan = allChallenges.map(function (c) { return { id: c.id, text: c.text, group: c.type }; });
    if (!Array.isArray(entry.challenges)) entry.challenges = [];
    entry.challenges = entry.challenges.filter(function (id) {
      return allChallenges.some(function (c) { return c.id === id; });
    });
    saveDiary(diary);

    container.innerHTML = allChallenges.map(function (c) {
      var checked = (entry.challenges || []).indexOf(c.id) >= 0;
      return '<label class="lsd-challenge-item' + (checked ? ' is-done' : '') + '" data-challenge-id="' + c.id + '">' +
        '<span class="lsd-check-box">' + (checked ? '✔' : '') + '</span>' +
        '<span class="lsd-challenge-text">' + c.text + '</span>' +
        '</label>';
    }).join('');

    function refreshChallengeCongrats(entryData) {
      var congratsEl = document.getElementById('lsdChallengeCongrats');
      if (!congratsEl) return;
      var doneCount = 0;
      var ids = (entryData && entryData.challenges) || [];
      allChallenges.forEach(function (c) {
        if (ids.indexOf(c.id) >= 0) doneCount++;
      });

      if (doneCount >= Math.max(5, Math.floor(allChallenges.length * 0.75)) && allChallenges.length > 0) {
        var luckyInfo = ELEM[luckyEl] || ELEM.earth;
        var ts = (mainTenStar && TENSTAR_GUIDE[mainTenStar]) ? TENSTAR_GUIDE[mainTenStar] : null;
        congratsEl.innerHTML = '🎉 오운완 클리어! 오늘은 <b style="color:' + luckyInfo.neon + '">' + luckyInfo.cn + '</b> 기운이 활짝 열렸어요.'
          + (ts ? ' <br>✨ ' + mainTenStar + ' 흐름에 맞춰 <b>' + ts.vibe + '</b>를 내일도 이어가면 운이 더 빨리 붙습니다.' : ' <br>✨ 지금 루틴을 1개만 더 이어가면 내일 운세 상승폭이 커져요.');
        congratsEl.style.display = 'block';
      } else {
        congratsEl.style.display = 'none';
      }
    }

    refreshChallengeCongrats(entry);

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
        refreshChallengeCongrats(e);
        renderNightPracticeBoard(e);
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
    var blueprintMap = {
      wealth: '💰 재물',
      love: '💞 관계',
      health: '🫀 회복',
      focus: '🎯 집중'
    };
    list.innerHTML = keys.slice(0, 30).map(function (k) {
      var e = diary[k];
      var mood = e.moodEmoji || '';
      var lotto = e.lotto ? (e.lotto.emoji + ' ' + e.lotto.name) : '';
      var doneCount = (e.challenges || []).length;
      var effort = calcNightEffort(e);
      var medPts = calcMeditationPoints(e);
      var bp = blueprintMap[e.tomorrowBlueprint] || '';
      var memo = e.practiceNote || e.nightLog || '';
      return '<div class="lsd-history-item">' +
        '<div class="lsd-history-date">' + k + ' ' + mood + '</div>' +
        '<div class="lsd-history-meta">' +
          (effort.total > 0 ? '<span class="lsd-history-tag">📈 실천 ' + effort.pct + '%</span>' : '') +
          (medPts > 0 ? '<span class="lsd-history-tag">🧘 명상 ' + medPts + 'pt</span>' : '') +
          (lotto ? '<span class="lsd-history-tag">🎱 ' + lotto + '</span>' : '') +
          (bp ? '<span class="lsd-history-tag">🧭 ' + bp + '</span>' : '') +
          (doneCount > 0 ? '<span class="lsd-history-tag">✅ 미션 ' + doneCount + '완</span>' : '') +
        '</div>' +
        (memo ? '<div class="lsd-history-log">"' + escHtml(memo) + '"</div>' : '') +
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
      meditation:'lsdPanelMeditation',
      history:   'lsdPanelHistory'
    };
    Object.keys(panelMap).forEach(function (k) {
      var el = document.getElementById(panelMap[k]);
      if (el) el.style.display = (k === tabName) ? 'block' : 'none';
    });
    if (tabName === 'history') renderHistory();
    if (tabName === 'meditation') {
      var d = loadDiary();
      var e = getTodayEntry(d);
      renderMeditationBoard(e, d);
    }
  }

  /* ─── 가챠 로또 ───────────────────────────────────────────────── */
  var _luckyEl = 'wood';
  var _gachaRunning = false;
  var _lottoSpinTimer = null;

  function startLotto() {
    if (_gachaRunning) return;
    _gachaRunning = true;
    var machine = document.getElementById('lsdLottoMachine');
    var globe   = document.getElementById('lsdGlobeInner');
    var result  = document.getElementById('lsdLottoResult');
    var ticker  = document.getElementById('lsdLottoTicker');
    var btn     = document.getElementById('lsdLottoBtn');
    var spinPool = ['🌱', '🔥', '🤎', '⚡', '💧', '🍀', '✨', '🎯', '🧿', '💎'];
    var spinFrames = 0;
    if (!globe || !btn || !machine) { _gachaRunning = false; return; }

    btn.disabled = true;
    btn.textContent = '🎰 뽑는 중...';
    if (result) result.style.display = 'none';
    if (_lottoSpinTimer) {
      clearInterval(_lottoSpinTimer);
      _lottoSpinTimer = null;
    }
    machine.classList.add('is-drawing');
    globe.classList.add('is-spinning');
    _lottoSpinTimer = setInterval(function () {
      spinFrames++;
      var a = spinPool[Math.floor(Math.random() * spinPool.length)];
      var b = spinPool[Math.floor(Math.random() * spinPool.length)];
      var c = spinPool[Math.floor(Math.random() * spinPool.length)];
      globe.textContent = a + ' ' + b + ' ' + c + ' ' + spinPool[(spinFrames + 3) % spinPool.length] + ' ' + spinPool[(spinFrames + 6) % spinPool.length];
      if (ticker) ticker.textContent = 'MIXING ' + spinPool[(spinFrames + 1) % spinPool.length] + ' ' + spinPool[(spinFrames + 4) % spinPool.length];
    }, 110);

    setTimeout(function () {
      if (_lottoSpinTimer) {
        clearInterval(_lottoSpinTimer);
        _lottoSpinTimer = null;
      }
      machine.classList.remove('is-drawing');
      globe.classList.remove('is-spinning');
      btn.disabled = false;
      btn.textContent = '🎱 오늘의 럭키 비키 아이템 뽑기';
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
        ballEl.classList.remove('lsd-result-ball-pop', 'animate-bounce');
        requestAnimationFrame(function(){requestAnimationFrame(function(){ballEl.classList.add('lsd-result-ball-pop', 'animate-bounce');});});
      }
      if (emojiEl) emojiEl.textContent = item.emoji;
      if (nameEl)  nameEl.textContent  = item.name;
      if (tipEl)   tipEl.textContent   = item.tip;
      if (ticker)  ticker.textContent  = 'RESULT: ' + item.emoji + ' ' + item.name;

      if (result) {
        result.style.display = 'block';
        result.classList.add('lsd-result--pop');
        setTimeout(function () { result.classList.remove('lsd-result--pop'); }, 400);
      }

      // 저장
      var d = loadDiary();
      getTodayEntry(d).lotto = { element: _luckyEl, emoji: item.emoji, name: item.name };
      saveDiary(d);
    }, 2200);
  }

    /* ─── 갓생 지수 스코어 바 렌더 ──────────────────────────── */
  function renderScoreBars(scores) {
    var container = document.getElementById('lsdScoreBars');
    if (!container) return;
    var items = [
      { key: 'wealth', label: '재물 💰', color: '#fbbf24' },
      { key: 'love',   label: '애정 💕', color: '#f472b6' },
      { key: 'fame',   label: '명예 👑', color: '#a78bfa' },
      { key: 'health', label: '건강 💚', color: '#4ade80' },
      { key: 'study',  label: '학습 📚', color: '#60a5fa' }
    ];
    container.innerHTML = items.map(function (item) {
      var val = scores[item.key] || 0;
      return '<div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">' +
          '<span style="font-size:.74rem;font-weight:700;color:#374151">' + item.label + '</span>' +
          '<span style="font-size:.74rem;font-weight:900;color:' + item.color + '">' + val + '</span>' +
        '</div>' +
        '<div style="height:8px;border-radius:999px;background:#f3f4f6;overflow:hidden">' +
          '<div class="lsd-score-bar-fill" style="width:0%" data-target="' + val + '%"></div>' +
        '</div>' +
      '</div>';
    }).join('');
    setTimeout(function () {
      container.querySelectorAll('.lsd-score-bar-fill').forEach(function (bar) {
        bar.style.width = bar.dataset.target;
      });
    }, 80);
  }

  function renderFortuneDetail(pillars, power, todayGZ, scores, mainTenStar, luckyEl) {
    var box = document.getElementById('lsdFortuneDetail');
    if (!box) return;

    if (!pillars || !pillars.d || !pillars.d.g || !todayGZ || !todayGZ.g) {
      box.innerHTML = '<p style="margin:0;font-size:.74rem;color:#6b7280;line-height:1.6">사주 분석을 완료하면 오늘 운을 더 좋게 만드는 맞춤 실천 가이드를 보여줄게요.</p>';
      return;
    }

    var yons = (power && power.yongshin) || [];
    var kis = (power && power.kijishin) || [];
    var dEl = GAN_ELEM[pillars.d.g] || 'earth';
    var todayEl = GAN_ELEM[todayGZ.g] || 'earth';
    var todayInfo = ELEM[todayEl] || ELEM.earth;
    var luckyInfo = ELEM[luckyEl] || ELEM.earth;
    var timeByElement = {
      wood: '05:00-09:00',
      fire: '09:00-13:00',
      earth: '13:00-17:00',
      metal: '17:00-21:00',
      water: '21:00-23:30'
    };
    var keyMap = {
      wealth: { label: '재물', action: '결제/지출 결정을 오전에 처리하고, 지출 1건은 보류해보세요.', time: '09:00-11:00' },
      love: { label: '애정', action: '짧아도 진심 메시지 1개를 보내면 관계운이 빠르게 반응해요.', time: '19:00-21:00' },
      fame: { label: '명예', action: '오늘 할 일 중 가장 어려운 1개를 먼저 끝내 평판운을 올리세요.', time: '08:00-10:00' },
      health: { label: '건강', action: '20분 걷기나 스트레칭으로 기운 순환을 먼저 열어주세요.', time: '06:30-08:00' },
      study: { label: '학습', action: '집중 25분 1회만 해도 인성운이 살아나며 흐름이 안정됩니다.', time: '21:00-22:30' }
    };

    var bestKey = 'wealth';
    var bestScore = -1;
    Object.keys(keyMap).forEach(function (k) {
      var v = Number(scores && scores[k]) || 0;
      if (v > bestScore) {
        bestScore = v;
        bestKey = k;
      }
    });

    var tenstarLine = '오늘 십성은 미분석 상태입니다. 기본 루틴 1개만 완료해도 운의 마찰이 줄어듭니다.';
    if (mainTenStar && TENSTAR_GUIDE[mainTenStar]) {
      tenstarLine = '오늘 십성 <b>' + mainTenStar + '</b>: ' + TENSTAR_GUIDE[mainTenStar].guide;
    }

    var yongLine = yons.length
      ? '용신 포인트: <b>' + yons.join(', ') + '</b> 오행 활동(색상/장소/소품)을 1개라도 선택하세요.'
      : '용신 정보가 없어도 오늘 행운 오행 활동 1개를 실행하면 운세 체감이 빨라집니다.';
    var kiLine = kis.length
      ? '기신 주의: <b>' + kis.join(', ') + '</b> 관련 과소비/과로 패턴을 오늘만큼은 줄여보세요.'
      : '기신 경고가 약한 날이니, 과감한 시도 1건을 넣기 좋은 타이밍입니다.';

    var todayTime = keyMap[bestKey].time || '오전';
    var todayElemTime = timeByElement[todayEl] || '13:00-17:00';
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    var tomorrowGZ = getGanZhiByDate(tomorrow);
    var tomorrowEl = (tomorrowGZ && tomorrowGZ.g) ? (GAN_ELEM[tomorrowGZ.g] || 'earth') : 'earth';
    var tomorrowInfo = ELEM[tomorrowEl] || ELEM.earth;
    var tomorrowTime = timeByElement[tomorrowEl] || '13:00-17:00';

    var loveScore = Number(scores && scores.love) || 0;
    var wealthScore = Number(scores && scores.wealth) || 0;
    var healthScore = Number(scores && scores.health) || 0;
    var workScore = Number(scores && scores.fame) || 0;
    var loveCheck = loveScore >= 70
      ? '☐ 연애: 먼저 다정한 연락 1회 보내기 / 저녁 10분 대화 시간 확보'
      : '☐ 연애: 감정 단정 금지 / 답장 늦을 때는 확인 질문 1회만 보내기';
    var wealthCheck = wealthScore >= 70
      ? '☐ 재물: 오전 1건 결제 처리 / 오늘 지출 한도 먼저 적기'
      : '☐ 재물: 충동구매 24시간 유예 / 자동결제 내역 1건 점검';
    var healthCheck = healthScore >= 70
      ? '☐ 건강: 20분 걷기 완료 / 수분 6잔 체크'
      : '☐ 건강: 카페인 1잔 줄이기 / 취침 30분 전 화면 끄기';
    var workCheck = workScore >= 70
      ? '☐ 업무: 가장 어려운 업무 1순위 처리 / 진행상황 1회 공유'
      : '☐ 업무: 멀티태스킹 중지 / 25분 집중 블록 2회 실행';

    var tomorrowFocus = '';
    var tomorrowCaution = '';
    if (yons.indexOf(tomorrowEl) >= 0) {
      tomorrowFocus = '추진력이 잘 살아나는 날이에요. 가장 중요한 1건부터 가볍게 시작해보세요.';
      tomorrowCaution = '욕심이 커질 수 있으니, 일정은 핵심 2개만 잡아도 충분히 좋아요.';
    } else if (kis.indexOf(tomorrowEl) >= 0) {
      tomorrowFocus = '정리와 점검에 힘이 실리는 흐름이에요. 미뤄둔 확인 업무부터 천천히 해보세요.';
      tomorrowCaution = '마음이 급해질 수 있으니, 결제·약속·답장은 한 번 더 점검하고 진행해보세요.';
    } else if (tomorrowEl === SHENG[dEl]) {
      tomorrowFocus = '회복과 학습 흐름이 좋아요. 아침 루틴을 정리하고 짧게 공부를 시작해보세요.';
      tomorrowCaution = '생각이 길어질 수 있으니, 체크리스트를 보고 5분 안에 선택해도 괜찮아요.';
    } else if (KE[tomorrowEl] === dEl) {
      tomorrowFocus = '집중하면 성과로 연결되기 좋은 날이에요. 마감이 있는 업무부터 차분히 잡아보세요.';
      tomorrowCaution = '타인 일정에 끌리기 쉬우니, 쉬는 시간부터 먼저 확보해두면 훨씬 편안해요.';
    } else if (KE[dEl] === tomorrowEl) {
      tomorrowFocus = '의사결정이 비교적 잘 되는 날이에요. 금액·일정 대화를 오전에 가볍게 꺼내보세요.';
      tomorrowCaution = '의견이 강해질 수 있으니, 말투와 속도를 한 톤 부드럽게 유지해보세요.';
    } else {
      tomorrowFocus = '변화에 유연하게 대응하기 좋은 날이에요. 새 루틴을 부담 없이 시험해보세요.';
      tomorrowCaution = '할 일이 흩어질 수 있으니, 아침에 핵심 1개만 먼저 정하면 충분합니다.';
    }

    var colorGuide = {
      wood: '민트 + 라이트그린',
      fire: '코랄 + 오렌지레드',
      earth: '베이지 + 카멜',
      metal: '실버 + 화이트그레이',
      water: '네이비 + 스카이블루'
    };
    var placeGuide = {
      wood: '창가/공원 근처처럼 초록이 보이는 장소',
      fire: '밝은 조명 공간, 햇빛이 드는 자리',
      earth: '정돈된 책상, 안정감 있는 카페 좌석',
      metal: '깔끔한 미팅룸, 정리된 작업 테이블',
      water: '조용한 코너석, 음악이 잔잔한 공간'
    };
    var socialGuide = {
      wealth: '결론 먼저 말하고 숫자/기한을 짧게 덧붙이면 신뢰가 올라가요.',
      love: '상대의 감정을 먼저 확인한 뒤 내 의도를 말하면 오해가 줄어요.',
      fame: '진행 상황을 한 번 더 공유하면 "믿고 맡길 수 있는 사람" 인상이 강해져요.',
      health: '무리 약속은 정중히 조절하고, 컨디션 회복 시간을 선점하세요.',
      study: '질문 1개와 배운 점 1개를 남기면 성장운이 더 오래 유지돼요.'
    };

    var cautionList = [];
    if (kis.indexOf(todayEl) >= 0) cautionList.push('기신 오행이 강해 감정 반응이 커질 수 있어요. 답변은 10초 숨 고르고 보내세요.');
    if (KE[todayEl] === dEl) cautionList.push('압박을 크게 느끼기 쉬운 날이라 멀티태스킹보다 단일 작업이 안전해요.');
    if (KE[dEl] === todayEl) cautionList.push('의견을 밀어붙이기 쉬우니 제안형 문장("어떨까요?")으로 톤을 조절해보세요.');
    if (!cautionList.length) cautionList.push('큰 이슈는 오전 1회, 저녁 1회로 나눠 처리하면 피로 누적을 줄일 수 있어요.');

    var daySeed = new Date().getDate() + (todayGZ.g ? todayGZ.g.charCodeAt(0) : 0) + (todayGZ.j ? todayGZ.j.charCodeAt(0) : 0);
    var luckyPool = LUCKY_ITEMS[luckyEl] || [];
    var luckyItemA = luckyPool.length ? luckyPool[daySeed % luckyPool.length] : null;
    var luckyItemB = luckyPool.length > 1 ? luckyPool[(daySeed + 2) % luckyPool.length] : null;
    var itemLine = luckyItemA
      ? (luckyItemA.emoji + ' ' + luckyItemA.name + (luckyItemB ? (' / ' + luckyItemB.emoji + ' ' + luckyItemB.name) : ''))
      : (luckyInfo.badge + ' ' + luckyInfo.cn + ' 소품');
    var itemTip = luckyItemA ? luckyItemA.tip : '오늘 오행 색감 소품을 하나만 챙겨도 흐름 전환에 도움이 돼요.';

    var topScoreLine = keyMap[bestKey].label + '운 ' + bestScore + '점';
    var cautionTop = cautionList[0] || '속도보다 리듬을 지키는 운영이 더 유리해요.';

    box.innerHTML = ''
      + '<p style="margin:0 0 8px;font-size:.78rem;font-weight:900;color:#111827">🔮 오늘 운세 카드 · 카테고리 가이드</p>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:.72rem;line-height:1.5">'
      + '  <div style="border:1px solid #e2e8f0;border-radius:10px;padding:8px;background:#fff">'
      + '    <p style="margin:0 0 4px;font-weight:900;color:#0f172a">🧭 오늘의 핵심 조언</p>'
      + '    <p style="margin:0;color:#334155">최상 운 영역: <b>' + topScoreLine + '</b><br>' + keyMap[bestKey].action + '</p>'
      + '  </div>'
      + '  <div style="border:1px solid #e2e8f0;border-radius:10px;padding:8px;background:#fff">'
      + '    <p style="margin:0 0 4px;font-weight:900;color:#0f172a">🎨 행운의 색 & 장소</p>'
      + '    <p style="margin:0;color:#334155">컬러: <b style="color:' + luckyInfo.neon + '">' + (colorGuide[luckyEl] || luckyInfo.lotto) + '</b><br>장소: ' + (placeGuide[luckyEl] || '편안하고 조용한 자리') + '</p>'
      + '  </div>'
      + '  <div style="border:1px solid #e2e8f0;border-radius:10px;padding:8px;background:#fff">'
      + '    <p style="margin:0 0 4px;font-weight:900;color:#0f172a">🎁 행운 아이템</p>'
      + '    <p style="margin:0;color:#334155"><b>' + itemLine + '</b><br>' + itemTip + '</p>'
      + '  </div>'
      + '  <div style="border:1px solid #e2e8f0;border-radius:10px;padding:8px;background:#fff">'
      + '    <p style="margin:0 0 4px;font-weight:900;color:#0f172a">🤝 오늘 처세술</p>'
      + '    <p style="margin:0;color:#334155">' + (socialGuide[bestKey] || socialGuide.health) + '</p>'
      + '  </div>'
      + '</div>'
      + '<div style="margin-top:8px;border:1px solid #fde68a;background:#fffbeb;border-radius:10px;padding:9px 10px;font-size:.72rem;line-height:1.5;color:#92400e">'
      + '  <p style="margin:0 0 4px;font-weight:900">⚠️ 오늘 주의해야 할 점</p>'
      + '  <p style="margin:0">' + cautionTop + '</p>'
      + '</div>'
      + '<div style="margin-top:8px;border:1px solid #dbeafe;background:#eff6ff;border-radius:10px;padding:9px 10px;font-size:.72rem;line-height:1.55;color:#1e3a8a">'
      + '  <p style="margin:0 0 4px;font-weight:900">⏰ 운 상승 타이밍</p>'
      + '  <p style="margin:0">핵심 행동 시간: <b>' + todayTime + '</b> · 오행 부스팅: <b>' + todayElemTime + '</b><br>일진: <b style="color:' + todayInfo.neon + '">' + todayGZ.g + todayGZ.j + '</b> (' + todayInfo.cn + ')</p>'
      + '</div>'
      + '<div style="margin-top:10px;padding:10px 12px;border-radius:10px;background:#eef2ff;border:1px solid #c7d2fe;font-size:.73rem;color:#3730a3;line-height:1.55">'
      + '<p style="margin:0 0 6px;font-weight:900">🌅 내일 아침 3줄 플랜 · ' + ((tomorrowGZ && tomorrowGZ.g) || '—') + ((tomorrowGZ && tomorrowGZ.j) || '') + ' (' + tomorrowInfo.cn + ')</p>'
      + '<p style="margin:0">1) ' + tomorrowTime + ' 전에 내일의 핵심 목표 1가지를 짧게 적어두기</p>'
      + '<p style="margin:0">2) ' + tomorrowFocus + '</p>'
      + '<p style="margin:0">3) ' + tomorrowCaution + '</p>'
      + '</div>'
      + '<div style="margin-top:8px;padding:9px 10px;border:1px dashed #cbd5e1;border-radius:10px;background:#f8fafc;font-size:.71rem;color:#475569;line-height:1.55">'
      + '<b>추가 리딩</b><br>' + tenstarLine + '<br>' + yongLine + '<br>' + kiLine
      + '</div>'
      + '<div style="margin-top:8px;font-size:.71rem;color:#475569;line-height:1.55"><b>오늘 체크리스트</b><br>' + loveCheck + '<br>' + wealthCheck + '<br>' + healthCheck + '<br>' + workCheck + '</div>';
  }

  /* ─── 모달 HTML 생성 ─────────────────────────────────────── */
  function buildModal() {
    if (document.getElementById('luckSyncDiaryModal')) return;

    if (!document.getElementById('lsd-tw-styles')) {
      var st = document.createElement('style');
      st.id = 'lsd-tw-styles';
      st.textContent = [
        '@keyframes lsdGlobeSpin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}',
        '@keyframes lsdPopIn{0%{transform:scale(.5);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}',
        '@keyframes lsdSlideUp{0%{transform:translateY(16px);opacity:0}100%{transform:translateY(0);opacity:1}}',
        '@keyframes lsdTwSpinSlow{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}',
        '@keyframes lsdTwSpinReverse{0%{transform:rotate(0deg)}100%{transform:rotate(-360deg)}}',
        '@keyframes lsdTwPulse{0%,100%{opacity:.75;transform:scale(1)}50%{opacity:1;transform:scale(1.02)}}',
        '@keyframes lsdTwBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}',
        '.animate-spin-slow{animation:lsdTwSpinSlow 2.6s linear infinite}',
        '.animate-spin-reverse{animation:lsdTwSpinReverse 1.7s linear infinite}',
        '.animate-pulse{animation:lsdTwPulse 1.4s ease-in-out infinite}',
        '.animate-bounce{animation:lsdTwBounce .9s ease-in-out 2}',
        '.lsd-globe-inner.is-spinning{animation:lsdGlobeSpin .2s linear infinite}',
        '.lsd-result--pop{animation:lsdPopIn .4s cubic-bezier(.17,.67,.35,1.4) forwards}',
        '.lsd-result-ball-pop{animation:lsdPopIn .45s cubic-bezier(.17,.67,.35,1.4) forwards}',
        '.lsd-lotto-machine{position:relative;padding:8px 0 10px}',
        '.lsd-spin-ring{position:absolute;left:50%;top:64px;border-radius:999px;border:1.5px dashed rgba(124,58,237,.28);pointer-events:none;transform-origin:center center}',
        '.lsd-spin-ring--outer{width:146px;height:146px;transform:translate(-50%,-50%)}',
        '.lsd-spin-ring--inner{width:114px;height:114px;transform:translate(-50%,-50%)}',
        '.lsd-lotto-machine.is-drawing .lsd-globe-inner{animation:lsdGlobeSpin .16s linear infinite}',
        '.lsd-lotto-machine.is-drawing .lsd-spin-ring--outer{animation-duration:1.2s}',
        '.lsd-lotto-machine.is-drawing .lsd-spin-ring--inner{animation-duration:.9s}',
        '.lsd-lotto-ticker{display:inline-flex;align-items:center;justify-content:center;min-width:120px;padding:4px 12px;border-radius:999px;border:1px solid #ddd6fe;background:#f5f3ff;color:#6d28d9;font-size:.68rem;font-weight:800;letter-spacing:.05em;margin-bottom:10px}',
        '.lsd-tab{background:transparent;color:#6b7280;border:1.5px solid transparent;transition:all .2s;white-space:nowrap;flex:none;padding:7px 14px;border-radius:999px;font-size:.75rem;font-weight:700;cursor:pointer}',
        '.lsd-tab:hover{background:rgba(124,58,237,.08);color:#7c3aed}',
        '.lsd-tab.is-active{background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;box-shadow:0 4px 14px rgba(99,102,241,.35)}',
        '.lsd-score-bar-fill{background:linear-gradient(90deg,#34d399,#60a5fa,#a78bfa);transition:width .8s ease;height:100%;border-radius:999px;box-shadow:0 0 8px rgba(96,165,250,.3)}',
        '.lsd-challenge-item{display:flex;align-items:center;gap:12px;padding:14px 0;cursor:pointer;border-bottom:1px solid #f3f4f6}',
        '.lsd-challenge-item:last-child{border-bottom:none}',
        '.lsd-challenge-item.is-done .lsd-check-box{background:#7c3aed;border-color:#7c3aed;color:#fff}',
        '.lsd-challenge-item.is-done .lsd-challenge-text{text-decoration:line-through;color:#9ca3af}',
        '.lsd-check-box{width:24px;height:24px;border-radius:8px;border:2px solid #c4b5fd;display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:900;color:#7c3aed;flex-shrink:0;transition:all .2s}',
        '.lsd-challenge-text{font-size:.85rem;color:#374151;flex:1;line-height:1.45}',
        '.lsd-match-btn{flex:1;padding:10px 6px;border-radius:12px;border:1.5px solid #e5e7eb;font-size:.73rem;font-weight:700;color:#6b7280;cursor:pointer;transition:all .2s;background:#fff;text-align:center;min-width:0}',
        '.lsd-match-btn:hover{border-color:#c4b5fd;background:#faf5ff;color:#7c3aed}',
        '.lsd-match-btn.is-active{background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;border-color:transparent;box-shadow:0 4px 12px rgba(124,58,237,.28)}',
        '.lsd-mood-btn{font-size:1.8rem;padding:8px;border-radius:12px;border:none;background:transparent;cursor:pointer;transition:all .2s}',
        '.lsd-mood-btn:hover{transform:scale(1.2);filter:drop-shadow(0 0 6px rgba(167,139,250,.6))}',
        '.lsd-mood-btn.is-active{transform:scale(1.3);background:rgba(237,233,254,.5);filter:drop-shadow(0 0 10px rgba(167,139,250,.8))}',
        '.lsd-diary-lines{background-image:repeating-linear-gradient(to bottom,transparent,transparent 27px,#e2e8f0 27px,#e2e8f0 28px);line-height:1.85;padding-top:4px}',
        '.lsd-history-item{background:#fff;border-radius:14px;padding:12px 14px;border-left:4px solid #7c3aed;box-shadow:0 2px 8px rgba(124,58,237,.1);animation:lsdSlideUp .3s ease}',
        '.lsd-history-date{font-size:.72rem;font-weight:700;color:#7c3aed;margin-bottom:5px}',
        '.lsd-history-meta{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:4px}',
        '.lsd-history-tag{font-size:.65rem;padding:2px 8px;border-radius:999px;background:rgba(124,58,237,.1);color:#7c3aed;font-weight:600}',
        '.lsd-history-log{font-size:.78rem;color:#4b5563;line-height:1.5;font-style:italic}',
        '.lsd-empty{text-align:center;color:#9ca3af;font-size:.85rem;padding:32px 0}',
        '.lsd-elem-badge{display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:999px;font-size:.72rem;font-weight:700;border:1.5px solid}',
        '.lsd-badge-tag{font-size:.58rem;background:rgba(255,255,255,.3);border-radius:4px;padding:1px 4px;margin-left:2px}',
        '.lsd-badge-tag--ki{background:rgba(239,68,68,.2);color:#fca5a5}',
        '.lsd-iljin-elem{font-size:.78rem;opacity:.8;margin-left:4px}',
        '.lsd-night-section{display:grid;gap:10px}',
        '.lsd-night-action{display:flex;align-items:flex-start;gap:10px;width:100%;text-align:left;border:1px solid #e5e7eb;background:#fff;border-radius:12px;padding:10px 12px;cursor:pointer;transition:all .2s}',
        '.lsd-night-action:hover{border-color:#93c5fd;background:#f8fbff}',
        '.lsd-night-action.is-done{border-color:#67e8f9;background:linear-gradient(135deg,#ecfeff,#eef2ff)}',
        '.lsd-night-action-check{width:20px;height:20px;border-radius:999px;border:1.5px solid #cbd5e1;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;font-size:.68rem;font-weight:800;color:#0369a1}',
        '.lsd-night-action.is-done .lsd-night-action-check{border-color:#22d3ee;background:#cffafe}',
        '.lsd-night-action-text{font-size:.76rem;font-weight:700;color:#334155;line-height:1.45}',
        '.lsd-gauge-track{height:10px;border-radius:999px;background:#e2e8f0;overflow:hidden}',
        '.lsd-gauge-fill{height:100%;width:0;background:linear-gradient(90deg,#22d3ee,#3b82f6,#a855f7);transition:width .5s ease}',
        '.lsd-gauge-copy{font-size:.73rem;color:#475569;font-weight:700;margin-top:6px}',
        '.lsd-ai-coach-card{border:1px solid #bfdbfe;background:linear-gradient(160deg,#eff6ff,#f8fafc);padding:12px;border-radius:12px;font-size:.77rem;line-height:1.55;color:#1e293b}',
        '.lsd-ai-coach-card.is-loading{position:relative;overflow:hidden;color:#64748b}',
        '.lsd-ai-coach-card.is-loading:after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 0%,rgba(255,255,255,.55) 40%,transparent 80%);animation:lsdShimmer 1s linear infinite}',
        '.lsd-ai-foot{margin-top:8px;font-size:.68rem;color:#64748b;font-weight:700}',
        '.lsd-blueprint-btn{border:1px solid #cbd5e1;background:#fff;border-radius:999px;padding:7px 12px;font-size:.7rem;font-weight:800;color:#475569;cursor:pointer;transition:all .2s}',
        '.lsd-blueprint-btn.is-on{border-color:#38bdf8;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff;box-shadow:0 6px 18px rgba(14,165,233,.28)}',
        '.lsd-meditation-shell{display:grid;gap:10px}',
        '.lsd-meditation-card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:12px 12px 11px;box-shadow:0 1px 6px rgba(0,0,0,.04)}',
        '.lsd-meditation-title{font-size:.78rem;font-weight:900;color:#0f172a;margin:0 0 8px}',
        '.lsd-mini-label{display:block;font-size:.67rem;color:#64748b;font-weight:700;margin:0 0 4px}',
        '.lsd-meditation-input{width:100%;border:1px solid #dbe3ef;border-radius:10px;padding:8px 10px;font-size:.76rem;color:#1f2937;line-height:1.45;background:#fff;box-sizing:border-box;margin-bottom:8px}',
        '.lsd-mini-select{border:1px solid #dbe3ef;border-radius:999px;padding:7px 10px;font-size:.72rem;color:#334155;background:#fff}',
        '.lsd-sats-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center}',
        '.lsd-sats-player{position:relative;height:178px;border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;background:#0f172a;margin-bottom:8px}',
        '.lsd-sats-player iframe{width:100%;height:100%;border:0;display:none}',
        '.lsd-sats-player-placeholder{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:12px;font-size:.74rem;color:#bfdbfe;line-height:1.5;background:radial-gradient(circle at 50% 20%,rgba(56,189,248,.2),transparent 55%),linear-gradient(160deg,#0f172a,#020617)}',
        '.lsd-sats-now{font-size:.7rem;font-weight:700;color:#334155;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:7px 9px;margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
        '.lsd-sats-zone.is-dark .lsd-sats-now{background:rgba(15,23,42,.55);border-color:rgba(125,211,252,.4);color:#e0f2fe}',
        '.lsd-sats-playlist{display:grid;gap:7px;max-height:232px;overflow:auto;padding-right:2px}',
        '.lsd-sats-track{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:7px 8px;transition:all .2s}',
        '.lsd-sats-zone.is-dark .lsd-sats-track{background:rgba(15,23,42,.4);border-color:rgba(100,116,139,.45)}',
        '.lsd-sats-track.is-playing{border-color:#22d3ee;box-shadow:0 0 0 1px rgba(34,211,238,.45)}',
        '.lsd-sats-thumb{width:50px;height:36px;flex-shrink:0;border-radius:7px;object-fit:cover;background:#0f172a}',
        '.lsd-sats-thumb--blank{display:flex;align-items:center;justify-content:center;color:#a5b4fc}',
        '.lsd-sats-meta{min-width:0;flex:1}',
        '.lsd-sats-track-title{font-size:.7rem;font-weight:800;color:#0f172a;margin:0;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
        '.lsd-sats-zone.is-dark .lsd-sats-track-title{color:#e2e8f0}',
        '.lsd-sats-track-channel{font-size:.64rem;color:#64748b;margin:2px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
        '.lsd-sats-zone.is-dark .lsd-sats-track-channel{color:#94a3b8}',
        '.lsd-sats-play-btn{border:1px solid #cbd5e1;background:#fff;border-radius:999px;padding:5px 9px;font-size:.65rem;font-weight:800;color:#0f172a;cursor:pointer;flex-shrink:0}',
        '.lsd-sats-zone.is-dark .lsd-sats-play-btn{background:rgba(15,23,42,.72);border-color:#64748b;color:#e2e8f0}',
        '.lsd-sats-empty{font-size:.7rem;color:#64748b;padding:10px;border:1px dashed #cbd5e1;border-radius:10px;background:#f8fafc}',
        '.lsd-sats-zone.is-dark .lsd-sats-empty{color:#cbd5e1;background:rgba(15,23,42,.5);border-color:rgba(125,211,252,.35)}',
        '.lsd-sats-zone{position:relative;overflow:hidden;transition:all .3s ease}',
        '.lsd-sats-zone.is-dark{background:radial-gradient(circle at 50% 15%,#1e1b4b 0%,#0f172a 55%,#020617 100%);border-color:#312e81;box-shadow:0 12px 28px rgba(2,6,23,.45)}',
        '.lsd-sats-scene{font-size:.76rem;line-height:1.55;color:#334155;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px;padding:8px 9px;margin:7px 0 8px}',
        '.lsd-sats-zone.is-dark .lsd-sats-scene{background:rgba(30,41,59,.45);border-color:rgba(125,211,252,.4);color:#e0f2fe}',
        '.lsd-sats-breath{font-size:.74rem;line-height:1.5;color:#0f172a;padding:8px 10px;border-radius:10px;background:rgba(224,242,254,.62);animation:lsdBreathText 7s ease-in-out infinite;opacity:.9;margin-bottom:8px}',
        '.lsd-sats-zone.is-dark .lsd-sats-breath{color:#e0e7ff;background:rgba(30,41,59,.4)}',
        '.lsd-iam-card{font-size:.78rem;line-height:1.5;color:#0f172a;background:linear-gradient(135deg,#ecfeff,#eef2ff);border:1px solid #bae6fd;border-radius:12px;padding:10px 11px;font-weight:800;margin-bottom:8px}',
        '.lsd-confetti-wrap{position:fixed;inset:0;pointer-events:none;z-index:1000001}',
        '.lsd-confetti-bit{position:absolute;top:42vh;width:8px;height:14px;border-radius:2px;opacity:.9;animation:lsdConfettiDrop .95s ease-out forwards}',
        '@keyframes lsdConfettiDrop{0%{transform:translate3d(0,0,0) rotate(0deg);opacity:1}100%{transform:translate3d(calc((var(--x,0) - 30) * 1px),220px,0) rotate(420deg);opacity:0}}',
        '@keyframes lsdShimmer{0%{transform:translateX(-110%)}100%{transform:translateX(110%)}}',
        '@keyframes lsdBreathText{0%,100%{opacity:.5;transform:scale(.985)}50%{opacity:1;transform:scale(1.02)}}',
      ].join('');
      document.head.appendChild(st);
    }

    var modal = document.createElement('div');
    modal.id = 'luckSyncDiaryModal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Luck-Sync 갓생 다이어리');
    modal.style.cssText = 'display:none;position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.72);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);align-items:center;justify-content:center;padding:16px;box-sizing:border-box;overflow-y:auto';

    modal.innerHTML = [
      '<div style="position:relative;width:100%;max-width:600px;background:#fff;border-radius:24px;box-shadow:0 24px 60px rgba(0,0,0,.2),0 8px 24px rgba(124,58,237,.1);max-height:88vh;display:flex;flex-direction:column;overflow:hidden;margin:0 auto">',
      '<div style="display:flex;justify-content:center;padding:10px 0 4px;flex-shrink:0"><div style="width:36px;height:4px;border-radius:2px;background:rgba(0,0,0,.1)"></div></div>',
      '<button style="position:absolute;top:12px;right:14px;z-index:20;width:32px;height:32px;border-radius:50%;border:none;background:rgba(0,0,0,.06);color:#6b7280;font-size:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s" onmouseover="this.style.background=\'rgba(239,68,68,.15)\';this.style.color=\'#ef4444\';this.style.transform=\'rotate(90deg)\'" onmouseout="this.style.background=\'rgba(0,0,0,.06)\';this.style.color=\'#6b7280\';this.style.transform=\'rotate(0deg)\'" data-action="closeLuckSyncDiary" aria-label="닫기">✕</button>',
      '<header style="padding:12px 20px 14px;background:linear-gradient(135deg,#7c3aed 0%,#6d28d9 45%,#4f46e5 100%);position:relative;overflow:hidden;flex-shrink:0">',
      '<div style="position:absolute;top:-30px;right:-20px;width:110px;height:110px;border-radius:50%;background:rgba(255,255,255,.07)"></div>',
      '<div style="position:absolute;bottom:-40px;left:35%;width:90px;height:90px;border-radius:50%;background:rgba(255,255,255,.05)"></div>',
      '<div style="display:flex;align-items:center;gap:14px;position:relative">',
      '<div style="width:52px;height:52px;border-radius:14px;overflow:hidden;flex-shrink:0;border:2px solid rgba(255,255,255,.35);box-shadow:0 4px 16px rgba(0,0,0,.25)"><img src="/fuctionassets/godlife.webp" alt="" style="width:100%;height:100%;object-fit:cover" width="52" height="52" loading="lazy" decoding="async"></div>',
      '<div style="flex:1;min-width:0"><p style="font-size:.58rem;letter-spacing:.2em;color:rgba(255,255,255,.65);margin:0 0 2px;font-weight:700;text-transform:uppercase">❆ Luck-Sync Diary ❆</p><h2 style="font-size:1.08rem;font-weight:900;color:#fff;margin:0 0 2px;line-height:1.2">갓생 운구기일 다이어리</h2><p style="font-size:.75rem;color:rgba(255,255,255,.8);margin:0" id="lsdTodayDate"></p></div>',
      '</div></header>',
      '<nav style="display:flex;gap:6px;padding:10px 14px;overflow-x:auto;background:#fff;border-bottom:1px solid #f3f4f6;flex-shrink:0;scrollbar-width:none;-ms-overflow-style:none" role="tablist">',
      '<button class="lsd-tab is-active" role="tab" data-tab="dashboard" aria-selected="true">📊 대시보드</button>',
      '<button class="lsd-tab" role="tab" data-tab="lotto" aria-selected="false">🎰 럭키 뽑기</button>',
      '<button class="lsd-tab" role="tab" data-tab="challenge" aria-selected="false">✅ 오운완</button>',
      '<button class="lsd-tab" role="tab" data-tab="night" aria-selected="false">🌙 야간회고</button>',
      '<button class="lsd-tab" role="tab" data-tab="meditation" aria-selected="false">🧘 명상</button>',
      '<button class="lsd-tab" role="tab" data-tab="history" aria-selected="false">📅 기록</button>',
      '</nav>',
      '<div style="flex:1;overflow-y:auto;background:#f9fafb;scrollbar-width:thin">',
      '<section class="lsd-panel" id="lsdPanelDashboard" role="tabpanel" style="padding:14px;display:block">',
      '<div id="lsdSajuWidget" style="background:#fff;border-radius:16px;padding:14px 16px;margin-bottom:12px;box-shadow:0 1px 6px rgba(0,0,0,.06);border:1px solid #f3f4f6">',
      '<p style="font-size:.6rem;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:.16em;margin:0 0 8px">❆ 나의 일간(日干) 오행</p>',
      '<div id="lsdDayMaster" style="font-size:1.4rem;font-weight:900;color:#111827;margin-bottom:8px">—</div>',
      '<div id="lsdElemBadges" style="display:flex;flex-wrap:wrap;gap:6px"></div></div>',
      '<div id="lsdEnergyCard" style="background:linear-gradient(135deg,#6d28d9,#4f46e5);border-radius:20px;padding:16px 18px;margin-bottom:12px;color:#fff;position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.12);box-shadow:0 8px 28px rgba(109,40,217,.28)">',
      '<div style="position:absolute;top:-16px;right:-16px;width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,.07)"></div>',
      '<p style="font-size:.6rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.65);margin:0 0 8px">⚡ 오늘의 에너지</p>',
      '<div id="lsdEnergyIljin" style="font-size:.95rem;font-weight:800;margin-bottom:4px">오늘의 일진 로딩 중...</div>',
      '<div id="lsdEnergyStar" style="font-size:.8rem;font-weight:700;color:rgba(255,255,255,.88);margin-bottom:10px">십성: —</div>',
      '<div id="lsdEnergyGuide" style="font-size:.78rem;color:rgba(255,255,255,.85);background:rgba(255,255,255,.12);border-radius:10px;padding:8px 12px;line-height:1.5">사주를 먼저 분석하면 정확한 에너지 가이드를 받을 수 있어요!</div></div>',
      '<div style="background:#fff;border-radius:16px;padding:14px 16px;box-shadow:0 1px 6px rgba(0,0,0,.06);border:1px solid #f3f4f6">',
      '<p style="font-size:.85rem;font-weight:900;color:#111827;margin:0 0 2px">💫 오늘의 갓생 지수</p>',
      '<p style="font-size:.7rem;color:#9ca3af;margin:0 0 14px">사주 오행 기반 5대 운세 지수 분석</p>',
      '<div id="lsdScoreBars" style="display:flex;flex-direction:column;gap:10px"></div>',
      '<div id="lsdLuckElemRow" style="margin-top:12px;font-size:.74rem;color:#6b7280;text-align:center;font-weight:600"></div>',
      '<div id="lsdFortuneDetail" style="margin-top:10px;padding:10px 12px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0"></div>',
      '</div></section>',
      '<section class="lsd-panel" id="lsdPanelLotto" role="tabpanel" style="padding:14px;display:none">',
      '<div style="background:#fff;border-radius:16px;padding:16px 14px;box-shadow:0 1px 6px rgba(0,0,0,.06);border:1px solid #f3f4f6;text-align:center">',
      '<h3 style="font-size:.88rem;font-weight:900;color:#111827;margin:0 0 2px">🎰 럭키 비키 아이템 뽑기</h3>',
      '<p style="font-size:.72rem;color:#9ca3af;margin:0 0 20px;line-height:1.5">오늘의 행운 오행 기반으로 LUCKY ITEM을 뿑아봐~!</p>',
      '<div id="lsdLottoMachine" class="lsd-lotto-machine" aria-live="polite">',
      '<div class="lsd-spin-ring lsd-spin-ring--outer animate-spin-slow" aria-hidden="true"></div>',
      '<div class="lsd-spin-ring lsd-spin-ring--inner animate-spin-reverse" aria-hidden="true"></div>',
      '<div style="width:128px;height:128px;border-radius:50%;background:linear-gradient(135deg,#ede9fe,#ddd6fe);border:4px solid #c4b5fd;margin:0 auto 10px;position:relative;overflow:hidden;box-shadow:inset 0 4px 14px rgba(124,58,237,.18),0 6px 24px rgba(124,58,237,.2)">',
      '<div id="lsdGlobeInner" class="lsd-globe-inner" style="position:absolute;inset:8px;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:2px;font-size:1.5rem;user-select:none">🌱 🔥 🤎 ⚡ 💧</div>',
      '<div style="position:absolute;top:10px;left:14px;width:20px;height:20px;border-radius:50%;background:rgba(255,255,255,.55);filter:blur(3px)"></div></div>',
      '<div id="lsdLottoTicker" class="lsd-lotto-ticker animate-pulse">READY</div>',
      '<div style="width:48px;height:7px;border-radius:4px;background:#c4b5fd;margin:0 auto 12px;opacity:.5"></div>',
      '<div id="lsdLuckyElemHint" style="font-size:.74rem;font-weight:700;color:#7c3aed;margin-bottom:14px;min-height:18px"></div>',
      '<button id="lsdLottoBtn" type="button" class="animate-pulse" style="padding:12px 24px;border:none;border-radius:999px;background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff;font-size:.85rem;font-weight:900;cursor:pointer;box-shadow:0 4px 18px rgba(124,58,237,.4);transition:all .2s" onmouseover="this.style.transform=\'scale(1.05)\';this.style.boxShadow=\'0 8px 26px rgba(124,58,237,.5)\'" onmouseout="this.style.transform=\'scale(1)\';this.style.boxShadow=\'0 4px 18px rgba(124,58,237,.4)\'"">🎱 오늘의 럭키 비키 아이템 뽑기</button></div>',
      '<div id="lsdLottoResult" style="display:none;margin-top:18px">',
      '<div style="display:inline-flex;flex-direction:column;align-items:center;gap:8px;background:linear-gradient(135deg,#faf5ff,#ede9fe);border-radius:20px;padding:22px 36px;border:1px solid #c4b5fd;width:100%;box-sizing:border-box">',
      '<div id="lsdResultBall" style="width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:900;color:#fff;box-shadow:0 4px 16px rgba(124,58,237,.4)"></div>',
      '<div id="lsdResultEmoji" style="font-size:3rem;line-height:1;margin:-4px 0"></div>',
      '<div id="lsdResultName" style="font-size:1rem;font-weight:900;color:#1f1035"></div>',
      '<div id="lsdResultTip" style="font-size:.76rem;color:#6b7280;text-align:center;line-height:1.55;max-width:200px"></div>',
      '<p style="font-size:.72rem;font-weight:700;color:#7c3aed;margin:0">오늘의 럭키비키 득템! ✨</p>',
      '<button id="lsdRedrawBtn" type="button" style="padding:7px 18px;border-radius:999px;border:1.5px solid #c4b5fd;background:transparent;font-size:.72rem;font-weight:700;color:#7c3aed;cursor:pointer;transition:all .2s" onmouseover="this.style.background=\'#ede9fe\'" onmouseout="this.style.background=\'transparent\'">🔄 다시 뽑기</button>',
      '</div></div></div></section>',
      '<section class="lsd-panel" id="lsdPanelChallenge" role="tabpanel" style="padding:14px;display:none">',
      '<div style="background:#fff;border-radius:16px;padding:14px 16px;margin-bottom:12px;box-shadow:0 1px 6px rgba(0,0,0,.06);border:1px solid #f3f4f6">',
      '<h3 style="font-size:.88rem;font-weight:900;color:#111827;margin:0 0 2px">✅ 오운완 챌린지</h3>',
      '<p style="font-size:.72rem;color:#9ca3af;margin:0 0 12px;line-height:1.4">오늘의 갓생 미션을 완료하고 기운을 쌓아봐~!</p>',
      '<div id="lsdChallenges"></div></div>',
      '<div id="lsdChallengeCongrats" style="display:none;background:linear-gradient(135deg,#ecfeff,#f5f3ff);border:1px solid #c4b5fd;color:#4c1d95;border-radius:14px;padding:12px 14px;margin-bottom:12px;font-size:.78rem;font-weight:700;line-height:1.5"></div>',
      '<div style="background:#fff;border-radius:16px;padding:14px 16px;box-shadow:0 1px 6px rgba(0,0,0,.06);border:1px solid #f3f4f6">',
      '<p style="font-size:.85rem;font-weight:900;color:#111827;margin:0 0 14px">지금 나의 기분은? 🫶</p>',
      '<div id="lsdMoodEmojis" style="display:flex;justify-content:space-around">',
      '<button type="button" class="lsd-mood-btn" data-emoji="🔥">🔥</button>',
      '<button type="button" class="lsd-mood-btn" data-emoji="😊">😊</button>',
      '<button type="button" class="lsd-mood-btn" data-emoji="😌">😌</button>',
      '<button type="button" class="lsd-mood-btn" data-emoji="😐">😐</button>',
      '<button type="button" class="lsd-mood-btn" data-emoji="😔">😔</button>',
      '<button type="button" class="lsd-mood-btn" data-emoji="🥱">🥱</button>',
      '</div></div></section>',
      '<section class="lsd-panel" id="lsdPanelNight" role="tabpanel" style="padding:14px;display:none">',
      '<div style="background:#fff;border-radius:16px;padding:14px 16px;margin-bottom:12px;box-shadow:0 1px 6px rgba(0,0,0,.06);border:1px solid #f3f4f6">',
      '<h3 style="font-size:.9rem;font-weight:900;color:#0f172a;margin:0 0 2px">🌙 운 개선 실천 회고</h3>',
      '<p style="font-size:.72rem;color:#64748b;margin:0;line-height:1.45">적중률 체크 대신, 오늘 실천한 개운 루틴을 기록하고 내일의 운 설계를 만듭니다.</p>',
      '</div>',
      '<div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,.06);border:1px solid #f3f4f6;padding:12px 12px 14px">',
      '<div class="lsd-night-section">',
      '<div>',
      '<p style="margin:0 0 7px;font-size:.74rem;font-weight:900;color:#0f172a">1) Tomorrow Blueprint</p>',
      '<div id="lsdTomorrowBlueprintBtns" style="display:flex;gap:6px;flex-wrap:wrap">',
      BLUEPRINT_THEMES.map(function (t) { return '<button type="button" class="lsd-blueprint-btn" data-blueprint="' + t.id + '">' + t.icon + ' ' + t.label + '</button>'; }).join(''),
      '</div>',
      '</div>',
      '<div class="lsd-mini-box" id="lsdTomorrowFocusSummary"></div>',
      '<div>',
      '<p style="margin:0 0 7px;font-size:.74rem;font-weight:900;color:#0f172a">2) 내일 실행 3단계</p>',
      '<div id="lsdTomorrowPlanList" style="display:grid;gap:7px"></div>',
      '</div>',
      '<div>',
      '<p style="margin:0 0 7px;font-size:.74rem;font-weight:900;color:#0f172a">3) 설계 메모</p>',
      '<textarea id="lsdPracticeNoteInput" class="lsd-diary-lines" maxlength="500" rows="5" style="width:100%;background:transparent;padding:8px 10px 10px;font-size:.82rem;color:#1f2937;resize:vertical;outline:none;border:1px solid #e2e8f0;border-radius:12px;font-family:inherit;box-sizing:border-box;display:block" placeholder="예: 오전엔 집중이 안 됐지만, 저녁에 디지털 디톡스를 하니 생각이 맑아졌다."></textarea>',
      '<div style="display:flex;justify-content:flex-end;margin-top:4px;font-size:.69rem;color:#94a3b8"><span id="lsdPracticeCharCount">0</span>/500</div>',
      '</div>',
      '<div>',
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px">',
      '<p style="margin:0;font-size:.74rem;font-weight:900;color:#0f172a">4) AI Tomorrow Coach</p>',
      '<button id="lsdGenerateAiCoachBtn" type="button" class="lsd-plain-btn" style="border-color:#93c5fd;color:#0c4a6e">🧠 AI 코칭 생성</button>',
      '</div>',
      '<div id="lsdAiLuckCoach" class="lsd-ai-coach-card">오늘 실천 데이터를 바탕으로 내일 운 설계 가이드를 제안합니다.</div>',
      '</div>',
      '<div style="padding-top:4px;display:flex;align-items:center;justify-content:space-between;gap:8px">',
      '<span style="font-size:.7rem;color:#64748b">야간 회고는 내일 운 설계에만 집중합니다.</span>',
      '<button id="lsdSaveNightBtn" type="button" style="padding:9px 18px;border:none;border-radius:999px;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff;font-size:.74rem;font-weight:800;cursor:pointer;box-shadow:0 6px 16px rgba(14,165,233,.28);transition:all .2s" onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'scale(1)\'">🗓️ 내일 설계 저장</button>',
      '</div>',
      '<div id="lsdSaveFeedback" style="display:none;font-size:.78rem;font-weight:700;color:#0891b2">✅ 오늘의 운 설계 기록이 저장됐어요!</div>',
      '</div>',
      '</div></section>',
      '<section class="lsd-panel" id="lsdPanelMeditation" role="tabpanel" style="padding:14px;display:none">',
      '<div style="background:#fff;border-radius:16px;padding:14px 16px;margin-bottom:12px;box-shadow:0 1px 6px rgba(0,0,0,.06);border:1px solid #f3f4f6">',
      '<h3 style="font-size:.9rem;font-weight:900;color:#0f172a;margin:0 0 3px">🧘 운명 개척 명상 가이드</h3>',
      '<p style="font-size:.72rem;color:#64748b;margin:0;line-height:1.45">네빌 고다드의 Revision, SATS, I AM 루틴을 오늘 운세 실천 지수와 연결합니다.</p>',
      '</div>',
      '<div class="lsd-meditation-shell">',
      '<div class="lsd-meditation-card">',
      '<p class="lsd-meditation-title">1) 수정의 가위 (Nightly Revision)</p>',
      '<label class="lsd-mini-label" for="lsdRevisionOriginal">오늘의 부정적 사건</label>',
      '<textarea id="lsdRevisionOriginal" class="lsd-meditation-input" rows="2" maxlength="220" placeholder="예: 중요한 미팅에서 긴장해 말이 꼬였다."></textarea>',
      '<label class="lsd-mini-label" for="lsdRevisionImagined">원하는 전개로 수정한 장면</label>',
      '<textarea id="lsdRevisionImagined" class="lsd-meditation-input" rows="2" maxlength="220" placeholder="예: 차분하게 핵심을 전달했고, 상대가 미소로 고개를 끄덕였다."></textarea>',
      '<div style="display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap">',
      '<button id="lsdStartRevisionTimer" type="button" class="lsd-plain-btn" style="border-color:#22d3ee;color:#0c4a6e">⏱️ 1분 상상 시작</button>',
      '<span id="lsdRevisionCountdown" style="font-size:.74rem;font-weight:800;color:#0f172a">01:00</span>',
      '</div>',
      '<div id="lsdRevisionGuide" class="lsd-mini-box" style="margin-top:8px">이제 눈을 감고, 수정된 장면이 실제 사실인 것처럼 1분간 상상하세요.</div>',
      '<div id="lsdRevisionStatus" style="margin-top:6px;font-size:.7rem;color:#64748b"></div>',
      '</div>',

      '<div class="lsd-meditation-card lsd-sats-zone" id="lsdSatsZone">',
      '<p class="lsd-meditation-title">2) SATS 시각화</p>',
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">',
      '<span style="font-size:.72rem;color:#475569">내일 키워드: <b id="lsdSatsKeyword" style="color:#0ea5e9">로딩중</b></span>',
      '<button id="lsdGenerateSatsScene" type="button" class="lsd-plain-btn">✨ 장면 추천</button>',
      '</div>',
      '<div id="lsdSatsScene" class="lsd-sats-scene">당신이 이미 원하는 결과를 이룬 단 하나의 장면이 표시됩니다.</div>',
      '<div class="lsd-sats-breath" id="lsdSatsBreathText">당신은 이미 이루어진 상태입니다. 소리, 촉감, 기분에만 집중하세요.</div>',
      '<div class="lsd-sats-toolbar">',
      '<select id="lsdSatsAudioMode" class="lsd-mini-select"><option value="lofi">LoFi 플레이리스트</option><option value="theta">Theta 플레이리스트</option></select>',
      '<button id="lsdStartSatsMode" type="button" class="lsd-plain-btn" style="border-color:#818cf8;color:#3730a3">🎧 플레이리스트 불러오기</button>',
      '<button id="lsdRefreshSatsPlaylist" type="button" class="lsd-plain-btn">🔄 새로고침</button>',
      '<button id="lsdStopSatsMode" type="button" class="lsd-plain-btn">⏹️ 정지</button>',
      '</div>',
      '<div id="lsdSatsPlaylistStatus" class="lsd-sats-empty" style="margin-top:8px">플레이리스트 불러오기를 누르면 저작권 프리 트랙 목록이 준비됩니다.</div>',
      '<div class="lsd-sats-player" style="margin-top:8px">',
      '<div id="lsdSatsPlayerPlaceholder" class="lsd-sats-player-placeholder">재생 버튼을 누르기 전까지 소리는 나오지 않습니다.<br>목록에서 원하는 트랙의 ▶ 재생을 눌러주세요.</div>',
      '<iframe id="lsdSatsYoutubeFrame" title="SATS YouTube Player" allow="autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin"></iframe>',
      '</div>',
      '<div id="lsdSatsNowPlayingTitle" class="lsd-sats-now">재생 중인 트랙 없음</div>',
      '<div id="lsdSatsPlaylist" class="lsd-sats-playlist">',
      '<div class="lsd-sats-empty">아직 로드된 플레이리스트가 없습니다.</div>',
      '</div>',
      '</div>',

      '<div class="lsd-meditation-card">',
      '<p class="lsd-meditation-title">3) 아침 I AM 선언</p>',
      '<div id="lsdIamCard" class="lsd-iam-card">나는 오늘 운의 흐름을 선택하는 사람이다.</div>',
      '<input id="lsdIamInput" type="text" class="lsd-meditation-input" placeholder="위 문장을 타이핑하거나 소리 내어 읽어보세요.">',
      '<div style="display:flex;gap:8px;flex-wrap:wrap">',
      '<button id="lsdRegenerateIam" type="button" class="lsd-plain-btn">🔁 문구 새로고침</button>',
      '<button id="lsdConfirmIam" type="button" class="lsd-plain-btn" style="border-color:#34d399;color:#065f46">✅ 선언 완료</button>',
      '</div>',
      '</div>',

      '<div class="lsd-meditation-card" style="background:#0f172a;color:#e2e8f0">',
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">',
      '<p class="lsd-meditation-title" style="color:#f8fafc;margin:0">운세 실천 지수 연동</p>',
      '<span style="font-size:.72rem;font-weight:900;color:#67e8f9">Meditation Points <b id="lsdMeditationPoints">0</b></span>',
      '</div>',
      '<div id="lsdMeditationTrend" style="margin-top:8px;display:grid;gap:6px"></div>',
      '<div class="lsd-mini-box" style="margin-top:8px;background:rgba(15,23,42,.45);border-color:rgba(56,189,248,.45);color:#bae6fd">',
      '몰입 모드 제안: 명상 시작 전 기기의 방해 금지 모드(알림 차단)를 켜고, 전체화면으로 전환하면 집중도가 상승합니다.',
      '<div style="margin-top:6px"><button id="lsdSuggestFocusMode" type="button" class="lsd-plain-btn" style="border-color:#38bdf8;color:#0ea5e9;background:rgba(15,23,42,.7)">🔕 몰입 모드 제안 실행</button></div>',
      '</div>',
      '</div>',
      '</div>',
      '</section>',
      '<section class="lsd-panel" id="lsdPanelHistory" role="tabpanel" style="padding:14px;display:none">',
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">',
      '<div><h3 style="font-size:.88rem;font-weight:900;color:#111827;margin:0 0 2px">📅 나의 운구 기일 기록</h3><p style="font-size:.7rem;color:#9ca3af;margin:0">날짜별로 저장된 다이어리 기록이어요~</p></div>',
      '<button id="lsdClearBtn" type="button" style="padding:6px 12px;border:1.5px solid #fca5a5;border-radius:999px;background:transparent;font-size:.7rem;font-weight:700;color:#f87171;cursor:pointer;transition:all .2s;flex-shrink:0;margin-left:8px;white-space:nowrap" onmouseover="this.style.background=\'#fef2f2\'" onmouseout="this.style.background=\'transparent\'">🗑️ 전체 삭제</button>',
      '</div>',
      '<div id="lsdHistoryList" style="display:flex;flex-direction:column;gap:8px"></div>',
      '</section>',
      '<div style="padding:10px 14px 14px;background:#fff;border-top:1px solid #eef2ff;display:flex;justify-content:flex-end;flex-shrink:0">',
      '<button type="button" data-action="closeLuckSyncDiary" style="padding:9px 16px;border-radius:999px;border:1.5px solid #c4b5fd;background:#faf5ff;color:#6d28d9;font-size:.74rem;font-weight:800;cursor:pointer">닫기</button>',
      '</div>',
      '</div>',
      '</div>'
    ].join('');

    document.body.appendChild(modal);
  }

  /* ─── 모달 오픈 ──────────────────────────────────────────────── */
  function openDiary() {
    buildModal();
    ensureMzBlocks();
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

    /* 갓생 지수 스코어 바 */
    var scores = calcGodlifeScores(pillars, power, jong, todayGZ);
    renderScoreBars(scores);

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

    renderFortuneDetail(pillars, power, todayGZ, scores, mainTenStar, _luckyEl);

    /* 챌린지 빌드 */
    buildChallenges(_luckyEl, mainTenStar, todayGZ);

    /* 야간 회고 로드 */
    var diary = loadDiary();
    var entry = getTodayEntry(diary);
    if (mainTenStar) entry.tenstar = mainTenStar;
    saveDiary(diary);
    var practiceInput = document.getElementById('lsdPracticeNoteInput');
    var cc = document.getElementById('lsdPracticeCharCount');
    if (practiceInput) {
      practiceInput.value = entry.practiceNote || entry.nightLog || '';
      if (cc) cc.textContent = practiceInput.value.length;
      practiceInput.addEventListener('input', function () {
        if (cc) cc.textContent = practiceInput.value.length;
      });
    }

    renderMzSections(pillars, power, todayGZ, scores, mainTenStar, _luckyEl, entry, diary);
    renderMeditationBoard(entry, diary);

    /* 이벤트 바인딩 (각 오픈마다 재바인딩 방지: once) */
    bindModalEvents(modal);
  }

  /* ─── 모달 이벤트 바인딩 ─────────────────────────────────────── */
  function bindModalEvents(modal) {
    /* 탭 */
    modal.querySelectorAll('.lsd-tab').forEach(function (tab) {
      tab.onclick = function () { switchTab(tab.dataset.tab); };
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
      var resultBox = document.getElementById('lsdLottoResult');
      if (resultBox) resultBox.style.display = 'none';
      startLotto();
    };

    /* 저장 버튼 */
    var saveBtn = document.getElementById('lsdSaveNightBtn');
    if (saveBtn) saveBtn.onclick = function () {
      var inp = document.getElementById('lsdPracticeNoteInput');
      var d = loadDiary();
      var entry = getTodayEntry(d);
      entry.practiceNote = inp ? inp.value : '';
      entry.nightLog = entry.practiceNote;
      saveDiary(d);
      if (calcNightEffort(entry).pct >= 100) launchNightConfetti();
      renderMeditationBoard(entry, d);
      var fb = document.getElementById('lsdSaveFeedback');
      if (fb) { fb.style.display = 'block'; setTimeout(function () { fb.style.display = 'none'; }, 2000); }
    };

    var themeWrap = document.getElementById('lsdTomorrowBlueprintBtns');
    if (themeWrap) themeWrap.onclick = function (ev) {
      var btn = ev.target && ev.target.closest('[data-blueprint]');
      if (!btn) return;
      var blueprint = btn.getAttribute('data-blueprint') || '';
      var d = loadDiary();
      var e = getTodayEntry(d);
      e.tomorrowBlueprint = blueprint;
      e.tomorrowPlanTheme = '';
      e.tomorrowActionPlan = [];
      saveDiary(d);
      renderNightPracticeBoard(e);
      renderMeditationBoard(e, d);
    };

    var aiBtn = document.getElementById('lsdGenerateAiCoachBtn');
    if (aiBtn) aiBtn.onclick = function () {
      var coachCard = document.getElementById('lsdAiLuckCoach');
      if (!coachCard) return;
      aiBtn.disabled = true;
      aiBtn.textContent = '분석 중...';
      coachCard.classList.add('is-loading');
      coachCard.innerHTML = '실천 데이터를 분석 중입니다. 개운 원리와 내일 기운 흐름을 조합하고 있어요...';
      setTimeout(function () {
        var d = loadDiary();
        var e = getTodayEntry(d);
        var noteEl = document.getElementById('lsdPracticeNoteInput');
        e.practiceNote = noteEl ? noteEl.value : e.practiceNote;
        e.nightLog = e.practiceNote;
        e.aiLuckCoach = buildAiLuckCoachAdvice(e) + '<div class="lsd-ai-foot">프롬프트 컨셉: ' + escHtml(AI_COACH_ENGINE_PROMPT.slice(0, 72)) + '...</div>';
        e.aiCoachUpdatedAt = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        saveDiary(d);
        coachCard.classList.remove('is-loading');
        renderNightPracticeBoard(e);
        renderMeditationBoard(e, d);
        aiBtn.disabled = false;
        aiBtn.textContent = '🧠 AI 코칭 생성';
      }, 1150);
    };

    var revisionBtn = document.getElementById('lsdStartRevisionTimer');
    if (revisionBtn) revisionBtn.onclick = function () {
      var d = loadDiary();
      var e = getTodayEntry(d);
      var o = document.getElementById('lsdRevisionOriginal');
      var r = document.getElementById('lsdRevisionImagined');
      var countEl = document.getElementById('lsdRevisionCountdown');
      var guideEl = document.getElementById('lsdRevisionGuide');
      e.revisionOriginal = o ? o.value : '';
      e.revisionImagined = r ? r.value : '';
      saveDiary(d);

      var sec = 60;
      if (countEl) countEl.textContent = '01:00';
      if (guideEl) guideEl.textContent = '이제 눈을 감고, 수정된 장면이 실제 사실인 것처럼 1분간 상상하세요.';
      if (_lsdMeditationTimer) clearInterval(_lsdMeditationTimer);
      _lsdMeditationTimer = setInterval(function () {
        sec -= 1;
        var mm = String(Math.floor(sec / 60)).padStart(2, '0');
        var ss = String(sec % 60).padStart(2, '0');
        if (countEl) countEl.textContent = mm + ':' + ss;
        if (sec <= 0) {
          clearInterval(_lsdMeditationTimer);
          _lsdMeditationTimer = null;
          var dd = loadDiary();
          var ee = getTodayEntry(dd);
          ee.revisionDoneCount = (Number(ee.revisionDoneCount) || 0) + 1;
          ee.meditationMinutes = (Number(ee.meditationMinutes) || 0) + 1;
          ee.meditationLogs.push({ type: 'revision', ts: Date.now() });
          ee.meditationPoints = calcMeditationPoints(ee);
          saveDiary(dd);
          if (guideEl) guideEl.textContent = '완료! 수정된 사실감이 잠재의식에 고정되도록 3회 심호흡을 더 하세요.';
          launchNightConfetti();
          renderMeditationBoard(ee, dd);
        }
      }, 1000);
    };

    var genSatsBtn = document.getElementById('lsdGenerateSatsScene');
    if (genSatsBtn) genSatsBtn.onclick = function () {
      var d = loadDiary();
      var e = getTodayEntry(d);
      e.satsKeyword = getTomorrowLuckKeyword(e);
      e.satsScene = buildSatsSceneText(e.satsKeyword, e);
      e.meditationPoints = calcMeditationPoints(e);
      saveDiary(d);
      renderMeditationBoard(e, d);
    };

    var startSatsBtn = document.getElementById('lsdStartSatsMode');
    if (startSatsBtn) startSatsBtn.onclick = function () {
      var zone = document.getElementById('lsdSatsZone');
      var modeEl = document.getElementById('lsdSatsAudioMode');
      var mode = modeEl ? modeEl.value : 'lofi';
      if (zone) zone.classList.add('is-dark');
      loadSatsPlaylist(mode, false);
    };

    var refreshSatsBtn = document.getElementById('lsdRefreshSatsPlaylist');
    if (refreshSatsBtn) refreshSatsBtn.onclick = function () {
      var modeEl = document.getElementById('lsdSatsAudioMode');
      var mode = modeEl ? modeEl.value : 'lofi';
      loadSatsPlaylist(mode, true);
    };

    var satsModeSelect = document.getElementById('lsdSatsAudioMode');
    if (satsModeSelect) satsModeSelect.onchange = function () {
      var zone = document.getElementById('lsdSatsZone');
      if (zone) zone.classList.remove('is-dark');
      stopSatsAudio();
      renderSatsPlaylist(satsModeSelect.value, _lsdSatsYouTubeCache[satsModeSelect.value], '모드를 변경했습니다. 재생할 트랙을 선택하세요.');
    };

    var satsPlaylist = document.getElementById('lsdSatsPlaylist');
    if (satsPlaylist) satsPlaylist.onclick = function (ev) {
      var playBtn = ev.target && ev.target.closest('[data-sats-play]');
      if (!playBtn) return;
      var videoId = playBtn.getAttribute('data-sats-play') || '';
      var modeEl = document.getElementById('lsdSatsAudioMode');
      var mode = modeEl ? modeEl.value : 'lofi';
      if (!videoId) return;
      playSatsVideo(mode, videoId);
    };

    var stopSatsBtn = document.getElementById('lsdStopSatsMode');
    if (stopSatsBtn) stopSatsBtn.onclick = function () {
      var zone = document.getElementById('lsdSatsZone');
      if (zone) zone.classList.remove('is-dark');
      stopSatsAudio();
    };

    var regenIam = document.getElementById('lsdRegenerateIam');
    if (regenIam) regenIam.onclick = function () {
      var d = loadDiary();
      var e = getTodayEntry(d);
      e.iAmAffirmation = buildIamAffirmation(e);
      e.iAmCompleted = false;
      e.meditationPoints = calcMeditationPoints(e);
      saveDiary(d);
      renderMeditationBoard(e, d);
    };

    var confirmIam = document.getElementById('lsdConfirmIam');
    if (confirmIam) confirmIam.onclick = function () {
      var d = loadDiary();
      var e = getTodayEntry(d);
      var iamInput = document.getElementById('lsdIamInput');
      var typed = iamInput ? String(iamInput.value || '').trim() : '';
      var target = String(e.iAmAffirmation || '').trim();
      if (!typed) {
        alert('I AM 선언 문장을 한번 입력하거나 소리 내어 읽고 확인해주세요.');
        return;
      }
      e.iAmCompleted = typed === target;
      e.meditationLogs.push({ type: 'iam', ts: Date.now(), ok: e.iAmCompleted });
      e.meditationPoints = calcMeditationPoints(e);
      saveDiary(d);
      renderMeditationBoard(e, d);
      alert(e.iAmCompleted ? '좋아요. 오늘의 정체성이 고정되었습니다.' : '문장을 카드와 동일하게 입력하면 확언 완료로 기록됩니다.');
    };

    var suggestFocus = document.getElementById('lsdSuggestFocusMode');
    if (suggestFocus) suggestFocus.onclick = function () {
      try {
        var host = document.getElementById('luckSyncDiaryModal');
        if (host && host.requestFullscreen) host.requestFullscreen();
      } catch (e) {}
      alert('몰입 모드 제안: 방해 금지 모드(알림 차단)를 켜고 이어폰을 착용하면 SATS 집중도가 더 높아집니다.');
    };

    /* 전체 삭제 버튼 */
    var clearBtn = document.getElementById('lsdClearBtn');
    if (clearBtn) clearBtn.onclick = function () {
      if (window.confirm('모든 운구 기일 기록을 삭제할까요? 되돌릴 수 없어요!')) {
        localStorage.removeItem(LS_KEY);
        renderHistory();
      }
    };

    /* 스티커 선택 */
    modal.querySelectorAll('[data-sticker]').forEach(function (btn) {
      btn.onclick = function () {
        var name = btn.getAttribute('data-sticker') || '';
        var d = loadDiary();
        var e = getTodayEntry(d);
        var idx = e.stickers.indexOf(name);
        if (idx >= 0) {
          e.stickers.splice(idx, 1);
        } else {
          if (e.stickers.length >= 3) e.stickers.shift();
          e.stickers.push(name);
        }
        saveDiary(d);
        renderMzSections(window.G_PILLARS || null, window.G_POWER || null, _lsdCtx.todayGZ, _lsdCtx.scores, _lsdCtx.mainTenStar, _lsdCtx.luckyEl, e, d);
      };
    });

    /* 감정 태그 */
    modal.querySelectorAll('[data-emotion]').forEach(function (btn) {
      btn.onclick = function () {
        var tag = btn.getAttribute('data-emotion') || '';
        var d = loadDiary();
        var e = getTodayEntry(d);
        var idx = e.emotionTags.indexOf(tag);
        if (idx >= 0) {
          e.emotionTags.splice(idx, 1);
        } else {
          if (e.emotionTags.length >= 5) e.emotionTags.shift();
          e.emotionTags.push(tag);
        }
        saveDiary(d);
        renderMzSections(window.G_PILLARS || null, window.G_POWER || null, _lsdCtx.todayGZ, _lsdCtx.scores, _lsdCtx.mainTenStar, _lsdCtx.luckyEl, e, d);
      };
    });

    var saveMemoBtn = document.getElementById('lsdSaveMemoBtn');
    if (saveMemoBtn) saveMemoBtn.onclick = function () {
      var d = loadDiary();
      var e = getTodayEntry(d);
      var memoEl = document.getElementById('lsdMemoInput');
      e.memoNote = memoEl ? memoEl.value : '';
      saveDiary(d);
      alert('사주 메모장 저장 완료!');
    };

    var shareBtn = document.getElementById('lsdShareCardBtn');
    if (shareBtn) shareBtn.onclick = function () {
      var d = loadDiary();
      var e = getTodayEntry(d);
      var nickEl = document.getElementById('lsdShareNick');
      var capEl = document.getElementById('lsdShareCaption');
      var themeEl = document.getElementById('lsdShareTheme');
      var stickerOnEl = document.getElementById('lsdShareStickerOn');
      var badgeOnEl = document.getElementById('lsdShareBadgeOn');
      e.shareNickname = nickEl ? nickEl.value : '';
      e.shareCaption = capEl ? capEl.value : '';
      e.shareTheme = themeEl ? themeEl.value : 'vivid';
      e.shareUseSticker = stickerOnEl ? !!stickerOnEl.checked : true;
      e.shareUseBadge = badgeOnEl ? !!badgeOnEl.checked : true;
      saveDiary(d);
      generateShareCard(e);
    };

    var compatBtn = document.getElementById('lsdCompatBtn');
    if (compatBtn) compatBtn.onclick = function () {
      var d = loadDiary();
      var e = getTodayEntry(d);
      var nameEl = document.getElementById('lsdPartnerName');
      var birthDateEl = document.getElementById('lsdPartnerBirthDate');
      var birthTimeEl = document.getElementById('lsdPartnerBirthTime');
      var cityEl = document.getElementById('lsdPartnerCity');
      var typeEl = document.getElementById('lsdCompatType');
      var yearEl = document.getElementById('lsdPartnerYear');
      e.partnerName = nameEl ? nameEl.value : '';
      e.partnerBirthDate = birthDateEl ? birthDateEl.value : '';
      e.partnerBirthTime = birthTimeEl ? birthTimeEl.value : '12:00';
      e.partnerBirthCity = cityEl ? cityEl.value : '서울';
      e.compatType = typeEl ? typeEl.value : 'love';
      e.partnerBirthYear = yearEl ? yearEl.value : '';
      if (!e.partnerBirthYear && e.partnerBirthDate) {
        e.partnerBirthYear = String(e.partnerBirthDate).slice(0, 4);
      }
      saveDiary(d);
      renderCompatResult(e, d);
    };
  }

  /* ─── 닫기 ───────────────────────────────────────────────────── */
  function closeDiary() {
    var modal = document.getElementById('luckSyncDiaryModal');
    if (modal) modal.style.display = 'none';
    if (_lsdMeditationTimer) {
      clearInterval(_lsdMeditationTimer);
      _lsdMeditationTimer = null;
    }
    stopSatsAudio();
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
