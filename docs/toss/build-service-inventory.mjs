// Local planning tool only. Source registries are not imported into the miniapp.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {SAJU_BUNDLE_ALIAS_MEMBER_KEYS,SAJU_BUNDLE_SALE_CLOSED_KEYS,SAJU_BUNDLE_FEATURE_KEY} from '../../worker/lib/saju-bundle-policy.js';
import {loadTsModule} from '../../scripts/lib/load-ts-module.mjs';
import {extractObjectLiteral} from '../../scripts/lib/feature-marketing-extract.mjs';
import {TOSS_TAROT_LIBRARY_FLOWS} from '../../lib/tarot/toss-library-flows.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const context={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'js/core/service-registry.js'),'utf8'),context);
const react=loadTsModule('app/_lib/serviceFeatureRegistry.ts').SERVICE_FEATURES;
const visual=extractObjectLiteral(fs.readFileSync(path.join(root,'index.html'),'utf8'),'FEATURE_VISUAL_DETAILS');
const sources=[
 ...context.window.__cdServiceRegistry.map(v=>({source:'home-registry',id:v.id,name:v.name,entry:v.href||v.action,featureKey:v.featureKey||null,accessEvidence:v.price||null})),
 ...react.map(v=>({source:'react-registry',id:v.slug,name:v.title,entry:v.launchRoute,featureKey:v.featureKey||null,accessEvidence:v.accessType})),
 ...Object.entries(visual).map(([id,v])=>({source:'shell-visual-details',id,name:v.title||id,entry:v.href||v.sourceAction||null,featureKey:v.featureKey||null,accessEvidence:null})),
];
const ids=new Map();
for(const item of sources){
 if(!ids.has(item.id))ids.set(item.id,{id:item.id,name:item.name,evidence:[],toss:{screen:'not-ported',login:'not-verified',iapSku:null,result:'not-verified',library:'not-verified',device:'not-tested'}});
 ids.get(item.id).evidence.push(item);
}
// Explicitly requested surfaces that can be absent from the discovery registries.
for(const [id,name,entry] of [['flower','운명의 꽃','app/flower/page.tsx'],['yeongnyangi','영냥이','app/yeongnyangi/page.tsx']]){
 if(!ids.has(id))ids.set(id,{id,name,evidence:[{source:entry,entry:'/'+id+'/'}],toss:{screen:id==='yeongnyangi'?'saju-preview-only':'not-ported',login:'not-verified',iapSku:null,result:'not-verified',library:'not-verified',device:'not-tested'}});
}
const rows=[...ids.values()].sort((a,b)=>a.id.localeCompare(b.id));
const aliases={
 'destiny-flower':'flower','astrology-flower':'flower','ziwei-flower':'flower','sukuyo-flower':'flower',
 sukyo:'sukuyo','stonehenge-rune':'stonehenge-runes','love-simulation':'love-code',
 'daily-fortune':'today-hub','saju-lifebook':'life-book-ai','animal-guardian-unlock':'animal-destiny','saju-animal':'saju-guardian',
};
const aliasEvidence={
 flower:['app/flower/destiny/page.tsx','app/flower/astrology/page.tsx','app/flower/jamidusu/page.tsx','app/flower/sukuyo/page.tsx'],
 sukuyo:['js/core/service-registry.js','app/_lib/serviceFeatureRegistry.ts'],
 'stonehenge-runes':['js/core/index-inline-runtime.js:openRuneOracle'],
 'love-code':['js/core/index-inline-runtime.js:openLoveSimulation'],
 'today-hub':['js/core/service-registry.js'],
 'life-book-ai':['js/core/service-registry.js','app/_lib/serviceFeatureRegistry.ts'],
 'animal-destiny':['js/core/service-registry.js:animal-destiny-unlock','index.html:animal-guardian-unlock.inlineAliases'],
 'saju-guardian':['index.html:openSajuGuardianPage -> /saju-guardian','app/_lib/serviceFeatureRegistry.ts:saju-animal.launchRoute','app/saju-guardian/SajuGuardianClient.tsx:verifyGuardianUnlockAccess; registry free/paid descriptions conflict'],
};
const groups=new Map();
for(const row of rows){
 const canonicalId=aliases[row.id]||row.id;
 if(!groups.has(canonicalId))groups.set(canonicalId,{id:canonicalId,discoveryIds:[],evidence:[],aliasEvidence:aliasEvidence[canonicalId]||[],
  status:'requires-full-flow-port-and-verification',tossRoute:null,sku:null,inputContract:null,resultRenderer:null,storageContract:null});
 const group=groups.get(canonicalId);group.discoveryIds.push(row.id);group.evidence.push(...row.evidence);
}
if(groups.has('saju-guardian'))groups.get('saju-guardian').verification='same screen; free registry description conflicts with paid unlock evidence; access contract must be reconciled before port';
for(const [id,entry,api] of [['pet-saju','pet-saju.html','/api/pet-saju/blueprint'],['ziwei-island','destiny-island.html','/api/ziwei-island/blueprint']]){
 if(!fs.readFileSync(path.join(root,'index.html'),'utf8').includes('/'+entry))throw new Error('Missing active entry: '+entry);
 if(!fs.readFileSync(path.join(root,entry),'utf8').includes(api))throw new Error('Missing calculation API: '+api);
 groups.set(id,{id,discoveryIds:[],evidence:[{source:'index.html',entry:'/'+entry,api}],status:'not-ported',tossRoute:null,sku:null,inputContract:null,resultRenderer:null,storageContract:null});
}
// The Saju result dashboard has an independently billed consultation that is
// absent from all three registries. It is not the villain blacklist.
const dashboard=fs.readFileSync(path.join(root,'js/core/saju/reportDashboard.js'),'utf8');
if(!dashboard.includes("id:'relationshipTemptation'")||!dashboard.includes("'/relationship-boundary-test/'")||!dashboard.includes('relationshipBoundaryTestEntry'))throw new Error('Missing standalone relationship consultation evidence');
if(!fs.existsSync(path.join(root,'app/relationship-boundary-test/page.tsx'))||!fs.readFileSync(path.join(root,'worker/routes/relationship-boundary-test.js'),'utf8').includes('"relationship-boundary-test"'))throw new Error('Missing relationship consultation implementation');
groups.set('relationship-boundary-test',{id:'relationship-boundary-test',discoveryIds:[],evidence:[{source:'js/core/saju/reportDashboard.js:relationshipTemptation',entry:'/relationship-boundary-test/',implementation:'app/relationship-boundary-test/page.tsx',featureKey:'relationship-boundary-test',accessEvidence:'independent paid report'}],status:'not-ported',tossRoute:null,sku:null,inputContract:null,resultRenderer:null,storageContract:null,verification:'separate from relationship-boundaries (villain blacklist); purchase, stored results, policy and Toss flow unverified'});
for(const [card,id,target] of [['meryok','personal-charm','specialCharmCard'],['quantum','quantum-saju','quantumCard'],['sajuhealth','health-rhythm','healthReportCard'],['sajurpg','life-skill-tree','skillTreeCard'],['trip','energy-travel','energyCoordCard'],['vilun','relationship-boundaries','villainCard']]){
 if(!dashboard.includes(`id:'${card}'`)||!dashboard.includes(`target:'${target}'`)||!visual[id]?.inlineAliases?.includes(`rpt_${target}`)||!groups.has(id))throw new Error(`Missing dashboard alias evidence: ${card}`);
 groups.get(id).aliasEvidence.push(`js/core/saju/reportDashboard.js:${card} -> ${target}`,`index.html:${id}.inlineAliases -> rpt_${target}`);
}
// These are reachable cards within the still-unported Saju result. Track them
// as unresolved subflows until their individual rights and aliases are proven.
const sajuCards=[['sajuprompt','aiPromptCard'],['tbal','tTestCard'],['tetoegen','hormone-vibe-section'],['lotto','lottoCard'],['4CUT','sajuFourCutCard'],['dopamine','dopamineCard']];
for(const [id,target] of sajuCards)if(!dashboard.includes(`id:'${id}'`)||!dashboard.includes(`target:'${target}'`))throw new Error(`Missing Saju result card: ${id}`);
if(!groups.has('saju')||!groups.has('luck-sync-diary'))throw new Error('Missing parent candidate for Saju or diary');
groups.get('saju').subfeatures=sajuCards.map(([id,target])=>({id,target,source:'js/core/saju/reportDashboard.js',status:'requires-full-flow-port-and-verification',accessEvidence:id==='lotto'?'dashboard says Saju bundle; separate entitlement mapping unverified':'dashboard points to section_summary; historic rights unverified'}));
if(!dashboard.includes("id:'fortunePlanner'")||!dashboard.includes("id:'legacyLuckSyncDiary'")||!fs.readFileSync(path.join(root,'js/core/index-inline-runtime.js'),'utf8').includes("location.assign('/diary/')"))throw new Error('Missing new or legacy diary entry');
groups.get('luck-sync-diary').subfeatures=[{id:'fortunePlanner',entry:'/diary/',status:'requires-full-flow-port-and-verification'},{id:'legacyLuckSyncDiary',entry:'js/luck-sync-diary.js:openLegacyLuckSyncDiary',status:'requires-full-flow-port-and-verification',verification:'legacy stored records and migration not verified'}];
const localEvidence={
 ziwei:{tossRoute:'/ziwei/chart',status:'local-partial',inputContract:'BirthFields + normalizeZiweiInput + calculateZiweiChart; domestic locations only',resultRenderer:'apps/toss/src/ZiweiChart.tsx + canonical ZiweiPalaceGrid',storageContract:'current screen only; clear input and chart on session replacement or exit',verification:'basic twelve-palace chart only; original detailed readings, profile recovery, device navigation and accessibility pending'},
 'pet-saju':{tossRoute:'/pet-saju/',status:'local-partial',inputContract:'worker/toss/pet-saju.js deterministic blueprint + worker/toss/pet-paid-contract.js paid inputs',resultRenderer:'apps/toss/service/TossPetSaju.tsx with original sprite artwork and paid report reader',storageContract:'up to five free pet inputs in current screen memory; no app-restart or cross-device recovery of that list. Paid results use an owned order and intent in worker/toss/native-pet-paid.js',verification:'local mock covers all 10 free species, paid report and compatibility checkout, intent resume, library ownership and recovery. Original screen displays 3000 KRW per paid feature while server registry specifies 5000 KRW; approved SKUs, saved pets, device verification and official purchase recovery remain pending'},
 'relationship-boundary-test':{tossRoute:'/relationship-boundary-test/',status:'local-partial',inputContract:'worker/routes/relationship-boundary-test.js:nativeRelationshipContract + worker/toss/native-relationship.js',resultRenderer:'apps/toss/service/TossRelationship.tsx + app/relationship-boundary-test/RelationshipReportParts.tsx',storageContract:'owner-scoped Toss intent and relationship report, paid-order check before results and resume; production index and approved SKU pending',verification:'local mock checkout, price changes, account and refund boundaries, partial result, recovery and native back; order buyer binding, order-ID-less checkout uncertainty, generation failure handling, policy and official device remain unverified'},
 'human-design':{tossRoute:'/human-design',status:'local-partial',inputContract:'worker/toss/human-design.js + original human-design ephemeris',resultRenderer:'apps/toss/src/HumanDesignChart.tsx + original interactive BodyGraph and DetailSheet',storageContract:'screen-only free chart; no saved result or cross-device recovery',verification:'offline mock and local Swiss ephemeris (one independently recorded 26-activation chart), original graph, calendar, auth, session and back checks; full free-screen parity, production astronomy configuration, previously paid guides, premium report and official device remain unverified'},
 psychotest:{tossRoute:'/psychotest/',status:'local-partial',inputContract:'22 original tests in src/features/psychotest/data/testData.ts',resultRenderer:'apps/toss/service/TossPsychotest.tsx + src/features/psychotest/TestPlayer.tsx',storageContract:'owner-scoped in-memory results for the current screen session only; app restart and cross-device recovery absent',verification:'local React mock exercises 22 result paths, back, account switch and clipboard permissions; clinical wording and fabricated fixed trait scores narrowed for Toss; complete editorial audit, official policy, screen-reader and device verification pending'},
 omikuji:{tossRoute:'/omikuji/',status:'local-partial',inputContract:'public/emoi_omikuji_v2.html canonical deterministic engine',resultRenderer:'apps/toss/service/TossOmikuji.jsx',storageContract:'signed-in owner-scoped session-only input and result recovery; guest result remains in memory; no cross-device record',verification:'local React mock validates draw, reroll, back, session restore, account switch, clipboard permission and native share; guest recovery, official device, console permission and policy verification pending'},
 maya:{tossRoute:'/maya/',status:'local-partial',inputContract:'worker/toss/maya-contract.js',resultRenderer:'apps/toss/service/TossMayaPrompt.tsx + src/components/maya/MayaCalendarView.tsx',storageContract:'owner-scoped prepared input, paid prompt and explicit unassigned-order recovery; production index and approved SKU pending',verification:'mock purchase, account/refund checks and draft recovery; source UI 3000 KRW conflicts with server registry 5000 KRW, actual SKU price, external-AI prompt policy and official device not verified'},
 novel:{tossRoute:'/novel',status:'local-partial',inputContract:'Korean transcript; original manifest, cast and ending choices',resultRenderer:'apps/toss/src/NovelReader.tsx',storageContract:'in-screen reading position only; persistent bookmark, visual/audio and device parity pending'},
 'famous-saju':{tossRoute:'/insights/famous-saju',status:'local-partial',inputContract:'published profile search by name, alias or field',resultRenderer:'apps/toss/src/FamousSaju.tsx',storageContract:'public articles only; historical archive, detail deep links and device parity pending'},
 music:{tossRoute:'/music',status:'local-partial',inputContract:'stream list projected from original track manifest and free_full policy only',resultRenderer:'apps/toss/src/MusicShelf.tsx',storageContract:'stream only; paid downloads, library and device audio parity pending'},
 astrology:{tossRoute:'/astrology',status:'local-partial',inputContract:'authenticated birth input; precise Swiss tropical/Placidus chart',resultRenderer:'apps/toss/src/BasicSkyChart.tsx',storageContract:'result in memory only; guest/web profiles, wheel, original unlocks and device parity pending'},
 vedic:{tossRoute:'/vedic',status:'local-partial',inputContract:'authenticated birth input; precise Swiss sidereal/Lahiri chart',resultRenderer:'apps/toss/src/BasicSkyChart.tsx',storageContract:'result in memory only; guest/web profiles, full chart and device parity pending'},
 nakshatra:{publicSubflows:['/nakshatra/codex','/nakshatra/codex/[0..26]'],verification:'Public atlas only; paid personal reading has no Toss order flow. Remains on remainingPorts.'},
 saju:{tossRoute:'/saju/basic/play',status:'local-partial',inputContract:'shared natal engine; Korean city, solar/lunar/leap and unknown hour',resultRenderer:'apps/toss/src/BasicSajuReading.tsx',storageContract:'memory-only free basic chart; web result and device parity pending'},
 manse:{tossRoute:'/manse',status:'local-partial',inputContract:'worker/toss/manse.js (canonical screen saju engine)',resultRenderer:'apps/toss/src/ManseReading.tsx',storageContract:'screen-only; web-profile-history-parity-pending'},
 sukuyo:{tossRoute:'/sukuyo',status:'local-partial',inputContract:'worker/toss/sukuyo-basic.js + canonical Sukuyo domain and free dashboard',resultRenderer:'apps/toss/src/SukuyoBasic.tsx',storageContract:'screen-only; no result storage or cross-device recovery',verification:'local offline canonical calculation plus 27 synthetic lunar sectors, home/direct route, native-back and session-isolation checks; original annual flow, relationship tools, paid nature/compatibility rights, editorial review and official device remain incomplete'},
 flower:{tossRoute:'/flower',status:'local-partial',inputContract:'worker/toss/flower.js',resultRenderer:'apps/toss/src/FlowerReading.tsx',storageContract:'not-stored-by-current-policy'},
 'bias-destiny':{tossRoute:'/bias',status:'local-partial',inputContract:'app/saju/destiny-bias/engine/chemiReportBridge.ts',resultRenderer:'apps/toss/src/BiasReading.tsx + BiasReport.tsx',storageContract:'native-card-save-summary-share-mocked; device-and-web-history-parity-pending'},
 yeongnyangi:{tossRoute:'/catalog',status:'local-partial',inputContract:'worker/toss/routes.js',resultRenderer:'apps/toss/src/App.tsx',storageContract:'owned-TossPurchase-to-YeongnyangiRequest'},
 'fortune-chat':{tossRoute:'/fortune-tea-house/?counsel=letter',status:'local-partial',inputContract:'worker/toss/letter.js + worker/toss/services.js',resultRenderer:'apps/toss/service/TossLetterRoom.tsx + app/fortune-chat/ConsultationIntake.tsx',storageContract:'persona-bound-TossPurchase-to-YeongnyangiRequest; official device and approved SKU pending',verification:'original Yeoni letter intake and owner-bound recovery are mocked; full web parity and device tests pending'},
 'today-hub':{tossRoute:'/daily',status:'local-partial',inputContract:'worker/toss/daily.js',resultRenderer:'apps/toss/src/DailyReadings.tsx',storageContract:'server-owned-daily-result; horary-and-full-web-parity-pending'},
 'fortune-tea-house':{tossRoute:'/fortune-tea-house/',status:'local-partial',inputContract:'worker/toss/native-tea.js',resultRenderer:'apps/toss/service/Screens.jsx',storageContract:'owned-TossPurchase; device-and-console-approval-pending'},
 'saju-fpti':{tossRoute:'/saju-fpti/',status:'local-partial',inputContract:'lib/fpti/fpti-adapter.ts',resultRenderer:'apps/toss/service/TossFpti.tsx',storageContract:'same-tab owner-scoped free result only; profile entitlement and permanent premium report not ported',verification:'mock UI and original calculation only; free-screen parity, approved permanent rights and official device pending'},
 'neo-operation-room':{tossRoute:'/neo-operation-room/',status:'local-partial',inputContract:'worker/toss/native-neo.js',resultRenderer:'apps/toss/service/Screens.jsx',storageContract:'owned-TossPurchase; device-and-console-approval-pending'},
 'fusion-fortune':{tossRoute:'/fusion-fortune/',status:'local-partial',inputContract:'worker/toss/native-fusion.js',resultRenderer:'apps/toss/service/Fusion.jsx',storageContract:'owned-TossPurchase; device-and-console-approval-pending'},
 'life-book-ai':{tossRoute:'/life-book-ai/',status:'local-partial',inputContract:'worker/toss/native-life-book.js',resultRenderer:'apps/toss/service/LifeBook.jsx',storageContract:'owned-TossPurchase; device-and-console-approval-pending'},
 'life-fortune-report':{tossRoute:'/life-book-ai/',status:'local-partial',inputContract:'worker/routes/life-book-ai.js:nativeLifeBookContract (lifeFortune mode)',resultRenderer:'apps/toss/service/LifeBook.jsx + app/life-book-ai/LifeBookAiClient.tsx',storageContract:'owned-TossPurchase with life-fortune-ai-consultation feature; device-and-console-approval-pending',verification:'apps/toss/test/fusion-billing.test.mjs covers payload and request id only; full parity pending'},
 'love-secret-ai':{tossRoute:'/love-secret-ai/',status:'local-partial',inputContract:'worker/toss/native-love-secret.js',resultRenderer:'apps/toss/service/LoveSecret.jsx + app/love-secret-ai/result/LoveSecretAiResultClient.tsx',storageContract:'owned Toss purchase, Toss-origin consultation and verified follow-up recovery; approved SKU, purchaser binding, durable checkout and device verification pending',verification:'mock result and follow-up access, refund and account-switch tests; legacy unmarked web records, AI policy and official device remain unverified'},
 'astrology-ai':{tossRoute:'/astrology-ai/',status:'local-partial',inputContract:'worker/toss/native-astrology.js + nativeAstrologyContract',resultRenderer:'app/astrology-ai/AstrologyAiClient.tsx + app/astrology-ai/result/AstrologyAiResultClient.tsx',storageContract:'owned-TossPurchase and Toss-origin AstrologyAiConsultation; approved SKU, durable checkout, policy and device verification pending',verification:'mock-contracts-only; complete flow and official sandbox not verified'},
 'vedic-ai':{tossRoute:'/vedic-ai/',status:'local-partial',inputContract:'worker/toss/native-vedic.js + nativeVedicContract',resultRenderer:'app/vedic-ai/VedicAiClient.tsx',storageContract:'owned Toss purchase and Toss-origin VedicAiConsultation; approved SKU, durable checkout, policy and device verification pending',verification:'mock contracts, local mobile layout and build only; official Toss device and full flow not verified'},
 'ziwei-ai':{tossRoute:'/ziwei-ai/',status:'local-partial',inputContract:'worker/toss/native-ziwei.js + nativeZiweiContract',resultRenderer:'app/ziwei-ai/ZiweiAiClient.tsx',storageContract:'owned Toss purchase and Toss-origin ZiweiAiConsultation; approved SKU, durable checkout, policy and device verification pending',verification:'mock contracts, local mobile layout and build only; Japanese input states results are Korean; other locale quality, official device and full flow not verified'},
 'new-year-ai':{tossRoute:'/new-year-ai-consultation/',status:'local-partial',inputContract:'worker/toss/native-new-year.js + nativeNewYearContract',resultRenderer:'app/new-year-ai-consultation/NewYearAiClient.tsx',storageContract:'owned Toss purchase and Toss-origin NewYearAiConsultation; approved SKU, durable checkout, policy and device verification pending',verification:'mock contracts, local mobile layout and build only; Japanese input states results are Korean; other locale quality, official device and full flow not verified'},
 'karma-destiny-ai':{tossRoute:'/karma-destiny-ai/',status:'local-partial',inputContract:'worker/toss/native-karma.js + nativeKarmaContract',resultRenderer:'apps/toss/service/TossKarma.tsx + app/karma-destiny-ai/result/KarmaDestinyAiResultClient.tsx',storageContract:'owner-scoped Toss intent and original KarmaDestinyAiConsultation; approved SKU, purchaser binding, durable checkout and device verification pending',verification:'mock purchase, follow-up authorization and recovery, lunar leap validation and local mobile layout only; other locales, AI policy, official device and complete flow not verified'},
 'sukuyo-compatibility-ai':{tossRoute:'/sukuyo-compatibility-ai/',status:'local-partial',inputContract:'worker/toss/native-sukuyo.js + nativeSukuyoContract',resultRenderer:'apps/toss/service/TossSukuyoGate.tsx + app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.tsx',storageContract:'owner-scoped Toss intent and Toss-origin SukuyoCompatibilityAiConsultation; verified saved-input selection or explicit new input for unassigned orders; bounded explicit retry after authorized generation failure',verification:'local SDK mock purchase, result reload, selected-input recovery, account isolation and back-event checks only; production recovery index, approved SKU, purchaser binding, durable checkout, safety policy and official device pending'},
};
// These active library links are absent from all three feature registries.
for(const [id,entry,source] of [
 ['tarot-healing','/tarot/healing/','app/tarot/healing/TarotHealingRouteClient.tsx'],
 ['tarot-self-esteem','/tarot/self-esteem/','js/tarot-self-esteem-experience.js'],
]){
 if(!fs.readFileSync(path.join(root,'index.html'),'utf8').includes(`href="${entry}"`))throw new Error('Missing tarot entry: '+entry);
 groups.set(id,{id,discoveryIds:[],evidence:[{source:'index.html:tarotCollection',entry,implementation:source}],status:'not-ported',tossRoute:null,sku:null,inputContract:null,resultRenderer:null,storageContract:null});
}
// A web section can remain a separate port even when it shares a purchase with other sections.
for(const group of groups.values()){
 const manifestPath='content/product-details/'+group.id+'/manifest.json';
 const manifest=fs.existsSync(path.join(root,manifestPath))?JSON.parse(fs.readFileSync(path.join(root,manifestPath),'utf8')):null;
 const match=[manifest?.featureKey,...group.evidence.map(e=>e.featureKey)].find(key=>SAJU_BUNDLE_ALIAS_MEMBER_KEYS.includes(key));
 if(!match)continue;
 group.webEntitlement={featureKey:match,bundleKey:SAJU_BUNDLE_FEATURE_KEY,birthScoped:true,
   individualSaleClosed:SAJU_BUNDLE_SALE_CLOSED_KEYS.includes(match),
   source:'worker/lib/saju-bundle-policy.js',...(manifest?.featureKey===match?{contentSource:manifestPath}:{})};
}
const house=groups.get('secret-house');
if(house?.webEntitlement?.featureKey==='rpt_secretHouseEntryCard'&&dashboard.includes('/secret-house_real.html')){
 const shell=fs.readFileSync(path.join(root,'secret-house_real.html'),'utf8');
 if(!shell.includes("HOUSE_ENDPOINT='/api/saju/section'")||!shell.includes("HOUSE_FEATURE='rpt_secretHouseEntryCard'"))throw new Error('Secret House access evidence changed');
 house.aliasEvidence.push('js/core/saju/reportDashboard.js -> /secret-house_real.html -> POST /api/saju/section (rpt_secretHouseEntryCard)');
}
for(const [id,fields] of Object.entries(localEvidence))if(groups.has(id))Object.assign(groups.get(id),fields);
for(const flow of TOSS_TAROT_LIBRARY_FLOWS){
 const group=groups.get(flow.id);
 if(!group)throw new Error('Missing discovered tarot flow: '+flow.id);
 Object.assign(group,{status:'local-partial',tossRoute:'/tarot-library',inputContract:'lib/tarot/toss-library-flows.mjs',
  resultRenderer:'apps/toss/src/TarotLibrary.tsx',storageContract:flow.access==='free-local'?'local-reading-not-server-stored':'owned-TossPurchase-to-PaidExecutionRecord',
  verification:'mock-contracts-only; device-and-web-parity-pending'});
}
for(const row of rows){
 const group=groups.get(aliases[row.id]||row.id);
 if(!group)throw new Error('Missing canonical candidate for '+row.id);
 row.toss.screen='not-independently-verified';
 row.toss.canonicalId=group.id;
 row.toss.candidateStatus=group.status;
 row.toss.canonicalRoute=group.tossRoute;
}
const report={sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),scope:'Source discovery plus explicitly verified aliases; not a count of implemented services. Unmapped contracts are blocking work, not exclusions.',sourceCounts:{home:context.window.__cdServiceRegistry.length,react:react.length,visual:Object.keys(visual).length},entries:rows,canonicalCandidates:[...groups.values()].sort((a,b)=>a.id.localeCompare(b.id))};
fs.writeFileSync(path.join(root,'docs/toss/full-service-inventory.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({sourceCounts:report.sourceCounts,discoveryIds:rows.length,canonicalCandidates:groups.size,readyForLaunch:0}));
