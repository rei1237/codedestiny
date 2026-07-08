import type { DevPreviewState } from "@/lib/dev-preview/core";

const MONTH_DOMAINS = ["가족", "재물", "직업", "연애", "건강", "학업", "관계", "휴식", "확장", "정리", "준비", "결실"];

function buildMonthlyFlow() {
  return Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    pillar: `${["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"][index % 10]}${["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"][index]}`,
    element: ["목", "화", "토", "금", "수"][index % 5],
    tenGod: ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"][index % 10],
    domain: MONTH_DOMAINS[index],
    relationToDayBranch: index % 3 === 0 ? "합" : index % 3 === 1 ? "충" : "평",
    timing: index < 6 ? "상반기" : "하반기",
  }));
}

function buildSuccessText(): string {
  // NewYearAiClient의 splitAssistantSections는 빈 줄(\n{2,})로만 섹션을 나누고, 같은 청크 안의
  // 첫 줄을 제목으로 인식한다 — 제목과 본문 사이에 빈 줄을 넣으면 둘이 분리되어 "새해 상담 편지 N"
  // 식 제목 없는 조각으로 쪼개진다. 월 사이에만 빈 줄을 두고, 제목-본문은 단일 개행으로 묶는다.
  const paragraphs = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    return `**${month}월 — ${MONTH_DOMAINS[index]}의 달**\n${month}월에는 ${MONTH_DOMAINS[index]} 영역에서 뚜렷한 흐름이 느껴집니다. 무리하게 밀어붙이기보다 자연스러운 흐름을 따라가시는 편이 좋습니다. 특히 이 시기엔 주변 사람들과의 관계를 챙기면 좋은 기운을 더 크게 받을 수 있어요.`;
  });
  return paragraphs.join("\n\n");
}

export function buildNewYearPreviewPayload(state: DevPreviewState) {
  if (state === "failed") {
    return { ok: false, reason: "LLM_ERROR", message: "AI 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 같은 요청 권한으로 다시 이어집니다." };
  }

  const fullText = buildSuccessText();
  const content = state === "truncated" ? `${fullText.slice(0, 2400)}그리고 이 시기에는 안전한 곳에` : fullText;

  return {
    ok: true,
    sessionId: "dev-preview-new-year",
    accessType: "pass",
    status: "ready",
    messages: [{ role: "assistant" as const, content, createdAt: "2026-07-08T09:00:00.000Z" }],
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
    monthlyFlow: buildMonthlyFlow(),
    targetYear: { year: 2027, pillar: "정미", stem: "정", branch: "미", stemElement: "화", tenGod: "정관" },
  };
}
