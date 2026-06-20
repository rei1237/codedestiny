import { asArray, clean } from "./soul-origin-premium.types.js";

export const soulOriginChapterPlanV1 = Object.freeze({
  version: "soul-origin-chapter-plan-v1",
  chapters: Object.freeze([
    {
      id: "01",
      chapterNumber: 1,
      title: "1장. 인생에 반복되는 운명의 패턴",
      purpose: "반복되는 선택, 관계, 상황의 핵심 구조를 짚고 전환의 첫 기준을 세운다.",
      requiredSections: Object.freeze(["반복 패턴", "명리와 운의 근거", "현실 장면", "전환 기준"]),
    },
    {
      id: "02",
      chapterNumber: 2,
      title: "2장. 타고난 기질과 업의 언어",
      purpose: "일간, 월지, 오행 균형을 바탕으로 성향과 생존 방식의 반복을 해석한다.",
      requiredSections: Object.freeze(["타고난 결", "강한 힘", "부족한 힘", "성장 과제"]),
    },
    {
      id: "03",
      chapterNumber: 3,
      title: "3장. 관계에서 되풀이되는 흐름",
      purpose: "가까운 관계에서 반복되는 거리감, 기대, 상처, 회복 방식을 상담한다.",
      requiredSections: Object.freeze(["관계 패턴", "끌림과 충돌", "상처의 반복", "회복 조언"]),
    },
    {
      id: "04",
      chapterNumber: 4,
      title: "4장. 일과 재능의 카르마",
      purpose: "일, 직업, 성취 방식에서 나타나는 재능과 소진의 반복을 밝힌다.",
      requiredSections: Object.freeze(["일의 방식", "재능의 쓰임", "소진 신호", "직업 조언"]),
    },
    {
      id: "05",
      chapterNumber: 5,
      title: "5장. 돈과 안정감의 흐름",
      purpose: "재물 감각, 축적 방식, 손실 패턴, 안정감을 다루는 태도를 해석한다.",
      requiredSections: Object.freeze(["재물 감각", "흐름과 막힘", "위험 습관", "관리 기준"]),
    },
    {
      id: "06",
      chapterNumber: 6,
      title: "6장. 마음의 그림자와 무의식",
      purpose: "두려움, 회피, 과잉 반응, 반복 감정의 뿌리를 부드럽게 읽는다.",
      requiredSections: Object.freeze(["감정의 뿌리", "그림자 반응", "무너지는 지점", "회복 의식"]),
    },
    {
      id: "07",
      chapterNumber: 7,
      title: "7장. 운이 열리는 시기와 닫히는 시기",
      purpose: "대운과 세운의 흐름을 바탕으로 확장기, 정리기, 대기기를 구분한다.",
      requiredSections: Object.freeze(["현재 운", "확장 시기", "주의 시기", "시기별 선택"]),
    },
    {
      id: "08",
      chapterNumber: 8,
      title: "8장. 가족과 뿌리에서 이어진 과제",
      purpose: "가족, 뿌리, 초기 환경에서 이어진 정서적 과제를 상담한다.",
      requiredSections: Object.freeze(["뿌리의 흔적", "이어받은 방식", "끊어낼 반복", "화해의 방향"]),
    },
    {
      id: "09",
      chapterNumber: 9,
      title: "9장. 사랑과 결혼의 업",
      purpose: "사랑, 결혼, 동반자 관계에서 나타나는 반복과 성숙의 방향을 말한다.",
      requiredSections: Object.freeze(["사랑의 방식", "반복되는 인연", "관계의 시험", "성숙한 선택"]),
    },
    {
      id: "10",
      chapterNumber: 10,
      title: "10장. 건강과 생활 리듬의 경고",
      purpose: "오행 균형과 생활 리듬을 바탕으로 몸과 마음의 주의점을 안내한다.",
      requiredSections: Object.freeze(["리듬의 균형", "과로 신호", "생활 조언", "주의점"]),
    },
    {
      id: "11",
      chapterNumber: 11,
      title: "11장. 앞으로 피해야 할 선택",
      purpose: "운의 흐름에서 손실을 키우는 선택, 말, 관계, 투자 습관을 경계한다.",
      requiredSections: Object.freeze(["피해야 할 반복", "위험한 타이밍", "관계 경계", "결정 기준"]),
    },
    {
      id: "12",
      chapterNumber: 12,
      title: "12장. 업을 풀고 운을 여는 실천",
      purpose: "해석을 현실의 선택과 의식, 습관, 관계 태도로 연결한다.",
      requiredSections: Object.freeze(["핵심 전환", "실천 의식", "장기 조언", "마지막 메시지"]),
    },
  ]),
});

export function assertSoulOriginChapterPlan(plan = soulOriginChapterPlanV1) {
  const chapters = asArray(plan?.chapters);
  if (chapters.length !== 12) {
    throw Object.assign(new Error("SOUL_ORIGIN_CHAPTER_PLAN_INVALID"), {
      code: "SOUL_ORIGIN_CHAPTER_PLAN_INVALID",
      status: 500,
    });
  }
  chapters.forEach((chapter, index) => {
    if (Number(chapter.chapterNumber) !== index + 1 || !clean(chapter.id) || !clean(chapter.title)) {
      throw Object.assign(new Error("SOUL_ORIGIN_CHAPTER_PLAN_INVALID"), {
        code: "SOUL_ORIGIN_CHAPTER_PLAN_INVALID",
        status: 500,
        chapterId: clean(chapter.id),
      });
    }
  });
  return true;
}
