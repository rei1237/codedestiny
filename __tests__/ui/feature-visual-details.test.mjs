import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { renderFeatureDetailPanels } from '../../js/feature-detail-panels.mjs';

const catalog = JSON.parse(fs.readFileSync('public/feature-details/catalog.json', 'utf8'));
const sharedHero = '/feature-details/assets/feature-detail-shared-hero-v1-960.webp';
const shell = fs.readFileSync('index.html', 'utf8');

test('tile popup preserves the selected product art before hydration', () => {
  assert.ok(shell.includes("var imgSrc=(tileImage&&(tileImage.currentSrc||tileImage.getAttribute('src')))||d.img||'';"));
  assert.ok(shell.includes("_heroImg.removeAttribute('srcset')"));
});

test('restored hero artwork, catalog reuse, and collection previews stay in sync', async () => {
  const { extractObjectLiteral } = await import('../../scripts/lib/feature-marketing-extract.mjs');
  const authored = extractObjectLiteral(shell, 'FEATURE_VISUAL_DETAILS');
  const marketing = extractObjectLiteral(shell, 'FEATURE_MARKETING_COPY');
  const generated = JSON.parse(fs.readFileSync('lib/marketing/feature-visual-details.generated.json', 'utf8'));
  const fragment = JSDOM.fragment(shell);
  const clean = value => String(value || '').replace(/\/$/, '');
  const verified = Object.values(generated.items).filter(item => item.verification === 'verified');
  const wrappers = [...fragment.querySelectorAll('.tarot-tile__img-wrap')];
  let mappedCards = 0;

  assert.equal(wrappers.length, 62);
  for (const wrapper of wrappers) {
    const tile = wrapper.closest('.tarot-tile');
    const attr = name => tile?.getAttribute(name);
    const candidates = [
      attr('data-feature-key'), attr('data-tile-lock-key'), attr('data-action'), attr('data-cd-service-id'),
      attr('data-service-detail-href'), attr('data-fallback-href'), attr('href'), attr('id'),
    ].filter(Boolean);
    let slug = '';
    let expected = '';
    if (attr('data-feature-key') === 'life-fortune-ai-consultation') {
      slug = 'life-fortune-report';
      expected = '/images/feature-details/life-fortune-report-480.webp';
    } else if (attr('data-feature-key') === 'animal-destiny-unlock') {
      slug = 'animal-guardian-unlock';
      expected = '/images/feature-details/animal-guardian-unlock-480.webp';
    } else {
      let detail = null;
      for (const candidate of candidates) {
        detail = verified.find(item => [item.slug, item.href, ...(item.aliases || [])].some(key => clean(key) === clean(candidate)));
        if (detail) break;
      }
      if (detail) {
        slug = detail.slug;
        expected = detail.cardImage || detail.image;
      }
    }
    if (!expected) continue;
    mappedCards++;
    assert.equal(wrapper.getAttribute('data-img-src'), expected, `${slug}: collection preview is stale`);
    const staticImage = wrapper.querySelector('img');
    if (staticImage) assert.equal(staticImage.getAttribute('src'), expected, `${slug}: static and deferred previews differ`);
  }
  assert.equal(mappedCards, 47);
  assert.equal(wrappers.length - mappedCards, 15);

  const restored = {
    'fortune-tea-house': '/images/fortune-tea-house/premium-tea-house-desktop.webp',
    'master-love-codex': '/images/feature-details/master-love-codex-hero-v1.webp',
    'neo-operation-room': '/images/feature-details/neo-operation-room-hero-v1.webp',
  };
  for (const [slug, image] of Object.entries(restored)) {
    assert.equal(authored[slug].image, image);
    assert.match(authored[slug].catalogImage, new RegExp(`${slug}-hero-v2\\.webp$`));
    assert.equal(generated.items[slug].catalogImage, `/feature-details/assets/${slug}-catalog-320.webp`);
    assert.ok(fs.existsSync(`public${generated.items[slug].catalogImage}`));
  }
  assert.equal(marketing['/fortune-tea-house/'].outlineImage, restored['fortune-tea-house']);
  assert.equal(authored['fortune-chat'].image, '/images/fortune-tea-house/yeon-peony-crown.webp');
  assert.match(authored.novel.image, /novel-hero-v2\.webp$/);
  assert.match(authored.music.image, /music-hero-v2\.webp$/);

  const upgraded = {
    'life-book-ai': '/images/expert-consulting/life-book-cover-20260923.webp',
    'love-secret-ai': '/images/expert-consulting/love-letter-paper-20260923.webp',
    'new-year-ai': '/images/feature-details/new-year-ai-hero-v3.png',
  };
  for (const [slug, image] of Object.entries(upgraded)) {
    const detail = authored[slug];
    assert.equal(detail.image, image, `${slug}: authored hero does not match the approved slot`);
    assert.ok(detail.contents.length >= 5 && detail.contents.every(item => item.detail), `${slug}: outline is incomplete`);
    assert.ok(detail.storySections?.length, `${slug}: supporting editorial story is missing`);
    assert.equal(detail.journey?.questions?.length, 3, `${slug}: journey questions are incomplete`);
    assert.equal(detail.journey?.faq?.length, 3, `${slug}: FAQ is incomplete`);
    assert.ok(detail.method?.title && detail.method?.text && detail.method?.inputs?.length, `${slug}: method is incomplete`);
    const preview = generated.items[slug].cardImage;
    assert.equal(preview, `/feature-details/assets/${slug}-320.webp`);
    assert.ok(fs.existsSync(`public${preview}`));
  }

  const signatureSources = Object.fromEntries([...fragment.querySelectorAll('[data-cd-service-id]')].map(card => [card.getAttribute('data-cd-service-id'), card.querySelector('img')?.getAttribute('src') || '']));
  assert.match(signatureSources['master-love-codex'], /%EB%A7%88%EC%8A%A4%ED%84%B0%20%EC%9A%B4%EB%AA%85%20%EC%97%B0%EC%95%A0%20%EB%B9%84%EC%B1%85\.webp$/);
  assert.match(signatureSources['fortune-tea-house'], /DestinyCafe\/%EC%9A%B4%EB%AA%85%EC%9D%98%20%EC%B0%BB%EC%A7%91\.webp$/);
  assert.match(signatureSources['neo-operation-room'], /DestinyWar\/%EB%84%A4%EC%98%A4%EC%9D%98%20%ED%8C%A9%ED%8F%AD%20%EC%9A%B4%EB%AA%85%20%EC%9E%91%EC%A0%84%EC%8B%A4\.webp$/);
  assert.match(fragment.querySelector('.moon-story-entry__poster img')?.getAttribute('src') || '', /CodeDestinyNovel\/%EB%9D%BC%EC%9D%B4%ED%8A%B8%20%EB%85%B8%EB%B2%A8\.webp$/);
  assert.match(fragment.querySelector('.moon-music-entry__cover-stack img')?.getAttribute('src') || '', /CodeDestinyNovel\/%EC%9D%8C%EC%95%85%20%ED%94%8C%EB%A0%88%EC%9D%B4%EC%96%B4\.webp$/);
});

