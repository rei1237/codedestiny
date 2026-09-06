import type { DevPreviewState } from "@/lib/dev-preview/core";

/**
 * 초융합 운세 결과 화면 프리뷰 픽스처.
 *
 * 이 화면은 결과가 있어야 차례 레일(FusionResultRail)·모바일 도크(FusionResultDock)가 그려지는데,
 * 결과를 얻으려면 Gemini 실호출 + 결제를 타야 한다. 레이아웃을 눈으로 확인하려고 매번 그 값을
 * 치를 수는 없어서 다른 8개 결과 화면과 같은 방식(lib/dev-preview)으로 픽스처를 둔다.
 *
 * 🔴 **본문은 프로그램으로 채운다** — 실호출 원문(5만자대)이나 mock 전량 스냅샷을 그대로 박으면
 *    그 덩어리가 프로덕션 번들에 그대로 실린다(픽스처는 정적 임포트다). 레일·도크가 재는 것은
 *    문장의 내용이 아니라 항목 수·글자 수·스크롤 높이라 회전 문단으로 충분하다.
 */

const SENTENCES = [
  "여섯 체계가 같은 곳을 가리킬 때는 설명이 길어질 필요가 없지만, 갈라질 때는 그 간격 자체가 정보가 됩니다.",
  "지금의 흐름은 새로 벌이는 쪽보다 이미 벌여 둔 것을 정리해 형태를 만드는 쪽에 더 힘이 실립니다.",
  "결정을 미루는 습관은 위험을 줄이는 것처럼 보이지만 실제로는 선택지를 하나씩 지우는 방식으로 작동합니다.",
  "관계에서 생기는 마찰은 대개 사건 자체가 아니라 사건을 설명하는 속도의 차이에서 옵니다.",
  "돈의 흐름은 수입의 크기보다 들어오고 나가는 리듬이 일정한지에 더 크게 좌우되는 시기입니다.",
  "몸이 보내는 신호를 뒤로 미루면 판단의 품질이 먼저 떨어지고, 그다음에 관계가 흔들립니다.",
  "한 번에 큰 폭으로 바꾸려는 시도보다 같은 방향으로 여러 번 반복하는 쪽이 이 시기의 성질에 맞습니다.",
  "확신이 서지 않을 때는 결론을 앞당기지 말고 되돌릴 수 있는 크기로 잘라 먼저 시험해 보는 편이 낫습니다.",
  "주변의 조언이 엇갈린다면 누가 옳은지를 따지기보다 각자가 어떤 위험을 보고 있는지를 물어보세요.",
  "당신이 잘하는 방식은 이미 증명돼 있으므로, 새 방법을 배우기보다 쓰던 방법을 더 자주 쓰는 것이 빠릅니다.",
  "기록으로 남기지 않은 판단은 다음 달이면 감정으로 기억되고, 감정으로 기억된 판단은 반복됩니다.",
  "지금 눈에 띄는 기회는 규모보다 되돌릴 수 있는지를 기준으로 골라야 뒤늦은 후회가 생기지 않습니다.",
];

/** seed 로 문장 순서를 돌려 섹션마다 다른 본문을 만든다 — 같은 순서가 반복되면 실제 화면의 스크롤 감각이 안 나온다. */
function body(seed: number, targetChars: number): string {
  const paragraphs: string[] = [];
  let sentences: string[] = [];
  let total = 0;
  for (let index = 0; total < targetChars; index += 1) {
    const sentence = SENTENCES[(seed + index) % SENTENCES.length];
    sentences.push(sentence);
    total += sentence.length + 1;
    if (sentences.length === 4) {
      paragraphs.push(sentences.join(" "));
      sentences = [];
    }
  }
  if (sentences.length) paragraphs.push(sentences.join(" "));
  return paragraphs.join("\n\n");
}

const SECTION_TITLES: [string, string, number][] = [
  ["sajuSection", "사주 — 타고난 결과 지금의 계절", 0],
  ["ziweiSection", "자미두수 — 자리와 역할", 2],
  ["vedicSection", "베다점 — 무의식의 리듬", 4],
  ["sukuyoSection", "숙요점 — 관계의 온도", 6],
  ["astrologySection", "점성술 — 시기의 지도", 8],
  ["tarotSection", "타로 — 지금 이 장면", 10],
  ["integratedReading", "여섯 갈래가 만나는 지점", 1],
];

function section(title: string, seed: number, chars: number) {
  return {
    title,
    content: body(seed, chars),
    keyPoints: [
      "지금은 새로 벌이기보다 벌여 둔 것을 형태로 만드는 시기입니다.",
      "결정을 미루는 것도 선택이며, 이 시기에는 비용이 더 큽니다.",
      "되돌릴 수 있는 크기로 잘라 먼저 시험해 보세요.",
    ],
  };
}

