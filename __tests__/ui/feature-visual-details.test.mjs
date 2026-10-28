import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { renderFeatureDetailPanels } from '../../js/feature-detail-panels.mjs';
import { getBillingFeaturePricing } from '../../worker/lib/billing-feature-registry.js';

const catalog = JSON.parse(fs.readFileSync('public/feature-details/catalog.json', 'utf8'));
const sharedHero = '/feature-details/assets/feature-detail-shared-hero-v1-960.webp';
const shell = fs.readFileSync('index.html', 'utf8');
const introductionArt = JSON.parse(fs.readFileSync('lib/marketing/service-introduction-art.json','utf8'));
// Registry discovery is not editorial publication. Keep this explicit so newly
// discovered services cannot silently become verified product introductions.
const inventoryOnlySlugs = ['career-style', 'love-code', 'neo-consultation', 'points', 'saju-animal', 'saju-compatibility', 'saju-fpti'];
const inventoryOnlyPaidRoutes = {
  '/saju/compatibility/': { slug: 'saju-compatibility', featureKey: 'compat-saju-compatibility', source: 'app/saju/compatibility/page.js' },
  '/neo-consultation/': { slug: 'neo-consultation', featureKey: 'neo-email-consultation', source: 'app/neo-consultation/page.tsx' },
};

test('paid introductions keep an honest sample in the authored essay or before the legacy outline', () => {
  let checked = 0;
  for (const entry of catalog) {
    // A free calculator may expose a paid extension under the same billing key.
    if (entry.accessType === 'free') continue;
    const billing = getBillingFeaturePricing({ featureKey: entry.featureKey });
    if (!billing.ok && entry.accessType !== 'paid') continue;
    const detail = JSON.parse(fs.readFileSync(`public/feature-details/${entry.slug}.json`, 'utf8'));
    assert.ok(detail.sample?.text, `${entry.slug}: paid introduction needs a sample`);
    const fragment = JSDOM.fragment(renderFeatureDetailPanels(detail));
    const article = fragment.querySelector('article');
    if (detail.crafted?.length) {
      const essays = [...fragment.querySelectorAll('.craftedDetail')];
      assert.equal(essays.length, detail.crafted.length, `${entry.slug}: every authored edition must be available`);
      detail.crafted.forEach((essay, index) => {
        const resultPanels = essay.panels.filter(panel => panel.sampleKind === 'result');
        if (resultPanels.length) {
          for (const panel of resultPanels) {
            assert.match(panel.text, /가상 프로필|가상 입력/, essay.id + ': generated input is disclosed');
            assert.ok(panel.sourceUrl.startsWith('https://claude.ai/artifact/'), essay.id + ': reviewed source is retained');
            assert.ok(essays[index].querySelector('[data-example-kind="result"]'), essay.id + ': result kind is rendered');
          }
        } else {
        assert.ok(essay.panels.some(panel => /(?:편집 예시|가상(?: 활용)? 예시)/.test(panel.text)), `${essay.id}: illustrative sample is labeled`);
        }
        assert.match(essays[index].querySelector('.craftedDetailNotice').textContent, /예시/);
        if (essay.layout === 'editorial') {
          assert.equal(essays[index].querySelectorAll(':scope > header > img').length, 1);
          assert.equal(essays[index].querySelector('.craftedDetailTranscript'), null);
          for (const panel of essay.panels) assert.ok(essays[index].textContent.includes(panel.title));
          assert.equal(essays[index].querySelectorAll('.craftedMaster').length, essay.masters.length);
          return;
        }
        const sceneCover=essay.panels.some(panel=>panel.textBelowImage);
        const images=[...essays[index].querySelectorAll(sceneCover ? ':scope > div > img' : ':scope > div[aria-hidden] img')];
        assert.equal(images.length, essay.panels.length);
        images.forEach((image,i)=>assert.equal(image.getAttribute('alt'),essay.panels[i].textBelowImage ? essay.panels[i].alt : ''));
        if(sceneCover){
          const copy=essays[index].querySelector('.craftedCoverCopy');
          assert.ok(copy.textContent.includes(essay.panels[0].title));
          assert.equal(copy.querySelector('p').textContent, essays[index].querySelector('.craftedDetailTranscript section p').textContent);
        }
        for (const panel of essay.panels) assert.ok(essays[index].querySelector('.craftedDetailTranscript').textContent.includes(panel.title));
      });
      assert.ok(article.querySelector('[data-fortune-hero-action]'), 'existing conversion slot is preserved');
      checked++;
      continue;
    }
    assert.ok(article.children[1].classList.contains('fortuneSample'), `${entry.slug}: sample must follow hero`);
    assert.match(fragment.querySelector('.fortuneSampleNote').textContent, /예시/);
    assert.ok(fragment.querySelector('.fortuneSamplePage').textContent.includes(detail.sample.text));
    checked++;
  }
  assert.ok(checked > 20, 'billing-backed coverage unexpectedly empty');
});

