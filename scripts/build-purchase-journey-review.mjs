/** Offline review artifact. Does not change runtime, pricing, or generated public assets. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { JSDOM } from 'jsdom';
import { buildFeatureMarketingCopy } from './lib/feature-marketing-extract.mjs';
import { buildVisualDetails } from './lib/build-visual-details.mjs';
import { listServerPricedFeatureKeys, normalizePaidFeatureKey } from '../worker/lib/paid-feature-registry.js';
import { getBillingFeaturePricing } from '../worker/lib/billing-feature-registry.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'docs/purchase-journey');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('index.html');
const book = buildFeatureMarketingCopy(html);
const visual = buildVisualDetails(html, book);
const context = { window: {} };
vm.runInNewContext(read('js/core/service-registry.js'), context, { timeout: 1000 });
const registry = context.window.__cdServiceRegistry;
// No scripts, images, or external resources execute in this parser.
const dom = new JSDOM(html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ''));
const files = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8', maxBuffer: 8e6 }).trim().split(/\r?\n/);
const stages = ['Awareness', 'Interest', 'Consideration', 'Trust', 'Conversion', 'Loyalty'];
const clean = value => String(value || '').replace(/\/$/, '');
const records = new Map();
function add(identity, entry) {
  if (!identity) return;
  const row = records.get(identity) || { identity, sources: [], entrypoints: [], scores: Object.fromEntries(stages.map(s => [s, null])), status: '화면 미확인' };
  row.status = '화면 미확인';
  row.sources.push(entry.source);
  if (entry.href || entry.action) row.entrypoints.push({ href: entry.href || '', action: entry.action || '', source: entry.source });
  for (const [key, value] of Object.entries(entry)) if (value && !['source', 'href', 'action'].includes(key)) row[key] ??= value;
  records.set(identity, row);
}
const identity = entry => entry.featureKey ? `paid:${normalizePaidFeatureKey(entry.featureKey)}` : entry.action ? `action:${entry.action}` : `route:${clean(entry.href)}`;
for (const entry of registry) add(identity(entry), { ...entry, title: entry.name, source: 'js/core/service-registry.js' });
for (const entry of visual.index) add(identity(entry), { ...entry, source: 'scripts/lib/build-visual-details.mjs', visualMetadata: entry.verification });
for (const node of dom.window.document.querySelectorAll('.tarot-tile')) {
  const entry = { href: node.getAttribute('href'), action: node.getAttribute('data-action'), featureKey: node.getAttribute('data-feature-key'), title: (node.querySelector('h2,h3,h4,.tarot-tile-title,.tile-title')?.textContent || node.getAttribute('aria-label') || node.textContent).replace(/\s+/g, ' ').trim().slice(0, 160), source: 'index.html:.tarot-tile' };
  if (entry.href || entry.action || entry.featureKey) add(identity(entry), entry);
}
for (const key of listServerPricedFeatureKeys()) add(`paid:${normalizePaidFeatureKey(key)}`, { featureKey: normalizePaidFeatureKey(key), source: `worker/lib/paid-feature-registry.js:${key}` });

const routeFiles = files.filter(file => /^app\/.*\/page\.(tsx|jsx|js|ts)$/.test(file));
const routePath = file => '/' + file.replace(/^app\//, '').replace(/\/page\.[^.]+$/, '').split('/').filter(part => !/^\(.*\)$/.test(part)).join('/');
const sourceFiles = files.filter(file => /^(app|components|src|js)\//.test(file) && /\.(tsx?|jsx?|mjs)$/.test(file));
const contents = sourceFiles.map(file => [file, read(file)]);
function price(featureKey) {
  if (!featureKey) return null;
  try { const value = getBillingFeaturePricing({ featureKey }); return value?.ok ? value.pricing : null; } catch { return null; }
}
for (const row of records.values()) {
  row.sources = [...new Set(row.sources)];
  row.entrypoints = [...new Map(row.entrypoints.map(e => [JSON.stringify(e), e])).values()];
  const candidates = [row.featureKey, row.slug, row.id, ...row.entrypoints.flatMap(e => [e.href, clean(e.href), e.action])].filter(Boolean);
  const matched = candidates.find(key => book.items[key]);
  row.existingCopy = matched ? book.items[matched].copy : null;
  row.copySource = matched ? `index.html:FEATURE_MARKETING_COPY:${matched}` : null;
  row.pricing = price(row.featureKey);
  row.title ||= row.existingCopy?.headline || row.featureKey || row.identity;
  row.routeEvidence = routeFiles.filter(file => row.entrypoints.some(e => clean(e.href?.split('?')[0]) === clean(routePath(file))));
  const needles = [row.featureKey, ...row.entrypoints.map(e => e.action)].filter(x => x && x.length > 3);
  row.callsiteCandidates = contents.filter(([, text]) => needles.some(key => text.includes(`'${key}'`) || text.includes(`"${key}"`))).map(([file]) => file);
  row.gaps = [];
  if (!row.entrypoints.length) row.gaps.push('상품 키의 사용자 진입점 연결 필요');
  if (!row.existingCopy) row.gaps.push('개별 상세 카피 연결 확인 필요');
  if ((row.existingCopy?.answersQuestions?.length || 0) < 3) row.gaps.push('질문형 Hook 3개 이상 확인 필요');
  if (!row.existingCopy?.ctaLabel) row.gaps.push('결과 중심 CTA 확인 필요');
  if (/무제한|평생|추가 질문은 요금 없이|\d[\d,]*자 이상|\d+년 경력/.test(JSON.stringify(row.existingCopy))) row.gaps.push('기간·분량·경력·추가 제공 주장의 정책 또는 구현 근거 확인 필요');
  if (row.featureKey && !row.pricing) row.gaps.push('가격 해석 불가: 무료로 표시하지 않음');
  row.gaps.push('입력·잠금·결제·결과·재열람·추천의 실제 화면 검증 필요');
}
const rows = [...records.values()].sort((a, b) => a.identity.localeCompare(b.identity));
const data = {
  sourceFingerprint: createHash('sha256').update(html).update(JSON.stringify(contents)).digest('hex'),
  methodology: '소스 후보 목록이며 화면 감사 또는 서비스 개수 확정이 아님. 상품 별칭만 서버 정규화로 병합. 라우트·액션 중복은 증거 확인 전 유지. 기존 verified 메타데이터는 이번 작업의 검증을 뜻하지 않음.',
  counts: { registry: registry.length, visualDestinations: visual.index.length, visualPreviouslyReviewed: visual.index.filter(e => e.verification === 'verified').length, marketingKeys: Object.keys(book.items).length, shellTiles: dom.window.document.querySelectorAll('.tarot-tile').length, candidateRecords: rows.length, appRoutes: routeFiles.length },
  rows,
  routes: routeFiles.map(file => ({ file, route: routePath(file), status: '분류·화면 확인 필요' })),
  profileEntrypointSource: 'js/destiny-profile.js',
  unlinkedMarketingKeys: Object.keys(book.items).filter(key => !rows.some(row => row.copySource === `index.html:FEATURE_MARKETING_COPY:${key}`)),
};
fs.mkdirSync(output, { recursive: true });
const serialized = JSON.stringify(data, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (read('docs/purchase-journey/inventory.json') !== serialized) throw new Error('Purchase journey inventory drift');
} else fs.writeFileSync(path.join(output, 'inventory.json'), serialized);
console.log(JSON.stringify(data.counts));
