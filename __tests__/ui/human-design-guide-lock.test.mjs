// 휴먼 디자인 풀이 문장 잠금 — 사주 영구 묶음을 가진 저장 프로필의 차트에서만 열린다.
// 차트·이름·짧은 정의는 계속 무료이고, living-guide 의 풀이 문장만 묶음 뒤에 둔다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { assembleChart } from '../../lib/human-design/chart.js';

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');

// 화면 컴포넌트·훅을 그대로 번들해 돌린다. next/link 와 인증 fetch 만 바꿔 끼운다.
const stubs = {
  name: 'hd-stubs',
  setup(b) {
    b.onResolve({ filter: /^next\/link$/ }, () => ({ path: 'link', namespace: 'hd-stub' }));
    b.onResolve({ filter: /_lib\/auth-client$/ }, () => ({ path: 'auth', namespace: 'hd-stub' }));
    b.onLoad({ filter: /^link$/, namespace: 'hd-stub' }, () => ({
      loader: 'js',
      resolveDir: process.cwd(),
      contents: "import React from 'react'; export default function Link({href,children,...p}){return React.createElement('a',{href,...p},children);}",
    }));
    b.onLoad({ filter: /^auth$/, namespace: 'hd-stub' }, () => ({
      loader: 'js',
      contents: 'export async function authFetch(...a){return globalThis.__hdAuthFetch(...a);}',
    }));
  },
};
const bundled = await build({
  stdin: {
    resolveDir: process.cwd(),
    loader: 'ts',
    contents: `
      export { default as DetailSheet } from './app/human-design/_components/DetailSheet.tsx';
      export { default as LivingGuide } from './app/human-design/_components/LivingGuide.tsx';
      export { default as GuideLockedNotice } from './app/human-design/_components/GuideLockedNotice.tsx';
      export { useHumanDesignGuide, birthMatchesSeed, fetchBundleUnlocked } from './app/human-design/_lib/guide-access.ts';
      export * as livingGuide from './app/human-design/_copy/living-guide.ts';
    `,
  },
  bundle: true, write: false, format: 'cjs', platform: 'node', outfile: 'hd-bundle.js',
  jsx: 'automatic', alias: { '@': process.cwd() }, loader: { '.css': 'local-css' },
  external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/server', 'react-dom/client'],
  plugins: [stubs], logLevel: 'silent',
});
const code = bundled.outputFiles.find((f) => f.path.endsWith('.js')).text;
const mod = { exports: {} };
new Function('require', 'module', 'exports', code)(require, mod, mod.exports);
const { DetailSheet, LivingGuide, GuideLockedNotice, useHumanDesignGuide, birthMatchesSeed, fetchBundleUnlocked, livingGuide } = mod.exports;

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const h = React.createElement;

const row = JSON.parse(read('__tests__/fixtures/human-design/ephemeris-snapshot.json')).rows[0];
const chart = assembleChart({ personalityLongitudes: row.personality, designLongitudes: row.design });
const guide = livingGuide.buildGuide(chart, 'ko');
const sacral = guide.centers.find((c) => c.id === 'SACRAL');
const sheet = (extra) => renderToStaticMarkup(h(DetailSheet, { chart, locale: 'ko', selection: { kind: 'center', center: 'SACRAL' }, onClose() {}, ...extra }));

test('풀이가 잠겨 있으면 센터 상세에 풀이 문장이 없고 묶음 안내만 /saju/ 로 이어진다', () => {
  const html = sheet({ guideApi: null, guideLocked: true });
  assert.ok(!html.includes(sacral.action), '센터 행동 풀이가 잠금에도 새어 나왔다');
  assert.ok(!html.includes(sacral.summary), '센터 풀이 요약이 잠금에도 새어 나왔다');
  assert.ok(!html.includes(sacral.question));
  assert.match(html, /href="\/saju\/"/);
  // 센터의 게이트 수·활성 채널 같은 사실 블록은 그대로 보인다.
  assert.match(html, /\d+\/\d+/);
});

test('풀이가 열리면 같은 자리에 풀이 문장이 보이고 안내는 사라진다', () => {
  const html = sheet({ guideApi: livingGuide, guideLocked: false });
  assert.ok(html.includes(sacral.action));
  assert.ok(html.includes(sacral.question));
  assert.ok(!html.includes('href="/saju/"'));
});

