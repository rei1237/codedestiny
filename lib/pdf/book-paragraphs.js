/** Reflow only. No sentence is summarized, reordered or dropped. */
export function bookParagraphs(value) {
  const out = [];
  const segmenter = new Intl.Segmenter('ko', { granularity: 'sentence' });
  for (const original of String(value || '').split(/\n+/).filter(line => line.trim())) {
    let paragraph = '';
    for (const { segment } of segmenter.segment(original)) {
      if (paragraph && (paragraph.length + segment.length > 230 || paragraph.length > 130)) {
        out.push(paragraph.trim()); paragraph = '';
      }
      paragraph += segment;
    }
    if (paragraph.trim()) out.push(paragraph.trim());
  }
  return out;
}
