import { storedChapterDraft } from './stored-chapter.js';

export const DELIVERY_REFUND_PATH = 'generationCheckpoint.deliveryRefund';
export const deliveryRefundPending = row => row?.generationCheckpoint?.deliveryRefund?.status === 'pending';
// The marker is written only after an owned, lease-free final-failure reservation.
// Legacy zero-result restores remain valid; partial results require that reservation.
export const terminalRestoreFilter = terminal => terminal
  ? { [`${DELIVERY_REFUND_PATH}.status`]: 'pending', errorCode: 'DELIVERY_REFUND_PENDING' }
  : { errorCode: 'GENERATION_REVIEW_REQUIRED', completedChapters: 0,
    'chapters.0': { $exists: false }, 'generationCheckpoint.chapterDrafts.0': { $exists: false } };

export function canReserveDeliveryRefund(row, { retryable = false, now = Date.now() } = {}) {
  if (!row || row.state !== 'FORTUNE_FAILED' || deliveryRefundPending(row) || retryable ||
      !['GENERATION_REVIEW_REQUIRED', 'ASK_LIMITED_REVIEW_REQUIRED'].includes(row.errorCode) ||
      new Date(row.leaseUntil || 0).getTime() > now || storedChapterDraft(row)) return false;
  const total = row.snapshot?.manifest?.length || 0, saved = row.chapters?.length || 0;
  // A full-size array can still fail the durable delivery/quality verification.
  return Array.isArray(row.snapshot?.manifest) && total >= saved && Boolean(row.paymentId || row.accessMethod);
}
