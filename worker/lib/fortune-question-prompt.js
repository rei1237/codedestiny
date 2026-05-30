const DEFAULT_MIN_PROMPT_LENGTH = 1500;

function toText(value, fallback = "") {
  const text = String(value == null ? "" : value).trim();
  return text || fallback;
}

function uniqueNonEmpty(items) {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  const out = [];
  for (let i = 0; i < items.length; i += 1) {
    const text = toText(items[i]);
    if (!text) continue;
    if (seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

function safeJsonBlock(value, fallback = "{}") {
  if (!value || typeof value !== "object") return fallback;
  try {
    return JSON.stringify(value, null, 2);
  } catch (_) {
    return fallback;
  }
}

function inferIntentLabel(userQuestion, mode, questionTypeLabel) {
  const q = toText(userQuestion).toLowerCase();
  const modeText = toText(mode).toLowerCase();

  if (modeText === "compatibility" || q.includes("궁합") || q.includes("상대") || q.includes("재회")) {
    return "관계의 역학과 현실적 조율 전략";
  }
  if (modeText === "money" || q.includes("재물") || q.includes("돈") || q.includes("수익") || q.includes("투자") || q.includes("창업")) {
    return "수익 구조와 리스크 관리 전략";
  }
  if (modeText === "career" || q.includes("직업") || q.includes("진로") || q.includes("이직") || q.includes("승진")) {
    return "커리어 방향성과 실행 타이밍";
  }
  if (modeText === "love" || q.includes("연애") || q.includes("결혼")) {
    return "감정 패턴과 관계 발전 전략";
  }
  if (modeText === "yearly" || q.includes("올해") || q.includes("이번") || q.includes("시기")) {
    return "시기 흐름과 우선순위 설계";
  }
  if (q.includes("건강") || q.includes("불안") || q.includes("스트레스")) {
    return "심신 리듬과 회복 루틴 전략";
  }

  return `${toText(questionTypeLabel, "핵심") } 관련 숨은 의도와 실행 전략`;
}

function buildSummaryIntent({ userQuestion, mode, questionTypeLabel, fortuneLabel }) {
  const intent = inferIntentLabel(userQuestion, mode, questionTypeLabel);
  return `${fortuneLabel} 관점에서 사용자 질문의 표면 요청을 넘어, ${intent}을 데이터 근거 중심으로 해석`;
}

function buildCoreRequestLines() {
  return [
    "1. 질문의 핵심 의도를 먼저 해석해주세요.",
    "2. 현재 명반/차트/카드/숙/궁/행성/십성 구조에서 이 질문과 직접 관련된 요소를 찾아주세요.",
    "3. 긍정적인 가능성과 주의해야 할 위험 요소를 나누어 설명해주세요.",
    "4. 현실에서 어떤 선택, 직업, 관계, 행동 전략으로 연결하면 좋은지 알려주세요.",
    "5. 막연한 위로나 일반론이 아니라, 분석 데이터에 근거한 구체적인 조언을 해주세요.",
  ];
}

function buildAnswerFormatLines() {
  return [
    "1. 질문의 핵심 요약",
    "2. 명반/차트/카드상 근거",
    "3. 현재 강점",
    "4. 약점 또는 막히는 지점",
    "5. 현실적인 전략",
    "6. 시기별 흐름",
    "7. 조심해야 할 선택",
    "8. 최종 조언",
  ];
}

function buildExtraDepthLines(analysisAngles, followUps, caution) {
  const lines = [
    "[심화 요청]",
    "- 가능하면 다층 구조(기질 -> 구조 -> 시기 -> 행동)로 분석해 주세요.",
    "- 해석마다 데이터 근거를 최소 1개 이상 연결해 주세요.",
    "- 전략은 단기(2~6주), 중기(3~6개월), 장기(1년+)로 나눠 제안해 주세요.",
    "- 불확실한 판정은 불확실하다고 명시하고, 확인해야 할 추가 데이터도 제시해 주세요.",
  ];

  if (analysisAngles.length) {
    lines.push("", "[우선 확인할 세부 분석 관점 재강조]");
    for (let i = 0; i < analysisAngles.length; i += 1) {
      lines.push(`- ${analysisAngles[i]}`);
    }
  }

  if (followUps.length) {
    lines.push("", "[후속 질문 제안]");
    for (let i = 0; i < followUps.length; i += 1) {
      lines.push(`- ${followUps[i]}`);
    }
  }

  if (toText(caution)) {
    lines.push("", `[주의] ${toText(caution)}`);
  }

  return lines;
}

function ensureMinLength(promptText, analysisAngles, followUps, caution, minLength) {
  let prompt = String(promptText || "");
  if (prompt.length >= minLength) return prompt;

  const paddingBlocks = buildExtraDepthLines(analysisAngles, followUps, caution);
  let guard = 0;
  while (prompt.length < minLength && guard < 4) {
    prompt += `\n\n${paddingBlocks.join("\n")}`;
    guard += 1;
  }
  return prompt;
}

export function buildFortuneQuestionPromptPackage({
  fortuneType,
  fortuneLabel,
  expertLabel,
  userQuestion,
  analysisResult,
  profile,
  compatibilityTarget,
  mode,
  questionTypeLabel,
  analysisAngles,
  recommendedFollowUpQuestions,
  caution,
  domainDataLines,
  customPrompt,
  minPromptLength = DEFAULT_MIN_PROMPT_LENGTH,
}) {
  const normalizedQuestion = toText(userQuestion, "질문이 제공되지 않았습니다.");
  const safeFortuneLabel = toText(fortuneLabel, toText(fortuneType, "운세"));
  const safeExpertLabel = toText(expertLabel, `${safeFortuneLabel} 전문가`);

  const angles = uniqueNonEmpty(analysisAngles);
  const followUps = uniqueNonEmpty(recommendedFollowUpQuestions);
  const summaryIntent = buildSummaryIntent({
    userQuestion: normalizedQuestion,
    mode,
    questionTypeLabel: toText(questionTypeLabel, "일반"),
    fortuneLabel: safeFortuneLabel,
  });

  const safeDomainDataLines = uniqueNonEmpty(domainDataLines);
  const snapshot = {
    fortuneType: toText(fortuneType, "unknown"),
    mode: toText(mode, "personal"),
    questionType: toText(questionTypeLabel, "일반"),
    profile: profile && typeof profile === "object" ? profile : undefined,
    compatibilityTarget: compatibilityTarget && typeof compatibilityTarget === "object" ? compatibilityTarget : undefined,
    analysisResult: analysisResult && typeof analysisResult === "object" ? analysisResult : {},
  };

  // customPrompt가 제공되면 그것을 우선 사용
  let generatedPrompt;
  if (customPrompt && typeof customPrompt === "string" && customPrompt.trim().length > 0) {
    generatedPrompt = ensureMinLength(
      customPrompt,
      angles,
      followUps,
      caution,
      Math.max(1200, Number(minPromptLength) || DEFAULT_MIN_PROMPT_LENGTH),
    );
  } else {
    // 기존 로직
    const lines = [
      `당신은 ${safeExpertLabel}입니다.`,
      "",
      `${safeFortuneLabel} 기반 AI 상담 프롬프트`,
      "",
      "아래의 분석 데이터를 바탕으로 사용자의 질문에 대해 매우 구체적으로 분석해주세요.",
      "",
      "[사용자 질문]",
      normalizedQuestion,
      "",
      "[질문의 숨은 의도]",
      summaryIntent,
      "",
      "[핵심 분석 요청]",
      ...buildCoreRequestLines(),
      "",
      "[세부 분석 관점]",
      ...(angles.length ? angles.map((angle) => `- ${angle}`) : ["- 질문과 관련된 핵심 관점이 충분히 제공되지 않았습니다. 제공된 데이터에서 직접 핵심 관점을 추출해주세요."]),
      "",
      "[분석 데이터 요약]",
      ...(safeDomainDataLines.length ? safeDomainDataLines.map((line) => `- ${line}`) : ["- 분석 데이터 요약이 제공되지 않았습니다. JSON 원문을 우선 근거로 해석해주세요."]),
      "",
      "[분석 데이터(JSON)]",
      "```json",
      safeJsonBlock(snapshot),
      "```",
      "",
      "[답변 형식]",
      ...buildAnswerFormatLines(),
      "",
      "[작성 규칙]",
      "- 근거 없는 단정 대신 근거와 불확실성을 함께 제시해주세요.",
      "- 분석 근거를 먼저 제시하고, 그 뒤에 조언을 제시해주세요.",
      "- 실전 적용 가능한 액션 플랜으로 마무리해주세요.",
      "- 필요하면 표/리스트를 활용하되, 핵심 판단 이유를 생략하지 마세요.",
    ];

    if (followUps.length) {
      lines.push("", "[추천 후속 질문]", ...followUps.map((q) => `- ${q}`));
    }

    if (toText(caution)) {
      lines.push("", `[주의사항] ${toText(caution)}`);
    }

    generatedPrompt = ensureMinLength(lines.join("\n"), angles, followUps, caution, Math.max(1200, Number(minPromptLength) || DEFAULT_MIN_PROMPT_LENGTH));
  }

  return {
    title: `${safeFortuneLabel} 심층 질문 프롬프트`,
    summaryIntent,
    generatedPrompt,
    analysisAngles: angles,
    recommendedFollowUpQuestions: followUps,
    caution: toText(caution, "") || undefined,
  };
}
