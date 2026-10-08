import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),Module=require('node:module');
const bundle=await build({stdin:{contents:"export * from './app/yeongnyangi/_lib/intake-chat'; export {recommendQuestion,assertQuestionOrder} from './worker/yeongnyangi/fortune/ask/question-policy';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false});
const mod=new Module(path.resolve('intake-chat-test.cjs'));mod.paths=Module._nodeModulePaths(process.cwd());mod._compile(bundle.outputFiles[0].text,mod.id);
const p=mod.exports;
const value=(patch={},domain='saju')=>({domain,question:'내 마음을 어떻게 표현할까?',decision:{...p.emptyIntakeDecision(),situation:'연락을 기다리고 있어요',...patch}});
test('scope steps follow existing product policy and conditional inputs',()=>{
 assert.ok(!p.intakeSteps(value()).includes('options'));
 for(const category of ['study','career','job_change','money','business','move']){
  const v=value({category});
  assert.ok(p.intakeSteps(v).includes('options'));assert.ok(p.intakeSteps(v).includes('constraints'));
  assert.equal(p.intakeStepValid('period',v),false);
 }
 assert.ok(p.intakeSteps(value({target:'pair'})).includes('relationshipType'));
 assert.equal(p.intakeStepValid('period',value()),true);
 assert.equal(p.intakeStepValid('period',value({horizon:'transition'})),false);
});
test('scope confirmation preserves server contract and blocks unsupported combinations',()=>{
 for(const [patch,fish] of [[{},'mackerel'],[{category:'career',options:'취업 준비',constraints:'없음',period:'올해'},'salmon'],[{target:'pair',relationshipType:'family'},'flounder'],[{horizon:'transition',period:'현재와 다음 대운'},'tuna']]){
  const v=value(patch);assert.equal(p.intakeStepValid('scope',v),true);
  assert.equal(p.assertQuestionOrder({domain:v.domain,fishId:fish,readingKind:'single'},{...v.decision,confirmed:true},v.question).fish,fish);
 }
 for(const v of [value({target:'pair',horizon:'transition'}),value({horizon:'transition',period:'다음 시기'},'tarot'),value({category:'other'})])assert.equal(p.intakeStepValid('scope',v),false);
});
test('restored or edited cursors cannot skip required fields or invalid profiles',()=>{
 const v=value({situation:''});
 assert.equal(p.intakeCursor(v,false,'scope',[]).steps[p.intakeCursor(v,false,'scope',[]).index],'situation');
 const prep=[{id:'profile',valid:false},{id:'language',valid:true}];
 const cursor=p.intakeCursor(value(),true,'review',prep);assert.equal(cursor.steps[cursor.index],'profile');
 const valid=p.intakeCursor(value(),true,'review',prep.map(x=>({...x,valid:true})));assert.equal(valid.steps[valid.index],'review');
 const changed=value({category:'career'});
 const edit=p.intakeCursor(changed,true,'review',prep);assert.equal(edit.steps[edit.index],'options');
 const unknown=p.intakeCursor(value(),false,'untrusted-step',[]);assert.equal(unknown.index,0);
 const restoring=p.intakeCursor(value(),true,'review',[{id:'profile',valid:false,pending:true}]);
 assert.equal(restoring.steps[restoring.index],'review','loading profiles must not destroy the saved cursor');
});
test('question suggestions are not silently accepted as the selected topic',()=>{
 const v={...value(),question:'올해 이직을 준비해도 괜찮을까?'};
 assert.equal(v.decision.category,'self');assert.equal(p.intakeStepValid('scope',v),false);
 assert.equal(p.intakeAnswer('question',v),v.question);
});
