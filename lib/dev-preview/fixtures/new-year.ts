import type { DevPreviewState } from "@/lib/dev-preview/core";

const MONTH_DOMAINS = ["가족", "재물", "직업", "연애", "건강", "학업", "관계", "휴식", "확장", "정리", "준비", "결실"];

const RELATION_TO_TIMING = { 합: "기회", 충: "주의", 평: "정비" };

const DOMAIN_LEVEL_CYCLE = ["강", "중", "약"];

function buildMonthDomains(index: number, timing: string) {
  const pick = (offset: number) => DOMAIN_LEVEL_CYCLE[(index + offset) % 3];
  const overallLevel = timing === "기회" ? "강" : timing === "주의" ? "약" : "중";
  return {
    overall: { level: overallLevel, basis: timing === "기회" ? "월지 기운이 용신 화를 살려 흐름이 트이는 달" : timing === "주의" ? "일지와 부딪혀 변화·정비가 잦은 달" : "큰 굴곡 없이 기존 리듬을 다지는 달" },
    money: { level: pick(0), basis: "재성 목 기운이 실려 재물 활동이 늘어나는 달" },
    love: { level: pick(1), basis: "배우자궁 일지에 합이 들어 관계가 가까워지는 달" },
    career: { level: pick(2), basis: "정관이 올라와 평판·조직·책임이 부각되는 달" },
    health: { level: pick(1), basis: "조후 급용신 화가 채워져 컨디션이 안정되는 달" },
  };
}

function buildMonthlyFlow() {
  return Array.from({ length: 12 }, (_, index) => {
    const relationToDayBranch = index % 3 === 0 ? "합" : index % 3 === 1 ? "충" : "평";
    const timing = RELATION_TO_TIMING[relationToDayBranch];
    return {
      month: index + 1,
      pillar: `${["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"][index % 10]}${["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"][index]}`,
      element: ["목", "화", "토", "금", "수"][index % 5],
      tenGod: ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"][index % 10],
      domain: MONTH_DOMAINS[index],
      relationToDayBranch,
      timing,
      domains: buildMonthDomains(index, timing),
    };
  });
}

const CATEGORY_SECTIONS: Array<{ title: string; body: string }> = [
  { title: "연애·재회", body: "합이 드는 달에는 관계가 가까워지고, 충이 드는 달에는 오래 미룬 대화가 표면으로 올라옵니다. 이미 마음이 있는 사람과는 속도를 늦추지 않아도 되는 흐름이니 먼저 손을 내밀어 보셔도 좋습니다." },
  { title: "재물·수입", body: "용신 기운이 살아나는 달에는 수입의 숨통이 열리고, 기신이 과한 달에는 지출을 줄이는 쪽이 안정적입니다. 큰 결정을 앞두고 있다면 서두르기보다 한 박자 늦추는 편이 결과적으로 더 안전합니다." },
  { title: "직업·이직", body: "정관의 기운이 평판과 조직, 약속의 형태로 드러나는 해라, 맡은 역할의 이름이 바뀌거나 책임의 폭이 달라질 수 있습니다. 큰 변화를 원한다면 상반기의 흐름을 먼저 살피는 편이 좋습니다." },
  { title: "건강·멘탈", body: "조후상 필요한 기운을 조절하는 것이 컨디션의 핵심이며, 수면과 호흡의 리듬을 먼저 다듬는 편이 좋습니다. 마음이 급해질 때일수록 몸의 신호를 먼저 확인해 주세요." },
  { title: "가족·관계", body: "오래된 인연은 올해의 흐름 속에서 다시 정비되고, 새 인연은 조직이나 모임을 통해 이어지기 쉽습니다. 가족과의 대화는 미루지 않고 먼저 꺼내는 쪽이 마음을 가볍게 합니다." },
  { title: "학업·성장", body: "용신 기운을 채우는 시기에 집중력과 몰입도가 오르고, 조후가 흐트러지는 시기엔 무리한 목표보다 리듬 회복을 먼저 다루는 편이 낫습니다. 작은 목표부터 쌓아가면 성장의 체감이 뚜렷해집니다." },
];

