import { resolveBirthUnlockIdentity } from './birth-scoped-unlock-identity.js';
import { createHttpError } from './http.js';
import { isFreeFortuneFeatureKey } from '../../lib/payment/free-fortune-policy.mjs';
const FEATURE_KEY = 'premium-fpti-report';
const pad = n => String(n).padStart(2, '0');
export function fptiCardBirthInput(card) {
 const b = card.birth || {};
 return { birthDate: String(b.year) + '-' + pad(b.month) + '-' + pad(b.day), birthTime: b.timeUnknown ? '' : pad(b.hour ?? 0) + ':' + pad(b.minute ?? 0), birthTimeUnknown: b.timeUnknown === true, calendarType: b.calType || 'solar' };
}
// This path calculates a new public result. It never reads or writes a purchased archive.
export async function readFreeFpti({ userId, profileId, birthInput }, store) {
 if (!userId) throw createHttpError(401, '\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.', { code: 'AUTH_REQUIRED' });
 if (!isFreeFortuneFeatureKey(FEATURE_KEY)) throw createHttpError(403, 'Feature is unavailable.', { code: 'FEATURE_NOT_PUBLIC' });
 const card = await store.findProfile({ userId, profileId });
 await resolveBirthUnlockIdentity({ userId, profileId, featureKey: FEATURE_KEY }, { findProfileCard: async () => card });
 const expected = fptiCardBirthInput(card);
 if (!birthInput || Object.keys(expected).some(key => birthInput[key] !== expected[key])) throw createHttpError(409, '\uD604\uC7AC \uD504\uB85C\uD544\uC758 \uCD9C\uC0DD \uC815\uBCF4\uB85C \uB2E4\uC2DC \uACC4\uC0B0\uD574 \uC8FC\uC138\uC694.', { code: 'PROFILE_INPUT_MISMATCH' });
 const result = await store.analyze({ ...expected, name: card.name || '', gender: card.gender || 'OTHER', birthRegion: card.location?.label || '' });
 const report = await store.buildReport(result);
 return { source: 'public', accessSource: 'public', featureKey: FEATURE_KEY, profileId, saved: false, report };
}
