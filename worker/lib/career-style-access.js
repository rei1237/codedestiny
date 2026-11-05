import { createHash } from 'node:crypto';
import { resolveBirthUnlockIdentity } from './birth-scoped-unlock-identity.js';
import { createHttpError } from './http.js';
import { getBillingFeaturePricing } from './billing-feature-registry.js';
import { buildCareerReport, careerNatalInput } from '../../lib/saju/career-style/report.mjs';

export const CAREER_FEATURE_KEY = 'saju-career-style';

// Only the authenticated account's saved card supplies calculation and unlock identity.
export function careerCardInput(card) {
  const birth = card.birth || {}, location = card.location || {};
  const pad = value => String(value).padStart(2, '0');
  return careerNatalInput({
    birthDate: `${birth.year}-${pad(birth.month)}-${pad(birth.day)}`,
    birthTime: birth.timeUnknown ? '' : `${pad(birth.hour ?? 0)}:${pad(birth.minute ?? 0)}`,
    birthTimeUnknown: birth.timeUnknown === true,
    calendarType: birth.calType || 'solar',
    isLeapMonth: birth.calType === 'lunar_leap',
    timezone: location.tz, longitude: location.lng, latitude: location.lat, region: location.label,
  });
}

// Storage injection exercises the actual gate, immutable result and retry behavior offline.
export async function readCareerStyle({ userId, profileId, statusOnly = false }, store) {
  const featureKey = CAREER_FEATURE_KEY;
  const card = await store.findProfile({ userId, profileId });
  const birthIdentity = await resolveBirthUnlockIdentity({ userId, profileId, featureKey }, { findProfileCard: async () => card });
  const entitlement = await store.findUnlock({ userId, profileId, featureKey, birthIdentity });
  // 꿀방울 판매는 닫혔다. 현금가는 레지스트리 가격행이 그대로 권위다(과거 구매 증빙 비교용).
  const { pricing } = getBillingFeaturePricing({ featureKey });
  const status = { featureKey, profileId, unlocked: Boolean(entitlement), priceKRW: pricing.amountKRW };
  if (statusOnly) return status;
  if (!entitlement) throw createHttpError(402, '리포트를 해금한 뒤 확인해 주세요.', { code: 'PAYMENT_REQUIRED', ...status });
  const executionKey = `career-style:${createHash('sha256').update(`${userId}:${birthIdentity.birthKey}`).digest('hex')}`;
  const saved = await store.findResult({ userId, executionKey });
  if (saved?.metadata?.careerReport) return { ...status, report: saved.metadata.careerReport, saved: true };
  let report;
  try { report = (store.buildReport || buildCareerReport)(careerCardInput(card)); }
  catch { throw createHttpError(400, '출생정보를 계산하지 못했어요. 프로필 카드의 날짜·달력 종류와 출생지를 확인해 주세요.', { code: 'INVALID_BIRTH_INPUT' }); }
  // The existing unique (userId, executionKey) and insert-only archive preserve the first original.
  const stored = await store.saveResult({ userId, profileId, executionKey, featureKey, report, entitlement, card });
  if (!stored?.metadata?.careerReport) throw createHttpError(503, '결과를 저장하지 못했어요. 다시 시도해 주세요. 추가 해금은 필요하지 않아요.', { code: 'RESULT_STORAGE_UNAVAILABLE', retryable: true });
  return { ...status, report: stored.metadata.careerReport, saved: true };
}
