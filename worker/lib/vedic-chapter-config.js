/**
 * Vedic Astrology Premium PDF - Chapter Configuration
 * 
 * 12개 챕터 메타데이터 + 검증 규칙
 * 각 챕터: 4000-4800 글자 목표
 * 전체: 54,000 글자 목표
 */

export const VEDIC_TOTAL_CHAPTERS = 12;
export const VEDIC_MIN_TOTAL_CHARS = 50000;
export const VEDIC_MIN_CHAPTER_CHARS = 4000;
export const VEDIC_MAX_CHAPTER_CHARS = 6000;

export const VEDIC_CHAPTER_CONFIG = [
  {
    num: 1,
    title: "라그나와 라그나 로드",
    subtitle: "성격, 기질, 신체 특징의 기초",
    icon: "🌅",
    minChars: 4200,
    sections: ["기본 특성", "라그나 해석", "라그나 로드 분석", "성격 영향", "실제 사례"],
  },
  {
    num: 2,
    title: "달의 별점 (나탁샤라)",
    subtitle: "정서적 기질과 내면의 욕구",
    icon: "🌙",
    minChars: 4200,
    sections: ["달의 위치", "27개 별점", "정서 패턴", "심리 특성", "행동 규칙"],
  },
  {
    num: 3,
    title: "태양의 거스",
    subtitle: "의지력, 자아실현, 자신감",
    icon: "☀️",
    minChars: 4000,
    sections: ["태양의 위치", "거스 분석", "리더십 스타일", "자아상", "활성화 방법"],
  },
  {
    num: 4,
    title: "행운의 목성",
    subtitle: "확장, 기회, 번영의 행성",
    icon: "🎲",
    minChars: 4000,
    sections: ["목성의 위치", "집 해석", "상 분석", "행운 유형", "활성화 기법"],
  },
  {
    num: 5,
    title: "제약의 토성",
    subtitle: "책임, 성숙, 시간의 교훈",
    icon: "⏳",
    minChars: 4200,
    sections: ["토성의 위치", "도전 과제", "성숙 경로", "제약 이해", "극복 전략"],
  },
  {
    num: 6,
    title: "노드의 운명",
    subtitle: "과거 업보와 미래 방향",
    icon: "🔮",
    minChars: 4200,
    sections: ["라후(북노드)", "케투(남노드)", "업보 분석", "영혼의 진화", "목표 달성"],
  },
  {
    num: 7,
    title: "7번 집과 파트너십",
    subtitle: "결혼, 관계, 협력",
    icon: "💑",
    minChars: 4000,
    sections: ["7번 집 로드", "금성 분석", "관계 패턴", "파트너 유형", "조화 방법"],
  },
  {
    num: 8,
    title: "달의 소수점(디비전)",
    subtitle: "심화 분석: 재정, 건강, 숨겨진 힘",
    icon: "🔬",
    minChars: 4400,
    sections: ["달의 나바마샤", "재정 분석", "건강 지표", "숨겨진 재능", "심화 해석"],
  },
  {
    num: 9,
    title: "다샤 주기 (예보)",
    subtitle: "현재와 미래 연대기",
    icon: "📅",
    minChars: 4200,
    sections: ["현재 다샤", "행성 기간", "예상 사건", "실행 기간", "준비 방법"],
  },
  {
    num: 10,
    title: "10번 집과 직업",
    subtitle: "커리어, 사명, 사회적 지위",
    icon: "💼",
    minChars: 4000,
    sections: ["10번 집 로드", "직업 방향", "사명감", "명성 경로", "성공 조건"],
  },
  {
    num: 11,
    title: "의료 지표 (아로그야)",
    subtitle: "건강, 에너지, 장수",
    icon: "⚕️",
    minChars: 4200,
    sections: ["건강 진단", "약한 영역", "예방법", "에너지 보충", "장수 규칙"],
  },
  {
    num: 12,
    title: "12개월 마스터 플랜",
    subtitle: "올해 행동 전략 & 90일 실행",
    icon: "🧭",
    minChars: 4400,
    sections: ["월별 다샤 영향", "분기별 전략", "12개월 로드맵", "90일 액션 테이블", "핵심 3가지"],
  },
];

/**
 * 검증: 챕터별 품질 확인
 */
export function validateVedicChapter(chapterNum, text) {
  const config = VEDIC_CHAPTER_CONFIG[chapterNum - 1];
  if (!config) return { ok: false, error: `Invalid chapter: ${chapterNum}` };

  const textLen = String(text || "").length;
  if (textLen < config.minChars) {
    return {
      ok: false,
      error: `Insufficient text length: ${textLen} < ${config.minChars}`,
      length: textLen,
      required: config.minChars,
    };
  }

  return { ok: true, length: textLen, config };
}

/**
 * 전체 PDF 검증
 */
export function validateVedicFullReport(chapters) {
  const totalChars = Object.values(chapters || {})
    .reduce((sum, text) => sum + String(text || "").length, 0);

  const shortChapters = [];
  for (let i = 1; i <= VEDIC_TOTAL_CHAPTERS; i++) {
    const validation = validateVedicChapter(i, chapters[i]);
    if (!validation.ok) {
      shortChapters.push(i);
    }
  }

  return {
    ok: totalChars >= VEDIC_MIN_TOTAL_CHARS && shortChapters.length === 0,
    totalChars,
    minRequired: VEDIC_MIN_TOTAL_CHARS,
    shortChapters,
  };
}

/**
 * 챕터별 메타데이터 조회
 */
export function getVedicChapterConfig(num) {
  return VEDIC_CHAPTER_CONFIG[num - 1] || null;
}
