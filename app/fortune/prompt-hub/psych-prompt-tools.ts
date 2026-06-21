export type PsychPromptMode = "relationship" | "career" | "emotion" | "decision";

export type PsychOption = {
  id: string;
  label: string;
  signal: string;
  type: string;
};

export type PsychQuestion = {
  id: string;
  text: string;
  options: PsychOption[];
};

export type PsychArchetype = {
  type: string;
  label: string;
  summary: string;
  strengths: string[];
  cautions: string[];
  promptFocus: string[];
};

export type PsychPromptTest = {
  id: PsychPromptMode;
  title: string;
  subtitle: string;
  description: string;
  guide: string;
  archetypes: PsychArchetype[];
  questions: PsychQuestion[];
};

export type PsychPromptResult = {
  mode: PsychPromptMode;
  testTitle: string;
  completedAt: string;
  userQuestion: string;
  dominant: PsychArchetype;
  secondary: PsychArchetype;
  scores: Array<{ label: string; type: string; score: number }>;
  answerSummaries: Array<{
    question: string;
    answer: string;
    signal: string;
  }>;
};

const RELATIONSHIP_ARCHETYPES: PsychArchetype[] = [
  {
    type: "secure",
    label: "안정 확인형",
    summary: "관계의 온도를 차분히 확인하고 약속과 태도를 함께 보려는 흐름이 강합니다.",
    strengths: ["신뢰를 천천히 쌓음", "상대의 상황을 함께 고려함", "관계의 지속성을 중시함"],
    cautions: ["확인이 늦어지면 속마음을 삼킬 수 있음", "갈등을 오래 미루기 쉬움"],
    promptFocus: ["관계 안정 조건", "확인해야 할 약속", "감정 표현의 적정 속도"],
  },
  {
    type: "deep",
    label: "깊이 몰입형",
    summary: "마음이 움직이면 깊게 들어가고, 관계의 진심과 몰입을 크게 느끼는 편입니다.",
    strengths: ["감정 집중력이 높음", "진심을 빠르게 알아차림", "관계에 정성을 쏟음"],
    cautions: ["상대의 작은 반응을 크게 해석할 수 있음", "기다림이 길어지면 불안이 커짐"],
    promptFocus: ["감정 과열 구간", "상대 반응을 읽는 기준", "기다림을 줄이는 행동"],
  },
  {
    type: "distance",
    label: "거리 조율형",
    summary: "가까워지고 싶어도 내 리듬을 잃지 않으려 하며, 안전한 거리에서 마음을 확인합니다.",
    strengths: ["경계를 잘 지킴", "관계에 휩쓸리지 않음", "상황을 객관화함"],
    cautions: ["표현이 늦어 차갑게 보일 수 있음", "좋은 기회도 관찰만 하다 놓칠 수 있음"],
    promptFocus: ["거리감의 이유", "표현을 늘릴 지점", "관계 회피와 신중함의 구분"],
  },
  {
    type: "expressive",
    label: "표현 탐색형",
    summary: "마음이 움직이면 말과 행동으로 확인하려 하고, 관계의 반응 속도를 중요하게 봅니다.",
    strengths: ["표현이 빠름", "관계 분위기를 살림", "막힌 대화를 열기 쉬움"],
    cautions: ["답을 빨리 확인하려 할 수 있음", "상대 속도보다 앞서갈 수 있음"],
    promptFocus: ["표현의 타이밍", "확인 욕구 조절", "상대가 부담을 느끼는 지점"],
  },
];

