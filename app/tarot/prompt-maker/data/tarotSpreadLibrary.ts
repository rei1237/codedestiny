import type { QuestionChip, TarotDifficulty, TarotSpread, TarotSpreadCategory } from "../types";
import { layoutSpreadPositions } from "../utils/layoutSpreadPositions";

type SpreadBlueprint = {
  id: string;
  title: string;
  category: TarotSpreadCategory;
  cardCount: number;
  difficulty: TarotDifficulty;
  purpose: string;
  positions?: Array<string | { name: string; meaning: string; interpretationHint: string }>;
};

export const CATEGORY_LABEL: Record<TarotSpreadCategory, string> = {
  love: "연애/상대방 속마음",
  reunion: "재회/이별",
  third_party: "삼각관계/경쟁자",
  daily: "오늘의 운세",
  choice: "선택/결정",
  career: "직업/이직/사업",
  money: "돈/재물",
  relationship: "인간관계",
  self: "자기이해/심리",
  crisis: "위기/예상치 못한 사건",
  future: "미래 흐름",
  spiritual: "영적 조언/운명적 메시지",
  family: "가족/가문/뿌리",
  power: "권력/성공/야망",
  legal: "법률/송사/분쟁",
  special: "특별 상황",
};

export const DIFFICULTY_LABEL: Record<TarotDifficulty, string> = {
  easy: "Light",
  normal: "Classic",
  deep: "Deep",
  premium: "Moonlit",
};

export const CATEGORY_KEYWORD_MAP: Record<TarotSpreadCategory, string[]> = {
  love: ["좋아", "썸", "호감", "나를 어떻게", "마음", "연애", "그 사람", "상대"],
  reunion: ["재회", "전애인", "전 애인", "헤어진", "다시", "연락", "이별", "미련", "잠수"],
  third_party: ["다른 여자", "다른 남자", "제3자", "경쟁자", "삼각관계"],
  daily: ["오늘", "내일", "하루", "운세"],
  choice: ["선택", "고민", "할까", "말까", "A", "B"],
  career: ["이직", "퇴사", "그만두", "버텨", "직장", "회사", "사업", "성공", "일", "프로젝트"],
  money: ["돈", "수익", "재물", "투자", "지출", "금전"],
  relationship: ["인간관계", "갈등", "오해", "신뢰", "관계"],
  self: ["자존감", "불안", "내면", "심리", "나 자신"],
  crisis: ["문제", "위기", "막막", "해결", "갑자기"],
  future: ["미래", "흐름", "앞으로", "3개월", "장기"],
  spiritual: ["영혼", "직관", "신호", "수호", "운명"],
  family: ["가족", "가문", "뿌리", "부모", "조상"],
  power: ["권력", "리더", "야망", "조직", "성공"],
  legal: ["소송", "재판", "법률", "변호사", "고소", "합의", "분쟁", "법적", "송사", "계약", "위약금", "판결"],
  special: ["포모", "잠수", "막다른", "특별", "돌발"],
};

export const QUESTION_CHIPS: QuestionChip[] = [
  { icon: "💗", label: "그 사람의 진심", text: "그 사람이 나를 아직 어떻게 생각하는지 알고 싶어." },
  { icon: "🌙", label: "재회 가능성", text: "헤어진 사람과 다시 이어질 가능성이 있을까?" },
  { icon: "🔮", label: "오늘의 운세", text: "오늘 하루에서 내가 놓치면 안 되는 흐름이 궁금해." },
  { icon: "💼", label: "이직 고민", text: "지금 이직을 해도 괜찮을지 판단하고 싶어." },
  { icon: "💰", label: "돈의 흐름", text: "요즘 돈이 새는 이유와 재물 흐름을 알고 싶어." },
  { icon: "🕯️", label: "내 마음 정리", text: "내가 지금 어떤 감정을 붙잡고 있는지 알고 싶어." },
  { icon: "🗝️", label: "선택의 갈림길", text: "A와 B 중 어떤 선택이 나에게 더 맞을까?" },
  { icon: "🌫️", label: "숨겨진 진실", text: "지금 상황에서 내가 모르고 있는 핵심이 궁금해." },
];

export const DEFAULT_QUESTION_BY_CATEGORY: Record<TarotSpreadCategory, string> = {
  love: "이 관계에서 지금 가장 중요한 감정의 흐름은 무엇일까?",
  reunion: "이 사람과 다시 이어질 가능성과 내가 지켜야 할 기준은 무엇일까?",
  third_party: "이 관계에 영향을 주는 다른 변수는 무엇이고 내가 봐야 할 진실은 무엇일까?",
  daily: "오늘 내가 놓치지 말아야 할 메시지는 무엇일까?",
  choice: "두 선택지 중 지금의 나에게 더 건강한 방향은 무엇일까?",
  career: "지금 커리어에서 내가 선택해야 할 다음 방향은 무엇일까?",
  money: "현재 재물 흐름에서 새는 지점과 회복 포인트는 무엇일까?",
  relationship: "이 관계를 지키기 위해 먼저 조정해야 할 지점은 무엇일까?",
  self: "내 안에서 회복이 필요한 감정 패턴은 무엇일까?",
  crisis: "이 위기의 핵심 원인과 내가 당장 할 수 있는 현실 행동은 무엇일까?",
  future: "앞으로 다가올 흐름에서 내가 준비해야 할 변화는 무엇일까?",
  spiritual: "지금 내게 들어오는 직관의 메시지는 무엇일까?",
  family: "가족과 뿌리의 흐름 안에서 내가 이해해야 할 과제는 무엇일까?",
  power: "성공과 영향력을 다루는 방식에서 내가 놓치지 말아야 할 균형은 무엇일까?",
  legal: "이 법적 상황에서 내가 놓치고 있는 핵심 흐름과 최선의 대응은 무엇일까?",
  special: "이 특별한 상황에서 가장 먼저 읽어야 할 핵심 신호는 무엇일까?",
};

