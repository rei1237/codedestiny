/**
 * Love Secret (연애 비책) Premium PDF - Chapter Configuration
 * 
 * 13개 챕터 (개인/커플/보조 모드 동일 구조)
 * 13 chapters, 52,000 chars 목표
 */

export const LOVE_SECRET_TOTAL_CHAPTERS = 13;
export const LOVE_SECRET_MIN_TOTAL_CHARS = 50000;
export const LOVE_SECRET_MIN_CHAPTER_CHARS = 3500;
export const LOVE_SECRET_MAX_CHAPTER_CHARS = 5200;

export const LOVE_SECRET_MODES = ["personal", "couple", "support"];

export const LOVE_SECRET_CHAPTER_CONFIG = [
  {
    num: 1,
    title: "나의 사랑 에너지",
    subtitle: "로맨틱한 자질과 매력의 원천",
    icon: "💕",
    minChars: 3800,
    sections: ["사랑의 기질", "매력", "표현 방식", "강점", "개선점"],
  },
  {
    num: 2,
    title: "감정의 풍경",
    subtitle: "내면의 정서 세계와 안정감의 원천",
    icon: "🌊",
    minChars: 3800,
    sections: ["정서 기질", "안정감", "취약점", "표현", "조절"],
  },
  {
    num: 3,
    title: "커뮤니케이션 스타일",
    subtitle: "사랑하는 사람과의 대화 패턴",
    icon: "💬",
    minChars: 3700,
    sections: ["표현 방식", "청취 방식", "갈등 소통", "개선", "팁"],
  },
  {
    num: 4,
    title: "욕망과 친밀감",
    subtitle: "신체적·정서적 친밀함의 차원",
    icon: "✨",
    minChars: 3800,
    sections: ["욕망 스타일", "친밀감 추구", "경계", "표현", "조화"],
  },
  {
    num: 5,
    title: "행동과 노력",
    subtitle: "사랑을 실현하기 위한 적극적 행동",
    icon: "🎯",
    minChars: 3700,
    sections: ["행동력", "노력 방향", "장애물", "동기", "실행"],
  },
  {
    num: 6,
    title: "행운과 만남",
    subtitle: "좋은 관계를 만나는 운과 조건",
    icon: "🌟",
    minChars: 3800,
    sections: ["만남의 운", "적합도", "조건", "타이밍", "기회"],
  },
  {
    num: 7,
    title: "파트너십의 구조",
    subtitle: "장기 관계의 기초와 패턴",
    icon: "🤝",
    minChars: 3900,
    sections: ["관계 구조", "역할 분담", "동역학", "안정성", "성장"],
  },
  {
    num: 8,
    title: "깊이와 변환",
    subtitle: "관계의 심화와 영혼의 연결",
    icon: "🔮",
    minChars: 3900,
    sections: ["심화 과정", "영혼 연결", "변환", "통합", "성숙"],
  },
  {
    num: 9,
    title: "거리와 경계",
    subtitle: "건강한 개인성과 독립성 유지",
    icon: "🎭",
    minChars: 3800,
    sections: ["자기 보호", "독립성", "경계 설정", "개인 공간", "균형"],
  },
  {
    num: 10,
    title: "커리어와 사랑",
    subtitle: "일과 관계의 조화",
    icon: "⚖️",
    minChars: 3800,
    sections: ["우선순위", "시간 관리", "지원", "경쟁", "통합"],
  },
  {
    num: 11,
    title: "운명의 시간표",
    subtitle: "관계의 중요 전환점과 타이밍",
    icon: "⏰",
    minChars: 3900,
    sections: ["주기", "전환점", "위기", "성장 기회", "준비"],
  },
  {
    num: 12,
    title: "사랑의 마스터플랜",
    subtitle: "3개월·1년·5년 로드맵",
    icon: "🗺️",
    minChars: 4000,
    sections: ["3개월", "1년", "5년", "90일 액션", "핵심 목표"],
  },
  {
    num: 13,
    title: "영혼의 서약",
    subtitle: "진정한 사랑을 위한 다짐",
    icon: "💎",
    minChars: 3900,
    sections: ["자기 선언", "성장 다짐", "사랑의 정의", "행동 약속", "축복"],
  },
];

export function validateLoveSecretChapter(chapterNum, text, mode = "personal") {
  const config = LOVE_SECRET_CHAPTER_CONFIG[chapterNum - 1];
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

export function validateLoveSecretFullReport(chapters, mode = "personal") {
  const totalChars = Object.values(chapters || {})
    .reduce((sum, text) => sum + String(text || "").length, 0);

  const shortChapters = [];
  for (let i = 1; i <= LOVE_SECRET_TOTAL_CHAPTERS; i++) {
    const validation = validateLoveSecretChapter(i, chapters[i], mode);
    if (!validation.ok) {
      shortChapters.push(i);
    }
  }

  return {
    ok: totalChars >= LOVE_SECRET_MIN_TOTAL_CHARS && shortChapters.length === 0,
    totalChars,
    minRequired: LOVE_SECRET_MIN_TOTAL_CHARS,
    shortChapters,
    mode,
  };
}

export function getLoveSecretChapterConfig(num) {
  return LOVE_SECRET_CHAPTER_CONFIG[num - 1] || null;
}
