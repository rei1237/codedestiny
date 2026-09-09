#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import * as locales from '../lib/i18n/locale-normalize.js';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync('lib/i18n/dictionary.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const storage = new Map([['cd_lang', 'ja']]);
const window = { location: { search: '', pathname: '/ko/oracle' }, localStorage: { getItem: key => storage.get(key) } };
const context = { exports: {}, require: () => locales, window, document: { cookie: 'cd_locale=ja' }, URLSearchParams, console, process };
vm.runInNewContext(compiled, context);
const { detectLocale } = context.exports;
assert.equal(detectLocale(), 'ko');
// The React bridge calls detectLocale; detection must not call it back recursively.
window.cdGetCurrentLanguage = () => detectLocale();
assert.equal(detectLocale(), 'ko');
window.location.search = '?lang=zh-SG';
assert.equal(detectLocale(), 'zh-CN');
window.__cdNativeLangBound = true;
let selected = 'en';
window.cdGetCurrentLanguage = () => selected;
assert.equal(detectLocale(), 'en');
selected = 'ja';
assert.equal(detectLocale(), 'ja');
console.log('[verify:ai-locale-browser-contract] PASS: explicit ko, query alias, native selection, immediate change, bridge recursion');

const standaloneWindow = { location: { search: '', pathname: '/geomancy-oracle-v4.html' }, localStorage: { getItem: key => storage.get(key) }, document: { cookie: '' } };
vm.runInNewContext(readFileSync('js/core/standalone-ai-locale.js', 'utf8'), { window: standaloneWindow, URLSearchParams });
const standalone = standaloneWindow.cdStandaloneAiLocale;
for (const locale of locales.RUNTIME_LOCALES) {
  standaloneWindow.location.search = '?lang=' + locale;
  assert.equal(standalone.current(), locale);
  assert.equal(standaloneWindow.cdGetCurrentLanguage(), locale);
}
standaloneWindow.location.search = '?lang=zh-Hant-HK';
assert.equal(standalone.current(), 'zh-TW');
standaloneWindow.location.search = '';
standaloneWindow.location.pathname = '/ko/geomancy-oracle-v4.html';
assert.equal(standalone.current(), 'ko');
standaloneWindow.location.pathname = '/geomancy-oracle-v4.html';
assert.equal(standalone.current(), 'ja');
standaloneWindow.localStorage.getItem = () => { throw new Error('blocked storage'); };
standaloneWindow.document.cookie = 'cd_locale=vi';
assert.equal(standalone.current(), 'vi');

// Execute the actual inline request functions with a recording fetch stub.
function inlineFunction(file, name) {
  const html = readFileSync(file, 'utf8');
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const script = ts.createSourceFile(file + '.js', match[1], ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    let found;
    function visit(node) {
      if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node.getText(script);
      if (!found) ts.forEachChild(node, visit);
    }
    visit(script);
    if (found) return found;
  }
  throw new Error('Missing inline function: ' + file + ':' + name);
}
for (const locale of locales.RUNTIME_LOCALES) {
  standaloneWindow.location.search = '?lang=' + locale;
  let captured;
  const sandbox = {
    window: standaloneWindow, localStorage: { getItem: () => '' }, sessionStorage: { getItem: () => '' },
    fetch: async (url, init) => { captured = { url, init }; return { ok: true, text: async () => '{}', json: async () => ({ ok: true }) }; },
    AbortController, setTimeout, clearTimeout, API_BASE: '', TAROT_API_TIMEOUT_MS: 100,
    readAuthToken: () => '', readPremiumToken: () => '', currentPremiumToken: '', clean: value => String(value || '').trim(),
    toOracleCardPayload: value => value, geomancyPayEvidence: {},
  };
  const cases = [
    ['pet-saju.html', 'apiFetch', "apiFetch('/api/pet-saju-ai/report', {method:'POST',body:'{}'})"],
    ['tarot-ijik.html', 'postJsonWithTimeout', "postJsonWithTimeout('/api/tarot/test', '{}')"],
    ['yoga-guru.html', 'postYogaGuruOnce', "postYogaGuruOnce('/api/yoga-guru', {}, 100)"],
  ];
  for (const [file, name, expression] of cases) {
    vm.runInNewContext(inlineFunction(file, name), sandbox);
    await vm.runInNewContext(expression, sandbox);
    assert.equal(captured.init.headers['x-code-destiny-locale'], locale, file);
  }
  for (const [file, name] of [['celestial-harmony.html', 'buildAuthHeaders'], ['vedic-astrology.html', 'vedicPrashnaReadAuthHeaders']]) {
    vm.runInNewContext(inlineFunction(file, name), sandbox);
    assert.equal(vm.runInNewContext(name + '()', sandbox)['x-code-destiny-locale'], locale, file);
  }
  for (const name of ['geomancyLocaleCopy', 'formatOraclePayload', 'fetchOracle']) vm.runInNewContext(inlineFunction('geomancy-oracle-v4.html', name), sandbox);
  await vm.runInNewContext("fetchOracle('question', {judge:{}}, 'alchemist')", sandbox);
  assert.equal(captured.init.headers['x-code-destiny-locale'], locale, 'geomancy');
  const formatted = vm.runInNewContext("formatOraclePayload({answer:'fixture',keyJudgement:'fixture'}, '" + locale + "')", sandbox);
  if (locale !== 'ko') assert.doesNotMatch(formatted, /[가-힣]/);
}
console.log('[verify:ai-locale-browser-contract] PASS: standalone 12 locales, aliases, storage denied, actual request/header functions with fetch stub');