const CATEGORY_RECOMMENDED_QUESTIONS: Record<TarotSpreadCategory, string[]> = {
  love: [
    "상대방이 나를 바라보는 마음의 온도는 지금 어느 정도일까?",
    "이 관계에서 내가 먼저 조절해야 할 태도는 무엇일까?",
    "상대의 말과 행동 사이에서 놓치고 있는 신호는 무엇일까?",
  ],
  reunion: [
    "다시 연락한다면 어떤 타이밍과 방식이 가장 부드러울까?",
    "상대 마음에 남은 미련과 정리된 부분은 어떻게 나뉘어 있을까?",
    "재회를 원한다면 내가 먼저 바꿔야 할 반복 패턴은 무엇일까?",
  ],
  third_party: [
    "이 관계에 영향을 주는 제3자의 실제 영향력은 어느 정도일까?",
    "내가 경쟁 구도라고 느끼는 부분 중 사실과 불안은 어떻게 나뉠까?",
    "지금 관계를 지키기 위해 확인해야 할 진실은 무엇일까?",
  ],
  daily: [
    "오늘 가장 먼저 붙잡아야 할 메시지는 무엇일까?",
    "오늘 말과 행동에서 조심해야 할 흐름은 무엇일까?",
    "하루를 마무리할 때 나에게 남을 핵심 배움은 무엇일까?",
  ],
  choice: [
    "A와 B 중 지금의 나에게 더 건강한 선택은 무엇일까?",
    "선택을 미루고 있는 진짜 이유는 무엇일까?",
    "결정 후 내가 감당해야 할 현실 조건은 무엇일까?",
  ],
  career: [
    "지금 커리어에서 움직여야 할 때일까, 더 준비해야 할 때일까?",
    "현재 일에서 나의 강점과 소진 지점은 어떻게 나뉠까?",
    "다음 기회를 잡기 위해 현실적으로 준비할 것은 무엇일까?",
  ],
  money: [
    "요즘 돈의 흐름에서 새는 지점은 어디일까?",
    "재물운을 회복하기 위해 먼저 정리해야 할 소비 패턴은 무엇일까?",
    "지금 확장보다 안정에 집중해야 하는 부분은 무엇일까?",
  ],
  relationship: [
    "이 관계에서 반복되는 오해의 핵심은 무엇일까?",
    "상대와 나 사이에 다시 세워야 할 경계는 무엇일까?",
    "관계를 회복하려면 어떤 대화 순서가 가장 안전할까?",
  ],
  self: [
    "내가 지금 붙잡고 있는 감정의 이름은 무엇일까?",
    "나를 지치게 하는 반복 패턴은 어디에서 시작될까?",
    "오늘 나를 회복시키는 가장 작은 행동은 무엇일까?",
  ],
  crisis: [
    "이 위기의 본질과 겉으로 보이는 문제는 어떻게 다를까?",
    "지금 당장 피해야 할 충동적 선택은 무엇일까?",
    "막힌 흐름을 풀기 위해 가장 먼저 정리할 변수는 무엇일까?",
  ],
  future: [
    "가까운 미래에 가장 먼저 드러날 변화는 무엇일까?",
    "앞으로의 흐름에서 내가 준비해야 할 전환점은 무엇일까?",
    "지금 선택이 장기 흐름에 어떤 방향을 만들까?",
  ],
  spiritual: [
    "지금 반복해서 들어오는 직관의 신호는 무엇을 말할까?",
    "내가 외면하고 있는 내면의 메시지는 무엇일까?",
    "운명적 흐름 안에서 지금 받아들여야 할 배움은 무엇일까?",
  ],
  family: [
    "가족 안에서 반복되는 감정 패턴은 무엇일까?",
    "내가 지켜야 할 경계와 풀어야 할 마음은 어떻게 나뉠까?",
    "가족 관계 회복을 위해 지금 가능한 첫 대화는 무엇일까?",
  ],
  power: [
    "성공을 향해 가는 과정에서 내가 놓치고 있는 균형은 무엇일까?",
    "영향력을 키울 때 조심해야 할 그림자는 무엇일까?",
    "지금 나에게 필요한 리더십 태도는 무엇일까?",
  ],
  legal: [
    "이 분쟁에서 감정과 사실을 어떻게 분리해 봐야 할까?",
    "합의나 대응 전에 기록으로 남겨야 할 핵심은 무엇일까?",
    "전문가 상담 전에 정리해야 할 쟁점은 무엇일까?",
  ],
  special: [
    "지금 상황에서 가장 먼저 읽어야 할 핵심 신호는 무엇일까?",
    "겉으로 보이는 문제 뒤에 숨어 있는 진짜 변수는 무엇일까?",
    "오늘 내가 현실적으로 조정할 수 있는 태도는 무엇일까?",
  ],
};