test('music entry responds to its card width without clipping actions', () => {
  assert.match(shell, /#cdhMusicSlot\s*\{[\s\S]*container:\s*moon-music-slot\s*\/\s*inline-size/);
  assert.match(shell, /@container moon-music-slot \(max-width: 720px\)[\s\S]*?\.moon-music-entry__actions\s*\{[\s\S]*?grid-column:\s*1\s*\/\s*-1/);
  assert.match(shell, /@container moon-music-slot \(max-width: 720px\)[\s\S]*?\.moon-music-entry__meta\s*\{[^}]*flex-wrap:\s*wrap/);
});

test('editorial detail owns a complete readable palette and horizontal layout', () => {
  const css = fs.readFileSync('styles/feature-visual-detail.css', 'utf8');
  for (const token of ['--fortune-paper:', '--fortune-ink:', '--fortune-muted:', '--fortune-accent:']) assert.ok(css.includes(token));
  assert.ok(css.includes('prefers-reduced-motion'));
  assert.ok(!css.includes('writing-mode:vertical'));
});

test('published visual introductions have proven sources, real assets, and distinct destinations', () => {
  const generated = JSON.parse(fs.readFileSync('lib/marketing/feature-visual-details.generated.json', 'utf8'));
  assert.equal(generated.index.length, 76);
  assert.equal(new Set(generated.index.map(item => item.slug)).size, generated.index.length);
  assert.equal(catalog.length, 74);
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
    assert.doesNotMatch(html, /onclick=|href="(?:javascript:|\/checkout|\/payment)/);
    const founderLinks = new Set(detail.founder ? ['/about/#author', ...JSON.parse(fs.readFileSync('lib/brand/prediction-records.json', 'utf8')).map(record => record.url)] : []);
    for (const link of html.matchAll(/href="([^"]+)"/g)) {
      if (!founderLinks.has(link[1])) assert.match(link[1], /^\/features\/[a-z0-9-]+\/$/);
    }
    assert.doesNotMatch(renderFeatureDetailPanels(detail), /data-feature-conversion-request/);
    assert.doesNotMatch(html, /featureEditorial|핵심 흐름 미리보기/);
  }
  const html = renderFeatureDetailPanels({ verification: 'verified', journey: { questions: ['<img src=x onerror=x>'], trustNotes: ['<script>'], faq: [{ q: '<iframe>', a: '<svg onload=x>' }] }, panels: [] }, { conversionPrompt: true });
  assert.doesNotMatch(html, /<img|<script|<iframe|<svg/);
  assert.match(html, /&lt;svg onload=x&gt;/);
});

test('premium introductions reuse founder evidence and contain complete portrait artwork', async () => {
  const { loadTsModule } = await import('../../scripts/lib/load-ts-module.mjs');
  const founder = loadTsModule('lib/brand/founder.ts').founder;
  const records = JSON.parse(fs.readFileSync('lib/brand/prediction-records.json', 'utf8'));
  for (const [slug, material] of [['life-book-ai', 'book'], ['love-secret-ai', 'letter']]) {
    const detail = JSON.parse(fs.readFileSync(`public/feature-details/${slug}.json`, 'utf8'));
    assert.equal(detail.material, material);
    assert.deepEqual(detail.founder, { ...founder, records });
    const fragment = JSDOM.fragment(renderFeatureDetailPanels(detail));
    const portrait = fragment.querySelector('.fortuneObject img');
    assert.ok(Number(portrait.getAttribute('height')) > Number(portrait.getAttribute('width')));
    assert.equal(fragment.querySelector('.fortuneObject figcaption').textContent, detail.title);
    assert.equal(fragment.querySelectorAll('.fortuneFounder time').length, records.length);
    for (const link of fragment.querySelectorAll('.fortuneFounder a[target]')) assert.equal(link.rel, 'noopener noreferrer');
  }
  const unsafe = renderFeatureDetailPanels({ verification: 'verified', founder: { credential: '<img>', records: [{ url: 'javascript:alert(1)', title: '<script>' }] } });
  assert.doesNotMatch(unsafe, /javascript:|<img>|<script>/);
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

test('inline unlock products have individual optimized artwork and preserve their local controller boundary', async () => {
  const { extractObjectLiteral } = await import('../../scripts/lib/feature-marketing-extract.mjs');
  const inline = Object.values(extractObjectLiteral(shell, 'FEATURE_VISUAL_DETAILS')).filter(item => item.inlineAliases);
  assert.equal(inline.length, 11);
  assert.equal(new Set(inline.map(item=>item.image)).size, 11);
  for (const item of inline) {
    assert.equal(item.verification, 'verified');
    assert.ok(item.contents.length && item.benefits.length, item.slug);
    assert.ok(!item.sourceAction, 'do not invent a launch route for an inline unlock');
    for (const image of item.heroVariants) assert.ok(fs.statSync('public'+image.src).size <= 180000);
    assert.ok(!renderFeatureDetailPanels(item, {conversionPrompt:true}).includes('data-feature-share="native"'));
  }
});

test('every priced marketing introduction resolves to a published or inline editorial product', async () => {
  const { extractObjectLiteral } = await import('../../scripts/lib/feature-marketing-extract.mjs');
  const { FEATURE_KEY_PRICE_TABLE } = await import('../../worker/lib/paid-feature-registry.js');
  const copy = extractObjectLiteral(shell, 'FEATURE_MARKETING_COPY');
  const inline = Object.values(extractObjectLiteral(shell, 'FEATURE_VISUAL_DETAILS')).filter(item => item.inlineAliases);
  for (const [key, item] of Object.entries(copy)) {
    if (!FEATURE_KEY_PRICE_TABLE[item.featureId]) continue;
    assert.ok(catalog.some(entry=>entry.featureKey===item.featureId || entry.aliases.includes(key)) || inline.some(entry=>entry.inlineAliases.includes(key) || entry.inlineAliases.includes(item.featureId)), key+': paid introduction missing');
  }
});
