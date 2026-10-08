// Local planning tool only. Source registries are not imported into the miniapp.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {loadTsModule} from '../../scripts/lib/load-ts-module.mjs';
import {extractObjectLiteral} from '../../scripts/lib/feature-marketing-extract.mjs';
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
const report={sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),scope:'Discovery inventory, not a count of implemented or unique services. Aliases and nested collections require manual reconciliation.',sourceCounts:{home:context.window.__cdServiceRegistry.length,react:react.length,visual:Object.keys(visual).length},entries:rows};
fs.writeFileSync(path.join(root,'docs/toss/full-service-inventory.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({sourceCounts:report.sourceCounts,discoveryIds:rows.length,readyForLaunch:0}));