const SPREAD_RECOMMENDED_QUESTIONS: Record<string, string[]> = {
  "three-card-flow": ["현재 상황, 숨은 흐름, 조언을 한 번에 보면 지금 어떤 선택이 가장 자연스러울까?"],
  "one-card-core": ["지금 내가 가장 먼저 붙잡아야 할 한 가지 메시지는 무엇일까?"],
  "five-card-consult": ["현재 문제의 원인과 내가 오늘 취할 수 있는 현실 조언은 무엇일까?"],
  "seven-card-depth": ["이 질문의 숨은 원인과 가까운 미래 흐름을 깊게 보면 무엇이 보일까?"],
  "celtic-cross-ten": ["이 상황의 전체 판세와 장기적으로 중요한 선택 기준은 무엇일까?"],
  "heart-mirror": ["상대방은 지금 나를 어떤 마음의 거울로 바라보고 있을까?"],
  "true-heart": ["그 사람의 말과 행동 뒤에 있는 진심은 무엇일까?"],
  "will-contact": ["상대에게 연락이 올 가능성과 연락을 막는 마음은 무엇일까?"],
  "some-temperature": ["우리 사이의 썸 온도는 지금 어느 단계일까?"],
  "love-balance": ["이 관계에서 감정의 균형이 무너진 지점은 어디일까?"],
  "confession-timing": ["지금 마음을 표현해도 괜찮은 타이밍일까?"],
  "hidden-like": ["상대가 숨기고 있는 호감이나 망설임은 무엇일까?"],
  "relationship-progress": ["이 관계가 앞으로 발전하려면 무엇이 먼저 바뀌어야 할까?"],
  "breakup-reason": ["이별의 표면 이유와 진짜 이유는 어떻게 다를까?"],
  "reunion-chance": ["다시 이어질 가능성과 현실적으로 넘어야 할 조건은 무엇일까?"],
  "missing-and-release": ["상대에게 남은 미련과 정리된 마음은 어떻게 나뉠까?"],
  "reunion-or-not": ["다시 만나는 것이 정말 나에게 건강한 선택일까?"],
  "ex-current": ["헤어진 사람의 현재 마음과 일상 흐름은 어디쯤 있을까?"],
  "after-breakup-heal": ["이별 후 내가 회복하기 위해 가장 먼저 돌봐야 할 마음은 무엇일까?"],
  "me-third": ["나와 제3자 사이에서 실제로 작동하는 관계 구도는 무엇일까?"],
  "rival-shadow": ["경쟁자의 존재가 실제 위협인지 내 불안의 그림자인지 알고 싶어."],
  "hidden-relationship": ["상대가 숨기고 있는 감정이나 관계 가능성은 무엇일까?"],
  "crossroads": ["갈림길 앞에서 내가 선택 기준으로 삼아야 할 것은 무엇일까?"],
  "a-vs-b": ["A와 B 중 어떤 선택이 지금의 나에게 더 맞을까?"],
  "do-or-not": ["지금 행동해야 할까, 조금 더 기다려야 할까?"],
  "opportunity-door": ["새로운 기회를 받아들여도 괜찮을까?"],
  "today-flow": ["오늘 하루의 큰 흐름과 조심할 신호는 무엇일까?"],
  "today-energy": ["오늘 내 몸과 마음의 에너지는 어떻게 움직일까?"],
  "day-closing": ["오늘을 마무리하며 내려놓아야 할 감정은 무엇일까?"],
  "tomorrow-ready": ["내일을 위해 오늘 준비해야 할 핵심은 무엇일까?"],
  "career-direction": ["앞으로의 커리어 방향에서 나에게 맞는 길은 무엇일까?"],
  "job-change": ["지금 이직을 선택해도 괜찮을까?"],
  "business-luck": ["사업의 강점과 위기, 돌파구는 어디에 있을까?"],
  "project-success": ["이 프로젝트가 성공하려면 어떤 변수를 먼저 관리해야 할까?"],
  "money-talent": ["내 재능 중 돈으로 연결될 가능성이 큰 부분은 무엇일까?"],
  "money-flow": ["현재 재물 흐름에서 막힌 곳과 회복 포인트는 어디일까?"],
  "spending-check": ["내 지출 패턴에서 감정적으로 새는 부분은 무엇일까?"],
  "real-breakthrough": ["현실적인 압박을 돌파하기 위해 가장 먼저 해야 할 일은 무엇일까?"],
  "inner-voice": ["내면의 진짜 목소리는 지금 무엇을 원하고 있을까?"],
  "self-worth": ["흔들린 자존감을 회복하기 위해 필요한 메시지는 무엇일까?"],
  "shadow-self": ["내가 반복하는 그림자 패턴과 통합해야 할 마음은 무엇일까?"],
  "anxiety-relief": ["불안의 뿌리와 오늘 가능한 진정 행동은 무엇일까?"],
  "self-love": ["나를 더 사랑하기 위해 오늘 시작할 작은 돌봄은 무엇일까?"],
  "relationship-temp": ["이 인간관계의 현재 온도와 유지 전략은 무엇일까?"],
  "conflict-solve": ["갈등을 풀기 위한 첫 대화와 순서는 무엇일까?"],
  "trust-restore": ["깨진 신뢰를 다시 회복할 수 있는 흐름일까?"],
  "sudden-event": ["갑작스러운 사건의 본질과 내가 놓친 신호는 무엇일까?"],
  "crisis-break": ["막막한 위기에서 가장 현실적인 돌파구는 어디에 있을까?"],
  "truth-check": ["내가 착각하고 있는 부분과 사실로 봐야 할 부분은 무엇일까?"],
  "near-future": ["가까운 미래에 먼저 나타날 변화는 무엇일까?"],
  "three-month": ["앞으로 3개월의 흐름에서 가장 중요한 전환점은 언제일까?"],
  "destiny-road": ["인생의 큰 흐름에서 지금 내가 서 있는 길은 어디일까?"],
  "life-compass": ["삶의 방향성을 다시 잡기 위해 필요한 나침반은 무엇일까?"],
  "lucky-star": ["앞으로의 행운과 기회가 열리는 지점은 어디일까?"],
  "soul-message": ["영혼이 지금 내게 전하려는 메시지는 무엇일까?"],
  "guardian-energy": ["나를 지키는 에너지와 약해진 보호막은 무엇일까?"],
  "destiny-signal": ["반복되는 신호와 우연은 어떤 의미를 품고 있을까?"],
  "family-legacy": ["가족에게서 물려받은 재능과 과제는 무엇일까?"],
  "family-heal": ["가족 관계 회복을 위해 내가 먼저 볼 마음은 무엇일까?"],
  "success-crown": ["성공으로 가는 길에서 내 강점과 그림자는 무엇일까?"],
  "power-shadow": ["힘을 가질 때 조심해야 할 내 안의 그림자는 무엇일까?"],
  "leader-path": ["리더로서 지금 선택해야 할 균형과 전략은 무엇일까?"],
  "lawsuit-verdict": ["이 송사에서 유불리보다 먼저 정리해야 할 핵심 쟁점은 무엇일까?"],
  "legal-settlement": ["합의 가능성을 높이려면 어떤 조건과 감정을 분리해야 할까?"],
  "evidence-check": ["현재 증거와 진술에서 보강해야 할 부분은 무엇일까?"],
  "case-timeline": ["이 사건의 시간 흐름에서 내가 움직여야 할 타이밍은 언제일까?"],
  "defense-line": ["내 입장의 방어선에서 가장 약한 지점은 어디일까?"],
  "contract-trap": ["계약이나 합의서에서 놓치기 쉬운 함정은 무엇일까?"],
  "dispute-resolve": ["분쟁을 현실적으로 풀기 위한 접점은 어디에 있을까?"],
  "legal-timing": ["법적 행동을 지금 해야 할지 기다려야 할지 어떤 기준으로 볼까?"],
  "justice-mirror": ["복잡한 분쟁의 전체 판세에서 가장 중요한 변수는 무엇일까?"],
  "fomo-relief": ["비교와 불안에서 벗어나기 위해 지금 내려놓아야 할 것은 무엇일까?"],
  ghosting: ["잠수 탄 사람의 침묵 뒤에 있는 흐름과 내가 취할 태도는 무엇일까?"],
  "dead-end": ["막다른 길처럼 느껴지는 상황에서 열릴 수 있는 우회로는 무엇일까?"],
  "mind-afterglow": ["상대 마음속에 남은 잔상과 앞으로의 움직임은 무엇일까?"],
  "next-scene": ["이 관계의 다음 장면은 어떤 분위기로 이어질까?"],
  "prompt-maker": ["이 카드 조합으로 가장 좋은 AI 타로 상담 프롬프트를 만들려면 무엇을 강조해야 할까?"],
};

function normalizeQuestionSeed(question: string) {
  const text = String(question || "").trim().replace(/\s+/g, " ");
  if (text.length < 5) return "";
  return text.length > 44 ? `${text.slice(0, 44).trim()}...` : text;
}

