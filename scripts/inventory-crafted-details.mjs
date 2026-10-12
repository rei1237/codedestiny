import fs from 'node:fs';
import { loadTsModule } from './lib/load-ts-module.mjs';
const registry = loadTsModule('worker/lib/paid-feature-registry.js');
const details = JSON.parse(fs.readFileSync('lib/marketing/feature-visual-details.generated.json'));
const ledgerPath = 'docs/product-details/product-ledger.json';
const previous = fs.existsSync(ledgerPath) ? JSON.parse(fs.readFileSync(ledgerPath)).products : [];
const keys = [...new Set(registry.listServerPricedFeatureKeys().map(registry.normalizePaidFeatureKey))];
const rows = keys.map(key => {
    const existing = previous.find(row => row.productId === key);
    if (existing)
        return existing;
    const matches = Object.values(details.items).filter(d => [d.featureKey, d.featureKeyTo, ...d.aliases].includes(key));
    const price = registry.FEATURE_KEY_PRICE_TABLE[key] || registry.UNLOCK_PRODUCT_BY_FEATURE_KEY[key];
    return { productId: key, displayName: matches[0]?.title || price?.reason || key, saleStatus: matches.length ? '진입 확인·구성 대조 중' : '판매 진입 확인 필요', entry: matches.map(d => d.href), priceSource: 'worker/lib/paid-feature-registry.js', priceSnapshotKRW: price?.amountKRW ?? null, inputRequirements: [], resultRenderer: [], actualContents: [], conditionalItems: [], separatePurchase: [], reviewSource: [], images: [], status: '조사', appliedAt: [], verification: [], unconfirmed: ['실제 판매 여부 및 결과 렌더러 개별 대조'], detailAliases: matches.map(d => d.slug) };
});
fs.mkdirSync('docs/product-details', { recursive: true });
fs.writeFileSync('docs/product-details/product-ledger.json', JSON.stringify({ status: '조사', basis: '가격 정본의 정규화 후보. 판매 확정 수가 아님. 별칭 통합 뒤 진입·제공물 기준으로 재분류 필요.', sourceKeyCount: registry.listServerPricedFeatureKeys().length, candidateCount: rows.length, products: rows }, null, 2) + '\n');
console.log('가격 정규화 후보 ' + rows.length + '개; 판매 확정 수 아님');
