import { TAROT_CARDS } from "../../../../lib/tarot/tarot-cards.mjs";
import { CATEGORY_LABEL, DEFAULT_QUESTION_BY_CATEGORY } from "../data/tarotSpreadLibrary";
import type { DrawnTarotCard, TarotSpread } from "../types";

type OraclePromptResult = {
  prompt: string;
  summary: string;
  cardDigest: string[];
  guidance: string[];
  effectiveQuestion: string;
};

type SuitCode = "W" | "C" | "S" | "P";

type OraclePromptOptions = {
  questionCategory?: TarotSpread["category"];
};

type TarotMeaning = {
  core?: string[];
  shadow?: string[];
  advice?: string[];
  shadowText?: string;
  adviceText?: string;
  boundaryPattern?: string[];
  recoveryAdvice?: string[];
  caution?: string[];
  [key: string]: unknown;
};

type TarotCardWithMeanings = {
  code?: string;
  upright?: TarotMeaning;
  reversed?: TarotMeaning;
};

type SpreadAnalysis = {
  total: number;
  majorCount: number;
  courtCount: number;
  suitCounts: Record<SuitCode, number>;
  uprightCount: number;
  reversedCount: number;
  repeatedSuits: string[];
  tone: string;
  firstCard: DrawnTarotCard | null;
  lastCard: DrawnTarotCard | null;
  adviceCard: DrawnTarotCard | null;
  obstacleCard: DrawnTarotCard | null;
  outcomeCard: DrawnTarotCard | null;
  summaryLines: string[];
};

const ORIENTATION_MEANING: Record<"upright" | "reversed", string> = {
  upright: "정방향: 에너지가 비교적 자연스럽게 발현되는 상태",
  reversed: "역방향: 지연, 과잉, 내면화, 왜곡처럼 에너지가 비틀려 나타나는 상태",
};

const SUIT_EXPERT_LENS: Record<string, string> = {
  W: "완드: 추진력, 욕망, 행동 에너지, 리스크 감수",
  C: "컵: 감정 교류, 애착, 정서적 안전감, 친밀성",
  S: "소드: 인지 프레임, 경계, 갈등 인식, 의사결정",
  P: "펜타클: 현실성, 지속 가능성, 자원 운용, 관계의 실무",
};

const RANK_EXPERT_LENS: Record<string, string> = {
  "01": "에이스: 씨앗, 시작점, 잠재력 점화",
  "02": "투: 양자 선택, 균형/줄다리기, 기준 확립",
  "03": "쓰리: 확장, 연계, 외부 상호작용",
  "04": "포: 안정화 또는 고착화, 보호 본능",
  "05": "파이브: 갈등, 결핍 체감, 전환 압박",
  "06": "식스: 회복, 재정렬, 관계 온도 복원",
  "07": "세븐: 경계, 전략, 시험 구간",
  "08": "에잇: 가속 또는 압박, 방향 전환 직전",
  "09": "나인: 정리, 내면 점검, 마무리 직전",
  "10": "텐: 종결, 최대치, 다음 사이클 진입",
  "11": "페이지: 신호 포착, 학습, 탐색",
  "12": "나이트: 돌진, 속도, 결과 선호",
  "13": "퀸: 정서적 통제력, 맥락 읽기, 조율",
  "14": "킹: 책임, 최종 판단, 구조화",
};

const MAJOR_EXPERT_LENS: Record<string, string> = {
  M00: "바보: 무경계의 시작, 가능성 점프, 리스크 인식 필요",
  M01: "마법사: 의도-행동 정렬, 실행력, 현실화",
  M02: "여사제: 침묵의 정보, 직관, 보류된 진실",
  M03: "여황제: 돌봄, 풍요, 관계 양육",
  M04: "황제: 구조, 규칙, 책임, 통제 이슈",
  M05: "교황: 가치 체계, 합의, 제도/약속",
  M06: "연인: 선택과 결합, 가치 일치 여부",
  M07: "전차: 의지 주행, 속도 조절, 방향성",
  M08: "힘: 감정 조율, 자기 통제, 회복 탄력",
  M09: "은둔자: 거리 두기, 성찰, 재정의",
  M10: "운명의 수레바퀴: 타이밍, 순환, 외부 변수",
  M11: "정의: 균형, 책임 배분, 인과 정렬",
  M12: "매달린 사람: 유예, 관점 전환, 전략적 멈춤",
  M13: "죽음: 패턴 종결, 구조적 전환, 재시작",
  M14: "절제: 통합, 속도 완화, 중간지대 협상",
  M15: "악마: 집착, 의존, 경계 붕괴 리스크",
  M16: "탑: 급변, 붕괴, 강제 재편",
  M17: "별: 회복, 신뢰 재건, 장기 희망",
  M18: "달: 불안, 투사, 정보 불명확성",
  M19: "태양: 명료성, 개방, 활력 회복",
  M20: "심판: 재평가, 호출, 관계 재결정",
  M21: "세계: 통합, 완결, 성숙한 귀결",
};

