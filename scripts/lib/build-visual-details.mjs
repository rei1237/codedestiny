import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { loadTsModule } from './load-ts-module.mjs';
import { extractObjectLiteral } from './feature-marketing-extract.mjs';
import { applyDetailCopy } from '../../lib/cms/detail-copy.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const cleanPath = value => String(value || '').replace(/\/+$/, '');
const craftedCatalog = JSON.parse(fs.readFileSync(path.join(root, 'content/product-details/catalog.json'), 'utf8'));
const consultationSamples = JSON.parse(fs.readFileSync(path.join(root, 'lib/marketing/result-samples.json'), 'utf8'));
const introductionArt = JSON.parse(fs.readFileSync(path.join(root, 'lib/marketing/service-introduction-art.json'), 'utf8'));
let resolvePricing;
// Same resolver as the page's start price, so a card never disagrees with the checkout.
const priceKRWFor = featureKey => (resolvePricing ||= loadTsModule('lib/payment/server-feature-pricing.ts').resolveServerFeaturePricing)({ featureKey })?.amountKRW;

// Product choices shown before entry; amounts are always resolved from billing.
const discoveryOptions = {
  'destiny-compass': [
    ['destiny-compass-crossroads', '갈림길 기운 비교'],
    ['destiny-compass-life-voyage', '삶의 항로 안내'],
    ['destiny-compass-future-sim', '미래 시뮬레이션'],
    ['destiny-compass-deep-report', '운명의 지도 심층 리포트'],
  ],
  'master-love-codex': [['master-love-codex', '개인 리딩'], ['master-love-codex-compat', '궁합 리딩']],
  'tarot-prompt-maker': [
    ['tarot-prompt-maker', '카드 1~4장'], ['tarot-prompt-maker-standard', '카드 5~7장'],
    ['tarot-prompt-maker-deep', '카드 8~10장'], ['tarot-prompt-maker-master', '카드 11~14장'],
  ],
};
let masterSource;
// Master copy is read from master-profiles.ts, never copied into a manifest; unknown keys fail the build.
export function craftedMasters(manifest) {
  if (!manifest.masters) return undefined;
  const { masterProfiles, masterAvatars } = (masterSource ||= loadTsModule('components/fortune/master-profiles.ts'));
  const masters = manifest.masters.map(key => {
    const profile = Object.hasOwn(masterProfiles, key) ? masterProfiles[key] : undefined;
    const row = label => profile?.dossier?.find(item => item.label === label)?.text;
    const part = manifest.masterRoles?.[key] || row('이 상담에서 맡는 부분') || profile?.approach;
    if (!profile || !part || !Object.hasOwn(masterAvatars, key)) throw new Error(`Unknown crafted master: ${key}`);
    const { name, epithet, signature, role, principles, portrait, portraitSrcSet } = profile;
    return { key, name, epithet: manifest.masterRoles?.[key] || epithet || role, signature: manifest.masterIntroductions?.[key] || signature || profile.description, role: manifest.masterRoles?.[key] || role, part, basis: manifest.masterBasis?.[key] || row('읽는 근거') || profile.approach, principles, avatar: masterAvatars[key], portrait, portraitSrcSet };
  });
  for (const chapter of manifest.chapters || []) {
    if (chapter.master !== undefined && !manifest.masters.includes(chapter.master)) throw new Error(`Chapter master is not a product master: ${chapter.master}`);
  }
  return masters;
}
function craftedIntroductions(slug) {
  return (craftedCatalog.introductions[slug] || []).map(id => {
    if (!/^[a-z0-9-]+$/.test(id)) throw new Error('Invalid crafted product ID');
    const file = JSON.parse(fs.readFileSync(path.join(root, 'content/product-details', id, 'manifest.json'), 'utf8'));
    const manifest = file.masters ? { ...file, masters: craftedMasters(file) } : file;
    const priceKRW = priceKRWFor(manifest.featureKey);
    return priceKRW ? { ...manifest, priceKRW } : manifest;
  });
}

function writeJsonAtomic(destination, value, spacing = 0) {
  const temporary = `${destination}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, spacing)}\n`);
    fs.renameSync(temporary, destination);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

