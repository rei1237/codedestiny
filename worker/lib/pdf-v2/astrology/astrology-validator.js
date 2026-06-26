import { asArray, clean, stripTags } from "./astrology-premium.types.js";

const FORBIDDEN_TEXT = [
  "샘플",
  "예시",
  "placeholder",
  "Lorem ipsum",
  "프롬프트",
  "prompt",
  "schema",
  "debug",
  "fallback",
  "mock",
  "template",
  "raw calculation",
  "사주",
  "명리",
  "자미두수",
  "숙요",
  "숙요점",
  "베다",
  "vedic",
  "타로",
];

const ASTROLOGY_TERMS = [
  "점성술",
  "출생 차트",
  "네이탈",
  "태양",
  "달",
  "상승궁",
  "MC",
  "행성",
  "하우스",
  "어스펙트",
  "트랜짓",
  "별자리",
  "황도",
  "금성",
  "화성",
  "수성",
  "목성",
  "토성",
  "천왕성",
  "해왕성",
  "명왕성",
];

const SIGN_ALIASES = Object.freeze({
  aries: ["aries", "양자리"],
  taurus: ["taurus", "황소자리"],
  gemini: ["gemini", "쌍둥이자리"],
  cancer: ["cancer", "게자리"],
  leo: ["leo", "사자자리"],
  virgo: ["virgo", "처녀자리"],
  libra: ["libra", "천칭자리"],
  scorpio: ["scorpio", "전갈자리"],
  sagittarius: ["sagittarius", "사수자리"],
  capricorn: ["capricorn", "염소자리"],
  aquarius: ["aquarius", "물병자리"],
  pisces: ["pisces", "물고기자리"],
});

const PLANET_ALIASES = Object.freeze({
  Sun: ["sun", "태양"],
  Moon: ["moon", "달"],
  Mercury: ["mercury", "수성"],
  Venus: ["venus", "금성"],
  Mars: ["mars", "화성"],
  Jupiter: ["jupiter", "목성"],
  Saturn: ["saturn", "토성"],
  Uranus: ["uranus", "천왕성"],
  Neptune: ["neptune", "해왕성"],
  Pluto: ["pluto", "명왕성"],
});

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsForbiddenText(value) {
  const source = String(value || "");
  return FORBIDDEN_TEXT.find((term) => new RegExp(escapeRegExp(term), "i").test(source)) || "";
}

function findChapterSection(html, chapterId) {
  const source = String(html || "").trim();
  const match = source.match(new RegExp(`<section\\b[^>]*class=["'][^"']*\\bastrology-chapter\\b[^"']*["'][^>]*data-chapter-id=["']${escapeRegExp(chapterId)}["'][^>]*>[\\s\\S]*?<\\/section>`, "i"))
    || source.match(new RegExp(`<section\\b[^>]*data-chapter-id=["']${escapeRegExp(chapterId)}["'][^>]*class=["'][^"']*\\bastrology-chapter\\b[^"']*["'][^>]*>[\\s\\S]*?<\\/section>`, "i"));
  return match ? match[0] : "";
}

function readTagText(html, tag) {
  const match = String(html || "").match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return clean(stripTags(match ? match[1] : ""));
}

function readClassBlock(html, className) {
  const match = String(html || "").match(new RegExp(`<div\\b[^>]*class=["'][^"']*\\b${escapeRegExp(className)}\\b[^"']*["'][^>]*>[\\s\\S]*?<\\/div>`, "i"));
  return match ? match[0] : "";
}

function countTags(html, tag) {
  return (String(html || "").match(new RegExp(`<${tag}\\b`, "gi")) || []).length;
}

function textFromParagraphs(html) {
  return (String(html || "").match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [])
    .map(stripTags)
    .map((item) => clean(item))
    .filter(Boolean);
}

function repeatedSentenceIssue(text) {
  const counts = new Map();
  const sentences = String(text || "")
    .split(/[.!?。！？\n]+/)
    .map((item) => clean(item))
    .filter((item) => item.length >= 20);
  for (const sentence of sentences) {
    const count = (counts.get(sentence) || 0) + 1;
    if (count >= 3) return true;
    counts.set(sentence, count);
  }
  return false;
}

