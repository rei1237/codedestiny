import { safeSectionText, uniqueNonEmptyLines } from "./renderHelpers";

type AnyChapter = {
  title?: string;
  summary?: string;
  sections?: Record<string, string | undefined>;
};

type RenderOptions = {
  chapter: AnyChapter | null | undefined;
  fallbackTitle: string;
};

export function renderZiweiChapterBlock({ chapter, fallbackTitle }: RenderOptions) {
  if (!chapter) {
    return (
      <section>
        <h2>{fallbackTitle}</h2>
        <p>챕터 데이터가 준비되지 않아 기본 요약 모드로 표시합니다.</p>
      </section>
    );
  }

  const rows = uniqueNonEmptyLines(
    Object.entries(chapter.sections || {}).map(([key, value]) => `${key}: ${safeSectionText(value)}`),
  );

  return (
    <section>
      <h2>{chapter.title || fallbackTitle}</h2>
      {rows.map((row) => (
        <p key={row}>{row}</p>
      ))}
      {chapter.summary ? <p>{chapter.summary}</p> : null}
    </section>
  );
}
