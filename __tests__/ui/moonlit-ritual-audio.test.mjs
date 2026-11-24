import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync,readdirSync} from 'node:fs';import ts from 'typescript';
const root=new URL('../../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const compile=path=>ts.transpileModule(read(path),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const data=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const pref=await import(data(compile('app/moonlit-lotus/_audio/music-preference.ts')));
const engineMod=await import(data(compile('app/moonlit-lotus/_audio/audio-engine.ts')));
const {createAudioEngine,CROSSFADE_MS,DUCK_LEVEL,DUCK_IN_MS,DUCK_HOLD_MS,DUCK_OUT_MS,TICK_MS}=engineMod;
const near=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<.01,`${label}: ${actual} ≈ ${expected}`);

test('preference read survives missing, throwing and corrupt storage and clamps bad values',()=>{
 const ids=['meditation-0','meditation-13'],fallback='meditation-13',base=pref.defaultPreference(fallback);
 assert.deepEqual(pref.readPreference(null,ids,fallback),base);
 assert.deepEqual(pref.readPreference({getItem(){throw new Error('SecurityError');}},ids,fallback),base);
 for(const raw of ['{','null','[1]','"x"','42'])assert.deepEqual(pref.parsePreference(raw,ids,fallback),base,raw);
 const odd=pref.parsePreference(JSON.stringify({auto:false,muted:true,volume:4,trackId:'gone',sfx:false}),ids,fallback);
 assert.deepEqual(odd,{auto:false,muted:true,volume:1,trackId:fallback,sfx:false});
 assert.equal(pref.parsePreference(JSON.stringify({volume:Number.NaN}),ids,fallback).volume,pref.DEFAULT_VOLUME);
 assert.equal(pref.parsePreference(JSON.stringify({volume:-1,trackId:'meditation-0'}),ids,fallback).volume,0);
 // f91990b19 형식(auto·muted·volume 만)도 그대로 읽힌다.
 assert.deepEqual(pref.parsePreference('{"auto":true,"muted":false,"volume":0.5}',ids,fallback),{...base,volume:.5});
});
test('preference write round-trips and never throws',()=>{
 const store={};const storage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v;}};
 const value={auto:false,muted:false,volume:.55,trackId:'meditation-0',sfx:false};
 assert.equal(pref.writePreference(storage,value),true);assert.ok(pref.MUSIC_PREFERENCE_KEY in store);
 assert.deepEqual(pref.readPreference(storage,['meditation-0'],'meditation-0'),value);
 assert.equal(pref.writePreference({setItem(){throw new Error('QuotaExceededError');}},value),false);
 assert.equal(pref.writePreference(null,value),false);
});

function rig({gain=false,context=null,fixedVolume=false}={}){
 let time=0,seq=0;const timers=[],media=[],ended=[];
 const policy={mode:'allow'};
 class FakeMedia{
  constructor(){this.attrs={};this.paused=true;this.ended=false;this._volume=1;this.currentTime=0;this.error=null;this.preload='';this.crossOrigin=null;this.listeners={};this.plays=0;media.push(this);}
  get volume(){return this._volume;}set volume(v){if(!fixedVolume)this._volume=v;}
  getAttribute(n){return this.attrs[n]??null;}setAttribute(n,v){this.attrs[n]=v;}removeAttribute(n){delete this.attrs[n];}
  load(){}pause(){this.paused=true;}addEventListener(n,f){(this.listeners[n]??=[]).push(f);}
  fire(n){for(const f of this.listeners[n]||[])f();}
  play(){
   this.plays++;
   if(policy.mode==='block')return Promise.reject(Object.assign(new Error('no gesture'),{name:'NotAllowedError'}));
   if(policy.mode==='fail')return Promise.reject(Object.assign(new Error('network'),{name:'NotSupportedError'}));
   if(policy.mode==='hang')return new Promise(resolve=>{policy.release=()=>{this.paused=false;resolve();};});
   this.paused=false;return Promise.resolve();
  }
 }
 const engine=createAudioEngine({
  createMedia:()=>new FakeMedia(),now:()=>time,
  setTimer:(fn,ms)=>{const id=++seq;timers.push({id,at:time+ms,fn});return id;},
  clearTimer:id=>{const i=timers.findIndex(t=>t.id===id);if(i>=0)timers.splice(i,1);},
  gain,createContext:()=>context,onEnded:()=>ended.push(time),
 });
 const advance=ms=>{const end=time+ms;for(;;){timers.sort((a,b)=>a.at-b.at);const next=timers[0];if(!next||next.at>end)break;timers.shift();time=next.at;next.fn();}time=end;};
 return {engine,media,policy,advance,ended,bgm:()=>media.slice(0,2)};
}
const A={id:'a',url:'/a.mp3'},B={id:'b',url:'/b.mp3'},C={id:'c',url:'/c.mp3'};

