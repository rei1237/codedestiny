import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build,transform} from 'esbuild';
import ts from 'typescript';
import {calculateNatalSaju} from '../../lib/korean-calendar/index.js';
for(const path of ['worker/yeongnyangi/service.ts','worker/yeongnyangi/free-service.ts']) {
 const file=ts.createSourceFile(path,fs.readFileSync(path,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 const source=file.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='birthFromProfile').getText(file);
 const {code}=await transform(source+'\nexport default birthFromProfile;',{loader:'ts',format:'esm'});
 const {default:normalize}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 test(path+' retains unlabeled birthplace, leap month and unknown time',()=>{
  const p={birth:{year:1988,month:1,day:7,hour:23,minute:26,calType:'solar'},location:{lat:35.1796,lng:129.0756,tz:'Asia/Seoul',label:''}};
  const input=normalize(p,false);assert.equal(input.birthPlace.longitude,129.0756);
  assert.equal(calculateNatalSaju(input).calculationMeta.correction.appliedMinutes,-24);
  p.birth.calType='lunar_leap';assert.equal(normalize(p,false).leapMonth,true);
  p.birth.timeUnknown=true;assert.equal(normalize(p,false).birthTime,undefined);
 });
}

const bundled=await build({entryPoints:['worker/yeongnyangi/fortune/saju/index.ts'],bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const {saju}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
test('Incheon 23:26 uses the same corrected Gihae hour in the paid/free saju domain',async()=>{
 const input=saju.validateInput({personA:{birthDate:'1988-01-07',birthTime:'23:26',gender:'female',calendarType:'solar',birthPlace:{latitude:37.456,longitude:126.7052,timezone:'Asia/Seoul',label:'인천'}},topicId:'general',question:''});
 const context=await saju.calculate(input,{asOf:'2026-09-26'});
 assert.deepEqual(context.facts.find(f=>f.id==='saju.pillars').value,{year:'丁卯',month:'癸丑',day:'辛酉',hour:'己亥'});
});
