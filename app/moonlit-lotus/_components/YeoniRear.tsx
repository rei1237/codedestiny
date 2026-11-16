"use client";
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {REAR_BASE,rearPoseAt} from '../_lib/yeoni-rear';
import styles from '../space.module.css';
type Pose=ReturnType<typeof rearPoseAt>;
export default function YeoniRear({elapsed,bowing,reduced,onFailure}:{elapsed:number;bowing:boolean;reduced:boolean;onFailure:()=>void}){
 const [ready,setReady]=useState(false),[pair,setPair]=useState<{current:Pose;previous:Pose|null}>({current:{sheet:'down',frame:0},previous:null});
 const failure=useRef(onFailure);failure.current=onFailure;
 useEffect(()=>{let cancelled=false;Promise.all(['down','lower','up'].map(async name=>{const img=new Image();img.src=REAR_BASE+'/'+name+'.webp';await img.decode();})).then(()=>{if(!cancelled)setReady(true);}).catch(()=>{if(!cancelled)failure.current();});return()=>{cancelled=true;};},[]);
 const pose=bowing&&!reduced?rearPoseAt(elapsed):{sheet:'down',frame:0};
 useEffect(()=>{if(ready)setPair(last=>reduced?{current:pose,previous:null}:last.current.sheet===pose.sheet&&last.current.frame===pose.frame?last:{previous:last.current,current:pose});},[pose.sheet,pose.frame,ready,reduced]); // eslint-disable-line react-hooks/exhaustive-deps
 const frameStyle=(p:Pose):CSSProperties=>({backgroundImage:`url(${REAR_BASE}/${p.sheet}.webp)`,backgroundPosition:`${p.frame%4/3*100}% ${Math.floor(p.frame/4)/3*100}%`});
 return <div className={styles.rearSprite} role="img" aria-label={'연이 · 불상을 향해 '+(bowing?'참배 중':'합장')} data-rear-sheet={pair.current.sheet} data-rear-frame={pair.current.frame} data-rear-ready={ready}>
  {!ready?<div className={styles.rearLayer} style={{backgroundImage:`url(${REAR_BASE}/still.webp)`,backgroundSize:'100%'}}/>:<>
   {pair.previous&&<div className={styles.rearLayer} style={frameStyle(pair.previous)} aria-hidden="true"/>}
   <div key={pair.current.sheet+pair.current.frame} className={`${styles.rearLayer} ${pair.previous&&!reduced?styles.rearArriving:''}`} style={frameStyle(pair.current)} aria-hidden="true" onAnimationEnd={()=>setPair(last=>last.current===pair.current?{...last,previous:null}:last)}/>
  </>}
 </div>;
}
