"use client";
import {useEffect,useRef,useState} from 'react';
import {BREATH_CYCLES,BREATH_PATTERN} from './ritual-machine';
import type {RitualT} from './use-ritual-t';
import styles from './ritual.module.css';
type Phase=keyof typeof BREATH_PATTERN;
const ORDER:Phase[]=['inhale','hold','exhale'];
/** 4-4-6 호흡 빛. 한 번 내쉴 때마다 onCycle. 시간은 CSS 변수로 넘긴다. */
export default function BreathGuide({breaths,scale,onCycle,t}:{breaths:number;scale:number;onCycle:()=>void;t:RitualT}){
 const [phase,setPhase]=useState<Phase|'ready'>('ready');
 const cycle=useRef(onCycle);cycle.current=onCycle;
 useEffect(()=>{
  // 첫 칠에서 바로 커지면 전이가 보이지 않으므로 한 틱 쉬었다가 들이쉰다.
  const timer=setTimeout(()=>setPhase('inhale'),120);
  return()=>clearTimeout(timer);
 },[]);
 useEffect(()=>{
  if(phase==='ready')return;
  const timer=setTimeout(()=>{
   const next=ORDER[(ORDER.indexOf(phase)+1)%ORDER.length];
   if(phase==='exhale')cycle.current();
   setPhase(next);
  },BREATH_PATTERN[phase]*scale);
  return()=>clearTimeout(timer);
 },[phase,scale]);
 const ms=phase==='ready'?0:BREATH_PATTERN[phase]*scale;
 return <div className={styles.breath}>
  <div className={styles.breathLight} data-phase={phase} style={{'--ml-breath-ms':ms+'ms'} as React.CSSProperties} aria-hidden="true"/>
  <p className={styles.breathLabel} aria-live="polite">{phase==='ready'?' ':t('breathe.'+phase)}</p>
  <p className={styles.hint}>{t('breathe.count',{current:Math.min(BREATH_CYCLES,breaths+1),total:BREATH_CYCLES})}</p>
 </div>;
}