test('play goes idle → loading → playing and fades in over the crossfade time; preload stays none',async()=>{
 const {engine,bgm,advance}=rig();engine.setVolume(.5);
 assert.equal(engine.snapshot().playback,'idle');
 for(const m of bgm()){assert.equal(m.preload,'none');assert.equal(m.crossOrigin,null,'no CORS mode off the allowed origin');}
 const done=engine.play(A);assert.equal(engine.snapshot().playback,'loading');assert.equal(bgm()[0].plays,1,'play() is called synchronously');
 assert.equal(await done,'playing');assert.equal(engine.snapshot().trackId,'a');
 advance(CROSSFADE_MS/2);const mid=engine.levels()[0];assert.ok(mid>0&&mid<.5,'half-way '+mid);
 advance(CROSSFADE_MS);near(engine.levels()[0],.5,'full volume');
 assert.equal(await engine.play(A),'playing');assert.equal(bgm()[0].plays,1,'same track is not restarted');
});
test('switching tracks crossfades between the two elements and releases the old one',async()=>{
 const {engine,bgm,advance}=rig();engine.setVolume(.6);
 await engine.play(A);advance(CROSSFADE_MS);
 await engine.play(B);const [first,second]=bgm();
 assert.equal(second.getAttribute('src'),'/b.mp3');assert.equal(first.getAttribute('src'),'/a.mp3');
 advance(CROSSFADE_MS/2);const [out,inn]=engine.levels();assert.ok(out>0&&out<.6&&inn>0&&inn<.6,`both audible mid-fade ${out} ${inn}`);
 advance(CROSSFADE_MS);assert.equal(first.paused,true);assert.equal(first.getAttribute('src'),null);near(engine.levels()[1],.6,'new track');
 // 페이드 도중 또 바꾸면 나가던 채널을 다시 쓴다. 셋이 겹치지 않는다.
 await engine.play(C);advance(100);await engine.play(A);advance(CROSSFADE_MS*2);
 assert.equal(bgm().filter(m=>m.getAttribute('src')).length,1);assert.equal(engine.snapshot().trackId,'a');
});
test('NotAllowedError becomes blocked, other failures become error, and a later tap recovers',async()=>{
 const {engine,policy}=rig();
 policy.mode='block';assert.equal(await engine.play(A),'blocked');
 policy.mode='allow';assert.equal(await engine.play(A),'playing');
 engine.pause();policy.mode='fail';assert.equal(await engine.play(B),'error');
 policy.mode='allow';assert.equal(await engine.play(B),'playing');
});
test('a pause during a pending play wins over the late success',async()=>{
 const {engine,policy}=rig();policy.mode='hang';
 const pending=engine.play(A);engine.pause();policy.release();
 assert.equal(await pending,'paused');assert.equal(engine.snapshot().playback,'paused');
});
test('pause then resume keeps the same source and fades back in',async()=>{
 const {engine,bgm,advance}=rig();engine.setVolume(.4);
 await engine.play(A);advance(CROSSFADE_MS);engine.pause();
 assert.equal(engine.snapshot().playback,'paused');assert.equal(bgm()[0].paused,true);assert.equal(bgm()[0].getAttribute('src'),'/a.mp3');
 bgm()[0].currentTime=42;assert.equal(await engine.play(A),'playing');assert.equal(bgm()[0].currentTime,42,'resume keeps position');
 advance(1000);near(engine.levels()[0],.4,'restored');
});
test('sound effects duck the music to about 40% and restore it; disabled and missing sounds stay silent',async()=>{
 const {engine,media,advance}=rig();engine.setVolume(.5);
 await engine.play(A);advance(CROSSFADE_MS);
 assert.equal(engine.sfx('mokugyo'),true);const hit=media[2];assert.equal(hit.getAttribute('src'),'/assets/moonlit-lotus/audio-v1/mokugyo.mp3');assert.equal(hit.paused,false);
 advance(DUCK_IN_MS+TICK_MS);near(engine.levels()[0],.5*DUCK_LEVEL,'ducked');
 advance(DUCK_HOLD_MS-2*TICK_MS);near(engine.levels()[0],.5*DUCK_LEVEL,'held');
 advance(DUCK_OUT_MS+4*TICK_MS);near(engine.levels()[0],.5,'restored');
 // 범종·풍경·불붙기·연등은 audio-v3(직접 합성) 파일을 가리키고 실제로 울린다.
 for(const name of ['bell','windChime','fire','lantern']){
  const src=engineMod.SFX_SOURCES[name];assert.match(src,/^\/assets\/moonlit-lotus\/audio-v3\/[a-z]+\.mp3$/,name);
  assert.ok(readdirSync(new URL('public/assets/moonlit-lotus/audio-v3/',root)).includes(src.split('/').pop()),name+' file exists');
  assert.equal(engine.sfx(name),true,name+' plays');
  assert.ok(media.some(m=>m.getAttribute('src')===src),name+' source set');
 }
 engine.setSfxEnabled(false);const before=media.length;assert.equal(engine.sfx('mokugyo'),false);assert.equal(media.length,before);
 engine.setSfxEnabled(true);for(let i=0;i<6;i++)engine.sfx('mokugyo');assert.ok(media.length<=5,'sfx pool is bounded');
});
test('ended advances only from the active, playing channel; destroy releases everything',async()=>{
 const {engine,bgm,ended,media}=rig();
 await engine.play(A);bgm()[1].fire('ended');assert.equal(ended.length,0);
 bgm()[0].fire('ended');assert.equal(ended.length,1);
 engine.sfx('mokugyo');engine.destroy();
 for(const m of media){assert.equal(m.paused,true);assert.equal(m.getAttribute('src'),null);}
 assert.equal(engine.snapshot().playback,'idle');await engine.play(B);assert.equal(bgm()[0].plays,1,'no playback after destroy');
});
test('fixed-volume devices are detected for the volume-ramp path',async()=>{
 const {engine,advance}=rig({fixedVolume:true});engine.setVolume(.3);await engine.play(A);advance(CROSSFADE_MS);
 assert.equal(engine.snapshot().volumeFixed,true);
});
test('GainNode path only on the CORS origin and only once the context really runs',async()=>{
 const gains=[];
 const running={state:'running',destination:{},createGain(){const g={gain:{value:1},connect(){}};gains.push(g);return g;},createMediaElementSource(){return {connect(){}};},close:()=>Promise.resolve(),resume:()=>Promise.resolve()};
 const {engine,bgm,advance}=rig({gain:true,context:running});
 for(const m of bgm())assert.equal(m.crossOrigin,'anonymous');
 engine.setVolume(.5);engine.unlock();assert.equal(gains.length,2);assert.equal(engine.snapshot().gain,true);
 await engine.play(A);advance(CROSSFADE_MS);near(gains[0].gain.value,.5,'gain carries the level');assert.equal(bgm()[0].volume,1);
 const stuck={...running,state:'suspended',resume:()=>Promise.reject(new Error('no'))};
 const other=rig({gain:true,context:stuck});other.engine.unlock();await Promise.resolve();await Promise.resolve();
 assert.equal(other.engine.snapshot().gain,false,'suspended context never captures the element (that would mute it)');
 other.engine.setVolume(.5);await other.engine.play(A);other.advance(CROSSFADE_MS);near(other.engine.levels()[0],.5,'volume ramp fallback');
});

