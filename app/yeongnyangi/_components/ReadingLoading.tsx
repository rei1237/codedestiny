'use client';
import Image from 'next/image';
import type {Product} from '@/worker/yeongnyangi/payments/catalog';
import {readingCopy} from '../_lib/reading-copy';
import {resultStateCopy} from '../_lib/result-state-copy';
import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import styles from './reading-loading.module.css';
export default function ReadingLoading({stage='fetching',saved=0,total=0,product,locale,compact=false}:{stage?:'fetching'|'generating'|'verifying';saved?:number;total?:number;product?:Product;locale?:ReadingLocale;compact?:boolean}){
 const copy=readingCopy(locale),stateCopy=resultStateCopy(locale);
 const ko=!locale||locale==='ko';
 const title=stage==='fetching'?copy.loading:stage==='verifying'?copy.reviewing:ko?'영냥이가 네 질문의 흐름을 읽고 있어.':copy.generating;
 // 한국어 생성 제목은 영냥이 말투라 서버 이어쓰기 안내가 빠진다. 기다리는 동안 나가도 된다는 사실을 따로 알린다.
 const leaveHint=stage==='generating'&&title!==copy.generating?copy.generating:'';
 const domain=product?.readingKind==='single'?product.domain:'fusion';
 return <div className={[styles.loading,compact?styles.compact:''].join(' ')} data-reading-stage={stage} data-reading-domain={domain}>
  <div className={styles.scene} aria-hidden="true">
   <picture>
    <source type="image/avif" srcSet="/images/brand/yeongnyangi-fish-loading-v1-480.avif 480w, /images/brand/yeongnyangi-fish-loading-v1-720.avif 720w, /images/brand/yeongnyangi-fish-loading-v1-1024.avif 1024w" sizes={compact?'144px':'(max-width: 430px) 80vw, 320px'}/>
    <Image src="/images/brand/yeongnyangi-fish-loading-v1-720.webp" alt="" width={1024} height={1536} loading="eager" unoptimized fetchPriority="high"/>
   </picture>
  </div>
  <div className={styles.copy}>
   <div role="status" aria-live="polite" aria-atomic="true"><p className={styles.title}>{title}</p>{total>0&&<p className={styles.detail}>{stateCopy.saved(saved,total)}</p>}</div>
   {leaveHint&&<p className={styles.detail}>{leaveHint}</p>}
  </div>
 </div>;
}
