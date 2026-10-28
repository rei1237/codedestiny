'use client';
import {brandCopy} from '@/lib/seo/brand-copy.mjs';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,PawPrint} from 'lucide-react';
import {products} from '@/worker/yeongnyangi/payments/catalog';
import LaunchPlannedPrice from '@/app/components/LaunchPlannedPrice';
import {launchOffer,plannedPriceFor} from '@/lib/brand/launch-offer';
import styles from './night-hero.module.css';

const starter=products.find(product=>product.id==='saju_mackerel')!;
const planned=plannedPriceFor(starter.fishId,starter.priceKRW);
const greetings=['무슨 고민이야? 편하게 앉아.','쓰다듬는 건… 딱 한 번만이야.','네 속도에 맞춰, 함께 읽어보자.'];
export default function NightHero(){
 const [greeting,setGreeting]=useState(0),[petted,setPetted]=useState(false);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
 return <section className={styles.hero} aria-labelledby="hero-title">
  <picture className={styles.room}><source media="(max-width: 699px)" srcSet="/assets/yeongnyangi/night/consultation-room-mobile.webp"/><img src="/assets/yeongnyangi/night/consultation-room.webp" width={1440} height={960} alt="" fetchPriority="high"/></picture>
  <div className={styles.copy}>
   <h1 id="hero-title">{brandCopy('yeongnyangiHeading')}<br/><span>{brandCopy('yeongnyangiServiceName')}</span></h1>
   <p>간단한 고민 상담은 영냥이에게 물어봐! 답과 근거, 지금 해볼 행동을 함께 살펴봐요.</p>
   <div className={styles.actions}>
    <a className={styles.primary} href="#questions" data-cd-business-entry="question"><PawPrint size={20} aria-hidden="true"/>내 고민 상담하기<ArrowRight size={19} aria-hidden="true"/></a>
   </div>
   <p className={styles.price}>{planned!==null?<>선착순 {launchOffer.limit.toLocaleString('ko-KR')}명 체험가 · <LaunchPlannedPrice amount={planned}/></>:null}<span className={styles.keep}>질문 상담 {starter.priceKRW.toLocaleString('ko-KR')}원부터</span> · 질문 범위에 따라 안내</p>
  </div>
  <div className={styles.character}>
   <button className={`${styles.cat} ${petted?styles.petted:''}`} aria-label="영냥이 쓰다듬기" onClick={()=>{setGreeting(value=>(value+1)%greetings.length);setPetted(true);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setPetted(false),360);}}>
    <img src="/assets/yeongnyangi/original/hero-800.webp" srcSet="/assets/yeongnyangi/original/hero-480.webp 480w, /assets/yeongnyangi/original/hero-800.webp 800w" sizes="(min-width: 900px) 420px, 210px" width={800} height={800} alt="달빛 모자를 쓰고 이야기를 기다리는 흰 고양이 영냥이" fetchPriority="high"/>
   </button>
   <p aria-live="polite">{greetings[greeting]}</p>
  </div>
 </section>;
}
