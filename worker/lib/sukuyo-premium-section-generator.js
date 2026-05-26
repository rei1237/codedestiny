import { callGeminiText } from "./gemini.js";

const SECTION_FORBIDDEN_PHRASES = [
  "Chapter 1",
  "Chapter 2",
  "fallback",
  "placeholder",
  "TODO",
  "undefined",
  "null",
  "NaN",
  "Internal server error",
  "JSON",
  "payload",
  "reportPayload",
  "rawBasicResult",
  "localStorage",
  "기본 해석을 바탕으로 일반적으로",
  "참고용",
  "자동 복구",
];

function clean(value) {
  return String(value || "").trim();
}

function unique(values) {
  return Array.from(new Set((values || []).map((value) => clean(value)).filter(Boolean)));
}

function countChars(value) {
  return clean(value).replace(/\s+/g, "").length;
}

function normalizeMode(value) {
  const raw = clean(value).toLowerCase();
  if (raw.includes("compat") || raw.includes("couple")) return "compatibility";
  return "personal";
}

function extractSentences(text) {
  return clean(text)
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map((row) => row.trim())
    .filter((row) => row.length >= 28);
}

function buildCompatAnchors(payload = {}) {
  const personA = payload.personA || {};
  const personB = payload.personB || {};
  const compatibility = payload.compatibility || {};
  return unique([
    personA.mansion,
    personA.mansionHanja,
    personB.mansion,
    personB.mansionHanja,
    compatibility.relationType,
    compatibility.relationTypeHan,
    compatibility.distanceLabel,
    compatibility.distanceType,
  ]);
}

function buildSectionPrompt({ mode, chapter, sectionTitle, payload, previousTexts = [] }) {
  const compat = payload.compatibility || {};
  const systemRules = [
    "너는 숙요점 프리미엄 PDF 전담 상담가다.",
    "계산은 이미 끝났고, 너는 오직 제공된 데이터만 해석한다.",
    "27숙, 관계 유형, 거리, 역할, 점수, 키워드를 새로 만들거나 추측하지 않는다.",
    "JSON, 키명, 내부 로그, payload, API, localStorage 같은 내부 용어를 절대 노출하지 않는다.",
    "막연한 운세 문장 대신 관찰 가능한 감정, 행동, 관계 운영 전략으로 쓴다.",
    "결정론적 예언, 공포 조장, 추상적인 만능 조언을 금지한다.",
    mode === "compatibility"
      ? "궁합 모드에서는 모든 섹션에서 A와 B의 본명숙, relationType, distance를 자연스럽게 반영한다."
      : "개인 모드에서는 본명숙과 감정/관계/현실 패턴을 구체적으로 연결한다.",
  ].join("\n");

  const previousBan = unique(previousTexts.flatMap((text) => extractSentences(text))).slice(0, 12);
  const requiredLength = mode === "compatibility" ? 950 : 850;

  return [
    systemRules,
    "",
    `[챕터 제목] ${clean(chapter?.title)}`,
    `[섹션 제목] ${sectionTitle}`,
    `[최소 분량] 공백 제외 ${requiredLength}자 이상`,
    "[필수 작성 규칙]",
    "- 섹션 제목의 주제를 벗어나지 않는다.",
    mode === "compatibility" ? "- A와 B를 모두 언급하고, 두 사람의 본명숙을 이름 그대로 반영한다." : "- 본명숙 이름과 핵심 기질을 본문에 자연스럽게 반영한다.",
    compat.relationType ? `- relationType '${compat.relationType}'를 직접 반영한다.` : "",
    compat.distanceLabel ? `- distance '${compat.distanceLabel}'를 직접 반영한다.` : "",
    previousBan.length ? `[이전 챕터 중복 금지 문장]\n${JSON.stringify(previousBan, null, 2)}` : "",
    "[해석 데이터]",
    JSON.stringify(payload, null, 2),
    "[출력 형식]",
    "설명문만 출력한다. 제목, 번호, JSON, 마크다운 코드블록은 출력하지 않는다.",
  ].filter(Boolean).join("\n");
}