function buildContextualQuestions(category: TarotSpreadCategory, questionSeed: string, spreadTitle: string) {
  if (!questionSeed) return [];
  const defaultQuestions = [
    `"${questionSeed}" 이 질문에서 가장 먼저 분리해야 할 사실과 감정은 무엇일까?`,
    `"${questionSeed}" 를 ${spreadTitle}로 보면 지금 확인해야 할 핵심 포지션은 무엇일까?`,
  ];
  const categoryQuestions: Partial<Record<TarotSpreadCategory, string[]>> = {
    love: [
      `"${questionSeed}" 속에서 상대 마음과 내가 바라는 해석은 어떻게 다를까?`,
      `"${questionSeed}" 를 ${spreadTitle}로 보면 관계 온도를 바꾸는 신호는 무엇일까?`,
    ],
    reunion: [
      `"${questionSeed}" 에서 미련과 현실 조건은 어떻게 나뉘어 있을까?`,
      `"${questionSeed}" 를 ${spreadTitle}로 보면 다시 다가갈 타이밍은 어디에 있을까?`,
    ],
    third_party: [
      `"${questionSeed}" 에서 확인된 사실과 불안이 만든 추측은 어떻게 다를까?`,
      `"${questionSeed}" 를 ${spreadTitle}로 보면 제3자의 실제 영향력은 어느 정도일까?`,
    ],
    career: [
      `"${questionSeed}" 에서 감정적 만족과 현실 조건은 어떻게 균형을 잡아야 할까?`,
      `"${questionSeed}" 를 ${spreadTitle}로 보면 지금 준비할 다음 행동은 무엇일까?`,
    ],
    money: [
      `"${questionSeed}" 에서 기대 수익보다 먼저 점검해야 할 위험 신호는 무엇일까?`,
      `"${questionSeed}" 를 ${spreadTitle}로 보면 지켜야 할 돈의 경계선은 어디일까?`,
    ],
    crisis: [
      `"${questionSeed}" 에서 지금 멈춰야 할 행동과 바로 할 행동은 무엇일까?`,
      `"${questionSeed}" 를 ${spreadTitle}로 보면 도움을 청해야 할 지점은 어디일까?`,
    ],
    legal: [
      `"${questionSeed}" 에서 감정과 법적 사실은 어떻게 분리해 봐야 할까?`,
      `"${questionSeed}" 를 ${spreadTitle}로 보면 기록으로 먼저 남겨야 할 쟁점은 무엇일까?`,
    ],
    self: [
      `"${questionSeed}" 에서 가장 먼저 이름 붙여야 할 감정은 무엇일까?`,
      `"${questionSeed}" 를 ${spreadTitle}로 보면 오늘 나를 회복시키는 행동은 무엇일까?`,
    ],
  };
  return categoryQuestions[category] || defaultQuestions;
}

const SPECIAL_POSITIONS: Record<string, string[]> = {
  "true-heart": [
    "상대방의 표면적인 마음",
    "상대방의 무의식적인 마음",
    "나에 대한 호감",
    "나에 대한 두려움",
    "관계를 진전시키고 싶은 마음",
    "앞으로의 행동 가능성",
    "최종 조언",
  ],
  "mind-afterglow": [
    "상대방이 지금 의식적으로 떠올리는 나의 모습",
    "상대방이 무의식적으로 아직 붙잡고 있는 감정",
    "상대방이 겉으로는 숨기고 있는 태도",
    "상대방이 연락을 망설이는 이유",
    "상대방 마음속에 남아 있는 미련 또는 정리된 부분",
    "앞으로 상대방이 취할 가능성이 높은 행동",
    "질문자에게 필요한 현실적 조언",
  ],
  "next-scene": [
    "현재 관계의 상태",
    "상대방의 감정 온도",
    "관계를 막는 핵심 요인",
    "분위기를 바꾸는 계기",
    "가까운 미래의 움직임",
    "질문자가 취할 수 있는 선택",
    "관계의 가능성",
    "최종 조언",
  ],
};

