const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.createSourceFile('bridge.js', fs.readFileSync(path.resolve(__dirname, '../../scripts/app-native-bridge.js'), 'utf8'), ts.ScriptTarget.Latest, true);
let installer;
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'installAppLocaleBridge') installer = node.getText(source);
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(installer);
const flush = () => new Promise(resolve => setImmediate(resolve));
function setup({ language = 'de', previous = '', missing = false, delayed = false, followsSystem = false, geo } = {}) {
  const events = new Map(), storage = new Map(), calls = [], emitted = [];
  let nativeListener, resolveInit;
  const location = new URL('https://localhost/lock-screen-fortune/index.html?content=quote&lang=ko#detail');
  const plugin = {
    initialize: options => { calls.push(['initialize', options.language]); return delayed ? new Promise(resolve => { resolveInit = resolve; }) : Promise.resolve({ language, followsSystem }); },
    addListener: (_name, listener) => { nativeListener = listener; return Promise.resolve({ remove() {} }); },
    setLanguage: options => { calls.push(['set', options.language]); return Promise.resolve({ language: options.language }); },
  };
  const window = {
    location,
    CODE_DESTINY_API_BASE_URL: 'https://code-destiny.test',
    fetch: (url, options) => {
      assert.equal(url, 'https://code-destiny.test/api/geo');
      assert.equal(options.credentials, 'omit');
      assert.ok(geo, 'Unexpected country request for an explicit language');
      return geo();
    },
    Capacitor: { Plugins: missing ? {} : { CodeDestinyLocale: plugin } },
    history: { state: { input: 'preserved' }, replaceState(state, _title, href) { assert.equal(state.input, 'preserved'); location.href = href; } },
    localStorage: { setItem: (key, value) => storage.set(key, value) },
    addEventListener(name, fn) { events.set(name, [...(events.get(name) || []), fn]); },
    dispatchEvent(event) { emitted.push(event.type); for (const fn of events.get(event.type) || []) fn(event); },
  };
  const document = { cookie: '', documentElement: { setAttribute() {} } };
  vm.runInNewContext(installer + ';installAppLocaleBridge()', { window, document, URL, AbortSignal, previousAppLanguage: previous, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } } });
  return { window, storage, calls, emitted, native: state => nativeListener(state), init: state => resolveInit(state), select: lang => window.dispatchEvent({ type: 'cd:locale-ready', detail: { lang, source: 'user' } }) };
}
test('OS locale replaces stale URL without navigation or losing detail/history', async () => {
  const ctx = setup(); await flush();
  assert.equal(ctx.storage.get('cd_lang'), 'de');
  assert.equal(ctx.window.location.searchParams.get('lang'), 'de');
  assert.equal(ctx.window.location.searchParams.get('content'), 'quote');
  assert.equal(ctx.window.location.hash, '#detail');
  assert.deepEqual(ctx.calls, [['initialize', '']]);
});

test('fresh installs use the visiting country for all 12 supported languages and keep it on resume', async () => {
  for (const [country, locale, language] of [
    ['KR','ko-KR','ko'],['US','en-US','en'],['JP','ja-JP','ja'],['CN','zh-CN','zh-CN'],
    ['TW','zh-TW','zh-TW'],['VN','vi-VN','vi'],['IN','hi-IN','hi'],['ES','es-ES','es'],
    ['FR','fr-FR','fr'],['DE','de-DE','de'],['NL','nl-NL','nl'],['MY','ms-MY','ms'],['TH','th-TH','en'],
  ]) {
    const ctx = setup({ language: 'ko', followsSystem: true, geo: async () => ({ ok: true, json: async () => ({ ok: true, country, locale }) }) });
    await flush();
    assert.equal(ctx.storage.get('cd_lang'), language, country);
    ctx.native({ language: 'ko', followsSystem: true });
    assert.equal(ctx.storage.get('cd_lang'), language, 'resume ' + country);
    assert.deepEqual(ctx.calls, [['initialize', '']], 'automatic detection must not become a permanent manual setting');
  }
});

test('an explicit choice made while country detection is pending wins the late response', async () => {
  let finish;
  const ctx = setup({ followsSystem: true, geo: () => new Promise(resolve => { finish = resolve; }) });
  await flush(); ctx.select('ja'); await flush();
  finish({ ok: true, json: async () => ({ ok: true, country: 'FR', locale: 'fr-FR' }) });
  await flush(); assert.equal(ctx.storage.get('cd_lang'), 'ja');
});

test('offline or unavailable country detection retains the system language without retry', async () => {
  let count = 0;
  const ctx = setup({ followsSystem: true, geo: async () => { count++; throw new Error('offline'); } });
  await flush(); assert.equal(ctx.storage.get('cd_lang'), 'de'); assert.equal(count, 1);
});
test('explicit previous choice is offered only to native migration', async () => {
  const ctx = setup({ previous: 'ja', language: 'fr' }); await flush();
  assert.deepEqual(ctx.calls, [['initialize', 'ja']]);
  assert.equal(ctx.storage.get('cd_lang'), 'fr');
});
test('only explicit picker events write native locale; OS reset never echoes', async () => {
  const ctx = setup(); await flush();
  ctx.select('zh-TW'); await flush();
  ctx.window.dispatchEvent({ type: 'cd:locale-ready', detail: { lang: 'ko' } });
  ctx.native({ language: 'en', followsSystem: true }); await flush();
  assert.equal(ctx.storage.get('cd_lang'), 'en');
  assert.deepEqual(ctx.calls, [['initialize', ''], ['set', 'zh-TW']]);
});
test('a selection during initialization wins the stale initial response', async () => {
  const ctx = setup({ delayed: true }); ctx.select('ja'); ctx.init({ language: 'ko' }); await flush();
  assert.equal(ctx.storage.get('cd_lang'), 'ja');
  assert.deepEqual(ctx.calls, [['initialize', ''], ['set', 'ja']]);
});
test('repeated resume events do not repeatedly render or write native state', async () => {
  const ctx = setup(); await flush(); const count = ctx.emitted.length;
  ctx.native({ language: 'de' }); ctx.native({ language: 'de' });
  assert.equal(ctx.emitted.length, count);
  assert.equal(ctx.calls.length, 1);
});
test('older builds without the plugin retain their web language behavior', () => {
  const ctx = setup({ missing: true }); assert.equal(ctx.calls.length, 0);
  assert.equal(ctx.window.location.searchParams.get('lang'), 'ko');
});

test('both locale detectors retain the native preference over stale route defaults', () => {
  for (const [file, name, normalizer] of [
    ['lib/i18n/dictionary.ts', 'detectLocale', 'normalizeLocale'],
    ['js/cd-lang-native.js', 'getSavedLang', 'normalizeLang'],
  ]) {
    const tree = ts.createSourceFile(file, fs.readFileSync(path.resolve(__dirname, '../..', file), 'utf8'), ts.ScriptTarget.Latest, true);
    let fn;
    function find(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === name) fn = node.getText(tree); ts.forEachChild(node, find); }
    find(tree);
    const executable = ts.transpileModule(fn.replace(/^export\s+/, ''), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
    const actual = vm.runInNewContext(executable + ';' + name + '()', {
      window: { __cdAppLanguage: 'de', location: { pathname: '/ja/yeongnyangi/', search: '?lang=ko' } },
      [normalizer]: value => value,
    });
    assert.equal(actual, 'de', file);
  }
});
