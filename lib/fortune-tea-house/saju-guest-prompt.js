import { CATEGORY_FOCUS, resolveQuestionCategory, selectQuestionGuests } from "./saju-category.js";

export function buildGuestPrompt(request, guests, date) {
  const category = resolveQuestionCategory(request);
  const categoryModule = CATEGORY_FOCUS[category.primary];
  const ordered = selectQuestionGuests(guests, category.primary);
  // Keep a bounded selection; each selected item retains its exact occurrence and evidence.
  const relevant = ordered.filter(g => g.scope === "natal" || g.evidence.isCurrent || g.evidence.year === Number(date.slice(0, 4)));
  const natal = relevant.filter(g => g.scope === "natal").slice(0, 8);
  const luck = relevant.filter(g => g.scope !== "natal").slice(0, 4);
  const selected = selectQuestionGuests([...natal, ...luck], category.primary);
  return {
    version: "tea-guests-v1", todayKst: date, category,
    module: categoryModule ? { focus: categoryModule.focus, time: categoryModule.time } : undefined,
    guests: selected,
    rules: [
      "userQuestion에 직접 답하는 한 줄 결론으로 시작한다. 답변 언어는 기존 언어 지시를 따른다.",
      "손님 명단은 확정된 입력 사실이다. 십성·자리·등급을 바꾸거나 용신을 다시 판정하지 않는다.",
      "등급: yong=용신, hee=희신, gi=기신, gu=구신, han=한신, unavailable=판정 미제공. 미제공을 한신으로 간주하지 않는다.",
      "traditional은 전통 성정 태그일 뿐 등급이 아니다. 겁재·상관·편관·편인도 용신/희신이면 돕는 손님이다. 그 경우 전통 성정과 개인별 역할이 다름을 쉽게 설명한다.",
      "원국은 단골 손님, 대운은 일정 구간 머무는 손님, 세운은 해당 연도에 오는 손님이다. 원국 손님을 올해 새로 찾아온 손님이라고 하지 않는다.",
      "각 핵심 해석은 명단의 실제 자리·간 또는 제공된 명식 근거 하나 이상에 연결한다. 등급만으로 사건을 예언하지 않는다.",
      "기신/구신은 나쁜 사람이나 운명이 아니다. 경향 설명에 현실적인 대응책을 반드시 함께 쓴다.",
      "등급 미제공이면 성정과 자리만 설명한다. 없는 구신·한신·월운·신살·강약 점수를 만들지 않는다.",
      "이 질문의 카테고리에 집중한다. 결론 → 눈여겨볼 손님과 근거 → 제공된 시기 → 행동 2~3개 → 짧은 마무리 순서로 읽히게 한다. 기존 JSON 필드와 필수 제목은 유지한다.",
    ],
  };
}
