import type { QuestionChip, TarotDifficulty, TarotSpread, TarotSpreadCategory } from "../types";
import { layoutSpreadPositions } from "../utils/layoutSpreadPositions";

type SpreadBlueprint = {
  id: string;
  title: string;
  category: TarotSpreadCategory;
  cardCount: number;
  difficulty: TarotDifficulty;
  purpose: string;
  positions?: string[];
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
  special: "특별 상황",
};

export const DIFFICULTY_LABEL: Record<TarotDifficulty, string> = {
  easy: "Light",
  normal: "Classic",
  deep: "Deep",
  premium: "Moonlit",
};

export const CATEGORY_KEYWORD_MAP: Record<TarotSpreadCategory, string[]> = {
  love: ["좋아", "썸", "호감", "나를 어떻게", "마음", "연애"],
  reunion: ["재회", "전애인", "헤어진", "다시", "이별", "미련", "잠수"],
  third_party: ["다른 여자", "다른 남자", "제3자", "경쟁자", "삼각관계"],
  daily: ["오늘", "내일", "하루", "운세"],
  choice: ["선택", "고민", "할까", "말까", "A", "B"],
  career: ["이직", "직장", "사업", "성공", "일", "프로젝트"],
  money: ["돈", "수익", "재물", "투자", "지출", "금전"],
  relationship: ["인간관계", "갈등", "오해", "신뢰", "관계"],
  self: ["자존감", "불안", "내면", "심리", "나 자신"],
  crisis: ["문제", "위기", "막막", "해결", "갑자기"],
  future: ["미래", "흐름", "앞으로", "3개월", "장기"],
  spiritual: ["영혼", "직관", "신호", "수호", "운명"],
  family: ["가족", "가문", "뿌리", "부모", "조상"],
  power: ["권력", "리더", "야망", "조직", "성공"],
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
  special: "이 특별한 상황에서 가장 먼저 읽어야 할 핵심 신호는 무엇일까?",
};

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
    special: "특수 상황일수록 질문을 짧고 차갑게 쓰는 편이 해석이 또렷합니다.",
  }[category];
}

function buildSpread(blueprint: SpreadBlueprint): TarotSpread {
  const labels = blueprint.positions || SPECIAL_POSITIONS[blueprint.id] || createFallbackPositions(blueprint.cardCount);
  return {
    id: blueprint.id,
    title: blueprint.title,
    category: blueprint.category,
    cardCount: blueprint.cardCount,
    difficulty: blueprint.difficulty,
    purpose: blueprint.purpose,
    positions: layoutSpreadPositions(labels),
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

export function findSpreadById(id: string) {
  return SPREAD_LIBRARY.find((spread) => spread.id === id) || SPREAD_LIBRARY[0];
}