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
