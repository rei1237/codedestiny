/* Display-only saju reading. No calculation, access checks, storage of results, or requests. */
(function (root) {
  'use strict';
  var elements = ['wood', 'fire', 'earth', 'metal', 'water'];
  var gods = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];
  var copy = {
    ko: {
      yeon: '연이', neo: '영냥이', garden: '연이의 달빛 사주', room: '영냥이의 별빛 다락방',
      same: '기본 사주는 연이와 영냥이가 함께 맡아요. 같은 계산 근거를 바탕으로, 원하는 마스터의 해설을 골라 읽어보세요.',
      compareNeo: '영냥이 상담으로 전환하기', compareYeon: '연이 상담으로 전환하기',
      observe: '연이가 발견한 단서', life: '생활에서 만나는 모습', practice: '오늘의 작은 실천', diagnosis: '영냥이가 짚은 핵심', basis: '계산 근거', action: '행동 기준',
      element: '오행의 분포', temperament: '타고난 기질', ten: '십성으로 읽는 역할', climate: '조후 · 계절의 감각', strength: '억부 · 힘을 쓰는 방식', flow: '현재 흐름', letter: '편지',
      names: ['목(木)', '화(火)', '토(土)', '금(金)', '수(水)'],
      traits: ['새 일을 시작하고 방향을 넓혀 가는 힘', '생각과 감정을 밖으로 표현하는 힘', '관계와 일을 안정적으로 이어 가는 힘', '기준을 세우고 불필요한 것을 정리하는 힘', '정보를 살피고 상황에 맞춰 움직이는 힘'],
      scenes: ['관심사가 많아 여러 일을 시작할 수 있어요. 끝맺을 자리를 남겨두면 성장의 힘이 더 잘 쓰입니다.', '대화에 생기를 더할 수 있어요. 마음이 앞설 때는 상대가 답할 틈도 함께 남겨보세요.', '익숙한 역할을 지키는 데 마음이 놓일 수 있어요. 다른 사람의 몫까지 떠안고 있는지도 살펴보세요.', '모호한 상황에서 기준을 찾을 수 있어요. 기준이 너무 촘촘해지면 나와 타인의 여유가 줄기도 합니다.', '쉽게 지나치는 변화를 알아차릴 수 있어요. 생각이 길어질 때는 작은 실행으로 확인해 보세요.'],
      actions: ['새 일을 더하기 전에 진행 중인 일 하나를 마무리해 보세요.', '중요한 말을 전한 뒤에는 상대의 반응을 기다려 보세요.', '이번 주 맡은 일에서 내가 책임질 범위를 한 줄로 적어 보세요.', '꼭 지킬 기준 하나와 유연하게 바꿀 기준 하나를 나눠 보세요.', '더 알아볼 것과 지금 시험해 볼 것을 하나씩 정해 보세요.'],
      rules: ['목표와 마감이 정해졌을 때 밀고 나가 봐. 시작만 자꾸 늘어난다면 새 과제부터 줄여 보자.', '전할 내용과 상대의 여유가 맞을 때 꺼내 봐. 감정이 앞설 때는 답을 재촉하지 않는 편이 좋아.', '책임과 쓸 수 있는 자원이 맞을 때 맡는 게 좋아. 네 몫이 계속 늘어난다면 범위를 다시 맞춰 보자.', '기준이 목적에 도움이 될 때 꺼내 써. 완벽하려다 멈춰 버린다면 최소 조건부터 정해 봐.', '확인할 질문이 분명할 때 알아봐. 정보만 쌓인다면 작게 시험해 볼 날짜부터 정해 봐.'],
      godNames: ['비견 · 자기 기준', '겁재 · 경쟁과 협력', '식신 · 꾸준한 표현', '상관 · 질문과 개선', '편재 · 기회와 자원', '정재 · 관리와 축적', '편관 · 압박과 대응', '정관 · 책임과 질서', '편인 · 다른 관점', '정인 · 학습과 지지'],
      godTraits: ["스스로 방향을 정하고 싶어 하는 편이야.", "함께 뛰거나 겨룰 때 오히려 힘이 나는 편이야.", "같은 걸 되풀이하면서 표현을 다듬어 가는 쪽이지.", "익숙한 규칙도 그냥 넘기지 않고 한 번 따져 보는 편이야.", "여러 기회를 서로 이어 보고 싶어질 수 있어.", "약속과 자원을 꾸준히 챙기는 쪽이야.", "부담이 큰 일 앞에서 오히려 집중이 살아날 수도 있어.", "역할과 기준이 분명할 때 마음이 놓이는 편이야.", "낯선 관점을 만나면 깊이 파고들고 싶어지지.", "배우고 도움을 주고받으면서 준비하는 편이야."],
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
      paidDifference: '입력한 생년 정보로 계산한 명식에 맞춰 준비된 해설을 엮습니다. 무료 풀이에서 살펴본 기질을 바탕으로, 시기별 흐름과 주제별 해설을 이어 읽어보세요.',
      paidDaeun: '10년마다 달라지는 삶의 흐름과 해마다의 변화를 함께 읽어요. 일·관계·재물 해설에서 지금 준비할 선택을 살펴보세요.',
      paidSummary: '타고난 기질과 오행·십성, 성격과 관계, 삶의 전략, 올해와 내년의 처방까지 내 명식으로 한 번에 정리해 드려요.',
      recovery: '기존 계정과 프로필로 사주 결과를 다시 열고 해당 풀이의 해금 상태를 확인하세요. 결제 후 열리지 않으면 새로 결제하지 말고 결제 내역과 함께 고객센터에 문의하세요.',
      inputs: '현재 사주에 입력한 생년 정보와 계산값을 사용합니다. 출생시간을 모르면 시간에 의존하는 해석은 참고 범위가 제한됩니다.',
      pricePending: '가격 확인 중', priceUnavailable: '가격은 결제 안내에서 확인해 주세요', summaryTitle: '라이트 사주 풀이', daeunTitle: '대운 분석 · 지금부터 다음 시기까지', graphTitle: '대운 흐름 비교', yeonIntro: '달빛 아래 한 장씩, 타고난 마음과 지금의 계절을 함께 읽어볼게요.', neoIntro: '흐름의 근거부터 짚어 줄게. 그다음 지금 해 볼 작은 걸음 하나를 같이 고르자.', paidRead: '풀이 확인하기',
      catTitle: '영냥이 상담', catPurpose: '명식의 흐름을 고양이 상담사와', catGo: '살펴보기', catPrice: '{price}부터',
      letterVerdictJong: '한 방향으로 흐르는 힘을 따라가는 구조', letterVerdictStrong: '스스로 길을 내는 힘이 비교적 넉넉한 구조', letterVerdictWeak: '곁의 도움과 준비된 시간이 있을 때 더 편안히 빛나는 구조',
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
      letterSynthesis: '이 편지를 여는 순간의 당신과 마지막 문장 앞에 선 지금의 당신은, 어쩌면 조금 다른 마음일지도 몰라요. {image} {observation} 그리고 지금 이 시기의 당신은 {verdict}로 흘러가고 있어요. 서로 다른 이야기처럼 보이지만, 결국 이 모든 결은 한 사람 — 바로 당신을 가리키고 있어요. 타고난 결과 지금의 흐름이 이렇게 겹쳐 보이는 건 흔한 일이 아니에요. 그러니 오늘 이 풀이에서 다른 건 다 잊더라도, 지금의 당신이 이미 당신답게 흘러가고 있다는 사실 하나만은 마음에 남겨두셨으면 해요.',
      letterClosing: '찻잔을 내려놓을 때처럼, 오늘 읽은 말도 잠시 곁에 놓아두세요. 마음에 남은 문장은 간직하고, 나와 맞지 않는 말은 흘려보내도 좋아요. 당신의 삶을 가장 가까이에서 살아온 사람은 당신이니까요. 다음 걸음이 아직 선명하지 않더라도, 자신을 다그치지 않고 선택할 여유가 곁에 남기를 연이가 바라요.',
      neoLetterTitle: '별빛 아래 남기는 쪽지', neoGreeting: '{name}, 마지막으로 하나만 같이 짚어 보자.', neoSignature: '영냥이 · 다음 걸음은 네가 고르는 거야',
      neoDominant: '{element} {value}%가 상대적으로 눈에 띄어. {trait}을 살펴볼 단서야.',
      neoTied: '여러 오행이 가장 큰 비중을 나눠 갖고 있어. 한 가지 성향으로 묶기보다 상황마다 네가 어떻게 반응하는지 살펴봐.',
      neoScenes: ['새 일을 여러 개 벌이는 편이라면, 끝맺는 데 쓸 시간도 같이 잡아 봐.', '표현에 힘이 실리는 편이라면, 상대가 답할 틈도 남겨 둬.', '맡은 역할을 지키다가 다른 사람 몫까지 떠안고 있는 건 아닌지 살펴봐.', '기준이 분명한 건 네 강점이야. 다만 기준을 지키느라 목적을 놓치고 있진 않은지 한번 돌아봐.', '작은 변화를 잘 알아차리는 편이라면, 관찰을 실행으로 옮길 시점도 정해 봐.'],
      neoActions: ['새 과제를 늘리기 전에 하던 일 하나의 마감부터 정해 봐.', '전할 말과 상대가 들을 여유를 먼저 살피고, 말한 뒤에는 답을 기다려 봐.', '맡을 일의 범위와 쓸 수 있는 시간을 먼저 적어 봐.', '꼭 지킬 기준 하나와 바꿔도 되는 기준 하나를 나눠 봐.', '확인할 질문 하나와 작게 시험해 볼 일 하나를 정해 봐.'],
      letterGuestGreeting: '이 편지를 읽는 당신께,', neoGuestGreeting: '마지막으로 하나만 같이 짚어 보자.',
      neoOpening: '흥, 긴 풀이 읽느라 고생했어. 명식은 흐름을 살피는 참고 자료지, 결정을 대신 내려 주는 지시서가 아니야. 맞는 대목은 써먹고, 실제 경험과 어긋나는 해석은 잠깐 내려놔도 돼. 지금 너한테 필요한 건 좋은 말 여러 개보다 직접 해 볼 기준 하나거든.',
      neoClue: '{observation} 여기서 볼 건 잘나고 못남이 아니라 힘을 쓰는 방식이야. {scene} 이런 패턴이 정말 반복되는지 최근에 한 선택부터 떠올려 봐.',
      neoStrong: '일간을 돕는 힘이 비교적 큰 편이야. 혼자서도 밀고 나갈 수 있으니까 이것저것 다 끌어안기 쉬울 수도 있어. 자신감이 있어도 시간과 자원이 같이 늘어나는 건 아니거든. 맡을 일과 나눌 일을 먼저 갈라 보고, 다른 의견을 들을 자리도 하나 만들어 봐.',
      neoWeak: '일간에 비해 주변에서 바라는 게 큰 구조야. 능력이 부족하다는 뜻은 아니야. 준비할 시간과 기댈 곳 없이 역할부터 늘리면 금방 지칠 수도 있어. 혼자 버겁다면 범위를 줄이거나 도움을 청하는 것도 충분히 좋은 선택이야.',
      neoJong: '한 방향의 기세를 따르는 종격 가능성이 검토됐어. 그러니까 보통의 강약 공식으로 바로 결론 내리진 말자. 환경에 맞춰 움직였을 때 실제로 잘 풀렸는지부터 떠올려 봐.',
      neoAction: '오늘 해 볼 건 간단해. {action} 언제 해 볼지, 무엇을 보고 잘됐는지 판단할지도 같이 적어 둬. 해 보고 안 맞으면 방법을 바꾸면 돼. 계획을 고치는 건 지는 게 아니라 너한테 맞는 길을 찾아가는 과정이니까.',
      neoClosing: '관계든 일이든 명식만 보고 큰 결론을 내리진 마. 상대의 실제 행동, 약속한 조건, 감당할 비용을 같이 봐 줘. 나는 너를 몰아붙이려는 게 아니야. 네 선택이 조금 더 선명해지길 바랄 뿐이지. 오늘 움직일 수 있는 만큼만 시작해 보자냥.',
      endYeon: '오늘 읽은 모든 문장을 나에게 맞추려 애쓰지 않아도 괜찮아요. 실제 내 모습과 맞닿은 단서 하나부터 천천히 살펴보세요.',
      endNeo: '명식은 선택을 대신해 주지 않아. 맞는 근거와 안 맞는 해석을 가려 보고, 오늘 확인해 볼 행동 하나만 정해 봐.',
      // 영냥이(neo) 전용 반말 판. 같은 이름의 공유 키(존댓말)를 neo 경로에서만 대신한다 — pick() 참고. 한국어에만 있고 다른 로케일은 공유 키로 돌아간다.
      dominantNeo: '{element} {value}%가 상대적으로 두드러져. {trait}을 살펴볼 단서야.',
      balancedNeo: '가장 큰 비율이 여러 오행에 걸쳐 있어. 하나의 성향으로 묶기보다 상황마다 달라지는 힘을 살펴 봐.',
      distributionNeo: '월지 가중치를 넣은 기존 계산 비율이야. 많고 적음이 우열이나 성공 확률을 뜻하진 않아.',
      dayBasisNeo: '일간 {stem} · 일지 {branch}. 일간은 너를 읽는 기준 글자야. 여기서는 {element}의 상징을 생활 말로 풀어 볼게.',
      godBasisNeo: '지금 명식에서 {name}이 {count}곳에 나타나. 일간과 다른 글자의 관계를 센 값이라서 성격을 확정하는 진단은 아니야.',
      unknownNeo: '출생시간 미상: 정오를 대입한 참고 계산이야. 시주와 시간에 영향을 받는 오행 비율·강약·시기 해석은 확정할 수 없어.',
      coldNeo: '차가운 쪽의 조후 신호야. 뭔가 시작하기 전에 몸과 마음이 준비될 시간을 챙겨 봐.',
      hotNeo: '따뜻한 쪽의 조후 신호야. 속도를 올릴 땐 회복할 간격도 같이 잡아 봐.',
      neutralNeo: '온도 점수가 가운데에 있어. 한쪽으로 보완하기보다 실제 생활 리듬부터 관찰해 봐.',
      climateBasisNeo: '조후 온도 점수 {score} · 습한 신호 {wet} / 건조한 신호 {dry}. 계절과 글자의 상징으로 계산한 값이고, 건강 진단은 아니야.',
      climateActionNeo: '잘 지낸 날의 활동과 휴식 간격을 적어 봐. 상징 점수보다 실제 컨디션을 기준으로 조절하면 돼.',
      strongNeo: '일간을 받쳐 주는 힘이 비교적 큰 구조야. 혼자 끌고 가는 힘이랑 나눠 맡기는 여유를 같이 살펴 봐.',
      weakNeo: '일간의 힘에 비해 주변 역할이 바라는 게 큰 구조야. 도움과 준비 시간을 확보하는 방식이 단서가 될 수 있어.',
      jongNeo: '한 방향의 기세를 따르는 종격 가능성이 검토된 구조야. 보통의 신강·신약 조언을 그대로 대지는 않아.',
      strengthBasisNeo: '기존 억부 점수 {score} · 보완 후보 {support}. 점수는 네 능력이나 가치를 매기는 등급이 아니야.',
      strengthActionNeo: '역할을 늘리기 전에 시간과 지원부터 확인해 봐. 고른 뒤의 집중력·소모·회복을 적어 두고 기준을 조정하면 돼.',
      flowBasisNeo: '{label} {stem}{branch} · 기존 평가 점수 {score}. 길흉을 확정하는 예측이 아니라 흐름을 비교하는 참고값이야.',
      flowOpenNeo: '기존 평가에서 비교적 수월한 쪽으로 읽히는 흐름이야. 준비해 온 일을 작은 범위에서 시험해 봐.',
      flowCareNeo: '기존 평가에서 조율이 필요한 쪽으로 읽히는 흐름이야. 속도를 낮추고 역할과 일정을 정돈해 봐.',
      flowRuleOpenNeo: '자원과 계획이 준비됐을 때 작은 실행부터 시작해 봐. 점수가 결과를 보장하진 않아.',
      flowRuleCareNeo: '일정을 조정하고 선택지를 남겨 둬. 점수만 보고 관계·직업·투자의 결론을 내리진 마.',
      godRulesNeo: ['혼자 정할 일과 같이 정할 일을 나누고, 협의가 필요한 일엔 의견부터 확인해 봐.', '경쟁 전에 비용과 역할부터 맞춰 둬. 비교가 목표를 바꾸기 시작하면 잠깐 멈춰도 돼.', '반복할 수 있는 분량으로 시작해 봐. 완성한 결과를 기준으로 다음 단계를 정하면 돼.', '문제를 짚을 땐 대안도 같이 내 봐. 상대를 평가하는 말은 빼는 게 좋아.', '기회마다 필요한 시간과 손실 한도를 적어 봐. 범위를 넘으면 보류해도 돼.', '수입·지출과 약속을 기록해 둬. 안정이 좋다고 필요한 변화까지 미루진 마.', '압박을 감당할 자원부터 확인해 봐. 수면과 회복이 무너지면 일을 나누는 게 좋아.', '책임 범위부터 확인해 봐. 규칙이 목적과 어긋나면 근거를 들고 조정하면 돼.', '직관은 가설로 두고 실제 사례로 확인해 봐. 근거 없이 큰 결정은 내리지 마.', '배운 것 하나를 직접 써 봐. 도움을 받더라도 마지막 선택은 네가 한 번 더 점검해 봐.']
    },
    en: {
      "yeon": "Yeoni",
      "neo": "Yeongnyangi",
      "garden": "Yeoni’s moonlit saju",
      "room": "Yeongnyangi’s starlit attic",
      "same": "Yeoni and Yeongnyangi both guide the basic saju reading. Choose the voice you prefer; both use the same chart calculations.",
      "compareNeo": "Switch to Yeongnyangi’s reading",
      "compareYeon": "Switch to Yeoni’s reading",
      "observe": "What Yeoni notices",
      "life": "In everyday life",
      "practice": "One small practice",
      "diagnosis": "What Yeongnyangi notices",
      "basis": "Chart evidence",
      "action": "Decision criteria",
      "element": "Five-element balance",
      "temperament": "Natural temperament",
      "ten": "Roles in the Ten Gods",
      "climate": "Seasonal balance",
      "strength": "How support is distributed",
      "flow": "Current cycles",
      "letter": "Letter",
      "names": [
        "Wood",
        "Fire",
        "Earth",
        "Metal",
        "Water"
      ],
      "traits": [
        "starting and developing ideas",
        "expressing thoughts and feelings",
        "sustaining commitments",
        "setting standards and simplifying",
        "observing and adapting"
      ],
      "scenes": [
        "You may start several things at once. Leave room to finish them.",
        "You may bring energy to conversations. Give others time to respond.",
        "Familiar responsibilities may feel reassuring. Check whether you are carrying someone else’s share.",
        "Clear standards may help with uncertainty. Too many rules can leave little room to breathe.",
        "You may notice subtle changes. When reflection stretches on, try a small experiment."
      ],
      "actions": [
        "Finish one existing task before adding another.",
        "Pause after an important message and listen to the response.",
        "Write down the boundary of one responsibility this week.",
        "Separate one essential standard from one flexible preference.",
        "Choose one thing to research and one thing to test now."
      ],
      "rules": [
        "Proceed with a clear goal and deadline. Reduce new tasks if unfinished work grows.",
        "Speak when the message and the listener’s availability align. Do not press for an immediate answer.",
        "Accept a role when resources match its demands. Renegotiate a growing workload.",
        "Apply standards that serve the goal. Define a minimum if perfection stalls progress.",
        "Research a specific question. Set a small test deadline if information only accumulates."
      ],
      "godNames": [
        "Peer · autonomy",
        "Competitor · cooperation",
        "Expression · consistency",
        "Challenger · improvement",
        "Opportunity · resources",
        "Stewardship · accumulation",
        "Pressure · response",
        "Responsibility · order",
        "Insight · perspective",
        "Learning · support"
      ],
      "godLife": [
        "Making your own decisions may feel comfortable. Hear another view too.",
        "Working alongside others may energise you. Notice when comparison becomes draining.",
        "Regular practice and expression may help you develop a skill.",
        "You may question familiar rules. Explain the reason for a proposed change.",
        "Connecting opportunities may interest you. Check what you can realistically manage.",
        "Keeping small financial commitments and promises may bring stability.",
        "Demanding tasks may focus your attention. Make recovery part of the schedule.",
        "Clear roles may feel comfortable. Practise adjusting when expectations change.",
        "You may explore unfamiliar perspectives deeply. Test them against experience.",
        "Learning and support may renew your energy. Put one lesson into practice."
      ],
      "godRules": [
        "Separate individual from shared decisions and consult where needed.",
        "Agree on costs and roles before competing. Pause if comparison replaces the goal.",
        "Start with a repeatable workload. Use completed work to plan the next step.",
        "Offer an alternative when identifying a problem. Avoid judging the person.",
        "List time and downside limits for each opportunity. Defer what exceeds them.",
        "Record income, costs and commitments. Do not let stability prevent necessary change.",
        "Check resources before accepting pressure. Share work if rest suffers.",
        "Clarify responsibility. Adjust rules with evidence when they undermine their purpose.",
        "Treat intuition as a hypothesis. Verify before making a major decision.",
        "Apply one lesson directly. Review the final choice even when receiving help."
      ],
      "distribution": "Existing chart ratios include the month-branch weighting. A larger share is not a rank or a probability of success.",
      "dominant": "{element} at {value}% is relatively prominent: a clue to {trait}.",
      "balanced": "Several elements share the largest proportion. Consider how different situations bring out different strengths.",
      "dayBasis": "Day stem {stem} · day branch {branch}. The day stem is the reference for this reading; here its {element} symbolism is translated into daily life.",
      "godBasis": "{name} appears in {count} chart positions. This counts relationships to the day stem, not a definitive personality diagnosis.",
      "unknown": "Birth time unknown: noon is used as a reference. The hour pillar and time-dependent ratios, strength and timing cannot be treated as certain.",
      "cold": "The seasonal score leans cooler. Notice what helps you prepare before starting an activity.",
      "hot": "The seasonal score leans warmer. Leave recovery intervals when increasing your pace.",
      "neutral": "The temperature score is centred. Observe your actual routine rather than compensating in one direction.",
      "climateBasis": "Temperature score {score} · moist signals {wet} / dry signals {dry}. These are symbolic seasonal calculations, not a medical assessment.",
      "climateAction": "Record activity and rest on days that went well. Adjust to actual wellbeing, not a symbolic score.",
      "strong": "The day stem receives relatively strong support. Consider both independent effort and sharing responsibilities.",
      "weak": "Surrounding demands are relatively large compared with support for the day stem. Preparation and help are useful questions to explore.",
      "jong": "The engine considers a following structure. Ordinary strong/weak advice does not apply unchanged.",
      "strengthBasis": "Existing support score {score} · balancing candidates {support}. This does not rank your ability or worth.",
      "strengthAction": "Check time and support before adding a responsibility. Review focus, effort and recovery after the choice.",
      "flowBasis": "{label} {stem}{branch} · existing score {score}. A comparison aid, not a certain prediction.",
      "flowOpen": "The existing assessment reads this as relatively supportive. Test a prepared idea on a small scale.",
      "flowCare": "The existing assessment suggests adjustment. Review pace, responsibilities and schedules.",
      "flowRuleOpen": "Start small when resources and plans are ready. A score does not guarantee an outcome.",
      "flowRuleCare": "Adjust schedules and keep options open. Do not make relationship, career or investment decisions from a score alone.",
      "period": "Current ten-year cycle",
      "year": "Current annual cycle",
      "more": "Read more",
      "sample": "Sample · a fictional chart",
      "sampleNote": "An example of the format, not your personal result.",
      "paidDifference": "Prepared explanations are matched to the chart calculated from your birth details. Build on the temperament covered in the free reading with longer-term cycles and themed interpretations.",
      "paidDaeun": "Read how life shifts every ten years and from year to year, and see which choices to prepare for now in work, relationships and money.",
      "paidSummary": "Your temperament, elements and Ten Gods, personality and relationships, life strategy, and guidance for this year and next, gathered into one reading of your chart.",
      "recovery": "Reopen the chart with the same account and profile and check access. If payment succeeded but access is missing, do not pay again; contact support with the payment record.",
      "inputs": "Uses the birth information and calculations already entered for this chart. Unknown birth time limits time-dependent interpretation.",
      "pricePending": "Checking price",
      "priceUnavailable": "Confirm the price in the payment information",
      "paidRead": "View reading",
      "catTitle": "Yeongnyangi readings",
      "catPurpose": "Explore your chart with the cat guide",
      "catGo": "Explore",
      "catPrice": "From {price}",
      "endYeon": "You do not need to fit every sentence. Start with one clue that connects with your own experience.",
      "endNeo": "A chart does not decide for you. Separate supported observations from mismatches and choose one action to test.",
      "catFree": "Free fortune",
      "today": "Today’s cycle",
      "month": "This month’s cycle",
      "summaryTitle": "Light saju reading",
      "daeunTitle": "Ten-year cycles: from now to the next phase",
      "graphTitle": "Cycle comparison",
      "godTraits": [
        "A preference for self-directed choices",
        "Energy from cooperation and competition",
        "Expression refined through practice",
        "A habit of reviewing familiar rules",
        "Interest in connecting opportunities",
        "Steady attention to resources and commitments",
        "Focus on demanding tasks",
        "Attention to roles and standards",
        "Deep exploration of unfamiliar views",
        "Preparation through learning and support"
      ],
      "neoIntro": "I’ll start with the reasons behind the patterns. Then let’s choose one small step you can try now.",
      "letterGreeting": "Dear {name},",
      "letterGuest": "You, the reader of this letter",
      "letterSignature": "With all my heart, Yeoni",
      "letterOpening": "As you read the longer interpretation, perhaps some lines made you nod, while others gave you a moment’s pause. Today, rather than rushing to settle on an answer, I would like to leave this letter as though we were sitting over a warm cup of tea, with time to hear a little more of your story.",
      "letterDay": "Your Day Master—the reference point used to read you in the chart—is {stem}. {image} If that picture feels familiar, take your time recalling where you have been using that strength lately. Your innate temperament is not homework you must live up to; it is a clue that may help you misunderstand yourself a little less.",
      "letterImages": [
        "Picture a tall tree extending its branches: choosing a direction and moving forward, one step at a time.",
        "Picture grass and vines finding room to grow: taking in your surroundings and adjusting your path.",
        "Picture sunlight brightening a room: sharing your thoughts and feelings with the world around you.",
        "Picture a small lamp lighting the space nearby: paying close attention to the people and work you care about.",
        "Picture a mountain holding its ground: looking for a steady center when circumstances are unsettled.",
        "Picture soil holding a seed: tending the small conditions of everyday life and giving growth time to bear fruit.",
        "Picture sharpening a tool’s edge: untangling complicated matters and making the decisions that are needed.",
        "Picture examining a gemstone’s grain: noticing subtle differences and caring for the standards you value.",
        "Picture a river finding its way: considering many possibilities and allowing your thoughts to range widely.",
        "Picture quiet rain soaking into the ground: looking deeply at the hints and feelings others might pass by."
      ],
      "letterBalance": "In the distribution of the Five Elements, {observation} {scene} Even a strength that serves you well can become a burden when it is used without rest. And a smaller share of an element does not mean you lack the ability it represents. Rather than trying to fill a numerical gap, consider both the ways of living that have felt comfortable and the moments that have left you tired.",
      "letterTied": "Several elements appear in similar proportions. Instead of defining you through a single trait, I would like to make room for the feelings that change with your circumstances. The you who takes the lead one day and the you who quietly observes another day are both you.",
      "letterStrong": "The chart suggests relatively strong support for your Day Master. If you are used to setting your own direction, it may help to notice whether you are carrying everything simply because you can manage on your own. Asking for help does not mean giving up your strength. It can mean sharing the load so that strength lasts longer.",
      "letterWeak": "The chart reads the demands around you as greater than the support for your Day Master. That does not mean you are weak-hearted or lack ability. Think of it as a reminder that your own strength can feel easier to use when you have time to prepare, someone to talk things through with, and somewhere to rest.",
      "letterJong": "The chart has been considered for a following structure, in which momentum gathers in one direction. Rather than describing you with the single word “strong” or “weak,” it may be more useful to notice the environments in which your energy carries forward naturally. Please place your own lived experience ahead of the interpretation.",
      "letterCare": "If things have not been going as you hoped lately and you have become harder on yourself, I hope you will not tie the result directly to your worth. A difficult time is not necessarily a sign that something good is about to arrive. But you can still choose something that eases today’s burden: take one task off your list, or tell someone you trust what is happening. A small choice is enough to begin.",
      "letterPractice": "If you take just one thing from this letter today, perhaps you could begin here: {action} This is not an assignment to impress someone else. It is a small experiment to see whether your day can become a little more comfortable. If it does not suit you, it is fine to choose another approach.",
      "letterSynthesis": "The you who opened this letter and the you now approaching its last lines may be feeling a little differently. {image} {observation} At this point in your life, the chart also suggests {verdict}. These may look like separate stories, yet all their textures point to one person: you. The meeting of your innate patterns and present circumstances offers a particular picture of who you are now. Even if the rest of today’s reading fades, I hope you will keep this one thought close: you are already finding your own way through your life.",
      "letterClosing": "As you might set down a teacup, let the words you have read rest beside you for a while. Keep the sentences that stay with you, and let the ones that do not fit pass by. You are the person who has lived closest to your own life. Even if the next step is not yet clear, Yeoni hopes you will keep enough room beside you to choose without pushing yourself too hard.",
      "neoLetterTitle": "A note beneath the stars",
      "neoGreeting": "{name}, let’s look at one last thing together.",
      "neoSignature": "Yeongnyangi · The next step is yours to choose",
      "neoDominant": "{element} at {value}% stands out relatively strongly. It is a clue to explore {trait}.",
      "neoTied": "Several elements share the largest proportion. Rather than boxing yourself into one trait, notice how you respond in different situations.",
      "neoScenes": [
        "If you tend to start several new things, set aside time to finish them too.",
        "If expression comes strongly to you, leave room for the other person to respond.",
        "Check whether holding on to your responsibilities has led you to carry someone else’s share too.",
        "Clear standards are a strength. Just check whether protecting those standards has made you lose sight of the goal.",
        "If you notice small changes readily, decide when to turn those observations into action."
      ],
      "neoActions": [
        "Before adding a new task, set a deadline for one you already have.",
        "First consider what you want to say and whether the other person has room to hear it. After speaking, wait for their response.",
        "Write down the scope of the work and the time you can give it before taking it on.",
        "Separate one standard you must keep from one you can change.",
        "Choose one question to verify and one small thing to try."
      ],
      "letterGuestGreeting": "To you, reading this letter,",
      "neoGuestGreeting": "Let’s look at one last thing together.",
      "neoOpening": "Hmph, you made it through a long reading. A chart is a reference for noticing patterns, not an instruction manual that makes decisions for you. Use what fits, and put aside interpretations that do not match your experience. What you need now is less a collection of pleasant words and more one practical criterion you can try for yourself.",
      "neoClue": "{observation} The point here is how you use your energy, not whether you are better or worse. {scene} Think back to a recent choice and check whether this pattern really does repeat.",
      "neoStrong": "Support for the Day Master is relatively strong. Being able to push ahead alone can make it tempting to take everything on. But confidence does not automatically give you more time or resources. Start by separating what you will handle from what you can share, and make room to hear one other perspective.",
      "neoWeak": "The demands around you are large relative to the Day Master. That does not mean you lack ability. If you keep adding roles without time to prepare or support to lean on, you may tire quickly. When the load feels too heavy alone, reducing its scope or asking for help is a perfectly sound choice.",
      "neoJong": "The chart has been considered for a following structure, where the momentum runs in one direction. So let’s not jump to a conclusion using the usual strong-versus-weak formula. First recall whether adapting to the environment has actually helped things go well in your experience.",
      "neoAction": "Today’s experiment is simple. {action} Write down when you will try it and what will tell you whether it helped. If it does not fit once you try it, change the approach. Revising a plan is not losing; it is part of finding a path that works for you.",
      "neoClosing": "Whether it is a relationship or work, do not make a major decision from the chart alone. Look at what people actually do, the terms you agreed to and the costs you can bear. I am not trying to corner you. I only want your choices to become a little clearer. Start with whatever you can genuinely do today, meow.",
      "letterVerdictJong": "a structure that follows momentum gathering in one direction",
      "letterVerdictStrong": "a structure with relatively ample strength to make your own path",
      "letterVerdictWeak": "a structure that shines more comfortably with support nearby and time to prepare"
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
  // 영냥이 경로는 <key>Neo(한국어 반말 판)가 있으면 그것을, 없으면(다른 로케일) 공유 키를 쓴다. 연이 경로는 늘 공유 키.
  function pick(c, key, neo) { return neo && c[key + 'Neo'] != null ? c[key + 'Neo'] : c[key]; }
  // 풀이 화자(연이/영냥이)는 라이트·다크 테마(fortuneThemeModeStateV1)와 따로 cdSajuPersonaV1 에 둔다.
  // 'neo' 는 영냥이의 내부 값이다 — 서버 API·section-client 가 같은 이름을 쓴다.
  var PERSONA_KEY = 'cdSajuPersonaV1';
  function mode() { try { return root.localStorage.getItem(PERSONA_KEY) === 'neo' ? 'neo' : 'pig'; } catch (_) { return 'pig'; } }
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
    var evidence = elements.map(function (e,i) { return c.names[i]+' '+ratios[i].toFixed(0)+'%'; }).join(' · ') + '. ' + pick(c,'distribution',neo);
    var elementText = tied ? pick(c,'balanced',neo) : fmt(pick(c,'dominant',neo),{element:c.names[dominant],value:ratios[dominant].toFixed(0),trait:c.traits[dominant]});
    var model = { mode:selected, unknown:input.unknown===true, warning:pick(c,'unknown',neo), ratios:ratios, elements:section(c.element,elementText,evidence,c.scenes[dominant],neo?c.rules[dominant]:c.actions[dominant]) };
    model.day = section(c.temperament,c.names[day]+' · '+c.traits[day],fmt(pick(c,'dayBasis',neo),{stem:p.d.g,branch:p.d.j,element:c.names[day]}),c.scenes[day],neo?c.rules[day]:c.actions[day]);
    model.ten = gods.filter(function (g) { return input.ten[g]>0; }).map(function (g) {
      var i=gods.indexOf(g), basis=fmt(pick(c,'godBasis',neo),{name:c.godNames[i],count:input.ten[g]});
      return { key:g, count:input.ten[g], reading:section(c.godNames[i],neo?c.godTraits[i]:c.godLife[i],basis,c.godLife[i],pick(c,'godRules',neo)[i]) };
    });
    var j=input.johu||{}, pw=input.power||{}, jong=input.jong||{};
    var cool=j.type==='cool'||j.type==='cold', warm=j.type==='warm'||j.type==='hot';
    model.climate=section(c.climate,pick(c,cool?'cold':warm?'hot':'neutral',neo),fmt(pick(c,'climateBasis',neo),{score:j.score,wet:j.moistCnt,dry:j.dryCnt}),cool?c.scenes[4]:warm?c.scenes[1]:c.scenes[2],pick(c,'climateAction',neo));
    model.strength=section(c.strength,pick(c,jong.isJong?'jong':pw.isStrong?'strong':'weak',neo),fmt(pick(c,'strengthBasis',neo),{score:pw.score,support:(pw.yongshin||[]).map(function(e){return c.names[elements.indexOf(e)]||e;}).join(' · ')}),pw.isStrong?c.scenes[0]:c.scenes[2],pick(c,'strengthAction',neo));
    model.flow=(input.flow||[]).map(function(row) { var good=row.score>=60, tone=pick(c,good?'flowOpen':'flowCare',neo); return section(row.kind==='year'?c.year:c.period,tone,fmt(pick(c,'flowBasis',neo),{label:row.kind==='year'?c.year:c.period,stem:row.g,branch:row.j,score:row.score}),tone,pick(c,good?'flowRuleOpen':'flowRuleCare',neo)); });
    var name=String(input.name||'').trim();
    if(c.letterOpening && c.neoOpening) {
      var stemIndex=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'].indexOf(p.d.g);
      model.letter={title:neo?c.neoLetterTitle:c.letter, greeting:name?fmt(neo?c.neoGreeting:c.letterGreeting,{name:name}):(neo?c.neoGuestGreeting:c.letterGuestGreeting), signature:neo?c.neoSignature:c.letterSignature,
        paragraphs:neo?[c.neoOpening,fmt(c.neoClue,{observation:tied?c.neoTied:fmt(c.neoDominant,{element:c.names[dominant],value:ratios[dominant].toFixed(0),trait:c.traits[dominant]}),scene:c.neoScenes[dominant]}),jong.isJong?c.neoJong:pw.isStrong?c.neoStrong:c.neoWeak,fmt(c.neoAction,{action:c.neoActions[day]}),c.neoClosing]:[
          c.letterOpening,fmt(c.letterDay,{stem:p.d.g,image:c.letterImages[stemIndex<0?day*2:stemIndex]}),tied?c.letterTied:fmt(c.letterBalance,{observation:elementText,scene:c.scenes[dominant]}),jong.isJong?c.letterJong:pw.isStrong?c.letterStrong:c.letterWeak,c.letterCare,fmt(c.letterPractice,{action:c.actions[day]}),fmt(c.letterSynthesis,{image:c.letterImages[stemIndex<0?day*2:stemIndex],observation:elementText,verdict:jong.isJong?c.letterVerdictJong:pw.isStrong?c.letterVerdictStrong:c.letterVerdictWeak}),c.letterClosing], evidence:model.day.evidence};
    } else {
      model.letter={title:c.letter,greeting:neo?c.neo:c.yeon,signature:neo?c.neo:c.yeon,paragraphs:[elementText,c.scenes[day],neo?c.rules[day]:c.actions[day],neo?c.endNeo:c.endYeon],evidence:model.day.evidence};
    }
    return model;
  }
  var state = null, flow = [], daily = [], openGod = null;

  function snapshot() {
    if (!root.G_PILLARS || !root.G_NATAL) return null;
    var p=root.G_PILLARS, ten={};
    [p.y.g,p.y.j,p.m.g,p.m.j,p.d.j,p.h.g,p.h.j].forEach(function(ch){var g=root.getTenGod(p.d.g,ch);if(g&&g!=='?')ten[g]=(ten[g]||0)+1;});
    var birth=root.G_KASI_CONTEXT||{};
    var facts={name:root.USER_NAME,p:p,natal:root.G_NATAL,ten:ten,johu:root.G_JOHU,power:root.G_POWER,jong:root.G_JONG,unknown:birth.unknownHour===true||birth.timeDefault===true||root.__cdSajuTimeUnknown===true,flow:flow};
    if(root.SajuReadingDepth) facts.depth=root.SajuReadingDepth.buildDepthFacts(facts);
    return facts;
  }
  function markup(reading, model, heading) {
    var c=langCopy(locale());
    return '<div class="saju-reading" data-reading-mode="'+model.mode+'">'+(heading?'<h3>'+esc(reading.title)+'</h3>':'')+'<div class="saju-reading__body">'+reading.blocks.map(function(b){return '<section><h4>'+esc(b.label)+'</h4><p>'+esc(b.text)+'</p></section>';}).join('')+'</div>'+(model.mode==='pig'?'<details class="saju-reading__evidence"><summary>'+esc(c.basis)+'</summary><p>'+esc(reading.evidence)+'</p></details>':'')+(model.unknown?'<p class="saju-reading__uncertain">'+esc(model.warning)+'</p>':'')+'</div>';
  }
  function letterMarkup(model) {
    var r=model.letter,c=langCopy(locale());
    return '<article class="saju-reading saju-letter" data-reading-mode="'+model.mode+'"><p class="saju-letter__greeting">'+esc(r.greeting)+'</p><div class="saju-letter__prose">'+r.paragraphs.map(function(text){return '<p>'+esc(text)+'</p>';}).join('')+'</div><p class="saju-letter__signature">'+esc(r.signature)+'</p><details class="saju-reading__evidence"><summary>'+esc(c.basis)+'</summary><p>'+esc(r.evidence)+'</p></details>'+(model.unknown?'<p class="saju-reading__uncertain">'+esc(model.warning)+'</p>':'')+'</article>';
  }
  function write(id, html) {
    var el=document.getElementById(id);if(!el)return;
    // Late locale/profile refreshes often produce the very same reading. Keep
    // its DOM so an open details element and the reader's scroll anchor survive.
    if(el._sajuReadingHtml===html&&el._sajuReadingChart===root.G_PILLARS&&el._sajuReadingNode===el.firstChild)return;
    el.innerHTML=html;
    el._sajuReadingHtml=html;el._sajuReadingChart=root.G_PILLARS;el._sajuReadingNode=el.firstChild;
  }
  function ensureHeader() {
    var result=document.getElementById('resultPage');if(!result)return;
    if(!document.getElementById('sajuReadingHeader')) {var header=document.createElement('section');header.id='sajuReadingHeader';header.className='saju-reading-header';result.prepend(header);}
  }
  // 연이/영냥이 풀이 전환. 라이트·다크는 상단 토글이 따로 맡는다.
  function controls() {
    var c=langCopy(locale()), selected=mode();
    return '<div class="saju-reading-switch" role="group" aria-label="'+esc(c.same)+'">'+['pig','neo'].map(function(m){return '<button type="button" data-saju-mode="'+m+'" aria-pressed="'+(selected===m)+'">'+esc(m==='neo'?c.neo:c.yeon)+'</button>';}).join('')+'</div>';
  }
  function renderHeader() {
    var c=langCopy(locale()), selected=mode(), neo=selected==='neo';ensureHeader();
    write('sajuReadingHeader','<img src="/images/saju/'+(neo?'yeongnyangi':'yeoni-clue')+'-160.webp" width="80" height="80" alt="" decoding="async"><div><h2>'+esc(neo?c.room:c.garden)+'</h2><p>'+esc(neo?c.neoIntro:c.yeonIntro)+'</p>'+controls()+'</div>');
    var form=document.getElementById('destinyCardForm');
    if(form&&!document.getElementById('sajuInputModes')){var host=document.createElement('div');host.id='sajuInputModes';host.className='saju-input-modes';form.prepend(host);}
    write('sajuInputModes','<img src="/images/first-visit/yeoni-profile-guide-v1.webp" width="64" height="96" alt="" decoding="async"><div><strong>'+esc(c.yeon)+'</strong><p>'+esc(c.garden)+'</p></div>');
  }
  // 풍부한 판: 한국어는 reading-rich.js, 그 밖의 로케일은 reading-rich-intl.js(없으면 짧은 블록).
  function richFor(lang){return lang==='ko'?(root.SajuReadingRich||null):(root.SajuReadingRichIntl?root.SajuReadingRichIntl.forLang(lang):null);}
  function render(section, supplied) {
    state=supplied||snapshot();var model=build(state,mode(),locale());if(!model)return;
    var c=langCopy(locale());
    // 한국어는 그래프·표가 있는 풍부한 판(reading-rich.js). 그 밖의 로케일과 자료 부족 시에는 기존 짧은 블록.
    var rich=richFor(locale()), facts=Object.assign({},state,{warning:pick(c,'unknown',model.mode==='neo')});
    if(section==='ilju'||section==='all') {
      var host=document.getElementById('iljuCard');
      if(host&&!document.getElementById('sajuElementReading')){var el=document.createElement('section');el.id='sajuElementReading';host.insertBefore(el,host.querySelector('.ilju-v2-grid')||host.firstChild);}
      write('sajuElementReading',markup(model.elements,model,true));
      if(host&&!document.getElementById('sajuIljuRich')){var box0=document.createElement('section');box0.id='sajuIljuRich';host.appendChild(box0);}
      var iljuRich=rich?rich.ilju(facts,model.mode):'';
      write('sajuIljuRich',iljuRich);
      // The detailed reader owns all eight topics. Keep the original fallback
      // available when the bundle is absent, without displaying duplicate excerpts.
      var hasDepth=!!(iljuRich&&root.SajuReadingDepth&&locale()==='ko');
      if(hasDepth){var reading=root.SajuReadingDepth.dayReading(state.p.d.g+state.p.d.j);if(reading)write('iljuSummaryList','<li>'+esc(reading.summary)+'</li>');}
      // 풍부한 판은 renderIlju 가 채운 ILJU_DB 목록(요약·상세·조언)을 그대로 두고 그 아래에 원국 표·연이의 한마디를 덧붙인다.
      // 비한국어는 ILJU_DB 목록이 한국어라 풍부한 판이어도 이 세 목록은 짧은 블록으로 덮는다.
      if(!iljuRich||locale()!=='ko'){
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
      var dn=model.mode==='neo', reading={title:title,evidence:fmt(pick(c,'flowBasis',dn),{label:title,stem:row.gz.g,branch:row.gz.j,score:row.batteryPercent}),blocks:[]};
      reading.blocks=dn?[{label:c.diagnosis,text:pick(c,good?'flowOpen':'flowCare',dn)},{label:c.basis,text:reading.evidence},{label:c.action,text:gi>=0?pick(c,'godRules',dn)[gi]:pick(c,'strengthAction',dn)}]:[{label:c.observe,text:good?c.flowOpen:c.flowCare},{label:c.life,text:gi>=0?c.godLife[gi]:c.scenes[0]},{label:c.practice,text:gi>=0?c.godRules[gi]:c.strengthAction}];
      write(i===0?'dailyPanel':'monthlyPanel',(rich&&rich.daily(row,i,facts,model.mode))||markup(reading,model,true));
    });
    if(section==='letter'||section==='all') {write('letterTitle',mode()==='neo'?esc(c.neo)+' · '+esc(model.letter.title):esc(c.yeon)+(locale()==='ko'?'의 ':' · ')+esc(model.letter.title));write('letterContent',letterMarkup(model));}
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
      el.innerHTML='<img class="saju-static-offer__guide" src="/images/saju/'+(mode()==='neo'?'yeongnyangi-320.webp':'yeoni-moonlight-reading.webp')+'" width="384" height="256" alt="" loading="lazy" decoding="async"><strong class="saju-static-offer__price">'+esc(price?price.textContent:c.pricePending)+'</strong><p>'+esc(key==='section_daewun'?c.paidDaeun:c.paidSummary)+'</p><details data-saju-sample="'+key+'"><summary>'+esc(c.sample)+'</summary>'+markup(key==='section_daewun'?sample.flow[0]:sample.elements,sample,false)+'<p>'+esc(c.sampleNote)+'</p></details><p>'+esc(c.inputs)+'</p>';
    });
  }
  function showGod(key, open) {
    var data=snapshot(), model=build(data,mode(),locale());if(!model)return false;
    var item=model.ten.find(function(g){return g.key===key;});if(!item)return false;
    var richApi=richFor(locale()),rich=richApi?richApi.godDetail(key,Object.assign({},data,{warning:pick(langCopy(locale()),'unknown',model.mode==='neo')}),model.mode):'';
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
  function changed() {preserve(function(){render('all');refreshCopy();if(typeof root.refreshDaewunReadingGuide==='function')root.refreshDaewunReadingGuide();if(!root.G_PILLARS)renderHeader();});if(root.G_PILLARS)import('/js/recommendations-legacy.mjs').then(function(m){return m.mountSajuRecommendation(document.getElementById('resultPage'),document.getElementById('shareSection'));}).catch(function(){});}
  // 화자 전환: 머리글(그림·버튼)을 다시 그리고, 해금된 종합 풀이는 새 화자로 서버에서 다시 받는다(펼친 대운은 changed 가 맡는다).
  function personaChanged() {preserve(function(){renderHeader();try{if(root.G_PILLARS&&typeof root.renderSummary==='function'&&(typeof root._cdSajuGateUnlocked!=='function'||root._cdSajuGateUnlocked('section_summary')))root.renderSummary();}catch(_){}changed();});root.dispatchEvent(new root.CustomEvent('cd:saju-persona-changed'));}
  root.SajuReadingPresentation={build:build,render:render,changed:changed,showGod:showGod,setFlow:function(rows){flow=rows.map(function(r){return Object.assign({},r);});render('flow');},setDaily:function(day,month){daily=[day,month];render('daily');},copy:langCopy,sourceCopy:copy,escape:esc,locale:locale,refreshCopy:refreshCopy};
  if(typeof document==='undefined')return;
  document.addEventListener('click',function(event){
    var button=event.target.closest('#sajuReadingHeader [data-saju-mode]');
    if(button){var selected=button.getAttribute('data-saju-mode');if(selected===mode())return;try{root.localStorage.setItem(PERSONA_KEY,selected);}catch(_){}personaChanged();if(typeof root.cdTrack==='function')root.cdTrack('saju_reading_mode_change',{mode:selected,surface:root.G_PILLARS?'result':'input'});}
    var god=event.target.closest('[data-saju-god]');if(god)showGod(god.getAttribute('data-saju-god'),true);
  });
  root.addEventListener('cd:locale-ready',changed);
  document.addEventListener('toggle',function(event){var el=event.target;if(el.open&&el.matches('[data-saju-sample]')&&typeof root.cdTrack==='function')root.cdTrack('saju_static_detail_view',{item_id:el.getAttribute('data-saju-sample'),mode:mode()});},true);
  function init(){renderHeader();refreshCopy();['yeoni-clue','yeongnyangi'].forEach(function(name){var asset=new Image();asset.decoding='async';asset.src='/images/saju/'+name+'-160.webp';});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(typeof window==='undefined'?globalThis:window);