const SYSTEM_SCORES = [
  { key: "saju" as const, label: "사주", score: 82, note: "일간이 힘을 받는 구간" },
  { key: "ziwei" as const, label: "자미두수", score: 74, note: "관록궁 중심의 흐름" },
  { key: "vedic" as const, label: "베다점", score: 68, note: "다샤 전환기" },
  { key: "sukuyo" as const, label: "숙요점", score: 71, note: "관계 축의 재정렬" },
  { key: "astrology" as const, label: "점성술", score: 79, note: "6하우스 강조" },
  { key: "tarot" as const, label: "타로", score: 65, note: "속도 조절 신호" },
];

const MONTH_NOTES = ["정리", "준비", "시험", "확장", "조정", "수확", "휴지", "재정비", "추진", "점검", "마무리", "설계"];

function buildStageOne() {
  const sections = Object.fromEntries(SECTION_TITLES.map(([key, title, seed]) => [key, section(title, seed, key === "integratedReading" ? 4600 : 4200)]));
  return {
    ...sections,
    title: "여섯 체계가 함께 본 당신의 올해",
    openingMessage: body(3, 420),
    visualization: {
      systemScores: SYSTEM_SCORES,
      monthlyTimeline: MONTH_NOTES.map((note, index) => ({
        label: `${index + 1}월`,
        intensity: 40 + ((index * 13) % 55),
        note: `${note}에 무게가 실리는 달입니다.`,
      })),
      crossChecks: {
        aligned: [
          { theme: "일과 성취", systems: ["사주", "자미두수", "점성술"], meaning: "세 체계가 같은 시기에 성과를 가리킵니다." },
          { theme: "건강 리듬", systems: ["베다점", "점성술"], meaning: "회복에 쓰는 시간이 곧 성과의 재료가 됩니다." },
        ],
        divergent: [
          { theme: "관계의 속도", systems: ["숙요점", "타로"], meaning: "한쪽은 진전을, 한쪽은 속도 조절을 말합니다." },
          { theme: "재물의 확장", systems: ["사주", "타로"], meaning: "확장 시점에 대한 판단이 갈립니다." },
        ],
      },
    },
    closingMessage: body(7, 900),
  };
}

function buildStageTwo() {
  return {
    executiveSummary: body(5, 1600),
    timingAndAction: {
      title: "언제 무엇을 할까",
      content: body(9, 3000),
      luckyActions: ["주 1회 판단을 기록으로 남기기", "되돌릴 수 있는 크기로 먼저 시험하기", "조언이 갈릴 때 각자의 위험을 물어보기"],
      cautionPatterns: ["결정을 미루며 선택지를 지우는 것", "한 번에 크게 바꾸려는 시도", "몸의 신호를 뒤로 미루는 습관"],
    },
    finalVerdict: {
      headline: "지금은 넓히는 때가 아니라, 벌여 둔 것을 형태로 만드는 때입니다.",
      confidence: 78,
      systemVerdicts: [
        { key: "saju" as const, label: "사주", stance: "agree" as const, note: "일간이 힘을 받아 실행에 유리한 구간입니다." },
        { key: "ziwei" as const, label: "자미두수", stance: "agree" as const, note: "관록궁 중심이라 성과가 밖으로 드러납니다." },
        { key: "vedic" as const, label: "베다점", stance: "conditional" as const, note: "회복 리듬을 지킨다는 조건에서 동의합니다." },
        { key: "sukuyo" as const, label: "숙요점", stance: "conditional" as const, note: "관계의 속도를 맞출 때만 무리가 없습니다." },
        { key: "astrology" as const, label: "점성술", stance: "agree" as const, note: "정리와 점검에 무게가 실린 시기입니다." },
        { key: "tarot" as const, label: "타로", stance: "caution" as const, note: "확장 시점을 앞당기지 말라고 말합니다." },
      ],
      rationale: body(11, 1500),
      doNow: ["이번 주 안에 벌여 둔 것 중 하나를 끝까지 닫기", "판단을 남길 기록 자리를 하나 정하기", "가장 미뤄 둔 대화를 먼저 꺼내기"],
      avoid: ["규모부터 키우는 결정", "몸의 신호를 미루는 일정"],
    },
    shareText: "여섯 체계가 함께 본 결론 — 지금은 넓히기보다 형태를 만드는 시기.",
  };
}

export function buildFusionPreviewResult(state: DevPreviewState) {
  if (state === "failed") return { ok: false as const, reason: "LLM_ERROR" };
  // truncated = 1단계만 도착한 상태. 차례의 "2단계" 대기 그룹과 대기 말풍선이 이 상태에서만 보인다.
  if (state === "truncated") return { ok: true as const, stageTwoPending: true, result: buildStageOne() };
  return { ok: true as const, stageTwoPending: false, result: { ...buildStageOne(), ...buildStageTwo() } };
}
