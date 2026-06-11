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
    fire:  { today: '화기(火氣)가 심박 리듬을 예민하게 만들 수 있습니다. 과로와 흥분 상태를 피하고 차분한 휴식이 필요합니다.', month: '이달 화 기운은 수면과 열감 리듬을 예민하게 만들 수 있습니다. 취침 전 화면과 자극을 줄여보세요.', year: '올해 화기 흐름은 순환 리듬 관리가 중요합니다. 정기검진에서 관련 지표를 참고할 수 있습니다.' },
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
      monitor: '피로가 오래 누적될 때는 정기검진에서 관련 피로·순환 지표를 참고할 수 있습니다.'
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
      ? (wProf.excessSymptoms + ' 강한 오행은 장점이지만 과열되면 피로 신호가 먼저 나타날 수 있습니다.')
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
      +   '<div style="font-size:.76rem; font-weight:900; letter-spacing:1px; color:#c9a84c;">🧬 선천 체질 베이스</div>'
      +   '<div style="font-size:.68rem; color:rgba(255,255,255,.5);">과열 시 피로 신호 주의</div>'
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
      +   '<div style="font-size:.72rem; font-weight:900; letter-spacing:1px; color:#00e5ff; margin-bottom:6px;">웰니스 관리 가이드</div>'
      +   '<div style="font-size:.8rem; color:rgba(255,255,255,.82); line-height:1.62;">'
      +     '① 식단 방향: ' + dietRx + '<br>'
      +     '② 움직임 방향: ' + exRx + '<br>'
      +     '③ 생활 방향: ' + lifeRx + '<br>'
      +     '④ 관찰 포인트: ' + wProf.monitor
      +   '</div>'
      + '</div>'

      + '<div style="margin-top:8px; font-size:.67rem; color:rgba(255,255,255,.42); line-height:1.45;">본 리포트는 사주 기반 웰니스 참고용이며 의료적 진단을 대체하지 않습니다. 증상이 지속되면 전문의 진료를 권장합니다.</div>'
      + '</div>';
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

  var RPG_STYLE_ID = 'cd-rpg-ui-style-v20260604';
  var RPG_ELEMENT_ORDER = ['wood', 'fire', 'earth', 'metal', 'water'];
  var RPG_ELEMENT_META = {
    wood:  { icon: '🌿', label: '목', short: '성장' },
    fire:  { icon: '🔥', label: '화', short: '표현' },
    earth: { icon: '🪨', label: '토', short: '안정' },
    metal: { icon: '⚔️', label: '금', short: '정리' },
    water: { icon: '💧', label: '수', short: '회복' }
  };
  var RPG_LEVEL_REWARD_DEFS = [
    { level: 3, key: 'secret_fortune_level_3', label: 'Lv.3 비밀 운세 해금', desc: '첫 번째 비밀 운세가 해금됩니다.' },
    { level: 5, key: 'personality_title_level_5', label: 'Lv.5 성향 칭호 해금', desc: '성향을 드러내는 칭호 1개가 해금됩니다.' },
    { level: 7, key: 'passive_expand_level_7', label: 'Lv.7 고유 패시브 확장', desc: '나의 고유 패시브 설명이 더 깊어집니다.' },
    { level: 10, key: 'job_class_expand_level_10', label: 'Lv.10 운명 직업군 확장', desc: '나의 운명 직업군 해석이 확장됩니다.' },
    { level: 15, key: 'growth_report_preview_level_15', label: 'Lv.15 30일 성장 리포트 미리보기', desc: '30일 성장 리포트의 일부를 미리 볼 수 있습니다.' },
    { level: 20, key: 'master_skill_phrase_level_20', label: 'Lv.20 마스터 스킬 강화 문구', desc: '마스터 스킬을 더 강하게 만드는 문구가 해금됩니다.' }
  ];

  function ensureRpgUiStyles() {
    if (document.getElementById(RPG_STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = RPG_STYLE_ID;
    style.textContent = [
      '.ent-rpg-shell{display:flex;flex-direction:column;gap:14px;margin-top:18px}',
      '.ent-rpg-topline{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap}',
      '.ent-rpg-kst{padding:9px 12px;border-radius:999px;background:linear-gradient(135deg,rgba(34,20,70,.92),rgba(13,11,34,.94));border:1px solid rgba(247,214,120,.24);color:#fae8b4;font-size:.7rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;box-shadow:0 10px 24px rgba(0,0,0,.24)}',
      '.ent-rpg-status{display:inline-flex;align-items:center;gap:8px;min-height:28px;padding:6px 12px;border-radius:999px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:rgba(236,224,255,.9);font-size:.72rem;line-height:1.4}',
      '.ent-rpg-status.is-error{border-color:rgba(248,113,113,.28);background:rgba(127,29,29,.28);color:#fecaca}',
      '.ent-rpg-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:12px}',
      '.ent-rpg-card{grid-column:span 12;position:relative;overflow:hidden;border-radius:22px;padding:16px 15px 15px;background:radial-gradient(125% 120% at 50% 0%,rgba(122,76,224,.22) 0%,rgba(25,12,52,.95) 42%,rgba(7,4,20,.98) 100%);border:1px solid rgba(201,160,255,.18);box-shadow:0 18px 42px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.05)}',
      '.ent-rpg-card::before{content:"";position:absolute;inset:-1px;border-radius:inherit;background:linear-gradient(180deg,rgba(255,255,255,.08),transparent 18%,transparent 78%,rgba(255,255,255,.02));pointer-events:none;opacity:.75}',
      '.ent-rpg-card__eyebrow{font-size:.68rem;letter-spacing:.18em;text-transform:uppercase;color:rgba(224,197,255,.72);font-weight:900}',
      '.ent-rpg-card__title{margin-top:4px;font-size:1.05rem;font-weight:900;color:#fff;letter-spacing:-.01em;line-height:1.25}',
      '.ent-rpg-card__sub{margin-top:6px;font-size:.76rem;line-height:1.6;color:rgba(208,190,234,.82)}',
      '.ent-rpg-pill-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}',
      '.ent-rpg-pill{display:inline-flex;align-items:center;gap:6px;padding:7px 11px;border-radius:999px;background:linear-gradient(135deg,rgba(255,255,255,.06),rgba(255,255,255,.02));border:1px solid rgba(246,205,121,.16);color:#fff8d3;font-size:.73rem;font-weight:800;box-shadow:0 8px 16px rgba(0,0,0,.18)}',
      '.ent-rpg-pill strong{color:#ffd86e;font-variant-numeric:tabular-nums}',
      '.ent-rpg-exp-block{margin-top:14px}',
      '.ent-rpg-exp-line{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:.7rem;color:rgba(213,197,239,.86);font-weight:700;margin-bottom:8px}',
      '.ent-rpg-exp-track{height:12px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.06);border:1px solid rgba(255,214,120,.16)}',
      '.ent-rpg-exp-fill{display:block;height:100%;width:var(--rpg-exp-width,0%);border-radius:inherit;background:linear-gradient(90deg,#f7d878 0%,#ffe58f 42%,#ffbf57 100%);box-shadow:0 0 18px rgba(246,200,96,.42);transition:width .55s ease}',
      '.ent-rpg-summary{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}',
      '.ent-rpg-summary span{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:rgba(236,224,255,.88);font-size:.69rem;font-weight:700}',
      '.ent-rpg-summary strong{color:#ffd86e}',
      '.ent-rpg-element-list{display:flex;flex-direction:column;gap:10px;margin-top:12px}',
      '.ent-rpg-element-row{padding:11px 12px;border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.025));border:1px solid rgba(255,255,255,.06)}',
      '.ent-rpg-element-row.is-weak{border-color:rgba(252,165,165,.22);box-shadow:inset 0 0 0 1px rgba(252,165,165,.08)}',
      '.ent-rpg-element-row.is-strong{border-color:rgba(253,224,71,.18)}',
      '.ent-rpg-element-head{display:flex;align-items:center;gap:10px}',
      '.ent-rpg-element-badge{width:34px;height:34px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 30% 25%,rgba(255,255,255,.24),rgba(255,255,255,.05));border:1px solid rgba(255,255,255,.08);box-shadow:0 8px 16px rgba(0,0,0,.18)}',
      '.ent-rpg-element-name{font-size:.9rem;font-weight:900;color:#fff}',
      '.ent-rpg-element-note{font-size:.68rem;color:rgba(214,199,236,.78);margin-top:2px;line-height:1.45}',
      '.ent-rpg-element-pct{margin-left:auto;font-size:.88rem;font-weight:900;color:#ffd86e;font-variant-numeric:tabular-nums}',
      '.ent-rpg-mini-bar{margin-top:10px;height:7px;border-radius:999px;background:rgba(255,255,255,.06);overflow:hidden}',
      '.ent-rpg-mini-bar span{display:block;height:100%;width:var(--rpg-fill,0%);border-radius:inherit;background:linear-gradient(90deg,rgba(247,216,120,.75),rgba(255,184,79,.95));box-shadow:0 0 12px rgba(245,200,88,.32)}',
      '.ent-rpg-element-growth{margin-top:8px;font-size:.72rem;line-height:1.55;color:rgba(245,237,255,.84)}',
      '.ent-rpg-chip-wrap{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}',
      '.ent-rpg-chip{display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:7px 11px;border-radius:999px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:#f4ebff;font-size:.72rem;font-weight:800;line-height:1.3}',
      '.ent-rpg-chip.is-secret{border-color:rgba(246,200,96,.24);color:#ffefbe;background:linear-gradient(135deg,rgba(80,50,14,.72),rgba(37,20,7,.66))}',
      '.ent-rpg-chip.is-lock{border-style:dashed;color:rgba(226,208,255,.72)}',
      '.ent-rpg-quest-grid{display:grid;grid-template-columns:repeat(1,minmax(0,1fr));gap:12px;margin-top:14px}',
      '.ent-rpg-quest-card{position:relative;overflow:hidden;padding:14px;border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.025));border:1px solid rgba(255,255,255,.06);box-shadow:0 14px 28px rgba(0,0,0,.2);transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease}',
      '.ent-rpg-quest-card:hover{transform:translateY(-1px);border-color:rgba(246,205,121,.24);box-shadow:0 18px 34px rgba(0,0,0,.24)}',
      '.ent-rpg-quest-card.is-complete{border-color:rgba(74,222,128,.2);background:linear-gradient(180deg,rgba(34,197,94,.09),rgba(255,255,255,.025))}',
      '.ent-rpg-quest-card.is-just-completed{animation:cdRpgQuestPop .75s ease}',
      '@keyframes cdRpgQuestPop{0%{transform:scale(.98)}40%{transform:scale(1.02)}100%{transform:scale(1)}}',
      '.ent-rpg-quest-top{display:flex;align-items:flex-start;gap:12px}',
      '.ent-rpg-quest-icon{width:42px;height:42px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.15rem;background:radial-gradient(circle at 30% 25%,rgba(255,255,255,.18),rgba(255,255,255,.04));border:1px solid rgba(255,255,255,.08);box-shadow:0 10px 18px rgba(0,0,0,.2)}',
      '.ent-rpg-quest-body{flex:1;min-width:0}',
      '.ent-rpg-quest-badge{display:inline-flex;align-items:center;padding:4px 9px;border-radius:999px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);color:rgba(244,235,255,.86);font-size:.62rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase}',
      '.ent-rpg-quest-title{margin-top:8px;font-size:.95rem;font-weight:900;color:#fff;line-height:1.45}',
      '.ent-rpg-quest-desc{margin-top:7px;font-size:.78rem;line-height:1.55;color:rgba(215,199,236,.84)}',
      '.ent-rpg-quest-reason{margin-top:10px;padding:9px 10px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);font-size:.72rem;line-height:1.5;color:rgba(238,230,255,.82)}',
      '.ent-rpg-quest-reason strong{color:#ffd86e}',
      '.ent-rpg-quest-after{margin-top:10px;padding:10px 11px;border-radius:14px;background:linear-gradient(135deg,rgba(247,216,120,.09),rgba(255,255,255,.03));border:1px solid rgba(247,214,120,.12);font-size:.74rem;line-height:1.7;color:#fff1c6}',
      '.ent-rpg-quest-after strong{color:#ffe08a}',
      '.ent-rpg-quest-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px}',
      '.ent-rpg-exp-tag{display:inline-flex;align-items:center;gap:6px;padding:5px 9px;border-radius:999px;background:linear-gradient(135deg,rgba(91,57,12,.9),rgba(34,20,7,.85));border:1px solid rgba(247,214,120,.2);color:#ffe7aa;font-size:.7rem;font-weight:900}',
      '.ent-rpg-complete-btn{appearance:none;border:0;border-radius:999px;padding:10px 14px;min-width:92px;background:linear-gradient(135deg,#f7d878 0%,#ffbf57 100%);color:#291600;font-size:.8rem;font-weight:900;letter-spacing:.02em;box-shadow:0 10px 20px rgba(0,0,0,.18);cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,opacity .18s ease}',
      '.ent-rpg-complete-btn:hover{transform:translateY(-1px);box-shadow:0 14px 24px rgba(0,0,0,.22)}',
      '.ent-rpg-complete-btn:disabled{cursor:not-allowed;opacity:.55;box-shadow:none;transform:none}',
      '.ent-rpg-complete-btn.is-done{background:linear-gradient(135deg,#38bdf8 0%,#22c55e 100%);color:#f8fffb}',
      '.ent-rpg-secret-panel{padding:14px;border-radius:18px;background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.025));border:1px solid rgba(255,255,255,.06)}',
      '.ent-rpg-secret-panel.is-open{border-color:rgba(247,214,120,.22);background:linear-gradient(135deg,rgba(95,61,14,.72),rgba(24,12,42,.92))}',
      '.ent-rpg-secret-lock{display:flex;flex-direction:column;gap:10px;align-items:flex-start}',
      '.ent-rpg-secret-lock-icon,.ent-rpg-secret-open-icon{width:42px;height:42px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;background:radial-gradient(circle at 30% 25%,rgba(255,255,255,.18),rgba(255,255,255,.04));border:1px solid rgba(255,255,255,.08)}',
      '.ent-rpg-secret-open-icon{background:linear-gradient(135deg,rgba(247,216,120,.3),rgba(255,255,255,.05));border-color:rgba(247,214,120,.22)}',
      '.ent-rpg-secret-title{font-size:1rem;font-weight:900;color:#fff}',
      '.ent-rpg-secret-copy{margin-top:6px;font-size:.78rem;line-height:1.7;color:rgba(235,225,255,.84)}',
      '.ent-rpg-secret-message{margin-top:10px;padding:11px 12px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);color:#fff7cf;font-size:.8rem;line-height:1.7}',
      '.ent-rpg-secret-note{margin-top:10px;font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;color:rgba(246,205,121,.75);font-weight:900}',
      '.ent-rpg-preview-note{margin-top:10px;padding:10px 11px;border-radius:14px;background:rgba(56,189,248,.08);border:1px solid rgba(125,211,252,.16);color:#dff7ff;font-size:.74rem;line-height:1.65}',
      '.ent-rpg-modal{position:fixed;inset:0;z-index:80;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(2,4,12,.7);backdrop-filter:blur(10px)}',
      '.ent-rpg-modal.is-open{display:flex}',
      '.ent-rpg-modal__panel{position:relative;max-width:430px;width:min(430px,100%);padding:18px;border-radius:24px;background:radial-gradient(120% 130% at 50% 0%,rgba(249,221,155,.18) 0%,rgba(18,10,38,.98) 46%,rgba(7,4,20,.99) 100%);border:1px solid rgba(247,214,120,.26);box-shadow:0 24px 50px rgba(0,0,0,.46)}',
      '.ent-rpg-modal__badge{display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;background:linear-gradient(135deg,rgba(247,216,120,.28),rgba(255,255,255,.06));border:1px solid rgba(247,214,120,.24);color:#fff3c0;font-size:.7rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase}',
      '.ent-rpg-modal__title{margin-top:10px;font-size:1.18rem;font-weight:900;color:#fff;line-height:1.35}',
      '.ent-rpg-modal__sub{margin-top:6px;font-size:.8rem;line-height:1.65;color:rgba(230,218,255,.82)}',
      '.ent-rpg-modal__list{display:flex;flex-direction:column;gap:8px;margin-top:14px}',
      '.ent-rpg-modal__item{padding:11px 12px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);color:#f5ebff;font-size:.75rem;line-height:1.65}',
      '.ent-rpg-modal__close{margin-top:14px;display:inline-flex;align-items:center;justify-content:center;min-height:42px;width:100%;border:0;border-radius:14px;background:linear-gradient(135deg,#f7d878 0%,#ffbf57 100%);color:#271500;font-size:.85rem;font-weight:900;cursor:pointer}',
      '.ent-rpg-empty,.ent-rpg-loading{padding:14px;border-radius:18px;background:rgba(255,255,255,.04);border:1px dashed rgba(255,255,255,.12);color:rgba(230,220,255,.74);font-size:.8rem;line-height:1.7}',
      '.cd-rpg-spark{position:absolute;right:10px;top:10px;padding:4px 8px;border-radius:999px;background:rgba(255,255,255,.12);color:#fff;font-size:.68rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase;animation:cdRpgSpark 1s ease forwards;pointer-events:none}',
      '@keyframes cdRpgSpark{0%{opacity:0;transform:translateY(6px) scale(.96)}20%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-10px) scale(1.02)}}',
      '@media (min-width: 768px){.ent-rpg-card--hero{grid-column:span 5}.ent-rpg-card--elements{grid-column:span 4}.ent-rpg-card--abilities{grid-column:span 3}.ent-rpg-quest-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}',
      '@media (min-width: 1100px){.ent-rpg-card--hero{grid-column:span 4}.ent-rpg-card--elements{grid-column:span 4}.ent-rpg-card--abilities{grid-column:span 4}}',
      '@media (max-width: 767px){.ent-rpg-shell{gap:12px}.ent-rpg-card{padding:14px 13px}.ent-rpg-quest-footer{flex-direction:column;align-items:stretch}.ent-rpg-complete-btn{width:100%}.ent-rpg-modal{padding:12px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function escapeRpgHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toRpgNumber(value, fallback) {
    var n = Number(value);
    return isFinite(n) ? n : (fallback || 0);
  }

  function toRpgList(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw.map(function (item) { return String(item || '').trim(); }).filter(Boolean);
    }
    if (typeof raw === 'string') {
      return raw.trim() ? [raw.trim()] : [];
    }
    return [];
  }

  function resolveRpgProfileId() {
    var profileId = '';
    try {
      if (typeof w._cdResolveCurrentProfileIdForAccess === 'function') {
        profileId = String(w._cdResolveCurrentProfileIdForAccess() || '').trim();
      }
    } catch (e) {}
    if (profileId) return profileId;
    try {
      var current = (typeof w.__cdGetCurrentDestinyProfile === 'function' && w.__cdGetCurrentDestinyProfile())
        || w.__cdCurrentDestinyProfile
        || null;
      profileId = String((current && (current.profileId || current.id)) || '').trim();
    } catch (e2) {}
    return profileId;
  }

  function getKstDateString() {
    var d = new Date(Date.now() + 9 * 60 * 60 * 1000);
    return d.getUTCFullYear() + '.' + String(d.getUTCMonth() + 1).padStart(2, '0') + '.' + String(d.getUTCDate()).padStart(2, '0');
  }

  function getQuestIcon(element, tier) {
    var meta = RPG_ELEMENT_META[element] || RPG_ELEMENT_META.earth;
    var suffix = tier === 'core' ? '✦' : (tier === 'normal' ? '✧' : '•');
    return meta.icon + ' ' + suffix;
  }

  function getElementGrowthCue(element, state, quests, completedSet) {
    var meta = RPG_ELEMENT_META[element] || RPG_ELEMENT_META.earth;
    var five = (state.generationMeta && state.generationMeta.fiveElements) || {};
    var yong = toRpgList((state.generationMeta && state.generationMeta.usefulGods && state.generationMeta.usefulGods.yong) || []);
    var hee = toRpgList((state.generationMeta && state.generationMeta.usefulGods && state.generationMeta.usefulGods.hee) || []);
    var lacking = toRpgList(five.lacking || []);
    var dominant = toRpgList(five.dominant || []);
    var matching = null;
    for (var i = 0; i < quests.length; i += 1) {
      if (String(quests[i].element || '') === element && !completedSet.has(String(quests[i].questId || ''))) {
        matching = quests[i];
        break;
      }
    }
    if (!matching) {
      for (var j = 0; j < quests.length; j += 1) {
        if (String(quests[j].element || '') === element) {
          matching = quests[j];
          break;
        }
      }
    }
    var tag = '균형 유지';
    if (lacking.indexOf(element) >= 0) tag = '보완 미션 연결';
    else if (yong.indexOf(element) >= 0) tag = '용신 강화';
    else if (hee.indexOf(element) >= 0) tag = '희신 보조';
    else if (dominant.indexOf(element) >= 0) tag = '과다 진정';
    return { tag: tag, detail: matching ? matching.text : (meta.short + ' 기운을 살리는 오늘의 성장 포인트') };
  }

  function buildGrowthMessage(state) {
    var dayMaster = (state.generationMeta && state.generationMeta.dayMaster) || {};
    var element = String(dayMaster.element || '').trim() || 'earth';
    var map = {
      wood: '작게 시작한 일을 끝까지 키워내는 순간, 오늘의 운이 자랍니다.',
      fire: '표현한 만큼 흐름이 살아납니다. 짧아도 좋으니 드러내세요.',
      earth: '리듬을 고정할수록 다음 날의 길이 단단해집니다.',
      metal: '정리한 만큼 강해집니다. 하나만 덜어내도 충분합니다.',
      water: '잠깐 멈춰 적은 한 줄이, 다음 선택을 정확하게 만듭니다.'
    };
    var message = map[element] || map.earth;
    var streak = toRpgNumber(state.streakDays, 0);
    if (streak >= 7) {
      message += ' 연속 흐름이 길어질수록, 운명의 결은 더 선명해집니다.';
    }
    return message;
  }

  function getRpgElementLabel(element) {
    return (RPG_ELEMENT_META[element] && RPG_ELEMENT_META[element].label) || '운명';
  }

  function formatRpgElementName(element) {
    return (RPG_ELEMENT_META[element] && RPG_ELEMENT_META[element].label) || String(element || '').trim();
  }

  function formatRpgElementList(raw) {
    return toRpgList(raw).map(formatRpgElementName).filter(Boolean).join(', ');
  }

  function resolveRpgElementFromProfile(p) {
    var dg = p && p.d && p.d.g;
    var element = '';
    try {
      element = String((w.GAN && w.GAN[dg] && w.GAN[dg].e) || '').trim();
    } catch (e) {}
    return RPG_ELEMENT_META[element] ? element : 'earth';
  }

  function buildRpgFallbackMeta(state, p) {
    var meta = state.generationMeta && typeof state.generationMeta === 'object' ? state.generationMeta : {};
    var dayElement = String((meta.dayMaster && meta.dayMaster.element) || '').trim();
    if (!RPG_ELEMENT_META[dayElement]) dayElement = resolveRpgElementFromProfile(p);
    var dayStem = String((meta.dayMaster && meta.dayMaster.stemKo) || (p && p.d && p.d.g) || '').trim();
    var scores = meta.fiveElements && meta.fiveElements.scores && typeof meta.fiveElements.scores === 'object'
      ? meta.fiveElements.scores
      : null;
    if (!scores) {
      scores = {};
      RPG_ELEMENT_ORDER.forEach(function (element) {
        scores[element] = element === dayElement ? 32 : 17;
      });
    }
    return Object.assign({}, meta, {
      dayMaster: Object.assign({
        element: dayElement,
        elementKo: getRpgElementLabel(dayElement),
        stemKo: dayStem || '일간'
      }, meta.dayMaster || {}),
      fiveElements: Object.assign({
        scores: scores,
        dominant: [dayElement],
        lacking: RPG_ELEMENT_ORDER.filter(function (element) { return element !== dayElement; }).slice(0, 2)
      }, meta.fiveElements || {}),
      usefulGods: Object.assign({
        yong: [dayElement],
        hee: [],
        gi: []
      }, meta.usefulGods || {}),
      todayDayPillar: Object.assign({
        element: dayElement
      }, meta.todayDayPillar || {})
    });
  }

  function buildRpgFallbackQuests(meta) {
    var dayElement = String((meta.todayDayPillar && meta.todayDayPillar.element) || (meta.dayMaster && meta.dayMaster.element) || 'earth');
    if (!RPG_ELEMENT_META[dayElement]) dayElement = 'earth';
    var weakList = toRpgList(meta.fiveElements && meta.fiveElements.lacking).filter(function (element) { return RPG_ELEMENT_META[element]; });
    var elements = [
      weakList[0] || dayElement,
      weakList[1] || dayElement,
      dayElement
    ];
    return [
      {
        questId: 'preview-balance',
        questType: 'preview_rpg_easy',
        tier: 'easy',
        element: elements[0],
        expReward: 10,
        text: getRpgElementLabel(elements[0]) + ' 기운을 깨우는 작은 행동 하나 정하기',
        description: '서버 기록이 열리기 전에도 오늘의 성장 방향을 먼저 확인할 수 있습니다.',
        reason: '부족한 기운을 작게 보완하면 하루의 리듬이 안정됩니다.',
        afterCompleteMessage: '작은 선택이 운의 결을 다시 세웁니다.'
      },
      {
        questId: 'preview-focus',
        questType: 'preview_rpg_normal',
        tier: 'normal',
        element: elements[1],
        expReward: 15,
        text: '오늘 미룬 일 하나를 끝까지 닫기',
        description: '완료 경험을 쌓아 캐릭터 시트의 성장 흐름을 선명하게 만듭니다.',
        reason: '마무리된 행동은 흩어진 기운을 한곳으로 모읍니다.',
        afterCompleteMessage: '끝낸 일 하나가 다음 레벨의 문을 두드립니다.'
      },
      {
        questId: 'preview-core',
        questType: 'preview_rpg_core',
        tier: 'core',
        element: elements[2],
        expReward: 20,
        text: getRpgElementLabel(dayElement) + ' 코어에 맞는 오늘의 기준 세우기',
        description: '일간의 중심 기운을 기준으로 판단과 행동을 정렬합니다.',
        reason: '나의 중심 기운을 의식하면 선택의 흔들림이 줄어듭니다.',
        afterCompleteMessage: '중심을 세운 하루는 운의 방향을 잃지 않습니다.'
      }
    ];
  }

  function buildRpgTemplate(state, p, options) {
    state = state || {};
    options = options || {};
    var meta = buildRpgFallbackMeta(state, p);
    var hasServerQuests = Array.isArray(state.quests) && state.quests.length > 0;
    var quests = hasServerQuests ? state.quests : buildRpgFallbackQuests(meta);
    var isPreviewMode = !hasServerQuests;
    var completedSet = new Set(toRpgList(state.completedQuestIds));
    var dayMaster = meta.dayMaster || {};
    var usefulGods = meta.usefulGods || {};
    var fiveElements = meta.fiveElements || {};
    var unlockedSkills = toRpgList(state.unlockedSkills);
    var unlockedSecrets = toRpgList(state.unlockedSecretFortunes);
    var unlockedMilestones = toRpgList(state.unlockedMilestoneRewards);
    var currentLevel = toRpgNumber(state.currentLevel, 1);
    var currentLevelExp = toRpgNumber(state.currentLevelExp, 0);
    var nextLevelExp = Math.max(1, toRpgNumber(state.nextLevelExp, 100));
    var todayEarnedExp = toRpgNumber(state.todayEarnedExp, 0);
    var fallbackMaxExp = quests.reduce(function (sum, quest) { return sum + toRpgNumber(quest.expReward, 0); }, 0) || 85;
    var todayMaxExp = Math.max(1, toRpgNumber(state.todayMaxExp, fallbackMaxExp));
    var streakDays = toRpgNumber(state.streakDays, 0);
    var longestStreakDays = toRpgNumber(state.longestStreakDays, 0);
    var questCount = quests.length || 5;
    var completedCount = completedSet.size;
    var expRemain = Math.max(0, nextLevelExp - currentLevelExp);
    var expPct = Math.max(0, Math.min(100, Math.round((currentLevelExp / nextLevelExp) * 100)));
    var isUnlockedSecret = completedCount >= questCount || unlockedSecrets.some(function (key) { return String(key || '').indexOf('daily_complete_') === 0; });
    var isLoading = !!state.loading && isPreviewMode;
    var errText = String(state.errorMessage || state.message || '').trim();
    var profileDayEl = String((meta.todayDayPillar && meta.todayDayPillar.element) || dayMaster.element || 'earth').trim() || 'earth';
    var classLabel = String(dayMaster.stemKo || '').trim();
    var classElementLabel = String(dayMaster.elementKo || '').trim();
    var coreClass = (classLabel || classElementLabel) ? (classLabel ? (classLabel + ' · ' + classElementLabel) : classElementLabel) : '운명 코어';
    var heroSub = '다음 레벨까지 ' + expRemain + ' EXP · 오늘 ' + todayEarnedExp + ' / ' + todayMaxExp + ' EXP · 연속 ' + streakDays + '일';
    var elementScores = {};
    var rawScores = fiveElements.scores && typeof fiveElements.scores === 'object' ? fiveElements.scores : {};
    var scoreTotal = 0;
    for (var s = 0; s < RPG_ELEMENT_ORDER.length; s += 1) {
      var scoreValue = toRpgNumber(rawScores[RPG_ELEMENT_ORDER[s]], 0);
      elementScores[RPG_ELEMENT_ORDER[s]] = scoreValue;
      scoreTotal += scoreValue;
    }
    if (!scoreTotal) scoreTotal = RPG_ELEMENT_ORDER.length * 20;
    var elementHtml = RPG_ELEMENT_ORDER.map(function (element) {
      var metaEntry = RPG_ELEMENT_META[element] || RPG_ELEMENT_META.earth;
      var pct = Math.max(0, Math.round((elementScores[element] || 0) / scoreTotal * 100));
      if (!scoreTotal) pct = 20;
      var cue = getElementGrowthCue(element, state, quests, completedSet);
      var rowClass = 'ent-rpg-element-row';
      if (toRpgList(fiveElements.lacking).indexOf(element) >= 0) rowClass += ' is-weak';
      if (toRpgList(fiveElements.dominant).indexOf(element) >= 0) rowClass += ' is-strong';
      return '<div class="' + rowClass + '">'
        + '<div class="ent-rpg-element-head">'
        +   '<div class="ent-rpg-element-badge">' + metaEntry.icon + '</div>'
        +   '<div>'
        +     '<div class="ent-rpg-element-name">' + escapeRpgHtml(metaEntry.label) + '</div>'
        +     '<div class="ent-rpg-element-note">' + escapeRpgHtml(cue.tag) + '</div>'
        +   '</div>'
        +   '<div class="ent-rpg-element-pct">' + pct + '%</div>'
        + '</div>'
        + '<div class="ent-rpg-mini-bar"><span style="--rpg-fill:' + pct + '%"></span></div>'
        + '<div class="ent-rpg-element-growth">' + escapeRpgHtml(cue.detail || '오늘의 성장 포인트가 기다리고 있습니다.') + '</div>'
        + '</div>';
    }).join('');
    var ownSkillHtml = [];
    if (unlockedSkills.length) {
      ownSkillHtml = ownSkillHtml.concat(unlockedSkills.map(function (item) {
        return '<span class="ent-rpg-chip">✨ ' + escapeRpgHtml(item) + '</span>';
      }));
    }
    if (unlockedMilestones.length) {
      ownSkillHtml = ownSkillHtml.concat(unlockedMilestones.map(function (item) {
        var reward = RPG_LEVEL_REWARD_DEFS.find(function (def) { return def.key === item; });
        return '<span class="ent-rpg-chip is-secret">◆ ' + escapeRpgHtml(reward ? reward.label : item) + '</span>';
      }));
    }
    if (!ownSkillHtml.length) ownSkillHtml.push('<span class="ent-rpg-chip">아직 해금된 스킬이 없습니다</span>');
    var lockedSkillHtml = RPG_LEVEL_REWARD_DEFS.filter(function (def) {
      return unlockedMilestones.indexOf(def.key) < 0 && unlockedSecrets.indexOf(def.key) < 0;
    }).map(function (def) {
      return '<span class="ent-rpg-chip is-lock">🔒 ' + escapeRpgHtml(def.label) + '</span>';
    });
    if (!lockedSkillHtml.length) lockedSkillHtml.push('<span class="ent-rpg-chip is-lock">모든 내부 보상이 해금되었습니다</span>');
    var questHtml = quests.map(function (quest) {
      var done = completedSet.has(String(quest.questId || ''));
      var justCompleted = String(state.justCompletedQuestId || '') && String(state.justCompletedQuestId || '') === String(quest.questId || '');
      var tier = String(quest.tier || '').trim() || 'normal';
      var icon = getQuestIcon(String(quest.element || 'earth'), tier);
      var btnLabel = done ? '완료됨' : '완료';
      return '<article class="ent-rpg-quest-card' + (done ? ' is-complete' : '') + (justCompleted ? ' is-just-completed' : '') + '" data-quest-id="' + escapeRpgHtml(quest.questId) + '">'
        + '<div class="ent-rpg-quest-top">'
        +   '<div class="ent-rpg-quest-icon">' + escapeRpgHtml(icon) + '</div>'
        +   '<div class="ent-rpg-quest-body">'
        +     '<div class="ent-rpg-quest-badge">' + escapeRpgHtml(String(quest.questType || tier).toUpperCase()) + '</div>'
        +     '<div class="ent-rpg-quest-title">' + escapeRpgHtml(quest.text || '') + '</div>'
        +     '<div class="ent-rpg-quest-desc">' + escapeRpgHtml(quest.description || '사주 구조에 맞춰 오늘의 운을 움직이는 행동입니다.') + '</div>'
        +     '<div class="ent-rpg-quest-reason"><strong>사주 이유:</strong> ' + escapeRpgHtml(quest.reason || '오늘의 기운을 맞추는 미션입니다.') + '</div>'
        +     (done ? '<div class="ent-rpg-quest-after"><strong>완료 후 해석:</strong> ' + escapeRpgHtml(quest.afterCompleteMessage || '오늘의 행동은 운의 흐름을 바로잡는 작은 전환점이 됩니다.') + '</div>' : '')
        +   '</div>'
        + '</div>'
        + '<div class="ent-rpg-quest-footer">'
        +   '<div class="ent-rpg-exp-tag">+' + escapeRpgHtml(quest.expReward) + ' EXP</div>'
        +   '<button type="button" class="ent-rpg-complete-btn' + (done ? ' is-done' : '') + '" data-rpg-complete="' + escapeRpgHtml(quest.questId) + '"' + ((done || isPreviewMode) ? ' disabled aria-pressed="' + (done ? 'true' : 'false') + '"' : ' aria-pressed="false"') + '>' + escapeRpgHtml(isPreviewMode ? '미리보기' : btnLabel) + '</button>'
        + '</div>'
        + (done ? '<span class="cd-rpg-spark">COMPLETE</span>' : '')
        + '</article>';
    }).join('');
    var secretMessage = isUnlockedSecret
      ? buildGrowthMessage(state)
      : '모든 미션을 완료하면 오늘의 성장 메시지가 해금됩니다.';
    var secretHtml = isUnlockedSecret
      ? '<div class="ent-rpg-secret-panel is-open">'
        +   '<div class="ent-rpg-secret-open-icon">✦</div>'
        +   '<div class="ent-rpg-secret-title">오늘의 성장 메시지</div>'
        +   '<div class="ent-rpg-secret-copy">서버가 모든 완료 기록을 저장했습니다. 이제 오늘의 비밀 운세를 열어볼 수 있습니다.</div>'
        +   '<div class="ent-rpg-secret-message">' + escapeRpgHtml(secretMessage) + '</div>'
        +   '<div class="ent-rpg-secret-note">UNLOCK SAVED ON SERVER</div>'
        + '</div>'
      : '<div class="ent-rpg-secret-panel">'
        +   '<div class="ent-rpg-secret-lock">'
        +     '<div class="ent-rpg-secret-lock-icon">🔒</div>'
        +     '<div class="ent-rpg-secret-title">오늘의 비밀 운세</div>'
        +     '<div class="ent-rpg-secret-copy">모든 미션을 완료하면 오늘의 성장 메시지가 해금됩니다.</div>'
        +     '<div class="ent-rpg-chip-wrap">'
        +       '<span class="ent-rpg-chip is-lock">진행도 ' + completedCount + ' / ' + questCount + '</span>'
        +       '<span class="ent-rpg-chip is-lock">오늘 ' + todayEarnedExp + ' / ' + todayMaxExp + ' EXP</span>'
        +     '</div>'
        +   '</div>'
        + '</div>';
    var levelUpItems = [];
    if (Array.isArray(state.unlockedRewards) && state.unlockedRewards.length) {
      levelUpItems = state.unlockedRewards.map(function (reward) {
        var rewardLabel = reward.title || reward.rewardKey || reward.rewardType;
        var rewardDesc = reward.description || '';
        return '<div class="ent-rpg-modal__item"><strong style="color:#ffe08a">' + escapeRpgHtml(rewardLabel) + '</strong>' + (rewardDesc ? '<br>' + escapeRpgHtml(rewardDesc) : '') + '</div>';
      });
    }
    if (!levelUpItems.length) {
      levelUpItems.push('<div class="ent-rpg-modal__item">운명의 층이 한 겹 더 열렸습니다.</div>');
    }
    var modalOpen = !!state.flashLevelUp;
    var modalHtml = '<div class="ent-rpg-modal' + (modalOpen ? ' is-open' : '') + '" data-rpg-modal aria-hidden="' + (modalOpen ? 'false' : 'true') + '">'
      +   '<div class="ent-rpg-modal__panel">'
      +     '<div class="ent-rpg-modal__badge">LV. ' + escapeRpgHtml(currentLevel) + ' 달성!</div>'
      +     '<div class="ent-rpg-modal__title">새로운 운명이 열렸습니다</div>'
      +     '<div class="ent-rpg-modal__sub">지금까지의 성장에 따른 보상이 해금되었습니다.</div>'
      +     '<div class="ent-rpg-modal__list">' + levelUpItems.join('') + '</div>'
      +     '<button type="button" class="ent-rpg-modal__close" data-rpg-modal-close>닫기</button>'
      +   '</div>'
      + '</div>';
    var yongDisplay = formatRpgElementList(usefulGods.yong) || '미정';
    var heeDisplay = formatRpgElementList(usefulGods.hee) || '미정';
    var giDisplay = formatRpgElementList(usefulGods.gi) || '미정';
    var abilityTitle = formatRpgElementName(toRpgList(usefulGods.yong)[0] || dayMaster.elementKo || dayMaster.element || '운명') + ' 공명';
    var previewBlock = isPreviewMode
      ? '<div class="ent-rpg-preview-note">운명의 기록이 열리는 동안, 지금 확인 가능한 성장 루트를 먼저 펼쳐드립니다. EXP 저장은 서버 응답 후 활성화됩니다.</div>'
      : '';
    var loadingBlock = isLoading
      ? '<div class="ent-rpg-loading">오늘의 사주 기반 퀘스트를 불러오는 중입니다.</div>'
      : (errText && state.errorState ? '<div class="ent-rpg-empty">서버 응답을 불러오지 못했습니다.<br>' + escapeRpgHtml(errText) + '</div>' : '');
    return '<section class="ent-rpg-shell ent-reveal" id="entRpgSection" data-marker="rpg-character-sheet-fallback-v20260607" data-dayel="' + escapeRpgHtml(profileDayEl) + '" data-state="' + escapeRpgHtml(state.errorState ? 'error' : (isLoading ? 'loading' : 'ready')) + '" data-profile-id="' + escapeRpgHtml(state.profileId || '') + '" data-quest-date="' + escapeRpgHtml(state.questDateKst || '') + '">'
      + '<div class="ent-rpg-topline">'
      +   '<div>'
      +     '<div class="ent-quest-tag">⚡ DAILY QUEST SYSTEM</div>'
      +     '<div class="ent-quest-title">오늘의 일일 퀘스트</div>'
      +     '<div class="ent-quest-sub">서버가 사주 구조에 맞춰 오늘의 미션을 배정합니다 · KST 자정 기준 리셋</div>'
      +   '</div>'
      +   '<div class="ent-rpg-kst">KST · ' + getKstDateString() + '</div>'
      + '</div>'
      + (state.message ? '<div class="ent-rpg-status">' + escapeRpgHtml(state.message) + '</div>' : '')
      + (state.errorState ? '<div class="ent-rpg-status is-error">' + escapeRpgHtml(errText || '서버와 연결되지 않았습니다.') + '</div>' : '')
      + '<div class="ent-rpg-grid">'
      +   '<section class="ent-rpg-card ent-rpg-card--hero">'
      +     '<div class="ent-rpg-card__eyebrow">CORE CLASS</div>'
      +     '<div class="ent-rpg-card__title" id="entRpgCoreClass">' + escapeRpgHtml(coreClass) + '</div>'
      +     '<div class="ent-rpg-card__sub" id="entRpgHeroSub">' + escapeRpgHtml(heroSub) + '</div>'
      +     '<div class="ent-rpg-pill-row">'
      +       '<span class="ent-rpg-pill">LV <strong id="entRpgLevel">' + escapeRpgHtml(currentLevel) + '</strong></span>'
      +       '<span class="ent-rpg-pill">NEXT <strong id="entRpgRemain">' + escapeRpgHtml(expRemain) + '</strong></span>'
      +       '<span class="ent-rpg-pill">TODAY <strong id="entRpgTodayExp">' + escapeRpgHtml(todayEarnedExp) + '</strong></span>'
      +       '<span class="ent-rpg-pill">STREAK <strong id="entRpgStreak">' + escapeRpgHtml(streakDays) + '</strong></span>'
      +     '</div>'
      +     '<div class="ent-rpg-exp-block">'
      +       '<div class="ent-rpg-exp-line"><span>EXP BAR</span><span id="entRpgExpText">' + escapeRpgHtml(currentLevelExp + ' / ' + nextLevelExp + ' EXP') + '</span></div>'
      +       '<div class="ent-rpg-exp-track"><span class="ent-rpg-exp-fill" style="--rpg-exp-width:' + expPct + '%"></span></div>'
      +     '</div>'
      +     '<div class="ent-rpg-summary">'
      +       '<span>오늘 획득 <strong>' + escapeRpgHtml(todayEarnedExp) + ' / ' + escapeRpgHtml(todayMaxExp) + ' EXP</strong></span>'
      +       '<span>연속 완료 <strong>' + escapeRpgHtml(streakDays) + '일</strong></span>'
      +       '<span>최장 기록 <strong>' + escapeRpgHtml(longestStreakDays) + '일</strong></span>'
      +     '</div>'
      +   '</section>'
      +   '<section class="ent-rpg-card ent-rpg-card--elements">'
      +     '<div class="ent-rpg-card__eyebrow">FIVE ELEMENTS</div>'
      +     '<div class="ent-rpg-card__title">오행 성장 포인트</div>'
      +     '<div class="ent-rpg-card__sub">오늘의 성장 포인트를 미션과 연결해, 부족한 기운은 채우고 과한 기운은 가라앉힙니다.</div>'
      +     '<div class="ent-rpg-element-list">' + elementHtml + '</div>'
      +   '</section>'
      +   '<section class="ent-rpg-card ent-rpg-card--abilities">'
      +     '<div class="ent-rpg-card__eyebrow">INNATE ABILITY</div>'
      +     '<div class="ent-rpg-card__title">' + escapeRpgHtml(abilityTitle) + '</div>'
      +     '<div class="ent-rpg-card__sub">용신 ' + escapeRpgHtml(yongDisplay) + ' · 희신 ' + escapeRpgHtml(heeDisplay) + ' · 기신 ' + escapeRpgHtml(giDisplay) + '</div>'
      +     '<div class="ent-rpg-card__eyebrow" style="margin-top:14px">MASTER SKILL</div>'
      +     '<div class="ent-rpg-card__title" style="font-size:.98rem">' + escapeRpgHtml((dayMaster.stemKo || '일간') + '의 본질') + '</div>'
      +     '<div class="ent-rpg-card__sub">오늘의 운명은 ' + escapeRpgHtml((dayMaster.stemKo || '일간') + ' ' + (dayMaster.elementKo || '오행')) + '에서 가장 선명하게 드러납니다.</div>'
      +     '<div class="ent-rpg-card__eyebrow" style="margin-top:14px">OWNED SKILLS</div>'
      +     '<div class="ent-rpg-chip-wrap">' + ownSkillHtml.join('') + '</div>'
      +     '<div class="ent-rpg-card__eyebrow" style="margin-top:14px">LOCKED SKILLS</div>'
      +     '<div class="ent-rpg-chip-wrap">' + lockedSkillHtml.join('') + '</div>'
      +   '</section>'
      +   '<section class="ent-rpg-card ent-rpg-card--quests">'
      +     '<div class="ent-rpg-card__eyebrow">TODAY\'S QUESTS</div>'
      +     '<div class="ent-rpg-card__title">오늘의 일일 퀘스트</div>'
      +     '<div class="ent-rpg-card__sub">퀘스트를 완료할수록 서버에 EXP가 누적되고, 레벨업과 내부 보상이 해금됩니다.</div>'
      +     loadingBlock
      +     previewBlock
      +     '<div class="ent-rpg-summary" style="margin-top:12px">'
      +       '<span>완료 <strong>' + escapeRpgHtml(completedCount) + ' / ' + escapeRpgHtml(questCount) + '</strong></span>'
      +       '<span>오늘 EXP <strong>' + escapeRpgHtml(todayEarnedExp) + ' / ' + escapeRpgHtml(todayMaxExp) + '</strong></span>'
      +       '<span>사주 키워드 <strong>' + escapeRpgHtml((RPG_ELEMENT_META[profileDayEl] && RPG_ELEMENT_META[profileDayEl].label) || profileDayEl) + '</strong></span>'
      +     '</div>'
      +     '<div class="ent-rpg-quest-grid" id="entRpgQuestList">' + questHtml + '</div>'
      +   '</section>'
      +   '<section class="ent-rpg-card ent-rpg-card--secret">'
      +     '<div class="ent-rpg-card__eyebrow">TODAY\'S SECRET FORTUNE</div>'
      +     '<div class="ent-rpg-card__title">오늘의 비밀 운세</div>'
      +     '<div class="ent-rpg-card__sub">모든 미션을 완료하면 오늘의 성장 메시지가 해금되고 서버에 기록됩니다.</div>'
      +     secretHtml
      +   '</section>'
      + '</div>'
      + modalHtml
      + '</section>';
  }

  function renderRpgSection(root, state, p) {
    if (!root) return;
    ensureRpgUiStyles();
    root.innerHTML = buildRpgTemplate(state || {}, p || {});
    root.dataset.profileId = String((state && state.profileId) || root.dataset.profileId || '');
    root.dataset.state = String((state && state.errorState) ? 'error' : ((state && state.loading) ? 'loading' : 'ready'));
    root.dataset.questDate = String((state && state.questDateKst) || root.dataset.questDate || '');
    bindRpgInteractions(root, p || {});
  }

  function bindRpgInteractions(root, p) {
    if (!root || root.__rpgBound) return;
    root.__rpgBound = true;
    root.addEventListener('click', function (event) {
      var completeBtn = event.target && event.target.closest ? event.target.closest('[data-rpg-complete]') : null;
      if (completeBtn && root.contains(completeBtn)) {
        event.preventDefault();
        if (completeBtn.disabled) return;
        requestRpgQuestCompletion(root, String(completeBtn.getAttribute('data-rpg-complete') || ''), p);
        return;
      }

      var closeBtn = event.target && event.target.closest ? event.target.closest('[data-rpg-modal-close]') : null;
      if (closeBtn && root.contains(closeBtn)) {
        var modal = root.querySelector('[data-rpg-modal]');
        if (modal) {
          modal.classList.remove('is-open');
          modal.setAttribute('aria-hidden', 'true');
        }
      }
    });
  }

  async function loadRpgStatus(root, p, transientState) {
    var profileId = resolveRpgProfileId();
    var questRoot = root || document.getElementById('entRpgSection');
    if (!questRoot) return;
    if (!profileId) {
      renderRpgSection(questRoot, { loading: false, errorState: true, errorMessage: '프로필을 찾을 수 없습니다.' }, p);
      return;
    }
    questRoot.dataset.profileId = profileId;
    renderRpgSection(questRoot, { loading: true, profileId: profileId, message: '서버에서 오늘의 운명을 불러오는 중입니다.' }, p);
    try {
      var params = new URLSearchParams();
      params.set('profileId', profileId);
      var response = await fetch('/api/rpg/status?' + params.toString(), {
        cache: 'no-store',
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      var payload = await response.json().catch(function () { return null; });
      if (!response.ok || !payload || payload.ok === false) {
        renderRpgSection(questRoot, {
          loading: false,
          errorState: true,
          errorMessage: (payload && payload.message) || '오늘의 RPG 상태를 불러오지 못했습니다.',
          profileId: profileId
        }, p);
        return;
      }
      var nextState = Object.assign({}, payload, transientState || {});
      renderRpgSection(questRoot, nextState, p);
      if (nextState.flashLevelUp) {
        var modal = questRoot.querySelector('[data-rpg-modal]');
        if (modal) {
          modal.classList.add('is-open');
          modal.setAttribute('aria-hidden', 'false');
        }
      }
    } catch (error) {
      renderRpgSection(questRoot, {
        loading: false,
        errorState: true,
        errorMessage: '서버와 연결되지 않았습니다. 잠시 후 다시 시도하세요.',
        profileId: profileId
      }, p);
    }
  }

  async function requestRpgQuestCompletion(root, questId, p) {
    if (!root || !questId) return;
    var button = null;
    var questButtons = root.querySelectorAll('[data-rpg-complete]');
    for (var i = 0; i < questButtons.length; i += 1) {
      if (String(questButtons[i].getAttribute('data-rpg-complete') || '') === questId) {
        button = questButtons[i];
        break;
      }
    }
    if (button) {
      button.disabled = true;
    }
    try {
      var profileId = String(root.dataset.profileId || resolveRpgProfileId() || '').trim();
      var response = await fetch('/api/rpg/complete', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ profileId: profileId, questId: questId })
      });
      var payload = await response.json().catch(function () { return null; });
      if (!response.ok || !payload || payload.ok === false) {
        if (response.status === 409 || (payload && String(payload.message || '') === '이미 완료한 미션입니다.')) {
          await loadRpgStatus(root, p);
          return;
        }
        var failMessage = (payload && payload.message) || '퀘스트 완료에 실패했습니다.';
        renderRpgSection(root, Object.assign({
          loading: false,
          errorState: true,
          errorMessage: failMessage,
          profileId: profileId
        }, payload || {}), p);
        return;
      }
      var nextState = Object.assign({}, payload, {
        justCompletedQuestId: questId,
        flashLevelUp: !!payload.leveledUp
      });
      renderRpgSection(root, nextState, p);
      if (payload.leveledUp) {
        var modal = root.querySelector('[data-rpg-modal]');
        if (modal) {
          modal.classList.add('is-open');
          modal.setAttribute('aria-hidden', 'false');
        }
      }
    } catch (error) {
      renderRpgSection(root, {
        loading: false,
        errorState: true,
        errorMessage: '퀘스트 완료 요청을 처리하지 못했습니다.',
        profileId: String(root.dataset.profileId || '')
      }, p);
    }
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
    },
    observer: {
      title: '매력 운영 가이드: 저자극 관찰자형',
      desc: '신중함과 절제가 매력의 중심입니다. 반응이 늦어 보일 수 있지만, 충분히 본 뒤 움직일수록 선택의 밀도가 높아지는 타입입니다.',
      tips: [
        '좋고 싫음은 크게 말하지 않아도 짧은 신호로 먼저 남기기',
        '관찰이 길어질 때는 오늘 안에 결정할 작은 기준 1개를 정하기',
        '조용한 매력이 무관심으로 읽히지 않도록 리액션을 한 박자만 더 보여주기'
      ],
      tags: ['신중함', '관찰력', '절제']
    },
    transformer: {
      title: '매력 운영 가이드: 과몰입 변신형',
      desc: '식상과 상관 축이 살아나면 순간 반응성과 표현력이 확 올라옵니다. 분위기를 바꾸는 힘이 있지만, 몰입의 출구를 정해야 매력이 오래갑니다.',
      tips: [
        '몰입이 올라올 때 말의 결론을 먼저 정하고 표현하기',
        '분위기를 뒤집은 뒤에는 상대가 따라올 시간을 잠깐 남기기',
        '반응이 커진 날은 하루 끝에 에너지 회수 시간을 따로 두기'
      ],
      tags: ['순간 몰입', '분위기 반전', '반응성']
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

  function getTetoEgenBoneAdvice(result) {
    var common = {
      teto: [
        {
          title: '내가 진짜 원하는 걸 힘으로 밀어붙이는 습관',
          punch: '강하게 보이는 것과 원하는 것을 정확히 말하는 것은 다릅니다.',
          why: '주도권이 흔들릴 때 바로 결론을 내리면 상대는 설득보다 압박을 먼저 느낄 수 있습니다.',
          fix: '결론을 말하기 전, 원하는 것과 양보 가능한 것을 한 문장씩 분리해 말해보세요.'
        },
        {
          title: '가까운 사람이 헷갈리는 이유',
          punch: '도와주는 마음이 커도 말투가 날카로우면 통제로 읽힙니다.',
          why: '테토 에너지는 해결 속도가 빠른 대신, 상대의 감정 온도를 건너뛰기 쉽습니다.',
          fix: '해결책 앞에 "네 입장에서는 그럴 수 있겠다" 한 문장만 붙이면 체감 온도가 달라집니다.'
        },
        {
          title: '추진력이 번아웃으로 바뀌는 순간',
          punch: '다 이기려는 마음이 계속되면 결국 나 자신과도 싸우게 됩니다.',
          why: '승부욕은 성과를 만들지만, 회복 없이 쓰면 관계와 컨디션을 동시에 태웁니다.',
          fix: '오늘은 반드시 이기는 목표 1개와 힘을 빼도 되는 목표 1개를 따로 정하세요.'
        }
      ],
      egen: [
        {
          title: '내가 진짜 원하는 걸 숨기는 습관',
          punch: '다 맞춰주는 것처럼 보여도 속으로는 이미 여러 번 서운했을 수 있습니다.',
          why: '에겐 에너지는 분위기를 살피는 힘이 강해서 자기 욕구를 뒤로 미루기 쉽습니다.',
          fix: '거절 대신 침묵하지 말고, "이번엔 어렵지만 다음엔 가능해"처럼 경계가 있는 문장을 써보세요.'
        },
        {
          title: '가까운 사람이 헷갈리는 이유',
          punch: '마음은 깊은데 표현 기준이 들쭉날쭉하면 상대는 확신을 못 잡습니다.',
          why: '감정 신호를 많이 읽는 만큼, 스스로도 상대 반응에 맞춰 계속 톤을 바꾸기 때문입니다.',
          fix: '좋으면 좋다고, 불편하면 불편하다고 짧게라도 표시하세요. 선명함이 관계를 편하게 만듭니다.'
        },
        {
          title: '배려가 과몰입으로 바뀌는 순간',
          punch: '상대 감정을 다 책임지려는 순간, 다정함은 피로가 됩니다.',
          why: '공감력이 높을수록 남의 감정을 내 숙제처럼 들고 오기 쉽습니다.',
          fix: '대화 후 바로 3분만 혼자 호흡하며 "내 감정/상대 감정"을 분리해 적어보세요.'
        }
      ],
      neutral: [
        {
          title: '내가 진짜 원하는 걸 숨기는 습관',
          punch: '당신은 균형 잡힌 사람처럼 보이지만, 사실은 선택을 미루기 위해 균형이라는 말을 쓰는 순간이 있습니다.',
          why: '테토와 에겐을 모두 쓸 수 있어서 장점이 넓지만, 그만큼 "지금은 어느 쪽으로 가야 하지?"라는 판단 피로가 생깁니다.',
          fix: '완벽한 중간값을 찾기보다 오늘은 60점짜리 선택이라도 먼저 해보세요.'
        },
        {
          title: '가까운 사람이 헷갈리는 이유',
          punch: '상황마다 다른 얼굴을 보여주는 능력이 좋지만, 가까운 사람은 진짜 속마음을 놓칠 수 있습니다.',
          why: '겉으로는 부드럽게 맞추다가도 속으로는 실속과 기준을 계산하기 때문에 신호가 엇갈릴 때가 있습니다.',
          fix: '중요한 관계에서는 "나는 지금 조심스럽지만 마음은 있다"처럼 현재 모드를 직접 말해주세요.'
        },
        {
          title: '균형감이 우유부단함으로 바뀌는 순간',
          punch: '모두를 이해하려다 보면 결국 내 선택만 늦어질 수 있습니다.',
          why: '양쪽 입장을 다 보는 힘은 좋지만, 결론을 내리는 책임까지 미루면 에너지가 흩어집니다.',
          fix: '팩트 2개, 감정 1개, 오늘의 결론 1개만 적고 그 기준으로 움직이세요.'
        }
      ],
      observer: [
        {
          title: '내가 진짜 원하는 걸 너무 늦게 보여주는 습관',
          punch: '조용함이 매력이어도, 아무 신호도 없으면 무관심처럼 보일 수 있습니다.',
          why: '신중하게 관찰하는 시간이 길어질수록 상대는 당신의 마음이 어디에 있는지 읽기 어려워집니다.',
          fix: '오늘은 좋은 것 하나, 싫은 것 하나를 짧게라도 먼저 말해보세요.'
        },
        {
          title: '가까운 사람이 헷갈리는 이유',
          punch: '속으로는 많이 보고 있는데 겉으로 표현이 적으면 상대는 거리를 느낍니다.',
          why: '반응을 아끼는 방식이 자기 보호에는 좋지만, 관계에서는 정보 부족으로 읽힐 수 있습니다.',
          fix: '대답이 늦어질 때는 "생각 중이야"라는 중간 신호를 먼저 남기세요.'
        },
        {
          title: '절제가 기회 지연으로 바뀌는 순간',
          punch: '더 확실해질 때까지 기다리다 보면 좋은 타이밍이 지나갈 수 있습니다.',
          why: '관찰력은 강점이지만, 작은 선택까지 완벽한 근거를 찾으면 움직임이 무거워집니다.',
          fix: '오늘은 70% 확신이 생긴 일 하나를 작게 실행해보세요.'
        }
      ],
      transformer: [
        {
          title: '내가 진짜 원하는 걸 순간 감정으로 덮는 습관',
          punch: '몰입이 올라온 순간의 말은 매력적이지만, 결론이 없으면 소음처럼 남을 수 있습니다.',
          why: '식상과 상관 축이 강하면 반응이 빠르고 표현이 살아나지만, 감정의 속도가 판단보다 앞설 수 있습니다.',
          fix: '말하기 전 "내가 지금 원하는 결론은 무엇인가"를 한 문장으로 먼저 정하세요.'
        },
        {
          title: '가까운 사람이 헷갈리는 이유',
          punch: '평소와 몰입했을 때의 온도차가 커서 상대는 갑자기 사람이 바뀐 것처럼 느낄 수 있습니다.',
          why: '표현성이 특정 상황에서 확 켜지면, 주변은 그 반전의 이유를 바로 따라잡지 못합니다.',
          fix: '반응이 커진 뒤에는 "방금 내가 꽂혀서 말이 빨라졌어"처럼 상황 설명을 붙이세요.'
        },
        {
          title: '분위기 반전이 피로로 바뀌는 순간',
          punch: '계속 강한 리액션으로 판을 끌고 가면 나중에는 내가 먼저 지칩니다.',
          why: '반응성은 분위기를 살리지만, 회수 시간 없이 쓰면 말맛이 예민함으로 바뀔 수 있습니다.',
          fix: '몰입 대화 뒤에는 10분만 알림을 끄고 에너지를 다시 회수하세요.'
        }
      ]
    };
    return common[result] || common.neutral;
  }

  function buildTetoEgeDeepSection(p, power, hapData) {
    var vibe = (w.calculateHormoneVibe) ? w.calculateHormoneVibe(p, power) : { result: 'neutral' };
    var displayProfile = resolveTetoEgenProfile(normalizeTetogenVibe(vibe));
    var result = displayProfile.key || vibe.result || 'neutral';

    var guide = TETO_EGEN_GUIDE[result] || TETO_EGEN_GUIDE.neutral;
    var modeClass = (result === 'teto') ? 'mode-teto' : (result === 'egen' ? 'mode-egen' : 'mode-neutral');
    var modeLabelMap = {
      teto: '테토 우세 리드 모드',
      egen: '에겐 우세 조율 모드',
      observer: '저자극 관찰 모드',
      transformer: '과몰입 변신 모드',
      neutral: '하이브리드 밸런스 모드'
    };
    var modeLabel = modeLabelMap[result] || modeLabelMap.neutral;
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

    var adviceHtml = renderTetogenAdviceCards(result, modeClass);

    return '<div class="ent-te-deep-wrap">'
      + guideHtml
      + adviceHtml
      + '</div>';
  }

  function clampTetoEgenPercent(score) {
    var numeric = Number(score);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.min(100, Math.round(numeric * 1.2)));
  }

  function resolveTetoEgenProfile(vibe) {
    var teto = getTetogenSafeNumber(vibe && vibe.tetoScore);
    var egen = getTetogenSafeNumber(vibe && vibe.egenScore);
    var hasScores = !!(vibe && vibe.hasTetoScore && vibe.hasEgenScore);
    var cnt = (vibe && vibe.cnt) || {};
    var siksang = getTetogenSafeNumber(vibe && vibe.siksang);
    var sanggwan = getTetogenSafeNumber(cnt['상관']);
    var gap = Math.abs(teto - egen);
    var scoreTotal = teto + egen;
    var hasDistribution = hasTetogenDistribution(vibe);
    var expressiveStrong = hasDistribution && (siksang >= 3 || sanggwan >= 2 || (siksang >= 2 && sanggwan >= 1));
    var expressiveWeak = hasDistribution && siksang <= 0 && sanggwan <= 0;
    var lowSignal = hasScores && ((teto <= 34 && egen <= 34) || (scoreTotal <= 78 && expressiveWeak));
    var type = 'hybrid';

    // 기존 계산 엔진이 준 점수와 십성 분포만 사용해 표시용 캐릭터 타입을 고른다.
    // 기준이 애매하면 과장하지 않고 하이브리드 밸런서형으로 되돌린다.
    if (lowSignal) {
      type = 'observer';
    } else if (expressiveStrong && (!hasScores || gap <= 18)) {
      type = 'transformer';
    } else if (hasScores && gap <= 10) {
      type = 'hybrid';
    } else if (hasScores && teto - egen >= 12) {
      type = 'teto';
    } else if (hasScores && egen - teto >= 12) {
      type = 'egen';
    } else if (expressiveStrong) {
      type = 'transformer';
    }

    if (type === 'teto') {
      return {
        key: 'teto',
        title: '테토 우세형 🔥',
        sub: '추진력과 결정력으로 흐름을 먼저 정리하는 현실 감각형 캐릭터',
        summary: '테토 점수가 더 선명하게 올라와 있습니다. 고민이 길어질 때도 결국은 실행, 효율, 손익을 기준으로 판을 정리하는 쪽에 가깝습니다. 다만 리드가 강해질수록 상대가 따라올 시간을 조금 남겨두면 매력이 더 안정적으로 보입니다.',
        badges: ['추진력', '결정력', '현실 감각', '리드'],
        save: '나는 테토 우세형. 망설임보다 실행으로 판을 정리하고, 필요한 순간 먼저 움직이는 타입이다.'
      };
    }

    if (type === 'egen') {
      return {
        key: 'egen',
        title: '에겐 우세형 ✨',
        sub: '관계 감각과 유연함으로 분위기를 조율하는 감정 센스형 캐릭터',
        summary: '에겐 점수가 더 자연스럽게 드러납니다. 사람의 말투, 표정, 공기의 변화를 빨리 읽고 그 흐름에 맞춰 부드럽게 움직이는 편입니다. 배려가 길어질수록 내 기준을 늦게 말할 수 있으니, 중요한 선은 초반에 가볍게 밝혀두는 것이 좋습니다.',
        badges: ['관계 감각', '유연함', '분위기 조율', '감정 센스'],
        save: '나는 에겐 우세형. 분위기를 읽고 관계의 온도를 맞추며, 부드럽게 흐름을 바꾸는 타입이다.'
      };
    }

    if (type === 'observer') {
      return {
        key: 'observer',
        title: '저자극 관찰자형 🌙',
        sub: '신중함과 절제로 천천히 존재감이 올라오는 늦게 뜨는 매력형 캐릭터',
        summary: '테토와 에겐 에너지가 모두 과하게 튀기보다 낮은 온도로 깔려 있습니다. 처음부터 강하게 표현하기보다는 관찰하고, 재고, 확신이 생긴 뒤 움직이는 쪽입니다. 조용해서 약한 타입은 아니고, 타이밍을 고를수록 매력이 선명해지는 편입니다.',
        badges: ['신중함', '관찰력', '절제', '늦게 뜨는 매력'],
        save: '나는 저자극 관찰자형. 크게 흔들지 않아도, 오래 볼수록 결이 드러나는 타입이다.'
      };
    }

    if (type === 'transformer') {
      return {
        key: 'transformer',
        title: '과몰입 변신형 ⚡',
        sub: '표현성과 반응성이 살아 있어 순간 몰입으로 분위기를 뒤집는 캐릭터',
        summary: '식상이나 상관 축이 또렷하게 잡히면 평소에는 잠잠해 보여도 특정 주제, 사람, 상황 앞에서 반응성이 확 올라옵니다. 말맛과 표정 변화가 빠르고, 몰입하는 순간에는 주변 분위기를 예상 밖으로 바꾸는 힘이 있습니다. 다만 즉흥 반응이 길어지면 피로가 쌓이니, 끝맺는 타이밍을 정해두면 좋습니다.',
        badges: ['순간 몰입', '분위기 반전', '반응성', '예측불가 매력'],
        save: '나는 과몰입 변신형. 조용히 있다가도 꽂히는 순간 분위기를 바꾸는 타입이다.'
      };
    }

    return {
      key: 'neutral',
      title: '하이브리드 밸런서 🌀',
      sub: '테토와 에겐 사이를 자유롭게 오가는 상황 적응형 캐릭터',
      summary: '당신은 한쪽으로 딱 잘라 분류하기 어려운 하이브리드형입니다. 테토의 현실 감각과 에겐의 부드러운 적응력이 동시에 섞여 있어, 상황에 따라 분위기를 바꾸는 능력이 좋습니다. 밀어붙일 때와 스며들 때를 본능적으로 구분하는 편입니다.',
      badges: ['전환력', '적응력', '균형감', '다중 페르소나'],
      save: '나는 테토와 에겐 사이를 오가는 하이브리드 밸런서. 조용하지만, 필요할 때는 정확히 움직이는 타입이다.'
    };
  }

  function getTetoEnergyCopy(score) {
    if (score >= 70) return '앞장서서 판을 정리하고 결론을 내는 힘이 강합니다. 다만 속도가 빠른 만큼 상대의 감정 온도도 함께 확인하면 매력이 더 선명해집니다.';
    if (score >= 45) return '강하게 밀어붙이는 타입은 아니어도, 필요할 때 실속 있게 결정하는 힘이 있습니다.';
    return '강하게 앞장서는 타입은 아니지만, 현실 감각과 손익 판단은 조용히 살아 있습니다.';
  }

  function getEgenEnergyCopy(score) {
    if (score >= 70) return '분위기와 감정 흐름을 빠르게 읽습니다. 다정함이 장점이지만, 과몰입 경계선을 세우면 훨씬 편해집니다.';
    if (score >= 45) return '부드럽게 맞추는 능력이 살아 있습니다. 다만 무조건 순한 타입이라기보다 필요한 순간에는 기준도 세웁니다.';
    return '감정에 크게 휩쓸리기보다 한 발 떨어져 관찰하는 편입니다. 표현을 조금 더하면 관계 신호가 선명해집니다.';
  }

  function buildTetoEgenIngredientRows(vibe) {
    var cnt = (vibe && vibe.cnt) || {};
    var rows = [
      {
        label: '재성',
        count: Number(vibe && vibe.jaesung || 0),
        tags: '현실 감각 · 계산력 · 실속 · 소유욕',
        text: '재성이 ' + Number(vibe && vibe.jaesung || 0) + '칸이라 현실 감각은 꽤 살아 있습니다. 단순히 감정으로만 움직이기보다 "이게 나한테 실속이 있나?"를 은근히 계산하는 편입니다.'
      },
      {
        label: '식상/상관',
        count: Number(vibe && vibe.siksang || 0),
        tags: '표현력 · 센스 · 반응성 · 말맛',
        text: '식상 축은 ' + Number(vibe && vibe.siksang || 0) + '칸이고, 상관은 ' + Number(cnt['상관'] || 0) + '칸입니다. 그래서 조용해 보여도 말맛, 센스, 반응 속도가 묘하게 살아납니다.'
      },
      {
        label: '편인',
        count: Number(cnt['편인'] || 0),
        tags: '독특한 감각 · 관찰력 · 내면 세계',
        text: '편인이 ' + Number(cnt['편인'] || 0) + '칸이라 남들이 쉽게 이해하지 못하는 취향과 관찰 포인트가 있습니다. 평범한 답보다 "나만 아는 결"을 더 신뢰하는 쪽입니다.'
      },
      {
        label: '관성',
        count: Number(vibe && vibe.gwansung || 0),
        tags: '책임감 · 기준 · 사회적 페르소나',
        text: '관성이 ' + Number(vibe && vibe.gwansung || 0) + '칸이라 완전히 자유분방한 사람은 아닙니다. 겉으로는 편해 보여도, 속에는 지켜야 하는 기준과 체면 감각이 있습니다.'
      },
      {
        label: '비겁',
        count: Number(vibe && vibe.bigyuk || 0),
        tags: '자기 주장 · 경쟁심 · 독립성',
        text: '비겁은 ' + Number(vibe && vibe.bigyuk || 0) + '칸입니다. 자기 주장이 과하게 튀는 타입은 아니어도, 중요한 순간에는 "내 방식"을 지키려는 독립성이 올라옵니다.'
      }
    ];

    return rows.map(function (row) {
      return '<article style="border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.055);border-radius:16px;padding:13px 14px;box-shadow:0 12px 28px rgba(8,6,24,.18);">'
        + '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:7px;">'
        + '<b style="color:#fff;font-size:.92rem;">' + escapeRpgHtml(row.label) + '</b>'
        + '<span style="display:inline-flex;align-items:center;justify-content:center;min-width:42px;border-radius:999px;border:1px solid rgba(253,230,138,.38);background:rgba(253,230,138,.12);color:#fde68a;font-size:.72rem;font-weight:900;">' + row.count + '칸</span>'
        + '</div>'
        + '<div style="font-size:.72rem;color:#c4b5fd;font-weight:800;margin-bottom:7px;">' + escapeRpgHtml(row.tags) + '</div>'
        + '<p style="margin:0;color:rgba(241,245,249,.82);font-size:.82rem;line-height:1.68;">' + escapeRpgHtml(row.text) + '</p>'
        + '</article>';
    }).join('');
  }

  function buildTetoEgenModeCards(profile) {
    var isTeto = profile.key === 'teto';
    var isEgen = profile.key === 'egen';
    var modes = [
      {
        icon: '💘',
        title: '연애 모드',
        seen: isTeto ? '마음이 생기면 행동으로 빠르게 보여주려 합니다.' : (isEgen ? '상대의 기분과 신호를 먼저 살피며 천천히 스며듭니다.' : '처음부터 확 불타기보다는 상대를 관찰하며 천천히 마음을 엽니다.'),
        inner: isTeto ? '내 사람이 되면 확실히 챙기고 싶습니다.' : (isEgen ? '좋아할수록 더 조심스러워지고 표현 타이밍을 재게 됩니다.' : '신뢰가 생기면 은근히 오래 가고, 상대의 생활 패턴까지 챙기는 실속형 애정 표현이 나옵니다.'),
        strength: isTeto ? '확신을 주는 행동력' : (isEgen ? '상대 마음을 편하게 만드는 섬세함' : '편안함과 실속을 같이 주는 애정 방식'),
        caution: isTeto ? '속도가 빠르면 상대는 부담으로 느낄 수 있습니다.' : (isEgen ? '마음이 있는지 없는지 상대가 헷갈릴 수 있습니다.' : '상대가 보기에는 마음이 있는지 없는지 헷갈릴 수 있습니다. 좋아하면 티를 조금 더 내야 합니다.'),
        tip: '좋으면 좋은 이유를 한 문장으로 직접 말해보세요.'
      },
      {
        icon: '👥',
        title: '인간관계 모드',
        seen: isTeto ? '필요한 말은 빠르게 하고 관계의 방향을 정리합니다.' : (isEgen ? '분위기를 읽고 불편한 공기를 부드럽게 낮춥니다.' : '상대에 따라 거리감과 친밀도를 꽤 유연하게 조절합니다.'),
        inner: isTeto ? '시간을 낭비하는 관계에는 에너지를 덜 쓰고 싶습니다.' : (isEgen ? '상대가 상처받지 않도록 표현을 많이 고릅니다.' : '맞춰주고 있지만 속으로는 실속과 피로도를 함께 계산합니다.'),
        strength: isTeto ? '관계 정리력' : (isEgen ? '공감과 분위기 조율' : '너무 들이대지도, 너무 밀어내지도 않는 균형감'),
        caution: isTeto ? '단호함이 무심함으로 읽힐 수 있습니다.' : (isEgen ? '거절을 미루다 감정 피로가 쌓일 수 있습니다.' : '속마음을 숨기면 가까운 사람이 거리감을 느낄 수 있습니다.'),
        tip: '팩트만 말하지 말고 "내가 느낀 점"을 한 문장 붙이세요.'
      },
      {
        icon: '💼',
        title: '커리어 모드',
        seen: isTeto ? '결론, 성과, 우선순위를 빠르게 잡습니다.' : (isEgen ? '협업 분위기와 디테일을 살려 팀의 마찰을 줄입니다.' : '혼자 조용히 판단한 뒤 필요한 순간에 실속 있는 의견을 냅니다.'),
        inner: isTeto ? '결국 결과로 증명해야 마음이 편합니다.' : (isEgen ? '사람들이 편해야 일도 잘 풀린다고 느낍니다.' : '머릿속으로는 이미 손익과 가능성을 계산하고 있습니다.'),
        strength: isTeto ? '추진력과 결정 속도' : (isEgen ? '협업 감각과 사용자 관점' : '관찰 후 정확히 움직이는 실속형 판단'),
        caution: isTeto ? '위임 없이 혼자 밀어붙이면 과부하가 옵니다.' : (isEgen ? '모두를 배려하다 우선순위가 흐려질 수 있습니다.' : '생각한 결론을 너무 늦게 공유하면 존재감이 약해질 수 있습니다.'),
        tip: '머릿속 결론을 혼자만 갖고 있지 말고 먼저 공유하세요.'
      },
      {
        icon: '🧘',
        title: '혼자 있을 때 모드',
        seen: isTeto ? '혼자 있을 때도 다음 목표와 할 일을 정리합니다.' : (isEgen ? '감정과 분위기를 곱씹으며 마음을 정돈합니다.' : '겉으로는 조용하지만 머릿속에서는 여러 가능성을 시뮬레이션합니다.'),
        inner: isTeto ? '멈추면 뒤처질까 봐 쉬는 것도 과제처럼 느껴질 수 있습니다.' : (isEgen ? '사소한 말과 표정까지 다시 떠올리며 의미를 찾습니다.' : '지금은 움직일 때인지, 더 지켜볼 때인지 계속 저울질합니다.'),
        strength: isTeto ? '자기 관리와 목표 회복력' : (isEgen ? '내면 감정 정리와 직감' : '관찰력과 자기 조율 능력'),
        caution: isTeto ? '쉬어야 할 때도 성과를 만들려 할 수 있습니다.' : (isEgen ? '생각이 감정 과몰입으로 번질 수 있습니다.' : '고민이 길어지면 선택이 늦어질 수 있습니다.'),
        tip: '하루 끝에 오늘 잘 전환한 모드 하나만 기록하세요.'
      }
    ];

    return modes.map(function (mode) {
      return '<article style="border:1px solid rgba(255,255,255,.13);background:linear-gradient(145deg,rgba(255,255,255,.075),rgba(255,255,255,.035));border-radius:18px;padding:15px;box-shadow:0 14px 32px rgba(8,6,24,.2);">'
        + '<div style="font-size:1.4rem;margin-bottom:8px;">' + mode.icon + '</div>'
        + '<h5 style="margin:0 0 10px;color:#fff;font-size:1rem;font-weight:950;">' + escapeRpgHtml(mode.title) + '</h5>'
        + '<div style="display:grid;gap:8px;color:rgba(226,232,240,.86);font-size:.8rem;line-height:1.62;">'
        + '<p style="margin:0;"><b style="color:#fde68a;">보이는 모습</b><br>' + escapeRpgHtml(mode.seen) + '</p>'
        + '<p style="margin:0;"><b style="color:#c4b5fd;">속마음</b><br>' + escapeRpgHtml(mode.inner) + '</p>'
        + '<p style="margin:0;"><b style="color:#a7f3d0;">장점</b><br>' + escapeRpgHtml(mode.strength) + '</p>'
        + '<p style="margin:0;"><b style="color:#fecaca;">주의할 점</b><br>' + escapeRpgHtml(mode.caution) + '</p>'
        + '<p style="margin:0;padding:9px 10px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.09);"><b style="color:#93c5fd;">바로 써먹는 팁</b><br>' + escapeRpgHtml(mode.tip) + '</p>'
        + '</div>'
        + '</article>';
    }).join('');
  }

  function buildTetoEgenQuestCards() {
    var quests = [
      ['오전 퀘스트 · 테토 모드', '오늘 꼭 결정해야 할 일 1개를 미루지 않고 선택하기'],
      ['오후 퀘스트 · 에겐 모드', '가까운 사람에게 감정 리액션 한 번 더 표현하기'],
      ['관계 퀘스트', '팩트만 말하지 말고 "내가 느낀 점"을 한 문장 붙이기'],
      ['커리어 퀘스트', '머릿속 결론을 혼자만 갖고 있지 말고 먼저 공유하기'],
      ['하루 마감 체크', '오늘 내가 테토/에겐 모드를 잘 전환한 순간 1개 기록하기']
    ];

    return quests.map(function (quest, idx) {
      return '<label style="display:flex;gap:10px;align-items:flex-start;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.055);border-radius:15px;padding:12px 13px;color:#e5e7eb;">'
        + '<span style="flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:8px;border:1px solid rgba(253,230,138,.5);background:rgba(253,230,138,.12);color:#fde68a;font-size:.75rem;font-weight:950;">' + (idx + 1) + '</span>'
        + '<span style="display:block;">'
        + '<span style="display:block;color:#fff;font-size:.8rem;font-weight:950;margin-bottom:3px;">' + escapeRpgHtml(quest[0]) + '</span>'
        + '<span style="display:block;color:rgba(226,232,240,.82);font-size:.82rem;line-height:1.55;">' + escapeRpgHtml(quest[1]) + '</span>'
        + '</span>'
        + '</label>';
    }).join('');
  }

  function buildTetoEgenResultSection(vibe) {
    return renderTetogenResultCard(vibe);
  }

  function getSafeTetogenHapData(p) {
    // 합화 딥다이브는 보조 해석이므로, 사주 기둥이 비어 있으면 계산을 시도하지 않고 UI만 안전하게 표시한다.
    if (!p || !p.y || !p.m || !p.d || !p.h) return null;
    try {
      return calcQuantumHap(p);
    } catch (err) {
      console.warn('[entertain-tetoegen] hap fallback:', err);
      return null;
    }
  }

  /**
   * @typedef {Object} TetogenVibeProps
   * @property {string=} result
   * @property {number=} tetoScore
   * @property {number=} egenScore
   * @property {number=} bigyuk
   * @property {number=} siksang
   * @property {number=} jaesung
   * @property {number=} gwansung
   * @property {number=} insung
   * @property {Object.<string, number>=} cnt
   */

  function getTetogenSafeNumber(value) {
    var numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function hasTetogenMetric(value) {
    return value !== null && typeof value !== 'undefined' && value !== '' && Number.isFinite(Number(value));
  }

  function normalizeTetogenVibe(vibe) {
    var raw = (vibe && typeof vibe === 'object') ? vibe : {};
    var cnt = (raw.cnt && typeof raw.cnt === 'object') ? raw.cnt : {};
    var result = (raw.result === 'teto' || raw.result === 'egen' || raw.result === 'neutral') ? raw.result : 'neutral';

    // 계산 엔진의 원본 점수와 십성 분포는 그대로 두고, 화면에서 안전하게 읽을 수 있는 값만 정규화한다.
    return {
      result: result,
      tetoScore: getTetogenSafeNumber(raw.tetoScore),
      egenScore: getTetogenSafeNumber(raw.egenScore),
      hasTetoScore: hasTetogenMetric(raw.tetoScore),
      hasEgenScore: hasTetogenMetric(raw.egenScore),
      bigyuk: getTetogenSafeNumber(raw.bigyuk),
      siksang: getTetogenSafeNumber(raw.siksang),
      jaesung: getTetogenSafeNumber(raw.jaesung),
      gwansung: getTetogenSafeNumber(raw.gwansung),
      insung: getTetogenSafeNumber(raw.insung),
      cnt: cnt
    };
  }

  function hasTetogenDistribution(data) {
    if (!data) return false;
    if (data.bigyuk || data.siksang || data.jaesung || data.gwansung || data.insung) return true;
    return Object.keys(data.cnt || {}).some(function (key) {
      return getTetogenSafeNumber(data.cnt[key]) > 0;
    });
  }

  function getTetogenTopStarText(data) {
    if (!hasTetogenDistribution(data)) return '십성 분포 데이터가 부족합니다';
    var topStars = Object.keys(data.cnt || {}).sort(function (a, b) {
      return getTetogenSafeNumber(data.cnt[b]) - getTetogenSafeNumber(data.cnt[a]);
    }).slice(0, 3);
    if (!topStars.length) return '오행과 십성 축이 넓게 퍼진 타입';
    return topStars.map(function (star) {
      return star + ' ' + getTetogenSafeNumber(data.cnt[star]) + '칸';
    }).join(' · ');
  }

  function renderTetogenBadge(label) {
    return '<span class="rounded-full bg-white/10 border border-white/15 text-xs px-3 py-1 font-black text-violet-100 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white/15" style="display:inline-flex;align-items:center;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.10);border-radius:999px;padding:5px 11px;color:#ede9fe;font-size:.74rem;font-weight:900;box-shadow:0 8px 18px rgba(76,29,149,.18);">' + escapeRpgHtml(label) + '</span>';
  }

  function renderTetogenBalanceMeter(kind, label, percent, id) {
    var isTeto = kind === 'teto';
    var textColor = isTeto ? 'text-orange-100' : 'text-fuchsia-100';
    var barClass = isTeto ? 'from-orange-400 via-red-400 to-red-500' : 'from-pink-300 via-fuchsia-400 to-violet-400';
    var barStyle = isTeto
      ? 'background:linear-gradient(90deg,#fb923c,#f87171,#ef4444);'
      : 'background:linear-gradient(90deg,#f9a8d4,#e879f9,#a78bfa);';
    return '<div class="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl shadow-2xl shadow-violet-950/30" style="border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.075);border-radius:22px;padding:14px;box-shadow:0 18px 42px rgba(46,16,101,.24);backdrop-filter:blur(16px);">'
      + '<div class="mb-2 flex items-end justify-between gap-3" style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:8px;">'
      + '<span class="' + textColor + ' text-sm font-black" style="color:' + (isTeto ? '#ffedd5' : '#fae8ff') + ';font-size:.86rem;font-weight:950;">' + label + '</span>'
      + '<span class="text-3xl font-black tracking-tight text-white" style="color:#fff;font-size:1.85rem;font-weight:950;letter-spacing:0;">' + percent + '%</span>'
      + '</div>'
      + '<div class="h-3 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10" style="height:12px;overflow:hidden;border-radius:999px;background:rgba(255,255,255,.11);box-shadow:inset 0 1px 0 rgba(255,255,255,.16);">'
      + '<div id="' + id + '" class="h-full rounded-full bg-gradient-to-r ' + barClass + ' transition-all duration-1000 ease-out" style="width:0%;height:100%;border-radius:999px;' + barStyle + 'box-shadow:0 0 24px ' + (isTeto ? 'rgba(248,113,113,.45)' : 'rgba(217,70,239,.42)') + ';transition:width 1.35s cubic-bezier(.22,1,.36,1);"></div>'
      + '</div>'
      + '</div>';
  }

  function renderTetogenEnergyCard(kind, percent, score, hasScore) {
    var isTeto = kind === 'teto';
    var title = isTeto ? '🔥 테토 에너지' : '✨ 에겐 에너지';
    var desc = isTeto
      ? '현실 감각, 목표 지향성, 통제력, 결단력을 담당하는 축'
      : '관계 감각, 분위기 적응력, 유연함, 감정 흐름을 읽는 축';
    var copy = hasScore
      ? (isTeto ? getTetoEnergyCopy(score) : getEgenEnergyCopy(score))
      : '점수 데이터가 충분하지 않아 기본 성향 카드로 표시합니다. 계산이 다시 확보되면 더 구체적인 해석으로 이어집니다.';
    var accent = isTeto ? '#fed7aa' : '#f5d0fe';
    var border = isTeto ? 'rgba(251,146,60,.28)' : 'rgba(232,121,249,.28)';
    var bg = isTeto ? 'rgba(124,45,18,.18)' : 'rgba(88,28,135,.18)';
    return '<article class="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl shadow-2xl shadow-violet-950/30 transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.13]" style="border:1px solid ' + border + ';background:' + bg + ';border-radius:22px;padding:15px;box-shadow:0 18px 44px rgba(15,23,42,.28);backdrop-filter:blur(16px);transition:transform .25s ease,background .25s ease;">'
      + '<div class="flex items-start justify-between gap-3" style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">'
      + '<h5 class="m-0 text-base font-black text-white" style="margin:0;color:#fff;font-size:1rem;font-weight:950;">' + title + '</h5>'
      + '<b class="text-3xl font-black tracking-tight" style="color:' + accent + ';font-size:1.65rem;font-weight:950;letter-spacing:0;">' + (hasScore ? percent + '%' : '대기') + '</b>'
      + '</div>'
      + '<p class="mt-2 text-sm leading-7 text-white/75" style="margin:8px 0 0;color:' + accent + ';font-size:.82rem;line-height:1.65;">' + desc + '</p>'
      + '<p class="mt-3 text-sm leading-7 text-white/75" style="margin:10px 0 0;color:rgba(248,250,252,.82);font-size:.86rem;line-height:1.72;">' + escapeRpgHtml(copy) + '</p>'
      + '<div class="mt-3 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black text-white/70" style="display:inline-flex;margin-top:11px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.08);border-radius:999px;padding:5px 10px;color:rgba(255,255,255,.72);font-size:.74rem;font-weight:900;">' + (hasScore ? '원점수 ' + score + '점' : '기본 해석') + '</div>'
      + '</article>';
  }

  function getTetogenIngredientRows(data) {
    return [
      {
        label: '재성',
        count: data.jaesung,
        tags: '현실 감각 · 계산력 · 실속 · 소유욕',
        text: data.jaesung > 0 ? '재성이 ' + data.jaesung + '칸이라 현실 감각은 꽤 살아 있습니다. 감정만으로 움직이기보다 "이 선택이 내 생활에 어떤 이득을 주나"를 은근히 따져보는 편입니다.' : '재성 축은 강하게 드러나지 않습니다. 대신 실속 판단이 필요할 때는 주변 흐름을 먼저 보고 천천히 결론을 내는 편입니다.'
      },
      {
        label: '식상/상관',
        count: data.siksang,
        tags: '표현력 · 센스 · 반응성 · 말맛',
        text: data.siksang > 0 ? '식상 축은 ' + data.siksang + '칸, 상관은 ' + getTetogenSafeNumber(data.cnt['상관']) + '칸입니다. 말맛과 센스가 붙으면 조용한 사람처럼 보여도 한마디가 묘하게 오래 남습니다.' : '표현 축 데이터가 약하게 잡힙니다. 말을 많이 하기보다 필요한 순간에만 반응을 꺼내는 쪽으로 보입니다.'
      },
      {
        label: '편인',
        count: getTetogenSafeNumber(data.cnt['편인']),
        tags: '독특한 감각 · 관찰력 · 내면 세계',
        text: getTetogenSafeNumber(data.cnt['편인']) > 0 ? '편인이 ' + getTetogenSafeNumber(data.cnt['편인']) + '칸이라 남들이 쉽게 지나치는 결을 잘 봅니다. 취향도 평범한 정답보다 "내가 꽂힌 이유"가 더 중요한 쪽입니다.' : '편인 신호는 약하게 보입니다. 독특함을 과하게 드러내기보다 현실 흐름에 맞춰 감각을 조율하는 편입니다.'
      },
      {
        label: '관성',
        count: data.gwansung,
        tags: '책임감 · 기준 · 사회적 페르소나',
        text: data.gwansung > 0 ? '관성이 ' + data.gwansung + '칸이라 겉으로 편해 보여도 마음속에는 지켜야 하는 기준이 있습니다. 그래서 관계와 일에서 선을 넘는 순간에는 표정이 달라집니다.' : '관성 축은 강하게 드러나지 않습니다. 고정된 규칙보다 상황의 흐름을 보고 기준을 세우는 쪽이 자연스럽습니다.'
      },
      {
        label: '비겁',
        count: data.bigyuk,
        tags: '자기 주장 · 경쟁심 · 독립성',
        text: data.bigyuk > 0 ? '비겁은 ' + data.bigyuk + '칸입니다. 평소에는 튀지 않아도 중요한 순간에는 "이건 내 방식대로 가야 한다"는 독립성이 올라옵니다.' : '비겁 축은 낮게 잡힙니다. 강하게 부딪히기보다 관찰과 조율로 자기 자리를 확보하는 편입니다.'
      }
    ];
  }

  function renderTetogenTenGodMatrix(data) {
    if (!hasTetogenDistribution(data)) {
      return '<section class="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl shadow-2xl shadow-violet-950/30" style="border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.075);border-radius:22px;padding:16px;box-shadow:0 18px 44px rgba(15,23,42,.28);">'
        + '<h5 class="m-0 text-base font-black text-white" style="margin:0;color:#fff;font-size:1.02rem;font-weight:950;">🧬 사주가 만든 테토·에겐 성분표</h5>'
        + '<p class="mt-3 text-sm leading-7 text-white/75" style="margin:10px 0 0;color:rgba(226,232,240,.78);font-size:.86rem;line-height:1.72;">분석 데이터가 부족합니다. 지금은 테토·에겐 점수 중심으로만 부드럽게 읽어주세요.</p>'
        + '</section>';
    }

    var rows = getTetogenIngredientRows(data).map(function (row) {
      return '<article class="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl shadow-2xl shadow-violet-950/30 transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.13]" style="border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.065);border-radius:20px;padding:14px;box-shadow:0 14px 34px rgba(15,23,42,.24);transition:transform .25s ease,background .25s ease;">'
        + '<div class="flex items-center justify-between gap-3" style="display:flex;align-items:center;justify-content:space-between;gap:12px;">'
        + '<b class="text-sm font-black text-white" style="color:#fff;font-size:.94rem;font-weight:950;">' + escapeRpgHtml(row.label) + '</b>'
        + '<span class="rounded-full bg-white/10 border border-white/15 text-xs px-3 py-1 font-black text-amber-100" style="border:1px solid rgba(253,230,138,.35);background:rgba(253,230,138,.12);border-radius:999px;padding:5px 10px;color:#fde68a;font-size:.72rem;font-weight:950;">' + row.count + '칸</span>'
        + '</div>'
        + '<div class="mt-2 text-xs font-black text-violet-200" style="margin-top:8px;color:#c4b5fd;font-size:.74rem;font-weight:900;">' + escapeRpgHtml(row.tags) + '</div>'
        + '<p class="mt-3 text-sm leading-7 text-white/75" style="margin:9px 0 0;color:rgba(241,245,249,.80);font-size:.84rem;line-height:1.72;">' + escapeRpgHtml(row.text) + '</p>'
        + '</article>';
    }).join('');

    return '<section class="grid gap-3" style="display:grid;gap:12px;">'
      + '<h5 class="m-0 text-base font-black text-white" style="margin:0;color:#fff;font-size:1.03rem;font-weight:950;">🧬 사주가 만든 테토·에겐 성분표</h5>'
      + '<div class="grid gap-3 lg:grid-cols-2" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;">' + rows + '</div>'
      + '</section>';
  }

  function renderTetogenModeCards(profile) {
    profile = profile || { key: 'neutral' };
    var isTeto = profile.key === 'teto';
    var isEgen = profile.key === 'egen';
    var modes = [
      {
        icon: '💘',
        title: '연애 모드',
        seen: isTeto ? '마음이 생기면 행동으로 빠르게 보여주려 합니다.' : (isEgen ? '상대의 기분과 신호를 먼저 살피며 천천히 스며듭니다.' : '처음부터 확 불타기보다는 상대를 관찰하며 천천히 마음을 엽니다.'),
        inner: isTeto ? '내 사람이 되면 확실히 챙기고 싶습니다.' : (isEgen ? '좋아할수록 더 조심스러워지고 표현 타이밍을 재게 됩니다.' : '신뢰가 생기면 은근히 오래 가고, 상대의 생활 패턴까지 챙기는 실속형 애정 표현이 나옵니다.'),
        strength: isTeto ? '확신을 주는 행동력' : (isEgen ? '상대 마음을 편하게 만드는 섬세함' : '편안함과 실속을 같이 주는 애정 방식'),
        caution: isTeto ? '속도가 빠르면 상대는 부담으로 느낄 수 있습니다.' : (isEgen ? '마음이 있는지 없는지 상대가 헷갈릴 수 있습니다.' : '상대가 보기에는 마음이 있는지 없는지 헷갈릴 수 있습니다. 좋아하면 티를 조금 더 내야 합니다.'),
        tip: '좋으면 좋은 이유를 한 문장으로 직접 말해보세요.'
      },
      {
        icon: '👥',
        title: '인간관계 모드',
        seen: isTeto ? '필요한 말은 빠르게 하고 관계의 방향을 정리합니다.' : (isEgen ? '분위기를 읽고 불편한 공기를 부드럽게 낮춥니다.' : '상대에 따라 거리감과 친밀도를 꽤 유연하게 조절합니다.'),
        inner: isTeto ? '시간을 낭비하는 관계에는 에너지를 덜 쓰고 싶습니다.' : (isEgen ? '상대가 상처받지 않도록 표현을 많이 고릅니다.' : '맞춰주고 있지만 속으로는 실속과 피로도를 함께 계산합니다.'),
        strength: isTeto ? '관계 정리력' : (isEgen ? '공감과 분위기 조율' : '너무 들이대지도, 너무 밀어내지도 않는 균형감'),
        caution: isTeto ? '단호함이 무심함으로 읽힐 수 있습니다.' : (isEgen ? '거절을 미루다 감정 피로가 쌓일 수 있습니다.' : '속마음을 숨기면 가까운 사람이 거리감을 느낄 수 있습니다.'),
        tip: '팩트만 말하지 말고 "내가 느낀 점"을 한 문장 붙이세요.'
      },
      {
        icon: '💼',
        title: '커리어 모드',
        seen: isTeto ? '결론, 성과, 우선순위를 빠르게 잡습니다.' : (isEgen ? '협업 분위기와 디테일을 살려 팀의 마찰을 줄입니다.' : '혼자 조용히 판단한 뒤 필요한 순간에 실속 있는 의견을 냅니다.'),
        inner: isTeto ? '결국 결과로 증명해야 마음이 편합니다.' : (isEgen ? '사람들이 편해야 일도 잘 풀린다고 느낍니다.' : '머릿속으로는 이미 손익과 가능성을 계산하고 있습니다.'),
        strength: isTeto ? '추진력과 결정 속도' : (isEgen ? '협업 감각과 사용자 관점' : '관찰 후 정확히 움직이는 실속형 판단'),
        caution: isTeto ? '위임 없이 혼자 밀어붙이면 과부하가 옵니다.' : (isEgen ? '모두를 배려하다 우선순위가 흐려질 수 있습니다.' : '생각한 결론을 너무 늦게 공유하면 존재감이 약해질 수 있습니다.'),
        tip: '머릿속 결론을 혼자만 갖고 있지 말고 먼저 공유하세요.'
      },
      {
        icon: '🧘',
        title: '혼자 있을 때 모드',
        seen: isTeto ? '혼자 있을 때도 다음 목표와 할 일을 정리합니다.' : (isEgen ? '감정과 분위기를 곱씹으며 마음을 정돈합니다.' : '겉으로는 조용하지만 머릿속에서는 여러 가능성을 시뮬레이션합니다.'),
        inner: isTeto ? '멈추면 뒤처질까 봐 쉬는 것도 과제처럼 느껴질 수 있습니다.' : (isEgen ? '사소한 말과 표정까지 다시 떠올리며 의미를 찾습니다.' : '지금은 움직일 때인지, 더 지켜볼 때인지 계속 저울질합니다.'),
        strength: isTeto ? '자기 관리와 목표 회복력' : (isEgen ? '내면 감정 정리와 직감' : '관찰력과 자기 조율 능력'),
        caution: isTeto ? '쉬어야 할 때도 성과를 만들려 할 수 있습니다.' : (isEgen ? '생각이 감정 과몰입으로 번질 수 있습니다.' : '고민이 길어지면 선택이 늦어질 수 있습니다.'),
        tip: '하루 끝에 오늘 잘 전환한 모드 하나만 기록하세요.'
      }
    ];

    var cards = modes.map(function (mode) {
      return '<article class="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl shadow-2xl shadow-violet-950/30 transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.13]" style="border:1px solid rgba(255,255,255,.12);background:linear-gradient(145deg,rgba(255,255,255,.09),rgba(255,255,255,.045));border-radius:22px;padding:15px;box-shadow:0 16px 38px rgba(15,23,42,.26);transition:transform .25s ease,background .25s ease;">'
        + '<div class="mb-2 text-2xl" style="font-size:1.45rem;margin-bottom:8px;">' + mode.icon + '</div>'
        + '<h5 class="m-0 text-base font-black text-white" style="margin:0 0 10px;color:#fff;font-size:1rem;font-weight:950;">' + escapeRpgHtml(mode.title) + '</h5>'
        + '<div class="grid gap-2 text-sm leading-7 text-white/75" style="display:grid;gap:8px;color:rgba(226,232,240,.86);font-size:.82rem;line-height:1.66;">'
        + '<p class="m-0"><b class="text-amber-100">보이는 모습</b><br>' + escapeRpgHtml(mode.seen) + '</p>'
        + '<p class="m-0"><b class="text-violet-200">속마음</b><br>' + escapeRpgHtml(mode.inner) + '</p>'
        + '<p class="m-0"><b class="text-emerald-200">장점</b><br>' + escapeRpgHtml(mode.strength) + '</p>'
        + '<p class="m-0"><b class="text-rose-200">주의할 점</b><br>' + escapeRpgHtml(mode.caution) + '</p>'
        + '<p class="m-0 rounded-2xl border border-white/10 bg-white/10 p-3"><b class="text-sky-200">바로 써먹는 팁</b><br>' + escapeRpgHtml(mode.tip) + '</p>'
        + '</div>'
        + '</article>';
    }).join('');

    return '<section class="grid gap-3" style="display:grid;gap:12px;">'
      + '<h5 class="m-0 text-base font-black text-white" style="margin:0;color:#fff;font-size:1.03rem;font-weight:950;">상황별 모드 전환 카드</h5>'
      + '<div class="grid gap-3 lg:grid-cols-2" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;">' + cards + '</div>'
      + '</section>';
  }

  function renderTetogenQuestList() {
    var quests = [
      ['오전 퀘스트 · 테토 모드', '오늘 꼭 결정해야 할 일 1개를 미루지 않고 선택하기'],
      ['오후 퀘스트 · 에겐 모드', '가까운 사람에게 감정 리액션 한 번 더 표현하기'],
      ['관계 퀘스트', '팩트만 말하지 말고 "내가 느낀 점"을 한 문장 붙이기'],
      ['커리어 퀘스트', '머릿속 결론을 혼자만 갖고 있지 말고 먼저 공유하기'],
      ['하루 마감 체크', '오늘 내가 테토/에겐 모드를 잘 전환한 순간 1개 기록하기']
    ];

    var items = quests.map(function (quest, idx) {
      return '<label class="group flex items-start gap-3 rounded-3xl border border-white/10 bg-white/10 p-3 text-white transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.14]" style="display:flex;align-items:flex-start;gap:11px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.07);border-radius:18px;padding:12px 13px;color:#f8fafc;transition:transform .25s ease,background .25s ease;">'
        + '<span class="grid h-7 w-7 shrink-0 place-items-center rounded-xl border border-amber-200/40 bg-amber-200/10 text-xs font-black text-amber-100" style="display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;width:28px;height:28px;border-radius:11px;border:1px solid rgba(253,230,138,.42);background:rgba(253,230,138,.12);color:#fde68a;font-size:.76rem;font-weight:950;">' + (idx + 1) + '</span>'
        + '<span class="block min-w-0">'
        + '<span class="block text-sm font-black text-white" style="display:block;color:#fff;font-size:.84rem;font-weight:950;margin-bottom:4px;">' + escapeRpgHtml(quest[0]) + '</span>'
        + '<span class="block text-sm leading-7 text-white/75" style="display:block;color:rgba(226,232,240,.82);font-size:.84rem;line-height:1.62;">' + escapeRpgHtml(quest[1]) + '</span>'
        + '</span>'
        + '</label>';
    }).join('');

    return '<section class="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl shadow-2xl shadow-violet-950/30" style="border:1px solid rgba(253,230,138,.20);background:rgba(253,230,138,.075);border-radius:22px;padding:16px;box-shadow:0 18px 44px rgba(46,16,101,.22);">'
      + '<h5 class="m-0 text-base font-black text-amber-100" style="margin:0 0 11px;color:#fde68a;font-size:1.03rem;font-weight:950;">🎯 오늘의 밸런스 퀘스트</h5>'
      + '<div class="grid gap-2" style="display:grid;gap:9px;">' + items + '</div>'
      + '</section>';
  }

  function renderTetogenAdviceCards(result, modeClass) {
    var advices = getTetoEgenBoneAdvice(result || 'neutral');
    var cards = advices.map(function (a, idx) {
      var icon = idx === 0 ? '🪞' : (idx === 1 ? '🧩' : '⚖️');
      return '<article class="ent-reveal rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl shadow-2xl shadow-violet-950/30 transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.13]" style="--ent-bone-delay:' + (idx * 0.07) + 's;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.075);border-radius:22px;padding:15px;box-shadow:0 16px 38px rgba(15,23,42,.28);transition:transform .25s ease,background .25s ease;">'
        + '<div class="flex items-start gap-3" style="display:flex;align-items:flex-start;gap:12px;">'
        + '<span class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/10 text-lg" style="display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;width:40px;height:40px;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.10);font-size:1.1rem;">' + icon + '</span>'
        + '<div class="min-w-0">'
        + '<div class="text-xs font-black text-amber-100" style="color:#fde68a;font-size:.74rem;font-weight:950;">CORE ' + (idx + 1) + '</div>'
        + '<h5 class="m-0 mt-1 text-base font-black text-white" style="margin:4px 0 0;color:#fff;font-size:1rem;font-weight:950;line-height:1.45;">' + escapeRpgHtml(a.title) + '</h5>'
        + '</div>'
        + '</div>'
        + '<div class="mt-3 grid gap-2 text-sm leading-7 text-white/75" style="display:grid;gap:8px;margin-top:12px;color:rgba(226,232,240,.82);font-size:.84rem;line-height:1.72;">'
        + '<p class="m-0"><b class="text-amber-100">팩폭 한 줄</b><br>' + escapeRpgHtml(a.punch) + '</p>'
        + '<p class="m-0"><b class="text-violet-200">왜 그런지</b><br>' + escapeRpgHtml(a.why) + '</p>'
        + '<p class="m-0 rounded-2xl border border-white/10 bg-white/10 p-3"><b class="text-sky-200">바로 고치는 방법</b><br>' + escapeRpgHtml(a.fix) + '</p>'
        + '</div>'
        + '</article>';
    }).join('');

    return '<section class="ent-reveal ' + (modeClass || 'mode-neutral') + ' rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl shadow-2xl shadow-violet-950/30" style="margin-top:14px;border:1px solid rgba(255,255,255,.13);background:linear-gradient(145deg,rgba(15,23,42,.72),rgba(76,29,149,.26));border-radius:24px;padding:16px;box-shadow:0 22px 56px rgba(15,23,42,.36);backdrop-filter:blur(18px);">'
      + '<div class="mb-3" style="margin-bottom:12px;">'
      + '<h4 class="m-0 text-lg font-black text-white" style="margin:0;color:#fff;font-size:1.08rem;font-weight:950;">🦴 사주가 조용히 찌르는 팩폭</h4>'
      + '<p class="m-0 mt-1 text-sm leading-7 text-white/75" style="margin:4px 0 0;color:rgba(226,232,240,.76);font-size:.84rem;line-height:1.65;">읽고 끝나는 조언이 아니라, 오늘 바로 고칠 수 있는 행동 기준입니다.</p>'
      + '</div>'
      + '<div class="grid gap-3 lg:grid-cols-3" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;">' + cards + '</div>'
      + '</section>';
  }

  function renderTetogenResultCard(vibe) {
    var data = normalizeTetogenVibe(vibe);
    var profile = resolveTetoEgenProfile(data);
    var tPct = clampTetoEgenPercent(data.tetoScore);
    var ePct = clampTetoEgenPercent(data.egenScore);
    var topStarText = getTetogenTopStarText(data);
    var scoreGap = Math.abs(data.tetoScore - data.egenScore);
    var badgeHtml = (profile.badges || []).map(renderTetogenBadge).join('');

    return '<section class="ent-reveal min-h-screen bg-gradient-to-b from-slate-950 via-violet-950 to-slate-950 text-white px-4 py-6 rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl shadow-violet-950/30" style="position:relative;overflow:hidden;min-height:min(100vh,920px);border:1px solid rgba(255,255,255,.12);border-radius:28px;background:radial-gradient(110% 70% at 14% 0%,rgba(196,181,253,.20),transparent 58%),radial-gradient(80% 55% at 86% 14%,rgba(244,114,182,.14),transparent 54%),linear-gradient(180deg,#020617 0%,#2e1065 48%,#020617 100%);box-shadow:0 28px 86px rgba(15,23,42,.56),0 0 38px rgba(124,58,237,.18);padding:18px;color:#fff;backdrop-filter:blur(18px);">'
      + '<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" style="position:absolute;left:0;right:0;top:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.44),transparent);"></div>'
      + '<div class="relative z-10 grid gap-4" style="position:relative;z-index:1;display:grid;gap:16px;">'
      + '<header class="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl shadow-2xl shadow-violet-950/30" style="border:1px solid rgba(255,255,255,.14);background:linear-gradient(145deg,rgba(255,255,255,.105),rgba(255,255,255,.045));border-radius:24px;padding:17px;box-shadow:0 20px 54px rgba(15,23,42,.34);backdrop-filter:blur(18px);">'
      + '<div class="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(220px,.65fr)]" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;align-items:start;">'
      + '<div class="min-w-0">'
      + '<div class="mb-2 text-xs font-black uppercase tracking-[0.18em] text-violet-200" style="margin-bottom:8px;color:#ddd6fe;font-size:.72rem;font-weight:950;letter-spacing:.18em;">SAJU TETO · EGEN RESULT</div>'
      + '<h4 class="m-0 text-3xl font-black tracking-tight text-white sm:text-4xl" style="margin:0;color:#fff;font-size:clamp(1.72rem,5vw,2.8rem);line-height:1.08;font-weight:950;letter-spacing:0;">' + escapeRpgHtml(profile.title) + '</h4>'
      + '<p class="mt-3 text-sm leading-7 text-white/75" style="margin:10px 0 0;color:rgba(219,234,254,.88);font-size:.96rem;line-height:1.72;font-weight:750;">' + escapeRpgHtml(profile.sub) + '</p>'
      + '<p class="mt-4 rounded-3xl border border-white/10 bg-white/10 p-4 text-sm leading-7 text-white/75" style="margin:14px 0 0;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.075);border-radius:20px;padding:13px;color:rgba(226,232,240,.90);font-size:.9rem;line-height:1.76;">' + escapeRpgHtml(profile.summary) + '</p>'
      + '<div class="mt-4 flex flex-wrap gap-2" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px;">' + badgeHtml + '</div>'
      + '</div>'
      + '<aside class="rounded-3xl border border-white/10 bg-slate-950/40 p-4 text-center backdrop-blur-xl" style="border:1px solid rgba(255,255,255,.13);background:rgba(2,6,23,.42);border-radius:22px;padding:15px;text-align:center;">'
      + '<div class="text-xs font-black text-white/50" style="color:rgba(255,255,255,.55);font-size:.74rem;font-weight:950;">점수차</div>'
      + '<div class="mt-1 text-3xl font-black tracking-tight text-white" style="margin-top:4px;color:#fff;font-size:2rem;font-weight:950;letter-spacing:0;">' + scoreGap + '</div>'
      + '<div class="mt-2 text-xs font-black leading-5 text-violet-200" style="margin-top:8px;color:#c4b5fd;font-size:.76rem;font-weight:900;line-height:1.55;">' + escapeRpgHtml(topStarText) + '</div>'
      + '</aside>'
      + '</div>'
      + '</header>'
      + '<section class="grid gap-3 lg:grid-cols-2" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;">'
      + renderTetogenBalanceMeter('teto', '🔥 테토 밸런스', tPct, 'hvBarTeto')
      + renderTetogenBalanceMeter('egen', '✨ 에겐 밸런스', ePct, 'hvBarEgen')
      + '</section>'
      + '<section class="grid gap-3 lg:grid-cols-2" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;">'
      + renderTetogenEnergyCard('teto', tPct, data.tetoScore, data.hasTetoScore)
      + renderTetogenEnergyCard('egen', ePct, data.egenScore, data.hasEgenScore)
      + '</section>'
      + renderTetogenTenGodMatrix(data)
      + renderTetogenModeCards(profile)
      + renderTetogenQuestList()
      + '<blockquote class="rounded-3xl border border-white/10 bg-white/10 p-4 text-center text-sm font-black leading-7 text-sky-100 backdrop-blur-xl shadow-2xl shadow-violet-950/30" style="margin:0;border:1px solid rgba(147,197,253,.22);background:rgba(15,23,42,.48);border-radius:22px;padding:15px;text-align:center;color:#dbeafe;font-size:.92rem;line-height:1.72;font-weight:900;box-shadow:0 18px 44px rgba(15,23,42,.26);">' + escapeRpgHtml(profile.save) + '</blockquote>'
      + '</div>'
      + '</section>';
  }


  var HEALTH_ELEMENT_ORDER = ['wood', 'fire', 'earth', 'metal', 'water'];
  var HEALTH_CONTROL_REL = { wood: 'earth', fire: 'metal', earth: 'water', metal: 'wood', water: 'fire' };
  var HEALTH_ELEMENT_GUIDE = {
    wood: {
      excess: ['목·어깨 긴장, 예민함, 두통성 피로가 올라오기 쉽습니다.', '카페인·음주·늦은 야식을 줄이고 목·어깨 이완과 가벼운 산책으로 열을 내려주세요.'],
      deficient: ['눈 피로, 의욕 저하, 몸이 뻣뻣한 느낌이 나타나기 쉽습니다.', '녹색 채소와 충분한 수분, 짧은 스트레칭으로 생장 리듬을 보완하세요.'],
      pressure: ['계획은 많은데 몸이 따라오지 않아 긴장과 소화 부담이 함께 느껴질 수 있습니다.', '속도를 낮추고 호흡, 식사 시간, 휴식 간격을 먼저 고정하세요.'],
      stable: ['확장성과 회복 탄력이 비교적 안정적으로 작동합니다.', '가벼운 움직임과 정리된 일정으로 좋은 리듬을 유지하세요.']
    },
    fire: {
      excess: ['심박이 빨라지거나 초조함, 불면성 피로가 느껴지기 쉽습니다.', '매운 음식, 늦은 운동, 오후 카페인을 줄이고 저녁에는 걷기와 호흡으로 진정하세요.'],
      deficient: ['순환이 둔하고 손발이 차거나 동기가 낮아질 수 있습니다.', '아침 햇빛, 따뜻한 단백질 식사, 짧은 유산소로 체온 리듬을 깨우세요.'],
      pressure: ['열감과 긴장이 다른 축을 압박해 집중력과 회복감이 흔들릴 수 있습니다.', '일정을 압축하지 말고 중간 휴식과 수분 보충을 넣어주세요.'],
      stable: ['활력과 표현 리듬이 비교적 무리 없이 이어집니다.', '활동 후 바로 쉬는 시간을 붙이면 컨디션이 오래 갑니다.']
    },
    earth: {
      excess: ['몸이 무겁고 식후 졸림, 복부 더부룩함이 쉽게 쌓일 수 있습니다.', '과식, 밀가루 과다, 오래 앉아있기를 줄이고 식후 15분 걷기를 고정하세요.'],
      deficient: ['소화 리듬 저하, 식후 피로, 복부 무거움이 나타나기 쉽습니다.', '따뜻하고 부드러운 식사와 규칙적인 식사 시간을 우선하세요.'],
      pressure: ['목(木) 과열이나 일정 압박이 소화 리듬을 누르기 쉽습니다.', '식사 시간을 미루지 말고 따뜻한 음식, 천천히 씹기, 식후 걷기로 중심을 잡으세요.'],
      stable: ['생활 리듬과 소화 축이 비교적 안정적으로 받쳐줍니다.', '정해진 시간에 먹고 움직이는 기본 루틴을 유지하세요.']
    },
    metal: {
      excess: ['흉곽·어깨가 굳고 완벽주의성 긴장이 올라올 수 있습니다.', '기준을 낮추고 복식호흡, 가슴 열기 스트레칭, 실내 습도 관리를 해주세요.'],
      deficient: ['건조감, 호흡 얕아짐, 집중력 저하가 느껴지기 쉽습니다.', '배, 무, 도라지, 식이섬유와 수분을 보강하고 호흡을 길게 가져가세요.'],
      pressure: ['화(火) 과열이나 과로가 호흡·피부·집중 리듬을 건드릴 수 있습니다.', '자극적인 음식과 늦은 스크린 시간을 줄이고 환기와 호흡 루틴을 넣어주세요.'],
      stable: ['호흡, 정리력, 집중 리듬이 비교적 선명하게 유지됩니다.', '건조함만 방치하지 않으면 안정감이 이어집니다.']
    },
    water: {
      excess: ['무기력, 과수면, 몸이 축 처지는 느낌이 생길 수 있습니다.', '완전한 비활동을 피하고 짧은 움직임과 낮 시간 수분 분배를 유지하세요.'],
      deficient: ['냉감, 허리 피로, 수면 질 저하가 나타나기 쉽습니다.', '하복부와 허리를 따뜻하게 하고 단백질, 해조류, 충분한 휴식을 보강하세요.'],
      pressure: ['토(土) 정체나 과로가 회복 저장고를 눌러 피로가 오래갈 수 있습니다.', '무리한 일정 대신 보온, 수면, 저충격 움직임으로 회복 폭을 확보하세요.'],
      stable: ['회복력과 장기전의 버티는 힘이 비교적 안정적입니다.', '늦은 밤 자극을 줄이면 안정감이 더 오래 갑니다.']
    }
  };
  var HEALTH_FOOD_PLAN = {
    wood: [
      { name: '시금치나물과 현미밥', element: 'wood', reason: '푸른 잎채소와 현미는 목(木)의 성장성과 회복 리듬을 부드럽게 보완하면서 식이섬유로 식사 균형을 잡아줍니다.', tip: '점심에 기름을 적게 쓰고, 단백질 반찬을 하나 곁들여 가볍게 드세요.' },
      { name: '미나리 두부무침', element: 'wood', reason: '미나리의 푸른 기운은 답답함을 풀어주는 목(木)의 흐름과 맞고, 두부는 부담 없이 회복감을 더합니다.', tip: '너무 차갑게 먹기보다 상온에 잠시 두었다가 저녁 반찬으로 가볍게 드세요.' },
      { name: '브로콜리 닭가슴살 샐러드', element: 'wood', reason: '초록 채소는 목(木)의 생장 리듬을 돕고, 담백한 단백질은 긴장으로 빠진 기력을 안정적으로 보완합니다.', tip: '드레싱은 과하지 않게 하고, 카페인 대신 물이나 보리차를 곁들이세요.' },
      { name: '오이·레몬 물', element: 'wood', reason: '목(木)이 과열될 때 신맛과 수분감은 긴장과 열감을 낮추는 생활관리 축이 됩니다.', tip: '늦은 밤보다 낮 시간에 조금씩 나누어 마시고, 속이 찬 날은 미지근하게 드세요.' },
      { name: '쑥 된장국', element: 'wood', reason: '쑥의 푸른 기운은 목(木)을 보완하고, 따뜻한 된장국은 속을 차갑게 만들지 않아 실천하기 쉽습니다.', tip: '아침이나 저녁에 짜지 않게 끓여 밥과 함께 천천히 드세요.' }
    ],
    fire: [
      { name: '토마토 채소스튜', element: 'fire', reason: '붉은 토마토와 따뜻한 스튜는 화(火)의 활력과 순환 리듬을 살리되, 자극적인 매운맛 없이 부드럽게 보완합니다.', tip: '저녁에는 맵게 끓이지 말고 따뜻하게 한 그릇 정도로 가볍게 드세요.' },
      { name: '계란 생강죽', element: 'fire', reason: '계란과 소량의 생강은 화(火)의 대사 점화를 부드럽게 깨우고, 죽 형태라 소화 부담이 낮습니다.', tip: '아침 식사로 따뜻하게 먹고, 생강은 향이 느껴질 정도만 넣으세요.' },
      { name: '구운 파프리카 샐러드', element: 'fire', reason: '붉은 채소의 화(火) 기운을 기름지고 자극적인 메뉴 없이 활용해 활력 보완에 좋습니다.', tip: '차갑게 먹기보다 살짝 구워 닭가슴살이나 두부와 함께 드세요.' },
      { name: '렌틸콩 토마토수프', element: 'fire', reason: '따뜻한 붉은 수프는 순환감을 돕고, 렌틸콩 단백질은 오후의 기력 저하를 완만하게 받쳐줍니다.', tip: '점심이나 이른 저녁에 짜지 않게 먹고, 늦은 밤 야식으로는 피하세요.' },
      { name: '석류와 견과 소량', element: 'fire', reason: '붉은 과실은 화(火)의 표현력과 활력 이미지를 가볍게 더하고, 견과는 당류 간식으로 흐르는 것을 막아줍니다.', tip: '간식으로 소량만 먹고, 달콤한 주스 형태보다는 원물에 가깝게 드세요.' }
    ],
    earth: [
      { name: '단호박죽', element: 'earth', reason: '따뜻하고 부드러운 음식은 비위 리듬을 안정시키는 토(土)의 성질과 잘 맞습니다.', tip: '아침이나 저녁에 과식 없이 따뜻하게 먹는 것을 추천합니다.' },
      { name: '고구마 찜', element: 'earth', reason: '찐 고구마는 정제당 없이 토(土)의 단맛을 채우고, 포만감과 식이섬유를 함께 줍니다.', tip: '맛탕처럼 설탕을 입히지 말고, 한 개 정도를 천천히 드세요.' },
      { name: '현미밥과 된장국', element: 'earth', reason: '곡물과 발효 국물은 토(土)의 안정성과 생활 리듬을 살리고, 속을 편안하게 받쳐줍니다.', tip: '식사 시간을 고정하고, 국은 짜지 않게 끓여 따뜻할 때 드세요.' },
      { name: '계란찜', element: 'earth', reason: '따뜻하고 부드러운 단백질은 소화 부담을 낮추며 토(土)의 회복 기반을 조용히 채워줍니다.', tip: '늦은 야식보다 아침이나 저녁 반찬으로 작게 곁들이세요.' },
      { name: '양배추 감자수프', element: 'earth', reason: '양배추와 감자는 복부 무거움과 식후 피로가 느껴질 때 부담 없이 중심감을 회복하는 데 좋습니다.', tip: '크림이나 버터를 많이 넣지 말고 맑고 따뜻하게 끓여 드세요.' }
    ],
    metal: [
      { name: '배·무 샐러드', element: 'metal', reason: '금(金)은 호흡과 건조함의 리듬과 연결되므로, 수분감 있는 흰색 식재료가 오늘의 건조 신호를 완화하는 데 도움이 됩니다.', tip: '너무 차갑게 먹기보다 상온에 가까운 상태로 가볍게 섭취하세요.' },
      { name: '배 도라지차', element: 'metal', reason: '배와 도라지는 금(金)의 맑고 촉촉한 이미지를 보완하며, 건조감과 얕은 호흡 관리에 어울립니다.', tip: '꿀은 많이 넣지 말고 따뜻하게 우려 천천히 마시세요.' },
      { name: '무국', element: 'metal', reason: '흰 뿌리채소의 금(金) 기운이 정리력을 돕고, 따뜻한 국물이 호흡 리듬을 편안하게 합니다.', tip: '맵게 끓이지 말고 두부나 흰살생선을 조금 더해 담백하게 드세요.' },
      { name: '연근조림', element: 'metal', reason: '연근의 흰 뿌리 결은 금(金)의 수렴성과 연결되고, 식이섬유가 장 리듬을 부드럽게 돕습니다.', tip: '간장은 적게 쓰고, 너무 달게 졸이지 않도록 조절하세요.' },
      { name: '두부 버섯볶음', element: 'metal', reason: '흰색 식재료와 버섯의 식이섬유는 금(金)의 건조함과 집중 리듬을 부드럽게 보완합니다.', tip: '기름을 많이 쓰지 말고 담백하게 볶아 점심 반찬으로 드세요.' }
    ],
    water: [
      { name: '미역국', element: 'water', reason: '미역의 짙은 색과 해조류의 미네랄은 수(水)의 저장과 회복 리듬을 상징하며, 피로 관리 식사로 부담이 적습니다.', tip: '짜지 않게 끓이고, 늦은 밤보다 아침이나 점심에 따뜻하게 드세요.' },
      { name: '검은콩밥', element: 'water', reason: '검은 식재료는 수(水)의 깊은 회복성과 잘 맞고, 단백질과 식이섬유를 함께 보완합니다.', tip: '흰쌀만 먹기보다 검은콩과 현미를 섞어 평소 식사에 자연스럽게 넣으세요.' },
      { name: '두부 해조류무침', element: 'water', reason: '해조류의 촉촉한 수(水) 기운과 두부 단백질이 과로 후 회복 리듬을 가볍게 받쳐줍니다.', tip: '초고추장보다 간장이나 참깨를 가볍게 써서 자극을 낮추세요.' },
      { name: '연어구이', element: 'water', reason: '담백한 생선과 좋은 지방은 수(水)의 깊은 회복감을 보완하고, 무거운 야식으로 흐르지 않게 돕습니다.', tip: '기름진 소스보다 레몬과 채소를 곁들여 저녁 식사로 가볍게 드세요.' },
      { name: '따뜻한 보리차와 견과', element: 'water', reason: '따뜻한 수분 보충은 수(水)의 휴식 리듬을 돕고, 견과는 늦은 시간 폭식을 줄이는 데 도움이 됩니다.', tip: '자기 직전 과하게 마시기보다 저녁 이후 조금씩 나누어 드세요.' }
    ]
  };
  var HEALTH_MOVEMENT_PLAN = {
    wood: '목·어깨 이완 스트레칭 5분 + 가벼운 산책 15분',
    fire: '저녁 격렬운동 대신 천천히 걷기 20분 + 긴 날숨 호흡',
    earth: '식후 15분 천천히 걷기 + 복부를 조이지 않는 자세 유지',
    metal: '복식호흡 3세트 + 가슴과 어깨 앞쪽 열기 스트레칭',
    water: '허리·둔근 저강도 강화 10분 + 하복부 보온'
  };
  var HEALTH_ENV_PLAN = {
    wood: '책상 위 시야를 비우고 초록 채소나 식물을 가까이 두세요.',
    fire: '저녁 조명을 낮추고 화면 밝기를 줄여 과열감을 낮추세요.',
    earth: '식사 공간을 정리하고 따뜻한 물을 곁에 두세요.',
    metal: '창문 환기와 습도 40~60%를 확인하세요.',
    water: '몸을 차갑게 두지 말고 발, 허리, 하복부를 따뜻하게 유지하세요.'
  };
  var HEALTH_AVOID_PLAN = {
    wood: '카페인 과다, 분노 누적, 늦은 야식',
    fire: '오후 카페인, 매운 음식 과다, 밤늦은 격한 운동',
    earth: '폭식, 밀가루 과다, 식사 시간 건너뛰기',
    metal: '건조한 환경 방치, 완벽주의 과몰입, 얕은 호흡',
    water: '냉음식 과다, 과수면, 하루 종일 움직이지 않기'
  };

  HEALTH_MOVEMENT_PLAN = {
    wood: '목·어깨 이완 스트레칭 5분 + 감정 긴장을 풀어내는 가벼운 산책 15분',
    fire: '과열되는 운동은 줄이고, 저녁에는 천천히 걷기 20분 + 긴 날숨 호흡',
    earth: '식후 15분 천천히 걷기 + 복부를 조이지 않는 편안한 자세 유지',
    metal: '복식호흡 3세트 + 가슴과 어깨 앞쪽 열기 스트레칭',
    water: '저강도 허리·둔근 움직임 10분 + 밤 시간 자극을 줄이는 정리 루틴'
  };
  HEALTH_ENV_PLAN = {
    wood: '시야를 복잡하게 만드는 물건을 치우고, 긴장을 낮추는 조용한 공간을 가까이 두세요.',
    fire: '저녁 조명과 화면 밝기를 낮추고, 몸이 과열되지 않는 차분한 분위기를 만드세요.',
    earth: '식사 공간을 정돈하고 따뜻한 식사를 천천히 먹을 수 있는 환경을 마련하세요.',
    metal: '실내 습도와 환기를 챙기고, 책상 위를 단순하게 정리해 호흡과 집중 리듬을 돕습니다.',
    water: '밤에는 소음과 화면 자극을 줄이고, 몸을 차갑게 두지 않는 회복 공간을 만드세요.'
  };
  HEALTH_AVOID_PLAN = {
    wood: '카페인 과다, 음주, 분노 누적, 늦은 야식',
    fire: '과열 운동, 수면 전 강한 화면, 조급한 일정 몰아치기',
    earth: '과식, 식사 시간 건너뛰기, 차갑고 급한 식사',
    metal: '건조한 환경 방치, 얕은 호흡, 어지러운 작업 공간',
    water: '수분 부족, 과로 누적, 밤 시간 자극, 늦은 수면'
  };
  var HEALTH_DEFAULT_FOOD_PLAN = [
    { name: '현미밥과 된장국', element: 'earth', reason: '곡물과 따뜻한 국물은 중심감을 안정시키고 부담 없는 기본 식사 루틴으로 쓰기 좋습니다.', tip: '짜지 않게 먹고 식사 시간을 일정하게 맞추세요.' },
    { name: '계란찜', element: 'earth', reason: '부드러운 단백질은 소화 부담을 낮추며 회복 식사로 실천하기 쉽습니다.', tip: '늦은 야식보다 아침이나 저녁 반찬으로 작게 곁들이세요.' },
    { name: '두부 버섯볶음', element: 'metal', reason: '담백한 단백질과 식이섬유가 호흡과 정리 리듬을 부드럽게 돕습니다.', tip: '기름을 많이 쓰지 말고 따뜻하게 드세요.' },
    { name: '미역국', element: 'water', reason: '해조류와 따뜻한 국물은 수분과 회복 리듬을 부담 없이 채워줍니다.', tip: '짜지 않게 끓여 낮 시간 식사에 곁들이세요.' },
    { name: '시금치 두부무침', element: 'wood', reason: '푸른 잎채소와 담백한 단백질이 긴장을 낮추고 회복감을 보완합니다.', tip: '차갑게 먹기보다 상온에 잠시 두었다가 가볍게 드세요.' }
  ];

  function escapeHealthHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function getHealthRatios(natal) {
    var src = (natal && natal.ratios) || {};
    var ratios = {};
    HEALTH_ELEMENT_ORDER.forEach(function (el) {
      var value = Number(src[el]);
      ratios[el] = isFinite(value) ? value : 20;
    });
    return ratios;
  }

  function getTodayHealthElement() {
    try {
      if (w.G_BAZI && typeof w.G_BAZI.getDayGan === 'function' && w.GAN) {
        var gan = w.G_BAZI.getDayGan();
        return (w.GAN[gan] && w.GAN[gan].e) || null;
      }
    } catch (_) {}
    return null;
  }

  function getHealthControlImpacts(ratios) {
    var impacts = [];
    HEALTH_ELEMENT_ORDER.forEach(function (controller) {
      var target = HEALTH_CONTROL_REL[controller];
      var controllerValue = Number(ratios[controller] || 0);
      var targetValue = Number(ratios[target] || 0);
      var pressure = Math.max(0, controllerValue - 28);
      var fragility = Math.max(0, 22 - targetValue);
      var score = pressure * 1.1 + fragility;
      if (controllerValue >= 34) score += 3;
      if (targetValue <= 16) score += 3;
      if (score < 7) return;
      impacts.push({
        controller: controller,
        target: target,
        score: Math.round(score * 10) / 10
      });
    });
    impacts.sort(function (a, b) { return b.score - a.score; });
    return impacts;
  }

  function getHealthTargetAxes(pw, jg, johu, controlImpacts) {
    var yongshinList = [];
    var kijishinList = [];
    if (jg && jg.isJong) {
      yongshinList = [jg.dominant, jg.parEl].filter(Boolean);
      kijishinList = [HEALTH_CONTROL_REL[jg.dominant], (w.SHENG && w.SHENG[jg.dominant])].filter(Boolean);
    } else if (pw) {
      yongshinList = Array.isArray(pw.yongshin) ? pw.yongshin.slice() : [];
      kijishinList = Array.isArray(pw.kijishin) ? pw.kijishin.slice() : [];
    }

    var johuNeed = [];
    var johuAvoid = [];
    if (johu && (johu.type === 'hot' || johu.type === 'warm')) {
      johuNeed = ['water', 'metal'];
      johuAvoid = ['fire', 'wood'];
    } else if (johu && (johu.type === 'cold' || johu.type === 'cool')) {
      johuNeed = ['fire', 'wood'];
      johuAvoid = ['water', 'metal'];
    }

    var targetEl = 'earth';
    var intersect = yongshinList.filter(function (el) { return johuNeed.indexOf(el) !== -1; });
    if (intersect.length) targetEl = intersect[0];
    else if (johuNeed.length) targetEl = johuNeed[0];
    else if (yongshinList.length) targetEl = yongshinList[0];

    var avoidEl = 'earth';
    var avoidIntersect = kijishinList.filter(function (el) { return johuAvoid.indexOf(el) !== -1; });
    if (avoidIntersect.length) avoidEl = avoidIntersect[0];
    else if (johuAvoid.length) avoidEl = johuAvoid[0];
    else if (kijishinList.length) avoidEl = kijishinList[0];

    if (controlImpacts.length && controlImpacts[0].score >= 10) {
      targetEl = controlImpacts[0].target;
      avoidEl = controlImpacts[0].controller;
    }

    return { targetEl: targetEl, avoidEl: avoidEl };
  }

  function getHealthState(el, ratios, controlImpacts) {
    var hasPressure = controlImpacts.some(function (impact) { return impact.target === el; });
    var value = Number(ratios[el] || 0);
    if (hasPressure) return 'pressure';
    if (value >= 29) return 'excess';
    if (value <= 16) return 'deficient';
    return 'stable';
  }

  function getHealthStateLabel(state) {
    if (state === 'excess') return '과열 주의';
    if (state === 'deficient') return '보완 필요';
    if (state === 'pressure') return '스트레스 축';
    return '유지 권장';
  }

  function getHealthElementTheme(el) {
    var themes = {
      wood: {
        soft: 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100 ring-emerald-200/20',
        badge: 'border-emerald-300/30 bg-emerald-400/15 text-emerald-100',
        text: 'text-emerald-200',
        glow: 'from-emerald-300/25'
      },
      fire: {
        soft: 'border-rose-300/30 bg-rose-400/10 text-rose-100 ring-rose-200/20',
        badge: 'border-orange-300/30 bg-rose-400/15 text-orange-100',
        text: 'text-orange-200',
        glow: 'from-orange-300/25'
      },
      earth: {
        soft: 'border-amber-300/30 bg-amber-400/10 text-amber-100 ring-amber-200/20',
        badge: 'border-amber-300/30 bg-amber-400/15 text-amber-100',
        text: 'text-amber-200',
        glow: 'from-amber-200/25'
      },
      metal: {
        soft: 'border-zinc-200/25 bg-zinc-200/10 text-zinc-100 ring-zinc-100/15',
        badge: 'border-slate-200/25 bg-slate-200/12 text-slate-100',
        text: 'text-zinc-200',
        glow: 'from-zinc-100/20'
      },
      water: {
        soft: 'border-sky-300/30 bg-sky-400/10 text-sky-100 ring-sky-200/20',
        badge: 'border-sky-300/30 bg-sky-400/15 text-sky-100',
        text: 'text-sky-200',
        glow: 'from-sky-300/25'
      }
    };
    return themes[el] || themes.earth;
  }

  function getHealthRoutineFocus(el) {
    return ({
      wood: '긴장 이완',
      fire: '열감 진정',
      earth: '식사 리듬',
      metal: '호흡 정돈',
      water: '수면 회복'
    })[el] || '리듬 안정';
  }

  function getHealthConditionGrade(riskKeys, ratios, controlImpacts) {
    var pressureCount = (riskKeys || []).filter(function (el) { return getHealthState(el, ratios, controlImpacts) === 'pressure'; }).length;
    var excessCount = (riskKeys || []).filter(function (el) { return getHealthState(el, ratios, controlImpacts) === 'excess'; }).length;
    if (pressureCount >= 2) return { label: '주의 조율', body: '압박받는 축이 겹쳐 오늘은 회복 루틴을 먼저 배치하면 좋습니다.' };
    if (pressureCount || excessCount >= 2) return { label: '균형 조율', body: '강한 기운이 빠르게 올라올 수 있어 자극을 낮추는 하루가 어울립니다.' };
    return { label: '안정 관리', body: '큰 흔들림보다 작은 리듬을 유지하는 쪽이 컨디션을 살립니다.' };
  }

  function renderHealthPill(label, value, el) {
    var theme = getHealthElementTheme(el);
    return '<span class="cd-health-pill inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black leading-none shadow-sm ring-1 ' + theme.badge + '">'
      + '<span class="text-sm leading-none">' + (EL_ICON[el] || '✦') + '</span>'
      + '<span>' + escapeHealthHtml(label) + ': ' + escapeHealthHtml(value) + '</span>'
      + '</span>';
  }

  function renderHealthSection(icon, title, summary, bodyHtml) {
    return '<section class="cd-health-section rounded-2xl border border-white/10 bg-white/[0.075] p-4 shadow-[0_18px_48px_rgba(2,6,23,0.28)] ring-1 ring-white/10 backdrop-blur-2xl sm:p-5">'
      + '<div class="mb-3 flex items-start gap-3">'
      + '<span class="cd-health-section-icon grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/10 text-lg shadow-inner">' + icon + '</span>'
      + '<div class="min-w-0">'
      + '<h4 class="m-0 text-base font-black leading-snug text-white sm:text-lg">' + title + '</h4>'
      + '<p class="m-0 mt-1 text-sm leading-6 text-indigo-100/75">' + summary + '</p>'
      + '</div>'
      + '</div>'
      + bodyHtml
      + '</section>';
  }

  function getHealthSignalGuide(el, state) {
    var guide = {
      wood: {
        excess: ['목·어깨 긴장, 예민함, 두통성 피로가 먼저 느껴질 수 있습니다.', '강하게 뻗는 기운이 과열되지 않도록 속도와 감정 반응을 낮추는 방향이 좋습니다.'],
        deficient: ['눈 피로, 의욕 저하, 몸이 뻣뻣한 느낌이 나타나기 쉽습니다.', '무리한 확장보다 작은 회복감을 쌓아 목(木)의 생장 리듬을 되살리는 흐름이 필요합니다.'],
        pressure: ['계획과 압박이 긴장감이나 소화 부담으로 번지기 쉽습니다.', '해야 할 일을 한 번에 몰지 않고 리듬을 낮추는 것이 오늘의 중심입니다.'],
        stable: ['확장성과 회복 탄력이 비교적 안정적으로 작동합니다.', '좋은 리듬이 흐트러지지 않도록 과한 속도만 경계하면 됩니다.']
      },
      fire: {
        excess: ['심박이 빨라지거나 초조함, 불면성 피로가 느껴지기 쉽습니다.', '열감과 자극이 커지지 않도록 흥분도를 낮추는 쪽으로 균형을 잡으세요.'],
        deficient: ['순환이 둔하고 손발이 차거나 동기가 낮아질 수 있습니다.', '작은 활력을 안전하게 깨우는 방향이 오늘의 회복 포인트입니다.'],
        pressure: ['열감과 긴장이 다른 축을 압박해 집중력과 회복감이 흔들릴 수 있습니다.', '일정을 압축하기보다 중간 완충 구간을 만드는 것이 좋습니다.'],
        stable: ['활력과 표현 리듬이 비교적 무리 없이 이어집니다.', '활동과 회복의 간격을 지키면 안정감이 오래 갑니다.']
      },
      earth: {
        excess: ['몸이 무겁고 식후 졸림, 복부 더부룩함이 쉽게 쌓일 수 있습니다.', '쌓이는 기운을 가볍게 비우고 중심 리듬을 단순하게 만드는 것이 중요합니다.'],
        deficient: ['소화 리듬 저하, 식후 피로, 복부 무거움이 나타나기 쉽습니다.', '비어 있는 중심축을 무리 없이 채우는 방향으로 생활 리듬을 안정시키세요.'],
        pressure: ['목(木) 과열이나 일정 압박이 소화 리듬을 누르기 쉽습니다.', '외부 속도에 끌려가기보다 몸의 중심 신호를 먼저 확인하는 것이 좋습니다.'],
        stable: ['생활 리듬과 소화 축이 비교적 안정적으로 받쳐줍니다.', '기본 리듬만 흐트러뜨리지 않으면 컨디션이 무난하게 이어집니다.']
      },
      metal: {
        excess: ['흉곽·어깨가 굳고 완벽주의성 긴장이 올라올 수 있습니다.', '기준을 조금 낮추고 몸의 수렴감이 굳어지지 않게 여백을 두세요.'],
        deficient: ['건조감, 호흡 얕아짐, 집중력 저하가 느껴지기 쉽습니다.', '금(金)의 정리력과 맑은 호흡 리듬을 부드럽게 보완하는 흐름이 필요합니다.'],
        pressure: ['화(火) 과열이나 과로가 호흡·피부·집중 리듬을 건드릴 수 있습니다.', '과한 자극보다 정돈감과 안정감을 우선하는 것이 좋습니다.'],
        stable: ['호흡, 정리력, 집중 리듬이 비교적 선명하게 유지됩니다.', '건조함과 긴장감만 방치하지 않으면 안정감이 이어집니다.']
      },
      water: {
        excess: ['무기력, 과수면, 몸이 축 처지는 느낌이 생길 수 있습니다.', '가라앉는 기운이 오래 머물지 않도록 회복의 방향만 가볍게 열어두세요.'],
        deficient: ['냉감, 허리 피로, 수면 질 저하가 나타나기 쉽습니다.', '수(水)의 저장력과 회복감을 무리 없이 보완하는 흐름이 필요합니다.'],
        pressure: ['토(土) 정체나 과로가 회복 저장고를 눌러 피로가 오래갈 수 있습니다.', '무리한 일정 대신 회복 여백을 먼저 확보하는 것이 좋습니다.'],
        stable: ['회복력과 장기전의 버티는 힘이 비교적 안정적입니다.', '늦은 밤 자극을 줄이면 안정감이 더 오래 갑니다.']
      }
    };
    return ((guide[el] || guide.earth)[state]) || guide.earth.stable;
  }

  function getHealthElementPositiveCopy(el) {
    return ({
      wood: '회복력, 성장성, 추진력, 해독 리듬, 근육과 인대의 탄력이 강점으로 쓰이는 축입니다.',
      fire: '활력, 순환감, 표현력, 대사 점화가 살아나기 쉬운 축입니다.',
      earth: '소화 리듬, 중심감, 안정성, 회복 기반을 받쳐주는 축입니다.',
      metal: '호흡, 피부 컨디션, 면역 리듬, 정리력이 선명해지기 쉬운 축입니다.',
      water: '수면, 회복, 신장·방광 리듬, 깊은 휴식감을 담당하는 축입니다.'
    })[el] || '생활 리듬의 균형을 받쳐주는 축입니다.';
  }

  function getHealthElementSupportCopy(el) {
    return ({
      wood: '목(木)이 약해지면 회복 방향을 잡기 어렵고 긴장이 쌓이기 쉽습니다. 가벼운 산책과 호흡으로 생장 리듬을 부드럽게 열어주세요.',
      fire: '화(火)가 약해지면 활력과 순환감이 둔해질 수 있습니다. 무리한 자극보다 따뜻한 휴식과 일정한 수면 리듬이 어울립니다.',
      earth: '토(土)가 약해지면 식후 피로, 소화 부담, 복부 냉감, 기력 저하가 생활 신호로 나타나기 쉽습니다. 따뜻한 식사와 규칙적인 식사 시간이 중심입니다.',
      metal: '금(金)이 약해지면 건조감, 얕은 호흡, 변비 경향, 집중력 저하가 생활 신호로 나타나기 쉽습니다. 습도, 수분, 식이섬유, 정돈된 환경을 챙기세요.',
      water: '수(水)가 약해지면 피로 누적, 수면 질 저하, 긴장성 건조감이 생활 신호로 나타나기 쉽습니다. 밤 시간 자극을 줄이고 깊은 휴식 여백을 확보하세요.'
    })[el] || '부족한 축은 강하게 밀어붙이기보다 반복 가능한 생활 균형으로 보완하는 편이 좋습니다.';
  }

  function getHealthSignalGuideV2(el, state) {
    var guide = {
      wood: {
        excess: ['목(木)이 과열되면 예민함, 분노 누적, 목·어깨 긴장, 두통성 피로, 눈 피로가 생활 신호로 먼저 나타날 수 있습니다.', '카페인·음주·늦은 야식을 줄이고, 목·어깨 이완과 산책, 긴 호흡으로 스트레스를 밖으로 흘려보내는 관리가 어울립니다.'],
        deficient: ['목(木)의 성장성이 약해지면 회복 방향이 흐려지고 몸이 뻣뻣하게 느껴지는 경향이 있습니다.', '무리한 추진보다 가벼운 움직임, 푸른 채소, 짧은 스트레칭으로 생장 리듬을 천천히 되살려주세요.'],
        pressure: ['목(木)이 압박을 받으면 계획은 많지만 몸이 따라오지 않아 긴장과 피로가 함께 쌓이는 경향이 있습니다.', '오늘은 속도를 낮추고 감정 반응을 바로 폭발시키기보다 호흡과 산책으로 긴장을 배출하는 편이 좋습니다.'],
        stable: ['목(木)의 회복력과 성장성이 비교적 안정적으로 흐르는 날입니다.', '추진력은 살리되 카페인, 음주, 늦은 야식처럼 긴장을 키우는 패턴만 가볍게 줄여주세요.']
      },
      fire: {
        excess: ['화(火)가 과열되면 심박 예민, 열감, 수면 얕아짐, 조급함이 생활 신호로 올라오기 쉽습니다.', '과열되는 운동과 늦은 시간의 강한 화면을 줄이고, 몸과 마음을 식히는 차분한 휴식 루틴을 먼저 두세요.'],
        deficient: ['화(火)가 약해지면 활력과 순환감, 표현력이 둔해지는 경향이 있습니다.', '강한 자극보다 햇빛, 따뜻한 식사, 짧은 움직임으로 대사 점화를 부드럽게 깨우는 흐름이 좋습니다.'],
        pressure: ['화(火)가 압박되면 마음은 급한데 회복감이 따라오지 않아 집중과 수면 리듬이 흔들릴 수 있습니다.', '오늘은 경쟁적인 속도보다 잠깐 멈추는 시간을 넣어 열감이 쌓이지 않게 조율하세요.'],
        stable: ['화(火)의 활력, 순환, 표현력이 비교적 안정적으로 쓰이는 날입니다.', '활동 후 바로 쉬는 간격을 붙이면 대사 리듬과 수면 리듬이 더 편안하게 이어집니다.']
      },
      earth: {
        excess: ['토(土)가 무겁게 쌓이면 몸이 둔하고 식후 졸림, 복부 더부룩함이 생활 신호로 나타나기 쉽습니다.', '과식과 오래 앉아있기를 줄이고, 식사량을 가볍게 조절해 중심감을 회복하는 흐름이 좋습니다.'],
        deficient: ['토(土)가 부족하면 식후 피로, 소화 부담, 복부 냉감, 기력 저하가 생활 신호로 나타나기 쉽습니다.', '따뜻한 식사, 규칙적인 식사 시간, 식후 걷기, 과식 금지가 오늘의 관리 포인트입니다.'],
        pressure: ['토(土)가 압박받으면 외부 일정이나 감정 긴장이 소화 리듬과 중심감을 흔드는 경향이 있습니다.', '식사 시간을 미루지 말고 따뜻하고 단순한 식사로 몸의 중심을 먼저 세워주세요.'],
        stable: ['토(土)의 소화, 중심감, 안정성, 회복 기반이 비교적 안정적으로 받쳐주는 날입니다.', '정해진 시간에 먹고 가볍게 움직이는 기본 리듬을 유지하면 컨디션이 무난하게 이어집니다.']
      },
      metal: {
        excess: ['금(金)이 강하게 굳으면 흉곽과 어깨가 조여 들고 완벽주의성 긴장이 올라오는 경향이 있습니다.', '기준을 조금 낮추고 복식호흡과 정돈된 환경으로 몸과 마음의 여백을 만들어주세요.'],
        deficient: ['금(金)이 부족하면 건조감, 호흡 얕음, 변비 경향, 집중력 저하가 생활 신호로 나타나기 쉽습니다.', '습도 관리, 수분, 식이섬유, 복식호흡, 정돈된 환경이 오늘의 관리 포인트입니다.'],
        pressure: ['금(金)이 압박받으면 과로와 열감이 호흡, 피부 컨디션, 집중 리듬을 건드리는 경향이 있습니다.', '자극적인 환경을 줄이고 환기, 가벼운 정리, 긴 호흡으로 금(金)의 맑은 리듬을 회복하세요.'],
        stable: ['금(金)의 호흡, 피부 컨디션, 면역 리듬, 정리력이 비교적 선명한 날입니다.', '건조함만 방치하지 않으면 집중력과 안정감이 부드럽게 이어집니다.']
      },
      water: {
        excess: ['수(水)가 무겁게 흐르면 몸이 축 처지거나 활동 리듬이 늦어지는 경향이 있습니다.', '완전한 비활동보다 짧은 움직임과 일정한 수면 시간을 유지해 회복 리듬을 흐르게 해주세요.'],
        deficient: ['수(水)가 부족하면 피로 누적, 수면 질 저하, 긴장성 건조감이 생활 신호로 나타나기 쉽습니다.', '수분, 수면, 과로 제한, 밤 시간 자극 줄이기가 오늘의 관리 포인트입니다.'],
        pressure: ['수(水)가 압박받으면 회복 저장고가 눌려 피로가 오래 머무는 경향이 있습니다.', '늦은 밤 자극을 줄이고, 무리한 일정 대신 깊게 쉬는 시간을 먼저 확보하세요.'],
        stable: ['수(水)의 수면, 회복, 깊은 휴식 리듬이 비교적 안정적으로 흐르는 날입니다.', '밤 시간의 화면, 소음, 감정 소모를 줄이면 회복감이 더 오래 이어집니다.']
      }
    };
    return ((guide[el] || guide.earth)[state]) || guide.earth.stable;
  }

  function getTodayConditionCopyV2(todayEl, targetEl, avoidEl, strongestEl) {
    var lead = {
      wood: '오늘은 목(木)의 긴장과 추진력이 함께 올라오기 쉬운 날입니다.',
      fire: '오늘은 화(火)의 열감과 속도가 빨라지기 쉬운 날입니다.',
      earth: '오늘은 토(土)의 중심감과 소화 리듬을 살피기 좋은 날입니다.',
      metal: '오늘은 금(金)의 호흡과 정리 리듬이 컨디션을 좌우하기 쉽습니다.',
      water: '오늘은 수(水)의 수면과 회복 리듬이 중요하게 작동하는 날입니다.'
    }[todayEl] || '오늘은 생활 리듬의 균형을 차분히 살피기 좋은 날입니다.';

    var second = '오늘 보완할 축은 ' + EL_NAME[targetEl] + ', 줄이면 좋은 자극은 ' + EL_NAME[avoidEl] + '입니다.';
    if (todayEl === strongestEl) {
      second = '타고난 강점 축과 오늘의 기운이 겹치므로 속도를 더 올리기보다 생활 신호를 살피며 회복 루틴을 단순하게 잡는 것이 좋습니다.';
    } else if (todayEl === targetEl) {
      second = '오늘의 기운이 보완축과 맞물리므로 작은 루틴 하나만 실행해도 균형감이 붙기 쉽습니다.';
    } else if (todayEl === avoidEl) {
      second = '오늘은 줄여야 할 자극이 함께 올라올 수 있어, 밤 시간 자극과 무리한 일정을 낮추는 쪽이 좋습니다.';
    }
    return { lead: lead, second: second };
  }

  function getTodayConditionCopy(todayEl, targetEl, avoidEl, strongestEl) {
    var lead = {
      wood: '오늘은 목(木)의 긴장감이 올라오기 쉬운 날입니다.',
      fire: '오늘은 화(火)의 속도와 열감이 빨라지기 쉬운 날입니다.',
      earth: '오늘은 토(土)의 무거움과 소화 리듬을 살펴야 하는 날입니다.',
      metal: '오늘은 금(金)의 건조함과 호흡 리듬을 챙기면 좋은 날입니다.',
      water: '오늘은 수(水)의 회복력과 수면 리듬이 컨디션을 좌우하기 쉽습니다.'
    }[todayEl] || '오늘은 생활 리듬의 균형을 살피기 좋은 날입니다.';

    var second = '오늘 필요한 기운은 ' + EL_NAME[targetEl] + '이고, 줄이면 좋은 기운은 ' + EL_NAME[avoidEl] + '입니다.';
    if (todayEl === strongestEl) {
      second = '타고난 강점 축과 오늘의 기운이 겹치므로 속도를 높이기보다 회복 루틴의 우선순위를 낮고 단순하게 잡는 것이 핵심입니다.';
    } else if (todayEl === targetEl) {
      second = '오늘의 기운이 보완축과 맞물리므로 작은 루틴을 바로 실행하면 회복감이 빠르게 붙습니다.';
    } else if (todayEl === avoidEl) {
      second = '오늘은 줄여야 할 기운이 함께 올라오므로 자극을 덜고 회복 루틴을 먼저 배치하세요.';
    }
    return { lead: lead, second: second };
  }

  function renderHealthInfoCard(label, value, body, accent) {
    return '<div class="cd-health-info rounded-2xl border border-white/10 bg-slate-950/24 p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-white/5 backdrop-blur-xl">'
      + '<div class="mb-1 text-[11px] font-black leading-5 text-indigo-100/60">' + label + '</div>'
      + '<div class="mb-1 text-sm font-black leading-6 text-white">' + value + '</div>'
      + '<p class="m-0 text-[13px] leading-6 text-indigo-50/75">' + body + '</p>'
      + '</div>';
  }

  function renderHealthFoodList(targetEl) {
    var sourceFoods = (HEALTH_FOOD_PLAN[targetEl] || HEALTH_FOOD_PLAN.earth || []);
    var foods = sourceFoods.filter(Boolean).slice(0, 5);
    if (!foods.length) foods = HEALTH_DEFAULT_FOOD_PLAN.slice(0, 5);
    var theme = getHealthElementTheme(targetEl);
    return foods.map(function (food, idx) {
      var foodEl = food.element || targetEl;
      return '<li class="cd-health-food rounded-2xl border border-white/10 bg-white/[0.07] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">'
        + '<div class="mb-2 flex items-start gap-2">'
        + '<span class="grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[12px] font-black ' + theme.badge + '">' + (idx + 1) + '</span>'
        + '<div class="min-w-0">'
        + '<b class="block text-sm font-black leading-5 text-white">' + escapeHealthHtml(food.name) + '</b>'
        + '<span class="mt-0.5 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-black leading-4 ' + getHealthElementTheme(foodEl).badge + '">보완 오행: ' + escapeHealthHtml(EL_NAME[foodEl] || EL_NAME[targetEl]) + '</span>'
        + '</div>'
        + '</div>'
        + '<p class="m-0 text-[13px] leading-6 text-indigo-50/78"><b class="text-indigo-100">추천 이유:</b> ' + escapeHealthHtml(food.reason) + '</p>'
        + '<p class="m-0 mt-2 text-[13px] leading-6 text-indigo-50/68"><b class="text-indigo-100">오늘 먹는 팁:</b> ' + escapeHealthHtml(food.tip || '과식하지 말고 따뜻하고 담백하게 드세요.') + '</p>'
        + '</li>';
    }).join('');
  }

  function renderHealthWellnessStyle() {
    return '<style data-cd-health-ui="health-wellness-sunrise-v20260607">'
      + '.cd-health-wellness-v20260607{background:linear-gradient(135deg,#fffdf4 0%,#f0fff7 42%,#e7f8ff 100%)!important;border:1px solid rgba(20,184,166,.28)!important;color:#12352d!important;box-shadow:0 24px 70px rgba(13,148,136,.18),inset 0 1px 0 rgba(255,255,255,.88)!important}'
      + '.cd-health-wellness-v20260607 *{letter-spacing:0!important}'
      + '.cd-health-wellness-v20260607 h3,.cd-health-wellness-v20260607 h4,.cd-health-wellness-v20260607 b{color:#103d34!important}'
      + '.cd-health-wellness-v20260607 p,.cd-health-wellness-v20260607 div,.cd-health-wellness-v20260607 span,.cd-health-wellness-v20260607 li{color:#255247!important}'
      + '.cd-health-wellness-v20260607 .cd-health-hero,.cd-health-wellness-v20260607 .cd-health-section,.cd-health-wellness-v20260607 .cd-health-info,.cd-health-wellness-v20260607 .cd-health-food,.cd-health-wellness-v20260607 .cd-health-risk,.cd-health-wellness-v20260607 .cd-health-mission{background:rgba(255,255,255,.82)!important;border-color:rgba(20,184,166,.20)!important;box-shadow:0 14px 36px rgba(15,118,110,.10),inset 0 1px 0 rgba(255,255,255,.90)!important}'
      + '.cd-health-wellness-v20260607 .cd-health-hero{background:linear-gradient(135deg,rgba(255,255,255,.94),rgba(236,253,245,.90) 52%,rgba(224,242,254,.86))!important}'
      + '.cd-health-wellness-v20260607 .cd-health-kicker{background:#ecfdf5!important;border-color:rgba(16,185,129,.32)!important;color:#047857!important}'
      + '.cd-health-wellness-v20260607 .cd-health-grade{background:#fff7ed!important;border-color:rgba(251,146,60,.32)!important;color:#7c2d12!important}'
      + '.cd-health-wellness-v20260607 .cd-health-callout{background:#dcfce7!important;border-color:rgba(34,197,94,.30)!important;color:#14532d!important}'
      + '.cd-health-wellness-v20260607 .cd-health-section-icon{background:#f0fdfa!important;border-color:rgba(20,184,166,.24)!important;color:#0f766e!important}'
      + '.cd-health-wellness-v20260607 .cd-health-pill{background:#ffffff!important;border-color:rgba(20,184,166,.24)!important;color:#0f766e!important}'
      + '.cd-health-wellness-v20260607 .cd-health-avoid{background:#fff7ed!important;border-color:rgba(251,146,60,.30)!important;color:#9a3412!important}'
      + '.cd-health-wellness-v20260607 .text-white,.cd-health-wellness-v20260607 [class*="text-indigo"],.cd-health-wellness-v20260607 [class*="text-amber"],.cd-health-wellness-v20260607 [class*="text-orange"],.cd-health-wellness-v20260607 [class*="text-emerald"],.cd-health-wellness-v20260607 [class*="text-sky"],.cd-health-wellness-v20260607 [class*="text-zinc"],.cd-health-wellness-v20260607 [class*="text-slate"]{color:#255247!important}'
      + '</style>';
  }

  function buildWellnessHealthReport(p, natal, johu, pw, jg) {
    natal = natal || {};
    johu = johu || {};
    var ratios = getHealthRatios(natal);
    var sorted = HEALTH_ELEMENT_ORDER.slice().sort(function (a, b) { return ratios[b] - ratios[a]; });
    var strongestEl = sorted[0] || 'earth';
    var weakestEls = sorted.slice(-2).reverse();
    var controlImpacts = getHealthControlImpacts(ratios);
    var axes = getHealthTargetAxes(pw, jg, johu, controlImpacts);
    var rawTodayEl = getTodayHealthElement();
    var hasTodayElement = !!rawTodayEl;
    var todayEl = rawTodayEl || strongestEl;
    var condition = getTodayConditionCopyV2(todayEl, axes.targetEl, axes.avoidEl, strongestEl);
    if (!hasTodayElement) {
      condition = {
        lead: '오늘의 일진 데이터가 확인되지 않아 선천 체질 베이스만 안전하게 표시합니다.',
        second: '사주 원국의 장기적 경향을 기준으로 강점 축과 보완 축만 차분히 읽어주세요.'
      };
    }
    var riskKeys = [];
    function addRisk(el) {
      if (el && riskKeys.indexOf(el) === -1) riskKeys.push(el);
    }
    controlImpacts.forEach(function (impact) { addRisk(impact.target); });
    addRisk(strongestEl);
    weakestEls.forEach(addRisk);
    addRisk(axes.targetEl);
    if (hasTodayElement) addRisk(todayEl);
    riskKeys = riskKeys.slice(0, 3);

    var riskHtml = riskKeys.map(function (el) {
      var state = getHealthState(el, ratios, controlImpacts);
      var guide = getHealthSignalGuideV2(el, state);
      var theme = getHealthElementTheme(el);
      return '<article class="cd-health-risk rounded-2xl border p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 backdrop-blur-xl ' + theme.soft + '">'
        + '<div class="mb-3 flex items-start justify-between gap-3">'
        + '<div class="flex min-w-0 items-center gap-2">'
        + '<span class="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/10 text-base">' + EL_ICON[el] + '</span>'
        + '<div class="min-w-0">'
        + '<b class="block text-sm font-black leading-5 text-white">' + EL_NAME[el] + '</b>'
        + '<span class="block text-[11px] font-bold leading-4 text-indigo-100/55">' + EL_ORGAN[el] + ' 리듬</span>'
        + '</div>'
        + '</div>'
        + '<span class="shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black leading-none ' + theme.badge + '">' + getHealthStateLabel(state) + '</span>'
        + '</div>'
        + '<p class="m-0 text-[13px] leading-6 text-indigo-50/80"><b class="' + theme.text + '">생활 신호</b><br>' + guide[0] + '</p>'
        + '<p class="m-0 mt-2 text-[13px] leading-6 text-indigo-50/72"><b class="' + theme.text + '">관리 포인트</b><br>' + guide[1] + '</p>'
        + '</article>';
    }).join('');

    var missionList = [
      '오늘의 회복 루틴에서 식단 항목 1가지만 선택하기',
      '오늘의 회복 루틴에서 움직임 항목을 한 번 완료하기',
      '잠들기 전 회복을 방해하는 자극 하나 줄이기'
    ];
    var grade = getHealthConditionGrade(riskKeys, ratios, controlImpacts);
    var routineFocus = getHealthRoutineFocus(axes.targetEl);

    if (!hasTodayElement) {
      return renderHealthWellnessStyle()
        + '<div class="ec-card ent-reveal cd-health-wellness-v20260607 relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-950 via-slate-950 to-violet-950 p-4 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-2xl sm:p-5" data-marker="health-wellness-sunrise-v20260607" data-legacy-marker="달빛 웰니스 클리닉">'
        + '<div class="relative z-10 grid gap-4">'
        + '<header class="cd-health-hero rounded-2xl border border-white/10 bg-white/[0.075] p-4 shadow-[0_18px_54px_rgba(2,6,23,0.36)] ring-1 ring-white/10 backdrop-blur-2xl sm:p-5">'
        + '<div class="cd-health-kicker mb-2 inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1 text-[11px] font-black text-amber-100">☀ 햇살 웰니스 리포트</div>'
        + '<h3 class="m-0 text-xl font-black leading-tight text-white sm:text-2xl">명리 헬스 리포트</h3>'
        + '<p class="m-0 mt-2 max-w-2xl text-sm leading-6 text-indigo-100/78">선천 체질 기준으로 몸의 균형과 회복 리듬을 맑게 정리합니다.</p>'
        + '<div class="mt-4 flex flex-wrap gap-2">'
        + renderHealthPill('선천 강점', EL_NAME[strongestEl], strongestEl)
        + renderHealthPill('보완 축', weakestEls.map(function (el) { return EL_NAME[el]; }).join(', '), weakestEls[0] || strongestEl)
        + '</div>'
        + '<div class="cd-health-callout mt-4 rounded-2xl border border-emerald-200/20 bg-emerald-300/10 p-3">'
        + '<div class="mb-1 text-[11px] font-black text-emerald-100/80">선천 체질 기준 안내</div>'
        + '<p class="m-0 text-sm font-black leading-6 text-white sm:text-base">' + condition.lead + '</p>'
        + '<p class="m-0 mt-2 text-[13px] leading-6 text-indigo-50/76">' + condition.second + '</p>'
        + '</div>'
        + '</header>'
        + renderHealthSection('🌙', '선천 체질 베이스', '사주 원국 기준의 장기 체질 경향만 따로 읽습니다.',
          '<div class="grid gap-3 sm:grid-cols-3">'
          + renderHealthInfoCard('강하게 쓰이는 축', EL_NAME[strongestEl], getHealthElementPositiveCopy(strongestEl) + ' 강한 오행은 장점이지만, 과열되면 오히려 피로 신호가 먼저 나타날 수 있습니다.', EL_NEON[strongestEl])
          + renderHealthInfoCard('쉽게 피로해지는 축', weakestEls.map(function (el) { return EL_NAME[el]; }).join(', '), weakestEls.map(getHealthElementSupportCopy).join(' '), '#f59e0b')
          + renderHealthInfoCard('보완이 필요한 축', weakestEls.map(function (el) { return EL_NAME[el]; }).join(', '), '장기적으로 비어 보이는 축은 강하게 밀어붙이기보다 반복 가능한 생활 균형으로 보완하는 편이 좋습니다.', '#14b8a6')
          + '</div>')
        + '<p class="m-0 rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-[11px] leading-5 text-indigo-100/55">의료 진단이 아닌 사주 기반 웰니스 참고용 가이드입니다. 증상이 지속되면 전문의 상담을 권장합니다.</p>'
        + '</div>'
        + '</div>';
    }

    return renderHealthWellnessStyle()
      + '<div class="ec-card ent-reveal cd-health-wellness-v20260607 relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-950 via-slate-950 to-violet-950 p-4 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-2xl sm:p-5" data-marker="health-wellness-sunrise-v20260607" data-legacy-marker="달빛 웰니스 클리닉">'
      + '<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>'
      + '<div class="relative z-10 grid gap-4">'

      + '<header class="cd-health-hero rounded-2xl border border-white/10 bg-white/[0.075] p-4 shadow-[0_18px_54px_rgba(2,6,23,0.36)] ring-1 ring-white/10 backdrop-blur-2xl sm:p-5">'
      + '<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">'
      + '<div class="min-w-0">'
      + '<div class="cd-health-kicker mb-2 inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1 text-[11px] font-black text-amber-100">☀ 햇살 웰니스 리포트</div>'
      + '<h3 class="m-0 text-xl font-black leading-tight text-white sm:text-2xl">명리 헬스 리포트</h3>'
      + '<p class="m-0 mt-2 max-w-2xl text-sm leading-6 text-indigo-100/78">사주 원국과 오늘의 기운을 함께 읽어 컨디션, 식사, 움직임의 균형을 밝게 정리합니다.</p>'
      + '</div>'
      + '<div class="cd-health-grade rounded-2xl border border-white/10 bg-slate-950/32 p-3 text-left shadow-inner sm:min-w-[12rem]">'
      + '<div class="text-[11px] font-black text-indigo-100/55">오늘의 컨디션 등급</div>'
      + '<div class="mt-1 text-lg font-black text-amber-100">' + escapeHealthHtml(grade.label) + '</div>'
      + '<p class="m-0 mt-1 text-[12px] leading-5 text-indigo-50/70">' + escapeHealthHtml(grade.body) + '</p>'
      + '</div>'
      + '</div>'
      + '<div class="mt-4 flex flex-wrap gap-2">'
      + renderHealthPill('오늘 보완', EL_NAME[axes.targetEl], axes.targetEl)
      + renderHealthPill('오늘 주의', EL_NAME[axes.avoidEl], axes.avoidEl)
      + renderHealthPill('안정 루틴', routineFocus, axes.targetEl)
      + '</div>'
      + '<div class="cd-health-callout mt-4 rounded-2xl border border-emerald-200/20 bg-emerald-300/10 p-3">'
      + '<div class="mb-1 text-[11px] font-black text-emerald-100/80">1. 오늘의 한 줄 컨디션</div>'
      + '<p class="m-0 text-sm font-black leading-6 text-white sm:text-base">' + condition.lead + '</p>'
      + '<p class="m-0 mt-2 text-[13px] leading-6 text-indigo-50/76">' + condition.second + '</p>'
      + '</div>'
      + '</header>'

      + renderHealthSection('🌙', '2. 선천 체질 베이스', '사주 원국 기준의 장기 체질 경향만 따로 읽습니다.',
        '<div class="grid gap-3 sm:grid-cols-3">'
        + renderHealthInfoCard('강하게 쓰이는 축', EL_NAME[strongestEl], getHealthElementPositiveCopy(strongestEl) + ' 강한 오행은 장점이지만, 과열되면 오히려 피로 신호가 먼저 나타날 수 있습니다.', EL_NEON[strongestEl])
        + renderHealthInfoCard('쉽게 피로해지는 축', weakestEls.map(function (el) { return EL_NAME[el]; }).join(', '), weakestEls.map(getHealthElementSupportCopy).join(' '), '#f59e0b')
        + renderHealthInfoCard('보완이 필요한 축', weakestEls.map(function (el) { return EL_NAME[el]; }).join(', '), '장기적으로 비어 보이는 축은 강하게 밀어붙이기보다 반복 가능한 생활 균형으로 보완하는 편이 좋습니다.', '#14b8a6')
        + '</div>')

      + renderHealthSection('⚖️', '3. 오늘의 오행 밸런스', '오늘의 기운과 원국이 만나는 지점을 실행 우선순위로 정리합니다.',
        '<div class="grid gap-3 sm:grid-cols-3">'
        + renderHealthInfoCard('오늘 필요한 오행', EL_NAME[axes.targetEl], '부족하거나 압박받는 축을 먼저 보완해 컨디션의 중심을 잡습니다.', EL_NEON[axes.targetEl])
        + renderHealthInfoCard('오늘 줄여야 할 오행', EL_NAME[axes.avoidEl], '과열되기 쉬운 자극을 줄이면 다른 장부 리듬의 부담이 낮아집니다.', EL_NEON[axes.avoidEl])
        + renderHealthInfoCard('오늘 유지하면 좋은 습관', '리듬 안정 · 자극 낮추기 · 회복 여백', '세부 실행은 아래 회복 루틴 한 곳에서만 확인하도록 정리했습니다.', '#14b8a6')
        + '</div>')

      + renderHealthSection('🫧', '4. 장부/생활 리스크 가이드', '오늘 실제로 중요한 상위 신호만 2~3개로 압축했습니다.',
        '<div class="grid gap-3">' + riskHtml + '</div>')

      + renderHealthSection('🍽️', '5. 오늘의 회복 루틴', '식단, 움직임, 휴식, 환경을 한 곳에 모은 오늘의 웰니스 처방입니다.',
        '<div class="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(240px,.85fr)]">'
        + '<div class="cd-health-info rounded-2xl border border-white/10 bg-slate-950/24 p-3 ring-1 ring-white/5 backdrop-blur-xl">'
        + '<div class="mb-3 flex items-center justify-between gap-3">'
        + '<b class="text-sm font-black text-white">오늘의 추천 5선</b>'
        + '<span class="rounded-full border px-2.5 py-1 text-[11px] font-black ' + getHealthElementTheme(axes.targetEl).badge + '">' + EL_NAME[axes.targetEl] + '</span>'
        + '</div>'
        + '<ul class="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">' + renderHealthFoodList(axes.targetEl) + '</ul>'
        + '</div>'
        + '<div class="grid gap-3">'
        + renderHealthInfoCard('운동', '무리하지 않는 회복 움직임', HEALTH_MOVEMENT_PLAN[axes.targetEl] || HEALTH_MOVEMENT_PLAN.earth, EL_NEON[axes.targetEl])
        + renderHealthInfoCard('휴식', '자극 낮추기', '취침 전 30분은 강한 화면과 감정 소모 대화를 줄이세요.', '#8b5cf6')
        + renderHealthInfoCard('환경', '몸이 편한 공간 만들기', HEALTH_ENV_PLAN[axes.targetEl] || HEALTH_ENV_PLAN.earth, '#0ea5e9')
        + '</div>'
        + '</div>')

      + '<section class="cd-health-section rounded-2xl border border-white/10 bg-white/[0.075] p-4 shadow-[0_18px_48px_rgba(2,6,23,0.28)] ring-1 ring-white/10 backdrop-blur-2xl sm:p-5">'
      + '<div class="mb-3 flex items-start gap-3">'
      + '<span class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/10 text-lg shadow-inner">✓</span>'
      + '<div class="min-w-0">'
      + '<h4 class="m-0 text-base font-black leading-snug text-white sm:text-lg">6. 오늘의 헬스 미션</h4>'
      + '<p class="m-0 mt-1 text-sm leading-6 text-indigo-100/75">바로 실행할 3개만 남긴 체크리스트입니다.</p>'
      + '</div>'
      + '</div>'
      + '<ol class="m-0 grid list-none gap-2 p-0">'
      + missionList.map(function (mission) {
        return '<li class="cd-health-mission flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/24 p-3 ring-1 ring-white/5">'
          + '<span class="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-emerald-200/30 bg-emerald-300/15 text-[12px] font-black text-emerald-100">✓</span>'
          + '<span class="text-sm font-bold leading-6 text-indigo-50/82">' + escapeHealthHtml(mission) + '</span>'
          + '</li>';
      }).join('')
      + '</ol>'
      + '<div class="cd-health-avoid mt-3 rounded-2xl border border-orange-200/20 bg-orange-400/10 p-3 text-[13px] leading-6 text-orange-100"><b>오늘 피해야 할 패턴:</b> ' + escapeHealthHtml(HEALTH_AVOID_PLAN[axes.avoidEl] || HEALTH_AVOID_PLAN.earth) + '</div>'
      + '<p class="m-0 mt-4 border-t border-white/10 pt-3 text-[11px] leading-5 text-indigo-100/55">의료 진단이 아닌 사주 기반 웰니스 참고용 가이드입니다. 증상이 지속되면 전문의 상담을 권장합니다.</p>'
      + '</section>'
      + '</div>'
      + '</div>';
  }


  /* ════════════════════════════════════════════════════════
     §5  원본 함수 오버라이드
         (saju-engine.js 이후 로드되므로 안전하게 교체 가능)
     ════════════════════════════════════════════════════════ */

  // ① 명리 헬스 리포트 — 웰니스 6블록 단일 구조
  var _origHealth = w.renderHealthReport;
  w.renderHealthReport = function (p, natal, johu, pw, jg) {
    var area = document.getElementById('healthReportSection');
    var card = document.getElementById('healthReportCard');
    if (!area || !card) return;

    try {
      area.innerHTML = buildWellnessHealthReport(p, natal, johu || {}, pw, jg);
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
    var oldRoot = document.getElementById('entRpgSection');
    if (oldRoot && oldRoot.parentNode) oldRoot.parentNode.removeChild(oldRoot);
    var questEl = document.createElement('div');
    questEl.innerHTML = buildRpgTemplate({ loading: true }, p);
    var questNode = questEl.firstElementChild || questEl;
    area.appendChild(questNode);
    _scheduleReveal(area);
    loadRpgStatus(questNode, p);
  };

  // ③ 테토-에겐 — 계산 결과는 원본 엔진을 그대로 쓰고, 화면 구조만 단일 결과 리포트로 재구성한다.
  var _origHormone = w.renderHormoneVibe;
  w.renderHormoneVibe = function (p, power) {
    var section = document.getElementById('hormone-vibe-section');
    var target = document.getElementById('hormoneVibeResult');
    if (!section || !target) return;

    section.style.display = 'block';
    section.style.visibility = 'visible';

    var vibe;
    try {
      vibe = w.calculateHormoneVibe ? w.calculateHormoneVibe(p || {}, power || {}) : null;
    } catch (err) {
      console.warn('[entertain-tetoegen] fallback:', err);
      vibe = null;
    }

    if (!vibe || !isFinite(Number(vibe.tetoScore)) || !isFinite(Number(vibe.egenScore))) {
      vibe = {
        result: 'neutral',
        tetoScore: 35,
        egenScore: 35,
        reasons: [{ type: 'egen', icon: '⚖️', text: '일부 프로필 데이터가 비어 있어 기본 밸런스 모드로 분석했습니다.' }],
        bigyuk: 0,
        siksang: 0,
        insung: 0,
        gwansung: 0,
        jaesung: 0,
        isStrong: false,
        cnt: {}
      };
    }

    var hapData = getSafeTetogenHapData(p);
    target.innerHTML = buildTetoEgenResultSection(vibe) + buildTetoEgeDeepSection(p || {}, power || {}, hapData);
    _scheduleReveal(target);

    requestAnimationFrame(function () {
      setTimeout(function () {
        var bt = document.getElementById('hvBarTeto');
        var be = document.getElementById('hvBarEgen');
        if (bt) bt.style.width = clampTetoEgenPercent(vibe.tetoScore) + '%';
        if (be) be.style.width = clampTetoEgenPercent(vibe.egenScore) + '%';
        if (typeof w.syncReportHeightFromNode === 'function') {
          w.syncReportHeightFromNode(section);
        }
      }, 120);
    });

    if (typeof w.syncReportHeightFromNode === 'function') {
      w.syncReportHeightFromNode(section);
      setTimeout(function () { w.syncReportHeightFromNode(section); }, 260);
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
