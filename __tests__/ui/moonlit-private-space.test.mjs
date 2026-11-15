import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import ts from 'typescript';import sharp from 'sharp';
const root=new URL('../../',import.meta.url);
const compile=path=>ts.transpileModule(readFileSync(new URL(path,root),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const data=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const clips=data(compile('app/moonlit-lotus/model-review/sprite-clips.ts'));
const {advance,newSession,CYCLE_MS,finishCycle,serializeSession,restoreSession}=await import(data(compile('app/moonlit-lotus/model-review/bow-session.ts').replace(/(['"])\.\/sprite-clips\1/,JSON.stringify(clips))));
const {canClaim,canWrite,resumeSaved,defaultCharacter}=await import(data(compile('app/moonlit-lotus/_lib/session-policy.ts')));
function cycle(s){const count=s.completed;while(s.completed===count&&s.status==='running')s=advance(s,100);return s;}
for(const target of [9,27,108])test(target+' target ends exactly once',()=>{let s={...newSession('goal',target),status:'running'};for(let i=0;i<target;i++)s=cycle(s);assert.equal(s.completed,target);assert.equal(s.status,'complete');assert.equal(advance(s,100),s);assert.equal(finishCycle(s,s.sessionId,s.cycleIndex),s);});
for(const count of [37,107])test(count+' completed pause/resume and incomplete reload',()=>{let s={...newSession('pause'),status:'running'};for(let i=0;i<count;i++)s=cycle(s);s=advance(s,150);s={...s,status:'paused'};assert.equal(advance(s,100),s);const restored=restoreSession(serializeSession(s));assert.equal(restored.completed,count);assert.equal(restored.elapsed,0);assert.equal(cycle({...s,status:'running'}).completed,count+1);});
test('ownership, revision and lease reject second tab and stale replay',()=>{
 const row={scope:'one|profile',revision:7,owner:'tab-a',leaseUntil:2000,updatedAt:500,day:'2026-11-15',session:{...newSession('same'),completed:37,elapsed:500,status:'running'}};
 assert.equal(canClaim(row,'tab-b',1000),false);assert.equal(canWrite(row,'tab-b',7,1000),false);assert.equal(canWrite(row,'tab-a',6,1000),false);
 assert.equal(canWrite(row,'tab-a',7,1000),true);assert.equal(canWrite({...row,revision:8},'tab-a',7,1000),false);
 assert.equal(canWrite(row,'tab-a',7,2001),false);assert.equal(canClaim(row,'tab-b',2001),true);
 const restored=resumeSaved(row);assert.equal(restored.completed,37);assert.equal(restored.elapsed,0);assert.equal(restored.status,'paused');
 assert.equal(resumeSaved({...row,session:{...row.session,status:'complete',completed:108}}).status,'complete');
});
test('manual character first, Yeoni default for every gender',()=>{
 assert.equal(defaultCharacter('cat','female'),'cat');assert.equal(defaultCharacter('custom','male'),'custom');
 assert.equal(defaultCharacter(null,'female'),'yeoni');assert.equal(defaultCharacter(null,'M'),'yeoni');assert.equal(defaultCharacter(null,''),'yeoni');assert.equal(defaultCharacter(null,'other'),'yeoni');
});
test('time gaps and speed boundaries do not award incomplete cycles',()=>{
 const s={...newSession('timing'),status:'running',elapsed:100,pendingSpeed:1.25};assert.equal(advance(s,20000),s);
 assert.equal(advance(s,100).speed,1);assert.equal(cycle(s).speed,1.25);assert.equal(finishCycle(s,'timing',0).completed,0);assert(CYCLE_MS>0);
});
test('private records have no network write, session commit and record dedup use one transaction',()=>{
 const source=readFileSync(new URL('app/moonlit-lotus/_lib/private-store.ts',root),'utf8');
 assert(!/fetch\(|XMLHttpRequest|WebSocket/.test(source));assert(source.includes("['sessions','records'],'readwrite'"));assert(source.includes('if(!exists.result)'));assert(source.includes('expectedUpdatedAt'));
});
test('3 scenes and 32 cat drawings fit the registered cells and file budgets',async()=>{
 const base=new URL('public/assets/moonlit-lotus/space-v1/',root),manifest=JSON.parse(readFileSync(new URL('manifest.json',base)));
 assert.deepEqual(Object.keys(manifest.scenes),['courtyard','hall','pond']);
 for(const name of Object.keys(manifest.scenes))for(const width of [768,1536]){const file=readFileSync(new URL(name+'-'+width+'.webp',base));assert(file.length<500000);assert.equal((await sharp(file).metadata()).width,width);}
 for(const [name,entry] of Object.entries(manifest.characters)){assert.equal(entry.frames.length,16);assert.equal(new Set(entry.frames.map(f=>f.sha256)).size,16);const meta=await sharp(readFileSync(new URL(name+'.webp',base))).metadata();assert(meta.hasAlpha);assert.equal(meta.width,1536);assert.equal(meta.height,1536);}
});
test('single-user surface is hidden from indexing and has a reversible feature switch',()=>{
 const page=readFileSync(new URL('app/moonlit-lotus/page.tsx',root),'utf8');assert(page.includes('index:false'));assert(page.includes('MOONLIT_LOTUS_ENABLED'));
 const surface=readFileSync(new URL('app/moonlit-lotus/Space.tsx',root),'utf8');assert(surface.includes('나의 캐릭터만'));assert(surface.includes('다른 이용자의 공간과 연결되지'));assert(!surface.includes('WebSocket'));
});
