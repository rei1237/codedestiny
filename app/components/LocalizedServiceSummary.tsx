'use client';
import type {ReactNode} from 'react';
import {useReadingLanguage} from '../yeongnyangi/_lib/use-reading-language';
import {accountLocaleCopy} from '../yeongnyangi/_lib/account-locale-copy';
import {consultationLocaleCopy,localizedSystem} from '../yeongnyangi/_lib/consultation-locale-copy';
import type {DomainId} from '@/worker/yeongnyangi/fortune/shared/contracts';
export default function LocalizedServiceSummary({children}:{children:ReactNode}){
 const {siteLocale}=useReadingLanguage();
 const copy=consultationLocaleCopy(siteLocale);
 return <><summary lang={siteLocale}>{siteLocale==='ko'?'CODE DESTINY 서비스와 이용 안내':`CODE DESTINY · ${accountLocaleCopy[siteLocale].serviceInfo}`}</summary>
 {siteLocale==='ko'?children:<section lang={siteLocale}>
  <h2>{copy.guideTitle}</h2><p>{copy.about}</p><p>{copy.method}</p>
  <ul>{(['saju','ziwei','sukuyo','vedic','astrology','tarot'] as DomainId[]).map(domain=><li key={domain}><a href={`/yeongnyangi/readings/${domain}/?lang=${siteLocale}`}>{localizedSystem(domain,siteLocale)}</a></li>)}</ul>
  <p>{copy.limits}</p><p>{copy.payment}. {copy.priceHint}</p><p>{copy.languageHint}</p>
  <a href={`/yeongnyangi/library/?lang=${siteLocale}`}>{copy.library}</a>
 </section>}</>;
}
