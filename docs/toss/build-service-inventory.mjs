// Local planning tool only. Source registries are not imported into the miniapp.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
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
 'daily-fortune':'today-hub','saju-lifebook':'life-book-ai',
};
const aliasEvidence={
 flower:['app/flower/destiny/page.tsx','app/flower/astrology/page.tsx','app/flower/jamidusu/page.tsx','app/flower/sukuyo/page.tsx'],
 sukuyo:['js/core/service-registry.js','app/_lib/serviceFeatureRegistry.ts'],
 'stonehenge-runes':['js/core/index-inline-runtime.js:openRuneOracle'],
 'love-code':['js/core/index-inline-runtime.js:openLoveSimulation'],
 'today-hub':['js/core/service-registry.js'],
 'life-book-ai':['js/core/service-registry.js','app/_lib/serviceFeatureRegistry.ts'],
};
const groups=new Map();
for(const row of rows){
 const canonicalId=aliases[row.id]||row.id;
 if(!groups.has(canonicalId))groups.set(canonicalId,{id:canonicalId,discoveryIds:[],evidence:[],aliasEvidence:aliasEvidence[canonicalId]||[],
  status:'requires-full-flow-port-and-verification',tossRoute:null,sku:null,inputContract:null,resultRenderer:null,storageContract:null});
 const group=groups.get(canonicalId);group.discoveryIds.push(row.id);group.evidence.push(...row.evidence);
}
for(const [id,entry,api] of [['pet-saju','pet-saju.html','/api/pet-saju/blueprint'],['ziwei-island','destiny-island.html','/api/ziwei-island/blueprint']]){
 if(!fs.readFileSync(path.join(root,'index.html'),'utf8').includes('/'+entry))throw new Error('Missing active entry: '+entry);
 if(!fs.readFileSync(path.join(root,entry),'utf8').includes(api))throw new Error('Missing calculation API: '+api);
 groups.set(id,{id,discoveryIds:[],evidence:[{source:'index.html',entry:'/'+entry,api}],status:'not-ported',tossRoute:null,sku:null,inputContract:null,resultRenderer:null,storageContract:null});
}
const localEvidence={
 manse:{tossRoute:'/manse',status:'local-partial',inputContract:'worker/toss/manse.js (canonical screen saju engine)',resultRenderer:'apps/toss/src/ManseReading.tsx',storageContract:'screen-only; web-profile-history-parity-pending'},
 flower:{tossRoute:'/flower',status:'local-partial',inputContract:'worker/toss/flower.js',resultRenderer:'apps/toss/src/FlowerReading.tsx',storageContract:'not-stored-by-current-policy'},
 'bias-destiny':{tossRoute:'/bias',status:'local-partial',inputContract:'app/saju/destiny-bias/engine/chemiReportBridge.ts',resultRenderer:'apps/toss/src/BiasReading.tsx + BiasReport.tsx',storageContract:'native-card-save-summary-share-mocked; device-and-web-history-parity-pending'},
 yeongnyangi:{tossRoute:'/catalog',status:'local-partial',inputContract:'worker/toss/routes.js',resultRenderer:'apps/toss/src/App.tsx',storageContract:'owned-TossPurchase-to-YeongnyangiRequest'},
 'fortune-chat':{tossRoute:'/catalog',status:'local-partial',inputContract:'worker/toss/services.js',resultRenderer:'apps/toss/src/App.tsx',storageContract:'persona-bound-TossPurchase-to-YeongnyangiRequest'},
};
// These active library links are absent from all three feature registries.
for(const [id,entry,source] of [
 ['tarot-healing','/tarot/healing/','app/tarot/healing/TarotHealingRouteClient.tsx'],
 ['tarot-self-esteem','/tarot/self-esteem/','js/tarot-self-esteem-experience.js'],
]){
 if(!fs.readFileSync(path.join(root,'index.html'),'utf8').includes(`href="${entry}"`))throw new Error('Missing tarot entry: '+entry);
 groups.set(id,{id,discoveryIds:[],evidence:[{source:'index.html:tarotCollection',entry,implementation:source}],status:'not-ported',tossRoute:null,sku:null,inputContract:null,resultRenderer:null,storageContract:null});
}
for(const [id,fields] of Object.entries(localEvidence))if(groups.has(id))Object.assign(groups.get(id),fields);
for(const flow of TOSS_TAROT_LIBRARY_FLOWS){
 const group=groups.get(flow.id);
 if(!group)throw new Error('Missing discovered tarot flow: '+flow.id);
 Object.assign(group,{status:'local-partial',tossRoute:'/tarot-library',inputContract:'lib/tarot/toss-library-flows.mjs',
  resultRenderer:'apps/toss/src/TarotLibrary.tsx',storageContract:flow.access==='free-local'?'local-reading-not-server-stored':'owned-TossPurchase-to-PaidExecutionRecord',
  verification:'mock-contracts-only; device-and-web-parity-pending'});
}
const report={sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),scope:'Source discovery plus explicitly verified aliases; not a count of implemented services. Unmapped contracts are blocking work, not exclusions.',sourceCounts:{home:context.window.__cdServiceRegistry.length,react:react.length,visual:Object.keys(visual).length},entries:rows,canonicalCandidates:[...groups.values()].sort((a,b)=>a.id.localeCompare(b.id))};
fs.writeFileSync(path.join(root,'docs/toss/full-service-inventory.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({sourceCounts:report.sourceCounts,discoveryIds:rows.length,canonicalCandidates:groups.size,readyForLaunch:0}));
