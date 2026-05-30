export const SAJU_PROMPT_TEMPLATES = Object.freeze({
  litigation: {
    domain: "litigation",
    domainKo: "법률/분쟁",
    title: "사주 기반 법률·분쟁 대응 프롬프트",
    keywordWeights: {
      "말실수 리스크": { weight: 0.95, depth: "핵심", markers: ["식상", "관성", "일지", "충돌"] },
      "문서/증거 정리": { weight: 0.9, depth: "핵심", markers: ["인성", "관성", "정관", "정인"] },
      "감정 통제": { weight: 0.88, depth: "중요", markers: ["비겁", "상관", "충"] },
      "평판/사회 반응": { weight: 0.82, depth: "중요", markers: ["관성", "재성", "관재"] },
    },
    analysisAngles: [
      "관성·식상 균형으로 분쟁 대응 톤 분석",
      "충·형·파가 강한 구간의 감정 과열 리스크",
      "증거·문서·진술의 일관성 강화 전략",
      "대운/세운 구간별 분쟁 완화/확대 시나리오",
    ],
    questionPatterns: [
      "지금 분쟁 상황에서 제가 가장 조심해야 할 말과 행동은 무엇인가요?",
      "법적 대응 시 유리해지기 위한 현실적 준비 순서를 알려주세요.",
      "현재 운 흐름에서 감정 폭주를 막는 루틴을 제시해주세요.",
    ],
  },
  love: {
    domain: "love",
    domainKo: "연애/결혼",
    title: "사주 기반 연애·결혼 프롬프트",
    keywordWeights: {
      "관계 패턴": { weight: 0.95, depth: "핵심", markers: ["일지", "배우자성", "재성/관성"] },
      "소통 갈등": { weight: 0.9, depth: "중요", markers: ["식상", "상관", "충"] },
      "결혼 안정성": { weight: 0.84, depth: "중요", markers: ["합", "관성", "인성"] },
      "재회 가능성": { weight: 0.8, depth: "보조", markers: ["대운", "세운", "합충"] },
    },
    analysisAngles: [
      "일지와 배우자성 중심의 관계 기본축",
      "감정-소통 충돌 유발 패턴",
      "장기 안정성을 높이는 행동 교정 포인트",
      "대운/세운의 관계 전환 타이밍",
    ],
    questionPatterns: [
      "현재 관계에서 반복되는 갈등 패턴을 끊는 방법은 무엇인가요?",
      "결혼/장기연애로 가기 위한 준비 포인트를 알려주세요.",
      "감정적 반응보다 관계를 지키는 소통 방식을 제시해주세요.",
    ],
  },
  career: {
    domain: "career",
    domainKo: "직업/커리어",
    title: "사주 기반 직업·커리어 프롬프트",
    keywordWeights: {
      "직업 적합도": { weight: 0.94, depth: "핵심", markers: ["관성", "식상", "인성"] },
      "이직 타이밍": { weight: 0.9, depth: "핵심", markers: ["대운", "세운", "충형"] },
      "조직 vs 독립": { weight: 0.86, depth: "중요", markers: ["정관", "편관", "비겁"] },
      "실행력": { weight: 0.8, depth: "보조", markers: ["식상", "재성"] },
    },
    analysisAngles: [
      "관성·식상·인성으로 본 커리어 타입",
      "조직형/독립형/사업형 적합도 비교",
      "손실 줄이는 이직/전환 전략",
      "대운 구간별 성장 가속 포인트",
    ],
    questionPatterns: [
      "저에게 맞는 커리어 성장 경로를 우선순위로 알려주세요.",
      "이직 시점을 판단할 핵심 신호 3가지를 제시해주세요.",
      "현재 직장 내 갈등을 줄이는 실전 대응법을 알려주세요.",
    ],
  },
  money: {
    domain: "money",
    domainKo: "재물/수익",
    title: "사주 기반 재물·수익 프롬프트",
    keywordWeights: {
      "현금흐름": { weight: 0.96, depth: "핵심", markers: ["재성", "식상생재", "관성"] },
      "손실 리스크": { weight: 0.91, depth: "핵심", markers: ["비겁", "충", "투기"] },
      "수익모델": { weight: 0.88, depth: "중요", markers: ["격국", "용신", "십성"] },
      "저축/축적": { weight: 0.82, depth: "중요", markers: ["정재", "인성"] },
    },
    analysisAngles: [
      "재성 작동 구조(유통/회수/축적) 분석",
      "식상생재 가능성과 매출화 경로",
      "비겁/충 구간의 손실 방지 전략",
      "시기별 수익 가속과 보수 운영 구간 분리",
    ],
    questionPatterns: [
      "제 사주에서 가장 현실적인 수익모델 3가지를 알려주세요.",
      "돈이 새는 패턴을 끊기 위한 행동 교정 포인트를 알려주세요.",
      "앞으로 3~6개월 재무 운영 우선순위를 제시해주세요.",
    ],
  },
  relationship: {
    domain: "relationship",
    domainKo: "인간관계/소통",
    title: "사주 기반 인간관계·소통 프롬프트",
    keywordWeights: {
      "소통 톤": { weight: 0.94, depth: "핵심", markers: ["식상", "상관", "인성"] },
      "갈등 트리거": { weight: 0.89, depth: "핵심", markers: ["충", "형", "비겁"] },
      "신뢰 형성": { weight: 0.85, depth: "중요", markers: ["정관", "정인", "합"] },
      "관계 회복": { weight: 0.8, depth: "보조", markers: ["세운", "합충"] },
    },
    analysisAngles: [
      "식상-인성 균형으로 본 소통 패턴",
      "갈등이 확대되는 말버릇/반응 습관",
      "신뢰 회복을 위한 메시지 구조",
      "관계별(가족/동료/연인) 전략 분화",
    ],
    questionPatterns: [
      "갈등이 반복되는 인간관계 패턴의 근본 원인을 분석해주세요.",
      "말실수 줄이고 신뢰를 높이는 소통 룰을 알려주세요.",
      "2주~6주 안에 실행 가능한 관계 개선 계획을 제시해주세요.",
    ],
  },
  health: {
    domain: "health",
    domainKo: "건강/멘탈",
    title: "사주 기반 건강·멘탈 프롬프트",
    keywordWeights: {
      "스트레스 패턴": { weight: 0.93, depth: "핵심", markers: ["상관", "비겁", "충"] },
      "생활 리듬": { weight: 0.88, depth: "핵심", markers: ["조후", "오행 편중"] },
      "수면/회복": { weight: 0.84, depth: "중요", markers: ["수기", "인성"] },
      "과로 리스크": { weight: 0.8, depth: "보조", markers: ["관성", "재성 과다"] },
    },
    analysisAngles: [
      "오행 편중과 컨디션 저하 신호",
      "조후 관점의 생활 리듬 재정렬",
      "과로/불안/수면 문제의 악화 조건",
      "짧게 실행 가능한 회복 루틴 설계",
    ],
    questionPatterns: [
      "제 사주에서 멘탈이 흔들릴 때의 패턴과 회복법을 알려주세요.",
      "수면/스트레스 관리에 우선 적용할 루틴 3가지를 제시해주세요.",
      "과로를 줄이면서 성과를 유지하는 현실적 방법을 알려주세요.",
    ],
  },
  life_direction: {
    domain: "life_direction",
    domainKo: "인생 방향/전환",
    title: "사주 기반 인생 방향·전환 프롬프트",
    keywordWeights: {
      "핵심 성향": { weight: 0.92, depth: "핵심", markers: ["일간", "격국", "용신"] },
      "전환 시점": { weight: 0.89, depth: "핵심", markers: ["대운", "세운", "합충"] },
      "우선순위": { weight: 0.85, depth: "중요", markers: ["십성", "조후"] },
      "장기 전략": { weight: 0.8, depth: "보조", markers: ["반복 패턴", "리스크 분리"] },
    },
    analysisAngles: [
      "일간-격국-용신 기반의 방향성 설계",
      "지금 시점의 과제와 버릴 선택지 분리",
      "대운 전환 구간의 행동 전략",
      "90일/1년 단위 실행 로드맵",
    ],
    questionPatterns: [
      "지금 제 인생에서 가장 먼저 정리해야 할 우선순위는 무엇인가요?",
      "전환 시기에 피해야 할 선택과 잡아야 할 선택을 나눠주세요.",
      "향후 1년 방향성을 3단계 실행계획으로 제시해주세요.",
    ],
  },
});

