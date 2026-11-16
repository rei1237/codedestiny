"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
const MOKTAK='/assets/moonlit-lotus/audio-v1/mokugyo.mp3';
export function useEffects(){
 const audio=useRef<AudioContext>(),tone=useRef<AudioBufferSourceNode>(),buffer=useRef<AudioBuffer>();
 const bytes=useRef<Promise<ArrayBuffer>>(),controller=useRef<AbortController>(),last=useRef(0),generation=useRef(0),busy=useRef(false),alive=useRef(true),allowed=useRef(true);
 const [enabled,setEnabled]=useState(true),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 const load=useCallback(()=>{
  if(!bytes.current){controller.current=new AbortController();const promise:Promise<ArrayBuffer>=fetch(MOKTAK,{signal:controller.current.signal}).then(r=>{if(!r.ok)throw Error('sound unavailable');return r.arrayBuffer();}).catch(e=>{if(bytes.current===promise)bytes.current=undefined;throw e;});bytes.current=promise;}
  return bytes.current;
 },[]);
 const stop=useCallback(()=>{generation.current++;try{tone.current?.stop();}catch{/* already ended */}tone.current=undefined;},[]);
 useEffect(()=>{
  alive.current=true;void load().catch(()=>{/* Retry on an explicit strike. */});
  const hidden=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hidden);
  return()=>{alive.current=false;controller.current?.abort();stop();void audio.current?.close();audio.current=undefined;buffer.current=undefined;bytes.current=undefined;document.removeEventListener('visibilitychange',hidden);};
 },[load,stop]);
 const strike=useCallback(async()=>{
  if(!allowed.current){setError('목탁 소리가 꺼져 있어요. 소리를 켠 뒤 다시 두드려 주세요.');return;}
  if(busy.current||Date.now()-last.current<120)return;
  last.current=Date.now();busy.current=true;setLoading(true);setError('');const request=generation.current;
  try{
   audio.current??=new AudioContext();const context=audio.current;await context.resume();
   if(!buffer.current)buffer.current=await context.decodeAudioData((await load()).slice(0));
   if(!alive.current||!allowed.current||request!==generation.current||document.hidden)return;
   stop();const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer.current;gain.gain.value=.55;source.connect(gain);gain.connect(context.destination);tone.current=source;
   source.onended=()=>{source.disconnect();gain.disconnect();if(tone.current===source)tone.current=undefined;};source.start();
  }catch{if(alive.current)setError('목탁 소리를 불러오지 못했어요. 잠시 후 다시 두드려 주세요. 다른 활동은 계속 이용할 수 있어요.');}
  finally{busy.current=false;if(alive.current)setLoading(false);}
 },[load,stop]);
 const toggle=()=>{allowed.current=!allowed.current;if(!allowed.current)stop();setEnabled(allowed.current);setError('');};
 return{enabled,error,loading,strike,toggle};
}
