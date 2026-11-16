"use client";
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {rearBase,rearLabel,companionRearPoseAt,type RearCharacterId} from '../_lib/companion-rear';
import styles from '../space.module.css';
type Pose=ReturnType<typeof companionRearPoseAt>;
export default function YeoniRear({id='yeoni',elapsed,bowing,reduced,onFailure}:{id?:RearCharacterId;elapsed:number;bowing:boolean;reduced:boolean;onFailure:()=>void}){
 const base=rearBase(id);
 const [ready,setReady]=useState(false),[pair,setPair]=useState<{current:Pose;previous:Pose|null}>({current:{sheet:'down',frame:0},previous:null});
 const failure=useRef(onFailure);failure.current=onFailure;
 useEffect(()=>{let cancelled=false;Promise.all(['down','lower','up'].map(async name=>{const img=new Image();img.src=base+'/'+name+'.webp';await img.decode();})).then(()=>{if(!cancelled)setReady(true);}).catch(()=>{if(!cancelled)failure.current();});return()=>{cancelled=true;};},[base]);
 const pose=bowing&&!reduced?companionRearPoseAt(id,elapsed):{sheet:'down',frame:0};
 useEffect(()=>{if(ready)setPair(last=>reduced?{current:pose,previous:null}:last.current.sheet===pose.sheet&&last.current.frame===pose.frame?last:{previous:last.current,current:pose});},[pose.sheet,pose.frame,ready,reduced]); // eslint-disable-line react-hooks/exhaustive-deps
 const frameStyle=(p:Pose):CSSProperties=>({backgroundImage:`url(${base}/${p.sheet}.webp)`,backgroundPosition:`${p.frame%4/3*100}% ${Math.floor(p.frame/4)/3*100}%`});
 return <div className={styles.rearSprite} role="img" aria-label={rearLabel(id)+' · 불상을 향해 '+(bowing?'참배 중':'합장')} data-rear-character={id} data-rear-sheet={pair.current.sheet} data-rear-frame={pair.current.frame} data-rear-ready={ready}>
  {!ready?<div className={styles.rearLayer} style={{backgroundImage:`url(${base}/still.webp)`,backgroundSize:'100%'}}/>:<>
   {pair.previous&&<div className={styles.rearLayer} style={frameStyle(pair.previous)} aria-hidden="true"/>}
   <div key={pair.current.sheet+pair.current.frame} className={`${styles.rearLayer} ${pair.previous&&!reduced?styles.rearArriving:''}`} style={frameStyle(pair.current)} aria-hidden="true" onAnimationEnd={()=>setPair(last=>last.current===pair.current?{...last,previous:null}:last)}/>
  </>}
 </div>;
}
