"use client";
// 참배 배경. 단계가 바뀌면 이전 그림(leave)과 새 그림(enter) 두 겹을 겹쳐 카메라를 옮긴다(transform+opacity 만).
// 다음 단계 그림과 소품은 진입 400ms 뒤 숨은 picture 요소로 한 장씩만 미리 받는다(브라우저가 화면에 맞는 source 만 받는다).
import {useEffect,useState} from 'react';
import {RITUAL_STEPS,type RitualStep} from './ritual-machine';
import {MOVE_MS,PRELOAD_DELAY_MS,RITUAL_MOVES,RITUAL_VIEWS,STEP_PROPS} from './ritual-views';
import styles from './ritual.module.css';
function Scene({step,onError}:{step:RitualStep;onError?:()=>void}){
 const view=RITUAL_VIEWS[step];
 return <>
  {view.avif&&<source media="(min-width:701px)" type="image/avif" srcSet={view.avif.landscape}/>}
  <source media="(min-width:701px)" type="image/webp" srcSet={view.landscape}/>
  {view.avif&&<source type="image/avif" srcSet={view.avif.portrait}/>}
  <img src={view.portrait} alt="" decoding="async" draggable={false} onError={onError}/>
 </>;
}
type Layers={current:RitualStep;previous:RitualStep|null;turn:number;fallback:RitualStep|null;broken:RitualStep|null};
// fallback = 마지막으로 멀쩡히 보인 그림. 새 그림을 못 받으면(broken) 그 그림을 전환 없이 그대로 둔다.
export default function RitualBackdrop({step}:{step:RitualStep}){
 const [layers,setLayers]=useState<Layers>({current:step,previous:null,turn:0,fallback:null,broken:null});
 const [warm,setWarm]=useState<RitualStep|null>(null);
 useEffect(()=>{setLayers(value=>{
  if(value.current===step)return value;
  const shown=value.broken===value.current?value.fallback:value.current;
  return {...value,current:step,previous:shown,turn:value.turn+1,fallback:shown};
 });},[step]);
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
 const kept=layers.broken===layers.current?layers.fallback:null;
 const order=kept?[kept]:layers.previous?[layers.previous,layers.current]:[layers.current];
 const broke=(item:RitualStep)=>()=>setLayers(value=>value.current===item?{...value,broken:item}:value);
 return <div className={styles.backdrop} aria-hidden="true" data-move={RITUAL_MOVES[layers.current]}>
  {order.map(item=><picture key={item} className={styles.layer} data-step={item} data-phase={kept?'still':item===layers.previous?'leave':layers.turn>0?'enter':'still'}><Scene step={item} onError={broke(item)}/></picture>)}
  {warm&&<div className={styles.warm} key={'warm-'+warm}>
   <picture><Scene step={warm}/></picture>
   {STEP_PROPS[warm].map(src=><img key={src} src={src} alt="" decoding="async"/>)}
  </div>}
 </div>;
}
