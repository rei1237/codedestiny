// Read-only coverage audit against the LIVE code catalog, not the old snapshot.
// Exit 2 means unmapped products remain; candidate source references are not proof.
import fs from 'node:fs';
import { listProducts } from '../worker/payments/catalog.js';
import { PAID_NON_LLM_DELIVERY_FIXTURES } from '../__tests__/fixtures/paid-non-llm-delivery-fixtures.mjs';
const inventory=JSON.parse(fs.readFileSync('docs/payments/payment-p0-inventory.json','utf8'));
const staticProducts=new Map(PAID_NON_LLM_DELIVERY_FIXTURES.map(row=>[row.featureKey,row]));
const adapters=[
  [/^yeongnyangi-/, 'worker/yeongnyangi/service.ts','worker/yeongnyangi/recovery.js','chapter-checkpoint'],
  [/^(saju_ai_question_prompt|ziwei_ai_prompt_generator|astrology_ai_prompt_generator|vedic_ai_prompt_generator|sukuyo_ai_prompt_generator)$/, 'worker/lib/feature-question-delivery.js',null,'paid-narrative'],
  [/^tarot-love-relationship$/, 'worker/lib/love-tarot-delivery.js',null,'paid-narrative'],
  [/^tarot-mindscan$/, 'worker/lib/mindscan-delivery.js',null,'paid-narrative'],
  [/^tarot-prompt-maker(?:-standard|-deep|-master)?$/, 'worker/lib/tarot-oracle-delivery.js',null,'paid-narrative'],
  [/^geomancy$/, 'worker/routes/oracle.js',null,'paid-narrative'],
  [/^dream-psycho-analysis$/, 'worker/routes/dream.js',null,'paid-narrative'],
  [/^yoga-guru-per-use$/, 'worker/routes/yoga-guru.js',null,'paid-narrative'],
  [/^pet-(saju-ai-consultation|compatibility-ai)$/, 'worker/routes/pet-saju-ai.js',null,'paid-narrative'],
  [/^animal-totem-(basic|deep)$/, 'worker/routes/animal-totem.js',null,'paid-narrative'],
  [/^master-love-codex(?:-compat)?$/, 'worker/routes/master-love-codex.js','worker/lib/master-love-codex-recovery-task.js','chapter-checkpoint'],
  [/^fusion-fortune-consultation$/, 'worker/routes/fusion-fortune.js','worker/lib/fusion-fortune-recovery-task.js','section-checkpoint'],
  [/^ziwei-deep-pdf$/, 'worker/routes/ziwei-deep-report.js','worker/lib/ziwei-deep-report-recovery-task.js','section-checkpoint'],
  [/^fortune-tea-house-.*-consultation$/, 'worker/routes/fortune-tea-house.js',null,'route-delivery'],
  [/^vedic-ai-consultation$/, 'worker/routes/vedic-ai.js',null,'route-delivery'],
  [/^astrology-ai-consultation$/, 'worker/routes/astrology-ai.js',null,'route-delivery'],
  [/^ziwei-ai-consultation$/, 'worker/routes/ziwei-ai.js',null,'route-delivery'],
  [/^sukuyo-compatibility-ai$/, 'worker/routes/sukuyo-compatibility-ai.js',null,'route-delivery'],
  [/^nakshatra-ai-consultation$/, 'worker/routes/nakshatra-ai.js',null,'route-delivery'],
  [/^human-design-(chart|report)$/, 'worker/routes/human-design-report.js',null,'route-delivery'],
  [/^destiny-compass-deep-report$/, 'worker/routes/destiny-compass-ai.js',null,'route-delivery'],
  [/^tarot-celestial-harmony$/, 'worker/lib/celestial-report-delivery.js',null,'route-delivery'],
  [/^premium-naming-prompt$/, 'worker/routes/naming-prompt.js',null,'route-delivery'],
  [/^life-(book|fortune)-ai-consultation$/, 'worker/routes/life-book-ai.js',null,'route-delivery'],
  [/^neo-operation-room-consultation$/, 'worker/routes/neo-operation-room.js',null,'route-delivery'],
  [/^new-year-ai-consultation$/, 'worker/routes/new-year-ai.js',null,'route-delivery'],
  [/^love-secret-ai-consultation$/, 'worker/routes/love-secret-ai.js',null,'route-delivery'],
  [/^relationship-boundary-test$/, 'worker/routes/relationship-boundary-test.js',null,'route-delivery'],
  [/^karma-destiny-ai-consultation$/, 'worker/routes/karma-destiny-ai.js',null,'route-delivery'],
  [/^ziwei-island-palace-consult$/, 'worker/routes/ziwei-island-ai.js',null,'route-delivery'],
  [/^palm-reading-(general|ai-consult)$/, 'worker/routes/palm.js',null,'route-delivery'],
  [/^fortune-chat-consultation$/, 'worker/routes/fortune-chat.js',null,'route-delivery'],
];
const rows=listProducts().map(product=>{
  const adapter=adapters.find(([pattern])=>pattern.test(product.featureKey));
  const deterministic=staticProducts.get(product.featureKey);
  const sources=(inventory.products.find(row=>row.featureKey===product.featureKey)?.sources || []).filter(file=>fs.existsSync(file));
  return {...product,deliveryKind:adapter?.[3] || (deterministic?'deterministic':'NEEDS_INSPECTION'),
    generation:adapter?.[1] || deterministic?.consumer.file || null,
    serverRecovery:adapter?.[2] || null,
    stalledMonitor:adapter?.[3]==='paid-narrative'?'worker/lib/paid-narrative-monitor.js':null,
    paymentCore:'worker/payments/index.js',
    candidateSources:sources.filter(file=>file.startsWith('worker/routes/')||file.startsWith('worker/lib/')),
    liveValidation:'UNVERIFIED',
  };
});
const missing=rows.filter(row=>row.deliveryKind==='NEEDS_INSPECTION').map(row=>row.featureKey);
const invalid=rows.filter(row=>row.generation&&!fs.existsSync(row.generation)).map(row=>row.featureKey);
console.log(JSON.stringify({catalogCount:rows.length,yeongnyangiCount:rows.filter(row=>row.featureKey.startsWith('yeongnyangi-')).length,
  missingDeliveryMappings:missing,invalidMappings:invalid,
  backgroundRecoveryNotMapped:rows.filter(row=>row.deliveryKind==='paid-narrative'&&!row.serverRecovery).map(row=>row.featureKey),
  allProductsVerified:false,products:rows},null,2));
if(missing.length||invalid.length)process.exitCode=2;
