import test from 'node:test';
import assert from 'node:assert/strict';
import { ENGLISH_READING_LOCALES, applyDetailedReadingEdition } from '../../scripts/lib/detailed-reading-locale-policy.mjs';

test('English detailed edition preserves the local app UI and consultation preferences', () => {
  const source = { featureMarketing: { report: { title: 'Detailed reading' } } };
  const local = { featureMarketing: { report: { title: 'Old copy' } }, home: { title: 'Accueil' }, consultation: { language: 'fr' }, price: { amount: 4500 } };
  for (const locale of ENGLISH_READING_LOCALES) {
    const edition = applyDetailedReadingEdition(local, source, locale);
    assert.deepEqual(edition.featureMarketing, source.featureMarketing);
    assert.equal(edition.home, local.home);
    assert.equal(edition.consultation, local.consultation);
    assert.equal(edition.price, local.price);
    assert.notEqual(edition.featureMarketing, source.featureMarketing);
  }
  assert.equal(local.featureMarketing.report.title, 'Old copy');
});

test('Korean and the four authored editions remain independent', () => {
  for (const locale of ['ko', 'en', 'ja', 'zh-CN', 'zh-TW']) {
    const own = { featureMarketing: { title: locale } };
    assert.equal(applyDetailedReadingEdition(own, {}, locale), own);
  }
  assert.throws(() => applyDetailedReadingEdition({}, {}, 'fr'), /English/);
});