test('채널·게이트 상세의 연결 풀이도 잠금 중에는 나오지 않는다', () => {
  const channelId = chart.channels[0] && (chart.channels[0].channelId || chart.channels[0]);
  const selection = { kind: 'channel', channelId };
  const conn = livingGuide.connectionGuide(chart, selection, 'ko');
  assert.ok(conn.action);
  const locked = renderToStaticMarkup(h(DetailSheet, { chart, locale: 'ko', selection, onClose() {}, guideApi: null, guideLocked: true }));
  const open = renderToStaticMarkup(h(DetailSheet, { chart, locale: 'ko', selection, onClose() {}, guideApi: livingGuide, guideLocked: false }));
  assert.ok(!locked.includes(conn.action));
  assert.match(locked, /href="\/saju\/"/);
  assert.ok(open.includes(conn.action));
});

test('LivingGuide 는 풀이가 없으면 아무것도 그리지 않고, 열리면 별명·결정 방식·공유 버튼을 보인다', () => {
  assert.equal(renderToStaticMarkup(h(LivingGuide, { guide: null })), '');
  const html = renderToStaticMarkup(h(LivingGuide, { guide }));
  assert.ok(html.includes(guide.nickname));
  assert.ok(html.includes(guide.decision));
  assert.ok(html.includes(guide.ui.share), '공유 이미지 기능은 열린 뒤에만 나온다');
});

test('잠금 안내는 사주 영구 묶음으로 이어지고 가격을 적지 않는다', () => {
  for (const locale of ['ko', 'en', 'ja', 'zh-CN', 'zh-TW']) {
    const html = renderToStaticMarkup(h(GuideLockedNotice, { locale }));
    assert.match(html, /href="\/saju\/"/);
    assert.doesNotMatch(html, /\d{1,3},\d{3}|₩|원\b/);
  }
});

test('출생 정보 일치 판정 — 저장 프로필과 같을 때만 true', () => {
  const seed = { profileId: 'p1', birthDate: '1990-05-17', birthTime: '08:30', timezone: 'Asia/Seoul', calendarType: 'solar' };
  const same = { birthDate: '1990-05-17', birthTime: '08:30', timezone: 'Asia/Seoul', calendar: 'solar' };
  assert.equal(birthMatchesSeed(same, seed), true);
  assert.equal(birthMatchesSeed({ ...same, birthDate: '1991-05-17' }, seed), false);
  assert.equal(birthMatchesSeed({ ...same, birthTime: '09:30' }, seed), false);
  assert.equal(birthMatchesSeed({ ...same, calendar: 'lunar' }, seed), false);
  assert.equal(birthMatchesSeed({ ...same, timezone: 'America/New_York' }, seed), false);
  assert.equal(birthMatchesSeed(same, { ...seed, timezone: '' }), true, '프로필에 시간대가 없으면 시간대는 비교하지 않는다');
  assert.equal(birthMatchesSeed({ ...same, calendar: 'lunar-leap' }, { ...seed, calendarType: 'lunar', isLeapMonth: true }), true);
  assert.equal(birthMatchesSeed(null, seed), false);
  assert.equal(birthMatchesSeed(same, null), false);
});

test('묶음 조회 — 묶음 행이 있을 때만 true, 실패·이상 응답은 모두 잠금', async () => {
  const calls = [];
  const reply = (impl) => { globalThis.__hdAuthFetch = async (url, ...rest) => { calls.push(url); return impl(url, ...rest); }; };
  reply(async () => ({ ok: true, json: async () => ({ ok: true, unlocks: { saju_lifetime_bundle: { unlocked: true } } }) }));
  assert.equal(await fetchBundleUnlocked('p 1'), true);
  assert.match(calls[0], /^\/api\/access\/unlocks\?profileId=p%201&serviceKey=saju$/);
  reply(async () => ({ ok: true, json: async () => ({ ok: true, unlocks: { saju_lifetime_bundle: { unlocked: false } } }) }));
  assert.equal(await fetchBundleUnlocked('p1'), false);
  reply(async () => ({ ok: true, json: async () => ({ ok: true, unlockedContentKeys: ['saju_lifetime_bundle'] }) }));
  assert.equal(await fetchBundleUnlocked('p1'), true);
  reply(async () => ({ ok: false, json: async () => ({ ok: false }) }));
  assert.equal(await fetchBundleUnlocked('p1'), false);
  reply(async () => { throw new Error('network'); });
  assert.equal(await fetchBundleUnlocked('p1'), false);
  reply(async () => ({ ok: true, json: async () => { throw new Error('bad json'); } }));
  assert.equal(await fetchBundleUnlocked('p1'), false);
});

