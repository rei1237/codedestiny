const CHAPTER_DEFINITIONS = [
  {
    number: 1,
    roman: "I",
    title: "사주 원국 완전 해설 - 팔자 8글자의 비밀",
    subtitle: "년주·월주·일주·시주와 일간의 통합 해석",
    targetChars: 4500,
    sections: [
      "사주 전체 인상",
      "년주·월주·일주·시주의 역할",
      "일간 중심 해석",
      "원국의 핵심 한 문장",
    ],
  },
  {
    number: 2,
    roman: "II",
    title: "나의 설계도 - 월지·일간·조후와 기질의 뿌리",
    subtitle: "월지 환경과 조후를 중심으로 한 적응 전략",
    targetChars: 3800,
    sections: [
      "월지로 보는 삶의 환경",
      "계절과 조후",
      "일간과 월지의 관계",
      "기질의 장점과 그림자",
    ],
  },
  {
    number: 3,
    roman: "III",
    title: "숨겨진 무기 - 용신·희신과 나만의 필살기",
    subtitle: "용신 방향성 기반의 현실 선택 설계",
    targetChars: 4200,
    sections: [
      "용신적 방향성",
      "나를 살리는 선택",
      "피해야 할 패턴",
      "실전 활용법",
    ],
  },
  {
    number: 4,
    roman: "IV",
    title: "대운 정밀 분석 - 인생의 큰 파도",
    subtitle: "10년 주기 흐름과 시기별 전략",
    targetChars: 4200,
    sections: [
      "대운의 전체 흐름",
      "상승기와 준비기",
      "관계·직업·재물의 변화점",
      "대운을 활용하는 법",
    ],
  },
  {
    number: 5,
    roman: "V",
    title: "격국과 사회적 소명 - 나의 성공 방정식",
    subtitle: "격국과 사회적 작동 방식의 결합 해석",
    targetChars: 3600,
    sections: [
      "격국 또는 사주 구조 판단",
      "내가 인정받는 방식",
      "성공을 막는 내부 패턴",
      "사회적 소명",
    ],
  },
  {
    number: 6,
    roman: "VI",
    title: "관계의 전략 - 인연의 법칙과 파트너십",
    subtitle: "인간관계 작동 원리와 회복 시나리오",
    targetChars: 3800,
    sections: [
      "인간관계 기본 성향",
      "귀인과 악연 패턴",
      "협업과 거리두기",
      "관계 회복법",
    ],
  },
  {
    number: 7,
    roman: "VII",
    title: "연애·결혼 완전 분석 - 사주가 말하는 나의 사랑",
    subtitle: "연애 본능과 관계 안정 전략",
    targetChars: 4200,
    sections: [
      "연애 본능",
      "배우자/연인상",
      "반복되는 연애 문제",
      "좋은 사랑을 만드는 전략",
    ],
  },
  {
    number: 8,
    roman: "VIII",
    title: "재물·직업 완전 전략 - 부의 그릇을 키우는 천기",
    subtitle: "수익 구조와 직업 전략의 통합 설계",
    targetChars: 4300,
    sections: [
      "재물 그릇",
      "직업 적성",
      "사업·프리랜서·조직 생활 적합성",
      "돈을 키우는 실전 전략",
    ],
  },
  {
    number: 9,
    roman: "IX",
    title: "건강·심신 에너지 완전 분석 - 오행으로 보는 회복법",
    subtitle: "오행 균형과 번아웃 회복 루틴",
    targetChars: 3400,
    sections: [
      "오행 균형과 에너지 패턴",
      "번아웃 패턴",
      "생활 습관 제안",
      "회복 루틴",
    ],
  },
  {
    number: 10,
    roman: "X",
    title: "가족·뿌리·내면 아이 - 내가 짊어진 오래된 이야기",
    subtitle: "가족 영향과 독립 과제의 현실 해석",
    targetChars: 3600,
    sections: [
      "가족과의 인연 구조",
      "인정 욕구와 결핍",
      "독립의 과제",
      "내면 회복 문장",
    ],
  },
  {
    number: 11,
    roman: "XI",
    title: "인생의 위기와 전환점 - 무너질 때 다시 서는 법",
    subtitle: "위기 신호 분석과 현실 대응 전략",
    targetChars: 3400,
    sections: [
      "위기가 오는 패턴",
      "반복되는 선택 실수",
      "전환점의 신호",
      "위기 대응 전략",
    ],
  },
  {
    number: 12,
    roman: "XII",
    title: "나만의 성공 루틴 - 운을 현실로 바꾸는 실행법",
    subtitle: "하루 루틴부터 1년 계획까지 실행 설계",
    targetChars: 3500,
    sections: [
      "사주에 맞는 하루 루틴",
      "일의 우선순위",
      "관계 관리 루틴",
      "장기 프로젝트 운영법",
    ],
  },
  {
    number: 13,
    roman: "XIII",
    title: "최종 운명 선언문 - 내 삶을 다시 쓰는 문장",
    subtitle: "핵심 구조 압축과 개인 맞춤 선언",
    targetChars: 3500,
    sections: [
      "전체 사주의 핵심 요약",
      "앞으로의 인생 방향",
      "버려야 할 것과 지켜야 할 것",
      "개인 맞춤 선언문",
    ],
  },
];

function clampMinLength(targetChars) {
  const target = Number(targetChars || 0);
  if (!Number.isFinite(target) || target <= 0) return 2500;
  return Math.max(2200, Math.floor(target * 0.85));
}

export const LIFE_BOOK_CHAPTERS = CHAPTER_DEFINITIONS.map((chapter) => ({
  ...chapter,
  id: `chapter-${String(chapter.number).padStart(2, "0")}`,
  minLength: clampMinLength(chapter.targetChars),
  focusAreas: Array.isArray(chapter.sections) ? chapter.sections : [],
  promptGuide: `${chapter.title}의 관점에서 세부 카테고리를 모두 포함해 작성하고, 중복 없이 실전 전략으로 연결합니다.`,
  requiredCoverage: Array.isArray(chapter.sections) ? chapter.sections : [],
}));

export const LIFE_BOOK_TOTAL_CHAPTERS = LIFE_BOOK_CHAPTERS.length;
export const LIFE_BOOK_TARGET_TOTAL_CHARS = LIFE_BOOK_CHAPTERS.reduce(
  (sum, chapter) => sum + Number(chapter.targetChars || 0),
  0,
);
export const LIFE_BOOK_MIN_TOTAL_CHARS = 48000;

export function getLifeBookChapterByNumber(chapterNumber) {
  const chapter = Number(chapterNumber || 1);
  if (!Number.isFinite(chapter)) return LIFE_BOOK_CHAPTERS[0];
  return LIFE_BOOK_CHAPTERS[Math.max(0, Math.min(LIFE_BOOK_CHAPTERS.length - 1, Math.floor(chapter) - 1))];
}

export function buildLifeBookChapterPlan() {
  return LIFE_BOOK_CHAPTERS.map((chapter, index) => ({
    num: index + 1,
    number: Number(chapter.number || index + 1),
    id: chapter.id,
    roman: chapter.roman,
    title: chapter.title,
    subtitle: chapter.subtitle,
    minLength: chapter.minLength,
    targetChars: chapter.targetChars,
    sections: chapter.sections,
  }));
}
