(function (window) {
  'use strict';

  var topics = {
    daily: {
      label: '오늘의 흐름',
      description: '오늘 나에게 들어오는 분위기와 조심할 흐름을 살펴봐요.'
    },
    love: {
      label: '연애/인연',
      description: '상대와의 거리감, 마음의 흐름, 오늘의 인연운을 살펴봐요.'
    },
    money_work: {
      label: '금전/일',
      description: '돈, 일, 결과, 선택의 흐름을 현실적으로 살펴봐요.'
    },
    relationship: {
      label: '인간관계',
      description: '사람 사이에서 반복되는 패턴과 오늘의 거리감을 살펴봐요.'
    },
    mind: {
      label: '마음/심리',
      description: '요즘 마음이 어디에 묶여 있는지 부드럽게 살펴봐요.'
    },
    decision: {
      label: '결정/선택',
      description: '지금 고민하는 선택에서 무엇을 먼저 봐야 할지 살펴봐요.'
    }
  };

  var categories = {
    saju: { label: '사주', description: '기질, 오행, 일과 돈의 선택 패턴을 중심으로 읽어요.' },
    ziwei: { label: '자미두수', description: '명궁과 삶의 역할, 일·관계의 배치를 중심으로 읽어요.' },
    vedic: { label: '베다점', description: '달의 리듬과 나크샤트라가 보여주는 내면의 흐름을 읽어요.' },
    sukuyo: { label: '숙요점', description: '관계 거리감과 감정 반응의 패턴을 중심으로 읽어요.' },
    astrology: { label: '점성술', description: '태양·달·행성의 상징에서 감정과 표현 방식을 읽어요.' },
    tarot: { label: '타로', description: '서버가 뽑은 카드의 배열로 지금의 선택을 정리해요.' }
  };

  var categoryResults = {
    saju: {
      coreReading: '사주는 태어난 계절과 오행, 일간과 십성의 균형을 바탕으로 지금 반복되는 선택 습관을 살펴봐요. 오늘은 한꺼번에 많은 일을 벌이기보다 이미 가진 힘을 어디에 모을지 정할수록 흐름이 또렷해집니다. 강한 기운은 추진력이 되지만 과해지면 서두름으로 나타날 수 있으니, 가장 중요한 한 가지를 먼저 끝내는 편이 좋아요.'
    },
    ziwei: {
      coreReading: '자미두수는 명궁과 주요 궁의 배치를 중심으로 삶에서 자주 맡게 되는 역할과 관계의 패턴을 읽어요. 생시가 확인된 경우에는 명반의 근거를 따라 현재의 강점과 주의점을 구체적으로 연결하고, 생시를 모르는 경우에는 정밀 명반을 단정하지 않은 채 확인 가능한 범위만 안내해요.'
    },
    vedic: {
      coreReading: '베다점은 행성과 달의 리듬을 통해 익숙한 반응과 성장 과제를 살펴봐요. 생시와 출생지가 확인되면 라그나와 나크샤트라 등 계산된 근거를 중심으로 해석하고, 정보가 부족한 경우에는 계산할 수 없는 항목을 만들어내지 않아요. 오늘은 반복되는 감정의 속도를 알아차리는 일이 현실적인 출발점이에요.'
    },
    sukuyo: {
      coreReading: '숙요점은 본명숙과 관계의 거리감을 중심으로 사람 사이에서 가까워지고 물러나는 리듬을 읽어요. 상대의 마음을 대신 확정하기보다 내가 어떤 상황에서 먼저 다가가고, 언제 지나치게 참는지를 살펴봅니다. 오늘은 관계를 지키기 위해 필요한 간격을 솔직하게 정하는 것이 중요해요.'
    },
    astrology: {
      coreReading: '서양 점성술은 태양과 달, 행성의 배치를 바탕으로 감정과 표현, 선택의 패턴을 읽어요. 생시와 출생지가 확인되면 상승궁과 하우스를 계산해 더 구체적으로 살피고, 모르는 경우에는 해당 항목을 단정하지 않아요. 오늘은 마음의 속도와 행동의 속도를 맞추는 데 초점을 두면 좋아요.'
    },
    tarot: {
      coreReading: '타로는 서버에서 실제로 선택한 카드와 배열만 사용해 지금의 상황과 선택지를 이야기처럼 연결해요. 카드 한 장의 뜻을 단정적으로 붙이기보다, 카드 사이의 흐름이 보여주는 감정과 행동의 순서를 살펴봅니다. 미래를 확정하기보다 지금 바꿀 수 있는 작은 선택을 찾는 데 집중해요.'
    }
  };

  var modes = {
    yeoni: {
      label: '연이',
      title: '꽃돼지 연이가 다정하게 안아줘요',
      description: '마음을 먼저 포근하게 어루만지고, 오늘의 흐름을 부드럽게 알려줘요.',
      loading: '연이가 달빛 조각을 모으는 중이에요…',
      button: '연이에게 오늘의 흐름 물어보기',
      image: '/images/fortune-tea-house/flower-pig-honey-hug.webp',
      alt: '연이 모드의 꽃돼지 캐릭터'
    },
    neo: {
      label: '네오',
      title: '팩폭 전략실 네오가 시크하게 짚어줘요',
      description: '괜히 돌려 말하지 않고, 지금 필요한 포인트를 차분하게 알려줘요.',
      loading: '네오가 별의 흐름을 정리하는 중…',
      button: '네오에게 오늘의 핵심 물어보기',
      image: '/neo-operation-room/sprites/transparent/neo-transparent-s1-f01.webp',
      alt: '네오 모드의 팩폭 전략실 인간형 캐릭터'
    }
  };

  var sharedCore = {
    innerState: '겉으로는 괜찮은 척하고 있지만, 마음 한쪽에서는 이미 무엇을 선택해야 할지 조용히 답을 만들고 있어요. 다만 그 답을 바로 실행하기보다 누군가의 확인을 기다리느라 오늘의 에너지가 조금씩 새고 있는 모습에 가까워요. 지금 필요한 건 마음을 더 몰아붙이는 일이 아니라, 내가 정말 지키고 싶은 기준을 한 문장으로 정리하는 일이에요.',
    cautionPattern: '상대의 반응이나 아직 오지 않은 결과를 여러 번 상상하면서, 지금 할 수 있는 작은 행동까지 미루지 않도록 해요. 확인할 수 없는 신호를 결론처럼 받아들이면 마음의 속도만 빨라질 수 있어요.',
    luckyAction: '오늘 안에 미뤄둔 일 하나를 15분만 시작하고, 끝난 뒤의 기분을 기록해보세요.',
    cta: {
      label: '다른 상담 체계로 보기',
      reason: '오늘의 흐름을 장기적인 패턴과 연결해 보고 싶다면, 다음 상담에서 더 세밀하게 살펴볼 수 있어요.'
    }
  };

  var results = {
    daily: {
      coreReading: '오늘의 흐름은 빠르게 넓히기보다, 이미 시작한 일을 한 번 정돈할 때 힘이 살아나는 쪽에 가까워요. 사주에서 보이는 오늘의 기운은 마음속 생각을 행동으로 옮기게 만들지만, 한꺼번에 여러 방향으로 움직이면 집중력이 쉽게 흩어질 수 있어요. 오늘은 새로운 약속을 많이 만들기보다 가장 중요한 한 가지를 고르고, 그 일을 눈에 보이는 첫 단계까지 쪼개는 것이 좋아요. 오전에는 판단을 짧게 내리고, 오후에는 정리와 확인에 시간을 쓰면 흐름이 한결 편안해져요.',
      topicAdvice: '오늘 누군가에게 답을 보내야 한다면 길게 설명하기보다 핵심을 먼저 전해보세요. 해야 할 일이 많아 보일수록 우선순위를 세 개가 아니라 하나로 좁히는 것이 오히려 다음 움직임을 빠르게 만들어요. 작은 완료 하나가 오늘의 마음을 다시 안정시키는 귀인 역할을 해줄 거예요.'
    },
    love: {
      coreReading: '오늘의 인연 흐름은 감정의 크기보다 서로의 속도를 어떻게 맞추는지가 더 중요해 보여요. 끌림이 없는 날이라기보다, 마음이 앞서서 상대의 짧은 반응에 큰 의미를 붙이기 쉬운 날에 가까워요. 숙요의 관계 흐름은 가까워지고 싶은 마음과 잠시 거리를 두고 싶은 마음이 함께 움직이는 모습을 보여줘요. 이럴 때는 마음을 증명하려 하기보다, 상대가 편안하게 답할 수 있는 여백을 남기는 편이 관계의 온도를 지켜줘요.',
      topicAdvice: '연락을 기다리고 있다면 오늘은 한 번 보낸 메시지를 다시 해석하는 시간을 줄여보세요. 먼저 연락할 때는 질문을 여러 개 담기보다 자연스럽게 이어갈 수 있는 한 문장만 건네는 것이 좋아요. 상대의 마음을 대신 결론 내리기보다, 내가 원하는 관계의 속도를 솔직하게 살피는 것이 오늘의 중요한 선택이에요.'
    },
    money_work: {
      coreReading: '돈과 일의 흐름은 단번에 크게 벌리는 승부보다, 이미 가진 능력을 반복 가능한 방식으로 정리할 때 살아나요. 사주의 재성과 관성이 보여주는 오늘의 포인트는 더 많은 일을 맡는 데 있지 않고, 결과를 만드는 과정을 눈에 보이게 만드는 데 있어요. 자미두수의 관록궁 흐름도 주변의 기대에 맞추느라 일의 기준을 계속 바꾸기보다, 이번 주에 끝낼 수 있는 범위를 분명히 잡는 쪽을 지지해요.',
      topicAdvice: '오늘은 새로운 수익 기회를 찾기 전에 현재 하고 있는 일에서 시간을 가장 많이 잡아먹는 단계를 찾아보세요. 견적, 일정, 업무 요청처럼 반복되는 내용을 하나의 양식으로 정리하면 작은 여유가 생겨요. 확장하기 전에 새는 시간을 막는 것이 오늘의 현실적인 승부수예요.'
    },
    relationship: {
      coreReading: '인간관계에서 오늘 중요한 건 모두에게 좋은 사람이 되는 일이 아니라, 누구에게 어느 정도의 에너지를 쓸지 정하는 일이에요. 반복해서 설명하고 대신 책임지려는 습관이 있다면, 관계의 균형이 한쪽으로 기울었다는 신호일 수 있어요. 사주의 십성 흐름과 숙요의 거리감은 지금 가까워질 사람과 잠시 속도를 늦출 사람을 구분할 필요가 있다고 말해요.',
      topicAdvice: '오늘 부탁을 받았을 때 바로 대답하지 말고 “확인해보고 다시 말할게요”라는 시간을 먼저 가져보세요. 거절이 어렵다면 가능한 범위와 어려운 범위를 나누어 말하는 것부터 시작하면 돼요. 관계를 지키는 가장 부드러운 방법이 언제나 더 많이 해주는 것은 아니에요.'
    },
    mind: {
      coreReading: '지금 마음의 피로는 한 가지 큰 사건보다, 끝나지 않은 생각을 계속 들고 있는 데서 커지고 있어요. 베다점의 달 리듬과 타로의 상징은 감정이 약해서 흔들리는 것이 아니라, 쉬는 동안에도 다음 일을 대비하고 있는 상태에 가깝다는 점을 보여줘요. 회복을 위해 더 완벽한 계획을 세우기보다, 머릿속에서 반복되는 문장을 잠시 밖으로 꺼내는 것이 먼저예요.',
      topicAdvice: '오늘 자기 전에 걱정의 답을 찾으려 하지 말고, 내일 확인할 일과 오늘은 내려놓을 일을 나눠 적어보세요. 감정이 정리되지 않아도 행동의 순서가 정리되면 마음은 조금 가벼워질 수 있어요. 필요한 경우 가까운 사람이나 전문가에게 도움을 요청하는 것도 충분히 현실적인 선택이에요.'
    },
    decision: {
      coreReading: '결정 앞에서 망설이는 이유는 선택지가 너무 많아서라기보다, 한 번 고른 뒤 돌아갈 수 없을까 봐 마음이 안전한 답을 찾고 있기 때문일 수 있어요. 오늘의 흐름은 완벽한 결론을 기다리기보다 되돌릴 수 있는 작은 실험을 먼저 해보라고 말해요. 자미두수의 명궁과 타로의 상징이 함께 가리키는 방향도, 생각을 더 오래 늘이기보다 확인 가능한 행동 하나를 통해 판단의 근거를 만드는 쪽이에요.',
      topicAdvice: '두 선택지 중 하나를 바로 포기하기 어렵다면 48시간 안에 시험해볼 수 있는 최소 행동을 각각 적어보세요. 비용과 시간이 적게 드는 쪽부터 확인하면, 머릿속의 불안이 실제 정보로 바뀌어요. 오늘의 귀인 행동은 정답을 맞히는 것이 아니라 내가 무엇을 중요하게 여기는지 직접 확인하는 일이에요.'
    }
  };

  var usageStates = {
    'mock-error': { label: 'Mock error', copy: 'Mock 상담 결과를 준비하는 중 문제가 생기는 상태입니다.', canGenerate: true, kind: 'mock-error' },
    'guest-available': { label: '비로그인 첫 상담 가능', copy: '첫 1회는 로그인 없이 무료로 볼 수 있어요.', canGenerate: true, kind: 'guest' },
    'guest-used': { label: '비로그인 무료 사용 완료', copy: '첫 무료 상담을 이미 사용했어요. 로그인하면 하루 최대 3번까지 연이와 네오에게 물어볼 수 있어요.', canGenerate: false, kind: 'guest' },
    'auth-3': { label: '로그인 무료 최대 3회', copy: '오늘 남은 무료 상담 3회', canGenerate: true, kind: 'auth', freeRemaining: 3 },
    'auth-2': { label: '로그인 무료 2회', copy: '오늘 남은 무료 상담 2회', canGenerate: true, kind: 'auth', freeRemaining: 2 },
    'auth-1': { label: '로그인 무료 1회', copy: '오늘 남은 무료 상담 1회', canGenerate: true, kind: 'auth', freeRemaining: 1 },
    'auth-credit-5': { label: '무료 소진 + 대화권 5회', copy: '오늘의 무료 상담은 모두 사용했어요. 보유 대화권 5회 중 1회를 사용할 수 있어요.', canGenerate: true, kind: 'credit', creditRemaining: 5 },
    'auth-credit-3': { label: '대화권 3회', copy: '무료 상담을 모두 사용했어요. 보유 대화권 3회로 계속 물어볼 수 있어요.', canGenerate: true, kind: 'credit', creditRemaining: 3 },
    'auth-credit-10': { label: '대화권 10회', copy: '무료 상담을 모두 사용했어요. 보유 대화권 10회로 계속 물어볼 수 있어요.', canGenerate: true, kind: 'credit', creditRemaining: 10 },
    'auth-exhausted': { label: '무료·대화권 소진', copy: '오늘 이용 가능한 무료 상담을 모두 사용했어요. 대화권을 구매하면 더 물어볼 수 있어요.', canGenerate: false, kind: 'exhausted' }
  };

  /*
   * Browser projection of src/features/guardian-fortune/{types,constants,mocks,policy}.ts.
   * The static home cannot import TypeScript directly, so this projection is kept
   * serializable and is consumed by guardian-fortune-home.js during the mock stage.
   * It contains no API, LLM, payment, or snapshot implementation.
   */
  var contract = {
    version: 'guardian-fortune.v1',
    featureKey: 'guardian_fortune',
    featureFlags: {
      ui: 'ENABLE_GUARDIAN_FORTUNE_UI',
      mainUi: 'ENABLE_MAIN_GUARDIAN_FORTUNE',
      mockFlow: 'ENABLE_GUARDIAN_FORTUNE_MOCK_FLOW',
      api: 'ENABLE_GUARDIAN_FORTUNE_API',
      share: 'ENABLE_GUARDIAN_FORTUNE_SHARE'
    },
    copy: {
      limitButton: '오늘은 더 물어보려면 대화권이 필요해요',
      validationMissingBirthDate: '생년월일을 알려주면 오늘의 흐름을 더 구체적으로 볼 수 있어요.',
      validationBirthDateFormat: '생년월일 형식을 한 번만 확인해 주세요.',
      validationConcernLength: '고민 한 줄은 120자 안에서 적어주세요.',
      limitError: '오늘 사용할 수 있는 상담을 모두 사용했어요. 아래 안내에서 다음 방법을 확인해 주세요.',
      mockError: 'Mock 상담 결과를 준비하는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.',
      mockErrorAnnouncement: 'Mock 상담 결과를 준비하지 못했어요.',
      mockSuccessAnnouncement: 'mock 상담 결과가 준비되었어요.',
      shareToast: '공유 기능은 다음 단계에서 연결될 예정이에요.',
      shareAnnouncement: '공유 기능은 아직 mock 상태예요.',
      ctaMockToast: '이 안내 버튼은 미리보기 상태예요. 실제 이동은 준비된 경로에서만 진행됩니다.',
      guestCta: {
        title: '내 흐름을 더 이어서 보고 싶다면',
        description: '로그인하면 하루 최대 3번까지 연이와 네오에게 물어볼 수 있어요.',
        primary: '가입하고 하루 최대 3회 보기',
        secondary: '로그인하고 이어서 보기'
      },
      exhaustedCta: {
        title: '다른 상담 체계로 이어서 보기',
        description: '대화권을 구매하면 연이와 네오에게 다른 분야도 더 물어볼 수 있어요.',
        primary: '3회 대화권 보기',
        secondary: '10회 대화권 보기',
        tertiary: '프리미엄 상담 보러가기'
      },
      resultOpening: {
        yeoni: '연이가 보기엔, 오늘 너는 괜찮은 척하면서도 마음속으로는 이미 중요한 답을 거의 정해둔 상태에 가까워 보여.',
        neo: '네오가 보기엔, 지금 문제는 운이 없는 게 아니라 이미 알고 있는 답을 확인받고 싶어 한다는 점이야.'
      },
      resultModeSuffix: '의 mock 상담 결과',
      resultTitleSuffix: '을 읽어봤어요'
    },
    products: [
      {
        productId: 'guardian_fortune_chat_3',
        productName: '달빛 귀인 대화권 3회',
        productType: 'guardian_fortune_conversation_credit',
        priceKrw: 10000,
        creditAmount: 3,
        badge: '가볍게 더 보기',
        allowedPurchaseChannels: ['pg'],
        blockedPurchaseChannels: ['monthly_membership_payment', 'pass', 'family_pass', 'free_pass', 'event_pass', 'credit', 'conversation_credit', 'entitlement', 'price_coverage']
      },
      {
        productId: 'guardian_fortune_chat_10',
        productName: '달빛 귀인 대화권 10회',
        productType: 'guardian_fortune_conversation_credit',
        priceKrw: 30000,
        creditAmount: 10,
        badge: '가장 합리적',
        allowedPurchaseChannels: ['pg'],
        blockedPurchaseChannels: ['monthly_membership_payment', 'pass', 'family_pass', 'free_pass', 'event_pass', 'credit', 'conversation_credit', 'entitlement', 'price_coverage']
      }
    ],
    purchasePolicy: {
      v1OnlyPg: true,
      blockPassBasedPurchase: true,
      blockFamilyPassPurchase: true,
      blockPriceCoveragePurchase: true,
      blockCreditToCreditPurchase: true
    }
  };

  window.CDGuardianFortuneMock = {
    contractVersion: contract.version,
    featureKey: contract.featureKey,
    featureFlags: contract.featureFlags,
    copy: contract.copy,
    products: contract.products,
    purchasePolicy: contract.purchasePolicy,
    modes: modes,
    topics: topics,
    categories: categories,
    categoryResults: categoryResults,
    results: results,
    sharedCore: sharedCore,
    usageStates: usageStates
  };
  window.CDGuardianFortuneContract = window.CDGuardianFortuneMock;
})(window);
