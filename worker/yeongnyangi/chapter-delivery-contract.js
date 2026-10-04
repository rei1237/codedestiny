// Shared by new generation, durable completion and read-only operator diagnostics.
// Purchase snapshots and already delivered legacy chapters are never rewritten.
export const CHAPTER_DELIVERY_VERSION = 'chapter-delivery-20261004';
export const CHAPTER_TIMEOUT_MS = 240000;
export const CHAPTER_LEASE_MS = CHAPTER_TIMEOUT_MS + 90000;

export const hasChapterDeliveryContract = row => row?.snapshot?.deliveryContract === CHAPTER_DELIVERY_VERSION ||
  row?.generationCheckpoint?.recoveryPolicy === CHAPTER_DELIVERY_VERSION;

const normalize = text => text.normalize('NFC').replace(/\s+/gu, ' ').trim();
export function deliveredCharacterCount(body) {
  const passages = [...(Array.isArray(body?.blocks) ? body.blocks.flatMap(b => b?.paragraphs || []) : body?.analysis || []), body?.example, body?.advice]
    .filter(text => typeof text === 'string' && text.trim());
  return [...new Set(passages.map(normalize))].reduce((sum, text) => sum + Array.from(text).length, 0);
}

// Return diagnostic tokens only, never the customer's text. Local formatting is
// allowed before this gate; inventing missing sections or salvaging truncation is not.
export function chapterDeliveryFailure(body, chapter, requireEnvelope = true) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'INVALID_CHAPTER';
  if (requireEnvelope && (body.chapterId !== chapter.id || body.complete !== true)) return 'CHAPTER_INCOMPLETE';
  if (deliveredCharacterCount(body) < Math.max(120, Number(chapter.minimumChars) || 0)) return 'CHAPTER_TOO_SHORT';
  if (chapter.sections?.length) {
    const blocks = body.blocks;
    if (!Array.isArray(blocks) || blocks.length !== chapter.sections.length || new Set(blocks.map(b => b?.id)).size !== blocks.length ||
      chapter.sections.some((section, i) => blocks[i]?.id !== section.id || typeof blocks[i]?.title !== 'string' || !blocks[i].title.trim() ||
        !Array.isArray(blocks[i]?.paragraphs) || !blocks[i].paragraphs.length || blocks[i].paragraphs.some(p => typeof p !== 'string' || !p.trim()))) return 'INVALID_CHAPTER_BLOCKS';
  }
  const text = JSON.stringify(body);
  if (/(?:이하\s*생략|계속됩니다|다음\s*(?:응답|메시지)에서\s*계속|to be continued|続きは次|以下省略)/iu.test(text)) return 'CHAPTER_INCOMPLETE';
  return '';
}

export const chapterQualityFailure = code => /^(?:INVALID_CHAPTER|CHAPTER_|DUPLICATE_CHAPTER|QUESTION_ANSWER_INCOMPLETE)/u.test(code || '');
