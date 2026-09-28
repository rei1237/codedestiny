'use client';
import {useEffect,useState} from 'react';
import {ArrowRight,Moon,Sparkles} from 'lucide-react';
import {dailyTarotReading,kstDateKey} from '@/lib/tarot/yeongnyangi-daily-card';
import TarotCardArt from './TarotCardArt';

const DEVICE_KEY='cd:yn:daily-tarot-device:v1';
function deviceId(){
 try{const found=localStorage.getItem(DEVICE_KEY);if(found)return found;const bytes=new Uint32Array(4);crypto.getRandomValues(bytes);const created=[...bytes].map(value=>value.toString(16).padStart(8,'0')).join('');localStorage.setItem(DEVICE_KEY,created);return created;}catch{return '';}
}
export default function DailyTarotCard(){
 const [opened,setOpened]=useState(false),[reading,setReading]=useState<ReturnType<typeof dailyTarotReading>|null>(null);
 useEffect(()=>setReading(dailyTarotReading(kstDateKey(),deviceId())),[]);
 return <section className="daily-tarot" aria-labelledby="daily-tarot-title">
  <div className="daily-tarot-copy"><Moon size={17}/><h2 id="daily-tarot-title">오늘, 한 장의 달빛</h2><p>하루에 한 번 같은 카드가 머물러요. 카드는 답을 정하는 대신, 오늘 살펴볼 선택을 비춰 줍니다.</p></div>
  <button type="button" className={`daily-tarot-flip${opened?' is-open':''}`} disabled={!reading} aria-expanded={opened} aria-label={opened&&reading?`${reading.cardName} ${reading.orientationLabel}`:'오늘의 카드 뒤집기'} onClick={()=>setOpened(true)}>
   <span className="daily-tarot-card"><span className="daily-tarot-back"><TarotCardArt/></span><span className="daily-tarot-front">{reading&&<TarotCardArt cardCode={reading.cardCode} className={reading.orientation==='reversed'?'daily-tarot-reversed':undefined}/>}</span></span>
   <strong>{opened&&reading?`${reading.cardName} · ${reading.orientationLabel}`:reading?'카드를 뒤집어 볼까?':'오늘의 카드를 고르고 있어요.'}</strong>
  </button>
  {opened&&reading&&<article className="daily-tarot-reading">
   <p className="daily-tarot-comment">“{reading.message}”</p>
   <dl><div><dt>오늘의 기운</dt><dd>{reading.dayPillar} · {reading.tag} → {reading.luck.color}</dd></div><div><dt>카드 풀이</dt><dd>{reading.reading}</dd></div><div><dt>현실 조언</dt><dd>{reading.advice}</dd></div></dl>
   <div className="daily-tarot-luck"><Sparkles size={17}/><span>행운 포인트</span><b>{reading.luck.color} · {reading.luck.number} · {reading.luck.direction} · {reading.luck.item}</b><p>{reading.luck.mission}</p></div>
   <nav aria-label="오늘의 카드 다음 단계"><a href="#daily">내 사주로 더 보기<ArrowRight size={16}/></a><a href="/yeongnyangi/fortune/">3장 상담 살펴보기<ArrowRight size={16}/></a></nav>
  </article>}
 </section>;
}
