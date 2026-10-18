import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {writeSajuTeaDraft,readSajuTeaDraft,TEA_SAJU_URL,TEA_SAJU_DRAFT_KEY,teaSajuEntryMarkup} from '../../js/core/saju/tea-entry.mjs';
const storage = () => { const map = new Map(); return {getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}; };
test('handoff is one-use, owner-bound and carries no birth information in the URL',()=>{
 const s=storage(); writeSajuTeaDraft(s,{owner:'a',profileId:'p',question:'이직을 고민해요'},100);
 assert.deepEqual(readSajuTeaDraft(s,'a',101),{consultationMode:'saju',concernTopic:'사주 전문 상담',question:'이직을 고민해요',profileId:'p'});
 assert.equal(readSajuTeaDraft(s,'a',102),null);
 assert.deepEqual([...new URL(TEA_SAJU_URL,'https://example.test').searchParams.keys()],['mode','reading','entry']);
 writeSajuTeaDraft(s,{owner:'a',profileId:'p',question:'private'},100);
 assert.equal(readSajuTeaDraft(s,'b',101),null);
 assert.equal(s.getItem(TEA_SAJU_DRAFT_KEY),undefined);
});
test('expired, corrupt and guest profile references cannot restore another account',()=>{
 const s=storage(); writeSajuTeaDraft(s,{owner:'a'},100);
 assert.equal(readSajuTeaDraft(s,'a',1800101),null);
 s.setItem(TEA_SAJU_DRAFT_KEY,'{'); assert.equal(readSajuTeaDraft(s,'a'),null);
 writeSajuTeaDraft(s,{profileId:'private',question:'질문'},100);
 assert.equal(readSajuTeaDraft(s,'',101).profileId,undefined);
 writeSajuTeaDraft(s,{question:'guest'},100);assert.equal(readSajuTeaDraft(s,'logged-in',101),null);
 assert.doesNotThrow(()=>writeSajuTeaDraft({setItem(){throw Error('blocked')}},{}));
});
test('joint scene has one purchase entry and current cycles belong to the paid report',()=>{
 const html=teaSajuEntryMarkup();
 assert.equal((html.match(/data-tea-saju-open/g)||[]).length,1);
 assert.match(html,/연이의 해석과 네오의 전략/);
 assert.doesNotMatch(html,/15,000|10000|15000/);
 const index=fs.readFileSync('index.html','utf8');
 const doc=new JSDOM(index).window.document;
 const season=doc.getElementById('currentSeasonCard');
 assert.equal(season.closest('.cd-section-gate__body').parentElement.id,'daewunGate');
 assert.equal(doc.querySelectorAll('#currentSeasonCard').length,1);
 assert.equal(season.querySelector('.sec-tier-badge--free'),null);
 assert.doesNotMatch(season.textContent,/무료|FREE/);
});
import ts from 'typescript';
const source=fs.readFileSync('src/features/fortune-tea-house/FortuneTeaHousePage.tsx','utf8');
const ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let entryEffect, ownerEffect;
function find(node){
 if(ts.isCallExpression(node)&&node.expression.getText(ast)==='useEffect'){
  const effect=node.arguments[0]?.getText(ast)||'';
  if(effect.includes('const entryParams'))entryEffect=effect;
  if(effect.includes('const previousOwner = recoveryOwnerRef.current'))ownerEffect=effect;
 }
 ts.forEachChild(node,find);
}find(ast);
assert.ok(entryEffect);
assert.ok(ownerEffect);
const effectJs=ts.transpileModule('const effect = '+entryEffect,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const ownerEffectJs=ts.transpileModule('const ownerEffect = '+ownerEffect,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
function restoreEntry({owner='a',query='?mode=saju',s=storage(),ready=true,withOwnerEffect=false,previousOwner='',paidRecovery=null}={}){
 const result={};const context={authState:{authReady:ready},draftRestored:{current:false},window:{location:{search:query}},recoveryOwner:owner,sessionStorage:s,readSajuTeaDraft,getTeaHouseCupById:id=>({id,topic:'고민'}),setSelectedCup:x=>result.cup=x,setQuestionInput:x=>result.input=x,setStage:x=>result.stage=x,trackEvent(){}};
 Object.assign(context,{recoveryOwnerRef:{current:previousOwner},submitLockRef:{current:false},unusedPaidAttemptRef:{current:null},consultRunRef:{current:0},setIsSubmitting(){},setConsultResult(){},setPartialSections(){},setSubmitError(){},readFortuneTeaRecovery:()=>paidRecovery,probeFortuneTeaPending(){}});
 new Function(...Object.keys(context),effectJs+';effect();'+(withOwnerEffect?ownerEffectJs+';ownerEffect();':''))(...Object.values(context));return result;
}
test('actual tea direct-entry effect waits for auth, respects saved result links and restores refresh drafts',()=>{
 const s=storage();writeSajuTeaDraft(s,{owner:'a',profileId:'p',question:'이직 고민'},Date.now());
 assert.deepEqual(restoreEntry({s,ready:false}),{});
 assert.equal(restoreEntry({s}).input.profileId,'p');
 s.setItem('cd_tea_question_draft',JSON.stringify({owner:'a',at:Date.now(),input:{consultationMode:'saju',question:'이어서 쓰던 질문'},cupId:'star-black-tea'}));
 assert.equal(restoreEntry({s}).input.question,'이어서 쓰던 질문');
 assert.equal(restoreEntry({s,owner:'b'}).input.question,'');
 assert.deepEqual(restoreEntry({s,query:'?mode=saju&resultId=old-owned-result'}),{});
 assert.deepEqual(restoreEntry({s,query:'?mode=saju&history=1'}),{});
});

test('owner recovery keeps direct entry, resumes paid work, and clears an account switch',()=>{
 const s=storage();writeSajuTeaDraft(s,{owner:'a',profileId:'p',question:'새 질문'},Date.now());
 const fresh=restoreEntry({s,withOwnerEffect:true});
 assert.equal(fresh.stage,'questionInput');assert.equal(fresh.input.question,'새 질문');
 assert.equal(restoreEntry({withOwnerEffect:true}).stage,'questionInput');
 s.setItem('cd_tea_question_draft',JSON.stringify({owner:'guest',at:Date.now(),cupId:'star-black-tea',input:{consultationMode:'saju',question:'로그인 전 작성한 질문',profileId:'unverified-guest-profile'}}));
 const loginReturn=restoreEntry({s,withOwnerEffect:true});
 assert.equal(loginReturn.input.question,'로그인 전 작성한 질문');assert.equal(loginReturn.input.profileId,undefined);
 const paidRecovery={cup:{id:'original-cup'},questionInput:{question:'결제한 이전 질문'}};
 assert.equal(restoreEntry({s,withOwnerEffect:true,paidRecovery}).input.question,'결제한 이전 질문');
 const switched=restoreEntry({s,owner:'b',previousOwner:'a',withOwnerEffect:true});
 assert.equal(switched.stage,'landing');assert.deepEqual(switched.input,{});
});


test('ordinary tea saju and joint consultation retain distinct entry versions',()=>{
 assert.equal(restoreEntry({query:'?mode=saju'}).input.sajuReportVersion,undefined);
 assert.equal(restoreEntry({query:'?mode=saju&reading=joint'}).input.sajuReportVersion,'saju-specialist-v2');
});
