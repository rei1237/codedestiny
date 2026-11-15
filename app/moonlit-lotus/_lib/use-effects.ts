"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
export function useEffects(){
 const audio=useRef<AudioContext>(),tone=useRef<OscillatorNode>(),last=useRef(0);
 const [enabled,setEnabled]=useState(false),[error,setError]=useState('');
 const stop=useCallback(()=>{try{tone.current?.stop();}catch{/* already ended */}tone.current=undefined;},[]);
 useEffect(()=>()=>{stop();void audio.current?.close();},[stop]);
 const strike=useCallback(async()=>{
  if(!enabled||Date.now()-last.current<350)return;
  last.current=Date.now();
  try{
   audio.current??=new AudioContext();await audio.current.resume();stop();
   const context=audio.current,osc=context.createOscillator(),gain=context.createGain();
   osc.type='sine';osc.frequency.setValueAtTime(550,context.currentTime);osc.frequency.exponentialRampToValueAtTime(180,context.currentTime+.2);
   gain.gain.setValueAtTime(.0001,context.currentTime);gain.gain.exponentialRampToValueAtTime(.14,context.currentTime+.006);gain.gain.exponentialRampToValueAtTime(.0001,context.currentTime+.28);
   osc.connect(gain);gain.connect(context.destination);osc.start();osc.stop(context.currentTime+.3);tone.current=osc;
   osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }catch{setError('효과음을 재생할 수 없어요. 소리 없이도 계속 이용할 수 있어요.');}
 },[enabled,stop]);
 return{enabled,error,strike,toggle:()=>setEnabled(value=>{if(value)stop();return !value;})};
}
