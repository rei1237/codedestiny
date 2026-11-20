import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
const code=ts.transpileModule(read('app/moonlit-lotus/_lib/meditation-guide.ts'),{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
const {advanceGuide,guideCueAt,initialGuide,meditationCue,guideDuration,GUIDE_DURATION_MS,GUIDE_CUE_STARTS}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('deliberate seven-cue sequence includes quiet gaps and finishes once at 150 seconds',()=>{
 assert.equal(GUIDE_CUE_STARTS.length,7);assert.equal(GUIDE_DURATION_MS,150000);
 let s={...initialGuide(),status:'running'};
 for(let n=0;n<600;n++)s=advanceGuide(s,250);
 assert.deepEqual(s,{status:'complete',elapsed:150000});assert.equal(advanceGuide(s,250),s);
 for(const start of GUIDE_CUE_STARTS){assert.equal(guideCueAt(start).quiet,false);assert.equal(guideCueAt(start+12000).quiet,true);}
});
test('pause, stop and sleeping frames cannot consume silent time or auto resume',()=>{
 for(const status of ['ready','paused','stopped','complete']){let s={status,elapsed:2000};assert.equal(advanceGuide(s,1000),s);}
 const sleeping=advanceGuide({status:'running',elapsed:5000},90000);assert.deepEqual(sleeping,{status:'paused',elapsed:5000});
 assert.equal(advanceGuide(sleeping,250),sleeping);assert.equal(advanceGuide({...sleeping,status:'running'},250).elapsed,5250);
});
test('existing character selection controls voice without gender inference or missing custom copy',()=>{
 for(let i=0;i<7;i++){assert.ok(meditationCue('yeoni',i).length>15);assert.ok(meditationCue('cat',i).length>15);assert.equal(meditationCue('custom',i),meditationCue('yeoni',i));}
 assert.notEqual(meditationCue('cat',0),meditationCue('yeoni',0));
});
test('guide is ephemeral and quiet, while music and identity contracts stay independent',()=>{
 const component=read('app/moonlit-lotus/_components/MeditationGuide.tsx');
 assert.ok(!/fetch\(|localStorage|sessionStorage|speechSynthesis|Audio\(/.test(component));
 for(const event of ['visibilitychange','pagehide','popstate'])assert.ok(component.includes(event));
 assert.ok(component.includes('clearInterval(timer)'));assert.ok(component.includes('aria-live="polite"'));assert.ok(!component.includes('aria-live="assertive"'));
 const space=read('app/moonlit-lotus/Space.tsx');assert.ok(space.includes("panel==='meditation'&&<><MeditationGuide"));assert.ok(space.includes("current==='meditation'?'idle':current"));
 const music=read('app/moonlit-lotus/_components/MusicPlayer.tsx');for(const n of [0,5,15,30,60])assert.ok(music.includes('value={'+n+'}'));
});

test('slow pace takes 210 seconds and scales every cue and quiet interval without another timer',()=>{
 assert.equal(guideDuration('standard'),150000);assert.equal(guideDuration('slow'),210000);
 let s={...initialGuide(),status:'running'};for(let n=0;n<839;n++)s=advanceGuide(s,250,'slow');
 assert.equal(s.status,'running');assert.equal(s.elapsed,209750);s=advanceGuide(s,250,'slow');assert.deepEqual(s,{status:'complete',elapsed:210000});
 for(const start of GUIDE_CUE_STARTS){assert.equal(guideCueAt(start*1.4,'slow').quiet,false);assert.equal(guideCueAt((start+12000)*1.4,'slow').quiet,true);}
 const source=read('app/moonlit-lotus/_components/MeditationGuide.tsx');assert.equal((source.match(/setInterval\(/g)||[]).length,1);assert.ok(source.includes("disabled={running||state.status==='paused'}"));
});
