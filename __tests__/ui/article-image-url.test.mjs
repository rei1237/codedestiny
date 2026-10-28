import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  entryPoints: ['lib/structured-data.ts'],
  bundle: true, write: false, platform: 'node', format: 'esm',
});
const { buildArticleJsonLd } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

test('Article image keeps asset filename while its page uses the canonical slash', () => {
  const article = buildArticleJsonLd({ title: '공개 분석 기록', description: '공개 원문 비교',
    path: '/insights/presidential-saju-public-records', image: '/og/presidential-public-records.png' });
  assert.equal(article.image, 'https://code-destiny.com/og/presidential-public-records.png');
  assert.equal(article.mainEntityOfPage, 'https://code-destiny.com/insights/presidential-saju-public-records/');
});

test('Article image preserves an external host and image transformation query', () => {
  const image = 'https://images.example.org/cover.webp?width=1200';
  assert.equal(buildArticleJsonLd({ title: '예시', description: '예시', path: '/insights/example', image }).image, image);
});