const SUIT_LABEL: Record<SuitCode, string> = {
  W: "완드",
  C: "컵",
  S: "소드",
  P: "펜타클",
};

const CATEGORY_FOCUS: Record<TarotSpread["category"], string[]> = {
  love: ["상대 마음", "관계 흐름", "호감의 온도", "내가 취할 태도", "피해야 할 행동"],
  reunion: ["연락 가능성", "미련과 정리의 균형", "관계 재정의", "기다림과 행동의 속도", "회복 가능한 소통 방식"],
  third_party: ["제3자의 실제 영향력", "불안과 사실의 분리", "경쟁 구도에서의 내 경계", "상대의 행동 단서", "관계 보호 전략"],
  relationship: ["갈등의 핵심", "말과 행동의 불일치", "관계의 신뢰도", "조율해야 할 경계", "현실적인 대화 방식"],
  career: ["현재 상황", "기회와 리스크", "나의 강점", "현실적 선택 기준", "다음 행동"],
  money: ["돈의 흐름", "위험요소", "확장 가능성", "관리해야 할 부분", "현실적 조언"],
  family: ["가족 안의 반복 패턴", "감정적 거리", "말하지 않은 요구", "내가 지킬 경계", "회복 가능한 대화"],
  self: ["내면 감정", "반복되는 심리 패턴", "회복 포인트", "자기 보호", "작은 실천"],
  choice: ["선택 A/B의 기준", "얻는 것과 잃는 것", "내가 감당할 수 있는 현실", "보류가 필요한 지점", "결정 후 행동"],
  daily: ["오늘의 분위기", "주의할 말과 행동", "기회 신호", "감정 조율", "하루 마무리 조언"],
  crisis: ["문제의 표면과 본질", "즉시 피해야 할 충동", "통제 가능한 변수", "외부 도움 필요성", "첫 번째 현실 행동"],
  future: ["가까운 흐름", "준비해야 할 변화", "반복될 가능성이 있는 패턴", "내가 바꿀 수 있는 선택", "장기 조언"],
  spiritual: ["반복되는 직관 신호", "내면의 상징 언어", "현실과 영감의 균형", "받아들일 메시지", "오늘의 의식적 선택"],
  power: ["영향력의 방향", "성공 욕구와 책임", "리더십의 그림자", "조직 안의 균형", "지속 가능한 야망"],
  special: ["질문의 진짜 의도", "핵심 변수", "숨은 감정", "현실적 대응", "오늘 가능한 조정"],
  legal: ["감정과 사실의 분리", "리스크 점검", "전문가 상담 필요성", "기록과 준비", "신중한 대응"],
};

const CATEGORY_EXPRESSION_GUIDE: Record<TarotSpread["category"], string> = {
  love: "상대의 마음은 확정하지 말고, 카드가 보여주는 가능성과 행동 단서로 말합니다.",
  reunion: "재회 가능성은 단정하지 말고, 미련·현실 조건·연락 타이밍을 분리합니다.",
  third_party: "제3자 문제는 불안을 키우지 말고, 확인된 행동과 추정되는 감정을 구분합니다.",
  daily: "오늘의 흐름은 하루 안에 실천 가능한 조언으로 짧고 선명하게 정리합니다.",
  choice: "선택 질문은 정답을 대신 정하지 말고, 얻는 것과 잃는 것을 비교해 기준을 세웁니다.",
  career: "커리어 질문은 감정적 만족, 현실 조건, 준비도를 함께 봅니다.",
  money: "금전 질문은 투자 확답이나 수익 보장을 피하고, 관리·점검·보수적 선택 기준으로 안내합니다.",
  relationship: "인간관계 질문은 책임 소재를 단정하지 말고, 대화 순서와 경계선을 제안합니다.",
  self: "심리 질문은 진단처럼 쓰지 말고, 감정 이름 붙이기와 회복 행동으로 낮춥니다.",
  crisis: "위기 질문은 공포를 키우지 말고, 멈출 행동·바로 할 행동·도움을 청할 지점을 분리합니다.",
  future: "미래 질문은 예언보다 현재 패턴이 이어질 때의 가능성으로 말합니다.",
  spiritual: "영적 메시지는 현실을 회피하게 만들지 말고, 상징을 오늘의 선택으로 번역합니다.",
  family: "가족 질문은 오래된 패턴을 다루되, 죄책감보다 경계와 회복 가능성을 우선합니다.",
  power: "성공과 권력 질문은 욕망을 부정하지 말고, 책임과 균형의 그림자를 함께 읽습니다.",
  legal: "법률 질문은 승패나 판결을 예언하지 말고, 기록 정리와 전문가 상담을 권하는 참고용 상징 해석으로 제한합니다.",
  special: "특별 상황은 질문자의 의도를 먼저 재정리하고, 핵심 변수와 오늘 가능한 조정을 중심으로 말합니다.",
};