const BLUEPRINTS: SpreadBlueprint[] = [
  {
    id: "three-card-flow",
    title: "3장 흐름 배열",
    category: "special",
    cardCount: 3,
    difficulty: "easy",
    purpose: "현재 상황, 숨은 흐름, 조언 또는 가까운 미래를 보는 기본 상담 배열.",
    positions: [
      { name: "현재 상황", meaning: "지금 질문자가 실제로 놓여 있는 상황과 겉으로 드러난 사건", interpretationHint: "카드의 일반 의미보다 현재 맥락과 질문자의 체감 상태를 먼저 읽습니다." },
      { name: "숨은 흐름", meaning: "겉으로 보이지 않지만 영향을 주는 감정, 생각, 배경", interpretationHint: "상대 마음, 내면 심리, 말하지 않은 문제를 단정 없이 조심스럽게 해석합니다." },
      { name: "조언", meaning: "현재 흐름에서 가장 현명한 태도와 다음 행동", interpretationHint: "결과 단정이 아니라 오늘부터 조절할 수 있는 행동 조언으로 읽습니다." },
    ],
  },
  {
    id: "one-card-core",
    title: "1장 핵심 메시지 배열",
    category: "special",
    cardCount: 1,
    difficulty: "easy",
    purpose: "질문의 핵심 메시지와 지금 가장 중요한 조언을 빠르게 정리하는 배열.",
    positions: [
      { name: "핵심 메시지", meaning: "지금 질문에서 가장 먼저 바라봐야 할 중심 신호", interpretationHint: "예언보다 질문자가 오늘 붙잡을 수 있는 태도와 기준으로 해석합니다." },
    ],
  },
  {
    id: "five-card-consult",
    title: "5장 상담 배열",
    category: "special",
    cardCount: 5,
    difficulty: "normal",
    purpose: "현재, 장애물, 내 마음, 외부 흐름, 조언을 연결해 실제 상담처럼 읽는 배열.",
    positions: [
      { name: "현재 상황", meaning: "질문자의 현재 조건과 지금 가장 크게 작동하는 흐름", interpretationHint: "상황의 표면과 질문자의 체감 현실을 함께 봅니다." },
      { name: "장애물", meaning: "흐름을 막거나 왜곡하는 핵심 변수", interpretationHint: "카드를 부정적으로 단정하지 말고 다루어야 할 병목으로 읽습니다." },
      { name: "내 마음", meaning: "질문자 안에서 실제로 움직이는 감정과 욕구", interpretationHint: "감정의 정당성과 과잉 해석 가능성을 균형 있게 봅니다." },
      { name: "상대 또는 외부 흐름", meaning: "상대방, 환경, 시장, 주변 조건처럼 나 밖에서 움직이는 영향", interpretationHint: "타인의 마음은 확정하지 않고 관찰되는 가능성으로 표현합니다." },
      { name: "조언/결과", meaning: "현재 흐름에서 가장 현실적인 조언과 가까운 결과의 방향", interpretationHint: "결과 예언이 아니라 선택을 조정했을 때 바뀔 수 있는 흐름으로 읽습니다." },
    ],
  },
  {
    id: "seven-card-depth",
    title: "7장 심층 상담 배열",
    category: "special",
    cardCount: 7,
    difficulty: "deep",
    purpose: "질문의 핵심부터 숨은 원인, 위험요소, 최종 조언까지 연결하는 심층 배열.",
    positions: [
      { name: "질문의 핵심", meaning: "고객이 실제로 알고 싶어 하는 중심 주제", interpretationHint: "질문 원문 아래의 진짜 의도를 먼저 정리합니다." },
      { name: "현재 에너지", meaning: "지금 상황을 움직이는 기본 분위기와 속도", interpretationHint: "정방향/역방향의 비율과 함께 흐름의 개방성을 봅니다." },
      { name: "숨은 원인", meaning: "겉으로 드러나지 않았지만 반복되는 심리나 배경", interpretationHint: "무의식, 과거 패턴, 말하지 않은 조건을 조심스럽게 연결합니다." },
      { name: "상대/환경", meaning: "상대방의 반응이나 주변 조건이 주는 영향", interpretationHint: "상대 마음은 가능성으로만 다루고 행동 단서와 분리합니다." },
      { name: "가까운 미래", meaning: "현재 흐름이 그대로 갈 때 가까이 나타날 수 있는 변화", interpretationHint: "확정 미래가 아니라 현 상태의 연장선으로 표현합니다." },
      { name: "위험요소", meaning: "과잉 기대, 회피, 충동처럼 조심해야 할 지점", interpretationHint: "불안을 키우지 말고 예방 가능한 리스크로 번역합니다." },
      { name: "최종 조언", meaning: "질문자가 주도권을 회복하기 위해 선택할 태도와 행동", interpretationHint: "오늘부터 실행할 수 있는 2~3가지 행동으로 마무리합니다." },
    ],
  },
  {
    id: "celtic-cross-ten",
    title: "켈틱 크로스 10장 배열",
    category: "special",
    cardCount: 10,
    difficulty: "premium",
    purpose: "현재, 장애물, 의식과 무의식, 과거 영향, 가까운 미래, 태도, 환경, 희망과 두려움, 종합 결과를 읽는 고전 배열.",
    positions: [
      { name: "현재 상황", meaning: "질문자가 지금 서 있는 현실과 중심 사건", interpretationHint: "전체 배열의 출발점으로 이후 카드의 기준점이 됩니다." },
      { name: "장애물", meaning: "현재 흐름을 가로막거나 시험하는 핵심 변수", interpretationHint: "문제를 단정하지 말고 해결해야 할 구조로 읽습니다." },
      { name: "의식적 목표", meaning: "질문자가 스스로 알고 있는 목표와 바람", interpretationHint: "표면 욕구와 실제 행동 기준이 맞는지 봅니다." },
      { name: "무의식적 원인", meaning: "질문자가 덜 의식하지만 상황에 영향을 주는 심리적 뿌리", interpretationHint: "투사, 불안, 회피, 미련을 부드럽게 해석합니다." },
      { name: "과거 영향", meaning: "현재 문제를 만든 이전 경험과 반복 패턴", interpretationHint: "과거를 탓하기보다 지금 반복되는 방식을 찾습니다." },
      { name: "가까운 미래", meaning: "현재 흐름이 이어질 때 가까이 드러날 가능성", interpretationHint: "확정 결과가 아니라 가까운 흐름의 방향으로 말합니다." },
      { name: "나의 태도", meaning: "질문자가 이 상황을 대하는 방식과 조절 가능한 선택", interpretationHint: "주도권을 회복할 수 있는 행동 기준을 제안합니다." },
      { name: "주변 환경", meaning: "상대, 가족, 직장, 시장 등 외부 조건의 영향", interpretationHint: "내가 통제할 수 없는 변수와 대응 가능한 부분을 구분합니다." },
      { name: "희망과 두려움", meaning: "원하지만 동시에 불안해하는 내면의 양가감정", interpretationHint: "기대와 불안을 함께 인정하되 과장하지 않습니다." },
      { name: "종합 결과", meaning: "전체 배열이 모이는 핵심 방향과 현실적 조언", interpretationHint: "미래 확정이 아니라 현재 선택을 기준으로 한 종합 흐름으로 읽습니다." },
    ],
  },
  { id: "heart-mirror", title: "상대의 마음 거울 스프레드", category: "love", cardCount: 5, difficulty: "normal", purpose: "상대방이 나를 어떻게 보고 있는지 확인하는 기본 연애 스프레드." },
  { id: "true-heart", title: "그 사람의 진심 스프레드", category: "love", cardCount: 7, difficulty: "deep", purpose: "상대의 말과 행동이 헷갈릴 때 사용하는 진심 해석 스프레드." },
  { id: "will-contact", title: "연락이 올까 스프레드", category: "love", cardCount: 6, difficulty: "normal", purpose: "연락 가능성과 연락을 막는 요인을 함께 보는 스프레드." },
  { id: "some-temperature", title: "썸의 온도 스프레드", category: "love", cardCount: 5, difficulty: "easy", purpose: "애매한 썸 관계의 온도와 발전 가능성을 보는 스프레드." },
  { id: "love-balance", title: "사랑의 균형 스프레드", category: "love", cardCount: 8, difficulty: "deep", purpose: "서로의 감정 균형과 관계의 불균형을 읽는 스프레드." },
  { id: "confession-timing", title: "고백 타이밍 스프레드", category: "love", cardCount: 5, difficulty: "normal", purpose: "마음을 표현해도 되는 타이밍을 판단하는 스프레드." },
  { id: "hidden-like", title: "숨겨진 호감 스프레드", category: "love", cardCount: 6, difficulty: "normal", purpose: "상대가 감정을 숨기고 있을 때 호감의 깊이를 보는 스프레드." },
  { id: "relationship-progress", title: "관계 진전 스프레드", category: "love", cardCount: 7, difficulty: "deep", purpose: "관계가 앞으로 발전할 수 있는지 확인하는 스프레드." },
  { id: "breakup-reason", title: "이별의 진짜 이유 스프레드", category: "reunion", cardCount: 5, difficulty: "normal", purpose: "헤어진 이유를 감정적으로 정리하는 스프레드." },
  { id: "reunion-chance", title: "재회 가능성 스프레드", category: "reunion", cardCount: 8, difficulty: "deep", purpose: "재회 가능성과 현실 조건을 함께 보는 스프레드." },
  { id: "missing-and-release", title: "미련과 정리 스프레드", category: "reunion", cardCount: 6, difficulty: "normal", purpose: "상대가 나를 정리했는지, 미련이 남았는지 보는 스프레드." },
  { id: "reunion-or-not", title: "다시 만나도 될까 스프레드", category: "reunion", cardCount: 7, difficulty: "deep", purpose: "재회가 좋은 선택인지 현실적으로 점검하는 스프레드." },
  { id: "ex-current", title: "헤어진 사람의 현재 상태 스프레드", category: "reunion", cardCount: 5, difficulty: "normal", purpose: "전 애인의 현재 감정과 일상을 보는 스프레드." },
  { id: "after-breakup-heal", title: "이별 후 회복 스프레드", category: "reunion", cardCount: 6, difficulty: "normal", purpose: "상처를 회복하고 나를 되찾는 스프레드." },
  { id: "me-third", title: "나와 제3자 스프레드", category: "third_party", cardCount: 9, difficulty: "deep", purpose: "경쟁 구도와 선택 흐름을 함께 보는 스프레드." },
  { id: "rival-shadow", title: "경쟁자의 그림자 스프레드", category: "third_party", cardCount: 7, difficulty: "deep", purpose: "경쟁자의 영향이 실제로 위협적인지 보는 스프레드." },
  { id: "hidden-relationship", title: "숨겨진 관계 스프레드", category: "third_party", cardCount: 8, difficulty: "deep", purpose: "상대가 숨긴 감정/관계 가능성을 읽는 스프레드." },
  { id: "crossroads", title: "선택의 갈림길 스프레드", category: "choice", cardCount: 7, difficulty: "normal", purpose: "두 선택지 사이에서 가장 현명한 방향을 찾는 스프레드." },
  { id: "a-vs-b", title: "A vs B 스프레드", category: "choice", cardCount: 6, difficulty: "normal", purpose: "두 방향을 비교해 기준을 잡는 스프레드." },
  { id: "do-or-not", title: "지금 할까 말까 스프레드", category: "choice", cardCount: 5, difficulty: "easy", purpose: "행동 여부를 판단할 때 쓰는 스프레드." },
  { id: "opportunity-door", title: "기회의 문 스프레드", category: "choice", cardCount: 6, difficulty: "normal", purpose: "새로운 제안을 받아들일지 판단하는 스프레드." },
  { id: "today-flow", title: "오늘의 흐름 스프레드", category: "daily", cardCount: 6, difficulty: "easy", purpose: "하루 분위기와 우선순위를 읽는 스프레드." },
  { id: "today-energy", title: "하루 에너지 체크 스프레드", category: "daily", cardCount: 4, difficulty: "easy", purpose: "몸과 마음의 컨디션을 빠르게 점검하는 스프레드." },
  { id: "day-closing", title: "하루 마무리 스프레드", category: "daily", cardCount: 6, difficulty: "normal", purpose: "잠들기 전 감정 정리를 돕는 스프레드." },
  { id: "tomorrow-ready", title: "내일의 준비 스프레드", category: "daily", cardCount: 5, difficulty: "normal", purpose: "내일 중요한 일을 앞두고 준비 포인트를 보는 스프레드." },
  { id: "career-direction", title: "커리어 방향 스프레드", category: "career", cardCount: 8, difficulty: "deep", purpose: "일의 방향성과 적성을 입체적으로 보는 스프레드." },
  { id: "job-change", title: "이직 판단 스프레드", category: "career", cardCount: 7, difficulty: "deep", purpose: "이직 여부와 타이밍을 판단하는 스프레드." },
  { id: "business-luck", title: "사업운 스프레드", category: "career", cardCount: 10, difficulty: "premium", purpose: "사업의 강점/위기/돌파구를 보는 스프레드." },
  { id: "project-success", title: "프로젝트 성공 스프레드", category: "career", cardCount: 6, difficulty: "normal", purpose: "프로젝트 완성도를 높이기 위한 스프레드." },
  { id: "money-talent", title: "돈이 되는 재능 스프레드", category: "career", cardCount: 7, difficulty: "deep", purpose: "내 재능의 수익화 가능성을 보는 스프레드." },
  { id: "money-flow", title: "재물 흐름 스프레드", category: "money", cardCount: 6, difficulty: "normal", purpose: "금전 흐름과 누수 지점을 점검하는 스프레드." },
  { id: "spending-check", title: "지출 점검 스프레드", category: "money", cardCount: 5, difficulty: "normal", purpose: "감정 소비 패턴과 지출 개선점을 보는 스프레드." },
  { id: "real-breakthrough", title: "현실 돌파 스프레드", category: "money", cardCount: 7, difficulty: "deep", purpose: "경제적 압박 속에서 버티는 전략을 찾는 스프레드." },
  { id: "inner-voice", title: "내면의 목소리 스프레드", category: "self", cardCount: 5, difficulty: "normal", purpose: "내가 진짜 원하는 것을 확인하는 스프레드." },
  { id: "self-worth", title: "자존감 회복 스프레드", category: "self", cardCount: 7, difficulty: "deep", purpose: "흔들린 자존감을 회복하는 스프레드." },
  { id: "shadow-self", title: "그림자 자아 스프레드", category: "self", cardCount: 8, difficulty: "deep", purpose: "반복 패턴과 방어기제를 통합하는 스프레드." },
  { id: "anxiety-relief", title: "불안 해소 스프레드", category: "self", cardCount: 6, difficulty: "normal", purpose: "불안의 뿌리와 현실 행동을 분리하는 스프레드." },
  { id: "self-love", title: "나를 사랑하는 법 스프레드", category: "self", cardCount: 6, difficulty: "normal", purpose: "자기 돌봄과 회복 루틴을 찾는 스프레드." },
  { id: "relationship-temp", title: "인간관계 온도 스프레드", category: "relationship", cardCount: 6, difficulty: "normal", purpose: "특정 관계의 분위기와 유지 전략을 읽는 스프레드." },
  { id: "conflict-solve", title: "갈등 해결 스프레드", category: "relationship", cardCount: 7, difficulty: "deep", purpose: "오해와 갈등을 푸는 순서를 정하는 스프레드." },
  { id: "trust-restore", title: "신뢰 회복 스프레드", category: "relationship", cardCount: 5, difficulty: "normal", purpose: "깨진 신뢰를 회복할 수 있는지 보는 스프레드." },
  { id: "sudden-event", title: "돌발 사건 분석 스프레드", category: "crisis", cardCount: 7, difficulty: "deep", purpose: "갑작스러운 사건의 본질과 영향을 읽는 스프레드." },
  { id: "crisis-break", title: "위기 돌파 스프레드", category: "crisis", cardCount: 8, difficulty: "deep", purpose: "막막한 위기에서 돌파구를 설계하는 스프레드." },
  { id: "truth-check", title: "진실 확인 스프레드", category: "crisis", cardCount: 6, difficulty: "normal", purpose: "착각과 사실을 분리해 판단하는 스프레드." },
  { id: "near-future", title: "가까운 미래 스프레드", category: "future", cardCount: 5, difficulty: "normal", purpose: "짧은 기간의 변화를 보는 미래 스프레드." },
  { id: "three-month", title: "3개월 흐름 스프레드", category: "future", cardCount: 6, difficulty: "normal", purpose: "3개월 단위 흐름을 단계적으로 읽는 스프레드." },
  { id: "destiny-road", title: "운명의 길 스프레드", category: "future", cardCount: 10, difficulty: "premium", purpose: "인생의 큰 흐름을 장기적으로 읽는 스프레드." },
  { id: "life-compass", title: "인생의 나침반 스프레드", category: "future", cardCount: 12, difficulty: "premium", purpose: "삶의 방향성을 심층적으로 점검하는 스프레드." },
  { id: "lucky-star", title: "행운의 별 스프레드", category: "future", cardCount: 14, difficulty: "premium", purpose: "과거, 현재, 미래, 장애물, 조언을 모두 보는 프리미엄 스프레드." },
  { id: "soul-message", title: "영혼의 메시지 스프레드", category: "spiritual", cardCount: 6, difficulty: "normal", purpose: "내면과 영적 메시지를 확인하는 스프레드." },
  { id: "guardian-energy", title: "수호 에너지 스프레드", category: "spiritual", cardCount: 5, difficulty: "normal", purpose: "나를 지키는 힘과 약화 요인을 보는 스프레드." },
  { id: "destiny-signal", title: "운명의 신호 스프레드", category: "spiritual", cardCount: 7, difficulty: "deep", purpose: "반복되는 신호와 우연의 의미를 읽는 스프레드." },
  { id: "family-legacy", title: "가문의 유산 스프레드", category: "family", cardCount: 10, difficulty: "premium", purpose: "가족에게서 물려받은 재능과 과제를 읽는 스프레드." },
  { id: "family-heal", title: "가족 관계 회복 스프레드", category: "family", cardCount: 7, difficulty: "deep", purpose: "가족 갈등과 상처 회복 가능성을 보는 스프레드." },
  { id: "success-crown", title: "성공의 왕관 스프레드", category: "power", cardCount: 7, difficulty: "deep", purpose: "성공 자질과 리더십 그림자를 함께 보는 스프레드." },
  { id: "power-shadow", title: "권력의 그림자 스프레드", category: "power", cardCount: 5, difficulty: "normal", purpose: "힘을 가질 때 조심해야 할 균형을 보는 스프레드." },
  { id: "leader-path", title: "리더의 길 스프레드", category: "power", cardCount: 8, difficulty: "deep", purpose: "조직 리더십 운영 전략을 점검하는 스프레드." },
  { id: "lawsuit-verdict", title: "송사의 저울 스프레드", category: "legal", cardCount: 7, difficulty: "deep", purpose: "소송의 유불리와 결과 흐름을 가늠하는 스프레드.", positions: ["현재 분쟁의 핵심 쟁점", "나의 입장에서 유리한 흐름", "상대 측의 숨은 의도", "법적 절차에서 예상되는 변수", "판결 또는 합의에 영향을 줄 외부 요인", "내가 놓치고 있는 약점", "최종 방향과 현실 조언"] },
  { id: "legal-settlement", title: "합의의 실마리 스프레드", category: "legal", cardCount: 6, difficulty: "normal", purpose: "합의 가능성과 협상에서 풀어야 할 매듭을 보는 스프레드.", positions: ["현재 분쟁의 온도", "내가 먼저 놓아야 할 감정", "상대가 절대 놓치지 않으려는 것", "합의의 열쇠가 되는 조건", "서로가 양보할 수 있는 지점", "현실적인 마무리 조언"] },
  { id: "evidence-check", title: "증거와 진술 스프레드", category: "legal", cardCount: 5, difficulty: "normal", purpose: "사실관계와 증거의 힘, 그리고 진술의 설득력을 점검하는 스프레드.", positions: ["현재 확보된 사실의 힘", "보강이 필요한 증거", "내 진술의 강점", "상대 주장에 대한 취약점", "말보다 먼저 챙길 현실 포인트"] },
  { id: "case-timeline", title: "송사 타임라인 스프레드", category: "legal", cardCount: 8, difficulty: "deep", purpose: "법적 절차의 흐름과 시간대별 변수, 기다림과 대응의 리듬을 읽는 스프레드.", positions: ["사건이 시작된 지점", "지금 단계의 핵심 이슈", "가까운 시일 안의 변수", "상대의 반응 시점", "기다리면 유리해지는 지점", "움직여야 하는 타이밍", "장기적으로 남을 영향", "최종 행동 원칙"] },
  { id: "defense-line", title: "방어선 점검 스프레드", category: "legal", cardCount: 7, difficulty: "deep", purpose: "방어 논리와 리스크 관리, 대응 우선순위를 짚는 스프레드.", positions: ["내 입장의 핵심 방어 논리", "상대가 파고들 지점", "지금 보강해야 할 부분", "감정적으로 흔들리는 지점", "외부 도움의 가능성", "피해야 할 대응 방식", "최종 방어 전략"] },
  { id: "contract-trap", title: "계약의 함정 스프레드", category: "legal", cardCount: 6, difficulty: "normal", purpose: "계약서나 합의서에 숨은 리스크를 점검하는 스프레드.", positions: ["계약의 표면적 조건", "숨겨진 불리한 조항", "상대의 진짜 의도", "장기적으로 나에게 미칠 영향", "지금 수정해야 할 포인트", "서명 전 최종 조언"] },
  { id: "dispute-resolve", title: "분쟁 해결의 실마리 스프레드", category: "legal", cardCount: 8, difficulty: "deep", purpose: "분쟁 상황에서 합의점과 돌파구를 찾는 스프레드.", positions: ["분쟁의 근본 원인", "나의 감정적 블라인드 스팟", "상대가 실제로 원하는 것", "협상에서 내가 쓸 수 있는 카드", "양측이 받아들일 수 있는 접점", "합의를 막는 가장 큰 장벽", "시간이 흐를수록 유리해지는 쪽", "현실적 해결 전략"] },
  { id: "legal-timing", title: "법적 타이밍 스프레드", category: "legal", cardCount: 5, difficulty: "normal", purpose: "고소·신고·법적 행동의 타이밍을 판단하는 스프레드.", positions: ["지금 행동했을 때의 흐름", "기다렸을 때의 흐름", "상대의 현재 방어 태세", "법적 행동 후 나에게 돌아올 파장", "최적의 행동 시점 조언"] },
  { id: "justice-mirror", title: "정의의 거울 스프레드", category: "legal", cardCount: 10, difficulty: "premium", purpose: "복잡한 법적 분쟁의 전체 판세를 입체적으로 조망하는 프리미엄 스프레드.", positions: ["사건의 기원과 씨앗", "현재 법적 상황의 온도", "나의 진짜 목적", "상대의 진짜 목적", "증거와 사실관계의 균형", "제3자(판사·중재자)의 시선", "감정이 판단을 흐리는 지점", "승패를 가를 핵심 변수", "최종 판결·합의의 방향", "이 과정이 내 인생에 남길 교훈"] },
  { id: "fomo-relief", title: "포모 해소 스프레드", category: "special", cardCount: 4, difficulty: "easy", purpose: "불안과 비교 심리에서 벗어나기 위한 스프레드." },
  { id: "ghosting", title: "잠수 탄 사람 스프레드", category: "special", cardCount: 5, difficulty: "normal", purpose: "갑작스럽게 연락이 끊긴 상황을 읽는 스프레드." },
  { id: "dead-end", title: "막다른 길 스프레드", category: "special", cardCount: 5, difficulty: "normal", purpose: "해결책이 보이지 않을 때 유연한 길을 찾는 스프레드." },
  { id: "mind-afterglow", title: "마음의 잔상 스프레드", category: "reunion", cardCount: 7, difficulty: "deep", purpose: "재회 질문에서 잔상, 망설임, 가능성을 세밀하게 읽는 스프레드." },
  { id: "next-scene", title: "관계의 다음 장면 스프레드", category: "reunion", cardCount: 8, difficulty: "deep", purpose: "앞으로의 관계 흐름을 장면처럼 읽는 스프레드." },
  { id: "prompt-maker", title: "타로 프롬프트 라이브러리 코어 스프레드", category: "special", cardCount: 7, difficulty: "premium", purpose: "질문, 스프레드, 카드 포지션, 해석 프레임을 한 번에 정리하는 메타 스프레드." },
];

