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

  var ENTERTAIN_ENGINE_TEXT_TRANSLATIONS = {
    ko: {
      "ee_1523_prop_title": "매력 운영 가이드: 테토 드라이브형",
      "ee_1533_prop_title": "매력 운영 가이드: 에겐 공감형",
      "ee_1543_prop_title": "매력 운영 가이드: 하이브리드 밸런서",
      "ee_1553_prop_title": "매력 운영 가이드: 저자극 관찰자형",
      "ee_1563_prop_title": "매력 운영 가이드: 과몰입 변신형",
      "ee_1576_prop_title": "숨겨진 본성: 냉각형 전략가",
      "ee_1585_prop_title": "숨겨진 본성: 로직 중심 조율자",
      "ee_1594_prop_title": "숨겨진 본성: 듀얼 코어 해석자",
      "ee_1603_prop_title": "숨겨진 본성: 감정 민감 관찰자",
      "ee_1657_prop_title": "당신이 놓치고 있는 진실",
      "ee_1663_prop_title": "관계에서 반복되는 패턴",
      "ee_1669_prop_title": "이 에너지가 독이 될 때",
      "ee_1677_prop_title": "당신이 놓치고 있는 진실",
      "ee_1682_prop_title": "관계에서 반복되는 패턴",
      "ee_1687_prop_title": "이 에너지가 독이 될 때",
      "ee_1694_prop_title": "당신이 놓치고 있는 진실",
      "ee_1699_prop_title": "관계에서 반복되는 패턴",
      "ee_1704_prop_title": "이 에너지가 독이 될 때",
      "ee_1714_prop_title": "내가 진짜 원하는 걸 힘으로 밀어붙이는 습관",
      "ee_1720_prop_title": "가까운 사람이 헷갈리는 이유",
      "ee_1726_prop_title": "추진력이 번아웃으로 바뀌는 순간",
      "ee_1734_prop_title": "내가 진짜 원하는 걸 숨기는 습관",
      "ee_1740_prop_title": "가까운 사람이 헷갈리는 이유",
      "ee_1746_prop_title": "배려가 과몰입으로 바뀌는 순간",
      "ee_1754_prop_title": "내가 진짜 원하는 걸 숨기는 습관",
      "ee_1760_prop_title": "가까운 사람이 헷갈리는 이유",
      "ee_1766_prop_title": "균형감이 우유부단함으로 바뀌는 순간",
      "ee_1774_prop_title": "내가 진짜 원하는 걸 너무 늦게 보여주는 습관",
      "ee_1780_prop_title": "가까운 사람이 헷갈리는 이유",
      "ee_1786_prop_title": "절제가 기회 지연으로 바뀌는 순간",
      "ee_1794_prop_title": "내가 진짜 원하는 걸 순간 감정으로 덮는 습관",
      "ee_1800_prop_title": "가까운 사람이 헷갈리는 이유",
      "ee_1806_prop_title": "분위기 반전이 피로로 바뀌는 순간",
      "ee_1899_prop_title": "테토 우세형 🔥",
      "ee_1910_prop_title": "에겐 우세형 ✨",
      "ee_1921_prop_title": "저자극 관찰자형 🌙",
      "ee_1932_prop_title": "과몰입 변신형 ⚡",
      "ee_1942_prop_title": "하이브리드 밸런서 🌀",
      "ee_1966_prop_label": "재성",
      "ee_1972_prop_label": "식상/상관",
      "ee_1978_prop_label": "편인",
      "ee_1984_prop_label": "관성",
      "ee_1990_prop_label": "비겁",
      "ee_2015_prop_title": "연애 모드",
      "ee_2024_prop_title": "인간관계 모드",
      "ee_2033_prop_title": "커리어 모드",
      "ee_2042_prop_title": "혼자 있을 때 모드",
      "ee_2211_prop_label": "재성",
      "ee_2217_prop_label": "식상/상관",
      "ee_2223_prop_label": "편인",
      "ee_2229_prop_label": "관성",
      "ee_2235_prop_label": "비겁",
      "ee_2275_prop_title": "연애 모드",
      "ee_2284_prop_title": "인간관계 모드",
      "ee_2293_prop_title": "커리어 모드",
      "ee_2302_prop_title": "혼자 있을 때 모드",
      "ee_2599_prop_title": "테토 에겐 상세 리포트",
      "ee_2757_prop_title": "성장과 회복 리듬",
      "ee_2778_prop_title": "활력과 순환 리듬",
      "ee_2799_prop_title": "소화와 안정 리듬",
      "ee_2820_prop_title": "호흡과 정리 리듬",
      "ee_2841_prop_title": "수면과 회복 리듬",
      "ee_2886_prop_title": "금(金)이 목(木)을 압박하는 흐름",
      "ee_2887_prop_title": "목(木)이 토(土)를 압박하는 흐름",
      "ee_2888_prop_title": "토(土)가 수(水)를 압박하는 흐름",
      "ee_2889_prop_title": "수(水)가 화(火)를 압박하는 흐름",
      "ee_2890_prop_title": "화(火)가 금(金)을 압박하는 흐름",
      "ee_2894_prop_label": "비겁",
      "ee_2895_prop_label": "식상",
      "ee_2896_prop_label": "재성",
      "ee_2897_prop_label": "관성",
      "ee_2898_prop_label": "인성",
      "ee_2902_prop_title": "큰 나무형 회복 리듬",
      "ee_2903_prop_title": "덩굴형 유연 회복 리듬",
      "ee_2904_prop_title": "태양형 활력 리듬",
      "ee_2905_prop_title": "촛불형 감성 리듬",
      "ee_2906_prop_title": "산형 안정 리듬",
      "ee_2907_prop_title": "밭형 돌봄 리듬",
      "ee_2908_prop_title": "큰 쇠형 정리 리듬",
      "ee_2909_prop_title": "보석형 섬세 리듬",
      "ee_2910_prop_title": "큰 물형 회복 리듬",
      "ee_2911_prop_title": "비와 안개형 섬세 회복 리듬",
      "ee_2915_prop_title": "목(木)이 살아나는 계절",
      "ee_2916_prop_label": "여름",
      "ee_2917_prop_label": "환절기·토왕절",
      "ee_2918_prop_label": "가을",
      "ee_2919_prop_label": "겨울",
      "ee_3404_prop_label": "주의 조율",
      "ee_3405_prop_label": "균형 조율",
      "ee_3406_prop_label": "안정 관리",
      "ee_3762_prop_label": "열기 조율형",
      "ee_3764_prop_title": "위로 솟는 기운을 차분히 식히는 결",
      "ee_3774_prop_label": "한기 보온형",
      "ee_3776_prop_title": "가라앉은 기운에 온기와 움직임을 더하는 결",
      "ee_3786_prop_label": "중화 조율형",
      "ee_3788_prop_title": "큰 치우침보다 강약의 순서를 살피는 결",
      "ee_3800_prop_label": "건조 완화",
      "ee_3801_prop_title": "마른 기운에 수분과 여백을 더하는 결",
      "ee_3809_prop_label": "습기 순환",
      "ee_3810_prop_title": "머무는 기운을 가볍게 흐르게 하는 결",
      "ee_3818_prop_label": "건습 안정",
      "ee_3819_prop_title": "수분과 온도가 크게 흔들리지 않는 결",
      "ee_4003_prop_title": "오늘",
      "ee_4014_prop_title": "이번 주",
      "ee_4025_prop_title": "이번 달",
      "ee_4036_prop_title": "계절 전환기",
      "ee_4101_prop_label": "생조 보완",
      "ee_4113_prop_label": "설기 절제",
      "ee_4119_prop_label": "극 완화",
      "ee_4125_prop_label": "공간·마음 개운",
      "ee_4147_prop_label": "일간 리듬",
      "ee_4488_prop_lead": "오늘은 타고난 체질의 강약을 먼저 보는 편이 좋습니다. 몸이 익숙하게 쓰는 힘과 쉽게 지치는 자리를 나누어 살피겠습니다.",
      "ee_515_prop_label": "Lv.3 비밀 운세 해금",
      "ee_516_prop_label": "Lv.5 성향 칭호 해금",
      "ee_517_prop_label": "Lv.7 고유 패시브 확장",
      "ee_518_prop_label": "Lv.10 운명 직업군 확장",
      "ee_519_prop_label": "Lv.15 30일 성장 리포트 미리보기",
      "ee_520_prop_label": "Lv.20 마스터 스킬 강화 문구",
      "ee_79_prop_label": "子午",
      "ee_80_prop_label": "丑未",
      "ee_81_prop_label": "寅申",
      "ee_82_prop_label": "卯酉",
      "ee_83_prop_label": "辰戌",
      "ee_84_prop_label": "巳亥",
      "ee_859_prop_description": "운명 기록이 열리기 전에도 오늘의 성장 방향을 먼저 확인할 수 있습니다.",
      "ee_870_prop_description": "완료 경험을 쌓아 캐릭터 시트의 성장 흐름을 선명하게 만듭니다.",
      "ee_881_prop_description": "일간의 중심 기운을 기준으로 판단과 행동을 정렬합니다.",
    }
  };
  var __eeMissingTextLog = {};
  function _entertainTextNormalizeLang(value) {
    var normalized = String(value || "ko").trim().toLowerCase().replace("_", "-");
    if (normalized === "zh" || normalized === "zh-cn" || normalized === "zh-hans") return "zh-CN";
    if (normalized === "zh-tw" || normalized === "zh-hant" || normalized === "zh-hk" || normalized === "zh-mo") return "zh-TW";
    if (normalized === "ja-jp") return "ja";
    if (normalized === "en-us" || normalized === "en-gb") return "en";
    if (["ko", "en", "ja", "vi", "hi", "es", "fr", "de", "nl", "ms"].indexOf(normalized) >= 0) return normalized;
    return "ko";
  }
  function _entertainTextCurrentLang() {
    try {
      if (w && typeof w.cdGetCurrentLanguage === "function") return _entertainTextNormalizeLang(w.cdGetCurrentLanguage());
    } catch (_) {}
    try {
      var queryLang = new URLSearchParams(w.location.search || "").get("lang");
      if (queryLang) return _entertainTextNormalizeLang(queryLang);
    } catch (_) {}
    try {
      var firstSegment = w.location.pathname.split("/").filter(Boolean)[0];
      if (firstSegment) {
        var pathLang = _entertainTextNormalizeLang(firstSegment);
        if (pathLang !== "ko" || firstSegment.toLowerCase() === "ko") return pathLang;
      }
    } catch (_) {}
    try {
      var stored = w.localStorage && w.localStorage.getItem("cd_lang");
      if (stored) return _entertainTextNormalizeLang(stored);
    } catch (_) {}
    try {
      var cookieLang = String(w.document.cookie || "").split(";").map(function(part) { return part.trim(); }).filter(function(part) { return part.indexOf("cd_locale=") === 0; })[0];
      if (cookieLang) return _entertainTextNormalizeLang(decodeURIComponent(cookieLang.slice("cd_locale=".length)));
    } catch (_) {}
    return "ko";
  }
  function _entertainText(key) {
    var lang = _entertainTextCurrentLang();
    var koText = ENTERTAIN_ENGINE_TEXT_TRANSLATIONS.ko[key] || "";
    if (lang === "ko") return koText;
    try {
      if (w && typeof w.cdTranslate === "function") {
        var translated = w.cdTranslate("entertainEngine." + key, {}, "");
        if (translated && translated !== "Translation pending" && translated !== "entertainEngine." + key) return translated;
      }
    } catch (_) {}
    var logKey = lang + ":" + key;
    if (!__eeMissingTextLog[logKey]) {
      __eeMissingTextLog[logKey] = true;
      try {
        if (w && w.location && w.location.hostname === "localhost") console.warn("[i18n:entertainEngine] missing text", { lang: lang, key: key });
      } catch (_) {}
    }
    return "Translation pending";
  }

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
    { pair: ['子', '午'], impacts: { water: 1.4, fire: 1.4 }, label: _entertainText("ee_79_prop_label") },
    { pair: ['丑', '未'], impacts: { earth: 1.6 },              label: _entertainText("ee_80_prop_label") },
    { pair: ['寅', '申'], impacts: { wood: 1.2, metal: 1.2 },   label: _entertainText("ee_81_prop_label") },
    { pair: ['卯', '酉'], impacts: { wood: 1.2, metal: 1.2 },   label: _entertainText("ee_82_prop_label") },
    { pair: ['辰', '戌'], impacts: { earth: 1.7 },              label: _entertainText("ee_83_prop_label") },
    { pair: ['巳', '亥'], impacts: { fire: 1.2, water: 1.2 },   label: _entertainText("ee_84_prop_label") }
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
    wood:  { today: '목(木) 기운이 눈의 피로감과 뒷목 긴장으로 드러날 수 있습니다. 화면 간격과 가벼운 스트레칭을 챙기세요.', month: '이달 목 기운의 흐름은 계획과 회복 시작점에 머뭅니다. 음주와 늦은 야식을 줄이고 눈 휴식을 넣어주세요.', year: '올해 목 기운은 움직임과 유연성 루틴에 오래 머뭅니다. 가벼운 스트레칭이 회복운을 살립니다.' },
    fire:  { today: '화기(火氣)가 활력 리듬을 예민하게 만들 수 있습니다. 과로와 흥분 상태를 피하고 차분한 휴식이 필요합니다.', month: '이달 화 기운은 수면과 열감 리듬을 예민하게 만들 수 있습니다. 취침 전 화면과 자극을 줄여보세요.', year: '올해 화기 흐름은 활력과 순환 리듬의 균형을 가리킵니다. 활동 후 쉬는 간격을 함께 두세요.' },
    earth: { today: '토기(土氣) 정체가 식사와 중심 리듬을 둔하게 만들 수 있습니다. 과식·야식·밀가루를 줄이세요.', month: '이달 습토(濕土) 기운은 비위 리듬과 생활 중심에 머뭅니다. 단백질 중심 식단과 걷기를 권합니다.', year: '올해 토 기운의 누적은 생활 중심과 식사 리듬을 살피라는 징조로 떠오릅니다.' },
    metal: { today: '금기(金氣)가 호흡과 정리 리듬을 건드립니다. 미세먼지와 건조한 공기에 주의하고 보습해주세요.', month: '이달 금 기운은 호흡·피부 컨디션·정리 리듬에 머뭅니다. 환기와 수분 섭취가 중요합니다.', year: '올해 금 기운은 정돈된 생활과 촉촉한 환경을 가리킵니다. 식이섬유와 수분을 부드럽게 늘려보세요.' },
    water: { today: '수기(水氣)가 부족하면 수면과 회복 리듬이 쉽게 흔들릴 수 있습니다. 따뜻한 물을 천천히 마시세요.', month: '이달 수 기운은 하체 온기와 밤 시간 안정에 머뭅니다. 온열 케어가 도움이 됩니다.', year: '올해 수기 파동은 깊은 휴식과 불안 관리의 필요성을 비춥니다. 스트레스 관리가 핵심입니다.' }
  };

  // 오행 웰니스 해석 데이터
  var EL_CLINICAL_DB = {
    wood: {
      strength: '간담 리듬과 근육 유연성이 비교적 선명한 체질 흐름입니다.',
      deficientSymptoms: '눈의 피로감, 몸의 뻣뻣함, 새벽의 얕은 각성, 감정 억눌림 패턴이 나타날 수 있습니다.',
      excessSymptoms: '목·어깨 과긴장, 예민성 상승, 조급함이 생활 신호로 커질 수 있습니다.',
      dietDef: '짙은 녹색 채소·충분한 수분으로 목(木)의 생장 리듬을 보조하세요.',
      dietEx: '자극적인 술·야식·카페인 과다를 줄여 목(木)의 과흥분을 진정시키세요.',
      exerciseDef: '저강도 유산소 + 고관절·흉곽 가동성 스트레칭을 매일 15분.',
      exerciseEx: '고강도 운동 빈도를 줄이고 호흡 교정·이완성 운동 비중을 늘리세요.',
      lifeDef: '밤 11시 이전 수면 루틴으로 간 회복 시간을 확보하세요.',
      lifeEx: '경쟁 자극이 높은 환경에서 휴식 타임블록을 의도적으로 배치하세요.',
      monitor: '피로가 오래 누적될 때는 정기검진에서 관련 피로·순환 지표를 참고할 수 있습니다.'
    },
    fire: {
      strength: '활력과 따뜻한 움직임의 리듬이 살아나 추진력 회복이 빠른 편입니다.',
      deficientSymptoms: '무기력, 차분함의 과다, 순환감 저하, 집중력 저하, 가라앉는 정서가 동반될 수 있습니다.',
      excessSymptoms: '열감, 수면 얕아짐, 초조함, 얼굴빛의 달아오름이 생활 신호로 잦아질 수 있습니다.',
      dietDef: '따뜻한 단백질 식사(계란·살코기·생강)로 순환 점화를 도우세요.',
      dietEx: '매운 음식·알코올·당분 과다를 줄이고 냉각 식품(수분 과일, 채소)을 보강하세요.',
      exerciseDef: '아침 햇빛 노출 + 중강도 인터벌로 순환 리듬을 깨우세요.',
      exerciseEx: '취침 전 격렬 운동을 피하고 안정형 움직임(걷기·요가) 위주로 조정하세요.',
      lifeDef: '기상·식사·수면 시간을 고정해 하루 리듬을 재정렬하세요.',
      lifeEx: '카페인 커트오프(오후 2시 이전)와 디지털 야간 차단이 필요합니다.',
      monitor: '열감, 수면까지 걸리는 시간, 밤 시간 각성도를 기록해 살피세요.'
    },
    earth: {
      strength: '비위(소화) 축의 흡수력과 체력 유지력이 좋아 회복 기반이 탄탄한 체질입니다.',
      deficientSymptoms: '복부 무거움, 소화 리듬 지연, 식후 졸림, 오래 머무는 피로감이 생길 수 있습니다.',
      excessSymptoms: '몸의 무거움, 움직임 둔화, 단 음식 당김, 식사 리듬 불안정이 나타날 수 있습니다.',
      dietDef: '소화가 쉬운 단백질·따뜻한 곡물·발효식품으로 비위 리듬을 보듬으세요.',
      dietEx: '정제 탄수·야식·과식 빈도를 줄이고 식사량 분할 전략을 적용하세요.',
      exerciseDef: '식후 15분 걷기와 코어 안정화 운동으로 순환을 돕습니다.',
      exerciseEx: '장시간 좌식을 피하고 하루 총 보행량(7~9천 보)을 확보하세요.',
      lifeDef: '규칙적인 식사 시각과 수면 루틴이 최우선 처방입니다.',
      lifeEx: '감정성 섭식 트리거를 기록해 저녁 과식 패턴을 차단하세요.',
      monitor: '식사 시간, 식후 졸림, 몸의 무거움, 걱정 반복 정도를 주 1회 기록하세요.'
    },
    metal: {
      strength: '호흡과 피부 컨디션, 판단 집중력이 좋아 회복 루틴을 지키는 힘이 높은 체질입니다.',
      deficientSymptoms: '건조감, 호흡 얕음, 정리 리듬의 흐림, 슬럼프 때의 피로감이 동반될 수 있습니다.',
      excessSymptoms: '호흡 과긴장, 어깨·흉곽 경직, 완벽주의성 스트레스 반응이 커질 수 있습니다.',
      dietDef: '수분·식이섬유·적정 지방을 늘려 호흡과 정리 리듬을 안정시키세요.',
      dietEx: '건조·짜고 자극적인 음식 비중을 낮추고 수분 많은 식단으로 균형을 맞추세요.',
      exerciseDef: '복식호흡 + 흉곽 가동 운동으로 호흡의 폭을 넓히세요.',
      exerciseEx: '강박적 운동 스케줄 대신 회복일과 스트레칭 비중을 의도적으로 포함하세요.',
      lifeDef: '실내 습도 관리(40~60%)와 수면 전 호흡 훈련을 루틴화하세요.',
      lifeEx: '결과 통제 욕구를 줄이고 완료 기준을 80%로 설정하는 훈련이 필요합니다.',
      monitor: '호흡 깊이, 피부 컨디션, 정리 리듬, 스트레스 점수를 살피세요.'
    },
    water: {
      strength: '수면과 회복 보존력이 좋아 장기전에서 버티는 체질적 장점이 있습니다.',
      deficientSymptoms: '차가운 느낌, 허리 주변 피로감, 오래 머무는 피로, 집중력 저하, 불안 민감성이 증가할 수 있습니다.',
      excessSymptoms: '무기력, 가라앉는 정서, 활동 저하, 무거운 피로감이 심해질 수 있습니다.',
      dietDef: '온열성 단백질·미네랄·수분 보충으로 수(水)의 회복 축을 지원하세요.',
      dietEx: '과도한 염분·야간 수분 폭식을 줄이고 낮 시간 균등 수분 섭취로 전환하세요.',
      exerciseDef: '허리·둔근 강화 + 저충격 유산소로 순환과 체온을 올리세요.',
      exerciseEx: '완전 비활동 상태를 피하고 짧고 잦은 움직임(NEAT)으로 대사를 유지하세요.',
      lifeDef: '수면 시간 확보와 보온(복부·허리 주변) 관리가 먼저 떠오릅니다.',
      lifeEx: '고립 시간이 길어지지 않도록 외부 활동 스케줄을 고정하세요.',
      monitor: '몸의 온기, 허리 주변 피로감, 기상 피로감을 주간 단위로 살피세요.'
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

      + '<div style="margin-top:8px; font-size:.67rem; color:rgba(255,255,255,.42); line-height:1.45;">사주 기반 웰니스 참고용이며 의료적 진단을 대체하지 않습니다. 지속적인 통증이나 불편감이 있다면 전문 의료진과 상담하세요.</div>'
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
      { id: 'fq2', icon: '🌅', text: '아침 햇빛을 10분 이상 받으며 몸의 리듬 깨우기', exp: 10 },
      { id: 'fq3', icon: '💪', text: '30분 이상 유산소 운동 (달리기, 사이클, 댄스)', exp: 20 },
      { id: 'fq4', icon: '🎯', text: '하고 싶었던 말을 용기 있게 표현하기 (문자도 OK)', exp: 20 },
      { id: 'fq5', icon: '💊', text: '물을 충분히 마시고 하루의 물기 리듬 체크하기', exp: 10 }
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
      { id: 'mq2', icon: '🫁', text: '복식 호흡 5분 — 숨의 리듬을 차분히 정돈하기', exp: 15 },
      { id: 'mq3', icon: '🗑️', text: '불필요한 앱·파일·물건 하나 정리하거나 삭제하기', exp: 10 },
      { id: 'mq4', icon: '📊', text: '오늘 지출 내역 확인 및 이번 달 예산 점검하기', exp: 20 },
      { id: 'mq5', icon: '🤫', text: '불필요한 말을 아끼고 핵심만 전달하는 하루', exp: 15 }
    ],
    water: [
      { id: 'aq1', icon: '💧', text: '기상 직후 물 한 잔으로 몸의 물기 깨우기', exp: 10 },
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

  var RPG_STYLE_ID = 'cd-rpg-ui-style-v20260617';
  var RPG_ELEMENT_ORDER = ['wood', 'fire', 'earth', 'metal', 'water'];
  var RPG_ELEMENT_META = {
    wood:  { icon: '🌿', label: '목', short: '성장' },
    fire:  { icon: '🔥', label: '화', short: '표현' },
    earth: { icon: '🪨', label: '토', short: '안정' },
    metal: { icon: '⚔️', label: '금', short: '정리' },
    water: { icon: '💧', label: '수', short: '회복' }
  };
  var RPG_LEVEL_REWARD_DEFS = [
    { level: 3, key: 'secret_fortune_level_3', label: _entertainText("ee_515_prop_label"), desc: '첫 번째 비밀 운세가 해금됩니다.' },
    { level: 5, key: 'personality_title_level_5', label: _entertainText("ee_516_prop_label"), desc: '성향을 드러내는 칭호 1개가 해금됩니다.' },
    { level: 7, key: 'passive_expand_level_7', label: _entertainText("ee_517_prop_label"), desc: '나의 고유 패시브 설명이 더 깊어집니다.' },
    { level: 10, key: 'job_class_expand_level_10', label: _entertainText("ee_518_prop_label"), desc: '나의 운명 직업군 해석이 확장됩니다.' },
    { level: 15, key: 'growth_report_preview_level_15', label: _entertainText("ee_519_prop_label"), desc: '30일 성장 리포트의 일부를 미리 볼 수 있습니다.' },
    { level: 20, key: 'master_skill_phrase_level_20', label: _entertainText("ee_520_prop_label"), desc: '마스터 스킬을 더 강하게 만드는 문구가 해금됩니다.' }
  ];
  var RPG_LOCAL_STORAGE_MARKER = 'rpg-local-progress-v20260617';

  function ensureRpgUiStyles() {
    if (document.getElementById(RPG_STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = RPG_STYLE_ID;
    style.textContent = [
      /* ── 퀘스트 셸 — 클래스 시트와 같은 연이 Dark 토큰을 공유한다 ─────────────
         바탕·테두리·라운드는 위쪽 #skillTreeSection 이 소유하므로 여기서는 칠하지 않는다.
         셸이 자기 배경을 또 칠하면 한 카드 안에 바닥이 두 겹으로 겹친다(이전 버전의 결함:
         컨테이너=다크, 클래스 시트=밝은 파스텔, 퀘스트 셸=딥퍼플로 세 개가 쌓여 있었다). */
      '#skillTreeSection{display:block;min-height:320px}',
      '.ent-rpg-shell,.ent-rpg-shell *{box-sizing:border-box}',
      '.ent-rpg-shell{--rpg-raised:rgba(255,241,247,.055);--rpg-raised-2:rgba(255,241,247,.09);--rpg-ink:#fff1f7;--rpg-ink-muted:rgba(255,214,232,.86);--rpg-ink-dim:rgba(255,214,232,.66);--rpg-accent:rgba(255,196,222,.96);--rpg-gold:#ead089;--rpg-border:rgba(244,190,209,.38);--rpg-border-soft:rgba(244,190,209,.18);--rpg-ease:cubic-bezier(.22,1,.36,1);position:relative;display:flex;flex-direction:column;gap:18px;padding:20px;background:none;border:0;border-radius:0;font-family:var(--font-body,"Pretendard","Noto Sans KR",system-ui,sans-serif);color:var(--rpg-ink);isolation:auto;overflow:visible}',
      '.ent-rpg-shell::before{display:none}',

      /* 상단 줄 — 제목 하나와 날짜 하나. 장식용 태그는 두지 않는다. */
      '.ent-rpg-topline{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}',
      '.ent-rpg-topline .ent-quest-title{font-size:1.14rem;font-weight:800;line-height:1.3;color:var(--rpg-ink);text-shadow:none;letter-spacing:0}',
      '.ent-rpg-topline .ent-quest-sub{margin-top:6px;color:var(--rpg-ink-dim);font-size:.75rem;line-height:1.6;max-width:60ch}',
      '.ent-rpg-kst{padding:5px 11px;border-radius:999px;background:var(--rpg-raised);border:1px solid var(--rpg-border-soft);color:var(--rpg-ink-muted);font-size:.7rem;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:0;text-transform:none;box-shadow:none;white-space:nowrap}',
      '.ent-rpg-status{display:inline-flex;align-self:flex-start;align-items:center;gap:8px;min-height:30px;padding:7px 12px;border-radius:10px;background:var(--rpg-raised);border:1px solid var(--rpg-border-soft);color:var(--rpg-ink-muted);font-size:.74rem;line-height:1.5}',
      '.ent-rpg-status.is-error{border-color:rgba(255,158,180,.42);background:rgba(255,158,180,.12);color:#ffd9e2}',

      /* 레이아웃 — DOM 순서를 그대로 두고 폭만 배분한다(읽기·탭 순서 보존).
         hero 전폭 → 오행·고유능력 반반 → 퀘스트 전폭 → 비밀운세·성장루트. */
      /* align-items:start — 카드는 내용만큼만 높다. stretch 로 두면 짧은 카드가 옆 카드
         높이에 맞춰 늘어나 아래쪽에 큰 빈칸이 생긴다. */
      '.ent-rpg-grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));align-items:start;gap:14px}',
      '.ent-rpg-card{grid-column:span 12;position:relative;overflow:hidden;border-radius:14px;padding:16px;background:var(--rpg-raised);border:1px solid var(--rpg-border-soft);box-shadow:none}',
      '.ent-rpg-card::before{display:none}',
      '.ent-rpg-card--hero{background:linear-gradient(180deg,rgba(234,208,137,.10),rgba(255,241,247,.045));border-color:rgba(234,208,137,.26)}',
      '.ent-rpg-card--quests{overflow:visible}',

      /* 제목 위계 — 대문자 트래킹 킥커를 섹션마다 반복하지 않는다.
         카드 제목이 구조를 지고, 카드 안의 소제목만 .ent-rpg-card__label 로 한 단 낮춘다. */
      '.ent-rpg-card__title{margin:0;font-size:1rem;font-weight:800;color:var(--rpg-ink);letter-spacing:0;line-height:1.35;text-wrap:balance}',
      '.ent-rpg-card__sub{margin-top:7px;font-size:.76rem;line-height:1.65;color:var(--rpg-ink-muted);max-width:62ch;text-wrap:pretty}',
      '.ent-rpg-card__label{margin-top:16px;margin-bottom:8px;font-size:.73rem;font-weight:700;color:var(--rpg-ink-dim);letter-spacing:0}',

      /* 상태 필 4개(LV/다음/오늘/연속)가 숫자 요약을 전담한다. 같은 값을 아래에서 또 적지 않는다. */
      '.ent-rpg-pill-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}',
      '.ent-rpg-pill{display:inline-flex;align-items:baseline;gap:6px;padding:7px 12px;border-radius:999px;background:rgba(36,8,26,.42);border:1px solid var(--rpg-border-soft);color:var(--rpg-ink-dim);font-size:.71rem;font-weight:600;box-shadow:none}',
      '.ent-rpg-pill strong{color:var(--rpg-ink);font-size:.86rem;font-weight:800;font-variant-numeric:tabular-nums}',
      '.ent-rpg-exp-block{margin-top:16px}',
      '.ent-rpg-exp-line{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:.72rem;color:var(--rpg-ink-dim);font-weight:600;margin-bottom:8px;font-variant-numeric:tabular-nums}',
      '.ent-rpg-exp-track{height:9px;border-radius:999px;overflow:hidden;background:rgba(36,8,26,.52);border:1px solid var(--rpg-border-soft)}',
      '.ent-rpg-exp-fill{display:block;height:100%;width:var(--rpg-exp-width,0%);border-radius:inherit;background:linear-gradient(90deg,var(--rpg-accent),var(--rpg-gold));box-shadow:none;transition:width .6s var(--rpg-ease)}',
      '.ent-rpg-summary{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}',
      '.ent-rpg-summary span{display:inline-flex;align-items:baseline;gap:6px;padding:6px 11px;border-radius:999px;background:rgba(36,8,26,.42);border:1px solid var(--rpg-border-soft);color:var(--rpg-ink-dim);font-size:.71rem;font-weight:600}',
      '.ent-rpg-summary strong{color:var(--rpg-ink);font-weight:800;font-variant-numeric:tabular-nums}',

      /* 오행 — 이름·비율·막대·한 줄 코멘트. 행 사이는 선 하나로 나눈다. */
      '.ent-rpg-element-list{display:flex;flex-direction:column;margin-top:14px;border-top:1px solid var(--rpg-border-soft)}',
      '.ent-rpg-element-row{padding:13px 0;border-bottom:1px solid var(--rpg-border-soft);border-radius:0;background:none}',
      '.ent-rpg-element-row.is-weak .ent-rpg-element-note{color:var(--rpg-accent)}',
      '.ent-rpg-element-row.is-strong .ent-rpg-element-note{color:var(--rpg-gold)}',
      '.ent-rpg-element-head{display:flex;align-items:center;gap:11px}',
      '.ent-rpg-element-badge{width:32px;height:32px;flex:0 0 32px;border-radius:10px;display:grid;place-items:center;background:var(--rpg-raised-2);border:1px solid var(--rpg-border-soft);box-shadow:none;font-size:.95rem}',
      '.ent-rpg-element-name{font-size:.86rem;font-weight:700;color:var(--rpg-ink)}',
      '.ent-rpg-element-note{font-size:.7rem;color:var(--rpg-ink-dim);margin-top:2px;line-height:1.45}',
      '.ent-rpg-element-pct{margin-left:auto;font-size:.88rem;font-weight:800;color:var(--rpg-ink);font-variant-numeric:tabular-nums}',
      '.ent-rpg-mini-bar{margin-top:9px;height:5px;border-radius:999px;background:rgba(36,8,26,.52);overflow:hidden}',
      '.ent-rpg-mini-bar span{display:block;height:100%;width:var(--rpg-fill,0%);border-radius:inherit;background:var(--rpg-accent);box-shadow:none;transition:width .6s var(--rpg-ease)}',
      '.ent-rpg-element-growth{margin-top:8px;font-size:.73rem;line-height:1.6;color:var(--rpg-ink-muted)}',

      '.ent-rpg-chip-wrap{display:flex;flex-wrap:wrap;gap:7px}',
      '.ent-rpg-chip{display:inline-flex;align-items:center;gap:6px;min-height:32px;padding:6px 11px;border-radius:999px;background:var(--rpg-raised);border:1px solid var(--rpg-border-soft);color:var(--rpg-ink-muted);font-size:.72rem;font-weight:600;line-height:1.3}',
      '.ent-rpg-chip.is-secret{border-color:rgba(234,208,137,.32);color:var(--rpg-gold);background:rgba(234,208,137,.12)}',
      '.ent-rpg-chip.is-lock{border-style:dashed;color:var(--rpg-ink-dim);background:none}',

      /* 오늘의 스킬 — 카드 속 카드가 아니라 퀘스트 목록을 여는 띠 하나. */
      '.ent-rpg-today-skill{position:relative;display:grid;grid-template-columns:44px minmax(0,1fr);gap:13px;margin-top:16px;padding:14px;border-radius:12px;background:rgba(234,208,137,.10);border:1px solid rgba(234,208,137,.26);box-shadow:none;overflow:hidden}',
      '.ent-rpg-today-skill::before{display:none}',
      '.ent-rpg-today-skill.is-complete{background:rgba(255,196,222,.10);border-color:rgba(255,196,222,.28)}',
      '.ent-rpg-today-skill__orb{position:relative;z-index:1;width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:rgba(36,8,26,.52);border:1px solid var(--rpg-border-soft);box-shadow:none;font-size:1.1rem}',
      '.ent-rpg-today-skill__body{position:relative;z-index:1;min-width:0}',
      '.ent-rpg-today-skill__kicker{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--rpg-ink-dim);font-size:.7rem;font-weight:600;letter-spacing:0;text-transform:none}',
      '.ent-rpg-today-skill__name{margin-top:4px;color:var(--rpg-ink);font-size:.96rem;font-weight:800;line-height:1.35}',
      '.ent-rpg-today-skill__copy{margin-top:5px;color:var(--rpg-ink-muted);font-size:.77rem;line-height:1.6}',
      '.ent-rpg-today-skill__meter{margin-top:11px;height:5px;border-radius:999px;background:rgba(36,8,26,.52);overflow:hidden}',
      '.ent-rpg-today-skill__meter span{display:block;height:100%;width:var(--rpg-skill-progress,0%);border-radius:inherit;background:linear-gradient(90deg,var(--rpg-accent),var(--rpg-gold));box-shadow:none;transition:width .6s var(--rpg-ease)}',
      '.ent-rpg-today-skill__reward{display:inline-flex;align-items:center;gap:5px;min-height:22px;margin-top:10px;padding:0;background:none;border:0;color:var(--rpg-gold);font-size:.72rem;font-weight:700}',

      /* 퀘스트 — 카드 그리드가 아니라 목록이다. 항목마다 테두리·그림자·모서리 장식을 두면
         카드 속 카드가 되고, 세 개가 똑같이 생긴 카드 그리드로 읽힌다. */
      '.ent-rpg-quest-grid{display:flex;flex-direction:column;margin-top:18px;border-top:1px solid var(--rpg-border-soft)}',
      '.ent-rpg-quest-card{position:relative;display:grid;grid-template-columns:36px minmax(0,1fr);gap:12px;padding:16px 0;border-bottom:1px solid var(--rpg-border-soft);border-radius:0;background:none;box-shadow:none;overflow:visible;transition:opacity .2s var(--rpg-ease)}',
      '.ent-rpg-quest-card::after{display:none}',
      '.ent-rpg-quest-card:hover{transform:none;box-shadow:none;border-color:var(--rpg-border-soft)}',
      '.ent-rpg-quest-card.is-today-skill{box-shadow:none}',
      '.ent-rpg-quest-card.is-complete .ent-rpg-quest-title{color:var(--rpg-ink-dim);text-decoration:line-through;text-decoration-color:rgba(255,214,232,.4);text-underline-offset:2px}',
      '.ent-rpg-quest-card.is-just-completed{animation:cdRpgQuestPop .5s var(--rpg-ease)}',
      '@keyframes cdRpgQuestPop{from{background:rgba(234,208,137,.16)}to{background:transparent}}',
      '.ent-rpg-quest-icon{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;font-size:1.02rem;background:var(--rpg-raised-2);border:1px solid var(--rpg-border-soft);box-shadow:none}',
      '.ent-rpg-quest-body{min-width:0}',
      '.ent-rpg-quest-title{margin:0;font-size:.9rem;font-weight:700;color:var(--rpg-ink);line-height:1.55;text-wrap:pretty}',
      '.ent-rpg-quest-reason{margin-top:7px;padding:0;border:0;background:none;border-radius:0;font-size:.74rem;line-height:1.6;color:var(--rpg-ink-dim)}',
      '.ent-rpg-quest-reason strong{color:var(--rpg-ink-muted);font-weight:700}',
      '.ent-rpg-quest-after{margin-top:10px;padding:10px 12px;border-radius:10px;background:rgba(234,208,137,.10);border:1px solid rgba(234,208,137,.24);font-size:.75rem;line-height:1.65;color:var(--rpg-ink-muted)}',
      '.ent-rpg-quest-after strong{color:var(--rpg-gold);font-weight:700}',
      '.ent-rpg-quest-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px}',
      '.ent-rpg-exp-tag{color:var(--rpg-gold);font-size:.75rem;font-weight:700;font-variant-numeric:tabular-nums;padding:0;background:none;border:0;border-radius:0}',
      /* 완료 버튼은 손가락으로 누르는 주 조작부다. 권장 터치 타깃 44px을 밑돌지 않게 한다. */
      '.ent-rpg-complete-btn{appearance:none;border:0;border-radius:999px;padding:10px 20px;min-height:44px;min-width:92px;background:linear-gradient(135deg,#ffe08a 0%,#ff9ecb 100%);color:#32142a;font-size:.8rem;font-weight:800;letter-spacing:0;box-shadow:none;cursor:pointer;transition:transform .18s var(--rpg-ease),filter .18s var(--rpg-ease),opacity .18s var(--rpg-ease)}',
      '.ent-rpg-complete-btn:hover{transform:translateY(-1px);filter:brightness(1.06)}',
      '.ent-rpg-complete-btn:active{transform:translateY(0) scale(.985)}',
      '.ent-rpg-complete-btn:focus-visible{outline:2px solid var(--rpg-gold);outline-offset:3px}',
      '.ent-rpg-complete-btn:disabled{cursor:default;background:none;border:1px solid var(--rpg-border-soft);color:var(--rpg-ink-dim);transform:none;filter:none}',
      '.ent-rpg-complete-btn.is-done{background:none;border:1px solid rgba(255,196,222,.34);color:var(--rpg-accent)}',

      /* 비밀 운세 — 잠금/해금 두 상태를 한 블록에서 톤 차이로만 구분한다. */
      '.ent-rpg-secret-panel{margin-top:14px;padding:16px;border-radius:12px;background:var(--rpg-raised);border:1px solid var(--rpg-border-soft)}',
      '.ent-rpg-secret-panel.is-open{border-color:rgba(234,208,137,.32);background:rgba(234,208,137,.10)}',
      /* 잠금 상태는 아이콘과 진행도뿐이다. 세로로 쌓으면 빈 상자처럼 보여서 가로로 붙인다. */
      '.ent-rpg-secret-lock{display:flex;flex-direction:row;flex-wrap:wrap;gap:12px;align-items:center}',
      '.ent-rpg-secret-lock-icon,.ent-rpg-secret-open-icon{width:38px;height:38px;border-radius:11px;display:grid;place-items:center;font-size:1.02rem;background:var(--rpg-raised-2);border:1px solid var(--rpg-border-soft)}',
      '.ent-rpg-secret-open-icon{background:rgba(234,208,137,.16);border-color:rgba(234,208,137,.30);color:var(--rpg-gold)}',
      '.ent-rpg-secret-title{margin-top:11px;font-size:.94rem;font-weight:800;color:var(--rpg-ink)}',
      '.ent-rpg-secret-lock .ent-rpg-secret-title{margin-top:0}',
      '.ent-rpg-secret-copy{margin-top:6px;font-size:.77rem;line-height:1.7;color:var(--rpg-ink-muted);max-width:62ch}',
      '.ent-rpg-secret-message{margin-top:12px;padding:13px 14px;border-radius:10px;background:rgba(36,8,26,.42);border:1px solid var(--rpg-border-soft);color:var(--rpg-ink);font-size:.81rem;line-height:1.75;max-width:66ch;text-wrap:pretty}',
      '.ent-rpg-secret-note{margin-top:11px;font-size:.71rem;letter-spacing:0;text-transform:none;color:var(--rpg-ink-dim);font-weight:500}',

      /* 성장 루트 — 실제로 순서가 있는 3단계라 번호를 남긴다(장식용 01/02/03 스캐폴딩이 아니다). */
      '.ent-rpg-route-grid{display:flex;flex-direction:column;margin-top:14px;border-top:1px solid var(--rpg-border-soft)}',
      '.ent-rpg-route-card{min-height:0;padding:13px 0;border-bottom:1px solid var(--rpg-border-soft);border-radius:0;background:none;border-left:0;border-right:0;border-top:0}',
      '.ent-rpg-route-card b{display:block;color:var(--rpg-ink);font-size:.84rem;font-weight:700;line-height:1.45}',
      '.ent-rpg-route-card span{display:block;margin-top:5px;color:var(--rpg-ink-muted);font-size:.75rem;line-height:1.65}',

      '.ent-rpg-crash{padding:16px;border-radius:12px;background:rgba(255,158,180,.10);border:1px solid rgba(255,158,180,.34);color:#ffd9e2;font-size:.8rem;line-height:1.7}',
      '.ent-rpg-preview-note{margin-top:12px;padding:12px 13px;border-radius:10px;background:var(--rpg-raised);border:1px solid var(--rpg-border-soft);color:var(--rpg-ink-muted);font-size:.75rem;line-height:1.65}',
      '.ent-rpg-empty,.ent-rpg-loading{margin-top:12px;padding:13px;border-radius:10px;background:var(--rpg-raised);border:1px dashed var(--rpg-border-soft);color:var(--rpg-ink-muted);font-size:.78rem;line-height:1.7}',

      '.ent-rpg-modal{position:fixed;inset:0;z-index:80;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(20,4,14,.72);backdrop-filter:blur(8px)}',
      '.ent-rpg-modal.is-open{display:flex;animation:cdRpgModalIn .24s cubic-bezier(.22,1,.36,1)}',
      '@keyframes cdRpgModalIn{from{opacity:0}to{opacity:1}}',
      '.ent-rpg-modal__panel{position:relative;max-width:430px;width:min(430px,100%);padding:20px;border-radius:16px;background:radial-gradient(130% 80% at 50% 0%,rgba(174,45,104,.34),transparent 60%),linear-gradient(180deg,#3a0e28,#24081a);border:1px solid rgba(244,190,209,.38);box-shadow:0 24px 56px rgba(0,0,0,.52)}',
      '.ent-rpg-modal__badge{display:inline-flex;align-items:center;padding:5px 11px;border-radius:999px;background:rgba(234,208,137,.16);border:1px solid rgba(234,208,137,.32);color:#ead089;font-size:.71rem;font-weight:800;letter-spacing:0;text-transform:none}',
      '.ent-rpg-modal__title{margin-top:12px;font-size:1.12rem;font-weight:800;color:#fff1f7;line-height:1.4}',
      '.ent-rpg-modal__sub{margin-top:7px;font-size:.79rem;line-height:1.7;color:rgba(255,214,232,.86)}',
      '.ent-rpg-modal__list{display:flex;flex-direction:column;gap:8px;margin-top:16px}',
      '.ent-rpg-modal__item{padding:12px 13px;border-radius:10px;background:rgba(255,241,247,.055);border:1px solid rgba(244,190,209,.18);color:#fff1f7;font-size:.77rem;line-height:1.7}',
      '.ent-rpg-modal__close{margin-top:16px;display:inline-flex;align-items:center;justify-content:center;min-height:44px;width:100%;border:0;border-radius:12px;background:linear-gradient(135deg,#ffe08a 0%,#ff9ecb 100%);color:#32142a;font-size:.85rem;font-weight:800;cursor:pointer;transition:filter .18s cubic-bezier(.22,1,.36,1)}',
      '.ent-rpg-modal__close:hover{filter:brightness(1.06)}',
      '.ent-rpg-modal__close:focus-visible{outline:2px solid #ead089;outline-offset:3px}',

      '.cd-rpg-spark{position:absolute;right:0;top:12px;padding:3px 9px;border-radius:999px;background:rgba(234,208,137,.18);color:#ead089;font-size:.66rem;font-weight:800;letter-spacing:0;text-transform:none;animation:cdRpgSpark 1s ease forwards;pointer-events:none}',
      '@keyframes cdRpgSpark{0%{opacity:0;transform:translateY(6px)}20%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-10px)}}',

      '@media (min-width: 760px){.ent-rpg-card--elements{grid-column:span 6}.ent-rpg-card--abilities{grid-column:span 6}.ent-rpg-card--secret{grid-column:span 7}.ent-rpg-card--closing{grid-column:span 5}}',
      '@media (min-width: 1100px){.ent-rpg-shell{padding:24px}.ent-rpg-card{padding:18px}}',
      '@media (max-width: 759px){.ent-rpg-shell{gap:16px;padding:16px}.ent-rpg-card{padding:15px}.ent-rpg-quest-footer{flex-direction:column;align-items:stretch}.ent-rpg-complete-btn{width:100%}.ent-rpg-modal{padding:12px}}',
      /* 모션 민감 사용자에게는 완료 강조·EXP 스파크·버튼 리프트를 재생하지 않는다. */
      '@media (prefers-reduced-motion: reduce){.ent-rpg-complete-btn,.ent-rpg-complete-btn:hover,.ent-rpg-complete-btn:active{transition:none;transform:none}.cd-rpg-spark{animation:none;opacity:1}.ent-rpg-quest-card.is-just-completed,.ent-rpg-modal.is-open{animation:none}.ent-rpg-exp-fill,.ent-rpg-mini-bar span,.ent-rpg-today-skill__meter span{transition:none}}'
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

  function buildTodayRpgSkill(quests, completedSet, profileDayEl, completedCount, questCount) {
    var focusQuest = null;
    for (var i = 0; i < quests.length; i += 1) {
      if (!completedSet.has(String(quests[i].questId || ''))) {
        focusQuest = quests[i];
        break;
      }
    }
    if (!focusQuest && quests.length) focusQuest = quests[quests.length - 1];
    var element = String((focusQuest && focusQuest.element) || profileDayEl || 'earth');
    if (!RPG_ELEMENT_META[element]) element = 'earth';
    var meta = RPG_ELEMENT_META[element] || RPG_ELEMENT_META.earth;
    var tier = String((focusQuest && focusQuest.tier) || '').trim();
    var tierName = tier === 'core' ? '마스터 스킬' : (tier === 'normal' ? '집중 스킬' : '기초 스킬');
    var nameMap = {
      wood: '성장 루트 개방',
      fire: '운명 점화',
      earth: '기반 강화',
      metal: '결정타 정렬',
      water: '직관 집중'
    };
    var progressPct = questCount ? Math.round((completedCount / questCount) * 100) : 0;
    var done = !!(focusQuest && completedSet.has(String(focusQuest.questId || '')));
    if (done && completedCount >= questCount) progressPct = 100;
    return {
      quest: focusQuest || null,
      done: done || completedCount >= questCount,
      icon: getQuestIcon(element, tier),
      title: meta.label + ' · ' + (nameMap[element] || '운명 정렬'),
      tierName: tierName,
      copy: focusQuest ? (focusQuest.text || focusQuest.description || '오늘의 성장을 완성할 차례입니다.') : '오늘의 체크리스트가 모두 닫히면 성장 메시지가 열립니다.',
      expReward: focusQuest ? toRpgNumber(focusQuest.expReward, getRpgQuestAwardRule().exp) : 0,
      questId: focusQuest ? String(focusQuest.questId || '') : '',
      progressPct: Math.max(0, Math.min(100, progressPct))
    };
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

  var RPG_QUEST_TIERS = ['easy', 'normal', 'core'];
  var RPG_TIER_REASON = {
    easy: '부족한 기운을 작게 보완하면 하루의 리듬이 안정됩니다.',
    normal: '마무리된 행동은 흩어진 기운을 한곳으로 모읍니다.',
    core: '나의 중심 기운을 의식하면 선택의 흔들림이 줄어듭니다.'
  };
  var RPG_TIER_AFTER = {
    easy: '작은 선택이 운의 결을 다시 세웁니다.',
    normal: '끝낸 일 하나가 다음 레벨의 문을 두드립니다.',
    core: '중심을 세운 하루는 운의 방향을 잃지 않습니다.'
  };

  /* 퀘스트 내용은 완료 기록과 같은 날짜 경계(KST)를 써야 한다. 공용 getSeed 는 기기 로컬
     시간(todayKey)을 쓰는데, questId·완료 버킷은 KST 라서 KST 밖 사용자는 목록이 바뀌는
     시점과 완료가 초기화되는 시점이 하루 중 몇 시간씩 어긋났다. */
  function getRpgSeed(extra) {
    var k = getKstDateString() + (extra || '') + (w.USER_NAME || '');
    var s = 0;
    for (var i = 0; i < k.length; i += 1) s += k.charCodeAt(i);
    return s;
  }

  /* EXP 액수·하루 한도의 정본은 공용 저장소(CDLevel)이고 그 뿌리는 서버 AWARD_RULES 다.
     시트가 자체 숫자를 들고 있으면 화면에 적힌 값과 실제 적립이 어긋난다 — 실제로 카드에는
     퀘스트별 +10~+25 가 찍히는데 지급은 늘 15 고정이었다. */
  function getRpgQuestAwardRule() {
    var api = getRpgLevelApi();
    var rule = api && api.awardRules && api.awardRules.quest;
    return {
      exp: Math.max(1, toRpgNumber(rule && rule.exp, 15)),
      dailyLimit: Math.max(1, toRpgNumber(rule && rule.dailyLimit, 3))
    };
  }

  /* 오늘의 퀘스트는 날짜마다 달라져야 한다.
     예전에는 preview-* 3개가 문구까지 하드코딩돼 있어 KST 자정이 지나도 완료 표시만 풀리고
     내용은 영영 같았다. 이제 날짜를 시드로 오행별 QUEST_DB에서 매일 새로 뽑는다.
     questId에 날짜를 넣어 어제 완료가 오늘로 새지 않게 한다. */
  function buildRpgFallbackQuests(meta) {
    var dateKey = getKstDateString();
    var awardRule = getRpgQuestAwardRule();
    var dayElement = String((meta.todayDayPillar && meta.todayDayPillar.element) || (meta.dayMaster && meta.dayMaster.element) || 'earth');
    if (!RPG_ELEMENT_META[dayElement]) dayElement = 'earth';
    var weakList = toRpgList(meta.fiveElements && meta.fiveElements.lacking).filter(function (element) { return RPG_ELEMENT_META[element]; });
    var elements = [
      weakList[0] || dayElement,
      weakList[1] || dayElement,
      dayElement
    ];
    var used = {};
    var quests = [];

    for (var i = 0; i < RPG_QUEST_TIERS.length; i += 1) {
      var tier = RPG_QUEST_TIERS[i];
      var element = RPG_ELEMENT_META[elements[i]] ? elements[i] : 'earth';
      var pool = QUEST_DB[element] || QUEST_DB.earth;
      var ordered = seededShuffle(pool, getRpgSeed('rpg-quest-' + tier + '-' + element));
      var pick = null;
      for (var j = 0; j < ordered.length; j += 1) {
        if (used[ordered[j].id]) continue;
        pick = ordered[j];
        break;
      }
      if (!pick) pick = ordered[0];
      used[pick.id] = true;

      quests.push({
        questId: 'daily-' + dateKey + '-' + pick.id,
        questType: 'daily_rpg_' + tier,
        tier: tier,
        element: element,
        /* QUEST_DB 의 난이도별 exp 는 레거시 buildEnhancedQuestSystem 이 아직 읽으므로
           그대로 두고, 여기서는 실제로 적립되는 값만 싣는다. */
        expReward: awardRule.exp,
        text: pick.text,
        icon: pick.icon,
        description: getRpgElementLabel(element) + ' 기운을 오늘 하루에 실제로 옮겨 놓는 행동입니다.',
        reason: RPG_TIER_REASON[tier],
        afterCompleteMessage: RPG_TIER_AFTER[tier]
      });
    }
    return quests.slice(0, awardRule.dailyLimit);
  }

  function getRpgLocalProfileId() {
    return String(resolveRpgProfileId() || 'guest-local').trim() || 'guest-local';
  }

  /* 진행도는 메인 프로필 카드와 같은 저장소(CDLevel, 키 cd_level_v1)를 쓴다.
     예전에는 이 시트가 프로필 id로 키를 나눠 저장했는데, 프로필 해석이 잠깐 실패하면
     'guest-local'로 새어 진행이 사라졌고 레벨 곡선도 카드와 달라 같은 EXP에 다른 레벨이 보였다.
     CDLevel이 없으면(파일 로드 실패) 시트가 죽지 않도록 읽기 전용 0값으로 버틴다. */
  function getRpgLevelApi() {
    return (w.CDLevel && typeof w.CDLevel.snapshot === 'function') ? w.CDLevel : null;
  }

  function getRpgLevelSnapshot() {
    var api = getRpgLevelApi();
    if (api) return api.snapshot();
    return {
      currentLevel: 1, totalExp: 0, currentLevelExp: 0, nextLevelExp: 100,
      streakDays: 0, longestStreakDays: 0, checkedInToday: false,
      completedQuestIds: [], quests: [], loggedIn: false, writeFailed: false
    };
  }

  /* 이 시트의 진행이 실제로 어디에 남는지 사실대로 알린다. */
  function getRpgStorageNotice() {
    var snap = getRpgLevelSnapshot();
    if (snap.writeFailed) return '이 브라우저에 기록을 저장하지 못했습니다';
    return snap.loggedIn ? '내 계정에 저장됩니다' : '이 기기에만 저장됩니다 · 로그인하면 이어집니다';
  }

  function getRpgLocalLevelState(totalExp) {
    var api = getRpgLevelApi();
    if (api) return api.levelState(totalExp);
    var safeTotal = Math.max(0, toRpgNumber(totalExp, 0));
    return { totalExp: safeTotal, currentLevel: 1, currentLevelExp: safeTotal, nextLevelExp: 100 };
  }

  function getRpgLocalMilestoneKeys(level) {
    return RPG_LEVEL_REWARD_DEFS.filter(function (def) {
      return level >= def.level;
    }).map(function (def) {
      return def.key;
    });
  }

  /* 화면에 그릴 퀘스트 목록은 공용 저장소가 확정한 ID 를 따른다.
     시트가 자기 목록을 그대로 그리면, 저장소에 이미 다른 세트가 확정돼 있을 때(홈 카드가
     먼저 열렸거나 프로필을 바꿨을 때) 버튼을 눌러도 저장소가 못 알아듣고 조용히 무시된다.
     ID 가 맞으면 ID 로, 아니면 자리(index) 로 사주 메타를 붙여 표시 문구를 잃지 않는다. */
  function alignRpgQuestsToStore(sajuQuests, storeQuests) {
    if (!Array.isArray(storeQuests) || !storeQuests.length) return sajuQuests;
    var byId = {};
    sajuQuests.forEach(function (quest) { byId[String(quest.questId || '')] = quest; });
    return storeQuests.map(function (stored, index) {
      var base = byId[String(stored.id || '')] || sajuQuests[index] || sajuQuests[0] || {};
      return Object.assign({}, base, {
        questId: String(stored.id || ''),
        text: String(stored.text || base.text || ''),
        icon: String(stored.icon || base.icon || '✦')
      });
    });
  }

  function buildRpgLocalState(p, transientState) {
    var profileId = getRpgLocalProfileId();
    var questDateKst = getKstDateString();
    var awardRule = getRpgQuestAwardRule();
    var meta = buildRpgFallbackMeta({}, p);
    var quests = buildRpgFallbackQuests(meta);
    /* 개인화된 오늘의 퀘스트를 메인 프로필 카드에도 넘겨준다.
       두 화면이 서로 다른 목록을 보여주면 같은 하루치 EXP 예산이 어긋난다. */
    var api = getRpgLevelApi();
    if (api && typeof api.publishQuests === 'function') api.publishQuests(quests);

    var snap = getRpgLevelSnapshot();
    quests = alignRpgQuestsToStore(quests, snap.quests);
    var completedMap = {};
    snap.completedQuestIds.forEach(function (id) { completedMap[String(id)] = true; });
    var completedQuestIds = quests
      .map(function (quest) { return String(quest.questId || ''); })
      .filter(function (id) { return completedMap[id]; });
    var todayEarnedExp = completedQuestIds.length * awardRule.exp;
    var todayMaxExp = awardRule.exp * awardRule.dailyLimit;
    var allDone = completedQuestIds.length >= quests.length;
    return Object.assign({
      ok: true,
      localOnly: !snap.loggedIn,
      localStorageMarker: RPG_LOCAL_STORAGE_MARKER,
      profileId: profileId,
      questDateKst: questDateKst,
      generationMeta: meta,
      quests: quests,
      completedQuestIds: completedQuestIds,
      todayEarnedExp: todayEarnedExp,
      todayMaxExp: todayMaxExp,
      streakDays: snap.streakDays,
      longestStreakDays: snap.longestStreakDays,
      totalExp: snap.totalExp,
      currentLevel: snap.currentLevel,
      currentLevelExp: snap.currentLevelExp,
      nextLevelExp: snap.nextLevelExp,
      storageFailed: !!snap.writeFailed,
      unlockedMilestoneRewards: getRpgLocalMilestoneKeys(snap.currentLevel),
      unlockedSecretFortunes: allDone ? ['daily_complete_' + questDateKst] : [],
      message: getRpgStorageNotice()
    }, transientState || {});
  }

  function completeRpgLocalQuest(profileId, questId, p) {
    var beforeState = buildRpgLocalState(p);
    var quest = null;
    for (var i = 0; i < beforeState.quests.length; i += 1) {
      if (String(beforeState.quests[i].questId || '') === String(questId || '')) {
        quest = beforeState.quests[i];
        break;
      }
    }
    if (!quest) return buildRpgLocalState(p);

    var api = getRpgLevelApi();
    if (!api) {
      return Object.assign(buildRpgLocalState(p), {
        errorState: true,
        errorMessage: '성장 기록 모듈을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.'
      });
    }

    var result = api.award('quest', String(questId));
    /* 저장 실패를 조용히 삼키면 완료를 눌러도 아무 일 없이 되돌아간 것처럼 보인다.
       사파리 프라이빗 모드·쿼터 초과가 실제로 여기에 걸린다. */
    if (result.changed && result.written === false) {
      return Object.assign(buildRpgLocalState(p), {
        errorState: true,
        errorMessage: '이 브라우저에 기록을 저장하지 못했습니다. 시크릿 모드라면 일반 창에서 열어주세요.'
      });
    }
    /* 적립이 안 된 이유를 말해 준다. 예전에는 changed:false 를 성공처럼 흘려보내서,
       하루 한도를 이미 채웠을 때 버튼을 눌러도 화면이 그대로였다(EXP도 에러도 없음).
       한도는 홈 카드·운명 나침반과 공유하므로 다른 화면에서 먼저 채웠을 수 있다. */
    if (!result.changed && result.reason === 'daily-cap') {
      var limit = getRpgQuestAwardRule().dailyLimit;
      return Object.assign(buildRpgLocalState(p), {
        errorState: true,
        errorMessage: '오늘의 성장 기록 ' + limit + '개를 이미 채웠습니다. 다른 화면에서 완료한 퀘스트도 함께 계산됩니다 · 내일 KST 자정에 다시 열립니다.'
      });
    }

    var afterState = buildRpgLocalState(p);
    var beforeLevel = toRpgNumber(beforeState.currentLevel, 1);
    var afterLevel = toRpgNumber(afterState.currentLevel, 1);
    var unlockedRewards = [];
    if (afterLevel > beforeLevel) {
      unlockedRewards = RPG_LEVEL_REWARD_DEFS.filter(function (def) {
        return def.level > beforeLevel && def.level <= afterLevel;
      }).map(function (def) {
        return { rewardKey: def.key, title: def.label, description: def.desc };
      });
    }
    return Object.assign(afterState, {
      justCompletedQuestId: questId,
      leveledUp: afterLevel > beforeLevel,
      flashLevelUp: afterLevel > beforeLevel,
      unlockedRewards: unlockedRewards
    });
  }

  function buildRpgCrashFallbackTemplate(message) {
    var safeMessage = String(message || '오늘의 클래스 시트를 다시 여는 중입니다.').trim();
    return '<section class="ent-rpg-shell ent-reveal" id="entRpgSection" data-marker="rpg-character-sheet-stable-bottom-v20260617" data-state="error">'
      + '<div class="ent-rpg-topline">'
      +   '<div>'
      +     '<div class="ent-quest-title">오늘의 성장 기록</div>'
      +     '<div class="ent-quest-sub">잠시 흔들린 기운을 다시 정렬합니다</div>'
      +   '</div>'
      +   '<div class="ent-rpg-kst">' + getKstDateString() + '</div>'
      + '</div>'
      + '<div class="ent-rpg-crash">' + escapeRpgHtml(safeMessage) + '</div>'
      + '<div class="ent-rpg-grid">'
      +   '<section class="ent-rpg-card ent-rpg-card--hero">'
      +     '<div class="ent-rpg-card__title">운명 코어 재정렬</div>'
      +     '<div class="ent-rpg-card__sub">프로필 기운이 다시 닿는 순간, 클래스 시트의 아래 영역까지 차분히 열립니다.</div>'
      +   '</section>'
      +   '<section class="ent-rpg-card ent-rpg-card--secret">'
      +     '<div class="ent-rpg-card__title">하단 수호 영역</div>'
      +     '<div class="ent-rpg-card__sub">기운의 흐름이 흔들려도 어두운 결계와 수호 문장이 먼저 머무릅니다.</div>'
      +   '</section>'
      + '</div>'
      + '</section>';
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
    var awardRule = getRpgQuestAwardRule();
    var todayMaxExp = Math.max(1, toRpgNumber(state.todayMaxExp, awardRule.exp * awardRule.dailyLimit));
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
    var heroSub = '일간의 기운이 오늘의 클래스를 정합니다. 다음 레벨까지 ' + expRemain + ' EXP 남았습니다.';
    var todaySkill = buildTodayRpgSkill(quests, completedSet, profileDayEl, completedCount, questCount);
    var todaySkillHtml = '<div class="ent-rpg-today-skill' + (todaySkill.done ? ' is-complete' : '') + '" data-today-skill="' + escapeRpgHtml(todaySkill.questId) + '">'
      + '<div class="ent-rpg-today-skill__orb">' + escapeRpgHtml(todaySkill.icon) + '</div>'
      + '<div class="ent-rpg-today-skill__body">'
      +   '<div class="ent-rpg-today-skill__kicker"><span>오늘의 스킬</span><span>' + escapeRpgHtml(todaySkill.tierName) + '</span></div>'
      +   '<div class="ent-rpg-today-skill__name">' + escapeRpgHtml(todaySkill.title) + '</div>'
      +   '<div class="ent-rpg-today-skill__copy">' + escapeRpgHtml(todaySkill.copy) + '</div>'
      +   '<div class="ent-rpg-today-skill__meter"><span style="--rpg-skill-progress:' + todaySkill.progressPct + '%"></span></div>'
      +   '<div class="ent-rpg-today-skill__reward">' + escapeRpgHtml(todaySkill.done ? '오늘의 스킬 각성 완료' : ('완료 보상 +' + todaySkill.expReward + ' EXP')) + '</div>'
      + '</div>'
      + '</div>';
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
      var isTodaySkill = String(todaySkill.questId || '') && String(todaySkill.questId || '') === String(quest.questId || '');
      /* 한 항목에 배지·설명·스킬칩·이유·해석을 다 얹으면 세 항목이 똑같이 생긴 카드 더미가 된다.
         제목 → 사주 이유 → (완료 시) 해석 → 보상/버튼 네 단으로 줄인다. */
      return '<article class="ent-rpg-quest-card' + (done ? ' is-complete' : '') + (justCompleted ? ' is-just-completed' : '') + (isTodaySkill ? ' is-today-skill' : '') + '" data-quest-id="' + escapeRpgHtml(quest.questId) + '">'
        + '<div class="ent-rpg-quest-icon" aria-hidden="true">' + escapeRpgHtml(icon) + '</div>'
        + '<div class="ent-rpg-quest-body">'
        +   '<h5 class="ent-rpg-quest-title">' + escapeRpgHtml(quest.text || '') + '</h5>'
        +   '<div class="ent-rpg-quest-reason"><strong>' + escapeRpgHtml(((RPG_ELEMENT_META[quest.element] && RPG_ELEMENT_META[quest.element].label) || quest.element || '운명') + ' 기운') + '</strong> · ' + escapeRpgHtml(quest.reason || '오늘의 기운을 맞추는 미션입니다.') + '</div>'
        +   (done ? '<div class="ent-rpg-quest-after"><strong>완료 후 해석</strong><br>' + escapeRpgHtml(quest.afterCompleteMessage || '오늘의 행동은 운의 흐름을 바로잡는 작은 전환점이 됩니다.') + '</div>' : '')
        +   '<div class="ent-rpg-quest-footer">'
        +     '<div class="ent-rpg-exp-tag">+' + escapeRpgHtml(toRpgNumber(quest.expReward, awardRule.exp)) + ' EXP</div>'
        +     '<button type="button" class="ent-rpg-complete-btn' + (done ? ' is-done' : '') + '" data-rpg-complete="' + escapeRpgHtml(quest.questId) + '"' + ((done || isPreviewMode) ? ' disabled aria-pressed="' + (done ? 'true' : 'false') + '"' : ' aria-pressed="false"') + '>' + escapeRpgHtml(isPreviewMode ? '기록 대기' : btnLabel) + '</button>'
        +   '</div>'
        + '</div>'
        + (justCompleted ? '<span class="cd-rpg-spark">+' + escapeRpgHtml(toRpgNumber(quest.expReward, awardRule.exp)) + ' EXP</span>' : '')
        + '</article>';
    }).join('');
    var secretMessage = isUnlockedSecret
      ? buildGrowthMessage(state)
      : '모든 미션을 완료하면 오늘의 성장 메시지가 해금됩니다.';
    var secretHtml = isUnlockedSecret
      ? '<div class="ent-rpg-secret-panel is-open">'
        +   '<div class="ent-rpg-secret-open-icon">✦</div>'
        +   '<div class="ent-rpg-secret-title">오늘의 성장 메시지</div>'
        +   '<div class="ent-rpg-secret-copy">오늘의 완료 기록이 새겨졌습니다. 이제 비밀 운세의 문이 열립니다.</div>'
        +   '<div class="ent-rpg-secret-message">' + escapeRpgHtml(secretMessage) + '</div>'
        /* 이 시트의 진행은 실제로 이 기기의 localStorage에만 남는다.
           로그인 계정으로 이어지는지 여부를 사실대로 밝힌다(예전 "SAVED ON SERVER"는 거짓이었다). */
        +   '<div class="ent-rpg-secret-note">' + escapeRpgHtml(getRpgStorageNotice()) + '</div>'
        + '</div>'
      /* 카드 제목·설명이 바로 위에서 같은 말을 한다. 잠금 패널은 아이콘과 진행도만 보여준다. */
      : '<div class="ent-rpg-secret-panel">'
        +   '<div class="ent-rpg-secret-lock">'
        +     '<div class="ent-rpg-secret-lock-icon">🔒</div>'
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
      +   '<div class="ent-rpg-modal__panel" role="dialog" aria-modal="true" aria-labelledby="entRpgModalTitle">'
      +     '<div class="ent-rpg-modal__badge">LV. ' + escapeRpgHtml(currentLevel) + ' 달성!</div>'
      +     '<div class="ent-rpg-modal__title" id="entRpgModalTitle">새로운 운명이 열렸습니다</div>'
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
      ? '<div class="ent-rpg-preview-note">운명의 기록이 열리기 전, 지금 확인 가능한 성장 루트를 먼저 펼쳐드립니다. EXP 각인은 프로필 연결 후 활성화됩니다.</div>'
      : '';
    var loadingBlock = isLoading
      ? '<div class="ent-rpg-loading">오늘의 사주 기반 퀘스트를 불러오는 중입니다.</div>'
      : (errText && state.errorState ? '<div class="ent-rpg-empty">오늘의 성장 기록을 열지 못했습니다.<br>' + escapeRpgHtml(errText) + '</div>' : '');
    return '<section class="ent-rpg-shell ent-reveal" id="entRpgSection" data-marker="rpg-character-sheet-stable-bottom-v20260617" data-dayel="' + escapeRpgHtml(profileDayEl) + '" data-state="' + escapeRpgHtml(state.errorState ? 'error' : (isLoading ? 'loading' : 'ready')) + '" data-profile-id="' + escapeRpgHtml(state.profileId || '') + '" data-quest-date="' + escapeRpgHtml(state.questDateKst || '') + '">'
      + '<div class="ent-rpg-topline">'
      +   '<div>'
      +     '<div class="ent-quest-title">오늘의 성장 기록</div>'
      +     '<div class="ent-quest-sub">퀘스트를 완료하면 EXP가 쌓이고 레벨이 오릅니다 · KST 자정 기준 리셋</div>'
      +   '</div>'
      +   '<div class="ent-rpg-kst">' + getKstDateString() + '</div>'
      + '</div>'
      + (state.message ? '<div class="ent-rpg-status">' + escapeRpgHtml(state.message) + '</div>' : '')
      + (state.errorState ? '<div class="ent-rpg-status is-error">' + escapeRpgHtml(errText || '오늘의 기록과 연결되지 않았습니다.') + '</div>' : '')
      + '<div class="ent-rpg-grid">'
      +   '<section class="ent-rpg-card ent-rpg-card--hero">'
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
      /* 위 필 4개(LV·다음·오늘·연속)가 이미 같은 숫자를 보여준다. 최장 기록만 덧붙인다. */
      +     '<div class="ent-rpg-summary">'
      +       '<span>최장 연속 <strong>' + escapeRpgHtml(longestStreakDays) + '일</strong></span>'
      +     '</div>'
      +   '</section>'
      +   '<section class="ent-rpg-card ent-rpg-card--elements">'
      +     '<div class="ent-rpg-card__title">오행 성장 포인트</div>'
      +     '<div class="ent-rpg-card__sub">오늘의 성장 포인트를 미션과 연결해, 부족한 기운은 채우고 과한 기운은 가라앉힙니다.</div>'
      +     '<div class="ent-rpg-element-list">' + elementHtml + '</div>'
      +   '</section>'
      +   '<section class="ent-rpg-card ent-rpg-card--abilities">'
      +     '<div class="ent-rpg-card__title">' + escapeRpgHtml(abilityTitle) + '</div>'
      +     '<div class="ent-rpg-card__sub">용신 ' + escapeRpgHtml(yongDisplay) + ' · 희신 ' + escapeRpgHtml(heeDisplay) + ' · 기신 ' + escapeRpgHtml(giDisplay) + '<br>오늘의 운명은 ' + escapeRpgHtml((dayMaster.stemKo || '일간') + ' ' + (dayMaster.elementKo || '오행')) + '에서 가장 선명하게 드러납니다.</div>'
      +     '<div class="ent-rpg-card__label">해금한 스킬</div>'
      +     '<div class="ent-rpg-chip-wrap">' + ownSkillHtml.join('') + '</div>'
      +     '<div class="ent-rpg-card__label">잠긴 스킬</div>'
      +     '<div class="ent-rpg-chip-wrap">' + lockedSkillHtml.join('') + '</div>'
      +   '</section>'
      +   '<section class="ent-rpg-card ent-rpg-card--quests">'
      +     '<div class="ent-rpg-card__title">오늘의 일일 퀘스트</div>'
      +     '<div class="ent-rpg-card__sub">' + escapeRpgHtml(completedCount + ' / ' + questCount + '개 완료 · 오늘 ' + todayEarnedExp + ' / ' + todayMaxExp + ' EXP · ' + ((RPG_ELEMENT_META[profileDayEl] && RPG_ELEMENT_META[profileDayEl].label) || profileDayEl) + ' 기운 기준') + '</div>'
      +     loadingBlock
      +     previewBlock
      +     todaySkillHtml
      +     '<div class="ent-rpg-quest-grid" id="entRpgQuestList">' + questHtml + '</div>'
      +   '</section>'
      +   '<section class="ent-rpg-card ent-rpg-card--secret">'
      +     '<div class="ent-rpg-card__title">오늘의 비밀 운세</div>'
      +     '<div class="ent-rpg-card__sub">모든 미션을 완료하면 오늘의 성장 메시지가 해금되고 운명 기록에 새겨집니다.</div>'
      +     secretHtml
      +   '</section>'
      +   '<section class="ent-rpg-card ent-rpg-card--closing">'
      +     '<div class="ent-rpg-card__title">다음 운명 루트</div>'
      +     '<div class="ent-rpg-card__sub">오늘의 EXP, 오행 균형, 비밀 운세가 하나의 성장 길로 이어집니다.</div>'
      +     '<div class="ent-rpg-route-grid">'
      +       '<div class="ent-rpg-route-card"><b>1. 기운 각성</b><span>' + escapeRpgHtml((RPG_ELEMENT_META[profileDayEl] && RPG_ELEMENT_META[profileDayEl].label) || profileDayEl) + '의 중심이 오늘의 판단을 비춥니다.</span></div>'
      +       '<div class="ent-rpg-route-card"><b>2. 미션 각인</b><span>완료한 행동은 작은 경험치가 되어 다음 레벨의 문턱에 머무릅니다.</span></div>'
      +       '<div class="ent-rpg-route-card"><b>3. 밤의 보상</b><span>하루가 닫힐 때 비밀 운세의 결이 더 선명하게 드러납니다.</span></div>'
      +     '</div>'
      +   '</section>'
      + '</div>'
      + modalHtml
      + '</section>';
  }

  function syncRpgLayoutHeight(root) {
    if (!root) return;
    var card = document.getElementById('skillTreeCard');
    var target = card || root;
    if (typeof w.syncReportHeightFromNode !== 'function') return;
    try {
      w.syncReportHeightFromNode(target);
      setTimeout(function () { w.syncReportHeightFromNode(target); }, 120);
      setTimeout(function () { w.syncReportHeightFromNode(target); }, 420);
    } catch (e) {}
  }

  function renderRpgSection(root, state, p) {
    if (!root) return;
    ensureRpgUiStyles();
    var wasVisible = !!(root.classList && root.classList.contains('is-visible'));
    var html = '';
    try {
      html = buildRpgTemplate(state || {}, p || {});
    } catch (error) {
      html = buildRpgCrashFallbackTemplate('클래스 시트의 하단 기운을 다시 정렬하고 있습니다.');
    }
    var holder = document.createElement('div');
    holder.innerHTML = html;
    var shell = holder.firstElementChild;
    if (shell && shell.id === 'entRpgSection') {
      root.className = shell.className;
      if (wasVisible && root.classList) root.classList.add('is-visible');
      root.innerHTML = shell.innerHTML;
      root.setAttribute('data-marker', shell.getAttribute('data-marker') || 'rpg-character-sheet-stable-bottom-v20260617');
      root.setAttribute('data-dayel', shell.getAttribute('data-dayel') || '');
      root.setAttribute('data-state', shell.getAttribute('data-state') || '');
      root.setAttribute('data-profile-id', shell.getAttribute('data-profile-id') || '');
      root.setAttribute('data-quest-date', shell.getAttribute('data-quest-date') || '');
    } else {
      root.innerHTML = html;
    }
    root.dataset.profileId = String((state && state.profileId) || root.dataset.profileId || '');
    root.dataset.state = String((state && state.errorState) ? 'error' : ((state && state.loading) ? 'loading' : 'ready'));
    root.dataset.questDate = String((state && state.questDateKst) || root.dataset.questDate || '');
    bindRpgInteractions(root, p || {});
    syncRpgLayoutHeight(root);
    return root;
  }

  /* 레벨업 모달을 열고 닫는 단일 창구.
     열 때 닫기 버튼으로 포커스를 옮기고, 닫으면 원래 있던 곳으로 되돌린다.
     키보드·스크린리더 사용자가 모달 뒤 배경을 계속 헤매지 않도록 하기 위함이다. */
  var _rpgModalReturnFocus = null;

  function openRpgModal(modal) {
    if (!modal) return;
    _rpgModalReturnFocus = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    var closeBtn = modal.querySelector('[data-rpg-modal-close]');
    if (closeBtn && typeof closeBtn.focus === 'function') closeBtn.focus();
  }

  function closeRpgModal(modal) {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    if (_rpgModalReturnFocus && typeof _rpgModalReturnFocus.focus === 'function') {
      try { _rpgModalReturnFocus.focus(); } catch (e) {}
    }
    _rpgModalReturnFocus = null;
  }

  function bindRpgInteractions(root, p) {
    if (!root || root.__rpgBound) return;
    root.__rpgBound = true;
    root.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' && event.key !== 'Esc') return;
      var openModal = root.querySelector('[data-rpg-modal].is-open');
      if (!openModal) return;
      event.preventDefault();
      closeRpgModal(openModal);
    });
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
        closeRpgModal(root.querySelector('[data-rpg-modal]'));
      }
    });
  }

  async function loadRpgStatus(root, p, transientState) {
    var questRoot = root || document.getElementById('entRpgSection');
    if (!questRoot) return;
    var profileId = getRpgLocalProfileId();
    questRoot.dataset.profileId = profileId;
    try {
      var nextState = buildRpgLocalState(p, transientState || {});
      renderRpgSection(questRoot, nextState, p);
      if (nextState.flashLevelUp) {
        openRpgModal(questRoot.querySelector('[data-rpg-modal]'));
      }
    } catch (error) {
      renderRpgSection(questRoot, {
        loading: false,
        errorState: true,
        errorMessage: '이 기기의 성장 기록을 잠시 열지 못했습니다.',
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
      var profileId = String(root.dataset.profileId || getRpgLocalProfileId() || 'guest-local').trim();
      var nextState = completeRpgLocalQuest(profileId, questId, p);
      renderRpgSection(root, nextState, p);
      if (nextState.leveledUp) {
        openRpgModal(root.querySelector('[data-rpg-modal]'));
      }
    } catch (error) {
      renderRpgSection(root, {
        loading: false,
        errorState: true,
        errorMessage: '이 기기에 퀘스트 기록을 새기지 못했습니다.',
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
      +   '<div class="ent-quest-title">로컬 성장 미션</div>'
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
      title: _entertainText("ee_1523_prop_title"),
      desc: '결정력과 추진력이 매력의 중심축입니다. 다만 속도감이 관계의 온도를 앞지르면 오해가 생길 수 있어, 강도 조절이 핵심 포인트입니다.',
      tips: [
        '핵심 결론은 짧게, 감정 피드백은 한 문장 더 길게 전달하기',
        '리드 후 상대 반응 체크를 습관화해 관계 이탈률 줄이기',
        '직설 화법이 필요한 순간과 공감 화법이 필요한 순간을 분리 운영하기'
      ],
      tags: ['주도권', '속도전', '결정력']
    },
    egen: {
      title: _entertainText("ee_1533_prop_title"),
      desc: '관계 감지력과 정서 공명이 강점입니다. 다만 감정 과몰입이 피로로 전환되지 않도록 경계선을 명확히 잡아야 매력이 오래갑니다.',
      tips: [
        '공감 표현 후 바로 다음 액션 1개를 제시해 실행력 연결하기',
        '배려와 자기보호의 균형을 위해 거절 문장 템플릿 준비하기',
        '정서 소모가 큰 관계에는 대화 시간 제한을 미리 설정하기'
      ],
      tags: ['공감력', '관계센스', '유연성']
    },
    neutral: {
      title: _entertainText("ee_1543_prop_title"),
      desc: '테토/에겐 모드를 상황에 따라 전환할 수 있는 멀티형입니다. 강점이 넓은 대신, 모드 기준이 없으면 피로가 누적될 수 있습니다.',
      tips: [
        '오전/오후처럼 시간대별 기본 모드를 고정해 의사결정 피로 줄이기',
        '중요 관계는 공감 우선, 업무 의사결정은 논리 우선 규칙 분리하기',
        '하루 종료 시 모드 전환이 잘된 장면 1개를 복기해 패턴 고정하기'
      ],
      tags: ['균형감', '전환력', '적응력']
    },
    observer: {
      title: _entertainText("ee_1553_prop_title"),
      desc: '신중함과 절제가 매력의 중심입니다. 반응이 늦어 보일 수 있지만, 충분히 본 뒤 움직일수록 선택의 밀도가 높아지는 타입입니다.',
      tips: [
        '좋고 싫음은 크게 말하지 않아도 짧은 신호로 먼저 남기기',
        '관찰이 길어질 때는 오늘 안에 결정할 작은 기준 1개를 정하기',
        '조용한 매력이 무관심으로 읽히지 않도록 리액션을 한 박자만 더 보여주기'
      ],
      tags: ['신중함', '관찰력', '절제']
    },
    transformer: {
      title: _entertainText("ee_1563_prop_title"),
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
      title: _entertainText("ee_1576_prop_title"),
      summary: '감정 노이즈를 최소화하고 구조를 먼저 보는 타입입니다. 위기 상황에서 판단 품질이 올라가는 강점이 뚜렷합니다.',
      cues: [
        '문제 발생 시 감정 반응보다 원인 트리 분해가 먼저 작동함',
        '관계 이슈도 논리적 일관성으로 해석하려는 경향이 강함',
        '정확성은 높지만 체감 온도가 낮아 보일 수 있어 톤 보정이 필요함'
      ]
    },
    high: {
      title: _entertainText("ee_1585_prop_title"),
      summary: '합리성과 현실 감각이 강하며, 감정 흐름도 실용적으로 정리하는 타입입니다. 냉정함과 실행력이 균형을 이룹니다.',
      cues: [
        '갈등 상황에서 정리·중재 역할을 자연스럽게 맡는 편',
        '비효율을 빠르게 감지해 행동 수정 속도가 빠름',
        '공감 표현을 한 문장만 추가해도 신뢰 체감이 크게 상승함'
      ]
    },
    hybrid: {
      title: _entertainText("ee_1594_prop_title"),
      summary: '논리와 감성을 번갈아 사용하는 하이브리드형입니다. 상황 판단 폭이 넓고, 전환 타이밍만 잡으면 매우 강력해집니다.',
      cues: [
        '업무에서는 분석, 관계에서는 공감으로 모드를 전환함',
        '판단 기준이 흐려질 때 우선순위 표기만 해도 효율이 회복됨',
        '결정 지연이 생기면 시간 제한 규칙이 성능을 안정화함'
      ]
    },
    empath: {
      title: _entertainText("ee_1603_prop_title"),
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
        title: _entertainText("ee_1657_prop_title"),
        text: '강한 인상과 진짜 강함은 다릅니다. 주도권이 없으면 불안해지는 순간, 그것은 리더십보다 불안 관리 모드에 가깝습니다.',
        action: '오늘 한 번은 "내가 모를 수도 있다"를 먼저 말해보세요. 취약함을 드러낼 때 신뢰가 올라갑니다.'
      },
      {
        icon: '💔',
        title: _entertainText("ee_1663_prop_title"),
        text: '먼저 크게 주고, 뒤늦게 지쳐서 선을 긋는 패턴이 보입니다. 문제는 배려가 아니라 기대를 숨긴 채 소진되는 흐름입니다.',
        action: '도와주기 전에 기대치를 한 줄로 합의하세요. 관계는 통제보다 조율이 오래갑니다.'
      },
      {
        icon: '🔥',
        title: _entertainText("ee_1669_prop_title"),
        text: '승부욕이 과열되면 번아웃을 넘어 자멸로 이어질 수 있습니다. 이기기 위한 전투와 성장하기 위한 전투는 완전히 다른 게임입니다.',
        action: '오늘은 "반드시 이긴다" 대신 "다음 판에서 더 좋아진다"를 목표로 잡아보세요. 회복력이 성과를 지켜줍니다.'
      }
    ],
    egen: [
      {
        icon: '🌊',
        title: _entertainText("ee_1677_prop_title"),
        text: '감수성이 뛰어나다는 것이 때로는 경계를 잃는 것을 의미합니다. 모두를 보살피다 정작 자신을 돌보지 못하고 있지는 않나요? 당신이 먼저 채워져야 다른 사람에게도 줄 수 있습니다. 산소마스크는 본인부터 착용해야 합니다.'
      },
      {
        icon: '🌱',
        title: _entertainText("ee_1682_prop_title"),
        text: '"왜 나는 항상 이렇게 맞춰주는가" 싶을 때가 있을 것입니다. 그것은 사랑이기도 하지만, 거절하지 못하는 두려움이기도 합니다. NO라고 말하는 연습 — 당신에게 가장 필요한 자기 존중의 언어입니다.'
      },
      {
        icon: '✨',
        title: _entertainText("ee_1687_prop_title"),
        text: '감정에 과몰입하면 객관적인 판단력이 흐려집니다. 감정을 충분히 느끼되 그 감정에 지배당하지 않는 메타인지 훈련이 당신에게 가장 필요한 성장 과제입니다. 관찰자의 눈으로 자신을 바라보는 연습을 시작하세요.'
      }
    ],
    neutral: [
      {
        icon: '⚖️',
        title: _entertainText("ee_1694_prop_title"),
        text: '양면성은 분명 강점입니다. 하지만 때로는 내 안의 진짜 욕구가 무엇인지 스스로도 모르는 상황이 생깁니다. "나는 지금 진짜 뭘 원하는가" — 이 질문을 일주일에 한 번은 진지하게 물어보세요.'
      },
      {
        icon: '🌀',
        title: _entertainText("ee_1699_prop_title"),
        text: '상황에 따라 다른 면을 보여주는 것이 영리해 보이지만, 가까운 사람이 "당신의 진짜 모습을 모르겠다"고 느낄 수 있습니다. 무방비 상태의 진짜 모습을 한 명에게라도 보여주는 용기가 관계의 깊이를 만듭니다.'
      },
      {
        icon: '🔮',
        title: _entertainText("ee_1704_prop_title"),
        text: '균형을 유지하려는 욕구가 과잉되면 아무 결정도 내리지 못하는 우유부단함이 됩니다. 완벽한 균형은 존재하지 않습니다. 선택하고 책임지는 용기 — 그것이 당신을 한 단계 성장시키는 유일한 방법입니다.'
      }
    ]
  };

  function getTetoEgenBoneAdvice(result) {
    var common = {
      teto: [
        {
          title: _entertainText("ee_1714_prop_title"),
          punch: '강하게 보이는 것과 원하는 것을 정확히 말하는 것은 다릅니다.',
          why: '주도권이 흔들릴 때 바로 결론을 내리면 상대는 설득보다 압박을 먼저 느낄 수 있습니다.',
          fix: '결론을 말하기 전, 원하는 것과 양보 가능한 것을 한 문장씩 분리해 말해보세요.'
        },
        {
          title: _entertainText("ee_1720_prop_title"),
          punch: '도와주는 마음이 커도 말투가 날카로우면 통제로 읽힙니다.',
          why: '테토 에너지는 해결 속도가 빠른 대신, 상대의 감정 온도를 건너뛰기 쉽습니다.',
          fix: '해결책 앞에 "네 입장에서는 그럴 수 있겠다" 한 문장만 붙이면 체감 온도가 달라집니다.'
        },
        {
          title: _entertainText("ee_1726_prop_title"),
          punch: '다 이기려는 마음이 계속되면 결국 나 자신과도 싸우게 됩니다.',
          why: '승부욕은 성과를 만들지만, 회복 없이 쓰면 관계와 컨디션을 동시에 태웁니다.',
          fix: '오늘은 반드시 이기는 목표 1개와 힘을 빼도 되는 목표 1개를 따로 정하세요.'
        }
      ],
      egen: [
        {
          title: _entertainText("ee_1734_prop_title"),
          punch: '다 맞춰주는 것처럼 보여도 속으로는 이미 여러 번 서운했을 수 있습니다.',
          why: '에겐 에너지는 분위기를 살피는 힘이 강해서 자기 욕구를 뒤로 미루기 쉽습니다.',
          fix: '거절 대신 침묵하지 말고, "이번엔 어렵지만 다음엔 가능해"처럼 경계가 있는 문장을 써보세요.'
        },
        {
          title: _entertainText("ee_1740_prop_title"),
          punch: '마음은 깊은데 표현 기준이 들쭉날쭉하면 상대는 확신을 못 잡습니다.',
          why: '감정 신호를 많이 읽는 만큼, 스스로도 상대 반응에 맞춰 계속 톤을 바꾸기 때문입니다.',
          fix: '좋으면 좋다고, 불편하면 불편하다고 짧게라도 표시하세요. 선명함이 관계를 편하게 만듭니다.'
        },
        {
          title: _entertainText("ee_1746_prop_title"),
          punch: '상대 감정을 다 책임지려는 순간, 다정함은 피로가 됩니다.',
          why: '공감력이 높을수록 남의 감정을 내 숙제처럼 들고 오기 쉽습니다.',
          fix: '대화 후 바로 3분만 혼자 호흡하며 "내 감정/상대 감정"을 분리해 적어보세요.'
        }
      ],
      neutral: [
        {
          title: _entertainText("ee_1754_prop_title"),
          punch: '당신은 균형 잡힌 사람처럼 보이지만, 사실은 선택을 미루기 위해 균형이라는 말을 쓰는 순간이 있습니다.',
          why: '테토와 에겐을 모두 쓸 수 있어서 장점이 넓지만, 그만큼 "지금은 어느 쪽으로 가야 하지?"라는 판단 피로가 생깁니다.',
          fix: '완벽한 중간값을 찾기보다 오늘은 60점짜리 선택이라도 먼저 해보세요.'
        },
        {
          title: _entertainText("ee_1760_prop_title"),
          punch: '상황마다 다른 얼굴을 보여주는 능력이 좋지만, 가까운 사람은 진짜 속마음을 놓칠 수 있습니다.',
          why: '겉으로는 부드럽게 맞추다가도 속으로는 실속과 기준을 계산하기 때문에 신호가 엇갈릴 때가 있습니다.',
          fix: '중요한 관계에서는 "나는 지금 조심스럽지만 마음은 있다"처럼 현재 모드를 직접 말해주세요.'
        },
        {
          title: _entertainText("ee_1766_prop_title"),
          punch: '모두를 이해하려다 보면 결국 내 선택만 늦어질 수 있습니다.',
          why: '양쪽 입장을 다 보는 힘은 좋지만, 결론을 내리는 책임까지 미루면 에너지가 흩어집니다.',
          fix: '팩트 2개, 감정 1개, 오늘의 결론 1개만 적고 그 기준으로 움직이세요.'
        }
      ],
      observer: [
        {
          title: _entertainText("ee_1774_prop_title"),
          punch: '조용함이 매력이어도, 아무 신호도 없으면 무관심처럼 보일 수 있습니다.',
          why: '신중하게 관찰하는 시간이 길어질수록 상대는 당신의 마음이 어디에 있는지 읽기 어려워집니다.',
          fix: '오늘은 좋은 것 하나, 싫은 것 하나를 짧게라도 먼저 말해보세요.'
        },
        {
          title: _entertainText("ee_1780_prop_title"),
          punch: '속으로는 많이 보고 있는데 겉으로 표현이 적으면 상대는 거리를 느낍니다.',
          why: '반응을 아끼는 방식이 자기 보호에는 좋지만, 관계에서는 정보 부족으로 읽힐 수 있습니다.',
          fix: '대답이 늦어질 때는 "생각 중이야"라는 중간 신호를 먼저 남기세요.'
        },
        {
          title: _entertainText("ee_1786_prop_title"),
          punch: '더 확실해질 때까지 기다리다 보면 좋은 타이밍이 지나갈 수 있습니다.',
          why: '관찰력은 강점이지만, 작은 선택까지 완벽한 근거를 찾으면 움직임이 무거워집니다.',
          fix: '오늘은 70% 확신이 생긴 일 하나를 작게 실행해보세요.'
        }
      ],
      transformer: [
        {
          title: _entertainText("ee_1794_prop_title"),
          punch: '몰입이 올라온 순간의 말은 매력적이지만, 결론이 없으면 소음처럼 남을 수 있습니다.',
          why: '식상과 상관 축이 강하면 반응이 빠르고 표현이 살아나지만, 감정의 속도가 판단보다 앞설 수 있습니다.',
          fix: '말하기 전 "내가 지금 원하는 결론은 무엇인가"를 한 문장으로 먼저 정하세요.'
        },
        {
          title: _entertainText("ee_1800_prop_title"),
          punch: '평소와 몰입했을 때의 온도차가 커서 상대는 갑자기 사람이 바뀐 것처럼 느낄 수 있습니다.',
          why: '표현성이 특정 상황에서 확 켜지면, 주변은 그 반전의 이유를 바로 따라잡지 못합니다.',
          fix: '반응이 커진 뒤에는 "방금 내가 꽂혀서 말이 빨라졌어"처럼 상황 설명을 붙이세요.'
        },
        {
          title: _entertainText("ee_1806_prop_title"),
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
        title: _entertainText("ee_1899_prop_title"),
        sub: '추진력과 결정력으로 흐름을 먼저 정리하는 현실 감각형 캐릭터',
        summary: '테토 점수가 더 선명하게 올라와 있습니다. 고민이 길어질 때도 결국은 실행, 효율, 손익을 기준으로 판을 정리하는 쪽에 가깝습니다. 다만 리드가 강해질수록 상대가 따라올 시간을 조금 남겨두면 매력이 더 안정적으로 보입니다.',
        badges: ['추진력', '결정력', '현실 감각', '리드'],
        save: '나는 테토 우세형. 망설임보다 실행으로 판을 정리하고, 필요한 순간 먼저 움직이는 타입이다.'
      };
    }

    if (type === 'egen') {
      return {
        key: 'egen',
        title: _entertainText("ee_1910_prop_title"),
        sub: '관계 감각과 유연함으로 분위기를 조율하는 감정 센스형 캐릭터',
        summary: '에겐 점수가 더 자연스럽게 드러납니다. 사람의 말투, 표정, 공기의 변화를 빨리 읽고 그 흐름에 맞춰 부드럽게 움직이는 편입니다. 배려가 길어질수록 내 기준을 늦게 말할 수 있으니, 중요한 선은 초반에 가볍게 밝혀두는 것이 좋습니다.',
        badges: ['관계 감각', '유연함', '분위기 조율', '감정 센스'],
        save: '나는 에겐 우세형. 분위기를 읽고 관계의 온도를 맞추며, 부드럽게 흐름을 바꾸는 타입이다.'
      };
    }

    if (type === 'observer') {
      return {
        key: 'observer',
        title: _entertainText("ee_1921_prop_title"),
        sub: '신중함과 절제로 천천히 존재감이 올라오는 늦게 뜨는 매력형 캐릭터',
        summary: '테토와 에겐 에너지가 모두 과하게 튀기보다 낮은 온도로 깔려 있습니다. 처음부터 강하게 표현하기보다는 관찰하고, 재고, 확신이 생긴 뒤 움직이는 쪽입니다. 조용해서 약한 타입은 아니고, 타이밍을 고를수록 매력이 선명해지는 편입니다.',
        badges: ['신중함', '관찰력', '절제', '늦게 뜨는 매력'],
        save: '나는 저자극 관찰자형. 크게 흔들지 않아도, 오래 볼수록 결이 드러나는 타입이다.'
      };
    }

    if (type === 'transformer') {
      return {
        key: 'transformer',
        title: _entertainText("ee_1932_prop_title"),
        sub: '표현성과 반응성이 살아 있어 순간 몰입으로 분위기를 뒤집는 캐릭터',
        summary: '식상이나 상관 축이 또렷하게 잡히면 평소에는 잠잠해 보여도 특정 주제, 사람, 상황 앞에서 반응성이 확 올라옵니다. 말맛과 표정 변화가 빠르고, 몰입하는 순간에는 주변 분위기를 예상 밖으로 바꾸는 힘이 있습니다. 다만 즉흥 반응이 길어지면 피로가 쌓이니, 끝맺는 타이밍을 정해두면 좋습니다.',
        badges: ['순간 몰입', '분위기 반전', '반응성', '예측불가 매력'],
        save: '나는 과몰입 변신형. 조용히 있다가도 꽂히는 순간 분위기를 바꾸는 타입이다.'
      };
    }

    return {
      key: 'neutral',
      title: _entertainText("ee_1942_prop_title"),
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
    if (score >= 70) return '분위기와 감정 흐름이 빠르게 들어옵니다. 다정함이 장점이지만, 과몰입 경계선을 세우면 훨씬 편해집니다.';
    if (score >= 45) return '부드럽게 맞추는 능력이 살아 있습니다. 다만 무조건 순한 타입이라기보다 필요한 순간에는 기준도 세웁니다.';
    return '감정에 크게 휩쓸리기보다 한 발 떨어져 관찰하는 편입니다. 표현을 조금 더하면 관계 신호가 선명해집니다.';
  }

  function buildTetoEgenIngredientRows(vibe) {
    var cnt = (vibe && vibe.cnt) || {};
    var rows = [
      {
        label: _entertainText("ee_1966_prop_label"),
        count: Number(vibe && vibe.jaesung || 0),
        tags: '현실 감각 · 계산력 · 실속 · 소유욕',
        text: '재성이 ' + Number(vibe && vibe.jaesung || 0) + '칸이라 현실 감각은 꽤 살아 있습니다. 단순히 감정으로만 움직이기보다 "이게 나한테 실속이 있나?"를 은근히 계산하는 편입니다.'
      },
      {
        label: _entertainText("ee_1972_prop_label"),
        count: Number(vibe && vibe.siksang || 0),
        tags: '표현력 · 센스 · 반응성 · 말맛',
        text: '식상 축은 ' + Number(vibe && vibe.siksang || 0) + '칸이고, 상관은 ' + Number(cnt['상관'] || 0) + '칸입니다. 그래서 조용해 보여도 말맛, 센스, 반응 속도가 묘하게 살아납니다.'
      },
      {
        label: _entertainText("ee_1978_prop_label"),
        count: Number(cnt['편인'] || 0),
        tags: '독특한 감각 · 관찰력 · 내면 세계',
        text: '편인이 ' + Number(cnt['편인'] || 0) + '칸이라 남들이 쉽게 이해하지 못하는 취향과 관찰 포인트가 있습니다. 평범한 답보다 "나만 아는 결"을 더 신뢰하는 쪽입니다.'
      },
      {
        label: _entertainText("ee_1984_prop_label"),
        count: Number(vibe && vibe.gwansung || 0),
        tags: '책임감 · 기준 · 사회적 페르소나',
        text: '관성이 ' + Number(vibe && vibe.gwansung || 0) + '칸이라 완전히 자유분방한 사람은 아닙니다. 겉으로는 편해 보여도, 속에는 지켜야 하는 기준과 체면 감각이 있습니다.'
      },
      {
        label: _entertainText("ee_1990_prop_label"),
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
        title: _entertainText("ee_2015_prop_title"),
        seen: isTeto ? '마음이 생기면 행동으로 빠르게 보여주려 합니다.' : (isEgen ? '상대의 기분과 신호를 먼저 살피며 천천히 스며듭니다.' : '처음부터 확 불타기보다는 상대를 관찰하며 천천히 마음을 엽니다.'),
        inner: isTeto ? '내 사람이 되면 확실히 챙기고 싶습니다.' : (isEgen ? '좋아할수록 더 조심스러워지고 표현 타이밍을 재게 됩니다.' : '신뢰가 생기면 은근히 오래 가고, 상대의 생활 패턴까지 챙기는 실속형 애정 표현이 나옵니다.'),
        strength: isTeto ? '확신을 주는 행동력' : (isEgen ? '상대 마음을 편하게 만드는 섬세함' : '편안함과 실속을 같이 주는 애정 방식'),
        caution: isTeto ? '속도가 빠르면 상대는 부담으로 느낄 수 있습니다.' : (isEgen ? '마음이 있는지 없는지 상대가 헷갈릴 수 있습니다.' : '상대가 보기에는 마음이 있는지 없는지 헷갈릴 수 있습니다. 좋아하면 티를 조금 더 내야 합니다.'),
        tip: '좋으면 좋은 이유를 한 문장으로 직접 말해보세요.'
      },
      {
        icon: '👥',
        title: _entertainText("ee_2024_prop_title"),
        seen: isTeto ? '필요한 말은 빠르게 하고 관계의 방향을 정리합니다.' : (isEgen ? '분위기를 읽고 불편한 공기를 부드럽게 낮춥니다.' : '상대에 따라 거리감과 친밀도를 꽤 유연하게 조절합니다.'),
        inner: isTeto ? '시간을 낭비하는 관계에는 에너지를 덜 쓰고 싶습니다.' : (isEgen ? '상대가 상처받지 않도록 표현을 많이 고릅니다.' : '맞춰주고 있지만 속으로는 실속과 피로도를 함께 계산합니다.'),
        strength: isTeto ? '관계 정리력' : (isEgen ? '공감과 분위기 조율' : '너무 들이대지도, 너무 밀어내지도 않는 균형감'),
        caution: isTeto ? '단호함이 무심함으로 읽힐 수 있습니다.' : (isEgen ? '거절을 미루다 감정 피로가 쌓일 수 있습니다.' : '속마음을 숨기면 가까운 사람이 거리감을 느낄 수 있습니다.'),
        tip: '팩트만 말하지 말고 "내가 느낀 점"을 한 문장 붙이세요.'
      },
      {
        icon: '💼',
        title: _entertainText("ee_2033_prop_title"),
        seen: isTeto ? '결론, 성과, 우선순위를 빠르게 잡습니다.' : (isEgen ? '협업 분위기와 디테일을 살려 팀의 마찰을 줄입니다.' : '혼자 조용히 판단한 뒤 필요한 순간에 실속 있는 의견을 냅니다.'),
        inner: isTeto ? '결국 결과로 증명해야 마음이 편합니다.' : (isEgen ? '사람들이 편해야 일도 잘 풀린다고 느낍니다.' : '머릿속으로는 이미 손익과 가능성을 계산하고 있습니다.'),
        strength: isTeto ? '추진력과 결정 속도' : (isEgen ? '협업 감각과 사용자 관점' : '관찰 후 정확히 움직이는 실속형 판단'),
        caution: isTeto ? '위임 없이 혼자 밀어붙이면 과부하가 옵니다.' : (isEgen ? '모두를 배려하다 우선순위가 흐려질 수 있습니다.' : '생각한 결론을 너무 늦게 공유하면 존재감이 약해질 수 있습니다.'),
        tip: '머릿속 결론을 혼자만 갖고 있지 말고 먼저 공유하세요.'
      },
      {
        icon: '🧘',
        title: _entertainText("ee_2042_prop_title"),
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
        label: _entertainText("ee_2211_prop_label"),
        count: data.jaesung,
        tags: '현실 감각 · 계산력 · 실속 · 소유욕',
        text: data.jaesung > 0 ? '재성이 ' + data.jaesung + '칸이라 현실 감각은 꽤 살아 있습니다. 감정만으로 움직이기보다 "이 선택이 내 생활에 어떤 이득을 주나"를 은근히 따져보는 편입니다.' : '재성 축은 강하게 드러나지 않습니다. 대신 실속 판단이 필요할 때는 주변 흐름을 먼저 보고 천천히 결론을 내는 편입니다.'
      },
      {
        label: _entertainText("ee_2217_prop_label"),
        count: data.siksang,
        tags: '표현력 · 센스 · 반응성 · 말맛',
        text: data.siksang > 0 ? '식상 축은 ' + data.siksang + '칸, 상관은 ' + getTetogenSafeNumber(data.cnt['상관']) + '칸입니다. 말맛과 센스가 붙으면 조용한 사람처럼 보여도 한마디가 묘하게 오래 남습니다.' : '표현 축 데이터가 약하게 잡힙니다. 말을 많이 하기보다 필요한 순간에만 반응을 꺼내는 쪽으로 보입니다.'
      },
      {
        label: _entertainText("ee_2223_prop_label"),
        count: getTetogenSafeNumber(data.cnt['편인']),
        tags: '독특한 감각 · 관찰력 · 내면 세계',
        text: getTetogenSafeNumber(data.cnt['편인']) > 0 ? '편인이 ' + getTetogenSafeNumber(data.cnt['편인']) + '칸이라 남들이 쉽게 지나치는 결을 잘 봅니다. 취향도 평범한 정답보다 "내가 꽂힌 이유"가 더 중요한 쪽입니다.' : '편인 신호는 약하게 보입니다. 독특함을 과하게 드러내기보다 현실 흐름에 맞춰 감각을 조율하는 편입니다.'
      },
      {
        label: _entertainText("ee_2229_prop_label"),
        count: data.gwansung,
        tags: '책임감 · 기준 · 사회적 페르소나',
        text: data.gwansung > 0 ? '관성이 ' + data.gwansung + '칸이라 겉으로 편해 보여도 마음속에는 지켜야 하는 기준이 있습니다. 그래서 관계와 일에서 선을 넘는 순간에는 표정이 달라집니다.' : '관성 축은 강하게 드러나지 않습니다. 고정된 규칙보다 상황의 흐름을 보고 기준을 세우는 쪽이 자연스럽습니다.'
      },
      {
        label: _entertainText("ee_2235_prop_label"),
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
        title: _entertainText("ee_2275_prop_title"),
        seen: isTeto ? '마음이 생기면 행동으로 빠르게 보여주려 합니다.' : (isEgen ? '상대의 기분과 신호를 먼저 살피며 천천히 스며듭니다.' : '처음부터 확 불타기보다는 상대를 관찰하며 천천히 마음을 엽니다.'),
        inner: isTeto ? '내 사람이 되면 확실히 챙기고 싶습니다.' : (isEgen ? '좋아할수록 더 조심스러워지고 표현 타이밍을 재게 됩니다.' : '신뢰가 생기면 은근히 오래 가고, 상대의 생활 패턴까지 챙기는 실속형 애정 표현이 나옵니다.'),
        strength: isTeto ? '확신을 주는 행동력' : (isEgen ? '상대 마음을 편하게 만드는 섬세함' : '편안함과 실속을 같이 주는 애정 방식'),
        caution: isTeto ? '속도가 빠르면 상대는 부담으로 느낄 수 있습니다.' : (isEgen ? '마음이 있는지 없는지 상대가 헷갈릴 수 있습니다.' : '상대가 보기에는 마음이 있는지 없는지 헷갈릴 수 있습니다. 좋아하면 티를 조금 더 내야 합니다.'),
        tip: '좋으면 좋은 이유를 한 문장으로 직접 말해보세요.'
      },
      {
        icon: '👥',
        title: _entertainText("ee_2284_prop_title"),
        seen: isTeto ? '필요한 말은 빠르게 하고 관계의 방향을 정리합니다.' : (isEgen ? '분위기를 읽고 불편한 공기를 부드럽게 낮춥니다.' : '상대에 따라 거리감과 친밀도를 꽤 유연하게 조절합니다.'),
        inner: isTeto ? '시간을 낭비하는 관계에는 에너지를 덜 쓰고 싶습니다.' : (isEgen ? '상대가 상처받지 않도록 표현을 많이 고릅니다.' : '맞춰주고 있지만 속으로는 실속과 피로도를 함께 계산합니다.'),
        strength: isTeto ? '관계 정리력' : (isEgen ? '공감과 분위기 조율' : '너무 들이대지도, 너무 밀어내지도 않는 균형감'),
        caution: isTeto ? '단호함이 무심함으로 읽힐 수 있습니다.' : (isEgen ? '거절을 미루다 감정 피로가 쌓일 수 있습니다.' : '속마음을 숨기면 가까운 사람이 거리감을 느낄 수 있습니다.'),
        tip: '팩트만 말하지 말고 "내가 느낀 점"을 한 문장 붙이세요.'
      },
      {
        icon: '💼',
        title: _entertainText("ee_2293_prop_title"),
        seen: isTeto ? '결론, 성과, 우선순위를 빠르게 잡습니다.' : (isEgen ? '협업 분위기와 디테일을 살려 팀의 마찰을 줄입니다.' : '혼자 조용히 판단한 뒤 필요한 순간에 실속 있는 의견을 냅니다.'),
        inner: isTeto ? '결국 결과로 증명해야 마음이 편합니다.' : (isEgen ? '사람들이 편해야 일도 잘 풀린다고 느낍니다.' : '머릿속으로는 이미 손익과 가능성을 계산하고 있습니다.'),
        strength: isTeto ? '추진력과 결정 속도' : (isEgen ? '협업 감각과 사용자 관점' : '관찰 후 정확히 움직이는 실속형 판단'),
        caution: isTeto ? '위임 없이 혼자 밀어붙이면 과부하가 옵니다.' : (isEgen ? '모두를 배려하다 우선순위가 흐려질 수 있습니다.' : '생각한 결론을 너무 늦게 공유하면 존재감이 약해질 수 있습니다.'),
        tip: '머릿속 결론을 혼자만 갖고 있지 말고 먼저 공유하세요.'
      },
      {
        icon: '🧘',
        title: _entertainText("ee_2302_prop_title"),
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

  function getTetogenHeroCopy(key) {
    var copy = {
      teto: '테토의 불이 먼저 솟아 판을 정리하고, 에겐의 빛은 관계의 온도를 보완합니다. 빠른 결단 속에 부드러운 여백을 남길수록 매력이 깊어집니다.',
      egen: '에겐의 빛이 먼저 번져 관계의 결을 살리고, 테토의 불은 필요한 순간 기준을 세웁니다. 다정함 속에 선명한 선택을 더할수록 존재감이 또렷해집니다.',
      observer: '두 에너지가 낮은 온도로 머무르며 오래 볼수록 결이 드러납니다. 서두르지 않는 관찰력 속에서 조용한 흡인력이 피어납니다.',
      transformer: '말맛과 반응성이 살아 있어 특정 순간에 에너지가 크게 솟습니다. 몰입의 불꽃을 짧고 선명하게 쓰면 분위기를 바꾸는 힘이 열립니다.',
      neutral: '테토와 에겐의 기운이 한쪽으로만 기울지 않고 교차합니다. 밀어붙일 때와 스며들 때를 고르는 감각이 매력의 중심으로 떠오릅니다.'
    };
    return copy[key] || copy.neutral;
  }

  function renderTetogenHeroSide(kind, percent, title, subtitle, tags) {
    var isTeto = kind === 'teto';
    var items = (tags || []).map(function (tag) {
      return '<span class="tetogen-luxe-side__chip">' + escapeRpgHtml(tag) + '</span>';
    }).join('');
    return '<article class="tetogen-luxe-side tetogen-luxe-side--' + kind + '">'
      + '<div class="tetogen-luxe-side__kicker">' + escapeRpgHtml(isTeto ? 'TETO' : 'EGEN') + '</div>'
      + '<h5 class="tetogen-luxe-side__title">' + escapeRpgHtml(title) + '</h5>'
      + '<p class="tetogen-luxe-side__copy">' + escapeRpgHtml(subtitle) + '</p>'
      + '<div class="tetogen-luxe-side__score"><b>' + percent + '%</b><span>' + escapeRpgHtml(isTeto ? '강한 끌림' : '부드러운 스며듦') + '</span></div>'
      + '<div class="tetogen-luxe-side__chips">' + items + '</div>'
      + '</article>';
  }

  function renderTetogenFeatureCard(label, value, copy, tone) {
    return '<article class="tetogen-luxe-feature tetogen-luxe-feature--' + (tone || 'violet') + '">'
      + '<span>' + escapeRpgHtml(label) + '</span>'
      + '<b>' + escapeRpgHtml(value) + '</b>'
      + '<p>' + escapeRpgHtml(copy) + '</p>'
      + '</article>';
  }

  function renderTetogenResultCard(vibe) {
    var data = normalizeTetogenVibe(vibe);
    var profile = resolveTetoEgenProfile(data);
    var tPct = clampTetoEgenPercent(data.tetoScore);
    var ePct = clampTetoEgenPercent(data.egenScore);
    var topStarText = getTetogenTopStarText(data);
    var scoreGap = Math.abs(data.tetoScore - data.egenScore);
    var badgeHtml = (profile.badges || []).slice(0, 4).map(renderTetogenBadge).join('');
    var heroCopy = getTetogenHeroCopy(profile.key);
    var balanceLabel = scoreGap <= 10 ? '균형형' : (data.tetoScore > data.egenScore ? '테토 우세' : '에겐 우세');
    var cleanTitle = profile.title.replace(/[🔥✨🌙⚡🌀]/g, '').trim() || '테토 에겐 밸런스';
    var dominantLabel = data.tetoScore > data.egenScore ? '테토의 불빛' : (data.egenScore > data.tetoScore ? '에겐의 달빛' : '균형의 문');
    var featureHtml = [
      renderTetogenFeatureCard('대표 결', cleanTitle, profile.sub, 'gold'),
      renderTetogenFeatureCard('균형 지점', balanceLabel + ' · ' + scoreGap + '점 차', topStarText, 'violet'),
      renderTetogenFeatureCard('오늘의 사용', profile.key === 'teto' ? '속도에 온도 더하기' : (profile.key === 'egen' ? '배려에 기준 더하기' : '상황별 모드 전환'), '연애, 관계, 커리어 흐름에서 테토와 에겐을 나눠 쓰면 결이 더 선명해집니다.', 'rose')
    ].join('');

    return '<section class="ent-reveal tetogen-refined relative mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-4 text-slate-100 shadow-2xl sm:p-6" data-tetogen-result="' + escapeRpgHtml(profile.key || 'neutral') + '">'
      + '<div class="tetogen-refined__halo tetogen-refined__halo--teto" aria-hidden="true"></div>'
      + '<div class="tetogen-refined__halo tetogen-refined__halo--egen" aria-hidden="true"></div>'
      + '<div class="tetogen-refined__inner relative z-10 grid gap-5">'
      + '<header class="tetogen-refined__hero grid gap-5 lg:grid-cols-[1.08fr_.92fr] lg:items-end">'
      + '<div class="grid gap-4">'
      + '<div class="tetogen-refined__eyebrow inline-flex w-max items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-amber-100">SAJU ENERGY TEST</div>'
      + '<div class="grid gap-3">'
      + '<h4 class="m-0 text-4xl font-black tracking-normal text-white sm:text-5xl">테토 <span>VS</span> 에겐</h4>'
      + '<p class="m-0 max-w-2xl text-sm font-semibold leading-7 text-slate-300 sm:text-base">' + escapeRpgHtml(heroCopy) + '</p>'
      + '</div>'
      + '<div class="tetogen-refined__badges flex flex-wrap gap-2">' + badgeHtml + '</div>'
      + '</div>'
      + '<aside class="tetogen-refined__summary rounded-3xl border border-white/10 bg-white/[.06] p-5 shadow-xl shadow-black/20 backdrop-blur-xl">'
      + '<span class="block text-xs font-black uppercase text-slate-400">TODAY TYPE</span>'
      + '<strong class="mt-2 block text-2xl font-black text-white">' + escapeRpgHtml(cleanTitle) + '</strong>'
      + '<p class="mt-3 text-sm font-semibold leading-7 text-slate-300">' + escapeRpgHtml(dominantLabel) + '이 먼저 떠오르고, 반대편 에너지가 결을 다듬습니다.</p>'
      + '</aside>'
      + '</header>'
      + '<section class="tetogen-refined__balance rounded-3xl border border-white/10 bg-slate-900/70 p-4 shadow-xl shadow-black/20">'
      + '<div class="mb-3 flex items-center justify-between gap-3">'
      + '<span class="text-sm font-black text-orange-100">테토 ' + tPct + '%</span>'
      + '<span class="text-xs font-black text-slate-400">' + escapeRpgHtml(balanceLabel) + '</span>'
      + '<span class="text-sm font-black text-fuchsia-100">에겐 ' + ePct + '%</span>'
      + '</div>'
      + '<div class="tetogen-refined__rail" aria-hidden="true">'
      + '<div id="hvBarTeto" class="tetogen-refined__bar tetogen-refined__bar--teto" style="width:0%;"></div>'
      + '<div id="hvBarEgen" class="tetogen-refined__bar tetogen-refined__bar--egen" style="width:0%;"></div>'
      + '</div>'
      + '<div class="mt-3 grid grid-cols-2 gap-3 text-xs font-bold text-slate-400">'
      + '<span>실행 · 결단 · 현실감</span>'
      + '<span class="text-right">공감 · 조율 · 관계감</span>'
      + '</div>'
      + '</section>'
      + '<section class="tetogen-refined__features grid gap-3 md:grid-cols-3">' + featureHtml + '</section>'
      + '</section>'
      + '</div>'
      + '</section>';
  }

  var TETOGEN_DEEP_REPORT_FEATURE_KEY = 'tetogen_deep_report';
  var TETOGEN_DEEP_REPORT_COST = 100;
  var TETOGEN_DEEP_REPORT_KRW = 10000;

  function isTetogenDeepReportUnlocked() {
    try {
      if (typeof w.isTileKeyUnlocked === 'function' && w.isTileKeyUnlocked(TETOGEN_DEEP_REPORT_FEATURE_KEY)) return true;
    } catch (_) {}
    try {
      return w.localStorage && w.localStorage.getItem('cd_tetogen_deep_report_unlocked') === '1';
    } catch (_) {
      return false;
    }
  }

  function markTetogenDeepReportUnlocked(payload) {
    try {
      if (typeof w._cdFinalizeUnlockState === 'function') w._cdFinalizeUnlockState(TETOGEN_DEEP_REPORT_FEATURE_KEY, payload || null);
    } catch (_) {}
    try {
      if (w.localStorage) w.localStorage.setItem('cd_tetogen_deep_report_unlocked', '1');
    } catch (_) {}
  }

  function buildTetogenDeepReportBody(vibe, p, power, hapData) {
    var data = normalizeTetogenVibe(vibe);
    var profile = resolveTetoEgenProfile(data);
    return '<div class="tetogen-premium-report ent-reveal" data-tetogen-premium-report="1">'
      + '<div class="tetogen-premium-report__head">'
      + '<span>DEEP REPORT</span>'
      + '<strong>숨은 매력의 결이 더 깊게 열립니다</strong>'
      + '<p>십성의 분포, 관계의 온도, 오늘의 사용법이 한 화면 안에서 이어집니다.</p>'
      + '</div>'
      + renderTetogenTenGodMatrix(data)
      + renderTetogenModeCards(profile)
      + renderTetogenQuestList()
      + buildTetoEgeDeepSection(p || {}, power || {}, hapData)
      + '<blockquote class="tetogen-premium-report__save">' + escapeRpgHtml(profile.save) + '</blockquote>'
      + '</div>';
  }

  function buildTetogenDeepReportGate(vibe, p, power, hapData) {
    var unlocked = isTetogenDeepReportUnlocked();
    var data = normalizeTetogenVibe(vibe);
    var profile = resolveTetoEgenProfile(data);
    var teaserItems = [
      '십성 기반 매력 매트릭스',
      '테토/에겐 전환 모드',
      '관계·커리어 활용 의식',
      '합화와 오늘의 조언'
    ].map(function (label) {
      return '<li>' + escapeRpgHtml(label) + '</li>';
    }).join('');

    return '<section class="tetogen-premium-shell' + (unlocked ? ' is-unlocked' : '') + '" data-tetogen-deep-shell="1" data-feature-key="' + TETOGEN_DEEP_REPORT_FEATURE_KEY + '">'
      + '<div class="tetogen-premium-gate" data-tetogen-deep-gate="1">'
      + '<div class="tetogen-premium-gate__copy">'
      + '<span>PREMIUM</span>'
      + '<h4>' + escapeRpgHtml(profile.title.replace(/[🔥✨🌙⚡🌀]/g, '').trim() || '테토 에겐') + ' 상세 리포트</h4>'
      + '<p>무료 결과에 드러난 첫 결 뒤로, 매력의 근원과 관계에서 빛나는 방식이 더 깊게 열립니다.</p>'
      + '</div>'
      + '<ul class="tetogen-premium-gate__list">' + teaserItems + '</ul>'
      + '<div class="tetogen-premium-gate__action">'
      + '<strong>10,000원</strong>'
      + '<button type="button" class="tetogen-premium-gate__cta" data-tetogen-unlock="1">' + (unlocked ? '상세 리포트 열림' : '상세 리포트 열기') + '</button>'
      + '<small data-tetogen-status>' + (unlocked ? '이미 열린 흐름입니다.' : '결제 후 남은 해석이 펼쳐집니다.') + '</small>'
      + '</div>'
      + '</div>'
      + (unlocked ? buildTetogenDeepReportBody(vibe, p, power, hapData) : '')
      + '</section>';
  }

  function bindTetogenDeepReportGate(root, vibe, p, power, hapData) {
    if (!root) return;
    var shell = root.querySelector('[data-tetogen-deep-shell]');
    if (!shell) return;
    var button = shell.querySelector('[data-tetogen-unlock]');
    var status = shell.querySelector('[data-tetogen-status]');

    function reveal(payload) {
      markTetogenDeepReportUnlocked(payload || null);
      shell.classList.add('is-unlocked');
      var existing = shell.querySelector('[data-tetogen-premium-report]');
      if (!existing) {
        shell.insertAdjacentHTML('beforeend', buildTetogenDeepReportBody(vibe, p || {}, power || {}, hapData));
        _scheduleReveal(shell);
      }
      if (button) {
        button.disabled = true;
        button.textContent = '상세 리포트 열림';
      }
      if (status) status.textContent = '숨은 흐름이 열렸습니다.';
      if (typeof w.syncReportHeightFromNode === 'function') {
        w.syncReportHeightFromNode(root);
        setTimeout(function () { w.syncReportHeightFromNode(root); }, 220);
      }
    }

    if (isTetogenDeepReportUnlocked()) {
      reveal(null);
      return;
    }

    if (!button) return;
    button.addEventListener('click', function () {
      var settled = false;
      function settle(payload) {
        if (settled) return;
        settled = true;
        reveal(payload || null);
      }

      button.disabled = true;
      if (status) status.textContent = '결제창을 준비하고 있습니다.';

      if (typeof w._cdOpenPaidServiceGate !== 'function') {
        button.disabled = false;
        if (status) status.textContent = '결제 모듈을 불러오지 못했습니다.';
        return;
      }

      var requestId = 'tetogen-deep-report-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
      Promise.resolve(w._cdOpenPaidServiceGate({
        title: _entertainText("ee_2599_prop_title"),
        reason: '테토 에겐 상세 리포트 해금',
        featureKey: TETOGEN_DEEP_REPORT_FEATURE_KEY,
        serviceKey: TETOGEN_DEEP_REPORT_FEATURE_KEY,
        contentKey: TETOGEN_DEEP_REPORT_FEATURE_KEY,
        requestId: requestId,
        coinPrice: TETOGEN_DEEP_REPORT_COST,
        cost: TETOGEN_DEEP_REPORT_COST,
        amountKrw: TETOGEN_DEEP_REPORT_KRW,
        onGranted: function (_txId, payload) {
          settle(payload || null);
        },
        onCancel: function () {
          if (settled) return;
          button.disabled = false;
          if (status) status.textContent = '아직 잠겨 있습니다.';
        }
      })).then(function (result) {
        if (result && result.status === 'granted') settle(result.payload || result);
        else if (!settled) {
          button.disabled = false;
          if (status) status.textContent = '아직 잠겨 있습니다.';
        }
      }).catch(function (error) {
        console.warn('[tetogen-deep-report] gate failed:', error);
        button.disabled = false;
        if (status) status.textContent = '결제 확인에 실패했습니다.';
      });
    });
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
      excess: ['열감, 초조함, 수면 얕아짐이 생활 신호로 느껴지기 쉽습니다.', '매운 음식, 늦은 운동, 오후 카페인을 줄이고 저녁에는 걷기와 호흡으로 진정하세요.'],
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

  var HEALTH_ELEMENT_KNOWLEDGE = {
    wood: {
      hanja: '木',
      koreanName: '목',
      title: _entertainText("ee_2757_prop_title"),
      symbolicOrganRhythm: '간담 리듬',
      bodyKeywords: ['눈의 피로감', '목·어깨 긴장', '근육 긴장', '활동 리듬', '회복 시작점'],
      mindKeywords: ['계획', '성장 욕구', '답답함', '분노 조절', '시작 에너지'],
      lifestyleKeywords: ['산책', '스트레칭', '초록색 환경', '작은 시작', '루틴 재정렬'],
      balancedMessage: '목(木)이 균형을 이루면 몸과 마음이 자연스럽게 움직이고, 회복 루틴을 다시 시작하기 좋은 흐름이 열립니다.',
      excessiveMessage: '목(木)이 과하면 계획은 많지만 몸이 따라오지 않아 목과 어깨의 긴장, 조급함, 답답함이 생활 신호로 나타나기 쉽습니다.',
      weakMessage: '목(木)이 약하면 시작 에너지가 부족하거나 회복 루틴을 잡기 어려울 수 있습니다. 작은 산책이나 가벼운 스트레칭처럼 부담 없는 움직임이 좋습니다.',
      excessSignals: ['해야 할 일이 많아 머릿속이 바쁩니다', '목과 어깨가 쉽게 굳는 느낌이 듭니다', '계획이 어긋나면 짜증이 빨리 올라옵니다', '눈이 피로하거나 화면 사용 시간이 길어집니다'],
      weakSignals: ['시작이 늦어지고 미루는 일이 많아집니다', '몸을 움직이기 전까지 기운이 잘 올라오지 않습니다', '회복 루틴을 알아도 실천이 어렵습니다', '결정이 느려지고 방향감이 흐려집니다'],
      recoveryFocus: ['오늘 할 일을 하나만 줄이기', '목·어깨 이완 스트레칭', '짧은 산책으로 생장 리듬 살리기', '초록색 음식이나 자연 이미지 가까이 두기'],
      recommendedFoods: ['푸른 잎채소', '현미밥', '부드러운 나물', '따뜻한 국물 음식'],
      recommendedTea: ['보리차', '따뜻한 허브티', '연한 녹차'],
      recommendedMovement: ['가벼운 산책', '목·어깨 스트레칭', '등 펴기 운동'],
      recommendedRest: ['화면 밝기 낮추기', '눈 휴식', '이완 호흡'],
      avoidPatterns: ['과한 일정', '완벽주의', '밤늦은 화면 사용', '감정 억누르기'],
      premium: '명리학에서 목(木)은 봄의 생장성, 계획, 근육의 긴장과 회복 시작점을 상징합니다. 균형이면 몸과 마음이 앞으로 나아가지만, 과하면 압박이 몸보다 앞서가고 약하면 시작 에너지가 떨어지기 쉽습니다.'
    },
    fire: {
      hanja: '火',
      koreanName: '화',
      title: _entertainText("ee_2778_prop_title"),
      symbolicOrganRhythm: '심장·소장 리듬',
      bodyKeywords: ['활력', '순환감', '열감', '얼굴빛', '수면 리듬'],
      mindKeywords: ['기쁨', '표현력', '흥분', '집중력', '사회적 에너지'],
      lifestyleKeywords: ['햇빛', '리듬 있는 운동', '수면 정리', '감정 표현', '열기 조절'],
      balancedMessage: '화(火)가 균형을 이루면 활력과 표현력이 살아나고, 교류 속에서 좋은 에너지를 얻기 쉽습니다.',
      excessiveMessage: '화(火)가 과하면 몸과 마음이 쉽게 달아오르고, 늦은 시간까지 흥분이 가라앉지 않는 생활 신호가 나타나기 쉽습니다.',
      weakMessage: '화(火)가 약하면 의욕과 표현력이 줄어들고 몸이 차분하다 못해 무기력하게 느껴질 수 있습니다. 부드러운 햇빛과 따뜻한 움직임이 도움이 됩니다.',
      excessSignals: ['마음이 들떠 쉽게 가라앉지 않습니다', '잠들기 전까지 생각과 감정이 활발합니다', '사람을 많이 만나면 에너지가 빨리 소모됩니다', '카페인이나 자극적인 콘텐츠에 예민해집니다'],
      weakSignals: ['의욕이 잘 올라오지 않습니다', '표현하고 싶은 마음은 있지만 행동이 늦습니다', '몸이 차분하고 축 처지는 느낌이 있습니다', '즐거운 일에도 반응이 약합니다'],
      recoveryFocus: ['낮 시간 햇빛 보기', '가벼운 리듬 운동', '자기 전 조명 낮추기', '카페인과 자극적인 콘텐츠 줄이기'],
      recommendedFoods: ['따뜻한 죽', '부드러운 단백질 식사', '수분감 있는 과일', '가벼운 채소 요리'],
      recommendedTea: ['대추차', '캐모마일', '따뜻한 물'],
      recommendedMovement: ['가벼운 유산소', '리듬감 있는 걷기', '햇빛 산책'],
      recommendedRest: ['취침 전 조명 줄이기', '휴대폰 멀리두기', '감정 일기'],
      avoidPatterns: ['늦은 밤 카페인', '과한 SNS', '감정 과열', '무리한 약속'],
      premium: '명리학에서 화(火)는 여름의 밝음, 심리적 활력, 표현력, 순환감을 상징합니다. 균형이면 생기가 돌고 매력이 살아나지만, 과하면 감정과 일정이 과열되고 약하면 의욕과 온기가 줄어든 듯 느껴질 수 있습니다.'
    },
    earth: {
      hanja: '土',
      koreanName: '토',
      title: _entertainText("ee_2799_prop_title"),
      symbolicOrganRhythm: '비위 리듬',
      bodyKeywords: ['소화 리듬', '복부 안정감', '무거움', '식사 시간', '생활 중심'],
      mindKeywords: ['걱정', '생각 과다', '안정 욕구', '책임감', '현실 감각'],
      lifestyleKeywords: ['규칙적 식사', '따뜻한 음식', '정리정돈', '느린 산책', '루틴 고정'],
      balancedMessage: '토(土)가 균형을 이루면 몸의 중심이 안정되고, 식사·수면·일정의 리듬이 편안하게 잡히기 쉽습니다.',
      excessiveMessage: '토(土)가 과하면 몸과 마음이 무겁고 생각이 많아져 움직임이 둔해질 수 있습니다. 단순한 식사와 가벼운 움직임이 필요합니다.',
      weakMessage: '토(土)가 약하면 생활 중심이 흔들리고 식사나 휴식 시간이 불규칙해지기 쉽습니다. 오늘은 기본 루틴을 먼저 세우는 것이 좋습니다.',
      excessSignals: ['몸이 무겁고 움직임이 둔합니다', '생각이 많아져 결정을 미룹니다', '식사 후 편안하지 않은 느낌이 있습니다', '정리되지 않은 환경에서 피로감이 커집니다'],
      weakSignals: ['식사 시간이 불규칙합니다', '생활의 중심이 잡히지 않습니다', '작은 변화에도 쉽게 흔들립니다', '몸을 돌보는 기본 루틴이 무너집니다'],
      recoveryFocus: ['따뜻하고 단순한 식사', '식사 시간을 일정하게 맞추기', '방이나 책상 한 구역만 정리하기', '느린 산책으로 몸의 중심 되찾기'],
      recommendedFoods: ['따뜻한 밥', '죽', '익힌 채소', '단순한 한식', '부드러운 뿌리채소'],
      recommendedTea: ['생강차', '보리차', '따뜻한 물'],
      recommendedMovement: ['식후 가벼운 걷기', '골반 이완', '느린 스트레칭'],
      recommendedRest: ['방 정리', '식사 시간 고정', '한 가지 일만 하기'],
      avoidPatterns: ['식사 거르기', '차가운 음식 과다', '폭식', '걱정 반복'],
      premium: '명리학에서 토(土)는 계절의 전환점, 중심, 소화와 안정 리듬을 상징합니다. 균형이면 생활이 안정되고 몸이 편안해지지만, 과하면 무거움과 생각 과다로 이어지고 약하면 식사·휴식·일정의 중심이 흔들릴 수 있습니다.'
    },
    metal: {
      hanja: '金',
      koreanName: '금',
      title: _entertainText("ee_2820_prop_title"),
      symbolicOrganRhythm: '폐·대장 리듬',
      bodyKeywords: ['호흡', '피부 컨디션', '목·어깨 압박', '정리 리듬', '건조감'],
      mindKeywords: ['기준', '완벽주의', '절제', '거리감', '판단력'],
      lifestyleKeywords: ['호흡', '공간 정리', '습도 관리', '기준 낮추기', '여백 만들기'],
      balancedMessage: '금(金)이 균형을 이루면 호흡이 차분해지고, 정리력과 판단력이 맑아져 하루의 질서가 잡히기 쉽습니다.',
      excessiveMessage: '금(金)이 과하면 기준이 높아지고 몸이 경직되기 쉽습니다. 완벽하게 해내려는 마음보다 여백을 만드는 것이 중요합니다.',
      weakMessage: '금(金)이 약하면 생활의 경계와 정리 리듬이 흐려질 수 있습니다. 작은 정리와 호흡 루틴이 컨디션을 회복하는 데 도움이 됩니다.',
      excessSignals: ['기준을 낮추기 어렵습니다', '목·어깨·가슴 주변이 답답하게 느껴집니다', '사소한 실수에도 예민해집니다', '쉬는 중에도 머릿속 검열이 계속됩니다'],
      weakSignals: ['생활 공간이 쉽게 흐트러집니다', '해야 할 일과 쉬어야 할 일의 경계가 흐려집니다', '호흡이 얕아진 듯한 느낌이 있습니다', '정리하고 싶은데 시작이 어렵습니다'],
      recoveryFocus: ['깊은 호흡 3분', '책상 위 한 구역 정리', '완벽주의 기준 낮추기', '실내 환기와 습도 관리'],
      recommendedFoods: ['배', '무', '맑은 국물', '부드러운 흰색 식재료'],
      recommendedTea: ['도라지차', '배차', '따뜻한 물'],
      recommendedMovement: ['흉곽 열기 스트레칭', '어깨 돌리기', '천천히 걷기'],
      recommendedRest: ['환기', '습도 조절', '공간 정리', '조용한 호흡'],
      avoidPatterns: ['완벽주의', '건조한 환경 방치', '무리한 기준', '감정 억제'],
      premium: '명리학에서 금(金)은 가을의 수렴성, 호흡, 정리, 기준, 절제를 상징합니다. 균형이면 판단력이 또렷하고 생활이 정돈되지만, 과하면 완벽주의와 긴장이 커지고 약하면 경계와 루틴이 흐려질 수 있습니다.'
    },
    water: {
      hanja: '水',
      koreanName: '수',
      title: _entertainText("ee_2841_prop_title"),
      symbolicOrganRhythm: '신장·방광 리듬',
      bodyKeywords: ['수면', '회복력', '하체 온기', '휴식', '저장 에너지'],
      mindKeywords: ['불안', '깊은 생각', '직감', '두려움', '내면 안정'],
      lifestyleKeywords: ['수면 루틴', '따뜻한 하체', '조용한 휴식', '수분', '밤 시간 관리'],
      balancedMessage: '수(水)가 균형을 이루면 수면과 회복 리듬이 안정되고, 몸의 에너지를 차분하게 저장하기 쉽습니다.',
      excessiveMessage: '수(水)가 과하면 생각이 깊어지고 몸이 차분하다 못해 무겁게 느껴질 수 있습니다. 따뜻한 움직임과 햇빛이 균형을 잡아줍니다.',
      weakMessage: '수(水)가 약하면 회복감이 부족하고 수면 리듬이 흔들리기 쉽습니다. 오늘은 무리한 활동보다 깊은 휴식과 따뜻한 루틴이 필요합니다.',
      excessSignals: ['생각이 깊어져 쉽게 빠져나오기 어렵습니다', '몸이 차분하지만 무겁게 느껴집니다', '혼자 있고 싶은 마음이 강해집니다', '늦은 밤 걱정이 길어집니다'],
      weakSignals: ['잠을 자도 회복감이 부족합니다', '밤 시간이 불규칙해집니다', '하체가 차갑게 느껴지기 쉽습니다', '미래 걱정이 자주 떠오릅니다'],
      recoveryFocus: ['취침 시간 앞당기기', '하체 따뜻하게 하기', '밤 시간 정보 과다 줄이기', '따뜻한 물 천천히 마시기'],
      recommendedFoods: ['따뜻한 국물', '검은콩', '미역국', '부드러운 단백질 식사'],
      recommendedTea: ['따뜻한 물', '대추차', '생강차'],
      recommendedMovement: ['느린 요가', '하체 이완', '가벼운 걷기'],
      recommendedRest: ['수면 루틴', '하체 보온', '밤 화면 줄이기', '명상'],
      avoidPatterns: ['밤샘', '찬 음식 과다', '늦은 밤 고민', '무리한 일정'],
      premium: '명리학에서 수(水)는 겨울의 저장성, 수면, 회복력, 내면 안정, 깊은 생각을 상징합니다. 균형이면 휴식 후 다시 힘을 얻지만, 과하면 침잠하고 약하면 회복감이 부족해질 수 있습니다.'
    }
  };

  var HEALTH_STATUS_LABEL = {
    veryWeak: '매우 약함',
    weak: '보완 필요',
    balanced: '균형',
    strong: '강함',
    excessive: '과다'
  };

  var HEALTH_STATUS_UI = {
    veryWeak: '기운이 부족하게 해석됩니다. 무리한 관리보다 작고 반복 가능한 회복 루틴이 좋습니다.',
    weak: '보완이 필요한 흐름입니다. 해당 오행을 살리는 생활 습관을 가볍게 더해보세요.',
    balanced: '비교적 균형이 잡힌 상태입니다. 지금의 리듬을 과하게 흔들지 않는 것이 좋습니다.',
    strong: '기운이 강하게 쓰입니다. 장점으로 활용하되 과열되지 않도록 휴식을 함께 배치하세요.',
    excessive: '기운이 과하게 몰린 흐름입니다. 바로 더 밀어붙이기보다 긴장을 덜어내는 루틴이 필요합니다.'
  };

  var HEALTH_GENERATES = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
  var HEALTH_GANJI_ELEMENT = {
    '甲': 'wood', '乙': 'wood', '寅': 'wood', '卯': 'wood', '갑': 'wood', '을': 'wood', '인': 'wood', '묘': 'wood',
    '丙': 'fire', '丁': 'fire', '巳': 'fire', '午': 'fire', '병': 'fire', '정': 'fire', '사': 'fire', '오': 'fire',
    '戊': 'earth', '己': 'earth', '辰': 'earth', '戌': 'earth', '丑': 'earth', '未': 'earth', '무': 'earth', '기': 'earth', '진': 'earth', '술': 'earth', '축': 'earth', '미': 'earth',
    '庚': 'metal', '辛': 'metal', '申': 'metal', '酉': 'metal', '경': 'metal', '신': 'metal', '유': 'metal',
    '壬': 'water', '癸': 'water', '亥': 'water', '子': 'water', '임': 'water', '계': 'water', '해': 'water', '자': 'water'
  };
  var HEALTH_TENSION_RULES = [
    { controller: 'metal', target: 'wood', title: _entertainText("ee_2886_prop_title"), bodySignal: '목·어깨 긴장, 눈 피로, 몸의 유연성 저하로 느껴질 수 있습니다.', mindSignal: '완벽주의와 기준이 강해져 시작 에너지가 위축될 수 있습니다.', carePoint: '기준을 낮추고 가벼운 산책과 스트레칭으로 목(木)의 생장 리듬을 살려주세요.' },
    { controller: 'wood', target: 'earth', title: _entertainText("ee_2887_prop_title"), bodySignal: '계획과 압박이 커지면서 소화 리듬과 생활 중심이 흔들리기 쉽습니다.', mindSignal: '해야 할 일이 많아지고 조급함이 안정감을 밀어낼 수 있습니다.', carePoint: '일정을 줄이고 따뜻하고 단순한 식사로 토(土)의 중심을 먼저 세워주세요.' },
    { controller: 'earth', target: 'water', title: _entertainText("ee_2888_prop_title"), bodySignal: '몸이 무겁고 회복감이 늦게 올라오는 생활 신호가 나타날 수 있습니다.', mindSignal: '걱정과 책임감이 깊은 휴식을 방해할 수 있습니다.', carePoint: '잠들기 전 고민을 정리하고 하체를 따뜻하게 해 수(水)의 회복 리듬을 도와주세요.' },
    { controller: 'water', target: 'fire', title: _entertainText("ee_2889_prop_title"), bodySignal: '활력이 낮아지고 몸이 차분하다 못해 무기력하게 느껴질 수 있습니다.', mindSignal: '생각이 깊어지면서 표현력과 추진력이 줄어들 수 있습니다.', carePoint: '햇빛, 따뜻한 차, 가벼운 리듬 운동으로 화(火)의 온기를 살려주세요.' },
    { controller: 'fire', target: 'metal', title: _entertainText("ee_2890_prop_title"), bodySignal: '열기와 흥분이 올라와 호흡과 정리 리듬이 흐트러지기 쉽습니다.', mindSignal: '감정과 일정이 과열되어 판단이 급해질 수 있습니다.', carePoint: '자극을 줄이고 깊은 호흡과 공간 정리로 금(金)의 차분한 질서를 회복하세요.' }
  ];

  var TEN_GOD_HEALTH_MAP = {
    bigeop: { label: _entertainText("ee_2894_prop_label"), title: '자기 에너지와 경쟁 리듬', coreTheme: '나 자신, 독립성, 경쟁심, 버티는 힘', stressPattern: '비겁이 강하게 작동하면 혼자 버티려는 마음이 강해지고, 몸의 긴장을 늦게 알아차리기 쉽습니다.', bodySignal: '어깨와 턱 주변의 힘, 무리한 활동 후 피로 누적, 휴식 타이밍 지연으로 나타날 수 있습니다.', mindSignal: '도움을 요청하기보다 혼자 해결하려는 마음이 커질 수 있습니다.', carePoint: '오늘은 모든 것을 혼자 처리하려 하지 말고, 역할을 나누는 것이 회복운을 살립니다.', routine: ['도움 요청하기', '어깨 힘 빼기', '혼자만의 부담 줄이기', '이완 중심'] },
    siksang: { label: _entertainText("ee_2895_prop_label"), title: '표현과 배출 리듬', coreTheme: '표현, 창작, 말, 결과물, 배출', stressPattern: '식상이 강하게 작동하면 말과 생각이 많아지고, 에너지가 밖으로 계속 빠져나가기 쉽습니다.', bodySignal: '목의 피로감, 말이 많아진 뒤의 소모감, 식사 리듬의 흔들림으로 느껴질 수 있습니다.', mindSignal: '표현하고 싶은 욕구가 커지지만 동시에 쉽게 지칠 수 있습니다.', carePoint: '오늘은 표현도 좋지만, 말과 콘텐츠 소비량을 줄여 에너지를 회수하는 시간이 필요합니다.', routine: ['말수 줄이는 시간', '콘텐츠 디톡스', '따뜻한 식사', '짧은 기록 후 휴식'] },
    jaeseong: { label: _entertainText("ee_2896_prop_label"), title: '현실 관리와 소모 리듬', coreTheme: '돈, 일, 관리, 책임, 현실 감각', stressPattern: '재성이 강하게 작동하면 처리해야 할 현실 문제가 많아지고, 몸보다 책임감이 앞서기 쉽습니다.', bodySignal: '식사 지연, 복부 긴장, 피로가 쌓였는데도 계속 움직이는 패턴으로 나타날 수 있습니다.', mindSignal: '돈, 일정, 성과, 관리 문제에 마음이 빼앗기기 쉽습니다.', carePoint: '오늘은 현실 문제를 모두 해결하려 하기보다 우선순위를 줄이고 식사 시간을 지키는 것이 좋습니다.', routine: ['우선순위 3개만 정하기', '식사 시간 고정', '돈 걱정 메모 후 닫기', '가벼운 산책'] },
    gwanseong: { label: _entertainText("ee_2897_prop_label"), title: '압박과 질서 리듬', coreTheme: '규칙, 책임, 평가, 직장, 사회적 압박', stressPattern: '관성이 강하게 작동하면 기준과 책임감이 커져 몸이 경직되고 긴장 상태가 이어질 수 있습니다.', bodySignal: '목·어깨 긴장, 얕은 호흡, 일정 압박에 따른 피로감으로 느껴질 수 있습니다.', mindSignal: '실수하면 안 된다는 마음, 평가에 대한 부담이 커질 수 있습니다.', carePoint: '오늘은 완벽한 수행보다 중간 휴식과 호흡을 일정에 넣는 것이 중요합니다.', routine: ['업무 사이 호흡', '일정 사이 여백', '완벽주의 낮추기', '퇴근 후 긴장 이완'] },
    inseong: { label: _entertainText("ee_2898_prop_label"), title: '생각과 보호 리듬', coreTheme: '학습, 생각, 보호, 회복, 내면 안정', stressPattern: '인성이 강하게 작동하면 생각이 많아지고 몸보다 머리가 먼저 피로해지기 쉽습니다.', bodySignal: '오래 앉아 있는 패턴, 수면 전 생각 과다, 몸의 순환감 저하로 느껴질 수 있습니다.', mindSignal: '정보를 더 모아야 안심되는 마음이 커질 수 있습니다.', carePoint: '오늘은 더 알아보는 것보다 몸을 움직여 생각을 순환시키는 것이 회복에 좋습니다.', routine: ['정보 섭취 줄이기', '산책', '잠들기 전 화면 끄기', '생각을 글로 비우기'] }
  };

  var DAY_MASTER_HEALTH_VIEW = {
    '갑': { element: 'wood', title: _entertainText("ee_2902_prop_title"), tendency: '갑목 일간은 앞으로 뻗어나가려는 힘이 강해 목표와 방향성이 컨디션에 큰 영향을 줍니다.', stressSignal: '막힘이 생기면 목·어깨 긴장, 답답함, 조급함으로 생활 신호가 나타나기 쉽습니다.', recoveryKey: '큰 목표를 한 번에 밀어붙이기보다 오늘 할 수 있는 작은 성장 루틴 하나를 정하는 것이 좋습니다.' },
    '을': { element: 'wood', title: _entertainText("ee_2903_prop_title"), tendency: '을목 일간은 환경의 영향을 섬세하게 받으며, 부드럽게 적응할 때 컨디션이 살아납니다.', stressSignal: '관계나 환경의 압박이 커지면 몸이 쉽게 굳고 마음이 예민해질 수 있습니다.', recoveryKey: '부드러운 스트레칭, 자연 이미지, 작은 공간 정리가 회복 리듬을 도와줍니다.' },
    '병': { element: 'fire', title: _entertainText("ee_2904_prop_title"), tendency: '병화 일간은 밝은 에너지와 표현력이 강해 사람과 활동 속에서 기운을 얻기 쉽습니다.', stressSignal: '과열되면 수면 리듬이 흐트러지고 감정이 쉽게 달아오를 수 있습니다.', recoveryKey: '낮에는 햇빛과 활동을 살리고, 밤에는 조명과 자극을 줄이는 균형이 중요합니다.' },
    '정': { element: 'fire', title: _entertainText("ee_2905_prop_title"), tendency: '정화 일간은 감정의 온도와 집중력이 컨디션에 큰 영향을 줍니다.', stressSignal: '마음이 오래 타오르면 피로가 누적되고, 작은 말에도 예민해질 수 있습니다.', recoveryKey: '감정을 억누르기보다 짧게 기록하고 따뜻한 휴식으로 마음의 불빛을 안정시키는 것이 좋습니다.' },
    '무': { element: 'earth', title: _entertainText("ee_2906_prop_title"), tendency: '무토 일간은 버티는 힘이 강하지만, 한 번 무거워지면 회복 속도가 늦어질 수 있습니다.', stressSignal: '책임이 쌓이면 몸이 무겁고 움직임이 둔해지는 생활 신호가 나타날 수 있습니다.', recoveryKey: '일을 더 쌓기보다 한 구역 정리, 따뜻한 식사, 느린 산책으로 중심을 회복하세요.' },
    '기': { element: 'earth', title: _entertainText("ee_2907_prop_title"), tendency: '기토 일간은 섬세하게 돌보고 정리하는 힘이 있지만 걱정이 많아지면 몸의 중심이 흔들리기 쉽습니다.', stressSignal: '생각 과다, 식사 불규칙, 복부 불편감 같은 생활 신호로 나타날 수 있습니다.', recoveryKey: '오늘은 복잡한 고민보다 규칙적인 식사와 단순한 루틴을 먼저 챙기는 것이 좋습니다.' },
    '경': { element: 'metal', title: _entertainText("ee_2908_prop_title"), tendency: '경금 일간은 기준과 결단력이 강해 목표를 향해 밀고 가는 힘이 좋습니다.', stressSignal: '기준이 과해지면 몸이 경직되고 호흡이 얕아지는 느낌이 생길 수 있습니다.', recoveryKey: '완벽하게 자르기보다 부드럽게 내려놓는 연습, 어깨 이완과 깊은 호흡이 필요합니다.' },
    '신': { element: 'metal', title: _entertainText("ee_2909_prop_title"), tendency: '신금 일간은 감각과 기준이 섬세해 작은 변화에도 민감하게 반응할 수 있습니다.', stressSignal: '예민함, 완벽주의, 건조한 환경에 대한 피로감이 생활 신호로 나타날 수 있습니다.', recoveryKey: '공간을 정돈하되 기준을 낮추고, 호흡과 습도 관리로 몸의 여백을 만들어주세요.' },
    '임': { element: 'water', title: _entertainText("ee_2910_prop_title"), tendency: '임수 일간은 생각의 폭이 넓고 흐름을 읽는 힘이 좋지만, 과하면 깊은 생각에 잠기기 쉽습니다.', stressSignal: '밤 시간 고민, 수면 리듬 흔들림, 몸이 무겁게 가라앉는 느낌이 나타날 수 있습니다.', recoveryKey: '생각을 계속 확장하기보다 따뜻한 루틴과 일정한 수면 시간으로 회복감을 채우는 것이 좋습니다.' },
    '계': { element: 'water', title: _entertainText("ee_2911_prop_title"), tendency: '계수 일간은 감수성과 직감이 섬세해 주변 분위기의 영향을 많이 받을 수 있습니다.', stressSignal: '불안, 차가운 느낌, 작은 변화에 대한 피로감이 생활 신호로 나타날 수 있습니다.', recoveryKey: '하체를 따뜻하게 하고, 조용한 음악과 수면 루틴으로 내면의 물결을 안정시키는 것이 좋습니다.' }
  };

  var SEASONAL_HEALTH_VIEW = {
    spring: { label: '봄', mainElement: 'wood', title: _entertainText("ee_2915_prop_title"), tendency: '봄은 목(木)의 생장성이 강해지는 시기입니다. 시작, 계획, 움직임이 늘어나지만 조급함도 함께 올라오기 쉽습니다.', riskWhenExcessive: '계획이 과해지면 목·어깨 긴장, 눈 피로, 감정적 답답함으로 생활 신호가 나타날 수 있습니다.', careElement: ['earth', 'water'], careRoutine: ['계획 줄이기', '따뜻한 식사', '눈 휴식', '가벼운 산책'] },
    summer: { label: _entertainText("ee_2916_prop_label"), mainElement: 'fire', title: '화(火)가 왕성한 계절', tendency: '여름은 화(火)의 활력과 표현력이 강해지는 시기입니다. 활동성과 교류가 늘지만 과열 관리가 필요합니다.', riskWhenExcessive: '흥분과 일정이 과하면 수면 리듬이 흔들리고 피로가 빠르게 누적될 수 있습니다.', careElement: ['water', 'metal'], careRoutine: ['수면 시간 확보', '카페인 줄이기', '호흡', '자극적인 일정 줄이기'] },
    lateSummer: { label: _entertainText("ee_2917_prop_label"), mainElement: 'earth', title: '토(土)가 중심을 잡는 시기', tendency: '환절기는 토(土)의 중심성이 중요해지는 시기입니다. 식사, 수면, 생활 루틴의 안정이 컨디션을 좌우합니다.', riskWhenExcessive: '생각이 많고 몸이 무거워지기 쉬우며, 생활 리듬이 흐트러지면 피로가 커질 수 있습니다.', careElement: ['wood', 'water'], careRoutine: ['규칙적 식사', '방 정리', '느린 산책', '걱정 메모 후 내려놓기'] },
    autumn: { label: _entertainText("ee_2918_prop_label"), mainElement: 'metal', title: '금(金)이 정리되는 계절', tendency: '가을은 금(金)의 수렴성과 정리력이 강해지는 시기입니다. 기준과 판단이 선명해지지만 경직되기 쉽습니다.', riskWhenExcessive: '완벽주의, 건조감, 호흡의 답답함, 목·어깨 긴장이 생활 신호로 나타날 수 있습니다.', careElement: ['water', 'wood'], careRoutine: ['환기와 습도 관리', '호흡', '기준 낮추기', '부드러운 스트레칭'] },
    winter: { label: _entertainText("ee_2919_prop_label"), mainElement: 'water', title: '수(水)가 저장되는 계절', tendency: '겨울은 수(水)의 저장성과 회복력이 중요해지는 시기입니다. 깊은 휴식이 필요하지만 침잠도 쉬워집니다.', riskWhenExcessive: '생각이 깊어지고 몸이 무겁게 느껴질 수 있으며, 수면 리듬이 흔들리면 회복감이 줄어들 수 있습니다.', careElement: ['fire', 'earth'], careRoutine: ['하체 보온', '따뜻한 식사', '햇빛 보기', '수면 루틴 고정'] }
  };

  var HEALTH_REPORT_DISCLAIMER = '명리학적 관점에서 오행 균형, 생활 리듬, 컨디션 흐름을 살핀 운세 콘텐츠입니다. 의학적 진단이나 치료를 대체하지 않으며, 실제 건강 문제가 있거나 지속적인 통증·불편감이 있다면 반드시 전문 의료진과 상담하세요.';

  function escapeHealthHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function getElementStatus(score) {
    score = Number(score);
    if (!isFinite(score)) score = 20;
    if (score < 30) return 'veryWeak';
    if (score < 45) return 'weak';
    if (score <= 70) return 'balanced';
    if (score <= 85) return 'strong';
    return 'excessive';
  }

  function getHealthKnowledge(el) {
    return HEALTH_ELEMENT_KNOWLEDGE[el] || HEALTH_ELEMENT_KNOWLEDGE.earth;
  }

  function getHealthKnowledgeMessage(el, status) {
    var knowledge = getHealthKnowledge(el);
    if (status === 'veryWeak' || status === 'weak') return knowledge.weakMessage;
    if (status === 'strong' || status === 'excessive') return knowledge.excessiveMessage;
    return knowledge.balancedMessage;
  }

  function getHealthKnowledgeSignals(el, status) {
    var knowledge = getHealthKnowledge(el);
    if (status === 'veryWeak' || status === 'weak') return knowledge.weakSignals || [];
    if (status === 'strong' || status === 'excessive') return knowledge.excessSignals || [];
    return (knowledge.excessSignals || []).slice(0, 2).concat((knowledge.weakSignals || []).slice(0, 1));
  }

  function renderHealthMiniList(items, limit) {
    return '<ul class="cd-health-mini-list">'
      + (items || []).filter(Boolean).slice(0, limit || 3).map(function (item) {
        return '<li>' + escapeHealthHtml(item) + '</li>';
      }).join('')
      + '</ul>';
  }

  function renderHealthChipList(items, limit) {
    return '<div class="cd-health-chip-row">'
      + (items || []).filter(Boolean).slice(0, limit || 4).map(function (item) {
        return '<span>' + escapeHealthHtml(item) + '</span>';
      }).join('')
      + '</div>';
  }

  function findHealthTensionRule(controller, target) {
    return (HEALTH_TENSION_RULES || []).filter(function (rule) {
      return rule.controller === controller && rule.target === target;
    })[0] || null;
  }

  function getHealthDayStem(p, natal) {
    var sources = [p || {}, natal || {}];
    var candidates = [
      sources[0].dayStem,
      sources[0].dayGan,
      sources[0].dayMaster,
      sources[0].d && sources[0].d.g,
      sources[0].d && sources[0].d.gan,
      sources[0].day && sources[0].day.gan,
      sources[0].day && sources[0].day.stem,
      sources[0].pillars && sources[0].pillars.day && sources[0].pillars.day.stem,
      sources[0].saju && sources[0].saju.day && sources[0].saju.day.stem,
      sources[0].bazi && sources[0].bazi.day && sources[0].bazi.day.stem,
      sources[1].dayStem,
      sources[1].dayGan,
      sources[1].dayMaster,
      sources[1].d && sources[1].d.g,
      sources[1].d && sources[1].d.gan,
      sources[1].day && sources[1].day.gan,
      sources[1].day && sources[1].day.stem,
      sources[1].pillars && sources[1].pillars.day && sources[1].pillars.day.stem,
      sources[1].saju && sources[1].saju.day && sources[1].saju.day.stem,
      sources[1].bazi && sources[1].bazi.day && sources[1].bazi.day.stem
    ];
    try {
      if (w.G_BAZI && typeof w.G_BAZI.getDayGan === 'function') candidates.push(w.G_BAZI.getDayGan());
    } catch (_) {}
    var stemAlias = { '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무', '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계' };
    for (var i = 0; i < candidates.length; i++) {
      var raw = candidates[i];
      if (!raw) continue;
      if (typeof raw === 'object') raw = raw.ko || raw.name || raw.stem || raw.gan || raw.label;
      raw = String(raw);
      var keys = Object.keys(DAY_MASTER_HEALTH_VIEW);
      for (var k = 0; k < keys.length; k++) {
        if (raw.indexOf(keys[k]) !== -1) return keys[k];
      }
      var aliasKeys = Object.keys(stemAlias);
      for (var a = 0; a < aliasKeys.length; a++) {
        if (raw.indexOf(aliasKeys[a]) !== -1) return stemAlias[aliasKeys[a]];
      }
    }
    return '';
  }

  function getHealthDayMasterElement(p, natal, fallbackEl) {
    var stem = getHealthDayStem(p, natal);
    var view = stem ? DAY_MASTER_HEALTH_VIEW[stem] : null;
    return {
      stem: stem,
      element: (view && view.element) || fallbackEl || 'earth',
      label: stem ? stem + ' 일간' : '일간 리듬'
    };
  }

  function getHealthDayMasterHeroCopy(dayMaster) {
    dayMaster = dayMaster || {};
    var view = dayMaster.stem ? DAY_MASTER_HEALTH_VIEW[dayMaster.stem] : null;
    var knowledge = getHealthKnowledge(dayMaster.element || 'earth');
    return {
      title: (view && view.title) || ((EL_NAME[dayMaster.element] || '토(土)') + ' 회복 리듬'),
      body: (view && view.tendency) || ((EL_NAME[dayMaster.element] || '토(土)') + '의 기운이 몸의 회복 결에 은은하게 머무릅니다.'),
      key: (view && view.recoveryKey) || ((knowledge.recoveryFocus || [])[0] || '몸의 속도를 먼저 살피는 루틴이 좋습니다.')
    };
  }

  function normalizeTenGodKey(key) {
    key = String(key || '').toLowerCase();
    if (key.indexOf('비겁') !== -1 || key.indexOf('big') !== -1 || key.indexOf('bigeop') !== -1 || key.indexOf('bijian') !== -1) return 'bigeop';
    if (key.indexOf('식상') !== -1 || key.indexOf('식신') !== -1 || key.indexOf('상관') !== -1 || key.indexOf('sik') !== -1) return 'siksang';
    if (key.indexOf('재성') !== -1 || key.indexOf('재') !== -1 || key.indexOf('jae') !== -1 || key.indexOf('wealth') !== -1) return 'jaeseong';
    if (key.indexOf('관성') !== -1 || key.indexOf('관') !== -1 || key.indexOf('gwan') !== -1 || key.indexOf('officer') !== -1) return 'gwanseong';
    if (key.indexOf('인성') !== -1 || key.indexOf('인') !== -1 || key.indexOf('in') !== -1 || key.indexOf('resource') !== -1) return 'inseong';
    return '';
  }

  function collectTenGodScores(source, scores) {
    if (!source || typeof source !== 'object') return;
    Object.keys(source).forEach(function (key) {
      var group = normalizeTenGodKey(key);
      if (!group) return;
      var value = source[key];
      if (value && typeof value === 'object') value = value.score || value.count || value.value || value.total;
      value = Number(value);
      if (!isFinite(value)) value = 1;
      scores[group] = (scores[group] || 0) + value;
    });
  }

  function getHealthTenGodGroups(p, natal, ratios, controlImpacts) {
    var scores = {};
    [p && p.tenGods, p && p.tenGod, p && p.tengods, p && p.vibe, natal && natal.tenGods, natal && natal.tenGod, natal && natal.tengods, natal && natal.vibe].forEach(function (src) {
      collectTenGodScores(src, scores);
    });
    var groups = Object.keys(scores).filter(function (key) { return TEN_GOD_HEALTH_MAP[key]; })
      .sort(function (a, b) { return scores[b] - scores[a]; });
    if (!groups.length) {
      if (controlImpacts && controlImpacts.length) groups.push('gwanseong');
      var strongest = HEALTH_ELEMENT_ORDER.slice().sort(function (a, b) { return Number(ratios[b] || 0) - Number(ratios[a] || 0); })[0] || 'earth';
      groups.push(({ wood: 'siksang', fire: 'jaeseong', earth: 'jaeseong', metal: 'gwanseong', water: 'inseong' })[strongest] || 'inseong');
    }
    if (groups.indexOf('inseong') === -1) groups.push('inseong');
    return groups.filter(function (group, idx, arr) { return arr.indexOf(group) === idx; }).slice(0, 3);
  }

  function getSeasonHealthKey(johu) {
    if (johu && (johu.type === 'hot' || johu.type === 'warm')) return 'summer';
    if (johu && (johu.type === 'cold' || johu.type === 'cool')) return 'winter';
    var month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month === 9) return 'lateSummer';
    if (month >= 10 && month <= 11) return 'autumn';
    return 'winter';
  }

  function getHealthElementFromToken(value) {
    if (value == null) return '';
    if (typeof value === 'object') value = value.element || value.e || value.ko || value.name || value.stem || value.branch || value.gan || value.zhi || value.label || '';
    value = String(value).trim();
    if (!value) return '';
    var lower = value.toLowerCase();
    if (HEALTH_ELEMENT_ORDER.indexOf(lower) !== -1) return lower;
    if (lower.indexOf('wood') !== -1) return 'wood';
    if (lower.indexOf('fire') !== -1) return 'fire';
    if (lower.indexOf('earth') !== -1 || lower.indexOf('soil') !== -1) return 'earth';
    if (lower.indexOf('metal') !== -1 || lower.indexOf('gold') !== -1) return 'metal';
    if (lower.indexOf('water') !== -1) return 'water';
    for (var key in HEALTH_GANJI_ELEMENT) {
      if (Object.prototype.hasOwnProperty.call(HEALTH_GANJI_ELEMENT, key) && value.indexOf(key) !== -1) return HEALTH_GANJI_ELEMENT[key];
    }
    return '';
  }

  function collectHealthElementList(source, out, depth) {
    out = out || [];
    if (source == null || depth > 4) return out;
    if (typeof source === 'string' || typeof source === 'number' || typeof source === 'boolean') {
      var directEl = getHealthElementFromToken(source);
      if (directEl && out.indexOf(directEl) === -1) out.push(directEl);
      return out;
    }
    if (Array.isArray(source)) {
      source.forEach(function (item) { collectHealthElementList(item, out, depth + 1); });
      return out;
    }
    if (typeof source !== 'object') return out;
    var picked = getHealthElementFromToken(source.element || source.e || source.el || source.name || source.label || source.value || source.gan || source.stem || source.target || '');
    if (picked && out.indexOf(picked) === -1) out.push(picked);
    Object.keys(source).forEach(function (key) {
      var keyEl = getHealthElementFromToken(key);
      if (keyEl && source[key] && out.indexOf(keyEl) === -1) out.push(keyEl);
      if (/yong|use|support|need|favor|target|kiji|avoid|unfavor|excess|dominant|par|element|johu|choyong|weak|strong|control|drain/i.test(key)) {
        collectHealthElementList(source[key], out, depth + 1);
      }
    });
    return out;
  }

  function addHealthElementCount(counts, el, amount) {
    if (!el || HEALTH_ELEMENT_ORDER.indexOf(el) === -1) return;
    amount = Number(amount);
    if (!isFinite(amount) || amount <= 0) amount = 1;
    counts[el] = (counts[el] || 0) + amount;
  }

  function collectHealthElementCounts(source, counts, depth) {
    if (!source || depth > 5) return;
    if (typeof source === 'string') {
      addHealthElementCount(counts, getHealthElementFromToken(source), 1);
      return;
    }
    if (Array.isArray(source)) {
      source.forEach(function (item) { collectHealthElementCounts(item, counts, depth + 1); });
      return;
    }
    if (typeof source !== 'object') return;
    Object.keys(source).forEach(function (key) {
      var value = source[key];
      var keyEl = getHealthElementFromToken(key);
      if (keyEl && typeof value === 'number') {
        addHealthElementCount(counts, keyEl, value);
        return;
      }
      if (/^(element|e|stem|branch|gan|zhi|g|z|dayStem|dayGan|dayMaster|monthBranch|monthStem|yearStem|yearBranch|hourStem|hourBranch)$/i.test(key)) {
        addHealthElementCount(counts, getHealthElementFromToken(value), 1);
        return;
      }
      if (/pillar|pillars|saju|bazi|year|month|day|hour|birth|four/i.test(key)) {
        collectHealthElementCounts(value, counts, depth + 1);
      }
    });
  }

  function getHealthRatios(natal, profile) {
    var src = (natal && (natal.ratios || natal.fiveElementRatios || natal.elementRatios)) || {};
    var ratios = {};
    var hasRatio = false;
    HEALTH_ELEMENT_ORDER.forEach(function (el) {
      var value = Number(src[el]);
      if (isFinite(value) && value > 0) hasRatio = true;
      ratios[el] = isFinite(value) ? value : 0;
    });
    if (hasRatio) {
      var ratioTotal = HEALTH_ELEMENT_ORDER.reduce(function (sum, el) { return sum + Number(ratios[el] || 0); }, 0);
      if (ratioTotal > 0 && Math.abs(ratioTotal - 100) > 1) {
        HEALTH_ELEMENT_ORDER.forEach(function (el) {
          ratios[el] = Math.round((Number(ratios[el] || 0) / ratioTotal) * 1000) / 10;
        });
      }
      return ratios;
    }
    var counts = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    [
      natal && natal.elements,
      natal && natal.fiveElements,
      natal && natal.elementCounts,
      natal && natal.pillars,
      natal && natal.saju,
      natal && natal.bazi,
      profile && profile.pillars,
      profile && profile.saju,
      profile && profile.bazi,
      profile
    ].forEach(function (source) { collectHealthElementCounts(source, counts, 0); });
    var total = HEALTH_ELEMENT_ORDER.reduce(function (sum, el) { return sum + Number(counts[el] || 0); }, 0);
    if (total > 0) {
      HEALTH_ELEMENT_ORDER.forEach(function (el) {
        ratios[el] = Math.max(4, Math.round((Number(counts[el] || 0) / total) * 1000) / 10);
      });
      var adjustedTotal = HEALTH_ELEMENT_ORDER.reduce(function (sum, el) { return sum + Number(ratios[el] || 0); }, 0);
      if (adjustedTotal > 0) {
        HEALTH_ELEMENT_ORDER.forEach(function (el) {
          ratios[el] = Math.round((Number(ratios[el] || 0) / adjustedTotal) * 1000) / 10;
        });
      }
      return ratios;
    }
    HEALTH_ELEMENT_ORDER.forEach(function (el) { ratios[el] = 20; });
    return ratios;
  }

  function getHealthFallbackTodayElement() {
    try {
      var now = new Date();
      var todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
      var refUtc = Date.UTC(2000, 0, 1);
      var days = Math.floor((todayUtc - refUtc) / 86400000);
      var stemIndex = ((6 + days) % 10 + 10) % 10;
      return ['wood', 'wood', 'fire', 'fire', 'earth', 'earth', 'metal', 'metal', 'water', 'water'][stemIndex] || '';
    } catch (_) {
      return '';
    }
  }

  function getTodayHealthElement() {
    try {
      if (w.G_BAZI && typeof w.G_BAZI.getDayGan === 'function') {
        var gan = w.G_BAZI.getDayGan();
        return (w.GAN && w.GAN[gan] && w.GAN[gan].e) || getHealthElementFromToken(gan) || null;
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
      yongshinList = collectHealthElementList([jg.dominant, jg.parEl, jg.element, jg.targetElement, jg.yongshin, jg.support]);
      kijishinList = collectHealthElementList([HEALTH_CONTROL_REL[jg.dominant], (w.SHENG && w.SHENG[jg.dominant]), jg.kijishin, jg.avoid, jg.control]);
    } else if (pw) {
      yongshinList = collectHealthElementList([pw.yongshin, pw.yongsin, pw.useful, pw.support, pw.need, pw.favorable, pw.target, pw.targetEl, pw.targetElement]);
      kijishinList = collectHealthElementList([pw.kijishin, pw.avoid, pw.unfavorable, pw.excess, pw.bad, pw.caution, pw.avoidEl, pw.avoidElement]);
    }
    yongshinList = yongshinList.filter(function (el, idx, arr) { return HEALTH_ELEMENT_ORDER.indexOf(el) !== -1 && arr.indexOf(el) === idx; });
    kijishinList = kijishinList.filter(function (el, idx, arr) { return HEALTH_ELEMENT_ORDER.indexOf(el) !== -1 && arr.indexOf(el) === idx; });

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

  function getHealthStateBrief(state) {
    if (state === 'excess') return '기운이 빠르게 올라오는 흐름';
    if (state === 'deficient') return '천천히 채워야 하는 흐름';
    if (state === 'pressure') return '외부 자극에 눌리는 흐름';
    return '무난하게 이어지는 흐름';
  }

  function getHealthElementKeyword(el) {
    return ({
      wood: '회복 리듬 / 긴장 완화',
      fire: '활력 / 순환감',
      earth: '소화 / 안정감',
      metal: '호흡 / 목·어깨 정돈',
      water: '수면 / 회복력'
    })[el] || '생활 리듬 / 균형';
  }

  // 오행 5색(五色) — 목=청 / 화=적 / 토=황 / 금=백 / 수=흑.
  // 크롬은 연이 브랜드가 쓰고, 데이터(균형 막대·장부 다이얼·칩)만 이 도메인 색으로 칠한다.
  // 백(금)은 크림 배경에서 소실되므로 강철 그레이로, 흑(수)은 심청으로 내려 성립시켰다.
  // 괄호 안은 배경 #fffaf7 대비 실측 명암비 — 전부 본문 기준 4.5:1 을 넘긴다(막대는 3:1만 필요).
  var HEALTH_HEALING_ELEMENT_UI = {
    wood: { color: '#1F6F5C', soft: 'rgba(31,111,92,.10)', border: 'rgba(31,111,92,.34)' },   // 청 5.81:1
    fire: { color: '#C43D1E', soft: 'rgba(196,61,30,.10)', border: 'rgba(196,61,30,.32)' },   // 적 5.03:1
    earth: { color: '#8A6212', soft: 'rgba(138,98,18,.11)', border: 'rgba(138,98,18,.32)' },  // 황 5.28:1
    metal: { color: '#4A5A68', soft: 'rgba(74,90,104,.10)', border: 'rgba(74,90,104,.32)' },  // 백 6.86:1
    water: { color: '#1C3A5E', soft: 'rgba(28,58,94,.09)', border: 'rgba(28,58,94,.30)' }     // 흑 11.16:1
  };

  function getHealthHealingElementUi(el) {
    return HEALTH_HEALING_ELEMENT_UI[el] || HEALTH_HEALING_ELEMENT_UI.earth;
  }

  // 오행 색은 노드가 심고 CSS 는 --health-el-* 만 읽는다.
  // 시트가 리터럴 색을 갖지 않아야 팔레트를 한 곳(HEALTH_HEALING_ELEMENT_UI)에서 바꿀 수 있다.
  function healthElVars(el) {
    var ui = getHealthHealingElementUi(el);
    return ' style="--health-el-color:' + ui.color + ';--health-el-soft:' + ui.soft + ';--health-el-border:' + ui.border + '"';
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
    if (pressureCount >= 2) return { label: _entertainText("ee_3404_prop_label"), body: '압박받는 축이 겹쳐 오늘은 회복 루틴을 먼저 배치하면 좋습니다.' };
    if (pressureCount || excessCount >= 2) return { label: _entertainText("ee_3405_prop_label"), body: '강한 기운이 빠르게 올라올 수 있어 자극을 낮추는 하루가 어울립니다.' };
    return { label: _entertainText("ee_3406_prop_label"), body: '큰 흔들림보다 작은 리듬을 유지하는 쪽이 컨디션을 살립니다.' };
  }

  // 소제목은 표면을 갖지 않는다. 카드는 챕터(.cd-health-chapter)와 데이터 카드 두 계층뿐이고,
  // 그 사이에 같은 색 카드를 한 겹 더 끼우면 "카드가 겹쳐 보이는" 문제가 그대로 돌아온다.
  function renderHealthSection(title, summary, bodyHtml) {
    return '<section class="cd-health-section">'
      + '<div class="cd-health-section-head">'
      + '<h4>' + title + '</h4>'
      + '<p>' + summary + '</p>'
      + '</div>'
      + bodyHtml
      + '</section>';
  }

  // 챕터 — 리포트에서 카드 표면을 갖는 유일한 계층. 앞의 두 개만 펼친 채 시작한다.
  // 접힌 챕터는 안에 든 소제목을 목차로 보여 준다. 유료 콘텐츠라 접었다는 이유로
  // 분량이 줄어 보이면 안 되고, 무엇이 들어 있는지 알아야 펼칠지 판단할 수 있다.
  // 목차는 bodyHtml 에서 뽑는다 — 제목을 두 번 적으면 언젠가 어긋난다.
  function renderHealthChapter(title, lede, bodyHtml, open) {
    var toc = (bodyHtml.match(/<h4>([^<]*)<\/h4>/g) || []).map(function (h) {
      return h.replace(/<\/?h4>/g, '');
    });
    return '<details class="cd-health-chapter"' + (open ? ' open' : '') + '>'
      + '<summary class="cd-health-chapter__head">'
      + '<span>'
      + '<span class="cd-health-chapter__title">' + escapeHealthHtml(title) + '</span>'
      + '<span class="cd-health-chapter__lede">' + escapeHealthHtml(lede) + '</span>'
      + (toc.length ? '<span class="cd-health-chapter__toc">' + toc.join(' · ') + '</span>' : '')
      + '</span>'
      + '<span class="cd-health-chapter__chev" aria-hidden="true"></span>'
      + '</summary>'
      + '<div class="cd-health-chapter__body">' + bodyHtml + '</div>'
      + '</details>';
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
        excess: ['열감, 초조함, 수면 얕아짐이 생활 신호로 느껴지기 쉽습니다.', '열감과 자극이 커지지 않도록 흥분도를 낮추는 쪽으로 균형을 잡으세요.'],
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
      wood: '회복력, 성장성, 추진력, 근육 긴장 완화와 시작 에너지가 강점으로 쓰이는 축입니다.',
      fire: '활력, 순환감, 표현력, 따뜻한 움직임의 리듬이 살아나기 쉬운 축입니다.',
      earth: '소화 리듬, 중심감, 안정성, 회복 기반을 받쳐주는 축입니다.',
      metal: '호흡, 피부 컨디션, 정리력과 여백의 감각이 선명해지기 쉬운 축입니다.',
      water: '수면, 회복, 저장 에너지, 깊은 휴식감을 담당하는 축입니다.'
    })[el] || '생활 리듬의 균형을 받쳐주는 축입니다.';
  }

  function getHealthElementSupportCopy(el) {
    return ({
      wood: '목(木)이 약해지면 회복 방향을 잡기 어렵고 긴장이 쌓이기 쉽습니다. 가벼운 산책과 호흡으로 생장 리듬을 부드럽게 열어주세요.',
      fire: '화(火)가 약해지면 활력과 순환감이 둔해질 수 있습니다. 무리한 자극보다 따뜻한 휴식과 일정한 수면 리듬이 어울립니다.',
      earth: '토(土)가 약해지면 식후 피로, 소화 부담, 복부 냉감, 기력 저하가 생활 신호로 나타나기 쉽습니다. 따뜻한 식사와 규칙적인 식사 시간이 중심입니다.',
      metal: '금(金)이 약해지면 건조감, 얕은 호흡, 정리 리듬의 흐림이 생활 신호로 나타나기 쉽습니다. 습도, 수분, 호흡, 정돈된 환경을 챙기세요.',
      water: '수(水)가 약해지면 피로 누적, 수면 질 저하, 긴장성 건조감이 생활 신호로 나타나기 쉽습니다. 밤 시간 자극을 줄이고 깊은 휴식 여백을 확보하세요.'
    })[el] || '부족한 축은 강하게 밀어붙이기보다 반복 가능한 생활 균형으로 보완하는 편이 좋습니다.';
  }

  function getHealthSignalGuideV2(el, state) {
    var guide = {
      wood: {
        excess: ['목(木)이 강하게 쓰이면 생각과 계획이 먼저 달리고, 몸은 목·어깨 긴장이나 눈 피로로 따라오기 쉽습니다.', '오늘은 일을 더 벌리기보다 이미 잡은 계획을 덜어내세요. 산책, 목·어깨 이완, 화면 쉬는 시간이 목의 답답함을 풀어줍니다.'],
        deficient: ['목(木)이 약하면 시작은 해야 하는데 몸이 잘 움직이지 않고, 회복 루틴도 자꾸 미뤄질 수 있습니다.', '큰 운동보다 10분 산책, 가벼운 스트레칭, 푸른 채소 한 접시처럼 시작이 쉬운 방법이 잘 맞습니다.'],
        pressure: ['목(木)이 눌리는 날에는 기준이나 일정 압박 때문에 몸의 유연성이 먼저 떨어집니다.', '완벽하게 하려는 마음을 낮추고, 오늘 해야 할 일을 하나 줄이세요. 몸을 풀어야 마음도 따라 풀립니다.'],
        stable: ['목(木)이 크게 흔들리지 않아 움직임을 시작하기 좋은 날입니다.', '다만 무리하게 속도를 올리면 긴장이 쌓이니, 할 일을 작게 나누고 중간에 몸을 풀어주세요.']
      },
      fire: {
        excess: ['화(火)가 강하면 집중과 표현력은 살아나지만, 열감과 조급함이 빨리 올라올 수 있습니다.', '오후 이후 카페인, 늦은 운동, 강한 화면 자극을 줄이세요. 오늘은 잘 타오르는 만큼 잘 식히는 것이 중요합니다.'],
        deficient: ['화(火)가 약하면 의욕은 있어도 몸의 온기와 활력이 늦게 올라옵니다.', '아침 햇빛, 따뜻한 식사, 가벼운 유산소가 좋습니다. 억지로 끌어올리기보다 몸에 온기를 먼저 넣어주세요.'],
        pressure: ['화(火)가 눌리면 마음은 바쁜데 집중력이 오래 가지 않고, 밤에는 오히려 피곤한데 잠이 얕아질 수 있습니다.', '일정 사이에 숨 쉴 간격을 두고, 저녁에는 조명과 소리를 낮춰 몸이 식을 시간을 주세요.'],
        stable: ['화(火)가 무난하면 활력과 표현력이 자연스럽게 살아납니다.', '활동량을 잘 쓰되, 약속이 많은 날에는 귀가 후 바로 쉬는 시간을 붙이면 좋습니다.']
      },
      earth: {
        excess: ['토(土)가 과하면 몸과 생각이 함께 무거워지고, 식후 졸림이나 더부룩함이 쉽게 느껴집니다.', '오늘은 많이 챙겨 먹는 것보다 단순하게 먹는 것이 낫습니다. 오래 앉아 있었다면 식후 10분만 걸어도 도움이 됩니다.'],
        deficient: ['토(土)가 약하면 식사 시간이 밀리고, 먹어도 기운이 바로 차오르지 않는 느낌이 올 수 있습니다.', '따뜻한 밥, 죽, 익힌 채소처럼 속이 편한 음식을 먼저 두세요. 오늘은 식사 시간을 지키는 것이 가장 큰 보완입니다.'],
        pressure: ['토(土)가 눌리면 해야 할 일과 걱정이 소화 리듬을 흔들 수 있습니다.', '식사를 미루지 말고 한 끼는 단순하게 드세요. 책상이나 방 한 구역을 정리하면 마음의 무게도 조금 내려갑니다.'],
        stable: ['토(土)가 안정되면 하루의 중심이 잘 잡힙니다.', '같은 시간에 먹고, 식후에 가볍게 움직이고, 잠들기 전 걱정을 적어두면 안정감이 오래 갑니다.']
      },
      metal: {
        excess: ['금(金)이 강하면 판단력은 또렷하지만, 기준이 높아져 어깨와 흉곽에 힘이 들어가기 쉽습니다.', '오늘은 100점 기준을 내려놓는 것이 보완입니다. 깊은 호흡, 환기, 책상 위 한 구역 정리가 금의 긴장을 낮춥니다.'],
        deficient: ['금(金)이 약하면 호흡이 얕아지고, 공간과 일정의 경계가 흐려질 수 있습니다.', '물을 조금씩 마시고 실내를 환기하세요. 작게 정리한 공간 하나가 몸의 여백을 만들어줍니다.'],
        pressure: ['금(金)이 눌리면 과로와 열감 때문에 호흡, 피부 컨디션, 집중력이 예민해질 수 있습니다.', '말을 줄이고 숨을 길게 쉬세요. 오늘은 판단을 서두르기보다 몸의 긴장을 먼저 풀어야 합니다.'],
        stable: ['금(金)이 안정되면 정리력과 호흡이 비교적 편안합니다.', '건조함만 방치하지 말고, 수분과 습도, 환기를 챙기면 집중력이 차분히 유지됩니다.']
      },
      water: {
        excess: ['수(水)가 과하면 생각이 깊어지고 몸의 속도가 느려져, 시작까지 시간이 걸릴 수 있습니다.', '완전히 누워 있기보다 짧게 걷고 따뜻한 물을 마시세요. 몸을 조금 데우면 무거움이 덜합니다.'],
        deficient: ['수(水)가 약하면 잠을 자도 개운함이 부족하고, 밤 시간에 걱정이 길어질 수 있습니다.', '오늘은 과로를 줄이고 수면 시간을 먼저 잡으세요. 하체를 따뜻하게 하고 늦은 화면 사용을 끊는 것이 좋습니다.'],
        pressure: ['수(水)가 눌리면 회복감이 늦게 올라오고, 피로가 몸 안에 오래 머무는 느낌이 날 수 있습니다.', '무리한 일정을 더 넣지 마세요. 오늘은 쉬는 시간을 일정표 안에 먼저 넣어야 합니다.'],
        stable: ['수(水)가 안정되면 깊게 쉬고 다시 채우는 힘이 좋습니다.', '밤 시간의 화면, 소음, 감정 소모만 줄여도 다음 날 회복감이 훨씬 좋습니다.']
      }
    };
    return ((guide[el] || guide.earth)[state]) || guide.earth.stable;
  }

  function getTodayConditionCopyV2(todayEl, targetEl, avoidEl, strongestEl) {
    var lead = {
      wood: '오늘은 마음이 먼저 움직이고 몸이 뒤따라오는 날입니다. 일정은 조금 줄이고, 목과 어깨를 자주 풀어주는 편이 좋습니다.',
      fire: '오늘은 에너지가 빨리 올라오지만 그만큼 쉽게 지칠 수 있습니다. 낮에는 햇빛을 받고, 밤에는 자극을 덜어내세요.',
      earth: '오늘은 식사와 휴식 시간이 컨디션을 크게 좌우합니다. 따뜻하고 단순한 한 끼를 제때 먹는 것이 가장 좋습니다.',
      metal: '오늘은 기준이 높아지면서 호흡이 얕아지기 쉽습니다. 완벽하게 정리하려 하기보다 숨을 깊게 쉬는 쪽이 먼저입니다.',
      water: '오늘은 무리해서 버티기보다 회복 시간을 확보해야 합니다. 밤 시간을 차분하게 정리하면 내일 몸이 훨씬 가볍습니다.'
    }[todayEl] || '오늘은 크게 무리하기보다 식사, 수면, 움직임의 기본을 차분히 맞추는 편이 좋습니다.';

    var second = '오늘의 억부는 ' + EL_NAME[targetEl] + '을 먼저 챙기고, ' + EL_NAME[avoidEl] + '의 자극은 저녁부터 낮추라고 가리킵니다.';
    if (todayEl === strongestEl) {
      second = '타고난 강점과 오늘의 일진이 겹칩니다. 익숙한 방식으로 계속 밀어붙이기 쉬우니, 일정 사이에 쉬는 칸을 먼저 남겨두세요.';
    } else if (todayEl === targetEl) {
      second = '오늘 필요한 오행과 일진이 맞물립니다. 거창한 관리보다 물, 식사, 산책처럼 바로 손이 가는 루틴 하나가 몸에 잘 맞습니다.';
    } else if (todayEl === avoidEl) {
      second = '오늘은 과해지기 쉬운 오행이 일진과 함께 올라옵니다. 약속을 줄이고 밤 시간 화면, 카페인, 감정 소모를 낮추세요.';
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
      second = '타고난 강점 축과 일진의 흐름이 겹치므로 속도를 높이기보다 회복 루틴의 우선순위를 낮고 단순하게 잡는 것이 핵심입니다.';
    } else if (todayEl === targetEl) {
      second = '일진의 흐름이 보완축과 맞물리므로 작은 루틴을 바로 실행하면 회복감이 빠르게 붙습니다.';
    } else if (todayEl === avoidEl) {
      second = '오늘은 줄여야 할 기운이 함께 올라오므로 자극을 덜고 회복 루틴을 먼저 배치하세요.';
    }
    return { lead: lead, second: second };
  }

  function renderHealthInfoCard(label, value, body, el) {
    return '<div class="cd-health-info"' + (el ? healthElVars(el) : '') + '>'
      + '<div class="cd-health-info-label">' + label + '</div>'
      + '<div class="cd-health-info-value">' + value + '</div>'
      + '<p>' + body + '</p>'
      + '</div>';
  }

  function renderHealthFoodList(targetEl) {
    var sourceFoods = (HEALTH_FOOD_PLAN[targetEl] || HEALTH_FOOD_PLAN.earth || []);
    var foods = sourceFoods.filter(Boolean).slice(0, 5);
    if (!foods.length) foods = HEALTH_DEFAULT_FOOD_PLAN.slice(0, 5);
    return foods.map(function (food, idx) {
      var foodEl = food.element || targetEl;
      return '<li class="cd-health-food"' + healthElVars(foodEl) + '>'
        + '<div class="cd-health-food-head">'
        + '<span class="cd-health-food-no">' + (idx + 1) + '</span>'
        + '<span>'
        + '<b class="cd-health-food-name">' + escapeHealthHtml(food.name) + '</b>'
        + '<span class="cd-health-chip-row"><span>보완 오행: ' + escapeHealthHtml(EL_NAME[foodEl] || EL_NAME[targetEl]) + '</span></span>'
        + '</span>'
        + '</div>'
        + '<p><b class="cd-health-lede">추천 이유:</b> ' + escapeHealthHtml(food.reason) + '</p>'
        + '<p><b class="cd-health-lede">오늘 먹는 팁:</b> ' + escapeHealthHtml(food.tip || '과식하지 말고 따뜻하고 담백하게 드세요.') + '</p>'
        + '</li>';
    }).join('');
  }

  function getHealthElementConsultation(el, state) {
    var byElement = {
      wood: {
        excess: '목(木)이 강하게 쓰이는 날에는 계획과 추진력이 먼저 앞섭니다. 다만 몸은 목·어깨 긴장, 눈 피로, 예민함으로 신호를 보낼 수 있으니 오늘은 일을 늘리기보다 덜어내는 쪽이 맞습니다.',
        deficient: '목(木)이 약하면 시작 에너지가 늦게 올라오고 회복 루틴도 쉽게 미뤄집니다. 이럴 때는 강한 결심보다 산책, 스트레칭, 초록 식재료처럼 몸이 바로 받아들이는 방법이 좋습니다.',
        pressure: '목(木)이 눌리면 계획은 많은데 몸이 굳고 답답함이 먼저 옵니다. 기준을 낮추고 목·어깨를 풀어야 마음의 조급함도 함께 내려갑니다.',
        stable: '목(木)이 안정권에 있으면 움직임을 시작하기 좋습니다. 다만 추진력이 과해지지 않도록 중간 휴식과 눈 쉬는 시간을 넣어주세요.'
      },
      fire: {
        excess: '화(火)가 강하면 활력과 표현력은 좋지만, 열감과 조급함이 쉽게 올라옵니다. 낮의 활동은 살리되 저녁에는 조명, 화면, 카페인 같은 자극을 줄여야 수면이 편해집니다.',
        deficient: '화(火)가 약하면 의욕과 온기가 늦게 살아납니다. 햇빛을 보고, 따뜻하게 먹고, 짧게 움직이는 식으로 몸의 불씨를 천천히 살리는 편이 좋습니다.',
        pressure: '화(火)가 눌리는 날에는 마음만 바쁘고 몸은 쉽게 지칩니다. 일정 사이에 쉬는 시간을 넣어야 열감과 피로가 한꺼번에 쌓이지 않습니다.',
        stable: '화(火)가 무난하면 활동성과 표현력이 자연스럽게 살아납니다. 다만 활동 뒤 바로 쉬는 간격을 붙여야 활력이 오래 갑니다.'
      },
      earth: {
        excess: '토(土)가 과하면 몸이 무겁고 생각도 오래 머뭅니다. 식후 졸림이나 더부룩함이 있다면 음식 양을 줄이고 식후에 천천히 걷는 편이 좋습니다.',
        deficient: '토(土)가 약하면 식사 시간이 흔들리고 먹어도 기운이 잘 차지 않습니다. 따뜻하고 규칙적인 한 끼가 오늘의 중심을 잡아줍니다.',
        pressure: '토(土)가 눌리면 일정 압박과 걱정이 소화 리듬을 흔듭니다. 식사를 미루지 말고 단순하고 따뜻한 음식으로 몸의 중심을 먼저 세워주세요.',
        stable: '토(土)가 안정되면 생활의 중심이 잘 잡힙니다. 같은 시간에 먹고 가볍게 움직이는 기본만 지켜도 컨디션이 무난하게 이어집니다.'
      },
      metal: {
        excess: '금(金)이 강하면 기준과 판단은 또렷하지만 몸은 쉽게 경직됩니다. 흉곽과 어깨가 조이는 느낌이 있다면 오늘은 기준을 낮추고 호흡부터 여는 편이 좋습니다.',
        deficient: '금(金)이 약하면 호흡이 얕고 공간의 질서도 흐트러지기 쉽습니다. 물, 습도, 환기, 작은 정리가 금의 부족함을 잘 보완합니다.',
        pressure: '금(金)이 눌리면 과로와 열감이 호흡, 피부 컨디션, 집중력을 건드립니다. 판단을 서두르지 말고 먼저 숨을 길게 쉬어주세요.',
        stable: '금(金)이 안정되면 정리력과 집중력이 살아납니다. 건조함만 방치하지 않으면 차분한 컨디션을 유지하기 좋습니다.'
      },
      water: {
        excess: '수(水)가 과하면 생각이 깊어지고 몸의 속도가 늦어집니다. 완전히 가라앉기보다 짧게 걷고 따뜻하게 데우면 무거움이 덜합니다.',
        deficient: '수(水)가 약하면 잠을 자도 회복감이 부족하고 밤 시간 걱정이 길어지기 쉽습니다. 수면, 수분, 하체 보온을 오늘의 우선순위로 두세요.',
        pressure: '수(水)가 눌리면 피로가 오래 남고 회복감이 늦게 올라옵니다. 일정을 더 넣기보다 쉬는 시간을 먼저 확보하는 편이 맞습니다.',
        stable: '수(水)가 안정되면 깊게 쉬고 다시 채우는 힘이 좋습니다. 밤 시간의 화면과 소음만 줄여도 다음 날 몸이 가볍습니다.'
      }
    };
    return ((byElement[el] || byElement.earth)[state]) || byElement.earth.stable;
  }

  function renderHealthTensionAxis(controlImpacts, ratios, axes) {
    var selected = (controlImpacts || []).slice(0, 2);
    if (!selected.length && axes && axes.avoidEl) {
      selected.push({ controller: axes.avoidEl, target: HEALTH_CONTROL_REL[axes.avoidEl] || axes.targetEl, score: 0 });
    }
    if (!selected.length) selected.push({ controller: 'metal', target: 'wood', score: 0 });
    return '<div class="cd-health-knowledge-grid">'
      + selected.map(function (impact, idx) {
        var rule = findHealthTensionRule(impact.controller, impact.target) || findHealthTensionRule('metal', 'wood');
        var controller = getHealthKnowledge(rule.controller);
        var target = getHealthKnowledge(rule.target);
        var targetScore = Math.round(Number(ratios[rule.target] || 0));
        return '<article class="cd-health-knowledge-card" data-health-el="' + escapeHealthHtml(rule.target) + '">'
          + '<div class="cd-health-card-top">'
          + '<span class="cd-health-card-icon">' + escapeHealthHtml(EL_ICON[rule.target] || '🌿') + '</span>'
          + '<div><small>압박 흐름 ' + (idx + 1) + '</small><b>' + escapeHealthHtml(rule.title) + '</b></div>'
          + '</div>'
          + '<p class="cd-health-card-lead">' + escapeHealthHtml(getHealthElementWithParticle(rule.controller, 'subject') + ' ' + getHealthElementWithParticle(rule.target, 'object') + ' 누르는 생극 구도입니다. 균형이면 질서가 되지만, 한쪽이 강하면 ' + target.symbolicOrganRhythm + ' 쪽 생활 신호가 먼저 올라올 수 있습니다.') + '</p>'
          + renderHealthMiniList([rule.bodySignal, rule.mindSignal, rule.carePoint], 3)
          + renderHealthChipList([EL_NAME[rule.controller] + ' 절제', EL_NAME[rule.target] + ' 보완', '생활 신호 ' + targetScore + '%', '회복 루틴'], 4)
          + '</article>';
      }).join('')
      + '</div>';
  }

  function renderDayMasterHealthInsight(p, natal, fallbackEl) {
    var stem = getHealthDayStem(p, natal);
    var view = stem ? DAY_MASTER_HEALTH_VIEW[stem] : null;
    var knowledge = getHealthKnowledge((view && view.element) || fallbackEl || 'earth');
    if (!view) {
      view = {
        element: fallbackEl || 'earth',
        title: knowledge.title,
        tendency: knowledge.premium,
        stressSignal: getHealthKnowledgeSignals(fallbackEl || 'earth', 'balanced')[0] || knowledge.balancedMessage,
        recoveryKey: (knowledge.recoveryFocus || [])[0] || '반복 가능한 회복 루틴 하나를 부드럽게 세워주세요.'
      };
    }
    return '<div class="cd-health-knowledge-grid cd-health-knowledge-grid--single">'
      + '<article class="cd-health-knowledge-card" data-health-el="' + escapeHealthHtml(view.element) + '">'
      + '<div class="cd-health-card-top">'
      + '<span class="cd-health-card-icon">' + escapeHealthHtml(EL_ICON[view.element] || '✨') + '</span>'
      + '<div><small>' + escapeHealthHtml(stem ? stem + ' 일간' : '일간 리듬') + '</small><b>' + escapeHealthHtml(view.title) + '</b></div>'
      + '</div>'
      + '<p class="cd-health-card-lead">' + escapeHealthHtml(view.tendency) + '</p>'
      + renderHealthMiniList([view.stressSignal, view.recoveryKey], 2)
      + renderHealthChipList((knowledge.lifestyleKeywords || []).concat(knowledge.recoveryFocus || []), 5)
      + '</article>'
      + '</div>';
  }

  function renderTenGodHealthInsights(p, natal, ratios, controlImpacts) {
    var groups = getHealthTenGodGroups(p, natal, ratios, controlImpacts);
    return '<div class="cd-health-knowledge-grid">'
      + groups.map(function (group) {
        var info = TEN_GOD_HEALTH_MAP[group] || TEN_GOD_HEALTH_MAP.inseong;
        return '<article class="cd-health-knowledge-card cd-health-knowledge-card--ten">'
          + '<div class="cd-health-card-top">'
          + '<span class="cd-health-card-icon">🔮</span>'
          + '<div><small>' + escapeHealthHtml(info.label) + '</small><b>' + escapeHealthHtml(info.title) + '</b></div>'
          + '</div>'
          + '<p class="cd-health-card-lead">' + escapeHealthHtml(info.stressPattern) + '</p>'
          + renderHealthMiniList([info.bodySignal, info.mindSignal, info.carePoint], 3)
          + renderHealthChipList(info.routine, 4)
          + '</article>';
      }).join('')
      + '</div>';
  }

  function renderSeasonalHealthInsight(johu, targetEl) {
    var key = getSeasonHealthKey(johu);
    var season = SEASONAL_HEALTH_VIEW[key] || SEASONAL_HEALTH_VIEW.lateSummer;
    var care = (season.careElement || [targetEl]).map(function (el) { return EL_NAME[el] || el; });
    return '<div class="cd-health-knowledge-grid cd-health-knowledge-grid--single">'
      + '<article class="cd-health-knowledge-card" data-health-el="' + escapeHealthHtml(season.mainElement) + '">'
      + '<div class="cd-health-card-top">'
      + '<span class="cd-health-card-icon">' + escapeHealthHtml(EL_ICON[season.mainElement] || '🌙') + '</span>'
      + '<div><small>' + escapeHealthHtml(season.label) + ' · 조후</small><b>' + escapeHealthHtml(season.title) + '</b></div>'
      + '</div>'
      + '<p class="cd-health-card-lead">' + escapeHealthHtml(season.tendency) + '</p>'
      + renderHealthMiniList([season.riskWhenExcessive, '보완 오행은 ' + care.join(', ') + ' 쪽으로 떠오릅니다.'], 2)
      + renderHealthChipList(season.careRoutine || [], 4)
      + '</article>'
      + '</div>';
  }

  function getHealthGeneratingElement(el) {
    var found = 'water';
    Object.keys(HEALTH_GENERATES || {}).forEach(function (key) {
      if (HEALTH_GENERATES[key] === el) found = key;
    });
    return found;
  }

  function getHealthJohuProfile(johu, ratios) {
    johu = johu || {};
    ratios = ratios || {};
    var raw = String(johu.type || johu.johuType || johu.badgeTxt || johu.summary || '').toLowerCase();
    var dryWet = String(johu.dryWet || johu.moisture || johu.humidity || johu.wetDry || '').toLowerCase();
    var fireWood = Number(ratios.fire || 0) + Number(ratios.wood || 0);
    var waterMetal = Number(ratios.water || 0) + Number(ratios.metal || 0);
    var fireMetal = Number(ratios.fire || 0) + Number(ratios.metal || 0);
    var waterEarth = Number(ratios.water || 0) + Number(ratios.earth || 0);
    var tempKind = 'neutral';
    if (raw.indexOf('hot') !== -1 || raw.indexOf('warm') !== -1 || raw.indexOf('열') !== -1) tempKind = 'hot';
    else if (raw.indexOf('cold') !== -1 || raw.indexOf('cool') !== -1 || raw.indexOf('한') !== -1 || raw.indexOf('냉') !== -1) tempKind = 'cold';
    else if (fireWood - waterMetal >= 18) tempKind = 'hot';
    else if (waterMetal - fireWood >= 18) tempKind = 'cold';

    var moistureKind = 'balanced';
    if (raw.indexOf('dry') !== -1 || dryWet.indexOf('dry') !== -1 || raw.indexOf('건') !== -1 || dryWet.indexOf('건') !== -1) moistureKind = 'dry';
    else if (raw.indexOf('wet') !== -1 || raw.indexOf('damp') !== -1 || dryWet.indexOf('wet') !== -1 || dryWet.indexOf('damp') !== -1 || raw.indexOf('습') !== -1 || dryWet.indexOf('습') !== -1) moistureKind = 'damp';
    else if (fireMetal - waterEarth >= 20) moistureKind = 'dry';
    else if (waterEarth - fireMetal >= 20) moistureKind = 'damp';

    var tempMap = {
      hot: {
        label: _entertainText("ee_3762_prop_label"),
        shortLabel: '열기 조율',
        title: _entertainText("ee_3764_prop_title"),
        summary: '화(火)와 목(木)의 상승성이 빨라져 몸과 마음이 쉽게 달아오르는 흐름입니다.',
        bodySignal: '늦은 시간까지 생각과 감정이 활발해지고, 수면 리듬이 얕아지는 생활 신호가 떠오를 수 있습니다.',
        mindSignal: '빨리 해내고 싶은 마음이 앞서며 판단과 말의 속도가 함께 빨라지기 쉽습니다.',
        carePoint: '수(水)의 휴식과 금(金)의 호흡을 먼저 세우면 과열된 기운이 부드럽게 가라앉습니다.',
        support: ['water', 'metal'],
        caution: ['fire', 'wood'],
        routine: ['카페인 줄이기', '조명 낮추기', '깊은 호흡', '밤 화면 쉬기']
      },
      cold: {
        label: _entertainText("ee_3774_prop_label"),
        shortLabel: '한기 보온',
        title: _entertainText("ee_3776_prop_title"),
        summary: '수(水)와 금(金)의 수렴성이 깊어져 몸의 속도가 느려지고 회복감이 늦게 올라오는 흐름입니다.',
        bodySignal: '몸이 무겁고 차분하다 못해 처지는 느낌, 시작이 늦어지는 생활 신호가 드러날 수 있습니다.',
        mindSignal: '생각이 깊어지며 표현과 추진이 늦어지고, 혼자 머무르려는 마음이 커지기 쉽습니다.',
        carePoint: '화(火)의 온기와 목(木)의 가벼운 움직임을 더하면 닫힌 리듬이 천천히 열립니다.',
        support: ['fire', 'wood'],
        caution: ['water', 'metal'],
        routine: ['따뜻한 차', '햇빛 보기', '하체 보온', '가벼운 산책']
      },
      neutral: {
        label: _entertainText("ee_3786_prop_label"),
        shortLabel: '중화 조율',
        title: _entertainText("ee_3788_prop_title"),
        summary: '조후의 온도는 극단으로 치우치지 않고, 원국의 강약과 오늘의 일진이 회복 순서를 비춥니다.',
        bodySignal: '특정 신호 하나보다 식사, 수면, 움직임의 기본 리듬이 컨디션의 중심으로 떠오릅니다.',
        mindSignal: '새로운 관리를 크게 늘리기보다 이미 흐트러진 습관 하나를 바로잡는 쪽이 편안합니다.',
        carePoint: '가장 비어 있거나 압박받는 오행을 작은 루틴으로 채우면 전체 균형이 부드럽게 살아납니다.',
        support: [],
        caution: [],
        routine: ['같은 시간 식사', '수면 시간 고정', '짧은 산책', '자극 하나 줄이기']
      }
    };
    var moistureMap = {
      dry: {
        label: _entertainText("ee_3800_prop_label"),
        title: _entertainText("ee_3801_prop_title"),
        summary: '금(金)의 수렴성과 화(火)의 열감이 겹치면 호흡, 피부 컨디션, 목·어깨의 긴장이 쉽게 굳어질 수 있습니다.',
        carePoint: '수분, 습도, 호흡, 부드러운 스트레칭이 마른 기운을 촉촉하게 풀어줍니다.',
        support: ['water', 'wood'],
        caution: ['metal', 'fire'],
        routine: ['따뜻한 물', '실내 습도', '어깨 이완', '기준 낮추기']
      },
      damp: {
        label: _entertainText("ee_3809_prop_label"),
        title: _entertainText("ee_3810_prop_title"),
        summary: '수(水)와 토(土)의 머무름이 깊어지면 몸이 무겁고 생각이 오래 고이는 생활 신호가 떠오를 수 있습니다.',
        carePoint: '가벼운 걷기, 단순한 식사, 공간 정리가 정체된 기운을 천천히 움직입니다.',
        support: ['wood', 'fire'],
        caution: ['water', 'earth'],
        routine: ['식후 걷기', '단순한 식사', '책상 정리', '햇빛 보기']
      },
      balanced: {
        label: _entertainText("ee_3818_prop_label"),
        title: _entertainText("ee_3819_prop_title"),
        summary: '건조와 습기가 크게 치우치지 않아 오늘은 취약 오행의 보완 순서가 더 선명하게 떠오릅니다.',
        carePoint: '과한 보정 대신 지금 필요한 오행 하나를 정해 반복 가능한 루틴으로 이어가면 좋습니다.',
        support: [],
        caution: [],
        routine: ['물 천천히 마시기', '환기', '기본 식사', '짧은 휴식']
      }
    };
    var temp = tempMap[tempKind] || tempMap.neutral;
    var moisture = moistureMap[moistureKind] || moistureMap.balanced;
    function unique(list) {
      var out = [];
      (list || []).forEach(function (el) {
        if (el && out.indexOf(el) === -1) out.push(el);
      });
      return out;
    }
    var support = unique((temp.support || []).concat(moisture.support || []));
    var caution = unique((temp.caution || []).concat(moisture.caution || []));
    return {
      tempKind: tempKind,
      moistureKind: moistureKind,
      label: temp.label + ' · ' + moisture.label,
      shortLabel: temp.shortLabel,
      heroCare: (support[0] && getHealthRoutineFocus(support[0])) || temp.routine[0],
      temp: temp,
      moisture: moisture,
      supportElements: support,
      cautionElements: caution,
      routine: unique((temp.routine || []).concat(moisture.routine || [])).slice(0, 6)
    };
  }

  function renderJohuDeepDive(johu, ratios, targetEl, avoidEl) {
    var profile = getHealthJohuProfile(johu, ratios);
    var support = profile.supportElements.length ? profile.supportElements : [targetEl].filter(Boolean);
    var caution = profile.cautionElements.length ? profile.cautionElements : [avoidEl].filter(Boolean);
    var supportText = support.map(function (el) { return EL_NAME[el] || el; }).join(', ') || EL_NAME[targetEl] || '토(土)';
    var cautionText = caution.map(function (el) { return EL_NAME[el] || el; }).join(', ') || EL_NAME[avoidEl] || '화(火)';
    return '<div class="cd-health-knowledge-grid">'
      + '<article class="cd-health-knowledge-card" data-health-el="' + escapeHealthHtml(support[0] || targetEl || 'earth') + '">'
      + '<div class="cd-health-card-top">'
      + '<span class="cd-health-card-icon">🌤️</span>'
      + '<div><small>조후 온도</small><b>' + escapeHealthHtml(profile.temp.title) + '</b></div>'
      + '</div>'
      + '<p class="cd-health-card-lead">' + escapeHealthHtml(profile.temp.summary) + '</p>'
      + renderHealthMiniList([profile.temp.bodySignal, profile.temp.mindSignal, profile.temp.carePoint], 3)
      + renderHealthChipList(profile.temp.routine, 4)
      + '</article>'
      + '<article class="cd-health-knowledge-card" data-health-el="' + escapeHealthHtml((profile.moisture.support || [targetEl])[0] || targetEl || 'earth') + '">'
      + '<div class="cd-health-card-top">'
      + '<span class="cd-health-card-icon">💧</span>'
      + '<div><small>건습 리듬</small><b>' + escapeHealthHtml(profile.moisture.title) + '</b></div>'
      + '</div>'
      + '<p class="cd-health-card-lead">' + escapeHealthHtml(profile.moisture.summary) + '</p>'
      + renderHealthMiniList([profile.moisture.carePoint, '오늘은 ' + supportText + '을 먼저 보완하고, ' + cautionText + ' 쪽 자극은 오후부터 줄이는 편이 좋습니다.'], 2)
      + renderHealthChipList(profile.moisture.routine, 4)
      + '</article>'
      + '<article class="cd-health-knowledge-card" data-health-el="' + escapeHealthHtml(targetEl || support[0] || 'earth') + '">'
      + '<div class="cd-health-card-top">'
      + '<span class="cd-health-card-icon">🧭</span>'
      + '<div><small>조후 보완 순서</small><b>' + escapeHealthHtml(profile.label) + '</b></div>'
      + '</div>'
      + '<p class="cd-health-card-lead">' + escapeHealthHtml('조후상 먼저 챙길 자리는 ' + supportText + '입니다. 여기에 억부에서 잡힌 보완 오행 ' + getHealthElementWithParticle(targetEl, 'object') + ' 함께 보면, 오늘은 무리한 관리보다 몸을 편하게 만드는 순서가 더 중요합니다.') + '</p>'
      + renderHealthMiniList(['줄이면 좋은 자극은 ' + cautionText + '의 과열과 과한 반복입니다.', '오늘은 ' + profile.routine.slice(0, 3).join(', ') + '을 먼저 두는 편이 몸에 편안합니다.'], 2)
      + renderHealthChipList(profile.routine, 6)
      + '</article>'
      + '</div>';
  }

  function renderHealthWeaknessDeepDive(weakestEls, axes, ratios, controlImpacts, johu) {
    var profile = getHealthJohuProfile(johu, ratios);
    var selected = [];
    function add(el) {
      if (el && selected.indexOf(el) === -1) selected.push(el);
    }
    (controlImpacts || []).slice(0, 2).forEach(function (impact) { add(impact.target); });
    (weakestEls || []).forEach(add);
    if (axes) add(axes.targetEl);
    selected = selected.slice(0, 3);
    if (!selected.length) selected = ['earth'];
    return '<div class="cd-health-knowledge-grid">'
      + selected.map(function (el, idx) {
        var value = Math.max(0, Math.min(100, Math.round(Number(ratios[el] || 0))));
        var state = getHealthState(el, ratios, controlImpacts || []);
        var status = getElementStatus(value);
        var knowledge = getHealthKnowledge(el);
        var pressure = (controlImpacts || []).filter(function (impact) { return impact.target === el; })[0] || null;
        var rule = pressure ? findHealthTensionRule(pressure.controller, pressure.target) : null;
        var supportEl = getHealthGeneratingElement(el);
        var drainEl = HEALTH_GENERATES[el] || 'fire';
        var weaknessType = state === 'pressure' ? '압박형 취약' : ((status === 'veryWeak' || status === 'weak') ? '결핍형 취약' : ((status === 'strong' || status === 'excessive') ? '과다형 취약' : '리듬형 취약'));
        var reason = rule
          ? rule.title + '입니다. 이때 ' + EL_NAME[el] + '의 ' + knowledge.title + '이 약하게 눌리며 생활 신호가 먼저 올라올 수 있습니다.'
          : (status === 'veryWeak' || status === 'weak'
            ? EL_NAME[el] + '의 비율이 낮아 ' + knowledge.symbolicOrganRhythm + '을 천천히 보완해야 합니다.'
            : EL_NAME[el] + '의 기운이 빠르게 쓰이니 장점과 피로 신호를 함께 봐야 합니다.');
        var johuLine = profile.supportElements.indexOf(el) !== -1
          ? '조후도 ' + EL_NAME[el] + ' 보완을 함께 잡고 있으니, 오늘은 이 오행을 가장 부드럽게 챙기면 좋습니다.'
          : '조후상 보완 오행인 ' + (profile.supportElements.map(function (item) { return EL_NAME[item]; }).join(', ') || EL_NAME[axes && axes.targetEl] || '토(土)') + '을 함께 두면 ' + EL_NAME[el] + '의 부담이 줄어듭니다.';
        var signals = getHealthKnowledgeSignals(el, status).slice(0, 2);
        var guide = getHealthSignalGuideV2(el, state);
        return '<article class="cd-health-knowledge-card" data-health-el="' + escapeHealthHtml(el) + '">'
          + '<div class="cd-health-card-top">'
          + '<span class="cd-health-card-icon">' + escapeHealthHtml(EL_ICON[el] || '🫧') + '</span>'
          + '<div><small>취약 축 ' + (idx + 1) + ' · ' + value + '%</small><b>' + escapeHealthHtml(EL_NAME[el] + ' · ' + weaknessType) + '</b></div>'
          + '</div>'
          + '<p class="cd-health-card-lead">' + escapeHealthHtml(reason) + '</p>'
          + renderHealthMiniList([guide[0], guide[1], johuLine].concat(signals), 4)
          + renderHealthChipList([EL_NAME[supportEl] + ' 생조', EL_NAME[drainEl] + ' 설기', getHealthRoutineFocus(el), (knowledge.recoveryFocus || [])[0] || '작은 루틴'], 4)
          + '</article>';
      }).join('')
      + '</div>';
  }

  function renderHealthBalanceBars(ratios, targetEl, avoidEl, controlImpacts) {
    return HEALTH_ELEMENT_ORDER.map(function (el) {
      var value = Math.max(0, Math.min(100, Math.round(Number(ratios[el] || 0))));
      var state = getHealthState(el, ratios, controlImpacts || []);
      var status = getElementStatus(value);
      var knowledge = getHealthKnowledge(el);
      var ui = getHealthHealingElementUi(el);
      var tags = [];
      if (el === targetEl) tags.push('보완');
      if (el === avoidEl) tags.push('주의');
      var focusClass = tags.length ? ' cd-health-balance-row--focus' : '';
      return '<div class="cd-health-balance-row' + focusClass + '" data-health-el="' + escapeHealthHtml(el) + '" style="--health-el-color:' + ui.color + ';--health-el-soft:' + ui.soft + ';--health-el-border:' + ui.border + ';">'
        + '<div class="cd-health-balance-head">'
        + '<span class="cd-health-balance-name"><em aria-hidden="true">' + escapeHealthHtml(EL_ICON[el] || '✦') + '</em><span>' + escapeHealthHtml(EL_NAME[el]) + '</span></span>'
        + '<span class="cd-health-balance-tags">' + tags.map(function (tag) { return '<b>' + tag + '</b>'; }).join('') + '</span>'
        + '</div>'
        + '<p class="cd-health-balance-keyword">' + escapeHealthHtml(knowledge.title + ' · ' + knowledge.symbolicOrganRhythm) + '</p>'
        + '<div class="cd-health-balance-track" aria-hidden="true"><span style="width:' + value + '%"></span></div>'
        + '<div class="cd-health-balance-foot"><span>' + escapeHealthHtml(HEALTH_STATUS_LABEL[status] || getHealthStateLabel(state)) + ' · ' + escapeHealthHtml(EL_ORGAN[el]) + ' 리듬</span><strong>' + value + '%</strong></div>'
        + '<p class="cd-health-balance-summary">' + escapeHealthHtml(getHealthKnowledgeMessage(el, status)) + '</p>'
        + renderHealthMiniList(getHealthKnowledgeSignals(el, status), 2)
        + renderHealthChipList((knowledge.recoveryFocus || []).concat(HEALTH_STATUS_UI[status]), 3)
        + '</div>';
    }).join('');
  }

  function renderHealthMasterReading(strongestEl, weakestEls, axes, ratios, controlImpacts, johu) {
    var strongestState = getHealthState(strongestEl, ratios, controlImpacts);
    var targetState = getHealthState(axes.targetEl, ratios, controlImpacts);
    var weakText = weakestEls.map(function (el) { return EL_NAME[el]; }).join(', ');
    var seasonTone = johu && johu.type ? ({
      hot: '조후가 열 쪽으로 기울면 몸은 쉽게 달아오르고 밤에는 긴장이 남기 쉽습니다. 수(水)와 금(金)을 보완해 열을 식히는 쪽이 좋습니다.',
      warm: '조후가 따뜻한 편이면 활동성은 좋지만 과열로 흐르기 쉽습니다. 수(水)와 금(金)의 서늘한 관리가 균형을 잡아줍니다.',
      cold: '조후가 차가운 편이면 회복은 느리고 몸의 시작이 늦을 수 있습니다. 화(火)와 목(木)의 온기, 움직임, 햇빛이 필요합니다.',
      cool: '조후가 서늘하면 몸의 속도가 느려지기 쉽습니다. 화(火)의 온기와 목(木)의 가벼운 움직임을 더해 주세요.'
    })[johu.type] : '';
    if (!seasonTone) seasonTone = '조후가 크게 치우치지 않으므로 오늘은 원국의 강약과 억부 보완 오행을 기준으로 몸을 살피는 편이 좋습니다.';

    return '<div class="cd-health-master">'
      + '<div class="cd-health-info cd-health-insight-card cd-health-insight-card--day">'
      + '<div class="cd-health-insight-label"><span aria-hidden="true">👁</span> 일간 관점</div>'
      + '<p>' + getHealthElementConsultation(strongestEl, strongestState) + '</p>'
      + '</div>'
      + '<div class="cd-health-info cd-health-insight-card cd-health-insight-card--tension">'
      + '<div class="cd-health-insight-label"><span aria-hidden="true">⚡</span> 오늘의 긴장 포인트</div>'
      + '<p>' + escapeHealthHtml(weakText) + ' 쪽은 오늘 컨디션이 먼저 흔들리기 쉬운 자리입니다.</p>'
      + '<p>' + escapeHealthHtml(seasonTone) + '</p>'
      + '</div>'
      + '<div class="cd-health-info cd-health-insight-card cd-health-insight-card--recovery">'
      + '<div class="cd-health-insight-label"><span aria-hidden="true">🌙</span> 회복 방향</div>'
      + '<p>' + getHealthElementConsultation(axes.targetEl, targetState) + '</p>'
      + '<p>오늘은 ' + escapeHealthHtml(getHealthElementWithParticle(axes.targetEl, 'object')) + ' 살리는 루틴을 먼저 두고, ' + escapeHealthHtml(EL_NAME[axes.avoidEl]) + ' 쪽 자극은 저녁부터 줄이는 편이 좋습니다.</p>'
      + '</div>'
      + '</div>';
  }

  function getHealthPeriodItems(targetEl, avoidEl, strongestEl, todayEl) {
    var targetName = EL_NAME[targetEl] || '토';
    var avoidName = EL_NAME[avoidEl] || '토';
    var strongName = EL_NAME[strongestEl] || '토';
    var todayName = EL_NAME[todayEl] || strongName;
    var targetObject = getHealthElementWithParticle(targetEl, 'object');
    var routine = getHealthRoutineFocus(targetEl);
    var targetInfo = getHealthKnowledge(targetEl);
    var avoidInfo = getHealthKnowledge(avoidEl);
    var todayInfo = getHealthKnowledge(todayEl);
    var strongInfo = getHealthKnowledge(strongestEl);
    return [
      {
        title: _entertainText("ee_4003_prop_title"),
        value: todayName + ' 기운',
        body: '오늘은 ' + todayName + ' 쪽 반응이 먼저 올라옵니다. 컨디션을 몰아붙이기보다 일하는 중간에 물 한 잔, 3분 스트레칭처럼 작게 끊어 쉬는 편이 좋습니다.',
        routine: routine,
        details: [
          todayInfo.symbolicOrganRhythm + '에 해당하는 생활 신호를 가볍게 살피세요.',
          (todayInfo.bodyKeywords || []).slice(0, 3).join(' · ') + ' 신호가 반복되면 쉬는 시간을 먼저 넣으세요.',
          ((todayInfo.recommendedRest || [])[0] || '짧은 휴식') + '이 오늘 몸에 잘 맞습니다.'
        ]
      },
      {
        title: _entertainText("ee_4014_prop_title"),
        value: targetName + ' 보완',
        body: '이번 주는 억부상 비어 있는 ' + targetObject + ' 생활 속에서 천천히 채우는 때입니다. 식사와 잠드는 시간을 크게 흔들지 않으면 몸의 중심이 훨씬 편해집니다.',
        routine: '식사·수면 시간 맞추기',
        details: [
          (targetInfo.recommendedFoods || []).slice(0, 2).join(' · ') + '처럼 부담 없는 음식을 우선하세요.',
          (targetInfo.recommendedMovement || []).slice(0, 2).join(' · ') + ' 정도면 충분합니다.',
          '컨디션이 흔들리는 날에는 ' + ((targetInfo.recommendedTea || [])[0] || '따뜻한 물') + '로 속도를 낮추세요.'
        ]
      },
      {
        title: _entertainText("ee_4025_prop_title"),
        value: avoidName + ' 절제',
        body: '이번 달은 ' + avoidName + ' 쪽 자극이 쉽게 커집니다. 늦은 밤까지 버티는 습관, 한 번에 몰아치는 일정을 줄이면 피로가 덜 쌓입니다.',
        routine: '밤 시간 자극 줄이기',
        details: [
          (avoidInfo.avoidPatterns || []).slice(0, 2).join(' · ') + ' 패턴은 줄이는 편이 좋습니다.',
          (avoidInfo.recommendedRest || []).slice(0, 2).join(' · ') + '을 저녁 루틴에 붙이세요.',
          '몸이 예민해지는 날에는 약속보다 회복 시간을 먼저 잡으세요.'
        ]
      },
      {
        title: _entertainText("ee_4036_prop_title"),
        value: strongName + ' 조율',
        body: '계절이 바뀔 때는 원국에서 강한 ' + strongName + '이 먼저 반응합니다. 늘 해오던 방식만 고집하기보다 부족한 오행을 조금씩 채워야 몸이 덜 흔들립니다.',
        routine: '부족한 리듬 보완',
        details: [
          strongInfo.symbolicOrganRhythm + '이 강점으로 쓰이되 과로 신호를 함께 살피세요.',
          (targetInfo.recoveryFocus || []).slice(0, 2).join(' · ') + '을 계절 전환기 기본 루틴으로 두세요.',
          '수면, 식사, 움직임 중 하나만 무너져도 컨디션이 크게 흔들릴 수 있습니다.'
        ]
      }
    ];
  }

  function renderHealthPeriodTimeline(targetEl, avoidEl, strongestEl, todayEl) {
    return '<div class="cd-health-period-grid">'
      + getHealthPeriodItems(targetEl, avoidEl, strongestEl, todayEl).map(function (item, idx) {
        return '<article class="cd-health-period-card">'
          + '<span class="cd-health-period-num">' + (idx + 1) + '</span>'
          + '<div class="cd-health-period-title">' + escapeHealthHtml(item.title) + '</div>'
          + '<b>' + escapeHealthHtml(item.value) + '</b>'
          + '<p>' + escapeHealthHtml(item.body) + '</p>'
          + (item.details && item.details.length ? '<ul class="cd-health-period-detail">' + item.details.map(function (detail) { return '<li>' + escapeHealthHtml(detail) + '</li>'; }).join('') + '</ul>' : '')
          + '<em>' + escapeHealthHtml(item.routine) + '</em>'
          + '</article>';
      }).join('')
      + '</div>';
  }

  function getHealthElementParticle(el, kind) {
    var name = (getHealthKnowledge(el).koreanName || '').slice(-1);
    var hasBatchim = name === '목' || name === '금';
    if (kind === 'subject') return hasBatchim ? '이' : '가';
    if (kind === 'object') return hasBatchim ? '을' : '를';
    return hasBatchim ? '은' : '는';
  }

  function getHealthElementWithParticle(el, kind) {
    return (EL_NAME[el] || '토(土)') + getHealthElementParticle(el, kind);
  }

  function getHealthRemedyItems(targetEl, avoidEl) {
    var targetName = EL_NAME[targetEl] || '토';
    var avoidName = EL_NAME[avoidEl] || '토';
    var targetInfo = getHealthKnowledge(targetEl);
    var avoidInfo = getHealthKnowledge(avoidEl);
    var supportEl = getHealthGeneratingElement(targetEl);
    var supportName = EL_NAME[supportEl] || '수(水)';
    var supportInfo = getHealthKnowledge(supportEl);
    var drainEl = HEALTH_GENERATES[avoidEl] || targetEl;
    var drainName = EL_NAME[drainEl] || targetName;
    var drainInfo = getHealthKnowledge(drainEl);
    var pressureTargetEl = HEALTH_CONTROL_REL[avoidEl] || targetEl;
    var pressureTargetName = EL_NAME[pressureTargetEl] || targetName;
    var tensionRule = findHealthTensionRule(avoidEl, pressureTargetEl) || findHealthTensionRule(avoidEl, targetEl);
    var targetFood = ((targetInfo.recommendedFoods || [])[0] || '따뜻한 식사');
    var supportRest = ((supportInfo.recommendedRest || [])[0] || '짧은 휴식');
    var targetMove = ((targetInfo.recommendedMovement || [])[0] || getHealthRoutineFocus(targetEl));
    var drainMove = ((drainInfo.recommendedMovement || [])[0] || getHealthRoutineFocus(drainEl));
    var avoidPattern = ((avoidInfo.avoidPatterns || [])[0] || (HEALTH_AVOID_PLAN[avoidEl] || '과한 자극'));
    var targetRest = ((targetInfo.recommendedRest || [])[0] || '조용한 휴식');
    var pressureBody = tensionRule
      ? tensionRule.carePoint
      : avoidName + '의 힘이 강하면 ' + pressureTargetName + ' 쪽 생활 리듬이 눌릴 수 있습니다. 오늘은 자극을 키우기보다 기준을 낮추고 회복 시간을 먼저 두세요.';
    return [
      {
        label: _entertainText("ee_4101_prop_label"),
        body: supportName + '는 ' + getHealthElementWithParticle(targetEl, 'object') + ' 생합니다. ' + getHealthElementWithParticle(targetEl, 'subject') + ' 약하거나 눌릴 때는 먼저 ' + supportName + '의 바탕을 세워야 회복이 부드럽게 이어집니다.',
        details: [supportRest, ((supportInfo.recommendedTea || [])[0] || '따뜻한 물') + '를 천천히 마시기', targetName + ' 루틴은 한 번에 늘리지 말고 작게 시작하기'],
        tags: [supportName + ' 생조', targetName + ' 보완', targetInfo.symbolicOrganRhythm]
      },
      {
        label: targetName + ' 본기 보완',
        body: targetInfo.weakMessage || (targetName + '이 부족하면 생활 리듬이 쉽게 흔들립니다. 오늘은 몸이 바로 받아들이는 행동 하나가 가장 좋습니다.'),
        details: [targetFood, targetMove, ((targetInfo.recoveryFocus || [])[0] || '반복 가능한 작은 루틴')],
        tags: [targetName, targetInfo.title, '오늘 보완']
      },
      {
        label: _entertainText("ee_4113_prop_label"),
        body: avoidName + '의 자극은 억누르기보다 ' + drainName + ' 쪽으로 가볍게 흘려보내면 과열이 덜합니다. 강한 기운을 무리하게 막지 말고 안전한 출구를 만들어주세요.',
        details: [drainMove, avoidPattern + ' 줄이기', ((drainInfo.recommendedRest || [])[0] || '짧은 휴식') + '로 마무리하기'],
        tags: [avoidName + ' 절제', drainName + ' 설기', '과열 낮추기']
      },
      {
        label: _entertainText("ee_4119_prop_label"),
        body: getHealthElementWithParticle(avoidEl, 'subject') + ' ' + getHealthElementWithParticle(pressureTargetEl, 'object') + ' 누르는 자리까지 함께 봅니다. 균형이면 질서가 되지만 오늘처럼 피로가 있으면 압박으로 느껴질 수 있습니다.',
        details: [pressureBody, ((getHealthKnowledge(pressureTargetEl).recoveryFocus || [])[0] || targetRest), '해야 할 일을 하나 줄이고 몸의 반응을 먼저 보기'],
        tags: [avoidName + ' 극', pressureTargetName + ' 보호', '긴장 완화']
      },
      {
        label: _entertainText("ee_4125_prop_label"),
        body: '개운은 큰 의식보다 몸이 편해지는 환경에서 먼저 살아납니다. 오늘은 ' + getHealthElementWithParticle(targetEl, 'object') + ' 살리는 공간을 만들고, ' + getHealthElementWithParticle(avoidEl, 'object') + ' 키우는 자극을 눈앞에서 치우세요.',
        details: [HEALTH_ENV_PLAN[targetEl] || HEALTH_ENV_PLAN.earth, HEALTH_AVOID_PLAN[avoidEl] || HEALTH_AVOID_PLAN.earth, '침대 주변을 단순하게 비우고 잠들기 전 시야를 낮추기'],
        tags: ['공간 정돈', '자극 낮추기', '회복 여백']
      }
    ];
  }

  function renderHealthRemedyBoard(targetEl, avoidEl) {
    return '<div class="cd-health-remedy-grid">'
      + getHealthRemedyItems(targetEl, avoidEl).map(function (item) {
        return '<article class="cd-health-remedy-card">'
          + '<div>' + escapeHealthHtml(item.label) + '</div>'
          + '<p>' + escapeHealthHtml(item.body) + '</p>'
          + renderHealthMiniList(item.details, 3)
          + renderHealthChipList(item.tags, 3)
          + '</article>';
      }).join('')
      + '</div>';
  }

  function renderTodayHealthSummaryCard(condition, grade, axes, routineFocus, strongestEl, controlImpacts, dayMaster) {
    dayMaster = dayMaster || { element: strongestEl, label: _entertainText("ee_4147_prop_label") };
    var pressureText = controlImpacts && controlImpacts.length
      ? EL_NAME[controlImpacts[0].target] + ' 압박 / ' + EL_NAME[controlImpacts[0].controller] + ' 과열'
      : EL_NAME[strongestEl] + ' 강점 오행';
    var tags = [
      EL_NAME[axes.targetEl] + ' 보완',
      EL_NAME[axes.avoidEl] + ' 자극 낮추기',
      routineFocus,
      '회복 여백'
    ];
    return '<div class="cd-health-today-card">'
      + '<div class="cd-health-today-badge">TODAY</div>'
      + '<p class="cd-health-today-lead">' + escapeHealthHtml(condition.lead) + '</p>'
      + '<div class="cd-health-today-grid">'
      + '<span><b>일간 리듬</b>' + escapeHealthHtml(dayMaster.label + ' · ' + EL_NAME[dayMaster.element]) + '</span>'
      + '<span><b>컨디션 등급</b>' + escapeHealthHtml(grade.label) + '</span>'
      + '<span><b>압박 오행</b>' + escapeHealthHtml(pressureText) + '</span>'
      + '<span><b>오늘 보완</b>' + escapeHealthHtml(EL_NAME[axes.targetEl]) + '</span>'
      + '</div>'
      + '<p class="cd-health-today-sub">' + escapeHealthHtml(condition.second) + '</p>'
      + '<div class="cd-health-tag-row">' + tags.map(function (tag) { return '<i>' + escapeHealthHtml(tag) + '</i>'; }).join('') + '</div>'
      + '</div>';
  }

  function renderConstitutionCards(strongestEl, weakestEls) {
    var weakText = weakestEls.map(function (el) { return EL_NAME[el]; }).join(', ');
    var weakBody = weakestEls.map(getHealthElementSupportCopy).join(' ');
    return '<div class="cd-health-constitution-grid">'
      + '<article><span>1</span><b>강하게 쓰이는 오행</b><strong>' + escapeHealthHtml(EL_NAME[strongestEl]) + '</strong><p>' + escapeHealthHtml(getHealthElementPositiveCopy(strongestEl)) + '</p><em>장점으로 쓰이지만 과해지면 같은 자리에서 피로 신호가 먼저 올라옵니다.</em></article>'
      + '<article><span>2</span><b>쉽게 피로해지는 오행</b><strong>' + escapeHealthHtml(weakText) + '</strong><p>' + escapeHealthHtml(weakBody) + '</p><em>반복되는 생활 신호가 있다면 이 오행부터 살피는 편이 좋습니다.</em></article>'
      + '<article><span>3</span><b>보완이 필요한 오행</b><strong>' + escapeHealthHtml(weakText) + '</strong><p>비어 보이는 오행은 강하게 밀어붙이기보다 식사, 수면, 움직임처럼 반복 가능한 습관으로 채울 때 안정됩니다.</p><em>관리 포인트: 같은 시간 식사, 수면, 가벼운 움직임</em></article>'
      + '</div>';
  }

  function renderRecoveryRoutineBoard(targetEl, avoidEl) {
    var foods = (HEALTH_FOOD_PLAN[targetEl] || HEALTH_DEFAULT_FOOD_PLAN || []).filter(Boolean);
    var food = foods[0] || HEALTH_DEFAULT_FOOD_PLAN[0];
    var targetKnowledge = getHealthKnowledge(targetEl);
    var avoidKnowledge = getHealthKnowledge(avoidEl);
    return '<div class="cd-health-routine-board">'
      + '<article><b>추천 음식/차</b><strong>' + escapeHealthHtml(food.name) + '</strong><p>' + escapeHealthHtml((targetKnowledge.recommendedFoods || []).slice(0, 3).join(' · ') + ' / ' + (targetKnowledge.recommendedTea || []).slice(0, 2).join(' · ')) + '</p><em>' + escapeHealthHtml(food.tip || food.reason || '따뜻하고 담백한 한 끼가 몸의 중심을 부드럽게 세웁니다.') + '</em></article>'
      + '<article><b>추천 움직임</b><strong>' + escapeHealthHtml(getHealthRoutineFocus(targetEl)) + '</strong><p>' + escapeHealthHtml((targetKnowledge.recommendedMovement || []).join(' · ') || HEALTH_MOVEMENT_PLAN[targetEl] || HEALTH_MOVEMENT_PLAN.earth) + '</p><em>' + escapeHealthHtml(HEALTH_MOVEMENT_PLAN[targetEl] || HEALTH_MOVEMENT_PLAN.earth) + '</em></article>'
      + '<article><b>추천 휴식</b><strong>자극 낮추기</strong><p>' + escapeHealthHtml((targetKnowledge.recommendedRest || []).join(' · ') || '취침 전 30분은 강한 화면과 감정 소모 대화를 줄이세요.') + '</p><em>회복은 크게 밀어붙일수록 멀어지고, 작게 반복할수록 가까워집니다.</em></article>'
      + '<article><b>피하면 좋은 패턴</b><strong>' + escapeHealthHtml(EL_NAME[avoidEl]) + ' 과열</strong><p>' + escapeHealthHtml((avoidKnowledge.avoidPatterns || []).join(' · ') || HEALTH_AVOID_PLAN[avoidEl] || HEALTH_AVOID_PLAN.earth) + '</p><em>' + escapeHealthHtml(HEALTH_AVOID_PLAN[avoidEl] || HEALTH_AVOID_PLAN.earth) + '</em></article>'
      + '<article class="cd-health-routine-wide"><b>오늘의 한 문장</b><p>오늘은 마음이 앞서도 몸은 천천히 따라옵니다. ' + escapeHealthHtml(targetKnowledge.title) + '은 한 끼를 따뜻하게 먹고, 숨을 길게 쉬고, 짧게 걷는 일부터 살아납니다.</p></article>'
      + '</div>';
  }

  function ensureHealthFontStyle() {
    try {
      if (!w.document || document.getElementById('cd-health-r2-fonts')) return;
      var style = document.createElement('style');
      style.id = 'cd-health-r2-fonts';
      style.textContent = '@font-face{font-family:"CDHealthReadable";src:url("https://assets.code-destiny.com/The%20Jamsil%20OTF%204%20Medium.otf") format("opentype");font-weight:500;font-style:normal;font-display:swap}'
        + '@font-face{font-family:"CDHealthDisplay";src:url("https://assets.code-destiny.com/Mulmaru.woff2") format("woff2");font-weight:400;font-style:normal;font-display:swap}';
      document.head.appendChild(style);
    } catch (_) {}
  }

  /* ══════════════════════════════════════════════════════════════════════
     명리 헬스 리포트 — 단일 세대 스타일시트 (v20260809)

     이전 시트는 한 문자열 안에 4세대가 겹쳐 쌓여 있었다. 뒷세대가 앞세대를
     display:none 으로 지우고(히어로 장식), 같은 선택자를 처음부터 다시 선언하고,
     서로를 누르느라 거의 모든 declaration 이 !important 였다.

     이 시트는 한 세대만 둔다. 마크업에서 다크 네온 테마 잔재(bg-slate-950 ·
     text-indigo-* · backdrop-blur 등 Tailwind 유틸)를 걷어냈으므로 !important 가
     필요 없다. 새 규칙을 !important 로 덮기 시작하면 같은 부패가 그대로 재발한다.

     색 역할: 크롬(표면·잉크·강조)은 연이 브랜드, 데이터(균형 막대·장부 다이얼·칩)는
     오행 5색. 오행 색은 각 노드가 --health-el-color/-soft/-border 로 심는다.
     ══════════════════════════════════════════════════════════════════════ */
  function renderHealthWellnessStyle() {
    ensureHealthFontStyle();
    return '<style data-cd-health-ui="health-wellness-knowledge-v20260617">'

      /* 대시보드 하단 바에 마지막 줄이 가리지 않도록 셸 카드가 확보하는 여백 */
      + '#healthReportCard{padding-bottom:calc(112px + env(safe-area-inset-bottom,0px))}'

      /* ── 토큰 ─────────────────────────────────────────────────────────── */
      + '.cd-health-wellness-v20260607{'
      + '--h-surface:#fffdfb;--h-raised:#fff7f9;'
      + '--h-ink:#3c1830;--h-ink-muted:#70445c;'
      + '--h-accent:#b31955;--h-accent-soft:#f4bed1;--h-gold:#ead089;'
      + '--h-line:rgba(179,25,85,.16);--h-line-soft:rgba(179,25,85,.09);'
      + '--h-ease:cubic-bezier(.22,1,.36,1);'
      + 'position:relative;display:block;isolation:isolate;'
      + 'padding:16px;border-radius:22px;'
      /* 셸 카드가 이미 테두리를 가지므로 루트는 링을 만들지 않는다. 예전에는
         셸 → 루트 → :before 인셋 링 → 섹션 → 내부 카드로 4겹이 동심원을 그렸다. */
      + 'border:0;box-shadow:none;'
      + 'background:linear-gradient(180deg,#fffaf7 0%,#fff3f8 100%);'
      + 'color:var(--h-ink);'
      + 'font-family:"CDHealthReadable",var(--font-body,"Pretendard","Noto Sans KR","Apple SD Gothic Neo",system-ui,sans-serif);'
      + '-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}'
      + '.cd-health-wellness-v20260607:before,.cd-health-wellness-v20260607:after{content:none}'
      + '.cd-health-wellness-v20260607 *{box-sizing:border-box;min-width:0}'

      /* ── 타이포 ───────────────────────────────────────────────────────── */
      + '.cd-health-wellness-v20260607 h3,.cd-health-wellness-v20260607 h4{'
      + 'margin:0;font-family:"CDHealthReadable","Nanum Myeongjo","Noto Serif KR",serif;'
      + 'font-weight:700;letter-spacing:-.02em;color:var(--h-ink);text-shadow:none;text-wrap:balance}'
      + '.cd-health-wellness-v20260607 h3{font-size:clamp(24px,3.2vw,32px);line-height:1.26}'
      + '.cd-health-wellness-v20260607 h4{font-size:17px;line-height:1.4}'
      + '.cd-health-wellness-v20260607 p,.cd-health-wellness-v20260607 li{'
      + 'font-size:15px;line-height:1.8;font-weight:400;color:var(--h-ink-muted);'
      + 'word-break:keep-all;overflow-wrap:anywhere;text-wrap:pretty}'
      + '.cd-health-wellness-v20260607 p{margin:0}'
      + '.cd-health-wellness-v20260607 b,.cd-health-wellness-v20260607 strong{font-weight:700;color:var(--h-ink)}'
      + '.cd-health-wellness-v20260607 em{font-style:normal}'

      + '.cd-health-stack{display:grid;gap:12px}'

      /* ── 히어로: 오행-장부 다이얼 ─────────────────────────────────────────
         예전 히어로는 3-업 스탯 + 필 3개 + 컨디션 콜아웃 + 등급 카드가 동시에
         경쟁했다. 판독부 하나로 합쳐 강한 오행·비어 있는 오행·오늘 보완을
         한 번에 읽히게 한다. */
      + '.cd-health-dial{display:grid;grid-template-columns:minmax(0,148px) minmax(0,1fr);gap:20px;'
      + 'padding:20px;border:1px solid var(--h-line);border-radius:20px;background:var(--h-surface)}'
      + '.cd-health-dial__id{display:grid;gap:10px;align-content:start;justify-items:start}'
      + '.cd-health-daymark{display:grid;place-items:center;width:84px;height:84px;border-radius:18px;'
      + 'background:var(--health-el-soft,rgba(179,25,85,.08));border:1px solid var(--health-el-border,var(--h-line))}'
      + '.cd-health-daymark span{font-family:"Nanum Myeongjo","Noto Serif KR",serif;font-size:44px;line-height:1;'
      + 'font-weight:800;color:var(--health-el-color,var(--h-accent))}'
      + '.cd-health-dial__name{font-size:16px;font-weight:700;line-height:1.35;color:var(--h-ink)}'
      + '.cd-health-dial__name small{display:block;margin-top:3px;font-size:12px;font-weight:500;color:var(--h-ink-muted)}'
      + '.cd-health-dial__date{font-size:12px;line-height:1.5;color:var(--h-ink-muted);font-variant-numeric:tabular-nums}'

      + '.cd-health-dial__rows{display:grid;gap:7px;margin:0;padding:0;list-style:none}'
      /* 열 폭을 전부 고정한다(트랙만 1fr). 각 행이 독립 그리드라 auto 를 쓰면 행끼리 열이 어긋난다. */
      + '.cd-health-dial__row{display:grid;grid-template-columns:2.9em minmax(0,1fr) 3.1em 4.8em 3.8em;'
      + 'gap:10px;align-items:center;margin:0;padding:0}'
      + '.cd-health-dial__el{font-size:14px;font-weight:700;color:var(--health-el-color,var(--h-ink));white-space:nowrap}'
      + '.cd-health-dial__track{position:relative;height:9px;border-radius:999px;background:rgba(60,24,48,.08);overflow:hidden}'
      + '.cd-health-dial__track i{display:block;height:100%;width:var(--h-fill,0%);border-radius:inherit;'
      + 'background:var(--health-el-color,var(--h-accent))}'
      + '.cd-health-dial__pct{font-size:13px;font-weight:700;text-align:right;color:var(--health-el-color,var(--h-ink));'
      + 'font-variant-numeric:tabular-nums}'
      + '.cd-health-dial__organ{font-size:12px;line-height:1.4;color:var(--h-ink-muted);white-space:nowrap;'
      + 'overflow:hidden;text-overflow:ellipsis}'
      + '.cd-health-dial__mark{display:inline-flex;align-items:center;justify-content:center;min-height:22px;padding:2px 9px;border-radius:999px;'
      + 'font-size:11px;font-weight:700;line-height:1.3;white-space:nowrap;'
      + 'border:1px solid var(--health-el-border,var(--h-line));background:var(--health-el-soft,transparent);'
      + 'color:var(--health-el-color,var(--h-ink))}'
      + '.cd-health-dial__mark--empty{border-color:transparent;background:none}'

      + '.cd-health-dial__read{grid-column:1/-1;display:grid;gap:14px;padding-top:16px;border-top:1px solid var(--h-line-soft)}'
      + '.cd-health-dial__lead{font-size:16px;line-height:1.75;font-weight:600;color:var(--h-ink)}'
      + '.cd-health-dial__score{display:grid;gap:8px;max-width:420px}'
      + '.cd-health-dial__score-head{display:flex;align-items:center;justify-content:space-between;gap:10px}'
      + '.cd-health-dial__score-head span{font-size:12px;font-weight:600;color:var(--h-ink-muted)}'
      + '.cd-health-dial__grade{display:inline-flex;align-items:center;min-height:24px;padding:3px 10px;border-radius:999px;'
      + 'font-size:12px;font-weight:700;border:1px solid var(--h-line);background:rgba(179,25,85,.06);color:var(--h-accent)}'
      /* 점수는 54~96 사이로 clamp 되므로 척도를 숨기지 않고 그대로 보여준다 */
      + '.cd-health-gauge{position:relative;height:6px;border-radius:999px;background:rgba(60,24,48,.08)}'
      + '.cd-health-gauge i{position:absolute;top:50%;left:var(--h-pos,50%);width:14px;height:14px;margin:-7px 0 0 -7px;'
      + 'border-radius:999px;background:var(--h-accent);box-shadow:0 0 0 3px var(--h-surface)}'
      + '.cd-health-dial__scale{display:flex;align-items:baseline;justify-content:space-between;'
      + 'font-size:11px;color:var(--h-ink-muted);font-variant-numeric:tabular-nums}'
      + '.cd-health-dial__scale strong{font-size:22px;font-weight:800;color:var(--h-ink)}'

      /* ── 챕터: 카드 표면을 갖는 유일한 계층 ───────────────────────────── */
      + '.cd-health-chapter{border:1px solid var(--h-line);border-radius:20px;background:var(--h-surface);overflow:hidden}'
      + '.cd-health-chapter__head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;'
      + 'padding:18px 20px;cursor:pointer;list-style:none}'
      + '.cd-health-chapter__head::-webkit-details-marker{display:none}'
      + '.cd-health-chapter__head:focus-visible{outline:2px solid var(--h-accent);outline-offset:-3px;border-radius:20px}'
      + '.cd-health-chapter__title{display:block;font-family:"CDHealthReadable","Nanum Myeongjo","Noto Serif KR",serif;'
      + 'font-size:19px;font-weight:700;line-height:1.35;color:var(--h-ink);letter-spacing:-.02em}'
      + '.cd-health-chapter__lede{display:block;margin-top:5px;font-size:13px;line-height:1.65;color:var(--h-ink-muted)}'
      /* 목차는 접혔을 때만 — 펼치면 바로 아래에 같은 제목들이 실제로 나온다 */
      + '.cd-health-chapter__toc{display:block;margin-top:8px;font-size:12px;line-height:1.6;color:var(--h-accent)}'
      + '.cd-health-chapter[open] .cd-health-chapter__toc{display:none}'
      + '.cd-health-chapter__chev{position:relative;width:26px;height:26px;border-radius:999px;'
      + 'border:1px solid var(--h-line);transition:transform .3s var(--h-ease)}'
      + '.cd-health-chapter__chev:before{content:"";position:absolute;top:8px;left:9px;width:7px;height:7px;'
      + 'border-right:1.5px solid var(--h-accent);border-bottom:1.5px solid var(--h-accent);transform:rotate(45deg)}'
      + '.cd-health-chapter[open] .cd-health-chapter__chev{transform:rotate(180deg)}'
      + '.cd-health-chapter__body{display:grid;gap:22px;padding:2px 20px 20px}'

      /* ── 소제목: 표면 없음. 카드-온-카드가 사라지는 지점이다. ─────────── */
      + '.cd-health-section{display:grid;gap:12px;margin:0;padding:0;background:none;border:0;box-shadow:none}'
      + '.cd-health-section-head{display:grid;gap:4px;padding-bottom:9px;border-bottom:1px solid var(--h-line-soft)}'
      + '.cd-health-section-head h4{color:var(--h-accent)}'
      + '.cd-health-section-head p{font-size:13px;line-height:1.62}'

      /* ── 데이터 표면: 챕터보다 한 단 낮은 톤 하나만 쓴다 ───────────────── */
      + '.cd-health-balance-row,.cd-health-knowledge-card,.cd-health-period-card,.cd-health-remedy-card,'
      + '.cd-health-constitution-grid article,.cd-health-routine-board article,.cd-health-info,.cd-health-food,'
      + '.cd-health-risk,.cd-health-mission,.cd-health-today-card{'
      + 'border:1px solid var(--h-line-soft);border-radius:14px;background:var(--h-raised);padding:16px;box-shadow:none}'

      + '.cd-health-balance-grid,.cd-health-knowledge-grid,.cd-health-period-grid,.cd-health-remedy-grid,'
      + '.cd-health-constitution-grid,.cd-health-routine-board,.cd-health-master,.cd-health-info-grid,'
      + '.cd-health-risk-grid{display:grid;gap:12px}'
      + '.cd-health-balance-grid,.cd-health-knowledge-grid{grid-template-columns:repeat(auto-fit,minmax(248px,1fr))}'
      + '.cd-health-period-grid,.cd-health-remedy-grid,.cd-health-constitution-grid,.cd-health-routine-board,'
      + '.cd-health-master,.cd-health-info-grid{grid-template-columns:repeat(auto-fit,minmax(210px,1fr))}'
      + '.cd-health-knowledge-grid--single,.cd-health-risk-grid{grid-template-columns:minmax(0,1fr)}'
      + '.cd-health-routine-wide{grid-column:1/-1}'

      /* ── 오행 균형 ────────────────────────────────────────────────────── */
      + '.cd-health-balance-row{display:grid;gap:9px;align-content:start}'
      + '.cd-health-balance-row--focus{border-color:var(--health-el-border,var(--h-line));background:var(--health-el-soft,var(--h-raised))}'
      + '.cd-health-balance-head{display:flex;align-items:center;justify-content:space-between;gap:10px}'
      + '.cd-health-balance-name{display:flex;align-items:center;gap:7px;font-size:15px;font-weight:700;color:var(--h-ink)}'
      + '.cd-health-balance-name em{font-size:16px;line-height:1}'
      + '.cd-health-balance-tags{display:flex;flex-wrap:wrap;gap:5px}'
      + '.cd-health-balance-tags b{padding:3px 8px;border-radius:999px;font-size:11px;font-weight:700;line-height:1.3;'
      + 'border:1px solid var(--health-el-border,var(--h-line));background:var(--health-el-soft,transparent);'
      + 'color:var(--health-el-color,var(--h-ink))}'
      + '.cd-health-balance-keyword{font-size:12px;line-height:1.6}'
      + '.cd-health-balance-track{height:8px;border-radius:999px;background:rgba(60,24,48,.08);overflow:hidden}'
      + '.cd-health-balance-track span{display:block;height:100%;border-radius:inherit;background:var(--health-el-color,var(--h-accent))}'
      + '.cd-health-balance-foot{display:flex;align-items:center;justify-content:space-between;gap:10px}'
      + '.cd-health-balance-foot span{font-size:12px;color:var(--h-ink-muted)}'
      + '.cd-health-balance-foot strong{font-size:16px;font-weight:800;font-variant-numeric:tabular-nums;'
      + 'color:var(--health-el-color,var(--h-ink))}'
      + '.cd-health-balance-summary{font-size:13px;line-height:1.7}'

      /* ── 오늘 카드 ────────────────────────────────────────────────────── */
      + '.cd-health-today-card{display:grid;gap:12px}'
      + '.cd-health-today-badge{justify-self:start;padding:4px 11px;border-radius:999px;font-size:11px;font-weight:700;'
      + 'background:var(--h-accent);color:#fffaf7}'
      + '.cd-health-today-lead{font-size:16px;line-height:1.75;font-weight:600;color:var(--h-ink)}'
      + '.cd-health-today-sub{font-size:14px;line-height:1.75}'
      + '.cd-health-today-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:9px}'
      + '.cd-health-today-grid span{padding:11px 12px;border-radius:12px;background:rgba(255,255,255,.72);'
      + 'border:1px solid var(--h-line-soft);font-size:14px;font-weight:700;line-height:1.45;color:var(--h-ink)}'
      + '.cd-health-today-grid b{display:block;margin-bottom:4px;font-size:11px;font-weight:600;color:var(--h-ink-muted)}'

      /* ── 지식 카드 / 소견 카드 ────────────────────────────────────────── */
      + '.cd-health-card-top{display:flex;align-items:flex-start;gap:11px;margin-bottom:11px}'
      + '.cd-health-card-icon{display:grid;place-items:center;flex:0 0 auto;width:36px;height:36px;border-radius:12px;'
      + 'font-size:18px;border:1px solid var(--health-el-border,var(--h-line));background:var(--health-el-soft,rgba(179,25,85,.05))}'
      + '.cd-health-card-top small{display:block;margin-bottom:3px;font-size:12px;font-weight:700;color:var(--h-accent)}'
      + '.cd-health-card-top b{display:block;font-size:16px;line-height:1.45;color:var(--h-ink)}'
      + '.cd-health-card-lead{font-size:14px;line-height:1.8}'
      + '.cd-health-insight-label{display:flex;align-items:center;gap:7px;margin-bottom:10px;'
      + 'font-size:13px;font-weight:700;color:var(--h-accent)}'
      /* 소견 3종은 라벨 색으로만 구분한다 — 카드 배경까지 달리하면 표면이 또 한 겹 늘어난다. */
      + '.cd-health-insight-card--day .cd-health-insight-label{color:var(--h-accent)}'
      + '.cd-health-insight-card--tension .cd-health-insight-label{color:#C43D1E}'
      + '.cd-health-insight-card--recovery .cd-health-insight-label{color:#1F6F5C}'

      /* ── 시기 / 개운 / 체질 / 루틴 ────────────────────────────────────── */
      + '.cd-health-period-num{display:grid;place-items:center;width:26px;height:26px;border-radius:999px;'
      + 'font-size:12px;font-weight:700;border:1px solid var(--h-line);color:var(--h-accent);font-variant-numeric:tabular-nums}'
      + '.cd-health-period-title,.cd-health-remedy-card div,.cd-health-constitution-grid b,.cd-health-routine-board b{'
      + 'display:block;margin-top:8px;font-size:12px;font-weight:700;color:var(--h-accent)}'
      + '.cd-health-period-card b,.cd-health-constitution-grid strong,.cd-health-routine-board strong{'
      + 'display:block;margin-top:4px;font-size:15px;font-weight:700;color:var(--h-ink)}'
      + '.cd-health-period-card p,.cd-health-remedy-card p,.cd-health-constitution-grid p,.cd-health-routine-board p{'
      + 'margin-top:8px;font-size:14px;line-height:1.75}'
      + '.cd-health-period-card em,.cd-health-constitution-grid em,.cd-health-routine-board em{'
      + 'display:block;margin-top:9px;padding-top:8px;border-top:1px solid var(--h-line-soft);'
      + 'font-size:12px;line-height:1.6;font-weight:600;color:var(--h-ink-muted)}'
      + '.cd-health-constitution-grid span{display:grid;place-items:center;width:26px;height:26px;border-radius:999px;'
      + 'font-size:12px;border:1px solid var(--h-line);color:var(--h-accent)}'
      + '.cd-health-period-detail{display:grid;gap:6px;margin:11px 0 0;padding:0;list-style:none}'
      + '.cd-health-period-detail li{position:relative;margin:0;padding:8px 10px 8px 24px;border-radius:10px;'
      + 'background:rgba(255,255,255,.66);border:1px solid var(--h-line-soft);font-size:13px;line-height:1.65}'
      + '.cd-health-period-detail li:before{content:"";position:absolute;left:11px;top:16px;width:4px;height:4px;'
      + 'border-radius:999px;background:var(--h-accent-soft)}'

      /* ── 장부/생활 신호 (접이식) ──────────────────────────────────────── */
      + '.cd-health-risk summary{cursor:pointer;list-style:none}'
      + '.cd-health-risk summary::-webkit-details-marker{display:none}'
      + '.cd-health-risk summary:focus-visible{outline:2px solid var(--h-accent);outline-offset:3px;border-radius:8px}'
      + '.cd-health-risk-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}'
      + '.cd-health-risk-id{display:flex;align-items:center;gap:9px}'
      + '.cd-health-organ-sigil{display:grid;place-items:center;flex:0 0 auto;width:34px;height:34px;border-radius:12px;'
      + 'font-size:16px;border:1px solid var(--health-el-border,var(--h-line));background:var(--health-el-soft,rgba(179,25,85,.05))}'
      + '.cd-health-risk-name{display:block;font-size:14px;font-weight:700;line-height:1.35;color:var(--h-ink)}'
      + '.cd-health-risk-organ{display:block;margin-top:2px;font-size:12px;line-height:1.4;color:var(--h-ink-muted)}'
      + '.cd-health-risk-state{padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap;'
      + 'border:1px solid var(--health-el-border,var(--h-line));background:var(--health-el-soft,transparent);'
      + 'color:var(--health-el-color,var(--h-ink))}'
      + '.cd-health-risk-more{margin-top:11px;padding-top:11px;border-top:1px solid var(--h-line-soft)}'
      + '.cd-health-lede{font-size:12px;font-weight:700;color:var(--h-accent)}'

      /* ── 음식 / 정보 카드 ─────────────────────────────────────────────── */
      /* 추천 5선의 머리글은 카드가 아니다 — 음식 카드가 이 섹션의 카드 계층을 이미 쓰고 있다. */
      + '.cd-health-foods{display:grid;gap:11px;margin-bottom:12px}'
      + '.cd-health-foods-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}'
      + '.cd-health-foods-head b{font-size:15px;font-weight:700;color:var(--h-ink)}'
      + '.cd-health-foods-head .cd-health-chip-row{margin-top:0}'
      + '.cd-health-food-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:11px;'
      + 'margin:0;padding:0;list-style:none}'
      + '.cd-health-food{display:grid;gap:7px}'
      + '.cd-health-food-head{display:flex;align-items:flex-start;gap:9px}'
      + '.cd-health-food-no{display:grid;place-items:center;flex:0 0 auto;width:24px;height:24px;border-radius:999px;'
      + 'font-size:12px;font-weight:700;font-variant-numeric:tabular-nums;'
      + 'border:1px solid var(--health-el-border,var(--h-line));background:var(--health-el-soft,transparent);'
      + 'color:var(--health-el-color,var(--h-ink))}'
      + '.cd-health-food-name{display:block;font-size:14px;font-weight:700;line-height:1.4;color:var(--h-ink)}'
      + '.cd-health-food p{font-size:13px;line-height:1.7}'
      + '.cd-health-info{display:grid;gap:6px;align-content:start}'
      + '.cd-health-info-label{font-size:12px;font-weight:700;color:var(--h-accent)}'
      + '.cd-health-info-value{font-size:15px;font-weight:700;line-height:1.45;color:var(--h-ink)}'
      + '.cd-health-info p{font-size:13px;line-height:1.7}'

      /* ── 칩 · 필 · 미니 리스트 ────────────────────────────────────────── */
      + '.cd-health-chip-row,.cd-health-tag-row{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}'
      + '.cd-health-chip-row span,.cd-health-tag-row i{display:inline-flex;align-items:center;min-height:26px;'
      + 'padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;line-height:1.35;'
      + 'border:1px solid var(--h-line);background:rgba(179,25,85,.05);color:var(--h-accent)}'
      + '.cd-health-mini-list{display:grid;gap:6px;margin:10px 0 0;padding:0;list-style:none}'
      + '.cd-health-mini-list li{position:relative;margin:0;padding:8px 10px 8px 24px;border-radius:10px;'
      + 'background:rgba(255,255,255,.66);border:1px solid var(--h-line-soft);font-size:13px;line-height:1.65}'
      + '.cd-health-mini-list li:before{content:"";position:absolute;left:11px;top:16px;width:4px;height:4px;'
      + 'border-radius:999px;background:var(--h-accent-soft)}'

      /* ── 미션 · 마무리 ────────────────────────────────────────────────── */
      + '.cd-health-mission-list{display:grid;gap:8px;margin:0;padding:0;list-style:none}'
      + '.cd-health-mission{display:flex;align-items:flex-start;gap:11px;margin:0}'
      + '.cd-health-mission-dot{display:grid;place-items:center;flex:0 0 auto;width:24px;height:24px;margin-top:1px;'
      + 'border-radius:999px;font-size:12px;font-weight:700;background:rgba(179,25,85,.08);color:var(--h-accent)}'
      + '.cd-health-mission span:last-child{font-size:15px;line-height:1.7;color:var(--h-ink)}'
      + '.cd-health-avoid{padding:14px 16px;border-radius:14px;font-size:14px;line-height:1.72;'
      + 'border:1px solid rgba(196,61,30,.24);background:rgba(196,61,30,.05);color:#8a2d13}'
      + '.cd-health-avoid b{color:#8a2d13}'
      + '.cd-health-quote{position:relative;margin:0;padding:18px 20px;border-radius:16px;'
      + 'border:1px solid var(--h-line);background:rgba(179,25,85,.04);'
      + 'font-size:15px;line-height:1.8;font-weight:500;color:var(--h-ink);word-break:keep-all}'
      + '.cd-health-quote:before{content:"\\201C";display:block;margin-bottom:4px;font-family:"Nanum Myeongjo",serif;'
      + 'font-size:24px;line-height:1;color:var(--h-accent-soft)}'
      + '.cd-health-note{padding:14px 16px;border-radius:14px;border:1px solid var(--h-line-soft);'
      + 'background:rgba(255,255,255,.55);font-size:12px;line-height:1.7;color:var(--h-ink-muted)}'

      /* ── 모션 ─────────────────────────────────────────────────────────────
         animation(transition 아님)으로 진입시킨다 — 관찰자나 클래스 토글에
         가시성을 걸면 접힌 블록 안에서 렌더될 때 영영 보이지 않을 수 있다. */
      + '.cd-health-dial,.cd-health-chapter{animation:cdHealthRise .4s var(--h-ease) both}'
      + '.cd-health-chapter:nth-of-type(2){animation-delay:.04s}'
      + '.cd-health-chapter:nth-of-type(3){animation-delay:.08s}'
      + '@keyframes cdHealthRise{from{opacity:.001;transform:translateY(6px)}to{opacity:1;transform:none}}'
      + '@media(prefers-reduced-motion:reduce){'
      + '.cd-health-dial,.cd-health-chapter{animation:none}'
      + '.cd-health-chapter__chev{transition:none}}'

      /* ── 모바일 ───────────────────────────────────────────────────────── */
      + '@media(max-width:640px){'
      + '.cd-health-wellness-v20260607{padding:12px;border-radius:18px}'
      + '.cd-health-dial{grid-template-columns:minmax(0,1fr);gap:16px;padding:16px;border-radius:18px}'
      + '.cd-health-dial__id{grid-template-columns:auto minmax(0,1fr);align-items:center;gap:6px 14px}'
      + '.cd-health-daymark{grid-row:span 2;width:66px;height:66px}'
      + '.cd-health-daymark span{font-size:34px}'
      + '.cd-health-dial__date{align-self:start}'
      /* 좁은 폭에서는 막대 길이가 %를 대신한다 — 숫자를 지워 트랙 폭을 확보한다.
         (퍼센트는 트랙의 aria-label 에 남아 있어 스크린리더에서는 사라지지 않는다.)
         여기서도 열 폭은 고정한다 — auto 로 두면 장부명 길이가 달라 행끼리 어긋난다. */
      + '.cd-health-dial__row{grid-template-columns:2.6em minmax(0,1fr) 5.4em 3.6em;gap:8px}'
      + '.cd-health-dial__pct{display:none}'
      + '.cd-health-chapter{border-radius:18px}'
      + '.cd-health-chapter__head{padding:15px 16px}'
      + '.cd-health-chapter__title{font-size:17px}'
      + '.cd-health-chapter__body{gap:18px;padding:2px 16px 16px}'
      + '.cd-health-balance-grid,.cd-health-knowledge-grid,.cd-health-period-grid,.cd-health-remedy-grid,'
      + '.cd-health-constitution-grid,.cd-health-routine-board,.cd-health-master,.cd-health-info-grid,'
      + '.cd-health-food-list{grid-template-columns:minmax(0,1fr)}'
      + '.cd-health-today-grid{grid-template-columns:repeat(2,minmax(0,1fr))}'
      + '}'
      + '@media(max-width:380px){.cd-health-today-grid{grid-template-columns:minmax(0,1fr)}}'
      + '</style>';
  }

  function isHealthPlainObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function hasHealthPlainObjectData(value) {
    return isHealthPlainObject(value) && Object.keys(value).length > 0;
  }

  function readHealthGlobalPath(path) {
    try {
      return String(path).split('.').reduce(function (obj, key) {
        return obj && obj[key];
      }, w);
    } catch (_) {
      return null;
    }
  }

  function pickHealthGlobalObject(paths) {
    for (var i = 0; i < paths.length; i++) {
      var value = readHealthGlobalPath(paths[i]);
      if (hasHealthPlainObjectData(value)) return value;
    }
    return null;
  }

  function mergeHealthInput(primary, fallback) {
    if (!hasHealthPlainObjectData(primary)) return hasHealthPlainObjectData(fallback) ? fallback : (primary || {});
    if (!hasHealthPlainObjectData(fallback)) return primary;
    return Object.assign({}, fallback, primary);
  }

  function resolveHealthReportInputs(p, natal, johu, pw, jg) {
    var profileFallback = pickHealthGlobalObject([
      '__cdCurrentDestinyProfile',
      '__cdCurrentDestinyProfile.profile',
      '__CURRENT_SAJU_PROFILE__',
      'CURRENT_SAJU_PROFILE',
      'CURRENT_PROFILE',
      'currentProfile',
      'sajuProfile',
      'profileData',
      'USER_PROFILE'
    ]);
    var natalFallback = pickHealthGlobalObject([
      '__cdCurrentDestinyProfile.natal',
      '__cdCurrentDestinyProfile.saju',
      '__cdCurrentDestinyProfile.bazi',
      '__CURRENT_NATAL__',
      'CURRENT_NATAL',
      'currentNatal',
      'sajuNatal',
      'natalData',
      'sajuData',
      'baziData',
      'birthSaju'
    ]);
    var johuFallback = pickHealthGlobalObject([
      '__cdCurrentDestinyProfile.johu',
      '__CURRENT_JOHU__',
      'CURRENT_JOHU',
      'johuResult',
      'johuData',
      'currentJohu'
    ]);
    var powerFallback = pickHealthGlobalObject([
      '__cdCurrentDestinyProfile.power',
      '__cdCurrentDestinyProfile.eokbu',
      '__CURRENT_POWER__',
      'CURRENT_POWER',
      'powerResult',
      'eokbuResult',
      'pwResult',
      'currentPower'
    ]);
    var jongFallback = pickHealthGlobalObject([
      '__cdCurrentDestinyProfile.jong',
      '__cdCurrentDestinyProfile.jonggyeok',
      '__CURRENT_JONGGYEOK__',
      'CURRENT_JONGGYEOK',
      'jongResult',
      'jonggyeokResult',
      'jgResult'
    ]);
    return {
      p: mergeHealthInput(p, profileFallback),
      natal: mergeHealthInput(natal, natalFallback || (profileFallback && (profileFallback.natal || profileFallback.saju || profileFallback.bazi))),
      johu: mergeHealthInput(johu, johuFallback),
      pw: mergeHealthInput(pw, powerFallback),
      jg: mergeHealthInput(jg, jongFallback)
    };
  }

  function buildWellnessHealthReport(p, natal, johu, pw, jg) {
    natal = natal || {};
    johu = johu || {};
    var ratios = getHealthRatios(natal, p);
    var sorted = HEALTH_ELEMENT_ORDER.slice().sort(function (a, b) { return ratios[b] - ratios[a]; });
    var strongestEl = sorted[0] || 'earth';
    var weakestEls = sorted.slice(-2).reverse();
    var controlImpacts = getHealthControlImpacts(ratios);
    var axes = getHealthTargetAxes(pw, jg, johu, controlImpacts);
    var rawTodayEl = getTodayHealthElement();
    var computedTodayEl = rawTodayEl || getHealthFallbackTodayElement();
    var hasTodayElement = !!rawTodayEl;
    var todayEl = computedTodayEl || strongestEl;
    var condition = getTodayConditionCopyV2(todayEl, axes.targetEl, axes.avoidEl, strongestEl);
    if (!hasTodayElement) {
      condition = {
        lead: _entertainText("ee_4488_prop_lead"),
        second: '조후와 억부를 함께 놓으면, 강한 오행을 더 쓰기보다 비어 있는 오행을 생활 속에서 천천히 채우는 쪽이 좋습니다.'
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
      return '<article class="cd-health-risk"' + healthElVars(el) + '>'
        + '<details>'
        + '<summary>'
        + '<span class="cd-health-risk-head">'
        + '<span class="cd-health-risk-id">'
        + '<span class="cd-health-organ-sigil" aria-hidden="true">' + escapeHealthHtml(EL_ICON[el] || '✨') + '</span>'
        + '<span>'
        + '<b class="cd-health-risk-name">' + EL_NAME[el] + '</b>'
        + '<span class="cd-health-risk-organ">' + EL_ORGAN[el] + ' 리듬 · ' + getHealthStateBrief(state) + '</span>'
        + '</span>'
        + '</span>'
        + '<span class="cd-health-risk-state">' + getHealthStateLabel(state) + '</span>'
        + '</span>'
        + '<p><b class="cd-health-lede">생활 신호</b><br>' + guide[0] + '</p>'
        + '</summary>'
        + '<div class="cd-health-risk-more">'
        + '<p><b class="cd-health-lede">관리 포인트</b><br>' + guide[1] + '</p>'
        + '</div>'
        + '</details>'
        + '</article>';
    }).join('');

    var missionList = [
      '오늘의 회복 루틴에서 식단 항목 1가지만 선택하기',
      '오늘의 회복 루틴에서 움직임 항목을 한 번 완료하기',
      '잠들기 전 회복을 방해하는 자극 하나 줄이기'
    ];
    var grade = getHealthConditionGrade(riskKeys, ratios, controlImpacts);
    var routineFocus = getHealthRoutineFocus(axes.targetEl);
    var dayMaster = getHealthDayMasterElement(p, natal, strongestEl);
    var dayMasterHero = getHealthDayMasterHeroCopy(dayMaster);
    var masterReadingHtml = renderHealthMasterReading(strongestEl, weakestEls, axes, ratios, controlImpacts, johu);
    var balanceHtml = '<div class="cd-health-balance-grid">' + renderHealthBalanceBars(ratios, axes.targetEl, axes.avoidEl, controlImpacts) + '</div>';
    var todaySummaryHtml = renderTodayHealthSummaryCard(condition, grade, axes, routineFocus, strongestEl, controlImpacts, dayMaster);
    var constitutionHtml = renderConstitutionCards(strongestEl, weakestEls);
    var periodHtml = renderHealthPeriodTimeline(axes.targetEl, axes.avoidEl, strongestEl, todayEl);
    var remedyHtml = renderHealthRemedyBoard(axes.targetEl, axes.avoidEl);
    var routineHtml = renderRecoveryRoutineBoard(axes.targetEl, axes.avoidEl);
    var tensionHtml = renderHealthTensionAxis(controlImpacts, ratios, axes);
    var dayMasterHtml = renderDayMasterHealthInsight(p, natal, dayMaster.element || todayEl || strongestEl);
    var tenGodHtml = renderTenGodHealthInsights(p, natal, ratios, controlImpacts);
    var seasonalHtml = renderSeasonalHealthInsight(johu, axes.targetEl);
    var johuProfile = getHealthJohuProfile(johu, ratios);
    var johuDeepHtml = renderJohuDeepDive(johu, ratios, axes.targetEl, axes.avoidEl);
    var weaknessHtml = renderHealthWeaknessDeepDive(weakestEls, axes, ratios, controlImpacts, johu);
    var profileName = String((p && (p.name || p.profileName || p.userName || p.nickname || p.birthName || p.displayName)) || '').trim();
    var heroName = profileName ? profileName + '님' : '당신';
    var targetRatio = Number(ratios[axes.targetEl] || 0);
    var avoidRatio = Number(ratios[axes.avoidEl] || 0);
    var rawRhythmScore = 88 - (controlImpacts.length * 5) - Math.abs(avoidRatio - targetRatio) * 0.18;
    var rhythmScore = Math.max(54, Math.min(96, Math.round(Number.isFinite(rawRhythmScore) ? rawRhythmScore : 72)));
    var heroHeadline = escapeHealthHtml(heroName + '의 일간으로 살피는 오늘의 건강운');
    var healingQuote = '오늘은 몸을 설득하려 애쓰지 않아도 됩니다. 물 한 잔, 어깨 한 번, 잠드는 시간 십 분만으로도 회복의 문은 조금씩 열립니다.';
    var heroEl = dayMaster.element || strongestEl;
    var heroKnowledge = getHealthKnowledge(heroEl);
    var heroHanja = heroKnowledge.hanja || (EL_NAME[heroEl] || '').replace(/^[^(]*\(|\)$/g, '') || '土';
    var nowForHealth = new Date();
    var weekLabels = ['일', '월', '화', '수', '목', '금', '토'];
    var todayDateLabel = nowForHealth.getFullYear() + '년 ' + (nowForHealth.getMonth() + 1) + '월 ' + nowForHealth.getDate() + '일 (' + weekLabels[nowForHealth.getDay()] + ')';

    /* ── 오행-장부 다이얼 ────────────────────────────────────────────────
       예전 히어로는 3-업 스탯 · 필 3개 · 컨디션 콜아웃 · 등급 카드가 동시에
       경쟁해 무엇을 먼저 읽어야 할지 알 수 없었다. 판독부 하나로 합쳐
       "강한 오행 / 비어 있는 오행 / 오늘 보완할 자리"를 한 번에 읽게 한다.
       오행→장부 매핑(EL_ORGAN)은 이 기능의 개념축이므로 꼬리표가 아니라 한 열로 세운다. */
    var dialRowsHtml = HEALTH_ELEMENT_ORDER.map(function (el) {
      var value = Math.max(0, Math.min(100, Math.round(Number(ratios[el] || 0))));
      var mark = el === axes.targetEl ? '보완' : (el === axes.avoidEl ? '주의' : '');
      return '<li class="cd-health-dial__row"' + healthElVars(el) + '>'
        + '<span class="cd-health-dial__el">' + escapeHealthHtml(String(EL_NAME[el] || '').charAt(0)) + '</span>'
        + '<span class="cd-health-dial__track" role="img" aria-label="' + escapeHealthHtml(EL_NAME[el]) + ' ' + value + '퍼센트">'
        + '<i style="--h-fill:' + value + '%"></i></span>'
        + '<span class="cd-health-dial__pct" aria-hidden="true">' + value + '%</span>'
        + '<span class="cd-health-dial__organ">' + escapeHealthHtml(EL_ORGAN[el]) + '</span>'
        + (mark
          ? '<span class="cd-health-dial__mark">' + mark + '</span>'
          : '<span class="cd-health-dial__mark cd-health-dial__mark--empty" aria-hidden="true"></span>')
        + '</li>';
    }).join('');

    // 리듬 점수는 54~96 사이로 clamp 된다. 척도를 숨기면 88이 무슨 뜻인지 알 수 없으므로 함께 보여준다.
    var gaugePos = Math.round(((rhythmScore - 54) / (96 - 54)) * 100);
    var dialNote = hasTodayElement
      ? escapeHealthHtml(grade.body)
      : '<b>선천 체질 기준 안내</b> ' + escapeHealthHtml(condition.second);

    var dialHtml = '<header class="cd-health-dial">'
      + '<div class="cd-health-dial__id">'
      + '<div class="cd-health-daymark"' + healthElVars(heroEl) + '><span>' + escapeHealthHtml(heroHanja) + '</span></div>'
      + '<div class="cd-health-dial__name">' + escapeHealthHtml(dayMaster.label) + '<small>' + escapeHealthHtml(dayMasterHero.title) + '</small></div>'
      + '<div class="cd-health-dial__date">' + escapeHealthHtml(todayDateLabel) + '</div>'
      + '</div>'
      + '<div>'
      + '<h3>' + heroHeadline + '</h3>'
      + '<ul class="cd-health-dial__rows">' + dialRowsHtml + '</ul>'
      + '</div>'
      + '<div class="cd-health-dial__read">'
      + '<p class="cd-health-dial__lead">' + condition.lead + '</p>'
      + '<div class="cd-health-dial__score">'
      + '<div class="cd-health-dial__score-head"><span>종합 리듬 점수</span>'
      + '<b class="cd-health-dial__grade">' + escapeHealthHtml(grade.label) + '</b></div>'
      + '<div class="cd-health-gauge" role="img" aria-label="종합 리듬 점수 ' + rhythmScore + '점, 54점에서 96점 사이">'
      + '<i style="--h-pos:' + gaugePos + '%"></i></div>'
      + '<div class="cd-health-dial__scale"><span>54</span><strong>' + rhythmScore + '</strong><span>96</span></div>'
      + '<p>' + dialNote + '</p>'
      + '</div>'
      + '</div>'
      + '</header>';

    // 히어로에서 뺀 서술은 삭제가 아니라 제 주제의 챕터로 옮긴다.
    var dayMasterIntroHtml = '<div class="cd-health-info"' + healthElVars(heroEl) + '>'
      + '<div class="cd-health-info-label">' + escapeHealthHtml(dayMasterHero.title) + '</div>'
      + '<p>' + escapeHealthHtml(dayMasterHero.body + ' ' + dayMasterHero.key) + '</p>'
      + '</div>' + dayMasterHtml;
    var johuIntroHtml = '<div class="cd-health-info">'
      + '<div class="cd-health-info-label">조후 리듬 · ' + escapeHealthHtml(johuProfile.shortLabel) + '</div>'
      + '<p>' + escapeHealthHtml(johuProfile.heroCare) + '</p>'
      + '</div>' + johuDeepHtml;

    var constitutionChapter = renderHealthChapter('체질', '타고난 몸의 기본값 — 일간, 원국의 강약, 십성이 만드는 소모 습관까지.',
      renderHealthSection('일간별 체질 리듬', '태어난 날의 천간을 기준으로 몸이 회복되는 방식을 살핍니다.', dayMasterIntroHtml)
      + renderHealthSection('선천 체질 베이스', '원국에서 강하게 쓰이는 기운과 쉽게 피로해지는 기운을 나눠봅니다.', constitutionHtml)
      + renderHealthSection('십성별 스트레스 패턴', '십성이 강하게 움직일 때 몸이 소모되는 습관을 짚습니다.', tenGodHtml)
      + renderHealthSection('명리학자 소견', '일간, 조후, 오행 강약을 겹쳐 오늘 낮출 긴장과 살릴 리듬을 짚습니다.', masterReadingHtml),
      false);

    var flowChapter = renderHealthChapter('흐름', '조후와 계절, 그리고 오늘·이번 주·이번 달로 이어지는 시간의 결.',
      renderHealthSection('조후 심층 리듬', '몸의 열감, 차가움, 건조함, 무거움을 조후 관점에서 함께 살핍니다.', johuIntroHtml)
      + renderHealthSection('계절·조후 건강운', '계절의 온도와 습도에 맞춰 보완할 오행을 고릅니다.', seasonalHtml)
      + renderHealthSection('시기별 건강운', '오늘, 이번 주, 이번 달, 계절 전환기에 챙길 생활 리듬입니다.', periodHtml),
      false);

    var closingHtml = '<blockquote class="cd-health-quote">' + escapeHealthHtml(healingQuote) + '</blockquote>'
      + '<p class="cd-health-note">' + escapeHealthHtml(HEALTH_REPORT_DISCLAIMER) + '</p>';

    if (!hasTodayElement) {
      return renderHealthWellnessStyle()
        + '<div class="cd-health-wellness-v20260607" role="region" aria-label="명리 헬스 리포트" data-marker="health-wellness-healing-v20260617" data-legacy-marker="달빛 웰니스 클리닉">'
        + '<div class="cd-health-stack">'
        + dialHtml
        + renderHealthChapter('오늘', '일진 데이터가 없어 선천 체질을 기준으로 오늘의 컨디션을 읽습니다.',
          renderHealthSection('오늘의 건강운 카드', '오늘 몸이 먼저 반응하기 쉬운 자리부터 차분히 짚습니다.', todaySummaryHtml),
          true)
        + renderHealthChapter('오행 균형', '강한 오행과 비어 있는 오행, 그리고 그 사이에 걸리는 긴장을 봅니다.',
          renderHealthSection('오행 균형 체크', '강한 오행과 비어 있는 오행을 함께 보며 생활관리 우선순위를 잡습니다.', balanceHtml)
          + renderHealthSection('취약 오행 심층 소견', '약한 오행이 어떤 생활 신호로 나타나기 쉬운지 구체적으로 짚습니다.', weaknessHtml)
          + renderHealthSection('오늘의 압박 축', '오행의 생극 관계에서 긴장이 걸리는 자리를 살핍니다.', tensionHtml),
          true)
        + constitutionChapter
        + flowChapter
        + renderHealthChapter('실천', '오늘 바로 해볼 수 있는 보완법입니다.',
          renderHealthSection('오행 개운법', '몸과 공간을 가볍게 정돈하는 현실적인 보완법을 권합니다.', remedyHtml),
          false)
        + closingHtml
        + '</div>'
        + '</div>';
    }

    var tuneHtml = '<div class="cd-health-info-grid">'
      + renderHealthInfoCard('오늘 필요한 오행', EL_NAME[axes.targetEl], '부족하거나 압박받는 축을 먼저 보완해 컨디션의 중심을 잡습니다.', axes.targetEl)
      + renderHealthInfoCard('오늘 줄여야 할 오행', EL_NAME[axes.avoidEl], '과열되기 쉬운 자극을 줄이면 다른 장부 리듬의 부담이 낮아집니다.', axes.avoidEl)
      + renderHealthInfoCard('오늘 머무르면 좋은 습관', '리듬 안정 · 자극 낮추기 · 회복 여백', '작은 회복 행동 하나가 몸의 균형을 다시 불러옵니다.', '')
      + '</div>';

    var missionHtml = '<ol class="cd-health-mission-list">'
      + missionList.map(function (mission) {
        return '<li class="cd-health-mission">'
          + '<span class="cd-health-mission-dot" aria-hidden="true">✓</span>'
          + '<span>' + escapeHealthHtml(mission) + '</span>'
          + '</li>';
      }).join('')
      + '</ol>'
      + '<div class="cd-health-avoid"><b>오늘 피해야 할 패턴:</b> ' + escapeHealthHtml(HEALTH_AVOID_PLAN[axes.avoidEl] || HEALTH_AVOID_PLAN.earth) + '</div>';

    // 추천 5선은 헤더를 카드로 감싸지 않는다 — 음식 카드 자체가 이 섹션의 카드 계층이다.
    var teaHtml = '<div class="cd-health-foods">'
      + '<div class="cd-health-foods-head"><b>오늘의 추천 5선</b>'
      + '<span class="cd-health-chip-row"><span>' + EL_NAME[axes.targetEl] + '</span></span></div>'
      + '<ul class="cd-health-food-list">' + renderHealthFoodList(axes.targetEl) + '</ul>'
      + '</div>'
      + '<div class="cd-health-info-grid">'
      + renderHealthInfoCard('운동', '무리하지 않는 회복 움직임', HEALTH_MOVEMENT_PLAN[axes.targetEl] || HEALTH_MOVEMENT_PLAN.earth, axes.targetEl)
      + renderHealthInfoCard('휴식', '자극 낮추기', '취침 전 30분은 강한 화면과 감정 소모 대화를 줄이세요.', '')
      + renderHealthInfoCard('환경', '몸이 편한 공간 만들기', HEALTH_ENV_PLAN[axes.targetEl] || HEALTH_ENV_PLAN.earth, '')
      + '</div>';

    return renderHealthWellnessStyle()
      + '<div class="cd-health-wellness-v20260607" role="region" aria-label="명리 헬스 리포트" data-marker="health-wellness-healing-v20260617" data-legacy-marker="달빛 웰니스 클리닉">'
      + '<div class="cd-health-stack">'
      + dialHtml

      + renderHealthChapter('오늘', '오늘 하루 몸이 먼저 반응할 자리와, 지금 좁혀야 할 한 가지.',
        renderHealthSection('오늘의 건강운 카드', '오늘 몸이 먼저 반응하기 쉬운 자리부터 차분히 짚습니다.', todaySummaryHtml)
        + renderHealthSection('오늘의 오행 조율', '일진과 원국을 함께 놓고 오늘 먼저 챙길 일을 좁힙니다.', tuneHtml)
        + renderHealthSection('오늘의 헬스 미션', '오늘 몸이 편안히 받아들일 세 가지 약속입니다.', missionHtml),
        true)

      + renderHealthChapter('오행 균형', '강한 오행과 비어 있는 오행, 그리고 그 사이에 걸리는 긴장을 봅니다.',
        renderHealthSection('오행 균형 체크', '목·화·토·금·수의 강약을 보며 생활관리 우선순위를 잡습니다.', balanceHtml)
        + renderHealthSection('취약 오행 심층 소견', '약한 오행이 어떤 생활 신호로 나타나기 쉬운지 구체적으로 짚습니다.', weaknessHtml)
        + renderHealthSection('오늘의 압박 축', '오행의 생극 관계에서 긴장이 걸리는 자리를 살핍니다.', tensionHtml),
        true)

      + constitutionChapter
      + flowChapter

      + renderHealthChapter('실천', '먹고, 움직이고, 쉬는 자리 — 오늘 바로 해볼 수 있는 것들.',
        renderHealthSection('오늘의 회복 루틴', '오늘 몸이 바로 받아들이기 쉬운 음식, 움직임, 휴식입니다.', routineHtml)
        + renderHealthSection('추천 음식과 차', '보완 오행에 맞춰 부담 적은 음식과 차를 권합니다.', teaHtml)
        + renderHealthSection('오행 개운법', '몸과 공간을 가볍게 정돈하는 현실적인 보완법을 권합니다.', remedyHtml)
        + renderHealthSection('장부/생활 신호', '오늘 민감해지기 쉬운 생활 신호와 관리 포인트를 나눕니다.',
          '<div class="cd-health-risk-grid">' + riskHtml + '</div>'),
        false)

      + closingHtml
      + '</div>'
      + '</div>';
  }


  /* ════════════════════════════════════════════════════════
     §5  원본 함수 오버라이드
         (saju-engine.js 이후 로드되므로 안전하게 교체 가능)
     ════════════════════════════════════════════════════════ */

  // ① 명리 헬스 리포트 — 웰니스 6블록 단일 구조
  // 챕터를 펼치면 대시보드가 .rpt-v2-detail 의 --rpt-open-height 를 다시 재야 한다.
  // reportDashboard 의 MutationObserver 는 attributeFilter 가 ['style','class'] 라 <details> 의
  // open 속성 변경을 보지 못하고, ResizeObserver 하나만 안전망으로 남는다. 그 사각지대를 직접 메운다.
  function bindHealthChapterHeightSync(area, card) {
    if (!area || !card || typeof area.querySelectorAll !== 'function') return;
    var chapters = area.querySelectorAll('details.cd-health-chapter');
    if (!chapters || !chapters.length) return;
    Array.prototype.forEach.call(chapters, function (chapter) {
      chapter.addEventListener('toggle', function () {
        if (typeof w.syncReportHeightFromNode !== 'function') return;
        w.syncReportHeightFromNode(card);
        setTimeout(function () { w.syncReportHeightFromNode(card); }, 240);
      });
    });
  }

  var _origHealth = w.renderHealthReport;
  w.renderHealthReport = function (p, natal, johu, pw, jg) {
    var area = document.getElementById('healthReportSection');
    var card = document.getElementById('healthReportCard');
    if (!area || !card) return;

    try {
      var resolved = resolveHealthReportInputs(p, natal, johu || {}, pw, jg);
      area.innerHTML = buildWellnessHealthReport(resolved.p, resolved.natal, resolved.johu || {}, resolved.pw, resolved.jg);
      card.style.display = 'block';
      bindHealthChapterHeightSync(area, card);
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
    var area = document.getElementById('skillTreeSection');
    if (!area) return;
    var card = document.getElementById('skillTreeCard');
    try {
      _origSkillTree && _origSkillTree(p, natal);
    } catch (originalError) {
      console.warn('[entertain-rpg] original skill tree failed:', originalError);
    }
    var legacyQuest = document.getElementById('entQuestSection');
    if (legacyQuest && legacyQuest.parentNode) legacyQuest.parentNode.removeChild(legacyQuest);
    var oldRoot = document.getElementById('entRpgSection');
    if (oldRoot && oldRoot.parentNode) oldRoot.parentNode.removeChild(oldRoot);
    var questEl = document.createElement('div');
    try {
      questEl.innerHTML = buildRpgTemplate({ loading: true }, p);
    } catch (error) {
      questEl.innerHTML = buildRpgCrashFallbackTemplate('클래스 시트의 하단 기운을 다시 정렬하고 있습니다.');
    }
    var questNode = questEl.firstElementChild || questEl;
    area.appendChild(questNode);
    if (card) {
      card.style.display = 'block';
      card.style.visibility = 'visible';
    }
    _scheduleReveal(area);
    syncRpgLayoutHeight(questNode);
    loadRpgStatus(questNode, p);
  };

  // ③ 테토-에겐 — 원본 테토/에겐 카드 디자인을 유지하고, 상세 리포트 게이트만 이어 붙인다.
  var _origHormone = w.renderHormoneVibe;
  w.renderHormoneVibe = function (p, power) {
    var section = document.getElementById('hormone-vibe-section');
    var target = document.getElementById('hormoneVibeResult');
    if (!section || !target) return;

    var renderedOriginal = false;
    if (typeof _origHormone === 'function') {
      try {
        _origHormone(p, power);
        renderedOriginal = true;
      } catch (origErr) {
        console.warn('[entertain-tetoegen] original render fallback:', origErr);
      }
    }

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
    var oldGate = target.querySelector('[data-tetogen-deep-shell]');
    if (oldGate && oldGate.parentNode) oldGate.parentNode.removeChild(oldGate);
    if (!renderedOriginal || !String(target.innerHTML || '').trim()) {
      target.innerHTML = buildTetoEgenResultSection(vibe);
    }
    target.insertAdjacentHTML('beforeend', buildTetogenDeepReportGate(vibe, p || {}, power || {}, hapData));
    bindTetogenDeepReportGate(target, vibe, p || {}, power || {}, hapData);
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