const CATEGORY_SAFETY_GUIDE: Partial<Record<TarotSpread["category"], string[]>> = {
  crisis: [
    "긴급한 위험, 폭력, 자해 가능성이 보이면 타로 판단을 멈추고 즉시 주변 도움이나 전문기관 연결을 권합니다.",
    "불안을 증폭하는 예언 대신 지금 멈출 행동, 확인할 사실, 요청할 도움을 순서대로 제시합니다.",
  ],
  legal: [
    "판결, 승패, 고소 성공 여부를 확정하지 않고 기록 정리와 전문가 상담을 우선 안내합니다.",
    "감정적 해석과 법적 사실을 분리해 참고용 상징 해석으로만 표현합니다.",
  ],
  money: [
    "수익, 투자 성공, 손실 회복을 보장하지 않고 위험 신호와 보수적 관리 기준으로 안내합니다.",
  ],
  self: [
    "진단명처럼 말하지 않고 감정의 이름, 회복 행동, 도움을 청할 수 있는 선택지로 낮춥니다.",
  ],
};

const CONSULTATION_PROTOCOL = [
  "질문자가 진짜 알고 싶어 하는 의도를 먼저 한 문장으로 밝힙니다.",
  "스프레드의 목적과 각 포지션의 역할을 질문 맥락에 맞게 연결합니다.",
  "카드별 해석은 카드 이름보다 포지션, 방향, 질문 맥락을 우선합니다.",
  "카드 간 긴장과 조화를 읽어 전체 이야기를 하나의 흐름으로 엮습니다.",
  "결론은 운명 선언이 아니라 질문자가 회복할 수 있는 선택지로 마무리합니다.",
];

const PROMPT_COMPLETION_CHECKLIST = [
  "질문 재정의가 원문 반복에 그치지 않고 질문자의 실제 의도를 드러냈는지 확인합니다.",
  "모든 포지션 해석에 카드 방향, 포지션 의미, 질문 맥락이 함께 들어갔는지 확인합니다.",
  "카드 간 관계를 최소 한 번 이상 연결해 전체 흐름을 하나의 이야기로 묶었는지 확인합니다.",
  "민감 주제에서 확정 표현, 공포 표현, 전문가 판단 대체 표현이 없는지 확인합니다.",
  "마지막 조언이 오늘 실행 가능한 행동과 마음가짐으로 끝나는지 확인합니다.",
];

const FORBIDDEN_PHRASES = ["반드시", "무조건", "100%", "끝났다", "절대 안 된다", "망합니다", "합격합니다", "병이 있습니다", "죽음이 보입니다"];

const CARD_MEANING_MAP = new Map(
  (TAROT_CARDS as TarotCardWithMeanings[])
    .filter((card) => card?.code)
    .map((card) => [String(card.code).toUpperCase(), card]),
);

function ensureText(value: string) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function toUnique(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  values.forEach((value) => {
    const normalized = ensureText(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  });
  return out;
}

function cardCodeParts(cardCode: string) {
  const normalized = String(cardCode || "").toUpperCase();
  const suitCode = normalized.slice(0, 1);
  const rankCode = normalized.slice(1, 3);
  return { normalized, suitCode, rankCode };
}

function toTextArray(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => ensureText(String(item))).filter(Boolean);
  const text = ensureText(String(value || ""));
  return text ? [text] : [];
}

function resolveCardMeaning(card: DrawnTarotCard) {
  const source = CARD_MEANING_MAP.get(card.cardCode.toUpperCase());
  return source?.[card.orientation] || null;
}

