/* ═══════════════════════════════════════════════════════════
   entertain-engine.js  — CodeDestiny Entertain Engine v2
   네임스페이스: CodeDestiny_Entertain

   기능 1: 명리 헬스 리포트 — 본문은 서버로 옮겼다(worker/lib/saju-section/paid-health.src.js)
   기능 2: RPG 캐릭터 일일 퀘스트 (localStorage EXP 시스템)
   기능 3: 테토-에겐 심화 분석 (양자 합화 기반 숨겨진 본성)

   작동 원리: saju-engine.js 이후에 로드되어
             renderSkillTree, renderHormoneVibe
             두 함수를 오버라이드(교체/확장) 합니다.
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
  var TETOGEN_DEEP_REPORT_COST = 50;
  var TETOGEN_DEEP_REPORT_KRW = 5000;

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

  /* ── 결제 후 자동 재개(모바일 리다이렉트 복귀) ───────────────────────────────
     🔴 모바일 PortOne 은 상위 프레임을 리다이렉트하므로 게이트의 await 가 페이지와 함께 죽고
     onGranted 가 실행되지 않는다 — 결제하고 돌아오면 홈 화면이던 증상의 정체다.
     상세 리포트는 전부 클라이언트 계산이라 해금 표식만 남으면 열리므로 서술자에 담을 입력이 없다.
     여는 코어(reveal)가 렌더 클로저 안에 있어 바인딩할 때마다 전역에 최신 것을 걸어 둔다.
     🔴 핸들러 안에서 화면을 또 열지 않는다 — 표면은 checkout-entry 의 runPaidResume 이 딥링크로 연다.
     계약 정본: js/core/checkout-entry.js */
  var TETOGEN_DEEP_REPORT_RESUME_KIND = 'tetogen-deep-report';
  var TETOGEN_RESUME_WAIT_MS = 8000;
  var TETOGEN_RESUME_POLL_MS = 200;

  function runTetogenDeepReportResume() {
    return new Promise(function (resolve) {
      var deadline = Date.now() + TETOGEN_RESUME_WAIT_MS;
      (function poll() {
        // 🔴 전역을 미리 지우지 않는다 — 이 코어는 스스로 다시 그리지 않아 지우면 다시 걸릴 일이 없다.
        if (typeof w._cdRevealTetogenDeepReportCore === 'function') {
          try { w._cdRevealTetogenDeepReportCore(null); } catch (_) { resolve(false); return; }
          resolve(true);
          return;
        }
        // 상한까지 못 찾으면 false — 복귀 처리가 '지금 열기' 카드를 그린다(영수증이 남아 재클릭은 무료다).
        if (Date.now() >= deadline) { resolve(false); return; }
        setTimeout(poll, TETOGEN_RESUME_POLL_MS);
      })();
    });
  }

  (function registerTetogenDeepReportResumeHandler() {
    var entry = null;
    try { entry = w.__cdCheckoutEntry || null; } catch (_) { entry = null; }
    if (!entry || typeof entry.registerPaidResumeHandler !== 'function') return;
    try { entry.registerPaidResumeHandler(TETOGEN_DEEP_REPORT_RESUME_KIND, runTetogenDeepReportResume); } catch (_) {}
  })();

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
      + '<strong>' + TETOGEN_DEEP_REPORT_KRW.toLocaleString('ko-KR') + '원</strong>'
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
    import('./core/oracle/crafted-details.mjs').then(function (m) { m.mountOracleCraftedDetails(root, { target: '[data-tetogen-deep-shell]', id: 'teto-egen-deep', title: '테토·에겐 상세 리포트' }); });
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

    // 결제 후 복귀는 이 클로저를 잃으므로, 바인딩할 때마다 최신 것을 전역에 걸어 둔다.
    // 🔴 아래 early return 앞에 둔다 — 뒤에 두면 이미 해금된 렌더에서 코어가 안 걸린다.
    w._cdRevealTetogenDeepReportCore = reveal;

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
        action: 'cdSajuTabEntry',
        resume: { kind: TETOGEN_DEEP_REPORT_RESUME_KIND, action: 'cdSajuTabEntry', args: {} },
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


  // ① 명리 헬스 리포트(rpt_healthReportCard) 본문은 서버로 옮겼다(worker/lib/saju-section/paid-health.src.js).
  //    해금을 확인한 뒤 /api/saju/section 이 만들고 js/core/saju/section-client.js 가 배달한다.
  //    결과 계산 직후에는 무료 스텁(js/saju-engine-tarot-sukuyo-quantum.js renderHealthReportStub)만 깔린다.

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
