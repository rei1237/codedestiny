"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import {Copy,Download,MessageCircle,Share2} from 'lucide-react';
import {prepareKakao,shareThrough} from '@/js/share-service.mjs';
import type {FortuneRecord} from '../_lib/api';
import {consultationShareUrl,consultationShareImage,shareChoices,shareLimit,shareMessage,shorten,renderShareCard} from '../_lib/result-share';
import styles from '../yeongnyangi.module.css';

export default function ResultSharing({row}:{row:FortuneRecord}){
 const choices=useMemo(()=>shareChoices(row),[row]);
 const [open,setOpen]=useState(false),[choice,setChoice]=useState(choices[0]?.id||'');
 const selected=choices.find(c=>c.id===choice)||choices[0];
 const [text,setText]=useState(()=>shorten(selected?.text||'',shareLimit)),[includeQuestion,setIncludeQuestion]=useState(false);
 const [notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[card,setCard]=useState<{url:string;blob:Blob}|null>(null),[imageError,setImageError]=useState(false);
 const lock=useRef(false),manual=useRef<HTMLTextAreaElement>(null);
 const asOf=row.consultation?.asOf;
 const sharedText=[includeQuestion&&selected?.question?`내 질문\n${selected.question}`:'',text.trim()].filter(Boolean).join('\n\n');
 const message=shareMessage(sharedText,asOf);
 const kakaoText=shorten(text.replace(/\s+/g,' '),95);
 useEffect(()=>{if(open)void prepareKakao(process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY);},[open]);
 useEffect(()=>{
  if(!open)return;
  let cancelled=false,url='';setCard(null);setImageError(false);
  const timer=setTimeout(()=>{void renderShareCard(sharedText,asOf).then(blob=>{if(cancelled)return;url=URL.createObjectURL(blob);setCard({url,blob});}).catch(()=>{if(!cancelled)setImageError(true);});},250);
  return ()=>{cancelled=true;clearTimeout(timer);if(url)URL.revokeObjectURL(url);};
 },[open,sharedText,asOf]);
 if(!choices.length)return null;
 async function copy(){try{await navigator.clipboard.writeText(`${message}\n\n${consultationShareUrl}`);setNotice('상담 문구를 복사했어. 원하는 대화방에 붙여 넣어줘.');}catch{setNotice('아래 공유 문구를 길게 눌러 복사해줘.');const details=manual.current?.closest('details');if(details)details.open=true;manual.current?.focus();manual.current?.select();}}
 function download(){if(!card)return;const link=document.createElement('a');link.href=card.url;link.download='영냥이-상담-한장.png';link.click();setNotice('이미지를 저장했어. 대화방에서 사진으로 첨부해줘.');}
 async function share(channel:'kakao'|'native'|'image'){
  if(lock.current)return;lock.current=true;setBusy(true);setNotice('');
  try{
   if(channel==='image'){
    if(!card)return;
    const file=new File([card.blob],'영냥이-상담-한장.png',{type:'image/png'});
    if(navigator.canShare?.({files:[file]})&&navigator.share){await navigator.share({files:[file],title:'영냥이 상담 한 장'});setNotice('공유 창에서 선택한 동작을 마쳤어.');}
    else download();
    return;
   }
   const outcome=await shareThrough(channel,{title:'영냥이가 읽어준 내 이야기',text:channel==='kakao'?kakaoText:message,url:consultationShareUrl,image:consultationShareImage});
   if(outcome.status==='opened')setNotice('카카오톡에서 보낼 친구나 단톡방을 골라줘.');
   else if(outcome.status==='shared')setNotice('공유 창에서 선택한 동작을 마쳤어.');
   else if(outcome.status==='cancelled')setNotice('공유를 취소했어. 상담은 그대로 남아 있어.');
   else {await copy();setNotice('공유 창을 열지 못했어. 아래 문구를 복사하거나 이미지를 저장해 대화방에 보내줘.');}
  }catch(e){setNotice(e instanceof Error&&e.name==='AbortError'?'공유를 취소했어. 상담은 그대로 남아 있어.':'공유 창을 열지 못했어. 문구 복사나 이미지 저장으로 다시 시도해줘.');}
  finally{lock.current=false;setBusy(false);}
 }
 return <details className={styles.resultSharing} onToggle={e=>setOpen(e.currentTarget.open)}>
  <summary><Share2 size={20} aria-hidden="true"/> 마음에 남은 상담 공유하기</summary>
  {open&&<div className={styles.shareEditor}>
   <div className={styles.shareForm}>
    <h2>친구에게 건네는 상담 한 장</h2><p>보내고 싶은 이야기만 골라 다듬어줘. 링크는 영냥이 상담 시작 화면으로 이어져.</p>
    <label htmlFor="share-story">공유할 이야기</label><select id="share-story" value={choice} onChange={e=>{setChoice(e.target.value);setIncludeQuestion(false);setText(shorten(choices.find(c=>c.id===e.target.value)?.text||'',shareLimit));setNotice('');}}>{choices.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select>
    <label htmlFor="share-message">보낼 문구</label><textarea id="share-message" value={text} maxLength={shareLimit} rows={7} onChange={e=>setText(e.target.value)}/>
    <small>{Array.from(text).length} / {shareLimit}자 · 보내기 전에 개인적인 내용이 있는지 확인해줘.</small>
    {selected.question&&<label className={styles.shareQuestion}><input type="checkbox" checked={includeQuestion} onChange={e=>setIncludeQuestion(e.target.checked)}/> 원문 질문도 이미지·문구에 포함하기</label>}
    <p className={styles.kakaoExcerpt}>카카오톡 카드 미리보기: {kakaoText||'보낼 문구를 입력해줘.'}</p>
    <div className={styles.shareActions}>
     <button type="button" disabled={busy||!text.trim()} onClick={()=>void share('kakao')}><MessageCircle size={18} aria-hidden="true"/>카카오톡 요약 보내기</button>
     <button type="button" disabled={busy||!text.trim()} onClick={()=>void share('native')}><Share2 size={18} aria-hidden="true"/>문구 공유</button>
     <button type="button" disabled={busy||!text.trim()} onClick={()=>void copy()}><Copy size={18} aria-hidden="true"/>문구 복사</button>
     <button type="button" disabled={busy||!card||!text.trim()} onClick={()=>void share('image')}><Share2 size={18} aria-hidden="true"/>이미지로 공유</button>
     <button type="button" disabled={busy||!card||!text.trim()} onClick={download}><Download size={18} aria-hidden="true"/>이미지 저장</button>
    </div>
    <p role="status" aria-live="polite">{notice||'긴 문구는 이미지로 보내면 단톡방에서도 한눈에 읽기 좋아.'}</p>
    <details><summary>복사용 전체 문구</summary><textarea ref={manual} aria-label="복사용 전체 공유 문구" readOnly rows={8} value={`${message}\n\n${consultationShareUrl}`} onFocus={e=>e.target.select()}/></details>
   </div>
   <figure className={styles.sharePreview}>{card?<img src={card.url} alt="보내기 전 확인하는 영냥이 상담 이미지" width={1080} height={1350}/>:<p role="status">{imageError?'이미지를 준비하지 못했어. 문구로 공유할 수 있어.':'영냥이가 공유할 한 장을 준비하고 있어.'}</p>}<figcaption>이미지에는 위 문구와 선택한 질문만 담겨요.</figcaption></figure>
  </div>}
 </details>;
}
