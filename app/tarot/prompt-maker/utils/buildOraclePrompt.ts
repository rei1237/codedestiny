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
  const cardDigest = drawnCards.map((card, index) => {
    const expertKeywords = deriveExpertKeywords(card);
    return `${index + 1}. ${card.positionLabel} - ${card.cardNameKo} (${card.orientationLabel}) | 전문 키워드: ${expertKeywords.join(" | ")}`;
  });
  const guidance = [
    "해석 우선순위는 포지션 질문 -> 카드 원형 의미 -> 정/역방향 변조 -> 스프레드 내 상호작용 순서로 고정합니다.",
    "정방향은 발현 강도를, 역방향은 지연/내면화/과잉의 가능성을 점검해 단정 없이 맥락형 문장으로 씁니다.",
    "메이저 아르카나는 사건의 큰 축, 마이너는 일상 작동 메커니즘으로 분리 해석합니다.",
    "수트 해석 시 완드=행동, 컵=감정, 소드=인지, 펜타클=현실 운영 축을 반드시 명시합니다.",
    "랭크는 진행 단계(시작-갈등-회복-종결)를 나타내므로 시간/강도 문장으로 변환합니다.",
    "상대 속마음, 재회, 미래 질문은 확정적 예언을 금지하고 조건부 시나리오(가능성 A/B)로 제시합니다.",
    "모든 카드 해석은 질문자의 실행 가능 행동으로 마무리하고, 최소 3개의 구체 행동을 제공합니다.",
    "문체는 따뜻하지만 현실적인 상담 톤을 유지하고 공포 유도/운명 단정/도덕 판단 문장을 금지합니다.",
  ];
  const summary = `${spread.title}에서 ${drawnCards.map((card) => `${card.cardNameKo} ${card.orientationLabel}`).join(", ")} 흐름이 잡혔습니다. 전문가 해석 프레임(원형-방향-포지션-상호작용)을 포함해 ${CATEGORY_LABEL[spread.category]} 질문을 정밀하게 읽도록 설계되었습니다.`;

  const interpretationMethod = [
    "카드별 해석 템플릿: [포지션 질문] -> [카드 원형 핵심] -> [방향 변조] -> [관계/상황 맥락] -> [실행 조언]",
    "교차 해석: 1번(문제 인식)과 마지막 카드(결론)의 긴장/합치를 우선 비교",
    "리스크 해석: 소드/펜타클 역방향 비중이 높으면 의사소통-현실운영 충돌 경고 문장 추가",
    "기회 해석: 컵/완드 정방향 비중이 높으면 관계 회복/행동 추진 문장 강화",
  ];

  const prompt = [
    "당신은 감정 과잉 없이 따뜻하고 정확하게 흐름을 읽는 한국어 타로 리더이자, 상징 해석과 심리적 맥락화를 수행하는 전문가입니다.",
    "",
    "[질문]",
    effectiveQuestion,
    "",
    "[스프레드 정보]",
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
    "[해석 규칙]",
    ...guidance.map((rule, index) => `${index + 1}. ${rule}`),
    "",
    "[전문 해석 방법론]",
    ...interpretationMethod.map((rule, index) => `${index + 1}. ${rule}`),
    "",
    "[출력 형식]",
    "1. 질문 요약",
    "2. 전체 흐름 한눈에 보기(핵심 축 2개 + 리스크 축 1개)",
    "3. 카드별 해석(포지션 질문/카드 상징/방향 변조/실행 조언 포함)",
    "4. 교차 해석(핵심 카드 간 상호작용)",
    "5. 지금 놓치면 안 되는 진실",
    "6. 행동 조언 3가지(24시간/7일/30일 단위)",
    "7. 한 문장 결론",
    "",
    "[톤]",
    "지나치게 운명론적이거나 자극적인 문장을 피하고, 위로와 현실 감각을 함께 유지합니다.",
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