import '../../tools/oracle/next-delivery/guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { createEngineFactSnapshot, readEngineFactSnapshot, engineFactPrompt } from '../../worker/lib/engine-fact-snapshot.js';
const clone = v => JSON.parse(JSON.stringify(v));
async function sandbox(old = false) {
  const result = await build({ stdin: { contents: "export * from './worker/lib/guardian-fortune-context.js';export * from './worker/lib/guardian-fortune-prompt.js';", resolveDir: process.cwd() }, bundle: true, write: false, format: 'cjs', platform: 'node', plugins: [{ name: 'deny-real-providers', setup(b) {
    b.onResolve({ filter: /.*/ }, a => {
      const match = a.path.match(/adapters\/(astrology|vedic|sukuyo)\.js$/);
      if (match) return { path: match[1], namespace: 'blocked' };
      if (a.path === 'node:crypto') return { path: a.path, external: true };
      if (!a.path.startsWith('.') || /swiss|sweph|ephemeris|jyotish|(?:^|\/)(db|models|routes)(?:[./]|$)/i.test(a.path)) throw Error('FORBIDDEN_IMPORT:' + a.path);
    });
    b.onLoad({ filter: /.*/, namespace: 'blocked' }, a => ({ contents: 'export function build' + ({ astrology:'Astrology',vedic:'Vedic',sukuyo:'Sukuyo' }[a.path]) + "Adapter(){throw Error('SWISS_BLOCKED')}" }));
    if (old) b.onLoad({ filter: /guardian-fortune(?:-context|-prompt|[\\/]adapters[\\/]ziwei)\.js$/ }, a => ({ contents: execFileSync('git',['show','c7f46acf:'+a.path.replace(process.cwd(),'').replaceAll('\\','/').replace(/^\//,'')],{encoding:'utf8'}), loader:'js' }));
  } }] });
  const ctx = vm.createContext({ module:{exports:{}}, TextEncoder, structuredClone, console:{warn(){}}, require:name=>{assert.equal(name,'node:crypto');return {createHash}}, fetch:()=>{throw Error('NETWORK_BLOCKED')} });
  vm.runInContext(result.outputFiles[0].text,ctx,{timeout:10000});return ctx.module.exports;
}
const api=await sandbox(),previous=await sandbox(true);
const input={birthDate:'1988-05-15',birthTime:'08:30',gender:'male',calendarType:'solar',category:'tarot',topic:'love',mode:'yeoni',targetDate:'2026-11-02',locale:'ko-KR',birthPlace:{timezone:'Asia/Seoul',longitude:126.978,latitude:37.5665}};
const now=new Date('2026-11-02T00:00:00Z');
test('OFF preserves complete ziwei/tarot context and prompt against task baseline',async()=>{
 for(const category of ['ziwei','tarot']) for(const topic of ['daily','love','money_work']) {
  const args={...input,category,topic};const a=await api.buildGuardianFortuneContext(args,{now}),b=await previous.buildGuardianFortuneContext(args,{now});
  assert.equal(a.ok,true);assert.deepEqual(clone(a),clone(b));
  assert.equal(api.formatGuardianFortuneContextForPrompt(a.context),previous.formatGuardianFortuneContextForPrompt(b.context));
 }
});
test('ON stores full ziwei chart and selected tarot order, orientation, spread, options and versions through prompt/JSON reload',async()=>{
 for(const category of ['ziwei','tarot']) {
  const built=await api.buildGuardianFortuneContext({...input,category},{now,captureEngineFacts:true});assert.equal(built.ok,true);
  const pin=built.context[category].engineFacts,saved=readEngineFactSnapshot(clone(pin),{system:category});
  const prompt=JSON.parse(api.formatGuardianFortuneContextForPrompt(clone(built.context)));
  assert.ok(JSON.stringify(prompt).includes(saved.digest));assert.equal(saved.support,'candidate');
  if(category==='ziwei'){assert.equal(saved.facts.sourceFacts.palaces.length,12);assert.ok(saved.facts.sourceFacts.bureau);assert.ok(saved.facts.sourceFacts.fourTransformations)}
  else {assert.deepEqual(saved.facts.cards,clone(built.context.tarot.cards));assert.ok(saved.facts.spreadId);assert.ok(saved.facts.questionType)}
 }
});
test('three Swiss systems consume injected synthetic facts only; default providers never execute',async()=>{
 for(const category of ['astrology','vedic','sukuyo']) {
  const denied=await api.buildGuardianFortuneContext({...input,category},{now,captureEngineFacts:true});assert.equal(denied.ok,false);assert.equal(denied.errorCode,'ENGINE_PROVIDER_BLOCKED');
  const synthetic={evidence:['synthetic-fixture'],sunSummary:'fixture',lagnaSummary:'fixture',birthMansion:'fixture',support:'pending',candidates:['unresolved'],ascendant:null,houses:null};
  const built=await api.buildGuardianFortuneContext({...input,category},{now,captureEngineFacts:true,env:{NODE_ENV:'test'},adapters:{[category]:async()=>synthetic}});
  assert.equal(built.ok,true);const pin=built.context[category].engineFacts;
  assert.equal(pin.support,'pending');assert.deepEqual(clone(pin.facts),synthetic);assert.ok(api.formatGuardianFortuneContextForPrompt(built.context).includes(pin.digest));
 }
});
test('unknown time stays pending with no fabricated ziwei chart',async()=>{
 const result=await api.buildGuardianFortuneContext({...input,category:'ziwei',birthTime:'',birthTimeUnknown:true},{now,captureEngineFacts:true});
 assert.equal(result.ok,true);assert.equal(result.context.ziwei.engineFacts.support,'pending');assert.equal(result.context.ziwei.engineFacts.facts.sourceFacts,undefined);
});
test('all six systems reject corruption, wrong system/input/version while preserving candidate/null fields',()=>{
 for(const system of ['saju','ziwei','tarot','astrology','vedic','sukuyo']){
  const original={status:'pending',candidates:['one','two'],final:null};const pin=createEngineFactSnapshot(system,original,{profile:'a',locale:'ko',question:'q'});
  assert.deepEqual(engineFactPrompt(pin).facts,original);assert.equal(original.final,null);
  assert.throws(()=>readEngineFactSnapshot({...pin,support:'confirmed'}));
  assert.throws(()=>readEngineFactSnapshot({...pin,engineVersion:'future'}));
  assert.throws(()=>readEngineFactSnapshot(pin,{system:'other'}));
  assert.throws(()=>readEngineFactSnapshot(pin,{input:{profile:'b'}}));
  assert.throws(()=>readEngineFactSnapshot({...pin,facts:{...original,final:'one'}}));
 }
});
test('actual paid producer/render resume stored facts after OFF without recalculation; original completed text preserved',async()=>{
 const built=await api.buildGuardianFortuneContext(input,{now,captureEngineFacts:true});const pin=built.context.tarot.engineFacts;
 const source=fs.readFileSync('worker/lib/guardian-paid-delivery.js','utf8'),ast=ts.createSourceFile('paid.js',source,ts.ScriptTarget.Latest,true);
 const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='guardianNarrativeAdapter');let calls=0;
 const answer={headline:'original',body:'stored answer'};
 const ctx=vm.createContext({readEngineFactSnapshot,parseAnswer:JSON.parse,hasUsableGuardianFortuneResult:()=>true,countGuardianFortuneVisibleTextLength:()=>500,GUARDIAN_FORTUNE_RESULT_LENGTH:{min:400}});
 vm.runInContext(fn.getText(ast).replace(/^export /,''),ctx);
 const adapter=ctx.guardianNarrativeAdapter({NODE_ENV:'test'},'owner',async args=>{calls++;assert.equal(args.context.tarot.engineFacts.digest,pin.digest);return {result:answer}});
 const state={input,context:clone(built.context),body:{requestId:'same-request'},parts:{},evidenceHash:'stored'};
 const part=await adapter.produce({id:'answer',minChars:400},state);assert.equal(calls,1);state.parts.answer=part.body;
 const reread=clone(adapter.render(state));assert.deepEqual(reread.result,answer);assert.equal(reread.engineFacts.tarot.digest,pin.digest);assert.equal(calls,1);
 const lost=clone(state);delete lost.context.tarot.engineFacts;await assert.rejects(()=>adapter.produce({id:'answer',minChars:400},lost),/SNAPSHOT_REQUIRED/);assert.equal(calls,1);
 state.context.tarot.engineFacts.digest='corrupt';await assert.rejects(()=>adapter.produce({id:'answer',minChars:400},state));assert.equal(calls,1);
});

test('browser SHA-256 equals existing Node digests for UTF-8 and block boundaries',async()=>{
 const {sha256Text}=await import('../../lib/sha256-text.mjs');
 for(const text of ['', 'abc', '한글 별자리 🌙', '\ud800', ...Array.from({length:130},(_,n)=>'x'.repeat(n)), 'a'.repeat(1000000)])
  assert.equal(sha256Text(text),createHash('sha256').update(text).digest('hex'));
});
