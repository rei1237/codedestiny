import Ajv from "ajv";

const PREMIUM_CHAPTER_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["chapterId", "chapterTitle", "metaData", "subChapters", "engineSummaryJson"],
  properties: {
    chapterId: { type: "string", minLength: 1 },
    chapterTitle: { type: "string", minLength: 1 },
    metaData: {
      type: "object",
      additionalProperties: false,
      required: ["serviceType", "coreKeyword"],
      properties: {
        serviceType: { type: "string", minLength: 1 },
        coreKeyword: { type: "string", minLength: 1 },
      },
    },
    subChapters: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["subTitle", "analysisText", "strategicGuidance"],
        properties: {
          subTitle: { type: "string", minLength: 1 },
          analysisText: { type: "string", minLength: 1 },
          strategicGuidance: { type: "string", minLength: 1 },
        },
      },
    },
    engineSummaryJson: {
      type: "object",
      additionalProperties: false,
      required: ["coreVibe", "actionPriority"],
      properties: {
        coreVibe: { type: "string", minLength: 1 },
        actionPriority: {
          type: "object",
          additionalProperties: false,
          required: ["immediate", "stop", "review"],
          properties: {
            immediate: { type: "string", minLength: 1 },
            stop: { type: "string", minLength: 1 },
            review: { type: "string", minLength: 1 },
          },
        },
      },
    },
  },
};

const ajv = new Ajv({ allErrors: true, strict: false });
const validatePremiumChapterJson = ajv.compile(PREMIUM_CHAPTER_JSON_SCHEMA);

function toCleanString(value, fallback = "") {
  const text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  return text || fallback;
}

function stripHeadingToken(value, fallback = "") {
  const raw = toCleanString(value, fallback);
  return raw
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .trim() || fallback;
}

function toSentences(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .split(/(?<=[.!?。！？])\s+/)
    .map((row) => row.trim())
    .filter(Boolean);
}

function pickGuidanceText(text, fallback = "Execute one concrete action and track impact for 7 days.") {
  const source = toCleanString(text);
  if (!source) return fallback;
  const sentences = toSentences(source);
  const preferred = sentences.find((row) => /(execute|action|plan|review|strategy|stop|focus|priority|risk|check|schedule|decide|record|boundary|process|system|routine|measure)/i.test(row));
  if (preferred && preferred.length >= 18) return preferred;
  if (sentences.length > 0) {
    const merged = sentences.slice(0, 2).join(" ").trim();
    if (merged.length >= 18) return merged;
  }
  return source.length >= 18 ? source : fallback;
}

function parseMarkdownSections(text) {
  const source = String(text || "").replace(/\r/g, "");
  if (!source.trim()) return [];

  const lines = source.split("\n");
  const sections = [];
  let currentTitle = "";
  let currentBody = [];

  const flush = () => {
    const body = currentBody.join("\n").trim();
    if (!body) return;
    sections.push({
      title: stripHeadingToken(currentTitle, `Section ${sections.length + 1}`),
      body,
    });
  };

  for (const line of lines) {
    if (/^#{2,4}\s+/.test(line)) {
      flush();
      currentTitle = line;
      currentBody = [];
      continue;
    }
    currentBody.push(line);
  }
  flush();

  if (sections.length > 0) return sections;

  return source
    .split(/\n\s*\n+/)
    .map((row) => row.replace(/\s+/g, " ").trim())
    .filter((row) => row.length >= 40)
    .slice(0, 6)
    .map((body, idx) => ({
      title: `Section ${idx + 1}`,
      body,
    }));
}

function normalizeSectionRow(section, idx) {
  const title = stripHeadingToken(section?.title || section?.subTitle, `Section ${idx + 1}`);
  const analysisText = toCleanString(section?.analysisText || section?.content || section?.body || section?.text, "");
  const strategicGuidance = toCleanString(
    section?.strategicGuidance || section?.guidance || section?.action || section?.advice,
    pickGuidanceText(analysisText),
  );
  return {
    subTitle: title,
    analysisText: analysisText || "Evidence-based analysis is limited in source text; use the available context to define the next decision criteria.",
    strategicGuidance,
  };
}

