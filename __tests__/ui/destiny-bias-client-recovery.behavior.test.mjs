import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
const require = createRequire(import.meta.url);
const React = require('react'), { act } = React;
const { createRoot } = require('react-dom/client');
const { JSDOM } = require('jsdom');
const entry = fileURLToPath(new URL('../../app/saju/destiny-bias/DestinyBiasClient.tsx', import.meta.url));
class ApiError extends Error { constructor(code) { super(code); this.code = code; } }
const mocks = {
  'next/navigation': 'export const useRouter=()=>({push(){}});',
  'framer-motion': 'export const useReducedMotion=()=>true;',
  '@/lib/idol-chemi': 'export const CHEMI_TYPE_BY_ID=new Proxy({},{get:()=>({nameKo:"유형",shortKo:"유형"})}),MIN_SELF_CONSENT_AGE=14,listRosterGroups=()=>[],resolvePartner=()=>globalThis.__bias.partner;',
  '@/app/_lib/auth-storage': 'export const readSanitizedAuthUser=()=>globalThis.__bias.user;',
  '@/app/_lib/auth-client': 'export const AUTH_SESSION_INVALIDATED_EVENT="cd:auth-session-invalidated";',
  '@/app/_lib/friendly-error': 'export const friendlyErrorMessage=()=>"계산 오류";',
  '@/app/_lib/profile-card-storage': 'export const readCurrentDestinyProfile=()=>null,resolveDestinyProfileBirthParts=()=>null;',
  '@/app/_lib/feature-session-draft': 'export const clearFeatureSessionDraft=()=>{},readFeatureSessionDraft=()=>null,writeFeatureSessionDraft=()=>{};',
  '@/app/hooks/useAnalytics': 'export const useAnalytics=()=>({trackClick(){},trackShare(){},trackFunnelStep(){}});',
  '@/app/hooks/useBackNavigation': 'export const useBackNavigation=()=>{};',
  './lib/destinyBiasTouchGuard': 'export const useDestinyBiasTouchGuard=()=>({guardHandlers:{},shouldBlockClick:()=>false});',
  '@/app/hooks/useCoinGate': 'export const useCoinGate=()=>({isPaying:false,ensurePaidAccess:async input=>{globalThis.__bias.gates++;globalThis.__bias.gateInput=input;await input.onPaid?.({transactionId:"payment-1",accessSource:"payment"});return {ok:true};}});',
  '@/app/hooks/usePaidResume': 'export const packPaidResumeArg=JSON.stringify,unpackPaidResumeArg=JSON.parse,usePaidResume=(_kind,run)=>{globalThis.__bias.resume=run;return args=>({kind:"bias",args});};',
  '@/lib/payment/server-feature-pricing': 'export const resolveServerFeaturePricing=()=>({cost:50,amountKRW:5000});',
  './engine/chemiReportBridge': 'export const DEFAULT_BIAS_MOOD="",DEFAULT_RELATION_MOOD="",RELATION_MOODS=[],RELATION_MOODS_MINOR=[],buildChemiReport=()=>globalThis.__bias.calculated;',
  './lib/paidDetails': 'export const PaidDetailsError=globalThis.__bias.Error,requestPaidDetails=(...args)=>globalThis.__bias.request(...args);',
  './components/chemi/chemiStorage': 'export const collectedTypeIds=()=>[],pushRecentPartner=()=>[],pushRecentResult=()=>[],readRecentPartners=()=>[],readRecentResults=()=>[];',
  '@/js/share-service.mjs': 'export const shareThrough=()=>{};',
};
const nullUi = 'import React from "react";export default React.forwardRef(()=>null);export const RecommendationResult=()=>null,toPhotocardView=()=>({}),DEFAULT_PHOTOCARD_THEME="",PHOTOCARD_THEMES=[],SHARE_CARD_HEIGHT=100,SHARE_CARD_WIDTH=100;';
const bundle = await build({ entryPoints: [entry], bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', external: ['react', 'react/jsx-runtime'],
  plugins: [{ name: 'boundaries', setup(b) {
    b.onResolve({ filter: /.*/ }, args => {
      if (args.kind === 'entry-point' || args.path.startsWith('react')) return;
      if (args.path.includes('paid-details-key.mjs')) return { path: fileURLToPath(new URL('../../lib/idol-chemi/paid-details-key.mjs', import.meta.url)) };
      return { path: args.path, namespace: 'fixture' };
    });
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ loader: 'jsx', contents: mocks[args.path] ||
      (args.path.endsWith('.css') ? 'export default {};' : args.path.includes('MyInfoPanel') ? 'import React from "react";export default p=><button data-submit onClick={p.onSubmit}>계산하기</button>;' :
        args.path.includes('ChemiSections') ? 'import React from "react";export default p=><p data-details>{p.copy.oneLiner}</p>;' : nullUi) }));
  } }], logLevel: 'error' });
