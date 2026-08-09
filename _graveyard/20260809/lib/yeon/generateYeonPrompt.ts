import { moodOpeningMap, yeonEmotionPoseMap } from "./emotionMap";
import { normalizeFortuneSignal } from "./normalizeFortuneSignal";
import { validateYeonMessage } from "./validateYeonMessage";
import type { AstrologyEngineInput, YeonMessageOutput, YeonMood, ZodiacSign } from "./types";

type ZodiacSignature = {
  keyword: string;
  subKeyword: string;
  color: string;
  strength: string;
  carePoint: string;
  relationshipTone: string;
  workTone: string;
  moneyTone: string;
  joyItem: string;
  joyAction: string;
};

type MoodGuide = {
  paceLine: string;
  focusLine: string;
  avoidLine: string;
  recoveryLine: string;
};

const YEON_PROMPT_TEXT_TRANSLATIONS = {
  ko: {
    "yeonPrompt.001": "연이가 전하는 오늘의 정밀 위로",
  },
  en: {
    "yeonPrompt.001": "Yeon's precise comfort for today",
  },
  ja: {
    "yeonPrompt.001": "ヨニが届ける今日の繊細な慰め",
  },
  zh: {
    "yeonPrompt.001": "缘伊送上的今日细腻安慰",
  },
} as const;

function yeonPromptText(key: keyof typeof YEON_PROMPT_TEXT_TRANSLATIONS.ko): string {
  return YEON_PROMPT_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}