function deriveCardMeaningClues(card: DrawnTarotCard, category: TarotSpread["category"]) {
  const meaning = resolveCardMeaning(card);
  if (!meaning) return [];
  return toUnique([
    ...toTextArray(meaning[category]).map((line) => `상황별 해석: ${line}`),
    ...toTextArray(meaning.core).map((line) => `핵심: ${line}`),
    ...toTextArray(meaning.shadow).map((line) => `그림자: ${line}`),
    ...toTextArray(meaning.shadowText).map((line) => `주의: ${line}`),
    ...toTextArray(meaning.advice).map((line) => `조언: ${line}`),
    ...toTextArray(meaning.adviceText).map((line) => `실행: ${line}`),
    ...toTextArray(meaning.boundaryPattern).map((line) => `경계 패턴: ${line}`),
    ...toTextArray(meaning.recoveryAdvice).map((line) => `회복 조언: ${line}`),
    ...toTextArray(meaning.caution).map((line) => `주의점: ${line}`),
  ]).slice(0, 6);
}

function deriveExpertKeywords(card: DrawnTarotCard, category: TarotSpread["category"]) {
  const { normalized, suitCode, rankCode } = cardCodeParts(card.cardCode);
  const orientationLens = card.orientation === "reversed"
    ? ["에너지 역전", "지연/과잉", "내면 갈등"]
    : ["자연 발현", "진행 신호", "행동 가능"];
  const majorLens = MAJOR_EXPERT_LENS[normalized] ? [MAJOR_EXPERT_LENS[normalized]] : [];
  const suitLens = SUIT_EXPERT_LENS[suitCode] ? [SUIT_EXPERT_LENS[suitCode]] : [];
  const rankLens = RANK_EXPERT_LENS[rankCode] ? [RANK_EXPERT_LENS[rankCode]] : [];
  return toUnique([
    ...card.keywords,
    card.focus,
    ...orientationLens,
    ...majorLens,
    ...suitLens,
    ...rankLens,
    ...deriveCardMeaningClues(card, category),
  ]).slice(0, 12);
}

function buildQuestionClarityGuide(question: string) {
  const text = ensureText(question);
  if (text.length < 12) return "질문이 짧으므로 대상, 현재 상황, 질문자가 원하는 결론을 해석 안에서 부드럽게 보완합니다.";
  if (text.length > 170) return "질문이 길기 때문에 사건의 핵심, 감정의 핵심, 실제로 알고 싶은 결론을 먼저 정리한 뒤 해석합니다.";
  if (!/(어떻게|무엇|뭐|왜|언제|가능성|마음|흐름|조언|선택|해야|될까|일까|할까|괜찮|가능|타이밍|결과|주의)/u.test(text)) {
    return "질문 방향이 넓으므로 카드 해석 전에 질문자가 확인하고 싶은 초점을 한 문장으로 좁힙니다.";
  }
  return "질문 초점이 충분하므로 카드와 포지션을 질문자의 실제 상황에 바로 연결합니다.";
}

function isSuitCode(value: string): value is SuitCode {
  return value === "W" || value === "C" || value === "S" || value === "P";
}

function cardLabel(card: DrawnTarotCard | null) {
  if (!card) return "해당 카드 없음";
  return `${card.positionLabel} 위치의 ${card.cardNameKo} ${card.orientationLabel}`;
}

function findCardByPosition(cards: DrawnTarotCard[], patterns: RegExp[]) {
  return cards.find((card) => {
    const text = `${card.positionLabel} ${card.positionDescription}`;
    return patterns.some((pattern) => pattern.test(text));
  }) || null;
}

function dominantTone(analysis: Omit<SpreadAnalysis, "tone" | "summaryLines" | "repeatedSuits">) {
  const scores: Record<string, number> = {
    "감정 중심": analysis.suitCounts.C,
    "갈등 중심": analysis.suitCounts.S,
    "현실 중심": analysis.suitCounts.P,
    "행동 중심": analysis.suitCounts.W,
    "전환점 중심": analysis.majorCount,
  };
  if (analysis.reversedCount >= Math.ceil(analysis.total / 2)) scores["내면 정체 중심"] = analysis.reversedCount;
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] || "균형 조율 중심";
}

