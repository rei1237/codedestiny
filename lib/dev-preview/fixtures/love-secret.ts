import type { DevPreviewState } from "@/lib/dev-preview/core";

// worker/lib/love-secret-ai-prompt.js 의 LOVE_SECRET_AI_GROUPS 와 같은 제목·순서.
// 결과 화면의 그룹핑(app/love-secret-ai/result/love-secret-sections.ts)이 8개 그룹으로
// 접히는지 확인하려면 이 목록이 실제 계약과 어긋나면 안 된다.
const SECTION_TITLES = [
  "현재 관계의 자리와 질문의 핵심",
  "핵심 연애운 — 명식이 사랑에서 그리는 큰 결",
  "오행과 조후로 보는 감정의 온도",
  "나의 명식이 사랑에서 반복하는 방식",
  "십성으로 보는 애착과 표현 방식",
  "연애 장점 — 상대가 먼저 알아보는 힘",
  "연애 약점 — 반복해서 걸려 넘어지는 자리",
  "애정 표현 스타일과 연애 심리",
  "상대의 기운과 감정 거리감",
  "두 사람 사이 끌림이 살아나는 조건",
  "속궁합과 친밀감 리듬",
  "이상형 분석 — 내 명식이 끌리는 사람",
  "상대가 원하는 연애 스타일",
  "갈등의 뿌리와 회복 방식",
  "바람기와 마음이 흩어지는 조건",
  "재회 가능성과 그 조건",
  "피해야 할 선택과 자기 보호",
  "연락/고백/재회/관계 진전 타이밍",
  "올해 연애운 — 좋은 달과 조심할 달",
  "좋은 날짜 — 계산된 일진으로 고른 날",
  "결혼운과 인연이 굳어지는 시기",
  "30일 관계 흐름 처방",
  "썸에서 확신으로 가는 전략",
  "관계 단계별 실행 비책",
  "상대에게 다가가는 대화 문장",
  "매력적으로 보이는 방법 — 이미지·말투·스타일",
  "7일 실천 가이드",
  "마지막 상담사의 한마디",
];

function buildSections(): Array<{ title: string; body: string }> {
  return SECTION_TITLES.map((title) => ({
    title,
    body: [
      `**${title}**에서는 일간 병화의 결을 먼저 봅니다. 좋아하면 연락과 관심이 한 번에 늘어나는 현재형 연애라, 상대가 그 속도를 따라오기 전에 먼저 지치는 구간이 옵니다.`,
      "십성으로는 편재가 두터워 마음이 밖으로 빨리 향하고, 용신 수(水)가 닿는 자리에서 비로소 그 속도가 가라앉습니다. 지금은 서두르기보다 관계의 흐름을 차분히 지켜보는 편이 낫습니다.",
      "현재 대운이 표현을 밖으로 밀어 주는 결이라, 먼저 말을 꺼내는 선택 자체는 나쁘지 않습니다. 다만 확인을 서두르면 상대의 방어가 먼저 올라옵니다.",
    ].join("\n\n"),
  }));
}

// 좋은 날짜 카드는 LLM 문장이 아니라 서버가 계산한 일진을 그대로 렌더한다.
const PREVIEW_CALENDAR = {
  rangeStart: "2026-08-01",
  rangeEnd: "2026-10-29",
  best: [
    { date: "2026-09-08", weekday: "화", ganji: "乙酉", ganjiKo: "을유", grade: "최상", score: 80, tags: ["용신 수 기운", "일지와 육합"] },
    { date: "2026-09-20", weekday: "일", ganji: "丁酉", ganjiKo: "정유", grade: "최상", score: 74, tags: ["도화 지지"] },
    { date: "2026-08-15", weekday: "토", ganji: "辛酉", ganjiKo: "신유", grade: "좋음", score: 68, tags: ["일지와 삼합"] },
    { date: "2026-10-02", weekday: "금", ganji: "己酉", ganjiKo: "기유", grade: "좋음", score: 64, tags: ["용신 수 기운"] },
  ],
  caution: [
    { date: "2026-08-16", ganji: "壬戌", tags: ["기신 토 기운", "일지와 충"] },
    { date: "2026-09-06", ganji: "癸未", tags: ["공망 지지"] },
  ],
  monthlyFlow: [
    { monthLabel: "8월", avgScore: 49.1, grade: "보통" },
    { monthLabel: "9월", avgScore: 56.4, grade: "보통" },
    { monthLabel: "10월", avgScore: 47.9, grade: "보통" },
  ],
};