// Readers may retain the previous image on Windows. Publish a complete new file,
// just as JSON above, rather than truncating an image currently being displayed.
async function writeImageAtomic(pipeline, destination) {
  const temporary = `${destination}.${process.pid}.tmp`;
  try {
    await pipeline.toFile(temporary);
    fs.renameSync(temporary, destination);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}

// Explicit review gate. New registry entries stay source-inventory-only until
// their destination and product copy have been checked against shipped source.
const REVIEWED_FEATURES = new Set([
  'love-secret-ai', 'fortune-chat', 'destiny-compass', 'saju-sibyl', 'new-year-ai',
  'tarot-ijik', 'karma-destiny-ai', 'saju-guardian', 'naming-ai', 'fusion-fortune',
  'tarot-year-fortune', 'tarot-celestial-harmony', 'nakshatra-muhurta', 'tarot',
  'sukuyo', 'human-design', 'nakshatra', 'maya', 'daily-fortune', 'today-hub',
  'palm-reading', 'physiognomy', 'face-reading', 'dream', 'psychotest', 'manse', 'famous-saju',
  'kemet-oracle', 'ifa-oracle', 'juyuk-turtle', 'neville-meditation', 'yoga-guru',
  'tarot-numerology', 'dream-psycho-analysis', 'animal-totem', 'animal-destiny', 'mbti-animal-compat',
  'tarot-crystal-soul', 'royal-tea-oracle', 'geomancy-oracle', 'stonehenge-runes',
  'luck-sync-diary', 'music', 'novel', 'tarot-prompt-maker', 'bias-destiny',
  'omikuji', 'destiny-meeting-place', 'ziwei-ai',
]);

const evidenceOverrides = {
  'daily-fortune': 'index.html',
  'ifa-oracle': 'public/ifa-oracle.html',
  'juyuk-turtle': 'index.html',
  novel: 'public/codedestiny-novel.html',
};

function routeEvidence(source) {
  if (evidenceOverrides[source.slug]) return evidenceOverrides[source.slug];
  if (source.href.includes('?action=')) return 'index.html';
  const route = cleanPath(source.href.split('?')[0]).replace(/^\//, '');
  const candidates = [
    `app/${route}/page.tsx`, `app/${route}/page.js`, route,
    route.endsWith('.html') ? `public/${route}` : '',
    `js/${source.slug}-experience.js`,
  ].filter(Boolean);
  return candidates.find(candidate => fs.existsSync(path.join(root, candidate))) || '';
}

function detailGroup(source, copy) {
  const bag = `${source.slug} ${copy.category || ''}`;
  if (/tarot|oracle|kemet|ifa|juyuk|rune|geomancy|omikuji|royal-tea/.test(bag)) return '타로·신탁';
  if (/love|compat|relationship|reunion|mindscan|meeting/.test(bag)) return '관계·궁합';
  if (/astrology|vedic|nakshatra|muhurta|maya|human-design|celestial/.test(bag)) return '별자리·동양 점성';
  if (/dream|psycho|palm|physiognomy|animal|mbti/.test(bag)) return '상징·마음';
  if (/today|daily|new-year|diary/.test(bag)) return '오늘·시기';
  if (/music|novel|meditation|yoga/.test(bag)) return '휴식·콘텐츠';
  return '사주·심층 상담';
}

function fallbackImage(group) {
  if (group === '타로·신탁') return '/fuctionassets/ai%20tarrot.webp';
  if (group === '관계·궁합') return '/fuctionassets/tarolove.webp';
  if (group === '별자리·동양 점성') return '/fuctionassets/jumsung.webp';
  if (group === '상징·마음') return '/fuctionassets/heamong.webp';
  if (group === '오늘·시기') return '/fuctionassets/saju.webp';
  if (group === '휴식·콘텐츠') return '/images/fortune-tea-house/premium-tea-house-desktop.webp';
  return '/fuctionassets/saju.webp';
}

/**
 * Hero variants used to be written per slug, so the category fallback images
 * (fallbackImage) were re-encoded once per feature — 2.6MB of byte-identical webp.
 * A source shared by more than one feature now writes one file named after the
 * source, and a feature with its own artwork keeps `<slug>-<width>.webp` so that
 * dropping in a per-feature illustration needs no reference change.
 */
const SHARED_ASSET_PREFIX = 'shared-';
const sharedAssetStem = imagePath => `${SHARED_ASSET_PREFIX}${crypto.createHash('sha1').update(imagePath).digest('hex').slice(0, 8)}`;
const GENERATED_ASSET_PATTERN = /^(.+)-(?:\d+|og)\.webp$/;

/**
 * Crafted panels (public/feature-details/crafted/{id}/) are written once by
 * render-crafted-detail as 1080×1440 q76, so a 72px edition cover and a 540px
 * column both downloaded the full original. Every crafted panel gets a 540w
 * sibling (recorded as `variants` in its public manifest, which the popup and
 * product pages fetch), and editions shown as a card a 144px (2x) cover. These
 * suffixes belong to this generator and are pruned here; a variant newer than
 * its source is kept so sync:public does not re-encode hundreds of panels.
 */
const CRAFTED_DIRECTORY = path.join(root, 'public/feature-details/crafted');
const CRAFTED_PANEL_SOURCE = /^\/feature-details\/crafted\/[a-z0-9-]+\/[^/]+\.webp$/;
const CRAFTED_VARIANT_PATTERN = /-(?:540|144)\.webp$/;
async function craftedVariant(src, width, written) {
  const source = path.resolve(root, 'public', decodeURIComponent(src.slice(1)));
  if (!source.startsWith(CRAFTED_DIRECTORY + path.sep)) throw new Error('Crafted image outside its directory');
  const output = source.replace(/\.webp$/, `-${width}.webp`);
  written.add(output);
  if (!fs.existsSync(output) || fs.statSync(output).mtimeMs < fs.statSync(source).mtimeMs) {
    await writeImageAtomic(sharp(source).resize({ width, withoutEnlargement: true }).webp({ quality: 78 }), output);
  }
  return src.replace(/\.webp$/, `-${width}.webp`);
}

/** Derived from the existing shell/React registries; never a second authored copy. */
export function buildVisualDetails(html, book) {
  const legacy = extractObjectLiteral(html, 'D');
  const verified = extractObjectLiteral(html, 'FEATURE_VISUAL_DETAILS');
  const founder = loadTsModule('lib/brand/founder.ts').founder;
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js/core/service-registry.js'), 'utf8'), context);
  const react = loadTsModule('app/_lib/serviceFeatureRegistry.ts').SERVICE_FEATURES;
  const sources = [
    ...context.window.__cdServiceRegistry.map(item => ({
      slug: item.id, title: item.name, description: item.desc,
      href: item.href || `/index.html?action=${encodeURIComponent(item.action)}`,
      visualHref: item.visualHref || item.href,
      featureKey: item.featureKey, featureKeyTo: item.featureKeyTo, priceFrom: item.priceFrom, action: item.action, aliases: item.aliases, accessType: item.price === '무료' ? 'free' : undefined,
    })),
    ...react.map(item => ({ ...item, href: item.launchRoute })),
    ...Object.entries(verified).filter(([,item]) => item.sourceAction).map(([slug,item]) => ({ slug, title:item.title, href:item.href, action:item.sourceAction })),
  ];
  const items = {}, seen = new Set();
  for (const source of sources) {
    if (!/^[a-z0-9-]+$/.test(source.slug) || !source.href?.startsWith('/') || source.href.startsWith('//')) continue;
    const route = cleanPath(source.href);
    const visualRoute = cleanPath(source.visualHref || source.href);
    if (seen.has(visualRoute)) continue;
    seen.add(visualRoute);
    const candidates = [source.featureKey, source.action, source.slug, source.href, route, `${route}/`, ...(source.aliases || [])].filter(Boolean);
    const match = candidates.map(key => book.items[key]).find(Boolean);
    const base = candidates.map(key => legacy[key]).find(Boolean);
    const copy = match?.copy || {};
    const image = source.image || base?.img || react.find(item => cleanPath(item.launchRoute) === route)?.image || '';
    // Sharing a marketing template does not make two services navigation aliases.
    const aliases = [...new Set(candidates)];
    const group = detailGroup(source, copy);
    const record = {
      slug: source.slug, title: source.title, href: source.href, featureKey: source.featureKey || copy.featureId || '', featureKeyTo: source.featureKeyTo || '', ...(source.priceFrom ? { priceFrom: true } : {}),
      accessType: source.accessType || 'unknown', image: image.split('?')[0], aliases, category: group,
    };
    const panels = [];
    if (copy.answersQuestions?.length) panels.push({ title: '이런 질문에 도움이 됩니다', items: copy.answersQuestions.slice(0, 3) });
    if (copy.feats?.length) panels.push({ title: '이 기능으로 살펴보는 것', items: copy.feats });
    if (copy.unlockBenefits?.length) panels.push({ title: '결과에서 받아보는 내용', items: copy.unlockBenefits });
    if (copy.analysisSteps?.length) panels.push({ title: '어떻게 이용하나요?', steps: copy.analysisSteps });
    if (copy.recommendedFor?.length) panels.push({ title: '이런 분께 어울려요', items: copy.recommendedFor });
    if (!panels.length && base?.feats?.length) panels.push({ title: '이 기능으로 살펴보는 것', items: base.feats });
    const prior = items[record.slug];
    const reviewed = REVIEWED_FEATURES.has(record.slug);
    const evidence = routeEvidence(source);
    if (reviewed && !evidence) throw new Error(`Reviewed feature has no shipped destination evidence: ${record.slug}`);
    if (reviewed) panels.unshift({
      title: `${source.title}에서 확인하는 흐름`,
      text: copy.previewText || copy.subheadline || source.description || '',
      visualPreview: 'feature-map',
      previewTone: group,
    });
    items[record.slug] = {
      ...prior, ...record,
      aliases: [...new Set([...(prior?.aliases || []), ...aliases])],
      headline: copy.headline || base?.tagline || source.title,
      description: copy.subheadline || source.description || base?.tagline || '',
      panels, ctaLabel: copy.ctaLabel || '이 기능 시작하기',
      evidence: [match ? `index.html:FEATURE_MARKETING_COPY:${match.dictNs}` : 'js/core/service-registry.js'],
      verification: 'source-inventory-only',
      ...(reviewed ? { evidence: [evidence, 'index.html', 'js/core/service-registry.js'], verification: 'verified' } : {}),
      ...verified[record.slug],
    };
    const final = items[record.slug];
    if (discoveryOptions[record.slug]) {
      final.priceOptions = discoveryOptions[record.slug].map(([featureKey, label]) => {
        const amountKRW = priceKRWFor(featureKey);
        if (!(amountKRW > 0)) throw new Error(`Missing discovery option price: ${featureKey}`);
        return { featureKey, label, amountKRW };
      });
      final.freeEntry = record.slug === 'destiny-compass';
    }
    const consultation = consultationSamples.find(item => item.slug === record.slug && item.guide);
    if (consultation) final.consultationGuide = consultation.guide;
    const crafted = craftedIntroductions(record.slug);
    if (crafted.length) final.crafted = crafted;
    if (['book', 'letter'].includes(final.material)) {
      final.founder = { credential: founder.credential, method: founder.method };
    }
    const editorial = crafted.find(item => item.layout === 'editorial');
    if (editorial) {
      final.image = editorial.panels[0].src;
      final.imageAlt = editorial.panels[0].alt;
      final.headline = editorial.panels[0].title;
      final.description = editorial.panels[0].text;
      // These editions show a consultation scene, not the previous book/letter object.
      delete final.material;
    }
    // One function-specific scene across the shell and React catalogue.
    // Character profile originals and result/report illustrations remain separate.
    const art = introductionArt[record.slug];
    if (art) {
      final.image = art.image;
      final.imageAlt = art.alt;
      final.catalogImage = art.cardImage;
      delete final.material;
    }
    if (['book', 'letter'].includes(final.material)) {
      final.founder = { credential: founder.credential, method: founder.method };
    }
    // These inline wrappers are source evidence, never browser asset requests.
    if (['destiny-flower', 'astrology-flower', 'ziwei-flower', 'sukuyo-flower'].includes(record.slug)) {
      final.evidence = [...new Set(['js/core/index-inline-runtime.js', ...final.evidence])];
    }
    final.benefits ||= (copy.receives?.length ? copy.receives.map(item => item.title) : copy.feats || final.panels.flatMap(panel => panel.items || [])).slice(0, 6);
    final.contents ||= copy.outline?.map(item => ({ title: item.title, detail: item.detail })) || [];
    final.theme ||= ({ '관계·궁합': 'rose', '타로·신탁': 'burgundy', '별자리·동양 점성': 'indigo', '상징·마음': 'emerald', '오늘·시기': 'saffron' })[group] || 'navy';
    // Keep the existing image panels, but carry the same product-specific decision
    // information that the visual popup replaces. No new price or access policy.
    final.journey = {
    questions: final.journey?.questions || (copy.answersQuestions?.length ? copy.answersQuestions : final.panels.find(panel => panel.title === '이런 질문에 도움이 됩니다')?.items || []),
      trustNotes: final.journey?.trustNotes || copy.trustNotes || book.trustNotes.free || [],
      faq: final.journey?.faq || copy.faq || [],
    };
    if (final.verification === 'verified' && !final.image) final.image = fallbackImage(final.category || group);
  }
  const index = Object.values(items).map(final => ({
    slug: final.slug, title: final.title, href: final.href, featureKey: final.featureKey,
    accessType: final.accessType, image: final.image, aliases: final.aliases,
    ...(final.catalogImage ? { catalogImage: final.catalogImage } : {}),
    category: final.category, description: final.journey?.questions?.[0] || final.description, verification: final.verification,
  }));
  return { index, items };
}

export async function writeVisualDetails(html, book) {
  const data = buildVisualDetails(html, book);
  const directory = path.join(root, 'public/feature-details');
  fs.mkdirSync(directory, { recursive: true });
  fs.mkdirSync(path.join(directory, 'assets'), { recursive: true });
  fs.mkdirSync(path.join(directory, 'examples'), { recursive: true });
  for (const name of ['life-book-summary', 'animal-summary']) {
    fs.copyFileSync(path.join(root, `docs/mobile-platform/mockup-assets/${name}.webp`), path.join(directory, `examples/${name}.webp`));
  }
  const heroUsers = new Map();
  for (const [slug, item] of Object.entries(data.items)) {
    if (slug.startsWith(SHARED_ASSET_PREFIX)) throw new Error(`Slug collides with the shared hero namespace: ${slug}`);
    if (item.verification !== 'verified') continue;
    if (!item.image.startsWith('/') || item.image.startsWith('//')) continue;
    heroUsers.set(item.image, (heroUsers.get(item.image) || 0) + 1);
  }
  const knownSlugs = new Set(Object.keys(data.items));
  const writtenAssets = new Set();
  const writtenCrafted = new Set();
  for (const [slug, item] of Object.entries(data.items)) {
    const destination = path.join(directory, `${slug}.json`);
    if (item.verification === 'verified') {
      if (item.catalogImage?.startsWith('/') && !item.catalogImage.startsWith('//')) {
        const catalogSource = path.resolve(root, 'public', decodeURIComponent(item.catalogImage.slice(1)));
        const publicRoot = path.resolve(root, 'public') + path.sep;
        if (!catalogSource.startsWith(publicRoot)) throw new Error('Catalog image outside public');
        const catalogName = `${slug}-catalog-320.webp`;
        await writeImageAtomic(sharp(catalogSource).resize(320, 180, { fit: 'cover' }).webp({ quality: 76 }), path.join(directory, 'assets', catalogName));
        writtenAssets.add(catalogName);
        item.catalogImage = `/feature-details/assets/${catalogName}`;
        data.index.find(entry => entry.slug === slug).catalogImage = item.catalogImage;
      }
      if (item.image.startsWith('/') && !item.image.startsWith('//')) {
        const imagePath = item.image;
        const source = path.resolve(root, 'public', decodeURIComponent(imagePath.slice(1)));
        const publicRoot = path.resolve(root, 'public') + path.sep;
        if (!source.startsWith(publicRoot)) throw new Error('Image outside public');
        const meta = await sharp(source).metadata();
        item.imageWidth = meta.width;
        item.imageHeight = meta.height;
        const resizeOptions = ['book', 'letter'].includes(item.material)
          ? { fit: 'contain', background: item.material === 'book' ? '#152721' : '#f6f2ed' }
          : { fit: 'cover' };
        const stem = heroUsers.get(imagePath) > 1 ? sharedAssetStem(imagePath) : slug;
        item.heroVariants = [];
        for (const width of [...new Set([Math.min(480, meta.width), Math.min(960, meta.width)])]) {
          const name = `${stem}-${width}.webp`;
          if (!writtenAssets.has(name)) {
            await writeImageAtomic(sharp(source).resize({ width, withoutEnlargement: true }).webp({ quality: ['book', 'letter'].includes(item.material) ? 70 : 78 }), path.join(directory, 'assets', name));
            writtenAssets.add(name);
          }
          item.heroVariants.push({ src: `/feature-details/assets/${name}`, width });
        }
        item.image = item.heroVariants[item.heroVariants.length - 1].src;
        const cardName = `${stem}-320.webp`;
        await writeImageAtomic(sharp(source).resize(320, 180, resizeOptions).webp({ quality: 76 }), path.join(directory, 'assets', cardName));
        writtenAssets.add(cardName);
        item.cardImage = `/feature-details/assets/${cardName}`;
        const ogName = `${stem}-og.webp`;
        await writeImageAtomic(sharp(source).resize(1200, 630, resizeOptions).webp({ quality: 78 }), path.join(directory, 'assets', ogName));
        writtenAssets.add(ogName);
        item.ogImage = `/feature-details/assets/${ogName}`;
        if (['book', 'letter'].includes(item.material)) {
          const provenance = JSON.parse(fs.readFileSync(`${source}.json`, 'utf8'));
          for (const asset of [...item.heroVariants.map(variant => path.basename(variant.src)), cardName, ogName]) {
            writeJsonAtomic(path.join(directory, 'assets', `${asset}.json`), {
              prompt: provenance.prompt,
              origin: imagePath,
              transformation: asset === cardName || asset === ogName ? 'Proportional resize with solid padding; no crop.' : 'Proportional WebP resize; no crop.',
            }, 2);
          }
        }
        data.index.find(entry => entry.slug === slug).image = item.image;
        data.index.find(entry => entry.slug === slug).cardImage = item.cardImage;
      }
      for (const panel of item.panels) {
        if (!panel.verifiedCapture) continue;
        const meta = await sharp(path.join(root, 'public', panel.verifiedCapture.src)).metadata();
        panel.verifiedCapture.width = meta.width;
        panel.verifiedCapture.height = meta.height;
      }
      for (const essay of item.crafted || []) {
        const panels = (essay.panels || []).filter(panel => panel.src && panel.text);
        for (const panel of panels) {
          if (CRAFTED_PANEL_SOURCE.test(panel.src) && Number(panel.width) > 540) panel.variants = [{ src: await craftedVariant(panel.src, 540, writtenCrafted), width: 540 }];
        }
        // A single edition renders open without a card, so it needs no cover.
        const cover = panels[0];
        if (item.crafted.length > 1 && cover?.src.startsWith('/images/service-introductions/')) {
          const thumb = [...(cover.variants || [])].sort((a,b) => a.width - b.width)[0];
          if (thumb) essay.cover = { src: thumb.src, width: thumb.width, height: Math.round(thumb.width * cover.height / cover.width) };
        } else if (item.crafted.length > 1 && cover && CRAFTED_PANEL_SOURCE.test(cover.src)) {
          essay.cover = { src: await craftedVariant(cover.src, 144, writtenCrafted), width: 144, height: Math.round(144 * (Number(cover.height) || 1440) / (Number(cover.width) || 1080)) };
        }
      }
      writeJsonAtomic(destination, item);
    }
    else if (fs.existsSync(destination)) fs.unlinkSync(destination);
  }
  // Only the names this generator owns are pruned. Hand-authored heroes such as
  // feature-detail-shared-hero-v1-*.webp match no slug and stay untouched.
  for (const name of fs.readdirSync(path.join(directory, 'assets'))) {
    if (writtenAssets.has(name)) continue;
    const stem = GENERATED_ASSET_PATTERN.exec(name)?.[1];
    // Existing route metadata and saved links may still reference the previous OG/cover.
    if (data.items[stem]?.crafted?.some(item => item.layout === 'editorial')) continue;
    const catalogStem = stem?.endsWith('-catalog') ? stem.slice(0, -'-catalog'.length) : '';
    if (!stem || !(knownSlugs.has(stem) || knownSlugs.has(catalogStem) || stem.startsWith(SHARED_ASSET_PREFIX))) continue;
    fs.unlinkSync(path.join(directory, 'assets', name));
  }
  // The public manifests are what the disclosure panels fetch; content/product-details keeps the authored copy.
  for (const id of fs.existsSync(CRAFTED_DIRECTORY) ? fs.readdirSync(CRAFTED_DIRECTORY) : []) {
    const file = path.join(CRAFTED_DIRECTORY, id, 'manifest.json');
    if (!fs.existsSync(file)) continue;
    const authoredFile = path.join(root, 'content/product-details', id, 'manifest.json');
    const authored = fs.existsSync(authoredFile) ? JSON.parse(fs.readFileSync(authoredFile, 'utf8')) : null;
    // Editorial editions publish from the authored source, including resolved master identities.
    const manifest = authored?.layout === 'editorial'
      ? { ...authored, masters: craftedMasters(authored) }
      : JSON.parse(fs.readFileSync(file, 'utf8'));
    if (authored?.panels?.[0]?.src?.startsWith('/images/service-introductions/')) {
      manifest.panels[0] = { ...authored.panels[0] };
    }
    for (const panel of manifest.panels || []) {
      if (CRAFTED_PANEL_SOURCE.test(panel.src || '') && Number(panel.width) > 540) panel.variants = [{ src: await craftedVariant(panel.src, 540, writtenCrafted), width: 540 }];
    }
    writeJsonAtomic(file, manifest, 2);
  }
  for (const id of fs.existsSync(CRAFTED_DIRECTORY) ? fs.readdirSync(CRAFTED_DIRECTORY) : []) {
    const folder = path.join(CRAFTED_DIRECTORY, id);
    if (!fs.statSync(folder).isDirectory()) continue;
    const source = path.join(root, 'content/product-details', id, 'manifest.json');
    if (fs.existsSync(source) && JSON.parse(fs.readFileSync(source, 'utf8')).layout === 'editorial') continue;
    for (const name of fs.readdirSync(folder)) {
      if (CRAFTED_VARIANT_PATTERN.test(name) && !writtenCrafted.has(path.join(folder, name))) fs.unlinkSync(path.join(folder, name));
    }
  }
  const cmsFile = path.join(root, 'app/_content/cms.generated.json');
  const detailOverrides = fs.existsSync(cmsFile) ? JSON.parse(fs.readFileSync(cmsFile, 'utf8')).entries?.['feature-detail'] || {} : {};
  for (const item of Object.values(data.items)) {
    if (item.verification !== 'verified') continue;
    item.related = (item.relatedProducts || []).map(slug => data.items[slug]).filter(other => other?.verification === 'verified' && other.slug !== item.slug).slice(0, 4).map(other => ({ slug: other.slug, title: other.title, hook: other.journey?.questions?.[0] || other.headline, image: other.cardImage || other.image }));
    const edited = applyDetailCopy(item, detailOverrides[item.slug]?.record);
    data.items[item.slug] = edited;
    writeJsonAtomic(path.join(directory, `${item.slug}.json`), edited);
  }
  data.index = data.index.map(item => {
    const detail = data.items[item.slug];
    return detail && detailOverrides[item.slug]?.record
      ? { ...item, title: detail.title, description: detail.journey?.questions?.[0] || detail.description }
      : item;
  });
  const published = [...new Map(data.index.filter(item => item.verification === 'verified').map(item => [item.slug, item])).values()];
  writeJsonAtomic(path.join(directory, 'catalog.json'), published);
  writeJsonAtomic(path.join(root, 'lib/marketing/feature-visual-details.generated.json'), data, 2);
  console.log(`[sync:visual-details] ${data.index.length} unique features; ${published.length} reviewed introductions published`);
}
