const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToString } = require('react-dom/server');
const { JSDOM } = require('jsdom');

// Execute the actual screen and locale hook. Leaf UI and I/O are fixture-only;
// payment, generation and profile network requests cannot escape this fixture.
function screenFixture(file) {
  const source = fs.readFileSync(file, 'utf8');
  // Next compiles styled-jsx separately. This transpile-only fixture omits that
  // style leaf; the exported browser checks verify the actual compiled CSS/HTML.
  const stripStyledJsx = context => root => {
    const visit = node => ts.isJsxElement(node) && node.openingElement.tagName.getText() === 'style'
      && node.openingElement.attributes.properties.some(prop => prop.name?.getText() === 'jsx')
      ? context.factory.createJsxExpression(undefined, context.factory.createNull()) : ts.visitEachChild(node, visit, context);
    return ts.visitNode(root, visit);
  };
  const compiled = ts.transpileModule(source, { transformers: { before: [stripStyledJsx] }, compilerOptions: {
    jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText;
  const state = { locale: 'ko', seed: {}, requests: [] };
  const compiledModule = { exports: {} };
  const leaf = ({ children } = {}) => children || null;
  const forbidden = () => { throw new Error('Paid operation is forbidden in an introduction fixture'); };
  const mocks = {
    '@/constants/loadingMessages': { getCurrentLoadingLocale: () => state.locale, INTL_LOCALE_BY_LOADING_LOCALE: { ko:'ko-KR', en:'en-US', ja:'ja-JP' } },
    '@/app/_lib/ai-prefill-seed': { readAiProfileSeed: () => state.seed },
    '@/app/hooks/useAiProfileSeed': { useAiProfileSeed: () => ({ seed: null, seedVersion: 0 }) },
    '@/app/hooks/usePaidDeliveryScope': { usePaidDeliveryScope: () => () => () => true },
    '@/app/hooks/useLocaleRequestScope': { useLocaleRequestScope: () => () => ({ isCurrent: () => true }) },
    '@/app/hooks/usePaidResume': { usePaidResume() {} },
    '@/app/_lib/auth-client': { authFetch: async (url, init) => {
      state.requests.push({ url, method: init?.method || 'GET' });
      return { ok: false, status: 401, json: async () => ({ ok: false }) };
    } },
    '@/app/_lib/billing-client': new Proxy({}, { get: () => forbidden }),
    '@/lib/birthDateInputProps': { birthDateTextInputProps: value => ({ value, readOnly: true }) },
    '@/components/fortune/master-profiles': { masterProfiles: { yun: {}, hanbi: {} } },
    './KarmaRelationshipGuide': { emptyRelationshipContext: () => ({}), KarmaRelationshipGuide: leaf, KarmaRelationshipFields: leaf },
    '@/lib/dev-preview/core': { readDevPreviewState: () => null },
    '@/components/fortune/PagedResultViewer': { default: leaf, usePagedViewerMode: () => [false, () => {}] },
    'framer-motion': { m: new Proxy({}, { get: () => leaf }), useReducedMotion: () => false },
    '@/src/features/expert-characters': {
      isExpertCharacterEnabled: () => true,
      getExpertCharacter: () => ({ hero: {} }),
      getExpertCharacterName: () => 'Yun-dal', getExpertCharacterTitle: () => 'Astrology',
      getExpertLine: () => ({ text: 'Fixture introduction', mood: 'idle' }),
    },
    'next/dynamic': { default: () => leaf },
    '@/lib/i18n/dictionary': { detectLocale: () => state.locale },
    '@/app/components/ConsultationMasterIntro': { default: ({label, children}) => React.createElement('section', null, React.createElement('h2', null, label), children), masterPreparationLabel: () => 'Prepare' },
    'next/image': { default: ({ src, alt }) => React.createElement('img', { src, alt }) },
  };
  const scope = { module: compiledModule, exports: compiledModule.exports, console, crypto: global.crypto, URLSearchParams,
    require(name) {
      if (name === 'react' || name === 'react/jsx-runtime') return require(name);
      if (name.endsWith('.module.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
      if (mocks[name]) return new Proxy(mocks[name], { get: (target, key) => key === '__esModule' || target[key] });
      return new Proxy({ __esModule: true, default: leaf }, { get: (target, key) => target[key] || leaf });
    },
  };
  vm.runInNewContext(compiled, scope);
  return { state, scope, Screen: compiledModule.exports.default };
}

for (const config of [
  {file:'app/astrology-ai/AstrologyAiClient.tsx', heading:'h1', title:/Astrology/i},
  {file:'app/vedic-ai/VedicAiClient.tsx', heading:'h2', title:/Vedic/i},
  {file:'app/karma-destiny-ai/KarmaDestinyAiClient.tsx', heading:'h2', title:/Karma/i},
  {file:'app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.tsx', heading:'h2'},
]) test(`${config.file}: real introduction hydrates with another language and cached birth profile`, async () => {
  const fixture = screenFixture(config.file);
  const html = renderToString(React.createElement(fixture.Screen));
  assert.ok(html.includes('<'+config.heading));
  if (config.heading === 'h1') assert.match(html, /astrology-ai-960.webp/);
  assert.doesNotMatch(html, /<form\b|<textarea\b|<input\b/);
  assert.equal(fixture.state.requests.length, 0, 'SSR cannot query private state');
  const dom = new JSDOM(`<div id="root">${html}</div>`, { url: 'https://example.test/astrology-ai/?lang=en' });
  const saved = { window: global.window, document: global.document, act: global.IS_REACT_ACT_ENVIRONMENT };
  global.window = fixture.scope.window = dom.window;
  global.document = fixture.scope.document = dom.window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  fixture.state.locale = 'en';
  fixture.state.seed = { name: 'Cached owner', gender: 'female', birthDate: '1993-02-04', birthTime: '11:25' };
  const errors = [];
  let root;
  try {
    const { hydrateRoot } = require('react-dom/client');
    await React.act(async () => {
      root = hydrateRoot(dom.window.document.getElementById('root'), React.createElement(fixture.Screen), {
        onRecoverableError: error => errors.push(error.message),
      });
    });
    assert.deepEqual(errors, []);
    assert.ok(dom.window.document.querySelector('input'));
    const values = [...dom.window.document.querySelectorAll('input')].map(input => input.value);
    assert.ok(values.includes('Cached owner'));
    assert.ok(values.includes('1993-02-04'));
    if (config.title) assert.match(dom.window.document.querySelector(config.heading).textContent, config.title);
    fixture.state.locale = 'ja';
    await React.act(async () => dom.window.dispatchEvent(new dom.window.Event('cd:locale-ready')));
    if (config.title) assert.doesNotMatch(dom.window.document.querySelector(config.heading).textContent, config.title);
    assert.ok([...dom.window.document.querySelectorAll('input')].some(input => input.value === 'Cached owner'));
    assert.ok(fixture.state.requests.every(request => request.method === 'GET'));
  } finally {
    if (root) await React.act(async () => root.unmount());
    global.window = saved.window; global.document = saved.document; global.IS_REACT_ACT_ENVIRONMENT = saved.act;
    dom.window.close();
  }
});
