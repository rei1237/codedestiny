/* ═══════════════════════════════════════════════════════════
   entertain-engine.js  — CodeDestiny Entertain Engine v2
   네임스페이스: CodeDestiny_Entertain

   기능 1: 명리 헬스 리포트 (다크 네온 완전 리뉴얼)
   기능 2: RPG 캐릭터 일일 퀘스트 (localStorage EXP 시스템)
   기능 3: 테토-에겐 심화 분석 (양자 합화 기반 숨겨진 본성)

   작동 원리: saju-engine.js 이후에 로드되어
             renderHealthReport, renderSkillTree, renderHormoneVibe
             세 함수를 오버라이드(교체/확장) 합니다.
   ═══════════════════════════════════════════════════════════ */

(function (w) {
  'use strict';

  /* ════════════════════════════════════════════════════════
     §0  유틸리티 함수
     ════════════════════════════════════════════════════════ */

  // 시드 기반 피셔-예이츠 셔플
  function seededShuffle(arr, seed) {
    var a = arr.slice(), m = a.length, t, i, s = seed;
    while (m) {
      i = Math.floor(Math.abs(Math.sin(s++)) * m--);
      t = a[m]; a[m] = a[i]; a[i] = t;
    }
    return a;
  }

  // 오늘 날짜 문자열 (YYYY-M-D)
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  // 시드 계산 (사용자 이름 + 날짜 + 추가 문자열)
  function getSeed(extra) {
    var k = todayKey() + (extra || '') + (w.USER_NAME || '');
    var s = 0;
    for (var i = 0; i < k.length; i++) s += k.charCodeAt(i);
    return s;
  }


  /* ════════════════════════════════════════════════════════
     §1  QuantumMyeongriEngine — 합(合) 확장 계산
         삼합(三合) · 방합(方合) · 육합(六合) · 천간합(天干合)
     ════════════════════════════════════════════════════════ */

  // 삼합 (지지 세 자리가 모이면 특정 오행이 기화)
  var SAMHAP = {
    water: ['申', '子', '辰'],
    fire:  ['寅', '午', '戌'],
    wood:  ['亥', '卯', '未'],
    metal: ['巳', '酉', '丑']
  };

  // 방합 (같은 계절 지지가 모이는 방국)
  var BANGHAP = {
    wood:  ['寅', '卯', '辰'],
    fire:  ['巳', '午', '未'],
    metal: ['申', '酉', '戌'],
    water: ['亥', '子', '丑']
  };

  // 육합 (지지 두 자리 합화 쌍)
  var YUKHAP = [
    { pair: ['子', '丑'], result: 'earth' },
    { pair: ['寅', '亥'], result: 'wood'  },
    { pair: ['卯', '戌'], result: 'fire'  },
    { pair: ['辰', '酉'], result: 'metal' },
    { pair: ['巳', '申'], result: 'water' },
    { pair: ['午', '未'], result: 'fire'  }
  ];

  // 지지충 (충돌 스트레스) — 해당 오행의 안정성을 저하시킴
  var ZHI_CHUNG = [
    { pair: ['子', '午'], impacts: { water: 1.4, fire: 1.4 }, label: '子午' },
    { pair: ['丑', '未'], impacts: { earth: 1.6 },              label: '丑未' },
    { pair: ['寅', '申'], impacts: { wood: 1.2, metal: 1.2 },   label: '寅申' },
    { pair: ['卯', '酉'], impacts: { wood: 1.2, metal: 1.2 },   label: '卯酉' },
    { pair: ['辰', '戌'], impacts: { earth: 1.7 },              label: '辰戌' },
    { pair: ['巳', '亥'], impacts: { fire: 1.2, water: 1.2 },   label: '巳亥' }
  ];

  // 천간합 파트너
  var GANHE = {
    '甲': '己', '己': '甲',
    '乙': '庚', '庚': '乙',
    '丙': '辛', '辛': '丙',
    '丁': '壬', '壬': '丁',
    '戊': '癸', '癸': '戊'
  };
  // 천간합 결과 오행
  var GANHE_RES = {
    '甲': 'earth',  '己': 'earth',
    '乙': 'metal',  '庚': 'metal',
    '丙': 'water',  '辛': 'water',
    '丁': 'wood',   '壬': 'wood',
    '戊': 'fire',   '癸': 'fire'
  };

  function calcQuantumHap(p) {
    var zhis = [p.y.j, p.m.j, p.d.j, p.h.j];
    var gans = [p.y.g, p.m.g, p.d.g, p.h.g];
    var results = [];
    var dominated = {}; // 합화 결과 오행별 부스트 합산
    var clashResults = [];
    var clashLoad = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };

    // ── 삼합 / 반합 검사
    for (var el in SAMHAP) {
      var set = SAMHAP[el];
      var found = set.filter(function (z) { return zhis.indexOf(z) >= 0; });
      if (found.length >= 3) {
        results.push({ type: '삼합(三合)', resultEl: el, boost: 2.5, label: set.join(' ') });
        dominated[el] = (dominated[el] || 0) + 2.5;
      } else if (found.length === 2) {
        results.push({ type: '반합(半合)', resultEl: el, boost: 1.3, label: found.join(' ') });
        dominated[el] = (dominated[el] || 0) + 1.3;
      }
    }

    // ── 방합 검사
    for (var el2 in BANGHAP) {
      var set2 = BANGHAP[el2];
      var found2 = set2.filter(function (z) { return zhis.indexOf(z) >= 0; });
      if (found2.length >= 3) {
        results.push({ type: '방합(方合)', resultEl: el2, boost: 2.0, label: set2.join(' ') });
        dominated[el2] = (dominated[el2] || 0) + 2.0;
      }
    }

    // ── 육합 검사
    YUKHAP.forEach(function (pair) {
      var both = pair.pair.filter(function (z) { return zhis.indexOf(z) >= 0; });
      if (both.length === 2) {
        results.push({ type: '육합(六合)', resultEl: pair.result, boost: 1.6, label: pair.pair.join(' · ') });
        dominated[pair.result] = (dominated[pair.result] || 0) + 1.6;
      }
    });

    // ── 천간합 검사
    for (var i = 0; i < gans.length; i++) {
      for (var j = i + 1; j < gans.length; j++) {
        if (GANHE[gans[i]] === gans[j]) {
          var res = GANHE_RES[gans[i]];
          results.push({ type: '천간합(天干合)', resultEl: res, boost: 1.4, label: gans[i] + ' · ' + gans[j] });
          dominated[res] = (dominated[res] || 0) + 1.4;
        }
      }
    }

    // ── 지지충 검사
    ZHI_CHUNG.forEach(function (rule) {
      var both = rule.pair.filter(function (z) { return zhis.indexOf(z) >= 0; });
      if (both.length === 2) {
        clashResults.push({ type: '지지충(地支沖)', label: rule.label, impacts: rule.impacts });
        for (var elc in rule.impacts) {
          clashLoad[elc] = (clashLoad[elc] || 0) + rule.impacts[elc];
        }
      }
    });

    // 최대 합화 오행 추출
    var topEl = null, topBoost = 0;
    for (var k in dominated) {
      if (dominated[k] > topBoost) { topBoost = dominated[k]; topEl = k; }
    }

    return {
      hapResults: results,
      dominated: dominated,
      clashResults: clashResults,
      clashLoad: clashLoad,
      topEl: topEl,
      topBoost: topBoost
    };
  }


  /* ════════════════════════════════════════════════════════
     §2  명리 헬스 리포트 — 다크 네온 테마 완전 리뉴얼
     ════════════════════════════════════════════════════════ */

  // 오행별 UI 상수
  var EL_NEON   = { wood: '#4ade80', fire: '#f87171', earth: '#fbbf24', metal: '#e2e8f0', water: '#60a5fa' };
  var EL_ICON   = { wood: '🌿', fire: '🔥', earth: '⛰️', metal: '⚔️', water: '💧' };
  var EL_NAME   = { wood: '목(木)', fire: '화(火)', earth: '토(土)', metal: '금(金)', water: '수(水)' };
  var EL_ORGAN  = { wood: '간·담', fire: '심장·소장', earth: '비·위', metal: '폐·대장', water: '신장·방광' };
  var EL_MENTAL_NOTE = {
    wood:  '목 기운 부족 → 억압된 감정이 분노나 우울로 발현될 수 있습니다. 표현하는 연습이 필요합니다.',
    fire:  '화 기운 과잉 → 과도한 흥분과 불안이 번아웃을 만들 수 있습니다. 냉각이 필요합니다.',
    earth: '토 기운 정체 → 걱정·반추 사고가 집중력을 갉아먹습니다. 단순화 연습을 권합니다.',
    metal: '금 기운 예리 → 완벽주의와 슬픔이 에너지를 고갈시킵니다. 적당히의 기술이 필요합니다.',
    water: '수 기운 결핍 → 두려움과 무기력이 의지를 약화시킵니다. 소소한 성취 루틴이 특효약입니다.'
  };

  // 십성 기반 멘탈 케어 처방
  var TEN_GOD_MENTAL = {
    '비견': { advice: '독립 과잉 → 고독감 주의. 혼자 모든 것을 해결하려는 습관이 번아웃을 만든다.', rx: '오늘 진심을 나눌 수 있는 친구 한 명에게 연락해보세요.' },
    '겁재': { advice: '경쟁욕 과부하 → 내면의 불안 경계. 남과 비교가 습관이 되면 자존감이 흔들린다.', rx: '오늘 비교 대상 없는 나만의 성취 하나를 기록해보세요.' },
    '식신': { advice: '감각 과잉 → 소진 주의. 먹고 즐기고 누리는 것이 과해지면 본질을 잃는다.', rx: '디지털 디톡스 30분이 지친 뇌를 리셋시켜 줍니다.' },
    '상관': { advice: '표현욕 폭발 → 관계 갈등 주의. 하고 싶은 말을 다 하면 뒷감당이 힘들 수 있다.', rx: '일기에 쏟아내고 실제로는 3초 숨고르기 후에 말하는 연습을 해보세요.' },
    '편재': { advice: '자극 추구 → 집중력 저하. 새로운 것을 끊임없이 좇다 보면 정착이 힘들어진다.', rx: '오늘 딱 하나만 완성하는 모노태스킹을 시도해보세요.' },
    '정재': { advice: '안정 집착 → 기회 회피. 너무 안정성만 따지다 보면 성장이 멈춘다.', rx: '작은 불확실성을 감수하는 용기가 오늘의 과제입니다.' },
    '편관': { advice: '스트레스 과잉 → 신체 각성 상태. 압박을 즐긴다고 느끼지만 몸은 이미 비상 모드다.', rx: '4-7-8 심호흡 기법으로 교감신경을 달래주세요. (4초 흡입, 7초 정지, 8초 날숨)' },
    '정관': { advice: '규칙 집착 → 경직된 사고. 완벽히 옳아야 한다는 압박이 창의성을 막는다.', rx: '오늘만큼은 "틀려도 괜찮아"를 입버릇처럼 반복해보세요.' },
    '편인': { advice: '고독 과잉 → 고립 주의. 나만의 세계에 갇히면 현실 감각이 흐려진다.', rx: '오늘 하루 5분이라도 바깥 세상과 연결되는 시간을 가져보세요.' },
    '정인': { advice: '과보호 수용 → 의존성 주의. 받기만 익숙해지면 자생력이 떨어진다.', rx: '혼자 결정하고 혼자 책임지는 연습이 성장의 연료입니다.' }
  };

  // 타임라인 건강 예보 텍스트
  var TIMELINE_TEXT = {
    wood:  { today: '목(木) 기운이 시신경과 근육에 영향을 줍니다. 눈의 피로감과 뒷목 긴장을 확인하세요.', month: '이달 목 기운의 흐름이 간 기능에 영향을 줍니다. 음주·지방간·눈 건강에 주의하세요.', year: '올해 목 기운이 근골격계에 누적 영향을 줄 수 있습니다. 스트레칭 루틴이 필수입니다.' },
    fire:  { today: '화기(火氣)가 심박수를 올립니다. 과로와 흥분 상태를 피하고 냉각이 필요합니다.', month: '이달 화 기운이 혈압·불면에 영향을 줄 수 있습니다. 취침 전 루틴을 만드세요.', year: '올해 화기 파동이 심혈관계를 자극합니다. 정기 혈압 검진을 권합니다.' },
    earth: { today: '토기(土氣) 정체가 소화계를 둔하게 만듭니다. 과식·야식·밀가루를 피하세요.', month: '이달 습토(濕土) 기운이 비위에 영향을 줍니다. 단백질 중심 식단과 걷기를 권합니다.', year: '올해 토 기운의 누적으로 체중 관리와 혈당에 신경 쓸 필요가 있습니다.' },
    metal: { today: '금기(金氣)가 호흡기를 건드립니다. 미세먼지와 건조한 공기에 주의하고 보습해주세요.', month: '이달 금 기운이 폐·피부·대장에 영향을 줄 수 있습니다. 환기와 수분 섭취가 중요합니다.', year: '올해 금 기운이 대장 건강에 영향을 줄 수 있습니다. 식이섬유 섭취를 늘려보세요.' },
    water: { today: '수기(水氣) 부족으로 신장·방광이 피로합니다. 충분한 수분(2L 이상)을 보충하세요.', month: '이달 수 기운이 냉증·부종·허리 통증을 유발할 수 있습니다. 온열 케어가 도움이 됩니다.', year: '올해 수기 파동이 내분비·호르몬계에 영향을 줄 수 있습니다. 스트레스 관리가 핵심입니다.' }
  };

  // 오행 임상형 분석 데이터 (전문 처방 문체)
  var EL_CLINICAL_DB = {
    wood: {
      strength: '간담 해독 축과 근막·인대 회복력이 비교적 우수한 체질입니다.',
      deficientSymptoms: '눈 건조, 안구 피로, 근육 뻣뻣함, 새벽 각성, 감정 억눌림 패턴이 나타날 수 있습니다.',
      excessSymptoms: '편두통, 목·어깨 과긴장, 예민성 상승, 혈압 변동성이 증가할 수 있습니다.',
      dietDef: '짙은 녹색 채소·오메가3·충분한 수분으로 간 대사를 보조하세요.',
      dietEx: '자극적인 술·야식·카페인 과다를 줄여 간열(肝熱) 과흥분을 진정시키세요.',
      exerciseDef: '저강도 유산소 + 고관절·흉곽 가동성 스트레칭을 매일 15분.',
      exerciseEx: '고강도 운동 빈도를 줄이고 호흡 교정·이완성 운동 비중을 늘리세요.',
      lifeDef: '밤 11시 이전 수면 루틴으로 간 회복 시간을 확보하세요.',
      lifeEx: '경쟁 자극이 높은 환경에서 휴식 타임블록을 의도적으로 배치하세요.',
      monitor: '피로 누적 시 간수치(AST/ALT), 혈압, 수면의 질을 주기적으로 관찰하세요.'
    },
    fire: {
      strength: '심혈관 반응성과 대사 점화력이 좋아 추진력·활력 회복이 빠른 편입니다.',
      deficientSymptoms: '무기력, 저체온감, 순환 저하, 집중력 저하, 우울한 정서가 동반될 수 있습니다.',
      excessSymptoms: '심박 상승, 불면, 초조, 안면 홍조, 염증성 반응이 잦아질 수 있습니다.',
      dietDef: '따뜻한 단백질 식사(계란·살코기·생강)로 순환 점화를 도우세요.',
      dietEx: '매운 음식·알코올·당분 과다를 줄이고 냉각 식품(수분 과일, 채소)을 보강하세요.',
      exerciseDef: '아침 햇빛 노출 + 중강도 인터벌로 순환 리듬을 깨우세요.',
      exerciseEx: '취침 전 격렬 운동을 피하고 심박 안정형 운동(걷기·요가) 위주로 조정하세요.',
      lifeDef: '기상·식사·수면 시간을 고정해 자율신경 리듬을 재정렬하세요.',
      lifeEx: '카페인 커트오프(오후 2시 이전)와 디지털 야간 차단이 필요합니다.',
      monitor: '안정시 심박수, 수면 잠복기, 심계항진 빈도를 기록해 추적하세요.'
    },
    earth: {
      strength: '비위(소화) 축의 흡수력과 체력 유지력이 좋아 회복 기반이 탄탄한 체질입니다.',
      deficientSymptoms: '복부 팽만, 소화 지연, 식후 졸림, 만성 피로, 무거운 부종이 생길 수 있습니다.',
      excessSymptoms: '체중 정체·증가, 점액성 염증, 대사 둔화, 당 조절 불안정이 나타날 수 있습니다.',
      dietDef: '소화가 쉬운 단백질·따뜻한 곡물·발효식품으로 위장 기능을 복구하세요.',
      dietEx: '정제 탄수·야식·과식 빈도를 줄이고 식사량 분할 전략을 적용하세요.',
      exerciseDef: '식후 15분 걷기와 코어 안정화 운동으로 순환을 돕습니다.',
      exerciseEx: '장시간 좌식을 피하고 하루 총 보행량(7~9천 보)을 확보하세요.',
      lifeDef: '규칙적인 식사 시각과 수면 루틴이 최우선 처방입니다.',
      lifeEx: '감정성 섭식 트리거를 기록해 저녁 과식 패턴을 차단하세요.',
      monitor: '체중, 허리둘레, 공복 혈당, 식후 졸림 강도를 주 1회 기록하세요.'
    },
    metal: {
      strength: '폐·피부 방어 축과 판단 집중력이 좋아 회복 프로토콜 준수율이 높은 체질입니다.',
      deficientSymptoms: '피부 건조, 호흡 얕음, 변비 경향, 슬럼프 시 면역 저하가 동반될 수 있습니다.',
      excessSymptoms: '호흡 과긴장, 어깨·흉곽 경직, 완벽주의성 스트레스 반응이 커질 수 있습니다.',
      dietDef: '수분·식이섬유·적정 지방을 늘려 호흡기·대장 축을 안정시키세요.',
      dietEx: '건조·짜고 자극적인 음식 비중을 낮추고 수분 많은 식단으로 균형을 맞추세요.',
      exerciseDef: '복식호흡 + 흉곽 가동 운동으로 산소 교환 효율을 높이세요.',
      exerciseEx: '강박적 운동 스케줄 대신 회복일과 스트레칭 비중을 의도적으로 포함하세요.',
      lifeDef: '실내 습도 관리(40~60%)와 수면 전 호흡 훈련을 루틴화하세요.',
      lifeEx: '결과 통제 욕구를 줄이고 완료 기준을 80%로 설정하는 훈련이 필요합니다.',
      monitor: '호흡 깊이, 피부 상태, 배변 리듬, 스트레스 점수를 추적하세요.'
    },
    water: {
      strength: '신장·내분비 축과 회복 보존력이 좋아 장기전에서 버티는 체질적 장점이 있습니다.',
      deficientSymptoms: '냉감, 요통, 부종, 만성 피로, 집중력 저하, 불안 민감성이 증가할 수 있습니다.',
      excessSymptoms: '무기력, 우울감, 활동 저하, 체액 정체형 피로가 심해질 수 있습니다.',
      dietDef: '온열성 단백질·미네랄·수분 보충으로 신장 축 회복을 지원하세요.',
      dietEx: '과도한 염분·야간 수분 폭식을 줄이고 낮 시간 균등 수분 섭취로 전환하세요.',
      exerciseDef: '허리·둔근 강화 + 저충격 유산소로 순환과 체온을 올리세요.',
      exerciseEx: '완전 비활동 상태를 피하고 짧고 잦은 움직임(NEAT)으로 대사를 유지하세요.',
      lifeDef: '수면 시간 확보와 보온(복부·요부) 관리가 1차 처방입니다.',
      lifeEx: '고립 시간이 길어지지 않도록 외부 활동 스케줄을 고정하세요.',
      monitor: '체온, 부종, 요통 강도, 기상 피로감을 주간 단위로 관찰하세요.'
    }
  };

  function toNum(v, fallback) {
    var n = Number(v);
    return isFinite(n) ? n : fallback;
  }

  function computeQuantumHealthScore(p, natal) {
    var ratios = (natal && natal.ratios) || {};
    var els = ['wood', 'fire', 'earth', 'metal', 'water'];
    var q = calcQuantumHap(p);
    var metrics = {};

    els.forEach(function (el) {
      var base = toNum(ratios[el], 20);
      var hapBoost = toNum((q.dominated || {})[el], 0) * 4.8;
      var clashPenalty = toNum((q.clashLoad || {})[el], 0) * 5.6;
      var effective = base + hapBoost - clashPenalty;

      var deficiencyPenalty = effective < 13 ? (13 - effective) * 2.0 : 0;
      var excessPenalty = effective > 31 ? (effective - 31) * 2.0 : 0;
      var imbalancePenalty = Math.abs(effective - 20) * 0.28;
      var risk = deficiencyPenalty + excessPenalty + (clashPenalty * 0.9) + imbalancePenalty;

      var status = 'balanced';
      if (excessPenalty > deficiencyPenalty && excessPenalty > 0) status = 'excess';
      else if (deficiencyPenalty > 0) status = 'deficient';

      metrics[el] = {
        base: Math.round(base * 10) / 10,
        hapBoost: Math.round(hapBoost * 10) / 10,
        clashPenalty: Math.round(clashPenalty * 10) / 10,
        effective: Math.round(effective * 10) / 10,
        risk: Math.round(risk * 10) / 10,
        status: status
      };
    });

    var sortedRiskDesc = els.slice().sort(function (a, b) { return metrics[b].risk - metrics[a].risk; });
    var worstEl = sortedRiskDesc[0];

    var balancedCandidates = els.filter(function (el) { return metrics[el].status === 'balanced'; })
      .sort(function (a, b) { return metrics[a].risk - metrics[b].risk; });
    var bestEl = balancedCandidates.length ? balancedCandidates[0] : els.slice().sort(function (a, b) { return metrics[a].risk - metrics[b].risk; })[0];

    return {
      metrics: metrics,
      worstEl: worstEl,
      bestEl: bestEl,
      quantum: q
    };
  }

  function getRiskGrade(risk) {
    if (risk >= 18) return { t: '고위험', c: '#f87171' };
    if (risk >= 12) return { t: '주의', c: '#fbbf24' };
    if (risk >= 7) return { t: '관찰', c: '#60a5fa' };
    return { t: '안정', c: '#4ade80' };
  }

  function buildQuantumClinicalTopReport(p, natal, johu) {
    var sc = computeQuantumHealthScore(p, natal);
    var worstEl = sc.worstEl;
    var bestEl = sc.bestEl;
    var wm = sc.metrics[worstEl];
    var bm = sc.metrics[bestEl];
    var wProf = EL_CLINICAL_DB[worstEl] || EL_CLINICAL_DB.earth;
    var bProf = EL_CLINICAL_DB[bestEl] || EL_CLINICAL_DB.earth;
    var wGrade = getRiskGrade(wm.risk);

    var weaknessType = wm.status === 'excess' ? '과다형 취약' : (wm.status === 'deficient' ? '결핍형 취약' : '불안정형 취약');
    var weaknessReason = wm.status === 'excess'
      ? (wProf.excessSymptoms + ' → 과다도 기능 저하로 간주합니다.')
      : (wm.status === 'deficient' ? wProf.deficientSymptoms : '절대 수치가 정상 범위라도 합/충 스트레스가 높아 기능 변동성이 큽니다.');

    var dietRx = wm.status === 'excess' ? wProf.dietEx : wProf.dietDef;
    var exRx = wm.status === 'excess' ? wProf.exerciseEx : wProf.exerciseDef;
    var lifeRx = wm.status === 'excess' ? wProf.lifeEx : wProf.lifeDef;

    var johuComment = '조후는 중화 상태로 판정됩니다.';
    if (johu && (johu.type === 'hot' || johu.type === 'warm')) johuComment = '조열(燥熱) 경향이 있어 화·목 과열 관리 및 수·금 보완이 중요합니다.';
    else if (johu && (johu.type === 'cold' || johu.type === 'cool')) johuComment = '한습(寒濕) 경향이 있어 수·금 정체 관리 및 화·목 활성화가 중요합니다.';

    var hapBadges = (sc.quantum.hapResults || []).slice(0, 4).map(function (h) {
      var col = EL_NEON[h.resultEl] || '#c9a84c';
      return '<span style="display:inline-block; margin:2px 4px 2px 0; padding:3px 8px; border-radius:20px; font-size:.68rem; color:' + col + '; border:1px solid ' + col + '55;">'
        + h.type + ' ' + h.label + ' → ' + EL_NAME[h.resultEl] + '</span>';
    }).join('') || '<span style="font-size:.72rem;color:rgba(255,255,255,.45)">뚜렷한 합 작용은 약한 편입니다.</span>';

    var clashBadges = (sc.quantum.clashResults || []).slice(0, 4).map(function (h) {
      return '<span style="display:inline-block; margin:2px 4px 2px 0; padding:3px 8px; border-radius:20px; font-size:.68rem; color:#f87171; border:1px solid rgba(248,113,113,.45);">'
        + h.type + ' ' + h.label + '</span>';
    }).join('') || '<span style="font-size:.72rem;color:rgba(255,255,255,.45)">임상적 의미의 충 스트레스는 경미한 편입니다.</span>';

    return '<div id="entQuantumClinicalReport" class="ent-reveal" style="margin:0 0 14px; border-radius:12px; border:1px solid rgba(201,168,76,.32); background:linear-gradient(145deg, rgba(6,10,20,.95), rgba(10,15,30,.92)); padding:14px 14px 12px; box-shadow:0 0 24px rgba(0,0,0,.22);">'
      + '<div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px;">'
      +   '<div style="font-size:.76rem; font-weight:900; letter-spacing:1px; color:#c9a84c;">🧬 선천 체질 정밀 판독 (Quantum Clinical)</div>'
      +   '<div style="font-size:.68rem; color:rgba(255,255,255,.5);">과다도 취약으로 판정</div>'
      + '</div>'
      + '<div style="font-size:.83rem; line-height:1.65; color:rgba(255,255,255,.86); margin-bottom:10px;">'
      +   '<b>' + (w.USER_NAME || '당신') + '</b>님의 사주 원국 오행과 합·충 재배열 데이터를 통합 판독한 결과, <b style="color:' + (EL_NEON[worstEl] || '#f87171') + '">' + EL_NAME[worstEl] + '</b> 축이 <b style="color:' + wGrade.c + '">' + weaknessType + ' (' + wGrade.t + ')</b>으로 분류됩니다. '
      +   johuComment
      + '</div>'

      + '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:10px;">'
      +   '<div style="border:1px solid rgba(74,222,128,.35); border-radius:10px; padding:10px; background:rgba(74,222,128,.05);">'
      +     '<div style="font-size:.68rem; letter-spacing:1px; font-weight:900; color:#4ade80; margin-bottom:6px;">타고난 강점 신체 축</div>'
      +     '<div style="font-size:.84rem; color:#fff; margin-bottom:4px;"><b>' + EL_NAME[bestEl] + '</b> · ' + EL_ORGAN[bestEl] + '</div>'
      +     '<div style="font-size:.77rem; color:rgba(255,255,255,.78); line-height:1.55;">' + bProf.strength + '</div>'
      +     '<div style="font-size:.7rem; color:rgba(255,255,255,.52); margin-top:5px;">유효지수 ' + bm.effective + ' / 리스크 ' + bm.risk + '</div>'
      +   '</div>'
      +   '<div style="border:1px solid rgba(248,113,113,.35); border-radius:10px; padding:10px; background:rgba(248,113,113,.05);">'
      +     '<div style="font-size:.68rem; letter-spacing:1px; font-weight:900; color:#f87171; margin-bottom:6px;">타고난 취약 신체 축</div>'
      +     '<div style="font-size:.84rem; color:#fff; margin-bottom:4px;"><b>' + EL_NAME[worstEl] + '</b> · ' + EL_ORGAN[worstEl] + ' <span style="font-size:.68rem;color:#fca5a5">(' + weaknessType + ')</span></div>'
      +     '<div style="font-size:.77rem; color:rgba(255,255,255,.78); line-height:1.55;">' + weaknessReason + '</div>'
      +     '<div style="font-size:.7rem; color:rgba(255,255,255,.52); margin-top:5px;">기초 ' + wm.base + '% + 합 보정 ' + wm.hapBoost + ' - 충 스트레스 ' + wm.clashPenalty + '</div>'
      +   '</div>'
      + '</div>'

      + '<div style="border:1px solid rgba(255,255,255,.08); border-radius:10px; padding:10px; background:rgba(255,255,255,.03); margin-bottom:10px;">'
      +   '<div style="font-size:.7rem; font-weight:900; letter-spacing:1px; color:#93c5fd; margin-bottom:6px;">합(合) 기반 재배열</div>'
      +   '<div style="margin-bottom:8px;">' + hapBadges + '</div>'
      +   '<div style="font-size:.7rem; font-weight:900; letter-spacing:1px; color:#fda4af; margin-bottom:6px;">충(沖) 기반 스트레스</div>'
      +   '<div>' + clashBadges + '</div>'
      + '</div>'

      + '<div style="border:1px solid rgba(0,229,255,.18); border-radius:10px; padding:10px; background:rgba(0,229,255,.04);">'
      +   '<div style="font-size:.72rem; font-weight:900; letter-spacing:1px; color:#00e5ff; margin-bottom:6px;">전문의형 맞춤 처방</div>'
      +   '<div style="font-size:.8rem; color:rgba(255,255,255,.82); line-height:1.62;">'
      +     '① 식이 처방: ' + dietRx + '<br>'
      +     '② 운동 처방: ' + exRx + '<br>'
      +     '③ 생활 처방: ' + lifeRx + '<br>'
      +     '④ 추적 관찰: ' + wProf.monitor
      +   '</div>'
      + '</div>'

      + '<div style="margin-top:8px; font-size:.67rem; color:rgba(255,255,255,.42); line-height:1.45;">본 리포트는 사주 기반 웰니스 참고용이며 의료적 진단을 대체하지 않습니다. 증상이 지속되면 전문의 진료를 권장합니다.</div>'
      + '</div>';
  }

  function buildHealthTimeline(weakEl, johu) {
    var info = TIMELINE_TEXT[weakEl] || TIMELINE_TEXT.earth;
    var johuNote = (johu.type === 'hot' || johu.type === 'warm')
      ? '조열(燥熱) 체질 — 수분 보충과 열을 식히는 음식이 건강의 핵심입니다.'
      : (johu.type === 'cold' || johu.type === 'cool')
        ? '한습(寒濕) 체질 — 온기를 공급하는 음식과 유산소 운동이 건강의 핵심입니다.'
        : '온도 중화(中和) 체질 — 약한 오행을 채우는 식단에 집중하세요.';

    var color = EL_NEON[weakEl] || '#fff';
    return '<div class="ent-timeline">'
      + '<div class="ent-tl-line"></div>'
      + '<div class="ent-tl-node ent-reveal">'
      +   '<div class="ent-tl-dot" style="background:' + color + ';box-shadow:0 0 8px ' + color + '88;"></div>'
      +   '<div class="ent-tl-content"><div class="ent-tl-label">TODAY</div><div class="ent-tl-text">' + info.today + '</div></div>'
      + '</div>'
      + '<div class="ent-tl-node ent-reveal">'
      +   '<div class="ent-tl-dot" style="background:#c9a84c;box-shadow:0 0 8px #c9a84c88;"></div>'
      +   '<div class="ent-tl-content"><div class="ent-tl-label">THIS MONTH</div><div class="ent-tl-text">' + info.month + '</div></div>'
      + '</div>'
      + '<div class="ent-tl-node ent-reveal">'
      +   '<div class="ent-tl-dot" style="background:#7c3aed;box-shadow:0 0 8px #7c3aed88;"></div>'
      +   '<div class="ent-tl-content"><div class="ent-tl-label">THIS YEAR</div><div class="ent-tl-text">' + info.year + '</div></div>'
      + '</div>'
      + '<div class="ent-tl-node ent-tl-johu ent-reveal">'
      +   '<div class="ent-tl-dot" style="background:#00e5ff;box-shadow:0 0 8px #00e5ff88;"></div>'
      +   '<div class="ent-tl-content"><div class="ent-tl-label">조후(調候) 핵심</div><div class="ent-tl-text">' + johuNote + '</div></div>'
      + '</div>'
      + '</div>';
  }

  function buildEnhancedHealthReport(p, natal, johu, pw, jg) {
    // ── 오행 비율
    var ratios = (natal && natal.ratios) || { wood: 20, fire: 20, earth: 20, metal: 20, water: 20 };

    // ── 용신 / 기신
    var yongshinList = (jg && jg.isJong) ? [jg.dominant, jg.parEl].filter(Boolean) : ((pw && pw.yongshin) || []);
    var kijishinList = (jg && jg.isJong) ? [] : ((pw && pw.kijishin) || []);

    // ── 조후 요구 오행
    var johuNeed = [], johuAvoid = [];
    if (johu && (johu.type === 'hot' || johu.type === 'warm')) {
      johuNeed = ['water', 'metal']; johuAvoid = ['fire', 'wood'];
    } else if (johu && (johu.type === 'cold' || johu.type === 'cool')) {
      johuNeed = ['fire', 'wood'];   johuAvoid = ['water', 'metal'];
    }

    // targetEl (용신 ∩ 조후 우선)
    var targetEl = 'earth';
    var inter = yongshinList.filter(function (e) { return johuNeed.indexOf(e) >= 0; });
    if (inter.length) targetEl = inter[0];
    else if (johuNeed.length) targetEl = johuNeed[0];
    else if (yongshinList.length) targetEl = yongshinList[0];

    // avoidEl
    var avoidEl = 'earth';
    var aInter = kijishinList.filter(function (e) { return johuAvoid.indexOf(e) >= 0; });
    if (aInter.length) avoidEl = aInter[0];
    else if (johuAvoid.length) avoidEl = johuAvoid[0];
    else if (kijishinList.length) avoidEl = kijishinList[0];

    // 가장 약한 오행
    var weakEl = 'earth', minRatio = 999;
    var ELS = ['wood', 'fire', 'earth', 'metal', 'water'];
    ELS.forEach(function (el) {
      if ((ratios[el] || 0) < minRatio) { minRatio = ratios[el] || 0; weakEl = el; }
    });

    // ── 최다 십성 분석 (멘탈 처방용)
    var dg = p.d.g;
    var topStar = null, topStarCnt = 0;
    var tgCnt = {};
    [p.y.g, p.y.j, p.m.g, p.m.j, p.h.g, p.h.j, p.d.j].forEach(function (c) {
      var t = (w.getTenGod) ? w.getTenGod(dg, c) : null;
      if (t && t !== '?' && t !== '일간') tgCnt[t] = (tgCnt[t] || 0) + 1;
    });
    for (var s in tgCnt) { if (tgCnt[s] > topStarCnt) { topStarCnt = tgCnt[s]; topStar = s; } }
    var mentalData = TEN_GOD_MENTAL[topStar] || { advice: '다양한 십성이 고르게 분포된 균형 사주입니다. 현재의 루틴을 유지하면 됩니다.', rx: '오늘 감사한 것 세 가지를 기록해보세요.' };

    // ── 식단 / 운동 데이터
    var seed = getSeed('health');
    var HFDB = w.HEALTH_FOOD_DB, HEDB = w.HEALTH_EXERCISE_DB;
    var recFoods = [], badFood = null, recEx = null;
    if (HFDB) {
      var fArr = seededShuffle(HFDB[targetEl] || HFDB.earth, seed);
      recFoods = fArr.slice(0, 6);
      var bArr = seededShuffle(HFDB[avoidEl] || HFDB.earth, seed + 1);
      badFood = bArr[0];
    }
    if (HEDB) recEx = HEDB[targetEl] || HEDB.earth;

    // ── 오행 게이지 HTML
    var gaugeHtml = ELS.map(function (el) {
      var pct   = Math.round(ratios[el] || 0);
      var color = EL_NEON[el];
      var badge = (el === targetEl) ? '<span class="ent-el-badge target">용신↑</span>'
                : (el === avoidEl)  ? '<span class="ent-el-badge avoid">기신↓</span>'
                : '';
      return '<div class="ent-gauge-row">'
        + '<div class="ent-gauge-label">' + EL_ICON[el] + ' ' + EL_NAME[el]
        +   ' <span style="font-size:.65rem;opacity:.6;color:' + color + '">' + EL_ORGAN[el] + '</span>' + badge + '</div>'
        + '<div class="ent-gauge-bar-wrap"><div class="ent-gauge-fill" data-target="' + pct
        +   '" style="width:0%;background:' + color + ';box-shadow:0 0 10px ' + color + '44;"></div></div>'
        + '<div class="ent-gauge-pct" style="color:' + color + '">' + pct + '%</div>'
        + '</div>';
    }).join('');

    // ── 식단 카드 HTML
    var foodHtml = recFoods.length
      ? recFoods.map(function (f) {
          return '<div class="ent-food-card ent-reveal">'
            + '<div class="ent-food-name">' + f.name + '</div>'
            + '<div class="ent-food-desc">' + (f.reason || '') + '</div>'
            + '</div>';
        }).join('')
      : '<div style="font-size:.8rem;color:rgba(255,255,255,.3)">식단 데이터를 불러올 수 없습니다.</div>';

    var avoidFoodHtml = badFood
      ? '<div class="ent-avoid-tip">⚠️ 오늘 피할 것: <b>' + badFood.name + '</b> — '
        + EL_NAME[avoidEl] + ' 과잉을 유발합니다.</div>'
      : '';

    // ── 운동 카드 HTML
    var exHtml = recEx
      ? '<div class="ent-ex-card ent-reveal">'
        + '<div class="ent-ex-name">' + EL_ICON[targetEl] + ' ' + recEx.name + '</div>'
        + '<div class="ent-ex-desc">' + recEx.desc + '</div>'
        + '<div class="ent-ex-stretch">🍀 행운의 스트레칭: ' + recEx.stretch + '</div>'
        + '</div>'
      : '';

    // ── 전체 HTML 조립
    return '<div class="ent-health-wrap">'

      // 헤더
      + '<div class="ent-health-header">'
      +   '<div class="ent-health-tag">🩺 MYEONGRI HEALTH ENGINE v2</div>'
      +   '<div class="ent-health-title">명리 헬스 리포트</div>'
      +   '<div class="ent-health-sub">사주 오행 × 조후 × 용신 = ' + (w.USER_NAME || '당신') + '님만을 위한 맞춤 건강 처방</div>'
      + '</div>'

      // 섹션 1 — 오행 체질 게이지
      + '<div class="ent-section ent-reveal">'
      +   '<div class="ent-section-header">'
      +     '<span class="ent-section-num">01</span>'
      +     '<span class="ent-section-title">오행 체질 게이지</span>'
      +   '</div>'
      +   '<div class="ent-gauge-wrap">' + gaugeHtml + '</div>'
      + '</div>'

      // 섹션 2 — 건강 타임라인 예보
      + '<div class="ent-section ent-reveal">'
      +   '<div class="ent-section-header">'
      +     '<span class="ent-section-num">02</span>'
      +     '<span class="ent-section-title">건강 타임라인 예보</span>'
      +   '</div>'
      +   buildHealthTimeline(weakEl, johu || {})
      + '</div>'

      // 섹션 3 — 맞춤 처방전
      + '<div class="ent-section ent-reveal">'
      +   '<div class="ent-section-header">'
      +     '<span class="ent-section-num">03</span>'
      +     '<span class="ent-section-title">사주 맞춤 처방전 🥗</span>'
      +   '</div>'
      +   '<div class="ent-food-grid">' + foodHtml + '</div>'
      +   avoidFoodHtml
      +   exHtml
      + '</div>'

      // 섹션 4 — 멘탈 케어
      + '<div class="ent-section ent-reveal">'
      +   '<div class="ent-section-header">'
      +     '<span class="ent-section-num">04</span>'
      +     '<span class="ent-section-title">멘탈 케어 처방 🧠</span>'
      +   '</div>'
      +   '<div class="ent-mental-card">'
      +     '<div class="ent-mental-star">최다 십성: ' + (topStar || '—') + '</div>'
      +     '<div class="ent-mental-advice">⚡ ' + mentalData.advice + '</div>'
      +     '<div class="ent-mental-rx">💊 처방: ' + mentalData.rx + '</div>'
      +     '<div class="ent-mental-el-note">' + (EL_MENTAL_NOTE[weakEl] || '') + '</div>'
      +   '</div>'
      + '</div>'

      + '</div>'; // .ent-health-wrap
  }


  /* ════════════════════════════════════════════════════════
     §3  RPG 일일 퀘스트 시스템 (localStorage EXP)
     ════════════════════════════════════════════════════════ */

  // 일간 오행별 일일 퀘스트 데이터베이스
  var QUEST_DB = {
    wood: [
      { id: 'wq1', icon: '🌱', text: '새로운 것을 하나 배우기 (영상, 아티클, 책 한 챕터)', exp: 20 },
      { id: 'wq2', icon: '🤸', text: '10분 이상 스트레칭 또는 가벼운 산책', exp: 15 },
      { id: 'wq3', icon: '📝', text: '창의적인 아이디어 3가지를 노트에 기록하기', exp: 25 },
      { id: 'wq4', icon: '🥗', text: '녹색 채소 1가지 이상 오늘 식사에 포함하기', exp: 10 },
      { id: 'wq5', icon: '💬', text: '가까운 사람에게 먼저 연락하거나 감사 표현하기', exp: 15 }
    ],
    fire: [
      { id: 'fq1', icon: '🔥', text: '오늘 하루 최우선 목표 1개를 완수하기', exp: 25 },
      { id: 'fq2', icon: '🌅', text: '아침에 햇빛 10분 이상 쬐기 (비타민D 충전)', exp: 10 },
      { id: 'fq3', icon: '💪', text: '30분 이상 유산소 운동 (달리기, 사이클, 댄스)', exp: 20 },
      { id: 'fq4', icon: '🎯', text: '하고 싶었던 말을 용기 있게 표현하기 (문자도 OK)', exp: 20 },
      { id: 'fq5', icon: '💊', text: '수분 2L 이상 섭취하고 마신 양 체크하기', exp: 10 }
    ],
    earth: [
      { id: 'eq1', icon: '⛰️', text: '오늘 감사한 것 3가지를 일기나 메모에 기록하기', exp: 15 },
      { id: 'eq2', icon: '🍽️', text: '규칙적인 시간에 세끼 챙겨 먹기 (야식 금지)', exp: 15 },
      { id: 'eq3', icon: '🏠', text: '방·책상 주변 5분 미니 정리정돈 완료하기', exp: 10 },
      { id: 'eq4', icon: '🤝', text: '오늘 한 가지 약속이나 계획을 칼같이 지키기', exp: 25 },
      { id: 'eq5', icon: '😴', text: '23시 이전 취침 준비 완료하기 (폰 내려놓기)', exp: 20 }
    ],
    metal: [
      { id: 'mq1', icon: '⚔️', text: '가장 어려운 일을 먼저 처리하기 (이팅 더 프로그)', exp: 25 },
      { id: 'mq2', icon: '🫁', text: '복식 호흡 5분 — 폐와 신경계 정화 호흡', exp: 15 },
      { id: 'mq3', icon: '🗑️', text: '불필요한 앱·파일·물건 하나 정리하거나 삭제하기', exp: 10 },
      { id: 'mq4', icon: '📊', text: '오늘 지출 내역 확인 및 이번 달 예산 점검하기', exp: 20 },
      { id: 'mq5', icon: '🤫', text: '불필요한 말을 아끼고 핵심만 전달하는 하루', exp: 15 }
    ],
    water: [
      { id: 'aq1', icon: '💧', text: '기상 직후 물 한 잔 (공복에 신장·방광 깨우기)', exp: 10 },
      { id: 'aq2', icon: '🧘', text: '5분 명상 또는 조용한 사색 시간 갖기', exp: 20 },
      { id: 'aq3', icon: '📖', text: '오늘 직관적으로 떠오른 아이디어·감정 기록하기', exp: 20 },
      { id: 'aq4', icon: '🌊', text: '걱정거리를 종이에 쓰고 해결책 1가지 적어보기', exp: 25 },
      { id: 'aq5', icon: '🎧', text: '마음을 편하게 해주는 음악 듣기 (최소 10분)', exp: 10 }
    ]
  };

  // 비밀 팁 데이터 (모든 퀘스트 완료 시 해금)
  var SECRET_TIP_DB = {
    wood:  [
      '오늘 나무의 기운이 당신의 직관을 극대화합니다. 영감이 떠오를 때 즉시 메모하세요. 그 아이디어가 1년 뒤 큰 기회가 될 수 있습니다.',
      '동쪽을 향한 책상 배치 또는 초록 식물 하나가 오늘의 木 기운을 증폭시킵니다. 창의적인 작업에 특히 좋은 날입니다.'
    ],
    fire:  [
      '오늘 화(火) 에너지가 당신의 카리스마를 폭발시킵니다. 중요한 발표나 협상은 오늘 오전에 진행하세요. 상대방이 당신의 열정에 압도될 것입니다.',
      '빨간색 소품이나 붉은 음식(토마토, 딸기, 홍고추)이 오늘 화 기운을 증폭시킵니다. 행운의 컬러 빨강을 오늘 하나 착용해보세요.'
    ],
    earth: [
      '오늘 토(土) 기운이 인연을 만들어줍니다. 오랫동안 연락 못 했던 소중한 사람에게 먼저 손을 내밀어보세요. 뜻밖의 좋은 소식을 들을 수 있습니다.',
      '노란색이나 황토색 계열의 물건이 오늘 재운(財運)을 끌어당깁니다. 신뢰를 쌓고 관계를 다지기에 가장 좋은 날입니다.'
    ],
    metal: [
      '오늘 금(金) 기운이 결단력을 최고조로 강화합니다. 미뤄뒀던 중요한 결정을 오늘 내리면 후회가 없을 것입니다. 칼같은 실행력이 빛을 발하는 날입니다.',
      '흰색이나 금속 소품이 오늘의 포스를 배가시킵니다. 중요한 미팅에 깔끔한 차림을 권합니다. 첫인상이 결정적인 역할을 할 것입니다.'
    ],
    water: [
      '오늘 수(水) 기운이 숨겨진 기회를 수면 위로 끌어올립니다. 평소 지나쳤던 정보나 제안을 다시 한번 꼼꼼히 살펴보세요. 보물이 숨어있을 수 있습니다.',
      '검정 또는 남색 계열이 오늘 수기를 증폭시킵니다. 중요한 글쓰기·기획·아이디어 정리에 집중하기에 최적의 날입니다.'
    ]
  };

  // EXP → 레벨 계산
  function calcExpLevel(exp) {
    var level = Math.floor(exp / 100) + 1;
    var pct = exp % 100;
    return { level: Math.min(level, 99), pct: pct };
  }

  function buildSecretTip(dayEl) {
    var tips = SECRET_TIP_DB[dayEl] || SECRET_TIP_DB.earth;
    var tip = seededShuffle(tips, getSeed('secret'))[0];
    return tip;
  }

  function buildEnhancedQuestSystem(p) {
    var dg = p.d.g;
    var dayEl = ((w.GAN && w.GAN[dg]) ? w.GAN[dg].e : 'earth') || 'earth';
    var quests = QUEST_DB[dayEl] || QUEST_DB.earth;
    var allExp = quests.reduce(function (s, q) { return s + q.exp; }, 0);

    var dateKey = todayKey();
    var storageKey = 'cd_quests_' + dateKey;
    var expKey = 'cd_exp';

    // localStorage 로드
    var completed = [];
    try { completed = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch (e) { completed = []; }
    var totalExp = 0;
    try { totalExp = parseInt(localStorage.getItem(expKey) || '0', 10) || 0; } catch (e) {}

    var earnedToday = quests.filter(function (q) { return completed.indexOf(q.id) >= 0; })
      .reduce(function (s, q) { return s + q.exp; }, 0);
    var allDone = completed.length >= quests.length;
    var lvlInfo = calcExpLevel(totalExp);

    var questItems = quests.map(function (q) {
      var isDone = completed.indexOf(q.id) >= 0;
      return '<label class="ent-quest-item' + (isDone ? ' done' : '') + '" data-qid="' + q.id + '" data-exp="' + q.exp + '">'
        + '<input type="checkbox"' + (isDone ? ' checked' : '') + ' style="display:none" aria-label="' + q.text + '">'
        + '<div class="ent-quest-icon">' + q.icon + '</div>'
        + '<div class="ent-quest-text">' + q.text + '</div>'
        + '<div class="ent-quest-exp">+' + q.exp + ' EXP</div>'
        + '</label>';
    }).join('');

    var secretHtml = allDone
      ? '<div class="ent-secret-unlock is-visible" style="display:block">'
        + '<div class="ent-secret-icon">🔓</div>'
        + '<div class="ent-secret-title">오늘의 비밀 운세 해금!</div>'
        + '<div class="ent-secret-text">' + buildSecretTip(dayEl) + '</div>'
        + '</div>'
      : '<div class="ent-secret-lock">'
        + '<div class="ent-secret-lock-icon">🔒</div>'
        + '<div class="ent-secret-lock-text">퀘스트를 모두 완료하면 오늘의 <b>비밀 운세</b>가 해금됩니다!</div>'
        + '</div>';

    return '<div class="ent-quest-wrap" id="entQuestSection" data-storage="' + storageKey + '" data-expkey="' + expKey + '" data-dayel="' + dayEl + '">'
      + '<div class="ent-quest-header">'
      +   '<div class="ent-quest-tag">⚡ DAILY QUEST SYSTEM</div>'
      +   '<div class="ent-quest-title">오늘의 일일 퀘스트</div>'
      +   '<div class="ent-quest-sub">' + EL_ICON[dayEl] + ' ' + EL_NAME[dayEl] + ' 일간 맞춤 미션 · 매일 자정 리셋</div>'
      + '</div>'
      // EXP 현황 패널
      + '<div class="ent-exp-panel">'
      +   '<div class="ent-exp-level">LV. <span id="entLvNum">' + lvlInfo.level + '</span></div>'
      +   '<div class="ent-exp-wrap"><div class="ent-exp-bar" id="entExpBar" style="width:' + lvlInfo.pct + '%"></div></div>'
      +   '<div class="ent-exp-label">누적 EXP <span id="entTotalExp">' + totalExp + '</span> &nbsp;·&nbsp; 오늘 획득: <span id="entTodayExp">' + earnedToday + '</span> / ' + allExp + '</div>'
      + '</div>'
      // 퀘스트 목록
      + '<div class="ent-quest-list" id="entQuestList">' + questItems + '</div>'
      // 비밀 해금 영역
      + '<div id="entSecretArea">' + secretHtml + '</div>'
      + '</div>';
  }


  /* ════════════════════════════════════════════════════════
     §4  테토-에겐 / 극T 심화 분석
         - 테토/에겐: 매력 운영 가이드 + 뼈 때리는 조언
         - 극T: 양자 명리 숨겨진 본성 카드
     ════════════════════════════════════════════════════════ */

  var TETO_EGEN_GUIDE = {
    teto: {
      title: '매력 운영 가이드: 테토 드라이브형',
      desc: '결정력과 추진력이 매력의 중심축입니다. 다만 속도감이 관계의 온도를 앞지르면 오해가 생길 수 있어, 강도 조절이 핵심 포인트입니다.',
      tips: [
        '핵심 결론은 짧게, 감정 피드백은 한 문장 더 길게 전달하기',
        '리드 후 상대 반응 체크를 습관화해 관계 이탈률 줄이기',
        '직설 화법이 필요한 순간과 공감 화법이 필요한 순간을 분리 운영하기'
      ],
      tags: ['주도권', '속도전', '결정력']
    },
    egen: {
      title: '매력 운영 가이드: 에겐 공감형',
      desc: '관계 감지력과 정서 공명이 강점입니다. 다만 감정 과몰입이 피로로 전환되지 않도록 경계선을 명확히 잡아야 매력이 오래갑니다.',
      tips: [
        '공감 표현 후 바로 다음 액션 1개를 제시해 실행력 연결하기',
        '배려와 자기보호의 균형을 위해 거절 문장 템플릿 준비하기',
        '정서 소모가 큰 관계에는 대화 시간 제한을 미리 설정하기'
      ],
      tags: ['공감력', '관계센스', '유연성']
    },
    neutral: {
      title: '매력 운영 가이드: 하이브리드 밸런서',
      desc: '테토/에겐 모드를 상황에 따라 전환할 수 있는 멀티형입니다. 강점이 넓은 대신, 모드 기준이 없으면 피로가 누적될 수 있습니다.',
      tips: [
        '오전/오후처럼 시간대별 기본 모드를 고정해 의사결정 피로 줄이기',
        '중요 관계는 공감 우선, 업무 의사결정은 논리 우선 규칙 분리하기',
        '하루 종료 시 모드 전환이 잘된 장면 1개를 복기해 패턴 고정하기'
      ],
      tags: ['균형감', '전환력', '적응력']
    }
  };

  var XT_HIDDEN_PROFILE = {
    ultra: {
      title: '숨겨진 본성: 냉각형 전략가',
      summary: '감정 노이즈를 최소화하고 구조를 먼저 보는 타입입니다. 위기 상황에서 판단 품질이 올라가는 강점이 뚜렷합니다.',
      cues: [
        '문제 발생 시 감정 반응보다 원인 트리 분해가 먼저 작동함',
        '관계 이슈도 논리적 일관성으로 해석하려는 경향이 강함',
        '정확성은 높지만 체감 온도가 낮아 보일 수 있어 톤 보정이 필요함'
      ]
    },
    high: {
      title: '숨겨진 본성: 로직 중심 조율자',
      summary: '합리성과 현실 감각이 강하며, 감정 흐름도 실용적으로 정리하는 타입입니다. 냉정함과 실행력이 균형을 이룹니다.',
      cues: [
        '갈등 상황에서 정리·중재 역할을 자연스럽게 맡는 편',
        '비효율을 빠르게 감지해 행동 수정 속도가 빠름',
        '공감 표현을 한 문장만 추가해도 신뢰 체감이 크게 상승함'
      ]
    },
    hybrid: {
      title: '숨겨진 본성: 듀얼 코어 해석자',
      summary: '논리와 감성을 번갈아 사용하는 하이브리드형입니다. 상황 판단 폭이 넓고, 전환 타이밍만 잡으면 매우 강력해집니다.',
      cues: [
        '업무에서는 분석, 관계에서는 공감으로 모드를 전환함',
        '판단 기준이 흐려질 때 우선순위 표기만 해도 효율이 회복됨',
        '결정 지연이 생기면 시간 제한 규칙이 성능을 안정화함'
      ]
    },
    empath: {
      title: '숨겨진 본성: 감정 민감 관찰자',
      summary: '정서 신호를 빠르게 감지하고 배려 반응이 먼저 나오는 타입입니다. 타인 감정의 파동을 잘 읽는 것이 핵심 능력입니다.',
      cues: [
        '관계 온도 변화에 즉각 반응하며 분위기 조절 능력이 좋음',
        '중요 결정을 미룰 때는 데이터 2개 기준을 먼저 고정하면 안정됨',
        '공감 피로 누적을 막기 위해 회복 루틴을 구조화할 필요가 있음'
      ]
    }
  };

  function resolveTScoreTier(score) {
    if (score >= 80) return 'ultra';
    if (score >= 50) return 'high';
    if (score >= 20) return 'hybrid';
    return 'empath';
  }

  function buildXTLogicHiddenSection(p, natal, johu, score, hapData) {
    var tier = resolveTScoreTier(score);
    var profile = XT_HIDDEN_PROFILE[tier] || XT_HIDDEN_PROFILE.hybrid;
    var counts = (natal && natal.counts) || {};
    var metalCount = Number(counts.metal || 0);
    var isColdDry = johu && (johu.temp === 'Cold' || johu.temp === 'Cool' || johu.wet === 'Dry');

    var signalBadges = [
      { text: 'T 점수 ' + score, color: score >= 80 ? '#f87171' : (score >= 50 ? '#fbbf24' : '#60a5fa') },
      { text: '금 오행 ' + metalCount + '칸', color: '#e2e8f0' },
      { text: isColdDry ? '냉·건조 조후' : '중화 조후', color: isColdDry ? '#60a5fa' : '#4ade80' }
    ];

    if (hapData && hapData.topEl) {
      signalBadges.push({ text: '합화 중심 ' + (EL_NAME[hapData.topEl] || hapData.topEl), color: EL_NEON[hapData.topEl] || '#cbd5e1' });
    }

    var hapListHtml = signalBadges.map(function (s) {
      return '<span class="ent-hap-badge" style="color:' + s.color + ';border-color:' + s.color + '44;">' + s.text + '</span>';
    }).join('');

    return '<div class="ent-hidden-wrap ent-reveal">'
      + '<div class="ent-hidden-header">🌌 양자 명리 — 숨겨진 본성</div>'
      + '<div class="ent-hap-list">' + hapListHtml + '</div>'
      + '<div class="ent-hidden-title">' + profile.title + '</div>'
      + '<div class="ent-hidden-desc"><b>핵심 요약:</b> ' + profile.summary + '</div>'
      + '<ul class="ent-hidden-list">'
      + profile.cues.map(function (cue) { return '<li>' + cue + '</li>'; }).join('')
      + '</ul>'
      + '</div>';
  }

  // 성향별 뼈 때리는 조언 (테토 / 에겐 / 균형)
  var BONE_ADVICE = {
    teto: [
      {
        icon: '🪞',
        title: '당신이 놓치고 있는 진실',
        text: '강한 인상과 진짜 강함은 다릅니다. 주도권이 없으면 불안해지는 순간, 그것은 리더십보다 불안 관리 모드에 가깝습니다.',
        action: '오늘 한 번은 "내가 모를 수도 있다"를 먼저 말해보세요. 취약함을 드러낼 때 신뢰가 올라갑니다.'
      },
      {
        icon: '💔',
        title: '관계에서 반복되는 패턴',
        text: '먼저 크게 주고, 뒤늦게 지쳐서 선을 긋는 패턴이 보입니다. 문제는 배려가 아니라 기대를 숨긴 채 소진되는 흐름입니다.',
        action: '도와주기 전에 기대치를 한 줄로 합의하세요. 관계는 통제보다 조율이 오래갑니다.'
      },
      {
        icon: '🔥',
        title: '이 에너지가 독이 될 때',
        text: '승부욕이 과열되면 번아웃을 넘어 자멸로 이어질 수 있습니다. 이기기 위한 전투와 성장하기 위한 전투는 완전히 다른 게임입니다.',
        action: '오늘은 "반드시 이긴다" 대신 "다음 판에서 더 좋아진다"를 목표로 잡아보세요. 회복력이 성과를 지켜줍니다.'
      }
    ],
    egen: [
      {
        icon: '🌊',
        title: '당신이 놓치고 있는 진실',
        text: '감수성이 뛰어나다는 것이 때로는 경계를 잃는 것을 의미합니다. 모두를 보살피다 정작 자신을 돌보지 못하고 있지는 않나요? 당신이 먼저 채워져야 다른 사람에게도 줄 수 있습니다. 산소마스크는 본인부터 착용해야 합니다.'
      },
      {
        icon: '🌱',
        title: '관계에서 반복되는 패턴',
        text: '"왜 나는 항상 이렇게 맞춰주는가" 싶을 때가 있을 것입니다. 그것은 사랑이기도 하지만, 거절하지 못하는 두려움이기도 합니다. NO라고 말하는 연습 — 당신에게 가장 필요한 자기 존중의 언어입니다.'
      },
      {
        icon: '✨',
        title: '이 에너지가 독이 될 때',
        text: '감정에 과몰입하면 객관적인 판단력이 흐려집니다. 감정을 충분히 느끼되 그 감정에 지배당하지 않는 메타인지 훈련이 당신에게 가장 필요한 성장 과제입니다. 관찰자의 눈으로 자신을 바라보는 연습을 시작하세요.'
      }
    ],
    neutral: [
      {
        icon: '⚖️',
        title: '당신이 놓치고 있는 진실',
        text: '양면성은 분명 강점입니다. 하지만 때로는 내 안의 진짜 욕구가 무엇인지 스스로도 모르는 상황이 생깁니다. "나는 지금 진짜 뭘 원하는가" — 이 질문을 일주일에 한 번은 진지하게 물어보세요.'
      },
      {
        icon: '🌀',
        title: '관계에서 반복되는 패턴',
        text: '상황에 따라 다른 면을 보여주는 것이 영리해 보이지만, 가까운 사람이 "당신의 진짜 모습을 모르겠다"고 느낄 수 있습니다. 무방비 상태의 진짜 모습을 한 명에게라도 보여주는 용기가 관계의 깊이를 만듭니다.'
      },
      {
        icon: '🔮',
        title: '이 에너지가 독이 될 때',
        text: '균형을 유지하려는 욕구가 과잉되면 아무 결정도 내리지 못하는 우유부단함이 됩니다. 완벽한 균형은 존재하지 않습니다. 선택하고 책임지는 용기 — 그것이 당신을 한 단계 성장시키는 유일한 방법입니다.'
      }
    ]
  };

  function buildTetoEgeDeepSection(p, power, hapData) {
    var vibe = (w.calculateHormoneVibe) ? w.calculateHormoneVibe(p, power) : { result: 'neutral' };
    var result = vibe.result || 'neutral';

    var guide = TETO_EGEN_GUIDE[result] || TETO_EGEN_GUIDE.neutral;
    var modeClass = (result === 'teto') ? 'mode-teto' : (result === 'egen' ? 'mode-egen' : 'mode-neutral');
    var modeLabel = (result === 'teto') ? '테토 드라이브 모드' : (result === 'egen' ? '에겐 공감 모드' : '하이브리드 밸런스 모드');
    var guideBadges = (guide.tags || []).map(function (tag) {
      return '<span class="ent-guide-chip" style="--chip-color:#c4b5fd;">' + tag + '</span>';
    });
    if (hapData && hapData.topEl) {
      guideBadges.push('<span class="ent-guide-chip" style="--chip-color:' + (EL_NEON[hapData.topEl] || '#e2e8f0') + ';">합화 중심 ' + (EL_NAME[hapData.topEl] || hapData.topEl) + '</span>');
    }

    var guideHtml = '<div class="ent-guide-wrap ent-reveal ' + modeClass + '">'
      + '<div class="ent-guide-top">'
      +   '<div class="ent-guide-header">🧭 매력 운영 가이드</div>'
      +   '<div class="ent-guide-mode">' + modeLabel + '</div>'
      + '</div>'
      + '<div class="ent-guide-chip-list">' + guideBadges.join('') + '</div>'
      + '<div class="ent-guide-title">' + guide.title + '</div>'
      + '<div class="ent-guide-desc">' + guide.desc + '</div>'
      + '<ul class="ent-guide-list">'
      + (guide.tips || []).map(function (tip) { return '<li class="ent-guide-item">' + tip + '</li>'; }).join('')
      + '</ul>'
      + '</div>';

    // ── 뼈 때리는 조언
    var advices = BONE_ADVICE[result] || BONE_ADVICE.neutral;
    var adviceHtml = advices.map(function (a, idx) {
      return '<div class="ent-bone-card ent-reveal" style="--ent-bone-delay:' + (idx * 0.07) + 's;">'
        + '<div class="ent-bone-icon">' + a.icon + '</div>'
        + '<div class="ent-bone-body">'
        + '  <div class="ent-bone-kicker">CORE ' + (idx + 1) + '</div>'
        + '  <div class="ent-bone-title">' + a.title + '</div>'
        + '  <div class="ent-bone-text">' + a.text + '</div>'
        + (a.action ? ('  <div class="ent-bone-action">실전 팁 · ' + a.action + '</div>') : '')
        + '</div>'
        + '</div>';
    }).join('');

    return '<div class="ent-te-deep-wrap">'
      + guideHtml
      + '<div class="ent-bone-section ent-reveal ' + modeClass + '">'
      +   '<div class="ent-bone-header">🦴 뼈 때리는 조언</div>'
      +   '<div class="ent-bone-subtitle">사주가 보내는 솔직한 진단 + 바로 실행 가능한 보정 가이드</div>'
      +   '<div class="ent-bone-list">' + adviceHtml + '</div>'
      + '</div>'
      + '</div>';
  }


  /* ════════════════════════════════════════════════════════
     §5  원본 함수 오버라이드
         (saju-engine.js 이후 로드되므로 안전하게 교체 가능)
     ════════════════════════════════════════════════════════ */

  // ① 명리 헬스 리포트 — 원본 복구 + 퀀텀 임상형 상단 리포트 추가
  var _origHealth = w.renderHealthReport;
  w.renderHealthReport = function (p, natal, johu, pw, jg) {
    var area = document.getElementById('healthReportSection');
    var card = document.getElementById('healthReportCard');
    if (!area || !card) return;

    try {
      // 먼저 기존 saju-engine.js의 원본 콘텐츠를 그대로 렌더링
      _origHealth && _origHealth(p, natal, johu, pw, jg);

      // 중복 삽입 방지
      var oldReport = document.getElementById('entQuantumClinicalReport');
      if (oldReport && oldReport.parentNode) oldReport.parentNode.removeChild(oldReport);

      // 사주 원국 + 합/충 기반 상단 임상형 리포트 추가
      var clinicalHtml = buildQuantumClinicalTopReport(p, natal, johu || {}, pw, jg);
      area.insertAdjacentHTML('afterbegin', clinicalHtml);
      card.style.display = 'block';
      _scheduleReveal(area);
    } catch (err) {
      console.error('[entertain-health] override failed:', err);
      if (!area.innerHTML || area.innerHTML.trim().length < 20) {
        area.innerHTML = '<div style="border:1px solid #fca5a5;background:#fff1f2;border-radius:10px;padding:12px 14px;color:#9f1239;line-height:1.65;">'
          + '<b>헬스 리포트 보정 중</b><br>렌더 지연이 감지되어 기본 가이드를 우선 표시합니다. 잠시 후 다시 확인해 주세요.'
          + '</div>';
      }
      card.style.display = 'block';
    }

    if (typeof w.syncReportHeightFromNode === 'function') {
      w.syncReportHeightFromNode(card);
      setTimeout(function () { w.syncReportHeightFromNode(card); }, 240);
    }
  };

  // ② RPG 스킬 트리 — 퀘스트 시스템 추가 (원본은 유지)
  var _origSkillTree = w.renderSkillTree;
  w.renderSkillTree = function (p, natal) {
    _origSkillTree && _origSkillTree(p, natal);
    var area = document.getElementById('skillTreeSection');
    if (!area) return;
    // 퀘스트 HTML 추가
    var questEl = document.createElement('div');
    questEl.innerHTML = buildEnhancedQuestSystem(p);
    var questNode = questEl.firstElementChild || questEl;
    area.appendChild(questNode);
    _scheduleReveal(area);
    _initQuestSystem();
  };

  // ③ 테토-에겐 — 심화 분석 섹션 추가 (원본 결과 아래에 이어서 표시)
  var _origHormone = w.renderHormoneVibe;
  w.renderHormoneVibe = function (p, power) {
    _origHormone && _origHormone(p, power);
    var target = document.getElementById('hormoneVibeResult');
    if (!target) return;

    var oldDeep = target.querySelector('.ent-te-deep-wrap');
    if (oldDeep && oldDeep.parentNode) oldDeep.parentNode.removeChild(oldDeep);

    var hapData = calcQuantumHap(p);
    var deepHtml = buildTetoEgeDeepSection(p, power, hapData);
    var addon = document.createElement('div');
    addon.innerHTML = deepHtml;
    target.appendChild(addon.firstElementChild || addon);
    _scheduleReveal(target);

    if (typeof w.syncReportHeightFromNode === 'function') {
      w.syncReportHeightFromNode(target);
      setTimeout(function () { w.syncReportHeightFromNode(target); }, 220);
    }
  };

  // ④ 극T 테스트 — 숨겨진 본성 카드 이관 (테토/에겐 섹션에서 이동)
  var _origTTest = w.renderTTest;
  w.renderTTest = function (p, natal, johu, pw) {
    _origTTest && _origTTest(p, natal, johu, pw);

    var area = document.getElementById('tTestResult');
    var card = document.getElementById('tTestCard');
    if (!area || !card) return;

    var oldHidden = area.querySelector('.ent-xt-hidden');
    if (oldHidden && oldHidden.parentNode) oldHidden.parentNode.removeChild(oldHidden);

    var scoreEl = area.querySelector('.t-test-val');
    var score = scoreEl ? parseInt(scoreEl.textContent, 10) : 0;
    if (!isFinite(score)) score = 0;

    var hapData = (p && p.y && p.m && p.d && p.h) ? calcQuantumHap(p) : null;
    var hiddenHtml = buildXTLogicHiddenSection(p || {}, natal || {}, johu || {}, score, hapData);

    var wrap = document.createElement('div');
    wrap.className = 'ent-xt-hidden';
    wrap.innerHTML = hiddenHtml;
    area.appendChild(wrap);

    _scheduleReveal(area);
    if (typeof w.syncReportHeightFromNode === 'function') {
      w.syncReportHeightFromNode(card);
      setTimeout(function () { w.syncReportHeightFromNode(card); }, 220);
    }
  };


  /* ════════════════════════════════════════════════════════
     §6  인터랙션 & 애니메이션
     ════════════════════════════════════════════════════════ */

  // 스크롤 진입 시 페이드인 (IntersectionObserver)
  function _scheduleReveal(root) {
    requestAnimationFrame(function () {
      _initScrollReveal(root);
    });
  }

  function _initScrollReveal(root) {
    var els = (root || document).querySelectorAll('.ent-reveal:not(.is-visible)');
    if (!els.length) return;
    if (typeof IntersectionObserver !== 'undefined') {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            obs.unobserve(e.target);
          }
        });
      }, { threshold: 0.08 });
      els.forEach(function (el) { obs.observe(el); });
    } else {
      // IntersectionObserver 미지원 환경: 즉시 표시
      els.forEach(function (el) { el.classList.add('is-visible'); });
    }
  }

  // 오행 게이지 너비 애니메이션 시작
  function _initGaugeAnimation(root) {
    setTimeout(function () {
      var fills = (root || document).querySelectorAll('.ent-gauge-fill');
      fills.forEach(function (fill) {
        var target = fill.getAttribute('data-target') || '0';
        fill.style.width = target + '%';
      });
    }, 250);
  }

  // 퀘스트 클릭 이벤트 바인딩
  function _initQuestSystem() {
    var section = document.getElementById('entQuestSection');
    if (!section) return;
    var storageKey = section.getAttribute('data-storage');
    var expKey = section.getAttribute('data-expkey');
    var dayEl = section.getAttribute('data-dayel') || 'earth';

    section.querySelectorAll('.ent-quest-item:not(.done)').forEach(function (item) {
      item.addEventListener('click', function () {
        if (item.classList.contains('done')) return;

        var checkbox = item.querySelector('input[type="checkbox"]');
        var qid = item.getAttribute('data-qid');
        var qexp = parseInt(item.getAttribute('data-exp') || '0', 10);

        // 1) 시각 처리
        if (checkbox) checkbox.checked = true;
        item.classList.add('done');

        // 2) localStorage 갱신
        var completed = [];
        try { completed = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch (e) {}
        if (completed.indexOf(qid) < 0) {
          completed.push(qid);
          try { localStorage.setItem(storageKey, JSON.stringify(completed)); } catch (e) {}

          // EXP 누적
          var totalExp = 0;
          try { totalExp = parseInt(localStorage.getItem(expKey) || '0', 10) || 0; } catch (e) {}
          totalExp += qexp;
          try { localStorage.setItem(expKey, String(totalExp)); } catch (e) {}

          // 3) UI 갱신
          var lvInfo = calcExpLevel(totalExp);
          var lvEl = document.getElementById('entLvNum');
          var barEl = document.getElementById('entExpBar');
          var totEl = document.getElementById('entTotalExp');
          var todayEl = document.getElementById('entTodayExp');
          if (lvEl)    lvEl.textContent    = lvInfo.level;
          if (barEl)   barEl.style.width   = lvInfo.pct + '%';
          if (totEl)   totEl.textContent   = totalExp;
          if (todayEl) todayEl.textContent = parseInt(todayEl.textContent || '0', 10) + qexp;

          // 4) EXP 스파크 이펙트
          _spawnExpSpark(item, qexp);

          // 5) 전체 완료 체크 → 비밀 해금
          var allItems  = section.querySelectorAll('.ent-quest-item');
          var doneItems = section.querySelectorAll('.ent-quest-item.done');
          if (doneItems.length >= allItems.length) {
            _unlockSecret(section, dayEl);
          }
        }
      });
    });
  }

  // EXP 스파크 팝업 생성
  function _spawnExpSpark(el, exp) {
    var spark = document.createElement('div');
    spark.className = 'ent-exp-spark';
    spark.textContent = '+' + exp + ' EXP';
    el.appendChild(spark);
    setTimeout(function () { if (spark.parentNode) spark.parentNode.removeChild(spark); }, 1300);
  }

  // 모든 퀘스트 완료 → 비밀 운세 해금 처리
  function _unlockSecret(section, dayEl) {
    var secretArea = section.querySelector('#entSecretArea');
    if (!secretArea) return;

    // 잠금 UI 숨기기
    var lockEl = secretArea.querySelector('.ent-secret-lock');
    if (lockEl) lockEl.style.display = 'none';

    // 해금 UI 표시
    var unlockEl = secretArea.querySelector('.ent-secret-unlock');
    if (unlockEl) {
      unlockEl.style.display = 'block';
      setTimeout(function () { unlockEl.classList.add('is-visible'); }, 80);
    } else {
      // 해금 엘리먼트가 없으면 새로 생성
      var tip = buildSecretTip(dayEl);
      var newHtml = '<div class="ent-secret-unlock">'
        + '<div class="ent-secret-icon">🔓</div>'
        + '<div class="ent-secret-title">오늘의 비밀 운세 해금!</div>'
        + '<div class="ent-secret-text">' + tip + '</div>'
        + '</div>';
      secretArea.innerHTML = newHtml;
      var newEl = secretArea.querySelector('.ent-secret-unlock');
      if (newEl) {
        setTimeout(function () { newEl.classList.add('is-visible'); }, 80);
      }
    }
  }


  /* ════════════════════════════════════════════════════════
     §7  공개 API
     ════════════════════════════════════════════════════════ */

  w.CodeDestiny_Entertain = {
    version: '2.0',
    calcQuantumHap: calcQuantumHap
  };

})(window);
