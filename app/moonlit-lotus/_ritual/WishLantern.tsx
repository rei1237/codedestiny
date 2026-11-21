"use client";
import {useRef,useState} from 'react';
import type {RitualT} from './use-ritual-t';
import styles from './ritual.module.css';
import space from '../space.module.css';
/** 소원 한 줄. 연등을 위로 밀거나 버튼을 누르면 떠오른다. */
export default function WishLantern({sent,onSend,t}:{sent:boolean;onSend:(text:string)=>void;t:RitualT}){
 const [text,setText]=useState('');
 const start=useRef<number|null>(null);
 const ready=text.trim().length>0&&!sent;
 const send=()=>{if(ready)onSend(text);};
 return <div className={styles.wish}>
  <div className={styles.lantern} data-sent={sent} data-ready={ready} role="img" aria-label={t('wish.lantern')}
   onPointerDown={event=>{start.current=event.clientY;}}
   onPointerUp={event=>{const from=start.current;start.current=null;if(from!==null&&from-event.clientY>48)send();}}
   onPointerCancel={()=>{start.current=null;}}>
   <span className={styles.lanternGlow}/>
  </div>
  {!sent&&<>
   <label className={styles.wishLabel} htmlFor="ritual-wish">{t('wish.label')}</label>
   <textarea id="ritual-wish" className={styles.wishInput} rows={2} maxLength={300} value={text} placeholder={t('wish.placeholder')} onChange={event=>setText(event.target.value)}/>
   <button type="button" className={space.primary+' '+styles.action} disabled={!ready} onClick={send}>{t('wish.send')}</button>
   <p className={styles.hint}>{t('wish.swipe')}</p>
  </>}
 </div>;
}
