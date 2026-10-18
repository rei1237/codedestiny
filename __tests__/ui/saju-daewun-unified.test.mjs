import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
const engine=fs.readFileSync('js/saju-engine.js','utf8');
const start=engine.indexOf('function renderCurrentSeasonSummary(bazi){');
const end=engine.indexOf('// 🔴 종합 풀이',start);
function fixture(){
 const dom=new JSDOM('<section id="currentSeasonCard"><div id="currentSeasonSummary"></div></section>');
 const card=dom.window.document.getElementById('currentSeasonCard');
 const box=dom.window.document.getElementById('currentSeasonSummary');
 const rows=[];
 const ctx={document:dom.window.document,console,CURRENT_AGE:35,unlocked:false,
  GAN:{甲:{e:'wood',n:'갑목'}},JI:{子:{e:'water',a:'쥐'}},
  _coreEightChar:()=>({getYearGan:()=> '甲',getYearZhi:()=> '子'}),
  evalDaewun:()=>({score:60,label:'준비를 펼칠 때',tagCls:'good',emoji:'',evalSummary:'흐름을 살펴요'}),
  getDetailedGaeun:()=>({love:'관계',wealth:'재물',career:'일'}),_getDwHapResults:()=>[],
  _cdSajuGateUnlocked:key=>ctx.unlocked&&key==='section_daewun',
  G_DAEWUN:[{age:30,g:'甲',j:'子'}],
  SajuReadingPresentation:{setFlow:value=>{rows.splice(0,rows.length,...value);if(!value.length)box.innerHTML='';}}
 };
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(engine.slice(start,end),ctx);
 return {ctx,card,box,rows};
}
test('current-year chapter follows the same unlock and clears after relocking',()=>{
 const {ctx,card,box,rows}=fixture();
 ctx.renderCurrentSeasonSummary();
 assert.equal(box.innerHTML,'');assert.equal(card.style.display,'none');assert.equal(rows.length,0);
 ctx.unlocked=true;ctx.renderCurrentSeasonSummary();
 assert.match(box.textContent,/현재 대운/);assert.match(box.textContent,/올해의 나/);
 assert.match(box.textContent,/아래 대운표에서 시기를 선택/);
 assert.doesNotMatch(box.textContent,/무료|프리미엄에서 이어/);
 assert.equal(rows.length,2);assert.equal(card.style.display,'block');
 ctx.unlocked=false;ctx.renderCurrentSeasonSummary();
 assert.equal(box.innerHTML,'');assert.equal(rows.length,0);assert.equal(card.style.display,'none');
});
test('before first cycle and unknown-hour charts do not invent a current cycle',()=>{
 const {ctx,box,rows}=fixture();ctx.unlocked=true;ctx.G_DAEWUN=[];ctx.renderCurrentSeasonSummary();
 assert.equal(rows.length,1);assert.equal(rows[0].kind,'year');
 assert.doesNotMatch(box.textContent,/지금 내가 지나는 시기/);assert.match(box.textContent,/올해의 나/);
});
