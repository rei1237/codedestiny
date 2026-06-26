import type { YeonMessageOutput } from "./types";

const YEON_SAMPLE_MESSAGES_TEXT_TRANSLATIONS = {
  ko: {
    tiredHugTitle: "연이가 꼭 안아주는 말",
    lonelyHugTitle: "연이가 건네는 달빛 안부",
    anxiousHugTitle: "연이의 별쿠션 처방",
  },
  en: {
    tiredHugTitle: "A Hug from Yeon",
    lonelyHugTitle: "Yeon’s Moonlit Check-In",
    anxiousHugTitle: "Yeon’s Star Cushion Prescription",
  },
  ja: {
    tiredHugTitle: "ヨンがぎゅっと抱きしめる言葉",
    lonelyHugTitle: "ヨンからの月明かりの便り",
    anxiousHugTitle: "ヨンの星クッション処方",
  },
} as const;

export const yeonSampleMessages: YeonMessageOutput[] = [
  {
    zodiac_sign: "양자리",
    weekly_vibe: {
      keyword: "속도보다 회복",
      sub_keyword: "작은 템포 조절",
      emotional_color: "살구빛 라벤더",
      summary: "이번 주의 양자리는 추진력 안에 휴식 버튼을 함께 두는 순간, 흐름이 더 오래 예쁘게 이어집니다.",
    },
    emotion_adaptive_opening: {
      selected_mood: "tired",
      first_sentence: "요즘 조금 무리하고 있지 않았어?",
    },
    yeon_is_hug: {
      title: YEON_SAMPLE_MESSAGES_TEXT_TRANSLATIONS.ko.tiredHugTitle,
      message: [
        "요즘 조금 무리하고 있지 않았어?",
        "별의 흐름을 보니, 지금의 너는 잘 달리는 사람이라서 더 자주 멈춰야 하는 시기 같아.",
        "해야 할 일이 많아도 오늘은 한 가지를 끝낸 뒤 어깨를 천천히 내려놓는 연습이 필요해 보여.",
        "연이는 네가 이미 충분히 애쓰고 있다는 걸 알고 있어.",
        "오늘은 조금 덜 완벽해도 괜찮아. 연이는 네 편이야.",
      ],
    },
    small_joy: {
      item: "따뜻한 우유 한 잔",
      action: "마시기 전 컵을 두 손으로 10초 감싸기",
      reason: "몸의 긴장을 먼저 풀어주면 마음도 덜 급해져서, 오늘의 피로가 더 빨리 가라앉아요.",
    },
    gentle_advice: {
      love: "마음이 지친 날엔 답장을 빠르게 완성하려 하지 않아도 괜찮아요. 다정한 한 문장이 더 오래 남아요.",
      work: "업무는 우선순위 1개만 선명하게 잡고, 완료 후 3분 휴식으로 집중 리듬을 살려보세요.",
      money: "보상 소비를 하기 전에 오늘 나를 위로하고 싶은 이유를 메모하면 지출이 훨씬 가벼워져요.",
      relationship: "가까운 사람에게는 해결책보다 먼저 \"오늘 힘들었어\"를 나누는 대화가 도움이 돼요.",
    },
    yeon_illustration_prompt: {
      pose: "작은 담요를 두 손에 들고 앞으로 내밀며 사용자 쪽으로 한 걸음 다가오는 연이",
      expression: "볼이 살짝 붉고 눈꼬리가 부드럽게 내려간 걱정+다정 표정",
      background: "네이비 밤하늘 그라데이션 위에 살구빛 별먼지와 라벤더 구름이 천천히 흐르는 배경",
      image_prompt:
        "A cute flower pig mascot named Yeon-i offering a tiny blanket, warm healing mood, soft pastel night sky, navy-lavender gradient, twinkling tiny stars, cozy glow, Korean emotional astrology style, high-detail clean vector-like illustration",
    },
    share_card: {
      card_title: "오늘의 마음 별자리 · 양자리",
      short_message: "잘 달리는 사람일수록 잠깐의 멈춤이 더 큰 힘이 돼. 오늘은 숨부터 다정하게 쉬어가자.",
      hashtags: ["#연이의마음별자리", "#양자리", "#오늘의위로", "#코드데스티니"],
    },
  },
  {
    zodiac_sign: "게자리",
    weekly_vibe: {
      keyword: "조용한 연결",
      sub_keyword: "마음의 온도 맞추기",
      emotional_color: "달빛 민트",
      summary: "이번 주의 게자리는 혼자 버티기보다 감정을 안전하게 나눌 때 관계의 결이 더 부드러워집니다.",
    },
    emotion_adaptive_opening: {
      selected_mood: "lonely",
      first_sentence: "요즘 사람들 사이에 있어도 혼자인 것처럼 느껴진 순간이 있었을지도 몰라.",
    },
    yeon_is_hug: {
      title: YEON_SAMPLE_MESSAGES_TEXT_TRANSLATIONS.ko.lonelyHugTitle,
      message: [
        "요즘 사람들 사이에 있어도 혼자인 것처럼 느껴진 순간이 있었을지도 몰라.",
        "오늘 별 흐름은 네 마음이 약해서가 아니라, 너무 오래 혼자 정리해 온 탓이라고 말해주고 있어.",
        "누군가에게 긴 설명 대신 \"오늘 조금 허전했어\" 한 문장만 건네도 충분해.",
        "연이는 네가 조용히 버틴 시간까지 다 예쁘게 기억하고 있어.",
        "너는 이미 충분히 애썼고, 오늘은 그걸 알아주는 밤이면 좋겠어.",
      ],
    },
    small_joy: {
      item: "창가의 작은 조명",
      action: "불을 켜고 좋아하는 노래 한 곡 끝까지 듣기",
      reason: "빛과 음악을 함께 두면 고립감이 줄고, 마음이 다시 사람 쪽으로 열리기 쉬워져요.",
    },
    gentle_advice: {
      love: "사랑에서는 확신을 서두르기보다, 오늘의 감정 온도를 솔직하게 말하는 편이 더 안전해요.",
      work: "일은 감정이 흔들리는 시간대를 피해서 짧은 집중 블록으로 나누면 부담이 줄어요.",
      money: "외로움을 달래는 소비가 늘기 쉬운 주라서, 장바구니에 10분 머무는 습관이 도움이 돼요.",
      relationship: "관계가 멀게 느껴질수록 먼저 안부를 보내는 작은 용기가 흐름을 바꿔줘요.",
    },
    yeon_illustration_prompt: {
      pose: "사용자 옆에 어깨를 맞대고 조용히 앉아 손하트 쿠션을 건네는 연이",
      expression: "입꼬리가 작게 올라간 부드러운 미소, 눈은 안정적으로 열린 표정",
      background: "민트와 남보라가 섞인 밤하늘, 작고 둥근 별빛과 달무리, 잔잔한 구름 파티클",
      image_prompt:
        "Yeon-i flower pig mascot sitting quietly next to user, offering tiny heart cushion, soft lonely-comfort mood, moonlit mint and violet sky, gentle star particles, cozy emotional Korean style, cute and warm illustration",
    },
    share_card: {
      card_title: "오늘의 마음 별자리 · 게자리",
      short_message: "혼자인 기분이 드는 날에도, 네 마음은 혼자가 아니야. 작은 안부 하나면 충분해.",
      hashtags: ["#연이의마음별자리", "#게자리", "#감정회복", "#마음카드"],
    },
  },
  {
    zodiac_sign: "물고기자리",
    weekly_vibe: {
      keyword: "마음의 파도 정리",
      sub_keyword: "불안을 작은 단위로 나누기",
      emotional_color: "안개빛 블루",
      summary: "이번 주의 물고기자리는 걱정을 통째로 해결하기보다, 가장 가까운 한 걸음으로 나누는 전략이 맞습니다.",
    },
    emotion_adaptive_opening: {
      selected_mood: "anxious",
      first_sentence: "요즘 마음이 자꾸 먼저 뛰어가고 있지 않았어?",
    },
    yeon_is_hug: {
      title: YEON_SAMPLE_MESSAGES_TEXT_TRANSLATIONS.ko.anxiousHugTitle,
      message: [
        "요즘 마음이 자꾸 먼저 뛰어가고 있지 않았어?",
        "별의 신호를 보면 지금은 미래를 전부 해결하려 하기보다, 오늘의 불안을 한 칸씩 정리하는 흐름이야.",
        "생각이 많아질수록 \"지금 당장 할 수 있는 한 가지\"만 적어도 마음이 훨씬 고요해져.",
        "연이는 네가 겁이 많아서가 아니라, 소중한 걸 잘 지키고 싶어서 불안해진다는 걸 알아.",
        "작게 쉬고, 작게 웃고, 작게 다시 시작하면 돼.",
      ],
    },
    small_joy: {
      item: "별 모양 메모지",
      action: "걱정 1개와 지금 가능한 행동 1개를 적고 접기",
      reason: "불안의 크기를 눈에 보이게 나누면 마음이 예측 가능해져서 안정감이 올라와요.",
    },
    gentle_advice: {
      love: "관계에서는 확인 질문을 짧게 나눠 보내면 오해가 줄고 마음이 안정돼요.",
      work: "일정은 완벽한 계획보다 30분 단위 체크리스트가 더 효과적이에요.",
      money: "불안할수록 충동 결제 버튼과 거리를 두고, 오늘 필요한 것만 남겨보세요.",
      relationship: "대화 전에 내 감정 상태를 먼저 말하면 상대도 더 부드럽게 반응해요.",
    },
    yeon_illustration_prompt: {
      pose: "작은 별 쿠션을 꼭 안고 사용자 곁에 나란히 앉아 고개를 살짝 기울인 연이",
      expression: "차분하고 다정한 눈빛, 안심시키는 미소",
      background: "짙은 블루와 라일락이 섞인 우주 배경에 은은한 트윙클 별과 얇은 안개 파티클",
      image_prompt:
        "Flower pig mascot Yeon-i hugging a small star cushion while sitting beside user, calm comforting expression, dreamy navy-lilac cosmos, subtle twinkle stars, emotional healing astrology card style, cute premium illustration",
    },
    share_card: {
      card_title: "오늘의 마음 별자리 · 물고기자리",
      short_message: "불안은 네가 약해서가 아니야. 소중한 걸 지키려는 마음이 크다는 뜻이야.",
      hashtags: ["#연이의마음별자리", "#물고기자리", "#불안돌봄", "#별빛위로"],
    },
  },
];

export const yeonSampleByKey = {
  "양자리:tired": yeonSampleMessages[0],
  "게자리:lonely": yeonSampleMessages[1],
  "물고기자리:anxious": yeonSampleMessages[2],
} as const;
