const METHOD_LABELS = Object.freeze({
  saju: "사주",
  ziwei: "자미두수",
  vedic: "베다점",
  astrology: "점성술",
});

const METHOD_WRITING_GUIDES = Object.freeze({
  saju: {
    title: "사주 작전 브리핑",
    concept: "내가 어떤 무기를 들고 태어났는가, 그리고 그 무기를 제대로 쓰고 있는가.",
    focus: ["일간 성향", "월령/계절감", "오행 균형", "십성 구조", "강한 기운과 약한 기운", "반복되는 선택 습관", "연애/직업/돈/인간관계별 작전", "계산 가능한 대운/세운/월운", "오늘부터 바꿔야 할 행동"],
    tone: ["네가 약해서 흔들리는 게 아니다. 네 무기를 이상한 방식으로 쓰고 있는 거다.", "사주는 네가 들고 태어난 무기를 보여준다. 문제는 그걸 제대로 쓰고 있느냐다.", "운이 들어올 틈을 같은 습관으로 막고 있다면, 먼저 그 습관부터 끊어야 한다."],
  },
  ziwei: {
    title: "자미두수 운명 지휘도",
    concept: "내 인생판에서 어느 궁이 힘을 잃고 있고, 어디를 다시 세워야 하는가.",
    focus: ["명궁: 삶의 중심", "신궁: 실제 행동 방식", "관록궁: 일과 사회적 역할", "재백궁: 돈을 다루는 방식", "부처궁: 관계와 연애 흐름", "복덕궁: 멘탈과 회복력", "궁별로 지금 밀리는 자리", "지금 살려야 할 궁", "삶의 우선순위 재배치"],
    tone: ["네 문제는 능력이 없는 게 아니다. 인생판에서 힘을 써야 할 자리를 잘못 잡고 있는 거다.", "명궁은 네 중심이고, 복덕궁은 버티는 힘이다. 둘 중 하나가 흔들리면 선택도 흔들린다.", "지금은 모든 궁을 동시에 살리려 하지 말고, 먼저 무너진 중심부터 다시 세워야 한다."],
  },
  vedic: {
    title: "베다점 카르마 브리핑",
    concept: "내가 왜 같은 사람, 같은 상황, 같은 불안으로 반복해서 돌아가는가.",
    focus: ["라그나: 세상에 서는 방식", "문 사인: 마음이 반응하는 방식", "나크샤트라: 깊은 습관과 끌림", "계산 가능한 다샤 또는 주요 흐름", "반복해서 끌리는 사람/상황", "관계에서 되풀이되는 감정", "삶의 주제와 카르마적 과제", "현실적인 교정 작전"],
    tone: ["너는 우연히 같은 장면으로 돌아가는 게 아니다. 익숙한 불안을 운명처럼 붙잡고 있는 거다.", "라그나는 네가 세상 앞에 서는 방식이고, 나크샤트라는 마음 깊은 곳의 흔적이다.", "이 흐름은 너를 벌주려는 게 아니라, 같은 선택을 이제는 다르게 보라고 밀어붙이는 것이다."],
  },
  astrology: {
    title: "점성술 심리 작전",
    concept: "내 마음과 욕망의 궤도가 어디서 충돌하고 있는가.",
    focus: ["태양: 내가 향하는 방향", "달: 감정과 불안 반응", "상승궁: 세상에 보이는 방식", "금성: 사랑받고 싶은 방식", "화성: 싸우고 밀어붙이는 방식", "수성: 생각과 말의 패턴", "주요 하우스", "주요 애스펙트", "계산 가능한 현재 트랜짓", "관계/일/멘탈에서 반복되는 심리"],
    tone: ["별은 핑계가 아니다. 네 마음이 왜 같은 궤도로 돌아가는지 보여주는 지도다.", "태양은 네가 향하는 방향이고, 달은 네가 흔들리는 방식이다.", "지금 필요한 건 감정을 없애는 게 아니라, 감정이 네 선택을 대신하지 못하게 하는 것이다."],
  },
});

function clean(value, maxLength = 0) {
  const text = String(value ?? "").trim();
  return maxLength > 0 ? text.slice(0, maxLength) : text;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function extractJsonObject(text) {
  const raw = clean(text);
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) {
    const error = new Error("Neo briefing JSON was not found");
    error.code = "LLM_RESPONSE_INVALID";
    throw error;
  }
  return JSON.parse(raw.slice(start, end + 1));
}

