import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nextWidgetStatus } from '../../app/app/home-widget/widget-state.mjs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('home widget becomes complete only on the success callback of the dialog it opened', () => {
  const requested = nextWidgetStatus('idle', { type: 'pin', status: 'requested' });
  assert.equal(requested, 'requested');
  // 취소하면 콜백이 없다: 돌아와 받은 토큰이 비었거나 예전 것이면 그대로 미완료다.
  assert.equal(nextWidgetStatus(requested, { type: 'added', token: '', pendingToken: 'b' }), 'requested');
  assert.equal(nextWidgetStatus(requested, { type: 'added', token: 'a', pendingToken: 'b' }), 'requested');
  assert.equal(nextWidgetStatus(requested, { type: 'added', token: 'b', pendingToken: 'b' }), 'added');
  assert.equal(nextWidgetStatus('idle', { type: 'added', token: 'b', pendingToken: 'b' }), 'idle');
  assert.equal(nextWidgetStatus('idle', { type: 'pin', status: 'unsupported' }), 'manual');
  assert.equal(nextWidgetStatus('added', { type: 'select' }), 'idle');
  assert.equal(nextWidgetStatus('idle', { type: 'update', status: 'updated' }), 'updated');
  assert.equal(nextWidgetStatus('idle', { type: 'update', status: 'missing' }), 'missing');
  assert.equal(nextWidgetStatus('web', { type: 'pin', status: 'requested' }), 'web');
});

test('the public entrance owns one widget link and native builds use the local studio route', () => {
  const page = read('../../app/page.js');
  assert.match(page, /href=\{IS_APP_BUILD \? "\/app\/home-widget\/index\.html" : "\/app\/home-widget\/"\}/);
  assert.ok(page.indexOf('data-cd-home-widget-entry') > page.indexOf('</CardSurface>'));
  const widgetEntry = page.slice(page.indexOf('<a className={styles.widgetEntry}'));
  assert.match(widgetEntry, /^<a[^>]+data-cd-home-widget-entry/);
  assert.ok(page.indexOf('data-cd-home-widget-entry') > page.indexOf('<HomeDailyEntry />'));
  assert.equal((page.match(/data-cd-home-widget-entry/g) || []).length, 1);
  assert.doesNotMatch(read('../../public/ggulggul/index.html'), /href="\/app\/home-widget\//);
  assert.doesNotMatch(read('../../app/yeongnyangi/_home/FortuneHome.tsx'), /\/app\/home-widget\//);
  assert.match(read('../../app/app/home-widget/page.tsx'), /<HomeWidgetStudio\b/);
});

test('widget studio keeps one header and the add button docked on screen', () => {
  // /app 은 CHROMELESS 라 자체 머리말 목록에도 없으면 공용 뒤로·홈 나브가 한 겹 더 뜬다.
  const chrome = read('../../app/components/AppChrome.tsx');
  const selfManaged = chrome.slice(chrome.indexOf('const FEATURE_NAV_SELF_MANAGED_ROUTES'), chrome.indexOf('const LOCALE_CODES'));
  assert.match(selfManaged, /"\/app\/home-widget"/);
  assert.match(selfManaged, /"\/app\/talismans"/);
  const studio = read('../../app/app/home-widget/HomeWidgetStudio.tsx');
  assert.match(studio, /<div className="cd-home-widget-dock">\s*<div className="cd-talisman-actions"/);
  assert.match(read('../../app/app/home-widget/home-widget.css'), /\.cd-home-widget-dock \{ position: sticky; bottom: 0;/);
});