const zodiacSignatureMap: Record<ZodiacSign, ZodiacSignature> = {
  양자리: {
    keyword: "추진력의 리듬",
    subKeyword: "빠른 결정을 다정하게 조절",
    color: "코럴 오로라",
    strength: "시작 버튼을 가장 먼저 누르는 용기",
    carePoint: "속도가 빠를수록 몸의 긴장을 먼저 풀어주기",
    relationshipTone: "해결책보다 마음 상태를 먼저 말하면 관계가 편안해져요.",
    workTone: "우선순위 1개만 고정하면 에너지가 크게 낭비되지 않아요.",
    moneyTone: "즉시 결제 전에 10분만 보류하면 후회 확률이 줄어요.",
    joyItem: "따뜻한 허브티",
    joyAction: "첫 모금을 마시기 전 어깨를 아래로 3번 내리기",
  },
  황소자리: {
    keyword: "안정의 고요",
    subKeyword: "리듬 있는 회복",
    color: "샌드 골드",
    strength: "한 번 정한 루틴을 끝까지 지키는 지속력",
    carePoint: "고집이 피로로 바뀌기 전에 유연한 여백 넣기",
    relationshipTone: "느린 템포의 진심 대화가 신뢰를 더 두텁게 만들어요.",
    workTone: "익숙한 순서를 유지하되 1개만 새 시도를 넣어보세요.",
    moneyTone: "안정형 소비 계획에 작은 보상 예산을 함께 두세요.",
    joyItem: "무향 캔들",
    joyAction: "불빛을 5분 바라보며 오늘 감사한 일 1개 적기",
  },
  쌍둥이자리: {
    keyword: "생각의 환기",
    subKeyword: "복잡함을 명료하게",
    color: "실버 민트",
    strength: "상황을 빠르게 해석하고 연결하는 지적 민첩성",
    carePoint: "정보 과부하가 오기 전에 생각을 짧게 메모해 분리하기",
    relationshipTone: "가벼운 대화 속에서도 핵심 감정을 한 문장으로 남겨보세요.",
    workTone: "해야 할 일을 20분 블록으로 쪼개면 집중이 되살아나요.",
    moneyTone: "새로운 지출은 필요-호기심을 구분해 체크해 보세요.",
    joyItem: "작은 메모 카드",
    joyAction: "머릿속 걱정 1개와 실행 1개를 짝으로 적기",
  },
  게자리: {
    keyword: "감정의 안전지대",
    subKeyword: "부드러운 연결 회복",
    color: "문라이트 민트",
    strength: "사람의 감정 온도를 섬세하게 읽는 공감력",
    carePoint: "혼자 견디는 습관을 줄이고 안부 요청을 생활화하기",
    relationshipTone: "오늘은 정답보다 따뜻한 반응이 관계를 더 살려줘요.",
    workTone: "감정 소모가 큰 시간대에는 가벼운 업무를 배치해 보세요.",
    moneyTone: "위로 소비가 커지기 쉬우니 장바구니 대기 시간을 두세요.",
    joyItem: "창가 무드등",
    joyAction: "불을 켜고 좋아하는 곡 1개를 끝까지 듣기",
  },
  사자자리: {
    keyword: "빛나는 존재감",
    subKeyword: "자신감의 균형",
    color: "선셋 앰버",
    strength: "분위기를 밝히는 따뜻한 카리스마",
    carePoint: "책임감이 과열되면 스스로에게 관대해지기",
    relationshipTone: "표현을 줄이기보다 의도를 부드럽게 덧붙여보세요.",
    workTone: "리더 역할일수록 휴식 시간을 먼저 캘린더에 고정하세요.",
    moneyTone: "체면성 지출은 목적을 적어보면 절반은 정리돼요.",
    joyItem: "골드 포인트 노트",
    joyAction: "오늘 잘한 행동 2개를 짧게 기록하기",
  },
  처녀자리: {
    keyword: "정밀한 정리",
    subKeyword: "작은 개선의 누적",
    color: "아이보리 세이지",
    strength: "디테일을 안정적으로 다듬는 실무 감각",
    carePoint: "완벽주의가 자책으로 번지지 않도록 기준 완화하기",
    relationshipTone: "지적보다 요청 형태로 말하면 감정 충돌이 줄어요.",
    workTone: "검수 기준을 3개로 줄이면 오히려 완성도가 좋아져요.",
    moneyTone: "생활비는 주간 단위로 나누면 예측이 쉬워져요.",
    joyItem: "아로마 핸드크림",
    joyAction: "손에 바른 뒤 손목 호흡 4회로 긴장 낮추기",
  },
  천칭자리: {
    keyword: "균형 감각",
    subKeyword: "관계와 나의 조화",
    color: "로즈 스카이",
    strength: "상반된 입장을 부드럽게 중재하는 조율 능력",
    carePoint: "모두를 맞추려다 내 감정이 밀리지 않게 경계 세우기",
    relationshipTone: "상대의 마음을 듣기 전에 내 상태도 함께 공유해 보세요.",
    workTone: "협업은 역할을 한 줄로 명확히 하면 피로가 줄어요.",
    moneyTone: "예쁜 소비일수록 사용 빈도를 먼저 점검하세요.",
    joyItem: "작은 플라워 북마크",
    joyAction: "하루 마감 전에 고마운 순간 1개 표시하기",
  },
  전갈자리: {
    keyword: "깊이의 통찰",
    subKeyword: "강한 감정의 정제",
    color: "딥 플럼",
    strength: "본질을 파고드는 집중력과 회복 탄성",
    carePoint: "감정을 오래 누적하지 말고 주기적으로 배출하기",
    relationshipTone: "침묵보다 솔직한 한 문장이 신뢰를 지켜줘요.",
    workTone: "깊은 몰입 후에는 반드시 리셋 시간을 넣어주세요.",
    moneyTone: "큰 결제는 하루 보류 후 다시 보면 정확도가 올라가요.",
    joyItem: "짙은 톤 머그컵",
    joyAction: "따뜻한 물을 천천히 마시며 생각 1줄 정리하기",
  },
  사수자리: {
    keyword: "확장의 화살",
    subKeyword: "가능성 탐색",
    color: "코발트 오렌지",
    strength: "새로운 시야를 빠르게 받아들이는 낙관성",
    carePoint: "흥분한 결정을 실행 전 점검 루틴으로 정리하기",
    relationshipTone: "유머와 진심을 같이 쓰면 관계가 더 단단해져요.",
    workTone: "아이디어는 좋지만 마감 단위를 더 작게 쪼개보세요.",
    moneyTone: "경험 소비는 월간 상한선을 정해두면 더 즐거워요.",
    joyItem: "미니 지도 스티커",
    joyAction: "가고 싶은 장소 1곳과 실행 날짜를 함께 적기",
  },
  염소자리: {
    keyword: "현실의 구조화",
    subKeyword: "책임과 회복의 균형",
    color: "그라파이트 블루",
    strength: "장기 계획을 끝까지 완수하는 실행력",
    carePoint: "책임감이 죄책감으로 넘어가기 전에 휴식 허용하기",
    relationshipTone: "단단한 태도 속에 따뜻한 표현을 한 줄 더해 보세요.",
    workTone: "성과 체크를 숫자 1개로 단순화하면 압박이 줄어요.",
    moneyTone: "안전 자산 우선 원칙이 오늘도 가장 유효해요.",
    joyItem: "단단한 커버 다이어리",
    joyAction: "오늘의 완료 항목 1개를 체크하고 종료하기",
  },
  물병자리: {
    keyword: "독창성의 전류",
    subKeyword: "새로운 관점 전환",
    color: "네온 아쿠아",
    strength: "고정관념을 깨는 참신한 사고",
    carePoint: "머릿속 설계가 과해질 때 감각 중심 루틴으로 환기하기",
    relationshipTone: "거리감이 느껴질수록 감정 언어를 더 직접적으로 써보세요.",
    workTone: "혁신 아이디어는 MVP 한 단계로 줄여 실행해 보세요.",
    moneyTone: "신기술/신제품 지출은 목적과 기간을 먼저 정리하세요.",
    joyItem: "투명 유리컵",
    joyAction: "차가운 물 한 모금 후 눈을 감고 10초 리셋하기",
  },
  물고기자리: {
    keyword: "직감의 파도",
    subKeyword: "섬세한 감정 정돈",
    color: "미스트 블루",
    strength: "보이지 않는 분위기까지 읽어내는 감수성",
    carePoint: "감정이 번질 때 경계를 선명히 정해주기",
    relationshipTone: "추측보다 확인 질문을 쓰면 마음이 훨씬 편해져요.",
    workTone: "몰입 작업 전후에 짧은 정리 루틴을 꼭 넣어주세요.",
    moneyTone: "기분 기반 소비는 이유를 적으면 절반이 정리돼요.",
    joyItem: "별 모양 메모지",
    joyAction: "걱정 1개와 가능한 행동 1개를 짝으로 적기",
  },
};