function normalizeEvidence(input, methodSummary) {
  const method = clean(input?.selectedMethod || methodSummary?.method, 30);
  const label = METHOD_LABELS[method] || method;
  const fallback = clean(methodSummary?.evidenceSummary || methodSummary?.summary, 900);
  if (!fallback) return [];
  return [{ method, label: `${label} 근거`, summary: fallback }];
}

export function buildNeoOperationRoomInitialPrompt(input, methodSummary) {
  const selectedMethod = clean(input?.selectedMethod, 30);
  const methodLabel = METHOD_LABELS[selectedMethod] || selectedMethod;
  const writingGuide = METHOD_WRITING_GUIDES[selectedMethod] || {
    title: methodLabel,
    concept: "선택한 술수의 계산 요약을 현실 작전으로 바꾼다.",
    focus: ["계산 요약에서 확인되는 핵심 근거", "반복되는 선택", "오늘 바꿔야 할 행동"],
    tone: ["운은 핑계가 아니라 흐름을 다시 읽는 지도다."],
  };
  return [
    "너는 '네오의 팩폭 작전실'의 사자 장군 네오다.",
    "역할은 위로가 아니라 진단과 작전 재정비다.",
    "말투는 직설적이고 차갑지만, 사용자를 깎아내리거나 조롱하지 않는다.",
    "입력된 계산 요약 데이터만 근거로 삼고, 생년월일을 직접 점치는 척하거나 없는 계산값을 만들지 않는다.",
    "계산 요약 데이터에 없는 항목은 지어내지 말고, 필요하면 '현재 계산 가능한 범위에서 해석했다'고 자연스럽게 밝힌다.",
    "methodEvidence와 술수별 판단은 반드시 [계산 요약 데이터] 안에 실제로 존재하는 항목만 근거로 삼는다.",
    "개발자식 장애 지점 표현은 쓰지 말고 '막힌 지점', '흔들리는 자리', '어긋난 흐름', '운이 새는 틈', '전선이 밀리는 곳', '반복되는 선택', '흐려진 판단', '놓친 신호', '다시 잡아야 할 기준' 같은 상담 언어를 쓴다.",
    "mock, dry-run, provider, system, prompt 같은 내부 구현 단어를 결과에 쓰지 않는다.",
    "이 기능은, 이 결과는, 분석 결과는, 리포트 항목, 콘텐츠 블록 같은 제품 설명식 문장을 쓰지 않는다.",
    "반드시 JSON 객체 하나만 반환한다. 마크다운 코드블록과 설명 문장은 금지한다.",
    "",
    "[사용자 입력]",
    JSON.stringify({
      selectedMethod,
      methodLabel,
      topic: input?.topic || "",
      intensity: input?.intensity || "",
      question: input?.question || "",
      birthTimeUnknown: input?.birthInfo?.birthTimeUnknown === true,
    }),
    "",
    "[계산 요약 데이터]",
    JSON.stringify(methodSummary || {}),
    "",
    "[선택 술수 작성 지침]",
    JSON.stringify(writingGuide),
    "",
    "[반환 JSON 스키마]",
    JSON.stringify({
      version: 1,
      documentType: "initial_briefing",
      selectedMethod,
      operationTitle: "작전명",
      neoOpening: "네오의 첫 판단",
      frontlineSummary: "현재 운명의 전선 요약",
      repeatedChoice: {
        title: "반복되는 선택 제목",
        description: "사용자가 반복하기 쉬운 선택 방식",
      },
      originalStrategy: {
        title: "본래 너는 이렇게 움직여야 한다",
        description: "타고난 구조상 힘이 나는 방식",
        keyRules: ["규칙"],
      },
      misalignedFlow: {
        title: "지금 흐름이 어긋난 자리",
        description: "현재 삶에서 어긋난 지점",
      },
      methodEvidence: [
        {
          method: selectedMethod,
          label: `${methodLabel} 근거`,
          summary: "계산 요약에서 확인되는 근거",
        },
      ],
      bluntTruth: "네오의 팩폭",
      forbiddenAction: {
        title: "오늘 금지 행동",
        reason: "왜 금지해야 하는지",
      },
      actionOrders: ["바로 해야 할 작전 1", "바로 해야 할 작전 2", "바로 해야 할 작전 3"],
      sevenDayMission: [
        { day: 1, mission: "1일차 작전" },
        { day: 2, mission: "2일차 작전" },
        { day: 3, mission: "3일차 작전" },
        { day: 4, mission: "4일차 작전" },
        { day: 5, mission: "5일차 작전" },
        { day: 6, mission: "6일차 작전" },
        { day: 7, mission: "7일차 작전" },
      ],
      thirtyDayStrategy: ["1주차 전략", "2주차 전략", "3주차 전략", "4주차 전략"],
      realityCheckQuestions: [
        {
          question: "현실 점검 질문",
          whyItMatters: "왜 중요한지",
        },
      ],
      badge: {
        name: "사자 휘장 이름",
        description: "휘장 설명",
      },
      tsundereClosing: "네오의 마지막 츤데레 한마디",
    }),
    "",
    "각 문자열은 한국어로 작성한다.",
    "결과는 네오가 사용자에게 직접 말하는 상담 문장으로 쓴다.",
    "전체 흐름은 진단 → 반복 선택 → 술수 근거 → 금지 행동 → 7일 작전 → 30일 전략 순서로 자연스럽게 이어지게 한다.",
    "선택 술수 작성 지침의 focus 중 계산 요약 데이터에서 확인 가능한 항목을 우선 반영한다.",
    "methodEvidence는 선택한 술수의 실제 계산 요약 근거만 1~4개로 만든다.",
    "realityCheckQuestions는 2~4개로 만든다.",
    "keyRules는 3~5개로 만든다.",
    "actionOrders는 정확히 3개로 만든다.",
    "sevenDayMission은 day 1부터 7까지 반드시 7개로 만든다.",
    "thirtyDayStrategy는 4개로 만든다.",
    "tsundereClosing은 반드시 현실 점검과 2차 수정 작전 명령서로 이어지게 쓴다.",
  ].join("\n");
}

