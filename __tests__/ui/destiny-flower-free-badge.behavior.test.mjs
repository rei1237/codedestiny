import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { JSDOM } from 'jsdom';
const source = readFileSync(new URL('../../js/core/index-inline-runtime.js', import.meta.url), 'utf8');
const start = source.indexOf('function _dfRenderAtelierLock('), end = source.indexOf('function _dfOpenAtelierUnlock(', start);
assert.ok(start > 0 && end > start);

test('flower badge follows current locale and verified ownership without retaining a stale price label', () => {
  const dom = new JSDOM('<span data-cd-price-key="flower-fc" data-price-krw="5000">결과 무료 · 상세 5,000원</span><div id="destinyFlowerStudioSheet"></div><section id="dfAtelierLock"><p data-df-lock-desc></p><button data-df-atelier-unlock></button></section>');
  let open = false;
  const env = { document: dom.window.document, window: { cdTranslate: (_key, vars) => `Free result · Details ${vars.price}` },
    _dfIsAtelierDetailOpen: () => open, _dfEnsureAtelierLockCard: () => dom.window.document.querySelector('#dfAtelierLock'),
    _dfServerMatch: {}, _dfServerMatchLang: () => 'en', _dfUiText: (key, fallback, vars = {}) => key === 'atelierLock.owned' ? 'Details unlocked' : fallback.replace('{price}', vars.price),
  };
  try {
    runInNewContext(source.slice(start, end), env);
    const badge = env.document.querySelector('[data-cd-price-key]');
    env._dfRenderAtelierLock({ flower: {} });
    assert.equal(badge.textContent, 'Free result · Details 5,000 KRW');
    open = true; env._dfRenderAtelierLock({ flower: {} });
    assert.equal(badge.textContent, 'Details unlocked');
    assert.equal(badge.getAttribute('data-cd-detail-owned'), 'true');
    open = false; env._dfRenderAtelierLock({ flower: {} });
    assert.equal(badge.textContent, 'Free result · Details 5,000 KRW');
  } finally { dom.window.close(); }
});