function astrologyTermCount(text) {
  const source = String(text || "").toLowerCase();
  return ASTROLOGY_TERMS.reduce((count, term) => count + (source.includes(term.toLowerCase()) ? 1 : 0), 0);
}

function uniqueChartTerms(input = {}) {
  const chart = input.astrologyChart || {};
  const terms = new Set();
  const add = (value) => {
    const text = clean(value, 80);
    if (text) terms.add(text);
  };
  for (const key of ["sun", "moon", "ascendant", "midheaven"]) {
    const point = chart[key];
    if (point && typeof point === "object") {
      add(point.name);
      add(point.sign);
      add(point.signKo);
      add(point.house ? `${point.house}하우스` : "");
    } else {
      add(point);
    }
  }
  for (const planet of asArray(chart.planets)) {
    add(planet?.name);
    add(planet?.label);
    add(planet?.sign);
    add(planet?.signKo);
    add(planet?.house ? `${planet.house}하우스` : "");
  }
  for (const aspect of asArray(chart.aspects)) {
    add(aspect?.planetA);
    add(aspect?.planetB);
    add(aspect?.type);
    add(aspect?.aspect);
  }
  for (const transit of asArray(chart.transits)) {
    add(transit?.planet);
    add(transit?.sign);
    add(transit?.aspectToNatal);
    add(transit?.theme);
  }
  return Array.from(terms).filter((term) => term.length >= 2);
}

function chartTermCount(text, input = {}) {
  const source = String(text || "").toLowerCase();
  return uniqueChartTerms(input)
    .slice(0, 80)
    .reduce((count, term) => count + (source.includes(term.toLowerCase()) ? 1 : 0), 0);
}

function signKey(value) {
  const text = clean(value).toLowerCase();
  for (const [key, aliases] of Object.entries(SIGN_ALIASES)) {
    if (aliases.some((alias) => text === alias || text.includes(alias))) return key;
  }
  return "";
}

function planetKey(value) {
  const text = clean(value).toLowerCase();
  for (const [key, aliases] of Object.entries(PLANET_ALIASES)) {
    if (aliases.some((alias) => text === alias || text.includes(alias))) return key;
  }
  return "";
}

function buildAllowedPlanetSigns(input = {}) {
  const chart = input.astrologyChart || {};
  const allowed = new Map();
  for (const planet of asArray(chart.planets)) {
    const planetName = planetKey(planet?.name || planet?.label || planet?.planet);
    const sign = signKey(planet?.sign || planet?.signKo || planet?.zodiacSign);
    if (!planetName || !sign) continue;
    if (!allowed.has(planetName)) allowed.set(planetName, new Set());
    allowed.get(planetName).add(sign);
  }
  for (const [field, planetName] of [["sun", "Sun"], ["moon", "Moon"]]) {
    const point = chart[field];
    const sign = signKey(point?.sign || point?.signKo || point);
    if (sign) {
      if (!allowed.has(planetName)) allowed.set(planetName, new Set());
      allowed.get(planetName).add(sign);
    }
  }
  return allowed;
}

function unprovidedPlanetSignIssue(text, input = {}) {
  const allowed = buildAllowedPlanetSigns(input);
  if (!allowed.size) return false;
  const source = String(text || "").toLowerCase();
  for (const [planet, aliases] of Object.entries(PLANET_ALIASES)) {
    const allowedSigns = allowed.get(planet);
    if (!allowedSigns?.size) continue;
    for (const [sign, signAliases] of Object.entries(SIGN_ALIASES)) {
      if (allowedSigns.has(sign)) continue;
      for (const planetAlias of aliases) {
        for (const signAlias of signAliases) {
          const pattern = new RegExp(`${escapeRegExp(planetAlias)}\\s*(?:은|는|이|가|:|-)?\\s*.{0,8}${escapeRegExp(signAlias)}`, "i");
          if (pattern.test(source)) return true;
        }
      }
    }
  }
  return false;
}

