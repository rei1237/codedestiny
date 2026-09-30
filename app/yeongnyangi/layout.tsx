"use client";
import {useEffect,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import styles from './yeongnyangi.module.css';
import './_original/original.css';
import {useReadingLanguage} from './_lib/use-reading-language';
import {chromeCopy} from './_lib/chrome-copy';
import {LocaleSwitcher} from '@/app/components/LocaleSwitcher';
import {trackEvent} from '@/lib/analytics';
function usePortalArrival(pathname:string|null){
 useEffect(()=>{
  if(!pathname?.startsWith('/yeongnyangi')||typeof window==='undefined')return;
  const key='cd:yeongnyangi:portal-entry';
  let raw:string|null=null;
  try{raw=window.sessionStorage.getItem(key);if(raw)window.sessionStorage.removeItem(key);}catch{return;}
  if(!raw)return;
  let entry:{from?:unknown;placement?:unknown}|null=null;
  try{entry=JSON.parse(raw);}catch{entry=null;}
  trackEvent('yeongnyangi_portal_arrival',{
   service:'yeongnyangi',
   source:entry?.from==='ggulggul'?'ggulggul':'unknown',
   placement:typeof entry?.placement==='string'?entry.placement:'unknown',
   destination:window.location.pathname,
   metric_version:1,
  });
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
  const overlay=document.createElement('div');
  overlay.className=styles.portalArrival;
  overlay.setAttribute('aria-hidden','true');
  overlay.setAttribute('data-cd-portal-arrival','');
  document.body.appendChild(overlay);
  const timer=window.setTimeout(()=>overlay.remove(),620);
  return ()=>{window.clearTimeout(timer);overlay.remove();};
 },[pathname]);
}
export default function Layout({children}:{children:ReactNode}){
 const pathname=usePathname();
 usePortalArrival(pathname);
 const {siteLocale}=useReadingLanguage();
 const copy=chromeCopy(siteLocale);
 const pagePath=(pathname || '').replace(/\/index\.html$/, '/');
 if(['/yeongnyangi','/yeongnyangi/','/yeongnyangi/room','/yeongnyangi/room/'].includes(pagePath))return children;
 return <main className={styles.page} data-yn-night lang={siteLocale}><nav className={styles.nav} aria-label={copy.home}><a href={`/yeongnyangi/?lang=${siteLocale}`}>{copy.home}</a><div><a href={`/yeongnyangi/library/?lang=${siteLocale}`}>{copy.library}</a><a href={`/?lang=${siteLocale}`}>CODE DESTINY</a><LocaleSwitcher preservePath locale={siteLocale}/></div></nav>{children}<footer className={styles.footer}><p>Yeongnyangi · CODE DESTINY</p><a href={`/terms/?lang=${siteLocale}`}>{copy.terms}</a> · <a href={`/privacy-policy/?lang=${siteLocale}`}>{copy.privacy}</a> · <a href={`/refund-policy/?lang=${siteLocale}`}>{copy.refund}</a> · <a href={`/contact/?lang=${siteLocale}`}>{copy.contact}</a></footer></main>;
}
