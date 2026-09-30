import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync('js/saju-engine.js','utf8');
const ast=ts.createSourceFile('saju-engine.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const declarations=new Map();
for(const node of ast.statements){
  if(ts.isFunctionDeclaration(node)&&node.name)declarations.set(node.name.text,node.getText(ast));
  if(ts.isVariableStatement(node))for(const d of node.declarationList.declarations)if(ts.isIdentifier(d.name))declarations.set(d.name.text,`var ${d.getText(ast)};`);
}
const names=['CD_SAMHAP','sajuSamhapState','_sajuVillainBuildBranchRelations','getDaewunBranchEvidence'];
for(const name of names)assert.ok(declarations.has(name),name);
const evidence=new Function('_sajuEngineText',names.map(name=>declarations.get(name)).join('\n')+';return getDaewunBranchEvidence;')(key=>key);
const chart=(...branches)=>Object.fromEntries(['y','m','d','h'].map((key,i)=>[key,{j:branches[i]||''}]));

test('대운의 형·파·해 근거는 실제 원국 자리와 연결된다',()=>{
  const p=chart('卯','未','酉','辰');
  const rows=evidence('子',p,false);
  for(const [type,partner,position] of [['지지형','卯','년주'],['지지해','未','월주'],['지지파','酉','일주']]){
    assert.ok(rows.some(row=>row.type===type&&row.partner===partner&&row.positions.includes(position)));
  }
  assert.ok(rows.some(row=>row.type==='지지반합'&&row.partner==='辰'));
  assert.deepEqual(p,chart('卯','未','酉','辰'));
});
test('시주 미상은 시주의 반합과 형파해를 근거에 넣지 않는다',()=>{
  const rows=evidence('子',chart('卯','未','酉','辰'),true);
  assert.equal(rows.some(row=>row.partner.includes('辰')||row.positions.includes('시주')),false);
  assert.ok(rows.some(row=>row.type==='지지형'));
});
test('삼형과 삼합의 세 글자는 중복으로 채우지 않는다',()=>{
  assert.ok(evidence('申',chart('寅','巳','辰'),false).some(row=>row.type==='지지형'&&row.partner==='寅·巳'));
  assert.equal(evidence('申',chart('寅','寅','辰'),false).some(row=>row.type==='지지형'),false);
  const complete=evidence('申',chart('子','辰','丑'),false).find(row=>row.type==='지지삼합');
  assert.ok(complete);assert.equal(complete.transformed,false);assert.equal(complete.hapEl,'water');
  assert.equal(evidence('申',chart('辰','辰','丑'),false).some(row=>/합/.test(row.type)),false);
});