function createFallbackPositions(cardCount: number) {
  const base = [
    "현재 흐름",
    "표면 감정",
    "숨은 감정",
    "장애 요인",
    "기회 요인",
    "가까운 미래",
    "중기 흐름",
    "현실 조언",
    "주의할 점",
    "핵심 메시지",
    "관계 변화",
    "행동 전략",
    "장기 방향",
    "돌파 포인트",
    "한 문장 결론",
  ];
  return base.slice(0, cardCount);
}

function categoryMood(category: TarotSpreadCategory) {
  return {
    love: "감정의 온도를 섬세하게 읽는 연애 라인",
    reunion: "미련과 현실 기준을 같이 보는 재회 라인",
    third_party: "숨겨진 변수와 경쟁 흐름을 까는 라인",
    daily: "짧고 선명하게 하루를 정렬하는 라인",
    choice: "갈림길에서 우선순위를 세우는 라인",
    career: "일과 성취의 방향을 깊게 보는 라인",
    money: "현실 자원과 누수를 바로 짚는 라인",
    relationship: "사람 사이의 온도와 신뢰를 조율하는 라인",
    self: "내면 회복과 심리 패턴 정리에 강한 라인",
    crisis: "위기의 핵심과 돌파 포인트를 찾는 라인",
    future: "앞으로의 리듬과 장기 방향을 읽는 라인",
    spiritual: "직관과 운명의 신호를 통역하는 라인",
    family: "가족과 뿌리에서 올라오는 과제를 다루는 라인",
    power: "성공, 책임, 영향력의 균형을 점검하는 라인",
    legal: "법적 분쟁의 판세와 타이밍을 냉정하게 읽는 라인",
    special: "특수 상황을 빠르게 해석하는 실전 라인",
  }[category];
}