test('human consultation testimonials are identified separately from AI product results', () => {
  const detail = JSON.parse(fs.readFileSync('public/feature-details/life-book-ai.json', 'utf8'));
  const fragment = JSDOM.fragment(renderFeatureDetailPanels(detail));
  const notice = fragment.querySelector('.craftedDetailNotice');
  assert.match(notice.textContent, /과거 직접 1:1 상담 후기/);
  assert.match(notice.textContent, /디지털 상품의 구매 후기가 아닙니다/);
});

test('authored introductions escape transcript text and retain only safe image locations', () => {
  const fragment = JSDOM.fragment(renderFeatureDetailPanels({verification:'verified',title:'test',crafted:[{title:'test',notice:'<script>bad</script>',panels:[{title:'<img src=x onerror=bad()>',text:'<b>example</b>',src:'javascript:alert(1)'},{title:'Safe title',text:'<b>example</b>',src:'/safe.webp'}]}]}));
  assert.equal(fragment.querySelectorAll('img').length,1);
  assert.equal(fragment.querySelector('script'),null);
  assert.equal(fragment.querySelector('.craftedDetailTranscript b'),null);
  assert.match(fragment.querySelector('.craftedDetailTranscript').textContent, /<b>example<\/b>/);
});

test('representative introductions open as product cards with real chapters, uncropped art and lazy panels', () => {
  const detail = JSON.parse(fs.readFileSync('public/feature-details/fortune-tea-house.json', 'utf8'));
  const fragment = JSDOM.fragment(renderFeatureDetailPanels(detail));
  const hero = fragment.querySelector('.craftedHero .craftedHeroArt');
  assert.equal(`${hero.getAttribute('width')}x${hero.getAttribute('height')}`, `${detail.imageWidth}x${detail.imageHeight}`);
  assert.equal(hero.dataset.lcpCandidate, '1');
  const cards = [...fragment.querySelectorAll('details.craftedEdition[data-crafted-card]')];
  assert.equal(cards.length, detail.crafted.length);
  cards.forEach((card, index) => {
    assert.equal(card.querySelector('summary strong').textContent, detail.crafted[index].title.split(' · ')[1]);
    const price = getBillingFeaturePricing({featureKey:detail.crafted[index].featureKey}).pricing.amountKRW.toLocaleString('ko-KR') + '원';
    assert.match(card.querySelector('.craftedCardMeta').textContent, new RegExp(`마스터 소개 · 풀이 안내 · ${price}$`));
    assert.ok([...card.querySelectorAll('.craftedDetail img')].every(image => image.getAttribute('loading') === 'lazy'));
  });
  assert.ok(fragment.querySelector('.consultation-guide') && fragment.querySelector('.fortuneBenefits'), 'shared readable guide and existing benefits remain available');
  assert.equal(fragment.querySelector('.fortuneSample'), null, 'shared guide replaces the duplicate short sample');
  const single = JSDOM.fragment(renderFeatureDetailPanels({verification:'verified',title:'t',crafted:[{title:'t',notice:'예시',badge:'추가 질문 1회 포함',chapters:[{title:'첫 장',detail:'<b>근거</b>'},{title:'둘째 장'}],panels:[{title:'p',text:'p',src:'/p.webp'}]}]}));
  assert.equal(single.querySelector('.craftedBadge').textContent, '추가 질문 1회 포함');
  assert.deepEqual([...single.querySelectorAll('.craftedChapters li strong')].map(node => node.textContent), ['첫 장', '둘째 장']);
  assert.equal(single.querySelector('.craftedChapters b'), null);
  assert.equal(single.querySelector('.craftedEditionsLead').textContent, '목차 2개 · 그림 안내 1장');
  const plain = JSON.parse(fs.readFileSync('public/feature-details/astrology-ai.json', 'utf8'));
  const art = JSDOM.fragment(renderFeatureDetailPanels(plain)).querySelector('.featureDetailHero .featureDetailArt, .featureDetailHero .craftedHeroArt');
  assert.equal(`${art.getAttribute('width')}x${art.getAttribute('height')}`, `${plain.imageWidth}x${plain.imageHeight}`);
  const artRules = fs.readFileSync('styles/feature-visual-detail.css', 'utf8').match(/\.featureDetailArt\{[^}]*\}/g);
  assert.ok(artRules.every(rule => !/aspect-ratio|object-fit|object-position|height:100%/.test(rule)), 'non-authored hero keeps its own ratio');
});

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

  assert.equal(wrappers.length, 56);
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
      slug = 'life-fortune-ai';
      expected = introductionArt[slug].cardImage;
    } else if (attr('data-feature-key') === 'animal-destiny-unlock') {
      slug = 'animal-destiny';
      expected = introductionArt[slug].cardImage;
    } else {
      let detail = null;
      for (const candidate of candidates) {
        detail = verified.find(item => [item.slug, item.href, ...(item.aliases || [])].some(key => clean(key) === clean(candidate)));
        if (detail) break;
      }
      if (detail) {
        slug = detail.slug;
        expected = introductionArt[detail.slug]?.cardImage || detail.cardImage || detail.image;
        if (detail.slug === 'nakshatra') {
          const img = wrapper.querySelector('img');
          assert.match(img?.getAttribute('srcset') || '', /640w/);
          assert.ok(img?.getAttribute('sizes'));
        }
      }
    }
    if (!expected) continue;
    mappedCards++;
    assert.equal(wrapper.getAttribute('data-img-src'), expected, `${slug}: collection preview is stale`);
    const staticImage = wrapper.querySelector('img');
    if (staticImage) assert.equal(staticImage.getAttribute('src'), expected, `${slug}: static and deferred previews differ`);
  }
  assert.equal(mappedCards, 47);
  assert.equal(wrappers.length - mappedCards, 9);

  const restored = {
    'fortune-tea-house': '/images/fortune-tea-house/premium-tea-house-desktop.webp',
    'master-love-codex': '/images/feature-details/master-love-codex-hero-v1.webp',
    'neo-operation-room': '/images/feature-details/neo-operation-room-hero-v2-textless.webp',
    omikuji: '/fuctionassets/오미쿠지.webp',
  };
  for (const slug of Object.keys(restored)) {
    assert.equal(generated.items[slug].image, `/feature-details/assets/${slug}-960.webp`);
    assert.ok(fs.existsSync(`public${introductionArt[slug].image}`));
    assert.equal(generated.items[slug].catalogImage, `/feature-details/assets/${slug}-catalog-320.webp`);
    assert.ok(fs.existsSync(`public${generated.items[slug].catalogImage}`));
  }
  assert.equal(marketing['/fortune-tea-house/'].outlineImage, introductionArt['fortune-tea-house'].image);
  assert.equal(authored['fortune-chat'].image, introductionArt['fortune-chat'].image);
  assert.match(authored.novel.image, /novel-hero-v2\.webp$/);
  assert.match(authored.music.image, /music-hero-v2\.webp$/);

  const upgraded = {
    'life-book-ai': '/images/expert-consulting/life-book-cover-20260923.webp',
    'love-secret-ai': '/images/expert-consulting/love-letter-paper-20260923.webp',
    'new-year-ai': '/images/feature-details/new-year-ai-hero-v3.webp',
  };
  for (const slug of Object.keys(upgraded)) {
    const detail = authored[slug];
    assert.equal(generated.items[slug].image, `/feature-details/assets/${slug}-960.webp`);
    assert.ok(detail.contents.length >= 5 && detail.contents.every(item => item.detail), `${slug}: outline is incomplete`);
    assert.ok(detail.storySections?.length, `${slug}: supporting editorial story is missing`);
    assert.equal(detail.journey?.questions?.length, 3, `${slug}: journey questions are incomplete`);
    assert.equal(detail.journey?.faq?.length, 3, `${slug}: FAQ is incomplete`);
    assert.ok(detail.method?.title && detail.method?.text && detail.method?.inputs?.length, `${slug}: method is incomplete`);
    const preview = generated.items[slug].cardImage;
    assert.equal(preview, `/feature-details/assets/${slug}-320.webp`);
    assert.ok(fs.existsSync(`public${preview}`));
  }

  const signatureSources = Object.fromEntries([...fragment.querySelectorAll('#cdSignatureConsult [data-cd-service-id]')].map(card => [card.getAttribute('data-cd-service-id'), card.querySelector('img')?.getAttribute('src') || '']));
  const signatureArtwork = {
    'neo-operation-room': '/images/feature-details/neo-operation-room-hero-v2-textless.webp',
    'fortune-tea-house': '/images/home/yeoni-tea-together-v1-1200.webp',
    'master-love-codex': '/images/feature-details/master-love-codex-hero-v3.webp',
    // 대표 상담 3종은 상품 마스터(연이·서한비 / 네오 / 윤달)가 등장하는 전용 키 아트다.
    'love-secret-ai': '/images/home/love-secret-masters-v1-1200.webp',
    'new-year-ai': '/images/home/new-year-neo-v1-1200.webp',
    'life-book-ai': '/images/home/life-book-yun-v2-1200.webp',
  };
  const expectedSignature=Object.fromEntries(Object.keys(signatureArtwork).map(id=>[id,introductionArt[id].image.replace('.webp','-640.webp')]));
  assert.deepEqual(signatureSources, expectedSignature);
  for (const [id, source] of Object.entries(expectedSignature)) {
    assert.ok(fs.existsSync(`public${source}`), `${id}: referenced signature artwork is missing`);
  }
  const masterAssets = fs.readFileSync('src/features/master-love-codex/data/assets.ts', 'utf8');
  assert.match(masterAssets, /humanHero:\s*"\/images\/service-introductions\/master-love-codex-960\.webp"/);
  assert.match(masterAssets, /cover:\s*"\/feature-details\/assets\/master-love-codex-960\.webp"/);
  assert.ok(fs.existsSync('public/feature-details/assets/master-love-codex-960.webp'));
  // 2026-10-17: 라이트 노벨·달빛 음악은 '달빛 이야기' 한 묶음(details)에 타로 카드 두 장으로 들어갔다.
  assert.ok(fragment.querySelector('.cdh-story .cdh-story__card[href="/codedestiny-novel.html"]'), 'light novel card stays on the home');
  assert.ok(fragment.querySelector('.cdh-story .cdh-story__card[href="/music/"]'), 'music card stays on the home');
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
  assert.equal(generated.index.length, catalog.length + inventoryOnlySlugs.length);
  assert.equal(new Set(generated.index.map(item => item.slug)).size, generated.index.length);
  assert.equal(catalog.length, 73);
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
    if (detail.crafted?.length) {
      for (const essay of detail.crafted) for (const [index,panel] of essay.panels.entries()) {
        if(essay.layout!=='editorial'||index===0||panel.showImage)assert.ok(rendered.includes('src="' + panel.src + '"'), entry.slug + ': authored artwork missing');
        assert.ok(fs.statSync('public' + panel.src).size > 0, panel.src);
        assert.ok(rendered.includes(panel.title), panel.title);
      }
    } else {
      assert.ok(rendered.includes(detail.headline));
      assert.ok(rendered.includes('src="' + detail.image + '"'), entry.slug + ': product art missing');
    }
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

  assert.deepEqual(Object.values(generated.items).filter(item => item.verification !== 'verified').map(item => item.slug).sort(), inventoryOnlySlugs);
  assert.deepEqual(catalog.map(item => item.slug).sort(), generated.index.filter(item => item.verification === 'verified').map(item => item.slug).sort());
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
    const founderLinks = new Set(detail.founder ? ['/about/#author', '/yeongnyangi/#founder-records'] : []);
    for (const link of html.matchAll(/href="([^"]+)"/g)) {
      if (detail.consultationGuide && link[1] === 'https://claude.ai/artifact/PtPUfhaiHM37ebpxtr4nQV') continue;
      if (!founderLinks.has(link[1])) assert.match(link[1], /^\/features\/[a-z0-9-]+\/$/);
    }
    assert.doesNotMatch(renderFeatureDetailPanels(detail), /data-feature-conversion-request/);
    assert.doesNotMatch(html, /featureEditorial|핵심 흐름 미리보기/);
  }
  const html = renderFeatureDetailPanels({ verification: 'verified', journey: { questions: ['<img src=x onerror=x>'], trustNotes: ['<script>'], faq: [{ q: '<iframe>', a: '<svg onload=x>' }] }, panels: [] }, { conversionPrompt: true });
  assert.doesNotMatch(html, /<img|<script|<iframe|<svg/);
  assert.match(html, /&lt;svg onload=x&gt;/);
});

