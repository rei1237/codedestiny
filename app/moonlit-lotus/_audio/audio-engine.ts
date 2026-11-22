// 참배 흐름 오디오 엔진. React 와 무관한 순수 객체라 가짜 audio 로 상태 전이를 시험할 수 있다.
// - BGM: <audio> 두 개를 번갈아 쓰며 1.5초 크로스페이드한다.
// - 효과음: 짧은 <audio> 풀. 소리가 날 때 BGM 을 약 40% 로 낮췄다가 0.8초 뒤 되돌린다(ducking).
// - 음량: 곡 서버 CORS 가 허용하는 출처(실측 2026-11-22 code-destiny.com)에서만 GainNode 를 쓰고,
//   그 밖(로컬·스테이징)이나 AudioContext 가 안 열리면 element.volume 램프로 대체한다.
// - play() 는 호출한 그 자리에서 동기적으로 element.play() 를 부른다(탭 제스처 안에서 불러야 자동재생 차단을 넘는다).
export type Playback='idle'|'loading'|'playing'|'paused'|'blocked'|'error';
export type SfxName='mokugyo'|'bell'|'windChime'|'fire';
export type EngineTrack={id:string;url:string};
/** 에셋이 아직 없는 소리는 null(무음 슬롯). 파일이 생기면 경로만 채운다. */
export const SFX_SOURCES:Record<SfxName,string|null>={mokugyo:'/assets/moonlit-lotus/audio-v1/mokugyo.mp3',bell:null,windChime:null,fire:null};
export const CROSSFADE_MS=1500,RESUME_FADE_MS=600,DUCK_LEVEL=.4,DUCK_IN_MS=150,DUCK_HOLD_MS=800,DUCK_OUT_MS=600,SFX_VOLUME=.7,SFX_POOL=3,TICK_MS=40;
export const GAIN_ORIGINS=['https://code-destiny.com'];
export type EngineSnapshot={playback:Playback;trackId:string|null;volume:number;volumeFixed:boolean;sfx:boolean;gain:boolean};
type Media=HTMLAudioElement;
export type EngineDeps={
 createMedia:()=>Media;
 now:()=>number;
 setTimer:(fn:()=>void,ms:number)=>unknown;
 clearTimer:(id:unknown)=>void;
 /** 곡 출처가 이 페이지에 CORS 를 허용할 때만 true. */
 gain:boolean;
 createContext:()=>AudioContext|null;
 onEnded?:()=>void;
};
type Channel={media:Media;level:number;track:EngineTrack|null;gainNode:GainNode|null};
type Tween={from:number;to:number;start:number;ms:number;set:(value:number)=>void;done?:()=>void};
const clamp=(value:number)=>Math.max(0,Math.min(1,value));
export function defaultEngineDeps(onEnded?:()=>void):EngineDeps{
 const Context=typeof window==='undefined'?undefined:(window.AudioContext||(window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext);
 return {
  createMedia:()=>new Audio(),
  now:()=>performance.now(),
  setTimer:(fn,ms)=>setTimeout(fn,ms),
  clearTimer:id=>clearTimeout(id as ReturnType<typeof setTimeout>),
  gain:typeof location!=='undefined'&&GAIN_ORIGINS.includes(location.origin)&&!!Context,
  createContext:()=>{try{return Context?new Context():null;}catch{return null;}},
  onEnded,
 };
}
export function createAudioEngine(deps:EngineDeps){
 const listeners=new Set<(snapshot:EngineSnapshot)=>void>();
 const tweens=new Map<string,Tween>();
 const pool:Media[]=[];
 let playback:Playback='idle',volume=.3,volumeFixed=false,sfxOn=true,duck=1,active=0,generation=0;
 let ticking:unknown=null,duckHold:unknown=null,context:AudioContext|null=null,destroyed=false;
 const makeChannel=():Channel=>{
  const media=deps.createMedia();
  media.preload='none';
  // CORS 허용 출처에서만 익명 요청으로 받는다. 허용되지 않는 출처에서 이것을 켜면 곡이 아예 안 열린다.
  if(deps.gain)media.crossOrigin='anonymous';
  return {media,level:0,track:null,gainNode:null};
 };
 const channels:[Channel,Channel]=[makeChannel(),makeChannel()];
 channels.forEach((channel,index)=>{
  channel.media.addEventListener('ended',()=>{if(index===active&&playback==='playing')deps.onEnded?.();});
  channel.media.addEventListener('error',()=>{if(index===active&&(playback==='loading'||playback==='playing'))setPlayback('error');});
 });
 const snapshot=():EngineSnapshot=>({playback,trackId:channels[active].track?.id||null,volume,volumeFixed,sfx:sfxOn,gain:channels[0].gainNode!==null});
 const emit=()=>{const value=snapshot();listeners.forEach(listener=>listener(value));};
 function setPlayback(next:Playback){if(playback!==next){playback=next;emit();}}
 function apply(){
  for(const channel of channels){
   const out=clamp(volume*channel.level*duck);
   if(channel.gainNode){channel.gainNode.gain.value=out;continue;}
   try{
    channel.media.volume=out;
    // 일부 모바일은 볼륨을 기기 버튼에 고정한다. 읽어 보면 바뀌지 않는다.
    if(out>0&&Math.abs(channel.media.volume-out)>.001&&!volumeFixed){volumeFixed=true;emit();}
   }catch{if(!volumeFixed){volumeFixed=true;emit();}}
  }
 }
 function tick(){
  ticking=null;
  const now=deps.now();
  for(const [key,tween] of [...tweens]){
   const progress=tween.ms<=0?1:Math.min(1,(now-tween.start)/tween.ms);
   tween.set(tween.from+(tween.to-tween.from)*progress);
   if(progress>=1){tweens.delete(key);tween.done?.();}
  }
  apply();
  if(tweens.size&&!destroyed)ticking=deps.setTimer(tick,TICK_MS);
 }
 function tween(key:string,from:number,to:number,ms:number,set:(value:number)=>void,done?:()=>void){
  tweens.set(key,{from,to,start:deps.now(),ms,set,done});
  if(ticking===null)tick();
 }
 function fadeChannel(index:number,to:number,ms:number,done?:()=>void){
  const channel=channels[index];
  tween('level'+index,channel.level,to,ms,value=>{channel.level=value;},done);
 }
 function release(channel:Channel){
  try{channel.media.pause();}catch{/* 이미 멈춤 */}
  channel.track=null;channel.level=0;
  channel.media.removeAttribute('src');
  try{channel.media.load();}catch{/* 소스 없음 */}
 }
 function load(channel:Channel,track:EngineTrack){
  if(channel.media.getAttribute('src')!==track.url){channel.media.setAttribute('src',track.url);try{channel.media.currentTime=0;}catch{/* 메타데이터 전 */}}
  else if(channel.media.error)channel.media.load();
  channel.track=track;
 }
 /** 탭 제스처 안에서 부른다. 허용 출처면 AudioContext 를 열고, 실제로 돌아가는 것을 확인한 뒤에만 연결한다. */
 function unlock(){
  if(destroyed||!deps.gain||context)return;
  const created=deps.createContext();
  if(!created)return;
  context=created;
  const connect=()=>{
   if(destroyed||context!==created||created.state!=='running'||channels[0].gainNode)return;
   try{
    for(const channel of channels){
     const source=created.createMediaElementSource(channel.media),gain=created.createGain();
     source.connect(gain);gain.connect(created.destination);
     channel.gainNode=gain;channel.media.volume=1;
    }
    apply();emit();
   }catch{for(const channel of channels)channel.gainNode=null;apply();}
  };
  if(created.state==='running')connect();
  else void created.resume().then(connect,()=>{/* 볼륨 램프로 계속 */});
 }
 /**
  * 곡을 튼다. 같은 곡이 이미 흐르면 아무것도 하지 않는다. 다른 곡이 흐르면 반대 채널로 크로스페이드한다.
  * 반환값은 최종 상태다. 다른 play/pause 가 끼어들면 끼어든 쪽이 상태를 정한다.
  */
 function play(track:EngineTrack,{crossfade=true}:{crossfade?:boolean}={}):Promise<Playback>{
  if(destroyed)return Promise.resolve(playback);
  const current=channels[active];
  if(current.track?.id===track.id&&(playback==='playing'||playback==='loading'))return Promise.resolve(playback);
  const gen=++generation;
  const audible=crossfade&&playback==='playing'&&current.track!==null&&current.track.id!==track.id;
  let target=current;const fadeMs=current.track?.id===track.id?RESUME_FADE_MS:CROSSFADE_MS;
  if(audible){
   const outgoing=active;active=1-active;target=channels[active];
   fadeChannel(outgoing,0,CROSSFADE_MS,()=>{if(outgoing!==active)release(channels[outgoing]);});
  }else{
   const other=channels[1-active];
   tweens.delete('level'+(1-active));
   if(other.track)release(other);
  }
  load(target,track);
  if(!audible)target.level=0;
  apply();
  setPlayback('loading');
  let started:Promise<void>;
  try{started=Promise.resolve(target.media.play());}catch(error){started=Promise.reject(error);}
  fadeChannel(active,1,fadeMs);
  return started.then(()=>{
   if(gen!==generation||destroyed)return playback;
   setPlayback('playing');return playback;
  },(error:unknown)=>{
   if(gen!==generation||destroyed)return playback;
   tweens.clear();duck=1;
   for(const channel of channels){try{channel.media.pause();}catch{/* 멈춤 */}}
   const other=channels[1-active];if(other.track)release(other);
   setPlayback((error as {name?:string})?.name==='NotAllowedError'?'blocked':'error');
   return playback;
  });
 }
 function pause(){
  if(destroyed)return;
  generation++;
  tweens.delete('level0');tweens.delete('level1');
  const other=channels[1-active];if(other.track)release(other);
  try{channels[active].media.pause();}catch{/* 멈춤 */}
  channels[active].level=0;
  if(playback!=='idle'||channels[active].track)setPlayback(channels[active].track?'paused':'idle');
 }
 function setVolume(value:number){volume=clamp(value);apply();emit();}
 function setSfxEnabled(enabled:boolean){sfxOn=enabled;emit();}
 /** 효과음 한 번. 끄여 있거나 에셋이 없으면 false(무음 슬롯). */
 function sfx(name:SfxName):boolean{
  const src=SFX_SOURCES[name];
  if(destroyed||!sfxOn||!src)return false;
  let media=pool.find(item=>item.paused||item.ended);
  if(!media&&pool.length<SFX_POOL){media=deps.createMedia();media.preload='auto';pool.push(media);}
  if(!media)media=pool[0];
  if(media.getAttribute('src')!==src)media.setAttribute('src',src);
  try{media.currentTime=0;}catch{/* 메타데이터 전 */}
  try{media.volume=SFX_VOLUME;}catch{/* 고정 볼륨 */}
  try{void Promise.resolve(media.play()).catch(()=>{/* 효과음은 실패해도 흐름을 막지 않는다 */});}catch{/* 동일 */}
  if(playback==='playing'){
   if(duckHold!==null){deps.clearTimer(duckHold);duckHold=null;}
   tween('duck',duck,DUCK_LEVEL,DUCK_IN_MS,value=>{duck=value;},()=>{
    duckHold=deps.setTimer(()=>{duckHold=null;if(!destroyed)tween('duck',duck,1,DUCK_OUT_MS,value=>{duck=value;});},DUCK_HOLD_MS);
   });
  }
  return true;
 }
 function destroy(){
  if(destroyed)return;
  generation++;destroyed=true;tweens.clear();
  if(ticking!==null)deps.clearTimer(ticking);
  if(duckHold!==null)deps.clearTimer(duckHold);
  ticking=duckHold=null;
  for(const channel of channels)release(channel);
  for(const media of pool){try{media.pause();}catch{/* 멈춤 */}media.removeAttribute('src');try{media.load();}catch{/* 없음 */}}
  pool.length=0;
  if(context){void context.close().catch(()=>{/* 이미 닫힘 */});context=null;}
  playback='idle';listeners.clear();
 }
 return {
  play,pause,unlock,setVolume,setSfxEnabled,sfx,destroy,snapshot,
  subscribe(listener:(value:EngineSnapshot)=>void){listeners.add(listener);return()=>{listeners.delete(listener);};},
  /** 시험용: 지금 두 채널의 실제 출력 음량. */
  levels:()=>channels.map(channel=>channel.gainNode?channel.gainNode.gain.value:channel.media.volume),
  get duck(){return duck;},
 };
}
export type AudioEngine=ReturnType<typeof createAudioEngine>;
