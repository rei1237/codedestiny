"use client";
// 참배 흐름의 배경 음악·효과음. 엔진 하나를 만들고 선호(cd:moonlit-music:v1)·탭 전환·다른 탭 오디오와 맞춘다.
// 언마운트(나가기, ?stay=1 둘러보기 전환)에서 엔진을 통째로 정리해 기존 MusicPlayer 와 겹치지 않는다.
import {useCallback,useEffect,useRef,useState} from 'react';
import {createAudioEngine,defaultEngineDeps,type AudioEngine,type EngineSnapshot,type SfxName} from './audio-engine';
import {browserStorage,readPreference,writePreference,defaultPreference,type MusicPreference} from './music-preference';
import {DEFAULT_TRACK_ID,RITUAL_TRACKS,TRACK_IDS,trackIndex,type RitualTrack} from './tracks';
export const AUDIO_CHANNEL='cd:moonlit-audio';
const idle:EngineSnapshot={playback:'idle',trackId:null,volume:defaultPreference(DEFAULT_TRACK_ID).volume,volumeFixed:false,sfx:true,gain:false};
export function useAmbientAudio(){
 const engine=useRef<AudioEngine|null>(null),preference=useRef<MusicPreference>(defaultPreference(DEFAULT_TRACK_ID));
 const bus=useRef<BroadcastChannel|null>(null),resumeOnShow=useRef(false);
 const [snapshot,setSnapshot]=useState<EngineSnapshot>(idle);
 const [selected,setSelected]=useState(DEFAULT_TRACK_ID);
 const remember=useCallback((patch:Partial<MusicPreference>)=>{
  const next={...preference.current,...patch};preference.current=next;
  writePreference(browserStorage(),next);
  if(patch.trackId)setSelected(patch.trackId);
  return next;
 },[]);
 const start=useCallback((track:RitualTrack,crossfade=true)=>{
  const current=engine.current;
  if(!current)return;
  void current.play(track,{crossfade});
 },[]);
 const move=useCallback((direction:1|-1,ended=false)=>{
  const current=engine.current;if(!current)return;
  const index=(trackIndex(preference.current.trackId)+direction+RITUAL_TRACKS.length)%RITUAL_TRACKS.length;
  const track=RITUAL_TRACKS[index];
  remember({trackId:track.id});
  const status=current.snapshot().playback;
  if(ended||status==='playing'||status==='loading')start(track,!ended);
 },[remember,start]);
 useEffect(()=>{
  const saved=readPreference(browserStorage(),TRACK_IDS,DEFAULT_TRACK_ID);
  preference.current=saved;setSelected(saved.trackId);
  const created=createAudioEngine(defaultEngineDeps(()=>move(1,true)));
  engine.current=created;
  created.setVolume(saved.muted?0:saved.volume);created.setSfxEnabled(saved.sfx);
  let previous=created.snapshot().playback;
  const off=created.subscribe(value=>{
   // 이 탭에서 음악이 흐르기 시작하면 다른 탭의 연화당 음악(기존 MusicPlayer 포함)을 멈춘다.
   if(value.playback==='playing'&&previous!=='playing'){try{bus.current?.postMessage('playing');}catch{/* 닫힌 채널 */}}
   previous=value.playback;setSnapshot(value);
  });
  setSnapshot(created.snapshot());
  if(typeof BroadcastChannel!=='undefined'){
   try{
    const channel=new BroadcastChannel(AUDIO_CHANNEL);bus.current=channel;
    channel.onmessage=()=>{const status=created.snapshot().playback;if(status==='playing'||status==='loading')created.pause();};
   }catch{bus.current=null;}
  }
  const visibility=()=>{
   const status=created.snapshot().playback;
   if(document.hidden){if(status==='playing'||status==='loading'){resumeOnShow.current=true;created.pause();}return;}
   if(resumeOnShow.current){resumeOnShow.current=false;start(RITUAL_TRACKS[trackIndex(preference.current.trackId)],false);}
  };
  const pageHide=()=>{resumeOnShow.current=false;created.pause();};
  document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',pageHide);
  let cancelled=false;
  queueMicrotask(()=>{
   // 자동재생이 허용되는 환경(앱 WebView 등)에서는 바로 흐른다. 막히면 blocked 로 남고 입장 탭이 다시 튼다.
   if(cancelled||!saved.auto||saved.muted||saved.volume===0||document.hidden)return;
   // 방문자가 이미 듣고 있는 다른 미디어는 자동재생으로 끊지 않는다.
   if(Array.from(document.querySelectorAll('audio,video')).some(other=>!(other as HTMLMediaElement).paused))return;
   start(RITUAL_TRACKS[trackIndex(saved.trackId)],false);
  });
  return()=>{
   cancelled=true;off();created.destroy();engine.current=null;resumeOnShow.current=false;
   try{bus.current?.close();}catch{/* 이미 닫힘 */}bus.current=null;
   document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',pageHide);
  };
 },[move,start]);
 /** 입장 탭 핸들러 안에서 동기적으로 부른다. await 를 넣으면 제스처 창을 놓친다. */
 const begin=useCallback(()=>{
  const current=engine.current;if(!current)return;
  current.unlock();
  const saved=preference.current,status=current.snapshot().playback;
  if(saved.auto&&!saved.muted&&saved.volume>0&&status!=='playing'&&status!=='loading')start(RITUAL_TRACKS[trackIndex(saved.trackId)],false);
 },[start]);
 const toggle=useCallback(()=>{
  const current=engine.current;if(!current)return;
  const status=current.snapshot().playback;
  if(status==='playing'||status==='loading'){current.pause();remember({auto:false});return;}
  current.unlock();
  const saved=remember({auto:true,muted:false});
  if(current.snapshot().volume===0){current.setVolume(saved.volume||defaultPreference(DEFAULT_TRACK_ID).volume);remember({volume:current.snapshot().volume});}
  start(RITUAL_TRACKS[trackIndex(saved.trackId)]);
 },[remember,start]);
 const select=useCallback((id:string)=>{
  const current=engine.current;if(!current)return;
  current.unlock();
  const saved=remember({trackId:id,auto:true,muted:false});
  start(RITUAL_TRACKS[trackIndex(saved.trackId)]);
 },[remember,start]);
 const setVolume=useCallback((value:number)=>{engine.current?.setVolume(value);remember({volume:Math.max(0,Math.min(1,value)),muted:false});},[remember]);
 const setSfx=useCallback((enabled:boolean)=>{engine.current?.setSfxEnabled(enabled);remember({sfx:enabled});},[remember]);
 const sfx=useCallback((name:SfxName)=>engine.current?.sfx(name)??false,[]);
 return {
  // snapshot.sfx(켜짐 여부)는 아래 sfx(재생 함수)와 이름이 겹쳐 sfxOn 으로 따로 낸다.
  ...snapshot,sfxOn:snapshot.sfx,selected,tracks:RITUAL_TRACKS,
  begin,toggle,select,setVolume,setSfx,sfx,
  next:useCallback(()=>move(1),[move]),prev:useCallback(()=>move(-1),[move]),
 };
}
export type AmbientAudio=ReturnType<typeof useAmbientAudio>;
