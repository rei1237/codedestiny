import {useEffect,useState} from 'react';
import {getZiweiDeepPdfCopy} from '@/app/components/ziwei/_lib/ziwei-deep-pdf-copy';
import {getPremiumZiweiCopy} from '@/app/components/ziwei/_lib/advanced-ziwei-copy';
import {ZiweiDeepChapters} from '@/app/components/ziwei/ZiweiDeepChapters';
import type {ZiweiReportChapter} from '@/lib/pdf/ziwei-report-plan';
import {Button} from './Button';
import {api,getTossSessionRevision} from './platform';
import {saveReportPdf} from './media';
import type {BirthInput} from './BirthFields';
import {useOwnedChapterDelivery} from './useOwnedChapterDelivery';
import NativeChapterPurchase from './NativeChapterPurchase';

const copy=getZiweiDeepPdfCopy('ko'),label='자미두수 심층 리포트',feature='ziwei-deep-pdf';
type Draft={focus:string;question:string};
type Report={status:string;chapters:ZiweiReportChapter[];totalChapters?:number;reportMeta?:{label:string;generatedAt:string}};
function draftFrom(key:string):Draft{
  try{const d=JSON.parse(localStorage.getItem(key)||'null');if(d&&Object.hasOwn(copy.focusOptions,d.focus)&&typeof d.question==='string')return d;}catch{/* New form remains available. */}
  return {focus:'overall',question:''};
}
export function ZiweiDeepOffer({birth,owner,onLogin}:{birth:BirthInput;owner:string;onLogin:()=>void}){
  const key='toss.ziwei-deep.draft.'+owner;
  const [draft,setDraft]=useState(()=>draftFrom(key));
  const payload={focusArea:draft.focus,topic:copy.focusOptions[draft.focus as keyof typeof copy.focusOptions],question:draft.question.trim(),
    birthInfo:{name:'',gender:birth.gender==='F'?'female':'male',birthDate:birth.date,birthTime:birth.unknown?'':birth.time,birthTimeUnknown:birth.unknown,calendarType:birth.calendar==='solar'?'solar':'lunar',isLeapMonth:birth.calendar==='lunar_leap'}};
  function change(value:Draft){setDraft(value);try{localStorage.setItem(key,JSON.stringify(value));}catch{/* Storage optional until checkout. */}}
  return <section className="form"><h2>{label}</h2><p>열두 궁과 사화, 대한의 흐름을 관심 분야와 함께 열다섯 장으로 읽어요.</p>
    <label>관심 분야<select value={draft.focus} onChange={e=>change({...draft,focus:e.target.value})}>{Object.entries(copy.focusOptions).map(([id,text])=><option key={id} value={id}>{text}</option>)}</select></label>
    <label>궁금한 질문<textarea value={draft.question} maxLength={1200} rows={4} placeholder={copy.questionPlaceholder} onChange={e=>change({...draft,question:e.target.value})}/></label>
    {draft.focus==='custom'&&draft.question.trim().length<2&&<p>{copy.errorText.CUSTOM_QUESTION_REQUIRED}</p>}
    <NativeChapterPurchase service="ziwei-deep" feature={feature} prefix="zwdp" route="/ziwei/chart" owner={owner} onLogin={onLogin}
      disabled={draft.focus==='custom'&&draft.question.trim().length<2} keyInput={[payload]} makePayload={id=>({...payload,idempotencyKey:id})}/></section>;
}
export function ZiweiDeepDelivery({id}:{id:string}){
  const {data,busy,error,retry}=useOwnedChapterDelivery<Report>('/native/ziwei-deep/results/'+id);
  const [saving,setSaving]=useState(false),[message,setMessage]=useState('');
  async function save(){
    if(data?.status!=='completed'||saving)return;const revision=getTossSessionRevision();setSaving(true);setMessage('');
    try{
      const {exportZiweiReportPdf}=await import('@/lib/pdf/export-ziwei-report-pdf');
      const date=(data.reportMeta?.generatedAt||'').slice(0,10);
      await exportZiweiReportPdf({chapters:data.chapters,title:data.reportMeta?.label||label,date,fileName:label+'_'+date+'.pdf',
        savePdfData:async(bytes,name)=>{if(revision!==getTossSessionRevision())throw Error('SESSION_CHANGED');await saveReportPdf(bytes,name);}});
      if(revision===getTossSessionRevision())setMessage('PDF 저장 요청을 마쳤어요.');
    }catch{if(revision===getTossSessionRevision())setMessage(copy.pdfDownloadError);}
    finally{if(revision===getTossSessionRevision())setSaving(false);}
  }
  return <section><h1>{label}</h1><p role="status">{data?.chapters?.length||0} / {data?.totalChapters||15}개 장 저장</p>
    {error&&<p role="alert">{error}</p>}{data?.status==='generation_failed'?<p>구매 기록에서 생성 상태를 확인해 주세요.</p>:data?.status!=='completed'&&<Button onClick={retry} disabled={busy}>같은 주문 이어서 열기</Button>}
    <ZiweiDeepChapters chapters={data?.chapters||[]} openLabel={getPremiumZiweiCopy('ko').chapterOpen}/>
    {data?.status==='completed'&&<Button disabled={saving} onClick={()=>void save()}>{saving?copy.pdfDownloadButtonSaving:copy.pdfDownloadButtonIdle}</Button>}{message&&<p role="status">{message}</p>}
    <a href="/library">꿀꿀운세 구매 기록</a></section>;
}
export function useZiweiOwner(loggedIn:boolean){
  const [owner,setOwner]=useState(''),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
  useEffect(()=>{if(!loggedIn)return;let live=true;setFailed(false);
    api<{user:{id:string}}>('/canonical/auth/me').then(r=>{if(!r.user?.id)throw Error();if(live)setOwner(r.user.id);}).catch(()=>{if(live)setFailed(true);});
    return()=>{live=false;};
  },[loggedIn,retry]);
  return {owner:loggedIn?owner:'guest',failed,retry:()=>setRetry(n=>n+1)};
}

