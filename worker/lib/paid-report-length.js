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
  return chars.slice(0, low).join("").trimEnd();
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
