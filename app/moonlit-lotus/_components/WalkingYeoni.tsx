"use client";
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {walkDrawing,roomMarkup} from '../_lib/companions';
import type {AvatarStyle} from '../_lib/use-space-profile';
import styles from '../space.module.css';
/** A cosmetic journey only: never drives the bow session or its counter. */
export default function WalkingYeoni({fromX,fromY,toX,toY,onCross,onDone,kind,look,image,portrait}:{fromX:number;fromY:number;toX:number;toY:number;onCross:()=>void;onDone:()=>void;kind:string;look:AvatarStyle;image:string;portrait:string}){
 const drawing=walkDrawing(kind,look,image),WALK=drawing.url;
 const [progress,setProgress]=useState(0),callbacks=useRef({onCross,onDone});callbacks.current={onCross,onDone};
 useEffect(()=>{
  let alive=true,raf=0,crossed=false,elapsed=0,last=0;
  const finish=()=>{if(!alive)return;if(!crossed){crossed=true;callbacks.current.onCross();}callbacks.current.onDone();};
  const visibility=()=>{if(document.hidden){cancelAnimationFrame(raf);finish();}};
  const tick=(now:number)=>{
   if(!alive)return;
   if(last)elapsed+=Math.min(now-last,64);last=now;
   const p=Math.min(elapsed/2400,1);setProgress(p);
   if(p>=.5&&!crossed){crossed=true;callbacks.current.onCross();}
   if(p>=1)finish();else raf=requestAnimationFrame(tick);
  };
  const img=new Image();img.src=WALK;
  img.decode().then(()=>{if(alive){if(document.hidden)finish();else raf=requestAnimationFrame(tick);}}).catch(finish);
  document.addEventListener('visibilitychange',visibility);
  return()=>{alive=false;cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',visibility);};
 },[WALK]);
 const entering=progress>=.5,t=entering?(progress-.5)*2:progress*2;
 // Gentle acceleration/deceleration; pose cadence uses distance, not a second clock.
 const distance=t*t*(3-2*t),x=entering?20+(toX-20)*distance:fromX+(78-fromX)*distance;
 const frame=Math.floor(distance*drawing.frames*2)%drawing.frames;
 const opacity=entering?Math.min(1,t*7):Math.min(1,(1-t)*7);
 const position=`${frame%4/3*100}% ${drawing.rows===1?0:Math.floor(frame/4)/3*100}%`;
 return <div className={styles.character} data-walking="true" style={{left:x+'%',top:(entering?toY:fromY)+'%',opacity}}>{kind==='custom'&&drawing.rows===1?<div className={styles.fullCompanion} data-moving="true" style={{'--room-walk':`url(${WALK})`,'--room-frame':position} as CSSProperties} dangerouslySetInnerHTML={{__html:roomMarkup(look,portrait)}}/>:<div className={styles.characterDrawing} role="img" aria-label="선택한 캐릭터가 천천히 걸어가는 중" style={{backgroundImage:`url(${WALK})`,backgroundPosition:position,backgroundSize:`400% ${drawing.rows*100}%`}}/>}</div>;
}
