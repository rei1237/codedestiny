import './lib/mock-network-guard.cjs';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { GEMINI_INPUT_TOKEN_HARD_LIMIT } from '../lib/gemini-input-token-limit.mjs';
import { AUTOMATIC_CHAPTER_ATTEMPTS, SYSTEM_CHAPTER_RETRY_GRANT, MANUAL_CHAPTER_RECOVERY_LIMIT } from '../worker/yeongnyangi/chapter-retry-policy.js';

// Offline planning only: provider caps are deliberately more conservative than
// average use. Nothing here enables sales or supplies reviewed cost evidence.
const root = fileURLToPath(new URL('../', import.meta.url));
const read = name => readFileSync(path.join(root, name), 'utf8');
const sourceNumber = (name, expression) => {
  const value = Number(read(name).match(expression)?.[1]);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`Cost contract changed: ${name}`);
  return value;
};
const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  if (!/^--[a-z-]+=\d+(?:\.\d+)?$/.test(arg)) throw new Error(`Invalid argument: ${arg}`);
  const [key, value] = arg.slice(2).split('=');
  return [key, Number(value)];
}));
const defaults = { 'krw-per-usd': 1400, 'vat-rate': 0.1, 'pg-rate': 0.04, 'operations-per-consultation-krw': 50, 'fixed-monthly-usd': 70, 'fixed-monthly-krw': null, 'target-operating-margin': 0.3, 'monthly-paid-packs': 50 };
for (const key of Object.keys(args)) if (!(key in defaults)) throw new Error(`Unknown assumption: ${key}`);
const assumptions = { ...defaults, ...args };
if (!Object.hasOwn(args, 'fixed-monthly-krw')) assumptions['fixed-monthly-krw'] = assumptions['fixed-monthly-usd'] * assumptions['krw-per-usd'];
if (!(assumptions['monthly-paid-packs'] > 0) || !(assumptions['krw-per-usd'] > 0) || assumptions['pg-rate'] >= 1 || assumptions['vat-rate'] >= 1 || assumptions['target-operating-margin'] >= 1) throw new Error('Invalid financial assumptions');
const tariff = JSON.parse(read('config/llm-tariffs-20260921.json'))['gemini/gemini-2.5-flash'];
const attempts = AUTOMATIC_CHAPTER_ATTEMPTS + SYSTEM_CHAPTER_RETRY_GRANT + MANUAL_CHAPTER_RECOVERY_LIMIT;
const analysisOutput = sourceNumber('worker/yeongnyangi/providers/code-destiny.ts', /temperature:0,maxOutputTokens:(\d+)/);
const maximumQuestions = sourceNumber('worker/yeongnyangi/fortune/consultation.ts', /units\.length\s*>\s*(\d+)/);
const built = await build({ stdin: { contents: `
  export {products} from './worker/yeongnyangi/payments/catalog';
  export {topicIds} from './worker/yeongnyangi/fortune/topics';
  export {readingManifest} from './worker/yeongnyangi/fortune/reading-manifest';
  export {READING_VERSION} from './worker/yeongnyangi/fortune/reading-policy';
  export {spiritManifest} from './worker/yeongnyangi/fortune/spirit';
  export {questionSkyTwoStageManifest} from './worker/yeongnyangi/fortune/question-sky-reading';
  export {consultationManifest,consultationKinds,consultationDomain,supportsKind} from './worker/yeongnyangi/fortune/consultation-kinds';
  export {hasReadingSections,isStructuredReading,READING_V7_VERSION,readingPolicies} from './worker/yeongnyangi/fortune/reading-policy';
  export {conciseReadingManifest,isConciseReading,conciseOutputTokens,CONCISE_READING_VERSION} from './worker/yeongnyangi/fortune/concise-reading';
  export {v7OutputTokens} from './worker/yeongnyangi/fortune/reading-v7-prompt';
  export {tokensRequiredForChars} from './worker/lib/llm-budget.js';
  export {chapterOutputTokenBudget,CHAPTER_THINKING_BUDGET} from './worker/yeongnyangi/providers/code-destiny';
`, resolveDir: root, loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', write: false });
const Module = createRequire(import.meta.url)('node:module');
const loaded = new Module(path.join(root, 'yeongnyangi-cost-plan.cjs'));
loaded.filename = path.join(root, 'yeongnyangi-cost-plan.cjs');
loaded.paths = Module._nodeModulePaths(root);
loaded._compile(built.outputFiles[0].text, loaded.filename);
const runtime = loaded.exports;
const round = value => Math.round(value * 100) / 100;
const callCost = output => (GEMINI_INPUT_TOKEN_HARD_LIMIT * tariff.inputUsdPerMillion + output * tariff.outputUsdPerMillion) / 1e6 * assumptions['krw-per-usd'];
function chapterOutput(chapter, questions) {
  if (runtime.isConciseReading(chapter)) return runtime.chapterOutputTokenBudget(runtime.conciseOutputTokens(chapter, questions), chapter.outputBudgetVersion);
  const base = runtime.isConciseReading(chapter) ? chapter.outputTokens : runtime.isStructuredReading(chapter.version) && chapter.tier
    ? Math.max(chapter.outputTokens || 0, runtime.readingPolicies[chapter.tier].outputTokens)
    : chapter.outputTokens;
  const structured = chapter.version === runtime.READING_V7_VERSION
    ? runtime.v7OutputTokens(chapter, questions)
    : Math.max(base || 0, runtime.tokensRequiredForChars((chapter.targetChars?.[1] || 0) + 600 + questions * 480));
  if (runtime.hasReadingSections(chapter.version) && structured > 24576) throw new Error(`Unreachable chapter budget: ${chapter.id}`);
  const requested = runtime.hasReadingSections(chapter.version) ? structured
    : questions ? Math.min(16384, Math.max(base || 8192, runtime.tokensRequiredForChars((chapter.targetChars?.[1] || 2000) + questions * 480))) : base;
  return runtime.chapterOutputTokenBudget(requested, chapter.outputBudgetVersion);
}
const products = runtime.products.map(product => {
  const kinds = [undefined, ...(runtime.consultationKinds[runtime.consultationDomain(product)] || []).filter(kind => runtime.supportsKind(product, kind))];
  const originals = kinds.flatMap(kind => runtime.topicIds.map(topic => ({kind:kind?.id || 'legacy-client',topic,original:runtime.consultationManifest(product,kind,topic)})));
  if(product.id==='saju_mackerel') originals.push({kind:'spirit-v1',topic:'symbolic',original:runtime.spiritManifest(runtime.readingManifest(product,'relationship','personal',runtime.READING_VERSION))});
  if(product.id==='saju_flounder') originals.push({kind:'prashna-v1',topic:'symbolic',original:runtime.questionSkyTwoStageManifest({domain:'vedic',facts:[]})});
  const variantsFor = concise => originals.map(({kind,topic,original}) => {
    const manifest = concise ? runtime.conciseReadingManifest(original) : original;
    // All eight questions are assigned to the first chapter by consultation.ts.
    // Include the full recovery ceiling for analysis as well, even when a checkpoint
    // normally reduces that to one. A cached/reused response receives no discount.
    const outputs = manifest.map((chapter, index) => chapterOutput(chapter, index === 0 ? maximumQuestions : 0));
    const oneAttemptCost = outputs.reduce((sum, output) => sum + callCost(output), 0) + callCost(analysisOutput);
    const llmCost = attempts * oneAttemptCost;
    // Design comparison only: one retry for the whole generated book, while
    // conservatively retaining the full analysis budget. This comparison never
    // changes the runtime's shared chapter recovery ceiling.
    const singleBookRetryCost = outputs.reduce((sum,output)=>sum+callCost(output),0) + Math.max(...outputs.map(callCost)) + attempts*callCost(analysisOutput);
    return { kind, topic, chapters: manifest.length, maximumGenerationCalls: attempts * (manifest.length + 1), maximumOutputTokens: Math.max(...outputs), llmCost, oneAttemptCost, singleBookRetryCost };
  });
  const maximum = variants => variants.reduce((left, right) => left.llmCost >= right.llmCost ? left : right);
  const variants=variantsFor(true),worst = maximum(variants), legacy = maximum(variantsFor(false));
  return { id: product.id, fishId:product.fishId, evaluatedManifestVariants:originals.length, firstAttemptSuccessCapScenarioKRW:round(Math.max(...variants.map(variant=>variant.oneAttemptCost))+assumptions['operations-per-consultation-krw']), hypotheticalSingleBookRetryCapScenarioKRW:round(Math.max(...variants.map(variant=>variant.singleBookRetryCost))+assumptions['operations-per-consultation-krw']), featureKey: product.cdFeatureKey, priceKRW: product.priceKRW,
    legacySnapshotCapScenarioKRW: round(legacy.llmCost + assumptions['operations-per-consultation-krw']),
    ...worst, llmCapScenarioKRW: round(worst.llmCost), operationsProvisionKRW: assumptions['operations-per-consultation-krw'],
    totalCapScenarioKRW: round(worst.llmCost + assumptions['operations-per-consultation-krw']) };
});
// Entry tier = mackerel. Its LLM cost does not depend on the sale price, so the price rise
// (2026-10-05, 1,000 → 9,900) does not move these offline scenarios.
const welcome = products.filter(product => product.fishId === 'mackerel');
// Dedicated packs are offline candidates only: no price, expiry, renewal or
// redemption policy is created by this arithmetic. Monthly sales are scenarios.
const entryCost = Math.max(...welcome.map(product => product.totalCapScenarioKRW));
const fixedMonthly = assumptions['fixed-monthly-krw'];
const packScenarios = [[5000,7],[5000,6],[5900,7],[7900,9],[9900,11]].map(([priceKRW,consultations])=>{
  const netRevenue = priceKRW / (1 + assumptions['vat-rate']) - priceKRW * assumptions['pg-rate'];
  const contribution = netRevenue - consultations * entryCost;
  const atVolume = (monthlyPaidPacks,signupRedemptions)=>{
    const sales = monthlyPaidPacks * priceKRW;
    const expense = fixedMonthly + signupRedemptions * entryCost;
    const operatingProfit = monthlyPaidPacks * contribution - expense;
    // The same per-consultation scenario is charged to paid redemptions and CAC.
    const targetCostCeiling = (monthlyPaidPacks * (netRevenue - priceKRW * assumptions['target-operating-margin']) - fixedMonthly) / (monthlyPaidPacks * consultations + signupRedemptions);
    return {monthlyPaidPacks,signupRedemptions,grossSalesKRW:sales,signupAcquisitionCostKRW:round(signupRedemptions*entryCost),
      operatingProfitScenarioKRW:round(operatingProfit),grossSalesOperatingMargin:operatingProfit/sales,
      maximumConsultationCostForTargetMarginKRW:round(targetCostCeiling),targetMet:operatingProfit/sales>=assumptions['target-operating-margin']};
  };
  const noReserveCost = entryCost - assumptions['operations-per-consultation-krw'];
  const noReserveContribution = netRevenue - consultations * noReserveCost;
  return {priceKRW,consultations,discountToDirect:1-priceKRW/(consultations*1000),unitPriceKRW:round(priceKRW/consultations),
    contributionBeforeFixedKRW:round(contribution),breakEvenMonthlyPacksWithoutSignup:contribution>0?Math.ceil(fixedMonthly/contribution):null,
    infiniteVolumeMarginWithoutSignup:contribution/priceKRW,
    noVariableReserveSensitivity:{consultationCostKRW:round(noReserveCost),contributionBeforeFixedKRW:round(noReserveContribution),breakEvenMonthlyPacksWithoutSignup:noReserveContribution>0?Math.ceil(fixedMonthly/noReserveContribution):null},
    monthlyScenarios:[50,100,300,1000].flatMap(count=>[0,50,100,300].map(signups=>atVolume(count,signups)))};
});
const fishCosts = ['mackerel','salmon','flounder','tuna'].map(fishId=>{
  const group=products.filter(product=>product.fishId===fishId);
  return {fishId,facePriceKRW:group[0].priceKRW,eligibleProducts:group.map(product=>product.id),
    evaluatedManifestVariants:group.reduce((sum,product)=>sum+product.evaluatedManifestVariants,0),
    fullRecoveryPerChapterKRW:Math.max(...group.map(product=>product.totalCapScenarioKRW)),
    firstAttemptSuccessKRW:Math.max(...group.map(product=>product.firstAttemptSuccessCapScenarioKRW)),
    hypotheticalOneBookRetryKRW:Math.max(...group.map(product=>product.hypotheticalSingleBookRetryCapScenarioKRW))};
});
const fishPackCandidates = [['mackerel',19900,25],['salmon',11900,5],['flounder',19900,5],['tuna',39900,5]].map(([fishId,priceKRW,consultations])=>{
  const costs=fishCosts.find(cost=>cost.fishId===fishId);
  const netRevenue=priceKRW/(1+assumptions['vat-rate'])-priceKRW*assumptions['pg-rate'];
  const fixedAllocation=fixedMonthly/assumptions['monthly-paid-packs'];
  const regimes=Object.fromEntries(['fullRecoveryPerChapterKRW','firstAttemptSuccessKRW','hypotheticalOneBookRetryKRW'].map(key=>{
    const contribution=netRevenue-consultations*costs[key];
    const profit=contribution-fixedAllocation;
    return [key,{consultationCostKRW:costs[key],contributionBeforeFixedKRW:round(contribution),allocatedMonthlyFixedPerPackKRW:round(fixedAllocation),
      operatingProfitPerPackWithoutSignupKRW:round(profit),grossSalesOperatingMarginWithoutSignup:profit/priceKRW,targetMetWithoutSignup:profit/priceKRW>=assumptions['target-operating-margin']}];
  }));
  return {fishId,priceKRW,consultations,discountToDirect:1-priceKRW/(consultations*costs.facePriceKRW),regimes,
    thirtyPercentMarginPossibleBelowDirectPriceEvenAtInfiniteVolume:costs.fullRecoveryPerChapterKRW<costs.facePriceKRW*(1/(1+assumptions['vat-rate'])-assumptions['pg-rate']-assumptions['target-operating-margin'])};
});
const mixes = [{name:'approximately_equal',counts:{mackerel:13,salmon:13,flounder:12,tuna:12}},
  {name:'mackerel_heavy',counts:{mackerel:35,salmon:5,flounder:5,tuna:5}},
  {name:'all_mackerel',counts:{mackerel:50,salmon:0,flounder:0,tuna:0}}].map(mix=>{
  const sales=fishPackCandidates.reduce((sum,pack)=>sum+mix.counts[pack.fishId]*pack.priceKRW,0);
  const contribution=fishPackCandidates.reduce((sum,pack)=>sum+mix.counts[pack.fishId]*(pack.priceKRW/(1+assumptions['vat-rate'])-pack.priceKRW*assumptions['pg-rate']-pack.consultations*fishCosts.find(cost=>cost.fishId===pack.fishId).fullRecoveryPerChapterKRW),0);
  return {...mix,totalPacks:50,grossSalesKRW:sales,scenarios:[0,50,100,300].map(signupRedemptions=>{
    const profit=contribution-fixedMonthly-signupRedemptions*entryCost;
    return {signupRedemptions,signupAcquisitionCostKRW:round(signupRedemptions*entryCost),operatingProfitScenarioKRW:round(profit),grossSalesOperatingMargin:profit/sales};
  })};
});
console.log(JSON.stringify({ basis: 'offline_cap_scenario_not_measured_profit_or_sale_approval', reviewedCostEvidencePresent: false, assumptions,
  policyEvaluation: { mode:'dedicated_pack_proposal_not_runtime', approvedSaleTerms:false },
  tariff: { model: 'gemini-2.5-flash', inputUsdPerMillion: tariff.inputUsdPerMillion, outputUsdPerMillion: tariff.outputUsdPerMillion, sourceRefs: tariff.sourceRefs },
  runtimeBounds: { readingProfile: runtime.CONCISE_READING_VERSION, storedSnapshotsRetainOriginalBudgets: true, inputTokens: GEMINI_INPUT_TOKEN_HARD_LIMIT, attemptsPerChapter: attempts, thinkingTokens: runtime.CHAPTER_THINKING_BUDGET, providerFallback: false },
  signup: { revenueKRW: 0, stones: 500, maximumConsultations: welcome.length ? 1 : 0, acquisitionCostCapScenarioKRW: welcome.length ? round(Math.max(...welcome.map(product => product.totalCapScenarioKRW))) : null },
  exclusions: ['Saved pre-optimization manifests retain their higher original budgets; these new-purchase costs do not bound those older orders.', 'Other Ggulggul product costs are not evaluated here.', 'Pack discounts assume every included consultation is used; partial use, coupons and discounts are excluded.', 'No measured PG, server, MongoDB, storage, support, refund or exchange-rate evidence.', 'Unknown provider-model overrides and repeated failed orders can exceed this per-order scenario.'],
  fishPackEvaluation: {mode:'proposal_not_runtime',monthlyPaidPacks:assumptions['monthly-paid-packs'],scope:'Six systems at the same fish tier; fusion excluded. Exact sale terms and implementation are pending.',warning:'Mix profits never prove the mackerel candidate meets the per-product margin target. Shared book retry is hypothetical and does not change runtime recovery.',costs:fishCosts,packs:fishPackCandidates,monthlyFiftyPackMixes:mixes},
  dedicatedPackEvaluation: {mode:'proposal_not_runtime',fixedServerCostBasis:'User reported approximately USD 70 per month; FX is an assumption, not an invoice.',variableReserveBasis:'The per-consultation reserve is an unmeasured extra variable allowance. It can overlap the fixed server bill if that bill includes the same costs.',targetMarginBasis:'Operating profit divided by gross sales, before owner salary and corporate income tax.',termAndExpiry:'Not defined or implemented',packs:packScenarios},
  products: products.map(({ llmCost, oneAttemptCost, singleBookRetryCost, ...product }) => product) }, null, 2));
