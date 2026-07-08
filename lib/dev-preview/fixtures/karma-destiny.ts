import type { DevPreviewState } from "@/lib/dev-preview/core";

const CHAPTER_TITLES = [
  "인연의 시작점", "반복되는 관계 패턴", "이번 생의 과제", "가족과의 업",
  "일과 재물의 흐름", "건강과 몸의 신호", "감정의 뿌리", "관계에서 반복되는 상처",
  "재회와 이별의 패턴", "돈과 관련된 업", "직업적 소명", "사람을 대하는 태도",
  "위기의 순간들", "회복의 실마리", "지금 풀어야 할 매듭", "다음 생으로 이어지는 숙제",
];

function buildChapterContent(index: number): string {
  return (`${CHAPTER_TITLES[index]}에 대해 살펴보면, 이번 생에서 반복적으로 마주하는 패턴이 뚜렷하게 드러납니다. 과거의 경험이 지금의 선택에 어떤 영향을 주고 있는지, 그리고 이 흐름을 어떻게 풀어나가야 할지 구체적으로 짚어드립니다. `).repeat(6);
}

function buildChapters() {
  return CHAPTER_TITLES.map((title, index) => ({
    id: `chapter-${String(index + 1).padStart(2, "0")}`,
    order: index + 1,
    title,
    content: buildChapterContent(index),
    summary: `${title}의 핵심 요약입니다.`,
    keyTakeaways: ["반복 패턴을 인식하는 것이 첫걸음입니다.", "작은 선택이 흐름을 바꿉니다."],
    highlightQuotes: [`"${title}은 지금 다시 마주할 시기입니다."`],
    charCount: 500,
  }));
}

export function buildKarmaDestinyPreviewPayload(state: DevPreviewState) {
  if (state === "failed" || state === "truncated") {
    // 이 기능은 초기 16장 배치 생성 경로에 degrade 경로가 없어(항상 완전실패로 감),
    // truncated도 failed와 동일한 페이로드로 재현한다.
    return {
      ok: true,
      status: "generation_failed",
      sessionId: "dev-preview-karma",
      chapters: [],
      generationProgress: { totalChapters: 16, completedChapters: 0, percent: 0, stageLabel: "생성 실패" },
    };
  }

  return {
    ok: true,
    status: "completed",
    sessionId: "dev-preview-karma",
    reportId: "dev-preview-karma",
    generatedAt: "2026-07-08T09:00:00.000Z",
    totalCharCount: 8000,
    userInput: {
      name: "민준",
      gender: "male",
      birthDate: "1989-04-12",
      birthTime: "08:30",
      calendarType: "solar",
      topic: "반복되는 관계 패턴",
      question: "왜 자꾸 비슷한 사람을 만나게 될까요?",
    },
    summaryCards: {
      keywords: ["업의 매듭", "관계의 반복", "현실 전략"],
      repeatingPattern: "신뢰를 먼저 주고 상처받는 패턴이 반복됩니다.",
      currentTask: "이번 생에서는 스스로를 먼저 지키는 법을 배우는 것이 과제입니다.",
    },
    chapters: buildChapters(),
    finalLetter: "지금까지의 흐름을 이해했다면, 이제는 반복을 끊어낼 준비가 된 것입니다.",
    qualityCheck: { passed: true, totalCharCount: 8000, chapterCount: 16, promptLeakDetected: false },
    generationProgress: { totalChapters: 16, completedChapters: 16, percent: 100, stageLabel: "완료" },
  };
}
