const CHAPTER_DEFINITIONS = [
  {
    number: 1,
    id: "chapter_01_original_chart",
    roman: "I",
    title: "🌌 사주 원국 완전 해설 — 팔자 8글자의 비밀",
    subtitle: "팔자 8글자 구조와 인생 핵심 주제의 통합 해설",
    targetChars: 4200,
    sections: [
      "팔자 8글자 전체 구조 해설",
      "년주·월주·일주·시주의 역할과 인생 구간",
      "천간과 지지가 드러내는 겉모습과 내면",
      "일간을 중심으로 본 나의 핵심 자아",
      "원국 전체의 강점과 약점",
      "사주 원국이 반복해서 말하는 인생 주제",
    ],
  },
  {
    number: 2,
    id: "chapter_02_inner_design",
    roman: "II",
    title: "🏛️ 나의 설계도 — 월지·일간·조후와 기질의 뿌리",
    subtitle: "월지·일간·조후 관점의 기질 구조와 실전 활용",
    targetChars: 4200,
    sections: [
      "월지가 결정하는 기본 환경과 생존 방식",
      "일간이 보여주는 타고난 자아와 판단 방식",
      "조후 관점에서 본 내 삶의 온도와 균형",
      "계절감이 기질·감정·선택에 미치는 영향",
      "내가 편안함을 느끼는 환경과 불안정해지는 조건",
      "타고난 기질을 현실에서 잘 쓰는 방법",
    ],
  },
  {
    number: 3,
    id: "chapter_03_useful_god",
    roman: "III",
    title: "⚔️ 숨겨진 무기 — 용신·희신과 나만의 필살기",
    subtitle: "용신·희신·기신의 작동 원리와 선택 전략",
    targetChars: 4200,
    sections: [
      "용신의 의미와 내 사주에서 필요한 균형점",
      "희신이 도와주는 성장 방향",
      "기신·구신이 만드는 반복 실패 패턴",
      "나에게 유리한 선택 기준과 피해야 할 선택 기준",
      "직업·관계·돈에서 용신을 활용하는 방법",
      "위기 상황에서 다시 살아나는 나만의 필살기",
    ],
  },
  {
    number: 4,
    id: "chapter_04_daewoon",
    roman: "IV",
    title: "🌀 대운 정밀 분석 — 인생의 큰 파도",
    subtitle: "대운 흐름의 리듬, 전환기, 장기 전략",
    targetChars: 4200,
    sections: [
      "대운의 흐름과 인생 전체의 큰 리듬",
      "현재 대운이 나에게 요구하는 변화",
      "이전 대운에서 형성된 성향과 상처",
      "다음 대운에서 열리는 가능성과 준비점",
      "대운 전환기에 주의해야 할 선택",
      "대운을 활용한 장기 성장 전략",
    ],
  },
  {
    number: 5,
    id: "chapter_05_social_mission",
    roman: "V",
    title: "👑 격국과 사회적 소명 — 나의 성공 방정식",
    subtitle: "격국과 역할 적합성 기반의 성취 설계",
    targetChars: 4200,
    sections: [
      "격국 또는 핵심 구조로 본 사회적 역할",
      "내가 성과를 내기 쉬운 방식",
      "조직형·전문가형·창업형·프리랜서형 적성",
      "사회에서 인정받는 나만의 무기",
      "명예·평판·브랜드를 만드는 방식",
      "성공을 방해하는 구조적 약점과 보완 전략",
    ],
  },
  {
    number: 6,
    id: "chapter_06_relationship_strategy",
    roman: "VI",
    title: "🤝 관계의 전략 — 인연의 법칙과 파트너십",
    subtitle: "인연 패턴 분석과 관계 운영의 실전 기준",
    targetChars: 4200,
    sections: [
      "사주에서 드러나는 기본 인간관계 패턴",
      "나를 돕는 인연과 소모시키는 인연",
      "친구·동료·협업자와의 관계 전략",
      "가족과의 거리감과 정서적 과제",
      "갈등이 반복되는 이유와 조율법",
      "장기적으로 곁에 두어야 할 사람의 조건",
    ],
  },
  {
    number: 7,
    id: "chapter_07_love_marriage",
    roman: "VII",
    title: "💑 연애·결혼 완전 분석 — 사주가 말하는 나의 사랑",
    subtitle: "연애·결혼 구조와 지속 가능한 사랑 전략",
    targetChars: 4200,
    sections: [
      "내가 사랑에 빠지는 방식",
      "연애에서 반복되는 감정 패턴",
      "배우자운·연애운의 기본 구조",
      "나와 맞는 상대의 성향",
      "결혼 생활에서 중요한 현실 조건",
      "사랑을 오래 지키기 위한 관계 전략",
    ],
  },
  {
    number: 8,
    id: "chapter_08_money_career",
    roman: "VIII",
    title: "💰 재물·직업 완전 전략 — 부의 그릇을 키우는 천기",
    subtitle: "재물 흐름과 커리어 확장 전략의 통합",
    targetChars: 4200,
    sections: [
      "재물운의 기본 구조와 돈이 들어오는 방식",
      "직업운과 커리어 성장 방향",
      "사업·투자·부업에 대한 사주적 적성",
      "돈을 잃기 쉬운 패턴과 주의점",
      "재물 그릇을 키우는 현실 전략",
      "장기적으로 가장 유리한 수익 구조",
    ],
  },
  {
    number: 9,
    id: "chapter_09_health_energy",
    roman: "IX",
    title: "🏥 건강·심신 에너지 완전 분석 — 오행이 말하는 신체 지도",
    subtitle: "오행 기반의 생활 관리형 건강/에너지 가이드",
    targetChars: 4200,
    sections: [
      "오행 분포로 본 기본 체력과 에너지 흐름",
      "과다한 오행이 만드는 긴장과 소모",
      "부족한 오행이 만드는 취약 지점",
      "스트레스가 몸과 마음에 나타나는 방식",
      "생활 습관·수면·회복 루틴 조언",
      "장기적으로 관리해야 할 건강 키워드",
    ],
  },
  {
    number: 10,
    id: "chapter_10_hidden_codes",
    roman: "X",
    title: "🔮 신살·12운성·퀀텀 명리 — 사주의 숨겨진 비밀 코드",
    subtitle: "상징 해석과 현실 적용을 잇는 심화 파트",
    targetChars: 4200,
    sections: [
      "주요 신살이 보여주는 특별한 성향",
      "12운성으로 본 에너지의 성장 단계",
      "숨어 있는 매력·재능·고독의 코드",
      "반복되는 사건의 상징적 패턴",
      "직감·영감·운명의 전환 신호",
      "신살과 12운성을 현실적으로 활용하는 법",
    ],
  },
  {
    number: 11,
    id: "chapter_11_2026_roadmap",
    roman: "XI",
    title: "📅 2026 丙午年 실전 로드맵 — 12개월 행동 지침",
    subtitle: "병오년 월별 실행 지침과 연간 전략 총정리",
    targetChars: 9600,
    sections: [
      "2026년 병오년 전체 운세 총론",
      "2026년 커리어·일·성과 전략",
      "2026년 재물·지출·투자 주의점",
      "2026년 관계·연애·인맥 흐름",
      "1월 행동 지침",
      "2월 행동 지침",
      "3월 행동 지침",
      "4월 행동 지침",
      "5월 행동 지침",
      "6월 행동 지침",
      "7월 행동 지침",
      "8월 행동 지침",
      "9월 행동 지침",
      "10월 행동 지침",
      "11월 행동 지침",
      "12월 행동 지침",
      "2026년 반드시 피해야 할 선택",
      "2026년 반드시 잡아야 할 기회",
    ],
  },
  {
    number: 12,
    id: "chapter_12_life_masterplan",
    roman: "XII",
    title: "🌅 생애 마스터플랜 — 인생 전체의 운명 지도",
    subtitle: "생애 주기 관점의 장기 성장 전략",
    targetChars: 4200,
    sections: [
      "유년기·청년기·중년기·후반기의 큰 흐름",
      "인생에서 반복해서 주어지는 시험",
      "반드시 키워야 할 능력과 태도",
      "늦게 피는 운인지, 빠르게 치고 나가는 운인지",
      "인생 후반으로 갈수록 강해지는 요소",
      "장기 목표를 세우는 방식과 삶의 운영법",
    ],
  },
  {
    number: 13,
    id: "chapter_13_final_advice",
    roman: "XIII",
    title: "💌 거장의 최종 전략 제언 — 나에게 주는 운명 사용 설명서",
    subtitle: "최종 결론과 실행 중심 운명 운영 매뉴얼",
    targetChars: 5000,
    sections: [
      "이 사주가 가장 강하게 말하는 한 문장",
      "지금 당장 버려야 할 습관과 태도",
      "반드시 붙잡아야 할 재능과 방향",
      "인생을 바꾸기 위한 3가지 핵심 전략",
      "운이 약할 때 버티는 방법",
      "운이 강할 때 크게 치고 나가는 방법",
      "최종 조언 — 내 운명을 사용하는 법",
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
  id: chapter.id || `chapter-${String(chapter.number).padStart(2, "0")}`,
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
