import { CONSULTATION_RECOVERY_ADAPTERS } from '../../worker/lib/consultation-recovery-registry.js';
// Classifies every LIVE catalog product by how its paid result is delivered.
// Markers prove static wiring only; liveValidation stays UNVERIFIED until a real delivery is observed.
import fs from 'node:fs';
import { listProducts } from '../../worker/payments/catalog.js';
import {
  HISTORICAL_PAID_FEATURE_FIXTURES,
  PAID_NON_LLM_DELIVERY_FIXTURES,
  PAID_NON_RESULT_FIXTURES,
  REGISTRY_ONLY_NON_LLM_KEYS,
} from '../../__tests__/fixtures/paid-non-llm-delivery-fixtures.mjs';
import { PAID_NARRATIVE_SERVER_RESUME_FEATURE_KEYS } from '../../worker/lib/paid-narrative-adapters.js';

export const LLM_DELIVERY_KINDS=Object.freeze(['paid-narrative','chapter-checkpoint','section-checkpoint','route-delivery']);
export const LLM_DELIVERY_ADAPTERS=Object.freeze([
  [/^(?:yeongnyangi-|fortune-chat-question-(?:mackerel|salmon|flounder|tuna)$)/, 'worker/yeongnyangi/service.ts','worker/yeongnyangi/recovery.js','chapter-checkpoint'],
  [/^(ziwei_ai_prompt_generator|astrology_ai_prompt_generator|vedic_ai_prompt_generator|sukuyo_ai_prompt_generator)$/, 'worker/lib/feature-question-delivery.js',null,'paid-narrative'],
  // handleSajuAIPrompt: PaidExecutionRecord section checkpoints; only the client resumes via resumeJobId.
  [/^saju_ai_question_prompt$/, 'worker/routes/fortune.js',null,'section-checkpoint'],
  [/^tarot-love-relationship$/, 'worker/lib/love-tarot-delivery.js',null,'paid-narrative'],
  [/^tarot-mindscan$/, 'worker/lib/mindscan-delivery.js',null,'paid-narrative'],
  [/^tarot-prompt-maker(?:-standard|-deep|-master)?$/, 'worker/lib/tarot-oracle-delivery.js',null,'paid-narrative'],
  [/^geomancy$/, 'worker/routes/oracle.js',null,'paid-narrative'],
  [/^dream-psycho-analysis$/, 'worker/routes/dream.js',null,'paid-narrative'],
  [/^yoga-guru-per-use$/, 'worker/routes/yoga-guru.js',null,'paid-narrative'],
  [/^compat-saju-compatibility$/, 'worker/routes/saju-compat-basic.js',null,'paid-narrative'],
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
  // human-design-chart and palm-reading-ai-consult are discontinued sale keys (HISTORICAL_PAID_FEATURE_FIXTURES).
  [/^human-design-report$/, 'worker/routes/human-design-report.js',null,'route-delivery'],
  [/^destiny-compass-deep-report$/, 'worker/routes/destiny-compass-ai.js',null,'route-delivery'],
  [/^tarot-celestial-harmony$/, 'worker/lib/celestial-report-delivery.js','worker/lib/consultation-recovery-task.js','route-delivery'],
  [/^premium-naming-prompt$/, 'worker/routes/naming-prompt.js',null,'route-delivery'],
  [/^life-(book|fortune)-ai-consultation$/, 'worker/routes/life-book-ai.js',null,'route-delivery'],
  [/^neo-operation-room-consultation$/, 'worker/routes/neo-operation-room.js',null,'route-delivery'],
  [/^new-year-ai-consultation$/, 'worker/routes/new-year-ai.js',null,'route-delivery'],
  [/^love-secret-ai-consultation$/, 'worker/routes/love-secret-ai.js',null,'route-delivery'],
  [/^relationship-boundary-test$/, 'worker/routes/relationship-boundary-test.js',null,'route-delivery'],
  [/^karma-destiny-ai-consultation$/, 'worker/routes/karma-destiny-ai.js',null,'route-delivery'],
  [/^ziwei-island-palace-consult$/, 'worker/routes/ziwei-island-ai.js',null,'route-delivery'],
  [/^palm-reading-general$/, 'worker/routes/palm.js',null,'route-delivery'],
  [/^fortune-chat-consultation$/, 'worker/routes/fortune-chat.js',null,'route-delivery'],
]);
// Sale keys whose paid result is generated under another feature key.
export const LLM_SALE_KEY_ALIASES=Object.freeze([
  {featureKey:'openGeomancyOracle',deliveryFeatureKey:'geomancy',
    cta:{file:'geomancy-oracle-v4.html',marker:"const GEOMANCY_FEATURE_KEY = 'openGeomancyOracle';"},
    consumer:{file:'worker/routes/oracle.js',marker:'...geomancyNarrativeAdapter(env), featureKey: "geomancy",'}},
]);

const byKey=rows=>new Map(rows.map(row=>[row.featureKey,row]));
const deterministic=byKey(PAID_NON_LLM_DELIVERY_FIXTURES);
const historical=byKey(HISTORICAL_PAID_FEATURE_FIXTURES);
const nonResult=byKey(PAID_NON_RESULT_FIXTURES);
const saleAliases=byKey(LLM_SALE_KEY_ALIASES);

