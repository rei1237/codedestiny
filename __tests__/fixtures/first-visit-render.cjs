const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'app/yeongnyangi/_components/FirstVisitGuide.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'app/yeongnyangi/_components/first-visit.module.css'), 'utf8');
const executable = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
exports.css = css;
exports.renderGuide = function renderGuide(locale, { scene = 0, active = true, selected = false } = {}) {
  const copy = JSON.parse(fs.readFileSync(path.join(root, `public/i18n/${locale.toLowerCase()}/firstVisitGuide.json`), 'utf8')).firstVisitGuide;
  const componentModule = { exports: {} };
  const load = name => {
    if (name === 'react') return { ...React, useState: value => [typeof value === 'number' ? scene : value, () => {}] };
    if (name === '@/lib/i18n/useT') return { useLocale: () => locale, useT: namespace => {
      if (namespace !== 'firstVisitGuide') throw Error('Unexpected namespace');
      return key => { const value = copy[key.replace(/^firstVisitGuide\./, '')]; if (!value) throw Error('Missing: ' + key); return value; };
    } };
    if (name === '../_lib/use-first-visit') return { useFirstVisit: () => ({ state: { status: active ? 'active' : 'new', step: 1 }, scope: 'guest' }) };
    if (name === '../_lib/use-profiles') return { useProfiles: () => ({ profiles: selected ? [{ profileId: 'fixture' }] : [], profileId: selected ? 'fixture' : '', loading: false, guest: true }) };
    if (name === './ProfilePicker') return { __esModule: true, default: props => React.createElement('div', { 'data-profile-locale': props.locale }) };
    if (name === '../_lib/api' || name === '@/js/first-visit-state.mjs') return {};
    if (name === './first-visit.module.css') return { __esModule: true, default: Object.fromEntries([...css.matchAll(/\.([\w-]+)/g)].map(match => [match[1], match[1]])) };
    if (name === 'next/image') return { __esModule: true, default: props => React.createElement('img', props) };
    return require(name);
  };
  vm.runInNewContext(executable, { exports: componentModule.exports, module: componentModule, require: load });
  return renderToStaticMarkup(React.createElement(componentModule.exports.default));
};
