"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
const TEMPLE_SOUND='/assets/moonlit-lotus/audio-v2/moktak-chant.mp3';
/** One media element owns both layers: repeat clicks never stack recordings. */
export function useEffects(){
 const audio=useRef<HTMLAudioElement>(),generation=useRef(0),alive=useRef(true),allowed=useRef(true),pending=useRef(false);
 const [enabled,setEnabled]=useState(true),[playing,setPlaying]=useState(false),[error,setError]=useState(''),[loading,setLoading]=useState(false),[volume,setVolume]=useState(.45);
 const volumeRef=useRef(volume);
 const stop=useCallback(()=>{
  generation.current++;pending.current=false;
  if(audio.current){audio.current.pause();audio.current.currentTime=0;}
  if(alive.current){setPlaying(false);setLoading(false);}
 },[]);
 useEffect(()=>{
  alive.current=true;
  const hidden=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hidden);
  return()=>{alive.current=false;stop();if(audio.current){audio.current.onerror=null;audio.current.removeAttribute('src');audio.current.load();audio.current=undefined;}document.removeEventListener('visibilitychange',hidden);};
 },[stop]);
 const strike=useCallback(async()=>{
  if(pending.current||(audio.current&&!audio.current.paused)){stop();return;}
  if(!allowed.current){allowed.current=true;setEnabled(true);}
  setError('');setLoading(true);pending.current=true;const request=++generation.current;
  const sound=audio.current??new Audio(TEMPLE_SOUND);audio.current=sound;
  if(sound.error)sound.load();
  sound.loop=true;sound.preload='none';sound.volume=volumeRef.current;
  sound.onerror=()=>{if(alive.current&&request===generation.current){stop();setError('목탁·염불 소리를 불러오지 못했어요. 다시 눌러 주세요. 다른 활동은 계속 이용할 수 있어요.');}};
  try{
   await sound.play();
   if(!alive.current||request!==generation.current)return;
   pending.current=false;setLoading(false);setPlaying(true);
  }catch{
   if(alive.current&&request===generation.current){stop();setError('소리를 재생하지 못했어요. 목탁·염불 듣기를 다시 눌러 주세요.');}
  }
 },[stop]);
 const toggle=()=>{allowed.current=!allowed.current;if(!allowed.current)stop();setEnabled(allowed.current);setError('');};
 const changeVolume=(value:number)=>{const next=Math.max(0,Math.min(1,value));volumeRef.current=next;setVolume(next);if(audio.current)audio.current.volume=next;};
 return{enabled,playing,error,loading,volume,changeVolume,strike,toggle,stop};
}
