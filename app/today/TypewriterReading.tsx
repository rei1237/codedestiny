"use client";
import {useEffect,useState} from 'react';
import styles from './today-hub.module.css';
export default function TypewriterReading({text}:{text:string}){
 const chars=Array.from(text),[count,setCount]=useState(chars.length),[skip,setSkip]=useState(false);
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');let frame=0,start=0;const full=()=>{cancelAnimationFrame(frame);setCount(Array.from(text).length);};setSkip(false);if(media.matches){full();return;}setCount(0);const tick=(now:number)=>{if(!start)start=now;const length=Array.from(text).length,next=Math.min(length,Math.floor((now-start)/Math.min(28,1800/Math.max(1,length))));setCount(next);if(next<length)frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);const change=()=>{if(media.matches)full();};media.addEventListener('change',change);return()=>{cancelAnimationFrame(frame);media.removeEventListener('change',change);};},[text]);
 return <div className={styles.reading}><div className={styles.typing}><span className={styles.readable}>{text}</span><span aria-hidden="true" className={styles.typeVisible}>{skip?text:chars.slice(0,count).join('')}</span></div>{!skip&&count<chars.length&&<button type="button" className={styles.skipTyping} onClick={()=>setSkip(true)}>바로 보기</button>}</div>;
}