const CAREER_ARCHETYPES: PsychArchetype[] = [
  {
    type: "structure",
    label: "구조 설계형",
    summary: "일의 기준과 순서를 잡을 때 재능이 안정적으로 살아납니다.",
    strengths: ["계획을 세움", "누락을 줄임", "장기 목표에 강함"],
    cautions: ["완벽한 조건을 기다리다 시작이 늦어질 수 있음", "변수에 피로가 쌓임"],
    promptFocus: ["일의 우선순위", "지속 가능한 루틴", "완벽주의 조정"],
  },
  {
    type: "spark",
    label: "확장 실험형",
    summary: "새로운 시도와 변화 속에서 감각이 열리고 가능성을 빠르게 찾습니다.",
    strengths: ["기회 포착", "빠른 시도", "아이디어 확장"],
    cautions: ["마무리 전에 다음 자극으로 옮겨갈 수 있음", "루틴이 약해질 수 있음"],
    promptFocus: ["실험의 범위", "마무리 기준", "기회와 산만함의 구분"],
  },
  {
    type: "people",
    label: "관계 협업형",
    summary: "사람의 필요와 분위기를 읽으며 협업과 조율 안에서 능력이 드러납니다.",
    strengths: ["소통 감각", "중재력", "상대의 니즈 파악"],
    cautions: ["타인의 기대를 떠안기 쉬움", "내 기준이 뒤로 밀릴 수 있음"],
    promptFocus: ["협업 경계", "내 몫과 남의 몫", "관계 피로 관리"],
  },
  {
    type: "craft",
    label: "몰입 장인형",
    summary: "깊게 파고드는 일에서 실력이 쌓이고, 조용한 집중 시간이 중요합니다.",
    strengths: ["전문성", "집중력", "작품 완성도"],
    cautions: ["혼자 떠안기 쉬움", "피드백을 늦게 받을 수 있음"],
    promptFocus: ["전문성 강화", "피드백 타이밍", "고립과 몰입의 균형"],
  },
];

const EMOTION_ARCHETYPES: PsychArchetype[] = [
  {
    type: "body",
    label: "감각 회복형",
    summary: "몸의 감각과 환경이 안정될 때 마음도 함께 가라앉습니다.",
    strengths: ["현실 감각", "생활 리듬 회복", "몸의 신호를 잘 느낌"],
    cautions: ["피로를 감정 문제로 착각할 수 있음", "환경이 흐트러지면 예민해짐"],
    promptFocus: ["몸과 마음의 연결", "회복 루틴", "환경 정리"],
  },
  {
    type: "talk",
    label: "대화 정리형",
    summary: "말로 풀어낼 때 감정의 모양이 선명해지고, 마음이 정리됩니다.",
    strengths: ["감정 언어화", "관계 회복", "상황 설명력"],
    cautions: ["상대 반응에 따라 기분이 흔들릴 수 있음", "말이 길어질 수 있음"],
    promptFocus: ["말해야 할 감정", "대화 순서", "상대에게 요구할 것"],
  },
  {
    type: "alone",
    label: "혼자 재정렬형",
    summary: "혼자 있는 시간이 생기면 감정의 소음이 낮아지고 판단이 맑아집니다.",
    strengths: ["내면 관찰", "자기 회복", "감정 거리두기"],
    cautions: ["고립이 길어질 수 있음", "필요한 도움 요청이 늦어질 수 있음"],
    promptFocus: ["혼자 회복하는 방식", "도움 요청 기준", "감정 회피 여부"],
  },
  {
    type: "action",
    label: "행동 전환형",
    summary: "움직이며 장면을 바꿀 때 감정이 빠르게 환기되고 다시 힘이 생깁니다.",
    strengths: ["회복 속도", "실행력", "분위기 전환"],
    cautions: ["감정을 충분히 보지 않고 바쁘게 넘길 수 있음", "쉬어야 할 때도 움직일 수 있음"],
    promptFocus: ["행동으로 푸는 감정", "멈춤이 필요한 순간", "실행과 회피의 구분"],
  },
];

