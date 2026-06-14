export const SUKUYO_PROMPT_TEMPLATES = Object.freeze({
  compatibility: {
    domain: "compatibility",
    domainKo: "궁합",
    requiresCompatibility: true,
    keywordWeights: {
      "관계 유형": { weight: 0.96, depth: "핵심", markers: ["relationType", "distanceLabel"] },
      "역할 비대칭": { weight: 0.9, depth: "핵심", markers: ["myRole", "partnerRole"] },
      "갈등 리스크": { weight: 0.88, depth: "중요", markers: ["conflictPattern", "conflictScore"] },
      "회복 가능성": { weight: 0.84, depth: "중요", markers: ["longTermPotential", "communicationScore"] },
    },
    analysisAngles: [
      "관계 유형/거리로 현재 체감 강도 분석",
      "역할 비대칭에서 오는 기대 충돌 구조",
      "감정 패턴과 갈등 패턴의 촉발 조건",
      "2주~6주 관계 회복 실행 루틴",
    ],
    questionPatterns: [
      "우리 관계에서 가장 위험한 갈등 트리거 2가지를 알려주세요.",
      "상대와 충돌을 줄이는 대화 문장 예시를 제시해주세요.",
      "관계를 지키기 위한 행동 우선순위 3가지를 알려주세요.",
    ],
  },
  reconciliation: {
    domain: "reconciliation",
    domainKo: "재회/회복",
    requiresCompatibility: true,
    keywordWeights: {
      "재회 가능성": { weight: 0.95, depth: "핵심", markers: ["longTermPotential", "score"] },
      "감정 온도": { weight: 0.9, depth: "핵심", markers: ["temperature", "emotionalPattern"] },
      "연락 전략": { weight: 0.86, depth: "중요", markers: ["communicationScore", "distanceLabel"] },
      "금지 행동": { weight: 0.83, depth: "중요", markers: ["conflictPattern", "myRole"] },
    },
    analysisAngles: [
      "재회 가능 구간과 보류 구간 분리",
      "연락 타이밍과 메시지 길이 전략",
      "집착/압박으로 보이는 행동 제거",
      "현실적 회복 속도와 기대치 조정",
    ],
    questionPatterns: [
      "재회 시도 전 반드시 점검할 조건을 알려주세요.",
      "연락 시 피해야 할 표현과 권장 표현을 알려주세요.",
      "6주 기준 관계 회복 계획을 단계별로 제시해주세요.",
    ],
  },
  breakup: {
    domain: "breakup",
    domainKo: "이별/정리",
    requiresCompatibility: true,
    keywordWeights: {
      "이별 원인": { weight: 0.92, depth: "핵심", markers: ["conflictPattern", "relationType"] },
      "정리 방식": { weight: 0.88, depth: "핵심", markers: ["myRole", "partnerRole"] },
      "후유증 관리": { weight: 0.85, depth: "중요", markers: ["emotionalPattern", "temperature"] },
      "재충돌 방지": { weight: 0.82, depth: "중요", markers: ["distanceLabel", "communicationScore"] },
    },
    analysisAngles: [
      "이별 반복 패턴과 근본 트리거",
      "감정 소모 최소화 정리 프로토콜",
      "후폭풍 관리 루틴과 경계선 설정",
      "재충돌 방지 커뮤니케이션",
    ],
    questionPatterns: [
      "관계를 정리할 때 가장 덜 후회하는 방식은 무엇인가요?",
      "상대와 마지막 대화에서 피해야 할 표현을 알려주세요.",
      "정리 후 멘탈 회복 4주 루틴을 제시해주세요.",
    ],
  },
  love: {
    domain: "love",
    domainKo: "연애 일반",
    requiresCompatibility: false,
    keywordWeights: {
      "연애 리듬": { weight: 0.9, depth: "핵심", markers: ["traits.love", "moonTone"] },
      "감정 패턴": { weight: 0.87, depth: "핵심", markers: ["traits.hidden", "emotionalPattern"] },
      "소통 안정": { weight: 0.82, depth: "중요", markers: ["communicationScore", "traits.core"] },
      "거리 조절": { weight: 0.8, depth: "중요", markers: ["distanceLabel", "relationType"] },
    },
    analysisAngles: [
      "개인 연애 리듬과 감정 반응 분석",
      "상처 재현 패턴 차단",
      "관계 안정형 소통법",
      "단기 행동 계획",
    ],
    questionPatterns: [
      "연애에서 반복되는 실패 패턴을 끊는 방법은?",
      "감정 소모를 줄이는 소통 습관 3가지는?",
      "이번 달 연애 행동 우선순위를 알려주세요.",
    ],
  },
  career: {
    domain: "career",
    domainKo: "직업/진로",
    requiresCompatibility: false,
    keywordWeights: {
      "업무 리듬": { weight: 0.9, depth: "핵심", markers: ["traits.work", "talent"] },
      "협업 스트레스": { weight: 0.85, depth: "중요", markers: ["traits.hidden", "relationship"] },
      "전환 시점": { weight: 0.82, depth: "중요", markers: ["life_direction", "pattern"] },
      "성장 전략": { weight: 0.8, depth: "보조", markers: ["core", "moonTone"] },
    },
    analysisAngles: [
      "숙 성향 기반 일 리듬 최적화",
      "협업/단독 적합도",
      "이직/전환 리스크 분리",
      "90일 실행 계획",
    ],
    questionPatterns: [
      "지금 커리어에서 우선순위 3가지를 알려주세요.",
      "이직/현직 유지 판단 기준을 제시해주세요.",
      "성과는 올리고 소모는 줄이는 루틴은?",
    ],
  },
  money: {
    domain: "money",
    domainKo: "재물/소비",
    requiresCompatibility: false,
    keywordWeights: {
      "수입 패턴": { weight: 0.9, depth: "핵심", markers: ["traits.wealth", "talent"] },
      "지출 습관": { weight: 0.87, depth: "핵심", markers: ["hidden", "emotion"] },
      "리스크 관리": { weight: 0.83, depth: "중요", markers: ["pattern", "stress"] },
      "축적 전략": { weight: 0.8, depth: "보조", markers: ["routine", "discipline"] },
    },
    analysisAngles: [
      "재물 리듬의 강약 구간",
      "감정 소비 트리거",
      "손실 회피 행동",
      "4주 재무 루틴",
    ],
    questionPatterns: [
      "돈이 새는 패턴을 끊는 방법은?",
      "이번 달 재무 관리 우선순위를 알려주세요.",
      "현실적인 저축/지출 규칙을 제안해주세요.",
    ],
  },
  relationship: {
    domain: "relationship",
    domainKo: "인간관계",
    requiresCompatibility: false,
    keywordWeights: {
      "갈등 트리거": { weight: 0.9, depth: "핵심", markers: ["traits.hidden", "conflict"] },
      "관계 거리": { weight: 0.86, depth: "중요", markers: ["distance", "tone"] },
      "신뢰 형성": { weight: 0.83, depth: "중요", markers: ["core", "communication"] },
      "회복 루틴": { weight: 0.8, depth: "보조", markers: ["routine", "response"] },
    },
    analysisAngles: [
      "관계에서 반복되는 반응 패턴",
      "갈등 유발 말버릇 교정",
      "신뢰 회복 프로토콜",
      "단기 실행 계획",
    ],
    questionPatterns: [
      "인간관계 갈등을 줄이는 핵심 습관은?",
      "상대를 자극하지 않는 대화법을 알려주세요.",
      "2주 행동 체크리스트를 제시해주세요.",
    ],
  },
  health: {
    domain: "health",
    domainKo: "건강/멘탈",
    requiresCompatibility: false,
    keywordWeights: {
      "스트레스": { weight: 0.9, depth: "핵심", markers: ["moonTone", "hidden"] },
      "회복 리듬": { weight: 0.86, depth: "핵심", markers: ["routine", "sleep"] },
      "과부하 신호": { weight: 0.83, depth: "중요", markers: ["work", "emotion"] },
      "재발 방지": { weight: 0.8, depth: "보조", markers: ["habit", "boundary"] },
    },
    analysisAngles: [
      "멘탈 과부하 조건 식별",
      "수면/회복 루틴 재설계",
      "감정 소모 차단",
      "실행 가능한 관리 계획",
    ],
    questionPatterns: [
      "최근 멘탈 소모를 줄이는 핵심 습관은?",
      "수면/회복 루틴을 현실적으로 제시해주세요.",
      "과부하 신호가 오기 전 체크포인트를 알려주세요.",
    ],
  },
  life_direction: {
    domain: "life_direction",
    domainKo: "인생 방향",
    requiresCompatibility: false,
    keywordWeights: {
      "방향성": { weight: 0.9, depth: "핵심", markers: ["core", "talent"] },
      "전환 시그널": { weight: 0.86, depth: "중요", markers: ["pattern", "moonTone"] },
      "우선순위": { weight: 0.83, depth: "중요", markers: ["work", "wealth", "relationship"] },
      "실행력": { weight: 0.8, depth: "보조", markers: ["routine", "discipline"] },
    },
    analysisAngles: [
      "현재 국면의 핵심 과제",
      "버릴 선택/잡을 선택 분리",
      "90일 행동 로드맵",
      "리스크 완충 전략",
    ],
    questionPatterns: [
      "지금 제 인생에서 가장 먼저 정리할 것은?",
      "앞으로 3개월 실행 계획을 단계별로 알려주세요.",
      "지금 피해야 할 선택을 명확히 알려주세요.",
    ],
  },
  personality: {
    domain: "personality",
    domainKo: "성향/기질",
    requiresCompatibility: false,
    keywordWeights: {
      "본명숙 기질": { weight: 0.92, depth: "핵심", markers: ["traits.core", "mansion"] },
      "그림자 패턴": { weight: 0.88, depth: "핵심", markers: ["traits.hidden", "karma"] },
      "관계 반응": { weight: 0.84, depth: "중요", markers: ["traits.love", "moonTone"] },
      "실행 리듬": { weight: 0.8, depth: "보조", markers: ["traits.work", "traits.wealth"] },
    },
    analysisAngles: [
      "본명숙 기질의 강점과 과잉 반응 분리",
      "그림자 패턴이 관계와 선택에 나타나는 방식",
      "연애/일/재물 리듬의 공통 반복 구조",
      "기질을 안정적으로 쓰는 4주 루틴",
    ],
    questionPatterns: [
      "제 성향에서 가장 먼저 다듬어야 할 패턴은 무엇인가요?",
      "강점이 과해질 때 생기는 문제를 알려주세요.",
      "제 본명숙 기질을 현실에서 잘 쓰는 루틴을 제안해주세요.",
    ],
  },
});

