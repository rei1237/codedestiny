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

test('home widget entry is a plain Android-app link without startup work', () => {
  const page = read('../../app/page.js');
  const entry = page.match(/\{IS_APP_BUILD && <a [^\n]*data-cd-home-widget-entry[^\n]*<\/a>\}/);
  assert.ok(entry, 'entry renders only in the app build');
  assert.match(entry[0], /href="\/app\/home-widget\/index\.html"/);
  assert.ok(page.indexOf('data-cd-home-widget-entry') > page.indexOf('</HomeCardDeck>'), 'entry sits below the fortune cards');
  const css = read('../../app/home-main.module.css');
  assert.match(css, /\.widgetEntry \{ display: none; \}/);
  assert.match(css, /:global\(html\[data-native-platform="android"\]\) \.widgetEntry \{/);
  assert.match(read('../../scripts/app-native-bridge.js'), /dataset\.nativePlatform = "android"/);
  const copy = JSON.parse(read('../../lib/i18n/native-home-copy.json'));
  assert.deepEqual(Object.keys(copy['홈 화면에 부적·확언 놓기']).sort(), Object.keys(copy['마음이 향하는 상담 공간을 골라보세요.']).sort());
});
