import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

const shell = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const source = shell.slice(
  shell.indexOf('  function applySectionGateOverlayState('),
  shell.indexOf('  // 출생 기반 해금의 잠금 안내:'),
);
const applyState = new Function('SAJU_ACCESS_CHECKING_MESSAGE', `${source};return applySectionGateOverlayState;`)('이용권 확인 중');

test('checking and recovery preserve the reading title and do not leave the button disabled', () => {
  const dom = new JSDOM('<section><p class="cd-section-gate__title">대운 분석 — 프리미엄 콘텐츠</p><p class="cd-section-gate__desc">대운 안내</p><button class="cd-section-gate__btn">풀이 확인하기</button></section>');
  const gate = dom.window.document.querySelector('section');
  const button = gate.querySelector('button');
  applyState(gate, {}, 'checking');
  assert.equal(gate.getAttribute('aria-busy'), 'true');
  assert.equal(button.disabled, true);
  applyState(gate, {}, 'error');
  assert.equal(gate.getAttribute('aria-busy'), 'false');
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, '기존 해금 내역 확인');
  applyState(gate, {}, 'locked');
  assert.equal(gate.querySelector('.cd-section-gate__title').textContent, '대운 분석 — 프리미엄 콘텐츠');
  assert.equal(button.textContent, '풀이 확인하기');
  assert.equal(button.disabled, false);
  assert.equal(gate.classList.contains('cd-section-gate--unlocked'), false);
  dom.window.close();
});
