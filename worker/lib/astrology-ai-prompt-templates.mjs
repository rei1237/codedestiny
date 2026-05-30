export const ASTROLOGY_PROMPT_TEMPLATES = Object.freeze({
  compatibility: {
    domain: "compatibility",
    domainKo: "궁합/시나스트리",
    requiresCompatibility: true,
    keywordWeights: {
      "시나스트리 점수": { weight: 0.96, depth: "핵심", markers: ["score", "relationType"] },
      "감정 궁합": { weight: 0.92, depth: "핵심", markers: ["partnerMoon", "loveDesc"] },
      "충돌 트리거": { weight: 0.88, depth: "중요", markers: ["bestChallenge", "houseOverlay"] },
      "회복 전략": { weight: 0.84, depth: "중요", markers: ["communication", "boundary"] },
    },
    analysisAngles: [
      "시나스트리 점수와 관계 유형을 분리 해석",
      "감정 안전지대와 충돌 지점을 구체화",
      "관계 유지/이탈 시나리오를 현실적으로 구분",
      "2~6주 실천 가능한 대화 전략 제시",
    ],
    questionPatterns: [
      "우리 관계에서 가장 위험한 갈등 트리거 2가지는 무엇인가요?",
      "갈등 시 감정 소모를 줄이는 대화 문장을 알려주세요.",
      "관계를 안정화하기 위한 4주 실행 루틴을 제시해주세요.",
    ],
  },
  reconciliation: {
    domain: "reconciliation",
    domainKo: "재회/관계 회복",
    requiresCompatibility: true,
    keywordWeights: {
      "재회 가능성": { weight: 0.95, depth: "핵심", markers: ["score", "longTerm"] },
      "연락 타이밍": { weight: 0.9, depth: "핵심", markers: ["transit", "moon"] },
      "금지 행동": { weight: 0.86, depth: "중요", markers: ["bestChallenge", "pattern"] },
      "회복 속도": { weight: 0.82, depth: "중요", markers: ["stability", "trust"] },
    },
    analysisAngles: [
      "재회 가능 구간과 보류 구간 분리",
      "연락 주기/문장 길이/표현 강도 가이드",
      "불안 기반 압박 행동 제거",
      "현실 기대치 조정 및 회복 속도 관리",
    ],
    questionPatterns: [
      "재회 시도 전에 확인해야 할 최소 조건은 무엇인가요?",
      "지금 보내면 좋은 메시지 톤과 금지 표현을 알려주세요.",
      "6주 기준 관계 회복 로드맵을 제시해주세요.",
    ],
  },
  breakup: {
    domain: "breakup",
    domainKo: "이별/관계 정리",
    requiresCompatibility: true,
    keywordWeights: {
      "이별 원인": { weight: 0.92, depth: "핵심", markers: ["bestChallenge", "relationType"] },
      "정리 방식": { weight: 0.88, depth: "핵심", markers: ["communication", "boundary"] },
      "후유증": { weight: 0.84, depth: "중요", markers: ["moon", "stress"] },
      "재충돌 방지": { weight: 0.81, depth: "중요", markers: ["pattern", "distance"] },
    },
    analysisAngles: [
      "이별 반복 패턴과 촉발 조건 분석",
      "감정 소모 최소화 정리 방식",
      "후폭풍 관리 루틴",
      "관계 재충돌 방지 수칙",
    ],
    questionPatterns: [
      "이 관계를 정리할 때 가장 덜 후회하는 방식은 무엇인가요?",
      "마지막 대화에서 피해야 할 표현을 알려주세요.",
      "이별 후 4주 회복 루틴을 제안해주세요.",
    ],
  },
  love: {
    domain: "love",
    domainKo: "연애/호감",
    requiresCompatibility: false,
    keywordWeights: {
      "연애 리듬": { weight: 0.9, depth: "핵심", markers: ["venus", "moon", "7H"] },
      "감정 반응": { weight: 0.86, depth: "중요", markers: ["moon", "aspects"] },
      "소통 방식": { weight: 0.83, depth: "중요", markers: ["mercury", "house"] },
      "경계 설정": { weight: 0.8, depth: "보조", markers: ["saturn", "pattern"] },
    },
    analysisAngles: [
      "연애 패턴의 강점/리스크를 분리",
      "상처 재현 트리거를 구체화",
      "관계 안정형 소통 전략 제시",
      "단기 행동 계획 정리",
    ],
    questionPatterns: [
      "연애에서 반복되는 실패 패턴을 끊으려면 무엇부터 바꿔야 할까요?",
      "감정 소모를 줄이는 소통 습관 3가지를 알려주세요.",
      "이번 달 연애 행동 우선순위를 제시해주세요.",
    ],
  },
  career: {
    domain: "career",
    domainKo: "직업/커리어",
    requiresCompatibility: false,
    keywordWeights: {
      "커리어 축": { weight: 0.91, depth: "핵심", markers: ["MC", "10H"] },
      "성과 리듬": { weight: 0.87, depth: "중요", markers: ["saturn", "jupiter"] },
      "전환 타이밍": { weight: 0.84, depth: "중요", markers: ["transit", "profection"] },
      "협업 적합도": { weight: 0.8, depth: "보조", markers: ["mercury", "air"] },
    },
    analysisAngles: [
      "10H/MC 중심 커리어 구조 진단",
      "이직/확장 리스크와 완충 전략",
      "성과를 만드는 일 리듬 설계",
      "90일 실행 계획 도출",
    ],
    questionPatterns: [
      "지금 커리어에서 최우선 과제 3가지는 무엇인가요?",
      "이직/현직 유지 판단 기준을 제시해주세요.",
      "성과를 높이고 소모를 줄이는 루틴을 알려주세요.",
    ],
  },
  money: {
    domain: "money",
    domainKo: "재정/수익",
    requiresCompatibility: false,
    keywordWeights: {
      "현금흐름": { weight: 0.9, depth: "핵심", markers: ["2H", "11H", "venus"] },
      "지출 트리거": { weight: 0.86, depth: "중요", markers: ["moon", "neptune"] },
      "수익 모델": { weight: 0.84, depth: "중요", markers: ["MC", "jupiter"] },
      "리스크 관리": { weight: 0.8, depth: "보조", markers: ["saturn", "8H"] },
    },
    analysisAngles: [
      "재무 구조의 강약 구간 분석",
      "감정 소비/충동 지출 패턴 교정",
      "수익화 루트 우선순위 제시",
      "4주 재무 루틴 설계",
    ],
    questionPatterns: [
      "돈이 새는 핵심 패턴을 어떻게 끊어야 하나요?",
      "이번 달 재무 실행 우선순위 3가지를 알려주세요.",
      "현실적인 지출/저축 규칙을 제안해주세요.",
    ],
  },
  relationship: {
    domain: "relationship",
    domainKo: "인간관계",
    requiresCompatibility: false,
    keywordWeights: {
      "갈등 트리거": { weight: 0.9, depth: "핵심", markers: ["moon", "mars", "aspects"] },
      "소통 안정": { weight: 0.85, depth: "중요", markers: ["mercury", "air"] },
      "거리 조절": { weight: 0.82, depth: "중요", markers: ["saturn", "7H"] },
      "회복 루틴": { weight: 0.8, depth: "보조", markers: ["routine", "boundary"] },
    },
    analysisAngles: [
      "관계 반응 패턴의 반복 고리 분석",
      "갈등 유발 표현 교정",
      "신뢰 회복 행동 루틴",
      "단기 실행 계획",
    ],
    questionPatterns: [
      "인간관계 갈등을 줄이는 핵심 습관은 무엇인가요?",
      "상대를 자극하지 않는 대화법을 알려주세요.",
      "2주 행동 체크리스트를 제시해주세요.",
    ],
  },
  health: {
    domain: "health",
    domainKo: "건강/멘탈",
    requiresCompatibility: false,
    keywordWeights: {
      "스트레스": { weight: 0.9, depth: "핵심", markers: ["moon", "6H", "saturn"] },
      "회복 루틴": { weight: 0.86, depth: "핵심", markers: ["sleep", "routine"] },
      "과부하 신호": { weight: 0.83, depth: "중요", markers: ["neptune", "mars"] },
      "재발 방지": { weight: 0.8, depth: "보조", markers: ["habit", "boundary"] },
    },
    analysisAngles: [
      "멘탈 과부하 조건 식별",
      "수면/회복 루틴 재설계",
      "감정 소모 차단 전략",
      "실행 가능한 관리 계획",
    ],
    questionPatterns: [
      "최근 멘탈 소모를 줄이려면 무엇부터 바꿔야 하나요?",
      "회복 루틴을 현실적으로 제시해주세요.",
      "과부하 전조 신호 체크포인트를 알려주세요.",
    ],
  },
  life_direction: {
    domain: "life_direction",
    domainKo: "인생 방향",
    requiresCompatibility: false,
    keywordWeights: {
      "방향성": { weight: 0.9, depth: "핵심", markers: ["sun", "asc", "mc"] },
      "전환 시점": { weight: 0.86, depth: "중요", markers: ["transit", "timelord"] },
      "우선순위": { weight: 0.83, depth: "중요", markers: ["focusHouse", "elements"] },
      "실행력": { weight: 0.8, depth: "보조", markers: ["routine", "discipline"] },
    },
    analysisAngles: [
      "현재 국면의 핵심 과제 도출",
      "버릴 선택/잡을 선택 분리",
      "90일 행동 로드맵",
      "리스크 완충 전략",
    ],
    questionPatterns: [
      "지금 가장 먼저 정리할 우선순위는 무엇인가요?",
      "앞으로 3개월 실행 계획을 단계별로 제시해주세요.",
      "지금 피해야 할 선택을 명확히 알려주세요.",
    ],
  },
});

export function getAstrologyPromptTemplate(domain) {
  return ASTROLOGY_PROMPT_TEMPLATES[String(domain || "").trim()] || null;
}

export function classifyQuestionToAstrologyDomain(question) {
  const text = String(question || "").toLowerCase();
  const map = {
    reconciliation: ["재회", "다시", "회복", "돌아"],
    breakup: ["이별", "헤어", "정리", "끝내"],
    compatibility: ["궁합", "시나스트리", "상대", "배우자"],
    love: ["연애", "썸", "결혼", "고백"],
    career: ["직업", "진로", "이직", "커리어", "창업"],
    money: ["돈", "재정", "재물", "투자", "수익"],
    relationship: ["인간관계", "가족", "친구", "동료", "갈등"],
    health: ["건강", "멘탈", "스트레스", "수면", "회복"],
    life_direction: ["인생", "방향", "미래", "목표", "전환"],
  };

  for (const [domain, keywords] of Object.entries(map)) {
    if (keywords.some((keyword) => text.includes(keyword))) return domain;
  }

  return "life_direction";
}