export function getSukuyoPromptTemplate(domain) {
  return SUKUYO_PROMPT_TEMPLATES[String(domain || "").trim()] || null;
}

function matchesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

export function classifyQuestionToSukuyoDomain(question) {
  const text = String(question || "").toLowerCase();
  const relationContext = ["상대", "그 사람", "애인", "전남친", "전여친", "연인", "배우자", "부부", "썸", "이별", "헤어진", "연락", "관계"];

  if (matchesAny(text, ["재회", "다시 만나", "다시 연락", "돌아올", "돌아오"])) return "reconciliation";
  if (matchesAny(text, ["회복", "다시"]) && matchesAny(text, relationContext)) return "reconciliation";
  if (matchesAny(text, ["이별", "헤어", "정리", "끝내"])) return "breakup";
  if (matchesAny(text, ["건강", "멘탈", "불안", "스트레스", "수면", "회복력", "몸", "마음"])) return "health";
  if (matchesAny(text, ["돈", "재물", "수입", "투자", "저축", "매출", "재정", "자산"])) return "money";
  if (matchesAny(text, ["직업", "진로", "이직", "커리어", "직장", "승진", "사업", "업무", "일자리"])) return "career";
  if (matchesAny(text, ["궁합", "상대", "인연", "관계 유형"])) return "compatibility";
  if (matchesAny(text, ["연애", "결혼", "썸", "사랑"])) return "love";
  if (matchesAny(text, ["인간관계", "가족", "친구", "동료", "갈등"])) return "relationship";
  if (matchesAny(text, ["성격", "기질", "강점", "약점", "본성", "패턴", "성향"])) return "personality";
  if (matchesAny(text, ["인생", "방향", "미래", "전환", "선택", "다시 일어", "앞으로"])) return "life_direction";
  return "life_direction";
}