function buildSuccessText(monthlyFlow: ReturnType<typeof buildMonthlyFlow>): string {
  // NewYearAiClient의 splitAssistantSections는 빈 줄(\n{2,})로만 섹션을 나누고, 같은 청크 안의
  // 첫 줄을 제목으로 인식한다 — 제목과 본문 사이에 빈 줄을 넣으면 둘이 분리되어 "새해 상담 편지 N"
  // 식 제목 없는 조각으로 쪼개진다. 섹션 사이에만 빈 줄을 두고, 제목-본문은 단일 개행으로 묶는다.
  // 헤딩 포맷(월 · 간지 · 키워드)은 MonthlyLetterAccordion의 분류 정규식과 실제 프롬프트 지침에 맞춘 것.
  const DOMAIN_ADVICE: Record<string, string> = {
    overall: "전반적인 흐름을 먼저 챙기며 무게중심을 잡으세요",
    money: "재물은 큰 지출을 앞두고 한 박자 늦추는 편이 안전합니다",
    love: "관계에서는 먼저 손을 내밀어 대화의 물꼬를 트세요",
    career: "직업에서는 맡은 역할의 성과를 눈에 띄게 정리해 두세요",
    health: "건강은 수면과 호흡의 리듬부터 다듬는 것이 좋습니다",
  };
  const monthlyParagraphs = monthlyFlow.map((row) => {
    const domains = row.domains as Record<string, { level: string; basis: string }>;
    const strongKey = Object.keys(domains).find((key) => domains[key].level === "강") || "overall";
    const advice = DOMAIN_ADVICE[strongKey] || DOMAIN_ADVICE.overall;
    return `**${row.month}월 · ${row.pillar} · ${MONTH_DOMAINS[row.month - 1]} 흐름**\n${row.month}월에는 ${MONTH_DOMAINS[row.month - 1]} 영역에서 뚜렷한 흐름이 느껴집니다. ${advice}. 무리하게 밀어붙이기보다 자연스러운 흐름을 따라가시는 편이 좋고, 특히 이 시기엔 주변 사람들과의 관계를 챙기면 좋은 기운을 더 크게 받을 수 있어요.`;
  });
  // 월별 흐름과는 별개로 실제 프롬프트가 요구하는 6개 카테고리 소제목을 재현한다.
  const categoryParagraphs = CATEGORY_SECTIONS.map((section) => `**${section.title}**\n${section.body}`);
  // 나만의 질문 우선 노출 카드를 프리뷰에서도 확인할 수 있도록 답변 섹션을 맨 앞에 둔다.
  const questionAnswerParagraph = "**질문에 대한 답변**\n지금 이직을 서두를 필요는 없습니다. 세운이 원국의 관 자리와 합을 이루는 시기까지는 지금 자리에서 신뢰를 쌓아 두는 편이 유리하고, 실제로 움직일 좋은 창은 하반기에 열립니다. 제안이 먼저 오는 흐름이니 조급하게 이력서를 넣기보다 지금의 성과를 눈에 띄게 정리해 두세요.";
  return [questionAnswerParagraph, ...monthlyParagraphs, ...categoryParagraphs].join("\n\n");
}

export function buildNewYearPreviewPayload(state: DevPreviewState) {
  if (state === "failed") {
    return { ok: false, reason: "LLM_ERROR", message: "AI 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 같은 요청 권한으로 다시 이어집니다." };
  }

  const monthlyFlow = buildMonthlyFlow();
  const fullText = buildSuccessText(monthlyFlow);
  const content = state === "truncated" ? `${fullText.slice(0, 2400)}그리고 이 시기에는 안전한 곳에` : fullText;

  return {
    ok: true,
    sessionId: "dev-preview-new-year",
    accessType: "pass",
    status: "ready",
    messages: [
      { role: "user" as const, content: "이직해도 될까요?", createdAt: "2026-07-08T08:59:00.000Z" },
      { role: "assistant" as const, content, createdAt: "2026-07-08T09:00:00.000Z" },
    ],
    sajuProfile: {
      birthInfo: { name: "민준", gender: "male", birthDate: "1989-04-12", birthTime: "08:30", calendarType: "solar" },
      pillars: [
        { label: "년주", value: "기사" },
        { label: "월주", value: "무진" },
        { label: "일주", value: "경신" },
        { label: "시주", value: "병술" },
      ],
      dayMaster: "경금",
      strength: "신강",
      dominantElement: "금",
      balancingElement: "화",
      targetYear: { year: 2027, pillar: "정미", tenGod: "정관", relationToDayBranch: "합" },
      gyeokguk: "정관격",
      yongshin: { core: "화", heesin: "목", gisin: "수", reading: "화 기운이 이 시기의 균형을 잡아줍니다." },
      johu: { urgentElement: "화", reading: "겨울 태생이라 따뜻한 기운을 보완하면 좋습니다." },
      daewoonSewoon: "현재 대운은 안정과 확장이 함께 오는 흐름입니다.",
      monthlyHighlights: { opportunity: ["4월", "9월"], caution: ["7월"] },
    },
    monthlyFlow,
    targetYear: { year: 2027, pillar: "정미", stem: "정", branch: "미", stemElement: "화", tenGod: "정관" },
  };
}
