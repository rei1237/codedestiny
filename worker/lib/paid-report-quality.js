// New reports only: historical purchased documents retain their original read contract.
export const PAID_REPORT_MIN_BODY_CHARS = 20000;

export function paidReportBody(text) {
  return String(text || "").normalize("NFC")
    .replace(/\r\n/g, "\n")
    .split("\n")
    // Short standalone bold labels and Setext headings are presentation, not body.
    .filter((line, index, lines) => !/^\s*(?:\*\*|__)[^\n.!?。？！]{1,80}(?:\*\*|__)\s*$/u.test(line)
      && !/^\s*(?:={3,}|-{3,})\s*$/.test(line)
      && !/^\s*(?:={3,}|-{3,})\s*$/.test(lines[index + 1] || ""))
    .filter((line) => !/^\s*(?:#{1,6}\s|(?:\d+[.)]\s|제\s*\d+\s*장).{0,70}$)/u.test(line))
    .filter((line) => !/^\s*(?:[-*+]\s*)?\[[^\]]+\]\(#.*\)\s*$/.test(line))
    .join("\n")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`#>|~]/g, "");
}

export function countPaidReportBodyChars(text) {
  return Array.from(paidReportBody(text).replace(/\s/gu, "")).length;
}

/**
 * Comparison key for one sentence inside a body line — the same inline cleanup paidReportBody
 * applies, without its whole-line heading filter. Deduping must use this exact key, or a sentence
 * the repeat check flags (e.g. one starting with "제1장에서") is never removed.
 */
export function reportSentenceKey(sentence) {
  return String(sentence || "").normalize("NFC")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`#>|~]/g, "")
    .replace(/\s/gu, "");
}

export function hasRepeatedReportPassage(text) {
  const sentences = paidReportBody(text).split(/[.!?。？！\n]+/u);
  const seen = new Set();
  for (const sentence of sentences) {
    const normalized = reportSentenceKey(sentence);
    if (normalized.length < 24) continue;
    if (seen.has(normalized)) return true;
    seen.add(normalized);
  }
  return false;
}

const sentenceKeys = (text) => text.split(/[.!?。？！]+/u).map(reportSentenceKey).filter((key) => key.length >= 24);
/**
 * Removes a later copy of any sentence hasRepeatedReportPassage would flag, inside text and
 * against prior (earlier accepted parts), so one repeated sentence never discards a paid part.
 * Only whole sentences are dropped; the caller rechecks length and repetition afterwards.
 */
export function dropRepeatedReportSentences(text, prior = "") {
  if (typeof text !== "string") return text;
  const seen = new Set(paidReportBody(prior).split(/[.!?。？！\n]+/u).map(reportSentenceKey).filter((key) => key.length >= 24));
  const keep = (sentence) => {
    const keys = sentenceKeys(sentence);
    if (keys.some((key) => seen.has(key))) return false;
    keys.forEach((key) => seen.add(key));
    return true;
  };
  return text.split(/\n\s*\n/u).map((paragraph) => paragraph.split("\n").map((line) => line
    .split(/(?<=[.!?。？！]["'”’)\]」』]*)\s+|(?<=[。？！]["'”’)\]」』]*)(?=\S)/u)
    .filter(keep).join(" ").trimEnd()).filter((line) => line.trim()).join("\n").trim())
    .filter(Boolean).join("\n\n");
}
