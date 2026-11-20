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
const BOLD_MARK = /\*\*|__/gu;
const LIST_MARKER_ONLY = /^\s*(?:[-*+]|\d+[.)])\s*$/u;
// A paragraph opener that points back at the sentence before it. Removing that sentence would
// leave the paragraph starting with a reference to nothing ("이는 …"), so the opener is dropped.
const DEPENDENT_OPENER = /^(?:이는|이것은|이것이|이건|이게|이처럼|이렇듯|이와 같이|이 때문에|이로 인해|그래서|그러므로|따라서|그러니까|그러니|또한|게다가|그리고|하지만|그러나|그런데|반면에|반면|즉|결국)(?:,\s*|\s+)(?=\S)/u;
/**
 * Removes a later copy of any sentence hasRepeatedReportPassage would flag, inside text and
 * against prior (earlier accepted parts), so one repeated sentence never discards a paid part.
 * Only whole sentences are dropped; the caller rechecks length and repetition afterwards.
 * R6d: a removal never leaves broken markdown or a dangling reference — a dropped sentence that
 * opens or closes a bold span keeps its bold fragment (e.g. a list item title), a list marker left
 * alone is removed with its line, and a paragraph that now starts with a back-reference opener
 * loses only that opener. Nothing removed is restored, so the result never gains a repeat.
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
  const cleanLine = (line, state) => {
    let open = false;
    const out = [];
    for (const chunk of line.split(/(?<=[.!?。？！]["'”’)\]」』]*)\s+|(?<=[。？！]["'”’)\]」』]*)(?=\S)/u)) {
      const marks = [...chunk.matchAll(BOLD_MARK)];
      if (keep(chunk)) {
        if (!out.length && state.dropped && !state.kept) out.push({ text: chunk, opener: true });
        else out.push({ text: chunk });
      } else {
        state.dropped = true;
        // Keep only the bold fragment so ** stays paired: the closing part when a span is open,
        // otherwise the opening part that a later kept sentence closes.
        if (marks.length % 2) {
          const fragment = open ? chunk.slice(0, marks[0].index + 2) : chunk.slice(marks[marks.length - 1].index);
          out.push({ text: fragment, fragment: true });
        }
      }
      if (marks.length % 2) open = !open;
    }
    const sentences = out.map((item) => item.text);
    const first = out.findIndex((item) => !item.fragment);
    if (first >= 0 && out[first].opener && first === 0) sentences[0] = sentences[0].replace(DEPENDENT_OPENER, "");
    if (out.some((item) => !item.fragment)) state.kept = true;
    const joined = sentences.join(" ").trimEnd();
    return LIST_MARKER_ONLY.test(joined) && !LIST_MARKER_ONLY.test(line) ? "" : joined;
  };
  return text.split(/\n\s*\n/u).map((paragraph) => {
    const state = { dropped: false, kept: false };
    return paragraph.split("\n").map((line) => cleanLine(line, state)).filter((line) => line.trim()).join("\n").trim();
  }).filter(Boolean).join("\n\n");
}
