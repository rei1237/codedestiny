"use client";
import {useEffect,useState} from 'react';
import {INSIGHT_ID,INSIGHT_BRANDS,INSIGHT_LOCALES,insightAudience} from '@/lib/insight-card.mjs';
import {getInsightCopy} from '@/lib/insight-card-copy';
import {trackEvent} from '@/lib/analytics';
import {insightArtwork} from '@/lib/insight-art.mjs';
import styles from '@/components/fortune/PublicInsightCard.module.css';
type Card={id:string;brand:keyof typeof INSIGHT_BRANDS;text:string;day:string;locale:string;source:string};
export default function InsightCardClient({id}:{id:string}) {
  const [card,setCard]=useState<Card|null>(null),[state,setState]=useState('loading'),[retry,setRetry]=useState(0);
  const copy=getInsightCopy(card?.locale||'ko');
  useEffect(()=>{
    let cancelled=false;setCard(null);setState('loading');
    if(!INSIGHT_ID.test(id)){setState('missing');return;}
    const read=async()=>{
      setCard(null);setState('loading');
      try {
        const response=await fetch('/api/fortune/cards/'+id,{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(10000)});
        if(cancelled)return;
        if(response.status===404){setState('missing');return;}
        if(!response.ok)throw new Error('UNAVAILABLE');
        const result=await response.json();
        if(cancelled)return;
        if(result.id!==id||!Object.hasOwn(INSIGHT_BRANDS,result.brand)||!INSIGHT_LOCALES.includes(result.locale)||typeof result.text!=='string')throw new Error('INVALID_CARD');
        setCard(result);setState('ready');trackEvent('insight_share_receive',{service:insightAudience(result.brand),content_type:result.brand,source:result.source});
      }catch{if(!cancelled)setState('error');}
    };
    void read();const refresh=(event:PageTransitionEvent)=>{if(event.persisted)void read();};
    window.addEventListener('pageshow',refresh);
    return()=>{cancelled=true;window.removeEventListener('pageshow',refresh);};
  },[id,retry]);
  const trial='/today/?utm_medium=share&utm_source=card&utm_campaign=insight_'+(card?insightAudience(card.brand):'ggulggul')+'#daily-tarot';
  return <main className={styles.landing} lang={card?.locale||'ko'}><p className={styles.wordmark}>CODE DESTINY</p><article className={styles.receiver}>
    <h1>{state==='ready'?copy.received:state==='missing'?copy.missing:state==='error'?copy.error:'카드를 불러오는 중이에요.'}</h1>
    {card&&<><figure className={styles.postcard}><figcaption>{INSIGHT_BRANDS[card.brand]}<time>{card.day}</time></figcaption><blockquote>{card.text}</blockquote><div className={styles.artWindow}><img src={insightArtwork(card.brand)} width={1080} height={1080} alt="" fetchPriority="high"/></div></figure><p className={styles.context}>{copy.context}</p></>}
    {state==='error'&&<button type="button" onClick={()=>setRetry(x=>x+1)}>{copy.retry}</button>}
    {state!=='loading'&&<><p className={styles.context}>{copy.free}</p><a className={styles.trial} href={trial} onClick={()=>trackEvent('insight_trial_click',{service:card?insightAudience(card.brand):'ggulggul',content_type:card?.brand||'unknown'})}>{copy.cta}<span aria-hidden="true"> →</span></a><p className={styles.hint}>{copy.disclaimer}</p></>}
  </article></main>;
}
