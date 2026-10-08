import test from 'node:test';
import assert from 'node:assert/strict';
import { affiliateBrand, affiliateBrowsePath, affiliateCopy, affiliatePresentation } from '../../js/affiliate-presentation.mjs';
import { RECOMMENDATIONS_RELEASED } from '../../js/recommendations-core.mjs';
import { RECOMMENDATION_COPY_LOCALES } from '../../js/recommendations-copy.mjs';
test('brand navigation preserves the two independent worlds without private input', () => {
  assert.equal(affiliateBrowsePath('yeongnyangi'), '/recommendations/?brand=yeongnyangi');
  for (const value of ['yeoni', 'ggulggul', 'neo']) assert.equal(affiliateBrowsePath(value), '/recommendations/?brand=ggulggul');
  assert.equal(affiliateBrand('https://attacker.example'), 'yeongnyangi');
  assert.equal(affiliateBrowsePath('private-report-id'), '/recommendations/?brand=yeongnyangi');
});
test('new or unknown merchants cannot borrow Coupang outbound permissions', () => {
  for (const value of ['book-partner-preview','lifestyle-partner-preview','unknown','__proto__','constructor','https://evil.example']) assert.equal(affiliatePresentation(value).previewOnly, true);
  assert.equal(affiliatePresentation().label, 'Coupang');
  assert.equal(affiliatePresentation('aliexpress').label, 'AliExpress');
  assert.equal(RECOMMENDATIONS_RELEASED, true);
});
test('brand, merchant and disclosure copy is complete for all existing locales', () => {
  const keys = Object.keys(affiliateCopy('ko'));
  for (const locale of RECOMMENDATION_COPY_LOCALES) {
    const copy = affiliateCopy(locale);
    assert.deepEqual(Object.keys(copy), keys);
    for (const text of Object.values(copy)) assert.ok(typeof text === 'string' && text.length > 0);
  }
});