export function parseNeoOperationRoomBriefingResponse(text, input, methodSummary) {
  const parsed = extractJsonObject(text);
  const selectedMethod = clean(parsed.selectedMethod || input?.selectedMethod, 30);
  const repeatedChoice = firstObject(parsed.repeatedChoice || parsed.repeatedPattern);
  const misalignedFlow = firstObject(parsed.misalignedFlow || parsed.currentProblem);
  const frontlineSummary = clean(parsed.frontlineSummary || parsed.coreDiagnosis, 1800);
  const briefing = {
    version: 1,
    documentType: "initial_briefing",
    selectedMethod,
    operationTitle: clean(parsed.operationTitle, 120),
    neoOpening: clean(parsed.neoOpening, 700),
    frontlineSummary,
    coreDiagnosis: frontlineSummary,
    repeatedChoice: {
      title: clean(repeatedChoice.title || "반복되는 선택", 120),
      description: clean(repeatedChoice.description, 1600),
    },
    repeatedPattern: {
      title: clean(repeatedChoice.title || "반복되는 선택", 120),
      description: clean(repeatedChoice.description, 1600),
    },
    originalStrategy: {
      title: clean(firstObject(parsed.originalStrategy).title || "본래 너는 이렇게 움직여야 한다", 120),
      description: clean(firstObject(parsed.originalStrategy).description, 1800),
      keyRules: safeArray(firstObject(parsed.originalStrategy).keyRules).map((item) => clean(item, 220)).filter(Boolean).slice(0, 6),
    },
    misalignedFlow: {
      title: clean(misalignedFlow.title || "지금 흐름이 어긋난 자리", 120),
      description: clean(misalignedFlow.description, 1800),
    },
    currentProblem: {
      title: clean(misalignedFlow.title || "지금 흐름이 어긋난 자리", 120),
      description: clean(misalignedFlow.description, 1800),
    },
    methodEvidence: safeArray(parsed.methodEvidence).map((item) => ({
      method: clean(firstObject(item).method || selectedMethod, 30),
      label: clean(firstObject(item).label, 120),
      summary: clean(firstObject(item).summary, 1000),
    })).filter((item) => item.summary).slice(0, 4),
    bluntTruth: clean(parsed.bluntTruth, 1200),
    forbiddenAction: {
      title: clean(firstObject(parsed.forbiddenAction).title, 120),
      reason: clean(firstObject(parsed.forbiddenAction).reason, 900),
    },
    actionOrders: safeArray(parsed.actionOrders).map((item) => clean(item, 280)).filter(Boolean).slice(0, 3),
    sevenDayMission: safeArray(parsed.sevenDayMission).map((item, index) => ({
      day: Number(firstObject(item).day) || index + 1,
      mission: clean(firstObject(item).mission, 320),
    })).filter((item) => item.mission).slice(0, 7),
    thirtyDayStrategy: safeArray(parsed.thirtyDayStrategy).map((item) => clean(item, 340)).filter(Boolean).slice(0, 4),
    realityCheckQuestions: safeArray(parsed.realityCheckQuestions).map((item) => ({
      question: clean(firstObject(item).question, 260),
      whyItMatters: clean(firstObject(item).whyItMatters, 700),
    })).filter((item) => item.question).slice(0, 5),
    badge: {
      name: clean(firstObject(parsed.badge).name, 80),
      description: clean(firstObject(parsed.badge).description, 700),
    },
    tsundereClosing: clean(parsed.tsundereClosing || parsed.nextStepPrompt, 700),
    nextStepPrompt: clean(parsed.nextStepPrompt || parsed.tsundereClosing, 700),
  };
  if (!briefing.methodEvidence.length) briefing.methodEvidence = normalizeEvidence(input, methodSummary);
  if (
    !briefing.operationTitle
    || !briefing.frontlineSummary
    || !briefing.bluntTruth
    || !briefing.forbiddenAction.title
    || briefing.actionOrders.length < 3
    || briefing.sevenDayMission.length < 7
    || !briefing.badge.name
    || !briefing.tsundereClosing
    || !briefing.realityCheckQuestions.length
  ) {
    const error = new Error("Neo briefing response is incomplete");
    error.code = "LLM_RESPONSE_INVALID";
    throw error;
  }
  return briefing;
}

