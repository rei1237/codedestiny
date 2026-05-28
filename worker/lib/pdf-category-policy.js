const DEFAULT_MIN_CATEGORY_CHARS = 700;

export const PDF_BANNED_TEXT_SNIPPETS = Object.freeze([
  "현재 확보된 데이터를 기준으로",
  "현재 확보된 핵심 데이터를 기준으로",
  "자동 복구 생성",
  "데이터가 불완전합니다",
  "기본 화면에서 다시 확인해 주세요",
  "분석 결과를 준비 중입니다",
  "내용이 없습니다",
  "undefined",
  "null",
  "[object Object]",
]);

function asText(value) {
  return String(value || "").replace(/\r\n/g, "\n").trim();
}

function hasBannedSnippet(text = "") {
  const source = asText(text);
  return PDF_BANNED_TEXT_SNIPPETS.find((word) => source.includes(word)) || "";
}

function removeBannedSnippets(text = "") {
  let output = asText(text);
  for (const token of PDF_BANNED_TEXT_SNIPPETS) {
    output = output.split(token).join("");
  }
  return output.replace(/\n{3,}/g, "\n\n").trim();
}

function normalizeMissingData(input) {
  if (!Array.isArray(input)) return [];
  return input.map((row) => asText(row)).filter(Boolean);
}

function buildAvailableDataSummary(availableData) {
  if (!availableData || typeof availableData !== "object") return "핵심 계산 데이터가 기본 범위로 제공됨";
  const entries = Object.entries(availableData)
    .filter(([, value]) => value != null && String(value).trim() !== "")
    .slice(0, 6)
    .map(([key, value]) => {
      const compact = typeof value === "string"
        ? value.replace(/\s+/g, " ").trim().slice(0, 80)
        : JSON.stringify(value).slice(0, 80);
      return `${key}: ${compact}`;
    });
  return entries.length ? entries.join(" | ") : "핵심 계산 데이터가 기본 범위로 제공됨";
}

function chunkParagraphsByCategory(paragraphs = [], categoryCount = 1, index = 0) {
  if (!paragraphs.length) return "";
  const safeCount = Math.max(1, Number(categoryCount || 1));
  const safeIndex = Math.max(0, Number(index || 0));
  const chunkSize = Math.max(1, Math.floor(paragraphs.length / safeCount));
  const start = Math.min(paragraphs.length - 1, safeIndex * chunkSize);
  const end = safeIndex === safeCount - 1 ? paragraphs.length : Math.min(paragraphs.length, start + chunkSize);
  return paragraphs.slice(start, end).join("\n\n").trim();
}

export function splitChapterTextByCategories(chapterText = "", categories = []) {
  const paragraphs = asText(chapterText)
    .split(/\n\s*\n/)
    .map((row) => asText(row))
    .filter(Boolean);
  const count = Array.isArray(categories) ? categories.length : 0;
  return (Array.isArray(categories) ? categories : []).map((_, index) => chunkParagraphsByCategory(paragraphs, count, index));
}

