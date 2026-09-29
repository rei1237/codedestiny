"use client";
import type {ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import styles from './yeongnyangi.module.css';
import './_original/original.css';
import {useReadingLanguage} from './_lib/use-reading-language';
import {chromeCopy} from './_lib/chrome-copy';
import {LocaleSwitcher} from '@/app/components/LocaleSwitcher';
export default function Layout({children}:{children:ReactNode}){
 const pathname=usePathname();
 const {siteLocale}=useReadingLanguage();
 const copy=chromeCopy(siteLocale);
 if(['/yeongnyangi','/yeongnyangi/','/yeongnyangi/room','/yeongnyangi/room/'].includes(pathname || ''))return children;
 return <main className={styles.page} data-yn-night lang={siteLocale}><nav className={styles.nav} aria-label={copy.home}><a href={`/yeongnyangi/?lang=${siteLocale}`}>{copy.home}</a><div><a href={`/yeongnyangi/library/?lang=${siteLocale}`}>{copy.library}</a><a href={`/?lang=${siteLocale}`}>CODE DESTINY</a><LocaleSwitcher preservePath locale={siteLocale}/></div></nav>{children}<footer className={styles.footer}><p>Yeongnyangi · CODE DESTINY</p><a href={`/terms/?lang=${siteLocale}`}>{copy.terms}</a> · <a href={`/privacy-policy/?lang=${siteLocale}`}>{copy.privacy}</a> · <a href={`/refund-policy/?lang=${siteLocale}`}>{copy.refund}</a> · <a href={`/contact/?lang=${siteLocale}`}>{copy.contact}</a></footer></main>;
}