function analyzeSpreadCards(cards: DrawnTarotCard[]): SpreadAnalysis {
  const suitCounts: Record<SuitCode, number> = { W: 0, C: 0, S: 0, P: 0 };
  let majorCount = 0;
  let courtCount = 0;
  let uprightCount = 0;
  let reversedCount = 0;

  cards.forEach((card) => {
    const { normalized, suitCode, rankCode } = cardCodeParts(card.cardCode);
    if (normalized.startsWith("M")) majorCount += 1;
    if (isSuitCode(suitCode)) suitCounts[suitCode] += 1;
    if (Number(rankCode) >= 11 && Number(rankCode) <= 14) courtCount += 1;
    if (card.orientation === "reversed") reversedCount += 1;
    else uprightCount += 1;
  });

  const repeatedSuits = (Object.keys(suitCounts) as SuitCode[])
    .filter((suit) => suitCounts[suit] >= 2)
    .map((suit) => `${SUIT_LABEL[suit]} ${suitCounts[suit]}장`);
  const base = {
    total: cards.length,
    majorCount,
    courtCount,
    suitCounts,
    uprightCount,
    reversedCount,
    firstCard: cards[0] || null,
    lastCard: cards[cards.length - 1] || null,
    adviceCard: findCardByPosition(cards, [/조언/, /최종/, /행동/, /태도/]),
    obstacleCard: findCardByPosition(cards, [/장애/, /위험/, /막는/, /두려움/, /병목/]),
    outcomeCard: findCardByPosition(cards, [/결과/, /미래/, /종합/, /가능성/]),
  };
  const tone = dominantTone(base);
  const summaryLines = [
    `총 ${cards.length}장 중 메이저 아르카나가 ${majorCount}장으로, 질문자가 통제하기 어려운 전환 흐름의 강도를 함께 봅니다.`,
    `슈트 비율은 완드 ${suitCounts.W}장, 컵 ${suitCounts.C}장, 소드 ${suitCounts.S}장, 펜타클 ${suitCounts.P}장입니다.`,
    `정방향 ${uprightCount}장, 역방향 ${reversedCount}장으로 흐름의 개방성과 지연/내면화 가능성을 비교합니다.`,
    `궁정 카드는 ${courtCount}장입니다. 인물, 태도, 관계 역학이 카드 배열에서 얼마나 크게 작동하는지 확인합니다.`,
    repeatedSuits.length ? `반복되는 슈트: ${repeatedSuits.join(", ")}.` : "반복되는 슈트가 강하지 않아 카드별 포지션 관계를 더 세밀하게 봅니다.",
    `전체 톤은 ${tone}으로 읽습니다.`,
    `첫 카드: ${cardLabel(base.firstCard)} / 마지막 카드: ${cardLabel(base.lastCard)}.`,
    `장애물 카드: ${cardLabel(base.obstacleCard)} / 조언 카드: ${cardLabel(base.adviceCard)} / 결과 카드: ${cardLabel(base.outcomeCard)}.`,
  ];

  return {
    ...base,
    repeatedSuits,
    tone,
    summaryLines,
  };
}

function reframeQuestion(question: string, category: TarotSpread["category"]) {
  const normalized = ensureText(question);
  if (normalized.length >= 12) {
    return `${normalized}라는 질문을 고객이 현재 무엇을 알고 싶고 어떤 태도를 선택해야 하는지 살피는 상담 질문으로 재정의합니다.`;
  }
  const fallback: Partial<Record<TarotSpread["category"], string>> = {
    love: "상대의 마음과 관계 흐름을 확인하되, 내 감정과 행동 기준을 함께 세우는 질문",
    reunion: "상대가 다시 움직일 가능성과 내가 어떤 태도로 기다리거나 움직이면 좋을지를 보는 질문",
    career: "지금 일의 부담과 새로운 기회의 현실성을 함께 비교하는 질문",
    money: "현재 돈의 흐름과 관리해야 할 위험요소를 현실적으로 점검하는 질문",
    choice: "두 선택지의 장단점과 내가 감당할 수 있는 기준을 확인하는 질문",
    self: "내 마음의 반복 패턴과 회복에 필요한 태도를 살피는 질문",
  };
  return fallback[category] || "짧거나 모호한 질문을 고객의 의도를 추정하되 확정하지 않고, 상담 가능한 형태로 부드럽게 넓힌 질문";
}

