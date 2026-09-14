// Completeness is determined by required section identities, never a count of
// responses in the last wave. Invalid/empty sections cannot seal a paid report.
export function pendingReportSections(requiredKeys, sections = []) {
  const ready = new Set(sections.filter(section => section
    && (section.status == null || section.status === "ok")
    && typeof section.body === "string" && section.body.trim()).map(section => section.key));
  return requiredKeys.filter(key => !ready.has(key));
}
