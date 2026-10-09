// Shared by new generation, durable completion and read-only operator diagnostics.
// Purchase snapshots and already delivered legacy chapters are never rewritten.
export const CHAPTER_DELIVERY_VERSION = 'chapter-delivery-20261004';
export const CHAPTER_TIMEOUT_MS = 240000;
export const CHAPTER_LEASE_MS = CHAPTER_TIMEOUT_MS + 90000;
// Per-tier provider timeout for orders whose snapshot carries this marker. Orders created before it keep
// CHAPTER_TIMEOUT_MS; the delivery version stays put because paid chapters are compared against it.
export const CHAPTER_TIMEOUT_POLICY = 'chapter-timeout-20261010';
export const CHAPTER_TIER_TIMEOUT_MS = Object.freeze({mackerel:120000,salmon:150000,flounder:180000,tuna:240000,assorted:240000,omakase:240000});
export const chapterTimeoutMs = row => row?.snapshot?.chapterTimeoutPolicy === CHAPTER_TIMEOUT_POLICY
  ? CHAPTER_TIER_TIMEOUT_MS[row.snapshot.product?.fishId] || CHAPTER_TIMEOUT_MS : CHAPTER_TIMEOUT_MS;
// The lease reserves another 90 seconds for analysis, validation and persisted reread. CHAPTER_LEASE_MS stays the maximum.
export const chapterLeaseMs = row => chapterTimeoutMs(row) + 90000;

export const hasChapterDeliveryContract = row => row?.snapshot?.deliveryContract === CHAPTER_DELIVERY_VERSION ||
  row?.generationCheckpoint?.recoveryPolicy === CHAPTER_DELIVERY_VERSION;

// A truncation and empty-response guard, not the quality length bar: validateChapter keeps the single length
// repair (reading-quality.ts chapterFloor), and a paid chapter is never withheld for length alone (principle 17).
export const CHAPTER_DELIVERY_FLOOR_RATIO = 0.5;
export const chapterDeliveryFloor = chapter => Math.max(120, Math.ceil((Number(chapter?.minimumChars) || 0) * CHAPTER_DELIVERY_FLOOR_RATIO));
// The server marks a chapter delivered short on its last attempt (or kept over a worse repair); such a chapter
// keeps only the empty-response guard. Model output never carries this flag (delivery.ts strips it).
const lengthFloor = (body, chapter) => body.shortDelivery === true ? 120 : chapterDeliveryFloor(chapter);

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
  if (deliveredCharacterCount(body) < lengthFloor(body, chapter)) return 'CHAPTER_TOO_SHORT';
  if (chapter.sections?.length) {
    const blocks = body.blocks;
    if (!Array.isArray(blocks) || blocks.length !== chapter.sections.length || new Set(blocks.map(b => b?.id)).size !== blocks.length ||
      chapter.sections.some((section, i) => blocks[i]?.id !== section.id || typeof blocks[i]?.title !== 'string' || !blocks[i].title.trim() ||
        !Array.isArray(blocks[i]?.paragraphs) || !blocks[i].paragraphs.length || blocks[i].paragraphs.some(p => typeof p !== 'string' || !p.trim()))) return 'INVALID_CHAPTER_BLOCKS';
  }
  const text = JSON.stringify(body);
  // A normal sentence such as "이 흐름이 계속됩니다" is not a cutoff marker.
  // Only a standalone continuation field/paragraph is ambiguous enough to reject.
  if (/(?:이하\s*생략|다음\s*(?:응답|메시지)에서\s*계속|to be continued|続きは次|以下省略)/iu.test(text) ||
    /"\s*(?:계속됩니다|계속)[.…]*\s*"/u.test(text)) return 'CHAPTER_INCOMPLETE';
  return '';
}

// A body that fails only the length floor: every shape, cutoff and empty-response guard still passes.
export const shortOnlyChapter = (body, chapter, requireEnvelope = true) => chapterDeliveryFailure(body, chapter, requireEnvelope) === 'CHAPTER_TOO_SHORT' &&
  !chapterDeliveryFailure({...body, shortDelivery: true}, chapter, requireEnvelope);

export const chapterQualityFailure = code => /^(?:INVALID_CHAPTER|CHAPTER_|DUPLICATE_CHAPTER|QUESTION_ANSWER_INCOMPLETE)/u.test(code || '');
