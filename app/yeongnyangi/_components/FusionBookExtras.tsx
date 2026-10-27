'use client';
import {useMemo,useRef,useState} from 'react';
import {BookOpen,Download} from 'lucide-react';
import type {FortuneRecord} from '../_lib/api';
import {buildYeongnyangiReportPlan,readingReportAppendices} from '@/lib/pdf/yeongnyangi-report-plan';
import type {ReadingPdfPhase} from '@/lib/pdf/export-yeongnyangi-report-pdf';
import styles from './fusion-book.module.css';

export function FusionBookIntroduction({row}:{row:FortuneRecord}){
 if((row.product.readingKind==='single'&&row.product.fishId!=='tuna')||row.locale&&row.locale!=='ko')return null;
 return <header className={styles.introduction}><BookOpen size={28} aria-hidden="true"/><div><h2>질문의 답부터, 나를 이해하는 한 권까지</h2><p>먼저 답을 읽고, 궁금한 운세와 삶의 영역을 골라 펼쳐 보세요. 완성된 챕터부터 이어 읽을 수 있어요.</p><a href="#fusion-book-export">개인 상담서 PDF 확인하기</a></div></header>;
}
export default function FusionBookExtras({row}:{row:FortuneRecord}){
 if((row.product.readingKind==='single'&&row.product.fishId!=='tuna')||row.locale&&row.locale!=='ko')return null;
 return <FusionBookContent key={row.id} row={row}/>;
}
function FusionBookContent({row}:{row:FortuneRecord}){
 const [includeQuestion,setIncludeQuestion]=useState(false),[includeFollowups,setIncludeFollowups]=useState(false),[phase,setPhase]=useState<ReadingPdfPhase|null>(null),[message,setMessage]=useState(''),[failed,setFailed]=useState(false);
 const lock=useRef(false);
 const appendices=useMemo(()=>readingReportAppendices(row),[row]);
 const plan=useMemo(()=>buildYeongnyangiReportPlan(row,{includeQuestion,includeFollowups}),[row,includeQuestion,includeFollowups]);
 if((row.product.readingKind==='single'&&row.product.fishId!=='tuna')||row.locale&&row.locale!=='ko')return null;
 const ready=row.state==='COMPLETED'&&row.chapters.length===row.manifest.length&&row.chapters.length>0;
 const labels={preparing:'한글 글꼴을 준비하고 있어요.',typesetting:'챕터와 목차를 책으로 엮고 있어요.',saving:'PDF 저장을 준비하고 있어요.'};
 async function download(){
  if(lock.current||!ready)return;lock.current=true;setFailed(false);setMessage('');setPhase('preparing');
  try{const {exportYeongnyangiReportPdf}=await import('@/lib/pdf/export-yeongnyangi-report-pdf');
   await exportYeongnyangiReportPdf({row,includeQuestion,includeFollowups,fileName:`영냥이-개인상담서-${row.createdAt.slice(0,10)}.pdf`,onProgress:setPhase});
   setMessage('PDF 저장을 요청했어요. 브라우저 다운로드 목록을 확인해 주세요.');
  }catch{setFailed(true);setMessage('PDF를 만들지 못했어요. 연결을 확인한 뒤 다시 저장해 주세요. 상담 내용은 그대로 보관되어 있어요.');}
  finally{lock.current=false;setPhase(null);}
 }
 return <section className={styles.extras} aria-label="개인 상담서와 실천 노트">
  <details id="fusion-book-export" className={styles.export}>
   <summary><Download size={21} aria-hidden="true"/>개인 상담서 PDF 저장하기</summary>
   <div className={styles.exportBody}><h3>다시 펼쳐 읽는 나만의 상담서</h3><p>본문을 선택·검색할 수 있는 PDF로 저장해요. 차례에서 원하는 챕터로 바로 이동할 수 있어요.</p>
    <p>{ready?`${row.chapters.length}개 상담 챕터와 계산 근거·실천 노트를 담아요.`:`${row.chapters.length} / ${row.manifest.length}개 챕터가 준비됐어요. 상담이 완성되면 전체 PDF를 저장할 수 있어요.`}</p>
    <details className={styles.contents}><summary>PDF에 담길 목차 확인하기</summary><ol>{plan.map(chapter=><li key={chapter.id}>{chapter.title}</li>)}</ol></details>
    {!!row.consultation?.question&&<label className={styles.option}><input type="checkbox" checked={includeQuestion} disabled={!!phase} onChange={event=>setIncludeQuestion(event.target.checked)}/>내가 입력한 질문 원문도 포함하기</label>}
    {!!row.conversation?.exchanges.some(exchange=>exchange.kind==='answer')&&<label className={styles.option}><input type="checkbox" checked={includeFollowups} disabled={!!phase} onChange={event=>setIncludeFollowups(event.target.checked)}/>완료된 추가 질문과 답변 포함하기</label>}
    <p className={styles.privacy}>생년월일·태어난 시각·질문 원문과 추가 질문은 기본으로 넣지 않아요. 상담 본문에는 개인적인 내용이 담길 수 있으니 공유 전 확인해 주세요.</p>
    <button type="button" disabled={!ready||!!phase} onClick={()=>void download()}><Download size={18} aria-hidden="true"/>{phase?'PDF 준비 중':failed?'PDF 다시 저장하기':'전체 리포트 PDF 저장하기'}</button>
    <p role="status" aria-live="polite">{phase?labels[phase]:message}</p>
   </div>
  </details>
  {ready&&appendices.length>0&&<div className={styles.notes}><h2>다시 펼치는 상담 노트</h2><p>본문에서 짚은 핵심과 실행 방법을 모았어요.</p>{appendices.map(chapter=><details key={chapter.id}><summary>{chapter.title}</summary><div>{chapter.blocks.map((block,i)=>block.kind==='heading'?<h3 key={i}>{block.text}</h3>:<p key={i}>{block.text}</p>)}</div></details>)}</div>}
 </section>;
}