const moodGuideMap: Record<YeonMood, MoodGuide> = {
  happy: {
    paceLine: "기분 좋은 에너지를 오래 유지하려면 속도를 조금만 낮춰서 음미해봐.",
    focusLine: "오늘의 기쁨이 지나가기 전에 고마운 포인트를 하나 남겨두자.",
    avoidLine: "흥분한 결정은 잠깐만 쉬고 다시 보면 훨씬 정확해.",
    recoveryLine: "따뜻한 휴식과 짧은 기록이 행복의 밀도를 더 높여줄 거야.",
  },
  tired: {
    paceLine: "지친 날엔 해야 할 일을 줄이는 게 오히려 큰 성과야.",
    focusLine: "몸의 피로를 먼저 낮추면 마음도 자연스럽게 따라와.",
    avoidLine: "완벽하게 끝내려는 압박은 오늘만큼은 내려놓아도 괜찮아.",
    recoveryLine: "작고 확실한 회복 루틴 하나가 내일의 집중을 살려줘.",
  },
  anxious: {
    paceLine: "불안은 한 번에 해결하기보다 작은 단위로 나누는 게 좋아.",
    focusLine: "지금 할 수 있는 한 가지를 먼저 붙잡으면 마음이 안정돼.",
    avoidLine: "미래를 전부 예측하려는 습관은 오늘 잠깐 쉬어가자.",
    recoveryLine: "호흡과 메모를 함께 쓰면 생각의 파도가 잔잔해질 거야.",
  },
  lonely: {
    paceLine: "외로운 날일수록 감정을 숨기지 말고 짧게라도 표현해보자.",
    focusLine: "안부 한 문장이 고립감을 크게 줄여줄 수 있어.",
    avoidLine: "괜찮은 척 버티는 시간이 길어지면 마음이 더 지쳐.",
    recoveryLine: "작은 연결 하나가 오늘의 밤을 훨씬 따뜻하게 만들어줘.",
  },
  angry: {
    paceLine: "화가 날수록 속도를 줄이고 감정의 온도를 먼저 낮추자.",
    focusLine: "내 마음을 보호하는 경계 문장을 준비해두면 좋아.",
    avoidLine: "즉시 반응은 후회가 되기 쉬우니 잠깐 멈춤을 넣어줘.",
    recoveryLine: "차분한 리듬으로 말하면 힘을 잃지 않고도 전달할 수 있어.",
  },
  blank: {
    paceLine: "멍한 날엔 회복을 우선으로 두는 게 가장 현명해.",
    focusLine: "에너지가 비는 시간은 쉬어도 된다는 신호일 수 있어.",
    avoidLine: "의미를 억지로 찾으려 하지 말고 리듬부터 맞춰보자.",
    recoveryLine: "느리게 숨 쉬고 천천히 움직이면 감각이 다시 돌아와.",
  },
  hopeful: {
    paceLine: "기대되는 마음이 올라온 날엔 작게 시작하는 게 핵심이야.",
    focusLine: "가벼운 첫 실행이 내일의 큰 흐름을 만든다.",
    avoidLine: "한 번에 크게 하려는 욕심은 리듬을 끊을 수 있어.",
    recoveryLine: "작은 성취를 바로 칭찬하면 기대가 안정적으로 자라나.",
  },
};

