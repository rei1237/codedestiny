"use client";

import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {ArrowRight,Check,Share2,Sunrise} from 'lucide-react';
import TarotCardBack from '../components/TarotCardBack';
import {PriceBadge} from '../components/PriceBadge';
import {trackEvent} from '@/lib/analytics';
import {DAILY_MEANINGS,DAILY_POSITIONS,DAILY_TAROT_KEY,kstDay,newDailyReading,restoreDailyReading,pickDailyCard,revealDailyCard,dailySharePath,sharedDailyCards} from '@/lib/tarot/daily-three.mjs';
import styles from './daily-tarot.module.css';

export interface DailyTarotCard {id:number;name:string;image:string}
interface Reading {version:number;date:string;deck:number[];picks:number[];revealed:number}
export default function DailyTarot({cards}:{cards:DailyTarotCard[]}) {
 const [reading,setReading]=useState<Reading|null>(null);
 const [today,setToday]=useState(''),[ready,setReady]=useState(false),[storageOk,setStorageOk]=useState(true);
 const [shared,setShared]=useState<number[]|null>(null),[notice,setNotice]=useState('');
 const initialized=useRef(false),result=useRef<HTMLDivElement>(null),pickHeading=useRef<HTMLHeadingElement>(null);
 const emit=(name:string,params:Record<string,unknown>={})=>trackEvent(name,{service:'yeoni_daily',...params});
 useEffect(()=>{
  if(initialized.current)return;initialized.current=true;
  const date=kstDay();setToday(date);
  const params=new URLSearchParams(window.location.search);
  const incoming=sharedDailyCards(params.get('daily_cards'));
  setShared(incoming);
  if(incoming)emit('daily_tarot_share_receive');
  try{
   const saved=restoreDailyReading(localStorage.getItem(DAILY_TAROT_KEY));
   if(saved){
    setReading(saved);
    if(saved.date===date)emit('daily_tarot_reopen',{complete:saved.revealed===3});
    else if(saved.date<date)emit('daily_tarot_return',{days_since:Math.round((Date.parse(date)-Date.parse(saved.date))/86400000)});
   }
  }catch{setStorageOk(false);}
  setReady(true);
 },[]);
 useEffect(()=>{
  const update=()=>setToday(kstDay());
  const timer=window.setInterval(update,60000);
  window.addEventListener('focus',update);document.addEventListener('visibilitychange',update);
  return()=>{window.clearInterval(timer);window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',update);};
 },[]);
 function save(next:Reading){
  setReading(next);
  try{localStorage.setItem(DAILY_TAROT_KEY,JSON.stringify(next));}catch{setStorageOk(false);}
 }
 function start(){
  const date=kstDay();setToday(date);save(newDailyReading(date));setShared(null);setNotice('');
  emit('daily_tarot_start');
  window.requestAnimationFrame(()=>pickHeading.current?.focus());
 }
 function pick(slot:number){
  if(!reading)return;
  const next=pickDailyCard(reading,slot);
  if(next===reading)return;
  save(next);
  if(next.picks.length===3)window.requestAnimationFrame(()=>result.current?.focus());
 }
 function reveal(){
  if(!reading)return;const next=revealDailyCard(reading);save(next);
  if(next.revealed===3)emit('daily_tarot_complete');
 }
 async function share(){
  if(!reading||reading.revealed!==3)return;
  const url=new URL(dailySharePath(reading),window.location.origin).href;
  emit('daily_tarot_share_attempt');
  try{
   if(navigator.share){await navigator.share({title:'연이와 오늘을 여는 세 장',text:'내가 고른 세 장의 상징을 함께 봐요. 당신의 오늘은 어떤 모습인가요?',url});setNotice('공유 동작을 마쳤어요.');emit('daily_tarot_share_return',{method:'native'});}
   else{await navigator.clipboard.writeText(url);setNotice('공유 링크를 복사했어요.');emit('daily_tarot_link_copied');}
  }catch(error){if(error instanceof Error&&error.name==='AbortError')setNotice('공유를 취소했어요.');else setNotice('공유하지 못했어요. 잠시 후 다시 시도해 주세요.');}
 }
 const selected=reading?.picks.map(slot=>reading.deck[slot])||[];
 return <section id="daily-tarot" className={styles.experience} aria-labelledby="daily-tarot-title">
  <header className={styles.welcome}>
   <div><h2 id="daily-tarot-title">오늘을 여는<br/><em>세 장의 마음</em></h2>
    <p>서두르지 않아도 괜찮아요.<br/>마음이 머무는 카드 세 장을 골라볼까요?</p>
    <p className={styles.note}>연이와 함께 · 무료 · 로그인 없이</p>
   </div>
   <img src="/icons/app-logo-512.webp" width={170} height={170} alt="연꽃을 단 꽃돼지 연이가 오늘의 카드를 안내해요" loading="lazy"/>
  </header>
  <p className={styles.explanation}>사주·숙요·베다·수비학의 계산과는 별개로, 타로의 상징을 통해 오늘의 마음과 작은 실천을 살펴보는 시간이에요.</p>
  {shared&&<div className={styles.shared}>
   <h3>친구가 나눈 세 장</h3>
   <p>개인정보나 질문 없이 카드의 상징만 나누었어요.</p>
   <ol>{shared.map((id,index)=><li key={id}><strong>{DAILY_POSITIONS[index]} · {cards[id].name}</strong><p>{DAILY_MEANINGS[id][index]}</p></li>)}</ol>
  </div>}
  {!reading&&<button className={styles.primary} disabled={!ready} onClick={start}>오늘의 세 장 펼치기 <ArrowRight size={18}/></button>}
  {reading&&<>
   <div className={styles.dateRow}><span>{reading.date}의 카드</span><span>{reading.revealed===3?'세 장을 모두 읽었어요':reading.picks.length+' / 3장 선택'}</span></div>
   {reading.date!==today&&<div className={styles.newDay}><Sunrise size={22}/><p>새로운 하루가 왔어요. 지난 카드를 마저 읽거나 오늘의 세 장을 새로 시작해 보세요.</p><button onClick={start}>오늘 카드 새로 펼치기</button></div>}
   {reading.picks.length<3&&<>
    <h3 ref={pickHeading} tabIndex={-1} className={styles.pickTitle}>마음이 머무는 곳을 골라주세요</h3>
    <div className={styles.deck} role="group" aria-label="오늘의 카드 22장 중 세 장 선택">
     {reading.deck.map((_,slot)=><button key={slot} type="button" aria-label={slot+1+'번째 카드'+(reading.picks.includes(slot)?' 선택됨':' 고르기')} aria-pressed={reading.picks.includes(slot)} disabled={reading.picks.includes(slot)} onClick={()=>pick(slot)} className={styles.cardBack} style={{'--tilt':((slot%6)-2.5)*3+'deg'} as CSSProperties}>
      <TarotCardBack/>{reading.picks.includes(slot)&&<span className={styles.chosen}><Check size={22}/></span>}
     </button>)}
    </div>
    <p className={styles.note} role="status">{reading.picks.length}장을 골랐어요. {3-reading.picks.length}장을 더 골라주세요.</p>
   </>}
   {reading.picks.length===3&&<div ref={result} tabIndex={-1} className={styles.reading}>
    <div className={styles.spread}>{selected.map((id,index)=><div key={id} className={styles.slot}>
     <span>{DAILY_POSITIONS[index]}</span>
     <div className={styles.flip} data-revealed={index<reading.revealed}>
      <div className={styles.back}><TarotCardBack/></div>
      <div className={styles.face}>{index<reading.revealed&&<img src={cards[id].image} width={180} height={300} alt={cards[id].name+' 타로 카드'}/>}</div>
     </div>
     <strong>{index<reading.revealed?cards[id].name:'아직 펼치지 않은 이야기'}</strong>
    </div>)}</div>
    {reading.revealed<3&&<button className={styles.primary} onClick={reveal}>{DAILY_POSITIONS[reading.revealed]} 열기 <ArrowRight size={18}/></button>}
    <div className={styles.interpretation} aria-live="polite">
     {selected.slice(0,reading.revealed).map((id,index)=><article key={id}><h3>{DAILY_POSITIONS[index]} · {cards[id].name}</h3><p>{DAILY_MEANINGS[id][index]}</p></article>)}
    </div>
   </div>}
   {reading.revealed===3&&<footer className={styles.ending}>
    <p className={styles.lastWord}>“세 장의 답을 전부 해내려 하지 않아도 돼요.<br/>오늘 마음에 남은 한 가지면 충분해요.”</p>
    <p className={styles.note}>— 꽃돼지 연이</p>
    <button className={styles.secondary} onClick={()=>void share()}><Share2 size={18}/> 세 장의 마음 공유하기</button>
    <p className={styles.note}>오늘은 이 카드를 다시 읽을 수 있어요. 내일은 새로운 세 장이 기다려요.</p>
    <aside className={styles.deeper}><h3>내 마음의 반복되는 패턴이 궁금하다면</h3><p>영냥이의 사주 해석에서 기질과 생활 속 선택을 더 살펴보세요.</p>
     <a href="/yeongnyangi/fortune/?product=saju_mackerel" onClick={()=>emit('daily_tarot_consultation_click',{item_id:'yeongnyangi-saju-mackerel'})}>영냥이 사주 살펴보기 <PriceBadge featureKey="yeongnyangi-saju-mackerel"/><ArrowRight size={18}/></a>
    </aside>
   </footer>}
  </>}
  {!storageOk&&<p role="status" className={styles.note}>이 브라우저에서 저장할 수 없어 이번 방문 동안만 결과를 볼 수 있어요.</p>}
  {notice&&<p role="status" className={styles.note}>{notice}</p>}
 </section>;
}