test('authored premium introductions retain founder provenance and complete portrait panels', async () => {
  const { loadTsModule } = await import('../../scripts/lib/load-ts-module.mjs');
  const founder = loadTsModule('lib/brand/founder.ts').founder;
  for (const [slug, material] of [['life-book-ai', 'book'], ['love-secret-ai', 'letter']]) {
    const detail = JSON.parse(fs.readFileSync(`public/feature-details/${slug}.json`, 'utf8'));
    assert.equal(detail.crafted[0].layout, 'editorial');
    assert.deepEqual(detail.founder, { credential: founder.credential, method: founder.method });
    const fragment = JSDOM.fragment(renderFeatureDetailPanels(detail));
    const portraits = [...fragment.querySelectorAll('.craftedEditorial > header > img')];
    assert.equal(portraits.length,1);
    assert.ok(portraits.every(image => Number(image.getAttribute('width')) > Number(image.getAttribute('height'))));
    assert.ok(fragment.querySelector('.craftedEditorialSection'));
    assert.match(fragment.querySelector('.craftedDetail').textContent, /AI/);
    assert.match(fragment.querySelector('.craftedDetail').textContent, /사람이 결과마다 직접/);
  }
  const unsafe = renderFeatureDetailPanels({ verification: 'verified', founder: { credential: '<img>', method: '<script>' } });
  assert.match(unsafe, /&lt;img&gt;/);
  assert.doesNotMatch(unsafe, /<img>|<script>/);
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
  const generated = JSON.parse(fs.readFileSync('lib/marketing/feature-visual-details.generated.json', 'utf8'));
  for (const [key, item] of Object.entries(copy)) {
    if (!FEATURE_KEY_PRICE_TABLE[item.featureId]) continue;
    // Paused content keeps its authored copy, but must not be a published product.
    if (item.featureId === 'love-code') {
      assert.ok(!catalog.some(entry => entry.featureKey === 'love-code'));
      continue;
    }
    const inventory = inventoryOnlyPaidRoutes[key];
    if (inventory) {
      const record = generated.items[inventory.slug];
      assert.ok(record, key + ': inventory record missing');
      assert.equal(item.featureId, inventory.featureKey);
      assert.equal(record.featureKey, inventory.featureKey);
      assert.equal(record.verification, 'source-inventory-only');
      assert.ok(record.aliases.includes(key));
      assert.ok(fs.existsSync(inventory.source), inventory.source);
      assert.ok(record.evidence.length);
      record.evidence.forEach(source => assert.ok(fs.existsSync(source.split(':')[0]), source));
      assert.ok(!catalog.some(entry => entry.slug === inventory.slug || entry.featureKey === inventory.featureKey || entry.aliases.includes(key)), key + ': unreviewed introduction published');
      assert.ok(!inline.some(entry => entry.inlineAliases.includes(key) || entry.inlineAliases.includes(inventory.featureKey)), key + ': unreviewed inline introduction published');
      continue;
    }
    assert.ok(catalog.some(entry=>entry.featureKey===item.featureId || entry.aliases.includes(key)) || inline.some(entry=>entry.inlineAliases.includes(key) || entry.inlineAliases.includes(item.featureId)), key+': paid introduction missing');
  }
});
