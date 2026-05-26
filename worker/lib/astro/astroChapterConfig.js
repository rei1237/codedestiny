// ============================================================
// Astro Western Premium - Chapter Configuration
// ============================================================

export const ASTRO_CHAPTER_META = [
  {
    num: 1,
    title: "페르소나와 존재의 핵",
    subtitle: "ASC·Sun·Moon의 입체적 결합",
    icon: "🌌",
    minChars: 3000,
  },
  {
    num: 2,
    title: "감정의 뿌리",
    subtitle: "Moon & 4하우스",
    icon: "🌊",
    minChars: 2500,
  },
  {
    num: 3,
    title: "인지 체계와 정보의 연금술",
    subtitle: "Mercury & 3·9하우스",
    icon: "🧠",
    minChars: 2800,
  },
  {
    num: 4,
    title: "욕망의 미학과 가치 자산",
    subtitle: "Venus & 2·7하우스",
    icon: "💎",
    minChars: 2800,
  },
  {
    num: 5,
    title: "추진력과 갈등 처리",
    subtitle: "Mars & 1·8하우스",
    icon: "⚡",
    minChars: 2600,
  },
  {
    num: 6,
    title: "확장과 행운의 문",
    subtitle: "Jupiter & 9·11하우스",
    icon: "🪐",
    minChars: 2600,
  },
  {
    num: 7,
    title: "한계와 성취의 구조",
    subtitle: "Saturn & 10하우스",
    icon: "🏛️",
    minChars: 2800,
  },
  {
    num: 8,
    title: "관계와 계약의 지도",
    subtitle: "7하우스와 주요 에스펙트",
    icon: "🤝",
    minChars: 3000,
  },
  {
    num: 9,
    title: "상처와 회복 코드",
    subtitle: "Chiron·12하우스 그림자",
    icon: "🕯️",
    minChars: 2600,
  },
  {
    num: 10,
    title: "노드와 영혼의 목적",
    subtitle: "North Node/South Node",
    icon: "☊",
    minChars: 2800,
  },
  {
    num: 11,
    title: "트랜짓 운세 전략",
    subtitle: "현재 행성 흐름 적용",
    icon: "📡",
    minChars: 2800,
  },
  {
    num: 12,
    title: "마스터 플랜",
    subtitle: "12개월 실행 로드맵",
    icon: "📜",
    minChars: 3500,
  },
  {
    num: 13,
    title: "90일 현실 전환 플랜",
    subtitle: "관계·커리어·재정 실천 설계",
    icon: "🧭",
    minChars: 3000,
  },
];

export const ASTRO_TOTAL_CHAPTERS = ASTRO_CHAPTER_META.length;
export const ASTRO_MIN_TOTAL_CHARS = 35000;

export function getAstroChapterByNumber(num) {
  return ASTRO_CHAPTER_META[num - 1] || ASTRO_CHAPTER_META[0];
}

export function validateAstroChapter(chapter, text) {
  const errors = [];
  const warnings = [];
  const length = [...String(text || "")].length;

  if (length < ASTRO_CHAPTER_META[chapter - 1]?.minChars || 0) {
    errors.push(`chapter ${chapter} too short: ${length} < ${ASTRO_CHAPTER_META[chapter - 1]?.minChars}`);
  }

  return { ok: errors.length === 0, length, errors, warnings };
}