export function buildNeoOperationRoomRefinedPrompt(consultation, realityCheck) {
  const selectedMethod = clean(consultation?.selectedMethod || consultation?.initialBriefing?.selectedMethod, 30);
  const methodLabel = METHOD_LABELS[selectedMethod] || selectedMethod;
  const writingGuide = METHOD_WRITING_GUIDES[selectedMethod] || {
    title: methodLabel,
    concept: "선택한 술수의 계산 요약과 사용자 현실 답변을 다시 맞춰 본다.",
    focus: ["사용자 답변에서 실제로 흔들린 자리", "버려야 할 선택 방식", "7일 안에 바꿀 행동"],
    tone: ["이제 같은 흐름을 다른 방식으로 다룰 때다."],
  };
  return [
    "너는 '네오의 팩폭 작전실'의 사자 장군 네오다.",
    "지금은 1차 작전 브리핑 이후, 사용자의 현실 점검 답변을 반영해 2차 수정 작전 명령서를 작성한다.",
    "v2는 v1의 반복이 아니다. 사용자가 인정한 부분, 반박한 부분, 더 중요하다고 밝힌 현실 문제를 반드시 반영해 진단을 보정한다.",
    "말투는 직설적이고 차갑지만 사용자를 비난하거나 조롱하지 않는다.",
    "계산 근거는 이미 저장된 methodSummary와 initialBriefing 안에서만 사용한다. 없는 계산값을 새로 만들지 않는다.",
    "계산 요약 데이터에 없는 항목은 지어내지 말고, 필요하면 '현재 계산 가능한 범위에서 해석했다'고 자연스럽게 밝힌다.",
    "사용자가 고른 체크 항목이나 자유 입력 중 최소 하나는 neoReview의 첫 문단에서 직접 짚고 지나간다.",
    "2차 명령서는 1차 브리핑을 반복하지 말고, 사용자의 인정·반박·현실 변수를 반영해 작전을 조정한다.",
    "개발자식 장애 지점 표현은 쓰지 말고 '막힌 지점', '흔들리는 자리', '어긋난 흐름', '운이 새는 틈', '전선이 밀리는 곳', '반복되는 선택', '흐려진 판단', '놓친 신호', '다시 잡아야 할 기준' 같은 상담 언어를 쓴다.",
    "mock, dry-run, provider, system, prompt 같은 내부 구현 단어를 결과에 쓰지 않는다.",
    "이 기능은, 이 결과는, 분석 결과는, 리포트 항목, 콘텐츠 블록 같은 제품 설명식 문장을 쓰지 않는다.",
    "반드시 JSON 객체 하나만 반환한다. 마크다운 코드블록과 설명 문장은 금지한다.",
    "",
    "[상담 맥락]",
    JSON.stringify({
      selectedMethod,
      methodLabel,
      topic: consultation?.topic || "",
      intensity: consultation?.intensity || "",
      originalQuestion: consultation?.question || "",
    }),
    "",
    "[1차 작전 브리핑]",
    JSON.stringify(consultation?.initialBriefing || {}),
    "",
    "[계산 요약 데이터]",
    JSON.stringify(consultation?.methodSummary || {}),
    "",
    "[선택 술수 작성 지침]",
    JSON.stringify(writingGuide),
    "",
    "[사용자 현실 점검 답변]",
    JSON.stringify({
      selectedChecks: safeArray(realityCheck?.selectedChecks),
      freeform: realityCheck?.freeform || "",
    }),
    "",
    "[반환 JSON 스키마]",
    JSON.stringify({
      version: 2,
      documentType: "refined_order",
      selectedMethod,
      operationTitle: "수정 작전명",
      neoReview: "네오의 재판단",
      actualStuckPoint: {
        title: "실제로 흔들리던 지점",
        description: "실제 문제",
      },
      updatedDiagnosis: "수정된 진단",
      discardThis: ["버려야 할 방식"],
      newLifeStrategy: {
        title: "새 인생 전략",
        description: "현실에 맞게 조정된 전략",
        principles: ["원칙"],
      },
      forbiddenAction: {
        title: "오늘 금지 행동",
        reason: "금지 이유",
      },
      sevenDayMission: [
        { day: 1, mission: "1일차 작전" },
      ],
      thirtyDayStrategy: ["30일 전략"],
      badge: {
        name: "휘장 이름",
        description: "휘장 설명",
      },
      tsundereClosing: "네오의 마지막 한마디",
    }),
    "",
    "discardThis는 3~5개로 만든다.",
    "newLifeStrategy.principles는 3~5개로 만든다.",
    "sevenDayMission은 day 1부터 7까지 반드시 7개로 만든다.",
    "thirtyDayStrategy는 4~6개로 만든다.",
    "badge.name은 오늘의 사자 휘장 이름처럼 짧고 상징적으로 쓴다.",
    "결과는 네오가 사용자에게 직접 말하는 상담 문장으로 쓴다.",
    "neoReview에는 사용자의 체크 답변 또는 자유 입력 중 최소 하나를 직접 반영해 재판단을 시작한다.",
  ].join("\n");
}

