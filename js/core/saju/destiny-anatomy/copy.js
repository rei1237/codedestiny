/* 운명 구조도(DESTINY ANATOMY) 문구 — 결정론 문장. engine.js 가 만든 모델의 키를 사람 문장으로 바꾼다.
 *
 * 🔴 문장은 엔진 결과(축 순위·조합·HD 권위·베다 특성)에서만 고른다. 데이터가 없으면 그 문장을 만들지 않는다(placeholder 금지).
 * 🔴 의료·정신건강 판정 표현과 확정 단정은 쓰지 않는다 — scripts/verify-destiny-anatomy.mjs 가 금지어를 막는다.
 * 저작 로케일: ko·en·ja·zh-CN·zh-TW. 나머지 셸 로케일(vi·hi·es·fr·de·nl·ms)은 en 으로 떨어진다(reading-rich-intl 패턴).
 * HD 이름·요약은 hd-copy.generated.js(HD 화면 정본에서 생성)를 쓴다. 여기서 HD 해석을 새로 쓰지 않는다. */
(function (root) {
  'use strict';

  var AXES = ['selfDrive', 'expression', 'reality', 'structure', 'reflection'];
  var LOCALES = ['ko', 'en', 'ja', 'zh-CN', 'zh-TW'];

  var COPY = {};

  COPY.ko = {
    ui: {
      title: '운명 구조도', subtitle: 'DESTINY ANATOMY', free: 'FREE',
      intro: '방금 본 사주로 내 머릿속 사고 엔진부터 에너지 구조까지 한 장의 설계도로 펼쳐 봤어요.',
      explore: '내 머릿속 자세히 보기',
      brainTitle: '사주 기반 Brain Map',
      brainHeadline: '당신 머릿속의 가장 큰 비중은 {name}',
      brainHeadlineBalanced: '다섯 엔진이 고르게 돌아가는 머릿속',
      moreThoughts: '나머지 생각 보기', lessThoughts: '접기',
      circuitTitle: '영냥이가 읽은 당신의 사고회로',
      sequence: '{a} → {b} → {c} 순으로 머리를 쓰는 경향이 있어요.',
      enginesTitle: '다섯 개의 사고 엔진',
      question: '대표 질문', whenStrong: '강할 때', whenOver: '과할 때', sourceGods: '근거 십성',
      level: {dominant: '가장 강함', strong: '강함', moderate: '보통', light: '옅음'},
      elementsTitle: '내 에너지의 재료', elementsSub: '정신의 재료 — 오행은 십성과 섞지 않고 따로 봐요.',
      elementDominant: '가장 많이 쓰는 재료는 {name} 재료 — {words}.',
      elementMissing: '{name} 재료는 원국에 드러나지 않아요. 부족하다기보다 다른 재료로 같은 일을 해내는 편이에요.',
      hdBridge: '사주가 생각과 욕망의 구조를 보여준다면, 휴먼 디자인은 에너지가 실제로 어떻게 움직이는지를 다른 관점에서 보여줘요.',
      hdBridgeAction: '내 에너지 구조 보기',
      energyTitle: '나는 어떻게 에너지를 쓰는 사람인가?',
      strategy: '전략', profile: '프로필', definition: '정의',
      decisionTitle: '당신의 결정 버튼',
      bodyTitle: '에너지 바디',
      centerDefined: '정의됨 — 안정적으로 접근하는 에너지',
      centerOpen: '열림 — 환경과 사람의 영향을 더 경험하는 영역',
      toggle: {hd: '휴먼 디자인', chakra: '차크라', both: '함께 보기'},
      chakraNote: '차크라는 휴먼 디자인 센터와 다른 체계예요. 건강 상태가 아니라 상징적인 주제로만 읽어요.',
      chakraLevel: {bright: '밝게', steady: '고르게', quiet: '조용히'},
      vedicTitle: '베다로 본 감정의 결',
      crossTitle: '서로 다른 운명 체계가 동시에 말하는 당신',
      badge: {saju: '사주', hd: '휴먼 디자인', fusion: '융합'},
      insightTitle: {thinking: '생각의 기본 방식', decision: '결정 방식', people: '사람 · 일 · 돈을 대하는 방식'},
      summaryTitle: '한눈에 보는 나',
      coreEngine: '핵심 엔진',
      row: {thinking: '생각', decision: '결정', energy: '에너지', emotion: '감정', work: '일', money: '돈', relationship: '관계'},
      shareTitle: '내 운명 구조도 공유하기', shareSub: '나라는 사람의 운명 구조도',
      shareAction: '공유하기', saveAction: '이미지 저장', copyAction: '링크 복사', copied: '링크를 복사했어요',
      ctaTitle: '이 구조, 더 깊이 보고 싶다면',
      nyangLabel: '영냥이 한마디',
      timeUnknown: '정확한 출생시간이 있다면 에너지 구조까지 볼 수 있어요.',
      loginNeeded: '로그인하면 휴먼 디자인 에너지 구조와 베다 감정 레이어까지 이어서 볼 수 있어요.',
      login: '로그인하고 이어 보기',
      layerLoading: '에너지 구조를 불러오는 중…',
      layerFailed: '에너지 구조를 지금은 불러오지 못했어요. 사주 구조는 그대로 볼 수 있어요.',
      error: '운명 구조도를 불러오지 못했어요', retry: '다시 불러오기',
      disclaimer: '성향을 이해하기 위한 해석이에요. 의학적·심리적 판단을 대신하지 않고, 정해진 미래를 말하지 않아요.'
    },
    hero: {
      A: '내 머릿속은 무엇으로 가득 차 있을까?',
      B: '사주로 보는 내 뇌구조',
      C: '나는 왜 이런 생각을 반복할까?',
      D: '내 사주를 정신에서 몸까지 펼쳐봤습니다'
    },
    axes: {
      selfDrive: {name: '주체성', short: '주체', god: '비겁', question: '나는 뭘 원하는가?', thought: '내가 결정하고 싶어',
        keywords: ['독립', '자기주도', '경쟁', '자기 방식', '경계'],
        strong: ['자신의 방식대로 결정하고 싶어해요', '지나치게 통제받는 상황을 답답해해요', '경쟁 상황에서 오히려 에너지가 생길 수 있어요'],
        over: ['고집이 세질 수 있어요', '경쟁이 과열되기 쉬워요', '내 몫에 민감해질 수 있어요', '사람과 자원이 흩어질 수 있어요'],
        mind: '스스로 방향을 정하고', pull: '스스로 방향을 정하려는 힘이 강해요.'},
      expression: {name: '표현과 자극', short: '표현', god: '식상', question: '재밌는 건 없나?', thought: '재밌는 거 없나?',
        keywords: ['표현', '말', '창작', '콘텐츠', '새로운 자극'],
        strong: ['말하고 표현하고 만들어낼 때 에너지가 생겨요', '새로운 경험과 자극에 빠르게 반응해요'],
        over: ['주의가 여러 곳으로 흩어질 수 있어요', '권태를 빨리 느낄 수 있어요', '루틴을 답답해할 수 있어요', '당장의 재미를 먼저 고르기 쉬워요'],
        mind: '재미와 표현에서 힘을 얻고', pull: '새로운 자극과 표현에서 에너지가 붙어요.'},
      reality: {name: '현실과 결과', short: '현실', god: '재성', question: '그래서 이게 뭐가 남는데?', thought: '이게 돈이 될까?',
        keywords: ['성과', '효율', '관리', '결과', '목표'],
        strong: ['이론보다 현실적인 결과를 중요하게 생각해요', '시간과 돈을 들였을 때 실제로 무엇을 얻는지 확인하려 해요'],
        over: ['돈·성과·효율 자체가 압박이 될 수 있어요', '결과가 안 보이면 쉽게 지칠 수 있어요'],
        mind: '생각은 현실적이고', pull: '머리는 빨리 현실적인 결과를 확인하고 싶어 해요.'},
      structure: {name: '책임과 기준', short: '책임', god: '관성', question: '이걸 제대로 하고 있는가?', thought: '제대로 해야 하는데',
        keywords: ['책임', '규칙', '평가', '기준', '성취'],
        strong: ['역할과 책임을 중요하게 생각해요', '사회적인 기준과 해야 할 일을 의식하기 쉬워요'],
        over: ['스스로를 지나치게 검열할 수 있어요', '책임을 혼자 떠안기 쉬워요', '평가에 대한 압박을 크게 느낄 수 있어요'],
        mind: '기준을 세우고 지키며', pull: '제대로 해내야 한다는 기준이 먼저 켜져요.'},
      reflection: {name: '생각과 흡수', short: '사고', god: '인성', question: '혹시 내가 놓친 게 있을까?', thought: '혹시 내가 놓친 게 있나?',
        keywords: ['공부', '정보', '직관', '검증', '의미'],
        strong: ['생각하고 이해해야 움직일 수 있어요', '하나의 현상에서도 의미를 찾으려 해요'],
        over: ['걱정이 길어질 수 있어요', '분석이 지나쳐질 수 있어요', '같은 생각을 반복하기 쉬워요', '행동이 늦어질 수 있어요'],
        mind: '깊이 생각한 뒤 움직이고', pull: '확신이 생길 때까지 정보를 모으고 검토하려 해요.'}
    },
    combo: {
      'selfDrive+expression': {title: '내 방식대로 표현하는 사람', text: '자유롭게 결정하고 자유롭게 표현할 때 힘이 나는 구조예요.'},
      'selfDrive+reality': {title: '내 몫은 내가 만드는 사람', text: '독립성과 현실 감각이 연결되는 구조예요. 남에게 기대기보다 직접 결과를 손에 쥐고 싶어 해요.'},
      'selfDrive+structure': {title: '내 기준으로 책임지는 사람', text: '스스로 정한 방향과 지켜야 할 기준이 함께 움직여요. 맡은 일은 내 방식으로 끝까지 해내려는 편이에요.'},
      'selfDrive+reflection': {title: '혼자 깊이 파고드는 사람', text: '내가 납득해야 움직이는 구조예요. 남의 결론보다 스스로 이해한 답을 믿는 편이에요.'},
      'expression+reality': {title: '만들어서 가치로 바꾸는 사람', text: '아이디어·콘텐츠·기술 같은 표현을 현실적인 가치로 바꾸는 힘이 있어요.'},
      'expression+structure': {title: '틀 안에서 새로움을 만드는 사람', text: '자유롭게 만들고 싶은 마음과 제대로 해야 한다는 기준이 함께 있어요. 규칙을 알고 나서 비트는 데 강해요.'},
      'expression+reflection': {title: '생각을 표현으로 꺼내는 사람', text: '머릿속에서 오래 굴린 생각을 말과 글, 작업물로 꺼낼 때 가장 살아나는 구조예요.'},
      'reality+structure': {title: '결과로 증명하는 사람', text: '성과와 책임이 같은 방향을 봐요. 맡은 일을 숫자와 결과로 보여주려는 편이에요.'},
      'reality+reflection': {title: '계산하는 연구자', text: '정보를 충분히 모은 뒤 실제 이득으로 연결하려는 구조예요.'},
      'structure+reflection': {title: '틀리지 않기 위해 공부하는 사람', text: '준비·검토·책임을 중요하게 생각할 가능성이 높아요. 확인이 끝나야 마음이 놓이는 편이에요.'},
      balanced: {title: '다섯 엔진을 고르게 쓰는 사람', text: '한 엔진이 독주하기보다 상황에 따라 다른 엔진을 꺼내 쓰는 구조예요. 그만큼 한 가지 색으로 설명되지 않아요.'},
      'solo:selfDrive': {title: '내 방향이 먼저인 사람', text: '무엇을 하든 내가 원하는지가 먼저 켜지는 구조예요.'},
      'solo:expression': {title: '재미가 연료인 사람', text: '새로운 자극과 표현이 행동의 연료가 되는 구조예요. 재미가 사라지면 엔진도 같이 식기 쉬워요.'},
      'solo:reality': {title: '결과를 계산하는 사람', text: '시작 전에 실제로 무엇이 남는지부터 계산하는 구조예요.'},
      'solo:structure': {title: '기준을 지키는 사람', text: '해야 할 일과 지켜야 할 기준이 생각의 중심에 있는 구조예요.'},
      'solo:reflection': {title: '생각해야 움직이는 사람', text: '생각이 생각을 낳는 구조예요. 확신이 생길 때까지 정보를 모으고 검토하려 해요.'}
    },
    tone: {
      strained: {
        expression: '다만 원국 전체의 힘은 가벼운 편이라, 표현을 쏟아낸 뒤 에너지가 빨리 바닥날 수 있어요. 쉬는 리듬을 함께 챙기면 좋아요.',
        reality: '다만 원국 전체의 힘은 가벼운 편이라, 결과를 쫓을수록 부담이 커지기 쉬워요. 한 번에 다 쥐기보다 감당할 만큼씩 나누는 편이 맞을 수 있어요.',
        structure: '다만 원국 전체의 힘은 가벼운 편이라, 책임이 쌓이면 압박으로 느껴지기 쉬워요. 혼자 다 떠안지 않는 연습이 도움이 될 수 있어요.'
      },
      surplus: {
        selfDrive: '원국 전체의 힘도 강한 편이라, 이 엔진이 너무 세지면 고집으로 비칠 수 있어요. 다른 사람의 방식을 한 번 들어보는 여유가 균형을 잡아줘요.',
        reflection: '원국 전체의 힘도 강한 편이라, 생각이 행동보다 앞서 달리기 쉬워요. 충분히 안다고 느끼면 작게라도 먼저 움직여 보는 편이 좋아요.'
      }
    },
    elements: {
      wood: {name: '목', words: '확장 · 성장 · 시작'},
      fire: {name: '화', words: '표현 · 속도 · 열정'},
      earth: {name: '토', words: '유지 · 현실화 · 중재'},
      metal: {name: '금', words: '구분 · 판단 · 정리'},
      water: {name: '수', words: '관찰 · 탐색 · 사고'}
    },
    chakra: {
      crown: {name: '크라운', theme: '의미 · 방향 · 초월'},
      thirdEye: {name: '제3의 눈', theme: '통찰 · 상상 · 관찰'},
      throat: {name: '목', theme: '표현 · 전달'},
      heart: {name: '하트', theme: '연결 · 관계 · 애착'},
      solarPlexus: {name: '태양신경총', theme: '의지 · 자기 추진 · 감정'},
      sacral: {name: '천골', theme: '욕망 · 즐거움 · 창조'},
      root: {name: '루트', theme: '안정 · 기반 · 현실 감각'}
    },
    bridge: {tension: '다만 결정 방식은 조금 다른 속도를 말해요.', common: '결정 방식도 같은 방향을 가리켜요.', complement: '결정 방식은 여기에 다른 감각을 더해 줘요.'},
    peopleBridge: {tension: '다만 에너지 타입은 다른 방식을 권해요.', common: '에너지 타입도 같은 방향을 가리켜요.', complement: '에너지 타입은 여기에 다른 리듬을 더해 줘요.'},
    authorityHow: {
      AUTHORITY_EMOTIONAL: '중요한 결정만큼은 즉시 결론을 내리기보다, 감정의 파도가 지나간 뒤에도 같은 선택을 하고 싶은지 확인하는 편이 더 잘 맞을 수 있어요.',
      AUTHORITY_SACRAL: '머리로 이유를 만들기 전에 몸에서 먼저 오는 YES / NO 반응을 살펴보는 편이 더 잘 맞을 수 있어요.',
      AUTHORITY_SPLENIC: '그 순간 스치는 조용한 직감을 놓치지 않는 편이 더 잘 맞을 수 있어요.',
      AUTHORITY_EGO: '내가 정말 원하고 약속할 수 있는 일인지 확인하는 편이 더 잘 맞을 수 있어요.',
      AUTHORITY_SELF_PROJECTED: '믿을 만한 사람에게 말로 꺼내 보며 내 목소리에서 답을 듣는 편이 더 잘 맞을 수 있어요.',
      AUTHORITY_MENTAL: '여러 사람과 환경 속에서 이야기를 나누며 생각을 정리하는 편이 더 잘 맞을 수 있어요.',
      AUTHORITY_LUNAR: '큰 결정은 한 달 정도의 시간을 두고 여러 번 느껴 보는 편이 더 잘 맞을 수 있어요.'
    },
    typeHow: {
      TYPE_GENERATOR: '먼저 반응이 오는 일에 에너지를 쓰는 편이 오래 갈 수 있어요.',
      TYPE_MANIFESTING_GENERATOR: '반응한 뒤 빠르게 움직이고, 움직이기 전에 주변에 알려 두는 편이 더 매끄러울 수 있어요.',
      TYPE_PROJECTOR: '모든 일을 직접 밀어붙이기보다 내 능력을 알아보는 환경과 사람을 고르는 편이 더 잘 맞을 수 있어요.',
      TYPE_MANIFESTOR: '먼저 시작하되, 움직이기 전에 영향을 받는 사람들에게 알리는 편이 마찰을 줄여 줄 수 있어요.',
      TYPE_REFLECTOR: '사람과 환경을 충분히 겪어 본 뒤 천천히 판단하는 편이 더 잘 맞을 수 있어요.'
    },
    peoplePull: {
      selfDrive: '사람과 일 앞에서도 내 방식과 내 자리를 먼저 지키려 해요.',
      expression: '사람과 일 앞에서 재미와 표현이 살아 있어야 오래 버틸 수 있어요.',
      reality: '사람과 일, 돈을 대할 때 실제로 남는 것이 무엇인지 먼저 봐요.',
      structure: '사람과 일 앞에서 맡은 역할과 약속을 중요하게 여겨요.',
      reflection: '사람과 일 앞에서 충분히 이해한 뒤에야 마음을 열어요.'
    },
    sajuDecision: {
      selfDrive: '결정은 남의 의견보다 내 판단을 따를 때 가장 편해요. 다만 혼자 결론을 서두르지 않도록 한 박자 쉬어 가면 좋아요.',
      expression: '결정은 마음이 움직이는 순간 빠르게 내리는 편이에요. 재미가 식은 뒤에도 같은 선택인지 한 번 더 보면 좋아요.',
      reality: '결정은 들인 것 대비 남는 것을 계산하며 내리는 편이에요. 숫자로 안 보이는 가치도 함께 저울에 올려 보면 좋아요.',
      structure: '결정은 옳고 그름, 해야 하는지를 기준으로 내리는 편이에요. 완벽한 답을 기다리다 늦어지지 않게 조심하면 좋아요.',
      reflection: '결정은 충분히 알아본 뒤에 내리는 편이에요. 정보가 80% 모였다면 움직여 보는 것도 방법이에요.'
    },
    work: {
      selfDrive: '스스로 결정권을 가질 수 있는 일에서 힘이 나요.',
      expression: '만들고 말하고 보여주는 일에서 힘이 나요.',
      reality: '성과가 숫자와 결과로 보이는 일에서 힘이 나요.',
      structure: '역할과 기준이 분명한 일에서 힘이 나요.',
      reflection: '배우고 분석하고 깊이 파고드는 일에서 힘이 나요.'
    },
    money: {
      selfDrive: '돈은 남에게 맡기기보다 직접 쥐고 관리하려는 편이에요.',
      expression: '돈은 경험과 즐거움, 만드는 일에 흘러가기 쉬워요.',
      reality: '돈의 흐름과 효율을 꼼꼼히 계산하는 편이에요.',
      structure: '돈은 계획과 원칙에 따라 안정적으로 다루려 해요.',
      reflection: '돈을 쓰기 전에 충분히 알아보고 비교하는 편이에요.'
    },
    relationship: {
      selfDrive: '관계에서도 내 영역과 존중받는 느낌이 중요해요.',
      expression: '함께 웃고 대화가 통하는 관계에서 마음이 열려요.',
      reality: '말보다 행동과 실제로 챙겨 주는 마음을 믿어요.',
      structure: '믿을 수 있고 약속을 지키는 관계를 중요하게 여겨요.',
      reflection: '깊이 이해받는다고 느낄 때 마음을 열어요.'
    },
    mindDecide: {
      AUTHORITY_EMOTIONAL: '중요한 결정에는 시간이 필요한 사람',
      AUTHORITY_SACRAL: '몸의 반응으로 결정하는 사람',
      AUTHORITY_SPLENIC: '순간의 직감으로 결정하는 사람',
      AUTHORITY_EGO: '진심으로 원하는지로 결정하는 사람',
      AUTHORITY_SELF_PROJECTED: '말하며 답을 찾는 사람',
      AUTHORITY_MENTAL: '대화 속에서 생각을 정리하는 사람',
      AUTHORITY_LUNAR: '시간을 두고 천천히 결정하는 사람'
    },
    mindAct: {
      selfDrive: '결국 자기 방식으로 움직이는 사람',
      expression: '표현하며 길을 찾는 사람',
      reality: '결과로 확인하는 사람',
      structure: '책임감으로 버티는 사람',
      reflection: '이해한 만큼 움직이는 사람'
    },
    vedic: {
      kind: {emotion: '감정 처리 방식', instinct: '본능적으로 반응하는 방식', frame: '세상을 바라보는 기본 프레임'},
      emotion: {fire: '감정이 빠르게 타오르고 빠르게 지나가는 편이에요.', earth: '감정을 천천히, 안정적으로 소화하는 편이에요.', air: '감정을 말과 생각으로 정리하며 다루는 편이에요.', water: '감정을 깊고 길게 느끼며 품는 편이에요.'},
      instinct: {
        Ketu: '익숙한 것에서 한 발 물러나 본질을 보려는 본능이 있어요.', Venus: '아름다움과 편안함을 따라 반응하는 본능이 있어요.',
        Sun: '자기 자리를 분명히 하려는 본능이 있어요.', Moon: '분위기와 사람의 마음에 먼저 반응하는 본능이 있어요.',
        Mars: '부딪쳐서 확인하려는 본능이 있어요.', Rahu: '새롭고 낯선 것에 끌리는 본능이 있어요.',
        Jupiter: '의미와 배움을 찾아 반응하는 본능이 있어요.', Saturn: '신중하게 버티며 지켜보는 본능이 있어요.',
        Mercury: '정보를 모으고 연결하며 반응하는 본능이 있어요.'
      },
      frame: {fire: '세상을 도전과 가능성의 무대로 보는 편이에요.', earth: '세상을 차근차근 쌓아 가는 현실로 보는 편이에요.', air: '세상을 연결과 아이디어의 네트워크로 보는 편이에요.', water: '세상을 감정과 관계의 흐름으로 보는 편이에요.'}
    },
    nyang: {
      selfDrive: '네 머릿속엔 운전대가 하나 있다냥. 가끔은 조수석에 앉아 보는 것도 나쁘지 않아.',
      expression: '재미가 네 연료다냥. 재미없는 일은 작게 쪼개서 놀이처럼 해 봐.',
      reality: '계산이 빠른 머리다냥. 남는 게 없어 보여도 즐거운 일 하나쯤은 남겨 둬.',
      structure: '기준이 단단한 머리다냥. 오늘은 80점이어도 충분하다고 말해 줄게.',
      reflection: '생각이 깊은 머리다냥. 다 알고 나서가 아니라, 반쯤 알 때 한 발 움직여 봐.'
    },
    cta: [
      {id: 'love', q: '이 구조가 연애에서는 어떻게 나타날까?', label: '연애 분석 보기'},
      {id: 'compat', q: '나는 어떤 사람과 만나야 편할까?', label: '궁합 보기'},
      {id: 'wealth', q: '이 구조로 돈을 벌려면?', label: '재물 · 직업 보기'},
      {id: 'luck', q: '지금 운에서 어떤 엔진이 강해지고 있을까?', label: '대운 · 세운 보기'},
      {id: 'hd', q: '휴먼 디자인 전체 차트를 보고 싶다면', label: '휴먼 디자인 상세 보기'}
    ],
    join: ' · '
  };

  COPY.en = {
    ui: {
      title: 'Destiny Anatomy', subtitle: 'DESTINY ANATOMY', free: 'FREE',
      intro: 'From the chart you just read, we mapped your thinking engines and energy structure into a single blueprint.',
      explore: 'Explore my mind',
      brainTitle: 'Saju Brain Map',
      brainHeadline: 'The biggest share of your mind: {name}',
      brainHeadlineBalanced: 'A mind where all five engines run evenly',
      moreThoughts: 'Show the other thoughts', lessThoughts: 'Hide',
      circuitTitle: 'Your thought circuit, as Yeongnyangi reads it',
      sequence: 'You tend to use your mind in this order: {a} → {b} → {c}.',
      enginesTitle: 'Five thinking engines',
      question: 'Signature question', whenStrong: 'When strong', whenOver: 'When overdone', sourceGods: 'Source Ten Gods',
      level: {dominant: 'Strongest', strong: 'Strong', moderate: 'Moderate', light: 'Light'},
      elementsTitle: 'The raw materials of your energy', elementsSub: 'Materials of the mind — the Five Elements are read separately from the Ten Gods.',
      elementDominant: 'Your most-used material is {name} — {words}.',
      elementMissing: '{name} does not appear in your chart. Rather than a lack, it means you do that work with other materials.',
      hdBridge: 'If Saju shows the structure of your thoughts and desires, Human Design shows, from another angle, how your energy actually moves.',
      hdBridgeAction: 'See my energy structure',
      energyTitle: 'How do I use my energy?',
      strategy: 'Strategy', profile: 'Profile', definition: 'Definition',
      decisionTitle: 'Your decision button',
      bodyTitle: 'Energy body',
      centerDefined: 'Defined — energy you can access steadily',
      centerOpen: 'Open — where you experience more of your surroundings and people',
      toggle: {hd: 'Human Design', chakra: 'Chakra', both: 'Both'},
      chakraNote: 'Chakras are a different system from Human Design centers. They are read only as symbolic themes, not as a health state.',
      chakraLevel: {bright: 'Bright', steady: 'Steady', quiet: 'Quiet'},
      vedicTitle: 'Your emotional grain, through Vedic astrology',
      crossTitle: 'What different destiny systems say about you at once',
      badge: {saju: 'Saju', hd: 'Human Design', fusion: 'Fusion'},
      insightTitle: {thinking: 'How you think by default', decision: 'How you decide', people: 'How you handle people, work and money'},
      summaryTitle: 'You at a glance',
      coreEngine: 'Core engines',
      row: {thinking: 'Thinking', decision: 'Decision', energy: 'Energy', emotion: 'Emotion', work: 'Work', money: 'Money', relationship: 'Relationships'},
      shareTitle: 'Share my Destiny Anatomy', shareSub: 'The blueprint of who I am',
      shareAction: 'Share', saveAction: 'Save image', copyAction: 'Copy link', copied: 'Link copied',
      ctaTitle: 'Want to go deeper into this structure?',
      nyangLabel: 'A word from Yeongnyangi',
      timeUnknown: 'With an exact birth time, you can see your energy structure too.',
      loginNeeded: 'Log in to continue with your Human Design energy structure and Vedic emotional layer.',
      login: 'Log in to continue',
      layerLoading: 'Loading your energy structure…',
      layerFailed: 'We could not load your energy structure right now. Your Saju structure is still here.',
      error: 'We could not load your Destiny Anatomy', retry: 'Try again',
      disclaimer: 'This is an interpretation for understanding tendencies. It does not replace medical or psychological advice and does not describe a fixed future.'
    },
    hero: {
      A: 'What fills your mind the most?',
      B: 'Your brain structure, read through Saju',
      C: 'Why do I keep having the same thoughts?',
      D: 'My Saju, unfolded from mind to body'
    },
    axes: {
      selfDrive: {name: 'Self-drive', short: 'Self', god: 'Companion stars', question: 'What do I want?', thought: 'I want to decide this myself',
        keywords: ['Independence', 'Self-direction', 'Competition', 'My own way', 'Boundaries'],
        strong: ['You want to decide in your own way', 'Being over-controlled feels stifling', 'Competition can energize you'],
        over: ['Stubbornness can grow', 'Competition can overheat', 'You may get sensitive about your share', 'People and resources can scatter'],
        mind: 'Sets your own course,', pull: 'Your drive to set your own course is strong.'},
      expression: {name: 'Expression & stimulation', short: 'Expression', god: 'Output stars', question: 'Is there anything fun?', thought: 'Anything fun out there?',
        keywords: ['Expression', 'Speech', 'Creation', 'Content', 'New stimuli'],
        strong: ['Speaking, expressing and making things energize you', 'You react quickly to new experiences and stimuli'],
        over: ['Attention can scatter', 'Boredom can come quickly', 'Routine can feel confining', 'Instant fun may come first'],
        mind: 'Fueled by fun and expression,', pull: 'New stimuli and expression are what get you going.'},
      reality: {name: 'Reality & results', short: 'Reality', god: 'Wealth stars', question: 'So what does this actually leave me with?', thought: 'Will this pay off?',
        keywords: ['Results', 'Efficiency', 'Management', 'Outcomes', 'Goals'],
        strong: ['You value real results over theory', 'You check what you actually gain for the time and money you put in'],
        over: ['Money, results and efficiency can become pressure', 'You may tire when results are not visible'],
        mind: 'Practical in thought,', pull: 'Your mind wants to confirm real results quickly.'},
      structure: {name: 'Responsibility & standards', short: 'Responsibility', god: 'Authority stars', question: 'Am I doing this right?', thought: 'I have to do this properly',
        keywords: ['Responsibility', 'Rules', 'Evaluation', 'Standards', 'Achievement'],
        strong: ['You take roles and responsibilities seriously', 'You are aware of social standards and what needs doing'],
        over: ['You may censor yourself too much', 'You may carry responsibility alone', 'Evaluation can weigh on you'],
        mind: 'Setting and keeping standards,', pull: 'The standard of doing it right switches on first.'},
      reflection: {name: 'Thought & absorption', short: 'Thinking', god: 'Resource stars', question: 'Did I miss anything?', thought: 'Did I miss something?',
        keywords: ['Study', 'Information', 'Intuition', 'Verification', 'Meaning'],
        strong: ['You need to think and understand before you move', 'You look for meaning even in a single event'],
        over: ['Worry can linger', 'Analysis can run too long', 'The same thought can loop', 'Action can be delayed'],
        mind: 'Thinking deeply before moving,', pull: 'You gather and review information until you feel sure.'}
    },
    combo: {
      'selfDrive+expression': {title: 'Expresses in their own way', text: 'You come alive when you can decide freely and express freely.'},
      'selfDrive+reality': {title: 'Makes their own share', text: 'Independence and a sense of reality are linked. You would rather hold the results in your own hands than rely on others.'},
      'selfDrive+structure': {title: 'Takes responsibility by their own standard', text: 'Your own direction and the standards you keep move together. You see what you take on through to the end, your way.'},
      'selfDrive+reflection': {title: 'Digs deep alone', text: 'You move once you are convinced. You trust answers you understood yourself more than other people\'s conclusions.'},
      'expression+reality': {title: 'Turns creations into value', text: 'You have the power to turn ideas, content and skills into real-world value.'},
      'expression+structure': {title: 'Creates new things within a frame', text: 'The urge to create freely sits beside the standard of doing it properly. You are good at bending rules once you know them.'},
      'expression+reflection': {title: 'Brings thoughts out as expression', text: 'You come most alive when thoughts you have turned over for a long time come out as words, writing or work.'},
      'reality+structure': {title: 'Proves it with results', text: 'Results and responsibility look the same way. You like to show what you took on in numbers and outcomes.'},
      'reality+reflection': {title: 'The calculating researcher', text: 'You gather enough information first and then try to link it to a real gain.'},
      'structure+reflection': {title: 'Studies so as not to be wrong', text: 'Preparation, review and responsibility likely matter a lot to you. You feel at ease once things are checked.'},
      balanced: {title: 'Uses all five engines evenly', text: 'Rather than one engine leading, you bring out different engines for different situations, so no single colour describes you.'},
      'solo:selfDrive': {title: 'Own direction first', text: 'Whatever you do, whether you want it switches on first.'},
      'solo:expression': {title: 'Fun is the fuel', text: 'New stimuli and expression fuel your actions. When the fun fades, the engine tends to cool too.'},
      'solo:reality': {title: 'Calculates the outcome', text: 'Before starting, you first work out what will actually remain.'},
      'solo:structure': {title: 'Keeps the standard', text: 'What needs doing and the standards to keep sit at the centre of your thinking.'},
      'solo:reflection': {title: 'Thinks before moving', text: 'Thoughts give birth to thoughts. You gather and review information until you feel sure.'}
    },
    tone: {
      strained: {
        expression: 'Your chart\'s overall strength is on the lighter side, so energy can run out quickly after pouring yourself out. Keeping a rest rhythm helps.',
        reality: 'Your chart\'s overall strength is on the lighter side, so chasing results can become a heavy load. Taking on what you can carry, in parts, may suit you better.',
        structure: 'Your chart\'s overall strength is on the lighter side, so piled-up responsibility can feel like pressure. Practising not carrying it all alone can help.'
      },
      surplus: {
        selfDrive: 'Your chart\'s overall strength is also high, so if this engine runs too hot it can look like stubbornness. Hearing out someone else\'s way keeps the balance.',
        reflection: 'Your chart\'s overall strength is also high, so thinking can run ahead of action. Once you feel you know enough, try a small first step.'
      }
    },
    elements: {
      wood: {name: 'Wood', words: 'expansion · growth · beginnings'},
      fire: {name: 'Fire', words: 'expression · speed · passion'},
      earth: {name: 'Earth', words: 'keeping · making real · mediating'},
      metal: {name: 'Metal', words: 'distinguishing · judging · sorting'},
      water: {name: 'Water', words: 'observing · exploring · thinking'}
    },
    chakra: {
      crown: {name: 'Crown', theme: 'meaning · direction · transcendence'},
      thirdEye: {name: 'Third Eye', theme: 'insight · imagination · observation'},
      throat: {name: 'Throat', theme: 'expression · communication'},
      heart: {name: 'Heart', theme: 'connection · relationships · attachment'},
      solarPlexus: {name: 'Solar Plexus', theme: 'will · self-drive · emotion'},
      sacral: {name: 'Sacral', theme: 'desire · pleasure · creation'},
      root: {name: 'Root', theme: 'stability · foundation · sense of reality'}
    },
    bridge: {tension: 'Your way of deciding, though, speaks of a different pace.', common: 'Your way of deciding points the same way.', complement: 'Your way of deciding adds a different sense to this.'},
    peopleBridge: {tension: 'Your energy type, though, suggests a different approach.', common: 'Your energy type points the same way.', complement: 'Your energy type adds a different rhythm to this.'},
    authorityHow: {
      AUTHORITY_EMOTIONAL: 'For important decisions, rather than concluding at once, checking whether you still want the same choice after the emotional wave passes may suit you better.',
      AUTHORITY_SACRAL: 'Before your head builds reasons, noticing the YES / NO response that comes from your body first may suit you better.',
      AUTHORITY_SPLENIC: 'Not missing the quiet intuition that flashes in the moment may suit you better.',
      AUTHORITY_EGO: 'Checking whether it is something you truly want and can commit to may suit you better.',
      AUTHORITY_SELF_PROJECTED: 'Talking it through with someone you trust and hearing the answer in your own voice may suit you better.',
      AUTHORITY_MENTAL: 'Sorting out your thoughts by talking with different people in different settings may suit you better.',
      AUTHORITY_LUNAR: 'For big decisions, taking about a month and sensing it several times may suit you better.'
    },
    typeHow: {
      TYPE_GENERATOR: 'Spending your energy on what you respond to first can keep you going longer.',
      TYPE_MANIFESTING_GENERATOR: 'Responding, moving fast, and letting people know before you move can make things smoother.',
      TYPE_PROJECTOR: 'Rather than pushing everything through yourself, choosing environments and people who recognise your abilities may suit you better.',
      TYPE_MANIFESTOR: 'Starting first, but informing those affected before you move, can reduce friction.',
      TYPE_REFLECTOR: 'Experiencing people and places fully, then judging slowly, may suit you better.'
    },
    peoplePull: {
      selfDrive: 'With people and work, you first protect your own way and your own place.',
      expression: 'With people and work, you last longer when fun and expression stay alive.',
      reality: 'With people, work and money, you first look at what actually remains.',
      structure: 'With people and work, you value the role you took on and the promises you made.',
      reflection: 'With people and work, you open up only after you understand enough.'
    },
    sajuDecision: {
      selfDrive: 'You are most comfortable deciding by your own judgement rather than others\' opinions. Taking one beat before concluding alone helps.',
      expression: 'You tend to decide quickly when your heart moves. Checking once more after the excitement cools helps.',
      reality: 'You tend to decide by weighing what you put in against what remains. Putting value that numbers miss on the scale too helps.',
      structure: 'You tend to decide by right and wrong and by what should be done. Watch that waiting for the perfect answer does not make you late.',
      reflection: 'You tend to decide after looking into things fully. Moving once you have about 80% of the information is also an option.'
    },
    work: {
      selfDrive: 'You gain strength in work where you hold the decisions.',
      expression: 'You gain strength in work where you make, speak and show.',
      reality: 'You gain strength in work where results show up in numbers and outcomes.',
      structure: 'You gain strength in work with clear roles and standards.',
      reflection: 'You gain strength in work where you learn, analyse and dig deep.'
    },
    money: {
      selfDrive: 'You prefer to hold and manage money yourself rather than leave it to others.',
      expression: 'Money tends to flow toward experiences, enjoyment and making things.',
      reality: 'You calculate the flow and efficiency of money carefully.',
      structure: 'You try to handle money steadily, by plan and principle.',
      reflection: 'You research and compare thoroughly before spending.'
    },
    relationship: {
      selfDrive: 'In relationships, your own space and feeling respected matter.',
      expression: 'You open up in relationships where you laugh together and talk easily.',
      reality: 'You trust actions and real care more than words.',
      structure: 'You value relationships that are reliable and keep promises.',
      reflection: 'You open up when you feel deeply understood.'
    },
    mindDecide: {
      AUTHORITY_EMOTIONAL: 'yet needs time for important decisions.',
      AUTHORITY_SACRAL: 'and decides through the body\'s response.',
      AUTHORITY_SPLENIC: 'and decides on in-the-moment intuition.',
      AUTHORITY_EGO: 'and decides by what is truly wanted.',
      AUTHORITY_SELF_PROJECTED: 'and finds the answer by talking it out.',
      AUTHORITY_MENTAL: 'and sorts thoughts out through conversation.',
      AUTHORITY_LUNAR: 'and decides slowly, with time.'
    },
    mindAct: {
      selfDrive: 'and in the end moves in their own way.',
      expression: 'and finds the way by expressing.',
      reality: 'and confirms things through results.',
      structure: 'and holds on through a sense of responsibility.',
      reflection: 'and moves as far as they understand.'
    },
    vedic: {
      kind: {emotion: 'How you process emotions', instinct: 'How you react by instinct', frame: 'Your basic frame for seeing the world'},
      emotion: {fire: 'Emotions flare quickly and pass quickly.', earth: 'You digest emotions slowly and steadily.', air: 'You handle emotions by sorting them into words and thoughts.', water: 'You feel emotions deeply and hold them for a long time.'},
      instinct: {
        Ketu: 'An instinct to step back from the familiar and see the essence.', Venus: 'An instinct to respond to beauty and comfort.',
        Sun: 'An instinct to make your own place clear.', Moon: 'An instinct to respond first to mood and people\'s hearts.',
        Mars: 'An instinct to find out by running into things.', Rahu: 'An instinct drawn to the new and unfamiliar.',
        Jupiter: 'An instinct to respond by seeking meaning and learning.', Saturn: 'An instinct to hold steady and watch carefully.',
        Mercury: 'An instinct to gather and connect information.'
      },
      frame: {fire: 'You tend to see the world as a stage of challenge and possibility.', earth: 'You tend to see the world as a reality built step by step.', air: 'You tend to see the world as a network of connections and ideas.', water: 'You tend to see the world as a flow of feelings and relationships.'}
    },
    nyang: {
      selfDrive: 'There\'s one steering wheel in your head, meow. Sitting in the passenger seat now and then isn\'t bad either.',
      expression: 'Fun is your fuel, meow. Cut boring tasks into small pieces and play them like a game.',
      reality: 'Quick at the math, meow. Keep at least one joyful thing even if it doesn\'t seem to pay.',
      structure: 'Solid standards, meow. Today, I\'ll tell you 80 points is enough.',
      reflection: 'A deep thinker, meow. Don\'t wait until you know it all — take a step when you know half.'
    },
    cta: [
      {id: 'love', q: 'How does this structure show up in love?', label: 'See love reading'},
      {id: 'compat', q: 'Who would I feel at ease with?', label: 'See compatibility'},
      {id: 'wealth', q: 'How could this structure earn money?', label: 'See wealth & career'},
      {id: 'luck', q: 'Which engine is your current luck strengthening?', label: 'See luck cycles'},
      {id: 'hd', q: 'Want to see your full Human Design chart?', label: 'See Human Design details'}
    ],
    join: ' · '
  };

  COPY.ja = {
    ui: {
      title: '運命構造図', subtitle: 'DESTINY ANATOMY', free: 'FREE',
      intro: 'いま見た四柱推命から、頭の中の思考エンジンからエネルギー構造までを一枚の設計図に広げました。',
      explore: '頭の中をくわしく見る',
      brainTitle: '四柱推命ブレインマップ',
      brainHeadline: 'あなたの頭の中でいちばん大きいのは「{name}」',
      brainHeadlineBalanced: '五つのエンジンが均等に回る頭の中',
      moreThoughts: 'ほかの思考も見る', lessThoughts: '閉じる',
      circuitTitle: '英ニャンが読んだあなたの思考回路',
      sequence: '{a} → {b} → {c} の順に頭を使う傾向があります。',
      enginesTitle: '五つの思考エンジン',
      question: '代表的な問い', whenStrong: '強いとき', whenOver: '強すぎるとき', sourceGods: '根拠の通変星',
      level: {dominant: '最も強い', strong: '強い', moderate: 'ふつう', light: '控えめ'},
      elementsTitle: 'エネルギーの材料', elementsSub: '心の材料 — 五行は通変星と混ぜずに別に見ます。',
      elementDominant: 'いちばんよく使う材料は「{name}」— {words}。',
      elementMissing: '「{name}」は命式に表れていません。足りないというより、ほかの材料で同じ働きをするタイプです。',
      hdBridge: '四柱推命が思考と欲求の構造を見せるなら、ヒューマンデザインはエネルギーが実際にどう動くかを別の視点から見せてくれます。',
      hdBridgeAction: 'エネルギー構造を見る',
      energyTitle: 'わたしはどうエネルギーを使う人？',
      strategy: 'ストラテジー', profile: 'プロファイル', definition: '定義',
      decisionTitle: 'あなたの決断ボタン',
      bodyTitle: 'エネルギーボディ',
      centerDefined: '定義あり — 安定して使えるエネルギー',
      centerOpen: 'オープン — 環境や人の影響をより受けやすい領域',
      toggle: {hd: 'ヒューマンデザイン', chakra: 'チャクラ', both: '一緒に見る'},
      chakraNote: 'チャクラはヒューマンデザインのセンターとは別の体系です。健康状態ではなく、象徴的なテーマとしてのみ読みます。',
      chakraLevel: {bright: '明るく', steady: '安定して', quiet: '静かに'},
      vedicTitle: 'インド占星術で見る感情の質',
      crossTitle: '異なる運命体系が同時に語るあなた',
      badge: {saju: '四柱推命', hd: 'ヒューマンデザイン', fusion: '融合'},
      insightTitle: {thinking: '考え方の基本', decision: '決め方', people: '人・仕事・お金との向き合い方'},
      summaryTitle: 'ひと目でわかるわたし',
      coreEngine: 'コアエンジン',
      row: {thinking: '思考', decision: '決断', energy: 'エネルギー', emotion: '感情', work: '仕事', money: 'お金', relationship: '関係'},
      shareTitle: '運命構造図をシェア', shareSub: 'わたしという人の運命構造図',
      shareAction: 'シェア', saveAction: '画像を保存', copyAction: 'リンクをコピー', copied: 'リンクをコピーしました',
      ctaTitle: 'この構造をもっと深く知りたいなら',
      nyangLabel: '英ニャンのひとこと',
      timeUnknown: '正確な出生時間があれば、エネルギー構造まで見られます。',
      loginNeeded: 'ログインすると、ヒューマンデザインのエネルギー構造とインド占星術の感情レイヤーまで続けて見られます。',
      login: 'ログインして続きを見る',
      layerLoading: 'エネルギー構造を読み込み中…',
      layerFailed: 'エネルギー構造をいまは読み込めませんでした。四柱推命の構造はそのまま見られます。',
      error: '運命構造図を読み込めませんでした', retry: 'もう一度読み込む',
      disclaimer: '傾向を理解するための解釈です。医学的・心理的な判断の代わりにはならず、決まった未来を語るものでもありません。'
    },
    hero: {
      A: 'わたしの頭の中は何でいっぱい？',
      B: '四柱推命で見るわたしの脳の構造',
      C: 'どうして同じことを考えてしまうんだろう？',
      D: 'わたしの四柱推命を心から体まで広げてみました'
    },
    axes: {
      selfDrive: {name: '主体性', short: '主体', god: '比劫', question: 'わたしは何を望んでいる？', thought: '自分で決めたい',
        keywords: ['独立', '自己主導', '競争', '自分のやり方', '境界'],
        strong: ['自分のやり方で決めたいタイプです', '過度に管理されると窮屈に感じます', '競争の場面でかえって力が湧くことがあります'],
        over: ['頑固になりやすいです', '競争が過熱しやすいです', '自分の取り分に敏感になりがちです', '人や資源が分散しやすいです'],
        mind: '自分で方向を決め、', pull: '自分で方向を決めようとする力が強いです。'},
      expression: {name: '表現と刺激', short: '表現', god: '食傷', question: '何かおもしろいことはない？', thought: 'おもしろいことないかな？',
        keywords: ['表現', '言葉', '創作', 'コンテンツ', '新しい刺激'],
        strong: ['話す・表現する・つくるときに力が湧きます', '新しい経験や刺激にすばやく反応します'],
        over: ['注意があちこちに散りやすいです', '飽きが早く来ることがあります', 'ルーティンを窮屈に感じがちです', '目先の楽しさを優先しやすいです'],
        mind: '楽しさと表現から力を得て、', pull: '新しい刺激と表現でエンジンがかかります。'},
      reality: {name: '現実と結果', short: '現実', god: '財星', question: 'で、結局何が残るの？', thought: 'これ、お金になる？',
        keywords: ['成果', '効率', '管理', '結果', '目標'],
        strong: ['理論より現実的な結果を大切にします', '時間やお金をかけたとき、実際に何が得られるかを確かめようとします'],
        over: ['お金・成果・効率そのものがプレッシャーになることがあります', '結果が見えないと疲れやすいです'],
        mind: '考え方は現実的で、', pull: '頭は早く現実的な結果を確かめたがります。'},
      structure: {name: '責任と基準', short: '責任', god: '官星', question: 'ちゃんとできている？', thought: 'ちゃんとやらなきゃ',
        keywords: ['責任', 'ルール', '評価', '基準', '達成'],
        strong: ['役割と責任を大切にします', '社会的な基準ややるべきことを意識しやすいです'],
        over: ['自分を厳しく検閲しすぎることがあります', '責任をひとりで抱えこみやすいです', '評価へのプレッシャーを強く感じがちです'],
        mind: '基準を立てて守りながら、', pull: 'きちんとやり遂げるという基準がまず働きます。'},
      reflection: {name: '思考と吸収', short: '思考', god: '印星', question: '何か見落としていない？', thought: '何か見落としてないかな？',
        keywords: ['学び', '情報', '直感', '検証', '意味'],
        strong: ['考えて理解してから動けるタイプです', 'ひとつの出来事にも意味を探そうとします'],
        over: ['心配が長引くことがあります', '分析しすぎることがあります', '同じ考えをくり返しやすいです', '行動が遅れがちです'],
        mind: 'じっくり考えてから動き、', pull: '確信が持てるまで情報を集めて検討しようとします。'}
    },
    combo: {
      'selfDrive+expression': {title: '自分のやり方で表現する人', text: '自由に決めて自由に表現するときに力が出る構造です。'},
      'selfDrive+reality': {title: '自分の取り分は自分でつくる人', text: '独立心と現実感覚がつながった構造です。人に頼るより、結果を自分の手でつかみたいタイプです。'},
      'selfDrive+structure': {title: '自分の基準で責任を持つ人', text: '自分で決めた方向と守るべき基準が一緒に動きます。引き受けたことは自分のやり方で最後までやり抜こうとします。'},
      'selfDrive+reflection': {title: 'ひとりで深く掘り下げる人', text: '自分が納得してこそ動ける構造です。人の結論より、自分で理解した答えを信じます。'},
      'expression+reality': {title: 'つくって価値に変える人', text: 'アイデア・コンテンツ・技術といった表現を現実的な価値に変える力があります。'},
      'expression+structure': {title: '枠の中で新しさを生む人', text: '自由につくりたい気持ちと、きちんとやるべきという基準が同居しています。ルールを知ったうえでひねるのが得意です。'},
      'expression+reflection': {title: '考えを表現として外に出す人', text: '頭の中で長く転がした考えを、言葉や文章、作品として出すときにいちばん生き生きします。'},
      'reality+structure': {title: '結果で証明する人', text: '成果と責任が同じ方向を向いています。引き受けたことを数字と結果で示そうとします。'},
      'reality+reflection': {title: '計算する研究者', text: '十分に情報を集めてから、実際の利益につなげようとする構造です。'},
      'structure+reflection': {title: '間違えないために学ぶ人', text: '準備・検討・責任を大切にする可能性が高いです。確認が終わると安心できるタイプです。'},
      balanced: {title: '五つのエンジンを均等に使う人', text: 'ひとつのエンジンが独走するより、状況に応じて別のエンジンを使い分ける構造です。そのぶん、ひとつの色では説明できません。'},
      'solo:selfDrive': {title: '自分の方向が先に立つ人', text: '何をするにも、自分が望むかどうかが先に働く構造です。'},
      'solo:expression': {title: '楽しさが燃料の人', text: '新しい刺激と表現が行動の燃料になる構造です。楽しさが消えるとエンジンも冷めやすいです。'},
      'solo:reality': {title: '結果を計算する人', text: '始める前に、実際に何が残るかを先に計算する構造です。'},
      'solo:structure': {title: '基準を守る人', text: 'やるべきことと守るべき基準が思考の中心にある構造です。'},
      'solo:reflection': {title: '考えてから動く人', text: '考えが考えを生む構造です。確信が持てるまで情報を集めて検討しようとします。'}
    },
    tone: {
      strained: {
        expression: 'ただ命式全体の力はやや軽めなので、表現を出しきったあとにエネルギーが早く尽きることがあります。休むリズムも一緒に大切にしましょう。',
        reality: 'ただ命式全体の力はやや軽めなので、結果を追うほど負担が大きくなりがちです。一度に全部つかむより、抱えられる分ずつ分けるほうが合うかもしれません。',
        structure: 'ただ命式全体の力はやや軽めなので、責任が積み重なるとプレッシャーに感じやすいです。ひとりで抱えこまない練習が助けになります。'
      },
      surplus: {
        selfDrive: '命式全体の力も強めなので、このエンジンが強くなりすぎると頑固に見えることがあります。人のやり方に一度耳を傾ける余裕がバランスをとってくれます。',
        reflection: '命式全体の力も強めなので、考えが行動より先に走りがちです。十分わかったと感じたら、小さくても先に動いてみましょう。'
      }
    },
    elements: {
      wood: {name: '木', words: '拡張 · 成長 · 始まり'},
      fire: {name: '火', words: '表現 · スピード · 情熱'},
      earth: {name: '土', words: '維持 · 現実化 · 仲介'},
      metal: {name: '金', words: '区別 · 判断 · 整理'},
      water: {name: '水', words: '観察 · 探索 · 思考'}
    },
    chakra: {
      crown: {name: 'クラウン', theme: '意味 · 方向 · 超越'},
      thirdEye: {name: '第三の目', theme: '洞察 · 想像 · 観察'},
      throat: {name: 'スロート', theme: '表現 · 伝達'},
      heart: {name: 'ハート', theme: 'つながり · 関係 · 愛着'},
      solarPlexus: {name: 'ソーラープレクサス', theme: '意志 · 自己推進 · 感情'},
      sacral: {name: 'セイクラル', theme: '欲求 · 楽しさ · 創造'},
      root: {name: 'ルート', theme: '安定 · 基盤 · 現実感覚'}
    },
    bridge: {tension: 'ただ、決め方は少し違うペースを語っています。', common: '決め方も同じ方向を指しています。', complement: '決め方はここに別の感覚を加えてくれます。'},
    peopleBridge: {tension: 'ただ、エネルギータイプは別のやり方をすすめています。', common: 'エネルギータイプも同じ方向を指しています。', complement: 'エネルギータイプはここに別のリズムを加えてくれます。'},
    authorityHow: {
      AUTHORITY_EMOTIONAL: '大事な決断ほどすぐに結論を出すより、感情の波が過ぎたあとも同じ選択をしたいか確かめるほうが合うかもしれません。',
      AUTHORITY_SACRAL: '頭で理由をつくる前に、体から先に来る YES / NO の反応を見るほうが合うかもしれません。',
      AUTHORITY_SPLENIC: 'その瞬間によぎる静かな直感を逃さないほうが合うかもしれません。',
      AUTHORITY_EGO: '本当に望んでいて約束できることかを確かめるほうが合うかもしれません。',
      AUTHORITY_SELF_PROJECTED: '信頼できる人に話してみて、自分の声の中に答えを聞くほうが合うかもしれません。',
      AUTHORITY_MENTAL: 'いろいろな人や環境の中で話しながら考えを整理するほうが合うかもしれません。',
      AUTHORITY_LUNAR: '大きな決断はひと月ほど時間をかけて、何度か感じてみるほうが合うかもしれません。'
    },
    typeHow: {
      TYPE_GENERATOR: 'まず反応が来ることにエネルギーを使うほうが長続きしやすいです。',
      TYPE_MANIFESTING_GENERATOR: '反応してから素早く動き、動く前にまわりに知らせておくとスムーズかもしれません。',
      TYPE_PROJECTOR: 'すべてを自分で押し進めるより、自分の力を認めてくれる環境や人を選ぶほうが合うかもしれません。',
      TYPE_MANIFESTOR: '先に始めつつ、動く前に影響を受ける人に知らせると摩擦を減らせるかもしれません。',
      TYPE_REFLECTOR: '人や環境を十分に味わってから、ゆっくり判断するほうが合うかもしれません。'
    },
    peoplePull: {
      selfDrive: '人や仕事の前でも、自分のやり方と居場所をまず守ろうとします。',
      expression: '人や仕事の前で、楽しさと表現が生きていると長く続けられます。',
      reality: '人・仕事・お金に向き合うとき、実際に何が残るかをまず見ます。',
      structure: '人や仕事の前で、引き受けた役割と約束を大切にします。',
      reflection: '人や仕事の前で、十分に理解してから心を開きます。'
    },
    sajuDecision: {
      selfDrive: '人の意見より自分の判断に従うとき、いちばん楽に決められます。ひとりで結論を急がないよう、ひと呼吸おくとよいでしょう。',
      expression: '心が動いた瞬間にすばやく決めるタイプです。熱が冷めたあとも同じ選択か、もう一度見るとよいでしょう。',
      reality: 'かけたものと残るものを計算して決めるタイプです。数字に表れない価値も天秤にのせてみましょう。',
      structure: '正しいか、やるべきかを基準に決めるタイプです。完璧な答えを待って遅れないよう気をつけましょう。',
      reflection: '十分に調べてから決めるタイプです。情報が8割そろったら動いてみるのもひとつの方法です。'
    },
    work: {
      selfDrive: '自分で決定権を持てる仕事で力が出ます。',
      expression: 'つくる・話す・見せる仕事で力が出ます。',
      reality: '成果が数字や結果で見える仕事で力が出ます。',
      structure: '役割と基準がはっきりした仕事で力が出ます。',
      reflection: '学び、分析し、深く掘り下げる仕事で力が出ます。'
    },
    money: {
      selfDrive: 'お金は人に任せるより、自分で握って管理したいタイプです。',
      expression: 'お金は経験や楽しみ、ものづくりに流れやすいです。',
      reality: 'お金の流れと効率を細かく計算するタイプです。',
      structure: 'お金は計画と原則に沿って安定的に扱おうとします。',
      reflection: 'お金を使う前に十分に調べて比べるタイプです。'
    },
    relationship: {
      selfDrive: '関係でも、自分の領域と尊重されている感覚が大切です。',
      expression: '一緒に笑えて話が通じる関係で心が開きます。',
      reality: '言葉より、行動や実際に気にかけてくれる気持ちを信じます。',
      structure: '信頼できて約束を守る関係を大切にします。',
      reflection: '深く理解されていると感じたときに心を開きます。'
    },
    mindDecide: {
      AUTHORITY_EMOTIONAL: '大事な決断には時間が必要な人',
      AUTHORITY_SACRAL: '体の反応で決める人',
      AUTHORITY_SPLENIC: '瞬間の直感で決める人',
      AUTHORITY_EGO: '本心から望むかで決める人',
      AUTHORITY_SELF_PROJECTED: '話しながら答えを見つける人',
      AUTHORITY_MENTAL: '対話の中で考えを整理する人',
      AUTHORITY_LUNAR: '時間をかけてゆっくり決める人'
    },
    mindAct: {
      selfDrive: '最後は自分のやり方で動く人',
      expression: '表現しながら道を見つける人',
      reality: '結果で確かめる人',
      structure: '責任感で踏んばる人',
      reflection: '理解したぶんだけ動く人'
    },
    vedic: {
      kind: {emotion: '感情の処理のしかた', instinct: '本能的な反応のしかた', frame: '世界を見る基本のフレーム'},
      emotion: {fire: '感情がすばやく燃え上がり、すばやく過ぎていきます。', earth: '感情をゆっくり、安定して消化します。', air: '感情を言葉や考えで整理しながら扱います。', water: '感情を深く長く感じて抱えます。'},
      instinct: {
        Ketu: '慣れたものから一歩引いて本質を見ようとする本能があります。', Venus: '美しさと心地よさに反応する本能があります。',
        Sun: '自分の居場所をはっきりさせようとする本能があります。', Moon: '雰囲気や人の気持ちにまず反応する本能があります。',
        Mars: 'ぶつかって確かめようとする本能があります。', Rahu: '新しく見慣れないものに惹かれる本能があります。',
        Jupiter: '意味や学びを求めて反応する本能があります。', Saturn: '慎重に踏みとどまり見守る本能があります。',
        Mercury: '情報を集めてつなげながら反応する本能があります。'
      },
      frame: {fire: '世界を挑戦と可能性の舞台として見るタイプです。', earth: '世界を一歩ずつ積み上げる現実として見るタイプです。', air: '世界をつながりとアイデアのネットワークとして見るタイプです。', water: '世界を感情と関係の流れとして見るタイプです。'}
    },
    nyang: {
      selfDrive: '頭の中にハンドルがひとつあるニャ。たまには助手席に座るのも悪くないよ。',
      expression: '楽しさがきみの燃料ニャ。つまらない作業は小さく分けて遊びみたいにやってみて。',
      reality: '計算が速い頭ニャ。得にならなさそうでも、楽しいことをひとつは残しておいて。',
      structure: '基準がしっかりした頭ニャ。今日は80点でも十分だって言ってあげる。',
      reflection: '考えが深い頭ニャ。全部わかってからじゃなく、半分わかったら一歩動いてみて。'
    },
    cta: [
      {id: 'love', q: 'この構造は恋愛でどう表れる？', label: '恋愛鑑定を見る'},
      {id: 'compat', q: 'どんな人といると楽でいられる？', label: '相性を見る'},
      {id: 'wealth', q: 'この構造でお金を稼ぐには？', label: '金運・仕事を見る'},
      {id: 'luck', q: 'いまの運でどのエンジンが強まっている？', label: '大運・年運を見る'},
      {id: 'hd', q: 'ヒューマンデザインの全体チャートを見たいなら', label: 'ヒューマンデザイン詳細'}
    ],
    join: ' · '
  };

  COPY['zh-CN'] = {
    ui: {
      title: '命运结构图', subtitle: 'DESTINY ANATOMY', free: 'FREE',
      intro: '用你刚看完的八字，把脑中的思考引擎到能量结构展开成一张设计图。',
      explore: '细看我的脑内',
      brainTitle: '八字脑图',
      brainHeadline: '你脑中占比最大的是「{name}」',
      brainHeadlineBalanced: '五个引擎均衡运转的大脑',
      moreThoughts: '查看其他想法', lessThoughts: '收起',
      circuitTitle: '英喵读到的你的思考回路',
      sequence: '你倾向按 {a} → {b} → {c} 的顺序用脑。',
      enginesTitle: '五个思考引擎',
      question: '代表问题', whenStrong: '强的时候', whenOver: '过度的时候', sourceGods: '依据十神',
      level: {dominant: '最强', strong: '强', moderate: '中等', light: '较弱'},
      elementsTitle: '我的能量原料', elementsSub: '精神的原料 — 五行与十神分开来看，不混为一谈。',
      elementDominant: '你最常用的原料是「{name}」— {words}。',
      elementMissing: '「{name}」没有出现在命局中。与其说缺少，不如说你会用其他原料完成同样的事。',
      hdBridge: '如果说八字展示了思想与欲望的结构，人类图则从另一个角度展示能量实际如何流动。',
      hdBridgeAction: '查看我的能量结构',
      energyTitle: '我是怎样使用能量的人？',
      strategy: '策略', profile: '人生角色', definition: '定义',
      decisionTitle: '你的决定按钮',
      bodyTitle: '能量身体',
      centerDefined: '有定义 — 能稳定取用的能量',
      centerOpen: '开放 — 更容易感受环境与他人影响的区域',
      toggle: {hd: '人类图', chakra: '脉轮', both: '一起看'},
      chakraNote: '脉轮与人类图的能量中心是不同的体系。这里不谈健康状态，只作为象征性主题来解读。',
      chakraLevel: {bright: '明亮', steady: '平稳', quiet: '安静'},
      vedicTitle: '从吠陀占星看情绪的纹理',
      crossTitle: '不同命运体系同时说出的你',
      badge: {saju: '八字', hd: '人类图', fusion: '融合'},
      insightTitle: {thinking: '思考的基本方式', decision: '做决定的方式', people: '对待人、工作与金钱的方式'},
      summaryTitle: '一眼看懂我',
      coreEngine: '核心引擎',
      row: {thinking: '思考', decision: '决定', energy: '能量', emotion: '情绪', work: '工作', money: '金钱', relationship: '关系'},
      shareTitle: '分享我的命运结构图', shareSub: '我这个人的命运结构图',
      shareAction: '分享', saveAction: '保存图片', copyAction: '复制链接', copied: '链接已复制',
      ctaTitle: '想更深入了解这个结构？',
      nyangLabel: '英喵的一句话',
      timeUnknown: '如果有准确的出生时间，还能看到能量结构。',
      loginNeeded: '登录后可以继续查看人类图能量结构与吠陀情绪层。',
      login: '登录后继续查看',
      layerLoading: '正在加载能量结构…',
      layerFailed: '暂时无法加载能量结构。八字结构仍可照常查看。',
      error: '无法加载命运结构图', retry: '重新加载',
      disclaimer: '这是帮助理解倾向的解读，不能代替医学或心理方面的判断，也不代表注定的未来。'
    },
    hero: {
      A: '我的脑子里装满了什么？',
      B: '用八字看我的大脑结构',
      C: '为什么我总在重复同样的想法？',
      D: '把我的八字从精神到身体展开来看'
    },
    axes: {
      selfDrive: {name: '主体性', short: '主体', god: '比劫', question: '我想要什么？', thought: '我想自己决定',
        keywords: ['独立', '自主', '竞争', '自己的方式', '边界'],
        strong: ['想按自己的方式做决定', '被过度控制时会觉得憋闷', '在竞争中反而可能更有干劲'],
        over: ['容易变得固执', '竞争容易过热', '对自己的份额会比较敏感', '人和资源容易分散'],
        mind: '自己定方向，', pull: '想自己决定方向的力量很强。'},
      expression: {name: '表达与刺激', short: '表达', god: '食伤', question: '有没有好玩的？', thought: '有没有好玩的？',
        keywords: ['表达', '说话', '创作', '内容', '新刺激'],
        strong: ['说话、表达、创造时最有能量', '对新的体验和刺激反应很快'],
        over: ['注意力容易分散', '容易很快感到厌倦', '容易觉得日常规律很憋闷', '容易优先选择眼前的乐趣'],
        mind: '从乐趣与表达中获得力量，', pull: '新的刺激和表达会让你动起来。'},
      reality: {name: '现实与结果', short: '现实', god: '财星', question: '所以这到底能留下什么？', thought: '这能赚钱吗？',
        keywords: ['成果', '效率', '管理', '结果', '目标'],
        strong: ['比起理论更看重现实的结果', '投入时间和金钱时，会确认实际能得到什么'],
        over: ['金钱、成果和效率本身可能变成压力', '看不到结果时容易疲惫'],
        mind: '想法务实，', pull: '脑子想尽快确认现实的结果。'},
      structure: {name: '责任与标准', short: '责任', god: '官星', question: '我这样做对吗？', thought: '得好好做才行',
        keywords: ['责任', '规则', '评价', '标准', '成就'],
        strong: ['重视角色与责任', '容易意识到社会标准和该做的事'],
        over: ['可能对自己审视过严', '容易独自扛下责任', '可能强烈感受到被评价的压力'],
        mind: '立标准、守标准，', pull: '“要做好”的标准会最先启动。'},
      reflection: {name: '思考与吸收', short: '思考', god: '印星', question: '我是不是漏掉了什么？', thought: '我是不是漏了什么？',
        keywords: ['学习', '信息', '直觉', '验证', '意义'],
        strong: ['要先想清楚、理解了才能行动', '即使是一件小事也想找出意义'],
        over: ['担心可能持续很久', '分析可能过度', '容易反复想同一件事', '行动可能被推迟'],
        mind: '想透了再行动，', pull: '在确信之前会不断收集和检视信息。'}
    },
    combo: {
      'selfDrive+expression': {title: '用自己的方式表达的人', text: '能自由决定、自由表达时最有力量。'},
      'selfDrive+reality': {title: '自己的份自己挣的人', text: '独立性与现实感连在一起。比起依赖别人，更想亲手握住结果。'},
      'selfDrive+structure': {title: '按自己的标准负责的人', text: '自己定的方向和要守的标准一起运转。接下的事会用自己的方式做到最后。'},
      'selfDrive+reflection': {title: '独自深挖的人', text: '自己想通了才会行动。比起别人的结论，更相信自己理解的答案。'},
      'expression+reality': {title: '把创造变成价值的人', text: '有把想法、内容、技术等表达转化为现实价值的力量。'},
      'expression+structure': {title: '在框架里创新的人', text: '想自由创造的心和“要做好”的标准同时存在。擅长在了解规则后再做变化。'},
      'expression+reflection': {title: '把思考化为表达的人', text: '把在脑中反复琢磨的想法变成话语、文字和作品时最有活力。'},
      'reality+structure': {title: '用结果证明的人', text: '成果与责任朝着同一个方向。习惯用数字和结果展示自己负责的事。'},
      'reality+reflection': {title: '会计算的研究者', text: '先充分收集信息，再把它连接到实际收益。'},
      'structure+reflection': {title: '为了不出错而学习的人', text: '很可能非常重视准备、检查与责任。确认完了才安心。'},
      balanced: {title: '均衡使用五个引擎的人', text: '不是某一个引擎独大，而是根据情况调用不同的引擎。所以很难用单一的颜色来形容。'},
      'solo:selfDrive': {title: '方向先行的人', text: '不管做什么，最先启动的都是“我想不想要”。'},
      'solo:expression': {title: '以乐趣为燃料的人', text: '新的刺激和表达是行动的燃料。乐趣一消失，引擎也容易跟着冷却。'},
      'solo:reality': {title: '计算结果的人', text: '开始之前，先计算实际能留下什么。'},
      'solo:structure': {title: '守标准的人', text: '该做的事和要守的标准是思考的中心。'},
      'solo:reflection': {title: '想好了才行动的人', text: '想法会生出想法。在确信之前会不断收集和检视信息。'}
    },
    tone: {
      strained: {
        expression: '不过命局整体的力量偏轻，表达倾泻之后能量可能很快见底。记得一起照顾休息的节奏。',
        reality: '不过命局整体的力量偏轻，越追逐结果负担越容易加重。与其一次全抓住，不如按能承受的量分批来。',
        structure: '不过命局整体的力量偏轻，责任一堆积就容易感到压力。练习不要独自全扛会有帮助。'
      },
      surplus: {
        selfDrive: '命局整体的力量也偏强，这个引擎太强时可能显得固执。留一点余裕听听别人的方式，能帮你保持平衡。',
        reflection: '命局整体的力量也偏强，思考容易跑在行动前面。觉得了解得差不多时，不妨先迈出一小步。'
      }
    },
    elements: {
      wood: {name: '木', words: '扩展 · 成长 · 开始'},
      fire: {name: '火', words: '表达 · 速度 · 热情'},
      earth: {name: '土', words: '维持 · 落实 · 调和'},
      metal: {name: '金', words: '区分 · 判断 · 整理'},
      water: {name: '水', words: '观察 · 探索 · 思考'}
    },
    chakra: {
      crown: {name: '顶轮', theme: '意义 · 方向 · 超越'},
      thirdEye: {name: '眉心轮', theme: '洞察 · 想象 · 观察'},
      throat: {name: '喉轮', theme: '表达 · 传达'},
      heart: {name: '心轮', theme: '连接 · 关系 · 依恋'},
      solarPlexus: {name: '太阳神经丛轮', theme: '意志 · 自我推动 · 情绪'},
      sacral: {name: '脐轮', theme: '欲望 · 快乐 · 创造'},
      root: {name: '海底轮', theme: '稳定 · 根基 · 现实感'}
    },
    bridge: {tension: '不过，你做决定的方式说的是另一种节奏。', common: '你做决定的方式也指向同一个方向。', complement: '你做决定的方式为此补充了另一种感觉。'},
    peopleBridge: {tension: '不过，你的能量类型建议另一种方式。', common: '你的能量类型也指向同一个方向。', complement: '你的能量类型为此补充了另一种节奏。'},
    authorityHow: {
      AUTHORITY_EMOTIONAL: '重要的决定与其马上下结论，不如等情绪的波浪过去后，确认自己是否仍想做同样的选择，这样可能更适合你。',
      AUTHORITY_SACRAL: '在用头脑找理由之前，先留意身体最先给出的 YES / NO 反应，可能更适合你。',
      AUTHORITY_SPLENIC: '不错过那一瞬间闪过的安静直觉，可能更适合你。',
      AUTHORITY_EGO: '确认这是不是你真心想要、也能承诺的事，可能更适合你。',
      AUTHORITY_SELF_PROJECTED: '对信任的人说出来，在自己的声音里听见答案，可能更适合你。',
      AUTHORITY_MENTAL: '在不同的人和环境中交谈、整理想法，可能更适合你。',
      AUTHORITY_LUNAR: '重大的决定花一个月左右的时间，多感受几次，可能更适合你。'
    },
    typeHow: {
      TYPE_GENERATOR: '把能量用在先有回应的事情上，更能持久。',
      TYPE_MANIFESTING_GENERATOR: '回应之后快速行动，并在行动前先告知周围的人，事情可能会更顺。',
      TYPE_PROJECTOR: '与其什么都亲自硬推，不如选择能看见你能力的环境和人，可能更适合你。',
      TYPE_MANIFESTOR: '可以先开始，但在行动前告知会受影响的人，能减少摩擦。',
      TYPE_REFLECTOR: '充分体验人和环境之后再慢慢判断，可能更适合你。'
    },
    peoplePull: {
      selfDrive: '面对人和工作时，也会先守住自己的方式和位置。',
      expression: '面对人和工作时，有乐趣和表达空间才能坚持得久。',
      reality: '面对人、工作和金钱时，会先看实际能留下什么。',
      structure: '面对人和工作时，重视自己承担的角色与承诺。',
      reflection: '面对人和工作时，充分理解之后才会敞开心扉。'
    },
    sajuDecision: {
      selfDrive: '比起别人的意见，按自己的判断做决定时最自在。别一个人急着下结论，停一拍会更好。',
      expression: '心一动就会很快做决定。等热度冷却后再看一次是不是同样的选择会更好。',
      reality: '会计算投入与回报后再做决定。也把数字看不到的价值放上天平会更好。',
      structure: '会以对错和该不该做为标准来决定。小心别因为等待完美答案而错过时机。',
      reflection: '会在充分了解之后再做决定。信息收集到八成时，先行动也是一种方法。'
    },
    work: {
      selfDrive: '在能自己掌握决定权的工作中更有力量。',
      expression: '在创作、表达、展示的工作中更有力量。',
      reality: '在成果能用数字和结果看见的工作中更有力量。',
      structure: '在角色和标准清晰的工作中更有力量。',
      reflection: '在学习、分析、深入钻研的工作中更有力量。'
    },
    money: {
      selfDrive: '钱更愿意自己掌握和管理，而不是交给别人。',
      expression: '钱容易流向体验、乐趣和创作。',
      reality: '会仔细计算金钱的流向和效率。',
      structure: '会按计划和原则稳定地管理钱。',
      reflection: '花钱前会充分了解和比较。'
    },
    relationship: {
      selfDrive: '在关系中，自己的空间和被尊重的感觉很重要。',
      expression: '在能一起笑、聊得来的关系里更容易敞开心扉。',
      reality: '比起言语，更相信行动和实际的关心。',
      structure: '重视可靠、守约的关系。',
      reflection: '感到被深深理解时才会敞开心扉。'
    },
    mindDecide: {
      AUTHORITY_EMOTIONAL: '重要的决定需要时间的人',
      AUTHORITY_SACRAL: '用身体的反应做决定的人',
      AUTHORITY_SPLENIC: '凭瞬间直觉做决定的人',
      AUTHORITY_EGO: '看自己是否真心想要来做决定的人',
      AUTHORITY_SELF_PROJECTED: '边说边找到答案的人',
      AUTHORITY_MENTAL: '在对话中整理想法的人',
      AUTHORITY_LUNAR: '花时间慢慢做决定的人'
    },
    mindAct: {
      selfDrive: '最终按自己的方式行动的人',
      expression: '在表达中找到方向的人',
      reality: '用结果来确认的人',
      structure: '靠责任感撑下去的人',
      reflection: '理解多少就行动多少的人'
    },
    vedic: {
      kind: {emotion: '处理情绪的方式', instinct: '本能反应的方式', frame: '看世界的基本框架'},
      emotion: {fire: '情绪来得快，也去得快。', earth: '会慢慢地、稳定地消化情绪。', air: '会用语言和思考整理情绪。', water: '会深深地、长久地感受和怀抱情绪。'},
      instinct: {
        Ketu: '有从熟悉事物中退后一步、看清本质的本能。', Venus: '有追随美与舒适而反应的本能。',
        Sun: '有想把自己的位置弄清楚的本能。', Moon: '有先对气氛和人心做出反应的本能。',
        Mars: '有通过碰撞来确认的本能。', Rahu: '有被新鲜陌生事物吸引的本能。',
        Jupiter: '有寻找意义与学习而反应的本能。', Saturn: '有谨慎坚守、静观其变的本能。',
        Mercury: '有收集并连接信息而反应的本能。'
      },
      frame: {fire: '倾向把世界看成挑战与可能性的舞台。', earth: '倾向把世界看成一步步积累的现实。', air: '倾向把世界看成连接与想法的网络。', water: '倾向把世界看成情感与关系的流动。'}
    },
    nyang: {
      selfDrive: '你脑子里有一个方向盘喵。偶尔坐坐副驾驶也不错哦。',
      expression: '乐趣就是你的燃料喵。无聊的事切成小块，像玩游戏一样做吧。',
      reality: '算得很快的脑袋喵。就算看起来没什么收益，也留一件让你开心的事吧。',
      structure: '标准很扎实的脑袋喵。今天，80 分就够了。',
      reflection: '想得很深的脑袋喵。不用等全都明白，懂一半时就迈出一步吧。'
    },
    cta: [
      {id: 'love', q: '这个结构在恋爱中会怎样表现？', label: '查看恋爱解读'},
      {id: 'compat', q: '我和什么样的人在一起会自在？', label: '查看合盘'},
      {id: 'wealth', q: '用这个结构怎样赚钱？', label: '查看财运与事业'},
      {id: 'luck', q: '现在的运势正在加强哪个引擎？', label: '查看大运与流年'},
      {id: 'hd', q: '想看完整的人类图？', label: '查看人类图详情'}
    ],
    join: ' · '
  };

  COPY['zh-TW'] = {
    ui: {
      title: '命運結構圖', subtitle: 'DESTINY ANATOMY', free: 'FREE',
      intro: '用你剛看完的八字，把腦中的思考引擎到能量結構展開成一張設計圖。',
      explore: '細看我的腦內',
      brainTitle: '八字腦圖',
      brainHeadline: '你腦中占比最大的是「{name}」',
      brainHeadlineBalanced: '五個引擎均衡運轉的大腦',
      moreThoughts: '查看其他想法', lessThoughts: '收起',
      circuitTitle: '英喵讀到的你的思考迴路',
      sequence: '你傾向按 {a} → {b} → {c} 的順序用腦。',
      enginesTitle: '五個思考引擎',
      question: '代表問題', whenStrong: '強的時候', whenOver: '過度的時候', sourceGods: '依據十神',
      level: {dominant: '最強', strong: '強', moderate: '中等', light: '較弱'},
      elementsTitle: '我的能量原料', elementsSub: '精神的原料 — 五行與十神分開來看，不混為一談。',
      elementDominant: '你最常用的原料是「{name}」— {words}。',
      elementMissing: '「{name}」沒有出現在命局中。與其說缺少，不如說你會用其他原料完成同樣的事。',
      hdBridge: '如果說八字展示了思想與慾望的結構，人類圖則從另一個角度展示能量實際如何流動。',
      hdBridgeAction: '查看我的能量結構',
      energyTitle: '我是怎樣使用能量的人？',
      strategy: '策略', profile: '人生角色', definition: '定義',
      decisionTitle: '你的決定按鈕',
      bodyTitle: '能量身體',
      centerDefined: '有定義 — 能穩定取用的能量',
      centerOpen: '開放 — 更容易感受環境與他人影響的區域',
      toggle: {hd: '人類圖', chakra: '脈輪', both: '一起看'},
      chakraNote: '脈輪與人類圖的能量中心是不同的體系。這裡不談健康狀態，只作為象徵性主題來解讀。',
      chakraLevel: {bright: '明亮', steady: '平穩', quiet: '安靜'},
      vedicTitle: '從吠陀占星看情緒的紋理',
      crossTitle: '不同命運體系同時說出的你',
      badge: {saju: '八字', hd: '人類圖', fusion: '融合'},
      insightTitle: {thinking: '思考的基本方式', decision: '做決定的方式', people: '對待人、工作與金錢的方式'},
      summaryTitle: '一眼看懂我',
      coreEngine: '核心引擎',
      row: {thinking: '思考', decision: '決定', energy: '能量', emotion: '情緒', work: '工作', money: '金錢', relationship: '關係'},
      shareTitle: '分享我的命運結構圖', shareSub: '我這個人的命運結構圖',
      shareAction: '分享', saveAction: '儲存圖片', copyAction: '複製連結', copied: '連結已複製',
      ctaTitle: '想更深入了解這個結構？',
      nyangLabel: '英喵的一句話',
      timeUnknown: '如果有準確的出生時間，還能看到能量結構。',
      loginNeeded: '登入後可以繼續查看人類圖能量結構與吠陀情緒層。',
      login: '登入後繼續查看',
      layerLoading: '正在載入能量結構…',
      layerFailed: '暫時無法載入能量結構。八字結構仍可照常查看。',
      error: '無法載入命運結構圖', retry: '重新載入',
      disclaimer: '這是幫助理解傾向的解讀，不能代替醫學或心理方面的判斷，也不代表注定的未來。'
    },
    hero: {
      A: '我的腦子裡裝滿了什麼？',
      B: '用八字看我的大腦結構',
      C: '為什麼我總在重複同樣的想法？',
      D: '把我的八字從精神到身體展開來看'
    },
    axes: {
      selfDrive: {name: '主體性', short: '主體', god: '比劫', question: '我想要什麼？', thought: '我想自己決定',
        keywords: ['獨立', '自主', '競爭', '自己的方式', '界線'],
        strong: ['想按自己的方式做決定', '被過度控制時會覺得憋悶', '在競爭中反而可能更有幹勁'],
        over: ['容易變得固執', '競爭容易過熱', '對自己的份額會比較敏感', '人和資源容易分散'],
        mind: '自己定方向，', pull: '想自己決定方向的力量很強。'},
      expression: {name: '表達與刺激', short: '表達', god: '食傷', question: '有沒有好玩的？', thought: '有沒有好玩的？',
        keywords: ['表達', '說話', '創作', '內容', '新刺激'],
        strong: ['說話、表達、創造時最有能量', '對新的體驗和刺激反應很快'],
        over: ['注意力容易分散', '容易很快感到厭倦', '容易覺得日常規律很憋悶', '容易優先選擇眼前的樂趣'],
        mind: '從樂趣與表達中獲得力量，', pull: '新的刺激和表達會讓你動起來。'},
      reality: {name: '現實與結果', short: '現實', god: '財星', question: '所以這到底能留下什麼？', thought: '這能賺錢嗎？',
        keywords: ['成果', '效率', '管理', '結果', '目標'],
        strong: ['比起理論更看重現實的結果', '投入時間和金錢時，會確認實際能得到什麼'],
        over: ['金錢、成果和效率本身可能變成壓力', '看不到結果時容易疲憊'],
        mind: '想法務實，', pull: '腦子想盡快確認現實的結果。'},
      structure: {name: '責任與標準', short: '責任', god: '官星', question: '我這樣做對嗎？', thought: '得好好做才行',
        keywords: ['責任', '規則', '評價', '標準', '成就'],
        strong: ['重視角色與責任', '容易意識到社會標準和該做的事'],
        over: ['可能對自己審視過嚴', '容易獨自扛下責任', '可能強烈感受到被評價的壓力'],
        mind: '立標準、守標準，', pull: '「要做好」的標準會最先啟動。'},
      reflection: {name: '思考與吸收', short: '思考', god: '印星', question: '我是不是漏掉了什麼？', thought: '我是不是漏了什麼？',
        keywords: ['學習', '資訊', '直覺', '驗證', '意義'],
        strong: ['要先想清楚、理解了才能行動', '即使是一件小事也想找出意義'],
        over: ['擔心可能持續很久', '分析可能過度', '容易反覆想同一件事', '行動可能被推遲'],
        mind: '想透了再行動，', pull: '在確信之前會不斷收集和檢視資訊。'}
    },
    combo: {
      'selfDrive+expression': {title: '用自己的方式表達的人', text: '能自由決定、自由表達時最有力量。'},
      'selfDrive+reality': {title: '自己的份自己賺的人', text: '獨立性與現實感連在一起。比起依賴別人，更想親手握住結果。'},
      'selfDrive+structure': {title: '按自己的標準負責的人', text: '自己定的方向和要守的標準一起運轉。接下的事會用自己的方式做到最後。'},
      'selfDrive+reflection': {title: '獨自深挖的人', text: '自己想通了才會行動。比起別人的結論，更相信自己理解的答案。'},
      'expression+reality': {title: '把創造變成價值的人', text: '有把想法、內容、技術等表達轉化為現實價值的力量。'},
      'expression+structure': {title: '在框架裡創新的人', text: '想自由創造的心和「要做好」的標準同時存在。擅長在了解規則後再做變化。'},
      'expression+reflection': {title: '把思考化為表達的人', text: '把在腦中反覆琢磨的想法變成話語、文字和作品時最有活力。'},
      'reality+structure': {title: '用結果證明的人', text: '成果與責任朝著同一個方向。習慣用數字和結果展示自己負責的事。'},
      'reality+reflection': {title: '會計算的研究者', text: '先充分收集資訊，再把它連接到實際收益。'},
      'structure+reflection': {title: '為了不出錯而學習的人', text: '很可能非常重視準備、檢查與責任。確認完了才安心。'},
      balanced: {title: '均衡使用五個引擎的人', text: '不是某一個引擎獨大，而是根據情況調用不同的引擎。所以很難用單一的顏色來形容。'},
      'solo:selfDrive': {title: '方向先行的人', text: '不管做什麼，最先啟動的都是「我想不想要」。'},
      'solo:expression': {title: '以樂趣為燃料的人', text: '新的刺激和表達是行動的燃料。樂趣一消失，引擎也容易跟著冷卻。'},
      'solo:reality': {title: '計算結果的人', text: '開始之前，先計算實際能留下什麼。'},
      'solo:structure': {title: '守標準的人', text: '該做的事和要守的標準是思考的中心。'},
      'solo:reflection': {title: '想好了才行動的人', text: '想法會生出想法。在確信之前會不斷收集和檢視資訊。'}
    },
    tone: {
      strained: {
        expression: '不過命局整體的力量偏輕，表達傾瀉之後能量可能很快見底。記得一起照顧休息的節奏。',
        reality: '不過命局整體的力量偏輕，越追逐結果負擔越容易加重。與其一次全抓住，不如按能承受的量分批來。',
        structure: '不過命局整體的力量偏輕，責任一堆積就容易感到壓力。練習不要獨自全扛會有幫助。'
      },
      surplus: {
        selfDrive: '命局整體的力量也偏強，這個引擎太強時可能顯得固執。留一點餘裕聽聽別人的方式，能幫你保持平衡。',
        reflection: '命局整體的力量也偏強，思考容易跑在行動前面。覺得了解得差不多時，不妨先邁出一小步。'
      }
    },
    elements: {
      wood: {name: '木', words: '擴展 · 成長 · 開始'},
      fire: {name: '火', words: '表達 · 速度 · 熱情'},
      earth: {name: '土', words: '維持 · 落實 · 調和'},
      metal: {name: '金', words: '區分 · 判斷 · 整理'},
      water: {name: '水', words: '觀察 · 探索 · 思考'}
    },
    chakra: {
      crown: {name: '頂輪', theme: '意義 · 方向 · 超越'},
      thirdEye: {name: '眉心輪', theme: '洞察 · 想像 · 觀察'},
      throat: {name: '喉輪', theme: '表達 · 傳達'},
      heart: {name: '心輪', theme: '連結 · 關係 · 依戀'},
      solarPlexus: {name: '太陽神經叢輪', theme: '意志 · 自我推動 · 情緒'},
      sacral: {name: '臍輪', theme: '慾望 · 快樂 · 創造'},
      root: {name: '海底輪', theme: '穩定 · 根基 · 現實感'}
    },
    bridge: {tension: '不過，你做決定的方式說的是另一種節奏。', common: '你做決定的方式也指向同一個方向。', complement: '你做決定的方式為此補充了另一種感覺。'},
    peopleBridge: {tension: '不過，你的能量類型建議另一種方式。', common: '你的能量類型也指向同一個方向。', complement: '你的能量類型為此補充了另一種節奏。'},
    authorityHow: {
      AUTHORITY_EMOTIONAL: '重要的決定與其馬上下結論，不如等情緒的波浪過去後，確認自己是否仍想做同樣的選擇，這樣可能更適合你。',
      AUTHORITY_SACRAL: '在用頭腦找理由之前，先留意身體最先給出的 YES / NO 反應，可能更適合你。',
      AUTHORITY_SPLENIC: '不錯過那一瞬間閃過的安靜直覺，可能更適合你。',
      AUTHORITY_EGO: '確認這是不是你真心想要、也能承諾的事，可能更適合你。',
      AUTHORITY_SELF_PROJECTED: '對信任的人說出來，在自己的聲音裡聽見答案，可能更適合你。',
      AUTHORITY_MENTAL: '在不同的人和環境中交談、整理想法，可能更適合你。',
      AUTHORITY_LUNAR: '重大的決定花一個月左右的時間，多感受幾次，可能更適合你。'
    },
    typeHow: {
      TYPE_GENERATOR: '把能量用在先有回應的事情上，更能持久。',
      TYPE_MANIFESTING_GENERATOR: '回應之後快速行動，並在行動前先告知周圍的人，事情可能會更順。',
      TYPE_PROJECTOR: '與其什麼都親自硬推，不如選擇能看見你能力的環境和人，可能更適合你。',
      TYPE_MANIFESTOR: '可以先開始，但在行動前告知會受影響的人，能減少摩擦。',
      TYPE_REFLECTOR: '充分體驗人和環境之後再慢慢判斷，可能更適合你。'
    },
    peoplePull: {
      selfDrive: '面對人和工作時，也會先守住自己的方式和位置。',
      expression: '面對人和工作時，有樂趣和表達空間才能堅持得久。',
      reality: '面對人、工作和金錢時，會先看實際能留下什麼。',
      structure: '面對人和工作時，重視自己承擔的角色與承諾。',
      reflection: '面對人和工作時，充分理解之後才會敞開心扉。'
    },
    sajuDecision: {
      selfDrive: '比起別人的意見，按自己的判斷做決定時最自在。別一個人急著下結論，停一拍會更好。',
      expression: '心一動就會很快做決定。等熱度冷卻後再看一次是不是同樣的選擇會更好。',
      reality: '會計算投入與回報後再做決定。也把數字看不到的價值放上天平會更好。',
      structure: '會以對錯和該不該做為標準來決定。小心別因為等待完美答案而錯過時機。',
      reflection: '會在充分了解之後再做決定。資訊收集到八成時，先行動也是一種方法。'
    },
    work: {
      selfDrive: '在能自己掌握決定權的工作中更有力量。',
      expression: '在創作、表達、展示的工作中更有力量。',
      reality: '在成果能用數字和結果看見的工作中更有力量。',
      structure: '在角色和標準清晰的工作中更有力量。',
      reflection: '在學習、分析、深入鑽研的工作中更有力量。'
    },
    money: {
      selfDrive: '錢更願意自己掌握和管理，而不是交給別人。',
      expression: '錢容易流向體驗、樂趣和創作。',
      reality: '會仔細計算金錢的流向和效率。',
      structure: '會按計畫和原則穩定地管理錢。',
      reflection: '花錢前會充分了解和比較。'
    },
    relationship: {
      selfDrive: '在關係中，自己的空間和被尊重的感覺很重要。',
      expression: '在能一起笑、聊得來的關係裡更容易敞開心扉。',
      reality: '比起言語，更相信行動和實際的關心。',
      structure: '重視可靠、守約的關係。',
      reflection: '感到被深深理解時才會敞開心扉。'
    },
    mindDecide: {
      AUTHORITY_EMOTIONAL: '重要的決定需要時間的人',
      AUTHORITY_SACRAL: '用身體的反應做決定的人',
      AUTHORITY_SPLENIC: '憑瞬間直覺做決定的人',
      AUTHORITY_EGO: '看自己是否真心想要來做決定的人',
      AUTHORITY_SELF_PROJECTED: '邊說邊找到答案的人',
      AUTHORITY_MENTAL: '在對話中整理想法的人',
      AUTHORITY_LUNAR: '花時間慢慢做決定的人'
    },
    mindAct: {
      selfDrive: '最終按自己的方式行動的人',
      expression: '在表達中找到方向的人',
      reality: '用結果來確認的人',
      structure: '靠責任感撐下去的人',
      reflection: '理解多少就行動多少的人'
    },
    vedic: {
      kind: {emotion: '處理情緒的方式', instinct: '本能反應的方式', frame: '看世界的基本框架'},
      emotion: {fire: '情緒來得快，也去得快。', earth: '會慢慢地、穩定地消化情緒。', air: '會用語言和思考整理情緒。', water: '會深深地、長久地感受和懷抱情緒。'},
      instinct: {
        Ketu: '有從熟悉事物中退後一步、看清本質的本能。', Venus: '有追隨美與舒適而反應的本能。',
        Sun: '有想把自己的位置弄清楚的本能。', Moon: '有先對氣氛和人心做出反應的本能。',
        Mars: '有透過碰撞來確認的本能。', Rahu: '有被新鮮陌生事物吸引的本能。',
        Jupiter: '有尋找意義與學習而反應的本能。', Saturn: '有謹慎堅守、靜觀其變的本能。',
        Mercury: '有收集並連結資訊而反應的本能。'
      },
      frame: {fire: '傾向把世界看成挑戰與可能性的舞台。', earth: '傾向把世界看成一步步累積的現實。', air: '傾向把世界看成連結與想法的網絡。', water: '傾向把世界看成情感與關係的流動。'}
    },
    nyang: {
      selfDrive: '你腦子裡有一個方向盤喵。偶爾坐坐副駕駛也不錯哦。',
      expression: '樂趣就是你的燃料喵。無聊的事切成小塊，像玩遊戲一樣做吧。',
      reality: '算得很快的腦袋喵。就算看起來沒什麼收益，也留一件讓你開心的事吧。',
      structure: '標準很紮實的腦袋喵。今天，80 分就夠了。',
      reflection: '想得很深的腦袋喵。不用等全都明白，懂一半時就邁出一步吧。'
    },
    cta: [
      {id: 'love', q: '這個結構在戀愛中會怎樣表現？', label: '查看戀愛解讀'},
      {id: 'compat', q: '我和什麼樣的人在一起會自在？', label: '查看合盤'},
      {id: 'wealth', q: '用這個結構怎樣賺錢？', label: '查看財運與事業'},
      {id: 'luck', q: '現在的運勢正在加強哪個引擎？', label: '查看大運與流年'},
      {id: 'hd', q: '想看完整的人類圖？', label: '查看人類圖詳情'}
    ],
    join: ' · '
  };

  var LANG_ALIAS = {zh: 'zh-CN', 'zh-cn': 'zh-CN', 'zh-hans': 'zh-CN', 'zh-tw': 'zh-TW', 'zh-hant': 'zh-TW', 'zh-hk': 'zh-TW'};
  function resolveLocale(lang) {
    var raw = String(lang || '').trim();
    if (COPY[raw]) return raw;
    var lower = raw.toLowerCase();
    if (LANG_ALIAS[lower]) return LANG_ALIAS[lower];
    var base = lower.split('-')[0];
    if (COPY[base]) return base;
    if (LANG_ALIAS[base]) return LANG_ALIAS[base];
    return 'en';
  }

  function fill(tpl, vars) {
    return String(tpl).replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] != null ? String(vars[k]) : m; });
  }

  function hdCopy() {
    if (root.DestinyAnatomyHdCopy) return root.DestinyAnatomyHdCopy;
    if (typeof require === 'function') { try { return require('./hd-copy.generated.js'); } catch (e) { /* 셸에선 전역만 쓴다 */ } }
    return null;
  }

  function pickLocale(map, L) {
    if (!map) return '';
    return map[L] || map.en || '';
  }

  /* 모델의 결정론 키를 문장으로 바꿔 §28 문장 필드와 render 용 model.text 를 채운다. 데이터가 없는 층은 문장을 만들지 않는다. */
  function compose(model, lang) {
    if (!model || !model.saju) return model;
    var L = resolveLocale(lang);
    var C = COPY[L];
    var A = C.axes;
    var s = model.saju;
    var top = s.balanced ? s.ranked[0] : s.dominantEngines[0];
    var second = model.fusion.mindPattern.second;
    var combo = C.combo[s.combo.key] || C.combo.balanced;
    var toneNote = '';
    if (s.combo.tone !== 'base' && C.tone[s.combo.tone]) toneNote = C.tone[s.combo.tone][top] || '';

    s.brainHeadline = s.balanced ? C.ui.brainHeadlineBalanced : fill(C.ui.brainHeadline, {name: A[top].name});
    s.brainDescription = combo.title + ' — ' + combo.text + (toneNote ? ' ' + toneNote : '');

    var hdL = LOCALES.indexOf(L) >= 0 ? L : 'en';
    var HD = hdCopy();
    var hd = model.humanDesign;
    var hdText = null;
    if (hd && hd.available && HD) {
      var t = HD.type[hd.type], au = HD.authority[hd.authority];
      hdText = {
        typeName: t ? pickLocale(t.name, hdL) : '',
        typeSummary: t ? pickLocale(t.summary, hdL) : '',
        strategy: HD.strategy[hd.strategy] ? pickLocale(HD.strategy[hd.strategy], hdL) : '',
        authorityName: au ? pickLocale(au.name, hdL) : '',
        authoritySummary: au ? pickLocale(au.summary, hdL) : '',
        authorityHow: C.authorityHow[hd.authority] || '',
        definitionName: HD.definition[hd.definition] ? pickLocale(HD.definition[hd.definition], hdL) : '',
        profile: hd.profile,
        centers: model.humanDesign.definedCenters.concat(model.humanDesign.undefinedCenters).map(function (id) {
          var c = HD.center[id];
          return {id: id, defined: hd.definedCenters.indexOf(id) >= 0, name: c ? pickLocale(c.name, hdL) : id, role: c ? pickLocale(c.role, hdL) : ''};
        })
      };
    }

    var insights = model.fusion.insights.map(function (ins) {
      var body;
      if (ins.slot === 'thinking') body = combo.text + (toneNote ? ' ' + toneNote : '');
      else if (ins.slot === 'decision') body = ins.badge === 'fusion' ? A[ins.axis].pull + ' ' + C.bridge[ins.relation] + ' ' + C.authorityHow[ins.authority] : C.sajuDecision[ins.axis];
      else body = ins.badge === 'fusion' ? C.peoplePull[ins.axis] + ' ' + C.peopleBridge[ins.relation] + ' ' + C.typeHow[ins.type] : C.peoplePull[ins.axis] + ' ' + C.relationship[ins.axis];
      return {slot: ins.slot, badge: ins.badge, badgeLabel: C.ui.badge[ins.badge], title: C.ui.insightTitle[ins.slot], body: body, relation: ins.relation || null};
    });

    var vedic = model.vedic;
    var vedicText = vedic && vedic.available ? vedic.traits.map(function (tr) {
      return {kind: tr.kind, title: C.vedic.kind[tr.kind], body: C.vedic[tr.kind][tr.key] || ''};
    }).filter(function (x) { return x.body; }) : [];

    var mindHead = A[top].mind;
    var mindTail = hd && hd.available && C.mindDecide[hd.authority] ? C.mindDecide[hd.authority] : C.mindAct[second || top];
    var sep = L === 'en' ? ' ' : (L === 'ko' ? ' ' : '');
    var mindLine = mindHead + sep + mindTail;
    if (L === 'en') mindLine = 'Someone who is ' + mindHead.charAt(0).toLowerCase() + mindHead.slice(1) + ' ' + mindTail;

    var thoughts = s.topThoughts.map(function (axis) { return {axis: axis, name: A[axis].name, line: A[axis].thought}; });
    var allThoughts = s.ranked.map(function (axis) { return {axis: axis, name: A[axis].name, line: A[axis].thought, top: s.topThoughts.indexOf(axis) >= 0}; });
    var seq = s.ranked.slice(0, 3).map(function (a) { return A[a].short; });

    var el = model.elementLayer;
    var elementsText = {
      items: ['wood', 'fire', 'earth', 'metal', 'water'].map(function (e) { return {id: e, name: C.elements[e].name, words: C.elements[e].words, ratio: el.ratios[e]}; }),
      dominant: el.dominant ? fill(C.ui.elementDominant, {name: C.elements[el.dominant].name, words: C.elements[el.dominant].words}) : '',
      missing: el.missing.map(function (e) { return fill(C.ui.elementMissing, {name: C.elements[e].name}); })
    };

    var keywords = [];
    s.ranked.slice(0, 2).forEach(function (a) { keywords.push(A[a].keywords[0], A[a].keywords[1]); });
    if (hdText && hdText.typeName) keywords.push(hdText.typeName);
    if (hdText && hdText.authorityName) keywords.push(hdText.authorityName);

    var coreAxes = s.balanced ? s.ranked.slice(0, 3) : s.dominantEngines;
    model.fusion.headline = coreAxes.map(function (a) { return A[a].short; }).join(' + ');
    model.fusion.summary = mindLine;
    model.share.headline = mindLine;
    model.share.keywords = keywords.slice(0, 6);

    var summaryRows = [{id: 'thinking', label: C.ui.row.thinking, value: coreAxes.map(function (a) { return A[a].name; }).join(C.join)}];
    if (hdText) {
      summaryRows.push({id: 'decision', label: C.ui.row.decision, value: hdText.authorityName});
      summaryRows.push({id: 'energy', label: C.ui.row.energy, value: hdText.typeName});
    }
    var emo = vedicText.filter(function (v) { return v.kind === 'emotion'; })[0];
    if (emo) summaryRows.push({id: 'emotion', label: C.ui.row.emotion, value: emo.body});
    summaryRows.push({id: 'work', label: C.ui.row.work, value: C.work[top]});
    summaryRows.push({id: 'money', label: C.ui.row.money, value: C.money[model.fusion.moneyPattern.split('|')[1]] || C.money[top]});
    summaryRows.push({id: 'relationship', label: C.ui.row.relationship, value: C.relationship[second || top]});

    model.locale = L;
    model.text = {
      ui: C.ui,
      hero: C.hero,
      thoughts: thoughts,
      allThoughts: allThoughts,
      sequence: fill(C.ui.sequence, {a: seq[0], b: seq[1], c: seq[2]}),
      comboTitle: combo.title,
      comboText: combo.text,
      toneNote: toneNote,
      engines: s.ranked.map(function (axis) {
        var e = s.engines[axis], a = A[axis];
        return {axis: axis, name: a.name, god: a.god, question: a.question, keywords: a.keywords, strong: a.strong, over: a.over,
          overloaded: s.overloadPatterns.indexOf(axis) >= 0, score: e.score, level: e.level, levelLabel: C.ui.level[e.level], source: e.source};
      }),
      elements: elementsText,
      chakra: model.chakra.items.map(function (c) {
        return {id: c.id, name: C.chakra[c.id].name, theme: C.chakra[c.id].theme, emphasis: c.emphasis, level: c.level, levelLabel: C.ui.chakraLevel[c.level]};
      }),
      hd: hdText,
      vedic: vedicText,
      insights: insights,
      mindLine: mindLine,
      summary: summaryRows,
      nyang: C.nyang[top],
      cta: C.cta
    };
    return model;
  }

  var api = {LOCALES: LOCALES, AXES: AXES, COPY: COPY, resolveLocale: resolveLocale, compose: compose};
  root.DestinyAnatomyCopy = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
