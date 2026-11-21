import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync,readdirSync} from 'node:fs';import ts from 'typescript';
const root=new URL('../../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const compile=path=>ts.transpileModule(read(path),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const data=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const swap=(source,spec,url)=>source.replace(new RegExp(`(['"])${spec.replace(/[./]/g,'\\$&')}\\1`),JSON.stringify(url));
const clips=data(compile('app/moonlit-lotus/model-review/sprite-clips.ts'));
const sessionUrl=data(swap(compile('app/moonlit-lotus/model-review/bow-session.ts'),'./sprite-clips',clips));
const machineUrl=data(compile('app/moonlit-lotus/_ritual/ritual-machine.ts'));
const machine=await import(machineUrl);
const {createRitualBow,tapRitualBow,stepRitualBow}=await import(data(swap(swap(compile('app/moonlit-lotus/_ritual/ritual-bow.ts'),'../model-review/bow-session',sessionUrl),'./ritual-machine',machineUrl)));
const {CYCLE_MS}=await import(sessionUrl);
const {moonlitMode,stayUrl}=await import(data(compile('app/moonlit-lotus/_ritual/mode.ts')));
const {ritualReducer:reduce,initialRitual,petalsLit,RITUAL_STEPS}=machine;
const run=(state,...actions)=>actions.reduce(reduce,state);

test('ritual walks enter → breathe ×3 → incense → three bows → wish → dedication with one action per step',()=>{
 let s=run(initialRitual(),{type:'next'});assert.equal(s.step,'enter');
 s=run(s,{type:'enter'});assert.equal(s.step,'breathe');assert.equal(petalsLit(s),1);
 s=run(s,{type:'breathDone'},{type:'breathDone'});assert.equal(s.step,'breathe');
 s=run(s,{type:'breathDone'});assert.equal(s.step,'incense');
 s=run(s,{type:'next'});assert.equal(s.step,'incense','next waits for the incense');
 s=run(s,{type:'light'},{type:'next'});assert.equal(s.step,'bow');
 s=run(s,{type:'bowDone',completed:2},{type:'next'});assert.equal(s.step,'bow');assert.equal(s.bows,2);
 s=run(s,{type:'bowDone',completed:1});assert.equal(s.bows,2,'bow count never goes back');
 s=run(s,{type:'bowDone',completed:3},{type:'next'});assert.equal(s.step,'wish');
 s=run(s,{type:'sendWish',text:'   '});assert.equal(s.wishSent,false,'empty wish is not released');
 s=run(s,{type:'sendWish',text:'  가족 건강  '},{type:'next'});assert.equal(s.step,'dedication');assert.equal(s.wish,'가족 건강');
 assert.equal(petalsLit(s),RITUAL_STEPS.length);assert.equal(run(s,{type:'skip'},{type:'next'}),s);
});
test('skip advances any step, fast toggles timing only, restart keeps the pace',()=>{
 let s=initialRitual();for(const step of RITUAL_STEPS.slice(1)){s=reduce(s,{type:'skip'});assert.equal(s.step,step);}
 s=reduce(s,{type:'toggleFast'});assert.equal(s.fast,true);assert.equal(machine.timeScale(true),0.5);assert.equal(machine.timeScale(false),1);
 const again=reduce(s,{type:'restart'});assert.equal(again.step,'enter');assert.equal(again.fast,true);assert.equal(again.bows,0);
 assert.equal(reduce(initialRitual(),{type:'light'}).lit,false,'actions out of their step are ignored');
});
function finishOne(s){let guard=0;while(s.status==='running'&&guard++<1000)s=stepRitualBow(s,100);return s;}
test('each tap is exactly one full bow; taps while bowing are ignored; three bows complete once',()=>{
 let s=createRitualBow('x');assert.equal(s.target,3);assert.equal(s.sessionId,'ritual-x');assert.equal(s.status,'ready');
 assert.equal(stepRitualBow(s,100),s,'no time passes before the first tap');
 s=tapRitualBow(s);assert.equal(s.status,'running');
 s=stepRitualBow(s,100);assert.equal(tapRitualBow(s),s,'tap during a bow does not restart it');
 s=stepRitualBow({...s,elapsed:CYCLE_MS-150},100);assert.equal(s.completed,0,'not counted before standing up');
 s=finishOne(s);assert.equal(s.completed,1);assert.equal(s.status,'paused','waits for the next tap');assert.equal(s.elapsed,0);
 assert.equal(stepRitualBow(s,100),s);
 s=finishOne(tapRitualBow(s));assert.equal(s.completed,2);assert.equal(s.status,'paused');
 s=finishOne(tapRitualBow(s));assert.equal(s.completed,3);assert.equal(s.status,'complete');
 assert.equal(tapRitualBow(s),s);assert.equal(stepRitualBow(s,100),s);
});
test('ritual bow never touches the shared 108-bow sessions store and records one bow row',()=>{
 const hook=read('app/moonlit-lotus/_ritual/use-ritual-bow.ts'),flow=read('app/moonlit-lotus/_ritual/RitualFlow.tsx');
 const code=source=>source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm,'');
 for(const source of [hook,flow,read('app/moonlit-lotus/_ritual/ritual-bow.ts')].map(code)){
  assert(!/claimSession|saveSession|readSession|usePrivateBow|newSession|['"]sessions['"]/.test(source));
 }
 assert(hook.includes("kind:'bow'"));assert(hook.includes("id:scope+'|bow|'+session.sessionId"));assert(hook.includes('written.current'));
 assert(flow.includes("kind:'prayer'"));assert(!/fetch\(|XMLHttpRequest/.test(hook+flow));
});
test('existing space deep links keep the old Space; plain visits get the ritual',()=>{
 for(const search of ['?scene=hall','?activity=bow','?scene=hall&activity=bow','?view=left','?activity=meditation&lang=ja','?stay=1','?lang=ja&stay=1'])assert.equal(moonlitMode(search),'space',search);
 for(const search of ['','?','?lang=ja','?stay=0','?utm_source=home'])assert.equal(moonlitMode(search),'ritual',search);
 assert.equal(stayUrl('?lang=ja'),'?lang=ja&stay=1');assert.equal(moonlitMode(stayUrl('')),'space');
 const page=read('app/moonlit-lotus/page.tsx'),entry=read('app/moonlit-lotus/_ritual/MoonlitEntry.tsx');
 assert(page.includes('<MoonlitEntry/>'));assert(page.includes('index:false'));
 assert(entry.includes("mode==='space')return <Space/>"));assert(entry.includes('popstate'));
});
test('every ritual string is a moonlitRitual key present in ko and en with identical shape',()=>{
 const flat=(node,prefix='')=>Object.entries(node).flatMap(([k,v])=>typeof v==='string'?[prefix+k]:flat(v,prefix+k+'.'));
 const dict=locale=>JSON.parse(read(`public/i18n/${locale}/moonlitRitual.json`)).moonlitRitual;
 const ko=new Set(flat(dict('ko'))),en=flat(dict('en'));assert.deepEqual([...ko].sort(),en.sort());
 const dir=new URL('app/moonlit-lotus/_ritual/',root),used=new Set();
 for(const file of readdirSync(dir).filter(f=>f.endsWith('.tsx'))){
  const source=readFileSync(new URL(file,dir),'utf8');
  for(const [,key] of source.matchAll(/\bt\('([\w.]+)'[,)]/g))used.add(key);
  assert(!/>[^<{]*[가-힣]/.test(source),file+' has hard-coded Korean markup');
 }
 for(const step of RITUAL_STEPS)used.add('steps.'+step);
 for(const voice of ['yeoni','cat','neutral'])for(const line of ['enter','breathe','incense','incenseLit','bow','bowDone','wish','wishSent','dedication'])used.add(`speech.${voice}.${line}`);
 for(const phase of ['inhale','hold','exhale'])used.add('breathe.'+phase);
 for(const key of used)assert(ko.has(key),'missing ko key '+key);
});
