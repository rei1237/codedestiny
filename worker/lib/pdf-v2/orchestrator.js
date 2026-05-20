function isMeaningful(value) {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return false;
}

function splitPath(path) {
  return String(path || "")
    .split(".")
    .map((token) => token.trim())
    .filter(Boolean);
}

function getPathValue(source, path) {
  const tokens = splitPath(path);
  let current = source;
  for (const token of tokens) {
    if (!isMeaningful(current)) return undefined;
    const arrayToken = token.endsWith("[]");
    const key = arrayToken ? token.slice(0, -2) : token;
    current = key ? current?.[key] : current;
    if (arrayToken) {
      if (!Array.isArray(current) || current.length === 0) return undefined;
      current = current.filter(isMeaningful);
    }
  }
  return current;
}

function compactValue(value, max = 700) {
  if (!isMeaningful(value)) return "";
  if (typeof value === "string") return value.replace(/\s+/g, " ").trim().slice(0, max);
  try {
    return JSON.stringify(value).replace(/\s+/g, " ").trim().slice(0, max);
  } catch (_) {
    return String(value).replace(/\s+/g, " ").trim().slice(0, max);
  }
}

function titleIncludes(title, words) {
  const source = String(title || "").toLowerCase();
  return words.some((word) => source.includes(String(word || "").toLowerCase()));
}

function inferContractByTitle(pdfType, chapter = {}) {
  const title = String(chapter?.title || "");
  const base = {
    purpose: "확보된 원본 데이터 범위 안에서 이번 챕터의 고유 관점을 설명",
    requiredEvidence: Array.isArray(chapter?.requiredFields) ? chapter.requiredFields.slice(0, 3) : [],
    recommendedEvidence: Array.isArray(chapter?.requiredFields) ? chapter.requiredFields.slice(3) : [],
    fallbackAngle: "세부 계산 근거가 제한된 경우 기본 분석 결과, 사용자 입력값, 질문 의도 중심으로 보수적으로 작성",
    forbiddenTopics: ["앞 챕터의 기본 성격 설명 반복", "동일 조언 반복", "계산되지 않은 별/궁/행성/십성/숙 임의 생성"],
    outputStyle: "챕터별 고유 결론과 현실 조언으로 마무리",
  };

  if (titleIncludes(title, ["관계", "사랑", "연애", "궁합", "부처", "배우자", "친밀"])) {
    return {
      ...base,
      purpose: "관계 구조, 반복 패턴, 경계와 소통 전략 분석",
      fallbackAngle: "연애 세부 근거가 제한된 경우 관계 패턴, 경계, 반복 구조 중심으로 작성",
      forbiddenTopics: ["기본 성격 반복", "직업 조언 장황화", "재물 조언 반복"],
    };
  }
  if (titleIncludes(title, ["직업", "커리어", "소명", "관록", "성공", "천직", "사회"])) {
    return {
      ...base,
      purpose: "현실적 커리어 방향과 성공 전략 제시",
      fallbackAngle: "직업 세부 근거가 제한된 경우 타고난 기질과 강점 기반 커리어 전략으로 작성",
      forbiddenTopics: ["연애 감정 반복", "기본 성격 소개 반복", "월별 운세 장황화"],
    };
  }
  if (titleIncludes(title, ["재물", "부", "자산", "현금", "재백", "번영"])) {
    return {
      ...base,
      purpose: "재물 흐름과 실행 가능한 수익/손실 관리 전략 제시",
      fallbackAngle: "재물 세부 근거가 제한된 경우 재물운 단정 대신 행동 전략 중심으로 작성",
      forbiddenTopics: ["성격 설명 반복", "연애 조언 반복", "근거 없는 수익 단정"],
    };
  }
  if (titleIncludes(title, ["월", "연간", "흐름", "대운", "전환", "주기", "로드맵"])) {
    return {
      ...base,
      purpose: "시기 흐름을 실행 순서와 리스크 관리로 변환",
      fallbackAngle: "월별 세부 근거가 제한된 경우 초기/중기/후기 흐름과 점검 루틴으로 작성",
      forbiddenTopics: ["기본 성향 반복", "확정적 사건 예언", "이미 쓴 조언 재사용"],
    };
  }
  if (titleIncludes(title, ["건강", "에너지", "생명력", "질액", "정화"])) {
    return {
      ...base,
      purpose: "에너지 관리, 회복 루틴, 생활 리스크 조정",
      fallbackAngle: "세부 건강 근거가 제한된 경우 생활 리듬과 회복 전략 중심으로 작성",
      forbiddenTopics: ["의학적 진단", "재물/연애 조언 반복", "공포 유도"],
    };
  }

  if (pdfType === "loveSecret") {
    return { ...base, purpose: "사주 연애 데이터 기반 관계 의사결정 프레임 제시" };
  }
  if (pdfType === "sajuNewYear") {
    return { ...base, purpose: "연간 선택 기준과 실행 우선순위 제시" };
  }
  return base;
}

