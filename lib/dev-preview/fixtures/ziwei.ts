import type { DevPreviewState } from "@/lib/dev-preview/core";

const PALACE_NAMES = [
  "명궁",
  "형제궁",
  "부부궁",
  "자녀궁",
  "재백궁",
  "질액궁",
  "천이궁",
  "노복궁",
  "관록궁",
  "전택궁",
  "복덕궁",
  "부모궁",
];

const STRUCTURED_SUCCESS = {
  meta: {
    name: "민준",
    gender: "male",
    mingong: { branch: "인", main_stars: ["자미", "천부"], description: "제왕의 별과 곳간의 별이 함께 자리한 명궁" },
    shengong: { palace: "관록궁", main_stars: ["태양"] },
    sihua: {
      lu: { star: "무곡", palace: "재백궁" },
      quan: { star: "자미", palace: "명궁" },
      ke: { star: "천기", palace: "형제궁" },
      ji: { star: "문곡", palace: "부부궁" },
    },
    dayun: { current_palace: "관록궁", age_range: "34-43세", main_stars: ["태양", "거문"], theme: "성취와 확장" },
    scores: { career: 84, wealth: 76, relationship: 68, health: 80, overall: 78 },
  },
  sections: {
    reading_guide: { title: "이 명반을 읽는 법", body: "자미두수는 명궁을 중심으로 12궁의 별자리 배치를 살펴 타고난 성향과 시기별 흐름을 함께 읽습니다. 아래 순서대로 따라가시면 됩니다." },
    essence: { title: "타고난 기질", body: "자미·천부가 함께 자리한 명궁은 스스로 중심을 잡고 사람을 이끄는 힘이 강합니다. 다만 그만큼 자존심도 강해 고집으로 비칠 때가 있어요." },
    flow: { title: "전체 흐름", body: "젊은 시절엔 다소 부침이 있었지만, 30대 중반 이후 관록궁 대한으로 접어들며 성취가 뚜렷해지는 흐름입니다." },
    triad_axis: { title: "삼방사정", body: "명궁-재백궁-관록궁의 삼방이 서로 힘을 실어주는 구조라, 일과 재물의 흐름이 유기적으로 연결됩니다." },
    twelve_palaces: { title: "12궁 요약", body: "형제궁은 우호적이나 부부궁엔 문곡화기가 들어 소통에 신경 쓸 시기입니다. 나머지 궁은 대체로 안정적입니다." },
    career: { title: "일과 성취", body: "관록궁에 태양이 들어 대외적으로 인정받는 흐름입니다. 리더 역할을 맡을수록 운이 트입니다." },
    wealth: { title: "재물의 흐름", body: "재백궁에 무곡화록이 들어 있어 실물 자산보다 성과 기반의 수입이 늘어나는 시기입니다." },
    relationship: { title: "관계와 인연", body: "부부궁에 화기가 들어 있어 이 시기엔 오해가 쌓이지 않도록 대화를 자주 나누는 게 중요합니다." },
    dayun_now: { title: "지금의 대한", body: "34~43세 관록궁 대한은 그동안 쌓아온 역량이 외부로 드러나는 시기입니다. 큰 결정을 내리기에 좋은 흐름입니다." },
    timing_strategy: { title: "시기별 전략", body: "상반기엔 내실을 다지고, 하반기부터 확장을 시도하는 편이 유리합니다." },
    caution: { title: "주의할 점", body: "자존심 때문에 조언을 흘려듣지 않도록 주의하세요. 특히 가까운 사람의 말에 더 귀 기울여야 하는 시기입니다." },
    core_answer: { title: "핵심 답변", body: "지금은 스스로를 믿고 앞으로 나아가도 좋은 시기입니다. 다만 혼자만의 판단보다 신뢰하는 사람과 상의하는 균형이 필요합니다." },
    prescription: { title: "실천 처방", body: "매주 한 번은 일과 관계를 함께 점검하는 시간을 가지세요. 작은 소통이 큰 갈등을 막아줍니다." },
  },
};

function toTruncatedContent(): string {
  const clone = JSON.parse(JSON.stringify(STRUCTURED_SUCCESS));
  clone.sections.core_answer.body = "지금은 스스로를 믿고 앞으로 나아가도 좋은 시기입";
  const serialized = JSON.stringify(clone);
  const cutIndex = serialized.lastIndexOf("좋은 시기입") + "좋은 시기입".length;
  return serialized.slice(0, cutIndex);
}

export function buildZiweiPreviewPayload(state: DevPreviewState) {
  if (state === "failed") {
    return { ok: false as const, reason: "LLM_ERROR" };
  }

  const content = state === "truncated" ? toTruncatedContent() : JSON.stringify(STRUCTURED_SUCCESS);

  return {
    ok: true as const,
    consultation: {
      id: "dev-preview-ziwei",
      status: "completed",
      accessType: "pass",
      birthInfo: { name: "민준", gender: "male", birthDate: "1989-04-12", birthTime: "08:30", calendarType: "solar" },
      topic: "종합운",
      summaryCards: {
        lifePalace: "명궁(인)",
        bodyPalace: "관록궁(오)",
        keyStars: ["자미", "천부", "태양"],
        keywords: ["리더십", "성취", "확장"],
      },
      ziweiChart: {
        lifePalace: "명궁(인)",
        bodyPalace: "관록궁(오)",
        palaces: PALACE_NAMES.map((name, index) => ({
          name,
          earthlyBranch: "자축인묘진사오미신유술해"[index],
          mainStars: index === 0 ? ["자미", "천부"] : index === 8 ? ["태양", "거문"] : [],
          assistantStars: [],
          maleficStars: index === 2 ? ["문곡화기"] : [],
          transformations: index === 0 ? ["화권"] : index === 4 ? ["화록"] : index === 2 ? ["화기"] : [],
        })),
        fourTransformations: { huaLu: "무곡", huaQuan: "자미", huaKe: "천기", huaJi: "문곡" },
        majorLuck: [
          { palaceName: "명궁", earthlyBranch: "인", range: "4-13세", startAge: 4, endAge: 13, direction: "순행" },
          { palaceName: "부모궁", earthlyBranch: "축", range: "14-23세", startAge: 14, endAge: 23, direction: "순행" },
          { palaceName: "복덕궁", earthlyBranch: "자", range: "24-33세", startAge: 24, endAge: 33, direction: "순행" },
          { palaceName: "관록궁", earthlyBranch: "오", range: "34-43세", startAge: 34, endAge: 43, direction: "순행" },
        ],
        bureau: { number: 5, name: "토오국" },
      },
      messages: [{ role: "assistant", content, createdAt: "2026-07-08T09:00:00.000Z" }],
    },
  };
}
