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
 const sub=get('saju').subfeatures;assert.deepEqual(sub.map(item=>item.id),['sajuprompt','tbal','tetoegen','lotto','4CUT','dopamine']);assert.ok(sub.every(item=>item.status==='requires-full-flow-port-and-verification'));
 for(const id of ['personal-charm','quantum-saju','health-rhythm','life-skill-tree','energy-travel','relationship-boundaries'])assert.ok(get(id).aliasEvidence.some(value=>value.startsWith('js/core/saju/reportDashboard.js:')),id);
 const diary=get('luck-sync-diary').subfeatures;assert.deepEqual(diary.map(item=>item.id),['fortunePlanner','legacyLuckSyncDiary']);assert.deepEqual(diary.map(item=>item.status),['local-partial','requires-full-flow-port-and-verification']);
});
test('pet chart remains partial while paid products and durable recovery are unresolved',()=>{const pet=inventory.canonicalCandidates.find(item=>item.id==='pet-saju');assert.equal(pet.status,'local-partial');assert.equal(pet.tossRoute,'/pet-saju/');assert.match(pet.storageContract,/no app-restart or cross-device recovery/);assert.match(pet.verification,/3000 KRW.*5000 KRW/);});

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
