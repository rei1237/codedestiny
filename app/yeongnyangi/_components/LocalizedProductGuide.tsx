'use client';
import {useState} from 'react';
import type {DomainId} from '@/worker/yeongnyangi/fortune/shared/contracts';
import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import type {ProductOffer} from './ProductGuide';
import {consultationLocaleCopy,localizedSystem,localizedTier} from '../_lib/consultation-locale-copy';
import {readingPrice} from '../_lib/use-reading-language';
import {readingDepthCopy,readingTierDepth} from '../_lib/reading-depth-copy';
import {trackProductStep} from './ProductGuide';
import styles from './product-guide.module.css';

export default function LocalizedProductGuide({domain,offers,locale,surface}:{domain:DomainId;offers:ProductOffer[];locale:ReadingLocale;surface:string}){
 const [fish,setFish]=useState(offers[0].fish);
 const offer=offers.find(item=>item.fish===fish)||offers[0];
 const copy=consultationLocaleCopy(locale);
 const Heading=surface==='product_page'?'h2':'h3';
 const href=`/yeongnyangi/fortune/?domain=${domain}&fish=${offer.fish}&lang=${locale}`;
 return <div className={styles.guide} lang={locale}>
  <div className={styles.offer}><p><strong>{readingPrice(offer.price,locale)}</strong> · {offer.chapters.length} {copy.chapters}</p><p className={styles.offerHook}>{copy.pitch}</p><p>{copy.about}</p></div>
  <Heading>{copy.suitable}</Heading><p>{copy.suitableHint}</p>
  <Heading>{localizedSystem(domain,locale)}</Heading><p>{copy.method}</p><p>{copy.limits}</p>
  <Heading>{copy.depth}</Heading><p data-reading-depth-note>{readingDepthCopy(locale).sharedTopics}</p><div className={styles.tiers} role="group" aria-label={copy.depth}>{offers.map(item=><button key={item.id} type="button" aria-pressed={item.id===offer.id} onClick={()=>setFish(item.fish)}>{localizedTier(item.fish,locale)}<span>{readingPrice(item.price,locale)}</span></button>)}</div>
  <p aria-live="polite">{localizedTier(offer.fish,locale)} · {offer.chapters.length} {copy.chapters}<br/><span data-reading-tier-depth={offer.fish}>{readingTierDepth(offer.fish,locale)}</span></p>
  <p>{copy.afterPayment}</p>
  <details className={styles.sample}><summary>{copy.sample}</summary><p>{copy.sampleHint}</p><blockquote>{copy.example}</blockquote></details>
  <p>{copy.payment}. {copy.priceHint}</p><p>{copy.languageHint}</p>
  <a href={`/yeongnyangi/library/?lang=${locale}`}>{copy.library}</a>
  <a className={styles.cta} href={href} onClick={()=>trackProductStep('product_start_click',domain,offer.itemId,surface,locale)}>{copy.start}</a>
 </div>;
}
