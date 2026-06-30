const METHOD_LABELS = Object.freeze({
  saju: "사주",
  ziwei: "자미두수",
  vedic: "베다점",
  astrology: "점성술",
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
  return [
    "너는 '네오의 팩폭 작전실'의 사자 장군 네오다.",
    "역할은 위로가 아니라 진단과 작전 재정비다.",
    "말투는 직설적이고 차갑지만, 사용자를 깎아내리거나 조롱하지 않는다.",
    "입력된 계산 요약 데이터만 근거로 삼고, 생년월일을 직접 점치는 척하거나 없는 계산값을 만들지 않는다.",
    "mock, dry-run, provider, system, prompt 같은 내부 구현 단어를 결과에 쓰지 않는다.",
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
    "[반환 JSON 스키마]",
    JSON.stringify({
      version: 1,
      documentType: "initial_briefing",
      selectedMethod,
      operationTitle: "작전명",
      neoOpening: "네오의 첫 반응",
      coreDiagnosis: "현재 운의 핵심 진단",
      repeatedPattern: {
        title: "반복 패턴 제목",
        description: "반복 패턴 설명",
      },
      originalStrategy: {
        title: "본래 너는 이렇게 살아야 한다",
        description: "타고난 구조상 힘이 나는 방식",
        keyRules: ["규칙"],
      },
      currentProblem: {
        title: "그런데 지금 문제는 이것이다",
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
      realityCheckQuestions: [
        {
          question: "현실 점검 질문",
          whyItMatters: "왜 중요한지",
        },
      ],
      nextStepPrompt: "현실 점검 후 작전을 다시 짜세요.",
    }),
    "",
    "각 문자열은 한국어로 작성한다.",
    "realityCheckQuestions는 2~4개로 만든다.",
    "keyRules는 3~5개로 만든다.",
    "마지막 문장은 반드시 2차 작전 회의로 이어지게 쓴다.",
  ].join("\n");
}

export function parseNeoOperationRoomBriefingResponse(text, input, methodSummary) {
  const parsed = extractJsonObject(text);
  const selectedMethod = clean(parsed.selectedMethod || input?.selectedMethod, 30);
  const briefing = {
    version: 1,
    documentType: "initial_briefing",
    selectedMethod,
    operationTitle: clean(parsed.operationTitle, 120),
    neoOpening: clean(parsed.neoOpening, 700),
    coreDiagnosis: clean(parsed.coreDiagnosis, 1600),
    repeatedPattern: {
      title: clean(firstObject(parsed.repeatedPattern).title, 120),
      description: clean(firstObject(parsed.repeatedPattern).description, 1600),
    },
    originalStrategy: {
      title: clean(firstObject(parsed.originalStrategy).title || "본래 너는 이렇게 살아야 한다", 120),
      description: clean(firstObject(parsed.originalStrategy).description, 1800),
      keyRules: safeArray(firstObject(parsed.originalStrategy).keyRules).map((item) => clean(item, 220)).filter(Boolean).slice(0, 6),
    },
    currentProblem: {
      title: clean(firstObject(parsed.currentProblem).title || "그런데 지금 문제는 이것이다", 120),
      description: clean(firstObject(parsed.currentProblem).description, 1800),
    },
    methodEvidence: safeArray(parsed.methodEvidence).map((item) => ({
      method: clean(firstObject(item).method || selectedMethod, 30),
      label: clean(firstObject(item).label, 120),
      summary: clean(firstObject(item).summary, 1000),
    })).filter((item) => item.summary).slice(0, 4),
    bluntTruth: clean(parsed.bluntTruth, 1200),
    realityCheckQuestions: safeArray(parsed.realityCheckQuestions).map((item) => ({
      question: clean(firstObject(item).question, 260),
      whyItMatters: clean(firstObject(item).whyItMatters, 700),
    })).filter((item) => item.question).slice(0, 5),
    nextStepPrompt: clean(parsed.nextStepPrompt, 500),
  };
  if (!briefing.methodEvidence.length) briefing.methodEvidence = normalizeEvidence(input, methodSummary);
  if (!briefing.operationTitle || !briefing.coreDiagnosis || !briefing.bluntTruth || !briefing.realityCheckQuestions.length) {
    const error = new Error("Neo briefing response is incomplete");
    error.code = "LLM_RESPONSE_INVALID";
    throw error;
  }
  return briefing;
}

export function buildNeoOperationRoomRefinedPrompt(consultation, realityCheck) {
  const selectedMethod = clean(consultation?.selectedMethod || consultation?.initialBriefing?.selectedMethod, 30);
  const methodLabel = METHOD_LABELS[selectedMethod] || selectedMethod;
  return [
    "너는 '네오의 팩폭 작전실'의 사자 장군 네오다.",
    "지금은 1차 작전 브리핑 이후, 사용자의 현실 점검 답변을 반영해 2차 수정 작전 명령서를 작성한다.",
    "v2는 v1의 반복이 아니다. 사용자가 인정한 부분, 반박한 부분, 더 중요하다고 밝힌 현실 문제를 반드시 반영해 진단을 보정한다.",
    "말투는 직설적이고 차갑지만 사용자를 비난하거나 조롱하지 않는다.",
    "계산 근거는 이미 저장된 methodSummary와 initialBriefing 안에서만 사용한다. 없는 계산값을 새로 만들지 않는다.",
    "mock, dry-run, provider, system, prompt 같은 내부 구현 단어를 결과에 쓰지 않는다.",
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
      realBottleneck: {
        title: "진짜 병목",
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
    "neoReview에는 사용자의 체크 답변 또는 자유 입력 중 최소 하나를 직접 반영해 재판단을 시작한다.",
  ].join("\n");
}

export function parseNeoOperationRoomRefinedResponse(text, consultation) {
  const parsed = extractJsonObject(text);
  const selectedMethod = clean(parsed.selectedMethod || consultation?.selectedMethod, 30);
  const refined = {
    version: 2,
    documentType: "refined_order",
    selectedMethod,
    operationTitle: clean(parsed.operationTitle, 120),
    neoReview: clean(parsed.neoReview, 1400),
    realBottleneck: {
      title: clean(firstObject(parsed.realBottleneck).title, 120),
      description: clean(firstObject(parsed.realBottleneck).description, 1800),
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
    || !refined.realBottleneck.description
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