const DECISION_ARCHETYPES: PsychArchetype[] = [
  {
    type: "proof",
    label: "근거 확인형",
    summary: "판단 전에 자료와 조건을 맞추며, 납득 가능한 선택을 선호합니다.",
    strengths: ["리스크 점검", "현실 검토", "차분한 비교"],
    cautions: ["확신이 늦게 올 수 있음", "정보가 많아질수록 결정이 무거워짐"],
    promptFocus: ["필수 근거", "결정 기한", "과잉 검토 줄이기"],
  },
  {
    type: "intuition",
    label: "직감 점화형",
    summary: "마음이 선명하게 반응하는 순간을 중요하게 보고, 기회를 빠르게 붙잡습니다.",
    strengths: ["빠른 감지", "기회 포착", "흐름을 읽는 감각"],
    cautions: ["감정의 파도와 직감을 혼동할 수 있음", "검토가 부족해질 수 있음"],
    promptFocus: ["직감 검증", "최소 확인 조건", "감정과 신호의 구분"],
  },
  {
    type: "risk",
    label: "리스크 방어형",
    summary: "나쁜 가능성을 먼저 살피며, 안전한 선택지를 확보해야 움직임이 편해집니다.",
    strengths: ["위험 감지", "대비책 마련", "손실 최소화"],
    cautions: ["가능성보다 위험을 크게 볼 수 있음", "좋은 제안도 불안 때문에 늦출 수 있음"],
    promptFocus: ["불안의 근거", "대비책", "멈춤과 준비의 구분"],
  },
  {
    type: "timing",
    label: "타이밍 관찰형",
    summary: "상황의 흐름과 사람들의 반응을 보며 움직일 때 판단이 안정됩니다.",
    strengths: ["분위기 파악", "적절한 때를 기다림", "관계 변수 관찰"],
    cautions: ["기다림이 길어질 수 있음", "내 의사를 늦게 드러낼 수 있음"],
    promptFocus: ["움직일 신호", "기다림의 한계", "타이밍과 미루기의 구분"],
  },
];

function option(id: string, label: string, signal: string, type: string): PsychOption {
  return { id, label, signal, type };
}

