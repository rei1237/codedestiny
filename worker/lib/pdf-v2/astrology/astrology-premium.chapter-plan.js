import { asArray, clean } from "./astrology-premium.types.js";

export const ASTROLOGY_PREMIUM_CHAPTER_PLAN_VERSION = "2026-astrology-chapter-plan-v2";

const chapters = [
  {
    id: "ch01",
    order: 1,
    title: "Ch.1 출생 차트 총론 — 영혼의 기본 설계도",
    purpose: "출생 차트 전체를 하나의 흐름으로 묶어 태양, 달, 상승궁, MC, 원소와 모달리티의 핵심 방향을 정리한다.",
    sections: ["차트의 첫인상", "태양·달·상승궁의 기본 구조", "원소와 모달리티의 전체 균형", "이번 생의 성장 방향"],
    groundingTerms: ["출생 차트", "태양", "달", "상승궁", "MC", "원소", "모달리티"],
  },
  {
    id: "ch02",
    order: 2,
    title: "Ch.2 태양·달·상승궁 — 나를 움직이는 세 개의 중심",
    purpose: "자아의 목적, 감정의 안정 조건, 세상에 드러나는 태도를 분리해 해석한다.",
    sections: ["태양이 비추는 삶의 목적", "달이 머무는 마음의 리듬", "상승궁이 여는 첫 번째 문", "세 중심이 함께 움직이는 방식"],
    groundingTerms: ["태양", "달", "상승궁", "하우스"],
  },
  {
    id: "ch03",
    order: 3,
    title: "Ch.3 12하우스 정밀 해석 — 삶의 무대와 사건의 영역",
    purpose: "하우스와 행성 배치를 통해 삶의 영역별 무대와 반복되는 사건의 결을 읽는다.",
    sections: ["1·2·3하우스의 개인 기반", "4·5·6하우스의 생활과 창조성", "7·8·9하우스의 관계와 확장", "10·11·12하우스의 사회성과 내면"],
    groundingTerms: ["1하우스", "2하우스", "4하우스", "7하우스", "10하우스", "12하우스", "행성"],
  },
  {
    id: "ch04",
    order: 4,
    title: "Ch.4 행성 배치 완전 해석 — 내 안의 열 가지 에너지",
    purpose: "개인 행성, 사회 행성, 세대 행성이 성향과 재능, 성장 과제에 어떻게 작용하는지 해석한다.",
    sections: ["개인 행성이 만드는 성향", "목성과 토성이 여는 성장 과제", "천왕성·해왕성·명왕성의 깊은 변화", "행성 배치를 현실에서 쓰는 법"],
    groundingTerms: ["수성", "금성", "화성", "목성", "토성", "천왕성", "해왕성", "명왕성"],
  },
  {
    id: "ch05",
    order: 5,
    title: "Ch.5 애스펙트 정밀 분석 — 재능과 긴장의 연결선",
    purpose: "주요 애스펙트의 조화와 긴장을 재능, 반복 패턴, 관계 반응으로 해석한다.",
    sections: ["가장 강한 조화각의 재능", "가장 강한 긴장각의 과제", "반복되는 내면 갈등", "긴장을 재능으로 바꾸는 전략"],
    groundingTerms: ["애스펙트", "트라인", "스퀘어", "오포지션", "컨정션", "섹스타일"],
  },
  {
    id: "ch06",
    order: 6,
    title: "Ch.6 원소와 모달리티 — 기질의 균형과 불균형",
    purpose: "불·흙·공기·물과 카디널·픽스드·뮤터블 균형을 통해 기질의 사용법을 정리한다.",
    sections: ["강하게 드러나는 원소", "부족하게 느껴지는 원소", "모달리티가 만드는 행동 리듬", "기질 균형을 회복하는 방법"],
    groundingTerms: ["원소", "불", "흙", "공기", "물", "모달리티", "카디널", "픽스드", "뮤터블"],
  },
  {
    id: "ch07",
    order: 7,
    title: "Ch.7 사랑과 관계 패턴 — 금성·화성·7하우스의 메시지",
    purpose: "금성, 화성, 달, 7하우스, 관계 애스펙트를 중심으로 사랑과 친밀감의 패턴을 해석한다.",
    sections: ["사랑을 시작하는 방식", "끌림과 욕망의 리듬", "관계에서 반복되는 패턴", "오래 가는 관계를 위한 조언"],
    groundingTerms: ["금성", "화성", "달", "7하우스", "디센던트", "애스펙트"],
  },
  {
    id: "ch08",
    order: 8,
    title: "Ch.8 일과 커리어 — 6하우스·10하우스·MC의 방향",
    purpose: "6하우스, 10하우스, MC, 태양, 토성을 기준으로 직업 방향과 사회적 역할을 해석한다.",
    sections: ["일상 업무에서 강해지는 재능", "MC가 가리키는 사회적 방향", "인정받는 방식과 책임", "커리어를 키우는 현실 전략"],
    groundingTerms: ["6하우스", "10하우스", "MC", "태양", "토성", "목성"],
  },
  {
    id: "ch09",
    order: 9,
    title: "Ch.9 돈과 자원 — 2하우스·8하우스의 현실 감각",
    purpose: "2하우스와 8하우스, 금성, 목성, 토성의 신호로 돈과 자원 관리 감각을 해석한다.",
    sections: ["내가 가치를 느끼는 기준", "돈을 벌고 지키는 방식", "공동 자원과 심리적 교환", "현실 감각을 키우는 재정 조언"],
    groundingTerms: ["2하우스", "8하우스", "금성", "목성", "토성", "자원"],
  },
  {
    id: "ch10",
    order: 10,
    title: "Ch.10 가족과 내면의 뿌리 — 4하우스와 달의 기억",
    purpose: "4하우스, 달, IC를 중심으로 가족 기억, 내면의 안정감, 회복의 기반을 해석한다.",
    sections: ["마음이 돌아가 쉬는 자리", "가족과 어린 시절의 흔적", "내면의 안전감을 회복하는 방법", "집과 사적인 삶의 리듬"],
    groundingTerms: ["4하우스", "달", "IC", "가족", "내면"],
  },
  {
    id: "ch11",
    order: 11,
    title: "Ch.11 건강과 생활 리듬 — 6하우스와 몸의 신호",
    purpose: "6하우스와 달, 화성, 토성을 중심으로 생활 리듬과 몸의 신호를 자기이해 관점에서 해석한다.",
    sections: ["생활 루틴이 무너지는 지점", "몸이 보내는 긴장 신호", "회복을 돕는 리듬", "무리하지 않는 자기관리 조언"],
    groundingTerms: ["6하우스", "달", "화성", "토성", "생활 리듬"],
  },
  {
    id: "ch12",
    order: 12,
    title: "Ch.12 트랜짓 흐름 — 현재 하늘이 여는 변화",
    purpose: "현재 주요 트랜짓이 출생 차트에 닿는 방식과 가까운 시기의 변화 주제를 해석한다.",
    sections: ["현재 강하게 작용하는 하늘의 신호", "가까운 시기의 기회", "조심해야 할 변화의 흐름", "트랜짓을 현실에서 활용하는 법"],
    groundingTerms: ["트랜짓", "목성", "토성", "천왕성", "해왕성", "명왕성"],
  },
  {
    id: "ch13",
    order: 13,
    title: "Ch.13 프로그레션과 솔라리턴 — 올해의 성장 지도",
    purpose: "프로그레션과 솔라리턴 자료가 제공된 범위 안에서 올해의 성장 방향을 신중하게 해석한다.",
    sections: ["프로그레션이 보여주는 내적 변화", "솔라리턴의 올해 분위기", "성장 과제가 열리는 영역", "올해를 살아가는 전략"],
    groundingTerms: ["프로그레션", "솔라리턴", "태양", "달", "하우스"],
  },
  {
    id: "ch14",
    order: 14,
    title: "Ch.14 생애 마스터플랜 — 전환점과 장기 전략",
    purpose: "출생 차트와 현재 흐름을 종합해 장기적인 선택 기준과 전환점 대응 전략을 제안한다.",
    sections: ["반복되는 인생의 큰 주제", "전환점에서 강해지는 선택", "3년 단위 장기 전략", "삶의 방향을 정렬하는 기준"],
    groundingTerms: ["출생 차트", "트랜짓", "목성", "토성", "MC", "하우스"],
  },
  {
    id: "ch15",
    order: 15,
    title: "Ch.15 점성술가의 최종 전략 제언",
    purpose: "전체 차트를 전문가의 최종 상담처럼 요약하고 실천 가능한 조언으로 마무리한다.",
    sections: ["차트가 남기는 핵심 메시지", "반드시 키워야 할 힘", "내려놓아야 할 습관", "지금부터의 실천 제언"],
    groundingTerms: ["점성술", "출생 차트", "태양", "달", "상승궁", "하우스", "애스펙트"],
  },
].map((chapter) => Object.freeze({
  ...chapter,
  required: true,
  minLength: 1800,
  sections: Object.freeze(chapter.sections),
  groundingTerms: Object.freeze(chapter.groundingTerms || []),
}));

