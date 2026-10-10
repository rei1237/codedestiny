import { countPaidReportBodyChars } from "./paid-report-quality.js";

// Preserve formatting and Unicode characters; only overlong bodies are changed.
export function trimPaidReportText(text, maxChars) {
  if (countPaidReportBodyChars(text) <= maxChars) return text;
  const chars = Array.from(String(text).normalize("NFC"));
  let low = 0;
  let high = chars.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (countPaidReportBodyChars(chars.slice(0, mid).join("")) <= maxChars) low = mid;
    else high = mid - 1;
  }
  // Prefer the last complete sentence (or finished body line) so the reader never sees a word cut
  // mid-way (R6·R7·R8 2026-10-10). A single overlong sentence still falls back to the plain cut.
  const cut = lastSentenceBoundary(chars, low) || low;
  const kept = chars.slice(0, cut).join("").trimEnd();
  return (kept.match(/\*\*/g) || []).length % 2 ? `${kept}**` : kept;
}

function lastSentenceBoundary(chars, limit) {
  const SENTENCE_END = /[.!?…。？！]/u;
  const SENTENCE_CLOSER = /["'”’)\]」』*]/u;
  const HEADING_LINE = /^\s*(?:#{1,6}\s|(?:\*\*|__)[^\n]*(?:\*\*|__)\s*$)/u;
  let best = 0;
  let lineStart = 0;
  for (let i = 0; i < limit; i++) {
    if (chars[i] === "\n") {
      // A finished body line (list item, label-less paragraph) is complete; headings and blank lines are not.
      const line = chars.slice(lineStart, i).join("");
      if (line.trim() && !HEADING_LINE.test(line)) best = i;
      lineStart = i + 1;
      continue;
    }
    if (!SENTENCE_END.test(chars[i])) continue;
    // A list number ("3. ") opens an item; cutting after it ended R8's action plan on "3.".
    const from = Math.max(lineStart, i - 4);
    if (chars[i] === "." && (from === lineStart ? /(?:^|\s)\d{1,3}$/u : /\s\d{1,3}$/u).test(chars.slice(from, i).join(""))) continue;
    let end = i + 1;
    while (end < chars.length && SENTENCE_CLOSER.test(chars[end])) end++;
    // "3.5" is not a sentence end: the terminator must be followed by whitespace or the text end.
    // Closers past the limit are dropped; an open ** is re-closed by the caller.
    if (end === chars.length || /\s/u.test(chars[end])) best = Math.min(end, limit);
  }
  return best;
}

export function trimPaidReportSections(sections, maxChars) {
  const total = Object.values(sections).reduce((sum, row) => sum + countPaidReportBodyChars(row?.body), 0);
  if (total <= maxChars) return sections;
  const nonempty = Object.values(sections).filter(row => countPaidReportBodyChars(row?.body) > 0).length;
  // Reserve room for each required body before distributing the remaining budget.
  const minimum = maxChars >= nonempty ? 1 : 0;
  const remaining = maxChars - minimum * nonempty;
  return Object.fromEntries(Object.entries(sections).map(([key, row]) => {
    const size = countPaidReportBodyChars(row?.body);
    const budget = size > 0 ? minimum + Math.floor(remaining * size / total) : 0;
    return [key, { ...row, body: trimPaidReportText(row?.body, budget) }];
  }));
}
