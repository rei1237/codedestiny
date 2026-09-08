#!/usr/bin/env node
// 네트워크/DB/env 접근 없음. --write는 로컬 감사 자료만 생성한다.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as registry from '../worker/lib/paid-feature-registry.js';
import * as music from '../lib/music-access-policy.js';
import { PASS_MONTHLY_WON } from '../lib/payment/pass-pricing.js';
import { listAppStoreProducts } from '../worker/lib/app-store-pricing.js';
import { resolveProduct } from '../worker/payments/catalog.js';
import { resolveLegacyProduct } from '../worker/payments/legacy-pricing.js';
import { isInventorySource, inspectSource, sourceCopies, readMusicManifest, unresolvedInventory, applyInventoryReviews, productFingerprint } from './lib/payment-inventory.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
for (const arg of args) if (!['--write', '--check'].includes(arg)) throw new Error(`Unknown argument: ${arg}`);
const read = file => readFileSync(resolve(root, file), 'utf8');
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).split('\0').filter(Boolean);
const keys = registry.listServerPricedFeatureKeys();
const aliases = registry.PAID_FEATURE_KEY_ALIASES;
const canonical = [...new Set(keys.map(registry.normalizePaidFeatureKey))].sort();
const musicManifest = readMusicManifest(read('app/music/_data/musicManifest.ts'), music);
const known = new Set([...keys, ...Object.keys(aliases), ...musicManifest.products.map(t => t.purchaseFeatureKey), ...Object.keys(registry.PIG_COIN_UNLOCK_PRODUCTS)]);
const allSources = sourceCopies(tracked.filter(isInventorySource).sort().map(file => inspectSource(file, read(file), known)));
const sources = allSources.filter(item => item.keywordLines.length || item.route || item.features.length);
const refsFor = key => sources.filter(s => !s.mirrorOf).flatMap(s => s.features.filter(f => registry.normalizePaidFeatureKey(f.key) === key)
  .map(f => ({ file: s.file, line: f.line, literal: f.key, route: s.route })));
const unknown = 'UNVERIFIED';
function baseRow(id, featureKey, kind, source) {
  return { id, featureKey, displayName: unknown, kind, routes: [], frontendTypes: [], priceKRW: null,
    pass: unknown, moonstone: unknown, pg: unknown, kakaoPay: unknown, paymentStart: [], paymentApis: [],
    returnDestinations: [], resume: unknown, entitlementStorage: unknown, resultTiming: unknown, recovery: unknown,
    tests: { desktop: 'UNTESTED', android: 'UNTESTED', iphone: 'UNTESTED', reloadRecovery: 'UNTESTED', result: 'UNTESTED' },
    billingType: registry.getPaidFeatureBillingType(featureKey) || unknown, review: 'UNREVIEWED', source, references: [] };
}
function resolvePrices(input) {
  const resolution = {};
  const shape = result => ({ productId: result.productId, featureKey: result.featureKey, priceKRW: result.priceKRW, priceCoins: result.priceCoins });
  try { resolution.prepare = shape(resolveLegacyProduct(input)); }
  catch (error) { resolution.prepare = { error: error.code || error.name }; }
  // grantOrderEntitlement는 prepare가 정규화해 주문에 저장한 id/key를 받는다.
  // reason이 지급 입력에서 빠지는 현재 동작도 그대로 기록한다.
  if (resolution.prepare.error) resolution.grant = { skipped: 'PREPARE_REJECTED' };
  else {
    try { resolution.grant = shape(resolveProduct({ productId: resolution.prepare.productId, featureKey: resolution.prepare.featureKey })); }
    catch (error) { resolution.grant = { error: error.code || error.name }; }
  }
  resolution.matches = Boolean(resolution.prepare.priceKRW && resolution.prepare.priceKRW === resolution.grant.priceKRW
    && resolution.prepare.featureKey === resolution.grant.featureKey);
  return resolution;
}
const products = canonical.map(key => {
  const row = baseRow(`feature:${key}`, key, 'content', ['worker/lib/paid-feature-registry.js']);
  row.aliases = Object.entries(aliases).filter(([, value]) => registry.normalizePaidFeatureKey(value) === key).map(([alias]) => alias);
  row.references = refsFor(key);
  row.routes = [...new Set(row.references.map(ref => ref.route).filter(Boolean))];
  row.resolution = resolvePrices({ featureKey: key });
  row.priceKRW = row.resolution.prepare.priceKRW ?? null;
  const spec = registry.FEATURE_KEY_PRICE_TABLE[key] || registry.UNLOCK_PRODUCT_BY_FEATURE_KEY[key];
  row.displayName = spec?.reason || unknown;
  return row;
});
for (const [key, table] of Object.entries(registry.FEATURE_KEY_REASON_COSTS)) {
  for (const [reason] of Object.entries(table)) {
    const row = baseRow(`variant:${key}:${reason}`, key, 'reason-variant', ['worker/lib/paid-feature-registry.js']);
    row.reason = reason;
    row.resolution = resolvePrices({ featureKey: key, reason });
    row.priceKRW = row.resolution.prepare.priceKRW ?? null;
    row.references = refsFor(key);
    products.push(row);
  }
}
for (const [reason] of Object.entries(registry.COIN_GATE_PER_USE_REASON_COSTS)) {
  const row = baseRow(`generic-reason:${reason}`, 'coin-gate-per-use', 'generic-reason', ['worker/lib/paid-feature-registry.js']);
  row.reason = reason;
  row.resolution = resolvePrices({ featureKey: row.featureKey, reason });
  row.priceKRW = row.resolution.prepare.priceKRW ?? null;
  products.push(row);
}
for (const track of musicManifest.products) {
  const row = baseRow(`music:${track.purchaseFeatureKey}`, track.purchaseFeatureKey, 'music-track', ['app/music/_data/musicManifest.ts', 'lib/music-access-policy.js']);
  Object.assign(row, { displayName: track.title, routes: ['/music/'], frontendTypes: ['React'], priceKRW: track.priceKRW,
    audioSourceKey: track.audioSourceKey, androidAppPolicy: 'free-under-current-app-pricing',
    resolution: resolvePrices({ featureKey: track.purchaseFeatureKey, productType: 'music_track' }) });
  products.push(row);
}
for (const [tier, priceKRW] of Object.entries(PASS_MONTHLY_WON)) {
  const row = baseRow(`pass:${tier}_1m`, `${tier}_1m`, 'membership-pass', ['lib/payment/pass-pricing.js', 'worker/payments/passes.js']);
  Object.assign(row, { priceKRW, routes: ['/points/'], tier });
  products.push(row);
}
for (const sku of listAppStoreProducts()) {
  const row = baseRow(`play:${sku.productId}`, null, 'play-sku', ['worker/lib/app-store-pricing.js']);
  Object.assign(row, { sku, priceKRW: sku.amountKRW, frontendTypes: ['native'], billingType: 'provider-adapter' });
  products.push(row);
}
const inventory = { version: 1,
  // generatedAt은 넣지 않는다. 내용이 같은 재실행은 byte-identical이어야 한다.
  basis: { head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    enumeration: 'git ls-files -z; runtime code/config; exact-content public mirrors only',
    excluded: 'docs, reports, tests, scripts, dependency/build/archive directories; retained in excludedFiles',
    sourceFilesScanned: allSources.length, excludedFiles: tracked.filter(f => !isInventorySource(f)),
    untrackedFilesScanned: false },
  counts: { canonicalPriceKeys: canonical.length, manifestEntries: musicManifest.manifestEntries,
    uniqueMusicProducts: musicManifest.products.length, productRows: products.length,
    routeCandidates: allSources.filter(s => s.route && !s.mirrorOf).length,
    finalLivePaidFeatureCount: null }, products, sources };
