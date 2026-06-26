import Ajv from "ajv";
import {
  FORBIDDEN_TEXT_RE,
  MIN_TOTAL_CHARS,
} from "../../saju-new-year-constants.js";
import {
  SAJU_NEW_YEAR_LLM_MANUSCRIPT_SOURCE,
  SAJU_NEW_YEAR_LLM_SCHEMA_VERSION,
  clean,
  parseJsonStrict,
} from "./saju-new-year-premium.types.js";

const MIN_LLM_SECTION_CHARS = 850;
const MIN_LLM_CHAPTER_CHARS = 4500;
const CHAPTER_DOMAIN_TOKENS = Object.freeze({
  1: ["총운", "세운", "원국", "오행", "기준"],
  2: ["커리어", "일", "직장", "조직", "평가", "성과", "전환"],
  3: ["재물", "돈", "수입", "지출", "계약", "가격", "소비"],
  4: ["인간관계", "귀인", "협업", "파트너십", "갈등", "관계"],
  5: ["연애", "결혼", "가족", "인연", "감정", "관계"],
  6: ["건강", "생활", "피로", "스트레스", "회복", "마음"],
  7: ["1분기", "2분기", "3분기", "4분기", "결정", "타이밍"],
  8: ["위험", "합충", "형파해", "반전", "실수", "회복"],
  9: ["1월", "2월", "3월", "월별", "실행", "정비"],
  10: ["최종", "정리", "밀어붙일", "내려놓", "루틴", "로드맵"],
});

const CHAPTER_JSON_SCHEMA = {
  type: "object",
  additionalProperties: true,
  required: ["schemaVersion", "targetYear", "chapterNo", "title", "focus", "sections"],
  properties: {
    schemaVersion: { type: "string", minLength: 1 },
    targetYear: { type: "number" },
    chapterNo: { type: "number" },
    title: { type: "string", minLength: 1 },
    focus: { type: "string", minLength: 1 },
    sections: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: true,
        required: ["title", "body"],
        properties: {
          title: { type: "string", minLength: 1 },
          body: { type: "string", minLength: 1 },
          sajuEvidence: { type: "array", items: { type: "string" } },
          keyPoints: { type: "array", items: { type: "string" } },
          actionGuide: { type: "array", items: { type: "string" } },
          checklist: { type: "array", items: { type: "string" } },
          caution: { type: "array", items: { type: "string" } },
        },
      },
    },
    monthlyFortunes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: true,
        required: ["month", "title", "flow", "advice", "caution", "action", "luckyRoutine"],
        properties: {
          month: { type: "number" },
          title: { type: "string", minLength: 1 },
          flow: { type: "string", minLength: 1 },
          advice: { type: "string", minLength: 1 },
          caution: { type: "string", minLength: 1 },
          action: { type: "string", minLength: 1 },
          luckyRoutine: { type: "string", minLength: 1 },
        },
      },
    },
    finalAdvice: {
      type: "object",
      additionalProperties: true,
      required: ["title", "body"],
      properties: {
        title: { type: "string", minLength: 1 },
        body: { type: "string", minLength: 1 },
      },
    },
  },
};

const ajv = new Ajv({ allErrors: true, strict: false });
const validateChapterJsonSchema = ajv.compile(CHAPTER_JSON_SCHEMA);

const MECHANICAL_COPY_RE = /이\s*기능은|이\s*결과는|분석\s*결과는|콘텐츠\s*블록|서비스|보고서|리포트|사용자에게\s*보여|생성된\s*텍스트|템플릿|자동\s*생성|로컬|fallback|debug|schema|prompt|json|llm|api|engine|validation|retry/i;
const MOJIBAKE_RE = /[\uFFFD\uF900-\uFAFF]|[?][\uAC00-\uD7A3]|[\u3131-\u318E]{2,}|[\u6028\u6C85\u8ADB\u85E5\u9DAF\u8036\u6E26\u8A1D\u96C5\u91CE\u8E02\u6FE1]/;

function textLength(value) {
  return clean(value).replace(/\s+/g, "").length;
}

function toList(value) {
  return Array.isArray(value) ? value.map((item) => clean(item, 500)).filter(Boolean) : [];
}

function normalizeSection(section = {}) {
  return {
    title: clean(section.title, 200),
    body: clean(section.body || section.text || section.finalText, 20000),
    finalText: clean(section.body || section.text || section.finalText, 20000),
    text: clean(section.body || section.text || section.finalText, 20000),
    sajuEvidence: toList(section.sajuEvidence),
    keyPoints: toList(section.keyPoints),
    actionGuide: toList(section.actionGuide),
    checklist: toList(section.checklist),
    caution: toList(section.caution),
  };
}

