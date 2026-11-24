"use client";
// 참배 배경. 단계가 바뀌면 이전 그림(leave)과 새 그림(enter) 두 겹을 겹쳐 카메라를 옮긴다(transform+opacity 만).
// 다음 단계 그림과 소품은 진입 400ms 뒤 숨은 <picture> 로 한 장씩만 미리 받는다(브라우저가 화면에 맞는 source 만 받는다).
import {useEffect,useState} from 'react';
import {RITUAL_STEPS,type RitualStep} from './ritual-machine';
import {MOVE_MS,PRELOAD_DELAY_MS,RITUAL_MOVES,RITUAL_VIEWS,STEP_PROPS} from './ritual-views';
import styles from './ritual.module.css';
function Scene({step}:{step:RitualStep}){
 const view=RITUAL_VIEWS[step];
 return <>
  {view.avif&&<source media="(min-width:701px)" type="image/avif" srcSet={view.avif.landscape}/>}
  <source media="(min-width:701px)" type="image/webp" srcSet={view.landscape}/>
  {view.avif&&<source type="image/avif" srcSet={view.avif.portrait}/>}
  <img src={view.portrait} alt="" decoding="async" draggable={false}/>
 </>;
}
type Layers={current:RitualStep;previous:RitualStep|null;turn:number};
export default function RitualBackdrop({step}:{step:RitualStep}){
 const [layers,setLayers]=useState<Layers>({current:step,previous:null,turn:0});
 const [warm,setWarm]=useState<RitualStep|null>(null);
 useEffect(()=>{setLayers(value=>value.current===step?value:{current:step,previous:value.current,turn:value.turn+1});},[step]);
 // 지나간 그림은 움직임이 끝나면 내린다(reduced·low 는 더 일찍 끝나므로 같은 시각이면 충분하다).
 useEffect(()=>{
  if(!layers.previous)return;
  const turn=layers.turn,timer=setTimeout(()=>setLayers(value=>value.turn===turn?{...value,previous:null}:value),MOVE_MS+50);
  return()=>clearTimeout(timer);
 },[layers.previous,layers.turn]);
 useEffect(()=>{
  setWarm(null);
  const next=RITUAL_STEPS[RITUAL_STEPS.indexOf(step)+1];
  if(!next)return;
  const timer=setTimeout(()=>setWarm(next),PRELOAD_DELAY_MS);
  return()=>clearTimeout(timer);
 },[step]);
 const order=layers.previous?[layers.previous,layers.current]:[layers.current];
 return <div className={styles.backdrop} aria-hidden="true" data-move={RITUAL_MOVES[layers.current]}>
  {order.map(item=><picture key={item} className={styles.layer} data-step={item} data-phase={item===layers.previous?'leave':layers.turn>0?'enter':'still'}><Scene step={item}/></picture>)}
  {warm&&<div className={styles.warm} key={'warm-'+warm}>
   <picture><Scene step={warm}/></picture>
   {STEP_PROPS[warm].map(src=><img key={src} src={src} alt="" decoding="async"/>)}
  </div>}
 </div>;
}
