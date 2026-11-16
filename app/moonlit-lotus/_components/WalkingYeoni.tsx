"use client";
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {walkDrawing} from '../_lib/companions';
import {loadSpriteImage,type SpriteDrawing} from '../_lib/sprite-images';
import type {AvatarStyle} from '../_lib/use-space-profile';
import styles from '../space.module.css';
type Journey={from:string;to:string}|null;
/** Cosmetic travel; its persistent child also owns the standing sprite surface. */
export default function WalkingYeoni({journey,x,y,onCross,onDone,kind,look,image,children}:{journey:Journey;x:number;y:number;onCross:()=>void;onDone:()=>void;kind:string;look:AvatarStyle;image:string;children:(drawing:SpriteDrawing|null)=>ReactNode}){
 const drawing=walkDrawing(kind,look,image),WALK=drawing.url;
 const token=journey?journey.from+'-'+journey.to+'-'+WALK:'';
 const [motion,setMotion]=useState({token:'',progress:0}),callbacks=useRef({onCross,onDone});callbacks.current={onCross,onDone};
 useEffect(()=>{
  if(!token)return;
  let alive=true,raf=0,crossed=false,elapsed=0,last:number|null=null;
  const finish=()=>{if(!alive)return;alive=false;cancelAnimationFrame(raf);if(!crossed){crossed=true;callbacks.current.onCross();}callbacks.current.onDone();};
  const visibility=()=>{if(document.hidden)finish();};
  const tick=(now:number)=>{
   if(!alive)return;
   if(last!==null)elapsed+=Math.min(now-last,64);last=now;
   const p=Math.min(elapsed/2400,1);setMotion({token,progress:p});
   if(p>=.5&&!crossed){crossed=true;callbacks.current.onCross();}
   if(p>=1)finish();else raf=requestAnimationFrame(tick);
  };
  // Retain the standing drawing and position until the walk atlas has decoded.
  void loadSpriteImage(WALK).then(()=>{if(alive){if(document.hidden)finish();else raf=requestAnimationFrame(tick);}},finish);
  document.addEventListener('visibilitychange',visibility);
  return()=>{alive=false;cancelAnimationFrame(raf);document.removeEventListener('visibilitychange',visibility);};
 },[WALK,token]);
 const moving=!!journey&&motion.token===token,progress=motion.progress,entering=progress>=.5,t=entering?(progress-.5)*2:progress*2;
 const distance=t*t*(3-2*t),fromX=journey?.from==='hall'?50:46,fromY=journey?.from==='hall'?86:82,toX=journey?.to==='hall'?50:46,toY=journey?.to==='hall'?86:82;
 const left=moving?entering?78+(toX-78)*distance:fromX+(78-fromX)*distance:x,top=moving?fromY+(toY-fromY)*(progress*progress*(3-2*progress)):y;
 const frame=drawing.offset+Math.floor(distance*drawing.frames*2)%drawing.frames;
 return <div className={styles.character} data-photo-character data-walking={moving||undefined} style={{left:left+'%',top:top+'%'}}>{children(moving?{url:WALK,frame,rows:drawing.rows}:null)}</div>;
}
