import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSajuRelationshipEvidence as build } from '../../worker/lib/saju-relationship-evidence.js';
import { normalizeSajuCompatInput, groupFields, shapeSajuCompatGroup, buildSajuCompatPart, completeSajuCompatPart, assembleSajuCompatSnapshot } from '../../worker/lib/saju-compat-schema.js';
import { requestBody, samplePairs, llmResponse } from '../fixtures/saju-compat-llm-fixture.mjs';
const chart = text => ({ pillars:text.split(' ').map(p => ({gan:p[0],ji:p[1]})) });
test('all sixteen cross positions are deterministic and separate from twelve natal pairs', () => {
 const a=chart('甲子 乙丑 丙寅 丁卯'), b=chart('戊辰 己巳 庚午 辛未');
 const r=build(a,b); assert.deepEqual(r,build(a,b)); assert.equal(r.cross.length,16); assert.equal(r.natal.length,12);
 assert.equal(new Set(r.cross.map(v=>v.id)).size,16); assert.equal(r.dayStem.direction,'본인이 상대를 극함');
});
test('wonjin and gwimun differ; overlapping relations are retained', () => {
 const a=chart('甲子 乙丑 丙辰 丁卯'), b=chart('己未 癸酉 壬午 癸亥');const r=build(a,b);
 assert.deepEqual(r.cross[0].branches,['해','원진']);assert.deepEqual(r.cross[1].branches,['파','귀문']);
 assert.ok(r.cross.some(v=>v.from.ji==='辰'&&v.to.ji==='亥'&&v.branches.includes('원진')&&v.branches.includes('귀문')));
});
test('two distinct triad letters are partial; three letters never imply transformation', () => {
 const a=chart('甲申 甲申 甲申 甲申'), b=chart('甲子 甲子 甲子 甲子');
 assert.equal(build(a,b).triads.length,0);assert.ok(build(a,b).cross[0].branches.includes('삼합 부분 관계'));
 b.pillars[3]={gan:'甲',ji:'辰'};assert.equal(build(a,b).triads[0].transformationConfirmed,false);
});
test('unknown hour is excluded from every relation and its narrative field', () => {
 const body=requestBody(...samplePairs(21,1)[0]);body.self.birthTimeUnknown=true;const input=normalizeSajuCompatInput(body);
 assert.equal(input.facts.relationship.cross.length,12);assert.ok(input.facts.relationship.cross.every(v=>v.from.pillar!=='hour'));
 assert.ok(!groupFields('core',input).required.some(v=>v.path==='pillarStory.hour'));
});
test('old saved inputs and parts finish under version one without adding story fields', () => {
 const input=normalizeSajuCompatInput(requestBody(...samplePairs(21,1)[0]));delete input.schemaVersion;delete input.promptVersion;delete input.facts.relationship;
 const shaped=shapeSajuCompatGroup('core',llmResponse('core',input),input);
 const body=buildSajuCompatPart('core',shaped,{schemaVersion:1,promptVersion:'saju-compat-basic-p1'});
 assert.equal(completeSajuCompatPart(body),true);assert.ok(!shaped.required.some(v=>v.startsWith('pillarStory')));
 const snap=assembleSajuCompatSnapshot({input,tasks:[{id:'core'}],parts:{core:body}});assert.equal(snap.schemaVersion,1);assert.equal(snap.promptVersion,'saju-compat-basic-p1');
});
test('present wonjin/gwimun evidence survives sanitization but unsupported daewoon does not', () => {
 const input=normalizeSajuCompatInput(requestBody('甲子 乙丑 丙寅 丁卯','己未 癸酉 壬午 癸亥'));
 const raw=llmResponse('core',input);raw.pillarStory.year='년주 원진은 서로 기대한 반응이 달라지는 조건을 확인하며 일상에서 약속을 조율할 단서로 읽습니다. 귀문은 감정을 세밀하게 읽는 경향과 오해할 여지를 함께 살펴봅니다. 내년 대운이 두 사람의 관계를 바꿉니다.';
 const r=shapeSajuCompatGroup('core',raw,input);assert.match(r.value.pillarStory.year,/원진/);assert.match(r.value.pillarStory.year,/귀문/);assert.doesNotMatch(r.value.pillarStory.year,/대운/);
});