export const astrologyPremiumChapterPlanV2 = Object.freeze({
  version: ASTROLOGY_PREMIUM_CHAPTER_PLAN_VERSION,
  serviceType: "astrology-premium",
  language: "ko",
  chapters: Object.freeze(chapters),
});

export const astrologyPremiumPublicChapters = Object.freeze(chapters.map((chapter) => Object.freeze({
  id: chapter.id,
  order: chapter.order,
  title: chapter.title,
  categories: Object.freeze(chapter.sections.map((title, index) => Object.freeze({
    id: `${chapter.id}_s${index + 1}`,
    title,
  }))),
})));

export function assertAstrologyPremiumChapterPlan(plan = astrologyPremiumChapterPlanV2) {
  if (!asArray(plan.chapters).length) {
    throw Object.assign(new Error("ASTROLOGY_CHAPTER_PLAN_EMPTY"), { code: "ASTROLOGY_CHAPTER_PLAN_EMPTY", status: 500 });
  }
  for (const chapter of plan.chapters) {
    if (!clean(chapter.id) || !clean(chapter.title) || !asArray(chapter.sections).length || !asArray(chapter.groundingTerms).length) {
      throw Object.assign(new Error(`ASTROLOGY_CHAPTER_INVALID:${clean(chapter.id)}`), {
        code: "ASTROLOGY_CHAPTER_INVALID",
        status: 500,
        chapterId: clean(chapter.id),
      });
    }
  }
  return true;
}

assertAstrologyPremiumChapterPlan();
