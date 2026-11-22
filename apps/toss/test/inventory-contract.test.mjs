import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../../..');const inventory=JSON.parse(await readFile(path.join(root,'docs/toss/full-service-inventory.json'),'utf8'));
test('every discovered source maps to one canonical candidate without claiming an independently verified screen',()=>{
 const mapped=new Map();for(const candidate of inventory.canonicalCandidates)for(const id of candidate.discoveryIds){assert.equal(mapped.has(id),false,`duplicate discovery id: ${id}`);mapped.set(id,candidate);}
 for(const row of inventory.entries){const candidate=mapped.get(row.id);assert.ok(candidate,`missing candidate: ${row.id}`);assert.equal(row.toss.canonicalId,candidate.id);assert.equal(row.toss.candidateStatus,candidate.status);assert.equal(row.toss.screen,'not-independently-verified');}
});
test('exclusions require explicit evidence and unknown statuses cannot masquerade as completed',()=>{
 const allowed=new Set(['local-partial','verified-full-flow','not-ported','requires-full-flow-port-and-verification','excluded']);
 for(const candidate of inventory.canonicalCandidates){assert.ok(allowed.has(candidate.status),candidate.id);if(candidate.status==='excluded')assert.ok(typeof candidate.exclusionReason==='string'&&candidate.exclusionReason.trim());}
});
test('standalone relationship consultation and Saju result subflows stay separately visible',()=>{
 const get=id=>inventory.canonicalCandidates.find(item=>item.id===id),consult=get('relationship-boundary-test'),villain=get('relationship-boundaries');
 assert.equal(consult.status,'local-partial');assert.equal(consult.tossRoute,'/relationship-boundary-test/');assert.equal(consult.evidence[0].featureKey,'relationship-boundary-test');assert.equal(consult.evidence[0].entry,'/relationship-boundary-test/');assert.equal(villain.evidence[0].name,'빌런 블랙리스트');
 const sub=get('saju').subfeatures;assert.deepEqual(sub.map(item=>item.id),['sajuprompt','tbal','tetoegen','lotto','4CUT','dopamine']);assert.ok(sub.every(item=>item.status==='local-partial'&&item.tossRoute==='/saju/basic/play'&&item.verification.includes('360px')));
 for(const id of ['personal-charm','quantum-saju','health-rhythm','life-skill-tree','energy-travel','relationship-boundaries'])assert.ok(get(id).aliasEvidence.some(value=>value.startsWith('js/core/saju/reportDashboard.js:')),id);
 const diary=get('luck-sync-diary').subfeatures;assert.deepEqual(diary.map(item=>item.id),['fortunePlanner','legacyLuckSyncDiary']);assert.deepEqual(diary.map(item=>item.status),['local-partial','requires-full-flow-port-and-verification']);
});
test('pet chart remains partial while paid products and durable recovery are unresolved',()=>{const pet=inventory.canonicalCandidates.find(item=>item.id==='pet-saju');assert.equal(pet.status,'local-partial');assert.equal(pet.tossRoute,'/pet-saju/');assert.match(pet.storageContract,/게스트·토스 계정별로 이 기기에 최근 다섯 마리/);assert.match(pet.verification,/3000 KRW.*5000 KRW/);});

test('each public Saju and Ziwei chapter keeps its real entry and independent RPG boundary',()=>{
 const chapters=inventory.canonicalCandidates.flatMap(c=>c.publicSections||[]);
 assert.equal(chapters.length,12);
 assert.equal(new Set(chapters.map(c=>c.featureKey)).size,12);
 assert.ok(chapters.every(c=>c.login==='공개'&&!c.iap&&(c.verification.includes('360px')||c.featureKey==='rpt_secretHouseEntryCard')));
 assert.equal(chapters.filter(c=>c.tossRoute==='/ziwei/sections').length,4);
 assert.equal(inventory.canonicalCandidates.find(c=>c.id==='life-skill-tree').questProgress.status,'일부만 이식');
});

