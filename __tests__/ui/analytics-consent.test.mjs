import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

const source = readFileSync('js/core/analytics.js', 'utf8');
const compiled = await build({
  entryPoints: ['app/components/AnalyticsConsent.tsx'], bundle: true, write: false,
  format: 'cjs', platform: 'node', jsx: 'automatic', external: ['react', 'react/jsx-runtime'],
  plugins: [{ name: 'isolated-browser-adapters', setup(b) {
    b.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: 'navigation', namespace: 'fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export const usePathname=()=>window.location.pathname;' }));
    b.onLoad({ filter: /\.module\.css$/ }, () => ({ contents: 'export default {};', loader: 'js' }));
  } }],
});
const compiledModule = { exports: {} };
new Function('require', 'module', 'exports', compiled.outputFiles[0].text)(createRequire(import.meta.url), compiledModule, compiledModule.exports);
const Consent = compiledModule.exports.default;
const calls = w => Array.from(w.dataLayer || [], row => Array.from(row));

test('production property is blocked on every non-production origin before tag/queue/storage writes', () => {
  for (const origin of ['http://localhost:3000', 'http://127.0.0.1:4321', 'https://staging.code-destiny.com', 'https://preview.pages.dev', 'https://code-destiny.com.example.org', 'http://code-destiny.com', 'https://code-destiny.com:8443']) {
    for (const override of ['', 'G-FMHV4ZHY3G', 'g-fmhv4zhy3g']) {
      const dom = new JSDOM('<head></head>', { url: origin, runScripts: 'outside-only' });
      const w = dom.window;
      w.__CD_GA_ID = override;
      let ready = 0; w.cdAnalyticsReady = () => ready++;
      w.eval(source); w.dispatchEvent(new w.Event('load'));
      w.cdTrack('page_view'); w.cdSyncConsent();
      assert.equal(w.cdTrackConfirmedPurchase({ payment: { status: 'paid', merchantUid: 'fixture', paymentAmount: 1000 } }), false);
      assert.equal(w.dataLayer, undefined, origin);
      assert.equal(w.document.scripts.length, 0);
      assert.equal(w.localStorage.length, 0);
      assert.equal(ready, 1);
      dom.window.close();
    }
  }
});

test('a distinct explicit test property works; production config remains singular', () => {
  for (const [url, id] of [['https://staging.code-destiny.com', 'G-TESTONLY'], ['https://code-destiny.com', '']]) {
    const dom = new JSDOM('<head></head>', { url, runScripts: 'outside-only' });
    dom.window.__CD_GA_ID = id;
    dom.window.eval(source); dom.window.eval(source);
    const config = calls(dom.window).filter(row => row[0] === 'config');
    assert.equal(config.length, 1); assert.equal(config[0][1], id || 'G-FMHV4ZHY3G');
    dom.window.close();
  }
});

test('actual Next consent UI: default denied, reject/accept/revoke, persistence and late tag initialization', async () => {
  for (const path of ['/', '/yeongnyangi/', '/points/']) {
    // Reopening is a footer button outside the banner (SiteFooterHub, LocaleFooterHub, app/page.js).
    const dom = new JSDOM('<div id="root"></div><button type="button" data-cd-cookie-settings>쿠키 설정</button>', { url: `https://code-destiny.com${path}`, runScripts: 'outside-only' });
    const w = dom.window;
    globalThis.window = w; globalThis.document = w.document; globalThis.location = w.location;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    let root = createRoot(w.document.getElementById('root'));
    const click = async text => {
      const button = [...w.document.querySelectorAll('button')].find(el => el.textContent === text);
      assert.ok(button, `${path}: ${text}`);
      await act(async () => button.click());
    };
    try {
      await act(async () => root.render(React.createElement(Consent)));
      assert.ok(w.document.querySelector('section'));
      w.eval(source);
      assert.equal(calls(w)[0][2].analytics_storage, 'denied');
      await click('필수만 사용');
      assert.equal(calls(w).at(-1)[2].analytics_storage, 'denied');
      assert.match(w.document.cookie, /cd_cookie_consent=essential/);
      // Nothing stays floating over sticky CTAs once a choice is made.
      assert.equal(w.document.querySelector('#root').childElementCount, 0);
      await click('쿠키 설정');
      assert.equal(w.document.activeElement, w.document.querySelector('section'));
      await click('분석 쿠키 동의');
      assert.equal(calls(w).at(-1)[2].analytics_storage, 'granted');
      assert.equal(w.localStorage.getItem('cd_cookie_consent'), 'accepted');
      // Remount represents a new Next entry and must retain the choice, not add config/pageview.
      await act(async () => root.unmount());
      root = createRoot(w.document.getElementById('root'));
      await act(async () => root.render(React.createElement(Consent)));
      assert.equal(w.document.querySelector('section'), null);
      await click('쿠키 설정'); await click('필수만 사용');
      assert.equal(calls(w).at(-1)[2].analytics_storage, 'denied');
      assert.equal(calls(w).filter(row => row[0] === 'config').length, 1);
      assert.equal(calls(w).filter(row => row[1] === 'page_view').length, 0);
      // UI choice before analytics script loads is read by its default consent.
      delete w.cdTrack; delete w.cdSyncConsent; w.dataLayer = []; delete w.gtag;
      await click('쿠키 설정'); await click('분석 쿠키 동의');
      w.eval(source);
      assert.equal(calls(w)[0][2].analytics_storage, 'granted');
    } finally {
      await act(async () => root.unmount()); dom.window.close();
      delete globalThis.window; delete globalThis.document; delete globalThis.location;
      delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    }
  }
});

test('cookie write failure cannot grant consent or hide the choice; excluded surfaces stay untouched', async () => {
  for (const path of ['/', '/admin/', '/gift/example', '/ggulggul/']) {
    const dom = new JSDOM('<div id="root"></div>', { url: `https://code-destiny.com${path}`, runScripts: 'outside-only' });
    const w = dom.window;
    globalThis.window = w; globalThis.document = w.document; globalThis.location = w.location;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const root = createRoot(w.document.getElementById('root'));
    try {
      w.eval(source);
      await act(async () => root.render(React.createElement(Consent)));
      if (path !== '/') { assert.equal(w.document.querySelector('button'), null); continue; }
      Object.defineProperty(w.document, 'cookie', { get: () => '', set: () => {}, configurable: true });
      await act(async () => [...w.document.querySelectorAll('button')].find(el => el.textContent === '분석 쿠키 동의').click());
      assert.ok(w.document.querySelector('[role="alert"]'));
      assert.ok(w.document.querySelector('section'));
      assert.equal(calls(w).filter(row => row[0] === 'consent' && row[1] === 'update').length, 0);
      assert.equal(w.localStorage.getItem('cd_cookie_consent'), null);
    } finally {
      await act(async () => root.unmount()); dom.window.close();
      delete globalThis.window; delete globalThis.document; delete globalThis.location;
      delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    }
  }
});