export function parseNeoOperationRoomRefinedResponse(text, consultation) {
  const parsed = extractJsonObject(text);
  const selectedMethod = clean(parsed.selectedMethod || consultation?.selectedMethod, 30);
  const actualStuckPoint = firstObject(parsed.actualStuckPoint || parsed.realBottleneck);
  const refined = {
    version: 2,
    documentType: "refined_order",
    selectedMethod,
    operationTitle: clean(parsed.operationTitle, 120),
    neoReview: clean(parsed.neoReview, 1400),
    actualStuckPoint: {
      title: clean(actualStuckPoint.title || "실제로 흔들리던 지점", 120),
      description: clean(actualStuckPoint.description, 1800),
    },
    realBottleneck: {
      title: clean(actualStuckPoint.title || "실제로 흔들리던 지점", 120),
      description: clean(actualStuckPoint.description, 1800),
    },
    updatedDiagnosis: clean(parsed.updatedDiagnosis, 1800),
    discardThis: safeArray(parsed.discardThis).map((item) => clean(item, 220)).filter(Boolean).slice(0, 7),
    newLifeStrategy: {
      title: clean(firstObject(parsed.newLifeStrategy).title, 120),
      description: clean(firstObject(parsed.newLifeStrategy).description, 1800),
      principles: safeArray(firstObject(parsed.newLifeStrategy).principles).map((item) => clean(item, 240)).filter(Boolean).slice(0, 7),
    },
    forbiddenAction: {
      title: clean(firstObject(parsed.forbiddenAction).title, 120),
      reason: clean(firstObject(parsed.forbiddenAction).reason, 900),
    },
    sevenDayMission: safeArray(parsed.sevenDayMission).map((item, index) => ({
      day: Number(firstObject(item).day) || index + 1,
      mission: clean(firstObject(item).mission, 320),
    })).filter((item) => item.mission).slice(0, 7),
    thirtyDayStrategy: safeArray(parsed.thirtyDayStrategy).map((item) => clean(item, 320)).filter(Boolean).slice(0, 8),
    badge: {
      name: clean(firstObject(parsed.badge).name, 80),
      description: clean(firstObject(parsed.badge).description, 700),
    },
    tsundereClosing: clean(parsed.tsundereClosing, 700),
  };
  if (
    !refined.operationTitle
    || !refined.neoReview
    || !refined.actualStuckPoint.description
    || !refined.updatedDiagnosis
    || !refined.newLifeStrategy.description
    || !refined.forbiddenAction.title
    || refined.sevenDayMission.length < 7
    || !refined.badge.name
    || !refined.tsundereClosing
  ) {
    const error = new Error("Neo refined order response is incomplete");
    error.code = "LLM_RESPONSE_INVALID";
    throw error;
  }
  return refined;
}
