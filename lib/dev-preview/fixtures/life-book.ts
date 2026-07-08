import type { DevPreviewState } from "@/lib/dev-preview/core";

const CHAPTER_TITLES = [
  "타고난 사주의 원형",
  "성격과 내면의 작동 방식",
  "재능과 일의 방향",
  "사랑과 인연",
  "재물과 현실 기반",
  "건강과 몸의 리듬",
  "가족과 뿌리",
  "위기와 극복의 패턴",
  "대운으로 보는 인생의 큰 장면",
  "가까운 시기의 세운 조언",
];

function buildChapterContent(index: number): string {
  const base = `${index + 1}번째 장에서는 사주 원국과 오행의 흐름을 바탕으로 이 시기의 특징을 자세히 살펴봅니다. `;
  return (base + "타고난 기질과 지금의 흐름이 어떻게 맞물리는지, 실제 생활에서 어떤 모습으로 드러나는지 구체적인 장면으로 풀어드립니다. ").repeat(4);
}

function buildSuccessReport() {
  return {
    title: "인생의 책",
    subtitle: "타고난 사주와 시간의 흐름으로 읽는 삶의 장면",
    profileSummary: { name: "민준", birthDate: "1989-04-12", calendarType: "양력", birthTime: "08:30", gender: "남성" },
    coreSummary: {
      oneLine: "안정 속에서 꾸준히 성장하는 흐름을 타고난 사람입니다.",
      lifeTheme: "신뢰를 쌓아 확장하는 삶",
      strongestElement: "토(土)",
      neededBalance: "목(木)의 유연함",
    },
    chapters: CHAPTER_TITLES.map((title, index) => ({
      chapterNumber: index + 1,
      title,
      summary: `${title}의 핵심 요약입니다.`,
      content: buildChapterContent(index),
      advice: ["작은 습관부터 꾸준히 이어가세요.", "가까운 사람과의 대화를 자주 나누세요."],
    })),
    expertReadings: [
      { title: "오행 전문가 리딩", content: "토(土) 기운이 강해 안정감이 있지만, 변화가 필요한 시기엔 목(木)의 유연함을 빌리는 게 좋습니다. ".repeat(5), guidance: ["환경 변화에 유연하게 대응하세요."] },
      { title: "십신 전문가 리딩", content: "정관과 정재가 함께 자리해 신뢰를 기반으로 한 성취가 두드러집니다. ".repeat(5), guidance: ["신뢰 관계를 우선하세요."] },
      { title: "대운 전문가 리딩", content: "현재 대운은 안정기를 지나 확장기로 접어드는 흐름입니다. ".repeat(5), guidance: ["새로운 시도를 시작하기 좋은 시기입니다."] },
      { title: "세운 전문가 리딩", content: "올해는 그동안 쌓아온 신뢰가 실질적 성과로 이어지는 해입니다. ".repeat(5), guidance: ["미뤄둔 결정을 실행에 옮기세요."] },
    ],
    finalMessage: "지금까지의 흐름을 믿고, 꾸준함이라는 무기로 다음 장을 써 내려가시길 바랍니다.",
  };
}

export function buildLifeBookPreviewPayload(state: DevPreviewState) {
  if (state === "failed") {
    return {
      ok: false,
      status: "generation_failed",
      reason: "LLM_ERROR",
      message: "인생의 책 상담문을 생성하는 중 문제가 발생했어요. 자동으로 복구됩니다.",
    };
  }

  const report = buildSuccessReport();
  const sajuResult = {
    yearPillar: "기사", monthPillar: "무진", dayPillar: "경신", hourPillar: "병술",
    dayMaster: "경금", strength: "신강", usefulGod: "화", unfavorableGod: "수",
    fiveElements: { 목: 1, 화: 2, 토: 3, 금: 2, 수: 0 },
    tenGods: { 정관: 2, 정재: 1, 식신: 1 },
  };

  if (state === "truncated") {
    // 챕터 1~8은 완결, 챕터 9(마지막 직전)의 content를 닫는 따옴표 없이 절단해 원문 그대로
    // degrade 저장되는 실제 케이스를 재현한다(hasRenderableLlmText 기준 400자는 훌쩍 넘음).
    const truncatedChapters = report.chapters.slice(0, 8);
    const serializedTail = JSON.stringify({ chapters: report.chapters.slice(8) });
    const cutIndex = serializedTail.indexOf(buildChapterContent(8).slice(0, 40)) + 40;
    const brokenTail = serializedTail.slice(0, cutIndex > 40 ? cutIndex : serializedTail.length / 2);
    const rawContent = `${JSON.stringify({ ...report, chapters: truncatedChapters })}${brokenTail}`;
    return {
      ok: true,
      status: "completed",
      title: report.title,
      topic: "종합운",
      birthInfo: { name: "민준", gender: "male", birthDate: "1989-04-12", birthTime: "08:30", calendarType: "solar" },
      sajuResult,
      reportJson: null,
      messages: [{ role: "assistant", content: rawContent, createdAt: "2026-07-08T09:00:00.000Z" }],
    };
  }

  return {
    ok: true,
    status: "completed",
    title: report.title,
    topic: "종합운",
    birthInfo: { name: "민준", gender: "male", birthDate: "1989-04-12", birthTime: "08:30", calendarType: "solar" },
    sajuResult,
    reportJson: report,
    messages: [{ role: "assistant", content: JSON.stringify(report), createdAt: "2026-07-08T09:00:00.000Z" }],
  };
}
