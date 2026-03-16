/**
 * fortune-engine.js
 * 운세 페이지 콘텐츠 생성 엔진
 * - 날짜 + 대상 기반 결정론적 운세 생성 (새로고침해도 동일)
 * - 띠(animal) / 별자리(zodiac) 지원
 * - today / tomorrow / weekly / monthly 기간 지원
 * - 구조화 데이터(Article + FAQ + BreadcrumbList) 자동 삽입
 */
(function(global) {
  'use strict';

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

  var PERIOD_KO = { today:'오늘', tomorrow:'내일', weekly:'이번 주', monthly:'이달' };
  var PERIOD_NOUN = { today:'일운', tomorrow:'내일 운세', weekly:'주간 운세', monthly:'월간 운세' };

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
  function pickArr(arr, seed) {
    return arr[seed % arr.length];
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
    var baseSeed = strHash(dateStr + '-' + cfg.id + '-' + cfg.period);

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
      totalText:  pick(TOTAL_TEXTS, total, 10),
      loveText:   pick(LOVE_TEXTS, love, 20),
      wealthText: pick(WEALTH_TEXTS, wealth, 30),
      healthText: pick(HEALTH_TEXTS, health, 40),
      luckyColor: LUCKY_COLORS[colorIdx],
      luckyNum:   LUCKY_NUMS[numIdx],
      advice:     ADVICE_TEXTS[adviceIdx]
    };
  }

  /* ── JSON-LD 구조화 데이터 ── */
  function buildJsonLd(cfg, info, fortune, dateLabel) {
    var koName = info.ko;
    var period = cfg.period;
    var title  = PERIOD_KO[period] + '의 ' + koName + (cfg.type === 'animal' ? '띠' : '') + ' 운세';
    var url    = 'https://code-destiny.com/fortune/' + period + '/' + cfg.id + '.html';
    var now    = new Date().toISOString();

    var article = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Article',
          headline: title,
          description: koName + (cfg.type === 'animal' ? '띠' : '') + ' ' + PERIOD_KO[period] + ' 운세 — 총운, 연애운, 재물운, 건강운, 행운 숫자 · 색 제공.',
          datePublished: now,
          dateModified: now,
          author: { '@type': 'Organization', name: '연이의 꿀꿀 만세력', url: 'https://code-destiny.com' },
          publisher: { '@type': 'Organization', name: '연이의 꿀꿀 만세력', logo: { '@type': 'ImageObject', url: 'https://code-destiny.com/icons/icon-512x512.png' } },
          mainEntityOfPage: { '@type': 'WebPage', '@id': url },
          image: 'https://code-destiny.com/icons/icon-512x512.png'
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: '홈', item: 'https://code-destiny.com/' },
            { '@type': 'ListItem', position: 2, name: '운세', item: 'https://code-destiny.com/fortune/' },
            { '@type': 'ListItem', position: 3, name: PERIOD_KO[period] + ' 운세', item: 'https://code-destiny.com/fortune/' + period + '/' },
            { '@type': 'ListItem', position: 4, name: title, item: url }
          ]
        },
        {
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: koName + (cfg.type === 'animal' ? '띠는' : '자리는') + ' ' + PERIOD_KO[period] + ' 총운이 어떤가요?',
              acceptedAnswer: { '@type': 'Answer', text: fortune.totalText }
            },
            {
              '@type': 'Question',
              name: koName + (cfg.type === 'animal' ? '띠' : '') + ' ' + PERIOD_KO[period] + ' 연애운은?',
              acceptedAnswer: { '@type': 'Answer', text: fortune.loveText }
            },
            {
              '@type': 'Question',
              name: koName + (cfg.type === 'animal' ? '띠' : '') + ' ' + PERIOD_KO[period] + ' 재물운은?',
              acceptedAnswer: { '@type': 'Answer', text: fortune.wealthText }
            },
            {
              '@type': 'Question',
              name: koName + (cfg.type === 'animal' ? '띠' : '') + ' ' + PERIOD_KO[period] + ' 행운의 숫자는?',
              acceptedAnswer: { '@type': 'Answer', text: fortune.luckyNum + '이 행운의 숫자입니다.' }
            }
          ]
        }
      ]
    };
    return article;
  }

  /* ── 내부 링크 생성 ── */
  function buildLinks(cfg, info, allData) {
    var html = '';
    var PERIOD_LABEL = { today: '오늘', tomorrow: '내일', weekly: '주간', monthly: '월간' };

    // 같은 기간, 다른 대상
    html += '<div class="fe-links"><div class="fe-links-title">다른 ' + (cfg.type === 'animal' ? '띠' : '별자리') + ' 운세</div><div class="fe-link-grid">';
    var pool = cfg.type === 'animal' ? ANIMALS : ZODIACS;
    Object.keys(pool).forEach(function(k) {
      if (k === cfg.id) return;
      var i = pool[k];
      html += '<a class="fe-link-card" href="/fortune/' + cfg.period + '/' + k + '.html"><span>' + i.emoji + '</span>' + i.ko + (cfg.type==='animal'?'띠':'') + '</a>';
    });
    html += '</div></div>';

    // 같은 대상, 다른 기간
    html += '<div class="fe-links"><div class="fe-links-title">기간별 운세</div><div class="fe-link-grid">';
    ['today','tomorrow','weekly','monthly'].forEach(function(p) {
      if (p === cfg.period) return;
      html += '<a class="fe-link-card" href="/fortune/' + p + '/' + cfg.id + '.html"><span>' + {today:'📅',tomorrow:'📆',weekly:'🗓️',monthly:'📜'}[p] + '</span>' + PERIOD_LABEL[p] + ' 운세</a>';
    });
    html += '<a class="fe-link-card" href="https://code-destiny.com/#saju"><span>🎴</span>사주 분석</a>';
    html += '<a class="fe-link-card" href="https://code-destiny.com/#compat"><span>💞</span>궁합 보기</a>';
    html += '</div></div>';

    return html;
  }

  /* ── HTML 렌더 ── */
  function render(cfg) {
    var container = document.getElementById('fortuneApp');
    if (!container) return;

    try {
      var info = (cfg.type === 'animal' ? ANIMALS : ZODIACS)[cfg.id];
      if (!info) throw new Error('Unknown subject: ' + cfg.id);

      var period  = cfg.period;
      var fortune = genFortune(cfg);
      var dateLabel = getDateLabel(period);
      var subjectLabel = info.ko + (cfg.type === 'animal' ? '띠' : '');
      var pageTitle = PERIOD_KO[period] + '의 ' + subjectLabel + ' 운세';

      // JSON-LD
      var ld = document.getElementById('jsonLd');
      if (ld) ld.textContent = JSON.stringify(buildJsonLd(cfg, info, fortune, dateLabel));

      // OG tags (동적 업데이트)
      document.title = pageTitle + ' | 연이의 꿀꿀 만세력';
      var metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', subjectLabel + ' ' + PERIOD_KO[period] + ' 운세 무료 확인. 총운 ' + fortune.total + '점, 연애운, 재물운, 건강운, 행운 숫자 ' + fortune.luckyNum + ' 제공.');

      function pct(s) { return (s / 10 * 100).toFixed(0) + '%'; }
      function stars(s) { var st = ''; for (var i=0;i<5;i++) st += s/10*5 > i ? '⭐' : '☆'; return st; }

      var html = '';

      // 브레드크럼
      html += '<nav class="fe-breadcrumb" aria-label="breadcrumb">';
      html += '<a href="/">홈</a><span class="fe-breadcrumb-sep">›</span>';
      html += '<a href="/fortune/">운세</a><span class="fe-breadcrumb-sep">›</span>';
      html += '<a href="/fortune/' + period + '/' + Object.keys(cfg.type==='animal'?ANIMALS:ZODIACS)[0] + '.html">' + PERIOD_KO[period] + ' 운세</a>';
      html += '<span class="fe-breadcrumb-sep">›</span>';
      html += '<span>' + subjectLabel + '</span>';
      html += '</nav>';

      // 영웅 헤더
      html += '<div class="fe-hero">';
      html += '<span class="fe-hero-icon" role="img" aria-label="' + subjectLabel + '">' + info.emoji + '</span>';
      html += '<h1 class="fe-hero-title">' + pageTitle + '</h1>';
      html += '<p class="fe-hero-subtitle">' + info.trait + '</p>';
      if (cfg.type === 'animal') html += '<p class="fe-hero-subtitle" style="margin-top:4px;font-size:.75rem;">출생년도: ' + info.born + '</p>';
      else html += '<p class="fe-hero-subtitle" style="margin-top:4px;font-size:.75rem;">생일: ' + info.period + '</p>';
      html += '<div class="fe-hero-date">' + dateLabel + '</div>';
      html += '</div>';

      // 운세 점수
      html += '<div class="fe-scores">';
      html += '<div class="fe-score-row"><div class="fe-score-label"><span class="fe-score-name">⭐ 총운</span><span class="fe-score-val">' + fortune.total + '/10</span></div><div class="fe-score-bar"><div class="fe-score-fill" style="width:' + pct(fortune.total) + '"></div></div></div>';
      html += '<div class="fe-score-row"><div class="fe-score-label"><span class="fe-score-name">💕 연애운</span><span class="fe-score-val">' + fortune.love + '/10</span></div><div class="fe-score-bar"><div class="fe-score-fill love" style="width:' + pct(fortune.love) + '"></div></div></div>';
      html += '<div class="fe-score-row"><div class="fe-score-label"><span class="fe-score-name">💰 재물운</span><span class="fe-score-val">' + fortune.wealth + '/10</span></div><div class="fe-score-bar"><div class="fe-score-fill wealth" style="width:' + pct(fortune.wealth) + '"></div></div></div>';
      html += '<div class="fe-score-row"><div class="fe-score-label"><span class="fe-score-name">🌿 건강운</span><span class="fe-score-val">' + fortune.health + '/10</span></div><div class="fe-score-bar"><div class="fe-score-fill health" style="width:' + pct(fortune.health) + '"></div></div></div>';
      html += '</div>';

      // 총운 카드
      html += '<div class="fe-card"><div class="fe-card-title">⭐ ' + PERIOD_KO[period] + '의 총운</div><p class="fe-card-body">' + fortune.totalText + '</p></div>';
      html += '<div class="fe-card"><div class="fe-card-title">💕 연애운 ' + stars(fortune.love) + '</div><p class="fe-card-body">' + fortune.loveText + '</p></div>';
      html += '<div class="fe-card"><div class="fe-card-title">💰 재물운 ' + stars(fortune.wealth) + '</div><p class="fe-card-body">' + fortune.wealthText + '</p></div>';
      html += '<div class="fe-card"><div class="fe-card-title">🌿 건강운 ' + stars(fortune.health) + '</div><p class="fe-card-body">' + fortune.healthText + '</p></div>';

      // 행운 아이템
      html += '<div class="fe-lucky">';
      html += '<div class="fe-lucky-item"><div class="fe-lucky-label">🎨 행운의 색</div><div class="fe-lucky-val">' + fortune.luckyColor + '</div></div>';
      html += '<div class="fe-lucky-item"><div class="fe-lucky-label">🔢 행운의 숫자</div><div class="fe-lucky-val">' + fortune.luckyNum + '</div></div>';
      html += '</div>';

      // 조언
      html += '<div class="fe-advice"><div class="fe-advice-title">✨ ' + PERIOD_KO[period] + '의 조언</div><p class="fe-advice-body">&ldquo;' + fortune.advice + '&rdquo;</p></div>';

      // FAQ
      var faqs = [
        { q: subjectLabel + '의 ' + PERIOD_KO[period] + ' 총운은 어떤가요?', a: fortune.totalText },
        { q: subjectLabel + '의 ' + PERIOD_KO[period] + ' 연애운은 어떤가요?', a: fortune.loveText },
        { q: subjectLabel + '의 ' + PERIOD_KO[period] + ' 재물운은 어떤가요?', a: fortune.wealthText },
        { q: subjectLabel + '의 ' + PERIOD_KO[period] + ' 건강운은 어떤가요?', a: fortune.healthText },
        { q: subjectLabel + '의 행운의 숫자와 색은 무엇인가요?', a: '행운의 숫자는 ' + fortune.luckyNum + '이고, 행운의 색은 ' + fortune.luckyColor + '입니다.' }
      ];
      html += '<section class="fe-faq"><h2 class="fe-faq-title">❓ 자주 묻는 질문</h2>';
      faqs.forEach(function(f, i) {
        html += '<div class="fe-faq-item"><button class="fe-faq-q" aria-expanded="false" onclick="var a=this.nextElementSibling;var open=this.getAttribute(\'aria-expanded\')===\'true\';this.setAttribute(\'aria-expanded\',open?\'false\':\'true\');"><span>' + f.q + '</span><span class="fe-faq-arrow">▼</span></button><div class="fe-faq-a">' + f.a + '</div></div>';
      });
      html += '</section>';

      // 내부 링크
      html += buildLinks(cfg, info, null);

      container.innerHTML = html;
    } catch (e) {
      container.innerHTML = '<div id="feError"><p>운세 정보를 불러오는 데 문제가 생겼습니다.</p><p style="margin-top:12px;"><a href="/fortune/">운세 홈으로 돌아가기</a></p></div>';
    }
  }

  /* ── 공개 API ── */
  global.FortuneEngine = {
    initFromConfig: function(cfg) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { render(cfg); });
      } else {
        render(cfg);
      }
    }
  };

})(window);
