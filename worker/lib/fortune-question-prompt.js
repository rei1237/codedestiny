import { buildReasoningFormatLines } from "./fortune-reasoning-contract.js";

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
    return JSON.stringify(value);
  } catch (_) {
    return fallback;
  }
}

function buildQuestionFocusWords(userQuestion) {
  const stopWords = new Set([
    "그리고",
    "그래서",
    "하지만",
    "저는",
    "제가",
    "나의",
    "나는",
    "어떻게",
    "무엇을",
    "궁금해",
    "알고",
    "싶어",
    "해주세요",
    "해줘",
  ]);
  const words = String(userQuestion || "")
    .replace(/[^\w가-힣一-龥ぁ-んァ-ン\s]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2 && !stopWords.has(word));
  return uniqueNonEmpty(words).slice(0, 8);
}

function buildQuestionContextLine({
  userQuestion,
  mode,
  questionTypeLabel,
  compatibilityTarget,
  analysisAngles,
  domainDataLines,
}) {
  const context = [];
  const focusWords = buildQuestionFocusWords(userQuestion);
  const safeMode = toText(mode);
  const safeQuestionType = toText(questionTypeLabel);
  const safeAngles = uniqueNonEmpty(analysisAngles);
  const safeDomainLines = uniqueNonEmpty(domainDataLines);

  if (safeQuestionType) context.push(`질문 결: ${safeQuestionType}`);
  if (safeMode) context.push(`상담 자리: ${safeMode}`);
  if (focusWords.length) context.push(`원문에서 강하게 떠오른 말: ${focusWords.join(", ")}`);
  if (compatibilityTarget && typeof compatibilityTarget === "object") context.push("관계의 상대 축이 함께 놓여 있음");
  if (safeAngles.length) context.push(`우선 비출 축: ${safeAngles.slice(0, 3).join(", ")}`);
  if (safeDomainLines.length) {
    // domainDataLines 의 첫 항목이 멀티라인 fact card 전문인 경우가 있어(사주: 실측 1,540자),
    // 그대로 join 하면 "짧은 힌트 2줄"을 의도한 이 줄이 카드 전체를 한 번 더 싣는다.
    // 각 항목의 첫 줄만, 길이도 잘라 요약으로 유지한다. 단일 라인 항목은 동작이 그대로다.
    const domainHints = safeDomainLines
      .map((line) => String(line).split("\n", 1)[0].trim())
      .filter(Boolean)
      .slice(0, 2)
      .map((line) => (line.length > 120 ? `${line.slice(0, 120)}…` : line));
    if (domainHints.length) context.push(`참조 기류: ${domainHints.join(" / ")}`);
  }

  return context.length ? context.join(" / ") : "원문 질문의 표현과 요청 맥락을 중심에 둠";
}

function buildQuestionPersonalizationLines({
  normalizedQuestion,
  summaryIntent,
  mode,
  questionTypeLabel,
  compatibilityTarget,
  analysisAngles,
  domainDataLines,
}) {
  return [
    "[이번 질문의 결]",
    `- 원문 질문: ${normalizedQuestion}`,
    `- 중심 기류: ${summaryIntent}`,
    `- 질문 속 단서: ${buildQuestionContextLine({
      userQuestion: normalizedQuestion,
      mode,
      questionTypeLabel,
      compatibilityTarget,
      analysisAngles,
      domainDataLines,
    })}`,
    "- 이번 상담은 원문에 담긴 단어, 망설임, 바라는 결말, 피하고 싶은 흐름을 우선하여 엽니다.",
    "- 예전에 만든 범용 문장과 같은 예시를 그대로 되풀이하지 말고, 이번 질문에서 강하게 떠오르는 상징과 선택지를 중심으로 새롭게 엮습니다.",
    "- 같은 명반이나 카드라도 이 질문에서 솟은 핵심 의도와 세부 조건이 답의 순서와 강조점을 이끌게 합니다.",
  ];
}

function appendQuestionPersonalizationGuard(promptText, personalizationLines) {
  const prompt = String(promptText || "");
  const marker = "[이번 질문의 결]";
  if (prompt.includes(marker)) return prompt;
  return `${prompt}\n\n${personalizationLines.join("\n")}`;
}

function isSajuPrompt(fortuneType, fortuneLabel) {
  return String(fortuneType || "").toLowerCase() === "saju" || String(fortuneLabel || "").includes("사주");
}

function isAstrologyPrompt(fortuneType, fortuneLabel) {
  const type = String(fortuneType || "").toLowerCase();
  const label = String(fortuneLabel || "");
  return type === "astrology" || label.includes("점성술") || label.includes("Astrology");
}