function relationshipSignals(cards: DrawnTarotCard[], analysis: SpreadAnalysis) {
  const lines = [
    `시작 카드와 마지막 카드의 흐름: ${cardLabel(analysis.firstCard)}에서 시작해 ${cardLabel(analysis.lastCard)}로 이어지므로, 첫 인상과 최종 조언의 온도 차이를 비교하세요.`,
  ];
  if (analysis.obstacleCard && analysis.adviceCard) {
    lines.push(`장애물과 조언의 관계: ${cardLabel(analysis.obstacleCard)}가 막는 지점을 ${cardLabel(analysis.adviceCard)}의 태도로 조절할 수 있는지 봅니다.`);
  }
  if (analysis.outcomeCard && analysis.adviceCard && analysis.outcomeCard !== analysis.adviceCard) {
    lines.push(`결과 위치와 조언 위치가 다르면 결과를 단정하지 말고, 조언을 따랐을 때 흐름이 어떻게 달라질 수 있는지 설명하세요.`);
  }
  if (analysis.suitCounts.C > 0 && analysis.suitCounts.P > 0) {
    lines.push("감정 카드와 현실 카드가 함께 있으므로 마음의 온도와 실제 조건의 균형을 반드시 함께 읽습니다.");
  }
  if (analysis.suitCounts.S >= 2) {
    lines.push("소드가 반복되면 말, 판단, 거리두기, 오해 가능성을 핵심 갈등 축으로 다룹니다.");
  }
  if (analysis.majorCount >= Math.ceil(cards.length / 2)) {
    lines.push("메이저 아르카나 비율이 높으면 고객이 즉시 통제하기 어려운 큰 전환 흐름을 인정하되, 오늘 선택할 수 있는 작은 행동으로 내려옵니다.");
  }
  return lines;
}

function lenormandCardLine(card: DrawnTarotCard | null) {
  if (!card) return "해당 카드 없음";
  return `${card.positionLabel}의 ${card.cardNameKo}`;
}

function buildLenormandPairLines(cards: DrawnTarotCard[]) {
  return cards.slice(0, -1).map((card, index) => {
    const next = cards[index + 1];
    return `${card.cardNameKo} + ${next.cardNameKo}: ${card.focus}에서 ${next.focus}로 이어지는 흐름을 한 문장처럼 읽습니다.`;
  });
}

export function buildLenormandPrompt(spread: TarotSpread, question: string, drawnCards: DrawnTarotCard[]): OraclePromptResult {
  const effectiveQuestion = ensureText(question) || "지금 보고 싶은 상황에서 가장 먼저 확인해야 할 흐름과 행동 단서는 무엇일까?";
  const cardFlow = drawnCards.map((card) => `${card.positionLabel}의 ${card.cardNameKo}`).join(", ");
  const cardDigest = drawnCards.map((card, index) => [
    `${index + 1}. ${card.positionLabel} - ${card.positionDescription}`,
    `카드: ${card.cardNameKo}`,
    `핵심 단서: ${toUnique([...card.keywords, card.focus]).join(" | ")}`,
  ].join("\n"));
  const pairLines = buildLenormandPairLines(drawnCards);
  const guidance = [
    "레노먼드는 카드를 한 장씩 고립해 보기보다 인접 카드와 조합을 문장처럼 이어 읽습니다.",
    "타로식 역방향을 쓰지 않고 카드의 순서, 거리, 반복되는 신호를 기준으로 해석합니다.",
    "결과를 단정형 예언으로 고정하지 말고 현재 흐름, 반복 패턴, 다음 행동 후보로 나누어 읽습니다.",
    "질문, 현재 상황, 뽑는 시점을 한 문장으로 정리한 뒤 카드의 흐름을 연결합니다.",
    "좋고 나쁨을 판정하기보다 어떤 행동을 줄이거나 늘릴지 확인합니다.",
    "의료, 법률, 재무처럼 손실이 큰 결정은 이 리딩만으로 확정하지 말고 참고 자료로 표현합니다.",
  ];
  const summary = `${spread.title} 안에 ${cardFlow} 흐름이 놓였습니다. 6장의 인접 조합을 따라 현재 상황, 반복 신호, 행동 단서가 차례로 드러납니다.`;
  const prompt = [
    "당신은 실제 고객을 상담하는 전문 레노먼드 리더입니다.",
    "",
    "고객의 질문은 다음과 같습니다.",
    "",
    "[고객 질문]",
    effectiveQuestion,
    "",
    "질문을 적으면 그 주제에 맞는 프롬프트와 해석 흐름이 바로 열립니다.",
    "주제를 입력하고 6장 레노먼드 카드로 흐름과 행동 단서를 봅니다.",
    "",
    "[전통과 이야기]",
    "레노먼드는 19세기 프랑스의 점술가 마드무아젤 르노르망과 연결되어 널리 알려진 36장 카드 전통입니다.",
    "",
    "[입력 전 체크]",
    "질문, 현재 상황, 뽑는 시점을 한 문장으로 정리합니다. 레노먼드는 출생시간보다 질문의 초점과 산출된 카드 순서가 중요합니다.",
    "",
    "[사용한 배열]",
    `배열: ${spread.title}`,
    `카드 수: ${spread.cardCount}`,
    `배열 목적: ${spread.purpose}`,
    "",
    "[6장 레노먼드 카드]",
    ...cardDigest,
    "",
    "[인접 카드 조합]",
    ...pairLines.map((line) => `- ${line}`),
    "",
    "[전체 흐름 단서]",
    `- 첫 카드: ${lenormandCardLine(drawnCards[0] || null)}`,
    `- 중심 카드: ${lenormandCardLine(drawnCards[Math.floor(drawnCards.length / 2)] || null)}`,
    `- 마지막 카드: ${lenormandCardLine(drawnCards[drawnCards.length - 1] || null)}`,
    "",
    "[해석 기준]",
    ...guidance.map((rule, index) => `${index + 1}. ${rule}`),
    "",
    "[출력 형식]",
    "아래 순서로 실제 레노먼드 상담 결과를 작성하세요.",
    "",
    "1. 질문 범위와 지금 확인해야 할 포인트",
    "2. 6장이 이어 만드는 한 문장 흐름",
    "3. 인접 카드 조합별 해석",
    "4. 반복되는 신호와 줄여야 할 행동",
    "5. 늘리면 좋은 행동 단서 2~3가지",
    "6. 판단을 정리하는 마지막 한마디",
    "",
    "[목소리]",
    "문체는 전문적이고 신뢰감 있는 레노먼드 상담체로 작성하세요.",
    "카드 이름을 기계적으로 나열하지 말고, 인접 카드가 이어지는 문장을 따라 질문자의 현실에 닿게 말하세요.",
    "단정적인 예언보다 지금 드러난 흐름, 반복 패턴, 선택 가능한 행동을 선명하게 비추세요.",
  ].join("\n");

  return {
    prompt,
    summary,
    cardDigest,
    guidance,
    effectiveQuestion,
  };
}

