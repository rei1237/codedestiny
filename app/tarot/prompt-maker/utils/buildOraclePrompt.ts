import { CATEGORY_LABEL, DEFAULT_QUESTION_BY_CATEGORY } from "../data/tarotSpreadLibrary";
import type { DrawnTarotCard, TarotSpread } from "../types";

type OraclePromptResult = {
  prompt: string;
  summary: string;
  cardDigest: string[];
  guidance: string[];
  effectiveQuestion: string;
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

function deriveExpertKeywords(card: DrawnTarotCard) {
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
  ]).slice(0, 8);
}

export function buildOraclePrompt(spread: TarotSpread, question: string, drawnCards: DrawnTarotCard[]): OraclePromptResult {
  const effectiveQuestion = ensureText(question) || DEFAULT_QUESTION_BY_CATEGORY[spread.category];
  const cardFlow = drawnCards.map((card) => `${card.cardNameKo} ${card.orientationLabel}`).join(", ");
  const cardDigest = drawnCards.map((card, index) => {
    const expertKeywords = deriveExpertKeywords(card);
    return `${index + 1}. ${card.positionLabel} - ${card.cardNameKo} (${card.orientationLabel}) | 신탁 단서: ${expertKeywords.join(" | ")}`;
  });
  const guidance = [
    "먼저 질문의 숨은 정서를 짧게 짚고, 포지션 질문과 카드 상징을 한 호흡으로 연결합니다.",
    "정방향은 자연스럽게 열리는 문, 역방향은 아직 잠겨 있거나 과해진 문으로 읽어 단정 없이 풀이합니다.",
    "메이저 아르카나는 운명의 큰 날씨로, 마이너 아르카나는 오늘의 말·행동·선택으로 번역합니다.",
    "완드는 행동, 컵은 감정, 소드는 생각과 경계, 펜타클은 현실 조건을 비추는 축으로 사용합니다.",
    "랭크는 흐름의 나이와 속도입니다. 시작, 갈등, 회복, 마무리의 감각을 시간 문장으로 풀어냅니다.",
    "속마음, 재회, 미래 질문은 확정 예언 대신 가능성 A/B와 지금 바꿀 수 있는 선택을 함께 제시합니다.",
    "각 카드 해석은 질문자가 오늘 붙잡을 수 있는 작은 행동 하나로 닫습니다.",
    "문체는 신비롭되 선명하게, 따뜻하되 현실적으로 유지하고 공포 유도와 운명 단정은 피합니다.",
  ];
  const summary = `${spread.title} 위에 ${cardFlow} 흐름이 놓였습니다. 이 오라클 원고는 ${CATEGORY_LABEL[spread.category]} 질문을 카드의 상징, 방향, 포지션, 현실 선택까지 이어지는 하나의 리딩 문장으로 펼칩니다.`;

  const interpretationMethod = [
    "카드별 리딩: 포지션이 묻는 질문, 카드의 원형 상징, 방향이 바꾸는 뉘앙스, 지금 가능한 행동을 순서대로 씁니다.",
    "교차 리딩: 첫 카드가 연 문과 마지막 카드가 닫는 문이 서로 맞물리는지 먼저 봅니다.",
    "주의 리딩: 소드와 펜타클 역방향이 강하면 말의 오해와 현실 조건의 충돌을 부드럽게 경고합니다.",
    "기회 리딩: 컵과 완드 정방향이 강하면 마음의 회복과 행동 추진을 현실적인 속도로 제안합니다.",
  ];

  const prompt = [
    "당신은 카드를 과장하지 않고, 질문자의 마음을 조용히 밝혀 주는 한국어 타로 리더입니다. 상징은 신비롭게 풀되 결론은 현실의 선택으로 내려놓습니다.",
    "",
    "[질문]",
    effectiveQuestion,
    "",
    "[스프레드의 문]",
    `이름: ${spread.title}`,
    `카테고리: ${CATEGORY_LABEL[spread.category]}`,
    `카드 수: ${spread.cardCount}`,
    `목적: ${spread.purpose}`,
    "",
    "[포지션과 카드]",
    ...cardDigest,
    "",
    "[방향 해석 기준]",
    `- ${ORIENTATION_MEANING.upright}`,
    `- ${ORIENTATION_MEANING.reversed}`,
    "",
    "[리딩의 결]",
    ...guidance.map((rule, index) => `${index + 1}. ${rule}`),
    "",
    "[카드가 이어지는 방식]",
    ...interpretationMethod.map((rule, index) => `${index + 1}. ${rule}`),
    "",
    "[리딩 원고]",
    "1. 질문의 속뜻을 한 문단으로 부드럽게 엽니다.",
    "2. 카드들이 만든 전체 흐름을 핵심 빛 2개와 조심할 그림자 1개로 정리합니다.",
    "3. 카드별 해석: 포지션의 질문, 카드 상징, 정/역방향의 뉘앙스, 오늘의 선택을 포함합니다.",
    "4. 핵심 카드끼리 서로 밀고 당기는 관계를 해석합니다.",
    "5. 지금 놓치면 안 되는 진실을 한 문단으로 남깁니다.",
    "6. 24시간, 7일, 30일 단위의 작은 선택 3가지를 제안합니다.",
    "7. 질문자가 마음에 품고 나갈 한 문장을 건넵니다.",
    "",
    "[목소리]",
    "운명론적이거나 자극적인 문장을 피하고, 위로와 현실 감각을 함께 유지합니다.",
    "질문자의 주도권을 강화하는 문장을 우선하며, 관계를 단정하는 문장은 금지합니다.",
  ].join("\n");

  return {
    prompt,
    summary,
    cardDigest,
    guidance,
    effectiveQuestion,
  };
}
