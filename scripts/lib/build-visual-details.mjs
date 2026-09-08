import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { loadTsModule } from './load-ts-module.mjs';
import { extractObjectLiteral } from './feature-marketing-extract.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const cleanPath = value => String(value || '').replace(/\/+$/, '');

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
      featureKey: item.featureKey, featureKeyTo: item.featureKeyTo, action: item.action, accessType: item.price === '무료' ? 'free' : undefined,
    })),
    ...react.map(item => ({ ...item, href: item.launchRoute })),
  ];
  const index = [], items = {}, seen = new Set();
  for (const source of sources) {
    if (!/^[a-z0-9-]+$/.test(source.slug) || !source.href?.startsWith('/') || source.href.startsWith('//')) continue;
    const route = cleanPath(source.href);
    if (seen.has(route)) continue;
    seen.add(route);
    const candidates = [source.featureKey, source.action, source.slug, source.href, route, `${route}/`].filter(Boolean);
    const match = candidates.map(key => book.items[key]).find(Boolean);
    const base = candidates.map(key => legacy[key]).find(Boolean);
    const copy = match?.copy || {};
    const image = source.image || base?.img || react.find(item => cleanPath(item.launchRoute) === route)?.image || '';
    // Sharing a marketing template does not make two services navigation aliases.
    const aliases = [...new Set(candidates)];
    const record = {
      slug: source.slug, title: source.title, href: source.href, featureKey: source.featureKey || copy.featureId || '', featureKeyTo: source.featureKeyTo || '',
      accessType: source.accessType || 'unknown', image: image.split('?')[0], aliases,
    };
    const panels = [];
    if (copy.answersQuestions?.length) panels.push({ title: '이런 질문에 도움이 됩니다', items: copy.answersQuestions.slice(0, 3) });
    if (copy.feats?.length) panels.push({ title: '이 기능으로 살펴보는 것', items: copy.feats });
    if (copy.unlockBenefits?.length) panels.push({ title: '결과에서 받아보는 내용', items: copy.unlockBenefits });
    if (copy.analysisSteps?.length) panels.push({ title: '어떻게 이용하나요?', steps: copy.analysisSteps });
    if (copy.recommendedFor?.length) panels.push({ title: '이런 분께 어울려요', items: copy.recommendedFor });
    items[record.slug] = {
      ...record, headline: copy.headline || source.title, description: copy.subheadline || source.description || '',
      panels, ctaLabel: copy.ctaLabel || '이 기능 시작하기',
      evidence: [match ? `index.html:FEATURE_MARKETING_COPY:${match.dictNs}` : 'js/core/service-registry.js'],
      verification: 'source-inventory-only',
      ...verified[record.slug],
    };
    const final = items[record.slug];
    index.push({ ...record, title: final.title, href: final.href, featureKey: final.featureKey, accessType: final.accessType, image: final.image, aliases: final.aliases, verification: final.verification });
  }
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
      fs.writeFileSync(destination, JSON.stringify(item) + '\n');
    }
    else if (fs.existsSync(destination)) fs.unlinkSync(destination);
  }
  fs.writeFileSync(path.join(directory, 'catalog.json'), JSON.stringify(data.index.filter(item => item.verification === 'verified')) + '\n');
  fs.writeFileSync(path.join(root, 'lib/marketing/feature-visual-details.generated.json'), JSON.stringify(data, null, 2) + '\n');
  console.log(`[sync:visual-details] ${data.index.length} registry destinations; runtime facts remain explicitly unverified`);
}