function inferExpertVoiceName(fortuneType, fortuneLabel) {
  const type = String(fortuneType || "").toLowerCase();
  const label = String(fortuneLabel || "");
  if (isSajuPrompt(type, label)) return "명리학자";
  if (isAstrologyPrompt(type, label)) return "점성술사";
  if (type === "sukyo" || label.includes("숙요")) return "숙요점 관계 상담가";
  if (type === "ziwei" || label.includes("자미")) return "자미두수 명반 해석가";
  if (type === "vedic" || label.includes("베다")) return "베다 점성술사";
  if (label.includes("타로")) return "타로 리더";
  if (label.includes("수비학")) return "수비학 해석가";
  if (label.includes("꿈")) return "상징 해석가";
  return `${toText(fortuneLabel, "운세")} 전문가`;
}

function buildExpertVoiceRuleLines(fortuneType, fortuneLabel) {
  const expertVoiceName = inferExpertVoiceName(fortuneType, fortuneLabel);
  return [
    `- 문체는 ${expertVoiceName}가 눈앞의 사용자를 직접 상담하듯 작성해주세요.`,
    "- 기능, 서비스, 리포트, 섹션을 소개하는 설명문처럼 쓰지 마세요.",
    "- 금지 표현: 보여줍니다, 읽습니다, 말합니다, 방향입니다, 설명합니다, 제공합니다.",
    "- 금지 시작: 이 글은, 이 섹션은, 이 기능은, 이 결과는, 분석 결과는.",
    "- 금지 표현이 필요해 보이면 드러납니다, 흐릅니다, 가리킵니다, 비춥니다, 기울어 있습니다, 열립니다처럼 상담 해석문으로 바꿔주세요.",
    "- 무엇을 보여주는지 설명하지 말고, 사용자의 흐름에 무엇이 떠오르고 어디로 기운이 움직이는지 바로 풀어주세요.",
    "- 모든 운세 문장은 전문적이고 신비로운 상담문이어야 하며 개발 문서, 기능 소개, 사용 안내처럼 들리면 안 됩니다.",
  ];
}

