/** @jest-environment node */
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { jest } from '@jest/globals';

test('authored Korean stays unchanged without a fetch; language switching still loads translations', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://fixture.test/vedic-ai/' });
  const previous = { window: globalThis.window, document: globalThis.document, act: globalThis.IS_REACT_ACT_ENVIRONMENT };
  globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let locale = 'ko';
  const valueAtPath = (source, path) => path.split('.').reduce((value, key) => value?.[key], source);
  const loadDictionary = jest.fn(async lang => ({ masterProfiles: { controls: { note: lang === 'en' ? 'English note' : '사전 값' } } }));
  const dictionary = { detectLocale: () => locale, normalizeLocale: () => 'ko', loadDictionary, valueAtPath };
  const compile = (file, modules) => {
    const testModule = { exports: {} };
    const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(js, { module: testModule, exports: testModule.exports, window: dom.window, require: name => {
      if (!(name in modules)) throw Error('Unexpected test dependency: ' + name);
      return modules[name];
    } });
    return testModule.exports;
  };
  const hooks = compile('lib/i18n/useT.ts', { react: React, 'next/navigation': { usePathname: () => '/vedic-ai/' }, './dictionary': dictionary });
  const { useScopedCopy } = compile('lib/i18n/scopedCopy.ts', { react: React, './useT': hooks });
  const source = { note: '한국어 원문' };
  function Screen() { const copy = useScopedCopy('masterProfiles', 'controls', source); return React.createElement('p', null, copy.note); }
  const root = createRoot(dom.window.document.getElementById('root'));
  try {
    await React.act(async () => root.render(React.createElement(Screen)));
    expect(dom.window.document.querySelector('p').textContent).toBe('한국어 원문'); expect(loadDictionary).not.toHaveBeenCalled();
    locale = 'en';
    await React.act(async () => dom.window.dispatchEvent(new dom.window.Event('cd:locale-ready')));
    expect(dom.window.document.querySelector('p').textContent).toBe('English note'); expect(loadDictionary).toHaveBeenCalledTimes(1);
    locale = 'ko';
    await React.act(async () => dom.window.dispatchEvent(new dom.window.Event('cd:locale-ready')));
    expect(dom.window.document.querySelector('p').textContent).toBe('한국어 원문'); expect(loadDictionary).toHaveBeenCalledTimes(1);
    // Callers with dictionary-owned copy retain the default Korean loading contract.
    function DictionaryOwned() { const pick = hooks.useTPick(); return React.createElement('p', null, pick('masterProfiles.controls.note', 'fallback')); }
    await React.act(async () => root.render(React.createElement(DictionaryOwned)));
    expect(dom.window.document.querySelector('p').textContent).toBe('사전 값'); expect(loadDictionary).toHaveBeenCalledTimes(2);
  } finally {
    await React.act(async () => root.unmount()); dom.window.close();
    globalThis.window = previous.window; globalThis.document = previous.document; globalThis.IS_REACT_ACT_ENVIRONMENT = previous.act;
  }
});
