export const ZIWEI_PROMPT_TEMPLATES = Object.freeze({
  love: {
    domain: "love",
    domainKo: "연애/결혼",
    keywordWeights: {
      "부부궁": { weight: 0.95, depth: "핵심", markers: ["spouse", "fortune"] },
      "관계 리듬": { weight: 0.88, depth: "중요", markers: ["ming", "travel"] },
      "갈등 트리거": { weight: 0.84, depth: "중요", markers: ["sihua", "stars"] },
      "회복 전략": { weight: 0.8, depth: "보조", markers: ["annualFlow", "timing"] },
    },
    analysisAngles: [
      "부부궁/복덕궁/천이궁을 연결해 관계 안정성 분석",
      "명궁 기질과 감정 반응 패턴의 충돌 지점 특정",
      "단기 4주 관계 개선 행동 루틴 제시",
    ],
    questionPatterns: [
      "관계를 안정시키려면 어떤 대화 방식을 써야 하나요?",
      "반복되는 갈등 패턴을 끊는 핵심 행동은 무엇인가요?",
      "이번 달 연애 실행 우선순위 3가지를 알려주세요.",
    ],
  },
  career: {
    domain: "career",
    domainKo: "직업/사업",
    keywordWeights: {
      "관록궁": { weight: 0.95, depth: "핵심", markers: ["career", "ming"] },
      "확장성": { weight: 0.88, depth: "중요", markers: ["travel", "annualFlow"] },
      "성과 리듬": { weight: 0.84, depth: "중요", markers: ["majorPeriods", "sihua"] },
      "전환 타이밍": { weight: 0.8, depth: "보조", markers: ["timing", "flow"] },
    },
    analysisAngles: [
      "관록궁 중심 직무 적합도와 지속성 분석",
      "명궁/복덕궁 에너지와 소진 리스크 분리",
      "90일 실행 계획으로 전환",
    ],
    questionPatterns: [
      "현재 커리어에서 가장 중요한 선택은 무엇인가요?",
      "이직/현직 유지 판단 기준을 알려주세요.",
      "성과를 높이고 소모를 줄이는 루틴을 제시해주세요.",
    ],
  },
  money: {
    domain: "money",
    domainKo: "돈/재물",
    keywordWeights: {
      "재백궁": { weight: 0.96, depth: "핵심", markers: ["wealth", "career"] },
      "수익 구조": { weight: 0.88, depth: "중요", markers: ["majorPeriods", "sihua"] },
      "손실 리스크": { weight: 0.84, depth: "중요", markers: ["health", "friends"] },
      "축적 루틴": { weight: 0.8, depth: "보조", markers: ["fortune", "timing"] },
    },
    analysisAngles: [
      "재백궁 단독이 아닌 관록/복덕/천이 연동 분석",
      "돈이 새는 패턴과 회수 전략 분리",
      "4주 재무 행동 계획 제시",
    ],
    questionPatterns: [
      "돈이 새는 핵심 패턴을 무엇부터 끊어야 하나요?",
      "현실적인 수익 경로 2~3개를 제안해주세요.",
      "이번 달 지출/저축 규칙을 만들어주세요.",
    ],
  },
  lawsuit: {
    domain: "lawsuit",
    domainKo: "송사/분쟁",
    keywordWeights: {
      "분쟁축": { weight: 0.94, depth: "핵심", markers: ["travel", "friends", "health"] },
      "법적 리스크": { weight: 0.88, depth: "중요", markers: ["career", "sihua"] },
      "대응 타이밍": { weight: 0.84, depth: "중요", markers: ["annualFlow", "majorPeriods"] },
      "증거 관리": { weight: 0.8, depth: "보조", markers: ["action", "checklist"] },
    },
    analysisAngles: [
      "질액/천이/교우궁 중심 분쟁 리스크 식별",
      "감정 대응과 법적 대응을 분리",
      "단기 대응 체크리스트 제시",
    ],
    questionPatterns: [
      "지금 가장 먼저 대비해야 할 법적 리스크는 무엇인가요?",
      "분쟁 상황에서 피해야 할 대응 방식을 알려주세요.",
      "2~6주 대응 우선순위를 제시해주세요.",
    ],
  },
  relationship: {
    domain: "relationship",
    domainKo: "인간관계",
    keywordWeights: {
      "교우궁": { weight: 0.93, depth: "핵심", markers: ["friends", "siblings"] },
      "충돌 패턴": { weight: 0.87, depth: "중요", markers: ["ming", "fortune"] },
      "경계 설정": { weight: 0.83, depth: "중요", markers: ["travel", "annualFlow"] },
      "회복 루틴": { weight: 0.8, depth: "보조", markers: ["timing", "action"] },
    },
    analysisAngles: [
      "교우/형제/부부궁 연동으로 관계 구조 해석",
      "갈등 촉발 언행과 완화 언행 제시",
      "2주 단위 실행 계획",
    ],
    questionPatterns: [
      "인간관계 갈등을 줄이는 핵심 습관은 무엇인가요?",
      "상대를 자극하지 않는 대화 방식은 무엇인가요?",
      "관계 회복을 위한 2주 체크리스트를 제시해주세요.",
    ],
  },
  health: {
    domain: "health",
    domainKo: "건강/멘탈",
    keywordWeights: {
      "질액궁": { weight: 0.94, depth: "핵심", markers: ["health", "fortune"] },
      "멘탈 소모": { weight: 0.88, depth: "중요", markers: ["ming", "travel"] },
      "회복 루틴": { weight: 0.83, depth: "중요", markers: ["annualFlow", "timing"] },
      "재발 방지": { weight: 0.8, depth: "보조", markers: ["action", "habit"] },
    },
    analysisAngles: [
      "질액/복덕/명궁을 연결해 회복력 분석",
      "과부하 트리거와 완충 전략 분리",
      "생활 루틴 조정 계획 제시",
    ],
    questionPatterns: [
      "요즘 멘탈 소모를 줄이려면 무엇부터 바꿔야 하나요?",
      "회복 루틴을 현실적으로 제안해주세요.",
      "과부하 전조 신호 체크포인트를 알려주세요.",
    ],
  },
  life_direction: {
    domain: "life_direction",
    domainKo: "인생 방향",
    keywordWeights: {
      "명궁": { weight: 0.94, depth: "핵심", markers: ["ming", "fortune"] },
      "관록 전환": { weight: 0.87, depth: "중요", markers: ["career", "travel"] },
      "우선순위": { weight: 0.83, depth: "중요", markers: ["annualFlow", "majorPeriods"] },
      "실행력": { weight: 0.8, depth: "보조", markers: ["action", "timing"] },
    },
    analysisAngles: [
      "명궁/관록/복덕 축으로 현재 과제 도출",
      "버릴 선택과 잡을 선택 분리",
      "90일 로드맵 구성",
    ],
    questionPatterns: [
      "지금 인생에서 가장 먼저 정리할 우선순위는 무엇인가요?",
      "3개월 실행 계획을 단계별로 제시해주세요.",
      "지금 피해야 할 선택을 알려주세요.",
    ],
  },
});

export function getZiweiPromptTemplate(domain) {
  return ZIWEI_PROMPT_TEMPLATES[String(domain || "").trim()] || null;
}

export function classifyQuestionToZiweiDomain(question) {
  const text = String(question || "").toLowerCase();
  const map = {
    lawsuit: ["소송", "고소", "재판", "법", "송사", "분쟁"],
    career: ["직업", "진로", "이직", "사업", "회사", "커리어"],
    money: ["돈", "재물", "수익", "매출", "투자", "저축"],
    love: ["연애", "결혼", "재회", "인연", "상대"],
    relationship: ["인간관계", "가족", "친구", "동료", "갈등"],
    health: ["건강", "멘탈", "스트레스", "불안", "회복"],
    life_direction: ["인생", "방향", "미래", "운명", "전환"],
  };

  for (const [domain, keywords] of Object.entries(map)) {
    if (keywords.some((keyword) => text.includes(keyword))) return domain;
  }
  return "life_direction";
}