function defaultByMood(mood: YeonMood) {
  return {
    happy: "오늘은 작은 기쁨을 오래 음미해도 좋아.",
    tired: "오늘은 할 일을 줄이는 것도 중요한 성취야.",
    anxious: "불안을 줄이려면 문제를 작게 나눠보자.",
    lonely: "혼자인 마음은 안부 한 줄에서 천천히 풀릴 수 있어.",
    angry: "감정의 온도를 내리기 위해 잠깐 멈춰 숨을 고르자.",
    blank: "멍한 날엔 회복이 먼저야. 느린 속도를 허락해줘.",
    hopeful: "작은 시작 하나가 기대를 현실로 바꿔줘.",
  }[mood];
}

function clampShortMessage(input: string) {
  const text = String(input || "").trim();
  if (!text) return "오늘의 속도를 조금만 낮추면, 마음이 다시 나를 따라와요.";
  return text.length > 74 ? `${text.slice(0, 74)}...` : text;
}

function buildDynamicYeonMessage(input: AstrologyEngineInput): YeonMessageOutput {
  const mood = input.userEmotion?.selectedMood || "blank";
  const opening = moodOpeningMap[mood];
  const pose = yeonEmotionPoseMap[mood];
  const signal = normalizeFortuneSignal(input);
  const signature = zodiacSignatureMap[input.zodiacSign];
  const moodGuide = moodGuideMap[mood];

  const hugLines = [
    opening,
    `${input.zodiacSign}의 장점은 ${signature.strength}이야. ${signal.mainEnergy}`,
    `${moodGuide.paceLine} ${signal.emotionalTheme}`,
    `${moodGuide.avoidLine} ${signal.cautionTheme}`,
    `${moodGuide.recoveryLine} ${signal.recoveryTheme}`,
  ];

  return {
    zodiac_sign: input.zodiacSign,
    weekly_vibe: {
      keyword: signature.keyword,
      sub_keyword: signature.subKeyword,
      emotional_color: signature.color,
      summary: `${signal.mainEnergy} · ${signature.carePoint}`,
    },
    emotion_adaptive_opening: {
      selected_mood: mood,
      first_sentence: opening,
    },
    yeon_is_hug: {
      title: yeonPromptText("yeonPrompt.001"),
      message: hugLines,
    },
    small_joy: {
      item: signature.joyItem,
      action: signature.joyAction,
      reason: `${moodGuide.focusLine} ${defaultByMood(mood)}`,
    },
    gentle_advice: {
      love: `${signature.relationshipTone} ${signal.relationshipHint}`,
      work: `${signature.workTone} ${signal.workHint}`,
      money: `${signature.moneyTone} ${signal.moneyHint}`,
      relationship: `${signature.carePoint}. ${signal.relationshipHint}`,
    },
    yeon_illustration_prompt: {
      pose: pose.pose,
      expression: pose.expression,
      background: `${signature.color} 중심의 우주 안개와 미세한 별가루`,
      image_prompt: `Cute flower pig Yeon-i, ${pose.pose}, ${pose.expression}, premium cosmos in ${signature.color} tone, soft starlight particles, emotional healing astrology card style`,
    },
    share_card: {
      card_title: `오늘의 마음 별자리 · ${input.zodiacSign}`,
      short_message: clampShortMessage(`${moodGuide.focusLine} ${signature.carePoint}`),
      hashtags: ["#연이의마음별자리", `#${input.zodiacSign}`, "#감정리듬", "#코드데스티니"],
    },
  };
}

export function buildYeonPrompt(input: AstrologyEngineInput): string {
  const mood = input.userEmotion?.selectedMood || "blank";
  const signal = normalizeFortuneSignal(input);
  return [
    "너는 연이 캐릭터 말투로 JSON만 반환한다.",
    "사주 데이터는 사용하지 말고 astrologyData만 해석한다.",
    `별자리: ${input.zodiacSign}`,
    `감정: ${mood}`,
    `메인 에너지: ${signal.mainEnergy}`,
    `감정 테마: ${signal.emotionalTheme}`,
    `주의 테마: ${signal.cautionTheme}`,
    `회복 테마: ${signal.recoveryTheme}`,
    "yeon_is_hug.message는 4~5문장, 첫 문장은 감정별 opening 사용.",
    "공포/단정 표현 금지. short_message는 1~2문장.",
  ].join("\n");
}

export function fallbackYeonMessage(input: AstrologyEngineInput): YeonMessageOutput {
  return buildDynamicYeonMessage(input);
}

export function generateYeonMessageFromAstrology(input: AstrologyEngineInput): YeonMessageOutput {
  const candidate = buildDynamicYeonMessage(input);

  const quality = validateYeonMessage(candidate);
  if (!quality.ok) return fallbackYeonMessage(input);
  return candidate;
}
