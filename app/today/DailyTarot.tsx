"use client";

import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {ArrowRight,Check,Sunrise} from 'lucide-react';
import Image from 'next/image';
import {fortuneTeaHouseAssets} from '@/src/features/fortune-tea-house/data/assets';

import {FreeQuestionNext} from '../components/QuestionJourney';
import {trackEvent} from '@/lib/analytics';
import {DAILY_MEANINGS,DAILY_POSITIONS,DAILY_TAROT_KEY,kstDay,newDailyReading,restoreDailyReading,pickDailyCard,revealDailyCard,sharedDailyCards} from '@/lib/tarot/daily-three.mjs';
import styles from './daily-tarot.module.css';
import PublicInsightCard from '@/components/fortune/PublicInsightCard';

function DailyCardBack(){return <Image src={fortuneTeaHouseAssets.premium.tarotCardBack} width={180} height={300} alt="" sizes="(max-width:600px) 18vw, 100px"/>;}

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
 const selected=reading?.picks.map(slot=>reading.deck[slot])||[];
 return <section id="daily-tarot" className={styles.experience} aria-labelledby="daily-tarot-title">
  <header className={styles.welcome}>
   <div className={styles.welcomeCopy}><h2 id="daily-tarot-title">오늘을 여는<br/><em>세 장의 마음</em></h2>
    <p>차가 우러나는 동안, 내 마음에도 잠깐 귀 기울여요. 연이와 함께 오늘의 작은 힌트를 찾아볼까요?</p>
    <p className={styles.note}>연이와 함께 · 무료 · 로그인 없이</p>
    {!reading&&<button className={styles.primary} disabled={!ready} onClick={start}>오늘의 세 장 펼치기 <ArrowRight size={18}/></button>}
   </div>
   <Image className={styles.heroArt} src="/images/today/yeoni-daily-tea.webp" width={1200} height={800} sizes="(max-width:600px) 100vw, 360px" alt="햇살이 드는 찻집에서 차와 세 장의 타로를 준비한 꽃돼지 연이" loading="lazy"/>
  </header>
  <div className={styles.tableIntro}><ol className={styles.positions} aria-label="세 장이 들려줄 이야기">{DAILY_POSITIONS.map((position,index)=><li key={position}><span>{index+1}</span>{position}</li>)}</ol><p className={styles.explanation}>운명의 찻집 카드로 마음과 흐름, 작은 실천을 읽어요. 사주·숙요·베다·수비학의 계산과는 별개인 타로의 상징 해석입니다.</p></div>
  {shared&&<div className={styles.shared}>
   <h3>친구가 나눈 세 장</h3>
   <p>개인정보나 질문 없이 카드의 상징만 나누었어요.</p>
   <ol>{shared.map((id,index)=><li key={id}><strong>{DAILY_POSITIONS[index]} · {cards[id].name}</strong><p>{DAILY_MEANINGS[id][index]}</p></li>)}</ol>
  </div>}
  {reading&&<>
   <div className={styles.dateRow}><span>{reading.date}의 카드</span><span>{reading.revealed===3?'세 장을 모두 읽었어요':reading.picks.length+' / 3장 선택'}</span></div>
   {reading.date!==today&&<div className={styles.newDay}><Sunrise size={22}/><p>새로운 하루가 왔어요. 지난 카드를 마저 읽거나 오늘의 세 장을 새로 시작해 보세요.</p><button onClick={start}>오늘 카드 새로 펼치기</button></div>}
   {reading.picks.length<3&&<>
    <h3 ref={pickHeading} tabIndex={-1} className={styles.pickTitle}>마음이 머무는 카드, 세 장을 골라요</h3>
    <div className={styles.deck} role="group" aria-label="오늘의 카드 22장 중 세 장 선택">
     {reading.deck.map((_,slot)=><button key={slot} type="button" aria-label={slot+1+'번째 카드'+(reading.picks.includes(slot)?' 선택됨':' 고르기')} aria-pressed={reading.picks.includes(slot)} disabled={reading.picks.includes(slot)} onClick={()=>pick(slot)} className={styles.cardBack} style={{'--tilt':((slot%6)-2.5)*3+'deg'} as CSSProperties}>
      <DailyCardBack/>{reading.picks.includes(slot)&&<span className={styles.chosen}><Check size={22}/></span>}
     </button>)}
    </div>
    <p className={styles.note} role="status">{reading.picks.length}장을 골랐어요. {3-reading.picks.length}장을 더 골라주세요.</p>
   </>}
   {reading.picks.length===3&&<div ref={result} tabIndex={-1} className={styles.reading}>
    <div className={styles.spread}>{selected.map((id,index)=><div key={id} className={styles.slot}>
     <span>{DAILY_POSITIONS[index]}</span>
     <div className={styles.flip} data-revealed={index<reading.revealed}>
      <div className={styles.back}><DailyCardBack/></div>
      <div className={styles.face}>{index<reading.revealed&&<Image src={cards[id].image} width={180} height={300} sizes="(max-width:600px) 26vw, 180px" alt={cards[id].name+' 타로 카드'}/>}</div>
     </div>
     <strong>{index<reading.revealed?cards[id].name:'아직 펼치지 않은 이야기'}</strong>
    </div>)}</div>
    {reading.revealed<3&&<button className={styles.primary} onClick={reveal}>{DAILY_POSITIONS[reading.revealed]} 열기 <ArrowRight size={18}/></button>}
    <div className={styles.interpretation} aria-live="polite">
     {selected.slice(0,reading.revealed).map((id,index)=><article key={id}><span className={styles.readingNumber}>{index+1}</span><div><h3><span>{DAILY_POSITIONS[index]}</span>{cards[id].name}</h3><p>{DAILY_MEANINGS[id][index]}</p></div></article>)}
    </div>
   </div>}
   {reading.revealed===3&&<footer className={styles.ending}>
    <p className={styles.lastWord}>“세 장의 답을 전부 해내려 하지 않아도 돼요.<br/>오늘 마음에 남은 한 가지면 충분해요.”</p>
    <p className={styles.note}>— 꽃돼지 연이</p>
    <PublicInsightCard brand="daily" source="daily" day={reading.date} choices={selected.map((id,index)=>({id:String(id),label:DAILY_POSITIONS[index]+' · '+cards[id].name,text:DAILY_MEANINGS[id][index]}))}/>
    <p className={styles.note}>오늘은 이 카드를 다시 읽을 수 있어요. 내일은 새로운 세 장이 기다려요.</p>
    <FreeQuestionNext category="tarot" source="daily_tarot_result"/>
   </footer>}
  </>}
  {!storageOk&&<p role="status" className={styles.note}>이 브라우저에서 저장할 수 없어 이번 방문 동안만 결과를 볼 수 있어요.</p>}
  {notice&&<p role="status" className={styles.note}>{notice}</p>}
 </section>;
}
