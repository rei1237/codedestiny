'use client';
import {useEffect,useState} from 'react';
import {ArrowRight,Moon,Sparkles} from 'lucide-react';
import {dailyTarotSpread,kstDateKey} from '@/lib/tarot/yeongnyangi-daily-card';
import TarotCardArt from './TarotCardArt';

const DEVICE_KEY='cd:yn:daily-tarot-device:v1';
const positions=['오늘의 흐름','살필 마음','작은 실천'];
function deviceId(){
 try{const found=localStorage.getItem(DEVICE_KEY);if(found)return found;const bytes=new Uint32Array(4);crypto.getRandomValues(bytes);const created=[...bytes].map(value=>value.toString(16).padStart(8,'0')).join('');localStorage.setItem(DEVICE_KEY,created);return created;}catch{return '';}
}
export default function DailyTarotCard(){
 const [opened,setOpened]=useState<number[]>([]),[reading,setReading]=useState<ReturnType<typeof dailyTarotSpread>|null>(null);
 useEffect(()=>{
  const device=deviceId();let day='';
  const refresh=()=>{const next=kstDateKey();if(next===day)return;day=next;setReading(dailyTarotSpread(day,device));setOpened([]);};
  refresh();const timer=setInterval(refresh,15000);return()=>clearInterval(timer);
 },[]);
 return <section id="daily-tarot" tabIndex={-1} className="daily-tarot" aria-labelledby="daily-tarot-title">
  <div className="daily-tarot-copy"><Moon size={20}/><h2 id="daily-tarot-title">오늘의 무료 타로, 세 장의 작은 힌트</h2><p>마음에 닿는 카드부터 톡, 뒤집어봐. 오늘의 흐름과 마음, 해볼 일을 같이 살펴줄게.<br/>같은 기기에서는 한국 시간으로 하루 동안 같은 세 장이 머물러. 카드는 미래를 확정하지 않는 상징 이야기야.</p></div>
  <div className="daily-tarot-spread" role="group" aria-label="오늘의 타로 세 장">
   {positions.map((position,index)=>{const card=reading?.[index],open=opened.includes(index);return <button key={position} type="button" className={`daily-tarot-flip${open?' is-open':''}`} disabled={!card} aria-expanded={open} aria-controls={`daily-tarot-reading-${index}`} aria-label={open&&card?`${position}: ${card.cardName} ${card.orientationLabel}`:`${position} 카드 뒤집기`} onClick={()=>setOpened(current=>current.includes(index)?current:[...current,index])}>
    <span className="daily-tarot-position">{position}</span>
    <span className="daily-tarot-card"><span className="daily-tarot-back"><TarotCardArt/></span><span className="daily-tarot-front">{card&&<TarotCardArt cardCode={card.cardCode} className={card.orientation==='reversed'?'daily-tarot-reversed':undefined}/>}</span></span>
    <strong>{open&&card?card.cardName:'톡, 펼쳐봐'}</strong><small>{open&&card?card.orientationLabel:card?'네가 끌리는 순서대로':'고르는 중…'}</small>
   </button>;})}
  </div>
  <p className="daily-tarot-progress" role="status">{opened.length===3?'세 장 모두 펼쳤네. 오늘 너에게 필요한 힌트를 골라봐.':`${opened.length} / 3장 펼쳤어. 서두르지 않아도 돼.`}</p>
  <div className="daily-tarot-readings">
   {positions.map((position,index)=>{const card=reading?.[index];return <article id={`daily-tarot-reading-${index}`} key={position} className="daily-tarot-reading" hidden={!opened.includes(index)||!card}>
    {card&&<><h3>{position} · {card.cardName}</h3><p className="daily-tarot-comment">{index===0?'오늘은 이런 장면에 눈길을 줘봐.':index===1?'마음이 보내는 신호도 놓치지 말자.':'큰 결심 말고, 작은 한 걸음이면 돼.'}</p><p>{card.reading}</p><dl><div><dt>카드의 조언</dt><dd>{card.advice}</dd></div></dl></>}
   </article>;})}
  </div>
  {opened.length===3&&reading&&<div className="daily-tarot-luck"><Sparkles size={17}/><span>오늘 해볼 작은 일</span><b>{reading[2].luck.mission}</b><p>세 장 중 마음에 남은 조언 하나만 챙겨가도 충분해.</p></div>}
  <nav className="daily-tarot-next" aria-label="오늘의 카드 다음 단계"><a href="#daily">멸치로 다른 무료 운세 보기<ArrowRight size={16}/></a><a href="/yeongnyangi/fortune/">내 질문으로 상담 살펴보기<ArrowRight size={16}/></a></nav>
 </section>;
}