function categoryRitual(category: TarotSpreadCategory) {
  return {
    love: "질문을 적기 전에 상대가 아닌 내 감정의 속도를 먼저 적어 보세요.",
    reunion: "기다림과 재회의 가능성을 분리해서 보고 싶은 기준을 한 줄 적어 보세요.",
    third_party: "내 불안을 증폭시키는 상상과 사실을 분리해 두면 카드가 더 정확해집니다.",
    daily: "하루의 한 장면만 정해두고 카드를 펼치면 메시지가 선명해집니다.",
    choice: "선택지마다 잃는 것과 얻는 것을 먼저 써두면 해석이 빨라집니다.",
    career: "성과보다 지속 가능성을 먼저 기준으로 삼으면 카드가 현실적으로 읽힙니다.",
    money: "돈에 대한 감정과 실제 숫자를 분리해 적어두면 프롬프트 질이 올라갑니다.",
    relationship: "내가 원하는 결과보다 내가 지키고 싶은 관계 기준을 먼저 써보세요.",
    self: "질문 앞에 지금 나를 가장 흔드는 감정을 한 단어로 적으면 좋습니다.",
    crisis: "해결보다 먼저 문제가 터진 핵심 장면을 한 줄로 고정하세요.",
    future: "예측보다 준비를 묻는 방식으로 질문하면 카드가 덜 모호해집니다.",
    spiritual: "강한 소원보다 요즘 반복되는 신호를 먼저 떠올려 보세요.",
    family: "내 문제가 아니라 오래된 패턴인지 먼저 질문에 포함해 보세요.",
    power: "결과가 아니라 영향력을 어떻게 쓰고 싶은지 적어 보세요.",
    legal: "감정과 법적 사실을 분리해서 적고, 내가 진짜 원하는 결과를 한 줄로 써보세요.",
    special: "특수 상황일수록 질문을 짧고 차갑게 쓰는 편이 해석이 또렷합니다.",
  }[category];
}