function deliveryCandidates(featureKey){
  const alias=saleAliases.get(featureKey);
  const deliveryKey=alias?.deliveryFeatureKey || featureKey;
  const llm=LLM_DELIVERY_ADAPTERS.filter(([pattern])=>pattern.test(deliveryKey)).map(([,generation,recovery,kind])=>({
    deliveryKind:kind,...(alias?{deliveryFeatureKey:deliveryKey}:{}),generation,
    serverRecovery:recovery || (PAID_NARRATIVE_SERVER_RESUME_FEATURE_KEYS.includes(deliveryKey)?'worker/lib/paid-narrative-recovery-task.js':null),
    stalledMonitor:kind==='paid-narrative'?'worker/lib/paid-narrative-monitor.js':null,
    evidence:alias?{cta:alias.cta,consumer:alias.consumer}:null,
  }));
  const fixture=deterministic.get(featureKey), past=historical.get(featureKey), action=nonResult.get(featureKey);
  return [...llm,
    fixture && {deliveryKind:'deterministic',generation:fixture.consumer.file,evidence:{cta:fixture.cta,consumer:fixture.consumer}},
    past && {deliveryKind:'historical',generation:null,evidence:{retained:past.retained,replacement:past.replacement}},
    REGISTRY_ONLY_NON_LLM_KEYS.includes(featureKey) && {deliveryKind:'registry-only',generation:null,evidence:null},
    action && {deliveryKind:'non-result',generation:action.consumer.file,evidence:{cta:action.cta,consumer:action.consumer}},
  ].filter(Boolean);
}

export function buildPaidDeliveryInventory(products=listProducts()){
  const inventory=JSON.parse(fs.readFileSync('docs/payments/payment-p0-inventory.json','utf8'));
  const catalogKeys=new Set(products.map(product=>product.featureKey));
  const rows=products.map(product=>{
    const candidates=deliveryCandidates(product.featureKey);
    const match=candidates.length===1?candidates[0]:{};
    const sources=(inventory.products.find(row=>row.featureKey===product.featureKey)?.sources || []).filter(file=>fs.existsSync(file));
    return {...product,
      deliveryKind:match.deliveryKind || (candidates.length?'AMBIGUOUS':'NEEDS_INSPECTION'),
      ...(match.deliveryFeatureKey?{deliveryFeatureKey:match.deliveryFeatureKey}:{}),
      ...(candidates.length>1?{conflictingKinds:candidates.map(row=>row.deliveryKind)}:{}),
      generation:match.generation || null,
      serverRecovery:match.serverRecovery || (CONSULTATION_RECOVERY_ADAPTERS.some(([route])=>match.generation===`worker/routes/${route}.js`)?'worker/lib/consultation-recovery-task.js':null),
      deliveryReadyBeforePayment:product.featureKey==='palm-reading-general',
      stalledMonitor:match.stalledMonitor || null,
      evidence:match.evidence || null,
      paymentCore:'worker/payments/index.js',
      candidateSources:sources.filter(file=>file.startsWith('worker/routes/')||file.startsWith('worker/lib/')),
      liveValidation:'UNVERIFIED',
    };
  });
  const keysOf=kind=>rows.filter(row=>row.deliveryKind===kind).map(row=>row.featureKey);
  const evidenceKeys=[...deterministic.keys(),...historical.keys(),...nonResult.keys(),...saleAliases.keys(),...REGISTRY_ONLY_NON_LLM_KEYS];
  const deliveryKindCounts={};
  for(const row of rows)deliveryKindCounts[row.deliveryKind]=(deliveryKindCounts[row.deliveryKind]||0)+1;
  return {catalogCount:rows.length,yeongnyangiCount:rows.filter(row=>row.featureKey.startsWith('yeongnyangi-')).length,
    deliveryKindCounts,
    missingDeliveryMappings:keysOf('NEEDS_INSPECTION'),
    ambiguousDeliveryMappings:keysOf('AMBIGUOUS'),
    invalidMappings:rows.filter(row=>row.generation&&!fs.existsSync(row.generation)).map(row=>row.featureKey),
    staleEvidenceKeys:evidenceKeys.filter(key=>!catalogKeys.has(key)),
    unusedLlmAdapters:LLM_DELIVERY_ADAPTERS.filter(([pattern])=>![...catalogKeys].some(key=>pattern.test(key))).map(([pattern])=>String(pattern)),
    backgroundRecoveryNotMapped:rows.filter(row=>row.deliveryKind==='paid-narrative'&&!row.serverRecovery).map(row=>row.featureKey),
    llmWithoutServerRecovery:rows.filter(row=>LLM_DELIVERY_KINDS.includes(row.deliveryKind)&&!row.serverRecovery&&!row.deliveryReadyBeforePayment).map(row=>row.featureKey),
    allProductsVerified:false,products:rows};
}

export const inventoryIsComplete=report=>['missingDeliveryMappings','ambiguousDeliveryMappings','invalidMappings','staleEvidenceKeys','unusedLlmAdapters']
  .every(field=>report[field].length===0);
