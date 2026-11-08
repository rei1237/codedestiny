import { authFetch } from '@/app/_lib/auth-client';
import { isStoredChemiReport } from '@/lib/records/stored-bias-shape.js';
import { paidDetailsIdentity } from '@/lib/idol-chemi/paid-details-key.mjs';
import type { ChemiReport } from '../engine/chemiReportBridge';

export class PaidDetailsError extends Error {
  constructor(public code: string, message: string) { super(message); }
}
export async function requestPaidDetails(input: Record<string, unknown>, save = false): Promise<ChemiReport | null> {
  const identity = await paidDetailsIdentity({ birthDate: String(input.birthDate || ''), calendarType: String(input.calendarType || ''), partner: input.partner as { kind: string; id: string } });
  const { birthDate: _birthDate, calendarType: _calendarType, ...body } = input;
  if (!save) delete body.report;
  const response = await authFetch(`/api/destiny-bias/details${save ? '' : '/lookup'}`, {
    method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, inputHash: identity.hash }),
  }, { retryOn401: false, forceFresh: true });
  const payload = await response.json();
  if (!response.ok || !payload.ok) throw new PaidDetailsError(payload.error?.code || 'LOOKUP_FAILED', payload.error?.message || '구매 정보를 확인하지 못했어요. 잠시 후 다시 확인해 주세요.');
  if (payload.found === false) return null;
  if (!isStoredChemiReport(payload.report)) throw new PaidDetailsError('RESULT_UNAVAILABLE', '저장된 리포트를 확인하지 못했어요. 다시 시도해 주세요.');
  return payload.report as ChemiReport;
}
