import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getBillingFeaturePricing } from '../../worker/lib/billing-feature-registry.js';

// Presentation seeds use the same resolver as billing; no second price table.
export function syncSajuReadingPrices(root) {
  const dashboard = join(root, 'js/core/saju/reportDashboard.js');
  const source = readFileSync(dashboard, 'utf8');
  const relationship = getBillingFeaturePricing({ featureKey: 'relationship-boundary-test' });
  if (!relationship.ok) throw new Error('Missing relationship price');
  let updated = source.replace(/(id:'relationshipTemptation'[^\n]+?coinCost:)\d+/, `$1${relationship.pricing.cost}`);

  const file = join(root, 'index.html');
  let html = readFileSync(file, 'utf8');
  // 개별 판매가 끝난 사주 상품(section_summary·section_daewun·일 스타일 등)의 가격은 다시 쓰지 않는다.
  // 화면에는 사주 묶음(saju_lifetime_bundle)만 값을 가진다 — 결제 버튼의 비용 속성을 레지스트리 가격행에 맞춘다.
  const bundle = getBillingFeaturePricing({ featureKey: 'saju_lifetime_bundle' });
  if (!bundle.ok || !Number.isSafeInteger(bundle.pricing.cost)) throw new Error('Missing saju_lifetime_bundle price');
  html = html.replace(/<button\b(?=[^>]*data-unlock-key="saju_lifetime_bundle")[^>]*>/g, tag =>
    tag.replace(/data-unlock-cost="\d+"/, `data-unlock-cost="${bundle.pricing.cost}"`));
  if (updated !== source) writeFileSync(dashboard, updated);
  const sibyl = getBillingFeaturePricing({featureKey:'premium-sibyl-dominator'});
  if (!sibyl.ok || !Number.isSafeInteger(sibyl.pricing.amountKRW)) throw new Error('Missing Sibyl price');
  html=html.replace(/(<(?:span|p) data-sibyl-price>)[^<]*(<\/(?:span|p)>)/g, '$1심층 리포트 '+sibyl.pricing.amountKRW.toLocaleString('ko-KR')+'원$2');
  if (html !== readFileSync(file, 'utf8')) writeFileSync(file, html);
  const registryFile=join(root,'js/core/service-registry.js');
  const registry=readFileSync(registryFile,'utf8');
  const updatedRegistry=registry.replace(/(featureKey: "premium-sibyl-dominator",\s*price: ")[^"]*(")/, '$1'+sibyl.pricing.amountKRW.toLocaleString('ko-KR')+'원$2');
  if(updatedRegistry!==registry) writeFileSync(registryFile,updatedRegistry);
}