function validateSection({ mode, text, payload, previousTexts = [], sectionTitle = "", minChars = 800 }) {
  const source = clean(text);
  const violations = [];
  if (!source) violations.push("EMPTY");
  if (countChars(source) < minChars) violations.push("TOO_SHORT");

  const lower = source.toLowerCase();
  const forbidden = SECTION_FORBIDDEN_PHRASES.filter((phrase) => lower.includes(String(phrase).toLowerCase()));
  if (forbidden.length) violations.push("FORBIDDEN_PHRASE");

  const compat = payload.compatibility || {};
  const personA = payload.personA || {};
  const personB = payload.personB || {};

  if (mode === "compatibility") {
    const hasA = [personA.mansion, personA.mansionHanja].filter(Boolean).some((token) => source.includes(token));
    const hasB = [personB.mansion, personB.mansionHanja].filter(Boolean).some((token) => source.includes(token));
    if (!hasA) violations.push("MISSING_PERSON_A_MANSION");
    if (!hasB) violations.push("MISSING_PERSON_B_MANSION");
    if (compat.relationType && !source.includes(String(compat.relationType))) violations.push("MISSING_RELATION_TYPE");
    if (compat.distanceLabel && !source.includes(String(compat.distanceLabel))) violations.push("MISSING_DISTANCE");
  } else {
    const hasMain = [personA.mansion, personA.mansionHanja].filter(Boolean).some((token) => source.includes(token));
    if (!hasMain) violations.push("MISSING_MAIN_MANSION");
  }

  const sentenceSet = new Set(extractSentences(source));
  if (sentenceSet.size < extractSentences(source).length) violations.push("INTERNAL_REPEAT");
  const repeatedAcross = previousTexts.some((prev) => extractSentences(prev).some((line) => line && source.includes(line)));
  if (repeatedAcross) violations.push("CROSS_REPEAT");

  const titleTokens = unique(String(sectionTitle || "")
    .replace(/[0-9장.]/g, " ")
    .split(/[\s,·/:()]+/)
    .filter((token) => token.length >= 2 && !["위한", "에서", "하는", "방식", "구조", "조건", "전략", "패턴"].includes(token)));
  if (titleTokens.length > 0 && !titleTokens.some((token) => source.includes(token))) {
    violations.push("SECTION_RELEVANCE_LOW");
  }

  return {
    ok: violations.length === 0,
    violations,
    forbidden,
    chars: countChars(source),
  };
}

function formatChapterText(chapter, sections) {
  const lines = [`# ${clean(chapter?.title)}`];
  for (const section of sections) {
    lines.push("", `## ${clean(section.heading)}`, clean(section.body));
  }
  return lines.join("\n").trim();
}

function summarizeChapters(chapters = []) {
  return chapters
    .flatMap((chapter) => Array.isArray(chapter?.sections) ? chapter.sections : [])
    .map((section) => clean(section?.body))
    .filter(Boolean)
    .join(" ")
    .slice(0, 800);
}

function buildSukuyoPremiumReportObject({ mode, payload, chapters = [] }) {
  const personA = payload.personA || {};
  const personB = payload.personB || {};
  const compatibility = payload.compatibility || {};
  const title = mode === "compatibility"
    ? `${clean(personA.name || "A")} x ${clean(personB.name || "B")} 숙요 궁합 리포트`
    : `${clean(personA.name || "사용자")} 숙요 리포트`;
  const subtitle = mode === "compatibility"
    ? `${clean(personA.mansion)} · ${clean(personB.mansion)} · ${clean(compatibility.relationType)} · ${clean(compatibility.distanceLabel)}`
    : `${clean(personA.mansion)} · ${clean(personA.keywordSummary)}`;

  return {
    title,
    subtitle,
    summary: summarizeChapters(chapters),
    profile: {
      mode,
      personA,
      personB: mode === "compatibility" ? personB : null,
      compatibility: mode === "compatibility" ? compatibility : null,
    },
    chapters: chapters.map((chapter, index) => ({
      chapterId: clean(chapter?.key) || `chapter_${index + 1}`,
      title: clean(chapter?.title),
      sections: (chapter?.sections || []).map((section, sectionIndex) => ({
        sectionId: `${clean(chapter?.key) || `chapter_${index + 1}`}_section_${sectionIndex + 1}`,
        title: clean(section?.heading),
        content: clean(section?.body),
      })),
    })),
  };
}

function buildPayload(context = {}) {
  const book = context?.sukuyoBookContext || {};
  const user = book?.user || {};
  const partner = book?.partner || {};
  const compat = book?.compatibility || {};
  return {
    personA: {
      name: clean(user?.profile?.name),
      birthDate: clean(user?.profile?.birthDate),
      birthTime: clean(user?.profile?.birthTime),
      gender: clean(user?.profile?.gender),
      mansion: clean(user?.sukuyo?.mansion),
      mansionHanja: clean(context?.mainStar?.nameHanja),
      mansionNumber: user?.sukuyo?.mansionNumber ?? context?.mainStar?.mansionNumber ?? null,
      group: clean(user?.sukuyo?.mansionGroup || context?.mainStar?.group),
      keywordSummary: clean(user?.sukuyo?.personalitySummary || context?.mainStar?.temperament || context?.mainStar?.coreKeyword),
      strength: clean(context?.mainStar?.strength),
      shadow: clean(user?.sukuyo?.cautionPattern || context?.mainStar?.shadow),
      keywords: unique(user?.sukuyo?.mansionKeywords || []),
    },
    personB: {
      name: clean(partner?.profile?.name),
      birthDate: clean(partner?.profile?.birthDate),
      birthTime: clean(partner?.profile?.birthTime),
      gender: clean(partner?.profile?.gender),
      mansion: clean(partner?.sukuyo?.mansion),
      mansionHanja: "",
      mansionNumber: partner?.sukuyo?.mansionNumber ?? null,
      group: clean(partner?.sukuyo?.mansionGroup),
      keywordSummary: clean(partner?.sukuyo?.personalitySummary),
      shadow: clean(partner?.sukuyo?.relationshipStyle),
      keywords: unique(partner?.sukuyo?.mansionKeywords || []),
    },
    compatibility: {
      relationType: clean(compat?.relationType),
      relationTypeHan: clean(compat?.relationLabel),
      distanceLabel: clean(context?.relationship?.distanceLabel || compat?.distanceLabel || compat?.distanceType),
      distanceType: clean(compat?.distanceType),
      score: compat?.score ?? context?.relationship?.compatibilityIndex ?? null,
      emotionalDynamic: clean(compat?.emotionalDynamic),
      conflictPattern: clean(compat?.conflictPattern),
      adviceSummary: clean(compat?.adviceSummary),
      longTermPotential: clean(compat?.longTermPotential),
      riskPattern: clean(compat?.riskPattern),
    },
    chapterContext: {
      userQuestion: clean(book?.promptContext?.userQuestion),
      engineSummary: clean(book?.promptContext?.engineSummary),
    },
  };
}

