'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {BookOpen,Download,ExternalLink} from 'lucide-react';
import type {FortuneRecord} from '../_lib/api';
import {buildYeongnyangiReportPlan,readingReportAppendices} from '@/lib/pdf/yeongnyangi-report-plan';
import type {ReadingPdfPhase,ReadingPdfProgress,ReadingPdfResult} from '@/lib/pdf/export-yeongnyangi-report-pdf';
import styles from './fusion-book.module.css';

export function FusionBookIntroduction({row}:{row:FortuneRecord}){
 if((row.product.readingKind==='single'&&row.product.fishId!=='tuna')||row.locale&&row.locale!=='ko')return null;
 return <header className={styles.introduction}><BookOpen size={28} aria-hidden="true"/><div><h2>질문의 답부터, 나를 이해하는 한 권까지</h2><p>먼저 답을 읽고, 궁금한 운세와 삶의 영역을 골라 펼쳐 보세요. 완성된 챕터부터 이어 읽을 수 있어요.</p><a href="#fusion-book-export">개인 상담서 PDF 확인하기</a></div></header>;
}
export default function FusionBookExtras({row}:{row:FortuneRecord}){
 if((row.product.readingKind==='single'&&row.product.fishId!=='tuna')||row.locale&&row.locale!=='ko')return null;
 return <FusionBookContent key={row.id} row={row}/>;
}
const loadExporter=()=>import('@/lib/pdf/export-yeongnyangi-report-pdf');
const megabytes=(bytes:number)=>`${(bytes/1048576).toFixed(1)}MB`;
/** The bar spends most of its length on chapters, the only step whose length grows with the book. */
const percent=(phase:ReadingPdfPhase,progress?:ReadingPdfProgress)=>phase==='preparing'?4:phase==='saving'?96:progress?.total?Math.round(10+84*progress.done/progress.total):10;
type Built=ReadingPdfResult&{key:string;url:string};
function FusionBookContent({row}:{row:FortuneRecord}){
 const [includeQuestion,setIncludeQuestion]=useState(false),[includeFollowups,setIncludeFollowups]=useState(false),[phase,setPhase]=useState<ReadingPdfPhase|null>(null),[progress,setProgress]=useState<ReadingPdfProgress>(),[message,setMessage]=useState(''),[failed,setFailed]=useState(false),[built,setBuilt]=useState<Built|null>(null);
 const lock=useRef(false),mounted=useRef(false),previewUrl=useRef<string|null>(null);
 const appendices=useMemo(()=>readingReportAppendices(row),[row]);
 const plan=useMemo(()=>buildYeongnyangiReportPlan(row,{includeQuestion,includeFollowups}),[row,includeQuestion,includeFollowups]);
 // Include rendered content: a new follow-up can arrive on the same record.
 const optionKey=useMemo(()=>JSON.stringify([includeQuestion,includeFollowups,plan,row.product.name,row.createdAt,row.consultation?.asOf]),[includeQuestion,includeFollowups,plan,row.product.name,row.createdAt,row.consultation?.asOf]);
 const latestKey=useRef(optionKey);latestKey.current=optionKey;
 const current=built?.key===optionKey?built:null;
 useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;if(previewUrl.current)URL.revokeObjectURL(previewUrl.current);previewUrl.current=null;};},[]);
 useEffect(()=>{if(previewUrl.current)URL.revokeObjectURL(previewUrl.current);previewUrl.current=null;setBuilt(null);},[optionKey]);
 if((row.product.readingKind==='single'&&row.product.fishId!=='tuna')||row.locale&&row.locale!=='ko')return null;
 const ready=row.state==='COMPLETED'&&row.chapters.length===row.manifest.length&&row.chapters.length>0;
 const fileName=`영냥이-개인상담서-${row.createdAt.slice(0,10)}.pdf`;
 const labels={preparing:'한글 글꼴과 삽화를 준비하고 있어요.',typesetting:progress?.total?`챕터를 책으로 엮고 있어요. ${progress.done} / ${progress.total}`:'챕터와 목차를 책으로 엮고 있어요.',saving:'PDF 파일로 묶고 있어요.'};
 const savedMessage=(result:ReadingPdfResult)=>`${result.pages}쪽 · ${megabytes(result.bytes)} PDF를 저장했어요. 다운로드 목록에 없으면 'PDF 열어 보기'로 연 뒤 공유·저장해 주세요.`;
 async function download(){
  if(lock.current||!ready)return;
  lock.current=true;setFailed(false);setMessage('');setProgress(undefined);setPhase('preparing');
  const active=()=>mounted.current&&latestKey.current===optionKey;
  try{const {exportYeongnyangiReportPdf,saveReportBlob}=await loadExporter();
   if(!active())return;
   if(current){saveReportBlob(current.blob,fileName);setMessage(savedMessage(current));return;}
   const result=await exportYeongnyangiReportPdf({row,includeQuestion,includeFollowups,fileName,save:false,onProgress:(next,count)=>{if(active()){setPhase(next);if(count)setProgress(count);}}});
   if(!active())return;
   saveReportBlob(result.blob,fileName);
   if(previewUrl.current)URL.revokeObjectURL(previewUrl.current);
   const url=URL.createObjectURL(result.blob);previewUrl.current=url;
   setBuilt({...result,key:optionKey,url});setMessage(savedMessage(result));
  }catch(error){if(!active())return;setFailed(true);setMessage(error instanceof Error&&error.name==='PdfFontError'
   ?'한글 글꼴을 내려받지 못했어요. 연결을 확인한 뒤 다시 만들어 주세요. 상담 내용은 그대로 보관되어 있어요.'
   :'PDF를 만들지 못했어요. 잠시 뒤 다시 만들어 주세요. 상담 내용은 그대로 보관되어 있어요.');}
  finally{lock.current=false;if(mounted.current)setPhase(null);}
 }
 return <section className={styles.extras} aria-label="개인 상담서와 실천 노트">
  <details id="fusion-book-export" className={styles.export} onToggle={event=>{if(ready&&event.currentTarget.open)void loadExporter().then(m=>m.prefetchYeongnyangiReportPdf()).catch(()=>undefined);}}>
   <summary><Download size={21} aria-hidden="true"/>개인 상담서 PDF 저장하기</summary>
   <div className={styles.exportBody}><h3>다시 펼쳐 읽는 나만의 상담서</h3><p>본문을 선택·검색할 수 있는 PDF로 저장해요. 차례에서 원하는 챕터로 바로 이동할 수 있어요.</p>
    <p>{ready?`${row.chapters.length}개 상담 챕터와 계산 근거·실천 노트를 담아요.`:`${row.chapters.length} / ${row.manifest.length}개 챕터가 준비됐어요. 상담이 완성되면 전체 PDF를 저장할 수 있어요.`}</p>
    <details className={styles.contents}><summary>PDF에 담길 목차 확인하기</summary><ol>{plan.map(chapter=><li key={chapter.id}>{chapter.title}</li>)}</ol></details>
    {!!row.consultation?.question&&<label className={styles.option}><input type="checkbox" checked={includeQuestion} disabled={!!phase} onChange={event=>setIncludeQuestion(event.target.checked)}/>내가 입력한 질문 원문도 포함하기</label>}
    {!!row.conversation?.exchanges.some(exchange=>exchange.kind==='answer')&&<label className={styles.option}><input type="checkbox" checked={includeFollowups} disabled={!!phase} onChange={event=>setIncludeFollowups(event.target.checked)}/>완료된 추가 질문과 답변 포함하기</label>}
    <p className={styles.privacy}>생년월일·태어난 시각·질문 원문과 추가 질문은 기본으로 넣지 않아요. 상담 본문에는 개인적인 내용이 담길 수 있으니 공유 전 확인해 주세요.</p>
    <div className={styles.exportActions}>
     <button type="button" disabled={!ready||!!phase} aria-busy={!!phase} onClick={()=>void download()}><Download size={18} aria-hidden="true"/>{phase?'PDF 만드는 중':current?'PDF 다시 저장하기':failed?'PDF 다시 만들기':'전체 리포트 PDF 저장하기'}</button>
     {current&&!phase&&<a className={styles.openPdf} href={current.url} target="_blank" rel="noopener"><ExternalLink size={18} aria-hidden="true"/>PDF 열어 보기</a>}
    </div>
    {phase&&<div className={styles.progress} role="progressbar" aria-label="PDF 만드는 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent(phase,progress)}><span style={{width:`${percent(phase,progress)}%`}}/></div>}
    <p role="status" aria-live="polite" className={failed&&!phase?styles.exportError:undefined}>{phase?labels[phase]:current||failed?message:''}</p>
   </div>
  </details>
  {ready&&appendices.length>0&&<div className={styles.notes}><h2>다시 펼치는 상담 노트</h2><p>본문에서 짚은 핵심과 실행 방법을 모았어요.</p>{appendices.map(chapter=><details key={chapter.id}><summary>{chapter.title}</summary><div>{chapter.blocks.map((block,i)=>block.kind==='heading'?<h3 key={i}>{block.text}</h3>:<p key={i}>{block.text}</p>)}</div></details>)}</div>}
 </section>;
}
