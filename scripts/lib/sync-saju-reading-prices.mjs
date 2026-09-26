import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getBillingFeaturePricing } from '../../worker/lib/billing-feature-registry.js';

// Presentation seeds use the same resolver as billing; no second price table.
export function syncSajuReadingPrices(root) {
  const file = join(root, 'index.html');
  let html = readFileSync(file, 'utf8');
  for (const featureKey of ['section_daewun', 'section_summary']) {
    const result = getBillingFeaturePricing({ featureKey });
    if (!result.ok || !Number.isSafeInteger(result.pricing.amountKRW)) throw new Error(`Missing price: ${featureKey}`);
    const { amountKRW, cost } = result.pricing;
    html = html.replace(new RegExp(`(<span\\b[^>]*data-saju-price-key="${featureKey}"[^>]*>)[^<]*(</span>)`, 'g'), `$1${amountKRW.toLocaleString('ko-KR')}원$2`);
    html = html.replace(new RegExp(`<button\\b(?=[^>]*data-unlock-key="${featureKey}")[^>]*>`, 'g'), tag =>
      tag.replace(/data-unlock-cost="\d+"/, `data-unlock-cost="${cost}"`));
  }
  if (html !== readFileSync(file, 'utf8')) writeFileSync(file, html);
}
