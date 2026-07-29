/* 「나는 도파민 중독일까?」 — 사주로 보는 자극 추구 성향 리포트
 *
 * 로드 순서: js/saju-engine.js → … → js/entertain-engine.js → (본 파일, 체인 맨 뒤)
 * 호출: saju-engine.js 의 runDeferredSajuTasks 에서 renderDopamineReport(p, natal, power, johu)
 *
 * 🔒 산출 근거(슬롯 가중치·십성/신살 판정·부분 점수)는 결과 DOM·반환 객체에 노출하지 않는다.
 *    사용자에게는 "무엇이 보이는가"만 감성 문장으로 전달한다(기획 요구).
 */
(function (w) {
  'use strict';

  /* ══════════════════════════════════════════════
     0. 유틸
     ══════════════════════════════════════════════ */

  function _dpClamp(v, min, max) {
    var n = Number(v);
    if (!isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  function _dpSeed(text) {
    var str = String(text || '');
    var hash = 0;
    for (var i = 0; i < str.length; i += 1) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  function _dpPick(list, seed) {
    if (!list || !list.length) return '';
    return list[seed % list.length];
  }

  function _dpStars(pct) {
    var filled = _dpClamp(Math.ceil(Number(pct || 0) / 20), 1, 5);
    return new Array(filled + 1).join('★') + new Array(6 - filled).join('☆');
  }

  function _dpEscape(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function _dpTodayKey() {
    var now = new Date();
    return now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
  }

  /* ══════════════════════════════════════════════
     1. 내부 지표 — 외부로 반환하지 않는다
     ══════════════════════════════════════════════ */

  /* 궁위 가중치: 월지를 가장 무겁게 본다(renderSkillTree 와 동일 계보). */
  var SLOT_WEIGHTS = [
    ['y', 'g', 0.7], ['y', 'j', 0.8],
    ['m', 'g', 1.4], ['m', 'j', 2.0],
    ['d', 'j', 1.1],
    ['h', 'g', 1.0], ['h', 'j', 0.9]
  ];

  var PEACH_BRANCHES = ['子', '午', '卯', '酉'];
  var TRAVEL_BRANCHES = ['寅', '申', '巳', '亥'];
  var ACTIVE_STAGES = { '장생': 1.0, '목욕': 1.2, '관대': 1.0, '건록': 1.1, '제왕': 1.3 };
  var QUIET_STAGES = { '묘': 1.0, '절': 1.0, '태': 0.8, '양': 0.6 };

  function readSignals(p, natal, power, johu) {
    var dayGan = (p && p.d && p.d.g) || '';
    var branches = [p && p.y && p.y.j, p && p.m && p.m.j, p && p.d && p.d.j, p && p.h && p.h.j];

    /* 십성 가중 합산 */
    var tg = { 비견: 0, 겁재: 0, 식신: 0, 상관: 0, 편재: 0, 정재: 0, 편관: 0, 정관: 0, 편인: 0, 정인: 0 };
    if (typeof w.getTenGod === 'function') {
      SLOT_WEIGHTS.forEach(function (slot) {
        var pillar = p && p[slot[0]];
        var code = pillar && pillar[slot[1]];
        if (!code) return;
        var name = w.getTenGod(dayGan, code);
        if (tg[name] == null) return;
        tg[name] += slot[2];
      });
    }

    /* 도화·역마: 히트 수와 함께 월지·일지(도화) / 년지·월지(역마) 가중을 본다 */
    function hitInfo(set, keyIndexes) {
      var hits = 0;
      var keyHits = 0;
      branches.forEach(function (branch, idx) {
        if (!branch || set.indexOf(branch) < 0) return;
        hits += 1;
        if (keyIndexes.indexOf(idx) >= 0) keyHits += 1;
      });
      return { hits: hits, keyHits: keyHits };
    }
    var peach = hitInfo(PEACH_BRANCHES, [1, 2]);
    var travel = hitInfo(TRAVEL_BRANCHES, [0, 1]);

    /* 홍염 일주 판정은 기존 신살 추출기를 그대로 쓴다(일주 표 중복 정의 방지) */
    var hongyeom = false;
    if (typeof w._sajuVillainExtractMajorSinsal === 'function') {
      try {
        hongyeom = w._sajuVillainExtractMajorSinsal(p).some(function (row) { return row && row.id === 'hongyeom'; });
      } catch (sinsalErr) { hongyeom = false; }
    }

    /* 지지 충 = 변동성 */
    var chong = 0;
    if (typeof w._sajuVillainBuildBranchRelations === 'function') {
      try {
        var relations = w._sajuVillainBuildBranchRelations(p);
        chong = (relations.conflictRelations || []).filter(function (row) { return row && row.type === '충'; }).length;
      } catch (relErr) { chong = 0; }
    }

    /* 12운성 활동도 */
    var active = 0;
    var quiet = 0;
    if (typeof w.cdTwelveStage === 'function') {
      branches.forEach(function (branch) {
        if (!branch) return;
        var stage = w.cdTwelveStage(dayGan, branch);
        if (ACTIVE_STAGES[stage]) active += ACTIVE_STAGES[stage];
        else if (QUIET_STAGES[stage]) quiet += QUIET_STAGES[stage];
      });
    }

    var ratios = (natal && natal.ratios) || {};
    var elem = {
      wood: Number(ratios.wood || 0) / 100,
      fire: Number(ratios.fire || 0) / 100,
      earth: Number(ratios.earth || 0) / 100,
      metal: Number(ratios.metal || 0) / 100,
      water: Number(ratios.water || 0) / 100
    };

    return {
      sik: tg.식신,
      sang: tg.상관,
      siksang: tg.식신 + tg.상관 * 1.25,
      pyeonJae: tg.편재,
      jae: tg.편재 * 1.3 + tg.정재 * 0.8,
      bigyeop: tg.비견 + tg.겁재,
      insung: tg.정인 + tg.편인,
      gwanAll: tg.정관 + tg.편관,
      gwanJeong: tg.정관,
      peachHits: peach.hits,
      peachKey: peach.keyHits,
      travelHits: travel.hits,
      travelKey: travel.keyHits,
      hongyeom: hongyeom,
      chong: chong,
      active: active,
      quiet: quiet,
      elem: elem,
      isStrong: !!(power && power.isStrong),
      johuType: (johu && johu.type) || 'neutral',
      moistType: (johu && johu.moistType) || 'balanced'
    };
  }

  function scoreStimulus(sig) {
    var score = 26;

    /* 표현·새로움 욕구 */
    score += Math.min(27, sig.siksang * 8.2);

    /* 욕망·소비·확장 */
    score += Math.min(21, sig.jae * 7.2);

    /* 감각·매혹 */
    score += Math.min(19, sig.peachHits * 5.5 + sig.peachKey * 4.5 + (sig.hongyeom ? 4 : 0));

    /* 이동·변동 */
    score += Math.min(19, sig.travelHits * 5.5 + sig.travelKey * 4.5) + Math.min(6, sig.chong * 2);

    /* 오행 성향 — 火木은 즉흥, 土金은 절제 */
    var hotSide = (sig.elem.fire + sig.elem.wood) * 100;
    var calmSide = (sig.elem.earth + sig.elem.metal) * 100;
    if (hotSide > 45) score += _dpClamp((hotSide - 45) / 55 * 12, 0, 12);
    if (calmSide > 55) score -= _dpClamp((calmSide - 55) / 45 * 10, 0, 10);

    /* 활동 단계 */
    score += Math.min(8, sig.active * 2.2);
    score -= Math.min(6, sig.quiet * 1.6);

    /* 조후 */
    if (sig.johuType === 'hot') score += 4;
    else if (sig.johuType === 'warm') score += 2;
    else if (sig.johuType === 'cool') score -= 2;
    else if (sig.johuType === 'cold') score -= 4;
    if (sig.moistType === 'wet') score += 2;
    else if (sig.moistType === 'dry') score -= 2;

    /* 절제축 */
    score -= Math.min(8, sig.insung * 2.4);
    score -= Math.min(6, sig.gwanJeong * 3.0);

    return _dpClamp(Math.round(score), 0, 100);
  }

  /* 자극 레이더 8축 — 축마다 서로 다른 하위 신호를 본다 */
  function buildRadar(sig) {
    function n(value, ceiling) { return _dpClamp(value / ceiling, 0, 1); }

    var SS = n(sig.siksang, 3.2);
    var SIK = n(sig.sik, 2.2);
    var SANG = n(sig.sang, 2.2);
    var JAE = n(sig.jae, 3.0);
    var PJAE = n(sig.pyeonJae, 2.0);
    var IN = n(sig.insung, 3.0);
    var GWAN = n(sig.gwanAll, 3.0);
    var BG = n(sig.bigyeop, 3.0);
    var ACT = n(sig.active, 3.0);
    var DH = _dpClamp(sig.peachHits * 0.3 + sig.peachKey * 0.25 + (sig.hongyeom ? 0.2 : 0), 0, 1);
    var YM = _dpClamp(sig.travelHits * 0.3 + sig.travelKey * 0.25 + sig.chong * 0.12, 0, 1);
    var e = sig.elem;

    function axis(label, value) {
      return { label: label, value: Math.round(_dpClamp(value, 25, 99)) };
    }

    return [
      axis('새로운 경험', 30 + 40 * SS + 18 * YM + 24 * e.wood),
      axis('SNS', 28 + 34 * SANG + 26 * DH + 24 * e.fire),
      axis('쇼핑', 26 + 34 * PJAE + 22 * DH + 24 * JAE),
      axis('게임', 28 + 30 * SIK + 30 * e.water + 16 * SANG),
      axis('공부', 30 + 34 * IN + 22 * GWAN + 26 * e.metal),
      axis('여행', 28 + 40 * YM + 22 * e.wood + 22 * e.water),
      axis('연애', 28 + 38 * DH + 18 * SS + (sig.hongyeom ? 12 : 0)),
      axis('운동', 28 + 30 * BG + 30 * e.fire + 18 * ACT)
    ];
  }

  /* 몰입 분야 — 레이더 축을 재활용하고 창작·사업만 별도 산출 */
  function buildFocusFields(sig, radar) {
    function n(value, ceiling) { return _dpClamp(value / ceiling, 0, 1); }
    var byLabel = {};
    radar.forEach(function (row) { byLabel[row.label] = row.value; });

    var creation = Math.round(_dpClamp(
      30 + 38 * n(sig.sang, 2.2) + 22 * n(sig.siksang, 3.2) + 24 * sig.elem.fire, 25, 99));
    var business = Math.round(_dpClamp(
      28 + 34 * n(sig.jae, 3.0) + 22 * n(sig.bigyeop, 3.0) + 16 * n(sig.active, 3.0), 25, 99));

    return [
      { label: '창작', pct: creation },
      { label: '공부', pct: byLabel['공부'] },
      { label: '연애', pct: byLabel['연애'] },
      { label: '사업', pct: business },
      { label: '게임', pct: byLabel['게임'] },
      { label: 'SNS', pct: byLabel['SNS'] },
      { label: '운동', pct: byLabel['운동'] },
      { label: '여행', pct: byLabel['여행'] }
    ].sort(function (a, b) { return b.pct - a.pct; });
  }

  function buildBadges(score, radar, sig) {
    var byLabel = {};
    radar.forEach(function (row) { byLabel[row.label] = row.value; });
    var pool = [];

    if (score >= 85) pool.push({ icon: '🚀', name: '탐험가', desc: '멈춰 있는 상태를 가장 못 견디는 사람' });
    if (byLabel['여행'] >= 78) pool.push({ icon: '🌎', name: '모험가', desc: '낯선 공기에서 회복하는 사람' });
    if (byLabel['SNS'] >= 74 || byLabel['창작'] >= 78) pool.push({ icon: '🎨', name: '창조자', desc: '표현하지 않으면 답답해지는 사람' });
    if (byLabel['공부'] >= 76) pool.push({ icon: '📚', name: '평생학습가', desc: '배우는 순간에 가장 몰입하는 사람' });
    if (sig.siksang >= 2.2 && sig.jae >= 2.0) pool.push({ icon: '⚡', name: '아이디어 발전기', desc: '떠오르면 바로 굴려보는 사람' });
    if (score <= 40) pool.push({ icon: '🪵', name: '루틴 마스터', desc: '같은 리듬에서 가장 강해지는 사람' });
    if (score >= 45 && score <= 70) pool.push({ icon: '⚖️', name: '조율가', desc: '자극과 안정 사이를 잘 오가는 사람' });

    if (!pool.length) pool.push({ icon: '🌱', name: '천천히 자라는 사람', desc: '자기 속도를 지킬 줄 아는 사람' });
    return pool.slice(0, 3);
  }

  /* ══════════════════════════════════════════════
     2. 점수 구간별 카피 패키지
        구간이 바뀌면 문장 몇 개가 아니라 톤 전체가 바뀐다.
     ══════════════════════════════════════════════ */

  var BAND_ORDER = [
    { key: 'sss', min: 95, grade: 'SSS', typeName: '자극 마스터' },
    { key: 'ss', min: 85, grade: 'SS', typeName: '도전가' },
    { key: 's', min: 75, grade: 'S', typeName: '탐험가' },
    { key: 'a', min: 60, grade: 'A', typeName: '균형형' },
    { key: 'b', min: 45, grade: 'B', typeName: '안정형' },
    { key: 'c', min: 30, grade: 'C', typeName: '평온형' },
    { key: 'd', min: 0, grade: 'D', typeName: '루틴 마스터' }
  ];

  function pickBand(score) {
    for (var i = 0; i < BAND_ORDER.length; i += 1) {
      if (score >= BAND_ORDER[i].min) return BAND_ORDER[i];
    }
    return BAND_ORDER[BAND_ORDER.length - 1];
  }

  var BAND_CONTENT = {
    sss: {
      headline: '자극이 없으면 살아 있는 것 같지가 않은 사람',
      narrative: [
        '당신은 같은 자리에 오래 머무는 걸 견디기 어려워합니다. 어제와 똑같은 하루가 반복되면 무언가 잘못됐다는 신호처럼 느껴지죠.',
        '새로운 것을 시작할 때의 심박수, 처음 보는 풍경, 처음 만나는 사람 — 그 순간의 감각이 당신의 연료입니다. 문제는 그 연료가 굉장히 빨리 탄다는 것.',
        '그래서 당신은 시작에는 천재적이고, 마무리에는 늘 자기 자신과 싸웁니다. 이건 의지 문제가 아니라 설계 문제예요.'
      ],
      why: [
        '사주에서 새로운 경험 쪽으로 에너지가 강하게 쏠리는 흐름이 보입니다.',
        '한곳에 오래 머무르기보다, 움직이고 바꿀 때 기운이 살아나는 구조입니다.',
        '감각을 끌어당기는 힘도 함께 강해, 자극이 먼저 눈에 들어오는 편입니다.'
      ],
      switches: [
        '완전히 새로운 판이 열렸을 때',
        '아무도 안 해본 걸 처음 시도할 때',
        '내 결과가 즉시 눈에 보일 때',
        '낯선 도시에 처음 도착했을 때',
        '누군가 "그게 되겠어?"라고 말할 때'
      ],
      boredom: [
        { label: '똑같은 일의 반복', pct: 96 },
        { label: '변화 없는 일상', pct: 94 },
        { label: '결과가 느린 일', pct: 90 },
        { label: '피드백 없는 환경', pct: 88 },
        { label: '예측 가능한 관계', pct: 82 }
      ],
      focusEnv: [
        { label: '마감이 코앞일 때', pct: 96 },
        { label: '밤', pct: 90 },
        { label: '음악이 크게 깔린 공간', pct: 84 },
        { label: '카페·낯선 장소', pct: 82 },
        { label: '조용한 방', pct: 46 }
      ],
      advice: '당신에게 필요한 건 자제력이 아니라 구조입니다. 큰 목표 하나를 오래 붙드는 방식은 당신 설계와 맞지 않아요. 목표를 잘게 쪼개 2~3일 단위로 끝나는 형태로 바꾸고, 끝낼 때마다 눈에 보이는 흔적을 남기세요. 그리고 하나는 반드시 남겨두세요 — 끝까지 간 경험이 하나라도 있으면, 그다음부터 당신의 속도는 무기가 됩니다.',
      oneLiners: [
        '오늘은 새로 벌이지 말고, 벌여둔 것 중 하나를 닫아보세요.',
        '지금 가장 지루한 일이, 사실은 가장 가까이 온 일일 수 있습니다.',
        '오늘의 충동 하나만 30분 미뤄보세요. 그것만으로 하루의 밀도가 달라집니다.',
        '새로움이 부족한 게 아니라 마무리가 부족한 날입니다.',
        '오늘은 속도를 줄이는 게 오히려 앞서가는 방법입니다.'
      ],
      missions: [
        '벌여둔 일 중 가장 오래된 것 하나 끝내기',
        '휴대폰 없이 30분 보내기',
        '새 프로젝트 대신 기존 프로젝트 30분 더 하기',
        '오늘 산 것 하나 반품하거나 취소하기',
        '한 번도 안 가본 길로 퇴근하기',
        '오늘 떠오른 아이디어 3개를 적기만 하고 실행하지 않기'
      ]
    },
    ss: {
      headline: '재미있어 보이면 일단 뛰어드는 사람',
      narrative: [
        '당신은 안전한 선택보다 흥미로운 선택을 고릅니다. 남들이 "위험하지 않아?"라고 물을 때, 당신은 이미 시작해 있는 편이죠.',
        '새로운 프로젝트, 새로운 사람, 새로운 취미에 빠지는 속도가 아주 빠릅니다. 그리고 그 몰입의 밀도도 상당히 높아요.',
        '다만 그 불이 꺼지는 것도 예고 없이 옵니다. 어제까지 전부였던 게 오늘은 아무것도 아닌 게 되는 경험, 익숙하실 겁니다.'
      ],
      why: [
        '사주에서 도전과 확장 쪽으로 기운이 뚜렷하게 기울어 있습니다.',
        '가만히 있을 때보다 부딪히고 시도할 때 흐름이 열리는 구조입니다.',
        '흥미가 붙는 속도가 빠른 만큼, 식는 속도도 함께 빠른 편입니다.'
      ],
      switches: [
        '새로운 목표가 생겼을 때',
        '인정받을 때',
        '이길 수 있을 것 같을 때',
        '새로운 사람을 만났을 때',
        '내가 처음이라는 걸 알았을 때'
      ],
      boredom: [
        { label: '반복 업무', pct: 92 },
        { label: '변화 없는 일상', pct: 88 },
        { label: '결과가 느린 일', pct: 86 },
        { label: '즉각적인 피드백이 없는 환경', pct: 82 },
        { label: '지루한 인간관계', pct: 76 }
      ],
      focusEnv: [
        { label: '경쟁 상황', pct: 94 },
        { label: '밤', pct: 86 },
        { label: '카페', pct: 82 },
        { label: '조용한 음악', pct: 78 },
        { label: '아침', pct: 54 }
      ],
      advice: '당신은 시작 에너지가 크기 때문에, 그 에너지를 "몇 개에 나눠 쓰느냐"가 성패를 가릅니다. 동시에 굴리는 판을 셋 이하로 묶어두세요. 그리고 흥미가 식었을 때 그만두는 게 아니라, 흥미가 식은 뒤에도 2주만 더 가보는 습관을 만들면 결과의 크기가 완전히 달라집니다.',
      oneLiners: [
        '오늘은 새로 시작하기보다 하고 있는 걸 한 칸 더 밀어보세요.',
        '흥미가 식은 그 지점이 보통 진짜 실력이 붙는 자리입니다.',
        '오늘 벌인 판이 세 개를 넘었다면, 하나는 접어도 됩니다.',
        '즉흥적으로 결정하기 전에 딱 하룻밤만 재워보세요.',
        '오늘은 이기는 것보다 끝내는 게 더 값진 날입니다.'
      ],
      missions: [
        '진행 중인 일 하나를 오늘 안에 마무리하기',
        '새로운 카페 가기',
        '안 읽고 쌓아둔 책 10페이지 읽기',
        '오늘 하루 알림 전부 끄고 지내기',
        '한 번도 안 해본 운동 10분 해보기',
        '충동구매 장바구니 비우기'
      ]
    },
    s: {
      headline: '새로운 가능성을 발견할 때 가장 살아나는 사람',
      narrative: [
        '당신은 같은 일을 오랫동안 반복하기보다, 새로운 경험을 통해 동기를 얻는 편입니다. 배움의 초반, 관계의 초반, 일의 초반에 특히 강해요.',
        '새로운 프로젝트, 새로운 사람, 새로운 취미에 쉽게 흥미를 느끼고, 거기서 얻은 감각을 다른 데 연결하는 능력도 좋습니다.',
        '반면 완전히 고정된 환경에서는 의욕이 눈에 띄게 떨어집니다. 이건 게으름이 아니라 연료 종류가 다른 겁니다.'
      ],
      why: [
        '사주에서 새로운 경험에 쉽게 에너지를 얻는 흐름이 보입니다.',
        '한 가지에 오래 머무르기보다 변화를 통해 활력을 얻는 편입니다.',
        '안정을 아예 싫어하는 건 아니라, 변화의 폭만 잘 조절하면 오래 갑니다.'
      ],
      switches: [
        '새로운 목표가 생겼을 때',
        '인정받을 때',
        '성취를 경험할 때',
        '새로운 사람을 만날 때',
        '배우기 시작할 때'
      ],
      boredom: [
        { label: '반복 업무', pct: 88 },
        { label: '변화 없는 일상', pct: 84 },
        { label: '지루한 인간관계', pct: 78 },
        { label: '결과가 느린 일', pct: 76 },
        { label: '즉각적인 피드백이 없는 환경', pct: 72 }
      ],
      focusEnv: [
        { label: '혼자 집중', pct: 88 },
        { label: '조용한 음악', pct: 86 },
        { label: '밤', pct: 82 },
        { label: '카페', pct: 78 },
        { label: '아침', pct: 58 }
      ],
      advice: '당신은 새로운 자극을 통해 동기를 얻는 성향이 있습니다. 따라서 큰 목표 하나보다, 작은 목표를 자주 달성하는 구조가 더 오래 지속될 가능성이 높습니다. 같은 일을 계속해야 한다면 방식이나 환경 중 하나를 주기적으로 바꿔주세요. 내용이 아니라 껍데기만 바꿔도 당신의 의욕은 다시 붙습니다.',
      oneLiners: [
        '오늘은 새로운 것을 시작하기보다, 지금 하고 있는 일을 끝내는 것이 더 만족감을 줄 수 있습니다.',
        '작은 변화 하나면 충분한 날입니다. 판을 통째로 엎지 않아도 됩니다.',
        '오늘 배운 것 하나를 누군가에게 설명해보세요. 몰입이 두 배가 됩니다.',
        '지루하다는 느낌은 보통 방식의 문제이지 선택의 문제가 아닙니다.',
        '오늘은 처음 해보는 걸 딱 하나만 넣어보세요.'
      ],
      missions: [
        '새로운 카페 가기',
        '새로운 책 10분 읽기',
        '10분 산책',
        '새로운 음악 듣기',
        '휴대폰 없이 30분 보내기',
        '평소와 다른 시간에 하던 일 해보기'
      ]
    },
    a: {
      headline: '자극과 안정을 상황에 따라 갈아 끼우는 사람',
      narrative: [
        '당신은 새로움도 좋아하고 안정도 좋아합니다. 애매해 보이지만 사실 이건 꽤 유리한 조합이에요.',
        '흥미로운 일이 생기면 충분히 뛰어들 수 있고, 그게 지나가면 원래 자리로 무리 없이 돌아옵니다. 무너지지 않고 오래 갑니다.',
        '다만 스스로 "나는 뭘 좋아하는 사람이지?"라는 질문에 잘 답하지 못할 때가 있습니다. 양쪽 다 되는 사람은 방향을 스스로 정해야 합니다.'
      ],
      why: [
        '사주에서 움직이는 기운과 지키는 기운이 비슷한 무게로 나뉘어 있습니다.',
        '상황에 따라 태도를 바꿀 수 있어, 한쪽으로 크게 흔들리지 않는 편입니다.',
        '자극이 필요할 때와 안정이 필요할 때를 몸이 먼저 아는 구조입니다.'
      ],
      switches: [
        '내가 선택했다는 감각이 있을 때',
        '성취를 경험할 때',
        '믿는 사람과 함께할 때',
        '배우기 시작할 때',
        '오래 준비한 게 드디어 시작될 때'
      ],
      boredom: [
        { label: '변화 없는 일상', pct: 78 },
        { label: '반복 업무', pct: 74 },
        { label: '결과가 느린 일', pct: 70 },
        { label: '지루한 인간관계', pct: 66 },
        { label: '즉각적인 피드백이 없는 환경', pct: 62 }
      ],
      focusEnv: [
        { label: '혼자 집중', pct: 90 },
        { label: '조용한 음악', pct: 82 },
        { label: '아침', pct: 74 },
        { label: '카페', pct: 70 },
        { label: '밤', pct: 68 }
      ],
      advice: '당신은 양쪽 다 되기 때문에, 오히려 "지금 어느 쪽 모드인지"를 스스로 정해주는 게 중요합니다. 일주일을 통째로 한 모드로 쓰기보다, 요일이나 시간대로 자극 구간과 안정 구간을 나눠보세요. 당신처럼 진폭이 크지 않은 사람은 리듬만 잡히면 아주 멀리 갑니다.',
      oneLiners: [
        '오늘은 결정하기보다 관찰하기 좋은 날입니다.',
        '새로운 것과 익숙한 것을 반씩 섞어보세요. 그게 당신의 최적 비율입니다.',
        '지금 애매하게 느껴지는 건 잘못된 게 아니라 양쪽 다 열려 있다는 뜻입니다.',
        '오늘은 하나만 정해보세요. 나머지는 저절로 따라옵니다.',
        '무리해서 흥분할 필요도, 억지로 가라앉힐 필요도 없는 날입니다.'
      ],
      missions: [
        '오늘 할 일 중 하나만 순서를 바꿔보기',
        '10분 산책',
        '새로운 음악 듣기',
        '평소 안 가던 길로 걸어보기',
        '오늘 하루 마지막에 세 줄 회고 쓰기',
        '휴대폰 없이 30분 보내기'
      ]
    },
    b: {
      headline: '흔들리지 않는 게 곧 실력인 사람',
      narrative: [
        '당신은 새로운 것에 무작정 달려들지 않습니다. 한 번 더 보고, 한 번 더 재고 나서 움직이는 편이죠.',
        '그래서 시작은 느리지만, 시작한 것을 놓지 않습니다. 주변이 다 흔들릴 때 그대로 남아 있는 사람이 대체로 당신 같은 유형입니다.',
        '다만 너무 오래 같은 자리에 있으면 스스로도 모르게 감각이 무뎌집니다. 지겨움이 아니라 무감각이 당신의 위험 신호예요.'
      ],
      why: [
        '사주에서 지키고 쌓는 기운이 움직이는 기운보다 조금 더 두껍게 잡힙니다.',
        '급하게 바꾸기보다 한 자리에서 깊어질 때 성과가 붙는 구조입니다.',
        '자극이 아예 없는 건 아니고, 안전하다고 판단됐을 때만 열리는 편입니다.'
      ],
      switches: [
        '준비한 게 결과로 나왔을 때',
        '믿을 수 있는 사람과 함께할 때',
        '내 기여가 정확히 인정받을 때',
        '계획대로 흘러가고 있을 때',
        '오래 해온 일에서 실력이 늘었다고 느낄 때'
      ],
      boredom: [
        { label: '기준 없이 계속 바뀌는 상황', pct: 84 },
        { label: '의미 없는 반복', pct: 72 },
        { label: '결과가 느린 일', pct: 62 },
        { label: '변화 없는 일상', pct: 58 },
        { label: '지루한 인간관계', pct: 54 }
      ],
      focusEnv: [
        { label: '혼자 집중', pct: 94 },
        { label: '조용한 방', pct: 90 },
        { label: '아침', pct: 84 },
        { label: '조용한 음악', pct: 76 },
        { label: '카페', pct: 52 }
      ],
      advice: '당신은 지속력이 강점이라 자극을 늘릴 필요는 없습니다. 대신 아주 작은 새로움을 정기적으로 넣어주세요. 한 달에 한 번 안 가본 곳에 가거나, 안 해본 방식으로 익숙한 일을 처리해보는 정도면 충분합니다. 당신에게 필요한 건 변화가 아니라 환기입니다.',
      oneLiners: [
        '오늘은 익숙한 일을 조금 다른 순서로 해보세요.',
        '변화가 없다고 느껴진다면, 쌓이고 있다는 뜻일 수 있습니다.',
        '오늘 하나만 새로 시도해도 이번 주 전체가 달라집니다.',
        '당신의 속도는 느린 게 아니라 깊은 겁니다.',
        '오늘은 정리보다 환기가 필요한 날입니다.'
      ],
      missions: [
        '한 번도 안 가본 가게에 들어가보기',
        '평소 안 먹던 메뉴 시켜보기',
        '10분 산책',
        '새로운 음악 한 곡 듣기',
        '늘 하던 일을 다른 순서로 해보기',
        '오늘 만난 사람에게 질문 하나 더 하기'
      ]
    },
    c: {
      headline: '조용한 상태에서 힘이 차오르는 사람',
      narrative: [
        '당신은 시끄러운 자극을 즐기지 않습니다. 사람 많은 자리, 갑작스러운 변화, 예고 없는 연락 — 모두 에너지를 꽤 많이 가져가죠.',
        '대신 혼자 있는 시간, 정해진 루틴, 익숙한 공간에서 회복이 빠릅니다. 당신의 몰입은 폭발하는 형태가 아니라 잠기는 형태입니다.',
        '주변이 "왜 그렇게 안 움직여?"라고 물어도 신경 쓰지 않아도 됩니다. 당신의 결과는 조용한 데서 나옵니다.'
      ],
      why: [
        '사주에서 안으로 모으는 기운이 밖으로 뻗는 기운보다 뚜렷하게 강합니다.',
        '자극을 늘릴수록 오히려 집중이 흩어지기 쉬운 구조입니다.',
        '조용한 환경에서 회복 속도가 확실히 빨라지는 편입니다.'
      ],
      switches: [
        '방해받지 않는 시간이 확보됐을 때',
        '준비한 게 조용히 결과로 나왔을 때',
        '내 공간이 정리되어 있을 때',
        '오래 해온 것이 손에 익었을 때',
        '가까운 몇 사람에게 이해받았을 때'
      ],
      boredom: [
        { label: '예고 없는 변경', pct: 88 },
        { label: '사람 많은 자리', pct: 80 },
        { label: '의미 없는 반복', pct: 66 },
        { label: '결과가 느린 일', pct: 54 },
        { label: '변화 없는 일상', pct: 42 }
      ],
      focusEnv: [
        { label: '조용한 방', pct: 96 },
        { label: '혼자 집중', pct: 94 },
        { label: '아침', pct: 82 },
        { label: '조용한 음악', pct: 70 },
        { label: '카페', pct: 38 }
      ],
      advice: '당신은 자극을 늘리는 조언과 잘 맞지 않습니다. 오히려 자극을 줄일수록 성과가 올라가는 유형이에요. 하루에 방해받지 않는 90분을 먼저 확보하고, 나머지 일정을 그 뒤에 붙이세요. 새로운 시도는 한 달에 하나면 충분합니다.',
      oneLiners: [
        '오늘은 늘리는 것보다 덜어내는 게 도움이 됩니다.',
        '조용함은 도피가 아니라 당신의 작업 환경입니다.',
        '오늘 약속 하나를 미뤄도 아무 일도 일어나지 않습니다.',
        '지금 느리게 가고 있다면 방향은 맞을 가능성이 높습니다.',
        '오늘은 아무것도 새로 시작하지 않아도 되는 날입니다.'
      ],
      missions: [
        '휴대폰 없이 30분 보내기',
        '방해받지 않는 60분 확보하기',
        '책상 위 한 곳만 정리하기',
        '10분 산책',
        '오늘 하루 SNS 열지 않기',
        '자기 전 세 줄 쓰기'
      ]
    },
    d: {
      headline: '같은 리듬을 지킬 때 가장 강해지는 사람',
      narrative: [
        '당신은 자극이 거의 필요하지 않은 유형입니다. 새로운 게 좋아서라기보다, 필요해서 움직이는 쪽에 가깝죠.',
        '루틴이 잡히면 무섭게 오래 갑니다. 남들이 세 번 갈아탈 시간에 당신은 한 자리에서 계속 깊어져 있습니다.',
        '단점처럼 보이지만, 대부분의 큰 성과는 사실 이 지구력에서 나옵니다. 당신은 늦는 게 아니라 다른 트랙에 있는 겁니다.'
      ],
      why: [
        '사주에서 흐름을 유지하는 기운이 압도적으로 두껍게 잡힙니다.',
        '자극이 커질수록 오히려 리듬이 깨지기 쉬운 구조입니다.',
        '한 자리에서 오래 버틸 때 가장 좋은 결과가 나오는 편입니다.'
      ],
      switches: [
        '오늘도 어제처럼 해냈을 때',
        '오래 해온 일이 손에 붙었을 때',
        '내 자리가 안전하다고 느낄 때',
        '계획대로 하루가 끝났을 때',
        '누군가 조용히 나를 믿어줄 때'
      ],
      boredom: [
        { label: '예고 없는 변경', pct: 92 },
        { label: '기준이 자주 바뀌는 환경', pct: 88 },
        { label: '사람 많은 자리', pct: 74 },
        { label: '의미 없는 반복', pct: 52 },
        { label: '변화 없는 일상', pct: 28 }
      ],
      focusEnv: [
        { label: '조용한 방', pct: 98 },
        { label: '혼자 집중', pct: 96 },
        { label: '아침', pct: 88 },
        { label: '조용한 음악', pct: 62 },
        { label: '카페', pct: 32 }
      ],
      advice: '당신에게 "새로운 걸 시도해보라"는 조언은 대체로 도움이 되지 않습니다. 당신의 성과는 유지에서 나오니까요. 다만 리듬이 한 번 깨지면 회복이 오래 걸리는 편이라, 무너졌을 때 돌아올 최소 루틴 하나를 미리 정해두세요. 그거 하나면 당신은 언제든 원래 자리로 돌아옵니다.',
      oneLiners: [
        '오늘도 어제처럼 해내는 것, 그게 당신의 실력입니다.',
        '새로 시작하지 않아도 되는 날입니다. 하던 걸 계속하세요.',
        '리듬이 흔들렸다면 가장 작은 루틴 하나만 되살리세요.',
        '느린 게 아니라 오래가는 겁니다.',
        '오늘은 지키는 쪽에 힘을 쓰는 게 맞습니다.'
      ],
      missions: [
        '오늘의 루틴 하나를 그대로 지키기',
        '10분 산책',
        '자기 전 세 줄 쓰기',
        '책상 위 한 곳만 정리하기',
        '평소 안 먹던 메뉴 시켜보기',
        '휴대폰 없이 30분 보내기'
      ]
    }
  };

  /* ══════════════════════════════════════════════
     3. 공개 빌더
     ══════════════════════════════════════════════ */

  function buildDopamineResult(input) {
    input = input || {};
    var p = input.p || {};
    var natal = input.natal || {};
    var power = input.power || null;
    var johu = input.johu || null;

    var sig = readSignals(p, natal, power, johu);
    var score = scoreStimulus(sig);
    var band = pickBand(score);
    var content = BAND_CONTENT[band.key];
    var radar = buildRadar(sig);
    var focusFields = buildFocusFields(sig, radar);
    var badges = buildBadges(score, radar, sig);

    var identity = [p.y && p.y.g, p.y && p.y.j, p.m && p.m.g, p.m && p.m.j,
      p.d && p.d.g, p.d && p.d.j, p.h && p.h.g, p.h && p.h.j].join('');
    var daySeed = _dpSeed(identity + '|' + _dpTodayKey());

    /* 신강·신약은 점수가 아니라 말투만 바꾼다 */
    var staminaNote = sig.isStrong
      ? '한 번 불이 붙으면 밀어붙이는 힘도 함께 있어, 시작한 것을 끝까지 끌고 갈 여력이 있는 편입니다.'
      : '자극에는 쉽게 끌리지만 회복이 느린 편이라, 벌여둔 판이 많아지면 금세 지칩니다. 개수 관리가 곧 체력 관리입니다.';

    return {
      score: score,
      grade: band.grade,
      typeName: band.typeName,
      starLine: _dpStars(score),
      headline: content.headline,
      narrative: content.narrative,
      why: content.why,
      staminaNote: staminaNote,
      radar: radar,
      focusFields: focusFields,
      switches: content.switches,
      boredom: content.boredom,
      focusEnv: content.focusEnv,
      advice: content.advice,
      oneLiner: _dpPick(content.oneLiners, daySeed),
      mission: _dpPick(content.missions, Math.floor(daySeed / 7)),
      badges: badges
    };
  }

  /* ══════════════════════════════════════════════
     4. 레이더 SVG
        사주네컷의 _s4cBuildRadarSvg 는 5축 고정·라벨 없음·gradient id 충돌이 있어
        이 카드 전용으로 따로 그린다(그라디언트 id 도 분리).
     ══════════════════════════════════════════════ */

  function _dpRadarSvg(axes) {
    var cx = 110;
    var cy = 104;
    var r = 66;
    var step = (Math.PI * 2) / Math.max(1, axes.length);
    var grid = '';
    var spokes = '';
    var labels = '';
    var shape = [];

    [22, 37, 52, 66].forEach(function (ring) {
      var points = [];
      for (var i = 0; i < axes.length; i += 1) {
        var a = -Math.PI / 2 + i * step;
        points.push((cx + Math.cos(a) * ring).toFixed(1) + ',' + (cy + Math.sin(a) * ring).toFixed(1));
      }
      grid += '<polygon class="dp-radar-ring" points="' + points.join(' ') + '"></polygon>';
    });

    for (var j = 0; j < axes.length; j += 1) {
      var ang = -Math.PI / 2 + j * step;
      var ox = cx + Math.cos(ang) * r;
      var oy = cy + Math.sin(ang) * r;
      spokes += '<line class="dp-radar-spoke" x1="' + cx + '" y1="' + cy + '" x2="' + ox.toFixed(1) + '" y2="' + oy.toFixed(1) + '"></line>';

      var lx = cx + Math.cos(ang) * (r + 22);
      var ly = cy + Math.sin(ang) * (r + 16);
      var anchor = Math.abs(lx - cx) < 6 ? 'middle' : (lx > cx ? 'start' : 'end');
      labels += '<text class="dp-radar-label" x="' + lx.toFixed(1) + '" y="' + (ly + 3).toFixed(1) + '" text-anchor="' + anchor + '">' + _dpEscape(axes[j].label) + '</text>';

      var rr = r * (_dpClamp(axes[j].value, 0, 100) / 100);
      shape.push((cx + Math.cos(ang) * rr).toFixed(1) + ',' + (cy + Math.sin(ang) * rr).toFixed(1));
    }

    return ''
      + '<svg class="dp-radar" viewBox="0 0 220 208" role="img" aria-label="자극 레이더 차트">'
      + '<defs><linearGradient id="dpRadarFill" x1="0" y1="0" x2="1" y2="1">'
      + '<stop offset="0%" stop-color="#e879f9" stop-opacity="0.48"></stop>'
      + '<stop offset="100%" stop-color="#38bdf8" stop-opacity="0.32"></stop>'
      + '</linearGradient></defs>'
      + grid + spokes
      + '<polygon class="dp-radar-shape" points="' + shape.join(' ') + '"></polygon>'
      + labels
      + '</svg>';
  }

  /* ══════════════════════════════════════════════
     5. 렌더
     ══════════════════════════════════════════════ */

  var NEON_CHIPS = ['🎮 게임', '📱 SNS', '🛍️ 쇼핑', '✈️ 여행', '🎧 음악', '🎬 영상', '🍜 야식', '💘 연애', '💡 아이디어', '🏃 도전'];

  var LOADING_STEPS = [
    '사주 흐름을 읽는 중…',
    '활동성과 감각 추구 성향을 맞춰보는 중…',
    '몰입 패턴을 정리하는 중…'
  ];

  var _dpResult = null;

  function _dpPrefersReducedMotion() {
    try {
      return !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (mqErr) {
      return false;
    }
  }

  function _dpIntroHtml() {
    var chips = NEON_CHIPS.map(function (chip, idx) {
      return '<span class="dp-chip" style="--dp-chip-i:' + idx + '">' + _dpEscape(chip) + '</span>';
    }).join('');

    return ''
      + '<div class="dp-wrap dp-wrap--intro">'
      + '  <div class="dp-neon-field" aria-hidden="true">' + chips + '</div>'
      + '  <div class="dp-intro">'
      + '    <span class="dp-kicker">✦ 자극 추구 성향 리포트</span>'
      + '    <h4 class="dp-intro-title">당신은 새로운 자극을 쫓는 사람일까요,<br>아니면 안정감을 더 사랑하는 사람일까요?</h4>'
      + '    <p class="dp-intro-sub">중독을 진단하는 기능이 아닙니다. 사주 흐름으로 당신이 어디에서 에너지를 얻고, 어디에서 금세 지치는지를 읽어드립니다.</p>'
      + '    <button type="button" class="dp-btn dp-btn--start" data-dp-start="1" aria-label="도파민 성향 분석 시작">🧠 분석 시작</button>'
      + '  </div>'
      + '</div>';
  }

  function _dpLoadingHtml() {
    return ''
      + '<div class="dp-wrap dp-wrap--loading">'
      + '  <div class="dp-loading">'
      + '    <p class="dp-loading-step" data-dp-step>' + _dpEscape(LOADING_STEPS[0]) + '</p>'
      + '    <div class="dp-progress" role="progressbar" aria-label="분석 진행률"><span class="dp-progress-bar" data-dp-bar></span></div>'
      + '    <p class="dp-loading-hint">자극을 즐기는 타입인지, 안정을 더 좋아하는 타입인지 맞춰보는 중입니다.</p>'
      + '  </div>'
      + '</div>';
  }

  function _dpBarRows(rows, extraClass) {
    return rows.map(function (row) {
      var pct = _dpClamp(row.pct, 0, 100);
      return ''
        + '<li class="dp-bar-row' + (extraClass ? ' ' + extraClass : '') + '">'
        + '  <span class="dp-bar-name">' + _dpEscape(row.label) + '</span>'
        + '  <span class="dp-bar-track"><span class="dp-bar-fill" style="width:' + pct + '%"></span></span>'
        + '  <span class="dp-bar-value">' + pct + '</span>'
        + '</li>';
    }).join('');
  }

  function _dpStarRows(rows) {
    return rows.map(function (row) {
      return ''
        + '<li class="dp-star-row">'
        + '  <span class="dp-star-name">' + _dpEscape(row.label) + '</span>'
        + '  <span class="dp-star-mark" aria-label="' + _dpClamp(Math.ceil(row.pct / 20), 1, 5) + '점 만점 5점">' + _dpStars(row.pct) + '</span>'
        + '</li>';
    }).join('');
  }

  function _dpResultHtml(result) {
    var radarLegend = result.radar.map(function (row) {
      return '<li class="dp-legend-row"><span>' + _dpEscape(row.label) + '</span><b>' + row.value + '</b></li>';
    }).join('');

    var badges = result.badges.map(function (badge) {
      return '<li class="dp-badge"><span class="dp-badge-icon" aria-hidden="true">' + _dpEscape(badge.icon) + '</span>'
        + '<b>' + _dpEscape(badge.name) + '</b><small>' + _dpEscape(badge.desc) + '</small></li>';
    }).join('');

    return ''
      + '<div class="dp-wrap dp-wrap--result">'
      + '  <div class="dp-neon-field dp-neon-field--dim" aria-hidden="true">'
      + NEON_CHIPS.map(function (chip, idx) { return '<span class="dp-chip" style="--dp-chip-i:' + idx + '">' + _dpEscape(chip) + '</span>'; }).join('')
      + '  </div>'

      /* ── 점수 카드(공유 캡처 영역) ── */
      + '  <div class="dp-score-card" data-dp-capture="1">'
      + '    <div class="dp-score-head"><span class="dp-brand">CODE DESTINY</span><span class="dp-score-tag">자극 추구 성향</span></div>'
      + '    <p class="dp-score-label">당신의 자극 추구 성향</p>'
      + '    <p class="dp-score-stars" aria-hidden="true">' + _dpEscape(result.starLine) + '</p>'
      + '    <p class="dp-score-value"><b>' + result.score + '</b><span>점</span></p>'
      + '    <p class="dp-score-type"><span class="dp-grade">' + _dpEscape(result.grade) + '</span> ' + _dpEscape(result.typeName) + '</p>'
      + '    <p class="dp-score-headline">' + _dpEscape(result.headline) + '</p>'
      + '  </div>'

      /* ── 성향 설명 ── */
      + '  <section class="dp-sec">'
      + '    <h5 class="dp-sec-title">AI가 보는 당신</h5>'
      + result.narrative.map(function (para) { return '<p class="dp-para">' + _dpEscape(para) + '</p>'; }).join('')
      + '    <p class="dp-para dp-para--note">' + _dpEscape(result.staminaNote) + '</p>'
      + '  </section>'

      /* ── 왜 이런 결과가 나왔나 (계산식 비노출) ── */
      + '  <section class="dp-sec dp-sec--why">'
      + '    <h5 class="dp-sec-title">왜 이런 결과가 나왔을까요?</h5>'
      + '    <ul class="dp-why-list">'
      + result.why.map(function (line) { return '<li>' + _dpEscape(line) + '</li>'; }).join('')
      + '    </ul>'
      + '  </section>'

      /* ── 자극 레이더 ── */
      + '  <section class="dp-sec">'
      + '    <h5 class="dp-sec-title">자극 레이더</h5>'
      + '    <div class="dp-radar-wrap">' + _dpRadarSvg(result.radar) + '<ul class="dp-legend">' + radarLegend + '</ul></div>'
      + '  </section>'

      /* ── 몰입 분야 ── */
      + '  <section class="dp-sec">'
      + '    <h5 class="dp-sec-title">무엇에 가장 몰입하나요?</h5>'
      + '    <ul class="dp-star-list">' + _dpStarRows(result.focusFields) + '</ul>'
      + '  </section>'

      /* ── 행복 스위치 ── */
      + '  <section class="dp-sec">'
      + '    <h5 class="dp-sec-title">행복 스위치</h5>'
      + '    <p class="dp-sec-sub">동기부여가 가장 강해지는 순간</p>'
      + '    <ul class="dp-check-list">'
      + result.switches.map(function (line) { return '<li>' + _dpEscape(line) + '</li>'; }).join('')
      + '    </ul>'
      + '  </section>'

      /* ── 흥미 저하 ── */
      + '  <section class="dp-sec">'
      + '    <h5 class="dp-sec-title">쉽게 흥미가 떨어지는 상황</h5>'
      + '    <ul class="dp-bar-list">' + _dpBarRows(result.boredom, 'is-warn') + '</ul>'
      + '  </section>'

      /* ── 집중 환경 ── */
      + '  <section class="dp-sec">'
      + '    <h5 class="dp-sec-title">집중력이 높아지는 환경</h5>'
      + '    <ul class="dp-bar-list">' + _dpBarRows(result.focusEnv, 'is-focus') + '</ul>'
      + '  </section>'

      /* ── 맞춤 조언 ── */
      + '  <section class="dp-sec dp-sec--advice">'
      + '    <h5 class="dp-sec-title">맞춤 조언</h5>'
      + '    <p class="dp-para">' + _dpEscape(result.advice) + '</p>'
      + '  </section>'

      /* ── 오늘의 한 줄 / 미션 ── */
      + '  <div class="dp-today-row">'
      + '    <div class="dp-today"><span class="dp-today-tag">오늘의 한 줄</span><p>' + _dpEscape(result.oneLiner) + '</p></div>'
      + '    <div class="dp-today dp-today--mission"><span class="dp-today-tag">오늘의 미션</span><p>' + _dpEscape(result.mission) + '</p></div>'
      + '  </div>'

      /* ── 배지 ── */
      + '  <section class="dp-sec">'
      + '    <h5 class="dp-sec-title">획득한 배지</h5>'
      + '    <ul class="dp-badge-list">' + badges + '</ul>'
      + '  </section>'

      /* ── 액션 ── */
      + '  <div class="dp-actions">'
      + '    <button type="button" class="dp-btn" data-dp-save="1" aria-label="결과 카드 이미지로 저장">결과 카드 저장</button>'
      + '    <button type="button" class="dp-btn dp-btn--share" data-dp-share="1" aria-label="결과 공유 문구 보내기">공유 문구 보내기</button>'
      + '  </div>'
      + '</div>';
  }

  function _dpRunAnalysis(host) {
    if (!_dpResult) return;

    if (_dpPrefersReducedMotion()) {
      host.innerHTML = _dpResultHtml(_dpResult);
      return;
    }

    host.innerHTML = _dpLoadingHtml();
    var stepEl = host.querySelector('[data-dp-step]');
    var barEl = host.querySelector('[data-dp-bar]');
    var step = 0;

    if (barEl) {
      /* 초기 상태가 반영된 뒤에 올려야 트랜지션이 실제로 걸린다 */
      w.setTimeout(function () { barEl.classList.add('is-full'); }, 30);
    }

    var timer = w.setInterval(function () {
      step += 1;
      if (step >= LOADING_STEPS.length) {
        w.clearInterval(timer);
        host.innerHTML = _dpResultHtml(_dpResult);
        return;
      }
      if (stepEl) stepEl.textContent = LOADING_STEPS[step];
    }, 620);
  }

  function _dpShareText(result) {
    return [
      '🧠 나는 도파민 중독일까?',
      '',
      '내 자극 추구 성향 ' + result.score + '점 · ' + result.grade + ' ' + result.typeName,
      result.headline,
      '',
      '오늘의 한 줄 — ' + result.oneLiner,
      '',
      '#코드데스티니 #사주 #도파민중독테스트',
      w.location.href
    ].join('\n');
  }

  function bindDopamineHost(host) {
    if (!host || host.__dpBound) return;
    host.__dpBound = true;

    host.addEventListener('click', function (event) {
      var target = event.target && event.target.closest ? event.target.closest('button') : null;
      if (!target || !host.contains(target)) return;

      if (target.hasAttribute('data-dp-start')) {
        _dpRunAnalysis(host);
        return;
      }

      if (target.hasAttribute('data-dp-save')) {
        var capture = host.querySelector('[data-dp-capture]');
        if (!capture || typeof w._s4cEnsureCanvasLib !== 'function') return;
        w._s4cEnsureCanvasLib().then(function (html2canvas) {
          return html2canvas(capture, {
            scale: Math.max(2, Math.min(3, w.devicePixelRatio || 2)),
            useCORS: true,
            backgroundColor: null,
            logging: false
          });
        }).then(function (canvas) {
          var link = document.createElement('a');
          link.download = 'dopamine-' + _dpResult.score + '.png';
          link.href = canvas.toDataURL('image/png');
          link.click();
        }).catch(function (err) {
          console.error('[Dopamine] 이미지 저장 실패:', err);
          alert('이미지 저장 중 오류가 났어요. 잠시 후 다시 눌러주세요.');
        });
        return;
      }

      if (target.hasAttribute('data-dp-share')) {
        var text = _dpShareText(_dpResult);
        if (navigator.share) {
          navigator.share({ title: '나는 도파민 중독일까?', text: text, url: w.location.href }).catch(function () {});
          return;
        }
        var anchor = document.createElement('a');
        anchor.href = 'kakaotalk://send?text=' + encodeURIComponent(text);
        anchor.click();
        w.setTimeout(function () {
          if (typeof w.copyToClipboard === 'function') {
            w.copyToClipboard(text, '카카오톡 앱이 없거나 PC라서 문구를 복사했어요. 붙여넣기 하면 끝!');
          }
        }, 220);
      }
    });
  }

  function renderDopamineReport(p, natal, power, johu) {
    var host = document.getElementById('dopamineResult');
    if (!host || !p || !p.d || !p.d.g) return;

    _dpResult = buildDopamineResult({ p: p, natal: natal, power: power, johu: johu });
    host.innerHTML = _dpIntroHtml();
    bindDopamineHost(host);
  }

  w.buildDopamineResult = buildDopamineResult;
  w.renderDopamineReport = renderDopamineReport;
})(window);