function appendExpertVoiceGuard(promptText, fortuneType, fortuneLabel) {
  const prompt = String(promptText || "");
  const marker = "[전문가 상담 문체 고정 규칙]";
  if (prompt.includes(marker)) return prompt;
  return `${prompt}\n\n${marker}\n${buildExpertVoiceRuleLines(fortuneType, fortuneLabel).join("\n")}`;
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

function buildCoreRequestLines(fortuneType, fortuneLabel) {
  if (isAstrologyPrompt(fortuneType, fortuneLabel)) {
    return [
      "1. 사용자의 질문을 먼저 점성술 상담 질문으로 정교하게 재정의하고, 차트에서 확인할 축을 분리해주세요.",
      "2. 태양·달·상승궁·MC를 우선 읽고, 수성·금성·화성·목성·토성으로 심리/관계/행동/성장 구조를 보강해주세요.",
      "3. 하우스, 하우스 룰러, 주요 어스펙트, 원소·양식 분포를 질문과 직접 연결하되 용어만 나열하지 말고 실제 삶의 장면으로 번역해주세요.",
      "4. 트랜싯·프로펙션·피르다리아 등 시기 정보는 제공된 데이터 안에서만 사용하고, 확정 예언이 아니라 선택 리듬으로 설명해주세요.",
      "5. 궁합/시너스트리 데이터가 있으면 개인 차트의 욕구, 두 차트의 접점, 하우스 오버레이, 조율법을 분리해서 해석해주세요.",
      "6. 출생시간·좌표·하우스 신뢰도가 불완전하면 상승궁·달·하우스 판단을 보수적으로 표현하고 추가 확인 정보를 안내해주세요.",
    ];
  }

  if (isSajuPrompt(fortuneType, fortuneLabel)) {
    return [
      "1. 사용자의 질문을 먼저 한 문장으로 정리하고, 명식에서 실제로 확인할 축을 분리해주세요.",
      "2. 원국의 일간, 월지, 십성, 오행 균형, 조후, 용신·기신 후보를 질문과 직접 연결해주세요.",
      "3. 긍정 가능성과 막히는 지점을 나누되, 각각에 명식 근거를 붙여주세요.",
      "4. 대운·세운 흐름은 확정 예언이 아니라 선택의 리듬으로 설명해주세요.",
      "5. 마지막에는 사용자가 바로 실행할 수 있는 말, 행동, 점검 기준을 제시해주세요.",
    ];
  }

  return [
    "1. 질문의 핵심 의도를 먼저 해석해주세요.",
    "2. 현재 명반/차트/카드/숙/궁/행성/십성 구조에서 이 질문과 직접 관련된 요소를 찾아주세요.",
    "3. 긍정적인 가능성과 주의해야 할 위험 요소를 나누어 설명해주세요.",
    "4. 현실에서 어떤 선택, 직업, 관계, 행동 전략으로 연결하면 좋은지 알려주세요.",
    "5. 막연한 위로나 일반론이 아니라, 분석 데이터에 근거한 구체적인 조언을 해주세요.",
  ];
}

function buildAnswerFormatLines(fortuneType, fortuneLabel) {
  if (isAstrologyPrompt(fortuneType, fortuneLabel)) {
    return [
      "1. 타고난 성향 총론: 태양·달·ASC를 근거로 이 사람의 기본 기질과 성향을 먼저 전반적으로 짚어, 신뢰가 서도록 시작한다",
      "2. 질문 재정의와 상담 초점",
      "3. 핵심 차트 근거: 태양·달·ASC·MC",
      "4. 심리와 행동 패턴: 수성·금성·화성",
      "5. 현실 무대: 하우스·룰러·원소·양식",
      "6. 주요 어스펙트로 보는 강점과 긴장",
      "7. 시기 흐름: 제공된 트랜싯·타임로드 기준",
      "8. 궁합 데이터가 있을 때: 끌림·안정·충돌·조율법",
      "9. 선택지 비교와 오늘부터 할 행동",
      "10. 추가로 확인하면 좋은 정보와 후속 질문",
    ];
  }

  if (isSajuPrompt(fortuneType, fortuneLabel)) {
    // 근거 중심 흐름(핵심 구조·영향 요인·해석 근거·분야별·추천 행동)을 사주 분기에만 얹는다.
    // 이 함수는 점성술·베다·숙요·자미의 "질문 프롬프트 생성" 기능도 함께 쓰므로 공통 분기는 건드리지 않는다.
    return [
      "1. 타고난 성향 총론: 일간·월지·오행 분포를 근거로 이 사람의 타고난 기질과 성향을 먼저 전반적으로 짚어, 신뢰가 서도록 시작한다",
      "2. 질문의 핵심과 명식의 초점",
      ...buildReasoningFormatLines(3),
      "8. 원국 근거: 일간·월지·십성·오행",
      "9. 현재 강점과 열리는 길",
      "10. 막히는 지점과 반복 패턴",
      "11. 대운·세운으로 보는 시기별 흐름",
      "12. 현실 선택지 비교",
      "13. 피해야 할 선택과 말",
      "14. 추가로 물어보면 좋은 질문",
    ];
  }

  return [
    "1. 타고난 성향 총론: 명반/차트의 중심 지표(주성·라그나·달 등)를 근거로 이 사람의 타고난 기질과 성향을 먼저 전반적으로 짚어, 신뢰가 서도록 시작한다",
    "2. 질문의 핵심 요약",
    "3. 명반/차트/카드상 근거",
    "4. 현재 강점",
    "5. 약점 또는 막히는 지점",
    "6. 현실적인 전략",
    "7. 시기별 흐름",
    "8. 조심해야 할 선택",
    "9. 최종 조언",
  ];
}

function buildExtraDepthLines(analysisAngles, followUps, caution) {
  const lines = [
    "[정밀 보강 요청]",
    "- 질문을 더 좋은 상담 질문으로 한 번 재작성한 뒤 해석을 시작해 주세요.",
    "- 다층 구조(기질 -> 구조 -> 시기 -> 행동)로 분석해 주세요.",
    "- 해석마다 데이터 근거를 최소 1개 이상 연결해 주세요.",
    "- 전략은 단기(2~6주), 중기(3~6개월), 장기(1년+)로 나눠 제안해 주세요.",
    "- 불확실한 판정은 불확실하다고 밝히고, 추가로 확인할 정보도 제시해 주세요.",
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

function buildCompletionChecklistLines(fortuneType, fortuneLabel) {
  if (isSajuPrompt(fortuneType, fortuneLabel)) {
    return [
      "[완성도 점검]",
      "- 사주 일반론으로 흐르면 일간·월지·십성·오행 중 최소 2개 근거를 질문에 다시 연결해 주세요.",
      "- 외부 AI가 그대로 붙여넣어 이해할 수 있도록 목적, 원국 근거, 답변 형식, 금지할 단정을 분리해 주세요.",
      "- 민감한 개인정보는 반복 노출하지 말고, 필요한 경우 명식 정보만 간결하게 언급해 주세요.",
      "- 마지막 문장은 상담 결과가 아니라 더 깊은 사주 상담을 요청하는 질문문으로 정리해 주세요.",
    ];
  }

  return [
    "[완성도 점검]",
    "- 답변이 일반론으로 흐르면 원국 근거와 질문을 다시 연결해 주세요.",
    "- 사용자의 선택권을 좁히지 말고, 가능한 선택지와 리스크를 함께 보여주세요.",
    "- 민감한 개인정보는 반복 노출하지 말고, 필요한 경우 명식 정보만 간결하게 언급해 주세요.",
    "- 마지막 문장은 사용자가 오늘 바로 실행할 수 있는 작은 의식처럼 정리해 주세요.",
  ];
}

function buildWritingRuleLines(fortuneType, fortuneLabel) {
  const rules = [
    "- 근거 없는 단정 대신 근거와 불확실성을 함께 제시해주세요.",
    "- 분석 근거를 먼저 제시하고, 그 뒤에 조언을 제시해주세요.",
    "- 실전 적용 가능한 액션 플랜으로 마무리해주세요.",
    "- 필요하면 표/리스트를 활용하되, 핵심 판단 이유를 생략하지 마세요.",
    "- 이름, 생년월일, 출생시간 같은 개인정보는 답변에 반복 노출하지 마세요.",
  ];

  if (isAstrologyPrompt(fortuneType, fortuneLabel)) {
    return rules.concat([
      "- 점성술 용어는 반드시 쉬운 한국어로 풀어 쓰고, 행성/하우스/어스펙트가 실제 장면에서 어떻게 드러나는지 설명해주세요.",
      "- 좋은 말만 하지 말고 강점, 그림자, 보완 행동을 같은 비중으로 다뤄주세요.",
      "- 궁합 해석에서는 상대를 단정하거나 낙인찍지 말고 두 사람이 조율할 수 있는 패턴으로 표현해주세요.",
      "- 투자, 의료, 법률, 이별/결혼 확정처럼 고위험 결론은 단정하지 말고 참고용 방향과 확인 질문으로 제시해주세요.",
    ]);
  }

  if (isSajuPrompt(fortuneType, fortuneLabel)) {
    return rules.concat([
      "- 답변 초안이 사주 일반론으로 흐르면 일간·월지·십성·오행·조후 중 최소 2개 근거로 다시 좁혀주세요.",
      "- 외부 AI가 그대로 이해할 수 있도록 목적, 원국 근거, 원하는 답변 형식, 금지할 단정을 분리해주세요.",
      "- 실제 상담 결과처럼 확정하지 말고, 더 좋은 사주 질문문을 만들기 위한 문장으로 마무리해주세요.",
      "- 투자, 의료, 법률, 결혼/이별 확정처럼 고위험 결론은 단정하지 말고 확인 질문과 선택지로 바꿔주세요.",
    ]);
  }

  return rules;
}

function ensureMinLength(promptText, analysisAngles, followUps, caution, minLength, fortuneType, fortuneLabel) {
  let prompt = String(promptText || "");
  if (prompt.length >= minLength) return prompt;

  prompt += `\n\n${buildExtraDepthLines(analysisAngles, followUps, caution).join("\n")}`;
  if (prompt.length < minLength) {
    prompt += `\n\n${buildCompletionChecklistLines(fortuneType, fortuneLabel).join("\n")}`;
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
  const questionPersonalizationLines = buildQuestionPersonalizationLines({
    normalizedQuestion,
    summaryIntent,
    mode,
    questionTypeLabel: toText(questionTypeLabel, "일반"),
    compatibilityTarget,
    analysisAngles: angles,
    domainDataLines: safeDomainDataLines,
  });
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
      fortuneType,
      safeFortuneLabel,
    );
    generatedPrompt = appendQuestionPersonalizationGuard(generatedPrompt, questionPersonalizationLines);
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
      ...questionPersonalizationLines,
      "",
      "[핵심 분석 요청]",
      ...buildCoreRequestLines(fortuneType, safeFortuneLabel),
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
      ...buildAnswerFormatLines(fortuneType, safeFortuneLabel),
      "",
      "[작성 규칙]",
      ...buildWritingRuleLines(fortuneType, safeFortuneLabel),
    ];

    if (followUps.length) {
      lines.push("", "[추천 후속 질문]", ...followUps.map((q) => `- ${q}`));
    }

    if (toText(caution)) {
      lines.push("", `[주의사항] ${toText(caution)}`);
    }

    generatedPrompt = ensureMinLength(lines.join("\n"), angles, followUps, caution, Math.max(1200, Number(minPromptLength) || DEFAULT_MIN_PROMPT_LENGTH), fortuneType, safeFortuneLabel);
  }

  generatedPrompt = appendExpertVoiceGuard(generatedPrompt, fortuneType, safeFortuneLabel);

  const packageTitle = isSajuPrompt(fortuneType, safeFortuneLabel)
    ? `${safeFortuneLabel} 질문문 생성 프롬프트`
    : `${safeFortuneLabel} 심층 질문 프롬프트`;

  return {
    title: packageTitle,
    summaryIntent,
    generatedPrompt,
    analysisAngles: angles,
    recommendedFollowUpQuestions: followUps,
    caution: toText(caution, "") || undefined,
  };
}