export function buildChapterContracts(pdfType, chapterPlan = []) {
  return (Array.isArray(chapterPlan) ? chapterPlan : []).map((chapter, idx) => {
    const inferred = inferContractByTitle(pdfType, chapter);
    return {
      chapterId: chapter?.chapterId || chapter?.id || `chapter-${idx + 1}`,
      order: Number(chapter?.order || idx + 1),
      title: String(chapter?.title || `Chapter ${idx + 1}`),
      promptTemplateId: String(chapter?.promptTemplateId || ""),
      ...inferred,
    };
  });
}

export function normalizePdfPayload(input = {}) {
  const fortuneType = String(input.fortuneType || input.pdfType || "").trim();
  const chapterTemplate = Array.isArray(input.chapterTemplate) ? input.chapterTemplate : [];
  const normalizedData = input.normalizedData && typeof input.normalizedData === "object" ? input.normalizedData : {};
  return {
    schema: "code-destiny-pdf-orchestrator-v1",
    fortuneType,
    userInput: input.userInput && typeof input.userInput === "object" ? input.userInput : {},
    baseEngineResult: input.baseEngineResult && typeof input.baseEngineResult === "object" ? input.baseEngineResult : {},
    promptGeneratedData: input.promptGeneratedData && typeof input.promptGeneratedData === "object" ? input.promptGeneratedData : {},
    existingAnalysisResult: input.existingAnalysisResult && typeof input.existingAnalysisResult === "object" ? input.existingAnalysisResult : {},
    normalizedData,
    chapterTemplate,
    title: String(input.title || input.userInput?.title || input.userInput?.reportTitle || "").trim(),
    userId: String(input.userId || input.userInput?.userId || "").trim(),
    sessionId: String(input.sessionId || input.userInput?.sessionId || input.userInput?.reportId || "").trim(),
  };
}

export function validatePayloadBySeverity(payload = {}, chapterContracts = []) {
  const fatalMissing = [];
  const recoverableMissing = [];
  const optionalMissing = [];

  if (!payload.fortuneType) fatalMissing.push("fortuneType");
  if (!Array.isArray(chapterContracts) || chapterContracts.length === 0) fatalMissing.push("chapterList");

  const hasAnySource = [
    payload.userInput,
    payload.baseEngineResult,
    payload.promptGeneratedData,
    payload.existingAnalysisResult,
    payload.normalizedData,
  ].some(isMeaningful);
  if (!hasAnySource) fatalMissing.push("sourceData");

  const hasRenderIdentity = [payload.title, payload.userId, payload.sessionId, payload.userInput?.name].some(isMeaningful);
  if (!hasRenderIdentity) fatalMissing.push("title/user/session");

  for (const contract of chapterContracts) {
    for (const path of contract.requiredEvidence || []) {
      if (!isMeaningful(getPathValue(payload.normalizedData, path))) {
        recoverableMissing.push(`${contract.chapterId}:${path}`);
      }
    }
    for (const path of contract.recommendedEvidence || []) {
      if (!isMeaningful(getPathValue(payload.normalizedData, path))) {
        optionalMissing.push(`${contract.chapterId}:${path}`);
      }
    }
  }

  const generationMode = fatalMissing.length > 0
    ? "blocked"
    : recoverableMissing.length > 0
      ? "fallback"
      : optionalMissing.length > 0
        ? "partial"
        : "full";

  return {
    ok: fatalMissing.length === 0,
    fatalMissing: Array.from(new Set(fatalMissing)),
    recoverableMissing: Array.from(new Set(recoverableMissing)),
    optionalMissing: Array.from(new Set(optionalMissing)),
    generationMode,
  };
}

export function fillRecoverableMissingData(payload = {}, validation = {}) {
  const normalizedData = payload.normalizedData && typeof payload.normalizedData === "object"
    ? { ...payload.normalizedData }
    : {};
  const fallbackFrame = {
    mode: validation.generationMode || "partial",
    principle: "허위 계산값을 만들지 않고 확보된 기본 결과와 사용자 입력을 바탕으로 보수적으로 해석",
    sourceBrief: [
      compactValue(payload.normalizedData, 500),
      compactValue(payload.baseEngineResult, 500),
      compactValue(payload.promptGeneratedData, 500),
      compactValue(payload.existingAnalysisResult, 500),
    ].filter(Boolean).slice(0, 3),
    missingDataReport: {
      fatalMissing: validation.fatalMissing || [],
      recoverableMissing: validation.recoverableMissing || [],
      optionalMissing: validation.optionalMissing || [],
    },
  };

  normalizedData._pdfGenerationMode = validation.generationMode || "full";
  normalizedData._pdfFallbackFrame = fallbackFrame;

  return {
    ...payload,
    normalizedData,
    missingDataReport: fallbackFrame.missingDataReport,
    generationMode: validation.generationMode || "full",
  };
}

