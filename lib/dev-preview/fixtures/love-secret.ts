import type { DevPreviewState } from "@/lib/dev-preview/core";

const SECTION_TITLES = [
  "현재 관계의 자리와 질문의 핵심",
  "나의 명식이 사랑에서 반복하는 방식",
  "상대의 기운과 감정 거리감",
  "두 사람 사이 끌림이 살아나는 조건",
  "오행과 조후로 보는 감정의 온도",
  "갈등이 반복되는 패턴",
  "지금 이 시기의 타이밍",
  "다가가는 단계별 비책",
  "대화에서 주의할 점",
  "스스로를 지키는 경계선",
  "7일 실천 가이드",
  "30일 흐름 예측",
  "관계를 지키는 습관",
  "다시 가까워지는 신호",
  "마지막 조언",
];

function buildSections(): Array<{ title: string; body: string }> {
  return SECTION_TITLES.map((title) => ({
    title,
    body: `${title}에 대해 사주와 현재 상황을 함께 짚어보면, 지금은 서두르기보다 관계의 흐름을 차분히 지켜보는 편이 좋습니다. 작은 행동 하나가 관계의 온도를 바꿀 수 있는 시기예요.`,
  }));
}

export function buildLoveSecretPreviewPayload(state: DevPreviewState) {
  if (state === "failed") {
    return {
      ok: false,
      status: "generation_failed",
      reason: "LLM_ERROR",
      message: "AI 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 자동으로 복구됩니다.",
    };
  }

  // 이 기능은 degrade 경로가 없어(구형 callGeminiText, 잘림 자동재시도 없음) truncated는
  // 실제로는 발생할 수 없는 "파싱은 되지만 필드가 부실한" 방어 렌더링 확인용 시나리오로 재현한다.
  const sections = state === "truncated" ? buildSections().slice(0, 5) : buildSections();

  return {
    ok: true,
    status: "completed",
    id: "dev-preview-love-secret",
    sessionId: "dev-preview-love-secret",
    accessType: "pass",
    myInfo: { name: "민준", gender: "male", birthDate: "1989-04-12", calendarType: "solar" },
    partnerInfo: state === "truncated" ? null : { name: "서연", gender: "female", birthDate: "1991-09-03", calendarType: "solar" },
    relationshipStatus: "썸",
    topic: "호감을 확신으로 바꾸는 법",
    createdAt: "2026-07-08T09:00:00.000Z",
    keywords: ["끌림", "타이밍", "진심"],
    strategy: "서두르지 않고 신뢰를 쌓는 접근이 지금은 가장 유효합니다.",
    sections,
    pdfSections: sections,
    finalLine: "지금의 속도가 두 사람에게 맞는 속도입니다.",
    reading: {
      summaryTitle: "호감에서 확신으로",
      oneLineDiagnosis: "지금은 서두르지 않는 편이 유리한 흐름입니다.",
      relationshipTemperature: "따뜻하지만 아직 조심스러운 온도",
      finalMessage: "지금까지 잘해왔습니다. 조급해하지 않아도 괜찮아요.",
      actionSecrets: state === "truncated" ? ["[낮음·이번주] 가벼운 안부 연락부터 시작하세요 (근거:조후 미약)"] : [
        "[낮음·이번주] 가벼운 안부 연락부터 시작하세요 (근거:조후 미약)",
        "[중간·2주내] 공통 관심사로 약속을 제안하세요 (근거:오행 상생)",
        "[중간·이번달] 진심을 담은 대화 시간을 만드세요 (근거:십신 정관)",
        "[높음·다음달] 관계의 방향을 직접 물어보세요 (근거:대운 전환)",
        "[높음·분기내] 함께하는 일상을 만들어보세요 (근거:조후 안정)",
      ],
      sevenDayGuide: ["가벼운 연락", "공통 관심사 찾기", "약속 제안", "진심 대화", "거리 좁히기", "신뢰 쌓기", "다음 단계 준비"],
      thirtyDayFlow: "초반 2주는 신뢰를 쌓고, 후반 2주는 관계를 한 단계 발전시키는 흐름입니다.",
    },
  };
}
