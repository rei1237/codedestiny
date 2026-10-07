'use client';
import {useEffect,useRef,useState} from 'react';
import {fortuneApi,FortuneApiError,loginForCurrentPage,checkoutPath,type FortuneRecord,type PublicTarotSpread} from '../../_lib/api';
import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import {tarotSpreadCopyFor} from '../../_lib/tarot-spread-locales';
import {localizedTarotSpread} from '../../_lib/tarot-spread-catalog-locales';
import TarotCardArt from '../TarotCardArt';
import TarotSpreadLayout,{type SlotCard} from './TarotSpreadLayout';
import styles from './tarot-spread.module.css';

// Unsaved picks survive a refresh in this tab; once the server stores the draw, it is the only source.
const key=(id:string)=>`cd:yn:tarot-pick:v1:${id}`;
function restore(id:string,count:number,size:number):number[]{
 try{
  const value=JSON.parse(sessionStorage.getItem(key(id))||'[]');
  return Array.isArray(value)&&value.every(n=>Number.isInteger(n)&&n>=0&&n<size)&&new Set(value).size===value.length?value.slice(0,count):[];
 }catch{return [];}
}
function remember(id:string,picks:number[]){try{sessionStorage.setItem(key(id),JSON.stringify(picks));}catch{/* Picks still work without storage. */}}
function forget(id:string){try{sessionStorage.removeItem(key(id));}catch{/* nothing stored */}}

