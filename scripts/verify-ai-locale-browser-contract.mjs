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