export const PSYCH_PROMPT_TESTS: PsychPromptTest[] = [
  {
    id: "relationship",
    title: "관계 마음결 테스트",
    subtitle: "Relationship Mind Pattern",
    description: "관계 안에서 가까워지는 방식, 불안이 켜지는 순간, 표현의 속도를 먼저 살핀 뒤 상담 프롬프트로 엮습니다.",
    guide: "지금 떠오르는 한 사람이나 관계 장면을 기준으로 답하면 흐름이 더 선명해집니다.",
    archetypes: RELATIONSHIP_ARCHETYPES,
    questions: [
      {
        id: "r1",
        text: "상대의 답이 늦어질 때 가장 먼저 드는 마음은 무엇인가요?",
        options: [
          option("a", "조금 기다리며 상황을 확인한다", "확인과 신뢰의 균형을 먼저 봅니다.", "secure"),
          option("b", "마음이 식은 건 아닌지 깊게 생각한다", "작은 반응에도 마음이 깊게 들어갑니다.", "deep"),
          option("c", "나도 거리를 두며 내 리듬을 지킨다", "가까움보다 안전한 거리를 먼저 확보합니다.", "distance"),
          option("d", "바로 물어보고 분위기를 풀고 싶다", "표현과 반응을 통해 관계를 확인합니다.", "expressive"),
        ],
      },
      {
        id: "r2",
        text: "관계가 애매할 때 편한 방식은 무엇인가요?",
        options: [
          option("a", "천천히 말과 행동이 맞는지 본다", "관계의 지속성을 확인합니다.", "secure"),
          option("b", "상대의 진심을 집중해서 읽는다", "마음의 깊이를 크게 봅니다.", "deep"),
          option("c", "확신 전에는 내 영역을 지킨다", "경계와 독립성을 중시합니다.", "distance"),
          option("d", "대화를 열어 빨리 방향을 정한다", "표현과 확인을 우선합니다.", "expressive"),
        ],
      },
      {
        id: "r3",
        text: "서운함이 생겼을 때 가까운 반응은 무엇인가요?",
        options: [
          option("a", "정리한 뒤 차분히 말한다", "감정과 현실을 함께 정돈합니다.", "secure"),
          option("b", "혼자 여러 장면을 되짚는다", "감정의 의미를 깊게 파고듭니다.", "deep"),
          option("c", "상처받기 전에 한 발 물러난다", "거리로 마음을 보호합니다.", "distance"),
          option("d", "표정이나 말투로 먼저 드러난다", "감정 표현이 빠르게 올라옵니다.", "expressive"),
        ],
      },
      {
        id: "r4",
        text: "가장 편안한 관계의 모습은 무엇인가요?",
        options: [
          option("a", "서로의 약속과 일상이 안정된 관계", "신뢰의 반복을 편안하게 느낍니다.", "secure"),
          option("b", "서로를 깊이 이해하고 몰입하는 관계", "진심의 깊이를 중요하게 봅니다.", "deep"),
          option("c", "각자의 시간을 존중하는 관계", "자율성과 친밀감을 함께 원합니다.", "distance"),
          option("d", "마음을 자주 표현하고 확인하는 관계", "표현의 왕복에서 안정감을 얻습니다.", "expressive"),
        ],
      },
      {
        id: "r5",
        text: "관계 상담에서 가장 알고 싶은 것은 무엇인가요?",
        options: [
          option("a", "이 관계가 안정적으로 이어질 조건", "관계의 기반을 확인하려 합니다.", "secure"),
          option("b", "상대의 진심과 내 마음의 깊이", "마음의 온도를 알고 싶어 합니다.", "deep"),
          option("c", "내가 어디까지 다가가도 되는지", "거리와 경계를 확인하려 합니다.", "distance"),
          option("d", "지금 먼저 표현해도 되는지", "표현의 타이밍을 묻고 있습니다.", "expressive"),
        ],
      },
    ],
  },
  {
    id: "career",
    title: "일과 재능 리듬 테스트",
    subtitle: "Career Talent Rhythm",
    description: "일이 잘 풀릴 때의 리듬, 지치는 조건, 재능이 살아나는 환경을 먼저 가려 프롬프트에 담습니다.",
    guide: "최근 일, 공부, 프로젝트, 돈을 버는 방식 중 가장 마음에 남는 장면을 기준으로 답해 주세요.",
    archetypes: CAREER_ARCHETYPES,
    questions: [
      {
        id: "c1",
        text: "새로운 일을 시작할 때 가장 먼저 필요한 것은 무엇인가요?",
        options: [
          option("a", "목표와 순서가 보이는 계획표", "구조가 잡힐수록 힘이 납니다.", "structure"),
          option("b", "일단 해볼 수 있는 작은 실험", "시도 속에서 방향을 찾습니다.", "spark"),
          option("c", "함께 맞춰 갈 사람과 역할", "사람과 흐름을 함께 봅니다.", "people"),
          option("d", "깊게 몰입할 조용한 시간", "집중할 때 실력이 쌓입니다.", "craft"),
        ],
      },
      {
        id: "c2",
        text: "일에서 가장 쉽게 지치는 순간은 언제인가요?",
        options: [
          option("a", "기준이 자꾸 바뀔 때", "변수가 많으면 에너지가 새어 나갑니다.", "structure"),
          option("b", "반복만 있고 새로움이 없을 때", "자극이 없으면 동력이 줄어듭니다.", "spark"),
          option("c", "사람 사이 조율을 혼자 떠안을 때", "관계 피로가 크게 쌓입니다.", "people"),
          option("d", "충분히 파고들 시간이 없을 때", "깊이가 막히면 답답함이 커집니다.", "craft"),
        ],
      },
      {
        id: "c3",
        text: "칭찬받을 때 가장 자주 듣는 말은 무엇에 가깝나요?",
        options: [
          option("a", "정리가 잘 되어 있다", "체계와 완성도가 강점입니다.", "structure"),
          option("b", "아이디어가 좋다", "확장 감각이 살아 있습니다.", "spark"),
          option("c", "사람을 편하게 만든다", "협업의 결을 잘 읽습니다.", "people"),
          option("d", "디테일이 깊다", "집중과 전문성이 드러납니다.", "craft"),
        ],
      },
      {
        id: "c4",
        text: "돈과 커리어를 볼 때 가장 신경 쓰는 기준은 무엇인가요?",
        options: [
          option("a", "오래 유지될 안정성", "지속 가능한 기반을 봅니다.", "structure"),
          option("b", "확장될 가능성", "성장과 기회를 먼저 봅니다.", "spark"),
          option("c", "사람과의 맞물림", "관계와 신뢰가 중요합니다.", "people"),
          option("d", "내 실력이 쌓이는지", "전문성과 축적을 중시합니다.", "craft"),
        ],
      },
      {
        id: "c5",
        text: "지금 가장 필요한 조언은 무엇인가요?",
        options: [
          option("a", "우선순위를 다시 잡는 법", "구조 조정이 필요합니다.", "structure"),
          option("b", "새로운 기회를 고르는 법", "실험의 방향이 필요합니다.", "spark"),
          option("c", "관계 피로를 줄이는 법", "역할 경계가 필요합니다.", "people"),
          option("d", "몰입을 성과로 바꾸는 법", "결과로 연결하는 통로가 필요합니다.", "craft"),
        ],
      },
    ],
  },
  {
    id: "emotion",
    title: "감정 회복 리듬 테스트",
    subtitle: "Emotional Recovery Rhythm",
    description: "마음이 흔들릴 때 안정되는 방식과 회복을 막는 습관을 먼저 읽어 프롬프트로 정리합니다.",
    guide: "최근 지쳤던 날을 떠올리고, 실제로 마음이 조금 내려앉았던 방식을 골라 주세요.",
    archetypes: EMOTION_ARCHETYPES,
    questions: [
      {
        id: "e1",
        text: "마음이 복잡할 때 가장 먼저 도움이 되는 것은 무엇인가요?",
        options: [
          option("a", "씻기, 산책, 잠처럼 몸을 안정시키는 일", "몸이 안정되면 마음도 따라옵니다.", "body"),
          option("b", "누군가에게 말하며 정리하는 일", "말로 풀어낼 때 선명해집니다.", "talk"),
          option("c", "혼자 조용히 시간을 갖는 일", "혼자 있을 때 감정이 가라앉습니다.", "alone"),
          option("d", "청소나 운동처럼 바로 움직이는 일", "행동으로 장면을 바꿉니다.", "action"),
        ],
      },
      {
        id: "e2",
        text: "감정이 오래 쌓이는 이유는 무엇에 가깝나요?",
        options: [
          option("a", "몸이 피곤한데 계속 버틴다", "피로와 감정이 함께 묶입니다.", "body"),
          option("b", "말하지 못한 문장이 남는다", "표현되지 않은 감정이 쌓입니다.", "talk"),
          option("c", "혼자 정리할 시간이 부족하다", "내면의 공간이 필요합니다.", "alone"),
          option("d", "멈춰 있으면 더 답답해진다", "정체감이 감정을 키웁니다.", "action"),
        ],
      },
      {
        id: "e3",
        text: "위로를 받을 때 가장 편한 말은 무엇인가요?",
        options: [
          option("a", "오늘은 몸부터 쉬자", "감각 회복이 먼저입니다.", "body"),
          option("b", "무슨 일이 있었는지 말해줘", "대화가 회복의 문입니다.", "talk"),
          option("c", "천천히 혼자 있어도 괜찮아", "고요한 시간이 필요합니다.", "alone"),
          option("d", "잠깐 나가서 바람 쐬자", "움직임이 마음을 바꿉니다.", "action"),
        ],
      },
      {
        id: "e4",
        text: "회복을 방해하는 패턴은 무엇인가요?",
        options: [
          option("a", "생활 리듬이 무너진다", "환경과 몸의 질서가 흔들립니다.", "body"),
          option("b", "같은 말을 마음속에서 반복한다", "감정 언어가 갇혀 있습니다.", "talk"),
          option("c", "사람을 만나도 더 지친다", "혼자 회복할 시간이 부족합니다.", "alone"),
          option("d", "바쁘게 움직이다 감정을 놓친다", "행동이 감정을 덮을 수 있습니다.", "action"),
        ],
      },
      {
        id: "e5",
        text: "감정 상담 프롬프트에서 가장 다루고 싶은 것은 무엇인가요?",
        options: [
          option("a", "몸과 마음의 피로 신호", "회복 기반을 확인하려 합니다.", "body"),
          option("b", "말하지 못한 감정의 정리", "표현의 순서가 필요합니다.", "talk"),
          option("c", "혼자 견디는 습관의 균형", "고립과 회복을 구분해야 합니다.", "alone"),
          option("d", "기분을 바꾸는 실천 루틴", "행동의 방향이 필요합니다.", "action"),
        ],
      },
    ],
  },
  {
    id: "decision",
    title: "선택 패턴 테스트",
    subtitle: "Decision Pattern Check",
    description: "중요한 선택 앞에서 확인하는 기준, 불안이 커지는 지점, 움직여도 되는 신호를 프롬프트로 정리합니다.",
    guide: "이직, 계약, 고백, 투자, 이동처럼 지금 미루고 있는 선택을 하나 떠올리고 답해 주세요.",
    archetypes: DECISION_ARCHETYPES,
    questions: [
      {
        id: "d1",
        text: "결정 전에 가장 먼저 확인하는 것은 무엇인가요?",
        options: [
          option("a", "자료와 조건이 맞는지", "근거가 있어야 마음이 놓입니다.", "proof"),
          option("b", "내 마음이 선명하게 반응하는지", "직감의 온도를 먼저 봅니다.", "intuition"),
          option("c", "최악의 경우를 버틸 수 있는지", "위험을 먼저 막으려 합니다.", "risk"),
          option("d", "지금이 움직일 때인지", "타이밍과 분위기를 봅니다.", "timing"),
        ],
      },
      {
        id: "d2",
        text: "결정이 늦어질 때 가장 큰 이유는 무엇인가요?",
        options: [
          option("a", "정보가 아직 부족하다", "확인할 근거가 더 필요합니다.", "proof"),
          option("b", "처음의 확신이 흐려졌다", "직감과 감정이 섞입니다.", "intuition"),
          option("c", "손해가 날까 봐 불안하다", "손실 가능성이 크게 보입니다.", "risk"),
          option("d", "아직 상황이 무르익지 않았다", "기다림이 길어질 수 있습니다.", "timing"),
        ],
      },
      {
        id: "d3",
        text: "선택 후 후회가 남는 경우는 언제인가요?",
        options: [
          option("a", "충분히 비교하지 않았을 때", "검토 부족이 마음에 남습니다.", "proof"),
          option("b", "내 느낌을 무시했을 때", "내면 신호를 놓치면 후회합니다.", "intuition"),
          option("c", "위험 신호를 넘겼을 때", "대비하지 못한 변수가 부담입니다.", "risk"),
          option("d", "너무 늦게 움직였을 때", "때를 놓친 느낌이 남습니다.", "timing"),
        ],
      },
      {
        id: "d4",
        text: "누군가 조언해 줄 때 가장 도움이 되는 방식은 무엇인가요?",
        options: [
          option("a", "장단점을 표로 정리해 주는 것", "근거가 보이면 안정됩니다.", "proof"),
          option("b", "내가 이미 아는 답을 짚어 주는 것", "내면의 신호를 확인합니다.", "intuition"),
          option("c", "리스크와 대비책을 같이 세워 주는 것", "방어선이 필요합니다.", "risk"),
          option("d", "언제 움직이면 좋을지 봐 주는 것", "행동의 때를 알고 싶어 합니다.", "timing"),
        ],
      },
      {
        id: "d5",
        text: "지금 선택 앞에서 가장 필요한 문장은 무엇인가요?",
        options: [
          option("a", "확인할 것과 내려놓을 것을 나누자", "검토의 끝을 정해야 합니다.", "proof"),
          option("b", "내 마음이 반복해서 가리키는 곳을 보자", "직감의 반복을 봅니다.", "intuition"),
          option("c", "두려움과 실제 위험을 분리하자", "불안의 실체를 가려야 합니다.", "risk"),
          option("d", "기다릴 신호와 움직일 신호를 정하자", "타이밍 기준이 필요합니다.", "timing"),
        ],
      },
    ],
  },
];

