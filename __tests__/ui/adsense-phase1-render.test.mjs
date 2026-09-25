import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { createElement } from 'react';
import { renderToString, renderToStaticMarkup } from 'react-dom/server';
import { inspectPublisherDocument } from '../../scripts/lib/publisher-document.mjs';
import { FEATURE_INTRODUCTIONS, INTRO_TOPICS } from '../../lib/i18n/feature-introductions.mjs';
import { trustRoutes } from '../../lib/i18n/public-trust-copy.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const outfile = path.join(root, 'build-cache/phase1-render/components.cjs');
await build({
  stdin: { contents: `export { default as TarotPage } from './app/tarot/prompt-maker/page.tsx'; export { default as Introduction } from './app/components/PublicFeatureIntroduction.jsx';`, resolveDir: root },
  outfile, bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic',
  external: ['react', 'react/jsx-runtime'], loader: { '.js': 'jsx' }, logLevel: 'silent',
  plugins: [{ name: 'server-render-fixtures', setup(builder) {
    builder.onResolve({ filter: /^(next\/(link|image)|\.\/TarotPromptMakerRouteClient|.*ImmersiveRelatedLinks|.*\.css)$/ }, args => ({ path: args.path, namespace: 'fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, args => ({ loader: 'jsx', resolveDir: root, contents:
      args.path.endsWith('.css') ? 'export default {}' :
      args.path.includes('TarotPromptMakerRouteClient') ? 'export default function Client(){throw new Promise(()=>{})}' :
      args.path.includes('ImmersiveRelatedLinks') ? 'export default function Related(){return <nav>Related</nav>}' :
      args.path === 'next/image' ? 'export default function Image(){return null}' :
      'export default function Link({href,children,...props}){return <a href={href} {...props}>{children}</a>}'
    }));
  } }],
});
const { TarotPage, Introduction } = createRequire(import.meta.url)(outfile);

test('tarot guide remains server HTML when the interactive tool cannot render', () => {
  const html = renderToString(createElement(TarotPage));
  const doc = inspectPublisherDocument(html, 'https://code-destiny.com/tarot/prompt-maker/');
  assert.match(doc.bodyText, /타로 오라클 상담 이용 안내/);
  assert.match(doc.bodyText, /질문을 구체적으로/);
  assert.match(doc.bodyText, /상대의 의사/);
  assert.match(doc.bodyText, /의료·법률·투자/);
  assert.equal(doc.streamingRequiresJs, false);
  assert.ok(doc.noJsBodyChars > 0);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
});

test('every localized introduction renders a contact link to a supported route', () => {
  for (const topic of INTRO_TOPICS) for (const locale of Object.keys(FEATURE_INTRODUCTIONS[topic])) {
    const html = renderToStaticMarkup(createElement(Introduction, { locale, topic }));
    const expected = trustRoutes('contact')[locale] || trustRoutes('contact').ko;
    const doc = inspectPublisherDocument(html, `https://code-destiny.com/${locale}/${topic}/`);
    assert.ok(doc.internalLinks.includes('https://code-destiny.com' + expected), `${locale}/${topic}`);
    if (locale === 'zh-tw') assert.doesNotMatch(html, /href="\/zh-tw\/contact\//);
  }
});

test('standalone poker verifies the same publisher without serving ads', () => {
  const publisherId = fs.readFileSync(path.join(root, 'ads.txt'), 'utf8').match(/^google\.com,\s*(pub-\d+),/m)[1];
  for (const file of ['destiny-poker.html', 'public/destiny-poker.html']) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.ok(html.split('</head>')[0].includes(`<meta name="google-adsense-account" content="ca-${publisherId}">`));
    assert.doesNotMatch(html, /adsbygoogle|googlesyndication/);
  }
});
