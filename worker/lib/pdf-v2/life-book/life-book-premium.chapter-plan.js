import { asArray, clean } from "./life-book-premium.types.js";

export const lifeBookPremiumChapterPlanV1 = Object.freeze({
  version: "life-book-premium-13-chapter-v1",
  language: "ko",
  chapters: Object.freeze([
    {
      id: "01",
      order: 1,
      title: "사주 원국의 첫 인상과 삶의 기본 구조",
      sections: ["사주의 중심 기운", "일간이 드러내는 본성", "타고난 균형과 결핍", "삶을 여는 첫 번째 조언"],
      focus: ["사주 네 기둥", "일간", "원국의 첫 균형"],
      minLength: 900,
    },
    {
      id: "02",
      order: 2,
      title: "오행의 분포와 기질의 흐름",
      sections: ["강하게 흐르는 오행", "보완이 필요한 오행", "기질과 생활 리듬", "균형을 회복하는 방식"],
      focus: ["오행 분포", "강약", "생활 리듬"],
      minLength: 900,
    },
    {
      id: "03",
      order: 3,
      title: "십성으로 보는 관계와 선택 방식",
      sections: ["두드러지는 십성", "사람을 대하는 태도", "선택 앞에서 반복되는 패턴", "성숙하게 쓰는 힘"],
      focus: ["십성 분포", "관계 태도", "선택 습관"],
      minLength: 900,
    },
    {
      id: "04",
      order: 4,
      title: "대운이 여는 인생의 계절",
      sections: ["현재 대운의 분위기", "다음 대운의 전환점", "기회가 열리는 시기", "주의 깊게 다룰 흐름"],
      focus: ["대운", "전환기", "장기 흐름"],
      minLength: 900,
    },
    {
      id: "05",
      order: 5,
      title: "세운과 가까운 미래의 흐름",
      sections: ["올해의 중심 기운", "월별로 살필 변화", "현실적인 선택의 때", "흐름을 부드럽게 쓰는 법"],
      focus: ["세운", "월운", "분석 연도"],
      minLength: 900,
    },
    {
      id: "06",
      order: 6,
      title: "일과 재능이 열리는 방향",
      sections: ["타고난 재능의 결", "일에서 빛나는 방식", "피해야 할 소모", "커리어 전략"],
      focus: ["재능", "직업", "실행 방식"],
      minLength: 900,
    },
    {
      id: "07",
      order: 7,
      title: "재물운과 현실 감각",
      sections: ["재물의 들어오는 길", "지출과 축적의 습관", "돈을 다룰 때의 강점", "재물운을 안정시키는 선택"],
      focus: ["재성", "축적", "현실 감각"],
      minLength: 900,
    },
    {
      id: "08",
      order: 8,
      title: "연애와 관계의 반복 무늬",
      sections: ["끌림의 방식", "관계에서 드러나는 욕구", "반복되는 관계 과제", "좋은 인연을 지키는 태도"],
      focus: ["관계", "배우자성", "친밀감"],
      minLength: 900,
    },
    {
      id: "09",
      order: 9,
      title: "가족과 가까운 사람들 사이의 자리",
      sections: ["가정 안에서의 역할", "부모와 뿌리의 영향", "가까운 관계의 거리감", "마음을 덜 다치게 하는 선"],
      focus: ["가족", "뿌리", "정서적 거리"],
      minLength: 900,
    },
    {
      id: "10",
      order: 10,
      title: "건강과 생활 리듬",
      sections: ["몸이 보내는 신호", "마음의 긴장 패턴", "회복을 돕는 생활 리듬", "무리하지 않는 관리법"],
      focus: ["오행 균형", "조후", "회복 리듬"],
      minLength: 900,
    },
    {
      id: "11",
      order: 11,
      title: "인생의 전환점과 오래 남는 과제",
      sections: ["반복되는 전환의 징후", "크게 바뀌는 선택의 문", "넘어야 할 내면의 과제", "전환기를 건너는 법"],
      focus: ["전환점", "반복 과제", "성숙"],
      minLength: 900,
    },
    {
      id: "12",
      order: 12,
      title: "앞으로의 선택 연도와 실행 조언",
      sections: ["가까운 미래의 선택", "일과 관계의 우선순위", "월별 실행 감각", "현실적인 조언"],
      focus: ["선택 연도", "우선순위", "실행 조언"],
      minLength: 900,
    },
    {
      id: "13",
      order: 13,
      title: "인생의 책을 닫으며 남기는 마지막 조언",
      sections: ["전체 흐름의 핵심", "반복해서 기억할 문장", "삶을 지탱하는 기준", "다음 장을 여는 마음"],
      focus: ["통합 조언", "핵심 문장", "다음 선택"],
      minLength: 900,
    },
  ]),
});

export function assertLifeBookPremiumChapterPlan(plan = lifeBookPremiumChapterPlanV1) {
  const chapters = asArray(plan.chapters);
  if (chapters.length !== 13) {
    throw Object.assign(new Error("LIFE_BOOK_CHAPTER_PLAN_COUNT_INVALID"), { code: "LIFE_BOOK_CHAPTER_PLAN_COUNT_INVALID", status: 500 });
  }
  chapters.forEach((chapter, index) => {
    if (!clean(chapter.id) || !clean(chapter.title) || asArray(chapter.sections).length < 3) {
      throw Object.assign(new Error(`LIFE_BOOK_CHAPTER_PLAN_INVALID:${index + 1}`), { code: "LIFE_BOOK_CHAPTER_PLAN_INVALID", status: 500 });
    }
  });
  return true;
}
