import type { DevPreviewState } from "@/lib/dev-preview/core";

const COMPAT_RESULT_SUCCESS = {
  meta: {
    person_a: {
      name: "민준",
      sukuyo: "실",
      sukuyo_hanja: "室",
      group: "북방현무",
      element: "물",
      yin_yang: "양",
      guardian: "실수저",
      keyword: "포용",
    },
    person_b: {
      name: "서연",
      sukuyo: "위",
      sukuyo_hanja: "危",
      group: "북방현무",
      element: "나무",
      yin_yang: "음",
      guardian: "위월연",
      keyword: "예민한 직관",
    },
    relation: { type_a_to_b: "형", type_b_to_a: "포", distance: 2, intensity: "강함" },
    // destiny/harmony/emotion/growth/stability는 CompatSummaryHeader의 (destiny+emotion)/40*100,
    // (stability+harmony)/40*100 게이지 공식 기준 0~20대 스케일 — 0~100으로 채우면 400%대로 깨진다.
    scores: { destiny: 18, harmony: 16, emotion: 19, growth: 15, stability: 16, total: 78 },
  },
  sections: {
    overview: {
      title: "두 사람의 첫인상",
      body: "민준님과 서연님은 만나자마자 서로의 결을 알아보는 사이예요. 실수의 포용력이 위수의 예민한 직관을 감싸주면서, 대화가 오갈수록 마음이 편안해지는 관계로 자리 잡습니다.",
    },
    twoStars: {
      title: "본명숙 궁합",
      body: "실수와 위수는 같은 북방현무 자리라 근본적인 정서 코드가 닮아 있어요. 다만 물과 나무의 조합이라 서연님이 먼저 마음을 여는 속도를 민준님이 존중해줄 때 관계가 더 깊어집니다.",
    },
    attraction: {
      title: "끌리는 순간",
      body: "민준님의 든든함이 서연님의 불안을 잠재우는 순간, 서연님의 섬세한 관찰력이 민준님도 몰랐던 마음을 짚어주는 순간에 서로에게 강하게 끌립니다.",
    },
    conflict: {
      title: "갈등이 생길 때",
      body: "민준님이 감정을 천천히 표현하는 편이라, 서연님은 가끔 '내 마음을 모르는 건가' 싶어 서운해질 수 있어요. 이럴 땐 서연님이 먼저 구체적으로 말해주는 편이 오해를 줄여줍니다.",
    },
    timing: {
      title: "관계의 타이밍",
      body: "만난 지 3개월, 1년 즈음이 감정의 밀도가 크게 오르는 시기예요. 이 시기에 여행이나 새로운 취미를 함께 시작하면 관계가 한 단계 더 단단해집니다.",
    },
    caution: {
      title: "주의할 점",
      body: "서로 다른 속도를 '나에 대한 무관심'으로 오해하지 않는 게 중요해요. 각자의 리듬을 인정하는 대화를 의식적으로 만들어가시길 권해드려요.",
    },
    treasure: {
      title: "관계의 보물",
      body: "두 분 사이엔 억지로 꾸미지 않아도 되는 편안함이 있어요. 이 편안함이야말로 오래가는 관계의 가장 큰 자산입니다.",
    },
    communication: {
      title: "대화 스타일",
      body: "민준님은 결론부터, 서연님은 감정부터 말하는 편이에요. 서로의 화법을 알아두면 사소한 오해가 크게 번지지 않습니다.",
    },
    domains: {
      title: "함께하기 좋은 영역",
      body: "여행, 요리처럼 손발을 맞춰야 하는 활동에서 두 분의 합이 특히 잘 드러납니다. 함께 계획을 세우는 과정 자체를 즐겨보세요.",
    },
    crisis: {
      title: "위기 신호",
      body: "대화 없이 침묵하는 시간이 길어지는 게 가장 큰 위험 신호예요. 사소한 일이라도 그날 안에 짧게라도 이야기 나누는 습관을 들여보세요.",
    },
    outlook: {
      title: "관계의 전망",
      body: "장기적으로 안정적인 신뢰 관계로 자리 잡을 가능성이 높은 궁합이에요. 서로의 속도를 존중하는 연습이 쌓일수록 더 단단해집니다.",
    },
    moonLetter: {
      title: "달빛 편지",
      body: "지금처럼 서로를 있는 그대로 바라봐 주는 마음이면 충분해요. 두 분의 관계는 이미 좋은 방향으로 흐르고 있습니다.",
    },
  },
};

function toTruncatedAssistantContent(): string {
  const clone = JSON.parse(JSON.stringify(COMPAT_RESULT_SUCCESS));
  clone.sections.moonLetter.body = "지금처럼 서로를 있는 그대로 바라봐 주는 마음이면 충분";
  const serialized = JSON.stringify(clone);
  const cutIndex = serialized.lastIndexOf("충분") + "충분".length;
  return serialized.slice(0, cutIndex);
}

export function buildSukuyoCompatibilityPreviewPayload(state: DevPreviewState) {
  if (state === "failed") {
    return { ok: false as const, reason: "LLM_FAILED" };
  }

  const content = state === "truncated" ? toTruncatedAssistantContent() : JSON.stringify(COMPAT_RESULT_SUCCESS);

  return {
    ok: true as const,
    consultation: {
      id: "dev-preview-sukuyo",
      consultationType: "compatibility",
      personA: { name: "민준", shuku: "실" },
      personB: { name: "서연", shuku: "위" },
      sukuyoResult: {
        personAShuku: "실",
        personBShuku: "위",
        relationType: "형포",
        distance: "near",
        distanceLabel: "가까운 사이",
        direction: "형",
      },
      relationshipType: "연인",
      topic: "궁합",
      messages: [{ role: "assistant", content, createdAt: "2026-07-08T09:00:00.000Z" }],
    },
  };
}
