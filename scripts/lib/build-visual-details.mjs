import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { loadTsModule } from './load-ts-module.mjs';
import { extractObjectLiteral } from './feature-marketing-extract.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const cleanPath = value => String(value || '').replace(/\/+$/, '');

function writeJsonAtomic(destination, value, spacing = 0) {
  const temporary = `${destination}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, spacing)}\n`);
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
  'tarot-numerology', 'dream-psycho-analysis', 'animal-totem', 'mbti-animal-compat',
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

/** Derived from the existing shell/React registries; never a second authored copy. */
export function buildVisualDetails(html, book) {
  const legacy = extractObjectLiteral(html, 'D');
  const verified = extractObjectLiteral(html, 'FEATURE_VISUAL_DETAILS');
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js/core/service-registry.js'), 'utf8'), context);
  const react = loadTsModule('app/_lib/serviceFeatureRegistry.ts').SERVICE_FEATURES;
  const sources = [
    ...context.window.__cdServiceRegistry.map(item => ({
      slug: item.id, title: item.name, description: item.desc,
      href: item.href || `/index.html?action=${encodeURIComponent(item.action)}`,
      visualHref: item.visualHref || item.href,
      featureKey: item.featureKey, featureKeyTo: item.featureKeyTo, action: item.action, accessType: item.price === '무료' ? 'free' : undefined,
    })),
    ...react.map(item => ({ ...item, href: item.launchRoute })),
  ];
  const items = {}, seen = new Set();
  for (const source of sources) {
    if (!/^[a-z0-9-]+$/.test(source.slug) || !source.href?.startsWith('/') || source.href.startsWith('//')) continue;
    const route = cleanPath(source.href);
    const visualRoute = cleanPath(source.visualHref || source.href);
    if (seen.has(visualRoute)) continue;
    seen.add(visualRoute);
    const candidates = [source.featureKey, source.action, source.slug, source.href, route, `${route}/`].filter(Boolean);
    const match = candidates.map(key => book.items[key]).find(Boolean);
    const base = candidates.map(key => legacy[key]).find(Boolean);
    const copy = match?.copy || {};
    const image = source.image || base?.img || react.find(item => cleanPath(item.launchRoute) === route)?.image || '';
    // Sharing a marketing template does not make two services navigation aliases.
    const aliases = [...new Set(candidates)];
    const group = detailGroup(source, copy);
    const record = {
      slug: source.slug, title: source.title, href: source.href, featureKey: source.featureKey || copy.featureId || '', featureKeyTo: source.featureKeyTo || '',
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
    // Keep the existing image panels, but carry the same product-specific decision
    // information that the visual popup replaces. No new price or access policy.
    final.journey = {
    questions: final.journey?.questions || (copy.answersQuestions?.length ? copy.answersQuestions : final.panels.find(panel => panel.title === '이런 질문에 도움이 됩니다')?.items || []),
      trustNotes: copy.trustNotes || book.trustNotes.free || [],
      faq: copy.faq || [],
    };
    if (final.verification === 'verified' && !final.image) final.image = fallbackImage(final.category || group);
  }
  const index = Object.values(items).map(final => ({
    slug: final.slug, title: final.title, href: final.href, featureKey: final.featureKey,
    accessType: final.accessType, image: final.image, aliases: final.aliases,
    category: final.category, description: final.description, verification: final.verification,
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
  for (const [slug, item] of Object.entries(data.items)) {
    const destination = path.join(directory, `${slug}.json`);
    if (item.verification === 'verified') {
      if (item.image.startsWith('/') && !item.image.startsWith('//')) {
        const source = path.resolve(root, 'public', decodeURIComponent(item.image.slice(1)));
        const publicRoot = path.resolve(root, 'public') + path.sep;
        if (!source.startsWith(publicRoot)) throw new Error('Image outside public');
        const meta = await sharp(source).metadata();
        item.heroVariants = [];
        for (const width of [...new Set([Math.min(480, meta.width), Math.min(960, meta.width)])]) {
          const name = `${slug}-${width}.webp`;
          await sharp(source).resize({ width, withoutEnlargement: true }).webp({ quality: 78 }).toFile(path.join(directory, 'assets', name));
          item.heroVariants.push({ src: `/feature-details/assets/${name}`, width });
        }
        item.image = item.heroVariants[item.heroVariants.length - 1].src;
        data.index.find(entry => entry.slug === slug).image = item.image;
      }
      for (const panel of item.panels) {
        if (!panel.verifiedCapture) continue;
        const meta = await sharp(path.join(root, 'public', panel.verifiedCapture.src)).metadata();
        panel.verifiedCapture.width = meta.width;
        panel.verifiedCapture.height = meta.height;
      }
      writeJsonAtomic(destination, item);
    }
    else if (fs.existsSync(destination)) fs.unlinkSync(destination);
  }
  const published = [...new Map(data.index.filter(item => item.verification === 'verified').map(item => [item.slug, item])).values()];
  writeJsonAtomic(path.join(directory, 'catalog.json'), published);
  writeJsonAtomic(path.join(root, 'lib/marketing/feature-visual-details.generated.json'), data, 2);
  console.log(`[sync:visual-details] ${data.index.length} unique features; ${published.length} reviewed introductions published`);
}
