import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {implementationReadiness} from '../scripts/implementation-readiness.mjs';
const inventory=JSON.parse(fs.readFileSync(new URL('../../../docs/toss/full-service-inventory.json',import.meta.url)));
const audit=JSON.parse(fs.readFileSync(new URL('../../../docs/toss/original-mode-audit-20261114.json',import.meta.url)));
test('current audit separates recorded code gaps from historical partial ports',()=>{
 const result=implementationReadiness(inventory,audit);
 assert.equal(result.total,127);
 assert.deepEqual(result.codeGaps.map(row=>row.id),['flower','music']);
 assert.equal(result.noRecordedCodeGaps.length,124);
 assert.deepEqual(result.evidencePending.map(row=>row.id),['moonlit-lotus']);
 assert.match(result.codeGaps.find(row=>row.id==='music').gaps[0],/32MiB/);
});
test('missing, duplicate and foreign audit rows fail closed',()=>{
 for(const change of [a=>a.rows.pop(),a=>a.rows[1]=a.rows[0],a=>a.rows[0].id='unregistered',a=>delete a.rows[0].codeGaps]){
  const copy=structuredClone(audit);change(copy);
  assert.throws(()=>implementationReadiness(inventory,copy));
 }
});
test('unknown audit states remain pending even when no gap was recorded',()=>{
 const copy=structuredClone(audit);copy.rows[0].reviewState='not-reviewed';copy.rows[0].codeGaps=[];
 const result=implementationReadiness(inventory,copy);
 assert.ok(result.evidencePending.some(row=>row.id===copy.rows[0].id&&row.reviewState==='not-reviewed'));
 assert.ok(!result.noRecordedCodeGaps.includes(copy.rows[0].id));
});
