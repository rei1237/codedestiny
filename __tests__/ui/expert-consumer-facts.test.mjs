import '../../tools/oracle/next-delivery/guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {resolveExpertCalculation} from '../../worker/lib/expert-consumer-facts.js';
const clone=x=>JSON.parse(JSON.stringify(x));
for(const system of ['astrology','vedic','sukuyo']){
 test(system+': synthetic provider, durable facts, rollback, no recalc, corruption and legacy',async()=>{
  const chart={system,version:'synthetic-v1',houses:null,aspects:[],candidates:['a'],status:'pending',personA:{id:'a'},personB:{id:'b'}};
  let calls=0;const calculate=async()=>{calls++;return chart};
  const off=await resolveExpertCalculation(system,null,calculate);assert.deepEqual(off,{value:chart});
  const result=await resolveExpertCalculation(system,null,calculate,{env:{[system.toUpperCase()+'_CONSUMER_FACTS_V1']:'true'},input:{id:'a'}});
  assert.equal(result.engineFacts.support,'pending');assert.deepEqual(result.engineFacts.facts,chart);
  const saved=clone(result);const fail=()=>{throw Error('RECALCULATION_BLOCKED')};
  assert.deepEqual(await resolveExpertCalculation(system,saved.value,fail,{snapshot:saved.engineFacts,existing:true}),saved);
  assert.equal(calls,2);assert.deepEqual(await resolveExpertCalculation(system,chart,fail,{existing:true,env:{[system.toUpperCase()+'_CONSUMER_FACTS_V1']:'true'}}),{value:chart});
  const changed=clone(chart);changed.houses=[1];await assert.rejects(resolveExpertCalculation(system,changed,fail,{snapshot:saved.engineFacts}),/MISMATCH/);
  await assert.rejects(resolveExpertCalculation(system,null,fail,{snapshot:saved.engineFacts}),/MISMATCH/);
  const corrupt=clone(saved.engineFacts);corrupt.support='confirmed';await assert.rejects(resolveExpertCalculation(system,chart,fail,{snapshot:corrupt}),/INVALID/);
 });
}
// Execute the actual route's calculation + atomic persistence boundary. No route
// imports, Swiss provider, real database, payment or LLM are permitted here.
for(const [system,file,root] of [['astrology','astrology-ai','handleStart'],['vedic','vedic-ai','generateConsultation'],['sukuyo','sukuyo-compatibility-ai','handleGenerate']]){
 test(system+': actual route boundary stores the exact facts beside its original chart',async()=>{
  const ast=ts.createSourceFile(file,fs.readFileSync('worker/routes/'+file+'.js','utf8'),ts.ScriptTarget.Latest,true);
  const nodes=[];function visit(n){if(ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)==='basis'&&d.initializer?.getText(ast).includes('resolveExpertCalculation')))nodes.push(n);ts.forEachChild(n,visit)}visit(ast);assert.equal(nodes.length,1);
  const chart={version:'synthetic',status:'pending',houses:null};let calls=0,saved=null;
  const ctx=vm.createContext({resolveExpertCalculation,body:{},idempotencyKey:'same',doc:{llmMeta:{}},existing:null,normalized:{input:{person:'a'}},env:{[system.toUpperCase()+'_CONSUMER_FACTS_V1']:'true'},request:{url:'https://mock.test'},locked:{},sessionId:'same',calculateAstrologyChart:async()=>{calls++;return chart},calculateVedicAiChart:async()=>{calls++;return chart},calculateSukuyo:async()=>{calls++;return chart},saveAstrologyDelivery:async(_q,v)=>{saved=clone(v);return v},saveVedicDelivery:async(_q,v)=>{saved=clone(v);return v}});
  let snippet=nodes[0].getText(ast)+'\n';
  if(system==='sukuyo')snippet+='return basis;';
  else {const block=nodes[0].parent;const siblings=block.statements;let start=siblings.indexOf(nodes[0]);for(let i=start+1;i<siblings.length;i++){snippet+=siblings[i].getText(ast)+'\n';if(siblings[i].getText(ast).includes(system==='vedic'?'saveVedicDelivery(':'saveAstrologyDelivery('))break}snippet+='return basis;'}
  const result=await vm.runInContext('(async()=>{'+snippet+'})()',ctx);assert.equal(calls,1);assert.deepEqual(clone(result.value),chart);
  if(saved){assert.deepEqual(saved.llmMeta.engineFacts.facts,chart);assert.deepEqual(system==='vedic'?saved.llmMeta.chartSnapshot:saved.astrologyChart,chart)}
  else {const seed=ast.getText().match(/llmMeta: \{[^\n]*calculationFacts[^\n]*/);assert.ok(seed,'same seed persists calculationFacts with calculation')}
 });
}