export function buildChapterEvidenceMap(payload = {}, chapterContracts = []) {
  const normalizedData = payload.normalizedData || {};
  const map = {};
  for (const contract of chapterContracts) {
    const evidence = {};
    const missingEvidence = [];
    const paths = Array.from(new Set([...(contract.requiredEvidence || []), ...(contract.recommendedEvidence || [])]));
    for (const path of paths) {
      const value = getPathValue(normalizedData, path);
      if (isMeaningful(value)) evidence[path] = value;
      else missingEvidence.push(path);
    }
    map[String(contract.chapterId)] = {
      contract,
      evidence,
      missingEvidence,
      fallbackFrame: normalizedData._pdfFallbackFrame || null,
    };
  }
  return map;
}

export function summarizeChapterForDedup(chapter = {}) {
  const text = String(chapter.content || chapter.text || "").replace(/\s+/g, " ").trim();
  const sentences = text.split(/(?<=[.!?。！？]|다\.)\s+/).map((s) => s.trim()).filter(Boolean);
  const keyPhrases = extractKeyPhrases(text).slice(0, 10);
  return {
    chapterId: chapter.chapterId || "",
    title: chapter.title || "",
    summary: sentences.slice(0, 3).join(" ").slice(0, 500),
    keyPhrases,
  };
}

export function extractKeyPhrases(text = {}) {
  const source = String(text || "");
  const tokens = source
    .replace(/[#*_`>\-]/g, " ")
    .split(/[\s,.;:!?()\[\]{}"'“”‘’]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && token.length <= 18)
    .filter((token) => !/^(그리고|하지만|그러나|입니다|합니다|것입니다|중요합니다)$/.test(token));
  const counts = new Map();
  tokens.forEach((token) => counts.set(token, (counts.get(token) || 0) + 1));
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([token]) => token);
}

export function buildForbiddenRepeats(previousChapterSummaries = []) {
  const phrases = [];
  for (const summary of previousChapterSummaries || []) {
    if (Array.isArray(summary?.keyPhrases)) phrases.push(...summary.keyPhrases.slice(0, 8));
  }
  return Array.from(new Set(phrases)).slice(0, 30);
}

export function detectDuplicateThemes(text, previousChapterSummaries = [], threshold = 0.6) {
  const current = new Set(extractKeyPhrases(text).slice(0, 24));
  if (current.size === 0) return { duplicated: false, similarity: 0, repeated: [] };
  let best = { similarity: 0, repeated: [] };
  for (const summary of previousChapterSummaries || []) {
    const prev = new Set(Array.isArray(summary?.keyPhrases) ? summary.keyPhrases.slice(0, 24) : []);
    const repeated = Array.from(current).filter((token) => prev.has(token));
    const similarity = repeated.length / Math.max(1, Math.min(current.size, prev.size || current.size));
    if (similarity > best.similarity) best = { similarity, repeated };
  }
  return { duplicated: best.similarity >= threshold, ...best };
}

export function rewriteChapterForDeduplication(text = "", contract = {}, duplicateReport = {}) {
  const repeated = new Set((duplicateReport.repeated || []).map((item) => String(item || "").trim()).filter(Boolean));
  const lines = String(text || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const kept = lines.filter((line) => !Array.from(repeated).some((phrase) => phrase && line.includes(phrase) && line.length < 160));
  const appendix = [
    `### ${contract.title || "이번 챕터"} 고유 결론`,
    `${contract.purpose || "이번 챕터"}에 맞춰, 앞 장의 표현을 반복하기보다 지금 적용할 판단 기준을 하나로 좁힙니다.`,
    `실행 기준: ${contract.fallbackAngle || "현재 확보된 근거 범위에서 보수적으로 판단하고, 다음 행동을 작게 검증하세요."}`,
  ].join("\n");
  return [...kept, appendix].join("\n\n");
}

export function createPdfDataOrchestration(input = {}) {
  const normalizedPayload = normalizePdfPayload(input);
  const chapterContracts = buildChapterContracts(normalizedPayload.fortuneType, normalizedPayload.chapterTemplate);
  const validation = validatePayloadBySeverity(normalizedPayload, chapterContracts);
  if (!validation.ok) {
    return {
      ok: false,
      normalizedPayload,
      chapterContracts,
      chapterEvidenceMap: {},
      missingDataReport: validation,
      generationMode: validation.generationMode,
    };
  }
  const recoveredPayload = fillRecoverableMissingData(normalizedPayload, validation);
  const chapterEvidenceMap = buildChapterEvidenceMap(recoveredPayload, chapterContracts);
  return {
    ok: true,
    normalizedPayload: recoveredPayload,
    chapterContracts,
    chapterEvidenceMap,
    missingDataReport: recoveredPayload.missingDataReport,
    generationMode: recoveredPayload.generationMode,
  };
}