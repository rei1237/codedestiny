/** @jest-environment node */
import { jest } from '@jest/globals';
import { FREE_FORTUNE_FEATURE_KEYS, isFreeFortuneFeatureKey, normalizeFreeFortuneFeatureKey } from '../../lib/payment/free-fortune-policy.mjs';
const auth = jest.fn(async () => null);
const readProfile = jest.fn(() => { throw new Error('Public route read a private profile'); });
const prove = jest.fn(() => { throw new Error('Public route consumed payment'); });
const claim = jest.fn(() => { throw new Error('Public route claimed payment'); });
const build = jest.fn(input => input.featureKey === 'saju_natal_reading' ? { parts: { iljuCard: '<p>원국</p>' } } : { html: '<p>계산 풀이</p>' });
jest.unstable_mockModule('../../worker/lib/auth.js', () => ({ getOptionalUserFromRequest: auth, isAuthDbInfraError: () => false }));
jest.unstable_mockModule('../../worker/lib/paid-content-read-access.js', () => ({ readProfileBirthUnlock: readProfile, readAccountLegacyUnlock: readProfile, hasLegacyBundlePurchase: readProfile }));
jest.unstable_mockModule('../../worker/lib/billing-feature-registry.js', () => ({ getBillingFeaturePricing: () => ({ pricing: { amountKRW: 5000 } }) }));
jest.unstable_mockModule('../../worker/lib/paid-feature-registry.js', () => ({ FEATURE_KEY_PRICE_TABLE: {} }));
jest.unstable_mockModule('../../worker/lib/nakshatra-paid-access.js', () => ({ verifyPerUsePayment: prove, logPerUsePaymentProof: jest.fn() }));
jest.unstable_mockModule('../../worker/lib/billing-evidence-claim.js', () => ({ claimRequestBillingEvidence: claim, evidenceClaimErrorBody: jest.fn() }));
jest.unstable_mockModule('../../worker/lib/honey-per-use.js', () => ({ honeyUseInputHash: jest.fn() }));
jest.unstable_mockModule('../../worker/lib/saju-authority-consumer.js', () => ({ sajuAuthorityOn: () => false }));
jest.unstable_mockModule('../../worker/lib/sukuyo-astronomy.js', () => ({ calculateSukuyoForMoment: jest.fn(async () => ({ index: 1 })) }));
jest.unstable_mockModule('../../worker/lib/saju-section/report.js', () => ({
 SAJU_SECTION_FEATURE_KEYS: ['section_summary','section_daewun','saju_lifetime_bundle','saju_natal_reading','rpt_quantumCard','compat-sukuyo-compatibility','compat-ziwei-compatibility'],
 SUKUYO_COMPAT_FEATURE_KEYS: ['compat-sukuyo-compatibility'], ZIWEI_COMPAT_FEATURE_KEYS: ['compat-ziwei-compatibility'],
 SajuSectionInputError: class extends Error {}, buildSajuSectionHtml: build, sukuyoNatureMoment: () => ({}),
}));
jest.unstable_mockModule('../../worker/lib/astro-basic-deep-report.js', () => ({ validateBasicDeepInput: value => value, toNatalReadingChart: () => ({ moon: { idx: 1 } }), buildBasicDeepReport: () => ({ html: '<p>별자리</p>' }) }));
jest.unstable_mockModule('../../worker/routes/astro.js', () => ({ normalizeBasicAstrologyInput: value => ({ ok: true, value }), calculateBasicAstrologyChart: jest.fn(async () => ({})) }));
jest.unstable_mockModule('../../worker/lib/astro-section/report.js', () => ({ ASTRO_SECTION_FEATURE_KEYS: ['astro_relationship_deep'], buildAstroSectionHtml: () => ({ html: '<p>관계</p>' }) }));
jest.unstable_mockModule('../../worker/lib/astro-section/yearly.js', () => ({ ASTRO_YEARLY_TRANSIT_KEY: 'astro_yearly_transit', buildAstroYearlyHtml: jest.fn(async () => ({ html: '<p>연간</p>' })) }));
jest.unstable_mockModule('../../worker/lib/astro-section/synastry.js', () => ({
 ASTRO_CELEB_SYNASTRY_FEATURE_KEY: 'compat-astro-synastry', ASTRO_DIRECT_SYNASTRY_FEATURE_KEY: 'compat-astro-direct-synastry',
 buildAstroCelebSynastry: () => ({ html: '<p>궁합</p>' }), buildAstroDirectSynastry: () => ({ html: '<p>궁합</p>' }), findAstroSynastryCeleb: () => null,
}));
let handleSajuSection, handleAstroSection, handleAstroBasicDeep, handleAstroSynastry;
beforeAll(async () => {
 ({ handleSajuSection } = await import('../../worker/routes/saju-section.js'));
 ({ handleAstroSection } = await import('../../worker/routes/astro-section.js'));
 ({ handleAstroBasicDeep } = await import('../../worker/routes/astro-basic-deep.js'));
 ({ handleAstroSynastry } = await import('../../worker/routes/astro-synastry.js'));
});
const request = body => new Request('https://example.test/api/reading', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
beforeEach(() => jest.clearAllMocks());
test.each(['section_summary','section_daewun','saju_lifetime_bundle','allPaidSaju','premiumDivinationPack','ziwei-ai-consultation','saju_ai_question_prompt','saju-guardian-unlock','unknown-new-product'])('policy fails closed for %s', key => expect(isFreeFortuneFeatureKey(key)).toBe(false));
test('allowlist unique and canonical aliases cannot open the bundle', () => {
 expect(new Set(FREE_FORTUNE_FEATURE_KEYS).size).toBe(FREE_FORTUNE_FEATURE_KEYS.length);
 expect(normalizeFreeFortuneFeatureKey(' unlock.RPT_quantumCard ')).toBe('rpt_quantumCard');
 expect(isFreeFortuneFeatureKey('unlock.section_summary')).toBe(false);
 expect(isFreeFortuneFeatureKey('section_summary:anything')).toBe(false);
});
test.each(['saju_natal_reading','rpt_quantumCard','compat-sukuyo-compatibility','compat-ziwei-compatibility'])('public %s never authenticates, reads profiles, spends or claims', async featureKey => {
 const response = await handleSajuSection(request({ featureKey, profileId: 'someone-elses-profile', birth: { date: '1990-05-15', hour: 14, minute: 30 }, partner: {} }));
 expect(response.status).toBe(200); expect((await response.json()).unlocked).toBe(true);
 expect(auth).not.toHaveBeenCalled(); expect(readProfile).not.toHaveBeenCalled(); expect(prove).not.toHaveBeenCalled(); expect(claim).not.toHaveBeenCalled();
});
test.each(['section_summary','section_daewun','saju_lifetime_bundle'])('protected %s remains login gated', async featureKey => {
 const response = await handleSajuSection(request({ featureKey })); expect(response.status).toBe(401); expect(build).not.toHaveBeenCalled();
});
test.each(['astro_relationship_deep','astro_yearly_transit'])('public astro %s avoids all entitlement and payment calls', async featureKey => {
 const response = await handleAstroSection(request({ featureKey, profileId: 'other' })); expect(response.status).toBe(200);
 expect(auth).not.toHaveBeenCalled(); expect(readProfile).not.toHaveBeenCalled(); expect(prove).not.toHaveBeenCalled();
});
test('public basic astro uses no account', async () => {
 expect((await handleAstroBasicDeep(request({ timeKnown: true, profileId: 'other' }))).status).toBe(200);
 expect(auth).not.toHaveBeenCalled(); expect(readProfile).not.toHaveBeenCalled();
});
test('public direct synastry does not consume a request or payment proof', async () => {
 const response = await handleAstroSynastry(request({ featureKey:'compat-astro-direct-synastry', date:'1990-05-15',time:'12:00',timezone:9,latitude:37,longitude:127, profileId:'other', partner:{date:'1991-06-15',time:'12:00',tzOffsetHours:9,latitude:37,longitude:127} }));
 expect(response.status).toBe(200); expect(auth).not.toHaveBeenCalled(); expect(readProfile).not.toHaveBeenCalled(); expect(prove).not.toHaveBeenCalled(); expect(claim).not.toHaveBeenCalled();
});
test('unsupported astro key never gets public calculation', async () => {
 expect((await handleAstroSection(request({ featureKey:'astrology-ai-consultation' }))).status).toBe(401);
 expect(auth).toHaveBeenCalled();
});
