'use client';
import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import type {DomainId} from '@/worker/yeongnyangi/fortune/shared/contracts';
import type {ProductOffers} from './ProductGuide';
import LocalizedProductGuide from './LocalizedProductGuide';
import {consultationLocaleCopy,localizedSystem} from '../_lib/consultation-locale-copy';
import styles from '../yeongnyangi.module.css';
import heroStyles from './night-hero.module.css';
import {LocaleSwitcher} from '@/app/components/LocaleSwitcher';
import QuestionSkyEntry from './QuestionSkyEntry';
import SessionControls from '../_original/SessionControls';
import {relationshipCopyFor} from '../_lib/relationship-locales';

export default function LocalizedFortuneHome({locale,offers}:{locale:ReadingLocale;offers:ProductOffers}){
 const copy=consultationLocaleCopy(locale);
 const relationship=relationshipCopyFor(locale);
 return <main className={styles.page} lang={locale}>
  <nav className={styles.nav} aria-label={copy.home}><a href={`/?lang=${locale}`}>CODE DESTINY · Yeongnyangi</a><a href={`/yeongnyangi/library/?lang=${locale}`}>{copy.library}</a><SessionControls compact/><LocaleSwitcher preservePath locale={locale}/></nav>
  <section className={heroStyles.hero} aria-labelledby="localized-home-title">
   <picture className={heroStyles.room}><source media="(max-width: 699px)" srcSet="/assets/yeongnyangi/night/consultation-room-mobile.webp"/><img src="/assets/yeongnyangi/night/consultation-room.webp" width={1440} height={960} alt="" fetchPriority="high"/></picture>
   <div className={heroStyles.copy}><h1 id="localized-home-title">{copy.title}</h1><p>{copy.pitch}</p><p>{copy.about}</p><div className={heroStyles.actions}><a className={heroStyles.primary} href={`/yeongnyangi/fortune/?lang=${locale}`}>{copy.start}</a><a className={heroStyles.secondary} href="#readings">{copy.depth}</a></div></div>
   <div className={heroStyles.character}><img src="/assets/yeongnyangi/original/hero-480.webp" width={480} height={480} alt="Yeongnyangi" fetchPriority="high"/></div>
  </section>
  <section className={styles.consultation}><h2>{relationship.entry}</h2><p>{relationship.description}</p><a href={`/yeongnyangi/fortune/?flow=relationship&lang=${locale}`}>{relationship.start}</a></section>
  <QuestionSkyEntry locale={locale}/>
  <section className={styles.consultation} id="readings"><h2>{copy.summary}</h2>{(Object.keys(offers) as DomainId[]).map(domain=><details key={domain}><summary>{localizedSystem(domain,locale)}</summary><LocalizedProductGuide domain={domain} offers={offers[domain]} locale={locale} surface="home_catalog"/></details>)}<a href={`/yeongnyangi/fortune/?domain=fusion&lang=${locale}`}>{localizedSystem('fusion',locale)}</a></section>
 </main>;
}