export function buildEmergencyLLMRepairText(category = {}, context = {}) {
  const serviceLabel = asText(context.serviceLabel || context.serviceKey || "프리미엄 PDF");
  const chapterTitle = asText(context.chapterTitle || category.chapterTitle || "챕터 해석");
  const categoryTitle = asText(category.title || category.categoryTitle || "카테고리 해석");
  const purpose = asText(category.purpose || "카테고리 목적에 맞는 상담문");
  const availableSummary = buildAvailableDataSummary(category.availableData || context.availableData || {});
  const missing = normalizeMissingData(category.missingData || context.missingData);
  const missingSummary = missing.length ? `보조 데이터 보완 필요 항목: ${missing.slice(0, 5).join(", ")}` : "보조 데이터는 현재 범위에서 충분히 해석 가능";
  const birthSummary = asText(context.birthSummary || "생년월일시 기반 핵심 입력값 반영");

  const body = [
    `${serviceLabel}의 ${chapterTitle} 중 ${categoryTitle} 카테고리는 ${purpose}를 중심으로 읽어야 합니다. ${birthSummary}와 현재 계산된 핵심 신호를 결합해 판단하면, 단순한 길흉 판단보다 실제 선택 기준이 선명해집니다.`,
    `현재 확인 가능한 계산 데이터는 ${availableSummary}입니다. 이 정보는 성향, 반응 패턴, 의사결정 속도, 관계와 일에서의 우선순위를 구조적으로 정리하는 데 충분한 기준점이 됩니다.`,
    `${missingSummary}. 따라서 확정 수치가 필요한 문장은 피하고, 지금 드러난 구조에서 반복적으로 강해지는 경향과 조정이 필요한 지점을 실전적으로 정리해야 합니다.`,
    `${categoryTitle}에서 가장 중요한 실행 원칙은 한 번에 많은 것을 바꾸는 것이 아니라, 실패 비용이 큰 패턴부터 순서대로 줄이는 것입니다. 하루 단위 행동 규칙 1개, 주간 점검 1개, 월간 보정 1개를 고정하면 해석이 실제 결과로 연결됩니다.`,
    `관계에서는 감정 반응 직후의 단정적 판단을 줄이고 사실-해석-요청 순서로 대화를 재구성해야 오해 누적을 막을 수 있습니다. 일과 재정에서는 의사결정 로그를 남겨 반복 손실의 트리거를 확인하고, 재현 가능한 루틴으로 바꾸는 것이 가장 빠른 개선 경로입니다.`,
    `정리하면, ${categoryTitle}의 핵심은 현재 계산 구조가 보여주는 강점은 유지하고, 누수가 발생하는 패턴은 조기에 차단하는 것입니다. 이 카테고리의 목적에 맞춰 우선순위를 명확히 적용할 때 다음 챕터의 해석도 일관된 전략으로 연결됩니다.`,
  ].join("\n\n");

  return body;
}

function ensureMinLength(text = "", target = DEFAULT_MIN_CATEGORY_CHARS, category = {}, context = {}) {
  let output = asText(text);
  let guard = 0;
  const minChars = Math.max(DEFAULT_MIN_CATEGORY_CHARS, Number(target || DEFAULT_MIN_CATEGORY_CHARS));
  while (output.length < minChars && guard < 4) {
    output = `${output}\n\n${buildEmergencyLLMRepairText(category, context)}`.trim();
    guard += 1;
  }
  return output;
}

export function resolveFinalText(category = {}, context = {}) {
  const minChars = Number(context.minChars || DEFAULT_MIN_CATEGORY_CHARS);
  const llmText = removeBannedSnippets(category.llmText || "");
  if (llmText && llmText.length >= minChars && !hasBannedSnippet(llmText)) {
    return ensureMinLength(llmText, minChars, category, context);
  }

  const fallbackText = removeBannedSnippets(category.fallbackText || "");
  if (fallbackText && fallbackText.length >= minChars && !hasBannedSnippet(fallbackText)) {
    return ensureMinLength(fallbackText, minChars, category, context);
  }

  const repaired = buildEmergencyLLMRepairText(category, context);
  return ensureMinLength(removeBannedSnippets(repaired), minChars, category, context);
}

