'use client';
import {useState} from 'react';
import type {Product} from '@/worker/yeongnyangi/payments/catalog';
import {readingArtwork} from './ReadingIdentity';
import {readingCopy} from '../_lib/reading-copy';
import {resultStateCopy} from '../_lib/result-state-copy';
import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import styles from './reading-loading.module.css';
export default function ReadingLoading({stage='fetching',saved=0,total=0,product,locale,compact=false}:{stage?:'fetching'|'generating'|'verifying';saved?:number;total?:number;product?:Product;locale?:ReadingLocale;compact?:boolean}){
 const [paused,setPaused]=useState(false);
 const copy=readingCopy(locale),stateCopy=resultStateCopy(locale);
 const ko=!locale||locale==='ko';
 const title=stage==='fetching'?copy.loading:stage==='verifying'?copy.reviewing:ko?'영냥이가 네 질문의 흐름을 읽고 있어.':copy.generating;
 const domain=product?.readingKind==='single'?product.domain:'fusion';
 const orbit=['vedic','astrology','fusion'].includes(domain);
 return <div className={[styles.loading,compact?styles.compact:'',paused?styles.paused:''].join(' ')} data-reading-stage={stage} data-reading-domain={domain}>
  <div className={styles.scene} aria-hidden="true">
   <img src={product?readingArtwork(product):"/assets/yeongnyangi/readings/fusion-v5.webp"} alt="" width={960} height={640} fetchPriority="high"/>
   <div className={styles.aura}/>
   <svg className={styles.magic} viewBox="0 0 600 400" fill="none">
    {orbit?<g className={styles.orbit}><ellipse cx="300" cy="245" rx="190" ry="80"/><ellipse cx="300" cy="245" rx="125" ry="125"/></g>
     :domain==='tarot'?<g className={styles.rays}><rect x="135" y="275" width="80" height="90" rx="8" transform="rotate(-12 175 320)"/><rect x="260" y="265" width="80" height="90" rx="8"/><rect x="385" y="275" width="80" height="90" rx="8" transform="rotate(12 425 320)"/></g>
     :domain==='saju'?<g className={styles.rays}><path d="M160 300 Q300 265 440 300 M170 320 Q300 285 430 320"/>{['#b7d6b1','#efb19d','#eed49e','#ece2cf','#a7c9e5'].map((color,i)=><circle key={color} cx={180+i*60} cy="330" r="7" fill={color} stroke="none"/>)}</g>
     :<path className={styles.rays} d="M135 230 220 150 300 185 385 110 465 200 410 270"/>}
    <g className={styles.spark}>{[[125,150],[455,125],[300,80],[200,255],[405,290]].map(([x,y])=><path key={x} d={`M${x} ${y-7}q0 7 7 7-7 0-7 7 0-7-7-7 7 0 7-7Z`}/>)}</g>
   </svg>
  </div>
  <div className={styles.copy}>
   <div role="status" aria-live="polite" aria-atomic="true"><p className={styles.title}>{title}</p>{total>0&&<p className={styles.detail}>{stateCopy.saved(saved,total)}</p>}</div>
   <button type="button" className={styles.pause} aria-pressed={paused} onClick={()=>setPaused(value=>!value)}>{ko?(paused?'효과 다시 재생':'효과 멈추기'):(paused?'Resume animation':'Pause animation')}</button>
  </div>
 </div>;
}
