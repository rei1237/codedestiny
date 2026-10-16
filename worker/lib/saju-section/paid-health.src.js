// 명리 헬스 리포트(rpt_healthReportCard) 유료 렌더러 정본. 브라우저로 내려가지 않는다.
// js/entertain-engine.js IIFE 안의 건강 블록(HEALTH_* 표부터 w.renderHealthReport 오버라이드까지)을 그대로 옮겼다.
// 바뀐 곳은 현재 시각 세 줄뿐이다 — 원본의 new Date() 대신 _healthToday()(report.js 가 넘긴 요청 시각 ctx.now 의
// 한국 날짜·시각)를 읽는다. 오버라이드 앞의 `var _origHealth = w.renderHealthReport;` 는 쓰는 곳이 없어 옮기지 않았다.
// scripts/extract-saju-section-runtime.mjs 가 entertain-engine 의 공용 헬퍼(_entertainText·EL_NAME 등)와 함께
// (function (w) { ... })(window) 로 감싸 runtime.generated.mjs 로 묶는다.
// 장(<details>) 펼침 높이 맞춤은 브라우저(js/core/saju/section-client.js)가 배달 뒤 다시 건다.
  function _healthToday() {
    var k = new Date((ctx.now instanceof Date ? ctx.now.getTime() : Date.now()) + 9 * 60 * 60 * 1000);
    return new Date(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate(), k.getUTCHours(), k.getUTCMinutes());
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
    var month = _healthToday().getMonth() + 1;
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
      var now = _healthToday();
      var todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
      var refUtc = Date.UTC(2000, 0, 1);
      var days = Math.floor((todayUtc - refUtc) / 86400000);
      var stemIndex = ((6 + days) % 10 + 10) % 10;
      return ['wood', 'wood', 'fire', 'fire', 'earth', 'earth', 'metal', 'metal', 'water', 'water'][stemIndex] || '';
    } catch (_) {
      return '';
    }
  }

  // 일간 오행은 넘겨받은 원국(p/natal)에서 먼저 읽는다. 예전에는 w.G_BAZI 전역만 봤는데,
  // 그 전역은 이 페이지에서 사주를 직접 계산했을 때만 채워진다 — 프로필 카드로 결과를 여는
  // 경로에서는 비어 있어서, resolveHealthReportInputs 가 p·natal 을 되살려도 이 값만 null 이
  // 되고 리포트가 축소본(5개 섹션 누락 + 다른 문구)으로 떨어졌다.
  // getHealthDayStem 이 후보 목록 맨 뒤에서 w.G_BAZI.getDayGan() 도 그대로 보므로 기존 경로는 유지된다.
  function getTodayHealthElement(p, natal) {
    try {
      var stem = getHealthDayStem(p, natal);
      var view = stem ? DAY_MASTER_HEALTH_VIEW[stem] : null;
      if (view && view.element) return view.element;
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

    var second = '오늘의 억부는 ' + getHealthElementWithParticle(targetEl, 'object') + ' 먼저 챙기고, ' + EL_NAME[avoidEl] + '의 자극은 저녁부터 낮추라고 가리킵니다.';
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
    var johuRoutinePreview = profile.routine.slice(0, 3).join(', ');
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
      + renderHealthMiniList([profile.moisture.carePoint, '오늘은 ' + supportText + getHealthElementParticle(support[support.length - 1] || targetEl, 'object') + ' 먼저 보완하고, ' + cautionText + ' 쪽 자극은 오후부터 줄이는 편이 좋습니다.'], 2)
      + renderHealthChipList(profile.moisture.routine, 4)
      + '</article>'
      + '<article class="cd-health-knowledge-card" data-health-el="' + escapeHealthHtml(targetEl || support[0] || 'earth') + '">'
      + '<div class="cd-health-card-top">'
      + '<span class="cd-health-card-icon">🧭</span>'
      + '<div><small>조후 보완 순서</small><b>' + escapeHealthHtml(profile.label) + '</b></div>'
      + '</div>'
      + '<p class="cd-health-card-lead">' + escapeHealthHtml('조후상 먼저 챙길 자리는 ' + supportText + '입니다. 여기에 억부에서 잡힌 보완 오행 ' + getHealthElementWithParticle(targetEl, 'object') + ' 함께 보면, 오늘은 무리한 관리보다 몸을 편하게 만드는 순서가 더 중요합니다.') + '</p>'
      + renderHealthMiniList(['줄이면 좋은 자극은 ' + cautionText + '의 과열과 과한 반복입니다.', '오늘은 ' + johuRoutinePreview + getHealthTextParticle(johuRoutinePreview, 'object') + ' 먼저 두는 편이 몸에 편안합니다.'], 2)
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
        var johuSupportLastEl = profile.supportElements.length ? profile.supportElements[profile.supportElements.length - 1] : ((axes && axes.targetEl) || 'earth');
        var johuLine = profile.supportElements.indexOf(el) !== -1
          ? '조후도 ' + EL_NAME[el] + ' 보완을 함께 잡고 있으니, 오늘은 이 오행을 가장 부드럽게 챙기면 좋습니다.'
          : '조후상 보완 오행인 ' + (profile.supportElements.map(function (item) { return EL_NAME[item]; }).join(', ') || EL_NAME[axes && axes.targetEl] || '토(土)') + getHealthElementParticle(johuSupportLastEl, 'object') + ' 함께 두면 ' + EL_NAME[el] + '의 부담이 줄어듭니다.';
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
        body: '계절이 바뀔 때는 원국에서 강한 ' + strongName + getHealthElementParticle(strongestEl, 'subject') + ' 먼저 반응합니다. 늘 해오던 방식만 고집하기보다 부족한 오행을 조금씩 채워야 몸이 덜 흔들립니다.',
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

  function getHealthTextParticle(text, kind) {
    var code = String(text || '').charCodeAt(String(text || '').length - 1) - 0xAC00;
    var hasBatchim = code >= 0 && code <= 11171 && code % 28 !== 0;
    if (kind === 'subject') return hasBatchim ? '이' : '가';
    if (kind === 'object') return hasBatchim ? '을' : '를';
    return hasBatchim ? '은' : '는';
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
        body: supportName + getHealthElementParticle(supportEl, 'topic') + ' ' + getHealthElementWithParticle(targetEl, 'object') + ' 생합니다. ' + getHealthElementWithParticle(targetEl, 'subject') + ' 약하거나 눌릴 때는 먼저 ' + supportName + '의 바탕을 세워야 회복이 부드럽게 이어집니다.',
        details: [supportRest, ((supportInfo.recommendedTea || [])[0] || '따뜻한 물') + '를 천천히 마시기', targetName + ' 루틴은 한 번에 늘리지 말고 작게 시작하기'],
        tags: [supportName + ' 생조', targetName + ' 보완', targetInfo.symbolicOrganRhythm]
      },
      {
        label: targetName + ' 본기 보완',
        body: targetInfo.weakMessage || (targetName + getHealthElementParticle(targetEl, 'subject') + ' 부족하면 생활 리듬이 쉽게 흔들립니다. 오늘은 몸이 바로 받아들이는 행동 하나가 가장 좋습니다.'),
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
      // CDHealthReadable(더잠실체)의 @font-face 는 제거했다 — 그 라이선스가 수정·포맷
      // 변환을 금지해 846KB 원본 TTF 를 그대로 내려보내는 것 말고는 선택지가 없었다.
      // 참조는 아래에서 CodeDestinySerifKR 로 바뀌며, 그 폰트는 fonts-serif.css 가
      // unicode-range 청크로 이미 선언해 둔 것이라 여기서 다시 선언할 필요가 없다.
      style.textContent = ''
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
      + 'font-family:"CodeDestinySerifKR",var(--font-body,"Pretendard","Noto Sans KR","Apple SD Gothic Neo",system-ui,sans-serif);'
      + '-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}'
      + '.cd-health-wellness-v20260607:before,.cd-health-wellness-v20260607:after{content:none}'
      + '.cd-health-wellness-v20260607 *{box-sizing:border-box;min-width:0}'

      /* ── 타이포 ───────────────────────────────────────────────────────── */
      + '.cd-health-wellness-v20260607 h3,.cd-health-wellness-v20260607 h4{'
      + 'margin:0;font-family:"CodeDestinySerifKR","Nanum Myeongjo","Noto Serif KR",serif;'
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
      + '.cd-health-chapter__title{display:block;font-family:"CodeDestinySerifKR","Nanum Myeongjo","Noto Serif KR",serif;'
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
    var rawTodayEl = getTodayHealthElement(p, natal);
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
    var nowForHealth = _healthToday();
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