const reviewPath = 'docs/payments/payment-inventory-reviews.json';
const reviews = existsSync(resolve(root, reviewPath)) ? JSON.parse(read(reviewPath)) : undefined;
inventory.productFingerprints = Object.fromEntries(products.map(row => [row.id, productFingerprint(row)]));
const reviewErrors = applyInventoryReviews(inventory, reviews);
const issues = [...reviewErrors, ...unresolvedInventory(inventory)];
inventory.coverage = { complete: issues.length === 0, unresolvedCount: issues.length, issues };
if (args.has('--write')) {
  const target = resolve(root, 'docs/payments/payment-inventory.json');
  mkdirSync(dirname(target), { recursive: true });
  // 각 상품/source를 한 행으로 보존한다. 상세 조회는 JSON 도구로 하고 사람이 볼 표는 Markdown.
  const serialized = Object.entries(inventory).map(([key, value]) => {
    const body = ['products', 'sources'].includes(key)
      ? '[\n' + value.map(item => '    ' + JSON.stringify(item)).join(',\n') + '\n  ]'
      : JSON.stringify(value);
    return '  ' + JSON.stringify(key) + ': ' + body;
  });
  writeFileSync(target, '{\n' + serialized.join(',\n') + '\n}\n');
  const cell = value => String(value ?? 'UNVERIFIED').replaceAll('|', '\\|').replaceAll('\n', ' ');
  const lines = ['# Payment Inventory — 조사 중', '',
    '자동 추출 후보이며 전수 검증 완료 보고서가 아니다. 금액 해석 성공은 결제 성공·권한 지급 증거가 아니다.', '',
    `서버 정규 키 ${canonical.length}개, manifest ${musicManifest.manifestEntries}개, 고유 음원 상품 ${musicManifest.products.length}개, 전체 상품/변형/SKU 행 ${products.length}개. 최종 서비스 개수 미확정.`, '',
    `미검토 항목 ${issues.length}개. 전체 근거 및 모든 요청 열은 payment-inventory.json에 보존한다.`, '',
    '| 상품/변형 | 이름 | 가격 | 근거 route | Desktop | Android | iPhone | Reload Recovery | Result |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...products.map(row => `| ${cell(row.id)} | ${cell(row.displayName)} | ${cell(row.priceKRW)} | ${cell(row.routes.join(', ') || 'UNVERIFIED')} | UNTESTED | UNTESTED | UNTESTED | UNTESTED | UNTESTED |`), ''];
  writeFileSync(resolve(root, 'docs/payments/payment-inventory.md'), lines.join('\n'));
}
console.log(JSON.stringify({ ...inventory.counts, sourceFilesScanned: allSources.length, reviewIssues: issues.length,
  grantResolutionFailures: products.filter(row => row.resolution?.grant.error).length,
  priceResolutionDifferences: products.filter(row => row.resolution && !row.resolution.matches).length }, null, 2));
if (args.has('--check') && issues.length) {
  console.error('[payment-inventory] INCOMPLETE: source/route/product review required; phase 1 gate not passed.');
  process.exitCode = 1;
}
