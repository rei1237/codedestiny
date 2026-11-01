import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  entryPoints: ['lib/seo/page-open-graph.ts'],
  bundle: true, write: false, platform: 'node', format: 'esm',
});
const { ROOT_OPEN_GRAPH, pageOpenGraph } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

test('pageOpenGraph keeps every root default and adds only the canonical url', () => {
  const url = 'https://code-destiny.com/consultation-samples/';
  const og = pageOpenGraph(url);
  assert.deepEqual(og, { ...ROOT_OPEN_GRAPH, url });
  assert.equal(og.type, 'website');
  assert.equal(og.locale, 'ko_KR');
  assert.equal(og.siteName, '꿀꿀 운세');
  assert.deepEqual(og.images.map(({ width, height }) => [width, height]), [[1200, 630]]);
  assert.match(og.images[0].url, /^https:\/\/code-destiny\.com\/og\//);
});

test('root defaults carry no page title, description or url', () => {
  assert.deepEqual(Object.keys(ROOT_OPEN_GRAPH).sort(), ['images', 'locale', 'siteName', 'type']);
});

test('a page cannot change the shared image list through its own openGraph', () => {
  pageOpenGraph('https://code-destiny.com/a/').images[0].alt = 'changed';
  assert.notEqual(ROOT_OPEN_GRAPH.images[0].alt, 'changed');
});
