"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import {Copy,Download,MessageCircle,Share2} from 'lucide-react';
import {prepareKakao,shareThrough} from '@/js/share-service.mjs';
import {trackEvent} from '@/lib/analytics';
import type {FortuneRecord} from '../_lib/api';
import type {FreeReading} from '@/worker/yeongnyangi/fortune/free/categories';
import {resultShareUrl,consultationShareImage,shareChoices,freeShareChoices,shareLimit,shareMessage,shorten,renderShareCard} from '../_lib/result-share';
import {shareCopy} from '../_lib/share-copy';
import styles from '../yeongnyangi.module.css';

export default function ResultSharing({row,reading}:{row:FortuneRecord;reading?:never}|{reading:FreeReading;row?:never}){
 const locale=row?.locale||'ko',copyText=shareCopy(locale);
 const choices=useMemo(()=>row?shareChoices(row):freeShareChoices(reading,locale),[row,reading,locale]);
 const [open,setOpen]=useState(false),[choice,setChoice]=useState(choices[0]?.id||'');
 const selected=choices.find(c=>c.id===choice)||choices[0];
 const [text,setText]=useState(()=>shorten(selected?.text||'',shareLimit)),[includeQuestion,setIncludeQuestion]=useState(false);
 const [notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[card,setCard]=useState<{url:string;blob:Blob}|null>(null),[imageError,setImageError]=useState(false);
 const lock=useRef(false),manual=useRef<HTMLTextAreaElement>(null);
 const asOf=row?.consultation?.asOf||reading?.day;
 const consultationShareUrl=resultShareUrl(row);
 const source=row?'paid':'daily';
 const record=(channel:string,outcome:string)=>trackEvent('fortune_share_action',{content_type:'yeongnyangi',source,channel,outcome});
 const sharedText=[includeQuestion&&selected?.question?`${copyText.question}\n${selected.question}`:'',text.trim()].filter(Boolean).join('\n\n');
 const message=shareMessage(sharedText,asOf,locale);
 const kakaoText=shorten(text.replace(/\s+/g,' '),95);
 useEffect(()=>{if(open)void prepareKakao(process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY);},[open]);
 useEffect(()=>{
  if(!open)return;
  let cancelled=false,url='';setCard(null);setImageError(false);
  const timer=setTimeout(()=>{void renderShareCard(sharedText,asOf,locale).then(blob=>{if(cancelled)return;url=URL.createObjectURL(blob);setCard({url,blob});}).catch(()=>{if(!cancelled)setImageError(true);});},250);
  return ()=>{cancelled=true;clearTimeout(timer);if(url)URL.revokeObjectURL(url);};
 },[open,sharedText,asOf,locale]);
 if(!choices.length)return null;
 async function copy(){try{await navigator.clipboard.writeText(`${message}\n\n${consultationShareUrl}`);record('copy','copied');setNotice(copyText.copied);}catch{record('copy','manual');setNotice(copyText.copyManual);const details=manual.current?.closest('details');if(details)details.open=true;manual.current?.focus();manual.current?.select();}}
 function download(){if(!card)return;const link=document.createElement('a');link.href=card.url;link.download='yeongnyangi-reading.png';link.click();record('image','download_requested');setNotice(copyText.downloaded);}
 async function share(channel:'kakao'|'native'|'image'){
  if(lock.current)return;lock.current=true;setBusy(true);setNotice('');
  try{
   if(channel==='image'){
    if(!card)return;
    const file=new File([card.blob],'yeongnyangi-reading.png',{type:'image/png'});
    if(navigator.canShare?.({files:[file]})&&navigator.share){await navigator.share({files:[file],title:copyText.imageTitle,text:copyText.heading,url:resultShareUrl(row,'image')});record('image','shared');setNotice(copyText.shared);}
    else download();
    return;
   }
   const outcome=await shareThrough(channel,{title:`${copyText.heading} · Yeongnyangi`,text:channel==='kakao'?kakaoText:message,url:resultShareUrl(row,channel),image:consultationShareImage});
   record(channel,outcome.status);
   if(outcome.status==='opened')setNotice(copyText.opened);
   else if(outcome.status==='shared')setNotice(copyText.shared);
   else if(outcome.status==='cancelled')setNotice(copyText.cancelled);
   else {await copy();setNotice(copyText.fallback);}
  }catch(e){record(channel,e instanceof Error&&e.name==='AbortError'?'cancelled':'failed');setNotice(e instanceof Error&&e.name==='AbortError'?copyText.cancelled:copyText.failed);}
  finally{lock.current=false;setBusy(false);}
 }
 return <details className={styles.resultSharing} data-consultation-sharing lang={locale} onToggle={e=>{setOpen(e.currentTarget.open);if(e.currentTarget.open)record('editor','opened');}}>
  <summary><Share2 size={20} aria-hidden="true"/> {copyText.summary}</summary>
  {open&&<div className={styles.shareEditor}>
   <div className={styles.shareForm}>
    <h2>{copyText.heading}</h2><p>{row?copyText.paidHint:copyText.freeHint}</p>
    <label htmlFor="share-story">{copyText.story}</label><select id="share-story" value={choice} onChange={e=>{setChoice(e.target.value);setIncludeQuestion(false);setText(shorten(choices.find(c=>c.id===e.target.value)?.text||'',shareLimit));setNotice('');}}>{choices.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select>
    <label htmlFor="share-message">{copyText.message}</label><textarea id="share-message" value={text} maxLength={shareLimit} rows={4} onChange={e=>setText(e.target.value)}/>
    <small>{Array.from(text).length} / {shareLimit} · {copyText.privacy}</small>
    <button className={styles.shareShorten} type="button" disabled={busy||Array.from(text).length<=180} onClick={()=>setText(shorten(text,180))}>{copyText.shorten}</button>
    {selected.question&&<label className={styles.shareQuestion}><input type="checkbox" checked={includeQuestion} onChange={e=>setIncludeQuestion(e.target.checked)}/> {copyText.includeQuestion}</label>}
    <p className={styles.kakaoExcerpt}>{copyText.preview}: {kakaoText||copyText.enter}</p>
    <div className={styles.shareActions}>
     <button type="button" disabled={busy||!text.trim()} onClick={()=>void share('kakao')}><MessageCircle size={18} aria-hidden="true"/>{copyText.kakao}</button>
     <button type="button" disabled={busy||!text.trim()} onClick={()=>void share('native')}><Share2 size={18} aria-hidden="true"/>{copyText.native}</button>
     <button type="button" disabled={busy||!text.trim()} onClick={()=>void copy()}><Copy size={18} aria-hidden="true"/>{copyText.copy}</button>
     <button type="button" disabled={busy||!card||!text.trim()} onClick={()=>void share('image')}><Share2 size={18} aria-hidden="true"/>{copyText.image}</button>
     <button type="button" disabled={busy||!card||!text.trim()} onClick={download}><Download size={18} aria-hidden="true"/>{copyText.save}</button>
    </div>
    <p role="status" aria-live="polite">{notice||copyText.tip}</p>
    <details><summary>{copyText.manual}</summary><textarea ref={manual} aria-label={locale==='ko'?'복사용 전체 공유 문구':copyText.manual} readOnly rows={8} value={`${message}\n\n${consultationShareUrl}`} onFocus={e=>e.target.select()}/></details>
   </div>
   <figure className={styles.sharePreview}>{card?<img src={card.url} alt={copyText.previewAlt} width={1080} height={1350}/>:<p role="status">{imageError?copyText.imageError:copyText.imageLoading}</p>}<figcaption>{copyText.imageCaption}</figcaption></figure>
  </div>}
 </details>;
}
