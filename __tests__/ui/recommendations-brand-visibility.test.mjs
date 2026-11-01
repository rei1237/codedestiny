import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

test('section navigation stays hidden before optional scripts load and only appears when activated', () => {
  const shell = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const rules = shell.match(/\.fsn-navbar\{[^}]*\}/g).find(rule => rule.includes('position:fixed'));
  const active = shell.match(/\.fsn-navbar\.fsn-visible\{[^}]*\}/)?.[0] || '';
  const dom = new JSDOM(`<style>${rules}${active}</style><div class="fsn-navbar" id="fsnNavBar">운명의 지도</div>`);
  try {
    const nav = dom.window.document.getElementById('fsnNavBar');
    assert.equal(dom.window.getComputedStyle(nav).visibility, 'hidden');
    nav.classList.add('fsn-visible');
    assert.equal(dom.window.getComputedStyle(nav).visibility, 'visible');
    nav.classList.remove('fsn-visible');
    assert.equal(dom.window.getComputedStyle(nav).visibility, 'hidden');
  } finally { dom.window.close(); }
});
