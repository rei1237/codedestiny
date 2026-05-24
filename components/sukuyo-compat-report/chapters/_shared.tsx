import type { SukuyoPlaceholderChapterData } from "../../../types/sukuyo-compat-report/sukuyoCompatibilityReport.types";

export function safeText(value: string, fallback: string): string {
  const v = String(value || "").trim();
  if (!v || v === "about:blank" || v.startsWith("{") || v.startsWith("[")) return fallback;
  return v;
}

export function renderCategoryParagraphs(categories: Record<string, string>, fallback: string) {
  const values = Object.values(categories || {})
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  if (!values.length) {
    return [<p key="fallback">{fallback}</p>];
  }

  return values.map((value, index) => (
    <p key={`${index}-${value.slice(0, 24)}`}>{safeText(value, fallback)}</p>
  ));
}

export function renderPlaceholderChapter(
  chapter: SukuyoPlaceholderChapterData,
  chapterId: string,
  fallbackTitle: string,
  fallbackBody: string,
) {
  return (
    <section data-sukuyo-chapter={chapterId}>
      <h3>{safeText(chapter?.headline, fallbackTitle)}</h3>
      {renderCategoryParagraphs(chapter?.categories || {}, fallbackBody)}
    </section>
  );
}
