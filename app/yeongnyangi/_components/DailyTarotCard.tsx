'use client';
import {useEffect,useState} from 'react';
import Image from 'next/image';
import {ArrowRight,Moon,Sparkles} from 'lucide-react';
import {dailyTarotSpread,kstDateKey} from '@/lib/tarot/yeongnyangi-daily-card';
import {offsetTarotDate,synthesizeDailyTarot} from '@/lib/tarot/yeongnyangi-daily-synthesis';
import TarotCardArt from './TarotCardArt';
import {fortuneApi,loginForCurrentPage} from '../_lib/api';
import type {AttendanceState} from '@/worker/yeongnyangi/fortune/free/categories';
import styles from './daily-tarot-story.module.css';

const DEVICE_KEY='cd:yn:daily-tarot-device:v1';
const positions=['하루의 흐름','살필 마음','운을 여는 행동'];
function deviceId(){
 try{const found=localStorage.getItem(DEVICE_KEY);if(found)return found;const bytes=new Uint32Array(4);crypto.getRandomValues(bytes);const created=[...bytes].map(value=>value.toString(16).padStart(8,'0')).join('');localStorage.setItem(DEVICE_KEY,created);return created;}catch{return '';}
}
export default function DailyTarotCard(){
 const [dayOffset,setDayOffset]=useState(1),[today,setToday]=useState(''),[device,setDevice]=useState<string|null>(null);
 const [revealed,setRevealed]=useState<Record<string,number[]>>({});
 const [pass,setPass]=useState<AttendanceState|null>(null),[guest,setGuest]=useState(false);
 useEffect(()=>{
  let active=true;
  const refresh=()=>fortuneApi<AttendanceState>('attendance').then(next=>{if(active){setPass(next);setGuest(false);}}).catch((error:{status?:number})=>{if(active&&error?.status===401){setPass(null);setGuest(true);}});
  const update=(event:Event)=>{const next=(event as CustomEvent<AttendanceState>).detail;if(next)setPass(next);else void refresh();};
  void refresh();window.addEventListener('cd:yeongnyangi-daily-pass',update);window.addEventListener('cd:auth-changed',update);
  return()=>{active=false;window.removeEventListener('cd:yeongnyangi-daily-pass',update);window.removeEventListener('cd:auth-changed',update);};
 },[]);
 useEffect(()=>{
  setDevice(deviceId());
  const refresh=()=>setToday(kstDateKey());
  refresh();const timer=setInterval(refresh,15000);window.addEventListener('focus',refresh);
  return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);};
 },[]);
 const unlocked=Boolean(pass?.unlocked&&pass.day===today);
 const dateKey=today?offsetTarotDate(today,dayOffset):'';
 const dayLabel=dayOffset===1?'내일':'오늘';
 const reading=unlocked&&dateKey&&device!==null?dailyTarotSpread(dateKey,device):null;
 const opened=revealed[dateKey]||[];
 const synthesis=reading?synthesizeDailyTarot(reading):null;
 return <section id="daily-tarot" tabIndex={-1} className="daily-tarot" aria-labelledby="daily-tarot-title">
  <div className={styles.intro}>
   <figure className={styles.scene}><Image src="/assets/yeongnyangi/readings/tarot-v5.webp" width={960} height={640} sizes="(max-width: 700px) 100vw, 50vw" alt="달빛 점술방에서 영냥이가 세 장의 상징 카드를 펼쳐 보이는 안내 삽화"/><figcaption>영냥이가 준비한 자리 · 실제 카드는 아래에서 펼쳐요</figcaption></figure>
   <div className="daily-tarot-copy"><Moon size={20}/><h2 id="daily-tarot-title">오늘과 내일, 영냥이의 세 장 타로</h2><p>내일이 궁금한 밤에도, 오늘의 방향이 필요한 아침에도 찾아와.<br/>세 장을 펼치면 흐름과 마음, 행동을 하나의 이야기로 읽어줄게. 출석으로 오늘의 운세를 열면 내일 타로도 함께 볼 수 있어.</p><ol className={styles.chapterKeys}>{positions.map((position,index)=><li key={position}><span>{['첫 장','둘째 장','셋째 장'][index]}</span>{position}</li>)}</ol></div>
  </div>
  {!unlocked?<div className={`daily-tarot-luck ${styles.access}`}><Sparkles size={17}/><span>오늘의 운세 잠김</span><b>사흘 출석해 모은 멸치 3마리로 오늘의 16종 운세와 오늘·내일 타로를 함께 열어줘.</b>{guest?<button type="button" onClick={loginForCurrentPage}>로그인하고 출석하기</button>:<a href="#daily">출석 멸치로 열기<ArrowRight size={16}/></a>}</div>:<>
  <div className="daily-tarot-days" role="group" aria-label="타로를 볼 날짜">
   {[1,0].map(offset=><button type="button" key={offset} aria-pressed={dayOffset===offset} onClick={()=>setDayOffset(offset)}>{offset===1?'내일의 운세':'오늘의 운세'}</button>)}
  </div>
  <p className="daily-tarot-progress"><time dateTime={dateKey}>{dateKey.replaceAll('-','.')}</time> · 한국 시간 기준<br/>{dayLabel}의 카드를 마음에 닿는 순서로 펼쳐봐.</p>
  <div key={dateKey} className="daily-tarot-spread" role="group" aria-label={`${dayLabel}의 타로 세 장`}>
   {positions.map((position,index)=>{const card=reading?.[index],open=opened.includes(index);return <button key={position} type="button" className={`daily-tarot-flip${open?' is-open':''}`} disabled={!card} aria-expanded={open} aria-controls={`daily-tarot-reading-${index}`} aria-label={open&&card?`${position}: ${card.cardName} ${card.orientationLabel}`:`${position} 카드 뒤집기`} onClick={()=>setRevealed(current=>{const previous=current[dateKey]||[];return {...current,[dateKey]:previous.includes(index)?previous:[...previous,index]};})}>
    <span className="daily-tarot-position">{position}</span>
    <span className="daily-tarot-card"><span className="daily-tarot-back"><TarotCardArt/></span><span className="daily-tarot-front">{card&&<TarotCardArt cardCode={card.cardCode} className={card.orientation==='reversed'?'daily-tarot-reversed':undefined}/>}</span></span>
    <strong>{open&&card?card.cardName:'톡, 펼쳐봐'}</strong><small>{open&&card?card.orientationLabel:card?'네가 끌리는 순서대로':'고르는 중…'}</small>
   </button>;})}
  </div>
  <p className="daily-tarot-progress" role="status">{opened.length===3?`세 장 모두 펼쳤네. 이제 ${dayLabel}의 이야기를 연결해볼게.`:`${opened.length} / 3장 펼쳤어. 서두르지 않아도 돼.`}</p>
  {opened.length===3&&synthesis&&<article className="daily-tarot-synthesis" aria-labelledby="daily-synthesis-title">
   <h3 id="daily-synthesis-title">{dayLabel}의 종합 리딩</h3>
   <p className="daily-tarot-headline">{synthesis.headline}</p>
   {synthesis.story.map((paragraph,index)=><p key={index}>{paragraph}</p>)}
   <h4>사람과 마음이 만나는 장면</h4><p>{synthesis.relationship}</p>
   <h4>일과 돈을 대하는 자세</h4><p>{synthesis.work}</p>
   <h4>{dayOffset===1?'오늘 밤, 내일을 위한 준비':'하루 중 마음이 복잡해진다면'}</h4><p>{synthesis.preparation}</p>
   <h4>{dayLabel}의 작은 승부수</h4><p>{synthesis.mission}</p>
   <div className={styles.guide}><Image src="/assets/yeongnyangi/original/tarot.webp" width={460} height={300} sizes="96px" alt="카드를 든 영냥이"/><p className="daily-tarot-comment">{synthesis.closing}</p></div>
  </article>}
  <div className="daily-tarot-readings">
   {positions.map((position,index)=>{const card=reading?.[index];return <article id={`daily-tarot-reading-${index}`} key={position} className="daily-tarot-reading" hidden={!opened.includes(index)||!card}>
    {card&&<><h3>{position} · {card.cardName}</h3><p className="daily-tarot-comment">{index===0?`${dayLabel}은 이런 장면에 눈길을 줘봐.`:index===1?'마음이 보내는 신호도 놓치지 말자.':'큰 결심 말고, 작은 한 걸음이면 돼.'}</p><p>{synthesis?.cards[index].reading}</p><dl><div><dt>카드의 조언</dt><dd>{synthesis?.cards[index].advice}</dd></div></dl></>}
   </article>;})}
  </div>
  <p className="daily-tarot-note">같은 기기에서는 같은 날짜의 카드가 유지돼. 미리 본 내일의 카드는 그날에도 같아. 타로는 미래를 확정하는 예언이 아니라, 선택을 돕는 상징 해석이야.</p>
  <nav className="daily-tarot-next" aria-label="타로 다음 단계"><a href="#daily">멸치로 다른 오늘의 운세 보기<ArrowRight size={16}/></a><a href="/yeongnyangi/fortune/">내 질문으로 상담 살펴보기<ArrowRight size={16}/></a></nav>
  </>}
 </section>;
}
