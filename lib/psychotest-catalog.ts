export type PsychotestEntry = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  estimatedMinutes: number;
  keywords: string[];
  focusPoints: string[];
};

export const PSYCHOTEST_APP_BASE_URL =
  "https://aesthetic-pig-design--youngchan1237.replit.app";

export const PSYCHOTESTS: PsychotestEntry[] = [
  {
    id: "psycho",
    slug: "psycho",
    title: "사이코패스 성향 테스트",
    summary: "PCL-R 스타일 20문항으로 공감, 충동, 반사회성 축을 가볍게 점검하는 성향 테스트",
    category: "성격",
    estimatedMinutes: 5,
    keywords: ["사이코패스 테스트", "사이코패스 성향", "공감능력 테스트", "성격 심리테스트", "PCL-R"],
    focusPoints: ["공감/죄책감 반응", "충동 조절 패턴", "대인관계 리스크 신호"],
  },
  {
    id: "narcissist",
    slug: "narcissist",
    title: "나르시시스트 테스트",
    summary: "자기중심성, 인정욕구, 공감 저하 경향을 체크하는 자기애 성향 진단형 테스트",
    category: "성격",
    estimatedMinutes: 5,
    keywords: ["나르시시스트 테스트", "자기애 성향", "나르시시즘 검사", "대인관계 심리", "성격 유형"],
    focusPoints: ["자기중요감", "인정 욕구 강도", "관계 갈등 패턴"],
  },
  {
    id: "chihuahua",
    slug: "chihuahua",
    title: "분노의 치와와 테스트",
    summary: "일상 분노 트리거와 감정 폭발 패턴을 유머 코드로 풀어보는 분노 성향 테스트",
    category: "재미",
    estimatedMinutes: 5,
    keywords: ["분노 테스트", "성격 테스트 재미", "감정 조절 테스트", "치와와 테스트", "스트레스 성향"],
    focusPoints: ["분노 트리거", "예민도", "회복 속도"],
  },
  {
    id: "aura",
    slug: "aura",
    title: "아우라 컬러 테스트",
    summary: "질문 기반으로 현재 분위기와 대인 인상을 아우라 컬러로 해석하는 감성 테스트",
    category: "힐링",
    estimatedMinutes: 3,
    keywords: ["아우라 테스트", "컬러 성격 테스트", "감성 심리테스트", "분위기 테스트", "힐링 테스트"],
    focusPoints: ["에너지 톤", "대인 인상", "현재 정서 컬러"],
  },
  {
    id: "ttest",
    slug: "ttest",
    title: "T 성향 검증 테스트",
    summary: "논리 중심 반응인지 공감 중심 반응인지 문항별로 비교하는 사고 성향 테스트",
    category: "재미",
    estimatedMinutes: 5,
    keywords: ["T 테스트", "F 테스트", "사고형 감정형", "MBTI 성향", "논리 공감 테스트"],
    focusPoints: ["판단 기준", "대화 반응 스타일", "문제 해결 우선순위"],
  },
  {
    id: "persona",
    slug: "persona",
    title: "페르소나 지수 테스트",
    summary: "겉으로 보이는 나와 내면의 나 사이 거리감을 확인하는 사회적 페르소나 테스트",
    category: "성격",
    estimatedMinutes: 4,
    keywords: ["페르소나 테스트", "겉과 속 테스트", "자아 성향", "사회성 심리", "성격 진단"],
    focusPoints: ["외부 페르소나", "내부 감정", "갭 지수"],
  },
  {
    id: "thriller",
    slug: "thriller",
    title: "스릴러 몰입 캐릭터 테스트",
    summary: "극한 상황 선택 문항으로 본능형/논리형/생존형 캐릭터를 분류하는 상황 대응 테스트",
    category: "재미",
    estimatedMinutes: 6,
    keywords: ["스릴러 테스트", "상황판단 테스트", "캐릭터 테스트", "심리 유형", "재미 심리테스트"],
    focusPoints: ["본능 vs 논리", "위기 대응", "의사결정 속도"],
  },
  {
    id: "office",
    slug: "office",
    title: "K-직장인 생존 테스트",
    summary: "메신저, 회식, 보고 상황에서 드러나는 직장 생존 스타일을 확인하는 직장 심리 테스트",
    category: "직장",
    estimatedMinutes: 4,
    keywords: ["직장인 테스트", "회사 심리테스트", "직장 생존", "직장 스트레스", "오피스 유형"],
    focusPoints: ["업무 대응 습관", "관계 스트레스", "생존 커뮤니케이션"],
  },
  {
    id: "seven",
    slug: "seven",
    title: "연애 매력 지수 테스트",
    summary: "스와이프 선택 기반으로 연애 매력 스타일과 호감 포인트를 점검하는 연애 성향 테스트",
    category: "연애",
    estimatedMinutes: 3,
    keywords: ["연애 테스트", "매력 테스트", "호감도 테스트", "연애 심리", "커플 성향"],
    focusPoints: ["호감 포인트", "매력 표현 방식", "관계 에너지"],
  },
  {
    id: "hsp",
    slug: "hsp",
    title: "HSP 예민도 테스트",
    summary: "소음, 자극, 감정 전이에 대한 민감도를 점검하는 고감도 성향(HSP) 체크 테스트",
    category: "힐링",
    estimatedMinutes: 4,
    keywords: ["HSP 테스트", "예민도 테스트", "감각 민감성", "심리 예민함", "힐링 심리"],
    focusPoints: ["감각 민감성", "정서 몰입도", "회복 루틴 필요도"],
  },
  {
    id: "tci",
    slug: "tci",
    title: "TCI 기질 계획 테스트",
    summary: "자극추구/위험회피/사회민감/인내력 축으로 계획 실행 스타일을 찾는 기질 테스트",
    category: "성격",
    estimatedMinutes: 5,
    keywords: ["TCI 테스트", "기질 검사", "계획 성향 테스트", "자기계발 심리", "성격 유형"],
    focusPoints: ["기질 프로파일", "실행 스타일", "맞춤 계획 전략"],
  },
  {
    id: "empathy",
    slug: "empathy",
    title: "공감 능력 테스트",
    summary: "인지 공감, 정서 공감, 행동 공감 축으로 대인 공감 스타일을 측정하는 테스트",
    category: "공감",
    estimatedMinutes: 5,
    keywords: ["공감 능력 테스트", "공감 유형", "대인관계 테스트", "심리 공감", "감정 이해"],
    focusPoints: ["인지 공감", "정서 공감", "행동 공감"],
  },
  {
    id: "mental",
    slug: "mental",
    title: "정신연령 테스트",
    summary: "생활 선택 문항으로 현재 사고 습관과 심리적 성숙도를 정신연령 관점으로 해석하는 테스트",
    category: "연령",
    estimatedMinutes: 4,
    keywords: ["정신연령 테스트", "심리 나이 테스트", "성숙도 테스트", "재미 심리검사", "연령 심리"],
    focusPoints: ["심리 연령대", "성숙도", "생활 가치관"],
  },
  {
    id: "romance",
    slug: "romance",
    title: "연애 추구미 테스트",
    summary: "연애에서 선호하는 무드와 커뮤니케이션 스타일을 영화 장르 감성으로 분류하는 테스트",
    category: "미학",
    estimatedMinutes: 5,
    keywords: ["연애 추구미 테스트", "연애 스타일 테스트", "썸 성향", "커플 심리", "로맨스 테스트"],
    focusPoints: ["연애 무드", "소통 취향", "관계 가치관"],
  },
];

export const PSYCHOTEST_HUB_KEYWORDS = [
  "심리테스트 모음",
  "무료 심리테스트",
  "성격 테스트",
  "연애 테스트",
  "직장인 테스트",
  "공감 능력 테스트",
  "HSP 테스트",
  "정신연령 테스트",
  "Code Destiny 심리테스트",
];

export function getPsychotestBySlug(slug: string) {
  return PSYCHOTESTS.find((item) => item.slug === slug);
}

export function getPsychotestById(id: string) {
  return PSYCHOTESTS.find((item) => item.id === id);
}

export function buildPsychotestExternalUrl(id: string) {
  const safeId = encodeURIComponent(id);
  return `${PSYCHOTEST_APP_BASE_URL}/?test=${safeId}&utm_source=code-destiny&utm_medium=seo&utm_campaign=psychotest_${safeId}`;
}
