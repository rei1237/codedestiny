import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { renderFeatureDetailPanels } from '../../js/feature-detail-panels.mjs';

const catalog = JSON.parse(fs.readFileSync('public/feature-details/catalog.json', 'utf8'));
test('published visual introductions have proven sources, real assets, and distinct destinations', () => {
  const generated = JSON.parse(fs.readFileSync('lib/marketing/feature-visual-details.generated.json', 'utf8'));
  assert.equal(generated.index.length, 65);
  assert.equal(new Set(generated.index.map(item => item.slug)).size, generated.index.length);
  assert.equal(catalog.length, 63);
  assert.equal(new Set(catalog.map(item => item.slug)).size, catalog.length);
  for (const entry of catalog) {
    const detail = JSON.parse(fs.readFileSync(`public/feature-details/${entry.slug}.json`, 'utf8'));
    assert.equal(detail.verification, 'verified');
    assert.ok(detail.image, `${entry.slug}: OG 대표 이미지가 없다`);
    assert.ok(detail.evidence.length);
    detail.evidence.forEach(source => assert.ok(fs.existsSync(source), source));
    for (const panel of detail.panels) if (panel.verifiedCapture) {
      assert.ok(fs.existsSync(`public${panel.verifiedCapture.src}`));
      assert.ok(panel.verifiedCapture.label.includes('예시'));
      assert.ok(panel.verifiedCapture.width > 0 && panel.verifiedCapture.height > 0);
    }
    for (const variant of detail.heroVariants || []) assert.ok(fs.statSync(`public${variant.src}`).size <= 180000);
    assert.ok(renderFeatureDetailPanels(detail).includes(detail.journey?.questions?.[0] || detail.headline));
  }
  assert.ok(!catalog.find(item => item.slug === 'animal-destiny').aliases.includes('animal-destiny-unlock'), 'free route must not replace a separately locked feature');
  const neo = JSON.parse(fs.readFileSync('public/feature-details/neo-operation-room.json', 'utf8'));
  assert.equal(neo.panels[0].visualPreview, 'neo');
  assert.match(renderFeatureDetailPanels(neo), /한 가지 지도로/);
  assert.doesNotMatch(renderFeatureDetailPanels(neo), /개발용 예시|개인 결과/);
  for (const [slug, preview] of Object.entries({ saju: 'saju', ziwei: 'ziwei', sukyo: 'sukuyo', vedic: 'vedic', astrology: 'astrology' })) {
    const detail = JSON.parse(fs.readFileSync(`public/feature-details/${slug}.json`, 'utf8'));
    assert.equal(detail.panels[0].visualPreview, preview, `${slug}: 체계별 SVG/HTML 미리보기가 없다`);
    assert.doesNotMatch(renderFeatureDetailPanels(detail), /개발용 예시|개인 결과/, `${slug}: 내부 검증 문구가 노출됐다`);
  }
  for (const [slug, preview] of Object.entries({ 'tarot-love-relationship': 'tarot-love', 'tarot-reunion': 'tarot-reunion', 'tarot-mindscan': 'tarot-mindscan' })) {
    const detail = JSON.parse(fs.readFileSync(`public/feature-details/${slug}.json`, 'utf8'));
    assert.equal(detail.panels[0].visualPreview, preview, `${slug}: 관계별 SVG/HTML 미리보기가 없다`);
    assert.doesNotMatch(renderFeatureDetailPanels(detail), /개발용 예시|개인 결과/, `${slug}: 내부 검증 문구가 노출됐다`);
  }
  for (const [slug, preview] of Object.entries({ 'master-love-codex': 'master-codex', 'love-simulation': 'love-code', 'nakshatra-compat': 'nakshatra-compat' })) {
    const detail = JSON.parse(fs.readFileSync(`public/feature-details/${slug}.json`, 'utf8'));
    assert.equal(detail.panels[0].visualPreview, preview, `${slug}: 궁합 기능별 SVG/HTML 미리보기가 없다`);
    assert.doesNotMatch(renderFeatureDetailPanels(detail), /개발용 예시|개인 결과/, `${slug}: 내부 검증 문구가 노출됐다`);
  }
  const animal = JSON.parse(fs.readFileSync('public/feature-details/animal-destiny.json', 'utf8'));
  assert.ok(animal.image, '동물 도감의 독립 소개 OG 대표 이미지가 없다');
  const face = JSON.parse(fs.readFileSync('public/feature-details/face-reading.json', 'utf8'));
  const registry = fs.readFileSync('app/_lib/serviceFeatureRegistry.ts', 'utf8');
  assert.match(registry, /slug: "face-reading"[\s\S]*detailRoute: "\/features\/face-reading"[\s\S]*launchRoute: "\/animal\/physio"/);
  assert.equal(face.href, '/animal/physio');
  assert.equal(face.ctaLabel, '무료로 동물 관상 보기');
  assert.equal(face.panels[0].previewTone, '상징·마음');
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
    assert.doesNotMatch(html, /상세페이지 새 화면에서 보기|href=|onclick=/);
    assert.doesNotMatch(renderFeatureDetailPanels(detail), /data-feature-conversion-request/);
    for (const panel of detail.panels) {
      if (panel.visualPreview) assert.match(html, /featureEditorial/);
    }
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
