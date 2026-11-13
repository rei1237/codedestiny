import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {buildSajuSectionHtml} from '../../../worker/lib/saju-section/report.js';
import {JSDOM} from 'jsdom';
import * as KoreanCalendar from '../../../lib/korean-calendar/index.js';
import * as SajuNatalCore from '../../../lib/saju/natal-core/index.mjs';
import {buildDashboardModule} from '../service/saju-dashboard-loader.mjs';

const original=async name=>readFile(new URL('../../../'+name,import.meta.url),'utf8');
const moduleSource=(await buildDashboardModule()).replace(/^import .*?;\n/gm,'').replace(/export (const|function)/g,'$1');

for(const known of [true,false])test('public web dashboard renders personal results and actions with '+(known?'known':'unknown')+' hour',async()=>{
  const dom=new JSDOM('<div id="reportDashboardCard"><div id="sajuFourCutResult"></div></div><div id="dopamineCard"><div id="dopamineResult"></div></div><div id="hormone-vibe-section"><div id="hormoneVibeResult"></div></div><div id="tTestResult"></div>',{url:'http://localhost'});
  const {document}=dom.window;
  document.body.insertAdjacentHTML('beforeend','<div id="lottoCard"><div id="lottoSaved"></div><div id="lottoSection"></div></div>');
  dom.window.HTMLElement.prototype.scrollIntoView=()=>{};
  const context=vm.createContext({document,SajuNatalCore,KoreanCalendar,localStorage:dom.window.localStorage,console,setTimeout,clearTimeout,setInterval,clearInterval,requestAnimationFrame:()=>{},matchMedia:()=>({matches:true})});
  const date='1992-05-07',place={name:'서울',latitude:37.5665,longitude:126.978,timezone:'Asia/Seoul',baseTzOffset:9};
  const {pillars}=KoreanCalendar.calculateNatalSaju({birthDate:date,birthTime:'08:30',birthTimeUnknown:!known,birthPlace:place});
  const chart=Object.fromEntries(Object.entries(pillars).map(([key,value])=>[key[0],{g:value?.[0]||'',j:value?.[1]||''}]));
  const originalInput={birth:{calendarDate:date,calType:'solar',hour:known?8:null,minute:known?30:null,timeKnown:known},place,gender:'M',mode:'pig',lang:'ko'};
  const prepare=vm.runInContext(moduleSource+'\nprepareDashboard',context);
  const shared=[],saved=[];
  const reading=prepare(chart,document,{share:text=>shared.push(text),save:(node,name)=>saved.push([node,name])});
  try{
    assert.equal(Object.values(reading.data.natal.counts).reduce((a,b)=>a+b),known?9:7);
    assert.equal(reading.prompts('M').length,13);assert.equal(new Set(reading.prompts('M').map(item=>item.prompt)).size,13);
    const webPrompts=buildSajuSectionHtml({...originalInput,featureKey:'saju_natal_reading'}).imagePrompts;
    assert.deepEqual(JSON.parse(JSON.stringify(reading.prompts('M'))),webPrompts);
    assert.deepEqual(JSON.parse(JSON.stringify(reading.prompts('F'))),buildSajuSectionHtml({...originalInput,gender:'F',featureKey:'saju_natal_reading'}).imagePrompts);
    reading.hormone();
    assert.match(document.querySelector('#hormoneVibeResult').textContent,/테토·에겐 화학식 리포트/);
    assert.match(document.querySelector('[data-tetogen-premium-report]').textContent,/십성의 분포/);
    reading.extreme();
    const extremeText=document.getElementById('tTestResult').textContent;
    const webPanels=buildSajuSectionHtml({...originalInput,featureKey:'sukuyo-extreme-t-relationship'});
    for(const html of [webPanels.html,webPanels.sajuBaseHtml,webPanels.prescriptionHtml]){
      const panel=document.createElement('div');panel.innerHTML=html;
      assert.ok(extremeText.includes(panel.textContent),'original web relationship body');
    }
    for(const label of ['장점 스캔','치명적 버그','관계 회로','연애 알고리즘','현실 처리 능력','사주 기반 극T 해석','디버깅 처방전','숨겨진 본성'])assert.ok(extremeText.includes(label),label);
    reading.fourCut();
    for(const button of ['운명필터','러브DM','갓생루틴','흑역사방지']){
      [...document.querySelectorAll('.s4c-variant-btn')].find(el=>el.textContent.includes(button)).click();
      assert.equal(document.querySelectorAll('.s4c-frame').length,4);
      assert.match(document.querySelector('[aria-pressed=true]').textContent,new RegExp(button));
    }
    document.querySelector('.s4c-btn--sticker').click();
    assert.equal(document.querySelectorAll('.s4c-user-sticker').length,1);
    document.querySelector('.s4c-btn--kakao').click();
    document.querySelector('.s4c-actions button').click();
    assert.match(shared[0],/1\).*\n2\).*\n3\).*\n4\)/);
    assert.ok(saved[0][0].hasAttribute('data-s4c-capture'));
    reading.dopamine();
    document.querySelector('[data-dp-start]').click();
    assert.ok(document.querySelector('#dp-study-title'));
    assert.equal(document.querySelectorAll('.dp-legend-row').length,8);
    const basisCode=await original('js/core/saju/dopamineResult.js');
    // Independent source evaluation against the same four-pillar input and original helpers.
    const engine=await original('js/saju-engine.js');
    const {extractSajuCompatClosure}=await import('../../../scripts/lib/saju-compat-closure.mjs');
    const {order,decl}=extractSajuCompatClosure(engine,['GAN','JI','getTenGod','cdTwelveStage','_sajuVillainExtractMajorSinsal','_sajuVillainBuildBranchRelations']);
    const helpers=order.map(name=>decl.get(name)).sort((a,b)=>a.node.pos-b.node.pos).map(row=>row.text).join('\n');
    const expected={cdGetCurrentLanguage:()=>'ko'};
    vm.runInNewContext(helpers+'\nObject.assign(window,{GAN,JI,getTenGod,cdTwelveStage,_sajuVillainExtractMajorSinsal,_sajuVillainBuildBranchRelations});',{window:expected});
    vm.runInNewContext(basisCode,{window:expected});
    const focus=expected.buildDopamineResult(reading.data);
    assert.equal(document.querySelector('.dp-score-value b').textContent,String(focus.score));
    assert.ok(document.getElementById('dopamineResult').textContent.includes(focus.study.method));
    document.querySelector('[data-dp-share]').click();document.querySelector('[data-dp-save]').click();
    assert.match(shared[1],new RegExp(focus.grade));assert.ok(saved[1][0].hasAttribute('data-dp-capture'));
    assert.equal(document.querySelectorAll('[data-extreme-t-lock-button]').length,0);
    const birth={gender:'M',termClock:{year:1992,month:5,day:7,hour:8,minute:30},civilYear:1992,storageKey:'mock-account-a'};
    reading.lotto(birth);
    const games=[...document.querySelectorAll('.lc-game')];
    assert.equal(games.length,5);
    for(const game of games)assert.equal(new Set([...game.querySelector('.lc-balls').children].map(el=>el.textContent)).size,6);
    document.querySelector('[data-action="openLottoRitualReport"]').click();
    const body=document.getElementById('lottoRitualReportArea');
    assert.equal(body.hidden,false);
    assert.equal(body.querySelectorAll('.lr-number-chip').length,6);
    const savedSummary=body.querySelector('#lottoRitualShareCard').textContent;
    body.querySelector('.lr-actions button').click();
    assert.equal(JSON.parse(dom.window.localStorage.getItem('mock-account-a')).length,1);
    const reopened=prepare(chart,document,{share(){},save(){}});
    reopened.lotto({...birth,storageKey:'mock-account-b'});
    assert.equal(document.querySelector('#lottoSaved button'),null);
    reopened.lotto(birth);
    document.querySelector('#lottoSaved button').click();
    assert.equal(body.isConnected,false);
    assert.equal(document.getElementById('lottoRitualShareCard').textContent,savedSummary);
    assert.equal(document.querySelector('.lc-games .lc-game p').textContent,JSON.parse(dom.window.localStorage.getItem('mock-account-a'))[0].freeGames[0].nums.join(' · '));
  }finally{dom.window.close();}
});
