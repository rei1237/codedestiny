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

  return unique.join("\n\n");
}

const BANNED_PATTERNS = [
  /데이터가\s*없어\s*기본\s*해석만\s*제공/i,
  /일반론으로\s*보완/i,
  /정확한\s*데이터가\s*부족/i,
  /임의\s*추정/i,
];

const VEDIC_CROSS_DOMAIN = /(Ascendant|Solar\s*Return|Synastry|Composite)/i;

export function validateGeneratedChapterText(text, options = {}) {
  const source = String(text || "").trim();
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

  if (pdfType === "vedicPremium" && VEDIC_CROSS_DOMAIN.test(source)) {
    errors.push("MIXED_DOMAIN_TERMS");
  }

  return {
    ok: errors.length === 0,
    errors,
    length: source.length,
  };
}
