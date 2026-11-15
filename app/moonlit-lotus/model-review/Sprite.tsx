"use client";
import {memo,useLayoutEffect,useState,type CSSProperties} from 'react';
import {ASSET_BASE,type Sheet} from './sprite-clips';
import styles from './review.module.css';
export function spriteStyle(sheet: Sheet,frame:number):CSSProperties {
  return {backgroundImage:`url(${ASSET_BASE}/${sheet}.webp)`,backgroundPosition:`${frame%4/3*100}% ${Math.floor(frame/4)/3*100}%`};
}
type Drawing={sheet:Sheet;frame:number};
const same=(a:Drawing,b:Drawing)=>a.sheet===b.sheet&&a.frame===b.frame;
export default memo(function Sprite({sheet,frame,label,reduced=false}:{sheet:Sheet;frame:number;label:string;reduced?:boolean}) {
  const [pair,setPair]=useState(()=>({previous:{sheet,frame},current:{sheet,frame}}));
  useLayoutEffect(()=>setPair(last=>same(last.current,{sheet,frame})?last:{previous:last.current,current:{sheet,frame}}),[sheet,frame]);
  const moving=!reduced&&!same(pair.previous,pair.current);
  return <div className={styles.sprite} role="img" aria-label={label} data-sheet={sheet} data-frame={frame}>
    {moving&&<div key={`${sheet}-${frame}-previous`} className={`${styles.spriteLayer} ${styles.departing}`} style={spriteStyle(pair.previous.sheet,pair.previous.frame)} aria-hidden="true" />}
    <div key={`${sheet}-${frame}-current`} className={`${styles.spriteLayer} ${moving?styles.arriving:''}`} style={spriteStyle(pair.current.sheet,pair.current.frame)} aria-hidden="true" />
  </div>;
});