export function getSajuPromptTemplate(domain) {
  return SAJU_PROMPT_TEMPLATES[String(domain || "").trim()] || null;
}

export function getAvailableSajuDomains() {
  return Object.keys(SAJU_PROMPT_TEMPLATES).map((key) => ({
    key,
    ko: SAJU_PROMPT_TEMPLATES[key].domainKo,
    title: SAJU_PROMPT_TEMPLATES[key].title,
  }));
}

export function classifyQuestionToSajuDomain(question) {
  const text = String(question || "").toLowerCase();
  const domainKeywords = {
    litigation: ["송사", "재판", "법", "분쟁", "고소", "법정", "증거"],
    love: ["연애", "결혼", "재회", "썸", "배우자", "궁합", "이별"],
    career: ["직업", "진로", "이직", "커리어", "회사", "승진", "창업"],
    money: ["돈", "재물", "수익", "매출", "투자", "자산", "부자"],
    relationship: ["인간관계", "가족", "친구", "동료", "소통", "갈등"],
    health: ["건강", "몸", "멘탈", "불안", "스트레스", "수면", "회복"],
    life_direction: ["인생", "방향", "운명", "미래", "목표", "전환"],
  };

  for (const [domain, keywords] of Object.entries(domainKeywords)) {
    if (keywords.some((kw) => text.includes(kw))) return domain;
  }
  return "life_direction";
}
