import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundled=await build({entryPoints:['worker/yeongnyangi/fortune/shared/prompt.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {buildPrompt}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const input={question:'일과 관계의 흐름을 알려 주세요.'};
function context(domain){return {domain,engineVersion:'fixture',calculatedAt:'2026-09-30',limitations:[],facts:[{id:domain+'.pillars',label:'pillars',value:{day:'甲子'}}]};}
test('saju prompts share the supplied facts while distinguishing interpretation conditions',()=>{
  const calculated=context('saju'),before=JSON.stringify(calculated);
  const request=buildPrompt(input,calculated,'tuna','사주 해석',['성향','시기']);
  assert.match(request.system,/원국·대운·세운의 실제 근거.*성립 조건, 완화·반대 조건/);
  assert.match(request.system,/합과 합화, 장간의 존재와 통근의 성립/);
  assert.match(request.system,/모든 장은 같은 일간·월령·십성·용신 후보/);
  assert.deepEqual(request.calculatedData.facts,calculated.facts);
  assert.equal(JSON.stringify(calculated),before);
  assert.equal(request.promptVersion,'saju-v1.1.0-conditional-basis');
});
test('the five other traditions retain their own prompt scope and versions',()=>{
  for(const domain of ['ziwei','sukuyo','vedic','astrology','tarot']){
    const request=buildPrompt(input,context(domain),'tuna',domain,['해석']);
    assert.doesNotMatch(request.system,/비겁쟁재|식신생재|식신제살|월령|통근/);
    assert.equal(request.promptVersion,domain+'-v1.0.0');
    assert.equal(request.calculatedData.domain,domain);
  }
});
