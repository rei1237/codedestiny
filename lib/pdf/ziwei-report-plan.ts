export type ZiweiReportChapter = { id: string; title: string; body: string };
export type ZiweiReportBlock = { kind: 'heading' | 'body'; text: string };

/** 신·구 저장본을 모두 보존한다. 제목 표식만 구분하고 본문을 자르거나 재해석하지 않는다. */
export function ziweiReportBlocks(body: string): ZiweiReportBlock[] {
  const blocks: ZiweiReportBlock[] = [];
  let lines: string[] = [];
  const flush = () => { if (lines.length) blocks.push({ kind: 'body', text: lines.join('\n') }); lines = []; };
  for (const line of String(body || '').replace(/\r\n?/g, '\n').split('\n')) {
    const heading = line.match(/^\s*(?:●\s*|#{1,4}\s+)(.+)$/);
    if (heading) { flush(); blocks.push({ kind: 'heading', text: heading[1] }); }
    else if (!line.trim()) flush();
    else lines.push(line);
  }
  flush();
  return blocks;
}

export function ziweiChapterPreview(chapter: ZiweiReportChapter): string {
  const first = ziweiReportBlocks(chapter.body).find(block => block.kind === 'body')?.text || '';
  const sentence = first.match(/^[\s\S]{1,220}?[.!?。](?:\s|$)/)?.[0]?.trim();
  return sentence || (first.length > 180 ? `${first.slice(0, 180)}…` : first);
}
