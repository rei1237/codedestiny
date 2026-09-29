'use client';
import {relationshipCopy} from '../_lib/relationship-copy';
import {useEffect,useMemo,useState,type CSSProperties} from 'react';
import NextImage from 'next/image';
import {Volume2,VolumeX} from 'lucide-react';
import type {ReadingChart} from '@/worker/yeongnyangi/fortune/reading-presentation';
import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import {yeongnyangiCardArt} from '@/lib/tarot/yeongnyangi-deck';
import {tarotRitualCopy} from '../_lib/tarot-ritual-copy';
import TarotCardArt from './TarotCardArt';
import styles from '../yeongnyangi.module.css';
import relationshipStyles from './relationship.module.css';

type Stage='focus'|'shuffle'|'choose'|'reveal'|'reading';
type Stored={stage:Stage;selected:number[];revealed:number;completed?:boolean};
const stages:Stage[]=['focus','shuffle','choose','reveal','reading'];
const key=(id:string)=>`cd:yn:tarot-ritual:v1:${id}`;
function stored(id:string):Stored|null{
 try{const value=JSON.parse(localStorage.getItem(key(id))||'null');return value&&stages.includes(value.stage)&&Array.isArray(value.selected)&&Number.isInteger(value.revealed)?value:null;}catch{return null;}
}
export function tarotRitualCompleted(id:string){return stored(id)?.completed===true;}
function save(id:string,value:Stored){try{localStorage.setItem(key(id),JSON.stringify(value));}catch{/* The saved cards stay on the server; storage only remembers presentation progress. */}}
function chime(){
 try{
  const AudioCtor=window.AudioContext||(window as typeof window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
  if(!AudioCtor)return;
  const context=new AudioCtor(),osc=context.createOscillator(),gain=context.createGain();
  osc.type='sine';osc.frequency.setValueAtTime(520,context.currentTime);osc.frequency.exponentialRampToValueAtTime(780,context.currentTime+.18);
  gain.gain.setValueAtTime(.0001,context.currentTime);gain.gain.exponentialRampToValueAtTime(.11,context.currentTime+.02);gain.gain.exponentialRampToValueAtTime(.0001,context.currentTime+.32);
  osc.connect(gain);gain.connect(context.destination);osc.start();osc.stop(context.currentTime+.34);osc.onended=()=>void context.close();
 }catch{/* Sound is optional and remains off by default. */}
}

export default function TarotDrawRitual({requestId,chart,locale,onComplete}:{requestId:string;chart:ReadingChart;locale?:ReadingLocale;onComplete:()=>void}){
 const copy=tarotRitualCopy(locale),cards=chart.groups.filter(group=>group.kind!=='timing'&&group.cardCode);
 const [ready,setReady]=useState(false),[stage,setStage]=useState<Stage>('focus'),[selected,setSelected]=useState<number[]>([]),[revealed,setRevealed]=useState(0),[breath,setBreath]=useState(3),[sound,setSound]=useState(false),[particles,setParticles]=useState(12);
 const groupTitle=selected.length===0?relationshipCopy.drawSelf:selected.length===1?relationshipCopy.drawPartner:relationshipCopy.drawTogether;
 const revealTitle=revealed===0?relationshipCopy.drawSelf:revealed===1?relationshipCopy.drawPartner:relationshipCopy.drawTogether;
 const pool=useMemo(()=>Array.from({length:cards.length+4},(_,index)=>index),[cards.length]);
 useEffect(()=>{
  const value=stored(requestId);
  if(value?.completed){onComplete();return;}
  if(value){setStage(value.stage);setSelected(value.selected.filter(n=>pool.includes(n)).slice(0,cards.length));setRevealed(Math.min(value.revealed,cards.length));}
  const nav=navigator as Navigator&{deviceMemory?:number};
  if((nav.deviceMemory&&nav.deviceMemory<=4)||(nav.hardwareConcurrency&&nav.hardwareConcurrency<=4))setParticles(5);
  setReady(true);
 },[requestId,cards.length,pool,onComplete]);
 useEffect(()=>{if(ready)save(requestId,{stage,selected,revealed});},[ready,requestId,stage,selected,revealed]);
 useEffect(()=>{
  if(stage!=='focus'||breath<=0)return;
  const timer=setTimeout(()=>setBreath(value=>value-1),1000);
  return()=>clearTimeout(timer);
 },[stage,breath]);
 useEffect(()=>{
  if(stage!=='reveal')return;
  for(const card of cards){const art=yeongnyangiCardArt(card.cardCode,locale);for(const src of [art.avifSrc,art.src].filter(Boolean)){const image=new Image();image.src=src as string;}}
 },[stage,cards,locale]);
 useEffect(()=>{
  if(stage!=='reading')return;
  const timer=setTimeout(()=>{save(requestId,{stage:'reading',selected,revealed,completed:true});onComplete();},1200);
  return()=>clearTimeout(timer);
 },[stage,requestId,selected,revealed,onComplete]);
 if(!ready)return <div className={styles.tarotRitualShell} role="status">{copy.restore}</div>;
 const advance=(next:Stage)=>{save(requestId,{stage:next,selected,revealed});setStage(next);};
 const choose=(index:number)=>setSelected(current=>{const next=current.includes(index)?current.filter(value=>value!==index):current.length<cards.length?[...current,index]:current;save(requestId,{stage:'choose',selected:next,revealed});return next;});
 const reveal=(index:number)=>{if(index!==revealed)return;if(sound)chime();const next=revealed+1;save(requestId,{stage:'reveal',selected,revealed:next});setRevealed(next);};
 const live=revealed?`${yeongnyangiCardArt(cards[revealed-1]?.cardCode,locale).name} · ${cards[revealed-1]?.reversed?copy.reversed:copy.upright}`:'';
 return <section className={styles.tarotRitualShell} aria-label={copy.section} data-stage={stage}>
  <div className={styles.ritualStars} aria-hidden="true">{Array.from({length:particles},(_,index)=><span key={index}/>)}</div>
  <button type="button" className={styles.ritualSound} aria-label={copy.soundToggle} aria-pressed={sound} onClick={()=>setSound(value=>!value)}>{sound?<Volume2 size={17}/>:<VolumeX size={17}/>}<span>{sound?copy.soundOn:copy.soundOff}</span></button>
  {stage==='focus'&&<div className={styles.ritualFocus}>
   <div className={styles.breathRing} role="img" aria-label={copy.breath}><span>{breath||'·'}</span></div>
   <h2>{copy.focusTitle}</h2><p>{copy.focusBody}</p><button type="button" disabled={breath>0} onClick={()=>advance('shuffle')}>{copy.ready}</button>
  </div>}
  {stage==='shuffle'&&<div className={styles.ritualFocus}>
   <div className={styles.shuffleDeck} aria-hidden="true">{Array.from({length:5},(_,index)=><TarotCardArt key={index}/>)}</div>
   <h2>{copy.shuffleTitle}</h2><p>{copy.shuffleBody}</p><button type="button" onClick={()=>advance('choose')}>{copy.stopShuffle}</button>
  </div>}
  {stage==='choose'&&<div>
   <header className={styles.ritualHeader}><h2 aria-live="polite">{chart.relationship?groupTitle:copy.chooseTitle}</h2><p>{chart.relationship?relationshipCopy.symbolism:copy.chooseBody}</p><strong role="status">{copy.chooseProgress(selected.length,cards.length)}</strong></header>
   <div className={chart.relationship?relationshipStyles.cardChoices:styles.cardFan} role="group" aria-label={copy.chooseTitle}>{pool.map((index)=><button type="button" key={index} aria-pressed={selected.includes(index)} aria-label={`${copy.cardBack(index+1)}${selected.includes(index)?` · ${copy.selected}`:''}`} onClick={()=>choose(index)} style={{'--fan-offset':index-(pool.length-1)/2} as CSSProperties}><TarotCardArt/><span>{selected.includes(index)?selected.indexOf(index)+1:''}</span></button>)}</div>
   <button type="button" className={styles.ritualPrimary} disabled={selected.length!==cards.length} onClick={()=>advance('reveal')}>{copy.confirm}</button>
  </div>}
  {stage==='reveal'&&<div>
   <header className={styles.ritualHeader}><h2 aria-live="polite">{chart.relationship?revealTitle:copy.revealTitle}</h2><p>{chart.relationship?relationshipCopy.symbolism:copy.revealBody}</p></header>
   <p className={styles.srOnly} aria-live="polite">{live}</p>
   <div className={styles.ritualSpread} role="group" aria-label={copy.revealTitle}>{cards.map((card,index)=>{
    const open=index<revealed,next=index===revealed,art=yeongnyangiCardArt(card.cardCode,locale),major=card.cardCode?.startsWith('M');
    return <button type="button" key={card.id} className={major?styles.majorCard:undefined} data-open={open} disabled={!next} aria-label={open?`${art.name} · ${card.reversed?copy.reversed:copy.upright}`:copy.revealCard(index+1)} onClick={()=>reveal(index)}>
     <span className={styles.flipCard}><span className={styles.flipBack}><TarotCardArt/></span><span className={styles.flipFront}><TarotCardArt cardCode={card.cardCode} locale={locale} className={card.reversed?styles.ritualReversed:undefined}/></span></span>
     <strong>{open?art.name:card.label}</strong><small>{open?(card.reversed?copy.reversed:copy.upright):next?copy.revealCard(index+1):''}</small>{major&&open&&<i>{copy.major}</i>}
    </button>;
   })}</div>
   {revealed===cards.length&&<button type="button" className={styles.ritualPrimary} onClick={()=>advance('reading')}>{copy.continue}</button>}
  </div>}
  {stage==='reading'&&<div className={styles.ritualReading} role="status"><NextImage src="/assets/yeongnyangi/hero.webp" alt="" width={180} height={180}/><h2>{copy.readingTitle}</h2><p>{copy.readingBody}</p></div>}
 </section>;
}
