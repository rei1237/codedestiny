const CHAPTER_DEFINITIONS = [
  {
    number: 1,
    roman: "I",
    title: "사주 원국 완전 해설 - 팔자 8글자의 비밀",
    subtitle: "출생 정보부터 천간·지지·지장간까지 원국 통합 해석",
    targetChars: 4500,
    sections: [
      "출생 정보와 사주팔자 기본 구성",
      "년주·월주·일주·시주의 의미",
      "천간·지지·지장간 구조 분석",
      "일간 중심의 전체 원국 해석",
    ],
  },
  {
    number: 2,
    roman: "II",
    title: "나의 설계도 - 월지·일간·조후와 기질의 뿌리",
    subtitle: "월지와 조후가 만드는 기질 구조와 환경 조건",
    targetChars: 3800,
    sections: [
      "일간의 본질과 월지의 영향력",
      "태어난 계절의 기운과 조후 상태",
      "한습·조열 및 온도·습도 분석",
      "나를 살리는 환경 조건",
    ],
  },
  {
    number: 3,
    roman: "III",
    title: "숨겨진 무기 - 용신·희신과 나만의 필살기",
    subtitle: "신강·신약과 용신 작동 조건 기반의 실전 전략",
    targetChars: 4200,
    sections: [
      "신강·신약 및 용신 후보 정리",
      "희신·기신·구신 판단",
      "용신이 작동/차단되는 조건",
      "현실 실행 전략",
    ],
  },
  {
    number: 4,
    roman: "IV",
    title: "대운 정밀 분석 - 인생의 큰 파도",
    subtitle: "대운 시작 시기와 생애 구간별 파도 해석",
    targetChars: 4200,
    sections: [
      "대운 흐름 전체 요약",
      "초년·청년·중년·장년·노년 분석",
      "각 대운의 천간·지지 작용",
      "대운별 실행 전략",
    ],
  },
  {
    number: 5,
    roman: "V",
    title: "격국과 사회적 소명 - 나의 성공 방정식",
    subtitle: "격국 성립과 사회적 역할을 연결한 성공 설계",
    targetChars: 3600,
    sections: [
      "월지 중심 격국 판단",
      "정격·변격·종격 가능성",
      "격국을 살리거나 무너뜨리는 기운",
      "사회적 소명과 성공 방정식",
    ],
  },
  {
    number: 6,
    roman: "VI",
    title: "관계의 전략 - 인연의 법칙과 파트너십",
    subtitle: "십성 기반 인연 법칙과 파트너십 운영 전략",
    targetChars: 3800,
    sections: [
      "비견·겁재·식상·재성·관성·인성 관계 분석",
      "귀인운과 협력운",
      "갈등·배신·손실 리스크",
      "장기 인연 유지 전략",
    ],
  },
  {
    number: 7,
    roman: "VII",
    title: "연애·결혼 완전 분석 - 사주가 말하는 나의 사랑",
    subtitle: "연애 패턴부터 결혼 안정 조건까지 종합 해석",
    targetChars: 4200,
    sections: [
      "연애 성향과 반복 패턴",
      "배우자궁 및 배우자운 분석",
      "결혼 후 갈등 요소",
      "사랑 장기 유지 전략",
    ],
  },
  {
    number: 8,
    roman: "VIII",
    title: "재물·직업 완전 전략 - 부의 그릇을 키우는 천기",
    subtitle: "재물 구조와 커리어 전략의 통합 로드맵",
    targetChars: 4300,
    sections: [
      "정재·편재 구조와 재물 그릇",
      "돈이 모이거나 새는 패턴",
      "직장형·사업형·프리랜서형 판단",
      "장기 재물/커리어 전략",
    ],
  },
  {
    number: 9,
    roman: "IX",
    title: "건강·심신 에너지 완전 분석 - 오행이 말하는 신체 지도",
    subtitle: "오행 과다·부족과 번아웃/회복 루틴 진단",
    targetChars: 3400,
    sections: [
      "오행별 신체 부위 분석",
      "과다/부족 오행 리스크",
      "스트레스·번아웃 패턴",
      "장기 심신 관리 전략",
    ],
  },
  {
    number: 10,
    roman: "X",
    title: "신살·12운성·퀀텀 명리 - 사주의 숨겨진 비밀 코드",
    subtitle: "길신·흉살·12운성의 숨은 신호와 특수 코드 해석",
    targetChars: 3600,
    sections: [
      "주요 신살 요약과 작용",
      "12운성 전체 흐름",
      "대운과 12운성 연결",
      "숨겨진 재능과 위험 신호",
    ],
  },
  {
    number: 11,
    roman: "XI",
    title: "2026 丙午年 실전 로드맵 - 12개월 행동 지침",
    subtitle: "병오년 세운 흐름과 월별 실전 의사결정",
    targetChars: 3400,
    sections: [
      "2026년 세운 총론",
      "원국과 세운의 합·충·형·파·해",
      "직업·재물·연애·건강 흐름",
      "1월~12월 행동 지침",
    ],
  },
  {
    number: 12,
    roman: "XII",
    title: "생애 마스터플랜 - 인생 전체의 운명 지도",
    subtitle: "생애 전 구간의 기회·위기·실행 계획 통합 설계",
    targetChars: 3500,
    sections: [
      "인생 전체 흐름 요약",
      "상승·위기 구간 분석",
      "직업·재물·관계·건강 장기 로드맵",
      "운명을 현실로 바꾸는 실행 계획",
    ],
  },
  {
    number: 13,
    roman: "XIII",
    title: "거장의 최종 전략 제언 - 나에게 주는 운명 사용 설명서",
    subtitle: "핵심 요약과 1년·10년 최종 전략 제안",
    targetChars: 3500,
    sections: [
      "사주 전체 핵심 요약",
      "강점·약점·핵심 과제",
      "성공/관계/직업/건강 최종 조언",
      "앞으로 1년·10년 실행 전략",
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