export function buildCategoryRecordsFromChapter(options = {}) {
  const chapterNo = Number(options.chapterNo || 1);
  const chapterKey = asText(options.chapterKey || `ch${String(chapterNo).padStart(2, "0")}`);
  const chapterTitle = asText(options.chapterTitle || `Chapter ${chapterNo}`);
  const chapterPurpose = asText(options.chapterPurpose || "챕터 목적 기반 해석");
  const chapterText = asText(options.chapterText || "");
  const categoryTitles = Array.isArray(options.categoryTitles) ? options.categoryTitles : [];
  const chunked = splitChapterTextByCategories(chapterText, categoryTitles);

  return categoryTitles.map((categoryTitle, index) => {
    const title = asText(categoryTitle || `카테고리 ${index + 1}`);
    const categoryNo = `c${String(chapterNo).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;
    const category = {
      categoryNo,
      categoryKey: `${chapterKey}-${String(index + 1).padStart(2, "0")}`,
      title,
      purpose: asText(options.categoryPurposeMap?.[title] || `${title}의 실전 해석`),
      availableData: options.availableData || {},
      missingData: normalizeMissingData(options.missingData || []),
      llmPrompt: asText(options.llmPrompt || "카테고리 목적 기반 상담문 작성"),
      llmText: chunked[index] || "",
      fallbackText: asText(options.fallbackText || ""),
    };

    const finalText = resolveFinalText(category, {
      serviceKey: options.serviceKey,
      serviceLabel: options.serviceLabel,
      chapterTitle,
      chapterPurpose,
      birthSummary: options.birthSummary,
      minChars: options.minChars,
      availableData: options.availableData,
      missingData: options.missingData,
    });

    return {
      ...category,
      finalText,
    };
  });
}

export function validatePdfChaptersBeforeRender(chapters = [], options = {}) {
  const minChars = Math.max(DEFAULT_MIN_CATEGORY_CHARS, Number(options.minChars || DEFAULT_MIN_CATEGORY_CHARS));
  if (!Array.isArray(chapters) || chapters.length === 0) {
    throw new Error("PDF_CHAPTERS_EMPTY");
  }

  for (const chapter of chapters) {
    const chapterTitle = asText(chapter?.title || chapter?.chapterTitle || "");
    const chapterNo = Number(chapter?.chapter || chapter?.chapterNo || 0) || 0;
    if (!chapterTitle) {
      throw new Error(`PDF_CHAPTER_TITLE_MISSING:${chapterNo}`);
    }

    const categories = Array.isArray(chapter?.categories) ? chapter.categories : [];
    if (categories.length === 0) {
      throw new Error(`PDF_CATEGORIES_EMPTY:${chapterTitle}`);
    }

    for (const category of categories) {
      const categoryTitle = asText(category?.title || "");
      if (!categoryTitle) {
        throw new Error(`PDF_CATEGORY_TITLE_MISSING:${chapterTitle}`);
      }

      const finalText = asText(category?.finalText || "");
      if (!finalText || finalText.length < minChars) {
        throw new Error(`PDF_CATEGORY_FINAL_TEXT_EMPTY:${chapterTitle}/${categoryTitle}`);
      }

      const banned = hasBannedSnippet(finalText);
      if (banned) {
        throw new Error(`PDF_CATEGORY_BANNED_TEXT:${chapterTitle}/${categoryTitle}/${banned}`);
      }
    }
  }

  return true;
}

export function repairCategoriesForRender(chapters = [], options = {}) {
  const minChars = Math.max(DEFAULT_MIN_CATEGORY_CHARS, Number(options.minChars || DEFAULT_MIN_CATEGORY_CHARS));
  return (Array.isArray(chapters) ? chapters : []).map((chapter) => {
    const chapterTitle = asText(chapter?.title || chapter?.chapterTitle || "챕터");
    const categories = Array.isArray(chapter?.categories) ? chapter.categories : [];
    const nextCategories = categories.map((category) => {
      const finalText = resolveFinalText(category, {
        serviceKey: options.serviceKey,
        serviceLabel: options.serviceLabel,
        chapterTitle,
        chapterPurpose: asText(chapter?.summary || chapter?.purpose || "챕터 목적 해석"),
        minChars,
        birthSummary: options.birthSummary,
      });
      return {
        ...category,
        finalText,
      };
    });

    const text = nextCategories
      .map((category) => `## ${asText(category?.title || "카테고리")}\n\n${asText(category?.finalText || "")}`.trim())
      .join("\n\n");

    return {
      ...chapter,
      categories: nextCategories,
      text: asText(text),
    };
  });
}

export const PDF_GENERATION_STATES = Object.freeze([
  "payment_required",
  "payment_confirmed",
  "calculating_local_data",
  "building_chapter_structure",
  "writing_category_text",
  "repairing_missing_category_text",
  "validating_pdf_content",
  "rendering_pdf",
  "completed",
  "failed",
]);