function buildSpread(blueprint: SpreadBlueprint): TarotSpread {
  const rawPositions = blueprint.positions || SPECIAL_POSITIONS[blueprint.id] || createFallbackPositions(blueprint.cardCount);
  const positionDetails = rawPositions.map((item) => typeof item === "string"
    ? { name: item, meaning: item, interpretationHint: categoryMood(blueprint.category) }
    : item);
  const labels = positionDetails.map((position) => position.name);
  return {
    id: blueprint.id,
    title: blueprint.title,
    category: blueprint.category,
    cardCount: blueprint.cardCount,
    difficulty: blueprint.difficulty,
    purpose: blueprint.purpose,
    positions: layoutSpreadPositions(labels).map((position, index) => ({
      ...position,
      description: positionDetails[index]?.meaning || position.description,
      interpretationHint: positionDetails[index]?.interpretationHint || categoryMood(blueprint.category),
    })),
    interpretationGuide: [
      "카드 의미보다 먼저 포지션의 질문을 읽습니다.",
      "정방향과 역방향은 감정의 흐름 차이로 설명합니다.",
      "상대 속마음은 단정 대신 가능성과 정황으로 씁니다.",
      "희망과 경계, 행동 조언을 모두 포함합니다.",
      "마지막에는 지금 바로 쓸 수 있는 현실 문장으로 마무리합니다.",
    ],
    tags: [CATEGORY_LABEL[blueprint.category], `${blueprint.cardCount} cards`, DIFFICULTY_LABEL[blueprint.difficulty]],
    mood: categoryMood(blueprint.category),
    ritual: categoryRitual(blueprint.category),
  };
}

export const SPREAD_LIBRARY: TarotSpread[] = BLUEPRINTS.map(buildSpread);

export function buildRecommendedQuestionsForSpread(spread: TarotSpread, questionCategory?: TarotSpreadCategory, limit = 5, currentQuestion = "") {
  const category = questionCategory || spread.category;
  const spreadTitle = spread.title.replace(/\s*(스프레드|배열)$/u, "").trim();
  const questionSeed = normalizeQuestionSeed(currentQuestion);
  const bridgeQuestion = category !== spread.category
    ? `${CATEGORY_LABEL[category]} 질문을 ${spread.title}로 볼 때 가장 먼저 확인해야 할 흐름은 무엇일까?`
    : "";
  return Array.from(new Set([
    ...buildContextualQuestions(category, questionSeed, spread.title),
    ...(SPREAD_RECOMMENDED_QUESTIONS[spread.id] || []),
    bridgeQuestion,
    ...(CATEGORY_RECOMMENDED_QUESTIONS[category] || CATEGORY_RECOMMENDED_QUESTIONS.special),
    `${spreadTitle}에서 내가 놓치고 있는 핵심 변수는 무엇일까?`,
    `${spreadTitle} 기준으로 오늘 당장 조정해야 할 태도는 무엇일까?`,
  ].map((question) => String(question || "").trim()).filter(Boolean))).slice(0, limit);
}

export function findSpreadById(id: string) {
  return SPREAD_LIBRARY.find((spread) => spread.id === id) || SPREAD_LIBRARY[0];
}
