const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const {JSDOM} = require('jsdom');
const copy = require('../../lib/i18n/native-home-copy.json');
const compiled = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../../app/components/NativeHomeCopy.tsx'), 'utf8'), {
  compilerOptions: {jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true},
}).outputText;

function render(native, locale) {
  const testModule = {exports: {}};
  vm.runInNewContext(compiled, {module: testModule, exports: testModule.exports, require: name => {
    if (name.endsWith('/app-build-target')) return {IS_APP_BUILD: native};
    if (name.endsWith('/useT')) return {useLocale: () => locale};
    if (name.endsWith('/native-home-copy.json')) return copy;
    if (name.endsWith('/native-home-html.mjs')) return require('../../lib/i18n/native-home-html.mjs');
    if (name === 'next/link') return function MockLink(props) { return React.createElement('a', props); };
    return require(name);
  }});
  const {NativeHomeRoot: Root, NativeHomeText: Text, NativeHomeCardLink: Card} = testModule.exports;
  const html = renderToStaticMarkup(React.createElement(Root, {className: 'approved-home'},
    React.createElement('h1', null, React.createElement(Text, null, '꿀꿀 운세에서 어떤 운세를 만나볼까요?')),
    React.createElement(Card, {href: '/ggulggul/', external: true, name: '꿀꿀 운세', action: '운세 골라보기', 'aria-describedby': 'yeoniCardTag'}),
    React.createElement(Card, {href: '/yeongnyangi/', name: '운세보는 영냥이', action: '영냥이 만나기', 'aria-describedby': 'ynCardTag'}),
  ));
  return new JSDOM(html).window.document;
}

test('packaged home uses all supported languages and retains both entry links', () => {
  for (const locale of Object.keys(copy['꿀꿀 운세에서 어떤 운세를 만나볼까요?'])) {
    const doc = render(true, locale);
    assert.equal(doc.querySelector('[lang]').lang, locale);
    assert.equal(doc.querySelector('h1').textContent, copy['꿀꿀 운세에서 어떤 운세를 만나볼까요?'][locale]);
    assert.deepEqual([...doc.querySelectorAll('a')].map(a => a.getAttribute('href')), ['/ggulggul/', '/yeongnyangi/']);
    assert.equal(doc.querySelectorAll('a')[1].getAttribute('aria-label'), `${copy['운세보는 영냥이'][locale]} ${copy['영냥이 만나기'][locale]}`);
  }
});

test('public home and Korean app keep Korean copy with unchanged markup', () => {
  for (const [native, locale] of [[false, 'fr'], [true, 'ko']]) {
    const doc = render(native, locale);
    assert.equal(doc.querySelector('[lang]').lang, 'ko');
    assert.equal(doc.querySelector('h1').textContent, '꿀꿀 운세에서 어떤 운세를 만나볼까요?');
    assert.equal(doc.querySelectorAll('a')[1].textContent, '운세보는 영냥이');
  }
});
