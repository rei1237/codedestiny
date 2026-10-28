import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
const source = fs.readFileSync(new URL('../../js/core/astro/section-client.js', import.meta.url), 'utf8');
const key = 'astro_stellar_career_room';
const markup = '<div class="cd-section-gate cd-section-gate--unlocked"><div class="cd-section-gate__body"></div></div>';
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
test('replacing an unlocked gate during fetch never leaves the replacement empty', async () => {
  const dom = new JSDOM('<body>' + markup, { url: 'https://example.test/', runScripts: 'outside-only' });
  try {
    const win = dom.window, pending = [];
    win._astroBirth = { year: 1990, month: 1, day: 1 };
    win.cdBirthScopeCurrentProfileId = () => 'profile';
    win._cdAIPromptRequestJson = () => new Promise(resolve => pending.push(resolve));
    win.eval(source);
    win.AstroSection.fill(win.document.body.firstElementChild, key);
    win.document.body.innerHTML = markup;
    const replacement = win.document.body.firstElementChild;
    win.AstroSection.fill(replacement, key);
    assert.match(replacement.textContent, /확인/);
    pending[0]({ ok: true, payload: { ok: true, unlocked: true, featureKey: key, html: '<p>old result</p>' } });
    pending[1]({ ok: true, payload: { ok: true, unlocked: true, featureKey: key, html: '<p>current result</p>' } });
    await tick(); assert.match(replacement.textContent, /current result/);
  } finally { dom.window.close(); }
});
test('a replacement during the failed-request cooldown still shows a retry action', async () => {
  const dom = new JSDOM('<body>' + markup, { url: 'https://example.test/', runScripts: 'outside-only' });
  try {
    const win = dom.window;
    win._cdAIPromptRequestJson = async () => ({ ok: false, status: 503, payload: {} });
    win.eval(source); win.AstroSection.fill(win.document.body.firstElementChild, key); await tick();
    win.document.body.innerHTML = markup;
    win.AstroSection.fill(win.document.body.firstElementChild, key); await tick();
    assert.equal(win.document.querySelector('button')?.textContent, '다시 불러오기');
  } finally { dom.window.close(); }
});
