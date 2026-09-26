'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,BookOpen,PawPrint} from 'lucide-react';
import {products} from '@/worker/yeongnyangi/payments/catalog';
import styles from './night-hero.module.css';

const starter=products.find(product=>product.id==='saju_mackerel')!;
const greetings=['무슨 고민이야? 편하게 앉아.','쓰다듬는 건… 딱 한 번만이야.','네 속도에 맞춰, 함께 읽어보자.'];
export default function NightHero(){
 const [greeting,setGreeting]=useState(0),[petted,setPetted]=useState(false);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 return <section className={styles.hero} aria-labelledby="hero-title">
  <picture className={styles.room}><source media="(max-width: 699px)" srcSet="/assets/yeongnyangi/night/consultation-room-mobile.webp"/><img src="/assets/yeongnyangi/night/consultation-room.webp" width={1440} height={960} alt="" fetchPriority="high"/></picture>
  <div className={styles.copy}>
   <h1 id="hero-title">사주보는 고양이,<br/><span>영냥이에게 물어봐.</span></h1>
   <p>타고난 성향부터 지금의 고민까지.<br/>사주·별·카드의 흐름을 읽고,<br className={styles.mobileBreak}/> 네가 해볼 선택을 함께 정리해.</p>
   <div className={styles.actions}>
    <a className={styles.primary} href="/yeongnyangi/fortune/?domain=saju&fish=mackerel&consultationKind=ask" data-cd-business-entry="paid"><PawPrint size={20} aria-hidden="true"/>내 질문으로 상담 시작하기<ArrowRight size={19} aria-hidden="true"/></a>
    <a className={styles.secondary} href="#readings"><BookOpen size={18} aria-hidden="true"/>상담 종류 살펴보기</a>
   </div>
   <p className={styles.price}>사주 고등어 {starter.priceKRW.toLocaleString('ko-KR')}원 · {starter.chapterCount}개 챕터부터</p>
   <a className={styles.example} href="/yeongnyangi/1000-won-fortune/#example">결제 전 상담 예시 읽기 →</a>
  </div>
  <div className={styles.character}>
   <button className={`${styles.cat} ${petted?styles.petted:''}`} aria-label="영냥이 쓰다듬기" onClick={()=>{setGreeting(value=>(value+1)%greetings.length);setPetted(true);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setPetted(false),360);}}>
    <img src="/assets/yeongnyangi/original/hero-800.webp" srcSet="/assets/yeongnyangi/original/hero-480.webp 480w, /assets/yeongnyangi/original/hero-800.webp 800w" sizes="(min-width: 900px) 420px, 210px" width={800} height={800} alt="달빛 모자를 쓰고 이야기를 기다리는 흰 고양이 영냥이" fetchPriority="high"/>
   </button>
   <p aria-live="polite">{greetings[greeting]}</p>
  </div>
 </section>;
}
