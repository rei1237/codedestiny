const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const source = fs.readFileSync(path.resolve(__dirname, '../../app/components/AppChrome.tsx'), 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;

function render(pathname) {
  const exports = {};
  const context = {
    exports,
    require(name) {
      if (name === 'react' || name === 'react/jsx-runtime') return require(name);
      if (name === 'next/navigation') return { usePathname: () => pathname, useRouter: () => ({}) };
      if (name === 'next/dynamic') return loader => function DeferredSurface() {
        return React.createElement('aside', { 'data-surface': loader.toString() });
      };
      if (name === 'framer-motion') return { LazyMotion: ({ children }) => children };
      if (name.endsWith('useT')) return { useLocale: () => 'ko' };
      if (name.endsWith('/locales')) return { localeFromPathname: () => null };
      if (name.endsWith('/shellHome')) return { SHELL_HOME_PATH: '/ggulggul/' };
      if (name.endsWith('DisclaimerBanner')) return function DisclaimerStub() {
        return React.createElement('aside', { 'data-disclaimer': true });
      };
      if (name.endsWith('.module.css') || name === 'lucide-react') return {};
      throw new Error(`Unexpected import: ${name}`);
    },
  };
  vm.runInNewContext(code, context);
  return renderToStaticMarkup(React.createElement(exports.default, null, React.createElement('main', null, 'Home content')));
}

test('exported Android home renders the same content without mounting global chrome', () => {
  assert.equal(render('/index.html'), render('/'));
  assert.equal(render('/index.html'), '<main>Home content</main>');
});

test('ordinary pages retain the global header, footer, disclaimer and mobile navigation', () => {
  const html = render('/about');
  for (const surface of ['GlobalHeader', 'SiteFooterHub', 'MobileBottomNav', 'data-disclaimer']) {
    assert.ok(html.includes(surface), `${surface} should remain on ordinary pages`);
  }
  assert.ok(html.includes('Home content'));
});