async function generateSukuyoPremiumChapterSections({ env, context, chapter, chapterId, previousChapterTexts = [] }) {
  const mode = normalizeMode(context?.reportMode || context?.sukuyoBookContext?.mode);
  const payload = buildPayload(context);
  const sectionTitles = Array.isArray(chapter?.sections) ? chapter.sections.map((row) => clean(row)).filter(Boolean) : [];
  const generatedSections = [];
  const sectionHistory = previousChapterTexts.slice();
  const maxAttempts = Math.max(1, Math.min(3, Number(env?.PREMIUM_SUKUYO_SECTION_RETRIES || 3)));
  const timeoutMs = Number(env?.PREMIUM_SUKUYO_GEMINI_TIMEOUT_MS || env?.PREMIUM_GEMINI_TIMEOUT_MS || 70000);

  for (let index = 0; index < sectionTitles.length; index += 1) {
    const sectionTitle = sectionTitles[index];
    const minChars = mode === "compatibility" ? 950 : 850;
    let lastMessage = "";
    let lastViolations = [];
    let acceptedText = "";

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const prompt = buildSectionPrompt({
        mode,
        chapter,
        sectionTitle,
        payload,
        previousTexts: [...sectionHistory, ...generatedSections.map((row) => row.body)],
      });
      const llm = await callGeminiText(env, prompt, {
        keyEnvKeys: ["PREMIUM_SUKUYO_GEMINI_API_KEY"],
        modelEnvKeys: ["PREMIUM_SUKUYO_GEMINI_MODEL"],
        temperature: 0.6,
        topP: 0.9,
        maxOutputTokens: 4096,
        timeoutMs,
        totalTimeoutMs: timeoutMs,
        maxAttemptsPerPair: 1,
      });
      if (!llm?.ok || !clean(llm?.text)) {
        lastMessage = clean(llm?.message || llm?.error || "GEMINI_CALL_FAILED");
        continue;
      }
      const text = clean(llm.text);
      const validation = validateSection({
        mode,
        text,
        payload,
        previousTexts: [...sectionHistory, ...generatedSections.map((row) => row.body)],
        sectionTitle,
        minChars,
      });
      if (validation.ok) {
        acceptedText = text;
        break;
      }
      lastMessage = validation.violations.join(",") || "SECTION_VALIDATION_FAILED";
      lastViolations = validation.violations;
    }

    if (!acceptedText) {
      return {
        ok: false,
        code: "SUKUYO_LLM_GENERATION_FAILED",
        message: "숙요 PDF 본문 생성에 실패했습니다. 잠시 후 다시 시도해주세요.",
        retryable: true,
        status: 502,
        failedSections: [{
          chapterId: Number(chapterId || 0),
          chapterKey: clean(chapter?.key),
          chapterTitle: clean(chapter?.title),
          sectionIndex: index + 1,
          sectionTitle,
          reason: lastMessage || "SECTION_GENERATION_FAILED",
          violations: lastViolations,
        }],
      };
    }

    generatedSections.push({
      heading: sectionTitle,
      body: acceptedText,
    });
    sectionHistory.push(acceptedText);
  }

  const chapterText = formatChapterText(chapter, generatedSections);
  return {
    ok: true,
    text: chapterText,
    chapterMeta: {
      key: clean(chapter?.key),
      num: Number(chapterId || 0),
      title: clean(chapter?.title),
      subtitle: clean(chapter?.goal),
    },
    chapterSpecificSections: sectionTitles,
    sections: generatedSections,
    usedFallback: false,
    reportObject: buildSukuyoPremiumReportObject({
      mode,
      payload,
      chapters: [{ key: clean(chapter?.key), title: clean(chapter?.title), sections: generatedSections }],
    }),
  };
}

export {
  buildSukuyoPremiumReportObject,
  generateSukuyoPremiumChapterSections,
  validateSection as validateSukuyoSectionDraft,
};