/** The buyer picks face-down cards from the committed deck before checkout. Faces stay hidden until payment. */
export default function TarotCardPick({row,spread:source,siteLocale,onRow}:{row:FortuneRecord;spread:PublicTarotSpread;siteLocale?:ReadingLocale;onRow:(row:FortuneRecord)=>void}){
 const locale=row.locale||'ko',copy=tarotSpreadCopyFor(locale),spread=localizedTarotSpread(source,locale);
 const [picks,setPicks]=useState<number[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[ready,setReady]=useState(false);
 const lock=useRef(false);
 const [deckSlots,setDeckSlots]=useState(()=>Array.from({length:source.deckSize},(_,i)=>i));
 const [shuffling,setShuffling]=useState(false);
 useEffect(()=>{setDeckSlots(Array.from({length:source.deckSize},(_,i)=>i));setShuffling(false);},[row.id,source.deckSize]);
 useEffect(()=>{if(!shuffling)return;const timer=setTimeout(()=>setShuffling(false),900);return ()=>clearTimeout(timer);},[shuffling]);
 const shuffle=()=>{
  if(shuffling||busy||!ready||drawn||picks.length)return;
  setDeckSlots(previous=>{const next=[...previous];for(let i=next.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[next[i],next[j]]=[next[j],next[i]];}return next;});
  setShuffling(true);
 };
 const ritual=locale==='ko'?{shuffle:'카드 섞기',shuffling:'카드를 고르게 섞고 있어요',intro:'질문을 마음에 두고, 천천히 한 장씩 골라 주세요.',guide:'지금의 질문에 귀 기울일게냥. 서두르지 않아도 괜찮아.'}:{shuffle:'Shuffle cards',shuffling:'Shuffling cards',intro:copy.pickIntro,guide:copy.pickHeading};
 const order=[...spread.positions].sort((a,b)=>a.drawOrder-b.drawOrder);
 const count=spread.cardCount,drawn=spread.drawn;
 useEffect(()=>{if(!drawn)setPicks(restore(row.id,count,spread.deckSize));setReady(true);},[row.id,count,drawn,spread.deckSize]);
 useEffect(()=>{if(ready&&!drawn)remember(row.id,picks);},[ready,drawn,row.id,picks]);
 const shown=drawn?spread.picks||[]:picks;
 const cards:Record<string,SlotCard>={};
 order.forEach((position,i)=>{if(i<(drawn?count:shown.length))cards[position.id]={open:false};});
 const current=!drawn&&picks.length<count?order[picks.length]:undefined;
 const toggle=(slot:number)=>setPicks(list=>list.includes(slot)?list:list.length<count?[...list,slot]:list);
 async function commit(body:{picks:number[]}|{auto:true}){
  if(lock.current)return;lock.current=true;setBusy(true);setError('');
  try{
   const {fortune}=await fortuneApi<{fortune:FortuneRecord}>(`requests/${row.id}/tarot-draw`,body);
   if(fortune.id!==row.id)throw new FortuneApiError('RECOVERY_ID_MISMATCH',copy.failed,409);
   forget(row.id);onRow(fortune);
   window.location.assign(checkoutPath(fortune,siteLocale));
  }catch(e){
   if(e instanceof FortuneApiError&&e.status===401){loginForCurrentPage();return;}
   setError(e instanceof FortuneApiError&&e.message?`${copy.failed} (${e.code})`:copy.failed);
  }finally{lock.current=false;setBusy(false);}
 }
 return <section className={styles.pick} aria-labelledby="tarot-pick-heading" lang={locale}>
  <header className={styles.ritualHeader}>
   <h2 id="tarot-pick-heading">{copy.pickHeading}</h2>
   <p>{spread.title} · {copy.cards(count)}</p>
   <p>{drawn?copy.sealed:ritual.intro}</p>
   <p className={styles.progress} role="status" aria-live="polite">{copy.pickProgress(drawn?count:picks.length,count)}{current?` · ${copy.pickNow(current.label)}`:picks.length===count||drawn?` · ${copy.pickDone}`:''}</p>
  </header>
  {!drawn&&<div className={styles.ritualGuide}><img src="/assets/yeongnyangi/profiles/welcome.webp" width={56} height={56} alt=""/><p>{ritual.guide}</p></div>}
  <div className={styles.readingTable}>
  <TarotSpreadLayout locale={locale} spread={spread} cards={cards} active={current?.id} list={false} numbering="draw"/>
  </div>
  {!drawn&&<>
   <div className={styles.shuffleBar}><p role="status">{shuffling?ritual.shuffling:current?current.question:copy.pickDone}</p><button type="button" onClick={shuffle} disabled={busy||!ready||shuffling||picks.length>0}>{ritual.shuffle}</button></div>
   <div className={styles.deck} data-shuffling={shuffling||undefined} aria-busy={shuffling} role="group" aria-label={copy.pickHeading}>{deckSlots.map(slot=>{
    const at=picks.indexOf(slot),picked=at>=0;
    return <button type="button" key={slot} aria-pressed={picked} disabled={busy||shuffling||!ready||picked||picks.length>=count}
     aria-label={picked?`${copy.pickCard(slot+1)} · ${copy.pickedAs(order[at].label)}`:copy.pickCard(slot+1)} onClick={()=>toggle(slot)}>
     <TarotCardArt locale={locale}/>{picked&&<span>{at+1}</span>}
    </button>;
   })}</div>
   <div className={styles.actions}>
    <button type="button" className={styles.primary} disabled={busy||picks.length!==count} onClick={()=>void commit({picks})}>{busy?copy.saving:copy.confirm}</button>
    <button type="button" disabled={busy||picks.length===0} onClick={()=>setPicks(list=>list.slice(0,-1))}>{copy.undo}</button>
    <button type="button" disabled={busy||shuffling||!ready||picks.length>0} onClick={()=>void commit({auto:true})}>{copy.auto}</button>
   </div>
   <p className={styles.hint}>{copy.autoHint}</p>
  </>}
  {drawn&&<div className={styles.actions}><a className={styles.primary} href={checkoutPath(row,siteLocale)}>{copy.toCheckout}</a></div>}
  <ol className={styles.positions}>{order.map((position,i)=><li key={position.id} data-active={current?.id===position.id||undefined}><b>{i+1}</b><div><strong>{position.label}</strong>{position.question&&<span>{position.question}</span>}</div></li>)}</ol>
  {error&&<p role="alert">{error}</p>}
 </section>;
}
