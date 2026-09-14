// New reports only: historical purchased documents retain their original read contract.
export const PAID_REPORT_MIN_BODY_CHARS = 20000;

export function paidReportBody(text) {
  return String(text || "").normalize("NFC")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !/^\s*(?:#{1,6}\s|(?:\d+[.)]\s|제\s*\d+\s*장).{0,70}$)/u.test(line))
    .filter((line) => !/^\s*(?:[-*+]\s*)?\[[^\]]+\]\(#.*\)\s*$/.test(line))
    .join("\n")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`#>|~]/g, "");
}

export function countPaidReportBodyChars(text) {
  return Array.from(paidReportBody(text).replace(/\s/gu, "")).length;
}

export function hasRepeatedReportPassage(text) {
  const sentences = paidReportBody(text).split(/[.!?。？！\n]+/u);
  const seen = new Set();
  for (const sentence of sentences) {
    const normalized = sentence.replace(/\s/gu, "").trim();
    if (normalized.length < 24) continue;
    if (seen.has(normalized)) return true;
    seen.add(normalized);
  }
  return false;
}
