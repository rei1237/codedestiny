import test from 'node:test';
import assert from 'node:assert/strict';
import { hasCompleteSnuGift, resolveSnuReadingProfile, mountSnuReadingContents, SNU_READING_URL } from '../../js/core/snu-reading-flow.mjs';
import { JSDOM } from 'jsdom';
import { SNU_SAJU_FEATURES } from '../../js/core/snu-campus-policy.mjs';

const keys = SNU_SAJU_FEATURES.map(item => item.featureKey);
const state = { verified: true, profileId: 'gift', unlockedFeatureKeys: keys };
test('exact gift coverage, not array length, determines completion', () => {
  assert.equal(hasCompleteSnuGift(state), true);
  assert.equal(hasCompleteSnuGift({ ...state, unlockedFeatureKeys: Array(10).fill(keys[0]) }), false);
  assert.equal(hasCompleteSnuGift({ ...state, unlockedFeatureKeys: [...keys.slice(1), 'saju-ai'] }), false);
  assert.equal(hasCompleteSnuGift({ ...state, verified: false }), false);
  assert.equal(hasCompleteSnuGift({ ...state, profileId: '' }), false);
});
test('gift navigation contains only active allowlisted shortcuts and clears on account/profile changes', () => {
  const dom = new JSDOM('<article id="resultPage"><section id="sajuReadingHeader"></section></article>');
  const document = dom.window.document, profile = { id: 'gift', name: '<img src=x onerror=alert(1)>' };
  const partial = { ...state, unlockedFeatureKeys: ['section_summary', 'rpt_quantumCard', 'animal-destiny-unlock', 'future-ai'] };
  mountSnuReadingContents(document, partial, profile);
  assert.deepEqual([...document.querySelectorAll('nav a')].map(link => link.getAttribute('href')), ['#summaryCard', '#quantumCard', '/saju/animal-destiny/']);
  assert.equal(document.querySelectorAll('img').length, 0);
  const contents = document.getElementById('snuReadingContents'); contents.open = false;
  mountSnuReadingContents(document, partial, profile);
  assert.equal(document.getElementById('snuReadingContents'), contents);
  assert.equal(contents.open, false);
  mountSnuReadingContents(document, partial, { id: 'another-account-profile' });
  assert.equal(document.getElementById('snuReadingContents'), null);
  mountSnuReadingContents(document, { ...partial, verified: false }, profile);
  assert.equal(document.getElementById('snuReadingContents'), null);
  dom.window.close();
});
test('gift entry selects its server profile instead of the active or first profile', () => {
  const profiles = [{ id: 'other' }, { id: 'gift' }];
  assert.equal(resolveSnuReadingProfile(state, profiles), profiles[1]);
  assert.equal(resolveSnuReadingProfile(state, profiles.slice(0, 1)), null);
  assert.equal(resolveSnuReadingProfile({ ...state, verified: false }, profiles), null);
  assert.equal(resolveSnuReadingProfile(state, []), null);
  const url = new URL(SNU_READING_URL, 'https://example.test');
  assert.equal(url.searchParams.get('entry'), 'snulife');
  assert.equal(url.searchParams.has('profileId'), false);
});
