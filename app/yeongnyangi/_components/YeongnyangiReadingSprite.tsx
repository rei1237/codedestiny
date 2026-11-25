'use client';

import {useEffect,useState,type ReactNode} from 'react';
import type {DomainId} from '@/worker/yeongnyangi/fortune/shared/contracts';
import {useLazySpriteSource,useSpritePlaybackGate} from '@/src/hooks/useSpritePlaybackGate';
import styles from './reading-loading.module.css';

type SpriteDomain=DomainId|'fusion';
// Literal paths so bundlers (the Toss service resize rule) can see every sheet.
const sheets:Record<SpriteDomain,string>={
 saju:'/assets/yeongnyangi/readings/saju-loading-sprite-v1.webp',
 tarot:'/assets/yeongnyangi/readings/tarot-loading-sprite-v1.webp',
 ziwei:'/assets/yeongnyangi/readings/ziwei-loading-sprite-v1.webp',
 astrology:'/assets/yeongnyangi/readings/astrology-loading-sprite-v1.webp',
 sukuyo:'/assets/yeongnyangi/readings/sukuyo-loading-sprite-v1.webp',
 vedic:'/assets/yeongnyangi/readings/vedic-loading-sprite-v1.webp',
 fusion:'/assets/yeongnyangi/readings/fusion-loading-sprite-v1.webp',
};
// Each sheet is 4x2 cells. Cells whose pose or style jumps (measured 2026-11-25) stay out of the loop so the
// cross-fade reads as gentle motion: saju 5 (large-eye style), vedic/fusion 4-6 (tail and size jump),
// sukuyo 0, 4, 5, 7 (lateral swing and pose change).
const sequences:Record<SpriteDomain,number[]>={
 saju:[0,1,2,3,4,6,7],tarot:[0,1,2,3,4,5,6,7],ziwei:[0,1,2,3,4,5,6,7],astrology:[0,1,2,3,4,5,6,7],
 sukuyo:[1,2,3,6],vedic:[0,1,2,3,7],fusion:[0,1,2,3,7],
};
const HOLD_MS=1000;
// Cell positions live in CSS classes: the sheet is resized per surface, so only percentages are safe.
const cells=[styles.c0,styles.c1,styles.c2,styles.c3,styles.c4,styles.c5,styles.c6,styles.c7];

/** Yeongnyangi reading for the buyer while the server writes: one sheet per consultation, two layers cross-faded. */
export default function YeongnyangiReadingSprite({domain,fallback}:{domain:SpriteDomain;fallback:ReactNode}){
 const gate=useSpritePlaybackGate<HTMLDivElement>({rootMargin:'0px'});
 // Once the sheet was wanted it stays loaded when scrolled away; the gate only pauses the loop.
 const [wanted,setWanted]=useState(false);
 useEffect(()=>{if(gate.canLoad)setWanted(true);},[gate.canLoad]);
 const src=sheets[domain]||sheets.fusion,order=sequences[domain]||sequences.fusion;
 const sheet=useLazySpriteSource(src,wanted);
 const [step,setStep]=useState(0);
 useEffect(()=>{setStep(0);},[src]);
 useEffect(()=>{
  if(!sheet.isLoaded||!gate.canAnimate)return;
  const timer=window.setInterval(()=>setStep(value=>value+1),HOLD_MS);
  return ()=>window.clearInterval(timer);
 },[sheet.isLoaded,gate.canAnimate]);
 if(sheet.isFailed)return <>{fallback}</>;
 const current=order[step%order.length],previous=order[(step+order.length-1)%order.length];
 const image=sheet.resolvedSrc?{backgroundImage:`url("${sheet.resolvedSrc}")`}:undefined;
 return <div ref={gate.ref} className={styles.sprite} aria-hidden="true" data-yn-sprite={sheet.status} data-yn-sprite-domain={domain} data-yn-sprite-frame={sheet.isLoaded?current:undefined}>
  {image&&<>
   {step>0&&<span className={[styles.frame,cells[previous]].join(' ')} style={image}/>}
   <span key={step} className={[styles.frame,cells[current],step>0?styles.enter:''].join(' ')} style={image}/>
  </>}
 </div>;
}