test('public Ziwei exploration is independent of closed owner-only AI rereads',()=>{
 const island=inventory.canonicalCandidates.find(x=>x.id==='ziwei-island'),history=inventory.canonicalCandidates.find(x=>x.id==='island-consult');
 assert.equal(island.freeCalculation,true);assert.equal(island.tossRoute,'/ziwei/sections?reading=island');assert.equal(island.sku,null);
 assert.equal(history.tossRoute,'/ziwei/sections#island-history');assert.equal(history.sku,null);assert.ok(history.webProductIds.includes('ziwei-island-deep-report'));assert.match(history.verification,/410 ISLAND_NOW_FREE/);assert.ok(history.webProductIds.includes('ziwei-island-palace-consult'));
});

test('changed web aliases keep their original result and order boundaries',()=>{
 const idFor=id=>inventory.entries.find(row=>row.id===id)?.toss.canonicalId;
 const get=id=>inventory.canonicalCandidates.find(row=>row.id===id);
 assert.equal(idFor('heukwol'),'heukwol-consult');
 assert.notEqual(get('heukwol-consult').tossRoute,get('heukwol-story').tossRoute);
 assert.equal(idFor('saju-compatibility'),'saju-compat-premium');
 assert.deepEqual(get('saju-compatibility').webProductIds,['compat-saju-compatibility']);
 assert.deepEqual(get('saju-compat-premium').webProductIds,['saju-compat-premium']);
 assert.equal(get('saju-compat-premium').sku,null);
 assert.ok(get('saju-compat-premium').webRegistryPriceKRW>0);
 assert.ok(get('saju-compatibility').webRegistryPriceKRW>0);
 assert.equal(get('yeongnyangi-faq').tossLogin,'공개 진입');
});

test('free directory preserves every original card and distinguishes free and historical compatibility',async()=>{
 const {FREE_PROMO_GROUPS,freePromoItemHref}=await import('../../../lib/marketing/free-promo.mjs');
 const {freeFortuneHref}=await import('../src/free-fortune-routes.mjs');
 const {PROMPT_HUB_TOOL_IDS}=await import('../../../lib/fortune/prompt-hub-template.js');
 const get=id=>inventory.canonicalCandidates.find(row=>row.id===id);
 const cards=get('free-fortune-index').freeDirectoryItems;
 const original=FREE_PROMO_GROUPS.flatMap(group=>group.items);
 assert.deepEqual(cards.map(row=>row.id),original.map(item=>item.id));
 for(const [i,item] of original.entries()){
  assert.equal(cards[i].webEntry,freePromoItemHref(item));assert.equal(cards[i].tossRoute,freeFortuneHref(item));
 }
 const basic=get('saju-compat-basic-free'),legacy=get('saju-compatibility'),premium=get('saju-compat-premium');
 assert.equal(basic.tossRoute,cards.find(row=>row.id==='compat').tossRoute);assert.equal(basic.freeCalculation,true);assert.deepEqual(basic.webProductIds,['section_compat']);
 assert.equal(legacy.freeCalculation,false);assert.match(legacy.tossRoute,/orderId=/);assert.match(legacy.saleStatus,/기존 주문/);
 assert.notEqual(premium.tossRoute,basic.tossRoute);assert.equal(premium.webRegistryPriceKRW,10000);assert.equal(legacy.webRegistryPriceKRW,5000);
 assert.equal(get('saju-brain').tossRoute,cards.find(row=>row.id==='brain').tossRoute);
 assert.deepEqual(get('fortune-prompt-hub').webModes,PROMPT_HUB_TOOL_IDS);
});

test('recorded mock archive checks resolve to individual services and all tested Yeongnyangi products',async()=>{
 const record=JSON.parse(await readFile(path.join(root,inventory.mockServiceFlowEvidence.path),'utf8'));
 assert.equal(record.deploymentId,inventory.mockServiceFlowEvidence.deploymentId);assert.match(record.sha256,/^[a-f0-9]{64}$/);
 for(const archive of [record,...(record.followups||[])]){
  assert.match(archive.sha256,/^[a-f0-9]{64}$/);
  for(const check of archive.checks){
   assert.equal(check.exitCode,0);assert.ok(check.checked.length,check.case);
   for(const id of check.canonicalIds)assert.ok(inventory.canonicalCandidates.find(row=>row.id===id)?.mockArchiveCases.some(run=>run.deploymentId===archive.deploymentId&&run.case===check.case),id);
  }
 }
 const products=record.checks.find(row=>row.args.includes('--all-products')).checked.map(line=>line.split(' ')[0]);
 assert.deepEqual(products.sort(),inventory.consultationProducts.map(item=>item.productId).sort());
});
