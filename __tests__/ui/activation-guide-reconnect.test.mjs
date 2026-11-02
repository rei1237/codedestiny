import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

// Exercise the shipped renderers, API client and preference helper. Only Next's
// navigation/image wrappers and authenticated transport are replaced; no account,
// balance, receipt, grant or spend is written by this verification.
const adapters = {
  'next/image': 'export default function Image(props){return React.createElement("img",props)}',
  'next/link': 'export default function Link(props){return React.createElement("a",props)}',
  'next/navigation': 'export const usePathname=()=>"/saju/";',
  '@/app/_lib/user-session-cache': 'export const useUserAccess=()=>({userKey:window.testAccount.accountId});',
  '@/app/_lib/auth-client': 'export const authFetch=(...args)=>window.fetch(...args);',
};
const reactBundle = await build({
  stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';
    import Entry from './app/components/activation/ActivationEntry';
    const root=createRoot(document.getElementById('root'));root.render(React.createElement(Entry));
    window.unmountGuide=()=>root.unmount();`, resolveDir: process.cwd(), loader: 'tsx' },
  bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'guide-test-adapters', setup(builder) {
    builder.onResolve({ filter: /^(next\/|@\/app\/_lib\/)/ }, args => adapters[args.path] ? { path: args.path, namespace: 'test-adapter' } : undefined);
    builder.onLoad({ filter: /.*/, namespace: 'test-adapter' }, args => ({ contents: `import React from 'react';${adapters[args.path]}`, resolveDir: process.cwd() }));
    builder.onLoad({ filter: /activation\.module\.css$/ }, () => ({ contents: 'export default {entry:"guide-entry",hideToday:"guide-hide"};', loader: 'js' }));
  } }],
});
const legacyBundle = await build({ entryPoints: ['js/activation-entry.mjs'], bundle: true, write: false, format: 'iife', platform: 'browser' });
const scripts = { react: reactBundle.outputFiles[0].text, legacy: legacyBundle.outputFiles[0].text };
const now = Date.parse('2026-11-02T12:00:00+09:00');
const midnight = Date.parse('2026-11-03T00:00:00+09:00');
const newcomer = id => ({ ok: true, accountId: id, tutorial: { eligible: true, guideEligible: true, legacySignupReceived: false, receipt: null }, wallet: { balance: 0 } });
async function page(renderer, account, stored = {}, time = now) {
  const originalAccount = JSON.stringify(account);
  const dom = new JSDOM('<html lang="ko"><body><div id="root"></div></body></html>', { url: 'https://example.test/saju/', runScripts: 'outside-only', pretendToBeVisual: true });
  const win = dom.window, calls = [];
  win.testAccount = account; win.Date.now = () => time; win.__cdDestinyProfileServerReady = true;
  for (const [key, value] of Object.entries(stored)) win.localStorage.setItem(key, value);
  win.fetch = async (url, init = {}) => {
    const method = init.method || 'GET'; calls.push({ url, method });
    assert.equal(method, 'GET', 'guide display must never issue a write request');
    assert.ok(['/api/activation-rewards/status', '/api/activation-rewards/snu/status'].includes(url), 'unexpected endpoint');
    const data = url.endsWith('/snu/status') ? { ok: true, verified: false } : account;
    return { ok: true, json: async () => JSON.parse(JSON.stringify(data)) };
  };
  win.fetchJsonWithAuth = win.fetch;
  win.eval(scripts[renderer]);
  const settle = async () => { for (let i = 0; i < 8; i++) await new Promise(resolve => setTimeout(resolve, 5)); };
  await settle();
  const guide = () => win.document.querySelector('aside[aria-label="연이의 선물 안내"],#cdActivationGuide');
  return {
    win, calls, guide, settle,
    storage: () => Object.fromEntries(Array.from({ length: win.localStorage.length }, (_, i) => win.localStorage.key(i)).map(key => [key, win.localStorage.getItem(key)])),
    close: () => {
      try {
        assert.ok(calls.every(call => call.method === 'GET'), 'no grant, spend or other write request is permitted');
        assert.equal(JSON.stringify(account), originalAccount, 'verification must not change balances or receipts');
      } finally { win.unmountGuide?.(); win.close(); }
    },
  };
}

for (const renderer of ['legacy', 'react']) {
  test(`${renderer}: previous grant with zero current balance never shows a reward invitation`, async () => {
    // Same public eligibility shape observed on the real signed-in account;
    // no private identifier, personal details or real balance history is copied.
    const account = newcomer('received-account'); account.tutorial.guideEligible = false;
    for (let reconnect = 0; reconnect < 2; reconnect++) {
      const view = await page(renderer, account);
      try { assert.equal(view.guide(), null); assert.equal(account.wallet.balance, 0); assert.ok(view.calls.length >= 2); }
      finally { view.close(); }
    }
  });
  test(`${renderer}: hide-today survives a fresh page and is shared with the other renderer`, async () => {
    const account = newcomer('new-account'), initial = await page(renderer, account);
    let stored;
    try {
      assert.ok(initial.guide(), 'eligible invitation must be visible before dismissal');
      const button = initial.guide().querySelector('button'); assert.equal(button.textContent, '오늘 하루 보지 않기');
      button.click(); await initial.settle(); assert.equal(initial.guide(), null);
      stored = initial.storage(); assert.equal(Number(stored['cd:activation-guide:hidden-until:new-account']), midnight);
    } finally { initial.close(); }
    for (const nextRenderer of ['legacy', 'react']) {
      const reconnected = await page(nextRenderer, account, stored);
      try { assert.equal(reconnected.guide(), null); assert.equal(account.wallet.balance, 0); }
      finally { reconnected.close(); }
    }
    const otherAccount = await page(renderer, newcomer('different-account'), stored);
    try { assert.ok(otherAccount.guide(), 'one account must not suppress a different account'); }
    finally { otherAccount.close(); }
    const tomorrow = await page(renderer, account, stored, midnight);
    try { assert.ok(tomorrow.guide(), 'eligible invitation may return only after Korean midnight'); }
    finally { tomorrow.close(); }
  });
}
