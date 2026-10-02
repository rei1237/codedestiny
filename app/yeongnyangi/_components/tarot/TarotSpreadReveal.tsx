'use client';
import {useEffect,useState} from 'react';
import NextImage from 'next/image';
import type {ReadingChart} from '@/worker/yeongnyangi/fortune/reading-presentation';
import {yeongnyangiCardArt} from '@/lib/tarot/yeongnyangi-deck';
import {tarotPeriods} from '@/worker/yeongnyangi/fortune/tarot/spread-v3';
import type {PublicTarotSpread} from '../../_lib/api';
import {tarotRitualCopy} from '../../_lib/tarot-ritual-copy';
import {tarotSpreadCopy as copy} from '../../_lib/tarot-spread-copy';
import {storedRitual,saveRitual} from '../TarotDrawRitual';
import TarotSpreadLayout,{type SlotCard} from './TarotSpreadLayout';
import styles from '../../yeongnyangi.module.css';
import spreadStyles from './tarot-spread.module.css';

/** Saved cards of one v3 spread keyed by position id; undefined when the chart cannot place every position. */
export function spreadCards(spread:PublicTarotSpread,chart?:ReadingChart):Record<string,{cardCode:string;reversed:boolean}>|undefined{
 const cards=Object.fromEntries((chart?.groups||[]).filter(group=>group.positionKey&&group.cardCode).map(group=>[group.positionKey!,{cardCode:group.cardCode!,reversed:Boolean(group.reversed)}]));
 return spread.positions.every(position=>cards[position.id])?cards:undefined;
}

type Stage='focus'|'reveal'|'reading';
/** After payment the cards picked before checkout are turned over in reading order on the spread's own layout. */
export default function TarotSpreadReveal({requestId,spread,cards,onComplete}:{requestId:string;spread:PublicTarotSpread;cards:Record<string,{cardCode:string;reversed:boolean}>;onComplete:()=>void}){
 const ritual=tarotRitualCopy('ko');
 const order=[...spread.positions].sort((a,b)=>a.readOrder-b.readOrder);
 const [ready,setReady]=useState(false),[stage,setStage]=useState<Stage>('focus'),[revealed,setRevealed]=useState(0),[breath,setBreath]=useState(3);
 useEffect(()=>{
  const value=storedRitual(requestId);
  if(value?.completed){onComplete();return;}
  if(value&&value.stage!=='focus'){setStage(value.stage==='reading'?'reading':'reveal');setRevealed(Math.min(value.revealed,order.length));}
  setReady(true);
 },[requestId,order.length,onComplete]);
 useEffect(()=>{
  if(stage!=='focus'||breath<=0)return;
  const timer=setTimeout(()=>setBreath(value=>value-1),1000);
  return()=>clearTimeout(timer);
 },[stage,breath]);
 useEffect(()=>{
  if(stage!=='reading')return;
  const timer=setTimeout(()=>{saveRitual(requestId,{stage:'reading',selected:[],revealed,completed:true});onComplete();},1200);
  return()=>clearTimeout(timer);
 },[stage,requestId,revealed,onComplete]);
 if(!ready)return <div className={styles.tarotRitualShell} role="status">{ritual.restore}</div>;
 const go=(next:Stage,count=revealed)=>{saveRitual(requestId,{stage:next,selected:[],revealed:count});setStage(next);setRevealed(count);};
 const shown:Record<string,SlotCard>=Object.fromEntries(order.map((position,i)=>[position.id,i<revealed?{...cards[position.id],open:true}:{open:false}]));
 const next=order[revealed],last=order[revealed-1];
 const live=last?`${last.label} · ${yeongnyangiCardArt(cards[last.id].cardCode,'ko').name} · ${cards[last.id].reversed?copy.reversed:copy.upright}`:'';
 return <section className={styles.tarotRitualShell} aria-label={ritual.section} data-stage={stage} lang="ko">
  {stage==='focus'&&<div className={styles.ritualFocus}>
   <div className={styles.breathRing} role="img" aria-label={ritual.breath}><span>{breath||'·'}</span></div>
   <h2>{ritual.focusTitle}</h2><p>{spread.title} · {copy.cards(spread.cardCount)}</p>
   <button type="button" disabled={breath>0} onClick={()=>go('reveal')}>{ritual.ready}</button>
  </div>}
  {stage==='reveal'&&<div className={`${spreadStyles.pick} ${spreadStyles.reveal}`}>
   <header className={styles.ritualHeader}><h2>{copy.revealHeading}</h2><p>{copy.revealIntro}</p><strong role="status">{copy.pickProgress(revealed,order.length)}</strong></header>
   <p className={styles.srOnly} aria-live="polite">{live}</p>
   <TarotSpreadLayout spread={spread} cards={shown} active={next?.id} size="full"/>
   <div className={spreadStyles.actions}>{next
    ?<button type="button" className={spreadStyles.primary} onClick={()=>go('reveal',revealed+1)}>{copy.revealNext(revealed+1,next.label)}</button>
    :<button type="button" className={spreadStyles.primary} onClick={()=>go('reading')}>{ritual.continue}</button>}</div>
   {!next&&<p className={spreadStyles.hint}>{copy.revealDone}</p>}
  </div>}
  {stage==='reading'&&<div className={styles.ritualReading} role="status"><NextImage src="/assets/yeongnyangi/hero.webp" alt="" width={180} height={180}/><h2>{ritual.readingTitle}</h2><p>{ritual.readingBody}</p></div>}
 </section>;
}

/** The stored spread on the finished reading: map, reading order and each card, plus the period and A/B labels the buyer gave. */
export function TarotSpreadResult({spread,cards}:{spread:PublicTarotSpread;cards:Record<string,{cardCode:string;reversed:boolean}>}){
 const open=Object.fromEntries(Object.entries(cards).map(([id,card])=>[id,{...card,open:true}]));
 const period=spread.inputs?.period?tarotPeriods[spread.inputs.period]:'';
 return <section className={spreadStyles.spread} aria-labelledby="tarot-spread-result" lang="ko" data-tarot-spread-result>
  <h2 id="tarot-spread-result">{copy.resultHeading}</h2>
  <p><strong>{spread.title}</strong> · {copy.cards(spread.cardCount)}</p>
  <p className={spreadStyles.hint}>{spread.summary}</p>
  {period&&<p>{copy.periodLine(period)}</p>}
  {spread.inputs?.options&&<p>{copy.optionsLine(spread.inputs.options.a,spread.inputs.options.b)}</p>}
  <TarotSpreadLayout spread={spread} cards={open} size="full"/>
 </section>;
}
