import '../../tools/oracle/next-delivery/guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as calendar from '../../lib/korean-calendar/index.js';
import * as natal from '../../worker/lib/saju-natal-analysis.js';
import * as temperament from '../../worker/lib/saju-temperament.js';
import * as life from '../../worker/lib/life-book-ai-saju.js';
import * as prevention from '../../worker/lib/fortune-prevention.js';
import {connectNewYearTiming,pinRepresentativeFacts,readRepresentativeFacts} from '../../worker/lib/representative-consumer-facts.js';
const source=fs.readFileSync('worker/routes/new-year-ai.js','utf8');
const ast=ts.createSourceFile('new-year.js',source,ts.ScriptTarget.Latest,true);
const declarations=new Map();
for(const n of ast.statements){
 if(ts.isFunctionDeclaration(n)&&n.name)declarations.set(n.name.text,n);
 if(ts.isVariableStatement(n))for(const d of n.declarationList.declarations)if(ts.isIdentifier(d.name))declarations.set(d.name.text,n);
}
const selected=new Set();
function select(name){const n=declarations.get(name);if(!n||selected.has(n))return;selected.add(n);function visit(child){if(ts.isIdentifier(child))select(child.text);ts.forEachChild(child,visit)}ts.forEachChild(n,visit)}
select('calculateNewYearFortuneData');select('buildCanonicalNewYearFacts');
const context=vm.createContext({...calendar,...natal,...temperament,...life,...prevention,console,Date,JSON});
vm.runInContext(ast.statements.filter(n=>selected.has(n)).map(n=>n.getText(ast)).join('\n'),context);
const birth={birthDate:'2000-05-15',birthTime:'08:30',calendarType:'solar',gender:'male'};
for(const variant of [birth,{...birth,gender:'female'},{...birth,timeUnknown:true,birthTime:''},{...birth,calendarType:'lunar'}]){
 test('representative New Year consumes actual same-natal major luck '+JSON.stringify(variant),()=>{
  const raw=context.calculateNewYearFortuneData({birthInfo:variant,targetYear:2026,focusArea:'overall'});
  assert.equal(connectNewYearTiming(raw,variant,{}),raw);
  const result=connectNewYearTiming(raw,variant,{SAJU_CONSUMER_FACTS_V1:'true'});
  assert.deepEqual(result.majorLuck,life.calculateLifeBookAiSaju(variant,{year:2026}).majorLuck);
  assert.equal(result.advancedSajuSummary.daewoonSewoon.majorLuck,result.majorLuck);
  const saved=JSON.parse(JSON.stringify(result));assert.deepEqual(readRepresentativeFacts(saved,'new-year'),saved);
  const changed=structuredClone(saved);changed.majorLuck.direction='tampered';assert.throws(()=>readRepresentativeFacts(changed,'new-year'),/MISMATCH/);
  const lines=context.buildCanonicalNewYearFacts(result);assert.match(JSON.stringify(lines),/대운/);
 });
}
test('representative pin rejects different natal and preserves legacy/candidate statuses',()=>{
 const raw=context.calculateNewYearFortuneData({birthInfo:birth,targetYear:2026});
 assert.throws(()=>connectNewYearTiming(raw,{...birth,birthDate:'2000-05-16'},{SAJU_CONSUMER_FACTS_V1:'true'}),/NATAL_MISMATCH/);
 const legacy={candidate:['a'],final:null,status:'pending'};assert.equal(readRepresentativeFacts(legacy,'love-secret'),legacy);
 const saved=JSON.parse(JSON.stringify(pinRepresentativeFacts(legacy,{SAJU_CONSUMER_FACTS_V1:'true'},'love-secret')));
 assert.equal(readRepresentativeFacts(saved,'love-secret').final,null);assert.throws(()=>readRepresentativeFacts(saved,'new-year'),/MISMATCH/);
});
