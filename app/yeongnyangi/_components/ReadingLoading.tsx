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
 return <div className={[styles.loading,compact?styles.compact:'',paused?styles.paused:''].join(' ')} data-reading-stage={stage} data-reading-domain={domain}>
  <div className={styles.scene} aria-hidden="true">
   <img src={product?readingArtwork(product):"/assets/yeongnyangi/readings/fusion-v5.webp"} alt="" width={960} height={640} fetchPriority="high"/>
   <div className={styles.sprite} data-reading-sprite={domain} style={{backgroundImage:`url("/assets/yeongnyangi/readings/${domain}-loading-sprite-v1.webp")`}}/>
  </div>
  <div className={styles.copy}>
   <div role="status" aria-live="polite" aria-atomic="true"><p className={styles.title}>{title}</p>{total>0&&<p className={styles.detail}>{stateCopy.saved(saved,total)}</p>}</div>
   <button type="button" className={styles.pause} aria-pressed={paused} onClick={()=>setPaused(value=>!value)}>{ko?(paused?'효과 다시 재생':'효과 멈추기'):(paused?'Resume animation':'Pause animation')}</button>
  </div>
 </div>;
}
