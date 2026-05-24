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

function collectByPath(source, tokens, index = 0) {
  if (index >= tokens.length) return [source];
  if (!isMeaningful(source)) return [];

  const token = tokens[index];
  const isArrayToken = token.endsWith("[]");
  const key = isArrayToken ? token.slice(0, -2) : token;
  const value = key ? source?.[key] : source;

  if (isArrayToken) {
    if (!Array.isArray(value) || value.length === 0) return [];
    return value.flatMap((item) => collectByPath(item, tokens, index + 1));
  }

  return collectByPath(value, tokens, index + 1);
}

function getValuesByPath(source, path) {
  const tokens = splitPath(path);
  if (!tokens.length) return [];
  return collectByPath(source, tokens, 0);
}

export function validateChapterData(normalizedData, chapter) {
  const requiredFields = Array.isArray(chapter?.requiredFields) ? chapter.requiredFields : [];
  const missingFields = [];

  for (const field of requiredFields) {
    const values = getValuesByPath(normalizedData, field);
    const ok = values.some((value) => isMeaningful(value));
    if (!ok) missingFields.push(field);
  }

  return {
    ok: missingFields.length === 0,
    missingFields,
  };
}

export function removeRepeatedParagraphs(content) {
  const source = String(content || "").trim();
  if (!source) return "";

  const seen = new Set();
  const paragraphs = source
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter(Boolean);

  const unique = [];
  for (const paragraph of paragraphs) {
    const key = paragraph.replace(/\s+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(paragraph);
  }

  const sentenceSeen = new Set();
  const compacted = unique
    .map((paragraph) => {
      const lines = String(paragraph || "")
        .split(/(?<=[.!?。！？])\s+|\n+/)
        .map((line) => line.trim())
        .filter(Boolean);
      const kept = [];
      for (const line of lines) {
        if (line.length < 36) {
          kept.push(line);
          continue;
        }
        const fp = line.replace(/\s+/g, " ").toLowerCase();
        if (!fp || sentenceSeen.has(fp)) continue;
        sentenceSeen.add(fp);
        kept.push(line);
      }
      return kept.join("\n");
    })
    .filter(Boolean);

  return compacted.join("\n\n");
}

const BANNED_PATTERNS = [
  /데이터가\s*없어\s*기본\s*해석만\s*제공/i,
  /일반론으로\s*보완/i,
  /정확한\s*데이터가\s*부족/i,
  /임의\s*추정/i,
  /데이터가\s*일부\s*누락된\s*궁은\s*branch,\s*mainStars,\s*strength,\s*sihua/i,
  /reportPayload\(=calculatedData\)/i,
  /chapterJsonPacks/i,
  /\[SYSTEM\]|\[USER\]|중요\s*규칙\s*:/i,
];

const VEDIC_CROSS_DOMAIN = /(Ascendant|Solar\s*Return|Synastry|Composite)/i;
const FORBIDDEN_CATEGORY_TITLES = new Set([
  "핵심 요약",
  "구조 해석",
  "강점과 기회",
  "주의할 패턴",
  "현실 적용 전략",
  "최종 제언",
  "로드맵",
  "강점",
  "주의점",
  "현실 전략",
  "종합 분석",
  "기본 해석",
]);

export function normalizeCategoryTitle(value) {
  return String(value || "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function validateUniqueCategoryNamesByChapter(chapterSchema = []) {
  const allTitles = new Map();
  const chapters = Array.isArray(chapterSchema) ? chapterSchema : [];

  for (const chapter of chapters) {
    const chapterId = String(chapter?.chapterId || chapter?.id || "unknown");
    const chapterTitles = new Set();
    const categories = Array.isArray(chapter?.categories) ? chapter.categories : [];

    for (const category of categories) {
      const title = normalizeCategoryTitle(category?.title);
      if (!title || title.length < 4) {
        throw new Error("CATEGORY_TITLE_TOO_SHORT");
      }

      if (FORBIDDEN_CATEGORY_TITLES.has(title)) {
        throw new Error(`FORBIDDEN_CATEGORY_TITLE: ${title}`);
      }

      const normalizedKey = title.toLowerCase();

      if (chapterTitles.has(normalizedKey)) {
        throw new Error(`DUPLICATED_CATEGORY_TITLE_IN_CHAPTER: ${chapterId} / ${title}`);
      }
      if (allTitles.has(normalizedKey)) {
        throw new Error(`DUPLICATED_CATEGORY_TITLE_IN_REPORT: ${title}`);
      }

      chapterTitles.add(normalizedKey);
      allTitles.set(normalizedKey, chapterId);
    }
  }

  return true;
}

export function validateGeneratedChapterText(text, options = {}) {
  const source = removeRepeatedParagraphs(String(text || "").trim());
  const minChars = Number(options?.minChars || 0);
  const maxChars = Number(options?.maxChars || 0);
  const pdfType = String(options?.pdfType || "");
  const errors = [];

  if (!isMeaningful(options?.normalizedData)) {
    errors.push("MISSING_NORMALIZED_DATA");
  }

  if (!source) {
    errors.push("EMPTY_TEXT");
  }

  if (source.length < minChars) {
    errors.push("TOO_SHORT");
  }

  if (maxChars > 0 && source.length > maxChars) {
    errors.push("TOO_LONG");
  }

  if (BANNED_PATTERNS.some((re) => re.test(source))) {
    errors.push("BANNED_PHRASE_FOUND");
  }

  const repeatedSentences = source
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 36)
    .map((s) => s.replace(/\s+/g, " ").toLowerCase());
  if (new Set(repeatedSentences).size < repeatedSentences.length) {
    errors.push("REPEATED_SENTENCE_FOUND");
  }

  if (pdfType === "vedicPremium" && VEDIC_CROSS_DOMAIN.test(source)) {
    errors.push("MIXED_DOMAIN_TERMS");
  }

  return {
    ok: errors.length === 0,
    errors,
    length: source.length,
  };
}
