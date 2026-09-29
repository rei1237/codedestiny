'use client';
import type {ReactNode} from 'react';
import {useReadingLanguage} from '../yeongnyangi/_lib/use-reading-language';
import {accountLocaleCopy} from '../yeongnyangi/_lib/account-locale-copy';
import {consultationLocaleCopy,localizedSystem} from '../yeongnyangi/_lib/consultation-locale-copy';
import type {DomainId} from '@/worker/yeongnyangi/fortune/shared/contracts';
import styles from '../home-guide.module.css';
export default function LocalizedServiceSummary({children}:{children:ReactNode}){
 const {siteLocale}=useReadingLanguage();
 const copy=consultationLocaleCopy(siteLocale);
 if(siteLocale==='ko')return children;
 return <section className={styles.guide} lang={siteLocale} aria-labelledby="homeGuideTitle">
  <h2 id="homeGuideTitle">{copy.guideTitle}</h2><p>{copy.about}</p><p>{copy.method}</p>
  <nav className={styles.paths}><a href={`/yeongnyangi/fortune/?lang=${siteLocale}`}>{copy.start}</a><a href={`/yeongnyangi/1000-won-fortune/?lang=${siteLocale}`}>{copy.depth}</a><a href={`/yeongnyangi/library/?lang=${siteLocale}`}>{copy.library}</a></nav>
  <details className={styles.directory}><summary>{accountLocaleCopy[siteLocale].serviceInfo}</summary><ul>{(['saju','ziwei','sukuyo','vedic','astrology','tarot'] as DomainId[]).map(domain=><li key={domain}><a href={`/yeongnyangi/readings/${domain}/?lang=${siteLocale}`}>{localizedSystem(domain,siteLocale)}</a></li>)}</ul></details>
  <p>{copy.limits}</p><p>{copy.payment}. {copy.priceHint}</p><p>{copy.languageHint}</p>
  <a href={`/yeongnyangi/library/?lang=${siteLocale}`}>{copy.library}</a>
 </section>;
}
