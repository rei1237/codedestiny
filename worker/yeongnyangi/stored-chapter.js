// Draft bodies are persisted only after the existing local delivery/quality checks.
export function storedChapterDraft(row) {
  const draft=row?.generationCheckpoint?.chapterDrafts?.[row?.chapters?.length || 0];
  const body=draft?.body;
  return body&&typeof body==='object'&&!Array.isArray(body)&&Object.keys(body).length?draft:null;
}

export function canResumeStoredChapter(row) {
  const total=row?.snapshot?.manifest?.length || 0;
  return Boolean(total&&((row?.chapters?.length || 0)>=total||storedChapterDraft(row)));
}