test('ritual wiring: synchronous play in the enter tap, mokugyo per bow, cleanup and the shared audio channel',()=>{
 const flow=read('app/moonlit-lotus/_ritual/RitualFlow.tsx'),hook=read('app/moonlit-lotus/_audio/use-ambient-audio.ts');
 assert.match(flow,/onClick=\{\(\)=>\{audio\.begin\(\);/,'begin() runs first inside the enter tap handler');
 assert.ok(flow.includes("sfx('mokugyo')")&&flow.includes('completed>heardBows.current'));
 assert.ok(hook.includes("AUDIO_CHANNEL='cd:moonlit-audio'"));
 assert.match(hook,/return\(\)=>\{[\s\S]*created\.destroy\(\)[\s\S]*bus\.current\?\.close\(\)[\s\S]*removeEventListener\('visibilitychange'/);
 assert.match(hook,/const begin=useCallback\(\(\)=>\{(?![\s\S]*?await)[\s\S]*?current\.unlock\(\)/);
 assert.ok(!/localStorage\.(get|set)Item/.test(hook),'storage goes through the guarded preference helpers');
 // sfx 는 재생 함수라 켜짐 여부는 sfxOn 으로 읽어야 한다(함수는 늘 truthy).
 assert.ok(hook.includes('sfxOn:snapshot.sfx'));
 assert.ok(!/(?<!')\baudio\.sfx(?!On)\b(?!\()/.test(read('app/moonlit-lotus/_audio/MiniPlayer.tsx')),'MiniPlayer reads the sfx toggle from audio.sfxOn');
});
test('every audio string is a moonlitRitual key in ko and en; no hard-coded Korean markup',()=>{
 const flat=(node,prefix='')=>Object.entries(node).flatMap(([k,v])=>typeof v==='string'?[prefix+k]:flat(v,prefix+k+'.'));
 const dict=locale=>new Set(flat(JSON.parse(read(`public/i18n/${locale}/moonlitRitual.json`)).moonlitRitual));
 const ko=dict('ko'),en=dict('en');
 const dir=new URL('app/moonlit-lotus/_audio/',root),used=new Set();
 for(const file of readdirSync(dir).filter(f=>f.endsWith('.tsx'))){
  const source=readFileSync(new URL(file,dir),'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm,'');
  for(const [,key] of source.matchAll(/\bt\('([\w.]+)'[,)]/g))used.add(key);
  assert(!/>[^<{]*[가-힣]/.test(source),file+' has hard-coded Korean markup');
 }
 for(const mood of ['calm','dawn','warm','focus','night','water','stars','renew'])used.add('audio.mood.'+mood);
 assert.ok(used.size>15);
 for(const key of used){assert(ko.has(key),'missing ko '+key);assert(en.has(key),'missing en '+key);}
 const tracks=read('app/moonlit-lotus/_audio/tracks.ts');
 for(const [,mood] of tracks.matchAll(/':'(\w+)'/g))assert(ko.has('audio.mood.'+mood),'mood '+mood);
});