function formatCompletedAt(date = new Date()) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(date);
}

function findTest(mode: PsychPromptMode) {
  const test = PSYCH_PROMPT_TESTS.find((item) => item.id === mode);
  if (!test) throw new Error("심리테스트 주제를 다시 선택해 주세요.");
  return test;
}

function findArchetype(test: PsychPromptTest, type: string) {
  return test.archetypes.find((item) => item.type === type) || test.archetypes[0];
}

function joinList(values: string[]) {
  return values.filter(Boolean).join(", ") || "미산출";
}

export function getPsychQuestionNotice(question: string) {
  const trimmed = question.trim();
  if (!trimmed) return "";
  const questionMarks = (trimmed.match(/[?？]/g) || []).length;
  if (questionMarks > 1 || /(그리고|또|동시에|둘 다|여러 가지|각각|이것도|저것도)/u.test(trimmed)) {
    return "심리테스트 기반 프롬프트는 하나의 마음 장면이나 질문에 집중할수록 더 선명하게 이어집니다.";
  }
  return "";
}

export function scorePsychTest(mode: PsychPromptMode, answers: Record<string, string>, userQuestion = ""): PsychPromptResult {
  const test = findTest(mode);
  const scores = new Map<string, number>();
  const answerSummaries = test.questions.map((question) => {
    const answerId = answers[question.id];
    const answer = question.options.find((item) => item.id === answerId);
    if (!answer) throw new Error("아직 답하지 않은 문항이 있습니다. 모든 문항을 선택한 뒤 프롬프트를 생성해 주세요.");
    scores.set(answer.type, (scores.get(answer.type) || 0) + 1);
    return {
      question: question.text,
      answer: answer.label,
      signal: answer.signal,
    };
  });
  const ranked = test.archetypes
    .map((item, index) => ({ ...item, index, score: scores.get(item.type) || 0 }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const dominant = findArchetype(test, ranked[0].type);
  const secondary = findArchetype(test, ranked[1]?.type || ranked[0].type);
  return {
    mode,
    testTitle: test.title,
    completedAt: formatCompletedAt(),
    userQuestion: userQuestion.trim() || "미입력",
    dominant,
    secondary,
    scores: ranked.map((item) => ({ label: item.label, type: item.type, score: item.score })),
    answerSummaries,
  };
}

export function buildPsychPrompt(result: PsychPromptResult) {
  const scoreLines = result.scores.map((item) => `- ${item.label}: ${item.score}점`).join("\n");
  const answerLines = result.answerSummaries
    .map((item, index) => `${index + 1}. ${item.question}\n- 선택: ${item.answer}\n- 단서: ${item.signal}`)
    .join("\n\n");
  return `[심리테스트 기반 AI 상담 프롬프트]

당신은 자기 이해, 관계 패턴, 감정 회복, 현실 선택을 차분하게 돕는 전문 상담가입니다.
아래 심리테스트 응답과 산출된 성향 결과만 바탕으로, 사용자가 지금의 마음과 행동 방향을 정리할 수 있게 상담해 주세요.

중요 원칙:
* 아래 테스트 결과를 의학적 진단이나 임상 평가처럼 말하지 마세요.
* 제공된 응답과 산출값만 사용하고, 없는 심리 유형을 임의로 만들지 마세요.
* 단정적인 낙인보다 반복 패턴, 강점, 주의점, 회복 행동을 중심으로 설명하세요.
* 의료, 법률, 재무, 계약처럼 손실이 큰 결정은 전문가 검토와 현실 확인이 필요하다고 자연스럽게 안내하세요.
* 답변은 한국어로 작성하세요.

[테스트 정보]
테스트명: ${result.testTitle}
완료 시각: ${result.completedAt}
추가 질문: ${result.userQuestion}

[심리테스트 산출값]
주요 유형: ${result.dominant.label}
주요 유형 요약: ${result.dominant.summary}
보조 유형: ${result.secondary.label}
보조 유형 요약: ${result.secondary.summary}

점수:
${scoreLines}

강점 단서:
${joinList(result.dominant.strengths)}

주의 단서:
${joinList(result.dominant.cautions)}

상담에서 먼저 볼 지점:
${joinList(result.dominant.promptFocus)}

[문항별 응답 기록]
${answerLines}

[해석 요청]
아래 순서로 상담해 주세요.

1. 사용자의 현재 마음결을 5문장 이내로 먼저 요약해 주세요.
2. 주요 유형이 관계, 일, 감정, 선택에서 어떻게 드러나는지 설명해 주세요.
3. 보조 유형이 주요 유형을 어떻게 돕거나 흔드는지 설명해 주세요.
4. 문항별 응답에서 반복되는 신호를 3가지로 정리해 주세요.
5. 사용자가 지금 줄이면 좋은 행동 3가지와 늘리면 좋은 행동 3가지를 제안해 주세요.
6. 추가 질문이 있다면 테스트 결과와 연결해 현실적인 조언을 작성해 주세요.
7. 마지막에는 오늘 바로 확인할 체크포인트 3가지를 제안해 주세요.

출력 스타일:
* 너무 장황하지 않게 1,500자 안팎으로 정리하세요.
* 겁을 주거나 성격을 낙인찍지 마세요.
* 전문 용어는 쉬운 말로 풀어 주세요.
* 상담가가 바로 옆에서 정리해 주는 자연스러운 문장으로 작성하세요.`;
}
