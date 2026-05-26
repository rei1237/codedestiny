const CHAPTER_DEFINITIONS = [
  {
    number: 1,
    roman: "I",
    title: "Ch.1 사주 원국 총론 - 내 인생의 기본 설계도",
    subtitle: "원국의 핵심 구조와 반복 신호를 통합 진단",
    targetChars: 4200,
    sections: [
      "1-1. 사주 전체의 첫인상",
      "1-2. 일간이 보여주는 나의 본질",
      "1-3. 월지가 보여주는 인생의 계절",
      "1-4. 원국에서 가장 강한 기운",
      "1-5. 원국에서 가장 부족한 기운",
      "1-6. 인생 전체를 관통하는 핵심 키워드",
    ],
  },
  {
    number: 2,
    roman: "II",
    title: "Ch.2 일간 심층 분석 - 나는 어떤 사람인가",
    subtitle: "일간 중심 성향, 강약, 생존 전략의 실전 해석",
    targetChars: 4200,
    sections: [
      "2-1. 일간의 기본 성향",
      "2-2. 강한 순간과 약해지는 순간",
      "2-3. 나의 자존심과 생존 방식",
      "2-4. 타고난 장점",
      "2-5. 반복되는 약점",
      "2-6. 일간 기준 실전 조언",
    ],
  },
  {
    number: 3,
    roman: "III",
    title: "Ch.3 오행 균형 분석 - 내 삶의 에너지 지도",
    subtitle: "오행 분포와 생활 전략의 연결",
    targetChars: 4200,
    sections: [
      "3-1. 목 기운의 작용",
      "3-2. 화 기운의 작용",
      "3-3. 토 기운의 작용",
      "3-4. 금 기운의 작용",
      "3-5. 수 기운의 작용",
      "3-6. 오행 균형을 맞추는 생활 전략",
    ],
  },
  {
    number: 4,
    roman: "IV",
    title: "Ch.4 십성 분석 - 재능, 관계, 욕망의 구조",
    subtitle: "십성 분포로 읽는 현실 행동 패턴",
    targetChars: 4200,
    sections: [
      "4-1. 비겁이 보여주는 자립성과 경쟁심",
      "4-2. 식상이 보여주는 표현력과 결과물",
      "4-3. 재성이 보여주는 돈과 현실 감각",
      "4-4. 관성이 보여주는 직업성과 책임",
      "4-5. 인성이 보여주는 학습과 내면 안정",
      "4-6. 십성 종합 조언",
    ],
  },
  {
    number: 5,
    roman: "V",
    title: "Ch.5 격국과 용신 - 운을 여는 핵심 키",
    subtitle: "격국 구조와 용희기신 작동 조건",
    targetChars: 4200,
    sections: [
      "5-1. 원국 구조와 격의 방향",
      "5-2. 용신이 필요한 이유",
      "5-3. 희신이 도와주는 방식",
      "5-4. 기신이 막히게 만드는 패턴",
      "5-5. 운이 열리는 선택과 막히는 선택",
      "5-6. 용신 기준 실전 전략",
    ],
  },
  {
    number: 6,
    roman: "VI",
    title: "Ch.6 직업과 재물 - 돈을 버는 방식과 성공 구조",
    subtitle: "재성·식상·관성 중심 커리어/재물 전략",
    targetChars: 4200,
    sections: [
      "6-1. 타고난 직업 성향",
      "6-2. 돈이 들어오는 방식",
      "6-3. 돈이 새어나가는 약점",
      "6-4. 사업형·조직형·프리랜서형 가능성",
      "6-5. 성과가 나는 환경",
      "6-6. 재물운을 키우는 실전 전략",
    ],
  },
  {
    number: 7,
    roman: "VII",
    title: "Ch.7 인간관계와 사랑 - 관계에서 반복되는 패턴",
    subtitle: "관계 신호와 연애 패턴의 현실 해석",
    targetChars: 4200,
    sections: [
      "7-1. 사람을 대하는 기본 태도",
      "7-2. 가까운 관계에서 드러나는 약점",
      "7-3. 연애에서 끌리는 사람",
      "7-4. 사랑에서 상처받는 지점",
      "7-5. 오래 가는 관계의 조건",
      "7-6. 관계운을 살리는 조언",
    ],
  },
  {
    number: 8,
    roman: "VIII",
    title: "Ch.8 가족·뿌리·내면 안정 - 내가 기대고 싶은 자리",
    subtitle: "가족/뿌리 신호와 정서 기반 재정비",
    targetChars: 4200,
    sections: [
      "8-1. 원국에서 보이는 가족·뿌리의 신호",
      "8-2. 보호받고 싶은 마음과 독립하려는 마음",
      "8-3. 어린 시절부터 반복된 심리 패턴",
      "8-4. 정서적 안정이 무너지는 순간",
      "8-5. 내가 진짜 쉴 수 있는 환경",
      "8-6. 내면 기반을 다시 세우는 방법",
    ],
  },
  {
    number: 9,
    roman: "IX",
    title: "Ch.9 건강과 마음의 습관 - 몸과 감정의 관리법",
    subtitle: "오행 불균형 기반의 소모/회복 루틴 진단",
    targetChars: 4200,
    sections: [
      "9-1. 원국에서 보이는 에너지 취약점",
      "9-2. 스트레스가 쌓이는 방식",
      "9-3. 번아웃이 오는 패턴",
      "9-4. 마음이 무너지는 순간",
      "9-5. 회복을 위한 생활 루틴",
      "9-6. 건강운 관리 조언",
    ],
  },
  {
    number: 10,
    roman: "X",
    title: "Ch.10 12운성과 인생 리듬 - 성장과 쇠퇴의 흐름",
    subtitle: "12운성 기반 리듬과 운영 전략",
    targetChars: 4200,
    sections: [
      "10-1. 12운성으로 보는 타고난 생명력",
      "10-2. 월주의 12운성이 보여주는 사회적 리듬",
      "10-3. 일주의 12운성이 보여주는 내면 리듬",
      "10-4. 시주의 12운성이 보여주는 후반부 흐름",
      "10-5. 내가 강해지는 시기와 약해지는 시기",
      "10-6. 12운성 기준 인생 운영 전략",
    ],
  },
  {
    number: 11,
    roman: "XI",
    title: "Ch.11 대운 흐름 - 인생의 큰 전환점",
    subtitle: "현재/다음 대운의 기회와 리스크 진단",
    targetChars: 4200,
    sections: [
      "11-1. 현재 대운의 핵심 의미",
      "11-2. 현재 대운에서 열리는 기회",
      "11-3. 현재 대운에서 조심해야 할 선택",
      "11-4. 다음 대운으로 넘어가는 준비",
      "11-5. 인생 후반부의 큰 방향",
      "11-6. 대운 활용 전략",
    ],
  },
  {
    number: 12,
    roman: "XII",
    title: "Ch.12 최종 인생 로드맵 - 앞으로의 선택 기준",
    subtitle: "전체 요약과 실행 중심 최종 전략",
    targetChars: 4200,
    sections: [
      "12-1. 사주 전체 핵심 요약",
      "12-2. 가장 강한 자원",
      "12-3. 가장 반복되는 약점",
      "12-4. 앞으로 강화해야 할 선택",
      "12-5. 피해야 할 선택",
      "12-6. 최종 실행 로드맵",
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
