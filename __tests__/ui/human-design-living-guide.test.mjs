import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {assembleChart} from '../../lib/human-design/chart.js';
import {CANONICAL_PROFILES} from '../../lib/human-design/profile.js';
import {CHANNELS} from '../../lib/human-design/channels.js';
const bundled=await build({entryPoints:['app/human-design/_copy/living-guide.ts'],bundle:true,write:false,format:'esm',platform:'node',alias:{'@':process.cwd()}});
const {buildGuide,connectionGuide}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const ctx=vm.createContext({});vm.runInContext(readFileSync('js/core/saju/destiny-anatomy/hd-copy.generated.js','utf8'),ctx);
const locales=['ko','en','ja','zh-CN','zh-TW'];
const snapshots=JSON.parse(readFileSync('__tests__/fixtures/human-design/ephemeris-snapshot.json','utf8')).rows;
const charts=snapshots.map(row=>assembleChart({personalityLongitudes:row.personality,designLongitudes:row.design}));
test('차트와 언어별 표시 설명은 결정적이며 React와 정적 셸이 일치한다',()=>{
  for(const chart of charts) for(const L of locales){
    const before=JSON.stringify(chart),g=buildGuide(chart,L);
    assert.ok(g.nickname && g.decision && g.type.example && g.authority.action);
    assert.equal(JSON.stringify(chart),before,'표시 계층이 계산 차트를 바꾸면 안 된다');
    assert.equal(JSON.stringify(g),JSON.stringify(ctx.DestinyAnatomyLivingGuide.buildGuide(chart,L)));
    if(L!=='ko') assert.doesNotMatch(JSON.stringify(g),/[가-힣]/);
    assert.doesNotMatch(JSON.stringify(g),/NaN/);
    assert.equal(g.centers.length,9);
  }
});
test('12개 프로파일과 7개 권위, 5개 타입을 빠짐없이 설명한다',()=>{
  const c=charts[0];
  for(const profile of CANONICAL_PROFILES) {const g=buildGuide({...c,profile},'ko');assert.equal(g.profileText.length,2);assert.ok(g.profileQuestion);}
  for(const type of ['GENERATOR','MANIFESTING_GENERATOR','PROJECTOR','MANIFESTOR','REFLECTOR']) for(const authority of ['EMOTIONAL','SACRAL','SPLENIC','EGO','SELF_PROJECTED','MENTAL','LUNAR']) {
    assert.ok(buildGuide({...c,type:'TYPE_'+type,authority:'AUTHORITY_'+authority},'ko').authority.action);
  }
  assert.equal(buildGuide({...c,type:'unknown'},'ko'),null);
  assert.equal(buildGuide({...c,profile:'9/9'},'ko').profile,'');
});
test('미정의·완전한 열림을 활성 게이트로 구분하며 채널을 지어내지 않는다',()=>{
  const c={...charts[0],definedCenters:[],activeGates:[64],channels:[]};
  let g=buildGuide(c,'ko');
  assert.equal(g.centers.find(x=>x.id==='HEAD').state,'undefined');
  assert.equal(g.centers.find(x=>x.id==='ROOT').state,'open');
  g=buildGuide({...c,definedCenters:['HEAD','AJNA'],activeGates:[64,47],channels:[{channelId:'64-47'}]},'ko');
  assert.equal(g.centers.find(x=>x.id==='HEAD').state,'defined');
  assert.match(connectionGuide(c,{kind:'gate',gate:64},'ko').lines.join(' '),/완성된 채널.*단정하지/);
  for(const channel of CHANNELS){const detail=connectionGuide(c,{kind:'channel',channelId:channel.channelId},'en');assert.equal(detail.lines.length,1);assert.ok(detail.action);}
  for(let gate=1;gate<=64;gate++) assert.ok(connectionGuide(c,{kind:'gate',gate},'ko').lines.length);
});


test('공유 취소는 저장하지 않고 미지원·실패는 이미지 저장으로 이어진다',async()=>{
  const bundled=await build({entryPoints:['app/human-design/_lib/manual-share.ts'],bundle:true,write:false,format:'iife',globalName:'Share',platform:'browser'});
  for(const outcome of ['cancelled','unsupported','failed','shared']) {
    let downloads=0,shares=0;
    const navigator=outcome==='unsupported'?{}:{canShare:()=>true,share:async()=>{shares++;if(outcome==='cancelled'){const e=new Error('cancel');e.name='AbortError';throw e;}if(outcome==='failed')throw new Error('failure');}};
    const context=vm.createContext({Error,File,navigator,location:{origin:'https://example.test'},URL:{createObjectURL:()=> 'blob:mock',revokeObjectURL:()=>{}},setTimeout:()=>{},document:{body:{appendChild:()=>{}},createElement:()=>({click:()=>downloads++,remove:()=>{}})}});
    vm.runInContext(bundled.outputFiles[0].text,context);
    const result=await context.Share.deliverManualImage(new Blob(['image']),true,'manual','feed');
    assert.equal(result,outcome==='cancelled'?'cancelled':outcome==='shared'?'shared':'saved');
    assert.equal(downloads,['unsupported','failed'].includes(outcome)?1:0);
    assert.equal(shares,outcome==='unsupported'?0:1);
  }
});


test('설명서 이미지는 두 비율을 지키고 영문 단어 중간을 자르지 않는다',async()=>{
  const bundle=await build({entryPoints:['app/human-design/_lib/manual-share.ts'],bundle:true,write:false,format:'iife',globalName:'Share',platform:'browser'});
  for(const format of ['feed','story']) {
    const drawn=[];
    const ctx={fillRect:()=>{},strokeRect:()=>{},measureText:text=>({width:text.length*Number(ctx.font.match(/ ([0-9]+)px/)[1])*0.5}),fillText:text=>drawn.push(text)};
    const canvas={getContext:()=>ctx,toBlob:done=>done(new Blob(['image']))};
    const scope=vm.createContext({Blob,document:{fonts:{ready:Promise.resolve()},createElement:()=>canvas,getElementById:()=>({closest:()=>({})})},getComputedStyle:()=>({fontFamily:'sans-serif',getPropertyValue:()=> '#fff'})});
    vm.runInContext(bundle.outputFiles[0].text,scope);
    await scope.Share.createManualImage({title:'Manual',nickname:'Fast at switching interest tabs',type:'Generator',profile:'1/3',decision:'Take a moment',question:'How do you decide?'},format);
    assert.equal(canvas.width,1080);assert.equal(canvas.height,format==='feed'?1350:1920);
    assert.ok(drawn.includes('interest tabs'));assert.ok(!drawn.some(line=>line.endsWith('interes')));
  }
});
