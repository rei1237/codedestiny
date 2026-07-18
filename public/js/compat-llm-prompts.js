/**
 * 궁합 LLM 시스템 프롬프트 + 복사/AI열기 UI (클라이언트 전용, API 키 없음)
 */
(function (global) {
  'use strict';

  var AI_TARGETS = [
    { id: 'chatgpt', label: 'ChatGPT', url: 'https://chatgpt.com/' },
    { id: 'gemini', label: '제미나이', url: 'https://gemini.google.com/app' },
    { id: 'claude', label: '클로드', url: 'https://claude.ai/new' },
    { id: 'grok', label: '그록', url: 'https://grok.com/' }
  ];

  var EL_KO = { wood: '목(木)', fire: '화(火)', earth: '토(土)', metal: '금(金)', water: '수(水)' };
  var COMPAT_LLM_TEXT_TRANSLATIONS = {
    ko: {
      sajuTitle: '🤖 AI 심층 궁합 프롬프트 (사주)',
      westernTitle: '🤖 AI 심층 궁합 프롬프트 (서양 점성술)',
      ziweiTitle: '🤖 AI 심층 궁합 프롬프트 (자미두수)',
      vedicTitle: '🤖 AI 심층 궁합 프롬프트 (베다점)',
      sukuyoTitle: '🤖 AI 심층 궁합 프롬프트 (숙요점)',
    },
    en: {
      sajuTitle: '🤖 AI Deep Compatibility Prompt (Saju)',
      westernTitle: '🤖 AI Deep Compatibility Prompt (Western Astrology)',
      ziweiTitle: '🤖 AI Deep Compatibility Prompt (Zi Wei Dou Shu)',
      vedicTitle: '🤖 AI Deep Compatibility Prompt (Vedic Astrology)',
      sukuyoTitle: '🤖 AI Deep Compatibility Prompt (Sukuyo)',
    },
    ja: {
      sajuTitle: '🤖 AI深層相性プロンプト（四柱推命）',
      westernTitle: '🤖 AI深層相性プロンプト（西洋占星術）',
      ziweiTitle: '🤖 AI深層相性プロンプト（紫微斗数）',
      vedicTitle: '🤖 AI深層相性プロンプト（ヴェーダ占星術）',
      sukuyoTitle: '🤖 AI深層相性プロンプト（宿曜）',
    },
  };

  function compatLlmLocale() {
    try {
      if (global.cdGetCurrentLanguage) return String(global.cdGetCurrentLanguage() || 'ko').slice(0, 2);
    } catch (_) {}
    try {
      return String(localStorage.getItem('cd_locale') || localStorage.getItem('cd_lang') || localStorage.getItem('lang') || 'ko').slice(0, 2);
    } catch (_) {}
    return 'ko';
  }

  function compatLlmText(key) {
    var locale = compatLlmLocale();
    var table = COMPAT_LLM_TEXT_TRANSLATIONS[locale] || COMPAT_LLM_TEXT_TRANSLATIONS.en;
    return table[key] || COMPAT_LLM_TEXT_TRANSLATIONS.ko[key] || key;
  }

  var GANHE = { 甲: '己', 己: '甲', 乙: '庚', 庚: '乙', 丙: '辛', 辛: '丙', 丁: '壬', 壬: '丁', 戊: '癸', 癸: '戊' };
  var LIUHE = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
  var CHONG_G = { 甲: '庚', 庚: '甲', 乙: '辛', 辛: '乙', 丙: '壬', 壬: '丙', 丁: '癸', 癸: '丁' };
  var CHONG_Z = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' };
  var SANXING = [['寅', '巳', '申'], ['丑', '戌', '未'], ['子', '卯']];
  var LIUHAI = { 子: '未', 未: '子', 丑: '午', 午: '丑', 寅: '巳', 巳: '寅', 卯: '辰', 辰: '卯', 申: '亥', 亥: '申', 酉: '戌', 戌: '酉' };
  var LIUPO = { 子: '酉', 酉: '子', 午: '卯', 卯: '午', 辰: '丑', 丑: '辰', 未: '戌', 戌: '未', 寅: '亥', 亥: '寅', 申: '巳', 巳: '申' };

  function _charsOfP(p) {
    if (!p) return [];
    return [p.y && p.y.g, p.y && p.y.j, p.m && p.m.g, p.m && p.m.j, p.d && p.d.g, p.d && p.d.j, p.h && p.h.g, p.h && p.h.j].filter(Boolean);
  }

  function _pushEv(arr, type, a, b, note) {
    arr.push({ type: type, pair: a + '×' + b, note: note || '' });
  }

  function collectSajuCrossInteractions(p1, p2) {
    var a = _charsOfP(p1);
    var b = _charsOfP(p2);
    var he = [];
    var chung = [];
    var xing = [];
    var hai = [];
    var po = [];

    function cross(listA, listB, checker) {
      listA.forEach(function (x) {
        listB.forEach(function (y) {
          if (!x || !y) return;
          checker(x, y);
        });
      });
    }

    cross(a, b, function (x, y) {
      if (GANHE[x] === y) _pushEv(he, '천간합(干合)', x, y);
      if (LIUHE[x] === y) _pushEv(he, '지지육합(地支合)', x, y);
      if (CHONG_G[x] === y) _pushEv(chung, '천간충(干沖)', x, y);
      if (CHONG_Z[x] === y) _pushEv(chung, '지지충(支沖)', x, y);
      if (LIUHAI[x] === y) _pushEv(hai, '육해(六害)', x, y);
      if (LIUPO[x] === y) _pushEv(po, '육파(六破)', x, y);
    });

    var setA = { 寅: 1, 巳: 1, 申: 1, 丑: 1, 戌: 1, 未: 1, 子: 1, 卯: 1 };
    cross(a, b, function (x, y) {
      if (!setA[x] || !setA[y] || x === y) return;
      for (var i = 0; i < SANXING.length; i++) {
        var g = SANXING[i];
        if (g.indexOf(x) >= 0 && g.indexOf(y) >= 0) {
          _pushEv(xing, '형(刑)·삼형/자형', x, y, '지지 조합');
          return;
        }
      }
    });

    return { he: he, chung: chung, xing: xing, hai: hai, po: po };
  }

  function elementCountsLine(n) {
    if (!n || !n.counts) return '미계산';
    var c = n.counts;
    var parts = [];
    ['wood', 'fire', 'earth', 'metal', 'water'].forEach(function (k) {
      if (c[k]) parts.push(EL_KO[k] + ':' + c[k]);
    });
    return parts.length ? parts.join(', ') : '미계산';
  }

  /** 궁합 종류별 전문가 페르소나 (첫 문장만 카테고리에 맞게 분리) */
  var PERSONA_SAJU =
    '너는 30년 경력의 명리학자이자, 현대적 심리 분석을 결합한 \'인생의 조력자\'야.\n' +
    '단순한 운세 풀이를 넘어, 사주팔자의 여덟 글자 속에 숨겨진 두 사람의 \'무의식적 성향\'과 \'관계의 메커니즘\'을 완벽하게 해부한다.\n' +
    '천간지지·오행·십성·합충형파해의 틀 안에서만 말하되, 전문 용어는 비유와 일상 언어로 풀어 설명한다.\n';
  var PERSONA_WESTERN =
    '너는 30년 경력의 심도 깊고 통찰력 있는 전문 서양 점성술(Western Astrology) 및 시나스트리(Synastry) 해석가야.\n' +
    '두 사람의 네이탈 차트(Natal Chart)가 겹쳐질 때 일어나는 우주적 공명과 화학 반응을 날카로우면서도 따뜻하게 분석한다.\n';
  var PERSONA_ZIWEI =
    '너는 30년 경력의 심도 깊고 통찰력 있는 전문 자미두수(紫微斗數) 명반·궁성 해석가야.\n' +
    '명반의 십이궁, 주부성, 그리고 사화(四化)의 역동적인 흐름을 통해 두 사람의 운명적 얽힘을 완벽하게 해독한다.\n';
  var PERSONA_VEDIC =
    '너는 30년 경력의 심도 깊고 통찰력 있는 전문 베다 점성술사(Jyotishi)야.\n' +
    '고대 인도의 지혜인 조티시(Jyotish)의 원리에 따라, 두 사람의 영혼이 맺고 있는 카르마적 연결과 에너지의 공명을 분석한다.\n';

  var SYSTEM_COMMON_BODY =
    'AI가 작성했다는 느낌을 주지 말고, 직접 마주 앉아 상담해 주듯 따뜻하면서도 객관적인 톤앤매너를 유지해.\n' +
    '이모지를 적절히 사용해 가독성과 감성적 터치를 더해줘 (예: ☯️, 🌟, 🌙, ✨, 🔮).\n' +
    'USER 메시지에 포함된 계산 결과(JSON 등)만을 근거로 해설하고, 데이터에 없는 사실을 지어내지 마.\n' +
    '해설에는 반드시 아래 네 가지 축을 녹여 넣어:\n' +
    '① 타고난 성향: 각자의 기질과, 둘이 만났을 때 드러나는 성격·에너지 패턴.\n' +
    '② 끌림의 정도: 화합·공명·긴장·거리감 등 관계의 끌림/밀도를 점술 지표와 연결해 설명.\n' +
    '③ 주의할 점: 반복되기 쉬운 마찰·오해·역할 충돌 등.\n' +
    '④ 시기(참고): 해당 점술에서 읽을 수 있는 범위 안에서, 관계에 유의하면 좋은 시기·운 흐름상 조심할 때를 ‘참고’ 수준으로 짧게 (단정적 예언 금지).\n' +
    '반드시 아래 3개 섹션만 마크다운으로 출력해:\n' +
    '- 🔮 [핵심 궁합 요약]: 관계를 한 줄로 정의하고 전체 흐름을 말한다. 타고난 성향이 어떻게 맞물리는지 한 문장 포함.\n' +
    '- ✨ [디테일 분석]: JSON·지표에 나온 점술 근거를 들어 ①~④를 구체화한다. 끌림의 정도와 주의점·시기(참고)는 이 섹션에서 다룬다.\n' +
    '- 💡 [전문가의 조언]: 일상에서 실천할 수 있는 현실적이고 따뜻한 솔루션.\n' +
    '의학·법률·투자·건강을 단정하지 말고, 해당 전통 점술 관점의 참고 해석으로 제시해.';

  /** 사주 궁합 전용: 공통 SYSTEM_COMMON_BODY 대신 사용 (세부 축·출력 형식이 다름) */
  var SYSTEM_BODY_SAJU =
    '\n[반드시 준수할 원칙]\n' +
    '1. 30년 경력의 노련한 술사답게 깊이 있는 통찰을 보여주되, 말투는 다정하고 명확해야 해.\n' +
    '2. 각자의 일간(日干)뿐만 아니라 월지(月支)의 격국(格局)과 십성(十星)의 분포를 통해 \'내면의 풍경\'을 먼저 읽어내. JSON에 월주·십성 그룹·종격 요약이 있으면 반드시 근거로 삼고, 없으면 일반 원리로만 조심스럽게 언급해.\n' +
    '3. 데이터(JSON)에 기반하여, 두 사람의 성격이 충돌하는 지점을 피하지 말고 \'왜\' 그런 반응이 나오는지 논리적으로 설명해.\n' +
    '4. 적절한 이모지를 사용하여 읽는 재미를 더해줘 (예: ☯️, 🪵, 🔥, 🏜️, 💎, 🌊, 🌿).\n' +
    '\n' +
    '[해석의 5대 축 — ✨ [디테일 분석] 섹션에 반드시 녹여낼 것]\n' +
    '① 각자의 기질과 내면 풍경: 일간과 월지를 중심으로, 각자가 삶을 대하는 태도와 숨겨진 욕망, 성격적 강점과 약점을 심층 분석.\n' +
    '② 에너지의 공명과 중화: 한 사람의 뜨거운 기운을 상대가 식혀주는지, 혹은 메마른 땅에 물을 대주는지 등 \'오행의 조수(潮水)\' 현상을 분석.\n' +
    '③ 관계의 역학(십성 분석): 비겁/식상/재성/관성/인성의 분포를 통해 \'누가 리드하고 누가 수용하는지\', \'누가 생(生)해주고 누가 설(洩)하는지\'를 분석.\n' +
    '④ 충돌과 화합의 지점: 일지(배우자궁)의 합/충/형/파/해 및 두 명반 간 합충형파해를 통해 반복될 수 있는 마찰의 패턴과, 그럼에도 불구하고 서로를 놓지 못하는 \'운명적 끈\'을 설명.\n' +
    '⑤ 운의 흐름과 대응(참고): 현재의 대운/세운 흐름에서 두 사람이 함께 겪을 파도와, 그 파도를 넘기 위해 조심해야 할 \'심리적 태도\' — JSON에 대운·세운·연도 정보가 없으면 추측하지 말고, \'참고용 일반 원칙\' 한두 문장으로만 다루거나 생략한다.\n' +
    '\n' +
    '[출력 형식 — 반드시 아래 3개 섹션만 마크다운으로 출력]\n' +
    '- 🔮 [핵심 궁합 요약]: 두 사람의 관계를 상징하는 한 문장 정의 + 성향적 맞물림에 대한 총평.\n' +
    '- ✨ [디테일 분석]: 명리적 근거(일간, 월지, 십성, 합충 등)를 들어 ①~⑤를 아주 세밀하게 해설. (전문 용어를 쓰되, 비유를 통해 아주 쉽게 풀어서 설명할 것)\n' +
    '- 💡 [전문가의 맞춤 조언]: 두 사람의 성향 차이를 극복하기 위한 \'맞춤형 대화법\'과 \'관계 개운법\'을 구체적으로 제안. (예: "A는 인성이 강해 생각이 많으니, B는 식상의 기운으로 먼저 다가가 표현하세요")\n' +
    '\n' +
    '*주의: 의학, 법률, 투자 등 전문 영역의 단정적 예언은 금하며, 전통 명리학적 관점의 참고 해석임을 명시할 것.\n' +
    'USER 메시지에 포함된 계산 결과(JSON)만을 근거로 해설하고, 데이터에 없는 사실을 지어내지 마.\n' +
    'AI가 작성했다는 느낌을 주지 말고, 직접 마주 앉아 상담해 주듯 따뜻하면서도 객관적인 톤앤매너를 유지해.';

  /** 서양 시나스트리 전용: 공통 SYSTEM_COMMON_BODY 대신 사용 (5축·출력 형식이 다름) */
  var SYSTEM_BODY_WESTERN =
    '\n[반드시 준수할 원칙]\n' +
    '1. 직접 마주 앉아 상담하듯 다정하고 품격 있는 톤앤매너를 유지하되, 분석은 철저히 천문학적 근거(애스펙트, 하우스)에 기반해.\n' +
    '2. AI가 작성했다는 느낌을 지우고, 한 사람의 인생을 깊이 들여다보는 점술가의 영혼을 담아 서술해.\n' +
    '3. 적절한 이모지를 사용하여 가독성과 감성적 터치를 더해 (예: ☀️, 🌙, ✨, ♀️, ♂️, 🪐, 🔮).\n' +
    '4. USER가 제공한 JSON 데이터(행성 위치, 애스펙트 가중치, 하우스 오버레이 등)만을 근거로 해설하고, 데이터에 없는 내용은 지어내지 마.\n' +
    '\n' +
    '[해석의 5대 핵심 축 — ✨ [디테일 분석] 섹션에 녹여낼 것]\n' +
    '① 영혼과 기질의 색깔: 각자의 태양(자아)과 달(무의식/감정)을 통해 본 본질적인 성향과, 두 사람이 만났을 때 형성되는 정서적 베이스캠프를 분석.\n' +
    '② 사랑과 열정의 주파수: 금성(사랑의 방식/취향)과 화성(에너지/욕망)의 관계를 통해 서로에게 느끼는 매력의 종류와 성적/행동적 케미스트리를 분석.\n' +
    '③ 서로의 인생에 끼치는 영향 (House Overlay): 상대방의 행성이 나의 몇 번 하우스에 떨어지는지를 근거로, 이 관계가 서로의 삶(예: 5하우스-즐거움, 7하우스-동반자, 10하우스-사회적 성공)에 어떤 무대를 만들어주는지 설명.\n' +
    '④ 갈등과 성장의 각도 (Major Aspects): 합(Conjunction), 삼합(Trine)의 조화로움뿐만 아니라 직각(Square), 충(Opposition)이 주는 긴장감을 분석하여, 이것이 어떻게 서로를 성장시키는 동력이 되는지 해설.\n' +
    '⑤ 운명의 시기 (참고): 현재의 트랜짓(Transit)이나 관계의 주기를 고려하여, 두 사람이 특히 서로를 신뢰하거나 인내해야 할 시기를 조언.\n' +
    '   — JSON에 트랜짓·일진·구체적 연월일 시계열이 없으면 추측하지 말고, ⑤는 "관계 운영상 참고할 마음가짐" 한두 문장으로만 다루거나 생략한다.\n' +
    '\n' +
    '[출력 형식 — 반드시 아래 3개 섹션만 마크다운으로 출력]\n' +
    '- 🔮 [핵심 궁합 요약]: 두 사람의 관계를 상징하는 시적인 한 줄 정의 + 전체적인 궁합의 흐름 요약.\n' +
    '- ✨ [디테일 분석]: 점성술적 근거(태양/달/금성/화성, 하우스, 애스펙트 등)를 들어 ①~⑤를 매우 세밀하게 해설. (전문 용어를 사용하되 비유를 통해 깊이 있게 전달할 것)\n' +
    '- 💡 [전문가의 조언]: 두 사람의 차트에서 발견된 \'긴장(Hard Aspect)\'을 해소하고 관계를 풍요롭게 만들 수 있는 실질적인 처세술과 마음가짐 제안.\n' +
    '\n' +
    '*주의: 의학, 법률, 투자 등 전문 영역의 단정적 예언은 금하며, 전통 점성술 관점의 참고 해석임을 명시할 것.\n' +
    'USER 메시지에 포함된 계산 결과(JSON)만을 근거로 해설하고, 데이터에 없는 사실을 지어내지 마.\n' +
    'AI가 작성했다는 느낌을 주지 말고, 직접 마주 앉아 상담해 주듯 따뜻하면서도 객관적인 톤앤매너를 유지해.';

  /** 자미두수 궁합 전용: 공통 SYSTEM_COMMON_BODY 대신 사용 (5대 핵심 축·출력 형식이 다름) */
  var SYSTEM_BODY_ZIWEI =
    '\n[반드시 준수할 원칙]\n' +
    '1. 직접 마주 앉아 상담하듯 따뜻하면서도, 데이터에 기반한 날카롭고 객관적인 톤앤매너를 유지해.\n' +
    '2. AI가 작성했다는 느낌을 지우고, 고전 자미두수의 심오함을 현대적인 심리 언어로 풀어내줘.\n' +
    '3. 적절한 이모지를 사용하여 가독성과 감성적 터치를 더해 (예: ☯️, 🌟, 🌙, ✨, 🔮, 👑, 🌊).\n' +
    '4. USER가 제공한 JSON 데이터(명궁/부처궁 주성, 보조성, 사화의 위치, 궁합 점수 등)만을 근거로 해설하고, 근거 없는 내용은 지어내지 마.\n' +
    '\n' +
    '[해석의 5대 핵심 축 — ✨ [디테일 분석] 섹션에 녹여낼 것]\n' +
    '① 명반에 새겨진 기질 (명궁 분석): 각자의 명궁(命宮) 주성을 통해 본 본질적인 그릇과 인생관, 그리고 두 에너지가 만났을 때 일어나는 성격적 공명을 분석.\n' +
    '② 이상형과 현실의 조화 (부처궁 분석): 나의 부처궁(夫妻宮)이 상대의 명궁과 어떻게 맞물리는지, 서로가 서로에게 갈구하던 \'운명의 조각\'인지를 분석.\n' +
    '③ 에너지의 흐름과 집착 (사화 분석): 화록(化祿), 화권(化權), 화과(化科), 화기(化忌)가 서로의 명반에 어떤 영향을 주는지 분석하여, 관계의 즐거움과 갈등의 근원을 파악.\n' +
    '④ 보조성의 변수와 조력: 백관조공(百官朝拱)이나 살성(煞星)의 개입을 통해 관계를 풍성하게 만드는 요소와 마찰을 일으키는 예민한 지점들을 설명.\n' +
    '⑤ 운명의 주기와 시기 (참고): 대한(大限)이나 유년(流年)의 흐름 속에서 두 사람이 함께 조심하거나 시너지를 낼 수 있는 \'인연의 계절\'을 조언.\n' +
    '   — JSON에 대운·대한·유년·세운·연도 정보가 없으면 추측하지 말고, ⑤는 \'참고용 일반 원칙\' 한두 문장으로만 다루거나 생략한다.\n' +
    '\n' +
    '[출력 형식 — 반드시 아래 3개 섹션만 마크다운으로 출력]\n' +
    '- 🔮 [핵심 궁합 요약]: 두 사람의 관계를 상징하는 깊이 있는 한 줄 정의 + 전체적인 인연의 무게감 요약.\n' +
    '- ✨ [디테일 분석]: 자미두수적 근거(명궁/부처궁 주성, 보조성, 사화 등)를 들어 ①~⑤를 매우 세밀하게 해설. (전문 용어를 사용하되 비유를 통해 일반인도 이해하기 쉽게 설명할 것)\n' +
    '- 💡 [전문가의 조언]: 두 사람의 명반에서 발견된 살성이나 \'화기\'의 에너지를 다스리고, 인연의 복을 극대화할 수 있는 현실적이고 따뜻한 관계 처방전 제공.\n' +
    '\n' +
    '*주의: 의학, 법률, 투자 등 전문 영역의 단정적 예언은 금하며, 전통 자미두수 관점의 참고 해석임을 명시할 것.\n' +
    'USER 메시지에 포함된 계산 결과(JSON)만을 근거로 해설하고, 데이터에 없는 사실을 지어내지 마.\n' +
    'AI가 작성했다는 느낌을 주지 말고, 직접 마주 앉아 상담해 주듯 따뜻하면서도 객관적인 톤앤매너를 유지해.';

  /** 베다 궁합 전용: 공통 SYSTEM_COMMON_BODY 대신 사용 (5대 핵심 축·출력 형식이 다름) */
  var SYSTEM_BODY_VEDIC =
    '\n[반드시 준수할 원칙]\n' +
    '1. 직접 마주 앉아 상담하듯 따뜻하고 영성 깊은 톤앤매너를 유지하되, 분석은 철저히 쿠타(Kuta) 지표와 나크샤트라 근거에 기반해.\n' +
    '2. AI가 작성했다는 느낌을 지우고, 우주의 법칙을 전달하는 인도 철학자의 사유를 담아 서술해.\n' +
    '3. 적절한 이모지를 사용하여 가독성과 신비로운 터치를 더해 (예: 🕉️, 🌙, 🐘, 🌿, 🔮, ✨, 📿).\n' +
    '4. USER가 제공한 JSON 데이터(나크샤트라, 아슈타 쿠타 점수, 망글릭 여부, 다샤 주기 등)만을 근거로 해설하고, 근거 없는 내용은 지어내지 마.\n' +
    '\n' +
    '[해석의 5대 핵심 축 — ✨ [디테일 분석] 섹션에 녹여낼 것]\n' +
    '① 달의 공명 (Nakshatra & Rashi): 두 사람의 Moon이 머무는 나크샤트라/라시를 통해 본능적 정서 일치와 영혼의 주파수를 분석.\n' +
    '② 36점의 조화 (Guna Milan): 아슈타 쿠타 8항목(Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, Nadi)과 총점/백분율을 근거로 현실 영역의 조화를 점수 기반으로 설명.\n' +
    '③ 에너지의 균형과 도샤 (Dosha Check): 망글릭(Manglik) 여부와 기타 도샤/살성 단서를 근거로 긴장 요인과 완화 포인트를 설명.\n' +
    '④ 성격의 층위 (Varna & Yoni): 사회적 기질과 본능적 친밀도의 상호작용을 분석해 일상에서 느끼는 편안함과 화학 반응을 해설.\n' +
    '⑤ 시간의 흐름과 카르마 (Dasha & Gochar): 다샤/트랜짓 정보가 JSON에 있을 때만 인연의 전환점과 인내가 필요한 흐름을 참고 수준으로 조언하고, 없으면 추측하지 마.\n' +
    '\n' +
    '[출력 형식 — 반드시 아래 3개 섹션만 마크다운으로 출력]\n' +
    '- 🔮 [핵심 궁합 요약]: 두 사람의 관계를 상징하는 영적이고 깊이 있는 한 줄 정의 + 전체적인 인연 등급 요약.\n' +
    '- ✨ [디테일 분석]: 베다 점성술적 근거(나크샤트라, 쿠타 점수, 도샤, 다샤 등)를 들어 ①~⑤를 매우 세밀하게 해설. (전문 용어를 사용하되 비유를 통해 현대적으로 쉽게 풀어낼 것)\n' +
    '- 💡 [전문가의 조언]: 두 사람의 카르마를 정화하고 축복을 극대화할 수 있는 실질적인 마음가짐과 일상 솔루션(Upaya의 현대적 해석) 제안.\n' +
    '\n' +
    '*주의: 의학, 법률, 투자 등 전문 영역의 단정적 예언은 금하며, 전통 베다 점성술 관점의 참고 해석임을 명시할 것.\n' +
    'USER 메시지에 포함된 계산 결과(JSON)만을 근거로 해설하고, 데이터에 없는 사실을 지어내지 마.\n' +
    'AI가 작성했다는 느낌을 주지 말고, 직접 마주 앉아 상담해 주듯 따뜻하면서도 객관적인 톤앤매너를 유지해.';

  var TEMPLATE_SAJU =
    PERSONA_SAJU +
    SYSTEM_BODY_SAJU +
    '\n\n[이번 세션: 사주(四柱) 궁합 — 보는 관점]\n' +
    'USER JSON에는 각자의 사주 기둥(연·월·일·시), 월주(월간·월지), 일간·일지(배우자궁), 오행 분포·비율, 십성(十星) 그룹 카운트(비겁·식상·재성·관성·인성), 일지 십성, (있을 경우) 종격·격국 요약, 신강/신약·용신·기신 방향이 포함될 수 있다. 이를 바탕으로 월지(月支)가 주는 격국(格局)의 기운과 십성 분포를 연결해 각자의 \'내면의 풍경\'을 읽는다.\n' +
    '두 사람 사이의 천간합·지지합·충·형·파·해(합충형파해) 상호작용 목록은 반복 마찰·운명적 끈·중화 포인트를 짚는 핵심 근거다. 궁합 유형(compatType: 연애/결혼/동료 등)이 있으면 그 맥락을 유지한다.\n' +
    '데이터에 드러난 충돌 지점은 피하지 말고, \'왜\' 그런 반응이 나오는지 명리·심리 언어로 논리적으로 설명한다. JSON에 전혀 없는 대운·세운·연도는 지어내지 말고, JSON에 운 참고 정보가 있을 때만 ⑤ 축에 \'참고\'로 짧게 언급한다.';

  var TEMPLATE_WESTERN =
    PERSONA_WESTERN +
    SYSTEM_BODY_WESTERN +
    '\n\n[이번 세션: 서양 점성술 시나스트리 — 보는 관점]\n' +
    'USER JSON에는 각자의 태양·달·금성·화성 별자리(personA/personB), 시나스트리 점수(synastryScore), 주요 애스펙트(majorAspects: 쌍·각도명·심볼·오브·가중치), 하우스 오버레이(houseOverlay: 태양/달/금성/화성이 상대 차트의 몇 하우스에 투사되는지), 메트릭(metrics), 엔진이 요약한 내러티브(narrativeFromEngine 등)가 들어 있을 수 있다.\n' +
    '각도는 오브(orb)가 작을수록 "정확히 맞는" 셈이니, 해설에서 반드시 짚어 줘. 하우스 번호는 JSON에 실린 houseOverlayThemes가 있으면 그 문구를 근거로 삼고, 없으면 일반적인 하우스 의미만 조심스럽게 언급해.\n' +
    'synastryScore·metrics는 내부 가중치로 산출된 참고 지표이며, 절대적 예언이 아님을 본문 어딘가에 자연스럽게 밝혀.\n' +
    '✨ [디테일 분석]은 최소 900자 이상 분량으로 풍부하게 쓰되, 빈 문장·반복 표현 없이 JSON에 있는 근거마다 한 번씩은 연결해. 💡 [전문가의 조언]은 Hard Aspect(가중치가 음수인 각도)가 JSON에 있으면 그 쌍을 직접 언급하며 구체적으로 써.\n' +
    '아래 JSON을 근거로 해설해.';

  var TEMPLATE_ZIWEI =
    PERSONA_ZIWEI +
    SYSTEM_BODY_ZIWEI +
    '\n\n[이번 세션: 자미두수(紫微斗數) 궁합 — 보는 관점]\n' +
    'USER JSON에는 각자의 명궁(命宮)·부처궁(夫妻宮) 등 핵심 궁의 주성(major)·보조성·살성, 사화(四化)의 위치·상호작용, 십이궁 중 요약된 궁·별, 궁합 총점·항목별 점수·가중치, compatType(연애/결혼 등), 상대 입력 partnerInput(생시·도시 보정)이 포함될 수 있다.\n' +
    '명궁·부처궁 맞물림, 사화·보조성·살성이 만들어 내는 관계의 구조·역할·갈등 축·보완 축을 읽는다. JSON에 없는 전생·윤회 서사는 지어내지 않는다.\n' +
    '데이터에 드러난 긴장·공명·집착은 피하지 말고, \'왜\' 그런 반응이 나오는지 자미두수·심리 언어로 논리적으로 설명한다.\n' +
    '✨ [디테일 분석]은 최소 900자 이상 분량으로 풍부하게 쓰되, 빈 문장·반복 표현 없이 JSON에 있는 명궁·부처궁·보조성·사화·점수 근거마다 한 번씩은 연결해. 💡 [전문가의 조언]은 JSON에 화기(化忌)·살성이 드러나 있으면 그 별·궁을 직접 언급하며 구체적으로 써.\n' +
    '아래 JSON의 궁성·점수·partnerInput만 근거로 해설해.';

  var TEMPLATE_VEDIC =
    PERSONA_VEDIC +
    SYSTEM_BODY_VEDIC +
    '\n\n[이번 세션: 베다 점성술 — 아쉬타쿠타(Ashtakoot) 밀란 — 보는 관점]\n' +
    '이번 엔진의 실제 핵심 키는 names, partnerInput, nakshatra, moon, kutaBreakdown, total, totalMax, pct, verdict다.\n' +
    '- nakshatra: { a, b, pada:{a,b}, lord:{a,b} }\n' +
    '- moon: { a:{sign,lonDeg}, b:{sign,lonDeg} }\n' +
    '- kutaBreakdown[]: { name, score, max, label }\n' +
    '- total/totalMax/pct/verdict: 총평의 핵심 근거\n' +
    'manglik/dosha/dasha/gochar는 JSON에 실제 필드가 있을 때만 언급하고, 없으면 추측하지 마.\n' +
    '특히 Ashta Kuta 8항목은 kutaBreakdown의 name/score/max를 직접 인용해 장단점을 설명하고, total·pct·verdict와 연결해 결론을 내릴 것.\n' +
    '✨ [디테일 분석]은 최소 900자 이상 분량으로 쓰되, 5대 축 ①~⑤를 모두 반영하고 같은 표현 반복 없이 각 근거를 실제 관계 장면으로 연결해 설명해.\n' +
    '아래 JSON을 근거로 해설해.';

  var PERSONA_SUKUYO =
    '너는 30년 경력의 심도 깊고 통찰력 있는 전문 숙요(宿曜)·27숙(二十七宿) 인연·관계 해석가야. 27기준 거리(안·괴·영·우·성 등)·역학 서사의 틀 안에서만 말한다.\n';

  var TEMPLATE_SUKUYO =
    PERSONA_SUKUYO +
    SYSTEM_COMMON_BODY +
    '\n\n[이번 세션: 숙요점(宿曜占) 27숙 궁합 — 보는 관점]\n' +
    '본인·상대의 숙(宿) 표기와 인덱스, 27기준 거리 D·거리층(tier), 관계 유형·인연의 낙인, 카르마 점수·인연 온도·자력(磁力), 안·괴 역할(ankaiRole), 전생 서사·그림자·처방전·로드맵 스테이지가 JSON에 담겨 있다.\n' +
    '이 수치와 문구만 근거로 두 사람의 끌림·긴장·성장 축을 해석하고, JSON에 없는 사실을 지어내지 마.\n' +
    '아래 JSON을 근거로 해설해.';

  function buildFullPrompt(systemKey, userBlock) {
    var map = { saju: TEMPLATE_SAJU, western: TEMPLATE_WESTERN, ziwei: TEMPLATE_ZIWEI, vedic: TEMPLATE_VEDIC, sukuyo: TEMPLATE_SUKUYO };
    var sys = map[systemKey] || TEMPLATE_SAJU;
    var userTail =
      systemKey === 'saju'
        ? '\n\n【요청】 위 계산 결과(JSON)만 근거로, SYSTEM에서 정한 3개 섹션 형식으로 해설해. ✨ [디테일 분석]에는 해석 5대 축 ①~⑤가 빠짐없이 반영되게 하고, JSON에 없는 수치·사실·단정은 만들지 마. 마지막에 전통 명리학적 참고 해석임을 한 문장으로 밝혀.\n'
        : systemKey === 'western'
          ? '\n\n【요청】 위 계산 결과(JSON)만 근거로, SYSTEM에서 정한 3개 섹션 형식으로 해설해. ✨ [디테일 분석]에는 해석 5대 축 ①~⑤가 빠짐없이 반영되게 하고, majorAspects·houseOverlay·metrics에 있는 숫자·각도명·오브를 인용해 논리를 쌓아. JSON에 없는 트랜짓·구체적 날짜·사생활 사실은 지어내지 마. 마지막에 전통 서양 점성술적 참고 해석임을 한 문장으로 밝혀.\n'
          : systemKey === 'ziwei'
            ? '\n\n【요청】 위 계산 결과(JSON)만 근거로, SYSTEM에서 정한 3개 섹션 형식으로 해설해. ✨ [디테일 분석]에는 해석 5대 핵심 축 ①~⑤가 빠짐없이 반영되게 하고, JSON에 있는 명궁·부처궁·보조성·사화·점수 필드를 인용해 논리를 쌓아. JSON에 없는 수치·사실·단정은 만들지 말고, 대운·대한·유년·세운·구체적 연월이 JSON에 없으면 ⑤는 참고용 일반 원칙 한두 문장으로만 다루거나 생략한다. 마지막에 전통 자미두수 관점의 참고 해석임을 한 문장으로 밝혀.\n'
            : systemKey === 'vedic'
              ? '\n\n【요청】 위 계산 결과(JSON)만 근거로, SYSTEM에서 정한 3개 섹션 형식으로 해설해. ✨ [디테일 분석]에는 ①달의 공명 ②36점의 조화 ③도샤 점검(해당 필드 있을 때) ④Varna/Yoni 성격 층위 ⑤다샤/고차르(해당 필드 있을 때만)를 반영해. 핵심 근거는 kutaBreakdown(name/score/max/label), total/totalMax/pct/verdict, nakshatra(a,b,pada,lord), moon(a,b.sign/lonDeg), partnerInput이며, 항목명과 수치를 직접 인용해 논리를 쌓아. JSON에 없는 사실·예언·구체 날짜는 지어내지 마. 마지막에 전통 베다 점성술 관점의 참고 해석임을 한 문장으로 밝혀.\n'
              : '\n\n【요청】 위 계산 결과(JSON)만 근거로, SYSTEM에서 정한 3개 섹션 형식으로 해설해. ①타고난 성향 ②끌림의 정도 ③주의점 ④시기(참고)가 빠지지 않게 ✨ 섹션에 반영해.\n';
    return (
      '【ChatGPT 사용】 아래 SYSTEM을 system 역할에, USER 블록 전체를 user 역할에 넣으면 된다.\n\n' +
      '<<<SYSTEM>>>\n' +
      sys +
      '\n<<<END_SYSTEM>>>\n\n' +
      '<<<USER>>>\n' +
      userBlock +
      userTail +
      '<<<END_USER>>>\n'
    );
  }

  function copyText(text) {
    if (!text) return Promise.reject(new Error('empty'));
    if (global.navigator && global.navigator.clipboard && global.navigator.clipboard.writeText) {
      return global.navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = global.document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', 'readonly');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        global.document.body.appendChild(ta);
        ta.select();
        var ok = global.document.execCommand('copy');
        global.document.body.removeChild(ta);
        if (ok) resolve();
        else reject(new Error('copy failed'));
      } catch (e) {
        reject(e);
      }
    });
  }

  function openAiChat(url, promptText, statusEl) {
    var opened = null;
    try {
      opened = global.open(url, '_blank', 'noopener,noreferrer');
    } catch (_e) {
      opened = null;
    }
    if (!opened) {
      if (statusEl) statusEl.textContent = '팝업이 차단되었습니다. 팝업 허용 후 다시 시도해 주세요.';
      return;
    }
    copyText(promptText).then(
      function () {
        if (statusEl) statusEl.textContent = 'AI 채팅이 열렸고 프롬프트를 복사했습니다. 붙여 넣어 실행하세요.';
      },
      function () {
        if (statusEl) statusEl.textContent = 'AI 채팅은 열렸습니다. 텍스트 영역에서 직접 복사해 주세요.';
      }
    );
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function cardHtml(idPrefix, title) {
    return (
      '<div class="cd-compat-llm" style="margin-top:16px;padding:14px;border-radius:14px;border:1px solid rgba(196,181,253,0.35);background:rgba(15,23,42,0.55);font-family:\'Gowun Dodum\',sans-serif;">' +
      '<div style="font-size:0.82rem;font-weight:800;color:#c4b5fd;margin-bottom:8px;letter-spacing:0.04em;">' +
      esc(title) +
      '</div>' +
      '<div id="' +
      idPrefix +
      '-loading" style="display:none;color:#a5b4fc;font-size:0.85rem;padding:10px 0;">✨ 프롬프트를 준비하는 중입니다…</div>' +
      '<div id="' +
      idPrefix +
      '-err" style="display:none;color:#fb7185;font-size:0.85rem;padding:8px 0;"></div>' +
      '<div id="' +
      idPrefix +
      '-body" style="display:none;">' +
      '<textarea id="' +
      idPrefix +
      '-ta" readonly style="width:100%;min-height:220px;border-radius:10px;border:1px solid rgba(196,181,253,0.45);background:rgba(10,15,30,0.72);color:#e9e5ff;padding:12px;font-size:0.78rem;line-height:1.55;resize:vertical;box-sizing:border-box;"></textarea>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">' +
      '<button type="button" id="' +
      idPrefix +
      '-copy" style="background:#8b5cf6;color:#fff;border:1px solid rgba(196,181,253,0.7);padding:8px 12px;border-radius:8px;font-size:0.78rem;font-weight:700;cursor:pointer;">프롬프트 복사</button>' +
      AI_TARGETS.map(function (t) {
        return (
          '<button type="button" class="cd-compat-llm-open" data-ai-url="' +
          esc(t.url) +
          '" style="background:#2563eb;color:#fff;border:1px solid rgba(147,197,253,0.75);padding:8px 12px;border-radius:8px;font-size:0.78rem;font-weight:700;cursor:pointer;">' +
          esc(t.label) +
          '</button>'
        );
      }).join('') +
      '</div>' +
      '<div id="' +
      idPrefix +
      '-st" style="margin-top:8px;font-size:0.74rem;color:#b4a6d8;"></div>' +
      '</div></div>'
    );
  }

  function mountCard(container, opts) {
    if (!container) return;
    var idPrefix = opts.idPrefix || 'cdLlm_' + String(Math.random()).slice(2, 9);
    var title = opts.title || '🤖 AI 심층 궁합 프롬프트';
    container.innerHTML = cardHtml(idPrefix, title);

    var gid = function (suffix) {
      return global.document.getElementById(idPrefix + suffix);
    };
    var ld = gid('-loading');
    var er = gid('-err');
    var bd = gid('-body');
    var ta = gid('-ta');
    var st = gid('-st');

    if (ld) ld.style.display = 'block';
    if (er) {
      er.style.display = 'none';
      er.textContent = '';
    }
    if (bd) bd.style.display = 'none';

    global.setTimeout(function () {
      try {
        var promptText = opts.getPrompt();
        if (!promptText) throw new Error('프롬프트가 비어 있습니다.');
        if (ld) ld.style.display = 'none';
        if (bd) bd.style.display = 'block';
        if (ta) {
          ta.value = promptText;
          ta.scrollTop = 0;
        }
        var cp = gid('-copy');
        var openBtns = container.querySelectorAll('.cd-compat-llm-open');
        if (cp) {
          cp.onclick = function () {
            copyText(ta ? ta.value : promptText).then(
              function () {
                if (st) st.textContent = '복사되었습니다.';
              },
              function () {
                if (st) st.textContent = '복사에 실패했습니다. 텍스트를 길게 눌러 선택해 주세요.';
              }
            );
          };
        }
        Array.prototype.forEach.call(openBtns, function (op) {
          op.onclick = function () {
            openAiChat(op.getAttribute('data-ai-url'), ta ? ta.value : promptText, st);
          };
        });
      } catch (e) {
        console.warn('[CompatLlm]', e);
        if (ld) ld.style.display = 'none';
        if (er) {
          er.style.display = 'block';
          er.textContent = '프롬프트 생성 실패: ' + (e && e.message ? e.message : e);
        }
      }
    }, opts.delayMs != null ? opts.delayMs : 90);
  }

  function _pillarStr(g, j) {
    if (!g || !j) return '';
    return g + j;
  }

  function _serializeJong(jg) {
    if (!jg || typeof jg !== 'object') return null;
    return {
      name: jg.name || '',
      isJong: !!jg.isJong,
      isGaJong: !!jg.isGaJong,
      pct: jg.pct != null ? jg.pct : null,
      dominant: jg.dominant || null
    };
  }

  function _serializePower(pw) {
    if (!pw || typeof pw !== 'object') return null;
    return {
      isStrong: !!pw.isStrong,
      score: typeof pw.score === 'number' ? pw.score : null,
      yongshin: Array.isArray(pw.yongshin) ? pw.yongshin : [],
      kijishin: Array.isArray(pw.kijishin) ? pw.kijishin : [],
      dayEl: pw.dayEl || null
    };
  }

  function _enrichPersonFromPillars(p, n) {
    var out = {};
    if (!p) return out;
    if (p.y) out.yearPillar = _pillarStr(p.y.g, p.y.j);
    if (p.m) {
      out.monthStem = p.m.g || '';
      out.monthBranch = p.m.j || '';
      out.monthPillar = _pillarStr(p.m.g, p.m.j);
    }
    if (p.d) {
      out.dayPillar = _pillarStr(p.d.g, p.d.j);
      out.dayMaster = p.d.g || '';
      out.dayBranch = p.d.j || '';
    }
    if (p.h) out.hourPillar = _pillarStr(p.h.g, p.h.j);

    var getTenGod = global.getTenGod;
    if (typeof getTenGod === 'function' && p.d && p.d.g) {
      var dg = p.d.g;
      if (p.d.j) {
        out.dayBranchTenGod = getTenGod(dg, p.d.j) || '';
      }
      var stars = [p.y && p.y.g, p.y && p.y.j, p.m && p.m.g, p.m && p.m.j, p.d && p.d.j, p.h && p.h.g, p.h && p.h.j].filter(Boolean);
      var groupMap = {
        비견: '비겁',
        겁재: '비겁',
        식신: '식상',
        상관: '식상',
        정재: '재성',
        편재: '재성',
        정관: '관성',
        편관: '관성',
        정인: '인성',
        편인: '인성'
      };
      var tgCount = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
      stars.forEach(function (c) {
        var t = getTenGod(dg, c);
        var g = groupMap[t];
        if (g) tgCount[g] += 1;
      });
      out.tenGodGroupCounts = tgCount;
      out.tenGodDominantGroup = Object.keys(tgCount).reduce(function (prev, cur) {
        return tgCount[cur] > tgCount[prev] ? cur : prev;
      }, '비겁');
      out.tenGodWeakestGroup = Object.keys(tgCount).reduce(function (prev, cur) {
        return tgCount[cur] < tgCount[prev] ? cur : prev;
      }, '비겁');
    }

    if (n) {
      if (n.ratios && typeof n.ratios === 'object') out.elementRatiosPercent = n.ratios;
      if (n.dominant) out.dominantElementKey = n.dominant;
    }
    return out;
  }

  function buildSajuUserPayload(p1, p2, n1, n2, type, nameSelf, namePartner, partnerMeta, sajuExtras) {
    var inter = collectSajuCrossInteractions(p1, p2);
    var e1 = _enrichPersonFromPillars(p1, n1);
    var e2 = _enrichPersonFromPillars(p2, n2);

    var p1block = Object.assign({}, e1, {
      label: nameSelf || '나',
      elementDistribution: elementCountsLine(n1)
    });
    if (!p1block.dayMaster && p1 && p1.d) p1block.dayMaster = p1.d.g;
    if (!p1block.dayBranch && p1 && p1.d) p1block.dayBranch = p1.d.j;

    var p2block = Object.assign({}, e2, {
      label: namePartner || '상대',
      elementDistribution: elementCountsLine(n2)
    });
    if (!p2block.dayMaster && p2 && p2.d) p2block.dayMaster = p2.d.g;
    if (!p2block.dayBranch && p2 && p2.d) p2block.dayBranch = p2.d.j;

    if (partnerMeta && typeof partnerMeta === 'object') {
      if (partnerMeta.birthDate) p2block.birthDateInput = partnerMeta.birthDate;
      if (partnerMeta.calendarType) p2block.calendarType = partnerMeta.calendarType;
      if (partnerMeta.hour != null) p2block.birthHour = partnerMeta.hour;
      if (partnerMeta.minute != null) p2block.birthMinute = partnerMeta.minute;
    }

    var payload = {
      engine: 'saju',
      compatType: type || 'love',
      person1: p1block,
      person2: p2block,
      interactions: inter
    };

    if (sajuExtras && typeof sajuExtras === 'object') {
      if (sajuExtras.selfJong) {
        var sj = _serializeJong(sajuExtras.selfJong);
        if (sj) payload.person1.jongPattern = sj;
      }
      if (sajuExtras.selfPower) {
        var sp = _serializePower(sajuExtras.selfPower);
        if (sp) payload.person1.dayStrength = sp;
      }
      if (sajuExtras.partnerJong) {
        var pj = _serializeJong(sajuExtras.partnerJong);
        if (pj) payload.person2.jongPattern = pj;
      }
      if (sajuExtras.partnerPower) {
        var pp = _serializePower(sajuExtras.partnerPower);
        if (pp) payload.person2.dayStrength = pp;
      }
    }

    return payload;
  }

  global.CompatLlm = {
    buildFullPrompt: buildFullPrompt,
    buildSajuUserPayload: buildSajuUserPayload,
    collectSajuCrossInteractions: collectSajuCrossInteractions,
    mountCard: mountCard,
    /** 사주 궁합 결과 하단 */
    mountSaju: function (host, p1, p2, n1, n2, type, nameSelf, namePartner, partnerMeta, sajuExtras) {
      if (!host) return;
      mountCard(host, {
        idPrefix: 'cdLlmSaju',
        title: compatLlmText('sajuTitle'),
        getPrompt: function () {
          var payload = buildSajuUserPayload(p1, p2, n1, n2, type, nameSelf, namePartner, partnerMeta, sajuExtras);
          return buildFullPrompt('saju', JSON.stringify(payload, null, 2));
        }
      });
    },
    /** 서양: 시나스트리 직접입력 결과 하단 — payload는 호출부에서 구성 */
    mountWesternFromPayload: function (host, payloadObj) {
      if (!host) return;
      mountCard(host, {
        idPrefix: 'cdLlmWest',
        title: compatLlmText('westernTitle'),
        getPrompt: function () {
          return buildFullPrompt('western', JSON.stringify(payloadObj, null, 2));
        }
      });
    },
    /** 자미: zw 궁합 계산 성공 후 */
    mountZiweiFromPayload: function (host, payloadObj) {
      if (!host) return;
      mountCard(host, {
        idPrefix: 'cdLlmZw',
        title: compatLlmText('ziweiTitle'),
        getPrompt: function () {
          return buildFullPrompt('ziwei', JSON.stringify(payloadObj, null, 2));
        }
      });
    },
    /** 베다: calcCompatibility 직후 */
    mountVedicFromPayload: function (host, payloadObj) {
      if (!host) return;
      mountCard(host, {
        idPrefix: 'cdLlmVed',
        title: compatLlmText('vedicTitle'),
        getPrompt: function () {
          return buildFullPrompt('vedic', JSON.stringify(payloadObj, null, 2));
        }
      });
    },
    /** 숙요: 카르마 인연 분석( sy3 ) 결과 직후 — 메인 궁합과 동일한 ChatGPT SYSTEM/USER 프롬프트 형식 */
    mountSukuyoFromPayload: function (host, payloadObj) {
      if (!host) return;
      mountCard(host, {
        idPrefix: 'cdLlmSukuyo',
        title: compatLlmText('sukuyoTitle'),
        getPrompt: function () {
          return buildFullPrompt('sukuyo', JSON.stringify(payloadObj, null, 2));
        }
      });
    }
  };

  /** 여러 궁합 UI가 동시에 호출해도 한 번만 폴링·주입하고 콜백을 모두 실행 */
  var __cdLlmWaiters = [];
  var __cdLlmRunner = false;
  function __cdLlmFlush() {
    __cdLlmRunner = false;
    var q = __cdLlmWaiters.slice();
    __cdLlmWaiters.length = 0;
    q.forEach(function (fn) {
      try {
        fn();
      } catch (e) {
        console.warn('[CompatLlm]', e);
      }
    });
  }
  global.cdEnsureCompatLlmReady = function (done) {
    if (typeof done !== 'function') return;
    if (global.CompatLlm) {
      try {
        done();
      } catch (e) {
        console.warn('[CompatLlm]', e);
      }
      return;
    }
    __cdLlmWaiters.push(done);
    if (__cdLlmRunner) return;
    __cdLlmRunner = true;
    var n = 0;
    var injected = false;
    function tick() {
      if (global.CompatLlm) {
        __cdLlmFlush();
        return;
      }
      n += 1;
      if (n <= 220) {
        setTimeout(tick, 35);
        return;
      }
      if (!injected) {
        injected = true;
        if (!document.querySelector('script[src*="compat-llm-prompts"]')) {
          var nu = document.createElement('script');
          nu.src = 'js/compat-llm-prompts.js?v=20260321-syn-west-v2';
          nu.async = true;
          nu.setAttribute('data-cd-compat-llm', '1');
          nu.onload = function () {
            setTimeout(tick, 0);
          };
          nu.onerror = function () {
            console.warn('[CompatLlm] script load failed');
            var el = document.getElementById('compatLlmHost');
            if (el && !el.querySelector('.cd-compat-llm')) {
              el.innerHTML =
                '<div style="color:#fda4af;font-size:0.85rem;padding:10px;border-radius:10px;border:1px solid rgba(251,113,133,0.35);">AI 프롬프트 모듈을 불러오지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.</div>';
            }
            __cdLlmFlush();
          };
          document.head.appendChild(nu);
          return;
        }
      }
      if (n <= 420) {
        setTimeout(tick, 40);
        return;
      }
      __cdLlmFlush();
    }
    setTimeout(tick, 0);
  };
})(typeof window !== 'undefined' ? window : this);
