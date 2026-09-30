import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {BenchmarkBudget,benchmarkCallCaps} from '../../scripts/lib/yeongnyangi-benchmark-budget.mjs';
const hash='a'.repeat(64);
const scope=()=>({model:'gemini-2.5-flash',books:['saju','ziwei','sukuyo','vedic','astrology','tarot'].map(domain=>({domain,questions:8,chapters:5,providerOutputCaps:[12052,6292,6292,6292,6930],analysisCalls:domain==='tarot'?0:1,analysisOutputCap:domain==='tarot'?0:1024}))});
test('the exact six-book scope owns thirty chapter calls and five analysis calls',()=>{
 const caps=benchmarkCallCaps(scope());assert.equal(caps.length,35);
 const changed=scope();changed.books[5].analysisCalls=1;assert.throws(()=>benchmarkCallCaps(changed));
});
test('reservation is durably saved before tokenizer and timeout consumes it without a retry',async()=>{
 const events=[];const budget=new BenchmarkBudget([{id:'chapter',outputTokens:12052}],state=>events.push(['save',state.reservedNanoUsd]));
 const run=()=>budget.run({id:'chapter',outputTokens:12052,requestHash:hash,countTokens:async()=>{events.push(['count']);return 400;},generate:async()=>{events.push(['generate']);throw Object.assign(new Error('timeout'),{name:'TimeoutError'});}});
 await assert.rejects(run());const reserved=budget.state.reservedNanoUsd;assert.ok(reserved>0);assert.equal(events[0][0],'save');
 await assert.rejects(run(),/Spent call/);assert.equal(budget.state.reservedNanoUsd,reserved);assert.equal(budget.state.generationCalls,1);
});
test('excess input and persistence failure stop before generation without refunding the reservation',async()=>{
 for(const [count,persist] of [[50001,async()=>{}],[100,async()=>{throw new Error('disk unavailable');}]]){
  let generations=0;const budget=new BenchmarkBudget([{id:'chapter',outputTokens:8192}],persist);
  await assert.rejects(budget.run({id:'chapter',outputTokens:8192,requestHash:hash,countTokens:async()=>count,generate:async()=>{generations++;}}));
  assert.equal(generations,0);assert.ok(budget.state.reservedNanoUsd>0);
 }
});
test('the dollar ceiling and changed output allowance reject before external work',async()=>{
 let requests=0;const budget=new BenchmarkBudget([{id:'huge',outputTokens:500000},{id:'small',outputTokens:8192}],async()=>{});
 const request={requestHash:hash,countTokens:async()=>{requests++;return 100;},generate:async()=>{requests++;}};
 await assert.rejects(budget.run({...request,id:'huge',outputTokens:500000}),/USD budget/);
 await assert.rejects(budget.run({...request,id:'small',outputTokens:9000}),/Output allowance/);
 assert.equal(requests,0);
});


test('a DRAFT live request exits before credentials, fixture reads, output markers or network',()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'mackerel-draft-block-'));
 const file=path.join(folder,'plan.json'),out=path.join(folder,'output');
 fs.writeFileSync(file,JSON.stringify({...scope(),status:'DRAFT'}));
 // Deliberately no env file, fixtures or API key. DRAFT must be the first gate.
 const child=spawnSync(process.execPath,['scripts/yeongnyangi-mackerel-benchmark.mjs','--live','--plan-file',file,'--out',out],{cwd:process.cwd(),encoding:'utf8'});
 assert.notEqual(child.status,0);assert.match(child.stderr,/DRAFT plans cannot execute/);
 assert.equal(fs.existsSync(out),false);
 assert.deepEqual(fs.readdirSync(folder),['plan.json']);
});
