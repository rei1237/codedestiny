"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import type {RitualT} from './use-ritual-t';
import styles from './ritual.module.css';
const RING=2*Math.PI*44;
/** 길게 누르면 진행 링이 차오르고 다 차면 향이 켜진다. Enter/Space 길게 누르기와 한 번 누르기 버튼을 대안으로 둔다. */
export default function HoldToLight({holdMs,lit,onLit,t}:{holdMs:number;lit:boolean;onLit:()=>void;t:RitualT}){
 const [progress,setProgress]=useState(0);
 const frame=useRef(0),started=useRef(0),done=useRef(onLit);done.current=onLit;
 const stop=useCallback(()=>{cancelAnimationFrame(frame.current);frame.current=0;started.current=0;},[]);
 const cancel=useCallback(()=>{if(lit)return;stop();setProgress(0);},[lit,stop]);
 const start=useCallback(()=>{
  if(lit||frame.current)return;
  started.current=performance.now();
  const tick=(now:number)=>{
   const value=Math.min(1,(now-started.current)/holdMs);setProgress(value);
   if(value>=1){stop();done.current();return;}
   frame.current=requestAnimationFrame(tick);
  };
  frame.current=requestAnimationFrame(tick);
 },[holdMs,lit,stop]);
 useEffect(()=>stop,[stop]);
 const shown=lit?1:progress;
 return <div className={styles.hold}>
  <button type="button" className={styles.holdButton} data-lit={lit} aria-label={lit?t('incense.lit'):t('incense.hold')} aria-pressed={lit}
   onPointerDown={event=>{event.currentTarget.setPointerCapture?.(event.pointerId);start();}}
   onPointerUp={cancel} onPointerCancel={cancel} onLostPointerCapture={cancel}
   onKeyDown={event=>{if((event.key==='Enter'||event.key===' ')&&!event.repeat){event.preventDefault();start();}}}
   onKeyUp={event=>{if(event.key==='Enter'||event.key===' ')cancel();}}
   onContextMenu={event=>event.preventDefault()}>
   <svg viewBox="0 0 100 100" aria-hidden="true">
    <circle className={styles.holdTrack} cx="50" cy="50" r="44"/>
    <circle className={styles.holdRing} cx="50" cy="50" r="44" strokeDasharray={RING} strokeDashoffset={RING*(1-shown)}/>
    <path className={styles.incenseStick} d="M50 30 V74"/>
    <circle className={styles.incenseEmber} cx="50" cy="30" r="4" data-lit={lit}/>
   </svg>
  </button>
  <p className={styles.hint} aria-live="polite">{lit?t('incense.lit'):t('incense.hold')}</p>
  {!lit&&<button type="button" className={styles.quiet} onClick={()=>{stop();setProgress(1);done.current();}}>{t('incense.tap')}</button>}
 </div>;
}
