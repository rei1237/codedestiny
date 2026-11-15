'use client';
import {useEffect,useRef,useState} from 'react';
import Image from 'next/image';
import {useTPick} from '@/lib/i18n/useT';
import {FREE_PROMO,FREE_PROMO_COPY_KO,FREE_PROMO_GROUPS,FREE_PROMO_FEATURED,FREE_PROMO_YEONI,freePromoDaysLeft,freePromoDayLabel,freePromoItemHref,freePromoEndDate} from '@/lib/marketing/free-promo.mjs';
import styles from './free-promo-banner.module.css';
type CopyKey=keyof typeof FREE_PROMO_COPY_KO;
export default function FreePromoBanner({className='',variant='default',compact=false,currentPath}: {className?:string;variant?:'default'|'yeongnyangi';compact?:boolean;currentPath?:string}) {
 const pick=useTPick(undefined,'ko');
 const t=(key:CopyKey)=>pick(`freePromo.${key}`,FREE_PROMO_COPY_KO[key])||FREE_PROMO_COPY_KO[key];
 const [days,setDays]=useState<number|null|undefined>(undefined),[status,setStatus]=useState('');
 const list=useRef<HTMLDetailsElement>(null);
 const titleId=variant==='yeongnyangi'?'freePromoTitleYeongnyangi':'freePromoTitle';
 const date=freePromoEndDate(FREE_PROMO.endsAt);
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>;
  const refresh=()=>{clearTimeout(timer);const next=freePromoDaysLeft(FREE_PROMO.endsAt,Date.now());setDays(next);if(next!==null)timer=setTimeout(refresh,Math.min(60000,Date.parse(FREE_PROMO.endsAt)-Date.now()+1));};
  refresh();window.addEventListener('pageshow',refresh);document.addEventListener('visibilitychange',refresh);
  return()=>{clearTimeout(timer);window.removeEventListener('pageshow',refresh);document.removeEventListener('visibilitychange',refresh);};
 },[]);
 if(days===null)return null;
 const expand=()=>{if(list.current){list.current.open=true;list.current.querySelector('summary')?.focus();list.current.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}};
 async function share(){
  const url=location.origin+FREE_PROMO.sharePath,text=t('shareText').replace('{date}',date);
  try{if(navigator.share){await navigator.share({title:document.title,text,url});return;}await navigator.clipboard.writeText(`${text}\n${url}`);setStatus(t('copied'));}
  catch(error){if((error as {name?:string}).name!=='AbortError')setStatus(t('copyFailed'));}
 }
 return <aside className={`${styles.banner} ${variant==='yeongnyangi'?styles.yeongnyangi:''} ${compact?styles.compact:''} ${className}`} aria-labelledby={titleId} data-cd-free-promo={FREE_PROMO.id} data-promo-variant={variant}>
  <div className={styles.head}>
   {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- legacy shell navigation */}
   <a className={styles.art} href={FREE_PROMO_YEONI.href} aria-label={t('cta')}>
    <Image src={FREE_PROMO_YEONI.image} width={960} height={640} sizes="(max-width:699px) 92vw, 440px" alt="달빛 정원에서 운세책을 펼치는 꽃돼지 연이"/>
    {variant==='yeongnyangi'&&<Image className={styles.companion} src="/assets/yeongnyangi/original/hero-480.webp" width={480} height={480} alt="영냥이"/>}
   </a>
   <div className={styles.lead}><p className={styles.meta}><span className={styles.badge}>{t('badge')}</span>{days!=null&&<span className={styles.dday}>{freePromoDayLabel(days)}</span>}</p>
   <h2 className={styles.title} id={titleId}>{t('title')}</h2><p className={styles.description}>{t('bubble')}</p>
   <div className={styles.actions}>{/* eslint-disable-next-line @next/next/no-html-link-for-pages -- legacy shell navigation */}<a className={styles.cta} href={FREE_PROMO.ctaHref}>{t('cta')}</a>{compact?<a className={styles.all} href="/ggulggul/#cdhFreePromoAll">{t('all')}</a>:<button type="button" className={styles.all} onClick={expand}>{t('all')}</button>}</div>
   <p className={styles.until}>{t('until').replace('{date}',date)}</p></div>
  </div>
  {!compact&&<><div className={styles.featured} aria-label="대표 무료 운세">{FREE_PROMO_FEATURED.map(item=><a className={styles.card} href={freePromoItemHref(item)} key={item.id} data-cd-service-id={item.serviceId} data-cd-free-promo-item={item.id}><Image src={item.image} width={320} height={213} sizes="(max-width:699px) 45vw, 180px" alt=""/><span className={styles.copy}><strong>{pick(`freePromo.item.${item.id}`,item.ko)}</strong><span className={styles.desc}>{pick(`freePromo.desc.${item.id}`,item.description)}</span><span className={styles.cardFoot}><span className={styles.free}>{t('tileBadge')}</span><span>{t('start')}</span></span></span></a>)}</div>
  <details className={styles.list} ref={list}><summary>{t('all')}</summary><div className={styles.groups}>{FREE_PROMO_GROUPS.map(group=><div key={group.id}><h3>{t(group.labelKey as CopyKey)}</h3><ul className={styles.chips}>{group.items.map(item=><li key={item.id}><a href={freePromoItemHref(item)} data-cd-free-promo-item={item.id} aria-current={currentPath===freePromoItemHref(item)?'page':undefined}><span>{pick(`freePromo.item.${item.id}`,item.ko)}</span><span aria-hidden="true">→</span></a></li>)}</ul></div>)}</div></details></>}
  <div className={styles.foot}><p className={styles.note}>{t('note')}</p><button type="button" className={styles.share} onClick={()=>{void share();}}>{t('share')}</button></div><p className={styles.status} role="status">{status}</p>
 </aside>;
}
