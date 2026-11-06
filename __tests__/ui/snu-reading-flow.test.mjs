import test from 'node:test';
import assert from 'node:assert/strict';
import { hasCompleteSnuGift, resolveSnuReadingProfile, mountSnuReadingContents, SNU_READING_URL } from '../../js/core/snu-reading-flow.mjs';
import { JSDOM } from 'jsdom';
import { SNU_SAJU_FEATURES } from '../../js/core/snu-campus-policy.mjs';
import fs from 'node:fs';

const keys = SNU_SAJU_FEATURES.map(item => item.featureKey);
const state = { verified: true, profileId: 'gift', unlockedFeatureKeys: keys };
test('exact gift coverage, not array length, determines completion', () => {
  assert.equal(hasCompleteSnuGift(state), true);
  assert.equal(hasCompleteSnuGift({ ...state, unlockedFeatureKeys: Array(keys.length).fill(keys[0]) }), false);
  assert.equal(hasCompleteSnuGift({ ...state, unlockedFeatureKeys: [...keys.slice(1), 'saju-ai'] }), false);
  assert.equal(hasCompleteSnuGift({ ...state, verified: false }), false);
  assert.equal(hasCompleteSnuGift({ ...state, profileId: '' }), false);
});
test('gift navigation contains only active allowlisted shortcuts and clears on account/profile changes', () => {
  const dom = new JSDOM('<article id="resultPage"><section id="sajuReadingHeader"></section></article>');
  const document = dom.window.document, profile = { id: 'gift', name: '<img src=x onerror=alert(1)>' };
  const partial = { ...state, unlockedFeatureKeys: ['section_summary', 'rpt_quantumCard', 'rpt_secretHouseEntryCard', 'animal-destiny-unlock', 'saju-career-style', 'future-ai'] };
  mountSnuReadingContents(document, partial, profile);
  assert.deepEqual([...document.querySelectorAll('nav a')].map(link => link.getAttribute('href')), ['#summaryCard', '#quantumCard', '/secret-house_real.html', '/saju/animal-destiny/', '/saju/career-style/']);
  assert.equal(document.querySelectorAll('img').length, 0);
  let secretOpened = 0, genericOpened = 0;
  dom.window.openSecretHouseRoute = () => { secretOpened += 1; };
  dom.window.openSajuFunFeature = () => { genericOpened += 1; };
  const secretLink = [...document.querySelectorAll('nav a')].find(link => link.getAttribute('href') === '/secret-house_real.html');
  secretLink.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert.equal(secretOpened, 1);
  assert.equal(genericOpened, 0);
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
test('gift navigation uses the canonical service-card names', () => {
  const expected = new Map([
    ['section_summary', '라이트 사주 풀이'],
    ['section_daewun', '대운 분석 · 지금부터 다음 시기까지'],
    ['rpt_quantumCard', '퀀텀 명리 엔진'],
    ['rpt_energyCoordCard', '사주로 보는 여행지'],
    ['rpt_villainCard', '빌런 블랙리스트'],
    ['rpt_healthReportCard', '명리 헬스 리포트'],
    ['rpt_specialCharmCard', '나의 매력 클래스'],
    ['rpt_skillTreeCard', '인생 스킬 트리'],
    ['rpt_secretHouseEntryCard', '시크릿 하우스 : 연애 시뮬'],
    ['animal-destiny-unlock', '사주 동물 테스트'],
    ['saju-career-style', '사주로 찾는 나의 일 스타일'],
  ]);
  assert.deepEqual(new Map(SNU_SAJU_FEATURES.map(item => [item.featureKey, item.title])), expected);
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
test('Secret House route preserves the SNULIFE entry context for the worker exception', () => {
  const source = fs.readFileSync('js/core/saju/reportDashboard.js', 'utf8');
  assert.match(source, /searchParams\.get\('entry'\) === 'snulife'/);
  assert.match(source, /\+ 'entry=snulife'/);
});