function normalizeMonthlyFortune(row = {}, fallbackMonth = 0) {
  return {
    month: Number(row.month || fallbackMonth),
    title: clean(row.title, 200),
    flow: clean(row.flow, 2000),
    advice: clean(row.advice, 1000),
    caution: clean(row.caution, 1000),
    action: clean(row.action, 1000),
    luckyRoutine: clean(row.luckyRoutine, 1000),
  };
}

function forbiddenTextIssues(text, prefix) {
  const issues = [];
  if (!clean(text)) issues.push(`${prefix}_empty`);
  if (FORBIDDEN_TEXT_RE.test(text)) issues.push(`${prefix}_forbidden_text`);
  FORBIDDEN_TEXT_RE.lastIndex = 0;
  if (MECHANICAL_COPY_RE.test(text)) issues.push(`${prefix}_mechanical_copy`);
  if (MOJIBAKE_RE.test(text)) issues.push(`${prefix}_mojibake`);
  if (/\b(?:undefined|null|NaN)\b|\[object Object\]/i.test(text)) issues.push(`${prefix}_broken_marker`);
  return issues;
}

function countTokenMatches(text = "", tokens = []) {
  const source = clean(text);
  return (Array.isArray(tokens) ? tokens : []).reduce((count, token) => (
    clean(token) && source.includes(clean(token)) ? count + 1 : count
  ), 0);
}

function sectionTitleTokens(title = "") {
  return Array.from(new Set(clean(title).match(/[가-힣A-Za-z0-9]{2,}/g) || []))
    .filter((token) => !["2026년", "올해", "흐름", "기본", "방식", "가능성", "전략", "원칙"].includes(token))
    .slice(0, 6);
}

export function parseAndValidateSajuNewYearChapterJson(rawText, { chapter, targetYear, allowMock = false } = {}) {
  let parsed;
  try {
    parsed = typeof rawText === "string" ? parseJsonStrict(rawText) : rawText;
  } catch (error) {
    return { ok: false, issues: [error?.code || "json_parse_failed"], parsed: null };
  }

  const schemaOk = validateChapterJsonSchema(parsed);
  const issues = schemaOk ? [] : (validateChapterJsonSchema.errors || []).map((error) => `schema_${error.instancePath || "root"}_${error.keyword}`);
  const expectedSections = Array.isArray(chapter?.categories) ? chapter.categories : [];
  const sections = Array.isArray(parsed?.sections) ? parsed.sections.map(normalizeSection) : [];

  if (clean(parsed?.schemaVersion) !== SAJU_NEW_YEAR_LLM_SCHEMA_VERSION) issues.push("schema_version_mismatch");
  if (Number(parsed?.targetYear) !== Number(targetYear)) issues.push("target_year_mismatch");
  if (Number(parsed?.chapterNo) !== Number(chapter?.no)) issues.push("chapter_no_mismatch");
  if (clean(parsed?.title) !== clean(chapter?.title)) issues.push("chapter_title_mismatch");
  if (sections.length !== expectedSections.length) issues.push("section_count_mismatch");

  let chapterChars = 0;
  const chapterBodyText = sections.map((section) => section.body).join("\n");
  const domainTokens = CHAPTER_DOMAIN_TOKENS[Number(chapter?.no || 0)] || [];
  if (!allowMock && countTokenMatches(chapterBodyText, domainTokens) < Math.min(2, domainTokens.length)) {
    issues.push("chapter_domain_anchor_missing");
  }
  expectedSections.forEach((title, index) => {
    const section = sections[index] || {};
    const body = clean(section.body);
    chapterChars += textLength(body);
    if (clean(section.title) !== clean(title)) issues.push(`section_${index + 1}_title_mismatch`);
    const titleTokens = sectionTitleTokens(title);
    if (titleTokens.length && countTokenMatches(body, titleTokens) < 1) issues.push(`section_${index + 1}_topic_anchor_missing`);
    if (textLength(body) < MIN_LLM_SECTION_CHARS) issues.push(`section_${index + 1}_too_short`);
    if (body.split(/\n\s*\n/).filter(Boolean).length < 3) issues.push(`section_${index + 1}_paragraphs_missing`);
    issues.push(...forbiddenTextIssues(body, `section_${index + 1}`));
  });

  if (chapterChars < MIN_LLM_CHAPTER_CHARS) issues.push("chapter_too_short");

  const monthlyFortunes = Array.isArray(parsed?.monthlyFortunes)
    ? parsed.monthlyFortunes.map((row, index) => normalizeMonthlyFortune(row, index + 1))
    : [];
  if (Number(chapter?.no) === 9) {
    if (monthlyFortunes.length !== 12) issues.push("monthly_fortunes_count");
    monthlyFortunes.forEach((row, index) => {
      if (Number(row.month) !== index + 1) issues.push(`monthly_${index + 1}_month_mismatch`);
      for (const key of ["title", "flow", "advice", "caution", "action", "luckyRoutine"]) {
        if (textLength(row[key]) < 12) issues.push(`monthly_${index + 1}_${key}_too_short`);
        issues.push(...forbiddenTextIssues(row[key], `monthly_${index + 1}_${key}`));
      }
    });
  }

  const normalized = {
    no: Number(chapter?.no),
    id: String(chapter?.no),
    title: clean(chapter?.title),
    focus: clean(parsed?.focus, 1000),
    sections,
    categories: sections.map((section) => ({
      title: section.title,
      finalText: section.body,
      text: section.body,
    })),
    text: sections.map((section) => `## ${section.title}\n${section.body}`).join("\n\n"),
    source: SAJU_NEW_YEAR_LLM_MANUSCRIPT_SOURCE,
    metadata: {
      source: SAJU_NEW_YEAR_LLM_MANUSCRIPT_SOURCE,
      schemaVersion: SAJU_NEW_YEAR_LLM_SCHEMA_VERSION,
    },
  };

  return {
    ok: issues.length === 0,
    issues,
    parsed,
    chapter: normalized,
    monthlyFortunes,
    finalAdvice: parsed?.finalAdvice ? {
      title: clean(parsed.finalAdvice.title || "마지막 조언", 200),
      body: clean(parsed.finalAdvice.body, 6000),
    } : null,
    stats: {
      chapterChars,
      sectionCount: sections.length,
    },
  };
}

