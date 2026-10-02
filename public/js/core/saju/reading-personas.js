/* Display-only saju reading. No calculation, access checks, storage of results, or requests. */
(function (root) {
  'use strict';
  var elements = ['wood', 'fire', 'earth', 'metal', 'water'];
  var gods = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];
  var copy = {
    ko: {
      yeon: '연이', neo: '네오', garden: '연이의 달빛 사주', room: '네오의 달빛 전략실',
      same: '당신의 기질과 삶의 흐름을 차분히 읽습니다. 원하는 상담자를 선택해 주세요.',
      compareNeo: '네오 상담으로 전환하기', compareYeon: '연이 상담으로 전환하기',
      observe: '연이가 발견한 단서', life: '생활에서 만나는 모습', practice: '오늘의 작은 실천', diagnosis: '네오의 진단', basis: '계산 근거', action: '행동 기준',
      element: '오행의 분포', temperament: '타고난 기질', ten: '십성으로 읽는 역할', climate: '조후 · 계절의 감각', strength: '억부 · 힘을 쓰는 방식', flow: '현재 흐름', letter: '마지막으로 건네는 말',
      names: ['목(木)', '화(火)', '토(土)', '금(金)', '수(水)'],
      traits: ['새 일을 시작하고 방향을 넓혀 가는 힘', '생각과 감정을 밖으로 표현하는 힘', '관계와 일을 안정적으로 이어 가는 힘', '기준을 세우고 불필요한 것을 정리하는 힘', '정보를 살피고 상황에 맞춰 움직이는 힘'],
      scenes: ['관심사가 많아 여러 일을 시작할 수 있어요. 끝맺을 자리를 남겨두면 성장의 힘이 더 잘 쓰입니다.', '대화에 생기를 더할 수 있어요. 마음이 앞설 때는 상대가 답할 틈도 함께 남겨보세요.', '익숙한 역할을 지키는 데 마음이 놓일 수 있어요. 다른 사람의 몫까지 떠안고 있는지도 살펴보세요.', '모호한 상황에서 기준을 찾을 수 있어요. 기준이 너무 촘촘해지면 나와 타인의 여유가 줄기도 합니다.', '쉽게 지나치는 변화를 알아차릴 수 있어요. 생각이 길어질 때는 작은 실행으로 확인해 보세요.'],
      actions: ['새 일을 더하기 전에 진행 중인 일 하나를 마무리해 보세요.', '중요한 말을 전한 뒤에는 상대의 반응을 기다려 보세요.', '이번 주 맡은 일에서 내가 책임질 범위를 한 줄로 적어 보세요.', '꼭 지킬 기준 하나와 유연하게 바꿀 기준 하나를 나눠 보세요.', '더 알아볼 것과 지금 시험해 볼 것을 하나씩 정해 보세요.'],
      rules: ['목표와 마감이 정해졌을 때 추진하세요. 시작만 늘어난다면 새 과제부터 줄이세요.', '전달할 내용과 상대의 여유가 맞을 때 표현하세요. 감정이 앞서면 답을 재촉하지 마세요.', '책임과 자원이 맞을 때 맡으세요. 내 몫이 계속 늘어난다면 범위를 다시 합의하세요.', '기준이 목적에 도움이 될 때 적용하세요. 완벽함 때문에 멈춘다면 최소 조건부터 정하세요.', '확인할 질문이 분명할 때 조사하세요. 정보만 쌓인다면 작은 시험의 기한을 정하세요.'],
      godNames: ['비견 · 자기 기준', '겁재 · 경쟁과 협력', '식신 · 꾸준한 표현', '상관 · 질문과 개선', '편재 · 기회와 자원', '정재 · 관리와 축적', '편관 · 압박과 대응', '정관 · 책임과 질서', '편인 · 다른 관점', '정인 · 학습과 지지'],
      godTraits: ["자율적으로 방향을 정하려는 경향", "협력과 경쟁에서 힘을 얻는 경향", "반복하며 표현을 다듬는 경향", "익숙한 규칙을 검토하는 경향", "여러 기회를 연결하려는 경향", "약속과 자원을 꾸준히 관리하는 경향", "부담이 있는 과제에 집중하는 경향", "역할과 기준을 중시하는 경향", "낯선 관점을 깊이 살피는 경향", "배움과 지원을 통해 준비하는 경향"],
      godLife: ['스스로 결정할 때 편안할 수 있어요. 다른 의견도 한 번 들어보세요.', '다른 사람과 나란히 달릴 때 힘이 날 수 있어요. 비교가 소모로 이어지는지도 살펴보세요.', '익숙한 일을 꾸준히 표현하고 다듬는 데 강점이 있을 수 있어요.', '당연한 규칙에도 질문을 던질 수 있어요. 바꾸려는 이유를 먼저 설명해 보세요.', '여러 기회를 연결하는 데 관심이 갈 수 있어요. 감당할 수 있는 범위를 함께 살펴보세요.', '작은 수입과 약속을 지키며 안정감을 얻을 수 있어요.', '어려운 과제에서 집중력이 살아날 수 있어요. 회복할 시간도 일정에 넣어보세요.', '역할과 기준이 분명할 때 편안할 수 있어요. 기준이 바뀌는 상황도 연습해 보세요.', '익숙하지 않은 관점을 깊이 살필 수 있어요. 생각을 현실에서 확인할 기회를 만들어 보세요.', '배우거나 도움을 주고받으며 힘을 얻을 수 있어요. 배운 것을 작게 써보세요.'],
      godRules: ['내 결정과 공동 결정을 구분하고, 협의가 필요한 일에는 의견을 확인하세요.', '경쟁 전에 비용과 역할을 합의하세요. 비교가 목표를 바꾸면 잠시 멈추세요.', '반복할 수 있는 분량으로 시작하세요. 완성된 결과를 기준으로 다음 단계를 정하세요.', '문제를 지적할 때 대안을 함께 제시하세요. 상대를 평가하는 말은 빼세요.', '기회마다 필요한 시간과 손실 한도를 적으세요. 범위를 넘으면 보류하세요.', '수입·지출과 약속을 기록하세요. 안정 때문에 필요한 변화까지 미루지는 마세요.', '압박을 감당할 자원부터 확인하세요. 수면과 회복이 무너지면 일을 나누세요.', '책임 범위를 먼저 확인하세요. 규칙이 목적과 어긋나면 근거를 들고 조정하세요.', '직관은 가설로 두고 실제 사례로 확인하세요. 근거 없이 큰 결정을 내리지 마세요.', '배운 내용 하나를 직접 적용하세요. 도움을 받더라도 최종 선택은 점검하세요.'],
      distribution: '월지 가중치를 포함한 기존 계산 비율입니다. 많고 적음은 우열이나 성공 확률이 아닙니다.',
      dominant: '{element} {value}%가 상대적으로 두드러집니다. {trait}을 살펴볼 단서예요.',
      balanced: '가장 큰 비율이 여러 오행에 걸쳐 있습니다. 하나의 성향으로만 묶기보다 상황에 따라 달라지는 힘을 살펴보세요.',
      dayBasis: '일간 {stem} · 일지 {branch}. 일간은 나를 읽는 기준 글자이며, 여기서는 {element}의 상징을 생활 언어로 풉니다.',
      godBasis: '현재 명식에서 {name}이 {count}곳에 나타납니다. 일간과 다른 글자의 관계를 센 값이며 성격의 확정 진단은 아닙니다.',
      unknown: '출생시간 미상: 정오를 대입한 참고 계산입니다. 시주와 시간에 영향을 받는 오행 비율·강약·시기 해석은 확정할 수 없어요.',
      cold: '차가운 쪽의 조후 신호입니다. 활동을 시작하기 전 몸과 마음이 준비될 시간을 살펴보세요.',
      hot: '따뜻한 쪽의 조후 신호입니다. 속도를 높일 때 회복할 간격도 함께 살펴보세요.',
      neutral: '온도 점수가 가운데에 있습니다. 한 방향으로 보완하기보다 실제 생활 리듬을 관찰해 보세요.',
      climateBasis: '조후 온도 점수 {score} · 습한 신호 {wet} / 건조한 신호 {dry}. 계절과 글자의 상징적 계산이며 건강 진단이 아닙니다.',
      climateAction: '잘 지낸 날의 활동과 휴식 간격을 기록하세요. 상징 점수보다 실제 컨디션을 기준으로 조절하세요.',
      strong: '일간을 지지하는 힘이 비교적 큰 구조입니다. 혼자 끌고 가는 힘과 나누어 맡기는 여유를 함께 살펴보세요.',
      weak: '일간의 힘에 비해 주변 역할의 요구가 큰 구조입니다. 도움과 준비 시간을 확보하는 방식이 단서가 됩니다.',
      jong: '한 방향의 기세를 따르는 종격 가능성이 검토된 구조입니다. 일반 신강·신약 조언을 그대로 적용하지 않습니다.',
      strengthBasis: '기존 억부 점수 {score} · 보완 후보 {support}. 점수는 사람의 능력이나 가치를 매기는 등급이 아닙니다.',
      strengthAction: '역할을 늘리기 전에 시간과 지원을 확인하세요. 선택 후의 집중력·소모·회복을 기록해 기준을 조정하세요.',
      flowBasis: '{label} {stem}{branch} · 기존 평가 점수 {score}. 길흉의 확정 예측이 아닌 흐름을 비교하는 참고값입니다.',
      flowOpen: '기존 평가에서 비교적 수월한 쪽으로 읽히는 흐름입니다. 준비해 온 일을 작은 범위에서 시험해 보세요.',
      flowCare: '기존 평가에서 조율이 필요한 쪽으로 읽히는 흐름입니다. 속도를 낮추고 역할과 일정을 정돈해 보세요.',
      flowRuleOpen: '자원과 계획이 준비됐을 때 작은 실행부터 시작하세요. 점수가 결과를 보장하지는 않습니다.',
      flowRuleCare: '일정을 조정하고 선택지를 남기세요. 점수만으로 관계·직업·투자의 결론을 내리지 마세요.',
      period: '현재 대운', year: '올해 세운', more: '자세히 읽기', sample: '샘플 · 가상 명식의 설명 예시',
      sampleNote: '설명 형식을 보여주는 예시이며 회원님의 결과가 아닙니다.',
      paidDifference: '입력한 생년 정보로 계산한 명식에 맞춰 준비된 해설을 엮습니다. 무료 풀이에서 살펴본 기질과 현재 흐름을 더 넓은 시야로 이어 읽어보세요.',
      paidDaeun: '10년마다 달라지는 삶의 흐름과 해마다의 변화를 함께 읽습니다. 일·관계·재물의 해설에서 지금 준비할 선택을 살펴보세요.',
      paidSummary: '일간·월령·오행·십성을 성격·일·관계 등 여러 주제로 이어 읽고 싶은 분께 맞습니다.',
      recovery: '기존 계정과 프로필로 사주 결과를 다시 열고 해당 풀이의 해금 상태를 확인하세요. 결제 후 열리지 않으면 새로 결제하지 말고 결제 내역과 함께 고객센터에 문의하세요.',
      inputs: '현재 사주에 입력한 생년 정보와 계산값을 사용합니다. 출생시간을 모르면 시간에 의존하는 해석은 참고 범위가 제한됩니다.',
      pricePending: '가격 확인 중', priceUnavailable: '가격은 결제 안내에서 확인해 주세요', summaryTitle: '종합 사주 풀이', daeunTitle: '대운 · 삶의 계절을 읽다', graphTitle: '대운 흐름 비교', yeonIntro: '달빛 아래 한 장씩, 타고난 마음과 지금의 계절을 함께 읽어볼게요.', neoIntro: '흐름의 근거를 짚고, 지금 준비할 선택과 행동을 정리합니다.', paidRead: '풀이 확인하기',
      catTitle: '영냥이 상담', catPurpose: '명식의 흐름을 고양이 상담사와', catGo: '살펴보기', catPrice: '{price}부터',
      letterGreeting: '{name}님께,', letterGuest: '이 편지를 읽는 당신', letterSignature: '연이가 온 마음을 담아',
      letterOpening: '긴 풀이를 읽으며 어떤 문장에서는 고개를 끄덕이고, 어떤 대목에서는 잠시 마음이 멈췄을지도 모르겠어요. 오늘은 답을 서둘러 정하기보다 따뜻한 차 한 잔을 사이에 두고, 당신의 이야기를 조금 더 듣는 마음으로 이 편지를 남겨요.',
      letterDay: '명식에서 나를 읽는 기준인 일간은 {stem}이에요. {image} 이 모습이 익숙하게 느껴진다면, 요즘 그 힘을 어디에 쓰고 있는지 천천히 떠올려보세요. 타고난 기질은 지켜야 할 숙제가 아니라, 나를 조금 덜 오해하기 위한 실마리니까요.',
      letterImages: ['큰 나무가 가지를 뻗듯, 방향을 정하고 한 걸음씩 나아가는 모습을 떠올릴 수 있어요.', '풀과 덩굴이 자리를 찾아 자라듯, 주변을 살피며 길을 조정하는 모습을 떠올릴 수 있어요.', '햇살이 공간을 밝히듯, 생각과 마음을 밖으로 나누는 모습을 떠올릴 수 있어요.', '작은 등불이 가까운 자리를 비추듯, 관심을 기울인 일과 사람을 세심하게 살피는 모습을 떠올릴 수 있어요.', '산이 자리를 지키듯, 흔들리는 상황에서 중심을 잡으려는 모습을 떠올릴 수 있어요.', '흙이 씨앗을 품듯, 일상의 작은 조건을 돌보며 결실을 기다리는 모습을 떠올릴 수 있어요.', '도구의 날을 다듬듯, 얽힌 일을 정리하고 필요한 결정을 내리는 모습을 떠올릴 수 있어요.', '보석의 결을 살피듯, 작은 차이를 알아보고 소중한 기준을 가꾸는 모습을 떠올릴 수 있어요.', '강물이 길을 찾듯, 여러 가능성을 살피며 넓게 생각하는 모습을 떠올릴 수 있어요.', '조용한 빗물이 스며들듯, 쉽게 지나치는 기색과 감정을 깊이 살피는 모습을 떠올릴 수 있어요.'],
      letterBalance: '오행의 분포에서는 {observation} {scene} 잘 쓰이던 힘도 쉬지 않고 쓰면 부담이 될 수 있어요. 반대로 적게 나타난 기운이 있다고 해서 당신에게 그 능력이 없다는 뜻은 아니랍니다. 숫자로 빈자리를 채우려 하기보다, 실제 생활에서 편안했던 방식과 지쳤던 순간을 함께 살펴주세요.',
      letterTied: '여러 오행이 비슷한 비중으로 나타나고 있어요. 한 가지 모습으로 당신을 정리하기보다, 상황에 따라 달라지는 마음을 함께 바라보고 싶어요. 어떤 날은 앞장서고, 다른 날은 조용히 살피는 나도 같은 당신이니까요.',
      letterStrong: '일간을 돕는 힘이 비교적 큰 구조로 읽혀요. 스스로 방향을 잡는 데 익숙하다면, 혼자 해낼 수 있다는 이유로 모든 몫을 안고 있지는 않은지 돌아보면 좋겠어요. 도움을 청하는 일은 내 힘을 내려놓는 것이 아니라, 오래 쓸 수 있도록 나누는 일이기도 해요.',
      letterWeak: '일간을 돕는 힘보다 주변의 요구가 크게 읽히는 구조예요. 이것은 당신의 마음이 약하다거나 능력이 부족하다는 뜻이 아니에요. 충분히 준비할 시간, 함께 의논할 사람, 쉬어 갈 자리가 있을 때 자신의 힘을 더 편안하게 쓸 수 있다는 방향으로 받아들여주세요.',
      letterJong: '명식에서는 한 방향으로 모이는 기세를 살피는 종격 가능성이 검토되었어요. 강하다거나 약하다는 말 하나로 당신을 설명하기보다, 어떤 환경에서 힘이 자연스럽게 이어지는지 바라보는 편이 좋겠어요. 해석보다 당신이 실제로 겪은 경험을 먼저 놓아주세요.',
      letterCare: '혹시 요즘 기대만큼 일이 풀리지 않아 자신에게 엄격해졌다면, 결과를 곧바로 나의 가치와 묶지는 않았으면 해요. 힘든 시간이 꼭 좋은 일의 예고인 것은 아니지만, 오늘의 부담을 줄이는 선택은 지금도 해볼 수 있어요. 해야 할 일을 하나 덜어내거나, 믿을 만한 사람에게 지금의 사정을 말하는 작은 선택부터요.',
      letterPractice: '오늘 이 편지에서 한 가지만 가져간다면, 이렇게 시작해보면 어떨까요. {action} 누군가에게 잘 보이기 위한 숙제가 아니라, 내 하루가 조금 더 편안해지는지 알아보는 작은 시도예요. 잘 맞지 않는다면 다른 방법을 골라도 괜찮아요.',
      letterClosing: '찻잔을 내려놓을 때처럼, 오늘 읽은 말도 잠시 곁에 놓아두세요. 마음에 남은 문장은 간직하고, 나와 맞지 않는 말은 흘려보내도 좋아요. 당신의 삶을 가장 가까이에서 살아온 사람은 당신이니까요. 다음 걸음이 아직 선명하지 않더라도, 자신을 다그치지 않고 선택할 여유가 곁에 남기를 연이가 바라요.',
      neoLetterTitle: '마지막 작전 메모', neoGreeting: '{name}님, 이제 선택의 기준을 정리하자.', neoSignature: '네오 · 다음 한 수는 당신의 선택',
      neoDominant: '{element} {value}%가 상대적으로 두드러진다. {trait}을 살펴볼 단서다.',
      neoTied: '여러 오행이 가장 큰 비중을 함께 차지한다. 한 가지 성향으로 묶지 말고 상황별 반응을 살펴라.',
      neoScenes: ['새로운 일을 여러 개 시작하는 편이라면 끝맺는 데 쓸 시간을 함께 잡아라.', '표현에 힘이 실리는 편이라면 상대가 답할 간격도 확보해라.', '맡은 역할을 지키려다가 다른 사람의 책임까지 떠안고 있지 않은지 점검해라.', '기준이 분명한 것은 강점이다. 다만 기준을 지키느라 목적을 놓치고 있지는 않은지 확인해라.', '작은 변화를 잘 알아차리는 편이라면 관찰을 실행으로 옮길 시점도 정해라.'],
      neoActions: ['새 과제를 늘리기 전에 진행 중인 일 하나의 마감을 정해라.', '전달할 내용과 상대가 들을 여유를 확인하고, 말한 뒤에는 답을 기다려라.', '맡을 일의 범위와 쓸 수 있는 시간을 먼저 적어라.', '꼭 지킬 기준 하나와 조정할 수 있는 기준 하나를 나눠라.', '확인할 질문 하나와 작게 시험해 볼 일을 정해라.'],
      letterGuestGreeting: '이 편지를 읽는 당신께,', neoGuestGreeting: '이제 선택의 기준을 정리하자.',
      neoOpening: '명식은 판세를 살피는 참고 자료다. 결정을 대신 내려주는 지시서는 아니다. 맞는 대목은 써먹고, 실제 경험과 어긋나는 해석은 보류해라. 지금 필요한 건 좋은 말의 개수가 아니라, 실행할 기준 하나다.',
      neoClue: '{observation} 여기서 볼 것은 우열이 아니라 힘을 쓰는 방식이다. {scene} 이런 패턴이 실제로 반복되는지 최근의 선택부터 점검해라.',
      neoStrong: '일간을 돕는 힘이 비교적 크다. 혼자 추진하기 전에 다른 의견을 들을 자리를 확보해라. 자신감이 있어도 시간과 자원이 늘어나는 것은 아니다. 맡을 일과 나눌 일을 먼저 정리하자.',
      neoWeak: '일간에 비해 주변의 요구가 큰 구조다. 능력 부족이라는 판정이 아니다. 준비 시간과 지원 없이 역할부터 늘리지 마라. 혼자 감당하기 어렵다면 범위를 줄이거나 도움을 요청하는 것도 전략이다.',
      neoJong: '한 방향의 기세를 따르는 종격 가능성이 검토됐다. 보통의 강약 공식으로 결론 내리지 마라. 환경에 맞춰 움직였을 때 실제로 효과가 있었는지부터 확인해라.',
      neoAction: '오늘의 작전은 간단하다. {action} 실행할 시점과 확인할 결과를 적어라. 해본 뒤 도움이 됐는지 평가하고, 맞지 않으면 방법을 바꿔라. 계획을 고치는 것은 패배가 아니라 판단의 일부다.',
      neoClosing: '관계든 일이든 명식만 보고 큰 결론을 내리지 마라. 상대의 실제 행동, 약속한 조건, 감당할 비용을 함께 확인해라. 당신을 몰아붙이는 대신 선택을 선명하게 만드는 것, 그게 이 작전의 목적이다. 오늘 움직일 수 있는 범위부터 시작하자.',
      endYeon: '오늘 읽은 모든 문장을 나에게 맞추려 애쓰지 않아도 괜찮아요. 실제 내 모습과 맞닿은 단서 하나부터 천천히 살펴보세요.',
      endNeo: '명식은 선택을 대신하지 않습니다. 맞는 근거와 맞지 않는 해석을 구분하고, 오늘 확인할 행동 하나만 정하세요.'
    },
    en: {
      yeon: 'Yeoni', neo: 'Neo', garden: 'A garden for understanding yourself', room: 'A strategy room for reviewing choices', same: 'One chart, two reading styles. Calculations and free/paid access stay the same.', compareNeo: 'Review Yeoni’s clues with Neo', compareYeon: 'Read Neo’s criteria with Yeoni', observe: 'What Yeoni notices', life: 'In everyday life', practice: 'One small practice', diagnosis: 'Neo’s assessment', basis: 'Chart evidence', action: 'Decision criteria', element: 'Five-element balance', temperament: 'Natural temperament', ten: 'Roles in the Ten Gods', climate: 'Seasonal balance', strength: 'How support is distributed', flow: 'Current cycles', letter: 'A final note',
      names: ['Wood', 'Fire', 'Earth', 'Metal', 'Water'], traits: ['starting and developing ideas', 'expressing thoughts and feelings', 'sustaining commitments', 'setting standards and simplifying', 'observing and adapting'],
      scenes: ['You may start several things at once. Leave room to finish them.', 'You may bring energy to conversations. Give others time to respond.', 'Familiar responsibilities may feel reassuring. Check whether you are carrying someone else’s share.', 'Clear standards may help with uncertainty. Too many rules can leave little room to breathe.', 'You may notice subtle changes. When reflection stretches on, try a small experiment.'],
      actions: ['Finish one existing task before adding another.', 'Pause after an important message and listen to the response.', 'Write down the boundary of one responsibility this week.', 'Separate one essential standard from one flexible preference.', 'Choose one thing to research and one thing to test now.'],
      rules: ['Proceed with a clear goal and deadline. Reduce new tasks if unfinished work grows.', 'Speak when the message and the listener’s availability align. Do not press for an immediate answer.', 'Accept a role when resources match its demands. Renegotiate a growing workload.', 'Apply standards that serve the goal. Define a minimum if perfection stalls progress.', 'Research a specific question. Set a small test deadline if information only accumulates.'],
      godNames: ['Peer · autonomy', 'Competitor · cooperation', 'Expression · consistency', 'Challenger · improvement', 'Opportunity · resources', 'Stewardship · accumulation', 'Pressure · response', 'Responsibility · order', 'Insight · perspective', 'Learning · support'],
      godTraits: ["A preference for self-directed choices", "Energy from cooperation and competition", "Expression refined through practice", "A habit of reviewing familiar rules", "Interest in connecting opportunities", "Steady attention to resources and commitments", "Focus on demanding tasks", "Attention to roles and standards", "Deep exploration of unfamiliar views", "Preparation through learning and support"],
      godLife: ['Making your own decisions may feel comfortable. Hear another view too.', 'Working alongside others may energise you. Notice when comparison becomes draining.', 'Regular practice and expression may help you develop a skill.', 'You may question familiar rules. Explain the reason for a proposed change.', 'Connecting opportunities may interest you. Check what you can realistically manage.', 'Keeping small financial commitments and promises may bring stability.', 'Demanding tasks may focus your attention. Make recovery part of the schedule.', 'Clear roles may feel comfortable. Practise adjusting when expectations change.', 'You may explore unfamiliar perspectives deeply. Test them against experience.', 'Learning and support may renew your energy. Put one lesson into practice.'],
      godRules: ['Separate individual from shared decisions and consult where needed.', 'Agree on costs and roles before competing. Pause if comparison replaces the goal.', 'Start with a repeatable workload. Use completed work to plan the next step.', 'Offer an alternative when identifying a problem. Avoid judging the person.', 'List time and downside limits for each opportunity. Defer what exceeds them.', 'Record income, costs and commitments. Do not let stability prevent necessary change.', 'Check resources before accepting pressure. Share work if rest suffers.', 'Clarify responsibility. Adjust rules with evidence when they undermine their purpose.', 'Treat intuition as a hypothesis. Verify before making a major decision.', 'Apply one lesson directly. Review the final choice even when receiving help.'],
      distribution: 'Existing chart ratios include the month-branch weighting. A larger share is not a rank or a probability of success.', dominant: '{element} at {value}% is relatively prominent: a clue to {trait}.', balanced: 'Several elements share the largest proportion. Consider how different situations bring out different strengths.', dayBasis: 'Day stem {stem} · day branch {branch}. The day stem is the reference for this reading; here its {element} symbolism is translated into daily life.', godBasis: '{name} appears in {count} chart positions. This counts relationships to the day stem, not a definitive personality diagnosis.', unknown: 'Birth time unknown: noon is used as a reference. The hour pillar and time-dependent ratios, strength and timing cannot be treated as certain.', cold: 'The seasonal score leans cooler. Notice what helps you prepare before starting an activity.', hot: 'The seasonal score leans warmer. Leave recovery intervals when increasing your pace.', neutral: 'The temperature score is centred. Observe your actual routine rather than compensating in one direction.', climateBasis: 'Temperature score {score} · moist signals {wet} / dry signals {dry}. These are symbolic seasonal calculations, not a medical assessment.', climateAction: 'Record activity and rest on days that went well. Adjust to actual wellbeing, not a symbolic score.', strong: 'The day stem receives relatively strong support. Consider both independent effort and sharing responsibilities.', weak: 'Surrounding demands are relatively large compared with support for the day stem. Preparation and help are useful questions to explore.', jong: 'The engine considers a following structure. Ordinary strong/weak advice does not apply unchanged.', strengthBasis: 'Existing support score {score} · balancing candidates {support}. This does not rank your ability or worth.', strengthAction: 'Check time and support before adding a responsibility. Review focus, effort and recovery after the choice.', flowBasis: '{label} {stem}{branch} · existing score {score}. A comparison aid, not a certain prediction.', flowOpen: 'The existing assessment reads this as relatively supportive. Test a prepared idea on a small scale.', flowCare: 'The existing assessment suggests adjustment. Review pace, responsibilities and schedules.', flowRuleOpen: 'Start small when resources and plans are ready. A score does not guarantee an outcome.', flowRuleCare: 'Adjust schedules and keep options open. Do not make relationship, career or investment decisions from a score alone.', period: 'Current ten-year cycle', year: 'Current annual cycle', more: 'Read more', sample: 'Sample · a fictional chart', sampleNote: 'An example of the format, not your personal result.', paidDifference: 'The free reading covers temperament and current cycles. These static readings add longer periods and thematic detail, using explanations linked to the calculated chart.', paidDaeun: 'For comparing ten-year periods, chart evidence and annual details.', paidSummary: 'For connecting the day stem, season, elements and Ten Gods across temperament, work and relationships.', recovery: 'Reopen the chart with the same account and profile and check access. If payment succeeded but access is missing, do not pay again; contact support with the payment record.', inputs: 'Uses the birth information and calculations already entered for this chart. Unknown birth time limits time-dependent interpretation.', pricePending: 'Checking price', priceUnavailable: 'Confirm the price in the payment information', summaryTitle: 'Comprehensive reading', daeunTitle: 'Your ten-year cycles', graphTitle: 'Cycle comparison', yeonIntro: 'Read your temperament and the season you are in, one page at a time.', neoIntro: 'Review the chart evidence and turn it into practical choices.', paidRead: 'View reading', catTitle: 'Yeongnyangi readings', catPurpose: 'Explore your chart with the cat guide', catGo: 'Explore', catPrice: 'From {price}', endYeon: 'You do not need to fit every sentence. Start with one clue that connects with your own experience.', endNeo: 'A chart does not decide for you. Separate supported observations from mismatches and choose one action to test.'
    }
  };
  function locale() {
    return typeof root._sajuEngineCurrentLang === 'function' ? root._sajuEngineCurrentLang() : (document.documentElement.lang || 'ko');
  }
  copy.ko.catFree='무료 운세';copy.en.catFree='Free fortune';
  copy.ko.today='오늘의 흐름';copy.en.today='Today’s cycle';
  copy.ko.month='이달의 흐름';copy.en.month='This month’s cycle';
  function langCopy(lang) {
    var fallback=copy[lang]||copy.en, result={};
    Object.keys(fallback).forEach(function(key){
      function translated(value,suffix){
        if(typeof root.cdTranslate!=='function')return value;
        var full='sajuReading.'+key+(suffix===undefined?'':'.'+suffix), found=root.cdTranslate(full,{},'');
        return found&&found!==full&&found!=='Translation pending'?found:value;
      }
      result[key]=Array.isArray(fallback[key])?fallback[key].map(function(value,i){return translated(value,i);}):translated(fallback[key]);
    });
    return result;
  }
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function fmt(text, values) { return String(text).replace(/\{(\w+)\}/g, function (_, key) { return values[key] == null ? '' : String(values[key]); }); }
  function mode() { try { return root.localStorage.getItem('fortuneThemeModeStateV1') === 'neo' ? 'neo' : 'pig'; } catch (_) { return document.body.classList.contains('neo-mode') ? 'neo' : 'pig'; } }
  function build(input, selected, lang) {
    if (!input) return null;
    var c = langCopy(lang), neo = selected === 'neo', p = input.p, n = input.natal;
    if (!p || !n) return null;
    var dominant = elements.indexOf(n.dominant), day = elements.indexOf(p.d.gE);
    if (dominant < 0 || day < 0) return null;
    function section(title, observation, evidence, example, action) {
      return { title: title, blocks: neo ? [{label:c.diagnosis,text:observation},{label:c.basis,text:evidence},{label:c.action,text:action}] : [{label:c.observe,text:observation},{label:c.life,text:example},{label:c.practice,text:action}], evidence: evidence };
    }
    var ratios = elements.map(function (e) { return Number(n.ratios[e]) || 0; });
    var top = Math.max.apply(Math, ratios), tied = ratios.filter(function (v) { return Math.abs(v-top)<0.001; }).length > 1;
    var evidence = elements.map(function (e,i) { return c.names[i]+' '+ratios[i].toFixed(0)+'%'; }).join(' · ') + '. ' + c.distribution;
    var elementText = tied ? c.balanced : fmt(c.dominant,{element:c.names[dominant],value:ratios[dominant].toFixed(0),trait:c.traits[dominant]});
    var model = { mode:selected, unknown:input.unknown===true, warning:c.unknown, ratios:ratios, elements:section(c.element,elementText,evidence,c.scenes[dominant],neo?c.rules[dominant]:c.actions[dominant]) };
    model.day = section(c.temperament,c.names[day]+' · '+c.traits[day],fmt(c.dayBasis,{stem:p.d.g,branch:p.d.j,element:c.names[day]}),c.scenes[day],neo?c.rules[day]:c.actions[day]);
    model.ten = gods.filter(function (g) { return input.ten[g]>0; }).map(function (g) {
      var i=gods.indexOf(g), basis=fmt(c.godBasis,{name:c.godNames[i],count:input.ten[g]});
      return { key:g, count:input.ten[g], reading:section(c.godNames[i],neo?c.godTraits[i]:c.godLife[i],basis,c.godLife[i],c.godRules[i]) };
    });
    var j=input.johu||{}, pw=input.power||{}, jong=input.jong||{};
    var cool=j.type==='cool'||j.type==='cold', warm=j.type==='warm'||j.type==='hot';
    model.climate=section(c.climate,cool?c.cold:warm?c.hot:c.neutral,fmt(c.climateBasis,{score:j.score,wet:j.moistCnt,dry:j.dryCnt}),cool?c.scenes[4]:warm?c.scenes[1]:c.scenes[2],c.climateAction);
    model.strength=section(c.strength,jong.isJong?c.jong:pw.isStrong?c.strong:c.weak,fmt(c.strengthBasis,{score:pw.score,support:(pw.yongshin||[]).map(function(e){return c.names[elements.indexOf(e)]||e;}).join(' · ')}),pw.isStrong?c.scenes[0]:c.scenes[2],c.strengthAction);
    model.flow=(input.flow||[]).map(function(row) { var good=row.score>=60; return section(row.kind==='year'?c.year:c.period,good?c.flowOpen:c.flowCare,fmt(c.flowBasis,{label:row.kind==='year'?c.year:c.period,stem:row.g,branch:row.j,score:row.score}),good?c.flowOpen:c.flowCare,good?c.flowRuleOpen:c.flowRuleCare); });
    var name=String(input.name||'').trim();
    if(lang==='ko') {
      var stemIndex=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'].indexOf(p.d.g);
      model.letter={title:neo?c.neoLetterTitle:c.letter, greeting:name?fmt(neo?c.neoGreeting:c.letterGreeting,{name:name}):(neo?c.neoGuestGreeting:c.letterGuestGreeting), signature:neo?c.neoSignature:c.letterSignature,
        paragraphs:neo?[c.neoOpening,fmt(c.neoClue,{observation:tied?c.neoTied:fmt(c.neoDominant,{element:c.names[dominant],value:ratios[dominant].toFixed(0),trait:c.traits[dominant]}),scene:c.neoScenes[dominant]}),jong.isJong?c.neoJong:pw.isStrong?c.neoStrong:c.neoWeak,fmt(c.neoAction,{action:c.neoActions[day]}),c.neoClosing]:[
          c.letterOpening,fmt(c.letterDay,{stem:p.d.g,image:c.letterImages[stemIndex<0?day*2:stemIndex]}),tied?c.letterTied:fmt(c.letterBalance,{observation:elementText,scene:c.scenes[dominant]}),jong.isJong?c.letterJong:pw.isStrong?c.letterStrong:c.letterWeak,c.letterCare,fmt(c.letterPractice,{action:c.actions[day]}),c.letterClosing], evidence:model.day.evidence};
    } else {
      model.letter={title:c.letter,greeting:neo?c.neo:c.yeon,signature:neo?c.neo:c.yeon,paragraphs:[elementText,c.scenes[day],neo?c.rules[day]:c.actions[day],neo?c.endNeo:c.endYeon],evidence:model.day.evidence};
    }
    return model;
  }
  var state = null, flow = [], daily = [], openGod = null;
  // Editorial interpretation of supplied engine facts only; no new fortune scoring.
  var cycleRoles = {
    '비견': {name:'자기 기준과 동료', theme:'스스로 방향을 정하고 동료와 나란히 힘을 쓰는 주제', work:'독립적으로 맡을 업무와 협업할 업무를 구분하면 실력을 드러내기 좋습니다.', money:'공동 지출과 개인 지출을 나누고, 친분이 있는 거래도 역할과 비용을 기록해 두세요.', relation:'서로의 자율성을 존중하되 내 방식만 옳다고 밀어붙이고 있지는 않은지 살펴보세요.', action:'혼자 결정할 일과 합의가 필요한 일을 나누어 적어보세요.'},
    '겁재': {name:'경쟁과 자원 배분', theme:'사람들과 함께 움직이며 기회와 자원을 나누는 주제', work:'경쟁이 의욕을 깨울 수 있지만, 비교보다 맡은 역할과 성과 기준을 분명히 하는 편이 좋습니다.', money:'동업·공동 구매에서는 분담금과 중단 조건을 먼저 합의하세요. 경쟁심 때문에 예산을 늘리지 않는 것이 중요합니다.', relation:'가까운 사이일수록 부탁을 모두 받아주기보다 시간과 책임의 경계를 정해보세요.', action:'새 협업을 시작하기 전 역할·비용·종료 기준을 한 장에 정리해 보세요.'},
    '식신': {name:'꾸준한 표현과 생산', theme:'익힌 능력을 반복 가능한 결과물로 만들어 가는 주제', work:'반복해서 다듬을 수 있는 기술과 작업 방식이 강점이 됩니다. 완성한 결과를 꾸준히 보여주세요.', money:'수입을 크게 예상하기보다 실제로 반복할 수 있는 작업량과 비용을 확인해 보세요.', relation:'함께 식사하거나 일상을 나누는 작은 표현이 관계를 편안하게 만들 수 있습니다.', action:'지치지 않고 반복할 수 있는 작업 분량과 쉬는 시간을 함께 정해보세요.'},
    '상관': {name:'질문과 새로운 표현', theme:'익숙한 방식에 질문을 던지고 나만의 표현을 찾는 주제', work:'개선점을 발견하는 눈을 제안서·작품·실험으로 옮겨보세요. 지적만 하기보다 실행 가능한 대안을 붙이면 설득력이 생깁니다.', money:'새 아이디어의 수익성은 작은 실험으로 확인하세요. 반응이 오기 전에 지출부터 늘리지 않는 편이 좋습니다.', relation:'솔직함이 강점이 되려면 상대가 받아들일 수 있는 시점과 말투도 함께 살펴야 합니다.', action:'바꾸고 싶은 문제 하나에 이유와 대안을 한 문장씩 적어보세요.'},
    '편재': {name:'기회 탐색과 연결', theme:'외부 기회와 사람·자원을 연결하는 주제', work:'새 고객이나 다른 업무 영역을 살펴볼 수 있습니다. 여러 가능성 가운데 실제로 감당할 수 있는 것부터 골라보세요.', money:'기회가 많아 보일수록 현금 흐름과 손실 한도를 먼저 확인하세요. 운의 해석을 투자 수익의 근거로 삼지는 마세요.', relation:'만남의 폭을 넓히되 가까운 관계에 쓸 시간도 남겨두세요. 많은 연결과 깊은 신뢰는 따로 돌봐야 합니다.', action:'관심 있는 기회 세 가지를 시간·비용·회수 가능성으로 비교해 보세요.'},
    '정재': {name:'생활 기반과 축적', theme:'꾸준히 관리하며 생활의 기반을 쌓아 가는 주제', work:'책임 범위와 일정이 분명한 일에서 장점을 살펴볼 수 있습니다. 작은 성과를 기록해 다음 계획에 반영해 보세요.', money:'고정 지출과 저축 목표를 현실에 맞춰 점검해 보세요. 안정만 지키려다 필요한 배움과 변화까지 미루지는 않는 것이 좋습니다.', relation:'약속을 지키는 태도가 신뢰를 쌓습니다. 돌봄과 책임이 한 사람에게만 몰리지 않도록 대화해 보세요.', action:'이번 달 유지할 지출과 줄일 지출, 필요한 준비 비용을 나눠보세요.'},
    '편관': {name:'도전과 부담 조절', theme:'요구가 높은 과제에 대응하며 경계를 세우는 주제', work:'어려운 역할이 집중력을 끌어낼 수 있지만 권한 없이 책임만 늘어나는 것은 피해야 합니다. 필요한 지원을 먼저 요청하세요.', money:'예상 밖 비용에 대비할 여지를 두세요. 압박을 벗어나기 위해 성급하게 큰 계약을 결정하지 않는 편이 좋습니다.', relation:'긴장이 쌓일 때 상대를 통제하려 하기보다 내가 감당할 수 있는 선을 분명히 알려주세요.', action:'맡은 책임에 비해 부족한 시간·권한·지원이 무엇인지 점검해 보세요.'},
    '정관': {name:'책임과 신뢰', theme:'역할과 약속을 지키며 신뢰를 쌓는 주제', work:'조직의 기준과 내 역할을 맞추는 일이 중요해질 수 있습니다. 평가 기준을 확인하고 성과를 차분히 기록하세요.', money:'계약·납부·정기 지출처럼 미루기 쉬운 의무를 정리해 보세요. 체면을 위해 감당하기 어려운 비용을 떠안지는 마세요.', relation:'관계의 이름보다 실제로 지킬 수 있는 약속을 확인하세요. 상대에게도 같은 기준을 강요하고 있지는 않은지 돌아보세요.', action:'내가 책임질 범위와 상대에게 확인할 약속을 구분해 보세요.'},
    '편인': {name:'탐구와 관점 전환', theme:'익숙하지 않은 관점을 깊이 살피고 전문성을 다듬는 주제', work:'혼자 깊이 파고드는 시간이 도움이 될 수 있습니다. 연구나 아이디어가 실제로 쓰일 장면을 정해두면 고립을 줄일 수 있습니다.', money:'자료·도구·배움에 드는 비용이 쌓이지 않는지 확인하세요. 관심과 실제 활용 가능성을 나눠보는 편이 좋습니다.', relation:'혼자 생각할 시간이 필요하다면 상대에게 설명해 주세요. 말하지 않은 마음까지 알아주기를 기다리지는 마세요.', action:'새롭게 배운 내용 하나를 작은 결과물이나 대화로 옮겨보세요.'},
    '정인': {name:'배움과 지지 기반', theme:'배우고 도움을 주고받으며 기반을 보완하는 주제', work:'교육·기록·멘토의 피드백을 통해 준비를 다질 수 있습니다. 배움이 충분한지보다 실제로 한 번 적용했는지를 확인하세요.', money:'교육과 준비에 필요한 예산을 정해두세요. 보호받는 환경이 있더라도 스스로 관리할 생활 기반을 함께 마련하는 편이 좋습니다.', relation:'도움을 받아들이되 고마움 때문에 모든 요청을 수락할 필요는 없습니다. 서로 편안한 지원의 범위를 이야기해 보세요.', action:'도움받을 일 하나와 스스로 실행할 일 하나를 함께 정해보세요.'}
  };
  // These interpretations explain supplied facts; they never establish a new pattern or score.
  var cycleRoleConditions = {
    '비견': {help:'일간이 감당할 힘을 보태 주는 경우에는 동료의 지원과 자율성이 강점이 됩니다.',burden:'일간의 힘이 이미 충분한데 경쟁까지 커지면 공동 자원의 몫과 결정권을 둘러싼 긴장이 생길 수 있습니다.',check:'비겁쟁재는 비겁이 재성을 다투는 구조를 말합니다. 비견 한 글자만으로 성립하지 않으며 재성의 힘과 식상·관성의 조절을 함께 확인해야 합니다.'},
    '겁재': {help:'일간이 지원을 필요로 할 때에는 함께 어려운 일을 맡는 사람과 추진력을 얻는 쪽으로 읽을 수 있습니다.',burden:'경쟁과 자원 분배가 부담으로 작용하면 동업에서 정산이나 역할을 두고 마찰이 생길 가능성을 살핍니다.',check:'겁재를 곧 손실로 읽지는 않습니다. 재성이 감당할 힘이 있는지, 식상으로 힘을 풀거나 관성으로 조절하는 근거가 있는지에 따라 해석이 달라집니다.'},
    '식신': {help:'표현하고 생산하는 힘이 균형을 도우면 익힌 기술을 꾸준한 결과물로 옮기는 데 강점을 살펴볼 수 있습니다.',burden:'일간이 감당할 여력이 적으면 생산과 돌봄에 힘을 계속 쓰는 일이 소모로 이어질 수 있습니다.',check:'식신생재는 식신의 생산이 재성으로 이어지는 관계입니다. 재성의 연결과 일간의 수용력이 함께 확인될 때 해석하며 식신만으로 수입을 약속하지 않습니다.'},
    '상관': {help:'표현력이 필요한 명식에서는 익숙한 기준을 개선하고 전문성을 드러내는 힘으로 읽을 수 있습니다.',burden:'표현과 요구가 지나치게 앞서면 조직의 규칙이나 상대의 기대와 부딪히는 장면을 살펴야 합니다.',check:'상관견관은 상관과 정관의 관계를 살피는 말입니다. 정관의 존재와 작용, 인성·재성의 조절을 확인한 뒤 판단하며 상관 하나로 갈등을 확정하지 않습니다.'},
    '편재': {help:'일간이 재성을 감당하고 균형에도 도움이 되면 외부 기회와 자원을 연결하는 역할을 살펴볼 수 있습니다.',burden:'재성의 요구에 비해 지원이 부족하면 여러 거래와 책임을 동시에 떠안는 일이 부담이 될 수 있습니다.',check:'재다신약은 재성이 많아 일간이 감당하기 어려운 구조입니다. 재성의 개수만으로 정하지 않고 월령·통근·지원과 식상의 연결을 함께 살핍니다.'},
    '정재': {help:'재성이 균형을 도우면 정해진 일과 자원을 꾸준히 관리하고 생활의 기반을 쌓는 힘으로 읽을 수 있습니다.',burden:'감당할 힘보다 현실의 의무가 커지면 안정에 대한 책임감이 걱정과 과도한 통제로 나타날 수 있습니다.',check:'정재가 있다고 재산이 안정되는 것은 아닙니다. 일간의 수용력과 비겁·식상·관성의 배치에 따라 축적, 분배, 책임 가운데 강조점이 달라집니다.'},
    '편관': {help:'일간이 압박을 감당하고 제화의 근거가 있으면 어려운 역할을 맡아 집중력과 결단을 쓰는 힘으로 읽을 수 있습니다.',burden:'압박에 비해 지원이 부족하면 책임이 과중해지고 자신의 속도를 잃는 장면을 살펴야 합니다.',check:'식신제살은 식신이 편관을 조절하는 관계, 살인상생은 편관의 힘을 인성이 이어받아 일간을 돕는 관계입니다. 해당 근거가 확인될 때만 적용하며 편관 자체를 흉운으로 단정하지 않습니다.'},
    '정관': {help:'정관이 균형에 도움이 되면 역할과 규칙을 지키는 태도가 신뢰와 책임 있는 일로 이어질 여지를 살펴봅니다.',burden:'규칙과 평가의 요구가 감당할 힘을 넘으면 체면이나 의무 때문에 필요한 선택을 미루기 쉬울 수 있습니다.',check:'관인상생은 관성의 힘이 인성을 거쳐 일간을 돕는 관계입니다. 인성의 연결과 일간의 힘을 확인해야 하며 정관만으로 승진이나 결혼을 확정하지 않습니다.'},
    '편인': {help:'배움과 지원이 필요한 구조에서는 익숙하지 않은 문제를 깊이 탐구하고 관점을 바꾸는 힘을 살펴봅니다.',burden:'인성이 이미 부담인 구조에서는 생각과 준비가 길어져 표현과 실행의 흐름이 막히는지 살펴야 합니다.',check:'편인과 식신이 함께 있다고 곧 도식으로 판단하지 않습니다. 식신의 힘과 재성의 조절 등 실제 관계를 확인해 배움이 생산을 돕는지 제약하는지 구분합니다.'},
    '정인': {help:'일간에 지원이 필요한 때에는 교육, 기록, 믿을 만한 도움으로 기반을 보완하는 힘으로 읽을 수 있습니다.',burden:'지원이 이미 충분한데 인성이 부담으로 더해지면 보호받는 환경에 머물며 실행을 미루는 모습을 점검합니다.',check:'인성이 많다는 것만으로 게으름을 판단하지 않습니다. 일간의 강약과 식상으로 표현할 통로가 있는지를 함께 확인해야 합니다.'}
  };
  function buildCycle(input, selected) {
    if (!input || !input.day || !input.stem || !input.branch) return null;
    var neo=selected==='neo', a=cycleRoles[input.stem.god], b=cycleRoles[input.branch.god];
    if(!a || !b)return null;
    var section=[], end=Number(input.startYear)+9, powerKnown=input.power&&typeof input.power.isStrong==='boolean';
    function add(title,text){section.push({title:title,text:text});}
    function elName(key){var i=elements.indexOf(key);return i>=0?copy.ko.names[i]:'확인되지 않은 기운';}
    function positionName(value){return ({y:'년주',year:'년주',m:'월주',month:'월주',d:'일주',day:'일주',h:'시주',hour:'시주'})[value]||value;}
    var dominant=elName(input.dominant), strength=input.jong&&input.jong.isJong
      ? '한 방향으로 모인 기세를 살피는 '+(input.jong.isGaJong?'가종격':'종격')+' 가능성이 검토됩니다. 일반적인 신강·신약 기준만으로 해석하지 않습니다.'
      : powerKnown ? (input.power.isStrong?'일간을 지지하는 힘이 비교적 큰 구조로, 내 힘을 어디에 쓰고 나눌지가 중요합니다.':'주변 역할의 요구에 비해 일간의 지원이 적은 구조로, 도움과 준비 시간을 확보하는 방식이 중요합니다.') : '강약을 확인할 자료가 없어 그에 따른 결론은 보류합니다.';
    add('타고난 명식과 이번 대운의 만남','나를 읽는 기준인 일간은 '+input.day+'이고, 계절의 바탕을 보는 월지는 '+input.month+'입니다. '+(input.dominant?'원국에서는 '+dominant+'의 비중이 상대적으로 두드러집니다. 같은 기운이 많아지는 것만으로 유리하다고 보지는 않습니다. ':'')+strength+'\n\n이번 대운의 '+input.stem.char+input.branch.char+'가 원국에서 필요한 힘을 보태는지, 이미 충분한 힘을 더하는지를 구분해 읽습니다. 많은 기운도 막히거나 과해지면 제 역할을 쓰기 어려울 수 있고, 적은 기운도 계절과 뿌리의 지원에 따라 작용이 달라집니다.');
    function roleText(row,role,label){
      var count=Number((input.godCounts||{})[row.god])||0, condition=cycleRoleConditions[row.god];
      var reading=row.balance==='good'?condition.help:row.balance==='bad'?condition.burden:condition.help+' 다만 '+condition.burden;
      return label+' '+row.char+'('+elName(row.element)+')는 일간 '+input.day+'에게 '+row.god+' · '+role.name+'로 읽힙니다. '+role.theme+'가 이번 시기를 이해할 단서입니다. '+(count?'원국의 대표 글자에서 이 십성이 '+count+'곳에 확인됩니다. 개수는 같은 역할의 반복을 보여 주며 그 힘의 세기 자체를 뜻하지는 않습니다.':'원국의 대표 글자에서는 이 십성이 두드러지지 않습니다. 지장간까지 없다는 뜻은 아니며 새 역할이 드러나는지 함께 살펴봅니다.')+'\n\n'+reading+' '+condition.check;
    }
    var roots=Array.isArray(input.stem.roots)?input.stem.roots.filter(function(row){return row&&row.branch&&row.hiddenStem&&(!input.unknown||positionName(row.position)!=='시주');}):null;
    var rootText=roots===null?'':roots.length?' 통근은 천간이 지지 속 장간에 뿌리를 두는 것입니다. 제공된 근거에서는 '+roots.map(function(row){return positionName(row.position)+' '+row.branch+' 속 '+row.hiddenStem;}).join(' · ')+'에서 연결을 확인합니다. 뿌리의 존재와 강약은 구분하고 계절의 지원도 함께 읽습니다.':' 제공된 자리에서는 이번 천간의 통근 근거가 확인되지 않습니다. 이것만으로 작용이 없다고 단정하지 않고 다른 지원과 계절을 함께 살핍니다.';
    add('천간에서 읽는 선택과 표현',roleText(input.stem,a,'대운의 천간')+rootText);
    var hidden=Array.isArray(input.branch.hiddenStems)?input.branch.hiddenStems.filter(function(row){return row&&row.stem&&row.god;}):[];
    var hiddenText=hidden.length?' 지장간은 지지 안에 담긴 천간입니다. 이번 지지에서 제공된 장간은 '+hidden.map(function(row){return row.stem+'('+row.god+(row.layer?' · '+row.layer:'')+')';}).join(', ')+'입니다. 대표 십성과 함께 읽되 장간의 존재만으로 투간이나 통근, 용신 성립을 새로 판단하지 않습니다.':' 지지의 십성은 대표 기운을 기준으로 읽으며 지장간 전체를 하나의 성향으로 단정하지 않습니다.';
    var branchReading=input.stem.god===input.branch.god?'대운의 지지 '+input.branch.char+'('+elName(input.branch.element)+')도 일간 '+input.day+'에게 '+input.branch.god+'로 읽힙니다. 천간에서 드러나는 '+b.name+'의 주제가 생활의 기반에서도 반복되는 구조입니다. 겉으로 선택한 방향을 일상에서 지속할 수 있는지 살펴보세요.':roleText(input.branch,b,'대운의 지지');
    add('지지에서 읽는 생활의 바탕',branchReading+hiddenText+'\n\n'+(input.stem.god===input.branch.god?'위아래 글자가 같은 주제를 반복합니다. 강점을 충분히 쓰되 한 방식에만 몰두하지 않는 여유도 필요합니다.':'겉으로 펼칠 일과 일상에서 챙길 기반이 서로 다를 수 있습니다. 두 주제 중 하나를 버리기보다 함께 감당할 순서를 정해보세요.'));
    var climate=input.climate==='cold'||input.climate==='cool'?'차가운 쪽':input.climate==='hot'||input.climate==='warm'?'따뜻한 쪽':'한쪽 온도에 크게 치우치지 않는 쪽';
    function balance(row){return row.char+'의 '+elName(row.element)+'은 '+(row.balance==='good'?'현재 명식의 균형을 돕는 후보':row.balance==='bad'?'현재 명식에서 부담을 늘릴 수 있는 기운':'균형의 유불리가 뚜렷하지 않은 기운')+'로 검토됩니다.';}
    add('힘의 균형을 함께 살피면',(input.climate?'원국의 조후, 즉 계절의 온도 균형은 '+climate+'으로 읽힙니다. ':'조후 자료가 없어 계절적 보완은 단정하지 않습니다. ')+balance(input.stem)+' '+balance(input.branch)+' '+(input.stem.balance!==input.branch.balance?'도움과 부담의 방향이 서로 다릅니다. 좋은 기회를 활용하더라도 소모되는 부분을 함께 보완해야 합니다. ':'한 방향의 신호가 반복되더라도 실제 결과는 준비와 환경에 따라 달라집니다. ')+'\n\n억부는 일간이 감당할 힘의 균형을, 조후는 계절의 한난조습을 살피는 기준입니다. 두 판단이 다를 때에는 어느 한쪽을 지우지 않고 도움이 되는 조건과 부담이 되는 조건을 나눠 읽습니다. '+(input.jong&&input.jong.isJong?'종격에서는 중심 기세를 이어가는지 흐트러뜨리는지를 우선 살핍니다.':'신강·신약은 능력의 등급이 아니라 힘의 배분을 읽는 참고 기준입니다.'));
    var relations=(input.relations||[]).map(function(r){
      var relation='대운 '+r.src+'과 원국 '+(r.positions||[]).map(positionName).join('·')+'의 '+r.partner+' 사이에 '+r.type+'이 관찰됩니다. ';
      if(r.isChung||r.type.indexOf('충')>=0)relation+='충은 두 기운이 맞부딪치는 관계로, 기존 역할과 생활 기반의 변화 가능성을 살핍니다. 희신·기신 가운데 어느 쪽이 영향을 받는지에 따라 의미가 달라지며 충 하나로 이별·사고나 발복을 정하지 않습니다.';
      else if(r.type.indexOf('합')>=0)relation+=r.transformed===true?'현재 적용한 기준에서는 합 관계와 합화 조건이 함께 확인되어 '+elName(r.hapEl)+'으로 작용하는 근거를 읽습니다. 변화한 기운이 명식에 필요한지와 부담을 주는지를 다시 구분해야 합니다.':'합은 글자들이 묶여 작용하는 관계입니다. '+(r.hapEl?elName(r.hapEl)+'으로 모이는 방향은 합화 후보이며, ':'')+'합이 있다는 것과 다른 오행으로 합화하는 것은 다릅니다. 월령·통근·쟁합·충의 조건을 확인하기 전에는 원래 기운이 사라졌다고 보지 않습니다.';
      else if(r.type.indexOf('형')>=0)relation+='형은 같은 문제를 거듭 조정해야 하는 긴장으로 읽을 수 있습니다. 해당 자리의 십성과 다른 합충을 함께 살피며 질병이나 처벌을 확정하지 않습니다.';
      else if(r.type.indexOf('파')>=0||r.type.indexOf('해')>=0)relation+='파·해는 관계의 균열이나 조율이 필요한 지점을 보조적으로 살피는 관계입니다. 실제 마찰이 있는지 확인하고 약속과 역할을 구체적으로 맞추는 데 활용하세요.';
      else relation+='어느 자리에 어떤 십성으로 작용하는지와 다른 관계의 완화 조건을 함께 살펴보세요.';
      if(Array.isArray(r.conditions)&&r.conditions.length)relation+=' 확인된 조건: '+r.conditions.join(' · ')+'.';
      return relation;
    });
    add('원국의 어느 자리와 만나는가',relations.length?relations.join('\n\n'):'이번 자료에서는 원국과 대운 사이의 합·충·형·파·해가 별도로 표시되지 않습니다. 이것이 변화가 없다는 뜻은 아닙니다. 위의 십성과 균형을 중심으로 읽어보세요.');
    var capacity=input.jong&&input.jong.isJong?'중심 기세에 맞는 역할인지 확인하면서 한 방향에만 모든 자원을 걸지는 마세요.':powerKnown?(input.power.isStrong?'원국에서 지지받는 힘이 있는 만큼 일을 혼자 끌고 가기보다 성과를 나눌 구조와 마감 기준을 함께 마련해 보세요.':'원국에서 지원을 확보하는 것이 중요한 만큼 새 역할을 맡기 전에 협력자·시간·준비 비용을 먼저 확보하는 편이 좋습니다.'):'실제 가용 시간과 자원을 기준으로 범위를 정해보세요.';
    add('일과 재물에서 살펴볼 선택','일의 전면에서는 '+input.stem.god+'의 '+a.name+', 생활 기반에서는 '+input.branch.god+'의 '+b.name+'가 해석의 출발점입니다. '+a.work+' '+capacity+'\n\n'+a.money+(input.stem.god!==input.branch.god?' 생활 기반에서는 '+b.money:'')+' 명식의 기회나 부담은 실제 계약·수입·지출에서 확인할 조건과 함께 읽으세요. 같은 흐름에서도 준비와 역할 분담에 따라 결과가 달라질 수 있습니다.');
    add('관계에서 반복하기 쉬운 모습','관계의 일상에서는 '+input.branch.god+'의 주제가 강조됩니다. '+b.relation+(input.stem.god!==input.branch.god?' 밖으로 드러내는 '+input.stem.god+'의 태도에서는 '+a.relation:'')+'\n\n갈등이 생겼다면 성격의 결함으로 단정하기보다 기대한 역할과 실제로 감당할 역할이 어긋났는지 살펴보세요. 상대의 마음이나 관계의 결말을 정해 놓기보다 실제 대화와 행동을 함께 확인해 보세요.');
    add(neo?'실행할 순서를 정리하세요':'이 계절을 내 것으로 만드는 작은 실천','먼저, '+a.action+' 이어서, '+(a===b?'같은 역할이 반복될 때 소모되는 시간과 비용을 점검해 보세요.':b.action)+' 마지막으로, 한 달 뒤 실제로 달라진 점과 소모된 자원을 돌아보세요.\n\n도움이 된 선택은 유지하고, 부담이 커진 선택은 범위와 속도를 줄여 다시 확인하세요. 이는 10년 안의 특정 해를 예언하는 구분이 아니라, 지금 시작할 수 있는 실행 순서입니다.');
    add('대운과 세운, 다음 시기를 함께 읽기','대운은 약 10년의 큰 배경이고 세운은 그 안에서 해마다 달라지는 흐름입니다. 아래 연도별 해설에서는 세운의 간지가 원국과 맺는 관계뿐 아니라, 이 대운의 주제를 이어 가는지 다른 요구를 더하는지도 함께 살펴보세요. 대운과 세운을 각각 좋고 나쁜 점수로 더해 사건을 정하지는 않습니다.\n\n'+(input.next?'다음 '+input.next.g+input.next.j+' 대운은 표의 '+input.next.age+'세부터 이어집니다. 앞선 시기에 만든 일과 관계도 이어지므로 한 해를 경계로 삶이 모두 바뀐다고 보지는 않습니다.':'현재 표의 마지막 구간으로, 이후 시기를 이 자료만으로 확정하지 않습니다.')+' 표시 연도는 대운표의 나이 기준을 옮긴 범위이며 정확한 교운 날짜를 뜻하지 않습니다.');
    return {title:input.stem.char+input.branch.char+' 대운 · '+input.startYear+'–'+end+'년',intro:(neo?'이번 대운의 핵심은 ':'이번 열 해에는 ')+a.name+(a===b?'':', 그리고 '+b.name)+(neo?'입니다. 근거를 확인하고 감당할 수 있는 행동부터 정하세요.':'의 주제를 함께 살펴볼게요. 익숙한 강점과 새롭게 필요한 태도를 구분해 보세요.'),sections:section,warning:input.unknown?'출생시간 미상: 시주를 제외한 자리만 관계 설명에 표시했습니다. 정오를 대입한 원국의 비율·강약과 대운 시작 시기는 참고용이며 확정할 수 없습니다.':'해석은 현재 명식의 상징적 흐름을 설명하며 실제 사건·수익·관계의 결말을 보장하지 않습니다.'};
  }
  function cycleMarkup(input, selected) {
    var model=buildCycle(input,selected);if(!model)return '';
    return '<section class="saju-cycle-guide" data-cycle-age="'+esc(input.age)+'" data-cycle-gan="'+esc(input.stem.char)+'" data-cycle-zhi="'+esc(input.branch.char)+'"><h3>'+esc(model.title)+'</h3><p>'+esc(model.intro)+'</p><p class="saju-reading__uncertain">'+esc(model.warning)+'</p><dl>'+model.sections.map(function(section,index){return '<dt><strong>'+String(index+1).padStart(2,'0')+'. '+esc(section.title)+'</strong></dt><dd>'+section.text.split('\n\n').map(function(p){return '<p>'+esc(p)+'</p>';}).join('')+'</dd>';}).join('')+'</dl></section>';
  }

  function snapshot() {
    if (!root.G_PILLARS || !root.G_NATAL) return null;
    var p=root.G_PILLARS, ten={};
    [p.y.g,p.y.j,p.m.g,p.m.j,p.d.j,p.h.g,p.h.j].forEach(function(ch){var g=root.getTenGod(p.d.g,ch);if(g&&g!=='?')ten[g]=(ten[g]||0)+1;});
    var birth=root.G_KASI_CONTEXT||{};
    return {name:root.USER_NAME,p:p,natal:root.G_NATAL,ten:ten,johu:root.G_JOHU,power:root.G_POWER,jong:root.G_JONG,unknown:birth.unknownHour===true||birth.timeDefault===true||root.__cdSajuTimeUnknown===true,flow:flow};
  }
  function markup(reading, model, heading) {
    var c=langCopy(locale());
    return '<div class="saju-reading" data-reading-mode="'+model.mode+'">'+(heading?'<h3>'+esc(reading.title)+'</h3>':'')+'<div class="saju-reading__body">'+reading.blocks.map(function(b){return '<section><h4>'+esc(b.label)+'</h4><p>'+esc(b.text)+'</p></section>';}).join('')+'</div>'+(model.mode==='pig'?'<details class="saju-reading__evidence"><summary>'+esc(c.basis)+'</summary><p>'+esc(reading.evidence)+'</p></details>':'')+(model.unknown?'<p class="saju-reading__uncertain">'+esc(model.warning)+'</p>':'')+'</div>';
  }
  function letterMarkup(model) {
    var r=model.letter,c=langCopy(locale());
    return '<article class="saju-reading saju-letter" data-reading-mode="'+model.mode+'"><p class="saju-letter__greeting">'+esc(r.greeting)+'</p><div class="saju-letter__prose">'+r.paragraphs.map(function(text){return '<p>'+esc(text)+'</p>';}).join('')+'</div><p class="saju-letter__signature">'+esc(r.signature)+'</p><details class="saju-reading__evidence"><summary>'+esc(c.basis)+'</summary><p>'+esc(r.evidence)+'</p></details>'+(model.unknown?'<p class="saju-reading__uncertain">'+esc(model.warning)+'</p>':'')+'</article>';
  }
  function write(id, html) { var el=document.getElementById(id);if(el)el.innerHTML=html; }
  function ensureHeader() {
    var result=document.getElementById('resultPage');if(!result)return;
    if(!document.getElementById('sajuReadingHeader')) {var header=document.createElement('section');header.id='sajuReadingHeader';header.className='saju-reading-header';result.prepend(header);}
  }
  function controls() {
    var c=langCopy(locale()), selected=mode();
    return '<div class="saju-reading-switch" role="group" aria-label="'+esc(c.same)+'">'+['pig','neo'].map(function(m){return '<button type="button" data-saju-mode="'+m+'" aria-pressed="'+(selected===m)+'">'+esc(m==='neo'?c.neo:c.yeon)+'</button>';}).join('')+'</div>';
  }
  function renderHeader() {
    var c=langCopy(locale()), selected=mode(), neo=selected==='neo';ensureHeader();
    write('sajuReadingHeader','<img src="/images/saju/'+(neo?'neo-plan':'yeoni-clue')+'-160.webp" width="80" height="80" alt="" decoding="async"><div><h2>'+esc(neo?c.room:c.garden)+'</h2><p>'+esc(neo?c.neoIntro:c.yeonIntro)+'</p>'+controls()+'</div>');
    var form=document.getElementById('destinyCardForm');
    if(form&&!document.getElementById('sajuInputModes')){var host=document.createElement('div');host.id='sajuInputModes';host.className='saju-input-modes';form.prepend(host);}
    write('sajuInputModes',controls()+'<p>'+esc(neo?c.room:c.garden)+'</p>');
  }
  function render(section, supplied) {
    state=supplied||snapshot();var model=build(state,mode(),locale());if(!model)return;
    var c=langCopy(locale());
    // 한국어는 그래프·표가 있는 풍부한 판(reading-rich.js). 그 밖의 로케일과 자료 부족 시에는 기존 짧은 블록.
    var rich=locale()==='ko'&&root.SajuReadingRich?root.SajuReadingRich:null, facts=Object.assign({},state,{warning:c.unknown});
    if(section==='ilju'||section==='all') {
      var host=document.getElementById('iljuCard');
      if(host&&!document.getElementById('sajuElementReading')){var el=document.createElement('section');el.id='sajuElementReading';host.insertBefore(el,host.querySelector('.ilju-v2-grid')||host.firstChild);}
      write('sajuElementReading',markup(model.elements,model,true));
      if(host&&!document.getElementById('sajuIljuRich')){var box0=document.createElement('section');box0.id='sajuIljuRich';host.appendChild(box0);}
      var iljuRich=rich?rich.ilju(facts,model.mode):'';
      write('sajuIljuRich',iljuRich);
      // 풍부한 판은 renderIlju 가 채운 ILJU_DB 목록(요약·상세·조언)을 그대로 두고 그 아래에 원국 표·연이의 한마디를 덧붙인다.
      if(!iljuRich){
        write('iljuSummaryList','<li>'+esc(model.day.blocks[0].text)+'</li>');
        write('iljuDetailList',(model.mode==='neo'?'':'<li>'+esc(model.day.evidence)+'</li>')+'<li>'+esc(model.day.blocks[1].text)+'</li>');
        write('iljuAdviceList','<li>'+esc(model.day.blocks[2].text)+'</li>'+(model.unknown?'<li>'+esc(c.unknown)+'</li>':''));
      }
    }
    if(section==='ten'||section==='all') {
      var grid=document.getElementById('tsGrid');
      if(grid&&!document.getElementById('sajuTenOverview')){var box=document.createElement('section');box.id='sajuTenOverview';grid.parentNode.insertBefore(box,grid);}
      write('sajuTenOverview',rich?rich.tenOverview(facts,model.mode):'');
      write('tsGrid',(rich&&rich.tenCards(facts,model.mode))||model.ten.map(function(g){return '<button class="saju-ten-button" type="button" data-saju-god="'+esc(g.key)+'"><strong>'+esc(g.reading.title)+'</strong><span>'+esc(g.reading.blocks[0].text)+'</span><small>'+esc(c.more)+' · '+g.count+'</small></button>';}).join(''));
      if(openGod&&document.getElementById('tsModal')?.classList.contains('show')) showGod(openGod,false);
    }
    if(section==='climate'||section==='all') write('johuContent',(rich&&rich.climate(facts,model.mode))||markup(model.climate,model,false));
    if(section==='strength'||section==='all') write('ukbuSection',(rich&&rich.strength(facts,model.mode))||markup(model.strength,model,false));
    if(section==='flow'||section==='all') write('currentSeasonSummary',(rich&&rich.flow(facts,model.mode))||model.flow.map(function(r){return markup(r,model,true);}).join(''));
    if(section==='daily'||section==='all') daily.forEach(function(row,i){
      var gi=gods.indexOf(row.gGod), good=row.batteryPercent>=60;
      var title=i===0?c.today:c.month;
      var reading={title:title,evidence:fmt(c.flowBasis,{label:title,stem:row.gz.g,branch:row.gz.j,score:row.batteryPercent}),blocks:[]};
      reading.blocks=model.mode==='neo'?[{label:c.diagnosis,text:good?c.flowOpen:c.flowCare},{label:c.basis,text:reading.evidence},{label:c.action,text:gi>=0?c.godRules[gi]:c.strengthAction}]:[{label:c.observe,text:good?c.flowOpen:c.flowCare},{label:c.life,text:gi>=0?c.godLife[gi]:c.scenes[0]},{label:c.practice,text:gi>=0?c.godRules[gi]:c.strengthAction}];
      write(i===0?'dailyPanel':'monthlyPanel',(rich&&rich.daily(row,i,facts,model.mode))||markup(reading,model,true));
    });
    if(section==='letter'||section==='all') {write('letterTitle',esc(mode()==='neo'?c.neo:c.yeon)+' · '+esc(model.letter.title));write('letterContent',letterMarkup(model));}
    renderHeader();
  }
  function refreshCopy() {
    var c=langCopy(locale());
    document.querySelectorAll('[data-saju-copy]').forEach(function(el){var key=el.getAttribute('data-saju-copy');if(c[key])el.textContent=c[key];});
    var cat=document.querySelector('[data-soulcat-price]');
    if(cat)cat.textContent=root.__cdSajuCatPrice?fmt(c.catPrice,{price:new Intl.NumberFormat(locale(),{style:'currency',currency:'KRW',maximumFractionDigits:0}).format(root.__cdSajuCatPrice)}):c.pricePending;
    document.querySelectorAll('[data-saju-offer]').forEach(function(el){
      var key=el.getAttribute('data-saju-offer');
      if(el.dataset.readingLocale===locale()+':'+mode())return;
      el.dataset.readingLocale=locale()+':'+mode();
      var sample=build({p:{d:{g:'辛',j:'酉',gE:'metal'}},natal:{dominant:'metal',ratios:{wood:100/3,fire:100/9,earth:100/9,metal:400/9,water:0}},ten:{'비견':2},flow:[{kind:'period',g:'甲',j:'午',score:60}]},mode(),locale());
      var price=document.querySelector('[data-saju-price-key="'+key+'"]');
      el.innerHTML='<img class="saju-static-offer__guide" src="/images/saju/'+(mode()==='neo'?'neo-plan-160.webp':'yeoni-moonlight-reading.webp')+'" width="384" height="256" alt="" loading="lazy" decoding="async"><h3>'+esc(key==='section_daewun'?c.daeunTitle:c.summaryTitle)+'</h3><strong class="saju-static-offer__price">'+esc(price?price.textContent:c.pricePending)+'</strong><p>'+esc(key==='section_daewun'?c.paidDaeun:c.paidSummary)+'</p><p>'+esc(c.paidDifference)+'</p><details data-saju-sample="'+key+'"><summary>'+esc(c.sample)+'</summary>'+markup(key==='section_daewun'?sample.flow[0]:sample.elements,sample,false)+'<p>'+esc(c.sampleNote)+'</p></details><p>'+esc(c.inputs)+'</p><p>'+esc(c.recovery)+'</p>';
    });
  }
  function showGod(key, open) {
    var data=snapshot(), model=build(data,mode(),locale());if(!model)return false;
    var item=model.ten.find(function(g){return g.key===key;});if(!item)return false;
    var rich=locale()==='ko'&&root.SajuReadingRich?root.SajuReadingRich.godDetail(key,Object.assign({},data,{warning:langCopy(locale()).unknown}),model.mode):'';
    root.ensureSajuDetailModal();openGod=key;write('modalBody',rich||markup(item.reading,model,true));if(open!==false)root.openSajuDetailModal();return true;
  }
  var preserving = false;
  function preserve(callback) {
    if(preserving){callback();return;}
    preserving=true;
    var visible=Array.from(document.querySelectorAll('#sajuReadingHeader, #resultPage .card[id]')).filter(function(e){var r=e.getBoundingClientRect();return r.height>0&&r.bottom>0&&r.top<innerHeight;}).sort(function(a,b){return Math.abs(a.getBoundingClientRect().top)-Math.abs(b.getBoundingClientRect().top);})[0];
    var offset=visible?visible.getBoundingClientRect().top:0, focus=document.activeElement, focusId=focus&&focus.id, focusMode=focus&&focus.getAttribute('data-saju-mode'), focusHost=focus&&focus.closest('#sajuInputModes')?'#sajuInputModes':'#sajuReadingHeader';
    var expanded=Array.from(document.querySelectorAll('#resultPage details')).map(function(e){var parent=e.parentElement.closest('[id]');return {el:e,parent:parent&&parent.id,index:parent?Array.from(parent.querySelectorAll('details')).indexOf(e):0,open:e.open};});
    callback();
    expanded.forEach(function(s){var parent=s.parent&&document.getElementById(s.parent);var e=s.el.isConnected?s.el:parent&&parent.querySelectorAll('details')[s.index];if(e)e.open=s.open;});
    requestAnimationFrame(function(){requestAnimationFrame(function(){if(visible&&visible.isConnected)window.scrollBy({top:visible.getBoundingClientRect().top-offset,behavior:'instant'});var f=focusId?document.getElementById(focusId):focusMode?document.querySelector(focusHost+' [data-saju-mode="'+focusMode+'"]'):null;if(f)f.focus({preventScroll:true});preserving=false;});});
  }
  function changed() {preserve(function(){render('all');refreshCopy();if(typeof root.refreshDaewunReadingGuide==='function')root.refreshDaewunReadingGuide();if(!root.G_PILLARS)renderHeader();});}
  root.SajuReadingPresentation={build:build,buildCycle:buildCycle,cycleMarkup:cycleMarkup,render:render,changed:changed,showGod:showGod,setFlow:function(rows){flow=rows.map(function(r){return Object.assign({},r);});render('flow');},setDaily:function(day,month){daily=[day,month];render('daily');},copy:langCopy,sourceCopy:copy,escape:esc,locale:locale,refreshCopy:refreshCopy};
  if(typeof document==='undefined')return;
  document.addEventListener('click',function(event){
    var button=event.target.closest('[data-saju-mode]');
    if(button){var selected=button.getAttribute('data-saju-mode');if(selected===mode())return;preserve(function(){var checkbox=document.getElementById('themeCheckbox');if(checkbox){checkbox.checked=selected==='neo';checkbox.dispatchEvent(new Event('change',{bubbles:true}));}});if(typeof root.cdTrack==='function')root.cdTrack('saju_reading_mode_change',{mode:selected,surface:root.G_PILLARS?'result':'input'});}
    var god=event.target.closest('[data-saju-god]');if(god)showGod(god.getAttribute('data-saju-god'),true);
  });
  root.addEventListener('cd:locale-ready',changed);
  document.addEventListener('toggle',function(event){var el=event.target;if(el.open&&el.matches('[data-saju-sample]')&&typeof root.cdTrack==='function')root.cdTrack('saju_static_detail_view',{item_id:el.getAttribute('data-saju-sample'),mode:mode()});},true);
  function init(){renderHeader();refreshCopy();['yeoni-clue','neo-plan'].forEach(function(name){var asset=new Image();asset.decoding='async';asset.src='/images/saju/'+name+'-160.webp';});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(typeof window==='undefined'?globalThis:window);
