'use client';
import Image from 'next/image';
import type {Product} from '@/worker/yeongnyangi/payments/catalog';
import type {ChapterSpec} from '@/worker/yeongnyangi/fortune/book-contracts';
import {formatElapsed,useElapsed} from '@/components/fortune/useElapsed';
import {readingCopy} from '../_lib/reading-copy';
import {resultStateCopy} from '../_lib/result-state-copy';
import {v7Label} from '../_lib/reading-v7-copy';
import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import styles from './reading-loading.module.css';
// 기다리는 화면의 경과·장 표시 문구. 숫자는 서버가 돌려준 manifest·chapters 수로만 만든다(진행률 %는 지어내지 않는다).
const waitCopy:Record<ReadingLocale,{elapsed:string;writing:(n:number,total:number)=>string}>={
 ko:{elapsed:'기다린 시간',writing:(n,t)=>`${n}번째 장 쓰는 중 · 전체 ${t}장`},
 en:{elapsed:'Waiting',writing:(n,t)=>`Writing chapter ${n} of ${t}`},
 ja:{elapsed:'待ち時間',writing:(n,t)=>`全${t}章のうち第${n}章を執筆中`},
 'zh-CN':{elapsed:'已等待',writing:(n,t)=>`正在撰写第 ${n} 章 · 共 ${t} 章`},
 'zh-TW':{elapsed:'已等待',writing:(n,t)=>`正在撰寫第 ${n} 章 · 共 ${t} 章`},
 vi:{elapsed:'Đã chờ',writing:(n,t)=>`Đang viết chương ${n}/${t}`},
 hi:{elapsed:'प्रतीक्षा समय',writing:(n,t)=>`अध्याय ${n} / ${t} लिखा जा रहा है`},
 es:{elapsed:'Tiempo de espera',writing:(n,t)=>`Escribiendo el capítulo ${n} de ${t}`},
 fr:{elapsed:"Temps d'attente",writing:(n,t)=>`Rédaction du chapitre ${n} sur ${t}`},
 de:{elapsed:'Wartezeit',writing:(n,t)=>`Kapitel ${n} von ${t} wird geschrieben`},
 nl:{elapsed:'Wachttijd',writing:(n,t)=>`Hoofdstuk ${n} van ${t} wordt geschreven`},
 ms:{elapsed:'Masa menunggu',writing:(n,t)=>`Menulis bab ${n} daripada ${t}`},
};
// 서버 큐가 브라우저와 상관없이 다음 장을 이어 쓰고, 결과 화면을 다시 열면 저장된 장부터 보여준다(queue.js·delivery.js·recovery.js). 시간 약속은 하지 않는다.
const leaveKo='창을 닫아도 괜찮아. 남은 장은 서버가 이어서 써. 영냥이 보관함에서 다시 열면 그동안 쓴 장을 바로 읽을 수 있어.';
export default function ReadingLoading({stage='fetching',saved=0,total=0,product,locale,compact=false,manifest,timing=false}:{stage?:'fetching'|'generating'|'verifying';saved?:number;total?:number;product?:Product;locale?:ReadingLocale;compact?:boolean;manifest?:ChapterSpec[];timing?:boolean}){
 const copy=readingCopy(locale),stateCopy=resultStateCopy(locale),wait=waitCopy[locale||'ko']||waitCopy.ko;
 const ko=!locale||locale==='ko';
 const title=stage==='fetching'?copy.loading:stage==='verifying'?copy.reviewing:ko?'영냥이가 네 질문의 흐름을 읽고 있어.':copy.generating;
 // 한국어 생성 제목은 영냥이 말투라 서버 이어쓰기 안내가 빠진다. 기다리는 동안 나가도 된다는 사실을 따로 알린다.
 const leaveHint=stage==='generating'&&title!==copy.generating?leaveKo:'';
 const domain=product?.readingKind==='single'?product.domain:'fusion';
 const counted=total>0;
 // 지금 쓰는 장은 저장된 장 다음 장이다(장은 순서대로 하나씩 쓴다). 제목은 응답에 manifest 가 있을 때만 보인다.
 const writing=stage==='generating'&&counted&&saved<total?saved+1:0;
 const spec=writing?manifest?.[saved]:undefined;
 const chapterTitle=spec?(ko?spec.title:v7Label(spec.titleKey,locale)):undefined;
 const elapsed=useElapsed(timing&&stage!=='fetching');
 return <div className={[styles.loading,compact?styles.compact:''].join(' ')} data-reading-stage={stage} data-reading-domain={domain} data-reading-count={counted?'determinate':'indeterminate'}>
  <div className={styles.scene} aria-hidden="true">
   <picture>
    <source type="image/avif" srcSet="/images/brand/yeongnyangi-fish-loading-v1-480.avif 480w, /images/brand/yeongnyangi-fish-loading-v1-720.avif 720w, /images/brand/yeongnyangi-fish-loading-v1-1024.avif 1024w" sizes={compact?'144px':'(max-width: 430px) 80vw, 320px'}/>
    <Image src="/images/brand/yeongnyangi-fish-loading-v1-720.webp" alt="" width={1024} height={1536} loading="eager" unoptimized fetchPriority="high"/>
   </picture>
  </div>
  <div className={styles.copy}>
   <div role="status" aria-live="polite" aria-atomic="true"><p className={styles.title}>{title}</p>{writing>0?<p className={styles.count}>{wait.writing(writing,total)}</p>:counted&&<p className={styles.detail}>{stateCopy.saved(saved,total)}</p>}{chapterTitle&&<p className={styles.chapterTitle}>{chapterTitle}</p>}</div>
   {!counted&&stage!=='fetching'&&<span className={styles.flow} aria-hidden="true"/>}
   {timing&&stage!=='fetching'&&<p className={styles.elapsed}>{wait.elapsed} <time dateTime={`PT${Math.floor(elapsed/1000)}S`}>{formatElapsed(elapsed)}</time></p>}
   {leaveHint&&<p className={styles.detail}>{leaveHint}</p>}
  </div>
 </div>;
}
