'use client';
import {mascotName,mascotPrefix} from '../_lib/mascot-name.mjs';
import {useState} from 'react';
import {ArrowRight,Moon,PawPrint} from 'lucide-react';
import {products} from '@/worker/yeongnyangi/payments/catalog';
import {EXPANDED_CHAPTERS} from '@/worker/yeongnyangi/fortune/consultation-expansion';
import {FOLLOWUP_LIMITS} from '@/worker/yeongnyangi/fortune/ask/question-policy';
import LaunchPlannedPrice from '@/app/components/LaunchPlannedPrice';
import TrustRecordLine from '@/app/components/conversion/TrustRecordLine';
import {launchOffer,plannedPriceFor} from '@/lib/brand/launch-offer';
import styles from './night-hero.module.css';
import PetMascot from './PetMascot';

const starter=products.find(product=>product.id==='saju_mackerel')!;
const planned=plannedPriceFor(starter.fishId,starter.priceKRW);
const greetings=['무슨 고민이야? 편하게 앉아.','쓰다듬는 건… 딱 한 번만이야.','네 속도에 맞춰, 함께 읽어보자.'];
export function NightPriceDetails(){
 return <details className={styles.terms}>
  <summary>상담 가격 보기</summary>
  {planned !== null && <p>선착순 {launchOffer.limit.toLocaleString('ko-KR')}명 체험가 · <LaunchPlannedPrice amount={planned}/></p>}
  <p className={styles.price}>고등어 질문 상담 {starter.priceKRW.toLocaleString('ko-KR')}원 · 한 체계 · 신규 한국어 질문 기준 {EXPANDED_CHAPTERS.mackerel}챕터 · {FOLLOWUP_LIMITS.mackerel===0?'추가 질문 없음':`추가 질문 ${FOLLOWUP_LIMITS.mackerel}회`}</p>
  <a href="#yn-prices">상담별 가격 확인하기</a>
 </details>;
}
export default function NightHero(){
 const [greeting,setGreeting]=useState(0);
 return <section className={styles.hero} aria-labelledby="hero-title">
  <picture className={styles.room}><source media="(max-width: 699px)" srcSet="/assets/yeongnyangi/night/consultation-room-mobile.webp"/><img src="/assets/yeongnyangi/night/consultation-room.webp" width={1440} height={960} alt="" fetchPriority="high"/></picture>
  <div className={styles.copy}>
   <h1 id="hero-title"><span className={styles.brandPrefix}>{mascotPrefix}</span>{' '}<span className={styles.brandName}>{mascotName}</span></h1>
   <p className={styles.desktopIntro}>간단한 고민 상담은 영냥이에게 물어봐! 답과 근거, 지금 해볼 행동을 함께 살펴봐요.</p>
   <div className={styles.actions}>
    <a className={styles.primary} href="#questions" data-cd-business-entry="question"><PawPrint size={20} aria-hidden="true"/>운세 고르고 고민 적기<ArrowRight size={19} aria-hidden="true"/></a>
    <a className={styles.roomLink} href="/yeongnyangi/room/"><Moon size={16} aria-hidden="true"/>영냥이의 방</a>
   </div>
   <p className={styles.price}>{planned!==null?<>선착순 {launchOffer.limit.toLocaleString('ko-KR')}명 체험가 · <LaunchPlannedPrice amount={planned}/> · </>:null}<span className={styles.keep}>질문 상담 {starter.priceKRW.toLocaleString('ko-KR')}원부터</span></p>
   <TrustRecordLine variant="short" className={styles.trust}/>
   <a className={styles.example} href="#yn-example">상담 예시 먼저 보기</a>

  </div>
  <div className={styles.character}>
   <PetMascot className={styles.cat} variant="landing" alt="달빛 모자를 쓰고 이야기를 기다리는 흰 고양이 영냥이" sizes="(min-width: 900px) 420px, (max-width: 699px) 184px, 210px" priority onReact={()=>setGreeting(value=>(value+1)%greetings.length)}/>
   <p aria-live="polite" data-greeted={greeting ? true : undefined}>{greetings[greeting]}</p>
  </div>
 </section>;
}