// 훅 전체 흐름 — 저장 프로필 + 같은 출생 정보 + 묶음 보유일 때만 풀이 모듈이 읽히고 상태가 open 이 된다.
const dom = new JSDOM('<!doctype html><div id="root"></div>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = require('react-dom/client');
const { act } = require('react-dom/test-utils');

async function mountHook(seed, birth) {
  const root = createRoot(document.getElementById('root'));
  const view = { latest: null };
  function Probe() { view.latest = useHumanDesignGuide(seed, birth); return null; }
  await act(async () => { root.render(h(Probe)); });
  for (let i = 0; i < 4; i += 1) await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
  const result = view.latest;
  await act(async () => { root.unmount(); });
  return result;
}
const seed = { profileId: 'p1', birthDate: '1990-05-17', birthTime: '08:30', timezone: 'Asia/Seoul', calendarType: 'solar' };
const birth = { birthDate: '1990-05-17', birthTime: '08:30', timezone: 'Asia/Seoul', calendar: 'solar' };
const bundleReply = (unlocked) => async () => ({ ok: true, json: async () => ({ ok: true, unlocks: { saju_lifetime_bundle: { unlocked } } }) });

test('훅 — 저장 프로필 묶음 보유 + 같은 출생 정보면 열리고 풀이 모듈이 들어온다', async () => {
  const urls = [];
  globalThis.__hdAuthFetch = async (url) => { urls.push(url); return bundleReply(true)(); };
  const r = await mountHook(seed, birth);
  assert.equal(r.state, 'open');
  assert.equal(typeof r.guideApi.buildGuide, 'function');
  assert.equal(urls.length, 1);
  assert.match(urls[0], /profileId=p1/);
});

test('훅 — 직접 입력(저장 프로필과 다른 출생 정보)은 조회조차 하지 않고 잠긴다', async () => {
  const urls = [];
  globalThis.__hdAuthFetch = async (url) => { urls.push(url); return bundleReply(true)(); };
  const r = await mountHook(seed, { ...birth, birthDate: '1999-01-01' });
  assert.equal(r.state, 'locked');
  assert.equal(r.guideApi, null);
  assert.equal(urls.length, 0);
});

test('훅 — 저장 프로필이 없거나 차트가 없으면 잠긴다', async () => {
  const urls = [];
  globalThis.__hdAuthFetch = async (url) => { urls.push(url); return bundleReply(true)(); };
  assert.equal((await mountHook(null, birth)).state, 'locked');
  assert.equal((await mountHook({ ...seed, profileId: '' }, birth)).state, 'locked');
  assert.equal((await mountHook(seed, null)).state, 'locked');
  assert.equal(urls.length, 0);
});

test('훅 — 묶음이 없거나 조회가 실패하면 잠긴 채로 둔다', async () => {
  globalThis.__hdAuthFetch = bundleReply(false);
  let r = await mountHook(seed, birth);
  assert.equal(r.state, 'locked');
  assert.equal(r.guideApi, null);
  globalThis.__hdAuthFetch = async () => { throw new Error('offline'); };
  r = await mountHook(seed, birth);
  assert.equal(r.state, 'locked');
  assert.equal(r.guideApi, null);
});

test('정적 — 풀이 모듈은 값 import 가 아니라 열림 확인 뒤 동적 import 로만 읽는다', () => {
  const valueImport = /^\s*import\s+(?!type\b)[^;]*from\s+["'][^"']*_copy\/living-guide["']/m;
  for (const file of [
    'app/human-design/HumanDesignClient.tsx',
    'app/human-design/_components/LivingGuide.tsx',
    'app/human-design/_components/DetailSheet.tsx',
    'app/human-design/_components/GuideLockedNotice.tsx',
    'app/human-design/_lib/guide-access.ts',
  ]) {
    assert.doesNotMatch(read(file), valueImport, `${file}: living-guide 를 정적으로 가져오면 잠금 전에 풀이 문장이 번들에 실린다`);
  }
  const access = read('app/human-design/_lib/guide-access.ts');
  assert.match(access, /import\("\.\.\/_copy\/living-guide"\)/);
  assert.match(access, /\/api\/access\/unlocks\?profileId=/);
  const client = read('app/human-design/HumanDesignClient.tsx');
  assert.match(client, /useHumanDesignGuide\(seed, chart \? chartBirth : null\)/);
  assert.match(client, /guide \? <LivingGuide guide=\{guide\} \/>/, '공유 이미지(LivingGuide)는 풀이가 열린 뒤에만 그려야 한다');
});