export function validateSajuNewYearLlmReport({ chapters = [], monthlyFortunes = [], finalAdvice = null, targetYear, expectedChapters = [] } = {}) {
  const issues = [];
  const expectedSource = Array.isArray(expectedChapters) && expectedChapters.length ? expectedChapters : [];
  const expected = expectedSource.map((chapter) => ({
    ...chapter,
    title: clean(chapter.title).replace(/\{YEAR\}/g, String(targetYear)),
    categories: (chapter.categories || []).map((category) => clean(category).replace(/\{YEAR\}/g, String(targetYear))),
  }));
  if (!Array.isArray(chapters) || chapters.length !== expected.length) issues.push("report_chapter_count");
  let totalChars = 0;
  expected.forEach((spec, index) => {
    const chapter = chapters[index] || {};
    if (clean(chapter.title) !== clean(spec.title)) issues.push(`report_chapter_${index + 1}_title`);
    const sections = Array.isArray(chapter.sections) ? chapter.sections : [];
    if (sections.length !== spec.categories.length) issues.push(`report_chapter_${index + 1}_sections`);
    sections.forEach((section, sectionIndex) => {
      totalChars += textLength(section.body);
      if (clean(section.title) !== clean(spec.categories[sectionIndex])) issues.push(`report_chapter_${index + 1}_section_${sectionIndex + 1}_title`);
      if (textLength(section.body) < MIN_LLM_SECTION_CHARS) issues.push(`report_chapter_${index + 1}_section_${sectionIndex + 1}_short`);
    });
  });
  if (totalChars < MIN_TOTAL_CHARS) issues.push("report_total_chars");
  if (!Array.isArray(monthlyFortunes) || monthlyFortunes.length !== 12) issues.push("report_monthly_count");
  if (!finalAdvice?.body || textLength(finalAdvice.body) < 350) issues.push("report_final_advice");
  issues.push(...forbiddenTextIssues(chapters.map((chapter) => chapter.text).join("\n"), "report"));
  if (finalAdvice?.body) issues.push(...forbiddenTextIssues(finalAdvice.body, "final_advice"));
  return {
    ok: issues.length === 0,
    issues,
    stats: {
      totalChars,
      chapterCount: Array.isArray(chapters) ? chapters.length : 0,
      monthlyCount: Array.isArray(monthlyFortunes) ? monthlyFortunes.length : 0,
    },
  };
}