export function validateAstrologyChapterHtml(html, chapter = {}, input = {}) {
  const issues = [];
  const raw = String(html || "").trim();
  if (!raw) issues.push("html.empty");
  if (/```|~~~/.test(raw)) issues.push("html.code_block");
  if (/^\s*[{[]/.test(raw) || /["']chapters?["']\s*:/.test(raw)) issues.push("html.json_only");
  if (/<\/?(?:html|head|body)\b/i.test(raw)) issues.push("html.full_document");
  const forbidden = containsForbiddenText(raw);
  if (forbidden) issues.push(`html.forbidden:${forbidden}`);

  const section = findChapterSection(raw, chapter.id);
  if (!section) issues.push("section.missing");
  if (section && (section.match(/class=["'][^"']*\bastrology-chapter\b[^"']*["']/gi) || []).length !== 1) {
    issues.push("section.count");
  }

  const h2 = readTagText(section, "h2");
  if (!h2) issues.push("h2.missing");
  if (h2 && clean(chapter.title) && h2 !== clean(chapter.title)) issues.push("h2.title");

  const summary = readClassBlock(section, "chapter-summary");
  const body = readClassBlock(section, "chapter-body");
  const advice = readClassBlock(section, "chapter-advice");
  if (!summary) issues.push("summary.missing");
  if (!body) issues.push("body.missing");
  if (!advice) issues.push("advice.missing");
  if (countTags(body, "p") < 5) issues.push("body.paragraph_count");
  if (countTags(advice, "li") < 3) issues.push("advice.li_count");

  const plain = stripTags(section || raw);
  const bodyText = textFromParagraphs(body).join(" ");
  if (astrologyTermCount(bodyText) < 3) issues.push("body.astrology_terms");
  if (chartTermCount(bodyText, input) < 2) issues.push("body.chart_grounding");
  if (repeatedSentenceIssue(plain)) issues.push("body.repetition");
  if (unprovidedPlanetSignIssue(bodyText, input)) issues.push("body.unprovided_planet_position");

  return { ok: issues.length === 0, issues, html: section || raw };
}

export function parseAstrologyChapterHtml(html, chapter = {}, input = {}) {
  const validation = validateAstrologyChapterHtml(html, chapter, input);
  const section = validation.html;
  return {
    id: chapter.id,
    order: chapter.order,
    category: chapter.category,
    title: chapter.title,
    purpose: chapter.purpose,
    html: section,
    summary: textFromParagraphs(readClassBlock(section, "chapter-summary")).join(" "),
    body: textFromParagraphs(readClassBlock(section, "chapter-body")).join("\n"),
    advice: (String(readClassBlock(section, "chapter-advice")).match(/<li\b[^>]*>[\s\S]*?<\/li>/gi) || [])
      .map(stripTags)
      .map((item) => clean(item))
      .filter(Boolean),
    sectionCount: 1,
    validation,
  };
}

export function assertAllConfiguredChaptersIncluded(fullHtml, chapters = []) {
  const source = String(fullHtml || "");
  for (const chapter of asArray(chapters)) {
    const count = (source.match(new RegExp(`data-chapter-id=["']${escapeRegExp(chapter.id)}["']`, "g")) || []).length;
    if (count !== 1) {
      throw Object.assign(new Error(`ASTROLOGY_CHAPTER_RENDER_COUNT:${chapter.id}:${count}`), {
        code: "ASTROLOGY_CHAPTER_RENDER_COUNT",
        status: 422,
        chapterId: chapter.id,
      });
    }
  }
  return true;
}

export function assertEachChapterRenderedOnce(fullHtml, chapters = []) {
  return assertAllConfiguredChaptersIncluded(fullHtml, chapters);
}

export function assertNoRawJsonLeak(fullHtml) {
  const source = String(fullHtml || "");
  if (/^\s*[{[]/.test(stripTags(source)) || /```|schema|payload|debug|prompt|raw calculation/i.test(source)) {
    throw Object.assign(new Error("ASTROLOGY_PDF_RAW_JSON_LEAK"), { code: "ASTROLOGY_PDF_RAW_JSON_LEAK", status: 422 });
  }
  return true;
}

export function assertNoUndefinedValues(fullHtml) {
  if (/\b(?:undefined|null|NaN)\b|\[object Object\]/i.test(String(fullHtml || ""))) {
    throw Object.assign(new Error("ASTROLOGY_PDF_UNDEFINED_VALUE_LEAK"), { code: "ASTROLOGY_PDF_UNDEFINED_VALUE_LEAK", status: 422 });
  }
  return true;
}

export function assertNoForeignSystemTermsLeaked(fullHtml) {
  const forbidden = containsForbiddenText(stripTags(fullHtml));
  if (forbidden) {
    throw Object.assign(new Error("ASTROLOGY_PDF_FOREIGN_SYSTEM_TERM"), {
      code: "ASTROLOGY_PDF_FOREIGN_SYSTEM_TERM",
      status: 422,
      forbidden,
    });
  }
  return true;
}

export function assertNoRepeatedHeadings(fullHtml) {
  const headings = Array.from(String(fullHtml || "").matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi))
    .map((match) => clean(stripTags(match[1])))
    .filter(Boolean);
  const seen = new Set();
  for (const heading of headings) {
    const key = heading.toLowerCase();
    if (seen.has(key)) {
      throw Object.assign(new Error("ASTROLOGY_PDF_REPEATED_HEADING"), { code: "ASTROLOGY_PDF_REPEATED_HEADING", status: 422 });
    }
    seen.add(key);
  }
  return true;
}

export function assertAstrologyVisualBlocksIncluded(fullHtml) {
  const source = String(fullHtml || "");
  const required = [
    "astro-chart-basis",
    "astro-planet-table",
    "astro-house-table",
    "astro-aspect-table",
    "astro-final-advice",
  ];
  for (const marker of required) {
    if (!source.includes(marker)) {
      throw Object.assign(new Error(`ASTROLOGY_PDF_VISUAL_BLOCK_MISSING:${marker}`), {
        code: "ASTROLOGY_PDF_VISUAL_BLOCK_MISSING",
        status: 422,
        marker,
      });
    }
  }
  return true;
}

export function assertNoUnexpectedForeignTokens() {
  return true;
}

export function validateAstrologyFinalReportHtml(fullHtml, chapters = [], plan = {}) {
  const issues = [];
  try { assertAllConfiguredChaptersIncluded(fullHtml, plan.chapters || chapters); } catch (error) { issues.push(error.code || "chapter.include"); }
  try { assertNoRepeatedHeadings(fullHtml); } catch (error) { issues.push(error.code || "heading.repeat"); }
  try { assertNoRawJsonLeak(fullHtml); } catch (error) { issues.push(error.code || "raw_json"); }
  try { assertNoUndefinedValues(fullHtml); } catch (error) { issues.push(error.code || "undefined"); }
  try { assertNoForeignSystemTermsLeaked(fullHtml); } catch (error) { issues.push(error.code || "foreign_terms"); }
  try { assertAstrologyVisualBlocksIncluded(fullHtml); } catch (error) { issues.push(error.code || "visual"); }
  if (asArray(chapters).length !== asArray(plan.chapters).length) issues.push("chapter.count");
  if (!String(fullHtml || "").includes("<!doctype html>")) issues.push("html.doctype");
  return { ok: issues.length === 0, issues };
}

export function validateAstrologyPdfCompletionPayload({ pdfReady = {}, chapters = [], plan = {}, requireDownloadUrl = false } = {}) {
  const issues = [];
  const llmAssembly = pdfReady?.llmAssembly || {};
  if (!clean(pdfReady.html)) issues.push("pdfReady.html");
  if (requireDownloadUrl && !clean(pdfReady.downloadUrl || pdfReady.pdfUrl || pdfReady.htmlUrl)) issues.push("pdfReady.url");
  if (clean(pdfReady.renderFormat) !== "pdf-archive") issues.push("pdfReady.renderFormat");
  if (clean(pdfReady.mimeType) !== "application/pdf") issues.push("pdfReady.mimeType");
  if (llmAssembly.enabled !== true) issues.push("llmAssembly.enabled");
  if (llmAssembly.externalGeneration !== true) issues.push("llmAssembly.externalGeneration");
  if (llmAssembly.fallbackUsed === true) issues.push("llmAssembly.fallbackUsed");
  if (asArray(chapters).length !== asArray(plan.chapters).length) issues.push("chapter.count");
  if (clean(pdfReady.html) && validateAstrologyFinalReportHtml(pdfReady.html, chapters, plan).ok !== true) issues.push("html.final");
  return { ok: issues.length === 0, issues };
}