export function buildOraclePrompt(spread: TarotSpread, question: string, drawnCards: DrawnTarotCard[], options: OraclePromptOptions = {}): OraclePromptResult {
  const questionCategory = options.questionCategory || spread.category;
  const effectiveQuestion = ensureText(question) || DEFAULT_QUESTION_BY_CATEGORY[questionCategory];
  const analysis = analyzeSpreadCards(drawnCards);
  const categoryFocus = CATEGORY_FOCUS[questionCategory];
  const categoryExpressionGuide = CATEGORY_EXPRESSION_GUIDE[questionCategory];
  const categorySafetyGuide = CATEGORY_SAFETY_GUIDE[questionCategory] || [];
  const reframedQuestion = reframeQuestion(effectiveQuestion, questionCategory);
  const questionClarityGuide = buildQuestionClarityGuide(effectiveQuestion);
  const cardFlow = drawnCards.map((card) => `${card.positionLabel}의 ${card.cardNameKo} ${card.orientationLabel}`).join(", ");
  const cardDigest = drawnCards.map((card, index) => {
    const expertKeywords = deriveExpertKeywords(card, questionCategory);
    return [
      `${index + 1}. ${card.positionLabel} - ${card.positionDescription}`,
      `카드: ${card.cardNameKo}`,
      `방향: ${card.orientationLabel}`,
      `상담 단서: ${expertKeywords.join(" | ")}`,
    ].join("\n");
  });
  const guidance = [
    "카드의 일반적인 의미보다 해당 카드가 놓인 위치의 의미를 우선합니다.",
    "포지션의 역할, 카드 방향, 카드별 상황 해석 단서를 한 문장 안에서 함께 엮습니다.",
    "각 카드를 따로 설명하는 데서 끝내지 말고 전체 배열의 흐름을 하나의 상담 이야기로 연결합니다.",
    "메이저 아르카나 비율, 슈트 반복, 정방향/역방향 비율, 숫자 흐름, 궁정 카드 여부를 종합합니다.",
    "현재 위치, 장애물 위치, 숨은 원인 위치, 조언 위치, 결과 위치의 관계를 비교합니다.",
    "연애 질문은 상대 마음을 단정하지 말고 카드가 보여주는 정서적 가능성과 관계 흐름으로 설명합니다.",
    "직업/금전 질문은 현실 조건, 리스크, 준비도, 실행 타이밍을 함께 설명합니다.",
    "연애운과 미래 흐름은 확정 미래가 아니라 현재 패턴과 선택에 따라 달라질 수 있는 가능성으로 설명합니다.",
    "고객에게 공포를 주거나 운명을 단정하지 않습니다.",
    "법률, 의료, 투자, 생명·사망, 임신, 합격 여부 등은 확정적으로 말하지 말고 참고용 조언으로만 표현합니다.",
    `다음 단정 표현을 피합니다: ${FORBIDDEN_PHRASES.join(", ")}.`,
    "마지막에는 고객이 오늘부터 실제로 할 수 있는 행동 조언을 2~3개 제시합니다.",
    ...categorySafetyGuide,
  ];
  const summary = `${spread.title} 위에 ${cardFlow} 흐름이 놓였습니다. 이 AI 상담 프롬프트는 ${CATEGORY_LABEL[questionCategory]} 질문을 포지션 의미, 카드 방향, 카드 간 관계, 안전 표현 기준까지 묶어 실제 상담 원고로 펼칩니다.`;
  const relationLines = relationshipSignals(drawnCards, analysis);

  const prompt = [
    "당신은 실제 고객을 상담하는 전문 타로 리더입니다.",
    "",
    "고객의 질문은 다음과 같습니다.",
    "",
    "[고객 질문]",
    effectiveQuestion,
    "",
    "이 질문은 단순히 카드 뜻을 설명하는 것이 아니라, 고객이 현재 어떤 상황에서 무엇을 알고 싶어 하는지 파악한 뒤 상담하듯이 해석해야 합니다.",
    "",
    "먼저 고객의 질문을 상담 가능한 형태로 재정의하세요.",
    "질문이 짧거나 모호하다면, 고객의 의도를 추정하되 확정하지 말고 부드럽게 표현하세요.",
    "",
    "[질문 재정의]",
    reframedQuestion,
    "",
    "[질문 카테고리]",
    CATEGORY_LABEL[questionCategory],
    "",
    "[질문 선명도 보정]",
    questionClarityGuide,
    "",
    "[상담 초점]",
    ...categoryFocus.map((focus) => `- ${focus}`),
    "",
    "[카테고리 표현 기준]",
    categoryExpressionGuide,
    "",
    ...(categorySafetyGuide.length ? [
      "[민감 질문 안전 기준]",
      ...categorySafetyGuide.map((rule) => `- ${rule}`),
      "",
    ] : []),
    "[상담 프로토콜]",
    ...CONSULTATION_PROTOCOL.map((rule, index) => `${index + 1}. ${rule}`),
    "",
    "[완성도 점검]",
    ...PROMPT_COMPLETION_CHECKLIST.map((rule, index) => `${index + 1}. ${rule}`),
    "",
    "[사용한 배열]",
    `스프레드: ${spread.title}`,
    `스프레드 원래 분류: ${CATEGORY_LABEL[spread.category]}`,
    `질문 상담 카테고리: ${CATEGORY_LABEL[questionCategory]}`,
    `카드 수: ${spread.cardCount}`,
    `배열 목적: ${spread.purpose}`,
    "",
    "[배열 위치와 카드]",
    ...cardDigest,
    "",
    "[배열 요약]",
    ...analysis.summaryLines.map((line) => `- ${line}`),
    "",
    "[카드 간 관계 단서]",
    ...relationLines.map((line) => `- ${line}`),
    "",
    "[방향 해석 기준]",
    `- ${ORIENTATION_MEANING.upright}`,
    `- ${ORIENTATION_MEANING.reversed}`,
    "",
    "[해석 원칙]",
    ...guidance.map((rule, index) => `${index + 1}. ${rule}`),
    "",
    "[출력 형식]",
    "아래 순서로 실제 상담 결과를 작성하세요.",
    "",
    "1. 질문자가 지금 묻고 있는 진짜 주제",
    "2. 스프레드 전체에서 먼저 보이는 큰 흐름",
    "3. 포지션별 카드 해석",
    "4. 카드들이 서로 만드는 긴장과 조화",
    "5. 질문자가 조심해야 할 착각 또는 과잉 기대",
    "6. 오늘부터 가능한 현실 행동 2~3가지",
    "7. 마음을 정리하는 마지막 한마디",
    "",
    "[목소리]",
    "문체는 따뜻하고 신뢰감 있는 상담체로 작성하세요.",
    "단순한 해설문이 아니라 질문자가 실제로 상담을 받은 느낌이 들도록, 불안을 낮추고 판단 기준을 선명하게 제시하세요.",
    "카드 이름을 기계적으로 나열하지 말고, 실제 타로 상담사가 고객 앞에서 설명하듯 자연스럽게 말하세요.",
    "달빛과 별빛 같은 Code:Destiny의 섬세한 톤은 유지하되, 과장되거나 공포를 주는 표현은 피하세요.",
  ].join("\n");

  return {
    prompt,
    summary,
    cardDigest,
    guidance,
    effectiveQuestion,
  };
}
