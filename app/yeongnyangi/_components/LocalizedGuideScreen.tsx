'use client';
import type {ReactNode} from 'react';
import Image from 'next/image';
import type {DomainId} from '@/worker/yeongnyangi/fortune/shared/contracts';
import {useReadingLanguage} from '../_lib/use-reading-language';
import {consultationLocaleCopy,localizedSystem} from '../_lib/consultation-locale-copy';
import {productOffers,productArtwork} from '../_lib/product-offers';
import ProductGuide from './ProductGuide';
import styles from '../readings/[domain]/page.module.css';

// Preserve the indexed Korean editorial content; purchasing guidance follows the screen locale.
export default function LocalizedGuideScreen({children,domain}:{children:ReactNode;domain?:DomainId}){
 const {siteLocale}=useReadingLanguage();
 if(siteLocale==='ko')return children;
 const copy=consultationLocaleCopy(siteLocale);
 const domains:DomainId[]=domain?[domain]:['saju','ziwei','sukuyo','vedic','astrology','tarot'];
 return <article className={styles.page} lang={siteLocale}>
  <h1>{domain?localizedSystem(domain,siteLocale):copy.guideTitle}</h1>
  <p>{copy.about}</p><p>{copy.pitch}</p><p>{copy.languageHint}</p>
  {domains.map(item=><section key={item}>
   {!domain&&<h2>{localizedSystem(item,siteLocale)}</h2>}
   <Image className={styles.art} src={productArtwork(item)} width={960} height={640} alt={localizedSystem(item,siteLocale)} priority={item===domains[0]}/>
   <ProductGuide domain={item} offers={productOffers[item]} surface="product_page"/>
  </section>)}
 </article>;
}
