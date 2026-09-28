"use client";
import {useEffect,useId,useRef,useState} from 'react';
import {Share2} from 'lucide-react';
import {trackEvent} from '@/lib/analytics';
import {INSIGHT_BRANDS,INSIGHT_LIMIT,INSIGHT_LOCALES,insightDigest,insightPath,insightOgPath,insightAudience,projectInsight} from '@/lib/insight-card.mjs';
import {getInsightCopy} from '@/lib/insight-card-copy';
import {renderInsightImage} from '@/lib/insight-card-image';
import {insightArtwork} from '@/lib/insight-art.mjs';
import styles from './PublicInsightCard.module.css';

type Choice = {id:string;label:string;text:string};
type Saved = {id:string;token:string;brand:string;expiresAt:string};
const storageKey='cd:public-insight-links:v1';
function savedLinks():Saved[] { const value=JSON.parse(localStorage.getItem(storageKey)||'[]'); return Array.isArray(value)?value.filter(x=>x&&/^ic_[a-f0-9]{40}$/.test(x.id)&&/^[a-f0-9]{64}$/.test(x.token)&&Date.parse(x.expiresAt)>Date.now()):[]; }
export default function PublicInsightCard({brand,choices,source,day,locale='ko'}:{brand:keyof typeof INSIGHT_BRANDS;choices:Choice[];source:'paid'|'daily'|'free';day?:string;locale?:string}) {
  const copy=getInsightCopy(locale), uid=useId(), lock=useRef(false);
  const [open,setOpen]=useState(false),[choice,setChoice]=useState(''),[text,setText]=useState(''),[consent,setConsent]=useState(false);
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[links,setLinks]=useState<Saved[]>([]),[active,setActive]=useState<Saved|null>(null);
  const [manual,setManual]=useState('');
  const [story,setStory]=useState(false),[image,setImage]=useState('');
  const [imageState,setImageState]=useState('idle'),[imageRetry,setImageRetry]=useState(0);
  const readingDay=day||new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const record=(stage:string,channel='editor')=>trackEvent('insight_share_action',{service:insightAudience(brand),content_type:brand,source,stage,channel});
  useEffect(()=>{try{setLinks(savedLinks());}catch{/* Creation explicitly refuses if durable revocation storage is unavailable. */}},[]);
  useEffect(()=>{if(choices.length&&INSIGHT_LOCALES.includes(locale))trackEvent('insight_share_available',{service:insightAudience(brand),content_type:brand,source});},[brand,source,locale,choices.length]);
  useEffect(()=>{setConsent(false);setActive(null);setManual('');},[text,choice,brand,readingDay]);
  useEffect(()=>{
    let cancelled=false,url='';setImage('');setImageState('idle');
    if(!open||!text.trim()||text.length>INSIGHT_LIMIT)return;
    setImageState('loading');
    const timer=setTimeout(()=>{void renderInsightImage(text.trim(),INSIGHT_BRANDS[brand],readingDay,story,brand).then(blob=>{if(!cancelled){url=URL.createObjectURL(blob);setImage(url);setImageState('ready');}}).catch(()=>{if(!cancelled){setImageState('error');trackEvent('insight_share_action',{service:insightAudience(brand),stage:'image_failed'});}});},250);
    return()=>{cancelled=true;clearTimeout(timer);if(url)URL.revokeObjectURL(url);};
  },[open,text,brand,readingDay,story,imageRetry]);
  if(!choices.length||!INSIGHT_LOCALES.includes(locale))return null;
  const publicDraft={brand,source,day:readingDay,text:text.trim(),locale,consent:true};
  const valid=Boolean(projectInsight(publicDraft));
  async function create() {
    if(lock.current||!consent||!valid)return;
    lock.current=true;setBusy(true);setNotice('');
    try {
      const bytes=crypto.getRandomValues(new Uint8Array(32));
      const token=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
      const id='ic_'+(await insightDigest(token)).slice(0,40);
      const entry={id,token,brand,expiresAt:new Date(Date.now()+30*86400000).toISOString()};
      // Persist the revoke key BEFORE publication; a dropped response must not strand the link.
      try{const next=[...savedLinks(),entry];localStorage.setItem(storageKey,JSON.stringify(next));setLinks(next);}
      catch{setNotice(copy.storage);record('storage_failed');return;}
      const response=await fetch('/api/fortune/cards',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',signal:AbortSignal.timeout(10000),body:JSON.stringify({...publicDraft,consent,token})});
      if(!response.ok)throw new Error('CREATE_FAILED');
      const snapshot=await response.json();if(snapshot.id!==id)throw new Error('INVALID_RESPONSE');
      setActive(entry);setNotice(copy.ready);record('created');
    }catch{setNotice(copy.failure);record('create_failed');}finally{setBusy(false);lock.current=false;}
  }
  async function revoke(entry:Saved) {
    if(lock.current)return;lock.current=true;setBusy(true);
    try {
      const response=await fetch('/api/fortune/cards/'+entry.id,{method:'DELETE',credentials:'omit',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json'},body:JSON.stringify({token:entry.token})});
      if(!response.ok)throw new Error('REVOKE_FAILED');
      const next=savedLinks().filter(x=>x.id!==entry.id);localStorage.setItem(storageKey,JSON.stringify(next));setLinks(next);
      if(active?.id===entry.id){setActive(null);setManual('');}setNotice(copy.revoked);record('revoked');
    }catch{setNotice(copy.failure);record('revoke_failed');}finally{lock.current=false;setBusy(false);}
  }
  async function send(channel:'native'|'copy') {
    if(!active||lock.current)return;lock.current=true;setBusy(true);
    const url=new URL(insightPath(active.id,brand,channel),window.location.origin).href;
    try {
      if(channel==='native'&&navigator.share){await navigator.share({title:INSIGHT_BRANDS[brand],text:text.trim(),url});setNotice(copy.returned);record('share_returned',channel);}
      else{await navigator.clipboard.writeText(url);setNotice(copy.copied);record('copied',channel);}
    }catch(e){if(e instanceof Error&&e.name==='AbortError'){setNotice(copy.cancelled);record('cancelled',channel);}else{setManual(url);setNotice(copy.manual);record('manual_copy',channel);}}
    finally{lock.current=false;setBusy(false);}
  }
  return <details className={styles.root} data-public-insight={brand} open={open} onToggle={e=>{const value=e.currentTarget.open;setOpen(value);if(value&&!open)record('preview_opened');}}>
    <summary><img className={styles.summaryArt} src={insightArtwork(brand)} width={64} height={64} alt=""/><span>{copy.open}</span><Share2 size={18} aria-hidden="true"/></summary>
    {open&&<>
      <p>{copy.intro}</p><p className={styles.hint}>{copy.privacy}</p>
      <label htmlFor={uid+'-choice'}>{copy.prompt}</label>
      <select id={uid+'-choice'} disabled={busy||Boolean(active)} value={choice} onChange={e=>{setChoice(e.target.value);setText((choices.find(c=>c.id===e.target.value)?.text||'').replace(/\s+/g,' ').trim());setConsent(false);}}>
        <option value="">—</option>{choices.map(c=><option value={c.id} key={c.id}>{c.label}</option>)}
      </select>
      {choice&&<><p className={styles.hint}>{choices.find(c=>c.id===choice)?.text}</p>
        <label htmlFor={uid+'-line'}>{copy.open}</label><textarea id={uid+'-line'} rows={4} disabled={busy||Boolean(active)} value={text} onChange={e=>setText(e.target.value)} maxLength={240}/>
        <span className={styles.hint}>{text.length} / {INSIGHT_LIMIT}</span></>}
      <figure className={styles.preview} aria-label={copy.preview}>
        <figcaption className={image?styles.srOnly:undefined}>{INSIGHT_BRANDS[brand]} · {copy.date} {readingDay}</figcaption><blockquote className={image?styles.srOnly:undefined}>{text||copy.prompt}</blockquote>
        {image&&<img src={image} className={styles.localImage} width={1080} height={story?1920:1080} alt=""/>}
        <p className={styles.hint}>{copy.disclaimer}</p>
        {active&&<img src={insightOgPath(publicDraft)} width={1200} height={630} alt={copy.preview} onError={()=>record('preview_image_failed')}/>}
      </figure>
      {!active&&<><label><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/>{copy.consent}</label>
        {text&&!valid&&<p role="status">{copy.invalid}</p>}
        <button type="button" disabled={busy||!consent||!valid} onClick={()=>void create()}>{copy.create}</button></>}
      {active&&<div className={styles.actions}><button type="button" disabled={busy} onClick={()=>void send('copy')}>{copy.copy}</button><button type="button" disabled={busy} onClick={()=>void send('native')}>{copy.native}</button></div>}
      <p className={styles.hint}>{copy.expiry}</p><p role="status" aria-live="polite">{notice}</p>
      {valid&&<><label htmlFor={uid+'-format'}>{copy.format}</label>
        <select id={uid+'-format'} value={story?'story':'square'} onChange={e=>setStory(e.target.value==='story')}><option value="square">1:1</option><option value="story">9:16 · Story</option></select>
        {imageState==='loading'&&<p role="status">{copy.imageLoading}</p>}
        {imageState==='error'&&<><p role="status">{copy.imageError}</p><button type="button" onClick={()=>setImageRetry(x=>x+1)}>{copy.retry}</button></>}
        <button type="button" disabled={!image||!consent||busy} onClick={()=>{const anchor=document.createElement('a');anchor.href=image;anchor.download='code-destiny-insight.png';anchor.click();record('download_requested','image');}}>{copy.save}</button>
      </>}
      {manual&&<input aria-label={copy.manual} type="text" readOnly value={manual} onFocus={e=>e.target.select()}/>}
      {links.length>0&&<details><summary>{copy.manage} ({links.length})</summary><ul className={styles.saved}>{links.map(entry=><li key={entry.id}>{INSIGHT_BRANDS[entry.brand as keyof typeof INSIGHT_BRANDS]} · {entry.expiresAt.slice(0,10)} <button type="button" disabled={busy} onClick={()=>void revoke(entry)}>{copy.revoke}</button></li>)}</ul></details>}
      <button type="button" disabled={busy} onClick={()=>{setOpen(false);setConsent(false);record('closed');}}>{copy.cancel}</button>
    </>}
  </details>;
}
