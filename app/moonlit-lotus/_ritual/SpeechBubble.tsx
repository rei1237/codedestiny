"use client";
import {useEffect,useState} from 'react';
import type {RitualT} from './use-ritual-t';
import styles from './ritual.module.css';
/** 1~2줄 말풍선. 글자가 하나씩 나오고, 누르면 바로 전체가 보인다. 낭독기는 전체 문장을 한 번만 듣는다.
 *  말풍선은 단계가 바뀌어도 다시 마운트하지 않는다 — aria-live 영역이 늘 DOM 에 있어야 새 문장이 읽힌다. */
export default function SpeechBubble({speaker,text,instant,fast,t}:{speaker:string;text:string;instant:boolean;fast:boolean;t:RitualT}){
 const glyphs=Array.from(text);
 const [shown,setShown]=useState(instant?glyphs.length:0),[seen,setSeen]=useState(text);
 // 문장이 바뀐 그 렌더에서 바로 처음부터(효과로 미루면 새 문장 전체가 한 프레임 비친다).
 if(seen!==text){setSeen(text);setShown(instant?glyphs.length:0);}
 useEffect(()=>{if(instant)setShown(Array.from(text).length);},[instant,text]);
 useEffect(()=>{
  if(shown>=glyphs.length)return;
  const timer=setTimeout(()=>setShown(value=>value+1),fast?14:34);
  return()=>clearTimeout(timer);
 },[shown,glyphs.length,fast]);
 const typing=shown<glyphs.length;
 return <div className={styles.bubble} data-typing={typing}>
  <p className={styles.speaker}>{speaker}</p>
  <p className={styles.line} aria-hidden="true">{glyphs.slice(0,shown).join('')}<span className={styles.ghost}>{glyphs.slice(shown).join('')}</span></p>
  <p className={styles.srOnly} aria-live="polite">{text}</p>
  {typing&&<button type="button" className={styles.bubbleSkip} aria-label={t('showLine')} onClick={()=>setShown(glyphs.length)}/>}
 </div>;
}
