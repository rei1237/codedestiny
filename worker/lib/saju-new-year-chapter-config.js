/**
 * Saju NewYear (신년운세) Premium PDF - Chapter Configuration
 * 
 * 월별(1~12) 신년운세 + 1~3월 상세 분석
 * 12 chapters, 48,000 chars 목표
 */

export const SAJU_NEWYEAR_TOTAL_CHAPTERS = 12;
export const SAJU_NEWYEAR_MIN_TOTAL_CHARS = 45000;
export const SAJU_NEWYEAR_MIN_CHAPTER_CHARS = 3500;
export const SAJU_NEWYEAR_MAX_CHAPTER_CHARS = 5000;

export const SAJU_NEWYEAR_CHAPTER_CONFIG = [
  {
    num: 1,
    month: "1월",
    title: "신년의 포문",
    subtitle: "새로운 12개월의 시작, 운세 큰 그림 파악",
    icon: "🎯",
    minChars: 4000,
    sections: ["년운 종합", "분기별 테마", "월별 강약", "주의점", "기회"],
  },
  {
    num: 2,
    month: "2월",
    title: "관계와 새로운 만남",
    subtitle: "설 기간, 인간관계 재정리와 새로운 연결",
    icon: "🤝",
    minChars: 3800,
    sections: ["관계 운", "만남 운", "적합도", "주의사항", "활용법"],
  },
  {
    num: 3,
    month: "3월",
    title: "봄의 에너지와 변화",
    subtitle: "1사분기 마무리, 봄 에너지 활용 전략",
    icon: "🌸",
    minChars: 4200,
    sections: ["분기 회고", "봄 에너지", "변화 준비", "기회", "주의"],
  },
  {
    num: 4,
    month: "4월",
    title: "새로운 시작의 계절",
    subtitle: "2사분기 시작, 활동 본격화",
    icon: "🌱",
    minChars: 3800,
    sections: ["시작 운", "활동 운", "진행 과제", "성공 조건", "장애물"],
  },
  {
    num: 5,
    month: "5월",
    title: "활동과 성과의 달",
    subtitle: "에너지 최고조, 결과 가시화 시기",
    icon: "⚡",
    minChars: 3800,
    sections: ["활동 운", "성과", "금재운", "대인관계", "건강"],
  },
  {
    num: 6,
    month: "6월",
    title: "정산과 재조정",
    subtitle: "상반기 마무리, 하반기 준비",
    icon: "⚖️",
    minChars: 3800,
    sections: ["상반기 평가", "조정점", "휴식", "재시작 준비", "기회"],
  },
  {
    num: 7,
    month: "7월",
    title: "여름의 열정과 도전",
    subtitle: "3사분기 시작, 큰 변화의 시기",
    icon: "🔥",
    minChars: 3900,
    sections: ["열정 운", "도전 운", "기회와 위험", "대응법", "결과"],
  },
  {
    num: 8,
    month: "8월",
    title: "내재적 성장",
    subtitle: "여름 한중간, 자기계발과 내면 강화",
    icon: "🌙",
    minChars: 3800,
    sections: ["성장 운", "학습", "내면 강화", "관계 심화", "권고사항"],
  },
  {
    num: 9,
    month: "9월",
    title: "가을의 풍요와 정리",
    subtitle: "3사분기 마무리, 수확 시기",
    icon: "🍂",
    minChars: 3900,
    sections: ["수확 운", "성과 정산", "정리 기간", "준비", "감사"],
  },
  {
    num: 10,
    month: "10월",
    title: "결정과 도약",
    subtitle: "4사분기 시작, 중요한 의사결정 시기",
    icon: "🎪",
    minChars: 3900,
    sections: ["결정 운", "도약", "중요 결정", "주의점", "기회"],
  },
  {
    num: 11,
    month: "11월",
    title: "마무리와 감사",
    subtitle: "연말 준비, 올해를 정리하는 시기",
    icon: "🙏",
    minChars: 3800,
    sections: ["종결 운", "감사", "정산", "내년 준비", "반성"],
  },
  {
    num: 12,
    month: "12월",
    title: "새로운 시작을 향한 준비",
    subtitle: "연말 총정리, 내년 다짐",
    icon: "🎄",
    minChars: 4000,
    sections: ["종결", "축하", "내년 계획", "영적 갱신", "다짐"],
  },
];

export function validateSajuNewYearChapter(chapterNum, text) {
  const config = SAJU_NEWYEAR_CHAPTER_CONFIG[chapterNum - 1];
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

export function validateSajuNewYearFullReport(chapters) {
  const totalChars = Object.values(chapters || {})
    .reduce((sum, text) => sum + String(text || "").length, 0);

  const shortChapters = [];
  for (let i = 1; i <= SAJU_NEWYEAR_TOTAL_CHAPTERS; i++) {
    const validation = validateSajuNewYearChapter(i, chapters[i]);
    if (!validation.ok) {
      shortChapters.push(i);
    }
  }

  return {
    ok: totalChars >= SAJU_NEWYEAR_MIN_TOTAL_CHARS && shortChapters.length === 0,
    totalChars,
    minRequired: SAJU_NEWYEAR_MIN_TOTAL_CHARS,
    shortChapters,
  };
}

export function getSajuNewYearChapterConfig(num) {
  return SAJU_NEWYEAR_CHAPTER_CONFIG[num - 1] || null;
}
