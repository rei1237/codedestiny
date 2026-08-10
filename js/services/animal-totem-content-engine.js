(function(global) {
  "use strict";

  var ANIMALS = [
    {
      id: "cat",
      name_ko: "고양이",
      emoji: "🐱",
      category: "기본",
      color_theme: { primary: "#f9a8d4", glow: "#fbcfe8", particle: "#fdf2f8" },
      essence_poetic:
        "🐱 야옹~ 나 고양이는 말이야, 남이 시키는 대로 살지 않아도 괜찮다고 생각해. 조용히 내 페이스로 가도 결국 길은 찾아지거든. 많은 분이 '더 맞춰야 하나' 하고 불안해하는데, 그런 느낌이 드는 것 자체가 이미 자기 감각이 살아 있다는 신호야. 너도 이미 마음속에 답이 있을 거야. 오늘은 그 목소리를 조금만 더 크게 들어보자.",
      direct_message_deep_dive:
        "지금 주변에 휩쓸려서 숨이 찬 느낌이 들지? 그런 경험을 한다는 건 당신이 관계와 상황을 진지하게 받아들이고 있다는 뜻이에요. 나 고양이처럼 잠깐 멈춰서 몸의 감각을 들어봐. 관계를 끊으라는 게 아니라, '나'를 지키는 선을 그어도 된다는 거야. 심리상담 현장에서도 자주 보는 건, 경계를 세우는 걸 이기적이라고 오해하는 분들이라는 거지. 불필요한 설명은 그만하고, 몸이 보내는 작은 신호를 믿어봐. 네 기준을 세우는 건 이기적인 게 아니라 정직한 거야. 오늘 하루, 한 가지 관계나 한 가지 상황에서만이라도 '나에게 이만큼은 괜찮다'는 선을 정해 보는 걸 권해.",
      today_deep_advice: [
        "오늘은 나를 위한 약속 하나만 정해서 꼭 지켜봐.",
        "중요한 결정 전에 3분만 눈 감고, 어디가 긴장되는지 느껴봐.",
        "피곤한 대화나 연락 하나는 과감히 줄여도 돼.",
        "바쁜 일정 사이에 10분만 조용한 시간을 가져봐.",
        "하루 끝에 '내가 오늘 지킨 기준'을 한 줄 적어봐."
      ],
      integration_ritual_5min:
        "1분간 등을 곧게 세우고 호흡을 고릅니다. 2분간 '지금 내가 진짜 원하는 것'을 마음속으로 세 번 반복합니다. 1분간 양손을 가슴 위에 올려 심장 박동을 느낍니다. 마지막 1분은 내일 지킬 단 하나의 경계 선언문을 짧게 적습니다.",
      journaling_prompts: [
        "나는 언제 타인의 기준을 내 기준처럼 착각하는가?",
        "내가 침묵할 때 더 선명해지는 감정은 무엇인가?",
        "지금의 나를 지키기 위해 꼭 필요한 경계 한 가지는 무엇인가?"
      ],
      shadow_warning: "과도한 거리두기는 고립을 만들 수 있습니다. 경계와 단절을 혼동하지 마세요.",
      affirmation: "나는 나의 리듬을 존중하며, 조용하지만 분명한 선택을 한다."
    },
    {
      id: "squirrel", name_ko: "다람쥐", emoji: "🐿", category: "기본",
      color_theme: { primary: "#f59e0b", glow: "#fcd34d", particle: "#fffbeb" },
      essence_poetic:
        "🐿️ 우리 다람쥐는 도토리 한 알 한 알이 소중하다고 생각해. 큰 일을 한 번에 하려 하지 말고, 오늘 할 수 있는 작은 걸부터 해보는 거야. 오랜 상담 경험으로 봐도, 진짜 변화는 '한 번에 다 바꾸기'가 아니라 '매일 조금씩 옮기는 습관'에서 나와. 그게 결국 큰 변화를 만든다고!",
      direct_message_deep_dive:
        "'아직 부족해'라고 느껴지지? 그런 생각이 드는 것 자체는 당신이 목표를 소중히 여긴다는 뜻이에요. 우리 다람쥐는 완벽한 준비를 바라지 않아. 지금 할 수 있는 만큼만 하면 돼. 계획이 막혔다면 출발을 더 작게 쪼개봐. 15분이면 되는 행동 하나, 한 줄이면 되는 기록 하나부터 시작해도 충분해. 작은 성취가 에너지를 불러오고, 그 에너지가 다음 걸음을 만들 거야.",
      today_deep_advice: ["오늘 할 일을 15분이면 되는 작은 행동 3개로 나눠봐.", "지출, 감정, 시간 중 하나만 간단히 기록해봐.", "해낸 일에 체크하고 스스로 칭찬해줘.", "미뤄뒀던 작은 정리 하나만 끝내봐.", "잠들기 전 내일 첫 번째로 할 일을 정해봐."],
      integration_ritual_5min: "1분간 깊은 호흡 후, 종이에 '지금 가장 중요한 한 가지'를 적습니다. 2분간 그것을 이루기 위한 3개의 아주 작은 행동을 씁니다. 1분간 첫 행동을 바로 시작합니다. 마지막 1분간 시작한 자신에게 짧은 격려 문장을 남깁니다.",
      journaling_prompts: ["내가 자꾸 미루는 일의 진짜 두려움은 무엇인가?", "내 삶에서 이미 축적된 자산은 무엇인가?", "내일의 나를 가볍게 해줄 작은 준비는 무엇인가?"],
      shadow_warning: "준비가 통제 집착으로 바뀌면 피로가 누적됩니다. 여백도 계획에 포함하세요.",
      affirmation: "나는 작은 실천을 통해 큰 변화를 차분히 만들어간다."
    },
    {
      id: "bluebird", name_ko: "파랑새", emoji: "🐦", category: "기본",
      color_theme: { primary: "#60a5fa", glow: "#93c5fd", particle: "#eff6ff" },
      essence_poetic:
        "🐦 짹짹! 나 파랑새는 희망이 멀리 있지 않다고 노래해. 기적은 번개처럼 오지 않고, 조용히 네 곁에 내려앉을 때가 많아. '뭔가 큰 일이 일어나야만'이라고 느끼는 순간, 우리는 이미 와 있는 작은 가능성을 놓치기 쉬워. 마음의 창문을 조금만 열어봐.",
      direct_message_deep_dive:
        "더 특별한 신호를 기다리느라 이미 온 기회를 놓치고 있진 않아? 희망을 미루는 건 때로 두려움의 다른 이름이에요. 나 파랑새는 작은 것들에 주목하라고 말해. 짧은 연락, 갑자기 떠오른 생각, 자꾸 눈에 띄는 단어—그게 우연이 아닐 수도 있어. 상담실에서도 '그때 그 작은 선택이 나를 바꿨다'고 말하는 분들이 많아. 오늘 네가 주목하는 게 내일을 만든다고!",
      today_deep_advice: ["오늘 받은 작은 호의 하나에 답장해봐.", "자꾸 떠오르는 생각을 메모하고 우선순위를 매겨봐.", "미뤄뒀던 연락이나 제안 하나 보내봐.", "부정적인 소식 보는 시간을 조금 줄여봐.", "오늘 발견한 좋은 징후 3가지를 적어봐."],
      integration_ritual_5min: "창가나 밝은 곳에 서서 1분간 호흡합니다. 2분 동안 오늘 받은 '작은 신호'를 3개 적습니다. 1분 동안 그중 하나에 바로 행동을 붙입니다. 마지막 1분은 고개를 들어 멀리 바라보며 '나는 이미 길 위에 있다'를 천천히 되뇌입니다.",
      journaling_prompts: ["최근 나를 향해 도착한 작은 신호는 무엇이었는가?", "나는 어떤 이유로 희망을 미루는가?", "오늘 내가 선택할 수 있는 가장 작은 용기는 무엇인가?"],
      shadow_warning: "낙관을 현실 회피로 사용하면 판단력이 흐려집니다. 희망은 행동과 함께할 때 힘이 됩니다.",
      affirmation: "나는 삶이 보내는 신호를 신뢰하며, 작은 기회를 크게 키운다."
    },
    {
      id: "puppy", name_ko: "강아지", emoji: "🐶", category: "기본",
      color_theme: { primary: "#fb7185", glow: "#fda4af", particle: "#fff1f2" },
      essence_poetic:
        "🐶 멍! 나 강아지는 네가 혼자 버티지 않아도 된다고 말하고 싶어. 다정함은 약한 게 아니야. 오랜 시간 사람들의 마음을 봐온 입장에서 말하면, '혼자 잘해내는 것'만 강하다고 여기다 보면 관계는 점점 얇아져. 진짜로 연결되는 건 서로 의지할 수 있을 때라고!",
      direct_message_deep_dive:
        "혼자 잘 버티는 게 강한 거라고 생각하고 있지? 그 믿음이 당신을 지켜준 순간도 있겠지만, 지금은 조금 지쳐 있지 않나요? 나 강아지는 기대하고 실망하는 것도 관계 안에서 배우는 거라고 생각해. 도움 요청하는 건 의존이 아니라 연결이야. 감정을 숨기고 배려만 하면 결국 지쳐. 한 명에게라도 '요즘 이런 기분이야'라고 말해 보는 걸 권해. 솔직하게 말해도 괜찮아.",
      today_deep_advice: ["믿는 사람 한 명에게 지금 상태를 솔직히 말해봐.", "고마운 사람에게 짧은 감사 메시지 보내봐.", "관계에서 지치는 부분을 부드럽게 표현해봐.", "오늘 한 번은 도움을 요청하거나 받아봐.", "자기비난 대신 스스로 격려하는 말을 해봐."],
      integration_ritual_5min: "1분간 가슴 앞에서 손을 포개고 호흡합니다. 2분간 최근 고마웠던 사람 3명을 떠올립니다. 1분간 그중 한 명에게 짧은 안부를 보냅니다. 마지막 1분은 '나는 사랑을 주고받을 자격이 있다'를 반복합니다.",
      journaling_prompts: ["나는 언제 도움 요청을 망설이는가?", "내가 진짜 원하는 관계의 분위기는 무엇인가?", "오늘 더 진실하게 표현할 감정은 무엇인가?"],
      shadow_warning: "타인을 위한 헌신이 자기소진으로 이어지지 않도록 경계를 병행하세요.",
      affirmation: "나는 건강한 연결 속에서 더 단단해지고 더 따뜻해진다."
    },
    {
      id: "rabbit", name_ko: "토끼", emoji: "🐰", category: "기본",
      color_theme: { primary: "#c084fc", glow: "#d8b4fe", particle: "#faf5ff" },
      essence_poetic:
        "🐰 깡총! 나 토끼는 두려워도 뛸 수 있다고 생각해. 예민한 건 약점이 아니라, 위험과 기회를 먼저 알아채는 힘이야. 두려움과 함께 움직이는 걸 '용기'라고 부르거든. 작은 점프부터 시작해보자!",
      direct_message_deep_dive:
        "새로운 걸 시작하려다 과거 실패가 떠올라서 망설여지지? 그런 반응은 당신이 경험을 소중히 여긴다는 뜻이에요. 나 토끼는 완벽한 확신을 기다리지 말라고 말해. 작은 점프로 시작해봐. 불안할 때 멈추지 말고 방향만 살짝 바꿔보거나, 10분만 그 상황에 들어가 보는 것도 좋아. 기회는 먼저 움직인 사람에게 온다고!",
      today_deep_advice: ["오늘 새로운 시도 하나만 해봐.", "망설이는 선택의 장단점을 3줄로 적어봐.", "두려운 상황에 10분만 들어가봐.", "작은 성공이 있으면 바로 축하해줘.", "내일을 위해 오늘 밤은 조금 쉬어봐."],
      integration_ritual_5min: "1분간 가볍게 몸을 흔들며 긴장을 풉니다. 2분간 '지금 바로 할 수 있는 첫 점프'를 적습니다. 1분간 실행합니다. 마지막 1분은 몸을 펴고 하늘을 보며 감사 인사를 전합니다.",
      journaling_prompts: ["내가 두려워하는 최악의 시나리오는 현실적으로 얼마나 가능한가?", "내 감수성이 실제로 나를 지켜준 경험은 무엇인가?", "다음 도약을 위해 내려놓아야 할 생각은 무엇인가?"],
      shadow_warning: "과민함이 회피로 변하면 기회를 놓칩니다. 작은 노출을 반복하세요.",
      affirmation: "나는 두려움 속에서도 부드럽고 정확하게 앞으로 나아간다."
    },
    {
      id: "wolf", name_ko: "늑대", emoji: "🐺", category: "지상",
      color_theme: { primary: "#94a3b8", glow: "#cbd5e1", particle: "#f8fafc" },
      essence_poetic:
        "🐺 아우~ 우리 늑대는 혼자도 잘 살지만, 함께할 때 더 멀리 간다고 생각해. 본능을 믿되, 소중한 무리도 잊지 않는 거야. 상담장에서도 '내가 뭘 원하는지 모르겠어요'라고 하시는 분이 많은데, 그 질문을 던지는 순간 이미 방향감각이 살아 있는 거지.",
      direct_message_deep_dive:
        "다른 사람 말에 휩쓸려서 내 마음 소리가 안 들리지? 그럴 때일수록 먼저 네 안의 방향감각을 찾는 시간이 필요해. 나 늑대는 아침 5분만이라도 '오늘 나는 이걸 지키고 싶다'는 가치 하나를 정하라고 말해. 그다음에 가치가 맞는 사람들과 손잡는 거야. 혼자 다 해보려 하면 결국 지쳐. 독립과 협력의 균형이 진짜 힘이야.",
      today_deep_advice: ["아침에 5분만, 오늘 지킬 가치 하나를 정해봐.", "소모되는 관계는 거리를 두고, 지지해주는 관계는 더 가까이해봐.", "중요한 결정은 남 반응보다 내 기준으로 생각해봐.", "필요한 도움이 있으면 구체적으로 요청해봐.", "오늘 '내답다'고 느낀 순간을 밤에 적어봐."],
      integration_ritual_5min: "1분간 깊게 숨을 들이쉬고 내쉬며 척추를 세웁니다. 2분간 마음속으로 '나는 누구의 기대가 아닌 나의 방향으로 걷는다'를 반복합니다. 1분간 지금 지켜야 할 경계 한 줄을 적습니다. 마지막 1분은 나를 지지하는 사람 한 명을 떠올리며 감사 인사를 보냅니다.",
      journaling_prompts: ["나는 어떤 상황에서 본능보다 타인의 시선을 더 신뢰하는가?", "내가 속하고 싶은 공동체의 조건은 무엇인가?", "오늘 내 선택을 강하게 만든 내면 기준은 무엇인가?"],
      shadow_warning: "본능을 고집으로 오해하면 관계가 끊어질 수 있습니다. 직관 뒤에는 검증도 필요합니다.",
      affirmation: "나는 나의 본능을 신뢰하며, 건강한 연대 속에서 더 멀리 간다."
    },
    {
      id: "bear", name_ko: "곰", emoji: "🐻‍❄️", category: "지상",
      color_theme: { primary: "#b45309", glow: "#f59e0b", particle: "#fffbeb" },
      essence_poetic:
        "🐻 그르렁~ 나 곰은 겨울에 잠잘 때가 제일 중요하다고 생각해. 멈추는 게 퇴보가 아니라, 다시 힘을 모으는 시간이야. 오랜 상담 경험상 '쉬면 안 된다'고 믿는 분일수록 나중에 더 크게 멈춰야 할 때가 와. 회복도 선택이에요.",
      direct_message_deep_dive:
        "계속 버티라고만 느껴져서 지치지 않아? 그런 느낌이 든다면 당신은 이미 꽤 오래 잘 견뎌 오고 있다는 뜻이에요. 나 곰은 지금 피로한 건 의지가 약해서가 아니라, 쉬는 시간이 부족해서라고 말해. 멈출 줄 아는 사람이 더 멀리 가. 오늘 20분만이라도 방해 없이 쉬는 시간을 약속해 봐. 몸과 마음이 보내는 신호를 무시하지 말고, 회복하는 것도 책임이야.",
      today_deep_advice: ["오늘 20분만 아무 방해 없이 쉬는 시간을 가져봐.", "과한 책임 하나는 줄이거나 다른 사람에게 맡겨봐.", "몸이 피곤한지 확인하고 잠을 우선으로 해봐.", "지금 해야 할 것과 나중에 할 것을 구분해봐.", "하루 끝에 '오늘 충분히 했어'라고 말해봐."],
      integration_ritual_5min: "눈을 감고 1분간 복식호흡을 합니다. 2분간 머리-어깨-가슴-배-다리 순으로 긴장을 스캔합니다. 1분간 가장 지친 부위에 손을 올리고 따뜻한 숨을 보냅니다. 마지막 1분은 오늘 내려놓을 책임 하나를 적습니다.",
      journaling_prompts: ["내가 쉬지 못하는 진짜 이유는 무엇인가?", "지금 내 몸이 보내는 가장 큰 신호는 무엇인가?", "회복 후 다시 시작하면 달라질 선택은 무엇인가?"],
      shadow_warning: "휴식이 회피로 변하면 흐름이 끊깁니다. 회복 후 재진입 시점을 정해두세요.",
      affirmation: "나는 멈춤을 통해 힘을 되찾고, 더 단단하게 다시 나아간다."
    },
    {
      id: "deer", name_ko: "사슴", emoji: "🦌", category: "지상",
      color_theme: { primary: "#d97706", glow: "#fbbf24", particle: "#fefce8" },
      essence_poetic:
        "🦌 우리 사슴은 부드러움이 약한 게 아니라고 생각해. 예민한 감각으로 숲의 작은 변화까지 읽어내는 거야. 그게 우리의 힘이지. 상담실에서도 감수성이 높은 분들이 '나만 이렇게 예민한가 봐'라고 말할 때가 많은데, 그 감각은 당신을 지켜 준 적이 분명히 있을 거야.",
      direct_message_deep_dive:
        "감수성이 높다고 스스로를 낮게 보지 마. 나 사슴은 민감함이 취약한 게 아니라, 관계와 분위기를 먼저 읽는 능력이라고 말해. 다만 모든 걸 다 받아들이면 과부하가 와. 오늘 한 번은 부드럽지만 분명하게 '지금은 그건 못 해줄 것 같아'라고 말해 보는 걸 권해. 부드럽게 대하되, 경계도 지키는 게 중요해.",
      today_deep_advice: ["시끄러운 곳에서는 잠깐 조용한 시간을 가져봐.", "무거운 대화 후에는 정리할 시간을 가져봐.", "오늘 한 번은 부드럽지만 분명하게 거절해봐.", "미세하게 느껴지는 직감을 메모해봐.", "자연이나 산책으로 감각을 정돈해봐."],
      integration_ritual_5min: "1분간 천천히 호흡하며 시선을 부드럽게 넓힙니다. 2분간 오늘 나를 소모시킨 자극 3가지를 적습니다. 1분간 각각의 자극에 대한 보호 행동을 한 줄씩 씁니다. 마지막 1분간 '나는 부드럽고도 분명하다'를 되뇌세요.",
      journaling_prompts: ["내 예민함이 나를 지켜준 순간은 언제였는가?", "나는 어떤 상황에서 감정 과부하를 겪는가?", "오늘 내가 지킬 수 있는 가장 현실적인 경계는 무엇인가?"],
      shadow_warning: "타인의 감정을 과잉 수용하면 자기감각이 흐려집니다. 내 감정의 자리를 먼저 확보하세요.",
      affirmation: "나는 섬세함을 지혜로 바꾸며, 부드럽게 나를 지킨다."
    },
    {
      id: "tiger", name_ko: "호랑이", emoji: "🐯", category: "지상",
      color_theme: { primary: "#f97316", glow: "#fdba74", particle: "#fff7ed" },
      essence_poetic:
        "🐯 나 호랑이는 소란 피우지 않고 조용히 힘을 모은 다음, 딱 한 번 도약할 때 판을 바꾼다고 생각해. 절제된 강함이 진짜 힘이야. 미루는 건 때로 두려움 때문이에요. 그 두려움을 인정한 다음, '오늘 한 가지만' 정해서 실행해 보는 게 시작이야.",
      direct_message_deep_dive:
        "오래 미뤄뒀던 중요한 일이 있지? 그 일이 마음에 자리 잡고 있다는 건 이미 당신이 그걸 중요하게 여긴다는 뜻이에요. 나 호랑이는 화내라는 게 아니라, 집중해서 실행하라는 거야. 더 많은 정보보다 지금이 결단할 때일 수 있어. 아침 첫 시간에 그 일만 20분이라도 해 봐. 행동하면서 자신감이 생기는 거야. 한 번에 다 바꾸려 하지 말고, 가장 중요한 한 곳만 강하게 쳐봐.",
      today_deep_advice: ["오늘 가장 어려운 일을 아침 첫 시간에 해봐.", "방해되는 것 2개만 치워서 집중해봐.", "'완벽'이 아니라 '완료'를 목표로 해봐.", "피하고 있던 중요한 말이 있으면 핵심부터 전해봐.", "오늘 용기 낸 행동 하나를 적어봐."],
      integration_ritual_5min: "1분간 어깨를 펴고 깊은 호흡을 합니다. 2분 동안 오늘 반드시 끝낼 한 가지를 명확히 씁니다. 1분간 첫 행동을 즉시 시작합니다. 마지막 1분은 거울을 보며 '나는 실행으로 운명을 연다'를 말합니다.",
      journaling_prompts: ["지금 내가 미루는 핵심 과제는 무엇인가?", "실패보다 더 두려운 것은 무엇인가?", "오늘의 한 번의 결단이 바꿀 수 있는 미래는 무엇인가?"],
      shadow_warning: "힘을 증명하려는 조급함은 충돌을 부릅니다. 강함은 속도가 아니라 정확도입니다.",
      affirmation: "나는 두려움보다 목표를 크게 보고, 정확하게 행동한다."
    },
    {
      id: "owl", name_ko: "올빼미", emoji: "🦉", category: "공중",
      color_theme: { primary: "#7c3aed", glow: "#a78bfa", particle: "#f5f3ff" },
      essence_poetic:
        "🦉 부엉~ 나 올빼미는 어둠을 무서워하지 않아. 오히려 그 안에서 본질을 더 잘 본다고 생각해. 조용한 통찰이 가장 밝은 빛이야. 심리상담에서도 '잘 모르겠어요'라고 할 때, 사실은 정보가 넘쳐서 정리가 안 되는 경우가 많아. 한 걸음 물러서 보는 게 필요해.",
      direct_message_deep_dive:
        "지금 혼란스러운 건 정보가 부족해서가 아니라 너무 많아서일 수 있어. 나 올빼미는 '더 많이'보다 '더 깊게' 보라고 말해. 말과 사건 표면 뒤에 뭐가 있는지 관찰해봐. 오늘 30분만이라도 폰을 내려두고, '지금 진짜 묻고 싶은 질문은 뭐지?'를 한 문장으로 적어 봐. 진짜 묻고 싶은 질문을 다시 정리하면 답이 가까이 있을 거야. 반응하기 전에 관찰하는 거, 잊지 마.",
      today_deep_advice: ["결정하기 전에 사실과 해석을 구분해서 적어봐.", "오늘 30분은 폰 없이 생각할 시간을 가져봐.", "바로 답하고 싶은 메시지에 10분만 기다려봐.", "문제의 원인, 패턴, 반복되는 점을 3단으로 정리해봐.", "오늘 새로 본 진실 한 줄을 적어봐."],
      integration_ritual_5min: "1분간 눈을 감아 주변 소리를 듣습니다. 2분간 현재 고민의 핵심 질문을 한 문장으로 정리합니다. 1분간 그 질문의 가정(당연히 믿는 전제) 1개를 의심해 봅니다. 마지막 1분은 떠오른 통찰을 메모합니다.",
      journaling_prompts: ["내가 사실로 착각하는 해석은 무엇인가?", "지금 문제의 진짜 질문은 무엇인가?", "반응 대신 관찰을 선택하면 무엇이 달라지는가?"],
      shadow_warning: "과도한 분석은 행동 지연을 부릅니다. 통찰 뒤에는 실행이 뒤따라야 합니다.",
      affirmation: "나는 고요한 관찰로 본질을 보고, 지혜롭게 행동한다."
    },
    {
      id: "eagle", name_ko: "독수리", emoji: "🦅", category: "공중",
      color_theme: { primary: "#0ea5e9", glow: "#7dd3fc", particle: "#f0f9ff" },
      essence_poetic:
        "🦅 나 독수리는 높이 날아서 보면 작은 일에 휩쓸리지 않아. 한 걸음 물러나서 큰 그림을 보는 게 중요하다고 생각해. '지금 당장'에만 집중하다 보면 3개월 뒤의 나는 더 지쳐 있기 쉬워. 큰 그림을 보는 것도 자기 돌봄이에요.",
      direct_message_deep_dive:
        "세부적인 일에만 빠져서 방향을 잊고 있진 않아? 나 독수리는 목표와 수단이 뒤바뀌지 않았는지 점검하라고 말해. 오늘 할 일 중에서 '3개월 뒤의 나에게는 별 의미 없는데 지금만 바쁜 일' 하나를 빼 보는 걸 권해. 당장의 성과도 중요하지만, 장기적으로 어긋나면 결국 지쳐. 높은 시점에서 보면 해야 할 일과 하지 말아야 할 일이 보일 거야.",
      today_deep_advice: ["할 일 중에 장기 목표와 안 맞는 것 하나 빼봐.", "3개월 뒤를 생각해서 지금 문제를 다시 봐봐.", "중요한데 급하지 않은 일에 30분 써봐.", "나를 지치게 하는 비교는 의식적으로 멈춰봐.", "나를 지지해주는 사람과 잠깐 대화해봐."],
      integration_ritual_5min: "1분간 창밖 또는 먼 곳을 바라보며 호흡합니다. 2분간 '지금의 선택이 3개월 뒤 어떤 의미를 갖는가'를 적습니다. 1분간 우선순위 상위 1개를 확정합니다. 마지막 1분은 고개를 들고 크게 숨을 들이쉬며 실행을 다짐합니다.",
      journaling_prompts: ["나는 무엇에 너무 가까이 붙어 본질을 놓치고 있는가?", "지금의 선택은 장기 비전과 일치하는가?", "당장 내려놓으면 가벼워질 집착은 무엇인가?"],
      shadow_warning: "높은 시야가 현실 회피가 되지 않도록, 큰 그림을 작은 실행으로 연결하세요.",
      affirmation: "나는 넓게 보고 정확히 선택하며, 본질에 집중한다."
    },
    {
      id: "butterfly", name_ko: "나비", emoji: "🦋", category: "공중",
      color_theme: { primary: "#ec4899", glow: "#f9a8d4", particle: "#fdf2f8" },
      essence_poetic:
        "🦋 나 나비는 날개 펼 때마다 변화가 재탄생이라고 생각해. 오래된 껍질은 실패가 아니라, 그 전 단계였을 뿐이야. 변화가 두렵다면 그건 당신이 지금까지의 자신을 소중히 여겼기 때문이에요. 그 다음 단계도 그만큼 소중히 여기면 돼.",
      direct_message_deep_dive:
        "익숙한 걸 잃는 게 불안해서 망설여지지? 그런 느낌이 드는 건 자연스러워요. 나 나비는 변화를 한 번에 오는 게 아니라 과정으로 받아들이라고 말해. 과거의 나를 부정할 필요는 없어. 다만 지금 나에게 안 맞는 건 놓아줘도 돼. 오늘 '벗을 것' 하나, '새로 가질 것' 하나만 정해 봐. 남에게 보여주기 위한 게 아니라, 네 마음이 동의하는 게 중요해.",
      today_deep_advice: ["지금 나와 안 맞는 습관 하나만 오늘 끊어봐.", "새로운 나를 표현할 작은 행동 하나 해봐.", "남 평가보다 내가 가벼워지는 걸 기준으로 선택해봐.", "예전에 성공했던 방식을 무조건 반복하지 말아봐.", "변화할 때 도움이 될 수 있는 것들을 적어봐."],
      integration_ritual_5min: "1분간 깊은 호흡을 합니다. 2분간 종이에 '벗을 것' 3가지, '가질 것' 3가지를 적습니다. 1분간 오늘 당장 벗을 것 하나를 실행합니다. 마지막 1분은 새로 선택한 정체성을 한 문장으로 선언합니다.",
      journaling_prompts: ["나는 어떤 오래된 역할을 아직 놓지 못하고 있는가?", "변화가 두려운 이유는 무엇인가?", "새로운 나를 가장 작게 증명할 수 있는 행동은 무엇인가?"],
      shadow_warning: "변화 자체에 취하면 중심을 잃을 수 있습니다. 속도보다 정합성을 확인하세요.",
      affirmation: "나는 두려움을 통과해 더 진실한 모습으로 피어난다."
    },
    {
      id: "crow", name_ko: "까마귀", emoji: "🐦‍⬛", category: "공중",
      color_theme: { primary: "#334155", glow: "#64748b", particle: "#e2e8f0" },
      essence_poetic:
        "🐦‍⬛ 까악! 나 까마귀는 우연처럼 보이는 것들 사이에서 의미를 찾는 걸 좋아해. 익숙한 걸 새로 해석하는 게 재미있거든. 상담에서도 '왜 나한테만?'이라고 하시는 분이 많은데, 그 반복이 말해 주는 패턴이 있을 때가 많아. 그걸 읽는 게 첫 단계야.",
      direct_message_deep_dive:
        "요즘 자꾸 반복되는 걸 무시하지 마. 나 까마귀는 논리 밖에서 오는 연결을 읽으라고 말해. 오늘 자꾸 눈에 띄는 단어나 상황을 메모해 봐. 창조는 완전히 새 걸 만드는 게 아니라, 흩어진 조각을 새로 엮는 거야. 정면으로 돌파가 안 되면 질문 자체를 바꿔봐. '어떻게 해결할까?' 대신 '이 상황이 나에게 뭘 알려 주려 하는 걸까?'라고 물어보는 거지. 그게 답일 수도 있어.",
      today_deep_advice: ["오늘 자꾸 눈에 띄는 단어나 상황을 적어봐.", "막힌 문제를 다른 분야 방식으로 접근해봐.", "아이디어를 완성하려 하지 말고 조각으로만 모아봐.", "두려워서 미뤄둔 창작을 15분만 해봐.", "오늘 '의미 있어 보였던 우연' 2개를 적어봐."],
      integration_ritual_5min: "1분간 호흡 후 주변을 천천히 둘러봅니다. 2분간 오늘의 우연한 신호 3개를 기록합니다. 1분간 그 신호가 말하는 공통 메시지를 한 문장으로 만듭니다. 마지막 1분은 해당 메시지에 맞는 행동 한 가지를 정합니다.",
      journaling_prompts: ["최근 반복해서 나타나는 신호는 무엇인가?", "나는 어떤 고정관념 때문에 가능성을 좁히고 있는가?", "지금 내게 필요한 새로운 질문은 무엇인가?"],
      shadow_warning: "의미 찾기가 과도해지면 현실 판단이 흔들립니다. 상징과 사실을 구분하세요.",
      affirmation: "나는 삶의 신호를 읽고, 창조적으로 새로운 길을 연다."
    },
    {
      id: "dolphin", name_ko: "돌고래", emoji: "🐬", category: "물/기타",
      color_theme: { primary: "#22d3ee", glow: "#67e8f9", particle: "#ecfeff" },
      essence_poetic:
        "🐬 우리 돌고래는 삶이 전투만이 아니라고 생각해. 놀고, 호흡하고, 소통하는 게 회복의 길이야. 오랜 상담 경험으로 봐도, '잘해내는 것'만 하다 보면 감각이 무뎌져. 가벼운 유쾌함도 당신을 지키는 힘이에요.",
      direct_message_deep_dive:
        "요즘 너무 진지해져서 유연함을 잃었지? 그럴 때일수록 몸을 조금 풀어 주는 게 먼저야. 나 돌고래는 문제를 가볍게 여기라는 게 아니라, 긴장을 풀어야 해법이 보인다고 말해. 닫힌 마음은 관계를 딱딱하게 만들어. 오늘 일 사이에 스트레칭 한 번, 편한 사람과 잡담 한 번 넣어 봐. 웃고, 놀고, 가벼운 대화하는 게 도피가 아니라 회복이야.",
      today_deep_advice: ["오늘 일 사이에 짧은 스트레칭과 미소 넣어봐.", "편한 사람과 대화해봐.", "완벽한 말 대신 솔직하고 부드러운 말로 바꿔봐.", "물 마시고 호흡하는 걸 의식해봐.", "오늘 즐거웠던 순간 3개를 적어봐."],
      integration_ritual_5min: "1분간 물 한 잔을 천천히 마시며 호흡합니다. 2분간 어깨와 목을 부드럽게 풀어줍니다. 1분간 오늘 나를 웃게 할 작은 행동을 정합니다. 마지막 1분은 그 행동을 즉시 실행합니다.",
      journaling_prompts: ["나는 왜 즐거움을 미루는가?", "내 긴장을 가장 빠르게 풀어주는 방법은 무엇인가?", "관계를 더 부드럽게 만들 한 가지 행동은 무엇인가?"],
      shadow_warning: "가벼움이 회피로 바뀌지 않도록, 즐거움 뒤에 책임 행동을 연결하세요.",
      affirmation: "나는 호흡하고 즐기며, 유연한 마음으로 삶과 연결된다."
    },
    {
      id: "turtle", name_ko: "거북이", emoji: "🐢", category: "물/기타",
      color_theme: { primary: "#14b8a6", glow: "#5eead4", particle: "#f0fdfa" },
      essence_poetic:
        "🐢 나 거북이는 느린 게 낙오가 아니라고 생각해. 깊이 있는 시간이야. 단단한 등껍질로 나를 지키면서 목적지까지 가는 거지. 누군가의 속도에 맞추느라 지칠 때는, '나만의 페이스'가 있다는 걸 떠올려 봐. 그 페이스를 지키는 것도 성취야.",
      direct_message_deep_dive:
        "빠른 성과와 비교 때문에 내 페이스가 의심되는 거지? 그런 느낌이 든다면 이미 당신은 꽤 오래 꾸준히 걸어 오고 있다는 뜻이에요. 나 거북이는 속도보다 방향, 박수보다 꾸준함을 선택하라고 말해. 오늘 계획에서 '무리한 것' 하나만 빼 봐. 느리게 가도 더 많이 보고 덜 실수할 수 있어. 네 리듬을 지키는 건 뒤처지는 게 아니라 오래 가는 거야.",
      today_deep_advice: ["오늘 계획에서 무리한 것 하나 빼봐.", "진행 중인 일의 다음 한 걸음만 정해봐.", "비교하게 만드는 콘텐츠 보는 시간 줄여봐.", "일정 사이에 1분 호흡만 넣어봐.", "속도보다 꾸준함을 확인해봐."],
      integration_ritual_5min: "1분간 눈을 감고 느린 호흡을 유지합니다. 2분간 오늘 꼭 필요한 일 1개와 덜 중요한 일 2개를 구분합니다. 1분간 필요한 일의 첫 단계를 실행합니다. 마지막 1분은 '천천히, 그러나 멈추지 않는다'를 되뇌세요.",
      journaling_prompts: ["나는 누구의 속도를 기준으로 조급해지는가?", "내가 지키고 싶은 나만의 페이스는 어떤 모습인가?", "지속 가능한 성공을 위해 줄여야 할 것은 무엇인가?"],
      shadow_warning: "느림이 회피로 바뀌면 정체됩니다. 작더라도 전진 신호를 유지하세요.",
      affirmation: "나는 나의 속도로 꾸준히 전진하며, 결국 도착한다."
    },
    {
      id: "snake", name_ko: "뱀", emoji: "🐍", category: "물/기타",
      color_theme: { primary: "#22c55e", glow: "#86efac", particle: "#f0fdf4" },
      essence_poetic:
        "🐍 나 뱀은 낡은 껍질을 벗어도 같은 존재로 남지 않아. 벗어나면서 새로 태어나는 거지. 생명력이 갱신되는 거야. 상담실에서도 '그때 일이 지금까지도 영향을 준다'고 하시는 분이 많은데, 그 이야기를 다시 해석할 권리는 지금 당신에게 있어요.",
      direct_message_deep_dive:
        "오래된 감정 패턴을 반복하면서 에너지가 새어 나가고 있지? 나 뱀은 문제를 해결하려 하기 전에, 그걸 유지하게 하는 게 뭔지 먼저 보라고 말해. 그 패턴을 일으키는 트리거를 한두 개만 적어 봐. 과거 상처는 존중하되, 지금 운전대를 계속 쥐고 있을 필요는 없어. 새로 해석하면 에너지가 다시 흐를 거야.",
      today_deep_advice: ["반복되는 감정 패턴을 한 문장으로 정리해봐.", "그 패턴을 일으키는 트리거 2개를 찾아봐.", "트리거가 왔을 때 대신 할 행동을 미리 정해봐.", "과거 사건을 지금 시점으로 다시 써봐.", "오늘 감정이 회복된 순간을 적어봐."],
      integration_ritual_5min: "1분간 깊은 호흡으로 몸의 긴장을 느낍니다. 2분간 '벗을 패턴'을 종이에 적고 접습니다. 1분간 손을 털어내며 상징적으로 놓아줍니다. 마지막 1분은 '나는 새 선택을 할 수 있다'를 반복합니다.",
      journaling_prompts: ["나는 어떤 오래된 이야기를 아직도 진실처럼 믿는가?", "지금 벗어야 할 감정 습관은 무엇인가?", "새로운 나를 위한 첫 행동은 무엇인가?"],
      shadow_warning: "극단적 단절은 또 다른 상처를 만듭니다. 변화는 단호하되 점진적으로 진행하세요.",
      affirmation: "나는 낡은 감정을 벗고, 새로운 생명력으로 다시 시작한다."
    },
    {
      id: "fox", name_ko: "여우", emoji: "🦊", category: "물/기타",
      color_theme: { primary: "#ef4444", glow: "#fca5a5", particle: "#fef2f2" },
      essence_poetic:
        "🦊 야호! 나 여우는 정면으로 부딪히지 않고 흐름을 읽어서 길을 찾아. 유연한 게 타협이 아니라, 지혜로운 방법이야. '고집이 강한 게 나다'라고 여기기보다, '지금 이 상황에서 더 나은 경로는 뭘까?'라고 물어보는 순간 선택지가 넓어져.",
      direct_message_deep_dive:
        "정면돌파만이 정답이라고 믿어서 지치지 않아? 그 방식이 통했던 순간도 있겠지만, 지금은 벽에 부딪히고 있지 않나요? 나 여우는 우회가 패배가 아니라 전략이라고 말해. 같은 목표로 가는 다른 경로를 3개만 적어 봐. 상황을 있는 그대로 읽고, 상대 관점을 파악하면 해결이 빨라져. 원칙을 버리는 게 아니라, 원칙을 지키는 더 나은 방식을 찾는 거야.",
      today_deep_advice: ["막힌 과제에 대안 경로 2개를 적어봐.", "대화할 때 상대가 필요한 걸 먼저 물어봐.", "내 고집이 들어간 부분을 스스로 점검해봐.", "작은 실험으로 어떤 방법이 좋은지 테스트해봐.", "문제 키우는 말 대신 해결하는 말로 바꿔봐."],
      integration_ritual_5min: "1분간 숨을 고르고 현재 고민을 한 문장으로 씁니다. 2분간 같은 목표로 가는 다른 경로를 3개 적습니다. 1분간 가장 현실적인 경로를 선택합니다. 마지막 1분은 선택 경로의 첫 연락/첫 행동을 실행합니다.",
      journaling_prompts: ["나는 어떤 상황에서 불필요하게 정면충돌을 선택하는가?", "유연성을 잃게 만드는 내 고정관념은 무엇인가?", "지금 문제를 더 영리하게 푸는 방법은 무엇인가?"],
      shadow_warning: "영리함이 계산적 회피로 보이지 않도록 진정성과 투명성을 유지하세요.",
      affirmation: "나는 유연한 지혜로 길을 찾고, 현명하게 목표에 도달한다."
    }
  ];

  var INDEX_BY_ID = {};
  for (var i = 0; i < ANIMALS.length; i += 1) INDEX_BY_ID[ANIMALS[i].id] = ANIMALS[i];

  var SLOTS_BY_MODE = {
    one: ["today_guide"],
    three: ["past_wound", "present_energy", "integration_path"],
    five: ["mind", "heart", "shadow", "gift", "next_action"]
  };

  /* 카테고리 가중치 — 균등 셔플이면 5종인 '기본'이 4종 그룹보다 자주 나와 덱이 단조로워진다.
     서식지 그룹이 고르게 섞이도록 그룹 단위로 먼저 뽑는다. */
  var CATEGORY_WEIGHTS = {
    "기본": 0.2,
    "지상": 0.33,
    "공중": 0.27,
    "물/기타": 0.2
  };

  function copyObject(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function getAnimalById(id) {
    if (!id || !INDEX_BY_ID[id]) return null;
    return copyObject(INDEX_BY_ID[id]);
  }

  function shuffled(list) {
    var arr = list.slice();
    for (var i = arr.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  /* 🔴 뽑기는 진짜 무작위로 둔다 — 생년·띠로 카드를 조작하지 않는다.
     개인화는 "무엇이 나왔나"가 아니라 "내 질문에 대해 그 카드가 무엇을 말하는가"에 건다
     (연이 종합 해설이 그 일을 한다). 조작된 뽑기는 검증할 수 없고 들키면 신뢰만 잃는다. */
  function sampleUnique(size) {
    var grouped = {};
    for (var i = 0; i < ANIMALS.length; i += 1) {
      var cat = ANIMALS[i].category;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(ANIMALS[i]);
    }
    Object.keys(grouped).forEach(function(key) { grouped[key] = shuffled(grouped[key]); });

    var picked = [];
    while (picked.length < size) {
      var available = Object.keys(grouped).filter(function(key) { return grouped[key].length > 0; });
      if (!available.length) break;
      var total = available.reduce(function(sum, key) { return sum + (CATEGORY_WEIGHTS[key] || 0.1); }, 0);
      var roll = Math.random() * total;
      var chosen = available[available.length - 1];
      var acc = 0;
      for (var c = 0; c < available.length; c += 1) {
        acc += CATEGORY_WEIGHTS[available[c]] || 0.1;
        if (roll <= acc) { chosen = available[c]; break; }
      }
      picked.push(grouped[chosen].pop());
    }
    return picked;
  }

  function getRandomSpread(mode) {
    var spreadMode = SLOTS_BY_MODE[mode] ? mode : "three";
    var slots = SLOTS_BY_MODE[spreadMode];
    var cards = sampleUnique(slots.length).map(function(card, idx) {
      return { slot: slots[idx], card: copyObject(card) };
    });
    return { mode: spreadMode, cards: cards, created_at: new Date().toISOString() };
  }

  var SLOT_LABEL = {
    today_guide: "오늘의 수호 메시지",
    past_wound: "과거 상처",
    present_energy: "현재 에너지",
    integration_path: "통합 방향",
    mind: "이성/사고",
    heart: "감정/욕구",
    shadow: "그림자",
    gift: "잠재 선물",
    next_action: "다음 행동"
  };

  function trimmed(value) {
    return String(value == null ? "" : value).trim();
  }

  /* composeConsultation 은 이제 userContext 를 실제로 쓴다.
     예전에는 호출자가 항상 {} 를 넘겨 focus 경로가 죽어 있었고, 만들어 낸 integration_focus 는
     화면에 렌더조차 되지 않았다. 질문이 들어오면 그 질문을 리딩의 축으로 삼는다. */
  function composeConsultation(spread, userContext) {
    var ctx = userContext || {};
    var question = trimmed(ctx.focus || ctx.question);
    var isOne = spread.mode === "one";
    var names = spread.cards.map(function(c) { return c.card.name_ko; });

    var opening = isOne
      ? "오늘 당신 곁에 " + names[0] + "가 한 장의 메시지로 찾아왔어요. " +
        "이 한 장이 지금의 마음에 전해주는 수호의 말을 천천히 받아보세요."
      : "오늘 " + names.join(", ") + "가 당신 곁에 모였어요. " +
        "작은 동물 친구들이 들려주는 따뜻한 조언을 마음에 담아보세요.";

    var focus = question
      ? "\"" + question + "\" — 이 질문을 축에 두고 읽어 드릴게요."
      : "지금 마음에 두고 있는 고민에 이 조언을 곁에 두어 보세요.";

    return {
      mode: spread.mode,
      question: question,
      opening_message: opening,
      integration_focus: focus,
      cards: spread.cards.map(function(item) {
        return {
          slot: item.slot,
          animal: copyObject(item.card),
          layered_reading: {
            essence: item.card.essence_poetic,
            direct_message: item.card.direct_message_deep_dive,
            /* 🔴 여기서 자르지 않는다. 예전에는 렌더러가 3개로 슬라이스하고 문장까지 잘라
               이미 집필된 콘텐츠의 40%를 버렸다. 분량 정책은 렌더러가 아니라 모드가 정한다. */
            daily_actions: item.card.today_deep_advice.slice(),
            ritual: item.card.integration_ritual_5min,
            journaling: item.card.journaling_prompts.slice(),
            shadow_warning: item.card.shadow_warning,
            affirmation: item.card.affirmation
          }
        };
      }),
      closing_guidance: isOne
        ? "한 장의 메시지가 당신의 오늘을 위한 것이라면, 그 한 마디만이라도 마음에 새겨 두세요. " +
          "필요할 때 다시 떠올리며, 작은 친구의 목소리를 곁에 두면 든든해질 거예요."
        : "여러 동물 친구들의 목소리가 조금씩 다르게 느껴져도 괜찮아요. " +
          "가장 마음에 와닿는 한 마디를 골라, 오늘 하루 조금이라도 실천해 보면 좋겠어요."
    };
  }

  /* 워커(/api/animal-totem/reading)로 보낼 카드 서술.
     🔴 17종 본문을 서버로 복제하지 않기 위해 클라가 필요한 만큼만 실어 보낸다.
        서버는 id 화이트리스트로 교차검증하고 길이 상한만 건다. */
  function buildReadingCards(spread) {
    return spread.cards.map(function(item) {
      var firstSentence = String(item.card.essence_poetic || "").split(/(?<=[.!?])\s+/)[0] || "";
      return {
        slot: item.slot,
        animalId: item.card.id,
        animalName: item.card.name_ko,
        category: item.card.category,
        essence: firstSentence.slice(0, 200),
        shadow: String(item.card.shadow_warning || "").slice(0, 160),
        actions: (item.card.today_deep_advice || []).slice(0, 3)
      };
    });
  }

  global.AnimalTotemContentEngine = {
    version: "1.1.0",
    animals: copyObject(ANIMALS),
    slotLabels: copyObject(SLOT_LABEL),
    getAnimalById: getAnimalById,
    getRandomSpread: getRandomSpread,
    composeConsultation: composeConsultation,
    buildReadingCards: buildReadingCards
  };
})(window);
