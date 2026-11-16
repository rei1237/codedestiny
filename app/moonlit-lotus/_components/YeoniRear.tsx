"use client";
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {rearBase,rearLabel,companionRearPoseAt,type RearCharacterId} from '../_lib/companion-rear';
import {createSpriteCompositor} from '../_lib/sprite-compositor';
import styles from '../space.module.css';

export default function YeoniRear({id='yeoni',elapsed,bowing,reduced,onFailure}:{id?:RearCharacterId;elapsed:number;bowing:boolean;reduced:boolean;onFailure:()=>void}){
 const base=rearBase(id),canvas=useRef<HTMLCanvasElement>(null);
 const [loaded,setLoaded]=useState<{base:string;images:Record<string,HTMLImageElement>}|null>(null);
 const renderer=useRef<ReturnType<typeof createSpriteCompositor>|null>(null);
 const failure=useRef(onFailure);failure.current=onFailure;
 const ready=loaded?.base===base;
 useEffect(()=>{
  let cancelled=false;
  Promise.all(['down','lower','up'].map(async name=>{
   const image=new Image();image.src=base+'/'+name+'.webp';await image.decode();return [name,image] as const;
  })).then(entries=>{if(!cancelled)setLoaded({base,images:Object.fromEntries(entries)});}).catch(()=>{if(!cancelled)failure.current();});
  return()=>{cancelled=true;};
 },[base]);
 useLayoutEffect(()=>{
  try{renderer.current=createSpriteCompositor(canvas.current!);}catch{failure.current();}
  return()=>{renderer.current?.dispose();renderer.current=null;};
 },[base]);
 const pose=bowing&&!reduced?companionRearPoseAt(id,elapsed):{sheet:'down',frame:0};
 useLayoutEffect(()=>{
  if(loaded?.base===base)renderer.current?.show(loaded.images[pose.sheet],pose.frame,reduced);
 },[base,loaded,pose.sheet,pose.frame,reduced]);
 return <div className={styles.rearSprite} role="img" aria-label={rearLabel(id)+' · 불상을 향해 '+(bowing?'참배 중':'합장')} data-rear-character={id} data-rear-sheet={pose.sheet} data-rear-frame={pose.frame} data-rear-ready={ready}>
  {!ready&&<div className={styles.rearLayer} style={{backgroundImage:`url(${base}/still.webp)`,backgroundSize:'100%'}}/>}
  <canvas ref={canvas} width={384} height={384} className={styles.rearLayer} style={{width:'100%',height:'100%',visibility:ready?'visible':'hidden'}} aria-hidden="true"/>
 </div>;
}
