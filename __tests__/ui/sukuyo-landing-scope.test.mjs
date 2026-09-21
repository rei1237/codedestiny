import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Evaluate the composed page data: inherited single-person copy must not leak into
// the compatibility route. No browser, payment, CMS network or LLM is called.
const bundle = await build({
  stdin: {
    contents: `import Page, { metadata } from './app/sukuyo/compatibility/page.js';
      export const page = Page().props.page;
      export { metadata };
      export { SEO_SERVICE_SCOPES } from './lib/seo-service-scope.js';
      export { relationFromForwardDistance } from './worker/lib/sukuyo-relation-core.js';`,
    resolveDir: process.cwd(),
  },
  bundle: true, write: false, platform: 'node', format: 'esm',
  loader: { '.js': 'jsx' }, jsx: 'automatic',
  plugins: [{
    name: 'page-data-only',
    setup(builder) {
      builder.onResolve({ filter: /components\/SeoLandingTemplate$/ }, () => ({ path: 'template', namespace: 'stub' }));
      builder.onResolve({ filter: /lib\/seo$/ }, () => ({ path: 'metadata', namespace: 'stub' }));
      builder.onLoad({ filter: /.*/, namespace: 'stub' }, ({ path }) => ({
        contents: path === 'template' ? 'export default function Template() {}' : 'export const buildSeoMetadata = value => value;',
      }));
    },
  }],
});
const { page, metadata, SEO_SERVICE_SCOPES, relationFromForwardDistance } = await import(
  'data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64')
);

test('compatibility landing distinguishes public guidance from the paid analysis', () => {
  assert.equal(page.path, '/sukuyo/compatibility');
  assert.equal(page.heroForm, null);
  assert.match(page.intro, /두 사람/);
  assert.match(page.intro, /별도 유료/);
  assert.doesNotMatch(metadata.title, /무료.*궁합/);
  assert.equal(metadata.description, page.description);
  assert.ok(page.steps.some(text => text.includes('유료 분석')));
  assert.match(SEO_SERVICE_SCOPES[page.path].paid, /기본 궁합·정밀 궁합/);
  assert.doesNotMatch(SEO_SERVICE_SCOPES['/sukuyo'].free, /두 사람/);
  assert.ok(page.faqs.slice(0, 5).some(faq => /별도 유료/.test(faq.answer)));
});

test('published 1/26-step example agrees with the relation engine', () => {
  const forward = relationFromForwardDistance(1);
  const reverse = relationFromForwardDistance(26);
  assert.equal(forward.relationType, '영친');
  assert.equal(reverse.relationType, forward.relationType);
  assert.equal(forward.aRole, '친');
  assert.equal(forward.bRole, '영');
  assert.equal(reverse.aRole, forward.bRole);
  assert.equal(reverse.bRole, forward.aRole);
  const article = page.sections.flatMap(section => section.paragraphs).join(' ');
  assert.match(article, /1칸.*26칸.*두 방향 모두 영친/);
  assert.match(article, /A 기준 내 역할은 친, 상대 역할은 영/);
  assert.match(article, /통계가 아닙니다/);
  assert.ok(page.faqs.some(faq => /역할만 뒤집힙니다/.test(faq.answer)));
});
