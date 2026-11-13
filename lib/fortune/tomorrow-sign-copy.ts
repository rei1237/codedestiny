/**
 * 한국어 내일 상세(/fortune/tomorrow/<sign>/) 전용 문구.
 *
 * 왜 따로 두는가 (2026-11-13, SEO 묶음 ⑤ 마무리):
 *   오늘·내일 상세는 같은 템플릿이라 고지·개인 풀이 안내·궁합 도입·FAQ·웹툰 안내가 그대로 겹쳤다.
 *   운영 SSR 24쌍 5단어 Jaccard 최대 56%(11/09), 로컬 39%(11/13). 내일 페이지는 "미리 준비" 관점의
 *   문장을 쓰고, 날짜와 무관한 상시 해설은 오늘 페이지로 이어 읽게 한다.
 *
 * 규칙: '오늘'이라는 낱말을 쓰지 않는다(내일 본문의 기준일은 내일이다). 결과·건강·수익을 보장하거나
 *   사건을 예고하지 않는다. 계산값·관계 종류는 바꾸지 않고, 그 결과에 맞는 준비 행동만 붙인다.
 */
import type { DayRelation } from "./day-relation";
import type { SignProfile } from "./sign-profiles";

export const TOMORROW_DISCLOSURE_KO =
  "이 페이지는 내일 날짜의 일진·월건·달의 위치를 하루 앞서 계산해 보여 줍니다. 점수는 그 값에 서비스의 상징 해석 규칙을 적용한 참고 지표라 내일 일어날 일을 예고하거나 건강·성과를 보장하지 않습니다. 준비 조언은 미리 써 둔 문구 가운데 날짜와 별자리·띠에 맞춰 고르므로 다른 날짜의 문구와 겹칠 수 있고, 개인 상담이나 의료·법률·투자 판단을 대신하지 않습니다.";

type PrepKey = `${SignProfile["kind"]}:${DayRelation["kind"]}`;

const RELATION_PREPARATION: Record<PrepKey, string> = {
  "animal:same":
    "내일은 같은 지지가 겹치는 비화의 날로 계산돼요. 평소 습관이 그대로 드러나기 쉬우니, 자기 전에 내일도 이어 갈 루틴 하나와 잠시 줄일 습관 하나를 정해 두세요. 아침에 고민할 거리가 줄어듭니다.",
  "animal:clash":
    "내일은 변동 폭이 커질 수 있는 충의 날로 계산돼요. 이동이 있다면 출발 시간을 15분쯤 당겨 잡고, 꼭 지켜야 할 약속은 시간과 장소를 미리 한 번 더 확인해 두세요. 감정이 실릴 만한 결정이 잡혀 있다면 결론 대신 확인할 질문부터 적어 두는 편이 차분합니다.",
  "animal:trine":
    "내일은 같은 삼합 그룹의 지지가 만나는 날로 계산돼요. 함께 움직일 사람이 있다면 각자 맡을 일과 마감 시각을 한 줄씩 미리 정리해 공유해 두세요. 관계 표시는 협업을 떠올리는 참고일 뿐, 상대의 반응을 정하지 않습니다.",
  "animal:neutral":
    "내일 일진은 이 띠와 삼합·충·비화 어느 쪽에도 해당하지 않아요. 큰 변수를 기대하거나 걱정하기보다, 이미 잡힌 일정의 순서와 빠진 준비물을 점검하는 데 저녁 시간 몇 분을 쓰세요.",
  "zodiac:same":
    "내일도 태양이 이 별자리에 머무는 구간이에요. 미뤄 둔 제안이나 꺼내고 싶은 이야기가 있다면 첫 문장을 미리 적어 두고, 누구에게 언제 말할지까지 정해 두세요.",
  "zodiac:trine":
    "내일 달이 이 별자리를 지나는 날로 계산돼요. 감정이 선명해지는 흐름으로 읽으니, 마음이 쓰이는 대화가 있다면 전할 말 한 가지와 먼저 물어볼 질문 한 가지를 미리 정리해 두세요.",
  "zodiac:neutral":
    "내일 하늘은 이 별자리를 강하게 끌어당기지 않는 배치예요. 바깥 흐름을 기다리기보다 내 일정표의 첫 일정과 꼭 끝낼 마감 하나를 미리 고정해 두세요.",
  "zodiac:clash":
    "내일 하늘에서 이 별자리와 부딪히는 배치가 계산돼요. 일정 사이에 여유를 두고, 중요한 연락은 미리 확인해 두세요.",
};

/** 계산된 관계 종류에 맞춘 내일 준비 문장. 관계가 없으면 null. */
export function tomorrowRelationPreparation(profile: Pick<SignProfile, "kind">, relation: Pick<DayRelation, "kind"> | null | undefined): string | null {
  if (!relation) return null;
  return RELATION_PREPARATION[`${profile.kind}:${relation.kind}` as PrepKey] ?? null;
}

/** "11월 14일 준비" — 관계 표시 옆에 붙는 대상일 마커. */
export function tomorrowPreparationMarker(dateKey: string): string {
  const [, month, day] = dateKey.split("-").map(Number);
  return month && day ? `${month}월 ${day}일(내일) 준비` : "내일 준비";
}

export function tomorrowAdviceIntroKo(): string {
  return "내일 쓸 분야별 원고예요. 위의 점수·관계와 함께 읽고, 자기 전에 한 갈래만 골라 일정 옆에 적어 두세요.";
}

export function tomorrowPersonalCopyKo(name: string, kindLabel: string) {
  return {
    heading: `같은 ${name}라도 내 내일은 다를까요?`,
    body: `여기까지는 ${kindLabel}가 같은 사람 모두에게 똑같이 계산되는 내일의 흐름이에요. 내 일간과 오행까지 넣어 내일 일정을 점검하고 싶다면 생년월일로 사주 명식을 먼저 세워 보세요. 구체적인 고민은 별도 유료 영냥이 상담에서 따로 물어볼 수 있어요.`,
  };
}

export function tomorrowCompatibilityIntroKo(kind: SignProfile["kind"]): string {
  return kind === "animal"
    ? "내일 만날 사람의 띠를 안다면, 삼합(흐름이 맞는 쪽)과 충(조율이 필요한 쪽)을 약속 전에 살펴보세요. 관계 표시는 대화 방식을 고르는 참고이고 만남의 결과를 정하지 않습니다."
    : "내일 만날 사람의 별자리를 안다면, 같은 원소의 삼각 관계와 마주 보는 별자리를 약속 전에 살펴보세요. 관계 표시는 대화 방식을 고르는 참고이고 만남의 결과를 정하지 않습니다.";
}

/** 내일 FAQ의 활용 문답 — 화면과 FAQPage 구조화 데이터가 함께 쓴다. */
export function tomorrowUsageFaqKo(name: string) {
  return {
    question: `${name} 내일 연애운·재물운·직장운은 언제, 어떻게 준비하면 좋나요?`,
    answer: "전날 저녁에 점수가 가장 낮은 갈래 하나를 골라 준비 항목으로 바꿔 보세요. 연애운이면 전할 말 한 줄, 재물운이면 내일 쓸 지출 상한, 직장운이면 첫 업무의 순서를 적는 식입니다. 건강운은 수면·식사 같은 생활 리듬을 돌아보는 참고이며 의학적 판단에 사용하지 않습니다. 점수는 사건을 예고하지 않습니다.",
  };
}
