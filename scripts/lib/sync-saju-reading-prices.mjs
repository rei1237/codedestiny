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
  for (const featureKey of ['section_daewun', 'section_summary']) {
    const result = getBillingFeaturePricing({ featureKey });
    if (!result.ok || !Number.isSafeInteger(result.pricing.amountKRW)) throw new Error(`Missing price: ${featureKey}`);
    const { amountKRW, cost } = result.pricing;
    updated = updated.replace(new RegExp(`(lockKey:'${featureKey}',\\s*coinCost:)\\d+`, 'g'), `$1${cost}`);
    html = html.replace(new RegExp(`(<span\\b[^>]*data-saju-price-key="${featureKey}"[^>]*>)[^<]*(</span>)`, 'g'), `$1${amountKRW.toLocaleString('ko-KR')}원$2`);
    html = html.replace(new RegExp(`<button\\b(?=[^>]*data-unlock-key="${featureKey}")[^>]*>`, 'g'), tag =>
      tag.replace(/data-unlock-cost="\d+"/, `data-unlock-cost="${cost}"`));
  }
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
