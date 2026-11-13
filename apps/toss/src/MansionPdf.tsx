import {useEffect,useRef,useState} from 'react';
import {Button} from './Button';
import {saveReportPdf} from './media';
import {getTossSessionRevision} from './platform';
import type {ExportResultPdfOptions} from '../../../lib/pdf/export-result-pdf';

type Options=Pick<ExportResultPdfOptions,'fileName'|'backgroundColor'|'cover'>;
export default function MansionPdf({options,selector}:{options:Options;selector:string}){
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const mount=useRef(0);
  useEffect(()=>()=>{mount.current++;},[]);
  async function save(){
    if(busy)return;
    const epoch=mount.current,owner=getTossSessionRevision();
    const current=()=>mount.current===epoch&&owner===getTossSessionRevision();
    const targets=Array.from(document.querySelectorAll<HTMLElement>(selector));
    if(!targets.length)return;
    const closed=targets.filter((el):el is HTMLDetailsElement=>el instanceof HTMLDetailsElement&&!el.open);
    setBusy(true);setMessage('');
    try{
      closed.forEach(el=>{el.open=true;});
      const {exportResultPdf}=await import('../../../lib/pdf/export-result-pdf');
      if(!current())return;
      await exportResultPdf({...options,captureTargets:[selector],savePdfData:async(data,name)=>{
        if(!current())throw Error('SESSION_CHANGED');await saveReportPdf(data,name);
      }});
      if(current())setMessage('PDF 저장 요청을 마쳤어요.');
    }catch{if(current())setMessage('PDF를 저장하지 못했어요. 토스 앱의 파일 저장을 확인하고 다시 시도해 주세요.');}
    finally{closed.forEach(el=>{el.open=false;});if(current())setBusy(false);}
  }
  return <div><Button disabled={busy} onClick={()=>void save()}>{busy?'PDF 준비 중':'PDF 저장하기'}</Button>{message&&<p role="status">{message}</p>}</div>;
}