const partner = { kind: 'roster', id: 'member-a', displayName: '최애', groupLabel: '그룹', groupId: 'group-a' };
const report = { result: { chemiTypeId: 'type-a', chemiTypeNameKo: '유형', minorMode: false }, copy: { oneLiner: '새 계산', notices: [] }, vm: {}, totalScore: 80 };

async function mount(t, request) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://test.invalid/saju/destiny-bias/?m=member-a' });
  const keys = ['window', 'document', 'navigator', 'localStorage', 'CustomEvent', 'IS_REACT_ACT_ENVIRONMENT', '__bias'];
  const saved = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const state = { Error: ApiError, partner, user: { id: 'owner-a', birthDate: '1990-05-17' }, calculated: report, gates: 0, request };
  for (const key of keys) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: key === '__bias' ? state : key === 'IS_REACT_ACT_ENVIRONMENT' ? true : dom.window[key] });
  const module = { exports: {} }; new Function('require', 'module', 'exports', bundle.outputFiles[0].text)(require, module, module.exports);
  const root = createRoot(document.querySelector('#root'));
  await act(async () => root.render(React.createElement(module.exports.default)));
  await act(async () => document.querySelector('[data-submit]').click());
  const open = () => act(async () => [...document.querySelectorAll('button')].find(b => b.textContent.startsWith('상세 리포트 열기')).click());
  t.after(async () => { await act(async () => root.unmount()); dom.window.close(); for (const [key, value] of saved) if (value) Object.defineProperty(globalThis, key, value); else delete globalThis[key]; });
  return { state, open };
}

test('reopened result renders stored original and bypasses payment', async t => {
  const stored = { ...report, copy: { oneLiner: '구매 당시 원문', notices: [] } };
  const app = await mount(t, async () => stored); await app.open();
  assert.equal(document.querySelector('[data-details]').textContent, '구매 당시 원문');
  assert.equal(app.state.gates, 0);
  await act(async () => window.dispatchEvent(new CustomEvent('cd:auth-changed')));
  assert.equal(document.querySelector('[data-details]').textContent, '구매 당시 원문');
});
test('lookup failure does not open another checkout', async t => {
  const app = await mount(t, async () => { throw new ApiError('LOOKUP_UNAVAILABLE'); }); await app.open();
  assert.equal(app.state.gates, 0); assert.equal(document.querySelector('[role=alert]').textContent, 'LOOKUP_UNAVAILABLE');
});
test('inline purchase saves with its retry key; account switch clears original', async t => {
  let calls = 0; const inputs = [];
  const app = await mount(t, async (input, save) => { inputs.push({ input, save }); calls++; if (!save) return null; if (calls === 2) throw new ApiError('PAYMENT_NOT_VERIFIED'); return report; });
  await app.open(); assert.equal(app.state.gates, 1); assert.ok(document.querySelector('[data-details]'));
  assert.equal(inputs.at(-1).input.requestId, app.state.gateInput.requestId);
  await act(async () => { app.state.user = { id: 'owner-b' }; window.dispatchEvent(new CustomEvent('cd:auth-changed')); });
  assert.equal(document.querySelector('[data-details]'), null);
});
test('late account response cannot unlock the next account', async t => {
  let release; const app = await mount(t, () => new Promise(resolve => { release = resolve; }));
  await app.open();
  await act(async () => { app.state.user = { id: 'owner-b' }; window.dispatchEvent(new CustomEvent('cd:auth-changed')); release(report); });
  assert.equal(document.querySelector('[data-details]'), null); assert.equal(app.state.gates, 0);
});
test('payment redirect forwards server receipt and preserves the pre-payment original', async t => {
  const inputs = [];
  const app = await mount(t, async (input, save) => { inputs.push({input,save}); return input.report; });
  const original = {...report,copy:{oneLiner:'결제 전 원문',notices:[]}};
  await act(async () => {
    assert.equal(await app.state.resume({payload:JSON.stringify({partner,info:{birthDateInput:'19900517',calendarType:'solar'},report:original})},
      {requestId:'redirect-server-receipt',profileId:'paid-profile',payload:{accessMethod:'FAMILY'}}),true);
  });
  assert.equal(inputs.at(-1).input.requestId,'redirect-server-receipt');
  assert.equal(inputs.at(-1).input.profileId,'paid-profile');
  assert.equal(inputs.at(-1).input.accessMethod,'pass');
  assert.equal(document.querySelector('[data-details]').textContent,'결제 전 원문');
  assert.equal(app.state.gates,0);
});
