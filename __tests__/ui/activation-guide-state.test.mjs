import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
const bundle = await build({ entryPoints: ['js/core/activation-guide-state.mjs'], bundle: true, write: false, format: 'iife', globalName: 'GuideState' });
function setup() {
  const dom = new JSDOM('', { url: 'https://example.com', runScripts: 'outside-only' });
  dom.window.eval(bundle.outputFiles[0].text);
  return { dom, api: dom.window.GuideState };
}
test('today means Korean midnight and the preference is account scoped and persistent', () => {
  const { dom, api } = setup(), now = Date.parse('2026-11-02T14:59:00Z');
  api.hideActivationGuideToday('a', now);
  assert.equal(api.isActivationGuideHidden('a', now), true);
  assert.equal(api.isActivationGuideHidden('b', now), false);
  assert.equal(api.isActivationGuideHidden('a', Date.parse('2026-11-02T15:00:00Z')), false);
  const stored = dom.window.localStorage.getItem('cd:activation-guide:hidden-until:a');
  dom.window.eval(bundle.outputFiles[0].text);
  assert.equal(dom.window.GuideState.isActivationGuideHidden('a', now), true);
  assert.equal(Number(stored), Date.parse('2026-11-02T15:00:00Z'));dom.window.close();
});
test('a free reading stays hidden after reload, without hiding a different account', () => {
  const { dom, api } = setup();
  const newcomer = accountId => ({ accountId, tutorial: { eligible: true, guideEligible: true } });
  assert.equal(api.shouldShowTutorialGuide(newcomer('a')), true);
  api.rememberFreeSajuViewed('a');dom.window.eval(bundle.outputFiles[0].text);
  assert.equal(dom.window.GuideState.shouldShowTutorialGuide(newcomer('a')), false);
  assert.equal(dom.window.GuideState.shouldShowTutorialGuide(newcomer('b')), true);dom.window.close();
});
