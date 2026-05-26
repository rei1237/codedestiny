/**
 * Sukuyo (숙요점) Premium PDF - Chapter Configuration
 * 
 * 27개 별점 기반 12개 챕터 + 커플 모드
 * 개인: 12 chapters, 52,800 chars
 * 커플: 12 chapters, 48,000 chars
 */

export const SUKUYO_TOTAL_CHAPTERS = 12;
export const SUKUYO_MIN_TOTAL_CHARS_PERSONAL = 48000;
export const SUKUYO_MIN_TOTAL_CHARS_COMPAT = 45000;
export const SUKUYO_MIN_CHAPTER_CHARS = 3800;
export const SUKUYO_MAX_CHAPTER_CHARS = 5600;

export const SUKUYO_CHAPTER_CONFIG = [
  {
    num: 1,
    title: "영혼의 원형",
    subtitle: "당신의 숙요별이 새긴 운명 코드",
    icon: "🌙",
    minChars: 4000,
    sections: ["27수 원형", "무의식 반응", "반복 패턴", "재능 사용 조건", "그림자"],
  },
  {
    num: 2,
    title: "감정의 조수간만",
    subtitle: "달의 주기가 만들어내는 정서 파동",
    icon: "🌊",
    minChars: 4200,
    sections: ["초승", "상현", "보름", "하현", "그믐"],
  },
  {
    num: 3,
    title: "페르소나와 브랜딩",
    subtitle: "세상이 당신을 기억하는 방식",
    icon: "💎",
    minChars: 4000,
    sections: ["첫인상", "외부 평판", "브랜드 언어", "기대치", "예시"],
  },
  {
    num: 4,
    title: "자산의 중력",
    subtitle: "부를 끌어당기는 달빛 전략",
    icon: "💰",
    minChars: 4200,
    sections: ["수익 패턴", "누수 패턴", "손실 회피", "운영 루틴", "전략"],
  },
  {
    num: 5,
    title: "보이지 않는 톱니바퀴",
    subtitle: "성공 뒤에 숨겨진 협력 역학",
    icon: "⚙️",
    minChars: 4000,
    sections: ["강점 역할", "충돌 트리거", "조정 대화", "상황 예시", "가이드"],
  },
  {
    num: 6,
    title: "관계의 정밀 레이더",
    subtitle: "안괴·성쇠·우친 방향성과 거리",
    icon: "📡",
    minChars: 4400,
    sections: ["관계 축", "거리값", "방향성", "역할 명시", "전략"],
  },
  {
    num: 7,
    title: "파괴적 혁신",
    subtitle: "위기를 기회로 전환하는 전략",
    icon: "⚡",
    minChars: 4200,
    sections: ["위기 구간", "감정 폭주", "혁신 동력", "단계형 전환", "사례"],
  },
  {
    num: 8,
    title: "조화로운 성장",
    subtitle: "나를 살리는 공간과 환경의 법칙",
    icon: "🌿",
    minChars: 4000,
    sections: ["공간 설계", "수면 리듬", "식사 패턴", "이동 리듬", "실행"],
  },
  {
    num: 9,
    title: "정서적 유대",
    subtitle: "깊은 연결을 만드는 감정 지능",
    icon: "❤️",
    minChars: 4200,
    sections: ["친밀감 형성", "오해 누적", "회복 대화", "유지 지침", "사례"],
  },
  {
    num: 10,
    title: "운명적 거리",
    subtitle: "가까이해야 할 것과 멀리해야 할 것",
    icon: "🔍",
    minChars: 4000,
    sections: ["거리 조절", "에너지 경계", "귀인 구분", "관계 선택", "실행"],
  },
  {
    num: 11,
    title: "달의 주기",
    subtitle: "월령 에너지 사이클 완전 공략",
    icon: "📊",
    minChars: 4400,
    sections: ["5단계", "초승", "상현", "보름", "하현", "그믐", "전략"],
  },
  {
    num: 12,
    title: "영혼의 마스터플랜",
    subtitle: "달빛 전략가의 10년 로드맵",
    icon: "🧭",
    minChars: 4400,
    sections: ["1년 계획", "3년 계획", "10년 비전", "90일 액션", "핵심 3가지"],
  },
];

/**
 * 검증 함수들
 */
export function validateSukuyoChapter(chapterNum, text, mode = "personal") {
  const config = SUKUYO_CHAPTER_CONFIG[chapterNum - 1];
  if (!config) return { ok: false, error: `Invalid chapter: ${chapterNum}` };

  const textLen = String(text || "").length;
  if (textLen < config.minChars) {
    return {
      ok: false,
      error: `Insufficient text: ${textLen} < ${config.minChars}`,
      length: textLen,
      required: config.minChars,
    };
  }

  return { ok: true, length: textLen, config };
}

export function validateSukuyoFullReport(chapters, mode = "personal") {
  const minChars = mode === "personal" ? SUKUYO_MIN_TOTAL_CHARS_PERSONAL : SUKUYO_MIN_TOTAL_CHARS_COMPAT;
  const totalChars = Object.values(chapters || {})
    .reduce((sum, text) => sum + String(text || "").length, 0);

  const shortChapters = [];
  for (let i = 1; i <= SUKUYO_TOTAL_CHAPTERS; i++) {
    const validation = validateSukuyoChapter(i, chapters[i], mode);
    if (!validation.ok) {
      shortChapters.push(i);
    }
  }

  return {
    ok: totalChars >= minChars && shortChapters.length === 0,
    totalChars,
    minRequired: minChars,
    shortChapters,
    mode,
  };
}

export function getSukuyoChapterConfig(num) {
  return SUKUYO_CHAPTER_CONFIG[num - 1] || null;
}