export function buildLoveSecretPreviewPayload(state: DevPreviewState) {
  if (state === "failed") {
    return {
      ok: false,
      status: "generation_failed",
      reason: "LLM_ERROR",
      message: "전문가 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 자동으로 복구됩니다.",
    };
  }

  // truncated = degraded. 6개 그룹 중 2개(self·risk)가 실패한 상태를 재현한다 —
  // 섹션이 통째로 빠져도 헤더·요약·실천 가이드가 살아 있어야 한다.
  const droppedTitles = new Set(SECTION_TITLES.slice(3, 8).concat(SECTION_TITLES.slice(13, 17)));
  const sections = state === "truncated"
    ? buildSections().filter((section) => !droppedTitles.has(section.title))
    : buildSections();

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
    userQuestion: "지금 고백해도 될까요, 아니면 조금 더 기다리는 게 나을까요?",
    createdAt: "2026-08-01T09:00:00.000Z",
    keywords: ["끌림", "타이밍", "진심"],
    strategy: "서두르지 않고 신뢰를 쌓는 접근이 지금은 가장 유효합니다.",
    sections,
    pdfSections: [],
    finalLine: "지금의 속도가 두 사람에게 맞는 속도입니다. 오늘은 확인 대신 온기를 하나 남기세요.",
    sajuSummary: {
      consultationMode: state === "truncated" ? "solo" : "with_partner",
      uncertainty: [],
      calendar: PREVIEW_CALENDAR,
      myChart: {
        yearPillar: "己巳",
        monthPillar: "戊辰",
        dayPillar: "丙午",
        hourPillar: "壬辰",
        dayMaster: "丙",
        fiveElements: { 목: 0.35, 화: 3.05, 토: 3.4, 금: 0.7, 수: 1.5 },
        tenGods: { 비견: 2, 식신: 1.4, 편재: 1.05, 정관: 0.7, 편인: 0.35 },
        lovePattern: "좋아하면 연락과 관심이 폭발적으로 늘어나는 현재형 연애 스타일입니다.",
        strength: "일간의 기운이 강한 편",
        gyeokguk: "식신격",
        currentMajorLuck: "31~40세 壬申 (편관)",
        shinsalLines: [
          "도화살: 일지 午(오) — 기신 연결",
          "홍염살: 년지 巳(사) — 중립 보조",
          "천을귀인: 시지 辰(진) — 용신 연결",
        ],
        reference: {
          dayElement: "fire",
          dominantElement: "earth",
          deficientElement: "wood",
          dominantTenGod: "비견",
          yongshinElement: "water",
          dayElementLabel: "화",
          dominantElementLabel: "토",
          deficientElementLabel: "목",
          yongshinElementLabel: "수",
          dayMasterLabel: "병(丙)",
        },
      },
      partnerChart: state === "truncated" ? null : {
        yearPillar: "辛未",
        monthPillar: "丁酉",
        dayPillar: "癸卯",
        hourPillar: "壬戌",
        dayMaster: "癸",
        fiveElements: { 목: 1.7, 화: 1.35, 토: 2.4, 금: 2, 수: 1.55 },
        tenGods: { 식신: 1.4, 편관: 1.05, 정인: 1.4, 비견: 0.7 },
        lovePattern: "분위기를 읽고 상대가 먼저 다가오게 만드는 부드러운 접근을 잘합니다.",
        strength: "일간의 기운이 비교적 균형을 이룬 편",
        gyeokguk: "편인격",
        reference: {
          dayElement: "water",
          dominantElement: "earth",
          deficientElement: "화",
          dominantTenGod: "정인",
          yongshinElement: "wood",
          dayElementLabel: "수",
          dominantElementLabel: "토",
          deficientElementLabel: "화",
          yongshinElementLabel: "목",
          dayMasterLabel: "계(癸)",
        },
      },
      compatibility: state === "truncated" ? null : {
        summary: "화 기운과 수 기운이 마주 서 서로의 온도를 빠르게 바꿉니다. 일지끼리 육합이라 함께 있으면 긴장이 풀리고 대화가 길어집니다.",
        attractionPattern: "두 일간이 제어 관계라 주도권 다툼이 생기기 쉽습니다. 상대 지지가 내 도화에 닿아 끌림이 먼저 올라옵니다.",
        conflictPattern: "갈등은 애정 부족이 아니라 확인 속도의 차이에서 옵니다.",
        stability: "안정성은 연락 간격과 대화의 온도를 서로가 감당 가능한 수준으로 맞출 때 높아집니다.",
      },
    },
    reading: {
      summaryTitle: "민준님의 연애 비책",
      oneLineDiagnosis: "지금은 서두르지 않는 편이 유리한 흐름입니다.",
      relationshipTemperature: "따뜻하지만 아직 조심스러운 온도",
      finalMessage: "지금까지 잘해왔습니다. 조급해하지 않아도 괜찮아요.",
      monthlyHighlights: {
        best: ["9월 — 용신 수가 닿는 달"],
        caution: ["8월 — 공망이 겹치는 달"],
      },
      luckyDates: PREVIEW_CALENDAR.best.map((day) => ({ date: day.date, ganji: day.ganji, why: day.tags.join(" · ") })),
      actionSecrets: state === "truncated" ? ["[쉬움·오늘] 가벼운 안부 연락부터 시작하세요 (근거: 대운 임수가 속도를 눌러 준다)"] : [
        "[쉬움·오늘] 가벼운 안부 연락부터 시작하세요 (근거: 대운 임수가 속도를 눌러 준다)",
        "[보통·이번 주] 공통 관심사로 약속을 제안하세요 (근거: 일지 오화와 육합)",
        "[보통·이번 주] 답장 속도를 상대 리듬에 맞춰 반 박자 늦추세요 (근거: 상대 일간 계수는 재촉당하면 닫힌다)",
        "[도전·이번 달] 관계의 방향을 직접 물어보세요 (근거: 세운 천간이 정관으로 들어온다)",
        "[쉬움·오늘] 밝은 색 옷으로 첫인상을 정돈하세요 (근거: 용신 수를 보완하는 개운 색)",
      ],
      sevenDayGuide: [
        "1일차 안부 한 줄만 보내고 답을 재촉하지 않기 (근거: 일간 병화의 속도 조절)",
        "2일차 공통 관심사를 하나 찾아 두기 (근거: 식신이 대화를 여는 축)",
        "3일차 낮 시간대 짧은 약속 제안하기 (근거: 용신 수가 닿는 시간)",
        "4일차 상대의 반응을 해석하지 말고 그대로 두기 (근거: 편관 대운의 압박 성향)",
        "5일차 내 생활 리듬을 회복하는 약속 하나 지키기 (근거: 일간 강약 운영)",
        "6일차 다음 대화에서 피할 표현 정리하기 (근거: 일지 도화의 오해 유발)",
        "7일차 관계를 이어 갈 기준과 멈출 기준 나란히 세우기 (근거: 정관의 경계 감각)",
      ],
      thirtyDayFlow: "초반 2주는 신뢰를 쌓고, 후반 2주는 관계를 한 단계 발전시키는 흐름입니다.",
    },
  };
}
