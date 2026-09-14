import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { renderFeatureDetailPanels } from '../../js/feature-detail-panels.mjs';

const catalog = JSON.parse(fs.readFileSync('public/feature-details/catalog.json', 'utf8'));
const sharedHero = '/feature-details/assets/feature-detail-shared-hero-v1-960.webp';
const shell = fs.readFileSync('index.html', 'utf8');

test('tile popup preserves the selected product art before hydration', () => {
  assert.ok(shell.includes("var imgSrc=(tileImage&&(tileImage.currentSrc||tileImage.getAttribute('src')))||d.img||'';"));
  assert.ok(shell.includes("_heroImg.removeAttribute('srcset')"));
});

test('editorial detail owns a complete readable palette and horizontal layout', () => {
  const css = fs.readFileSync('styles/feature-visual-detail.css', 'utf8');
  for (const token of ['--fortune-paper:', '--fortune-ink:', '--fortune-muted:', '--fortune-accent:']) assert.ok(css.includes(token));
  assert.ok(css.includes('prefers-reduced-motion'));
  assert.ok(!css.includes('writing-mode:vertical'));
});

test('published visual introductions have proven sources, real assets, and distinct destinations', () => {
  const generated = JSON.parse(fs.readFileSync('lib/marketing/feature-visual-details.generated.json', 'utf8'));
  assert.equal(generated.index.length, 72);
  assert.equal(new Set(generated.index.map(item => item.slug)).size, generated.index.length);
  assert.equal(catalog.length, 70);
  assert.equal(new Set(catalog.map(item => item.slug)).size, catalog.length);
  const artworkHashes = new Set();
  for (const entry of catalog) {
    const detail = JSON.parse(fs.readFileSync(`public/feature-details/${entry.slug}.json`, 'utf8'));
    assert.equal(detail.verification, 'verified');
    const hash = fs.readFileSync('public' + detail.image).toString('base64');
    assert.ok(!artworkHashes.has(hash), entry.slug + ': repeated product artwork');
    artworkHashes.add(hash);
    assert.ok(detail.image, `${entry.slug}: OG 대표 이미지가 없다`);
    assert.ok(detail.evidence.length);
    detail.evidence.forEach(source => assert.ok(fs.existsSync(source), source));
    for (const panel of detail.panels) if (panel.verifiedCapture) {
      assert.ok(fs.existsSync(`public${panel.verifiedCapture.src}`));
      assert.ok(panel.verifiedCapture.label.includes('예시'));
      assert.ok(panel.verifiedCapture.width > 0 && panel.verifiedCapture.height > 0);
    }
    for (const variant of detail.heroVariants || []) assert.ok(fs.statSync(`public${variant.src}`).size <= 180000);
    const rendered = renderFeatureDetailPanels(detail);
    assert.ok(rendered.includes(detail.headline));
    assert.ok(rendered.includes('src="' + detail.image + '"'), entry.slug + ': product art missing');
    assert.ok(!rendered.includes(sharedHero));
    if (detail.cardImage) assert.ok(fs.statSync('public' + detail.cardImage).size <= 50000);
    assert.ok(detail.benefits?.length, entry.slug + ': product benefits missing');
  }
  assert.ok(!catalog.find(item => item.slug === 'animal-destiny').aliases.includes('animal-destiny-unlock'), 'free route must not replace a separately locked feature');
  const animal = JSON.parse(fs.readFileSync('public/feature-details/animal-destiny.json', 'utf8'));
  assert.ok(animal.image, '동물 도감의 독립 소개 OG 대표 이미지가 없다');
  const face = JSON.parse(fs.readFileSync('public/feature-details/face-reading.json', 'utf8'));
  const registry = fs.readFileSync('app/_lib/serviceFeatureRegistry.ts', 'utf8');
  assert.match(registry, /slug: "face-reading"[\s\S]*detailRoute: "\/features\/face-reading"[\s\S]*launchRoute: "\/animal\/physio"/);
  assert.equal(face.href, '/animal/physio');
  assert.equal(face.ctaLabel, '무료로 동물 관상 보기');

  assert.deepEqual(Object.values(generated.items).filter(item => item.verification !== 'verified').map(item => item.slug).sort(), ['points', 'saju-animal']);
});

test('shared renderer escapes text and rejects unsafe image URLs and unverified content', () => {
  const detail = { verification: 'verified', title: '<script>x</script>', headline: '<img onerror=x>', description: '& private', image: 'javascript:x', panels: [{ title: 'safe', text: '<iframe>', verifiedCapture: { src: 'https://evil.example/a', alt: 'bad' } }] };
  const html = renderFeatureDetailPanels(detail);
  assert.ok(html.includes('&lt;img onerror=x&gt;'));
  assert.ok(!html.includes('<script') && !html.includes('<iframe') && !html.includes('javascript:') && !html.includes('evil.example'));
  assert.equal(renderFeatureDetailPanels({ ...detail, verification: 'source-inventory-only' }), '');
});

test('popup journey preserves image previews and escapes FAQ without adding checkout links', () => {
  for (const entry of catalog) {
    const detail = JSON.parse(fs.readFileSync(`public/feature-details/${entry.slug}.json`, 'utf8'));
    const html = renderFeatureDetailPanels(detail, { conversionPrompt: true });
    assert.match(html, /data-purchase-stage="awareness"/);
    assert.match(html, /data-feature-conversion-request/);
    assert.doesNotMatch(html, /onclick=|href="(?:https?:|javascript:|\/checkout|\/payment)/);
    for (const link of html.matchAll(/href="([^"]+)"/g)) assert.match(link[1], /^\/features\/[a-z0-9-]+\/$/);
    assert.doesNotMatch(renderFeatureDetailPanels(detail), /data-feature-conversion-request/);
    assert.doesNotMatch(html, /featureEditorial|핵심 흐름 미리보기/);
  }
  const html = renderFeatureDetailPanels({ verification: 'verified', journey: { questions: ['<img src=x onerror=x>'], trustNotes: ['<script>'], faq: [{ q: '<iframe>', a: '<svg onload=x>' }] }, panels: [] }, { conversionPrompt: true });
  assert.doesNotMatch(html, /<img|<script|<iframe|<svg/);
  assert.match(html, /&lt;svg onload=x&gt;/);
});

test('detail loader deduplicates per feature and retries failed fetches', async () => {
  const { loadFeatureDetail } = await import('../../js/feature-detail-panels.mjs?loader-test');
  let requests = 0, fail = true;
  const fetcher = async url => {
    requests++;
    if (url.endsWith('catalog.json')) return { ok: true, json: async () => [{ slug: 'tea', aliases: ['/tea/'] }] };
    if (fail) { fail = false; return { ok: false }; }
    return { ok: true, json: async () => ({ slug: 'tea', verification: 'verified' }) };
  };
  await assert.rejects(loadFeatureDetail(['/tea/'], fetcher));
  const [a, b] = await Promise.all([loadFeatureDetail(['/tea/'], fetcher), loadFeatureDetail(['tea'], fetcher)]);
  assert.equal(a, b);
  assert.equal(requests, 3);
  assert.equal(await loadFeatureDetail(['/missing/'], fetcher), null);
});
