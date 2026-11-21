import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import ts from 'typescript';
const root=new URL('../../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const compile=path=>ts.transpileModule(read(path),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const data=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const swap=(source,spec,url)=>source.replace(new RegExp(`(['"])${spec.replace(/[./]/g,'\\$&')}\\1`,'g'),JSON.stringify(url));
const clips=data(compile('app/moonlit-lotus/model-review/sprite-clips.ts'));
const drawing=data(swap(compile('app/moonlit-lotus/_lib/bow-drawing.ts'),'../model-review/sprite-clips',clips));
const ritualUrl=data(compile('app/moonlit-lotus/_ritual/ritual-machine.ts'));
const machineUrl=data(swap(compile('app/moonlit-lotus/_ritual/companion-machine.ts'),'./ritual-machine',ritualUrl));
const M=await import(machineUrl);
const P=await import(data(swap(swap(swap(compile('app/moonlit-lotus/_ritual/companion-pose.ts'),'../model-review/sprite-clips',clips),'../_lib/bow-drawing',drawing),'./companion-machine',machineUrl)));
const {POSES}=await import(clips);
const {frontBowPoseAt}=await import(drawing);
const FX=await import(data(compile('app/moonlit-lotus/_fx/scene-fx.ts')));
const scene=(step,extra={})=>({step,lit:false,bowing:false,bows:0,wishSent:false,...extra});
const at=(m,t)=>M.companionState(m,t);

test('companion greets on arrival, then idles; each ritual step has its own state',()=>{
 let m=M.initialCompanion(scene('enter'),0);
 assert.equal(at(m,100),'greet');assert.equal(at(m,M.GREET_MS+1),'idle');
 const expected={breathe:'breathe',incense:'guide',bow:'bow',wish:'pray',dedication:'bless'};
 for(const [step,state] of Object.entries(expected)){
  m=M.companionReducer(m,{type:'scene',scene:scene(step),now:10000});
  assert.equal(at(m,10001),state,step);
 }
 assert.deepEqual([...M.COMPANION_STATES].sort(),['bless','bow','breathe','greet','guide','idle','pray','rest','react'].sort());
});
test('incense lit, three bows done and lantern rise each trigger a reaction; lantern also looks up',()=>{
 let m=M.initialCompanion(scene('incense'),0);
 m=M.companionReducer(m,{type:'scene',scene:scene('incense',{lit:true}),now:5000});
 assert.equal(at(m,5100),'react');assert.equal(at(m,5000+M.REACT_MS+1),'guide','react → guide');
 m=M.companionReducer(m,{type:'scene',scene:scene('bow',{lit:true,bowing:true}),now:8000});
 assert.equal(at(m,8001),'bow');
 m=M.companionReducer(m,{type:'tap',now:8100});assert.equal(at(m,8101),'bow','no reaction while bowing (stays in sync)');
 m=M.companionReducer(m,{type:'scene',scene:scene('bow',{lit:true,bows:3}),now:9000});assert.equal(at(m,9001),'react');
 m=M.companionReducer(m,{type:'scene',scene:scene('wish',{lit:true,bows:3}),now:12000});
 assert.equal(at(m,12001),'pray');assert.equal(m.lookUp,false);
 m=M.companionReducer(m,{type:'scene',scene:scene('wish',{lit:true,bows:3,wishSent:true}),now:13000});
 assert.equal(m.lookUp,true);assert.equal(at(m,13001),'react');
 m=M.companionReducer(m,{type:'scene',scene:scene('dedication',{lit:true,bows:3,wishSent:true}),now:15000});
 assert.equal(m.lookUp,false,'gaze resets on the next step');assert.equal(at(m,15001),'bless');
});
test('rest after 30s without input, never mid-bow or mid-breath; any input wakes it',()=>{
 let m=M.companionReducer(M.initialCompanion(scene('enter'),0),{type:'scene',scene:scene('incense'),now:0});
 assert.equal(at(m,M.REST_AFTER_MS-1),'guide');assert.equal(at(m,M.REST_AFTER_MS),'rest');
 assert.equal(M.nextChange(m,10),M.REST_AFTER_MS);assert.equal(M.stateSince(m,M.REST_AFTER_MS+500),M.REST_AFTER_MS);
 m=M.companionReducer(m,{type:'input',now:40000});assert.equal(at(m,40001),'guide');
 const breathing=M.companionReducer(m,{type:'scene',scene:scene('breathe'),now:0});
 assert.equal(at(breathing,99999),'breathe');assert.equal(M.nextChange(breathing,99999),null);
 const bowing=M.companionReducer(m,{type:'scene',scene:scene('bow',{bowing:true}),now:0});assert.equal(at(bowing,99999),'bow');
 const waiting=M.companionReducer(bowing,{type:'scene',scene:scene('bow',{bows:1}),now:1000});assert.equal(at(waiting,1000+M.REST_AFTER_MS),'rest');
 const tapped=M.companionReducer(M.companionReducer(m,{type:'scene',scene:scene('enter'),now:0}),{type:'tap',now:50000});
 assert.equal(at(tapped,50001),'react');assert.equal(M.nextChange(tapped,50001),50000+M.REACT_MS);
 for(const r of [0,.5,.999,2,-1]){const d=M.blinkDelay(r);assert(d>=3000&&d<=6000,String(d));}
});
test('yeoni swaps authored poses: tilt, synced 4-4-6 rest frames, bow sync, surprise→shy, hug/cheer, sleep, blink',()=>{
 const pose=id=>{const p=POSES.find(x=>x.id===id);return {sheet:p.sheet,frame:p.frame};};
 const c={since:0,elapsed:0,breath:'ready',breathProgress:0,blink:null};
 assert.deepEqual(P.yeoniPose('guide',c),pose('tilt'));
 assert.deepEqual(P.yeoniPose('react',c),pose('surprise'));assert.deepEqual(P.yeoniPose('react',{...c,since:700}),pose('shy'));
 assert.deepEqual(P.yeoniPose('bless',c),pose('hug'));assert.deepEqual(P.yeoniPose('bless',{...c,since:P.BLESS_SWAP_MS}),pose('cheer'));
 assert.deepEqual(P.yeoniPose('rest',c),pose('sleep'));assert.deepEqual(P.yeoniPose('idle',c),pose('smile'));
 assert.deepEqual(P.yeoniPose('idle',{...c,blink:0}),{sheet:'expressions',frame:1});assert.deepEqual(P.yeoniPose('idle',{...c,blink:90}),{sheet:'expressions',frame:2});
 // 합장은 사각 매트가 있는 bow-down 시트를 쓰지 않는다.
 assert.deepEqual(P.yeoniPose('pray',c),{sheet:'rest',frame:3});
 assert.deepEqual(P.yeoniPose('idle',{...c,blink:P.BLINK_MS}),pose('smile'));
 for(const e of [0,1200,4000,7000])assert.deepEqual(P.yeoniPose('bow',{...c,elapsed:e}),frontBowPoseAt(e));
 const frames=[0,.5,1].map(p=>P.yeoniPose('breathe',{...c,breath:'inhale',breathProgress:p}).frame);
 assert.deepEqual(frames,[0,4,7]);assert.equal(P.yeoniPose('breathe',{...c,breath:'hold'}).frame,7);
 assert.deepEqual([0,1].map(p=>P.breathFrame('exhale',p)),[7,0]);assert.equal(P.yeoniPose('breathe',c).sheet,'rest');
 assert.equal(P.yeoniPose('greet',{...c,since:600}).frame,4);
 assert.deepEqual(['greet','breathe','bow','pray','bless','idle','react','rest'].map(P.tierOneActivity),['greeting','meditation','bow','prayer','affirmation','idle','idle','idle']);
 assert.equal(P.tickMs('idle'),null);assert.equal(P.tickMs('bow'),null,'bow follows the bow session clock');
});
function fakeCanvas(){
 const calls=[];const ctx=new Proxy({},{get:(_,k)=>k in ctx?undefined:(...a)=>calls.push(k),set:()=>true});
 return {canvas:{width:0,height:0,dataset:{},getContext:()=>ctx},calls};
}
test('scene fx: ≤40 fireflies (12 low), one rAF loop that stops when hidden, off-screen or reduced',()=>{
 assert.equal(FX.fireflyCount('high'),40);assert.equal(FX.fireflyCount('low'),12);assert.ok(FX.FIREFLY_MAX<=40);
 assert.equal(FX.detectTier({deviceMemory:2,hardwareConcurrency:8}),'low');assert.equal(FX.detectTier({hardwareConcurrency:4}),'low');assert.equal(FX.detectTier({deviceMemory:8,hardwareConcurrency:8}),'high');
 assert.equal(FX.seedFireflies(99,Math.random).length,40);
 const list=FX.seedFireflies(5,()=>.5);const same=FX.stepFireflies(list,16,()=>.5);assert.equal(same,list,'stepped in place');
 const queue=[];let id=0;const raf=cb=>{queue.push(cb);return ++id;},caf=()=>{queue.length=0;};
 const {canvas}=fakeCanvas();let t=0;
 const fx=FX.createSceneFx(canvas,{tier:'low',color:'gold',random:()=>.5,raf,caf,clock:()=>t});
 assert.equal(fx.running(),false,'not before it has a size');
 fx.resize(300,200,3);assert.equal(canvas.width,300,'low tier caps the pixel ratio at 1');assert.equal(fx.running(),true);assert.equal(canvas.dataset.running,'true');
 const pump=n=>{for(let i=0;i<n&&queue.length;i++){t+=16;queue.shift()(t);}};
 pump(5);assert.equal(fx.frames(),5);
 fx.setHidden(true);assert.equal(fx.running(),false);assert.equal(canvas.dataset.running,'false');pump(5);assert.equal(fx.frames(),5,'no frames while hidden');
 fx.setHidden(false);pump(2);assert.equal(fx.frames(),7);
 fx.setVisible(false);assert.equal(fx.running(),false);fx.setVisible(true);
 fx.setReduced(true);assert.equal(fx.running(),false);fx.ripple(1,1);fx.setReduced(false);
 fx.ripple(10,10);t+=FX.RIPPLE_MS+1;assert.equal(FX.liveRipples([{x:0,y:0,born:0}],FX.RIPPLE_MS).length,0);
 fx.dispose();assert.equal(fx.running(),false);pump(3);
 assert.equal(FX.fxShouldRun({hidden:false,visible:true,reduced:false,sized:true}),true);
});
test('wiring: fx loads via next/dynamic, observers + visibilitychange stop it, no layout reads in the loop, tokens only',()=>{
 const flow=read('app/moonlit-lotus/_ritual/RitualFlow.tsx'),fx=read('app/moonlit-lotus/_fx/SceneFx.tsx'),core=read('app/moonlit-lotus/_fx/scene-fx.ts');
 assert.match(flow,/dynamic\(\(\)=>import\('\.\.\/_fx\/SceneFx'\)/);assert.ok(!/from '\.\.\/_fx\/SceneFx'/.test(flow));
 assert.match(flow,/<CompanionStage /);assert.match(flow,/onPhase=\{onBreathPhase\}/);assert.match(flow,/key=\{state\.step\} ref=\{panel\} tabIndex=\{-1\} className=\{styles\.panel\}/);
 assert.ok(fx.includes('IntersectionObserver')&&fx.includes("addEventListener('visibilitychange'")&&fx.includes('ResizeObserver'));
 assert.ok(!/getBoundingClientRect|offsetWidth|offsetHeight|getComputedStyle|clientWidth/.test(core),'scene-fx core never reads layout');
 assert.equal((core.match(/raf\(loop\)/g)||[]).length,2,'single loop entry points');
 for(const file of ['app/moonlit-lotus/_fx/scene-fx.module.css','app/moonlit-lotus/_ritual/companion.module.css']){
  const css=read(file);assert.ok(!/#[0-9a-f]{3,8}\b/i.test(css),file+' has no new hex');assert.ok(!/--cd-/.test(css));
  for(const [,body] of css.matchAll(/@keyframes [\w-]+ \{([\s\S]*?)\} *\n/g))assert.ok(!/(width|height|top|left|margin|filter)\s*:/.test(body),file+' animates transform/opacity only');
 }
 const ritual=read('app/moonlit-lotus/_ritual/ritual.module.css');assert.match(ritual,/ritual-dissolve 5\d\dms/);
});
test('companion state labels exist in ko and en',()=>{
 for(const locale of ['ko','en']){
  const dict=JSON.parse(read(`public/i18n/${locale}/moonlitRitual.json`)).moonlitRitual.companion;
  for(const state of M.COMPANION_STATES)assert.ok(typeof dict[state]==='string'&&dict[state].length>1,locale+' '+state);
 }
 const stage=read('app/moonlit-lotus/_ritual/CompanionStage.tsx').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm,'');
 assert.ok(!/>[^<{]*[가-힣]/.test(stage),'no hard-coded Korean markup');assert.match(stage,/t\('companion\.'\+state\)/);
});
test('quality tier: dropped frames in the first 2s downgrade high → low (12 fireflies, ratio 1, fewer layers)',()=>{
 assert.equal(FX.judgeFrames(Array(120).fill(16.7)),'high');
 assert.equal(FX.judgeFrames(Array(60).fill(50)),'low','~20fps is low');
 assert.equal(FX.judgeFrames([...Array(30).fill(16),...Array(15).fill(40)]),'low','a third of frames dropped');
 assert.equal(FX.judgeFrames([40,40,40]),'high','too few samples never downgrade');
 const queue=[];let id=0;const raf=cb=>{queue.push(cb);return ++id;},caf=()=>{queue.length=0;};
 const pump=(n,gap)=>{for(let i=0;i<n&&queue.length;i++){t+=gap;queue.shift()(t);}};
 let t=0,told=[];
 const {canvas}=fakeCanvas();
 const fast=FX.createSceneFx(canvas,{tier:'high',color:'gold',onTier:v=>told.push(v),random:()=>.5,raf,caf,clock:()=>t});
 fast.resize(300,200,2);pump(150,16);assert.equal(fast.tier(),'high');assert.deepEqual(told,[]);assert.equal(canvas.width,600);fast.dispose();
 queue.length=0;
 const slow=FX.createSceneFx(canvas,{tier:'high',color:'gold',onTier:v=>told.push(v),random:()=>.5,raf,caf,clock:()=>t});
 slow.resize(300,200,2);pump(60,50);assert.equal(slow.tier(),'low');assert.deepEqual(told,['low']);assert.equal(canvas.width,300,'pixel ratio drops to 1');
 slow.dispose();
 const ui=read('app/moonlit-lotus/_fx/SceneFx.tsx');
 assert.match(ui,/onTier:mark/);assert.match(ui,/stage\.dataset\.fxTier/);assert.match(ui,/tier==='high'&&<span className=\{styles\.moon\}/);
 assert.match(read('app/moonlit-lotus/_ritual/companion.module.css'),/\[data-fx-tier=low\] \.halo/);
});
test('reduced motion keeps fades and breath, drops parallax, particles and typing; keyboard and live region wiring',()=>{
 const css=read('app/moonlit-lotus/_ritual/ritual.module.css'),comp=read('app/moonlit-lotus/_ritual/companion.module.css');
 const block=source=>(source.replace(/\r\n/g,'\n').match(/@media \(prefers-reduced-motion:reduce\) \{([\s\S]*?)\n\}/)||[])[1]||'';
 const reduce=block(css);
 assert.ok(reduce,'ritual css has a reduced-motion block');
 assert.ok(!/\*\s*\{[^}]*animation:none/.test(reduce),'no blanket animation kill (fades must stay)');
 assert.match(reduce,/\.backdrop img \{ transform:none !important;/,'parallax camera off, even over the per-step camera rules');
 assert.match(reduce,/\.panel \{ animation:ritual-fade [^}]*!important/,'step dissolve becomes a plain fade that survives the space.page blanket kill');
 assert.ok(!/breathLight[^}]*transition:none/.test(css),'breath light keeps its transition');
 const compReduce=block(comp);assert.match(compReduce,/\.halo,\.float,\.bounce \{ animation:none/);assert.match(compReduce,/\.companion \.breath \{ animation:companion-breathe [^}]*!important/,'breath is restored over .page * !important');
 const flow=read('app/moonlit-lotus/_ritual/RitualFlow.tsx'),bubble=read('app/moonlit-lotus/_ritual/SpeechBubble.tsx'),hold=read('app/moonlit-lotus/_ritual/HoldToLight.tsx');
 assert.ok(!/<SpeechBubble key=/.test(flow),'bubble is not remounted, so its live region persists');assert.match(bubble,/aria-live="polite"/);assert.match(flow,/instant=\{reduced\}/);
 assert.match(flow,/aria-disabled=\{bowing\|\|state\.bows>=BOW_TARGET\}/);assert.ok(!/ disabled=\{bowing/.test(flow),'bow button keeps focus while bowing');
 assert.match(flow,/panel\.current\?\.focus\(\{preventScroll:true\}\)/);
 assert.match(hold,/event\.key==='Enter'\|\|event\.key===' '/);assert.match(hold,/onKeyUp=/);
});
