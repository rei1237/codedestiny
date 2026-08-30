/**
 * fortune-engine.js
 * 운세 페이지 콘텐츠 생성 엔진
 * - 날짜 + 대상 기반 결정론적 운세 생성 (새로고침해도 동일)
 * - 띠(animal) / 별자리(zodiac) 지원
 * - today / tomorrow / weekly / monthly 기간 지원
 * - 구조화 데이터(Article + FAQ + BreadcrumbList) 자동 삽입
 * - /fortune/data/daily-YYYY-MM-DD.json (오늘 기간) 시 다국어·CTA·직장운 오버레이
 */
(function(global) {
  'use strict';

  /* ── i18n 키 (프롬프트 v3: kr en jp cn fr nl vi ms) ── */
  function resolveLangKey() {
    try {
      var q = new URLSearchParams(global.location.search || '').get('lang');
      if (q) {
        q = String(q).toLowerCase().replace(/_/g, '-');
        if (q === 'ko' || q === 'kr') return 'kr';
        if (q === 'en' || q === 'en-us' || q === 'en-gb') return 'en';
        if (q === 'ja' || q === 'jp') return 'jp';
        if (q === 'zh' || q === 'zh-cn' || q === 'cn') return 'cn';
        if (q === 'fr' || q === 'fr-fr') return 'fr';
        if (q === 'nl' || q === 'nl-nl') return 'nl';
        if (q === 'vi' || q === 'vi-vn') return 'vi';
        if (q === 'ms' || q === 'ms-my') return 'ms';
      }
      var htmlLang = (document.documentElement && document.documentElement.lang) || '';
      htmlLang = String(htmlLang).toLowerCase();
      if (htmlLang.indexOf('ko') === 0) return 'kr';
      if (htmlLang.indexOf('en') === 0) return 'en';
      if (htmlLang.indexOf('ja') === 0) return 'jp';
      if (htmlLang.indexOf('zh') === 0) return 'cn';
      if (htmlLang.indexOf('fr') === 0) return 'fr';
      if (htmlLang.indexOf('nl') === 0) return 'nl';
      if (htmlLang.indexOf('vi') === 0) return 'vi';
      if (htmlLang.indexOf('ms') === 0) return 'ms';
      var nav = (navigator.language || 'ko').toLowerCase();
      if (nav.indexOf('ko') === 0) return 'kr';
      if (nav.indexOf('en') === 0) return 'en';
      if (nav.indexOf('ja') === 0) return 'jp';
      if (nav.indexOf('zh') === 0) return 'cn';
      if (nav.indexOf('fr') === 0) return 'fr';
      if (nav.indexOf('nl') === 0) return 'nl';
      if (nav.indexOf('vi') === 0) return 'vi';
      if (nav.indexOf('ms') === 0) return 'ms';
    } catch (e) {}
    return 'kr';
  }

  function pickI18n(obj, langKey) {
    if (!obj || typeof obj !== 'object') return '';
    return obj[langKey] || obj.en || obj.kr || '';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var UI = {
    kr: {
      period: { today: '오늘', tomorrow: '내일', weekly: '이번 주', monthly: '이달' },
      total: '총운', love: '연애운', wealth: '재물운', health: '건강운', work: '직장·사업운',
      luckyColor: '행운의 색', luckyNum: '행운의 숫자', advice: '의 조언', faq: '자주 묻는 질문',
      home: '홈', fortune: '운세', other: '다른', animal: '띠', zodiac: '별자리',
      periodLinks: '기간별 운세', saju: '사주 분석', compat: '궁합 보기', insight: '명리 인사이트',
      sky: '오늘의 하늘', langHint: '다국어: URL에 ?lang=en · ja · zh · fr · nl · vi · ms',
      ctaTitle: '추천 서비스'
    },
    en: {
      period: { today: 'Today', tomorrow: 'Tomorrow', weekly: 'This week', monthly: 'This month' },
      total: 'Overall', love: 'Love', wealth: 'Money', health: 'Health', work: 'Work & career',
      luckyColor: 'Lucky color', luckyNum: 'Lucky number', advice: ' guidance', faq: 'FAQ',
      home: 'Home', fortune: 'Fortune', other: 'Other', animal: 'zodiac animal', zodiac: 'sign',
      periodLinks: 'Other periods', saju: 'Four Pillars', compat: 'Compatibility', insight: 'Saju insight',
      sky: 'Sky today', langHint: 'Languages: add ?lang=en, ja, zh, fr, nl, vi, ms',
      ctaTitle: 'Recommended'
    }
  };

  function labels(langKey) {
    return UI[langKey === 'kr' ? 'kr' : 'en'];
  }

  var FORTUNE_ENGINE_TEXT_TRANSLATIONS = {
    kr: {
      systemAria: '운세 체계',
      systemTabs: { animal: '12띠', sign: '별자리', ziwei: '자미', sukuyo: '숙요', vedic: '베다' }
    },
    en: {
      systemAria: 'Fortune systems',
      systemTabs: { animal: '12 Animals', sign: 'Zodiac', ziwei: 'Zi Wei', sukuyo: 'Sukuyo', vedic: 'Vedic' }
    },
    jp: {
      systemAria: '占い体系',
      systemTabs: { animal: '十二支', sign: '星座', ziwei: '紫微', sukuyo: '宿曜', vedic: 'ヴェーダ' }
    },
    cn: {
      systemAria: '运势体系',
      systemTabs: { animal: '十二生肖', sign: '星座', ziwei: '紫微', sukuyo: '宿曜', vedic: '吠陀' }
    }
  };

  function fortuneEngineText() {
    return pickI18n(FORTUNE_ENGINE_TEXT_TRANSLATIONS, resolveLangKey()) || FORTUNE_ENGINE_TEXT_TRANSLATIONS.kr;
  }

  var ZODIAC_EN = {
    aries: 'Aries', taurus: 'Taurus', gemini: 'Gemini', cancer: 'Cancer', leo: 'Leo', virgo: 'Virgo',
    libra: 'Libra', scorpio: 'Scorpio', sagittarius: 'Sagittarius', capricorn: 'Capricorn', aquarius: 'Aquarius', pisces: 'Pisces'
  };

  var ZIWEI_EN = {
    mingong: 'Life Palace', jaeback: 'Wealth', gwanllok: 'Career', bubu: 'Spouse', chunyi: 'Travel',
    bokdeok: 'Fortune', janyeo: 'Children', noebok: 'Friends', jilaek: 'Health', jeonaek: 'Property',
    hyeongje: 'Siblings', bumo: 'Parents'
  };
  var VEDIC_EN = {
    mesha: 'Mesha (Aries)', vrishabha: 'Vrishabha (Taurus)', mithuna: 'Mithuna (Gemini)', karka: 'Karka (Cancer)',
    simha: 'Simha (Leo)', kanya: 'Kanya (Virgo)', tula: 'Tula (Libra)', vrishchika: 'Vrishchika (Scorpio)',
    dhanu: 'Dhanu (Sagittarius)', makara: 'Makara (Capricorn)', kumbha: 'Kumbha (Aquarius)', meena: 'Meena (Pisces)'
  };

  function subjectTitle(cfg, info, langKey) {
    if (langKey === 'kr') return subjectLabelKr(cfg, info);
    if (cfg.type === 'animal') {
      var map = { rat: 'Rat', ox: 'Ox', tiger: 'Tiger', rabbit: 'Rabbit', dragon: 'Dragon', snake: 'Snake',
        horse: 'Horse', goat: 'Goat', monkey: 'Monkey', rooster: 'Rooster', dog: 'Dog', pig: 'Pig' };
      return (map[cfg.id] || info.ko) + ' (Chinese zodiac)';
    }
    if (cfg.type === 'sign') return ZODIAC_EN[cfg.id] || info.ko;
    if (cfg.type === 'ziwei') return 'Zi Wei · ' + (ZIWEI_EN[cfg.id] || cfg.id);
    if (cfg.type === 'sukuyo') return 'Sukuyo · ' + (info.ko || cfg.id);
    if (cfg.type === 'vedic') return VEDIC_EN[cfg.id] || info.ko;
    return info.ko;
  }

  /* ── 데이터 사전 ── */
  var ANIMALS = {
    rat:     { ko:'쥐', emoji:'🐭', trait:'영리함·재치·적응력', born:'1948·1960·1972·1984·1996·2008·2020' },
    ox:      { ko:'소', emoji:'🐂', trait:'성실함·인내·신뢰감', born:'1949·1961·1973·1985·1997·2009·2021' },
    tiger:   { ko:'호랑이', emoji:'🐯', trait:'용맹함·리더십·열정', born:'1950·1962·1974·1986·1998·2010·2022' },
    rabbit:  { ko:'토끼', emoji:'🐰', trait:'온화함·감수성·창의력', born:'1951·1963·1975·1987·1999·2011·2023' },
    dragon:  { ko:'용', emoji:'🐉', trait:'카리스마·야망·행운', born:'1952·1964·1976·1988·2000·2012·2024' },
    snake:   { ko:'뱀', emoji:'🐍', trait:'직관력·지혜·신중함', born:'1953·1965·1977·1989·2001·2013·2025' },
    horse:   { ko:'말', emoji:'🐴', trait:'자유로움·행동력·열정', born:'1954·1966·1978·1990·2002·2014·2026' },
    goat:    { ko:'양', emoji:'🐑', trait:'예술성·배려심·온순함', born:'1955·1967·1979·1991·2003·2015·2027' },
    monkey:  { ko:'원숭이', emoji:'🐒', trait:'기지·유머·다재다능', born:'1956·1968·1980·1992·2004·2016·2028' },
    rooster: { ko:'닭', emoji:'🐓', trait:'근면함·정직·완벽주의', born:'1957·1969·1981·1993·2005·2017·2029' },
    dog:     { ko:'개', emoji:'🐶', trait:'충성심·의리·정직함', born:'1958·1970·1982·1994·2006·2018·2030' },
    pig:     { ko:'돼지', emoji:'🐷', trait:'복록·너그러움·순박함', born:'1959·1971·1983·1995·2007·2019·2031' }
  };

  var ZODIACS = {
    aries:       { ko:'양자리', emoji:'♈', trait:'개척자의 기운·용기·직진',  period:'3.21~4.19' },
    taurus:      { ko:'황소자리', emoji:'♉', trait:'안정과 풍요·인내·결실',    period:'4.20~5.20' },
    gemini:      { ko:'쌍둥이자리', emoji:'♊', trait:'소통·호기심·다양성',    period:'5.21~6.20' },
    cancer:      { ko:'게자리', emoji:'♋', trait:'직관·감성·보호본능',          period:'6.21~7.22' },
    leo:         { ko:'사자자리', emoji:'♌', trait:'카리스마·자신감·창조력',  period:'7.23~8.22' },
    virgo:       { ko:'처녀자리', emoji:'♍', trait:'분석력·완벽주의·봉사',    period:'8.23~9.22' },
    libra:       { ko:'천칭자리', emoji:'♎', trait:'균형·심미안·외교',          period:'9.23~10.22' },
    scorpio:     { ko:'전갈자리', emoji:'♏', trait:'통찰력·변환·집중력',       period:'10.23~11.21' },
    sagittarius: { ko:'사수자리', emoji:'♐', trait:'자유·모험·낙관주의',       period:'11.22~12.21' },
    capricorn:   { ko:'염소자리', emoji:'♑', trait:'야망·실용주의·지구력',   period:'12.22~1.19' },
    aquarius:    { ko:'물병자리', emoji:'♒', trait:'혁신·독립·인도주의',       period:'1.20~2.18' },
    pisces:      { ko:'물고기자리', emoji:'♓', trait:'감수성·공감·창의력',    period:'2.19~3.20' }
  };

  /* ── PROMPT 3~5: 자미두수 궁위형 · 숙요 27숙 · 베다 12라시 ── */
  var ZIWEI = {
    mingong:  { ko: '명궁형', emoji: '✨', trait: '자기 정체·삶의 주제' },
    jaeback:  { ko: '재백궁형', emoji: '💰', trait: '재물·자원·가치' },
    gwanllok: { ko: '관록궁형', emoji: '🏆', trait: '커리어·사명·성취' },
    bubu:     { ko: '부부궁형', emoji: '💕', trait: '관계·동반자·조화' },
    chunyi:   { ko: '천이궁형', emoji: '✈️', trait: '이동·변화·확장' },
    bokdeok:  { ko: '복덕궁형', emoji: '🍀', trait: '복·은혜·내면 자원' },
    janyeo:   { ko: '자녀궁형', emoji: '🌱', trait: '창조·후손·표현' },
    noebok:   { ko: '노복궁형', emoji: '🤝', trait: '동료·협력·네트워크' },
    jilaek:   { ko: '질액궁형', emoji: '🩺', trait: '건강·회복·리듬' },
    jeonaek:  { ko: '전택궁형', emoji: '🏠', trait: '기반·자산·안식' },
    hyeongje: { ko: '형제궁형', emoji: '👥', trait: '동료·경쟁·동반' },
    bumo:     { ko: '부모궁형', emoji: '🌳', trait: '뿌리·전통·보호' }
  };

  var SUKUYO_NAMES_KR = [
    '각숙(角宿)', '항숙(亢宿)', '저숙(氐宿)', '방숙(房宿)', '심숙(心宿)', '미숙(尾宿)', '기숙(箕宿)',
    '두숙(斗宿)', '우숙(牛宿)', '여숙(女宿)', '허숙(虛宿)', '위숙(危宿)', '실숙(室宿)', '벽숙(壁宿)',
    '규숙(奎宿)', '루숙(婁宿)', '위숙(胃宿)', '묘숙(昴宿)', '필숙(畢宿)', '자숙(觜宿)', '삼숙(參宿)',
    '정숙(井宿)', '귀숙(鬼宿)', '유숙(柳宿)', '성숙(星宿)', '장숙(張宿)', '익숙(翼宿)'
  ];

  var VEDIC = {
    mesha:       { ko: '메샤 (양자리)', emoji: '♈', trait: '불·용기·새 출발' },
    vrishabha:   { ko: '브리샤바 (황소자리)', emoji: '♉', trait: '땅·안정·감각' },
    mithuna:     { ko: '미투나 (쌍둥이자리)', emoji: '♊', trait: '바람·소통·다양성' },
    karka:       { ko: '카르카 (게자리)', emoji: '♋', trait: '물·감정·보호' },
    simha:       { ko: '심하 (사자자리)', emoji: '♌', trait: '불·창조·자존' },
    kanya:       { ko: '칸야 (처녀자리)', emoji: '♍', trait: '땅·분석·정돈' },
    tula:        { ko: '툴라 (천칭자리)', emoji: '♎', trait: '바람·균형·관계' },
    vrishchika:  { ko: '브리쉬치카 (전갈자리)', emoji: '♏', trait: '물·변환·집중' },
    dhanu:       { ko: '다누 (사수자리)', emoji: '♐', trait: '불·탐험·신념' },
    makara:      { ko: '마카라 (염소자리)', emoji: '♑', trait: '땅·구조·책임' },
    kumbha:      { ko: '쿰바 (물병자리)', emoji: '♒', trait: '바람·혁신·공동체' },
    meena:       { ko: '미나 (물고기자리)', emoji: '♓', trait: '물·영성·공감' }
  };

  var PERIOD_KO = { today:'오늘', tomorrow:'내일', weekly:'이번 주', monthly:'이달' };

  var LUCKY_COLORS = ['빨강','주황','노랑','초록','파랑','남색','보라','분홍','흰색','검정','금색','은색','하늘색','민트','산호색','라벤더'];
  var LUCKY_NUMS   = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,33,44,55,66,77,88,99];

  /* ── 총운 텍스트 ── */
  var TOTAL_TEXTS = {
    high:   ['오늘은 강한 기운이 내 편입니다. 계획했던 일에 과감하게 도전하세요. 주변의 도움과 행운이 겹쳐 뜻밖의 성과를 얻을 수 있습니다.',
             '모든 일이 원활하게 흘러가는 하루입니다. 생각지 못한 기회가 찾아오니 열린 마음으로 임하세요. 인연과 복이 함께 따르는 날입니다.',
             '기운이 최상으로 올라있어 무엇을 시작해도 좋은 날입니다. 오래 미뤄온 결정을 내리기에 딱 좋은 타이밍입니다.'],
    mid:    ['보통의 기운이 흐르는 하루입니다. 특별한 변화보다는 안정적인 유지에 집중하세요. 꾸준함이 쌓여 결실을 맺는 날입니다.',
             '평온한 기운 속에서 내면의 힘을 기를 수 있는 날입니다. 작은 것에 감사하며 하루를 보내면 마음이 편안해집니다.',
             '무난하게 흐르는 하루입니다. 큰 욕심보다는 지금 하는 일에 집중하는 것이 좋습니다. 차분하게 임하면 좋은 결과가 기다립니다.'],
    low:    ['오늘은 기운이 다소 낮습니다. 무리한 시도보다 현재 상태를 점검하는 것이 현명합니다. 충분한 휴식을 취하며 내일을 준비하세요.',
             '예기치 않은 변수가 생길 수 있는 날입니다. 서두르지 말고 한 발 물러서서 판단하는 여유가 필요합니다.',
             '기운이 소진되기 쉬운 날입니다. 오늘은 에너지를 아끼고 충전에 집중하세요. 내일의 도약을 위한 준비 기간으로 삼으세요.']
  };
  var LOVE_TEXTS = {
    high:   ['이성과의 인연에 좋은 기운이 흐릅니다. 솔직한 감정 표현이 관계를 더욱 깊게 만들어줄 것입니다. 연인이 있다면 달콤한 시간이 기다립니다.',
             '설레는 만남이나 고백의 기회가 찾아올 수 있습니다. 마음을 열고 먼저 다가가 보세요. 진심은 반드시 통합니다.'],
    mid:    ['연애운이 평범하게 흐릅니다. 작은 배려와 따뜻한 말 한마디가 관계를 유지하는 힘이 됩니다. 무리한 기대보다 현재에 집중하세요.',
             '감정 기복이 있을 수 있는 날입니다. 상대의 입장에서 한번 더 생각해보는 것이 좋습니다.'],
    low:    ['연애에서 오해나 갈등이 생길 수 있는 날입니다. 감정이 격해지면 잠시 진정하고 대화하세요. 말보다 행동으로 마음을 전해보세요.',
             '혼자만의 시간이 필요한 날입니다. 자기 자신을 먼저 돌보는 것이 좋은 관계의 기반이 됩니다.']
  };
  var WEALTH_TEXTS = {
    high:   ['재물운이 활짝 열린 하루입니다. 기대하지 않았던 곳에서 수입이 생길 수 있습니다. 현명한 소비와 투자를 병행하세요.',
             '금전 흐름이 원활합니다. 좋은 투자 기회가 보인다면 신중하게 검토해 보세요. 작은 절약도 큰 재산이 됩니다.'],
    mid:    ['재물운이 평온합니다. 수입과 지출의 균형을 맞추는 것이 중요합니다. 불필요한 지출을 줄이면 여유가 생깁니다.',
             '큰 변동은 없지만 꾸준히 관리하면 재정이 안정됩니다. 충동 소비를 주의하세요.'],
    low:    ['재물 지출이 많아질 수 있는 날입니다. 큰 금액의 결정은 신중히 내리세요. 예상치 못한 지출이 생길 수 있으니 비상금을 점검해두세요.',
             '오늘은 투자보다 절약에 집중하는 것이 좋습니다. 재정을 꼼꼼히 점검하고 허점을 메워나가세요.']
  };
  var HEALTH_TEXTS = {
    high:   ['몸과 마음이 활력으로 넘치는 날입니다. 평소 하고 싶었던 운동이나 야외 활동을 즐겨보세요. 건강에 좋은 선택들을 하게 됩니다.',
             '체력과 기력이 모두 좋은 날입니다. 규칙적인 생활습관이 건강을 더욱 강하게 만들어줍니다.'],
    mid:    ['건강 상태가 무난합니다. 무리하지 않는 선에서 가벼운 운동이 기운을 북돋아 줍니다. 충분한 수면을 챙기세요.',
             '소화기나 호흡기를 조심하세요. 규칙적인 식사와 적당한 수분 섭취로 컨디션을 유지하세요.'],
    low:    ['피로가 쌓이기 쉬운 날입니다. 무리한 스케줄은 피하고 충분한 휴식을 취하세요. 스트레스 관리에도 신경 쓰세요.',
             '오늘은 무리하지 마세요. 과로를 피하고 충분히 쉬는 것이 최선입니다. 작은 증상도 방치하지 말고 챙기세요.']
  };
  var ADVICE_TEXTS = [
    '오늘 하루, 작은 일에도 감사하는 마음으로 임하세요. 긍정의 에너지가 더 큰 행운을 불러옵니다.',
    '지금 이 순간에 집중하세요. 과거는 흘러가고 미래는 아직 오지 않았습니다. 현재의 당신이 가장 소중합니다.',
    '오늘은 누군가에게 따뜻한 말 한마디를 건네보세요. 그 작은 친절이 돌아와 당신을 더욱 빛나게 합니다.',
    '결정을 내리기 어렵다면 마음의 소리에 귀 기울이세요. 직감이 당신을 올바른 방향으로 안내할 것입니다.',
    '새로운 시도를 두려워하지 마세요. 작은 용기가 큰 변화의 시작이 됩니다.',
    '오늘의 작은 노력이 내일의 큰 성과가 됩니다. 포기하지 말고 한 걸음씩 나아가세요.',
    '주변 사람들과의 대화가 새로운 아이디어와 기회를 만들어냅니다. 소통에 열린 자세를 유지하세요.',
    '내 페이스를 지켜가며 나만의 리듬으로 하루를 살아가세요. 남과 비교하지 않는 것이 행복의 비결입니다.',
    '오늘은 몸과 마음을 돌보는 날로 삼으세요. 자기 자신을 사랑하고 보살피는 것이 모든 것의 기반입니다.',
    '어렵게 느껴지는 일도 시작이 반입니다. 망설이지 말고 첫 발을 내딛어 보세요.',
    '작은 실수에 너무 자책하지 마세요. 모든 경험이 당신을 더욱 강하고 지혜롭게 만들어줍니다.',
    '오늘 만나는 모든 인연에 진심을 다해보세요. 진정한 관계는 그렇게 쌓여갑니다.'
  ];

  /* ── 해시 함수 (결정론적 시드) ── */
  function strHash(str) {
    var h = 0;
    for (var i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }
  function lcg(seed) {
    seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (seed >>> 0) / 4294967295;
  }
  /* ── 날짜 문자열 생성 ── */
  function getDateStr(period) {
    var d = new Date();
    if (period === 'tomorrow') d.setDate(d.getDate() + 1);
    var y = d.getFullYear();
    var m = ('0' + (d.getMonth() + 1)).slice(-2);
    var day = ('0' + d.getDate()).slice(-2);
    return y + '-' + m + '-' + day;
  }
  function getDateLabel(period) {
    var d = new Date();
    if (period === 'tomorrow') d.setDate(d.getDate() + 1);
    if (period === 'weekly') {
      var end = new Date(d); end.setDate(d.getDate() + 6);
      return d.getFullYear() + '년 ' + (d.getMonth()+1) + '월 ' + d.getDate() + '일 ~ ' + (end.getMonth()+1) + '월 ' + end.getDate() + '일';
    }
    if (period === 'monthly') {
      return d.getFullYear() + '년 ' + (d.getMonth()+1) + '월';
    }
    return d.getFullYear() + '년 ' + (d.getMonth()+1) + '월 ' + d.getDate() + '일 (' + ['일','월','화','수','목','금','토'][d.getDay()] + ')';
  }

  /* ── 운세 점수 및 텍스트 생성 ── */
  function genFortune(cfg) {
    var dateStr = getDateStr(cfg.period);
    var baseSeed = strHash(dateStr + '-' + (cfg.type || 'animal') + '-' + cfg.id + '-' + cfg.period);

    function score(offset) {
      var s = lcg(baseSeed + offset);
      return Math.round(s * 9 + 1); // 1-10
    }
    function tier(s) { return s >= 7 ? 'high' : s >= 4 ? 'mid' : 'low'; }
    function pick(pool, s, offset) {
      var t = tier(s);
      var arr = pool[t];
      return arr[(baseSeed + offset) % arr.length];
    }

    var total   = score(1);
    var love    = score(2);
    var wealth  = score(3);
    var health  = score(4);
    var colorIdx  = (baseSeed + 5) % LUCKY_COLORS.length;
    var numIdx    = (baseSeed + 6) % LUCKY_NUMS.length;
    var adviceIdx = (baseSeed + 7) % ADVICE_TEXTS.length;

    return {
      total:   total,
      love:    love,
      wealth:  wealth,
      health:  health,
      work:    null,
      totalText:  pick(TOTAL_TEXTS, total, 10),
      loveText:   pick(LOVE_TEXTS, love, 20),
      wealthText: pick(WEALTH_TEXTS, wealth, 30),
      healthText: pick(HEALTH_TEXTS, health, 40),
      workText:   '',
      luckyColor: LUCKY_COLORS[colorIdx],
      luckyNum:   LUCKY_NUMS[numIdx],
      advice:     ADVICE_TEXTS[adviceIdx],
      keyword:    '',
      cta:        [],
      sajuInsight: '',
      planetNote: '',
      ziweiTip: '',
      sukuyoDeity: '',
      vedicNakshatra: '',
      vedicMantra: '',
      vedicBridge: ''
    };
  }

  function getDailyEntry(daily, cfg) {
    if (!daily) return null;
    if (cfg.type === 'animal') return daily.animals && daily.animals[cfg.id];
    if (cfg.type === 'sign') return (daily.zodiacs || daily.signs) && (daily.zodiacs || daily.signs)[cfg.id];
    if (cfg.type === 'ziwei') return daily.ziwei && daily.ziwei[cfg.id];
    if (cfg.type === 'sukuyo') return daily.sukuyo && daily.sukuyo[cfg.id];
    if (cfg.type === 'vedic') return daily.vedic && daily.vedic[cfg.id];
    return null;
  }

  function mapEntryToFortune(entry, cfg, langKey) {
    if (!entry) return null;
    var sec = entry.sections || {};
    var score = entry.score || {};
    function t(key) {
      return pickI18n(sec[key] || {}, langKey);
    }
    var lucky = entry.lucky || {};
    var color = langKey === 'kr' ? (lucky.color_kr || lucky.color_en) : (lucky.color_en || lucky.color_kr);
    var num = lucky.number != null ? lucky.number : null;
    return {
      total: score.overall != null ? score.overall : 5,
      love: score.love != null ? score.love : 5,
      wealth: score.money != null ? score.money : (score.wealth != null ? score.wealth : 5),
      health: score.health != null ? score.health : 5,
      work: score.work !== undefined && score.work !== null ? score.work : null,
      totalText: t('overall'),
      loveText: t('love'),
      wealthText: t('money') || t('wealth'),
      healthText: t('health'),
      workText: t('work'),
      luckyColor: color || '',
      luckyNum: num != null ? num : LUCKY_NUMS[strHash(String(cfg.id) + 'n') % LUCKY_NUMS.length],
      advice: t('advice'),
      keyword: pickI18n(entry.keyword || {}, langKey),
      cta: Array.isArray(entry.cta) ? entry.cta : [],
      sajuInsight: entry.saju_insight || '',
      planetNote: typeof entry.planet_message === 'object' && entry.planet_message
        ? pickI18n(entry.planet_message, langKey)
        : (entry.planet_message || ''),
      ziweiTip: pickI18n(entry.star_tip || {}, langKey) || entry.star_tip_kr || '',
      sukuyoDeity: pickI18n(entry.deity_message || {}, langKey) || entry.deity_message_kr || '',
      vedicNakshatra: pickI18n(entry.nakshatra_tip || {}, langKey) || entry.nakshatra_tip_kr || '',
      vedicMantra: pickI18n(entry.mantra_tip || {}, langKey) || entry.mantra_tip_kr || '',
      vedicBridge: entry.saju_bridge_kr || ''
    };
  }

  function fortuneFromDaily(daily, cfg, langKey) {
    var entry = getDailyEntry(daily, cfg);
    if (!entry) return null;
    return mapEntryToFortune(entry, cfg, langKey);
  }

  function getSubjectInfo(cfg) {
    if (cfg.type === 'animal') return ANIMALS[cfg.id];
    if (cfg.type === 'sign') return ZODIACS[cfg.id];
    if (cfg.type === 'ziwei') return ZIWEI[cfg.id];
    if (cfg.type === 'vedic') return VEDIC[cfg.id];
    if (cfg.type === 'sukuyo') {
      var n = parseInt(cfg.id, 10);
      if (n >= 1 && n <= 27) {
        return { ko: SUKUYO_NAMES_KR[n - 1], emoji: '🌙', trait: '숙요 점 27숙 · 달빛의 리듬' };
      }
      return { ko: String(cfg.id), emoji: '🌙', trait: '숙요 점' };
    }
    return null;
  }

  function subjectLabelKr(cfg, info) {
    if (!info) return '';
    if (cfg.type === 'animal') return info.ko + '띠';
    if (cfg.type === 'sukuyo') return info.ko;
    return info.ko;
  }

  function fortunePath(cfg) {
    var p = cfg.period;
    var id = cfg.id;
    if (cfg.type === 'animal' || cfg.type === 'sign') return '/fortune/' + p + '/' + id + '.html';
    if (cfg.type === 'ziwei') return '/fortune/' + p + '/ziwei/' + id + '.html';
    if (cfg.type === 'sukuyo') return '/fortune/' + p + '/sukuyo/' + id + '.html';
    if (cfg.type === 'vedic') return '/fortune/' + p + '/vedic/' + id + '.html';
    return '/fortune/' + p + '/';
  }

  function canonicalUrl(cfg) {
    return 'https://code-destiny.com' + fortunePath(cfg);
  }

  function extendFortuneExtras(fortune) {
    if (!fortune.ziweiTip) fortune.ziweiTip = '';
    if (!fortune.sukuyoDeity) fortune.sukuyoDeity = '';
    if (!fortune.vedicNakshatra) fortune.vedicNakshatra = '';
    if (!fortune.vedicMantra) fortune.vedicMantra = '';
    if (!fortune.vedicBridge) fortune.vedicBridge = '';
    return fortune;
  }

  /* ── JSON-LD 구조화 데이터 ── */
  function buildJsonLd(cfg, info, fortune, dateLabel, langKey, L) {
    var period = cfg.period;
    var periodWord = (L && L.period && L.period[period]) ? L.period[period] : PERIOD_KO[period];
    var sl = subjectLabelKr(cfg, info);
    var title  = periodWord + '의 ' + sl + ' 운세';
    var url    = canonicalUrl(cfg);
    var now    = new Date().toISOString();

    var article = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Article',
          headline: title,
          inLanguage: langKey === 'kr' ? 'ko' : 'en',
          description: sl + ' ' + periodWord + ' 운세 — 총운, 연애운, 재물운, 건강운, 행운 숫자 · 색 제공.',
          datePublished: now,
          dateModified: now,
          author: { '@type': 'Organization', name: '꿀꿀 만세력', url: 'https://code-destiny.com' },
          publisher: { '@type': 'Organization', name: '꿀꿀 만세력', logo: { '@type': 'ImageObject', url: 'https://code-destiny.com/icons/app-logo-512.png' } },
          mainEntityOfPage: { '@type': 'WebPage', '@id': url },
          image: 'https://code-destiny.com/icons/app-logo-512.png'
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: '홈', item: 'https://code-destiny.com/' },
            { '@type': 'ListItem', position: 2, name: '운세', item: 'https://code-destiny.com/fortune/' },
            { '@type': 'ListItem', position: 3, name: periodWord + ' 운세', item: 'https://code-destiny.com/fortune/' + period + '/' },
            { '@type': 'ListItem', position: 4, name: title, item: url }
          ]
        },
        {
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: sl + '의 ' + periodWord + ' 총운은 어떤가요?',
              acceptedAnswer: { '@type': 'Answer', text: fortune.totalText }
            },
            {
              '@type': 'Question',
              name: sl + '의 ' + periodWord + ' 연애운은?',
              acceptedAnswer: { '@type': 'Answer', text: fortune.loveText }
            },
            {
              '@type': 'Question',
              name: sl + '의 ' + periodWord + ' 재물운은?',
              acceptedAnswer: { '@type': 'Answer', text: fortune.wealthText }
            },
            {
              '@type': 'Question',
              name: sl + '의 ' + periodWord + ' 행운의 숫자는?',
              acceptedAnswer: { '@type': 'Answer', text: fortune.luckyNum + '이 행운의 숫자입니다.' }
            }
          ]
        }
      ]
    };
    return article;
  }

  function buildSystemTabs(cfg, L) {
    var p = cfg.period;
    var base = '/fortune/' + p + '/';
    var copy = fortuneEngineText();
    var tabs = [
      { href: base + 'rat.html', label: copy.systemTabs.animal, t: 'animal' },
      { href: base + 'aries.html', label: copy.systemTabs.sign, t: 'sign' },
      { href: base + 'ziwei/mingong.html', label: copy.systemTabs.ziwei, t: 'ziwei' },
      { href: base + 'sukuyo/1.html', label: copy.systemTabs.sukuyo, t: 'sukuyo' },
      { href: base + 'vedic/mesha.html', label: copy.systemTabs.vedic, t: 'vedic' }
    ];
    var html = '<nav class="fe-sys-tabs" aria-label="' + escapeHtml(copy.systemAria) + '">';
    tabs.forEach(function(tab) {
      var active = cfg.type === tab.t ? ' fe-sys-tab--active' : '';
      html += '<a class="fe-sys-tab' + active + '" href="' + escapeHtml(tab.href) + '">' + escapeHtml(tab.label) + '</a>';
    });
    html += '</nav>';
    return html;
  }

  function siblingHref(cfg, sid) {
    if (cfg.type === 'animal' || cfg.type === 'sign') return '/fortune/' + cfg.period + '/' + sid + '.html';
    if (cfg.type === 'ziwei') return '/fortune/' + cfg.period + '/ziwei/' + sid + '.html';
    if (cfg.type === 'vedic') return '/fortune/' + cfg.period + '/vedic/' + sid + '.html';
    if (cfg.type === 'sukuyo') return '/fortune/' + cfg.period + '/sukuyo/' + sid + '.html';
    return '/fortune/';
  }

  /* ── 내부 링크 생성 ── */
  function buildLinks(cfg, info, L) {
    var html = '';
    var PERIOD_LABEL = L && L.period ? L.period : { today: '오늘', tomorrow: '내일', weekly: '이번 주', monthly: '이달' };
    var otherKr = '다른 ';
    if (cfg.type === 'animal') otherKr += '띠';
    else if (cfg.type === 'sign') otherKr += '별자리';
    else if (cfg.type === 'ziwei') otherKr += '궁위형';
    else if (cfg.type === 'sukuyo') otherKr += '숙';
    else if (cfg.type === 'vedic') otherKr += '라시';

    html += '<div class="fe-links"><div class="fe-links-title">' + escapeHtml(otherKr) + ' 운세</div><div class="fe-link-grid">';
    if (cfg.type === 'animal') {
      Object.keys(ANIMALS).forEach(function(k) {
        if (k === cfg.id) return;
        var i = ANIMALS[k];
        html += '<a class="fe-link-card" href="' + siblingHref(cfg, k) + '"><span>' + i.emoji + '</span>' + i.ko + '띠</a>';
      });
    } else if (cfg.type === 'sign') {
      Object.keys(ZODIACS).forEach(function(k) {
        if (k === cfg.id) return;
        var i = ZODIACS[k];
        html += '<a class="fe-link-card" href="' + siblingHref(cfg, k) + '"><span>' + i.emoji + '</span>' + i.ko + '</a>';
      });
    } else if (cfg.type === 'ziwei') {
      Object.keys(ZIWEI).forEach(function(k) {
        if (k === cfg.id) return;
        var i = ZIWEI[k];
        html += '<a class="fe-link-card" href="' + siblingHref(cfg, k) + '"><span>' + i.emoji + '</span>' + i.ko + '</a>';
      });
    } else if (cfg.type === 'vedic') {
      Object.keys(VEDIC).forEach(function(k) {
        if (k === cfg.id) return;
        var i = VEDIC[k];
        html += '<a class="fe-link-card" href="' + siblingHref(cfg, k) + '"><span>' + i.emoji + '</span>' + i.ko + '</a>';
      });
    } else if (cfg.type === 'sukuyo') {
      var cur = parseInt(cfg.id, 10);
      for (var n = 1; n <= 27; n++) {
        if (n === cur) continue;
        var nm = SUKUYO_NAMES_KR[n - 1];
        html += '<a class="fe-link-card" href="' + siblingHref(cfg, String(n)) + '"><span>🌙</span>' + escapeHtml(nm) + '</a>';
      }
    }
    html += '</div></div>';

    html += '<div class="fe-links"><div class="fe-links-title">' + escapeHtml(L && L.periodLinks ? L.periodLinks : '기간별 운세') + '</div><div class="fe-link-grid">';
    ['today','tomorrow','weekly','monthly'].forEach(function(p) {
      if (p === cfg.period) return;
      html += '<a class="fe-link-card" href="' + fortunePath({ type: cfg.type, id: cfg.id, period: p }) + '"><span>' + {today:'📅',tomorrow:'📆',weekly:'🗓️',monthly:'📜'}[p] + '</span>' + PERIOD_LABEL[p] + ' 운세</a>';
    });
    html += '<a class="fe-link-card" href="https://code-destiny.com/#saju"><span>🎴</span>' + escapeHtml(L && L.saju ? L.saju : '사주 분석') + '</a>';
    html += '<a class="fe-link-card" href="https://code-destiny.com/#compat"><span>💞</span>' + escapeHtml(L && L.compat ? L.compat : '궁합 보기') + '</a>';
    html += '</div></div>';

    return html;
  }

  function ctaPickLabel(cta, langKey) {
    var m = { kr: 'label_kr', en: 'label_en', jp: 'label_jp', cn: 'label_cn', fr: 'label_fr', nl: 'label_nl', vi: 'label_vi', ms: 'label_ms' };
    var k = m[langKey] || 'label_en';
    return cta[k] || cta.label_en || cta.label_kr || '';
  }

  /* ── HTML 렌더 ── */
  function render(cfg) {
    var container = document.getElementById('fortuneApp');
    if (!container) return;

    var langKey = resolveLangKey();
    var L = labels(langKey);

    function pct(s) { return (s / 10 * 100).toFixed(0) + '%'; }
    function stars(s) { var st = ''; for (var i=0;i<5;i++) st += s/10*5 > i ? '⭐' : '☆'; return st; }

    function paint(fortune, dailyBundle) {
      try {
        fortune = extendFortuneExtras(fortune || {});
        var info = getSubjectInfo(cfg);
        if (!info) throw new Error('Unknown subject: ' + cfg.type + '/' + cfg.id);

        var period = cfg.period;
        var dateLabel = getDateLabel(period);
        var subjectLabel = subjectLabelKr(cfg, info);
        var pageTitle = langKey === 'kr'
          ? PERIOD_KO[period] + '의 ' + subjectLabel + ' 운세'
          : L.period[period] + ' · ' + subjectTitle(cfg, info, langKey) + ' fortune';

        var ld = document.getElementById('jsonLd');
        if (ld) ld.textContent = JSON.stringify(buildJsonLd(cfg, info, fortune, dateLabel, langKey, L));

        document.title = pageTitle + ' | 꿀꿀 만세력';
        var metaDesc = document.querySelector('meta[name="description"]');
        var descKo = subjectLabel + ' ' + PERIOD_KO[period] + ' 운세 무료 확인. 총운 ' + fortune.total + '점, 연애운, 재물운, 건강운, 행운 숫자 ' + fortune.luckyNum + ' 제공.';
        var descEn = 'Free ' + L.period[period].toLowerCase() + ' horoscope for ' + subjectTitle(cfg, info, langKey) + '. Scores & lucky number ' + fortune.luckyNum + '.';
        if (metaDesc) metaDesc.setAttribute('content', langKey === 'kr' ? descKo : descEn);
        var metaKeywords = document.querySelector('meta[name="keywords"]');
        var keywordText = subjectLabel + ', ' + PERIOD_KO[period] + ' 운세, 띠별 운세, 별자리 운세, 무료 운세, Code Destiny';
        if (metaKeywords) {
          metaKeywords.setAttribute('content', keywordText);
        } else {
          metaKeywords = document.createElement('meta');
          metaKeywords.setAttribute('name', 'keywords');
          metaKeywords.setAttribute('content', keywordText);
          document.head.appendChild(metaKeywords);
        }

        var html = '';
        var homeLabel = L.home || '홈';
        var fortuneLabel = L.fortune || '운세';

        html += '<nav class="fe-breadcrumb" aria-label="breadcrumb">';
        html += '<a href="/">' + escapeHtml(homeLabel) + '</a><span class="fe-breadcrumb-sep">›</span>';
        html += '<a href="/fortune/">' + escapeHtml(fortuneLabel) + '</a><span class="fe-breadcrumb-sep">›</span>';
        html += '<a href="/fortune/' + period + '/rat.html">' + escapeHtml(L.period[period]) + ' 운세</a>';
        html += '<span class="fe-breadcrumb-sep">›</span>';
        html += '<span>' + escapeHtml(subjectLabel) + '</span>';
        html += '</nav>';

        html += buildSystemTabs(cfg, L);

        if (dailyBundle && dailyBundle.calendar && langKey === 'kr') {
          var cal = dailyBundle.calendar;
          html += '<div class="fe-card" style="margin-bottom:12px;background:rgba(255,240,245,.35);">';
          html += '<div class="fe-card-title">📿 일운 맥락 (사주)</div>';
          html += '<p class="fe-card-body" style="font-size:.9rem;line-height:1.6;">';
          html += '양력 <strong>' + escapeHtml(cal.solar_date || '') + '</strong>';
          if (cal.lunar_date) html += ' · ' + escapeHtml(cal.lunar_date);
          if (cal.ilchin) html += ' · 일진 <strong>' + escapeHtml(cal.ilchin) + '</strong>';
          if (cal.wolgeon) html += ' · ' + escapeHtml(cal.wolgeon);
          if (cal.current_jeolgi) html += ' · ' + escapeHtml(cal.current_jeolgi);
          html += '</p></div>';
        }

        if (dailyBundle && dailyBundle.sky_today && cfg.type === 'sign') {
          var sky = dailyBundle.sky_today;
          html += '<div class="fe-card" style="margin-bottom:12px;background:rgba(230,240,255,.35);">';
          html += '<div class="fe-card-title">✨ ' + escapeHtml(L.sky || 'Sky today') + '</div>';
          html += '<p class="fe-card-body" style="font-size:.9rem;line-height:1.6;">';
          html += escapeHtml(sky.moon_phase || '') + (sky.moon_sign ? ' · Moon in ' + escapeHtml(sky.moon_sign) : '');
          if (sky.key_transits && sky.key_transits.length) html += '<br>' + escapeHtml(sky.key_transits.slice(0, 3).join(' · '));
          html += '</p></div>';
        }

        if (dailyBundle && dailyBundle.ziwei_today && langKey === 'kr' && cfg.type === 'ziwei') {
          var zw = dailyBundle.ziwei_today;
          html += '<div class="fe-card" style="margin-bottom:12px;background:rgba(40,30,60,.4);">';
          html += '<div class="fe-card-title">🌌 오늘의 자미두수 맥락</div>';
          html += '<p class="fe-card-body" style="font-size:.9rem;line-height:1.6;">';
          if (zw.active_palace_today) html += '활성 궁: <strong>' + escapeHtml(zw.active_palace_today) + '</strong><br>';
          if (zw.sihua_today) html += escapeHtml(zw.sihua_today);
          html += '</p></div>';
        }

        if (dailyBundle && dailyBundle.sukuyo_meta && langKey === 'kr' && cfg.type === 'sukuyo') {
          var sk = dailyBundle.sukuyo_meta;
          html += '<div class="fe-card" style="margin-bottom:12px;background:rgba(30,40,55,.45);">';
          html += '<div class="fe-card-title">🌙 숙요 오늘의 달</div>';
          html += '<p class="fe-card-body" style="font-size:.9rem;line-height:1.6;">';
          if (sk.today_mansion && sk.today_mansion.name_kr) html += '<strong>' + escapeHtml(sk.today_mansion.name_kr) + '</strong>';
          if (sk.today_mansion && sk.today_mansion.energy_kr) html += '<br>' + escapeHtml(sk.today_mansion.energy_kr);
          html += '</p></div>';
        }

        if (dailyBundle && dailyBundle.panchanga_today && cfg.type === 'vedic') {
          var pan = dailyBundle.panchanga_today;
          html += '<div class="fe-card" style="margin-bottom:12px;background:rgba(55,40,25,.45);">';
          html += '<div class="fe-card-title">🪐 판차앙가 (베다)</div>';
          html += '<p class="fe-card-body" style="font-size:.9rem;line-height:1.6;">';
          html += [pan.tithi, pan.vara, pan.nakshatra, pan.yoga, pan.karana].filter(Boolean).map(function(x) { return escapeHtml(x); }).join(' · ');
          if (pan.summary_kr && langKey === 'kr') html += '<br>' + escapeHtml(pan.summary_kr);
          if (pan.summary_en && langKey !== 'kr') html += '<br>' + escapeHtml(pan.summary_en);
          html += '</p></div>';
        }

        html += '<div class="fe-hero">';
        html += '<span class="fe-hero-icon" role="img" aria-label="' + escapeHtml(subjectLabel) + '">' + info.emoji + '</span>';
        html += '<h1 class="fe-hero-title">' + escapeHtml(pageTitle) + '</h1>';
        if (fortune.keyword) html += '<p class="fe-hero-subtitle" style="font-weight:700;color:#6b4a7a;">✦ ' + escapeHtml(fortune.keyword) + '</p>';
        html += '<p class="fe-hero-subtitle">' + escapeHtml(info.trait) + '</p>';
        if (cfg.type === 'animal') html += '<p class="fe-hero-subtitle" style="margin-top:4px;font-size:.75rem;">출생년도: ' + escapeHtml(info.born) + '</p>';
        else if (cfg.type === 'sign') html += '<p class="fe-hero-subtitle" style="margin-top:4px;font-size:.75rem;">생일: ' + escapeHtml(info.period) + '</p>';
        html += '<div class="fe-hero-date">' + escapeHtml(dateLabel) + '</div>';
        if (langKey !== 'kr') html += '<p class="fe-hero-subtitle" style="margin-top:8px;font-size:.75rem;opacity:.85;">' + escapeHtml(L.langHint || '') + '</p>';
        html += '</div>';

        html += '<div class="fe-scores">';
        html += '<div class="fe-score-row"><div class="fe-score-label"><span class="fe-score-name">⭐ ' + escapeHtml(L.total) + '</span><span class="fe-score-val">' + fortune.total + '/10</span></div><div class="fe-score-bar"><div class="fe-score-fill" style="width:' + pct(fortune.total) + '"></div></div></div>';
        html += '<div class="fe-score-row"><div class="fe-score-label"><span class="fe-score-name">💕 ' + escapeHtml(L.love) + '</span><span class="fe-score-val">' + fortune.love + '/10</span></div><div class="fe-score-bar"><div class="fe-score-fill love" style="width:' + pct(fortune.love) + '"></div></div></div>';
        html += '<div class="fe-score-row"><div class="fe-score-label"><span class="fe-score-name">💰 ' + escapeHtml(L.wealth) + '</span><span class="fe-score-val">' + fortune.wealth + '/10</span></div><div class="fe-score-bar"><div class="fe-score-fill wealth" style="width:' + pct(fortune.wealth) + '"></div></div></div>';
        html += '<div class="fe-score-row"><div class="fe-score-label"><span class="fe-score-name">🌿 ' + escapeHtml(L.health) + '</span><span class="fe-score-val">' + fortune.health + '/10</span></div><div class="fe-score-bar"><div class="fe-score-fill health" style="width:' + pct(fortune.health) + '"></div></div></div>';
        if (fortune.work != null) {
          html += '<div class="fe-score-row"><div class="fe-score-label"><span class="fe-score-name">💼 ' + escapeHtml(L.work) + '</span><span class="fe-score-val">' + fortune.work + '/10</span></div><div class="fe-score-bar"><div class="fe-score-fill" style="width:' + pct(fortune.work) + '"></div></div></div>';
        }
        html += '</div>';

        var pWord = L.period[period];
        html += '<div class="fe-card"><div class="fe-card-title">⭐ ' + escapeHtml(pWord) + (langKey === 'kr' ? '의 총운' : ' — overall') + '</div><p class="fe-card-body">' + escapeHtml(fortune.totalText) + '</p></div>';
        if (fortune.planetNote && cfg.type === 'sign') {
          html += '<div class="fe-card"><div class="fe-card-title">🪐 Planet note</div><p class="fe-card-body">' + escapeHtml(fortune.planetNote) + '</p></div>';
        }
        if (fortune.sajuInsight && cfg.type === 'animal' && langKey === 'kr') {
          html += '<div class="fe-card"><div class="fe-card-title">📿 ' + escapeHtml(L.insight || '명리 인사이트') + '</div><p class="fe-card-body">' + escapeHtml(fortune.sajuInsight) + '</p></div>';
        }
        if (fortune.ziweiTip && cfg.type === 'ziwei') {
          html += '<div class="fe-card"><div class="fe-card-title">✨ 주성 힌트 (자미)</div><p class="fe-card-body">' + escapeHtml(fortune.ziweiTip) + '</p></div>';
        }
        if (fortune.sukuyoDeity && cfg.type === 'sukuyo') {
          html += '<div class="fe-card"><div class="fe-card-title">🌙 수호 메시지 (숙요)</div><p class="fe-card-body">' + escapeHtml(fortune.sukuyoDeity) + '</p></div>';
        }
        if (cfg.type === 'vedic') {
          if (fortune.vedicNakshatra) html += '<div class="fe-card"><div class="fe-card-title">⭐ 낙샤트라 힌트</div><p class="fe-card-body">' + escapeHtml(fortune.vedicNakshatra) + '</p></div>';
          if (fortune.vedicMantra) html += '<div class="fe-card"><div class="fe-card-title">🔔 만트라·색 조언</div><p class="fe-card-body">' + escapeHtml(fortune.vedicMantra) + '</p></div>';
          if (fortune.vedicBridge && langKey === 'kr') html += '<div class="fe-card"><div class="fe-card-title">📿 사주 연결</div><p class="fe-card-body">' + escapeHtml(fortune.vedicBridge) + '</p></div>';
        }
        html += '<div class="fe-card"><div class="fe-card-title">💕 ' + escapeHtml(L.love) + ' ' + stars(fortune.love) + '</div><p class="fe-card-body">' + escapeHtml(fortune.loveText) + '</p></div>';
        html += '<div class="fe-card"><div class="fe-card-title">💰 ' + escapeHtml(L.wealth) + ' ' + stars(fortune.wealth) + '</div><p class="fe-card-body">' + escapeHtml(fortune.wealthText) + '</p></div>';
        html += '<div class="fe-card"><div class="fe-card-title">🌿 ' + escapeHtml(L.health) + ' ' + stars(fortune.health) + '</div><p class="fe-card-body">' + escapeHtml(fortune.healthText) + '</p></div>';
        if (fortune.workText) {
          html += '<div class="fe-card"><div class="fe-card-title">💼 ' + escapeHtml(L.work) + '</div><p class="fe-card-body">' + escapeHtml(fortune.workText) + '</p></div>';
        }

        html += '<div class="fe-lucky">';
        html += '<div class="fe-lucky-item"><div class="fe-lucky-label">🎨 ' + escapeHtml(L.luckyColor) + '</div><div class="fe-lucky-val">' + escapeHtml(fortune.luckyColor) + '</div></div>';
        html += '<div class="fe-lucky-item"><div class="fe-lucky-label">🔢 ' + escapeHtml(L.luckyNum) + '</div><div class="fe-lucky-val">' + escapeHtml(fortune.luckyNum) + '</div></div>';
        html += '</div>';

        html += '<div class="fe-advice"><div class="fe-advice-title">✨ ' + escapeHtml(langKey === 'kr' ? pWord + '의 조언' : pWord + ' guidance') + '</div><p class="fe-advice-body">&ldquo;' + escapeHtml(fortune.advice) + '&rdquo;</p></div>';

        if (fortune.cta && fortune.cta.length) {
          html += '<div class="fe-links"><div class="fe-links-title">' + escapeHtml(L.ctaTitle || '추천') + '</div><div class="fe-link-grid">';
          fortune.cta.forEach(function(ct) {
            var lab = ctaPickLabel(ct, langKey);
            var u = ct.url || '';
            if (!lab || !u) return;
            html += '<a class="fe-link-card" href="' + escapeHtml(u) + '"><span>' + escapeHtml(ct.icon || '✨') + '</span>' + escapeHtml(lab) + '</a>';
          });
          html += '</div></div>';
        }

        var faqs = [
          { q: subjectLabel + '의 ' + PERIOD_KO[period] + ' 총운은 어떤가요?', a: fortune.totalText },
          { q: subjectLabel + '의 ' + PERIOD_KO[period] + ' 연애운은 어떤가요?', a: fortune.loveText },
          { q: subjectLabel + '의 ' + PERIOD_KO[period] + ' 재물운은 어떤가요?', a: fortune.wealthText },
          { q: subjectLabel + '의 ' + PERIOD_KO[period] + ' 건강운은 어떤가요?', a: fortune.healthText },
          { q: subjectLabel + '의 행운의 숫자와 색은 무엇인가요?', a: '행운의 숫자는 ' + fortune.luckyNum + '이고, 행운의 색은 ' + fortune.luckyColor + '입니다.' }
        ];
        html += '<section class="fe-faq"><h2 class="fe-faq-title">❓ ' + escapeHtml(L.faq || '자주 묻는 질문') + '</h2>';
        faqs.forEach(function(f) {
          html += '<div class="fe-faq-item"><button type="button" class="fe-faq-q" aria-expanded="false"><span>' + escapeHtml(f.q) + '</span><span class="fe-faq-arrow">▼</span></button><div class="fe-faq-a">' + escapeHtml(f.a) + '</div></div>';
        });
        html += '</section>';

        html += buildLinks(cfg, info, L);

        container.innerHTML = html;

        if (!container.getAttribute('data-faq-bound')) {
          container.setAttribute('data-faq-bound', '1');
          container.addEventListener('click', function faqClick(e) {
            var btn = e.target.closest('.fe-faq-q');
            if (!btn) return;
            e.preventDefault();
            var open = btn.getAttribute('aria-expanded') === 'true';
            btn.setAttribute('aria-expanded', open ? 'false' : 'true');
          });
        }
      } catch (e) {
        container.innerHTML = '<div id="feError"><p>운세 정보를 불러오는 데 문제가 생겼습니다.</p><p style="margin-top:12px;"><a href="/fortune/">운세 홈으로 돌아가기</a></p></div>';
      }
    }

    try {
      container.innerHTML = '<div id="feLoading"><div class="fe-spinner"></div><p>운세를 불러오는 중입니다...</p></div>';
      var ds = getDateStr(cfg.period);
      fetch('/fortune/data/daily-' + ds + '.json', { cache: 'no-store' })
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(daily) {
          var fd = fortuneFromDaily(daily, cfg, langKey);
          if (fd) paint(fd, daily);
          else paint(genFortune(cfg), null);
        })
        .catch(function() {
          paint(genFortune(cfg), null);
        });
    } catch (e) {
      container.innerHTML = '<div id="feError"><p>운세 정보를 불러오는 데 문제가 생겼습니다.</p><p style="margin-top:12px;"><a href="/fortune/">운세 홈으로 돌아가기</a></p></div>';
    }
  }

  function appendPolicyLinksToFooter() {
    var footer = document.querySelector('footer');
    if (!footer || footer.getAttribute('data-policy-links') === '1') return;

    var nav = document.createElement('nav');
    nav.setAttribute('aria-label', '정책 및 문의 링크');
    nav.style.marginTop = '10px';
    nav.style.display = 'flex';
    nav.style.justifyContent = 'center';
    nav.style.flexWrap = 'wrap';
    nav.style.gap = '10px';
    nav.style.fontSize = '0.8rem';
    nav.innerHTML =
      '<a href="/privacy-policy" style="color:inherit;text-decoration:underline;">개인정보처리방침</a>' +
      '<span style="opacity:.6;">·</span>' +
      '<a href="/terms-of-service" style="color:inherit;text-decoration:underline;">이용약관</a>' +
      '<span style="opacity:.6;">·</span>' +
      '<a href="/contact-us" style="color:inherit;text-decoration:underline;">문의하기</a>';

    footer.appendChild(nav);
    footer.setAttribute('data-policy-links', '1');
  }

  function getConfigFromPath() {
    try {
      var path = (global.location && global.location.pathname) ? global.location.pathname.replace(/\/+$/, '') : '';
      var m1 = path.match(/^\/fortune\/(today|tomorrow|weekly|monthly)\/ziwei\/([a-z0-9_-]+)\.html$/);
      if (m1) return { period: m1[1], type: 'ziwei', id: m1[2] };
      var m2 = path.match(/^\/fortune\/(today|tomorrow|weekly|monthly)\/sukuyo\/(\d+)\.html$/);
      if (m2) return { period: m2[1], type: 'sukuyo', id: m2[2] };
      var m3 = path.match(/^\/fortune\/(today|tomorrow|weekly|monthly)\/vedic\/([a-z]+)\.html$/);
      if (m3) return { period: m3[1], type: 'vedic', id: m3[2] };
      var m0 = path.match(/^\/fortune\/(today|tomorrow|weekly|monthly)\/([a-z0-9_-]+)\.html$/);
      if (m0 && ANIMALS[m0[2]]) return { period: m0[1], type: 'animal', id: m0[2] };
      if (m0 && ZODIACS[m0[2]]) return { period: m0[1], type: 'sign', id: m0[2] };
    } catch (e) {}
    return null;
  }

  function getConfig() {
    if (window.FORTUNE_CONFIG) return window.FORTUNE_CONFIG;
    var d = document.body.dataset;
    if (d.fortuneType && d.fortuneId && d.fortunePeriod) {
      return { type: d.fortuneType, id: d.fortuneId, period: d.fortunePeriod };
    }
    return getConfigFromPath();
  }

  function doInit(cfg) {
    render(cfg);
    appendPolicyLinksToFooter();
  }

  global.FortuneEngine = {
    initFromConfig: function(cfg) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { doInit(cfg); });
      } else {
        doInit(cfg);
      }
    }
  };

  var cfg = getConfig();
  if (cfg) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { doInit(cfg); });
    } else {
      doInit(cfg);
    }
  }

})(window);
