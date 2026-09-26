import type {Product} from '@/worker/yeongnyangi/payments/catalog';
import {readingArtwork} from './ReadingIdentity';
import {readingCopy} from '../_lib/reading-copy';
import {resultStateCopy} from '../_lib/result-state-copy';
import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import styles from '../yeongnyangi.module.css';
export default function ReadingLoading({stage='fetching',saved=0,total=0,product,locale}:{stage?:'fetching'|'generating'|'verifying';saved?:number;total?:number;product?:Product;locale?:ReadingLocale}){
 const copy=readingCopy(locale),stateCopy=resultStateCopy(locale);
 const title=stage==='fetching'?copy.loading:stage==='verifying'?copy.reviewing:copy.generating;
 return <div className={styles.readingLoading} role="status" aria-live="polite">
  <img src={product?readingArtwork(product):"/assets/yeongnyangi/original/signup.webp"} alt="" width={440} height={445} fetchPriority="high"/>
  <div><p className={styles.loadingTitle}>{title}</p><p>{stage==='fetching'?stateCopy.paymentWaiting:stateCopy.saved(saved,total)}</p></div>
 </div>;
}