function buildSubChapters({ requiredHeadings = [], text = "", chapterJson = null }) {
  const headings = Array.isArray(requiredHeadings)
    ? requiredHeadings.map((row) => stripHeadingToken(row)).filter(Boolean)
    : [];

  const explicitSubChapters = Array.isArray(chapterJson?.subChapters)
    ? chapterJson.subChapters.map((row, idx) => normalizeSectionRow(row, idx)).filter((row) => row.analysisText)
    : [];

  const legacySections = Array.isArray(chapterJson?.sections)
    ? chapterJson.sections.map((row, idx) => normalizeSectionRow(row, idx)).filter((row) => row.analysisText)
    : [];

  const markdownSections = parseMarkdownSections(text)
    .map((row, idx) => normalizeSectionRow(row, idx))
    .filter((row) => row.analysisText);

  const base = explicitSubChapters.length
    ? explicitSubChapters
    : (legacySections.length ? legacySections : markdownSections);

  if (headings.length === 0) {
    const limited = base.slice(0, 8);
    return limited.length > 0
      ? limited
      : [{
        subTitle: "Core Analysis",
        analysisText: toCleanString(text, "Evidence for this chapter is limited; prioritize decision quality over speed."),
        strategicGuidance: pickGuidanceText(text),
      }];
  }

  return headings.map((heading, idx) => {
    const row = base[idx] || {};
    const fallbackBody = base.length > 0
      ? base[Math.min(idx, base.length - 1)]?.analysisText
      : toCleanString(text, "Evidence for this chapter is limited; define one measurable next step and review after 7 days.");
    const analysisText = toCleanString(row.analysisText, fallbackBody);
    return {
      subTitle: heading,
      analysisText,
      strategicGuidance: toCleanString(row.strategicGuidance, pickGuidanceText(analysisText)),
    };
  });
}

export function normalizePremiumChapterJsonContract({
  reportType = "",
  chapterId = "",
  chapterTitle = "",
  requiredHeadings = [],
  text = "",
  chapterJson = null,
} = {}) {
  const normalizedChapterId = toCleanString(chapterJson?.chapterId || chapterId || "chapter");
  const normalizedChapterTitle = toCleanString(
    chapterJson?.chapterTitle || chapterJson?.title || chapterTitle,
    `Chapter ${normalizedChapterId}`,
  );

  const subChapters = buildSubChapters({ requiredHeadings, text, chapterJson });
  const summarySeed = toCleanString(
    chapterJson?.summary || chapterJson?.masterConclusion || chapterJson?.coreVibe || text,
    "Focus on verifiable signals, clear boundaries, and repeatable execution.",
  );
  const firstParagraph = summarySeed.split(/\n\s*\n/)[0] || summarySeed;
  const guidanceSeed = pickGuidanceText(summarySeed);

  return {
    chapterId: normalizedChapterId,
    chapterTitle: normalizedChapterTitle,
    metaData: {
      serviceType: toCleanString(chapterJson?.metaData?.serviceType || reportType, "premium-report"),
      coreKeyword: toCleanString(chapterJson?.metaData?.coreKeyword || chapterJson?.coreKeyword || firstParagraph.slice(0, 140), "risk-priority-execution"),
    },
    subChapters,
    engineSummaryJson: {
      coreVibe: toCleanString(chapterJson?.engineSummaryJson?.coreVibe || chapterJson?.masterConclusion || firstParagraph, "Anchor this chapter on evidence and execution."),
      actionPriority: {
        immediate: toCleanString(chapterJson?.engineSummaryJson?.actionPriority?.immediate || guidanceSeed, "Define one immediate execution action with owner and due date."),
        stop: toCleanString(chapterJson?.engineSummaryJson?.actionPriority?.stop || chapterJson?.cautions?.[0] || "Stop ambiguous commitments without explicit scope."),
        review: toCleanString(chapterJson?.engineSummaryJson?.actionPriority?.review || "Review measurable progress after 7 days and adjust the plan."),
      },
    },
  };
}

export function validateNormalizedPremiumChapterJson(value) {
  const ok = validatePremiumChapterJson(value);
  if (ok) return { ok: true, errors: [] };
  const errors = Array.isArray(validatePremiumChapterJson.errors)
    ? validatePremiumChapterJson.errors.map((row) => {
      const path = String(row?.instancePath || row?.schemaPath || "").trim() || "root";
      const message = String(row?.message || "invalid").trim() || "invalid";
      return `${path}:${message}`;
    })
    : ["root:invalid"];
  return { ok: false, errors };
}

export { PREMIUM_CHAPTER_JSON_SCHEMA };
